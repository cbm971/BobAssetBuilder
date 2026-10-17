import { newAnim, migrateAnim, animActorPromptSpot, ANIM_BODY_MID_CELLS, animLayerAt, animFrame, animMirrorValues, animStep, animFadeAt, animPromptUp, animActorShown, animKeyIndexAt, animAddKey, animSetValues, animShiftLayer, animDeleteKey, animMoveKey, animSetLength, animCutStart, animCutEnd, animAddState, animDeleteState, animMoveState, animAddLayer, animRemoveLayer, animMoveLayer, animStageBox, animMarkerFlipped, ANIM_STAND_HIP_CELLS, animPropTransform, animClothShape, CLOTH, animReachAt, animReachPromptState, animSceneryStep, animEntryOffset, ANIM_ENTRY_SECONDS, ANIM_PROP_SIZE_MAX, animPropPoint, animHandsAt, animRopeShape, floorEndAnim, animScreenFit } from "./anim";

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
    expect(animMirrorValues({ x: 3, sx: 0.5, sy: 1.2 }, 10)).toMatchObject({ sx: 0.5, sy: 1.2 }); // a squash about the bottom-centre is the same either way round
  });
});

describe("🎬 animations — squashing a prop (sx/sy)", () => {
  test("a prop's width and height default to as placed, and ease between keys like any number", () => {
    const { anim, prop } = fixture();
    expect(animLayerAt(anim, anim.states[0], prop, 0)).toMatchObject({ sx: 1, sy: 1 });   // the fixture's keys never mention them
    const st = { ...anim.states[1], keys: [{ id: "g0", t: 0, v: { prop1: { sx: 1, sy: 1 } } }, { id: "g1", t: 1, v: { prop1: { sx: 0.5, sy: 0.8 } } }] };
    expect(animLayerAt(anim, st, prop, 0.5).sx).toBeCloseTo(0.75, 5);
    expect(animLayerAt(anim, st, prop, 0.5).sy).toBeCloseTo(0.9, 5);
    expect(animLayerAt(anim, st, prop, 3)).toMatchObject({ sx: 0.5, sy: 0.8 });
  });
  test("unsquashed, the transform is exactly the string every older animation drew", () => {
    expect(animPropTransform({ rot: 10 }, 90)).toBe("rotate(10.00deg)");
    expect(animPropTransform({ rot: -9, flip: true, sx: 1, sy: 1 }, 90)).toBe("rotate(-9.00deg) scaleX(-1)");
  });
  test("squashed, it scales about the bottom-centre: half the height down, scale, back up", () => {
    expect(animPropTransform({ rot: 0, sx: 0.5, sy: 0.8 }, 90)).toBe("rotate(0.00deg) translateY(45.00px) scale(0.5000,0.8000) translateY(-45.00px)");
    // the box's bottom-centre (0, +45 from the middle) stays put: 45 -> 0 -> 0 -> 45
    expect(animPropTransform({ rot: 5, sx: 0.6, sy: 1, flip: true }, 40)).toMatch(/^rotate\(5\.00deg\) translateY\(20\.00px\) scale\(0\.6000,1\.0000\) translateY\(-20\.00px\) scaleX\(-1\)$/);
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
  test("the actor's prompt is centred on the body: over the hip standing, toward the head lying", () => {
    const up = animActorPromptSpot({ x: 8, y: 7, rot: 0 });
    expect(up.x).toBeCloseTo(8, 5);
    expect(up.y).toBeCloseTo(7 - 4.4, 5);
    const lying = animActorPromptSpot({ x: 8.67, y: 6, rot: -90 });
    expect(lying.x).toBeCloseTo(8.67 - ANIM_BODY_MID_CELLS, 5); // the head is to the left
    expect(lying.y).toBeCloseTo(6 - 2.2, 5);
    expect(animActorPromptSpot({ x: 8.67, y: 6, rot: -90, flip: true }).x).toBeCloseTo(lying.x, 5);
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
  test("Move: All keys moves a layer by the same amount at every key of every state", () => {
    const { anim, actor, prop } = fixture();
    const a2 = animShiftLayer(anim, prop.id, { x: 1.5, y: -0.5 });
    // State 1 said where the bed was; its second key (only a turn) carries the moved spot over.
    expect(a2.states[0].keys[0].v.prop1).toMatchObject({ x: 8.5, y: 8.5, play: true });
    expect(animLayerAt(a2, a2.states[0], prop, 0.5)).toMatchObject({ x: 8.5, y: 8.5, rot: 10 });
    // State 2 never mentioned it (it stood at the default, 7,9): it is moved there too, at its first key.
    expect(animLayerAt(a2, a2.states[1], prop, 1)).toMatchObject({ x: 8.5, y: 8.5 });
    // A moving layer keeps its motion, shifted: every key that says where the actor is moves.
    const a3 = animShiftLayer(anim, actor.id, { x: 2 });
    expect(a3.states[1].keys.map((k) => k.v[actor.id].x)).toEqual([7, 7]);
    expect(a3.states[1].keys[1].v[actor.id].y).toBe(6.5);
    // Nothing else changes, and a zero move is no change at all.
    expect(a3.states[0].keys[0].v.prop1).toEqual(anim.states[0].keys[0].v.prop1);
    expect(animShiftLayer(anim, prop.id, { x: 0 })).toBe(anim);
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
describe("🛏 a blanket (cloth layer)", () => {
  const BED = 7, HEM = 7.75;
  const layer = (len) => ({ id: "c1", kind: "cloth", name: "Blanket", len, bed: BED });
  const box = (x0, y0, x1, y1, arm) => ({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], arm: !!arm });
  // The blanket's top at x: the highest outline point over that spot (the outline is the top line, then
  // the foot end, then the hem back).
  const topAt = (g, x) => Math.min(...g.body.filter((p, i) => i < g.body.length / 2 && Math.abs(p[0] - x) < 0.03).map((p) => p[1]));
  const V = { x: 2, fx: 8, y: HEM, cover: 2.8, lift: 0, show: 1 };
  test("is a layer kind of its own: kept by migrate, eased like any number, mirrored at both ends", () => {
    const a = migrateAnim({ ...newAnim(mkId), id: "a", layers: [{ id: "b", kind: "actor" }, { id: "c", kind: "cloth" }] }, mkId);
    expect(a.layers[1]).toMatchObject({ kind: "cloth", name: "Blanket", len: 6, bed: 7 });
    const st = { keys: [{ id: "k0", t: 0, v: { c: { cover: 2.8, lift: 0, fx: 10 } } }, { id: "k1", t: 1, v: { c: { cover: 0.5, lift: 2, fx: 12 } } }] };
    expect(animLayerAt(a, st, a.layers[1], 0.5)).toMatchObject({ cover: 1.65, lift: 1, fx: 11 });
    expect(animMirrorValues({ x: 2, fx: 8, y: 7 }, 17)).toMatchObject({ x: 15, fx: 9 });
  });
  test("on an empty bed it lies flat its own thickness up, hanging to its hem, sheet at the head end", () => {
    const g = animClothShape(V, layer(6), null);
    for (const x of [2.5, 4, 6, 7.5]) expect(topAt(g, x)).toBeCloseTo(BED - CLOTH.thick, 5);
    expect(Math.max(...g.body.map((p) => p[1]))).toBeCloseTo(HEM, 5);
    expect(g.band[0][0]).toBeCloseTo(2, 5);
    expect(g.spare).toBeCloseTo(0, 5);
    expect(g.dots.length).toBeGreaterThan(5);
    for (const [x, y] of g.dots) { expect(x).toBeGreaterThan(2 + CLOTH.band); expect(y).toBeLessThan(HEM); }
    expect(g.scallops.every(([, y]) => Math.abs(y - (HEM - 0.02)) < 1e-9)).toBe(true);
  });
  test("lies OVER what is under it, never through it", () => {
    const body = { x: 5, y: 7, rot: 0, flip: false, parts: [box(-1, -1.5, 1, 0)] }; // a box 1.5 tall on the mattress
    const g = animClothShape({ ...V, cover: 5 }, layer(6), body);
    for (const x of [4.2, 5, 5.8]) expect(topAt(g, x)).toBeLessThanOrEqual(5.5 - CLOTH.thick + 0.02);
    expect(topAt(g, 7.95)).toBeCloseTo(BED - CLOTH.thick, 2); // bare mattress well away from it
  });
  test("reaches only `cover` up the body, measured along the body, so it turns with him", () => {
    const tall = box(-1, -3, 1, 0); // a torso 3 tall above the hip
    const up = animClothShape({ ...V, cover: 0.5 }, layer(4.2), { x: 5, y: 7, rot: 0, parts: [tall] });
    expect(topAt(up, 5)).toBeCloseTo(6.5 - CLOTH.thick, 1); // stops at his waist, not his head
    // Lying down (turned -90°, head to the left) the same torso runs from the hip to 3 cells left of it.
    const lying = animClothShape({ ...V, x: 1, cover: 5 }, layer(6.2), { x: 5, y: 7, rot: -90, parts: [box(-0.5, -3, 0.5, 0)] });
    expect(topAt(lying, 3.5)).toBeCloseTo(6.5 - CLOTH.thick, 1);
    expect(lying.band[0][0]).toBeCloseTo(2, 2);
  });
  test("starts at him, not on the bare mattress behind him, when nothing of him is under its head end", () => {
    const g = animClothShape({ ...V, x: 1, cover: 0.5 }, layer(6), { x: 5, y: 7, rot: 0, parts: [box(-1, -3, 1, 0)] });
    expect(g.band[0][0]).toBeCloseTo(4, 2);
  });
  test("sitting up, its head end lies across him: no wall climbing his back above the cut", () => {
    // A torso 2 wide and 3 tall, part way up (turned -60°, head to the upper left), covered 1.5
    // up the body. The cut across him rises 1.73 for every 1 across, steeper than the slope a tent
    // may fall at, which is what used to stand the head end up as a wall in front of his back.
    const body = { x: 6, y: 6.5, rot: -60, flip: false, parts: [box(-1, -3, 1, 0)] };
    const g = animClothShape({ ...V, x: 1, fx: 9, cover: 1.5 }, layer(5), body); // no cloth to spare, so no rolls
    const back = [6 - 0.5 - 1.5 * Math.sin(Math.PI / 3), 6.5 + Math.sin(Math.PI / 3) - 0.75]; // the cut's back corner
    expect(g.body[0][0]).toBeCloseTo(back[0], 1);
    // Just past it the top is the cut itself, its own thickness up — not 1.1 cells higher.
    const cutAt = (x) => back[1] - Math.tan(Math.PI / 3) * (x - back[0]);
    for (const dx of [0.05, 0.3, 0.6]) expect(topAt(g, back[0] + dx)).toBeGreaterThan(cutAt(back[0] + dx) - CLOTH.thick - 0.06);
    // Lying with its head end over him it starts at its own head end, as before.
    expect(animClothShape({ ...V, x: 3, cover: 5 }, layer(6.2), { x: 5, y: 7, rot: -90, parts: [box(-0.5, -3, 0.5, 0)] }).body[0][0]).toBeCloseTo(3, 5);
  });
  test("an arm coming out past its head end carries the edge up; nothing else does", () => {
    const raised = (arm) => ({ x: 5, y: 7, rot: 0, parts: [box(-0.2, -3, 0.2, 0, arm), box(0.5, -0.5, 2, 0)] });
    const v = { ...V, x: 5.5, cover: 5 };
    const flat = animClothShape(v, layer(2.6), raised(false));
    const lifted = animClothShape(v, layer(2.6), raised(true));
    expect(topAt(flat, 5.5)).toBeGreaterThan(6.2);
    expect(topAt(lifted, 5.5)).toBeLessThan(5);
  });
  test("cloth left over bunches up at the head end into rolls and folds; a big heap shows its sheet", () => {
    const g = animClothShape(V, layer(9), null);
    expect(g.spare).toBeCloseTo(3, 5);
    expect(topAt(g, 3)).toBeLessThan(BED - CLOTH.thick - 0.3);
    expect(topAt(g, 7.5)).toBeCloseTo(BED - CLOTH.thick, 2);
    expect(g.folds.length).toBe(2);
    expect(g.patch).not.toBeNull();
    expect(animClothShape(V, layer(6.5), null).patch).toBeNull();
  });
  test("lift raises the head end whole, hem and all, and leaves the foot end on the bed", () => {
    const g = animClothShape({ ...V, lift: 2 }, layer(6), null);
    const bottomAt = (x) => Math.max(...g.body.filter((p, i) => i >= g.body.length / 2 && Math.abs(p[0] - x) < 0.03).map((p) => p[1]));
    expect(topAt(g, 2.05)).toBeLessThan(BED - CLOTH.thick - 1.5);
    expect(bottomAt(2.05)).toBeLessThan(HEM - 2);
    expect(bottomAt(7.95)).toBeCloseTo(HEM, 2);
  });
  test("a mirrored stage draws the same blanket turned round", () => {
    const body = { x: 5, y: 7, rot: -90, flip: false, parts: [box(-0.5, -3, 0.5, 0), box(0, -2.4, 1.5, -2, true)] };
    const g = animClothShape({ ...V, x: 1 }, layer(6.5), body);
    const m = animClothShape(animMirrorValues({ ...V, x: 1 }, 17), layer(6.5), { ...animMirrorValues(body, 17), parts: body.parts });
    for (const x of [2.2, 3, 4, 5, 6, 7, 7.8]) expect(topAt(m, 17 - x)).toBeCloseTo(topAt(g, x), 1);
    expect(m.band[0][0]).toBeCloseTo(17 - g.band[0][0], 5);
    expect(m.dots.length).toBe(g.dots.length);
  });
});

describe("🚁 Walk up + E: scenery before E, and the actor starting where you stood", () => {
  // Hover (loops, before you arrive) → Rope (let down as you walk in) → Waiting (loops, E) → Grab → Fly.
  const five = (eState) => migrateAnim({ ...newAnim(mkId), id: "h", trigger: "reach", eState, states: [
    { id: "s0", name: "Hover", dur: 1.6, wait: true, loop: true, keys: [{ id: "a", t: 0, v: {} }] },
    { id: "s1", name: "Rope", dur: 1.2, keys: [{ id: "b", t: 0, v: {} }] },
    { id: "s2", name: "Waiting", dur: 1, wait: true, loop: true, prompt: "E - Grab the rope.", keys: [{ id: "c", t: 0, v: {} }] },
    { id: "s3", name: "Grab", dur: 0.5, keys: [{ id: "d", t: 0, v: {} }] },
    { id: "s4", name: "Fly", dur: 3, keys: [{ id: "e", t: 0, v: {} }] },
  ] }, mkId);
  test("E starts the second state unless the animation names a later one; the name survives only if it is a later state", () => {
    expect(animReachAt(five(""))).toBe(1);
    expect(animReachAt(five("s3"))).toBe(3);
    expect(five("s0").eState).toBe(""); // the first state is the one you walk up to, never E's
    expect(five("gone").eState).toBe("");
    expect(animReachAt(migrateAnim({ id: "one", trigger: "reach" }, mkId))).toBe(0);
  });
  test("the actor is hidden in every state before E — you are the one playing then", () => {
    const a = five("s3");
    expect([0, 1, 2, 3, 4].map((i) => animActorShown(a, i))).toEqual([false, false, false, true, true]);
    expect([0, 1, 2].map((i) => animActorShown(five(""), i))).toEqual([false, true, true]); // as it always was
  });
  test("the prompt is the last scenery state's", () => {
    expect(animReachPromptState(five("s3")).id).toBe("s2");
    expect(animReachPromptState(five("")).id).toBe("s0");
  });
  test("walking in plays the scenery through and holds on its last state, never on into E's", () => {
    const a = five("s3");
    let pos = animSceneryStep(a, { si: 1, t: 0, el: 0 }, 0);
    expect(pos).toMatchObject({ si: 1, ready: false });
    pos = animSceneryStep(a, pos, 1.0);
    expect(pos).toMatchObject({ si: 1, ready: false });
    pos = animSceneryStep(a, pos, 0.5);
    expect(pos.si).toBe(2); expect(pos.ready).toBe(true); expect(pos.t).toBeCloseTo(0.3, 6);
    for (let i = 0; i < 20; i++) pos = animSceneryStep(a, pos, 0.25);
    expect(pos.si).toBe(2); // ten seconds on, still waiting for E
    expect(pos.t).toBeGreaterThanOrEqual(0); expect(pos.t).toBeLessThan(1); // and looping
    // A last scenery state that does not wait or loop still holds at its end.
    const b = { ...a, states: a.states.map((s, i) => (i === 2 ? { ...s, wait: false, loop: false } : s)) };
    expect(animSceneryStep(b, { si: 2, t: 0, el: 0 }, 9)).toMatchObject({ si: 2, t: 1, ready: true });
    expect(animSceneryStep(five(""), { si: 1, t: 0, el: 0 }, 0.1)).toBe(null); // no scenery after the first
  });
  test("the actor starts where you stood and eases to its own first spot", () => {
    const off = { x: 2, y: -0.5 };
    expect(animEntryOffset(off, 0)).toEqual({ x: 2, y: -0.5 });
    const mid = animEntryOffset(off, ANIM_ENTRY_SECONDS / 2);
    expect(mid.x).toBeGreaterThan(0); expect(mid.x).toBeLessThan(2);
    const end = animEntryOffset(off, ANIM_ENTRY_SECONDS);
    expect(end.x).toBeCloseTo(0, 9); expect(end.y).toBeCloseTo(0, 9);
    expect(animEntryOffset(null, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe("🪢 a rope (rope layer)", () => {
  test("is a layer kind of its own; it hangs only from a prop layer that is there", () => {
    const a = migrateAnim({ id: "r", layers: [{ id: "b", kind: "actor" }, { id: "p", kind: "prop", propId: "x", size: 54 }, { id: "r1", kind: "rope", from: "p", hookX: 1.4 }, { id: "r2", kind: "rope", from: "b" }] }, mkId);
    expect(a.layers[1].size).toBe(54); // past the old 40 cap
    expect(a.layers[2]).toMatchObject({ kind: "rope", name: "Rope", from: "p", hookX: 1, hookY: 1 });
    expect(a.layers[3].from).toBe(""); // an actor is not something to tie a rope to
    expect(migrateAnim({ id: "q", layers: [{ id: "p", kind: "prop", size: 500 }] }, mkId).layers.find((l) => l.id === "p").size).toBe(ANIM_PROP_SIZE_MAX);
    const st = { keys: [{ id: "k0", t: 0, v: { r1: { drop: 0, swing: 0, hold: false } } }, { id: "k1", t: 1, v: { r1: { drop: 8, swing: 6, hold: true } } }] };
    expect(animLayerAt(a, st, a.layers[2], 0.5)).toMatchObject({ drop: 4, swing: 3, hold: false }); // hold switches AT the key
    expect(animLayerAt(a, st, a.layers[2], 1)).toMatchObject({ drop: 8, hold: true });
  });
  test("a prop's point goes where the browser draws it: mirrored, squashed about the bottom-centre, turned about the middle", () => {
    const v = { x: 10, y: 8, rot: 0, sx: 1, sy: 1, flip: false };
    expect(animPropPoint(v, 4, 2, 0.5, 1)).toEqual([10, 8]);       // bottom-centre = the layer's own x,y
    expect(animPropPoint(v, 4, 2, 0, 0)).toEqual([8, 6]);          // top-left
    expect(animPropPoint({ ...v, flip: true }, 4, 2, 0, 0)).toEqual([12, 6]);
    const sq = animPropPoint({ ...v, sx: 0.5, sy: 0.5 }, 4, 2, 0, 0);
    expect(sq[0]).toBeCloseTo(9, 9); expect(sq[1]).toBeCloseTo(7, 9); // the bottom stays put
    const r = animPropPoint({ ...v, rot: 90 }, 4, 2, 0.5, 0);        // the top-centre, turned a quarter clockwise about (10, 7)
    expect(r[0]).toBeCloseTo(11, 9); expect(r[1]).toBeCloseTo(7, 9);
  });
  test("a mirrored stage hangs the rope from the mirrored hook", () => {
    const v = { x: 32, y: 12.5, rot: 7, sx: 1, sy: 1, flip: true };
    const p = animPropPoint(v, 52, 10, 0.29, 0.49), q = animPropPoint(animMirrorValues(v, 64), 52, 10, 0.29, 0.49);
    expect(q[0]).toBeCloseTo(64 - p[0], 9); expect(q[1]).toBeCloseTo(p[1], 9);
  });
  const arm = (pts) => ({ arm: true, pts });
  test("his hands are the tip of the arm that reaches highest, turned and mirrored with him", () => {
    const parts = [{ arm: false, pts: [[-0.5, -4], [0.5, -4], [0.5, 2], [-0.5, 2]] }, arm([[0.1, -4.7], [0.5, -4.7], [0.5, -2.5], [0.1, -2.5]])];
    const h0 = animHandsAt({ x: 5, y: 10, rot: 0, flip: false, parts }), h1 = animHandsAt({ x: 5, y: 10, rot: 0, flip: true, parts });
    expect(h0[0]).toBeCloseTo(5.3, 9); expect(h0[1]).toBeCloseTo(5.3, 9); expect(h1[0]).toBeCloseTo(4.7, 9); expect(h1[1]).toBeCloseTo(5.3, 9);
    const t = animHandsAt({ x: 5, y: 10, rot: 90, flip: false, parts });
    expect(t[0]).toBeCloseTo(9.7, 9); expect(t[1]).toBeCloseTo(10.3, 9);
    expect(animHandsAt({ x: 0, y: 0, parts: [parts[0]] })).toBe(null);
  });
  test("free, it hangs `drop` straight down from its top, its knot at the end, and sways on the clock", () => {
    expect(animRopeShape({ drop: 0 }, [3, 2], null, 0)).toBe(null);
    const g = animRopeShape({ drop: 6, swing: 0 }, [3, 2], null, 1.3);
    expect(g.pts[0]).toEqual([3, 2]); expect(g.knot[0]).toBeCloseTo(3, 9); expect(g.knot[1]).toBeCloseTo(8, 9);
    const sw = animRopeShape({ drop: 6, swing: 10 }, [3, 2], null, 0.65); // a quarter of its swing period: all the way over
    expect(Math.abs(sw.knot[0] - 3)).toBeCloseTo(6 * Math.sin((10 * Math.PI) / 180), 6);
    expect(Math.hypot(sw.knot[0] - 3, sw.knot[1] - 2)).toBeCloseTo(6, 6);
  });
  test("in his hands it runs straight from its top to them, and what is left hangs straight down from them", () => {
    const g = animRopeShape({ drop: 8, hold: true }, [3, 2], [4, 7], 0);
    expect(g.pts[0]).toEqual([3, 2]); expect(g.pts[1]).toEqual([4, 7]);
    expect(g.pts[2][0]).toBe(4); expect(g.pts[2][1]).toBeCloseTo(7 + 8 - Math.hypot(1, 5), 9);
    expect(animRopeShape({ drop: 3, hold: true }, [3, 2], [4, 7], 0).pts).toHaveLength(2); // pulled tight: no tail
    expect(animRopeShape({ drop: 6, hold: true }, [3, 2], null, 0).knot[1]).toBeCloseTo(8, 9); // no hands on stage: it hangs free
  });
});

// 🎬 FLOOR END (2026-10-17): the General's briefing after the rope up into the Chinook.
describe("floor end scenes and text layers", () => {
  test("floorEndAnim picks the scene naming this floor, else one naming none, else nothing", () => {
    const any = { id: "a", type: "anim", trigger: "floor", floor: "" };
    const tp = { id: "b", type: "anim", trigger: "floor", floor: " trailor park " };
    const placed = { id: "c", type: "anim", trigger: "reach", floor: "Trailor Park" };
    expect(floorEndAnim([any, tp, placed], "Trailor Park")).toBe(tp);
    expect(floorEndAnim([any, tp], "Sewer")).toBe(any);
    expect(floorEndAnim([tp, placed], "Sewer")).toBe(null);
    expect(floorEndAnim([placed], "Trailor Park")).toBe(null);
    expect(floorEndAnim(null, "x")).toBe(null);
  });
  test("a text layer survives migrate with its words and look, clamped; a floor scene keeps its floor", () => {
    const a = migrateAnim({ ...newAnim(mkId), id: "f1", trigger: "floor", floor: "Trailor Park", layers: [{ id: "t", kind: "text", title: "The Draft", text: "One.\n\nTwo.", size: 99, tilt: -5, color: "red" }] }, mkId);
    expect(a.trigger).toBe("floor");
    expect(a.floor).toBe("Trailor Park");
    const t = a.layers.find((l) => l.id === "t");
    expect(t).toMatchObject({ kind: "text", title: "The Draft", text: "One.\n\nTwo.", size: 6, tilt: 0, color: "#ffe81f" });
    expect(migrateAnim({ ...newAnim(mkId), id: "f2" }, mkId).floor).toBe("");
  });
  test("rise moves at an even speed between keys while everything else eases", () => {
    let a = migrateAnim({ ...newAnim(mkId), id: "f3", layers: [{ id: "t", kind: "text" }, { id: "p", kind: "prop", propId: "x" }] }, mkId);
    a = { ...a, states: [{ ...a.states[0], dur: 10, keys: [{ id: "k0", t: 0, v: { t: { rise: 0 }, p: { x: 0 } } }, { id: "k1", t: 10, v: { t: { rise: 50 }, p: { x: 10 } } }] }] };
    const t = a.layers.find((l) => l.id === "t"), p = a.layers.find((l) => l.id === "p");
    expect(animLayerAt(a, a.states[0], t, 2).rise).toBeCloseTo(10, 9);
    expect(animLayerAt(a, a.states[0], t, 5).rise).toBeCloseTo(25, 9);
    expect(animLayerAt(a, a.states[0], p, 2).x).toBeLessThan(2); // the prop eases out of its key
  });
  test("animScreenFit letterboxes the whole stage in the view, never cropping it", () => {
    const f = animScreenFit({ w: 48, h: 20 }, 3084, 871);
    expect(f.cell).toBeCloseTo(871 / 20, 9);
    expect(f.top).toBeCloseTo(0, 9);
    expect(f.left).toBeCloseTo((3084 - 48 * f.cell) / 2, 9);
    const g = animScreenFit({ w: 48, h: 20 }, 800, 800);
    expect(g.cell).toBeCloseTo(800 / 48, 9);
    expect(g.left).toBeCloseTo(0, 9);
  });
});

// 2026-10-17: "one of the part continues too long, idk how to trim that section" (the Briefing crawl).
describe("shortening a state", () => {
  const crawl = () => {
    const a = migrateAnim({ ...newAnim(mkId), id: "c1" }, mkId);
    const text = { id: "tx", kind: "text", name: "Crawl", text: "Words", size: 1, wide: 20, tilt: 0 };
    const b = animAddLayer(a, text);
    return { ...b, states: [{ ...b.states[0], dur: 44, keys: [{ id: "k0", t: 0, v: { tx: { x: 24, y: 20, rise: 0, show: 1 } } }, { id: "k1", t: 44, v: { tx: { rise: 58 } } }] }] };
  };
  const riseAt = (a, t) => animLayerAt(a, a.states[0], a.layers.find((l) => l.id === "tx"), t).rise;
  test("stretched, the whole state plays faster and still ends where its last key says", () => {
    const a = animSetLength(crawl(), 0, 30, true, mkId);
    expect(a.states[0].dur).toBe(30);
    expect(a.states[0].keys.map((k) => k.t)).toEqual([0, 30]);
    expect(riseAt(a, 30)).toBeCloseTo(58, 6);
    expect(riseAt(a, 15)).toBeCloseTo(29, 6);
  });
  test("cut, no key is left past the end, and the end holds the picture that moment showed", () => {
    const a0 = crawl(), a = animSetLength(a0, 0, 22, false, mkId);
    expect(a.states[0].dur).toBe(22);
    expect(Math.max(...a.states[0].keys.map((k) => k.t))).toBe(22);
    expect(riseAt(a, 22)).toBeCloseTo(riseAt(a0, 22), 3);
    expect(animCutEnd(a0, 0, 22, mkId).states[0].keys.map((k) => k.t)).toEqual([0, 22]);
  });
  test("lengthening without stretch only adds time at the end", () => {
    const a = animSetLength(crawl(), 0, 50, false, mkId);
    expect(a.states[0].keys.map((k) => k.t)).toEqual([0, 44]);
  });
  test("cutting the start makes the playhead 0, and the first key holds every layer", () => {
    const a0 = crawl(), a = animCutStart(a0, 0, 10, mkId);
    expect(a.states[0].dur).toBe(34);
    expect(a.states[0].keys.map((k) => k.t)).toEqual([0, 34]);
    expect(riseAt(a, 0)).toBeCloseTo(riseAt(a0, 10), 3);
    expect(riseAt(a, 34)).toBeCloseTo(58, 6);
    for (const l of a.layers) expect(a.states[0].keys[0].v[l.id]).toBeTruthy();
    expect(animCutStart(a0, 0, 0, mkId)).toEqual(a0);
  });
});
