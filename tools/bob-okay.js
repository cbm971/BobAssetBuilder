#!/usr/bin/env node
// BOB OKAY ON HIS OWN PC, WITH ONE SAVE FOLDER — the way Skyrim or Minecraft keep saves.
//
// WHY THIS EXISTS. On 2026-09-26 Blake spent hours making every interior top-down, fixing the DK
// Arms and re-sorting his characters, went back to the game, and found all of it "reverted". Two
// copies of the game had been open that day; each kept a private save in its own browser storage
// and each started from the committed asset-data/library.json, so each showed half his day. It
// was the fifth time (2026-08-05, 09-10, 09-18, 09-20, 09-26) and every layer added in between —
// IndexedDB, the host store, the project file, the 📁 save folder, the Pages copy — still let two
// copies of the game hold two different saves. He asked, rightly, for a save system like every
// desktop game has: one place, always used, nothing to click.
//
// WHAT IT DOES.
//   * Serves the game at http://localhost:47017 from a production build of the play branch — one
//     fixed place, so the browser's own cache of his saves never gets orphaned either.
//   * Owns ONE save folder: Documents\Bob Okay\Saves (OneDrive-backed on his PC). One file per
//     record (<kind>\<id>.json) plus removed.json, answering the same /__library protocol the dev
//     server's setupProxy.js does, with the same write rules (applyWrite, reused, not copied) — so
//     App.js needs no second storage path.
//   * Keeps EVERY version of every record it has ever seen in Saves\History (gzipped). Nothing is
//     ever deleted from there. Whatever a merge rule decides, the other version is recoverable.
//   * Sweeps every other copy of the game in Chrome/Edge (StackBlitz previews, the Pages copy) on
//     start and every minute, straight out of the browser profile on disk
//     (tools/read-chrome-leveldb.js), and folds anything saved there into the folder
//     (src/saveKeeperCore.js decides how; two copies that both edited a level are combined cell by
//     cell). So a save made in ANY copy ends up in the folder, whichever one he opened.
//   * Updates itself from GitHub on launch and every 5 minutes (fetch, rebuild only when the
//     commit changed, ~50 s), always keeping the last good build if anything fails.
//   * PUBLISHES THE FOLDER ONLINE (2026-10-03): library.json + head.json on the `saves` branch of
//     the game's repo, whenever the folder changes and at most once a minute. Every copy of the game
//     reads that when it opens (App.js cloudLibrary), so a StackBlitz address that comes up empty
//     opens on his newest saves instead of an old committed snapshot. Before this, only the desktop
//     copy could see the folder, and he plays on StackBlitz.
//   * STARTS AT SIGN-IN AND IS WATCHED (2026-10-03): `keep` runs from the Windows Startup folder and
//     restarts the keeper whenever it is not answering. It used to run only after the desktop icon
//     was clicked, so from 2026-09-27 to 2026-10-03 nothing gathered his saves at all.
//
//   node tools/bob-okay.js launch      what the desktop icon runs: update, start the keeper hidden, open the game
//   node tools/bob-okay.js serve       the keeper itself (foreground)
//   node tools/bob-okay.js keep        the watchdog the sign-in start runs (detaches, restarts the keeper)
//   node tools/bob-okay.js install     put the sign-in start in place and start the watchdog now
//   node tools/bob-okay.js export F    write the save folder as one library.json-shaped file (for agents)
//   node tools/bob-okay.js status      where everything is
//
// Test overrides: BOB_HOME (state/builds dir), BOB_SAVES (save folder), BOB_PORT, BOB_NO_UPDATE=1,
// BOB_NO_SWEEP=1, BOB_NO_CLOUD=1, BOB_CLOUD_REMOTE (a local bare repo instead of GitHub),
// BOB_CLOUD_BRANCH. Never point BOB_SAVES at his real folder, or a test keeper at the real
// `saves` branch. The sign-in start is only ever installed from the keeper's own clone (MANAGED).
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const http = require("http");
const zlib = require("zlib");
const os = require("os");
const crypto = require("crypto");
const { spawn, spawnSync, execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const core = require(path.join(ROOT, "src", "saveKeeperCore.js"));
const { applyWrite } = require(path.join(ROOT, "src", "setupProxy.js")).__test;
const { KINDS } = core;

const PORT = Number(process.env.BOB_PORT) || 47017;
const BRANCH = "agent/scaled-hitboxes-projectile-range";
const LOCALAPPDATA = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
const HOME = process.env.BOB_HOME || path.join(LOCALAPPDATA, "BobOkay");
const BUILDS = path.join(HOME, "builds");
const LOG_FILE = path.join(HOME, "keeper.log");
const STATE_FILE = path.join(HOME, "keeper-state.json");
const HISTORY = "History";
// Only the keeper's OWN clone is ever reset to the branch. Run from anywhere else (an agent's
// working copy), updating would throw away that working copy's changes, so it is skipped.
const MANAGED = path.resolve(ROOT).toLowerCase() === path.resolve(HOME, "game").toLowerCase();
// The keeper's own code, fingerprinted at start: when an update changes it, the running keeper
// restarts itself on the new code instead of running the old rules until the next reboot.
const KEEPER_FILES = ["tools/bob-okay.js", "tools/read-chrome-leveldb.js", "src/saveKeeperCore.js", "src/setupProxy.js"];
const keeperHash = () => { const h = crypto.createHash("md5"); for (const f of KEEPER_FILES) { try { h.update(fs.readFileSync(path.join(ROOT, f))); } catch { /* missing */ } } return h.digest("hex"); };
const STARTED_HASH = keeperHash();
const REMOVED_FILE = "removed.json";

fs.mkdirSync(HOME, { recursive: true });

// ---------- log ----------
const log = (...a) => {
  const line = new Date().toISOString() + " " + a.join(" ");
  if (process.stdout.isTTY) console.log(line);
  try {
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 5 * 1024 * 1024) fs.renameSync(LOG_FILE, LOG_FILE + ".old");
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch { /* logging must never stop a save */ }
};
const say = (msg) => { console.log(msg); log(msg); };

// ---------- small file helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
// Temp file + rename, retried: OneDrive briefly locks files it is uploading, and a save that fails
// on EBUSY once must not be a save that failed.
const writeAtomic = async (file, text) => {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = file + "." + process.pid + ".tmp";
  let last;
  for (let i = 0; i < 12; i++) {
    try { await fsp.writeFile(tmp, text); await fsp.rename(tmp, file); return; } catch (e) { last = e; await sleep(150 * (i + 1)); }
  }
  try { await fsp.unlink(tmp); } catch { /* gone */ }
  throw last;
};
const safeName = (id) => String(id).replace(/[^A-Za-z0-9_.-]/g, "_");

// ---------- state (machine-local: which folder, what was swept) ----------
const state = Object.assign({ saveDir: null, sweep: {}, repoRemoved: null, pkgHash: null, epoch: null }, readJson(STATE_FILE) || {});
if (!state.epoch) state.epoch = Date.now();   // when the keeper first ran: see decideSweep's epoch
const saveState = () => writeAtomic(STATE_FILE, JSON.stringify(state, null, 1)).catch((e) => log("state write failed: " + e.message));

// THE SAVE FOLDER IS PINNED the first time it is chosen. If "Documents" ever resolved somewhere
// else (OneDrive unlinked, a profile change), silently starting a NEW empty folder would be this
// whole bug again — a fresh store seeded from an old snapshot. So the path is remembered, and a
// remembered folder that has gone missing is reported, not replaced.
const documentsDir = () => {
  try {
    const out = execFileSync("powershell.exe", ["-NoProfile", "-Command", "[Environment]::GetFolderPath('MyDocuments')"], { encoding: "utf8", windowsHide: true, timeout: 15000 }).trim();
    if (out && fs.existsSync(out)) return out;
  } catch { /* fall through */ }
  for (const p of [process.env.OneDrive && path.join(process.env.OneDrive, "Documents"), path.join(os.homedir(), "Documents")]) if (p && fs.existsSync(p)) return p;
  return path.join(os.homedir(), "Documents");
};
const resolveSaveDir = () => {
  if (process.env.BOB_SAVES) return { dir: process.env.BOB_SAVES, missing: false };
  if (state.saveDir) return { dir: state.saveDir, missing: !fs.existsSync(state.saveDir) };
  const dir = path.join(documentsDir(), "Bob Okay", "Saves");
  state.saveDir = dir;
  return { dir, missing: false };
};

// ---------- THE SAVE FOLDER ----------
class SaveFolder {
  constructor(dir) {
    this.dir = dir;
    this.lib = null;          // the library in project-file shape, what GET /__library serves
    this.hist = new Map();    // "kind/id" -> [{ at, source, file }] (lazy)
    this.q = Promise.resolve();
    this.ok = false;
  }
  // Every change goes through here, one at a time: a sweep and a save must never interleave.
  run(fn) { const p = this.q.then(fn); this.q = p.catch(() => {}); return p; }
  cur(kind, id) { return (this.lib[kind] || []).find((r) => r && r.id === id) || null; }
  file(kind, id) { return path.join(this.dir, kind, safeName(id) + ".json"); }
  histDir(kind, id) { return path.join(this.dir, HISTORY, kind, safeName(id)); }
  history(kind, id) {
    const k = kind + "/" + id;
    if (!this.hist.has(k)) {
      const d = this.histDir(kind, id);
      let list = [];
      try {
        list = fs.readdirSync(d).map((f) => { const m = /^(\d+|undated-[0-9a-f]+)~(.+)\.json\.gz$/.exec(f); return m ? { at: /^\d+$/.test(m[1]) ? Number(m[1]) : null, source: m[2], file: path.join(d, f) } : null; }).filter(Boolean);
      } catch { /* none yet */ }
      this.hist.set(k, list);
    }
    return this.hist.get(k);
  }
  seen(kind, id, at) { return typeof at === "number" && this.history(kind, id).some((h) => h.at === at); }
  sourceOf(kind, rec) { if (!rec) return null; const h = this.history(kind, rec.id).find((x) => x.at === rec.savedAt); return h ? h.source : null; }
  // The newest History version before `at` written by one of `sources` (see decideSweep's baseFor).
  baseFrom(kind, id, at, sources) {
    const h = this.history(kind, id).filter((x) => typeof x.at === "number" && x.at < at && sources.includes(x.source)).sort((a, b) => b.at - a.at)[0];
    if (!h) return null;
    try { return JSON.parse(zlib.gunzipSync(fs.readFileSync(h.file)).toString("utf8")); } catch { return null; }
  }
  // Put one version in History. Keyed by savedAt: a version already there is not written twice.
  async remember(kind, rec, source) {
    if (!rec || !rec.id) return;
    const at = typeof rec.savedAt === "number" ? rec.savedAt : null;
    if (at !== null && this.seen(kind, rec.id, at)) return;
    // An undated version (written by old code) is named by its content, so the same one found on
    // every sweep of a copy is filed once, not once a minute.
    const tag = at !== null ? String(at) : "undated-" + crypto.createHash("md5").update(JSON.stringify(rec)).digest("hex").slice(0, 10);
    if (at === null && this.history(kind, rec.id).some((h) => path.basename(h.file).startsWith(tag + "~"))) return;
    const name = tag + "~" + safeName(source) + ".json.gz";
    const file = path.join(this.histDir(kind, rec.id), name);
    await writeAtomic(file, zlib.gzipSync(JSON.stringify(rec)));
    this.history(kind, rec.id).push({ at, source, file });
  }
  async load() {
    const out = { savedAt: null, removed: {} };
    let bad = 0;
    for (const kind of KINDS) {
      out[kind] = [];
      const d = path.join(this.dir, kind);
      let names = [];
      try { names = fs.readdirSync(d).filter((f) => /\.json$/i.test(f)); } catch { /* none yet */ }
      for (const f of names) {
        const rec = readJson(path.join(d, f));
        if (rec && rec.id) { out[kind].push(rec); continue; }
        // One unreadable file never hides the rest. Its newest History copy stands in for it.
        bad++;
        const id = f.replace(/\.json$/i, "");
        const h = this.history(kind, id).filter((x) => typeof x.at === "number").sort((a, b) => b.at - a.at)[0];
        let back = null;
        if (h) { try { back = JSON.parse(zlib.gunzipSync(fs.readFileSync(h.file)).toString("utf8")); } catch { /* none */ } }
        log("save folder: " + kind + "/" + f + " could not be read" + (back ? " — using its newest History copy" : ""));
        if (back) out[kind].push(back);
      }
    }
    const rm = readJson(path.join(this.dir, REMOVED_FILE)) || {};
    for (const kind of KINDS) out.removed[kind] = Array.isArray(rm[kind]) ? rm[kind].filter(Boolean) : [];
    this.lib = out;
    this.ok = true;
    return { bad };
  }
  count() { return KINDS.reduce((n, k) => n + ((this.lib && this.lib[k]) || []).length, 0); }
  // Make `next` (project-file shape) the folder's content. Only what changed is written; every
  // new current version goes to History first; a record leaving the folder is only ever removed
  // AFTER History holds it.
  async commit(next, source) {
    let wrote = 0, dropped = 0;
    for (const kind of KINDS) {
      const before = new Map((this.lib[kind] || []).map((r) => [r.id, r]));
      const after = new Map((next[kind] || []).filter((r) => r && r.id).map((r) => [r.id, r]));
      for (const [id, rec] of after) {
        const old = before.get(id);
        if (old && JSON.stringify(old) === JSON.stringify(rec)) continue;
        await this.remember(kind, rec, source);
        await writeAtomic(this.file(kind, id), JSON.stringify(rec));
        wrote++;
      }
      for (const [id, rec] of before) {
        if (after.has(id)) continue;
        await this.remember(kind, rec, "before-delete");
        try { await fsp.unlink(this.file(kind, id)); } catch { /* already gone */ }
        dropped++;
      }
    }
    const rmBefore = JSON.stringify(this.lib.removed || {}), rmAfter = JSON.stringify(next.removed || {});
    if (rmBefore !== rmAfter) await writeAtomic(path.join(this.dir, REMOVED_FILE), JSON.stringify(next.removed || {}, null, 1));
    this.lib = { ...next, removed: next.removed || {} };
    // Anything that changed the folder is something the online copy has to hear about (cloudKick).
    if ((wrote || dropped || rmBefore !== rmAfter) && this.onChange) { try { this.onChange(); } catch { /* publishing must never fail a save */ } }
    return { wrote, dropped };
  }
  // A POST from the game: exactly the dev server's rules (setupProxy applyWrite).
  write(body) {
    return this.run(async () => {
      const incoming = (body && Array.isArray(body.assets)) ? body.assets.filter((a) => a && a.id) : null;
      if (!incoming) return { status: 400, out: { ok: false, error: "no assets array" } };
      // Versions this browser holds that lose the merge still go to History: a copy the folder
      // has never seen is never thrown away, even when it is not the one that wins.
      for (const kind of KINDS) for (const r of ((kind === "assets" ? incoming : (body[kind] || [])) || [])) {
        if (!r || !r.id) continue;
        const cur = this.cur(kind, r.id);
        if (cur && !core.sameContent(cur, r) && !core.newerRecord(r, cur) && r.savedAt !== cur.savedAt && !this.seen(kind, r.id, r.savedAt)) await this.remember(kind, r, "desktop-older");
      }
      const { next, keptAssets } = applyWrite(this.lib, body, incoming);
      const res = await this.commit(next, "desktop");
      if (res.wrote || res.dropped) log("save: " + res.wrote + " written, " + res.dropped + " removed");
      const out = { ok: true, keptAssets };
      for (const k of KINDS) out[k] = next[k].length;
      return { status: 200, out };
    });
  }
  // Fold another library into the folder under the sweep rules (saveKeeperCore.decideSweep).
  // `tombs`: ids this source deleted that the folder should delete too.
  fold(lib, source0, tombs) {
    const source = safeName(source0);   // the name History files carry, so curSource compares like with like
    return this.run(async () => {
      const next = { ...this.lib, removed: { ...this.lib.removed } };
      for (const k of KINDS) next[k] = [...(this.lib[k] || [])];
      const tally = { take: 0, combine: 0, keep: 0, deleted: 0 };
      const toHistory = [];
      for (const kind of KINDS) {
        const dead = new Set(next.removed[kind] || []);
        for (const inc of (lib[kind] || [])) {
          if (!inc || !inc.id) continue;
          const i = next[kind].findIndex((r) => r.id === inc.id);
          const cur = i >= 0 ? next[kind][i] : null;
          const d = core.decideSweep({
            inc, cur, source, curSource: this.sourceOf(kind, cur), deleted: dead.has(inc.id),
            seen: (at) => this.seen(kind, inc.id, at), baseFor: (at) => this.baseFrom(kind, inc.id, at, [safeName(source), "repo"]), epoch: state.epoch,
          });
          if (d.action === "none") continue;
          tally[d.action]++;
          toHistory.push([kind, inc, source]);
          if (d.action === "keep") continue;
          let rec = inc;
          if (d.action === "combine") {
            // Strictly newer than both copies it came from, so every copy's loader adopts it.
            rec = { ...d.record, id: inc.id, savedAt: Math.max(Date.now(), (inc.savedAt || 0) + 1, ((cur && cur.savedAt) || 0) + 1) };
            log("combined " + kind + " \"" + (rec.name || rec.id) + "\" from " + source + (d.conflicts.length ? " (same spot changed in both: " + d.conflicts.join(", ") + " — newer kept)" : ""));
          }
          if (i >= 0) next[kind][i] = rec; else next[kind].push(rec);
        }
        const gone = (tombs && tombs[kind]) || [];
        if (gone.length) {
          const g = new Set(gone);
          const kept = next[kind].filter((r) => !g.has(r.id));
          tally.deleted += next[kind].length - kept.length;
          next[kind] = kept;
          next.removed[kind] = [...new Set([...(next.removed[kind] || []), ...gone])];
        }
      }
      for (const [kind, inc, src] of toHistory) await this.remember(kind, inc, src);
      // Combined records are written under "combined"; everything else under its source.
      const res = await this.commitMixed(next, source);
      return { ...tally, ...res };
    });
  }
  async commitMixed(next, source) {
    // A combined record has a savedAt no copy ever had; name it for what it is in History.
    const combinedIds = new Set();
    for (const kind of KINDS) for (const r of next[kind]) { const c = this.cur(kind, r.id); if (c !== r && !this.seen(kind, r.id, r.savedAt)) combinedIds.add(kind + "/" + r.id); }
    for (const kind of KINDS) for (const r of next[kind]) if (combinedIds.has(kind + "/" + r.id)) await this.remember(kind, r, "combined");
    return this.commit(next, source);
  }
  // The committed asset-data/library.json: how agents deliver new and revised records. Only a
  // record the folder lacks or a strictly newer save comes in. An older committed copy is never an
  // edit (git has its own history), so it is ignored rather than merged.
  seedFromRepo(file) {
    return this.seedFrom(readJson(file), "repo", "repoRemoved");
  }
  // The same rule for any library-shaped file: the committed one ("repo"), or the online copy on
  // the `saves` branch when someone other than this keeper pushed it ("cloud": an agent's recovery,
  // another PC). `stateKey` remembers that file's deleted list, so only deletes made SINCE the last
  // look count.
  seedFrom(repo, source, stateKey) {
    if (!repo || !Array.isArray(repo.assets)) return Promise.resolve({ take: 0, deleted: 0 });
    return this.run(async () => {
      const next = { ...this.lib, removed: { ...this.lib.removed } };
      for (const k of KINDS) next[k] = [...(this.lib[k] || [])];
      let take = 0, deleted = 0;
      const prev = state[stateKey];                // deletes made in that file since the last look
      for (const kind of KINDS) {
        const repoGone = (((repo.removed || {})[kind]) || []).filter(Boolean);
        const fresh = prev ? repoGone.filter((id) => !((prev[kind] || []).includes(id))) : repoGone;
        const dead = new Set([...(next.removed[kind] || []), ...fresh]);
        next.removed[kind] = [...dead];
        const before = next[kind].length;
        next[kind] = next[kind].filter((r) => !fresh.includes(r.id));
        deleted += before - next[kind].length;
        for (const rec of (repo[kind] || [])) {
          if (!rec || !rec.id || dead.has(rec.id)) continue;
          const i = next[kind].findIndex((r) => r.id === rec.id);
          if (i < 0) { next[kind].push(rec); take++; }
          else if (core.newerRecord(rec, next[kind][i])) { next[kind][i] = rec; take++; }
        }
      }
      state[stateKey] = repo.removed || {};
      const res = await this.commit(next, source);
      await saveState();
      return { take, deleted, ...res };
    });
  }
}

// ---------- THE SWEEP: every other copy of the game in the browser profiles on this PC ----------
const PROFILE_ROOTS = [
  path.join(LOCALAPPDATA, "Google", "Chrome", "User Data"),
  path.join(LOCALAPPDATA, "Microsoft", "Edge", "User Data"),
];
// StackBlitz previews of this repo and the published Pages copy. NOT localhost: that is this
// keeper's own copy (it saves here directly) and agents' test servers, whose planted test records
// must never reach his saves.
const GAME_ORIGIN = /^https_(bobassetbuilder-[a-z0-9-]+\.local-credentialless\.webcontainer\.io|bobassetbuilder-[a-z0-9-]+\.webcontainer\.io|cbm971\.github\.io)_0\.indexeddb\.leveldb$/i;
const findCopies = () => {
  const out = [];
  for (const root of PROFILE_ROOTS) {
    let profiles = [];
    try { profiles = fs.readdirSync(root).filter((p) => p === "Default" || /^Profile \d+$/.test(p)); } catch { continue; }
    for (const p of profiles) {
      const idb = path.join(root, p, "IndexedDB");
      let names = [];
      try { names = fs.readdirSync(idb); } catch { continue; }
      for (const n of names) {
        const m = GAME_ORIGIN.exec(n);
        if (!m) continue;
        const dir = path.join(idb, n);
        // Short names keep History paths well under Windows' 260-character limit.
        const short = m[1].replace(/\.local-credentialless\.webcontainer\.io$|\.webcontainer\.io$/i, "");
        out.push({ name: short + (p === "Default" ? "" : " (" + p + ")"), dir, blob: dir.replace(/\.leveldb$/, ".blob") });
      }
    }
  }
  return out;
};
const signature = (dir) => {
  let sig = "";
  try { for (const f of fs.readdirSync(dir).sort()) { if (f === "LOCK") continue; const st = fs.statSync(path.join(dir, f)); sig += f + ":" + st.size + ":" + st.mtimeMs + ";"; } } catch { return null; }
  return crypto.createHash("md5").update(sig).digest("hex");
};
const copyDir = (from, to) => {
  if (!fs.existsSync(from)) return false;
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name === "LOCK") continue;
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
  return true;
};
let sweeping = false;
const sweep = async (folder) => {
  if (sweeping || process.env.BOB_NO_SWEEP) return;
  sweeping = true;
  try {
    const { readIdbRecords } = require(path.join(ROOT, "tools", "read-chrome-leveldb.js"));
    for (const c of findCopies()) {
      const sig = signature(c.dir);
      const prev = state.sweep[c.name] || {};
      if (!sig || prev.sig === sig) continue;
      const tmp = path.join(os.tmpdir(), "bob-okay-sweep-" + process.pid);
      let entries = null;
      try {
        fs.rmSync(tmp, { recursive: true, force: true });
        copyDir(c.dir, path.join(tmp, "db"));
        const hasBlob = copyDir(c.blob, path.join(tmp, "blob"));
        entries = readIdbRecords(path.join(tmp, "db"), hasBlob ? path.join(tmp, "blob") : null);
      } catch (e) { log("sweep: could not read " + c.name + ": " + e.message); }
      finally { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* temp */ } }
      if (!entries) continue;
      const lib = core.libraryFromStore(entries);
      // Deletes: only ones made in that copy SINCE it was first seen. Its older deletion list may
      // name things he has re-made since; the first look records it as the starting point.
      const tombs = {};
      if (prev.removed) for (const k of KINDS) tombs[k] = (lib.removed[k] || []).filter((id) => !(prev.removed[k] || []).includes(id));
      const res = await folder.fold(lib, c.name, tombs);
      state.sweep[c.name] = { sig, removed: lib.removed, at: Date.now() };
      await saveState();
      if (res.take || res.combine || res.keep || res.deleted) log("sweep " + c.name + ": " + res.take + " newer, " + res.combine + " combined, " + res.keep + " kept in History, " + res.deleted + " deleted");
    }
  } catch (e) { log("sweep failed: " + (e && e.stack || e)); }
  finally { sweeping = false; }
};

// ---------- THE ONLINE COPY: the folder published to the `saves` branch ----------
// WHY. The folder held everything and only the desktop copy could read it. A StackBlitz address that
// comes up empty restores the COMMITTED library.json, which is only as new as an agent's last push,
// so on 2026-10-03 an afternoon of his edits read as reverted while every byte of them sat on this PC.
// Every copy of the game can read a public GitHub file (App.js cloudLibrary), and this PC has his git
// login, so the folder goes there: library.json (core.cloudSnapshot) plus head.json, the tiny file the
// copies poll. A push sends only a delta, because the snapshot is sorted and stable.
//
// RULES. Only this keeper writes the branch in normal running. If anyone else pushed (an agent's
// recovery, another PC), their file is folded INTO the folder first, newest save winning
// (seedFrom "cloud"), and the push then goes on top of theirs, never over it. Nothing here force-pushes.
// A push that fails (offline, GitHub down, an expired login) is logged once and retried on the next
// change or the 5-minute tick. The folder, with every version in History, is the save either way.
const CLOUD_REMOTE = process.env.BOB_CLOUD_REMOTE || "https://github.com/cbm971/BobAssetBuilder.git";
const CLOUD_BRANCH = process.env.BOB_CLOUD_BRANCH || "saves";
const CLOUD_DIR = path.join(HOME, "cloud");
const CLOUD_REF = "refs/remotes/origin/" + CLOUD_BRANCH;
// Async on purpose: a push can take seconds, and the keeper must keep answering saves meanwhile.
// No prompts: a hidden process that waits on a password box is a keeper that has stopped.
const gitIn = (cwd, args, timeoutMs) => new Promise((resolve) => {
  let p;
  try { p = spawn("git", args, { cwd, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Never" } }); }
  catch (e) { resolve({ status: -1, stdout: Buffer.alloc(0), stderr: String(e && e.message) }); return; }
  const out = [], err = [];
  p.stdout.on("data", (c) => out.push(c));
  p.stderr.on("data", (c) => err.push(c));
  const t = setTimeout(() => { try { p.kill(); } catch { /* gone */ } }, timeoutMs || 5 * 60 * 1000);
  p.on("error", (e) => { clearTimeout(t); resolve({ status: -1, stdout: Buffer.alloc(0), stderr: String(e && e.message) }); });
  p.on("close", (code) => { clearTimeout(t); resolve({ status: code, stdout: Buffer.concat(out), stderr: Buffer.concat(err).toString("utf8") }); });
});
// The line of git's complaint that says what went wrong ("fatal: ..."), not whichever came last.
const gitWhy = (err) => { const t = String(err || "").trim(); return ((t.match(/(?:fatal|error): [^\n]*/) || [])[0] || t.split("\n")[0] || "no detail").trim(); };
let cloudBusy = false, cloudAgain = false, cloudTimer = null, cloudLastPush = 0, cloudLastNote = "";
const cloudNote = (msg) => { if (msg !== cloudLastNote) log(msg); cloudLastNote = msg; };   // the same failure every minute is logged once
// Something changed: publish soon, but no more than once a minute (a sweep or a burst of saves
// becomes one push).
const cloudKick = (folder, now) => {
  if (process.env.BOB_NO_CLOUD || cloudTimer) return;
  const wait = now ? 0 : Math.max(5000, 60 * 1000 - (Date.now() - cloudLastPush));
  cloudTimer = setTimeout(() => { cloudTimer = null; cloudSync(folder); }, wait);
  if (cloudTimer.unref) cloudTimer.unref();
};
const cloudSync = async (folder) => {
  if (process.env.BOB_NO_CLOUD || !folder || !folder.ok) return;
  if (cloudBusy) { cloudAgain = true; return; }
  cloudBusy = true;
  try {
    for (let i = 0; i < 3; i++) if ((await cloudSyncOnce(folder)) !== "retry") break;
  } catch (e) { cloudNote("online copy: " + (e && e.message)); }
  finally { cloudBusy = false; if (cloudAgain) { cloudAgain = false; cloudKick(folder); } }
};
const cloudSyncOnce = async (folder) => {
  const g = (args) => gitIn(CLOUD_DIR, args);
  if (!fs.existsSync(path.join(CLOUD_DIR, ".git"))) {
    fs.mkdirSync(CLOUD_DIR, { recursive: true });
    for (const a of [["init", "-q"], ["remote", "add", "origin", CLOUD_REMOTE], ["config", "user.name", "Bob Okay save keeper"], ["config", "user.email", "cbm971@gmail.com"], ["config", "core.autocrlf", "false"]]) await g(a);
  }
  const f = await g(["fetch", "-q", "--depth", "1", "origin", "+refs/heads/" + CLOUD_BRANCH + ":" + CLOUD_REF]);
  let remote = null;
  if (f.status === 0) remote = (await g(["rev-parse", CLOUD_REF])).stdout.toString().trim() || null;
  else if (!/couldn't find remote ref/i.test(f.stderr)) { cloudNote("online copy: could not reach GitHub (" + gitWhy(f.stderr) + ") — trying again later; saves are safe in the folder"); return "fail"; }
  const st = state.cloud || (state.cloud = {});
  if (remote && remote !== st.sha) {
    const show = await g(["show", CLOUD_REF + ":library.json"]);
    let lib = null;
    try { lib = JSON.parse(show.stdout.toString("utf8")); } catch { lib = null; }
    if (lib && Array.isArray(lib.assets)) {
      const s = await folder.seedFrom(lib, "cloud", "cloudRemoved");
      if (s.take || s.deleted) log("from the online copy: " + s.take + " new or newer, " + s.deleted + " deleted");
    }
  }
  const text = await folder.run(async () => core.cloudSnapshot(folder.lib));   // read between writes, never mid-commit
  const hash = crypto.createHash("md5").update(text).digest("hex");
  if (remote && remote === st.sha && hash === st.hash) return "ok";            // nothing new either way
  if (remote) {
    let theirs = null;
    try { theirs = JSON.parse((await g(["show", CLOUD_REF + ":head.json"])).stdout.toString("utf8")); } catch { theirs = null; }
    if (theirs && theirs.hash === hash) { st.sha = remote; st.hash = hash; await saveState(); return "ok"; }
    const co = await g(["checkout", "-q", "-f", "-B", CLOUD_BRANCH, CLOUD_REF]);
    if (co.status !== 0) { cloudNote("online copy: checkout failed: " + co.stderr.trim()); fs.rmSync(CLOUD_DIR, { recursive: true, force: true }); return "fail"; }
  } else {
    await g(["checkout", "-q", "-f", "--orphan", CLOUD_BRANCH]);
    await g(["rm", "-r", "-q", "-f", "--cached", "--ignore-unmatch", "."]);
  }
  const records = KINDS.reduce((n, k) => n + ((folder.lib && folder.lib[k]) || []).length, 0);
  const at = new Date().toISOString();
  fs.writeFileSync(path.join(CLOUD_DIR, "library.json"), text);
  fs.writeFileSync(path.join(CLOUD_DIR, "head.json"), JSON.stringify({ hash, savedAt: at, records }, null, 1));
  await g(["add", "library.json", "head.json"]);
  const c = await g(["commit", "-q", "-m", "Saves " + at + " (" + records + " things)"]);
  if (c.status !== 0) { cloudNote("online copy: commit failed: " + (c.stderr || c.stdout.toString()).trim()); return "fail"; }
  const p = await g(["push", "-q", "origin", CLOUD_BRANCH + ":refs/heads/" + CLOUD_BRANCH]);
  if (p.status !== 0) {
    if (/rejected|non-fast-forward|fetch first/i.test(p.stderr)) return "retry";   // someone pushed meanwhile: fold theirs in, go again
    cloudNote("online copy: push failed (" + gitWhy(p.stderr) + ") — trying again later; saves are safe in the folder");
    return "fail";
  }
  st.sha = (await g(["rev-parse", "HEAD"])).stdout.toString().trim();
  st.hash = hash; st.at = Date.now(); st.pushes = (st.pushes || 0) + 1;
  cloudLastPush = Date.now(); cloudLastNote = "";
  await saveState();
  log("online copy updated (" + records + " things)");
  // The local clone gains a snapshot per push. Starting it over now and then keeps it to one commit;
  // the next sync fetches just that.
  if (st.pushes % 25 === 0) { try { fs.rmSync(CLOUD_DIR, { recursive: true, force: true }); } catch { /* next time */ } }
  return "ok";
};

// ---------- UPDATE: the play branch, built for this PC ----------
const run = (cmd, args, opts) => spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", windowsHide: true, ...opts });
const git = (...args) => run("git", args);
const npmCmd = () => { const p = path.join(path.dirname(process.execPath), process.platform === "win32" ? "npm.cmd" : "npm"); return fs.existsSync(p) ? p : "npm"; };
const npm = (args, env) => run('"' + npmCmd() + '" ' + args, [], { shell: true, env: { ...process.env, ...env } });
const headSha = () => { const r = git("rev-parse", "HEAD"); return r.status === 0 ? r.stdout.trim() : null; };
const currentBuild = () => {
  const sha = headSha();
  if (sha && fs.existsSync(path.join(BUILDS, sha, "index.html"))) return path.join(BUILDS, sha);
  // The newest good build we have, whatever commit it came from: an old game beats no game.
  try {
    const all = fs.readdirSync(BUILDS).filter((d) => fs.existsSync(path.join(BUILDS, d, "index.html"))).map((d) => ({ d, t: fs.statSync(path.join(BUILDS, d)).mtimeMs })).sort((a, b) => b.t - a.t);
    return all.length ? path.join(BUILDS, all[0].d) : null;
  } catch { return null; }
};
let updating = null;
const update = (tell) => {
  if (updating) return updating;
  updating = (async () => {
    const note = tell || log;
    try {
      if (MANAGED && !process.env.BOB_NO_UPDATE && fs.existsSync(path.join(ROOT, ".git"))) {
        const f = git("fetch", "--depth", "1", "origin", BRANCH);
        if (f.status !== 0) note("Could not check for updates (offline?) — playing the version already here.");
        else {
          const remote = git("rev-parse", "FETCH_HEAD").stdout.trim(), local = headSha();
          if (remote && remote !== local) {
            note("Getting the newest version...");
            // This clone is the keeper's own copy of the code, never edited by hand.
            // Retried: on Windows a file some other program has open for a moment (a virus scan,
            // the search indexer) cannot be replaced, and git gives up with "unable to create
            // file ...: File exists". That stopped the first real update on his PC (2026-09-26);
            // the same reset by hand a minute later went straight through.
            let r;
            for (let i = 0; i < 6; i++) {
              r = git("reset", "--hard", "FETCH_HEAD");
              if (r.status === 0) break;
              log("update: git reset attempt " + (i + 1) + " failed: " + (r.stderr || "").trim().split("\n")[0]);
              await sleep(2000 * (i + 1));
            }
            if (r.status !== 0) note("Update failed: " + (r.stderr || "").trim());
          }
        }
      }
      const pkgHash = crypto.createHash("md5").update(fs.readFileSync(path.join(ROOT, "package.json"))).digest("hex");
      if (!fs.existsSync(path.join(ROOT, "node_modules", ".bin")) || state.pkgHash !== pkgHash) {
        note("Installing (first time only, a few minutes)...");
        const r = npm("install --no-audit --no-fund");
        if (r.status === 0) { state.pkgHash = pkgHash; await saveState(); } else note("Install failed: " + ((r.stderr || "") + (r.stdout || "")).trim().slice(-800));
      }
      const sha = headSha();
      if (sha && !fs.existsSync(path.join(BUILDS, sha, "index.html"))) {
        note("Building the game (about a minute)...");
        const tmp = path.join(BUILDS, sha + ".building");
        fs.rmSync(tmp, { recursive: true, force: true });
        // Served from the root here, not /BobAssetBuilder like the Pages copy.
        const env = { BUILD_PATH: tmp, GENERATE_SOURCEMAP: "false", CI: "false", BROWSER: "none", PUBLIC_URL: "/" };
        const r = npm("run build", env);
        if (r.status === 0 && fs.existsSync(path.join(tmp, "index.html"))) {
          fs.rmSync(path.join(BUILDS, sha), { recursive: true, force: true });
          fs.renameSync(tmp, path.join(BUILDS, sha));
          note("Built " + sha.slice(0, 7) + ".");
          try {
            const old = fs.readdirSync(BUILDS).map((d) => ({ d, t: fs.statSync(path.join(BUILDS, d)).mtimeMs })).sort((a, b) => b.t - a.t).slice(3);
            for (const o of old) fs.rmSync(path.join(BUILDS, o.d), { recursive: true, force: true });
          } catch { /* pruning is housekeeping */ }
        } else {
          fs.rmSync(tmp, { recursive: true, force: true });
          note("The new version did not build, so the last good one keeps running. " + ((r.stderr || "") + (r.stdout || "")).trim().slice(-800));
        }
      }
    } catch (e) { note("Update step failed: " + e.message); }
    return { commit: headSha(), build: currentBuild() };
  })().finally(() => { updating = null; });
  return updating;
};

// ---------- the server ----------
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2", ".woff": "font/woff", ".map": "application/json" };
const readBody = (req) => new Promise((resolve) => {
  const chunks = []; let n = 0;
  req.on("data", (c) => { n += c.length; if (n > 400 * 1024 * 1024) req.destroy(); else chunks.push(c); });
  req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { resolve(null); } });
  req.on("error", () => resolve(null));
});
const send = (res, status, obj, extra) => { res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", ...(extra || {}) }); res.end(JSON.stringify(obj)); };

let keeperRestart = null;
const serve = async () => {
  const where = resolveSaveDir();
  await saveState();
  const folder = new SaveFolder(where.dir);
  let problem = null;
  if (where.missing) {
    problem = "Your save folder is missing: " + where.dir;
    log(problem + " — NOT creating a new empty one. Saves stay in the browser until it is back.");
  } else {
    fs.mkdirSync(where.dir, { recursive: true });
    const { bad } = await folder.load();
    log("save folder " + where.dir + ": " + folder.count() + " records" + (bad ? ", " + bad + " unreadable (History used)" : ""));
    folder.onChange = () => cloudKick(folder);
    await reseed();
    await sweep(folder);
    cloudKick(folder, true);   // pick up anyone else's push and publish what the folder holds now
  }
  // THE PROJECT FILE IS READ AGAIN AFTER EVERY UPDATE, not only at start. It used to be read here once,
  // so an asset an agent delivered through library.json sat in the freshly built clone and never
  // reached the folder while the keeper stayed up — the 5-minute update rebuilt the game around it
  // and the game still could not see it. Harmless to repeat: seedFromRepo only takes a record the
  // folder lacks or a strictly newer save, and a repo delete counts once (state.repoRemoved).
  async function reseed() {
    if (problem) return;
    try {
      const s = await folder.seedFromRepo(path.join(ROOT, "asset-data", "library.json"));
      if (s.take || s.deleted) log("from the project file: " + s.take + " new or newer, " + s.deleted + " deleted");
    } catch (e) { log("reading the project file failed: " + (e && e.message)); }
  }
  const info = () => ({ ok: !problem, keeper: true, saveDir: where.dir, problem, records: folder.lib ? folder.count() : 0, commit: (headSha() || "").slice(0, 7), online: state.cloud ? { at: state.cloud.at || null, sha: (state.cloud.sha || "").slice(0, 7), problem: cloudLastNote || null } : null });

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const p = decodeURIComponent(url.pathname);
      if (p === "/__keeper") {
        if (req.method === "POST" && url.searchParams.get("do") === "update") { const r = await update(); await reseed(); send(res, 200, { ...info(), build: r.build }); if (keeperRestart) setTimeout(() => keeperRestart(), 500); return; }
        return send(res, 200, info());
      }
      if (p === "/__library") {
        if (problem || !folder.lib) return send(res, 503, { ok: false, error: problem || "not ready" });
        if (req.method === "GET") {
          const out = { ok: true, savedAt: folder.lib.savedAt || null, keeper: true };
          for (const k of KINDS) out[k] = folder.lib[k] || [];
          out.removed = folder.lib.removed || {};
          return send(res, 200, out);
        }
        if (req.method === "POST") {
          const body = await readBody(req);
          const r = await folder.write(body);
          return send(res, r.status, r.out);
        }
        return send(res, 405, { ok: false });
      }
      const build = currentBuild();
      if (!build) { res.writeHead(503, { "Content-Type": "text/plain" }); return res.end("Bob Okay is still being built. Try again in a minute."); }
      let file = path.normalize(path.join(build, p));
      if (!file.startsWith(build)) { res.writeHead(403); return res.end(); }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(build, "index.html");
      const isIndex = path.basename(file) === "index.html";
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": isIndex ? "no-store" : "public, max-age=31536000, immutable" });
      fs.createReadStream(file).pipe(res);
    } catch (e) {
      log("request failed: " + (e && e.stack || e));
      try { send(res, 500, { ok: false, error: String(e && e.message) }); } catch { /* socket gone */ }
    }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(PORT, "127.0.0.1", resolve); });
  log("Bob Okay keeper on http://localhost:" + PORT + " (pid " + process.pid + ")");
  if (!problem) setInterval(() => { sweep(folder); }, 60 * 1000).unref();
  const restartIfNewCode = async () => {
    if (keeperHash() === STARTED_HASH) return;
    log("keeper code changed — restarting on the new version");
    await folder.q;                                   // let any save in flight finish first
    for (let i = 0; i < 120 && cloudBusy; i++) await sleep(500);   // and a push to the online copy
    server.close();
    await new Promise((r) => setTimeout(r, 300));
    spawn(process.execPath, [__filename, "serve"], { cwd: ROOT, detached: true, stdio: "ignore", windowsHide: true, env: process.env }).unref();
    process.exit(0);
  };
  // The 5-minute tick also looks at the online copy even when nothing changed here, so a push made
  // somewhere else (an agent's recovery) reaches the folder without waiting for his next save.
  setInterval(() => { if (!problem) cloudKick(folder); update().then(reseed).then(restartIfNewCode); }, 5 * 60 * 1000).unref();
  keeperRestart = restartIfNewCode;
  return server;
};

// ---------- launch (the desktop icon) ----------
const ping = () => new Promise((resolve) => {
  const req = http.get({ host: "127.0.0.1", port: PORT, path: "/__keeper", timeout: 3000 }, (res) => { let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } }); });
  req.on("error", () => resolve(null)); req.on("timeout", () => { req.destroy(); resolve(null); });
});
const post = (p) => new Promise((resolve) => {
  const req = http.request({ host: "127.0.0.1", port: PORT, path: p, method: "POST", timeout: 15 * 60 * 1000 }, (res) => { let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } }); });
  req.on("error", () => resolve(null)); req.end();
});
const openGame = () => { const url = "http://localhost:" + PORT + "/"; spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref(); };

// ---------- KEEP IT RUNNING: started at sign-in, restarted whenever it stops ----------
// THE KEEPER ONLY PROTECTS HIM WHILE IT RUNS. It used to start only when the desktop icon was
// clicked. The PC restarted on 2026-09-27, he went on playing on StackBlitz, and for a week nothing
// gathered his saves. Then on 2026-10-03 a fresh StackBlitz address showed an afternoon of work as
// reverted. So it now starts at sign-in, from a .cmd in the Windows Startup folder (no admin rights
// needed, nothing for him to click), and is watched: `keep` asks it every 30 s and starts it again
// if it is not answering. `keep` holds KEEP_PORT so only one watchdog ever runs.
const KEEP_PORT = PORT + 1;
const STARTUP_DIR = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Microsoft", "Windows", "Start Menu", "Programs", "Startup");
const STARTUP_FILE = path.join(STARTUP_DIR, "Bob Okay save keeper.cmd");
const startupScript = () => [
  "@echo off",
  "rem BOB OKAY SAVE KEEPER - starts at sign-in so every save in every copy of the game reaches",
  "rem Documents\\Bob Okay\\Saves and the online copy every copy opens on. Put here by",
  "rem tools\\bob-okay.js (install). The window closes by itself after a second.",
  "set \"GAME=%LOCALAPPDATA%\\BobOkay\\game\"",
  "if not exist \"%GAME%\\tools\\bob-okay.js\" exit /b 0",
  "where node >nul 2>nul",
  "if errorlevel 1 (",
  "  for /d %%D in (\"%LOCALAPPDATA%\\Microsoft\\WinGet\\Packages\\OpenJS.NodeJS*\") do (",
  "    for /d %%E in (\"%%D\\node-v*\") do set \"PATH=%%E;%PATH%\"",
  "  )",
  ")",
  "node \"%GAME%\\tools\\bob-okay.js\" keep",
  "exit /b 0",
  "",
].join("\r\n");
// Only from the keeper's own clone, so an agent's test run can never write his Startup folder.
const install = () => {
  if (!MANAGED || process.env.BOB_NO_INSTALL) return null;
  const text = startupScript();
  try {
    if (fs.existsSync(STARTUP_FILE) && fs.readFileSync(STARTUP_FILE, "utf8") === text) return STARTUP_FILE;
    fs.mkdirSync(STARTUP_DIR, { recursive: true });
    fs.writeFileSync(STARTUP_FILE, text);
    log("sign-in start installed: " + STARTUP_FILE);
    return STARTUP_FILE;
  } catch (e) { log("could not install the sign-in start: " + e.message); return null; }
};
const pingKeep = () => new Promise((resolve) => {
  const req = http.get({ host: "127.0.0.1", port: KEEP_PORT, path: "/__keep", timeout: 3000 }, (res) => { let d = ""; res.on("data", (c) => (d += c)); res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } }); });
  req.on("error", () => resolve(null)); req.on("timeout", () => { req.destroy(); resolve(null); });
});
// The watchdog, detached from whatever console started it (the sign-in .cmd closes at once).
const startKeep = () => spawn(process.execPath, [__filename, "keep"], { cwd: ROOT, detached: true, stdio: "ignore", windowsHide: true, env: { ...process.env, BOB_KEEP_CHILD: "1" } }).unref();
const startServe = () => {
  const env = { ...process.env };
  delete env.BOB_KEEP_CHILD;
  spawn(process.execPath, [__filename, "serve"], { cwd: ROOT, detached: true, stdio: "ignore", windowsHide: true, env }).unref();
};
const keep = async () => {
  if (!process.env.BOB_KEEP_CHILD) { startKeep(); return; }
  const mutex = http.createServer((req, res) => send(res, 200, { keep: true, pid: process.pid }));
  let bound = false;
  for (let i = 0; i < 10 && !bound; i++) {
    try { await new Promise((resolve, reject) => { mutex.once("error", reject); mutex.listen(KEEP_PORT, "127.0.0.1", resolve); }); bound = true; }
    catch (e) { if (e && e.code === "EADDRINUSE") { if (await pingKeep()) return process.exit(0); await sleep(1000); } else throw e; }   // one is already watching
  }
  if (!bound) return process.exit(0);
  install();
  log("watchdog running (pid " + process.pid + ")");
  let misses = 0, first = true;
  const tick = async () => {
    const alive = await ping();
    if (alive) misses = 0;
    else if (first || ++misses >= 2) { log("watchdog: the keeper was not running — starting it"); startServe(); misses = 0; }
    first = false;
    // New watchdog code arrived with an update: hand over to it.
    if (keeperHash() !== STARTED_HASH) { log("watchdog: new code — restarting"); mutex.close(); await sleep(500); startKeep(); process.exit(0); }
  };
  await tick();
  setInterval(tick, 30 * 1000);
};
const launch = async () => {
  const alive = await ping();
  if (alive) {
    say("Bob Okay is running. Checking for updates...");
    await post("/__keeper?do=update");
  } else {
    say("Starting Bob Okay...");
    await update(say);
    const child = spawn(process.execPath, [__filename, "serve"], { cwd: ROOT, detached: true, stdio: "ignore", windowsHide: true, env: process.env });
    child.unref();
    let up = null;
    for (let i = 0; i < 120 && !up; i++) { await sleep(500); up = await ping(); }
    if (!up) { say("The game did not start. The log is at " + LOG_FILE); process.exitCode = 1; return; }
    if (up.problem) say("WARNING: " + up.problem);
    else say("Saves: " + up.saveDir + " (" + up.records + " things saved)");
  }
  // Whichever way the keeper got started, from here on it starts at sign-in and is watched.
  install();
  if (MANAGED && !(await pingKeep())) startKeep();
  openGame();
};

// ---------- export (for agents: his real library, not the repo snapshot) ----------
const exportTo = async (out) => {
  const where = resolveSaveDir();
  const folder = new SaveFolder(where.dir);
  await folder.load();
  const lib = { savedAt: new Date().toISOString() };
  for (const k of KINDS) lib[k] = folder.lib[k];
  lib.removed = folder.lib.removed;
  fs.writeFileSync(out, JSON.stringify(lib, null, 1));
  console.log("wrote " + out + " from " + where.dir + " (" + folder.count() + " records)");
};

if (require.main === module) {
  const [mode, arg] = process.argv.slice(2);
  const fail = (e) => { log("fatal: " + (e && e.stack || e)); console.error(e && e.message || e); process.exit(1); };
  if (mode === "serve") serve().catch((e) => { if (e && e.code === "EADDRINUSE") { log("already running"); process.exit(0); } fail(e); });
  else if (mode === "launch" || !mode) launch().catch(fail);
  else if (mode === "keep") keep().catch(fail);
  else if (mode === "install") { const f = install(); console.log(f ? "sign-in start: " + f : "not installed (only the keeper's own clone installs it)"); pingKeep().then((k) => { if (!k && MANAGED) startKeep(); console.log(k ? "watchdog already running" : MANAGED ? "watchdog started" : ""); }); }
  else if (mode === "export" && arg) exportTo(arg).catch(fail);
  else if (mode === "status") { const w = resolveSaveDir(); console.log({ saveDir: w.dir, missing: w.missing, home: HOME, log: LOG_FILE, build: currentBuild(), port: PORT, startup: fs.existsSync(STARTUP_FILE) ? STARTUP_FILE : null, online: state.cloud || null }); }
  else { console.error("usage: node tools/bob-okay.js [launch|serve|keep|install|export <file>|status]"); process.exit(2); }
}

module.exports = { SaveFolder, findCopies, update, serve, cloudSync };
