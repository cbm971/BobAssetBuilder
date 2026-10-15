/* ── SYMBOLS IN PLACE OF EMOJI (2026-10-14) ──────────────────────────────────────────────────────
   Blake: "there needs to be a symbol selector for everything we currently use an emoji for. We
   will be changing all of that to symbols of some kind" — and, mid-build, "I hate emojis".

   THE GAME'S, like audio.js: no React, no storage. The studio hands it the picks; the game's own
   front end will use it as it is.

   HOW. The studio and the play view carry ~170 different emoji in about a thousand places — button
   labels, <option>s, flash text, registry icons. Rewriting each string into an <svg> element is a
   thousand edits, and an <option> cannot hold an element at all. So the emoji are left in the text
   and the FONT changes instead: buildSymbolFont writes a small TrueType font in the browser whose
   only characters are the emoji in SYMBOL_SLOTS, each drawn as the symbol picked for it, and the
   stylesheets list that font FIRST. Every emoji that has a slot then draws as its symbol, in the
   text's own colour, in a label, a dropdown or a toast alike; every other character falls through
   to the next font in the list untouched.

   THE COLOUR TABLE IS LOAD-BEARING. Chrome sends any character carrying the emoji variation
   selector (U+FE0F, as in "⚔️", "❤️", "🗡️") to a COLOUR font even when the first font in the list
   has the glyph — measured 2026-10-14 on Chrome 152: plain 💾 and ⚠ took the plain font's glyph,
   while ⚔️ / ❤️ / 🗡️ stayed colour emoji. A COLRv0 table that paints each glyph as a single layer in
   palette index 0xFFFF ("the text colour") makes this a colour font in Chrome's eyes, and every one
   of them then draws from it. Do not drop addColrLayers to save bytes.

   THE PLAY EFFECTS ARE SLOTS TOO, and were the point (Blake, 2026-10-14, after a first pass that
   left them as emoji: "we are talking about explosions and stuff"). The explosion and impact puff,
   the fire cell, an emoji shot, the stunned / knocked-down marks and the talk bubble draw their
   fx.* slot — a symbol in the slot's colour, or a prop he picked — wherever the game used its
   built-in emoji. An emoji HE chose for one asset (an emoji piece, a weapon's own blast / landing /
   shot emoji, a level's emoji object, the drawing emoji picker) is his art and keeps the colour
   emoji font, ART_EMOJI_FONT.

   THE SYMBOLS. Two sets, both filled outlines, rewritten by tools/build-symbols.js into one
   dialect (1000-unit box, integer relative m/l/c/z), which is also valid SVG path data as it
   stands: game-icons.net (prefix gi:, CC BY 3.0 — the credits must name it) and Material Design
   Icons (mdi:, Apache 2.0). symbolArt.json carries only the defaults, so start-up never fetches
   the 6 MB library; the Symbols screen fetches public/symbols/library.json when it opens.

   A SLOT is one entry of symbolSlots.json: { k, l, g, d } — the key (an emoji, or a named slot
   like "stat.str" that the HUD draws as an <svg>), its label, its group on the Symbols screen,
   and its default icon id. A test fails when App.js or audio.js uses an emoji that has no slot, so
   a new emoji cannot slip into the interface undrawn. */
import SYMBOL_SLOTS_RAW from "./symbolSlots.json";
import SYMBOL_ART from "./symbolArt.json";

export const SYMBOL_SLOTS = SYMBOL_SLOTS_RAW;
export const SYMBOL_DEFAULT_ART = SYMBOL_ART;
export const SYMBOL_FONT_FAMILY = "BobSymbols";
export const SYMBOL_BOX = 1000;
export const SYMBOL_LIBRARY_PATH = "/symbols/library.json";
// The colour emoji fonts, for art that IS an emoji (see ART IS NOT UI above).
export const ART_EMOJI_FONT = "'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji','Segoe UI Symbol',sans-serif";

// THE BOARD — one record holding every pick, beside the sound board in the sounds kind (the same
// "game-wide settings ride a board record" idea as SOUND_BOARD_ID), so it saves, syncs, exports and
// restores through the five wires that kind already has. `picks` holds only what differs from the
// default: { [slot key]: icon id }.
export const SYMBOL_BOARD_ID = "symbolboard";
export const newSymbolBoard = () => ({ id: SYMBOL_BOARD_ID, type: "symbolBoard", name: "Symbols", picks: {} });
export const isSymbolBoard = (r) => !!r && r.id === SYMBOL_BOARD_ID;

const SLOT_BY_KEY = new Map(SYMBOL_SLOTS.map((s) => [s.k, s]));
export const symbolSlot = (key) => SLOT_BY_KEY.get(key) || null;
export const isEmojiSlot = (key) => !!key && !/^[a-z]+\./.test(key);
// The icon a slot draws right now: the board's pick, else the slot's default.
export const symbolPick = (board, key) => {
  const p = board && board.picks && board.picks[key];
  if (typeof p === "string" && p) return p;
  const s = SLOT_BY_KEY.get(key);
  return s ? s.d : "";
};
// A PROP AS A PICK (Blake, 2026-10-14: "I wanted a selector I can insert props into"). A drawn
// slot (anything that is not an emoji — the play effects fx.*, the HUD's stat.* and hud.*) can be
// one of his own Object/Prop assets instead of a symbol: the pick is "prop:<asset id>" and the
// studio draws that prop's art in the slot's square (its sym/fxArt). An emoji slot is drawn by
// the FONT, which can only hold outlines, so it takes symbols only; a prop pick there (or a prop
// that has since been deleted) falls back to the slot's default symbol.
export const PROP_PICK = "prop:";
export const isPropPick = (id) => typeof id === "string" && id.startsWith(PROP_PICK);
export const propPickId = (id) => (isPropPick(id) ? id.slice(PROP_PICK.length) : "");
// The colour a drawn slot's symbol is painted (a prop draws in its own colours): the board's
// choice, else the slot's own (`c` in symbolSlots.json), else the text colour (null).
export const symbolColor = (board, key) => {
  const c = board && board.colors && board.colors[key];
  if (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)) return c;
  const s = SLOT_BY_KEY.get(key);
  return (s && s.c) || null;
};
// Every icon id the board needs drawn that is not in the shipped defaults — the ones that make the
// app fetch the library at start-up. A prop pick is drawn from the library of ASSETS, not this.
export const symbolPicksNeedingLibrary = (board) => {
  const out = [];
  for (const s of SYMBOL_SLOTS) { const id = symbolPick(board, s.k); if (id && !isPropPick(id) && !SYMBOL_ART[id]) out.push(id); }
  return [...new Set(out)];
};
// The emoji a piece of text uses, in the slot sense: the base character of each emoji cluster
// (U+FE0F and ZWJ joins stripped). The test that keeps symbolSlots.json complete uses this.
export const emojiKeysIn = (text) => {
  const out = new Set();
  for (const m of String(text || "").matchAll(/\p{Extended_Pictographic}/gu)) out.add(m[0]);
  return out;
};

/* ── The compact path dialect → absolute commands (y down, SYMBOL_BOX units) ── */
export const symbolPathCmds = (d) => {
  const toks = String(d || "").match(/[mlcz]|-?\d+/g) || [];
  const out = [];
  let i = 0, x = 0, y = 0, sx = 0, sy = 0, cmd = "";
  const n = () => +toks[i++];
  const isNum = () => i < toks.length && !/^[mlcz]$/.test(toks[i]);
  while (i < toks.length) {
    if (/^[mlcz]$/.test(toks[i])) cmd = toks[i++];
    if (cmd === "z") { out.push({ type: "Z" }); x = sx; y = sy; cmd = ""; continue; }
    if (!isNum()) { i++; continue; }
    if (cmd === "m") { x += n(); y += n(); sx = x; sy = y; out.push({ type: "M", x, y }); cmd = "l"; }
    else if (cmd === "l") { x += n(); y += n(); out.push({ type: "L", x, y }); }
    else if (cmd === "c") { const a = x + n(), b = y + n(), c = x + n(), e = y + n(); x += n(); y += n(); out.push({ type: "C", x1: a, y1: b, x2: c, y2: e, x, y }); }
    else i++;
  }
  return out;
};

/* ── A TrueType font from { codepoint → path } ─────────────────────────────────────────────────
   Hand-written rather than a font library: the app needs exactly one kind of font (outlines only,
   no hinting, no kerning) and a dependency would have to install cleanly on StackBlitz, the desktop
   copy and Pages for ~10 tables' worth of bytes. Every table is the minimum the browser's font
   sanitiser accepts; FontFace.load() rejects anything else, and loadSymbolFont reports that. */
const UPM = 1000;
const ASC = 880, DESC = -200;            // within the UI face's own, so a symbol never makes its line taller
const GLYPH_TOP = 850;                   // where the 1000-unit icon box's top sits above the baseline
const SIDE = 60;                         // each side bearing; advance = box + 2 sides
const ADV = SYMBOL_BOX + SIDE * 2;
const CUBIC_TOL = 2;                     // font units a quadratic may stray from the cubic it stands in for

// Cubic (font units, y up) → quadratic pieces [ [qx,qy,ex,ey], … ], split evenly until each piece's
// error estimate is under CUBIC_TOL.
const cubicToQuads = (x0, y0, x1, y1, x2, y2, x3, y3) => {
  const ex = x3 - 3 * x2 + 3 * x1 - x0, ey = y3 - 3 * y2 + 3 * y1 - y0;
  const err = Math.sqrt(3) / 36 * Math.hypot(ex, ey);
  const n = Math.max(1, Math.min(16, Math.ceil(Math.cbrt(err / CUBIC_TOL))));
  const pt = (t) => { const u = 1 - t; return [u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]; };
  const dv = (t) => { const u = 1 - t; return [3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2), 3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2)]; };
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = k / n, b = (k + 1) / n, h = (b - a) / 3;
    const [ax, ay] = pt(a), [bx, by] = pt(b), [dax, day] = dv(a), [dbx, dby] = dv(b);
    // The sub-cubic's own control points, then the one quadratic control that best stands for both.
    const c1x = ax + dax * h, c1y = ay + day * h, c2x = bx - dbx * h, c2y = by - dby * h;
    out.push([(3 * (c1x + c2x) - ax - bx) / 4, (3 * (c1y + c2y) - ay - by) / 4, bx, by]);
  }
  return out;
};

// One icon → TrueType contours [[{x,y,on}]], in font units (y up).
export const symbolContours = (d) => {
  const S = 1, X = (v) => Math.round(SIDE + v * S), Y = (v) => Math.round(GLYPH_TOP - v * S);
  const contours = [];
  let cur = null, px = 0, py = 0;
  const close = () => {
    if (!cur) return;
    // A closing point on top of the start is the start again; TrueType closes contours itself.
    while (cur.length > 1 && cur[cur.length - 1].on && cur[cur.length - 1].x === cur[0].x && cur[cur.length - 1].y === cur[0].y) cur.pop();
    if (cur.length >= 3) contours.push(cur);
    cur = null;
  };
  const push = (x, y, on) => { const l = cur[cur.length - 1]; if (on && l && l.on && l.x === x && l.y === y) return; cur.push({ x, y, on }); };
  for (const c of symbolPathCmds(d)) {
    if (c.type === "M") { close(); cur = []; px = c.x; py = c.y; push(X(px), Y(py), true); }
    else if (c.type === "L") { if (!cur) cur = [{ x: X(px), y: Y(py), on: true }]; px = c.x; py = c.y; push(X(px), Y(py), true); }
    else if (c.type === "C") {
      if (!cur) cur = [{ x: X(px), y: Y(py), on: true }];
      for (const [qx, qy, ex, ey] of cubicToQuads(X(px), Y(py), SIDE + c.x1, GLYPH_TOP - c.y1, SIDE + c.x2, GLYPH_TOP - c.y2, X(c.x), Y(c.y))) {
        push(Math.round(qx), Math.round(qy), false);
        push(Math.round(ex), Math.round(ey), true);
      }
      px = c.x; py = c.y;
    } else close();
  }
  close();
  return contours;
};

// Big-endian byte writer.
const bytes = () => {
  const a = [];
  const w = {
    u8: (v) => { a.push(v & 255); return w; },
    u16: (v) => { a.push((v >> 8) & 255, v & 255); return w; },
    i16: (v) => w.u16(v < 0 ? v + 65536 : v),
    u32: (v) => { a.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); return w; },
    tag: (s) => { for (let i = 0; i < 4; i++) a.push(s.charCodeAt(i)); return w; },
    raw: (arr) => { for (const v of arr) a.push(v); return w; },
    pad4: () => { while (a.length % 4) a.push(0); return w; },
    get length() { return a.length; },
    out: () => Uint8Array.from(a),
  };
  return w;
};

const glyphBytes = (contours) => {
  if (!contours.length) return new Uint8Array(0);
  const pts = contours.flat();
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  for (const p of pts) { if (p.x < xMin) xMin = p.x; if (p.x > xMax) xMax = p.x; if (p.y < yMin) yMin = p.y; if (p.y > yMax) yMax = p.y; }
  const w = bytes();
  w.i16(contours.length).i16(xMin).i16(yMin).i16(xMax).i16(yMax);
  let end = -1;
  for (const c of contours) { end += c.length; w.u16(end); }
  w.u16(0); // no instructions
  // Flags, then x deltas, then y deltas — each delta as a byte when it fits (X/Y_SHORT_VECTOR,
  // sign in the SAME_OR_POSITIVE bit), as nothing when it is zero, else as an int16.
  const flags = [], xs = bytes(), ys = bytes();
  let lx = 0, ly = 0;
  for (const p of pts) {
    let f = p.on ? 1 : 0;
    const dx = p.x - lx, dy = p.y - ly; lx = p.x; ly = p.y;
    if (dx === 0) f |= 0x10; else if (Math.abs(dx) < 256) { f |= 0x02 | (dx > 0 ? 0x10 : 0); xs.u8(Math.abs(dx)); } else xs.i16(dx);
    if (dy === 0) f |= 0x20; else if (Math.abs(dy) < 256) { f |= 0x04 | (dy > 0 ? 0x20 : 0); ys.u8(Math.abs(dy)); } else ys.i16(dy);
    flags.push(f);
  }
  w.raw(flags).raw(xs.out()).raw(ys.out());
  return { data: w.out(), xMin, yMin, xMax, yMax, points: pts.length, contours: contours.length };
};

const checksum = (u8) => {
  let s = 0;
  const n = (u8.length + 3) & ~3;
  for (let i = 0; i < n; i += 4) s = (s + (((u8[i] || 0) << 24) | ((u8[i + 1] || 0) << 16) | ((u8[i + 2] || 0) << 8) | (u8[i + 3] || 0))) >>> 0;
  return s;
};

const sfnt = (tables) => {
  const tags = Object.keys(tables).sort();
  const n = tags.length;
  let es = 0; while ((1 << (es + 1)) <= n) es++;
  const w = bytes();
  w.u32(0x00010000).u16(n).u16((1 << es) * 16).u16(es).u16(n * 16 - (1 << es) * 16);
  let off = 12 + n * 16;
  const placed = tags.map((t) => { const d = tables[t]; const rec = { t, d, off }; off += (d.length + 3) & ~3; return rec; });
  for (const r of placed) w.tag(r.t).u32(checksum(r.d)).u32(r.off).u32(r.d.length);
  for (const r of placed) { w.raw(r.d); w.pad4(); }
  const out = w.out();
  const head = placed.find((r) => r.t === "head");
  if (head) {
    const adj = (0xB1B0AFBA - checksum(out)) >>> 0;
    out[head.off + 8] = adj >>> 24; out[head.off + 9] = (adj >>> 16) & 255; out[head.off + 10] = (adj >>> 8) & 255; out[head.off + 11] = adj & 255;
  }
  return out;
};

const utf16be = (s) => { const a = []; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a.push(c >> 8, c & 255); } return a; };

// glyphsIn: [{ cp, d }]. Returns the font's bytes (a Uint8Array).
export const buildSymbolFont = (glyphsIn) => {
  const list = [...new Map((glyphsIn || []).filter((g) => g && Number.isFinite(g.cp) && g.cp > 32).map((g) => [g.cp, g])).values()].sort((a, b) => a.cp - b.cp);
  // gid 0 .notdef (empty), then one glyph per character, then one empty zero-width glyph for the
  // variation selector and the zero-width joiner, so a "⚔️" cluster never sends its second half to
  // another font.
  const glyphs = [{ g: { data: new Uint8Array(0) }, adv: ADV }];
  const cmap = [];
  for (const it of list) {
    const g = glyphBytes(symbolContours(it.d));
    cmap.push([it.cp, glyphs.length]);
    glyphs.push({ g: g.data ? g : { data: new Uint8Array(0) }, adv: ADV });
  }
  const zw = glyphs.length;
  glyphs.push({ g: { data: new Uint8Array(0) }, adv: 0 });
  cmap.push([0xFE0F, zw], [0x200D, zw]);
  cmap.sort((a, b) => a[0] - b[0]);

  // glyf + loca (long offsets)
  const glyf = bytes(), loca = bytes();
  let xMin = 0, yMin = 0, xMax = 0, yMax = 0, maxPoints = 0, maxContours = 0;
  for (const { g } of glyphs) {
    loca.u32(glyf.length);
    glyf.raw(g.data); glyf.pad4();
    if (g.points) { xMin = Math.min(xMin, g.xMin); yMin = Math.min(yMin, g.yMin); xMax = Math.max(xMax, g.xMax); yMax = Math.max(yMax, g.yMax); maxPoints = Math.max(maxPoints, g.points); maxContours = Math.max(maxContours, g.contours); }
  }
  loca.u32(glyf.length);
  const numGlyphs = glyphs.length;

  const head = bytes().u32(0x00010000).u32(0x00010000).u32(0).u32(0x5F0F3CF5).u16(0x000B).u16(UPM)
    .u32(0).u32(0).u32(0).u32(0).i16(xMin).i16(yMin).i16(xMax).i16(yMax).u16(0).u16(8).i16(2).i16(1).i16(0);
  const hhea = bytes().u32(0x00010000).i16(ASC).i16(DESC).i16(0).u16(ADV).i16(0).i16(0).i16(xMax)
    .i16(1).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0).u16(numGlyphs);
  const maxp = bytes().u32(0x00010000).u16(numGlyphs).u16(maxPoints).u16(maxContours).u16(0).u16(0).u16(2)
    .u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0);
  const hmtx = bytes();
  for (const { g, adv } of glyphs) hmtx.u16(adv).i16(g.points ? g.xMin : 0);
  const firstCp = cmap.length ? Math.min(cmap[0][0], 0xFFFF) : 0, lastCp = cmap.length ? Math.min(cmap[cmap.length - 1][0], 0xFFFF) : 0;
  const os2 = bytes().u16(4).i16(ADV).u16(400).u16(5).u16(0)
    .i16(650).i16(600).i16(0).i16(75).i16(650).i16(600).i16(0).i16(350).i16(50).i16(260)
    .i16(0).raw([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).u32(0).u32(0).u32(0).u32(0).tag("BOB ")
    .u16(0x40).u16(firstCp).u16(lastCp).i16(ASC).i16(DESC).i16(0).u16(ASC).u16(-DESC).u32(1).u32(0)
    .i16(500).i16(700).u16(0).u16(32).u16(0);
  // cmap: (3,1) format 4 for the BMP characters, (3,10) format 12 for all of them.
  const bmp = cmap.filter(([c]) => c <= 0xFFFF);
  const segs = [...bmp.map(([c, gid]) => ({ s: c, e: c, d: (gid - c + 65536) % 65536 })), { s: 0xFFFF, e: 0xFFFF, d: 1 }];
  const segX2 = segs.length * 2;
  let sr = 1, esel = 0; while (sr * 2 <= segs.length) { sr *= 2; esel++; }
  const f4 = bytes();
  f4.u16(4).u16(16 + segs.length * 8).u16(0).u16(segX2).u16(sr * 2).u16(esel).u16(segX2 - sr * 2);
  for (const s of segs) f4.u16(s.e);
  f4.u16(0);
  for (const s of segs) f4.u16(s.s);
  for (const s of segs) f4.u16(s.d);
  for (let k = 0; k < segs.length; k++) f4.u16(0);
  const f12 = bytes().u16(12).u16(0).u32(16 + cmap.length * 12).u32(0).u32(cmap.length);
  for (const [c, gid] of cmap) f12.u32(c).u32(c).u32(gid);
  const f4b = f4.out(), f12b = f12.out();
  const cmapT = bytes().u16(0).u16(2).u16(3).u16(1).u32(4 + 16).u16(3).u16(10).u32(4 + 16 + f4b.length).raw(f4b).raw(f12b);
  // name
  const names = [[1, "BobSymbols"], [2, "Regular"], [3, "BobSymbols-Regular"], [4, "BobSymbols"], [5, "Version 1.0"], [6, "BobSymbols-Regular"]];
  const strs = names.map(([, s]) => utf16be(s));
  const nameT = bytes().u16(0).u16(names.length).u16(6 + names.length * 12);
  let so = 0;
  names.forEach(([id], k) => { nameT.u16(3).u16(1).u16(0x409).u16(id).u16(strs[k].length).u16(so); so += strs[k].length; });
  for (const s of strs) nameT.raw(s);
  const post = bytes().u32(0x00030000).u32(0).i16(-100).i16(50).u32(0).u32(0).u32(0).u32(0).u32(0);
  // COLR v0 + CPAL: every drawn glyph is its own single layer, painted in the text colour.
  const drawn = cmap.filter(([, gid]) => gid !== zw).map(([, gid]) => gid).sort((a, b) => a - b);
  const colr = bytes().u16(0).u16(drawn.length).u32(14).u32(14 + drawn.length * 6).u16(drawn.length);
  drawn.forEach((gid, k) => colr.u16(gid).u16(k).u16(1));
  drawn.forEach((gid) => colr.u16(gid).u16(0xFFFF));
  const cpal = bytes().u16(0).u16(1).u16(1).u16(1).u32(14).u16(0).u8(0).u8(0).u8(0).u8(255);
  return sfnt({
    "OS/2": os2.out(), COLR: colr.out(), CPAL: cpal.out(), cmap: cmapT.out(), glyf: glyf.out(), head: head.out(),
    hhea: hhea.out(), hmtx: hmtx.out(), loca: loca.out(), maxp: maxp.out(), name: nameT.out(), post: post.out(),
  });
};

// The font for a board: every EMOJI slot drawn as its pick. `art` maps icon id → path and must hold
// every pick (SYMBOL_DEFAULT_ART plus whatever the library supplied); a pick it lacks falls back to
// the slot's default rather than leaving the emoji undrawn.
export const symbolFontGlyphs = (board, art) => {
  const out = [];
  for (const s of SYMBOL_SLOTS) {
    if (!isEmojiSlot(s.k)) continue;
    const id = symbolPick(board, s.k);
    const d = (art && art[id]) || SYMBOL_ART[id] || SYMBOL_ART[s.d];
    if (d) out.push({ cp: s.k.codePointAt(0), d });
  }
  return out;
};
