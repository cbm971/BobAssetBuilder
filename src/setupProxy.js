/* Asset storage that lives in the PROJECT, not the browser.
 *
 * Browser storage is scoped to the page's address. The preview hostname carries a session id, so
 * when the container reboots and hands out a new one the studio opens on a brand-new, empty store
 * and a library built over months reads as gone — with every byte still on disk under the old
 * hostname, unreachable, because no page may read another origin's storage. The project directory
 * has none of that problem: it survives reboots, it survives new hostnames, and it is what gets
 * committed. So the dev server keeps the real copy here.
 *
 * NOTHING IN THIS FILE MAY THROW. CRA runs it while starting the dev server, so an exception here —
 * a missing dependency, a read-only filesystem, anything — takes the whole studio down and the page
 * doesn't load at all. Every part of it is therefore optional: if this can't run, the app falls back
 * to browser storage exactly as before and the only thing lost is the extra safety net.
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "asset-data");
const DATA_FILE = path.join(DATA_DIR, "library.json");
const BAK_FILE = path.join(DATA_DIR, "library.bak.json");
const SNAP_DIR = path.join(DATA_DIR, "snapshots");
const SNAP_KEEP = 5;
// Every kind of drawn work the file carries. Adding a new one is adding a word here — the read,
// the merge, the delete and the response all walk this list. The reason it is a list at all: each
// time a kind was handled by hand, one of them got missed, and the kind that got missed is the one
// that was lost. `assets` keeps its special "never blank this" guard below; the rest simply merge.
const KINDS = ["assets", "levels", "stamps", "textures", "backgrounds"];

const emptyLibrary = () => {
  const out = { savedAt: null };
  for (const k of KINDS) out[k] = [];
  return out;
};

const readLibrary = () => {
  for (const f of [DATA_FILE, BAK_FILE]) {
    try {
      const parsed = JSON.parse(fs.readFileSync(f, "utf8"));
      if (parsed && Array.isArray(parsed.assets)) {
        // A file written before a kind existed simply has no key for it.
        for (const k of KINDS) if (!Array.isArray(parsed[k])) parsed[k] = [];
        return parsed;
      }
    } catch { /* try the backup, then give up quietly */ }
  }
  return emptyLibrary();
};

// One rolling backup is one write deep: a bad write followed by any second write loses both
// copies. So the first write of each day also puts that day's file aside untouched, and the last
// few days are kept. This is the difference between "there is a backup" and "there is a backup
// from before whatever went wrong". Snapshots are local safety only and are gitignored — the
// committed library.json is still the copy that survives the container itself.
const snapshot = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    fs.mkdirSync(SNAP_DIR, { recursive: true });
    const today = new Date().toISOString().slice(0, 10);
    const target = path.join(SNAP_DIR, "library-" + today + ".json");
    if (!fs.existsSync(target)) fs.copyFileSync(DATA_FILE, target);
    const old = fs.readdirSync(SNAP_DIR).filter((f) => /^library-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    for (const f of old.slice(0, Math.max(0, old.length - SNAP_KEEP))) {
      try { fs.unlinkSync(path.join(SNAP_DIR, f)); } catch { /* best effort */ }
    }
  } catch { /* a snapshot failing must never stop the real save */ }
};

const writeLibrary = (next) => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  snapshot();
  try { if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, BAK_FILE); } catch { /* best effort */ }
  // Write to a temp file and rename. A half-written library.json is the one way this file can be
  // lost while the disk is working fine — rename is atomic, so a reader sees the old file or the
  // new one and never a truncated one.
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(next, null, 1));
  fs.renameSync(tmp, DATA_FILE);
};

// Merge by id, incoming wins for anything it names, nothing already stored is ever dropped.
const mergeById = (existing, incoming) => {
  const byId = new Map((existing || []).filter((a) => a && a.id).map((a) => [a.id, a]));
  for (const a of (incoming || [])) if (a && a.id) byId.set(a.id, a);
  return [...byId.values()];
};

// Deleting is the ONE operation allowed to shrink the file. Everything else here is additive on
// purpose, which meant a delete in the browser was undone by the very next load pulling the record
// back out of the project. Only ids the app explicitly names are dropped.
const removeById = (list, ids) => {
  const gone = new Set((ids || []).filter(Boolean));
  if (!gone.size) return list || [];
  return (list || []).filter((x) => x && !gone.has(x.id));
};

// The whole write rule as one pure function, so it can be tested without a running dev server.
const applyWrite = (current, body, incoming) => {
  const rm = (body && body.remove) || {};
  // An empty assets array is never a reason to empty the file — that is how a library gets erased
  // by a page that merely hadn't finished loading yet. But it must not throw away the REST of the
  // same POST either, which is what the old early-return did: a level save or a stored group
  // legitimately carries no assets at all, so every one of them was silently ignored.
  const keptAssets = !incoming.length && ((current.assets || []).length > 0);
  const next = { savedAt: new Date().toISOString() };
  for (const k of KINDS) {
    const merged = k === "assets"
      ? (keptAssets ? (current.assets || []) : (body && body.replace ? incoming : mergeById(current.assets, incoming)))
      : (Array.isArray(body && body[k]) ? mergeById(current[k], body[k]) : (current[k] || []));
    next[k] = removeById(merged, rm[k]);
  }
  return { keptAssets, next };
};

// Read a JSON body without depending on express's parser being available.
const readJsonBody = (req) => new Promise((resolve) => {
  let raw = "";
  req.on("data", (c) => { raw += c; if (raw.length > 400 * 1024 * 1024) req.destroy(); });
  req.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve(null); } });
  req.on("error", () => resolve(null));
});

module.exports = function (app) {
  try {
    app.use("/__library", async (req, res, next) => {
      try {
        if (req.method === "GET") {
          const lib = readLibrary();
          res.setHeader("Content-Type", "application/json");
          const out = { ok: true, savedAt: lib.savedAt };
          for (const k of KINDS) out[k] = lib[k] || [];
          return res.end(JSON.stringify(out));
        }
        if (req.method === "POST") {
          const body = (req.body && typeof req.body === "object") ? req.body : await readJsonBody(req);
          const incoming = (body && Array.isArray(body.assets)) ? body.assets.filter((a) => a && a.id) : null;
          res.setHeader("Content-Type", "application/json");
          if (!incoming) { res.statusCode = 400; return res.end(JSON.stringify({ ok: false, error: "no assets array" })); }
          const current = readLibrary();
          const { next, keptAssets } = applyWrite(current, body, incoming);
          writeLibrary(next);
          const counts = { ok: true, keptAssets };
          for (const k of KINDS) counts[k] = next[k].length;
          return res.end(JSON.stringify(counts));
        }
        return next();
      } catch (e) {
        try { res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: String(e && e.message) })); } catch { /* socket already gone */ }
      }
    });
  } catch (e) {
    // The studio matters more than the safety net. Say so in the terminal and let the app boot.
    console.warn("[Bob] project-file library disabled (" + (e && e.message) + ") — browser storage only");
  }
};

// Exported for the tests only. The write rules are the part of this file that can lose work, and
// they are worth testing without standing a dev server up.
module.exports.__test = { applyWrite, mergeById, removeById, KINDS };
