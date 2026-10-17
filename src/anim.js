/* BOB OKAY'S ANIMATIONS (🎬) — the cutscenes a level opens and closes with.
 *
 * THIS FILE IS THE GAME'S, NOT THE STUDIO'S, the same way audio.js is. The studio (App.js) has the
 * 🎬 Animations screen where one is built, and the Level Creator places it with a 🎬 marker; the
 * game players get will be its own front end, and it has to play the very same record the very
 * same way. So nothing here knows about React, storage or how a body is drawn: these are the
 * rules for WHERE every layer is at a moment, and WHAT HAPPENS NEXT.
 *
 * THE DATA — an animation is an ASSET (type "anim"), so it saves, syncs, exports and restores with
 * every other asset and needed no new saved kind:
 *   { id, type: "anim", name, w, h,                  the stage, in level cells
 *     trigger: "start" | "reach" | "floor",          plays as the level starts / when you walk up and press E /
 *                                                    as the floor is done, over the whole screen (see floorEndAnim)
 *     floor: "Trailor Park",                         "floor" only: which floor's end it closes ("" = any)
 *     ending: "play" | "leave",                      you take over where the actor ends / the floor is done
 *     eState: <state id>,                            "Walk up + E": the state E starts (see animReachAt)
 *     layers: [{ id, name, kind: "actor" } | { id, name, kind: "prop", propId, size }
 *              | { id, name, kind: "cloth", len, bed } | { id, name, kind: "rope", from, hookX, hookY }
 *              | { id, name, kind: "text", title, text, size, tilt, wide, color }],   back to front
 *     states: [{ id, name, dur, wait, loop, prompt, promptLayer, promptLift, fadeIn, fadeOut, sound, soundVol,
 *                keys: [{ id, t, v: { <layerId>: { x, y, rot, show, flip, pose, legs, arms, sit, play } } }] }] }
 *
 * A LAYER'S VALUES, in stage cells from the stage's top-left:
 *   actor  x,y = the HIP (the top of the legs). Lying down, sitting up and standing all turn about
 *          the hip, so a sit-up keeps its legs on the mattress while the body swings up round them.
 *   prop   x,y = the bottom-centre of the prop's box, so a prop stands on whatever y says.
 *   rot    on-screen degrees (the turn is outermost, like a placed object's — see objRotStyle)
 *   show   0..1, faded in between keys, so "the blanket goes" is a fade and not a blink
 *   flip   mirrored left↔right
 *   sx,sy  a prop's width and height as a fraction of its size (1 = as placed), squashed about its
 *          bottom-centre so it keeps standing on y. Eased like any number, so a blanket can BUNCH
 *          down onto his legs before he sits up instead of being sat up through (Blake, 2026-10-13:
 *          "maybe the blanket needs to compact somehow before the player sits up"). A move, turn and
 *          fade could not do it: a rigid quilt sized for a lying body is always where a rising
 *          torso has to go.
 *   pose   side | front | back | crouch (the actor only)
 *   legs   degrees the legs swing forward about the hip (90 = straight out, sitting up in bed)
 *   arms   degrees the arms swing forward about the shoulder (180 = straight up, a stretch)
 *   sit    0..1, the legs shortened toward the hip — the thighs pointing at you, sat facing front
 *   play   a prop's own animation frames run (the alarm clock's ringing) or hold on the first
 *   cloth  a BLANKET, drawn fresh every frame over whatever of the actor is under it (animClothShape):
 *          x = its head end, fx = its foot end, y = its hem (the bottom of the side hanging over the
 *          mattress), cover = how far up the body it reaches (cells above the hip, along the body),
 *          lift = its head end raised (a throw). On the layer: len = how much cloth there is, bed =
 *          the bare mattress top. A blanket made of one stiff drawing could only move, turn and
 *          squash, and Blake called every version of that "cheap, ugly and unnatural" (2026-10-13):
 *          it has to rise when his arm comes out from under it and bunch when he sits up.
 *   rope   a ROPE (animRopeShape), worked out every frame like the blanket: it hangs from a point on
 *          a prop layer (the layer's `from`, at hookX/hookY across and down its drawn box), so it
 *          goes wherever that prop flies, turns or bobs; with no `from` it hangs from its own x,y.
 *          drop = how much rope is out (cells; 0 → 9 is it being let down), swing = how far a free
 *          end sways (degrees), hold = its end is in the actor's raised hands. Drawn as one stiff
 *          prop, a rope lowered from a moving helicopter to a moving man had to be keyed three
 *          times over and still came apart between keys — the blanket's lesson (2026-10-13).
 *
 *   text   WORDS ON SCREEN (a "text" layer): a title over paragraphs, drawn `wide` cells across and
 *          `size` cells per line of body text. x = its middle, y = the bottom of the window it shows
 *          in (everything from the stage top down to y). rise = how far the words have moved up that
 *          window, in cells: 0 has their top line just under y, and it is the ONE field that moves at
 *          an even speed between keys (ANIM_LINEAR_FIELDS), because a crawl that slowed to a stop at
 *          every key of the General's push-in would read as a stutter. tilt = degrees the page leans
 *          back (the crawl Blake asked for, 2026-10-17: "text is going up in a layer in front of him
 *          kind of like it's star wars"); 0 is a flat caption.
 *
 * KEYS. A state is a few keys along its own timeline. Numbers ease from one key to the next; the
 * rest (flip, pose, play) switch AT the key. A key that leaves a layer out carries that layer's
 * values over from the key before it, so adding a prop to an old animation never moves anything.
 *
 * STATES run in order. One that WAITS holds at its end (or loops, with `loop`) and shows its
 * prompt until E is pressed; one that does not wait plays through and the next one starts. After
 * the last one, `ending` says what happens.
 */

export const ANIM_POSES = ["side", "front", "back", "crouch"];
export const ANIM_TRIGGERS = [{ key: "start", label: "Level start" }, { key: "reach", label: "Walk up + E" }, { key: "floor", label: "Floor end" }];
export const ANIM_ENDINGS = [{ key: "play", label: "You take over" }, { key: "leave", label: "Leave the floor" }];
export const ANIM_NUM_FIELDS = ["x", "y", "rot", "show", "sx", "sy", "legs", "arms", "sit", "fx", "cover", "lift", "drop", "swing", "rise"];
// Numbers that move at an EVEN speed from one key to the next instead of easing in and out (see the
// text layer above): a crawl.
export const ANIM_LINEAR_FIELDS = ["rise"];
// A text layer's look when it is made: the yellow of the crawl it was asked for.
export const ANIM_TEXT_COLOR = "#ffe81f";
export const ANIM_STEP_FIELDS = ["flip", "pose", "play", "hold"];
// A prop layer's Size (cells, its longer side). Past the 1–30 the editor first offered: a Chinook's
// rotors are 30 m tip to tip, and at the ~55% scale that keeps the whole helicopter on screen over a
// man who can reach its rope, that is 54 cells.
export const ANIM_PROP_SIZE_MAX = 80;
// A key "at" the playhead: within this many seconds. Two keys closer than this would be one key
// the editor could never select apart.
export const ANIM_KEY_EPS = 0.02;
export const ANIM_MIN_DUR = 0.1;
export const ANIM_MAX_DUR = 60;
// The actor is drawn the player's size: 7 cells tall, and its hip — Bob's leg top — is 188 of the
// 260 canvas units down, so a standing actor's feet are this far under its hip.
export const ANIM_STAND_HIP_CELLS = 7 * (72 / 260);

const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round3 = (v) => Math.round(v * 1000) / 1000;

// Where a layer is when no key has said anything about it yet. A new prop stands in the middle of
// the floor; the actor stands beside it.
export const animLayerDefaults = (anim, layer) => {
  const w = num(anim && anim.w, 14), h = num(anim && anim.h, 9);
  if (layer && layer.kind === "actor") return { x: w / 2, y: h - ANIM_STAND_HIP_CELLS, rot: 0, show: 1, flip: false, pose: "side", legs: 0, arms: 0, sit: 0 };
  if (layer && layer.kind === "cloth") return { x: w / 2 - 3, fx: w / 2 + 3, y: h - 1, cover: 2.8, lift: 0, show: 1 };
  if (layer && layer.kind === "rope") return { x: w / 2, y: 1, drop: Math.max(1, h - 3), swing: 0, hold: false, show: 1 };
  if (layer && layer.kind === "text") return { x: w / 2, y: h, rise: 0, show: 1 };
  return { x: w / 2, y: h, rot: 0, show: 1, sx: 1, sy: 1, flip: false, play: true };
};
// A prop layer's CSS transform for its box `hPx` tall. The turn stays about the box's middle and
// outermost, exactly as before sx/sy existed, so every animation saved without them draws the same
// string to the character. The squash is about the bottom-centre (the layer's own x,y anchor):
// with the transform origin in the middle, that is a half-height shift down, the scale, and back.
export const animPropTransform = (v, hPx) => {
  const sx = num(v && v.sx, 1), sy = num(v && v.sy, 1);
  let tf = "rotate(" + (+(v && v.rot) || 0).toFixed(2) + "deg)";
  if (Math.abs(sx - 1) > 1e-4 || Math.abs(sy - 1) > 1e-4) {
    const half = (num(hPx, 0) / 2).toFixed(2);
    tf += " translateY(" + half + "px) scale(" + Math.max(0.01, sx).toFixed(4) + "," + Math.max(0.01, sy).toFixed(4) + ") translateY(-" + half + "px)";
  }
  return tf + (v && v.flip ? " scaleX(-1)" : "");
};

export const newAnimState = (mkId, name) => ({ id: mkId(), name: name || "State", dur: 2, wait: false, loop: false, prompt: "", promptLayer: "", promptLift: 0, fadeIn: 0, fadeOut: 0, sound: "", soundVol: 1, keys: [{ id: mkId(), t: 0, v: {} }] });
export const newAnim = (mkId) => ({
  type: "anim", name: "Animation", category: "", w: 14, h: 9, trigger: "start", ending: "play",
  // Never drawn. Every asset carries an `angles` map, and the studio's asset-wide code walks it.
  angles: { front: [], back: [], side: [], up: [], crouch: [] },
  layers: [{ id: mkId(), kind: "actor", name: "Bob" }],
  states: [newAnimState(mkId, "State 1")],
});

// Normalise a stored record: every field present and in range, keys in time order, exactly one
// actor, and no values left behind for a layer that was deleted. Leaves a sound id alone even if
// that sound is gone — a missing sound plays nothing, exactly like every other sound pick.
export const migrateAnim = (a0, mkId) => {
  const a = { ...(a0 || {}) };
  a.type = "anim";
  if (typeof a.name !== "string") a.name = "Animation";
  if (typeof a.category !== "string") a.category = "";
  a.w = clamp(Math.round(num(a.w, 14)), 2, 80);
  a.h = clamp(Math.round(num(a.h, 9)), 2, 46);
  if (!ANIM_TRIGGERS.some((t) => t.key === a.trigger)) a.trigger = "start";
  if (typeof a.floor !== "string") a.floor = "";
  if (!ANIM_ENDINGS.some((t) => t.key === a.ending)) a.ending = "play";
  if (!a.angles || typeof a.angles !== "object") a.angles = { front: [], back: [], side: [], up: [], crouch: [] };
  let layers = (Array.isArray(a.layers) ? a.layers : []).filter((l) => l && l.id && (l.kind === "actor" || l.kind === "prop" || l.kind === "cloth" || l.kind === "rope" || l.kind === "text"));
  const actors = layers.filter((l) => l.kind === "actor");
  if (actors.length > 1) layers = layers.filter((l) => l.kind !== "actor" || l === actors[0]);
  if (!actors.length) layers = [{ id: mkId ? mkId() : "actor", kind: "actor", name: "Bob" }, ...layers];
  // A rope hangs only from a PROP layer that is still there (a deleted helicopter leaves it hanging
  // from its own spot rather than from nothing).
  const propIds = new Set(layers.filter((l) => l.kind === "prop").map((l) => l.id));
  a.layers = layers.map((l) => (l.kind === "prop" ? { ...l, name: l.name || "Prop", propId: l.propId || "", size: clamp(num(l.size, 3), 0.5, ANIM_PROP_SIZE_MAX) }
    : l.kind === "cloth" ? { ...l, name: l.name || "Blanket", len: clamp(num(l.len, 6), 0.5, 80), bed: clamp(num(l.bed, a.h - 2), 0, a.h) }
    : l.kind === "rope" ? { ...l, name: l.name || "Rope", from: typeof l.from === "string" && propIds.has(l.from) ? l.from : "", hookX: clamp(num(l.hookX, 0.5), 0, 1), hookY: clamp(num(l.hookY, 1), 0, 1) }
    : l.kind === "text" ? { ...l, name: l.name || "Text", title: typeof l.title === "string" ? l.title : "", text: typeof l.text === "string" ? l.text : "", size: clamp(num(l.size, 1), 0.2, 6), tilt: clamp(num(l.tilt, 0), 0, 75), wide: clamp(num(l.wide, Math.round(a.w * 0.6)), 1, 80), color: typeof l.color === "string" && /^#[0-9a-f]{6}$/i.test(l.color) ? l.color : ANIM_TEXT_COLOR }
    : { ...l, name: l.name || "Bob" }));
  const ids = new Set(a.layers.map((l) => l.id));
  const states = (Array.isArray(a.states) ? a.states : []).filter(Boolean);
  if (!states.length && mkId) states.push(newAnimState(mkId, "State 1"));
  a.states = states.map((s, i) => {
    const keys = (Array.isArray(s.keys) ? s.keys : []).filter((k) => k && typeof k === "object").map((k) => {
      const v = {};
      for (const lid of Object.keys(k.v || {})) if (ids.has(lid) && k.v[lid] && typeof k.v[lid] === "object") v[lid] = { ...k.v[lid] };
      return { id: k.id || (mkId ? mkId() : "k" + i), t: Math.max(0, num(k.t, 0)), v };
    }).sort((x, y) => x.t - y.t);
    if (!keys.length) keys.push({ id: mkId ? mkId() : "k0", t: 0, v: {} });
    return {
      ...s,
      id: s.id || (mkId ? mkId() : "s" + i),
      name: typeof s.name === "string" ? s.name : "State " + (i + 1),
      dur: clamp(num(s.dur, 2), ANIM_MIN_DUR, ANIM_MAX_DUR),
      wait: !!s.wait, loop: !!s.loop,
      prompt: typeof s.prompt === "string" ? s.prompt : "",
      // Which layer the prompt hangs beside ("" = the actor's head). A layer since deleted falls back.
      promptLayer: typeof s.promptLayer === "string" && ids.has(s.promptLayer) ? s.promptLayer : "",
      // ...and how much higher than its spot, in cells, to clear whatever stands behind that layer.
      promptLift: clamp(num(s.promptLift, 0), -10, 20),
      fadeIn: clamp(num(s.fadeIn, 0), 0, 10), fadeOut: clamp(num(s.fadeOut, 0), 0, 10),
      sound: typeof s.sound === "string" ? s.sound : "",
      soundVol: clamp(num(s.soundVol, 1), 0, 2),
      keys,
    };
  });
  // Which state E starts in a "Walk up + E" animation — kept by id, so reordering or deleting
  // states never points it at the wrong one ("" = the second state, as it always was).
  a.eState = typeof a.eState === "string" && a.states.some((s, i) => i > 0 && s.id === a.eState) ? a.eState : "";
  return a;
};

const ease = (u) => u * u * (3 - 2 * u);
// One field of one layer as the key at index `i` has it: that key's own value, else the nearest
// earlier key's, else the layer's default.
const fieldAt = (keys, i, lid, f, def) => {
  for (let j = i; j >= 0; j--) { const v = keys[j].v[lid]; if (v && v[f] !== undefined) return v[f]; }
  return def[f];
};

// Every value of one layer at time `t` of a state.
export const animLayerAt = (anim, state, layer, t) => {
  const def = animLayerDefaults(anim, layer);
  const keys = (state && state.keys) || [];
  if (!keys.length) return { ...def };
  let i = -1;
  for (let j = 0; j < keys.length; j++) if (keys[j].t <= t + 1e-9) i = j; else break;
  const out = {};
  if (i < 0) { for (const f of Object.keys(def)) out[f] = fieldAt(keys, 0, layer.id, f, def); return out; }
  const nxt = keys[i + 1];
  const span = nxt ? nxt.t - keys[i].t : 0;
  const u = nxt && span > 0 ? ease(clamp((t - keys[i].t) / span, 0, 1)) : 0;
  for (const f of Object.keys(def)) {
    const a = fieldAt(keys, i, layer.id, f, def);
    if (ANIM_NUM_FIELDS.includes(f) && nxt && u > 0) {
      const b = fieldAt(keys, i + 1, layer.id, f, def);
      const k = ANIM_LINEAR_FIELDS.includes(f) ? clamp((t - keys[i].t) / span, 0, 1) : u;
      out[f] = num(a, 0) + (num(b, 0) - num(a, 0)) * k;
    } else out[f] = a;
  }
  return out;
};
// Every layer at once: { <layerId>: values }.
export const animFrame = (anim, si, t) => {
  const st = anim && anim.states && anim.states[si];
  const out = {};
  for (const l of (anim && anim.layers) || []) out[l.id] = animLayerAt(anim, st, l, t);
  return out;
};
// The same frame seen in a level that was mirrored (or placed mirrored): the stage turns round its
// own middle. Turns are on-screen angles drawn outside the mirror, so they turn the other way.
export const animMirrorValues = (v, w) => ({ ...v, x: w - v.x, rot: -(v.rot || 0), flip: !v.flip, ...(v.fx !== undefined ? { fx: w - v.fx } : {}) });

// ── "FLOOR END": the scene that closes a floor (Blake, 2026-10-17: a close-up of a General in a
// helicopter, the story crawling up in front of him, "at the end of the Trailor Park levels"). It is
// not placed in a level — it plays over the whole screen the moment the floor is done, after the
// floor's own last cutscene (the rope up into the Chinook). Which one: a "floor" animation whose
// `floor` names this floor (the level's Floor, the same loose match a gate's "accepts" uses), else
// one that names none. null when there is none, and the floor ends the way it always did.
export const floorEndAnim = (anims, floor) => {
  const want = String(floor || "").trim().toLowerCase();
  const ends = (anims || []).filter((a) => a && a.type === "anim" && a.trigger === "floor");
  return ends.find((a) => want && String(a.floor || "").trim().toLowerCase() === want)
    || ends.find((a) => !String(a.floor || "").trim()) || null;
};
// The cell size that fits a whole stage in a view w × h px, and where its top-left goes: a screen
// scene keeps its shape and is letterboxed in black, never cropped (the words must all show).
export const animScreenFit = (anim, vw, vh) => {
  const w = num(anim && anim.w, 14), h = num(anim && anim.h, 9);
  const cell = Math.max(1, Math.min(num(vw, 0) / w, num(vh, 0) / h));
  return { cell, left: (num(vw, 0) - w * cell) / 2, top: (num(vh, 0) - h * cell) / 2 };
};

export const animStateDur = (st) => clamp(num(st && st.dur, 2), ANIM_MIN_DUR, ANIM_MAX_DUR);
// The playhead of a running animation is { si, t, el }: the state, where on its timeline (t), and
// how long it has been running (el). They differ only on a waiting state that LOOPS — t goes round
// and round, el keeps counting — and the fade-in and the prompt go by el, or a 2 s fade on a 1.2 s
// loop would start again from black every lap. `done` once the last state has played.
// One step: `pressed` is an E press THIS frame (an edge, not a held key). A waiting state takes the
// press only once its fade-in is over, so a key already down as the screen comes up from black
// cannot skip the scene unseen.
export const animStep = (anim, pos, dt, pressed) => {
  const states = (anim && anim.states) || [];
  let si = pos.si, el = num(pos.el, num(pos.t, 0)) + Math.max(0, dt || 0);
  for (let guard = 0; guard < 64; guard++) {
    const st = states[si];
    if (!st) { const d = states.length ? animStateDur(states[states.length - 1]) : 0; return { si: Math.max(0, states.length - 1), t: d, el: d, done: true }; }
    const d = animStateDur(st);
    if (st.wait) {
      if (pressed && el >= (st.fadeIn || 0)) { pressed = false; si++; el = 0; continue; }
      return { si, t: el >= d ? (st.loop ? el % d : d) : el, el, done: false, waiting: true };
    }
    if (el < d) return { si, t: el, el, done: false };
    if (si + 1 >= states.length) return { si, t: d, el: d, done: true };
    el -= d; si++;
  }
  return { si, t: el, el, done: false };
};
// How black the screen is (0..1): a state's fade-in from black as it starts (by `el`, see animStep),
// its fade-out to black as it ends (by `t`). A waiting state has no end to fade out over.
export const animFadeAt = (anim, si, t, el = t) => {
  const st = anim && anim.states && anim.states[si];
  if (!st) return 0;
  const d = animStateDur(st);
  let a = 0;
  if (st.fadeIn > 0 && el < st.fadeIn) a = Math.max(a, 1 - el / st.fadeIn);
  if (!st.wait && st.fadeOut > 0 && t > d - st.fadeOut) a = Math.max(a, clamp((t - (d - st.fadeOut)) / st.fadeOut, 0, 1));
  return clamp(a, 0, 1);
};
// Is the prompt up? Only on a waiting state, and only once the screen has come up from black.
export const animPromptUp = (anim, si, el) => {
  const st = anim && anim.states && anim.states[si];
  return !!(st && st.wait && (st.prompt || "").trim() && el >= (st.fadeIn || 0));
};
// WHERE THE ACTOR'S PROMPT HANGS, in stage cells: centred on the BODY, not the hip (Blake: "centered
// over Bob"). Lying down the hip is near his feet, so the middle of him is ANIM_BODY_MID_CELLS up
// the body from it (Bob's art runs from canvas y 35 to 260 and his hip is at 188: the middle is
// 40.5 units, 1.09 cells, toward the head), turned with him. Height: just over the head of a man
// standing (4.4 over the hip; his head top is 4.12), just over a man lying down, who is only his own
// thickness tall (2.2), and in between as he turns. A turn is drawn outside the mirror, so flip
// does not change which way the head points.
export const ANIM_BODY_MID_CELLS = 7 * (40.5 / 260);
export const animPromptLift = (v) => 4.4 - 2.2 * Math.abs(Math.sin(((+(v && v.rot) || 0) * Math.PI) / 180));
export const animActorPromptSpot = (v) => {
  const r = ((+(v && v.rot) || 0) * Math.PI) / 180;
  return { x: v.x + Math.sin(r) * ANIM_BODY_MID_CELLS, y: v.y - animPromptLift(v) };
};
// ── "WALK UP + E". Its states before the one E starts are SCENERY: they play while YOU are still
// playing, so the actor is not drawn in them — you are. The first loops from the moment the level
// is up (the helicopter hovering); walking into the stage plays the rest by themselves, the last of
// them holding (looping if it loops) with its prompt up until E (the rope let down, then swaying).
// Blake's ending (2026-10-13): "it is dropping down a rope, and you grab the rope and fly off" —
// the drop is the helicopter's, so it happens as you get there, and the grab is yours.
// With E on the second state (eState "", every animation made before this) the walk-in is nothing,
// exactly as before.
export const animReachAt = (anim) => {
  const states = (anim && anim.states) || [];
  if (states.length < 2) return 0;
  const i = anim.eState ? states.findIndex((s) => s.id === anim.eState) : -1;
  return i >= 1 ? i : 1;
};
// The state whose prompt (and prompt layer) shows while you stand there: the last scenery one.
export const animReachPromptState = (anim) => ((anim && anim.states) || [])[Math.max(0, animReachAt(anim) - 1)] || null;
export const animActorShown = (anim, si) => !(anim && anim.trigger === "reach" && (si === 0 || si < animReachAt(anim)));
// One step of the walk-in, from { si: 1, t: 0, el: 0 }: the scenery states play through, and the
// last one holds as if it waited for E (it does — but E is taken by the loop, never by this).
// `ready` once that last one is reached: the rope is down, the prompt can go up.
export const animSceneryStep = (anim, pos, dt) => {
  const at = animReachAt(anim), last = at - 1;
  if (last < 1) return null;
  const states = anim.states.slice(0, at).map((s, i) => (i === last ? { ...s, wait: true, fadeIn: 0 } : s));
  const nx = animStep({ ...anim, states }, pos, dt, false);
  return { si: nx.si, t: nx.t, el: nx.el, ready: nx.si === last };
};
// How near (cells, across) to where the actor STARTS you must stand for E. The stage is wherever its
// layers go — a helicopter's is 60 cells wide — so "inside the stage" would let E grab a rope from
// thirty cells off. And the actor starts where you stood, easing from there to its own first spot
// over ANIM_ENTRY_SECONDS, so the cut is a reach for the rope, not a jump.
export const ANIM_REACH_CELLS = 2.5;
export const ANIM_ENTRY_SECONDS = 0.35;
export const animEntryOffset = (off, el) => {
  if (!off) return { x: 0, y: 0 };
  const k = 1 - ease(clamp(num(el, 0) / ANIM_ENTRY_SECONDS, 0, 1));
  return { x: num(off.x, 0) * k, y: num(off.y, 0) * k };
};

// ── 🪢 A ROPE. Where a point of a PROP layer is drawn, in stage cells: the point (fx, fy) as
// fractions across and down its unturned box (w × h cells), through the very transform
// animPropTransform hands the browser — mirrored about the box's middle, squashed about its
// bottom-centre, turned about its middle — so a rope tied to it stays on it whatever it does.
export const animPropPoint = (v, w, h, fx, fy) => {
  const sx = num(v && v.sx, 1), sy = num(v && v.sy, 1), r = ((+(v && v.rot) || 0) * Math.PI) / 180;
  let qx = (num(fx, 0.5) - 0.5) * w;
  const qy = (num(fy, 1) - 0.5) * h;
  if (v && v.flip) qx = -qx;
  const X = qx * sx, Y = sy * (qy - h / 2) + h / 2;
  return [num(v && v.x, 0) + X * Math.cos(r) - Y * Math.sin(r), num(v && v.y, 0) - h / 2 + X * Math.sin(r) + Y * Math.cos(r)];
};
// Where the actor's raised hands are, in stage cells (`body` as animClothShape takes it): the tip of
// whichever arm reaches highest up the body — the far edge of an arm turned up about its shoulder.
// null when nothing on it is an arm.
export const animHandsAt = (body) => {
  if (!body || !Array.isArray(body.parts)) return null;
  let best = null;
  for (const p of body.parts) {
    if (!p || !p.arm || !Array.isArray(p.pts) || p.pts.length < 2) continue;
    const s = p.pts.slice().sort((a, b) => a[1] - b[1]);
    const tip = [(s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2];
    if (!best || tip[1] < best[1]) best = tip;
  }
  if (!best) return null;
  const r = ((+body.rot || 0) * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r), lx = best[0] * (body.flip ? -1 : 1), ly = best[1];
  return [num(body.x, 0) + lx * c - ly * s, num(body.y, 0) + lx * s + ly * c];
};
export const ROPE = { w: 0.15, edge: 0.05, knot: 0.14, period: 2.6, bend: 0.55, segs: 12 };
// Manila rope with the house dark edge.
export const ROPE_LOOK = { fill: "#c8a165", edge: "#1d1b1b" };
// The rope at one moment: { pts (a line, stage cells), knot ([x, y] | null) }, or null when none is
// out. `top` is where it hangs from, `hands` the actor's (animHandsAt) when it is held, `clock`
// seconds (a free end sways on it, like a prop's own frames run on it, so the sway never jumps at a
// state change). Held, it runs straight from the top to the hands — he hangs on it — and whatever
// is left over hangs straight down from his hands. Free, it hangs `drop` long, swinging `swing`°
// either way, its lower half swinging further than its upper (a rope bends, a stick does not).
export const animRopeShape = (v, top, hands, clock) => {
  const drop = Math.max(0, num(v && v.drop, 0));
  if (!top || drop < 0.02) return null;
  const [tx, ty] = top;
  if (v && v.hold && hands) {
    const [hx, hy] = hands, d = Math.hypot(hx - tx, hy - ty), tail = Math.max(0, drop - d);
    const pts = [[tx, ty], [hx, hy]];
    if (tail > 0.02) pts.push([hx, hy + tail]);
    return { pts, knot: tail > 0.02 ? [hx, hy + tail] : null };
  }
  const a = ((num(v && v.swing, 0) * Math.PI) / 180) * Math.sin((2 * Math.PI * num(clock, 0)) / ROPE.period);
  const end = [tx + drop * Math.sin(a), ty + drop * Math.cos(a)];
  const mid = [tx + 0.5 * drop * Math.sin(a * ROPE.bend), ty + 0.5 * drop * Math.cos(a * ROPE.bend)];
  // The quadratic through the middle point (the Curve tool's rule, curveBandPoints).
  const k = [2 * mid[0] - (tx + end[0]) / 2, 2 * mid[1] - (ty + end[1]) / 2], pts = [];
  for (let i = 0; i <= ROPE.segs; i++) { const u = i / ROPE.segs, w = 1 - u; pts.push([w * w * tx + 2 * w * u * k[0] + u * u * end[0], w * w * ty + 2 * w * u * k[1] + u * u * end[1]]); }
  return { pts, knot: end };
};

// ── 🛏 A BLANKET (a "cloth" layer), worked out fresh every frame from what lies under it.
//
// Seen from the side, a blanket is its top surface over the bed and whatever is in it, and the side
// that hangs down over the mattress to its hem. So its shape is a height line from the head end to
// the foot end, filled down to the hem. The height line rests on
//   - the actor's parts that are UNDER it: toward the foot from its head end, and no further up the
//     body than `cover` (cells above the hip, along the body, so it turns with him: lying down it
//     reaches his neck, sat up his waist);
//   - an arm just past the head end, which carries the edge up as it comes out from under it (Blake:
//     "the blanket should likely rise when the player reaches back for the alarm"), by less the
//     further past the edge it is;
//   - the bare mattress (`bed`) everywhere else;
// sits its own thickness above them, never falls away steeper than CLOTH.slope (a raised arm makes a
// tent, not a spike), and is softened. It starts at its head end, or further toward the foot when
// nothing of him is under it up there (sat up, it is in his lap, not lying flat behind him). Its
// LENGTH is the cloth there is (`len`): measured along that line, what is left over bunches up at the
// head end into folds (sat up, it is bunched in his lap; thrown to the foot, it is a heap). `lift`
// raises the head end whole, hem and all — a throw — so what it lay on shows under it. Nothing is
// kept between frames, so a scrubbed timeline and a played one draw the same blanket.
export const CLOTH = { step: 0.05, thick: 0.2, slope: 1.1, reach: 1.4, liftSpan: 1.4, fly: 0.7, band: 0.32, seam: 0.06,
  scallopGap: 0.31, scallopR: 0.13, dotGap: 0.5, dotRow: 0.4, dotFirst: 0.3, dotR: 0.08 };
// Blake's blanket (blnkt01): rust quilt, light dots, the cream sheet turned down over its head end.
export const CLOTH_LOOK = { fill: "#c1440e", dot: "#e8743a", sheet: "#f5f5dc", seam: "#9e3609" };
// Sutherland–Hodgman: the part of a convex polygon where keep(p) >= 0.
const clipPoly = (pts, keep) => {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ka = keep(a), kb = keep(b);
    if (ka >= 0) out.push(a);
    if ((ka >= 0) !== (kb >= 0)) { const u = ka / (ka - kb); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); }
  }
  return out;
};
// A convex polygon's highest point (least y) on the upright line at x, or null when x misses it.
const polyTopAt = (pts, x) => {
  let top = null;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]);
    if (x < lo - 1e-9 || x > hi + 1e-9) continue;
    const y = hi - lo < 1e-9 ? Math.min(a[1], b[1]) : a[1] + (b[1] - a[1]) * clamp((x - a[0]) / (b[0] - a[0]), 0, 1);
    if (top === null || y < top) top = y;
  }
  return top;
};
// The actor's parts in stage cells, cut off above `cover`. `body` = { x, y, rot, flip, parts: [{ pts,
// arm }] }, each part's corners relative to the hip in the upright, unturned body (cells, y down):
// App.js draws bodies and knows what an arm is, this file only needs outlines. Turned like the
// drawn actor: mirrored first, then turned about the hip.
const clothBodyParts = (body, cover) => {
  if (!body || !Array.isArray(body.parts)) return [];
  const r = ((+body.rot || 0) * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r), fl = body.flip ? -1 : 1;
  const bx = num(body.x, 0), by = num(body.y, 0), out = [];
  for (const p of body.parts) {
    if (!p || !Array.isArray(p.pts) || p.pts.length < 3) continue;
    const kept = clipPoly(p.pts, (q) => q[1] + cover);
    if (kept.length >= 3) out.push({ arm: !!p.arm, pts: kept.map(([lx, ly]) => [bx + lx * fl * c - ly * s, by + lx * fl * s + ly * c]) });
  }
  return out;
};
const lump = (u, c, r) => (Math.abs(u - c) >= r ? 0 : Math.cos((Math.PI / 2) * ((u - c) / r)) ** 2);
// A bunch is three rolls of cloth, the middle one tallest (u runs 0..1 across the bunch).
const CLOTH_ROLLS = [{ c: 0.2, r: 0.26, a: 0.72 }, { c: 0.5, r: 0.32, a: 1 }, { c: 0.81, r: 0.25, a: 0.66 }];
const rollsAt = (u) => Math.max(...CLOTH_ROLLS.map((q) => q.a * lump(u, q.c, q.r)));
// The blanket at one moment, in stage cells: { body (outline, filled), band (the sheet) | null, seam
// (a line) | null, dots, scallops (circles along the hem), folds (lines), patch (the sheet showing in
// a heap) | null, spare (cloth bunched, cells) }. `v` its values now, `layer` its len and bed, `body`
// the actor (or null).
export const animClothShape = (v, layer, body) => {
  if (!v) return null;
  const C = CLOTH;
  // Worked out with its head end on the left; a mirrored stage is the same blanket turned round.
  const m = num(v.x, 0) > num(v.fx, 0) ? -1 : 1;
  const bed = num(layer && layer.bed, 7), hem = num(v.y, bed + 0.7), len = Math.max(0.5, num(layer && layer.len, 6));
  const xh = m * num(v.x, 0), xfo = m * num(v.fx, 0), lift = Math.max(0, num(v.lift, 0));
  const parts = clothBodyParts(body, num(v.cover, 2.8)).map((p) => (m < 0 ? { arm: p.arm, pts: p.pts.map(([x, y]) => [-x, y]) } : p));
  let x0 = Infinity;
  for (const p of parts) for (const q of clipPoly(p.pts, (pt) => pt[0] - xh)) if (q[0] < x0) x0 = q[0];
  x0 = x0 === Infinity ? xh : Math.max(xh, Math.min(x0, xfo - 0.2));
  const xf = Math.max(x0 + 0.2, xfo);
  const n = Math.max(2, Math.ceil((xf - x0) / C.step - 1e-9) + 1), dx = (xf - x0) / (n - 1);
  const X = [], S = [];
  for (let i = 0; i < n; i++) { X.push(x0 + dx * i); S.push(bed); }
  for (const p of parts) {
    let lo = Infinity, hi = -Infinity;
    for (const q of p.pts) { lo = Math.min(lo, q[0]); hi = Math.max(hi, q[0]); }
    for (let i = Math.max(0, Math.ceil((lo - x0) / dx - 1e-9)); i <= Math.min(n - 1, Math.floor((hi - x0) / dx + 1e-9)); i++) {
      const t = polyTopAt(p.pts, X[i]);
      if (t !== null && t < S[i]) S[i] = t;
    }
    const a = Math.max(lo, x0 - C.reach), b = Math.min(hi, x0);
    if (p.arm && b > a) for (let k = 0; k <= 10; k++) {
      const x = a + ((b - a) * k) / 10, t = polyTopAt(p.pts, x);
      if (t === null) continue;
      const d = (x0 - x) / C.reach, w = d <= 0.35 ? 1 : 1 - ease(clamp((d - 0.35) / 0.65, 0, 1));
      S[0] = Math.min(S[0], bed - (bed - t) * w);
    }
  }
  // WHEN IT STARTS ON HIM, ITS HEAD END LIES ACROSS HIM. Sitting up, nothing of him reaches back to
  // the blanket's own head end: it starts at his back, where `cover` cuts across his body, and that
  // cut climbs steeply to his front as he rises (at 74° it rises 3.6 cells for every one across).
  // The slope limit below — there so a raised arm makes a tent, not a spike — tented over that climb
  // from his front, and the hollow-filling blur did the same, so the head end stood up to two cells
  // above the cut: a wall with the sheet down its face that his shoulders and back slid behind
  // (Blake, 2026-10-13: "the edge of the blanket sort of clipping through the player as they are
  // sitting up"). So the stretch where it climbs from that start is kept to what is under it, plus
  // its own thickness. Lying down it starts at its own head end (x0 === xh), and nothing changes.
  const S0 = S.slice();
  let hug = -1;
  if (x0 > xh + 1e-6 && S0[0] < bed - 1e-6) { hug = 0; while (hug + 1 < n && S0[hug + 1] <= S0[hug] + 1e-9) hug++; }
  const k = C.slope * dx;
  for (let i = 1; i < n; i++) S[i] = Math.min(S[i], S[i - 1] + k);
  for (let i = n - 2; i >= 0; i--) S[i] = Math.min(S[i], S[i + 1] + k);
  for (let i = 0; i <= hug; i++) S[i] = S0[i];
  const blur = (arr, r, passes) => { let b = arr; for (let p = 0; p < passes; p++) b = b.map((_, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - r); j <= Math.min(n - 1, i + r); j++) { s += b[j]; c++; } return s / c; }); return b; };
  // Hollows filled in (cloth bridges them) but never pulled down into him; then its corners rounded.
  const H = blur(S, 4, 2);
  const T = blur(S.map((s, i) => Math.min(s, H[i]) - C.thick), 2, 2);
  for (let i = 0; i <= hug; i++) T[i] = Math.max(T[i], S0[i] - C.thick);
  // What is left once it reaches from its head end to its foot end bunches up at the head end.
  let A = 0;
  for (let i = 1; i < n; i++) A += Math.hypot(dx, T[i] - T[i - 1]);
  const spare = Math.max(0, len - A), xs = x0;
  // Thrown, it spreads out rather than bunching (half as high at full lift).
  const wB = Math.max(0.2, Math.min(xf - xs, 0.55 + 0.32 * spare)), hB = Math.min(1.15, 0.24 * spare, 0.45 * wB) * (1 - 0.5 * clamp(lift / 1.5, 0, 1));
  // Rolls, not points: the valleys between them are rounded off.
  if (hB > 0) { const R = blur(X.map((x) => { const u = (x - xs) / wB; return u < 1 ? hB * rollsAt(u) : 0; }), 3, 2); for (let i = 0; i < n; i++) T[i] -= R[i]; }
  // A throw: the head end goes up WHOLE, hem and all, so what it lay on shows underneath, easing
  // back down to the foot end, which stays on the bed. Its hanging side swings up further than its
  // top (CLOTH.fly), so a blanket in the air is a sheet, not the slab it is lying down.
  const Bt = X.map(() => hem), span = Math.max(C.liftSpan, 0.8 * (xf - xs));
  if (lift > 0) for (let i = 0; i < n; i++) { const u = (X[i] - xs) / span; if (u < 1) { const p = lift * Math.cos((Math.PI / 2) * u) ** 2; T[i] -= p; Bt[i] = Math.max(T[i] + 0.5, Bt[i] - p * (1 + C.fly)); } }
  const at = (arr, x) => { const f = clamp((x - x0) / dx, 0, n - 1), i = Math.min(n - 2, Math.floor(f)); return arr[i] + (arr[i + 1] - arr[i]) * (f - i); };
  const topAt = (x) => at(T, x), botAt = (x) => at(Bt, x);
  const out = { body: [], band: null, seam: null, dots: [], scallops: [], folds: [], patch: null, spare };
  for (let i = 0; i < n; i++) out.body.push([X[i], T[i]]);
  const tl = T[n - 1], bl = Bt[n - 1];
  for (let s = 1; s <= 8; s++) { const u = (s / 8) * (Math.PI / 2); out.body.push([xf + 0.18 * Math.sin(u), tl + (bl - tl) * (1 - Math.cos(u))]); }
  for (let i = n - 1; i >= 0; i--) out.body.push([X[i], Bt[i]]);
  // The sheet turned down over the head end, narrowing as it is folded into a bunch.
  const bandW = C.band * clamp(1 - (spare - 0.8) / 2.2, 0, 1), xb = xs + bandW;
  if (bandW > 0.02) {
    const band = [];
    for (let i = 0; i < n && X[i] <= xb; i++) band.push([X[i], T[i]]);
    band.push([xb, topAt(xb)], [xb, botAt(xb)]);
    for (let i = n - 1; i >= 0; i--) if (X[i] <= xb) band.push([X[i], Bt[i]]);
    out.band = band;
    out.seam = [[xb, topAt(xb)], [xb, botAt(xb)]];
  }
  // The pattern rides the cloth: measured from the foot end along the top, then down its side.
  const U = new Array(n).fill(0);
  for (let i = n - 2; i >= 0; i--) U[i] = U[i + 1] + Math.hypot(dx, T[i + 1] - T[i]);
  const along = (u) => { let i = n - 2; while (i > 0 && U[i] < u) i--; const f = clamp(U[i] - U[i + 1] > 1e-9 ? (u - U[i + 1]) / (U[i] - U[i + 1]) : 0, 0, 1); return [X[i + 1] - dx * f, T[i + 1] + (T[i] - T[i + 1]) * f]; };
  const deepest = Math.max(...Bt.map((b, i) => b - T[i]));
  for (let row = 0; C.dotFirst + row * C.dotRow < deepest; row++) {
    const dv = C.dotFirst + row * C.dotRow;
    for (let u = 0.25 + (row % 2 ? C.dotGap / 2 : 0); u < U[0]; u += C.dotGap) {
      const [px, py] = along(u), y = py + dv;
      if (y < botAt(px) - 0.17 && px > xb + 0.12 && px < xf - 0.1) out.dots.push([px, y, C.dotR]);
    }
  }
  for (let x = xs + C.scallopR; x <= xf + 0.05; x += C.scallopGap) out.scallops.push([x, botAt(x) - 0.02, C.scallopR]);
  // Folds: a crease down from each valley between the rolls of a bunch.
  if (hB > 0.12) for (let j = 0; j + 1 < CLOTH_ROLLS.length; j++) {
    const uv = (CLOTH_ROLLS[j].c + CLOTH_ROLLS[j].r * 0.55 + CLOTH_ROLLS[j + 1].c - CLOTH_ROLLS[j + 1].r * 0.55) / 2;
    const x = xs + uv * wB, y = topAt(x) + 0.04, deep = Math.min(0.9, 0.25 + hB * 0.45);
    out.folds.push([[x, y], [x - 0.06, y + deep * 0.5], [x - 0.16, y + deep]]);
  }
  // A heap shows a crumple of the sheet on its top roll.
  const pk = clamp((spare - 1.6) / 1.6, 0, 1);
  if (pk > 0) {
    const cx = xs + 0.5 * wB, cy = topAt(cx) + 0.2, pw = 0.72 * pk, ph = 0.28 * pk;
    out.patch = [[0, 0.667], [0.516, 0], [1, 0.208], [0.613, 1]].map(([a, b]) => [cx - pw / 2 + a * pw, cy - ph / 2 + b * ph]);
  }
  if (m < 0) {
    const fl = (pts) => pts && pts.map((p) => [-p[0], ...p.slice(1)]);
    out.body = fl(out.body); out.band = fl(out.band); out.seam = fl(out.seam); out.dots = fl(out.dots); out.scallops = fl(out.scallops);
    out.folds = out.folds.map(fl); out.patch = fl(out.patch);
  }
  return out;
};

// ── Editing. Each returns a NEW record; nothing here mutates what it is handed.
export const animKeyIndexAt = (state, t) => ((state && state.keys) || []).findIndex((k) => Math.abs(k.t - t) <= ANIM_KEY_EPS);
const withState = (anim, si, fn) => ({ ...anim, states: anim.states.map((s, i) => (i === si ? fn(s) : s)) });
// The whole picture at `t` frozen into one key's values, so a key added between two others starts
// out looking exactly like the moment it was added at.
const snapshotAt = (anim, st, t) => { const v = {}; for (const l of anim.layers) { const lv = animLayerAt(anim, st, l, t); for (const f of Object.keys(lv)) if (ANIM_NUM_FIELDS.includes(f)) lv[f] = round3(lv[f]); v[l.id] = lv; } return v; };
export const animAddKey = (anim, si, t, mkId) => {
  const st = anim.states[si];
  if (!st) return { anim, keyId: null };
  const at = animKeyIndexAt(st, t);
  if (at >= 0) return { anim, keyId: st.keys[at].id };
  const key = { id: mkId(), t: round3(clamp(t, 0, animStateDur(st))), v: snapshotAt(anim, st, t) };
  return { anim: withState(anim, si, (s) => ({ ...s, keys: [...s.keys, key].sort((x, y) => x.t - y.t) })), keyId: key.id };
};
// Set some values of one layer at the playhead. On a key, that key changes; between keys, a new
// key is made there first (the usual animation-editor rule — you edit the moment you are looking at).
export const animSetValues = (anim, si, t, layerId, patch, mkId) => {
  const { anim: a1, keyId } = animAddKey(anim, si, t, mkId);
  if (!keyId) return a1;
  const st0 = a1.states[si];
  return withState(a1, si, (s) => ({ ...s, keys: s.keys.map((k) => {
    if (k.id !== keyId) return k;
    const layer = a1.layers.find((l) => l.id === layerId);
    const cur = k.v[layerId] || (layer ? animLayerAt(a1, st0, layer, k.t) : {});
    return { ...k, v: { ...k.v, [layerId]: { ...cur, ...patch } } };
  }) }));
};
// The same change at EVERY key of one layer, in every state — the editor's "Move: All keys". Each
// state's first key holds its own copy of where everything is (animAddState snapshots it), so a bed
// moved at one key jumped back at the next state's first key, and moving a prop that never moves
// meant one drag per state lined up by eye. `delta` is added to number fields ({ x: 0.5, fx: 0.5 });
// a key that leaves a field out carries the shifted one over, and a state that never says where
// the layer is gets the shifted default at its first key.
export const animShiftLayer = (anim, layerId, delta) => {
  const layer = anim.layers.find((l) => l.id === layerId);
  const fields = Object.keys(delta || {}).filter((f) => ANIM_NUM_FIELDS.includes(f) && num(delta[f], 0) !== 0);
  if (!layer || !fields.length) return anim;
  return { ...anim, states: anim.states.map((st) => {
    if (!st.keys.length) return st;
    const keys = st.keys.map((k) => ({ ...k, v: { ...k.v } }));
    for (const f of fields) {
      let said = false;
      for (const k of keys) {
        const lv = k.v[layerId];
        if (lv && typeof lv[f] === "number") { k.v[layerId] = { ...lv, [f]: round3(lv[f] + delta[f]) }; said = true; }
      }
      if (!said) keys[0].v[layerId] = { ...(keys[0].v[layerId] || {}), [f]: round3(num(animLayerAt(anim, st, layer, keys[0].t)[f], 0) + delta[f]) };
    }
    return { ...st, keys };
  }) };
};
export const animDeleteKey = (anim, si, keyId) => withState(anim, si, (s) => (s.keys.length <= 1 ? s : { ...s, keys: s.keys.filter((k) => k.id !== keyId) }));
export const animMoveKey = (anim, si, keyId, t) => withState(anim, si, (s) => ({ ...s, keys: s.keys.map((k) => (k.id === keyId ? { ...k, t: round3(clamp(t, 0, animStateDur(s))) } : k)).sort((x, y) => x.t - y.t) }));
export const animSetState = (anim, si, patch) => withState(anim, si, (s) => ({ ...s, ...patch }));
// A new state starts where the one before it ENDS, so the scene does not jump at the join.
export const animAddState = (anim, afterSi, mkId) => {
  const prev = anim.states[afterSi];
  const st = newAnimState(mkId, "State " + (anim.states.length + 1));
  if (prev) st.keys = [{ id: mkId(), t: 0, v: snapshotAt(anim, prev, animStateDur(prev)) }];
  const states = anim.states.slice();
  states.splice(afterSi + 1, 0, st);
  return { ...anim, states };
};
export const animDeleteState = (anim, si) => (anim.states.length <= 1 ? anim : { ...anim, states: anim.states.filter((_, i) => i !== si) });
export const animMoveState = (anim, si, dir) => {
  const j = si + dir;
  if (j < 0 || j >= anim.states.length) return anim;
  const states = anim.states.slice(); const [s] = states.splice(si, 1); states.splice(j, 0, s);
  return { ...anim, states };
};
export const animAddLayer = (anim, layer) => ({ ...anim, layers: [...anim.layers, layer] });
export const animSetLayer = (anim, layerId, patch) => ({ ...anim, layers: anim.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)) });
export const animRemoveLayer = (anim, layerId) => {
  const l = anim.layers.find((x) => x.id === layerId);
  if (!l || l.kind === "actor") return anim;
  return {
    ...anim,
    layers: anim.layers.filter((x) => x.id !== layerId),
    states: anim.states.map((s) => ({ ...s, keys: s.keys.map((k) => { const v = { ...k.v }; delete v[layerId]; return { ...k, v }; }) })),
  };
};
// Draw order: later in the list draws in front. `dir` +1 brings it forward.
export const animMoveLayer = (anim, layerId, dir) => {
  const i = anim.layers.findIndex((l) => l.id === layerId), j = i + dir;
  if (i < 0 || j < 0 || j >= anim.layers.length) return anim;
  const layers = anim.layers.slice(); const [l] = layers.splice(i, 1); layers.splice(j, 0, l);
  return { ...anim, layers };
};

// ── In a level. The 🎬 marker's cell is the stage's BOTTOM-LEFT cell, so a stage built on its
// floor line stands on the row you clicked above the ground. In level pixels:
export const animStageBox = (r, c, anim, cell) => ({ x: c * cell, y: (r + 1) * cell - num(anim && anim.h, 9) * cell, w: num(anim && anim.w, 14) * cell, h: num(anim && anim.h, 9) * cell });
// Mirroring a level moves a 🎬 marker to the other end of its stage and turns the stage round.
// `w` is the stage width the marker was placed with (the anim itself is not to hand when a level
// is flipped, and a later edit to the width is not this level's business).
export const animMarkerFlipped = (r, c, m, cols) => {
  const w = Math.max(1, Math.round(num(m && m.w, 1)));
  return { key: r + "," + Math.max(0, cols - c - w), marker: { ...m, flip: !(m && m.flip) } };
};
