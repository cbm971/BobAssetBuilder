/* BOB OKAY'S VEHICLES — the rules a drivable car runs by (2026-10-31).
 *
 * THIS FILE IS THE GAME'S, like anim.js and audio.js: no React, no editor. App.js draws the car,
 * reads the level for it and wires the keys; everything here is a number in, a number out, so the
 * feel can be tested without a browser.
 *
 * Blake's brief: "Items tagged wheel should rotate around a pivot. When the player enters a vehicle
 * you should see the players head sort of sticking out the window ... the physics shouldn't be
 * magic, no control in mid air, it should be momentum based, the cars shouldn't be too fast, I
 * envision they largely get stuck not to far in ... faster than a high speed player at top speed,
 * physics based, and hills will speed them up or slow them down." Five looks: Stock, Front damage,
 * Rear damage, Imminent explosion ("the front + rear crash plus the fire prop from the hood kinda
 * like in gta", for five seconds) and Destroyed ("smoldering wreckage").
 *
 * THE DATA. A vehicle is its own asset type ("vehicle"), drawn like a prop on one canvas, with one
 * frame whose poses are the five states: frames[0].front is Stock (and is what the footprint is
 * measured from, so a dented car never changes size in a level), then frontDamage, rearDamage,
 * burning and destroyed. A state left empty draws Stock. Pieces may carry `wheel` (spins about the
 * middle of the biggest wheel piece it sits in), `driverWindow` (where the driver's head shows) and
 * `isHoodFire` (a marker in the burning pose: where the fire prop sits; never drawn in play).
 * Placements stay `{ kind: "prop", propId }`, so every car already placed in a level is a car.
 */

export const VEHICLE_STATES = ["front", "frontDamage", "rearDamage", "burning", "destroyed"];
export const VEHICLE_STATE_LABEL = { front: "Stock", frontDamage: "Front damage", rearDamage: "Rear damage", burning: "Imminent explosion", destroyed: "Destroyed" };
export const VEHICLE_DEFAULT_HP = 150;
export const VEHICLE_DEFAULT_DEFENSE = 10;
// A placement smaller than this many cells is a toy on a shelf (his Beetle at size 1 on M5, the
// Tractor at 4 on M13): it stays scenery, nothing gets in it.
export const VEHICLE_MIN_DRIVE_SIZE = 8;

// ── Damage ──────────────────────────────────────────────────────────────────────────────────
// "Super weak to fire and explosion damage": both land four times over, and armour does nothing
// against them. Everything else (a bullet, a bat) is cut by the car's Defense on the same curve a
// body's is (applyDefense in App.js).
export const VEHICLE_WEAK_MULT = 4;
// At a quarter of its HP the car catches: the Imminent explosion look, the hood on fire, and a
// fuse that nothing stops. Five seconds, then it goes up.
export const VEHICLE_BURN_FRAC = 0.25;
export const VEHICLE_FUSE_FRAMES = 300;
// The explosion. Blake: "The explosion deals a ton of damage to the player". 30 is more than a
// whole default player (25 HP), before armour; it goes through the same blast code a rocket does,
// so Defense, the 🪖 blast immunity and god mode all still apply.
export const VEHICLE_BOOM_DAMAGE = 30;
export const VEHICLE_BOOM_RADIUS = 5;   // cells
export const VEHICLE_BOOM_SIZE = 8;     // cells, the drawn burst
// Below this fraction of its HP an attacked car shows the dents on the side that was hit.
export const VEHICLE_DENT_FRAC = 0.6;

// Which look a live car is drawn in, from its state.
export const vehicleStateOf = (v) => {
  if (!v) return "front";
  if (v.dead) return "destroyed";
  if (v.fuse > 0) return "burning";
  if (v.dent === "rear") return "rearDamage";
  if (v.dent === "front") return "frontDamage";
  return "front";
};
// What a hit of `raw` does to a car: `kind` "fire" or "blast" for the weak spots, anything else
// for a plain blow, already through Defense (the caller's job, it owns the curve). `side` is
// "front" or "rear", the end the hit came from; `crash` marks the car running into something,
// which always dents. Returns the new state; the car is never mutated.
export const vehicleTakeHit = (v, dmg, kind, side, crash) => {
  if (!v || v.dead) return v;
  const mult = kind === "fire" || kind === "blast" ? VEHICLE_WEAK_MULT : 1;
  const hp = Math.max(0, v.hp - Math.max(0, dmg) * mult);
  const out = { ...v, hp };
  if (side && (crash || hp <= v.maxHp * VEHICLE_DENT_FRAC) && !v.dent) out.dent = side;
  else if (side && crash) out.dent = side;
  if (!(v.fuse > 0) && hp <= v.maxHp * VEHICLE_BURN_FRAC) out.fuse = VEHICLE_FUSE_FRAMES;
  return out;
};
// Which end of a car a point is at: its front is the end it faces.
export const vehicleSideFacing = (face, carCX, fromX) => ((fromX - carCX) * (face || 1) >= 0 ? "front" : "rear");

// ── Wheels ──────────────────────────────────────────────────────────────────────────────────
// The middle a wheel piece spins about: the middle of the BIGGEST wheel piece whose box holds this
// piece's middle (the tyre a hubcap and its lug nuts sit in). A wheel piece inside no bigger one is
// its own tyre. Indexed like `pieces`; a piece that is not a wheel has no entry.
export const wheelHubs = (pieces) => {
  const out = new Map();
  const wheels = [];
  (pieces || []).forEach((p, i) => { if (p && p.wheel) wheels.push({ p, i, area: p.w * p.h }); });
  for (const { p, i } of wheels) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    let best = null;
    for (const q of wheels) {
      const t = q.p;
      if (cx < t.x || cx > t.x + t.w || cy < t.y || cy > t.y + t.h) continue;
      if (!best || q.area > best.area) best = q;
    }
    const t = (best || { p }).p;
    out.set(i, { x: t.x + t.w / 2, y: t.y + t.h / 2, r: Math.max(1, Math.min(t.w, t.h) / 2) });
  }
  return out;
};
// The wheel pieces turned `deg` about their hubs: the middle swings round the hub and the piece
// turns with it (a plain piece turns about its own middle — see pieceOriginFrac in App.js — so
// that is all it takes). A lug nut goes round, a hubcap spins in place. Rotation is kept on the
// tenth-degree grid the editor uses.
export const spinWheelPieces = (pieces, deg) => {
  const d = ((deg % 360) + 360) % 360;
  if (!d || !(pieces || []).some((p) => p && p.wheel)) return pieces;
  const hubs = wheelHubs(pieces);
  const rad = (d * Math.PI) / 180, c = Math.cos(rad), s = Math.sin(rad);
  return pieces.map((p, i) => {
    const hub = hubs.get(i);
    if (!hub) return p;
    const dx = p.x + p.w / 2 - hub.x, dy = p.y + p.h / 2 - hub.y;
    const ncx = hub.x + dx * c - dy * s, ncy = hub.y + dx * s + dy * c;
    return { ...p, x: ncx - p.w / 2, y: ncy - p.h / 2, rot: Math.round(((p.rot || 0) + d) * 10) / 10 };
  });
};
// How far a wheel of radius `r` turns, in degrees, rolling `dist` along the ground.
export const wheelTurnDeg = (dist, r) => (r > 0 ? (dist / r) * (180 / Math.PI) : 0);
// The spin a drawn car is snapped to. The art is rebuilt only when this changes, so a parked car
// and one at a steady speed cost nothing extra; a quarter-turn is 6 steps, plenty to read a turn.
export const VEHICLE_SPIN_STEP = 15;
export const spinStepOf = (deg) => (Math.round((((deg % 360) + 360) % 360) / VEHICLE_SPIN_STEP) * VEHICLE_SPIN_STEP) % 360;
// Where the two contact points sit along the art, as fractions of the art box from its left edge:
// under the outermost hubs, or a sixth in from each end for a car with no wheel flagged.
export const wheelContactFracs = (pieces, box) => {
  const hubs = [...wheelHubs(pieces).values()];
  if (!box || !(box.w > 0) || hubs.length < 1) return { l: 1 / 6, r: 5 / 6, rad: box ? box.h * 0.18 : 10 };
  const xs = hubs.map((h) => h.x);
  let l = (Math.min(...xs) - box.minX) / box.w, r = (Math.max(...xs) - box.minX) / box.w;
  if (r - l < 0.2) { l = 1 / 6; r = 5 / 6; }
  return { l, r, rad: Math.max(...hubs.map((h) => h.r)) };
};
// The fire marker in the burning pose, as a design-canvas point, or null.
export const hoodFirePoint = (pieces) => {
  const m = (pieces || []).find((p) => p && p.isHoodFire);
  return m ? { x: m.x + m.w / 2, y: m.y + m.h / 2 } : null;
};
// What a state actually draws: its own pieces, or Stock while it has none; markers out.
export const vehicleStatePieces = (asset, state) => {
  const f = (asset && asset.frames && asset.frames[0]) || (asset && asset.angles) || {};
  const own = f[state];
  const list = Array.isArray(own) && own.some((p) => p && !p.isHoodFire) ? own : (f.front || []);
  return list.filter((p) => p && !p.isHoodFire && !p.isHitbox && !p.isMuzzle);
};

// ── Damage art ("Make damage states from Stock") ────────────────────────────────────────────
// The four damaged looks drawn FROM the stock car, in his flat style: the same pieces and colours,
// the struck end crumpled in, broken lights gone dark, a bumper hanging, a crack across the glass,
// and creases in the 1px-edge colour he outlines with. No shading. Burning is both ends at once
// plus the fire marker; Destroyed is that, charred, sagging on flat tyres. Every piece stays one the
// editor can make (polys touch all four sides of their box), so he can redraw any of it.
const EDGE = "#1d1b1b";
const CHAR = "#2a2624";
const DEAD_LIGHT = "#3b3735";
const DEAD_GLASS = "#1f1d1c";
const hexRgb = (c) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c || "");
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbHex = ([r, g, b]) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mixHex = (c, to, t) => { const a = hexRgb(c), b = hexRgb(to); return a && b ? rgbHex(a.map((v, i) => v + (b[i] - v) * t)) : c; };
const luma = (c) => { const a = hexRgb(c); return a ? (0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2]) / 255 : 0.5; };
// Glass is BLUE: blue well over red and over green. Turquoise (his Beetle and Pickup, #40e0d0) has
// more green than blue, and the first cut of this, blue-over-red alone, took both cars' whole bodies
// for windows: a crack drawn the length of the car and a black wreck.
export const isGlassColor = (c) => { const a = hexRgb(c); return !!a && a[2] > a[0] + 40 && a[2] > a[1] + 10 && a[2] > 120; };
const r1 = (v) => Math.round(v * 10) / 10;
const artBoxOf = (pieces) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pieces) {
    if (!p || p.isCutter || p.isHitbox || p.isMuzzle || p.isHoodFire) continue;
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + p.w); y1 = Math.max(y1, p.y + p.h);
  }
  return x0 === Infinity ? null : { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
};
// The top of a piece's drawn outline straight above x, or null where it does not reach: where a
// hood actually is at that point, rather than the top of a body whose box takes in the roof.
const topAt = (p, x) => {
  if (x < p.x || x > p.x + p.w) return null;
  if (p.kind === "circle") { const rx = p.w / 2, ry = p.h / 2, dx = (x - p.x - rx) / rx; return p.y + ry - ry * Math.sqrt(Math.max(0, 1 - dx * dx)); }
  const pts = outlineOf(p);
  if (!pts) return p.y;
  let top = null;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    if ((x < Math.min(ax, bx)) || (x > Math.max(ax, bx)) || ax === bx) continue;
    const y = ay + ((x - ax) / (bx - ax)) * (by - ay);
    if (top == null || y < top) top = y;
  }
  return top;
};
// A piece's outline as canvas points, for the shapes a car is made of; null for anything else.
const RECTISH = new Set(["rect", "roundrect", "stadium"]);
const outlineOf = (p) => {
  if (p.kind === "poly" && Array.isArray(p.points)) return p.points.map(([u, v]) => [p.x + u * p.w, p.y + v * p.h]);
  if (RECTISH.has(p.kind)) return [[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.h], [p.x, p.y + p.h]];
  return null;
};
// Points back to a poly piece: the box measured from the points, the points as fractions of it.
const polyFrom = (p, pts) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const w = Math.max(0.5, x1 - x0), h = Math.max(0.5, y1 - y0);
  const out = { ...p, kind: "poly", x: r1(x0), y: r1(y0), w: r1(w), h: r1(h), points: pts.map(([x, y]) => [Math.round(((x - x0) / w) * 10000) / 10000, Math.round(((y - y0) / h) * 10000) / 10000]) };
  return out;
};
// One end crumpled. `front` is where the struck end is: "left" (small x) or "right".
const crumpleEnd = (pieces, end, box, uid) => {
  const zone = box.w * 0.24, crush = zone * 0.35, sag = box.h * 0.06;
  const edgeX = end === "left" ? box.x0 : box.x1, inward = end === "left" ? 1 : -1;
  const depth = (x) => Math.max(0, 1 - Math.abs(x - edgeX) / zone); // 1 at the very end, 0 past the zone
  const out = [];
  const extra = [];
  pieces.forEach((p, i) => {
    if (!p) return;
    const px0 = p.x, px1 = p.x + p.w;
    const reach = end === "left" ? px0 < box.x0 + zone : px1 > box.x1 - zone;
    if (!reach || p.wheel || p.isHoodFire || p.isHitbox || p.isMuzzle || (p.rot || 0) % 360) { out.push(p); return; }
    const small = p.w * p.h < box.w * box.h * 0.03;
    const whole = end === "left" ? px1 <= box.x0 + zone : px0 >= box.x1 - zone;
    // A light: small, bright, wholly in the struck end. Broken: dark.
    if (!p.isCutter && small && whole && luma(p.color) > 0.62 && !isGlassColor(p.color)) {
      out.push({ ...p, x: r1(p.x + inward * crush * depth(p.x + p.w / 2)), color: DEAD_LIGHT });
      return;
    }
    // A bumper: a low, flat strip at the very end. Hanging off one bolt.
    if (!p.isCutter && whole && p.h < box.h * 0.14 && p.y > box.y0 + box.h * 0.6) {
      const tip = end === "left" ? -14 : 14;
      out.push({ ...p, x: r1(p.x + inward * crush * 0.5), y: r1(p.y + 3), rot: tip });
      return;
    }
    const pts = outlineOf(p);
    if (!pts) { out.push({ ...p, x: r1(p.x + inward * crush * depth(p.x + p.w / 2)) }); return; }
    // Shapes reaching into the struck end bend there: every corner in the zone pushed in by how deep
    // it sits, the top of it pulled down, and the very end edge broken into a zig-zag.
    let moved = pts.map(([x, y], k) => {
      const d = depth(x);
      if (!d) return [x, y];
      const top = y < p.y + p.h * 0.5;
      return [x + inward * crush * d * (k % 2 ? 1 : 0.8), y + (top ? sag * d : 0)];
    });
    if (RECTISH.has(p.kind) && depth(end === "left" ? px0 : px1) > 0.5) {
      // The end edge of a box: four points down it instead of two, alternately in and out.
      const ex = end === "left" ? 0 : 1;
      const ys = [0.18, 0.42, 0.66, 0.86].map((f) => p.y + f * p.h);
      const jag = ys.map((y, k) => [px0 + ex * p.w + inward * crush * (k % 2 ? 1.25 : 0.55), y]);
      const tl = moved[0], tr = moved[1], br = moved[2], bl = moved[3];
      moved = end === "left" ? [tl, tr, br, bl, ...jag.slice().reverse()] : [tl, tr, ...jag, br, bl];
    }
    const bent = polyFrom(p, moved);
    out.push(bent);
    // A crack across glass, and a crease over a big panel: thin lines in his edge colour.
    if (!p.isCutter && isGlassColor(p.color) && p.w > 4 && p.h > 4) {
      const cx = bent.x + bent.w * (end === "left" ? 0.3 : 0.7);
      extra.push({ at: i, piece: polyFrom({ id: uid(), color: EDGE, mirror: false, fx: p.fx }, [[cx - bent.w * 0.18, bent.y + 0.5], [cx + bent.w * 0.05, bent.y + bent.h * 0.45], [cx - bent.w * 0.06, bent.y + bent.h * 0.55], [cx + bent.w * 0.16, bent.y + bent.h - 0.5], [cx - bent.w * 0.1, bent.y + bent.h * 0.6], [cx - bent.w * 0.02, bent.y + bent.h * 0.5]]) });
    } else if (!p.isCutter && !small && p.w > box.w * 0.3 && p.h > box.h * 0.2 && !isGlassColor(p.color)) {
      const x = edgeX + inward * zone * 0.85, y = bent.y + bent.h * 0.3;
      extra.push({ at: i, piece: polyFrom({ id: uid(), color: EDGE, mirror: false, fx: p.fx }, [[x, y], [x + inward * 2.5, y + bent.h * 0.22], [x + inward * 0.5, y + bent.h * 0.42], [x - inward * 0.6, y + bent.h * 0.42], [x + inward * 1.2, y + bent.h * 0.22], [x - inward * 1, y]]) });
    }
  });
  // The lines go straight above the piece they mark, so the layering is his.
  for (const e of extra.reverse()) {
    const at = out.findIndex((q) => q && pieces[e.at] && q.id === pieces[e.at].id);
    out.splice(at >= 0 ? at + 1 : out.length, 0, e.piece);
  }
  return out;
};
const charred = (pieces, box) => pieces.map((p) => {
  if (!p) return p;
  const sag = p.wheel ? 0 : 3;
  if (p.wheel) {
    // Flat tyres: squashed onto the ground they stand on, the bottom kept where it was.
    const bottom = p.y + p.h, h = p.h * 0.8;
    return { ...p, y: r1(bottom - h - (bottom - (box.y1)) * 0.2), h: r1(h), color: p.isCutter ? p.color : mixHex(p.color, CHAR, 0.5) };
  }
  if (p.isCutter || p.isHoodFire) return { ...p, y: r1(p.y + sag) };
  const color = isGlassColor(p.color) ? DEAD_GLASS : p.color === DEAD_LIGHT || p.color === EDGE ? p.color : mixHex(p.color, CHAR, 0.65);
  return { ...p, y: r1(p.y + sag), color };
});
// The four damaged looks, from `stock` (a piece list). `facesRight`: the art's front is its right
// end (all of his face left). `uid` makes the new pieces' ids (App.js passes its own).
export const autoVehicleDamage = (stock, kind, facesRight, uid) => {
  const mk = uid || (() => Math.random().toString(36).slice(2, 9));
  const base = (stock || []).filter(Boolean).map((p) => ({ ...p, id: mk() }));
  const box = artBoxOf(base);
  if (!box) return base;
  const frontEnd = facesRight ? "right" : "left", rearEnd = facesRight ? "left" : "right";
  if (kind === "frontDamage") return crumpleEnd(base, frontEnd, box, mk);
  if (kind === "rearDamage") return crumpleEnd(base, rearEnd, box, mk);
  const both = crumpleEnd(crumpleEnd(base, frontEnd, box, mk), rearEnd, box, mk);
  // The fire sits ON the hood: a sixth of the way in from the front, on the highest body surface
  // straight above that point (the crumpled one, which is the one drawn while it burns).
  const fire = (() => {
    const x = facesRight ? box.x1 - box.w * 0.16 : box.x0 + box.w * 0.16;
    const tops = both.filter((p) => !p.isCutter && !p.wheel && !p.isHoodFire && p.w * p.h > box.w * box.h * 0.01).map((p) => topAt(p, x)).filter((y) => y != null);
    const y = tops.length ? Math.min(...tops) : box.y0;
    return { id: mk(), kind: "circle", x: r1(x - 4), y: r1(y - 4), w: 8, h: 8, color: "#ff7a1f", mirror: false, isHoodFire: true };
  })();
  if (kind === "burning") return [...both, fire];
  if (kind === "destroyed") return charred(both, box);
  return base;
};

// ── Driving ─────────────────────────────────────────────────────────────────────────────────
// All per 60 fps frame, in px, on the 30 px cell, with the game's own gravity (0.175 px/frame²,
// the same fall the player and every unit has). The player at Speed 10 walks 11.55 px/frame
// (playerWalkSpeed); a car on the flat tops out near 14.5, about a quarter faster, and gets there
// in about three seconds. Along a slope gravity pulls G·sinθ, so a 45° hill holds a car to about a
// third of its speed going up and runs it past its top speed coming down, to VEH_MAX_SPEED.
export const VEH_GRAVITY = 0.175;
export const VEH_ACCEL = 0.2;          // the engine's pull from rest
export const VEH_ENGINE_TOP = 16;      // the speed at which the engine has nothing left to give
export const VEH_ROLL = 0.004;         // rolling resistance
export const VEH_DRAG = 0.00007;       // air, by the square of the speed
export const VEH_COAST = 0.05;         // no pedal: the engine holding it back
export const VEH_BRAKE = 0.45;         // the other way held: the brakes
export const VEH_MAX_SPEED = 24;       // nothing rolls faster, however long the hill (less than a cell a frame, so a wall is always met)
export const VEH_STEP_UP = 10;         // px: a kerb a wheel climbs; a 30 px block is a wall
export const VEH_MAX_TILT = 50;        // degrees the body can pitch to before it is a fall, not a slope
export const VEH_TURN_FRAMES = 12;     // the brake held this long at a stop turns the car round
export const VEH_CRASH_MIN = 5;        // px/frame into a wall to dent it and hurt it
export const vehicleCrashDamage = (speed) => (speed >= VEH_CRASH_MIN ? Math.round((speed - 3) * 5) : 0);
export const VEH_HARD_LANDING = 10;    // px/frame of fall that hurts the car when it lands
export const vehicleLandingDamage = (vy) => (vy >= VEH_HARD_LANDING ? Math.round((vy - VEH_HARD_LANDING + 1) * 3) : 0);

// One frame of a car. `v` is mutated: { x, y, w, h (the art box in level px), vx (signed, along the
// ground), vy, face (+1 right, -1 left), onGround, yL, yR (where each wheel touches), wl, wr (the
// contact points as fractions of w, in the DRAWN orientation), tilt (degrees, + = right end down),
// stopT, turnT }. `ctl` is { gas, brake } (the key it faces, the other key). The level is asked
// through `world`, one column at a time:
//   floorAt(x, fromY, upSlope, upStep, down) -> { y, steep }: the highest floor whose surface lies
//     between fromY-upSlope (a ramp's line) or fromY-upStep (a block's top) and fromY+down; `steep`
//     when a ramp rises past fromY-upSlope there (too steep to drive up at this speed).
//   wallAt(x, fromY, upStep, wallH) -> bool: solid standing across the body's height, from upStep
//     to wallH above fromY. A hill's own backing is not a wall (its ramp is the floor), and the
//     level's edge is one.
// Returns what happened: { crash, landed, turned, dist } — the impact speed and end, the fall
// speed, a turn, and how far it rolled.
export const vehicleStep = (v, ctl, world, dt = 1) => {
  const ev = { crash: null, landed: null, turned: false, dist: 0 };
  const G = VEH_GRAVITY;
  const t = (v.tilt * Math.PI) / 180;
  if (v.turnT > 0) v.turnT = Math.max(0, v.turnT - dt);
  if (v.onGround) {
    const along = v.vx * v.face; // speed the way it faces; negative = rolling backwards
    let a = 0; // in the facing direction
    if (ctl.gas) a = VEH_ACCEL * Math.min(1.5, 1 - along / VEH_ENGINE_TOP);
    else if (along !== 0) a = -Math.sign(along) * Math.min(Math.abs(along) / dt, ctl.brake ? VEH_BRAKE : VEH_COAST);
    let ax = a * v.face + G * Math.sin(t);
    if (v.vx !== 0) ax -= Math.sign(v.vx) * (VEH_ROLL + VEH_DRAG * v.vx * v.vx);
    const nvx = v.vx + ax * dt;
    v.vx = (!ctl.gas && Math.sign(nvx) !== Math.sign(v.vx) && v.vx !== 0 && Math.abs(G * Math.sin(t)) < 0.01) ? 0 : nvx;
    // Stopped with the brake held: turn round (the squash is drawn from turnT).
    if (ctl.brake && Math.abs(v.vx) < 0.3) {
      v.stopT = (v.stopT || 0) + dt;
      if (v.stopT >= VEH_TURN_FRAMES) { v.face = -v.face; v.vx = 0; v.stopT = 0; v.turnT = VEH_TURN_FRAMES; const l = v.wl; v.wl = 1 - v.wr; v.wr = 1 - l; ev.turned = true; }
    } else v.stopT = 0;
  } else {
    v.vy = Math.min(VEH_MAX_SPEED, v.vy + G * dt);
  }
  v.vx = Math.max(-VEH_MAX_SPEED, Math.min(VEH_MAX_SPEED, v.vx));
  const dx = (v.onGround ? v.vx * Math.cos(t) : v.vx) * dt;
  const nx = v.x + dx;
  const xl = nx + v.wl * v.w, xr = nx + v.wr * v.w;
  const reach = Math.abs(dx) * 2.2 + VEH_STEP_UP;
  const wallH = v.h * 0.55;
  const fall = v.onGround ? reach : Math.max(0, v.vy * dt) + 1;
  // The leading end: its wheel, and its bumper out past it. The bumper is asked at the height the
  // body's own pitch puts it, so cresting a hill onto flat ground is not a wall.
  if (dx !== 0) {
    const leadRight = dx > 0;
    const leadY = leadRight ? v.yR : v.yL;
    const wheelX = leadRight ? xr : xl;
    const bumperX = leadRight ? nx + v.w : nx;
    const bumperY = leadY + (bumperX - wheelX) * Math.tan(t);
    const steep = v.onGround && world.floorAt(wheelX, leadY, reach, VEH_STEP_UP, fall).steep;
    if (steep || world.wallAt(wheelX, leadY, VEH_STEP_UP, wallH) || world.wallAt(bumperX, bumperY, VEH_STEP_UP, wallH)) {
      const speed = Math.abs(v.vx);
      ev.crash = { speed, end: Math.sign(v.vx) === v.face ? "front" : "rear" };
      v.vx = -v.vx * 0.15;
      return ev;
    }
  }
  v.x = nx;
  ev.dist = dx;
  const prevBottom = (v.yL + v.yR) / 2;
  const fl = world.floorAt(xl, v.yL, v.onGround ? reach : 0, v.onGround ? VEH_STEP_UP : 0, fall);
  const fr = world.floorAt(xr, v.yR, v.onGround ? reach : 0, v.onGround ? VEH_STEP_UP : 0, fall);
  const wasGround = v.onGround;
  if (wasGround) {
    if (fl.y == null && fr.y == null) {
      // Off the end of the ground: whatever upward speed the slope was giving it, it keeps.
      v.onGround = false;
      v.vy = Math.min(0, v.lastDy || 0);
      v.vx = v.vx * Math.cos(t);
      v.yL += v.vy * dt; v.yR += v.vy * dt;
    } else {
      // One wheel over a drop: it falls, the body pitches about the other, until the pitch is a fall.
      v.freeVy = fl.y == null || fr.y == null ? (v.freeVy || 0) + G * dt : 0;
      v.yL = fl.y != null ? fl.y : v.yL + v.freeVy * dt;
      v.yR = fr.y != null ? fr.y : v.yR + v.freeVy * dt;
    }
  } else {
    const dy = v.vy * dt;
    const landL = fl.y != null && fl.y <= v.yL + dy + 1, landR = fr.y != null && fr.y <= v.yR + dy + 1;
    if (landL || landR) {
      ev.landed = v.vy;
      v.onGround = true; v.vy = 0; v.freeVy = 0;
      v.yL = landL ? fl.y : v.yL + dy; v.yR = landR ? fr.y : v.yR + dy;
    } else { v.yL += dy; v.yR += dy; }
  }
  const span = Math.max(1, (v.wr - v.wl) * v.w);
  let tilt = (Math.atan2(v.yR - v.yL, span) * 180) / Math.PI;
  if (Math.abs(tilt) > VEH_MAX_TILT) {
    tilt = Math.sign(tilt) * VEH_MAX_TILT;
    const mid = (v.yL + v.yR) / 2, half = (Math.tan((VEH_MAX_TILT * Math.PI) / 180) * span) / 2;
    v.yL = mid - Math.sign(tilt) * half; v.yR = mid + Math.sign(tilt) * half;
  }
  v.tilt = tilt;
  const bottom = (v.yL + v.yR) / 2;
  v.lastDy = wasGround && v.onGround ? (bottom - prevBottom) / dt : v.lastDy;
  v.y = bottom - v.h;
  return ev;
};

// ── Units and the car ───────────────────────────────────────────────────────────────────────
// Blake: "Enemies who see a car should jump, become front facing in the back ground or back facing
// in the front layer when the car passes by to seem like they avoided it. They should also launch
// projectiles at it or meelee when the car is going slow."
export const VEH_DODGE_MIN_SPEED = 4;   // slower than this a car is something to hit, not to dive from
export const VEH_DODGE_LOOK_FRAMES = 24; // how far ahead of the bumper a unit sees it coming, in frames of travel
export const VEH_MELEE_MAX_SPEED = 3;   // a swing only lands on a car this slow
export const VEH_RAM_MIN_SPEED = 3;     // a car this fast knocks a body flying
export const vehicleRamDamage = (speed) => Math.round(speed * 2.5);
export const vehicleRamSelfDamage = (speed) => Math.max(1, Math.round(speed * 0.15));
// Is this car bearing down on this body? Ahead of its bumper, inside the distance the car covers in
// VEH_DODGE_LOOK_FRAMES, level with it, and LOOKING at it (a unit with its back to the road does not
// see the car, and that is the one a driver hits). Boxes are { x, y, w, h } in level px.
export const carBearsDown = (car, u, uFace, cellPx = 30) => {
  const speed = Math.abs(car.vx || 0);
  if (speed < VEH_DODGE_MIN_SPEED) return false;
  const dir = Math.sign(car.vx);
  if (u.y + u.h < car.y + car.h * 0.3 || u.y > car.y + car.h + 2) return false;
  const lead = dir > 0 ? car.x + car.w : car.x;
  const gap = dir > 0 ? u.x - lead : lead - (u.x + u.w);
  if (gap > speed * VEH_DODGE_LOOK_FRAMES + cellPx || gap < -(car.w + u.w)) return false;
  return (uFace || 0) === -dir;
};
// How a unit gets out of the way. `opts` says what it can do: a drawn Front pose (step back, behind
// the car), a Back pose (step forward, in front of it), and whether it is on its feet to jump. An
// animal with only its side art jumps or steps back in its side pose.
export const vehicleDodgeKind = (opts, rnd = Math.random()) => {
  const kinds = [];
  if (opts && opts.onGround) kinds.push("jump");
  kinds.push("bg");
  if (opts && opts.hasBack) kinds.push("fg");
  return kinds[Math.min(kinds.length - 1, Math.floor(rnd * kinds.length))];
};
// The chance a unit that SEES the car gets out of the way: better than a shot's (enemyDodgeChance),
// since a car is a lot bigger, and more for a sharper unit.
export const vehicleDodgeChance = (intelligence) => Math.min(0.97, 0.55 + 0.04 * (intelligence ?? 5));
