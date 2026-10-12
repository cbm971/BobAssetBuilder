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
 *     trigger: "start" | "reach",                    plays as the level starts / when you walk up and press E
 *     ending: "play" | "leave",                      you take over where the actor ends / the floor is done
 *     layers: [{ id, name, kind: "actor" } | { id, name, kind: "prop", propId, size }],   back to front
 *     states: [{ id, name, dur, wait, loop, prompt, fadeIn, fadeOut, sound, soundVol,
 *                keys: [{ id, t, v: { <layerId>: { x, y, rot, show, flip, pose, legs, arms, sit, play } } }] }] }
 *
 * A LAYER'S VALUES, in stage cells from the stage's top-left:
 *   actor  x,y = the HIP (the top of the legs). Lying down, sitting up and standing all turn about
 *          the hip, so a sit-up keeps its legs on the mattress while the body swings up round them.
 *   prop   x,y = the bottom-centre of the prop's box, so a prop stands on whatever y says.
 *   rot    on-screen degrees (the turn is outermost, like a placed object's — see objRotStyle)
 *   show   0..1, faded in between keys, so "the blanket goes" is a fade and not a blink
 *   flip   mirrored left↔right
 *   pose   side | front | back | crouch (the actor only)
 *   legs   degrees the legs swing forward about the hip (90 = straight out, sitting up in bed)
 *   arms   degrees the arms swing forward about the shoulder (180 = straight up, a stretch)
 *   sit    0..1, the legs shortened toward the hip — the thighs pointing at you, sat facing front
 *   play   a prop's own animation frames run (the alarm clock's ringing) or hold on the first
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
export const ANIM_TRIGGERS = [{ key: "start", label: "Level start" }, { key: "reach", label: "Walk up + E" }];
export const ANIM_ENDINGS = [{ key: "play", label: "You take over" }, { key: "leave", label: "Leave the floor" }];
export const ANIM_NUM_FIELDS = ["x", "y", "rot", "show", "legs", "arms", "sit"];
export const ANIM_STEP_FIELDS = ["flip", "pose", "play"];
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
  return { x: w / 2, y: h, rot: 0, show: 1, flip: false, play: true };
};

export const newAnimState = (mkId, name) => ({ id: mkId(), name: name || "State", dur: 2, wait: false, loop: false, prompt: "", fadeIn: 0, fadeOut: 0, sound: "", soundVol: 1, keys: [{ id: mkId(), t: 0, v: {} }] });
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
  if (!ANIM_ENDINGS.some((t) => t.key === a.ending)) a.ending = "play";
  if (!a.angles || typeof a.angles !== "object") a.angles = { front: [], back: [], side: [], up: [], crouch: [] };
  let layers = (Array.isArray(a.layers) ? a.layers : []).filter((l) => l && l.id && (l.kind === "actor" || l.kind === "prop"));
  const actors = layers.filter((l) => l.kind === "actor");
  if (actors.length > 1) layers = layers.filter((l) => l.kind !== "actor" || l === actors[0]);
  if (!actors.length) layers = [{ id: mkId ? mkId() : "actor", kind: "actor", name: "Bob" }, ...layers];
  a.layers = layers.map((l) => (l.kind === "prop" ? { ...l, name: l.name || "Prop", propId: l.propId || "", size: clamp(num(l.size, 3), 0.5, 40) } : { ...l, name: l.name || "Bob" }));
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
      fadeIn: clamp(num(s.fadeIn, 0), 0, 10), fadeOut: clamp(num(s.fadeOut, 0), 0, 10),
      sound: typeof s.sound === "string" ? s.sound : "",
      soundVol: clamp(num(s.soundVol, 1), 0, 2),
      keys,
    };
  });
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
      out[f] = num(a, 0) + (num(b, 0) - num(a, 0)) * u;
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
export const animMirrorValues = (v, w) => ({ ...v, x: w - v.x, rot: -(v.rot || 0), flip: !v.flip });

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
// How far over the actor's hip its prompt hangs, in cells: over the head of a man standing (3.6),
// lower over one lying down, who is only his own thickness tall (2.2), and in between as he turns.
export const animPromptLift = (v) => 3.6 - 1.4 * Math.abs(Math.sin(((+(v && v.rot) || 0) * Math.PI) / 180));
// A "Walk up + E" animation plays its first state as scenery while YOU are still playing (the
// copter hovering, the rope swaying), so its actor is not drawn there — you are.
export const animActorShown = (anim, si) => !(anim && anim.trigger === "reach" && si === 0);

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
