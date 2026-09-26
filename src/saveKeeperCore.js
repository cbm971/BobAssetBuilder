/* THE SAVE KEEPER'S RULES — pure, no file system, so they are tested (saveKeeperCore.test.js).
 *
 * Why a save keeper exists at all (tools/bob-okay.js runs it): on 2026-09-26 Blake worked in two
 * copies of the game on the same day. Each copy kept its own private save in its own browser
 * storage and started from the committed library.json, so each one showed half his day as
 * "reverted". That was the same failure as 2026-08-05, 09-10, 09-18 and 09-20 — every layer added
 * since (IndexedDB, host store, project file, 📁 save folder, the Pages copy) still let two copies
 * of the game hold two different saves. The fix is the one every desktop game uses: ONE save folder
 * on his PC (Documents\Bob Okay\Saves), which the desktop copy reads and writes directly and which
 * sweeps up anything saved in any other copy. These are the rules for what lands in it.
 *
 * Nothing here ever throws away a version. Whatever loses a merge still goes to History (the keeper
 * writes every version it has ever seen), so the worst any rule below can do is choose which
 * version is CURRENT — never lose one.
 */
"use strict";

const KINDS = ["assets", "levels", "stamps", "textures", "backgrounds", "dialogues"];
// The browser store's key prefix for each kind: sset("level:" + id, ...), and so on.
const PREFIX = { assets: "asset", levels: "level", stamps: "stamp", textures: "texture", backgrounds: "background", dialogues: "dialogue" };
const KIND_OF_PREFIX = Object.fromEntries(Object.entries(PREFIX).map(([k, p]) => [p, k]));

// Same as newerRecord in App.js: dated beats undated, strictly greater savedAt wins, undated never wins.
const newerRecord = (a, b) => {
  if (!a || typeof a.savedAt !== "number") return false;
  if (!b || typeof b.savedAt !== "number") return true;
  return a.savedAt > b.savedAt;
};

const J = (o) => JSON.stringify(o);
// Same record apart from when it was saved.
const sameContent = (a, b) => {
  if (!a || !b) return a === b;
  const x = { ...a }, y = { ...b };
  delete x.savedAt; delete y.savedAt;
  return J(x) === J(y);
};
const isMap = (v) => !!v && typeof v === "object" && !Array.isArray(v);

// THREE-WAY MERGE of two copies of one record that were both edited from the same `base`.
// This is what brought 2026-09-26 back: Trailor Int1 got its top-down floor in one copy and a new
// section name in the other, and "newest wins" would have kept the section name and thrown the
// whole floor away. Field by field: whichever side changed a field takes it; for the cell maps a
// level is made of (fg, bg, front, fx, climb, enemies, ...) that goes cell by cell, so painting in
// one copy and placing enemies in the other both survive. Where BOTH changed the same field or
// cell differently, `theirs` wins — callers pass the newer copy as theirs. Returns
// { record, conflicts } with conflicts naming what was decided by that tie-break.
const merge3 = (base, ours, theirs) => {
  const out = {};
  const conflicts = [];
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(ours || {}), ...Object.keys(theirs || {})]);
  for (const k of keys) {
    if (k === "savedAt") continue;
    const b = base ? base[k] : undefined, o = ours ? ours[k] : undefined, t = theirs ? theirs[k] : undefined;
    const oCh = J(o) !== J(b), tCh = J(t) !== J(b);
    let v;
    if (!oCh && !tCh) v = b;
    else if (oCh && !tCh) v = o;
    else if (tCh && !oCh) v = t;
    else if (J(o) === J(t)) v = t;
    else if (isMap(o) && isMap(t) && (b === undefined || isMap(b))) {
      v = {};
      const cells = new Set([...Object.keys(b || {}), ...Object.keys(o), ...Object.keys(t)]);
      let clash = 0;
      for (const c of cells) {
        const cb = b ? b[c] : undefined, co = o[c], ct = t[c];
        const ocC = J(co) !== J(cb), tcC = J(ct) !== J(cb);
        let cv;
        if (!ocC && !tcC) cv = cb;
        else if (ocC && !tcC) cv = co;
        else if (tcC && !ocC) cv = ct;
        else { cv = ct; if (J(co) !== J(ct)) clash++; }
        if (cv !== undefined) v[c] = cv;
      }
      if (clash) conflicts.push(k + " (" + clash + ")");
    } else { v = t; conflicts.push(k); }
    if (v !== undefined) out[k] = v;
  }
  return { record: out, conflicts };
};

// WHAT TO DO WITH ONE RECORD FOUND IN ANOTHER COPY OF THE GAME (the Chrome sweep).
//   inc        — the record that copy holds
//   cur        — the save folder's current record for that id (or null)
//   curSource  — which copy wrote `cur` ("repo", "desktop", "combined", or a copy's name)
//   source     — the copy `inc` came from
//   seen(at)   — does History already hold a version of this id saved at `at`?
//   baseFor(at) — the version `inc` was most plausibly edited FROM: the newest History version
//                saved before `at` that came from that same copy or from the committed file (a
//                StackBlitz copy starts from the committed file). Never another copy's edit —
//                using the desktop's own earlier save as the base would read the desktop's
//                changes as things the other copy "undid".
//   deleted    — the id is on the folder's deleted list
//   epoch      — when the keeper first ran. A version older than that which History has never
//                seen is an ANCESTOR (the old copies in the profile are full of them), not an
//                edit: it is kept, never merged. The first dry run combined three of those into
//                current records, which would have walked old pieces back into his newest work.
// Returns { action, record? }:
//   "none"    nothing new (identical, already in History, or load noise with the same savedAt)
//   "take"    inc becomes current
//   "combine" record = both copies' edits merged; becomes current
//   "keep"    inc is a version never seen before but cannot be placed; it goes to History only
const decideSweep = ({ inc, cur, curSource, source, seen, baseFor, deleted, epoch = 0 }) => {
  if (!inc || !inc.id) return { action: "none" };
  if (!cur) return deleted ? { action: "keep" } : { action: "take" };
  if (sameContent(inc, cur)) return { action: "none" };
  // Same save time, different bytes: the loaders re-tag pieces (_src, fresh ids) on the way in and
  // write that back without a new savedAt. That is not an edit and must never win or merge.
  if (typeof inc.savedAt === "number" && inc.savedAt === cur.savedAt) return { action: "none" };
  if (typeof inc.savedAt === "number" && seen(inc.savedAt)) return { action: "none" };
  const incNewer = newerRecord(inc, cur);
  const incAt = typeof inc.savedAt === "number" ? inc.savedAt : 0;
  if (incAt < epoch && !incNewer) return { action: "keep" };
  // A copy continuing its own work, or a copy that started from the committed file the folder
  // was seeded with: inc was made FROM cur, so it simply replaces it.
  if (incNewer && (curSource === source || curSource === "repo")) return { action: "take" };
  // Two copies each edited this record without seeing the other's edit. Merge against the version
  // the other copy started from.
  const base = incAt ? baseFor(incAt) : null;
  if (base) {
    const newer = incNewer ? inc : cur, older = incNewer ? cur : inc;
    const m = merge3(base, older, newer);
    if (sameContent(m.record, cur)) return { action: "keep" };
    return { action: "combine", record: m.record, conflicts: m.conflicts };
  }
  return incNewer ? { action: "take" } : { action: "keep" };
};

// A browser store read out of Chrome ([{ key, value }] from tools/read-chrome-leveldb.js) in the
// library shape. Unparseable values are skipped one by one, never the whole store.
const libraryFromStore = (entries) => {
  const out = {};
  for (const k of KINDS) out[k] = [];
  let removed = null;
  for (const e of entries || []) {
    if (!e || typeof e.key !== "string" || typeof e.value !== "string") continue;
    if (e.key === "removedIndex") { try { const r = JSON.parse(e.value); if (isMap(r)) removed = r; } catch { /* skip */ } continue; }
    const i = e.key.indexOf(":");
    if (i < 0) continue;
    const kind = KIND_OF_PREFIX[e.key.slice(0, i)];
    if (!kind) continue;
    let rec = null;
    try { rec = JSON.parse(e.value); } catch { continue; }
    if (rec && typeof rec === "object" && rec.id) out[kind].push(rec);
  }
  out.removed = {};
  for (const k of KINDS) out.removed[k] = Array.isArray(removed && removed[k]) ? removed[k].filter(Boolean) : [];
  return out;
};

module.exports = { KINDS, PREFIX, newerRecord, sameContent, merge3, decideSweep, libraryFromStore };
