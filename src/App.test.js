import {
  DEFAULT_PROJECTILE_RANGE,
  capAirborneSpeed,
  cellSig,
  LV_OBJ_SIZES,
  objRotStyle,
  normalizeObjRot,
  OBJ_ROT_NUDGE,
  objectLayerClass,
  fgFills,
  fgHiddenInPlay,
  fgSlopeFills,
  fgSolid,
  armHoldsAimPose,
  attachWeaponBlocks,
  burstDelayFrames,
  burstShotCount,
  burstShotDue,
  rangedTriggerWantsFire,
  migratedWeaponFireModes,
  weaponBurstShotCount,
  weaponFireMode,
  groundLegsShouldWalk,
  slopeShouldAutoSlide,
  SHAPE_LIST,
  copyAngleTargets,
  weaponFireCooldownFrames,
  reloadIntelligenceMultiplier,
  startReload,
  needsReload,
  displayPoseKey,
  editablePoses,
  groupWeaponBlocksByArm,
  mergeFgFill,
  paintValue,
  terrainPaintShape,
  mergeWeaponBlocks,
  normalizeAssetJson,
  playerSpriteMirrored,
  RANGED_FIRE_POSE_FRAMES,
  weaponPoseFired,
  slopeSurfaceAt,
  slopeSurfaceForPlayer,
  TEXTURES,
  TEXTURE_KEYS,
  newTexture,
  textureBaseColor,
  textureDataUri,
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
  CUTTER_MASK_PAD,
  cutterMaskFrameLayout,
  advanceAutoReloadWeapon,
  weaponAbilitiesFor,
  snapPiece,
  PIECE_STEP,
  MIN_PIECE_SIZE,
  clampObjNudge,
  objNudgedLeft,
  objNudgedTop,
  OBJ_NUDGE_STEP,
  OBJ_NUDGE_LIMIT,
  canFireNow,
  consumeShot,
  enemyCrouchH,
  enemyNeedsFlip,
  enemyStandH,
  effectiveMagazineSize,
  flipPropFramesHorizontally,
  incomingPlayerDamage,
  newWeaponAmmo,
  objAnchor,
  objAnchorForObject,
  objAnchorKey,
  objKeyAt,
  removeLevelObject,
  levelObjectFootprint,
  levelShapeLabel,
  propVisibleArtBox,
  recolorAsset,
  restyleAsset,
  projectileDropAtDistance,
  projectilePositionAtDistance,
  rangeBoostMultiplier,
  resolveSaveTarget,
  splitObjectStackByPlayerLayer,
  weaponReloadFrames,
  BLOCK_FRAMES,
  blastHitsBox,
  pointBoxDistance,
  WEAPON_ABILITIES,
  weaponAbilityKeys,
  BLOCK_STAGGER_SECS,
  BLOCK_RECOVER_FRAMES,
  advanceBlock,
  blockStopsHit,
  duplicateSelectedPieces,
  ENEMY_ITEM_DROP_CHANCE,
  ENEMY_GEAR_DROP_CHANCE,
  enemyItemDropPool,
  enemyGearDropPool,
  enemyEquippedGear,
  pieceBelongsToAsset,
  enemyDropOverlapping,
  rollEnemyItemDrop,
  multiLegPivot,
  MULTI_LEG_SWING_SCALE,
  crouchArtPlane,
  alignPoseFootBaseline,
  poseFootGapFrac,
  horizVel,
  resolvePlayerCrouch,
  playerPoseKey,
  pieceGroupBounds,
  scalePieceGroup,
  removePieceSelection,
  playerMeleeDamage,
  playerRangedDamage,
  critChance,
  tagDamageMultiplier,
  pieceSnapEdges,
  findEdgeSnap,
  applyEdgeSnap,
  findGroupEdgeSnap,
  canEdgeSnap,
  boxPoint,
  pieceBox,
  SNAP_DIST,
} from "./App";

describe("copying blocks and groups", () => {
  test("a block keeps independent copies of all appearance settings", () => {
    const source = {
      id: "source",
      kind: "poly",
      x: 20,
      y: 35,
      color: "#123456",
      fx: { opacity: 0.35, glow: 6, glowColor: "#abcdef", bright: 1.7 },
      outlineFx: { opacity: 0.6, bright: 0.8 },
      points: [[0, 0], [1, 0], [0.5, 1]],
    };

    const [copy] = duplicateSelectedPieces([source], ["source"], () => "copy");

    expect(copy).toEqual({ ...source, id: "copy", x: 32, y: 47 });
    copy.fx.opacity = 0.9;
    copy.outlineFx.bright = 1.4;
    copy.points[0][0] = 99;
    expect(source.fx.opacity).toBe(0.35);
    expect(source.outlineFx.bright).toBe(0.8);
    expect(source.points[0][0]).toBe(0);
  });

  test("copies every selected group member in layer order and preserves spacing", () => {
    const pieces = [
      { id: "back", x: 2, y: 4, fx: { opacity: 0.2, bright: 0.7 } },
      { id: "skip", x: 50, y: 60, fx: { opacity: 1, bright: 1 } },
      { id: "front", x: 12, y: 24, fx: { opacity: 0.8, bright: 1.8 } },
    ];
    let nextId = 0;

    const copies = duplicateSelectedPieces(pieces, ["front", "back"], () => "copy-" + (++nextId));

    expect(copies.map((piece) => piece.id)).toEqual(["copy-1", "copy-2"]);
    expect(copies.map((piece) => [piece.x, piece.y])).toEqual([[14, 16], [24, 36]]);
    expect(copies.map((piece) => piece.fx)).toEqual([pieces[0].fx, pieces[2].fx]);
    expect(copies).toHaveLength(2);
  });
});

describe("enemy item drops", () => {
  const assets = [
    { id: "potion", name: "Potion", type: "item" },
    { id: "elixir", name: "Elixir", type: "item" },
    { id: "sword", name: "Sword", type: "weapon" },
    { id: "hat", name: "Hat", type: "equipment" },
    { id: "dog", name: "Dog", type: "enemy" },
  ];
  const MISS = 0.99; // a roll that fails either gate
  const gear = [assets[2], assets[3]]; // sword + hat, as if the enemy had both equipped

  test("consumables are the common drop at 5%, gear the rare one at 2%", () => {
    expect(ENEMY_ITEM_DROP_CHANCE).toBe(0.05);
    expect(ENEMY_GEAR_DROP_CHANCE).toBe(0.02);
    // Inside the item gate you get a consumable, never a shirt.
    expect(rollEnemyItemDrop(assets, gear, 0.049999, 0, MISS).type).toBe("item");
    expect(rollEnemyItemDrop(assets, gear, 0, 0.999999, MISS).id).toBe("elixir");
    // Past the item gate but inside the gear gate you get gear — a weapon or a piece of clothing.
    expect(rollEnemyItemDrop(assets, gear, 0.05, 0, 0.019999, 0).id).toBe("sword");
    expect(rollEnemyItemDrop(assets, gear, 0.05, 0, 0.019999, 0.999999).id).toBe("hat");
    // Past both gates: nothing.
    expect(rollEnemyItemDrop(assets, gear, 0.05, 0, 0.02, 0)).toBeNull();
  });

  test("gear can only be what the enemy actually had equipped", () => {
    // The whole library is irrelevant to the gear roll — an enemy carrying nothing drops nothing,
    // however many shirts and rifles are saved. Consumables still come from the whole pool.
    const wardrobe = [{ id: "potion", type: "item" }];
    for (let i = 0; i < 50; i++) wardrobe.push({ id: "shirt" + i, type: "equipment" });
    expect(rollEnemyItemDrop(wardrobe, [], 0.05, 0, 0, 0)).toBeNull();          // naked enemy: no gear
    expect(rollEnemyItemDrop(wardrobe, [], 0.01, 0, MISS).id).toBe("potion");   // but still drops potions
    // Wearing exactly one thing, that one thing is the only gear it can ever yield.
    const onlyHat = [{ id: "shirt7", type: "equipment" }];
    for (const r of [0, 0.5, 0.999999]) {
      expect(rollEnemyItemDrop(wardrobe, onlyHat, 0.05, 0, 0.01, r).id).toBe("shirt7");
    }
  });

  test("equipped gear is read off the loadout, IDs first and embedded copies as fallback", () => {
    const rifle = { id: "rifle", type: "weapon" }, jacket = { id: "jacket", type: "equipment" };
    const lib = { rifle, jacket };
    const find = (id) => lib[id] || null;
    // A dressed look: recipe IDs resolve against the live library, so later edits are what drop.
    const dressed = { recipe: { weaponId: "rifle", slots: { jacket: "jacket" } }, components: {} };
    expect(enemyEquippedGear(dressed, find).map((a) => a.id).sort()).toEqual(["jacket", "rifle"]);
    // Gear deleted from the library still drops, using the copy baked into the look.
    const orphan = { recipe: { slots: { jacket: "gone" } }, components: { equipment: { jacket: { id: "old", type: "equipment" } } } };
    expect(enemyEquippedGear(orphan, find).map((a) => a.id)).toEqual(["old"]);
    // A plain undressed enemy has only its weaponId, and a body/skin component is never loot.
    expect(enemyEquippedGear({ weaponId: "rifle" }, find).map((a) => a.id)).toEqual(["rifle"]);
    expect(enemyEquippedGear({ components: { body: { id: "b", type: "body" }, skin: { id: "s", type: "skin" } } }, find)).toEqual([]);
    expect(enemyEquippedGear(null, find)).toEqual([]);
  });

  test("looted gear is matched back to the corpse pieces that drew it", () => {
    const jacket = { id: "jacket", type: "equipment", slot: "jacket" };
    const rifle = { id: "rifle", type: "weapon" };
    // Composed looks tag every piece with _src.
    expect(pieceBelongsToAsset({ _src: "jacket" }, jacket)).toBe(true);
    expect(pieceBelongsToAsset({ _src: "body1" }, jacket)).toBe(false);
    // Older saves have no _src: clothing falls back to its slot, the weapon to _isWeapon.
    expect(pieceBelongsToAsset({ _slot: "jacket" }, jacket)).toBe(true);
    expect(pieceBelongsToAsset({ _slot: "hat" }, jacket)).toBe(false);
    expect(pieceBelongsToAsset({ _isWeapon: true }, rifle)).toBe(true);
    expect(pieceBelongsToAsset({}, rifle)).toBe(false);
    // Bare body art is never stripped by anything.
    expect(pieceBelongsToAsset({}, jacket)).toBe(false);
    expect(pieceBelongsToAsset(null, jacket)).toBe(false);
  });

  test("enemies and other non-pickups are never dropped", () => {
    expect(enemyItemDropPool(assets).map((a) => a.id)).toEqual(["potion", "elixir"]);
    expect(enemyGearDropPool(assets).map((a) => a.id)).toEqual(["sword", "hat"]);
    expect(rollEnemyItemDrop([{ id: "dog", type: "enemy" }], [], 0, 0, 0, 0)).toBeNull();
  });

  test("only offers live dropped items when the player overlaps them", () => {
    const drops = { dead1: { item: assets[0], x: 60, y: 90 }, dead2: null, taken: { item: null, x: 20, y: 20 } };
    expect(enemyDropOverlapping(drops, 45, 55, 25, 35, 30).key).toBe("dead1");
    expect(enemyDropOverlapping(drops, 120, 120, 20, 20, 30)).toBeNull();
  });
});

describe("multi-leg enemy walk", () => {
  test("pivots each authored Pit Bull leg stack rigidly around its own hip", () => {
    const rest = [
      { id: "frontHip", x: 60, y: 101, w: 17, h: 35, rot: 180 },
      { id: "frontShin", x: 63, y: 124, w: 11, h: 24 },
      { id: "frontFoot", x: 55, y: 138, w: 16, h: 10 },
      { id: "frontPaw", x: 57, y: 136, w: 16, h: 13 },
      { id: "backHip", x: 125, y: 102, w: 17, h: 35, rot: 180 },
      { id: "backShin", x: 128, y: 125, w: 11, h: 24 },
      { id: "backFoot", x: 120, y: 139, w: 16, h: 10 },
      { id: "backPaw", x: 122, y: 137, w: 16, h: 13 },
    ];
    const legIds = new Set(rest.map((p) => p.id));
    const moved = multiLegPivot(rest, legIds, 28);
    const ids = ["frontHip", "frontShin", "frontFoot", "frontPaw"];
    const center = (p) => ({ x: p.x + p.w / 2, y: p.y + p.h / 2 });
    const distance = (a, b) => Math.hypot(center(a).x - center(b).x, center(a).y - center(b).y);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      expect(distance(moved.find((p) => p.id === ids[i]), moved.find((p) => p.id === ids[j]))).toBeCloseTo(distance(rest.find((p) => p.id === ids[i]), rest.find((p) => p.id === ids[j])), 8);
    }
    const frontDelta = ids.map((id) => (moved.find((p) => p.id === id).rot || 0) - (rest.find((p) => p.id === id).rot || 0));
    frontDelta.forEach((deg) => expect(deg).toBeCloseTo(28 * MULTI_LEG_SWING_SCALE, 8));
    const backDelta = ["backHip", "backShin", "backFoot", "backPaw"].map((id) => (moved.find((p) => p.id === id).rot || 0) - (rest.find((p) => p.id === id).rot || 0));
    backDelta.forEach((deg) => expect(deg).toBeCloseTo(-28 * MULTI_LEG_SWING_SCALE, 8));
    const frontDx = ids.map((id) => moved.find((p) => p.id === id).x - rest.find((p) => p.id === id).x);
    expect(Math.max(...frontDx) - Math.min(...frontDx)).toBeGreaterThan(3); // an arc around the hip, not one shared slide
  });

  test("leaves a single-column biped for the normal swing code", () => {
    const oneLeg = [{ id: "hip", x: 60, y: 100, w: 15, h: 35 }, { id: "foot", x: 60, y: 135, w: 15, h: 10 }];
    expect(multiLegPivot(oneLeg, new Set(["hip", "foot"]), 28)).toBeNull();
  });

  test("raises the Pit Bull attack pose until its back foot matches the Side baseline", () => {
    const side = [{ id: "sideLeg", limb: "leg", x: 60, y: 101, w: 17, h: 49 }];
    const attack = [{ id: "backLeg", limb: "leg", x: 68, y: 127, w: 17, h: 45 }, { id: "head", x: 50, y: 15, w: 30, h: 30 }];
    const aligned = alignPoseFootBaseline(side, attack);
    expect(Math.max(...aligned.filter((p) => p.limb === "leg").map((p) => p.y + p.h))).toBe(150);
    expect(aligned.find((p) => p.id === "head").y).toBe(-7);
  });

  // The canvas is 200x260, so the gap is measured against a floor of y=260.
  test("measures the empty canvas under a pose whose feet stop short of the floor", () => {
    expect(poseFootGapFrac([{ id: "leg", x: 60, y: 100, w: 20, h: 30 }])).toBeCloseTo(130 / 260, 8);
    expect(poseFootGapFrac([{ id: "leg", x: 60, y: 100, w: 20, h: 160 }])).toBe(0); // drawn right down to the bottom edge
  });

  test("a lying-down death pose reports a far bigger gap than the standing pose it replaces", () => {
    const side = [{ id: "body", x: 60, y: 40, w: 40, h: 210 }];
    const death = [{ id: "body", x: 20, y: 120, w: 160, h: 40 }];
    expect(poseFootGapFrac(death)).toBeGreaterThan(poseFootGapFrac(side));
  });

  test("ignores hitbox and muzzle markers, and an empty pose anchors nothing", () => {
    const blocks = [{ id: "leg", x: 60, y: 100, w: 20, h: 30 }, { id: "hb", isHitbox: true, x: 0, y: 250, w: 10, h: 10 }, { id: "mz", isMuzzle: true, x: 0, y: 255, w: 5, h: 5 }];
    expect(poseFootGapFrac(blocks)).toBeCloseTo(130 / 260, 8);
    expect(poseFootGapFrac([])).toBe(0);
    expect(poseFootGapFrac(null)).toBe(0);
  });
});

describe("crouching sleeve coverage", () => {
  const bodyArm = { id: "arm", x: 140, y: 124, w: 18, h: 60, role: "weaponArm", limb: "arm", armPivot: "top" };
  const jacketSleeve = { id: "sleeve", x: 131, y: 148, w: 54, h: 21, rot: 88, limb: "arm", armPivot: "top", overArms: true, _slot: "jacket" };
  const cuff = { id: "cuff", x: 154, y: 143, w: 13, h: 9, rot: 87, limb: "arm", armPivot: "top", overArms: true, _slot: "jacket" };
  const leg = { id: "leg", x: 104, y: 188, w: 30, h: 42, limb: "leg" };
  const renderW = 161.5, crouchH = 126;

  test("keeps authored sleeve proportions on a uniformly scaled crouch plane", () => {
    const blocks = [bodyArm, jacketSleeve, cuff, leg];
    const plane = crouchArtPlane(blocks, renderW, crouchH);
    const scale = renderW / 200;
    expect(plane.height).toBeCloseTo(260 * scale, 8);
    expect(plane.height / renderW).toBeCloseTo(260 / 200, 8);
    expect(plane.top + (leg.y + leg.h) * scale).toBeCloseTo(crouchH, 8);
    expect(plane.top + plane.originY).toBeCloseTo(crouchH, 8);
    expect(plane.walkScaleY).toBeCloseTo(crouchH / plane.height, 8);
    expect(jacketSleeve).toEqual({ id: "sleeve", x: 131, y: 148, w: 54, h: 21, rot: 88, limb: "arm", armPivot: "top", overArms: true, _slot: "jacket" });
  });

  test("falls back to the visible-art baseline when a pose has no flagged leg", () => {
    const plane = crouchArtPlane([bodyArm, jacketSleeve, cuff], renderW, crouchH);
    expect(plane.baseline).toBe(bodyArm.y + bodyArm.h);
    expect(crouchArtPlane([], renderW, crouchH)).toBeNull();
  });
});

describe("crouch walking", () => {
  test("keeps the short hitbox through a one-frame ground miss while crouch remains held", () => {
    expect(resolvePlayerCrouch(true, true, false)).toBe(true);
    expect(resolvePlayerCrouch(true, false, true)).toBe(true);
    expect(resolvePlayerCrouch(false, true, true)).toBe(false);
    expect(resolvePlayerCrouch(true, false, false)).toBe(false);
  });

  test("still produces horizontal movement in both directions at crouch speed", () => {
    expect(horizVel({ right: true }, 3.5, true, 0, null, null, 1)).toBe(3.5);
    expect(horizVel({ left: true }, 3.5, true, 0, null, null, 1)).toBe(-3.5);
  });

  test("keeps the original sideways walk pose while moving and uses Crouch only when still", () => {
    expect(playerPoseKey({ crouch: true, walking: false })).toBe("crouch");
    expect(playerPoseKey({ crouch: true, walking: true })).toBe("side");
    expect(playerPoseKey({ crouch: false, walking: true })).toBe("side");
  });

  test("keeps higher-priority transition, climb, and stationary aim poses", () => {
    expect(playerPoseKey({ transitioning: true, crouch: true, walking: true })).toBe("back");
    expect(playerPoseKey({ climbing: true, climbKind: "ladder", crouch: true })).toBe("back");
    expect(playerPoseKey({ climbing: true, climbKind: "bars", crouch: true })).toBe("side");
    expect(playerPoseKey({ aiming: true, aimDir: -1, crouch: true, walking: false })).toBe("up");
  });
});

describe("complex prop group editing", () => {
  const joined = [
    { id: "left", x: 20, y: 30, w: 20, h: 10 },
    { id: "detail", x: 40, y: 30, w: 4, h: 10 },
    { id: "right", x: 44, y: 30, w: 16, h: 10 },
  ];

  test("can shrink, grow, and return to the same minimum size without an anchor-size jump", () => {
    const small = scalePieceGroup(joined, 0.25);
    const grown = scalePieceGroup(small, 2);
    const smallAgain = scalePieceGroup(grown, 0.5);
    expect(smallAgain).toEqual(small);
    expect(Math.min(...small.map((p) => p.w), ...small.map((p) => p.h))).toBe(1);
  });

  test("keeps touching element edges synchronized through repeated slider-like scaling", () => {
    let resized = joined;
    for (const scale of [0.6, 1.7, 0.8, 1.25, 0.5]) resized = scalePieceGroup(resized, scale);
    const [left, detail, right] = resized;
    expect(left.x + left.w).toBe(detail.x);
    expect(detail.x + detail.w).toBe(right.x);
    const bounds = pieceGroupBounds(resized);
    expect(bounds.width).toBeCloseTo(right.x + right.w - left.x, 8);
  });

  test("deletes every selected prop element together while preserving required locked pieces", () => {
    const pieces = [...joined, { id: "keep", x: 0, y: 0, w: 5, h: 5 }, { id: "locked", x: 0, y: 0, w: 5, h: 5, locked: true }];
    expect(removePieceSelection(pieces, new Set(["left", "detail", "right"])).map((p) => p.id)).toEqual(["keep", "locked"]);
    expect(removePieceSelection(pieces, new Set(["left", "locked"])).map((p) => p.id)).toEqual(["detail", "right", "keep", "locked"]);
  });
});

describe("joined downhill ramp pieces", () => {
  test("keeps contact when the next ramp section starts in the row below the feet", () => {
    const lv = { cols: 30, rows: 30, fg: {
      "20,17": { c: "#544d45", slope: -1, run: 8, step: 7 },
      "21,18": { c: "#544d45", slope: -1, run: 6, step: 0 },
    } };
    const feetBottom = 629.5; // still in row 20, just before the 630px seam
    const hit = slopeSurfaceForPlayer(lv, 18 * 30 + 10, 420, feetBottom, 0.175, 7, 1, 30, 30);
    expect(hit).not.toBeNull();
    expect(hit.dir).toBe(-1);
    expect(hit.run).toBe(6);
    expect(hit.y).toBeCloseTo(631.667, 2);
    expect(hit.gap).toBeGreaterThan(0);
  });

  test("does not reach a lower-row ramp that is farther away than this frame can travel", () => {
    const lv = { cols: 30, rows: 30, fg: { "21,18": { c: "#544d45", slope: -1, run: 6, step: 5 } } };
    expect(slopeSurfaceForPlayer(lv, 18 * 30 + 25, 420, 620, 0.175, 7, 1, 30, 30)).toBeNull();
  });
});

describe("creator shape picker", () => {
  test("offers one reusable rounded square shape", () => {
    expect(SHAPE_LIST.filter(([kind]) => kind === "roundrect")).toEqual([
      ["roundrect", "▣", "Rounded square"],
    ]);
  });
});

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

describe("stacking two materials in one Foreground cell", () => {
  const GRAVEL = { c: "#8d8578", tex: "tex-gravel" };
  const up = (extra) => ({ slope: 1, run: 3, step: 1, ...extra });

  test("a ramp over grass blocks keeps the grass, in its own material", () => {
    const merged = mergeFgFill("#2e7d32", { ...GRAVEL, ...up() });
    expect(merged.c).toBe("#8d8578");
    expect(merged.slope).toBe(1);
    expect(merged.more).toEqual([{ c: "#2e7d32" }]);
  });

  test("the opposing ramp merges instead of deleting the one already there", () => {
    const gravelRamp = { ...GRAVEL, slope: -1, run: 3, step: 1 };
    const merged = mergeFgFill(gravelRamp, { c: "#2e7d32", ...up() });
    expect(merged.c).toBe("#2e7d32");
    expect(merged.slope).toBe(1);
    expect(merged.more).toEqual([gravelRamp]);
  });

  test("either order gives the same two materials — only the top one differs", () => {
    const grassRamp = { c: "#2e7d32", ...up() };
    const gravelRamp = { ...GRAVEL, slope: -1, run: 3, step: 1 };
    const a = mergeFgFill(gravelRamp, grassRamp);
    const b = mergeFgFill(grassRamp, gravelRamp);
    expect(fgFills(a).map((f) => f.c).sort()).toEqual(fgFills(b).map((f) => f.c).sort());
  });

  test("three fills coexist: a block plus both ramps", () => {
    const merged = mergeFgFill(mergeFgFill("#2e7d32", { ...GRAVEL, slope: -1, run: 1, step: 0 }), { c: "#c62828", slope: 1, run: 1, step: 0 });
    expect(merged.more).toHaveLength(2);
    expect(fgFills(merged).map((f) => f.c)).toEqual(["#c62828", "#8d8578", "#2e7d32"]);
  });

  test("repainting the same shape replaces that fill instead of stacking a copy", () => {
    const once = mergeFgFill("#2e7d32", { ...GRAVEL, ...up() });
    const twice = mergeFgFill(once, { c: "#c62828", ...up() });
    expect(twice.c).toBe("#c62828");
    expect(twice.more).toEqual([{ c: "#2e7d32" }]);   // the grass block is still there, the old gravel ramp is not
  });

  test("a ramp of a different length still counts as the same shape", () => {
    const once = mergeFgFill(null, { c: "#2e7d32", slope: 1, run: 5, step: 2 });
    const twice = mergeFgFill(once, { c: "#c62828", slope: 1, run: 2, step: 0 });
    expect(twice).toEqual({ c: "#c62828", slope: 1, run: 2, step: 0 });
  });

  test("an upside-down ramp is its own shape, so it stacks with the normal one", () => {
    const merged = mergeFgFill({ c: "#2e7d32", ...up() }, { ...GRAVEL, ...up({ upsideDown: true }) });
    expect(merged.more).toEqual([{ c: "#2e7d32", ...up() }]);
  });

  test("painting a plain block is a clean reset, since nothing shows under it", () => {
    const messy = mergeFgFill("#2e7d32", { ...GRAVEL, ...up() });
    expect(mergeFgFill(messy, "#111111")).toBe("#111111");
  });

  test("an empty cell just takes the paint, plain string and all", () => {
    expect(mergeFgFill(undefined, "#2e7d32")).toBe("#2e7d32");
    expect(mergeFgFill(null, { c: "#2e7d32", ...up() })).toEqual({ c: "#2e7d32", ...up() });
  });

  test("colour, texture and outline all survive being pushed underneath", () => {
    const merged = mergeFgFill({ c: "#8d8578", tex: "tex-1", ol: "#000000" }, { c: "#2e7d32", ...up() });
    expect(merged.more).toEqual([{ c: "#8d8578", tex: "tex-1", ol: "#000000" }]);
  });

  test("a single-material cell is unchanged — no more field is invented", () => {
    expect(mergeFgFill(null, { c: "#2e7d32", ...up() }).more).toBeUndefined();
  });
});

describe("collision over a stacked Foreground cell", () => {
  const lvOf = (cell) => ({ rows: 4, cols: 4, fg: { "1,1": cell } });

  test("a bare ramp is walkable and not solid, exactly as before", () => {
    const lv = lvOf({ c: "#2e7d32", slope: 1, run: 1, step: 0 });
    expect(fgSolid(lv.fg["1,1"])).toBe(false);
    expect(slopeSurfaceAt(lv, 30 + 15, 1, 1, 30, 30).y).toBe(45);
    expect(slopeSurfaceAt(lv, 30 + 15, 1, 1, 30, 30).run).toBe(1);
  });

  test("a ramp stacked over a block blocks, because the block still fills the cell", () => {
    const lv = lvOf(mergeFgFill("#2e7d32", { c: "#8d8578", slope: 1, run: 1, step: 0 }));
    expect(fgSolid(lv.fg["1,1"])).toBe(true);
  });

  test("two opposing ramps in one cell are both walkable surfaces", () => {
    // The up-ramp rises left-to-right, the down-ramp falls, and each fills below its own
    // diagonal — so together they notch a V out of the cell's top middle. What matters here is
    // that BOTH surfaces are found: at the left edge the answer (y=31) is the DOWN-ramp's, which
    // is the one that got pushed underneath. Before this, only the last-painted ramp existed at
    // all and the left edge read as its low end, y=59.
    const cell = mergeFgFill({ c: "#8d8578", slope: -1, run: 1, step: 0 }, { c: "#2e7d32", slope: 1, run: 1, step: 0 });
    const lv = lvOf(cell);
    expect(fgSolid(cell)).toBe(false);
    expect(fgSlopeFills(cell)).toHaveLength(2);
    expect(slopeSurfaceAt(lv, 31, 1, 1, 30, 30).y).toBeCloseTo(31, 0); // the stacked down-ramp
    expect(slopeSurfaceAt(lv, 59, 1, 1, 30, 30).y).toBeCloseTo(31, 0); // the up-ramp painted on top
    expect(slopeSurfaceAt(lv, 45, 1, 1, 30, 30).y).toBeCloseTo(45, 0); // they cross in the middle
  });

  test("an upside-down wedge still collides solid, stacked or not", () => {
    expect(fgSolid({ c: "#2e7d32", slope: 1, run: 1, step: 0, upsideDown: true })).toBe(true);
    expect(fgSolid(mergeFgFill({ c: "#2e7d32", slope: 1, run: 1, step: 0 }, { c: "#8d8578", slope: 1, run: 1, step: 0, upsideDown: true }))).toBe(true);
  });

  test("an empty cell is neither solid nor a surface", () => {
    expect(fgSolid(undefined)).toBe(false);
    expect(fgSolid(null)).toBe(false);
    expect(fgSlopeFills(undefined)).toEqual([]);
  });

  test("flood-fill tells a stacked cell apart from a bare ramp", () => {
    const ramp = { c: "#8d8578", slope: 1, run: 1, step: 0 };
    expect(cellSig(mergeFgFill("#2e7d32", ramp))).not.toBe(cellSig(ramp));
  });
});

describe("collision-only Foreground paint", () => {
  test("a hidden block remains a full solid collision cell", () => {
    const block = paintValue("#62d9ff", null, { hideInPlay: true });
    expect(block).toEqual({ c: "#62d9ff", hideInPlay: true });
    expect(fgHiddenInPlay(block)).toBe(true);
    expect(fgSolid(block)).toBe(true);
    expect(fgSlopeFills(block)).toEqual([]);
  });

  test("a hidden ramp remains a walkable slope with its original geometry", () => {
    const ramp = paintValue("#62d9ff", null, { slope: 1, run: 1, step: 0, hideInPlay: true });
    const lv = { rows: 3, cols: 3, fg: { "1,1": ramp } };
    expect(fgHiddenInPlay(ramp)).toBe(true);
    expect(fgSolid(ramp)).toBe(false);
    expect(fgSlopeFills(ramp)).toEqual([ramp]);
    expect(slopeSurfaceAt(lv, 45, 1, 1, 30, 30).y).toBe(45);
  });

  test("ordinary Foreground paint stays visible and flood-fill distinguishes it", () => {
    const visible = { c: "#62d9ff", slope: -1, run: 2, step: 0 };
    const hidden = { ...visible, hideInPlay: true };
    expect(fgHiddenInPlay(visible)).toBe(false);
    expect(cellSig(hidden)).not.toBe(cellSig(visible));
  });

  test("stacking preserves collision-only state on each independent fill", () => {
    const hiddenBlock = { c: "#62d9ff", hideInPlay: true };
    const visibleRamp = { c: "#8d8578", slope: 1, run: 1, step: 0 };
    const fills = fgFills(mergeFgFill(hiddenBlock, visibleRamp));
    expect(fills).toEqual([visibleRamp, hiddenBlock]);
    expect(fgHiddenInPlay(fills[0])).toBe(false);
    expect(fgHiddenInPlay(fills[1])).toBe(true);
    expect(fgSolid({ ...fills[0], more: fills.slice(1) })).toBe(true);
  });
});

describe("Background ramp paint", () => {
  test("uses the same multi-cell diagonal geometry without collision-only metadata", () => {
    expect(terrainPaintShape("bg", "slopeUp", false, true, { run: 4, step: 2 })).toEqual({
      slope: 1,
      run: 4,
      step: 2,
    });
    expect(terrainPaintShape("bg", "slopeDown", true, false)).toEqual({
      slope: -1,
      upsideDown: true,
    });
  });

  test("blocks stay plain and Front remains block-only", () => {
    expect(terrainPaintShape("bg", "block")).toBeNull();
    expect(terrainPaintShape("front", "slopeUp")).toBeNull();
  });

  test("a Background ramp never enters Foreground collision", () => {
    const ramp = paintValue("#6b7b3a", null, terrainPaintShape("bg", "slopeUp", false, false, { run: 1, step: 0 }));
    const lv = { rows: 3, cols: 3, fg: {}, bg: { "1,1": ramp } };
    expect(fgSolid(lv.fg["1,1"])).toBe(false);
    expect(slopeSurfaceAt(lv, 45, 1, 1, 30, 30)).toBeNull();
  });
});

describe("grass texture", () => {
  test("is registered and starts on the existing flat grass colour", () => {
    expect(TEXTURE_KEYS).toContain("grass");
    expect(TEXTURES.grass.label).toBe("Grass");
    const t = newTexture("grass");
    expect(textureBaseColor(t)).toBe("#6b7b3a");
    expect(paintValue("#ffffff", t)).toEqual({ c: "#6b7b3a", tex: t.id });
  });

  test("renders deterministically so the blades do not shimmer", () => {
    expect(textureDataUri(newTexture("grass"))).toBe(textureDataUri(newTexture("grass")));
  });

  test("lushness changes the number and shape of blades", () => {
    const base = newTexture("grass");
    expect(textureDataUri({ ...base, params: { lush: 1 } })).not.toBe(textureDataUri(base));
    expect(textureDataUri({ ...base, params: { lush: 0 } })).not.toBe(textureDataUri(base));
  });

  test("every grass colour control contributes to the rendered texture", () => {
    const base = newTexture("grass");
    for (const key of ["base", "light", "dark", "tip"]) {
      const recoloured = { ...base, colors: { ...base.colors, [key]: "#ff00ff" } };
      expect(textureDataUri(recoloured)).not.toBe(textureDataUri(base));
    }
  });
});

describe("gravel texture", () => {
  test("is registered, so the picker and pattern switcher both offer it", () => {
    expect(TEXTURE_KEYS).toContain("gravel");
    expect(TEXTURES.gravel.label).toBe("Gravel");
  });

  test("a new instance starts at every default, and falls back to its dirt colour", () => {
    const t = newTexture("gravel");
    expect(t.tex).toBe("gravel");
    expect(t.params.coarse).toBe(0.5);
    expect(Object.keys(t.colors).sort()).toEqual(["a", "b", "base", "c"]);
    expect(textureBaseColor(t)).toBe(t.colors.base);
  });

  test("renders deterministically — same settings, same bytes, so nothing shimmers", () => {
    expect(textureDataUri(newTexture("gravel"))).toBe(textureDataUri(newTexture("gravel")));
  });

  test("coarseness changes the bed", () => {
    const base = newTexture("gravel");
    expect(textureDataUri({ ...base, params: { coarse: 1 } })).not.toBe(textureDataUri(base));
    expect(textureDataUri({ ...base, params: { coarse: 0 } })).not.toBe(textureDataUri(base));
  });

  test("every colour control actually reaches the render", () => {
    const base = newTexture("gravel");
    for (const key of ["base", "a", "b", "c"]) {
      const recoloured = { ...base, colors: { ...base.colors, [key]: "#ff00ff" } };
      // A swatch wired to nothing would render identical bytes — that's the failure this catches.
      expect(textureDataUri(recoloured)).not.toBe(textureDataUri(base));
    }
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

  test("ordinary grip holds gentle hills but fails on steep ones", () => {
    expect(slopeShouldAutoSlide(5, false)).toBe(false);
    expect(slopeShouldAutoSlide(3, false)).toBe(false);
    expect(slopeShouldAutoSlide(2, false)).toBe(true);
    expect(slopeShouldAutoSlide(1, false)).toBe(true);
  });

  test("the Slide effect defeats grip on every incline", () => {
    expect(slopeShouldAutoSlide(8, true)).toBe(true);
    expect(slopeShouldAutoSlide(2, true)).toBe(true);
  });

  test("legs settle during a passive slide or coast", () => {
    expect(groundLegsShouldWalk(4, true, false, false, true)).toBe(true);
    expect(groundLegsShouldWalk(4, true, false, true, true)).toBe(false);
    expect(groundLegsShouldWalk(4, true, false, false, false)).toBe(false);
  });
});

describe("cutter layer ordering", () => {
  test("masked weapon pieces keep the authoring origin but can rotate beyond its edges", () => {
    const frame = cutterMaskFrameLayout();
    const pct = (value) => parseFloat(value) / 100;
    // Check a deliberately non-authoring-size render. The expanded outer frame must put its inner
    // origin back at 0,0 and make the inner canvas exactly as large as the asset's actual display
    // box—not 200×260 CSS pixels.
    const displayW = 73;
    const displayH = 41;
    const outerLeft = pct(frame.outer.left) * displayW;
    const outerTop = pct(frame.outer.top) * displayH;
    const outerW = pct(frame.outer.width) * displayW;
    const outerH = pct(frame.outer.height) * displayH;
    expect(outerLeft + pct(frame.inner.left) * outerW).toBeCloseTo(0);
    expect(outerTop + pct(frame.inner.top) * outerH).toBeCloseTo(0);
    expect(pct(frame.inner.width) * outerW).toBeCloseTo(displayW);
    expect(pct(frame.inner.height) * outerH).toBeCloseTo(displayH);
    expect(frame.viewBox.x).toBe(-CUTTER_MASK_PAD);
    expect(frame.viewBox.y).toBe(-CUTTER_MASK_PAD);
    expect(frame.viewBox.width).toBeGreaterThan(200 * 3);
    expect(frame.viewBox.height).toBeGreaterThan(260 * 3);
  });

  test("the M16 barrel tip remains inside the padded mask after the arm raises to fire", () => {
    const raisedArm = { x: 70, y: 96, w: 55, h: 80, armPivot: "top", rot: -90 };
    const [tip] = attachWeaponBlocks(
      [{ id: "m16-tip", kind: "rect", x: 109, y: 233, w: 16, h: 4, rot: 90 }],
      raisedArm,
      { x: 104, y: 176 },
      0
    );
    const frame = cutterMaskFrameLayout().viewBox;
    expect(tip.x).toBeGreaterThan(200); // the old 200-wide cutter wrapper clipped it here
    expect(tip.x).toBeGreaterThanOrEqual(frame.x);
    expect(tip.x + tip.w).toBeLessThanOrEqual(frame.x + frame.width);
  });

  test("the M16 barrel remains inside the padded mask through the ladder rotation", () => {
    const climbingArm = { x: 140, y: 94, w: 20, h: 82, armPivot: "top", rot: 180 };
    const [tip] = attachWeaponBlocks(
      [{ id: "m16-tip-back", kind: "rect", x: 171, y: 231, w: 16, h: 4, rot: 90 }],
      climbingArm,
      { x: 150, y: 176 },
      0
    );
    const frame = cutterMaskFrameLayout().viewBox;
    expect(tip.y).toBeLessThan(0); // the old 260-high cutter wrapper clipped it here
    expect(tip.y).toBeGreaterThanOrEqual(frame.y);
    expect(tip.y + tip.h).toBeLessThanOrEqual(frame.y + frame.height);
  });

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

describe("object size options", () => {
  test("reaches five times the old 12-cell ceiling", () => {
    expect(Math.max(...LV_OBJ_SIZES)).toBe(60);
  });

  test("every size that already existed is still offered, so saved levels keep their exact sizes", () => {
    for (const old of [1, 2, 3, 4, 6, 8, 10, 12]) expect(LV_OBJ_SIZES).toContain(old);
  });

  test("starts at one cell and only ever grows", () => {
    expect(LV_OBJ_SIZES[0]).toBe(1);
    for (let i = 1; i < LV_OBJ_SIZES.length; i++) {
      expect(LV_OBJ_SIZES[i]).toBeGreaterThan(LV_OBJ_SIZES[i - 1]);
    }
  });

  test("offers half-cell steps at the small end, where lining things up actually happens", () => {
    for (const half of [1.5, 2.5, 3.5]) expect(LV_OBJ_SIZES).toContain(half);
    for (const n of LV_OBJ_SIZES) expect(Number.isInteger(n * 2)).toBe(true); // halves at most — never a third of a cell
  });

  test("a solid half-size object still blocks whole cells, and never fewer than its art covers", () => {
    // fxBlocks walks cell indices as `c < o.c + o.cols`, so a 1.5-cell object blocks 2 — the
    // collision square rounds UP. That is the safe direction (you can never fall through the art)
    // and it is the same trade a fitArt prop, whose footprint has always been fractional, makes.
    const fp = levelObjectFootprint({ kind: "emoji", size: 1.5 }, null);
    expect(fp.cols).toBe(1.5);
    let blocked = 0;
    for (let c = 0; c < 5; c++) if (c >= 0 && c < 0 + fp.cols) blocked++;
    expect(blocked).toBe(2);
    expect(blocked).toBeGreaterThanOrEqual(fp.cols);
  });
});

describe("object visual layer", () => {
  test("a solid object draws with the Foreground blocks it behaves like", () => {
    expect(objectLayerClass({ solid: true })).toBe("lay-fg");
  });

  test("an in-front object draws with the Front tiles, solid or not", () => {
    expect(objectLayerClass({ inFront: true })).toBe("lay-front");
    expect(objectLayerClass({ inFront: true, solid: true })).toBe("lay-front"); // in-front wins over solid
  });

  test("plain scenery draws with the Background, behind the player", () => {
    expect(objectLayerClass({})).toBe("lay-bg");
    expect(objectLayerClass({ solid: false, inFront: false })).toBe("lay-bg");
    expect(objectLayerClass(undefined)).toBe("lay-bg");
  });

  test("every object lands on exactly one layer", () => {
    const seen = new Set();
    for (const solid of [true, false]) for (const inFront of [true, false]) seen.add(objectLayerClass({ solid, inFront }));
    expect([...seen].sort()).toEqual(["lay-bg", "lay-fg", "lay-front"]);
  });
});

describe("level object shape labels", () => {
  test("names the open fence and every older special scenery shape", () => {
    expect(levelShapeLabel("fence")).toBe("fence");
    expect(levelShapeLabel("ladder")).toBe("ladder");
    expect(levelShapeLabel("vineWeb")).toBe("vine web");
    expect(levelShapeLabel("topOutline")).toBe("top outline");
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

  // The player's loop now runs the same advanceAutoReloadWeapon step the AI does, so emptying a
  // clip starts the reload on its own — no R, no trigger pull on an empty chamber.
  test("emptying the clip starts a reload with no input at all", () => {
    const reloadFrames = weaponReloadFrames(0.5);
    let ammo = newWeaponAmmo(3);
    for (let i = 0; i < 3; i++) {
      ammo = advanceAutoReloadWeapon(ammo, 1, reloadFrames);
      expect(ammo.reloadT).toBe(0); // rounds still in the clip: nothing auto-starts
      ammo = consumeShot(ammo, 1);
    }
    expect(ammo.ammo).toBe(0);
    ammo = advanceAutoReloadWeapon(ammo, 1, reloadFrames);
    expect(ammo.reloadT).toBe(reloadFrames);
  });

  test("an unlimited-ammo weapon (clip 0) never starts a reload on its own", () => {
    let ammo = newWeaponAmmo(0);
    for (let i = 0; i < 5; i++) {
      ammo = consumeShot(ammo, 1);
      ammo = advanceAutoReloadWeapon(ammo, 1, weaponReloadFrames(0.5));
    }
    expect(ammo.reloadT).toBe(0);
    expect(needsReload(ammo)).toBe(false);
  });
});

describe("which abilities a weapon may carry", () => {
  test("a melee weapon is offered exactly the powers a swing can carry", () => {
    expect(weaponAbilitiesFor("melee").sort()).toEqual(["ignoreArmor", "resurrect", "stun"]);
    expect(weaponAbilitiesFor(undefined).sort()).toEqual(["ignoreArmor", "resurrect", "stun"]); // older saves have no wtype
  });

  test("a ranged weapon still gets the full list", () => {
    expect(weaponAbilitiesFor("ranged").sort()).toEqual(Object.keys(WEAPON_ABILITIES).sort());
    expect(weaponAbilitiesFor("projectile").sort()).toEqual(Object.keys(WEAPON_ABILITIES).sort());
  });

  // Switching a ranged weapon to melee must not strand a flag it already has where nothing can
  // reach it — an ability that is ON is always listed, so it can at least be removed.
  test("a flag already set on a melee weapon stays listed so it can be taken off", () => {
    expect(weaponAbilitiesFor("melee", { explode: true })).toContain("explode");
    expect(weaponAbilitiesFor("melee", { explode: false })).not.toContain("explode");
  });
});

describe("how fine the editors are", () => {
  test("blocks land on half units, and whole numbers stay whole", () => {
    expect(PIECE_STEP).toBe(0.5);
    expect(snapPiece(10.2)).toBe(10);
    expect(snapPiece(10.3)).toBe(10.5);
    expect(snapPiece(10.7)).toBe(10.5);
    expect(snapPiece(10.8)).toBe(11);
    expect(snapPiece(-3.3)).toBe(-3.5);
    for (const whole of [0, 7, 42, 199]) expect(snapPiece(whole)).toBe(whole); // existing art never shifts
  });

  test("a block can be half the old minimum size", () => {
    expect(MIN_PIECE_SIZE).toBe(3);
    expect(Math.max(MIN_PIECE_SIZE, snapPiece(1))).toBe(3);
    expect(Math.max(MIN_PIECE_SIZE, snapPiece(4.4))).toBe(4.5);
  });

  test("the object nudge moves half a cell at a time and is clamped", () => {
    expect(OBJ_NUDGE_STEP).toBe(0.5);
    expect(clampObjNudge(0.5)).toBe(0.5);
    expect(clampObjNudge(-0.5)).toBe(-0.5);
    expect(clampObjNudge(0.3)).toBe(0.5);
    expect(clampObjNudge(999)).toBe(OBJ_NUDGE_LIMIT);
    expect(clampObjNudge(-999)).toBe(-OBJ_NUDGE_LIMIT);
    expect(clampObjNudge(undefined)).toBe(0);
  });

  test("an object with no nudge draws exactly where it always did", () => {
    expect(objNudgedLeft({}, 4, 30)).toBe(120);
    expect(objNudgedTop({}, 7, 30)).toBe(210);
    expect(objNudgedLeft(undefined, 4, 30)).toBe(120);
    expect(objNudgedLeft({ ox: 0.5 }, 4, 30)).toBe(135);
    expect(objNudgedTop({ oy: -0.5 }, 7, 30)).toBe(195);
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

describe("objects place centred on the clicked cell", () => {
  test("a 1x object still lands exactly where it was clicked", () => {
    expect(objAnchor(10, 20, 1)).toEqual({ r: 10, c: 20 });
    expect(objAnchorKey(10, 20, 1)).toBe("10,20");
  });

  test("a big object straddles the clicked cell instead of hanging down-right of it", () => {
    // 20x anchored at row 1 / col 11 covers rows 1..20 and cols 11..30 — the clicked cell (10,20)
    // sits inside it, which is the whole point. Corner-anchoring put it at rows 10..29.
    expect(objAnchor(10, 20, 20)).toEqual({ r: 1, c: 11 });
    expect(objAnchor(30, 30, 3)).toEqual({ r: 29, c: 29 });
  });

  test("an object aimed near the top-left edge keeps an on-map anchor", () => {
    expect(objAnchor(0, 0, 60)).toEqual({ r: 0, c: 0 });
    expect(objAnchor(2, 40, 10)).toEqual({ r: 0, c: 36 });
  });

  test("size defaults to 1 when it is missing", () => {
    expect(objAnchor(5, 5)).toEqual({ r: 5, c: 5 });
  });

  test("a wide 40x Prop uses its visible art height instead of a 40-row invisible square", () => {
    const prop = {
      frames: [{
        front: [
          { id: "trailer", x: 0, y: 190, w: 200, h: 50 },
          { id: "bad-hitbox", x: 0, y: 0, w: 200, h: 260, isHitbox: true },
          { id: "cutter", x: 0, y: 20, w: 200, h: 100, isCutter: true },
        ],
      }],
    };
    expect(propVisibleArtBox(prop)).toEqual({ minX: 0, minY: 190, w: 200, h: 50 });
    const footprint = levelObjectFootprint({ kind: "prop", size: 40, fitArt: true }, prop);
    expect(footprint.cols).toBe(40);
    expect(footprint.rows).toBe(10);
    expect(objAnchorForObject(2, 30, { kind: "prop", size: 40, fitArt: true }, prop)).toEqual({ r: 0, c: 11 });
  });

  test("legacy Prop placements keep their square bounds until explicitly converted", () => {
    const prop = { angles: { front: [{ id: "wide", x: 0, y: 200, w: 200, h: 40 }] } };
    expect(levelObjectFootprint({ kind: "prop", size: 40 }, prop)).toEqual({ cols: 40, rows: 40, box: null });
  });
});

describe("finding the object under a clicked cell", () => {
  const lv = { fx: { "1,11": [{ kind: "emoji", char: "🌳", size: 20 }], "10,20": [{ kind: "emoji", char: "🍄", size: 1 }] } };

  test("the cell a big object was aimed at finds that object, not nothing", () => {
    expect(objKeyAt({ fx: { "1,11": [{ size: 20 }] } }, 10, 20)).toBe("1,11");
  });

  test("an exact anchor hit wins outright", () => {
    expect(objKeyAt(lv, 1, 11)).toBe("1,11");
  });

  test("the smallest object covering the cell wins, so a prop beats the backdrop under it", () => {
    expect(objKeyAt(lv, 10, 20)).toBe("10,20");
  });

  test("a cell outside every footprint finds nothing", () => {
    expect(objKeyAt(lv, 40, 40)).toBe(null);
    expect(objKeyAt({ fx: {} }, 0, 0)).toBe(null);
    expect(objKeyAt(null, 0, 0)).toBe(null);
  });

  test("an emptied stack is not treated as an object", () => {
    expect(objKeyAt({ fx: { "3,3": [] } }, 3, 3)).toBe(null);
  });

  test("tight Prop lookup ignores the old square's empty rows", () => {
    const prop = { id: "trailer", angles: { front: [{ id: "wide", x: 0, y: 200, w: 200, h: 40 }] } };
    const lv = { fx: { "0,11": [{ kind: "prop", propId: "trailer", size: 40, fitArt: true }] } };
    const findAsset = (id) => id === "trailer" ? prop : null;
    expect(objKeyAt(lv, 4, 20, findAsset)).toBe("0,11");
    expect(objKeyAt(lv, 12, 20, findAsset)).toBe(null);
  });
});

describe("erasing one exact level object", () => {
  test("removes only the clicked stack entry and leaves overlapping props intact", () => {
    const bottom = { kind: "prop", propId: "house" };
    const clicked = { kind: "prop", propId: "tree" };
    const top = { kind: "prop", propId: "awning" };
    const lv = { fx: { "4,7": [bottom, clicked, top], "8,2": [{ kind: "emoji", char: "x" }] } };

    const out = removeLevelObject(lv, "4,7", 1);

    expect(out.fx["4,7"]).toEqual([bottom, top]);
    expect(out.fx["8,2"]).toEqual(lv.fx["8,2"]);
    expect(out.fx).not.toBe(lv.fx);
    expect(lv.fx["4,7"]).toEqual([bottom, clicked, top]);
  });

  test("drops the anchor only when its last object is erased", () => {
    expect(removeLevelObject({ fx: { "2,3": [{ kind: "shape" }] } }, "2,3", 0).fx["2,3"]).toBeUndefined();
  });

  test("a stale target is a safe no-op", () => {
    const lv = { fx: { "2,3": [{ kind: "shape" }] } };
    expect(removeLevelObject(lv, "missing", 0)).toBe(lv);
    expect(removeLevelObject(lv, "2,3", 4)).toBe(lv);
  });
});

describe("changing a color everywhere covers brightness/glow/fade too", () => {
  const asset = () => ({
    angles: {
      front: [{ id: "a", color: "#2E7D32" }, { id: "b", color: "#8D6E63", fx: { opacity: 1, glow: 0, glowColor: "#ffd76b", bright: 1 } }],
      side: [{ id: "c", color: "#2e7d32", fx: { opacity: 0.5, glow: 4, glowColor: "#fff", bright: 1 } }],
    },
    variants: { tall: { front: [{ id: "d", color: "#2E7D32" }] } },
  });

  test("every piece sharing the color is dimmed, in all poses and every body fit", () => {
    const out = restyleAsset(asset(), "#2E7D32", { bright: 0.6 });
    expect(out.angles.front[0].fx.bright).toBe(0.6);
    expect(out.angles.side[0].fx.bright).toBe(0.6);
    expect(out.variants.tall.front[0].fx.bright).toBe(0.6);
  });

  test("a piece in a different color is untouched", () => {
    const out = restyleAsset(asset(), "#2E7D32", { bright: 0.6 });
    expect(out.angles.front[1].fx.bright).toBe(1);
  });

  test("matching is case-insensitive on the hex, same as recolor", () => {
    expect(restyleAsset(asset(), "#2e7d32", { glow: 8 }).angles.front[0].fx.glow).toBe(8);
  });

  test("the patch merges over a full default so a piece with no fx gets a complete one", () => {
    expect(restyleAsset(asset(), "#2E7D32", { bright: 0.6 }).angles.front[0].fx)
      .toEqual({ opacity: 1, glow: 0, glowColor: "#ffd76b", bright: 0.6 });
  });

  test("the rest of a piece's existing fx survives the patch", () => {
    const out = restyleAsset(asset(), "#2E7D32", { bright: 0.6 });
    expect(out.angles.side[0].fx).toEqual({ opacity: 0.5, glow: 4, glowColor: "#fff", bright: 0.6 });
  });

  test("recolor still walks the same pieces after the shared-walk refactor", () => {
    const out = recolorAsset(asset(), "#2E7D32", "#C62828");
    expect(out.angles.front[0].color).toBe("#C62828");
    expect(out.angles.side[0].color).toBe("#C62828");
    expect(out.variants.tall.front[0].color).toBe("#C62828");
    expect(out.angles.front[1].color).toBe("#8D6E63");
  });

  test("a missing asset or patch is a no-op rather than a crash", () => {
    expect(restyleAsset(null, "#2E7D32", { bright: 0.6 })).toBe(null);
    const a = asset();
    expect(restyleAsset(a, "#2E7D32", null)).toBe(a);
  });
});

describe("enemy Attack/Death poses survive a round-trip", () => {
  const enemyJson = () => ({
    type: "enemy", id: "eleph-1", name: "Elephant", hasArms: true,
    angles: {
      side: [{ id: "s1", kind: "rect", x: 0, y: 0, w: 40, h: 40, color: "#8d8578" }],
      attack: [{ id: "a1", kind: "rect", x: 5, y: 5, w: 30, h: 30, color: "#8d8578" }],
      death: [{ id: "d1", kind: "rect", x: 0, y: 30, w: 40, h: 10, color: "#8d8578" }],
    },
  });

  test("the Attack pose is still there after import, so the strike frame can play", () => {
    const out = normalizeAssetJson(enemyJson());
    expect(out.angles.attack).toHaveLength(1);
    expect(out.angles.attack[0].id).toBe("a1");
  });

  test("the Death pose survives too", () => {
    expect(normalizeAssetJson(enemyJson()).angles.death).toHaveLength(1);
  });

  test("the five base angles are still always present, even when the source omits them", () => {
    const out = normalizeAssetJson(enemyJson());
    for (const a of ["front", "back", "side", "up", "crouch"]) expect(Array.isArray(out.angles[a])).toBe(true);
  });

  test("an enemy's own states keep their extra poses as well", () => {
    const src = enemyJson();
    src.states = { normal: src.angles };
    expect(normalizeAssetJson(src).states.normal.attack).toHaveLength(1);
  });

  test("a junk pose value becomes an empty array rather than throwing", () => {
    const src = enemyJson();
    src.angles.attack = "not an array";
    expect(normalizeAssetJson(src).angles.attack).toEqual([]);
  });
});

describe("which way the player sprite faces", () => {
  test("Bob and any dressed look face right, so they mirror when walking left", () => {
    for (const type of ["body", "skin", "character", "equipment"]) {
      expect(playerSpriteMirrored({ type }, -1)).toBe(true);
      expect(playerSpriteMirrored({ type }, 1)).toBe(false);
    }
  });

  test("no player asset at all keeps the old right-facing default", () => {
    expect(playerSpriteMirrored(null, -1)).toBe(true);
    expect(playerSpriteMirrored(undefined, 1)).toBe(false);
  });

  test("playing AS a raw enemy mirrors on the other facing, since its art is drawn left", () => {
    expect(playerSpriteMirrored({ type: "enemy" }, 1)).toBe(true);
    expect(playerSpriteMirrored({ type: "enemy" }, -1)).toBe(false);
  });

  test("an enemy whose creator ticked faceRight behaves like Bob", () => {
    expect(playerSpriteMirrored({ type: "enemy", faceRight: true }, -1)).toBe(true);
    expect(playerSpriteMirrored({ type: "enemy", faceRight: true }, 1)).toBe(false);
  });

  test("playing as an enemy agrees with how that same enemy is drawn when spawned", () => {
    // The whole point: the sprite must not face one way as a spawn and the other as the player.
    for (const ea of [{ type: "enemy" }, { type: "enemy", faceRight: true }, { type: "character" }]) {
      for (const face of [1, -1]) expect(playerSpriteMirrored(ea, face)).toBe(enemyNeedsFlip(ea, face));
    }
  });

  test("a missing facing is treated as facing right", () => {
    expect(playerSpriteMirrored({ type: "enemy" }, 0)).toBe(true);
    expect(playerSpriteMirrored({ type: "body" }, undefined)).toBe(false);
  });
});

describe("enemy reload bar progress", () => {
  test("fills from empty to full across the weapon's own reload time", () => {
    const total = weaponReloadFrames(2);           // 2s -> 120 frames
    const done = (reloadT) => Math.max(0, Math.min(1, 1 - reloadT / total));
    expect(done(total)).toBe(0);                   // just started reloading
    expect(done(total / 2)).toBeCloseTo(0.5);
    expect(done(0)).toBe(1);                       // about to fire again
  });

  test("a longer reload takes proportionally longer to fill", () => {
    expect(weaponReloadFrames(4)).toBe(2 * weaponReloadFrames(2));
  });

  test("never overshoots if the counter is stale or negative", () => {
    const total = weaponReloadFrames(1);
    const done = (reloadT) => Math.max(0, Math.min(1, 1 - reloadT / total));
    expect(done(-5)).toBe(1);
    expect(done(total * 3)).toBe(0);
  });
});

describe("a weapon's cutter stays with the piece it cuts", () => {
  // Bobs Bow's real Side pieces: a dark limb flagged behindArm, an unflagged cutter that carves the
  // bow's curve out of it, then the bowstring.
  const limb = { id: "rlnpmov", behindArm: true, _isWeapon: true };
  const cutter = { id: "gyc7d2z", isCutter: true, _isWeapon: true };
  const string = { id: "u91kmak", _isWeapon: true };
  const bow = [limb, cutter, string];

  test("the cutter follows its target behind the arm instead of being stranded in front", () => {
    const { behind, front } = groupWeaponBlocksByArm(bow);
    expect(behind.map((p) => p.id)).toEqual(["rlnpmov", "gyc7d2z"]);
    expect(front.map((p) => p.id)).toEqual(["u91kmak"]);
  });

  test("cutter and target end up ADJACENT in the merged list, which is what makes the cut apply", () => {
    const body = [{ id: "torso" }, { id: "arm", role: "weaponArm" }, { id: "leg" }];
    const merged = mergeWeaponBlocks(body, bow);
    const iLimb = merged.findIndex((p) => p.id === "rlnpmov");
    const iCut = merged.findIndex((p) => p.id === "gyc7d2z");
    expect(iCut - iLimb).toBe(1);
    // and the cutter must still come BEFORE the arm it tucks behind
    expect(iCut).toBeLessThan(merged.findIndex((p) => p.id === "arm"));
  });

  test("a cutter over a front-arm piece stays in front", () => {
    const { behind, front } = groupWeaponBlocksByArm([{ id: "blade" }, { id: "cut", isCutter: true }]);
    expect(behind).toEqual([]);
    expect(front.map((p) => p.id)).toEqual(["blade", "cut"]);
  });

  test("several behind/front pairs each keep their own cutter", () => {
    const { behind, front } = groupWeaponBlocksByArm([
      { id: "b1", behindArm: true }, { id: "c1", isCutter: true },
      { id: "f1" }, { id: "c2", isCutter: true },
      { id: "b2", behindArm: true }, { id: "c3", isCutter: true },
    ]);
    expect(behind.map((p) => p.id)).toEqual(["b1", "c1", "b2", "c3"]);
    expect(front.map((p) => p.id)).toEqual(["f1", "c2"]);
  });

  test("a leading cutter with nothing below it goes in front, not behind", () => {
    expect(groupWeaponBlocksByArm([{ id: "c", isCutter: true }]).front.map((p) => p.id)).toEqual(["c"]);
  });

  test("no behindArm piece at all still just concatenates, as before", () => {
    const body = [{ id: "arm", role: "weaponArm" }];
    expect(mergeWeaponBlocks(body, [{ id: "w1" }]).map((p) => p.id)).toEqual(["arm", "w1"]);
  });
});

describe("what pose an item is displayed in on a pedestal", () => {
  const withPose = (ang) => ({ angles: { front: [], side: [], back: [], up: [], crouch: [], [ang]: [{ id: "p" }] } });

  test("equipment and items keep drawing front-on", () => {
    expect(displayPoseKey(withPose("front"))).toBe("front");
  });

  test("a weapon with no front art falls to Side instead of rendering as \"no match\"", () => {
    // Bobs Bow: front is empty, side/back/up/crouch are drawn.
    const bow = { angles: { front: [], back: [{ id: "b" }], side: [{ id: "s" }], up: [{ id: "u" }], crouch: [{ id: "c" }] } };
    expect(displayPoseKey(bow)).toBe("side");
  });

  test("falls further back if even Side is empty, so anything drawn still shows", () => {
    expect(displayPoseKey(withPose("up"))).toBe("up");
    expect(displayPoseKey(withPose("crouch"))).toBe("crouch");
  });

  test("a genuinely empty asset reports front and lets the caller show its placeholder", () => {
    expect(displayPoseKey({ angles: { front: [], side: [] } })).toBe("front");
    expect(displayPoseKey(null)).toBe("front");
  });
});

describe("holding Fire locks the aim pose", () => {
  const held = (o) => armHoldsAimPose(true, false, o.fire, o.up, o.down, o.firing);

  test("a one-shot bow keeps the arm up through its auto-reload while F is held", () => {
    // The exact case: shot spent, nothing in p.firing any more, reloading — F still held.
    expect(held({ fire: true, firing: null })).toBe(true);
  });

  test("letting go of Fire mid-reload lowers the arm", () => {
    expect(held({ fire: false, firing: null })).toBe(false);
  });

  test("the firing window and the aim keys still raise it on their own", () => {
    expect(held({ fire: false, firing: { t: 0, dur: 30 } })).toBe(true);
    expect(held({ fire: false, up: true })).toBe(true);
    expect(held({ fire: false, down: true })).toBe(true);
  });

  test("climbing always wins — both hands are busy", () => {
    expect(armHoldsAimPose(true, true, true, true, true, { t: 0, dur: 30 })).toBe(false);
  });

  test("a melee weapon never holds the ranged aim pose", () => {
    expect(armHoldsAimPose(false, false, true, false, false, null)).toBe(false);
  });

  test("the fire pose is held long enough to read, and outlasts the old flash", () => {
    expect(RANGED_FIRE_POSE_FRAMES).toBeGreaterThan(16);
    expect(weaponPoseFired(true, { t: RANGED_FIRE_POSE_FRAMES - 1, dur: RANGED_FIRE_POSE_FRAMES })).toBe(true);
  });

  test("a pistol-whip leaves the gun on Rest — no round left the barrel", () => {
    const whip = { t: 6, dur: 12, unarmed: true };
    expect(weaponPoseFired(true, whip)).toBe(false);
    expect(weaponPoseFired(true, { ...whip, t: 11 })).toBe(false); // right through to the end of the swing
  });

  test("an unarmed swing can't fire a melee weapon's pose either", () => {
    expect(weaponPoseFired(false, { t: 11, dur: 12, unarmed: true })).toBe(false);
    expect(weaponPoseFired(false, { t: 11, dur: 12 })).toBe(true); // a real swing still swaps at the strike
  });
});

describe("copying a pose onto poses you pick", () => {
  const enemy = editablePoses("enemy");            // side, up, crouch, attack, death

  test("only the ticked poses are written — Attack and Death are left alone", () => {
    expect(copyAngleTargets(enemy, "side", ["up", "crouch"])).toEqual(["up", "crouch"]);
  });

  test("the pose you are copying FROM is never a target, even if it is ticked", () => {
    expect(copyAngleTargets(enemy, "side", ["side", "up"])).toEqual(["up"]);
    expect(copyAngleTargets(enemy, "side", ["side"])).toEqual([]);
  });

  test("no picks still means every other pose, so the old one-click behaviour is intact", () => {
    expect(copyAngleTargets(enemy, "side", [])).toEqual(["up", "crouch", "attack", "death"]);
    expect(copyAngleTargets(enemy, "side", undefined)).toEqual(["up", "crouch", "attack", "death"]);
  });

  test("a pose this asset type doesn't have is ignored rather than invented", () => {
    // "front" is not editable on an enemy; a stale tick must not write it.
    expect(copyAngleTargets(enemy, "side", ["front", "crouch"])).toEqual(["crouch"]);
    expect(copyAngleTargets(editablePoses("weapon", "melee"), "side", ["up"])).toEqual([]);
  });

  test("result follows the pose order, not the order they were ticked", () => {
    expect(copyAngleTargets(enemy, "side", ["death", "up", "attack"])).toEqual(["up", "attack", "death"]);
  });

  test("picking every other pose matches copying to all", () => {
    expect(copyAngleTargets(enemy, "attack", enemy)).toEqual(copyAngleTargets(enemy, "attack", []));
  });
});

describe("projectiles fly until they land, so height adds range", () => {
  const shot = (startY, groundY) => ({ startX: 0, startY, groundY, vx: 10, vy: 0, rangePx: 600 });

  test("the configured range still brings a level shot down to the firing ground exactly", () => {
    const pr = shot(100, 220);
    expect(projectilePositionAtDistance(pr, 600).y).toBe(220);
    expect(projectilePositionAtDistance(pr, 300).y).toBe(100); // first half stays flat
  });

  test("past its range the shot keeps travelling instead of being clamped", () => {
    const pr = shot(100, 220);
    const atRange = projectilePositionAtDistance(pr, 600);
    const beyond = projectilePositionAtDistance(pr, 900);
    expect(beyond.x).toBeGreaterThan(atRange.x);   // used to stop dead at rangePx
    expect(beyond.y).toBeGreaterThan(atRange.y);   // and keeps falling
  });

  test("drop keeps accelerating on the same curve, with no ceiling", () => {
    expect(projectileDropAtDistance(100, 220, 600, 600)).toBe(120);   // t=1
    expect(projectileDropAtDistance(100, 220, 900, 600)).toBe(480);   // t=2 -> 4x
    expect(projectileDropAtDistance(100, 220, 1200, 600)).toBe(1080); // t=3 -> 9x
  });

  test("firing from higher up covers more ground before reaching the same depth", () => {
    // Same weapon, same range, fired from a cliff (startY 100) vs at ground level (startY 400),
    // both measured to where the shot passes y=520. The high shot travels farther.
    const depth = 520;
    const distanceToDepth = (startY, groundY) => {
      const pr = shot(startY, groundY);
      for (let d = 1; d < 20000; d += 5) if (projectilePositionAtDistance(pr, d).y >= depth) return d;
      return Infinity;
    };
    expect(distanceToDepth(100, 220)).toBeGreaterThan(distanceToDepth(400, 520));
  });

  test("a shot with nowhere to fall still behaves — flat ground, no drop at all", () => {
    const pr = shot(200, 200);
    expect(projectilePositionAtDistance(pr, 5000).y).toBe(200);
  });
});

describe("Intelligence scales reload speed", () => {
  test("5 is neutral", () => {
    expect(reloadIntelligenceMultiplier(5)).toBe(1);
    expect(weaponReloadFrames(2, 5)).toBe(weaponReloadFrames(2));
  });

  test("the low end is a full 25% slower, the high end 25% faster", () => {
    expect(reloadIntelligenceMultiplier(1)).toBeCloseTo(1.25);
    expect(reloadIntelligenceMultiplier(10)).toBeCloseTo(0.75);
  });

  test("it moves smoothly and in the right direction either side of 5", () => {
    for (let i = 1; i < 10; i++) expect(reloadIntelligenceMultiplier(i)).toBeGreaterThan(reloadIntelligenceMultiplier(i + 1));
    expect(reloadIntelligenceMultiplier(3)).toBeCloseTo(1.125);
    expect(reloadIntelligenceMultiplier(7)).toBeCloseTo(0.9);
  });

  test("out-of-range or missing Intelligence is clamped, never inverted", () => {
    expect(reloadIntelligenceMultiplier(-99)).toBeCloseTo(1.25);
    expect(reloadIntelligenceMultiplier(99)).toBeCloseTo(0.75);
    expect(reloadIntelligenceMultiplier(undefined)).toBe(1);
    expect(reloadIntelligenceMultiplier(null)).toBe(1);
  });

  test("it reaches actual reload frames, and a genius still takes at least one frame", () => {
    expect(weaponReloadFrames(2, 10)).toBe(90);   // 120 frames * 0.75
    expect(weaponReloadFrames(2, 1)).toBe(150);   // 120 frames * 1.25
    expect(weaponReloadFrames(0, 10)).toBe(1);
  });

  test("a reload records its own total so the on-screen bar can't disagree with the timer", () => {
    const w = startReload({ clip: 1, ammo: 0, cd: 0, reloadT: 0 }, weaponReloadFrames(2, 10));
    expect(w.reloadT).toBe(90);
    expect(w.reloadTotal).toBe(90);
  });
});

describe("ignore-armor shots", () => {
  const hit = (ignore) => incomingPlayerDamage(20, 30, 1, 0, 100, null, null, false, ignore);

  test("armour normally soaks a big chunk of the hit", () => {
    expect(hit(false)).toBeLessThan(20);
  });

  test("an ignore-armor shot lands its full damage regardless of Defense", () => {
    expect(hit(true)).toBe(20);
    expect(incomingPlayerDamage(20, 999, 1, 0, 100, null, null, false, true)).toBe(20);
  });

  test("omitting the flag keeps every existing caller's behaviour", () => {
    expect(incomingPlayerDamage(20, 30, 1, 0, 100, null, null, false)).toBe(hit(false));
  });

  test("Back Guard and Crouch Guard still apply — piercing armour isn't piercing everything", () => {
    const guarded = incomingPlayerDamage(20, 30, 1, 0, 100, 0.5, null, false, true);
    expect(guarded).toBeLessThan(20);
  });

  test("damage never drops below the one-point floor", () => {
    expect(incomingPlayerDamage(1, 999, 1, 0, 100, null, null, false, false)).toBe(1);
  });
});

describe("burst fire", () => {
  const ammo = (o) => ({ clip: 10, ammo: 10, cd: 0, reloadT: 0, ...o });

  test("a normal gun is a one-round burst, so nothing changes for existing weapons", () => {
    expect(burstShotCount(undefined)).toBe(1);
    expect(burstShotCount(1)).toBe(1);
    expect(burstShotDue(0, 0, ammo())).toBe(false);   // nothing armed -> never fires on its own
  });

  test("the salvo size is clamped to something sane", () => {
    expect(burstShotCount(3)).toBe(3);
    expect(burstShotCount(0)).toBe(1);
    expect(burstShotCount(-5)).toBe(1);
    expect(burstShotCount(999)).toBe(10);
    expect(burstShotCount(2.6)).toBe(3);
  });

  test("burst spacing is its own clock, far tighter than the fire rate", () => {
    expect(burstDelayFrames(0.06)).toBe(4);
    expect(burstDelayFrames(undefined)).toBe(4);
    expect(burstDelayFrames(0)).toBe(1);              // never zero frames
    expect(burstDelayFrames(0.06)).toBeLessThan(weaponFireCooldownFrames(3));
  });

  test("a queued round fires once its spacing has elapsed, not before", () => {
    expect(burstShotDue(2, 3, ammo())).toBe(false);   // still counting down
    expect(burstShotDue(2, 0, ammo())).toBe(true);
    expect(burstShotDue(2, -1, ammo())).toBe(true);
  });

  test("a burst stops dead when the clip runs out mid-salvo", () => {
    expect(burstShotDue(2, 0, ammo({ ammo: 0 }))).toBe(false);
  });

  test("an unlimited-ammo weapon (clip 0) bursts freely", () => {
    expect(burstShotDue(2, 0, ammo({ clip: 0, ammo: 0 }))).toBe(true);
  });

  test("a reload cancels the rest of the burst", () => {
    expect(burstShotDue(2, 0, ammo({ reloadT: 30 }))).toBe(false);
  });

  test("a missing ammo record can't fire a phantom round", () => {
    expect(burstShotDue(2, 0, null)).toBe(false);
    expect(burstShotDue(2, 0, undefined)).toBe(false);
  });

  test("a 3-round burst spends exactly 3 rounds, then needs another pull", () => {
    // Walk the same bookkeeping the loop does: pull arms burst-1, each due shot spends one.
    let left = burstShotCount(3) - 1, fired = 1;
    while (burstShotDue(left, 0, ammo())) { fired += 1; left -= 1; }
    expect(fired).toBe(3);
    expect(left).toBe(0);
  });
});

describe("ranged firing-mode abilities", () => {
  test("a plain ranged weapon is semi-auto: one shot on the press edge", () => {
    const weapon = {};
    expect(weaponFireMode(weapon)).toBe("semi");
    expect(rangedTriggerWantsFire(true, false, weapon)).toBe(true);
    expect(rangedTriggerWantsFire(true, true, weapon)).toBe(false);
    expect(rangedTriggerWantsFire(false, false, weapon)).toBe(false);
    expect(weaponBurstShotCount(weapon)).toBe(1);
  });

  test("Full Auto repeats while Fire remains held", () => {
    const weapon = { fullAuto: true };
    expect(weaponFireMode(weapon)).toBe("auto");
    expect(rangedTriggerWantsFire(true, false, weapon)).toBe(true);
    expect(rangedTriggerWantsFire(true, true, weapon)).toBe(true);
    expect(rangedTriggerWantsFire(false, true, weapon)).toBe(false);
    expect(weaponBurstShotCount(weapon)).toBe(1);
  });

  test("Burst Fire stays edge-triggered and arms its configured salvo", () => {
    const weapon = { burstFire: true, burst: 4 };
    expect(weaponFireMode(weapon)).toBe("burst");
    expect(rangedTriggerWantsFire(true, false, weapon)).toBe(true);
    expect(rangedTriggerWantsFire(true, true, weapon)).toBe(false);
    expect(weaponBurstShotCount(weapon)).toBe(4);
  });

  test("Burst wins defensively if imported data has both mode flags", () => {
    const malformed = { burstFire: true, fullAuto: true, burst: 3 };
    expect(weaponFireMode(malformed)).toBe("burst");
    expect(rangedTriggerWantsFire(true, true, malformed)).toBe(false);
    expect(weaponBurstShotCount(malformed)).toBe(3);
  });

  test("older saved weapons default to semi-auto unless they explicitly configured a burst", () => {
    expect(migratedWeaponFireModes({ burst: 1 })).toEqual({ burstFire: false, fullAuto: false });
    expect(migratedWeaponFireModes({ burst: 3 })).toEqual({ burstFire: true, fullAuto: false });
    expect(migratedWeaponFireModes({ burst: 1, burstFire: false, fullAuto: false })).toEqual({ burstFire: false, fullAuto: false });
    expect(migratedWeaponFireModes({ burst: 1, burstFire: false, fullAuto: true })).toEqual({ burstFire: false, fullAuto: true });
  });
});

describe("twisting a placed object", () => {
  test("no twist means no transform at all", () => {
    expect(objRotStyle({ size: 4 })).toBe(null);
    expect(objRotStyle({ size: 4, rot: 0 })).toBe(null);
    expect(objRotStyle(null)).toBe(null);
  });

  test("a twist turns the art about its middle", () => {
    expect(objRotStyle({ rot: 26 })).toEqual({ transform: "rotate(26deg)" });
  });

  test("nudging past either end wraps instead of running off", () => {
    expect(normalizeObjRot(-OBJ_ROT_NUDGE)).toBe(360 - OBJ_ROT_NUDGE);
    expect(normalizeObjRot(360)).toBe(0);
    expect(normalizeObjRot(365)).toBe(5);
    expect(normalizeObjRot(-370)).toBe(350);
  });

  test("the nudge is shallow enough to angle something along a slope", () => {
    expect(OBJ_ROT_NUDGE).toBeLessThanOrEqual(15);
  });
});

describe("explosion blast reach", () => {
  // A 5-cell-wide, 7-cell-tall enemy at (400,200) on a 30px grid — a normal scale-1 monster.
  const bx = 400, by = 200, bw = 150, bh = 210;

  test("a direct hit always counts, however big the target", () => {
    // Struck square in the chest. The old centre-distance test put this ~100px from the centre,
    // outside a default 2-cell (60px) radius, and dealt nothing: the "my RPG does 0 damage" bug.
    expect(blastHitsBox(bx + 10, by + 20, bx, by, bw, bh, 60)).toBe(true);
    expect(blastHitsBox(bx + bw / 2, by + bh / 2, bx, by, bw, bh, 60)).toBe(true);
    expect(blastHitsBox(bx, by + bh, bx, by, bw, bh, 0)).toBe(true); // even a zero radius, right on the corner
  });

  test("radius measures how far PAST the body the splash reaches", () => {
    expect(blastHitsBox(bx - 59, by + 100, bx, by, bw, bh, 60)).toBe(true);
    expect(blastHitsBox(bx - 61, by + 100, bx, by, bw, bh, 60)).toBe(false);
  });

  test("a bigger enemy is easier to catch, not harder", () => {
    const small = blastHitsBox(bx - 30, by, bx, by, 40, 40, 60);
    const big = blastHitsBox(bx - 30, by, bx, by, bw, bh, 60);
    expect(small).toBe(true);
    expect(big).toBe(true);
  });

  test("distance to a box is zero inside it and euclidean outside", () => {
    expect(pointBoxDistance(bx + 5, by + 5, bx, by, bw, bh)).toBe(0);
    expect(pointBoxDistance(bx - 3, by - 4, bx, by, bw, bh)).toBe(5); // 3-4-5 off the corner
    expect(pointBoxDistance(bx + bw + 10, by + 50, bx, by, bw, bh)).toBe(10);
  });
});

describe("weapon abilities registry", () => {
  test("Burst Fire and Full Auto replace one another", () => {
    const burst = { ...WEAPON_ABILITIES.burstFire.on };
    expect(weaponAbilityKeys(burst)).toEqual(["burstFire"]);
    expect(weaponFireMode(burst)).toBe("burst");

    const automatic = { ...burst, ...WEAPON_ABILITIES.fullAuto.on };
    expect(weaponAbilityKeys(automatic)).toEqual(["fullAuto"]);
    expect(weaponFireMode(automatic)).toBe("auto");

    const burstAgain = { ...automatic, ...WEAPON_ABILITIES.burstFire.on };
    expect(weaponAbilityKeys(burstAgain)).toEqual(["burstFire"]);
    expect(weaponFireMode(burstAgain)).toBe("burst");
  });

  test("a resurrect staff and an explosive shot can never both be live", () => {
    const asExplosive = { explode: true };
    const nowRaising = { ...asExplosive, ...WEAPON_ABILITIES.resurrect.on };
    expect(weaponAbilityKeys(nowRaising)).toEqual(["resurrect"]);
    const backToBoom = { ...nowRaising, ...WEAPON_ABILITIES.explode.on };
    expect(weaponAbilityKeys(backToBoom)).toEqual(["explode"]);
  });

  test("removing an ability leaves the others alone", () => {
    const both = { explode: true, ignoreArmor: true };
    expect(weaponAbilityKeys({ ...both, ...WEAPON_ABILITIES.explode.off })).toEqual(["ignoreArmor"]);
  });

  test("a plain weapon has none", () => {
    expect(weaponAbilityKeys({})).toEqual([]);
    expect(weaponAbilityKeys(null)).toEqual([]);
  });
});

describe("melee block (Q/V with a melee weapon in hand)", () => {
  const guard = { t: 0, dur: BLOCK_FRAMES };

  test("a blow from the front, facing right, is turned aside", () => {
    expect(blockStopsHit(guard, 1, 200, 100)).toBe(true);
  });

  test("a blow from the front, facing left, is turned aside", () => {
    expect(blockStopsHit(guard, -1, 20, 100)).toBe(true);
  });

  test("no guard up means no block", () => {
    expect(blockStopsHit(null, 1, 200, 100)).toBe(false);
    expect(blockStopsHit(undefined, 1, 200, 100)).toBe(false);
  });

  test("an arm held out in front can't cover your back", () => {
    expect(blockStopsHit(guard, 1, 20, 100)).toBe(false);
    expect(blockStopsHit(guard, -1, 200, 100)).toBe(false);
  });

  test("an attacker standing in your own column counts as in front, same as Back Guard", () => {
    expect(blockStopsHit(guard, 1, 100, 100)).toBe(true);
  });

  test("a tap guarantees about a second of guard", () => {
    expect(BLOCK_FRAMES).toBe(60);
  });

  // advanceBlock — the tap/expire/recover cycle. Runs a whole guard the way the physics loop
  // does, one frame at a time, so these read as "what happens after N frames of holding Q".
  const runGuard = (frames, held, canGuard = true) => {
    let s = { t: null, cd: 0 };
    const log = [];
    for (let i = 0; i < frames; i++) {
      s = advanceBlock(s.t, s.cd, typeof held === "function" ? held(i) : held, canGuard, 1);
      log.push(s.t != null);
    }
    return { state: s, up: log };
  };

  test("pressing raises the guard", () => {
    expect(advanceBlock(null, 0, true, true).t).toBe(0);
  });

  test("a tap gives a full second even after the button comes back up", () => {
    // Press for one frame, then release: the guard still runs its whole BLOCK_FRAMES.
    const { up } = runGuard(BLOCK_FRAMES, (i) => i === 0);
    expect(up.every(Boolean)).toBe(true);
  });

  test("the arm comes down on its own — holding does NOT keep it up", () => {
    // The bug this whole change exists to fix: v2 let a held button guard forever.
    const { up } = runGuard(BLOCK_FRAMES + 1, true);
    expect(up[BLOCK_FRAMES - 1]).toBe(true);
    expect(up[BLOCK_FRAMES]).toBe(false);
  });

  test("holding auto-reengages once the recovery is paid, leaving a real gap", () => {
    const { up } = runGuard(BLOCK_FRAMES + BLOCK_RECOVER_FRAMES + 1, true);
    const down = up.slice(BLOCK_FRAMES, BLOCK_FRAMES + BLOCK_RECOVER_FRAMES);
    expect(down.some(Boolean)).toBe(false);                       // a genuine arms-down window
    expect(up[BLOCK_FRAMES + BLOCK_RECOVER_FRAMES]).toBe(true);   // then back up, unprompted
  });

  test("a held guard is up well under all of the time — that's the timing incentive", () => {
    const { up } = runGuard(600, true);
    const uptime = up.filter(Boolean).length / up.length;
    expect(uptime).toBeLessThan(0.75);
    expect(uptime).toBeGreaterThan(0.5); // but still worth holding — not a punishment
  });

  test("tapping again during the recovery doesn't skip it", () => {
    const { up } = runGuard(BLOCK_FRAMES + BLOCK_RECOVER_FRAMES, (i) => i % 2 === 0);
    expect(up.slice(BLOCK_FRAMES).some(Boolean)).toBe(false);
  });

  test("busy arms drop the guard at once, and cost no recovery", () => {
    const mid = advanceBlock(10, 0, true, true);
    const dropped = advanceBlock(mid.t, mid.cd, true, false); // started a swing
    expect(dropped.t).toBe(null);
    expect(dropped.cd).toBe(0);
    expect(advanceBlock(dropped.t, dropped.cd, true, true).t).toBe(0); // swing over, guard back up
  });

  test("after a tap expires, nothing happens until you press again", () => {
    // Auto-reengage is a property of HOLDING the button, not something the guard does by itself:
    // tap once and never touch it again and the arm stays down.
    const { state, up } = runGuard(BLOCK_FRAMES + BLOCK_RECOVER_FRAMES + 30, (i) => i === 0);
    expect(up.slice(0, BLOCK_FRAMES).every(Boolean)).toBe(true);
    expect(up.slice(BLOCK_FRAMES).some(Boolean)).toBe(false);
    expect(state.cd).toBe(0); // recovery fully paid, so the next press raises instantly
  });

  test("fractional dtMul still expires the guard on time", () => {
    // dtMul is fractional on a slow frame; the guard must not outlive BLOCK_FRAMES because of it.
    let s = { t: null, cd: 0 }, frames = 0;
    do { s = advanceBlock(s.t, s.cd, true, true, 0.5); frames++; } while (s.t != null && frames < 1000);
    expect(frames).toBe(BLOCK_FRAMES * 2 + 1);
  });

  test("toe to toe still counts as in front, whichever way you face", () => {
    // Sprites trading blows overlap, so the attacker centre can drift a little past yours while
    // you are plainly face to face. Anything inside half your own width is still the front.
    expect(blockStopsHit(guard, 1, 80, 100, 80)).toBe(true);
    expect(blockStopsHit(guard, -1, 120, 100, 80)).toBe(true);
  });

  test("but walking clean past an enemy still leaves it behind you", () => {
    expect(blockStopsHit(guard, 1, 20, 100, 80)).toBe(false);
  });

  test("no width given means no tolerance — the plain flank rule", () => {
    expect(blockStopsHit(guard, 1, 80, 100)).toBe(false);
  });

  test("a blocked attacker is left reeling for a beat", () => {
    expect(BLOCK_STAGGER_SECS).toBeGreaterThan(0);
  });
});

describe("what the player hits for", () => {
  // The regression these exist for: one 7-damage M16 did 14 damage in the hands of a Strength-10
  // character and 1 in the hands of a Strength-1 character, because both ranged hit-tests ran the
  // melee formula. Army Bob one-shot enemies Bobette needed ten hits to drop, with the same gun.
  test("a gun does its own damage no matter which BODY is holding it", () => {
    // playerRangedDamage takes no body stat at all — so the only way to prove the invariant is to
    // show the whole roster of Strength values the sliders allow collapses to one number. If ranged
    // ever grows a stat argument again, whoever adds it has to come here and delete this on purpose.
    const M16 = 7;
    const everyStrength = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const perCharacter = everyStrength.map(() => playerRangedDamage(M16));
    expect(new Set(perCharacter).size).toBe(1);
    expect(perCharacter[0]).toBe(M16);
    // And the melee formula it used to borrow really does spread out across that same roster —
    // this is the difference that was leaking into gunfire, not a hypothetical.
    const meleeSpread = everyStrength.map((s) => playerMeleeDamage(M16, s));
    expect(new Set(meleeSpread).size).toBeGreaterThan(1);
    expect(Math.max(...meleeSpread)).toBe(14); // Strength 10
    expect(Math.min(...meleeSpread)).toBe(1);  // Strength 1, rounded down and floored
  });

  test("the exact Army Bob vs Bobette case from the bug report", () => {
    // Both hold the same M16 against the same 10 HP enemy. Army Bob is Strength 10, Bobette is 1.
    const M16 = 7, ENEMY_HP = 10;
    const shotsToKill = (dmg) => Math.ceil(ENEMY_HP / dmg);
    const armyBob = shotsToKill(playerRangedDamage(M16));
    const bobette = shotsToKill(playerRangedDamage(M16));
    expect(armyBob).toBe(bobette);
    expect(armyBob).toBe(2);
    // What it used to be, and why the report read the way it did: a one-shot versus a full ten.
    expect(shotsToKill(playerMeleeDamage(M16, 10))).toBe(1);
    expect(shotsToKill(playerMeleeDamage(M16, 1))).toBe(10);
  });

  test("melee still rides Strength — 5 neutral, 1 a fifth, 10 double", () => {
    expect(playerMeleeDamage(10, 5)).toBe(10);
    expect(playerMeleeDamage(10, 1)).toBe(2);
    expect(playerMeleeDamage(10, 10)).toBe(20);
  });

  test("neither kind can round or scale a hit down to nothing", () => {
    // 7 x (1/5) = 1.4 rounds to 1: the floor is what stopped that being a 0-damage weapon, and it
    // is also what made the Strength-1 case land on exactly a tenth of a 10 HP enemy.
    expect(playerMeleeDamage(7, 1)).toBe(1);
    expect(playerMeleeDamage(1, 1)).toBe(1);
    expect(playerRangedDamage(0)).toBe(1);
    expect(playerRangedDamage(0.4)).toBe(1);
  });

  test("a missing damage number falls back to 5 rather than NaN", () => {
    expect(playerRangedDamage(undefined)).toBe(5);
    expect(playerMeleeDamage(undefined, 5)).toBe(5);
    expect(playerMeleeDamage(10, undefined)).toBe(10); // absent stat means baseline 5, not zero
  });

  test("crit chance is 2% per point of Intelligence, capped so hits stay ordinary", () => {
    // Crit applies to BOTH weapon kinds. For ranged it is the one and only thing about a character
    // that changes output, which is exactly how Blake wants it.
    expect(critChance(5)).toBeCloseTo(0.1);
    expect(critChance(10)).toBeCloseTo(0.2);
    expect(critChance(100)).toBe(0.6);
    expect(critChance(0)).toBe(0);
  });

  test("Tag Damage gear still boosts a gun — that is a feature, not the bug", () => {
    // Army Bob's 1.5x hat making his rifle hit harder than Bobette's is CORRECT and intended.
    // The bug was the BODY's Strength doing it, which no amount of gear-swapping could explain.
    // Gear is a choice you can take off; a body stat is not. Do not "fix" this into melee-only.
    const hat = [{ type: "tagBoost", tag: "rifle", mult: 1.5 }];
    expect(tagDamageMultiplier(hat, ["rifle"])).toBe(1.5);
    expect(tagDamageMultiplier([], ["rifle"])).toBe(1);
    // Stacks multiplicatively, and only for a matching tag.
    expect(tagDamageMultiplier([...hat, { type: "tagBoost", tag: "rifle", mult: 2 }], ["rifle"])).toBe(3);
    expect(tagDamageMultiplier(hat, ["bow"])).toBe(1);
    // Which is how the same gun legitimately reads as 2 shots vs 3 on a 15 HP enemy.
    const M16 = 7, ENEMY_HP = 15;
    const withHat = playerRangedDamage(M16 * tagDamageMultiplier(hat, ["rifle"]));
    const without = playerRangedDamage(M16 * tagDamageMultiplier([], ["rifle"]));
    expect(withHat).toBe(11);
    expect(without).toBe(7);
    expect(Math.ceil(ENEMY_HP / withHat)).toBe(2);
    expect(Math.ceil(ENEMY_HP / without)).toBe(3);
  });
});

describe("snap to edges", () => {
  const near = (u, v, tol = 0.05) => Math.hypot(u.x - v.x, u.y - v.y) <= tol;
  // The one assertion that matters: after snapping, some edge of the block lies exactly on the
  // target edge. Checking the join itself rather than literal x/y numbers means the test still
  // describes the FEATURE ("these two edges are now the same line") if the maths is ever reworked.
  const joins = (piece, P, Q) => pieceSnapEdges(piece).some((e) => (near(e.a, P) && near(e.b, Q)) || (near(e.a, Q) && near(e.b, P)));
  // Place a piece so a given fraction-point of its box sits on `pt` — test scaffolding only, used
  // to set up a block APPROXIMATELY near a neighbour before letting the snap correct it.
  const placeFracAt = (p, fx, fy, pt) => {
    const at = boxPoint({ x: 0, y: 0, w: p.w, h: p.h, rot: p.rot || 0, o: [0.5, 0.5] }, fx, fy);
    return { ...p, x: pt.x - at.x, y: pt.y - at.y };
  };

  test("a plain block offers its four box sides, and knows which are its width and its height", () => {
    const edges = pieceSnapEdges({ id: "a", kind: "rect", x: 10, y: 20, w: 40, h: 12 });
    expect(edges.map((e) => e.len)).toEqual([40, 12, 40, 12]);
    expect(edges.map((e) => e.axis)).toEqual(["x", "y", "x", "y"]);
    expect(edges[0].a).toEqual({ x: 10, y: 20 });
    expect(edges[0].b).toEqual({ x: 50, y: 20 });
  });

  test("a twisted block's edges are where they LOOK, not where its unrotated box was", () => {
    // 90° about the centre: the top side ends up running down the right-hand side.
    const edges = pieceSnapEdges({ id: "a", kind: "rect", x: 0, y: 0, w: 40, h: 20, rot: 90 });
    expect(near(edges[0].a, { x: 30, y: -10 })).toBe(true);
    expect(near(edges[0].b, { x: 30, y: 30 })).toBe(true);
    expect(edges[0].len).toBeCloseTo(40);
  });

  test("polygon shapes snap by their real silhouette, and hairline edges are ignored", () => {
    // A triangle's hypotenuse belongs to neither of the block's own axes — matching its length can
    // only be done by scaling the whole block, which is what axis:null records.
    const tri = pieceSnapEdges({ id: "t", kind: "tri", x: 0, y: 0, w: 30, h: 40 });
    expect(tri.map((e) => e.axis)).toEqual([null, "x", null]);
    // A semicircle is 32 tiny arc segments plus one real flat side. Only the flat side is something
    // you would ever butt another block up against, so it is the only candidate offered.
    const semi = pieceSnapEdges({ id: "s", kind: "halfcircle", x: 0, y: 0, w: 44, h: 22 });
    expect(semi.length).toBe(1);
    expect(semi[0].axis).toBe("x");
    expect(semi[0].len).toBeCloseTo(44);
  });

  test("nothing snaps until an edge is really close to a similar-length one", () => {
    const target = { id: "t", kind: "rect", x: 60, y: 60, w: 40, h: 10 };
    const far = { id: "m", kind: "rect", x: 60, y: 90, w: 40, h: 10 };   // 20 units of clear air below it
    expect(findEdgeSnap(far, [target])).toBe(null);
    const close = { id: "m", kind: "rect", x: 62, y: 73, w: 40, h: 10 }; // 3 units below the target's bottom edge
    expect(findEdgeSnap(close, [target])).not.toBe(null);
    // And it lets go again — the block must be draggable back OUT of a snap, which is why the
    // live drag always re-tests from the raw pointer position instead of the snapped result.
    expect(findEdgeSnap({ ...close, y: close.y + SNAP_DIST * 2 }, [target])).toBe(null);
  });

  test("a very different edge length is not 'a similar edge', however close it gets", () => {
    const target = { id: "t", kind: "rect", x: 60, y: 60, w: 40, h: 10 };
    const stub = { id: "m", kind: "rect", x: 76, y: 71, w: 8, h: 6 };
    // Its 8-long side sits 1 unit under the middle of a 40-long side, pointing the same way, and
    // still doesn't snap. Stretching it 5x is not "matching a really close size" — it is
    // destroying the block you drew.
    expect(findEdgeSnap(stub, [target])).toBe(null);
  });

  test("a block that is still visibly crooked isn't dragged straight behind your back", () => {
    // Distance and angle are separate tests. A block sitting right on the edge but 40° off is not
    // "nearly there" — you meant something else, and spinning it 40° would be the snap taking over
    // the drawing. Aim it roughly (within 15°) and the snap takes out the last couple of degrees.
    const target = { id: "t", kind: "rect", x: 60, y: 60, w: 40, h: 10 };
    const crooked = { id: "m", kind: "rect", x: 62, y: 73, w: 40, h: 10, rot: 40 };
    expect(findEdgeSnap(crooked, [target])).toBe(null);
    const nearly = { id: "m", kind: "rect", x: 62, y: 73, w: 40, h: 10, rot: 8 };
    expect(findEdgeSnap(nearly, [target])).not.toBe(null);
    expect(applyEdgeSnap(nearly, findEdgeSnap(nearly, [target])).rot).toBeCloseTo(0, 1);
  });

  test("distance is measured the same way whatever the edge is — a long edge is no harder to land", () => {
    // The reason midpoints are compared rather than endpoints: 6° of tilt throws the far end of a
    // 120-long edge more than 12 units, so an endpoint rule would demand a steadier hand the
    // longer the block got. Both of these are the same 3 units of gap and both must snap.
    const shortT = { id: "t", kind: "rect", x: 60, y: 60, w: 20, h: 10 };
    const longT = { id: "t", kind: "rect", x: 20, y: 60, w: 120, h: 10 };
    expect(findEdgeSnap({ id: "m", kind: "rect", x: 60, y: 73, w: 20, h: 10, rot: 6 }, [shortT])).not.toBe(null);
    expect(findEdgeSnap({ id: "m", kind: "rect", x: 20, y: 73, w: 120, h: 10, rot: 6 }, [longT])).not.toBe(null);
  });

  test("a block lands exactly on a twisted neighbour's edge, taking its angle and length", () => {
    const target = { id: "t", kind: "rect", x: 60, y: 80, w: 40, h: 10, rot: 20 };
    const bottom = pieceSnapEdges(target)[2]; // [1,1] -> [0,1]
    // Roughly in place, but wrong in all three ways at once: 3° off, 3 units short, and 2 units adrift.
    const rough = placeFracAt({ id: "m", kind: "rect", w: 37, h: 9, rot: 17 }, 1, 0, { x: bottom.a.x + 2, y: bottom.a.y + 1.5 });
    expect(joins(rough, bottom.a, bottom.b)).toBe(false);
    const snapped = applyEdgeSnap(rough, findEdgeSnap(rough, [target]));
    expect(joins(snapped, bottom.a, bottom.b)).toBe(true);
    expect(snapped.rot).toBeCloseTo(20, 1);   // the neighbour's angle exactly, not 17
    expect(snapped.w).toBeCloseTo(40, 1);     // and the neighbour's edge length, not 37
    expect(snapped.h).toBe(9);                // thickness untouched — only the matched side changed
  });

  test("matching a diagonal edge scales the whole block, since no single side owns that direction", () => {
    // Two half-triangles hypotenuse to hypotenuse — the second one turned round so it closes the
    // first into a square, which is exactly the "two ramps meeting along a slope" case.
    const target = { id: "t", kind: "tri2", x: 60, y: 60, w: 40, h: 40 };
    const slope = pieceSnapEdges(target)[0];
    expect(slope.axis).toBe(null);
    const rough = { id: "m", kind: "tri2", x: 66, y: 67, w: 32, h: 32, rot: 180 };
    const snapped = applyEdgeSnap(rough, findEdgeSnap(rough, [target]));
    expect(joins(snapped, slope.a, slope.b)).toBe(true);
    expect(snapped.w / snapped.h).toBeCloseTo(1);      // still the same shape it was drawn as…
    expect(snapped.w).toBeGreaterThan(rough.w);        // …just grown until its slope is the same length
    expect(snapped.rot).toBeCloseTo(180, 1);           // the two slopes already lay along the same line, so nothing had to turn
  });

  test("hitboxes and muzzle markers neither snap nor get snapped to", () => {
    // They are game-logic boxes drawn ON TOP of the weapon, so they are always the nearest edge to
    // something — left in, they would hijack every snap on a weapon.
    expect(canEdgeSnap({ kind: "rect" })).toBe(true);
    expect(canEdgeSnap({ kind: "rect", isHitbox: true })).toBe(false);
    expect(canEdgeSnap({ kind: "circle", isMuzzle: true })).toBe(false);
    const hitbox = { id: "t", kind: "rect", x: 60, y: 60, w: 40, h: 10, isHitbox: true };
    const near2 = { id: "m", kind: "rect", x: 62, y: 71, w: 40, h: 10 };
    expect(findEdgeSnap(near2, [hitbox])).toBe(null);
    expect(findEdgeSnap({ ...near2, isMuzzle: true }, [{ ...hitbox, isHitbox: false }])).toBe(null);
  });

  test("a held group only slides — every member moves by the same amount, none turns or resizes", () => {
    const target = { id: "t", kind: "rect", x: 60, y: 60, w: 40, h: 10 };
    const lead = { id: "a", kind: "rect", x: 62, y: 73, w: 40, h: 10, rot: 0 };
    const mate = { id: "b", kind: "rect", x: 62, y: 84, w: 40, h: 10, rot: 45 };
    const hit = findGroupEdgeSnap([lead, mate], [target]);
    expect(hit).not.toBe(null);
    // The lead member's top edge is 3 under the target's bottom edge and 2 to the right, so the
    // whole group slides back by exactly that — nothing rotates, nothing changes size.
    expect(hit.dx).toBeCloseTo(-2);
    expect(hit.dy).toBeCloseTo(-3);
    expect(Object.keys(hit)).not.toContain("rot");
  });

  test("an arm block snaps about its shoulder pivot, the same point the editor twists it about", () => {
    // A weapon arm rotates about its shoulder end, not its centre — using the centre here put its
    // edges somewhere the block visibly isn't.
    const arm = { id: "a", kind: "rect", x: 0, y: 0, w: 20, h: 60, rot: 90, role: "weaponArm", armPivot: "top" };
    expect(pieceBox(arm).o).toEqual([0.5, 0]);
    const top = pieceSnapEdges(arm)[0];
    expect(near(top.a, { x: 10, y: -10 })).toBe(true);  // pivot (10,0) stays put; the corner swings around it
    expect(near(top.b, { x: 10, y: 10 })).toBe(true);
  });
});
