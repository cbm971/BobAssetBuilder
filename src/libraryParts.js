/* THE LIBRARY AS PARTS — pure, no file system, so the browser, the dev server, the keeper and the
 * tools all read and write the same shape (libraryParts.test.js).
 *
 * WHY (Blake, 2026-11-17: "Eventually there will be 600+ items ... Obviously there is going to be
 * much more than 100MB of assets"). The whole library used to be ONE file, library.json, and it
 * reached 60 MB that day. GitHub refuses any single file over 100 MB (and warns past 50). Three
 * copies of that file are pushed: asset-data/library.json on the play branch, the online save on the
 * `saves` branch (the keeper pushes it every minute he works), and the Pages seed. Past 100 MB the
 * keeper's push would fail on every try, and since it only logs "trying again later", his online
 * save would have silently stopped updating for every copy of the game.
 *
 * So the records live in numbered PART files of at most PART_MAX_CHARS each (library.1.json,
 * library.2.json, ...). library.json itself is a small INDEX naming them. However big the library
 * grows, no file passes the cap; it just gains another part. One record is a few hundred KB at
 * most, far below any limit.
 *
 * The index carries `set`, a hash of every part's text, and every part repeats it. A reader that
 * gets parts from two different saves (a cached part beside a new index, a write cut off half way)
 * sees the mismatch and refuses the whole read rather than assembling half of one save and half of
 * another; every reader already falls back to its previous copy or the backup on a failed read.
 * The hash is of the content, so the same library always gives byte-identical files (the keeper
 * tells "nothing changed" from its hash and must not push every minute).
 *
 * The OLD single-file shape (records right in library.json) is still read everywhere: old saves,
 * old snapshots, History, and anything an older copy wrote. Only the writers changed.
 *
 * Each part is printed exactly as JSON.stringify(part, null, 1) would print it (one field per line),
 * built record by record so a 60 MB library is stringified once. A save that changes one record
 * changes only that record's lines, so git keeps storing each push as a small delta.
 */
"use strict";

const LIBRARY_KINDS = ["assets", "levels", "stamps", "textures", "backgrounds", "dialogues", "sounds"];
const PARTS_FORMAT = "bob-library-parts-1";
// 20 MB a part: under GitHub's 50 MB warning, a fifth of its 100 MB limit.
const PART_MAX_CHARS = 20 * 1000 * 1000;
const INDEX_KEYS = ["format", "set", "parts"];

// "library.json" -> "library.3.json"; "library.bak.json" -> "library.bak.3.json".
const partName = (indexName, n) => String(indexName).replace(/\.json$/i, "") + "." + n + ".json";
// Is `name` one of indexName's parts (any number)? Used to clear parts a smaller library left behind.
const isPartOf = (indexName, name) => {
  const stem = String(indexName).replace(/\.json$/i, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("^" + stem + "\\.\\d+\\.json$", "i").test(String(name));
};
// A part name read from an index someone else wrote: a plain file name, nothing that climbs out of
// the folder or the URL it is read from.
const safePartName = (name) => typeof name === "string" && /^[A-Za-z0-9_-][A-Za-z0-9_.-]*\.json$/.test(name) && !name.includes("..");

const isPartsIndex = (d) => !!d && typeof d === "object" && d.format === PARTS_FORMAT && typeof d.set === "string" && Array.isArray(d.parts);

// FNV-1a over UTF-16 code units, two lanes, as 16 hex digits. Not cryptographic and needs not be:
// it only has to tell two different saves apart.
const fnv = (h, s) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const hex8 = (n) => ("0000000" + n.toString(16)).slice(-8);

// lib -> { index: text, parts: [{ name, text }] }. `indexName` is the file the index is written as.
const splitLibrary = (lib, indexName = "library.json", opts = {}) => {
  const max = opts.maxChars || PART_MAX_CHARS;
  const src = lib && typeof lib === "object" ? lib : {};
  const groups = [];   // [{ kinds: { kind: [recordText] }, chars }]
  let cur = null, h1 = 2166136261, h2 = 0x9747b28c;
  h1 = fnv(h1, "max:" + max);
  for (const kind of LIBRARY_KINDS) {
    const list = Array.isArray(src[kind]) ? src[kind] : [];
    for (const r of list) {
      const one = JSON.stringify(r === undefined ? null : r, null, 1);
      const text = "  " + one.split("\n").join("\n  ");   // an array element two levels down
      if (!cur || (cur.chars > 0 && cur.chars + text.length > max)) { cur = { kinds: {}, chars: 0 }; groups.push(cur); }
      (cur.kinds[kind] || (cur.kinds[kind] = [])).push(text);
      cur.chars += text.length + 2;
      h1 = fnv(fnv(h1, kind), text); h2 = fnv(fnv(h2, text), kind);
    }
  }
  h1 = fnv(h1, "parts:" + groups.length);
  const set = hex8(h1) + hex8(h2);
  const parts = groups.map((g, i) => {
    let t = "{\n \"set\": " + JSON.stringify(set) + ",\n \"part\": " + (i + 1);
    for (const kind of Object.keys(g.kinds)) t += ",\n " + JSON.stringify(kind) + ": [\n" + g.kinds[kind].join(",\n") + "\n ]";
    return { name: partName(indexName, i + 1), text: t + "\n}" };
  });
  const index = { format: PARTS_FORMAT, set, parts: parts.map((p) => p.name) };
  for (const k of Object.keys(src)) if (!LIBRARY_KINDS.includes(k) && !INDEX_KEYS.includes(k)) index[k] = src[k];
  return { index: JSON.stringify(index, null, 1), parts, set };
};

// An index and its parts (parsed, in order) -> the library, or a thrown Error when they do not
// belong together. An old single-file library is handed back as it is.
const assembleLibrary = (index, parts) => {
  if (!isPartsIndex(index)) return index;
  if (!Array.isArray(parts) || parts.length !== index.parts.length) throw new Error("library: " + index.parts.length + " parts named, " + (parts ? parts.length : 0) + " read");
  const out = {};
  for (const k of Object.keys(index)) if (!INDEX_KEYS.includes(k)) out[k] = index[k];
  for (const k of LIBRARY_KINDS) out[k] = [];
  parts.forEach((p, i) => {
    if (!p || typeof p !== "object" || p.set !== index.set || p.part !== i + 1) throw new Error("library: part " + (i + 1) + " is not from this save");
    for (const k of Object.keys(p)) {
      if (k === "set" || k === "part") continue;
      if (!Array.isArray(p[k])) throw new Error("library: part " + (i + 1) + " " + k + " is not a list");
      const into = out[k] || (out[k] = []);
      for (const r of p[k]) into.push(r);
    }
  });
  return out;
};

// Read a library through `readJson(name)` (a parsed file, by name beside the index; throws or
// returns null when missing). Sync for the dev server and tools, async for fetch.
const loadLibrary = (readJson, indexName = "library.json") => {
  const index = readJson(indexName);
  if (!isPartsIndex(index)) return index;
  if (!index.parts.every(safePartName)) throw new Error("library: a part name is not a plain file name");
  return assembleLibrary(index, index.parts.map((n) => readJson(n)));
};
const loadLibraryAsync = async (readJson, indexName = "library.json") => {
  const index = await readJson(indexName);
  if (!isPartsIndex(index)) return index;
  if (!index.parts.every(safePartName)) throw new Error("library: a part name is not a plain file name");
  return assembleLibrary(index, await Promise.all(index.parts.map((n) => readJson(n))));
};

module.exports = { LIBRARY_KINDS, PARTS_FORMAT, PART_MAX_CHARS, partName, isPartOf, safePartName, isPartsIndex, splitLibrary, assembleLibrary, loadLibrary, loadLibraryAsync };
