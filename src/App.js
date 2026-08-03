import React, { useRef, useEffect, useState, useMemo } from "react";

/* ============================================================================
   BOB ASSET STUDIO  — HTML canvas (reliable emoji + easy dragging on mobile)
   ========================================================================== */

const W = 200, H = 260;
const SKIN = "#e2b48c";
const ANGLES = ["front", "back", "side", "up", "crouch"];
const ALABEL = { front: "Front", back: "Back", side: "Side", up: "Aim up", crouch: "Crouch", attack: "⚔️ Attack", death: "💀 Death" };
const COLORS = ["#e2b48c", "#c98f63", "#5d6b39", "#3d4a28", "#2a2017", "#8a929c",
  "#c8a23c", "#7aa2d6", "#b0504f", "#7a3b8f", "#2b2b2b", "#f4f4f4"];
// A swatch row is a PALETTE, not one fixed list of twelve. Half the work in building a themed
// scene is getting its colours right, and a period look is a small closed set of them — a 1960s
// trailer is avocado, harvest gold, turquoise, Formica cream, candy red and birch panelling, over
// and over. Typing those hexes back in every time is most of the effort, and eyeballing them by
// hand is how a scene ends up with nine nearly-identical browns that don't quite agree.
//
// So the row is switchable and lives in a registry, exactly like TEXTURES and EFFECT_TYPES: adding
// a theme here gets it a picker entry, in the art editor AND the level/room painter, for free. The
// custom "＋" picker and the recent-colours strip are untouched — a palette is a starting point you
// reach past whenever you want, never a restriction on what a block can be.
const PALETTES = {
  bob: { label: "Bob's kit", icon: "🎨", colors: COLORS },
  // The level painter's original ten. It starts on this one because terrain, not clothing, is what
  // you're reaching for the moment you open the level editor.
  terrain: { label: "Terrain", icon: "⛰️", colors: ["#6b7b3a", "#4a5a28", "#8a929c", "#5b4636", "#2a2017", "#7aa2d6", "#3a3f52", "#b0894f", "#c8a23c", "#2b2b2b"] },
  // 1960s trailer/diner interior. The first six are the canonical ones (avocado, harvest gold,
  // turquoise, Formica cream, candy red, birch); the rest are what a room actually needs around
  // them — a darker panel seam to groove the walls with, chrome for trim and appliance handles,
  // and the burnt orange / coral / powder blue that shared every catalogue page with them.
  trailer60s: { label: "1960s trailer", icon: "🚐", colors: ["#556b2f", "#daa520", "#40e0d0", "#f5f5dc", "#c0392b", "#8b5a2b",
    "#6b4423", "#c1440e", "#e8917d", "#9cc3d5", "#c9cdd2", "#33302e"] },
};
const PALETTE_KEYS = Object.keys(PALETTES);
const paletteColors = (key) => (PALETTES[key] || PALETTES.bob).colors;
// Full emoji set, generated correctly (whole characters) from the Unicode emoji
// blocks. We then keep only the ones THIS device can actually draw, so the
// picker never shows broken boxes — and shows everything that does render.
const EMOJI_RANGES = [[0x1F300, 0x1F5FF], [0x1F600, 0x1F64F], [0x1F680, 0x1F6FF], [0x1F900, 0x1F9FF], [0x1FA70, 0x1FAFF], [0x2600, 0x26FF], [0x2700, 0x27BF], [0x2B00, 0x2BFF], [0x1F000, 0x1F0FF]];
function candidateEmojis() {
  const out = [];
  for (const [a, b] of EMOJI_RANGES) for (let cp = a; cp <= b; cp++) {
    let s = String.fromCodePoint(cp);
    if (cp < 0x1F000) s += "\uFE0F"; // ask for the colorful version of older symbols
    out.push(s);
  }
  return out;
}
function buildEmojiList() {
  const list = candidateEmojis();
  try {
    const c = document.createElement("canvas"); c.width = c.height = 18;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.textBaseline = "top"; ctx.font = "16px sans-serif";
    const sig = (ch) => { ctx.clearRect(0, 0, 18, 18); ctx.fillText(ch, 0, 0); const d = ctx.getImageData(0, 0, 18, 18).data; let nz = 0, s = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { nz++; s = (s + d[i] * 3 + d[i + 1] * 5 + d[i + 2] * 7 + i) >>> 0; } return nz === 0 ? "blank" : nz + ":" + s; };
    const tofuA = sig("\uFFFF"), tofuB = sig(String.fromCodePoint(0x10FFFF));
    const keep = list.filter((ch) => { const x = sig(ch); return x !== "blank" && x !== tofuA && x !== tofuB; });
    return keep.length > 200 ? keep : list; // safety net: never return an empty/tiny picker
  } catch (e) { return list; }
}
// A search index for the ~1000+ candidate emoji — there's no keyword metadata to draw on (just
// raw Unicode code points), so this is a hand-curated map for the ones a game/asset builder is
// actually likely to search for. An emoji with no entry here simply won't match a search (it's
// still there when browsing with an empty search box) — better to nail the common searches than
// half-cover everything with guessed/auto-generated names.
const EMOJI_KEYWORDS = {
  "💥": "explosion boom blast bang impact hit crash effect", "💢": "anger burst impact effect", "✨": "sparkle magic shine effect stars",
  "⚡": "lightning bolt electric shock zap thunder energy", "🔥": "fire flame burn heat blaze", "🌟": "star glow shine sparkle magic",
  "⭐": "star", "💫": "dizzy star swirl magic effect", "💨": "dash wind smoke speed poof gas fart",
  "☄️": "comet meteor fireball impact", "🌠": "shooting star wish", "🧨": "explosive dynamite firecracker bomb",
  "💣": "bomb explosive", "☠️": "skull death poison danger", "💀": "skull death bone",
  "🩸": "blood drop gore damage", "🗡️": "dagger sword blade knife weapon melee", "⚔️": "swords crossed weapon fight battle",
  "🛡️": "shield defense armor block", "🏹": "bow arrow ranged weapon hunt", "🔫": "gun pistol firearm ranged weapon",
  "🪓": "axe hatchet weapon chop", "🔨": "hammer tool weapon build", "⚒️": "hammer pick tools craft",
  "🛠️": "tools wrench hammer craft build", "🪃": "boomerang throwing weapon", "🔱": "trident weapon spear",
  "🗿": "statue stone moai", "🪄": "wand magic staff spell", "📯": "horn alert", "🔔": "bell alert notify",
  "🧪": "potion vial flask chemistry poison", "⚗️": "alchemy potion flask brew", "💊": "pill potion medicine heal",
  "🧬": "dna genetics magic science", "🩹": "bandage heal patch health", "❤️": "heart health life love red",
  "💚": "heart health life green", "💙": "heart health life blue", "🖤": "heart dark black", "💛": "heart health life yellow",
  "🧡": "heart health life orange", "💜": "heart health life purple", "💔": "broken heart death damage",
  "💯": "hundred perfect score", "🆙": "level up up", "🔝": "top rank", "🏆": "trophy win victory reward",
  "🥇": "gold medal first win", "🥈": "silver medal second", "🥉": "bronze medal third",
  "🎖️": "medal award military", "🏅": "medal award reward", "👑": "crown king royal ruler",
  "💰": "money bag gold coins treasure", "🪙": "coin gold currency money", "💎": "gem diamond treasure jewel loot",
  "🔑": "key unlock item", "🗝️": "key old ornate unlock", "🔓": "unlock open", "🔒": "lock locked closed security",
  "📦": "box crate chest item container", "🎁": "gift present box reward chest", "🧰": "toolbox chest container",
  "🪙": "coin currency", "📜": "scroll paper document quest", "📖": "book open read lore", "📚": "books library lore",
  "🕯️": "candle light flame", "🏮": "lantern light lamp", "💡": "light bulb idea lamp",
  "🌳": "tree oak forest plant nature", "🌲": "tree pine evergreen forest", "🌴": "palm tree tropical",
  "🌵": "cactus desert plant", "🍄": "mushroom fungus forest", "🌿": "herb leaf plant nature",
  "☘️": "clover leaf plant luck", "🍀": "clover luck plant leaf", "🌾": "wheat grain crop farm",
  "🌷": "tulip flower", "🌹": "rose flower red", "🌺": "hibiscus flower tropical", "🌻": "sunflower flower yellow",
  "🌼": "daisy flower", "🌸": "cherry blossom flower spring", "💐": "bouquet flowers", "🍂": "leaves autumn fall",
  "🍁": "maple leaf autumn fall", "🌊": "wave water ocean sea", "💧": "water drop droplet",
  "🌈": "rainbow", "⛰️": "mountain peak", "🏔️": "mountain snow peak", "🌋": "volcano lava mountain eruption",
  "🏕️": "camp tent camping outdoor", "🏝️": "island beach tropical", "🕳️": "hole pit trap dark",
  "🪨": "rock stone boulder", "🧱": "brick wall block build", "🏰": "castle fortress fantasy building",
  "🏯": "castle japanese fortress building", "🏛️": "temple building ancient pillar", "⛩️": "shrine gate torii japanese",
  "🗼": "tower building landmark", "🏚️": "abandoned house ruin building", "🏠": "house home building",
  "🏡": "house home building garden", "🏘️": "houses village buildings", "🏪": "shop store market building",
  "⛺": "tent camp shelter", "🌉": "bridge night", "🌁": "bridge fog", "🚪": "door entrance exit",
  "🪟": "window", "🧭": "compass navigation map direction", "🗺️": "map treasure world", "📍": "pin marker location",
  "🐉": "dragon fantasy monster", "🐲": "dragon face fantasy monster", "🦇": "bat night creature vampire",
  "🕷️": "spider creature bug", "🕸️": "web spider cobweb", "🦂": "scorpion creature poison desert",
  "🐍": "snake serpent creature poison", "🐺": "wolf creature animal", "🦁": "lion animal king",
  "🐻": "bear animal", "🐗": "boar pig wild animal", "🦅": "eagle bird animal",
  "🦉": "owl bird night animal", "🐸": "frog creature animal", "🐢": "turtle shell animal",
  "🦖": "dinosaur trex monster creature", "🦕": "dinosaur creature", "👹": "ogre demon monster enemy",
  "👺": "goblin demon monster enemy mask", "👻": "ghost spirit undead", "🧟": "zombie undead monster",
  "🧛": "vampire undead monster", "🧙": "wizard mage magic sorcerer", "🧝": "elf fantasy character",
  "🧚": "fairy fantasy magic", "🦹": "villain enemy bad", "🦸": "hero character good",
  "🤺": "fencer swordsman fighter", "⚰️": "coffin death grave", "⚱️": "urn death grave ashes",
  "🪦": "tombstone grave death", "🔮": "crystal ball magic fortune", "🎯": "target bullseye aim hit",
  "🧲": "magnet pull attract", "⏳": "hourglass time timer", "⌛": "hourglass time timer",
  "🌀": "cyclone swirl vortex spiral effect", "🌪️": "tornado wind storm", "⛈️": "storm lightning thunder rain",
  "🌩️": "lightning cloud storm", "❄️": "snowflake ice cold winter", "☃️": "snowman winter",
  "🌡️": "temperature thermometer", "☀️": "sun light day", "🌙": "moon night crescent",
  "🌑": "moon dark new night", "☁️": "cloud sky weather",
  "😀": "happy smile face", "😃": "happy smile face joy", "😄": "happy smile face laugh", "😁": "grin smile face",
  "😆": "laugh smile face happy", "😅": "sweat smile nervous face", "😂": "laughing crying tears face",
  "🙂": "smile neutral face", "😉": "wink face", "😊": "smile blush happy face", "😍": "love heart eyes face",
  "😘": "kiss love face", "😢": "cry sad tear face", "😭": "cry sad sob face", "😡": "angry mad rage face",
  "😱": "scared shock scream face", "😴": "sleep tired face", "🤔": "think thinking face",
  "😎": "cool sunglasses face", "🤯": "mind blown shock face", "🥶": "cold freezing face",
  "🥵": "hot sweating face", "🤢": "sick nauseous face", "😷": "mask sick face",
};

const SLOTS = {
  hat: { label: "Hat", icon: "🎩", z: 70 },
  jacket: { label: "Jacket / Cape", icon: "🧥", z: 60 },
  shoes: { label: "Shoes", icon: "👟", z: 45 },
  shirt: { label: "Shirt", icon: "👕", z: 40 },
  pants: { label: "Pants", icon: "👖", z: 30 },
  under_top: { label: "Underwear top", icon: "🩱", z: 20 },
  under_bottom: { label: "Underwear bottom", icon: "🩲", z: 10 },
};
const SLOT_ORDER = ["under_bottom", "under_top", "pants", "shirt", "shoes", "jacket", "hat"];
// Lower body always sits below the arm — pants/underwear/shoes logically can't be in front of
// an arm. Upper body is ambiguous (a sleeved jacket should cover the arm, a tank top shouldn't)
// so it's a per-piece toggle instead of an assumption.
const LOWER_BODY_SLOTS = new Set(["pants", "under_bottom", "shoes"]);
const UPPER_BODY_SLOTS = new Set(["shirt", "jacket", "under_top"]);

const uid = () => Math.random().toString(36).slice(2, 9);
const rect = (x, y, w, h, color = SKIN) => ({ id: uid(), kind: "rect", x, y, w, h, color, mirror: true });
const arm = (x, y, w, h, pivot = "top") => ({ ...rect(x, y, w, h), locked: true, role: "weaponArm", limb: "arm", armPivot: pivot });   // the arm the game swings — can't be deleted; pivots at the shoulder end
// ---- Shoulder-pivot helpers (4-way) ----------------------------------------
// armPivot picks which SIDE of the arm piece is the shoulder — the fixed point the swing turns
// about: "top" (default) / "bottom" for vertical arms, "left" / "right" for an arm drawn as a
// horizontal bar (where top/bottom-center sits mid-bar, so the swing read as spinning around the
// arm's middle). Selected per piece in the editor — never guessed.
export const armShoulderPoint = (p) => {
  const pv = p.armPivot || "top";
  if (pv === "left") return { x: p.x, y: p.y + p.h / 2 };
  if (pv === "right") return { x: p.x + p.w, y: p.y + p.h / 2 };
  if (pv === "bottom") return { x: p.x + p.w / 2, y: p.y + p.h };
  return { x: p.x + p.w / 2, y: p.y };
};
// CSS transform-origin string for that shoulder side.
export const armPivotOrigin = (pv0) => { const pv = pv0 || "top"; return pv === "left" ? "0% 50%" : pv === "right" ? "100% 50%" : pv === "bottom" ? "50% 100%" : "50% 0%"; };
// Which stored-rotation sign sweeps the HAND forward — same convention the vertical arms always
// used (-forward for a top pivot), extended to the horizontal ones.
export const armPivotSign = (pv0) => { const pv = pv0 || "top"; return (pv === "bottom" || pv === "right") ? 1 : -1; };
// Absolute stored rot that points the arm LEVEL/extended forward (ranged aim hold) — matches the
// -90/90 the vertical arms always used; a left-pivot arm already points forward (0), a right-pivot
// one points backward so 180 extends it forward on screen.
export const armAimAbs = (pv0) => { const pv = pv0 || "top"; return pv === "top" ? -90 : pv === "bottom" ? 90 : pv === "left" ? 0 : 180; };
// Absolute stored rot that points the arm straight UP (climbing reach) — matches the 180/0 the
// vertical arms always used.
export const armClimbAbs = (pv0) => { const pv = pv0 || "top"; return pv === "top" ? 180 : pv === "bottom" ? 0 : pv === "left" ? -90 : 90; };
// How far the arms come DOWN from that straight-up reach while pushing off a climb — half way to
// level (armAimAbs), i.e. the shove you'd give a ladder rung to launch yourself up it, rather than
// either hanging on to nothing or snapping back to a neutral hang. Going from the up angle toward
// the level one is +90 in stored rot for every pivot (check it against armClimbAbs/armAimAbs: top
// 180->-90, bottom 0->90, left -90->0, right 90->180 all travel +90 the short way round), so the
// half-way pose is simply the climb angle plus 45.
export const CLIMB_PUSH_OFF_DEG = 45;
export const armPushOffAbs = (pv0) => armClimbAbs(pv0) + CLIMB_PUSH_OFF_DEG;
const leg = (x, y, w, h) => ({ ...rect(x, y, w, h), limb: "leg" }); // flagged so the walk/climb cycle animates it

const DEFAULT_BODY = {
  front: [rect(60, 88, 80, 102), rect(72, 34, 56, 56), arm(140, 94, 20, 82, "top"), leg(102, 188, 28, 72)],
  back: [rect(60, 88, 80, 102), rect(72, 34, 56, 56), arm(140, 94, 20, 82, "top"), leg(102, 188, 28, 72)],
  // Side used to only span 24% of the canvas width (a realistic but paper-thin human profile) —
  // widened to 85% so the visible body actually fills the (aspect-locked, necessarily wide)
  // hitbox instead of leaving a huge margin on both sides.
  side: [leg(52, 188, 94, 72), rect(15, 88, 170, 102), arm(70, 96, 55, 80, "top"), rect(44, 34, 119, 56)],
  up: [rect(60, 88, 80, 102), rect(72, 34, 56, 56), arm(134, 36, 18, 70, "bottom"), leg(102, 188, 28, 72)],
  crouch: [rect(60, 118, 80, 74), rect(72, 70, 56, 50), arm(140, 124, 18, 60, "top"), leg(104, 188, 30, 42)],
};
// --- Skin tone -------------------------------------------------------------------------------
// A "skin" asset is drawn art (hair/eyes/teeth) laid OVER a body — the flesh colour itself lives
// on the BODY's pieces, which is why the skin palette could never change it. A skin may now
// carry a `tone`: when the skin is worn, every body piece whose colour is in the flesh-hue
// family (warm hue near the default #e2b48c, reasonably saturated, not near-black — so shading
// shades like #c98f63 come along, while hair #2b2b2b, lips #b0504f and eye whites stay put) is
// remapped by the per-channel ratio tone/default. That keeps the body's light/shadow flesh
// relationship intact instead of flattening it to one colour.
const _hexRgb = (h) => { const s = String(h || "").replace("#", ""); if (s.length < 6) return null; const v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; return v.some(isNaN) ? null : v; };
const _rgbHex = (r) => "#" + r.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");
const _hueSat = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; const s = mx === 0 ? 0 : d / mx; let h = 0; if (d) { if (mx === r) h = 60 * (((g - b) / d + 6) % 6); else if (mx === g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); } return [h, s, mx]; };
const _SKIN_RGB = [0xe2, 0xb4, 0x8c]; // #e2b48c — the default flesh the ratio is measured against
const _SKIN_HUE = _hueSat(_SKIN_RGB)[0];
export const isFleshColor = (hex) => { const rgb = _hexRgb(hex); if (!rgb) return false; const [h, s, mx] = _hueSat(rgb); return Math.abs(h - _SKIN_HUE) <= 14 && s >= 0.15 && mx >= 60; };
export const skinToneShade = (hex, tone) => { const c = _hexRgb(hex), t = _hexRgb(tone); if (!c || !t) return hex; return _rgbHex(c.map((v, i) => v * t[i] / _SKIN_RGB[i])); };
export const applySkinTone = (bodyAsset, tone) => {
  if (!bodyAsset || !tone || tone.toLowerCase() === "#e2b48c") return bodyAsset;
  const mapAngles = (angles) => { const out = {}; for (const k of Object.keys(angles || {})) out[k] = (angles[k] || []).map((p) => (p.color && isFleshColor(p.color)) ? { ...p, color: skinToneShade(p.color, tone) } : p); return out; };
  return { ...bodyAsset, angles: mapAngles(bodyAsset.angles) };
};
const DEFAULT_HAND = { front: { x: 150, y: 176 }, back: { x: 150, y: 176 }, side: { x: 104, y: 176 }, up: { x: 143, y: 44 }, crouch: { x: 149, y: 182 } };
// The weapon arm pivots around its SHOULDER end. So the shoulder is fixed and the
// hand (the far end, where the weapon snaps) sweeps around it as the arm twists.
// Everything is derived from the arm's live geometry, so the markers, the dressed
// export, and the gameplay rig can never drift out of sync — including under twist.
export const armOf = (list) => (list || []).find((p) => p.role === "weaponArm") || null;
// The arm an ENEMY should aim/attach a weapon to. If it was drawn with a real weapon arm
// (role:"weaponArm" — i.e. 💪 Has arms was toggled), use that, unchanged. But most enemies are
// drawn WITHOUT that flag, so armOf() returns null — and the render's arm-lift + weapon-attach
// both silently no-op, which is exactly why "enemies with guns never lift their arm and shoot".
// In that case synthesize a stand-in arm anchored at the enemy's upper body, so a ranged enemy
// can still raise it and fire a visible, correctly-placed shot. Marked __synthArm so the render
// knows it isn't a real drawn piece (it must NOT try to attach the gun to a body-part that isn't
// there in a way that looks wrong — it just gives the aim geometry + hand point).
export const enemyAimArm = (blocks) => {
  const real = armOf(blocks);
  if (real) return real;
  const list = (blocks || []).filter((b) => !b.isHitbox && !b.isMuzzle);
  if (!list.length) return null;
  // Anchor the synthetic arm at the upper-body: use the overall bounding box, place a short arm
  // reaching forward from roughly shoulder height (upper third) at the front edge of the body.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of list) { minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h); }
  const bw = maxX - minX, bh = maxY - minY;
  const w = Math.max(12, Math.round(bw * 0.28)), h = Math.max(40, Math.round(bh * 0.42));
  const shoulderY = minY + bh * 0.30;            // upper third = shoulder height
  const cx = minX + bw / 2;
  return { id: "__enemyAimArm", __synthArm: true, kind: "rect", role: "weaponArm", limb: "arm",
    x: Math.round(cx - w / 2), y: Math.round(shoulderY), w, h, armPivot: "top", rot: 0,
    color: "transparent" }; // invisible: it exists only to carry the aim geometry + hand point
};
const rotatePt = (pt, c, deg) => {
  if (!deg) return { x: pt.x, y: pt.y };
  const r = deg * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
  const dx = pt.x - c.x, dy = pt.y - c.y;
  return { x: Math.round(c.x + dx * cs - dy * sn), y: Math.round(c.y + dx * sn + dy * cs) };
};
const armRig = (a) => {
  if (!a) return null;
  const shoulder = armShoulderPoint(a);          // pivot — stays put as the arm twists
  const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
  const far = { x: Math.round(2 * cx - shoulder.x), y: Math.round(2 * cy - shoulder.y) }; // hand end — the opposite side, sweeps around the shoulder
  return { shoulder: { x: Math.round(shoulder.x), y: Math.round(shoulder.y) }, hand: rotatePt(far, shoulder, a.rot || 0) };
};
const DEFAULT_SHOULDER = (() => { const o = {}; for (const ang of ANGLES) { const r = armRig(armOf(DEFAULT_BODY[ang])); o[ang] = r ? r.shoulder : { x: 100, y: 100 }; } return o; })();
// Rigidly attaches already-baked weapon pieces to the CURRENT weapon-arm piece. Translates the
// weapon's own guide-hand reference point onto the arm's current hand position, then — if the
// arm has rotated any further than baseArmRot (its rotation when the attachment offset was
// last "neutral", e.g. the rest pose) — rotates every weapon piece around the arm's shoulder
// (the pivot, which doesn't move with rotation) by that same delta. This is what makes the
// weapon track the arm through climbing, swinging, or any other runtime rotation, instead of
// freezing wherever it was when first composed.
export const attachWeaponBlocks = (weaponPieces, curArm, guideHand, baseArmRot) => {
  const rig = armRig(curArm);
  if (!rig) return weaponPieces;
  const deltaRot = (curArm.rot || 0) - (baseArmRot || 0);
  // A single block happened to look fine translated-only (rig.hand already reflects the arm's
  // CURRENT rotation, so a straight offset gets ITS position right). But a multi-piece weapon —
  // barrel, grip, sight as separate shapes — needs every piece's CENTER swept around the shared
  // grip point as one rigid body, not just shifted by a constant offset and spun individually
  // around its own middle (which is what scattered a complex weapon's shapes apart the moment
  // the arm rotated any real distance, e.g. snapping into the aim pose). So: each piece's center,
  // relative to the weapon's own baked guide-hand point, gets rotated by deltaRot and then placed
  // relative to the LIVE hand point — that's the rigid-body sweep. Adding deltaRot to the piece's
  // own `rot` on top of that is what turns the piece's own orientation to match.
  //
  // MIRRORED pieces (a machete built with mirror:true twins, `_m:true`) render through an extra
  // scaleX(-1) that shapeStyle applies around each piece's OWN center — which visually reverses
  // that piece's rotation direction. So the value the renderer effectively rotates a mirrored
  // piece by is -(rot) (unless mirrorTwist===false pins it), and a mirrored piece's whole local
  // frame is x-flipped. Sweeping every piece's center with the same unsigned deltaRot — as this
  // did before — placed the un-mirrored pieces right but flung each mirrored piece to a different
  // wrong spot, because its placement (rotated +deltaRot) and its rendered orientation (rotated
  // -deltaRot about a flipped center) disagreed. The whole weapon looked like it came apart the
  // instant the arm turned. Fix: sweep each piece's center in the SAME rotational sense the
  // renderer will actually apply to that piece, and add the delta to `.rot` with the matching
  // sign, so placement and rendered orientation stay locked together for mirrored and
  // un-mirrored pieces alike.
  return weaponPieces.map((pc) => {
    // ---- Pivot reconciliation — THE fix for "the machete falls apart the instant I enter the
    // level tester". ----
    // Weapon pieces are usually authored flagged limb:"arm" so they track the arm. In the weapon
    // EDITOR, shapeStyle rotates such a piece around its TOP edge (transform-origin 50% 0%) — that
    // is the picture the user drew and confirmed correct. But we strip limb/role just below (a
    // weapon piece must not reach the body-arm swing/pivot code), so in the level TESTER the exact
    // same piece renders around its CENTER (50% 50%) instead. For a piece with a nonzero baked
    // rotation, rotating about the top edge vs. the center lands the box in two DIFFERENT places,
    // offset by (I - R(rot))·(center→edge vector). Every machete piece has a big rot (180°, 356°,
    // 258°, …), so each shifted by a different amount and the whole weapon scattered — and because
    // this comes from the pivot CHANGE, not from arm rotation, it's visible even standing still
    // (deltaRot 0), which is exactly what the bug report shows. Pre-shift the box by that offset
    // so center-pivot rendering reproduces the identical on-screen result the editor showed.
    const wasTopPivot = (pc.role === "weaponArm" || (pc.limb === "arm" && !pc._isShoe));
    let bx = pc.x, by = pc.y;
    if (wasTopPivot) {
      const pvv = pc.armPivot || "top"; // center→shoulder-edge vector along the piece's own unrotated axes (4-way)
      const vx = pvv === "left" ? -pc.w / 2 : pvv === "right" ? pc.w / 2 : 0;
      const vy = pvv === "top" ? -pc.h / 2 : pvv === "bottom" ? pc.h / 2 : 0;
      const r0 = (pc.rot || 0) * Math.PI / 180, c0 = Math.cos(r0), s0 = Math.sin(r0);
      // box shift = (I - R(rot)) · v
      bx += vx - (vx * c0 - vy * s0);
      by += vy - (vx * s0 + vy * c0);
    }
    // sign of the rotation the RENDERER applies to this piece: a mirrored twin's scaleX(-1)
    // negates it (matching shapeStyle's `mirrored ? -(rot) : rot` when mirrorTwist!==false).
    const renderSign = (pc._m && pc.mirrorTwist !== false) ? -1 : 1;
    const pieceDelta = deltaRot * renderSign;
    const rad = pieceDelta * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    // offset of the piece center from the grip, in the piece's rendered frame: a mirrored piece
    // is x-flipped about the grip, so its horizontal offset reads negated.
    const rawCx = bx + pc.w / 2 - guideHand.x, rawCy = by + pc.h / 2 - guideHand.y;
    const cx = (pc._m ? -rawCx : rawCx), cy = rawCy;
    const rx0 = cx * cos - cy * sin, ry0 = cx * sin + cy * cos;
    const rx = (pc._m ? -rx0 : rx0); // flip the swept offset back out of the mirrored frame
    const newCx = rig.hand.x + rx, newCy = rig.hand.y + ry0;
    // limb/role flags are stripped here: a weapon piece flagged limb:"arm" in its own designer
    // (so it visibly tracks the arm) must NOT reach the renderer that way — shapeStyle gives
    // limb:"arm" pieces a top-edge transform origin (body-arm shoulder pivot), while this
    // function's rigid-body math places pieces assuming center rotation. Two different pivots
    // meant every piece drifted by its own height-dependent offset as the arm turned — the gun
    // visibly pulling apart, worse the further the arm rotated. It also keeps the walk/climb/aim
    // arm overlays from ever re-rotating weapon art a second time.
    return { ...pc, limb: undefined, role: undefined, x: newCx - pc.w / 2, y: newCy - pc.h / 2, rot: (pc.rot || 0) + pieceDelta, _isWeapon: true };
  });
};
// Hitboxes and the arm trajectory:
// A weapon's damage box rides the swinging arm automatically — the drawn hitbox piece(s) are just
// ordinary weapon pieces flagged isHitbox, so attachWeaponBlocks sweeps them around the grip with
// everything else and they already follow the whole swing arc. The only friction was having to
// DRAW a hitbox into every pose of every per-body variant. weaponHitboxPieces removes that: if the
// weapon's own art (this pose/variant) already contains hitbox piece(s), those win — draw one right
// over the blade for precise reach. If it contains NONE, we synthesize one from the bounding box of
// the weapon's actual drawn art, so an un-boxed weapon still lands hits along the same trajectory
// (roughly "the whole blade is the hitbox") instead of doing nothing. Bare-handed (no weapon) keeps
// its small fist box, handled at the call site.
export const weaponHitboxPieces = (bakedWeaponArt) => {
  const drawn = (bakedWeaponArt || []).filter((p) => p.isHitbox);
  if (drawn.length) return drawn;
  const art = (bakedWeaponArt || []).filter((p) => !p.isHitbox && !p.isMuzzle);
  if (!art.length) return [];
  // AABB of the art in the piece's own layout space. Rotated pieces still contribute only their
  // upright box here — a deliberately generous, simple auto-box; the user draws an explicit hitbox
  // when they want it tight to a rotated blade.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of art) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x + p.w); maxY = Math.max(maxY, p.y + p.h); }
  return [{ id: "autoHit", kind: "rect", x: minX, y: minY, w: maxX - minX, h: maxY - minY, isHitbox: true }];
};
// The MUZZLE: where a ranged weapon's shots actually come out of. It's just another weapon
// piece, flagged isMuzzle — so attachWeaponBlocks sweeps it around the grip exactly like the
// blade/barrel art and the hitbox already are, meaning the spawn point automatically tracks
// the arm through aiming, walking, crouching and any future arm pose, with no separate math to
// keep in sync. Never drawn (every finished-look render site filters it out, same as isHitbox)
// and never counted as art (see weaponHitboxPieces above — an auto-hitbox that swallowed a
// muzzle sitting out at the barrel tip would balloon to cover the empty space between them).
// Returns the ALREADY-ATTACHED piece's centre in the character's own 200x260 layout space, or
// null when the weapon has no muzzle drawn — the caller then keeps its old default spawn point,
// so a weapon made before this existed still fires from roughly the chest as it always did.
export const muzzleLocalPoint = (attachedWeaponPieces) => {
  const m = (attachedWeaponPieces || []).filter((p) => p.isMuzzle);
  if (!m.length) return null;
  const p0 = m[0];
  return { x: p0.x + p0.w / 2, y: p0.y + p0.h / 2 };
};
// Which pose array a weapon should render at the moment its Fire animation plays. A weapon
// whose Fire state was never drawn for this pose has an EMPTY fire array — and baking that
// produced no pieces at all, so the weapon silently disappeared for the few frames between the
// swing's impact and the end of its recover phase. That's the "the fire animation doesn't work
// on melee weapons" report: it wasn't that the swap never happened, it's that it swapped to
// nothing. Fall back to the Rest art for that pose, so an un-drawn Fire state simply means "the
// weapon looks the same while swinging" instead of "the weapon blinks out".
export const weaponFireArt = (states, ang) => {
  const rest = (states && states.rest) || blankAngles();
  const fire = (states && states.fire) || blankAngles();
  return (fire[ang] || []).length ? fire : rest;
};
// When the weapon's Fire pose REPLACES its Rest pose. One rule, shared by the player and by
// enemies, so the two can never drift apart.
//   Ranged — the instant the trigger is pulled, for the whole firing window. That's what makes a
//     drawn recoil / slide-back / muzzle-flash / open-breech frame actually read as a shot.
//   Melee  — from the START of the strike phase (the downswing) through the recover, i.e. the
//     whole second half of the swing. It used to swap only at the impact angle — the last quarter,
//     ~3 frames, which flashed by too fast to ever read as a slash. Showing it during the raise
//     still reads as firing before the swing has gone anywhere, so the windup stays on Rest.
// Either way it's a REPLACEMENT — Rest is not drawn underneath, so nothing is ever doubled up.
// An UNARMED swing never counts, whatever is in your hand. The pistol-whip (Q/V with a gun) rides
// the same p.firing channel a shot does, so a ranged weapon was swapping to its Fire art — recoil,
// muzzle flash, an open breech — for a strike that fires no round at all. The gun stays on Rest
// through a whip now; the flag is on the swing, so nothing else has to know about it.
export const weaponPoseFired = (isRangedWeapon, firing) => !!firing && !firing.unarmed && (!!isRangedWeapon || (firing.t / firing.dur) >= MELEE_WINDUP_FRAC);
// How long a ranged shot holds its Fire pose. Was 16 frames (~0.27s), which read as a flash rather
// than a shot you could see — a drawn recoil or a bow at full draw barely registered before
// snapping back. 30 frames is half a second: long enough to actually read the pose, still short
// enough that it never gates the next shot (re-firing is limited by the fire-rate cooldown, not by
// this, so a fast weapon still fires at its own rate straight through the pose).
export const RANGED_FIRE_POSE_FRAMES = 30;
// Should the arm stay LOCKED in the raised aim/fire pose this frame? Holding Fire keeps it up, even
// mid-reload. Previously `reloading` cancelled aiming outright, so a one-shot weapon like a bow
// (clipSize 1, which auto-reloads the instant it fires) raised the arm for a single frame and then
// dropped it for the whole reload — holding F did nothing. You're still drawing the bow while it
// reloads, so the pose should hold. Climbing still overrides everything (both hands are busy), and
// letting go of Fire mid-reload still lowers the arm.
// An UNARMED swing is not an aim: the pistol-whip shares the p.firing channel, so holding the aim
// pose through one made the whip read as "raise the gun for a fifth of a second" instead of a
// strike. It plays the melee swing arc instead (see meleeSwinging), gun still gripped and riding
// the arm round.
export const armHoldsAimPose = (isRangedWeapon, climbing, fireHeld, aimUp, aimDown, firing) =>
  !!isRangedWeapon && !climbing && (!!fireHeld || !!aimUp || !!aimDown || (!!firing && !firing.unarmed));
// --- Ranged weapon: fire rate, clip, reload -------------------------------------------------
// Everything below is a pure function over a small { clip, ammo, cd, reloadT } record so the
// Playtest loop only has to hold one ref and the rules stay testable outside the browser.
// clip 0 means "unlimited ammo" — no clip, no reload, fire rate only.
export const DEFAULT_FIRE_RATE = 3;    // shots per second
export const DEFAULT_CLIP_SIZE = 6;    // rounds before a reload
export const DEFAULT_RELOAD_TIME = 1.2; // seconds
// Frames are the loop's native unit (dtMul makes them real-time), so both convert at 60fps.
export const weaponFireCooldownFrames = (fireRate) => Math.max(1, Math.round(60 / Math.max(0.1, fireRate || DEFAULT_FIRE_RATE)));
// BURST FIRE. One trigger pull sends a short salvo instead of a single shot. `burst` is how many
// rounds that salvo is; the shots inside it are spaced by burstDelay seconds, which is a separate,
// much tighter clock than the weapon’s fire RATE — the rate still governs how soon the next PULL
// is allowed, so a 3-round burst weapon at 3/sec fires three quick rounds and then waits, rather
// than tripling its damage output. Capped at 10 so a stray value can’t empty a magazine in a frame.
export const DEFAULT_STUN_SECS = 1; // seconds a freshly added Stun ability freezes for
export const DEFAULT_BURST = 1;
export const DEFAULT_BURST_DELAY = 0.06;
export const burstShotCount = (burst) => Math.max(1, Math.min(10, Math.round(burst ?? DEFAULT_BURST)));
export const burstDelayFrames = (burstDelay) => Math.max(1, Math.round((burstDelay ?? DEFAULT_BURST_DELAY) * 60));
// Is another round of the CURRENT burst due this frame? It bypasses the fire-rate cooldown (that
// gates the next pull, not the inside of a burst) but never the magazine: a burst that runs the
// clip dry simply stops there, and a reload cancels whatever is left of it.
export const burstShotDue = (burstLeft, burstT, ammo) =>
  (burstLeft || 0) > 0 && (burstT || 0) <= 0 && !!ammo && ammo.reloadT <= 0 && (ammo.clip <= 0 || ammo.ammo > 0);
// Fire mode is an ability choice, not an always-on weapon setting:
//   plain ranged weapon = one shot per press
//   Burst Fire          = one press commits a configured salvo
//   Full Auto           = holding Fire repeats at the normal fire-rate cooldown
// Burst wins defensively if a malformed/imported weapon has both flags; the ability registry keeps
// newly edited weapons mutually exclusive.
export const weaponFireMode = (weapon) => weapon && weapon.burstFire ? "burst" : weapon && weapon.fullAuto ? "auto" : "semi";
export const rangedTriggerWantsFire = (fireHeld, wasFire, weapon) =>
  weaponFireMode(weapon) === "auto" ? !!fireHeld : !!fireHeld && !wasFire;
export const weaponBurstShotCount = (weapon) => weaponFireMode(weapon) === "burst" ? burstShotCount(weapon && weapon.burst) : 1;
// Before firing modes were abilities, saved weapons had neither flag. Missing flags must now mean
// the clean default — semi-auto — rather than silently granting Full Auto to every old weapon.
// The only legacy behavior worth inferring is an explicitly configured multi-round burst.
export const migratedWeaponFireModes = (weapon) => {
  const legacy = weapon && weapon.burstFire === undefined && weapon.fullAuto === undefined;
  if (legacy) {
    const burstFire = burstShotCount(weapon.burst) > 1;
    return { burstFire, fullAuto: false };
  }
  return { burstFire: !!(weapon && weapon.burstFire), fullAuto: !!(weapon && weapon.fullAuto) };
};
// Intelligence scales how fast a magazine goes back in: 5 is neutral, and each direction reaches
// 25% at the end of the stat's range — Int 1 reloads 25% SLOWER, Int 10 25% faster. The two sides
// use their own slope because the stat isn't symmetric about 5 (1..5 is four points, 5..10 is
// five), so both ends land on exactly 25% instead of one side overshooting.
export const RELOAD_INT_SWING = 0.25;
export const reloadIntelligenceMultiplier = (intelligence) => {
  const i = Math.max(1, Math.min(10, intelligence ?? 5));
  if (i < 5) return 1 + RELOAD_INT_SWING * ((5 - i) / 4);
  if (i > 5) return 1 - RELOAD_INT_SWING * ((i - 5) / 5);
  return 1;
};
// `intelligence` is optional so every existing caller keeps the unscaled timing; pass it to get
// the stat applied. Still floored at one frame so a genius can never reload instantaneously.
export const weaponReloadFrames = (reloadTime, intelligence) =>
  Math.max(1, Math.round((reloadTime ?? DEFAULT_RELOAD_TIME) * 60 * reloadIntelligenceMultiplier(intelligence)));
export const newWeaponAmmo = (clipSize) => { const clip = Math.max(0, clipSize || 0); return { clip, ammo: clip, cd: 0, reloadT: 0, reloadTotal: 0 }; };
export const canFireNow = (w) => !!w && w.reloadT <= 0 && w.cd <= 0 && (w.clip <= 0 || w.ammo > 0);
export const consumeShot = (w, cdFrames) => ({ ...w, ammo: w.clip > 0 ? w.ammo - 1 : w.ammo, cd: cdFrames });
export const needsReload = (w) => !!w && w.clip > 0 && w.ammo <= 0 && w.reloadT <= 0;
// reloadTotal remembers how long THIS reload is, so the progress bars read the real figure —
// Intelligence-scaled, buffs included — instead of recomputing it and quietly disagreeing.
export const startReload = (w, reloadFrames) => (!w || w.reloadT > 0 || w.clip <= 0 || w.ammo >= w.clip) ? w : { ...w, reloadT: reloadFrames, reloadTotal: reloadFrames };
export const advanceWeapon = (w, dt) => {
  if (!w) return w;
  const cd = Math.max(0, w.cd - dt);
  let reloadT = w.reloadT, ammo = w.ammo;
  if (reloadT > 0) { reloadT = Math.max(0, reloadT - dt); if (reloadT === 0) ammo = w.clip; }
  return { ...w, cd, reloadT, ammo };
};
// AI-held guns reload themselves as soon as their magazine is empty. The player has an explicit
// reload key (and Fire-on-empty), but enemies have no input edge to trigger that action, so their
// per-frame timer step owns the automatic transition into the gun's configured reload duration.
export const advanceAutoReloadWeapon = (w, dt, reloadFrames) => {
  const next = advanceWeapon(w, dt);
  return needsReload(next) ? startReload(next, reloadFrames) : next;
};
const bodyRig = (b, ang) => {
  const r = b && b.angles && armRig(armOf(b.angles[ang]));
  return r || { shoulder: (b && b.shoulder && b.shoulder[ang]) || DEFAULT_SHOULDER[ang], hand: (b && b.hand && b.hand[ang]) || DEFAULT_HAND[ang] };
};
// Recompute the cached hand/shoulder from the arm so downstream (assembler, export) stays correct.
const withRig = (a) => {
  if (!a || (a.type !== "body" && a.type !== "enemy") || !a.angles) return a;
  const hand = {}, shoulder = {};
  for (const ang of ANGLES) { const r = bodyRig(a, ang); hand[ang] = r.hand; shoulder[ang] = r.shoulder; }
  return { ...a, hand, shoulder };
};
const blankAngles = () => ({ front: [], back: [], side: [], up: [], crouch: [] });
// Assets that get a per-body "fit" (a separate saved layout per body, switchable via the guide
// picker, tracked by confirmedFits so an unconfirmed preview never silently overwrites a real
// save). Originally skin/equipment only — weapons need this exactly as much (see fitVariant
// helpers below): a machete sized for one body's arm is not automatically right for another's.
const HAS_FIT_VARIANTS = (a) => !!a && (a.type === "skin" || a.type === "equipment" || a.type === "weapon");
// A "fit variant" is what gets stored per body under a.variants[bodyId]. For skins/equipment
// that's just a flat 5-pose angles object. A weapon's fit additionally needs its own hand/grip
// reference point (a.hand) — attachWeaponBlocks translates the weapon relative to THAT point
// onto the live arm, so different bodies' weapons need their own grip point as much as their
// own piece geometry; bundling both together is what lets a per-body weapon fit round-trip
// through switchGuideFit/syncFit/copyFitToOtherBodies via the exact same code paths skins use.
const blankFitVariant = (type) => type === "weapon" ? { states: { rest: blankAngles(), fire: blankAngles() } } : blankAngles();
const fitVariantEmpty = (type, v) => type === "weapon" ? (anglesEmpty(v && v.states && v.states.rest) && anglesEmpty(v && v.states && v.states.fire)) : anglesEmpty(v);
// Weapon pieces normally all render on top of the whole body (they're simply concatenated
// after it). A piece flagged behindArm should tuck behind the arm specifically — not the whole
// body — so it's spliced in right before the arm piece in the body's own list instead of being
// appended at the very end with the rest of the weapon. Falls back to plain concatenation if no
// arm piece is found (e.g. an armless enemy holding nothing).
// A CUTTER has to travel with the piece it cuts. Cutters only punch through pieces in the same
// contiguous same-source run (see cutterRuns / cutterLayerSegments), so splitting the weapon into
// behind-arm and front-arm halves with the whole body spliced between them could tear a cutter
// away from its target: a bow drawn as a dark limb flagged behindArm plus an unflagged cutter
// carving the bow's curve out of it ended up as limb | body | cutter, three separate runs, and the
// cut silently did nothing — the bow rendered as a solid filled half-circle, a big "D". In the
// editor the two sit next to each other in one list, so it looked right there and only broke in
// play. A cutter now inherits the behindArm grouping of the nearest piece BELOW it (the piece it
// is cutting), which keeps the pair adjacent in whichever half that piece lands in.
export const groupWeaponBlocksByArm = (weaponBlocks) => {
  const behind = [], front = [];
  let carry = false; // behindArm of the last non-cutter piece seen
  for (const p of weaponBlocks || []) {
    if (p.isCutter) { (carry ? behind : front).push(p); continue; }
    carry = !!p.behindArm;
    (carry ? behind : front).push(p);
  }
  return { behind, front };
};
export const mergeWeaponBlocks = (bodyBlocks, weaponBlocks) => {
  const armIdx = (bodyBlocks || []).findIndex((b) => b.role === "weaponArm");
  const { behind, front } = groupWeaponBlocksByArm(weaponBlocks);
  if (armIdx === -1 || !behind.length) return (bodyBlocks || []).concat(weaponBlocks);
  return bodyBlocks.slice(0, armIdx).concat(behind, bodyBlocks.slice(armIdx)).concat(front);
};

// Swap every occurrence of one fill color for another across an ENTIRE asset — every piece, in
// all 5 poses, in the live .angles, in a weapon's rest/fire states, and in every per-body fit
// under .variants. Only `p.color` is touched: outlineColor, fx.glowColor and an emoji's tint are
// deliberately left alone (a near-miss shade stays a near-miss shade — Blake finishes those by
// hand). Matching is case-insensitive on the hex so "#45552A" and "#45552a" are the same color.
// The walk itself lives in one place because more than one "…everywhere" action needs it: the
// recolor below and the brightness/glow/fade restyle under it must visit the exact same pieces,
// or "everywhere" would mean two different things depending on which control you touched.
const mapPieces = (arr, fn) => (arr || []).map(fn);
const mapAngles = (ang, fn) => { if (!ang) return ang; const o = {}; for (const k of Object.keys(ang)) o[k] = mapPieces(ang[k], fn); return o; };
const mapFitVariant = (v, fn) => (v && v.states) ? { ...v, states: { ...v.states, rest: mapAngles(v.states.rest, fn), fire: mapAngles(v.states.fire, fn) } } : mapAngles(v, fn);
const mapAssetPieces = (a, fn) => {
  const out = { ...a };
  if (out.angles) out.angles = mapAngles(out.angles, fn);
  if (out.states) out.states = { ...out.states, rest: mapAngles(out.states.rest, fn), fire: mapAngles(out.states.fire, fn) };
  if (out.variants) { const v = {}; for (const k of Object.keys(out.variants)) v[k] = mapFitVariant(out.variants[k], fn); out.variants = v; }
  return out;
};
// WHICH pieces "this colour" means, resolved to piece IDs and frozen.
//
// Matching purely on the colour is only correct for the FIRST step of an edit. The moment the
// group's new shade lands on one another piece already wears, that piece is indistinguishable
// from a group member and every later step drags it along too. That is the "Change this colour
// everywhere repainted blocks that weren't that colour" bug, and it needs no second click to
// happen: a native <input type="color"> fires onChange continuously while it is dragged, so one
// slow drag from blue to red walks through hundreds of intermediate shades. Pass through the exact
// red the boots are already painted and the boots silently join the shirt's group, then ride it to
// wherever the drag finishes — a colour that was never the one being changed. Ending a drag ON a
// shade something else already wore does the same thing to the NEXT edit.
//
// So the group is resolved once, up front, and every following step of the same edit repaints
// those ids rather than re-asking what is currently that colour. Ids are stable across the whole
// asset (every pose, both weapon states, every per-body fit), which is also why a lagging closure
// can no longer mis-target: an id means the same piece no matter which render resolved it.
// `from` is kept alongside, tracking the group's CURRENT colour, purely so pieces old enough to
// predate ids still follow a chain by colour exactly as they always did.
const forEachAngles = (ang, fn) => { if (ang && typeof ang === "object") for (const k of Object.keys(ang)) for (const p of (ang[k] || [])) if (p) fn(p); };
export const assetColorGroup = (a, from) => {
  const f = typeof from === "string" ? from.toLowerCase() : "";
  const ids = new Set();
  if (a && typeof a === "object" && f) {
    const add = (p) => { if (typeof p.color === "string" && p.color.toLowerCase() === f && p.id) ids.add(p.id); };
    forEachAngles(a.angles, add);
    if (a.states) { forEachAngles(a.states.rest, add); forEachAngles(a.states.fire, add); }
    if (a.variants) for (const k of Object.keys(a.variants)) { const v = a.variants[k]; if (v && v.states) { forEachAngles(v.states.rest, add); forEachAngles(v.states.fire, add); } else forEachAngles(v, add); }
  }
  return { ids, from: f };
};
const inColorGroup = (g, p) => !!g && typeof p.color === "string" && (p.id ? g.ids.has(p.id) : p.color.toLowerCase() === g.from);
// Swap the group's fill colour across the ENTIRE asset — every piece, in all 5 poses, in the live
// .angles, in a weapon's rest/fire states, and in every per-body fit under .variants. Only
// `p.color` is touched: outlineColor, fx.glowColor and an emoji's tint are deliberately left alone
// (a near-miss shade stays a near-miss shade — Blake finishes those by hand).
// The walk itself lives in one place because more than one "…everywhere" action needs it: the
// recolor here and the brightness/glow/fade restyle under it must visit the exact same pieces,
// or "everywhere" would mean two different things depending on which control you touched.
export const recolorAssetGroup = (a, g, to) => {
  if (!a || !g || typeof to !== "string") return a;
  return mapAssetPieces(a, (p) => (inColorGroup(g, p) ? { ...p, color: to } : p));
};
// "Replace this colour everywhere" is about the COLOUR, not just its hex: dimming one leaf
// should dim every leaf that shares its green, the same way repainting one repaints them all.
// So the brightness/glow/fade sliders reuse the toggle and land here — same pieces
// recolorAssetGroup would touch, but patching fx instead of color. The patch merges over
// defaultFx() so a piece that never had fx of its own gets a complete one rather than a
// half-filled object.
export const restyleAssetGroup = (a, g, patch) => {
  if (!a || !g || !patch) return a;
  return mapAssetPieces(a, (p) => (inColorGroup(g, p) ? { ...p, fx: { ...defaultFx(), ...(p.fx || {}), ...patch } } : p));
};
// The one-shot forms: resolve the group and apply it in a single call. Matching is
// case-insensitive on the hex so "#45552A" and "#45552a" are the same colour. Correct on its own
// for a single click; a control that fires repeatedly must hold the group across its steps
// instead (see colorGroupFor / palGroup) or it re-opens the drift described above.
export const recolorAsset = (a, from, to) => (typeof from === "string" ? recolorAssetGroup(a, assetColorGroup(a, from), to) : a);
export const restyleAsset = (a, from, patch) => (typeof from === "string" ? restyleAssetGroup(a, assetColorGroup(a, from), patch) : a);
// Every distinct fill colour this asset uses, with how many pieces use each, most-used first
// (so a character's base skin tone — the largest area — tends to sit at the top). Walks the exact
// same places recolorAsset paints (every pose, weapon rest/fire states, and every body fit under
// .variants), deduping arrays by reference so the a.angles alias of the active variant is not
// double-counted. Outline/glow colours and emoji tints are ignored on purpose — recolorAsset
// leaves those alone too, so the palette only lists what a tap here can actually remap.
export const collectAssetColors = (a) => {
  if (!a || typeof a !== "object") return [];
  const counts = new Map(), seen = new Set();
  const addArr = (arr) => { if (!Array.isArray(arr) || seen.has(arr)) return; seen.add(arr); for (const p of arr) { if (p && typeof p.color === "string") { const k = p.color.toLowerCase(); counts.set(k, (counts.get(k) || 0) + 1); } } };
  const addAngles = (ang) => { if (ang && typeof ang === "object") for (const k of Object.keys(ang)) addArr(ang[k]); };
  const addVariant = (v) => { if (v && v.states) { addAngles(v.states.rest); addAngles(v.states.fire); } else addAngles(v); };
  addAngles(a.angles);
  if (a.states) { addAngles(a.states.rest); addAngles(a.states.fire); }
  if (a.variants) for (const k of Object.keys(a.variants)) addVariant(a.variants[k]);
  return [...counts.entries()].map(([color, count]) => ({ color, count })).sort((x, y) => y.count - x.count || (x.color < y.color ? -1 : 1));
};

// Saving under the same name updates the loaded asset's id. Renaming a loaded asset is "Save As":
// it receives a fresh id, leaving the original stored asset untouched. Names still are not unique
// identifiers — independently-created assets with the same name remain separate entries, and
// backup restore continues to replace only exact `asset:<id>` matches.
export const resolveSaveTarget = (list, payload, freshId) => {
  const entries = list || [];
  const existing = entries.find((x) => x.id === payload.id);
  if (existing && existing.name !== payload.name) return { id: freshId || uid(), mode: "rename", sourceId: payload.id };
  return { id: payload.id, mode: existing ? "update" : "create" };
};

// A saved Dressed Look embeds full copies of its components, so editing the source shirt used to
// leave every look wearing a stale copy of it until it was re-equipped and re-saved by hand. Given
// a freshly-saved asset, report whether this look wears it, and splice the new copy in.
export const lookWearsAsset = (look, assetId) => {
  const r = look && look.recipe; if (!r || !assetId) return false;
  if (r.bodyId === assetId || r.skinId === assetId || r.weaponId === assetId) return true;
  return Object.values(r.slots || {}).some((v) => v === assetId);
};
export const swapLookComponent = (look, updated) => {
  const r = look.recipe, c = { ...(look.components || {}) };
  const fresh = JSON.parse(JSON.stringify(updated));
  if (r.bodyId === updated.id) c.body = fresh;
  if (r.skinId === updated.id) c.skin = fresh;
  if (r.weaponId === updated.id) c.weapon = fresh;
  const slots = r.slots || {};
  for (const s of Object.keys(slots)) if (slots[s] === updated.id) c.equipment = { ...(c.equipment || {}), [s]: fresh };
  return { ...look, components: c };
};

const TYPES = {
  body: { label: "Body", icon: "🧍", blurb: "The shape/hitbox. Has the weapon arm, shoulder pivot + hand point." },
  skin: { label: "Skin", icon: "🎨", blurb: "Skin tone, face & hair — drawn on a body." },
  weapon: { label: "Weapon", icon: "⚔️", blurb: "Snaps onto the hand point." },
  enemy: { label: "Enemy", icon: "👹", blurb: "A monster body — shapes only, no clothes/skin. Flag a piece 💪 Arm to let it swing/wield a weapon like Bob." },
  projectile: { label: "Projectile", icon: "🔮", blurb: "A bullet/arrow/bolt — build it once, then load it onto any Ranged weapon. Gets its own hitbox." },
  prop: { label: "Object / Prop", icon: "🌿", blurb: "A piece of scenery — draw it once (pixel art, optionally animated), then place it in a level at any size. Great for a real fire drawn over the fire-hazard symbol." },
  item: { label: "Item", icon: "🧪", blurb: "A single-use pickup — draw it once, then it heals or temporarily boosts a stat when taken. Drops from a pedestal, Binding-of-Isaac style." },
};
// A weapon's wtype is "melee" or "ranged" going forward. Old saves may still say "projectile"
// (what "ranged" used to be called, back when the projectile itself was built INSIDE the
// weapon instead of as its own loadable asset) — migrate() normalizes that to "ranged" on
// load, so nothing downstream needs to know the old name ever existed.
export const isRanged = (wtype) => wtype === "ranged" || wtype === "projectile";
// A THROWABLE (grenade/bomb) is a third weapon type: you throw it with G, it arcs out a distance
// set by its weight vs your Strength, and triggers a landing effect (fire for now) where it hits.
// It's a limited, single-use PICKUP — you carry however many you've found, like Isaac's bombs —
// so it never mounts on the hand like a melee/ranged weapon; it lives only in the throw system.
export const isThrowable = (wtype) => wtype === "throw";
// WEAPON ABILITIES — the optional powers and firing modes a ranged weapon can carry. These live as
// plain flags on the asset; the EDITOR reads
// them from this registry instead of hard-coding one checkbox each. A checkbox per power meant every
// ability was permanently on screen whether or not the weapon had it, which is what made the weapon
// panel a wall of boxes — you pick an ability from a dropdown now, and only the ones actually on the
// weapon take up room. Same registry-drives-the-UI shape EFFECT_TYPES uses for clothing.
//
// `on` / `off` are the exact patches applied when an ability is added or removed, so a
// mutually-exclusive pair is stated once here rather than re-derived in the JSX: a Resurrect staff
// deals no damage at all, so it and Explode can never both be live.
export const WEAPON_ABILITIES = {
  burstFire: {
    icon: "🔫", label: "Burst fire",
    blurb: "One press commits a quick salvo. The normal Fire rate controls when another burst may begin; Burst spacing controls the rounds inside it. Mutually exclusive with Full Auto.",
    on: { burstFire: true, fullAuto: false, burst: 3, burstDelay: DEFAULT_BURST_DELAY }, off: { burstFire: false },
  },
  fullAuto: {
    icon: "🔥", label: "Full auto",
    blurb: "Hold Fire to keep shooting at the weapon's Fire rate until the trigger is released, the magazine empties, or a reload begins. Mutually exclusive with Burst Fire.",
    on: { fullAuto: true, burstFire: false }, off: { fullAuto: false },
  },
  explode: {
    icon: "💥", label: "Explode",
    blurb: "The shot bursts on impact: everything within the blast radius of where it lands takes the weapon's damage, plus an explosion drawn in front from an Object you pick.",
    on: { explode: true, resurrect: false }, off: { explode: false },
  },
  ignoreArmor: {
    icon: "🗡️", label: "Ignore armor",
    blurb: "Its shots bypass the target's Defense entirely — full damage no matter what armour is worn. Back Guard and Crouch Guard still apply.",
    melee: true,
    on: { ignoreArmor: true }, off: { ignoreArmor: false },
  },
  stun: {
    icon: "💫", label: "Stun",
    blurb: "A connecting hit freezes the target for a moment — it can't move or attack. Re-hitting refreshes the timer.",
    melee: true,
    on: { stun: DEFAULT_STUN_SECS }, off: { stun: 0 },
  },
  resurrect: {
    icon: "🔮", label: "Resurrect staff",
    blurb: "Its shot deals no damage — instead it raises a defeated body into a friendly NPC that fights for you. One body can only be raised once.",
    melee: true,
    on: { resurrect: true, explode: false }, off: { resurrect: false },
  },
};
// Which abilities the picker offers for a given weapon type. Burst/Full auto/Explode are things a
// PROJECTILE does, so they stay ranged-only; `melee: true` marks the ones that are really about the
// hit itself and therefore work just as well on a swing. A melee weapon that somehow already
// carries a ranged-only flag (type switched after the fact) still lists it, so it can be removed
// rather than being stuck on invisibly.
export const weaponAbilitiesFor = (wtype, asset) =>
  Object.keys(WEAPON_ABILITIES).filter((k) => isRanged(wtype) || WEAPON_ABILITIES[k].melee || !!(asset && asset[k]));
export const weaponAbilityKeys = (a) => Object.keys(WEAPON_ABILITIES).filter((k) => !!(a && a[k]));
// The poses an asset type actually offers in the editor (and that gameplay can render). Creatures
// (enemies) only ever draw Side, Aim-up, Crouch and their 💀 Death pose — Front/Back would be pure
// wasted work since the game never shows an enemy facing the camera. One source of truth so the
// pose tabs, the reference-copy dropdown and the full "copy to other poses" button all agree.
export const editablePoses = (type, wtype) =>
  type === "weapon" ? (isRanged(wtype) ? ["back", "side", "up", "crouch"] : ["back", "side", "crouch"])
  : type === "projectile" || type === "item" ? ["front"]
  : type === "enemy" ? ["side", "up", "crouch", "attack", "death"]
  : ANGLES;
export const DEFAULT_THROW_WEIGHT = 3;      // 1 (light, flies far) .. 10 (heavy, drops short)
export const DEFAULT_LAND_RADIUS = 1;       // cells of landing effect painted around the impact point (1 = a 3x3 splash)
// Throw distance in BLOCKS. Base 5, +1 every 2 points of Strength (Str 5 baseline -> ~7). Heavier
// throwables fly shorter: each weight point above the light end trims the throw, floored so even a
// boulder still leaves your hand. Weight 3 is treated as the neutral reference so a default
// grenade at Strength 5 throws about the stated 5-block base + strength bonus.
export const throwRangeBlocks = (strength, weight) => {
  const str = strength ?? 5, w = weight ?? DEFAULT_THROW_WEIGHT;
  const base = 5 + Math.floor(str / 2);            // Str 1->5, Str 5->7, Str 10->10
  const weightPenalty = Math.max(0, (w - DEFAULT_THROW_WEIGHT)) * 0.6; // heavier than the reference drops it short
  return Math.max(2, base - weightPenalty);         // never less than a 2-block lob
};
// Launch velocity for a thrown grenade. Given the desired range in PIXELS, gravity g, and a fixed
// launch angle (45°-ish gives a natural arc), solve the projectile-range equation R = v²·sin(2θ)/g
// for v, then split into vx/vy by the facing. So a stronger throw (longer range) simply leaves the
// hand faster; the arc shape stays consistent. Heavier throwables get a slightly flatter, shorter
// arc via the reduced range already baked into throwRangeBlocks.
export const throwLaunchVel = (rangePx, g, face, angleRad) => {
  const ang = angleRad ?? (Math.PI / 4);
  const v = Math.sqrt(Math.max(1, rangePx * g / Math.sin(2 * ang)));
  return { vx: (face || 1) * v * Math.cos(ang), vy: -v * Math.sin(ang) };
};
// ── Throwable payloads: Cluster and Stun ────────────────────
// CLUSTER: on impact the throwable BECOMES several smaller copies of itself, which arc away, land,
// and each pay out the landing effect on their own — so it bursts instead of paying out once where
// it hit. Bomblets are marked so they never cluster again: one generation only, or 4 would become
// 16, then 64, and the level would fill with grenades.
// The fan is deterministic and symmetric — bomblet i takes an even share of the spread from full
// left to full right, all with the same upward pop — so a burst reads as a spray rather than a
// random scatter, and looks the same every throw.
export const DEFAULT_CLUSTER_SCALE = 0.5;
export const CLUSTER_SPREAD_VX = 3.2, CLUSTER_POP_VY = 4;
export const clusterBombletVelocity = (i, count, spread, pop) => {
  const n = Math.max(1, count || 1);
  const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1 = hard left, +1 = hard right, 0 = straight up
  return { vx: t * (spread ?? CLUSTER_SPREAD_VX), vy: -(pop ?? CLUSTER_POP_VY) };
};
// STUN: a landing throwable freezes every living enemy in its blast (the same ep.stun channel a
// stun weapon's hit uses, so the 💫 marker and the can't-move/can't-attack gates all apply
// unchanged). Reach is the landing splash plus one block, so even a 0-splash "point" grenade still
// catches whatever is standing on top of it — a shock grenade that stunned nothing would be a dud.
export const throwStunRadiusCells = (landRadius) => Math.max(0, landRadius || 0) + 1;
// The set of cells a grenade's landing effect covers: a square of the given radius around the
// impact cell (radius 0 = just that one cell, 1 = 3x3, etc.), clamped to the level bounds.
export const landingCells = (r0, c0, radius, rows, cols) => {
  const out = [];
  const rad = Math.max(0, radius | 0);
  for (let r = r0 - rad; r <= r0 + rad; r++) for (let c = c0 - rad; c <= c0 + rad; c++) {
    if (r >= 0 && c >= 0 && r < rows && c < cols) out.push(r + "," + c);
  }
  return out;
};
// A thrown grenade's landing fire should sit ON the ground where it lands, not hang in the air.
// landingCells() paints a full (2r+1)x(2r+1) box centered on impact, so the upper rows float and
// the row inside the block is buried. This keeps only cells that (a) aren't inside a solid block
// and (b) have ground directly beneath them (a block, a ramp, or the level floor) — i.e. the fire
// that actually rests on a surface. cellState(r,c) returns "block" (solid, no fire inside),
// "ground" (a ramp — fire may sit in its mostly-empty cell AND it supports fire above), or null.
export const groundedLandingCells = (r0, c0, radius, rows, cols, cellState) => {
  const rad = Math.max(0, radius | 0), out = [];
  for (let c = c0 - rad; c <= c0 + rad; c++) for (let r = r0 - rad; r <= r0 + rad; r++) {
    if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
    if (cellState(r, c) === "block") continue;
    const below = (r + 1 >= rows) ? "block" : cellState(r + 1, c);
    if (below) out.push(r + "," + c);
  }
  return out;
};
// Build the hazard + fx patch for a grenade landing. With a chosen landPropId the fire is DRAWN by
// that Object/Prop (in front of the player) and the hazard is hidden-in-play but still burns; with
// no prop it stays the plain 🔥 emoji hazard exactly as before. Existing fx at a cell is kept, and
// only newly-created keys are reported back so Stop can strip just the grenade's own fires/props.
export const applyLandingEffect = (hazardIn, fxIn, keys, dps, life, landPropId, propSize) => {
  const hazard = { ...(hazardIn || {}) };
  const fx = { ...(fxIn || {}) };
  const newHazKeys = [], newPropKeys = [];
  for (const key of keys) {
    if (!hazard[key]) newHazKeys.push(key);
    hazard[key] = { kind: "fire", dps, life, ...(landPropId ? { hideInPlay: true } : {}) };
    if (landPropId) {
      const stack = fx[key] ? fx[key].slice() : [];
      stack.push({ kind: "prop", propId: landPropId, solid: false, size: propSize || 1, inFront: true, _thrown: true });
      fx[key] = stack;
      newPropKeys.push(key);
    }
  }
  return { hazard, fx, newHazKeys, newPropKeys };
};
// Undo the above when Playtest stops: delete the grenade-made fires and pull only the _thrown
// props out of their fx stacks, leaving any hand-placed objects sharing that cell intact.
export const stripThrownLanding = (hazardIn, fxIn, hazKeys, propKeys) => {
  let changed = false, hazard = hazardIn, fx = fxIn;
  if (hazKeys && hazKeys.length && hazardIn) { hazard = { ...hazardIn }; for (const key of hazKeys) if (hazard[key]) { delete hazard[key]; changed = true; } }
  if (propKeys && propKeys.length && fxIn) { fx = { ...fxIn }; for (const key of propKeys) { if (!fx[key]) continue; const s2 = fx[key].filter((o) => !o._thrown); if (s2.length) fx[key] = s2; else delete fx[key]; changed = true; } }
  return { hazard, fx, changed };
};
// Projectile launch angle (radians) from the aim direction held at the moment of firing.
// Holding ↑ fully (aimDir -1) switches the player to the dedicated "Aim up" drawn pose (see the
// angle formula in the render section) — the shot itself needs to actually go straight up to
// match, not just partway (the old flat 40°-off-horizontal cap read as firing sideways while
// visibly aiming up). Holding ↓ has no equivalent dedicated pose, just a partial arm dip, so it
// keeps the shallower partial-angle behavior.
export const projectileAimRad = (aimDir) => (aimDir === -1 ? -Math.PI / 2 : aimDir * (Math.PI * 40 / 180));
export const DEFAULT_PROJECTILE_RANGE = 14;
// Idle dangle for a monkey-bars / ledge hang. Speed is radians per 60fps frame (0.05 ≈ one full
// sway every ~2s — a slow pendulum, not a kick). The amplitude is a sideways SHIFT in design-canvas
// px (the sprite is W=200 wide), not an angle: see the o.legSway branch in applyLimbSwing for why a
// translation is the only mirror-safe way to move a leg and everything worn on it as one unit.
export const HANG_SWAY_SPEED = 0.05;
export const HANG_SWAY_PX = 5;
// Range is measured along the aimed flight path in level pixels, never in frames. This keeps the
// configured block count stable when projectile speed changes. The first half has no added drop;
// the second half eases down quadratically so a neutral shot reaches the shooter's firing-time
// ground line exactly at maximum range.
// `rangePx` is no longer a wall the shot vanishes at — it's the distance at which the shot has
// descended to the shooter's firing-time ground line. Past that the SAME quadratic simply keeps
// going (t is no longer clamped at 1), so the projectile carries on falling while its horizontal
// speed is unchanged, and only ground, a target, or the level edge stops it. That's what makes
// height pay: fired off a cliff, the configured range brings it level with where you were standing
// and then it keeps flying and dropping all the way to whatever is actually below.
export const projectileDropAtDistance = (startY, groundY, distance, rangePx) => {
  const safeRange = Math.max(1, rangePx || 1), half = safeRange / 2;
  if (distance <= half) return 0;
  const t = (distance - half) / half;
  return (groundY - startY) * t * t;
};
export const projectilePositionAtDistance = (pr, distance) => {
  const speed = Math.max(0.0001, Math.hypot(pr.vx || 0, pr.vy || 0));
  const d = Math.max(0, distance);
  const time = d / speed;
  return {
    x: pr.startX + pr.vx * time,
    y: pr.startY + pr.vy * time + projectileDropAtDistance(pr.startY, pr.groundY, d, pr.rangePx),
  };
};
// Melee swing timing — shared by both the hit-test geometry (game loop) and the visual arm
// render, which used to each duplicate their own copy of a single symmetric sine sweep. Now a
// deliberate 3-phase motion instead: a WINDUP raising the arm well past its eventual impact
// point (0° → 150°, taking the first half of the swing so the raise actually reads on screen
// instead of flashing by), a short STRIKE dropping it down through the actual impact angle
// (150° → 90°) — reaching the end of this phase is "the fire animation fires", i.e. the moment
// the weapon's own drawn Fire-pose art swaps in (previously that swapped in immediately at the
// very first frame of the button press, which read as firing before the swing had gone
// anywhere) — and a RECOVER phase easing back down to rest (90° → 0°) to finish the swing.
const MELEE_WINDUP_DEG = 150, MELEE_IMPACT_DEG = 90;
const MELEE_WINDUP_FRAC = 0.5, MELEE_STRIKE_FRAC = 0.25; // remaining (1 - both) is the recover phase
export const meleeSwingAngle = (t, dur) => {
  const prog = Math.max(0, Math.min(1, t / dur));
  const windupEnd = MELEE_WINDUP_FRAC, strikeEnd = MELEE_WINDUP_FRAC + MELEE_STRIKE_FRAC;
  if (prog <= windupEnd) return (prog / windupEnd) * MELEE_WINDUP_DEG;
  if (prog <= strikeEnd) return MELEE_WINDUP_DEG + (MELEE_IMPACT_DEG - MELEE_WINDUP_DEG) * ((prog - windupEnd) / (strikeEnd - windupEnd));
  return MELEE_IMPACT_DEG * (1 - (prog - strikeEnd) / (1 - strikeEnd));
};
// True from the instant the swing reaches its 90° impact angle through the end of the recover
// phase — this is the window the weapon's Fire-pose art (and nothing else — hit detection
// itself still just follows wherever the arm/hitbox actually is, every frame, same as before).
export const meleeHasFired = (t, dur) => (t / dur) >= (MELEE_WINDUP_FRAC + MELEE_STRIKE_FRAC);
// Defense reduces incoming damage with DIMINISHING returns and never fully negates it: the
// multiplier is 10 / (10 + Defense). So 10 Defense = half damage (the calibration point), 20 =
// a third, 30 = a quarter — it keeps helping past 10 but the curve flattens and can never reach
// 0 (and incomingPlayerDamage still floors every hit at 1). Defense below 0 is clamped to 0.
// Applied to damage an enemy deals to the player (see the enemy attack logic in the playtest
// physics loop) — armor/equipment defense was always meant to soften exactly this.
export const defenseDamageMultiplier = (def) => 10 / (10 + Math.max(0, def || 0));
export const applyDefense = (rawDamage, def) => rawDamage * defenseDamageMultiplier(def);

// ── What the PLAYER hits for ────────────────────────────────
// THE RULE FOR RANGED: a shot deals the WEAPON's damage. The wielder's BODY stats do not scale
// it — no Strength. What a character is WEARING still does, because that is the whole point of
// gear: a Tag Damage hat matching the gun's category multiplies the shot (folded in when the
// projectile spawns), and taking the hat off takes the boost with it. Intelligence rolls a crit
// for double. That is the complete list.
//
// MELEE is muscle on top of all that: the weapon's damage also rides the wielder's Strength —
// 5 neutral, 1 a fifth, 10 double.
//
// The body/gear distinction is the entire lesson here. Gear is a CHOICE the player makes and can
// undo; a body stat is not. Army Bob's rifle hitting 1.5x harder than Bobette's because of his
// hat is correct and intended. Army Bob's rifle hitting harder because he is a Strength-10 body
// was the bug.
//
// THE BUG, for anyone tempted to "simplify" this again: both ranged hit-tests ran the MELEE
// formula outright, so one 7-damage M16 dealt 14 at Strength 10 and 1 at Strength 1 (7 × 1/5 =
// 1.4, rounded to 1) — a fourteen-fold spread off the body alone. That is why Army Bob one-shot
// what Bobette needed ten hits for. Removing Strength fixed it. Removing the gear multiplier as
// well would NOT have been a further fix, it would have deleted a working feature.
export const playerMeleeDamage = (weaponDamage, strength) => Math.max(1, Math.round((weaponDamage ?? 5) * ((strength ?? 5) / 5)));
// BARE HANDS are a 2-damage weapon — same formula as everything else, just a small base number.
// They used to be the Strength stat used AS the damage (str 10 = 10 damage, no scaling step), and
// that produced a cliff: since armed melee is damage x str/5, bare hands exactly matched a
// 5-damage weapon at EVERY Strength, so anything weaker than 5 damage was strictly worse than
// punching, forever, and a Strength-10 character hit harder with fists than with most of the
// arsenal. Running fists through the same damage x str/5 line fixes that at both ends: a fist is
// now the weakest thing you can swing (str 5 -> 2, str 10 -> 4), and Strength still rewards you
// for it in the same proportion it rewards every other melee weapon.
export const UNARMED_DAMAGE = 2;
// One argument on purpose: `weaponDamage` already carries the weapon's own number and any Tag
// Damage gear multiplier. There is no BODY stat to pass in, and adding one is the bug returning.
export const playerRangedDamage = (weaponDamage) => Math.max(1, Math.round(weaponDamage ?? 5));
// Crit chance for BOTH weapon kinds: 2% per point of Intelligence, capped at 60% so even a maxed
// stat still lands ordinary hits. A crit is always exactly double.
export const critChance = (intelligence) => Math.min(0.6, Math.max(0, (intelligence ?? 5) * 0.02));

// ── Item categories & pedestal search ───────────────────────
// Every "item" (equipment or weapon) can carry up to 3 free-text categories Blake types in
// himself — "T1", "Shirt", "Strong". A pedestal placed in a level searches the saved item pool
// and spawns one at random (Binding-of-Isaac style). The pedestal's own search is 0/1/2 category
// filters (0 = match ANY item) combined with AND (item must carry every listed tag) or OR (at
// least one). Matching is case-insensitive and whitespace-trimmed on both sides.
export const HAS_CATEGORIES = (a) => !!a && (a.type === "equipment" || a.type === "weapon" || a.type === "item");
const normCats = (arr) => (arr || []).map((c) => (typeof c === "string" ? c.trim().toLowerCase() : "")).filter(Boolean);
export const itemMatchesPedestal = (item, cats, logic) => {
  const filters = normCats(cats);
  if (!filters.length) return true; // no filter set = "search all items"
  const itemCats = normCats(item && item.categories);
  const has = (f) => itemCats.includes(f);
  return logic === "and" ? filters.every(has) : filters.some(has);
};
export const pedestalItemPool = (assets, cats, logic) => (assets || []).filter((a) => HAS_CATEGORIES(a) && itemMatchesPedestal(a, cats, logic));
// Which pose to draw an item in when it's displayed on its own (on a pedestal). Front is the right
// choice for equipment and items and stays first — but a WEAPON has no editable front pose at all
// (editablePoses gives a ranged weapon only back/side/up/crouch), so baking "front" produced zero
// pieces and the pedestal fell through to its "no match" placeholder even though it had rolled the
// weapon perfectly well. Side is a weapon's natural display profile, so it's next in line. Falls
// back to whatever pose actually holds art, so nothing that was drawn can render as "no match".
// Which poses a "copy this pose onto…" action actually writes. The source pose is never a target
// (copying onto itself is a no-op that would still burn an undo step), unknown names are ignored so
// a stale tick from a previous asset type can't write a pose this type doesn't have, and the result
// keeps editablePoses' own order rather than click order. Passing no picks means "all of them",
// which is the pre-submenu behaviour every existing caller relied on.
export const copyAngleTargets = (allPoses, current, picked) => {
  const others = (allPoses || []).filter((ag) => ag !== current);
  if (!picked || !picked.length) return others;
  return others.filter((ag) => picked.includes(ag));
};
export const displayPoseKey = (a) => {
  const has = (ang) => !!(a && a.angles && (a.angles[ang] || []).length);
  for (const ang of ["front", "side", "back", "up", "crouch"]) if (has(ang)) return ang;
  return "front";
};
export const rollPedestalItem = (assets, cats, logic, rnd) => {
  const pool = pedestalItemPool(assets, cats, logic);
  if (!pool.length) return null;
  const r = typeof rnd === "number" ? rnd : Math.random();
  return pool[Math.min(pool.length - 1, Math.floor(r * pool.length))];
};
// Enemy loot rolls CONSUMABLES and GEAR as two separate gates, because they are not the same kind
// of reward. A potion is the ordinary "you killed something" payout; a shirt or a rifle is a real
// find and should stay rare.
//
// This used to be ONE roll against the unfiltered pedestal pool — and that pool is
// equipment + weapon + item (see HAS_CATEGORIES). With 50-odd clothing assets saved and a handful
// of consumables, "a random member of that pool" was overwhelmingly a piece of clothing, so
// enemies looked like they only ever dropped clothes. The pool, not the chance, was the bug.
export const ENEMY_ITEM_DROP_CHANCE = 0.05; // consumables (potions etc) — the common drop
export const ENEMY_GEAR_DROP_CHANCE = 0.02; // clothing + weapons — the rare one
export const enemyItemDropPool = (assets) => (assets || []).filter((a) => a && a.type === "item");
export const enemyGearDropPool = (assets) => (assets || []).filter((a) => a && (a.type === "equipment" || a.type === "weapon"));
// GEAR IS LOOTED OFF THE BODY, not conjured from the library. An enemy can only drop what it is
// actually wearing or holding, so the rifle you pick up is the rifle it was shooting at you with
// and the jacket is the one it had on. Consumables are different on purpose — a potion is not worn,
// so those still roll the whole item pool.
//
// A dressed look records its loadout twice: `recipe.slots` / `weaponId` hold the source asset IDs,
// and `components` holds a deep copy of each garment as it was when the look was saved. The IDs win
// (so a later edit to that shirt is what drops), and the embedded copy is the fallback for gear
// that has since been deleted from the library. A plain undressed enemy has only `weaponId`.
export const enemyEquippedGear = (ea, findAsset) => {
  if (!ea) return [];
  const out = [], seen = new Set();
  const add = (a) => { if (a && a.id && !seen.has(a.id)) { seen.add(a.id); out.push(a); } };
  const resolve = (id, embedded) => (id && findAsset && findAsset(id)) || embedded || null;
  add(resolve(enemyWeaponIdOf(ea), ea.components && ea.components.weapon));
  const slots = (ea.recipe && ea.recipe.slots) || {};
  const worn = (ea.components && ea.components.equipment) || {};
  for (const s of new Set([...Object.keys(slots), ...Object.keys(worn)])) add(resolve(slots[s], worn[s]));
  return enemyGearDropPool(out); // never a body or skin component, whatever a hand-edited save holds
};
// Does this baked piece belong to `asset`? Used to strip looted gear off a corpse's art. Composed
// looks tag every piece with `_src` (the asset it came from); looks saved before that existed carry
// `_slot` for clothing and `_isWeapon` for the weapon, which identify the garment just as well since
// only one item occupies a slot.
export const pieceBelongsToAsset = (p, asset) => {
  if (!p || !asset) return false;
  if (p._src) return p._src === asset.id;
  if (asset.type === "weapon") return !!p._isWeapon;
  return !!asset.slot && p._slot === asset.slot;
};
const pickFromPool = (pool, rnd) => {
  if (!pool.length) return null;
  const r = typeof rnd === "number" ? rnd : Math.random();
  return pool[Math.min(pool.length - 1, Math.floor(r * pool.length))];
};
// Consumables are rolled first and win outright, so gear can never crowd them out. `ownGear` is
// what THIS enemy has equipped (enemyEquippedGear) — an enemy carrying nothing simply never drops
// gear. Each rnd is injectable for the tests; leaving them out uses Math.random as before. An empty
// consumable library does NOT promote the gear roll — the two gates stay independent and honest.
export const rollEnemyItemDrop = (assets, ownGear, chanceRnd, itemRnd, gearChanceRnd, gearRnd) => {
  const c = typeof chanceRnd === "number" ? chanceRnd : Math.random();
  if (c < ENEMY_ITEM_DROP_CHANCE) {
    const consumable = pickFromPool(enemyItemDropPool(assets), itemRnd);
    if (consumable) return consumable;
  }
  const g = typeof gearChanceRnd === "number" ? gearChanceRnd : Math.random();
  if (g < ENEMY_GEAR_DROP_CHANCE) return pickFromPool(enemyGearDropPool(ownGear), gearRnd);
  return null;
};
export const enemyDropOverlapping = (drops, x, y, w, h, cellSize) => {
  const box = Math.max(18, (cellSize || 30) * 1.35), half = box / 2;
  for (const [key, drop] of Object.entries(drops || {})) {
    if (!drop || !drop.item) continue;
    const left = drop.x - half, top = drop.y - box;
    if (x < left + box && x + w > left && y < top + box && y + h > top) return { key, drop };
  }
  return null;
};
export const pedestalSummary = (m) => { const cs = ((m && m.cats) || []).map((c) => (c || "").trim()).filter(Boolean); return cs.length ? cs.join((m && m.logic) === "and" ? " AND " : " OR ") : "any item"; };
// ── Single-use passive items (heal / temporary stat boost) ───────────────────
// An "item" is a consumable placed on a pedestal (Binding-of-Isaac style). Taking it applies its
// effect immediately and empties the pedestal — nothing swaps back, unlike gear. Two effect kinds:
//   { kind: "heal", amount }                  — instantly restores `amount` HP (clamped to your max)
//   { kind: "stat", stat, amount, duration }  — adds `amount` to a stat for `duration` seconds
// It carries `categories` like gear so the SAME pedestal search finds it. Only the stats the player
// actually reads in play are offered: Speed (move), Agility (jump), Strength (melee+throw damage),
// Intelligence (crit chance, melee and ranged) — every one has a live effect.
export const ITEM_STAT_KEYS = ["speed", "agility", "intelligence", "strength"];
export const ITEM_STAT_LABEL = { speed: "Speed", agility: "Agility", intelligence: "Int", strength: "Str" };
export const DEFAULT_ITEM_EFFECT = () => ({ kind: "heal", amount: 5 });
export const normItemEffect = (e) => {
  if (!e || typeof e !== "object") return DEFAULT_ITEM_EFFECT();
  if (e.kind === "stat") {
    const stat = ITEM_STAT_KEYS.includes(e.stat) ? e.stat : "speed";
    return { kind: "stat", stat, amount: Number.isFinite(e.amount) ? e.amount : 2, duration: Number.isFinite(e.duration) ? e.duration : 8 };
  }
  return { kind: "heal", amount: Number.isFinite(e.amount) ? e.amount : 5 };
};
// One-line human summary for the pedestal callout / pickup flash.
export const itemEffectSummary = (e) => {
  const x = normItemEffect(e);
  return x.kind === "heal" ? "Heal " + x.amount + " HP"
    : "+" + x.amount + " " + (ITEM_STAT_LABEL[x.stat] || x.stat) + " for " + x.duration + "s";
};
// Heal is clamped to [0, max] and never lowers HP (a negative amount is treated as 0). Pure.
export const applyHeal = (curHP, maxHP, amount) => Math.max(0, Math.min(maxHP, curHP + Math.max(0, amount || 0)));
// Still-active temporary buffs summed per stat at time nowMs, as { stat: totalAmount }. Expired
// entries (until <= nowMs) contribute nothing; two buffs on the same stat stack. Pure.
export const activeBuffSum = (buffs, nowMs) => {
  const out = {};
  for (const b of (buffs || [])) { if (b && b.until > nowMs) out[b.stat] = (out[b.stat] || 0) + (b.amount || 0); }
  return out;
};
// Drop buffs whose timer has elapsed (called every frame so the list can't grow unbounded).
export const pruneBuffs = (buffs, nowMs) => (buffs || []).filter((b) => b && b.until > nowMs);
// ── Rooms: small levels (isRoom) with a roomTag; a level door pulls a seeded pick from the pool ─
// A door carries a tag; entering it collects every saved room whose roomTag matches (case-
// insensitive), then picks one deterministically from a seed so the same door in the same play
// session always lands on the same room — different doors/sessions can differ (Isaac-style).
export const roomPool = (levels, tag) => {
  const t = (tag || "").trim().toLowerCase();
  if (!t) return [];
  return (levels || []).filter((l) => l && l.isRoom && ((l.roomTag || "").trim().toLowerCase() === t));
};
export const roomSeed = (str) => { let h = 2166136261 >>> 0; const s = String(str); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return (h >>> 0) / 4294967296; };
export const pickRoom = (levels, tag, seedStr) => {
  const pool = roomPool(levels, tag);
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(roomSeed(seedStr) * pool.length))];
};
// Playtest spawn: you "enter" a level through an OPEN gate (connector), favouring top-left then
// the left side — the way the real game brings you in. You only land on a door when you exit a
// room; inside a room you appear at that room's own door.
export const GATE_SPAWN_ORDER = ["N1", "W1", "N2", "W2", "S1", "S2", "E1", "E2"];
export const preferredOpenGate = (conns) => { for (const k of GATE_SPAWN_ORDER) { if (conns && conns[k] && conns[k].open) return k; } return null; };
export const firstDoorKey = (markers) => { for (const k in (markers || {})) { const m = markers[k]; if (m && m.kind === "door") return k; } return null; };
// An enemy is hostile (attacks the player) unless its "Not hostile" box is ticked — then it's a
// neutral NPC that just stands there and never attacks, though the player can still fight it.
export const enemyIsHostile = (ea) => !ea || ea.hostile !== false;
// A unit's side. A resurrected unit is "friendly" (fights for you) regardless of its asset; else
// "hostile" if its asset is hostile, else a "neutral" NPC. Only friendly/hostile units act.
export const unitSide = (ea, ep) => (ep && ep.friendly) ? "friendly" : (enemyIsHostile(ea) ? "hostile" : "neutral");
export const nearestUnitCX = (fromCX, candidates) => {
  let best = null, bd = Infinity;
  for (const c of (candidates || [])) { if (!c) continue; const d = Math.abs(c.cx - fromCX); if (d < bd) { bd = d; best = c; } }
  return best;
};
// A body can be raised only if it's dead and has never been raised before — resurrection is one-and-done.
export const canResurrect = (hp, ep) => hp <= 0 && !(ep && ep.resurrectedOnce);
// Which currently-worn slot comes off when you equip `item`: its own slot if that's occupied,
// otherwise the first worn slot holding something that shares one of the item's category tags —
// so you can't end up wearing two items of the same category. Exactly one item is ever displaced
// (it goes back onto the pedestal). null = a clean equip into an empty slot with nothing to swap.
export const equipDisplacedSlot = (item, equippedMap) => {
  if (!item) return null;
  if (equippedMap && equippedMap[item.slot]) return item.slot;
  const xCats = normCats(item.categories);
  if (!xCats.length) return null;
  return SLOT_ORDER.find((sl) => { const it = equippedMap && equippedMap[sl]; return it && normCats(it.categories).some((c) => xCats.includes(c)); }) || null;
};
// A hit is "from behind" when the attacker is on the opposite side to the way the wearer faces.
// face is -1 (facing left) or 1 (facing right); attacker/wearer are world x positions. A hit
// coming from exactly the same column (dx 0) is treated as NOT behind — you can't be flanked by
// something you're standing on top of. Used by the Back Guard cape effect.
export const isHitFromBehind = (face, attackerX, wearerX) => {
  const dx = attackerX - wearerX;
  if (dx === 0) return false;
  return Math.sign(dx) !== (face || 1); // attacker is on the side you're NOT facing
};
// Back Guard: eats `reduce` (0..1) of a hit, but only when it lands from behind. Applied AFTER
// normal Defense (so it's the cape catching what armor didn't). reduce 0.5 halves the blow.
export const applyBackGuard = (damage, fromBehind, reduce) => fromBehind ? damage * (1 - Math.max(0, Math.min(1, reduce || 0))) : damage;
// Crouch Guard: the ducking counterpart to Back Guard — eats `reduce` (0..1) of a hit, but only
// while the wearer is CROUCHED (a shield braced in front of you as you hunker down). Unlike Back
// Guard, direction is irrelevant: being crouched is the entire condition, so it covers a hit from
// any side. Same 0..1 clamp and same "applied after Defense" placement.
export const applyCrouchGuard = (damage, crouching, reduce) => crouching ? damage * (1 - Math.max(0, Math.min(1, reduce || 0))) : damage;
// The combined incoming-damage pipeline for a player hit: normal Defense first, then any Back
// Guard cape if the hit came from behind, then any Crouch Guard if the wearer is ducking, floored
// at 1 so a hit always stings a little. Each `*Reduce` is that effect's strength or null for "not
// worn — skip the check entirely". Keeps every hit site (melee, projectile, explosion) from
// re-deriving the order. Both guards can apply to the same blow: crouching behind cover with a
// cape on and taking one in the back stacks them, which is exactly what wearing both should buy.
// `ignoreArmor` skips the Defense step only. Back Guard and Crouch Guard are timing/positioning
// abilities rather than armour, so they still apply — an armour-piercing shot rewards being caught
// out of position, it does not make guarding pointless.
export const incomingPlayerDamage = (raw, def, face, attackerX, wearerX, backGuardReduce, crouchGuardReduce, crouching, ignoreArmor) => {
  let d = ignoreArmor ? raw : applyDefense(raw, def);
  if (backGuardReduce != null) d = applyBackGuard(d, isHitFromBehind(face, attackerX, wearerX), backGuardReduce);
  if (crouchGuardReduce != null) d = applyCrouchGuard(d, !!crouching, crouchGuardReduce);
  return Math.max(1, Math.round(d));
};
// BLOCK — what the melee button (Q/V) does when you're actually HOLDING a melee weapon. Fire
// already swings a melee weapon, so a second swing button bought you nothing; bracing is the move
// that was missing. The arm goes straight out with the weapon held across you for one second, and
// any enemy MELEE blow landing on your guarded front in that window is turned aside for free
// (before Defense — a block is a block, not damage reduction).
//
// It deliberately does NOT stop shots. Sweeping a swing through an incoming projectile already
// knocks it out of the air (the PARRY in the player's melee hit-test) — that's the timed, skilful
// answer to a ranged enemy, and a guard that also ate bullets would just replace it with a button
// you hold. So: melee is blocked, ranged is parried, and the two stay distinct.
// The guard is TAPPED, not held open. One press braces for BLOCK_FRAMES and then the arm comes
// down on its own, so covering a blow means pressing when the blow comes — that timing IS the
// mechanic, and a guard you could pin up permanently deleted it.
//
// Holding the button is a convenience, not a stronger option: it re-taps for you, raising the arm
// again the moment the guard's BLOCK_RECOVER_FRAMES of hands-down recovery run out. A held button
// therefore pulses ~1s up / ~0.5s down, and an enemy swinging into a down beat lands the hit —
// exactly as it would on a player who mistimed a tap.
//
// This is the third version, and the recovery gap is the whole difference. v1 expired after
// BLOCK_FRAMES but was EDGE-triggered, so holding put the arm out once and then dropped it for
// good ("my character puts his arms down and does no blocking"). v2 fixed that by keeping the
// guard up for as long as the button was down — which made holding Q strictly correct and turned
// the block into a toggle nobody had to time. Reading the button LEVEL (v1's real bug was the
// edge, not the expiry) with a recovery debt that must be paid keeps both halves: a held button
// never leaves you stuck with your arms down, and never buys permanent cover either.
// Distance from a point to the nearest point of an axis-aligned box — 0 when the point is inside it.
export const pointBoxDistance = (px, py, bx, by, bw, bh) => {
  const dx = Math.max(bx - px, 0, px - (bx + bw));
  const dy = Math.max(by - py, 0, py - (by + bh));
  return Math.hypot(dx, dy);
};
// Is a body caught in a blast? Measured against the body's BOX, never its centre point.
//
// This is the "my RPG does 0 damage" bug. The old test was hypot(impact -> target CENTRE) <= radius,
// but a character is several cells wide and tall, so a rocket that struck an enemy square in the
// chest detonated ~80-100px away from that enemy's centre — outside the default 2-cell (60px)
// radius — and dealt nothing at all. The bigger the target, the more reliably a direct hit missed:
// exactly backwards. A direct hit is now always caught (distance 0), and the radius finally reads
// the way the editor words it — how far PAST the body the splash still reaches.
export const blastHitsBox = (ix, iy, bx, by, bw, bh, radPx) => pointBoxDistance(ix, iy, bx, by, bw, bh) <= radPx;
export const BLOCK_FRAMES = 60;   // ~1s at 60fps — how long ONE guard lasts, tap or hold alike
export const BLOCK_RECOVER_FRAMES = 30; // ~0.5s of arms-down recovery owed after every guard, before another can start
export const BLOCK_STAGGER_SECS = 1; // how long a blocked attacker is left reeling and unable to swing
// One frame of the guard's state machine, lifted out of the physics loop so the timing itself is
// testable. `t` is how long the current guard has been up in frames (null = arms down), `cd` is
// the recovery still owed, and `canGuard` is false whenever the arms are busy elsewhere (mid-
// swing, climbing, or no melee weapon in hand). Returns the next { t, cd }.
//
// The button is read LEVEL, not on its edge — that is what makes holding re-tap itself — but a
// guard ALWAYS ends at BLOCK_FRAMES and ALWAYS owes BLOCK_RECOVER_FRAMES afterwards, so reading
// it level can never add up to permanent cover. Losing the guard because the arms got busy costs
// no recovery: the swing or the ladder was its own commitment, and charging for it would mean a
// player who blocked, swung back, and re-blocked was punished for playing it exactly right.
export const advanceBlock = (t, cd, held, canGuard, dtMul = 1) => {
  const step = dtMul > 0 ? dtMul : 0;
  const cooling = Math.max(0, (cd || 0) - step);
  if (!canGuard) return { t: null, cd: cooling };
  if (t != null) {
    const nt = t + step;
    // Expiry stamps the FULL recovery rather than `cooling`: the countdown starts when the arm
    // drops, so a guard that ran its course can't have been quietly paying it off while it was up.
    return nt >= BLOCK_FRAMES ? { t: null, cd: BLOCK_RECOVER_FRAMES } : { t: nt, cd: cooling };
  }
  return (held && cooling <= 0) ? { t: 0, cd: 0 } : { t: null, cd: cooling };
};
// Does an active guard stop this blow? Only from the front — the same flank rule Back Guard uses,
// since a shield arm held out in front of you cannot cover your back. The tolerance matters at
// MELEE range specifically: two sprites trading blows overlap, so a centre-vs-centre compare can
// read "behind you" while you are still plainly face to face, and the guard would refuse for no
// reason a player could see. Anything closer than half your own width counts as in front. Walk
// clean PAST an enemy and it is genuinely behind you, which still (correctly) refuses.
export const BLOCK_FRONT_TOLERANCE_FRAC = 0.5; // of the wearer's own width
export const blockStopsHit = (blocking, face, attackerX, wearerX, wearerW) => {
  if (!blocking) return false;
  const tol = Math.max(0, (wearerW || 0) * BLOCK_FRONT_TOLERANCE_FRAC);
  if (Math.abs(attackerX - wearerX) <= tol) return true; // practically inside each other — that's the front
  return !isHitFromBehind(face, attackerX, wearerX);
};
// A clothing "Tag Damage" ability empowers a KIND of weapon: any equipped weapon whose
// category tags include the tag the ability is set to (e.g. "bow") deals multiplied damage
// while the item is worn. Given the wearer's resolved effects (post-mergeEquip) and the
// weapon's own categories, returns the damage multiplier to apply (1 = no boost). Multiple
// matching tag abilities stack multiplicatively. Tag match is the same case-insensitive,
// trimmed compare pedestals use.
//
// Applies to MELEE AND RANGED, deliberately — the example tag is "bow" for a reason. This is
// gear, not the body: it boosts whoever wears the item, and swapping the item off removes it.
// That is the intended way for a character to hit harder with a gun, and it is NOT the same
// thing as the Strength bug (see playerRangedDamage) — Strength was an unremovable property of
// the body that no amount of gear-swapping could explain. Do not "fix" this into melee-only;
// a 1.5x hat making Army Bob's rifle hit harder is the feature working.
export const tagDamageMultiplier = (effects, weaponCategories) => {
  const cats = normCats(weaponCategories);
  if (!cats.length) return 1;
  let mult = 1;
  for (const e of (effects || [])) {
    if (e.type !== "tagBoost") continue;
    const tag = (e.tag || "").trim().toLowerCase();
    if (tag && cats.includes(tag)) mult *= (e.mult ?? 1.5);
  }
  return mult;
};
// A clothing "Long Shot" ability stretches how far your SHOTS fly: every ranged weapon fired
// while the item is worn has its flight distance multiplied. Range is also what shapes the
// trajectory (no drop over the first half of it, quadratic drop over the second — see
// projectileDropAtDistance), so a boosted shot flies FLATTER as well as farther, which is
// what "more range" should feel like. Applies to the player's own shots only, never to an
// enemy's. Mirrors tagDamageMultiplier: several worn range abilities stack multiplicatively,
// 1 = no boost. Floored so a corrupt save can't multiply a shot's range down to nothing.
export const rangeBoostMultiplier = (effects) => {
  let mult = 1;
  for (const e of (effects || [])) if (e.type === "rangeBoost") mult *= (e.mult ?? 1.5);
  return Math.max(0.1, mult);
};
// Clothing can add rounds to any finite ranged-weapon magazine. Bonuses stack additively; a clip
// size of 0 still means unlimited ammo and deliberately stays 0 rather than becoming finite.
export const effectiveMagazineSize = (clipSize, effects) => {
  const base = Math.max(0, Math.round(clipSize ?? DEFAULT_CLIP_SIZE));
  if (base === 0) return 0;
  let bonus = 0;
  for (const e of (effects || [])) if (e && e.type === "magazineSize") bonus += Math.max(0, Math.round(e.rounds ?? 2));
  return base + bonus;
};
// Horizontal movement rule. On the ground (or on a ladder/bars) your speed is driven by the keys
// AND remembered as momentum. In the air the keys do NOT steer you (no air control) — you keep
// whatever horizontal momentum you left the ground with, so running and jumping carries you along,
// while a standing jump goes straight up. Returns this frame's dx.
export const horizVel = (K, speed, grounded, prevVx, glide, slide, dtMul) => {
  if (grounded) {
    let target = 0; if (K.left) target = -speed; if (K.right) target = speed;
    if (slide) {
      // Low-grip surface (skates/ice): ease toward the key's target speed instead of snapping to
      // it, so starting takes a moment and — the whole point — LETTING GO coasts on momentum
      // rather than stopping dead. grip is the fraction of the speed gap closed per 60fps-frame.
      const t = Math.min(1, (slide.grip ?? 0.15) * (dtMul || 1));
      const v = (prevVx || 0) + (target - (prevVx || 0)) * t;
      return (target === 0 && Math.abs(v) < 0.05) ? 0 : v;
    }
    return target;
  }
  // Gliding restores air control: the keys steer you again (normally they don't mid-air), scaled
  // by the cape's `control` factor. Releasing both keys while gliding coasts on your momentum,
  // so you don't stall dead in the air. Without a glide, air frames keep launch momentum as before.
  if (glide && glide.active) {
    if (K.left) return -speed * glide.control;
    if (K.right) return speed * glide.control;
    return prevVx || 0;
  }
  return prevVx || 0;
};
// Airborne momentum may carry the ground speed, but jumping must never create a faster horizontal
// speed. This also normalizes a long takeoff frame: the old code stored dtMul-scaled displacement
// as momentum, so one slow frame at takeoff could remain baked into every subsequent air frame.
export const capAirborneSpeed = (airDx, walkDx) => {
  const cap = Math.abs(walkDx || 0);
  return Math.sign(airDx || 0) * Math.min(Math.abs(airDx || 0), cap);
};
// Glide is active only while airborne, actually falling (vy > 0 — you can't glide up out of a
// jump), the cape is equipped, and the player is holding Jump. Edge cases: not while climbing,
// and it needs to be past the jump's apex so holding Jump off the ground to jump-boost doesn't
// instantly flip into a glide. Returns the resolved { active, fall, control } or null.
export const glideState = (effect, K, onGround, climbing, vy) => {
  if (!effect || onGround || climbing || vy <= 0 || !K.jump) return null;
  return { active: true, fall: Math.max(0.05, Math.min(1, effect.fall ?? 0.35)), control: Math.max(0, Math.min(1, effect.control ?? 1)) };
};
// Slide (skates / ice): resolves the equipped effect into { grip, slope } clamped to sane ranges.
// grip is the per-frame fraction of the speed gap ground movement closes (low = slippery, coasts
// when you let go); slope multiplies the downhill ramp pull. null when no slide item is worn.
export const slideState = (effect) => effect ? { grip: Math.max(0.05, Math.min(1, effect.grip ?? 0.15)), slope: Math.max(1, Math.min(4, effect.slope ?? 2)) } : null;
// Turns the raw key state (WASD move keys and arrow aim keys tracked separately) into the merged
// "intent" the physics loop reads. The split is the whole point: WASD only moves, arrows only
// aim — so aiming up no longer walks you into a wall, and climbing a ladder with W/S no longer
// forces the gun to point up/down. up/down still mean "climb or crouch" and accept EITHER source
// (W/S or ↑/↓) so a keyboard-only player can climb; the four aim* intents are surfaced raw for
// the aim logic. Left/right come from WASD alone.
export const mergeInputIntent = (RK) => ({
  left: !!RK.left, right: !!RK.right,
  up: !!(RK.up || RK.aimUp), down: !!(RK.down || RK.aimDown),
  // crouch is S (WASD-down) or the dedicated C key — NOT the down arrow, which is for aiming
  // down; conflating them would make it impossible to aim a gun downward while standing.
  jump: !!RK.jump, fire: !!RK.fire, crouch: !!(RK.crouch || RK.down), reload: !!RK.reload, throw: !!RK.throw,
  melee: !!RK.melee,
  aimUp: !!RK.aimUp, aimDown: !!RK.aimDown, aimLeft: !!RK.aimLeft, aimRight: !!RK.aimRight,
  interact: !!RK.interact,
});
// Starting a crouch still requires ground contact, but once the player is crouched the held key
// keeps that shorter hitbox active through a one-frame ground miss. Small drops, joined ramps and
// uneven block seams can legitimately lose `onGround` until the landing pass later in the frame;
// expanding to standing height during that gap can enter nearby terrain and clamp horizontal
// movement. Releasing the key always stands immediately, and this does not grant air steering.
export const resolvePlayerCrouch = (held, onGround, wasCrouch) => !!held && (!!onGround || !!wasCrouch);
// One shared player-art pose rule for rendering and for the weapon/hitbox geometry that must match
// it. Walking does not cancel crouch: a created character must keep its authored Crouch pose while
// the shorter physics box moves, then the ordinary walk animation can animate that crouched art.
export const playerPoseKey = ({ transitioning, climbing, climbKind, climbJumpKind, aiming, aimDir, crouch, walking } = {}) => {
  if (transitioning) return "back";
  if (climbing) return climbKind === "bars" ? "side" : "back";
  // PUSHING OFF a ladder/vine keeps the climbing pose for the rest of the leap. You were facing
  // into the ladder with your back to the camera; snapping to the sideways airborne pose on the
  // very frame you let go read as the character spinning round in mid-air for one jump's worth of
  // rise. `climbJumpKind` is the kind you jumped OFF (see the physics loop) and clears at the apex,
  // so you turn side-on again as you start to come down — which is the moment it looks right.
  // Monkey bars are deliberately not special-cased away from their own climbing pose: hanging
  // from bars already shows Side, so a bars jump keeps Side and gains no pop either.
  if (climbJumpKind) return climbJumpKind === "bars" ? "side" : "back";
  if (aiming && aimDir === -1 && !walking) return "up";
  // The authored Crouch pose is a stationary, front-facing duck. Moving keeps the established
  // sideways Side walk and the renderer lowers that complete artwork as one aligned assembly.
  return crouch && !walking ? "crouch" : "side";
};
// Whether this frame's ledge step-assist (auto-climb a single solid cell of rise so a small step
// doesn't need a jump) should run at all. It must NOT run while the player is actively climbing a
// ladder/bars/cliff: climbing already owns vertical position through its own dedicated logic
// further down the loop, so a wall cell brushed while shifting sideways on a ladder (a completely
// normal, intended move) was tripping this same step-assist and snapping the player up by a full
// cell's height — a visible teleport, not a climb. `climbing` here is deliberately last FRAME's
// value (this frame's isn't computed yet at the point step-assist runs), matching how `grounded`
// a few lines earlier already reads it — so the very first frame you grab a ladder can still
// step-assist once, but every frame after that (i.e. all of actual climbing) is correctly exempt.
// This does NOT touch the separate plain wall-clamp right after it — walking/climbing sideways
// into a genuine wall still just stops you there, no teleport, exactly as it should.
export const shouldStepAssist = (hitCount, dx, climbing, onSlope) => hitCount > 0 && dx !== 0 && !climbing && !onSlope;
// A limb-tracking equipment piece (a jacket sleeve, a cuff — anything flagged limb:"arm") turns
// by the SAME rotational delta its arm is making, added straight onto the piece's own baked rest
// rotation, so it stays glued to the arm as the arm swings/climbs. It must NOT get a mirror-twist
// sign flip: a mirrored twin is already drawn inside scaleX(-1), which flips the delta on screen,
// so flipping it a second time here (the old bug) double-flipped it — the twin sleeve swung the
// wrong way, pointing down while the arm went up. Both copies take the same delta; the scaleX on
// the twin does the mirroring. See the climb/aim arm branches in the playtest renderer.
export const limbFollowRot = (piece, target, baseArmRot) => (piece.rot || 0) + (target - baseArmRot);
// Rigid-rotate a clothing limb piece (sleeve, cuff, pant-leg, calf triangle) around the actual
// JOINT (shoulder / hip) rather than around its own top. A piece drawn far from the joint — a cuff
// near the hand, a triangle at the calf — otherwise spins about its own middle and slides off the
// limb during a big rotation (measured ~14px of drift on the jacket climb). `visDeg` is the joint
// rotation as it appears ON SCREEN (already sign-flipped for a mirror twin by the caller); the
// piece's own `rot` (newRot) still spins it about its own top, and moving its top-centre along the
// joint arc turns the two together into one rigid rotation about the joint — so it stays glued.
export const rigidLimbTransform = (piece, jointX, jointY, visDeg, newRot) => {
  const rad = visDeg * Math.PI / 180;
  // The piece's own VISUAL pivot — the exact point the renderer turns it about: its chosen
  // shoulder side for an arm piece, top-centre for everything else (legs, shoes, clothing).
  // Orbiting an assumed top-centre while the renderer pivots elsewhere is what detached
  // followers whose shoulder side wasn't "top".
  const isArmP = piece.role === "weaponArm" || (piece.limb === "arm" && !piece._isShoe);
  const op = isArmP ? armShoulderPoint(piece) : { x: piece.x + piece.w / 2, y: piece.y };
  const dx = op.x - jointX, dy = op.y - jointY;
  const nx = jointX + dx * Math.cos(rad) - dy * Math.sin(rad);
  const ny = jointY + dx * Math.sin(rad) + dy * Math.cos(rad);
  return { ...piece, x: piece.x + (nx - op.x), y: piece.y + (ny - op.y), rot: newRot };
};
// The rotation a piece actually SHOWS on screen for a given stored rot, accounting for the
// mirror-twin scaleX(-1) flip and the per-piece mirrorTwist opt-out (same rules shapeStyle
// applies at render time). Needed to compute an arm's true on-screen rotation delta.
export const visualRotOf = (piece, rot) => { const r = (piece._m && piece.mirrorTwist === false) ? -(rot || 0) : (rot || 0); return piece._m ? -r : r; };
// Finds, for any clothing piece, the body weapon-arm it should ride: the NEAREST one by
// on-screen x. Matching by mirror parity (original->original, twin->twin) was wrong whenever a
// garment was DRAWN on the opposite side of the canvas from the body's own arm (the Army
// Shirt's sleeve square, drawn at x~41 while the body's weapon arm original sits at x~139) —
// the follower then orbited the far shoulder and got flung across the body. Which twin is the
// "original" is an accident of which side it was drawn on; the piece's actual position is not.
// Same principle applyLimbSwing already uses for legs (sideSign).
export const armAnchorFinder = (blocks) => {
  let arms = blocks.filter((b) => b.role === "weaponArm");
  // No role:"weaponArm" (a drawn enemy with only 💪-flagged pieces): anchor on the LARGEST
  // flagged arm piece per mirror side instead, so a multi-piece flagged arm still swings
  // rigidly about one shoulder — without this each piece spun about its own top and the
  // swing read as pivoting around the arm's middle.
  if (!arms.length) {
    const flagged = blocks.filter((b) => b.limb === "arm" && !b._isShoe);
    if (flagged.length) { const biggest = flagged.reduce((a, c) => (c.w * c.h > a.w * a.h ? c : a)); arms = [biggest]; }
  }
  if (!arms.length) return () => null;
  return (b) => { const cx = b.x + b.w / 2; return arms.reduce((a, c) => (Math.abs(c.x + c.w / 2 - cx) < Math.abs(a.x + a.w / 2 - cx) ? c : a)); };
};
// Crouch physics is shorter, but every authored pose still lives on the ordinary 200x260 canvas.
// First render pieces on this normal-aspect inner plane so every rotation and sleeve/arm overlap is
// resolved without distortion. A moving crouch can then scaleY this COMPLETE plane about the foot
// baseline: it gets the established low sideways silhouette, while the already-composed sleeve and
// arm undergo one common transform and cannot separate or change thickness relative to each other.
export const crouchArtPlane = (blocks, renderW, hitH) => {
  if (!blocks || !blocks.length || !(renderW > 0) || !(hitH > 0)) return null;
  const visible = blocks.filter((p) => !p.isHitbox && !p.isMuzzle);
  if (!visible.length) return null;
  const legs = visible.filter((p) => p.limb === "leg");
  const baselineSource = legs.length ? legs : visible;
  const baseline = Math.max(...baselineSource.map((p) => p.y + p.h));
  const scale = renderW / W;
  const height = H * scale, originY = baseline * scale;
  return { top: hitH - originY, height, baseline, originY, walkScaleY: Math.min(1, hitH / height) };
};
// The piece an enemy swings/aims/attaches a weapon to: the explicit weapon arm if one exists,
// else the largest piece flagged 💪 Arm. One rule shared by the AI render and the melee code.
export const flaggedArmOf = (list) => {
  const real = armOf(list);
  if (real) return real;
  const flagged = (list || []).filter((b) => b.limb === "arm" && !b._isShoe && !b._m);
  if (!flagged.length) return null;
  return flagged.reduce((a, c) => (c.w * c.h > a.w * a.h ? c : a));
};
// Rigidly carry a clothing piece (sleeve, cuff, shoulder square) along with its anchor arm as
// the arm's stored rot goes arm.rot -> armNewRot: the piece's top-centre orbits the arm's
// shoulder by the arm's ON-SCREEN delta, and its own rot changes so its on-screen rotation
// matches that same delta (converted back to stored form for the piece's own mirror state).
// This is the ONE follow rule every arm-moving branch (ladder, bars, melee swing, aim hold)
// shares — rot-only follows detached any sleeve whose own top wasn't exactly at the shoulder
// (the Army Jacket's side sleeve pivots ~35px below it, so it visibly fell below the arm the
// moment the player aimed). For a piece whose top-centre IS the shoulder, the orbit is a
// no-op and this reduces to exactly the old rotation-follow.
export const rigidArmFollow = (b, arm, armNewRot) => {
  const vis = visualRotOf(arm, armNewRot) - visualRotOf(arm, arm.rot);
  const flip = (b._m && b.mirrorTwist !== false) ? -1 : 1;
  const newRot = (b.rot || 0) + vis * flip;
  const sp = armShoulderPoint(arm), jx = sp.x, jy = sp.y;
  return rigidLimbTransform(b, jx, jy, vis, newRot);
};
// Clamps/rounds the art canvas zoom level to a sane range. 1 = the design area (200×260) fills
// the whole canvas, same as always. Below that, the design area shrinks WITHIN a fixed-size
// canvas (see .artDesign) instead of the whole canvas shrinking — so zooming out reveals real,
// placeable space above/beside the character instead of just making everything smaller. Never
// below 40% — much smaller and there's barely a design area left to see at all.
export const ARTZOOM_MIN = 0.4, ARTZOOM_MAX = 1;
export const clampArtZoom = (z, delta) => Math.max(ARTZOOM_MIN, Math.min(ARTZOOM_MAX, +(z + delta).toFixed(2)));
// Categories for the "Load" browser. `fitTracked` marks types that carry per-body variants
// (skin/equipment) — those get the body-fit checklist in the item list; weapons and bodies
// themselves don't need one (a weapon's hand-attachment point already adapts to any body
// automatically, with no per-body art to fit).
const LOAD_CATEGORIES = [
  { key: "body", label: "Bodies", icon: "🧍", match: (a) => a.type === "body", fitTracked: false },
  { key: "skin", label: "Skins", icon: "🎨", match: (a) => a.type === "skin", fitTracked: true },
  { key: "equipment", label: "Clothes & Armor", icon: "👕", match: (a) => a.type === "equipment", fitTracked: true },
  { key: "weapon", label: "Weapons", icon: "⚔️", match: (a) => a.type === "weapon", fitTracked: true },
  { key: "projectile", label: "Projectiles", icon: "🔮", match: (a) => a.type === "projectile", fitTracked: false },
  { key: "prop", label: "Objects / Props", icon: "🌿", match: (a) => a.type === "prop", fitTracked: false },
  { key: "item", label: "Items", icon: "🧪", match: (a) => a.type === "item", fitTracked: false },
  { key: "enemy", label: "Enemies", icon: "👹", match: (a) => a.type === "enemy", fitTracked: false },
  { key: "character", label: "Dressed Looks", icon: "🧩", match: (a) => a.type === "character", fitTracked: false },
];

// 5 is the "unmodified human" baseline for every stat — matches how items are meant to read
// (a stat of 5 + a +2 item = 7), and runtime formulas below treat 5 as the neutral multiplier
// point (stat/5 === 1×) so existing speed/jump feel is unchanged until someone touches a stat.
// HP follows the same convention (baseline 5) — it's the player's own stat, not to be confused
// with an Enemy's separate `.hp` field (a raw, uncapped number — how tanky that one enemy is —
// which this doesn't touch).
const DEFAULT_STATS = () => ({ hp: 5, speed: 5, agility: 5, intelligence: 5, strength: 5 });
// The player's actual HP pool in Playtest — same baseline-5 convention as every other stat
// (5 = 1×, unmodified). PLAYER_BASE_HP mirrors the default 10 a freshly-created enemy asset
// starts with, so a stat-5 player and a freshly-made enemy are equally tanky by default.
const PLAYER_BASE_HP = 10;
export const maxPlayerHP = (playerAsset) => Math.max(1, Math.round(PLAYER_BASE_HP * ((playerAsset?.stats?.hp ?? 5) / 5)));
const DEFAULT_ATTACK_RANGE = 60;   // px — used when an enemy asset hasn't set its own attackRange
const DEFAULT_RANGED_ATTACK_RANGE = 540; // px = 18 cells @ 30px — an enemy holding a bow/gun engages from far further out than a fist
const ATTACK_COOLDOWN_FRAMES = 45; // frames between one enemy's attacks (~0.75s)
const ATTACK_SWING_FRAMES = 14;    // how long the attack's arm-swing/lunge visual plays
const PLAYER_INVULN_FRAMES = 40;   // brief invulnerability after the player is hit, so standing in one enemy's range doesn't melt HP every frame
/* --- Enemy AI: every decision an enemy makes is driven by its Intelligence stat -------------
   5 is the baseline (as for every other stat), so an Intelligence-5 enemy behaves the way the
   old hard-coded numbers did, and moving the stat up or down is what actually changes it. */
// Chance an enemy even TRIES to dodge an incoming shot. 50% at baseline, capped short of certain
// so a genius still occasionally eats one. (This is the "confirm dodge chance based on
// intelligence" item — it used to be an inline literal; it's one named, tested function now, and
// it drives BOTH the duck and the new hop.)
export const enemyDodgeChance = (intelligence) => Math.min(0.95, 0.5 * ((intelligence ?? 5) / 5));
// How the enemy should dodge a shot heading for it, given where the shot is vertically within
// its hitbox: a high shot is ducked under, a low one is hopped over. null = it'd miss anyway.
export const dodgeMoveFor = (shotY, hitTop, hitH) => {
  if (!(hitH > 0) || shotY < hitTop || shotY > hitTop + hitH) return null;
  return (shotY - hitTop) / hitH < 0.45 ? "crouch" : "jump";
};
// The enemy's reaction time: a short, RANDOM wind-up between "the player is in range" and the
// attack actually landing, instead of the old instant hit the moment you crossed the range line.
// A dim enemy dawdles (~0.3-0.8s), a sharp one snaps (~0.05-0.15s). `rnd` is injectable so the
// randomness can be pinned in a test.
export const enemyReactionFrames = (intelligence, rnd) => {
  const base = Math.max(3, Math.round(36 - (intelligence ?? 5) * 3)); // int 1 -> 33, int 5 -> 21, int 10 -> 6
  const r = rnd === undefined ? Math.random() : rnd;
  return Math.max(1, Math.round(base * (0.5 + r)));
};
// An enemy's effective engagement range: whatever it's set to, but a weapon that shoots defaults
// to a far longer reach than a fist, so a bow-carrying enemy doesn't insist on walking into your
// face before doing anything.
export const enemyAttackRange = (ea, weapon) => {
  const set = (ea && ea.attackRange !== undefined && ea.attackRange !== null) ? ea.attackRange : null;
  // A ranged enemy whose range was never raised past the melee baseline (e.g. one made by dressing
  // Bob, which bakes the 2-cell melee default) would otherwise refuse to shoot until you were on
  // top of it — and then only get one point-blank shot before you stepped back out of its tiny
  // reach. Treat any still-melee-sized value as "unset" for a shooter, so it engages from range.
  // A shooter opens fire — and holds station — at TWICE its nominal reach, so a bow/gun enemy
  // engages from far out rather than the close distance a fist implies. Doubles both the ranged
  // default and any hand-set ranged range; the enemy's sight range (enemyDetects) still caps how
  // far it can actually notice you, so it can't fire at something it can't yet see.
  if (weapon && isRanged(weapon.wtype)) return ((set !== null && set > DEFAULT_ATTACK_RANGE) ? set : DEFAULT_RANGED_ATTACK_RANGE) * 2;
  return set !== null ? set : DEFAULT_ATTACK_RANGE;
};
// Enemies now CONSIDER their range when moving. Seek closes only until it's comfortably inside
// its own reach, then holds station — and backs off if the player crowds it (an archer shouldn't
// stand nose-to-nose to shoot). Avoid and Guard behave exactly as before.
// `dist` is signed: player position minus enemy position.
export const ENEMY_STANDOFF_FAR = 0.85, ENEMY_STANDOFF_NEAR = 0.45;
export const enemyMoveIntent = (ai, dist, range, speed, detected) => {
  if (!detected) return 0;
  const ad = Math.abs(dist), s = Math.sign(dist) || 1;
  if (ai === "avoid") return -s * speed;
  if (ai !== "seek") return 0; // guard holds its ground
  if (ad > range * ENEMY_STANDOFF_FAR) return s * speed;
  if (ad < range * ENEMY_STANDOFF_NEAR) return -s * speed;
  return 0;
};
// Same block-height jump math the player uses (h = v^2/2g, inverted), so an enemy's hop clears
// the same obstacles a player of that Agility could.
export const enemyJumpVelocity = (agility, cellH) => Math.sqrt(2 * 0.175 * (0.5 * Math.min(10, Math.max(1, agility ?? 5)) + 0.5) * cellH);
// Which weapon an enemy is holding. A plain Enemy asset carries `weaponId`; a Dress Bob look
// flagged 👹 Enemy already records its weapon in the recipe it was composed from.
export const enemyWeaponIdOf = (ea) => (ea && (ea.weaponId || (ea.recipe && ea.recipe.weaponId) || (ea.components && ea.components.weapon && ea.components.weapon.id))) || null;
// Damage one swing/shot from this enemy deals, before the player's Defense is applied. A weapon
// supplies the base damage, scaled by the enemy's Strength (5 = 1x, same as the player's own
// formula); bare-handed it's UNARMED_DAMAGE through that same scaling, so an enemy's fists are
// worth exactly what yours are. This side has to move with the player's or the rule stops being
// one rule: fists were the raw Strength stat here too, and leaving that behind would have meant a
// Strength-10 thug punching for 10 while you punched the same thug for 4.
export const enemyAttackDamage = (ea, weapon) => {
  const str = ea?.stats?.strength ?? 5;
  return Math.max(1, (weapon ? (weapon.damage ?? 5) : UNARMED_DAMAGE) * (str / 5));
};
// Equipment-only: additive on top of the wearer's own stat (5 + a +2 item reads as 7). 0 = no change.
const DEFAULT_STAT_BOOSTS = () => ({ hp: 0, speed: 0, agility: 0, intelligence: 0, strength: 0 });
// Effects catalog (equipment only). Each entry's `params` drives the sliders generically — adding
// a future effect is a new entry here plus its own runtime hook in the Playtest loop, not new UI.
const EFFECT_TYPES = {
  doubleJump: {
    label: "Double Jump", icon: "⤴️",
    blurb: "Grants one bonus mid-air jump. Design a custom Side-view animation for it, per body — a body with none yet just plays this item's normal look during the jump.",
    params: [
      { key: "height", label: "Height", min: 4, max: 16, step: 0.5, def: 9 },
      { key: "speed", label: "Speed", min: 1, max: 10, step: 1, def: 5 },
    ],
  },
  // A cape that soaks part of a hit taken from BEHIND — the direction the wearer is facing tells
  // us their front, so an attacker on the opposite side is behind them. "Reduce" is the fraction
  // of the blow it eats (0.5 = half), applied on top of (after) the wearer's normal Defense.
  backGuard: {
    label: "Back Guard", icon: "🛡️",
    blurb: "Blocks part of any hit that lands from BEHIND you (a cape catching the blow). Front and side hits are unaffected. Stacks after your normal Defense. No animation of its own.",
    noAnim: true,
    params: [
      { key: "reduce", label: "Block %", min: 0.1, max: 1, step: 0.05, def: 0.5 },
    ],
  },
  // The ducking counterpart to Back Guard: a shield/plate that only pays off while you're
  // CROUCHED, from any direction (Back Guard is direction-gated instead). Same Block % knob and
  // the same after-Defense placement, so the two read identically and can be worn together.
  crouchGuard: {
    label: "Crouch Guard", icon: "🧎",
    blurb: "Blocks part of any hit that lands while you are CROUCHING — duck behind it and you take less. Direction doesn't matter (that's Back Guard's job); staying crouched is the whole trick. Stacks after your normal Defense. No animation of its own.",
    noAnim: true,
    params: [
      { key: "reduce", label: "Block %", min: 0.1, max: 1, step: 0.05, def: 0.5 },
    ],
  },
  // A cape that lets you fall gently and steer in the air. Normally you keep whatever horizontal
  // momentum you left the ground with (no air control); while gliding, the keys steer you again,
  // and gravity is scaled down. Only active while airborne and FALLING, and only while the key is
  // held (see the loop) so you choose when to glide.
  glide: {
    label: "Glide", icon: "🪂",
    blurb: "Hold Jump while falling to glide: fall speed is cut and you regain full mid-air steering (normally you keep your launch momentum with no air control). Design a Side-view animation for it, per body — a body with none yet just plays this item's normal look while gliding.",
    params: [
      { key: "fall", label: "Fall slow", min: 0.1, max: 0.9, step: 0.05, def: 0.35 },
      { key: "control", label: "Air control", min: 0.3, max: 1, step: 0.05, def: 1 },
    ],
  },
  // Low-grip footwear (skates, rollerblades, ice): you don't stop on a dime — release the keys
  // and you COAST on your momentum, and downhill ramps pull you faster (up to a terminal glide).
  // No animation of its own; it just changes how the ground feels underfoot.
  slide: {
    label: "Slide", icon: "🛼",
    blurb: "Low grip, like skates or ice: starting and stopping take a moment — you coast when you let go instead of stopping dead — and you slide faster down ramps. No animation of its own.",
    noAnim: true,
    params: [
      { key: "grip", label: "Grip", min: 0.05, max: 1, step: 0.05, def: 0.15 },
      { key: "slope", label: "Downhill", min: 1, max: 4, step: 0.5, def: 2 },
    ],
  },
  // A clothing ability that empowers a KIND of weapon: any equipped weapon whose category
  // tags include the tag typed below (e.g. "bow") deals multiplied damage while this item is
  // worn. No animation of its own; it's purely a damage buff resolved in the playtest math.
  tagBoost: {
    label: "Tag Damage", icon: "🏹",
    blurb: "Empowers a kind of weapon: any equipped weapon whose category tags include the tag you set below (e.g. \"bow\") deals multiplied damage while this is worn. Set the tag and the multiplier. No animation of its own.",
    noAnim: true,
    tagParam: true,
    params: [
      { key: "mult", label: "Damage ×", min: 1, max: 5, step: 0.25, def: 1.5 },
    ],
  },
  // A clothing ability that makes your GUNS/BOWS reach farther: multiplies the flight distance
  // of every shot you fire while it's worn (see rangeBoostMultiplier). Since range also sets
  // where a shot starts dropping, a boosted shot flies flatter too. Unlike Tag Damage this
  // isn't tag-scoped — it lifts every ranged weapon — and it leaves melee and thrown weapons
  // alone (a throw's distance comes from Strength vs the throwable's weight instead).
  rangeBoost: {
    label: "Long Shot", icon: "🎯",
    blurb: "Your shots fly farther: multiplies the range of ANY ranged weapon you're holding while this is worn (a 14-block gun at ×1.5 reaches 21). Longer range also means the shot drops later, so it flies flatter. Melee and thrown weapons are unaffected. No animation of its own.",
    noAnim: true,
    params: [
      { key: "mult", label: "Range ×", min: 1, max: 4, step: 0.25, def: 1.5 },
    ],
  },
  magazineSize: {
    label: "Magazine Size", icon: "➕",
    blurb: "Adds rounds to the magazine of any finite-ammo ranged weapon while this is worn. Multiple clothing bonuses stack. Weapons set to unlimited ammo stay unlimited. No animation of its own.",
    noAnim: true,
    params: [
      { key: "rounds", label: "Extra rounds", min: 1, max: 30, step: 1, def: 2 },
    ],
  },
};
// Live pedestal pickup: layer a taken equipment item's stat boosts / defense / effects onto the
// player during Playtest. Mirrors assembleLook's stat/effect math (additive stat boosts, summed
// defense, effects resolved to the worn body's animation) but for one-off live pickups instead of
// a saved dressed look. `equippedMap` is slot -> equipment item; weapons are handled separately
// via playtestWeaponId. Returns a shallow clone of `base` with merged stats/defense/effects.
export const mergeEquip = (base, equippedMap, bodyId) => {
  if (!base) return base;
  const items = Object.keys(equippedMap || {}).map((sl) => equippedMap[sl]).filter(Boolean);
  if (!items.length) return base;
  const stats = { ...(base.stats || {}) };
  let defense = base.defense || 0;
  const effects = [...(base.effects || [])];
  for (const eq of items) {
    if (eq.statBoosts) for (const k of Object.keys(eq.statBoosts)) stats[k] = (stats[k] ?? 5) + (eq.statBoosts[k] || 0);
    defense += eq.defense || 0;
    for (const eff of (eq.effects || [])) {
      const animByBody = eff.animByBody || {};
      const frames = (bodyId && animByBody[bodyId] && animByBody[bodyId].length) ? animByBody[bodyId]
        : (eff.lastFit && animByBody[eff.lastFit] && animByBody[eff.lastFit].length) ? animByBody[eff.lastFit]
        : (animByBody.default || []);
      const packed = { type: eff.type, frames, slot: eff.slot || null };
      for (const pm of (EFFECT_TYPES[eff.type]?.params || [])) packed[pm.key] = eff[pm.key] ?? pm.def;
      if (EFFECT_TYPES[eff.type]?.tagParam) packed.tag = eff.tag || "";
      effects.push(packed);
    }
  }
  return { ...base, stats, defense, effects };
};
// Human-readable "what changed" for a pedestal equip: stat deltas, defense delta, and any NEW
// effect types gained. Both args are the output of mergeEquip (before/after the pickup).
export const EQUIP_STAT_KEYS = ["hp", "speed", "agility", "intelligence", "strength"];
export const EQUIP_STAT_LABEL = { hp: "HP", speed: "Speed", agility: "Agility", intelligence: "Int", strength: "Str" };
export const equipEffectSummary = (before, after) => {
  const parts = [];
  const bs = (before && before.stats) || {}, as = (after && after.stats) || {};
  for (const k of EQUIP_STAT_KEYS) { const b = bs[k] ?? 5, a = as[k] ?? 5; if (a !== b) parts.push(EQUIP_STAT_LABEL[k] + " " + b + "\u2192" + a); }
  const bd = (before && before.defense) || 0, ad = (after && after.defense) || 0;
  if (ad !== bd) parts.push("Def " + bd + "\u2192" + ad);
  const had = new Set(((before && before.effects) || []).map((e) => e.type));
  for (const e of ((after && after.effects) || [])) if (!had.has(e.type)) { had.add(e.type); parts.push("+" + ((EFFECT_TYPES[e.type] && EFFECT_TYPES[e.type].label) || e.type)); }
  return parts;
};
// One effect-animation frame — the SAME 5-pose shape normal art uses, so it can be edited with
// the exact same piece toolbar (add/select/drag/resize). Only .side is ever shown/used, since
// Playtest only ever renders the player in its Side pose while airborne.
const blankFrame = () => blankAngles();
// Skin/equipment layouts are keyed by whichever BODY's id was the active guide when that
// layout was drawn ("default" when no specific body is selected) — see the guideId picker's
// onChange below. No separate tagging vocabulary; the body you were designing for IS the key.
const blankVariants = () => ({ default: blankAngles() });
export function newAsset(type, slot, wtype) {
  const a = { id: uid(), name: slot ? SLOTS[slot].label : (TYPES[type] ? TYPES[type].label : type), type, angles: blankAngles(), guideId: "default" };
  if (type === "body") { a.angles = JSON.parse(JSON.stringify(DEFAULT_BODY)); return withRig(a); }
  if (type === "skin") { a.stats = DEFAULT_STATS(); a.variants = blankVariants(); a.angles = a.variants.default; a.lastFit = "default"; a.confirmedFits = []; }
  if (type === "weapon") { a.variants = { default: blankFitVariant("weapon") }; a.states = a.variants.default.states; a.angles = a.states.rest; a.lastFit = "default"; a.confirmedFits = []; a.wtype = wtype || "melee"; a.projectileId = null; a.projectileSpeed = 12; a.projectileRange = DEFAULT_PROJECTILE_RANGE; a.damage = 5; a.fireRate = DEFAULT_FIRE_RATE; a.clipSize = DEFAULT_CLIP_SIZE; a.reloadTime = DEFAULT_RELOAD_TIME; a.weight = DEFAULT_THROW_WEIGHT; a.landEffect = "fire"; a.landEffectDps = 6; a.landEffectLife = 6; a.landRadius = DEFAULT_LAND_RADIUS; a.landPropId = null; a.explode = false; a.ignoreArmor = false; a.burstFire = false; a.fullAuto = false; a.burst = DEFAULT_BURST; a.burstDelay = DEFAULT_BURST_DELAY; a.explodeRadius = 2; a.explodePropId = null; a.explodeSize = 3; a.explodeLife = 0.5; a.stun = 0; a.categories = ["", "", ""]; }
  if (type === "enemy") { a.states = { normal: blankAngles(), onFire: blankAngles(), charge: blankAngles() }; a.states.normal.death = []; a.angles = a.states.normal; a.hasArms = false; a.weaponId = null; a.stats = DEFAULT_STATS(); a.hp = 10; a.ai = "guard"; a.attackRange = DEFAULT_ATTACK_RANGE; return withRig(a); }
  if (type === "equipment") { a.slot = slot; a.variants = blankVariants(); a.angles = a.variants.default; a.lastFit = "default"; a.confirmedFits = []; a.statBoosts = DEFAULT_STAT_BOOSTS(); a.defense = 0; a.effects = []; a.categories = ["", "", ""]; }
  if (type === "projectile") { a.size = 1; }
  // A prop/object: single-canvas pixel art (like a projectile), placed into levels at any size.
  // Optionally animated — `frames` is an ordered list of front-pose piece lists; frame 0 is the
  // live `angles` (what the piece editor edits when frameIdx 0 is selected). animFps drives the
  // cycle speed in Playtest. Only the Front pose is ever used (props don't rotate/face).
  if (type === "prop") { a.size = 2; a.frames = [blankAngles()]; a.angles = a.frames[0]; a.animFps = 6; a.solidDefault = false; }
  // A single-use item: one Front canvas (drawn like a projectile), an effect, and category tags so
  // a pedestal can roll it. No poses/frames/rig — it only ever shows on a pedestal and in menus.
  if (type === "item") { a.effect = DEFAULT_ITEM_EFFECT(); a.categories = ["", "", ""]; }
  return a;
}
const guideAsset = { angles: DEFAULT_BODY, hand: DEFAULT_HAND, shoulder: DEFAULT_SHOULDER };
/* --- Loading asset JSON that didn't come out of this app ---------------------------------- */
// "Load this text" / "Open a file" used to do exactly two checks: JSON.parse, and `if (!c.angles)
// throw`. Everything else — a missing type, a missing pose, a piece with no id or no width, a
// dressed look (which the piece editor cannot render at all) — either failed with the same
// useless "That text isn't an asset file." or loaded into a broken editor. That's why an asset
// written by hand (or by another AI) wouldn't load: it's usually a perfectly sensible object
// that just doesn't happen to carry every field this app's own Save writes.
//
// normalizeAssetJson repairs what it safely can, infers what it can't, and throws an error whose
// MESSAGE says what's actually wrong. It never invents art: a pose with no blocks stays empty.
export const KNOWN_ASSET_TYPES = ["body", "skin", "weapon", "enemy", "equipment", "projectile", "prop", "item", "character"];
export const inferAssetType = (raw) => {
  if (raw.type && KNOWN_ASSET_TYPES.includes(raw.type)) return raw.type;
  if (raw.recipe || raw.components) return "character";
  if (raw.effect && typeof raw.effect === "object" && (raw.effect.kind === "heal" || raw.effect.kind === "stat")) return "item";
  if (raw.slot) return "equipment";
  if (raw.wtype || raw.projectileId !== undefined || (raw.states && raw.states.fire)) return "weapon";
  if (raw.hasArms !== undefined || (raw.states && raw.states.onFire)) return "enemy";
  if (raw.hand || raw.shoulder) return "body";
  if (raw.frames && raw.size !== undefined) return "prop"; // a prop carries its own animation-frames array; a projectile never does
  if (raw.size !== undefined && raw.angles) return "projectile";
  return null;
};
const normalizePiece = (p) => {
  if (!p || typeof p !== "object") return null;
  const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);
  const q = { ...p, id: p.id || uid(), kind: p.kind || "rect", x: num(p.x, 0), y: num(p.y, 0), w: Math.max(1, num(p.w, 20)), h: Math.max(1, num(p.h, 20)) };
  if (q.mirror === undefined) q.mirror = false;
  if (q.rot !== undefined) q.rot = num(q.rot, 0);
  if (q.kind === "emoji" && !q.char) q.char = "❓";
  if (q.kind === "text" && !q.text) q.text = "TEXT";
  if (q.kind !== "emoji" && q.kind !== "text" && !q.color) q.color = SKIN;
  return q;
};
// Normalising a pose set must not THROW POSES AWAY. This walked only ANGLES (front/back/side/up/
// crouch) and rebuilt from blankAngles(), so an Enemy's `attack` and `death` art — real, editable
// poses per editablePoses() — was silently deleted on every export/import round-trip. The enemy
// then had no attack pose to show, so eUseAtkPose went false and it fell back to swinging an arm.
// Any pose key the source actually has is kept now; the five base angles are still guaranteed
// present (blankAngles) so nothing downstream has to null-check them.
const normalizeAngles = (src) => {
  const out = blankAngles();
  if (!src || typeof src !== "object") return out;
  for (const ang of new Set([...ANGLES, ...Object.keys(src)])) out[ang] = Array.isArray(src[ang]) ? src[ang].map(normalizePiece).filter(Boolean) : [];
  return out;
};
export const normalizeAssetJson = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("That isn't an asset — it should be one JSON object starting with { and ending with }.");
  if (raw.conns && raw.cols) throw new Error("That's a level, not an asset — load it in the Level Creator instead.");
  const type = inferAssetType(raw);
  if (!type) throw new Error("Couldn't tell what kind of asset that is. Add a \"type\" of: " + KNOWN_ASSET_TYPES.join(", ") + ".");
  const a = { ...raw, type };
  // Poses can live under .angles, or (for weapons/enemies saved mid-state) under .states.
  a.angles = normalizeAngles(a.angles && Object.keys(a.angles).length ? a.angles : (a.states && (a.states.rest || a.states.normal)));
  if (type === "weapon") a.states = { rest: normalizeAngles((a.states && a.states.rest) || a.angles), fire: normalizeAngles(a.states && a.states.fire) };
  if (type === "enemy") a.states = { normal: normalizeAngles((a.states && a.states.normal) || a.angles), onFire: normalizeAngles(a.states && a.states.onFire), charge: normalizeAngles(a.states && a.states.charge) };
  if (type === "equipment" && !SLOTS[a.slot]) a.slot = "shirt"; // an unknown slot would drop it out of every picker; shirt is the safe visible default
  if (type === "item") { a.effect = normItemEffect(a.effect); if (!Array.isArray(a.categories)) a.categories = ["", "", ""]; }
  if (!a.id) a.id = uid();
  if (typeof a.name !== "string" || !a.name.trim()) a.name = (type === "equipment" ? SLOTS[a.slot].label : (TYPES[type] ? TYPES[type].label : type));
  if (!a.guideId) a.guideId = "default";
  return a;
};

// Best-effort un-bake of an OLD-format dressed character (saved before looks embedded their
// component layers). The bake order is deterministic: [behindBody overlays] [body non-arm]
// [lower clothing] [upper-under clothing] [body arm(s)] [over-arm clothing] [skin & weapon].
// So: skip the leading behindBody run, take through the end of the arm run, and drop the
// mirror-expanded twins (_m) so the pieces' own mirror flags take over again. Exact when the
// look wore no lower/under-top clothing (skin bakes AFTER the arm); fused otherwise.
export const recoverBodyFromBake = (ch) => {
  const angles = blankAngles();
  const isArm = (p) => p.role === "weaponArm" || p.limb === "arm";
  for (const ang of ANGLES) {
    const src = (ch.angles && ch.angles[ang]) || [];
    let i = 0; while (i < src.length && src[i].behindBody) i++;
    const armIdx = src.findIndex((p) => p.role === "weaponArm");
    let end;
    if (armIdx < 0) end = src.length - 1; // no weapon arm — take everything after the back run
    else { end = armIdx; while (end + 1 < src.length && isArm(src[end + 1])) end++; }
    // Tag every recovered piece _recovered so the editor can flag them for review — this
    // reconstruction is a guess, and any piece could turn out to be fused-in clothing
    // rather than an original body part (see the function comment above).
    angles[ang] = src.slice(i, end + 1).filter((p) => !p._m).map((p) => { const c = { ...p, id: uid(), _recovered: true }; delete c._m; return c; });
  }
  const out = withRig({ id: uid(), name: (ch.name || "look") + " — recovered body", type: "body", angles, guideId: "default" });
  out._recoveredFrom = ch.name || "a dressed look"; // drives the review banner in the piece editor
  return out;
};
function defaultFx() { return { opacity: 1, glow: 0, glowColor: "#ffd76b", bright: 1 }; }

// Piece records are JSON-shaped, but several of their appearance settings live in nested
// objects/arrays (fx, outlineFx, polygon points, and so on). A copied block must own an
// independent copy of all of that data: consulting newFx here would make it inherit the current
// "next block" sliders, while a shallow spread would leave the source and copy sharing nested
// state. Filtering first also keeps a copied group's original front-to-back layer order.
const clonePieceValue = (value) => {
  if (Array.isArray(value)) return value.map(clonePieceValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clonePieceValue(child)]));
  return value;
};
export const duplicateSelectedPieces = (pieces, selectedIds, makeId, offset = 12) => {
  const wanted = new Set(selectedIds || []);
  return (pieces || []).filter((piece) => wanted.has(piece.id)).map((piece) => {
    const copy = clonePieceValue(piece);
    return {
      ...copy,
      id: makeId(),
      x: (Number.isFinite(piece.x) ? piece.x : 0) + offset,
      y: (Number.isFinite(piece.y) ? piece.y : 0) + offset,
    };
  });
};

// Geometry shared by group corner-resize and the Width/Height sliders. Scaling transformed box
// EDGES (rather than independently rounding each centre and size) keeps touching pieces touching.
// A single uniform minimum scale stops the entire assembly when its smallest dimension reaches one
// design pixel, so no member freezes early and desynchronizes from neighbours.
export const pieceGroupBounds = (pieces) => {
  if (!pieces || !pieces.length) return null;
  const minX = Math.min(...pieces.map((p) => p.x)), minY = Math.min(...pieces.map((p) => p.y));
  const maxX = Math.max(...pieces.map((p) => p.x + p.w)), maxY = Math.max(...pieces.map((p) => p.y + p.h));
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
};
// HOW FINE THE EDITOR IS. Dragging a block used to land on whole units of the 200x260 design
// canvas, and a block could never be smaller than 6 of them — so lining two pieces up sometimes
// had no move that fit, and a block was either a touch too big or a touch too small with nothing
// in between. Both halved: half-unit positioning and sizing, and a minimum block a third smaller.
// Everything downstream already works in fractions (pieces are positioned as a PERCENTAGE of the
// canvas, and group scaling has always produced 3-decimal values), so nothing else has to change
// and no existing art moves — whole numbers are still whole numbers.
export const PIECE_STEP = 0.5;
export const snapPiece = (v) => Math.round(v / PIECE_STEP) * PIECE_STEP;
export const MIN_PIECE_SIZE = 3;
export const scalePieceGroup = (pieces, requestedScale, center = null) => {
  if (!pieces || !pieces.length) return [];
  const bounds = pieceGroupBounds(pieces);
  const cx = center?.x ?? bounds.cx, cy = center?.y ?? bounds.cy;
  const minScale = pieces.reduce((m, p) => Math.max(m, 1 / Math.max(0.001, p.w), 1 / Math.max(0.001, p.h)), 0);
  const scale = Math.max(minScale, Number.isFinite(requestedScale) ? requestedScale : 1);
  const r3 = (n) => Math.round(n * 1000) / 1000;
  return pieces.map((p) => {
    const left = r3(cx + (p.x - cx) * scale), right = r3(cx + (p.x + p.w - cx) * scale);
    const top = r3(cy + (p.y - cy) * scale), bottom = r3(cy + (p.y + p.h - cy) * scale);
    return { ...p, x: left, y: top, w: r3(right - left), h: r3(bottom - top) };
  });
};
export const removePieceSelection = (pieces, selectedIds) => {
  const ids = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);
  return (pieces || []).filter((p) => !ids.has(p.id) || p.locked);
};
const anglesEmpty = (ag) => ANGLES.every((a) => !(ag && ag[a] && ag[a].length));

/* ============================ LEVEL CREATOR =============================== */
// 8 connection points: 2 per side. Opposing points pair up (W1<->E1 etc.).
const CONN_KEYS = ["N1", "N2", "E1", "E2", "S1", "S2", "W1", "W2"];
const LV_CELL = 30;
const CONN_OPP = { N1: "S1", N2: "S2", S1: "N1", S2: "N2", W1: "E1", W2: "E2", E1: "W1", E2: "W2" };
// Where each connector ENDS UP when the level is mirrored left↔right (see flipLevelHorizontally).
// Not the same map as CONN_OPP: the left and right edges trade places, and so do the two top ones
// and the two bottom ones, because N1/S1 are the LEFT-hand pair (CONN_LABEL calls them "Top Left"
// / "Bottom Left"). A flipped level whose exits stayed put would no longer join up with its
// neighbours, since the way out of the map is now on the other side of it.
const CONN_FLIP_H = { N1: "N2", N2: "N1", S1: "S2", S2: "S1", W1: "E1", E1: "W1", W2: "E2", E2: "W2" };
const CONN_POS = { // %-position on the level rect
  N1: { x: 30, y: 0 }, N2: { x: 70, y: 0 }, S1: { x: 30, y: 100 }, S2: { x: 70, y: 100 },
  W1: { x: 0, y: 35 }, W2: { x: 0, y: 70 }, E1: { x: 100, y: 35 }, E2: { x: 100, y: 70 },
};
// Human-readable names for the 8 connector points — what's actually shown in the UI.
// The internal keys (N1/E1/etc.) stay the same under the hood so old saved levels keep working.
const CONN_LABEL = {
  N1: "Top Left", N2: "Top Right", S1: "Bottom Left", S2: "Bottom Right",
  W1: "Left Upper", W2: "Left Lower", E1: "Right Upper", E2: "Right Lower",
};
// Object size multipliers (× a cell), for emoji, shapes and props alike. The steps stay fine at
// the small end, where most scenery lives and a single cell of difference is visible, and coarsen
// as they grow — past ~16 cells a one-cell change isn't perceptible, so offering every value would
// only pad the picker. The top end reaches 60 so a prop can be a piece of landscape (a cliff face,
// a whole building) rather than a decoration; a solid one blocks the matching 60x60 cell square,
// since fxBlocks derives its footprint straight from this number.
// Half steps through the small end, where half a cell is plainly visible and where lining an
// object up against terrain actually happens. Above 8 cells a half-cell change isn't worth a
// button, so the large end keeps its original coarse ladder. Every original value is still here,
// so no saved placement changes size.
export const LV_OBJ_SIZES = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 10, 12, 16, 20, 24, 30, 40, 50, 60];
// A placed object can be TWISTED: `rot` degrees, turned about its own middle. This is what lets a
// big prop sit ON something rather than beside it — a trailer parked along a hillside, a fallen
// sign, a leaning post — instead of every object in the level standing bolt upright.
//
// The ART turns; the FOOTPRINT does not. A solid object still blocks the same square of cells it
// always did (fxBlocks reads size, not rot), because the collision grid is axis-aligned cells and
// tilting that would mean rewriting how the whole level is walked. Worth knowing when you angle
// something you're also standing on — the ground stays where the square is.
// A placed object can also be MIRRORED (`flip`) — a tree leaning the other way, a trailer parked
// nose-out, and every object in a level that's been mirrored left↔right (flipLevelHorizontally).
// Order matters: rotate OUTERMOST, mirror inside it. Both orders draw the same mirror image, but
// this one keeps Twist meaning "turn it this many degrees clockwise on screen" whether or not the
// object is flipped, so the slider still matches what you're looking at.
export const objRotStyle = (o) => {
  const parts = [];
  if (o && o.rot) parts.push("rotate(" + o.rot + "deg)");
  if (o && o.flip) parts.push("scaleX(-1)");
  return parts.length ? { transform: parts.join(" ") } : null;
};
// FINE POSITIONING. Objects are stored under a whole cell, so the smallest move used to be a
// full cell — which is why an object could never quite line up with the terrain under it. A nudge
// shifts the drawn object by a fraction of a cell without moving which cell it belongs to.
//
// Like Twist, this moves the ART and not the FOOTPRINT: a solid object still blocks the same
// square it always did, because the collision grid is axis-aligned cells. Same trade, same reason
// — and for decoration, which is what you're usually lining up, there's no difference at all.
// Absent (every object saved before this) means 0, so nothing that exists moves.
export const OBJ_NUDGE_STEP = 0.5;                       // cells per tap — half a cell, i.e. twice as fine as placement
export const OBJ_NUDGE_LIMIT = 4;                        // cells of offset allowed either way, so an object can't be nudged off into a different part of the level
export const clampObjNudge = (v) => Math.max(-OBJ_NUDGE_LIMIT, Math.min(OBJ_NUDGE_LIMIT, Math.round((v || 0) / OBJ_NUDGE_STEP) * OBJ_NUDGE_STEP));
export const objNudgedLeft = (o, c, cellPx) => c * cellPx + ((o && o.ox) || 0) * cellPx;
export const objNudgedTop = (o, r, cellPx) => r * cellPx + ((o && o.oy) || 0) * cellPx;
export const OBJ_ROT_NUDGE = 5;   // degrees per ↺/↻ tap — hillside angles are shallow, so 90° steps are useless here
export const normalizeObjRot = (deg) => ((Math.round(deg) % 360) + 360) % 360;
// Paint brush sizes (in cells) — applies to Foreground/Background only. Objects/Markers/Climb
// all stay single-cell: Objects/Markers place discrete items, and Climb is a toggle flag where
// a lingering large brush size could silently flood a huge area from one click.
const BRUSH_SIZES = [1, 2, 3, 4, 6, 8];
// The player's actual in-world size, in cells — not a display trick. 7 tall so the grid reads
// as fine detail around a properly human-sized character, not the other way around.
// The player's collision box must keep the SAME aspect ratio as the design canvas (W:H) —
// pieces are positioned by percentage of their container, so any mismatch between this box's
// aspect ratio and the design canvas's directly stretches/squishes the character. This was the
// real bug: at 1.2:7 the box was ~4.5x more squished than the 200:260 canvas, making every
// body look far skinnier in playtest than in the designer, no matter how it was drawn.
// Which painted Front-layer tiles the player's hitbox currently covers — these are the exact
// cells that should go translucent so the player stays visible while walking behind, say, a
// tree built out of Front tiles (they render above the player by design, z-index 6). Only the
// covered cells fade — the rest of the tree stays fully solid, so the effect reads as a soft
// window around the player rather than the whole object washing out.
// `padCells` grows that window outward in every direction, so you see a generous area around
// yourself rather than a keyhole traced exactly on your hitbox. Passing 0 (or nothing) gives the
// original hitbox-only behaviour, which is what the x-ray "am I actually inside this building?"
// test still wants — that question is about overlap, not about visibility.
export const frontFadeKeys = (front, x, y, pw, ph, CW, CH, padCells) => {
  const keys = [];
  if (!front) return keys;
  const pad = Math.max(0, padCells || 0);
  const c0 = Math.floor(x / CW) - pad, c1 = Math.floor((x + pw - 0.001) / CW) + pad;
  const r0 = Math.floor(y / CH) - pad, r1 = Math.floor((y + ph - 0.001) / CH) + pad;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const k = r + "," + c; if (front[k]) keys.push(k); }
  return keys;
};
// How far past the player's own body the see-through window reaches, in level blocks.
export const FRONT_FADE_PAD_CELLS = 5;
// Every Front cell reachable from `startKeys` by 4-way adjacency — i.e. one connected SHEET of
// Front tiles, such as the near wall/roof a building interior is painted with. The pedestal x-ray
// keys off this rather than off distance: the moment you step behind any part of an interior's
// covering you are "inside", so the whole covering should give up what it hides. Diagonals are
// deliberately NOT connected — two walls touching only at a corner are separate rooms, and
// leaking through that pixel would x-ray the building next door.
export const connectedFrontRegion = (front, startKeys) => {
  const seen = new Set();
  if (!front) return seen;
  const stack = [];
  for (const k of startKeys || []) if (front[k] && !seen.has(k)) { seen.add(k); stack.push(k); }
  while (stack.length) {
    const [r, c] = stack.pop().split(",").map(Number);
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nk = (r + dr) + "," + (c + dc);
      if (front[nk] && !seen.has(nk)) { seen.add(nk); stack.push(nk); }
    }
  }
  return seen;
};
// A pedestal's art box, in cells: ~1.9 wide, centred on its marker cell, and ~2.3 tall standing UP
// from it (the item floats above the marker, which sits at floor level). One definition, shared by
// the render that draws the box and the x-ray logic that asks which Front cells hide it — they must
// never disagree about where a pedestal visually is.
export const PED_BOX_W_CELLS = 1.9, PED_BOX_H_CELLS = 2.3;
export const pedestalCoverKeys = (r, c) => {
  const left = c + 0.5 - PED_BOX_W_CELLS / 2, top = r + 1 - PED_BOX_H_CELLS;
  const c0 = Math.floor(left), c1 = Math.floor(left + PED_BOX_W_CELLS - 0.001);
  const r0 = Math.floor(top), r1 = Math.floor(top + PED_BOX_H_CELLS - 0.001);
  const keys = [];
  for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) keys.push(rr + "," + cc);
  return keys;
};
// How ghosted an x-rayed pedestal should look, by how far the player is from it in blocks:
// 0 = its own normal texture, 1 = fully washed out. Close up you want to actually SEE the item
// you're walking toward; the wash-out is only there to say "this is somewhere over there, through
// a wall" at a distance. Anything nearer than NEAR is simply drawn normally.
export const PED_XRAY_NEAR_CELLS = 6, PED_XRAY_FAR_CELLS = 16;
export const pedestalXrayGhost = (distCells) =>
  Math.max(0, Math.min(1, ((distCells || 0) - PED_XRAY_NEAR_CELLS) / (PED_XRAY_FAR_CELLS - PED_XRAY_NEAR_CELLS)));
const PLAYER_H_CELLS = 7;
const PLAYER_RENDER_W_CELLS = PLAYER_H_CELLS * (W / H); // aspect-correct VISUAL width — never changes, avoids the squish
const PLAYER_CROUCH_H_CELLS = 4.2;
// Per-enemy size multiplier (default 1). enemyRenderW/enemyStandH/enemyCrouchH are the ONE source of
// enemy pixel dimensions, so the visible body and its hitbox/collision always scale by the same factor
// (every enemy dimension site routes through them). Clamped so a stray value can't break spawning.
// Sight range (PLAYER_BODY_LEN_PX) stays fixed on purpose — it's a sensing distance, not a body size.
export const enemyScale = (ea) => { const s = ea && typeof ea.scale === "number" ? ea.scale : 1; return s > 0 ? Math.max(0.5, Math.min(4, s)) : 1; };
export const enemyRenderW = (ea, cell) => cell * PLAYER_RENDER_W_CELLS * enemyScale(ea);
export const enemyStandH = (ea, cell) => cell * PLAYER_H_CELLS * enemyScale(ea);
export const enemyCrouchH = (ea, cell) => cell * PLAYER_CROUCH_H_CELLS * enemyScale(ea);
// Free-flying art (a fired Projectile, a thrown grenade) is drawn in the exact same 200×260
// design canvas every asset uses — the Projectile/Throwable editor just displays that canvas
// much bigger on screen than usual for precision. "The size it is in the creator" means: at the
// SAME px-per-design-unit scale the player's own body renders at, since that's the one shared
// scale everything in Playtest is actually compared against. These two helpers compute exactly
// that, replacing the old flat "one grid cell, always" / "N grid cells" sizing that had no
// relationship to the drawn art at all — a projectile or grenade drawn to fill its design canvas
// rendered many times smaller in Playtest than it looked while drawing it (the reported "teeny
// tiny, idk if it's even the right thing" bug), and a thrown grenade was always squashed into an
// exact 1-cell square regardless of its actual drawn shape.
//
// Bounding box of the actual drawn (non-hitbox, non-muzzle) art, in design units — the same units
// a body or weapon is drawn in. Falls back to a reasonable default box when there's no measurable
// art (e.g. a bare emoji fallback with no rect pieces at all), so an unmeasurable object still
// gets a sane size instead of collapsing to zero.
export const worldArtBox = (pieces) => {
  const art = (pieces || []).filter((p) => !p.isHitbox && !p.isMuzzle);
  if (!art.length) return { w: 44, h: 44, minX: (W - 44) / 2, minY: (H - 44) / 2 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of art) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x + p.w); maxY = Math.max(maxY, p.y + p.h); }
  return { w: Math.max(6, maxX - minX), h: Math.max(6, maxY - minY), minX, minY };
};
// Px-per-design-unit at the same scale the player's own body renders at (the player's full render
// box is exactly PLAYER_H_CELLS cells tall over the design canvas's H units) — the one shared
// scale that makes "as big as it looked in the creator, next to Bob" a real, checkable thing.
export const worldUnitPx = (cellPx) => cellPx * PLAYER_H_CELLS / H;
// Prepares a free-flying piece list (fired Projectile, thrown grenade) for rendering in the level.
// THE critical detail: every piece renders at a PERCENTAGE-of-the-200×260-canvas position
// (that's how shapeStyle places pieces, everywhere) — so the render container must be the FULL
// design canvas scaled to world px. The previous fix sized the container to the art's own
// bounding box, which shrank the art a second time by (bbox / canvas) — a hand-sized molotov
// (17×42 units of the 200×260 canvas) came out 13.7px × (17/200) ≈ 1px wide: exactly the
// reported "still only about 1 pixel large". This returns:
//   pieces / hitbox — translated so the ART's center sits at the canvas center, so the container
//                     (and any spin rotation about its center) is centered on the art itself
//   canvasWPx/canvasHPx — the render container's size: the full canvas at world scale
//   wPx/hPx — the art's own on-screen size (bbox × world scale): what hit-tests should use
export const prepFlyingArt = (allPieces, cellPx, sizeUnits) => {
  const box = worldArtBox(allPieces);
  const unit = worldUnitPx(cellPx) * (sizeUnits || 1);
  const dx = W / 2 - (box.minX + box.w / 2), dy = H / 2 - (box.minY + box.h / 2);
  const art = (allPieces || []).filter((p) => !p.isHitbox && !p.isMuzzle).map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
  const hb0 = (allPieces || []).find((p) => p.isHitbox) || null;
  return {
    pieces: art, hitbox: hb0 ? { ...hb0, x: hb0.x + dx, y: hb0.y + dy } : null,
    wPx: Math.max(4, box.w * unit), hPx: Math.max(4, box.h * unit),
    canvasWPx: W * unit, canvasHPx: H * unit,
  };
};
// How much of its own bounding box a character's "side" silhouette fills horizontally, and
// where its center sits. The COLLISION box is sized/positioned from this so the hitbox always
// tightly tracks whatever body is actually loaded — not a fixed guess that only fits the
// default. The wider render box is still used for drawing (so pieces never get distorted);
// it's just offset to keep the ACTUAL visible pixels aligned over this narrower hitbox.
const sideBodyShape = (asset) => {
  // A dressed character bakes its whole outfit into .angles.side — including a wide NIXON-style
  // hat brim, a cape, anything that sticks out well past the actual body. Measuring the collision
  // box from that full art made the hitbox a cell too wide in each direction (Bob, with his hat,
  // got frac ~0.66; hatless Bobette measured ~0.42 and looked correct — that asymmetry was the
  // reported "Bob's hitbox is a cell wider than it should be" bug, and it's the same over-wide
  // box behind the ramp/wall teleporting). The collision box should track the BODY, not the
  // costume: for a dressed look, measure the underlying body component directly; for a raw body/
  // enemy, measure it but drop pieces flagged as a hat/over-body accessory (_slot hat, behindBody
  // capes) so an accessory can never inflate the hitbox. Height uses the FULL art (a tall hat
  // shouldn't shrink standing height), only WIDTH/center are taken from the body-only box.
  const src = (asset && asset.components && asset.components.body && asset.components.body.angles && asset.components.body.angles.side && asset.components.body.angles.side.length)
    ? asset.components.body.angles.side
    : (asset && asset.angles && asset.angles.side) || null;
  if (!src || !src.length) return { fraction: 0.36, centerFrac: 0.5, topFrac: 0, heightFrac: 1 };
  const full = asset.angles && asset.angles.side && asset.angles.side.length ? asset.angles.side : src;
  // Width/center from the body only: drop hat and behind-body (cape) pieces, which stick out
  // past the torso without being part of the collision silhouette. If that leaves nothing
  // (e.g. an asset that's ONLY a hat, pathological), fall back to the full set.
  const isAccessory = (p) => p._slot === "hat" || p.behindBody;
  const bodyPieces = src.filter((p) => !isAccessory(p));
  const wps = bodyPieces.length ? bodyPieces : src;
  const minX = Math.min(...wps.map((p) => p.x)), maxX = Math.max(...wps.map((p) => p.x + p.w));
  const fraction = Math.max(0.15, Math.min(1, (maxX - minX) / W));
  const centerFrac = ((minX + maxX) / 2) / W;
  // Vertical extent from the FULL art (crop the hit box to real art height for compact enemies,
  // but never let a tall hat clip standing height): how far down pieces start and how tall the
  // drawn extent is, as fractions of the full canvas. Visual render box stays full-height.
  const minY = Math.min(...full.map((p) => p.y)), maxY = Math.max(...full.map((p) => p.y + p.h));
  const topFrac = Math.max(0, Math.min(1, minY / H));
  const heightFrac = Math.max(0.1, Math.min(1, (maxY - minY) / H));
  return { fraction, centerFrac, topFrac, heightFrac };
};
// The game only ever renders enemies in Side (walking) or Crouch (ducking). If the enemy was
// only drawn in some other pose — the extremely common case of drawing Front (the pose the
// editor opens on) and stopping — that pose comes back EMPTY from bake() and the enemy renders
// as literally nothing, i.e. invisible. Fall back to whichever pose actually has art so a drawn
// enemy is never invisible; the requested pose (and Side) still win whenever they have art, so
// a properly-drawn enemy is completely unaffected.
export const enemyPoseKey = (ea, want) => {
  const has = (ang) => !!(ea && ea.angles && (ea.angles[ang] || []).length);
  for (const ang of [want, "side", "front", "back", "up", "crouch"]) if (has(ang)) return ang;
  return want;
};
// Which pieces (by id) should walk/climb-cycle. Uses explicit limb flags if this pose has any —
// but flags are per-pose, and forgetting to set them on the one pose gameplay actually uses
// (Side for walking, Back for climbing) is an easy mistake. Rather than silently animating
// nothing in that case, fall back to a geometric guess: the piece(s) nearest the ground are
// almost certainly the leg, and the weapon arm (always present, guaranteed identifiable) is
// used as the arm if nothing else is flagged. Manual flags always win when they exist.
export const identifyLimbs = (blocks) => {
  const legIds = new Set(blocks.filter((b) => b.limb === "leg").map((b) => b.id));
  // Shoes are auto-flagged "leg" so they always follow one (see layerBodyAndOverlays), but that
  // shouldn't by itself satisfy "a leg is flagged" and suppress the fallback below — a shoe
  // with no actual leg in legIds has nothing to compute its foot-arc from and would just sit
  // still. Only a genuine (non-shoe) leg flag should skip the geometric fallback.
  const hasRealLeg = blocks.some((b) => b.limb === "leg" && !b._isShoe);
  const armIds = new Set(blocks.filter((b) => b.limb === "arm" && b.role !== "weaponArm").map((b) => b.id));
  if (!hasRealLeg) {
    const candidates = blocks.filter((b) => b.role !== "weaponArm" && !b._isShoe);
    if (candidates.length) {
      const maxBottom = Math.max(...candidates.map((b) => b.y + b.h));
      candidates.forEach((b) => { if (b.y + b.h >= maxBottom - 1) legIds.add(b.id); });
    }
  }
  if (!armIds.size) {
    const weaponArm = blocks.find((b) => b.role === "weaponArm");
    if (weaponArm) armIds.add(weaponArm.id);
  }
  return { legIds, armIds };
};
// Applies one walk/climb swing pose to a set of already-identified limbs. A real leg segment
// pivots at its own top (the hip) — but a shoe sits at the far end of that swinging leg, so
// rotating it around ITS OWN top just wobbles it in place, disconnected from the leg's actual
// arc (this was "shoes don't follow the walking cycle"). Shoes are approximated as rigidly
// attached to the leg instead: translated by the same arc offset the leg's own bottom tip
// traces for this swing angle (using the tallest true leg piece as the "upper leg" length),
// plus a small local tilt so the foot angles slightly with the stride.
// A leg is a CONNECTED chain of pieces running hip -> foot. Given the leg-flagged pieces, keep
// only the ones that actually link up to the lowest of them, walking outward by vertical-span
// overlap (a small gap is tolerated for art that doesn't quite touch). This exists because the
// hip pivot was taken as "the topmost leg-flagged piece", full stop — so a single piece flagged
// limb:"leg" by mistake somewhere up in the torso silently became the hip joint, and the whole
// leg (plus its shoe, which tracks a separate arc) orbited a point that could be ~90px too high.
// The leg visibly tore away from the body. For any body whose leg pieces do touch each other —
// which is every correctly-flagged body — the chain is all of them and nothing changes at all.
export const LEG_LINK_GAP = 8; // px of slack allowed between two pieces of the same leg
export const legChain = (legs) => {
  if (legs.length < 2) return legs;
  const lowest = legs.reduce((a, l) => (l.y + l.h > a.y + a.h ? l : a));
  const linked = (p, q) => p.y <= q.y + q.h + LEG_LINK_GAP && q.y <= p.y + p.h + LEG_LINK_GAP;
  const chain = [lowest];
  for (let grew = true; grew;) {
    grew = false;
    for (const p of legs) { if (chain.includes(p)) continue; if (chain.some((q) => linked(p, q))) { chain.push(p); grew = true; } }
  }
  return chain;
};
export const applyLimbSwing = (blocks, legIds, armIds, swing, opts) => {
  const o = opts || {};
  const trueLegs = blocks.filter((b) => legIds.has(b.id) && !b._isShoe);
  // Only the body's own connected leg chain decides where the hip joint is.
  const bodyLegs = trueLegs.filter((l) => !l._slot);
  const chain = legChain(bodyLegs.length ? bodyLegs : trueLegs);
  // A body leg piece that isn't part of that chain isn't a leg — it's a mis-flag. Leave it be
  // rather than swinging a chunk of torso around the hip.
  const stray = new Set(bodyLegs.filter((l) => !chain.includes(l)).map((l) => l.id));
  // Per-side alternation (o.alternate — the climb/back pose): mirror twins render inside
  // scaleX(-1), which visually REVERSES their rotation — the ladder alternation relied on
  // that. But which twin of a mirrored pair is the "original" is just an accident of which
  // side it was drawn on, so a pant-leg drawn on the opposite side of the canvas from the
  // body's own leg counter-rotated over it. Instead, pick each piece's ON-SCREEN swing purely
  // by which side of the body it sits on, then undo the mirror-render reversal so that's what
  // actually shows — anything covering the same physical leg now swings identically.
  const sideSign = (b) => (b.x + b.w / 2 >= W / 2 ? 1 : -1);
  // Legs group into COLUMNS by horizontal footprint: a leg = the pieces stacked over the same
  // spot (body leg + pant leg + shoe). A biped's one drawn leg is one column — exactly the old
  // behavior. A quadruped's front and back legs are SEPARATE columns: each anchors to ITS OWN
  // hip (before this, every leg orbited the single topmost hip — a back leg ~80px from the
  // front hip swept a huge vertical arc: the "second pair of legs pumps up and down" bug), and
  // neighbouring columns swing in OPPOSITE phase so a 4-legged walk reads as a gait, not a hop.
  const legColGap = 6;
  const xOverlap = (a, b) => a.x <= b.x + b.w + legColGap && b.x <= a.x + a.w + legColGap;
  const columns = [];
  for (const l of trueLegs) {
    const hits = columns.filter((c) => c.some((q) => xOverlap(q, l)));
    if (!hits.length) columns.push([l]);
    else { hits[0].push(l); for (const h of hits.slice(1)) { hits[0].push(...h); columns.splice(columns.indexOf(h), 1); } }
  }
  columns.sort((a, b) => Math.min(...a.map((p) => p.x)) - Math.min(...b.map((p) => p.x)));
  const colIndexOf = (b) => { let i = columns.findIndex((c) => c.includes(b)); if (i === -1) i = columns.findIndex((c) => c.some((q) => xOverlap(q, b))); return i; };
  const colSign = (b) => { if (columns.length < 2) return 1; const i = colIndexOf(b); return i >= 0 && i % 2 === 1 ? -1 : 1; };
  // Arm-limb pieces (equipment sleeves, etc.) anchor to the canonical weapon arm's own side
  // instead of each computing sideSign from its own x-position independently — a sleeve's
  // drawn shape doesn't always sit exactly symmetric to the arm underneath (a looser cuff, a
  // fold), so right at the canvas midline the two could disagree on which side they're "on",
  // visibly drifting apart during the climb's up/down reach (armReach, below).
  const weaponArmPiece = blocks.find((b) => b.role === "weaponArm" && !b._m);
  const armSideSign = weaponArmPiece ? sideSign(weaponArmPiece) : 1;
  const armSide = (b) => (b._m ? -armSideSign : armSideSign);
  // A clothing arm piece pumps in the same direction as the arm it RIDES — its nearest body
  // arm by position — not by its own mirror parity, which is meaningless when the garment was
  // drawn on the opposite side of the canvas from the body's arm (see armAnchorFinder).
  const nearestArm = armAnchorFinder(blocks);
  const renderFlip = (b) => (b._m && b.mirrorTwist !== false ? -1 : 1);
  // The hip joint a given leg piece orbits: the top-centre of the topmost piece of its own
  // leg, preferring the BODY's own leg (no _slot) over clothing so garments anchor to the leg
  // underneath them, grouped per on-screen side in alternate (ladder) mode since the two legs
  // swing oppositely there. Shared by the true-leg rotation and the shoe's foot-arc below, so
  // the two can never disagree about where the leg is hinged.
  const hipFor = (b) => {
    const col = o.alternate ? null : columns[colIndexOf(b)];
    const group = o.alternate ? trueLegs.filter((l) => sideSign(l) === sideSign(b)) : (col && col.length ? col : trueLegs);
    const linkedGroup = group.filter((l) => !stray.has(l.id));
    const anchors = linkedGroup.some((l) => !l._slot) ? linkedGroup.filter((l) => !l._slot) : linkedGroup;
    return anchors.length ? anchors.reduce((a, l) => (l.y < a.y ? l : a)) : null;
  };
  return blocks.map((b) => {
    // Climb arm reach (o.armReach): hands pump vertically, alternating sides like rungs —
    // a translation, not a rotation, and it includes the weapon arm (which the climb pose
    // points upward) so the whole reach reads as actually climbing.
    if (o.armReach && (b.role === "weaponArm" || armIds.has(b.id))) { const a = b.role === "weaponArm" ? b : (nearestArm(b) || b); return { ...b, y: b.y + armSide(a) * o.armReach }; }
    if (b.role === "weaponArm" || armIds.has(b.id)) return b; // clothing/equipment over the arm: only moves when the arm itself does (see the weaponArm-rotation call sites in the render section, which now also cover armIds)
    if (legIds.has(b.id)) {
      if (stray.has(b.id)) return b; // leg-flagged, but detached from the leg — don't swing torso
      // Ladder legs (o.legLift): a STEP, not a swing. Rotating a leg about the hip is a
      // sagittal motion — perfectly readable from the Side pose, invisible from the Back pose
      // the ladder actually uses, where the same rotation can only render as the leg splaying
      // left and right. Combined with o.alternate (each leg swinging by which side it is on)
      // that produced two legs scissoring open and shut every rung: a breaststroke kick, not a
      // climb. From behind, a climbing leg simply LIFTS to the next rung, alternating sides and
      // running contralateral to the hands (right hand reaches up as the left foot rises) —
      // which is exactly the vertical pump o.armReach already gives the arms, mirrored in sign.
      // Everything riding the leg (pant legs, shoes) is leg-flagged too, so it lifts with it.
      if (o.legLift) return { ...b, y: b.y - sideSign(b) * o.legLift };
      // A hanging DANGLE (o.legSway): the legs drift side to side together, and — like o.legLift
      // directly above — this is deliberately a TRANSLATION, not a rotation about the hip.
      // A mirror twin's x is already reflected into ordinary canvas space (see the reflect() that
      // builds twins), so one shared dx moves every piece over a leg — body leg, pant leg, shoe —
      // by the identical on-screen amount, and nothing worn on the leg can fall out of register.
      // Rotation cannot promise that: stored rot is sign-flipped for twins (renderFlip), so a pant
      // twin sitting over a non-twin body leg counter-rotates against it. That asymmetry is
      // exactly what made the cliff dangle peel the pants off the legs.
      if (o.legSway) return { ...b, x: b.x + o.legSway };
      // Non-alternate walk: each column swings by its column's phase (colSign), folded through
      // the mirror-render flip so what alternates is the ON-SCREEN motion — a far leg drawn via
      // the mirror flag renders inside scaleX(-1), which visually reverses stored rotation.
      // Single-column bodies (every biped) reduce to exactly the old `swing`.
      const vis = o.alternate ? sideSign(b) * swing : colSign(b) * swing * renderFlip(b); // the swing this piece should SHOW on screen (alternate) / apply in stored space (walk)
      // A SHOE gets no special case any more. It used to ride a translation-only foot-arc plus a
      // token 0.3x tilt, on the theory that a foot angles only slightly with the stride. But the
      // body's own foot/ankle art is part of the leg chain and rotates the FULL swing (28 degrees
      // at the peak of a walk), so a 8.4-degree shoe simply fell off the end of a 28-degree foot:
      // the bare skin foot swung out from under the shoe and past the pant cuff. A shoe is worn
      // ON the foot, so it must move exactly as the foot does. rigidLimbTransform below already
      // does the right thing for any piece far from the hip (orbit the hip, then rotate about the
      // piece's own top by the same angle) — which is precisely what "rigidly attached" means, and
      // is the same path every pant leg has always taken. The old worry that a shoe would "wobble
      // in place" applied only to rotating it about its own top WITHOUT the hip orbit.
      const newRot = (b.rot || 0) + vis * (o.alternate ? renderFlip(b) : 1);
      // Every leg piece rotates RIGIDLY about the actual hip joint, not about its own top.
      // Own-top pivots meant a pant leg whose waistband sits a few px above/below the body
      // leg's hip swept a slightly different arc (the "pants lag the leg and it clips out"
      // walking bug — 2.4px measured on the Military Fatigues), and a piece drawn far down
      // the leg (a calf triangle, a knee pocket) barely moved at all while the leg swept
      // away under it (12-27px measured on the ladder). The hip is the top-centre of the
      // topmost true leg piece, preferring the BODY's own leg (no _slot) over clothing so
      // garments anchor to the leg underneath them, grouped per on-screen side in alternate
      // (ladder) mode since the two legs swing oppositely there. For the topmost piece
      // itself the orbit is a no-op (it IS the pivot), so a plain body leg — and any
      // single-piece leg wearing nothing — behaves exactly as before.
      const hip = hipFor(b);
      if (hip && hip.id !== b.id) return { ...rigidLimbTransform(b, hip.x + hip.w / 2, hip.y, vis, newRot), _animPivotTop: true };
      return { ...b, rot: newRot, _animPivotTop: true };
    }
    return b;
  });
};
// A multi-column creature already draws complete front/back leg stacks. Rotate each whole authored
// stack as one rigid assembly around its own hip instead of either rotating every calf/paw around
// a separate local pivot (which breaks the stack) or sliding the stack horizontally (which is not
// a jointed walk). Piece centres orbit the shared hip and every piece receives the same visible
// angle, preserving all authored distances and existing local rotations. Neighbouring columns use
// opposite phase; a one-column biped still falls through to its established walk path.
export const MULTI_LEG_SWING_SCALE = 0.65;
export const multiLegPivot = (blocks, legIds, swing) => {
  const legs = (blocks || []).filter((b) => legIds.has(b.id));
  const gap = 6, overlaps = (a, b) => a.x <= b.x + b.w + gap && b.x <= a.x + a.w + gap;
  const columns = [];
  for (const leg of legs) {
    const hits = columns.filter((col) => col.some((p) => overlaps(p, leg)));
    if (!hits.length) columns.push([leg]);
    else { hits[0].push(leg); for (const extra of hits.slice(1)) { hits[0].push(...extra); columns.splice(columns.indexOf(extra), 1); } }
  }
  if (columns.length < 2) return null;
  columns.sort((a, b) => Math.min(...a.map((p) => p.x)) - Math.min(...b.map((p) => p.x)));
  const moved = new Map();
  columns.forEach((col, i) => {
    const bodyPieces = col.filter((p) => !p._slot && !p._isShoe);
    const hipPiece = (bodyPieces.length ? bodyPieces : col).reduce((a, p) => (p.y < a.y ? p : a));
    const jointX = hipPiece.x + hipPiece.w / 2, jointY = hipPiece.y;
    const visibleDelta = (i % 2 ? -1 : 1) * swing * MULTI_LEG_SWING_SCALE;
    const rad = visibleDelta * Math.PI / 180;
    for (const p of col) {
      // Leg pieces normally rotate about their centre. Orbit that exact render pivot around the
      // shared hip, then add the same ON-SCREEN angle. A live mirror reverses stored rotation, so
      // its stored delta is reversed too while its centre still follows the same world-space arc.
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      const dx = cx - jointX, dy = cy - jointY;
      const nx = jointX + dx * Math.cos(rad) - dy * Math.sin(rad);
      const ny = jointY + dx * Math.sin(rad) + dy * Math.cos(rad);
      const storedDelta = visibleDelta * (p._m && p.mirrorTwist !== false ? -1 : 1);
      moved.set(p.id, { ...p, x: p.x + nx - cx, y: p.y + ny - cy, rot: (p.rot || 0) + storedDelta });
    }
  });
  return (blocks || []).map((p) => moved.get(p.id) || p);
};
// Align a hand-drawn action pose to the ordinary Side-pose foot line. The Jumping Pit Bull's
// Attack art intentionally reaches much higher, but its back foot is also authored 22px lower;
// without this translation the renderer buries that foot instead of showing the extra height.
export const alignPoseFootBaseline = (baseBlocks, actionBlocks) => {
  const baseline = (list) => {
    const legs = (list || []).filter((p) => p.limb === "leg" && !p._slot);
    const source = legs.length ? legs : (list || []).filter((p) => !p.isHitbox && !p.isMuzzle);
    return source.length ? Math.max(...source.map((p) => p.y + p.h)) : null;
  };
  const baseY = baseline(baseBlocks), actionY = baseline(actionBlocks);
  if (baseY === null || actionY === null) return actionBlocks;
  const dy = baseY - actionY;
  return Math.abs(dy) < 0.001 ? actionBlocks : (actionBlocks || []).map((p) => ({ ...p, y: p.y + dy }));
};
// How much empty canvas sits BELOW the lowest drawn pixel of a pose, as a fraction of the canvas
// height. Every sprite wrapper is the full 200x260 canvas scaled onto the unit's render box, so
// empty canvas under the art is empty space under the body: art that stops short of the canvas
// floor — which is most art, since nobody draws right up to the bottom edge — hangs above the
// ground by exactly this much unless the wrapper is pushed down to compensate. Living enemies
// already do that (eFootAnchor in the enemy render); corpses did not, which is what left defeated
// enemies floating. Deliberately measured off the blocks actually being DRAWN rather than off Side,
// because a hand-drawn Death pose is authored lying down in the middle of the canvas and so has a
// completely different — much bigger — gap beneath it than the standing pose does.
export const poseFootGapFrac = (blocks) => {
  const art = (blocks || []).filter((p) => p && !p.isHitbox && !p.isMuzzle);
  if (!art.length) return 0;
  const maxY = Math.max(...art.map((p) => p.y + p.h));
  return Math.max(0, Math.min(1, (H - maxY) / H));
};
// Arms swing during a plain walk, opposite phase to the legs. applyLimbSwing deliberately never
// rotates arms (every other arm motion — melee, aim-hold, the climb reach — is an absolute pose
// SET by the render code), so the walk cycle had no arm motion at all: the weapon arm hung dead
// straight while the legs strode.
//
// SCOPE, and it matters: this moves the weapon arm and the GARMENT pieces riding it (sleeves and
// cuffs, which the composed character tags with _slot). It does not touch any other body piece,
// even one flagged limb:"arm". Before this function existed, a walk moved no arm-flagged piece at
// all; a body that walked correctly must keep walking correctly, so the walk cycle only ever adds
// motion to the one piece the body designates its arm (role:"weaponArm") plus the clothing on it.
// The melee/aim branches are broader by design — those are poses the player triggers.
export const WALK_ARM_SWING = 0.55; // arm amplitude as a fraction of the leg swing — subtle on purpose
export const walkArmMoves = (b) => b.role === "weaponArm" || (b.limb === "arm" && !!b._slot && !b._isShoe);
export const applyWalkArmSwing = (blocks, swing) => {
  const delta = swing * WALK_ARM_SWING;
  const twist = (b) => (b._m && b.mirrorTwist !== false ? -1 : 1);
  const armRot = (a) => (a.rot || 0) + armPivotSign(a.armPivot) * delta * twist(a);
  const anchorOf = armAnchorFinder(blocks);
  return blocks.map((b) => {
    if (!walkArmMoves(b)) return b;
    if (b.role === "weaponArm") return { ...b, rot: armRot(b) };
    const a = anchorOf(b);
    return a ? rigidArmFollow(b, a, armRot(a)) : { ...b, rot: armRot(b) };
  });
};
// Synthesizes a second, phase-opposite leg from whatever identifyLimbs already found (real leg
// piece(s) plus any shoe riding on them via _isShoe), so a body with only one drawn leg still
// reads as a normal two-legged walk cycle — a "back" leg swinging opposite the real one —
// instead of one leg pendulum-swinging alone in front of a static torso. The clone is swung
// with applyLimbSwing itself (same call, opposite sign), so it automatically gets the exact
// same hip-pivot/shoe-arc/mirror-twist behavior as the real leg, nothing to keep in sync by
// hand. Cloned pieces get their own ids (original + "_backLeg") so they never collide with the
// real leg's own ids in any later legIds-keyed lookup, and are placed FIRST in the returned
// array — with no explicit z-index anywhere in this renderer, DOM order alone decides
// front/behind, and earlier-in-array paints first, i.e. behind everything already in `blocks`
// (torso included), which is what actually makes it read as the trailing leg.
export const addBackLeg = (blocks, legIds, swing) => {
  const legPieces = blocks.filter((b) => legIds.has(b.id));
  if (!legPieces.length) return blocks;
  // A body that DRAWS multiple separate legs (a quadruped's front+back pair, or a mirrored
  // left/right pair) already has its own far leg(s). The synthetic counter-phase clone exists
  // only for one-drawn-leg bipeds — cloning over a multi-leg body doubled every leg in place
  // and scissored the pairs against each other.
  const bodyLegs = legPieces.filter((b) => !b._slot && !b._isShoe);
  const gap = 6, xov = (a, b) => a.x <= b.x + b.w + gap && b.x <= a.x + a.w + gap;
  const cols = [];
  for (const l of bodyLegs) {
    const hits = cols.filter((c) => c.some((q) => xov(q, l)));
    if (!hits.length) cols.push([l]);
    else { hits[0].push(l); for (const h of hits.slice(1)) { hits[0].push(...h); cols.splice(cols.indexOf(h), 1); } }
  }
  if (cols.length > 1) return blocks;
  const backLegIds = new Set();
  const backLeg = legPieces.map((b) => { const nb = { ...b, id: b.id + "_backLeg" }; backLegIds.add(nb.id); return nb; });
  return applyLimbSwing(backLeg, backLegIds, new Set(), -swing).concat(blocks);
};
const LV_COLORS = PALETTES.terrain.colors;
function newLevel() {
  const conns = {};
  for (const k of CONN_KEYS) conns[k] = { open: k === "E1" || k === "W1", accepts: "" };
  return { id: uid(), name: "Level", floor: "1", section: "", cols: 160, rows: 46, fg: {}, bg: {}, front: {}, fx: {}, climb: {}, hazard: {}, markers: {}, enemies: {}, conns };
}
// A ROOM is just a small level (isRoom + roomTag), entered through a door in a bigger level. Far
// smaller than a level (40×24 vs 160×46) and it doesn't use the 8 edge connectors — you reach it
// through doors that match its tag, and leave through a door back to where you came from.
function newRoom() {
  const conns = {};
  for (const k of CONN_KEYS) conns[k] = { open: false, accepts: "" };
  return { id: uid(), name: "Room", isRoom: true, roomTag: "", floor: "", section: "", cols: 40, rows: 24, fg: {}, bg: {}, front: {}, fx: {}, climb: {}, hazard: {}, markers: {}, enemies: {}, conns };
}
// Backfill older saves: category/field->floor+section (old thematic category becomes the
// Section label so nothing's silently lost, Floor starts blank for you to fill in), per-connector
// type->accepts, missing fx/climb/markers layers, and old single-object-per-cell fx entries get
// wrapped into the new stacked-array format.
function migrateLevel(lv) {
  if (!lv) return lv;
  const out = { ...lv };
  if (out.floor === undefined) { out.floor = ""; out.section = out.category || out.field || ""; }
  delete out.category; delete out.field;
  if (!out.bg) out.bg = {};
  if (!out.front) out.front = {};
  if (!out.fx) out.fx = {};
  const fx2 = {}; for (const k of Object.keys(out.fx)) { const v = out.fx[k]; const arr = Array.isArray(v) ? v : [v]; fx2[k] = arr.map((o) => o.kind ? o : { ...o, kind: "emoji" }); }
  out.fx = fx2;
  if (!out.climb) out.climb = {};
  const climb2 = {}; for (const k of Object.keys(out.climb)) climb2[k] = { kind: climbKindOf(out.climb[k]) || "ladder" };
  out.climb = climb2;
  if (!out.hazard) out.hazard = {};
  const haz2 = {}; for (const k of Object.keys(out.hazard)) { const v = out.hazard[k]; haz2[k] = (v && typeof v === "object") ? { kind: v.kind || "fire", dps: v.dps ?? DEFAULT_HAZARD_DPS[v.kind || "fire"], life: v.life ?? 0, ...(v.hideInPlay ? { hideInPlay: true } : {}) } : { kind: "fire", dps: DEFAULT_HAZARD_DPS.fire, life: 0 }; }
  out.hazard = haz2;
  if (!out.markers) out.markers = {};
  if (out.isRoom) out.roomTag = out.roomTag || "";
  if (!out.enemies) out.enemies = {};
  const conns = {};
  for (const k of CONN_KEYS) { const c = (out.conns && out.conns[k]) || { open: false }; conns[k] = { open: !!c.open, accepts: c.accepts !== undefined ? c.accepts : (c.type || "") }; }
  out.conns = conns;
  return out;
}
const cellKey = (r, c) => r + "," + c;
// A Prop is authored on the same tall 200x260 canvas as every other asset, but the visible art
// may occupy only a small, wide strip of it (a trailer near the bottom is the common example).
// Level placement used to turn the chosen size into a size-by-size SQUARE regardless, so a 40x
// trailer acquired a huge empty collision/selection box above it. Measure the union of every
// animation frame's actually drawn art instead. Authored hitbox and muzzle helpers are editor
// metadata, cutters draw holes rather than pixels, and none of them may inflate this box.
export const propVisibleArtBox = (propAsset) => {
  const frames = (propAsset && propAsset.frames && propAsset.frames.length)
    ? propAsset.frames
    : [propAsset && propAsset.angles].filter(Boolean);
  const visible = [];
  for (const frame of frames) for (const piece of ((frame && frame.front) || [])) {
    if (piece.isHitbox || piece.isMuzzle || piece.isCutter) continue;
    visible.push(piece);
    if (piece.mirror) visible.push({ ...piece, x: W - (piece.x + piece.w) });
  }
  return worldArtBox(visible);
};
// Existing saved placements intentionally keep their old square layout unless `fitArt` is set:
// silently opting every old level into tight bounds would move already-positioned scenery. New
// Prop placements set fitArt=true, and the object inspector offers the same conversion explicitly.
export const levelObjectFootprint = (object, propAsset) => {
  const size = Math.max(1, (object && object.size) || 1);
  if (!object || object.kind !== "prop" || !object.fitArt || !propAsset) return { cols: size, rows: size, box: null };
  const box = propVisibleArtBox(propAsset);
  const scale = size / Math.max(box.w, box.h);
  return { cols: Math.max(1, box.w * scale), rows: Math.max(1, box.h * scale), box };
};
export const objFootprintAnchor = (r, c, footprint) => {
  const rows = Math.max(1, (footprint && footprint.rows) || 1);
  const cols = Math.max(1, (footprint && footprint.cols) || 1);
  const rowOff = Math.floor((rows - 1) / 2), colOff = Math.floor((cols - 1) / 2);
  return { r: Math.max(0, r - rowOff), c: Math.max(0, c - colOff) };
};
// Objects are stored under their TOP-LEFT cell in lv.fx, but you aim them by their MIDDLE:
// clicking places a size-N object centred on the cell you clicked, so a 20× tree lands where you
// pointed instead of hanging down-and-right of it. Corner-anchoring made anything bigger than a
// few cells impossible to aim — you had to click well off to one side and guess. Only placement
// moves; the renderer and the solid-hitbox scan still read the key as the top-left corner, so
// levels built before this sit exactly where they always did. Clamped at 0 so an object aimed
// near the top/left edge keeps a real on-map key instead of a negative one that renders
// off-canvas. Even sizes can't straddle a cell, so they lean up-left by the half cell.
export const objAnchor = (r, c, size) => objFootprintAnchor(r, c, { rows: size || 1, cols: size || 1 });
export const objAnchorKey = (r, c, size) => { const a = objAnchor(r, c, size); return cellKey(a.r, a.c); };
export const objAnchorForObject = (r, c, object, propAsset) => objFootprintAnchor(r, c, levelObjectFootprint(object, propAsset));
export const objAnchorKeyForObject = (r, c, object, propAsset) => { const a = objAnchorForObject(r, c, object, propAsset); return cellKey(a.r, a.c); };
// The reverse lookup. Now that objects are centred, the cell you click is almost never an
// object's anchor cell, so erase / pick-up / inspect can't just index lv.fx by the clicked key
// any more — they have to find which stored footprint the cell falls inside. An exact anchor hit
// still wins; otherwise the SMALLEST object covering the cell does, so a little prop resting on
// a huge backdrop is the one you grab rather than the backdrop swallowing every click over it.
export const objKeyAt = (lv, r, c, findAsset) => {
  if (!lv || !lv.fx) return null;
  const exact = cellKey(r, c);
  if (lv.fx[exact] && lv.fx[exact].length) return exact;
  let best = null, bestArea = Infinity;
  for (const k of Object.keys(lv.fx)) {
    const stack = lv.fx[k]; if (!stack || !stack.length) continue;
    const [rr, cc] = k.split(",").map(Number);
    for (const o of stack) {
      const fp = levelObjectFootprint(o, o.kind === "prop" && findAsset ? findAsset(o.propId) : null);
      const area = fp.rows * fp.cols;
      if (r >= rr && r < rr + fp.rows && c >= cc && c < cc + fp.cols && area < bestArea) { best = k; bestArea = area; }
    }
  }
  return best;
};
// Removes one exact object from a stored stack. Object erase clicks carry both the anchor key and
// stack index from the artwork that was actually hit; deleting by footprint alone is ambiguous
// whenever two props overlap or one prop has transparent space inside its placement rectangle.
export const removeLevelObject = (lv, key, stackIndex) => {
  if (!lv || !lv.fx || !Array.isArray(lv.fx[key]) || stackIndex < 0 || stackIndex >= lv.fx[key].length) return lv;
  const remaining = lv.fx[key].filter((_, i) => i !== stackIndex);
  const fx = { ...lv.fx };
  if (remaining.length) fx[key] = remaining;
  else delete fx[key];
  return { ...lv, fx };
};
/* ---- Mirroring a whole level left↔right -------------------------------------------------
A level you have already built is most of the work of its mirror image, so a downhill run can
become the uphill one instead of being drawn again from scratch.

Every layer is keyed "r,c", so the move itself is only c -> cols-1-c. What needs care is
everything that carries a DIRECTION, because a mirror has to reverse each one or the flipped
level comes out subtly wrong rather than obviously wrong:

  ramps       slope flips sign, and `step` (which is always counted left-to-right, whichever way
              the ramp climbs) now counts from the other end — a 4-cell ramp's step 0 cell is its
              step 3 cell in the mirror. Multi-fill cells flip every fill, `more` included.
  objects     stored under their TOP-LEFT cell, so an N-wide object's new key is cols-c-N, NOT
              cols-1-c — mirroring by the anchor alone would shove every big prop N cells right.
              The art mirrors too (`flip`), and a Twist angle reverses along with it.
  nudges      `ox` is a signed cell offset, so it points the other way.
  enemies     `facing` is -1/1.
  connectors  CONN_FLIP_H — the exits move to the sides they now sit on.

Anything with no direction — colour, texture, outline, hide-in-play, climb kind, hazard, doors,
pedestals, the level's own name/floor/section — just rides along on the new key. */
export const flipFgFill = (fill) => {
  if (!fill || typeof fill !== "object") return fill; // a plain colour string is a full block: nothing in it points anywhere
  const out = { ...fill };
  if (fill.slope === 1 || fill.slope === -1) {
    const run = fill.run > 0 ? fill.run : 1, step = fill.step >= 0 ? fill.step : 0;
    out.slope = -fill.slope;
    out.run = run;
    out.step = run - 1 - step;   // same cell of the ramp, counted from the far end
  }
  if (Array.isArray(fill.more)) out.more = fill.more.map(flipFgFill);
  return out;
};
// fg / bg / front: cell values that can hold ramp shapes.
export const flipCellLayer = (layer, cols) => {
  const out = {};
  for (const k of Object.keys(layer || {})) {
    const [r, c] = k.split(",").map(Number);
    out[cellKey(r, cols - 1 - c)] = flipFgFill(layer[k]);
  }
  return out;
};
// climb / hazard / markers: one directionless record per cell, so only the key moves. Copied
// rather than shared, so the flipped level can never write through into the level it came from.
export const flipPlainLayer = (layer, cols) => {
  const out = {};
  for (const k of Object.keys(layer || {})) {
    const [r, c] = k.split(",").map(Number);
    const v = layer[k];
    out[cellKey(r, cols - 1 - c)] = (v && typeof v === "object") ? { ...v } : v;
  }
  return out;
};
export const flipEnemyLayer = (layer, cols) => {
  const out = {};
  for (const k of Object.keys(layer || {})) {
    const [r, c] = k.split(",").map(Number);
    const e = layer[k] || {};
    // Absent facing means left (the playtest loop reads `spawn.facing === 1 ? 1 : -1`), so the
    // mirror of "no facing" is an explicit right — not another left.
    out[cellKey(r, cols - 1 - c)] = { ...e, facing: e.facing === 1 ? -1 : 1 };
  }
  return out;
};
// One placed object's new home. Returns the new anchor column and the object itself.
// The exact mirrored left edge rarely lands on a whole cell for an art-fitted prop (its footprint
// is fractional), so the whole-cell part becomes the key and the remainder goes into the nudge —
// which is exactly what the nudge is for, and keeps the prop lined up against the terrain it was
// lined up against before instead of drifting up to half a cell.
export const flipLevelObject = (o, c, cols, propAsset) => {
  const fp = levelObjectFootprint(o, propAsset);
  const exactLeft = cols - (c + ((o && o.ox) || 0) + fp.cols);
  const nc = Math.max(0, Math.round(cols - c - fp.cols));
  const ox = Math.max(-OBJ_NUDGE_LIMIT, Math.min(OBJ_NUDGE_LIMIT, exactLeft - nc));
  // Twist is negated rather than left alone because the flip is drawn as rotate() then scaleX(-1)
  // (objRotStyle): with the rotation applied outermost, the slider keeps reading the angle you
  // actually see on screen, so a prop leaning 20° into a hill reads 340° once the hill is mirrored.
  return { c: nc, o: { ...o, flip: !(o && o.flip), rot: normalizeObjRot(-((o && o.rot) || 0)), ox } };
};
export const flipConns = (conns) => {
  const out = {};
  for (const k of CONN_KEYS) { const c = (conns || {})[k]; if (c) out[CONN_FLIP_H[k]] = { ...c }; }
  return out;
};
export const flipLevelHorizontally = (lv, findAsset) => {
  if (!lv) return lv;
  const cols = Math.max(1, lv.cols || 1);
  const fx = {};
  for (const k of Object.keys(lv.fx || {})) {
    const [r, c] = k.split(",").map(Number);
    for (const o of (lv.fx[k] || [])) {
      const moved = flipLevelObject(o, c, cols, (o.kind === "prop" && findAsset) ? findAsset(o.propId) : null);
      const key = cellKey(r, moved.c);
      // Two objects that used to sit in different cells can mirror onto the same anchor (rounding
      // on fractional footprints). Appending keeps each stack's own paint order, which is its
      // z-order within the cell.
      (fx[key] = fx[key] || []).push(moved.o);
    }
  }
  return {
    ...lv,
    fg: flipCellLayer(lv.fg, cols),
    bg: flipCellLayer(lv.bg, cols),
    front: flipCellLayer(lv.front, cols),
    fx,
    climb: flipPlainLayer(lv.climb, cols),
    hazard: flipPlainLayer(lv.hazard, cols),
    markers: flipPlainLayer(lv.markers, cols),
    enemies: flipEnemyLayer(lv.enemies, cols),
    conns: flipConns(lv.conns),
  };
};
// Monotonic token identifying the newest Playtest loop. Only the loop whose local generation
// still equals this may advance physics; any older loop left alive by an overlapping remount
// (React StrictMode double-invoke, fast level/loadout re-key) sees it's been superseded and
// stops — so player.current can never be driven by two loops at once (the double-mount
// teleport/jitter). Module scope on purpose: it must be shared across every effect instance.
let __ptLoopGen = 0;
// Flood-fill's region finder — shared by the actual Fill commit and its live hover preview, so
// what you SEE before clicking is guaranteed to match what clicking would actually do. Standard
// bucket semantics: whatever value the clicked cell currently holds (including "nothing" — the
// common case of filling empty space) spreads to every 4-directionally connected cell sharing
// that same value. Capped at a generous cell count so a mis-click on a huge open level can't
// hang the tab.
const computeFillRegion = (lv, layerName, r0, c0) => {
  const layer = lv[layerName];
  const startVal = layer[cellKey(r0, c0)] ?? null;
  const sameAsStart = (v) => {
    if (startVal === null) return v === undefined || v === null;
    if (v === undefined || v === null) return false;
    // One rule for every layer now (see cellSig): base color + ramp shape + texture. Previously
    // Background/Front compared with `===`, which can't see that two cells share a color but
    // carry different textures.
    return cellSig(v) === cellSig(startVal);
  };
  const visited = new Set();
  const stack = [[r0, c0]];
  const cells = [];
  const MAX_CELLS = 8000;
  while (stack.length && cells.length < MAX_CELLS) {
    const [r, c] = stack.pop();
    if (r < 0 || c < 0 || r >= lv.rows || c >= lv.cols) continue;
    const k = cellKey(r, c);
    if (visited.has(k)) continue;
    visited.add(k);
    if (!sameAsStart(layer[k] ?? null)) continue;
    cells.push(k);
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return { cells, startVal, hitCap: cells.length >= MAX_CELLS };
};
// A Foreground cell is normally a plain color string (a full solid block). It can instead be
// a ramp cell: { c: color, slope: 1 | -1, run: N, step: i }. slope 1 rises left→right, -1
// rises right→left. A ramp can span several cells in the same row that together bridge a
// single 1-cell height change: run is the ramp's total length in cells, step (0-indexed,
// always counted left-to-right regardless of slope direction) is this cell's position in it.
// A lone 45° ramp is just run:1, step:0 — old saves without run/step default to that via
// fgRun()/fgStep() below, so they keep rendering and colliding exactly as before.
const fgHasDiagonalShape = (cell) => !!(cell && typeof cell === "object" && (cell.slope === 1 || cell.slope === -1));
// A Foreground cell can hold MORE THAN ONE FILL, because two materials genuinely have to coexist
// in one cell for terrain to read as continuous: a gravel ramp crossing grass blocks, or an
// ascending grass ramp meeting a descending gravel one to make a peak. A cell used to be a single
// value with a single shape, so the second paint had nowhere to go — it either wiped the first out
// or (worse) kept the first's material in the shape of the second and dropped the new paint
// entirely, which is what turned a grass block under a gravel ramp into a lone grass splinter.
//
// So a cell object may carry `more`: extra fills sitting UNDER the primary one, each with its own
// colour / texture / outline / shape. The primary fill stays exactly where it has always been on
// the cell object and `more` is simply absent on a single-material cell, so every existing reader
// and every already-saved level keeps working untouched.
//
// A "fill" is the same vocabulary as a cell minus the nesting: { c, tex, ol, slope, run, step,
// upsideDown, hideInPlay }. `hideInPlay` is collision-only terrain: it remains visible (marked)
// in the editor, disappears from Playtest, and still uses the exact same block/ramp collision
// path. fgFills() hands fills back newest-first (primary, then progressively older) — the render
// walks that list backwards so the newest paint lands on top.
const fgFillOf = (cell) => { if (cell === null || cell === undefined) return null; if (typeof cell !== "object") return { c: cell }; const { more, ...fill } = cell; return fill; };
export const fgFills = (cell) => { const f = fgFillOf(cell); if (!f) return []; const more = (typeof cell === "object" && Array.isArray(cell.more)) ? cell.more : []; return [f, ...more]; };
export const fgHiddenInPlay = (fill) => !!(fill && typeof fill === "object" && fill.hideInPlay);
// Upside-down ramps (cell.upsideDown) are visual only — a cliff-underside/overhang look, not a
// walkable surface — so they're excluded here (collides as a plain solid block) even though
// fgHasDiagonalShape still renders their diagonal clip-path. Works on a fill and on a whole cell
// alike, since a fill is just a cell without `more`.
export const fgIsSlope = (cell) => fgHasDiagonalShape(cell) && !cell.upsideDown;
// Collision on a multi-fill cell is the UNION of what was painted there. It BLOCKS if any fill
// occupies the whole cell (a plain block, or an upside-down wedge — those have always collided
// solid), and the walkable surfaces are every slope fill, so an up-ramp meeting a down-ramp
// collides as the peak the two of them draw instead of only the last one painted.
export const fgSlopeFills = (cell) => fgFills(cell).filter(fgIsSlope);
export const fgSolid = (cell) => fgFills(cell).some((f) => !fgIsSlope(f));
const fgColor = (cell) => (cell && typeof cell === "object") ? cell.c : cell;
const fgRun = (cell) => (fgHasDiagonalShape(cell) && cell.run > 0) ? cell.run : 1;
const fgStep = (cell) => (fgHasDiagonalShape(cell) && cell.step >= 0) ? cell.step : 0;
// How far this x position is from the ramp's LOW end, in cell-widths (0 at the low end, `run`
// at the high end) — step is always left-to-right, so which end is "low" depends on slope.
const fgDistFromLow = (cell, localFrac) => {
  const run = fgRun(cell), step = fgStep(cell);
  return cell.slope > 0 ? (step + localFrac) : (run - step - localFrac);
};
// The ramp surface's y-pixel under a given x column, sampled across rows r0..r1, or null if
// none of those cells hold a slope in that column. Returns the direction too, so the caller
// can tell ascending from descending. When multiple slope rows overlap, the highest (smallest
// y) surface wins, matching how solid-block landing already prefers the topmost hit.
export const slopeSurfaceAt = (lv, xPixel, r0, r1, CW, CH) => {
  const c = Math.floor(xPixel / CW); if (c < 0 || c >= lv.cols) return null;
  let best = null;
  for (let r = r0; r <= r1; r++) {
    if (r < 0 || r >= lv.rows) continue;
    // Every slope fill in the cell is a real surface — a cell holding both an up-ramp and a
    // down-ramp offers two, and the highest wins just as it does across rows.
    for (const cell of fgSlopeFills(lv.fg[cellKey(r, c)])) {
      const localFrac = Math.min(1, Math.max(0, (xPixel - c * CW) / CW));
      const overallFrac = fgDistFromLow(cell, localFrac) / fgRun(cell); // 0 at the ramp's low end, 1 at its high end
      const y = (r + 1) * CH - overallFrac * CH;
      if (best === null || y < best.y) best = { y, dir: cell.slope, run: fgRun(cell) };
    }
  }
  return best;
};
// Player-ground variant: pick the ramp surface NEAREST the feet within reach this frame.
// slopeSurfaceAt always took the highest (smallest-y) surface in a wide row band, which grabbed
// the wrong tier when dropping onto a downslope and teleported the player sideways/down into
// unrelated geometry. Lower-row scanning is bounded by the distance the feet can actually reach
// this frame, so joined downhill pieces stay connected without grabbing distant terrain.
export const slopeSurfaceForPlayer = (lv, xPixel, headY, feetBottom, vy, dx, dtMul, CW, CH) => {
  const c = Math.floor(xPixel / CW); if (c < 0 || c >= lv.cols) return null;
  const headRow = Math.floor(headY / CH);
  const feetRow = Math.floor((feetBottom - 0.001) / CH);
  const sR0 = headRow;
  // While falling, the scan must cover every row the feet swept through this frame — at the
  // loop's dt clamp of 3, a long fall moves vy*dt (up to ~100px+) in one step, so a fixed +1
  // row starved the down-reach. Grounded movement adds only the rows downReach can really cover.
  const sweep = vy > 0.5 ? vy * (dtMul || 1) : 0;
  // downReach is how far BELOW the feet a ramp surface may still be snapped to this frame.
  // It must NOT depend on horizontal INPUT: the old `+ Math.abs(dx)` meant a player HOLDING a
  // direction (dx = full walk speed) could catch a ramp lip that an IDLE player (dx = 0, or
  // only the ~1.6px slide) could not — so letting go of Right on a stairs+ramp formation
  // dropped you THROUGH the ramp onto the stair backing underneath, or slid you off to the
  // side. Reach is a vertical question (how far the feet could have moved past the surface),
  // so base it on fall speed plus a fixed stick equal to one normal ground step (7px), and
  // still honour any larger actual dx so a fast walker reaches at least as far as before.
  const reachStick = Math.max(Math.abs(dx || 0), 7 * (dtMul || 1)); // 7 = base ground speed
  const downReach = Math.max(2, vy * (dtMul || 1) + reachStick + 2);
  // A joined downhill ramp starts its next piece in the row BELOW the old one. Just before the
  // feet cross that row boundary, scanning only feetRow loses the ramp for a frame even though
  // its next surface is merely a few pixels below and inside downReach. Scan as many lower rows
  // as the real reach can cover. The loop rejects an above-feet surface from those extra rows,
  // so this cannot pull somebody upward through a ramp while walking in a corridor underneath.
  const belowRows = Math.max(1, Math.ceil(downReach / CH));
  const sR1 = feetRow + (vy > 0.5 ? Math.max(belowRows, Math.ceil(sweep / CH)) : belowRows);
  let best = null;
  for (let r = sR0; r <= sR1; r++) {
    if (r < 0 || r >= lv.rows) continue;
    // Same as slopeSurfaceAt: a cell can hold more than one ramp (an up meeting a down), and each
    // one is a surface the feet could legitimately land on this frame.
    if (vy < 0) continue;
    for (const cell of fgSlopeFills(lv.fg[cellKey(r, c)])) {
      const localFrac = Math.min(1, Math.max(0, (xPixel - c * CW) / CW));
      const overallFrac = fgDistFromLow(cell, localFrac) / fgRun(cell);
      const surfaceY = (r + 1) * CH - overallFrac * CH;
      const gap = surfaceY - feetBottom; // >0 surface below feet, <0 surface above feet
      if (r > feetRow && gap < 0) continue; // extra downward probe is for the next floor, never an overhead ramp
      // Above-feet window: the classic 31px catches burial after modest steps; the sweep term
      // additionally accepts any surface the feet CROSSED during this frame's motion (fast-fall
      // straddle at big dt). It never exceeds the actual swept distance, so a player standing or
      // falling in the corridor UNDER a ramp — whose feet were already below the surface before
      // this frame — can never be snapped up through it.
      const canSnap = gap <= 0 ? gap >= -Math.max(CH + 1, sweep + 2) : gap <= downReach;
      if (!canSnap) continue;
      if (best === null || Math.abs(gap) < Math.abs(best.gap)) best = { y: surfaceY, dir: cell.slope, run: fgRun(cell), gap };
    }
  }
  return best;
};
// CSS clip-path for a Foreground cell: "none" for a solid block, or a triangle/trapezoid
// slice of the ramp's diagonal for a slope cell (a trapezoid for any interior cell of a
// multi-cell ramp — only the ramp's two end cells are true triangles).
const fgClipPath = (cell) => {
  if (!fgHasDiagonalShape(cell)) return "none";
  const run = fgRun(cell);
  const frac = (localFrac) => (fgDistFromLow(cell, localFrac) / run) * 100; // % from the ramp's low end
  if (cell.upsideDown) return "polygon(0 0%, 100% 0%, 100% " + frac(1) + "%, 0 " + frac(0) + "%)"; // solid hangs from the top — cliff underside/overhang look
  const topFrac = (localFrac) => 100 - frac(localFrac);
  return "polygon(0 " + topFrac(0) + "%, 100% " + topFrac(1) + "%, 100% 100%, 0 100%)";
};
// A comparable shape signature for a Foreground cell — used by flood-fill/move to tell "same
// shape" apart (plain block vs. an up-ramp vs. a down-ramp vs. either's upside-down/visual twin).
const fgShapeSig = (cell) => !fgHasDiagonalShape(cell) ? "block" : (cell.slope > 0 ? "up" : "down") + (cell.upsideDown ? "_ud" : "");
// What painting `val` onto a cell that already holds something produces. A RAMP never destroys
// what was already there — it stacks on top of it, so the old material keeps filling its own
// shape and the new ramp draws its diagonal in the newly-selected one. That is what makes all
// three of these work, none of which a single-value cell could express:
//
//   grass blocks, then a gravel ramp across them  -> gravel diagonal over intact grass
//   gravel ramp, then the opposing grass ramp     -> a two-material peak, both ramps walkable
//   either order, any number of times             -> same result, because order only decides
//                                                    which one draws on top
//
// Two rules keep the stack from turning into junk. Repainting a shape that is ALREADY in the cell
// replaces that fill instead of stacking a second copy of it — so painting the same ramp twice is
// the escape hatch for "no, I just want a plain ramp in the selected colour here". And a plain
// BLOCK fills the whole cell, so nothing could show underneath it: painting one is a clean reset
// rather than a merge, which is the escape hatch for "clear all of this out". Between them the
// stack is bounded by the five distinct shapes a cell has (block, up, down, and each ramp's
// upside-down twin), with no arbitrary cap needed.
export const mergeFgFill = (cell, val) => {
  if (cell === null || cell === undefined) return val;           // empty cell — nothing to merge with
  const fill = fgFillOf(val);
  if (!fgHasDiagonalShape(fill)) return val;                     // a solid block hides everything under it
  const sig = fgShapeSig(fill);
  const under = fgFills(cell).filter((f) => fgShapeSig(f) !== sig);
  return under.length ? { ...fill, more: under } : val;          // `val` unchanged keeps a plain colour string plain
};

/* ============================== TEXTURES ==================================
   A painted cell has always been either a plain color string, or an object carrying a ramp
   shape. It can now also carry `tex` — the id of a saved TEXTURE INSTANCE. An instance is just
   { id, name, tex: "brick", colors: {...}, params: {...} }: you never draw a texture, you pick
   one of the built-in patterns and decide its colors (and, for metal, how rusty it is).

   Each pattern is rendered once into an SVG data-URI tile and used as a repeating CSS
   background. Crucially the tile is positioned by the cell's WORLD position (r, c), not per
   cell — so a wall of bricks lines up across every cell it spans instead of restarting the
   pattern in each 30px square. Everything here is deterministic: the same palette always
   produces the same bytes, so the data-URI cache never misses and nothing shimmers between
   frames.

   A cell still keeps a flat base color `c` alongside `tex`. That's what the minimap, the
   eyedropper and the flood-fill match on, and what the cell falls back to if its texture is
   ever deleted — a textured level can never render as nothing. */
const px = (n) => Math.round(n * 100) / 100;
// Deterministic pseudo-random in [0,1). Same seed, same value, forever — no Math.random() in
// any texture, or the pattern would change on every re-render.
const trnd = (seed) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const svgRect = (x, y, w, h, fill, extra) => `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="${fill}"${extra || ""}/>`;
// A hand-dyed ring: a closed loop whose radius wanders instead of a perfect circle. Tie-dye rings
// come from cloth that was scrunched and tied, so a true circle is the one shape they are never —
// the wobble is what stops the pattern reading as a printed target. Deterministic (trnd), so the
// same seed draws the same blotch forever and sliding Crinkle deepens THAT shape rather than
// reshuffling it on every keystroke.
const dyeRing = (cx, cy, r, wobble, seed, fill) => {
  const pts = 16;
  let d = "";
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const rr = r * (1 + (trnd(seed + i * 3.7) - 0.5) * wobble);
    d += (i === 0 ? "M" : "L") + px(cx + Math.cos(a) * rr) + "," + px(cy + Math.sin(a) * rr);
  }
  return `<path d="${d}Z" fill="${fill}"/>`;
};
// One rosette: rings drawn largest first so each colour lands inside the one before it, which is
// exactly the order dye soaks outward from a tied centre.
const dyeRosette = (cx, cy, r0, ring, wobble, seed) => {
  let out = "";
  for (let i = 0; i < ring.length; i++) out += dyeRing(cx, cy, r0 * (1 - i / ring.length), wobble, seed + i * 19.3, ring[i]);
  return out;
};

// Rows of offset bricks. Shared by Brick / Big brick / Stone brick — they differ only in unit
// size, gap, and how much the row widths wander.
const brickCourse = (tw, th, bw, bh, gap, mortar, shades, jitter) => {
  let out = svgRect(-2, -2, tw + 4, th + 4, mortar);
  const rows = Math.round(th / bh);
  for (let row = 0; row < rows; row++) {
    const y = row * bh;
    const off = (row % 2) ? -bw / 2 : 0;
    let x = off - bw;
    let i = 0;
    while (x < tw + bw) {
      const w = jitter ? bw * (0.72 + trnd(row * 7.3 + i * 3.1) * 0.55) : bw;
      const shade = shades[Math.floor(trnd(row * 13.7 + i * 5.9) * shades.length) % shades.length];
      out += svgRect(x + gap / 2, y + gap / 2, Math.max(2, w - gap), Math.max(2, bh - gap), shade);
      x += w; i++;
    }
  }
  return out;
};

export const TEXTURES = {
  brick: {
    label: "Brick", icon: "🧱", tile: [60, 30], base: "a",
    colors: [["mortar", "Mortar", "#8a8580"], ["a", "Brick", "#8f3b2e"], ["b", "Brick (light)", "#a4483a"], ["c", "Brick (dark)", "#71301f"]],
    params: [],
    svg: (co) => brickCourse(60, 30, 30, 15, 2.5, co.mortar, [co.a, co.b, co.c, co.a], false),
  },
  bigBrick: {
    label: "Big brick", icon: "🟫", tile: [120, 60], base: "a",
    colors: [["mortar", "Mortar", "#7d7a74"], ["a", "Block", "#8a4536"], ["b", "Block (light)", "#9e5442"], ["c", "Block (dark)", "#6d3327"]],
    params: [],
    svg: (co) => brickCourse(120, 60, 60, 30, 4, co.mortar, [co.a, co.b, co.c, co.b], false),
  },
  stoneBrick: {
    label: "Stone brick", icon: "🪨", tile: [90, 45], base: "a",
    colors: [["mortar", "Mortar", "#3f423f"], ["a", "Stone", "#7f8479"], ["b", "Stone (light)", "#949a8c"], ["c", "Stone (dark)", "#666b62"]],
    params: [],
    svg: (co) => brickCourse(90, 45, 30, 15, 3, co.mortar, [co.a, co.b, co.c], true),
  },
  grass: {
    label: "Grass", icon: "🌱", tile: [60, 60], base: "base",
    // The base deliberately matches the level editor's original grass-green swatch. Selecting
    // Grass + Fill can therefore replace a connected region of the old flat grass colour without
    // changing its overall palette or collision shape.
    colors: [["base", "Ground", "#6b7b3a"], ["light", "Fresh blades", "#93a85a"], ["dark", "Shadow blades", "#405126"], ["tip", "Dry tips", "#bdc77a"]],
    params: [{ key: "lush", label: "Lush", min: 0, max: 1, step: 0.05, def: 0.65 }],
    svg: (co, _t, pa) => {
      const tw = 60, th = 60, lush = Math.max(0, Math.min(1, pa.lush ?? 0.65));
      const count = Math.round(34 + lush * 42);
      let out = svgRect(-2, -2, tw + 4, th + 4, co.base);
      for (let i = 0; i < count; i++) {
        const x = trnd(i * 2.9) * tw, y = 5 + trnd(i * 5.7) * (th - 3);
        const len = 3 + trnd(i * 7.3) * (5 + lush * 6), lean = (trnd(i * 11.1) - 0.5) * 7;
        const shadeRoll = trnd(i * 13.9), stroke = shadeRoll > 0.82 ? co.tip : shadeRoll > 0.42 ? co.light : co.dark;
        out += `<path d="M${px(x)},${px(y)} Q${px(x + lean * 0.25)},${px(y - len * 0.55)} ${px(x + lean)},${px(y - len)}" stroke="${stroke}" stroke-width="${px(0.8 + trnd(i * 17.3) * 1.1)}" stroke-linecap="round" fill="none" opacity="${px(0.55 + lush * 0.4)}"/>`;
      }
      // Small darker clumps break the even wallpaper look without introducing random shimmer.
      for (let i = 0; i < 9; i++) {
        const x = trnd(i * 19.1) * tw, y = trnd(i * 23.7) * th;
        out += `<ellipse cx="${px(x)}" cy="${px(y)}" rx="${px(1.2 + lush * 1.2)}" ry="${px(0.6 + lush * 0.5)}" fill="${co.dark}" opacity="0.35"/>`;
      }
      return out;
    },
  },
  wood: {
    label: "Wood planks", icon: "🪵", tile: [60, 40], base: "plank",
    colors: [["plank", "Plank", "#8a5a33"], ["plankAlt", "Plank (alt)", "#7a4e2c"], ["grain", "Grain", "#61391f"], ["seam", "Seam", "#3d2413"]],
    // The streaks were always drawn at a hardcoded half strength — the slider just wasn't declared,
    // so there was no way to reach it. Old saves have no `grain` value and fall through to the same
    // 0.5 they have always rendered at.
    params: [{ key: "grain", label: "Grain", min: 0, max: 1, step: 0.05, def: 0.5 }],
    svg: (co, _t, pa) => {
      const tw = 90, th = 60, ph = 20;
      let out = svgRect(-2, -2, tw + 4, th + 4, co.plank);
      for (let row = 0; row < 3; row++) {
        const y = row * ph;
        out += svgRect(0, y, tw, ph, row % 2 ? co.plankAlt : co.plank);
        // grain: a few thin, staggered streaks per plank
        const n = 3;
        for (let g = 0; g < n; g++) {
          const gy = y + 4 + g * 5 + trnd(row * 3.3 + g) * 2;
          const gx = trnd(row * 9.1 + g * 2.7) * tw * 0.5;
          const gw = tw * (0.25 + trnd(row * 4.4 + g * 1.9) * 0.5);
          out += svgRect(gx, gy, gw, 1, co.grain, ` opacity="${px(0.25 + (pa.grain ?? 0.5) * 0.6)}"`);
        }
        out += svgRect(0, y + ph - 1.5, tw, 1.5, co.seam);          // horizontal plank seam
        const bx = (row % 2 ? 45 : 15);                              // staggered butt joint
        out += svgRect(bx, y, 1.5, ph, co.seam);
      }
      return out;
    },
  },
  // WOOD PANELLING — the vertical tongue-and-groove that lines the inside of a 1960s trailer, and
  // a different thing from "Wood planks" above: those run horizontally and are floor/crate/deck
  // boards, this runs floor-to-ceiling and is a WALL. Painting one rectangle with it is the whole
  // back wall of a room, which is the point — the alternative is stacking six tall rectangles by
  // hand and nudging a dark line between each pair.
  //
  // Two details do all the work of making it read as panelling rather than as stripes:
  //
  // The seam is a V-GROOVE, not a line: a dark score with a lit edge beside it, because that is
  // what a routed groove does to light. One flat dark line reads as a drawn-on stripe every time.
  //
  // The grain has to survive TILING vertically, and a streak that simply stops inside the tile
  // leaves a visible horizontal seam where the pattern repeats. So each streak is a sine whose
  // period is exactly the tile height — its x at the bottom edge equals its x at the top, so it
  // flows straight into its own repeat and the join disappears. Knots can't do that (they're
  // local), so they stay small and well inside the tile, and the slider goes to zero for the
  // uniform factory veneer a trailer usually has.
  woodPanel: {
    label: "Wood panelling", icon: "🚪", tile: [72, 96], base: "board",
    colors: [["board", "Board", "#8b5a2b"], ["boardAlt", "Board (alt)", "#7a4d24"], ["groove", "Groove", "#3f2612"], ["lit", "Groove edge", "#b08050"], ["grain", "Grain", "#5c3617"], ["knot", "Knot", "#4a2a11"]],
    params: [
      { key: "boards", label: "Board width", min: 2, max: 6, step: 1, def: 4 },
      { key: "grain", label: "Grain", min: 0, max: 1, step: 0.05, def: 0.55 },
      { key: "knots", label: "Knots", min: 0, max: 1, step: 0.05, def: 0.25 },
    ],
    svg: (co, _t, pa) => {
      const tw = 72, th = 96;
      const n = Math.max(2, Math.min(6, Math.round(pa.boards ?? 4)));  // boards across the tile — fewer = wider boards
      const bw = tw / n;
      const grain = Math.max(0, Math.min(1, pa.grain ?? 0.55));
      const knots = Math.max(0, Math.min(1, pa.knots ?? 0.25));
      let out = svgRect(-2, -2, tw + 4, th + 4, co.board);
      for (let b = 0; b < n; b++) {
        const x = b * bw;
        // Veneer is cut from different parts of the log, so neighbouring boards are never the same
        // shade. Deterministic per board index, so it never reshuffles on a re-render.
        out += svgRect(x, -2, bw, th + 4, trnd(b * 5.3) > 0.5 ? co.boardAlt : co.board);
        for (let g = 0; g < 4; g++) {
          const seed = b * 17.9 + g * 3.7;
          const x0 = x + (0.14 + trnd(seed) * 0.72) * bw;
          const amp = (0.5 + trnd(seed + 1.3) * 1.6) * (bw / 18);     // wander scales with board width
          const phase = trnd(seed + 2.9) * Math.PI * 2;
          let d = "";
          // 8 samples over exactly one sine period = one tile height, so the streak meets itself
          // across the repeat instead of stopping dead at the seam.
          for (let i = 0; i <= 8; i++) {
            const y = (i / 8) * th;
            d += (i === 0 ? "M" : "L") + px(x0 + Math.sin(phase + (y / th) * Math.PI * 2) * amp) + "," + px(y);
          }
          out += `<path d="${d}" stroke="${co.grain}" stroke-width="${px(0.5 + trnd(seed + 4.1) * 0.9)}" fill="none" opacity="${px(grain * 0.55)}"/>`;
        }
        if (knots > 0 && trnd(b * 23.1) < knots) {
          // Inset from every edge so a knot is never clipped by the tile boundary — a half knot
          // repeating along a seam is instantly readable as tiling.
          const kx = x + bw / 2, ky = 14 + trnd(b * 31.7) * (th - 28);
          const kr = 2 + knots * 2.4;
          out += `<ellipse cx="${px(kx)}" cy="${px(ky)}" rx="${px(kr)}" ry="${px(kr * 1.5)}" fill="${co.knot}" opacity="0.75"/>`;
          out += `<ellipse cx="${px(kx)}" cy="${px(ky)}" rx="${px(kr * 0.45)}" ry="${px(kr * 0.7)}" fill="${co.grain}" opacity="0.8"/>`;
        }
        // The groove itself: score on the board's left edge, lit lip just inside it.
        out += svgRect(x - 0.7, -2, 1.4, th + 4, co.groove);
        out += svgRect(x + 0.7, -2, 0.8, th + 4, co.lit, ' opacity="0.5"');
      }
      return out;
    },
  },
  // CHECKER TILE — the vinyl floor under all that panelling. Straight checkerboard rather than
  // diamond, because that is what got laid in kitchens and diners, and because a straight grid
  // lines up with a level's cell grid instead of fighting it.
  //
  // The square count per tile must stay EVEN or the checkerboard breaks at the repeat: with an odd
  // count the last column and the first column of the next tile are the same colour, giving a
  // double-wide stripe every few tiles. So the slider picks a half-count and the pattern doubles
  // it — there is no setting that can produce a broken board.
  //
  // Fleck is the other half of the period look: real 1960s lino was speckled to hide wear, and a
  // flat two-tone checker reads as a chessboard without it.
  checkerTile: {
    label: "Checker tile", icon: "🏁", tile: [48, 48], base: "a",
    colors: [["a", "Tile", "#f5f5dc"], ["b", "Tile (alt)", "#33302e"], ["grout", "Grout", "#8d8878"], ["fleck", "Fleck", "#9c9686"]],
    params: [
      { key: "size", label: "Tile size", min: 1, max: 3, step: 1, def: 1 },
      { key: "speckle", label: "Fleck", min: 0, max: 1, step: 0.05, def: 0.3 },
    ],
    svg: (co, _t, pa) => {
      const tw = 48, th = 48;
      const n = 2 * Math.max(1, Math.min(3, Math.round(pa.size ?? 1)));  // always even — see above
      const s = tw / n, gap = 0.9;
      const speckle = Math.max(0, Math.min(1, pa.speckle ?? 0.3));
      let out = svgRect(-2, -2, tw + 4, th + 4, co.grout);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        out += svgRect(c * s + gap / 2, r * s + gap / 2, s - gap, s - gap, (r + c) % 2 ? co.b : co.a);
      }
      const dots = Math.round(speckle * 90);
      for (let i = 0; i < dots; i++) {
        // Kept a pixel inside the tile: a fleck straddling the edge would be sliced in half, since
        // the neighbouring copy starts its own field rather than continuing this one.
        const x = 1 + trnd(i * 3.1) * (tw - 2), y = 1 + trnd(i * 7.7) * (th - 2);
        out += `<circle cx="${px(x)}" cy="${px(y)}" r="${px(0.4 + trnd(i * 11.3) * 0.5)}" fill="${co.fleck}" opacity="${px(0.3 + speckle * 0.45)}"/>`;
      }
      return out;
    },
  },
  rock: {
    label: "Rock / mine", icon: "⛏️", tile: [60, 60], base: "base",
    colors: [["base", "Rock", "#5b5750"], ["light", "Highlight", "#726d64"], ["dark", "Shadow", "#403c37"], ["speck", "Speckle", "#8a8378"]],
    params: [],
    svg: (co) => {
      const tw = 60, th = 60;
      let out = svgRect(-2, -2, tw + 4, th + 4, co.base);
      // Angular chunks: deterministic quads, drawn twice (offset by a tile) so they wrap seamlessly.
      for (let i = 0; i < 7; i++) {
        const cx = trnd(i * 2.1) * tw, cy = trnd(i * 3.7) * th;
        const s = 8 + trnd(i * 5.5) * 14;
        const fill = trnd(i * 7.9) > 0.5 ? co.light : co.dark;
        const pts = [];
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2 + trnd(i * 11 + k) * 0.7;
          const rad = s * (0.6 + trnd(i * 13 + k) * 0.6);
          pts.push(px(cx + Math.cos(ang) * rad) + "," + px(cy + Math.sin(ang) * rad));
        }
        out += `<polygon points="${pts.join(" ")}" fill="${fill}" opacity="0.55"/>`;
      }
      for (let i = 0; i < 22; i++) out += svgRect(trnd(i * 17.3) * tw, trnd(i * 19.7) * th, 1.5, 1.5, co.speck, ' opacity="0.5"');
      return out;
    },
  },
  gravel: {
    label: "Gravel", icon: "⛰️", tile: [60, 60], base: "base",
    colors: [["base", "Dirt", "#544d45"], ["a", "Stone", "#8d8578"], ["b", "Stone (light)", "#a9a192"], ["c", "Stone (dark)", "#6a6358"]],
    // Coarse 0 = fine grit, a dense bed of small chips. 1 = chunky rubble, fewer and much bigger.
    // Every stone's position and outline is derived from its own index, so dragging the slider
    // grows the SAME stones rather than reshuffling the whole bed on each keystroke — the same
    // rule metal's Rust follows.
    params: [{ key: "coarse", label: "Coarse", min: 0, max: 1, step: 0.05, def: 0.5 }],
    svg: (co, _t, pa) => {
      const tw = 60, th = 60;
      const coarse = Math.max(0, Math.min(1, pa.coarse ?? 0.5));
      const count = Math.round(95 - coarse * 58);   // fine = many little chips; coarse = fewer, larger
      const rBase = 1.5 + coarse * 4.3;
      const shades = [co.a, co.b, co.c, co.a, co.b];
      let out = svgRect(-2, -2, tw + 4, th + 4, co.base);
      for (let i = 0; i < count; i++) {
        const cx = trnd(i * 2.7) * tw, cy = trnd(i * 5.3) * th;
        const rad = rBase * (0.55 + trnd(i * 7.1) * 0.9);
        const fill = shades[Math.floor(trnd(i * 9.4) * shades.length) % shades.length];
        // Angular chip rather than a dot — gravel is broken stone, so 5-6 uneven corners.
        const n = 5 + Math.floor(trnd(i * 11.9) * 2);
        const pts = [];
        for (let k = 0; k < n; k++) {
          const ang = (k / n) * Math.PI * 2 + trnd(i * 13.3 + k) * 0.55;
          const rr = rad * (0.62 + trnd(i * 17.7 + k) * 0.62);
          pts.push([Math.cos(ang) * rr, Math.sin(ang) * rr]);
        }
        // A stone straddling an edge is redrawn on the opposite side, so the bed tiles seamlessly.
        // Without this, every 60px you'd see a row of half-stones stopping dead at the tile seam —
        // very visible once a gravel floor runs across more than one cell.
        const xs = [0].concat(cx - rad < 0 ? [tw] : [], cx + rad > tw ? [-tw] : []);
        const ys = [0].concat(cy - rad < 0 ? [th] : [], cy + rad > th ? [-th] : []);
        for (const ox of xs) for (const oy of ys) {
          out += `<polygon points="${pts.map(([dx, dy]) => px(cx + ox + dx) + "," + px(cy + oy + dy)).join(" ")}" fill="${fill}"/>`;
        }
      }
      return out;
    },
  },
  metal: {
    label: "Metal", icon: "⚙️", tile: [40, 40], base: "base",
    colors: [["base", "Metal", "#8a929c"], ["light", "Sheen", "#a8b0b9"], ["dark", "Groove", "#666d76"], ["rust", "Rust", "#8a4a24"]],
    // Rust 0 = factory fresh. 1 = eaten through. Blotches are deterministic, so sliding rust up
    // deepens and spreads the SAME patches rather than reshuffling them every keystroke.
    params: [{ key: "rust", label: "Rust", min: 0, max: 1, step: 0.05, def: 0 }],
    svg: (co, _t, pa) => {
      const tw = 40, th = 40;
      let out = svgRect(-2, -2, tw + 4, th + 4, co.base);
      for (let i = 0; i < 10; i++) { // brushed vertical grain
        const x = trnd(i * 2.3) * tw;
        out += svgRect(x, -2, 0.8 + trnd(i * 4.1) * 1.4, th + 4, trnd(i * 6.7) > 0.5 ? co.light : co.dark, ' opacity="0.35"');
      }
      // Rivets sit ON the tile corners, so four quarter-circles meet into one whole rivet.
      for (const [rx, ry] of [[0, 0], [tw, 0], [0, th], [tw, th]]) {
        out += `<circle cx="${rx}" cy="${ry}" r="3" fill="${co.dark}"/><circle cx="${px(rx - 0.7)}" cy="${px(ry - 0.7)}" r="1.6" fill="${co.light}"/>`;
      }
      const rust = Math.max(0, Math.min(1, pa.rust ?? 0));
      if (rust > 0) {
        const blobs = Math.round(rust * 14);
        for (let i = 0; i < blobs; i++) {
          const cx = trnd(i * 3.9) * tw, cy = trnd(i * 8.3) * th;
          const rr = 2 + trnd(i * 12.1) * (3 + rust * 7);
          out += `<circle cx="${px(cx)}" cy="${px(cy)}" r="${px(rr)}" fill="${co.rust}" opacity="${px(0.25 + rust * 0.55)}"/>`;
          out += `<circle cx="${px(cx + rr * 0.5)}" cy="${px(cy + rr * 0.3)}" r="${px(rr * 0.55)}" fill="${co.rust}" opacity="${px(0.2 + rust * 0.5)}"/>`;
        }
      }
      return out;
    },
  },
  // FLANNEL — a tartan check, for cloth rather than terrain. It's the first texture built with
  // clothing in mind (a flannel jacket), and it's in the same registry as everything else, so it
  // paints level cells too; nothing about it is clothing-only.
  //
  // A real tartan is a woven sett: the same stripe sequence runs both ways, and where two stripes
  // cross, the colour is the two threads mixed rather than whichever was drawn last. Plain opaque
  // bands would give a flat grid with obviously-wrong junctions. Semi-transparent bands laid warp
  // then weft do the mixing for free — the crossings come out darker and saturated exactly the way
  // overlapping threads do — which is the whole reason this reads as cloth and not as graph paper.
  flannel: {
    label: "Flannel", icon: "🧣", tile: [40, 40], base: "base",
    colors: [["base", "Ground", "#7c2b26"], ["band", "Band", "#3a1512"], ["over", "Overcheck", "#e0c98a"]],
    // Sett = how wide the check is. Low is a fine shirting check, high is a big lumberjack block.
    params: [{ key: "sett", label: "Check size", min: 0.5, max: 1.6, step: 0.05, def: 1 }],
    svg: (co, _t, pa) => {
      const tw = 40, th = 40, sett = Math.max(0.5, Math.min(1.6, pa.sett ?? 1));
      let out = svgRect(-2, -2, tw + 4, th + 4, co.base);
      // Offsets are fractions of the tile, so the sett scales without ever breaking the repeat.
      const wide = 11 * sett, thin = 3 * sett;
      const bands = [[0.06, wide], [0.55, wide]];      // the two broad bands of the sett
      const overs = [[0.36, thin], [0.85, thin]];      // the thin overcheck that crosses them
      const stripe = (x, w, fill, op, vertical) => vertical
        ? svgRect(x, -2, w, th + 4, fill, ` opacity="${px(op)}"`)
        : svgRect(-2, x, tw + 4, w, fill, ` opacity="${px(op)}"`);
      // Warp (vertical) then weft (horizontal), same sequence both ways — that repetition IS the
      // sett, and laying them in this order is what mixes the crossings.
      for (const vertical of [true, false]) {
        for (const [f, w] of bands) out += stripe(f * tw, w, co.band, 0.5, vertical);
        for (const [f, w] of overs) out += stripe(f * tw, w, co.over, 0.4, vertical);
      }
      return out;
    },
  },
  // TIE DYE — the other 60s cloth, and the one that needed the most care to make TILE. A single
  // rosette centred in the tile repeats as an obvious grid of targets, which is the one thing real
  // tie-dye never looks like. So there are two: a big one in the middle, and a second centred on
  // the tile's CORNERS — those four quarters meet across the seam into one whole rosette, exactly
  // the way the metal texture's rivets do. The result is an interlocking field with no visible
  // repeat, which is what scrunching and tying a whole shirt actually produces.
  //
  // Rings run outside-in violet -> blue -> green -> yellow -> magenta, and every one of them is a
  // separate editable colour, so this is a palette rather than one fixed 1967 poster.
  tieDye: {
    label: "Tie dye", icon: "🌀", tile: [60, 60], base: "base",
    colors: [["base", "Ground", "#3b1d6e"], ["r1", "Ring 1", "#1f6fd0"], ["r2", "Ring 2", "#12a86e"], ["r3", "Ring 3", "#e8c11c"], ["r4", "Centre", "#d4306b"]],
    // Crinkle 0 = neat concentric circles (a bullseye tie). 1 = heavily scrunched, rings barely
    // circular at all. The default sits where it reads as fabric rather than as geometry.
    params: [{ key: "crinkle", label: "Crinkle", min: 0, max: 1, step: 0.05, def: 0.45 }],
    svg: (co, _t, pa) => {
      const tw = 60, th = 60, wob = Math.max(0, Math.min(1, pa.crinkle ?? 0.45)) * 0.5;
      const ring = [co.base, co.r1, co.r2, co.r3, co.r4];
      let out = svgRect(-2, -2, tw + 4, th + 4, co.base);
      // Corner rosette first (it's the background one), then the centre rosette over it. Drawn at
      // all four corners with the same seed so every quarter agrees about the shape it's part of.
      for (const [cx, cy] of [[0, 0], [tw, 0], [0, th], [tw, th]]) out += dyeRosette(cx, cy, 26, ring, wob, 5.1);
      out += dyeRosette(tw / 2, th / 2, 30, ring, wob, 41.7);
      return out;
    },
  },
};
export const TEXTURE_KEYS = Object.keys(TEXTURES);
// A texture painted onto an ART PIECE (a jacket panel, a sleeve) rather than a level cell. The
// pattern tile is measured in DESIGN-CANVAS units, not screen pixels, and converted to a
// percentage of the piece's own box — so the weave scales with the garment and looks identical in
// the editor's big canvas and at playtest size. A level cell can't do this (its tiles anchor to
// world position so a brick wall runs unbroken across many cells); a piece of clothing has the
// opposite requirement, since it moves and rotates with the limb it's drawn on.
export const pieceTextureStyle = (piece, texLib) => {
  const t = resolveTexture(texLib, piece && piece.tex);
  if (!t || !TEXTURES[t.tex]) return null;   // no texture, or one that's since been deleted -> the piece keeps its plain colour
  const [tw, th] = TEXTURES[t.tex].tile;
  const w = Math.max(1, (piece && piece.w) || 1), h = Math.max(1, (piece && piece.h) || 1);
  return {
    backgroundColor: textureBaseColor(t),
    backgroundImage: textureDataUri(t),
    backgroundSize: px(tw / w * 100) + "% " + px(th / h * 100) + "%",
  };
};
// A brand-new instance of a pattern, with every color/param at its default.
export const newTexture = (texKey) => {
  const key = TEXTURES[texKey] ? texKey : "brick"; // an unknown pattern must not produce a cell that renders as nothing
  const def = TEXTURES[key];
  const colors = {}; def.colors.forEach(([k, , d]) => { colors[k] = d; });
  const params = {}; (def.params || []).forEach((p) => { params[p.key] = p.def; });
  return { id: uid(), name: def.label, tex: key, colors, params };
};
// Everything that changes the rendered bytes, and nothing that doesn't (name and id are excluded
// on purpose — renaming a texture must not invalidate its cache).
export const textureSig = (t) => !t ? "" : t.tex + ":" + TEXTURES[t.tex].colors.map(([k]) => t.colors[k]).join(",") + ":" + (TEXTURES[t.tex].params || []).map((p) => t.params[p.key]).join(",");
export const textureBaseColor = (t) => (t && TEXTURES[t.tex] && t.colors[TEXTURES[t.tex].base]) || "#8a8580";
const texUriCache = new Map();
export const textureDataUri = (t) => {
  const def = t && TEXTURES[t.tex];
  if (!def) return null;
  const sig = textureSig(t);
  const hit = texUriCache.get(sig);
  if (hit) return hit;
  const [tw, th] = def.tile;
  const body = def.svg(t.colors, def.tile, t.params || {});
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${th}" viewBox="0 0 ${tw} ${th}" shape-rendering="crispEdges">${body}</svg>`;
  const uri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  texUriCache.set(sig, uri);
  return uri;
};
// A cell's texture id, whatever shape the cell is in (plain string, ramp object, textured object).
export const cellTexId = (cell) => (cell && typeof cell === "object" && cell.tex) ? cell.tex : null;
export const resolveTexture = (texLib, id) => (id && (texLib || []).find((t) => t.id === id)) || null;
// What flood-fill / move / "is this the same paint?" compare on: the base color, the ramp shape,
// and the texture. Two cells that differ ONLY in texture are correctly seen as different paint.
// Every fill counts, so a cell with a gravel ramp stacked over grass is not "the same paint" as a
// bare gravel ramp — otherwise flood-fill would bleed straight through a merged cell.
export const cellSig = (cell) => (cell === undefined || cell === null) ? ""
  : fgFills(cell).map((f) => fgColor(f) + "|" + fgShapeSig(f) + "|" + (cellTexId(f) || "") + "|" + (fgHiddenInPlay(f) ? "hidden" : "visible")).join("&");
// The CSS a painted cell renders with. Tiles are anchored to the cell's WORLD position, so a
// brick pattern runs continuously across every cell of a wall rather than restarting each cell.
export const cellPaintStyle = (cell, r, c, texLib) => {
  const base = fgColor(cell);
  const t = resolveTexture(texLib, cellTexId(cell));
  if (!t || !TEXTURES[t.tex]) return { background: base };
  const [tw, th] = TEXTURES[t.tex].tile;
  return {
    backgroundColor: base,
    backgroundImage: textureDataUri(t),
    backgroundSize: tw + "px " + th + "px",
    backgroundPosition: (-(c * LV_CELL) % tw) + "px " + (-(r * LV_CELL) % th) + "px",
  };
};
// The value a paint stroke writes into a cell: a plain color when no texture is selected (exactly
// as before), otherwise the texture's own base color plus its id.
export const paintValue = (color, texture, shape) => {
  const s = shape || null;
  if (!texture) return s ? { c: color, ...s } : color;
  return { c: textureBaseColor(texture), tex: texture.id, ...(s || {}) };
};
// Foreground and Background share the same visual block/ramp vocabulary. Foreground adds
// collision (and may be collision-only); Background uses the exact same authored diagonal but
// never participates in physics. Keeping the shape construction in one place prevents the
// click, drag, fill, and ghost paths from quietly disagreeing about which layers support ramps.
export const terrainPaintShape = (layer, selectedShape, upsideDown = false, hideInPlay = false, extra = null) => {
  if (layer !== "fg" && layer !== "bg") return null;
  const ramp = selectedShape === "slopeUp" || selectedShape === "slopeDown";
  const out = ramp
    ? { slope: selectedShape === "slopeUp" ? 1 : -1, ...(extra || {}), ...(upsideDown ? { upsideDown: true } : {}) }
    : {};
  if (layer === "fg" && hideInPlay) out.hideInPlay = true;
  return Object.keys(out).length ? out : null;
};
// A cell painted in Outline mode carries `ol` (its outline colour) alongside its normal fill.
// withOutline() attaches it losslessly. cellOutlineStyle() KEEPS the cell fill/texture and draws a
// thin line in `ol` only on the sides that face empty space on the same layer, so a clean border
// traces the OUTER EDGE of whatever you paint — at any brush size — without hiding the fill (a
// 1-cell-thick platform still shows its fill colour, just with an outline around it). Inset
// box-shadows are used so nothing shifts layout and it still composes with a ramp clip-path.
export const withOutline = (val, ol) => ol ? (typeof val === "object" ? { ...val, ol } : { c: val, ol }) : val;
const outlineBoxShadow = (map, r, c, ol) => {
  const s = [];
  if (!map[cellKey(r - 1, c)]) s.push("inset 0 2px 0 " + ol);
  if (!map[cellKey(r + 1, c)]) s.push("inset 0 -2px 0 " + ol);
  if (!map[cellKey(r, c - 1)]) s.push("inset 2px 0 0 " + ol);
  if (!map[cellKey(r, c + 1)]) s.push("inset -2px 0 0 " + ol);
  return s.join(", ");
};
// ---- Tile runs -------------------------------------------------------------
// One box per RUN of identical neighbouring cells, instead of one box per cell. A 160-wide forest
// level is ~8,400 tiles and the overwhelming majority are stretches of the same grass, or the same
// sky, sitting side by side — collapsing those took Blake's Forest M1 from 8,361 tile elements to
// about 800, which is 8,400 fewer boxes for the browser to style, lay out, paint and keep in
// memory on a level that scrolls.
//
// The pixels are identical, and that is not a coincidence: a texture is anchored to the WORLD, not
// to the cell (see cellPaintStyle's backgroundPosition), so one wide box continues the very same
// pattern that the separate cells were each showing a 30px slice of.
//
// A cell only joins a run if its box would still mean the same thing at any width. Three kinds
// never merge and keep a box each, exactly as before:
//   · ramps — clip-path is a PERCENTAGE of the box, so a wide box would stretch the diagonal flat
//   · outlined cells — the outline is derived per cell from its own four neighbours
//   · cells holding several stacked fills — those draw one box per fill
// Returning null from the signature is what marks those; note a null never matches another null,
// so two ramps side by side stay two ramps.
export const cellRunSig = (cell) => {
  const fills = fgFills(cell);
  if (fills.length !== 1) return null;
  const f = fills[0]; // always an object — fgFillOf promotes a bare colour string to { c }
  // Not fgClipPath(): that returns the STRING "none" for a plain block, which is perfectly
  // truthy and quietly refused to merge anything at all. fgHasDiagonalShape is the real question.
  if (f.ol || fgHasDiagonalShape(f)) return null;
  return fgColor(f) + "|" + (cellTexId(f) || "") + "|" + (fgHiddenInPlay(f) ? "h" : "");
};
// Walks a cell map into { key, r, c, span, cell, sig } runs. Runs are emitted row by row, which
// re-orders the layer's DOM relative to Object.keys order — harmless, because every cell in one
// layer shares a z-index and no two of them overlap, so DOM order decides nothing visible here.
export const cellRuns = (map, sigOf = cellRunSig) => {
  const rows = new Map();
  for (const k of Object.keys(map || {})) {
    const i = k.indexOf(",");
    const r = +k.slice(0, i), c = +k.slice(i + 1);
    if (!rows.has(r)) rows.set(r, []);
    rows.get(r).push(c);
  }
  const out = [];
  for (const [r, cols] of rows) {
    cols.sort((a, b) => a - b);
    let run = null;
    for (const c of cols) {
      const key = r + "," + c, cell = map[key], sig = sigOf(cell);
      if (run && sig !== null && sig === run.sig && c === run.c + run.span) { run.span++; continue; }
      run = { key, r, c, span: 1, cell, sig };
      out.push(run);
    }
  }
  return out;
};
const cellOutlineStyle = (map, cell, r, c, texLib) => {
  const base = cellPaintStyle(cell, r, c, texLib);
  if (!(cell && typeof cell === "object" && cell.ol)) return base;
  const bs = outlineBoxShadow(map, r, c, cell.ol);
  return bs ? { ...base, boxShadow: bs } : base;
};

// Climb cells carry a kind now: { kind: "ladder" | "bars" | "cliff" }. Old saves stored a plain
// `true` — migrateLevel() normalizes those to { kind: "ladder" } on load, but this stays
// defensive (treats any truthy non-object, or an object with no kind, as a ladder) so nothing
// downstream has to know or care whether a given level has been through migration yet.
const climbKindOf = (cell) => cell ? ((typeof cell === "object" ? cell.kind : null) || "ladder") : null;
/* ============================== HAZARDS ==================================
   A hazard is a painted cell that hurts whoever stands in it — right now just Fire, but the
   layer is a generic { kind, dps } so more (acid, spikes) drop in the same way later. It's a
   pure damage-over-time volume: it does NOT block movement, is NOT destructible, and nothing
   consumes or extinguishes it — you're expected to walk through it and take the hit, or route
   around. dps is damage-per-SECOND; the loop scales it by real elapsed time (dtMul) so it's
   frame-rate independent and, importantly, tickable in fractions rather than whole hits per
   frame (which at 60fps would be an instant kill). */
const HAZARDS = {
  fire: { kind: "fire", label: "Fire", icon: "🔥", glyph: "🔥", color: "#ff6a1f" },
};
export const HAZARD_KEYS = Object.keys(HAZARDS);
export const DEFAULT_HAZARD_DPS = { fire: 6 }; // ~6 HP/sec — a couple seconds in the flames is a real threat, a quick dash across is survivable
export const DEFAULT_HAZARD_LIFE = 6; // seconds a painted fire burns before it goes out; 0 = never goes out
export const hazardKindOf = (cell) => cell ? ((typeof cell === "object" ? cell.kind : cell) || "fire") : null;
export const hazardDps = (cell) => { const k = hazardKindOf(cell); return (cell && typeof cell === "object" && typeof cell.dps === "number") ? cell.dps : (DEFAULT_HAZARD_DPS[k] ?? 0); };
// Lifetime in SECONDS a fire cell burns during play before it goes out. 0 (or missing on an old
// save) means it never burns out — a permanent hazard, the way it behaved before lifetimes
// existed. Only ticked during Playtest; the painted level itself is never mutated.
export const hazardLife = (cell) => (cell && typeof cell === "object" && typeof cell.life === "number") ? cell.life : 0;
// Total damage-per-second a box (player or enemy) is standing in, summed over every hazard cell
// it overlaps — so straddling two fire cells hurts more than clipping one corner of one. Returns
// 0 when clear. The caller multiplies by real elapsed seconds to get the actual HP lost.
export const hazardDpsAt = (lv, x, y, pw, ph, CW, CH, alive) => {
  const haz = lv && lv.hazard; if (!haz) return 0;
  const c0 = Math.floor(x / CW), c1 = Math.floor((x + pw - 0.001) / CW), r0 = Math.floor(y / CH), r1 = Math.floor((y + ph - 0.001) / CH);
  let dps = 0;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (r < 0 || c < 0 || r >= lv.rows || c >= lv.cols) continue;
    const key = cellKey(r, c);
    const cell = haz[key];
    if (cell && (!alive || alive(key))) dps += hazardDps(cell);
  }
  return dps;
};
// Polygon shapes as fraction-of-box points (0..1), one source of truth shared by the fill
// (shapeStyle), the outline (outlineStyle), and the cutter SVG mask (cutterMaskCss) — adding a
// new polygon shape only ever means adding one entry here instead of keeping three separate
// implementations (CSS clip-path %, SVG mask pixels, outline clip-path %) in sync by hand.
// "circle", "roundrect", and "rect" aren't here — they use borderRadius/plain rect instead of
// clip-path.
// A half circle can't be a border-radius (that only rounds corners of the box) — but every
// "normal circle effect" the piece editor offers (outline ring, glow/brightness, cutter hole,
// eyedropper, resize, rotate) is already driven off SHAPE_POINTS for polygon shapes, so a
// finely-tessellated semicircle gets all of them for free with one entry here. Flat edge on
// the bottom, dome on top; rotate the piece for any other orientation.
const SEMICIRCLE_SEGS = 32;
const semicirclePoints = (n) => { const pts = []; for (let i = 0; i <= n; i++) { const t = Math.PI * (1 - i / n); pts.push([+(0.5 + 0.5 * Math.cos(t)).toFixed(4), +(1 - Math.sin(t)).toFixed(4)]); } return pts; };
export const SHAPE_POINTS = {
  tri: [[0.5, 0], [0, 1], [1, 1]],
  halfcircle: semicirclePoints(SEMICIRCLE_SEGS),
  tri2: [[0, 0], [1, 1], [0, 1]], // right triangle — rotate via p.rot for any corner
  diamond: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]],
  pentagon: [[0.5, 0], [1, 0.38], [0.82, 1], [0.18, 1], [0, 0.38]],
  hexagon: [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]],
  star: [[0.5, 0], [0.61, 0.35], [0.98, 0.35], [0.68, 0.57], [0.79, 0.91], [0.5, 0.7], [0.21, 0.91], [0.32, 0.57], [0.02, 0.35], [0.39, 0.35]],
  trapezoid: [[0.2, 0], [0.8, 0], [1, 1], [0, 1]],
};
// Which asset a composed piece came from. Looks saved before _src existed still carry _slot
// (one asset per slot, so it identifies the garment just as well) and _isWeapon; anything left
// over is body/skin art.
export const pieceSrcKey = (p) => p._src || p._slot || (p._isWeapon ? "__weapon" : "__body");
// Splits a composed, already-ordered piece list into contiguous runs sharing one source asset.
// A cutter's hole is cut with a mask on a CONTAINER (see cutterMaskCss), which unavoidably
// masks everything inside that container — so putting the mask on the whole character wrapper
// meant an eye-hole in a mask punched straight through the head, the hair and the background
// behind them (it read as a black square: you were seeing the level through Bob). Each run gets
// its own wrapper and its own mask instead, so a cutter only ever cuts the garment it was drawn
// on. Runs stay contiguous and in order, so nothing about the existing draw order changes.
export const cutterRuns = (pieces) => {
  const runs = [];
  for (const p of pieces || []) {
    const key = pieceSrcKey(p);
    const last = runs[runs.length - 1];
    if (last && last.key === key) last.pieces.push(p);
    else runs.push({ key, pieces: [p] });
  }
  for (const r of runs) { r.hasCutter = r.pieces.some((p) => p.isCutter); r.drawn = r.pieces.filter((p) => !p.isCutter); }
  return runs;
};
// A cutter is itself a layer: it may punch through ordinary pieces below it, but must never
// affect pieces drawn later (above it). Walk the run from front to back so every visible piece
// snapshots exactly the cutters that are above it. `noCut` removes that piece from every mask,
// allowing something such as a stem below a leaf cutter to remain visible through the gaps.
export const cutterLayerSegments = (pieces) => {
  const entries = [];
  let cuttersAbove = [];
  for (let i = (pieces || []).length - 1; i >= 0; i--) {
    const p = pieces[i];
    if (p.isCutter) {
      cuttersAbove = [{ piece: p, index: i }, ...cuttersAbove];
      continue;
    }
    const cutters = p.noCut ? [] : cuttersAbove.slice();
    entries.push({ piece: p, index: i, cutters, cutterKey: cutters.map((c) => c.index).join(",") });
  }
  entries.reverse();
  const segments = [];
  for (const entry of entries) {
    const last = segments[segments.length - 1];
    if (last && last.cutterKey === entry.cutterKey) last.items.push([entry.piece, entry.index]);
    else segments.push({ cutterKey: entry.cutterKey, cutters: entry.cutters.map((c) => c.piece), items: [[entry.piece, entry.index]] });
  }
  return segments;
};
// A cutter mask used to be exactly the 200×260 authoring canvas. Runtime arm rotations can move a
// perfectly valid weapon piece beyond that box (a long rifle raised to fire or turned on a ladder),
// and CSS masks clip all of their children to the mask wrapper's own bounds. That made only the
// cutter-affected half of a weapon disappear while the unmasked half kept rendering. Pad by the
// canvas diagonal: no point authored inside the canvas can rotate farther than that from it.
export const CUTTER_MASK_PAD = Math.ceil(Math.hypot(W, H));
export const cutterMaskFrameLayout = () => ({
  // Finished assets are not necessarily displayed at their 200×260 authoring size: props,
  // pedestals, enemies, and player art all scale that canvas differently. These bounds therefore
  // have to be proportional to the finished render box. Fixed pixel dimensions make every masked
  // piece jump back to editor scale and pull multi-piece assets apart.
  outer: {
    left: (-CUTTER_MASK_PAD / W * 100) + "%",
    top: (-CUTTER_MASK_PAD / H * 100) + "%",
    width: ((W + CUTTER_MASK_PAD * 2) / W * 100) + "%",
    height: ((H + CUTTER_MASK_PAD * 2) / H * 100) + "%",
  },
  inner: {
    left: (CUTTER_MASK_PAD / (W + CUTTER_MASK_PAD * 2) * 100) + "%",
    top: (CUTTER_MASK_PAD / (H + CUTTER_MASK_PAD * 2) * 100) + "%",
    width: (W / (W + CUTTER_MASK_PAD * 2) * 100) + "%",
    height: (H / (H + CUTTER_MASK_PAD * 2) * 100) + "%",
  },
  viewBox: { x: -CUTTER_MASK_PAD, y: -CUTTER_MASK_PAD, width: W + CUTTER_MASK_PAD * 2, height: H + CUTTER_MASK_PAD * 2 },
});
// Renders one finished (non-editable) piece list, wrapping only the runs that actually contain
// a cutter. `drawPiece(piece, key)` supplies the renderer, `maskCss(runPieces, cacheKey)` the
// hole. Returns a flat-ish node array for JSX to splat.
// The run is split into contiguous segments according to which later (higher) cutters affect
// each piece. Unmasked segments include both `noCut` pieces and pieces above every cutter. Since
// all segments stay in original order, the finished stack preserves its exact layer ordering.
export const renderPieceRuns = ({ pieces, cacheKey, keyPrefix, drawPiece, maskCss }) =>
  cutterRuns(pieces).map((r, gi) => {
    if (!r.hasCutter) return r.drawn.map((p, n) => drawPiece(p, keyPrefix + gi + "_" + n));
    const segs = cutterLayerSegments(r.pieces);
    const frame = cutterMaskFrameLayout();
    return segs.map((s, si) => (!s.cutters.length
      ? s.items.map(([p, n]) => drawPiece(p, keyPrefix + gi + "_" + n))
      : <div key={keyPrefix + "g" + gi + "s" + si} style={{ position: "absolute", ...frame.outer, ...maskCss(s.cutters, cacheKey + ":" + r.key + ":" + si) }}>
          <div style={{ position: "absolute", ...frame.inner }}>{s.items.map(([p, n]) => drawPiece(p, keyPrefix + gi + "_" + n))}</div>
        </div>));
  });
export const shapePolyPoints = (p) => (p && p.kind === "poly" && p.points) ? p.points : (p && SHAPE_POINTS[p.kind]) || (typeof p === "string" ? SHAPE_POINTS[p] : null);
export const shapeClipPath = (pieceOrKind) => { const pts = shapePolyPoints(typeof pieceOrKind === "string" ? { kind: pieceOrKind } : pieceOrKind); return pts ? "polygon(" + pts.map(([x, y]) => (x * 100) + "% " + (y * 100) + "%").join(",") + ")" : null; };

/* ---- Snap to edges ------------------------------------------------------- */
// The "🧲 Snap to edges" mode. While a block is being dragged, if one of its own edges comes to
// rest near an edge of ANOTHER block that is about the same length, the dragged block jumps flush
// against it — adopting that edge's exact angle and exact length. That's what lets a curved brim,
// a tapered crown, or any hand-built silhouette (a 1960s cowboy hat drawn from the side) close up
// seamlessly, instead of leaving the hairline gaps and 1° kinks that only become obvious once the
// art is blown up to in-game size and are near-impossible to dial out by hand at half-unit steps.
//
// Deliberately NOT a grid snap. Grid snapping is already what dragging does (snapPiece rounds to
// PIECE_STEP); it can't help here because the edges being joined are at arbitrary angles.
const SNAP_R3 = (n) => Math.round(n * 1000) / 1000;                  // same 3-decimal precision group scaling already produces
export const SNAP_DIST = 9;        // design units on the 200x260 canvas — how close "really close" has to be
export const SNAP_ANGLE = 15;      // degrees of "roughly the same way round" — you still aim the block yourself, the snap only takes out the last few degrees
export const SNAP_LEN_TOL = 0.35;  // an edge within 35% of the other one's length still counts as "a similar edge"
export const SNAP_MIN_EDGE = 4;    // ignore hairline edges as candidates — a semicircle is 32 tiny arc segments plus one real flat side, and only the flat side is something you'd ever line a block up against
// Blocks that aren't art: a hitbox and a muzzle marker are game-logic boxes that sit ON TOP of the
// weapon they describe, so they'd otherwise be the nearest edge to everything and hijack every snap.
export const canEdgeSnap = (p) => !!p && !p.isHitbox && !p.isMuzzle;

// Where a block actually turns about. Normally its own centre, but an arm piece rotates about its
// shoulder end (shapeStyle sets transformOrigin from armPivotOrigin) — so its corners land
// somewhere else entirely for the same rot, and snapping has to use the same pivot the renderer does.
export const pieceOriginFrac = (p) => {
  if (!p || !(p.role === "weaponArm" || (p.limb === "arm" && !p._isShoe))) return [0.5, 0.5];
  const pv = p.armPivot || "top";
  return pv === "left" ? [0, 0.5] : pv === "right" ? [1, 0.5] : pv === "bottom" ? [0.5, 1] : [0.5, 0];
};
export const pieceBox = (p) => ({ x: p.x, y: p.y, w: p.w, h: p.h, rot: p.rot || 0, o: pieceOriginFrac(p) });
// A point given as a fraction of the block's own box (0,0 = top-left corner, 1,1 = bottom-right),
// converted to canvas coordinates through the block's rotation. Linear in box.x/box.y, which is
// what lets applyEdgeSnap solve for a position by measuring the same point at the origin.
export const boxPoint = (box, fx, fy) => {
  const rad = (box.rot || 0) * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
  const ox = box.x + box.o[0] * box.w, oy = box.y + box.o[1] * box.h;
  const dx = (fx - box.o[0]) * box.w, dy = (fy - box.o[1]) * box.h;
  return { x: ox + dx * cos - dy * sin, y: oy + dx * sin + dy * cos };
};
const SNAP_BOX_FRACS = [[0, 0], [1, 0], [1, 1], [0, 1]];
// The edges you can actually see. Polygon shapes snap by their real silhouette (a triangle's
// hypotenuse, a trapezoid's slant, a hand-drawn Fill outline), which is the whole point — those
// are the angled edges that are impossible to butt together by eye. Everything else (square,
// round rect, circle, emoji, text) snaps by its box, which is the same rectangle its resize
// handle and selection outline already describe, so what snaps is what you see selected.
export const pieceSnapEdges = (p) => {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.w)) return [];
  const fracs = shapePolyPoints(p) || SNAP_BOX_FRACS;
  const box = pieceBox(p), out = [];
  for (let i = 0; i < fracs.length; i++) {
    const fa = fracs[i], fb = fracs[(i + 1) % fracs.length];
    const a = boxPoint(box, fa[0], fa[1]), b = boxPoint(box, fb[0], fb[1]);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < SNAP_MIN_EDGE) continue;
    // Which of the block's OWN axes the edge runs along decides how "make this edge that long"
    // gets stored: an edge along local x is the block's width, one along local y is its height,
    // and a diagonal edge belongs to neither, so the only way to lengthen it is to scale the
    // whole block. Keeping the other dimension untouched where possible matters — matching a
    // bar to a neighbour's edge should change its length, not silently fatten it too.
    const axis = Math.abs(fa[1] - fb[1]) < 1e-6 ? "x" : Math.abs(fa[0] - fb[0]) < 1e-6 ? "y" : null;
    out.push({ fa, fb, a, b, len, axis });
  }
  return out;
};
// Signed difference between two directions, folded into (-180, 180].
const snapAngleDiff = (a, b) => { const d = ((a - b) % 360 + 540) % 360 - 180; return d; };
// Best edge of `moving` to weld onto an edge of one of `others`, or null if nothing qualifies.
// Three separate conditions, kept separate on purpose:
//   · the two MIDPOINTS are within SNAP_DIST      — "really close"
//   · the two directions agree within SNAP_ANGLE  — you have already aimed it roughly right
//   · the two lengths are within SNAP_LEN_TOL     — "a similar edge"
// Distance and angle deliberately are NOT one combined test. Measuring the gap at the endpoints
// instead would fold them together, and badly: on a long edge a couple of degrees of tilt already
// throws its far end further than the whole snap radius, so the longer the edge, the steadier your
// hand would have to be — exactly backwards. Midpoint distance behaves the same at any length.
export const findEdgeSnap = (moving, others, opts = {}) => {
  if (!canEdgeSnap(moving)) return null;
  const dist = opts.dist ?? SNAP_DIST, lenTol = opts.lenTol ?? SNAP_LEN_TOL, maxTurn = opts.angle ?? SNAP_ANGLE;
  const mine = pieceSnapEdges(moving);
  if (!mine.length) return null;
  const mid = (e) => ({ x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 });
  const dir = (e) => Math.atan2(e.b.y - e.a.y, e.b.x - e.a.x) * 180 / Math.PI;
  let best = null;
  for (const o of others || []) {
    if (!o || o.id === moving.id || !canEdgeSnap(o)) continue;
    for (const f of pieceSnapEdges(o)) {
      const fm = mid(f), fd = dir(f);
      for (const e of mine) {
        if (Math.abs(e.len - f.len) > Math.max(1, lenTol * Math.max(e.len, f.len))) continue;
        const em = mid(e);
        const gap = Math.hypot(em.x - fm.x, em.y - fm.y);
        if (gap > dist) continue;
        // An edge is a segment, not an arrow: my edge may run the same way round as theirs or the
        // opposite way (which is in fact the usual case for two shapes meeting face to face), so
        // whichever end of theirs mine is pointing at becomes the end it gets welded to.
        const turn = snapAngleDiff(fd, dir(e));
        const to = Math.abs(turn) <= maxTurn ? { p: f.a, q: f.b } : Math.abs(Math.abs(turn) - 180) <= maxTurn ? { p: f.b, q: f.a } : null;
        if (!to) continue;
        if (!best || gap < best.gap) best = { gap, edge: e, targetId: o.id, targetEdge: f, to };
      }
    }
  }
  return best;
};
// Land the block on the snap found above: rotate it so its edge is parallel to the target's,
// stretch that edge to the same length, and translate so the two edges lie exactly on top of one
// another. Returns a new piece; passing a null snap returns the piece untouched, so callers can
// pipe through this unconditionally.
export const applyEdgeSnap = (p, snap) => {
  if (!p || !snap) return p;
  const { edge, to } = snap;
  if (!(edge.len > 0.001)) return p;
  const targetLen = Math.hypot(to.q.x - to.p.x, to.q.y - to.p.y);
  const scale = targetLen / edge.len;
  const turn = Math.atan2(to.q.y - to.p.y, to.q.x - to.p.x) - Math.atan2(edge.b.y - edge.a.y, edge.b.x - edge.a.x);
  const rot = Math.round((((p.rot || 0) + turn * 180 / Math.PI) % 360 + 360) % 360 * 10) / 10;
  const w = SNAP_R3(Math.max(MIN_PIECE_SIZE, edge.axis === "y" ? p.w : p.w * scale));
  const h = SNAP_R3(Math.max(MIN_PIECE_SIZE, edge.axis === "x" ? p.h : p.h * scale));
  // Solve for the position last, from the FINAL rotation and size, so the rounding above can't
  // leave the joint a fraction of a unit open: measure where the snapped corner sits on a box
  // pinned at the origin, then move the box by whatever puts that corner on the target point.
  const at = boxPoint({ x: 0, y: 0, w, h, rot, o: pieceOriginFrac(p) }, edge.fa[0], edge.fa[1]);
  return { ...p, w, h, rot, x: SNAP_R3(to.p.x - at.x), y: SNAP_R3(to.p.y - at.y) };
};
// Group version. A held group has to move as one rigid object — rotating and resizing it to suit
// one member's edge would tear the rest of the assembly apart — so this only ever offers a
// TRANSLATION. Both endpoint deltas are averaged so the group settles evenly along the edge
// rather than pivoting about whichever end happened to be nearer.
export const findGroupEdgeSnap = (members, others, opts = {}) => {
  let best = null;
  for (const m of members || []) { const s = findEdgeSnap(m, others, opts); if (s && (!best || s.gap < best.gap)) best = s; }
  if (!best) return null;
  return {
    gap: best.gap, targetEdge: best.targetEdge, targetId: best.targetId,
    dx: ((best.to.p.x - best.edge.a.x) + (best.to.q.x - best.edge.b.x)) / 2,
    dy: ((best.to.p.y - best.edge.a.y) + (best.to.q.y - best.edge.b.y)) / 2,
  };
};

const polySymmetricX = (pts) => pts.every(([x, y]) => pts.some(([x2, y2]) => Math.abs(x2 - (1 - x)) < 1e-4 && Math.abs(y2 - y) < 1e-4));
// Mirror a set of pieces as one rigid drawing. Position and rotation follow scaleX(-1), while
// asymmetric polygons also reverse their actual silhouette instead of merely moving their box.
export const flipPiecesHorizontally = (pieces, pivotX) => {
  const src = pieces || [];
  if (!src.length) return [];
  const cx = Number.isFinite(pivotX)
    ? pivotX
    : (Math.min(...src.map((p) => p.x)) + Math.max(...src.map((p) => p.x + p.w))) / 2;
  return src.map((p) => {
    const q = { ...p, x: Math.round(2 * cx - (p.x + p.w)), rot: (((-(p.rot || 0)) % 360) + 360) % 360 };
    const pts = shapePolyPoints(p);
    if (pts && !polySymmetricX(pts)) { q.kind = "poly"; q.points = pts.map(([x, y]) => [+(1 - x).toFixed(4), y]); }
    return q;
  });
};
// Props can animate, so "Flip whole object" must use one shared pivot for every frame. Flipping
// each frame around its own bounds would make differently-shaped frames jump sideways in play.
export const flipPropFramesHorizontally = (frames, liveAngles, currentIndex) => {
  const src = Array.isArray(frames) && frames.length ? [...frames] : [liveAngles || blankAngles()];
  const idx = Math.max(0, Math.min(src.length - 1, currentIndex || 0));
  if (liveAngles) src[idx] = liveAngles; // include edits not flushed back into frames yet
  const all = src.flatMap((frame) => ANGLES.flatMap((ang) => (frame && frame[ang]) || []));
  if (!all.length) return { frames: src, angles: src[idx], flipped: false };
  const pivotX = (Math.min(...all.map((p) => p.x)) + Math.max(...all.map((p) => p.x + p.w))) / 2;
  const flipped = src.map((frame) => {
    const out = { ...(frame || blankAngles()) };
    for (const ang of ANGLES) out[ang] = flipPiecesHorizontally(out[ang] || [], pivotX);
    return out;
  });
  return { frames: flipped, angles: flipped[idx], flipped: true, pivotX };
};
export const SHAPE_LIST = [
  ["rect", "▮", "Square"], ["roundrect", "▣", "Rounded square"], ["circle", "●", "Circle"], ["halfcircle", "◓", "Half circle"], ["tri", "▲", "Triangle"], ["tri2", "◺", "Half triangle"],
  ["diamond", "◆", "Diamond"], ["pentagon", "⬠", "Pentagon"], ["hexagon", "⬡", "Hexagon"], ["star", "★", "Star"], ["trapezoid", "⏢", "Trapezoid"],
];
export const levelShapeLabel = (shape) => ({
  rect: "square", circle: "circle", tri: "triangle", tri2: "half-triangle",
  topOutline: "top outline", vineWeb: "vine web", vine: "vine", ladder: "ladder", fence: "fence",
}[shape || "rect"] || shape || "shape");
// A placed level Object is either an emoji (o.char, tinted via CSS text-as-background) or a
// plain colored shape (o.kind==="shape" — no emoji needed, plus open scenery silhouettes such as
// ladders and fences). Shared by every render site that draws a cell's object stack
// (the normal edit-mode layer, the ghost preview, and the Playtest "in front of player" pass)
// so all three stay in sync automatically instead of needing the same branch copy-pasted three
// separate times and drifting out of sync with each other.
const objInner = (o, sz) => {
  if (o.kind === "shape") {
    const t = o.tint || "#7aa2d6";
    if (o.shape === "topOutline") return <div style={{ width: "100%", height: "100%", position: "relative" }}><div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "25%", background: t }} /></div>;
    if (o.shape === "vineWeb") return (
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", display: "block" }} preserveAspectRatio="none">
        <path d="M0,20 Q50,0 100,20 M0,50 Q50,30 100,50 M0,80 Q50,60 100,80 M20,0 Q0,50 20,100 M50,0 Q30,50 50,100 M80,0 Q100,50 80,100" stroke={t} strokeWidth="4" fill="none" />
      </svg>
    );
    // A single HANGING VINE — a trailing stem with leaves, drawn to tile head-to-tail so stacking
    // them straight down makes one continuous vine of any length. Distinct from vineWeb above,
    // which is a lattice/net that covers an area; this is the thing you hang down a cliff face or
    // run alongside a ladder. The stem meets both the top and bottom edge at the same x (50) so
    // consecutive tiles join without a visible step.
    if (o.shape === "vine") return (
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", display: "block" }} preserveAspectRatio="none">
        <path d="M50,0 C34,18 66,32 50,50 C34,68 66,82 50,100" stroke={t} strokeWidth="7" fill="none" strokeLinecap="round" />
        {[[40, 14, -1], [62, 36, 1], [38, 60, -1], [62, 84, 1]].map(([lx, ly, dir], i) => (
          <ellipse key={i} cx={lx + dir * 12} cy={ly} rx="15" ry="8" fill={t}
            transform={"rotate(" + (dir * 22) + " " + (lx + dir * 12) + " " + ly + ")"} />
        ))}
      </svg>
    );
    if (o.shape === "ladder") return (
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", display: "block" }} preserveAspectRatio="none">
        <rect x="12" y="0" width="10" height="100" fill={t} />
        <rect x="78" y="0" width="10" height="100" fill={t} />
        <rect x="22" y="12" width="56" height="9" fill={t} />
        <rect x="22" y="45.5" width="56" height="9" fill={t} />
        <rect x="22" y="79" width="56" height="9" fill={t} />
      </svg>
    );
    if (o.shape === "fence") return (
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", display: "block" }} preserveAspectRatio="none">
        {/* Two rails and five pointed pickets leave real open gaps, so scenery remains visible
            through the fence without making its painted material itself look faded. */}
        <rect x="0" y="40" width="100" height="9" rx="1.5" fill={t} />
        <rect x="0" y="72" width="100" height="9" rx="1.5" fill={t} />
        {[4, 25, 46, 67, 88].map((x) => <path key={x} d={`M${x},100 V20 L${x + 6},8 L${x + 12},20 V100 Z`} fill={t} />)}
      </svg>
    );
    const s = { width: "100%", height: "100%", boxSizing: "border-box", background: t };
    if (o.shape === "circle") s.borderRadius = "50%";
    else if (o.shape === "tri") s.clipPath = "polygon(50% 0,0% 100%,100% 100%)";
    else if (o.shape === "tri2") s.clipPath = "polygon(0% 0%, 100% 100%, 0% 100%)";
    return <div style={s} />;
  }
  const span = { fontSize: sz * 0.85 + "px", lineHeight: 1 };
  if (o.tint) Object.assign(span, { backgroundColor: o.tint, backgroundImage: "none", color: "transparent", WebkitTextFillColor: "transparent", WebkitBackgroundClip: "text", backgroundClip: "text" });
  return <span style={span}>{o.char}</span>;
};
// Is any part of the player's bounding box overlapping a climbable cell?
// (Rectangle overlap, not just the dead-center point — that was the bug: you had to be
// pixel-perfectly centered on a single 1-cell column to ever trigger climbing.)
// Returns the KIND touched — "ladder" wins if a box somehow overlaps more than one kind at
// once, so behavior stays deterministic instead of depending on Object.keys() ordering.
export const climbKindAt = (lv, x, y, pw, ph, CW, CH) => {
  const c0 = Math.floor(x / CW), c1 = Math.floor((x + pw - 0.001) / CW), r0 = Math.floor(y / CH), r1 = Math.floor((y + ph - 0.001) / CH);
  let found = null;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (r < 0 || c < 0 || r >= lv.rows || c >= lv.cols) continue;
    const kind = climbKindOf(lv.climb && lv.climb[cellKey(r, c)]);
    if (!kind) continue;
    if (kind === "ladder") return "ladder";
    if (!found) found = kind;
  }
  return found;
};
// The y of the TOP edge of the highest climb cell of `kind` the player's box overlaps, or null.
export const climbGripTop = (lv, x, y, pw, ph, CW, CH, kind) => {
  const c0 = Math.floor(x / CW), c1 = Math.floor((x + pw - 0.001) / CW), r0 = Math.floor(y / CH), r1 = Math.floor((y + ph - 0.001) / CH);
  let top = null;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (r < 0 || c < 0 || r >= lv.rows || c >= lv.cols) continue;
    if (climbKindOf(lv.climb && lv.climb[cellKey(r, c)]) !== kind) continue;
    const t = r * CH;
    if (top === null || t < top) top = t;
  }
  return top;
};
// Monkey bars and a cliff ledge are a HANG, not a climb: the arms go straight up, so the grip
// point is the TOP of the player's box. Overlap alone used to be enough to grab, which meant you
// could jump off (Space), re-grab at the apex with your whole body already above the bar, jump
// again, and walk yourself straight over the top of it — the hands ended up higher than the thing
// they were supposedly hanging from. A hang can only be established while the grip point is at or
// below the top of the bar/ledge being gripped. Ladders are a real climb (you go up and off the
// top on purpose) and are never gated.
export const canGripClimb = (lv, x, y, pw, ph, CW, CH, kind) => {
  if (kind === "ladder") return true;
  const top = climbGripTop(lv, x, y, pw, ph, CW, CH, kind);
  return top === null || y >= top - 0.001;
};
// Which climb kind actually grips this frame — the version the playtest loop uses. Two changes
// over the raw box-overlap climbKindAt above (which stays as-is for generic overlap questions):
//
// 1. A LADDER cell only counts while the player's horizontal CENTER is on the ladder's own
//    column, give or take half a cell. Whole-box overlap let a wide-bodied character keep
//    hanging while visually a full body-width off the ladder's side ("can go left too far
//    without being on the ladder"). Drifting past that window now just lets go and you fall,
//    like stepping off the side of a real ladder. Side-to-side movement ON the ladder is
//    completely untouched — within the window you shimmy exactly as before. This is NOT a
//    removal of side-to-side movement; it only sets where the ladder's side actually ends.
//
// 2. Ladder no longer has ABSOLUTE priority over bars/cliff. The old rule ("ladder always wins
//    while any ladder cell is overlapped") made a monkey-bar/cliff ridge near the top of a
//    ladder physically ungrabbable: the box still overlapped the ladder, so the hang never got
//    a turn — and by the ladder's pinned top the grip point had already risen past the bar,
//    which canGripClimb correctly refuses (no grabbing a bar from above it). Now, while
//    ascending (wantsUp) — or while already hanging on that kind (curKind, so an established
//    hang can't flicker back to ladder the moment ↑ is released) — a bars/cliff cell whose grip
//    is currently VALID wins over the ladder: climbing up a ladder past a grabbable ridge hands
//    you off onto it.
export const resolveClimbKind = (lv, x, y, pw, ph, CW, CH, wantsUp, curKind) => {
  const cx = x + pw / 2;
  const c0 = Math.floor(x / CW), c1 = Math.floor((x + pw - 0.001) / CW), r0 = Math.floor(y / CH), r1 = Math.floor((y + ph - 0.001) / CH);
  let ladder = false, other = null;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (r < 0 || c < 0 || r >= lv.rows || c >= lv.cols) continue;
    const kind = climbKindOf(lv.climb && lv.climb[cellKey(r, c)]);
    if (!kind) continue;
    if (kind === "ladder") { if (cx >= c * CW - CW / 2 && cx <= (c + 1) * CW + CW / 2) ladder = true; }
    else if (!other) other = kind;
  }
  if (ladder && other && (wantsUp || curKind === other)) {
    const top = climbGripTop(lv, x, y, pw, ph, CW, CH, other);
    if (top !== null && y >= top - 0.001) return other; // valid overhead grip while heading up: the hang wins
  }
  return ladder ? "ladder" : other;
};
// Simulated flight path for the throw-aim preview (hold G): the exact same per-frame integration
// the thrown grenade itself uses (gravity accumulates into vy, position steps by velocity), so
// the dots you see are precisely where a release right now would send it. Stops at the first
// solid surface (isSolid callback) or after maxSteps; `stride` thins the sampled points into a
// dotted arc instead of a solid line.
export const throwTrajectoryPoints = (x0, y0, vx0, vy0, g, isSolid, maxSteps = 150, stride = 5) => {
  const pts = [];
  let x = x0, y = y0, vx = vx0, vy = vy0;
  for (let i = 0; i < maxSteps; i++) {
    vy = Math.min(40, vy + g);
    x += vx; y += vy;
    if (isSolid && isSolid(x, y)) { pts.push({ x, y }); break; }
    if (i % stride === 0) pts.push({ x, y });
  }
  return pts;
};
const isOnClimb = (lv, x, y, pw, ph, CW, CH) => !!climbKindAt(lv, x, y, pw, ph, CW, CH);
// Is the player (centered at cx,cy) overlapping a gameplay marker (door/pedestal)?
const markerAt = (lv, cx, cy, CW, CH) => { const c = Math.floor(cx / CW), r = Math.floor(cy / CH); if (c < 0 || c >= lv.cols || r < 0 || r >= lv.rows) return null; const m = lv.markers && lv.markers[cellKey(r, c)]; return m || null; };
// A pedestal sits at foot level, so a marker check on the player's CENTER point (~3-4 cells up)
// silently missed it and the "Press E" pickup never armed. This finds a pedestal anywhere the
// player's whole BODY box overlaps, which is what "standing on the pedestal" actually means.
const pedestalOverlapping = (lv, x, y, w, h, CW, CH) => {
  if (!lv.markers) return null;
  const c0 = Math.floor(x / CW), c1 = Math.floor((x + w - 0.001) / CW), r0 = Math.floor(y / CH), r1 = Math.floor((y + h - 0.001) / CH);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const m = lv.markers[cellKey(r, c)];
    if (m && m.kind === "pedestal") return { key: cellKey(r, c), marker: m };
  }
  return null;
};
// Same body-overlap test for a DOOR — so "standing at the door" arms the Press-E prompt even
// though the door cell is at foot level and the player's centre point sits well above it.
const doorOverlapping = (lv, x, y, w, h, CW, CH) => {
  if (!lv.markers) return null;
  const c0 = Math.floor(x / CW), c1 = Math.floor((x + w - 0.001) / CW), r0 = Math.floor(y / CH), r1 = Math.floor((y + h - 0.001) / CH);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const m = lv.markers[cellKey(r, c)];
    if (m && m.kind === "door") return { key: cellKey(r, c), marker: m };
  }
  return null;
};
// A door's tag (which room pool it opens); blank = an exit back to where you came from. Reads
// the new `tag` field, falling back to older doors that stored it as `accepts`.
export const doorTagOf = (m) => ((m && (m.tag !== undefined ? m.tag : m.accepts)) || "").trim();
// "Accepts" is free text, comma/space separated. Blank = matches this level's own floor.
const parseCats = (text, own) => { const t = (text || "").trim(); const list = t ? t.split(/[,\n]/).map((s) => s.trim().toLowerCase()).filter(Boolean) : [(own || "").trim().toLowerCase()]; return list; };
// A connector matches a neighbour if it's open, the neighbour's floor is in
// what it accepts, AND the neighbour's connector likewise accepts this floor
// (mutual — like a lock and key, not just one-way).
const connMatch = (connA, levelA, connB, levelB) => {
  if (!connA || !connB || !connA.open || !connB.open) return false;
  const aAccepts = parseCats(connA.accepts, levelA.floor);
  const bAccepts = parseCats(connB.accepts, levelB.floor);
  return aAccepts.includes((levelB.floor || "").trim().toLowerCase()) && bAccepts.includes((levelA.floor || "").trim().toLowerCase());
};
// A single point-pair "agrees" if both ends are closed (wall meets wall) or both are open + mutually matching.
const pairAgrees = (connA, levelA, connB, levelB) => !!(connA && connB && ((!connA.open && !connB.open) || connMatch(connA, levelA, connB, levelB)));
// Two levels attach on `side` only if BOTH point-pairs on that seam agree
// (point 1 with point 1, point 2 with point 2 — never crossed), AND at least
// one of the two pairs is an actual open+matching passage (two blank walls
// touching isn't a connection).
const canAttach = (left, right, side) => { // does `right` attach to `side` of `left`?
  if (!left || !right) return false;
  const pairs = side === "E" ? [["E1", "W1"], ["E2", "W2"]] : side === "W" ? [["W1", "E1"], ["W2", "E2"]]
    : side === "S" ? [["S1", "N1"], ["S2", "N2"]] : [["N1", "S1"], ["N2", "S2"]];
  const allAgree = pairs.every(([la, rb]) => pairAgrees(left.conns[la], left, right.conns[rb], right));
  const hasPassage = pairs.some(([la, rb]) => connMatch(left.conns[la], left, right.conns[rb], right));
  return allAgree && hasPassage;
};
// Beta generator: build a horizontal chain by matching each tile's East to the next tile's West.
function generateChain(levels, maxLen = 8) {
  const usable = levels.filter((l) => l && l.conns);
  const anyOpen = usable.filter((l) => l.conns.E1.open || l.conns.E2.open || l.conns.W1.open || l.conns.W2.open);
  if (!anyOpen.length) return [];
  const starters = usable.filter((l) => l.conns.E1.open || l.conns.E2.open);
  const pool = starters.length ? starters : anyOpen;
  const chain = [pool[Math.floor(Math.random() * pool.length)]];
  for (let i = 0; i < maxLen - 1; i++) {
    const last = chain[chain.length - 1];
    const cands = usable.filter((l) => canAttach(last, l, "E"));
    if (!cands.length) break;
    chain.push(cands[Math.floor(Math.random() * cands.length)]);
  }
  return chain;
}




/* ---- Enemy senses & hill-collision helpers (module-level, exported for tests) ------------- */
// One "player body length" — the unit enemy senses are specified in: the standing player is
// PLAYER_H_CELLS tall, so a body length is that height in pixels (210px at the 30px cell).
export const PLAYER_BODY_LEN_PX = LV_CELL * PLAYER_H_CELLS;
export const ENEMY_SIGHT_AHEAD_LENGTHS = 6;  // sees 6 body lengths in the direction it FACES
export const ENEMY_SIGHT_BEHIND_LENGTHS = 1; // ...but only 1 body length behind its back
export const enemyDetects = (distToPlayer, face) => {
  const facing = distToPlayer === 0 || Math.sign(distToPlayer) === (face || 1);
  return Math.abs(distToPlayer) <= PLAYER_BODY_LEN_PX * (facing ? ENEMY_SIGHT_AHEAD_LENGTHS : ENEMY_SIGHT_BEHIND_LENGTHS);
};
// The direction an enemy should be FACING this frame. An enemy that can sense the player — out
// to its full forward range in ANY direction, so it reacts to someone who walked up on its blind
// side — turns to face them. This is deliberately separate from (and evaluated before) the
// facing-gated enemyDetects: without it, a Guard (which never moves, and so never changes facing
// through movement) spawned looking away from where the player is could NEVER turn toward them,
// so it never detected them, never raised its weapon, and never attacked — the "guard only reacts
// when I walk right up to it, and never shoots" bug. Returns the current face unchanged when the
// player is out of sensing range entirely, so an unaware enemy keeps its placed facing.
export const enemyFaceToward = (distToPlayer, face) => {
  if (distToPlayer === 0) return face || 1;
  return (Math.abs(distToPlayer) <= PLAYER_BODY_LEN_PX * ENEMY_SIGHT_AHEAD_LENGTHS) ? Math.sign(distToPlayer) : (face || 1);
};
// Is this enemy committed to an attack right now? Winding up to strike (reactT), mid-swing
// (swingT), or visibly tracking a target down a raised weapon (aimHold) all count. Used to decide
// which way it looks — see enemyFaceThisFrame.
export const enemyAttackCommitted = (ep) => !!ep && ((ep.reactT > 0) || (ep.swingT > 0) || (ep.aimHold > 0));
// Which way an enemy looks this frame. Normally its feet decide: walk left, look left. But an
// enemy lining up a shot has already been turned toward its target (enemyFaceToward), and that
// must not be undone by wherever it happens to be walking.
//
// This is the "fleeing enemies shoot at me without facing me" bug. An `avoid` enemy retreats every
// frame, and the retreat used to rewrite its facing every frame — so it fired over its own
// shoulder, aim pose, muzzle and sprite all pointing away, while the shot itself flew at the
// player (a projectile is aimed by angle at the target, not by the shooter's facing, which is
// exactly why nothing else caught this). It now turns to face what it is shooting at and holds
// that through the whole wind-up; it just keeps backpedalling while it does, so fleeing still
// flees. Reloading drops aimHold, so it turns its back and runs properly between volleys.
export const enemyFaceThisFrame = (face, dxMove, committed) => (dxMove && !committed) ? Math.sign(dxMove) : (face || 1);
// Storage order controls stacking only within the same player-relative layer. Front/back is a
// stronger rule: a front object must render over every back object regardless of placement order.
// Keep the original stack index so editor actions still update/delete the correct saved object.
// Which visual layer a placed object draws on, read from the flags it already carries — so an
// object sits level with the BLOCKS that behave the way it does, instead of every object sharing
// one z regardless of what it is:
//   solid    -> Foreground. It blocks the player exactly like a Foreground block, so it belongs
//               among them rather than floating above them.
//   in front -> Front. It covers the player like a Front tile, and fades the same way.
//   neither  -> Background. Scenery the player walks in front of, which is what Background is.
// The z values these map to are in the CSS beside the matching .lcell rules, so the two ladders
// can be read together and can't drift apart.
export const objectLayerClass = (o) => (o && o.inFront) ? "lay-front" : (o && o.solid) ? "lay-fg" : "lay-bg";
export const splitObjectStackByPlayerLayer = (stack) => {
  const behind = [], front = [];
  for (const [stackIndex, o] of (stack || []).entries()) {
    (o && o.inFront ? front : behind).push({ o, stackIndex });
  }
  return { behind, front };
};
// Raw Enemy assets default to left-facing art unless their creator checkbox says otherwise.
// Dressed Character assets use the same right-facing Side art as the player, so treating their
// absent `faceRight` flag as false mirrored every armed character enemy away from its shot.
export const enemyArtFacesRight = (ea) => !!(ea && (ea.type === "character" || ea.faceRight));
export const enemyNeedsFlip = (ea, face) => ((face || 1) < 0) === enemyArtFacesRight(ea);
// The PLAYER sprite has the opposite default: a body/skin/dressed look is drawn facing RIGHT, the
// way Bob's Side pose is, so it mirrors when walking left. A raw Enemy asset is drawn facing LEFT
// unless its creator ticked faceRight — so playing AS an enemy in the level tester used the wrong
// convention and the sprite faced away from the direction it was moving. Everything that is NOT a
// raw enemy keeps the right-facing rule exactly as before, so Bob is untouched.
export const playerArtFacesRight = (a) => !a || a.type !== "enemy" || !!a.faceRight;
// Single source of truth for "is the player sprite mirrored this frame". The wrapper's scaleX(-1)
// and every piece-local x derived from it (muzzle spawn, melee hitbox) must read this same answer,
// or shots leave from the wrong side of the body.
export const playerSpriteMirrored = (a, face) => ((face || 1) < 0) === playerArtFacesRight(a);
// Edge-to-edge horizontal gap between two hitboxes (0 while they overlap). Every enemy range —
// attack range AND the seek stand-off — is measured with THIS now. Center-to-center distance
// silently spent (pw + epw) / 2 ≈ 140px of any range budget just crossing the two bodies
// themselves, so the default 60px melee range meant "stand inside the enemy": the "0 range" bug.
export const boxGap = (aCx, aW, bCx, bW) => Math.max(0, Math.abs(aCx - bCx) - (aW + bW) / 2);
// Walking UP a ramp is deliberately slow — half speed. Walking down is normal (plus the slide).
export const SLOPE_UP_MUL = 0.5;
// Downhill auto-slide speed (px per 60fps-frame). Gentle on purpose — a ramp is a gentle pull,
// not a launch. Was 4.0, which read as a fling; 1.6 slides you down smoothly without yanking.
export const SLOPE_SLIDE_SPEED = 1.6;
// A ramp rises one cell over `run` horizontal cells. Without the Slide effect, ordinary shoes grip
// gentle hills and only lose their footing on the steepest 1:1 and 1:2 ramps. Slide deliberately
// defeats that grip, so skates/ice still coast down every incline.
export const STEEP_SLOPE_MAX_RUN = 2;
export const slopeShouldAutoSlide = (run, hasSlideEffect) =>
  !!hasSlideEffect || (Number.isFinite(+run) && +run > 0 && +run <= STEEP_SLOPE_MAX_RUN);
// Leg animation describes deliberate steps, not momentum. A passive hill slide (with or without
// the Slide effect) and a flat-ground coast both keep the legs settled instead of air-running.
export const groundLegsShouldWalk = (dx, onGround, climbing, sliding, moveHeld) =>
  !!dx && !!onGround && !climbing && !sliding && !!moveHeld;
// Is this solid cell part of a RAMP FORMATION — the hill's flesh under/beside a ramp, which the
// slope-surface pass owns, rather than a wall the player should clamp against?
//
// The OLD version only looked HILL_NEAR=3 cells away in every direction. That's fine for a short
// ramp, but a LONG ramp has solid backing filled MANY cells deep below the diagonal — so backing
// cells more than 3 rows under the ramp read as "walls", the wide hitbox's leading edge clamped
// on them, and slow characters stuttered / got flung back partway up (exactly Blake's long ramp).
//
// The correct test: a backing cell is hill if there's a ramp cell ANYWHERE in its own column at
// or above it (the entire vertical run beneath a ramp is that ramp's body), OR within a small
// horizontal tolerance to catch the leading-edge lip beside the diagonal. Column search is
// unbounded upward (a hill can be any height); horizontal stays tight so a real wall a couple
// cells over from a ramp is still a wall.
export const HILL_NEAR = 2; // horizontal tolerance only (leading-edge lip beside the diagonal)
export const isHillFormationCell = (lv, r, c) => {
  for (let cc = Math.max(0, c - HILL_NEAR); cc <= Math.min(lv.cols - 1, c + HILL_NEAR); cc++)
    for (let rr = r; rr >= 0; rr--) {
      const cell = lv.fg[cellKey(rr, cc)];
      if (fgSlopeFills(cell).length) return true;
      // Stop climbing this column once we pass out the TOP of a contiguous solid+ramp stack:
      // an empty cell far above means we've left the hill and are now scanning open air, so a
      // slope found even higher up isn't this cell's hill. Only break on the SAME column though
      // (cc===c); neighbouring columns we always scan fully for the lip case.
      if (cc === c && rr < r && !cell) break;
    }
  return false;
};
// Split blocking cells into real { walls } vs { hill } cells. A hill cell must ALSO sit near
// foot level (its top no more than ~2.5 cells above the feet — the deepest a 45° ramp can put
// the wide hitbox's leading edge into the hill face) so a genuine wall standing next to a ramp
// still blocks you at chest/head height instead of becoming a ghost.
export const splitHillHits = (lv, hits, footY, CH) => {
  const out = { walls: [], hill: [] };
  for (const h of hits) ((h.r * CH >= footY - CH * 2.5) && isHillFormationCell(lv, h.r, h.c) ? out.hill : out.walls).push(h);
  return out;
};
// Step-assist smoothing: when the physics snaps the player up a one-cell stair, the RENDER
// instead eases up over ~7 frames (p.stepEase holds the remaining visual offset, decaying at
// STEP_EASE_SPEED px per 60fps-frame). Physics stays exact; only the drawn position eases — so
// collision can never desync, and the old same-frame teleport is gone.
export const STEP_EASE_SPEED = 4.5;
export const easeStep = (v, dtMul) => Math.max(0, (v || 0) - STEP_EASE_SPEED * (dtMul || 1));
// A solid cell in the player's centre column counts as a CEILING only if its underside is at
// (or within this frame's upward travel of) the player's HEAD. The old inline check accepted
// solid cells at ANY depth in the body — so jumping diagonally up a stair/hill formation, the
// instant the centre column crossed into the next step, that step's solid backing (down at
// FOOT level) was read as a "ceiling" and the head was shoved beneath it: a multi-cell
// downward teleport into the hill, whose burial ejection then flung the player back down the
// slope — the "jump while walking up a ramp teleports you to the bottom" bug. A cell whose
// underside sits deeper than the head could have risen this frame is a side-clip owned by the
// wall/hill pass, never a ceiling.
export const ceilingBonkRows = (lv, centerC, headY, ph, vy, dtMul, CW, CH) => {
  const r0 = Math.floor(headY / CH), r1 = Math.floor((headY + ph - 0.001) / CH);
  const bonkLimit = headY + Math.abs(vy) * (dtMul || 1) + 2; // deepest a genuine head-bonk can reach this frame
  const rows = [];
  for (let r = r0; r <= r1; r++) {
    const cell = lv.fg[cellKey(r, centerC)];
    if (fgSolid(cell) && (r + 1) * CH <= bonkLimit) rows.push(r);
  }
  return rows;
};

export default function AssetStudio() {
  const [screen, setScreen] = useState("menu");
  const [asset, setAsset] = useState(null);
  const [library, setLibrary] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(true); // never present the initial async read as an empty/deleted library
  const [angle, setAngle] = useState("front");
  const [selId, setSelId] = useState(null);
  const [multiSelect, setMultiSelect] = useState(false); // group-select mode: clicking blocks toggles them into groupIds instead of the normal single select+drag
  const [snapOn, setSnapOn] = useState(false);           // 🧲 Snap to edges — see findEdgeSnap; a dragged block welds itself to a similar-length edge nearby
  const [snapMark, setSnapMark] = useState(null);        // {a,b} of the edge currently being snapped to, drawn as a green line so it's obvious WHY the block jumped
  const snapMarkKey = useRef(null);                      // identity of that edge, so a pointermove that changes nothing doesn't churn state every frame
  const [groupIds, setGroupIds] = useState([]); // piece ids currently selected as a group — dragging any one of them moves all of them together, same delta
  const [stamps, setStamps] = useState([]);     // stored groups: real piece copies, saved outside any asset so they can be stamped onto other bodies/poses
  const [stampName, setStampName] = useState("");
  const [stampPick, setStampPick] = useState(""); // selected reusable group in the compact stored-group shelf
  const [confirmStampDel, setConfirmStampDel] = useState(null); // stamp id armed for deletion — a second tap actually deletes it
  useEffect(() => { setGroupIds([]); setMultiSelect(false); }, [angle, asset?.id]);
  const [newColor, setNewColor] = useState("#7aa2d6");
  const [newFx, setNewFx] = useState(defaultFx()); // brightness/glow/fade for the NEXT block created — the eyedropper feeds this too, alongside newColor
  const [eyedrop, setEyedrop] = useState(false); // eyedropper mode: next block clicked donates its color instead of being selected/picked up
  const [shapePicker, setShapePicker] = useState(false); // true while the "Shapes" picker (Square/Circle/Triangle/.../Star/...) is open
  const [artZoom, setArtZoom] = useState(1); // shrinks the design area within the fixed-size .art canvas, revealing space around it — 1 = design area fills the canvas, down to ARTZOOM_MIN
  const [drawMode, setDrawMode] = useState(null);         // null | "line" | "fill" — which click-to-place tool is active on the .art canvas
  const [linePt1, setLinePt1] = useState(null);           // first clicked point while placing a line
  const [fillPts, setFillPts] = useState([]);             // clicked points while outlining a Fill polygon
  const [confirmDel, setConfirmDel] = useState(null); // asset id armed for deletion — second tap actually deletes
  const [niche, setNiche] = useState(false); // "Niche controls" modal (layer recovery from dressed looks)
  const [loadOpen, setLoadOpen] = useState(false); // Load browser modal open/closed
  const [loadCategory, setLoadCategory] = useState(null); // null = category list; a type key = that category's item list
  const [loadSlot, setLoadSlot] = useState(null);         // Clothes & Armor only: null = slot list; a slot key = that slot's item list
  const [wtypeChoice, setWtypeChoice] = useState(false); // true while the melee/projectile chooser is open (new weapon)
  const [propItemChoice, setPropItemChoice] = useState(false); // true while the Object-vs-Item chooser is open
  const [emoji, setEmoji] = useState("⚔️");
  const [picker, setPicker] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [text, setText] = useState("");
  const [toast, setToast] = useState("");
  const [hasStore, setHasStore] = useState(false);
  const [sessionAssets, setSessionAssets] = useState([]);
  const [loadout, setLoadout] = useState({ bodyId: "", skinId: "", slots: {}, weaponId: "" });
  const [dressedBobName, setDressedBobName] = useState(""); // editable — blank falls back to "<body> — dressed"
  const [markAsEnemy, setMarkAsEnemy] = useState(false);    // saves this Dress Bob look as a player-like enemy (isEnemy flag) instead of a plain playable character
  const [dressedHp, setDressedHp] = useState(10);            // HP for that look, when saved as an enemy — the body's speed/agility/intelligence/strength come along for free via components.body.stats
  const [savedDressedIds, setSavedDressedIds] = useState({}); // name -> id, so re-saving under the SAME name updates it; a different name saves as a new, separate entry
  const [viewDressed, setViewDressed] = useState(null); // a previously-saved dressed character currently being viewed
  const [aAngle, setAAngle] = useState("front");
  const [combo, setCombo] = useState(null);
  const [chooser, setChooser] = useState(false);
  const [box, setBox] = useState({ w: 300, h: 400 });
  const [emojis, setEmojis] = useState([]);
  const [recolorAll, setRecolorAll] = useState(false); // color swatches repaint every piece sharing the selected piece's color, across all poses + all body fits
  // Which PALETTES row the swatches show. Two separate picks, not one: the art editor and the
  // level painter get reached for with different jobs in mind, and each remembers its own. They
  // read the same registry, so a palette added there appears in both pickers.
  const [palKey, setPalKey] = useState("bob");
  const [lPalKey, setLPalKey] = useState("terrain");
  const pal = paletteColors(palKey), lPal = paletteColors(lPalKey);
  // The picker itself. Rendered next to whichever swatch row it drives.
  const palettePicker = (value, onPick) => (
    <select className="palsel" value={value} onChange={(e) => onPick(e.target.value)} title="Swatch palette — the ＋ picker and your recent colours still reach anything else">
      {PALETTE_KEYS.map((k) => <option key={k} value={k}>{PALETTES[k].icon + " " + PALETTES[k].label}</option>)}
    </select>
  );
  const palGroup = useRef({}); // skin-palette: original swatch colour -> the frozen piece group its remap is repainting
  // The piece group the block-colour controls are repainting, held across the steps of one edit —
  // see assetColorGroup for why re-resolving it every step swallows blocks it shouldn't.
  // `seen` is every shade this edit has painted, which is how a later call recognises itself as a
  // continuation: the selected block still wearing one of them means nothing else has repainted it.
  const colorGroup = useRef(null);
  const [recent, setRecent] = useState([]);            // last-used custom colors
  const [recentEmoji, setRecentEmoji] = useState([]);   // last-used emoji — the picker had no memory of this at all before
  const [emojiQuery, setEmojiQuery] = useState("");     // search box in the emoji picker
  const [wState, setWState] = useState("rest");        // weapon: rest | fire
  const [eState, setEState] = useState("normal");       // enemy: normal | onFire | charge
  const [effEdit, setEffEdit] = useState(null);         // equipment only: { effId, bodyKey, frameIdx } while designing an effect's animation; null = editing the item's normal art
  const [fxPickerOpen, setFxPickerOpen] = useState(false); // ✨ Effects: the "add an effect" catalog starts COLLAPSED. It grows by one button per effect type, while a given item usually only wants one or two — so the default view is the effects this item actually HAS, not the menu of everything it could have.
  const [poseCopySrc, setPoseCopySrc] = useState(null); // body creator only: angle currently shown as a copy-from reference
  const [copyToOpen, setCopyToOpen] = useState(false);  // "copy to other poses" submenu is showing
  const [copyToPicked, setCopyToPicked] = useState([]); // poses ticked in that submenu (empty = nothing to copy yet)
  const [propFrame, setPropFrame] = useState(0);        // prop only: which animation frame index is being edited (0 = base look)
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [level, setLevel] = useState(null);            // current level being edited
  const [levelLib, setLevelLib] = useState([]);
  const [pendingLevelAction, setPendingLevelAction] = useState(null); // { label, run } — shown as a confirm modal when about to discard unsaved level changes
  const [levelLoadOpen, setLevelLoadOpen] = useState(false);          // true while the "Load a level" picker modal is open
  const [bgLib, setBgLib] = useState([]);               // saved reusable backgrounds — {id, name} index; full data fetched on load
  const [bgName, setBgName] = useState("");             // name field for saving the current level's background
  const [lLayer, setLLayer] = useState("fg");          // fg (collision) | bg | obj
  const [lTool, setLTool] = useState("paint");         // paint | erase
  const [layerMove, setLayerMove] = useState(null);    // { layer, cells: {key: val} } — a flood-matched region picked up with the Move tool, awaiting a destination layer
  const [lColor, setLColor] = useState("#6b7b3a");
  const [texLib, setTexLib] = useState([]);          // saved texture instances — { id, name, tex, colors, params }
  const [lTexId, setLTexId] = useState(null);        // texture the paint tool is currently painting with; null = plain color, exactly as before
  const [texPick, setTexPick] = useState(false);     // texture picker modal open
  const [texEdit, setTexEdit] = useState(null);      // texture instance being created/edited in the texture creator; null = closed
  // Which screen opened the texture picker/editor, and therefore what picking one paints: the
  // level brush, or the art block selected in the asset creator. One library and one set of
  // modals serve both — a Flannel made for a jacket is the same texture a wall can use.
  const [texTarget, setTexTarget] = useState("level");
  // The texture every paint/fill/ramp stroke uses right now. null = plain color (the old behavior,
  // unchanged). Derived rather than stored so deleting a texture can never leave the brush
  // pointing at something that no longer exists.
  const activeTexture = useMemo(() => resolveTexture(texLib, lTexId), [texLib, lTexId]);
  const [lFgShape, setLFgShape] = useState("block"); // "block" | "slopeUp" | "slopeDown" — visual shape painted onto Foreground or Background cells
  const [lFgUpsideDown, setLFgUpsideDown] = useState(false); // flips either layer's ramp diagonal to hang from the top; only Foreground participates in collision
  const [lFgHide, setLFgHide] = useState(false);       // collision-only Foreground paint: visible/marked in the editor, omitted from Playtest art while collision remains live
  const [lHoverCell, setLHoverCell] = useState(null); // {r,c} under the pointer — drives the placement ghost preview
  const [rampDragOn, setRampDragOn] = useState(false); // true while dragging out a multi-cell ramp — drives the live ramp-span preview
  const [areaDragOn, setAreaDragOn] = useState(false); // true while dragging out an area-copy selection rectangle
  const [hasClipboard, setHasClipboard] = useState(false); // just drives the toolbar label — the actual data lives in clipboard.current
  const [lEmoji, setLEmoji] = useState("🌳");           // selected emoji for the Objects layer
  const [lObjKind, setLObjKind] = useState("emoji");    // "emoji" (a character), "shape" (a plain colored block), or "prop" (a saved Object/Prop asset's pixel art)
  const [lObjShape, setLObjShape] = useState("rect");   // shape used when lObjKind === "shape": rect/circle/tri/tri2, same vocabulary as the piece editor
  const [lPropId, setLPropId] = useState("");           // which saved prop asset the Objects layer paints when lObjKind === "prop"
  const [lTint, setLTint] = useState(null);             // tint for placed emoji objects (null = natural colors) — doubles as the fill color when lObjKind === "shape"
  const [lSolid, setLSolid] = useState(true);           // do placed objects block the player? (on by default — decoration is the exception, not the rule)
  const [lInFront, setLInFront] = useState(false);      // render placed objects in front of the player instead of behind (off by default — matches how it always worked before)
  const [lObjSize, setLObjSize] = useState(1);          // emoji footprint in cells (1 = one tile, 4 = 4x4)
  // Angle the NEXT object is placed at. Rotation belongs with size, colour and solid — the settings
  // you dial in on the toolbar while holding an object, before you put it down. Offering it only
  // after placement was the whole reason "there is no rotate": you pick Objects > Object > Trailer,
  // look at the strip you just used, and it isn't there. Every object painted carries this angle.
  const [lObjRot, setLObjRot] = useState(0);
  // Mirror for the next object placed, alongside Twist. It exists for its own sake (a tree leaning
  // the other way, a sign facing back up the path) and because flipping a whole level sets it on
  // every object — without a control here you could mirror a level and then not un-mirror one prop.
  const [lObjFlip, setLObjFlip] = useState(false);
  const [lBrush, setLBrush] = useState(1);              // paint brush size in cells, for fg/bg/climb
  const [lOutline, setLOutline] = useState(false);      // brush option: outline the perimeter of the brush footprint
  const [lOutlineColor, setLOutlineColor] = useState("#1a1a1a"); // color that brush outline paints with
  const [movingActive, setMovingActive] = useState(false); // true while Select has picked something up (UI feedback only)
  const moving = useRef(null);                          // { key, item, from: "fx" | "markers" } — the actual picked-up data
  const [lFxSel, setLFxSel] = useState(null);           // cell key currently showing its object stack in the side panel
  const [lFxEditIdx, setLFxEditIdx] = useState(null);   // index within that cell's stack currently expanded for tweaking
  const [lMarkerKind, setLMarkerKind] = useState("door"); // door | pedestal
  const [lMarkerCat, setLMarkerCat] = useState("");      // door's accepted destination category (free text)
  const [lPedCat1, setLPedCat1] = useState("");        // pedestal search: first category filter (blank = any)
  const [lPedCat2, setLPedCat2] = useState("");        // pedestal search: second category filter (blank = any)
  const [lPedLogic, setLPedLogic] = useState("or");     // pedestal search logic: "or" (either tag) | "and" (both tags)
  const [lClimbKind, setLClimbKind] = useState("ladder"); // ladder | bars | cliff — which climb layer paints
  const [lHazDps, setLHazDps] = useState(DEFAULT_HAZARD_DPS.fire); // fire hazard damage-per-second the Hazard tool paints with
  const [lHazLife, setLHazLife] = useState(DEFAULT_HAZARD_LIFE);   // seconds a painted fire burns before going out (0 = permanent)
  const [lHazHide, setLHazHide] = useState(false);                // paint fire that's INVISIBLE during play (still deals damage) — so you can lay your own pixel-art fire Object on top of it via the Front layer
  const [lEnemyId, setLEnemyId] = useState("");          // which enemy/isEnemy-character asset the Enemies layer paints with
  const [lEnemyFace, setLEnemyFace] = useState(-1);       // which way newly-placed enemies face: -1 left (default — enemies confront a left-to-right player), 1 right
  const [lEnemyAi, setLEnemyAi] = useState("guard");      // AI behavior stamped onto newly-placed enemies (set HERE in the level tester, not the enemy creator) — "asset" = use the enemy's own saved default
  const [lSel, setLSel] = useState(null);              // selected connector key
  const [gen, setGen] = useState(null);                // generated chain preview
  const [play, setPlay] = useState(false);             // playtest mode
  const [playerId, setPlayerId] = useState("");        // asset used as the player
  const [playtestWeaponId, setPlaytestWeaponId] = useState(""); // weapon equipped for playtest — separate from a saved dressed look, so a weapon can be tested on any body
  const [playtestThrowId, setPlaytestThrowId] = useState("");   // throwable carried for playtest (single-use grenade thrown with G)
  const [playtestThrowCount, setPlaytestThrowCount] = useState(3); // how many of it to start a test with — stands in for level pickups
  const projectiles = useRef([]);                        // live projectile entities: {x,y,vx,vy,char,tint,size,life}
  const booms = useRef([]);                              // live explosion visuals (play-only, front layer): {x,y,propId,size,life,maxLife} — an explode-tagged shot spawns one on impact; never touches saved level data
  const thrown = useRef([]);                             // live thrown-grenade entities mid-arc: {x,y,vx,vy,rot,asset,pieces}
  const throwCarry = useRef(0);                          // how many of the carried throwable the player still has this session (single-use)
  const throwPickup = useRef(null);                       // set to a count (e.g. 3) when a throwable is TAKEN from a pedestal, so a fresh pickup arrives stocked regardless of the test-count knob; consumed on the next loop init
  const throwCd = useRef(0);                             // small cooldown after a throw so one G press = one grenade
  const thrownFireKeys = useRef(new Set());              // hazard keys created by grenades this session — removed on Stop so they don't persist into the saved level
  const thrownPropKeys = useRef(new Set());              // fx-prop keys stamped by grenades this session (custom fire art) — pulled back off on Stop, same as thrownFireKeys
  const wpn = useRef(newWeaponAmmo(0));                   // equipped ranged weapon's live { clip, ammo, cd, reloadT } this Playtest session — re-seeded whenever Playtest starts or the weapon changes
  const hazLife = useRef({});                             // cellKey -> remaining burn seconds this Playtest session (only cells with a finite life appear here); a key present and <=0 means burnt out
  const playRunId = useRef(0);                            // bumped once each time Playtest actually STARTS — lets the loop tell a genuine new session from an incidental effect re-run (e.g. a grenade's setLevel), so fire countdowns aren't reset mid-play
  const lastSeededRun = useRef(-1);                       // the playRunId hazLife was last freshly seeded for; equal => this is a re-run of the same session, so preserve in-progress countdowns
  const enemyHP = useRef({});                             // spawnKey -> remaining HP this Playtest session (lazily seeded from the enemy asset's base hp on first hit)
  const enemyDrops = useRef({});                          // spawnKey -> null (no loot) | { item, x, y }; rolled once per defeated enemy
  const corpseStripped = useRef({});                      // spawnKey -> [asset, ...] looted OFF that body: its art stops drawing those pieces, so a corpse you took the rifle from is visibly unarmed
  const meleeReach = useRef({});                          // enemyId|weaponId -> swept melee-hitbox reach in px, so the engage gate doesn't re-sweep the whole swing arc every frame
  const enemyPos = useRef({});                            // spawnKey -> { y, vy, onGround } — lets enemies fall to the ground on Playtest start ("drop into place") instead of being frozen at their placed cell
  const playerHP = useRef(10);                            // player's remaining HP this Playtest session — seeded from the player asset's HP stat when Playtest starts
  const pedestalRolls = useRef({});
  const pedestalDepleted = useRef(new Set());              // pedestal keys the player emptied (took the item, had nothing to swap back) — these vanish rather than showing "no match"
  const equipped = useRef({});                            // slot -> equipment item taken from a pedestal this session (weapons go through playtestWeaponId instead)
  const itemBuffs = useRef([]);                            // active temporary stat boosts from consumed items: [{ stat, amount, until }] (until = performance.now ms). Pruned every frame.
  const roomReturn = useRef(null);                         // while inside a room during play: { level: <the level to return to>, x, y } — set on enter, consumed on exit/stop
  const roomState = useRef({});                             // per-level PERSISTENT state for the current play session, keyed by level id: { rolls, depleted, eHP, ePos, drops, haz }. Never cleared on a transition — only on a fresh Playtest. This is what makes a level/room keep what you did to it when you leave and come back.
  const sessionRooms = useRef({});                          // "originLevelId|doorCell" -> chosen room id, so a given door leads to the SAME room all session (re-entering doesn't re-roll)
  const spawnReq = useRef(null);                            // one-shot spawn placement for the next frame: { gate:true } | { roomDoor:true } | { x, y }. Resolved once, using the real player size, then cleared.
  const playerLookCache = useRef({ key: "", look: null }); // memoises the live-composed player look (all angles) so re-composing every frame is free until the equipped set actually changes
  const [equipGen, setEquipGen] = useState(0);            // bumped when pedestal equipment changes, so the playtest loop re-keys and the merged stats/effects take effect live
  const [pedPrompt, setPedPrompt] = useState(null);       // { key, name, type, slot } | { key, empty, summary } | null — pedestal the player is standing on, for the "Press E" HUD                       // cellKey -> the item this pedestal rolled this Playtest session (stable; pre-rolled at Playtest start, Binding-of-Isaac style)
  const [doorPrompt, setDoorPrompt] = useState(null);     // { enter: bool, tag, n } | null — door the player is standing on, for the "Press E to enter/exit" HUD
  const [pframe, setPframe] = useState(0);             // playtest re-render tick
  const frontCellsRef = useRef(null);      // wrapper around the memoized Front tile layer — lets the playtest loop fade covered cells imperatively, without re-rendering the whole (memoized) layer every frame
  const hazardCellsRef = useRef(null);     // same idea for fire: the layer is memoized (not rebuilt every frame), so a burnt-out cell is hidden imperatively by toggling its own element's opacity
  // Wrapper for a whole memoized tile layer. `display:contents` means it generates no box at all,
  // so the absolutely-positioned cells inside still lay out and stack against .lgrid exactly as
  // they did loose (the Front layer has always been wrapped this way for its ref).
  // Why every layer now gets one — this was measured, not assumed. A memoized ARRAY spliced
  // straight into .lgrid does NOT let React skip the cells: .lgrid's own props are new every
  // frame, so React re-reconciles its children list and walks all ~8,400 of them to decide each
  // one can be reused. That walk alone was ~5ms of a 16ms frame on Blake's Forest M1 while the
  // physics loop itself took 0.2ms. Wrapping each layer in an element that is ITSELF memoized
  // gives that one fiber identical props, so React bails out there and never descends.
  const CELL_LAYER_STYLE = { display: "contents" };
  // The playtest loop re-renders this whole component every frame (setPframe above) — but the
  // level's own tile layers never change mid-playtest, and even while editing they only change
  // when a paint actually commits (a new `level` object). Rebuilding every Background/
  // Foreground/Front/Object/Climb cell element from scratch 60x a second just for React to
  // diff-and-discard them all was the single biggest per-frame cost on any real-sized level.
  // Memoizing each layer keyed on the state it actually reads is half the answer; each one also
  // has to be wrapped in its OWN element (see CELL_LAYER_STYLE) or React still walks every cell.
  const lvBgLayer = useMemo(() => level ? <div style={CELL_LAYER_STYLE}>{cellRuns(level.bg || {}).map(({ key, r, c, span, cell }) => <div key={"b" + key} className="lcell bg" style={{ left: c * LV_CELL, top: r * LV_CELL, ...cellOutlineStyle(level.bg, cell, r, c, texLib), clipPath: fgClipPath(cell), width: span * LV_CELL }} />)}</div> : null, [level, texLib]);
  // One div per FILL, not per cell: a cell holding a gravel ramp over grass blocks draws both,
  // the grass first and the ramp over it. fgFills is newest-first, so it's walked backwards to
  // put the most recent paint on top. Single-material cells (every cell in an older save) come
  // back as a one-item list and render exactly one div, as they always did.
  // (Same z-index for every fill in a cell, so DOM order alone decides what covers what.)
  const lvFgLayer = useMemo(() => level ? <div style={CELL_LAYER_STYLE}>{cellRuns(level.fg || {}).flatMap(({ key, r, c, span, cell, sig }) => {
    // A run (plain paint, no ramp, no outline, one fill) draws as a single wide box; anything
    // cellRunSig refused to merge falls through to the original one-box-per-fill path below.
    if (sig !== null) {
      const fill = fgFills(cell)[0], hidden = fgHiddenInPlay(fill);
      if (play && hidden) return [];
      return [<div key={"f" + key + "_0"} data-fg-hidden={hidden ? "true" : undefined} className={"lcell" + (hidden ? " collisionOnly" : "")} title={hidden ? "Collision only — invisible during play" : undefined} style={{ left: c * LV_CELL, top: r * LV_CELL, ...cellOutlineStyle(level.fg, fill, r, c, texLib), width: span * LV_CELL }} />];
    }
    return fgFills(cell).map((fill, i) => {
      const hidden = fgHiddenInPlay(fill);
      if (play && hidden) return null; // collision reads level.fg directly; only its Playtest art is omitted
      return <div key={"f" + key + "_" + i} data-fg-hidden={hidden ? "true" : undefined} className={"lcell" + (hidden ? " collisionOnly" : "")} title={hidden ? "Collision only — invisible during play" : undefined} style={{ left: c * LV_CELL, top: r * LV_CELL, ...cellOutlineStyle(level.fg, fill, r, c, texLib), clipPath: fgClipPath(fill) }} />;
    }).reverse();
  })}</div> : null, [level, texLib, play]);
  // The Front layer keeps its ref here (the loop fades covered cells imperatively) — the wrapper it
  // always had simply moved INSIDE the memo, so the element itself is stable across frames too.
  const lvFrontLayer = useMemo(() => level ? <div ref={frontCellsRef} style={CELL_LAYER_STYLE}>{Object.keys(level.front || {}).map((k) => { const [r, c] = k.split(",").map(Number); return <div key={"fr" + k} data-fk={k} className="lcell front" style={{ left: c * LV_CELL, top: r * LV_CELL, ...cellOutlineStyle(level.front, level.front[k], r, c, texLib) }} />; })}</div> : null, [level, texLib]);
  const lvFxLayer = useMemo(() => level && level.fx ? <div style={CELL_LAYER_STYLE}>{Object.keys(level.fx).flatMap((k) => { const [r, c] = k.split(",").map(Number); const stack = splitObjectStackByPlayerLayer(level.fx[k]).behind.filter(({ o }) => o.kind !== "prop"); return stack.map(({ o, stackIndex: si }) => { const sz = (o.size || 1) * LV_CELL; const eraseNow = !play && lTool === "erase"; return <div key={"x" + k + "_" + si} className={"lobj " + objectLayerClass(o) + (o.solid ? " solid" : "") + (lFxSel === k ? " insp" : "")} style={{ left: objNudgedLeft(o, c, LV_CELL), top: objNudgedTop(o, r, LV_CELL), width: sz, height: sz, ...objRotStyle(o), ...(eraseNow ? { pointerEvents: "auto", cursor: "pointer" } : {}) }} onPointerDown={eraseNow ? (e) => { e.stopPropagation(); setLevel((lv2) => { const s2 = (lv2.fx[k] || []).filter((_, i) => i !== si); const fx = { ...lv2.fx }; if (s2.length) fx[k] = s2; else delete fx[k]; return { ...lv2, fx }; }); } : undefined}>{objInner(o, sz)}</div>; }); })}</div> : null, [level, play, lFxSel, lTool]);
  // Prop objects (pixel-art assets) are pulled OUT of the memoized fx layer above and rendered in
  // a separate LIVE pass (see the level render body) — the memo runs before the component-scoped
  // prop renderer exists, and animated props need to redraw every frame in play anyway. This
  // carries just position/stack metadata; the scaled art itself is drawn with renderObj.
  const lvPropMeta = useMemo(() => level && level.fx ? Object.keys(level.fx).flatMap((k) => { const [r, c] = k.split(",").map(Number); return splitObjectStackByPlayerLayer(level.fx[k]).behind.filter(({ o }) => o.kind === "prop").map(({ o, stackIndex: si }) => ({ o, si, r, c, k })); }) : [], [level]);
  // Position/content only — NOT the rendered JSX itself, since a solid front object's opacity
  // now depends on the player's live position (see the "in front of player" render below), which
  // changes every playtest frame. Keeping that part of the work memoized on just `level` still
  // avoids rebuilding this list on every one of those frames; only the small per-frame map over
  // it (done at the actual render site) needs to run live.
  const lvFxInFrontMeta = useMemo(() => level && level.fx ? Object.keys(level.fx).flatMap((k) => { const [r, c] = k.split(",").map(Number); return splitObjectStackByPlayerLayer(level.fx[k]).front.map(({ o, stackIndex: si }) => ({ key: "xf" + k + "_" + si, r, c, k, si, o, sz: (o.size || 1) * LV_CELL })); }) : [], [level]);
  // Climb glyphs are directly erasable: Erase tool + click the glyph = gone, no matter which
  // layer tab is active. Erasing a visible thing by clicking it should just work — requiring
  // the Climb layer tab to be selected first made climb cells feel impossible to delete.
  const lvClimbLayer = useMemo(() => level && level.climb ? <div style={CELL_LAYER_STYLE}>{Object.keys(level.climb).map((k) => { const [r, c] = k.split(",").map(Number); const kind = climbKindOf(level.climb[k]); const glyph = kind === "bars" ? "🙌" : kind === "cliff" ? "🧗" : "🪜"; const label = kind === "bars" ? "Monkey bars — hang & shimmy ← →, ↓ to drop" : kind === "cliff" ? "Cliff ledge — hang & shimmy ← →, ↓ to drop (forward-facing)" : "Ladder — climb straight up/down"; return <div key={"cl" + k} className={"lclimb kind-" + kind} style={{ left: c * LV_CELL, top: r * LV_CELL, width: LV_CELL, height: LV_CELL, ...(lTool === "erase" ? { pointerEvents: "auto", cursor: "pointer" } : {}) }} title={label} onPointerDown={lTool === "erase" ? (e) => { e.stopPropagation(); setLevel((lv) => { const climb = { ...lv.climb }; delete climb[k]; return { ...lv, climb }; }); } : undefined}>{glyph}</div>; })}</div> : null, [level, lTool]);
  // Fire hazard cells: shown in the editor AND during play (it's a real, visible danger volume,
  // not an invisible marker). Erasable by clicking with the Erase tool on any layer, same as
  // climb. The flicker is CSS-only, so re-rendering this list every playtest frame isn't needed —
  // it's memoized on the level + tool, exactly like the climb layer.
  const lvHazardLayer = useMemo(() => level && level.hazard ? <div ref={hazardCellsRef} style={CELL_LAYER_STYLE}>{Object.keys(level.hazard).map((k) => { const [r, c] = k.split(",").map(Number); const cell = level.hazard[k]; const kind = hazardKindOf(cell); const info = HAZARDS[kind] || HAZARDS.fire; const eraseNow = !play && lTool === "erase"; const life = hazardLife(cell); const hidden = !!(cell && typeof cell === "object" && cell.hideInPlay); if (play && hidden) return null; /* invisible-in-play fire: still hurts (damage runs off level.hazard), just draws nothing during play so a prop fire can sit on top */ return <div key={"hz" + k} data-hk={k} className={"lhazard kind-" + kind + (hidden ? " hazHidden" : "")} style={{ left: c * LV_CELL, top: r * LV_CELL, width: LV_CELL, height: LV_CELL, ...(eraseNow ? { pointerEvents: "auto", cursor: "pointer" } : {}) }} title={info.label + " — " + hazardDps(cell) + " HP/sec" + (life > 0 ? " · burns " + life + "s" : " · permanent") + (hidden ? " · invisible during play" : "")} onPointerDown={eraseNow ? (e) => { e.stopPropagation(); setLevel((lv) => { const hazard = { ...lv.hazard }; delete hazard[k]; return { ...lv, hazard }; }); } : undefined}><span className="hzflame">{hidden ? "🚫" : info.glyph}</span></div>; })}</div> : null, [level, lTool, play]);
  const [canUndoLevel, setCanUndoLevel] = useState(false);
  const [canRedoLevel, setCanRedoLevel] = useState(false);
  const artRef = useRef(null);
  const drag = useRef(null);
  // Which guide bodies (for a skin/equipment asset) actually had piece content edited this
  // session — switching the guide dropdown alone does NOT add to this (that's just cloning a
  // starting point, per confirmedFits' own rule); only a real edit while that guide is active
  // does. Cleared whenever a fresh asset is started/opened. Read at Save time so a session
  // where several bodies were each genuinely edited — not just the one active when Save was
  // finally clicked — all get confirmed, not just the last one.
  const dirtyGuides = useRef(new Set());
  const history = useRef([]);
  const future = useRef([]);
  const levelHistory = useRef([]);
  const levelFuture = useRef([]);
  const lpaint = useRef(null);                          // level paint drag state
  const rampAnchor = useRef(null);                       // {r, c} anchor cell while dragging out a multi-cell ramp — cleared on commit
  const areaAnchor = useRef(null);                       // {r, c} anchor cell while dragging out an area-copy rectangle — cleared on commit
  const clipboard = useRef(null);                        // { w, h, fg, bg, fx } captured from the last area-copy selection, keyed relative to its own top-left corner
  const fadedFrontKeys = useRef(new Set()); // Front cell keys currently faded, so leaving a cell restores it and unchanged cells aren't touched at all
  const xrayFrontSig = useRef("");         // signature of the Front cells the player was behind last frame; the flood fill above only re-runs when this changes, so standing still costs nothing
  const xrayPedKeys = useRef(new Set());   // marker keys of the pedestals that sheet hides — the loop fades the wall over each one, the render draws them by distance
  const playerCenter = useRef({ x: 0, y: 0 }); // the player's hitbox centre, published each frame by the loop (which already has the live pw/ph) so the render can measure distances without re-deriving the body size per drawn thing
  const groundArtCache = useRef(new Map());   // item id -> its baked ground art + bounding box; see groundArt() — an item on a pedestal or lying where a body dropped it is otherwise re-baked every playtest frame
  const player = useRef({ x: 60, y: 40, vx: 0, vy: 0, onGround: false, crouch: false, face: 1, climbing: false, climbJump: false, climbKind: null, climbJumpKind: null, climbJumpGrab: false, dropCooldown: 0, onSlope: false, slopeDir: 0, slopeRun: 0, sliding: false, slideVx: 0, stepEase: 0, transitioning: null, walking: false, walkPhase: 0, firing: null, wasFire: false, blocking: null, blockCd: 0, wasMelee: false, hitRegistered: false, aimDir: 0, extraJumped: false, wasJump: false, effectAnim: null, djGravMul: 1, invuln: 0, jumpHoldT: 0, onFire: 0, burnPool: 0, wasThrow: false, throwAiming: false, throwFiring: 0, hangPhase: 0 });
  const keys = useRef({});
  const lvRef = useRef(null);

  const addRecent = (c) => { if (!c) return; setRecent((r) => [c, ...r.filter((x) => x !== c)].slice(0, 8)); };
  const addRecentEmoji = (m) => { if (!m) return; setRecentEmoji((r) => [m, ...r.filter((x) => x !== m)].slice(0, 16)); };
  const snapshot = () => { if (!asset) return; const s = JSON.stringify(asset); const h = history.current; if (h[h.length - 1] === s) return; h.push(s); if (h.length > 80) h.shift(); future.current = []; setCanUndo(true); setCanRedo(false); };
  const undo = () => {
    if (!asset) return;
    const h = history.current; const cur = JSON.stringify(asset);
    while (h.length) {
      const prev = h.pop();
      if (prev !== cur) { future.current.push(cur); if (future.current.length > 80) future.current.shift(); try { setAsset(JSON.parse(prev)); } catch {} setSelId(null); break; }
    }
    setCanUndo(h.length > 0); setCanRedo(future.current.length > 0);
  };
  const redo = () => {
    if (!asset) return;
    const f = future.current; if (!f.length) return;
    const next = f.pop(); const cur = JSON.stringify(asset);
    history.current.push(cur); if (history.current.length > 80) history.current.shift();
    try { setAsset(JSON.parse(next)); } catch {} setSelId(null);
    setCanUndo(true); setCanRedo(f.length > 0);
  };
  const resetHistory = () => { history.current = []; future.current = []; setCanUndo(false); setCanRedo(false); };

  const snapshotLevel = () => { if (!level) return; const s = JSON.stringify(level); const h = levelHistory.current; if (h[h.length - 1] === s) return; h.push(s); if (h.length > 80) h.shift(); levelFuture.current = []; setCanUndoLevel(true); setCanRedoLevel(false); };
  const undoLevel = () => {
    if (!level) return;
    const h = levelHistory.current; const cur = JSON.stringify(level);
    while (h.length) {
      const prev = h.pop();
      if (prev !== cur) { levelFuture.current.push(cur); if (levelFuture.current.length > 80) levelFuture.current.shift(); try { setLevel(JSON.parse(prev)); } catch {} setLSel(null); break; }
    }
    setCanUndoLevel(h.length > 0); setCanRedoLevel(levelFuture.current.length > 0);
  };
  const redoLevel = () => {
    if (!level) return;
    const f = levelFuture.current; if (!f.length) return;
    const next = f.pop(); const cur = JSON.stringify(level);
    levelHistory.current.push(cur); if (levelHistory.current.length > 80) levelHistory.current.shift();
    try { setLevel(JSON.parse(next)); } catch {} setLSel(null);
    setCanUndoLevel(true); setCanRedoLevel(f.length > 0);
  };
  const resetLevelHistory = () => { levelHistory.current = []; levelFuture.current = []; setCanUndoLevel(false); setCanRedoLevel(false); };
  // Tracks the level exactly as it was last saved/opened/created — compared against the live
  // level to detect unsaved work. null means "nothing loaded yet" (no dirty-check needed).
  const levelBaseline = useRef(null);
  const levelIsDirty = () => !!level && levelBaseline.current !== null && JSON.stringify(level) !== levelBaseline.current;
  // Any action that REPLACES the whole current level (New, Open a saved level, Open a file)
  // routes through here first. If there's unsaved work, it stops and asks — this is the fix for
  // losing hours of work to one misclick on a level list with no confirmation at all.
  const guardLevelSwitch = (label, run) => { if (levelIsDirty()) setPendingLevelAction({ label, run }); else run(); };

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 1600); };
  // saves to Claude's storage when present, otherwise the browser's localStorage
  const sget = async (k) => { try { if (typeof window !== "undefined" && window.storage) { const r = await window.storage.get(k, false); return r ? r.value : null; } return localStorage.getItem(k); } catch { return null; } };
  const sset = async (k, v) => { try { if (typeof window !== "undefined" && window.storage) { await window.storage.set(k, v, false); return true; } localStorage.setItem(k, v); return true; } catch { return false; } };
  const sdel = async (k) => { try { if (typeof window !== "undefined" && window.storage) { await window.storage.delete(k, false); return true; } localStorage.removeItem(k); return true; } catch { return false; } };
  useEffect(() => {
    let ok = false;
    try { if (typeof window !== "undefined" && window.storage) ok = true; else { localStorage.setItem("__p", "1"); localStorage.removeItem("__p"); ok = true; } } catch { ok = false; }
    setHasStore(ok); loadLibrary(); loadStamps();
  }, []); // eslint-disable-line
  useEffect(() => { setEmojis(buildEmojiList()); }, []);
  // Persist the active paint color + recent-colors history so they survive a reload — previously
  // these were plain useState with no storage backing, so the last color used was silently lost
  // every time. colorPrefsLoaded guards against the two save-effects below firing with the
  // hardcoded default before the async load below has had a chance to restore the real value.
  const colorPrefsLoaded = useRef(false);
  useEffect(() => {
    (async () => {
      const savedColor = await sget("lColor");
      if (savedColor) setLColor(savedColor);
      const savedRecent = await sget("recentColors");
      if (savedRecent) { try { setRecent(JSON.parse(savedRecent)); } catch {} }
      colorPrefsLoaded.current = true;
    })();
  }, []); // eslint-disable-line
  useEffect(() => { if (colorPrefsLoaded.current) sset("lColor", lColor); }, [lColor]);
  useEffect(() => { if (colorPrefsLoaded.current) sset("recentColors", JSON.stringify(recent)); }, [recent]);
  // Snap is a way of WORKING, not a property of any one asset — so it survives a reload like the
  // paint colour does, instead of having to be re-ticked every time the editor is opened.
  const snapPrefLoaded = useRef(false);
  useEffect(() => { (async () => { const v = await sget("snapEdges"); if (v === "1") setSnapOn(true); snapPrefLoaded.current = true; })(); }, []); // eslint-disable-line
  useEffect(() => { if (snapPrefLoaded.current) sset("snapEdges", snapOn ? "1" : "0"); }, [snapOn]);

  // Playtest: keyboard + a simple gravity/collision loop against the foreground layer.
  useEffect(() => {
    if (!play || screen !== "level" || !level) return;
    // Stuck-key guard: this ref is never recreated, and a key held at the instant Playtest
    // stopped had its keyup land AFTER the listener was removed — leaving e.g. up:true stuck
    // forever, so the next session spawned already aiming up and every shot went upward until
    // that key was pressed and released again. Clear on every session start, and on window
    // blur (alt-tab mid-hold has the same missed-keyup problem).
    keys.current = {};
    const onBlur = () => { keys.current = {}; };
    window.addEventListener("blur", onBlur);
    // WASD moves, the arrow keys aim (that's the "move with WASD, aim with the arrows" split).
    // Up/down still double as ladder climb and as the crouch input, so a keyboard player never
    // needs the mouse. Jump is Space; crouch is also S-held / C. The move-vs-aim keys are kept
    // as SEPARATE actions below so aiming up doesn't also walk you into a wall, and so a claw of
    // W+↑ reads as "run while aiming up" rather than one cancelling the other.
    const map = {
      w: "up", a: "left", s: "down", d: "right", W: "up", A: "left", S: "down", D: "right",
      ArrowUp: "aimUp", ArrowDown: "aimDown", ArrowLeft: "aimLeft", ArrowRight: "aimRight",
      " ": "jump", f: "fire", F: "fire", j: "fire", J: "fire", q: "melee", Q: "melee", v: "melee", V: "melee", g: "throw", G: "throw", c: "crouch", C: "crouch", r: "reload", R: "reload", e: "interact", E: "interact",
    };
    const isTyping = (e) => { const t = e.target; return !!(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)); };
    const kd = (e) => { if (isTyping(e)) return; const k = map[e.key]; if (k) { keys.current[k] = true; if (e.key === " " || e.key.startsWith("Arrow")) e.preventDefault(); } };
    const ku = (e) => { if (isTyping(e)) return; const k = map[e.key]; if (k) keys.current[k] = false; };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    const CW = LV_CELL, CH = LV_CELL;
    // Quartered from the original 10px/frame — climbing was moving (and therefore animating,
    // since the climb animation's phase advance is driven directly by how far you actually
    // moved) too fast to see the swing cycle clearly. This single constant governs both.
    const CLIMB_SPEED = 2.5;
    const JUMP_HOLD_BOOST_FRAMES = 12; // ~0.2s at 60fps — a short window right at takeoff, not an unlimited hover
    const JUMP_HOLD_BOOST_ACCEL = 0.022; // extra upward accel per frame, per point of Agility above 5, while held
    const CROUCH_DODGE_RANGE = 140;   // px — how close an incoming shot has to be for a crouch-capable enemy to try ducking
    const DODGE_LOOKOUT_RANGE = 200;  // px — how far out an enemy notices an incoming shot at all. Wider than the duck-only value above, because a JUMP needs lead time to actually get off the ground before the shot arrives.
    const CROUCH_HOLD_FRAMES = 24;    // how long a dodge-crouch holds once triggered, absent a fresh threat
    const lv = level;
    const basePlayerAsset = findA(playerId);
    const playerAsset = mergeEquip(basePlayerAsset, equipped.current, equippedBodyIdFor(basePlayerAsset));
    const playtestWeapon = playtestWeaponId ? findA(playtestWeaponId) : null;
    const bodyShape = sideBodyShape(playerAsset);
    const doubleJumpEffect = (playerAsset?.effects || []).find((e) => e.type === "doubleJump") || null;
    const backGuardEffect = (playerAsset?.effects || []).find((e) => e.type === "backGuard") || null;
    const glideEffect = (playerAsset?.effects || []).find((e) => e.type === "glide") || null;
    const slideEffect = (playerAsset?.effects || []).find((e) => e.type === "slide") || null;
    const slideResolved = slideState(slideEffect);
    const backGuardReduce = backGuardEffect ? (backGuardEffect.reduce ?? 0.5) : null; // null = no cape, skip the behind check entirely
    const crouchGuardEffect = (playerAsset?.effects || []).find((e) => e.type === "crouchGuard") || null;
    const crouchGuardReduce = crouchGuardEffect ? (crouchGuardEffect.reduce ?? 0.5) : null; // null = not worn, skip the crouch check entirely
    // Ranged weapon ammo: a fresh full clip each Playtest session (this effect re-runs whenever
    // Playtest starts/stops or the equipped weapon changes). Melee weapons get an "unlimited"
    // record (clip 0), so nothing below ever gates a swing on ammo.
    const wpnIsRanged = !!(playtestWeapon && isRanged(playtestWeapon.wtype));
    const fireCdFrames = weaponFireCooldownFrames(playtestWeapon?.fireRate);
    wpn.current = newWeaponAmmo(wpnIsRanged ? effectiveMagazineSize(playtestWeapon.clipSize, playerAsset?.effects) : 0);
    // Throwable the player is carrying this session (chosen separately from the held weapon), plus
    // the count they start with. Single-use: each throw decrements throwCarry; at 0, G does nothing.
    const carriedThrow = playtestThrowId ? findA(playtestThrowId) : null;
    if (carriedThrow && isThrowable(carriedThrow.wtype)) { throwCarry.current = throwPickup.current != null ? throwPickup.current : Math.max(0, playtestThrowCount || 0); } else { throwCarry.current = 0; }
    throwPickup.current = null;
    thrown.current = []; throwCd.current = 0; booms.current = [];
    // PERSISTENT per-level state (this play session). Point the live refs at THIS level's bucket, so
    // everything you did here — pedestals taken, enemies defeated, fires burned down — is still here
    // when you leave through a door and come back. Each level/room gets its own bucket by id; only a
    // fresh Playtest (the button) wipes them. hazLife is (re)built by the seeding just below and then
    // written back into the bucket so its countdowns persist across visits too.
    let _bkt = roomState.current[lv.id];
    if (!_bkt) { _bkt = { rolls: {}, depleted: new Set(), eHP: {}, ePos: {}, drops: {}, stripped: {}, haz: {} }; roomState.current[lv.id] = _bkt; }
    if (!_bkt.drops) _bkt.drops = {}; // migrate a bucket created earlier in this same hot-reloaded play session
    if (!_bkt.stripped) _bkt.stripped = {}; // same migration for looted-corpse art
    pedestalRolls.current = _bkt.rolls; pedestalDepleted.current = _bkt.depleted; enemyHP.current = _bkt.eHP; enemyPos.current = _bkt.ePos; enemyDrops.current = _bkt.drops; corpseStripped.current = _bkt.stripped; hazLife.current = _bkt.haz;
    // Seed each finite-life fire cell's countdown. Permanent cells (life 0) deliberately never
    // enter the ref, so alive() below treats them as always burning.
    // IMPORTANT: this effect re-runs mid-play whenever `level` changes — and it changes every
    // time a thrown grenade paints its fire (setLevel, below). A blanket `hazLife = {}` reseed
    // on every such re-run reset every already-burning fire's countdown back to full, so lobbing
    // one grenade silently relit every fire in the room (and reset the fresh grenade fire's own
    // clock too). Preserve any countdown already in progress (prevLife) across re-runs; only a
    // genuinely NEW session (Playtest just started, tracked by playRunId) wipes the slate so
    // re-entering Playtest correctly relights everything from full.
    const prevLife = playRunId.current === lastSeededRun.current ? hazLife.current : {};
    lastSeededRun.current = playRunId.current;
    hazLife.current = {};
    for (const key of Object.keys(lv.hazard || {})) {
      const life = hazardLife(lv.hazard[key]);
      if (life > 0) hazLife.current[key] = (key in prevLife) ? prevLife[key] : life;
    }
    _bkt.haz = hazLife.current; // the seeding replaced the object above; keep the bucket pointing at the live one
    // Pre-roll this level's not-yet-taken pedestals so each shows its item immediately (not the
    // "no match" placeholder) the first time it's on screen — rooms included, since this runs on
    // every level swap. Already-rolled or spent pedestals in the bucket are left as they are.
    if (lv.markers) for (const _mk in lv.markers) { const _pm = lv.markers[_mk]; if (_pm && _pm.kind === "pedestal" && pedestalRolls.current[_mk] === undefined && !pedestalDepleted.current.has(_mk)) pedestalRolls.current[_mk] = rollPedestalItem(allAssets, _pm.cats, _pm.logic); }
    // A hazard cell is still burning if it's permanent (never entered the ref) or its countdown
    // hasn't hit zero. Shared by the damage sampler and the visual, so they can't disagree.
    const hazardAlive = (key) => !(key in hazLife.current) || hazLife.current[key] > 0;
    const SPAWN = { x: 60, y: 40 };
    // Precompute solid object footprints (a sized emoji can cover more than its anchor cell).
    // "In front of player" objects are a purely visual overlay (that's the whole point of the
    // 3-state model: Behind / In front / Same-layer-solid) — they must NEVER block movement,
    // no matter what the Solid checkbox says, or you'd be stopped by something that's rendering
    // on top of you, which defeats the entire reason to flag it "in front" in the first place.
    const solidFx = []; for (const k of Object.keys(lv.fx || {})) { const [r, c] = k.split(",").map(Number); for (const o of (lv.fx[k] || [])) if (o.solid) { const fp = levelObjectFootprint(o, o.kind === "prop" ? findA(o.propId) : null); solidFx.push({ r, c, rows: fp.rows, cols: fp.cols }); } }
    const fxBlocks = (r, c) => solidFx.some((o) => r >= o.r && r < o.r + o.rows && c >= o.c && c < o.c + o.cols);
    const cellsHit = (x, y, pw, ph) => { const hits = []; const c0 = Math.floor(x / CW), c1 = Math.floor((x + pw - 0.001) / CW), r0 = Math.floor(y / CH), r1 = Math.floor((y + ph - 0.001) / CH); for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { if (c < 0 || c >= lv.cols || r < 0 || r >= lv.rows) continue; const cell = lv.fg[cellKey(r, c)]; if (fgSolid(cell) || fxBlocks(r, c)) hits.push({ r, c }); } return hits; };
    let lastPedestalKey = null;
    let lastDoorKey = null;
    let raf;
    // Frame-rate independence: every increment below was originally a fixed amount PER RENDERED
    // FRAME, tuned assuming 60fps — so whenever the browser throttled requestAnimationFrame
    // (background tab, GPU load, battery saver, sandbox overhead), move speed, fall speed, and
    // every timer all slowed down by exactly the same factor, simultaneously. dtMul rescales each
    // frame's increments by how much real time actually passed (1.0 at a true 60fps frame),
    // clamped so a huge hitch (tab switch, GC pause) can't teleport the player through walls.
    let lastT = null;
    const myGen = ++__ptLoopGen; // this run is now the authoritative loop
    const loop = () => {
      if (myGen !== __ptLoopGen) return; // a newer loop exists — stop; don't touch player or reschedule
      const p = player.current, RK = keys.current;
      // RK is the raw key state (move keys and aim keys tracked separately). K is the merged
      // "intent" the rest of the loop reads, via mergeInputIntent — so none of the movement/
      // climb/fire code below had to change when WASD/arrows were split apart.
      const K = mergeInputIntent(RK);
      const nowT = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
      const dtMul = lastT == null ? 1 : Math.min(3, Math.max(0.25, (nowT - lastT) / (1000 / 60)));
      lastT = nowT;
      // Temporary stat boosts from consumed items: expire by wall-clock, then layer what's still
      // active onto the player's base stats. Every stat read below (speed/agility/strength/int)
      // goes through pstats, so a boost fades on its own the moment its timer runs out — no re-key.
      itemBuffs.current = pruneBuffs(itemBuffs.current, nowT);
      const buffSum = activeBuffSum(itemBuffs.current, nowT);
      const pstats = {
        speed: (playerAsset?.stats?.speed ?? 5) + (buffSum.speed || 0),
        agility: (playerAsset?.stats?.agility ?? 5) + (buffSum.agility || 0),
        strength: (playerAsset?.stats?.strength ?? 5) + (buffSum.strength || 0),
        intelligence: (playerAsset?.stats?.intelligence ?? 5) + (buffSum.intelligence || 0),
      };
      // Reload speed rides Intelligence (reloadIntelligenceMultiplier), so it is resolved HERE off
      // live pstats rather than once at loop setup — a worn or picked-up Int boost then affects the
      // very next reload instead of only the next playtest.
      const reloadFrames = weaponReloadFrames(playtestWeapon?.reloadTime, pstats.intelligence);

      // Door transition: controls frozen, character's back to camera, then the level swaps.
      if (p.transitioning) {
        p.transitioning.t += dtMul;
        if (p.transitioning.t >= 30) {
          const tr = p.transitioning;
          p.transitioning = null; p.climbing = false; p.crouch = false; p.vy = 0;
          // No state is cleared here — each level/room keeps its own PERSISTENT bucket (roomState),
          // repointed at the top of the effect, so a level remembers what you did and a room you
          // re-enter is the same room in the same state. Worn gear and item buffs travel with you.
          setDoorPrompt(null); setPedPrompt(null);
          if (tr.mode === "enter") {
            const room = (levelLib || []).find((l) => l.id === tr.roomId);
            if (room) {
              roomReturn.current = { level: JSON.parse(JSON.stringify(lv)), x: tr.retX, y: tr.retY };
              spawnReq.current = { roomDoor: true };        // appear at the room's own door
              setLevel(JSON.parse(JSON.stringify(room)));   // swaps the active level — the loop effect re-runs with the room
              return;                                       // a fresh loop takes over; don't schedule another frame here
            }
          } else if (tr.mode === "exit") {
            const back = roomReturn.current; roomReturn.current = null;
            if (back && back.level) { spawnReq.current = { x: back.x, y: back.y }; setLevel(back.level); return; }
            spawnReq.current = { gate: true };
          }
        }
        setPframe((f) => (f + 1) % 1000000);
        raf = requestAnimationFrame(loop);
        return;
      }

      const wasCrouch = p.crouch;
      const crouch = resolvePlayerCrouch(K.crouch, p.onGround, wasCrouch);
      const oldPh = wasCrouch ? CH * PLAYER_CROUCH_H_CELLS : CH * PLAYER_H_CELLS;
      const pw = CW * PLAYER_RENDER_W_CELLS * bodyShape.fraction, ph = crouch ? CH * PLAYER_CROUCH_H_CELLS : CH * PLAYER_H_CELLS;
      if (ph !== oldPh) p.y += (oldPh - ph); // keep the feet planted — only the head should move when crouch toggles
      p.crouch = crouch;
      // One-shot spawn placement (start of test, or the moment a room/level loads). Uses the real
      // player size so nothing clips. Gate = enter through a connector (top-left first); roomDoor =
      // appear at this room's door; {x,y} = the exact door you came back out to.
      if (spawnReq.current) {
        const sr = spawnReq.current; spawnReq.current = null;
        const maxX = lv.cols * CW - pw, maxY = lv.rows * CH - ph;
        if (sr.x !== undefined) { p.x = sr.x; p.y = sr.y; }
        else if (sr.roomDoor) { const dk = firstDoorKey(lv.markers); if (dk) { const [dr, dc] = dk.split(",").map(Number); p.x = dc * CW + CW / 2 - pw / 2; p.y = dr * CH + CH - ph; } else { p.x = SPAWN.x; p.y = SPAWN.y; } }
        else if (sr.gate) { const gk = preferredOpenGate(lv.conns); if (gk) { const gp = CONN_POS[gk]; p.x = (gp.x / 100) * lv.cols * CW - pw / 2; p.y = (gp.y / 100) * lv.rows * CH - ph * 0.5; } else { p.x = SPAWN.x; p.y = SPAWN.y; } }
        p.x = Math.max(0, Math.min(maxX, p.x)); p.y = Math.max(0, Math.min(maxY, p.y));
        // Spawn safety: never start with the body inside solid. A room door at the map edge, or a
        // wide body in a tight room, can land the box in fill — which the wall pass would then read
        // as an inverted teleport. If embedded, hop to the nearest clear box position (scanning a
        // small neighbourhood, preferring the same height) so the player can actually move.
        if (cellsHit(p.x, p.y, pw, ph).length) { let best = null, bestD = Infinity; for (let dyc = 0; dyc <= 6; dyc++) for (let dxc = -6; dxc <= 6; dxc++) { const tx = Math.max(0, Math.min(maxX, p.x + dxc * CW)), ty = Math.max(0, Math.min(maxY, p.y - dyc * CH)); if (!cellsHit(tx, ty, pw, ph).length) { const d = dxc * dxc + dyc * dyc * 4; if (d < bestD) { bestD = d; best = { x: tx, y: ty }; } } } if (best) { p.x = best.x; p.y = best.y; } }
        p.vx = 0; p.vy = 0; p.wasInteract = true; // swallow the E that opened the door so you don't instantly step back through
      }
      // Speed: linear, anchored so Speed 5 (baseline) is a plain 1× — same convention every
      // other stat in the game uses. Speed 1 sits at 0.6× (40% below baseline, not 40% below
      // whatever a broken formula used to produce), Speed 10 at 1.5×. Low stat now genuinely
      // means slow, high stat genuinely means fast — the previous version floored EVERY stat
      // value at 2× base and only went up from there, so even Speed 1 was already faster than
      // an unscaled character, which is what "sends you to the moon" was actually describing.
      const speedStat = Math.min(10, Math.max(1, pstats.speed));
      const speedMul = 0.6 + (speedStat - 1) * 0.1;
      const speed = (crouch ? 3.5 : 7) * speedMul * dtMul; // px per 60fps-frame — dtMul makes this real-time, not per-rendered-frame
      // Jump height is specified directly in BLOCKS, not as a multiplier: 1 block at Agility 1,
      // rising half a block per point (1.5 at 2, 2 at 3, ... 3 at baseline 5, 5.5 at 10).
      // Converted to launch velocity via h = v²/2g (inverted: v = √(2gh)) so a stated block
      // height actually lands at that height under this game's real gravity, rather than
      // guessing at a velocity multiplier and hoping the height comes out reasonable — which is
      // exactly how the last version ended up sending Agility 1 to the moon: a "2×" velocity
      // multiplier sounds modest, but height scales with velocity SQUARED, and the unscaled
      // base velocity (18) already produced a ~31-block jump on its own.
      const agilityStat = Math.min(10, Math.max(1, pstats.agility));
      const jumpHeightBlocks = 0.5 * agilityStat + 0.5;
      const jumpV = Math.sqrt(2 * 0.175 * jumpHeightBlocks * CH);
      const jumpVMulRel = jumpV / Math.sqrt(2 * 0.175 * 3 * CH); // same relative scaling (1.0× at baseline Agility 5), reused below for the double-jump effect's own configurable height
      let dx = 0;
      const grounded = p.onGround || p.climbing;
      if (K.left) p.face = -1; if (K.right) p.face = 1; // facing follows movement, even mid-air
      // Aiming left/right also turns you — so you can stand still and point the other way to
      // shoot without having to walk. Movement keys win if both are held (you face where you go).
      if (!K.left && !K.right) { if (K.aimLeft) p.face = -1; else if (K.aimRight) p.face = 1; }
      const glideMove = glideState(glideEffect, K, p.onGround, p.climbing, p.vy);
      dx = horizVel(K, speed, grounded, p.vx, glideMove, slideResolved, dtMul);
      if (!grounded && !(glideMove && glideMove.active)) dx = capAirborneSpeed(dx, speed);
      // Ramp feel: last frame's slope check set p.onSlope/p.slideVx. Standing on a ramp with
      // nothing held SLIDES you downhill — so dropping or jumping onto a ramp turns into a slide
      // the moment the surface catches you — walking DOWN gets the slide added on top, and
      // walking UP fights gravity: your walk wins, but at half speed (SLOPE_UP_MUL). Slide is
      // dtMul-scaled like every other movement, so it's real-time, not per-rendered-frame.
      let uphillSlideVx = null; // slide+uphill: un-halved velocity to keep as momentum (see below)
      if (p.onGround && p.onSlope) {
        const walkingUphill = dx !== 0 && Math.sign(dx) === p.slopeDir;
        if (walkingUphill) {
          // With a Slide item worn (socks/skates), ground movement is momentum-based: horizVel
          // eases p.vx toward the key target and the result is stored back into p.vx below. The
          // uphill multiplier used to scale dx AFTER that easing and the HALVED value got stored
          // as the new momentum — so next frame halved it again, compounding to a crawl (~9% of
          // walk speed with grip 0.1, not the intended 50%). Remember the pre-slope velocity and
          // store THAT as momentum instead: the slope then scales your movement every frame
          // exactly once, matching how it behaves without a slide item.
          if (slideResolved) uphillSlideVx = dx;
          dx *= SLOPE_UP_MUL;
        } else {
          const slopeBoost = slideResolved ? slideResolved.slope : 1;
          dx += (p.slideVx || 0) * dtMul * slopeBoost;
          // With Slide equipped the loop carries p.vx frame-to-frame, so an uncapped downhill push
          // would compound into a runaway fling. Cap the downhill glide at a terminal speed.
          if (slideResolved) { const cap = SLOPE_SLIDE_SPEED * slopeBoost * 2 * dtMul; if (Math.abs(dx) > cap) dx = Math.sign(dx) * cap; }
        }
      }
      if (grounded) p.vx = uphillSlideVx !== null ? uphillSlideVx : dx; // remember momentum to carry into the air; air frames keep it, keys don't steer (uphill+slide keeps the PRE-slope velocity — see the walkingUphill comment)
      else if (glideEffect && p.vy > 0 && K.jump && !p.climbing) p.vx = dx; // while gliding, the steered velocity BECOMES your momentum, so it carries if you stop steering or the glide ends
      const prevX = p.x;
      p.x += dx; if (p.x < 0) p.x = 0; if (p.x > lv.cols * CW - pw) p.x = lv.cols * CW - pw;
      let hits = cellsHit(p.x, p.y, pw, ph);
      // Hill suppression (splitHillHits): blocking cells that belong to a RAMP FORMATION and sit
      // near foot level are handed to the slope-surface pass below instead of being treated as
      // walls here. The hitbox is ~4.6 cells wide, so its leading edge pokes into a hill's solid
      // backing / plateau lip a column or two before the player's CENTER (where the surface is
      // sampled) gets there — step-snapping onto that backing is exactly what made every ramp
      // act like stairs (the teleport up each tier), and wall-clamping against it is what made
      // ramps impossible to walk up at all. Cells more than ~2.5 cells above the feet still
      // count as walls, so a real wall next to a ramp still blocks you at chest height.
      let wallHits = splitHillHits(lv, hits, p.y + ph, CH).walls;
      // Step-assist: a single-cell-tall lip (a genuine stair) is walked over, not blocked. Snap
      // up to exactly the blocking row's top, capped at one cell, and only if the raised spot is
      // actually clear. Skipped while climbing a ladder. The PHYSICS snap stays instant (so
      // collision is always exact) but the RENDER eases up over a few frames via p.stepEase —
      // the old same-frame visual jump was the "jarring teleport up one block".
      if (shouldStepAssist(wallHits.length, dx, p.climbing, p.onSlope)) {
        const targetY = Math.min(...wallHits.map((h) => h.r * CH)) - ph;
        const rise = p.y - targetY;
        if (rise > 0 && rise <= CH && cellsHit(p.x, targetY, pw, ph).length === 0) { p.y = targetY; p.stepEase = Math.min(CH, (p.stepEase || 0) + rise); wallHits = []; }
      }
      // Anything still solid after step-assist is a real wall (taller than one cell) — clamp to
      // it. Ramp surfaces never appear here at all (fgIsSlope cells aren't solid), and hill
      // backing / plateau lips were filtered above; only genuine walls block sideways movement.
      // Only clamp against walls this move NEWLY entered — never against solid the player was
      // already overlapping. Without this, standing inside/against a solid mass (a too-narrow room
      // channel, or a spawn that lands in fill) snapped the player to the FAR edge of that mass, so
      // "press right" threw you to the left wall and vice-versa, teleport-fast (the room bug). A
      // genuinely new wall ahead still blocks normally, and it lets an embedded player walk OUT
      // toward open space instead of being flung.
      const preWallKeys = new Set(cellsHit(prevX, p.y, pw, ph).map((h) => h.r + "," + h.c));
      const newWalls = wallHits.filter((h) => !preWallKeys.has(h.r + "," + h.c));
      if (newWalls.length) { if (dx > 0) { p.x = Math.min(...newWalls.map((h) => h.c * CW)) - pw; p.vx = 0; } else if (dx < 0) { p.x = Math.max(...newWalls.map((h) => (h.c + 1) * CW)); p.vx = 0; } }

      // "climbJump" suppresses ladder re-grab while ascending after jumping off one —
      // without it, the very next frame would see you still overlapping the climb zone
      // and zero your jump velocity. Clears at the apex (vy >= 0) or once clear of the zone.
      // resolveClimbKind (not raw box-overlap climbKindAt): ladder grip needs the player's
      // CENTER near the ladder column, and a valid bars/cliff grip wins over the ladder while
      // heading up — see resolveClimbKind's own comment for both fixes.
      const climbKindHere = resolveClimbKind(lv, p.x, p.y, pw, ph, CW, CH, !!K.up, p.climbKind);
      const overlapClimb = !!climbKindHere;
      if (p.climbJump && (p.vy >= 0 || !overlapClimb)) p.climbJump = false;
      // Which climb this jump came off, kept ONLY so the art can hold the climbing pose through
      // the leap (playerPoseKey). Deliberately not climbJump itself: that also clears the instant
      // you drift clear of the climb cells, so pushing off sideways would snap your back away one
      // or two frames into the jump. This lasts the whole rise and clears at the apex.
      if (p.climbJumpKind && p.vy >= 0) p.climbJumpKind = null;
      if (p.dropCooldown > 0) p.dropCooldown -= dtMul;
      if (p.invuln > 0) p.invuln -= dtMul;
      p.stepEase = easeStep(p.stepEase, dtMul); // step-assist smoothing: the DRAWN player eases up to the physics position instead of teleporting (see the player style)
      // Weapon timers advance in real time like everything else (dtMul), so fire rate and reload
      // length don't quietly change with the frame rate. R reloads early; a partly-spent clip is
      // topped straight back up to full (no "keep the loose round" bookkeeping).
      //
      // AUTOMATIC RELOAD. Emptying the clip now starts the reload by itself, on the very next
      // frame, instead of waiting for an input edge — running dry used to leave the gun sitting
      // there doing nothing until you noticed and pressed R (or pulled the trigger on an empty
      // chamber), which just reads as the weapon having broken. This is the same rule enemies have
      // always played by (advanceAutoReloadWeapon in the enemy loop), so both sides now behave
      // alike. Neither manual path is removed: R still reloads a PARTLY spent clip early, which
      // auto-reload never does, and the fire-on-empty branch below still stands (it just becomes a
      // no-op, since startReload leaves a reload already in progress alone).
      wpn.current = advanceAutoReloadWeapon(wpn.current, dtMul, reloadFrames);
      // Throwing (G) — hold-to-aim, release-to-throw. Holding G "grabs" the throwable
      // (p.throwAiming drives the dotted trajectory preview in the render section, simulated
      // with throwTrajectoryPoints from the exact same launch numbers used below); letting go
      // of G is what actually throws it. Launch velocity comes from the throwable's own weight
      // vs the player's Strength (throwRangeBlocks -> throwLaunchVel), thrown the way you face
      // and slightly upward for a natural arc. Decrements the single-use carry count. The throw
      // plays the arm swing: it rides the same p.firing channel the melee swing render already
      // uses (hitRegistered is pre-set so a bare-handed swing can't also land a punch).
      if (throwCd.current > 0) throwCd.current -= dtMul;
      const canThrowNow = carriedThrow && throwCarry.current > 0 && throwCd.current <= 0 && !p.transitioning;
      p.throwAiming = !!(K.throw && canThrowNow);
      if (!K.throw && p.wasThrow && canThrowNow) {
        const strength = pstats.strength;
        const rangeBlocks = throwRangeBlocks(strength, carriedThrow.weight);
        const { vx, vy } = throwLaunchVel(rangeBlocks * CW, 0.175, p.face, Math.PI / 4);
        const artPieces = bake({ ...carriedThrow, angles: (carriedThrow.states?.rest || carriedThrow.angles || blankAngles()) }, "side");
        // prepFlyingArt: pieces re-centered in the design canvas + the container sized as the
        // FULL canvas at world scale — see its comment; this is the actual fix for the grenade
        // rendering ~1px (art-bbox-sized containers shrank canvas-percentage-positioned pieces
        // a second time).
        const fly = prepFlyingArt(artPieces, CW, 1);
        thrown.current.push({
          x: p.x + pw / 2, y: p.y + ph * 0.4, vx, vy, rot: 0,
          spin: (p.face || 1) * 8, asset: carriedThrow, pieces: fly.pieces.length ? fly.pieces : null,
          cwPx: fly.canvasWPx, chPx: fly.canvasHPx, wPx: fly.wPx, hPx: fly.hPx,
        });
        throwCarry.current -= 1;
        throwCd.current = 18; // ~0.3s between throws so mashing G doesn't dump the whole stash at once
        p.firing = { t: 0, dur: 12 };  // the throwing arm swing — same 3-phase motion as a melee swing
        p.throwFiring = 12;            // frames the throwable shows its FIRE pose in-hand after release (counts down)
        p.hitRegistered = true;        // ...but it must never double as a bare-handed punch hit
        flash("💣 Thrown — " + throwCarry.current + " left");
      }
      p.wasThrow = !!K.throw;
      // Clamped at 0, NOT just guarded by "> 0": dtMul is fractional, so a bare decrement
      // overshoots to a small negative (e.g. 0.4 - 1.02) and then the guard freezes it there
      // forever. A stuck negative is still TRUTHY, which pinned the throwable in hand and
      // suppressed the equipped-weapon render for the rest of the run.
      if (p.throwFiring > 0) p.throwFiring = Math.max(0, p.throwFiring - dtMul);
      // Finite fires burn down in real time (dtMul/60 sec per frame). A cell that reaches 0 stops
      // dealing damage and stops rendering — it's "gone out" — without ever touching the saved
      // level, so leaving Playtest brings every fire back exactly as painted.
      for (const key in hazLife.current) { if (hazLife.current[key] > 0) hazLife.current[key] = Math.max(0, hazLife.current[key] - dtMul / 60); }
      if (K.reload) wpn.current = startReload(wpn.current, reloadFrames);
      p.reloading = wpn.current.reloadT > 0;
      // A ladder must be OPTED INTO with ↑/↓ (then stays grabbed while you're on it) — mere
      // overlap used to auto-grab, so simply walking past a ladder planted on the ground froze
      // you mid-stride (vy=0, hanging) against whatever solid sat behind it: an invisible wall.
      // Bars/cliff grabs stay automatic — they're overhead hangs you can only reach on purpose.
      // ...but a player who just PUSHED OFF a climb and is still in that jump counts as opting in.
      // The opt-in rule exists for one case only: walking past a ladder planted on the ground must
      // not grab you. Someone who jumped off a powerline strung across a ladder is not walking
      // past anything — they are visibly going up. Without this you had to be HOLDING ↑ at the
      // apex to catch the ladder above the ledge, so the natural "press Space, then press up"
      // wasted the whole jump and dropped you back onto the same ledge: the two-jumps-per-ledge
      // bug. climbJumpGrab lasts until you land or grab something, and only ever unlocks LADDERS
      // (bars/cliff grabs were always automatic), so nothing else changes.
      const wantsLadder = p.climbing || K.up || K.down || p.climbJumpGrab;
      let climbing = overlapClimb && !p.climbJump && p.dropCooldown <= 0 && (climbKindHere !== "ladder" || wantsLadder);
      // Bars/cliff: no grabbing one from above it (see canGripClimb). Falling back down onto the
      // bar re-grabs on the first frame the grip point is level with it again, so this reads as
      // "you can hang, you can drop, you can shimmy — you cannot get on top of it."
      if (climbing && !canGripClimb(lv, p.x, p.y, pw, ph, CW, CH, climbKindHere)) climbing = false;
      if (climbing && K.jump) { p.climbJump = true; p.climbJumpKind = climbKindHere; p.climbJumpGrab = true; climbing = false; p.vy = -jumpV; p.onGround = false; p.jumpHoldT = 0; } // jump straight off — same agility-scaled jump height as a ground jump; climbJumpKind keeps the climbing pose on screen through the rise, climbJumpGrab lets the ladder above catch you without holding ↑
      let climbMove = 0;
      if (climbing && climbKindHere === "ladder") {
        if (K.up) {
          // Climbing above the top of the climb zone used to exit it, flip to the falling
          // pose, drift back down into the zone, and repeat — a visible flicker. Instead,
          // take the full step only if it stays on the ladder; otherwise inch up to the
          // exact top and pin there. Space (jump) is how you leave from the top.
          const climbStep = CLIMB_SPEED * dtMul;
          if (isOnClimb(lv, p.x, p.y - climbStep, pw, ph, CW, CH)) { p.y -= climbStep; climbMove = climbStep; }
          else { let moved = 0; while (moved < climbStep && isOnClimb(lv, p.x, p.y - 1, pw, ph, CW, CH)) { p.y -= 1; moved++; } climbMove = moved; }
        } else if (K.down) {
          const climbStep = CLIMB_SPEED * dtMul;
          const below = cellsHit(p.x, p.y + climbStep, pw, ph);
          if (below.length) { /* solid floor at the ladder's foot: stop here, don't descend INTO the map */ }
          else if (isOnClimb(lv, p.x, p.y + climbStep, pw, ph, CW, CH)) { p.y += climbStep; climbMove = climbStep; } // still on the ladder
          else { climbing = false; p.dropCooldown = 8; } // stepped off the bottom into open air: let go and fall normally (never clip through)
        }
        p.vy = 0; p.onGround = false;
      } else if (climbing && K.down) {
        // Monkey bars / cliff ledge: ↓ lets go. A short, deterministic cooldown (not a velocity
        // check) so the very next frame's still-overlapping bar cell can't instantly re-grab you
        // before gravity has actually carried you clear of it.
        climbing = false; p.dropCooldown = 15;
        p.vy = Math.min(60, p.vy + 0.175 * dtMul); p.y += p.vy * dtMul; p.onGround = false;
      } else if (climbing) {
        // Hanging from monkey bars or a cliff ledge — arms up, feet dangling, no vertical climb.
        // Left/right is already handled above like normal walking (dx), so nothing more to do
        // here beyond killing gravity for as long as the grip holds.
        p.vy = 0; p.onGround = false;
      } else {
        if (K.jump && p.onGround) { p.vy = -jumpV; p.onGround = false; p.jumpHoldT = 0; } // Agility-scaled jump HEIGHT, given directly in blocks — see jumpHeightBlocks above
        else if (doubleJumpEffect && !p.onGround && !p.extraJumped && K.jump && !p.wasJump) {
          // Double Jump effect: one bonus mid-air jump, available once per airborne period —
          // however you got airborne, not just off an actual jump. Edge-triggered off wasJump so
          // holding the key through the whole first jump's rise can't silently consume it the
          // instant onGround drops. Height reuses the same agility scaling as the base jump;
          // Speed instead scales gravity ONLY for the duration of this specific jump (rise AND
          // fall) — it never touches normal fall/single-jump feel, and reverts the moment
          // extraJumped clears on landing.
          p.vy = -(doubleJumpEffect.height ?? 9) * jumpVMulRel;
          p.extraJumped = true;
          p.jumpHoldT = 0;
          const djSpeed = doubleJumpEffect.speed ?? 5;
          p.djGravMul = Math.max(0.4, djSpeed / 5);
          p.effectAnim = (doubleJumpEffect.frames && doubleJumpEffect.frames.length)
            ? { slot: doubleJumpEffect.slot, frames: doubleJumpEffect.frames, t: 0, frameDur: Math.max(2, Math.round(14 - djSpeed)), oneShot: true }
            : null;
        }
        const djActive = p.extraJumped && p.djGravMul !== 1;
        // Glide: while airborne, falling, and holding Jump with a glide cape, gravity is scaled
        // down (a gentle descent). Resolved fresh here off this frame's live vy so it engages the
        // moment you start falling and drops the instant you let go of Jump or touch down. It
        // never applies during the rise, so it can't turn a jump into a float upward.
        const glide = glideState(glideEffect, K, p.onGround, climbing, p.vy);
        const wasGliding = p.gliding;
        p.gliding = !!(glide && glide.active);
        // Play the glide cape's own Side animation while gliding — reusing the same effectAnim
        // channel Double Jump uses, so the render swap needs no new code. Started when the glide
        // begins and looped (frameDur small, index wraps in the renderer via modulo below), and
        // handed back to null the moment gliding stops so the normal look returns. Guarded so it
        // doesn't stomp an active double-jump animation that's still playing.
        if (p.gliding && !wasGliding && glideEffect && glideEffect.frames && glideEffect.frames.length && !(p.effectAnim && p.effectAnim.oneShot)) {
          p.effectAnim = { slot: glideEffect.slot, frames: glideEffect.frames, t: 0, frameDur: 6, loop: true };
        } else if (!p.gliding && p.effectAnim && p.effectAnim.loop) {
          p.effectAnim = null;
        }
        const gravMul = p.gliding ? glide.fall : (djActive ? p.djGravMul : 1);
        // Above baseline Agility (5), holding Jump through the rise adds extra height on top —
        // a separate reward for higher agility beyond the taller base jump it already gets.
        // Capped in duration (not just by leaving the ground) so it's a short assist right at
        // takeoff, not an unlimited hover the whole time the key is held.
        if (p.vy < 0 && K.jump && agilityStat > 5 && (p.jumpHoldT || 0) < JUMP_HOLD_BOOST_FRAMES) {
          p.vy -= (agilityStat - 5) * JUMP_HOLD_BOOST_ACCEL * dtMul;
          p.jumpHoldT = (p.jumpHoldT || 0) + dtMul;
        }
        p.vy = Math.min(60, p.vy + 0.175 * dtMul * gravMul); p.y += p.vy * dtMul; p.onGround = false;
      }
      p.climbing = climbing;
      p.climbKind = climbing ? climbKindHere : null;
      // The climb-jump's ladder unlock is spent the moment it does its job (you caught something)
      // or the moment the jump is over (you landed). It must not survive into the next jump, or a
      // plain ground jump near a ladder would start grabbing it without you asking.
      if (p.climbJumpGrab && (climbing || p.onGround)) p.climbJumpGrab = false;
      p.wasJump = !!K.jump;
      if (p.effectAnim) p.effectAnim.t += dtMul;

      // Live aim tracking — a projectile weapon lets ↑/↓ preview the shot's angle before you
      // ever pull the trigger, not just snapshot it at the instant of firing. Climbing already
      // owns ↑/↓ for movement, so aiming is suppressed there. Drops back to neutral (0) the
      // instant nothing is held, so releasing both keys always means "aim straight ahead".
      // Reloading LOWERS the weapon: dropping p.aiming here is what does it — the aim branch in
      // the renderer is the only thing that lifts the arm from its resting hang, so suppressing
      // it puts the arm (and the weapon rigidly gripped in it) back down at the player's side
      // for the whole reload, and blocks the dedicated Aim-up pose too.
      // Aim is driven by the ARROW keys only now (up/down), so climbing a ladder with W/S no
      // longer forces the gun to point up or down. Suppressed while climbing or reloading.
      p.aiming = armHoldsAimPose(playtestWeapon && isRanged(playtestWeapon.wtype), climbing, K.fire, K.aimUp, K.aimDown, p.firing);
      p.aimDir = p.aiming ? (K.aimUp ? -1 : K.aimDown ? 1 : 0) : 0;

      // --- Ground: ramps first, flat solids second -------------------------------------------
      // Ramps own the centre column whenever a surface is in reach. Flat block landing must NOT
      // run first — that was the stair-step / teleport bug: centerHits included hill backing cells
      // in the centre column and snapped the player to the plateau lip before the ramp pass ran.
      p.onSlope = false; p.slopeDir = 0; p.slopeRun = 0;
      if (!climbing) {
        const feetBottom = p.y + ph;
        const slopeHit = slopeSurfaceForPlayer(lv, p.x + pw / 2, p.y, feetBottom, p.vy, dx, dtMul, CW, CH);
        if (slopeHit) {
          const surfY = slopeHit.y - ph;
          const headTestH = Math.max(1, ph - CH);
          // Only GENUINE walls/roofs may veto or shorten the snap. The raw box scan also catches
          // the hill's own solid backing (a wide hitbox straddles the next stair step at chest
          // height while climbing) — treating that as a "ceiling" shoved the head to its underside:
          // a ~7-cell downward teleport into the floor whose ejection then hurled the player back
          // to the bottom of the ramp. splitHillHits (same idiom as the flat-landing pass) keeps
          // real roofs blocking while the formation's own backing is ignored.
          const above = splitHillHits(lv, cellsHit(p.x, surfY, pw, headTestH), slopeHit.y, CH).walls;
          if (above.length) {
            const ceilBottom = Math.max(...above.map((h) => (h.r + 1) * CH));
            if (ceilBottom > surfY) { p.y = ceilBottom; p.vy = 0; }
            else { p.y = surfY; p.vy = 0; }
          } else { p.y = surfY; p.vy = 0; }
          p.onGround = true; p.onSlope = true; p.slopeDir = slopeHit.dir; p.slopeRun = slopeHit.run;
        }
      }
      hits = cellsHit(p.x, p.y, pw, ph);
      if (hits.length) {
        if (p.vy > 0 && !p.onSlope) {
          // Flat landing only when the ramp pass didn't catch us. Centre-column hits must still
          // exclude hill backing while falling toward a ramp face — otherwise the wide hitbox's
          // centre sits over solid fill under the ramp and you land on the stair-step lip.
          // Once ON the plateau (feet near the hill top), hill cells in the centre column ARE
          // valid floor so walking off the top of a ramp doesn't drop you through.
          const centerCol = Math.floor((p.x + pw / 2) / CW);
          const centerHits = hits.filter((h) => h.c === centerCol);
          const centerSplit = splitHillHits(lv, centerHits, p.y + ph, CH);
          let landHits = centerSplit.walls;
          if (!landHits.length && centerSplit.hill.length) {
            const hillTop = Math.min(...centerSplit.hill.map((h) => h.r * CH));
            const feetBottom = p.y + ph;
            if (feetBottom >= hillTop - CH && feetBottom <= hillTop + CH * 0.5) landHits = centerSplit.hill;
          }
          if (!landHits.length) landHits = splitHillHits(lv, hits, p.y + ph, CH).walls;
          // A landing may only bring the feet DOWN onto a surface at/below them, never snap them
          // UP. Without this, jumping while your head is inside an overhang (the ramp tops out
          // under the fire platform) let the highest overlapping cell — the platform above your
          // head — become the floor, teleporting you onto its top. Cells whose top sits above the
          // feet are ceilings, not floors; drop them so the platform blocks from below instead.
          const feetNow = p.y + ph;
          landHits = landHits.filter((h) => h.r * CH >= feetNow - CH * 0.5);
          if (landHits.length) { p.y = Math.min(...landHits.map((h) => h.r * CH)) - ph; p.vy = 0; p.onGround = true; }
        }
        else if (p.vy < 0) {
          // Ceiling: cap the head at the underside of a solid the head actually rose INTO this
          // frame (ceilingBonkRows — see its comment for the jump-up-a-hill teleport this kills).
          // Sampled at the player's horizontal center so a wide hitbox straddling a staircase
          // doesn't grab the next tier over. Kills upward velocity — no teleport.
          const centerC = Math.floor((p.x + pw / 2) / CW);
          const ceilRows = ceilingBonkRows(lv, centerC, p.y, ph, p.vy, dtMul, CW, CH);
          if (ceilRows.length) { p.y = Math.max(...ceilRows.map((r) => (r + 1) * CH)); p.vy = 0; }
        }
      }
      // Auto-slide down a ramp: Slide footwear coasts on any slope; ordinary footwear grips a
      // gentle incline and only gives way on a steep 1:1 or 1:2 hill. You can still walk uphill
      // against either slide. Rather than hacking position here
      // (which fought the snap and teleported the player at the ramp/plateau seam), the slide is
      // expressed as a horizontal VELOCITY that gets spent through the SAME movement+snap path at
      // the top of next frame. Downhill for a dir=+1 ramp (rises L→R) is left (−x); dir=−1 is right.
      if (p.onSlope && !climbing) {
        const downhill = -p.slopeDir;
        const walkingUphill = (dx !== 0 && Math.sign(dx) === -downhill);
        p.sliding = slopeShouldAutoSlide(p.slopeRun, !!slideResolved) && !walkingUphill;
        // Record the slide as this frame's carried horizontal velocity. Next frame, if the player
        // isn't actively walking uphill, horizVel/ground movement uses it; walking uphill zeroes it.
        p.slideVx = p.sliding ? downhill * SLOPE_SLIDE_SPEED : 0;
      } else { p.sliding = false; p.slideVx = 0; }
      if (p.y > lv.rows * CH - ph) { p.y = lv.rows * CH - ph; p.vy = 0; p.onGround = true; }
      if (p.onGround) { p.extraJumped = false; p.effectAnim = null; p.djGravMul = 1; p.jumpHoldT = 0; p.gliding = false; }
      if (climbing) p.gliding = false;
      if (p.y < -200) { p.x = SPAWN.x; p.y = SPAWN.y; p.vy = 0; }

      // Fire hazard: continuous damage-over-time while the player's box overlaps a fire cell.
      // dps is per SECOND, scaled by real elapsed time (dtMul/60), so it's frame-rate independent
      // and can tick fractional HP — a quick dash costs a sliver, lingering melts you. It ignores
      // the post-hit invulnerability window on purpose: that's for discrete enemy hits, whereas
      // fire is meant to be a steady drain the whole time you stand in it. Accumulates into a
      // fractional pool so sub-1-HP ticks aren't rounded away to nothing each frame.
      const pDps = hazardDpsAt(lv, p.x, p.y, pw, ph, CW, CH, hazardAlive);
      if (pDps > 0 && !p.transitioning) {
        p.burnPool = (p.burnPool || 0) + pDps * (dtMul / 60);
        if (p.burnPool >= 1) {
          const loss = Math.floor(p.burnPool); p.burnPool -= loss;
          playerHP.current = Math.max(0, playerHP.current - loss);
          p.onFire = 12; // frames of the "burning" red flicker on the player sprite
          if (playerHP.current <= 0) { flash("🔥 Burned to a crisp — back to the start."); p.x = SPAWN.x; p.y = SPAWN.y; p.vy = 0; playerHP.current = maxPlayerHP(playerAsset); p.burnPool = 0; }
        }
      } else { p.burnPool = 0; }
      if (p.onFire > 0) p.onFire -= dtMul;

      // Walk/climb-cycle phase for limb-flagged pieces — advances with actual movement so
      // animation speed naturally scales with how fast (or slow, e.g. crouched) you're moving.
      p.walking = groundLegsShouldWalk(dx, p.onGround, climbing, p.sliding, K.left || K.right);
      if (p.walking) p.walkPhase = (p.walkPhase || 0) + Math.abs(dx) * 0.03;
      else if (climbing && climbMove) p.walkPhase = (p.walkPhase || 0) + climbMove * 0.03;
      // Hanging is a DANGLE, not a stride: the legs need to keep moving even when you're gripping
      // still, which walkPhase can't do (it only advances with actual movement — hold still on the
      // bars and it freezes). So hanging gets its own phase, advanced by time rather than distance.
      // Reset on release so the next grab starts at sin(0) = 0 — dead centre, no visible snap.
      p.hangPhase = climbing ? (p.hangPhase || 0) + dtMul * HANG_SWAY_SPEED : 0;

      // Enemies: AI movement + gravity + crouch-dodge, all before the hit-tests below so a hit
      // is always checked against this frame's live position, not last frame's. No pathfinding
      // or wall-avoidance yet — Seek/Avoid move in a straight line toward/away from the player,
      // so terrain can still block or trap them; that's a later pass, same as attacks are.
      if (lv.enemies) {
        for (const k of Object.keys(lv.enemies)) {
          if (enemyHP.current[k] !== undefined && enemyHP.current[k] <= 0) {
            // A DEFEATED BODY STILL FALLS. This whole per-enemy block used to be skipped the
            // instant HP hit 0, which froze the corpse at the exact height it died — so anything
            // killed while not standing on solid ground hung in mid-air forever. It reads as a
            // floating dog most often over Front-layer scenery, because Front art is decoration
            // with no collision: the enemy was never resting on it, it was falling THROUGH it, and
            // death stopped the fall mid-frame.
            //
            // Only gravity runs here. No AI, no attacks, no walk cycle, no hazard damage — a
            // corpse just needs to come to rest on the same terrain a living enemy stands on, so
            // this mirrors the living gravity/landing rule below (including the feet-filter that
            // stops a tall body snapping UP onto terrain it merely overlaps). Once landed we set
            // restedDead and stop simulating, so a settled body costs nothing per frame.
            const dep = enemyPos.current[k];
            const dea = findA(lv.enemies[k].enemyId);
            if (dep && dea && !dep.restedDead) {
              const dShape = sideBodyShape(dea);
              const dRenderW = enemyRenderW(dea, CW), dw = dRenderW * dShape.fraction;
              const dh = dep.crouch ? enemyCrouchH(dea, CW) : enemyStandH(dea, CW);
              dep.vy = Math.min(60, (dep.vy || 0) + 0.175 * dtMul);
              dep.y += dep.vy * dtMul;
              const dFeet = dep.y + dh;
              const dFloor = cellsHit(dep.x, dep.y, dw, dh).filter((h) => h.r * CH >= dFeet - CH * 0.5);
              if (dFloor.length && dep.vy > 0) { dep.y = Math.min(...dFloor.map((h) => h.r * CH)) - dh; dep.vy = 0; dep.restedDead = true; }
              if (dep.y > lv.rows * CH - dh) { dep.y = lv.rows * CH - dh; dep.vy = 0; dep.restedDead = true; } // level floor
            }
            continue; // defeated: nothing else about it updates
          }
          const spawn = lv.enemies[k];
          const ea = findA(spawn.enemyId);
          if (!ea) continue;
          const [er, ec] = k.split(",").map(Number);
          const eShape = sideBodyShape(ea);
          const eRenderW = enemyRenderW(ea, CW), epw = eRenderW * eShape.fraction;
          const standEph = enemyStandH(ea, CW), crouchEph = enemyCrouchH(ea, CW);
          const canCrouch = !!(ea.angles && ea.angles.crouch && ea.angles.crouch.length);

          if (!enemyPos.current[k]) {
            const spawnLeft = ec * CW + CW / 2 - epw / 2 - (eShape.centerFrac * eRenderW - epw / 2);
            enemyPos.current[k] = { x: spawnLeft, y: (er + 1) * CH - standEph, vy: 0, onGround: false, face: spawn.facing === 1 ? 1 : -1, crouch: false, crouchT: 0, dodgeRolled: false, willDodge: false, attackT: 0, swingT: 0, reactT: 0, aimHold: 0, walkPhase: 0, walking: false, weaponAmmo: null, reloading: false };
          }
          const ep = enemyPos.current[k];
          const stunned = (ep.stun || 0) > 0; // hit by a stun weapon — frozen: the dodge/face/move/attack gates below all skip it while this lasts
          if (stunned) ep.stun -= dtMul;
          const oldEph = ep.crouch ? crouchEph : standEph;
          const eIntel = ea.stats?.intelligence ?? 5;
          const ew = findA(enemyWeaponIdOf(ea)) || (ea.components && ea.components.weapon) || null; // the weapon this enemy is actually holding — falls back to the look's own embedded copy if the source asset is gone from the library
          const rangedEnemy = !!(ew && isRanged(ew.wtype));
          // Enemies use the same clip and reload-time settings as the gun itself (including any
          // Magazine Size clothing on a dressed enemy). Keep the ammo record on this spawn's live
          // state so leaving/re-entering a room preserves an in-progress reload just like its HP.
          if (rangedEnemy) {
            const enemyClip = effectiveMagazineSize(ew.clipSize, ea.effects);
            if (!ep.weaponAmmo || ep.weaponAmmo.clip !== enemyClip) ep.weaponAmmo = newWeaponAmmo(enemyClip);
            ep.weaponAmmo = advanceAutoReloadWeapon(ep.weaponAmmo, dtMul, weaponReloadFrames(ew.reloadTime, eIntel));
            ep.reloading = ep.weaponAmmo.reloadT > 0;
            if (ep.reloading) { ep.aimHold = 0; ep.swingT = 0; }
          } else {
            ep.weaponAmmo = null;
            ep.reloading = false;
          }
          // A player-based look engages at its WEAPON'S actual swept reach; only drawn
          // enemy-type monsters still use the ⚔️ range number.
          const meleeGeom = enemyMeleeGeom(ea, ew);
          const engageRange = meleeGeom ? enemyMeleeReach(ea, ew, meleeGeom) : enemyAttackRange(ea, ew);

          // Dodging an incoming shot. The enemy picks the move that would actually help — duck
          // under a high shot, hop over a low one (see dodgeMoveFor) — rather than only ever
          // ducking, and only when it CAN: ducking needs a hand-drawn crouch pose, hopping needs
          // to be standing on the ground. Whether it bothers is one roll per incoming shot,
          // straight off Intelligence (enemyDodgeChance).
          {
            const eCenterX = ep.x + epw / 2;
            const feetY = ep.y + (ep.crouch ? crouchEph : standEph);
            const standTop = feetY - standEph;
            const standHitTop = standTop + eShape.topFrac * standEph, standHitH = eShape.heightFrac * standEph;
            let threat = null;
            for (const pr of projectiles.current) {
              if (pr.foe) continue; // an enemy never flinches at its own side's shots
              const approaching = (pr.x < eCenterX && pr.vx > 0) || (pr.x > eCenterX && pr.vx < 0);
              if (!approaching || Math.abs(pr.x - eCenterX) > DODGE_LOOKOUT_RANGE) continue;
              const move = dodgeMoveFor(pr.y, standHitTop, standHitH);
              if (move) { threat = move; break; }
            }
            if (threat && !stunned) {
              // Decide once per threat window, not every frame — otherwise a shot in flight for
              // several frames would get "re-rolled" repeatedly and the intended odds would creep
              // toward near-certain over a long enough approach.
              if (!ep.dodgeRolled) { ep.willDodge = Math.random() < enemyDodgeChance(eIntel); ep.dodgeRolled = true; }
              if (ep.willDodge) {
                if (threat === "crouch" && canCrouch) { ep.crouch = true; ep.crouchT = CROUCH_HOLD_FRAMES; }
                else if (threat === "jump" && ep.onGround && !ep.crouch) { ep.vy = -enemyJumpVelocity(ea.stats?.agility, CH); ep.onGround = false; }
              }
            } else {
              ep.dodgeRolled = false;
              if (ep.crouchT > 0) { ep.crouchT -= dtMul; if (ep.crouchT <= 0) ep.crouch = false; }
            }
            if (!canCrouch) { ep.crouch = false; ep.crouchT = 0; }
          }
          if (stunned) { ep.walking = false; ep.aimHold = 0; } // frozen pose — no walk cycle, no aim tracking
          const newEph = ep.crouch ? crouchEph : standEph;
          if (newEph !== oldEph) ep.y += (oldEph - newEph); // keep feet planted through the height change, same trick the player's own crouch uses

          // AI: Guard holds its spawn point, Seek closes the distance, Avoid keeps away — all
          // gated by a detection range so something across the level doesn't react to a player it
          // can't plausibly have noticed. Seek now stops at its own engagement range rather than
          // burying itself in the player, and backs off if crowded — so an enemy holding a bow
          // stands off and shoots instead of jogging into punching distance (enemyMoveIntent).
          // ep.x is the RENDER-box left; the VISIBLE body sits centerFrac into that box (spawn
          // places it so the visible center lands on the cell). ep.x + epw/2 was ~1.6 cells left
          // of the true body for a typical shape, skewing detection/stand-off asymmetrically.
          const eCenterXNow = ep.x + eShape.centerFrac * eRenderW;
          // Sides. A resurrected unit is friendly and fights FOR you; a normal enemy is hostile; a
          // "Not hostile" NPC is neutral (idles, never fights). Only friendly/hostile units act.
          const side = unitSide(ea, ep);
          const hostile = side === "hostile", friendly = side === "friendly", acts = hostile || friendly;
          // Pick a target on the opposite side. Friendly → nearest hostile (else follow you, no attack).
          // Hostile → nearest of you and your friendlies (a real brawl). Neutral → nothing.
          const unitCenter = (ea2, ep2) => ep2.x + sideBodyShape(ea2).centerFrac * enemyRenderW(ea2, CW);
          const aliveOpposite = (wantFriendly) => {
            const out = [];
            for (const k2 of Object.keys(lv.enemies)) {
              if (k2 === k) continue;
              const ep2 = enemyPos.current[k2]; if (!ep2) continue;
              const ea2 = findA(lv.enemies[k2].enemyId); if (!ea2) continue;
              if (enemyHP.current[k2] !== undefined && enemyHP.current[k2] <= 0) continue; // corpse
              const s2 = unitSide(ea2, ep2);
              if (wantFriendly ? (s2 === "friendly") : (s2 === "hostile")) out.push({ key: k2, cx: unitCenter(ea2, ep2), ea: ea2, ep: ep2 });
            }
            return out;
          };
          let targetKind = null, targetKey = null, targetCX = p.x + pw / 2, targetW = pw, targetEp = null, targetEa = null;
          if (friendly) {
            const near = nearestUnitCX(eCenterXNow, aliveOpposite(false)); // nearest hostile
            if (near) { targetKind = "unit"; targetKey = near.key; targetCX = near.cx; targetEp = near.ep; targetEa = near.ea; targetW = enemyRenderW(near.ea, CW) * sideBodyShape(near.ea).fraction; }
            else { targetKind = "followPlayer"; targetCX = p.x + pw / 2; targetW = pw; } // no enemies left → tag along
          } else if (hostile) {
            const cands = aliveOpposite(true).concat([{ key: null, cx: p.x + pw / 2 }]); // your friendlies + you
            const near = nearestUnitCX(eCenterXNow, cands);
            if (near && near.key) { targetKind = "unit"; targetKey = near.key; targetCX = near.cx; targetEp = near.ep; targetEa = near.ea; targetW = enemyRenderW(near.ea, CW) * sideBodyShape(near.ea).fraction; }
            else { targetKind = "player"; targetCX = p.x + pw / 2; targetW = pw; }
          }
          const distToTarget = targetCX - eCenterXNow;
          const aiSpeed = 2.2 * ((ea.stats?.speed ?? 5) / 5) * dtMul;
          const ai = friendly ? "seek" : (spawn.ai || ea.ai || "guard"); // friendlies always chase their foe; hostiles keep their set behavior
          if (!stunned && acts) ep.face = enemyFaceToward(distToTarget, ep.face);
          // Detection/stealth only matters for a hostile hunting the PLAYER; allies and unit-vs-unit
          // brawls always "see" their target (you can't stealth past a melee your minion started).
          const detected = (hostile && targetKind === "player") ? enemyDetects(distToTarget, ep.face) : acts;
          const gapSigned = (Math.sign(distToTarget) || 1) * boxGap(targetCX, targetW, eCenterXNow, epw);
          const dxMove = (stunned || !acts) ? 0 : enemyMoveIntent(ai, gapSigned, engageRange, aiSpeed, detected);
          ep.face = enemyFaceThisFrame(ep.face, dxMove, enemyAttackCommitted(ep));
          // Walls actually stop enemies now — they used to have NO horizontal collision at all:
          // a Seek enemy walked INTO a wall and the vertical snap then popped it on top, so a
          // chase across any real terrain read as completely broken. A one-cell lip gets the
          // same step-up the player has, so stairs and ledge lips don't dead-end the chase.
          const exBefore = ep.x; // remember where it was, so we can tell if it actually moved (walk cycle)
          if (dxMove) {
            const nx = Math.max(0, Math.min(lv.cols * CW - epw, ep.x + dxMove));
            const eWallHits = cellsHit(nx, ep.y, epw, newEph);
            if (!eWallHits.length) ep.x = nx;
            else {
              const stepY = Math.min(...eWallHits.map((h) => h.r * CH)) - newEph;
              const rise = ep.y - stepY;
              if (rise > 0 && rise <= CH && cellsHit(nx, stepY, epw, newEph).length === 0) { ep.x = nx; ep.y = stepY; }
            }
          }

          // Gravity + ground collision — identical rule to the player's own fall, reusing the
          // same generic cellsHit() so enemies land on and are stopped by the same terrain.
          ep.vy = Math.min(60, ep.vy + 0.175 * dtMul);
          ep.y += ep.vy * dtMul;
          const eHits = cellsHit(ep.x, ep.y, epw, newEph);
          // Land only on a surface AT OR BELOW the feet — never snap UP onto elevated terrain the
          // (now possibly tall, scaled) body merely overlaps. Same feet-filter the player's own
          // landing uses; without it a big enemy near forest canopy floats up onto the leaves.
          const eFeet = ep.y + newEph;
          const eFloor = eHits.filter((h) => h.r * CH >= eFeet - CH * 0.5);
          if (eFloor.length) { if (ep.vy > 0) { ep.y = Math.min(...eFloor.map((h) => h.r * CH)) - newEph; ep.vy = 0; ep.onGround = true; } }
          else { ep.onGround = false; }
          if (ep.y > lv.rows * CH - newEph) { ep.y = lv.rows * CH - newEph; ep.vy = 0; ep.onGround = true; }
          // Walk cycle: advance the enemy's stride by how far it actually moved on the ground this
          // frame, exactly like the player's walkPhase. Enemies had no walk phase at all, so their
          // legs stayed frozen mid-chase. Blocked-by-a-wall (no displacement) reads as not walking.
          const eStep = Math.abs(ep.x - exBefore);
          ep.walking = ep.onGround && eStep > 0.05;
          if (ep.walking) ep.walkPhase = (ep.walkPhase || 0) + eStep * 0.03;

          // Enemies burn in fire the same way the player does — same per-second drain into a
          // per-enemy fractional pool. Fire is universal: it doesn't care whose side you're on.
          const eDps = hazardDpsAt(lv, ep.x, ep.y, epw, newEph, CW, CH, hazardAlive);
          if (eDps > 0) {
            if (enemyHP.current[k] === undefined) enemyHP.current[k] = ea.hp ?? 10;
            ep.burnPool = (ep.burnPool || 0) + eDps * (dtMul / 60);
            if (ep.burnPool >= 1) {
              const loss = Math.floor(ep.burnPool); ep.burnPool -= loss;
              enemyHP.current[k] = Math.max(0, enemyHP.current[k] - loss);
              ep.onFire = 12;
              if (enemyHP.current[k] <= 0) { flash("🔥 " + ea.name + " burned up!"); continue; }
            }
          } else { ep.burnPool = 0; }
          if (ep.onFire > 0) ep.onFire -= dtMul;

          // Attack: independent of AI type — Guard attacks without chasing, Seek/Avoid can also
          // attack mid-chase/retreat. Gated by range (weapon-aware, see enemyAttackRange),
          // roughly standing on the same level (not a floor above/below), a simple line-of-sight
          // check against solid Foreground, and a per-enemy cooldown.
          //
          // NEW: even once all of that lines up, the enemy doesn't strike instantly. It spends a
          // short, randomized wind-up (enemyReactionFrames — long for a dim enemy, near-instant
          // for a clever one) with the target held, and only then commits. Step out of range or
          // behind cover during the wind-up and the attack is abandoned. That's what stops an
          // enemy from landing a hit on the exact frame you cross its range line.
          // Resolve the current target (the player, or another unit in a brawl) into a hittable box,
          // a feet line, and an aim point, plus a damage sink — so the SAME reaction-timed, line-of-
          // sight-gated, melee-OR-ranged pipeline below fights whichever one this unit is up against.
          const atkCX = ep.x + eShape.centerFrac * eRenderW;
          let tgtBoxLeft = 0, tgtBoxTop = 0, tgtBoxW = pw, tgtBoxH = ph, tgtFeetY = 0, tgtAimCX = targetCX, tgtAimCY = 0;
          if (targetKind === "player") {
            tgtBoxLeft = p.x; tgtBoxTop = p.y; tgtBoxW = pw; tgtBoxH = ph; tgtFeetY = p.y + ph; tgtAimCY = p.y + ph * 0.5;
          } else if (targetKind === "unit" && targetEp && targetEa) {
            const tShape = sideBodyShape(targetEa);
            const tRenderW = enemyRenderW(targetEa, CW), tpw2 = tRenderW * tShape.fraction;
            const tEph = targetEp.crouch ? crouchEph : standEph;
            tgtBoxLeft = targetEp.x + (tShape.centerFrac * tRenderW - tpw2 / 2);
            tgtBoxTop = targetEp.y + tShape.topFrac * tEph;
            tgtBoxW = tpw2; tgtBoxH = tShape.heightFrac * tEph;
            tgtFeetY = targetEp.y + tEph; tgtAimCY = targetEp.y + tEph * 0.5;
          }
          const attacking = (targetKind === "player" || targetKind === "unit"); // has someone to fight (not just following you)
          // Land a hit on whatever this unit is fighting. The player gets the full incoming-damage
          // treatment (defense, back-guard, i-frames, respawn); a unit target simply loses HP.
          const applyAttackHit = (rawDmg) => {
            if (targetKind === "player") {
              if (p.invuln > 0) return false;
              // Guard up (Q/V with a melee weapon): a blow onto your front is turned aside for
              // nothing. Only this melee path consults it — an enemy's SHOT resolves in the
              // projectile pipeline and is untouched on purpose (see BLOCK_FRAMES). Returns true
              // so the caller still counts the swing as spent: one swing, one block.
              if (blockStopsHit(p.blocking, p.face, atkCX, p.x + pw / 2, pw)) {
                // Turning a blow aside STAGGERS whoever threw it: they lose BLOCK_STAGGER_SECS to
                // the same stun channel a stun weapon uses (💫 over their head, no attacking, no
                // walk cycle). Without it a blocked enemy simply swung again off its own cooldown
                // and the guard bought you nothing but the damage — now a good block is what opens
                // the window to hit back, which is the whole reason to raise it.
                if (ep) { ep.stun = Math.max(ep.stun || 0, Math.round(BLOCK_STAGGER_SECS * 60)); ep.reactT = 0; ep.swingT = 0; ep.aimHold = 0; ep.attackT = Math.max(ep.attackT || 0, Math.round(BLOCK_STAGGER_SECS * 60)); }
                flash("🛡️ Blocked " + (ea.name || "the hit") + "! — 💫 staggered");
                return true;
              }
              const dmg = incomingPlayerDamage(rawDmg, playerAsset?.defense ?? 0, p.face, atkCX, p.x + pw / 2, backGuardReduce, crouchGuardReduce, p.crouch, !!(ew && ew.ignoreArmor));
              playerHP.current = Math.max(0, playerHP.current - dmg);
              p.invuln = PLAYER_INVULN_FRAMES;
              if (playerHP.current <= 0) { flash("💀 " + ea.name + " defeated you — back to the start."); p.x = SPAWN.x; p.y = SPAWN.y; p.vy = 0; playerHP.current = maxPlayerHP(playerAsset); }
              else flash("👹 " + ea.name + " hit you for " + dmg + " (" + playerHP.current + " HP left)");
              return true;
            }
            if (targetKind === "unit" && targetKey) {
              const cur = enemyHP.current[targetKey] === undefined ? (targetEa.hp ?? 10) : enemyHP.current[targetKey];
              enemyHP.current[targetKey] = Math.max(0, cur - Math.max(1, Math.round(rawDmg)));
              if (enemyHP.current[targetKey] <= 0) flash(friendly ? ("🟣 Your " + ea.name + " defeated " + (targetEa.name || "a foe") + "!") : ("💔 Your " + (targetEa.name || "ally") + " fell."));
              return true;
            }
            return false;
          };
          // PLAYER-BASED melee connects like the player's own swing: while the swing timer runs, place
          // the weapon's hitbox on the swung arm and land the hit the frame it overlaps the target's
          // body. One hit per swing (swingHit) — against the player or a brawl opponent alike.
          if (!stunned && attacking && meleeGeom && ep.swingT > 0 && ep.swingHit === false) {
            const tSw = Math.max(0, ATTACK_SWING_FRAMES - ep.swingT);
            const saNow = meleeSwingAngle(tSw, ATTACK_SWING_FRAMES);
            for (const hb of enemyMeleeHitboxAt(meleeGeom, ew, saNow)) {
              const lxE = (hb.x / W) * eRenderW, lwE = (hb.w / W) * eRenderW;
              const hbX = ep.x + (ep.face < 0 ? eRenderW - (lxE + lwE) : lxE);
              const hbY = ep.y + (hb.y / H) * newEph, hbH = (hb.h / H) * newEph;
              if (hbX < tgtBoxLeft + tgtBoxW && hbX + lwE > tgtBoxLeft && hbY < tgtBoxTop + tgtBoxH && hbY + hbH > tgtBoxTop) {
                applyAttackHit(enemyAttackDamage(ea, ew));
                ep.swingHit = true;
                break;
              }
            }
          }
          if (ep.attackT > 0) ep.attackT -= dtMul;
          if (ep.swingT > 0) ep.swingT -= dtMul;
          const attackRange = engageRange; // weapon-swept reach for player-based looks, ⚔️ number for monsters
          const eCenterXFinal = ep.x + eShape.centerFrac * eRenderW;
          const gapNow = attacking ? boxGap(tgtAimCX, tgtBoxW, eCenterXFinal, epw) : Infinity;
          const sameLevel = attacking ? (Math.abs((ep.y + newEph) - tgtFeetY) < newEph) : false;
          let inSight = false;
          // A brawl opponent is always "seen" (no stealth between two fighters); only a hostile
          // hunting the PLAYER has to sense them first. Cover still blocks the line either way.
          if (!stunned && attacking && gapNow <= attackRange && sameLevel && (targetKind === "unit" || enemyDetects(tgtAimCX - eCenterXFinal, ep.face))) {
            const chestY = ep.y + newEph * 0.5;
            const STEPS = 6;
            let blocked = false;
            for (let s = 1; s < STEPS; s++) {
              const sx = eCenterXFinal + (tgtAimCX - eCenterXFinal) * (s / STEPS);
              if (cellsHit(sx, chestY, 1, 1).length) { blocked = true; break; }
            }
            inSight = !blocked;
          }
          // Ranged units visibly TRACK their target: aimHold keeps the arm raised in the aim pose
          // the whole time the target is in their sights, not just the shot frame.
          if (inSight && rangedEnemy && !ep.reloading) ep.aimHold = 14; else if (ep.aimHold > 0) ep.aimHold -= dtMul;
          const rangedReady = !rangedEnemy || canFireNow(ep.weaponAmmo);
          if (!inSight || !rangedReady) ep.reactT = 0; // lost the target or is reloading: abandon the wind-up, don't bank the delay
          else if (ep.attackT <= 0) {
            if (ep.reactT <= 0) ep.reactT = enemyReactionFrames(eIntel); // spotted the target — start winding up
            else {
              ep.reactT -= dtMul;
              if (ep.reactT <= 0) {
                ep.reactT = 0;
                ep.face = Math.sign(tgtAimCX - eCenterXFinal) || ep.face;
                const rangedNow = rangedEnemy;
                ep.attackT = rangedNow ? Math.max(20, weaponFireCooldownFrames(ew.fireRate)) : ATTACK_COOLDOWN_FRAMES;
                ep.swingT = ATTACK_SWING_FRAMES;
                if (rangedNow) {
                  // Shoots at the target, aimed from its own chest. The shot is flagged for the side
                  // it should hurt: a hostile's shot is `foe` (tested against you AND your friendlies),
                  // a friendly's shot is a normal player-side shot (tested against hostiles).
                  const projAsset = ew.projectileId ? findA(ew.projectileId) : null;
                  let drawnPieces = null, hitboxPiece = null, sizeUnits = 1;
                  if (projAsset) {
                    const front = (projAsset.angles && projAsset.angles.front) || [];
                    drawnPieces = front.filter((pc) => !pc.isHitbox);
                    hitboxPiece = front.find((pc) => pc.isHitbox) || null;
                    sizeUnits = projAsset.size || 1;
                  }
                  const spd = ew.projectileSpeed ?? 12;
                  const sx = eCenterXFinal, sy = ep.y + newEph * 0.42;
                  const shotAng = Math.atan2(tgtAimCY - sy, tgtAimCX - sx);
                  const rangePx = Math.max(1, ew.projectileRange ?? DEFAULT_PROJECTILE_RANGE) * CW;
                  projectiles.current.push({
                    x: sx, y: sy, vx: Math.cos(shotAng) * spd, vy: Math.sin(shotAng) * spd,
                    startX: sx, startY: sy, groundY: ep.y + newEph, rangePx, traveled: 0,
                    char: ew.projectile?.char || "🔥", tint: ew.projectile?.tint || null,
                    pieces: drawnPieces && drawnPieces.length ? drawnPieces : null, hitbox: hitboxPiece,
                    rot: shotAng * 180 / Math.PI, size: sizeUnits,
                    damage: enemyAttackDamage(ea, ew), life: 0, foe: hostile,
                    ignoreArmor: !!ew.ignoreArmor,
                    explode: !!ew.explode, explodeRadius: ew.explodeRadius ?? 2, explodePropId: ew.explodePropId || null, explodeSize: ew.explodeSize ?? 3, explodeLife: ew.explodeLife ?? 0.5,
                  });
                  ep.weaponAmmo = consumeShot(ep.weaponAmmo, weaponFireCooldownFrames(ew.fireRate));
                } else if (meleeGeom) {
                  ep.swingHit = false; // weapon-hitbox melee: committing only STARTS the swing; the hit lands in the swing test above
                } else {
                  // Bare-handed / drawn-monster melee: an instant hit on commit (applyAttackHit
                  // respects the player's i-frames, and routes to a unit's HP in a brawl).
                  applyAttackHit(enemyAttackDamage(ea, ew));
                }
              }
            }
          }
        }
      }

      // Fire — edge-detected (fires once per press, not every frame while held) so holding the
      // key doesn't spam-fire. Melee starts a brief swing timer that drives both the arm's
      // swing angle and which weapon pose renders (see the render section below). Projectile
      // spawns a travelling entity aimed by whatever of ↑/↓ is held at the moment of firing —
      // neither held means straight ahead in the facing direction.
      // Melee stays edge-triggered — one swing per press. A plain ranged weapon is semi-auto;
      // Full Auto is the explicit ability that turns a held key into repeated trigger pulls.
      // Burst is edge-triggered too, then its committed-salvo timer supplies the later rounds.
      const wantFire = wpnIsRanged ? rangedTriggerWantsFire(K.fire, p.wasFire, playtestWeapon) : (K.fire && !p.wasFire);
      // Burst continuation: tick the inter-shot timer and decide whether the next round of the
      // salvo already in flight is due. Holding or releasing Fire makes no difference once a burst
      // has started — a burst is a committed salvo, which is what separates it from full-auto.
      if ((p.burstLeft || 0) > 0) p.burstT = (p.burstT || 0) - dtMul;
      const burstDue = wpnIsRanged && burstShotDue(p.burstLeft, p.burstT, wpn.current);
      if ((p.burstLeft || 0) > 0 && !burstDue && wpn.current && (wpn.current.reloadT > 0 || (wpn.current.clip > 0 && wpn.current.ammo <= 0))) p.burstLeft = 0; // ran dry or started reloading — abandon the rest
      if (wantFire && wpnIsRanged && !canFireNow(wpn.current) && !burstDue) {
        if (needsReload(wpn.current)) { wpn.current = startReload(wpn.current, reloadFrames); p.burstLeft = 0; }
      } else if (wantFire || burstDue) {
        if (playtestWeapon && isRanged(playtestWeapon.wtype)) {
          const aimDir = p.aimDir; // live-tracked above, not re-snapshotted here
          const spd = playtestWeapon.projectileSpeed ?? playtestWeapon.projectile?.speed ?? 12;
          const aimRad = projectileAimRad(aimDir); // straight up when aimDir is -1 — see projectileAimRad
          const vx = p.face * spd * Math.cos(aimRad), vy = spd * Math.sin(aimRad);
          // Where the shot comes OUT of. If the weapon has a 🔴 muzzle piece drawn on it, the
          // spawn point is that piece's live position — attached to the arm through exactly the
          // same attachWeaponBlocks call the visible art goes through, then converted from the
          // character's 200x260 layout space into world pixels (mirroring horizontally about the
          // render box when facing left, which is what the wrapper's scaleX(-1) does on screen).
          // So the bullet leaves the barrel tip, at the right height, however the arm is posed.
          // No muzzle drawn (every weapon made before this existed) -> the old chest-height
          // spawn point, unchanged.
          let spawnX = p.x + pw / 2 + p.face * pw * 0.3, spawnY = p.y + ph * 0.35;
          const angleNow = playerPoseKey({ climbing: p.climbing, climbKind: p.climbKind, climbJumpKind: p.climbJumpKind, aiming: p.aiming, aimDir, crouch: p.crouch, walking: p.walking });
          const armPieceM = playerAsset ? armOf(playerAsset.angles[angleNow] || []) : null;
          if (armPieceM) {
            const baseArmRotM = armPieceM.rot || 0;
            const aimAbsM = armAimAbs(armPieceM.armPivot);
            // Matches the renderer's own aim branch: the arm is SET to a horizontal, extended
            // angle plus the aim tilt — except in the dedicated Aim-up pose, which is drawn pointing
            // up. Crouch DOES extend now, so a ducked shot leaves the barrel instead of thin air.
            const aimingNow = p.aiming && angleNow !== "up";
            const curArmM = { ...armPieceM, rot: aimingNow ? (aimAbsM + aimDir * 50) : baseArmRotM };
            const wfitM = weaponFitFor(playtestWeapon, equippedBodyIdFor(playerAsset));
            const guideHandM = handForGuideId(wfitM.guideId)[angleNow] || DEFAULT_HAND[angleNow];
            const muzArt = bake({ ...playtestWeapon, angles: wfitM.states.rest || blankAngles() }, angleNow).filter((pc) => pc.isMuzzle);
            const mp = muzArt.length ? muzzleLocalPoint(attachWeaponBlocks(muzArt, curArmM, guideHandM, baseArmRotM)) : null;
            if (mp) {
              const renderWM = CW * PLAYER_RENDER_W_CELLS;
              const wrapLeftM = p.x - (bodyShape.centerFrac * renderWM - pw / 2);
              const lx = (mp.x / W) * renderWM;
              // Mirrored-ness, not raw facing: an enemy-as-player sprite mirrors on the OTHER
              // facing (playerSpriteMirrored), and the muzzle has to follow the art or the shot
              // leaves from behind the body.
              spawnX = wrapLeftM + (playerSpriteMirrored(basePlayerAsset, p.face) ? renderWM - lx : lx);
              spawnY = p.y + (mp.y / H) * ph;
            }
          }
          // The equipped Projectile asset (built once, loadable onto any Ranged weapon) is the
          // primary source of both the visual and its own hitbox. A weapon that hasn't been
          // assigned one yet (old saves, migrated from when "ranged" was called "projectile"
          // and built its bullet inline) falls back to whatever it already had — drawn art if
          // any was made, else the plain emoji — so nothing that used to work stops working.
          const projAsset = playtestWeapon.projectileId ? findA(playtestWeapon.projectileId) : null;
          let drawnPieces = null, hitboxPiece = null, sizeUnits = 1;
          if (projAsset) {
            const front = (projAsset.angles && projAsset.angles.front) || [];
            drawnPieces = front.filter((pc) => !pc.isHitbox);
            hitboxPiece = front.find((pc) => pc.isHitbox) || null;
            sizeUnits = projAsset.size || 1;
          } else {
            const legacyState = playtestWeapon.states?.projectile;
            if (legacyState && !anglesEmpty(legacyState)) drawnPieces = bake({ ...playtestWeapon, angles: legacyState }, "front").filter((pc) => !pc.isHitbox);
            sizeUnits = playtestWeapon.projectile?.size || 1;
          }
          projectiles.current.push({
            x: spawnX, y: spawnY,
            vx, vy,
            startX: spawnX, startY: spawnY, groundY: p.y + ph,
            rangePx: Math.max(1, playtestWeapon.projectileRange ?? DEFAULT_PROJECTILE_RANGE) * CW * rangeBoostMultiplier(playerAsset.effects), traveled: 0,
            char: playtestWeapon.projectile?.char || "🔥", tint: playtestWeapon.projectile?.tint || null,
            pieces: drawnPieces && drawnPieces.length ? drawnPieces : null, hitbox: hitboxPiece, rot: Math.atan2(vy, vx) * 180 / Math.PI,
            size: sizeUnits, damage: playtestWeapon.resurrect ? 0 : Math.round((playtestWeapon.damage ?? 5) * tagDamageMultiplier(playerAsset.effects, playtestWeapon.categories)), stun: playtestWeapon.resurrect ? 0 : (playtestWeapon.stun ?? 0), life: 0, resurrect: !!playtestWeapon.resurrect,
            ignoreArmor: !playtestWeapon.resurrect && !!playtestWeapon.ignoreArmor,
            explode: !playtestWeapon.resurrect && !!playtestWeapon.explode, explodeRadius: playtestWeapon.explodeRadius ?? 2, explodePropId: playtestWeapon.explodePropId || null, explodeSize: playtestWeapon.explodeSize ?? 3, explodeLife: playtestWeapon.explodeLife ?? 0.5,
          });
          wpn.current = consumeShot(wpn.current, fireCdFrames); // spends a round (unless clip 0 = unlimited) and starts the fire-rate cooldown
          // A fresh pull ARMS the rest of the burst; a burst shot spends one of them. Either way the
          // next one is scheduled off burstDelay, not the fire rate.
          p.burstLeft = burstDue ? (p.burstLeft || 0) - 1 : weaponBurstShotCount(playtestWeapon) - 1;
          p.burstT = burstDelayFrames(playtestWeapon.burstDelay);
          p.firing = { t: 0, dur: RANGED_FIRE_POSE_FRAMES };
        } else if (wantFire) {
          p.firing = { t: 0, dur: 12 }; // swing duration — same for a real melee weapon or a bare-handed swing (faster than the old sine sweep)
          p.hitRegistered = false; // a fresh swing can land a fresh hit
        }
      }
      p.wasFire = !!K.fire;
      // Melee button (Q/V) does one of two things, decided by what's in your hand:
      //   Ranged weapon, or empty hands — a bare-handed swing you can throw WITHOUT holstering the
      //     gun: pistol-whip style. Fist reach, unarmed (Strength) damage, no bonus range.
      //   Melee weapon — a BLOCK instead (see BLOCK_FRAMES). Fire is already the swing for a melee
      //     weapon, so this button was a duplicate there; now it's the guard: one TAP braces for a
      //     second and then the arm comes back down, and holding simply re-taps it for you.
      // The pistol-whip stays edge-triggered (one tap = one swing) and neither action starts on top
      // of an in-progress shot or swing.
      const wantMelee = K.melee && !p.wasMelee;
      const meleeInHand = !!playtestWeapon && !isRanged(playtestWeapon.wtype); // a real melee weapon — bare hands still swing
      if (!meleeInHand && wantMelee && !p.firing) {
        p.firing = { t: 0, dur: 12, unarmed: true }; p.hitRegistered = false;
      }
      p.wasMelee = !!K.melee;
      // All of the guard's timing is advanceBlock: the press raises it, BLOCK_FRAMES later the arm
      // comes down on its own, and BLOCK_RECOVER_FRAMES after THAT a still-held button raises it
      // again. Attacking or grabbing a ladder drops it immediately (both hands go elsewhere), and
      // so does swapping off the melee weapon. p.blocking is mutated in place rather than replaced
      // so the object identity survives a frame — this runs 60 times a second.
      const guard = advanceBlock(p.blocking ? p.blocking.t : null, p.blockCd || 0, !!K.melee, meleeInHand && !p.firing && !p.climbing, dtMul);
      if (guard.t == null) p.blocking = null;
      else if (p.blocking) p.blocking.t = guard.t;
      else p.blocking = { t: guard.t };
      p.blockCd = guard.cd;
      if (p.firing) {
        p.firing.t += dtMul;
        // Melee hit-test — reconstructs just enough of the render section's arm-swing/weapon-
        // attach geometry (swingAngle, attachWeaponBlocks) to place the hitbox piece in world
        // space, without needing the full visual bake() pipeline. Guarded by p.hitRegistered so
        // a swing can only land one hit, no matter how many frames it overlaps an enemy for.
        // With no weapon equipped, this is a bare-handed swing: a small fist-sized hitbox
        // centered on the same guide-hand point a weapon would use, riding the arm the same way.
        const unarmedSwing = !!(p.firing && p.firing.unarmed); // Q/V bare-handed swing — ignores the held weapon entirely
        if (unarmedSwing || !playtestWeapon || !isRanged(playtestWeapon.wtype)) {
          const angleNow = playerPoseKey({ climbing: p.climbing, climbKind: p.climbKind, climbJumpKind: p.climbJumpKind, crouch: p.crouch, walking: p.walking });
          const armPiece = playerAsset ? armOf(playerAsset.angles[angleNow] || []) : null;
          if (armPiece) {
            const baseArmRot = armPiece.rot || 0;
            const swingAngle = meleeSwingAngle(p.firing.t, p.firing.dur);
            const curArm = { ...armPiece, rot: baseArmRot + armPivotSign(armPiece.armPivot) * swingAngle };
            const wfit = weaponFitFor(playtestWeapon, equippedBodyIdFor(playerAsset));
            const guideHand = handForGuideId(wfit.guideId)[angleNow] || DEFAULT_HAND[angleNow];
            const useFist = unarmedSwing || !playtestWeapon; // bare-handed reach/damage; a real melee weapon (not forced-unarmed) uses its own hitbox
            const hbPieces = !useFist
              ? attachWeaponBlocks(weaponHitboxPieces(bake({ ...playtestWeapon, angles: weaponFireArt(wfit.states, angleNow) }, angleNow)), curArm, guideHand, baseArmRot)
              : attachWeaponBlocks([{ id: "fist", kind: "rect", x: guideHand.x - 20, y: guideHand.y - 20, w: 40, h: 40, isHitbox: true }], curArm, guideHand, baseArmRot);
            if (hbPieces.length) {
              const wrapLeft = p.x - (bodyShape.centerFrac * (CW * PLAYER_RENDER_W_CELLS) - pw / 2);
              const strength = pstats.strength, intelligence = pstats.intelligence;
              // Every hitbox piece, resolved to world space ONCE. Mirror when facing LEFT, exactly
              // like the muzzle-spawn math — the wrapper renders the whole character through
              // scaleX(-1) about the render box, so a right-facing-space hitbox lands on the WRONG
              // side without this: facing left, your swing was still hitting enemies on your RIGHT.
              const renderWNow0 = CW * PLAYER_RENDER_W_CELLS;
              const swingMirrored = playerSpriteMirrored(basePlayerAsset, p.face);
              const swingBoxes = hbPieces.map((hb) => {
                const lxP = (hb.x / W) * renderWNow0, bw = (hb.w / W) * renderWNow0;
                return { x: wrapLeft + (swingMirrored ? renderWNow0 - (lxP + bw) : lxP), y: p.y + (hb.y / H) * ph, w: bw, h: (hb.h / H) * ph };
              });
              // PARRY: a swing that sweeps through an incoming shot knocks it out of the air. This
              // is what gives melee a reason to exist against a ranged enemy — you can close the
              // distance by batting shots down instead of just eating them. Deliberately NOT gated
              // by hitRegistered (that budget is "one enemy damaged per swing"; a wide swing should
              // still clear several shots) and it never consumes the swing, so the same stroke can
              // parry and then land on the enemy behind it. An explosive shot still detonates where
              // it was struck — parrying it away from your face is the reward, not immunity.
              if (projectiles.current.length) {
                projectiles.current = projectiles.current.filter((pr) => {
                  const psz = LV_CELL * (pr.size || 1);
                  const pl = pr.x - psz / 2, pt = pr.y - psz / 2;
                  const struck = swingBoxes.some((b) => pl < b.x + b.w && pl + psz > b.x && pt < b.y + b.h && pt + psz > b.y);
                  if (!struck) return true;
                  if (pr.explode) detonate(pr, pr.x, pr.y);
                  flash("🗡️ Blocked!");
                  return false;
                });
              }
              // RESURRECT ON A SWING. A melee Resurrect staff raises a defeated body it touches
              // instead of damaging anything — same rule as the staff's shot (canResurrect: dead,
              // and never raised before). Checked before the damage loop and it consumes the swing,
              // so a resurrect weapon can never also hurt a living enemy standing in the same arc.
              const meleeResurrect = !unarmedSwing && playtestWeapon && !!playtestWeapon.resurrect;
              if (meleeResurrect) {
                raiseLoop:
                for (const b of swingBoxes) {
                  for (const k of Object.keys(lv.enemies || {})) {
                    const ep = enemyPos.current[k];
                    const ea = findA(lv.enemies[k].enemyId);
                    if (!ea || !ep) continue;
                    const hp = enemyHP.current[k] === undefined ? (ea.hp ?? 10) : enemyHP.current[k];
                    if (!canResurrect(hp, ep)) continue;
                    const eShape = sideBodyShape(ea);
                    const eRenderW = enemyRenderW(ea, CW), epw = eRenderW * eShape.fraction;
                    const eph = ep.crouch ? enemyCrouchH(ea, CW) : enemyStandH(ea, CW);
                    const hitTop = ep.y + eShape.topFrac * eph, hitH = eShape.heightFrac * eph;
                    const eHitLeft = ep.x + (eShape.centerFrac * eRenderW - epw / 2);
                    if (b.x < eHitLeft + epw && b.x + b.w > eHitLeft && b.y < hitTop + hitH && b.y + b.h > hitTop) {
                      enemyHP.current[k] = ea.hp ?? 10;
                      ep.friendly = true; ep.resurrectedOnce = true; ep.stun = 0; ep.attackT = 0; ep.swingT = 0; ep.reactT = 0;
                      ep.restedDead = false;
                      p.hitRegistered = true;
                      flash("🔮 Raised " + ea.name + " — now fighting for you!");
                      break raiseLoop;
                    }
                  }
                }
              }
              hitLoop:
              for (const b of swingBoxes) {
                if (meleeResurrect) break hitLoop; // a raising staff deals no damage, ever
                if (p.hitRegistered) break hitLoop; // one ENEMY hit per swing; parries above are unlimited
                const hbX = b.x, hbY = b.y, hbW = b.w, hbH = b.h;
                for (const k of Object.keys(lv.enemies || {})) {
                  const spawn = lv.enemies[k];
                  const ea = findA(spawn.enemyId);
                  if (!ea) continue;
                  if (enemyHP.current[k] === undefined) enemyHP.current[k] = ea.hp ?? 10;
                  if (enemyHP.current[k] <= 0) continue; // already defeated
                  if (enemyPos.current[k] && enemyPos.current[k].friendly) continue; // don't clobber your own minion
                  const eShape = sideBodyShape(ea);
                  const eRenderW = enemyRenderW(ea, CW), epw = eRenderW * eShape.fraction;
                  const ep = enemyPos.current[k];
                  const eph = ep && ep.crouch ? enemyCrouchH(ea, CW) : enemyStandH(ea, CW);
                  const [er, ec] = k.split(",").map(Number);
                  const eLeft = ep ? ep.x : ec * CW + CW / 2 - epw / 2 - (eShape.centerFrac * eRenderW - epw / 2);
                  const eTop = ep ? ep.y : (er + 1) * CW - eph;
                  const hitTop = eTop + eShape.topFrac * eph, hitH = eShape.heightFrac * eph;
                  // Enemy's VISIBLE body X-span sits INSIDE the wider render box (same offset the HP bar and
                  // draw use). Test against THAT, exactly as the Y-axis already does with hitTop/hitH — not the
                  // full eRenderW, which added ~1.6 cells of phantom horizontal reach on the enemy's near side and
                  // made even a short melee weapon connect from a full cell past its blade tip (the 'sniper range').
                  const eHitLeft = eLeft + (eShape.centerFrac * eRenderW - epw / 2);
                  const overlap = hbX < eHitLeft + epw && hbX + hbW > eHitLeft && hbY < hitTop + hitH && hbY + hbH > hitTop;
                  if (overlap) {
                    // One formula for both: damage x Strength/5. Armed, the damage is the weapon's
                    // own (times any Tag Damage gear that matches its categories); bare-handed it's
                    // UNARMED_DAMAGE. Fists carry no categories, so no gear multiplier applies to
                    // them — a Tag Damage hat boosts the weapon it's tagged for, not your knuckles.
                    const base = (!unarmedSwing && playtestWeapon)
                      ? playerMeleeDamage((playtestWeapon.damage ?? 5) * tagDamageMultiplier(playerAsset.effects, playtestWeapon.categories), strength)
                      : playerMeleeDamage(UNARMED_DAMAGE, strength);
                    const isCrit = Math.random() < critChance(intelligence);
                    const dmg = isCrit ? base * 2 : base;
                    enemyHP.current[k] = Math.max(0, enemyHP.current[k] - dmg);
                    if (ep && enemyHP.current[k] > 0 && !unarmedSwing && playtestWeapon && (playtestWeapon.stun ?? 0) > 0) { ep.stun = Math.round(playtestWeapon.stun * 60); ep.reactT = 0; ep.swingT = 0; ep.aimHold = 0; }
                    p.hitRegistered = true;
                    flash((isCrit ? "💥 Critical! " : ((!unarmedSwing && playtestWeapon) ? "⚔️ " : "👊 ")) + "Hit " + ea.name + " for " + dmg + (enemyHP.current[k] <= 0 ? " — defeated!" : " (" + enemyHP.current[k] + " HP left)"));
                    break hitLoop;
                  }
                }
              }
            }
          }
        }
        if (p.firing && p.firing.t >= p.firing.dur) p.firing = null;
      }

      // Advance live projectiles and cull anything expired, off-level, that hit solid ground, or
      // that connect with a living enemy. Enemy hit-test uses the projectile's own rendered box
      // (see the `sz` math in the render section below — kept identical here so the hitbox always
      // matches what's on screen). Damage is playerRangedDamage: the weapon's own number, flat.
      // This comment used to claim ranged reused the melee strength/intelligence formula "so both
      // weapon types scale with player stats identically" — the code did exactly that, and it was
      // the bug. Guns are the one thing in this game a body's stats do NOT change.
      // Thrown grenades: gravity arc until they hit a solid cell, the floor, or a wall, then they
      // "land" — painting their fire (or future effect) into the hazard layer at the impact, in a
      // splash of the configured radius, and seeding each new cell's burn life so it goes out on
      // schedule exactly like painted fire. The grenade art spins while airborne.
      if (thrown.current.length) {
        const stillFlying = [];
        for (const g of thrown.current) {
          g.vy = Math.min(40, g.vy + 0.175 * dtMul);
          g.x += g.vx * dtMul; g.y += g.vy * dtMul; g.rot += (g.spin || 6) * dtMul;
          const offLevel = g.x < 0 || g.x > lv.cols * CW || g.y > lv.rows * CH;
          const hitSolid = !offLevel && cellsHit(g.x - 4, g.y - 4, 8, 8).length > 0;
          const landed = offLevel || hitSolid || g.y >= lv.rows * CH - 1;
          if (!landed) { stillFlying.push(g); continue; }
          // Impact cell: clamp inside the level. Paint the landing effect there + its splash.
          const r0 = Math.max(0, Math.min(lv.rows - 1, Math.floor(g.y / CH)));
          const c0 = Math.max(0, Math.min(lv.cols - 1, Math.floor(g.x / CW)));
          const a = g.asset || {};
          const dps = a.landEffectDps ?? 6, life = a.landEffectLife ?? 6, radius = a.landRadius ?? DEFAULT_LAND_RADIUS;
          // Cluster: burst into bomblets INSTEAD of paying out here — the throwable "becomes" the
          // little copies, so the payout happens wherever each of THEM lands. Only the thrown parent
          // bursts (every bomblet carries noCluster), and a grenade that sailed off the level edge
          // never bursts — its bomblets would spawn out of bounds and vanish the same frame.
          const clusterCount = Math.max(0, Math.round(a.clusterCount ?? 0));
          if (clusterCount > 0 && !g.noCluster && !offLevel) {
            const scale = Math.max(0.15, Math.min(1, a.clusterScale ?? DEFAULT_CLUSTER_SCALE));
            const bombArt = bake({ ...a, angles: (a.states?.rest || a.angles || blankAngles()) }, "side");
            const bombFly = prepFlyingArt(bombArt, CW, scale);
            for (let i = 0; i < clusterCount; i++) {
              const cv = clusterBombletVelocity(i, clusterCount);
              stillFlying.push({
                x: g.x, y: g.y - 2, vx: cv.vx, vy: cv.vy, rot: 0,   // nudged up so they don't re-collide with the cell they burst on
                spin: (cv.vx >= 0 ? 1 : -1) * 10, asset: a, pieces: bombFly.pieces.length ? bombFly.pieces : null,
                cwPx: bombFly.canvasWPx, chPx: bombFly.canvasHPx, wPx: bombFly.wPx, hPx: bombFly.hPx,
                noCluster: true,
              });
            }
            flash("💥 " + (a.name || "Grenade") + " burst into " + clusterCount);
            continue;
          }
          const landProp = a.landPropId ? findA(a.landPropId) : null;   // a chosen Object/Prop draws the fire instead of the 🔥 emoji
          const propSize = landProp ? (landProp.size || 1) : 1;
          const cellState = (r, c) => { const cell = lv.fg[cellKey(r, c)]; if (fgSolid(cell)) return "block"; if (fxBlocks(r, c)) return "block"; if (fgSlopeFills(cell).length) return "ground"; return null; };
          let keys = groundedLandingCells(r0, c0, radius, lv.rows, lv.cols, cellState);
          if (!keys.length) keys = [r0 + "," + c0]; // never a total dud: if nothing is grounded (rare), fall back to the impact cell
          setLevel((lv2) => {
            const { hazard, fx, newHazKeys, newPropKeys } = applyLandingEffect(lv2.hazard, lv2.fx, keys, dps, life, landProp ? a.landPropId : null, propSize);
            for (const key of newHazKeys) thrownFireKeys.current.add(key);
            for (const key of newPropKeys) thrownPropKeys.current.add(key);
            return { ...lv2, hazard, fx };
          });
          // Seed these fires' playtest lifetimes immediately so they start counting down now (the
          // level-state update above is async; the loop reads hazLife, so seed it directly too).
          if (life > 0) for (const key of keys) hazLife.current[key] = life;
          // Shock payload: freeze every living, non-allied enemy caught in the blast. Runs for a
          // bomblet exactly as for a whole grenade, so a cluster of shock charges blankets an area.
          const stunSecs = a.stun ?? 0;
          let stunnedCount = 0;
          if (stunSecs > 0) {
            const stunRadPx = throwStunRadiusCells(radius) * CW;
            for (const k of Object.keys(lv.enemies || {})) {
              const ea2 = findA(lv.enemies[k].enemyId); if (!ea2) continue;
              if (enemyHP.current[k] === undefined) enemyHP.current[k] = ea2.hp ?? 10;
              if (enemyHP.current[k] <= 0) continue;
              const ep2 = enemyPos.current[k]; if (!ep2 || ep2.friendly) continue; // your own resurrected allies aren't shocked
              // Same box-not-centre rule the explosion uses (blastHitsBox) — measuring to a big
              // enemy's centre made a grenade that landed at its feet miss it entirely.
              const sShape = sideBodyShape(ea2);
              const sRenderW = enemyRenderW(ea2, CW), spw = sRenderW * sShape.fraction;
              const sph = ep2.crouch ? enemyCrouchH(ea2, CW) : enemyStandH(ea2, CW);
              if (blastHitsBox(g.x, g.y, ep2.x + (sShape.centerFrac * sRenderW - spw / 2), ep2.y + sShape.topFrac * sph, spw, sShape.heightFrac * sph, stunRadPx)) {
                ep2.stun = Math.round(stunSecs * 60); ep2.reactT = 0; ep2.swingT = 0; ep2.aimHold = 0;
                stunnedCount++;
              }
            }
          }
          flash("💥 " + (a.name || "Grenade") + " landed" + (landProp ? " — " + landProp.name : " — 🔥")
            + (stunnedCount ? " · 💫 stunned " + stunnedCount + " for " + stunSecs + "s" : ""));
        }
        thrown.current = stillFlying;
      }

      if (projectiles.current.length) {
        // Intelligence ONLY. A shot's damage comes from the weapon alone; the sole thing the
        // character contributes is how often that damage doubles. Strength is deliberately not
        // read in this block, and must not be.
        const intelligence = pstats.intelligence;
        // An "explode" shot doesn't just hit one target — on impact it bursts: a wide splash of
        // damage over a radius, plus a transient explosion drawn in the FRONT layer from whatever
        // Object/Prop the weapon points at (Blake draws the boom in the prop maker). The boom is a
        // play-only visual (booms ref) — it never writes into the saved level, and auto-clears when
        // its short life runs out. Player/friendly shots splash hostiles; a foe's shot splashes the
        // player + your friendly NPCs. Called at the moment the shot is consumed, at the impact point.
        const detonate = (pr, ix, iy) => {
          if (!pr.explode) return;
          const radPx = Math.max(0.5, pr.explodeRadius ?? 2) * CW;
          booms.current.push({ x: ix, y: iy, propId: pr.explodePropId || null, size: pr.explodeSize ?? 3, life: 0, maxLife: Math.max(8, Math.round((pr.explodeLife ?? 0.5) * 60)) });
          const baseDmg = pr.damage ?? 5;
          // Every target's blast box, resolved the same way the direct-hit tests do: the VISIBLE
          // body, not the wider render box. Shared by all three branches below so the player, your
          // friendlies and the hostiles can't drift apart on what "caught in it" means.
          const enemyBlastBox = (ea2, ep2) => {
            const eShape = sideBodyShape(ea2);
            const eRenderW = enemyRenderW(ea2, CW), epw2 = eRenderW * eShape.fraction;
            const eph2 = ep2 && ep2.crouch ? enemyCrouchH(ea2, CW) : enemyStandH(ea2, CW);
            return { x: ep2.x + (eShape.centerFrac * eRenderW - epw2 / 2), y: ep2.y + eShape.topFrac * eph2, w: epw2, h: eShape.heightFrac * eph2 };
          };
          if (pr.foe) {
            if (p.invuln <= 0) {
              const pcx = p.x + pw / 2;
              if (blastHitsBox(ix, iy, p.x, p.y, pw, ph, radPx)) {
                const dmg = incomingPlayerDamage(baseDmg, playerAsset?.defense ?? 0, p.face, ix, pcx, backGuardReduce, crouchGuardReduce, p.crouch);
                playerHP.current = Math.max(0, playerHP.current - dmg);
                p.invuln = PLAYER_INVULN_FRAMES;
                if (playerHP.current <= 0) { flash("💀 Caught in the blast — back to the start."); p.x = SPAWN.x; p.y = SPAWN.y; p.vy = 0; playerHP.current = maxPlayerHP(playerAsset); }
                else flash("💥 Blast hit for " + dmg + " (" + playerHP.current + " HP left)");
              }
            }
            for (const k of Object.keys(lv.enemies || {})) {
              const ep = enemyPos.current[k]; if (!ep || !ep.friendly || !(enemyHP.current[k] > 0)) continue;
              const ea = findA(lv.enemies[k].enemyId); if (!ea) continue;
              const bx = enemyBlastBox(ea, ep);
              if (blastHitsBox(ix, iy, bx.x, bx.y, bx.w, bx.h, radPx)) enemyHP.current[k] = Math.max(0, enemyHP.current[k] - Math.max(1, baseDmg));
            }
          } else {
            let hits = 0;
            for (const k of Object.keys(lv.enemies || {})) {
              const ea = findA(lv.enemies[k].enemyId); if (!ea) continue;
              if (enemyHP.current[k] === undefined) enemyHP.current[k] = ea.hp ?? 10;
              if (enemyHP.current[k] <= 0) continue;
              const ep = enemyPos.current[k]; if (!ep || ep.friendly) continue;
              const bx = enemyBlastBox(ea, ep);
              if (blastHitsBox(ix, iy, bx.x, bx.y, bx.w, bx.h, radPx)) {
                // Splash is still a SHOT — flat weapon damage plus the same crit roll as a direct
                // hit, and nothing else off the shooter.
                const base = playerRangedDamage(baseDmg);
                const dmg = (Math.random() < critChance(intelligence)) ? base * 2 : base;
                enemyHP.current[k] = Math.max(0, enemyHP.current[k] - dmg);
                if ((pr.stun ?? 0) > 0 && enemyHP.current[k] > 0) { ep.stun = Math.round(pr.stun * 60); ep.reactT = 0; ep.swingT = 0; ep.aimHold = 0; }
                hits++;
              }
            }
            flash("💥 Explosion" + (hits ? " — hit " + hits + (hits === 1 ? " enemy" : " enemies") : ""));
          }
        };
        projectiles.current = projectiles.current.filter((pr) => {
          pr.life += dtMul;
          // Distance, not lifetime, is the normal flight limiter. Reconstruct the aimed trajectory
          // from the firing snapshot, then add only the second-half quadratic drop.
          pr.rangePx = Math.max(CW, pr.rangePx || DEFAULT_PROJECTILE_RANGE * CW);
          if (pr.startX === undefined) { pr.startX = pr.x; pr.startY = pr.y; pr.groundY = pr.y; }
          pr.traveled = (pr.traveled || 0) + Math.hypot(pr.vx || 0, pr.vy || 0) * dtMul;
          const rangedPos = projectilePositionAtDistance(pr, pr.traveled);
          pr.x = rangedPos.x; pr.y = rangedPos.y;
          // Past its configured range the shot is still airborne, just falling — "spent" now only
          // means it has passed the range mark, used to decide whether an out-of-bounds exit should
          // still detonate. It is NOT a despawn condition any more.
          const rangeReached = pr.traveled >= pr.rangePx;
          if (pr.life > 3600) return false; // safety only: protects against a malformed zero-speed shot
          if (pr.x < 0 || pr.x > lv.cols * CW || pr.y < 0 || pr.y > lv.rows * CH) { if (rangeReached && pr.explode) detonate(pr, pr.x, pr.y); return false; }
          const sz = LV_CELL * (pr.size || 1);
          let boxW = sz, boxH = sz, boxCx = pr.x, boxCy = pr.y;
          if (pr.hitbox) {
            const hb = pr.hitbox;
            boxW = hb.w / W * sz; boxH = hb.h / H * sz;
            const rad = (pr.rot || 0) * Math.PI / 180;
            const offX = (hb.x + hb.w / 2 - W / 2) / W * sz, offY = (hb.y + hb.h / 2 - H / 2) / H * sz;
            boxCx = pr.x + (offX * Math.cos(rad) - offY * Math.sin(rad));
            boxCy = pr.y + (offX * Math.sin(rad) + offY * Math.cos(rad));
          }
          const prLeft = boxCx - boxW / 2, prTop = boxCy - boxH / 2;
          if (pr.foe) {
            // Fired BY an enemy: tested against the player, never against other enemies (no
            // friendly fire), and it can't be dodged by the shooter's own crouch/jump logic.
            if (prLeft < p.x + pw && prLeft + boxW > p.x && prTop < p.y + ph && prTop + boxH > p.y) {
              if (pr.explode) { detonate(pr, boxCx, boxCy); return false; }
              if (p.invuln <= 0) {
                // For a projectile, "from behind" is decided by which way the shot is travelling
                // relative to the way you're facing — a bullet catching you in the back is one
                // moving the same way you face while coming from behind you. Using the shot's own
                // x as the attacker position captures exactly that.
                const dmg = incomingPlayerDamage(pr.damage ?? 5, playerAsset?.defense ?? 0, p.face, pr.x, p.x + pw / 2, backGuardReduce, crouchGuardReduce, p.crouch, pr.ignoreArmor);
                playerHP.current = Math.max(0, playerHP.current - dmg);
                p.invuln = PLAYER_INVULN_FRAMES;
                if (playerHP.current <= 0) { flash("💀 Shot down — back to the start."); p.x = SPAWN.x; p.y = SPAWN.y; p.vy = 0; playerHP.current = maxPlayerHP(playerAsset); }
                else flash("🏹 Hit for " + dmg + " (" + playerHP.current + " HP left)");
                return false; // consumed on impact
              }
              return false; // struck an invulnerable player: still consumed, just does nothing
            }
            // Brawl: an enemy shot can also hit one of YOUR friendly NPCs it flies into.
            for (const k of Object.keys(lv.enemies || {})) {
              const ep = enemyPos.current[k]; if (!ep || !ep.friendly) continue;
              if (enemyHP.current[k] === undefined || enemyHP.current[k] <= 0) continue;
              const ea = findA(lv.enemies[k].enemyId); if (!ea) continue;
              const eShape = sideBodyShape(ea);
              const eRenderW = enemyRenderW(ea, CW), epw = eRenderW * eShape.fraction;
              const eph = ep && ep.crouch ? enemyCrouchH(ea, CW) : enemyStandH(ea, CW);
              const hitTop = ep.y + eShape.topFrac * eph, hitH = eShape.heightFrac * eph;
              const eHitLeft = ep.x + (eShape.centerFrac * eRenderW - epw / 2);
              if (prLeft < eHitLeft + epw && prLeft + boxW > eHitLeft && prTop < hitTop + hitH && prTop + boxH > hitTop) {
                if (pr.explode) { detonate(pr, boxCx, boxCy); return false; }
                enemyHP.current[k] = Math.max(0, enemyHP.current[k] - Math.max(1, pr.damage ?? 5));
                if (enemyHP.current[k] <= 0) flash("💔 Your " + ea.name + " fell.");
                return false;
              }
            }
          } else if (pr.resurrect) {
            // Resurrect staff shot: raise a defeated body it overlaps into a friendly, once. It does
            // no damage and passes through the living / empty space (keeps flying until it hits a body).
            for (const k of Object.keys(lv.enemies || {})) {
              const ep = enemyPos.current[k];
              const ea = findA(lv.enemies[k].enemyId);
              if (!ea || !ep) continue;
              const hp = enemyHP.current[k] === undefined ? (ea.hp ?? 10) : enemyHP.current[k];
              if (!canResurrect(hp, ep)) continue; // must be a dead body that's never been raised
              const eShape = sideBodyShape(ea);
              const eRenderW = enemyRenderW(ea, CW), epw = eRenderW * eShape.fraction;
              const eph = ep && ep.crouch ? enemyCrouchH(ea, CW) : enemyStandH(ea, CW);
              const hitTop = ep.y + eShape.topFrac * eph, hitH = eShape.heightFrac * eph;
              const eHitLeft = ep.x + (eShape.centerFrac * eRenderW - epw / 2);
              if (prLeft < eHitLeft + epw && prLeft + boxW > eHitLeft && prTop < hitTop + hitH && prTop + boxH > hitTop) {
                enemyHP.current[k] = ea.hp ?? 10;          // back on its feet, full HP
                ep.friendly = true; ep.resurrectedOnce = true; ep.stun = 0; ep.attackT = 0; ep.swingT = 0; ep.reactT = 0;
                ep.restedDead = false; // back on its feet — let it fall again if it is ever defeated a second time
                flash("🔮 Raised " + ea.name + " — now fighting for you!");
                return false;
              }
            }
          } else {
          for (const k of Object.keys(lv.enemies || {})) {
            const spawn = lv.enemies[k];
            const ea = findA(spawn.enemyId);
            if (!ea) continue;
            if (enemyHP.current[k] === undefined) enemyHP.current[k] = ea.hp ?? 10;
            if (enemyHP.current[k] <= 0) continue; // already defeated
            const epK = enemyPos.current[k];
            if (epK && epK.friendly) continue; // your own resurrected minion — your shots pass through it
            const eShape = sideBodyShape(ea);
            const eRenderW = enemyRenderW(ea, CW), epw = eRenderW * eShape.fraction;
            const ep = epK;
            const eph = ep && ep.crouch ? enemyCrouchH(ea, CW) : enemyStandH(ea, CW);
            const [er, ec] = k.split(",").map(Number);
            const eLeft = ep ? ep.x : ec * CW + CW / 2 - epw / 2 - (eShape.centerFrac * eRenderW - epw / 2);
            const eTop = ep ? ep.y : (er + 1) * CW - eph;
            const hitTop = eTop + eShape.topFrac * eph, hitH = eShape.heightFrac * eph;
            const eHitLeft = eLeft + (eShape.centerFrac * eRenderW - epw / 2);
            const overlap = prLeft < eHitLeft + epw && prLeft + boxW > eHitLeft && prTop < hitTop + hitH && prTop + boxH > hitTop;
            if (overlap) {
              if (pr.explode) { detonate(pr, boxCx, boxCy); return false; }
              // The weapon's Damage number, flat, whoever pulled the trigger — then the one
              // permitted character difference: an Intelligence crit roll for double.
              const base = playerRangedDamage(pr.damage);
              const isCrit = Math.random() < critChance(intelligence);
              const dmg = isCrit ? base * 2 : base;
              enemyHP.current[k] = Math.max(0, enemyHP.current[k] - dmg);
              if (ep && enemyHP.current[k] > 0 && (pr.stun ?? 0) > 0) { ep.stun = Math.round(pr.stun * 60); ep.reactT = 0; ep.swingT = 0; ep.aimHold = 0; }
              flash((isCrit ? "💥 Critical! " : "🎯 ") + "Hit " + ea.name + " for " + dmg + (enemyHP.current[k] <= 0 ? " — defeated!" : " (" + enemyHP.current[k] + " HP left)"));
              return false; // projectile consumed on impact
            }
          }
          }
          // Ground (or any solid) is what ends a shot now — not the range mark. A shot fired from
          // high up keeps travelling until it actually lands, which is the whole point.
          if (cellsHit(pr.x, pr.y, 2, 2).length) { if (pr.explode) detonate(pr, pr.x, pr.y); return false; }
          return true;
        });
      }

      if (booms.current.length) { for (const b of booms.current) b.life += dtMul; booms.current = booms.current.filter((b) => b.life <= b.maxLife); }

      // Resolve loot in one central pass so fire, melee, bullets, explosions and friendly enemies
      // all get the same single drop roll. A stored null records the failed roll and prevents rerolls.
      for (const k of Object.keys(lv.enemies || {})) {
        if (!(enemyHP.current[k] !== undefined && enemyHP.current[k] <= 0) || Object.prototype.hasOwnProperty.call(enemyDrops.current, k)) continue;
        const [er, ec] = k.split(",").map(Number), ea = findA(lv.enemies[k].enemyId), ep = enemyPos.current[k];
        // Gear is looted off THIS body — only what it actually had equipped. Consumables still
        // come from the whole item pool (a potion isn't something it was wearing).
        const item = rollEnemyItemDrop(allAssets, enemyEquippedGear(ea, findA));
        if (!item) { enemyDrops.current[k] = null; continue; }
        const shape = ea ? sideBodyShape(ea) : { fraction: 1 }, renderW = ea ? enemyRenderW(ea, CW) : CW;
        const hitW = renderW * shape.fraction, standH = ea ? enemyStandH(ea, CH) : CH;
        enemyDrops.current[k] = { item, x: ep ? ep.x + hitW / 2 : ec * CW + CW / 2, y: ep ? ep.y + standH : (er + 1) * CH };
        flash("🎁 " + item.name + " dropped!");
      }

      let curPedKey = null, curDropKey = null, curDoorKey = null;
      const doorHit = doorOverlapping(lv, p.x, p.y, pw, ph, CW, CH);
      const pedHit = doorHit ? null : pedestalOverlapping(lv, p.x, p.y, pw, ph, CW, CH); // a cell is a door OR a pedestal, never both
      const dropHit = (doorHit || pedHit) ? null : enemyDropOverlapping(enemyDrops.current, p.x, p.y, pw, ph, CW);
      if (doorHit) {
        curDoorKey = doorHit.key;
        if (curDoorKey !== lastDoorKey) {
          const tag = doorTagOf(doorHit.marker);
          if (roomReturn.current) setDoorPrompt({ key: curDoorKey, enter: false });        // inside a room → this door leaves
          else setDoorPrompt({ key: curDoorKey, enter: true, tag, n: roomPool(levelLib, tag).length });
          lastDoorKey = curDoorKey;
        }
        if (lastPedestalKey !== null) { setPedPrompt(null); lastPedestalKey = null; }
      } else {
        if (lastDoorKey !== null) { setDoorPrompt(null); lastDoorKey = null; }
        if (pedHit) {
          const mk = pedHit.key, pm = pedHit.marker;
          if (pedestalRolls.current[mk] === undefined) pedestalRolls.current[mk] = rollPedestalItem(allAssets, pm.cats, pm.logic);
          curPedKey = mk;
          if (mk !== lastPedestalKey) {
            const item = pedestalRolls.current[mk];
            if (item) setPedPrompt({ key: mk, name: item.name, type: item.type, slot: item.slot });
            else setPedPrompt({ key: mk, empty: true, summary: pedestalSummary(pm) });
            lastPedestalKey = mk;
          }
        } else if (dropHit) {
          curDropKey = dropHit.key;
          const promptKey = "drop:" + curDropKey, item = dropHit.drop.item;
          if (promptKey !== lastPedestalKey) { setPedPrompt({ key: promptKey, name: item.name, type: item.type, slot: item.slot, dropped: true }); lastPedestalKey = promptKey; }
        } else { curPedKey = null; curDropKey = null; if (lastPedestalKey !== null) { setPedPrompt(null); lastPedestalKey = null; } }
      }
      // Press E on a door to enter (a matching room) or leave (back to the level you came from).
      if (K.interact && !p.wasInteract && curDoorKey && !p.transitioning) {
        if (roomReturn.current) { p.transitioning = { mode: "exit", t: 0 }; }
        else {
          const tag = doorTagOf(lv.markers[curDoorKey]);
          const cacheKey = lv.id + "|" + curDoorKey;
          let roomId = sessionRooms.current[cacheKey];              // a door leads to the SAME room all session
          if (!roomId) { const r = pickRoom(levelLib, tag, playRunId.current + "|" + cacheKey + "|" + tag); roomId = r && r.id; if (roomId) sessionRooms.current[cacheKey] = roomId; }
          if (roomId) { const [dr, dc] = curDoorKey.split(",").map(Number); p.transitioning = { mode: "enter", t: 0, roomId, retX: dc * CW, retY: dr * CH + CH - ph }; }
          else flash(tag ? "🚪 No room tagged \"" + tag + "\" yet — make one in the Room Creator." : "🚪 This is an exit door (blank tag) — it only does something from inside a room.");
        }
      }
      // Press E on a pedestal or dropped item to take it, or swap the one you're already carrying
      // back onto that same spot. Weapons swap the held playtest weapon (playtestWeaponId, which re-keys the loop and
      // keeps the player where they stand); equipment layers its stat/defense/effect boosts onto
      // the player live via mergeEquip, re-keyed by equipGen. Rising-edge so one tap = one swap.
      if (K.interact && !p.wasInteract && (curPedKey || curDropKey)) {
        const pk = curPedKey, drop = curDropKey ? enemyDrops.current[curDropKey] : null;
        const item = drop ? drop.item : pedestalRolls.current[pk];
        const putBack = (next) => {
          if (curDropKey) enemyDrops.current[curDropKey] = { ...drop, item: next || null };
          else { pedestalRolls.current[pk] = next || null; if (next) pedestalDepleted.current.delete(pk); else pedestalDepleted.current.add(pk); }
          lastPedestalKey = null;
        };
        // Taking a body's gear STRIPS it off that body. The corpse is drawn from art that has the
        // garment baked in, so the pieces belonging to what you just took stop rendering — loot the
        // rifle and the body is lying there empty-handed. Keyed by the corpse, and permanent: if you
        // later swap a DIFFERENT item back onto this spot that is a separate object on the ground,
        // not the dead one putting its jacket back on. Consumables were never worn, so they never strip.
        if (curDropKey && item && item.type !== "item") {
          const already = corpseStripped.current[curDropKey] || (corpseStripped.current[curDropKey] = []);
          if (!already.some((a) => a.id === item.id)) already.push(item);
        }
        if (item) {
          if (item.type === "item") {
            // Single-use consumable: apply its effect right now and empty the pedestal (nothing
            // swaps back). Heal restores HP up to your max; a stat item pushes a timed buff that
            // pstats layers in until it expires. No equip, no re-key — the loop already reads pstats.
            const eff = normItemEffect(item.effect);
            if (eff.kind === "heal") {
              const mx = maxPlayerHP(playerAsset), was = playerHP.current;
              playerHP.current = applyHeal(playerHP.current, mx, eff.amount);
              flash("🧪 " + item.name + " · +" + (playerHP.current - was) + " HP (" + playerHP.current + "/" + mx + ")");
            } else {
              itemBuffs.current = pruneBuffs(itemBuffs.current, nowT);
              itemBuffs.current.push({ stat: eff.stat, amount: eff.amount, until: nowT + eff.duration * 1000 });
              flash("🧪 " + item.name + " · +" + eff.amount + " " + (ITEM_STAT_LABEL[eff.stat] || eff.stat) + " for " + eff.duration + "s");
            }
            putBack(null);
          } else if (item.type === "weapon") {
            if (isThrowable(item.wtype)) {
              // Throwables live in their OWN slot (thrown with G), separate from the held gun/melee,
              // so taking one never displaces your weapon — you can carry both. Swap with whatever
              // throwable you were already carrying, and a fresh pickup arrives with 3 (throwPickup).
              const prevId = playtestThrowId, prev = prevId ? findA(prevId) : null;
              putBack(prev);
              throwPickup.current = 3;
              flash("💣 Carrying " + item.name + " ×3" + (prev ? " (put " + prev.name + " back)" : ""));
              setPlaytestThrowId(item.id);
            } else {
              const prevId = playtestWeaponId, prev = prevId ? findA(prevId) : null;
              putBack(prev);
              const wl = isRanged(item.wtype) ? "ranged" : "melee";
              flash("🗡️ Wielding " + item.name + " · " + wl + " · " + (item.damage ?? 5) + " dmg" + (prev ? " (put " + prev.name + " back)" : ""));
              setPlaytestWeaponId(item.id);
            }
          } else {
            // Take it off the slot it fills — or, if that slot's free, off whatever you're wearing
            // that shares a category with it (equipDisplacedSlot), so two same-category items never
            // stack. The one that comes off goes back onto the pedestal; if nothing comes off, the
            // pedestal is now empty and gets marked depleted so it disappears (see the play render).
            const slot = item.slot, offSlot = equipDisplacedSlot(item, equipped.current), prev = offSlot ? equipped.current[offSlot] : null;
            const before = mergeEquip(basePlayerAsset, equipped.current, equippedBodyIdFor(basePlayerAsset));
            const nextMap = { ...equipped.current }; if (offSlot) delete nextMap[offSlot]; nextMap[slot] = item;
            const after = mergeEquip(basePlayerAsset, nextMap, equippedBodyIdFor(basePlayerAsset));
            equipped.current = nextMap;
            putBack(prev);
            const parts = equipEffectSummary(before, after);
            flash("🧥 Equipped " + item.name + (parts.length ? " · " + parts.join(" · ") : " · no stat change") + (prev ? " (put " + prev.name + " back)" : ""));
            playerHP.current = Math.min(playerHP.current, maxPlayerHP(after));
            setEquipGen((g) => g + 1);
          }
        }
      }
      p.wasInteract = !!K.interact;

      // Which connected Front sheet (if any) the player is currently tucked behind — asked of the
      // UNPADDED hitbox, because "am I inside this building" is a question about overlap, not about
      // how far I can see. Pedestals under that same sheet get the wall over them faded just below,
      // so walking into an interior announces what's in it instead of hiding it until you're
      // standing on top of it. Both this flood fill and the pedestal scan are skipped entirely
      // unless the set of covered cells changed — for ordinary play, once entering and once leaving.
      playerCenter.current = { x: p.x + pw / 2, y: p.y + ph / 2 };
      const behindKeys = frontFadeKeys(lv.front, p.x, p.y, pw, ph, CW, CH);
      const behindSig = behindKeys.join("|");
      if (behindSig !== xrayFrontSig.current) {
        xrayFrontSig.current = behindSig;
        const reg = behindKeys.length ? connectedFrontRegion(lv.front, behindKeys) : null;
        const peds = new Set();
        if (reg && reg.size && lv.markers) {
          for (const mk in lv.markers) {
            const mm = lv.markers[mk];
            if (!mm || mm.kind !== "pedestal") continue;
            const [pr0, pc0] = mk.split(",").map(Number);
            if (pedestalCoverKeys(pr0, pc0).some((ck) => reg.has(ck))) peds.add(mk);
          }
        }
        xrayPedKeys.current = peds;
      }
      // Front tiles the player is currently behind go translucent — imperatively, on just the
      // handful of covered cells, because this layer is deliberately memoized for playtest
      // performance and must NOT rebuild every frame. Touch only cells whose state changed.
      if (frontCellsRef.current) {
        // The see-through window (padded), PLUS the wall directly over any x-rayed pedestal. Fading
        // the wall — rather than lifting the pedestal above it — is what lets the item keep its own
        // colours and stay BEHIND the player, exactly like the player's own see-through window.
        const want = new Set(frontFadeKeys(lv.front, p.x, p.y, pw, ph, CW, CH, FRONT_FADE_PAD_CELLS));
        for (const mk of xrayPedKeys.current) {
          const [pr0, pc0] = mk.split(",").map(Number);
          for (const ck of pedestalCoverKeys(pr0, pc0)) if (lv.front[ck]) want.add(ck);
        }
        for (const k of fadedFrontKeys.current) if (!want.has(k)) { const d = frontCellsRef.current.querySelector(`[data-fk="${k}"]`); if (d) d.style.opacity = ""; }
        for (const k of want) if (!fadedFrontKeys.current.has(k)) { const d = frontCellsRef.current.querySelector(`[data-fk="${k}"]`); if (d) d.style.opacity = "0.55"; }
        fadedFrontKeys.current = want;
      }

      // Hide any fire cell that has burned out (life reached 0). Same imperative approach as the
      // Front fade above — the hazard layer is memoized, so we toggle just the elements that
      // changed rather than rebuild it. Only touch keys tracked in hazLife (permanent fires never
      // enter it and so are never hidden).
      if (hazardCellsRef.current) {
        for (const key in hazLife.current) {
          const gone = hazLife.current[key] <= 0;
          const el = hazardCellsRef.current.querySelector(`[data-hk="${key}"]`);
          if (el) { const want = gone ? "none" : ""; if (el.style.display !== want) el.style.display = want; }
        }
      }

      setPframe((f) => (f + 1) % 1000000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); if (myGen === __ptLoopGen) __ptLoopGen++; window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); window.removeEventListener("blur", onBlur);
      // Playtest over (or level/loadout changed): the memoized Front layer lives on, so any cells
      // left faded must be restored by hand or they'd stay see-through back in the editor.
      if (frontCellsRef.current) for (const k of fadedFrontKeys.current) { const d = frontCellsRef.current.querySelector(`[data-fk="${k}"]`); if (d) d.style.opacity = ""; }
      fadedFrontKeys.current = new Set();
      xrayFrontSig.current = ""; xrayPedKeys.current = new Set(); // no stale interior left x-rayed once play stops
      // Fires that burned out during play are only hidden imperatively; the level still has them.
      // Restore every hazard element's display so the editor shows the full painted set again.
      if (hazardCellsRef.current) for (const el of hazardCellsRef.current.querySelectorAll("[data-hk]")) el.style.display = "";
      // NOTE: grenade-spawned fires are transient, but they are NOT stripped here. This cleanup
      // runs on every incidental re-run of the loop (this effect lists `level` in its deps, and
      // a landing grenade calls setLevel to paint its fire) — stripping the fires here deleted
      // each grenade's own flames a frame or two after they landed (that was the "molotov burns
      // for a fraction of a second" bug). The strip now lives in a dedicated effect keyed only on
      // `play`, so it fires exactly once, when Playtest actually stops. See below.
    };
  }, [play, screen, level, playerId, playtestWeaponId, playtestThrowId, playtestThrowCount, equipGen]);
  // Strip grenade-spawned (transient) fires out of the level the moment Playtest STOPS — keyed on
  // `play` alone, so it never runs on the mid-play re-runs a landing grenade's setLevel triggers.
  // Painted fires are untouched; only cells recorded in thrownFireKeys (created by grenades this
  // session) are removed, so they never bleed into the saved design.
  useEffect(() => {
    if (play) return; // only act on the transition INTO the stopped state
    const dropHaz = thrownFireKeys.current, dropProp = thrownPropKeys.current;
    if (!dropHaz.size && !dropProp.size) return;
    thrownFireKeys.current = new Set(); thrownPropKeys.current = new Set();
    setLevel((lv2) => { if (!lv2) return lv2; const { hazard, fx, changed } = stripThrownLanding(lv2.hazard, lv2.fx, [...dropHaz], [...dropProp]); return changed ? { ...lv2, hazard, fx } : lv2; });
  }, [play]);

  useEffect(() => { const up = () => { lpaint.current = null; }; window.addEventListener("pointerup", up); return () => window.removeEventListener("pointerup", up); }, []);

  // Commits a multi-cell ramp on release, as ONE action (one undo step, already snapshotted by
  // the level editor's onPointerDownCapture at the start of the drag). A plain click (never
  // dragged, or dragged back to the anchor cell) falls back to using the brush-size control as
  // the ramp's length, centered on the click — so changing "size" while a ramp shape is active
  // makes one longer, shallower ramp instead of stamping several separate 45° ones. Re-registers
  // whenever the values it reads change, so it can never read a stale lColor/lFgShape/lBrush.
  useEffect(() => {
    const up = () => {
      if (!rampAnchor.current) return;
      const { r, c: c0 } = rampAnchor.current;
      rampAnchor.current = null; setRampDragOn(false);
      let lo, hi;
      if (lHoverCell && lHoverCell.r === r && lHoverCell.c !== c0) { lo = Math.min(c0, lHoverCell.c); hi = Math.max(c0, lHoverCell.c); }
      else { const half = Math.floor((lBrush - 1) / 2); lo = c0 - half; hi = c0 - half + lBrush - 1; }
      const run = hi - lo + 1;
      setLevel((lv) => {
        if (!lv) return lv;
        const targetLayer = lLayer === "bg" ? "bg" : "fg";
        const terrain = { ...lv[targetLayer] };
        for (let c = lo; c <= hi; c++) {
          if (c < 0 || c >= lv.cols) continue;
          const key = cellKey(r, c);
          const shape = terrainPaintShape(targetLayer, lFgShape, lFgUpsideDown, lFgHide, { run, step: c - lo });
          const value = paintValue(lColor, activeTexture, shape);
          // Foreground stacks ramps over its existing collision fills. Background is decorative
          // and remains one fill per cell, so repainting simply replaces its previous visual.
          terrain[key] = targetLayer === "fg" ? mergeFgFill(terrain[key], value) : value;
        }
        return { ...lv, [targetLayer]: terrain };
      });
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [lHoverCell, lLayer, lFgShape, lFgUpsideDown, lFgHide, lColor, lBrush, activeTexture]);

  // Area copy: drag from anchor to a different cell to CAPTURE that rectangle (fg/bg/objects,
  // relative to its own top-left corner) into the clipboard. A plain click with no drag instead
  // STAMPS the existing clipboard, anchored at the clicked cell — so one selection can be
  // stamped down as many times as you like (a hand-painted tree, scattered across a forest)
  // without re-selecting it each time. Only writes cells the clipboard actually has data for,
  // so stamping never blanks out unrelated paint it lands on top of.
  useEffect(() => {
    const up = () => {
      if (!areaAnchor.current) return;
      const anchor = areaAnchor.current;
      areaAnchor.current = null; setAreaDragOn(false);
      const target = lHoverCell;
      if (!target) return;
      if (target.r !== anchor.r || target.c !== anchor.c) {
        const r0 = Math.min(anchor.r, target.r), r1 = Math.max(anchor.r, target.r);
        const c0 = Math.min(anchor.c, target.c), c1 = Math.max(anchor.c, target.c);
        const clip = { w: c1 - c0 + 1, h: r1 - r0 + 1, fg: {}, bg: {}, front: {}, fx: {} };
        for (const ln of ["fg", "bg", "front", "fx"]) {
          const src = (level && level[ln]) || {};
          for (const key of Object.keys(src)) {
            const [r, c] = key.split(",").map(Number);
            if (r >= r0 && r <= r1 && c >= c0 && c <= c1) clip[ln][(r - r0) + "," + (c - c0)] = src[key];
          }
        }
        clipboard.current = clip; setHasClipboard(true);
        flash("📋 Copied " + clip.w + "×" + clip.h + " — click anywhere to stamp it, or drag again to copy something else.");
      } else if (clipboard.current) {
        const clip = clipboard.current;
        setLevel((lv) => {
          if (!lv) return lv;
          const fg = { ...lv.fg }, bg = { ...lv.bg }, front = { ...lv.front }, fx = { ...lv.fx };
          const dest = { fg, bg, front, fx };
          for (const ln of ["fg", "bg", "front", "fx"]) {
            for (const key of Object.keys(clip[ln])) {
              const [dr, dc] = key.split(",").map(Number);
              const rr = target.r + dr, cc = target.c + dc;
              if (rr >= 0 && cc >= 0 && rr < lv.rows && cc < lv.cols) dest[ln][cellKey(rr, cc)] = clip[ln][key];
            }
          }
          return { ...lv, fg, bg, front, fx };
        });
        flash("✅ Stamped " + clip.w + "×" + clip.h + ".");
      } else {
        flash("Drag to select an area to copy first.");
      }
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [lHoverCell, level]);


  useEffect(() => {
    const el = artRef.current; if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => { const r = el.getBoundingClientRect(); if (r.width) setBox({ w: r.width, h: r.height }); });
    ro.observe(el); return () => ro.disconnect();
  }, [screen]);

  // ONE unreadable record must never hide the whole library. This used to be a single try/catch
  // around the entire loop: if any asset's JSON failed to parse — a write truncated by a storage
  // hiccup, a quota failure mid-save — the throw escaped before setLibrary() ever ran, so every
  // other asset silently vanished from the UI at once. All the records were still sitting in
  // storage untouched; nothing had been lost. But an empty library is indistinguishable from lost
  // work, which is about the worst way this can fail for someone with hours of unbacked-up art.
  //
  // Now the index and each record are parsed independently. A record that can't be read is
  // skipped and REPORTED (flash + console.warn with its id) instead of being swallowed, so the
  // other 69 assets still load and the damaged one can be identified and re-saved by hand.
  // Every id actually sitting in storage under a given prefix. localStorage is enumerable, so a
  // lost or truncated index can be rebuilt from what is really on disk. A host-provided
  // window.storage backend has no key listing, so this returns nothing there and the index stays
  // authoritative — the rescue simply does not apply, it never misfires.
  const scanStoredIds = (prefix) => {
    try {
      if (typeof window === "undefined" || window.storage || typeof localStorage === "undefined") return [];
      const out = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) out.push(k.slice(prefix.length));
      }
      return out;
    } catch { return []; }
  };
  // The index is only a POINTER; the asset:<id> records are the actual work. Trusting the index
  // alone means one bad write to that single key hides every asset behind it — the library reads as
  // empty, which is indistinguishable from the art being destroyed, and that is exactly how this has
  // gone wrong twice now. So the index is treated as a hint and the RECORDS are treated as the
  // truth: anything sitting in storage under an asset: key is loaded whether the index mentions it
  // or not, and the index is then rewritten to match what was really found. Purely additive — it
  // can resurrect an orphaned asset, it can never drop one.
  const loadLibrary = async () => {
    setLibraryLoading(true);
    try {
    let list = [];
    try { const idx = await sget("assetIndex"); list = idx ? JSON.parse(idx) : []; } catch { list = []; }
    if (!Array.isArray(list)) list = [];
    const indexed = new Set(list.map((it) => it && it.id).filter(Boolean));
    const orphanIds = scanStoredIds("asset:").filter((id) => !indexed.has(id));
    if (orphanIds.length) list = list.concat(orphanIds.map((id) => ({ id })));
    const full = [], bad = [];
    for (const it of list) {
      const id = it && it.id;
      try {
        const raw = await sget("asset:" + id);
        if (raw === null || raw === undefined) { bad.push((it && it.name) || id); continue; } // indexed but the record is gone
        full.push(migrate(JSON.parse(raw)));
      } catch { bad.push((it && it.name) || id); }
    }
    setLibrary(full);
    // Heal the index so the rescue is permanent rather than repeated every load.
    if (orphanIds.length && full.length) {
      const healed = full.map((x) => ({ id: x.id, name: x.name, type: x.type }));
      await sset("assetIndex", JSON.stringify(healed));
      console.warn("[Bob] recovered " + orphanIds.length + " asset(s) that were in storage but missing from the index:", orphanIds);
      flash("🛟 Recovered " + orphanIds.length + " asset" + (orphanIds.length > 1 ? "s" : "") + " that were in storage but missing from the index — " + full.length + " loaded.");
    }
    if (bad.length) {
      console.warn("[Bob] " + bad.length + " asset record(s) could not be read and were skipped:", bad);
      flash("⚠ " + bad.length + " asset" + (bad.length > 1 ? "s" : "") + " couldn't be read and " + (bad.length > 1 ? "were" : "was") + " skipped — the other " + full.length + " loaded fine. Check the console for which.");
    }
    } finally { setLibraryLoading(false); }
  };
  const loadStamps = async () => {
    try {
      const idx = await sget("stampIndex"); const list = idx ? JSON.parse(idx) : [];
      const full = [];
      for (const e of list) { const raw = await sget("stamp:" + e.id); if (raw) try { full.push(JSON.parse(raw)); } catch { /* skip a corrupt stamp */ } }
      setStamps(full);
    } catch { setStamps([]); }
  };

  const pieces = asset ? (asset.angles[angle] || []) : [];
  const sel = pieces.find((p) => p.id === selId) || null;
  const pickedStamp = stamps.find((s) => s.id === stampPick) || null;
  useEffect(() => { if (stampPick && !stamps.some((s) => s.id === stampPick)) setStampPick(""); }, [stamps, stampPick]);
  // Is a real multi-block group live — more than one member, with the properties panel's anchor
  // inside it? Every group-aware control keys off this one answer instead of re-deriving it.
  const groupSel = groupIds.length > 1 && groupIds.includes(selId);
  // The distinct animation flags across that group, already labelled. A group whose blocks don't
  // agree can then SAY so, rather than showing only the anchor's flag and looking already-set.
  const groupLimbs = groupSel ? [...new Set(pieces.filter((p) => groupIds.includes(p.id)).map((p) => p.limb === "arm" ? "💪 Arm" : p.limb === "leg" ? "🦵 Leg" : "None"))] : [];
  const setPieces = (fn) => setAsset((a) => { if (HAS_FIT_VARIANTS(a) && !effEdit) dirtyGuides.current.add(a.guideId || "default"); return { ...a, angles: { ...a.angles, [angle]: fn(a.angles[angle] || []) } }; });
  // A group is a list of piece IDs, so it must never outlive the pieces it points at. The
  // pose/asset reset below only fires on angle + asset.id — but the live piece list also swaps
  // underneath a group when you change weapon state (rest/fire), switch fit variant, open an
  // effect frame, delete a member, or load a different look. Those left ids in groupIds that no
  // longer exist: the group still *looked* selected (count in the toolbar, Twist hint on screen)
  // while every group op silently skipped the dead ids — the "it still has previous objects
  // grabbed" behaviour. Pruning to what's actually present makes the selection always mean what
  // it says. Keyed on the id signature, so it only fires when the set of pieces really changes.
  const pieceIdSig = pieces.map((p) => p.id).join(",");
  useEffect(() => {
    const live = new Set(pieces.map((p) => p.id));
    setGroupIds((g) => (g.length && g.some((id) => !live.has(id)) ? g.filter((id) => live.has(id)) : g));
    if (selId && !live.has(selId)) setSelId(null);
  }, [pieceIdSig]);
  // Select exactly one piece and nothing else. Used whenever a BRAND NEW block appears (add,
  // duplicate, line, filled shape): a new block is a fresh start, so it must never be swept into
  // whatever group was still selected from earlier work — that's what made a newly spawned square
  // "group itself with the block I was working with prior". Leaving group mode on with a stale
  // member list meant the very next click on the new block appended it to the old group.
  const selectOnly = (id) => { setSelId(id); setGroupIds([]); setMultiSelect(false); };
  // Saved groups: a named set of piece ids for THIS pose, persisted on the asset itself (so it
  // comes back next time this weapon/body/etc. is opened) — separate from groupIds, which is
  // just the live in-progress selection while Group select is on.
  const savedGroups = (asset?.groups && asset.groups[angle]) || [];
  const saveGroup = () => {
    if (groupIds.length < 2) { flash("Select at least 2 blocks first."); return; }
    const name = "Group " + (savedGroups.length + 1);
    setAsset((a) => { const groups = { ...(a.groups || {}) }; groups[angle] = [...(groups[angle] || []), { id: uid(), name, ids: [...groupIds] }]; return { ...a, groups }; });
    flash("Saved as \"" + name + "\" — reload it anytime from the list below.");
  };
  const loadGroup = (g) => {
    const validIds = g.ids.filter((id) => pieces.some((p) => p.id === id));
    // Anchor the selection INSIDE the group being loaded. Without this the properties panel stayed
    // pointed at whatever was selected before — so Twist/resize/flip acted on that leftover block
    // (a group op only fires when the selected piece is itself a member), which read as the loaded
    // group being ignored while an old object was still "grabbed".
    // Add-mode stays OFF for the same reason placeStamp leaves it off — reloading a saved group is
    // "select these", not "start collecting more".
    setMultiSelect(false); setGroupIds(validIds); setSelId(validIds[validIds.length - 1] || null);
    flash(validIds.length + "/" + g.ids.length + " block(s) from \"" + g.name + "\" selected.");
  };
  const deleteGroup = (id) => setAsset((a) => { const groups = { ...(a.groups || {}) }; groups[angle] = (groups[angle] || []).filter((g) => g.id !== id); return { ...a, groups }; });
  // STORED groups ("stamps") are a different thing from the saved groups above. A saved group is
  // a list of piece IDS inside one pose of one asset — reselect-only. A stamp is a deep COPY of
  // the pieces themselves, kept in device storage outside any asset, so the same shirt logo can
  // be dropped into another pose, another body's fit, or a completely different garment. Pieces
  // keep their absolute x/y, so stamping onto each body's variant of the same shirt lands the
  // icon in the same place every time — then nudge it to fit that body.
  // When STORING a group as a stamp, bake out any live mirroring: a piece flagged mirror:true
  // renders a scaleX(-1) twin at render time, and that twin is never a real member of the group —
  // so rotating/resizing the group rotates the original but leaves the twin behaving wrong (the
  // "rotation doesn't work on mirrored items in a group" bug). Replacing each mirrored piece with
  // TWO concrete, independent, non-mirrored pieces — the original plus a real reflected copy —
  // removes all live mirroring, so every stamped piece is a plain block that rotates and scales
  // correctly as part of a group. The reflected copy mirrors geometry (x = W-(x+w)) and negates
  // its own rotation (a mirror reverses spin), matching exactly what the scaleX(-1) twin looked
  // like before, so the baked pair is visually identical to the mirrored original at rest.
  const bakeMirrorOut = (list) => {
    const out = [];
    for (const p of list) {
      if (!p.mirror) { out.push({ ...p, id: uid() }); continue; }
      out.push({ ...p, id: uid(), mirror: false }); // the original, now standalone
      const twinRot = (p.mirrorTwist === false) ? (p.rot || 0) : -(p.rot || 0); // scaleX(-1) reverses rotation unless mirrorTwist pinned it
      out.push({ ...p, id: uid(), mirror: false, x: W - (p.x + p.w), rot: twinRot }); // concrete reflected copy
    }
    return out;
  };
  const storeGroup = async () => {
    if (!groupIds.length) { flash("Select at least 1 block first."); return; }
    const name = (stampName || "").trim() || ("Stamp " + (stamps.length + 1));
    const chosen = pieces.filter((p) => groupIds.includes(p.id));
    const baked = bakeMirrorOut(JSON.parse(JSON.stringify(chosen))); // mirrored pieces become concrete twin pairs so the stamp rotates/scales as one rigid object
    const stamp = { id: uid(), name, savedAt: Date.now(), pieces: baked };
    let list = []; const idx = await sget("stampIndex"); if (idx) try { list = JSON.parse(idx); } catch { list = []; }
    list = list.filter((x) => x.name !== name); list.push({ id: stamp.id, name: stamp.name }); // same name replaces, same as asset saves
    const ok1 = await sset("stamp:" + stamp.id, JSON.stringify(stamp));
    const ok2 = await sset("stampIndex", JSON.stringify(list));
    if (ok1 && ok2) { setStampName(""); setStampPick(stamp.id); loadStamps(); flash("Stored \"" + name + "\" (" + baked.length + " block" + (baked.length === 1 ? "" : "s") + ") — place it into any pose or body. Mirrored parts were baked into real copies so the group rotates as one."); }
    else flash("Couldn't store here — use Download.");
  };
  const placeStamp = (s) => {
    const fresh = s.pieces.map((p) => ({ ...p, id: uid() }));
    setPieces((list) => list.concat(fresh));
    // Land selected AND anchored, so it can be dragged/twisted into place immediately — but with
    // add-mode OFF. Turning it on was the bug: you never asked for Group select, so nothing told
    // you the very next block you grabbed would be swallowed by the stamp's group (and then get
    // dragged around with it, or baked into the next 📦 Store).
    setMultiSelect(false); setGroupIds(fresh.map((p) => p.id)); setSelId(fresh[fresh.length - 1]?.id || null);
    flash("Placed \"" + s.name + "\" — drag to position it. Grab any other block to let go of it.");
  };
  const deleteStamp = async (id) => {
    let list = []; const idx = await sget("stampIndex"); if (idx) try { list = JSON.parse(idx); } catch { list = []; }
    await sdel("stamp:" + id);
    await sset("stampIndex", JSON.stringify(list.filter((x) => x.id !== id)));
    if (stampPick === id) setStampPick("");
    loadStamps();
  };
  const updSel = (patch) => setAsset((a) => { if (HAS_FIT_VARIANTS(a) && !effEdit) dirtyGuides.current.add(a.guideId || "default"); return withRig({ ...a, angles: { ...a.angles, [angle]: (a.angles[angle] || []).map((p) => (p.id === selId ? { ...p, ...patch } : p)) } }); });
  // Which pieces a whole-selection edit touches: every member of a live group, else just the
  // selected piece. Shared by the layering buttons (toFront/toBack) and by updSelAll below.
  const selOrGroupIds = () => (groupSel ? new Set(groupIds) : new Set([selId]));
  // FLAG edits apply to the whole group. An arm drawn as five blocks is one arm, and flagging it
  // meant selecting each block in turn and clicking 💪 five times — with nothing on screen saying
  // that's what was needed, which is exactly the "I can't assign a grouped object to arms" report.
  // Geometry and colour deliberately do NOT come through here: rotate/resize/flip already treat a
  // group as one rigid object about its shared centre, which is a different and correct meaning.
  // A flag has no shared-centre notion — "these blocks are the arm" is simply true of each one —
  // so for flags the right group behaviour is to set them all.
  // `only` narrows it to the members the flag actually means something for — the shoulder side is
  // an arm's property, so grouping an arm with the torso it's drawn over must not stamp an armPivot
  // onto the torso. Omitted = every member.
  const updSelAll = (patch, only) => setAsset((a) => {
    if (HAS_FIT_VARIANTS(a) && !effEdit) dirtyGuides.current.add(a.guideId || "default");
    const ids = selOrGroupIds();
    return withRig({ ...a, angles: { ...a.angles, [angle]: (a.angles[angle] || []).map((p) => (ids.has(p.id) && (!only || only(p)) ? { ...p, ...patch } : p)) } });
  });
  // Which blocks the colour controls are about to repaint. A continuation of the edit already in
  // progress reuses the group it froze; anything else resolves a fresh one from the live asset.
  // "Continuation" is: same selected block, and it is still wearing a shade this edit painted (or
  // the one it started on). That deliberately survives more than a drag — click blue, then click
  // green, and the green lands on the blue group rather than on everything that happens to be red
  // now. Repaint the block by itself in between, though, and its colour is one this edit never
  // painted, so the next group edit re-resolves from what is actually on screen.
  const colorGroupFor = (from) => {
    const f = from.toLowerCase(), g = colorGroup.current;
    if (g && g.selId === selId && g.seen.has(f)) return g;
    return { ...assetColorGroup(asset, from), selId, seen: new Set([f]) };
  };
  // Setting a block's color with "Change this color everywhere" on repaints every block that
  // shared that exact color when the edit began — all 5 poses, a weapon's rest AND fire states,
  // and every per-body fit under .variants — instead of just the selected one. Only the fill
  // changes; outline color, glow color and emoji tints are untouched, so a shade that's merely
  // CLOSE to the old one is left for Blake to catch by hand rather than silently flattened.
  const applyPieceColor = (c) => {
    const from = sel && sel.color;
    if (!recolorAll || !from || effEdit || (sel && sel.kind === "emoji") || c === from) { updSel({ color: c }); return; }
    const g = colorGroupFor(from);
    g.seen.add(c.toLowerCase());
    colorGroup.current = { ...g, from: c.toLowerCase() }; // the group's colour moves with it, for id-less legacy pieces
    setAsset((a) => { if (HAS_FIT_VARIANTS(a) && !effEdit) dirtyGuides.current.add(a.guideId || "default"); return withRig(recolorAssetGroup(a, g, c)); });
  };
  // Skin-palette remap: repaint one of the skin's colours everywhere it appears. palGroup.current
  // remembers, per original swatch, the blocks that swatch resolved to — so dragging a colour input
  // (which fires repeatedly) keeps repainting those same blocks instead of re-asking what is
  // currently that colour and picking up whatever the drag has passed over, and a mobile colour
  // dialog (one final value) just does a single clean remap.
  const remapPalette = (orig, to) => {
    if (!orig || !to) return;
    const g = palGroup.current[orig] || assetColorGroup(asset, orig);
    palGroup.current[orig] = { ...g, from: to.toLowerCase() };
    if (g.from === to.toLowerCase()) return;
    setAsset((a) => { if (HAS_FIT_VARIANTS(a) && !effEdit) dirtyGuides.current.add(a.guideId || "default"); return withRig(recolorAssetGroup(a, g, to)); });
  };
  // Twisting one piece while a group is selected turns the WHOLE group together, like one rigid
  // object (e.g. a machete's blade + handle + guard) — not just the single piece the Twist
  // control happens to be bound to. Every group member's own rot turns by the same delta, and
  // their positions swing around the group's shared center so the pieces stay correctly arranged
  // relative to each other instead of each just spinning in place around its own center.
  //
  // The whole transform (position AND rotation) is computed as ONE absolute step from a frozen
  // `baseline` snapshot of the group taken at the start of this call — never incrementally on
  // top of whatever's already in state. That matters because the Twist slider fires onChange
  // continuously while dragged, and React can queue several of those calls before this
  // component actually re-renders (so `pieces`/`sel` in the closure stay stale across them).
  // Reading each member's rotation back out of the live `ps` array (as this used to) meant a
  // member's rot would pick up an earlier queued call's delta and then have a fresh delta added
  // on top of that — double- (or triple-) rotating it — while position, computed fresh from the
  // frozen closure each time, still snapped straight to the correct spot. Rotation and position
  // disagreeing like that is exactly what made a twisted group look like it had come apart: each
  // piece still landed in the right place, just facing the wrong way, so the assembly read as
  // broken instead of turned. Keying rot off the same frozen baseline as position makes every
  // call idempotent — it always lands on the one correct final state regardless of how many
  // intermediate calls happened first.
  //
  // Second, positions must move each piece's VISUAL pivot — the exact point shapeStyle hands to
  // CSS as transform-origin — not its box center. They're the same for most pieces, but arm
  // pieces (role weaponArm, or limb:"arm" that isn't a shoe — e.g. a weapon piece flagged to
  // track the arm) spin around their shoulder EDGE, top or bottom per armPivot. For those, the
  // box math can be perfectly self-consistent while the rendered piece, pivoting somewhere else,
  // swings clean out of formation — worse the further the twist — which is exactly the "each
  // part twists on its own instead of the group turning as one" look. Same pivot-mismatch trap
  // attachWeaponBlocks already documents; the group math has to respect it too.
  const groupVisPivot = (p) => {
    if (p.role === "weaponArm" || (p.limb === "arm" && !p._isShoe)) return armShoulderPoint(p);
    return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
  };
  const updSelRot = (newRot) => {
    if (!groupSel) { updSel({ rot: newRot }); return; }
    const oldRot = sel.rot || 0;
    const delta = ((newRot - oldRot + 180) % 360 + 360) % 360 - 180; // shortest-path, so dragging across the 0/360 wrap doesn't spin the long way
    const members = pieces.filter((p) => groupIds.includes(p.id));
    const cx = members.reduce((s, p) => s + p.x + p.w / 2, 0) / members.length;
    const cy = members.reduce((s, p) => s + p.y + p.h / 2, 0) / members.length;
    const rad = delta * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    const baseline = new Map(members.map((p) => [p.id, p]));
    setPieces((ps) => ps.map((p) => {
      const base = baseline.get(p.id);
      if (!base) return p;
      const piv = groupVisPivot(base);
      const dx = piv.x - cx, dy = piv.y - cy;
      const nx = cx + dx * cos - dy * sin, ny = cy + dx * sin + dy * cos;
      const nrot = p.id === selId ? newRot : (((base.rot || 0) + delta) % 360 + 360) % 360;
      return { ...p, rot: nrot, x: base.x + (nx - piv.x), y: base.y + (ny - piv.y) };
    }));
  };
  // Resizing while a group is selected scales the WHOLE group like one object: every member's
  // width/height AND its distance from the group's shared centre scale by the same factor, so the
  // pieces keep their relative arrangement (a machete's blade + handle grow together and stay
  // attached) instead of only the one anchor piece changing. `dim` is "w" or "h"; the scale is
  // derived from the anchor piece's requested new size vs. its current size, then applied to both
  // dimensions of every member (uniform scale — the natural feel of dragging a group corner). A
  // single-piece selection just resizes that one piece on the one axis, exactly as before.
  const updSelSize = (dim, val) => {
    if (!sel) return;
    if (!groupSel) { updSel({ [dim]: Math.max(1, Math.round(val)) }); return; }
    const cur = dim === "w" ? sel.w : sel.h;
    const scale = Math.max(0.05, val / Math.max(1, cur));
    const members = pieces.filter((p) => groupIds.includes(p.id));
    const scaled = new Map(scalePieceGroup(members, scale).map((p) => [p.id, p]));
    setPieces((ps) => ps.map((p) => {
      const geometry = scaled.get(p.id);
      return geometry ? { ...p, x: geometry.x, y: geometry.y, w: geometry.w, h: geometry.h } : p;
    }));
  };
  // Brightness / glow / fade obey the same "Change this color everywhere" toggle the swatches
  // do — checking it and then dragging Brightness dims every block sharing this one's color,
  // across all 5 poses and every body fit, instead of only the selected block. Same exclusions
  // as applyPieceColor: an emoji has a tint rather than a fill color, and effect-editing mode
  // works on its own piece list, so both fall back to editing just the selection.
  const updFx = (patch) => {
    const from = sel && sel.color;
    if (!recolorAll || !from || effEdit || (sel && sel.kind === "emoji")) { setPieces((ps) => ps.map((p) => (p.id === selId ? { ...p, fx: { ...defaultFx(), ...(p.fx || {}), ...patch } } : p))); return; }
    const g = colorGroupFor(from); // the same frozen group the swatches repaint, so both controls keep meaning one thing
    colorGroup.current = g;
    setAsset((a) => { if (HAS_FIT_VARIANTS(a) && !effEdit) dirtyGuides.current.add(a.guideId || "default"); return withRig(restyleAssetGroup(a, g, patch)); });
  };
  // Horizontally mirror the selection like one rigid object (a "flip orientation" for a grouped
  // prop). Three parts, which together are exactly scaleX(-1) about the group's vertical centre:
  // reflect every member's box across that centre; negate each one's rotation (a mirror reverses
  // spin); and flip the SILHOUETTE of any asymmetric polygon (a half-triangle, a hand-drawn poly)
  // by mapping its normalized points x -> 1-x so it truly faces the other way. Vertically-symmetric
  // shapes (rect, circle, isoceles triangle, pentagon, hexagon…) are their own mirror image, so
  // their kind is left untouched. A single-piece selection flips just that piece, in place.
  const flipSelH = () => {
    if (!sel) return;
    const members = groupSel ? pieces.filter((p) => groupIds.includes(p.id)) : [sel];
    const cx = members.reduce((s, p) => s + p.x + p.w / 2, 0) / members.length;
    const ids = new Set(members.map((p) => p.id));
    const flipped = new Map(flipPiecesHorizontally(members, cx).map((p) => [p.id, p]));
    setPieces((ps) => ps.map((p) => ids.has(p.id) ? flipped.get(p.id) : p));
  };
  const pmirror = (p, ang) => p && p.mirror && ang !== "side";

  /* ---- pointer ---------------------------------------------------------- */
  const toXY = (e) => { const r = artRef.current.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
  const grabPiece = (e, p) => {
    e.stopPropagation();
    if (eyedrop) {
      if (!p.color) { flash("That block has no fill color (emoji) — click a colored block."); return; }
      setNewColor(p.color); addRecent(p.color); setNewFx({ ...defaultFx(), ...(p.fx || {}) }); setEyedrop(false); flash("Picked up color + brightness/glow/fade 🎨");
      return;
    }
    // A live group DRAGS AS ONE whether or not Group-select mode is still on — grabbing a member is
    // always "move this group". Only ADDING a block on touch needs the mode, which is the whole
    // point: placing a stored group leaves it selected but NOT in add-mode, so the next block you
    // reach for is yours to move, not another member swept into the group behind your back.
    if (groupIds.includes(p.id)) {
      setSelId(p.id); // shows the properties panel (Twist, etc.) for this piece — without this, building a group from scratch left nothing selected and the whole panel (including Twist) never appeared at all
      // This could be a plain tap (toggle it back OUT, in add-mode) or the start of a drag that
      // should move the WHOLE group. Can't tell which yet from pointerdown alone, so stash every
      // group member's starting x/y and decide in the pointerup handler below based on whether the
      // pointer actually moved.
      const m = toXY(e);
      drag.current = { mode: "groupMove", anchorId: p.id, startMouse: m, moved: false, starts: pieces.filter((pc) => groupIds.includes(pc.id)).map((pc) => ({ id: pc.id, x: pc.x, y: pc.y })) };
      return;
    }
    if (multiSelect) { setSelId(p.id); setGroupIds((g) => [...g, p.id]); return; }
    // Outside add-mode, reaching for a block that isn't in the group ENDS the group — the same
    // fresh-start rule selectOnly applies to a brand new block. Otherwise a group left over from a
    // stamp keeps quietly re-grouping whatever you touch next.
    if (groupIds.length) setGroupIds([]);
    // `base` is the block's size/angle at the moment it was picked up. Snap re-derives its result
    // from these every frame rather than from the block's current values — see the move handler.
    setSelId(p.id); const m = toXY(e); drag.current = { mode: "move", id: p.id, dx: m.x - p.x, dy: m.y - p.y, base: { w: p.w, h: p.h, rot: p.rot || 0 } };
  };
  const grabCorner = (e, p) => {
    e.stopPropagation(); setSelId(p.id);
    const m = toXY(e);
    const gm = (groupIds.length > 1 && groupIds.includes(p.id)) ? pieces.filter((q) => groupIds.includes(q.id)) : null;
    const bounds = gm ? pieceGroupBounds(gm) : null;
    const group = gm ? {
      base: gm.map((q) => ({ id: q.id, x: q.x, y: q.y, w: q.w, h: q.h })),
      cx: bounds.cx, cy: bounds.cy,
      startRadius: Math.max(1, Math.hypot(m.x - bounds.cx, m.y - bounds.cy)),
    } : null;
    drag.current = { mode: "size", id: p.id, rot: p.rot || 0, startW: p.w, startH: p.h, startMouse: m, group };
  };
  const grabHand = (e) => { e.stopPropagation(); drag.current = { mode: "hand" }; };

  // Light up the edge a drag is currently snapping to. Called on every pointermove, so it compares
  // an identity first: without that, each frame handed React a brand new {a,b} object and forced a
  // re-render of the whole canvas even while the snap target hadn't changed.
  const showSnapMark = (hit) => {
    const key = hit ? hit.targetId + ":" + hit.targetEdge.a.x + "," + hit.targetEdge.a.y + "," + hit.targetEdge.b.x + "," + hit.targetEdge.b.y : null;
    if (key === snapMarkKey.current) return;
    snapMarkKey.current = key;
    setSnapMark(hit ? { a: hit.targetEdge.a, b: hit.targetEdge.b } : null);
  };
  // Blocks a drag is allowed to snap ONTO: everything in this pose except the block(s) being
  // dragged, and except the non-art markers canEdgeSnap already rules out.
  const snapTargets = (movingIds) => pieces.filter((p) => !movingIds.has(p.id) && canEdgeSnap(p));

  useEffect(() => {
    const move = (e) => {
      const d = drag.current; if (!d || !artRef.current) return;
      const m = toXY(e);
      if (d.mode === "hand") { setAsset((a) => { if (HAS_FIT_VARIANTS(a) && !effEdit) dirtyGuides.current.add(a.guideId || "default"); return { ...a, hand: { ...a.hand, [angle]: { x: snapPiece(m.x), y: snapPiece(m.y) } } }; }); return; }
      if (d.mode === "groupMove") {
        const dx = m.x - d.startMouse.x, dy = m.y - d.startMouse.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) d.moved = true; // past a tiny jitter threshold — this is a real drag, not a tap
        const startMap = new Map(d.starts.map((s) => [s.id, s]));
        // A held group snaps by SLIDING only (findGroupEdgeSnap) — turning or resizing it to suit
        // one member's edge would pull the rest of the assembly apart. Same rule as the single
        // block above: the candidate is rebuilt from the pick-up positions every frame, so the
        // group is free to slide off a snap again instead of sticking to the first edge it meets.
        let gx = 0, gy = 0;
        if (snapOn) {
          const movingIds = new Set(d.starts.map((s) => s.id));
          const moved = pieces.filter((p) => movingIds.has(p.id)).map((p) => { const st = startMap.get(p.id); return { ...p, x: snapPiece(st.x + dx), y: snapPiece(st.y + dy) }; });
          const hit = findGroupEdgeSnap(moved, snapTargets(movingIds));
          showSnapMark(hit);
          if (hit) { gx = hit.dx; gy = hit.dy; }
        }
        setAsset((a) => {
          if (HAS_FIT_VARIANTS(a) && !effEdit) dirtyGuides.current.add(a.guideId || "default");
          const list = a.angles[angle] || [];
          const next = list.map((p) => { const st = startMap.get(p.id); return st ? { ...p, x: SNAP_R3(snapPiece(st.x + dx) + gx), y: SNAP_R3(snapPiece(st.y + dy) + gy) } : p; });
          return withRig({ ...a, angles: { ...a.angles, [angle]: next } });
        });
        return;
      }
      // Moving ONE block, with 🧲 Snap on. The block tracks the pointer using the size and angle it
      // had when it was picked up (d.base), and the snap is recomputed from THAT every frame —
      // never from where the previous frame left it. Feeding an already-snapped block back in as
      // the next frame's input welds it to the first edge it ever brushed: it reads as perfectly
      // aligned forever after, so the snap can never release and the block can't be dragged away.
      if (d.mode === "move" && snapOn) {
        const cur = pieces.find((p) => p.id === d.id);
        if (cur) {
          const base = d.base || { w: cur.w, h: cur.h, rot: cur.rot || 0 };
          const raw = { ...cur, w: base.w, h: base.h, rot: base.rot, x: snapPiece(m.x - d.dx), y: snapPiece(m.y - d.dy) };
          const hit = findEdgeSnap(raw, snapTargets(new Set([d.id])));
          showSnapMark(hit);
          const placed = applyEdgeSnap(raw, hit);
          setAsset((a) => {
            if (HAS_FIT_VARIANTS(a) && !effEdit) dirtyGuides.current.add(a.guideId || "default");
            const list = a.angles[angle] || [];
            // Geometry only — `placed` is built from a render-old copy of the block, so writing it
            // wholesale would stamp stale colour/flags over anything else that changed meanwhile.
            return withRig({ ...a, angles: { ...a.angles, [angle]: list.map((p) => (p.id === d.id ? { ...p, x: placed.x, y: placed.y, w: placed.w, h: placed.h, rot: placed.rot } : p)) } });
          });
          return;
        }
      }
      if (d.mode === "size" && d.group) {
        // Distance from the WHOLE group's centre gives one stable scale regardless of how tiny the
        // anchor piece became. The old 6px anchor clamp made a once-shrunk group jump larger on the
        // next drag and prevented it from ever returning to the same small size.
        const scale = Math.hypot(m.x - d.group.cx, m.y - d.group.cy) / d.group.startRadius;
        const scaledMap = new Map(scalePieceGroup(d.group.base, scale, { x: d.group.cx, y: d.group.cy }).map((b) => [b.id, b]));
        setAsset((a) => {
          if (HAS_FIT_VARIANTS(a) && !effEdit) dirtyGuides.current.add(a.guideId || "default");
          const list = a.angles[angle] || [];
          const next = list.map((p) => {
            const b = scaledMap.get(p.id);
            return b ? { ...p, x: b.x, y: b.y, w: b.w, h: b.h } : p;
          });
          return withRig({ ...a, angles: { ...a.angles, [angle]: next } });
        });
        return;
      }
      setAsset((a) => {
        if (HAS_FIT_VARIANTS(a) && !effEdit) dirtyGuides.current.add(a.guideId || "default");
        const list = a.angles[angle] || [];
        const next = list.map((p) => {
          if (p.id !== d.id) return p;
          if (d.mode === "move") return { ...p, x: snapPiece(m.x - d.dx), y: snapPiece(m.y - d.dy) };
          // Un-rotate the drag delta into the piece's own local axes (inverse of the CSS
          // rotate() the piece itself renders with) before applying it to w/h — dragging
          // "along the shape's own wider direction" now actually makes it wider, whichever way
          // that direction currently points on screen, instead of always growing along the raw
          // canvas x/y axes regardless of rotation.
          const rad = -d.rot * Math.PI / 180;
          const dxC = m.x - d.startMouse.x, dyC = m.y - d.startMouse.y;
          const dxL = dxC * Math.cos(rad) - dyC * Math.sin(rad);
          const dyL = dxC * Math.sin(rad) + dyC * Math.cos(rad);
          return { ...p, w: Math.max(MIN_PIECE_SIZE, snapPiece(d.startW + dxL)), h: Math.max(MIN_PIECE_SIZE, snapPiece(d.startH + dyL)) };
        });
        return withRig({ ...a, angles: { ...a.angles, [angle]: next } });
      });
    };
    const up = () => {
      const d = drag.current;
      // A tap that didn't move toggles the block back OUT — but only in add-mode. Outside it, a tap
      // on a member just anchors the panel there; dropping it from the group would make a placed
      // stamp fall apart the moment you tapped one of its blocks.
      if (d && d.mode === "groupMove" && !d.moved && multiSelect) setGroupIds((g) => g.filter((id) => id !== d.anchorId));
      drag.current = null;
      showSnapMark(null); // the green target line belongs to the drag, not to the result
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  });

  /* ---- block actions ---------------------------------------------------- */
  const addBlock = (kind, char, extra) => {
    const w = kind === "emoji" ? 40 : 44, h = 44;
    const p = { id: uid(), kind, x: Math.round(W / 2 - w / 2), y: Math.round(H / 2 - h / 2), w, h, color: newColor, mirror: false, char: kind === "emoji" ? (char || emoji) : undefined, fx: { ...newFx }, ...(extra || {}) };
    setPieces((ps) => [...ps, p]); selectOnly(p.id); flash("Added — now drag it anywhere.");
  };
  const addText = () => {
    const w = 90, h = 24;
    const p = { id: uid(), kind: "text", text: "TEXT", font: TEXT_FONTS[0][0], x: Math.round(W / 2 - w / 2), y: Math.round(H / 2 - h / 2), w, h, color: newColor, mirror: false, fx: { ...newFx } };
    setPieces((ps) => [...ps, p]); selectOnly(p.id); flash("Text added — type your text and pick a font in the panel below.");
  };
  // Weapon-only: a collision box, separate from the weapon's visual pieces. Blake's own words —
  // emoji-based art has "weird quirks" as a hit-detection shape, so damage is checked against
  // this manually-placed rect instead, regardless of what the weapon looks like. Rendered as a
  // distinct dashed box in the editor (see shapeStyle's isHitbox branch); invisible everywhere
  // the weapon is actually drawn as art (Dress Bob, Playtest) — filtered out at those call sites.
  const addHitbox = () => {
    const w = 50, h = 50;
    const p = { id: uid(), kind: "rect", x: Math.round(W / 2 - w / 2), y: Math.round(H / 2 - h / 2), w, h, color: "#ff3c3c", mirror: false, isHitbox: true };
    setPieces((ps) => [...ps, p]); selectOnly(p.id); flash("Hitbox added — drag/resize it to cover the weapon's business end. Invisible in-game; only used for damage.");
  };
  // Ranged-only: the point shots come out of. Read from the weapon's REST art (the pose the gun
  // is actually held in when it fires), so draw it there — one per pose is enough. It rides the
  // arm through the same attach math the art does, so the shot always leaves the barrel tip at
  // the barrel's height, whatever the aim.
  const addMuzzle = () => {
    const w = 16, h = 16;
    const p = { id: uid(), kind: "circle", x: Math.round(W / 2 - w / 2), y: Math.round(H / 2 - h / 2), w, h, color: "#42d6ff", mirror: false, isMuzzle: true };
    setPieces((ps) => [...ps, p]); selectOnly(p.id); flash("Muzzle added — drag it to the barrel tip (or wherever shots should appear). Invisible in-game.");
  };
  // Line tool: click a start point, then an end point — instead of manually dragging/resizing/
  // twisting a Square into a thin rotated bar, the two clicks directly compute its length and
  // angle. It's still a completely ordinary "rect" piece afterward (color, outline, fx, resize,
  // rotate all just work), only the CREATION step is different.
  const addLine = (p1, p2) => {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const length = Math.max(6, Math.round(Math.hypot(dx, dy)));
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const thickness = 5;
    const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
    const piece = { id: uid(), kind: "rect", x: Math.round(midX - length / 2), y: Math.round(midY - thickness / 2), w: length, h: thickness, rot: Math.round(angle * 10) / 10, color: newColor, mirror: false, fx: { ...newFx } };
    setPieces((ps) => [...ps, piece]); selectOnly(piece.id);
    flash("Line added — drag its resize handle to change length/thickness, Twist to re-angle it.");
  };
  // Fill tool: click 3+ points to outline an arbitrary angled shape (a lapel, a diagonal cuff,
  // an angular collar — anything Square/Circle/Triangle can't approximate), then Finish bakes
  // those clicks into a "poly" piece: a bounding box (x,y,w,h) plus the clicked points stored as
  // 0–1 FRACTIONS of that box. Resize/rotate/drag then all work exactly like any other piece —
  // scaling the box automatically rescales the polygon with it, no special-casing needed.
  const finishFill = () => {
    if (fillPts.length < 3) { flash("Need at least 3 points to fill a shape."); return; }
    const xs = fillPts.map((q) => q.x), ys = fillPts.map((q) => q.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = Math.max(6, Math.round(maxX - minX)), h = Math.max(6, Math.round(maxY - minY));
    const points = fillPts.map((q) => [(q.x - minX) / (maxX - minX || 1), (q.y - minY) / (maxY - minY || 1)]);
    const piece = { id: uid(), kind: "poly", points, x: Math.round(minX), y: Math.round(minY), w, h, color: newColor, mirror: false, fx: { ...newFx } };
    setPieces((ps) => [...ps, piece]); selectOnly(piece.id); setFillPts([]); setDrawMode(null);
    flash("Filled shape added — drag/resize/rotate it like any other block.");
  };
  const cancelDraw = () => { setDrawMode(null); setLinePt1(null); setFillPts([]); };
  // Routes a click on the .art canvas to whichever draw tool is active, instead of the normal
  // "tap empty space to deselect" behavior — only intercepts while Line or Fill is actually on.
  const handleArtClick = (e) => {
    if (!drawMode) { setSelId(null); return; }
    const m = toXY(e);
    if (drawMode === "line") {
      if (!linePt1) setLinePt1(m);
      else { addLine(linePt1, m); setLinePt1(null); setDrawMode(null); }
    } else if (drawMode === "fill") {
      setFillPts((pts) => [...pts, m]);
    }
  };
  const duplicate = () => {
    if (!sel) return;
    const sourceIds = groupSel ? groupIds : [selId];
    const sourcePieces = pieces.filter((piece) => sourceIds.includes(piece.id));
    const copies = duplicateSelectedPieces(pieces, sourceIds, uid);
    if (!copies.length) return;
    setPieces((ps) => [...ps, ...copies]);
    if (groupSel) {
      const copiedIdBySource = new Map(sourcePieces.map((piece, i) => [piece.id, copies[i].id]));
      setGroupIds(copies.map((piece) => piece.id));
      setSelId(copiedIdBySource.get(selId) || copies[copies.length - 1].id);
      setMultiSelect(false);
      flash("Copied group — " + copies.length + " blocks.");
    } else {
      selectOnly(copies[0].id);
      flash("Copied block with its effects.");
    }
  };
  const remove = () => {
    if (!sel) return;
    const ids = selOrGroupIds();
    const deletable = pieces.filter((p) => ids.has(p.id) && !p.locked);
    if (!deletable.length) { flash("This block is needed for the game — can't delete it (you can still edit it)."); return; }
    setPieces((ps) => removePieceSelection(ps, ids));
    setGroupIds((g) => g.filter((id) => !ids.has(id)));
    setSelId(null);
    if (groupSel) flash("Deleted grouped prop — " + deletable.length + " blocks removed together.");
  };
  // Send to front / back moves the WHOLE group when one is selected, not just the block that
  // happens to be the anchor — sending one member of a bush's leaf cluster forward while the rest
  // stayed put was the "it only sends the object you clicked" bug. The members' order RELATIVE to
  // each other is preserved (they travel as one slab), and everything else keeps its order too.
  const layerIds = selOrGroupIds;
  const toFront = () => { if (!sel) return; const ids = layerIds(); setPieces((ps) => [...ps.filter((p) => !ids.has(p.id)), ...ps.filter((p) => ids.has(p.id))]); };
  const toBack = () => { if (!sel) return; const ids = layerIds(); setPieces((ps) => [...ps.filter((p) => ids.has(p.id)), ...ps.filter((p) => !ids.has(p.id))]); };
  const movePiece = (id, dir) => setPieces((ps) => { const i = ps.findIndex((p) => p.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= ps.length) return ps; const a = ps.slice();[a[i], a[j]] = [a[j], a[i]]; return a; });
  // Copy the current pose onto CHOSEN other poses. `targets` is the explicit list to overwrite;
  // passing none keeps the old behaviour of every other pose this type exposes. Copying is
  // destructive to whatever was in the target, which is exactly why picking targets matters —
  // "copy to other poses" used to also flatten Death and Attack, so using it late in a build
  // wiped poses you'd already finished.
  const copyAngle = (targets) => setAsset((a) => {
    const want = copyAngleTargets(editablePoses(a.type, a.wtype), angle, targets);
    if (!want.length) return a;
    if (HAS_FIT_VARIANTS(a) && !effEdit) dirtyGuides.current.add(a.guideId || "default");
    const src = a.angles[angle] || [];
    const next = { ...a.angles };
    const srcGroups = (a.groups && a.groups[angle]) || [];
    const groups = { ...(a.groups || {}) };
    for (const ag of want) {
      const idMap = new Map();
      next[ag] = src.map((p) => { const nid = uid(); idMap.set(p.id, nid); return { ...p, id: nid }; });
      groups[ag] = srcGroups.map((g) => ({ ...g, id: uid(), ids: g.ids.map((oid) => idMap.get(oid)).filter(Boolean) })).filter((g) => g.ids.length > 1);
    }
    return { ...a, angles: next, groups };
  });
  // "copy to other poses" is a SUBMENU rather than one destructive button. Copying overwrites the
  // target outright, and the old one-click version hit EVERY other pose — so reaching for it after
  // you'd already drawn Attack or Death silently flattened them. Now you tick exactly which poses
  // to overwrite. Each row says whether that pose is empty or how many blocks it would lose, so
  // the destructive ones are visible before you commit. Nothing copies until Copy is pressed, and
  // the ticks reset every time the menu opens so a stale selection can't fire by accident.
  const copyTargets = asset ? editablePoses(asset.type, asset.wtype).filter((ag) => ag !== angle) : [];
  const closeCopyTo = () => { setCopyToOpen(false); setCopyToPicked([]); };
  const runCopyTo = () => {
    const n = copyToPicked.length;
    if (!n) return;
    copyAngle(copyToPicked);
    flash("Copied " + ALABEL[angle] + " onto " + n + " pose" + (n > 1 ? "s" : "") + " ✓");
    closeCopyTo();
  };
  // The Abilities picker. Lives here rather than inline in the ranged panel because MELEE weapons
  // get the same control now — only the offered list differs (weaponAbilitiesFor).
  const abilityCard = () => {
    const kinds = weaponAbilitiesFor(asset.wtype, asset);
    const on = weaponAbilityKeys(asset).filter((k) => kinds.includes(k));
    const addable = kinds.filter((k) => !on.includes(k));
    return (
      <div className="abilcard">
        <div className="abilbar">
          <span className="wslab">Abilities:</span>
          {addable.length > 0 ? (
            <select className="abilAdd" value="" onChange={(e) => { const k = e.target.value; if (k) setAsset((a) => ({ ...a, ...WEAPON_ABILITIES[k].on })); e.target.value = ""; }}>
              <option value="">＋ Add an ability…</option>
              {addable.map((k) => <option key={k} value={k}>{WEAPON_ABILITIES[k].icon} {WEAPON_ABILITIES[k].label}</option>)}
            </select>
          ) : <span className="hint2">All {kinds.length} are on this weapon.</span>}
          {on.length === 0 && <span className="hint2">None</span>}
        </div>
        {on.map((k) => (
          <div key={k} className="abilrow">
            <div className="abilhead"><b>{WEAPON_ABILITIES[k].icon} {WEAPON_ABILITIES[k].label}</b><button className="ltbtn abilx" onClick={() => setAsset((a) => ({ ...a, ...WEAPON_ABILITIES[k].off }))} title={"Remove " + WEAPON_ABILITIES[k].label}>✕ Remove</button></div>
            {k === "stun" && (
              <label className="slider">Freeze for<input type="range" min="0.25" max="5" step="0.25" value={asset.stun || DEFAULT_STUN_SECS} onChange={(e) => setAsset((a) => ({ ...a, stun: +e.target.value }))} /><span className="hint2">{(asset.stun || DEFAULT_STUN_SECS)}s</span></label>
            )}
            {k === "burstFire" && (<>
              <label className="slider">Rounds per burst<input type="range" min="2" max="10" step="1" value={Math.max(2, burstShotCount(asset.burst))} onChange={(e) => setAsset((a) => ({ ...a, burst: +e.target.value }))} /><span className="hint2">{Math.max(2, burstShotCount(asset.burst))} rounds per press</span></label>
              <label className="slider">Burst spacing<input type="range" min="0.02" max="0.3" step="0.01" value={asset.burstDelay ?? DEFAULT_BURST_DELAY} onChange={(e) => setAsset((a) => ({ ...a, burstDelay: +e.target.value }))} /><span className="hint2">{(asset.burstDelay ?? DEFAULT_BURST_DELAY).toFixed(2)}s apart · salvo {(((Math.max(2, burstShotCount(asset.burst)) - 1) * (asset.burstDelay ?? DEFAULT_BURST_DELAY))).toFixed(2)}s</span></label>
            </>)}
            {k === "explode" && (<>
              <label className="slider">Blast radius<input type="range" min="1" max="5" step="0.5" value={asset.explodeRadius ?? 2} onChange={(e) => setAsset((a) => ({ ...a, explodeRadius: +e.target.value }))} /><span className="hint2">{(asset.explodeRadius ?? 2)} cells</span></label>
              <span className="wslab">Boom art (Object/Prop):</span>
              <select className="projSel" value={asset.explodePropId || ""} onChange={(e) => setAsset((a) => ({ ...a, explodePropId: e.target.value || null }))}>
                <option value="">— 💥 emoji (no Object) —</option>
                {allAssets.filter((a) => a.type === "prop").map((a) => <option key={a.id} value={a.id}>🌿 {a.name}{(a.frames && a.frames.length > 1) ? " (animated)" : ""}</option>)}
              </select>
              {/* Boom size is the ART; blast radius is the DAMAGE. They're separate numbers,
                  and the default 3-cell art under a 2-cell radius draws a fireball much
                  smaller than the area that actually hurts — "the fire was smaller than I
                  expected". One tap matches them rather than us silently resizing anyone's art. */}
              <label className="slider">Boom size<input type="range" min="1" max="8" step="0.5" value={asset.explodeSize ?? 3} onChange={(e) => setAsset((a) => ({ ...a, explodeSize: +e.target.value }))} /><span className="hint2">{(asset.explodeSize ?? 3)} cells of art{(() => { const want = Math.min(8, Math.max(1, Math.round((asset.explodeRadius ?? 2) * 2 * 2) / 2)); return Math.abs((asset.explodeSize ?? 3) - want) > 0.4 ? <> — the blast itself covers about {want}. <button className="ltbtn" onClick={() => setAsset((a) => ({ ...a, explodeSize: want }))}>Match the blast</button></> : " — matches the blast"; })()}</span></label>
              <label className="slider">Boom time<input type="range" min="0.2" max="2" step="0.1" value={asset.explodeLife ?? 0.5} onChange={(e) => setAsset((a) => ({ ...a, explodeLife: +e.target.value }))} /><span className="hint2">on screen {(asset.explodeLife ?? 0.5)}s{(() => { const pa = asset.explodePropId ? allAssets.find((x) => x.id === asset.explodePropId) : null; return pa && pa.frames && pa.frames.length > 1 ? " — its " + pa.frames.length + " frames play once over that time" : ""; })()}</span></label>
            </>)}
          </div>
        ))}
      </div>
    );
  };
  const copyToPosesMenu = (!asset || !copyTargets.length) ? null : (
    <span className="copytowrap">
      <button className={"copyang" + (copyToOpen ? " on" : "")} onClick={() => { if (copyToOpen) closeCopyTo(); else { setCopyToPicked([]); setCopyToOpen(true); } }}>⧉ copy to other poses {copyToOpen ? "▴" : "▾"}</button>
      {copyToOpen && (
        <div className="copytomenu">
          <div className="ct">Copy {ALABEL[angle]} onto…</div>
          {copyTargets.map((ag) => {
            const n = (asset.angles[ag] || []).length;
            return (
              <label key={ag} className="chk">
                <input type="checkbox" checked={copyToPicked.includes(ag)} onChange={() => setCopyToPicked((s) => s.includes(ag) ? s.filter((x) => x !== ag) : [...s, ag])} />
                {ALABEL[ag]}
                <span className="hint2">{n ? " — replaces " + n + " block" + (n > 1 ? "s" : "") : " — empty"}</span>
              </label>
            );
          })}
          <div className="copytorow">
            <button onClick={() => setCopyToPicked(copyTargets.slice())}>All</button>
            <button onClick={() => setCopyToPicked([])}>None</button>
            <button className="prim" disabled={!copyToPicked.length} onClick={runCopyTo}>Copy{copyToPicked.length ? " (" + copyToPicked.length + ")" : ""}</button>
            <button onClick={closeCopyTo}>Cancel</button>
          </div>
        </div>
      )}
    </span>
  );
  // Body creator only: pull one block out of the read-only "copy pose" reference panel into the live pose.
  // Comes in as a brand-new, fully independent, easily-deletable block — doesn't touch the source pose.
  const pullPoseCopyPiece = (p) => {
    const clone = { ...p, id: uid() }; delete clone._m;
    setAsset((a) => ({ ...a, angles: { ...a.angles, [angle]: [...(a.angles[angle] || []), clone] } }));
    setSelId(clone.id);
    flash("Pulled into " + ALABEL[angle] + " — drag it into place.");
  };
  // Level-mode branch sets layer/tool directly rather than via selectTool(): selectTool has an
  // "already-active-tool click resets to Foreground" shortcut meant for manual toolbar clicks,
  // and it was firing here too whenever Paint was already selected — silently kicking the
  // layer back to Foreground right after this call set it to Objects, so choosing an emoji
  // left you painting Foreground blocks instead of placing the object you just picked.
  const pickEmoji = (m) => { setEmoji(m); addRecentEmoji(m); if (picker?.mode === "change" && sel) updSel({ char: m }); else if (picker?.mode === "level") { setLEmoji(m); setLLayer("obj"); setLTool("paint"); } else addBlock("emoji", m); setPicker(null); setEmojiQuery(""); };
  const closePicker = () => { setPicker(null); setEmojiQuery(""); };
  const switchWState = (st) => { if (st === wState) return; setAsset((a) => { const states = { rest: blankAngles(), fire: blankAngles(), ...(a.states || {}) }; states[wState] = a.angles; let nxt = states[st]; if (st === "fire" && anglesEmpty(nxt)) nxt = JSON.parse(JSON.stringify(states.rest)); states[st] = nxt; return { ...a, states, angles: nxt }; }); setSelId(null); setWState(st); };
  const copyWState = () => { const other = wState === "rest" ? "fire" : "rest"; setAsset((a) => { if (!effEdit) dirtyGuides.current.add(a.guideId || "default"); const states = { rest: blankAngles(), fire: blankAngles(), ...(a.states || {}) }; states[wState] = a.angles; states[other] = JSON.parse(JSON.stringify(a.angles)); return { ...a, states }; }); flash("Copied " + wState + " → " + other); };
  // Enemy appearance variants — same rest/fire pattern as weapons, but three states. Switching
  // into an empty onFire/charge inherits Normal (same "auto-clone from the base look" the
  // weapon's Fire state already does), so 💪 arms drawn on Normal show up automatically the
  // first time you visit a variant instead of starting from a blank canvas.
  const switchEState = (st) => { if (st === eState) return; setAsset((a) => { const states = { normal: blankAngles(), onFire: blankAngles(), charge: blankAngles(), ...(a.states || {}) }; states[eState] = a.angles; let nxt = states[st]; if (st !== "normal" && anglesEmpty(nxt)) nxt = JSON.parse(JSON.stringify(states.normal)); states[st] = nxt; return { ...a, states, angles: nxt }; }); setSelId(null); setEState(st); };
  const copyEState = () => { if (eState === "normal") return; setAsset((a) => { const states = { normal: blankAngles(), onFire: blankAngles(), charge: blankAngles(), ...(a.states || {}) }; const cloned = JSON.parse(JSON.stringify(states.normal)); states[eState] = cloned; return { ...a, states, angles: cloned }; }); flash("Copied normal → " + eState); };
  // Prop animation frames. `a.frames` is the ordered list of front-pose piece lists; `a.angles`
  // points at whichever frame is being edited right now (so the piece editor's normal
  // add/select/drag machinery just works). switchPropFrame flushes the live edits back into
  // frames[old] before loading frames[new]. syncProp (below, in the save pipeline) does the same
  // flush at save time, mirroring how syncWeapon/syncEnemy flush their live state.
  const switchPropFrame = (idx) => {
    setAsset((a) => { const frames = [...(a.frames || [blankAngles()])]; frames[propFrame] = a.angles; if (!frames[idx]) frames[idx] = blankAngles(); return { ...a, frames, angles: frames[idx] }; });
    setSelId(null); setPropFrame(idx);
  };
  const addPropFrame = (mode) => { // "blank" | "duplicate"
    setAsset((a) => {
      const frames = [...(a.frames || [blankAngles()])];
      frames[propFrame] = a.angles; // flush current edits first
      const nf = mode === "duplicate" ? (() => { const c = JSON.parse(JSON.stringify(a.angles)); for (const ang of ANGLES) (c[ang] || []).forEach((p) => { p.id = uid(); }); return c; })() : blankAngles();
      frames.splice(propFrame + 1, 0, nf);
      return { ...a, frames, angles: frames[propFrame + 1] };
    });
    setSelId(null); setPropFrame((i) => i + 1);
    flash(mode === "duplicate" ? "Duplicated frame ✓" : "Blank frame added ✓");
  };
  const deletePropFrame = () => {
    const frames0 = asset.frames || [];
    if (frames0.length <= 1) { flash("Can't delete the only frame."); return; }
    const newIdx = Math.min(propFrame, frames0.length - 2);
    setAsset((a) => { const frames = [...(a.frames || [])]; frames.splice(propFrame, 1); return { ...a, frames, angles: frames[newIdx] }; });
    setSelId(null); setPropFrame(newIdx);
    flash("Frame deleted ✓");
  };
  const movePropFrame = (dir) => {
    const frames0 = asset.frames || [];
    const j = propFrame + dir; if (j < 0 || j >= frames0.length) return;
    setAsset((a) => { const frames = [...(a.frames || [])]; frames[propFrame] = a.angles; [frames[propFrame], frames[j]] = [frames[j], frames[propFrame]]; return { ...a, frames }; });
    setPropFrame(j);
  };
  const flipWholeProp = () => {
    const preview = flipPropFramesHorizontally(asset.frames, asset.angles, propFrame);
    if (!preview.flipped) { flash("Add a block before flipping the object."); return; }
    setAsset((a) => {
      const result = flipPropFramesHorizontally(a.frames, a.angles, propFrame);
      return { ...a, frames: result.frames, angles: result.angles };
    });
    flash("Flipped the whole object — all frames ✓");
  };
  // Skin/equipment per-body layouts — keyed by whichever body's id was the active guide
  // (asset.guideId) when that layout was drawn; "default" when no specific body is picked.
  // Switching the EXISTING "🧍 Load body" guide picker now also swaps which layout you're
  // editing: it saves the current work under the body you were just designing for, then loads
  // that NEW body's own layout if one exists — or, if this body has never been designed for,
  // clones whichever layout was worked on most recently (lastFit) as a starting point, so
  // switching bodies never dumps you back to a blank canvas.
  //
  // Weapons work the same way, with one addition: a fit variant bundles states (rest/fire)
  // AND the weapon's own hand/grip reference point together (see blankFitVariant), and cloning
  // a fallback fit for a body that's never been designed for SHIFTS every piece (and the grip
  // point) by the difference between that body's hand position and the fallback body's — so a
  // machete that was fit to Bob starts out already roughly sitting in Bobette's hand instead of
  // wherever it sat in Bob's, compensating for their different arm lengths right away. It's
  // still just a starting point — fully editable and saved as ITS OWN fit from there, exactly
  // like skins already work.
  const currentFitSnapshot = (a) => a.type === "weapon" ? { states: { ...(a.states || { rest: blankAngles(), fire: blankAngles() }), [wState]: a.angles } } : a.angles;
  const applyFitVariant = (a, v) => a.type === "weapon" ? { states: v.states, angles: (v.states && v.states[wState]) || blankAngles() } : { angles: v };
  const shiftWeaponFitToGuide = (fallback, fromGuideId, toGuideId) => {
    const fromHand = handForGuideId(fromGuideId), toHand = handForGuideId(toGuideId);
    const shiftPieces = (pieces, ang) => { const dx = toHand[ang].x - fromHand[ang].x, dy = toHand[ang].y - fromHand[ang].y; return (pieces || []).map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })); };
    const shiftAngles = (ag) => { const out = {}; for (const ang of ANGLES) out[ang] = shiftPieces((ag || {})[ang], ang); return out; };
    return { states: { rest: shiftAngles(fallback.states.rest), fire: shiftAngles(fallback.states.fire) } };
  };
  const switchGuideFit = (newGuide) => {
    setAsset((a) => {
      if (!a.variants) return { ...a, guideId: newGuide }; // shouldn't happen now that weapons get variants too — kept as a safety net for any other future type
      const curKey = a.guideId || "default";
      const variants = { default: blankFitVariant(a.type), ...a.variants };
      variants[curKey] = currentFitSnapshot(a);
      const nextKey = newGuide || "default";
      let nxt = variants[nextKey];
      if (!nxt) {
        const fallbackKey = (a.lastFit && variants[a.lastFit]) ? a.lastFit : curKey;
        const fallback = variants[fallbackKey] || blankFitVariant(a.type);
        nxt = a.type === "weapon" ? shiftWeaponFitToGuide(fallback, fallbackKey, nextKey) : JSON.parse(JSON.stringify(fallback));
        variants[nextKey] = nxt;
      }
      return { ...a, guideId: newGuide, variants, ...applyFitVariant(a, nxt), lastFit: nextKey };
    });
    setSelId(null);
  };
  // Copies the fit currently being edited to every OTHER body at once, instead of refitting each
  // one by hand — e.g. renaming/reworking "Bob's shoes" into "#2 Socks" doesn't retroactively fit
  // any other character; this is the fast way to push one good fit everywhere. Overwrites those
  // bodies' existing layouts for this item, so it asks first.
  const copyFitToOtherBodies = () => {
    const bodies = library.filter((a) => a.type === "body");
    const curId = asset.guideId || "default";
    const others = bodies.filter((b) => b.id !== curId);
    if (!others.length) { flash("No other bodies to copy to yet."); return; }
    const ok = window.confirm("Copy this fit to " + others.length + " other " + (others.length === 1 ? "body" : "bodies") + "? This overwrites their existing layout for this item.");
    if (!ok) return;
    setAsset((a) => {
      const variants = { ...(a.variants || {}) };
      const confirmed = new Set(a.confirmedFits || []);
      const snapshot = currentFitSnapshot(a);
      for (const b of others) { variants[b.id] = JSON.parse(JSON.stringify(snapshot)); confirmed.add(b.id); }
      return { ...a, variants, confirmedFits: [...confirmed] };
    });
    flash("Copied to " + others.length + " " + (others.length === 1 ? "body" : "bodies") + ".");
  };
  // This equipment's own Side-pose art for a given body (same fallback chain fitFor uses when
  // composing a look) — used to seed a brand-new effect-animation frame as a starting copy,
  // per the brief ("it will initially copy the side appearance and I can customize from there").
  const equipmentSideFor = (a, bodyId) => {
    if (!a.variants) return (a.angles && a.angles.side) || [];
    const key = (bodyId && a.variants[bodyId]) ? bodyId : (a.lastFit && a.variants[a.lastFit] ? a.lastFit : "default");
    const src = a.variants[key] || a.variants.default || blankAngles();
    return src.side || [];
  };
  const addEffect = (type) => {
    setAsset((a) => {
      if ((a.effects || []).some((e) => e.type === type)) return a; // one of each effect type per item, for now
      const def = EFFECT_TYPES[type];
      const params = {}; def.params.forEach((p) => { params[p.key] = p.def; });
      const eff = { id: uid(), type, ...params, animByBody: {}, lastFit: "default", ...(def.tagParam ? { tag: "" } : {}) };
      return { ...a, effects: [...(a.effects || []), eff] };
    });
    flash(EFFECT_TYPES[type].label + " added — set it up below.");
  };
  const removeEffect = (effId) => {
    setAsset((a) => ({ ...a, effects: (a.effects || []).filter((e) => e.id !== effId) }));
    if (effEdit && effEdit.effId === effId) setEffEdit(null);
  };
  const updateEffectParam = (effId, key, val) => {
    setAsset((a) => ({ ...a, effects: a.effects.map((e) => (e.id === effId ? { ...e, [key]: val } : e)) }));
  };
  // Enters the animation designer for one effect: stashes the equipment's own current working
  // art back into its variant map first (same save-back switchGuideFit does) since asset.angles
  // is about to point at a FRAME instead — this asset never stops being type "equipment", so
  // that stash is what keeps the real art from getting clobbered (see syncEffectAnim). Then loads
  // whichever body this effect was last designed for, seeding one frame from this equipment's own
  // Side art for that body if nothing's been drawn for it yet.
  const openEffectAnim = (effId) => {
    const eff = (asset.effects || []).find((e) => e.id === effId);
    if (!eff) return;
    const bodyKey = eff.lastFit || "default";
    setAsset((a) => {
      let next = a;
      if (a.variants) {
        const curKey = a.guideId || "default";
        const variants = { default: blankAngles(), ...a.variants };
        variants[curKey] = a.angles;
        next = { ...a, variants };
      }
      const effects2 = next.effects.map((e) => {
        if (e.id !== effId) return e;
        const animByBody = { ...e.animByBody };
        let frames = animByBody[bodyKey];
        if (!frames || !frames.length) {
          const src = equipmentSideFor(next, bodyKey === "default" ? null : bodyKey);
          frames = [{ ...blankFrame(), side: JSON.parse(JSON.stringify(src)).map((p) => ({ ...p, id: uid() })) }];
          animByBody[bodyKey] = frames;
        }
        return { ...e, animByBody };
      });
      const effOut = effects2.find((e) => e.id === effId);
      return { ...next, effects: effects2, angles: effOut.animByBody[bodyKey][0] };
    });
    setEffEdit({ effId, bodyKey, frameIdx: 0 });
    setAngle("side");
    setSelId(null);
  };
  const closeEffectAnim = () => {
    setAsset((a) => syncEffectAnim(a));
    setEffEdit(null);
    setSelId(null);
  };
  const switchEffectFrame = (newIdx) => {
    if (!effEdit) return;
    setAsset((a) => {
      const effects = a.effects.map((e) => {
        if (e.id !== effEdit.effId) return e;
        const animByBody = { ...e.animByBody };
        const frames = [...(animByBody[effEdit.bodyKey] || [])];
        frames[effEdit.frameIdx] = a.angles;
        animByBody[effEdit.bodyKey] = frames;
        return { ...e, animByBody };
      });
      const eff = effects.find((e) => e.id === effEdit.effId);
      const frames = eff.animByBody[effEdit.bodyKey];
      return { ...a, effects, angles: frames[newIdx] };
    });
    setEffEdit((s) => ({ ...s, frameIdx: newIdx }));
    setSelId(null);
  };
  const switchEffectBody = (newBodyKey) => {
    if (!effEdit) return;
    setAsset((a) => {
      const effects = a.effects.map((e) => {
        if (e.id !== effEdit.effId) return e;
        const animByBody = { ...e.animByBody };
        const oldFrames = [...(animByBody[effEdit.bodyKey] || [])];
        oldFrames[effEdit.frameIdx] = a.angles;
        animByBody[effEdit.bodyKey] = oldFrames;
        let frames = animByBody[newBodyKey];
        if (!frames || !frames.length) {
          // Never designed for this body yet — seed ONE frame from this equipment's own Side
          // art for it, so it starts as a recognizable copy instead of a blank canvas.
          const src = equipmentSideFor(a, newBodyKey === "default" ? null : newBodyKey);
          frames = [{ ...blankFrame(), side: JSON.parse(JSON.stringify(src)).map((p) => ({ ...p, id: uid() })) }];
          animByBody[newBodyKey] = frames;
        }
        return { ...e, animByBody, lastFit: newBodyKey };
      });
      const eff = effects.find((e) => e.id === effEdit.effId);
      return { ...a, effects, angles: eff.animByBody[newBodyKey][0] };
    });
    setEffEdit({ effId: effEdit.effId, bodyKey: newBodyKey, frameIdx: 0 });
    setSelId(null);
  };
  const addAnimFrame = (mode) => { // mode: "blank" | "duplicate"
    if (!effEdit) return;
    setAsset((a) => {
      const effects = a.effects.map((e) => {
        if (e.id !== effEdit.effId) return e;
        const animByBody = { ...e.animByBody };
        const frames = [...(animByBody[effEdit.bodyKey] || [])];
        frames[effEdit.frameIdx] = a.angles; // flush current edits before inserting
        let newFrame;
        if (mode === "duplicate") { newFrame = JSON.parse(JSON.stringify(a.angles)); for (const ang of ANGLES) (newFrame[ang] || []).forEach((p) => { p.id = uid(); }); }
        else newFrame = blankFrame();
        frames.splice(effEdit.frameIdx + 1, 0, newFrame);
        animByBody[effEdit.bodyKey] = frames;
        return { ...e, animByBody };
      });
      const eff = effects.find((e) => e.id === effEdit.effId);
      return { ...a, effects, angles: eff.animByBody[effEdit.bodyKey][effEdit.frameIdx + 1] };
    });
    setEffEdit((s) => ({ ...s, frameIdx: s.frameIdx + 1 }));
    setSelId(null);
    flash(mode === "duplicate" ? "Duplicated frame ✓" : "Blank frame added ✓");
  };
  const deleteAnimFrame = () => {
    if (!effEdit) return;
    const eff0 = asset.effects.find((e) => e.id === effEdit.effId);
    const frames0 = eff0.animByBody[effEdit.bodyKey] || [];
    if (frames0.length <= 1) { flash("Can't delete the only frame."); return; }
    const newIdx = Math.min(effEdit.frameIdx, frames0.length - 2);
    setAsset((a) => {
      const effects = a.effects.map((e) => {
        if (e.id !== effEdit.effId) return e;
        const animByBody = { ...e.animByBody };
        const frames = [...(animByBody[effEdit.bodyKey] || [])];
        frames.splice(effEdit.frameIdx, 1);
        animByBody[effEdit.bodyKey] = frames;
        return { ...e, animByBody };
      });
      const eff = effects.find((e) => e.id === effEdit.effId);
      return { ...a, effects, angles: eff.animByBody[effEdit.bodyKey][newIdx] };
    });
    setEffEdit((s) => ({ ...s, frameIdx: newIdx }));
    setSelId(null);
    flash("Frame deleted ✓");
  };
  const moveAnimFrame = (dir) => {
    if (!effEdit) return;
    const eff0 = asset.effects.find((e) => e.id === effEdit.effId);
    const frames0 = eff0.animByBody[effEdit.bodyKey] || [];
    const j = effEdit.frameIdx + dir;
    if (j < 0 || j >= frames0.length) return;
    setAsset((a) => {
      const effects = a.effects.map((e) => {
        if (e.id !== effEdit.effId) return e;
        const animByBody = { ...e.animByBody };
        const frames = [...(animByBody[effEdit.bodyKey] || [])];
        frames[effEdit.frameIdx] = a.angles;
        [frames[effEdit.frameIdx], frames[j]] = [frames[j], frames[effEdit.frameIdx]];
        animByBody[effEdit.bodyKey] = frames;
        return { ...e, animByBody };
      });
      return { ...a, effects };
    });
    setEffEdit((s) => ({ ...s, frameIdx: j }));
  };

  /* ---- render helpers (HTML) -------------------------------------------- */
  const reflect = (p) => ({ ...p, id: p.id + "_m", x: W - (p.x + p.w), _m: true });
  // Dressed characters are ALREADY fully baked — their mirror twins are stored as real pieces
  // (still carrying mirror:true from the source assets). Re-expanding them stacked a flipped
  // duplicate on every mirrored piece (4 copies in non-side poses), invisible at rest but
  // counter-rotating against each other the moment the climb cycle animated them.
  const bake = (a, ang) => { if (a && a.type === "character") return (a.angles[ang] || []).slice(); const out = []; for (const p of (a.angles[ang] || [])) { out.push(p); if (pmirror(p, ang)) out.push(reflect(p)); } return out; };
  // Layers a body + its clothing correctly: lower-body items (pants, underwear, shoes) always
  // render below the arm; upper-body items render above or below it per their own "Over arms"
  // flag. Everything else (skin, hats, anything without a recognized slot) keeps the old simple
  // behindBody/front split. Shared by the Dress Bob preview and the final composed character so
  // testing and the real export always match.
  const layerBodyAndOverlays = (body, overlays, ang) => {
    // _src tags which asset a piece came from. A cutter must only punch a hole through the
    // garment it belongs to (the mask it was drawn on), never through the body under it — so
    // every finished-look render site groups pieces by _src and masks each group separately.
    const bodyPieces = (body ? bake(body, ang) : []).map((p) => ({ ...p, _src: body.id }));
    const isArm = (p) => p.role === "weaponArm" || p.limb === "arm";
    const bodyNonArm = bodyPieces.filter((p) => !isArm(p));
    const bodyArm = bodyPieces.filter(isArm);
    // Which body pieces count as "the leg" for the crouch reorder below — explicit flag first,
    // falling back to the same bottommost-piece heuristic identifyLimbs already uses elsewhere.
    // Crouch is usually a static (non-animated) pose, so Blake doesn't always bother flagging
    // it — this makes "shirt goes behind the leg" work automatically either way.
    const { legIds: bodyLegIds } = identifyLimbs(bodyNonArm);
    // Pick the overlay's layout for the WORN body's build (skinny/average/fat) — falling back
    // to Default if that build has no dedicated fit yet, and to the asset's plain .angles for
    // anything saved before the variants system existed at all.
    // Pick the overlay's layout for the body actually being WORN — matched by that body's own
    // id (whichever layout was drawn with this body picked as the guide). If this body has
    // never been designed for, fall back to whichever layout was most recently worked on
    // (lastFit), then Default, then the asset's plain .angles for pre-variants saves.
    const fitFor = (a) => {
      if (!a.variants) return a;
      const bodyId = body && body.id;
      const key = (bodyId && a.variants[bodyId]) ? bodyId : (a.lastFit && a.variants[a.lastFit] ? a.lastFit : "default");
      return { ...a, angles: a.variants[key] || a.variants.default || a.angles };
    };
    const belowLegs = [], back = [], shoesLower = [], underTop = [], lower = [], upperUnder = [], upperOver = [], skinDecor = [], other = [];
    const hatEquipped = overlays.some((a) => a.slot === "hat" && !a.ignoreHideIfHat);
    for (const a0 of overlays) {
      const a = fitFor(a0);
      for (const p of bake(a, ang)) {
        if (hatEquipped && p.hideIfHat) continue; // covered by the hat — skip it entirely instead of letting it show/fade through
        p._src = a0.id; // which asset this piece came from -- scopes its cutter holes (see cutterRuns)
        p._slot = a.slot; // internal marker only — lets the crouch-pose reorder below (and nothing else) know which piece is a shirt/jacket
        if (a.slot === "shoes") { p.limb = "leg"; p._isShoe = true; } // shoes always follow the leg — no manual flagging needed, and see the foot-arc handling in the walk/climb animation below
        if (p.behindBody) back.push(p);
        else if (a.slot === "shoes") shoesLower.push(p); // shoes sit UNDER pants/underwear (a pant leg falls over the shoe), but still over the bare leg
        else if (LOWER_BODY_SLOTS.has(a.slot)) (p.behindLegs ? belowLegs : lower).push(p);
        // An UNDERSHIRT goes under the pants, not over them — it's the one upper-body garment
        // that tucks in. A long undershirt was painting straight over the waistband because
        // under_top shared the shirt/jacket bucket, which draws after the lower body. It keeps
        // its "Over arms only" flag: ticking that is a deliberate choice to bring a piece
        // frontmost, and still does exactly that.
        else if (a.slot === "under_top" && !p.overArms) underTop.push(p);
        else if (UPPER_BODY_SLOTS.has(a.slot)) (p.overArms ? upperOver : upperUnder).push(p);
        else if (a.type === "skin") skinDecor.push(p); // drawn-on skin art (hair/eyes/teeth) sits ON the body but UNDER clothing — never frontmost over a shirt/cape
        else other.push(p);
      }
    }
    // Skin decor (face/eyes/teeth/hair) is painted ON the body — so it renders directly over the
    // body and UNDER every piece of clothing automatically. Clothing that isn't flagged
    // behind-body wraps AROUND the body, so it covers skin wherever they overlap (a cape's front
    // piece over the face); the face can never phase through it. No flags needed for any of this.
    let out = back.concat(belowLegs).concat(bodyNonArm).concat(skinDecor).concat(shoesLower).concat(underTop).concat(lower).concat(upperUnder).concat(bodyArm).concat(upperOver).concat(other);
    if (ang === "crouch") {
      // Crouching brings a bent knee up in front of the torso — a shirt shouldn't paint over
      // it. Move every shirt/jacket piece to just before the FIRST leg piece, instead of
      // moving legs forward past everything — moving legs forward would also leapfrog them
      // past unrelated pieces (pants) that happen to sit between the leg and the shirt in the
      // base order, silently flipping the leg/pants relationship too even though only the
      // leg/shirt relationship was supposed to change.
      // A piece flagged "Over arms only" (overArms) is authored to render frontmost — a cape/jacket
      // front panel that sits over the character. It must NOT be tucked behind the bent knee here,
      // or it lands behind the head in crouch. Only plain (non-over-arms) shirt panels tuck back.
      // Skin rides along: it's re-inserted with the shirts as [skin, shirts] so the stack stays
      // body → skin → shirt → knee — the face under the cape, the cape under the bent knee.
      const skinSet = new Set(skinDecor);
      const isShirtPiece = (p) => p._slot && UPPER_BODY_SLOTS.has(p._slot) && !p.overArms && !p.behindBody;
      const shirts = out.filter(isShirtPiece);
      const isLegPiece = (p) => p.limb === "leg" || bodyLegIds.has(p.id);
      if (shirts.length) {
        const rest = out.filter((p) => !isShirtPiece(p) && !skinSet.has(p));
        // Anchor the tuck to the BODY, not to "the first leg in draw order": insert
        // [skin, shirts] right after the LAST non-leg body piece (torso/head). A body that
        // draws a rear leg EARLY (behind its torso) made the old first-leg rule shove the
        // skin and shirts behind the head — eyes hidden by the head itself, and the head's
        // own features (the nose) poking out in front of the cape. Any leg drawn after the
        // torso — the bent front knee — still lands in front of the shirts and covers them.
        const bodySet = new Set(bodyNonArm.filter((p) => !isLegPiece(p)));
        let anchorIdx = -1;
        rest.forEach((p, i) => { if (bodySet.has(p)) anchorIdx = i; });
        const insert = skinDecor.concat(shirts);
        if (anchorIdx !== -1) out = rest.slice(0, anchorIdx + 1).concat(insert).concat(rest.slice(anchorIdx + 1));
        else { const firstLegIdx = rest.findIndex(isLegPiece); out = firstLegIdx === -1 ? rest.concat(insert) : rest.slice(0, firstLegIdx).concat(insert).concat(rest.slice(firstLegIdx)); }
      }
    }
    return out;
  };
  const fxCss = (p) => { const f = p.fx; if (!f) return {}; const parts = []; if (f.glow > 0) parts.push(`drop-shadow(0 0 ${f.glow}px ${f.glowColor})`); if (f.bright !== 1) parts.push(`brightness(${f.bright})`); const o = {}; if (f.opacity !== 1) o.opacity = f.opacity; if (parts.length) o.filter = parts.join(" "); return o; };
  // Outer wrapper: position, size, transform, opacity, and the piece's own Effects filter
  // (fxCss — glow/brightness). Deliberately carries NO clip-path — a clip-path on the SAME
  // element as a filter clips away any part of that filter (drop-shadow glow, and even a plain
  // CSS `outline`) that would render outside the box, even when the clip-path traces the exact
  // same rectangle as the box. That silently killed Glow (and the selection/group outline) on
  // every non-rect/circle shape — triangle, diamond, pentagon, hexagon, star, trapezoid, any
  // Fill/poly shape. See shapeFillStyle for the clipped inner child this wraps.
  const shapeStyle = (p, off, faded, mirrored) => {
    const ox = off ? off.x : 0, oy = off ? off.y : 0;
    const s = { position: "absolute", left: ((p.x + ox) / W * 100) + "%", top: ((p.y + oy) / H * 100) + "%", width: (p.w / W * 100) + "%", height: (p.h / H * 100) + "%", boxSizing: "border-box" };
    if (faded) s.opacity = 0.25; else Object.assign(s, fxCss(p));
    const t = [];
    const rot = mirrored ? (p.mirrorTwist === false ? -(p.rot || 0) : (p.rot || 0)) : (p.rot || 0);
    if (mirrored) t.push("scaleX(-1)");
    if (rot) t.push(`rotate(${rot}deg)`);
    if (t.length) s.transform = t.join(" ");
    if (p.role === "weaponArm" || (p.limb === "arm" && !p._isShoe)) s.transformOrigin = armPivotOrigin(p.armPivot);
    else if (p._animPivotTop) s.transformOrigin = "50% 0%"; // walk/climb-swung legs: hip stays anchored, only the lower leg sweeps
    return s;
  };
  // Inner fill: the piece's actual visible paint (clip-path silhouette + color), sized 100%/100%
  // to exactly fill shapeStyle's outer box. No filter/opacity/transform here — those live on the
  // outer wrapper now so they aren't clipped away (see shapeStyle's comment above).
  const shapeFillStyle = (p) => {
    const s = { width: "100%", height: "100%", boxSizing: "border-box" };
    if (p.kind === "circle") s.borderRadius = "50%";
    else if (p.kind === "roundrect") s.borderRadius = "22%";
    else { const cp = shapeClipPath(p); if (cp) s.clipPath = cp; }
    // A cutter punches a transparent hole through whatever renders before it (eye sockets, a
    // buttonhole, a belt buckle gap) instead of adding its own color. This used to be attempted
    // with `mixBlendMode:"destination-out"` — but that string isn't a real CSS mix-blend-mode
    // value (mix-blend-mode can only blend colors; it can never punch actual transparency into a
    // backdrop), so the browser silently dropped it and the piece just rendered as an ordinary
    // solid-colored shape. The real hole is now cut with an actual SVG mask on the CONTAINER
    // (see cutterMaskCss, applied at every finished-look render site: Dress Bob, Playtest player,
    // Playtest enemies) — so a cutter piece itself should paint no color of its own anywhere.
    if (p.kind !== "emoji" && p.kind !== "text" && !p.isCutter) s.background = p.color;
    // A patterned piece (Flannel and every other texture) paints the pattern over that flat colour,
    // inside the same clip-path, so a plaid sleeve keeps its exact silhouette. Applied here rather
    // than at each render site because this one function is what every one of them draws through —
    // editor canvas, Dress Bob, the playtest player and enemies all pick it up together.
    if (p.tex && p.kind !== "emoji" && p.kind !== "text" && !p.isCutter && !p.isHitbox && !p.isMuzzle) {
      const ts = pieceTextureStyle(p, texLib);
      if (ts) Object.assign(s, ts);
    }
    // A hitbox piece is a game-logic box, not art — always shown this way regardless of its
    // own color/kind, so it reads unmistakably differently from every other piece while editing.
    if (p.isHitbox) { s.background = "rgba(255,60,60,.32)"; s.border = "2px dashed #ff3c3c"; s.boxShadow = "none"; }
    // Same idea as the hitbox: a muzzle is a game-logic MARKER (where shots spawn), not art, so
    // it reads unmistakably in the editor and is filtered out of every render that draws the
    // weapon for real (Dress Bob, Playtest, a saved dressed look).
    if (p.isMuzzle) { s.background = "rgba(66,214,255,.30)"; s.border = "2px dashed #42d6ff"; s.borderRadius = "50%"; s.boxShadow = "none"; }
    return s;
  };
  // Outer wrapper for the outline layer: position/transform/opacity + the outline's own filter
  // (glow, brightness, and — for clip-path shapes — the ring of small drop-shadow offsets that
  // fakes a uniform outline). No clip-path here, for the same reason as shapeStyle above: a
  // clip-path on the SAME element as a filter clips away anything that filter renders outside the
  // box — which was silently killing the entire outline ring (not just its glow/brightness), on
  // every non-rect/circle shape. Text pieces have no separate fill child (see outlineFillStyle) —
  // their own stroke IS the outline, rendered directly inside this wrapper.
  const outlineStyle = (p, off, mirrored, faded) => {
    const ox = off ? off.x : 0, oy = off ? off.y : 0;
    const s = { position: "absolute", left: ((p.x + ox) / W * 100) + "%", top: ((p.y + oy) / H * 100) + "%", width: (p.w / W * 100) + "%", height: (p.h / H * 100) + "%", boxSizing: "border-box", pointerEvents: "none" };
    const t = [];
    const rot = mirrored ? (p.mirrorTwist === false ? -(p.rot || 0) : (p.rot || 0)) : (p.rot || 0);
    if (mirrored) t.push("scaleX(-1)");
    if (rot) t.push(`rotate(${rot}deg)`);
    if (t.length) s.transform = t.join(" ");
    if (p.role === "weaponArm" || (p.limb === "arm" && !p._isShoe)) s.transformOrigin = armPivotOrigin(p.armPivot);
    else if (p._animPivotTop) s.transformOrigin = "50% 0%";
    const ofx = p.outlineFx || {};
    if (faded) s.opacity = 0.25; // guide-preview reference — stays uniformly translucent, like before
    else if (ofx.opacity !== undefined && ofx.opacity !== 1) s.opacity = ofx.opacity;
    const filterParts = [];
    if (ofx.glow > 0) filterParts.push(`drop-shadow(0 0 ${ofx.glow}px ${ofx.glowColor || "#ffd76b"})`);
    if (ofx.bright !== undefined && ofx.bright !== 1) filterParts.push(`brightness(${ofx.bright})`);
    if (p.kind !== "text") {
      const oc = p.outlineColor || "#000";
      const cp = shapeClipPath(p);
      if (cp) {
        // box-shadow renders outside the element's border-box, but clip-path clips the entire
        // rendered box — shadow included — so it silently never showed on any clip-path shape.
        // drop-shadow instead follows the actual post-clip silhouette (of outlineFillStyle's fill
        // sibling, which sits right below this wrapper) — one drop-shadow only casts in a single
        // direction though, so 8 tiny same-color offsets in a ring approximate a uniform outline.
        const d = 1.4;
        const dirs = [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [d, -d], [-d, d], [-d, -d]];
        filterParts.push(...dirs.map(([dx, dy]) => `drop-shadow(${dx}px ${dy}px 0 ${oc})`));
      }
    }
    if (filterParts.length) s.filter = filterParts.join(" ");
    return s;
  };
  // Inner outline fill (everything but text — see outlineStyle above): a clip-path shape gets a
  // solid silhouette in the outline color for the ring drop-shadows above to key their alpha off
  // of; rect/circle instead just uses a plain box-shadow ring (fine there since there's no
  // clip-path on this element to fight with).
  const outlineFillStyle = (p) => {
    const s = { width: "100%", height: "100%", boxSizing: "border-box" };
    const oc = p.outlineColor || "#000";
    const cp = shapeClipPath(p);
    if (cp) { s.clipPath = cp; s.background = oc; }
    else { if (p.kind === "circle") s.borderRadius = "50%"; else if (p.kind === "roundrect") s.borderRadius = "22%"; s.boxShadow = "0 0 0 2px " + oc; }
    return s;
  };
  // Builds a CSS mask-image for a CONTAINER that hosts a finished (non-editable) render of
  // `pieces`, punching a real transparent hole wherever a cutter piece sits. mix-blend-mode
  // cannot do this (see shapeStyle) — masks can, but only against the element they're applied
  // to, not sibling pieces — so the hole is computed once here and applied to the shared
  // wrapper instead of the individual cutter piece. An SVG <mask> (white keep / black cut)
  // is rasterized first and used purely for its resulting ALPHA channel (the outer rect is
  // "cut out" internally by the SVG's own mask, which turns each hole into real alpha:0 pixels
  // in the flattened image) — that sidesteps the luminance-vs-alpha ambiguity browsers have
  // for CSS mask-image sources, since alpha:0/alpha:1 mean the same thing under either mode.
  // Rotation/position match shapeStyle's own math exactly (rotate about the piece's own
  // center); mirrored twins get the same scaleX(-1)-about-center flip shapeStyle applies, so a
  // mirrored cutter's hole lines up with its mirrored piece. Callers must also filter cutter
  // pieces OUT of their own piece-render list — this only supplies the hole, not the piece.
  const cutterMaskCache = useRef({});
  const cutterMaskCss = (pieces, cacheKey) => {
    const cutters = (pieces || []).filter((p) => p.isCutter);
    if (!cutters.length) return {};
    // Cheap signature of just what actually affects the mask's shape — if this hasn't changed
    // since last frame (the common case: a static face/eye cutter on a body that's just
    // walking around), skip rebuilding the SVG string and reuse the exact same style object.
    const sig = cutters.map((p) => [p.id, Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h), Math.round((p.rot || 0) * 10), p.kind, p._m ? 1 : 0, p.mirrorTwist === false ? 1 : 0].join(":")).join("|");
    const key = cacheKey || "default";
    const cached = cutterMaskCache.current[key];
    if (cached && cached.sig === sig) return cached.css;
    const shapes = cutters.map((p) => {
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      const mirrored = !!p._m;
      const rot = mirrored ? (p.mirrorTwist === false ? -(p.rot || 0) : (p.rot || 0)) : (p.rot || 0);
      const ops = [];
      if (mirrored) ops.push(`translate(${cx} ${cy}) scale(-1,1) translate(${-cx} ${-cy})`);
      if (rot) ops.push(`rotate(${rot} ${cx} ${cy})`);
      const tAttr = ops.length ? ` transform="${ops.join(" ")}"` : "";
      if (p.kind === "circle") return `<ellipse cx="${cx}" cy="${cy}" rx="${p.w / 2}" ry="${p.h / 2}" fill="#000"${tAttr}/>`;
      if (p.kind === "roundrect") return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${p.w * 0.22}" ry="${p.h * 0.22}" fill="#000"${tAttr}/>`;
      const pts = shapePolyPoints(p);
      if (pts) return `<polygon points="${pts.map(([fx, fy]) => (p.x + fx * p.w) + "," + (p.y + fy * p.h)).join(" ")}" fill="#000"${tAttr}/>`;
      return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#000"${tAttr}/>`;
    }).join("");
    const frame = cutterMaskFrameLayout();
    const vb = frame.viewBox;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.width} ${vb.height}"><mask id="cm" maskUnits="userSpaceOnUse" x="${vb.x}" y="${vb.y}" width="${vb.width}" height="${vb.height}"><rect x="${vb.x}" y="${vb.y}" width="${vb.width}" height="${vb.height}" fill="#fff"/>${shapes}</mask><rect x="${vb.x}" y="${vb.y}" width="${vb.width}" height="${vb.height}" fill="#fff" mask="url(#cm)"/></svg>`;
    const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    const css = { WebkitMaskImage: url, maskImage: url, WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" };
    cutterMaskCache.current[key] = { sig, css };
    return css;
  };
  // Curated web-safe fonts — no external loading (network dependency / FOUC risk), just
  // reasonably distinct built-in system fonts covering different vibes: clean sans, bold
  // poster, classic serif, and a typewriter/vintage look (handy for period pieces).
  const TEXT_FONTS = [
    ["Arial, sans-serif", "Sans (Arial)"],
    ["Georgia, 'Times New Roman', serif", "Serif (Georgia)"],
    ["Impact, 'Arial Narrow', sans-serif", "Bold Poster (Impact)"],
    ["'Courier New', monospace", "Typewriter (Courier)"],
    ["'Trebuchet MS', sans-serif", "Rounded (Trebuchet)"],
    ["'Brush Script MT', cursive", "Script (Brush)"],
  ];
  const textInner = (p, outlineOnly) => {
    // Same auto-scaling trick as emojiInner (cqh = 1% of THIS block's own rendered height) —
    // the same piece renders in many differently-sized containers (editor canvas, Dress Bob,
    // playtest), so a fixed px size would be wildly wrong everywhere but the one it was tuned in.
    // Playtest in particular renders this piece just a handful of CSS px tall — several things
    // were smearing it into a blob there ("fades into itself" / "can't make out the text"):
    // (1) hinted rasterization at tiny font sizes — countered by rendering the glyph SC times
    // bigger than its final size and scaling the whole span back down with a transform (a
    // downsample after the fact), plus geometricPrecision so glyph geometry scales linearly
    // instead of snapping to the pixel grid; (2) the outline stroke was a FIXED pixel width
    // (2px), tuned against the big editor canvas — now proportional to the font (em) instead,
    // scaling down to a hairline at playtest size; (3) — still not fine enough on tight text
    // like "1968" — every block of text was forced bold (weight 700) regardless of font, and
    // bold glyphs have physically thicker strokes baked into their own outlines, which is what
    // was actually clogging shut the small enclosed counters in numerals/letters at tiny sizes,
    // no amount of rasterization fixing could undo that. Normal weight, a slightly thinner
    // outline, and a hair more letter-spacing all trim total ink so the shapes stay legible
    // small; the editor canvas is big enough that none of this reads as noticeably lighter there.
    const SC = 4;
    const wrap = { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", userSelect: "none", pointerEvents: "none", containerType: "size", overflow: "hidden" };
    const scaleWrap = { transform: `scale(${1 / SC})`, transformOrigin: "50% 50%", display: "inline-block" };
    const span = { fontSize: (80 * SC) + "cqh", lineHeight: 1, display: "inline-block", whiteSpace: "nowrap", fontFamily: p.font || TEXT_FONTS[0][0], fontWeight: 400, textRendering: "geometricPrecision", letterSpacing: "0.035em" };
    if (outlineOnly) { span.color = "transparent"; span.WebkitTextStroke = "0.022em " + (p.outlineColor || "#000"); }
    else span.color = p.color || "#ffffff";
    return <div style={wrap}><div style={scaleWrap}><span style={span}>{p.text || "TEXT"}</span></div></div>;
  };
  const emojiInner = (p) => {
    // Font size must scale with the block's own rendered size, not the measured main-canvas
    // height (box.h) — the same piece renders in many differently-sized containers (editor
    // canvas, Dress Bob, pose-copy panel, playtest player), and a px size computed from one
    // canvas is wildly oversized in a smaller one. cqh = 1% of this block's own height.
    const wrap = { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", userSelect: "none", pointerEvents: "none", containerType: "size" };
    const span = { fontSize: "92cqh", lineHeight: 1, display: "inline-block" };
    if (p.outline) span.WebkitTextStroke = "1.5px " + (p.outlineColor || "#000");
    if (p.tint) Object.assign(span, { backgroundColor: p.tint, backgroundImage: "none", color: "transparent", WebkitTextFillColor: "transparent", WebkitBackgroundClip: "text", backgroundClip: "text" });
    return <div style={wrap}><span style={span}>{p.char}</span></div>;
  };
  const pieceInner = (p) => p.kind === "emoji" ? emojiInner(p) : p.kind === "text" ? textInner(p, false) : null;
  const pieceShowsOutline = (p) => p.outline && p.kind !== "emoji";
  // Shared by Static/MirrorGhost/Block: renders the outline layer as outer(outlineStyle) +
  // inner(outlineFillStyle), except text, which has no separate fill child (see outlineStyle).
  const OutlineLayer = (p, off, mirrored, faded) => !pieceShowsOutline(p) ? null : (
    p.kind === "text"
      ? <div style={outlineStyle(p, off, mirrored, faded)}>{textInner(p, true)}</div>
      : <div style={outlineStyle(p, off, mirrored, faded)}><div style={outlineFillStyle(p)} /></div>
  );
  // Editor selection must trace the painted silhouette, not the piece's rectangular layout box.
  // That box is especially misleading for a half-triangle: half of the old blue rectangle was
  // transparent, and clicking there bubbled to the canvas and deselected the piece. An SVG stroke
  // uses the same normalized polygon points as the fill/cutter/normal outline, so it stays exact
  // through resize, rotation, custom Fill polygons, and mirrored copies.
  const SelectionOutline = (p, mirrored, color) => {
    const s = shapeStyle({ ...p, fx: null }, null, false, mirrored);
    Object.assign(s, { pointerEvents: "none", overflow: "visible" });
    const common = { fill: "none", stroke: color, strokeWidth: 2, strokeDasharray: "5 3", strokeLinejoin: "round", vectorEffect: "non-scaling-stroke" };
    const pts = shapePolyPoints(p);
    let shape;
    if (pts) shape = <polygon points={pts.map(([x, y]) => `${x * 100},${y * 100}`).join(" ")} {...common} />;
    else if (p.kind === "circle") shape = <ellipse cx="50" cy="50" rx="50" ry="50" {...common} />;
    else if (p.kind === "roundrect") shape = <rect x="0" y="0" width="100" height="100" rx="22" ry="22" {...common} />;
    else shape = <rect x="0" y="0" width="100" height="100" {...common} />;
    return <svg style={s} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{shape}</svg>;
  };
  const Static = (p, off, faded, flip, key, onPiecePointerDown) => {
    const s = shapeStyle(p, off, faded, flip);
    // The positioning wrapper is rectangular, even for circles, triangles, stars, and sparse
    // prop art. Keep that transparent rectangle out of hit-testing. When an interaction is
    // supplied, only the clipped/painted inner shape receives the click.
    s.pointerEvents = "none";
    const fill = shapeFillStyle(p);
    if (onPiecePointerDown) { fill.pointerEvents = "auto"; fill.cursor = "pointer"; }
    return <React.Fragment key={key}>{OutlineLayer(p, off, flip, faded)}<div style={s}><div style={fill} onPointerDown={onPiecePointerDown}>{pieceInner(p)}</div></div></React.Fragment>;
  };
  // Renders a PROP asset's pixel art scaled to fill its placement box, at animation frame
  // `frameIdx`. The prop's pieces are positioned by percentage of the 200×260 design canvas (that's
  // what shapeStyle does everywhere), so a plain inner container at 100%/100% of the sz-box makes
  // every piece scale together to fit — it never tiles or duplicates, whatever size is chosen. The
  // wrapper is the 200x260 canvas mapped onto the sz-box at TRUE aspect (uniform "contain" scale,
  // centred) — NOT stretched to fill the square, which would shear rotated pieces out of alignment.
  const propArtInner = (propAsset, widthPx, heightPx, frameIdx, keyBase, tightBox, onPiecePointerDown) => {
    const frames = (propAsset && propAsset.frames) || [propAsset && propAsset.angles].filter(Boolean);
    const frame = frames.length ? frames[Math.min(frames.length - 1, Math.max(0, frameIdx || 0))] : null;
    const front = (frame && frame.front) || (propAsset && propAsset.angles && propAsset.angles.front) || [];
    const pieces = [];
    // Cutter pieces must stay IN this list: renderPieceRuns needs to see them to build the hole
    // mask, and it drops them from the drawn set itself, so they still paint nothing. Filtering
    // them out here meant a prop's run never reported hasCutter and the cutter tool silently did
    // nothing on props — no hole was ever cut in a placed object.
    for (const p of front) { if (p.isHitbox) continue; pieces.push(p); if (pmirror(p, "front")) pieces.push(reflect(p)); }
    if (!pieces.some((p) => !p.isCutter)) return <span style={{ fontSize: Math.max(widthPx, heightPx) * 0.6 + "px", opacity: 0.5, pointerEvents: onPiecePointerDown ? "auto" : undefined, cursor: onPiecePointerDown ? "pointer" : undefined }} onPointerDown={onPiecePointerDown}>🌿</span>;
    if (tightBox) {
      // Render the full design canvas (shapeStyle positions pieces as percentages of it), but
      // translate that canvas so the measured visible-art box begins at the placement's 0,0.
      // This crops empty authoring-canvas space without stretching or relocating any piece.
      const scale = Math.min(widthPx / tightBox.w, heightPx / tightBox.h);
      return <div style={{ position: "absolute", left: -tightBox.minX * scale, top: -tightBox.minY * scale, width: W * scale, height: H * scale, pointerEvents: "none" }}>{renderPieceRuns({ pieces, cacheKey: keyBase || "prop", keyPrefix: (keyBase || "prop") + "_", drawPiece: (pc, k) => Static(pc, null, false, !!pc._m, k, onPiecePointerDown), maskCss: cutterMaskCss })}</div>;
    }
    const sz = Math.max(widthPx, heightPx);
    const _k = Math.min(sz / W, sz / H), _bw = W * _k, _bh = H * _k; return <div style={{ position: "absolute", left: (sz - _bw) / 2, top: (sz - _bh) / 2, width: _bw, height: _bh, pointerEvents: "none" }}>{renderPieceRuns({ pieces, cacheKey: keyBase || "prop", keyPrefix: (keyBase || "prop") + "_", drawPiece: (pc, k) => Static(pc, null, false, !!pc._m, k, onPiecePointerDown), maskCss: cutterMaskCss })}</div>;
  };
  // One place that turns a placed level object into its inner JSX — emoji/shape via objInner,
  // or a prop via propArtInner (looking the asset up + choosing its current animation frame).
  // `animT` is a running frame counter (only advanced during play) so animated props cycle.
  const renderObj = (o, widthPx, keyBase, animT, heightPx = widthPx, tightBox = null, onPiecePointerDown) => {
    if (o && o.kind === "prop") {
      const pa = findA(o.propId);
      if (!pa) return <span style={{ fontSize: Math.max(widthPx, heightPx) * 0.5 + "px", opacity: 0.5, pointerEvents: onPiecePointerDown ? "auto" : undefined, cursor: onPiecePointerDown ? "pointer" : undefined }} onPointerDown={onPiecePointerDown}>❓</span>;
      const frames = (pa.frames && pa.frames.length) ? pa.frames.length : 1;
      const fps = pa.animFps || 6;
      const frameIdx = (play && frames > 1) ? Math.floor(((animT || 0) / 60) * fps) % frames : 0;
      return propArtInner(pa, widthPx, heightPx, frameIdx, keyBase, tightBox, onPiecePointerDown);
    }
    return objInner(o, widthPx);
  };
  // Renders a piece's mirrored twin. When the original is selected — single or as part of a
  // group — the twin gets the same dashed highlight so it's visually obvious the two sides are
  // linked (e.g. arms, legs).
  const MirrorGhost = (p, key) => {
    const mirrored = reflect(p);
    const s = shapeStyle(mirrored, null, false, true);
    s.pointerEvents = "none";
    const fillS = shapeFillStyle(mirrored);
    // A cutter paints no colour of its own — shapeFillStyle deliberately skips it, because the real
    // hole is a container mask applied at render time. Block() compensates with a hatch so the
    // cutter is visible while editing; this ghost did not, so a MIRRORED cutter drew as literally
    // nothing. Ticking "Mirror this block" on a cutter therefore looked like it did nothing at all,
    // even though the twin has always cut correctly in the finished render (cutterMaskCss mirrors
    // it). Same hatch, dimmed — this is the un-grabbable half of the pair.
    if (p.isCutter) {
      fillS.background = "repeating-conic-gradient(#5b6478 0% 25%, #232838 0% 50%) 0 0/10px 10px";
      fillS.border = "2px dashed #cfd6e6";
      fillS.opacity = 0.55;
    }
    const selectionColor = groupIds.includes(p.id) ? "#ffb84f" : p.id === selId ? "#4f7cf6" : null;
    return <React.Fragment key={key}>{OutlineLayer(mirrored, null, true, false)}<div style={s}><div style={fillS}>{pieceInner(mirrored)}</div></div>{selectionColor && SelectionOutline(mirrored, true, selectionColor)}</React.Fragment>;
  };
  // A cutter piece paints nothing of its own in shapeFillStyle (its hole is a container-level
  // mask applied at final-render sites — see cutterMaskCss) — but while EDITING it still needs to
  // read as "a hole lives here" and stay grabbable, so it gets its own unmistakable look here,
  // same idea as the isHitbox treatment in shapeFillStyle (editor-only, never reaches gameplay
  // because gameplay render sites filter isCutter pieces out before mapping them to Static).
  const Block = (p) => {
    const s = shapeStyle(p, null, false, false);
    // Only the painted/clipped inner shape is a hit target. Leaving the transparent outer layout
    // rectangle interactive made the empty half of a half-triangle swallow clicks and immediately
    // deselect it via handleArtClick, while also blocking pieces drawn underneath that empty half.
    s.pointerEvents = "none";
    const fillS = shapeFillStyle(p);
    fillS.pointerEvents = "auto";
    fillS.cursor = "grab";
    if (p.isCutter) { fillS.background = "repeating-conic-gradient(#5b6478 0% 25%, #232838 0% 50%) 0 0/10px 10px"; fillS.border = "2px dashed #cfd6e6"; }
    const selectionColor = groupIds.includes(p.id) ? "#ffb84f" : p.id === selId ? "#4f7cf6" : null;
    return <React.Fragment key={p.id}>{OutlineLayer(p, null, false, false)}<div style={s}><div style={fillS} onPointerDown={(e) => grabPiece(e, p)}>{pieceInner(p)}</div></div>{selectionColor && SelectionOutline(p, false, selectionColor)}</React.Fragment>;
  };
  const pctBox = (q) => ({ left: (q.x / W * 100) + "%", top: (q.y / H * 100) + "%", width: (q.w / W * 100) + "%", height: (q.h / H * 100) + "%" });

  /* ---- save / open ------------------------------------------------------ */
  const syncWeapon = (a) => { if (!a || a.type !== "weapon") return a; const states = { rest: blankAngles(), fire: blankAngles(), ...(a.states || {}) }; states[wState] = a.angles; return { ...a, states, angles: states.rest }; };
  const syncEnemy = (a) => { if (!a || a.type !== "enemy") return a; const states = { normal: blankAngles(), onFire: blankAngles(), charge: blankAngles(), ...(a.states || {}) }; states[eState] = a.angles; return { ...a, states, angles: states.normal }; };
  // While designing an effect's animation, asset.angles points at a FRAME, not this equipment's
  // own art — but the asset never stops being type "equipment", so syncFit below must never see
  // that frame sitting in asset.angles or it would save it into variants[guideId], clobbering the
  // item's real appearance. This flushes the frame back into effects[].animByBody first, then
  // restores asset.angles to the equipment's real working layout, exactly like the other sync*
  // functions restore their own state's real angles before syncFit runs.
  const syncEffectAnim = (a) => {
    if (!a || a.type !== "equipment" || !effEdit) return a;
    const effects = (a.effects || []).map((e) => {
      if (e.id !== effEdit.effId) return e;
      const animByBody = { ...e.animByBody };
      const frames = [...(animByBody[effEdit.bodyKey] || [blankFrame()])];
      frames[effEdit.frameIdx] = a.angles;
      animByBody[effEdit.bodyKey] = frames;
      return { ...e, animByBody, lastFit: effEdit.bodyKey };
    });
    const restoredAngles = (a.variants && (a.variants[a.guideId] || a.variants.default)) || a.angles;
    return { ...a, effects, angles: restoredAngles };
  };
  const syncFit = (a) => {
    if (!a || !HAS_FIT_VARIANTS(a)) return a;
    const curKey = a.guideId || "default";
    const variants = { default: blankFitVariant(a.type), ...(a.variants || {}) };
    // syncWeapon (which runs before this in the pipeline) has already flushed whichever state
    // was being viewed into a.states, so for weapons the save-time snapshot reads a.states/
    // a.hand directly rather than re-deriving from the live wState the way switchGuideFit does.
    const snapshot = a.type === "weapon" ? { states: a.states || { rest: blankAngles(), fire: blankAngles() } } : a.angles;
    // Clobber guard: an entirely blank working layout never silently overwrites a stored
    // variant that has real content — unless this guide was genuinely edited this session
    // (dirtyGuides), i.e. the person deliberately deleted every piece. This makes save-time
    // data destruction structurally impossible even if some future load-path bug reappears.
    const storedHasArt = variants[curKey] && !fitVariantEmpty(a.type, variants[curKey]);
    const workingBlank = fitVariantEmpty(a.type, snapshot);
    if (!(workingBlank && storedHasArt && !dirtyGuides.current.has(curKey))) variants[curKey] = snapshot;
    const stored = variants[curKey];
    const patch = a.type === "weapon" ? { states: stored.states, angles: stored.states.rest } : { angles: stored };
    return { ...a, variants, ...patch, lastFit: curKey };
  };
  // Prop: flush the frame currently being edited (a.angles) back into a.frames[propFrame], and
  // point a.angles at frame 0 as the canonical "base look". Same idea as syncWeapon/syncEnemy
  // flushing their live state before save.
  const syncProp = (a) => { if (!a || a.type !== "prop") return a; const frames = [...(a.frames || [blankAngles()])]; frames[propFrame] = a.angles; return { ...a, frames, angles: frames[0] }; };
  const data = () => JSON.stringify(syncProp(syncFit(syncEnemy(syncWeapon(syncEffectAnim(asset))))), null, 2);
  const openSheet = () => { setText(data()); setSheet(true); };
  const saveAsset = async () => {
    let payload = syncProp(syncFit(syncEnemy(syncWeapon(asset))));
    if (HAS_FIT_VARIANTS(payload)) {
      // Confirm every guide body actually EDITED this session (dirtyGuides — set by real piece
      // mutations, never by merely switching the guide dropdown to look at one), plus whichever
      // is active right now even if this exact save has no new edits on it (e.g. re-saving to
      // flag a fit that was already finished). Covers switching through and editing several
      // bodies before a single Save at the end — not just whichever happened to be active then.
      const key = payload.guideId || "default";
      const confirmed = new Set(payload.confirmedFits || []);
      confirmed.add(key);
      for (const g of dirtyGuides.current) confirmed.add(g);
      payload = { ...payload, confirmedFits: [...confirmed] };
      dirtyGuides.current = new Set();
    }
    payload = { ...payload, savedAt: Date.now() };
    let list = []; const idx = await sget("assetIndex"); if (idx) try { list = JSON.parse(idx); } catch { list = []; }
    // Same-name saves update the loaded id. A changed name is Save As: resolveSaveTarget assigns a
    // fresh id so the original saved asset remains exactly as it was.
    const target = resolveSaveTarget(list, payload);
    if (target.id !== payload.id) payload = { ...payload, id: target.id };
    const ok1 = await sset("asset:" + payload.id, JSON.stringify(payload));
    list = list.filter((x) => x.id !== payload.id); list.push({ id: payload.id, name: payload.name, type: payload.type });
    const ok2 = await sset("assetIndex", JSON.stringify(list));
    // Push this edit into every saved Dressed Look already wearing it, re-baking that look's art
    // from its own embedded components. Without this a shirt edit only reached Playtest after
    // manually re-equipping the shirt in Dress Bob and re-saving the look over the top of itself.
    let refreshed = 0;
    if (ok1 && ok2) {
      for (const entry of list.filter((x) => x.type === "character")) {
        try {
          const raw = await sget("asset:" + entry.id); if (!raw) continue;
          const look = migrate(JSON.parse(raw));
          if (!lookWearsAsset(look, payload.id)) continue;
          const rebuilt = rebuildLook(swapLookComponent(look, payload));
          if (!rebuilt) continue;
          if (await sset("asset:" + entry.id, JSON.stringify(rebuilt))) refreshed++;
        } catch { /* a look that won't parse or rebuild is left exactly as it was */ }
      }
    }
    if (ok1 && ok2) {
      if (payload.id !== asset.id) setAsset((a) => ({ ...a, id: payload.id }));
      const worn = refreshed ? " — updated " + refreshed + " dressed look" + (refreshed === 1 ? "" : "s") : "";
      flash(target.mode === "rename" ? "Saved as a new \"" + payload.name + "\" ✓ — the original was kept"
        : "Saved to this device ✓" + worn);
      loadLibrary();
    } else flash("Couldn't save here — use Download.");
  };
  const convertLegacyProjectile = async () => {
    const legacyDrawn = asset.states?.projectile;
    const hasDrawnArt = legacyDrawn && !anglesEmpty(legacyDrawn);
    const na = newAsset("projectile");
    na.name = (asset.name || "Weapon") + " — projectile";
    if (hasDrawnArt) {
      na.angles = JSON.parse(JSON.stringify(legacyDrawn));
      na.size = asset.projectile?.size || 1;
    } else {
      // No drawn art existed — rebuild an equivalent single emoji piece + a matching hitbox,
      // so the fallback keeps looking and hitting exactly like it did before conversion.
      const legacy = asset.projectile || {};
      const sz = 44;
      na.angles.front = [
        { id: uid(), kind: "emoji", x: Math.round(W / 2 - sz / 2), y: Math.round(H / 2 - sz / 2), w: sz, h: sz, char: legacy.char || "🔥", tint: legacy.tint || null, mirror: false, fx: defaultFx() },
        { id: uid(), kind: "rect", x: Math.round(W / 2 - sz / 2), y: Math.round(H / 2 - sz / 2), w: sz, h: sz, color: "#ff3c3c", mirror: false, isHitbox: true },
      ];
      na.size = legacy.size || 1;
    }
    na.savedAt = Date.now();
    let list = []; const idx = await sget("assetIndex"); if (idx) try { list = JSON.parse(idx); } catch { list = []; }
    const ok1 = await sset("asset:" + na.id, JSON.stringify(na));
    list = list.filter((x) => x.id !== na.id); list.push({ id: na.id, name: na.name, type: na.type });
    const ok2 = await sset("assetIndex", JSON.stringify(list));
    if (ok1 && ok2) { setAsset((a) => ({ ...a, projectileId: na.id })); flash("Saved \"" + na.name + "\" as its own Projectile ✓ — assigned to this weapon."); loadLibrary(); } else flash("Couldn't save here — use Download, then Upload it manually.");
  };
  const download = () => { try { const b = new Blob([data()], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = (asset.name || "asset") + ".json"; a.click(); flash("Downloaded ✓"); } catch { flash("Download blocked — copy the text."); } };
  const copy = () => { try { navigator.clipboard?.writeText(text); flash("Copied ✓"); } catch { flash("Select the text and copy it."); } };
  const migrate = (a) => { try { if (a.type === "skin" && a.hand) a.type = "body"; const m = a.mirror !== false; for (const ang of ANGLES) (a.angles[ang] || []).forEach((p) => { if (p.mirror === undefined) p.mirror = m; }); if (a.type === "weapon") { if (!a.states) a.states = { rest: a.angles || blankAngles(), fire: blankAngles() }; a.angles = a.states.rest || a.angles; if (!a.wtype) a.wtype = "melee"; else if (a.wtype === "projectile") a.wtype = "ranged"; if (a.projectileId === undefined) a.projectileId = null; if (a.projectileSpeed === undefined) a.projectileSpeed = a.projectile?.speed ?? 12; if (a.projectileRange === undefined) a.projectileRange = DEFAULT_PROJECTILE_RANGE; if (a.damage === undefined) a.damage = 5; if (a.fireRate === undefined) a.fireRate = DEFAULT_FIRE_RATE; if (a.clipSize === undefined) a.clipSize = DEFAULT_CLIP_SIZE; if (a.reloadTime === undefined) a.reloadTime = DEFAULT_RELOAD_TIME; if (a.weight === undefined) a.weight = DEFAULT_THROW_WEIGHT; if (a.landEffect === undefined) a.landEffect = "fire"; if (a.landEffectDps === undefined) a.landEffectDps = 6; if (a.landEffectLife === undefined) a.landEffectLife = 6; if (a.landRadius === undefined) a.landRadius = DEFAULT_LAND_RADIUS; if (a.landPropId === undefined) a.landPropId = null; if (a.explode === undefined) a.explode = false; if (a.ignoreArmor === undefined) a.ignoreArmor = false; if (a.burst === undefined) a.burst = DEFAULT_BURST; if (a.burstDelay === undefined) a.burstDelay = DEFAULT_BURST_DELAY; { const modes = migratedWeaponFireModes(a); a.burstFire = modes.burstFire; a.fullAuto = modes.fullAuto; } if (a.explodeRadius === undefined) a.explodeRadius = 2; if (a.explodePropId === undefined) a.explodePropId = null; if (a.explodeSize === undefined) a.explodeSize = 3; if (a.explodeLife === undefined) a.explodeLife = 0.5; if (a.stun === undefined) a.stun = 0; } if (a.type === "projectile" && a.size === undefined) a.size = 1;
    if (HAS_CATEGORIES(a) && !Array.isArray(a.categories)) a.categories = ["", "", ""];
    if (a.type === "prop") { if (a.size === undefined) a.size = 2; if (!Array.isArray(a.frames) || !a.frames.length) a.frames = [a.angles || blankAngles()]; a.angles = a.frames[0]; if (a.animFps === undefined) a.animFps = 6; if (a.solidDefault === undefined) a.solidDefault = false; }
    if (a.type === "item") { a.effect = normItemEffect(a.effect); if (!Array.isArray(a.categories)) a.categories = ["", "", ""]; }
    if (a.type === "enemy") { if (!a.states) a.states = { normal: a.angles || blankAngles(), onFire: blankAngles(), charge: blankAngles() }; a.angles = a.states.normal || a.angles; if (a.hasArms === undefined) a.hasArms = !!(a.angles && ANGLES.some((ang) => (a.angles[ang] || []).some((p) => p.role === "weaponArm"))); for (const k of Object.keys(a.angles || {})) (a.angles[k] || []).forEach((p) => { if (p.locked) delete p.locked; }); if (!a.stats) a.stats = DEFAULT_STATS(); if (a.hp === undefined) a.hp = 10; if (!a.ai) a.ai = "guard"; if (a.weaponId === undefined) a.weaponId = null; }
    if (a.type === "skin" && !a.stats) a.stats = DEFAULT_STATS();
    if (HAS_FIT_VARIANTS(a) && !a.variants) {
      if (a.type === "weapon") { a.variants = { default: { states: a.states || { rest: a.angles || blankAngles(), fire: blankAngles() } } }; }
      else { a.variants = { default: a.angles || blankAngles() }; a.angles = a.variants.default; }
      a.lastFit = "default";
    }
    if (HAS_FIT_VARIANTS(a) && a.variants) {
      // Load the layout this asset was saved as designing for (guideId), NOT whatever the
      // top-level angles field happens to hold — pre-fix saves always wrote angles=default
      // there, so opening showed a blank/stale canvas while the real art sat unloaded in
      // variants[bodyId], and a re-save from that state then overwrote the real art with the
      // blank ("my pants keep reverting"). Fallback chain for odd/partial states: the guide's
      // own layout → lastFit's → default → ANY variant that still has content, so whatever art
      // still exists anywhere in the save is what comes up, never a silent blank over real work.
      const gk = a.guideId || "default";
      let loadKey = null;
      if (a.variants[gk] && !fitVariantEmpty(a.type, a.variants[gk])) loadKey = gk;
      else if (a.lastFit && a.variants[a.lastFit] && !fitVariantEmpty(a.type, a.variants[a.lastFit])) loadKey = a.lastFit;
      else if (a.variants.default && !fitVariantEmpty(a.type, a.variants.default)) loadKey = "default";
      else loadKey = Object.keys(a.variants).find((k) => !fitVariantEmpty(a.type, a.variants[k])) || gk;
      if (!a.variants[loadKey]) a.variants[loadKey] = blankFitVariant(a.type);
      if (a.type === "weapon") { a.states = a.variants[loadKey].states; a.angles = a.states.rest; }
      else { a.angles = a.variants[loadKey]; }
      a.guideId = loadKey === "default" ? (a.guideId || "default") : loadKey; // keep the editor's guide picker pointing at the layout actually on screen
    }
    if (HAS_FIT_VARIANTS(a) && a.variants && !a.lastFit) a.lastFit = "default";
    if (HAS_FIT_VARIANTS(a) && !a.confirmedFits) a.confirmedFits = []; // no retroactive guessing — starts as "confirmed for nobody" until re-saved
    if (a.type === "equipment") {
      if (!a.statBoosts) a.statBoosts = DEFAULT_STAT_BOOSTS();
      if (a.defense === undefined) a.defense = 0;
      if (!a.effects) a.effects = [];
      a.effects.forEach((e) => {
        const def = EFFECT_TYPES[e.type];
        if (!e.animByBody) e.animByBody = {}; // leave unseeded — openEffectAnim seeds a real frame from this equipment's own art the first time the designer opens for a body
        if (!e.lastFit) e.lastFit = "default";
        if (def) def.params.forEach((p) => { if (e[p.key] === undefined) e[p.key] = p.def; });
      });
    }
    // Back-tag the baked weapon pieces in character saves made before _isWeapon existed.
    // composeLook appends the weapon LAST per angle, so the trailing N pieces are the weapon
    // — N recomputed from the embedded weapon component (counting its mirror twins for
    // non-side angles, exactly as bake() expanded them). Old-format looks without embedded
    // components can't be back-tagged; re-save them through Dress Bob to fix.
    if (a.type === "character" && a.components && a.components.weapon && a.angles) {
      const wsrc = a.components.weapon.angles || (a.components.weapon.states && a.components.weapon.states.rest) || {};
      for (const ang of ANGLES) {
        const arr = a.angles[ang] || [];
        if (!arr.length || arr.some((p) => p._isWeapon)) continue;
        const n = (wsrc[ang] || []).reduce((s, p) => s + 1 + ((p.mirror && ang !== "side") ? 1 : 0), 0);
        for (let i = Math.max(0, arr.length - n); i < arr.length; i++) arr[i]._isWeapon = true;
      }
    } } catch (e) {} return withRig(a); };
  // Pasted text goes through the SAME door as a file: normalize (repair + explain), then
  // openAsset, which is the only path that knows a dressed look has to open in Dress Bob rather
  // than the piece editor (which cannot render one). loadText used to setAsset() directly and
  // skip that, so pasting a look's JSON dropped you into an editor that couldn't draw it.
  const loadText = () => {
    let c;
    // Tolerate the ways a chatbot (Grok, etc.) commonly hands back JSON: wrapped in ```json fences,
    // with a sentence of preamble before it, or trailing commentary after. Pull out the substring
    // from the first { to its matching last }, so a copy-paste that includes extra prose still loads.
    const raw = (text || "").trim();
    const tryParse = (s) => { try { return JSON.parse(s); } catch { return undefined; } };
    c = tryParse(raw);
    if (c === undefined) {
      const fenced = raw.replace(/^[\s\S]*?```(?:json)?\s*/i, "").replace(/```[\s\S]*$/, "").trim();
      c = tryParse(fenced);
    }
    if (c === undefined) {
      const first = raw.indexOf("{"), last = raw.lastIndexOf("}");
      if (first !== -1 && last > first) c = tryParse(raw.slice(first, last + 1));
    }
    if (c === undefined) { flash("That text isn't valid JSON — copy the whole asset, from the first { to the last }."); return; }
    let a;
    try { a = normalizeAssetJson(c); } catch (e) { flash(e.message || "That text isn't an asset file."); return; }
    setSheet(false);
    openAsset(a);
    flash("Loaded ✓");
  };
  const upload = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const parsed = JSON.parse(r.result); if (parsed && Array.isArray(parsed.assets) && parsed.assetBuilderBackup) { restoreBackup(parsed); return; } const c = normalizeAssetJson(parsed); openAsset(c); setSheet(false); flash("Opened file ✓"); } catch (err) { flash(err && err.message ? err.message : "Couldn't read that file."); } }; r.readAsText(f); };
  // One-file backup of EVERY saved asset — everything lives in the browser's storage, so this is
  // the only way to get it out to a safe place. Re-opening the same file via ⬆ Open a file
  // restores every asset back into the save store (same id = updated in place, never duplicated).
  const exportAllAssets = () => {
    try {
      if (!library.length) { flash("Nothing saved yet — nothing to export."); return; }
      const stamp = new Date().toISOString().slice(0, 10);
      const payload = JSON.stringify({ assetBuilderBackup: 1, exportedAt: Date.now(), assets: library }, null, 1);
      const b = new Blob([payload], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "assetbuilder-backup-" + stamp + ".json"; a.click();
      flash("Exported all " + library.length + " saved assets ✓ — keep that file somewhere safe.");
    } catch { flash("Download blocked — try again."); }
  };
  const restoreBackup = async (bk) => {
    let list = []; const idx = await sget("assetIndex"); if (idx) try { list = JSON.parse(idx); } catch { list = []; }
    let n = 0;
    for (const raw of bk.assets) {
      try {
        const a = normalizeAssetJson(raw);
        const ok = await sset("asset:" + a.id, JSON.stringify(a));
        if (ok) { list = list.filter((x) => x.id !== a.id); list.push({ id: a.id, name: a.name, type: a.type }); n++; }
      } catch { /* skip a corrupt entry, restore the rest */ }
    }
    await sset("assetIndex", JSON.stringify(list));
    loadLibrary();
    flash("Restored " + n + " asset(s) from the backup ✓");
  };

  // loadTextures() here as well as in the level creator: pieces can be painted with a texture now
  // (Flannel and friends), so the library has to be in hand before the editor draws anything —
  // otherwise an already-textured jacket opens as flat colour until you happen to visit a level.
  const start = (type, slot, wtype) => { loadTextures(); setAsset(newAsset(type, slot, wtype)); setAngle(type === "weapon" || type === "enemy" ? "side" : "front"); setSelId(null); setWState("rest"); setEState("normal"); setEffEdit(null); setPoseCopySrc(null); setPropFrame(0); setEyedrop(false); resetHistory(); dirtyGuides.current = new Set(); setScreen("editor"); };
  // Dressed characters are baked composites — the piece editor has no concept of them and
  // used to white-screen (TYPES["character"] is undefined). View them in Dress Bob instead.
  const openAsset = (a) => {
    setConfirmDel(null);
    loadTextures(); // same reason as start(): a textured piece must have its pattern available on open
    if (a.type === "character") { openDressedLook(a); setAAngle("front"); setScreen("assemble"); flash("Viewing \"" + a.name + "\" — dressed looks open in Dress Bob."); return; }
    setAsset(migrate(JSON.parse(JSON.stringify(a)))); setAngle(a.type === "weapon" || a.type === "enemy" ? "side" : "front"); setSelId(null); setWState("rest"); setEState("normal"); setEffEdit(null); setPoseCopySrc(null); setPropFrame(0); setEyedrop(false); resetHistory(); dirtyGuides.current = new Set(); setScreen("editor");
  };

  /* ---- assembler -------------------------------------------------------- */
  const allAssets = useMemo(() => [...library, ...sessionAssets.filter((s) => !library.find((l) => l.id === s.id))], [library, sessionAssets]);
  // O(1) instead of allAssets.find()'s O(n) — findA is called several times PER ENEMY PER
  // FRAME during Playtest (physics loop + render loop each look up the same spawn's asset
  // independently), so with n enemies and a library of m saved assets this was O(n*m) of
  // wasted linear scanning every single frame, on top of allAssets itself being rebuilt from
  // scratch (including a nested O(n*m) filter) on every render before this fix.
  const assetById = useMemo(() => { const m = new Map(); for (const a of allAssets) m.set(a.id, a); return m; }, [allAssets]);
  const findA = (id) => assetById.get(id) || null;
  // Baked ground art is cached by item id (see groundArt), so it has to be dropped whenever the
  // library changes underneath it — otherwise redrawing a rifle in the Asset Studio and coming
  // back would leave the old one lying on the pedestal.
  useEffect(() => { groundArtCache.current.clear(); }, [allAssets]);
  const levelObjectPixelLayout = (object, cellPx = LV_CELL) => {
    const fp = levelObjectFootprint(object, object && object.kind === "prop" ? findA(object.propId) : null);
    return { width: fp.cols * cellPx, height: fp.rows * cellPx, box: fp.box };
  };
  // Permanently remove a saved asset: its own storage entry, its index row, and any
  // session copy. Guarded by a confirm in the UI — this is not undoable.
  const deleteAsset = async (a) => {
    await sdel("asset:" + a.id);
    let list = []; const idx = await sget("assetIndex"); if (idx) try { list = JSON.parse(idx); } catch { list = []; }
    await sset("assetIndex", JSON.stringify(list.filter((x) => x.id !== a.id)));
    setSessionAssets((s) => s.filter((x) => x.id !== a.id));
    flash("Deleted \"" + a.name + "\"");
    loadLibrary();
  };
  // Write a recovered/embedded layer back into the saved library. Keeps the asset's original
  // id, so recovering is idempotent and anything referencing it (loadouts, guideId) re-links.
  const restoreComponent = async (a) => {
    const c = { ...migrate(JSON.parse(JSON.stringify(a))), savedAt: Date.now() };
    const ok1 = await sset("asset:" + c.id, JSON.stringify(c));
    let list = []; const idx = await sget("assetIndex"); if (idx) try { list = JSON.parse(idx); } catch { list = []; }
    list = list.filter((x) => x.id !== c.id); list.push({ id: c.id, name: c.name, type: c.type });
    const ok2 = await sset("assetIndex", JSON.stringify(list));
    if (ok1 && ok2) { flash("Recovered \"" + c.name + "\" into your saved assets ✓"); loadLibrary(); } else flash("Couldn't save here.");
  };
  const handForGuideId = (guideId) => { if (guideId && guideId !== "default") { const g = findA(guideId); if (g) { const o = {}; for (const ang of ANGLES) o[ang] = bodyRig(g, ang).hand; return o; } } return DEFAULT_HAND; };
  const handForGuide = (a) => handForGuideId(a && a.guideId); // the weapon EDITOR's own canvas preview only — keyed by whatever body is selected in "Design for body", unrelated to playtest attach below
  // Resolves which of a weapon's per-body fits should actually attach to `equippedBodyId` right
  // now: its own saved fit if it has one, else the fit last worked on, else default — the same
  // fallback chain skins/equipment use. This — NOT whatever body happens to be selected in the
  // weapon editor's own "Design for body" preview dropdown (asset.guideId) — is what decides
  // guideHand at the two attachWeaponBlocks call sites below. Previously those both read
  // handForGuide(playtestWeapon), i.e. the EDITOR's last-touched guideId, so a weapon's actual
  // attached position during Playtest depended on which body someone had last clicked "Design
  // for" on in a completely different screen — moving it while previewing one body visibly
  // moved it for every body, since there was only ever one shared position, period.
  const weaponFitFor = (w, equippedBodyId) => {
    const blank = { states: { rest: blankAngles(), fire: blankAngles() } };
    if (!w) return { ...blank, guideId: "default" };
    if (!w.variants) return { states: w.states || blank.states, guideId: "default" };
    const key = (equippedBodyId && w.variants[equippedBodyId] && !fitVariantEmpty("weapon", w.variants[equippedBodyId])) ? equippedBodyId : (w.lastFit && w.variants[w.lastFit] ? w.lastFit : "default");
    const v = w.variants[key] || w.variants.default || blank;
    return { states: v.states || blank.states, guideId: key };
  };
  // Which BODY asset a currently-equipped playerAsset actually resolves to, for weapon-fit
  // lookup — playerAsset may be a raw body (its own id is the answer) or a saved Dress Bob
  // look composed FROM a body (its recipe records which one).
  const equippedBodyIdFor = (pa) => !pa ? null : (pa.type === "body" ? pa.id : (pa.recipe && pa.recipe.bodyId) || null);
  // ---- PLAYER-BASED enemy melee: weapon-hitbox driven, exactly like the player --------------
  // A Dress Bob look saved as an enemy fights the way the player fights: its melee reach IS its
  // weapon's own (drawn or auto) hitbox swung through the same windup/strike arc, and a hit only
  // lands on the frame that swung box physically overlaps the player. No stored range number is
  // consulted for these — the ⚔️ field only remains for drawn enemy-type monsters, which have no
  // weapon geometry to measure. Bare-handed looks swing the same fist box the player does.
  const enemyMeleeGeom = (ea, ew) => {
    if (!ea || ea.type !== "character" || !ea.isEnemy) return null;
    if (ew && (isRanged(ew.wtype) || isThrowable(ew.wtype))) return null;
    const side = (ea.angles && ea.angles.side) || [];
    const armPiece = armOf(side) || enemyAimArm(side);
    if (!armPiece) return null;
    const wfit = ew ? weaponFitFor(ew, equippedBodyIdFor(ea)) : null;
    const guideHand = ew ? (handForGuideId(wfit.guideId).side || DEFAULT_HAND.side) : ((ea.hand && ea.hand.side) || DEFAULT_HAND.side);
    return { armPiece, baseArmRot: armPiece.rot || 0, wfit, guideHand };
  };
  const enemyMeleeHitboxAt = (geom, ew, swingAngle) => {
    const curArm = { ...geom.armPiece, rot: geom.baseArmRot + armPivotSign(geom.armPiece.armPivot) * swingAngle };
    const hbRaw = ew
      ? weaponHitboxPieces(bake({ ...ew, angles: weaponFireArt(geom.wfit.states, "side") }, "side"))
      : [{ id: "fist", kind: "rect", x: geom.guideHand.x - 20, y: geom.guideHand.y - 20, w: 40, h: 40, isHitbox: true }];
    return attachWeaponBlocks(hbRaw, curArm, geom.guideHand, geom.baseArmRot);
  };
  // Engage distance = how far the swung hitbox actually extends past the visible body edge,
  // swept over the full swing — i.e. "can my blade reach from here", same convention as boxGap.
  const enemyMeleeReach = (ea, ew, geom) => {
    const key = ea.id + "|" + (ew ? ew.id : "") + "|" + (ea.savedAt || 0) + "|" + ((ew && ew.savedAt) || 0);
    const c = meleeReach.current;
    if (c[key] !== undefined) return c[key];
    const eShape = sideBodyShape(ea);
    const eRenderW = enemyRenderW(ea, LV_CELL), epw = eRenderW * eShape.fraction;
    let maxOut = 0;
    for (let t = 0; t <= ATTACK_SWING_FRAMES; t += 0.5) {
      const sa = meleeSwingAngle(t, ATTACK_SWING_FRAMES);
      for (const hb of enemyMeleeHitboxAt(geom, ew, sa)) maxOut = Math.max(maxOut, ((hb.x + hb.w) / W) * eRenderW - eShape.centerFrac * eRenderW);
    }
    return (c[key] = Math.max(10, maxOut - epw / 2));
  };
  // Opening a saved look used to only set viewDressed for the frozen preview, leaving `loadout`
  // completely untouched. Since every part-picker's onChange both updates one loadout field AND
  // drops out of the frozen preview (setViewDressed(null)) to show the live composite, the FIRST
  // edit after opening a look — e.g. picking a different weapon — would render on whatever body/
  // skin `loadout` last held from an earlier session, not the look that was just opened. Syncing
  // loadout from the look's own recipe here keeps them in lockstep from the moment it's opened.
  const openDressedLook = (a) => { setViewDressed(a); if (a.recipe) setLoadout({ bodyId: a.recipe.bodyId || "", skinId: a.recipe.skinId || "", slots: { ...(a.recipe.slots || {}) }, weaponId: a.recipe.weaponId || "" }); };
  // Same fix as the Playtest attach sites above, for the Dress Bob composer/preview: the offset
  // and art shown here must come from the TARGET body's own resolved fit, not whatever body the
  // weapon editor's guide picker was last left on.
  const weaponOffset = (body, weapon, ang) => { if (!body || !weapon) return { x: 0, y: 0 }; const fit = weaponFitFor(weapon, body.id); const sh = bodyRig(body, ang).hand; const gh = handForGuideId(fit.guideId)[ang] || DEFAULT_HAND[ang]; return { x: sh.x - gh.x, y: sh.y - gh.y }; };
  const weaponRestArt = (weapon, body, ang) => { if (!weapon) return []; const fit = weaponFitFor(weapon, body && body.id); return (fit.states.rest && fit.states.rest[ang]) || []; };
  const sessionUpload = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const c = migrate(normalizeAssetJson(JSON.parse(r.result))); setSessionAssets((s) => [...s.filter((x) => x.id !== c.id), c]); flash("Added " + (c.name || "asset")); } catch (err) { flash(err && err.message ? err.message : "Couldn't read that file."); } }; r.readAsText(f); };
  // Bakes a body + skin + equipment + weapon into a finished "character": stats, defense,
  // effects, rig points, and the flattened per-pose art. Split out of composeLook so that
  // rebuildLook (below) can re-bake an ALREADY-SAVED look from its embedded components after one
  // of those components is edited — same code path, so a re-baked look and a freshly dressed one
  // can never drift apart. `base` supplies everything identity-ish (id/name/enemy fields).
  const assembleLook = (body, skin, weapon, equipment, base) => {
    body = applySkinTone(body, skin && skin.tone); // the worn skin's tone recolours the body's flesh before anything is layered/baked
    const overlays = [skin, ...SLOT_ORDER.map((s) => equipment[s])].filter(Boolean);
    const out = { ...base, angles: blankAngles(), hand: {}, shoulder: {}, stats: { ...(skin?.stats || DEFAULT_STATS()) }, defense: 0 };
    // Equipment stat boosts stack additively on top of the skin's own stats (a 5 + a +2 item
    // reads as 7 — see DEFAULT_STAT_BOOSTS). Defense has no wearer baseline to add onto (it's
    // armor-only per Blake — "isn't something on the skin") — it's just the plain sum of
    // whatever's equipped, 0 if nothing is. Equipment effects (e.g. Double Jump) travel with the
    // look too, each resolved to whichever body it's worn on right now — same per-body fallback
    // chain as the equipment's own art (this body's own animation → whichever body was last
    // designed for → Default → none, which just means "no custom animation, mechanic still works").
    for (const s of SLOT_ORDER) {
      const eq = equipment[s]; if (!eq) continue;
      if (eq.statBoosts) for (const k of Object.keys(eq.statBoosts)) out.stats[k] = (out.stats[k] ?? 5) + (eq.statBoosts[k] || 0);
      out.defense += eq.defense || 0;
    }
    out.effects = [];
    for (const s of SLOT_ORDER) {
      const eq = equipment[s]; if (!eq || !eq.effects || !eq.effects.length) continue;
      for (const eff of eq.effects) {
        const animByBody = eff.animByBody || {};
        const bodyId = body.id;
        const frames = (bodyId && animByBody[bodyId] && animByBody[bodyId].length) ? animByBody[bodyId]
          : (eff.lastFit && animByBody[eff.lastFit] && animByBody[eff.lastFit].length) ? animByBody[eff.lastFit]
          : (animByBody.default || []);
        // Copy every param the effect defines (height/speed for Double Jump, reduce for Back
        // Guard, fall/control for Glide, and anything added later) so this never needs editing
        // when a new effect type is introduced — the catalog entry is the single source of truth.
        const packed = { type: eff.type, frames, slot: s };
        for (const pm of (EFFECT_TYPES[eff.type]?.params || [])) packed[pm.key] = eff[pm.key] ?? pm.def;
        if (EFFECT_TYPES[eff.type]?.tagParam) packed.tag = eff.tag || "";
        out.effects.push(packed);
      }
    }
    for (const ang of ANGLES) { const r = bodyRig(body, ang); out.hand[ang] = r.hand; out.shoulder[ang] = r.shoulder; }
    for (const ang of ANGLES) {
      let arr = layerBodyAndOverlays(body, overlays, ang);
      if (weapon) { const o = weaponOffset(body, weapon, ang); arr = arr.concat(bake({ ...weapon, angles: { ...blankAngles(), [ang]: weaponRestArt(weapon, body, ang) } }, ang).filter((p) => !p.isHitbox && !p.isMuzzle).map((p) => ({ ...p, x: p.x + o.x, y: p.y + o.y, _isWeapon: true, _src: weapon.id }))); }
      out.angles[ang] = arr.map((p) => ({ ...p, id: uid() }));
    }
    return out;
  };
  // The Playtest player's ACTUAL on-screen art for one pose. With nothing picked up this is just
  // the base look (identical to before). The moment a pedestal item is worn, we re-run the very
  // same compositor Dress Bob uses (assembleLook) with those items layered over the look's own
  // clothing — so a picked-up shirt/hat/etc. visibly appears, correctly ordered (behind body, over
  // arms, tucked under a crouch knee) instead of only changing stats. The look's own body/skin/
  // weapon come from its embedded components; a raw-body player just gets the equipment on the body.
  const livePlayerBlocks = (ang) => {
    const bp = findA(playerId);
    if (!bp) return null;
    // A raw body (no composed components) with nothing picked up just uses its own baked art —
    // the fast path, unchanged. A COMPOSED character is always re-run through the same compositor
    // Dress Bob uses, even before any pedestal pickup, so the CURRENT layering rules apply live
    // (e.g. a skin's face/teeth staying UNDER a cape) instead of whatever order happened to be
    // frozen into its saved angles when it was first dressed. Result is memoised per equipped set.
    const composed = bp.type === "character" && bp.components;
    if (!composed && !SLOT_ORDER.some((sl) => equipped.current[sl])) return bake(mergeEquip(bp, equipped.current, equippedBodyIdFor(bp)), ang);
    const eqSig = SLOT_ORDER.map((sl) => (equipped.current[sl] && equipped.current[sl].id) || "").join(",");
    const key = playRunId.current + "|" + bp.id + "|" + eqSig;
    if (playerLookCache.current.key === key && playerLookCache.current.look) return playerLookCache.current.look.angles[ang] || [];
    const comp = bp.type === "character" ? (bp.components || {}) : {};
    const body = comp.body || bp, skin = comp.skin || null, weapon = comp.weapon || null;
    const eq = {};
    for (const sl of SLOT_ORDER) { const it = equipped.current[sl] || (comp.equipment && comp.equipment[sl]); if (it) eq[sl] = it; }
    const look = assembleLook(body, skin, weapon, eq, { id: bp.id, name: bp.name, type: "character" });
    playerLookCache.current = { key, look };
    return look.angles[ang] || [];
  };
  const composeLook = (idOverride) => {
    const body = findA(loadout.bodyId); if (!body) return null;
    const weapon = findA(loadout.weaponId);
    const skin = findA(loadout.skinId);
    const equipment = {}; for (const s of SLOT_ORDER) { const a = findA(loadout.slots[s]); if (a) equipment[s] = a; }
    const base = { id: idOverride || uid(), name: body.name + " — dressed", type: "character", isEnemy: !!markAsEnemy };
    if (markAsEnemy) { base.hp = Math.max(1, +dressedHp || 1); base.ai = "guard"; /* default only — real behavior is chosen per-placement in the level tester, which overrides this */ }
    // The look IS its layers — embed full copies of every component so any layer can be
    // recovered, re-edited, or swapped later, even if the source assets get deleted.
    // The baked angles are just the pre-rendered output for playtest.
    base.recipe = { bodyId: loadout.bodyId, skinId: loadout.skinId || "", slots: { ...loadout.slots }, weaponId: loadout.weaponId || "" };
    base.components = { body: JSON.parse(JSON.stringify(body)) };
    if (skin) base.components.skin = JSON.parse(JSON.stringify(skin));
    if (weapon) base.components.weapon = JSON.parse(JSON.stringify(weapon));
    if (Object.keys(equipment).length) { base.components.equipment = {}; for (const s of Object.keys(equipment)) base.components.equipment[s] = JSON.parse(JSON.stringify(equipment[s])); }
    return assembleLook(body, skin, weapon, equipment, base);
  };
  // Re-bake a saved look from its OWN embedded components (already updated by swapLookComponent).
  // Keeps the look's identity — id, name, savedAt, enemy settings — and replaces only the derived
  // art/stats/rig, so a shirt edited in the creator shows up in Playtest without re-equipping it.
  const rebuildLook = (look) => {
    const c = look.components || {};
    if (!c.body) return null; // pre-components legacy save: nothing to rebuild from, leave it be
    const equipment = c.equipment || {};
    const base = { ...look, angles: undefined, hand: undefined, shoulder: undefined, stats: undefined, defense: undefined, effects: undefined };
    return assembleLook(c.body, c.skin || null, c.weapon || null, equipment, base);
  };
  const exportLook = () => { const l = composeLook(); if (!l) { flash("Pick a body first."); return; } setCombo(JSON.stringify(l, null, 2)); };
  const saveDressedBob = async () => {
    const body = findA(loadout.bodyId);
    if (!body) { flash("Pick a body first."); return; }
    const name = (dressedBobName || "").trim() || (body.name + " — dressed");
    let list = []; const idx0 = await sget("assetIndex"); if (idx0) try { list = JSON.parse(idx0); } catch { list = []; }
    // savedDressedIds only remembers looks saved in THIS session — after a reload, re-saving the
    // same name used to pile up a second copy. Fall back to the index so a name always overwrites
    // the look that already owns it.
    const priorId = savedDressedIds[name] || (list.find((x) => x.type === "character" && x.name === name) || {}).id;
    const l = { ...composeLook(priorId), name, savedAt: Date.now() };
    const ok1 = await sset("asset:" + l.id, JSON.stringify(l));
    list = list.filter((x) => x.id !== l.id); list.push({ id: l.id, name: l.name, type: l.type });
    const ok2 = await sset("assetIndex", JSON.stringify(list));
    if (ok1 && ok2) { setSavedDressedIds((m) => ({ ...m, [name]: l.id })); flash("Saved \"" + name + "\" ✓ — pick it under Playtest player in the level tester."); loadLibrary(); } else flash("Couldn't save here — try Export instead.");
  };
  const comboDownload = () => { try { const b = new Blob([combo], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "dressed-bob.json"; a.click(); flash("Downloaded ✓"); } catch { flash("Download blocked — copy the text."); } };
  const comboCopy = () => { try { navigator.clipboard?.writeText(combo); flash("Copied ✓"); } catch { flash("Select the text and copy it."); } };

  /* ---- level creator ---------------------------------------------------- */
  // Textures live in their own storage entries (textureIndex + texture:<id>), the same shape
  // levels/backgrounds/stamps already use — so one palette can be reused across every level
  // rather than being trapped in whichever level first painted it.
  const loadTextures = async () => {
    try {
      const idx = await sget("textureIndex"); const list = idx ? JSON.parse(idx) : [];
      const full = [];
      for (const e of list) { const raw = await sget("texture:" + e.id); if (raw) try { full.push(JSON.parse(raw)); } catch { /* skip a corrupt texture */ } }
      setTexLib(full);
    } catch { setTexLib([]); }
  };
  // `applyTo` says what a freshly saved texture should start painting. "level" (the default, and
  // every pre-existing caller) arms the level brush exactly as before; "piece" instead paints the
  // art block you have selected in the creator, which is what makes a flannel jacket a two-click
  // job rather than "save it, go to a level, come back". The texture itself is identical either
  // way — one library, one storage entry, usable from both screens.
  const saveTexture = async (t, applyTo) => {
    if (!TEXTURES[t.tex]) { flash("Unknown texture pattern."); return null; }
    const clean = { ...t, name: (t.name || "").trim() || TEXTURES[t.tex].label };
    let list = []; const idx = await sget("textureIndex"); if (idx) try { list = JSON.parse(idx); } catch { list = []; }
    const ok1 = await sset("texture:" + clean.id, JSON.stringify(clean));
    list = list.filter((x) => x.id !== clean.id); list.push({ id: clean.id, name: clean.name });
    const ok2 = await sset("textureIndex", JSON.stringify(list));
    if (ok1 && ok2) {
      await loadTextures(); setTexEdit(null);
      if (applyTo === "piece") { updSel({ tex: clean.id }); flash("Texture \"" + clean.name + "\" saved ✓ — on this block now."); }
      else { setLTexId(clean.id); setLTool("paint"); flash("Texture \"" + clean.name + "\" saved ✓ — painting with it now."); }
      return clean;
    }
    flash("Couldn't save the texture here."); return null;
  };
  const useGrassTexture = async () => {
    const saved = texLib.find((t) => t.tex === "grass");
    if (saved) { setLTexId(saved.id); setLTool("paint"); setTexPick(false); flash("Painting with \"" + saved.name + "\" 🌱"); return; }
    const made = await saveTexture(newTexture("grass"));
    if (made) setTexPick(false);
  };
  const deleteTexture = async (id) => {
    let list = []; const idx = await sget("textureIndex"); if (idx) try { list = JSON.parse(idx); } catch { list = []; }
    await sdel("texture:" + id);
    await sset("textureIndex", JSON.stringify(list.filter((x) => x.id !== id)));
    if (lTexId === id) setLTexId(null);
    if (texEdit && texEdit.id === id) setTexEdit(null);
    await loadTextures();
    // Cells painted with it aren't touched — they still carry their base color and simply render
    // flat again, so a delete can never blank out part of a level.
    flash("Texture deleted — cells painted with it fall back to their flat color.");
  };
  const loadBgLib = async () => {
    try { const idx = await sget("backgroundIndex"); const list = idx ? JSON.parse(idx) : []; setBgLib(list); }
    catch { setBgLib([]); }
  };
  // Backgrounds are saved SEPARATELY from levels (their own "background:<id>" entries +
  // "backgroundIndex", mirroring how levels/assets already work) so one hand-painted backdrop
  // can be reused across many levels instead of being locked inside whichever level it was
  // first painted in.
  const saveBackground = async () => {
    if (!level) return;
    const name = bgName.trim() || (level.name + " background");
    const id = uid();
    const ok1 = await sset("background:" + id, JSON.stringify({ id, name, bg: level.bg }));
    let list = []; const idx = await sget("backgroundIndex"); if (idx) try { list = JSON.parse(idx); } catch { list = []; }
    list.push({ id, name });
    const ok2 = await sset("backgroundIndex", JSON.stringify(list));
    if (ok1 && ok2) { flash("Background \"" + name + "\" saved ✓"); setBgName(""); loadBgLib(); } else flash("Couldn't save the background.");
  };
  const loadBackground = async (id) => {
    if (!id) return;
    try {
      const raw = await sget("background:" + id);
      if (!raw) { flash("Couldn't find that background."); return; }
      const { name, bg } = JSON.parse(raw);
      setLevel((lv) => (lv ? { ...lv, bg: JSON.parse(JSON.stringify(bg || {})) } : lv));
      flash("Loaded background \"" + name + "\" — replaced this level's Background layer.");
    } catch { flash("Couldn't load that background."); }
  };
  // Same all-or-nothing trap as loadLibrary had — one unparseable level used to hide every level.
  const loadLevels = async () => {
    let list = [];
    try { const idx = await sget("levelIndex"); list = idx ? JSON.parse(idx) : []; } catch { list = []; }
    if (!Array.isArray(list)) list = [];
    const indexedL = new Set(list.map((it) => it && it.id).filter(Boolean));
    const orphanL = scanStoredIds("level:").filter((id) => !indexedL.has(id)); // same rescue as loadLibrary
    if (orphanL.length) list = list.concat(orphanL.map((id) => ({ id })));
    const full = [], bad = [];
    for (const it of list) {
      try { const r = await sget("level:" + (it && it.id)); if (r) full.push(migrateLevel(JSON.parse(r))); else bad.push((it && it.name) || (it && it.id)); }
      catch { bad.push((it && it.name) || (it && it.id)); }
    }
    setLevelLib(full);
    if (orphanL.length && full.length) { await sset("levelIndex", JSON.stringify(full.map((l) => ({ id: l.id, name: l.name })))); console.warn("[Bob] recovered " + orphanL.length + " level(s) missing from the index:", orphanL); }
    if (bad.length) { console.warn("[Bob] " + bad.length + " level(s) could not be read and were skipped:", bad); flash("⚠ " + bad.length + " level" + (bad.length > 1 ? "s" : "") + " couldn't be read — the other " + full.length + " loaded. See console."); }
  };
  const openLevelCreator = () => {
    loadLevels(); loadBgLib(); loadTextures();
    if (!level) { moving.current = null; setMovingActive(false); setLayerMove(null); const nl = newLevel(); setLevel(nl); levelBaseline.current = JSON.stringify(nl); setLSel(null); setGen(null); setPlay(false); setLFxSel(null); setLFxEditIdx(null); setLLayer("fg"); setLTool("paint"); setLBrush(1); setEyedrop(false); }
    setScreen("level");
  };
  const saveLevel = async () => {
    if (!level) return;
    const ok1 = await sset("level:" + level.id, JSON.stringify(level));
    let list = []; const idx = await sget("levelIndex"); if (idx) try { list = JSON.parse(idx); } catch { list = []; }
    list = list.filter((x) => x.id !== level.id); list.push({ id: level.id, name: level.name });
    const ok2 = await sset("levelIndex", JSON.stringify(list));
    if (ok1 && ok2) { levelBaseline.current = JSON.stringify(level); flash("Level saved ✓"); loadLevels(); } else flash("Couldn't save — use Download.");
  };
  const doNewLevelFresh = () => { moving.current = null; setMovingActive(false); setLayerMove(null); snapshotLevel(); const nl = newLevel(); setLevel(nl); levelBaseline.current = JSON.stringify(nl); setLSel(null); setGen(null); setLFxSel(null); setLFxEditIdx(null); setLLayer("fg"); setLTool("paint"); setLBrush(1); setEyedrop(false); flash("New blank level"); };
  const doNewRoomFresh = () => { moving.current = null; setMovingActive(false); setLayerMove(null); snapshotLevel(); const nl = newRoom(); setLevel(nl); levelBaseline.current = JSON.stringify(nl); setLSel(null); setGen(null); setLFxSel(null); setLFxEditIdx(null); setLLayer("fg"); setLTool("paint"); setLBrush(1); setEyedrop(false); flash("New blank room"); };
  const openRoomCreator = () => { loadLevels(); loadBgLib(); loadTextures(); guardLevelSwitch("start a new room", doNewRoomFresh); setScreen("level"); };
  const newRoomFresh = () => guardLevelSwitch("start a new blank room", doNewRoomFresh);
  const newLevelFresh = () => guardLevelSwitch("start a new blank level", doNewLevelFresh);
  const doOpenLevel = (lv) => { moving.current = null; setMovingActive(false); setLayerMove(null); snapshotLevel(); const nl = migrateLevel(JSON.parse(JSON.stringify(lv))); setLevel(nl); levelBaseline.current = JSON.stringify(nl); setLSel(null); setGen(null); setPlay(false); setLFxSel(null); setLFxEditIdx(null); setLLayer("fg"); setLTool("paint"); setLBrush(1); setEyedrop(false); setLevelLoadOpen(false); flash("Opened \"" + lv.name + "\" ✓"); };
  const openLevel = (lv) => guardLevelSwitch("open \"" + lv.name + "\"", () => doOpenLevel(lv));
  // MIRROR THE LEVEL left↔right. Two doors on the same operation because they answer two different
  // questions, and picking the wrong one silently costs you the original:
  //
  //   Flip           — in place, on the level you're editing. Undo takes it back, and so does
  //                    pressing it a second time; it's an exact involution.
  //   Flip to a copy — the variant workflow. A downhill level and its uphill twin are two levels,
  //                    and Save writes back to level:<id>, so flipping in place and saving would
  //                    REPLACE the level you flipped instead of giving you the pair. This forks a
  //                    new id first, so the original is still on disk exactly as it was.
  //
  // Both drop anything held mid-move: a picked-up object and a Move selection both name cells by
  // their old keys, and dropping one after the mirror would put it somewhere nobody asked for.
  const dropHeldForFlip = () => { moving.current = null; setMovingActive(false); setLayerMove(null); setLFxSel(null); setLFxEditIdx(null); setLSel(null); };
  const flipLevelNow = () => {
    if (!level) return;
    snapshotLevel();
    dropHeldForFlip();
    setLevel((lv) => flipLevelHorizontally(lv, findA));
    flash("Flipped left↔right ⇄ (Undo puts it back)");
  };
  const flipLevelToCopy = () => {
    if (!level) return;
    snapshotLevel();
    dropHeldForFlip();
    const base = flipLevelHorizontally(JSON.parse(JSON.stringify(level)), findA);
    // A brand new id, so the first Save creates a second level rather than overwriting the one
    // this was mirrored from. Not saved here — you get to look at it and rename it first.
    const copy = { ...base, id: uid(), name: (level.name || "Level") + " (flipped)" };
    setLevel(copy);
    // The copy has never been saved, so it must read as unsaved work — otherwise clicking a level
    // in Load straight afterwards would throw it away without the warning. "" is a baseline no
    // stringified level can ever equal; null would mean "no baseline yet", which counts as clean.
    levelBaseline.current = "";
    setGen(null);
    flash("Made \"" + copy.name + "\" — 💾 Save to keep it (the original is untouched)");
  };
  const downloadLevel = () => { try { const b = new Blob([JSON.stringify(level, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = (level.name || "level") + ".json"; a.click(); flash("Downloaded ✓"); } catch { flash("Download blocked."); } };
  const uploadLevel = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const c = migrateLevel(JSON.parse(r.result)); if (!c.conns) throw 0;
        guardLevelSwitch("open the uploaded level file", () => { setSessionLevel(c); flash("Opened level ✓"); });
      } catch { flash("Not a level file."); }
    };
    r.readAsText(f);
  };
  const setSessionLevel = (c) => { moving.current = null; setMovingActive(false); setLayerMove(null); snapshotLevel(); setLevelLib((s) => [...s.filter((x) => x.id !== c.id), c]); const nl = JSON.parse(JSON.stringify(c)); setLevel(nl); levelBaseline.current = JSON.stringify(nl); };
  // One record for the NEXT object. Props opt into art-tight bounds; old saved placements without
  // this flag retain their legacy square geometry until the user converts them in the inspector.
  const nextLevelObject = lObjKind === "prop"
    ? { kind: "prop", propId: lPropId, solid: lSolid, size: lObjSize, inFront: lInFront, rot: lObjRot, flip: lObjFlip, fitArt: true }
    : lObjKind === "shape"
      ? { kind: "shape", shape: lObjShape, tint: lTint || "#7aa2d6", solid: lSolid, size: lObjSize, inFront: lInFront, rot: lObjRot, flip: lObjFlip }
      : { kind: "emoji", char: lEmoji, tint: lTint, solid: lSolid, size: lObjSize, inFront: lInFront, rot: lObjRot, flip: lObjFlip };
  const assetForLevelObject = (object) => object && object.kind === "prop" ? findA(object.propId) : null;
  const anchorKeyForLevelObject = (r, c, object) => objAnchorKeyForObject(r, c, object, assetForLevelObject(object));
  // Which fx key a click on (r,c) acts on: placing centres the new object around its REAL
  // footprint; erasing targets whatever real footprint is actually under the pointer.
  const objPaintKey = (r, c, erase) => ((erase || lTool === "erase") ? (objKeyAt(level, r, c, findA) || cellKey(r, c)) : anchorKeyForLevelObject(r, c, nextLevelObject));
  // The object stack on the selected cell, and WHICH of its layers is open for editing.
  //
  // It used to be "none until you click a row". Nothing on screen said those rows were clickable,
  // so every per-object control — Twist most of all — was invisible unless you happened to try it:
  // you'd place a prop, look around for a way to turn it, and find nothing. Now the top layer (the
  // one you just placed or clicked) is open by default and its controls are simply THERE. Clicking
  // a row still toggles; -1 is "you explicitly closed it", which is why this can't just be null.
  const fxStack = (lFxSel && level && level.fx && level.fx[lFxSel]) || [];
  const fxOpenIdx = lFxEditIdx == null ? (fxStack.length ? fxStack.length - 1 : null) : lFxEditIdx;
  const fxOpen = fxOpenIdx != null && fxOpenIdx >= 0 ? fxStack[fxOpenIdx] : null;
  const paintCell = (r, c, erase) => {
    const objKey = lLayer === "obj" ? objPaintKey(r, c, erase) : null;
    setLevel((lv) => {
    if (!lv) return lv;
    const k = cellKey(r, c);
    if (lLayer === "obj") {
      // Visible object nodes own erasing because they know the exact stack entry that was hit.
      // A grid-cell fallback can only guess from overlapping rectangular footprints and was able
      // to delete a completely different prop through transparent canvas space.
      if (erase || lTool === "erase") return lv;
      const fx = { ...lv.fx };
      if (lObjKind === "prop" && !lPropId) { return lv; /* prop kind chosen but no prop picked yet — nothing to place */ }
      else { const stack = fx[objKey] ? fx[objKey].slice() : []; stack.push({ ...nextLevelObject }); fx[objKey] = stack; }
      return { ...lv, fx };
    }
    if (lLayer === "climb") { const climb = { ...lv.climb }; if (erase || lTool === "erase") delete climb[k]; else climb[k] = { kind: lClimbKind }; return { ...lv, climb }; }
    if (lLayer === "hazard") { const hazard = { ...(lv.hazard || {}) }; if (erase || lTool === "erase") delete hazard[k]; else hazard[k] = { kind: "fire", dps: lHazDps, life: lHazLife, ...(lHazHide ? { hideInPlay: true } : {}) }; return { ...lv, hazard }; }
    if (lLayer === "marker") { const markers = { ...lv.markers }; if (erase || lTool === "erase") delete markers[k]; else markers[k] = lMarkerKind === "door" ? { kind: "door", tag: lMarkerCat } : { kind: "pedestal", cats: [lPedCat1, lPedCat2], logic: lPedLogic }; return { ...lv, markers }; }
    const layer = { ...lv[lLayer] };
    if (erase || lTool === "erase") delete layer[k];
    // Foreground and Background cells are normally a plain color string (a full visual block).
    // Painting with a slope shape selected stores { c, slope } instead. Foreground uses it as a
    // walkable ramp (see slopeSurfaceAt); Background renders the same diagonal but stays non-solid.
    // With a texture selected, paintValue() writes { c, tex } instead of a bare color — ramps
    // and textures compose, so a textured ramp is simply both at once. In Outline mode fg/bg/front
    // paints also carry `ol` (see withOutline / cellOutlineStyle) — the outer edge renders in it.
    else {
      const ol = (lOutline && (lLayer === "fg" || lLayer === "bg" || lLayer === "front")) ? lOutlineColor : null;
      const shape = terrainPaintShape(lLayer, lFgShape, lFgUpsideDown, lFgHide);
      const base = paintValue(lColor, activeTexture, shape);
      // Foreground ramps stack on what's already in the cell (mergeFgFill). Background ramps
      // replace the previous decorative fill, and Front remains block-only.
      layer[k] = lLayer === "fg" ? mergeFgFill(layer[k], withOutline(base, ol)) : withOutline(base, ol);
    }
    return { ...lv, [lLayer]: layer };
    });
  };
  // Stamps paintCell across a brush-size square. Objects/Markers always stay single-cell —
  // stacking or placing N copies per stroke isn't what a "brush" should do for discrete items.
  const paintBrush = (r, c, erase, inb) => {
    if (lLayer === "obj" || lLayer === "marker" || lLayer === "climb" || lBrush <= 1) { paintCell(r, c, erase); return; }
    const half = Math.floor((lBrush - 1) / 2);
    // Every footprint cell paints normally; Outline mode rides along on each cell (via paintCell)
    // and the outer edge of the whole painted mass is resolved at render — not per brush stamp.
    for (let dr = -half; dr < lBrush - half; dr++) for (let dc = -half; dc < lBrush - half; dc++) {
      const rr = r + dr, cc = c + dc;
      if (!inb(rr, cc)) continue;
      paintCell(rr, cc, erase);
    }
  };
  // Select tool: click an object/marker to pick it up (removes it from that cell), click any
  // cell to place it there. Works like the body creator's drag, but as two clicks instead of
  // a live drag, so it can't silently lose data on the pointerup listener's stale-closure risk.
  // Copy tool: same two-click flow, but the original is left in place instead of removed.
  const pickUpOrDrop = (r, c) => {
    const k = cellKey(r, c);
    if (moving.current) {
      const { item, from } = moving.current;
      setLevel((lv) => {
        // Dropping re-centres on the click too, so a picked-up object lands the same way a
        // freshly placed one does instead of jumping down-right by half its own size.
        if (from === "fx") { const ok = anchorKeyForLevelObject(r, c, item); const stack = lv.fx[ok] ? lv.fx[ok].slice() : []; stack.push(item); return { ...lv, fx: { ...lv.fx, [ok]: stack } }; }
        if (from === "enemies") return { ...lv, enemies: { ...(lv.enemies || {}), [k]: item } };
        return { ...lv, markers: { ...lv.markers, [k]: item } };
      });
      moving.current = null; setMovingActive(false);
      if (from === "fx") { setLFxSel(anchorKeyForLevelObject(r, c, item)); setLFxEditIdx(null); }
      flash("Placed ✓");
      return;
    }
    const isCopy = lTool === "copy";
    // Grab by footprint, not by anchor cell — clicking the middle of a big centred object has to
    // pick it up, and its anchor cell is nowhere near where you clicked (see objKeyAt).
    const fk = lLayer === "obj" ? objKeyAt(level, r, c, findA) : null;
    if (fk) {
      const stack = level.fx[fk]; const item = stack[stack.length - 1];
      if (!isCopy) setLevel((lv) => { const s2 = (lv.fx[fk] || []).slice(0, -1); const fx = { ...lv.fx }; if (s2.length) fx[fk] = s2; else delete fx[fk]; return { ...lv, fx }; });
      moving.current = { key: fk, item: { ...item }, from: "fx", copy: isCopy }; setMovingActive(true);
      flash(isCopy ? "Copied " + item.char + " — click a cell to place the copy" : "Picked up " + item.char + " — click a cell to place it, or click it again to cancel");
    } else if (lLayer === "marker" && level.markers[k]) {
      const item = level.markers[k];
      if (!isCopy) setLevel((lv) => { const markers = { ...lv.markers }; delete markers[k]; return { ...lv, markers }; });
      moving.current = { key: k, item: { ...item }, from: "markers", copy: isCopy }; setMovingActive(true);
      flash(isCopy ? "Copied marker — click a cell to place the copy" : "Picked up marker — click a cell to place it");
    } else {
      flash("Nothing here to pick up.");
    }
  };
  // If a pick-up is abandoned (layer switch, level switch), drop it back where it came from
  // rather than silently losing it. A copy was never removed from its source, so there's
  // nothing to restore — just discard the held copy.
  const cancelMoving = () => {
    if (!moving.current) return;
    const { key, item, from, copy: isCopy } = moving.current;
    if (!isCopy) setLevel((lv) => {
      if (!lv) return lv;
      if (from === "fx") { const stack = lv.fx[key] ? lv.fx[key].slice() : []; stack.push(item); return { ...lv, fx: { ...lv.fx, [key]: stack } }; }
      if (from === "enemies") return { ...lv, enemies: { ...(lv.enemies || {}), [key]: item } };
      return { ...lv, markers: { ...lv.markers, [key]: item } };
    });
    moving.current = null; setMovingActive(false);
  };
  const cycleConn = (k) => setLevel((lv) => { const c = { ...lv.conns }; c[k] = { ...c[k], open: !c[k].open }; return { ...lv, conns: c }; });
  // Reorder a single object within a cell's stack (dir +1 = bring forward/toward top, -1 = send back).
  const moveFxStack = (k, i, dir) => setLevel((lv) => {
    const stack = (lv.fx[k] || []).slice(); const j = i + dir; if (j < 0 || j >= stack.length) return lv;
    [stack[i], stack[j]] = [stack[j], stack[i]];
    return { ...lv, fx: { ...lv.fx, [k]: stack } };
  });
  const removeFxAt = (k, i) => setLevel((lv) => {
    const stack = (lv.fx[k] || []).filter((_, idx) => idx !== i);
    const fx = { ...lv.fx }; if (stack.length) fx[k] = stack; else delete fx[k];
    return { ...lv, fx };
  });
  // Tweak one existing stacked object in place (tint / solid / size) without removing and re-placing it.
  const updateFxAt = (k, i, patch) => setLevel((lv) => {
    const stack = (lv.fx[k] || []).slice(); if (!stack[i]) return lv;
    stack[i] = { ...stack[i], ...patch };
    return { ...lv, fx: { ...lv.fx, [k]: stack } };
  });
  // Turning by a fixed step has to read the CURRENT angle inside the state updater. Computing it
  // from the object captured at render time meant five quick taps on ↻ all saw 0° and all wrote 5°,
  // so the prop stopped turning if you tapped faster than React re-rendered.
  const nudgeFxRot = (k, i, delta) => setLevel((lv) => {
    const stack = (lv.fx[k] || []).slice(); if (!stack[i]) return lv;
    stack[i] = { ...stack[i], rot: normalizeObjRot((stack[i].rot || 0) + delta) };
    return { ...lv, fx: { ...lv.fx, [k]: stack } };
  });
  const setConnAccepts = (k, t) => setLevel((lv) => ({ ...lv, conns: { ...lv.conns, [k]: { ...lv.conns[k], accepts: t } } }));
  const addCatSuggest = (k, tag) => setLevel((lv) => { const cur = lv.conns[k].accepts || ""; const has = cur.split(/[,\n]/).map((s) => s.trim().toLowerCase()).includes(tag); if (has) return lv; const next = cur ? cur + ", " + tag : tag; return { ...lv, conns: { ...lv.conns, [k]: { ...lv.conns[k], accepts: next } } }; });
  const allLevels = level ? [level, ...levelLib.filter((l) => l.id !== level.id)] : levelLib;
  const floorSuggest = [...new Set(levelLib.map((l) => (l.floor || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const catSuggest = [...new Set(allAssets.filter(HAS_CATEGORIES).flatMap((a) => (a.categories || []).map((c) => (c || "").trim()).filter(Boolean)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  // Hoisted to component scope (not inside the level-screen block) because BOTH commit paths
  // need it: the status-strip destination buttons AND selectLayer below — clicking a layer tab
  // while a region is picked up is the most natural way to say "put it there", and the original
  // behavior of silently clearing the selection on tab click was exactly how the intended
  // pick-up-then-choose-layer flow got eaten.
  const commitMove = (destLayer) => {
    if (!layerMove || destLayer === layerMove.layer) return;
    if (!level || layerMove.levelId !== level.id) { setLayerMove(null); return; } // selection belongs to a level that's no longer open — drop it instead of writing stale cells into whatever's open now
    setLevel((lv2) => {
      const src = { ...lv2[layerMove.layer] };
      const dst = { ...lv2[destLayer] };
      for (const k of Object.keys(layerMove.cells)) { delete src[k]; dst[k] = layerMove.cells[k]; }
      return { ...lv2, [layerMove.layer]: src, [destLayer]: dst };
    });
    flash("Moved " + Object.keys(layerMove.cells).length + " cell(s) to " + (destLayer === "fg" ? "Foreground" : destLayer === "bg" ? "Background" : "Front") + " ✓");
    setLayerMove(null);
  };
  const cancelMove = () => setLayerMove(null);
  const selectLayer = (l) => {
    if (moving.current && l !== "obj" && l !== "marker") cancelMoving();
    if (lEnemyId) setLEnemyId("");            // a layer tab means "work on this layer" — leave enemy-placement so clicks stop dropping enemies
    if ((lTool === "select" || lTool === "copy") && l !== "obj" && l !== "marker") setLTool("paint");
    if (lTool === "fill" && l !== "fg" && l !== "bg" && l !== "front") setLTool("paint");
    if (lTool === "move" && l !== "fg" && l !== "bg" && l !== "front") setLTool("paint");
    if (layerMove) {
      // A region is picked up: clicking a color-layer tab means "move it THERE" (even the tab
      // that's already active — the pickup may have come from a different source layer). Only
      // switching to a non-color layer (Objects/Climb/etc.) abandons the pickup.
      if ((l === "fg" || l === "bg" || l === "front")) { if (l !== layerMove.layer) commitMove(l); }
      else setLayerMove(null);
    }
    setLLayer(l);
  };
  // Switching tools away from Select/Copy while something is picked up would otherwise strand it —
  // return it to where it came from instead of leaving it invisibly stuck.
  // Clicking Paint or Erase while it's already the active tool is otherwise a wasted click —
  // repurposed as an explicit "back to Foreground" reset, since staying on Climb/Objects/etc.
  // after you meant to go back to normal painting was confusing.
  const selectTool = (t) => {
    if (moving.current && t !== "select" && t !== "copy") cancelMoving();
    if (layerMove && t !== "move") setLayerMove(null);
    if (lTool === t && t !== "select" && t !== "copy" && lLayer !== "fg" && lLayer !== "climb") { setLLayer("fg"); flash("Back to Foreground"); }
    setLTool(t);
  };
  const runGenerate = () => { const chain = generateChain(allLevels, 8); if (chain.length < 1) { flash("Make/save a couple of levels with matching open connectors first."); return; } setGen(chain); flash("Generated a chain of " + chain.length); };

  // The texture picker and the texture creator, built ONCE and rendered by both the Level Creator
  // and the asset creator. They used to live inside the level screen's markup, which is why a
  // pattern was a level-only idea; a jacket needs the same two dialogs, and duplicating them would
  // guarantee the two copies drift. `texTarget` is the only difference between the two callers:
  // it decides whether picking a texture arms the level brush or paints the selected art block.
  const applyTextureToTarget = (t) => {
    if (texTarget === "piece") { updSel({ tex: t.id }); flash("\"" + t.name + "\" on this block 🧵"); }
    else { setLTexId(t.id); setLTool("paint"); flash("Painting with \"" + t.name + "\" 🧱"); }
    setTexPick(false);
  };
  const textureModals = (
    <>
      {texPick && (
        <div className="modal" onClick={() => setTexPick(false)}>
          <div className="dlg wide3" onClick={(e) => e.stopPropagation()}>
            <div className="dt">🧱 Textures <span className="emcount">{texTarget === "piece" ? "paint a repeating pattern over this block instead of a flat color" : "paint a repeating pattern instead of a flat color"}</span></div>
            {texTarget !== "piece" && <div className="row2 grassQuick"><button onClick={useGrassTexture}>🌱 Use Grass now</button></div>}
            {texLib.length === 0 && <p className="mini">No textures yet.</p>}
            <div className="texgrid">
              {texLib.map((t) => (
                <div key={t.id} className="texcardwrap">
                  <button className={"texcard" + ((texTarget === "piece" ? (sel && sel.tex) : lTexId) === t.id ? " on" : "")} onClick={() => applyTextureToTarget(t)}>
                    <span className="texprev" style={cellPaintStyle({ c: textureBaseColor(t), tex: t.id }, 0, 0, texLib)} />
                    <span className="sn">{t.name}</span>
                    <span className="sty">{TEXTURES[t.tex] ? TEXTURES[t.tex].icon + " " + TEXTURES[t.tex].label : t.tex}</span>
                  </button>
                  <button className="sdel" onClick={() => { setTexEdit(JSON.parse(JSON.stringify(t))); setTexPick(false); }}>✎</button>
                </div>
              ))}
            </div>
            <div className="ct2">New texture</div>
            <div className="texgrid">
              {TEXTURE_KEYS.map((k) => (
                <button key={k} className="texcard" onClick={() => { setTexEdit(newTexture(k)); setTexPick(false); }}>
                  <span className="texprev" style={cellPaintStyle({ c: "#000", tex: "__preview_" + k }, 0, 0, [{ id: "__preview_" + k, tex: k, colors: Object.fromEntries(TEXTURES[k].colors.map(([ck, , d]) => [ck, d])), params: Object.fromEntries((TEXTURES[k].params || []).map((p) => [p.key, p.def])) }])} />
                  <span className="sn">＋ {TEXTURES[k].label}</span>
                  <span className="sty">{TEXTURES[k].icon} pick its colors</span>
                </button>
              ))}
            </div>
            <div className="row2">
              {texTarget === "piece"
                ? (sel && sel.tex && <button onClick={() => { updSel({ tex: null }); setTexPick(false); }}>✕ Plain color</button>)
                : (activeTexture && <button onClick={() => { setLTexId(null); setTexPick(false); }}>✕ Paint plain colors</button>)}
              <button onClick={() => setTexPick(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {texEdit && (() => {
        const def = TEXTURES[texEdit.tex];
        const previewLib = [texEdit]; // preview straight off the in-progress instance, not the saved library
        const set = (fn) => setTexEdit((t) => fn({ ...t }));
        const saved = texLib.some((t) => t.id === texEdit.id);
        return (
          <div className="modal" onClick={() => setTexEdit(null)}>
            <div className="dlg wide3" onClick={(e) => e.stopPropagation()}>
              <div className="dt">{def.icon} {saved ? "Edit" : "New"} texture</div>
              <div className="texeditrow">
                <div className="texbigprev" style={cellPaintStyle({ c: textureBaseColor(texEdit), tex: texEdit.id }, 0, 0, previewLib)} />
                <div className="texeditcol">
                  <input className="namefield" value={texEdit.name} onChange={(e) => set((t) => ({ ...t, name: e.target.value }))} placeholder={def.label} />
                  <div className="ct2">Pattern</div>
                  <div className="seg texseg">
                    {TEXTURE_KEYS.map((k) => (
                      // Switching pattern keeps the id and name, so an edit stays the same texture
                      // and every cell already painted with it just re-renders in the new pattern.
                      <button key={k} className={texEdit.tex === k ? "on" : ""} onClick={() => set((t) => ({ ...newTexture(k), id: t.id, name: t.name }))}>{TEXTURES[k].icon} {TEXTURES[k].label}</button>
                    ))}
                  </div>
                  <div className="ct2">Colors</div>
                  {def.colors.map(([key, label]) => (
                    <label className="slider" key={key}>{label}
                      <input type="color" className="gc" value={texEdit.colors[key]} onChange={(e) => set((t) => ({ ...t, colors: { ...t.colors, [key]: e.target.value } }))} onBlur={(e) => addRecent(e.target.value)} />
                      <span className="hint2">{texEdit.colors[key]}</span>
                    </label>
                  ))}
                  {(def.params || []).length > 0 && <div className="ct2">Wear</div>}
                  {(def.params || []).map((pm) => (
                    <label className="slider" key={pm.key}>{pm.label}
                      <input type="range" min={pm.min} max={pm.max} step={pm.step} value={texEdit.params[pm.key] ?? pm.def} onChange={(e) => set((t) => ({ ...t, params: { ...t.params, [pm.key]: +e.target.value } }))} />
                      <span className="hint2">{Math.round((texEdit.params[pm.key] ?? pm.def) * 100)}%</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="row2">
                <button onClick={() => saveTexture(texEdit, texTarget)}>💾 {saved ? "Save changes" : (texTarget === "piece" ? "Save & use it here" : "Save & paint with it")}</button>
                {saved && <button className="danger" onClick={() => deleteTexture(texEdit.id)}>🗑 Delete</button>}
                <button onClick={() => setTexEdit(null)}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );

  /* ====================================================================== */
  if (screen === "menu") {
    return (
      <div className="bb"><style>{css}</style>
        <header className="bar"><div className="logo">🧱 Bob Asset Studio</div></header>
        <div className="menu">
          <h2>Make a body or weapon</h2>
          <div className="tiles">
            <button className="tile" onClick={() => setChooser(true)}><span className="ti">🧍</span><span className="tl">Skin / Body</span></button>
            <button className="tile" onClick={() => setWtypeChoice(true)}><span className="ti">{TYPES.weapon.icon}</span><span className="tl">{TYPES.weapon.label}</span></button>
            <button className="tile" onClick={() => start("enemy")}><span className="ti">{TYPES.enemy.icon}</span><span className="tl">{TYPES.enemy.label}</span></button>
            <button className="tile" onClick={() => setPropItemChoice(true)}><span className="ti">🌿</span><span className="tl">Object / Prop / Item</span></button>
            {/* loadTextures for the same reason the creators do it: a patterned garment has to
                have its pattern in hand here too, or a flannel jacket dresses on as flat colour. */}
            <button className="tile dress" onClick={() => { loadTextures(); setScreen("assemble"); }}><span className="ti">🧩</span><span className="tl">Dress Bob</span></button>
            <button className="tile lvl" onClick={openLevelCreator}><span className="ti">🗺️</span><span className="tl">Level Creator</span></button>
            <button className="tile lvl" onClick={openRoomCreator}><span className="ti">🚪</span><span className="tl">Room Creator</span></button>
          </div>
          <h2>Make a piece of equipment</h2>
          <div className="slots">
            {SLOT_ORDER.slice().reverse().map((s) => (
              <button key={s} className="slot" onClick={() => start("equipment", s)}><span className="si">{SLOTS[s].icon}</span><span>{SLOTS[s].label}</span></button>
            ))}
          </div>
          <h2>Load</h2>
          <button className="ltbtn saveRead" disabled={libraryLoading} onClick={() => { setLoadOpen(true); setLoadCategory(null); setLoadSlot(null); }}>{libraryLoading ? "⏳ Loading your saves…" : "📂 Load (" + allAssets.length + " saved)"}</button>
          {libraryLoading && <p className="mini saveLoading">Your saved assets are still being read from this browser. Nothing has been cleared.</p>}
          <label className="openfile">⬆ Open a file<input type="file" accept="application/json" onChange={upload} hidden /></label>
          <button className="ltbtn saveRead" disabled={libraryLoading} onClick={exportAllAssets} title="Downloads every saved asset as one backup file. Re-open that file here later to restore them all.">⬇ Export all assets{libraryLoading ? " (loading…)" : " (" + library.length + ")"}</button>
          <h2>Niche controls</h2>
          <button className="ltbtn" onClick={() => setNiche(true)}>🩹 Recover layers from a dressed look</button>
        </div>
        {niche && (
          <div className="modal" onClick={() => setNiche(false)}>
            <div className="dlg" onClick={(e) => e.stopPropagation()}>
              <div className="dt">Niche controls — recover layers</div>
              {allAssets.filter((a) => a.type === "character").length ? (
                <div className="nichelist">
                  {allAssets.filter((a) => a.type === "character").map((ch) => (
                    <div key={ch.id} className="nicherow">
                      <div className="nichename">🧩 {ch.name}</div>
                      {ch.components ? (
                        <div className="nichebtns">
                          <button onClick={() => restoreComponent(ch.components.body)}>🧍 Body</button>
                          {ch.components.skin && <button onClick={() => restoreComponent(ch.components.skin)}>🎨 Skin</button>}
                          {ch.components.equipment && Object.keys(ch.components.equipment).map((s) => (
                            <button key={s} onClick={() => restoreComponent(ch.components.equipment[s])}>{SLOTS[s]?.icon || "📦"} {SLOTS[s]?.label || s}</button>
                          ))}
                          {ch.components.weapon && <button onClick={() => restoreComponent(ch.components.weapon)}>⚔️ Weapon</button>}
                        </div>
                      ) : (
                        <div className="nichebtns">
                          <button onClick={() => restoreComponent(recoverBodyFromBake(ch))}>🩹 Recover body (best effort)</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : <p className="muted">No saved dressed looks to recover from.</p>}
              <div className="row2"><button onClick={() => setNiche(false)}>Close</button></div>
            </div>
          </div>
        )}
        {loadOpen && (
          <div className="modal" onClick={() => setLoadOpen(false)}>
            <div className="dlg wide3" onClick={(e) => e.stopPropagation()}>
              {loadCategory === null ? (
                <>
                  <div className="dt">📂 Load</div>
                  {allAssets.length ? (
                    <div className="loadcats">
                      {LOAD_CATEGORIES.map((cat) => {
                        const count = allAssets.filter(cat.match).length;
                        return (
                          <button key={cat.key} className="scard" disabled={!count} onClick={() => { setLoadCategory(cat.key); setLoadSlot(null); }}>
                            <span className="si">{cat.icon}</span>
                            <span className="sn">{cat.label}</span>
                            <span className="sty">{count} saved</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : <p className="muted">{hasStore ? "Nothing saved yet — make something, then Save." : "In-browser saving isn't available here; use Open a file."}</p>}
                  <div className="row2"><button onClick={() => setLoadOpen(false)}>Close</button></div>
                </>
              ) : (() => {
                const cat = LOAD_CATEGORIES.find((c) => c.key === loadCategory);
                const bySlot = cat.key === "equipment";
                const inSlot = (a, sl) => (sl === "__other" ? !SLOT_ORDER.includes(a.slot) : a.slot === sl);
                const bodies = allAssets.filter((a) => a.type === "body");
                if (bySlot && !loadSlot) {
                  const slotKeys = SLOT_ORDER.slice().reverse();
                  const equip = allAssets.filter(cat.match);
                  const otherCount = equip.filter((a) => !SLOT_ORDER.includes(a.slot)).length;
                  return (
                    <>
                      <div className="dt"><button className="back" onClick={() => setLoadCategory(null)}>‹ Categories</button> {cat.icon} {cat.label}</div>
                      <div className="loadcats">
                        {slotKeys.map((sl) => {
                          const n = equip.filter((a) => a.slot === sl).length;
                          return (
                            <button key={sl} className="scard" disabled={!n} onClick={() => setLoadSlot(sl)}>
                              <span className="si">{SLOTS[sl].icon}</span>
                              <span className="sn">{SLOTS[sl].label}</span>
                              <span className="sty">{n} saved</span>
                            </button>
                          );
                        })}
                        {otherCount > 0 && (
                          <button className="scard" onClick={() => setLoadSlot("__other")}>
                            <span className="si">📦</span>
                            <span className="sn">Other</span>
                            <span className="sty">{otherCount} saved</span>
                          </button>
                        )}
                      </div>
                      <div className="row2"><button onClick={() => setLoadOpen(false)}>Close</button></div>
                    </>
                  );
                }
                const items = allAssets.filter(cat.match).filter((a) => !bySlot || inSlot(a, loadSlot));
                const slotLabel = bySlot ? (loadSlot === "__other" ? "Other" : SLOTS[loadSlot].label) : "";
                return (
                  <>
                    <div className="dt">{bySlot
                      ? <><button className="back" onClick={() => setLoadSlot(null)}>‹ {cat.label}</button> {loadSlot === "__other" ? "📦" : SLOTS[loadSlot].icon} {slotLabel}</>
                      : <><button className="back" onClick={() => setLoadCategory(null)}>‹ Categories</button> {cat.icon} {cat.label}</>}</div>
                    {items.length ? (
                      <div className="saved loaditems">
                        {items.map((a) => (
                          <div key={a.id} className="scardwrap">
                            <button className="scard loaditem" onClick={() => { openAsset(a); setLoadOpen(false); }}>
                              <span className="si">{a.type === "equipment" ? (SLOTS[a.slot]?.icon || "📦") : cat.icon}</span>
                              <span className="sn">{a.name}</span>
                              <span className="sty">{a.type === "equipment" && SLOTS[a.slot] ? SLOTS[a.slot].label + " · " : ""}{a.savedAt ? "Saved " + new Date(a.savedAt).toLocaleDateString() : "date unknown (saved before this was tracked)"}</span>
                              {cat.fitTracked && (
                                <span className="fitlist" >
                                  {bodies.length ? bodies.map((b) => { const fitted = !!(a.confirmedFits && a.confirmedFits.includes(b.id) && a.variants && a.variants[b.id] && !fitVariantEmpty(a.type, a.variants[b.id])); return <span key={b.id} className={"fitchip" + (fitted ? " on" : "")}>{fitted ? "✓" : "—"} {b.name}</span>; }) : <span className="hint2">No bodies yet</span>}
                                </span>
                              )}
                            </button>
                            <button className={"sdel" + (confirmDel === a.id ? " arm" : "")} title={confirmDel === a.id ? "Tap again to permanently delete" : "Delete this asset"} onClick={() => { if (confirmDel === a.id) { setConfirmDel(null); deleteAsset(a); } else { setConfirmDel(a.id); flash("Tap 🗑 again to permanently delete \"" + a.name + "\""); } }}>{confirmDel === a.id ? "Sure?" : "🗑"}</button>
                          </div>
                        ))}
                      </div>
                    ) : <p className="muted">Nothing in this category yet.</p>}
                    <div className="row2"><button onClick={() => setLoadOpen(false)}>Close</button></div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
        {chooser && (
          <div className="modal" onClick={() => setChooser(false)}>
            <div className="dlg" onClick={(e) => e.stopPropagation()}>
              <div className="dt">What are you making?</div>
              <div className="tiles">
                <button className="tile" onClick={() => { setChooser(false); start("body"); }}><span className="ti">{TYPES.body.icon}</span><span className="tl">Body</span></button>
                <button className="tile" onClick={() => { setChooser(false); start("skin"); }}><span className="ti">{TYPES.skin.icon}</span><span className="tl">Skin</span></button>
              </div>
            </div>
          </div>
        )}
        {wtypeChoice && (
          <div className="modal" onClick={() => setWtypeChoice(false)}>
            <div className="dlg" onClick={(e) => e.stopPropagation()}>
              <div className="dt">Melee, ranged, projectile, or throwable?</div>
              <div className="tiles">
                <button className="tile" onClick={() => { setWtypeChoice(false); start("weapon", null, "melee"); }}><span className="ti">🗡️</span><span className="tl">Melee</span></button>
                <button className="tile" onClick={() => { setWtypeChoice(false); start("weapon", null, "ranged"); }}><span className="ti">🏹</span><span className="tl">Ranged</span></button>
                <button className="tile" onClick={() => { setWtypeChoice(false); start("weapon", null, "throw"); }}><span className="ti">💣</span><span className="tl">Throwable</span></button>
                <button className="tile" onClick={() => { setWtypeChoice(false); start("projectile"); }}><span className="ti">🔮</span><span className="tl">Projectile</span></button>
              </div>
            </div>
          </div>
        )}
        {propItemChoice && (
          <div className="modal" onClick={() => setPropItemChoice(false)}>
            <div className="dlg" onClick={(e) => e.stopPropagation()}>
              <div className="dt">Object or Item?</div>
              <div className="tiles">
                <button className="tile" onClick={() => { setPropItemChoice(false); start("prop"); }}><span className="ti">{TYPES.prop.icon}</span><span className="tl">{TYPES.prop.label}</span></button>
                <button className="tile" onClick={() => { setPropItemChoice(false); start("item"); }}><span className="ti">{TYPES.item.icon}</span><span className="tl">{TYPES.item.label}</span></button>
              </div>
            </div>
          </div>
        )}
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  if (screen === "assemble") {
    const bodies = allAssets.filter((a) => a.type === "body");
    // A skin's "variants" are per-body fits, confirmed only when a Save happens while that body
    // is the active guide (see confirmedFits) — switching the guide dropdown alone just clones a
    // starting-point layout to work from, not a finished fit. One that's confirmed for some
    // OTHER specific body — but never this one — used to still show up in the picker and
    // silently do nothing when chosen (the fit-lookup falls back to that other body's layout,
    // not the worn one). Skins never confirmed for any specific body (still just Default) are
    // universal and stay available everywhere; with no body picked yet, nothing to filter
    // against, so show everything.
    const skinFitsBody = (a, bodyId) => {
      if (!a.confirmedFits || !a.confirmedFits.length) return true; // never confirmed for a specific body — universal
      return a.confirmedFits.includes(bodyId);
    };
    const skinsList = allAssets.filter((a) => a.type === "skin" && (!loadout.bodyId || skinFitsBody(a, loadout.bodyId)));
    const weapons = allAssets.filter((a) => a.type === "weapon" && !isThrowable(a.wtype));
    const dressedList = allAssets.filter((a) => a.type === "character");
    const body = findA(loadout.bodyId);
    const skin = findA(loadout.skinId);
    const weapon = findA(loadout.weaponId);
    const overlays = [skin, ...SLOT_ORDER.map((s) => findA(loadout.slots[s]))].filter(Boolean);
    const layered = body ? layerBodyAndOverlays(applySkinTone(body, skin && skin.tone), overlays, aAngle) : []; // live preview matches the baked look, tone included
    const weaponArtPieces = (body && weapon) ? (() => { const o = weaponOffset(body, weapon, aAngle); return bake({ ...weapon, angles: { ...blankAngles(), [aAngle]: weaponRestArt(weapon, body, aAngle) } }, aAngle).filter((p) => !p.isHitbox && !p.isMuzzle).map((p) => ({ ...p, x: p.x + o.x, y: p.y + o.y, _src: weapon.id })); })() : [];
    const dressArtPieces = viewDressed ? bake(viewDressed, aAngle) : mergeWeaponBlocks(layered, weaponArtPieces);
    return (
      <div className="bb"><style>{css}</style>
        <header className="bar">
          <button className="back" onClick={() => setScreen("menu")}>‹ Menu</button>
          <div className="logo">🧩 Dress Bob</div>
          <input className="dressName" value={dressedBobName} onChange={(e) => setDressedBobName(e.target.value)} placeholder={(body ? body.name + " — dressed" : "name this outfit") + "…"} />
          <label className="chk" style={{ margin: "0 8px" }} >
            <input type="checkbox" checked={markAsEnemy} onChange={(e) => setMarkAsEnemy(e.target.checked)} /> 👹 Enemy
          </label>
          {markAsEnemy && <label className="chk" style={{ margin: "0 8px" }}>HP<input type="number" min="1" value={dressedHp} onChange={(e) => setDressedHp(Math.max(1, +e.target.value || 1))} style={{ width: 50, marginLeft: 4 }} /></label>}
          {/* No ⚔️ range field here anymore: a player-based enemy's reach IS its weapon's own swung hitbox (fists included), exactly like the player — a stored number would be meaningless. */}
          <button className="save" onClick={saveDressedBob}>💾 Save</button>
          <button className="save" onClick={exportLook}>📤 Export look</button>
        </header>
        <div className="angles">{ANGLES.map((a) => <button key={a} className={aAngle === a ? "on" : ""} onClick={() => setAAngle(a)}>{ALABEL[a]}</button>)}
          {dressedList.length > 0 && <select className="openDressed" value="" onChange={(e) => { const a = findA(e.target.value); if (a) { openDressedLook(a); flash("Viewing \"" + a.name + "\" — pick parts on the left to start a new one instead."); } }} >
            <option value="">📂 Open saved look…</option>
            {dressedList.map((a) => <option key={a.id} value={a.id}>{(a.isEnemy ? "👹 " : "") + a.name}</option>)}
          </select>}
          <label className="up" style={{ marginLeft: dressedList.length ? 0 : "auto" }}>⬆ Add asset file<input type="file" accept="application/json" onChange={sessionUpload} hidden /></label>
        </div>
        <div className="main">
          <div className="stage">
            {(body || skin) && (() => {
              const equipmentList = SLOT_ORDER.map((s) => findA(loadout.slots[s])).filter(Boolean);
              const pStats = { ...(skin?.stats || DEFAULT_STATS()) };
              let pDefense = 0;
              for (const eq of equipmentList) { if (eq.statBoosts) for (const k of Object.keys(eq.statBoosts)) pStats[k] = (pStats[k] ?? 5) + (eq.statBoosts[k] || 0); pDefense += eq.defense || 0; }
              return <p className="statline">📊 Speed {pStats.speed ?? 5} · Agility {pStats.agility ?? 5} · Intelligence {pStats.intelligence ?? 5} · Strength {pStats.strength ?? 5} · HP {pStats.hp ?? 5} · 🛡️ Defense {pDefense}</p>;
            })()}
            <div ref={artRef} className="art">
              {!body && !viewDressed && <div className="emptyart">pick a body →</div>}
              {renderPieceRuns({ pieces: dressArtPieces, cacheKey: "dressbob", keyPrefix: "d", drawPiece: (p, k) => Static(p, null, false, !!p._m, k), maskCss: cutterMaskCss })}
            </div>
          </div>
          <aside className="side">
            <div className="card">
              <div className="ct">Body</div>
              <select className="big" value={loadout.bodyId} onChange={(e) => { const nb = e.target.value; const curSkin = findA(loadout.skinId); const keepSkin = !curSkin || skinFitsBody(curSkin, nb); setLoadout({ ...loadout, bodyId: nb, skinId: keepSkin ? loadout.skinId : "" }); setViewDressed(null); }}>
                <option value="">— pick a body —</option>
                {bodies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {!bodies.length && <p className="mini">No bodies yet. Make one from the menu (or add a file above).</p>}
            </div>
            <div className="card">
              <div className="ct">Skin (tone / face / hair)</div>
              <select className="big" value={loadout.skinId} onChange={(e) => { setLoadout({ ...loadout, skinId: e.target.value }); setViewDressed(null); }}>
                <option value="">none</option>
                {skinsList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="card">
              <div className="ct">Clothes & armor</div>
              {SLOT_ORDER.slice().reverse().map((slot) => {
                const opts = allAssets.filter((a) => a.type === "equipment" && a.slot === slot);
                return (
                  <label className="slotrow" key={slot}>
                    <span>{SLOTS[slot].icon} {SLOTS[slot].label}</span>
                    <select value={loadout.slots[slot] || ""} onChange={(e) => { setLoadout({ ...loadout, slots: { ...loadout.slots, [slot]: e.target.value } }); setViewDressed(null); }}>
                      <option value="">none</option>
                      {opts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </label>
                );
              })}
            </div>
            <div className="card">
              <div className="ct">Weapon</div>
              <select className="big" value={loadout.weaponId} onChange={(e) => { setLoadout({ ...loadout, weaponId: e.target.value }); setViewDressed(null); }}>
                <option value="">none</option>
                {weapons.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </aside>
        </div>
        {combo && (
          <div className="modal" onClick={() => setCombo(null)}>
            <div className="dlg" onClick={(e) => e.stopPropagation()}>
              <div className="dt">Dressed Bob — send to the game or to Claude</div>
              <textarea value={combo} readOnly spellCheck={false} />
              <div className="row2"><button onClick={comboCopy}>📋 Copy</button><button onClick={comboDownload}>⬇ Download</button><button onClick={() => setCombo(null)}>Close</button></div>
            </div>
          </div>
        )}
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  /* ---- level creator ---------------------------------------------------- */
  if (screen === "level") {
    const lv = level;
    const lvW = lv.cols * LV_CELL, lvH = lv.rows * LV_CELL;
    // Anything usable as an enemy: standalone Enemy-type assets, or a Dress Bob look flagged 👹.
    const enemyChoices = allAssets.filter((a) => a.type === "enemy" || (a.type === "character" && a.isEnemy));
    const lvCell = (e) => { const r = lvRef.current.getBoundingClientRect(); return { c: Math.floor((e.clientX - r.left) / LV_CELL), r: Math.floor((e.clientY - r.top) / LV_CELL) }; };
    const inb = (r, c) => r >= 0 && c >= 0 && r < lv.rows && c < lv.cols;
    // Flood fill (paint bucket) — Foreground/Background only, where "quickly fill a gap" actually
    // means something. Standard bucket semantics: whatever value the clicked cell currently holds
    // (including "nothing" — the common case of filling empty space) spreads to every 4-directionally
    // connected cell sharing that same value, replaced with the current paint color/shape. Capped
    // at a generous cell count so a mis-click on a huge open level can't hang the tab.
    const floodFill = (r0, c0) => {
      const lv = level;
      if (!lv || (lLayer !== "fg" && lLayer !== "bg" && lLayer !== "front")) return;
      const { cells: cellsToFill, startVal, hitCap } = computeFillRegion(lv, lLayer, r0, c0);
      const ol = lOutline ? lOutlineColor : null; // guarded to fg/bg/front above; Outline rides along so the filled region gets an outer-edge border
      const shape = terrainPaintShape(lLayer, lFgShape, lFgUpsideDown, lFgHide);
      const newVal = withOutline(paintValue(lColor, activeTexture, shape), ol);
      if (JSON.stringify(newVal) === JSON.stringify(startVal)) return; // already this value everywhere reachable — nothing to do
      const CONFIRM_THRESHOLD = 300;
      if (cellsToFill.length > CONFIRM_THRESHOLD) {
        const layerName = lLayer === "fg" ? "Foreground" : lLayer === "bg" ? "Background" : "Front";
        const ok = window.confirm("This would repaint " + cellsToFill.length + " cells on the " + layerName + " layer. If that's way more than you expected, Cancel and check you're on the right layer tab. Fill anyway?");
        if (!ok) return;
      }
      setLevel((lv2) => {
        const layer2 = { ...lv2[lLayer] };
        for (const k of cellsToFill) layer2[k] = newVal;
        return { ...lv2, [lLayer]: layer2 };
      });
      if (hitCap) flash("Filled the first 8000 cells — that region was huge, so it stopped there rather than hang.");
    };
    // Move to layer — same connectivity/matching rules as Fill (see above) but instead of
    // repainting in place, this picks the matched region UP so it can be dropped on a different
    // layer with its original colors/shapes intact. Exists because Foreground/Background/Front
    // are easy to mix up (similar names, right next to each other), and there was previously no
    // way to relocate a region once painted on the wrong one short of erasing and repainting it.
    // IMPORTANT: the clicked cell is looked up across ALL three color layers, not just the
    // active one — the natural flow is "select the DESTINATION layer, then click the thing you
    // want moved there", and that thing is by definition sitting on a DIFFERENT layer than the
    // active one. Requiring the source layer to be active first (the original behavior) made
    // exactly that flow fail with "Nothing painted here". Priority: active layer first (so if
    // two layers both have paint at that cell, the one you're on wins), then Front → Foreground
    // → Background (visual top-down order).
    const pickMoveRegion = (r0, c0) => {
      const k0 = cellKey(r0, c0);
      // If a pickup is already pending, check ITS layer first — clicking a DIFFERENT color on the
      // SAME source layer (the trunk after the canopy, say) should grow that pending selection,
      // not replace it. Without this, moving anything with more than one color only ever moved
      // whichever region you clicked last, silently leaving the rest stuck on the old layer.
      const preferred = layerMove && layerMove.levelId === lv.id ? [layerMove.layer] : [];
      const order = [...preferred, lLayer, "front", "fg", "bg"].filter((l, i, a) => (l === "fg" || l === "bg" || l === "front") && a.indexOf(l) === i);
      let srcLayer = null;
      for (const l of order) { const v = (lv[l] || {})[k0]; if (v !== undefined && v !== null) { srcLayer = l; break; } }
      if (!srcLayer) { flash("Nothing painted at this cell on Foreground, Background, or Front — click a filled-in cell."); return; }
      const layer = lv[srcLayer] || {};
      const startVal = layer[k0];
      const sameAsStart = (v) => (v !== undefined && v !== null) && cellSig(v) === cellSig(startVal);
      const visited = new Set();
      const cells = {};
      const stack = [[r0, c0]];
      const MAX_CELLS = 8000;
      while (stack.length && Object.keys(cells).length < MAX_CELLS) {
        const [r, c] = stack.pop();
        if (!inb(r, c)) continue;
        const k = cellKey(r, c);
        if (visited.has(k)) continue;
        visited.add(k);
        const v = layer[k] ?? null;
        if (!sameAsStart(v)) continue;
        cells[k] = v;
        stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
      }
      const growing = layerMove && layerMove.levelId === lv.id && layerMove.layer === srcLayer;
      setLayerMove({ layer: srcLayer, cells: growing ? { ...layerMove.cells, ...cells } : cells, levelId: lv.id });
      if (growing) flash("Added " + Object.keys(cells).length + " more cell(s) — " + (Object.keys(cells).length + Object.keys(layerMove.cells).length) + " total picked up so far.");
    };
    const lvDown = (e) => {
      if (play) return;
      const { r, c } = lvCell(e); if (!inb(r, c)) return;
      const k = cellKey(r, c);
      if (eyedrop) {
        if (lLayer === "obj") {
          const stack = lv.fx[k];
          if (stack && stack.length) {
            const top = stack[stack.length - 1];
            if (top.kind === "shape") { setLObjKind("shape"); setLObjShape(top.shape || "rect"); setLTint(top.tint); addRecent(top.tint); flash("Picked up shape + color 🎨"); }
            else if (top.tint) { setLObjKind("emoji"); setLTint(top.tint); addRecent(top.tint); flash("Picked up color 🎨"); }
            else flash("That block uses its natural emoji colors — nothing to pick up.");
          }
          else flash("Nothing here to pick up.");
        } else if (lLayer === "fg" || lLayer === "bg" || lLayer === "front") {
          const cell = lv[lLayer][k];
          if (cell) {
            setLColor(fgColor(cell)); addRecent(fgColor(cell));
            const tid = cellTexId(cell);
            setLTexId(resolveTexture(texLib, tid) ? tid : null); // a texture that's since been deleted picks up as its plain fallback color
            if (lLayer === "fg" || lLayer === "bg") { setLFgShape(fgHasDiagonalShape(cell) ? (cell.slope > 0 ? "slopeUp" : "slopeDown") : "block"); setLFgUpsideDown(fgHasDiagonalShape(cell) && !!cell.upsideDown); if (lLayer === "fg") setLFgHide(fgHiddenInPlay(cell)); if (fgHasDiagonalShape(cell)) setLBrush(Math.min(8, fgRun(cell))); }
            flash("Picked up " + (tid ? "texture 🧱" : "color 🎨") + ((lLayer === "fg" || lLayer === "bg") && fgHasDiagonalShape(cell) ? " + ramp shape/size" : "") + (lLayer === "fg" && fgHiddenInPlay(cell) ? " + collision only" : ""));
          } else flash("Nothing here to pick up.");
        } else {
          flash("Eyedropper only works on Foreground, Background, or Objects.");
        }
        setEyedrop(false);
        return;
      }
      if ((lTool === "select" || lTool === "copy") && (lLayer === "obj" || lLayer === "marker")) { pickUpOrDrop(r, c); return; }
      // Enemy-placement mode (an enemy is picked in the menu). It OWNS both paint and erase so it's
      // self-contained: Paint drops one here, Erase removes the one here — no falling through to
      // erase the layer underneath. Pick "— none —" (or click a layer tab) to leave enemy mode.
      if (lEnemyId) {
        if (lTool === "erase") { setLevel((lv2) => { if (!lv2.enemies || !lv2.enemies[k]) return lv2; const enemies = { ...lv2.enemies }; delete enemies[k]; return { ...lv2, enemies }; }); return; }
        if (lTool === "paint") { setLevel((lv2) => ({ ...lv2, enemies: { ...(lv2.enemies || {}), [k]: { enemyId: lEnemyId, facing: lEnemyFace, ...(lEnemyAi !== "asset" ? { ai: lEnemyAi } : {}) } } })); return; }
      }
      if (lTool === "areaCopy") { areaAnchor.current = { r, c }; setAreaDragOn(true); return; }
      if (lTool === "fill") { floodFill(r, c); return; }
      if (lTool === "move") { pickMoveRegion(r, c); return; }
      if ((lLayer === "fg" || lLayer === "bg") && lFgShape !== "block" && lTool === "paint") {
        // Ramps are placed as one multi-cell unit on release (see the pointerup effect above),
        // not stamped cell-by-cell while dragging — that's what let a bigger "size" turn into
        // several separate 45° ramps instead of one longer, shallower one.
        rampAnchor.current = { r, c }; setRampDragOn(true);
        return;
      }
      // Object art handles erase directly. Clicking transparent space must do nothing rather than
      // beginning a cell-based erase stroke that guesses which overlapping footprint was meant.
      if (lLayer === "obj" && lTool === "erase") return;
      lpaint.current = { on: true, last: k, startX: e.clientX, startY: e.clientY, moved: false };
      paintBrush(r, c, undefined, inb);
      // The inspector follows the object that was just placed, which lives at its centred
      // anchor — not at the clicked cell (objPaintKey).
      if (lLayer === "obj") { setLFxSel(objPaintKey(r, c)); setLFxEditIdx(null); }
    };
    const lvMove = (e) => {
      if (play) { setLHoverCell(null); return; }
      const { r, c } = lvCell(e);
      const within = inb(r, c);
      setLHoverCell(within ? { r, c } : null);
      if (!lpaint.current || !lpaint.current.on || !within) return;
      // A click never sits at exactly one pixel — the pointer drifts a little between down and
      // up even when you didn't mean to drag. Require a few real pixels of movement before this
      // counts as an intentional drag, so a single click can't accidentally paint into the
      // neighbouring cell (this was the "selecting one thing grabs multiple things" bug).
      if (!lpaint.current.moved) {
        const dxm = e.clientX - lpaint.current.startX, dym = e.clientY - lpaint.current.startY;
        if (dxm * dxm + dym * dym < 16) return;
        lpaint.current.moved = true;
      }
      const k = cellKey(r, c);
      if (lLayer === "obj" && lpaint.current.last === k) return; // moving within the same cell shouldn't re-stack on every pointer jitter
      lpaint.current.last = k; paintBrush(r, c, undefined, inb);
      if (lLayer === "obj") { setLFxSel(objPaintKey(r, c)); setLFxEditIdx(null); }
    };
    const basePlayerAsset = findA(playerId);
    const playerAsset = mergeEquip(basePlayerAsset, equipped.current, equippedBodyIdFor(basePlayerAsset));
    const playtestWeapon = playtestWeaponId ? findA(playtestWeaponId) : null; // used by the render below; the physics loop above has its own copy in its own closure
    // What pressing E on an item will actually DO, in one line: "use · +20 HP", "swap · Dmg 5→7",
    // "equip · Speed 5→7 · 🛡️ +2". Computed exactly the way the E handler resolves the take, so the
    // number shown is the number you get.
    // Shared by pedestals AND enemy drops. A drop used to say only "Press E to pick up", so the one
    // way to find out what you were about to swap into was to take it and go read your own stats —
    // and by then the thing you were wearing is on the floor. Loot off a body is the same decision
    // as loot on a plinth, so it answers the same question.
    const takePromptText = (it) => {
      if (!it) return null;
      if (it.type === "item") return "Press E to use · " + itemEffectSummary(it.effect);
      if (it.type === "weapon") {
        const held = playtestWeaponId ? findA(playtestWeaponId) : null, ad = it.damage ?? 5;
        const delta = held ? (ad !== (held.damage ?? 5) ? ["Dmg " + (held.damage ?? 5) + "→" + ad] : []) : ["Dmg " + ad];
        return "Press E to " + (held ? "swap" : "equip") + (delta.length ? " · " + delta.join(" · ") : " · no stat change");
      }
      const offSlot = equipDisplacedSlot(it, equipped.current);
      const before = mergeEquip(basePlayerAsset, equipped.current, equippedBodyIdFor(basePlayerAsset));
      const nextMap = { ...equipped.current }; if (offSlot) delete nextMap[offSlot]; nextMap[it.slot] = it;
      const delta = equipEffectSummary(before, mergeEquip(basePlayerAsset, nextMap, equippedBodyIdFor(basePlayerAsset)));
      return "Press E to " + (offSlot ? "swap" : "equip") + (delta.length ? " · " + delta.join(" · ") : " · no stat change");
    };
    // An item lying on the ground — on a pedestal or dropped by a body — never changes its art, but
    // the whole level screen re-renders every playtest frame, so both call sites were re-baking
    // every one of them 60 times a second and re-measuring its bounding box each time. Bake once
    // per item and keep it; the cache is keyed on the item's own id, which is what "the same item"
    // means everywhere else here.
    const groundArt = (it) => {
      if (!it) return { pieces: [], bb: null };
      const hit = groundArtCache.current.get(it.id);
      if (hit) return hit;
      const src = it.type === "weapon" && it.states && it.states.rest ? { ...it, angles: it.states.rest } : it;
      const pieces = bake(src, displayPoseKey(src)).filter((pc) => !pc.isHitbox && !pc.isMuzzle);
      let bb = null;
      if (pieces.length) { let a = Infinity, b = Infinity, d = -Infinity, e = -Infinity; for (const pc of pieces) { a = Math.min(a, pc.x); b = Math.min(b, pc.y); d = Math.max(d, pc.x + pc.w); e = Math.max(e, pc.y + pc.h); } bb = { x: a, y: b, w: Math.max(1, d - a), h: Math.max(1, e - b) }; }
      const out = { pieces, bb };
      groundArtCache.current.set(it.id, out);
      return out;
    };
    const layerKey = lLayer === "obj" ? "fx" : lLayer === "marker" ? "markers" : lLayer === "enemy" ? "enemies" : lLayer; // backing level property for each tool (climb/hazard use their own name directly)
    // Live Fill preview: shows exactly what a click would affect BEFORE you click — the direct
    // fix for "clicked what looked like the right thing but it filled way more/less than
    // expected" (usually the wrong layer tab active, e.g. Background instead of Front). Only
    // actually highlights cells for a reasonably-sized region (rendering thousands of preview
    // divs on every mouse-move would be its own performance problem); a huge region still shows
    // its cell count as text so the mismatch is obvious either way.
    const fillPreview = (!play && lTool === "fill" && lHoverCell && lv && (lLayer === "fg" || lLayer === "bg" || lLayer === "front"))
      ? computeFillRegion(lv, lLayer, lHoverCell.r, lHoverCell.c) : null;
    const miniLevel = (l, w = 132) => {
      const cw = w / l.cols, ch = cw, h = ch * l.rows;
      return (
        <div className="minilv" style={{ width: w, height: h }}>
          {Object.keys(l.bg).map((k) => { const [r, c] = k.split(",").map(Number); return <div key={"b" + k} style={{ position: "absolute", left: c * cw, top: r * ch, width: cw, height: ch, background: fgColor(l.bg[k]), opacity: 0.4, clipPath: fgClipPath(l.bg[k]) }} />; })}
          {Object.keys(l.fg).flatMap((k) => { const [r, c] = k.split(",").map(Number); return fgFills(l.fg[k]).map((fill, i) => <div key={"f" + k + "_" + i} style={{ position: "absolute", left: c * cw, top: r * ch, width: cw, height: ch, background: fgColor(fill), clipPath: fgClipPath(fill), ...(fgHiddenInPlay(fill) ? { opacity: 0.45, outline: "1px dashed #62d9ff", outlineOffset: "-1px" } : {}) }} />).reverse(); })}
          {l.fx && Object.keys(l.fx).flatMap((k) => { const [r, c] = k.split(",").map(Number); const stack = l.fx[k] || []; return stack.map((o, si) => { const sz = (o.size || 1) * cw; return <div key={"x" + k + "_" + si} style={{ position: "absolute", left: objNudgedLeft(o, c, cw), top: objNudgedTop(o, r, ch), width: sz, height: sz, display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz * 0.85 }}>{o.kind === "shape" ? objInner(o, sz) : o.char}</div>; }); })}
        </div>
      );
    };
    return (
      <div className="bb" onPointerDownCapture={snapshotLevel}><style>{css}</style>
        <header className="bar">
          <button className="back" onClick={() => setScreen("menu")}>‹ Menu</button>
          <input className="nm wide2" value={lv.name} onChange={(e) => setLevel({ ...lv, name: e.target.value })} />
          <span className="badge">{lv.isRoom ? "🚪 Room" : "🗺️ Level"}</span>
          <button className="undo" disabled={!canUndoLevel} onClick={undoLevel}>↩ Undo</button>
          <button className="undo" disabled={!canRedoLevel} onClick={redoLevel}>↪ Redo</button>
          <button className={"save " + (play ? "playon" : "")} onClick={() => { if (play && roomReturn.current) { setLevel(roomReturn.current.level); } roomReturn.current = null; roomState.current = {}; sessionRooms.current = {}; setDoorPrompt(null); player.current = { x: 60, y: 40, vx: 0, vy: 0, onGround: false, crouch: false, face: 1, climbing: false, climbJump: false, climbKind: null, climbJumpKind: null, climbJumpGrab: false, dropCooldown: 0, onSlope: false, slopeDir: 0, slopeRun: 0, sliding: false, slideVx: 0, stepEase: 0, transitioning: null, walking: false, walkPhase: 0, firing: null, wasFire: false, blocking: null, blockCd: 0, wasMelee: false, hitRegistered: false, aimDir: 0, extraJumped: false, wasJump: false, effectAnim: null, djGravMul: 1, invuln: 0, jumpHoldT: 0, onFire: 0, burnPool: 0, wasThrow: false, throwAiming: false, throwFiring: 0, hangPhase: 0 }; projectiles.current = []; thrown.current = []; booms.current = []; throwCarry.current = 0; enemyHP.current = {}; enemyPos.current = {}; enemyDrops.current = {}; corpseStripped.current = {}; hazLife.current = {}; playRunId.current += 1; playerHP.current = maxPlayerHP(playerAsset); pedestalRolls.current = {}; pedestalDepleted.current = new Set(); equipped.current = {}; itemBuffs.current = []; setPedPrompt(null); spawnReq.current = (level && level.isRoom) ? { roomDoor: true } : { gate: true }; setPlay((v) => !v); }}>{play ? "■ Stop" : "▶ Playtest"}</button>
          <button className="save" onClick={saveLevel}>💾 Save</button>
        </header>

        <div className="catbar">
          {lv.isRoom ? (
            <>
              <label className="catfield">🚪 Room tag
                <input value={lv.roomTag || ""} onChange={(e) => setLevel({ ...lv, roomTag: e.target.value })} placeholder="e.g. shop, item, secret" />
              </label>
              <label className="catfield">Section
                <input value={lv.section || ""} onChange={(e) => setLevel({ ...lv, section: e.target.value })} placeholder="optional note" />
              </label>
            </>
          ) : (
            <>
              <label className="catfield">Floor
                <input value={lv.floor} onChange={(e) => setLevel({ ...lv, floor: e.target.value })} placeholder="e.g. 1, 2, B1" />
              </label>
              {floorSuggest.length > 0 && <div className="catchips">{floorSuggest.map((f) => <button key={f} onClick={() => setLevel({ ...lv, floor: f })}>{f}</button>)}</div>}
              <label className="catfield">Section
                <input value={lv.section || ""} onChange={(e) => setLevel({ ...lv, section: e.target.value })} placeholder="e.g. Market, Sewers, Boss room" />
              </label>
            </>
          )}
        </div>

        <div className="ltools">
          <div className="lgroup">
            <span className="lgrouplabel">Layer (what you're painting):</span>
            <div className="seg"><button className={lLayer === "fg" ? "on" : ""} onClick={() => selectLayer("fg")} >⬛ Foreground</button><button className={lLayer === "bg" ? "on" : ""} onClick={() => selectLayer("bg")} >🌫 Background</button><button className={lLayer === "front" ? "on" : ""} onClick={() => selectLayer("front")} >🎭 Front</button><button className={lLayer === "obj" ? "on" : ""} onClick={() => selectLayer("obj")} >🧩 Objects</button><button className={lLayer === "climb" ? "on" : ""} onClick={() => selectLayer("climb")} >🧗 Climb</button><button className={lLayer === "hazard" ? "on" : ""} onClick={() => selectLayer("hazard")} >🔥 Hazard</button><button className={lLayer === "marker" ? "on" : ""} onClick={() => selectLayer("marker")} title="Invisible during play">📍 Markers</button></div>
          </div>
          <div className="lgroup">
            <span className="lgrouplabel">Action:</span>
            <div className="seg"><button className={lTool === "paint" ? "on" : ""} onClick={() => selectTool("paint")}>🖌 Paint</button><button className={lTool === "erase" ? "on" : ""} onClick={() => selectTool("erase")}>🧽 Erase</button>{(lLayer === "fg" || lLayer === "bg" || lLayer === "front") && <button className={lTool === "fill" ? "on" : ""} onClick={() => selectTool("fill")} >🪣 Fill</button>}{(lLayer === "fg" || lLayer === "bg" || lLayer === "front") && <button className={lTool === "move" ? "on" : ""} onClick={() => selectTool("move")} >🔀 Move</button>}{(lLayer === "obj" || lLayer === "marker") && <button className={lTool === "select" ? "on" : ""} onClick={() => selectTool("select")} >👆 Select</button>}{(lLayer === "obj" || lLayer === "marker") && <button className={lTool === "copy" ? "on" : ""} onClick={() => selectTool("copy")} >📋 Copy</button>}<button className={lTool === "areaCopy" ? "on" : ""} onClick={() => selectTool("areaCopy")} >▭ Area Copy{hasClipboard ? " (" + clipboard.current.w + "×" + clipboard.current.h + " ready)" : ""}</button></div>
          </div>
          {enemyChoices.length > 0 && (
            <div className="lgroup">
              <span className="lgrouplabel">👹 Enemy:</span>
              <select className="big" value={lEnemyId} onChange={(e) => { setLEnemyId(e.target.value); if (e.target.value) setLTool("paint"); }}>
                <option value="">— none —</option>
                {enemyChoices.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {lEnemyId ? <button className="ltbtn" onClick={() => setLEnemyFace((f) => -f)}>{lEnemyFace === 1 ? "Facing ▶" : "◀ Facing"}</button> : null}
              {lEnemyId ? <select className="ltbtn" value={lEnemyAi} onChange={(e) => setLEnemyAi(e.target.value)}>
                <option value="guard">🛡 Guard (holds ground)</option>
                <option value="seek">🏃 Seek (chases you)</option>
                <option value="avoid">🏹 Avoid (keeps distance)</option>
                <option value="asset">⚙️ Use enemy's own setting</option>
              </select> : null}
            </div>
          )}
          {(lLayer === "fg" || lLayer === "bg" || lLayer === "front" || lLayer === "hazard") && (
            <div className="seg brushseg">{BRUSH_SIZES.map((n) => <button key={n} className={lBrush === n ? "on" : ""} onClick={() => setLBrush(n)} title={n + "x" + n + " brush"}>🖊 {n}×{n}</button>)}</div>
          )}
          {(lLayer === "fg" || lLayer === "bg" || lLayer === "front") && (
            <div className="seg">
              <button className={lOutline ? "on" : ""} onClick={() => setLOutline((v) => !v)}>▢ {lOutline ? "Outline on" : "Outline"}</button>
              {lOutline && <input type="color" value={lOutlineColor} onChange={(e) => setLOutlineColor(e.target.value)} style={{ width: 44, height: 30, padding: 0, border: "none", background: "none", verticalAlign: "middle", cursor: "pointer" }} />}
            </div>
          )}
          {(lLayer === "fg" || lLayer === "bg" || lLayer === "front" || lLayer === "obj") && (
            <button className={"ltbtn" + (eyedrop ? " on" : "")} onClick={() => setEyedrop((v) => !v)} >🎨 {eyedrop ? "Click a block…" : "Eyedropper"}</button>
          )}
          {movingActive && <span className="movingtag">{moving.current && moving.current.copy ? "📋 Holding a copy" : "✋ Holding an item"} — click a cell to place it <button className="ltbtn" onClick={cancelMoving}>✕ Cancel</button></span>}
          {lLayer === "obj" ? (
            <>
              <div className="seg"><button className={lObjKind === "emoji" ? "on" : ""} onClick={() => { setLObjKind("emoji"); setLFxSel(null); setLFxEditIdx(null); }}>😀 Emoji</button><button className={lObjKind === "shape" ? "on" : ""} onClick={() => { setLObjKind("shape"); setLFxSel(null); setLFxEditIdx(null); }} >▮ Shape</button><button className={lObjKind === "prop" ? "on" : ""} onClick={() => { setLObjKind("prop"); setLFxSel(null); setLFxEditIdx(null); }}>🌿 Object</button></div>
              {lObjKind === "prop" ? (
                (() => {
                  const props = allAssets.filter((a) => a.type === "prop");
                  return props.length ? (
                    <select className="big" value={lPropId} onChange={(e) => { const id = e.target.value; setLPropId(id); setLFxSel(null); setLFxEditIdx(null); const pa = findA(id); if (pa && pa.size) setLObjSize(pa.size); }}>
                      <option value="">— pick an Object —</option>
                      {props.map((a) => <option key={a.id} value={a.id}>🌿 {a.name}{(a.frames && a.frames.length > 1) ? " (animated)" : ""}</option>)}
                    </select>
                  ) : <span className="hint2">No Objects made yet.</span>;
                })()
              ) : lObjKind === "emoji" ? (
                <button className="objpick" onClick={() => setPicker({ mode: "level" })}><b>{lEmoji}</b> Choose emoji</button>
              ) : (
                <div className="seg"><button className={lObjShape === "rect" ? "on" : ""} onClick={() => setLObjShape("rect")}><b>▮</b>Square</button><button className={lObjShape === "circle" ? "on" : ""} onClick={() => setLObjShape("circle")}><b>●</b>Circle</button><button className={lObjShape === "tri" ? "on" : ""} onClick={() => setLObjShape("tri")}><b>▲</b>Triangle</button><button className={lObjShape === "tri2" ? "on" : ""} onClick={() => setLObjShape("tri2")} ><b>◺</b>Half triangle</button><button className={lObjShape === "topOutline" ? "on" : ""} onClick={() => setLObjShape("topOutline")}><b>▔</b>Top outline</button><button className={lObjShape === "vineWeb" ? "on" : ""} onClick={() => setLObjShape("vineWeb")}><b>🕸</b>Vine web</button><button className={lObjShape === "vine" ? "on" : ""} onClick={() => setLObjShape("vine")}><b>🌿</b>Vine</button><button className={lObjShape === "ladder" ? "on" : ""} onClick={() => setLObjShape("ladder")}><b>🪜</b>Ladder</button><button className={lObjShape === "fence" ? "on" : ""} onClick={() => setLObjShape("fence")}><b>♯</b>Fence</button></div>
              )}
              {lObjKind !== "prop" && <div className="lswatches">
                {lObjKind === "emoji" && <button className={!lTint ? "orig on" : "orig"} onClick={() => setLTint(null)} title="emoji's own colors">🌈</button>}
                {palettePicker(lPalKey, setLPalKey)}
                {lPal.map((c) => <button key={c} className={lTint === c ? "on" : ""} style={{ background: c }} onClick={() => setLTint(c)} />)}
                {recent.filter((c) => !lPal.includes(c)).slice(0, 5).map((c) => <button key={"r" + c} className={"rc" + (lTint === c ? " on" : "")} style={{ background: c }} onClick={() => setLTint(c)} />)}
                <label className="pick"><input type="color" value={lTint || "#ffffff"} onChange={(e) => setLTint(e.target.value)} onBlur={(e) => addRecent(e.target.value)} />＋</label>
              </div>}
              <div className="seg sizeseg">{LV_OBJ_SIZES.map((n) => <button key={n} className={lObjSize === n ? "on" : ""} onClick={() => setLObjSize(n)} title={n + "x" + n + " cells"}>{n}×</button>)}</div>
              <label className="chk solidchk"><input type="checkbox" checked={lSolid} onChange={(e) => setLSolid(e.target.checked)} /> Solid</label>
              <label className="chk solidchk"><input type="checkbox" checked={lInFront} onChange={(e) => setLInFront(e.target.checked)} /> In front of player</label>
              {/* TWIST — always on the strip, right next to Size, because it is a PLACEMENT setting
                  like size and colour: you dial the angle in while holding the object, then put it
                  down already tilted. Hiding it until something was selected is what made it
                  invisible — you pick Objects > Object > Trailer, look at the strip you just used,
                  and there's no rotate. With an object selected the same control edits THAT object;
                  otherwise it sets the angle for the next one you place. */}
              <span className="objtwist">
                <b>Twist</b>
                <input type="range" min="0" max="359" step="1"
                  value={fxOpen ? (fxOpen.rot || 0) : lObjRot}
                  onChange={(e) => { const v = normalizeObjRot(+e.target.value || 0); if (fxOpen) updateFxAt(lFxSel, fxOpenIdx, { rot: v }); else setLObjRot(v); }}
                  title={fxOpen ? "turn the object you last placed or clicked" : "angle every object you place from here on"} />
                <span className="hint2">{(fxOpen ? (fxOpen.rot || 0) : lObjRot)}°</span>
                <button className="rotbtn" onClick={() => { if (fxOpen) nudgeFxRot(lFxSel, fxOpenIdx, -OBJ_ROT_NUDGE); else setLObjRot((v) => normalizeObjRot(v - OBJ_ROT_NUDGE)); }}>↺</button>
                <button className="rotbtn" onClick={() => { if (fxOpen) nudgeFxRot(lFxSel, fxOpenIdx, OBJ_ROT_NUDGE); else setLObjRot((v) => normalizeObjRot(v + OBJ_ROT_NUDGE)); }}>↻</button>
                <button className="rotbtn" disabled={!(fxOpen ? (fxOpen.rot || 0) : lObjRot)} onClick={() => { if (fxOpen) updateFxAt(lFxSel, fxOpenIdx, { rot: 0 }); else setLObjRot(0); }}>0°</button>
                {/* Mirror, on the same strip and with the same dual meaning as Twist: it edits the
                    selected object if there is one, otherwise it arms the next placement. */}
                <button className={"rotbtn" + ((fxOpen ? fxOpen.flip : lObjFlip) ? " on" : "")} title="Mirror this object left↔right" onClick={() => { if (fxOpen) updateFxAt(lFxSel, fxOpenIdx, { flip: !fxOpen.flip }); else setLObjFlip((v) => !v); }}>⇄</button>
                <span className="hint2">{fxOpen ? "editing the selected object" : "sets the angle for the next one you place"}</span>
              </span>
            </>
          ) : lLayer === "marker" ? (
            <>
              <div className="seg"><button className={lMarkerKind === "door" ? "on" : ""} onClick={() => setLMarkerKind("door")}>🚪 Door</button><button className={lMarkerKind === "pedestal" ? "on" : ""} onClick={() => setLMarkerKind("pedestal")}>💎 Pedestal</button></div>
              {lMarkerKind === "door" ? (
                <>
                  <input className="catinline" value={lMarkerCat} onChange={(e) => setLMarkerCat(e.target.value)} placeholder="opens room tagged… (blank = a way back out)" />
                  {(() => { const t = (lMarkerCat || "").trim(); const n = roomPool(levelLib, t).length; return <span className="hint2">{t ? n + " room" + (n === 1 ? "" : "s") + " tagged \"" + t + "\"" + (n === 0 ? " ⚠" : "") : "exit door"}</span>; })()}
                </>
              ) : (
                <>
                  <div className="pedcfg">
                    <input className="catinline" value={lPedCat1} onChange={(e) => setLPedCat1(e.target.value)} placeholder="Category 1 (blank = any)" />
                    <input className="catinline" value={lPedCat2} onChange={(e) => setLPedCat2(e.target.value)} placeholder="Category 2 (blank = any)" />
                    <div className="seg"><button className={lPedLogic === "or" ? "on" : ""} onClick={() => setLPedLogic("or")}>OR (either tag)</button><button className={lPedLogic === "and" ? "on" : ""} onClick={() => setLPedLogic("and")}>AND (both tags)</button></div>
                  </div>
                  {catSuggest.length > 0 && <div className="catchips">{catSuggest.map((c) => <button key={c} onClick={() => { if (!lPedCat1.trim()) setLPedCat1(c); else if (!lPedCat2.trim()) setLPedCat2(c); }}>+ {c}</button>)}</div>}
                  {(() => { const filters = [lPedCat1, lPedCat2].filter((c) => c.trim()); const n = pedestalItemPool(allAssets, [lPedCat1, lPedCat2], lPedLogic).length; return <span className="hint2">{n + " item" + (n === 1 ? "" : "s") + " match" + (filters.length ? "" : " (no filter)") + (n === 0 ? " ⚠" : "")}</span>; })()}
                </>
              )}
            </>
          ) : lLayer === "climb" ? (
            <>
              <div className="seg"><button className={lClimbKind === "ladder" ? "on" : ""} onClick={() => setLClimbKind("ladder")}>🪜 Ladder</button><button className={lClimbKind === "bars" ? "on" : ""} onClick={() => setLClimbKind("bars")}>🙌 Bars</button><button className={lClimbKind === "cliff" ? "on" : ""} onClick={() => setLClimbKind("cliff")}>🧗 Cliff</button></div>
            </>
          ) : lLayer === "hazard" ? (
            <>
              <div className="seg"><button className="on">🔥 Fire</button></div>
              <label className="slider" style={{ minWidth: 190 }}>Damage<input type="range" min="1" max="30" step="1" value={lHazDps} onChange={(e) => setLHazDps(+e.target.value)} /><span className="hint2">{lHazDps} HP/sec</span></label>
              <div className="seg"><button className={lHazLife === 0 ? "on" : ""} onClick={() => setLHazLife(0)}>♾️ Permanent</button><button className={lHazLife !== 0 ? "on" : ""} onClick={() => setLHazLife((v) => v === 0 ? DEFAULT_HAZARD_LIFE : v)}>⏱ Burns out</button></div>
              {lHazLife !== 0 && <label className="slider" style={{ minWidth: 200 }}>Burns for<input type="range" min="1" max="30" step="1" value={lHazLife} onChange={(e) => setLHazLife(+e.target.value)} /><span className="hint2">{lHazLife}s</span></label>}
              <label className="chk solidchk"><input type="checkbox" checked={lHazHide} onChange={(e) => setLHazHide(e.target.checked)} /> 🚫 Invisible during play</label>
            </>
          ) : (
            <>
              <div className="lswatches">{palettePicker(lPalKey, setLPalKey)}{lPal.map((c) => <button key={c} className={lColor === c ? "on" : ""} style={{ background: c }} onClick={() => { setLColor(c); setLTexId(null); setLTool("paint"); }} />)}{recent.filter((c) => !lPal.includes(c)).slice(0, 5).map((c) => <button key={"r" + c} className={"rc" + (lColor === c ? " on" : "")} style={{ background: c }} onClick={() => { setLColor(c); setLTexId(null); setLTool("paint"); }} />)}<label className="pick"><input type="color" value={lColor} onChange={(e) => { setLColor(e.target.value); setLTexId(null); setLTool("paint"); }} onBlur={(e) => addRecent(e.target.value)} />＋</label></div>
              <button className={"ltbtn texbtn" + (activeTexture ? " on" : "")} onClick={() => { setTexTarget("level"); setTexPick(true); }}>
                {activeTexture ? <><span className="texchip" style={cellPaintStyle({ c: textureBaseColor(activeTexture), tex: activeTexture.id }, 0, 0, texLib)} /> {activeTexture.name}</> : <>🧱 Texture</>}
              </button>
              {activeTexture && <><button className={"ltbtn" + (lTool === "paint" ? " on" : "")} onClick={() => setLTool("paint")}>🖌 Texture paint</button>{(lLayer === "fg" || lLayer === "bg" || lLayer === "front") && <button className={"ltbtn" + (lTool === "fill" ? " on" : "")} onClick={() => setLTool("fill")}>🪣 Fill matching color</button>}<button className="ltbtn" onClick={() => setLTexId(null)}>✕ Plain color</button></>}
              {(lLayer === "fg" || lLayer === "bg") && (
                <>
                  <div className="seg" >
                    <button className={lFgShape === "block" ? "on" : ""} onClick={() => setLFgShape("block")}>⬛ Block</button>
                    <button className={lFgShape === "slopeUp" ? "on" : ""} onClick={() => setLFgShape("slopeUp")}>◢ Ramp ↗</button>
                    <button className={lFgShape === "slopeDown" ? "on" : ""} onClick={() => setLFgShape("slopeDown")}>◣ Ramp ↖</button>
                    {lFgShape !== "block" && <button className={lFgUpsideDown ? "on" : ""} onClick={() => setLFgUpsideDown((v) => !v)}>🙃 Upside down</button>}
                  </div>
                  {lLayer === "fg" && <label className="chk solidchk"><input type="checkbox" checked={lFgHide} onChange={(e) => setLFgHide(e.target.checked)} /> 🚫 Collision only</label>}
                </>
              )}
            </>
          )}
          <button className="ltbtn" onClick={() => setLevel((x) => ({ ...x, [layerKey]: {} }))}>Clear {lLayer === "fg" ? "FG" : lLayer === "bg" ? "BG" : lLayer === "front" ? "Front" : lLayer === "obj" ? "Objects" : lLayer === "climb" ? "Climb" : lLayer === "hazard" ? "Fire" : lLayer === "enemy" ? "Enemies" : "Markers"}</button>
          <button className="ltbtn" onClick={flipLevelNow} title="Mirror the whole level left↔right — every layer, ramps, objects, enemies and exits included. Press it again (or Undo) to put it back.">⇄ Flip</button>
          <button className="ltbtn" onClick={flipLevelToCopy} title="Same mirror, but into a NEW level so the one you're editing is left alone — this is how a downhill level becomes its uphill twin.">⇄ Flip to a copy</button>
          <button className="ltbtn" onClick={runGenerate}>🎲 Generate</button>
          <button className="ltbtn" onClick={newLevelFresh}>＋ New Level</button>
          <button className="ltbtn" onClick={newRoomFresh}>＋ New Room</button>
          <button className="ltbtn" onClick={() => setLevelLoadOpen(true)}>📂 Load a level</button>
          <label className="ltbtn up">⬆ Open a file<input type="file" accept="application/json" onChange={uploadLevel} hidden /></label>
          <button className="ltbtn" onClick={downloadLevel}>⬇ Download</button>
          <input className="bgNameInput" value={bgName} onChange={(e) => setBgName(e.target.value)} placeholder="Background name…" />
          <button className="ltbtn" onClick={saveBackground} >💾 Save BG</button>
          {bgLib.length > 0 && <select className="ltbtn bgLoadSelect" value="" onChange={(e) => loadBackground(e.target.value)} title="Replaces current Background">
            <option value="">📂 Load BG…</option>
            {bgLib.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>}
        </div>

        <div className="lmain">
          <div className="lstage">
            {/* One WRAPPING ROW, not a stack. Each of these lines is short, and stacking them
                pushed the canvas itself down the page — with a weapon and a throwable equipped
                that was four separate full-width bars to scroll past before you could see the
                level. They flow side by side now and only wrap when the stage is genuinely too
                narrow, so the canvas keeps its vertical space. */}
            <div className="statusrow">
            {play && <p className="statusline ctrlhint">⌨ <b>WASD</b> move · <b>Space</b> jump · <b>↑↓←→</b> aim/climb · <b>J/F</b> fire · <b>Q</b> {playtestWeapon && !isRanged(playtestWeapon.wtype) ? "tap to block" : "melee"}{playtestWeapon && isRanged(playtestWeapon.wtype) ? " · R reload early" : ""}{playtestThrowId ? " · hold G to aim, release to throw" : ""} <span className="buildtag">build ramp-fix-6 (overhang block)</span></p>}
            {play && (playtestWeaponId || SLOT_ORDER.some((sl) => equipped.current[sl])) && (() => {
              const bits = [];
              if (playtestWeaponId) { const w = findA(playtestWeaponId); if (w) bits.push("🗡️ " + w.name); }
              for (const sl of SLOT_ORDER) { const it = equipped.current[sl]; if (it) bits.push((SLOTS[sl] ? SLOTS[sl].icon : "🧩") + " " + it.name); }
              return bits.length ? <p className="statusline equipline">Carrying: {bits.join(" · ")}</p> : null;
            })()}
            {play && playtestThrowId && (() => {
              const n = throwCarry.current;
              return <p className={"statusline ammoline" + (n <= 0 ? " empty" : "")}>💣 {n > 0 ? n + " left — hold G to aim, release to throw" : "out of throwables"}</p>;
            })()}
            {play && playtestWeapon && isRanged(playtestWeapon.wtype) && (() => {
              // Reads the live ref straight off; the playtest loop re-renders every frame anyway
              // (setPframe), so this stays in step with the actual ammo without its own state.
              const w = wpn.current || newWeaponAmmo(0);
              if (w.reloadT > 0) {
                const total = w.reloadTotal || weaponReloadFrames(playtestWeapon.reloadTime);
                return <p className="statusline ammoline reloading">🔄 Reloading… <span className="reloadbar"><span className="reloadfill" style={{ width: (Math.max(0, 1 - w.reloadT / total) * 100) + "%" }} /></span></p>;
              }
              if (w.clip <= 0) return <p className="statusline ammoline">🔫 {playtestWeapon.name} · ∞ ammo</p>;
              return <p className={"statusline ammoline" + (w.ammo <= 0 ? " empty" : "")}>🔫 {w.ammo} / {w.clip}{w.ammo <= 0 ? " — empty, reloading…" : ""}</p>;
            })()}
            {!play && layerMove && layerMove.levelId === lv.id && (() => {
              const others = ["fg", "bg", "front"].filter((l) => l !== layerMove.layer);
              const nm = (l) => (l === "fg" ? "Foreground" : l === "bg" ? "Background" : "Front");
              return (
                <p className="statusline">🔀 Picked up {Object.keys(layerMove.cells).length} cell(s) from {nm(layerMove.layer)}. Move to:{" "}
                  {others.map((l) => <button key={l} className="ltbtn" onClick={() => commitMove(l)}>{l === "front" ? "🎭 " : l === "bg" ? "🌫 " : "⬛ "}{nm(l)}</button>)}
                  <button className="ltbtn" onClick={cancelMove}>✕ Cancel</button>
                </p>
              );
            })()}
            {!play && lTool === "areaCopy" && <p className="statusline">👉 Drag a rectangle to copy that area ({hasClipboard ? "already have a " + clipboard.current.w + "×" + clipboard.current.h + " copy loaded" : "nothing copied yet"}) — or click anywhere to stamp {hasClipboard ? "it" : "the last copy (once you've made one)"}.</p>}
            {!play && lTool === "fill" && fillPreview && <p className="statusline">🪣 Clicking here fills <b>{fillPreview.cells.length}{fillPreview.hitCap ? "+" : ""} cell{fillPreview.cells.length === 1 ? "" : "s"}</b> on <b>{lLayer === "fg" ? "Foreground" : lLayer === "bg" ? "Background" : "Front"}</b>{fillPreview.cells.length > 300 ? " — that's a lot; wrong layer tab?" : ""}</p>}
            {!play && lTool !== "areaCopy" && !(layerMove && layerMove.levelId === lv.id) && (lEnemyId && lTool === "paint"
              ? <p className="statusline">👉 Clicking places <b>👹 {(findA(lEnemyId) || {}).name || "enemy"}</b>. Pick <b>— none —</b> to paint normally.</p>
              : <p className="statusline">👉 Clicking the canvas right now will <b>{lTool === "erase" ? "erase from" : lTool === "select" ? "select on" : lTool === "move" ? "pick up on" : "paint"}</b> the <b>{lLayer === "fg" ? "Foreground" : lLayer === "bg" ? "Background" : lLayer === "front" ? "Front" : lLayer === "obj" ? "Objects" : lLayer === "climb" ? "Climb" : lLayer === "hazard" ? "Fire" : "Markers"}</b> layer.</p>)}
            </div>
            <div className={"lscroll layer-" + lLayer}>
              <div ref={lvRef} className="lgrid" style={{ width: lvW, height: lvH, backgroundSize: LV_CELL + "px " + LV_CELL + "px" }} onPointerDown={lvDown} onPointerMove={lvMove} onPointerLeave={() => setLHoverCell(null)}>
                {lvBgLayer}
                {lvFgLayer}
                {lvFrontLayer}
                {layerMove && layerMove.levelId === lv.id && Object.keys(layerMove.cells).map((k) => { const [r, c] = k.split(",").map(Number); return <div key={"mv" + k} className="lcell moveSel" style={{ left: c * LV_CELL, top: r * LV_CELL }} />; })}
                {lvFxLayer}
                {lvPropMeta.map(({ o, si, r, c, k }) => { const layout = levelObjectPixelLayout(o); const eraseNow = !play && lTool === "erase"; const eraseProp = eraseNow ? (e) => { e.stopPropagation(); setLevel((lv2) => removeLevelObject(lv2, k, si)); } : undefined; return <div key={"xp" + k + "_" + si} data-object-key={k} data-object-index={si} className={"lobj " + objectLayerClass(o) + (o.solid ? " solid" : "") + (lFxSel === k ? " insp" : "")} style={{ left: objNudgedLeft(o, c, LV_CELL), top: objNudgedTop(o, r, LV_CELL), width: layout.width, height: layout.height, ...objRotStyle(o), pointerEvents: "none" }}>{renderObj(o, layout.width, "xp" + k + "_" + si, pframe, layout.height, layout.box, eraseProp)}</div>; })}
                {!play && lvClimbLayer}
                {lvHazardLayer}
                {!play && lv.markers && Object.keys(lv.markers).map((k) => { const [r, c] = k.split(",").map(Number); const m = lv.markers[k]; const dt = (m.tag !== undefined ? m.tag : m.accepts) || ""; const eraseNow = !play && lTool === "erase"; return <div key={"mk" + k} className="lmarker" style={{ left: c * LV_CELL, top: r * LV_CELL, width: LV_CELL, height: LV_CELL, ...(eraseNow ? { cursor: "pointer" } : {}) }} title={m.kind === "door" ? "Door · " + (dt ? "opens room tagged \"" + dt + "\"" : "exit (back to previous level)") + " · press E in play" : "Item pedestal · " + pedestalSummary(m) + " · invisible in the editor · Erase tool: click to delete"} onPointerDown={eraseNow ? (e) => { e.stopPropagation(); setLevel((lv2) => { const markers = { ...lv2.markers }; delete markers[k]; return { ...lv2, markers }; }); } : undefined}>{m.kind === "door" ? "🚪" : "💎"}</div>; })}
                {!play && lv.enemies && Object.keys(lv.enemies).map((k) => { const [r, c] = k.split(",").map(Number); const ea = findA(lv.enemies[k].enemyId); return <div key={"en" + k} className="lmarker" style={{ left: c * LV_CELL, top: r * LV_CELL, width: LV_CELL, height: LV_CELL, ...(lTool === "erase" ? { cursor: "pointer" } : {}) }} onPointerDown={lTool === "erase" ? (e) => { e.stopPropagation(); setLevel((lv2) => { const enemies = { ...(lv2.enemies || {}) }; delete enemies[k]; return { ...lv2, enemies }; }); } : undefined}>{ea ? "👹" : "❓"}</div>; })}
                {!play && !lv.isRoom && CONN_KEYS.map((k) => { const pos = CONN_POS[k], cc = lv.conns[k]; return (
                  <button key={k} className={"conn " + (cc.open ? "open" : "blocked") + (lSel === k ? " sel" : "")} style={{ left: pos.x + "%", top: pos.y + "%" }} onClick={(e) => { e.stopPropagation(); setLSel(k); }} title={CONN_LABEL[k] + (cc.open ? " · accepts: " + (cc.accepts || lv.floor) : " · blocked")}>✕</button>
                ); })}
                {!play && lLayer === "obj" && lTool === "paint" && lHoverCell && !(lObjKind === "prop" && !lPropId) && (() => {
                  const ghostO = nextLevelObject;
                  const layout = levelObjectPixelLayout(ghostO);
                  // Ghost sits exactly where a click would put it — same objAnchor, edge clamp
                  // included, so the preview never lies about where a big object will land.
                  const ga = objAnchorForObject(lHoverCell.r, lHoverCell.c, ghostO, assetForLevelObject(ghostO));
                  // ...including the angle: the preview tilts with Twist, so you line a trailer up
                  // against the hill before you commit rather than placing it and then fixing it.
                  return <div className="lobjGhost" style={{ left: objNudgedLeft(ghostO, ga.c, LV_CELL), top: objNudgedTop(ghostO, ga.r, LV_CELL), width: layout.width, height: layout.height, zIndex: lInFront ? 6 : 4, ...objRotStyle({ rot: lObjRot, flip: lObjFlip }) }}>{renderObj(ghostO, layout.width, "ghost", 0, layout.height, layout.box)}</div>;
                })()}
                {!play && (lLayer === "front" || ((lLayer === "fg" || lLayer === "bg") && lFgShape === "block")) && lTool === "paint" && lHoverCell && (() => {
                  // Matches paintBrush's own iteration exactly (full r×c square, not just a
                  // horizontal span like the ramp ghost) so the preview never lies about what a
                  // click will actually stamp.
                  const half = Math.floor((lBrush - 1) / 2);
                  const outlinePrev = lOutline && (lLayer === "fg" || lLayer === "bg" || lLayer === "front");
                  const pmap = lv[lLayer] || {};
                  const foot = new Set();
                  for (let dr = -half; dr < lBrush - half; dr++) for (let dc = -half; dc < lBrush - half; dc++) foot.add(cellKey(lHoverCell.r + dr, lHoverCell.c + dc));
                  const has = (rr, cc) => !!pmap[cellKey(rr, cc)] || foot.has(cellKey(rr, cc));
                  const cells = [];
                  for (let dr = -half; dr < lBrush - half; dr++) for (let dc = -half; dc < lBrush - half; dc++) { const rr = lHoverCell.r + dr, cc = lHoverCell.c + dc; const sd = []; if (!has(rr - 1, cc)) sd.push("inset 0 2px 0 " + lOutlineColor); if (!has(rr + 1, cc)) sd.push("inset 0 -2px 0 " + lOutlineColor); if (!has(rr, cc - 1)) sd.push("inset 2px 0 0 " + lOutlineColor); if (!has(rr, cc + 1)) sd.push("inset -2px 0 0 " + lOutlineColor); cells.push([rr, cc, sd.join(", ")]); }
                  const ghostVal = paintValue(lColor, activeTexture, lLayer === "fg" && lFgHide ? { hideInPlay: true } : null);
                  return <>{cells.map(([r, c, bs]) => <div key={"blk" + r + "_" + c} className={"blockGhost" + (lLayer === "fg" && lFgHide ? " collisionOnly" : "")} style={{ left: c * LV_CELL, top: r * LV_CELL, width: LV_CELL, height: LV_CELL, ...cellPaintStyle(ghostVal, r, c, texLib), ...(outlinePrev && bs ? { boxShadow: bs } : {}) }} />)}</>;
                })()}
                {!play && lTool === "fill" && fillPreview && fillPreview.cells.length <= 500 && (
                  <>{fillPreview.cells.map((k) => { const [r, c] = k.split(",").map(Number); return <div key={"fp" + k} style={{ position: "absolute", left: c * LV_CELL, top: r * LV_CELL, width: LV_CELL, height: LV_CELL, background: "rgba(255,255,255,.3)", outline: "1px solid rgba(255,255,255,.7)", pointerEvents: "none", zIndex: 5 }} />; })}</>
                )}
                {!play && lLayer === "climb" && lTool === "paint" && lHoverCell && (
                  // Climb tiles always paint single-cell regardless of brush size (see paintBrush).
                  <div className="blockGhost" style={{ left: lHoverCell.c * LV_CELL, top: lHoverCell.r * LV_CELL, width: LV_CELL, height: LV_CELL, background: "#7aa2d6" }} />
                )}
                {!play && lLayer === "hazard" && lTool === "paint" && lHoverCell && (() => {
                  // Fire honors the brush size (fields of flame), so preview the whole r×c square.
                  const half = Math.floor((lBrush - 1) / 2);
                  const cells = [];
                  for (let dr = -half; dr < lBrush - half; dr++) for (let dc = -half; dc < lBrush - half; dc++) cells.push([lHoverCell.r + dr, lHoverCell.c + dc]);
                  return <>{cells.map(([r, c]) => <div key={"hzg" + r + "_" + c} className="blockGhost" style={{ left: c * LV_CELL, top: r * LV_CELL, width: LV_CELL, height: LV_CELL, background: "rgba(255,106,31,.4)" }} />)}</>;
                })()}
                {!play && (lLayer === "fg" || lLayer === "bg") && lFgShape !== "block" && lTool === "paint" && lHoverCell && (() => {
                  // Dragging previews the exact span being dragged out; just hovering (not yet
                  // pressed) previews what a plain click would place, using the brush-size
                  // control as the default ramp length — so the preview always matches what
                  // release/click will actually commit.
                  let r, lo, hi;
                  if (rampDragOn && rampAnchor.current && rampAnchor.current.r === lHoverCell.r) { r = rampAnchor.current.r; lo = Math.min(rampAnchor.current.c, lHoverCell.c); hi = Math.max(rampAnchor.current.c, lHoverCell.c); }
                  else { r = lHoverCell.r; const half = Math.floor((lBrush - 1) / 2); lo = lHoverCell.c - half; hi = lHoverCell.c - half + lBrush - 1; }
                  const run = hi - lo + 1;
                  const cells = [];
                  for (let c = lo; c <= hi; c++) cells.push(c);
                  // The ghost draws only the ramp itself. Foreground may keep an older fill under
                  // it; Background replaces its old decorative fill when the ramp is committed.
                  return <>{cells.map((c) => {
                    const val = paintValue(lColor, activeTexture, terrainPaintShape(lLayer, lFgShape, lFgUpsideDown, lFgHide, { run, step: c - lo }));
                    return <div key={"rg" + c} className={"rampGhost" + (lLayer === "fg" && lFgHide ? " collisionOnly" : "")} style={{ left: c * LV_CELL, top: r * LV_CELL, ...cellPaintStyle(val, r, c, texLib), clipPath: fgClipPath(val) }} />;
                  })}</>;
                })()}
                {!play && lEnemyId && lTool === "paint" && lHoverCell && (() => {
                  const ea = findA(lEnemyId);
                  if (!ea) return null;
                  const eShape = sideBodyShape(ea);
                  const eRenderW = enemyRenderW(ea, LV_CELL);
                  const epw = eRenderW * eShape.fraction;
                  const eph = enemyStandH(ea, LV_CELL);
                  const eHitLeft = lHoverCell.c * LV_CELL + LV_CELL / 2 - epw / 2;
                  const eLeft = eHitLeft - (eShape.centerFrac * eRenderW - epw / 2);
                  const eTop = (lHoverCell.r + 1) * LV_CELL - eph; // matches the spawn's own feet-on-cell math
                  return <div className="enemyGhost" style={{ left: eLeft, top: eTop, width: eRenderW, height: eph }} />;
                })()}
                {!play && areaDragOn && areaAnchor.current && lHoverCell && (() => {
                  const r0 = Math.min(areaAnchor.current.r, lHoverCell.r), r1 = Math.max(areaAnchor.current.r, lHoverCell.r);
                  const c0 = Math.min(areaAnchor.current.c, lHoverCell.c), c1 = Math.max(areaAnchor.current.c, lHoverCell.c);
                  return <div className="areaGhost" style={{ left: c0 * LV_CELL, top: r0 * LV_CELL, width: (c1 - c0 + 1) * LV_CELL, height: (r1 - r0 + 1) * LV_CELL }} />;
                })()}
                {play && (() => {
                  const p = player.current;
                  const bodyShape = sideBodyShape(playerAsset);
                  const pw = LV_CELL * PLAYER_RENDER_W_CELLS * bodyShape.fraction; // matches the physics hitbox exactly
                  const renderW = LV_CELL * PLAYER_RENDER_W_CELLS; // wider, aspect-correct — keeps the body undistorted
                  const ph = p.crouch ? LV_CELL * PLAYER_CROUCH_H_CELLS : LV_CELL * PLAYER_H_CELLS;
                  // Standing crouch uses the authored front-facing Crouch pose. Crouch-walking keeps
                  // the established sideways Side pose and its leg cycle, then lowers the completed
                  // art plane below — movement must never turn the character toward the camera.
                  const angle = playerPoseKey(p);
                  const airborne = !p.onGround && !p.climbing && !p.transitioning; // a jump or a fall — not standing, climbing, or mid level-transition
                  let blocks = playerAsset ? livePlayerBlocks(angle) : null;
                  // A drawn ENEMY used as the player: if it has a hand-drawn Attack pose and is
                  // mid melee swing, show that pose instead — it OVERRIDES the arm-swing animation,
                  // exactly like it does on AI enemies. Ranged/throw don't use it (those lift/aim).
                  const playerAtkPose = !!(basePlayerAsset && basePlayerAsset.type === "enemy" && p.firing && !p.climbing && (!playtestWeapon || !isRanged(playtestWeapon.wtype)) && basePlayerAsset.angles && (basePlayerAsset.angles.attack || []).length);
                  if (playerAtkPose && blocks) blocks = bake(basePlayerAsset, "attack");
                  // A dressed character's angles already contain a BAKED copy of its weapon. With a
                  // live playtest weapon attached on top, the two overlap pixel-perfectly at rest —
                  // then the live one swings away and the frozen baked one stays behind (the
                  // "duplicate weapon" bug). Strip the baked copy whenever a live weapon is equipped.
                  if (blocks && playtestWeapon) blocks = blocks.filter((b) => !b._isWeapon);
                  // Double Jump effect animation: while active, swap the granting equipment
                  // slot's own baked pieces for the current frame of its custom animation —
                  // IN PLACE (same array position), so it keeps whatever layering that slot was
                  // already composed with (behind the arm, under a jacket, etc.) rather than
                  // just dropping the frame on top of everything. Angle is always "side" here
                  // (see the angle formula above — nothing else applies mid-jump), matching how
                  // the animation is designed (Side view only).
                  if (blocks && p.effectAnim) {
                    const ea = p.effectAnim;
                    const rawIdx = Math.floor(ea.t / ea.frameDur);
                    const fIdx = ea.loop ? (rawIdx % ea.frames.length) : Math.min(ea.frames.length - 1, rawIdx);
                    const framePieces = (ea.frames[fIdx]?.side || []).map((pc) => ({ ...pc, _slot: ea.slot }));
                    const firstIdx = blocks.findIndex((b) => b._slot === ea.slot);
                    const rest = blocks.filter((b) => b._slot !== ea.slot);
                    blocks = firstIdx === -1 ? rest.concat(framePieces) : rest.slice(0, firstIdx).concat(framePieces, rest.slice(firstIdx));
                  }
                  const crouchPlane = blocks && p.crouch ? crouchArtPlane(blocks, renderW, ph) : null;
                  // Captured BEFORE any climb/walk/swing modifications — this is the arm's
                  // rotation as originally drawn, which is what the weapon's hand-alignment
                  // point was designed against. Any later change to the arm's rot (climbing,
                  // firing) is tracked as a delta from this baseline and applied to the
                  // weapon too, so it stays rigidly attached instead of freezing in place.
                  const baseArmPiece = blocks && armOf(blocks);
                  const baseArmRot = baseArmPiece ? (baseArmPiece.rot || 0) : 0;
                  // A mirrored twin (created for non-side poses — e.g. Back, used while
                  // climbing) renders inside scaleX(-1), which visually REVERSES whatever
                  // rotation it's given. Every place below that turns the arm (or equipment
                  // riding along with it) by some delta needs this correction, or a mirrored
                  // piece rotates backward relative to its own mirrored orientation.
                  const armMirrorTwist = (b) => (b._m && b.mirrorTwist !== false ? -1 : 1);
                  // The shoulder a clothing arm piece should pivot around: the body's own weapon
                  // arm (its top/bottom edge = the shoulder), matched to the same mirror-side. If
                  // the body has no weapon arm at all, fall back to the topmost arm piece on that
                  // side so the sleeve+cuff still rotate together as one rigid arm.
                  // (Shoulder anchoring for clothing arm pieces now lives in armAnchorFinder /
                  // rigidArmFollow at module level — anchored by NEAREST on-screen arm, not by
                  // mirror parity, and shared by the ladder, bars, melee and aim branches.)
                  if (blocks && p.climbing && p.climbKind === "ladder") {
                    const { legIds, armIds } = identifyLimbs(blocks);
                    const anchorOf = armAnchorFinder(blocks);
                    blocks = blocks.map((b) => {
                      if (b.role !== "weaponArm" && b.limb !== "arm") return b;
                      const target = armClimbAbs(b.armPivot);
                      if (b.role === "weaponArm") return { ...b, rot: target };
                      const a = anchorOf(b);
                      if (!a) return { ...b, rot: limbFollowRot(b, target, baseArmRot) }; // no real body arm to anchor to -> simple rot-only follow (never fling a piece around a guessed pivot)
                      return rigidArmFollow(b, a, armClimbAbs(a.armPivot)); // stay glued to the shoulder of the arm actually underneath it
                    });
                    const swing = Math.sin(p.walkPhase || 0) * 22; // alternate limbs like scaling a ladder
                    // alternate: each piece swings by which SIDE it's on (so pants always match the
                    // leg under them); armReach: arms pump up/down alternately instead of rotating.
                    blocks = applyLimbSwing(blocks, legIds, armIds, swing, { alternate: true, armReach: Math.sin(p.walkPhase || 0) * 10, legLift: Math.sin(p.walkPhase || 0) * 8 });
                  } else if (blocks && p.climbing) {
                    // Monkey bars / cliff ledge: a hang, not a climb — both arms forced straight up
                    // to the grip. The legs get a slow pendulum sway rather than the ladder's
                    // alternating stride: hanging by your hands, both feet drift together as your
                    // weight shifts, so this deliberately does NOT pass `alternate` (that would
                    // scissor them like a climb). Driven by hangPhase, so it keeps swaying while
                    // you hang motionless — the whole point, since walkPhase stops when you do.
                    const { legIds, armIds } = identifyLimbs(blocks);
                    const anchorOf = armAnchorFinder(blocks);
                    blocks = blocks.map((b) => {
                      if (b.role !== "weaponArm" && b.limb !== "arm") return b;
                      const target = armClimbAbs(b.armPivot);
                      if (b.role === "weaponArm") return { ...b, rot: target };
                      const a = anchorOf(b);
                      if (!a) return { ...b, rot: limbFollowRot(b, target, baseArmRot) };
                      return rigidArmFollow(b, a, armClimbAbs(a.armPivot));
                    });
                    // Legs only — no armReach opt, so the arms stay locked to the grip above. The
                    // swing argument is unused by the legSway branch, hence 0.
                    blocks = applyLimbSwing(blocks, legIds, armIds, 0, { legSway: Math.sin(p.hangPhase || 0) * HANG_SWAY_PX });
                  } else if (blocks && p.climbJumpKind) {
                    // PUSHING OFF a climb. The arms don't drop to a neutral airborne hang — they
                    // come down only half way, to armPushOffAbs, which reads as having just shoved
                    // off the rung you were holding. They stay there for the rest of the rise and
                    // the ordinary airborne art takes over at the apex, exactly like the pose does
                    // (climbJumpKind clears on vy >= 0). Grabbing something new on the way up puts
                    // them straight back up, for free: both branches above run before this one.
                    const anchorOf = armAnchorFinder(blocks);
                    blocks = blocks.map((b) => {
                      if (b.role !== "weaponArm" && b.limb !== "arm") return b;
                      const target = armPushOffAbs(b.armPivot);
                      if (b.role === "weaponArm") return { ...b, rot: target };
                      const a = anchorOf(b);
                      if (!a) return { ...b, rot: limbFollowRot(b, target, baseArmRot) };
                      return rigidArmFollow(b, a, armPushOffAbs(a.armPivot)); // sleeves/cuffs ride the shoulder, same rule every other arm branch uses
                    });
                  } else if (blocks && p.walking) {
                    // Legs and non-weapon arms swing back and forth, opposite phase, like a normal
                    // walk cycle. Uses flags where set; otherwise the ground-nearest piece(s) and
                    // the weapon arm are used automatically so this never just does nothing.
                    // Legs pivot at the hip (top edge) so the thigh stays anchored and only the
                    // lower leg sweeps — center-pivot made the whole leg wobble in place.
                    const { legIds, armIds } = identifyLimbs(blocks);
                    const swing = Math.sin(p.walkPhase || 0) * 28;
                    blocks = addBackLeg(blocks, legIds, swing);
                    blocks = applyLimbSwing(blocks, legIds, armIds, swing);
                    blocks = applyWalkArmSwing(blocks, swing); // arms swing opposite the legs; applyLimbSwing never touches them
                  } else if (blocks && airborne && angle === "side" && !p.effectAnim) {
                    // Airborne (a jump/fall) with no custom effect animation: split the legs into a
                    // leap so the feet visibly move instead of freezing in the standing side pose —
                    // tucked up more on the way up (vy<0), reaching back down on the way down. Arms
                    // are left alone for the melee/aim branches below; the lean-into-the-jump body
                    // tilt is applied on the wrap transform (see `lean`).
                    const { legIds, armIds } = identifyLimbs(blocks);
                    const jumpSwing = (p.vy || 0) < 0 ? 24 : 13;
                    blocks = addBackLeg(blocks, legIds, jumpSwing);
                    blocks = applyLimbSwing(blocks, legIds, armIds, jumpSwing);
                  }
                  // Melee swing: while p.firing is counting down, swing the arm through the
                  // shared windup(0→150°)/strike(150°→90°)/recover(90°→0°) motion — see
                  // meleeSwingAngle. Runs independently of the climb/walk branches above so a
                  // swing mid-stride or mid-climb still shows, layered additively on whatever
                  // rotation is already there.
                  // An unarmed swing gets the arc whatever is in your hand — that's the pistol-whip:
                  // the gun stays gripped and sweeps round with the arm (it's the thing you're
                  // hitting with), on its Rest art since no round was fired.
                  const meleeSwinging = blocks && p.firing && (p.firing.unarmed || !playtestWeapon || !isRanged(playtestWeapon.wtype)) && !playerAtkPose;
                  if (meleeSwinging) {
                    const swingAngle = meleeSwingAngle(p.firing.t, p.firing.dur);
                    // CSS +rot is clockwise: for a top-pivot arm hanging DOWN that sweeps the hand
                    // BACKWARD (behind a right-facing player), so a forward swing is -swingAngle.
                    // A bottom-pivot arm points up, where clockwise IS forward.
                    const meleeAnchorOf = armAnchorFinder(blocks);
                    const meleeArmRot = (a) => (a.rot || 0) + armPivotSign(a.armPivot) * swingAngle * armMirrorTwist(a);
                    blocks = blocks.map((b) => {
                      if (b.role !== "weaponArm" && b.limb !== "arm") return b;
                      if (b.role === "weaponArm") return { ...b, rot: meleeArmRot(b) };
                      const a = meleeAnchorOf(b);
                      if (!a) return { ...b, rot: meleeArmRot(b) };
                      return rigidArmFollow(b, a, meleeArmRot(a)); // sleeves ride the swing rigidly instead of spinning in place about their own tops
                    });
                  } else if (blocks && p.throwAiming && !p.climbing) {
                    // Throw aim (G held): the arm holds cocked back at the swing's own windup
                    // angle — "grabbing" the throwable and winding up — matching the trajectory
                    // preview showing at the same time. Releasing G then plays the full swing
                    // through p.firing (the meleeSwinging branch above), so the throw is one
                    // continuous arm motion: cock back while aiming, whip through on release.
                    // Same arm/sleeve mechanics as the melee branch — a rigid follow so clothing
                    // stays glued — and suppressed while climbing, where the arms are the grip.
                    const windupAnchorOf = armAnchorFinder(blocks);
                    const windupArmRot = (a) => (a.rot || 0) + armPivotSign(a.armPivot) * MELEE_WINDUP_DEG * armMirrorTwist(a);
                    blocks = blocks.map((b) => {
                      if (b.role !== "weaponArm" && b.limb !== "arm") return b;
                      if (b.role === "weaponArm") return { ...b, rot: windupArmRot(b) };
                      const a = windupAnchorOf(b);
                      if (!a) return { ...b, rot: windupArmRot(b) };
                      return rigidArmFollow(b, a, windupArmRot(a));
                    });
                  } else if (blocks && p.blocking) {
                    // BLOCK (Q/V holding a melee weapon): a HELD pose, not an arc. The arm sets to
                    // the same absolute "extended, level" rotation the ranged aim hold uses
                    // (armAimAbs) and stays there for the ~1s the guard lasts, so the weapon reads
                    // as braced across you rather than swung. The arm dropping when the guard
                    // expires is the POINT, not a glitch — it's the tell that the window has closed
                    // and you have to press again (see advanceBlock). Same rigid sleeve follow as
                    // every other arm pose; the weapon attaches below unchanged and stays on its
                    // Rest art, since p.firing is null throughout a block.
                    const blockAnchorOf = armAnchorFinder(blocks);
                    blocks = blocks.map((b) => {
                      if (b.role !== "weaponArm" && b.limb !== "arm") return b;
                      const target = armAimAbs(b.armPivot);
                      if (b.role === "weaponArm") return { ...b, rot: target * armMirrorTwist(b) };
                      const a = blockAnchorOf(b);
                      // Sleeve with no anchor arm: same rotational DELTA the arm made, kept on top
                      // of the sleeve's own baked rest rot — see the aim branch for why.
                      if (!a) { const armDelta = target - baseArmRot; return { ...b, rot: (b.rot || 0) + armDelta * armMirrorTwist(b) }; }
                      return rigidArmFollow(b, a, armAimAbs(a.armPivot) * armMirrorTwist(a));
                    });
                  }
                  const aiming = blocks && p.aiming && playtestWeapon && isRanged(playtestWeapon.wtype) && angle !== "up";
                  if (aiming) {
                    // A held pose, not an animated arc — the arm lifts toward wherever ↑/↓ is
                    // currently held (0 = level/across), live — so you can see and adjust your
                    // aim before ever pulling the trigger, not just during the post-fire flash.
                    // This SETS an absolute rotation (extended, roughly horizontal) rather than
                    // nudging the resting hang-down pose by a few degrees — a small delta off
                    // "arm hanging at your side" still looks like the arm hanging at your side,
                    // which was the actual bug: 90°/-90° is "horizontal, extended", matching how
                    // climbing's 180°/0° means "straight up" for the same top/bottom pivots.
                    const aimDir = p.aimDir || 0;
                    const aimAnchorOf = armAnchorFinder(blocks);
                    blocks = blocks.map((b) => {
                      if (b.role !== "weaponArm" && b.limb !== "arm") return b;
                      const target = armAimAbs(b.armPivot) + aimDir * 50;
                      if (b.role === "weaponArm") return { ...b, rot: target * armMirrorTwist(b) };
                      // Equipment (e.g. a jacket sleeve) flagged limb:"arm" so it tracks the arm
                      // may have its OWN baked rest rotation for a reason — a design-time twist
                      // so it reads correctly at rest (the jacket's rot:90, for instance). Forcing
                      // it to the exact same absolute angle as the bare arm discarded that
                      // baseline and visibly detached the sleeve from the arm underneath — the
                      // reported distortion. Apply the same rotational DELTA the arm itself is
                      // making instead, on top of the sleeve's own resting rot — the same
                      // delta-based approach the melee swing and weapon attachment already use.
                      const a = aimAnchorOf(b);
                      if (!a) { const armDelta = target - baseArmRot; return { ...b, rot: (b.rot || 0) + armDelta * armMirrorTwist(b) }; }
                      const aTarget = armAimAbs(a.armPivot) + aimDir * 50;
                      // Same delta idea as before, but applied RIGIDLY about the anchor arm's
                      // shoulder — the rot-only version detached any sleeve whose own pivot
                      // wasn't at the shoulder (the jacket sleeve visibly fell below the arm
                      // the moment the player aimed up or down).
                      return rigidArmFollow(b, a, aTarget * armMirrorTwist(a));
                    });
                  }
                  // Attach the equipped weapon. Rather than a fixed compose-time offset (which
                  // is what broke tracking — the weapon just sat at whatever spot it was baked
                  // at, ignoring any later arm rotation), this recomputes live every frame: the
                  // shoulder pivot never moves regardless of rotation, so translating the
                  // weapon's own hand-alignment point onto it and then rotating by however far
                  // the arm has turned from its baseline keeps the weapon rigidly gripped
                  // through climbing, swinging, or any future arm animation.
                  // While aiming/throwing a throwable, the hand holds the GRENADE, not the
                  // equipped weapon — so suppress the weapon render for those frames (the
                  // throwable-in-hand block just below draws in its place). Outside a throw it's
                  // the normal equipped-weapon render, unchanged.
                  const throwingNow = playtestThrowId && (p.throwAiming || p.throwFiring > 0) && !p.climbing && (() => { const ct = findA(playtestThrowId); return ct && isThrowable(ct.wtype); })();
                  if (blocks && playtestWeapon && !throwingNow && !playerAtkPose) {
                    const curArm = armOf(blocks);
                    if (curArm) {
                      const wfit = weaponFitFor(playtestWeapon, equippedBodyIdFor(playerAsset));
                      const guideHand = handForGuideId(wfit.guideId)[angle] || DEFAULT_HAND[angle];
                      const isProjectile = isRanged(playtestWeapon.wtype);
                      // Fire REPLACES Rest (see weaponPoseFired) — the two are never drawn
                      // together, so a Fire pose that redraws the whole weapon is exactly what
                      // you're supposed to do. Ranged switches the instant you fire; melee
                      // switches at the swing's impact. If no Fire pose was drawn for this pose,
                      // weaponFireArt falls back to Rest rather than baking an empty array (which
                      // is what used to make the weapon vanish mid-swing).
                      const firedNow = weaponPoseFired(isProjectile, p.firing);
                      const wpnAngles = firedNow ? weaponFireArt(wfit.states, angle) : (wfit.states.rest || blankAngles());
                      const wpnPieces = bake({ ...playtestWeapon, angles: wpnAngles }, angle);
                      blocks = mergeWeaponBlocks(blocks, attachWeaponBlocks(wpnPieces, curArm, guideHand, baseArmRot));
                    }
                  }
                  // Carried throwable in hand: shown while aiming (G held) or during the brief
                  // release swing, attached to the hand exactly like a weapon so it rides the
                  // windup/throw arm motion. REST pose while holding (you're gripping it, wound
                  // up); FIRE pose during the release swing (p.throwFiring) — the actual throw
                  // frame, matching how a melee weapon swaps to Fire at its swing. It leaves the
                  // hand the instant it's thrown (throwCarry decremented + a live grenade spawned),
                  // so it never lingers on the arm after release.
                  const carriedThrowRender = playtestThrowId ? findA(playtestThrowId) : null;
                  const showThrowInHand = blocks && carriedThrowRender && isThrowable(carriedThrowRender.wtype) && (p.throwAiming || p.throwFiring > 0) && !p.climbing;
                  if (showThrowInHand) {
                    const curArm = armOf(blocks);
                    if (curArm) {
                      const tfit = weaponFitFor(carriedThrowRender, equippedBodyIdFor(playerAsset));
                      const guideHand = handForGuideId(tfit.guideId)[angle] || DEFAULT_HAND[angle];
                      const useFire = p.throwFiring > 0;
                      const thrAngles = useFire ? weaponFireArt(tfit.states, angle) : (tfit.states.rest || blankAngles());
                      const thrPieces = bake({ ...carriedThrowRender, angles: thrAngles }, angle).filter((pc) => !pc.isHitbox && !pc.isMuzzle);
                      blocks = mergeWeaponBlocks(blocks, attachWeaponBlocks(thrPieces, curArm, guideHand, baseArmRot));
                    }
                  }
                  const tProg = p.transitioning ? Math.min(1, p.transitioning.t / 30) : 0;
                  const flip = playerSpriteMirrored(basePlayerAsset, p.face) ? "scaleX(-1)" : "";
                  const shrink = p.transitioning ? "scale(" + (1 - tProg * 0.6) + ")" : "";
                  // A small forward tilt while actively climbing a ramp — only when walking
                  // AND moving in the ramp's rising direction (not just standing on one, and
                  // not while walking back down it). Written as a constant tilt "toward the
                  // sprite's own front"; combined with the existing face-flip above, it leans
                  // the right way for both facings without needing a sign flip here.
                  const ascendingSlope = p.onSlope && p.walking && p.face === p.slopeDir;
                  // Airborne: lean the whole sprite toward horizontal travel ("into the jump"),
                  // scaled by horizontal speed and capped so a fast leap tilts more than a gentle
                  // hop and a straight-up jump barely tilts. flip (scaleX(-1)) is composed BEFORE
                  // this rotate when facing left, which mirrors a rotate — so negate for that
                  // facing to keep the on-screen tilt pointing the same way as velocity for both.
                  let lean = "";
                  if (ascendingSlope) lean = "rotate(10deg)";
                  else if (airborne) {
                    const screenLean = Math.max(-16, Math.min(16, (p.vx || 0) * 3));
                    const localLean = p.face < 0 ? -screenLean : screenLean;
                    if (Math.abs(localLean) > 0.5) lean = `rotate(${localLean.toFixed(1)}deg)`;
                  }
                  // Hanging from a ledge/bars lifts the sprite one cell so the reaching HANDS meet
                  // the grip (the grip point is the TOP of the hitbox — see canGripClimb), instead
                  // of the head sitting at the bar. Ladders climb rung-to-rung and stay put. Purely
                  // visual: physics, hitbox, and grip all still run off p.y untouched.
                  const climbLift = (p.climbing && p.climbKind && p.climbKind !== "ladder") ? LV_CELL : 0;
                  const style = { left: p.x - (bodyShape.centerFrac * renderW - pw / 2), top: p.y + (p.stepEase || 0) - climbLift, width: renderW, height: ph, transform: [flip, shrink, lean].filter(Boolean).join(" ") || "none", opacity: p.transitioning ? (1 - tProg * 0.8) : (p.invuln > 0 && Math.floor(p.invuln / 4) % 2 ? 0.5 : 1) };
                  if (p.onFire > 0) style.filter = "drop-shadow(0 0 5px #ff6a1f) brightness(1.25) saturate(1.4) hue-rotate(-12deg)";
                  const maxHp = maxPlayerHP(playerAsset), curHp = Math.max(0, Math.min(maxHp, playerHP.current));
                  const hpFrac = maxHp > 0 ? curHp / maxHp : 0;
                  return (
                    <>
                      <div className="playerHpTrack" style={{ left: p.x, top: p.y - 10 + (p.stepEase || 0) - climbLift, width: pw }}><div className="playerHpFill" style={{ width: (hpFrac * 100) + "%", background: hpFrac > 0.5 ? "#6bd06b" : hpFrac > 0.2 ? "#c8a23c" : "#b0504f" }} /></div>
                      {/* Your own reload timer, over your head, the same bar a ranged enemy gets and
                          in the same place above the HP bar. The ammo line in the HUD already said
                          "Reloading…", but that's at the bottom of the screen while your eyes are on
                          the fight — the one moment you most need to know how long you're helpless is
                          the one where you can't afford to look away. */}
                      {playtestWeapon && isRanged(playtestWeapon.wtype) && (() => {
                        const w = wpn.current;
                        if (!w || !(w.reloadT > 0)) return null;
                        const total = w.reloadTotal || weaponReloadFrames(playtestWeapon.reloadTime); // reloadTotal is the real figure; the fallback only covers a record from before it existed
                        const done = Math.max(0, Math.min(1, 1 - w.reloadT / total));
                        return <div className="playerReloadTrack" style={{ left: p.x, top: p.y - 17 + (p.stepEase || 0) - climbLift, width: pw }}><div className="playerReloadFill" style={{ width: (done * 100) + "%" }} /></div>;
                      })()}
                      <div className={blocks ? "playerWrap" : "player"} style={style}>
                        {blocks ? (() => {
                          const art = renderPieceRuns({ pieces: blocks.filter((pc) => !pc.isHitbox && !pc.isMuzzle), cacheKey: "player", keyPrefix: "pl", drawPiece: (pc, k) => Static(pc, null, false, !!pc._m, k), maskCss: cutterMaskCss });
                          const crouchWalk = p.crouch && p.walking;
                          return crouchPlane ? <div style={{ position: "absolute", left: 0, top: crouchPlane.top, width: renderW, height: crouchPlane.height, transform: crouchWalk ? `scaleY(${crouchPlane.walkScaleY})` : undefined, transformOrigin: crouchWalk ? `50% ${crouchPlane.originY}px` : undefined }}>{art}</div> : art;
                        })() : <><div className="peye" /><div className="pbody" /></>}
                      </div>
                    </>
                  );
                })()}
                {/* Objects flagged "in front of player" always use their own higher layer — in the
                    editor as well as Playtest. Placement order only controls stacking among front
                    objects or among back objects; it can never put a back bush over a front bush. */}
                {(() => {
                  const p = player.current;
                  const bodyShape = sideBodyShape(playerAsset);
                  const pw = LV_CELL * PLAYER_RENDER_W_CELLS * bodyShape.fraction; // matches the physics hitbox exactly
                  const ph = p.crouch ? LV_CELL * PLAYER_CROUCH_H_CELLS : LV_CELL * PLAYER_H_CELLS;
                  return lvFxInFrontMeta.map(({ key, r, c, k, si, o }) => {
                    const left = objNudgedLeft(o, c, LV_CELL), top = objNudgedTop(o, r, LV_CELL);
                    const layout = levelObjectPixelLayout(o);
                    // Fades whenever the player's own hitbox overlaps a front-layer object —
                    // solid (a tree trunk that still blocks movement, see solidFx above) or
                    // decorative walk-through alike. Either way the point is the same: don't let
                    // your own scenery fully swallow you on screen. A moderate fade (not too see-
                    // through, not too strong) so the object still clearly reads as there.
                    const behind = play && p.x + pw > left && p.x < left + layout.width && p.y + ph > top && p.y < top + layout.height;
                    const eraseNow = !play && lTool === "erase";
                    const eraseObject = eraseNow ? (e) => { e.stopPropagation(); setLevel((lv2) => removeLevelObject(lv2, k, si)); } : undefined;
                    const prop = o.kind === "prop";
                    return <div key={key} data-object-key={k} data-object-index={si} className={"lobj infront " + objectLayerClass(o) + (o.solid ? " solid" : "") + (lFxSel === k ? " insp" : "") + (behind ? " behindFade" : "")} style={{ left, top, width: layout.width, height: layout.height, ...objRotStyle(o), pointerEvents: eraseNow && !prop ? "auto" : "none", cursor: eraseNow && !prop ? "pointer" : undefined, opacity: behind ? 0.55 : 1 }} onPointerDown={eraseNow && !prop ? eraseObject : undefined}>{renderObj(o, layout.width, key, pframe, layout.height, layout.box, prop ? eraseObject : undefined)}</div>;
                  });
                })()}
                {/* Enemy spawns: AI-driven (Guard/Seek/Avoid, per-enemy in the Enemy Creator), fall via
                    gravity like the player, duck into their crouch pose when a shot looks threatening
                    (crouch-capable enemies only), attack the player when in range with a clear line of
                    sight, and show a live HP bar. */}
                {play && lv.enemies && Object.keys(lv.enemies).map((k) => {
                  const [r, c] = k.split(",").map(Number);
                  const ea = findA(lv.enemies[k].enemyId);
                  if (!ea) return null;
                  const maxHp = ea.hp ?? 10;
                  const curHp = enemyHP.current[k] ?? maxHp;
                  const isDead = curHp <= 0;
                  const eShape = sideBodyShape(ea);
                  const eRenderW = enemyRenderW(ea, LV_CELL);
                  const epw = eRenderW * eShape.fraction;
                  const ep = enemyPos.current[k];
                  const ducking = !!(ep && ep.crouch);
                  const eph = ducking ? enemyCrouchH(ea, LV_CELL) : enemyStandH(ea, LV_CELL);
                  const eLeft = ep ? ep.x : (c * LV_CELL + LV_CELL / 2 - epw / 2 - (eShape.centerFrac * eRenderW - epw / 2));
                  const eTop = ep ? ep.y : ((r + 1) * LV_CELL - eph); // live AI/gravity position; static fallback for the first frame before physics has run
                  const hitboxOffset = eShape.centerFrac * eRenderW - epw / 2; // hitbox-left relative to the wider render box — constant regardless of live position
                  const eFootAnchor = Math.max(0, 1 - eShape.topFrac - eShape.heightFrac) * eph; // empty canvas below the drawn feet: shift the art down by it so the visible feet rest on the ground instead of hovering by that gap (scales with the enemy, so big/tall enemies do not float)
                  if (isDead) {
                    // Defeated enemies no longer disappear — they drop where they fell and stay,
                    // drawn in a layer IN FRONT of the player (zIndex 6 beats the player's 5). A drawn
                    // enemy that has its own hand-drawn 💀 Death pose uses it verbatim; everything else
                    // (player-based looks, and monsters with no death pose drawn) falls over on its own
                    // — the standing Side pose pivoted 90° about the feet, so it lies flat on the ground
                    // pointing whichever way it was facing. No HP bar and no AI, but it does still FALL
                    // to the ground first (see the corpse-gravity branch in the enemy loop) — this used
                    // to freeze it at the height it died, leaving bodies hanging in the air. The
                    // dressed look keeps its baked-in weapon, so the body lies there holding its gear.
                    const hasDeathPose = ea.type === "enemy" && !!(ea.angles && (ea.angles.death || []).length);
                    // Anything looted off this body stops drawing — the gear it dropped is now on
                    // the ground (or on you), so it can't still be painted on the corpse. The strip
                    // count rides the render cache key, or the run cache would keep serving the
                    // still-armed art after you picked the weapon up.
                    const stripped = corpseStripped.current[k] || [];
                    const deadPose = bake(ea, hasDeathPose ? "death" : enemyPoseKey(ea, "side"));
                    const deadBlocks = deadPose.filter((pc) => !stripped.some((it) => pieceBelongsToAsset(pc, it)));
                    const layDown = !hasDeathPose;
                    // FLOATING CORPSES, the second half of the same bug. Gravity (above) drops the
                    // body onto the terrain correctly, but the body was then DRAWN in a box whose
                    // bottom margin nothing accounted for, so it still hovered — by the height of
                    // whatever empty canvas sits under its art. It is not a physics problem and no
                    // amount of falling fixes it: art whose legs stop short of the canvas floor in
                    // the creator is supposed to be pushed down by that gap, which is exactly what
                    // a LIVING enemy does with eFootAnchor. A 💀 Death pose is the worst case,
                    // being drawn lying down around mid-canvas.
                    //
                    // Measured off the pose actually being drawn (Death's gap is nothing like
                    // Side's) and off the UNSTRIPPED art, so looting a low-hanging weapon off the
                    // body can't change the measurement and make the corpse hop.
                    const deadFootAnchor = poseFootGapFrac(deadPose) * eph;
                    const deadFlip = enemyNeedsFlip(ea, ep && ep.face) ? "scaleX(-1) " : "";
                    return (
                      <div key={"enp" + k} className="playerWrap enemySpawn enemyDead" style={{ left: eLeft, top: eTop + deadFootAnchor, width: eRenderW, height: eph, pointerEvents: "none", zIndex: 6, transform: deadFlip + (layDown ? "rotate(90deg)" : ""), transformOrigin: layDown ? "50% " + (eph - deadFootAnchor) + "px" : "50% 50%" }} title={"💀 " + ea.name + " — defeated"}>
                        {renderPieceRuns({ pieces: deadBlocks.filter((pc) => !pc.isHitbox && !pc.isMuzzle), cacheKey: "dead_" + k + "_s" + stripped.length, keyPrefix: "dead" + k + "_", drawPiece: (pc, kk) => Static(pc, null, false, !!pc._m, kk), maskCss: cutterMaskCss })}
                      </div>
                    );
                  }
                  const ew = findA(enemyWeaponIdOf(ea)) || (ea.components && ea.components.weapon) || null;
                  const eRanged = !!(ew && isRanged(ew.wtype));
                  // A drawn enemy can have an optional hand-drawn Attack pose. While it's mid melee
                  // swing, show that pose — it OVERRIDES the arm-swing animation. If it's blank, fall
                  // through to swinging the arm (below), exactly as before.
                  const eUseAtkPose = !!(ep && ep.swingT > 0) && !eRanged && ea.type === "enemy" && !!(ea.angles && (ea.angles.attack || []).length);
                  const ePoseKey = eUseAtkPose ? "attack" : enemyPoseKey(ea, ducking ? "crouch" : "side");
                  let eBlocks = bake(ea, ePoseKey);
                  if (eUseAtkPose) eBlocks = alignPoseFootBaseline(bake(ea, enemyPoseKey(ea, "side")), eBlocks);
                  // Walk cycle: swing the legs (and add a mirrored back leg) exactly like the player,
                  // driven by the enemy's own walkPhase. Legs only — applyLimbSwing never touches arms,
                  // so the aim/attack/weapon pipeline below is completely unaffected. Without this the
                  // enemy slid around with frozen legs.
                  if (ep && ep.walking && !ducking && !eUseAtkPose) {
                    const { legIds, armIds } = identifyLimbs(eBlocks);
                    const eSwing = Math.sin(ep.walkPhase || 0) * 28;
                    const stackedPivot = multiLegPivot(eBlocks, legIds, eSwing);
                    if (stackedPivot) eBlocks = stackedPivot;
                    else { eBlocks = addBackLeg(eBlocks, legIds, eSwing); eBlocks = applyLimbSwing(eBlocks, legIds, armIds, eSwing); }
                  }
                  // A dressed-look enemy already has a frozen copy of its weapon baked into its
                  // art. Strip it and re-attach the live one, exactly as the player does, so the
                  // weapon tracks the swing instead of a second copy hanging in mid-air.
                  if (ew) eBlocks = eBlocks.filter((b) => !b._isWeapon);
                  // Swing/aim arm: the explicit weapon arm if one exists, else the piece(s) the
                  // enemy has flagged 💪 Arm. Only if NEITHER exists and it holds a weapon does a
                  // synthesized invisible stand-in (enemyAimArm) get spliced in, so a weapon can
                  // still be lifted/attached — without one, "guns never shoot".
                  let eArm0 = flaggedArmOf(eBlocks);
                  if (!eArm0 && ew) { const synth = enemyAimArm(eBlocks); if (synth) { eBlocks = [...eBlocks, synth]; eArm0 = synth; } }
                  const eBaseRot = eArm0 ? (eArm0.rot || 0) : 0;
                  // Melee attack: swing EVERY 💪-flagged piece through the same windup/strike arc
                  // the player's own swing uses — the primary arm rotates about its shoulder and
                  // the other flagged pieces ride it rigidly (rigidArmFollow), so a multi-piece
                  // arm stays in one piece instead of each block spinning on its own. Skipped
                  // entirely while a drawn Attack pose is showing (eUseAtkPose).
                  // RANGED: the enemy LIFTS the arm to the level aim pose — the exact -90/90
                  // hold the player's own gun arm uses — the whole time it has you in its
                  // sights (ep.aimHold, set in the physics loop) and through the shot itself.
                  const eAiming = eRanged && ep && !ep.reloading && ((ep.aimHold || 0) > 0 || ep.swingT > 0);
                  if (ep && eArm0 && !eUseAtkPose && (eAiming || (ep.swingT > 0 && !eRanged))) {
                    const eSwingA = meleeSwingAngle(ATTACK_SWING_FRAMES - ep.swingT, ATTACK_SWING_FRAMES);
                    const rot = eRanged
                      ? armAimAbs(eArm0.armPivot)
                      : eBaseRot + armPivotSign(eArm0.armPivot) * eSwingA;
                    const primary = eArm0;
                    eBlocks = eBlocks.map((b) => {
                      if (b === primary) return { ...b, rot };
                      if (b.role !== "weaponArm" && !(b.limb === "arm" && !b._isShoe)) return b;
                      return rigidArmFollow(b, primary, rot);
                    });
                  }
                  if (ew && !eUseAtkPose) {
                    const curArm = flaggedArmOf(eBlocks);
                    if (curArm) {
                      const ebid = ea.type === "enemy" ? ea.id : equippedBodyIdFor(ea);
                      const wfit = weaponFitFor(ew, ebid);
                      const ePose = enemyPoseKey(ea, ducking ? "crouch" : "side");
                      const guideHand = handForGuideId(wfit.guideId)[ePose] || DEFAULT_HAND[ePose];
                      // Same rule as the player (weaponPoseFired): Fire replaces Rest — instantly
                      // for a ranged weapon, at the impact angle for a melee one.
                      const eFired = ep && ep.swingT > 0 && weaponPoseFired(eRanged, { t: ATTACK_SWING_FRAMES - ep.swingT, dur: ATTACK_SWING_FRAMES });
                      const wpnAngles = eFired ? weaponFireArt(wfit.states, ePose) : (wfit.states.rest || blankAngles());
                      eBlocks = mergeWeaponBlocks(eBlocks, attachWeaponBlocks(bake({ ...ew, angles: wpnAngles }, ePose), curArm, guideHand, eBaseRot));
                    }
                  }
                  const hpFrac = Math.max(0, Math.min(1, curHp / maxHp));
                  const flip = enemyNeedsFlip(ea, ep && ep.face) ? "scaleX(-1)" : "none";
                  return (
                    <React.Fragment key={"enp" + k}>
                      {/* Status readouts live OUTSIDE the sprite wrapper, in their own layer above
                          the Front tiles. Inside it they were unreachable: the wrapper carries the
                          facing scaleX(-1), and a transform makes its own stacking context, so no
                          z-index on a child can lift it past scenery at z 6 — an enemy standing
                          behind a tree had its HP, reload and 💫 swallowed by the leaves, which is
                          the one time you most want to read them. Out here there's also no mirror
                          to undo, so the reload bar just fills left-to-right on its own. */}
                      <div className="unitStatus" style={{ left: eLeft + hitboxOffset, top: eTop + eFootAnchor, width: epw }}>
                        <div className="enemyHpTrack"><div className="enemyHpFill" style={{ width: (hpFrac * 100) + "%", background: hpFrac > 0.5 ? "#6bd06b" : hpFrac > 0.2 ? "#c8a23c" : "#b0504f" }} /></div>
                        {/* Reload timer, directly above the HP bar: a ranged enemy caught mid-reload
                            is the window you push in, and the only other tell is that it stopped
                            shooting — which doesn't say how long you have. Fills left-to-right as
                            the reload completes, so a full bar means it's about to fire again. */}
                        {ep && ep.reloading && ep.weaponAmmo && ew && (() => {
                          const total = ep.weaponAmmo.reloadTotal || weaponReloadFrames(ew.reloadTime, ea.stats?.intelligence ?? 5);
                          const done = Math.max(0, Math.min(1, 1 - ep.weaponAmmo.reloadT / total));
                          return <div className="enemyReloadTrack"><div className="enemyReloadFill" style={{ width: (done * 100) + "%" }} /></div>;
                        })()}
                        {ep && ep.stun > 0 && <div className="enemyStun">💫</div>}
                      </div>
                      <div className="playerWrap enemySpawn" style={{ left: eLeft, top: eTop + eFootAnchor, width: eRenderW, height: eph, pointerEvents: "none", transform: flip, ...((ep && ep.friendly) ? { filter: "drop-shadow(0 0 2px #b46cf5) drop-shadow(0 0 5px #a855f7)" } : (ep && ep.onFire > 0) ? { filter: "drop-shadow(0 0 5px #ff6a1f) brightness(1.25) saturate(1.4) hue-rotate(-12deg)" } : {}) }} title={((ep && ep.friendly) ? "🟣 " : "👹 ") + ea.name + " — " + curHp + "/" + maxHp + " HP" + ((ep && ep.friendly) ? " (fighting for you)" : "") + (ducking ? " (ducking)" : "")}>
                        {renderPieceRuns({ pieces: eBlocks.filter((pc) => !pc.isHitbox && !pc.isMuzzle), cacheKey: "enemy_" + k, keyPrefix: "enp" + k + "_", drawPiece: (pc, kk) => Static(pc, null, false, !!pc._m, kk), maskCss: cutterMaskCss })}
                      </div>
                    </React.Fragment>
                  );
                })}
                {play && doorPrompt && doorPrompt.key && (() => {
                  // Doors are invisible in play (you place your own visual over the cell). All that
                  // shows is this prompt when you're standing on one, so E has an obvious meaning.
                  const [r, c] = doorPrompt.key.split(",").map(Number);
                  const txt = doorPrompt.enter
                    ? (doorPrompt.n > 0 ? "🚪 Press E to enter" + (doorPrompt.tag ? " · " + doorPrompt.tag : "") : "🚪 No room tagged" + (doorPrompt.tag ? " \"" + doorPrompt.tag + "\"" : "") + " yet")
                    : "🚪 Press E to leave";
                  return <div key="doorprompt" className="doorPromptFloat" style={{ left: c * LV_CELL + LV_CELL / 2, top: r * LV_CELL - 6 }}>{txt}</div>;
                })()}
                {play && Object.entries(enemyDrops.current).map(([k, drop]) => {
                  if (!drop || !drop.item) return null;
                  const item = drop.item;
                  // Draw the ACTUAL drawn item on the ground, exactly the way a pedestal draws the
                  // one it rolled — same bake, same weapon-uses-its-Rest-state special case, same
                  // fit-to-box scaling. A drop used to render as a generic 🧪/🎒/⚔️ emoji orb, so
                  // there was no way to tell which shirt or which gun was lying there without
                  // walking onto it and reading the prompt. The emoji is only the fallback now, for
                  // an item whose art is genuinely empty.
                  const { pieces: artPieces, bb } = groundArt(item);
                  const dBox = LV_CELL * 1.6;
                  let dPlane = null;
                  if (bb) { const sc = Math.min(dBox / bb.w, dBox / bb.h) * 0.86; dPlane = { position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: `translate(${dBox / 2 - sc * (bb.x + bb.w / 2)}px,${dBox / 2 - sc * (bb.y + bb.h / 2)}px) scale(${sc})` }; }
                  const icon = item.type === "weapon" ? "⚔️" : item.type === "equipment" ? "🎒" : "🧪";
                  return <div key={"drop" + k} className="enemyDropPlay" style={{ left: drop.x, top: drop.y }} title={"Dropped " + item.name}>
                    <div className={"enemyDropOrb" + (bb ? " art" : "")} style={bb ? { width: dBox, height: dBox } : undefined}>{bb ? <div style={dPlane}>{renderPieceRuns({ pieces: artPieces, cacheKey: "drop_" + k, keyPrefix: "drop" + k + "_", drawPiece: (pc, kk) => Static(pc, null, false, !!pc._m, kk), maskCss: cutterMaskCss })}</div> : icon}</div>
                    {pedPrompt && pedPrompt.key === "drop:" + k && <div className="pedcallout">🎁 {takePromptText(item) || "Press E to pick up"}</div>}
                    <div className="enemyDropCap">{item.name}</div>
                  </div>;
                })}
                {play && lv.markers && Object.keys(lv.markers).map((k) => {
                  const m = lv.markers[k]; if (!m || m.kind !== "pedestal") return null;
                  const [r, c] = k.split(",").map(Number);
                  const rolled = pedestalRolls.current[k];
                  // Taken, with nothing swapped back onto it — the pedestal is spent. Render nothing
                  // (no "no match" placeholder). A pedestal that simply never matched any item still
                  // shows "no match" below, so a mis-tagged filter is still obvious in the editor.
                  if (!rolled && pedestalDepleted.current.has(k)) return null;
                  const { pieces: artPieces, bb } = groundArt(rolled);
                  const boxW = LV_CELL * PED_BOX_W_CELLS, boxH = LV_CELL * PED_BOX_H_CELLS;
                  // Seen through a wall (the loop decided which pedestals that sheet hides, and has
                  // already faded the Front cells over this one). How washed out it draws depends on
                  // how far away the player is: a distant one is a pale hint that something is over
                  // there, but once you're close it wears its own texture, full colour. Never
                  // ghosted at all when the item isn't behind a wall in the first place.
                  const xrayed = xrayPedKeys.current.has(k);
                  const ghost = xrayed
                    ? pedestalXrayGhost(Math.hypot((c + 0.5) * LV_CELL - playerCenter.current.x, (r + 0.5) * LV_CELL - playerCenter.current.y) / LV_CELL)
                    : 0;
                  const artStyle = ghost > 0.01
                    ? { opacity: 1 - 0.45 * ghost, filter: `saturate(${(1 - 0.6 * ghost).toFixed(3)}) brightness(${(1 + 0.35 * ghost).toFixed(3)}) drop-shadow(0 0 ${(5 * ghost).toFixed(2)}px rgba(130,215,255,.95))` }
                    : undefined;
                  let planeStyle = null;
                  if (bb) { const sc = Math.min(boxW / bb.w, boxH / bb.h) * 0.86; const tx = boxW / 2 - sc * (bb.x + bb.w / 2), ty = boxH / 2 - sc * (bb.y + bb.h / 2); planeStyle = { position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: `translate(${tx}px,${ty}px) scale(${sc})` }; }
                  // When the player is standing on THIS pedestal, float the call-to-action over the
                  // item: equip (nothing comes off) vs swap (a same-slot or same-category item does),
                  // plus the stat distance. takePromptText (up with the other playtest render helpers)
                  // works it out exactly the way pressing E resolves the take, so the number shown is the
                  // number you'll get — and an enemy drop now reads its callout from that same function.
                  const promptText = (play && pedPrompt && pedPrompt.key === k && rolled) ? takePromptText(rolled) : null;
                  return (
                    <div key={"ped" + k} className={"pedestalPlay" + (xrayed ? " xray" : "")} style={{ left: c * LV_CELL + LV_CELL / 2 - boxW / 2, top: r * LV_CELL - boxH + LV_CELL, width: boxW, height: boxH }} title={"Pedestal · " + pedestalSummary(m)}>
                      <div className="pedestalArt" style={artStyle}>{bb ? <div style={planeStyle}>{renderPieceRuns({ pieces: artPieces, cacheKey: "ped_" + k, keyPrefix: "ped" + k + "_", drawPiece: (pc, kk) => Static(pc, null, false, !!pc._m, kk), maskCss: cutterMaskCss })}</div> : <div className="pedestalEmpty">no match</div>}</div>
                      {promptText && <div className="pedcallout">💎 {promptText}</div>}
                      {rolled && <div className="pedestalCap">{rolled.name}</div>}
                    </div>
                  );
                })}
                {play && projectiles.current.map((pr, i) => {
                  // Projectiles render in a square container `size` cells across (size = the
                  // Projectile asset's Scale slider). Pieces fill it as percentage-of-canvas, so
                  // a bullet drawn small in its canvas AND scaled down reads small — which is the
                  // intended, original behavior. (Throwables use prepFlyingArt below for their
                  // creator-matched sizing; projectiles deliberately do NOT — the Scale slider is
                  // already the artist's size control for them.)
                  const sz = LV_CELL * (pr.size || 1);
                  if (pr.pieces) {
                    return (
                      <div key={"proj" + i} className="lobj" style={{ left: pr.x - sz / 2, top: pr.y - sz / 2, width: sz, height: sz, transform: pr.rot ? `rotate(${pr.rot}deg)` : "none" }}>
                        {renderPieceRuns({ pieces: pr.pieces, cacheKey: "proj_" + i, keyPrefix: "proj" + i + "_", drawPiece: (pc, kk) => Static(pc, null, false, !!pc._m, kk), maskCss: cutterMaskCss })}
                      </div>
                    );
                  }
                  const span = { fontSize: sz * 0.85 + "px", lineHeight: 1 };
                  if (pr.tint) Object.assign(span, { backgroundColor: pr.tint, backgroundImage: "none", color: "transparent", WebkitTextFillColor: "transparent", WebkitBackgroundClip: "text", backgroundClip: "text" });
                  return <div key={"proj" + i} className="lobj" style={{ left: pr.x - sz / 2, top: pr.y - sz / 2, width: sz, height: sz }}><span style={span}>{pr.char}</span></div>;
                })}
                {play && thrown.current.map((g, i) => {
                  // Same full-canvas container as fired projectiles (see prepFlyingArt): pieces
                  // position by canvas percentage, so the container is the whole canvas at world
                  // scale, art re-centered — the spin rotation therefore turns about the art's
                  // own center. This is the fix for the grenade rendering ~1px.
                  const cwPx = g.cwPx ?? LV_CELL, chPx = g.chPx ?? cwPx;
                  const emojiSz = Math.max(10, Math.min(g.wPx ?? LV_CELL, g.hPx ?? LV_CELL));
                  return (
                    <div key={"thr" + i} className="lobj" style={{ left: g.x - cwPx / 2, top: g.y - chPx / 2, width: cwPx, height: chPx, transform: `rotate(${g.rot}deg)`, zIndex: 8 }}>
                      {g.pieces
                        ? renderPieceRuns({ pieces: g.pieces, cacheKey: "thr_" + i, keyPrefix: "thr" + i + "_", drawPiece: (pc, kk) => Static(pc, null, false, !!pc._m, kk), maskCss: cutterMaskCss })
                        : <span style={{ fontSize: emojiSz * 0.85 + "px", lineHeight: 1 }}>💣</span>}
                    </div>
                  );
                })}
                {play && booms.current.map((b, i) => {
                  // A live explosion: the weapon's chosen Object/Prop, drawn in the front layer at
                  // the impact point, playing its animation frames once across the boom's short life
                  // and fading out at the end. No prop assigned -> a plain 💥 so the blast is still
                  // visible. Aspect-correct, same as any placed prop (propArtInner).
                  const pa = b.propId ? findA(b.propId) : null;
                  const sz = LV_CELL * (b.size || 3);
                  const frames = (pa && pa.frames && pa.frames.length) ? pa.frames.length : 1;
                  const prog = b.life / Math.max(1, b.maxLife);
                  const frameIdx = Math.min(frames - 1, Math.floor(prog * frames));
                  const fade = prog > 0.66 ? Math.max(0, 1 - (prog - 0.66) / 0.34) : 1;
                  return (
                    <div key={"boom" + i} className="lobj infront" style={{ left: b.x - sz / 2, top: b.y - sz / 2, width: sz, height: sz, zIndex: 9, opacity: fade }}>
                      {pa ? propArtInner(pa, sz, frameIdx, "boom" + i) : <span style={{ fontSize: sz * 0.7 + "px", lineHeight: 1 }}>💥</span>}
                    </div>
                  );
                })}
                {/* Throw-aim trajectory preview: while G is held with a throwable in hand, dot out
                    the exact arc a release right now would fly — computed from the same
                    strength/weight launch numbers and the same per-frame integration the real
                    grenade uses (throwTrajectoryPoints), stopping at the first solid tile. */}
                {play && player.current.throwAiming && playtestThrowId && (() => {
                  const p = player.current;
                  const ct = findA(playtestThrowId);
                  if (!ct) return null;
                  const bodyShape = sideBodyShape(playerAsset);
                  const pw = LV_CELL * PLAYER_RENDER_W_CELLS * bodyShape.fraction;
                  const ph = p.crouch ? LV_CELL * PLAYER_CROUCH_H_CELLS : LV_CELL * PLAYER_H_CELLS;
                  const strength = playerAsset?.stats?.strength ?? 5;
                  const rangeBlocks = throwRangeBlocks(strength, ct.weight);
                  const { vx, vy } = throwLaunchVel(rangeBlocks * LV_CELL, 0.175, p.face, Math.PI / 4);
                  const isSolid = (x, y) => {
                    const c = Math.floor(x / LV_CELL), r = Math.floor(y / LV_CELL);
                    if (r < 0 || c < 0 || r >= lv.rows || c >= lv.cols) return y > lv.rows * LV_CELL;
                    const cell = lv.fg[cellKey(r, c)];
                    return fgSolid(cell);
                  };
                  const pts = throwTrajectoryPoints(p.x + pw / 2, p.y + ph * 0.4, vx, vy, 0.175, isSolid);
                  return pts.map((pt, i) => (
                    <div key={"traj" + i} style={{ position: "absolute", left: pt.x - 3, top: pt.y - 3, width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,.85)", boxShadow: "0 0 4px rgba(0,0,0,.6)", zIndex: 9, pointerEvents: "none", opacity: Math.max(0.35, 1 - i / pts.length) }} />
                  ));
                })()}
              </div>
            </div>
          </div>

          <aside className="lside">
            {lLayer === "obj" && (
              lFxSel && lv.fx[lFxSel] && lv.fx[lFxSel].length > 0 ? (
                <div className="card">
                  <div className="ct">Layers on this cell ({lv.fx[lFxSel].length})</div>
                  <div className="fxstack">{lv.fx[lFxSel].map((o, i) => (
                    <div key={i} className="fxitem">
                      <div className="fxrow" onClick={() => setLFxEditIdx(fxOpenIdx === i ? -1 : i)}>
                        {o.kind === "shape" ? <span className="fxprev" style={{ display: "inline-block", width: 14, height: 14, background: o.tint || "#7aa2d6", borderRadius: o.shape === "circle" ? "50%" : 2, flexShrink: 0 }} /> : <span className="fxprev">{o.char}</span>}
                        <span className="fxname">{(o.kind === "shape" ? levelShapeLabel(o.shape) + " · " : "") + (o.solid ? "solid" : "decor") + (o.inFront ? " · in front" : "") + " · " + (o.size || 1) + "x" + ((o.rot || 0) ? " · " + o.rot + "°" : "")}</span>
                        <button onClick={(e) => { e.stopPropagation(); moveFxStack(lFxSel, i, 1); }}>▲</button>
                        <button onClick={(e) => { e.stopPropagation(); moveFxStack(lFxSel, i, -1); }}>▼</button>
                        <button onClick={(e) => { e.stopPropagation(); removeFxAt(lFxSel, i); if (lFxEditIdx === i) setLFxEditIdx(null); }}>✕</button>
                      </div>
                      {fxOpenIdx === i && (
                        <div className="fxedit">
                          {o.kind === "shape" && (
                            <div className="seg"><button className={(o.shape || "rect") === "rect" ? "on" : ""} onClick={() => updateFxAt(lFxSel, i, { shape: "rect" })}><b>▮</b>Square</button><button className={o.shape === "circle" ? "on" : ""} onClick={() => updateFxAt(lFxSel, i, { shape: "circle" })}><b>●</b>Circle</button><button className={o.shape === "tri" ? "on" : ""} onClick={() => updateFxAt(lFxSel, i, { shape: "tri" })}><b>▲</b>Triangle</button><button className={o.shape === "tri2" ? "on" : ""} onClick={() => updateFxAt(lFxSel, i, { shape: "tri2" })}><b>◺</b>Half triangle</button></div>
                          )}
                          <div className="lswatches">
                            {o.kind !== "shape" && <button className={!o.tint ? "orig on" : "orig"} onClick={() => updateFxAt(lFxSel, i, { tint: null })} title="emoji's own colors">🌈</button>}
                            {palettePicker(lPalKey, setLPalKey)}
                            {lPal.map((c) => <button key={c} className={o.tint === c ? "on" : ""} style={{ background: c }} onClick={() => updateFxAt(lFxSel, i, { tint: c })} />)}
                          </div>
                          <div className="seg sizeseg">{LV_OBJ_SIZES.map((n) => <button key={n} className={(o.size || 1) === n ? "on" : ""} onClick={() => updateFxAt(lFxSel, i, { size: n })}>{n}×</button>)}</div>
                          {o.kind === "prop" && <label className="chk"><input type="checkbox" checked={!!o.fitArt} onChange={(e) => updateFxAt(lFxSel, i, { fitArt: e.target.checked })} /> Tight bounds around visible art</label>}
                          {/* Twist — the point of it is props that lie ALONG something (a trailer on a
                              hillside) rather than standing upright. Nudges are 5° because slope
                              angles are shallow; the piece editor's 90° steps would be useless here. */}
                          <label className="slider">Twist ⟳<input type="range" min="0" max="359" step="1" value={o.rot || 0} onChange={(e) => updateFxAt(lFxSel, i, { rot: normalizeObjRot(+e.target.value || 0) })} /><span className="hint2">{(o.rot || 0)}°</span><button className="rotbtn" onClick={() => nudgeFxRot(lFxSel, i, -OBJ_ROT_NUDGE)}>↺</button><button className="rotbtn" onClick={() => nudgeFxRot(lFxSel, i, OBJ_ROT_NUDGE)}>↻</button><button className="rotbtn" disabled={!(o.rot || 0)} onClick={() => updateFxAt(lFxSel, i, { rot: 0 })}>0°</button></label>
                          <label className="chk"><input type="checkbox" checked={!!o.flip} onChange={(e) => updateFxAt(lFxSel, i, { flip: e.target.checked })} /> ⇄ Mirrored</label>
                          <span className="objnudge">
                            <b>Nudge</b>
                            <button className="rotbtn" onClick={() => updateFxAt(lFxSel, i, { ox: clampObjNudge((o.ox || 0) - OBJ_NUDGE_STEP) })}>←</button>
                            <button className="rotbtn" onClick={() => updateFxAt(lFxSel, i, { ox: clampObjNudge((o.ox || 0) + OBJ_NUDGE_STEP) })}>→</button>
                            <button className="rotbtn" onClick={() => updateFxAt(lFxSel, i, { oy: clampObjNudge((o.oy || 0) - OBJ_NUDGE_STEP) })}>↑</button>
                            <button className="rotbtn" onClick={() => updateFxAt(lFxSel, i, { oy: clampObjNudge((o.oy || 0) + OBJ_NUDGE_STEP) })}>↓</button>
                            <span className="hint2">{(o.ox || 0) + ", " + (o.oy || 0)}</span>
                            <button className="rotbtn" disabled={!(o.ox || o.oy)} onClick={() => updateFxAt(lFxSel, i, { ox: 0, oy: 0 })}>0</button>
                          </span>
                          <label className="chk"><input type="checkbox" checked={!!o.solid} onChange={(e) => updateFxAt(lFxSel, i, { solid: e.target.checked })} /> Solid</label>
                          <label className="chk"><input type="checkbox" checked={!!o.inFront} onChange={(e) => updateFxAt(lFxSel, i, { inFront: e.target.checked })} /> In front of player</label>
                        </div>
                      )}
                    </div>
                  ))}</div>
                </div>
              ) : null
            )}

            {lSel ? (
              <div className="card">
                <div className="ct">Connector: {CONN_LABEL[lSel]}</div>
                <label className="chk"><input type="checkbox" checked={lv.conns[lSel].open} onChange={() => cycleConn(lSel)} /> Open this connector</label>
                <div className="ct2">Accepts (floors this point will connect to)</div>
                <input className="big" value={lv.conns[lSel].accepts} onChange={(e) => setConnAccepts(lSel, e.target.value)} placeholder={"blank = only \"" + lv.floor + "\""} />
                {floorSuggest.length > 0 && <div className="catchips">{floorSuggest.map((f) => <button key={f} onClick={() => addCatSuggest(lSel, f)}>+ {f}</button>)}</div>}
                {/* Kept: the mutual-matching rule is a real gotcha, not a how-to — an edge silently
                    fails to connect if only one side accepts, and nothing on screen shows why. */}
              </div>
            ) : null}

            {!lv.isRoom && (
            <div className="card">
              <div className="ct">This level’s connectors</div>
              <div className="connlist">{CONN_KEYS.map((k) => (
                <button key={k} className={"connrow" + (lv.conns[k].open ? " open" : "") + (lSel === k ? " on" : "")} onClick={() => setLSel(k)}>
                  <span>{CONN_LABEL[k]}</span><span className="ctype">{lv.conns[k].open ? (lv.conns[k].accepts || lv.floor) : "blocked"}</span>
                </button>
              ))}</div>
            </div>
            )}

            <div className="card">
              <div className="ct">Playtest player</div>
              <select className="big" value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
                <option value="">▢ Plain box</option>
                {allAssets.filter((a) => a.type === "body" || a.type === "character" || a.type === "enemy").map((a) => <option key={a.id} value={a.id}>{(a.type === "enemy" || a.isEnemy ? "👹 " : "") + a.name}</option>)}
              </select>
              <label className="ltbtn up wide3b">⬆ Upload a character file<input type="file" accept="application/json" onChange={sessionUpload} hidden /></label>
              <div className="ct" style={{ marginTop: 12 }}>Playtest weapon</div>
              <select className="big" value={playtestWeaponId} onChange={(e) => setPlaytestWeaponId(e.target.value)}>
                <option value="">✋ Unarmed</option>
                {allAssets.filter((a) => a.type === "weapon" && !isThrowable(a.wtype)).map((a) => <option key={a.id} value={a.id}>{a.name} ({isRanged(a.wtype) ? "🏹" : "🗡️"})</option>)}
              </select>
              <div className="ct" style={{ marginTop: 12 }}>Throwable (press G)</div>
              <select className="big" value={playtestThrowId} onChange={(e) => setPlaytestThrowId(e.target.value)}>
                <option value="">— none carried —</option>
                {allAssets.filter((a) => a.type === "weapon" && isThrowable(a.wtype)).map((a) => <option key={a.id} value={a.id}>💣 {a.name}</option>)}
              </select>
              {playtestThrowId && (
                <label className="slider">Start with<input type="range" min="1" max="20" step="1" value={playtestThrowCount} onChange={(e) => setPlaytestThrowCount(+e.target.value)} /><span className="hint2">{playtestThrowCount} to test</span></label>
              )}
            </div>

          </aside>
        </div>

        {levelLoadOpen && (
          <div className="modal" onClick={() => setLevelLoadOpen(false)}>
            <div className="dlg" onClick={(e) => e.stopPropagation()}>
              <div className="dt">Load a level or room</div>
              {levelLib.length === 0 && <p className="mini">Nothing saved yet — make a level or room, then Save.</p>}
              {Object.entries(levelLib.reduce((groups, l) => { const k = l.isRoom ? "🚪 Rooms" : ((l.floor || "").trim() || "—"); (groups[k] = groups[k] || []).push(l); return groups; }, {}))
                .sort(([a], [b]) => (a === "🚪 Rooms" ? 1 : b === "🚪 Rooms" ? -1 : a.localeCompare(b, undefined, { numeric: true })))
                .map(([floor, items]) => (
                <div key={floor} className="loadgroup">
                  <div className="loadgrouplabel">{floor === "🚪 Rooms" ? "🚪 Rooms" : floor === "—" ? "No floor set" : "🏢 Floor " + floor}</div>
                  <div className="loadlist">{items.map((l) => <button key={l.id} onClick={() => openLevel(l)}>{l.isRoom ? "🚪" : "🗺️"} {l.name}{l.isRoom && (l.roomTag || "").trim() ? <span className="hint2"> · tag: {l.roomTag}</span> : l.section ? <span className="hint2"> · {l.section}</span> : null}</button>)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingLevelAction && (
          <div className="modal" onClick={() => setPendingLevelAction(null)}>
            <div className="dlg" onClick={(e) => e.stopPropagation()}>
              <div className="dt">⚠ Unsaved changes</div>
              <p className="mini">"{level?.name}" has changes that aren't saved. Continuing to {pendingLevelAction.label} will replace it.</p>
              <p className="mini">(You can still Undo right after, but Save first if you want to keep it for sure.)</p>
              <div className="tiles" style={{ marginTop: 12 }}>
                <button className="tile" onClick={() => setPendingLevelAction(null)}><span className="ti">✕</span><span className="tl">Cancel</span><span className="tb">Go back and save first</span></button>
                <button className="tile" onClick={() => { const run = pendingLevelAction.run; setPendingLevelAction(null); run(); }}><span className="ti">⚠</span><span className="tl">Continue anyway</span><span className="tb">Discard the unsaved changes</span></button>
              </div>
            </div>
          </div>
        )}

        {textureModals}

        {gen && (
          <div className="modal" onClick={() => setGen(null)}>
            <div className="dlg wide3" onClick={(e) => e.stopPropagation()}>
              <div className="dt">Generated run — {gen.length} levels stitched left → right</div>
              <div className="genrow">{gen.map((l, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <div className="genlink">🔗</div>}
                  <div className="gencol"><div className="genname">{l.name}</div>{miniLevel(l)}</div>
                </React.Fragment>
              ))}</div>
              <div className="row2"><button onClick={runGenerate}>🎲 Re-roll</button><button onClick={() => setGen(null)}>Close</button></div>
            </div>
          </div>
        )}
        {picker && (() => {
          const q = emojiQuery.trim().toLowerCase();
          const filtered = q ? emojis.filter((m) => (EMOJI_KEYWORDS[m] || "").includes(q)) : emojis;
          return (
            <div className="modal" onClick={closePicker}>
              <div className="dlg" onClick={(e) => e.stopPropagation()}>
                <div className="dt">Pick an emoji for this object <span className="emcount">{filtered.length}{q ? " match" + (filtered.length === 1 ? "" : "es") : ""}</span></div>
                <input className="emsearch" value={emojiQuery} onChange={(e) => setEmojiQuery(e.target.value)} placeholder="Search — e.g. explosion, fire, sword, tree…" autoFocus />
                {!q && recentEmoji.length > 0 && <><div className="emsublabel">Recent</div><div className="emgrid emgrid-recent">{recentEmoji.map((m, i) => <button key={"r" + i} onClick={() => pickEmoji(m)}>{m}</button>)}</div></>}
                {q && !filtered.length && <p className="mini">No matches for "{emojiQuery}".</p>}
                <div className="emgrid">{filtered.map((m, i) => <button key={i} onClick={() => pickEmoji(m)}>{m}</button>)}</div>
                <div className="row2"><button onClick={closePicker}>Close</button></div>
              </div>
            </div>
          );
        })()}
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  /* ---- editor ---------------------------------------------------------- */
  const showGuide = asset.type !== "body" && asset.type !== "enemy" && asset.type !== "projectile" && asset.type !== "prop" && asset.type !== "item";
  const guideBodyAsset = (asset.guideId && asset.guideId !== "default" && library.find((a) => a.id === asset.guideId)) || guideAsset;
  const slotLabel = asset.type === "equipment" ? (SLOTS[asset.slot]?.label || "Equipment") : (TYPES[asset.type]?.label || asset.type);
  // Bodies always have arm rig math; enemies only once they've opted into 💪 Has arms — an
  // armless enemy has no shoulder/hand concept, so showing those markers would just be a
  // stray 🎯 floating over unrelated art (DEFAULT_SHOULDER's fallback body-shaped position).
  const showArmRig = asset.type === "body";
  const bodyRigNow = (asset.type === "body" || asset.type === "enemy") ? bodyRig(asset, angle) : null;
  const hand = asset.type === "body" ? bodyRigNow.hand : (asset.type === "enemy" ? (bodyRigNow ? bodyRigNow.hand : DEFAULT_HAND[angle]) : handForGuide(asset)[angle]);
  const shoulder = bodyRigNow ? bodyRigNow.shoulder : null;
  const frontPieces = pieces.filter((p) => !p.behindBody);
  const behindPieces = pieces.filter((p) => p.behindBody);
  const lrow = (p) => (
    <div key={p.id} className={"lrow" + (p.id === selId ? " on" : "") + (groupIds.includes(p.id) ? " grp" : "") + (p._recovered ? " recovered" : "")} onClick={() => { if (!multiSelect) { setSelId(p.id); if (!groupIds.includes(p.id) && groupIds.length) setGroupIds([]); return; } if (groupIds.includes(p.id)) { const ng = groupIds.filter((id) => id !== p.id); setGroupIds(ng); if (selId === p.id) setSelId(ng[ng.length - 1] || null); } else { setGroupIds((g) => [...g, p.id]); setSelId(p.id); } }}>
      <span className="lprev" style={{ background: p.kind === "emoji" ? "transparent" : p.color }}>{p.kind === "emoji" ? p.char : (p.kind === "circle" ? "●" : p.kind === "roundrect" ? "▣" : p.kind === "tri" ? "▲" : "")}</span>
      <span className="lname">{p._recovered ? "🩹 " : ""}{p.locked ? "🔒 " : ""}{p.isHitbox ? "🎯 hitbox" : p.isMuzzle ? "🔴 muzzle" : (p.kind === "emoji" ? "emoji" : p.kind === "roundrect" ? "rounded square" : p.kind)}{p.mirror ? " ⟷" : ""}{p.limb === "arm" ? " 💪" : p.limb === "leg" ? " 🦵" : ""}</span>
      <button onClick={(e) => { e.stopPropagation(); movePiece(p.id, 1); }}>▲</button>
      <button onClick={(e) => { e.stopPropagation(); movePiece(p.id, -1); }}>▼</button>
    </div>
  );
  return (
    <div className={"bb" + (asset.type === "weapon" ? " weaponEditor" : "")} onPointerDownCapture={snapshot}><style>{css}</style>
      {asset._recoveredFrom && (
        <div className="recoverBanner">🩹 This body was auto-recovered from "{asset._recoveredFrom}" — it's a best-effort guess. Pieces marked 🩹 in the layer list might actually be fused-in clothing rather than original body parts; check each one and delete anything that doesn't belong.</div>
      )}
      <header className="bar">
        <button className="back" onClick={() => setScreen("menu")}>‹ Menu</button>
        <input className="nm" value={asset.name} onChange={(e) => setAsset({ ...asset, name: e.target.value })} />
        <span className="badge">{asset.type === "equipment" ? (SLOTS[asset.slot]?.icon || "📦") : (TYPES[asset.type]?.icon || "📦")} {slotLabel}</span>
        <button className="undo" disabled={!canUndo} onClick={undo}>↩ Undo</button>
        <button className="undo" disabled={!canRedo} onClick={redo}>↪ Redo</button>
        <button className="save" onClick={openSheet}>💾 Save & Open</button>
      </header>

      {asset.type === "prop" && (
        <div className="wstates">
          <span className="wslab">🎞 Frame:</span>
          {(asset.frames || [blankAngles()]).map((_, i) => (
            <button key={i} className={propFrame === i ? "on" : ""} onClick={() => switchPropFrame(i)}>{i + 1}</button>
          ))}
          <button className="wcopy" onClick={() => addPropFrame("duplicate")}>⧉ Duplicate</button>
          <button className="wcopy" onClick={() => addPropFrame("blank")}>＋ Blank frame</button>
          <button className="wcopy" onClick={() => movePropFrame(-1)} disabled={propFrame === 0}>◀ Move</button>
          <button className="wcopy" onClick={() => movePropFrame(1)} disabled={propFrame === (asset.frames || []).length - 1}>Move ▶</button>
          <button className="wcopy" onClick={deletePropFrame} disabled={(asset.frames || []).length <= 1}>🗑 Delete</button>
          <button className="wcopy" onClick={flipWholeProp}>⇋ Flip whole object</button>
        </div>
      )}
      <div className={asset.type === "weapon" ? "weaponSettings" : "editorSettings"}>
      {asset.type === "weapon" && (
        <div className="wstates">
          <span className="wslab">Weapon state:</span>
          {["rest", "fire"].map((st) => (
            <button key={st} className={wState === st ? "on" : ""} onClick={() => switchWState(st)}>{st === "rest" ? "🪨 Rest" : "💥 Fire"}</button>
          ))}
          <button className="wcopy" onClick={copyWState}>copy {wState} → {wState === "rest" ? "fire" : "rest"}</button>
        </div>
      )}
      {/* The On fire / Charge alternate-look tabs are GONE: the game never rendered either state
          anywhere — the burn/wind-up code tracks timers but always draws the Normal art. Ten whole
          pose grids of pure busywork. Old saves keep their states harmlessly; only Normal is used. */}
      {asset.type === "equipment" && effEdit && (() => {
        const eff = (asset.effects || []).find((e) => e.id === effEdit.effId);
        if (!eff) return null;
        const def = EFFECT_TYPES[eff.type];
        const bodies = library.filter((a) => a.type === "body");
        const frames = eff.animByBody[effEdit.bodyKey] || [];
        return (
          <div className="wstates">
            <span className="wslab">🎬 {def.label} animation — designing for:</span>
            <select value={effEdit.bodyKey} onChange={(e) => switchEffectBody(e.target.value)} >
              <option value="default">{eff.animByBody.default ? "✓ " : ""}Default body</option>
              {bodies.map((b) => <option key={b.id} value={b.id}>{(eff.animByBody[b.id] ? "✓ " : "") + b.name}</option>)}
            </select>
            {frames.map((_, i) => (
              <button key={i} className={effEdit.frameIdx === i ? "on" : ""} onClick={() => switchEffectFrame(i)}>Frame {i + 1}</button>
            ))}
            <button className="wcopy" onClick={() => addAnimFrame("duplicate")}>⧉ Duplicate</button>
            <button className="wcopy" onClick={() => addAnimFrame("blank")} >＋ Blank frame</button>
            <button className="wcopy" onClick={() => moveAnimFrame(-1)} disabled={effEdit.frameIdx === 0}>◀ Move</button>
            <button className="wcopy" onClick={() => moveAnimFrame(1)} disabled={effEdit.frameIdx === frames.length - 1}>Move ▶</button>
            <button className="wcopy" onClick={deleteAnimFrame} disabled={frames.length <= 1}>🗑 Delete frame</button>
            <button className="save" onClick={closeEffectAnim}>✕ Done — back to {SLOTS[asset.slot]?.label || "item"} art</button>
          </div>
        );
      })()}
      {asset.type === "weapon" && (
        <div className="wstates">
          <span className="wslab">Type:</span>
          <button className={(asset.wtype || "melee") === "melee" ? "on" : ""} onClick={() => setAsset((a) => ({ ...a, wtype: "melee" }))}>🗡️ Melee</button>
          <button className={isRanged(asset.wtype) ? "on" : ""} onClick={() => setAsset((a) => ({ ...a, wtype: "ranged" }))}>🏹 Ranged</button>
          <button className={isThrowable(asset.wtype) ? "on" : ""} onClick={() => setAsset((a) => ({ ...a, wtype: "throw" }))}>💣 Throwable</button>
        </div>
      )}
      {asset.type === "weapon" && (
        <div className="wstates">
          <span className="wslab">Damage:</span>
          <input className="dmgInput" type="number" min="0" value={asset.damage ?? 5} onChange={(e) => setAsset((a) => ({ ...a, damage: Math.max(0, +e.target.value || 0) }))} style={{ width: 60 }} />
        </div>
      )}
      {asset.type === "weapon" && (asset.wtype || "melee") === "melee" && (
        <div className="wstates">
          {abilityCard()}
        </div>
      )}
      {asset.type === "weapon" && (asset.wtype || "melee") === "melee" && !ANGLES.some((ang) => {
        const restArr = wState === "rest" ? (asset.angles?.[ang] || []) : (asset.states?.rest?.[ang] || []);
        const fireArr = wState === "fire" ? (asset.angles?.[ang] || []) : (asset.states?.fire?.[ang] || []);
        return restArr.concat(fireArr).some((p) => p.isHitbox);
      }) && (
        <p className="tip warn">⚠ No 🎯 Hitbox placed yet.</p>
      )}
      {asset.type === "weapon" && isThrowable(asset.wtype) && (
        <div className="wstates projectilecard">
          <span className="wslab">💣 Throwable:</span>
          <label className="slider">Weight<input type="range" min="1" max="10" step="1" value={asset.weight ?? DEFAULT_THROW_WEIGHT} onChange={(e) => setAsset((a) => ({ ...a, weight: +e.target.value }))} /><span className="hint2">{asset.weight ?? DEFAULT_THROW_WEIGHT}/10 · {(asset.weight ?? DEFAULT_THROW_WEIGHT) <= 3 ? "light, flies far" : (asset.weight ?? DEFAULT_THROW_WEIGHT) >= 7 ? "heavy, drops short" : "medium"}</span></label>
          <span className="wslab">Fire look:</span>
          {(() => {
            const props = allAssets.filter((pa) => pa.type === "prop");
            return props.length ? (
              <select className="projSel" value={asset.landPropId || ""} onChange={(e) => setAsset((a) => ({ ...a, landPropId: e.target.value || null }))}>
                <option value="">🔥 Fire emoji (default)</option>
                {props.map((pa) => <option key={pa.id} value={pa.id}>🌿 {pa.name}{(pa.frames && pa.frames.length > 1) ? " (animated)" : ""}</option>)}
              </select>
            ) : <span className="hint2">🔥 emoji</span>;
          })()}
          <label className="slider">Damage<input type="range" min="1" max="30" step="1" value={asset.landEffectDps ?? 6} onChange={(e) => setAsset((a) => ({ ...a, landEffectDps: +e.target.value }))} /><span className="hint2">{asset.landEffectDps ?? 6} HP/sec</span></label>
          <label className="slider">Burns for<input type="range" min="1" max="20" step="1" value={asset.landEffectLife ?? 6} onChange={(e) => setAsset((a) => ({ ...a, landEffectLife: +e.target.value }))} /><span className="hint2">{asset.landEffectLife ?? 6}s</span></label>
          <label className="slider">Splash<input type="range" min="0" max="3" step="1" value={asset.landRadius ?? DEFAULT_LAND_RADIUS} onChange={(e) => setAsset((a) => ({ ...a, landRadius: +e.target.value }))} /><span className="hint2">{(asset.landRadius ?? DEFAULT_LAND_RADIUS) === 0 ? "1 cell" : (2 * (asset.landRadius ?? DEFAULT_LAND_RADIUS) + 1) + "×" + (2 * (asset.landRadius ?? DEFAULT_LAND_RADIUS) + 1) + " cells"}</span></label>
          <span className="wslab">💥 Cluster:</span>
          <label className="slider">Bomblets<input type="range" min="0" max="8" step="1" value={asset.clusterCount ?? 0} onChange={(e) => setAsset((a) => ({ ...a, clusterCount: +e.target.value }))} /><span className="hint2">{(asset.clusterCount ?? 0) === 0 ? "off" : (asset.clusterCount ?? 0) + " copies"}</span></label>
          {(asset.clusterCount ?? 0) > 0 && (<>
            <label className="slider">Bomblet size<input type="range" min="0.2" max="0.8" step="0.05" value={asset.clusterScale ?? DEFAULT_CLUSTER_SCALE} onChange={(e) => setAsset((a) => ({ ...a, clusterScale: +e.target.value }))} /><span className="hint2">{Math.round((asset.clusterScale ?? DEFAULT_CLUSTER_SCALE) * 100)}% of full size</span></label>
          </>)}
          <span className="wslab">💫 Stun:</span>
          <label className="slider">Freeze<input type="range" min="0" max="5" step="0.25" value={asset.stun ?? 0} onChange={(e) => setAsset((a) => ({ ...a, stun: +e.target.value }))} /><span className="hint2">{(asset.stun ?? 0) === 0 ? "off" : (asset.stun ?? 0) + "s 💫"}</span></label>
          {/* Kept short: the splash+1 reach and the ally exemption are rules you cannot see. */}
        </div>
      )}
      {asset.type === "weapon" && isThrowable(asset.wtype) && !(wState === "rest" ? (asset.angles?.side || []) : (asset.states?.rest?.side || [])).some((p) => !p.isHitbox && !p.isMuzzle) && (
        <p className="tip warn">⚠ Nothing drawn on the <b>Side</b> pose yet, under <b>Rest</b> (Fire is never shown for a thrown item). It'll fall back to a plain 💣 emoji until Rest → Side has art on it.</p>
      )}
      {asset.type === "weapon" && isRanged(asset.wtype) && (() => {
        const hasLegacy = !!asset.projectile || (asset.states && !anglesEmpty(asset.states.projectile));
        return (
          <div className="wstates projectilecard">
            <span className="wslab">Projectile:</span>
            <select className="projSel" value={asset.projectileId || ""} onChange={(e) => setAsset((a) => ({ ...a, projectileId: e.target.value || null }))}>
              <option value="">— none picked —</option>
              {allAssets.filter((a) => a.type === "projectile").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <label className="slider">Speed<input type="range" min="4" max="30" value={asset.projectileSpeed ?? 12} onChange={(e) => setAsset((a) => ({ ...a, projectileSpeed: +e.target.value }))} /></label>
            <label className="slider">Range<input type="number" min="1" value={asset.projectileRange ?? DEFAULT_PROJECTILE_RANGE} onChange={(e) => setAsset((a) => ({ ...a, projectileRange: Math.max(1, +e.target.value || 1) }))} style={{ width: 60 }} /><span className="hint2">blocks</span></label>
            <label className="slider">Fire rate<input type="range" min="0.5" max="15" step="0.5" value={asset.fireRate ?? DEFAULT_FIRE_RATE} onChange={(e) => setAsset((a) => ({ ...a, fireRate: +e.target.value }))} /><span className="hint2">{asset.fireRate ?? DEFAULT_FIRE_RATE}/sec</span></label>
            <label className="slider">Clip size<input type="number" min="0" value={asset.clipSize ?? DEFAULT_CLIP_SIZE} onChange={(e) => setAsset((a) => ({ ...a, clipSize: Math.max(0, +e.target.value || 0) }))} style={{ width: 60 }} /><span className="hint2">0 = unlimited</span></label>
            <label className="slider">Reload<input type="range" min="0.2" max="5" step="0.1" value={asset.reloadTime ?? DEFAULT_RELOAD_TIME} onChange={(e) => setAsset((a) => ({ ...a, reloadTime: +e.target.value }))} /><span className="hint2">{asset.reloadTime ?? DEFAULT_RELOAD_TIME}s</span></label>
            {abilityCard()}
            <button className="ltbtn" onClick={addMuzzle}><b>🔴</b> Add muzzle (shot spawn point)</button>
            {!ANGLES.some((ang) => ((wState === "rest" ? asset.angles?.[ang] : asset.states?.rest?.[ang]) || []).some((p) => p.isMuzzle)) && (
              <p className="tip warn">⚠ No 🔴 muzzle on the Rest pose.</p>
            )}
            {!asset.projectileId && (
              <p className="tip warn">⚠ {hasLegacy ? "No Projectile asset assigned yet — still using this weapon's old embedded projectile as a fallback." : "No Projectile picked — this won't fire anything visible in Playtest yet."} Build one from the menu (Weapon → Projectile), or pick a saved one above.{hasLegacy ? " " : ""}</p>
            )}
            {!asset.projectileId && hasLegacy && <button className="ltbtn" onClick={convertLegacyProjectile}>📦 Turn the old embedded projectile into its own saved Projectile asset</button>}
          </div>
        );
      })()}
      </div>

      {!effEdit && asset.type !== "prop" && (
      <div className="angles">
        {/* Only offer poses gameplay can actually render for this asset type — the audit:
            player renders side (walk), back (climb/doors), up (ranged aim-up), crouch; NEVER front.
            Enemies render side + crouch (others only as fallback art). Melee weapons can never
            appear in Up (aiming is ranged-only). Projectiles read ONLY the Front pose. Editing
            surfaces for poses that can never appear were pure wasted work. */}
        {editablePoses(asset.type, asset.wtype).map((a) => {
          const hasLimbs = (asset.type === "body" || asset.type === "enemy") && (asset.angles[a] || []).some((p) => p.limb === "leg" || (p.limb === "arm" && p.role !== "weaponArm"));
          return <button key={a} className={angle === a ? "on" : ""} onClick={() => { setAngle(a); setSelId(null); if (poseCopySrc === a) setPoseCopySrc(null); closeCopyTo(); }} title={hasLimbs ? "Has an arm/leg flagged for animation" : ""}>{ALABEL[a]}{hasLimbs ? " 🦴" : ""}</button>;
        })}
        {(asset.type === "body" || asset.type === "enemy") ? (
          <span className="posecopy">
            <select value={poseCopySrc || ""} onChange={(e) => setPoseCopySrc(e.target.value || null)} >
              <option value="">📋 Copy pose…</option>
              {editablePoses(asset.type, asset.wtype).filter((a) => a !== angle).map((a) => <option key={a} value={a}>{ALABEL[a]}</option>)}
            </select>
            {poseCopySrc && <button className="copyang" onClick={() => setPoseCopySrc(null)}>✕ remove copy</button>}
            {/* Creatures get BOTH: the reference overlay above (trace/pull piece-by-piece) and this
                one-click full copy of the whole current pose into all the others at once. */}
            {asset.type === "enemy" && copyToPosesMenu}
          </span>
        ) : (
          copyToPosesMenu
        )}
        {showGuide && <span className="refpick">🧍 {asset.variants ? "Design for body:" : "Load body:"}
          <select value={asset.guideId} onChange={(e) => switchGuideFit(e.target.value)}>
            <option value="default">Default body</option>
            {library.filter((a) => a.type === "body").map((a) => <option key={a.id} value={a.id}>{(asset.variants && asset.variants[a.id] ? "✓ " : "") + a.name}</option>)}
          </select>
          {asset.variants && <button className="ltbtn" onClick={copyFitToOtherBodies}>📋 Copy to other characters</button>}
        </span>}
      </div>
      )}

      <div className="main">
        <div className="stage">
          {asset.type === "body" && (() => {
            const flagged = ANGLES.filter((a) => (asset.angles[a] || []).some((p) => p.limb === "leg" || (p.limb === "arm" && p.role !== "weaponArm")));
            const missing = ["side", "back"].filter((a) => flagged.length > 0 && !flagged.includes(a));
            if (!missing.length) return null;
            return <p className="tip warn">⚠ {missing.map((m) => ALABEL[m]).join(" and ")} {missing.length > 1 ? "have" : "has"} no arm/leg flagged.</p>;
          })()}
          {asset.type === "enemy" && (() => {
            const cur = asset.states?.normal || asset.angles || {};
            if ((cur.side || []).length > 0) return null;
            return <p className="tip warn">⚠ Side has no art yet.</p>;
          })()}
          <div className="zoomctl">
            <button onClick={() => setArtZoom((z) => clampArtZoom(z, -0.15))} disabled={artZoom <= ARTZOOM_MIN}>−</button>
            <button onClick={() => setArtZoom((z) => clampArtZoom(z, 0.15))} disabled={artZoom >= ARTZOOM_MAX}>+</button>
          </div>
          <div className="artrow">
          <div className={"art" + (asset.type === "weapon" ? " artWpn" : asset.type === "projectile" ? " artProj" : "") + (drawMode ? " drawing" : "")} onPointerDown={handleArtClick}>
          <div ref={artRef} className="artDesign" style={(() => { const d = artZoom * 100; const o = (100 - d) / 2; return { left: o + "%", top: o + "%", width: d + "%", height: d + "%" }; })()}>
            <div className="mline" />
            {(() => {
              const isLowerSlot = asset.type === "equipment" && LOWER_BODY_SLOTS.has(asset.slot);
              const isUpperSlot = asset.type === "equipment" && UPPER_BODY_SLOTS.has(asset.slot);
              const renderPiece = (p) => pmirror(p, angle) ? [Block(p), MirrorGhost(p, "m" + p.id)] : [Block(p)];
              if (showGuide && (isLowerSlot || isUpperSlot)) {
                // Split relative to the guide body's arm, matching how this piece will actually
                // layer once worn (Dress Bob / in-game) — not just "always on top of everything".
                const guidePieces = bake(guideBodyAsset, angle);
                const isArmG = (gp) => gp.role === "weaponArm" || gp.limb === "arm";
                const guideNonArm = guidePieces.filter((gp) => !isArmG(gp));
                const guideArm = guidePieces.filter(isArmG);
                const belowArm = frontPieces.filter((p) => isLowerSlot || !p.overArms);
                const aboveArm = frontPieces.filter((p) => isUpperSlot && p.overArms);
                return <>
                  {behindPieces.flatMap(renderPiece)}
                  {guideNonArm.map((p, i) => Static(p, null, true, !!p._m, "gna" + i))}
                  {belowArm.flatMap(renderPiece)}
                  {guideArm.map((p, i) => Static(p, null, true, !!p._m, "ga" + i))}
                  {aboveArm.flatMap(renderPiece)}
                </>;
              }
              return <>
                {behindPieces.flatMap(renderPiece)}
                {showGuide && bake(guideBodyAsset, angle).map((p, i) => Static(p, null, true, !!p._m, "g" + i))}
                {frontPieces.flatMap(renderPiece)}
              </>;
            })()}
            {sel && (() => {
              const rot = (sel.rot || 0) * Math.PI / 180;
              const cx = sel.x + sel.w / 2, cy = sel.y + sel.h / 2;
              const dx0 = sel.w / 2, dy0 = sel.h / 2;
              const hx = cx + dx0 * Math.cos(rot) - dy0 * Math.sin(rot);
              const hy = cy + dx0 * Math.sin(rot) + dy0 * Math.cos(rot);
              return <div onPointerDown={(e) => grabCorner(e, sel)} style={{ position: "absolute", left: `calc(${hx / W * 100}% - 9px)`, top: `calc(${hy / H * 100}% - 9px)`, width: "18px", height: "18px", background: "#4f7cf6", border: "2px solid #fff", borderRadius: "50%", cursor: "nwse-resize", boxSizing: "border-box", touchAction: "none" }} />;
            })()}
            {drawMode === "fill" && fillPts.length > 0 && (
              <svg className="drawpreview" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                <polyline points={fillPts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#4f7cf6" strokeWidth="1.5" />
                {fillPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#4f7cf6" stroke="#fff" strokeWidth="1" />)}
              </svg>
            )}
            {/* The edge the drag is currently welded to. Without it a block appears to jump and
                resize for no reason — this says exactly which edge it grabbed onto. */}
            {snapMark && (
              <svg className="drawpreview snapmark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                <line x1={snapMark.a.x} y1={snapMark.a.y} x2={snapMark.b.x} y2={snapMark.b.y} />
              </svg>
            )}
            {drawMode === "line" && linePt1 && (
              <svg className="drawpreview" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                <circle cx={linePt1.x} cy={linePt1.y} r="3.5" fill="#4f7cf6" stroke="#fff" strokeWidth="1" />
              </svg>
            )}
            {showArmRig && shoulder && (
              <svg className="armaxis" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                <line x1={shoulder.x} y1={shoulder.y} x2={hand.x} y2={hand.y} />
              </svg>
            )}
            {showArmRig && shoulder &&
              <div className="shouldermk" style={{ left: (shoulder.x / W * 100) + "%", top: (shoulder.y / H * 100) + "%" }}>🎯</div>}
            {asset.type === "skin"
              ? <div onPointerDown={grabHand} className="handmk" style={{ left: (hand.x / W * 100) + "%", top: (hand.y / H * 100) + "%", cursor: "grab" }}>✋</div>
              : (asset.type !== "enemy" || showArmRig) && <div className="handmk guide" style={{ left: (hand.x / W * 100) + "%", top: (hand.y / H * 100) + "%" }}>✋</div>}
          </div>
          </div>
          {(asset.type === "body" || asset.type === "enemy") && poseCopySrc && (
            <div className="pcp-wrap">
              <div className="pcp-head">📋 Copy of <b>{ALABEL[poseCopySrc]}</b> — click a piece to pull it into {ALABEL[angle]}<button className="pcp-x" onClick={() => setPoseCopySrc(null)}>✕</button></div>
              <div className="pcp-art">
                {bake(asset, poseCopySrc).filter((p) => p.role !== "weaponArm").map((p, i) => (
                  <div key={p.id || i} className="pcp-piece" style={shapeStyle(p, null, false, !!p._m)} onClick={() => pullPoseCopyPiece(p)} >
                    <div style={shapeFillStyle(p)}>{p.kind === "emoji" ? emojiInner(p) : null}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>

        <aside className="side">
          {(asset.type === "skin" || asset.type === "enemy") && (
            <div className="card">
              <div className="ct">📊 Stats</div>
              {asset.type === "enemy" && <label className="slider">HP<input type="number" min="1" value={asset.hp ?? 10} onChange={(e) => setAsset((a) => ({ ...a, hp: Math.max(1, +e.target.value || 1) }))} style={{ width: 60 }} /></label>}
              {asset.type === "enemy" && <label className="slider">Size<input type="range" min="0.5" max="4" step="0.1" value={asset.scale ?? 1} onChange={(e) => setAsset((a) => ({ ...a, scale: +e.target.value }))} /><span className="hint2" style={{ marginLeft: 6 }}>{(asset.scale ?? 1).toFixed(1)}×</span></label>}
              {asset.type === "enemy" && <label className="chk"><input type="checkbox" checked={!!asset.faceRight} onChange={(e) => setAsset((a) => ({ ...a, faceRight: e.target.checked }))} /> ⟷ Art faces right</label>}
              {asset.type === "enemy" && (
                <label className="slider">🧭 AI behavior
                  <select value={asset.ai || "guard"} onChange={(e) => setAsset((a) => ({ ...a, ai: e.target.value }))} style={{ marginLeft: 6 }}>
                    <option value="guard">Guard — holds its spawn point</option>
                    <option value="seek">Seek — chases the player when nearby</option>
                    <option value="avoid">Avoid — keeps its distance from the player</option>
                  </select>
                </label>
              )}
              {asset.type === "enemy" && <label className="chk"><input type="checkbox" checked={asset.hostile === false} onChange={(e) => setAsset((a) => ({ ...a, hostile: !e.target.checked }))} /> 🕊️ Not hostile</label>}
              {asset.type === "enemy" && <label className="slider">⚔️ Attack range<input type="number" min="1" value={Math.round((asset.attackRange ?? DEFAULT_ATTACK_RANGE) / LV_CELL)} onChange={(e) => setAsset((a) => ({ ...a, attackRange: Math.max(1, +e.target.value || 1) * LV_CELL }))} style={{ width: 60 }} /><span className="hint2" style={{ marginLeft: 6 }}>cells</span></label>}
              {/* Two per row: five stacked full-width sliders pushed everything below them off
                  the panel, and each one only needs half the width it was taking. */}
              <div className="statgrid">
              {(asset.type === "skin" ? ["hp", "speed", "agility", "intelligence", "strength"] : ["speed", "agility", "intelligence", "strength"]).map((s) => (
                <label className="slider" key={s}>
                  {s === "hp" ? "❤️ HP" : s === "speed" ? "🏃 Speed" : s === "agility" ? "🤸 Agility" : s === "intelligence" ? "🧠 Int" : "💪 Str"}
                  <input type="range" min="1" max="10" value={asset.stats?.[s] ?? 5} onChange={(e) => setAsset((a) => ({ ...a, stats: { ...(a.stats || DEFAULT_STATS()), [s]: +e.target.value } }))} />
                  <span className="hint2">{asset.stats?.[s] ?? 5}</span>
                </label>
              ))}
              </div>
            </div>
          )}
          {asset.type === "equipment" && !effEdit && (
            <div className="card">
              <div className="ct">📊 Stat Boosts</div>
              <div className="statgrid">
              {["hp", "speed", "agility", "intelligence", "strength"].map((s) => (
                <label className="slider" key={s}>
                  {s === "hp" ? "❤️ HP" : s === "speed" ? "🏃 Speed" : s === "agility" ? "🤸 Agility" : s === "intelligence" ? "🧠 Int" : "💪 Str"}
                  <input type="range" min="-5" max="5" value={asset.statBoosts?.[s] ?? 0} onChange={(e) => setAsset((a) => ({ ...a, statBoosts: { ...(a.statBoosts || DEFAULT_STAT_BOOSTS()), [s]: +e.target.value } }))} />
                  <span className="hint2">{(asset.statBoosts?.[s] ?? 0) > 0 ? "+" : ""}{asset.statBoosts?.[s] ?? 0}</span>
                </label>
              ))}
              </div>
            </div>
          )}
          {asset.type === "equipment" && !effEdit && (
            <div className="card">
              <div className="ct">🛡️ Defense</div>
              <label className="slider">Defense
                <input type="number" value={asset.defense ?? 0} onChange={(e) => setAsset((a) => ({ ...a, defense: +e.target.value || 0 }))} style={{ width: 60 }} />
              </label>
            </div>
          )}
          {asset.type === "equipment" && !effEdit && asset.slot === "hat" && (
            <div className="card">
              <div className="ct">🚫 Ignore "Hide if hat"</div>
              <label className="chk"><input type="checkbox" checked={!!asset.ignoreHideIfHat} onChange={(e) => setAsset((a) => ({ ...a, ignoreHideIfHat: e.target.checked }))} /> This hat doesn't hide "Hide if hat" pieces</label>
            </div>
          )}
          {asset.type === "equipment" && !effEdit && (
            <div className="card">
              <div className="ct">✨ Effects</div>
              {(asset.effects || []).length === 0 && <p className="mini">No effects on this item yet.</p>}
              {(asset.effects || []).map((eff) => {
                const def = EFFECT_TYPES[eff.type];
                const bodyCount = Object.keys(eff.animByBody || {}).filter((k) => k !== "default" && (eff.animByBody[k] || []).length).length;
                return (
                  <div key={eff.id} className="outlinefx" style={{ marginBottom: 10 }}>
                    <div className="ct2">{def.icon} {def.label}</div>
                    {def.tagParam && (
                      <label className="slider">
                        Tag to boost
                        <input type="text" value={eff.tag || ""} placeholder="e.g. bow" onChange={(e) => updateEffectParam(eff.id, "tag", e.target.value)} style={{ marginLeft: 6 }} />
                      </label>
                    )}
                    {def.params.map((p) => {
                      const val = eff[p.key] ?? p.def;
                      // Params that live in 0..1 (Back Guard block %, Glide fall/control) read as
                      // percentages; whole-number params (Double Jump height/speed) read as-is.
                      const pct = p.max <= 1;
                      return (
                        <label className="slider" key={p.key}>
                          {p.label}
                          <input type="range" min={p.min} max={p.max} step={p.step} value={val} onChange={(e) => updateEffectParam(eff.id, p.key, +e.target.value)} />
                          <span className="hint2" style={{ marginLeft: 6 }}>{pct ? Math.round(val * 100) + "%" : val}</span>
                        </label>
                      );
                    })}
                    <p className="mini">{!def.noAnim && (bodyCount ? " Animated for " + bodyCount + " " + (bodyCount === 1 ? "body" : "bodies") + " so far." : " No custom animation designed yet — plays this item's normal look.")}</p>
                    <div className="btns">
                      {!def.noAnim && <button onClick={() => openEffectAnim(eff.id)}>🎬 Design animation</button>}
                      <button className="danger" onClick={() => removeEffect(eff.id)}>Remove effect</button>
                    </div>
                  </div>
                );
              })}
              {/* The catalog of effects NOT yet on this item, behind a ＋/－ toggle. Collapsed by
                  default (see fxPickerOpen) so the card stays short as the catalog grows; picking
                  one closes it again, putting the effect you just added straight back in view. */}
              {(() => {
                const addable = Object.keys(EFFECT_TYPES).filter((t) => !(asset.effects || []).some((e) => e.type === t));
                if (!addable.length) return <p className="mini">Every effect is already on this item.</p>;
                return (
                  <>
                    <button className="ltbtn" onClick={() => setFxPickerOpen((v) => !v)}>
                      {fxPickerOpen ? "－" : "＋"} Add an effect ({addable.length} available)
                    </button>
                    {fxPickerOpen && addable.map((t) => (
                      <button key={t} className="ltbtn" onClick={() => { addEffect(t); setFxPickerOpen(false); }}>＋ Add {EFFECT_TYPES[t].icon} {EFFECT_TYPES[t].label}</button>
                    ))}
                  </>
                );
              })()}
            </div>
          )}
          {asset.type === "enemy" && (
            <div className="card">
              <div className="ct">⚔️ Weapon</div>
              <select className="big" value={asset.weaponId || ""} onChange={(e) => {
                const id = e.target.value || null;
                const w = id ? allAssets.find((a) => a.id === id) : null;
                setAsset((a) => {
                  const next = { ...a, weaponId: id };
                  // Switching to a bow/gun while the range is still the melee default would leave
                  // the archer insisting on walking into your face — bump it to the ranged default
                  // once, and only from the untouched melee default, so a hand-set range is kept.
                  if (w && isRanged(w.wtype) && (a.attackRange ?? DEFAULT_ATTACK_RANGE) <= DEFAULT_ATTACK_RANGE) next.attackRange = DEFAULT_RANGED_ATTACK_RANGE;
                  return next;
                });
              }}>
                <option value="">✋ Unarmed (bare fists)</option>
                {allAssets.filter((a) => a.type === "weapon" && !isThrowable(a.wtype)).map((a) => <option key={a.id} value={a.id}>{a.name} ({isRanged(a.wtype) ? "🏹" : "🗡️"})</option>)}
              </select>
              {asset.weaponId && !ANGLES.some((ang) => (asset.angles[ang] || []).some((p) => p.role === "weaponArm" || p.limb === "arm")) && <p className="tip warn">⚠ No piece is flagged 💪 Arm.</p>}
            </div>
          )}
          {asset.type === "item" && !effEdit && (() => {
            const eff = normItemEffect(asset.effect);
            const setEff = (patch) => setAsset((a) => ({ ...a, effect: normItemEffect({ ...normItemEffect(a.effect), ...patch }) }));
            return (
              <div className="card">
                <div className="ct">🧪 Item effect</div>
                <div className="seg">
                  <button className={eff.kind === "heal" ? "on" : ""} onClick={() => setAsset((a) => { const cur = normItemEffect(a.effect); return { ...a, effect: cur.kind === "heal" ? cur : { kind: "heal", amount: 5 } }; })}>❤️ Heal</button>
                  <button className={eff.kind === "stat" ? "on" : ""} onClick={() => setAsset((a) => { const cur = normItemEffect(a.effect); return { ...a, effect: cur.kind === "stat" ? cur : { kind: "stat", stat: "speed", amount: 2, duration: 8 } }; })}>📊 Boost a stat</button>
                </div>
                {eff.kind === "heal" ? (
                  <label className="slider">❤️ Heal amount<input type="number" min="1" value={eff.amount} onChange={(e) => setEff({ amount: Math.max(1, +e.target.value || 1) })} style={{ width: 60 }} /><span className="hint2" style={{ marginLeft: 6 }}>HP</span></label>
                ) : (
                  <>
                    <label className="slider">📊 Stat
                      <select value={eff.stat} onChange={(e) => setEff({ stat: e.target.value })} style={{ marginLeft: 6 }}>
                        {ITEM_STAT_KEYS.map((s) => <option key={s} value={s}>{ITEM_STAT_LABEL[s]}</option>)}
                      </select>
                    </label>
                    <label className="slider">➕ Amount<input type="number" min="1" value={eff.amount} onChange={(e) => setEff({ amount: Math.max(1, +e.target.value || 1) })} style={{ width: 60 }} /></label>
                    <label className="slider">⏱ Duration<input type="number" min="1" value={eff.duration} onChange={(e) => setEff({ duration: Math.max(1, +e.target.value || 1) })} style={{ width: 60 }} /><span className="hint2" style={{ marginLeft: 6 }}>sec</span></label>
                  </>
                )}
              </div>
            );
          })()}
          {HAS_CATEGORIES(asset) && !effEdit && (
            <div className="card">
              <div className="ct">🏷️ Item categories</div>
              {[0, 1, 2].map((i) => (
                <input key={i} className="catItemInput" value={(asset.categories || [])[i] || ""} onChange={(e) => setAsset((a) => { const cats = [...(a.categories || ["", "", ""])]; cats[i] = e.target.value; return { ...a, categories: cats }; })} placeholder={"Category " + (i + 1) + (i === 0 ? " — e.g. T1" : i === 1 ? " — e.g. Shirt" : " — e.g. Strong")} maxLength={24} />
              ))}
            </div>
          )}
          {asset.type === "skin" && !effEdit && (() => {
            const pal = collectAssetColors(asset);
            return (
              <div className="card">
                <div className="ct">🎨 Skin palette</div>
                <label className="palchip" title="The flesh colour of whichever body wears this skin">
                  <span className="palsw" style={{ background: asset.tone || "#e2b48c" }} />
                  <span className="palmeta"><span className="palhex">Skin tone</span><span className="palcount">{asset.tone ? asset.tone : "body default"}</span></span>
                  <input type="color" value={asset.tone || "#e2b48c"} onChange={(e) => setAsset((a) => ({ ...a, tone: e.target.value }))} onBlur={(e) => addRecent(e.target.value)} />
                </label>
                {pal.length === 0 ? <p className="mini">Draw something and its colours show up here.</p> : (
                  <div className="palette">
                    {pal.map(({ color, count }) => (
                      <label key={color} className="palchip" title={color + " · " + count + " block" + (count === 1 ? "" : "s") + " · tap to recolour everywhere"}>
                        <span className="palsw" style={{ background: color }} />
                        <span className="palmeta"><span className="palhex">{color}</span><span className="palcount">{count}×</span></span>
                        <input type="color" value={color} onChange={(e) => remapPalette(color, e.target.value)} onBlur={(e) => { addRecent(e.target.value); delete palGroup.current[color]; }} />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          {sel ? (
            <div className="card sel">
              <div className="ct">{sel.kind === "emoji" ? "This emoji" : "This block"} — color</div>
              {sel.kind === "emoji" ? <>
                <div className="swatches">
                  <button className={!sel.tint ? "orig on" : "orig"} onClick={() => updSel({ tint: null })} title="keep the emoji's own colors">🌈</button>
                  {palettePicker(palKey, setPalKey)}
                  {pal.map((c) => <button key={c} className={sel.tint === c ? "on" : ""} style={{ background: c }} onClick={() => updSel({ tint: c })} />)}
                  {recent.filter((c) => !pal.includes(c)).map((c) => <button key={"r" + c} className={"rc" + (sel.tint === c ? " on" : "")} style={{ background: c }} onClick={() => updSel({ tint: c })} title="recent" />)}
                  <label className="pick"><input type="color" value={sel.tint || "#ffffff"} onChange={(e) => updSel({ tint: e.target.value })} onBlur={(e) => addRecent(e.target.value)} />＋</label>
                </div>
                
                <button className="wide" onClick={() => setPicker({ mode: "change" })}>Change emoji ({sel.char})</button>
              </> : <>
                <div className="swatches">{palettePicker(palKey, setPalKey)}{pal.map((c) => <button key={c} className={sel.color === c ? "on" : ""} style={{ background: c }} onClick={() => applyPieceColor(c)} />)}{recent.filter((c) => !pal.includes(c)).map((c) => <button key={"r" + c} className={"rc" + (sel.color === c ? " on" : "")} style={{ background: c }} onClick={() => applyPieceColor(c)} title="recent" />)}<label className="pick"><input type="color" value={sel.color} onChange={(e) => applyPieceColor(e.target.value)} onBlur={(e) => addRecent(e.target.value)} />＋</label></div>
                {!effEdit && <label className="chk"><input type="checkbox" checked={recolorAll} onChange={(e) => setRecolorAll(e.target.checked)} /> 🪣 Change this color everywhere </label>}
                {/* PATTERN — the same texture library the Level Creator paints walls with, applied
                    to this block instead. Flannel is the one built for cloth, but any of them work;
                    the flat colour above stays underneath as the base, so a deleted texture leaves
                    the block looking exactly as it did before it was patterned. */}
                <div className="piecetex">
                  <button className={"ltbtn" + (sel.tex ? " on" : "")} onClick={() => { setTexTarget("piece"); setTexPick(true); }}>
                    {(() => { const t = resolveTexture(texLib, sel.tex); return t ? <><span className="texchip" style={cellPaintStyle({ c: textureBaseColor(t), tex: t.id }, 0, 0, texLib)} /> {t.name}</> : <>🧵 Pattern</>; })()}
                  </button>
                  {sel.tex && <button className="ltbtn" onClick={() => updSel({ tex: null })}>✕ Plain</button>}
                </div>
              </>}
              <button className="ltbtn" onClick={() => updSel(sel.kind === "emoji" ? { tint: newColor, fx: { ...newFx } } : { color: newColor, fx: { ...newFx } })} >🎨 Apply picked color + fx</button>
              <label className="chk outlinechk"><input type="checkbox" checked={!!sel.outline} onChange={(e) => updSel({ outline: e.target.checked, outlineFx: sel.outlineFx || defaultFx() })} /> 🖍 Outline </label>
              {sel.outline && <label className="pick" style={{ marginBottom: 8 }}>Outline color<input type="color" value={sel.outlineColor || "#000000"} onChange={(e) => updSel({ outlineColor: e.target.value })} /></label>}
              {sel.outline && (
                <div className="outlinefx">
                  <div className="ct2">Outline effects ✨</div>
                  <label className="slider">Fade<input type="range" min="0.1" max="1" step="0.05" value={sel.outlineFx?.opacity ?? 1} onChange={(e) => updSel({ outlineFx: { ...(sel.outlineFx || defaultFx()), opacity: +e.target.value } })} /></label>
                  <label className="slider">Glow<input type="range" min="0" max="12" step="0.5" value={sel.outlineFx?.glow ?? 0} onChange={(e) => updSel({ outlineFx: { ...(sel.outlineFx || defaultFx()), glow: +e.target.value } })} /><input type="color" className="gc" value={sel.outlineFx?.glowColor ?? "#ffd76b"} onChange={(e) => updSel({ outlineFx: { ...(sel.outlineFx || defaultFx()), glowColor: e.target.value } })} /></label>
                  <label className="slider">Brightness<input type="range" min="0.3" max="2" step="0.05" value={sel.outlineFx?.bright ?? 1} onChange={(e) => updSel({ outlineFx: { ...(sel.outlineFx || defaultFx()), bright: +e.target.value } })} /></label>
                </div>
              )}
              {sel.kind === "text" && (
                <div className="textedit">
                  <label className="pick" style={{ marginBottom: 8 }}>Text<input type="text" value={sel.text || ""} onChange={(e) => updSel({ text: e.target.value })} placeholder="Type here…" maxLength={40} /></label>
                  <label className="pick" style={{ marginBottom: 8 }}>Font
                    <select value={sel.font || TEXT_FONTS[0][0]} onChange={(e) => updSel({ font: e.target.value })}>
                      {TEXT_FONTS.map(([css, label]) => <option key={css} value={css} style={{ fontFamily: css }}>{label}</option>)}
                    </select>
                  </label>
                </div>
              )}
              <label className="slider">Width<input type="range" min="1" max="190" value={sel.w} onChange={(e) => updSelSize("w", +e.target.value)} /></label>
              <label className="slider">Height<input type="range" min="1" max="240" value={sel.h} onChange={(e) => updSelSize("h", +e.target.value)} /></label>
              {/* "0°" straightens: back to the piece's own default, unrotated orientation — the quick
                  way to make a hand-drawn line flat again. Goes through updSelRot like the ↺/↻
                  buttons, so with a group selected the whole group turns rigidly until the selected
                  piece sits flat, rather than every member independently snapping to 0. */}
              <label className="slider">Twist / rotate ⟳<input type="range" min="0" max="360" value={sel.rot || 0} onChange={(e) => updSelRot(+e.target.value)} /><button className="rotbtn" onClick={() => updSelRot((((sel.rot || 0) - 90) % 360 + 360) % 360)}>↺</button><button className="rotbtn" onClick={() => updSelRot(((sel.rot || 0) + 90) % 360)}>↻</button><button className="rotbtn" disabled={!(sel.rot || 0)} onClick={() => updSelRot(0)}>0°</button></label>
              <label className="slider">Flip ⇋<button className="rotbtn" onClick={flipSelH}>⇋ Flip horizontally</button></label>
              
              {/* Every flag from here down is written through updSelAll, so with a group selected
                  it lands on all of them at once — see updSelAll for why flags and geometry take
                  opposite views of what "the group" means. */}
              {groupSel && <p className="hint2" style={{ margin: "0 0 6px" }}>🔗 Flags below apply to all {groupIds.length} grouped blocks.</p>}
              <label className="chk"><input type="checkbox" checked={!!sel.mirror} onChange={(e) => updSelAll({ mirror: e.target.checked })} /> Mirror this block ⟷</label>
              <label className="chk"><input type="checkbox" checked={!!sel.isCutter} onChange={(e) => updSelAll({ isCutter: e.target.checked })} /> 🕳️ Cutter </label>
              {!sel.isCutter && <label className="chk"><input type="checkbox" checked={!!sel.noCut} onChange={(e) => updSelAll({ noCut: e.target.checked })} /> 🛡️ Ignore cutters</label>}
              {!effEdit && showGuide && <label className="chk"><input type="checkbox" checked={!!sel.behindBody} onChange={(e) => updSelAll({ behindBody: e.target.checked })} /> Behind the WHOLE body</label>}
              {!effEdit && asset.type === "equipment" && (asset.slot === "pants" || asset.slot === "under_bottom") && <label className="chk"><input type="checkbox" checked={!!sel.behindLegs} onChange={(e) => updSelAll({ behindLegs: e.target.checked })} /> Behind legs </label>}
              {asset.type === "weapon" && !sel.isHitbox && <label className="chk"><input type="checkbox" checked={!!sel.behindArm} onChange={(e) => updSelAll({ behindArm: e.target.checked })} /> Behind the arm</label>}
              {asset.type === "skin" && <label className="chk"><input type="checkbox" checked={!!sel.hideIfHat} onChange={(e) => updSelAll({ hideIfHat: e.target.checked })} /> Hide if hat</label>}
              {!effEdit && asset.type === "equipment" && UPPER_BODY_SLOTS.has(asset.slot) && <label className="chk"><input type="checkbox" checked={!!sel.overArms} onChange={(e) => updSelAll({ overArms: e.target.checked })} /> Over arms only </label>}
              {(sel.role === "weaponArm" || sel.limb === "arm") && (<>
                <div className="ct2">Shoulder side 🫱</div>
                <div className="limbtabs">
                  {[["top", "⬆ Top"], ["bottom", "⬇ Bottom"], ["left", "⬅ Left"], ["right", "➡ Right"]].map(([v, l]) => (
                    <button key={v} className={(sel.armPivot || "top") === v ? "on" : ""} onClick={() => updSelAll({ armPivot: v }, (p) => p.role === "weaponArm" || p.limb === "arm")}>{l}</button>
                  ))}
                </div>
              </>)}
              {asset.type === "enemy" && sel.limb === "arm" && sel.role !== "weaponArm" && (
                <button className="wide" onClick={() => setPieces((arr) => arr.map((p) => p.id === sel.id ? { ...p, role: "weaponArm" } : (p.role === "weaponArm" ? { ...p, role: undefined } : p)))}>🫱 Make this the shoulder piece</button>
              )}
              {/* No animation flag on a WEAPON. The whole weapon is gripped by the hand and rides
                  the arm's swing on its own, and attachWeaponBlocks strips limb/role on the way
                  into a level — so the control did nothing there but take up room. Weapons drawn
                  before this still carry the flag in their data, and the pivot reconciliation in
                  attachWeaponBlocks still honours it, so none of that art moves. */}
              {asset.type !== "weapon" && (<>
                <div className="ct2">Animation flag 🦴{groupSel ? <span className="hint2"> — sets all {groupIds.length}</span> : null}</div>
                <div className="limbtabs">
                  {[["", "None"], ["arm", "💪 Arm"], ["leg", "🦵 Leg"]].map(([v, l]) => (
                    <button key={v || "none"} className={(sel.limb || "") === v ? "on" : ""} onClick={() => updSelAll({ limb: v || null })}>{l}</button>
                  ))}
                </div>
                {groupSel && groupLimbs.length > 1 && <p className="mini"><b>These {groupIds.length} blocks aren't all the same</b> ({groupLimbs.join(" · ")}).</p>}
              </>)}
              <div className="ct2">Effects ✨</div>
              <label className="slider">Fade<input type="range" min="0.1" max="1" step="0.05" value={sel.fx?.opacity ?? 1} onChange={(e) => updFx({ opacity: +e.target.value })} /></label>
              <label className="slider">Glow<input type="range" min="0" max="12" step="0.5" value={sel.fx?.glow ?? 0} onChange={(e) => updFx({ glow: +e.target.value })} /><input type="color" className="gc" value={sel.fx?.glowColor ?? "#ffd76b"} onChange={(e) => updFx({ glowColor: e.target.value })} /></label>
              <label className="slider">Brightness<input type="range" min="0.3" max="2" step="0.05" value={sel.fx?.bright ?? 1} onChange={(e) => updFx({ bright: +e.target.value })} /></label>
              <div className="btns"><button onClick={toFront}>Bring to front</button><button onClick={toBack}>Send to back</button><button onClick={duplicate}>📋 {groupSel ? "Copy group" : "Copy block"}</button>{(!sel.locked || groupSel) && <button className="danger" onClick={remove}>{groupSel ? "Delete group" : "Delete"}</button>}</div>
            </div>
          ) : null}

          <div className="card">
            <div className="ct">Add a block</div>
            <div className="addrow">
              <button onClick={() => setShapePicker(true)}><b>🔷</b>Shapes…</button>
              <button className={drawMode === "line" ? "on" : ""} onClick={() => { setDrawMode(drawMode === "line" ? null : "line"); setLinePt1(null); setFillPts([]); }} ><b>📏</b>Line</button>
              <button className={drawMode === "fill" ? "on" : ""} onClick={() => { setDrawMode(drawMode === "fill" ? null : "fill"); setLinePt1(null); setFillPts([]); }}><b>🪣</b>Fill</button>
              {/* No "Cutter" entry here: it only ever made a circle cutter, while the 🕳️ Cutter
                  checkbox on a selected block turns ANY shape into one. Two doors to the same
                  feature, one of them worse — so the checkbox is the only one. */}
              <button onClick={() => setPicker({ mode: "add" })}><b>{emoji}</b>Emoji…</button>
              <button onClick={addText} ><b>🔤</b>Text</button>
            </div>
            {drawMode === "line" && <p className="tip">📏 Line: {linePt1 ? "click the END point." : "click the START point."} <button className="ltbtn" onClick={cancelDraw}>✕ Cancel</button></p>}
            {drawMode === "fill" && <p className="tip">🪣 Fill: click points to outline the shape ({fillPts.length} so far). <button className="ltbtn" onClick={finishFill} disabled={fillPts.length < 3}>✓ Finish</button> <button className="ltbtn" onClick={cancelDraw}>✕ Cancel</button></p>}
            <div className="newcolor"><span>New block color</span><div className="ncright">{recent.filter((c) => !pal.includes(c)).slice(0, 5).map((c) => <button key={"n" + c} className={"rc" + (newColor === c ? " on" : "")} style={{ background: c }} onClick={() => setNewColor(c)} title="recent" />)}<input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} onBlur={(e) => addRecent(e.target.value)} /></div></div>
            {/* The palette on the ADD side too, not just on a selected block. Building a scene is
                dozens of blocks in a handful of period colours, and setting the colour BEFORE the
                shape lands means each one is right on arrival instead of needing a second click. */}
            <div className="swatches newswatches">{palettePicker(palKey, setPalKey)}{pal.map((c) => <button key={"n" + c} className={newColor === c ? "on" : ""} style={{ background: c }} onClick={() => setNewColor(c)} />)}</div>
            <button className={"ltbtn" + (eyedrop ? " on" : "")} onClick={() => setEyedrop((v) => !v)} >🎨 {eyedrop ? "Click a block…" : "Eyedropper"}</button>
            {/* Turning add-mode ON keeps any group that's already held, so a stamp you just placed
                can be extended. Turning it OFF ends the group. */}
            <button className={"ltbtn" + (multiSelect ? " on" : "")} onClick={() => { if (multiSelect) setGroupIds([]); setMultiSelect((v) => !v); }} >🔲 {multiSelect ? "Done" : "Group select"}</button>
            {/* Select all — one tap to hold every block in this pose, so a multi-part item (a rocket
                launcher drawn from a dozen blocks) can be dragged, rotated or resized as one object
                without hunting each block first. Sits next to the mode toggle rather than inside the
                group tip so it's reachable from a cold start. This POSE's blocks only: a group is a
                list of piece ids inside one pose, so it can never span them. */}
            {pieces.length > 0 && <button className="ltbtn" onClick={() => { setGroupIds(pieces.map((pc) => pc.id)); setSelId(pieces[pieces.length - 1].id); }}>▣ Select all ({pieces.length})</button>}
            {/* Snap lives here, next to Group select, because it's a way of PLACING blocks — a mode
                that applies to whatever you drag next — rather than a property of the selected one.
                Ticked state is remembered across reloads (see the snapEdges pref). */}
            <label className="chk"><input type="checkbox" checked={snapOn} onChange={(e) => setSnapOn(e.target.checked)} /> 🧲 Snap to edges</label>
            {snapOn && <p className="mini">Aim a block roughly right (within {SNAP_ANGLE}°) and drag it up against a <b>similar-length</b> edge on another block: it jumps flush and takes that edge's exact angle and length. The edge it caught turns green. Sloped and hand-drawn shapes snap by their real outline, not their box. A held group only slides into place — it never turns or resizes.</p>}
            {/* A group can be live WITHOUT add-mode (that's what placing a stamp leaves you with),
                so the count and the group buttons key off the group itself. Only the "click blocks
                to add/remove" line is about the mode. */}
            {(multiSelect || groupIds.length > 0) && <p className="tip">{multiSelect ? "🔲 Multi-select" : "🔗 Group held"} ({groupIds.length} selected).{groupIds.length > 0 && <> <button className="ltbtn" onClick={() => setGroupIds([])}>✕ Clear</button></>}{groupIds.length > 1 && <> <button className="ltbtn" onClick={saveGroup}>💾 Save group</button></>}{hasStore && groupIds.length > 0 && <> <input className="gname" value={stampName} placeholder="stamp name" onChange={(e) => setStampName(e.target.value)} /> <button className="ltbtn" onClick={storeGroup}>📦 Store group</button></>}</p>}
            {stamps.length > 0 && <div className="stampShelf"><span>📦 Stored</span><select aria-label="Stored group" value={stampPick} onChange={(e) => { setStampPick(e.target.value); setConfirmStampDel(null); }}><option value="">Choose a group…</option>{stamps.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.pieces.length})</option>)}</select><button className="ltbtn" disabled={!pickedStamp} onClick={() => pickedStamp && placeStamp(pickedStamp)}>Place</button><button className={"ltbtn" + (pickedStamp && confirmStampDel === pickedStamp.id ? " on" : "")} disabled={!pickedStamp} onClick={() => { if (!pickedStamp) return; if (confirmStampDel === pickedStamp.id) { setConfirmStampDel(null); deleteStamp(pickedStamp.id); } else { setConfirmStampDel(pickedStamp.id); flash("Tap Sure? to permanently delete stored group \"" + pickedStamp.name + "\""); } }} title={pickedStamp && confirmStampDel === pickedStamp.id ? "Tap again to permanently delete" : "Delete the selected stored group"}>{pickedStamp && confirmStampDel === pickedStamp.id ? "Sure?" : "✕"}</button></div>}
            {savedGroups.length > 0 && <p className="tip">📁 Saved: {savedGroups.map((g) => <span key={g.id} style={{ marginRight: 6 }}><button className="ltbtn" onClick={() => loadGroup(g)}>{g.name} ({g.ids.length})</button><button className="ltbtn" onClick={() => deleteGroup(g.id)}>✕</button></span>)}</p>}
          </div>

          {shapePicker && (
            <div className="modal" onClick={() => setShapePicker(false)}>
              <div className="dlg" onClick={(e) => e.stopPropagation()}>
                <div className="dt">Pick a shape</div>
                <div className="shapegrid">
                  {SHAPE_LIST.map(([kind, icon, label]) => (
                    <button key={kind} className="tile" onClick={() => { addBlock(kind); setShapePicker(false); }} >
                      <span className="ti">{icon}</span><span className="tl">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {asset.type === "weapon" && !isRanged(asset.wtype) && (
            <div className="card">
              <div className="ct">🎯 Hit detection</div>
              <button className="ltbtn" onClick={addHitbox}><b>🎯</b> Add hitbox</button>
              {(() => { const n = (pieces || []).filter((p) => p.isHitbox).length; return n > 0 && <p className="mini">{n} hitbox{n === 1 ? "" : "es"} on this pose.</p>; })()}
            </div>
          )}

          {asset.type === "prop" && (
            <div className="card">
              <div className="ct">Object settings</div>
              <label className="slider">Default size<input type="range" min="1" max="12" step="1" value={asset.size ?? 2} onChange={(e) => setAsset((a) => ({ ...a, size: +e.target.value }))} /><span className="hint2" style={{ marginLeft: 6 }}>{asset.size ?? 2}×{asset.size ?? 2}</span></label>
              {(asset.frames || []).length > 1 && (
                <label className="slider">Anim speed<input type="range" min="1" max="20" step="1" value={asset.animFps ?? 6} onChange={(e) => setAsset((a) => ({ ...a, animFps: +e.target.value }))} /><span className="hint2" style={{ marginLeft: 6 }}>{asset.animFps ?? 6} fps</span></label>
              )}
              <label className="chk"><input type="checkbox" checked={!!asset.solidDefault} onChange={(e) => setAsset((a) => ({ ...a, solidDefault: e.target.checked }))} /> Solid by default</label>
            </div>
          )}

          {asset.type === "projectile" && (
            <div className="card">
              <div className="ct">Size</div>
              <label className="slider">Scale<input type="range" min="0.5" max="3" step="0.1" value={asset.size ?? 1} onChange={(e) => setAsset((a) => ({ ...a, size: +e.target.value }))} /></label>
            </div>
          )}

          {pieces.length > 0 && (
            <div className="card"><div className="ct">Layers — top is front</div>
              <div className="layers">
                {frontPieces.slice().reverse().map(lrow)}
                {showGuide && <div className="bodydiv">— BODY (one layer) —</div>}
                {behindPieces.slice().reverse().map(lrow)}
              </div>
            </div>
          )}
        </aside>
      </div>

      {picker && (() => {
        const q = emojiQuery.trim().toLowerCase();
        const filtered = q ? emojis.filter((m) => (EMOJI_KEYWORDS[m] || "").includes(q)) : emojis;
        return (
          <div className="modal" onClick={closePicker}>
            <div className="dlg" onClick={(e) => e.stopPropagation()}>
              <div className="dt">{picker.mode === "change" ? "Pick a new emoji" : "Pick an emoji to add"} <span className="emcount">{filtered.length}{q ? " match" + (filtered.length === 1 ? "" : "es") : ""}</span></div>
              <input className="emsearch" value={emojiQuery} onChange={(e) => setEmojiQuery(e.target.value)} placeholder="Search — e.g. explosion, fire, sword, tree…" autoFocus />
              {!q && recentEmoji.length > 0 && <><div className="emsublabel">Recent</div><div className="emgrid emgrid-recent">{recentEmoji.map((m, i) => <button key={"r" + i} onClick={() => pickEmoji(m)}>{m}</button>)}</div></>}
              {q && !filtered.length && <p className="mini">No matches for "{emojiQuery}".</p>}
              <div className="emgrid">{filtered.map((m, i) => <button key={i} onClick={() => pickEmoji(m)}>{m}</button>)}</div>
              <div className="row2"><button onClick={closePicker}>Close</button></div>
            </div>
          </div>
        );
      })()}

      {sheet && (
        <div className="modal" onClick={() => setSheet(false)}>
          <div className="dlg" onClick={(e) => e.stopPropagation()}>
            <div className="dt">Save & Open</div>
            <div className="grp"><span className="gl">Name this asset</span>
              <input className="namefield" value={asset.name} onChange={(e) => setAsset({ ...asset, name: e.target.value })} placeholder={asset.type === "equipment" ? "e.g. Wizard Hat, Iron Boots…" : "e.g. Wizard Bob, Bronze Sword…"} />
            </div>
            <div className="grp"><span className="gl">Keep your work</span>
              <div className="row2">{hasStore && <button onClick={saveAsset}>💾 Save</button>}<button onClick={download}>⬇ Download file</button><label className="up">⬆ Upload file<input type="file" accept="application/json" onChange={upload} hidden /></label></div>
            </div>
            <div className="grp"><span className="gl">Open a saved {asset.type === "equipment" ? (SLOTS[asset.slot]?.label || "item") : (TYPES[asset.type]?.label || asset.type)}</span>
              {(() => {
                const sameCategory = library.filter((a) => a.type === asset.type && (asset.type !== "equipment" || a.slot === asset.slot));
                return sameCategory.length ? <div className="loadlist">{sameCategory.map((a) => (
                  <button key={a.id} onClick={() => { openAsset(a); setSheet(false); }}>{a.type === "equipment" ? (SLOTS[a.slot]?.icon || "📦") : (TYPES[a.type]?.icon || "📦")} {a.name}</button>
                ))}</div> : <p className="mini">Nothing saved in this category yet.</p>;
              })()}
            </div>
            <div className="grp"><span className="gl">Send to the game or to Claude</span>
              <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
              <div className="row2"><button onClick={copy}>📋 Copy</button><button onClick={loadText}>Load this text</button><button onClick={() => setSheet(false)}>Close</button></div>
            </div>
          </div>
        </div>
      )}
      {textureModals}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

const css = `
.bb{height:100vh;display:flex;flex-direction:column;background:#0f1117;color:#e7e9ee;font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;overflow:hidden}
.bb.weaponEditor{display:grid;grid-template-rows:auto minmax(0,1fr) auto auto}
.weaponEditor>.bar{grid-row:1}.weaponEditor>.main{grid-row:2;min-height:0}.weaponEditor>.angles{grid-row:3}.weaponEditor>.weaponSettings{grid-row:4}
.weaponSettings{min-height:0;max-height:34vh;overflow:auto;border-top:2px solid #2c3245;background:#14111a}
/* The weapon settings consume a bottom grid row, so an 88vh canvas cannot fit in the remaining
   middle row. Its overflowing transparent artrow covered Menu, Fire, and the settings and stole
   every pointer click. Make the stage/artrow shrink and size the canvas from that real remainder. */
.weaponEditor .stage{min-height:0;overflow:hidden}
.weaponEditor .artrow{flex:1 1 auto;min-height:0;flex-wrap:nowrap;align-items:center}
.weaponEditor .art.artWpn{height:100%;max-height:880px}
.editorSettings{display:contents}
.bb button,.bb input,.bb textarea,.bb select{font:inherit;color:inherit}
/* Every control inherits the app's near-WHITE text (above) but keeps the browser's default WHITE
   background unless something explicitly styles it — which is how the weapon editor ended up with
   white text in white boxes: its three dropdowns (Projectile, Boom art, Fire look) and its bare
   number inputs (Range, Clip size, Damage) had no rule of their own at all, so the text in them was
   invisible. This is the floor for every text-entry control in the app, so no new one can be born
   white-on-white; anything wanting a different look overrides it further down the sheet. Range,
   colour and checkbox inputs are deliberately excluded — they are painted by accent-color. */
.bb select,.bb textarea,.bb input[type=text],.bb input[type=number],.bb input[type=search],.bb input:not([type]){background:#1d2230;border:1px solid #3a4258;border-radius:8px;padding:7px 10px;color:#e7e9ee}
.bb select{cursor:pointer}
.bb option{background:#1d2230;color:#e7e9ee}
.bb select:focus,.bb textarea:focus,.bb input[type=text]:focus,.bb input[type=number]:focus,.bb input[type=search]:focus,.bb input:not([type]):focus{outline:none;border-color:#4f7cf6}
.bb select:hover{border-color:#4f7cf6}
.bar{display:flex;align-items:center;gap:10px;padding:11px 14px;background:#161922;border-bottom:1px solid #232838;flex-shrink:0}
.logo{font-weight:700;font-size:16px}
.dressName{background:#1f2433;border:1px solid #2c3245;border-radius:9px;padding:8px 12px;font-size:13px;color:#e7e9ee;width:180px;margin-left:auto}
.dressName:focus{border-color:#4f7cf6;outline:none}
.back{background:#1f2433;border:1px solid #2c3245;border-radius:9px;padding:8px 12px;cursor:pointer}
.nm{background:#1d2230;border:1px solid #2c3245;border-radius:8px;padding:7px 11px;width:110px;font-size:15px}
.badge{background:#222840;border:1px solid #2c3245;border-radius:20px;padding:5px 11px;font-size:12px}
.save{margin-left:auto;background:#3558c0;border:0;border-radius:9px;padding:9px 14px;font-weight:600;cursor:pointer}
.save:hover{background:#3f66d8}
.menu{flex:1;overflow:auto;padding:22px;max-width:780px;margin:0 auto;width:100%}
.menu h2{font-size:15px;color:#aab2c6;margin:10px 0 12px;font-weight:600}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:24px}
.shapegrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:10px;max-width:480px}
.shapegrid .tile{padding:14px 8px;text-align:center}
.shapegrid .ti{font-size:26px;display:block;margin-bottom:4px}
.tile{display:flex;flex-direction:column;align-items:flex-start;gap:4px;background:#171b26;border:1px solid #242a3a;border-radius:16px;padding:16px;cursor:pointer;text-align:left}
.tile:hover{border-color:#4f7cf6;background:#1b2030}.tile.dress{border-color:#3a4a7a;background:#19203a}
.ti{font-size:30px}.tl{font-weight:700;font-size:15px}.tb{font-size:12px;color:#9aa3b8}
.slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-bottom:24px}
.slot{display:flex;flex-direction:column;align-items:center;gap:6px;background:#171b26;border:1px solid #242a3a;border-radius:13px;padding:14px 6px;cursor:pointer;font-size:12px}
.slot:hover{border-color:#4f7cf6}.slot .si{font-size:24px}
.saved{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:16px}
.loadcats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:16px}
.loaditems{grid-template-columns:1fr}
.loaditem{align-items:flex-start;text-align:left}
.fitlist{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.fitchip{font-size:10px;padding:2px 7px;border-radius:7px;background:#1f2433;color:#8a93a8;border:1px solid #2c3245}
.fitchip.on{background:#173a26;border-color:#3a7a4f;color:#7fe0a0}
.scard{display:flex;flex-direction:column;align-items:center;gap:5px;background:#171b26;border:1px solid #242a3a;border-radius:14px;padding:15px 8px;cursor:pointer;width:100%}
.scardwrap{position:relative}
.sdel{position:absolute;top:6px;right:6px;background:#1f2433;border:1px solid #2c3245;border-radius:8px;padding:3px 7px;font-size:12px;cursor:pointer;color:#9aa3b8}
.sdel:hover{border-color:#e05b5b;color:#e05b5b}
.sdel.arm{background:#3a2020;border-color:#e05b5b;color:#ffb3b3;font-weight:600}
.nichelist{display:flex;flex-direction:column;gap:10px;max-height:50vh;overflow:auto;margin:8px 0}
.nicherow{background:#171b26;border:1px solid #242a3a;border-radius:12px;padding:10px}
.nichename{font-weight:600;margin-bottom:7px}
.nichebtns{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
.nichebtns button{background:#1f2433;border:1px solid #2c3245;border-radius:9px;padding:7px 10px;font-size:13px;cursor:pointer}
.nichebtns button:hover{border-color:#4f7cf6}
.scard:hover{border-color:#4f7cf6}.si{font-size:24px}.sn{font-weight:600;text-align:center}.sty{font-size:11px;color:#9aa3b8}
.muted{color:#8a93a8;margin-bottom:16px}
.openfile{display:inline-flex;background:#1f2433;border:1px solid #2c3245;border-radius:11px;padding:11px 18px;cursor:pointer;font-weight:600}
.openfile:hover{border-color:#4f7cf6}
.angles{display:flex;align-items:center;gap:6px;padding:9px 14px;background:#13161f;border-bottom:1px solid #232838;flex-wrap:wrap;flex-shrink:0}
.angles>button{background:#1f2433;border:1px solid #2c3245;border-radius:9px;padding:7px 13px;cursor:pointer}
.angles>button.on{background:#3558c0;border-color:#6f92f0;font-weight:600}
.copyang{font-size:12px;color:#9aa3b8 !important;background:transparent !important;border:1px dashed #3a4258 !important}
.posecopy{display:flex;align-items:center;gap:6px}
/* "copy to other poses" submenu. Anchored to its own button so it drops directly under it, and
   above everything else in the toolbar (z-index) since the pose tabs sit in the same strip. */
.copytowrap{position:relative;display:inline-flex}
.copytomenu{position:absolute;top:calc(100% + 6px);left:0;z-index:40;min-width:230px;display:flex;flex-direction:column;gap:4px;padding:10px;background:#161a26;border:1px solid #3a4258;border-radius:10px;box-shadow:0 10px 28px rgba(0,0,0,.55)}
.copytomenu .ct{font-size:12px;color:#9aa3b8;margin-bottom:2px}
.copytomenu .chk{display:flex;align-items:center;gap:7px;font-size:13px;white-space:nowrap;cursor:pointer}
.copytorow{display:flex;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid #2a3040}
.copytorow button{flex:1;font-size:12px;padding:6px 8px;border-radius:8px;background:#1f2433;border:1px solid #3a4258;color:#c8cfdd;cursor:pointer}
.copytorow button.prim{background:#2f6fb5;border-color:#3f80c9;color:#fff}
.copytorow button:disabled{opacity:.45;cursor:not-allowed}
.posecopy select{background:#1f2433;border:1px dashed #3a4258;border-radius:9px;padding:7px 10px;font-size:12px;color:#9aa3b8;cursor:pointer}
.artrow{display:flex;gap:14px;align-items:flex-start;justify-content:center;width:100%;flex-wrap:wrap}
.pcp-wrap{display:flex;flex-direction:column;gap:6px}
.pcp-head{display:flex;align-items:center;gap:8px;font-size:11.5px;color:#9aa3b8;max-width:200px}
.pcp-x{background:#1f2433;border:1px solid #2c3245;border-radius:7px;padding:2px 7px;cursor:pointer;font-size:12px;color:#e7e9ee;flex-shrink:0}
.pcp-x:hover{border-color:#4f7cf6}
.pcp-art{position:relative;height:min(70vh,560px);aspect-ratio:200/260;background:#1a1f2e;border:1.5px dashed #4f7cf6;border-radius:14px;overflow:hidden;isolation:isolate}
.pcp-piece{cursor:pointer}
.pcp-piece:hover{outline:2px solid #4f7cf6;outline-offset:1px}
.mir{display:flex;align-items:center;gap:6px;font-size:13px;color:#aab2c6;padding:0 4px}
.refpick{margin-left:auto;font-size:12px;color:#9aa3b8;display:flex;align-items:center;gap:6px}
.refpick select,.big{background:#1f2433;border:1px solid #2c3245;border-radius:8px;padding:6px 9px}
.big{width:100%}
.main{flex:1;display:flex;min-height:0}
.stage{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px;gap:8px;min-width:0}
.tip{margin:0;color:#9aa3b8;font-size:12.5px;text-align:center;max-width:330px}
.statline{margin:0 0 6px;color:#c7cede;font-size:12.5px;text-align:center;background:#1d2230;border:1px solid #2c3245;border-radius:8px;padding:5px 10px}
.tip.warn{color:#f3d98a;background:#3a3320;border:1px solid #c8a23c;border-radius:9px;padding:8px 12px;max-width:420px}
.art{position:relative;overflow:hidden;isolation:isolate;height:min(70vh,560px);aspect-ratio:200/260;background:#12141b;border:1px solid #2c3245;border-radius:14px;touch-action:none;box-shadow:0 8px 30px rgba(0,0,0,.35);user-select:none}
.art.artWpn{height:min(88vh,880px)}
.art.artProj{height:min(90vh,2240px)}
.artDesign{position:absolute;box-sizing:border-box;background:#1d2230;background-image:linear-gradient(#262c3b 1px,transparent 1px),linear-gradient(90deg,#262c3b 1px,transparent 1px);background-size:10% 7.6923%;border:1px dashed rgba(122,162,214,.35)}
.zoomctl{display:flex;gap:4px;align-items:center}
.zoomctl button{width:26px;height:26px;line-height:1;border-radius:7px;border:1px solid #2c3245;background:#232a3d;color:#e7e9ee;cursor:pointer;font-size:16px}
.zoomctl button:disabled{opacity:.35;cursor:default}
.mline{position:absolute;left:50%;top:0;bottom:0;border-left:1px dashed #33405e}
.emptyart{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#5b667e;font-size:13px}
.handmk{position:absolute;transform:translate(-50%,-50%);width:24px;height:24px;border-radius:50%;background:rgba(79,124,246,.18);border:1.5px solid #4f7cf6;display:flex;align-items:center;justify-content:center;font-size:13px}
.handmk.guide{background:none;border:1px dashed #4f7cf6;opacity:.7;pointer-events:none}
.shouldermk{position:absolute;transform:translate(-50%,-50%);width:24px;height:24px;border-radius:50%;background:rgba(200,162,60,.2);border:1.5px solid #c8a23c;display:flex;align-items:center;justify-content:center;font-size:13px;touch-action:none;z-index:2}
.armaxis{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.armaxis line{stroke:#c8a23c;stroke-width:1.6;stroke-dasharray:4 3;opacity:.6}
.drawpreview{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.snapmark line{stroke:#5ce39b;stroke-width:2.4;stroke-linecap:round;opacity:.95}
.art.drawing{cursor:crosshair}
.limbtabs{display:flex;gap:6px;margin:2px 0 4px}
.limbtabs button{flex:1;background:#1d2230;border:1px solid #2c3245;border-radius:8px;padding:7px 4px;cursor:pointer}
.limbtabs button.on{background:#3a3320;border-color:#c8a23c;color:#f3d98a}
.side{width:330px;background:#12141c;border-left:1px solid #232838;overflow:auto;padding:13px;display:flex;flex-direction:column;gap:11px;flex-shrink:0}
.card{background:#171b26;border:1px solid #242a3a;border-radius:14px;padding:13px}
.card.empty{color:#9aa3b8}.card.empty b{color:#e7e9ee}.card.sel{border-color:#3a4a7a;box-shadow:0 0 0 1px #2b3a63}
.ct{font-size:12px;font-weight:700;color:#aab2c6;margin-bottom:9px;text-transform:uppercase;letter-spacing:.5px}
.ct2{font-size:12px;font-weight:700;color:#aab2c6;margin:14px 0 4px;text-transform:uppercase;letter-spacing:.5px;border-top:1px solid #242a3a;padding-top:12px}
.addrow{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.addrow button{display:flex;flex-direction:column;align-items:center;gap:3px;background:#1f2433;border:1px solid #2c3245;border-radius:11px;padding:11px 6px;cursor:pointer;font-size:12px}
.addrow button:hover{border-color:#4f7cf6;background:#222840}.addrow button b{font-size:19px;line-height:1}
.wide{width:100%;background:#1f2433;border:1px solid #2c3245;border-radius:10px;padding:10px;cursor:pointer;margin-top:8px}.wide:hover{border-color:#4f7cf6}
.newcolor{display:flex;align-items:center;justify-content:space-between;margin-top:11px;color:#aab2c6;font-size:13px}
.newcolor input[type=color]{width:46px;height:30px;border:1px solid #2c3245;border-radius:8px;background:#1f2433;padding:2px;cursor:pointer}
.swatches{display:flex;flex-wrap:wrap;gap:7px}
.swatches button{width:30px;height:30px;border-radius:8px;border:2px solid transparent;cursor:pointer}
.swatches button.on{border-color:#fff;box-shadow:0 0 0 2px #4f7cf6}
/* Palette picker. Full width on its own line above the swatches so switching theme never shuffles
   the colour buttons out from under a finger mid-tap. */
.palsel{flex:1 0 100%;background:#1f2433;border:1px solid #2c3245;border-radius:8px;color:#e7ecf5;font-size:12px;padding:5px 7px;cursor:pointer}
.palsel:hover{border-color:#4f7cf6}
.newswatches{margin-top:9px;gap:6px}
.newswatches button{width:26px;height:26px;border-radius:7px}
.palette{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.palchip{position:relative;display:flex;align-items:center;gap:8px;background:#1f2433;border:1px solid #2c3245;border-radius:10px;padding:6px 10px 6px 6px;cursor:pointer}
.palchip .palsw{width:26px;height:26px;border-radius:7px;border:2px solid #3a4258;flex:0 0 auto}
.palchip .palmeta{display:flex;flex-direction:column;line-height:1.15}
.palchip .palhex{font-size:12px;color:#e7ecf5;text-transform:uppercase;letter-spacing:.3px}
.palchip .palcount{font-size:10px;color:#8b93a7}
.palchip input[type=color]{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;border:0;padding:0}
.swatches .orig{width:30px;height:30px;border-radius:8px;border:2px solid #3a4258;background:#11141c;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center}
.pick{width:30px;height:30px;border:1px dashed #4a5269;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;color:#9aa3b8;font-size:16px}
.pick input{position:absolute;inset:0;opacity:0;cursor:pointer}
.slider{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:13px;color:#aab2c6}
/* Short paired controls (the stat sliders) sit two per row instead of one, so a five-stat panel
   costs two and a half rows of height rather than five. Falls back to one column if the panel is
   ever narrowed. */
.statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:0 12px}
.statgrid .slider{gap:6px;min-width:0}
.statgrid .slider input[type=range]{min-width:0;flex:1}
.slider input[type=range]{flex:1;accent-color:#4f7cf6}
.slider .gc{width:30px;height:24px;padding:0;border:1px solid #2c3245;border-radius:6px;background:#1f2433;flex:none}
.rotbtn{flex:none;width:30px;height:26px;border:1px solid #2c3245;border-radius:7px;background:#1f2433;cursor:pointer;font-size:15px;line-height:1}
.rotbtn:hover{border-color:#4f7cf6}
.rotbtn.on{background:#2c4a8a;border-color:#4f7cf6}
.piecetex{display:flex;gap:6px;align-items:center;margin:6px 0 2px}
.piecetex .ltbtn{display:inline-flex;align-items:center;gap:6px}
.chk{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px;color:#cdd3df}
.outlinechk{background:#1d2230;border:1px solid #2c3245;border-radius:8px;padding:8px 10px;margin-top:12px}
.outlinefx{background:#1d2230;border:1px solid #2c3245;border-radius:8px;padding:8px 10px;margin-top:6px}
.chk input{width:16px;height:16px;accent-color:#4f7cf6}
.layers{display:flex;flex-direction:column;gap:5px}
.bodydiv{text-align:center;font-size:10px;color:#7b8398;letter-spacing:1px;padding:5px 0;border-top:1px dashed #3a4258;border-bottom:1px dashed #3a4258;margin:2px 0}
.lrow{display:flex;align-items:center;gap:8px;background:#1f2433;border:1px solid #2c3245;border-radius:9px;padding:6px 8px;cursor:pointer}
.lrow.on{border-color:#4f7cf6;box-shadow:0 0 0 1px #26304d}
.lrow.grp{border-color:#ffb84f;box-shadow:0 0 0 1px #3a2f16}
.lrow.recovered{border-color:#c98f2e;background:#2a2113}
.recoverBanner{background:#2a2113;border-bottom:1px solid #c98f2e;color:#f0d9a8;font-size:13px;padding:9px 14px;line-height:1.4}
.lprev{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:15px;flex:none;border:1px solid #2c3245}
.lname{flex:1;font-size:12px;color:#cdd3df;text-transform:capitalize}
.lrow button{flex:none;width:26px;height:24px;border:1px solid #2c3245;border-radius:6px;background:#171b26;color:#9aa3b8;cursor:pointer;font-size:11px}
.lrow button:hover{border-color:#4f7cf6;color:#e7e9ee}
.loadlist{display:flex;flex-direction:column;gap:6px;margin-top:8px;max-height:200px;overflow:auto}
.loadlist button{text-align:left;background:#1f2433;border:1px solid #2c3245;border-radius:9px;padding:9px 12px;cursor:pointer}
.loadlist button:hover{border-color:#4f7cf6}
.loadgroup{margin-bottom:14px}
.loadgrouplabel{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#9aa3b8;margin-bottom:4px}
.slotrow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px;font-size:13px;color:#cdd3df}
.slotrow select{flex:none;width:120px;background:#1f2433;border:1px solid #2c3245;border-radius:8px;padding:6px}
.btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
.btns button{background:#1f2433;border:1px solid #2c3245;border-radius:10px;padding:10px;cursor:pointer;font-size:13px}
.btns button:hover{border-color:#4f7cf6}.btns .danger{border-color:#5a2e36;color:#ff9b9b}.btns .danger:hover{background:#3a2024}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{width:34px;height:34px;border:1px solid #2c3245;border-radius:9px;background:#1f2433;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;overflow:hidden}
.chip.on{border-color:#4f7cf6;box-shadow:0 0 0 2px #26304d}.chip .dot{width:22px;height:22px;border-radius:5px;display:flex;align-items:center;justify-content:center}
.mini{margin:8px 0 0;font-size:11px;color:#7b8398}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:30;padding:14px}
.dlg{width:min(520px,96vw);max-height:90vh;overflow:auto;background:#171b26;border:1px solid #2c3245;border-radius:16px;padding:18px}
.dt{font-weight:700;font-size:16px;margin-bottom:12px}
.emcount{font-weight:400;font-size:12px;color:#7b8398;margin-left:6px}
.emgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:6px;max-height:55vh;overflow:auto}
.emgrid-recent{max-height:none;overflow:visible;margin-bottom:10px}
.emsearch{width:100%;box-sizing:border-box;padding:8px 10px;margin:6px 0 10px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:inherit;font-size:14px}
.emsublabel{font-size:12px;opacity:.65;margin:2px 0 6px;text-transform:uppercase;letter-spacing:.04em}
.emgrid button{aspect-ratio:1;background:#1f2433;border:1px solid #2c3245;border-radius:9px;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center}
.emgrid button:hover{border-color:#4f7cf6;background:#26304d}
.grp{margin-bottom:14px}.gl{font-size:12px;color:#9aa3b8;text-transform:uppercase;letter-spacing:.5px}
.row2{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.row2 button,.up{background:#1f2433;border:1px solid #2c3245;border-radius:10px;padding:9px 14px;cursor:pointer;font-size:13px}
.row2 button:hover,.up:hover{border-color:#4f7cf6}.up{display:inline-flex;align-items:center}
.openDressed{background:#1f2433;border:1px solid #2c3245;border-radius:10px;padding:9px 14px;cursor:pointer;font-size:13px;color:#e7e9ee}
.dlg textarea{width:100%;height:150px;margin-top:8px;background:#0f1117;border:1px solid #2c3245;border-radius:10px;padding:10px;color:#c7cdda;resize:vertical;font-family:ui-monospace,monospace;font-size:12px}
.namefield{width:100%;margin-top:6px;background:#0f1117;border:1px solid #2c3245;border-radius:10px;padding:11px 12px;font-size:15px}
.namefield:focus{outline:none;border-color:#4f7cf6}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#3558c0;color:#fff;padding:9px 20px;border-radius:22px;font-weight:600;z-index:40;box-shadow:0 6px 20px rgba(0,0,0,.4)}
.undo{background:#1f2433;border:1px solid #2c3245;border-radius:9px;padding:9px 12px;cursor:pointer;font-weight:600}
.undo:hover:not(:disabled){border-color:#4f7cf6}.undo:disabled{opacity:.4;cursor:default}
.tile.lvl{border-color:#3a6a4a;background:#172a1f}
.wstates{display:flex;align-items:center;gap:8px;padding:9px 14px;background:#1a1320;border-bottom:1px solid #2b2438;flex-wrap:wrap}
.explodecard{display:flex;flex-direction:column;gap:7px;width:100%;margin-top:4px;padding:9px 11px;background:#20141a;border:1px solid #4a2b2b;border-radius:8px}
.wstates .wslab{color:#cbb6e6;font-weight:600}
.wstates button{background:#241a2e;border:1px solid #3a2c48;border-radius:9px;padding:7px 13px;cursor:pointer}
.wstates button.on{background:#5a3a8f;border-color:#7a4fbf;color:#fff;font-weight:600}
.wstates .wcopy{background:#1f2433;border-color:#2c3245}
/* Hints had NO rule at all, so every "(the shot bursts on impact…)" aside rendered at full body
   size and colour — the same weight as the label it was explaining. That's most of why the weapon
   panel read as a soup of text. Muted and a size down, still ~7:1 on the panel background. */
.hint2{font-size:12px;color:#9aa3b8;line-height:1.45}
.wstates .hint2{flex:1 1 220px;min-width:0}
/* Weapon abilities: a picker plus one card per ability actually on the weapon. */
.abilcard{display:flex;flex-direction:column;gap:8px;width:100%;margin-top:6px}
.abilbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.abilAdd{min-width:190px}
.abilrow{display:flex;flex-direction:column;gap:7px;padding:10px 12px;background:#1c1626;border:1px solid #46375e;border-left:3px solid #8a6ac4;border-radius:9px}
.abilhead{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13.5px;color:#efe6ff}
.abilx{padding:4px 9px;font-size:12px;border-color:#5a3a4a;color:#e6b8c4}
.abilx:hover{border-color:#c76a86;background:#33202a}
.rc{position:relative}.rc::after{content:"";position:absolute;inset:-3px;border:1px dotted #6a7290;border-radius:7px;pointer-events:none}
.ncright{display:flex;align-items:center;gap:5px}.ncright .rc{width:22px;height:22px;border-radius:6px;border:1px solid #2c3245;cursor:pointer}
/* level creator */
.wide2{width:150px}
/* Twist, sitting on the object toolbar. Boxed and tinted so it reads as "this acts on the
   object you have", not as another placement setting like size or colour. */
.objnudge{display:inline-flex;align-items:center;gap:4px;margin-left:8px}
.objtwist{display:flex;align-items:center;gap:7px;padding:5px 10px;background:#1b2233;border:1px solid #3a4258;border-radius:9px;font-size:13px}
.objtwist input[type=range]{width:120px;accent-color:#4f7cf6}
.catbar{display:flex;align-items:center;gap:10px;padding:9px 14px;background:#161922;border-bottom:1px solid #232838;flex-wrap:wrap}
.catfield{display:flex;align-items:center;gap:7px;font-size:12px;color:#aab2c6}
.catfield input{background:#1d2230;border:1px solid #2c3245;border-radius:8px;padding:7px 10px;color:#e7e9ee;font-size:13px;width:130px}
.catchips{display:flex;gap:5px;flex-wrap:wrap}
.catchips button{background:#1f2433;border:1px solid #2c3245;border-radius:14px;padding:5px 11px;cursor:pointer;font-size:12px;color:#aab2c6}
.catchips button:hover{border-color:#4f7cf6;color:#e7e9ee}
.save.playon{background:#b0504f}.save.playon:hover{background:#c75f5e}
.ltools{display:flex;align-items:center;gap:8px;padding:9px 14px;background:#13161f;border-bottom:1px solid #232838;flex-wrap:wrap}
.seg{display:flex;border:1px solid #2c3245;border-radius:9px;overflow:hidden}
.seg button{background:#171b26;border:0;padding:8px 11px;cursor:pointer;font-size:13px}
.seg button.on{background:#3558c0;color:#fff;font-weight:600}
.lswatches{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
/* In the level toolbar the picker sits inline — the row is already horizontal and wraps, and a
   full-width select there would push the whole swatch strip onto its own line. */
.lswatches .palsel{flex:0 0 auto;padding:4px 6px}
.lswatches button{width:24px;height:24px;border-radius:7px;border:2px solid transparent;cursor:pointer}
.lswatches button.on{border-color:#fff;box-shadow:0 0 0 2px #4f7cf6}
.lswatches .orig{width:24px;height:24px;border-radius:7px;background:#1f2433;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;border:2px solid transparent}
.lswatches .orig.on{border-color:#fff;box-shadow:0 0 0 2px #4f7cf6}
.lswatches .pick{display:inline-flex;align-items:center;gap:2px;background:#1f2433;border:1px solid #2c3245;border-radius:8px;padding:2px 6px;cursor:pointer;font-size:12px}
.lswatches .pick input{width:24px;height:24px;border:0;background:none;padding:0;cursor:pointer}
.objpick{background:#241a2e;border:1px solid #3a2c48;border-radius:9px;padding:8px 12px;cursor:pointer;font-size:13px}
.objpick b{margin-right:5px;font-size:16px}
.solidchk{background:#1f2433;border:1px solid #2c3245;border-radius:9px;padding:7px 11px}
.sizeseg{flex-wrap:wrap;overflow:visible}.sizeseg button{padding:8px 10px;font-size:12px}
.brushseg{flex-wrap:wrap;overflow:visible}.brushseg button{padding:8px 10px;font-size:12px}
.movingtag{display:inline-flex;align-items:center;gap:8px;background:#241a2e;border:1px dashed #7a4fbf;border-radius:9px;padding:6px 11px;font-size:12px;color:#e0c7ff}
.lgroup{display:flex;align-items:center;gap:8px}
.lgrouplabel{font-size:11px;color:#7a8296;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap}
/* The playtest/editor status lines share one wrapping row instead of each taking a full line of
   vertical space above the canvas. max-width is per-line so a long control hint still wraps
   internally rather than squeezing the ammo readout next to it. */
.statusrow{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:5px;margin-bottom:4px}
.statusrow:empty{display:none}
.statusline{margin:0;color:#8fb8ff;font-size:12.5px;text-align:center;background:#161d2e;border:1px solid #2a3a5c;border-radius:9px;padding:5px 10px;max-width:480px}
.ammoline{color:#e7e9ee;background:#1a1320;border-color:#7a4fbf;font-weight:600;letter-spacing:.02em;display:flex;align-items:center;justify-content:center;gap:8px}
.ammoline.empty{color:#ffb3b3;border-color:#b0504f;background:#2a1618}
.ammoline.reloading{color:#f3d98a;border-color:#c8a23c;background:#2a2113}
.ctrlhint{color:#9aa3b8;background:#12151d;border-color:#242a3a;font-weight:400}
.buildtag{opacity:.5;font-size:11px;margin-left:6px}
.ctrlhint b{color:#cdd3df}
.reloadbar{display:inline-block;width:110px;height:6px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.2);border-radius:4px;overflow:hidden}
.reloadfill{display:block;height:100%;background:#c8a23c}
.texbtn{display:inline-flex;align-items:center;gap:7px}
.texchip{display:inline-block;width:18px;height:18px;border-radius:4px;border:1px solid #3a4258;flex:none}
.texusehint{max-width:360px;line-height:1.25}.grassQuick{align-items:center;margin:8px 0 12px;padding:8px;background:#142016;border:1px solid #38552e;border-radius:10px}.grassQuick .mini{margin:0;color:#b9cca8}
.texgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:12px}
.texcardwrap{position:relative}
.texcard{display:flex;flex-direction:column;align-items:center;gap:5px;background:#171b26;border:1px solid #242a3a;border-radius:14px;padding:10px 8px;cursor:pointer;width:100%}
.texcard:hover{border-color:#4f7cf6}
.texcard.on{border-color:#4f7cf6;box-shadow:0 0 0 1px #26304d}
.texprev{width:100%;height:64px;border-radius:9px;border:1px solid #2c3245;display:block}
.texeditrow{display:flex;gap:14px;flex-wrap:wrap}
.texbigprev{flex:0 0 200px;height:200px;border-radius:12px;border:1px solid #2c3245}
.texeditcol{flex:1;min-width:240px}
.texseg{flex-wrap:wrap;overflow:visible}
.texseg button{padding:7px 9px;font-size:12px}
.row2 .danger{border-color:#5a2e36;color:#ff9b9b}
.ltbtn{background:#1f2433;border:1px solid #2c3245;border-radius:9px;padding:8px 11px;cursor:pointer;font-size:13px}
.ltbtn.saveRead:disabled{opacity:.55;cursor:wait}.saveLoading{max-width:360px;color:#f3d98a;background:#241b0d;border:1px solid #5c481d;border-radius:8px;padding:6px 8px}
.gname{background:#141824;border:1px solid #2c3245;border-radius:9px;padding:7px 9px;font-size:13px;color:inherit;width:110px}
.stampShelf{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:6px;margin:7px 0;padding:7px 8px;background:#171b26;border:1px solid #2c3245;border-radius:10px;font-size:12px;color:#aeb6c9}
.stampShelf select{min-width:0;width:100%;background:#141824;border:1px solid #2c3245;border-radius:8px;padding:7px 8px;color:inherit;font-size:12px}
.stampShelf .ltbtn{padding:7px 9px}.stampShelf .ltbtn:disabled{opacity:.45;cursor:default}
.bgNameInput{width:140px;background:#1f2433;border:1px solid #2c3245;border-radius:9px;padding:8px 11px;font-size:13px;color:inherit}
.ltbtn.on{border-color:#4f7cf6;background:#26304d}
.ltbtn:hover{border-color:#4f7cf6}.ltbtn.up{display:inline-flex;align-items:center}
.wide3b{width:100%;justify-content:center;margin-top:8px}
.lmain{flex:1;display:flex;min-height:0}
.lstage{flex:1;display:flex;flex-direction:column;padding:12px;min-width:0}
.lscroll{flex:1;overflow:auto;display:flex;background:#0a0c12;border:3px solid #232838;border-radius:12px;transition:border-color .15s}
.lscroll.layer-fg{border-color:#3a4258}
.lscroll.layer-bg{border-color:#3aa07a}
.lscroll.layer-obj{border-color:#8a5cf6}
.lscroll.layer-climb{border-color:#7aa2d6}
.lscroll.layer-hazard{border-color:#ff6a1f}
.lhazard{position:absolute;pointer-events:none;z-index:5;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;background:radial-gradient(circle at 50% 70%,rgba(255,120,30,.42),rgba(255,60,0,.14) 70%,transparent);box-sizing:border-box}
.lhazard .hzflame{animation:hzflick .5s steps(2,end) infinite;filter:drop-shadow(0 0 4px rgba(255,120,30,.8))}
.lhazard.hazHidden{background:repeating-linear-gradient(45deg,rgba(255,120,30,.18) 0 5px,transparent 5px 10px);outline:1px dashed rgba(255,120,30,.55);outline-offset:-2px}
.lhazard.hazHidden .hzflame{animation:none;filter:none;opacity:.6}
@keyframes hzflick{0%{opacity:1;transform:translateY(0) scale(1)}50%{opacity:.72;transform:translateY(-1px) scale(1.08)}100%{opacity:1;transform:translateY(0) scale(1)}}
.lscroll.layer-marker{border-color:#c8a23c}
.lgrid{position:relative;flex:none;margin:auto;background-color:#0e1018;background-image:linear-gradient(#1a1f2e 1px,transparent 1px),linear-gradient(90deg,#1a1f2e 1px,transparent 1px);touch-action:none}
/* The level's layer ladder. Painted cells and placed objects share it, so an object always sits
   level with the blocks that behave the way it does (see objectLayerClass):
     1 Background cells + background objects   2 Foreground cells + solid objects
     4 climb / pedestals                       5 the player and hazards
     6 Front cells + "in front" objects
   Within one z, DOM order decides — objects render after their cell layer, so a bush on a
   background wall still shows over the wall. */
.lcell{position:absolute;width:${LV_CELL}px;height:${LV_CELL}px;z-index:2}
.lcell.bg{opacity:.42;z-index:1}
.lcell.front{z-index:6;transition:opacity .12s ease}
.lcell.moveSel{z-index:9;background:rgba(79,124,246,0.28);outline:2px dashed #4f7cf6;outline-offset:-2px;pointer-events:none}
/* The bare .lobj z is for transient in-play things that aren't placed level objects — projectiles
   and thrown grenades, which should read over the terrain they fly past. Placed objects always
   carry a lay-* class and land on the ladder above instead. */
.lobj{position:absolute;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:3}
.lobj.lay-bg{z-index:1}
.lobj.lay-fg{z-index:2}
.lobj.lay-front{z-index:6}
.lobj.infront{z-index:6;transition:opacity .12s ease}
.lobjGhost{position:absolute;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:4;opacity:.5;outline:2px dashed rgba(255,255,255,.4);outline-offset:-2px;border-radius:4px}
.enemyGhost{position:absolute;pointer-events:none;z-index:4;opacity:.6;outline:2px dashed #c0504f;outline-offset:-2px;border-radius:6px;box-sizing:border-box}
/* THE STATUS LAYER. Sits above the Front tiles (z 6) on purpose: a unit's HP, reload and 💫 are
   information you need even when the unit itself is behind a tree. It is a plain positioned box
   with no transform of its own, so the bars inside are free of the sprite wrapper's facing flip
   and simply fill left-to-right. Spans the VISIBLE body, and the bars hang off its top edge. */
.unitStatus{position:absolute;height:0;pointer-events:none;z-index:8}
.enemyHpTrack{position:absolute;left:0;right:0;top:-10px;height:5px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.25);border-radius:3px;overflow:hidden}
.enemyStun{position:absolute;left:0;right:0;top:-30px;text-align:center;font-size:16px;line-height:1;pointer-events:none;animation:stunbob .6s ease-in-out infinite}
@keyframes stunbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.enemyHpFill{height:100%;transition:width .15s ease}
/* Reload timer, sitting just above the HP bar (which is at -10px, 5px tall). Deliberately thinner
   and a different colour from HP so a glance can't confuse "nearly dead" with "nearly loaded". No
   width transition: it tracks a frame counter, and easing would lag the real reload. */
.enemyReloadTrack{position:absolute;left:0;right:0;top:-17px;height:4px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.25);border-radius:3px;overflow:hidden}
.enemyReloadFill{height:100%;background:linear-gradient(90deg,#4a86c8,#7ab6f0)}
/* The player's own bars are already siblings of the sprite rather than children of it, so they
   only needed lifting onto the same status layer the enemies use. */
.playerHpTrack{position:absolute;height:5px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.25);border-radius:3px;overflow:hidden;z-index:8;pointer-events:none}
.playerReloadTrack{position:absolute;height:4px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.25);border-radius:3px;overflow:hidden;z-index:8;pointer-events:none}
.playerReloadFill{height:100%;background:linear-gradient(90deg,#4a86c8,#7ab6f0)}
.playerHpFill{height:100%;transition:width .15s ease}
.rampGhost{position:absolute;width:${LV_CELL}px;height:${LV_CELL}px;pointer-events:none;z-index:4;opacity:.5}
.blockGhost{position:absolute;pointer-events:none;z-index:4;opacity:.5;outline:2px dashed rgba(255,255,255,.55);outline-offset:-2px;box-sizing:border-box}
.areaGhost{position:absolute;pointer-events:none;z-index:5;background:rgba(122,162,214,.22);border:2px dashed #7aa2d6;box-sizing:border-box}
.lobj.insp{outline:2px dashed #4f7cf6;outline-offset:1px}
.lclimb{position:absolute;pointer-events:none;z-index:4;background:repeating-linear-gradient(135deg,rgba(122,162,214,.28) 0 4px,transparent 4px 9px);border:1px dashed rgba(122,162,214,.55);box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1}
.lclimb.kind-bars{background:repeating-linear-gradient(135deg,rgba(214,162,90,.28) 0 4px,transparent 4px 9px);border-color:rgba(214,162,90,.6)}
.lclimb.kind-cliff{background:repeating-linear-gradient(135deg,rgba(150,122,214,.28) 0 4px,transparent 4px 9px);border-color:rgba(150,122,214,.6)}
.lmarker{position:absolute;display:flex;align-items:center;justify-content:center;font-size:15px;z-index:7;background:rgba(0,0,0,.3);border:1px dashed #c8a23c;border-radius:4px;box-sizing:border-box;cursor:default}
.catinline{background:#1d2230;border:1px solid #2c3245;border-radius:8px;padding:7px 10px;color:#e7e9ee;font-size:13px;width:170px}
.lobj.solid::after{content:"";position:absolute;inset:1px;border:1px dashed rgba(255,90,90,.6);border-radius:3px}
.conn{position:absolute;transform:translate(-50%,-50%);width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;cursor:pointer;background:rgba(0,0,0,.35);border:2px solid #6bd06b;color:#6bd06b;z-index:6}
.conn.blocked{border-color:#c0504f;color:#c0504f;opacity:.85}
.conn.sel{box-shadow:0 0 0 3px #4f7cf6;z-index:7}
.player{position:absolute;background:#7aa2d6;border-radius:5px;z-index:5;box-shadow:0 2px 6px rgba(0,0,0,.5);overflow:visible}
.playerWrap{position:absolute;z-index:5;overflow:visible;isolation:isolate}
.lcell.collisionOnly,.blockGhost.collisionOnly,.rampGhost.collisionOnly{opacity:.48;outline:2px dashed #62d9ff;outline-offset:-2px;filter:saturate(.55)}
.player .pbody{position:absolute;inset:0;background:#7aa2d6;border-radius:5px}
.player .peye{position:absolute;right:3px;top:5px;width:4px;height:4px;border-radius:50%;background:#0a0c12;z-index:2}
.lside{width:300px;background:#12141c;border-left:1px solid #232838;overflow:auto;padding:13px;display:flex;flex-direction:column;gap:11px;flex-shrink:0}
.connlist{display:grid;grid-template-columns:1fr;gap:6px}
.connrow{display:flex;justify-content:space-between;gap:6px;background:#171b26;border:1px solid #242a3a;border-radius:9px;padding:8px 10px;cursor:pointer;font-size:12px}
.fxstack{display:flex;flex-direction:column-reverse;gap:5px}
.fxitem{display:flex;flex-direction:column;gap:6px}
.fxrow{display:flex;align-items:center;gap:7px;background:#171b26;border:1px solid #242a3a;border-radius:9px;padding:6px 9px;font-size:12px;cursor:pointer}
.fxrow:hover{border-color:#4f7cf6}
.fxrow .fxprev{font-size:17px;flex-shrink:0}
.fxrow .fxname{flex:1;color:#9aa3b8}
.fxrow button{background:#1f2433;border:1px solid #2c3245;border-radius:7px;padding:3px 8px;cursor:pointer;font-size:12px;flex-shrink:0}
.fxrow button:hover{border-color:#4f7cf6}
.fxedit{display:flex;flex-direction:column;gap:8px;background:#13161f;border:1px dashed #2c3245;border-radius:9px;padding:9px}
.connrow.open{border-color:#3a6a4a}.connrow.on{border-color:#4f7cf6;background:#1b2030}
.connrow .ctype{color:#8a93a6;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.minilv{position:relative;background:#0e1018;border:1px solid #232838;border-radius:6px;overflow:hidden}
.genrow{display:flex;align-items:center;gap:8px;overflow-x:auto;padding:10px 0}
.gencol{flex:0 0 auto;text-align:center}
.genname{font-size:11px;color:#aab2c6;margin-bottom:4px;white-space:nowrap}
.genlink{flex:0 0 auto;color:#6bd06b;font-size:18px}
.dlg.wide3{max-width:min(94vw,820px)}
.catItemInput{width:100%;box-sizing:border-box;background:#0f1117;border:1px solid #2c3245;border-radius:9px;padding:9px 11px;font-size:13px;margin-bottom:7px;color:#e7e9ee}
.catItemInput:focus{outline:none;border-color:#4f7cf6}
.pedcfg{display:flex;flex-direction:column;gap:7px;margin:6px 0}
.pedcfg .catinline{width:100%;box-sizing:border-box}
/* Below .playerWrap (5) so the player always walks IN FRONT of an item on its stand, and below
   the Front layer (6) so a wall genuinely hides it — the x-ray works by fading that wall (see the
   playtest loop), not by lifting the pedestal over it. The washed-out look while it shows through
   is applied inline per pedestal, since it eases off with distance. */
.pedestalPlay{position:absolute;z-index:4;pointer-events:none}
.pedestalPlay.xray .pedestalCap{border-color:#7ad2ff;color:#d6f1ff;background:rgba(6,20,30,.72)}
.pedestalArt{position:absolute;inset:0;overflow:hidden;display:flex;align-items:center;justify-content:center;transition:opacity .15s ease,filter .15s ease}
.pedestalEmpty{font-size:10px;color:#ff9b9b;background:rgba(0,0,0,.6);border:1px solid #5a2e36;border-radius:5px;padding:1px 5px}
.pedestalGem{position:absolute;left:50%;bottom:0;transform:translateX(-50%);font-size:${LV_CELL*0.75}px;line-height:1}
.pedestalCap{position:absolute;left:50%;top:-4px;transform:translate(-50%,-100%);white-space:nowrap;background:rgba(0,0,0,.72);border:1px solid #c8a23c;border-radius:6px;padding:0 5px;font-size:10px;color:#f3d98a}
.pedcallout{position:absolute;left:50%;top:-24px;transform:translate(-50%,-100%);white-space:nowrap;background:#241b0d;border:1px solid #c8a23c;border-radius:6px;padding:1px 6px;font-size:11px;font-weight:600;color:#f3d98a;box-shadow:0 1px 4px rgba(0,0,0,.55)}
.enemyDropPlay{position:absolute;z-index:7;pointer-events:none;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 0 5px rgba(243,217,138,.7));animation:lootBob .9s ease-in-out infinite alternate}
.enemyDropOrb{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,#fff5bf,#c8a23c 55%,#6a4b12);border:1px solid #f3d98a;font-size:15px}
/* A drop that has real drawn art shows the art itself, not the gold emoji bead — so the gradient,
   the border and the round clip all come off, and the box becomes the positioning context for the
   scaled art plane. The lootBob animation and gold caption still mark it as loot. */
.enemyDropOrb.art{background:none;border:none;border-radius:0;position:relative;overflow:hidden}
.enemyDropCap{margin-top:2px;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:rgba(0,0,0,.78);border:1px solid #c8a23c;border-radius:6px;padding:0 5px;font-size:10px;color:#f3d98a}
.enemyDropPlay .pedcallout{top:-8px}
@keyframes lootBob{from{margin-top:0}to{margin-top:-3px}}
.doorPromptFloat{position:absolute;transform:translate(-50%,-100%);white-space:nowrap;background:#241b0d;border:1px solid #c8a23c;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:600;color:#f3d98a;box-shadow:0 1px 4px rgba(0,0,0,.55);pointer-events:none;z-index:50}
.equipline{color:#cfe0ff;background:#131a29;border-color:#3a5c8c;font-size:12px}
@media(max-width:820px){.main{flex-direction:column}.stage{padding:10px;flex:none}.art{height:46vh}.side{width:auto;border-left:0;border-top:1px solid #232838;flex:1}.refpick{margin-left:0}.nm{flex:1;width:auto;min-width:0}.slotrow select{width:130px}.lmain{flex-direction:column}.lside{width:auto;border-left:0;border-top:1px solid #232838}.connlist{grid-template-columns:1fr}}
`;
