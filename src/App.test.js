import {
  DEFAULT_PROJECTILE_RANGE,
  capAirborneSpeed,
  CLUSTER_POP_VY,
  CLUSTER_SPREAD_VX,
  clusterBombletVelocity,
  connectedFrontRegion,
  throwStunRadiusCells,
  frontFadeKeys,
  pedestalCoverKeys,
  pedestalXrayGhost,
  PED_XRAY_NEAR_CELLS,
  PED_XRAY_FAR_CELLS,
  cutterLayerSegments,
  advanceAutoReloadWeapon,
  canFireNow,
  consumeShot,
  enemyCrouchH,
  enemyNeedsFlip,
  enemyStandH,
  effectiveMagazineSize,
  flipPropFramesHorizontally,
  incomingPlayerDamage,
  newWeaponAmmo,
  projectileDropAtDistance,
  projectilePositionAtDistance,
  rangeBoostMultiplier,
  resolveSaveTarget,
  splitObjectStackByPlayerLayer,
  weaponReloadFrames,
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

describe("Long Shot range boost", () => {
  test("no boost worn leaves range untouched", () => {
    expect(rangeBoostMultiplier(undefined)).toBe(1);
    expect(rangeBoostMultiplier([])).toBe(1);
    expect(rangeBoostMultiplier([{ type: "tagBoost", mult: 3 }])).toBe(1);
  });

  test("uses the worn ability's multiplier, falling back to the catalog default", () => {
    expect(rangeBoostMultiplier([{ type: "rangeBoost", mult: 2 }])).toBe(2);
    expect(rangeBoostMultiplier([{ type: "rangeBoost" }])).toBe(1.5);
  });

  test("multiple worn range abilities stack multiplicatively", () => {
    expect(rangeBoostMultiplier([{ type: "rangeBoost", mult: 2 }, { type: "rangeBoost", mult: 1.5 }])).toBe(3);
  });

  test("a corrupt zero multiplier cannot shrink range to nothing", () => {
    expect(rangeBoostMultiplier([{ type: "rangeBoost", mult: 0 }])).toBe(0.1);
  });

  test("a boosted shot flies farther and drops later", () => {
    const base = DEFAULT_PROJECTILE_RANGE * 30;
    const boosted = base * rangeBoostMultiplier([{ type: "rangeBoost", mult: 2 }]);
    expect(boosted).toBe(base * 2);
    // Same flat shot, boosted range: at the un-boosted weapon's max distance it is still
    // dead level (that point is now only half of its longer range), where the un-boosted
    // one has already fallen all the way to the ground it was fired over.
    const shot = { startX: 0, startY: 100, groundY: 220, vx: 12, vy: 0 };
    expect(projectilePositionAtDistance({ ...shot, rangePx: base }, base).y).toBe(220);
    expect(projectilePositionAtDistance({ ...shot, rangePx: boosted }, base).y).toBe(100);
    expect(projectilePositionAtDistance({ ...shot, rangePx: boosted }, boosted).x).toBe(base * 2);
  });
});

describe("scaled enemy dimensions", () => {
  test("standing and crouching heights share the enemy scale", () => {
    expect(enemyStandH({ scale: 2 }, 30)).toBe(420);
    expect(enemyCrouchH({ scale: 2 }, 30)).toBe(252);
  });
});

describe("connected Front sheet (pedestal x-ray)", () => {
  // Two separate 2x2 walls: rows 0-1 at cols 0-1, and rows 0-1 at cols 5-6.
  const front = {
    "0,0": 1, "0,1": 1, "1,0": 1, "1,1": 1,
    "0,5": 1, "0,6": 1, "1,5": 1, "1,6": 1,
  };
  const sorted = (set) => [...set].sort();

  test("spreads across one whole wall from any cell in it", () => {
    expect(sorted(connectedFrontRegion(front, ["1,1"]))).toEqual(["0,0", "0,1", "1,0", "1,1"]);
    expect(sorted(connectedFrontRegion(front, ["0,0"]))).toEqual(["0,0", "0,1", "1,0", "1,1"]);
  });

  test("does not leak into a separate wall", () => {
    expect(connectedFrontRegion(front, ["0,0"]).has("0,5")).toBe(false);
  });

  test("standing behind both walls at once covers both", () => {
    expect(sorted(connectedFrontRegion(front, ["0,0", "0,5"]))).toEqual(
      ["0,0", "0,1", "0,5", "0,6", "1,0", "1,1", "1,5", "1,6"]
    );
  });

  test("corner-touching walls stay separate", () => {
    // "2,2" touches "1,1" only diagonally, so it must not join that sheet.
    expect(connectedFrontRegion({ ...front, "2,2": 1 }, ["0,0"]).has("2,2")).toBe(false);
  });

  test("empty or unpainted starts yield nothing", () => {
    expect(connectedFrontRegion(front, []).size).toBe(0);
    expect(connectedFrontRegion(front, ["9,9"]).size).toBe(0);
    expect(connectedFrontRegion(null, ["0,0"]).size).toBe(0);
  });
});

describe("see-through window radius", () => {
  // A 1x1 cell player at cell (5,5) on a 30px grid, with Front paint everywhere nearby.
  const front = {};
  for (let r = 0; r <= 12; r++) for (let c = 0; c <= 12; c++) front[r + "," + c] = 1;

  test("no padding fades only the cells the body actually covers", () => {
    expect(frontFadeKeys(front, 150, 150, 30, 30, 30, 30)).toEqual(["5,5"]);
    expect(frontFadeKeys(front, 150, 150, 30, 30, 30, 30, 0)).toEqual(["5,5"]);
  });

  test("padding reaches that many blocks out in every direction", () => {
    const keys = frontFadeKeys(front, 150, 150, 30, 30, 30, 30, 2);
    expect(keys).toContain("3,5"); // 2 up
    expect(keys).toContain("7,5"); // 2 down
    expect(keys).toContain("5,3"); // 2 left
    expect(keys).toContain("5,7"); // 2 right
    expect(keys).toContain("3,3"); // and the corners
    expect(keys).not.toContain("2,5"); // but not 3 out
    expect(keys).toHaveLength(25);  // a full 5x5 block of cells
  });

  test("only painted cells are returned, padding or not", () => {
    expect(frontFadeKeys({ "5,5": 1 }, 150, 150, 30, 30, 30, 30, 4)).toEqual(["5,5"]);
    expect(frontFadeKeys(null, 150, 150, 30, 30, 30, 30, 4)).toEqual([]);
  });
});

describe("pedestal x-ray look", () => {
  test("the art box covers the marker cell, one either side, and two rows up", () => {
    const keys = pedestalCoverKeys(7, 4);
    expect(keys).toContain("7,4"); // the marker cell itself
    expect(keys).toContain("5,4"); // the item floats ~2 cells above it
    expect(keys).toContain("7,3");
    expect(keys).toContain("7,5");
    expect(keys).not.toContain("8,4"); // never below the marker
    expect(keys).not.toContain("7,6");
  });

  test("full texture up close, fully washed out far away", () => {
    expect(pedestalXrayGhost(0)).toBe(0);
    expect(pedestalXrayGhost(PED_XRAY_NEAR_CELLS)).toBe(0);
    expect(pedestalXrayGhost(PED_XRAY_FAR_CELLS)).toBe(1);
    expect(pedestalXrayGhost(999)).toBe(1);
  });

  test("eases between the two, and tolerates no argument", () => {
    const mid = (PED_XRAY_NEAR_CELLS + PED_XRAY_FAR_CELLS) / 2;
    expect(pedestalXrayGhost(mid)).toBeCloseTo(0.5);
    expect(pedestalXrayGhost(undefined)).toBe(0);
  });
});

describe("throwable cluster burst", () => {
  test("bomblets fan symmetrically from full left to full right", () => {
    const vs = [0, 1, 2, 3, 4].map((i) => clusterBombletVelocity(i, 5));
    expect(vs[0].vx).toBeCloseTo(-CLUSTER_SPREAD_VX);
    expect(vs[2].vx).toBeCloseTo(0);
    expect(vs[4].vx).toBeCloseTo(CLUSTER_SPREAD_VX);
    // Mirrored pairs cancel, so the spray is even rather than lopsided.
    expect(vs[0].vx + vs[4].vx).toBeCloseTo(0);
    expect(vs[1].vx + vs[3].vx).toBeCloseTo(0);
  });

  test("every bomblet pops upward by the same amount", () => {
    for (const i of [0, 1, 2]) expect(clusterBombletVelocity(i, 3).vy).toBe(-CLUSTER_POP_VY);
  });

  test("a lone bomblet goes straight up rather than veering off", () => {
    expect(clusterBombletVelocity(0, 1).vx).toBe(0);
    expect(clusterBombletVelocity(0, 0).vx).toBe(0); // guards a 0/degenerate count
  });

  test("spread and pop can be overridden", () => {
    expect(clusterBombletVelocity(0, 2, 10, 7)).toEqual({ vx: -10, vy: -7 });
  });
});

describe("throwable stun radius", () => {
  test("always reaches at least one block past the impact", () => {
    expect(throwStunRadiusCells(0)).toBe(1);
    expect(throwStunRadiusCells(3)).toBe(4);
  });

  test("a missing or negative splash still stuns what's standing on it", () => {
    expect(throwStunRadiusCells(undefined)).toBe(1);
    expect(throwStunRadiusCells(-5)).toBe(1);
  });
});

describe("Crouch Guard", () => {
  // Hit for 20 with no Defense, so the raw number survives to the guards unchanged.
  const hit = (backReduce, crouchReduce, crouching, attackerX = 100) =>
    incomingPlayerDamage(20, 0, 1, attackerX, 0, backReduce, crouchReduce, crouching);

  test("halves a hit taken while crouched and leaves a standing hit alone", () => {
    expect(hit(null, 0.5, true)).toBe(10);
    expect(hit(null, 0.5, false)).toBe(20);
    expect(hit(null, null, true)).toBe(20);
  });

  test("applies from any direction, unlike Back Guard", () => {
    expect(hit(null, 0.5, true, 100)).toBe(10);  // attacker in front
    expect(hit(null, 0.5, true, -100)).toBe(10); // attacker behind
  });

  test("stacks with Back Guard on a crouched hit from behind", () => {
    expect(hit(0.5, 0.5, true, -100)).toBe(5);  // 20 -> back guard 10 -> crouch guard 5
    expect(hit(0.5, 0.5, true, 100)).toBe(10);  // not from behind, so only crouch applies
  });

  test("runs after Defense, not before", () => {
    expect(incomingPlayerDamage(20, 10, 1, 100, 0, null, 0.5, true)).toBe(5); // defense halves to 10, crouch halves to 5
  });

  test("a full block still leaves the one-point floor", () => {
    expect(incomingPlayerDamage(1, 0, 1, 100, 0, null, 1, true)).toBe(1);
  });

  test("callers that pass no crouch arguments are unaffected", () => {
    expect(incomingPlayerDamage(20, 0, 1, -100, 0, 0.5)).toBe(10); // back guard only, exactly as before
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

  test("a mirrored cutter's twin cuts everything the original does", () => {
    // bake()/propArtInner expand a mirrored piece into the original plus a reflected `_m` twin,
    // pushed straight after it. Both halves must register as cutters over the art below them.
    const segments = cutterLayerSegments([
      { id: "leaf" },
      { id: "hole", isCutter: true },
      { id: "hole_m", isCutter: true, _m: true },
    ]);
    const seg = segments.find((s) => s.items.some(([p]) => p.id === "leaf"));
    expect(seg.cutters.map((p) => p.id)).toEqual(["hole", "hole_m"]);
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

describe("weapon magazines and enemy reloads", () => {
  test("magazine-size clothing adds rounds and stacks without changing unlimited weapons", () => {
    const effects = [
      { type: "magazineSize", rounds: 2 },
      { type: "doubleJump", height: 9 },
      { type: "magazineSize", rounds: 3 },
    ];
    expect(effectiveMagazineSize(6, effects)).toBe(11);
    expect(effectiveMagazineSize(0, effects)).toBe(0);
  });

  test("an AI weapon empties, waits for its gun's reload time, then refills", () => {
    let ammo = newWeaponAmmo(2);
    ammo = consumeShot(ammo, 1);
    ammo = consumeShot(ammo, 1);
    expect(canFireNow(ammo)).toBe(false);

    const reloadFrames = weaponReloadFrames(0.5);
    ammo = advanceAutoReloadWeapon(ammo, 1, reloadFrames);
    expect(ammo.reloadT).toBe(reloadFrames);
    expect(ammo.ammo).toBe(0);

    ammo = advanceAutoReloadWeapon(ammo, reloadFrames, reloadFrames);
    expect(ammo.reloadT).toBe(0);
    expect(ammo.ammo).toBe(2);
    expect(canFireNow(ammo)).toBe(true);
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
