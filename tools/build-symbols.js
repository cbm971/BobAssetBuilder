#!/usr/bin/env node
/* SYMBOLS — builds the two files the game's symbol system reads (see src/symbols.js).
 *
 *   node tools/build-symbols.js <game-icons icons.json> <mdi icons.json>
 *
 * The inputs are the `icons.json` of the npm packages @iconify-json/game-icons (4,000+ game
 * icons by Lorc, Delapouite and contributors, game-icons.net, CC BY 3.0) and @iconify-json/mdi
 * (Material Design Icons, Apache 2.0). Get them with `npm pack <name>` into a scratch folder and
 * untar; they are NOT dependencies of the app, because the app never needs them — only this
 * script's output:
 *
 *   public/symbols/library.json  every icon, for the Symbols screen's picker (fetched on demand)
 *   src/symbolArt.json           only the icons src/symbolSlots.json names as defaults, so the
 *                                font is built at start-up without fetching the big file
 *
 * Every path is rewritten into ONE tiny dialect: a 1000-unit box, integer coordinates, and only
 * relative m / l / c / z (quadratics raised to cubics, arcs split into cubics, H/V/S/T expanded).
 * Two icon sets drawn on a 512 and a 24 grid then look the same to everything downstream, and
 * the runtime parser (symbolPathCmds) is a dozen lines instead of a full SVG one. Deltas are taken
 * between ROUNDED absolute points, so rounding never accumulates along a long path.
 *
 * Re-run it after editing the defaults in src/symbolSlots.json; it fails on a default that names
 * an icon neither set has.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BOX = 1000;

// SVG path data → absolute { type: "M"|"L"|"C"|"Z" } commands. Arc flags are read one character at a
// time, because minified paths write "a5 5 0 015 5" with the two flags and the next number run together.
function svgPathCommands(d) {
  const s = String(d || "");
  let i = 0;
  const out = [];
  const skip = () => { while (i < s.length && /[\s,]/.test(s[i])) i++; };
  const isNumStart = () => { skip(); return i < s.length && /[-+.\d]/.test(s[i]); };
  const num = () => {
    skip();
    const m = /^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/.exec(s.slice(i));
    if (!m) throw new Error("bad number at " + i + " in " + s.slice(i, i + 20));
    i += m[0].length;
    return +m[0];
  };
  const flag = () => { skip(); const c = s[i++]; if (c !== "0" && c !== "1") throw new Error("bad arc flag"); return c === "1"; };
  let x = 0, y = 0, sx = 0, sy = 0, lcx = 0, lcy = 0, lqx = 0, lqy = 0, prev = "", cmd = "";
  const cubic = (x1, y1, x2, y2, ex, ey) => { out.push({ type: "C", x1, y1, x2, y2, x: ex, y: ey }); lcx = x2; lcy = y2; x = ex; y = ey; };
  const arc = (rx, ry, rot, large, sweep, ex, ey) => {
    if (!rx || !ry || (x === ex && y === ey)) { out.push({ type: "L", x: ex, y: ey }); x = ex; y = ey; return; }
    const phi = rot * Math.PI / 180, cs = Math.cos(phi), sn = Math.sin(phi);
    const dx = (x - ex) / 2, dy = (y - ey) / 2;
    const x1p = cs * dx + sn * dy, y1p = -sn * dx + cs * dy;
    rx = Math.abs(rx); ry = Math.abs(ry);
    const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lam > 1) { const k = Math.sqrt(lam); rx *= k; ry *= k; }
    const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    const co = Math.sqrt(Math.max(0, num2 / den)) * (large === sweep ? -1 : 1);
    const cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx;
    const cx = cs * cxp - sn * cyp + (x + ex) / 2, cy = sn * cxp + cs * cyp + (y + ey) / 2;
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!sweep && dt > 0) dt -= 2 * Math.PI; else if (sweep && dt < 0) dt += 2 * Math.PI;
    const segs = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9));
    const step = dt / segs, k = 4 / 3 * Math.tan(step / 4);
    const pt = (t) => [cx + rx * Math.cos(t) * cs - ry * Math.sin(t) * sn, cy + rx * Math.cos(t) * sn + ry * Math.sin(t) * cs];
    const dv = (t) => [-rx * Math.sin(t) * cs - ry * Math.cos(t) * sn, -rx * Math.sin(t) * sn + ry * Math.cos(t) * cs];
    for (let n = 0; n < segs; n++) {
      const a = t1 + n * step, b = a + step;
      const [ax, ay] = pt(a), [bx, by] = pt(b), [dax, day] = dv(a), [dbx, dby] = dv(b);
      const last = n === segs - 1;
      cubic(ax + k * dax, ay + k * day, bx - k * dbx, by - k * dby, last ? ex : bx, last ? ey : by);
    }
  };
  for (;;) {
    skip();
    if (i >= s.length) break;
    if (/[a-zA-Z]/.test(s[i])) cmd = s[i++];
    else if (!cmd) throw new Error("path does not start with a command");
    const rel = cmd !== cmd.toUpperCase(), C = cmd.toUpperCase();
    const ox = () => (rel ? x : 0), oy = () => (rel ? y : 0);
    if (C === "Z") { out.push({ type: "Z" }); x = sx; y = sy; prev = "Z"; continue; }
    if (!isNumStart()) throw new Error("command " + cmd + " without numbers");
    do {
      if (C === "M") { x = num() + ox(); y = num() + oy(); sx = x; sy = y; out.push({ type: "M", x, y }); prev = "M"; cmd = rel ? "l" : "L"; break; }
      if (C === "L") { const nx = num() + ox(), ny = num() + oy(); x = nx; y = ny; out.push({ type: "L", x, y }); }
      else if (C === "H") { x = num() + ox(); out.push({ type: "L", x, y }); }
      else if (C === "V") { y = num() + oy(); out.push({ type: "L", x, y }); }
      else if (C === "C") { const o1 = ox(), o2 = oy(); const a = num() + o1, b = num() + o2, c = num() + o1, e = num() + o2, f = num() + o1, g = num() + o2; cubic(a, b, c, e, f, g); }
      else if (C === "S") { const o1 = ox(), o2 = oy(); const r1 = /[CS]/.test(prev) ? 2 * x - lcx : x, r2 = /[CS]/.test(prev) ? 2 * y - lcy : y; const c = num() + o1, e = num() + o2, f = num() + o1, g = num() + o2; cubic(r1, r2, c, e, f, g); }
      else if (C === "Q" || C === "T") {
        const o1 = ox(), o2 = oy();
        let qx, qy;
        if (C === "Q") { qx = num() + o1; qy = num() + o2; } else { qx = /[QT]/.test(prev) ? 2 * x - lqx : x; qy = /[QT]/.test(prev) ? 2 * y - lqy : y; }
        const ex = num() + o1, ey = num() + o2;
        const x0 = x, y0 = y;
        cubic(x0 + 2 / 3 * (qx - x0), y0 + 2 / 3 * (qy - y0), ex + 2 / 3 * (qx - ex), ey + 2 / 3 * (qy - ey), ex, ey);
        lqx = qx; lqy = qy;
      } else if (C === "A") { const o1 = ox(), o2 = oy(); const rx = num(), ry = num(), rot = num(), la = flag(), sw = flag(); const ex = num() + o1, ey = num() + o2; arc(rx, ry, rot, la, sw, ex, ey); }
      else throw new Error("unknown command " + cmd);
      prev = C;
    } while (isNumStart());
  }
  return out;
}

// Absolute commands in the source grid → the compact dialect in the 1000 box.
function compact(cmds, scale) {
  const r = (v) => Math.round(v * scale);
  let cx = 0, cy = 0, sx = 0, sy = 0, out = "";
  // One token at a time, so the separator is decided against what is ACTUALLY written so far: a
  // number needs a space only after another number, and a minus sign is its own separator.
  const put = (cmd, ...vals) => { out += cmd; vals.forEach((v, k) => { out += (k > 0 && v >= 0 ? " " : "") + v; }); };
  for (const c of cmds) {
    if (c.type === "M") { const X = r(c.x), Y = r(c.y); put("m", X - cx, Y - cy); cx = sx = X; cy = sy = Y; }
    else if (c.type === "L") { const X = r(c.x), Y = r(c.y); if (X === cx && Y === cy) continue; put("l", X - cx, Y - cy); cx = X; cy = Y; }
    else if (c.type === "C") {
      const X1 = r(c.x1), Y1 = r(c.y1), X2 = r(c.x2), Y2 = r(c.y2), X = r(c.x), Y = r(c.y);
      if (X1 === cx && Y1 === cy && X2 === X && Y2 === Y) { if (X !== cx || Y !== cy) { put("l", X - cx, Y - cy); cx = X; cy = Y; } continue; }
      put("c", X1 - cx, Y1 - cy, X2 - cx, Y2 - cy, X - cx, Y - cy); cx = X; cy = Y;
    } else { out += "z"; cx = sx; cy = sy; }
  }
  return out;
}

function loadSet(file, prefix) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const scale = BOX / (j.width || 24);
  const out = {};
  let bad = 0;
  for (const name of Object.keys(j.icons)) {
    const ds = [...j.icons[name].body.matchAll(/\sd="([^"]*)"/g)].map((m) => m[1]);
    if (!ds.length) { bad++; continue; }
    try { out[prefix + ":" + name] = compact(svgPathCommands(ds.join(" ")), scale); } catch (e) { bad++; console.warn(prefix + ":" + name + " skipped — " + e.message); }
  }
  // Iconify aliases are other names for the same drawing (mdi has thousands); the picker searches
  // names, so an alias is worth having as a name, but it points at the parent's path, not a copy.
  const aliases = {};
  for (const [a, v] of Object.entries(j.aliases || {})) if (v && v.parent && !v.rotate && !v.hFlip && !v.vFlip && out[prefix + ":" + v.parent]) aliases[prefix + ":" + a] = prefix + ":" + v.parent;
  console.log(prefix + ": " + Object.keys(out).length + " icons, " + Object.keys(aliases).length + " aliases" + (bad ? ", " + bad + " skipped" : ""));
  return { icons: out, aliases };
}

if (require.main === module) {
  const [giFile, mdiFile] = process.argv.slice(2);
  if (!giFile || !mdiFile) { console.error("usage: node tools/build-symbols.js <game-icons icons.json> <mdi icons.json>"); process.exit(1); }
  const gi = loadSet(giFile, "gi"), mdi = loadSet(mdiFile, "mdi");
  const icons = { ...gi.icons, ...mdi.icons };
  const library = {
    v: 1,
    box: BOX,
    sets: {
      gi: { name: "Game", credit: "game-icons.net — Lorc, Delapouite & contributors", license: "CC BY 3.0" },
      mdi: { name: "Interface", credit: "Material Design Icons — Pictogrammers", license: "Apache 2.0" },
    },
    icons,
    aliases: { ...gi.aliases, ...mdi.aliases },
  };
  fs.mkdirSync(path.join(ROOT, "public", "symbols"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "public", "symbols", "library.json"), JSON.stringify(library));
  const slots = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "symbolSlots.json"), "utf8"));
  const art = {};
  const missing = [];
  for (const s of slots) { if (icons[s.d]) art[s.d] = icons[s.d]; else missing.push(s.k + " → " + s.d); }
  if (missing.length) { console.error("defaults naming an icon neither set has:\n  " + missing.join("\n  ")); process.exit(1); }
  fs.writeFileSync(path.join(ROOT, "src", "symbolArt.json"), JSON.stringify(art, null, 0).replace(/","/g, "\",\n\""));
  const kb = (f) => Math.round(fs.statSync(f).size / 1024) + " KB";
  console.log("library.json " + kb(path.join(ROOT, "public", "symbols", "library.json")) + ", symbolArt.json " + kb(path.join(ROOT, "src", "symbolArt.json")) + " (" + Object.keys(art).length + " icons)");
}

module.exports = { svgPathCommands, compact };
