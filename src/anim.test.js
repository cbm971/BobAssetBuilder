import { newAnim, migrateAnim, animLayerAt, animFrame, animMirrorValues, animStep, animFadeAt, animPromptUp, animActorShown, animKeyIndexAt, animAddKey, animSetValues, animDeleteKey, animMoveKey, animAddState, animDeleteState, animMoveState, animAddLayer, animRemoveLayer, animMoveLayer, animStageBox, animMarkerFlipped, ANIM_STAND_HIP_CELLS } from "./anim";

let seq = 0;
const mkId = () => "id" + (++seq);
// A two-state animation built the way the editor builds one: an actor and a prop, keys by hand.
const fixture = () => {
  const a = migrateAnim({ ...newAnim(mkId), id: "a1" }, mkId);
  const actor = a.layers[0];
  const prop = { id: "prop1", kind: "prop", name: "Bed", propId: "bed", size: 10 };
  let b = animAddLayer(a, prop);
  b = { ...b, states: [
    { ...b.states[0], name: "Asleep", dur: 1, wait: true, loop: true, prompt: "Press E to wake up", fadeIn: 2, keys: [
      { id: "k0", t: 0, v: { [actor.id]: { x: 5, y: 6, rot: -90, pose: "side", legs: 0 }, prop1: { x: 7, y: 9, show: 1, play: true } } },
      { id: "k1", t: 0.5, v: { prop1: { rot: 10 } } },
    ] },
    { id: "s2", name: "Get up", dur: 2, wait: false, loop: false, prompt: "", fadeIn: 0, fadeOut: 0.5, sound: "", soundVol: 1, keys: [
      { id: "g0", t: 0, v: { [actor.id]: { x: 5, y: 6, rot: -90, pose: "side", legs: 0 } } },
      { id: "g1", t: 1, v: { [actor.id]: { x: 5, y: 6.5, rot: 0, pose: "front", legs: 90 } } },
    ] },
  ] };
  return { anim: migrateAnim(b, mkId), actor, prop };
};

describe("🎬 animations — migrateAnim", () => {
  test("a blank record comes back whole: one actor, one state, one key", () => {
    const a = migrateAnim({ id: "x" }, mkId);
    expect(a.type).toBe("anim");
    expect(a.layers.filter((l) => l.kind === "actor")).toHaveLength(1);
    expect(a.states).toHaveLength(1);
    expect(a.states[0].keys).toHaveLength(1);
    expect(a.angles).toEqual({ front: [], back: [], side: [], up: [], crouch: [] });
  });
  test("keys are sorted, a second actor is dropped, values for a deleted layer are cleared", () => {
    const a = migrateAnim({ id: "x", layers: [{ id: "A", kind: "actor" }, { id: "B", kind: "actor" }], states: [{ keys: [{ id: "k2", t: 2, v: { A: { x: 1 }, gone: { x: 9 } } }, { id: "k1", t: 1, v: {} }] }] }, mkId);
    expect(a.layers.map((l) => l.id)).toEqual(["A"]);
    expect(a.states[0].keys.map((k) => k.id)).toEqual(["k1", "k2"]);
    expect(a.states[0].keys[1].v.gone).toBeUndefined();
  });
  test("a state's prompt can hang by a layer that exists, lifted a clamped amount", () => {
    const a = migrateAnim({ id: "x", layers: [{ id: "A", kind: "actor" }, { id: "clock", kind: "prop", propId: "p" }], states: [{ wait: true, promptLayer: "clock", promptLift: 99, keys: [] }, { promptLayer: "gone", keys: [] }] }, mkId);
    expect(a.states[0]).toMatchObject({ promptLayer: "clock", promptLift: 20 });
    expect(a.states[1]).toMatchObject({ promptLayer: "", promptLift: 0 });
  });
  test("out-of-range fields are clamped, unknown trigger and ending fall back", () => {
    const a = migrateAnim({ id: "x", w: 500, h: 0, trigger: "huh", ending: "?", states: [{ dur: 999, fadeIn: -3, soundVol: 7, keys: [] }] }, mkId);
    expect(a.w).toBe(80); expect(a.h).toBe(2);
    expect(a.trigger).toBe("start"); expect(a.ending).toBe("play");
    expect(a.states[0].dur).toBe(60); expect(a.states[0].fadeIn).toBe(0); expect(a.states[0].soundVol).toBe(2);
  });
});

describe("🎬 animations — values at a moment", () => {
  test("numbers ease between keys; pose switches AT the key", () => {
    const { anim, actor } = fixture();
    const st = anim.states[1];
    expect(animLayerAt(anim, st, actor, 0).rot).toBe(-90);
    expect(animLayerAt(anim, st, actor, 0.5).rot).toBeCloseTo(-45, 5); // smoothstep is symmetric about the middle
    expect(animLayerAt(anim, st, actor, 0.25).rot).toBeLessThan(-67.5); // ...and slow off the first key
    expect(animLayerAt(anim, st, actor, 0.99).pose).toBe("side");
    expect(animLayerAt(anim, st, actor, 1).pose).toBe("front");
    expect(animLayerAt(anim, st, actor, 5).legs).toBe(90); // past the last key: held
  });
  test("a key that leaves a field out carries it from the key before", () => {
    const { anim, prop } = fixture();
    const v = animLayerAt(anim, anim.states[0], prop, 0.5);
    expect(v.rot).toBe(10);
    expect(v.x).toBe(7);
    expect(v.play).toBe(true);
  });
  test("a layer no key mentions sits at its defaults", () => {
    const { anim } = fixture();
    const extra = { id: "new", kind: "prop", name: "x", propId: "p", size: 2 };
    const a2 = animAddLayer(anim, extra);
    expect(animLayerAt(a2, a2.states[0], extra, 0.3)).toMatchObject({ x: anim.w / 2, y: anim.h, show: 1, rot: 0 });
    expect(animFrame(a2, 0, 0)).toHaveProperty("new");
  });
  test("an actor's default stands on the stage floor", () => {
    const a = migrateAnim({ id: "x" }, mkId);
    expect(animLayerAt(a, a.states[0], a.layers[0], 0).y).toBeCloseTo(a.h - ANIM_STAND_HIP_CELLS, 5);
  });
  test("mirroring the stage moves x across it, toggles flip, turns the other way", () => {
    expect(animMirrorValues({ x: 3, rot: 20, flip: false, y: 2 }, 10)).toEqual({ x: 7, rot: -20, flip: true, y: 2 });
  });
});

describe("🎬 animations — playing", () => {
  test("a waiting, looping state goes round until E, and E waits for the fade-in", () => {
    const { anim } = fixture();
    let pos = animStep(anim, { si: 0, t: 0, el: 0 }, 1.5, true); // E during the 2 s fade: ignored
    expect(pos).toMatchObject({ si: 0, waiting: true, done: false });
    expect(pos.t).toBeCloseTo(0.5, 5); // 1.5 s on a 1 s loop
    expect(pos.el).toBeCloseTo(1.5, 5);
    pos = animStep(anim, pos, 0.6, false);
    expect(pos.si).toBe(0);
    pos = animStep(anim, pos, 0.01, true);
    expect(pos).toMatchObject({ si: 1, t: 0, el: 0, done: false });
  });
  test("a state that does not wait plays through, carrying the overshoot, and the last one ends", () => {
    const { anim } = fixture();
    let pos = animStep(anim, { si: 1, t: 0, el: 0 }, 1.25, false);
    expect(pos.t).toBeCloseTo(1.25, 5);
    pos = animStep(anim, pos, 1, false);
    expect(pos).toMatchObject({ si: 1, t: 2, done: true });
  });
  test("non-waiting states chain within one step", () => {
    const a = migrateAnim({ id: "x", states: [{ dur: 0.5, keys: [] }, { dur: 0.5, keys: [] }, { dur: 1, keys: [] }] }, mkId);
    const pos = animStep(a, { si: 0, t: 0 }, 1.2, false);
    expect(pos.si).toBe(2);
    expect(pos.t).toBeCloseTo(0.2, 5);
  });
  test("the fade follows elapsed time on a loop, and fades out at a state's end", () => {
    const { anim } = fixture();
    expect(animFadeAt(anim, 0, 0.5, 0.5)).toBeCloseTo(0.75, 5);
    expect(animFadeAt(anim, 0, 0.5, 1.5)).toBeCloseTo(0.25, 5); // same t, a lap later: lighter, not black again
    expect(animFadeAt(anim, 1, 1, 1)).toBe(0);
    expect(animFadeAt(anim, 1, 1.75, 1.75)).toBeCloseTo(0.5, 5);
  });
  test("the prompt shows only on a waiting state, after its fade-in", () => {
    const { anim } = fixture();
    expect(animPromptUp(anim, 0, 1)).toBe(false);
    expect(animPromptUp(anim, 0, 2.1)).toBe(true);
    expect(animPromptUp(anim, 1, 5)).toBe(false);
  });
  test("a Walk-up animation hides its actor in the first state, where the player is still playing", () => {
    const { anim } = fixture();
    expect(animActorShown(anim, 0)).toBe(true);
    const reach = { ...anim, trigger: "reach" };
    expect(animActorShown(reach, 0)).toBe(false);
    expect(animActorShown(reach, 1)).toBe(true);
  });
});

describe("🎬 animations — editing", () => {
  test("setting a value between keys makes a key there that holds the whole picture", () => {
    const { anim, actor, prop } = fixture();
    const a2 = animSetValues(anim, 1, 0.5, actor.id, { arms: 120 }, mkId);
    const st = a2.states[1];
    expect(st.keys).toHaveLength(3);
    const k = st.keys[animKeyIndexAt(st, 0.5)];
    expect(k.v[actor.id].arms).toBe(120);
    expect(k.v[actor.id].rot).toBeCloseTo(-45, 2);
    expect(k.v).toHaveProperty(prop.id);
    // ...and the moments either side are unchanged
    expect(animLayerAt(a2, st, actor, 0).rot).toBe(-90);
    expect(animLayerAt(a2, st, actor, 1).rot).toBe(0);
  });
  test("setting a value ON a key changes that key, not a new one", () => {
    const { anim, actor } = fixture();
    const a2 = animSetValues(anim, 1, 1.01, actor.id, { x: 9 }, mkId);
    expect(a2.states[1].keys).toHaveLength(2);
    expect(a2.states[1].keys[1].v[actor.id].x).toBe(9);
  });
  test("add, move and delete keys; the last key cannot go", () => {
    const { anim } = fixture();
    const { anim: a2, keyId } = animAddKey(anim, 1, 1.5, mkId);
    expect(a2.states[1].keys.map((k) => k.t)).toEqual([0, 1, 1.5]);
    const a3 = animMoveKey(a2, 1, keyId, 0.2);
    expect(a3.states[1].keys.map((k) => k.t)).toEqual([0, 0.2, 1]);
    const a4 = animDeleteKey(animDeleteKey(animDeleteKey(a3, 1, "g0"), 1, "g1"), 1, keyId);
    expect(a4.states[1].keys).toHaveLength(1);
  });
  test("a new state starts where the one before it ends", () => {
    const { anim, actor } = fixture();
    const a2 = animAddState(anim, 1, mkId);
    expect(a2.states).toHaveLength(3);
    expect(animLayerAt(a2, a2.states[2], actor, 0)).toMatchObject({ rot: 0, pose: "front", legs: 90 });
    expect(animDeleteState(a2, 2).states).toHaveLength(2);
    expect(animMoveState(a2, 2, -1).states[1].id).toBe(a2.states[2].id);
  });
  test("layers: the actor cannot be removed; a removed prop leaves no values behind; order moves", () => {
    const { anim, actor, prop } = fixture();
    expect(animRemoveLayer(anim, actor.id).layers).toHaveLength(2);
    const a2 = animRemoveLayer(anim, prop.id);
    expect(a2.layers.map((l) => l.id)).toEqual([actor.id]);
    expect(JSON.stringify(a2.states)).not.toContain("prop1");
    expect(animMoveLayer(anim, prop.id, -1).layers[0].id).toBe(prop.id);
  });
});

describe("🎬 animations — in a level", () => {
  test("the marker cell is the stage's bottom-left", () => {
    expect(animStageBox(34, 20, { w: 17, h: 9 }, 30)).toEqual({ x: 600, y: 35 * 30 - 270, w: 510, h: 270 });
  });
  test("mirroring a level moves the marker to the other end of its stage and turns the stage", () => {
    const f = animMarkerFlipped(34, 20, { kind: "anim", animId: "a", w: 17 }, 160);
    expect(f.key).toBe("34,123"); // the stage covered 20..36; mirrored it covers 123..139
    expect(f.marker.flip).toBe(true);
    expect(animMarkerFlipped(34, 123, f.marker, 160)).toEqual({ key: "34,20", marker: { kind: "anim", animId: "a", w: 17, flip: false } });
  });
});
