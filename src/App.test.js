import {
  DEFAULT_PROJECTILE_RANGE,
  capAirborneSpeed,
  cutterLayerSegments,
  enemyCrouchH,
  enemyNeedsFlip,
  enemyStandH,
  flipPropFramesHorizontally,
  projectileDropAtDistance,
  projectilePositionAtDistance,
  resolveSaveTarget,
  splitObjectStackByPlayerLayer,
} from "./App";

describe("projectile range trajectory", () => {
  const rangePx = DEFAULT_PROJECTILE_RANGE * 30;

  test("stays neutral through half range, then reaches firing ground at full range", () => {
    expect(projectileDropAtDistance(100, 220, rangePx / 2, rangePx)).toBe(0);
    expect(projectileDropAtDistance(100, 220, rangePx * 0.75, rangePx)).toBe(30);
    expect(projectileDropAtDistance(100, 220, rangePx, rangePx)).toBe(120);
  });

  test.each([4, 12, 30])("range is independent of speed %p", (speed) => {
    const pr = { startX: 10, startY: 100, groundY: 220, rangePx, vx: speed, vy: 0 };
    expect(projectilePositionAtDistance(pr, rangePx)).toEqual({ x: 10 + rangePx, y: 220 });
  });

  test("adds drop to upward and downward aimed trajectories", () => {
    const up = { startX: 0, startY: 100, groundY: 220, rangePx, vx: 0, vy: -12 };
    const down = { ...up, vy: 12 };
    expect(projectilePositionAtDistance(up, rangePx).y).toBe(-200);
    expect(projectilePositionAtDistance(down, rangePx).y).toBe(640);
  });
});

describe("scaled enemy dimensions", () => {
  test("standing and crouching heights share the enemy scale", () => {
    expect(enemyStandH({ scale: 2 }, 30)).toBe(420);
    expect(enemyCrouchH({ scale: 2 }, 30)).toBe(252);
  });
});

describe("movement and facing regressions", () => {
  test("airborne momentum cannot exceed configured walking speed", () => {
    expect(capAirborneSpeed(12, 7)).toBe(7);
    expect(capAirborneSpeed(-12, 7)).toBe(-7);
    expect(capAirborneSpeed(5, 7)).toBe(5);
  });

  test("dressed enemies and raw enemy art flip from their correct authored direction", () => {
    expect(enemyNeedsFlip({ type: "character" }, 1)).toBe(false);
    expect(enemyNeedsFlip({ type: "character" }, -1)).toBe(true);
    expect(enemyNeedsFlip({ type: "enemy" }, -1)).toBe(false);
    expect(enemyNeedsFlip({ type: "enemy" }, 1)).toBe(true);
    expect(enemyNeedsFlip({ type: "enemy", faceRight: true }, -1)).toBe(true);
  });
});

describe("cutter layer ordering", () => {
  test("cuts ordinary lower layers but not checked lower layers or layers above it", () => {
    const pieces = [
      { id: "back-leaf" },
      { id: "stem", noCut: true },
      { id: "gap", isCutter: true },
      { id: "front-leaf" },
    ];
    const segments = cutterLayerSegments(pieces);
    const cuttersFor = (id) => {
      const segment = segments.find((s) => s.items.some(([p]) => p.id === id));
      return segment.cutters.map((p) => p.id);
    };

    expect(cuttersFor("back-leaf")).toEqual(["gap"]);
    expect(cuttersFor("stem")).toEqual([]);
    expect(cuttersFor("front-leaf")).toEqual([]);
    expect(segments.flatMap((s) => s.items.map(([p]) => p.id))).toEqual(["back-leaf", "stem", "front-leaf"]);
  });

  test("a cutter below an object cannot cut the object", () => {
    const segments = cutterLayerSegments([
      { id: "low-gap", isCutter: true },
      { id: "top-leaf" },
    ]);
    expect(segments[0].cutters).toEqual([]);
    expect(segments[0].items[0][0].id).toBe("top-leaf");
  });
});

describe("whole-object flip", () => {
  test("mirrors every animation frame around one shared pivot", () => {
    const staleFrame = { front: [{ id: "stale", kind: "rect", x: 0, y: 0, w: 10, h: 10 }] };
    const liveFrame = { front: [{ id: "left", kind: "tri2", x: 20, y: 0, w: 10, h: 10, rot: 30 }] };
    const secondFrame = { front: [{ id: "right", kind: "rect", x: 70, y: 0, w: 20, h: 10, isCutter: true }] };
    const result = flipPropFramesHorizontally([staleFrame, secondFrame], liveFrame, 0);

    expect(result.flipped).toBe(true);
    expect(result.pivotX).toBe(55);
    expect(result.frames[0].front[0].x).toBe(80);
    expect(result.frames[0].front[0].rot).toBe(330);
    expect(result.frames[0].front[0].kind).toBe("poly");
    expect(result.frames[1].front[0].x).toBe(20);
    expect(result.frames[1].front[0].isCutter).toBe(true);
    expect(result.angles).toBe(result.frames[0]);
  });
});

describe("level object front/back layering", () => {
  test.each([
    [
      { id: "front-bush", inFront: true },
      { id: "back-bush", inFront: false },
    ],
    [
      { id: "back-bush", inFront: false },
      { id: "front-bush", inFront: true },
    ],
  ])("separates player-relative layers regardless of placement order", (...stack) => {
    const layers = splitObjectStackByPlayerLayer(stack);
    expect(layers.behind.map(({ o }) => o.id)).toEqual(["back-bush"]);
    expect(layers.front.map(({ o }) => o.id)).toEqual(["front-bush"]);
    expect(layers.behind[0].stackIndex).toBe(stack.findIndex((o) => o.id === "back-bush"));
    expect(layers.front[0].stackIndex).toBe(stack.findIndex((o) => o.id === "front-bush"));
  });
});

describe("asset identity", () => {
  test("saving with the same name updates the existing asset", () => {
    const list = [{ id: "prop-1", name: "Red Berry Bush", type: "prop" }];
    expect(resolveSaveTarget(list, { id: "prop-1", name: "Red Berry Bush", type: "prop" }, "prop-copy"))
      .toEqual({ id: "prop-1", mode: "update" });
  });

  test("renaming a loaded asset saves a new copy and preserves the source id", () => {
    const list = [{ id: "prop-1", name: "Red Berry Bush", type: "prop" }];
    expect(resolveSaveTarget(list, { id: "prop-1", name: "Purple Berry Bush", type: "prop" }, "prop-copy"))
      .toEqual({ id: "prop-copy", mode: "rename", sourceId: "prop-1" });
  });

  test("same-name assets with different ids remain separate", () => {
    const list = [{ id: "weapon-1", name: "Bow", type: "weapon" }];
    expect(resolveSaveTarget(list, { id: "weapon-2", name: "Bow", type: "weapon" }))
      .toEqual({ id: "weapon-2", mode: "create" });
  });
});
