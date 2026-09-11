#!/usr/bin/env node
// READ THE STUDIO'S RECORDS STRAIGHT OUT OF CHROME'S PROFILE, for a preview address that is gone.
//
// This is the recovery that brought the whole library back on 2026-09-10 (131 assets, 9 levels,
// 18 stored groups, 13 textures, 3 dialogues — 29 assets and 3 levels that had never reached git,
// 83 assets with newer versions than git, and the deleted-ids list), and on 2026-08-05 before it.
// Both times the reader had to be rebuilt from a paragraph. It lives here now. Read-only; Chrome
// does not need to be closed (copy the directory first, skipping LOCK).
//
//   node tools/read-chrome-leveldb.js idb <copy of ...indexeddb.leveldb> [<copy of ...indexeddb.blob>]
//   node tools/read-chrome-leveldb.js ls  <copy of "Local Storage/leveldb">
//
// Writes <dir>.records.json next to the directory: [{ key, seq, value, ... }]. `value` is the
// stored string (the app stores JSON strings), so a record parses straight back into an asset.
//
// WHERE THE DATA IS (Windows, Chrome, Default profile):
//   %LOCALAPPDATA%\Google\Chrome\User Data\Default\IndexedDB\
//       https_<preview host>_0.indexeddb.leveldb     <- the store (sget/sset land here when there
//                                                       is no window.storage, which is the case in
//                                                       the StackBlitz preview)
//       https_<preview host>_0.indexeddb.blob        <- values Chrome wrapped as blobs (large ones)
//   %LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Storage\leveldb   <- every origin's
//                                                       localStorage in one DB (index mirrors and
//                                                       smaller records live here too)
// The preview host looks like bobassetbuilder-hzer--3000--<8 hex>.local-credentialless.webcontainer.io
// and the hex changes with every container. The directory's mtime says which one was in use last.
// An origin can appear more than once; the one holding the data is not always the newest.
//
// FORMAT FACTS that took a while to establish, so they are written down:
//   * LevelDB .ldb tables: footer (last 48 bytes) -> index block -> data blocks; blocks are snappy
//     (type 1) or raw (type 0); entries are prefix-compressed with a restart array at the end.
//     Keys are internal keys: user key + 8 bytes (seq << 8 | type), type 1 = value, 0 = delete.
//   * The .log write-ahead file holds the newest writes: 32 KB blocks of (crc, len, type) records,
//     FULL/FIRST/MIDDLE/LAST fragments, each batch = 8-byte seq + 4-byte count + entries.
//   * Highest seq wins per user key across every file; a delete entry means gone.
//   * IndexedDB values: an optional record-version varint, then an IDB wrapper —
//       ff 11 02  = the value is snappy-compressed (Chrome's IndexedDBCompressValuesWithSnappy)
//       ff 11 01  = the value lives in the .blob directory; the varint after it is the blob size,
//                   and the file under .blob/<db>/<xx>/<yy> with exactly that size is the one
//     — then a Blink envelope (ff <ver>, then fe + 12 bytes of trailer offsets), then V8:
//       ff <ver> [00 padding] then 22 = Latin-1 string, 63 = UTF-16LE string, 53 = UTF-8 string,
//       followed by a varint BYTE length and the bytes.
//   * localStorage values: first byte 00 = UTF-16LE, 01 = Latin-1. Keys are
//     "_" + origin + "\0\1" + name.
//   * Chrome IDB string keys are type byte 01 + varint char count + UTF-16BE; decodeIDBKey below
//     is a best-effort scan for that, enough to tell asset: from level: from stamp:.
"use strict";
const fs = require("fs");
const path = require("path");

// ---------- snappy (pure JS, no dependency) ----------
function snappyUncompress(buf) {
  let pos = 0, len = 0, shift = 0;
  for (;;) { const b = buf[pos++]; len |= (b & 0x7f) << shift; if (!(b & 0x80)) break; shift += 7; }
  const out = Buffer.alloc(len);
  let op = 0;
  while (pos < buf.length) {
    const tag = buf[pos++], t = tag & 3;
    if (t === 0) {
      let l = tag >> 2;
      if (l >= 60) { const n = l - 59; l = 0; for (let i = 0; i < n; i++) l |= buf[pos + i] << (8 * i); pos += n; }
      l += 1; buf.copy(out, op, pos, pos + l); pos += l; op += l;
    } else {
      let l, off;
      if (t === 1) { l = ((tag >> 2) & 7) + 4; off = ((tag >> 5) << 8) | buf[pos]; pos += 1; }
      else if (t === 2) { l = (tag >> 2) + 1; off = buf[pos] | (buf[pos + 1] << 8); pos += 2; }
      else { l = (tag >> 2) + 1; off = (buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16) | (buf[pos + 3] << 24)) >>> 0; pos += 4; }
      let src = op - off; for (let i = 0; i < l; i++) out[op++] = out[src++];
    }
  }
  return out.subarray(0, op);
}
function readVarint(buf, pos) {
  let v = 0, shift = 0, p = pos;
  for (;;) { if (p >= buf.length) throw new Error("varint overrun"); const b = buf[p++]; v += (b & 0x7f) * Math.pow(2, shift); if (!(b & 0x80)) break; shift += 7; }
  return [v, p];
}

// ---------- SSTable (.ldb) ----------
function readBlock(file, offset, size) {
  const raw = file.subarray(offset, offset + size), type = file[offset + size];
  if (type === 1) return snappyUncompress(raw);
  if (type === 0) return raw;
  throw new Error("unknown block compression type " + type);
}
function* blockEntries(block) {
  const numRestarts = block.readUInt32LE(block.length - 4);
  const end = block.length - 4 - numRestarts * 4;
  let pos = 0, key = Buffer.alloc(0);
  while (pos < end) {
    let shared, nonShared, valLen;
    [shared, pos] = readVarint(block, pos); [nonShared, pos] = readVarint(block, pos); [valLen, pos] = readVarint(block, pos);
    key = Buffer.concat([key.subarray(0, shared), block.subarray(pos, pos + nonShared)]); pos += nonShared;
    const value = block.subarray(pos, pos + valLen); pos += valLen;
    yield { key, value };
  }
}
function readSSTable(file, sink) {
  const footer = file.subarray(file.length - 48);
  if (footer.subarray(40, 48).toString("hex") !== "57fb808b247547db") throw new Error("bad sstable magic");
  let p = 0, mOff, mSize, iOff, iSize;
  [mOff, p] = readVarint(footer, p); [mSize, p] = readVarint(footer, p); [iOff, p] = readVarint(footer, p); [iSize, p] = readVarint(footer, p);
  for (const e of blockEntries(readBlock(file, iOff, iSize))) {
    let q = 0, bOff, bSize;
    [bOff, q] = readVarint(e.value, q); [bSize, q] = readVarint(e.value, q);
    for (const d of blockEntries(readBlock(file, bOff, bSize))) {
      const ik = d.key; if (ik.length < 8) continue;
      const trailer = ik.readBigUInt64LE(ik.length - 8);
      sink(ik.subarray(0, ik.length - 8), Number(trailer >> 8n), Number(trailer & 0xffn), d.value);
    }
  }
}

// ---------- write-ahead log (.log) ----------
function readLog(file, sink) {
  const BLOCK = 32768;
  let pos = 0, frag = [];
  while (pos + 7 <= file.length) {
    const blockRemain = BLOCK - (pos % BLOCK);
    if (blockRemain < 7) { pos += blockRemain; continue; }
    const len = file.readUInt16LE(pos + 4), type = file[pos + 6];
    const payload = file.subarray(pos + 7, pos + 7 + len); pos += 7 + len;
    if (type === 0 && len === 0) continue;
    if (type === 1) { handleBatch(payload, sink); frag = []; }
    else if (type === 2) frag = [payload];
    else if (type === 3) frag.push(payload);
    else if (type === 4) { frag.push(payload); handleBatch(Buffer.concat(frag), sink); frag = []; }
    else break;
  }
}
function handleBatch(b, sink) {
  if (b.length < 12) return;
  const seq = Number(b.readBigUInt64LE(0)), count = b.readUInt32LE(8);
  let pos = 12;
  for (let i = 0; i < count; i++) {
    const type = b[pos++]; let klen, vlen;
    [klen, pos] = readVarint(b, pos); const key = b.subarray(pos, pos + klen); pos += klen;
    let value = Buffer.alloc(0);
    if (type === 1) { [vlen, pos] = readVarint(b, pos); value = b.subarray(pos, pos + vlen); pos += vlen; }
    sink(key, seq + i, type, value);
  }
}

// ---------- latest value per key across every file ----------
function readDir(dir) {
  const latest = new Map();
  const sink = (key, seq, type, value) => { const h = key.toString("hex"); const cur = latest.get(h); if (!cur || seq > cur.seq) latest.set(h, { key, seq, type, value }); };
  const files = fs.readdirSync(dir);
  for (const f of files.filter((x) => x.endsWith(".ldb")).sort()) { try { readSSTable(fs.readFileSync(path.join(dir, f)), sink); } catch (e) { console.error("sstable " + f + ": " + e.message); } }
  for (const f of files.filter((x) => x.endsWith(".log")).sort()) { try { readLog(fs.readFileSync(path.join(dir, f)), sink); } catch (e) { console.error("log " + f + ": " + e.message); } }
  return [...latest.values()].filter((e) => e.type === 1);
}

// ---------- IndexedDB value / key decoding ----------
function decodeV8String(buf) {
  const lim = Math.min(buf.length - 2, 64);
  for (let i = 0; i < lim; i++) {
    if (buf[i] !== 0xff) continue;
    let p = i + 2; if (buf[p] === 0x00) p++;
    const tag = buf[p];
    if (tag !== 0x22 && tag !== 0x63 && tag !== 0x53) continue;
    let len, q; try { [len, q] = readVarint(buf, p + 1); } catch { continue; }
    if (len < 0 || q + len > buf.length + 2) continue;
    const bytes = buf.subarray(q, q + len);
    return tag === 0x63 ? bytes.toString("utf16le") : tag === 0x22 ? bytes.toString("latin1") : bytes.toString("utf8");
  }
  return null;
}
function findBlobBySize(blobDir, size) {
  if (!blobDir || !fs.existsSync(blobDir)) return null;
  const stack = [blobDir];
  while (stack.length) {
    const d = stack.pop();
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name), st = fs.statSync(full);
      if (st.isDirectory()) stack.push(full); else if (st.size === size) return full;
    }
  }
  return null;
}
function unwrapIDB(value, blobDir) {
  let start = -1;
  for (let i = 0; i < Math.min(12, value.length - 1); i++) if (value[i] === 0xff && value[i + 1] === 0x11) { start = i; break; }
  if (start >= 0 && value[start + 2] === 0x02) { try { return { buf: snappyUncompress(value.subarray(start + 3)), wrapped: "snappy" }; } catch (e) { return { err: "snappy: " + e.message }; } }
  if (start >= 0 && value[start + 2] === 0x01) {
    const [size] = readVarint(value, start + 3);
    const file = findBlobBySize(blobDir, size);
    if (!file) return { err: "blob of " + size + " bytes not found under " + blobDir, blobSize: size };
    const inner = unwrapIDB(fs.readFileSync(file), null);
    return { ...inner, wrapped: "blob:" + path.basename(file), blobSize: size };
  }
  return { buf: value, wrapped: "none" };
}
function decodeIDBKey(key) {
  let found = null;
  for (let i = 0; i < key.length; i++) {
    if (key[i] !== 0x01 || i + 1 >= key.length) continue;
    let len, p; try { [len, p] = readVarint(key, i + 1); } catch { continue; }
    if (len > 0 && p + len * 2 <= key.length) {
      const chars = []; for (let j = 0; j < len; j++) chars.push(String.fromCharCode((key[p + 2 * j] << 8) | key[p + 2 * j + 1]));
      const s = chars.join(""); if (/^[\x20-\x7e]+$/.test(s)) { found = s; i = p + len * 2 - 1; }
    }
  }
  return found;
}

// ---------- main ----------
const [,, mode, dir, blobDir] = process.argv;
if (!mode || !dir) { console.error("usage: node tools/read-chrome-leveldb.js idb <leveldb dir> [blob dir] | ls <Local Storage leveldb dir>"); process.exit(2); }
const entries = readDir(dir);
const out = [];
if (mode === "idb") {
  for (const e of entries) {
    const u = unwrapIDB(e.value, blobDir);
    if (u.err) { out.push({ key: decodeIDBKey(e.key), seq: e.seq, err: u.err, blobSize: u.blobSize }); continue; }
    const str = decodeV8String(u.buf); if (str === null) continue;
    out.push({ key: decodeIDBKey(e.key), seq: e.seq, wrapped: u.wrapped, len: str.length, value: str });
  }
} else {
  for (const e of entries) {
    const k = e.key; if (k[0] !== 0x5f) continue;
    const nul = k.indexOf(0); if (nul < 0 || k[nul + 1] !== 1) continue;
    const v = e.value;
    out.push({ origin: k.subarray(1, nul).toString("latin1"), key: k.subarray(nul + 2).toString("latin1"), seq: e.seq, value: v[0] === 0 ? v.subarray(1).toString("utf16le") : v.subarray(1).toString("latin1") });
  }
}
const target = path.join(path.dirname(path.resolve(dir)), path.basename(dir) + ".records.json");
fs.writeFileSync(target, JSON.stringify(out));
const summary = {};
for (const r of out) { const k = (r.origin ? r.origin + " :: " : "") + String(r.key || "?").replace(/:.*/, ":*"); summary[k] = (summary[k] || 0) + 1; }
console.log(JSON.stringify({ entries: entries.length, decoded: out.length, wrote: target, summary }, null, 1));
