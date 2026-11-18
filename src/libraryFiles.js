/* THE LIBRARY ON DISK, as an index + parts (libraryParts.js says why). Node only: the dev server
 * (setupProxy.js), the keeper (tools/bob-okay.js), publish and the agent tools all read and write
 * library files through here, so none of them can write one giant file again or read only half.
 *
 *   readLibraryFile(file)          the whole library (either shape), or throws
 *   writeLibraryFile(file, lib)    writes the parts, then the index, then clears leftover parts
 *   writeSplitFiles(file, split)   the same for an already-split library (the keeper hashes it first)
 *   copyLibraryFiles(from, to)     a copy under another name (backups, snapshots, the Pages seed)
 *   removeLibraryFiles(file)       the index and every part of it
 *   libraryFileNames(file)         the index and its parts as they are on disk now
 */
"use strict";
const fs = require("fs");
const path = require("path");
const P = require("./libraryParts");

const readJsonFile = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const readLibraryFile = (file) => P.loadLibrary((n) => readJsonFile(path.join(path.dirname(file), n)), path.basename(file));

// Write to a temp file and rename: a reader sees the old file or the new one, never half of one.
const writeAtomic = (f, text) => { const tmp = f + ".tmp"; fs.writeFileSync(tmp, text); fs.renameSync(tmp, f); };

// Parts first, the index last: until the index is replaced it still names the old set, and a part
// already rewritten no longer matches it, so a reader in between refuses the read (and falls back)
// rather than mixing two saves.
const writeSplitFiles = (file, split) => {
  const dir = path.dirname(file), base = path.basename(file);
  fs.mkdirSync(dir, { recursive: true });
  for (const p of split.parts) writeAtomic(path.join(dir, p.name), p.text);
  writeAtomic(file, split.index);
  const keep = new Set(split.parts.map((p) => p.name));
  for (const f of fs.readdirSync(dir)) if (P.isPartOf(base, f) && !keep.has(f)) { try { fs.unlinkSync(path.join(dir, f)); } catch { /* next write */ } }
  return split;
};
const writeLibraryFile = (file, lib, opts) => writeSplitFiles(file, P.splitLibrary(lib, path.basename(file), opts));

const libraryFileNames = (file) => {
  const dir = path.dirname(file), base = path.basename(file);
  let names = [];
  try { names = fs.readdirSync(dir).filter((f) => P.isPartOf(base, f)); } catch { /* no folder */ }
  return [file, ...names.map((f) => path.join(dir, f))];
};
const removeLibraryFiles = (file) => { for (const f of libraryFileNames(file)) { try { fs.unlinkSync(f); } catch { /* gone */ } } };

// A copy as it is on disk, byte for byte, under the new name: an index's parts are copied to the new
// name's parts and the copied index names them. An old single file is copied as it is.
const copyLibraryFiles = (from, to) => {
  const text = fs.readFileSync(from, "utf8");
  let index = null;
  try { index = JSON.parse(text); } catch { index = null; }
  const dir = path.dirname(to), base = path.basename(to);
  fs.mkdirSync(dir, { recursive: true });
  if (!P.isPartsIndex(index)) { removeLibraryFiles(to); writeAtomic(to, text); return; }
  if (!index.parts.every(P.safePartName)) throw new Error("library: a part name is not a plain file name");
  const names = index.parts.map((_, i) => P.partName(base, i + 1));
  index.parts.forEach((n, i) => writeAtomic(path.join(dir, names[i]), fs.readFileSync(path.join(path.dirname(from), n), "utf8")));
  writeAtomic(to, JSON.stringify({ ...index, parts: names }, null, 1));
  const keep = new Set(names);
  for (const f of fs.readdirSync(dir)) if (P.isPartOf(base, f) && !keep.has(f)) { try { fs.unlinkSync(path.join(dir, f)); } catch { /* next copy */ } }
};

// Do the index and the parts on disk belong together? Cheap (the head of each part only), so a
// writer can ask it before copying the current files over its backup: a set left mixed by a write
// that was cut off must never replace a good backup.
const libraryFilesConsistent = (file) => {
  try {
    const index = readJsonFile(file);
    if (!P.isPartsIndex(index)) return !!index && Array.isArray(index.assets);
    const want = "\"set\": " + JSON.stringify(index.set) + ",";
    return index.parts.every((n, i) => {
      if (!P.safePartName(n)) return false;
      const fd = fs.openSync(path.join(path.dirname(file), n), "r");
      try { const b = Buffer.alloc(200); const len = fs.readSync(fd, b, 0, 200, 0); const head = b.slice(0, len).toString("utf8"); const m = head.match(/"part": (\d+)[,\r\n]/); return head.includes(want) && !!m && Number(m[1]) === i + 1; }
      finally { fs.closeSync(fd); }
    });
  } catch { return false; }
};

module.exports = { readLibraryFile, writeLibraryFile, writeSplitFiles, copyLibraryFiles, removeLibraryFiles, libraryFileNames, libraryFilesConsistent };
