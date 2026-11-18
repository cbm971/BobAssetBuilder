#!/usr/bin/env node
// THE COMMITTED LIBRARY (asset-data/library.json + its parts, src/libraryParts.js) FOR AGENTS.
//
//   node tools/library.js add F     put the records in F ({ assets: [...], levels: [...], ... }) into
//                                   asset-data/library.json AND library.bak.json: a new id goes on the
//                                   end of its kind, a known id is replaced only by a strictly newer
//                                   savedAt (anything else is refused, nothing written)
//   node tools/library.js split     rewrite both as index + parts (any old one-file library)
//   node tools/library.js size      every file's size, and the biggest part against the limits
//
// Never splice records into the part files by hand: a part's "set" must match its index, and the
// index is what says which part a record is in.
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const P = require(path.join(ROOT, "src", "libraryParts.js"));
const F = require(path.join(ROOT, "src", "libraryFiles.js"));
const FILES = ["library.json", "library.bak.json"].map((n) => path.join(ROOT, "asset-data", n));
const MB = (n) => (n / 1e6).toFixed(1) + " MB";

const size = () => {
  let biggest = 0;
  for (const file of FILES) for (const f of F.libraryFileNames(file)) {
    const n = fs.statSync(f).size; biggest = Math.max(biggest, n);
    console.log(path.relative(ROOT, f).padEnd(34), MB(n));
  }
  console.log("biggest file " + MB(biggest) + " (a part holds at most " + MB(P.PART_MAX_CHARS) + "; GitHub warns at 50 MB and refuses 100 MB)");
};

const add = (recFile) => {
  const recs = JSON.parse(fs.readFileSync(recFile, "utf8"));
  const libs = FILES.map((f) => F.readLibraryFile(f));
  for (const lib of libs) {
    for (const kind of P.LIBRARY_KINDS) {
      for (const r of recs[kind] || []) {
        if (!r || !r.id) throw new Error("a " + kind + " record has no id");
        const list = lib[kind] || (lib[kind] = []);
        const i = list.findIndex((x) => x && x.id === r.id);
        if (i < 0) { list.push(r); continue; }
        if (!(typeof r.savedAt === "number" && (typeof list[i].savedAt !== "number" || r.savedAt > list[i].savedAt))) throw new Error(kind + " " + r.id + " is already there and this copy is not newer (savedAt " + r.savedAt + " vs " + list[i].savedAt + ")");
        list[i] = r;
      }
    }
  }
  FILES.forEach((f, i) => F.writeLibraryFile(f, libs[i]));
  const n = P.LIBRARY_KINDS.reduce((s, k) => s + (recs[k] || []).length, 0);
  console.log("added or replaced " + n + " record(s) in both files");
  check();
};

const split = () => { for (const f of FILES) F.writeLibraryFile(f, F.readLibraryFile(f)); console.log("both files are index + parts"); check(); };

// Read back what was written: it must parse whole and every file must be under the cap.
const check = () => {
  for (const f of FILES) {
    const lib = F.readLibraryFile(f);
    const n = P.LIBRARY_KINDS.reduce((s, k) => s + (lib[k] || []).length, 0);
    if (!F.libraryFilesConsistent(f)) throw new Error(f + " parts do not match their index");
    for (const g of F.libraryFileNames(f)) if (fs.statSync(g).size > 45e6) throw new Error(g + " is over 45 MB");
    console.log(path.relative(ROOT, f) + ": " + n + " records read back");
  }
  size();
};

const [cmd, arg] = process.argv.slice(2);
try {
  if (cmd === "add" && arg) add(arg);
  else if (cmd === "split") split();
  else if (cmd === "size") size();
  else { console.error("usage: node tools/library.js add <records.json> | split | size"); process.exit(2); }
} catch (e) { console.error(e && e.message || e); process.exit(1); }
