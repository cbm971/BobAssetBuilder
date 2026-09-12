// Offline rasteriser for a Bob Okay piece list -> PNG, in plain Node with no dependencies.
//
// WHY THIS EXISTS: the only way to actually SEE an asset in a session where the Browser pane cannot
// screenshot is to draw it yourself and Read the PNG. This file had been rebuilt from a paragraph of
// notes in four separate sessions (trailers, dress shirt, cassock, the 1960s cars) before it was
// committed. Do not rebuild it again — extend it here.
//
// Reimplements the small, stable subset of App.js shapeStyle / shapeFillStyle / cutter rules:
//   * box x,y,w,h are canvas units on the 200x260 authoring canvas
//   * circle -> ellipse in the box; roundrect -> 22% elliptical corners; stadium -> r = min(w,h)/2
//   * poly -> p.points (fractions of the box); named kinds -> SHAPE_POINTS; rect -> whole box
//   * mirror:true -> the exact reflection of the (rotated) original about x=100
//   * rot -> about the box centre (pieceOriginFrac is [.5,.5] for anything not arm/leg flagged;
//     arm-flagged pieces pivot at the shoulder and are NOT handled here — this is a prop/flat-art tool)
//   * a cutter clears pixels of every EARLIER piece that is not noCut (cutterLayerSegments inverted)
//   * outline -> the same silhouette ~1.4 units bigger in outlineColor (default #000) under the fill
//   * fx.bright multiplies the colour; fx.opacity alpha-blends; text/emoji pieces are skipped
//
// Usage:
//   node tools/rasterize-pieces.js --asset <id> out.png [zoom=4] [bg=#6b7b3a] [cropX cropY cropW cropH]
//       draws frames[0].front (or angles.front) of that asset from asset-data/library.json
//   node tools/rasterize-pieces.js <pieces.json> out.png [zoom] [bg] [crop...]
//       draws a raw piece-list file
//   require("./tools/rasterize-pieces.js") gives { render, png, sheet, hit } for building contact
//   sheets (render several, then sheet(renders, gutter, bg)). Always render one of Blake's own
//   assets first as the control — if Trailer 1 does not come out as a trailer, distrust the rest.
const fs = require("fs"), zlib = require("zlib");
const W = 200, H = 260;
const semicirclePoints = (n) => { const pts = []; for (let i = 0; i <= n; i++) { const t = Math.PI * (1 - i / n); pts.push([+(0.5 + 0.5 * Math.cos(t)).toFixed(4), +(1 - Math.sin(t)).toFixed(4)]); } return pts; };
const SHAPE_POINTS = {
  tri: [[0.5, 0], [0, 1], [1, 1]],
  halfcircle: semicirclePoints(32),
  tri2: [[0, 0], [1, 1], [0, 1]],
  diamond: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]],
  pentagon: [[0.5, 0], [1, 0.38], [0.82, 1], [0.18, 1], [0, 0.38]],
  hexagon: [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]],
  star: [[0.5, 0], [0.61, 0.35], [0.98, 0.35], [0.68, 0.57], [0.79, 0.91], [0.5, 0.7], [0.21, 0.91], [0.32, 0.57], [0.02, 0.35], [0.39, 0.35]],
  trapezoid: [[0.2, 0], [0.8, 0], [1, 1], [0, 1]],
};
const hex = (s) => { s = String(s || "#000").trim(); if (s[0] === "#") s = s.slice(1); if (s.length === 3) s = s.split("").map((c) => c + c).join(""); const n = parseInt(s.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
// Is the point (px,py) (canvas units) inside piece p's UNROTATED local box shape? Local coords u,v in [0,1].
function insideLocal(p, u, v, grow) {
  const g = grow || 0; // expand the silhouette by g canvas units (for outlines)
  const w = p.w, h = p.h;
  if (g) { // remap into the grown box
    u = (u * w + g) / (w + 2 * g); v = (v * h + g) / (h + 2 * g);
    return insideLocal({ ...p, w: w + 2 * g, h: h + 2 * g }, u, v, 0);
  }
  if (u < 0 || u > 1 || v < 0 || v > 1) return false;
  if (p.kind === "circle") { const dx = u - 0.5, dy = v - 0.5; return dx * dx + dy * dy <= 0.25; }
  if (p.kind === "roundrect") { const rx = 0.22 * w, ry = 0.22 * h; return inRounded(u * w, v * h, w, h, rx, ry); }
  if (p.kind === "stadium") { const r = Math.min(w, h) / 2; return inRounded(u * w, v * h, w, h, r, r); }
  const pts = p.kind === "poly" && p.points ? p.points : SHAPE_POINTS[p.kind];
  if (!pts) return true; // rect and anything unknown
  return pointInPoly(u, v, pts);
}
function inRounded(x, y, w, h, rx, ry) {
  const cx = x < rx ? rx : x > w - rx ? w - rx : x;
  const cy = y < ry ? ry : y > h - ry ? h - ry : y;
  const dx = (x - cx) / rx, dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}
function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// Canvas point -> is it inside piece p (rotated about its centre, optionally mirrored)?
function hit(p, px, py, grow, mirrored) {
  if (mirrored) px = W - px; // a twin is the exact reflection of the rotated original about x=100
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  let lx = px - cx, ly = py - cy;
  const r = -(p.rot || 0) * Math.PI / 180;
  if (r) { const c = Math.cos(r), s = Math.sin(r); const nx = lx * c - ly * s, ny = lx * s + ly * c; lx = nx; ly = ny; }
  return insideLocal(p, lx / p.w + 0.5, ly / p.h + 0.5, grow);
}
function render(pieces, opts) {
  const zoom = opts.zoom || 4, bg = hex(opts.bg || "#6b7b3a");
  const crop = opts.crop || [0, 0, W, H];
  const ow = Math.round(crop[2] * zoom), oh = Math.round(crop[3] * zoom);
  const img = new Float32Array(ow * oh * 3);
  for (let i = 0; i < ow * oh; i++) { img[i * 3] = bg[0]; img[i * 3 + 1] = bg[1]; img[i * 3 + 2] = bg[2]; }
  // expand mirror twins in place (twin drawn right after its original, like the app)
  const list = [];
  pieces.forEach((p, idx) => { list.push({ p, idx, m: false }); if (p.mirror) list.push({ p, idx, m: true }); });
  const drawn = list.filter((e) => !e.p.isHitbox && !e.p.isMuzzle && !e.p.isCutter);
  const cutters = list.filter((e) => e.p.isCutter);
  for (const e of drawn) {
    const p = e.p;
    const cutBy = p.noCut ? [] : cutters.filter((c) => c.idx > e.idx);
    const fx = p.fx || {};
    const bright = fx.bright === undefined ? 1 : fx.bright, alpha = fx.opacity === undefined ? 1 : fx.opacity;
    const fill = hex(p.color).map((c) => Math.max(0, Math.min(255, c * bright)));
    const oc = p.outline ? hex(p.outlineColor || "#000") : null;
    // bounding box in output pixels (generous: the rotated box's diagonal)
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2, rad = Math.hypot(p.w, p.h) / 2 + 3;
    const bx0 = e.m ? W - cx - rad : cx - rad, bx1 = e.m ? W - cx + rad : cx + rad;
    const x0 = Math.max(0, Math.floor((bx0 - crop[0]) * zoom)), x1 = Math.min(ow - 1, Math.ceil((bx1 - crop[0]) * zoom));
    const y0 = Math.max(0, Math.floor((cy - rad - crop[1]) * zoom)), y1 = Math.min(oh - 1, Math.ceil((cy + rad - crop[1]) * zoom));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = crop[0] + (x + 0.5) / zoom, py = crop[1] + (y + 0.5) / zoom;
      let col = null;
      if (hit(p, px, py, 0, e.m)) col = fill;
      else if (oc && hit(p, px, py, 1.4, e.m)) col = oc;
      if (!col) continue;
      let cut = false;
      for (const c of cutBy) if (hit(c.p, px, py, 0, c.m)) { cut = true; break; }
      if (cut) continue;
      const i = (y * ow + x) * 3;
      img[i] = img[i] * (1 - alpha) + col[0] * alpha; img[i + 1] = img[i + 1] * (1 - alpha) + col[1] * alpha; img[i + 2] = img[i + 2] * (1 - alpha) + col[2] * alpha;
    }
  }
  return { w: ow, h: oh, img };
}
// --- PNG encoder -----------------------------------------------------------------------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png({ w, h, img }) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) raw[y * (w * 3 + 1) + 1 + x * 3 + k] = Math.round(img[(y * w + x) * 3 + k]); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
// Side-by-side sheet of several renders (same height), separated by a gutter.
function sheet(renders, gutter, bg) {
  const g = gutter || 8, b = hex(bg || "#222");
  const h = Math.max(...renders.map((r) => r.h)), w = renders.reduce((s, r) => s + r.w, 0) + g * (renders.length - 1);
  const img = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) { img[i * 3] = b[0]; img[i * 3 + 1] = b[1]; img[i * 3 + 2] = b[2]; }
  let ox = 0;
  for (const r of renders) { for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) for (let k = 0; k < 3; k++) img[((y) * w + ox + x) * 3 + k] = r.img[(y * r.w + x) * 3 + k]; ox += r.w + g; }
  return { w, h, img };
}
module.exports = { render, png, sheet, hit, SHAPE_POINTS };
if (require.main === module) {
  let argv = process.argv.slice(2), pieces;
  if (argv[0] === "--asset") {
    const lib = JSON.parse(fs.readFileSync(require("path").join(__dirname, "..", "asset-data", "library.json"), "utf8"));
    const a = lib.assets.find((x) => x.id === argv[1]);
    if (!a) { console.error("no asset with id " + argv[1]); process.exit(1); }
    pieces = (a.frames && a.frames[0] && a.frames[0].front) || (a.angles && a.angles.front) || [];
    argv = argv.slice(2);
  } else { pieces = JSON.parse(fs.readFileSync(argv[0], "utf8")); argv = argv.slice(1); }
  const [outFile, zoom, bg, cx, cy, cw, ch] = argv;
  const crop = cx !== undefined ? [+cx, +cy, +cw, +ch] : undefined;
  fs.writeFileSync(outFile, png(render(pieces, { zoom: +(zoom || 4), bg, crop })));
  console.log("wrote", outFile);
}
