import {
  DEFAULT_PROJECTILE_RANGE,
  capAirborneSpeed,
  cellSig,
  LV_OBJ_SIZES,
  exportLevelCount,
  paintIntoCell,
  enumerateHostKeys,
  mergeIndexWrite,
  objRotStyle,
  normalizeObjRot,
  OBJ_ROT_NUDGE,
  objectLayerClass,
  objectLay,
  levelObjectZIndex,
  LAYER_BASE_Z,
  orderEndLay,
  hazardStillBurning,
  throwImpactDamage,
  THROW_IMPACT_RADIUS_CELLS,
  applyLandingEffect,
  throwWeightMultiplier,
  throwRangeBlocks,
  DEFAULT_THROW_WEIGHT,
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
  layerTakesRamps,
  fgClipPath,
  mergeWeaponBlocks,
  normalizeAssetJson,
  boxesOverlap,
  tackleDownFrames,
  TACKLE_GETUP_GRACE_FRAMES,
  statusFreezeFrames,
  playerFrozen,
  stunPlayer,
  knockDownPlayer,
  tackleSecsOf,
  enemyTackleChargeChance,
  perFrameChance,
  TACKLE_CHARGE_RANGE,
  TACKLE_CHARGE_FRAMES,
  TACKLE_CHARGE_COOLDOWN_FRAMES,
  TACKLE_RECOVER_FRAMES,
  TACKLE_CHARGE_SPEED_MUL,
  mergeInputIntent,
  playerSpriteMirrored,
  RANGED_FIRE_POSE_FRAMES,
  weaponPoseFired,
  AIM_DIAGONAL,
  aimAngleDeg,
  aimArmOffsetDeg,
  isDiagonalAim,
  projectileAimRad,
  armPivotFrac,
  armPivotOrigin,
  pieceOriginFrac,
  pieceOriginCss,
  pieceOriginPoint,
  slopeSurfaceAt,
  slopeSurfaceForPlayer,
  rampSpanCells,
  rampDragSpan,
  TEXTURES,
  TEXTURE_KEYS,
  newTexture,
  pieceTextureStyle,
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
  OBJ_NUDGE_STEPS,
  OBJ_NUDGE_STEP_LABELS,
  levelObjectsInDrawOrder,
  withObjectDrawOrder,
  nextObjectZ,
  bottomObjectZ,
  snapTargetFor,
  relocateLevelObject,
  relocatedObjectKey,
  migrateLevel,
  objTopAt,
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
  assetColorGroup,
  recolorAssetGroup,
  restyleAssetGroup,
  editSnapshot,
  readEditSnapshot,
  stadiumRadius,
  SHAPE_POINTS,
  flipPiecesHorizontally,
  projectileDropAtDistance,
  projectilePositionAtDistance,
  projectileDropSlope,
  projectileAngleAtDistance,
  projectileFallSpeedMul,
  PROJECTILE_FALL_ACCEL,
  PROJECTILE_FALL_ACCEL_CAP,
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
  poseArtRightFrac,
  layFlatBodyBlocks,
  LAY_FLAT_IGNORES,
  pieceDrawnRight,
  pieceDrawnLeft,
  pieceDrawnSpan,
  poseArtLeftFrac,
  LAY_FLAT_ROT_DEG,
  LAY_FLAT_ROT_CSS,
  layFlatLiftPx,
  horizVel,
  resolvePlayerCrouch,
  playerPoseKey,
  pieceGroupBounds,
  scalePieceGroup,
  removePieceSelection,
  playerMeleeDamage,
  playerRangedDamage,
  UNARMED_DAMAGE,
  enemyAttackDamage,
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
  cellRuns,
  cellRunSig,
  enemyAttackCommitted,
  enemyFaceThisFrame,
  enemyMoveIntent,
  enemyFaceToward,
  armClimbAbs,
  armAimAbs,
  armPushOffAbs,
  CLIMB_PUSH_OFF_DEG,
  flipLevelHorizontally,
  flipFgFill,
  flipLevelObject,
  flipConns,
  maxPlayerHP,
  applyHeal,
  enemyMaxHP,
  doorAnimProgress,
} from "./App";

describe("door transitions", () => {
  // 1 = full size in the level, 0 = gone into the doorway.
  test("entering a room shrinks away into the door", () => {
    expect(doorAnimProgress({ transitioning: { mode: "enter", t: 0 } })).toBe(1);
    expect(doorAnimProgress({ transitioning: { mode: "enter", t: 15 } })).toBeCloseTo(0.5);
    expect(doorAnimProgress({ transitioning: { mode: "enter", t: 30 } })).toBe(0);
  });

  // The point of the change: leaving runs the same numbers the other way, so the exit is the
  // entrance played backwards rather than a second entrance.
  test("leaving a room grows back out of it", () => {
    expect(doorAnimProgress({ arriving: 30 })).toBe(0);
    expect(doorAnimProgress({ arriving: 15 })).toBeCloseTo(0.5);
    expect(doorAnimProgress({ arriving: 0 })).toBe(1);
  });

  // Frame for frame: at the same point into each animation, the exit is exactly as far out of the
  // door as the entrance is into it. (`transitioning.t` counts frames elapsed, `arriving` counts
  // frames remaining, which is why one reads forwards and the other backwards.)
  test("the two are exact mirrors at every step", () => {
    for (let elapsed = 0; elapsed <= 30; elapsed++) {
      const enter = doorAnimProgress({ transitioning: { t: elapsed } });
      const exit = doorAnimProgress({ arriving: 30 - elapsed });
      expect(exit).toBeCloseTo(1 - enter);
    }
  });

  test("standing in a level is full size, and neither animation overshoots", () => {
    expect(doorAnimProgress({})).toBe(1);
    expect(doorAnimProgress()).toBe(1);
    expect(doorAnimProgress({ transitioning: { t: 45 } })).toBe(0); // a slow frame can overshoot the count
    expect(doorAnimProgress({ arriving: 40 })).toBe(0);
  });
});

describe("where an enemy's HP comes from", () => {
  // A Dress Bob look is a player-shaped character, so it runs on the player's own pool. This is
  // the bug that prompted it: the look used to carry an `hp` typed into a separate box, so raising
  // the skin's HP stat changed the player and left every enemy built from that skin on 10.
  test("a Dress Bob enemy reads the look's stats, not the hp baked in when it was saved", () => {
    const look = { isEnemy: true, hp: 10, stats: { hp: 10 } };
    expect(enemyMaxHP(look)).toBe(50);
  });

  test("a Dress Bob enemy with default stats matches a default player", () => {
    expect(enemyMaxHP({ isEnemy: true, stats: { hp: 5 } })).toBe(25);
    expect(enemyMaxHP({ isEnemy: true })).toBe(25);
  });

  // Equipment worn in the look is already folded into its stats by assembleLook, so a +2 HP shirt
  // makes the enemy wearing it tougher for free.
  test("equipment worn in the look counts toward its HP", () => {
    expect(enemyMaxHP({ isEnemy: true, stats: { hp: 5 + 2 } })).toBe(35);
  });

  // The other half of the rule: an animal built in the Enemy creator has no skin stats to read,
  // so the number typed in that creator is the whole story and nothing derives over the top of it.
  test("an Enemy-creator asset keeps its own typed HP", () => {
    expect(enemyMaxHP({ type: "enemy", hp: 200, stats: { hp: 5 } })).toBe(200);
    expect(enemyMaxHP({ type: "enemy", hp: 3 })).toBe(3);
  });

  test("an enemy saved before HP existed still spawns with something", () => {
    expect(enemyMaxHP({ type: "enemy" })).toBe(10);
    expect(enemyMaxHP(null)).toBe(10);
  });
});

describe("the player's HP pool", () => {
  // The pool used to be 10 at baseline and 20 at a maxed stat, which is two and four hits from a
  // 5-damage weapon. These numbers are the point of the change, so they're pinned.
  test("a default character has 25 HP and a maxed HP stat has 50", () => {
    expect(maxPlayerHP({ stats: { hp: 5 } })).toBe(25);
    expect(maxPlayerHP({ stats: { hp: 10 } })).toBe(50);
    expect(maxPlayerHP({ stats: { hp: 1 } })).toBe(5);
  });

  test("a character with no stats at all still gets the baseline pool", () => {
    expect(maxPlayerHP({})).toBe(25);
    expect(maxPlayerHP(null)).toBe(25);
  });

  // Equipment adds to the stat before it's turned into a pool, so gear still matters at the new
  // scale — a +5 HP item is worth 25 HP, not 10. Boosting past the slider's own ceiling is fine.
  test("equipment HP boosts scale with the pool", () => {
    expect(maxPlayerHP({ stats: { hp: 5 + 2 } })).toBe(35);
    expect(maxPlayerHP({ stats: { hp: 10 + 5 } })).toBe(75);
  });

  test("a negative HP stat can't drop the pool below 1", () => {
    expect(maxPlayerHP({ stats: { hp: 0 } })).toBe(1);
    expect(maxPlayerHP({ stats: { hp: -3 } })).toBe(1);
  });

  // Heals clamp to the pool, so the bigger pool is what makes a heal item worth picking up.
  test("a heal fills toward the new, larger max", () => {
    const mx = maxPlayerHP({ stats: { hp: 5 } });
    expect(applyHeal(4, mx, 20)).toBe(24);
    expect(applyHeal(20, mx, 20)).toBe(25);
  });
});

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

describe("laying a tackled body flat on the ground", () => {
  // The render sizes every sprite the same way: a box PLAYER_RENDER_W_CELLS wide by
  // PLAYER_H_CELLS tall at LV_CELL = 30, i.e. 161.54 x 210 for a scale-1 character.
  const BOX_W = 30 * 7 * (200 / 260), BOX_H = 30 * 7;
  // What the browser actually does with `transform-origin: 50% 100%;
  // transform: translateY(-lift) rotate(-90deg)`: rotate about the wrapper's bottom-centre, then
  // shift up by the lift. A COUNTER-clockwise quarter turn maps a point at local x to a screen y
  // of (BOX_W/2 - x) below that origin — so the art's LEFT edge is the one that ends up lowest,
  // which is why the lift comes off poseArtLeftFrac. Returns the lowest pixel the laid-out BODY
  // reaches (a cape or hat brim is allowed to hang below it, and does), in the same absolute
  // space as `wrapperTop`.
  const fallenBodyBottom = (blocks, wrapperTop) => {
    const lift = layFlatLiftPx(blocks, BOX_W, BOX_H);
    const bodyLeftPx = poseArtLeftFrac(layFlatBodyBlocks(blocks)) * BOX_W;
    return wrapperTop + BOX_H + (BOX_W / 2 - bodyLeftPx) - lift;
  };
  // Where the same sprite's lowest pixel sits while it is still on its feet — the ground line.
  const standingBottom = (blocks, wrapperTop) => wrapperTop + BOX_H - poseFootGapFrac(blocks) * BOX_H;

  // A 40x10 bar turned on its end covers 10 units of width, not 40 — the stored x + w is 140 and
  // the pixels stop at 125. This is the whole reason a wide rotated monster used to miss the floor.
  test("a rotated piece reports the box it paints, not the box it is stored as", () => {
    const bar = { id: "bar", x: 100, y: 100, w: 40, h: 10 };
    expect(pieceDrawnRight(bar)).toBe(140);
    expect(pieceDrawnRight({ ...bar, rot: 90 })).toBeCloseTo(125, 8);
    expect(pieceDrawnRight({ ...bar, rot: -90 })).toBeCloseTo(125, 8);
    expect(pieceDrawnRight({ ...bar, rot: 180 })).toBeCloseTo(140, 8); // straight back over itself
  });

  // An arm turns about its shoulder, not its middle, and a mirrored twin is reflected about that
  // same point — so both have to come off pieceOriginFrac or the answer is right-shaped and wrong.
  test("an arm swings about its shoulder, and a mirrored twin reflects about the same point", () => {
    const arm = { id: "arm", x: 100, y: 100, w: 20, h: 60, limb: "arm", armPivot: "top" };
    expect(pieceDrawnRight(arm)).toBe(120);
    // Shoulder at (110, 100); swung flat, the 60-long arm reaches 60 past it.
    expect(pieceDrawnRight({ ...arm, rot: -90 })).toBeCloseTo(170, 8);
    // The mirrored twin reaches the other way, so its far end goes left and nothing is left on the
    // right but the shoulder the whole thing hangs off.
    expect(pieceDrawnRight({ ...arm, rot: -90, _m: true })).toBeCloseTo(110, 8);
  });

  // The reported bug: "tackled enemies should fall on their back not their front". A quarter turn
  // about the feet lands a character face-DOWN when it goes clockwise and face-UP when it goes
  // counter-clockwise, because the belly of right-facing art points along +x and the turn is what
  // decides whether +x ends up pointing at the floor or the sky.
  test("a tackled body goes over backwards, so it lands on its back", () => {
    expect(LAY_FLAT_ROT_DEG).toBe(-90);
    expect(LAY_FLAT_ROT_CSS).toBe("rotate(-90deg)");
  });

  // The half of that change which is easy to forget, and which silently un-fixes the floating-body
  // bug if it is missed: which edge of the standing art the turn sends floorwards depends on the
  // SIGN of the rotation. The art here is deliberately off-centre (20 units of margin on the left,
  // 120 on the right), so measuring the wrong edge is a visibly different number rather than an
  // accidental match.
  test("the lift is measured off the edge the fall actually sends floorwards", () => {
    const offCentre = [{ id: "torso", x: 20, y: 40, w: 60, h: 200 }];
    const lift = layFlatLiftPx(offCentre, BOX_W, BOX_H);
    expect(lift).toBeCloseTo(BOX_W / 2 - poseArtLeftFrac(offCentre) * BOX_W + poseFootGapFrac(offCentre) * BOX_H, 8);
    // ...and it is emphatically NOT the clockwise answer, which is what the code used to compute.
    const clockwiseLift = poseArtRightFrac(offCentre) * BOX_W - BOX_W / 2 + poseFootGapFrac(offCentre) * BOX_H;
    expect(Math.abs(lift - clockwiseLift)).toBeGreaterThan(BOX_W / 4);
    // The invariant still holds under the new direction: the feet touch what they touched.
    expect(fallenBodyBottom(offCentre, 400)).toBeCloseTo(standingBottom(offCentre, 400), 6);
  });

  test("reads the left-hand edge of the drawn art, ignoring hitbox and muzzle markers", () => {
    expect(poseArtLeftFrac([{ id: "torso", x: 60, y: 40, w: 40, h: 200 }])).toBeCloseTo(60 / 200, 8);
    expect(poseArtLeftFrac([{ id: "torso", x: 60, y: 40, w: 40, h: 200 }, { id: "hb", isHitbox: true, x: 0, y: 0, w: 200, h: 260 }])).toBeCloseTo(60 / 200, 8);
    expect(poseArtLeftFrac([{ id: "torso", x: 60, y: 40, w: 40, h: 200 }, { id: "mz", isMuzzle: true, x: 2, y: 90, w: 8, h: 8 }])).toBeCloseTo(60 / 200, 8);
    // Not clamped at 0, for the same reason its twin is not clamped at 1 — art may hang off the
    // left of the canvas, and pretending it starts at the edge floats the body.
    expect(poseArtLeftFrac([{ id: "trunk", x: -8, y: 60, w: 188, h: 120 }])).toBeCloseTo(-8 / 200, 8);
    // No art is the block-less fallback sprite, a div that really does fill its wrapper.
    expect(poseArtLeftFrac([])).toBe(0);
    expect(poseArtLeftFrac(null)).toBe(0);
  });

  // Both edges come out of one corner walk, so a rotated or mirrored piece can never report a
  // left that disagrees with its right.
  test("one corner walk answers for both edges of a rotated piece", () => {
    const bar = { id: "bar", x: 100, y: 100, w: 40, h: 10 };
    expect(pieceDrawnSpan(bar)).toEqual({ left: 100, right: 140 });
    expect(pieceDrawnLeft({ ...bar, rot: 90 })).toBeCloseTo(115, 8);   // 40x10 on its end covers 10
    expect(pieceDrawnRight({ ...bar, rot: 90 })).toBeCloseTo(125, 8);
    const arm = { id: "arm", x: 100, y: 100, w: 20, h: 60, limb: "arm", armPivot: "top" };
    // Shoulder at (110,100); swung flat the arm reaches 60 past it, and its mirrored twin reaches
    // 60 the other way — measured about that same shoulder, not the middle of the box.
    expect(pieceDrawnLeft({ ...arm, rot: -90 })).toBeCloseTo(110, 8);
    expect(pieceDrawnLeft({ ...arm, rot: -90, _m: true })).toBeCloseTo(50, 8);
    for (const p of [bar, { ...bar, rot: 33 }, { ...arm, rot: -90, _m: true }]) {
      const s = pieceDrawnSpan(p);
      expect(s.left).toBeLessThanOrEqual(s.right);
    }
  });

  test("reads the right-hand edge of the drawn art, ignoring hitbox and muzzle markers", () => {
    expect(poseArtRightFrac([{ id: "torso", x: 60, y: 40, w: 40, h: 200 }])).toBeCloseTo(100 / 200, 8);
    expect(poseArtRightFrac([{ id: "torso", x: 60, y: 40, w: 40, h: 200 }, { id: "hb", isHitbox: true, x: 0, y: 0, w: 200, h: 260 }])).toBeCloseTo(100 / 200, 8);
    expect(poseArtRightFrac([{ id: "torso", x: 60, y: 40, w: 40, h: 200 }, { id: "mz", isMuzzle: true, x: 190, y: 90, w: 8, h: 8 }])).toBeCloseTo(100 / 200, 8);
  });

  // Not clamped: a scaled-up monster's art genuinely runs past the edge of the design canvas, and
  // pretending it stops there is what used to bury it in the floor.
  test("art that overhangs the canvas reports more than the full width", () => {
    expect(poseArtRightFrac([{ id: "trunk", x: 20, y: 60, w: 188, h: 120 }])).toBeCloseTo(208 / 200, 8);
  });

  // No art means the block-less fallback sprite — a plain div that fills its wrapper — so "the art
  // reaches the right edge" is the correct reading, and reproduces the old flat half-width lift.
  test("an empty pose falls back to a full-width box", () => {
    expect(poseArtRightFrac([])).toBe(1);
    expect(poseArtRightFrac(null)).toBe(1);
    expect(layFlatLiftPx(null, BOX_W, BOX_H)).toBeCloseTo(BOX_W / 2, 8);
  });

  // THE invariant: falling over must not change what your feet are touching. Whatever pixel was
  // lowest while standing is the pixel that ends up on the ground lying down.
  test("a floored body's lowest pixel lands exactly where it stood", () => {
    const bobLike = [{ id: "torso", x: 58, y: 30, w: 60, h: 150 }, { id: "leg", x: 66, y: 180, w: 20, h: 80 }];
    const hatted = [...bobLike, { id: "brim", _slot: "hat", x: 40, y: 24, w: 150, h: 14 }];
    const stumpy = [{ id: "blob", x: 70, y: 120, w: 50, h: 60 }]; // stops well short of the canvas floor
    for (const blocks of [bobLike, hatted, stumpy]) {
      expect(fallenBodyBottom(blocks, 400)).toBeCloseTo(standingBottom(blocks, 400), 6);
    }
  });

  // A rifle held out front, a hat brim and a cape all reach further than the body does, and resting
  // the lift on them left the unit balanced on its gear with the body still in the air. The body is
  // what lands; the gear is allowed to clip through the floor.
  test("the body lands on the ground, not on the gear it is wearing", () => {
    const bobLike = [{ id: "torso", x: 58, y: 30, w: 60, h: 150 }, { id: "leg", x: 66, y: 180, w: 20, h: 80 }];
    const bare = layFlatLiftPx(bobLike, BOX_W, BOX_H);
    const armed = [...bobLike, { id: "barrel", _isWeapon: true, x: 118, y: 100, w: 80, h: 10 }];
    const brimmed = [...bobLike, { id: "brim", _slot: "hat", x: 40, y: 24, w: 158, h: 14 }];
    const caped = [...bobLike, { id: "cape", behindBody: true, x: 30, y: 40, w: 170, h: 120 }];
    for (const blocks of [armed, brimmed, caped]) {
      expect(layFlatLiftPx(blocks, BOX_W, BOX_H)).toBeCloseTo(bare, 6);
      expect(fallenBodyBottom(blocks, 400)).toBeCloseTo(standingBottom(blocks, 400), 6);
    }
    // And the gear really does hang below the floor line rather than being quietly clipped — that
    // is the trade being made, so it should be visible in the numbers. Falling BACKWARDS changes
    // which piece pays it: the cape behind the character is now the thing nearest the floor, while
    // the rifle held out front swings up at the sky instead of through the ground.
    const capeBottom = 400 + BOX_H + (BOX_W / 2 - poseArtLeftFrac(caped) * BOX_W) - layFlatLiftPx(caped, BOX_W, BOX_H);
    expect(capeBottom).toBeGreaterThan(standingBottom(caped, 400));
  });

  // Weapon pieces reach the render two ways — baked into a dressed look's own art on load, or
  // attached live off the enemy's weapon slot — and both carry _isWeapon, so one rule covers the
  // gun an enemy spawns holding and the gun you hand it.
  test("a sprite that is nothing but gear still lands somewhere", () => {
    const allGear = [{ id: "barrel", _isWeapon: true, x: 118, y: 100, w: 80, h: 10 }];
    expect(layFlatBodyBlocks(allGear)).toEqual(allGear);
    expect(layFlatBodyBlocks([])).toEqual([]);
    expect(LAY_FLAT_IGNORES({ _isWeapon: true })).toBe(true);
    expect(LAY_FLAT_IGNORES({ _slot: "hat" })).toBe(true);
    expect(LAY_FLAT_IGNORES({ behindBody: true })).toBe(true);
    expect(LAY_FLAT_IGNORES({ _slot: "shoes" })).toBe(false); // shoes are on the feet — they land
  });

  // The reported bug, in numbers: a character with the right third of its canvas empty hovered by
  // that margin. 161.54 * (1 - 0.71) ≈ 47px, a bit over 1.5 cells at LV_CELL = 30.
  test("the old half-the-wrapper lift floated a normal character about 1.5 cells", () => {
    const bobLike = [{ id: "torso", x: 58, y: 30, w: 60, h: 150 }, { id: "leg", x: 66, y: 180, w: 76, h: 80 }];
    const floatPx = BOX_W / 2 - layFlatLiftPx(bobLike, BOX_W, BOX_H);
    expect(floatPx / 30).toBeGreaterThan(1.3);
    expect(floatPx / 30).toBeLessThan(1.8);
  });

  // ...and the same formula's other failure mode, which the fix has to clear too: a wide monster
  // with a lot of empty canvas under it sank BELOW the floor rather than floating over it.
  test("a wide monster with a big foot gap needs more lift than the old constant, not less", () => {
    const elephantLike = [{ id: "body", x: 10, y: 40, w: 198, h: 120 }];
    expect(layFlatLiftPx(elephantLike, BOX_W, BOX_H)).toBeGreaterThan(BOX_W / 2);
    expect(fallenBodyBottom(elephantLike, 400)).toBeCloseTo(standingBottom(elephantLike, 400), 6);
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

  test("jumping off a ladder or vine keeps the character's back to you through the leap", () => {
    // Letting go used to snap straight to the sideways airborne pose on the very first frame,
    // which read as spinning round in mid-air. climbJumpKind holds the climb's own pose instead.
    expect(playerPoseKey({ climbing: false, climbJumpKind: "ladder" })).toBe("back");
    expect(playerPoseKey({ climbing: false, climbJumpKind: "cliff" })).toBe("back");
    expect(playerPoseKey({ climbing: false, climbJumpKind: "ladder", walking: true })).toBe("back");
    // Bars hang in Side already, so a bars jump keeps Side — no new pop introduced there either.
    expect(playerPoseKey({ climbing: false, climbJumpKind: "bars" })).toBe("side");
  });

  test("the climb-jump pose never outranks a transition or an actual grab, and ends at the apex", () => {
    // A door/room transition still wins outright.
    expect(playerPoseKey({ transitioning: true, climbJumpKind: "ladder" })).toBe("back");
    // Grabbing bars on the way up shows the bars pose, not the ladder you left.
    expect(playerPoseKey({ climbing: true, climbKind: "bars", climbJumpKind: "ladder" })).toBe("side");
    // Cleared (the loop nulls it once vy >= 0), so the fall is the ordinary airborne pose again.
    expect(playerPoseKey({ climbing: false, climbJumpKind: null })).toBe("side");
  });

  test("pushing off a climb brings the arms half way down, not all the way", () => {
    // Half way between the straight-up climbing reach and a level arm, for every pivot the rig
    // supports — the shove, not a hang and not a neutral drop.
    for (const pv of ["top", "bottom", "left", "right"]) {
      const up = armClimbAbs(pv), fwd = armAimAbs(pv), push = armPushOffAbs(pv);
      const arc = (a, b) => ((b - a + 540) % 360) - 180;      // shortest signed turn from a to b
      expect(arc(up, push)).toBeCloseTo(arc(up, fwd) / 2);
      expect(Math.abs(arc(up, push))).toBeCloseTo(CLIMB_PUSH_OFF_DEG);
    }
  });

  test("crouching in mid-air off a ladder still shows the back, not the duck", () => {
    // Crouch is checked after the climb poses, so holding ↓ through the leap can't override it.
    expect(playerPoseKey({ climbJumpKind: "ladder", crouch: true, walking: false })).toBe("back");
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

  test("offers an Oval, next to the Circle it is not", () => {
    expect(SHAPE_LIST.filter(([kind]) => kind === "stadium")).toEqual([["stadium", "⬭", "Oval"]]);
    const kinds = SHAPE_LIST.map(([k]) => k);
    expect(kinds.indexOf("stadium")).toBe(kinds.indexOf("circle") + 1);
  });
});

describe("the Oval's ends stay round however far it is stretched", () => {
  test("a wide block caps on its height — half circles left and right, straight top and bottom", () => {
    expect(stadiumRadius(120, 40)).toBe(20);
  });

  test("a tall block caps on its width instead", () => {
    expect(stadiumRadius(40, 120)).toBe(20);
  });

  test("a square block is all cap and no middle — a circle, correctly", () => {
    expect(stadiumRadius(60, 60)).toBe(30);
  });

  // The reason it can't be a SHAPE_POINTS polygon: those are fractions of the block's own box, so
  // stretching the block stretches the caps into an ellipse — the exact thing an Oval is not.
  test("it is deliberately NOT a normalized polygon shape", () => {
    expect(SHAPE_POINTS.stadium).toBeUndefined();
  });

  test("a missing or negative size can't produce a broken radius", () => {
    expect(stadiumRadius(undefined, 40)).toBe(0);
    expect(stadiumRadius(-10, 40)).toBe(0);
    expect(stadiumRadius(0, 0)).toBe(0);
  });

  test("mirroring one leaves it an Oval — it is its own mirror image", () => {
    const [q] = flipPiecesHorizontally([{ id: "o", kind: "stadium", x: 10, y: 0, w: 60, h: 20 }], 50);
    expect(q.kind).toBe("stadium");
    expect(q.points).toBeUndefined();
  });
});

describe("asset index: surviving a bad write", () => {
  const A = [{ id: "a", name: "A", type: "prop" }, { id: "b", name: "B", type: "prop" }, { id: "c", name: "C", type: "prop" }];

  test("an add/update that came out shorter is merged, never written", () => {
    // A stale read racing a concurrent save: the caller thinks there is one asset. Writing that
    // would hide the other two, which is what "my assets disappeared" actually is.
    const out = mergeIndexWrite(A, [{ id: "a", name: "A2", type: "prop" }], false);
    expect(out.map((x) => x.id).sort()).toEqual(["a", "b", "c"]);
    expect(out.find((x) => x.id === "a").name).toBe("A2"); // the caller's version still wins
  });

  test("a real delete is allowed to shrink it", () => {
    expect(mergeIndexWrite(A, A.slice(0, 2), true).map((x) => x.id)).toEqual(["a", "b"]);
  });

  test("growing the list is written as-is", () => {
    const grown = A.concat([{ id: "d", name: "D", type: "prop" }]);
    expect(mergeIndexWrite(A, grown, false)).toHaveLength(4);
  });

  test("an empty write can never blank a full index", () => {
    expect(mergeIndexWrite(A, [], false)).toHaveLength(3);
    expect(mergeIndexWrite(A, null, false)).toHaveLength(3);
  });
});

describe("finding assets in a host-provided store", () => {
  const keys = ["assetIndex", "asset:a", "asset:b", "level:x"];
  const ids = async (ws) => (await enumerateHostKeys(ws)).filter((k) => k.startsWith("asset:")).map((k) => k.slice(6));

  // The whole bug: the old scan returned [] the moment a host store existed, so on the host that
  // actually matters the rescue never ran. Each of these shapes must be understood.
  test("list() returning plain keys", async () => {
    expect(await ids({ list: async () => keys })).toEqual(["a", "b"]);
  });

  test("keys() instead of list()", async () => {
    expect(await ids({ keys: async () => keys })).toEqual(["a", "b"]);
  });

  test("objects rather than strings", async () => {
    expect(await ids({ list: async () => keys.map((k) => ({ key: k })) })).toEqual(["a", "b"]);
  });

  test("wrapped in { keys: [...] }", async () => {
    expect(await ids({ getAll: async () => ({ keys }) })).toEqual(["a", "b"]);
  });

  test("a method that throws does not abort the search", async () => {
    const ws = { list: async () => { throw new Error("unsupported"); }, keys: async () => keys };
    expect(await ids(ws)).toEqual(["a", "b"]);
  });

  test("a store with no way to enumerate answers empty rather than throwing", async () => {
    await expect(enumerateHostKeys({ get: async () => null })).resolves.toEqual([]);
    await expect(enumerateHostKeys(null)).resolves.toEqual([]);
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

  test("blocks stay plain", () => {
    expect(terrainPaintShape("bg", "block")).toBeNull();
    expect(terrainPaintShape("front", "block")).toBeNull();
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

describe("flannel texture", () => {
  test("is registered, so both the level and the piece pickers offer it", () => {
    expect(TEXTURE_KEYS).toContain("flannel");
    expect(TEXTURES.flannel.label).toBe("Flannel");
    expect(newTexture("flannel").tex).toBe("flannel");
  });

  test("weaves the same stripe sequence both ways, so the crossings mix instead of overwriting", () => {
    // A tartan is a sett: the identical warp and weft. Semi-transparent bands are what make a
    // crossing read as two threads over each other rather than whichever was drawn last.
    const t = newTexture("flannel");
    const svg = TEXTURES.flannel.svg(t.colors, TEXTURES.flannel.tile, t.params);
    // Full-tile spans: 40 wide plus 2 of bleed either side. Both counts include the ground rect,
    // which is 44x44 — what matters is that they MATCH, i.e. warp and weft are the same sequence.
    const verticals = (svg.match(/height="44"/g) || []).length;
    const horizontals = (svg.match(/width="44"/g) || []).length;
    expect(verticals).toBe(horizontals);
    expect(verticals).toBe(5);                     // 2 broad bands + 2 overcheck lines + the shared ground
    expect((svg.match(/opacity="0\.5"/g) || []).length).toBe(4);   // the broad bands, 2 each way, blended not opaque
    expect((svg.match(/opacity="0\.4"/g) || []).length).toBe(4);   // the overcheck, likewise
  });

  test("the check size param really changes the weave", () => {
    const t = newTexture("flannel");
    const fine = TEXTURES.flannel.svg(t.colors, TEXTURES.flannel.tile, { sett: 0.5 });
    const bold = TEXTURES.flannel.svg(t.colors, TEXTURES.flannel.tile, { sett: 1.6 });
    expect(fine).not.toBe(bold);
  });
});

describe("tie dye texture", () => {
  test("is registered, so both the level and the piece pickers offer it", () => {
    expect(TEXTURE_KEYS).toContain("tieDye");
    expect(TEXTURES.tieDye.label).toBe("Tie dye");
    expect(newTexture("tieDye").tex).toBe("tieDye");
  });

  test("every ring is its own editable colour, not one fixed 1967 palette", () => {
    const t = newTexture("tieDye");
    expect(Object.keys(t.colors).sort()).toEqual(["base", "r1", "r2", "r3", "r4"]);
    const svg = TEXTURES.tieDye.svg(t.colors, TEXTURES.tieDye.tile, t.params);
    for (const c of Object.values(t.colors)) expect(svg).toContain(c);
  });

  test("rosettes straddle the tile corners, so the repeat can't read as a grid of targets", () => {
    // Five rings centred on each of the four corners plus five in the middle. The corner ones are
    // what make the seam disappear — each contributes a quarter and they meet into one rosette.
    const t = newTexture("tieDye");
    const svg = TEXTURES.tieDye.svg(t.colors, TEXTURES.tieDye.tile, t.params);
    expect((svg.match(/<path /g) || []).length).toBe(25);
    for (const corner of ["M", "0,"]) expect(svg).toContain(corner);
  });

  test("the rings wobble — a perfect circle is the one shape tie-dye never is", () => {
    const t = newTexture("tieDye");
    const neat = TEXTURES.tieDye.svg(t.colors, TEXTURES.tieDye.tile, { crinkle: 0 });
    const scrunched = TEXTURES.tieDye.svg(t.colors, TEXTURES.tieDye.tile, { crinkle: 1 });
    expect(neat).not.toBe(scrunched);
    // Deterministic: the same settings must redraw the same blotches, never reshuffle them.
    expect(TEXTURES.tieDye.svg(t.colors, TEXTURES.tieDye.tile, { crinkle: 1 })).toBe(scrunched);
  });
});

describe("a texture painted on an art piece", () => {
  const lib = [{ id: "fl-1", name: "Red flannel", tex: "flannel", colors: { base: "#7c2b26", band: "#3a1512", over: "#e0c98a" }, params: { sett: 1 } }];

  test("scales the pattern to the piece, so it looks the same in the editor and at playtest size", () => {
    // Sized as a PERCENTAGE of the piece's own box, not in screen pixels — a jacket panel and the
    // same panel drawn small in a level must show the same size of check.
    const big = pieceTextureStyle({ w: 80, h: 100, tex: "fl-1" }, lib);
    const small = pieceTextureStyle({ w: 40, h: 50, tex: "fl-1" }, lib);
    expect(big.backgroundSize).toBe("50% 40%");    // a 40x40 tile across an 80x100 piece
    expect(small.backgroundSize).toBe("100% 80%"); // half the piece, so twice the percentage — same check on screen
    expect(big.backgroundImage).toContain("data:image/svg+xml");
    expect(big.backgroundColor).toBe("#7c2b26");
  });

  test("a piece with no texture, or one whose texture was deleted, keeps its plain colour", () => {
    expect(pieceTextureStyle({ w: 10, h: 10 }, lib)).toBe(null);
    expect(pieceTextureStyle({ w: 10, h: 10, tex: "gone" }, lib)).toBe(null);
    expect(pieceTextureStyle({ w: 10, h: 10, tex: "fl-1" }, [])).toBe(null);
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

describe("dragging out a ramp taller than one cell", () => {
  // Handy shorthand: "r,c" -> what landed there, so a whole span reads as a picture in the test.
  // These cases are about LAYOUT, so the lean is left out here and checked where it's decided.
  const map = (span) => Object.fromEntries(span.map((x) => [x.r + "," + x.c, x.kind === "block" ? "block" : x.run + ":" + x.step]));

  test("a single-row drag is exactly the ramp it always was", () => {
    // The whole point of decomposing tall ramps is that the 1-high case must come out unchanged.
    expect(map(rampSpanCells(5, 2, 5, 5, 1, false))).toEqual({ "5,2": "4:0", "5,3": "4:1", "5,4": "4:2", "5,5": "4:3" });
  });

  test("step stays counted left-to-right on a ramp that rises right→left", () => {
    // `step` is stored left-to-right whatever the slope does — the mirror code depends on it.
    expect(map(rampSpanCells(5, 2, 5, 5, -1, false))).toEqual({ "5,2": "4:0", "5,3": "4:1", "5,4": "4:2", "5,5": "4:3" });
  });

  test("a 2-high ramp spans both rows as ONE ramp, with the climbed-past cells filled solid", () => {
    // Rises left→right across 4 columns and 2 rows. Every ramp cell carries the whole ramp's run
    // and rise — they are slices of one line, not two ramps stacked.
    expect(map(rampSpanCells(4, 0, 5, 3, 1, false))).toEqual({
      "5,0": "4:0", "5,1": "4:1", "5,2": "block", "5,3": "block",
      "4,2": "4:2", "4,3": "4:3",
    });
    expect(rampSpanCells(4, 0, 5, 3, 1, false).filter((x) => x.kind === "ramp").every((x) => x.rise === 2)).toBe(true);
  });

  test("A RAMP CAN NOW BE STEEPER THAN 45° — two cells of climb in a single column", () => {
    // The case none of this was any use without. One column, two rows: both cells are ramp, the
    // line crosses each of them over HALF its width, and nothing is filled solid because the line
    // touches every cell it's given. Decomposing into 45° pieces could never produce this — two up
    // across two along is the same angle as one across one, which is why it only made ramps bigger.
    const span = rampSpanCells(4, 7, 5, 7, 1, false);
    expect(map(span)).toEqual({ "4,7": "1:0", "5,7": "1:0" });
    expect(span.every((x) => x.rise === 2)).toBe(true);
    expect(span.map((x) => x.rstep).sort()).toEqual([0, 1]);
  });

  test("rising right→left puts the low end on the right, and the fill follows it", () => {
    expect(map(rampSpanCells(4, 0, 5, 3, -1, false))).toEqual({
      "5,3": "4:3", "5,2": "4:2", "5,1": "block", "5,0": "block",
      "4,1": "4:1", "4,0": "4:0",
    });
  });

  test("upside down is the same ramp mirrored vertically, not one that merely leans the same way", () => {
    // The solid hangs from the top, so the thin end of the wedge is the TOP row here. Same columns
    // as the right-way-up ramp — only the row each slice sits in swaps.
    expect(map(rampSpanCells(4, 0, 5, 3, 1, true))).toEqual({
      "4,0": "4:0", "4,1": "4:1", "4,2": "block", "4,3": "block",
      "5,2": "4:2", "5,3": "4:3",
    });
  });

  test("a run that doesn't divide evenly is still one straight line, not a kinked one", () => {
    // 3 wide, 2 high. The old decomposition had to split this into a 2-cell segment and a 1-cell
    // one, which put a visible kink at the join. One ramp across the whole rectangle has no join.
    expect(map(rampSpanCells(4, 0, 5, 2, 1, false))).toEqual({
      "5,0": "3:0", "5,1": "3:1", "5,2": "block",
      "4,1": "3:1", "4,2": "3:2",
    });
  });

  test("the corners can be dragged from any direction and mean the same rectangle", () => {
    const a = rampSpanCells(4, 0, 5, 3, 1, false);
    for (const corners of [[5, 3, 4, 0], [4, 3, 5, 0], [5, 0, 4, 3]]) {
      expect(map(rampSpanCells(...corners, 1, false))).toEqual(map(a));
    }
  });

  test("nothing lands outside the dragged rectangle, and no cell is painted twice", () => {
    for (const ud of [false, true]) for (const slope of [1, -1]) {
      const span = rampSpanCells(2, 3, 6, 11, slope, ud);
      for (const cell of span) {
        expect(cell.r).toBeGreaterThanOrEqual(2); expect(cell.r).toBeLessThanOrEqual(6);
        expect(cell.c).toBeGreaterThanOrEqual(3); expect(cell.c).toBeLessThanOrEqual(11);
      }
      expect(new Set(span.map((x) => x.r + "," + x.c)).size).toBe(span.length);
    }
  });

  test("every row of a tall ramp is crossed by the line, so it never breaks", () => {
    // A row the line misses would be a flat shelf in the middle of what should be a straight climb.
    for (const [rows, cols] of [[4, 12], [4, 4], [4, 1], [2, 9]]) {
      const span = rampSpanCells(1, 0, rows, cols - 1, 1, false);
      const rowsWithRamp = new Set(span.filter((x) => x.kind === "ramp").map((x) => x.r));
      expect(rowsWithRamp.size).toBe(rows);
      // Every ramp cell describes the SAME ramp — one line, sliced up, not several joined together.
      for (const cell of span.filter((x) => x.kind === "ramp")) {
        expect(cell.run).toBe(cols);
        expect(cell.rise === undefined ? 1 : cell.rise).toBe(rows);
      }
    }
  });

  test("the surface a tall ramp collides as is one unbroken climb, not a staircase", () => {
    // This is the test that matters: the span is only worth anything if the EXISTING collision code
    // reads it as a single continuous slope. Every column must hold exactly one walkable surface,
    // and the height must rise smoothly across the joins between segments — a break or a repeat
    // there is a lip the player would catch on, which is the whole failure the drag exists to avoid.
    const CW = 30, CH = 30;
    // Paints a span into a level exactly the way the editor does, so this exercises the real cells.
    const paint = (span) => {
      const fg = {};
      for (const cell of span) {
        fg[cell.r + "," + cell.c] = cell.kind === "ramp"
          ? { c: "#888", slope: cell.slope, run: cell.run, step: cell.step, ...(cell.rise > 1 ? { rise: cell.rise, rstep: cell.rstep } : {}) }
          : "#888";
      }
      return { cols: 20, rows: 20, fg };
    };
    // Shallow (3 rows over 8 columns) and STEEP (3 rows over 2) have to behave the same way here.
    for (const [rTop, cLo, rBot, cHi] of [[7, 2, 9, 9], [7, 2, 9, 3]]) {
      const lv = paint(rampSpanCells(rTop, cLo, rBot, cHi, 1, false));
      let prev = null;
      for (let x = cLo * CW; x <= (cHi + 1) * CW - 1; x += 2) {
        const hit = slopeSurfaceAt(lv, x, rTop, rBot, CW, CH);
        expect(hit).not.toBeNull();               // a column with no surface is a hole in the ramp
        if (prev !== null) {
          expect(hit.y).toBeLessThanOrEqual(prev + 1e-9); // never dips back down
          expect(prev - hit.y).toBeLessThan(CH);          // and never jumps a whole cell, which is what a staircase does
        }
        prev = hit.y;
      }
      // Ends where it should: on the floor of the bottom row, and at the top of the top row.
      expect(slopeSurfaceAt(lv, cLo * CW, rTop, rBot, CW, CH).y).toBe((rBot + 1) * CH);
      expect(slopeSurfaceAt(lv, (cHi + 1) * CW - 1, rTop, rBot, CW, CH).y).toBeLessThan(rTop * CH + 2);
    }
  });
});

describe("what a ramp stroke means", () => {
  const map = (span) => Object.fromEntries(span.map((x) => [x.r + "," + x.c, x.kind === "block" ? "block" : x.run + ":" + x.step + (x.slope > 0 ? "↗" : "↖")]));

  // Does the drawn line run up to the RIGHT? Asked of the cells themselves rather than of the
  // stored `slope`, because slope means opposite things right way up and upside down — trusting it
  // is precisely the mistake that let overhangs come out mirrored. Whichever way up the ramp is,
  // the diagonal it draws connects the ramp cells in its top row to those in its bottom row, so
  // "which side is the top row on" is the lean, in the one form that can't be misread.
  const leansUpRight = (span) => {
    const ramps = span.filter((x) => x.kind === "ramp");
    const meanCol = (r) => { const cs = ramps.filter((x) => x.r === r).map((x) => x.c); return cs.reduce((a, b) => a + b, 0) / cs.length; };
    return meanCol(Math.min(...ramps.map((x) => x.r))) > meanCol(Math.max(...ramps.map((x) => x.r)));
  };

  test("a drag up-and-right leans up-and-right, whatever the ◢/◣ buttons say", () => {
    // The bug: the buttons were the ONLY thing that set the lean, so dragging out a diagonal with
    // the wrong one selected produced a ramp mirrored inside the rectangle you had just dragged.
    for (const button of [1, -1]) {
      const span = rampDragSpan({ r: 9, c: 0 }, { r: 7, c: 5 }, 1, button, false);
      expect(leansUpRight(span)).toBe(true);
    }
  });

  test("a drag up-and-left leans up-and-left, whatever the buttons say", () => {
    for (const button of [1, -1]) {
      const span = rampDragSpan({ r: 9, c: 5 }, { r: 7, c: 0 }, 1, button, false);
      expect(leansUpRight(span)).toBe(false);
    }
  });

  test("dragging the other way along the same diagonal is the same ramp", () => {
    // Press at the top and release at the bottom, or the reverse — you drew the same line.
    const a = rampDragSpan({ r: 9, c: 0 }, { r: 7, c: 5 }, 1, 1, false);
    const b = rampDragSpan({ r: 7, c: 5 }, { r: 9, c: 0 }, 1, 1, false);
    expect(map(a)).toEqual(map(b));
  });

  test("an upside-down drag follows the line drawn, instead of coming back mirrored", () => {
    // A stored slope draws the OPPOSITE diagonal once the solid hangs from the top, so this is the
    // case that was reversed: the overhang used to lean away from the drag every single time.
    for (const button of [1, -1]) {
      const span = rampDragSpan({ r: 9, c: 0 }, { r: 7, c: 5 }, 1, button, true);
      expect(leansUpRight(span)).toBe(true);
    }
    const other = rampDragSpan({ r: 9, c: 5 }, { r: 7, c: 0 }, 1, 1, true);
    expect(leansUpRight(other)).toBe(false);
  });

  test("the buttons still decide a click and a flat drag, where there is no diagonal to read", () => {
    expect(rampDragSpan({ r: 9, c: 4 }, null, 3, 1, false).every((x) => x.kind !== "ramp" || x.step >= 0)).toBe(true);
    const up = rampDragSpan({ r: 9, c: 0 }, { r: 9, c: 3 }, 1, 1, false);
    const down = rampDragSpan({ r: 9, c: 0 }, { r: 9, c: 3 }, 1, -1, false);
    expect(map(up)).not.toEqual(map(down));
  });

  test("a straight-up drag has no lean to read, so it keeps the button's", () => {
    // One column, so nothing about left or right was expressed. It must not silently flip.
    const up = rampDragSpan({ r: 9, c: 4 }, { r: 7, c: 4 }, 1, 1, false);
    const down = rampDragSpan({ r: 9, c: 4 }, { r: 7, c: 4 }, 1, -1, false);
    expect(map(up)).not.toEqual(map(down));
  });

  test("releasing without ever moving is a click, not a zero-length drag", () => {
    // cur === anchor is what a click looks like once the pointer has jittered inside one cell.
    expect(map(rampDragSpan({ r: 9, c: 4 }, { r: 9, c: 4 }, 3, 1, false)))
      .toEqual(map(rampDragSpan({ r: 9, c: 4 }, null, 3, 1, false)));
  });

  test("a lost drag can no longer come back as a long flat ramp", () => {
    // This is the failure the ref exists to prevent: when the release read a stale hover cell it
    // saw no drag at all and stamped the brush-size ramp instead — a big shallow one, in place of
    // the tall one being dragged. With the drag cell recorded, the two can't be confused.
    const dragged = rampDragSpan({ r: 9, c: 2 }, { r: 8, c: 4 }, 8, 1, false);
    const clicked = rampDragSpan({ r: 9, c: 2 }, null, 8, 1, false);
    expect(new Set(dragged.map((x) => x.r)).size).toBe(2);
    expect(new Set(clicked.map((x) => x.r)).size).toBe(1);
    expect(clicked.length).toBe(8);
  });

  test("a tall thin drag makes a STEEP ramp, not a short one", () => {
    // 5 rows, 2 columns. This used to be clamped down to a 2-high ramp because the old model could
    // not express a slope steeper than 45°. Now it is a slope that climbs 5 cells in 2.
    const span = rampDragSpan({ r: 9, c: 1 }, { r: 5, c: 2 }, 1, 1, false);
    expect([...new Set(span.map((x) => x.r))].sort()).toEqual([5, 6, 7, 8, 9]);
    for (const cell of span.filter((x) => x.kind === "ramp")) expect(cell.rise).toBe(5);
  });

  test("dragging straight up one column is the steepest ramp there is", () => {
    // No sideways movement at all: 3 cells of climb inside a single column.
    const span = rampDragSpan({ r: 9, c: 4 }, { r: 7, c: 4 }, 1, 1, false);
    expect(span.every((x) => x.c === 4 && x.kind === "ramp" && x.rise === 3 && x.run === 1)).toBe(true);
    expect(span.length).toBe(3);
  });
});

describe("carpet texture", () => {
  test("is registered, so the picker and pattern switcher both offer it", () => {
    expect(TEXTURE_KEYS).toContain("carpet");
    expect(TEXTURES.carpet.label).toBe("Carpet");
    expect(newTexture("carpet").tex).toBe("carpet");
  });

  test("a new instance starts at every default, and falls back to its backing colour", () => {
    const t = newTexture("carpet");
    expect(t.params.pile).toBe(0.55);
    expect(Object.keys(t.colors).sort()).toEqual(["base", "dark", "light", "mid"]);
    expect(textureBaseColor(t)).toBe(t.colors.base);
  });

  test("renders deterministically — same settings, same bytes, so nothing shimmers", () => {
    expect(textureDataUri(newTexture("carpet"))).toBe(textureDataUri(newTexture("carpet")));
  });

  test("pile grows the same tufts rather than reshuffling the floor", () => {
    const t = newTexture("carpet");
    const flat = TEXTURES.carpet.svg(t.colors, TEXTURES.carpet.tile, { pile: 0 });
    const shag = TEXTURES.carpet.svg(t.colors, TEXTURES.carpet.tile, { pile: 1 });
    expect(flat).not.toBe(shag);
    // The first fibre is drawn from the same point at both extremes. If the slider reseeded the
    // field instead of lengthening it, dragging it would make the whole carpet crawl.
    const start = (svg) => svg.match(/<path d="(M[\d.]+,[\d.]+)/)[1];
    expect(start(flat)).toBe(start(shag));
    // Longer pile also means more of it — a short loop pile and a deep shag are not the same field.
    expect((shag.match(/<path /g) || []).length).toBeGreaterThan((flat.match(/<path /g) || []).length);
  });

  test("fibres crossing an edge are redrawn on the opposite side, so the repeat has no seam", () => {
    const t = newTexture("carpet");
    const svg = TEXTURES.carpet.svg(t.colors, TEXTURES.carpet.tile, t.params);
    // Wrapped copies are the only way a stroke can start outside the tile. No negative start means
    // the wrap silently stopped happening and the pile is being clipped into a visible grid.
    expect(svg).toMatch(/<path d="M-[\d.]+,/);
    expect((svg.match(/<path /g) || []).length).toBeGreaterThan(Math.round(200 + 0.55 * 120));
  });

  test("every colour control actually reaches the render", () => {
    const base = newTexture("carpet");
    for (const key of ["base", "light", "mid", "dark"]) {
      const recoloured = { ...base, colors: { ...base.colors, [key]: "#ff00ff" } };
      expect(textureDataUri(recoloured)).not.toBe(textureDataUri(base));
    }
  });
});

describe("glass texture", () => {
  test("is registered, so the picker and pattern switcher both offer it", () => {
    expect(TEXTURE_KEYS).toContain("glass");
    expect(TEXTURES.glass.label).toBe("Glass");
    expect(newTexture("glass").tex).toBe("glass");
  });

  test("a new instance starts at every default, and falls back to its pane colour", () => {
    const t = newTexture("glass");
    expect(t.params).toEqual({ panes: 1, sheen: 0.55, frost: 0 });
    expect(Object.keys(t.colors).sort()).toEqual(["bar", "lit", "pane", "sheen"]);
    expect(textureBaseColor(t)).toBe(t.colors.pane);
  });

  test("renders deterministically — same settings, same bytes, so nothing shimmers", () => {
    expect(textureDataUri(newTexture("glass"))).toBe(textureDataUri(newTexture("glass")));
  });

  test("the sheen runs at exactly 45°, which is what lets it cross the tile seam", () => {
    const t = newTexture("glass");
    const svg = TEXTURES.glass.svg(t.colors, TEXTURES.glass.tile, t.params);
    const [tw, th] = TEXTURES.glass.tile;
    for (const pts of svg.match(/<polygon points="([^"]+)"/g) || []) {
      const [[x0, y0], , , [x3, y3]] = pts.match(/[-\d.]+,[-\d.]+/g).map((p) => p.split(",").map(Number));
      // Leading edge runs top -> bottom shifting exactly one tile width across one tile height.
      expect(y0).toBe(0);
      expect(y3).toBe(th);
      expect(x3 - x0).toBeCloseTo(tw);
    }
  });

  test("bars sit on the tile edges, so four cells meet into one unbroken muntin", () => {
    const t = newTexture("glass");
    const svg = TEXTURES.glass.svg(t.colors, TEXTURES.glass.tile, t.params);
    // A single-pane window is bars at x=0 and x=60 (and the same in y) — each half of a bar the
    // neighbouring cell completes. Bars drawn inset instead would give every cell its own frame.
    expect(svg).toContain(`<rect x="-1.1" y="-2" width="2.2" height="64" fill="${t.colors.bar}"/>`);
    expect(svg).toContain(`<rect x="58.9" y="-2" width="2.2" height="64" fill="${t.colors.bar}"/>`);
  });

  test("panes divide the tile, and frost and reflection each change the render", () => {
    const t = newTexture("glass");
    const one = TEXTURES.glass.svg(t.colors, TEXTURES.glass.tile, { ...t.params, panes: 1 });
    const three = TEXTURES.glass.svg(t.colors, TEXTURES.glass.tile, { ...t.params, panes: 3 });
    expect((three.match(/<rect /g) || []).length).toBeGreaterThan((one.match(/<rect /g) || []).length);
    const base = newTexture("glass");
    expect(textureDataUri({ ...base, params: { ...base.params, frost: 1 } })).not.toBe(textureDataUri(base));
    expect(textureDataUri({ ...base, params: { ...base.params, sheen: 0 } })).not.toBe(textureDataUri(base));
  });

  test("every colour control actually reaches the render", () => {
    const base = newTexture("glass");
    for (const key of ["pane", "sheen", "bar", "lit"]) {
      const recoloured = { ...base, colors: { ...base.colors, [key]: "#ff00ff" } };
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
  test("reaches backdrop scale, well past the old 12-cell ceiling", () => {
    expect(Math.max(...LV_OBJ_SIZES)).toBe(100);
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
    // A single hanging vine, distinct from the vineWeb lattice — both still exist.
    expect(levelShapeLabel("vine")).toBe("vine");
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

  test("the object nudge is clamped, and keeps offsets no tap ladder would land on", () => {
    expect(OBJ_NUDGE_STEP).toBe(0.5);
    expect(clampObjNudge(0.5)).toBe(0.5);
    expect(clampObjNudge(-0.5)).toBe(-0.5);
    expect(clampObjNudge(999)).toBe(OBJ_NUDGE_LIMIT);
    expect(clampObjNudge(-999)).toBe(-OBJ_NUDGE_LIMIT);
    expect(clampObjNudge(undefined)).toBe(0);
    // It must NOT round to the current tap size any more: a snapped or mirrored offset is an
    // exact fraction, and quantising it would undo the alignment on the next arrow press.
    expect(clampObjNudge(0.3)).toBe(0.3);
    expect(clampObjNudge(1 / 30)).toBeCloseTo(0.033, 3);
  });

  test("the nudge ladder reaches one screen pixel, which is what closes a seam", () => {
    expect(OBJ_NUDGE_STEPS[0]).toBe(1);
    expect(OBJ_NUDGE_STEPS[OBJ_NUDGE_STEPS.length - 1] * 30).toBeCloseTo(1, 6);
    expect(OBJ_NUDGE_STEPS).toContain(OBJ_NUDGE_STEP);   // the old half-cell tap is still on it
    expect(OBJ_NUDGE_STEP_LABELS).toHaveLength(OBJ_NUDGE_STEPS.length);
    // Repeated 1px taps have to actually accumulate rather than rounding back to nothing.
    let v = 0;
    for (let i = 0; i < 6; i++) v = clampObjNudge(v + 1 / 30);
    expect(v * 30).toBeCloseTo(6, 1);
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

// A LEVEL is saved under a name the same way an asset is, and used not to be: saveLevel wrote
// straight back to level:<the id you opened> no matter what the name said. Opening "Trailor Park
// M2", renaming it to "Trailor Park M3" and pressing Save therefore destroyed M2 — one level went
// in, one level came out, and the original was gone with no warning. saveLevel now runs the same
// resolveSaveTarget both screens share; these lock in that it keeps doing so.
describe("level identity", () => {
  const M2 = { id: "le2ieau", name: "Trailor Park M2" };

  test("saving a level under the same name updates it in place", () => {
    expect(resolveSaveTarget([M2], { ...M2 }, "fresh"))
      .toEqual({ id: "le2ieau", mode: "update" });
  });

  test("renaming a loaded level forks a new id and leaves the original alone", () => {
    const t = resolveSaveTarget([M2], { ...M2, name: "Trailor Park M3" }, "fresh");
    expect(t).toEqual({ id: "fresh", mode: "rename", sourceId: "le2ieau" });
    // the point of the whole fix: the id that gets written is NOT the one M2 lives under
    expect(t.id).not.toBe(M2.id);
  });

  test("the index keeps both levels after a rename-save", () => {
    let list = [M2];
    const renamed = { ...M2, name: "Trailor Park M3" };
    const t = resolveSaveTarget(list, renamed, "fresh");
    const payload = t.id !== renamed.id ? { ...renamed, id: t.id } : renamed;
    list = list.filter((x) => x.id !== payload.id);
    list.push({ id: payload.id, name: payload.name });
    expect(list).toEqual([
      { id: "le2ieau", name: "Trailor Park M2" },
      { id: "fresh", name: "Trailor Park M3" },
    ]);
  });

  test("saving the fork again updates the fork, not the level it came from", () => {
    const list = [M2, { id: "fresh", name: "Trailor Park M3" }];
    expect(resolveSaveTarget(list, { id: "fresh", name: "Trailor Park M3" }, "another"))
      .toEqual({ id: "fresh", mode: "update" });
  });

  test("a brand new level is created, not matched onto an existing name", () => {
    expect(resolveSaveTarget([M2], { id: "brand-new", name: "Trailor Park M2" }))
      .toEqual({ id: "brand-new", mode: "create" });
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

  test("one prop can now be the whole backdrop instead of two halves that must match", () => {
    expect(Math.max(...LV_OBJ_SIZES)).toBeGreaterThanOrEqual(100);
    for (const n of [1, 4, 12, 60]) expect(LV_OBJ_SIZES).toContain(n);   // nothing already placed changes size
  });

  // The reported "I CAN'T EVEN LINE IT UP". Two halves of one football pitch, drawn on the same
  // canvas with the same 6px sideline at the same height — but one half also has a corner flag
  // poking 4 units higher, so its art crop is taller. Art-crop scale divides by each prop's OWN
  // crop, so identical drawing comes out at two different scales and no amount of moving them
  // closes the seam. Canvas scale divides by the shared design canvas, so they match.
  const pitchHalf = (extraTop) => ({
    frames: [{
      front: [
        { id: "turf", x: 0, y: 150, w: 200, h: 60 },
        ...(extraTop ? [{ id: "flag", x: 4, y: 146, w: 3, h: 4 }] : []),
      ],
    }],
  });

  test("art-crop scale renders two matching halves at DIFFERENT scales", () => {
    const a = levelObjectFootprint({ kind: "prop", size: 60, fitArt: true }, pitchHalf(false));
    const b = levelObjectFootprint({ kind: "prop", size: 60, fitArt: true }, pitchHalf(true));
    expect(a.cols).toBe(60);
    expect(b.cols).toBe(60);
    expect(a.rows).not.toBeCloseTo(b.rows, 3);          // same drawn turf, two different heights
  });

  test("canvas scale makes the same turf come out the same height on both halves", () => {
    const a = levelObjectFootprint({ kind: "prop", size: 60, fitArt: true, canvasScale: true }, pitchHalf(false));
    const b = levelObjectFootprint({ kind: "prop", size: 60, fitArt: true, canvasScale: true }, pitchHalf(true));
    // 260 canvas units tall -> 60 cells, so one unit is 60/260 of a cell for BOTH props.
    expect(a.cols).toBeCloseTo(200 * 60 / 260, 6);
    expect(b.cols).toBeCloseTo(200 * 60 / 260, 6);
    expect(a.rows).toBeCloseTo(60 * 60 / 260, 6);       // the 60-unit turf strip
    expect(b.rows - a.rows).toBeCloseTo(4 * 60 / 260, 6); // b is taller by exactly the flag, not by a rescale
  });

  test("canvas scale leaves untouched placements exactly as they were", () => {
    const plain = { kind: "prop", size: 60, fitArt: true };
    expect(levelObjectFootprint(plain, pitchHalf(false))).toEqual(levelObjectFootprint({ ...plain, canvasScale: false }, pitchHalf(false)));
  });
});

describe("which object draws on top of which", () => {
  // The reported bug: place one prop, place a second, and the second goes BEHIND. Draw order was
  // Object.keys(fx) order, so it was decided by when each CELL KEY first entered the map — drop
  // an object onto a cell that already held something and it inherits that key's old, early
  // position and renders under everything placed since.
  const twoProps = () => ({
    "5,5": [{ kind: "shape", shape: "topOutline" }],   // an outline block placed long ago
    "9,9": [{ kind: "prop", propId: "b" }],            // second prop placed, on a fresh key
  });

  test("draw order is the object's own z, not the order its cell key appeared", () => {
    const fx = twoProps();
    fx["5,5"].push({ kind: "prop", propId: "a" });      // first prop, dropped onto the OLD key
    const implied = levelObjectsInDrawOrder(fx).map((e) => e.o.propId);
    expect(implied).toEqual([undefined, "a", "b"]);     // no z yet: the old, key-order behaviour
    const withZ = withObjectDrawOrder(fx);
    withZ["5,5"][1].z = nextObjectZ(withZ);             // prop "a" placed last therefore drawn last
    expect(levelObjectsInDrawOrder(withZ).map((e) => e.o.propId)).toEqual([undefined, "b", "a"]);
  });

  test("stamping z onto an existing level does not move anything", () => {
    const fx = twoProps();
    const before = levelObjectsInDrawOrder(fx).map((e) => e.k + "#" + e.si);
    const after = levelObjectsInDrawOrder(withObjectDrawOrder(fx)).map((e) => e.k + "#" + e.si);
    expect(after).toEqual(before);
  });

  test("migrating a level stamps every object with an order and nothing else", () => {
    const lv = migrateLevel({ cols: 10, rows: 10, fx: { "1,1": [{ kind: "emoji", char: "🌳" }], "2,2": [{ kind: "emoji", char: "🍄" }] } });
    expect(lv.fx["1,1"][0].z).toBe(0);
    expect(lv.fx["2,2"][0].z).toBe(1);
    expect(lv.fx["1,1"][0].char).toBe("🌳");
    expect(nextObjectZ(lv.fx)).toBe(2);
  });

  test("Front and Back reach across cells, which is the case ▲/▼ could never cover", () => {
    const fx = withObjectDrawOrder({ "1,1": [{ kind: "prop", propId: "a" }], "40,90": [{ kind: "prop", propId: "b" }] });
    fx["1,1"][0].z = nextObjectZ(fx);
    expect(levelObjectsInDrawOrder(fx).map((e) => e.o.propId)).toEqual(["b", "a"]);
    fx["1,1"][0].z = bottomObjectZ(fx);
    expect(levelObjectsInDrawOrder(fx).map((e) => e.o.propId)).toEqual(["a", "b"]);
  });

  test("equal z falls back to the old order rather than to nothing", () => {
    const fx = { "1,1": [{ kind: "emoji", char: "a", z: 3 }], "2,2": [{ kind: "emoji", char: "b", z: 3 }] };
    expect(levelObjectsInDrawOrder(fx).map((e) => e.o.char)).toEqual(["a", "b"]);
  });
});

// The Adjust tool's click. Without this, every control above was unreachable for an object already
// sitting in a level: the inspector only ever opened on one you had just placed, so the only way to
// get at the panel that moves a prop was to stamp a second prop on top of it.
describe("clicking an object that is already in the level", () => {
  const strip = { frames: [{ front: [{ id: "art", x: 0, y: 150, w: 200, h: 60 }] }] };
  const findAsset = () => strip;
  const prop = (extra) => ({ kind: "prop", propId: "p", size: 20, fitArt: true, ...extra });

  test("a click anywhere inside a big prop finds it, not the cell it was clicked on", () => {
    const lv = { cols: 80, rows: 30, fx: { "10,10": [prop()] } };
    expect(objTopAt(lv, 12, 25, findAsset)).toEqual({ key: "10,10", index: 0 });
  });

  test("a click on empty space selects nothing rather than the nearest thing", () => {
    const lv = { cols: 80, rows: 30, fx: { "10,10": [prop()] } };
    expect(objTopAt(lv, 2, 2, findAsset)).toBeNull();
  });

  test("stacked objects hand you the one drawn on top — the one under the pointer", () => {
    const lv = { cols: 80, rows: 30, fx: { "10,10": [prop({ z: 9 }), prop({ z: 2 })] } };
    expect(objTopAt(lv, 11, 12, findAsset).index).toBe(0);   // z 9 wins, not the last in the array
  });

  test("a small prop resting on a big backdrop is the one a click grabs", () => {
    const lv = { cols: 80, rows: 30, fx: { "0,0": [prop({ size: 60 })], "10,10": [prop({ size: 4 })] } };
    expect(objTopAt(lv, 10, 11, findAsset).key).toBe("10,10");
  });
});

describe("snapping one object against another", () => {
  // A 200x60 strip of art low on the canvas, so a placement's footprint is wide and short — the
  // shape every backdrop half actually is.
  const strip = { frames: [{ front: [{ id: "turf", x: 0, y: 150, w: 200, h: 60 }] }] };
  const findAsset = () => strip;
  const placed = (extra) => ({ kind: "prop", propId: "p", size: 20, fitArt: true, ...extra });
  // 20 cells on the long side => 20 wide, 6 tall.
  const base = () => ({
    cols: 80, rows: 30, fg: {},
    fx: { "10,10": [placed()], "10,40": [placed()] },
  });

  test("butting left moves the object until its edge touches the one on its left", () => {
    const lv = base();
    const t = snapTargetFor(lv, "10,40", 0, "left", findAsset);
    expect(t.left).toBeCloseTo(30, 6);     // 10 + 20 wide
    expect(t.top).toBeCloseTo(10, 6);      // the other axis is untouched
  });

  test("a snap that has to travel further than the nudge cap re-files the object's cell", () => {
    const lv = base();
    const t = snapTargetFor(lv, "10,40", 0, "left", findAsset);
    expect(Math.abs(t.left - 40)).toBeGreaterThan(OBJ_NUDGE_LIMIT);  // 10 cells: a nudge alone could not do this
    const next = relocateLevelObject(lv, "10,40", 0, t.left, t.top);
    expect(next.fx["10,40"]).toBeUndefined();
    expect(next.fx["10,30"]).toHaveLength(1);
    expect(relocatedObjectKey(t.left, t.top)).toBe("10,30");
    expect(next.fx["10,30"][0].ox).toBeCloseTo(0, 6);
  });

  test("the leftover fraction of a snap lands in the nudge, so the edges really meet", () => {
    const lv = base();
    lv.fx["10,10"][0].ox = 0.4;                          // the neighbour sits 12px right of its cell
    const t = snapTargetFor(lv, "10,40", 0, "left", findAsset);
    expect(t.left).toBeCloseTo(30.4, 6);
    const moved = relocateLevelObject(lv, "10,40", 0, t.left, t.top);
    expect(moved.fx["10,30"][0].ox).toBeCloseTo(0.4, 6); // NOT rounded away to a whole cell
  });

  test("aligning tops works on objects that are side by side and so never overlap", () => {
    const lv = base();
    lv.fx["10,40"][0].oy = 0.7;
    const t = snapTargetFor(lv, "10,40", 0, "top", findAsset);
    expect(t.top).toBeCloseTo(10, 6);
    expect(t.left).toBeCloseTo(40, 6);
  });

  test("aligning bottoms lines the ground lines up, whatever the two heights are", () => {
    const lv = base();
    lv.fx["10,40"] = [placed({ size: 10 })];             // half-scale neighbour: 10 wide, 3 tall
    const t = snapTargetFor(lv, "10,40", 0, "bottom", findAsset);
    expect(t.top + 3).toBeCloseTo(16, 6);                // 10 + 6, the tall one's bottom
  });

  test("sitting on the ground uses the drawn art's bottom edge, not the cell it is filed under", () => {
    const lv = base();
    lv.fg["20,45"] = "#3a5"; lv.fg["20,50"] = "#3a5";
    const t = snapTargetFor(lv, "10,40", 0, "ground", findAsset);
    expect(t.top + 6).toBeCloseTo(20, 6);                // bottom edge exactly on the ground row
  });

  test("a snap with nothing to snap to says so instead of moving the object somewhere odd", () => {
    const lone = { cols: 40, rows: 20, fg: {}, fx: { "5,5": [placed()] } };
    expect(snapTargetFor(lone, "5,5", 0, "left", findAsset)).toBeNull();
    expect(snapTargetFor(lone, "5,5", 0, "ground", findAsset)).toBeNull();
  });

  test("relocating an object onto its own cell does not duplicate or lose its neighbours", () => {
    const lv = { cols: 40, rows: 20, fg: {}, fx: { "5,5": [placed({ propId: "keep" }), placed({ propId: "move" })] } };
    const out = relocateLevelObject(lv, "5,5", 1, 5.25, 5);
    expect(out.fx["5,5"]).toHaveLength(2);
    expect(out.fx["5,5"].map((o) => o.propId)).toEqual(["keep", "move"]);
    expect(out.fx["5,5"][1].ox).toBeCloseTo(0.25, 6);
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

describe("changing a colour everywhere never swallows a block that was a different colour", () => {
  // A shirt (green, drawn in two poses) and boots (brown) that must not get dragged along.
  const asset = () => ({
    angles: {
      front: [{ id: "shirt-f", color: "#2E7D32" }, { id: "boots", color: "#8D6E63" }],
      side: [{ id: "shirt-s", color: "#2e7d32" }],
    },
    states: { rest: { front: [{ id: "shirt-r", color: "#2E7D32" }] }, fire: { front: [] } },
    variants: { tall: { front: [{ id: "shirt-t", color: "#2E7D32" }] } },
  });

  test("the group is every block wearing that colour, in every pose, state and body fit", () => {
    const g = assetColorGroup(asset(), "#2E7D32");
    expect([...g.ids].sort()).toEqual(["shirt-f", "shirt-r", "shirt-s", "shirt-t"]);
  });

  test("matching to build the group is case-insensitive on the hex", () => {
    expect(assetColorGroup(asset(), "#2e7d32").ids.has("shirt-f")).toBe(true);
  });

  // The report: dragging the colour input fires onChange for every shade in between, and one of
  // them is the exact brown the boots already are. Re-resolving by colour there would enrol the
  // boots and carry them to wherever the drag ends.
  test("a drag that passes through another block's exact colour leaves that block behind", () => {
    const g = assetColorGroup(asset(), "#2E7D32");
    const mid = recolorAssetGroup(asset(), g, "#8D6E63"); // the drag lands on the boots' brown
    expect(mid.angles.front[1].color).toBe("#8D6E63");
    const end = recolorAssetGroup(mid, g, "#C62828");     // ...and keeps going
    expect(end.angles.front[0].color).toBe("#C62828");
    expect(end.angles.side[0].color).toBe("#C62828");
    expect(end.variants.tall.front[0].color).toBe("#C62828");
    expect(end.angles.front[1].color).toBe("#8D6E63");    // the boots stayed brown
  });

  test("a second click in the same edit repaints the same blocks, not the new colour's twins", () => {
    const g = assetColorGroup(asset(), "#2E7D32");
    const red = recolorAssetGroup(asset(), g, "#8D6E63");
    expect(recolorAssetGroup(red, g, "#1E88E5").angles.front[1].color).toBe("#8D6E63");
  });

  test("brightness/glow/fade dim exactly the blocks the swatches would repaint", () => {
    const g = assetColorGroup(asset(), "#2E7D32");
    const out = restyleAssetGroup(recolorAssetGroup(asset(), g, "#8D6E63"), g, { bright: 0.6 });
    expect(out.angles.front[0].fx.bright).toBe(0.6);
    expect(out.states.rest.front[0].fx.bright).toBe(0.6);
    expect(out.angles.front[1].fx).toBeUndefined(); // boots, same colour now, still not in the group
  });

  test("blocks too old to have an id still follow the group by colour", () => {
    const legacy = { angles: { front: [{ color: "#2E7D32" }, { color: "#8D6E63" }] } };
    const g = assetColorGroup(legacy, "#2E7D32");
    expect(g.ids.size).toBe(0);
    const out = recolorAssetGroup(legacy, g, "#C62828");
    expect(out.angles.front[0].color).toBe("#C62828");
    expect(out.angles.front[1].color).toBe("#8D6E63");
  });

  test("a missing asset or group is a no-op rather than a crash", () => {
    expect(recolorAssetGroup(null, assetColorGroup(asset(), "#2E7D32"), "#fff")).toBe(null);
    const a = asset();
    expect(recolorAssetGroup(a, null, "#fff")).toBe(a);
    expect(assetColorGroup(null, "#2E7D32").ids.size).toBe(0);
    expect(assetColorGroup(asset(), null).ids.size).toBe(0);
  });
});

describe("undo carries which state/frame was being edited, not just the art", () => {
  const bow = () => ({ type: "weapon", states: { rest: { side: [{ id: "r" }] }, fire: { side: [{ id: "f" }] } }, angles: { side: [{ id: "r" }] } });
  const onRest = { wState: "rest", eState: "normal", propFrame: 0, effEdit: null, angle: "side" };

  test("an undo step restores the weapon state it was taken in", () => {
    const back = readEditSnapshot(editSnapshot(bow(), { ...onRest, wState: "fire" }));
    expect(back.wState).toBe("fire");
    expect(back.asset.states.fire.side[0].id).toBe("f");
  });

  test("every cursor that decides where asset.angles gets flushed comes back", () => {
    const back = readEditSnapshot(editSnapshot(bow(), { wState: "fire", eState: "charge", propFrame: 3, effEdit: { effId: "e1", bodyKey: "b", frameIdx: 2 }, angle: "up" }));
    expect(back).toMatchObject({ wState: "fire", eState: "charge", propFrame: 3, angle: "up" });
    expect(back.effEdit).toEqual({ effId: "e1", bodyKey: "b", frameIdx: 2 });
  });

  // The bug this fixes: two steps that differ ONLY in which state was on screen used to be the
  // same string, so undo would restore one while the toolbar still pointed at the other, and the
  // next switch flushed the wrong art into the wrong slot.
  test("Rest and Fire are different undo steps even when the asset is identical", () => {
    const a = bow();
    expect(editSnapshot(a, onRest).s).not.toBe(editSnapshot(a, { ...onRest, wState: "fire" }).s);
  });

  test("but merely looking at another pose is not a new undo step", () => {
    const a = bow();
    expect(editSnapshot(a, onRest).s).toBe(editSnapshot(a, { ...onRest, angle: "up" }).s);
  });

  test("the pose still rides along, so an undo lands you where the edit was", () => {
    expect(readEditSnapshot(editSnapshot(bow(), { ...onRest, angle: "crouch" })).angle).toBe("crouch");
  });

  test("a snapshot is a deep copy — later edits can't reach back into history", () => {
    const a = bow();
    const entry = editSnapshot(a, onRest);
    a.states.rest.side.push({ id: "later" });
    expect(readEditSnapshot(entry).asset.states.rest.side).toHaveLength(1);
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

  // A bow / RPG is drawn WITH its projectile in it, so Rest means "loaded". The Fire art has to
  // stay up for the whole reload or the arrow reappears in a bow that is still being drawn.
  test("a one-round weapon holds its Fire art for the whole reload, not just the fire flash", () => {
    const bow = startReload(consumeShot(newWeaponAmmo(1), 30), 120);
    expect(bow.ammo).toBe(0);
    expect(bow.reloadT).toBe(120);
    // Long past the fire-pose window, still mid-reload: unloaded, so still on Fire.
    expect(weaponPoseFired(true, null, bow)).toBe(true);
    expect(weaponPoseFired(true, { t: RANGED_FIRE_POSE_FRAMES, dur: RANGED_FIRE_POSE_FRAMES }, bow)).toBe(true);
    // Reload finished — the arrow is back on the string, so back to Rest.
    expect(weaponPoseFired(true, null, { ...bow, reloadT: 0, ammo: 1 })).toBe(false);
  });

  test("a multi-round magazine is untouched — a rifle looks the same empty as full", () => {
    const rifle = startReload({ ...newWeaponAmmo(6), ammo: 0 }, 72);
    expect(weaponPoseFired(true, null, rifle)).toBe(false);
    // ...and unlimited ammo (clip 0) never counts as unloaded.
    expect(weaponPoseFired(true, null, newWeaponAmmo(0))).toBe(false);
  });

  test("no ammo record at all keeps the old behaviour exactly", () => {
    expect(weaponPoseFired(true, { t: 0, dur: 30 })).toBe(true);
    expect(weaponPoseFired(true, null)).toBe(false);
  });
});

// Holding an arrow sideways alongside ↑/↓ is the 45° diagonal — the thing a single ↑ (straight up)
// and a single ↓ (a shallow 40° dip) leave no way to ask for.
describe("diagonal aim (two arrow keys at once)", () => {
  test("two keys fire at exactly 45°, up or down", () => {
    expect(aimAngleDeg(-AIM_DIAGONAL)).toBe(-45);
    expect(aimAngleDeg(AIM_DIAGONAL)).toBe(45);
    expect(projectileAimRad(-AIM_DIAGONAL)).toBeCloseTo(-Math.PI / 4, 10);
    expect(projectileAimRad(AIM_DIAGONAL)).toBeCloseTo(Math.PI / 4, 10);
  });

  test("the single-key holds are unchanged", () => {
    expect(aimAngleDeg(-1)).toBe(-90);   // ↑ alone still goes straight up
    expect(aimAngleDeg(1)).toBe(40);     // ↓ alone still the shallow dip
    expect(aimAngleDeg(0)).toBe(0);
    expect(projectileAimRad(-1)).toBeCloseTo(-Math.PI / 2, 10);
    expect(projectileAimRad(0)).toBe(0);
  });

  test("the arm points along a diagonal shot, and still holds ±50 for a single key", () => {
    expect(aimArmOffsetDeg(-AIM_DIAGONAL)).toBe(-45);
    expect(aimArmOffsetDeg(AIM_DIAGONAL)).toBe(45);
    expect(aimArmOffsetDeg(1)).toBe(50);
    expect(aimArmOffsetDeg(-1)).toBe(-50);
    expect(aimArmOffsetDeg(0)).toBe(0);
  });

  test("only the diagonal holds read as diagonal", () => {
    expect(isDiagonalAim(-AIM_DIAGONAL)).toBe(true);
    expect(isDiagonalAim(0)).toBe(false);
    expect(isDiagonalAim(1)).toBe(false);
    expect(isDiagonalAim(-1)).toBe(false);
  });

  test("a diagonal keeps the Side pose — the drawn Aim-up pose is still ↑ alone", () => {
    expect(playerPoseKey({ aiming: true, aimDir: -AIM_DIAGONAL })).toBe("side");
    expect(playerPoseKey({ aiming: true, aimDir: -1 })).toBe("up");
  });
});

// The renderer turns an arm-flagged piece about its SHOULDER, not its middle. Anything that has to
// land on top of that piece — the selection ring, and above all a cutter's hole — has to use the
// same point, and this is the one function that answers it.
describe("where a piece turns about", () => {
  const arm = { x: 40, y: 60, w: 20, h: 80, limb: "arm" };

  test("an ordinary block turns about its own centre", () => {
    expect(pieceOriginFrac({ x: 0, y: 0, w: 10, h: 10 })).toEqual([0.5, 0.5]);
    expect(pieceOriginCss({ x: 0, y: 0, w: 10, h: 10 })).toBe("50% 50%");
    expect(pieceOriginPoint({ x: 40, y: 60, w: 20, h: 80 })).toEqual({ x: 50, y: 100 });
  });

  test("an arm piece turns about its shoulder end, on all four pivots", () => {
    expect(pieceOriginFrac(arm)).toEqual([0.5, 0]);                          // default pivot is "top"
    expect(pieceOriginPoint(arm)).toEqual({ x: 50, y: 60 });                 // NOT the centre (50,100)
    expect(pieceOriginFrac({ ...arm, armPivot: "bottom" })).toEqual([0.5, 1]);
    expect(pieceOriginFrac({ ...arm, armPivot: "left" })).toEqual([0, 0.5]);
    expect(pieceOriginFrac({ ...arm, armPivot: "right" })).toEqual([1, 0.5]);
    expect(pieceOriginFrac({ ...arm, role: "weaponArm" })).toEqual([0.5, 0]);
  });

  test("a shoe rides the leg but is not an arm, and a swung leg pivots at the hip", () => {
    expect(pieceOriginFrac({ ...arm, _isShoe: true })).toEqual([0.5, 0.5]);
    expect(pieceOriginFrac({ x: 0, y: 0, w: 10, h: 10, _animPivotTop: true })).toEqual([0.5, 0]);
  });

  test("armPivotOrigin and pieceOriginFrac cannot drift apart — same table", () => {
    for (const pv of ["top", "bottom", "left", "right", undefined]) {
      const f = armPivotFrac(pv);
      expect(armPivotOrigin(pv)).toBe((f[0] * 100) + "% " + (f[1] * 100) + "%");
      expect(pieceOriginFrac({ ...arm, armPivot: pv })).toEqual(f);
    }
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

describe("projectile art follows the arc", () => {
  const shot = (over) => ({ startX: 0, startY: 100, groundY: 220, vx: 10, vy: 0, rangePx: 600, ...over });

  test("the gradient is the drop curve's own derivative", () => {
    // Finite-difference the drop against the closed-form slope at a few points on the curve.
    const at = (d) => (projectileDropAtDistance(100, 220, d + 0.5, 600) - projectileDropAtDistance(100, 220, d - 0.5, 600));
    for (const d of [400, 600, 900]) expect(projectileDropSlope(100, 220, d, 600)).toBeCloseTo(at(d), 4);
    expect(projectileDropSlope(100, 220, 300, 600)).toBe(0); // flat first half
  });

  test("a level shot leaves flat and tips nose-down as it falls", () => {
    const pr = shot();
    expect(projectileAngleAtDistance(pr, 0)).toBe(0);
    expect(projectileAngleAtDistance(pr, 300)).toBe(0);       // still in the flat half
    const mid = projectileAngleAtDistance(pr, 450);
    const end = projectileAngleAtDistance(pr, 600);
    const past = projectileAngleAtDistance(pr, 900);
    expect(mid).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(mid);                          // steeper the further it falls
    expect(past).toBeGreaterThan(end);                         // and past its range it keeps steepening
    expect(end).toBeCloseTo(38.7, 1);                          // a clear tip, not a nosedive (this fixture drops
                                                               // 120px over 600 — steeper than a real shot, where
                                                               // the drop is ~2/3 of body height over the range)
  });

  test("distance 0 matches the launch angle the spawn sites set", () => {
    for (const [vx, vy] of [[10, 0], [-10, 0], [7, -7], [0, -12], [-7, 7]]) {
      const pr = shot({ vx, vy });
      expect(projectileAngleAtDistance(pr, 0)).toBeCloseTo(Math.atan2(vy, vx) * 180 / Math.PI, 10);
    }
  });

  test("a leftward shot tips down without flipping through the atan2 branch cut", () => {
    // Facing left is ~180°; falling must walk it DOWN toward 90° (still left, now also down),
    // never jump to -180°, which would spin the sprite a full half-turn mid-flight.
    const pr = shot({ vx: -10 });
    const angles = [0, 400, 600, 900, 1500].map((d) => projectileAngleAtDistance(pr, d));
    expect(angles[0]).toBe(180);
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i]).toBeLessThan(angles[i - 1]);
      expect(angles[i]).toBeGreaterThan(90);
    }
  });

  test("an upward shot points up out of the barrel and levels off at the top of the arc", () => {
    const pr = shot({ vx: 7, vy: -7 });
    expect(projectileAngleAtDistance(pr, 0)).toBeCloseTo(-45, 6);
    // Somewhere past half range the accumulating drop cancels the climb — the apex, where the
    // art is momentarily level — and after that it is pointing downward.
    expect(projectileAngleAtDistance(pr, 600)).toBeGreaterThan(0);
    expect(projectileAngleAtDistance(pr, 600)).toBeGreaterThan(projectileAngleAtDistance(pr, 450));
  });
});

describe("projectiles speed up slightly as they fall", () => {
  const shot = (over) => ({ startX: 0, startY: 100, groundY: 220, vx: 10, vy: 0, rangePx: 600, ...over });

  test("launch speed is untouched for the whole flat half", () => {
    const pr = shot();
    expect(projectileFallSpeedMul(pr, 0)).toBe(1);
    expect(projectileFallSpeedMul(pr, 300)).toBe(1);
  });

  test("it picks up pace once it starts dropping, and only a little", () => {
    const pr = shot();
    const at450 = projectileFallSpeedMul(pr, 450);
    expect(at450).toBeGreaterThan(1);
    expect(projectileFallSpeedMul(pr, 600)).toBeGreaterThan(at450);
    expect(projectileFallSpeedMul(pr, 600)).toBeCloseTo(1 + PROJECTILE_FALL_ACCEL, 6); // exactly _ACCEL at max range
  });

  test("the pickup is the same whatever height you fired from", () => {
    // The reason this is progress-driven rather than gradient-driven: a standing shot barely
    // falls at all next to one fired off a tower, and scaling by the gradient gave the first a
    // 5% nudge nobody could see while visibly launching the second.
    const standing = projectileFallSpeedMul(shot({ startY: 180, groundY: 220 }), 600);
    const tower = projectileFallSpeedMul(shot({ startY: 0, groundY: 900 }), 600);
    expect(standing).toBeCloseTo(tower, 10);
    expect(standing).toBeCloseTo(1.25, 6);
  });

  test("a long fall down a shaft is capped rather than winding up without limit", () => {
    const pr = shot();
    expect(projectileFallSpeedMul(pr, 100000)).toBe(1 + PROJECTILE_FALL_ACCEL_CAP);
    expect(projectileFallSpeedMul(pr, 900)).toBeGreaterThan(projectileFallSpeedMul(pr, 600)); // still building past range
  });

  test("a shot with nowhere to fall never speeds up", () => {
    expect(projectileFallSpeedMul(shot({ groundY: 100 }), 5000)).toBe(1);
    expect(projectileFallSpeedMul(shot({ groundY: 40 }), 5000)).toBe(1); // fired from below its own ground line
  });

  test("speeding up changes timing only — the path itself is untouched", () => {
    // The whole point of scaling `traveled` rather than vx/vy: walk the same shot with and
    // without the boost and every position visited is on the identical curve, so range, drop
    // and landing point cannot move. Only the frame it arrives on does.
    const pr = shot();
    let plain = 0, boosted = 0, frames = 0;
    while (boosted < 900) { plain += 10; boosted += 10 * projectileFallSpeedMul(pr, boosted); frames++; }
    expect(boosted).toBeGreaterThan(plain);             // arrives sooner
    for (const d of [100, 450, 600, 900]) {
      expect(projectilePositionAtDistance(pr, d)).toEqual({ x: d, y: 100 + projectileDropAtDistance(100, 220, d, 600) });
    }
    expect(frames).toBeLessThan(90);
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

  test("bare hands are a 2-damage weapon, run through the same Strength scaling", () => {
    expect(UNARMED_DAMAGE).toBe(2);
    expect(playerMeleeDamage(UNARMED_DAMAGE, 5)).toBe(2);    // neutral Strength
    expect(playerMeleeDamage(UNARMED_DAMAGE, 10)).toBe(4);   // double, like every other melee weapon
    expect(playerMeleeDamage(UNARMED_DAMAGE, 1)).toBe(1);    // 0.4 rounds to 0, floored back to 1
  });

  test("punching is never better than swinging something — the old fists cliff is gone", () => {
    // Fists used to BE the Strength stat (str 10 = 10 damage), which exactly matched a 5-damage
    // weapon at every Strength and beat everything below it. A Strength-10 character punched for
    // more than most of the arsenal, which is the thing that got reported.
    for (let str = 1; str <= 10; str++) {
      const fists = playerMeleeDamage(UNARMED_DAMAGE, str);
      for (let dmg = 2; dmg <= 10; dmg++) expect(playerMeleeDamage(dmg, str)).toBeGreaterThanOrEqual(fists);
    }
    expect(playerMeleeDamage(UNARMED_DAMAGE, 10)).toBe(4);   // was 10, and beat a 6-damage swing outright
    expect(playerMeleeDamage(3, 10)).toBe(6);
  });

  test("an enemy's fists are worth exactly what yours are", () => {
    // One rule, both sides. Leaving the enemy on the raw-Strength version would have had a
    // Strength-10 thug punching for 10 while you punched the same thug for 4.
    for (const str of [1, 5, 10]) {
      expect(enemyAttackDamage({ stats: { strength: str } }, null)).toBeCloseTo(playerMeleeDamage(UNARMED_DAMAGE, str), 0);
    }
    expect(enemyAttackDamage({ stats: { strength: 5 } }, null)).toBe(2);
    expect(enemyAttackDamage({ stats: { strength: 10 } }, null)).toBe(4);
  });

  test("an armed enemy is untouched — only the bare-handed number moved", () => {
    expect(enemyAttackDamage({ stats: { strength: 5 } }, { damage: 7 })).toBe(7);
    expect(enemyAttackDamage({ stats: { strength: 10 } }, { damage: 7 })).toBe(14);
    expect(enemyAttackDamage({ stats: { strength: 1 } }, { damage: 7 })).toBeCloseTo(1.4);
    expect(enemyAttackDamage({}, { damage: 7 })).toBe(7);    // no stats block means baseline 5
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

describe("an enemy faces what it is shooting at", () => {
  test("walking decides which way you look — until you are lining up an attack", () => {
    expect(enemyFaceThisFrame(-1, 3, false)).toBe(1);   // walked right, looks right
    expect(enemyFaceThisFrame(1, -3, false)).toBe(-1);
    expect(enemyFaceThisFrame(-1, 3, true)).toBe(-1);   // committed: the retreat does NOT turn it round
    expect(enemyFaceThisFrame(1, 0, false)).toBe(1);    // standing still keeps the facing it had
  });

  test("winding up, mid-swing, or tracking with a raised weapon all count as committed", () => {
    expect(enemyAttackCommitted({ reactT: 5, swingT: 0, aimHold: 0 })).toBe(true);
    expect(enemyAttackCommitted({ reactT: 0, swingT: 3, aimHold: 0 })).toBe(true);
    expect(enemyAttackCommitted({ reactT: 0, swingT: 0, aimHold: 12 })).toBe(true);
    expect(enemyAttackCommitted({ reactT: 0, swingT: 0, aimHold: 0 })).toBe(false);
    expect(enemyAttackCommitted(null)).toBe(false);
  });

  test("a fleeing shooter keeps retreating while it turns to face the player", () => {
    // The reported bug, played out. Player on the LEFT, enemy on the right running away from them.
    const SPEED = 2.2, dist = -100; // target is 100px to the enemy's left
    const dxMove = enemyMoveIntent("avoid", dist, 200, SPEED, true);
    expect(dxMove).toBeGreaterThan(0);                            // still fleeing, to the right
    // Not yet aiming: it looks the way it runs, which is away from the player. That part is right.
    expect(enemyFaceThisFrame(-1, dxMove, false)).toBe(1);
    // The moment it commits to a shot it turns back toward the player — and keeps backpedalling,
    // because the move intent above is untouched by any of this.
    const facing = enemyFaceToward(dist, 1);
    expect(facing).toBe(-1);
    expect(enemyFaceThisFrame(facing, dxMove, true)).toBe(-1);
  });
});

describe("merging tiles into runs", () => {
  test("neighbouring cells that paint the same become one box, and every cell is still covered", () => {
    const map = { "3,0": "#aaa", "3,1": "#aaa", "3,2": "#aaa", "3,4": "#aaa", "4,0": "#bbb" };
    const runs = cellRuns(map);
    expect(runs.map((r) => [r.key, r.span])).toEqual([["3,0", 3], ["3,4", 1], ["4,0", 1]]);
    // The invariant the level's look depends on: the runs cover each painted cell exactly once.
    expect(runs.reduce((n, r) => n + r.span, 0)).toBe(Object.keys(map).length);
  });

  test("a gap in the row breaks the run — a merged box must never paint an empty cell", () => {
    expect(cellRuns({ "0,0": "#aaa", "0,1": "#aaa", "0,3": "#aaa" }).map((r) => r.span)).toEqual([2, 1]);
  });

  test("a different colour or a different texture is a different run", () => {
    expect(cellRuns({ "0,0": "#aaa", "0,1": "#bbb" }).map((r) => r.span)).toEqual([1, 1]);
    expect(cellRuns({ "0,0": { c: "#aaa", tex: "t1" }, "0,1": { c: "#aaa", tex: "t2" } }).map((r) => r.span)).toEqual([1, 1]);
    expect(cellRuns({ "0,0": { c: "#aaa", tex: "t1" }, "0,1": { c: "#aaa", tex: "t1" } }).map((r) => r.span)).toEqual([2]);
    // Collision-only terrain looks different in the editor and vanishes in play, so it can only
    // merge with more of itself.
    expect(cellRuns({ "0,0": { c: "#aaa", hideInPlay: true }, "0,1": { c: "#aaa" } }).map((r) => r.span)).toEqual([1, 1]);
  });

  test("ramps, outlines and stacked fills each keep a box of their own", () => {
    // A ramp's clip-path is a percentage of its box — widen the box and the diagonal flattens out.
    expect(cellRunSig({ c: "#aaa", slope: 1 })).toBe(null);
    // An outline is derived from a cell's own four neighbours, so it isn't a property of a run.
    expect(cellRunSig({ c: "#aaa", ol: "#000" })).toBe(null);
    // A cell holding several fills draws one box per fill.
    expect(cellRunSig({ c: "#aaa", more: [{ c: "#bbb" }] })).toBe(null);
    expect(cellRunSig("#aaa")).not.toBe(null);
    // Two ramps side by side stay two ramps — an unmergeable cell must never match another one.
    const ramps = cellRuns({ "0,0": { c: "#aaa", slope: 1 }, "0,1": { c: "#aaa", slope: 1 } });
    expect(ramps.map((r) => r.span)).toEqual([1, 1]);
  });

  test("a plain block is mergeable — fgClipPath says the string \"none\", which is truthy", () => {
    // This exact trap cost a debugging round: testing fgClipPath(cell) instead of asking whether
    // the cell actually has a diagonal shape made cellRunSig reject every cell in the level, and
    // merging silently did nothing at all while looking completely correct.
    expect(cellRunSig({ c: "#2d3710", tex: "qnfjme1" })).toBe("#2d3710|qnfjme1|");
    expect(cellRuns({ "0,0": { c: "#2d3710", tex: "q" }, "0,1": { c: "#2d3710", tex: "q" } })[0].span).toBe(2);
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

describe("mirroring a level left↔right", () => {
  // A 10-wide level with a 3-cell ramp climbing left-to-right along row 2 (cols 2,3,4).
  const RAMP = (step) => ({ c: "#6b7b3a", slope: 1, run: 3, step });
  const uphillLevel = () => ({
    id: "lv1", name: "Hill", cols: 10, rows: 4,
    fg: { "2,2": RAMP(0), "2,3": RAMP(1), "2,4": RAMP(2), "3,0": "#2b2b2b" },
    bg: {}, front: {}, fx: {}, climb: {}, hazard: {}, markers: {}, enemies: {},
    conns: { N1: { open: true, accepts: "" }, W1: { open: true, accepts: "sewer" } },
  });

  test("an uphill ramp becomes the same ramp running downhill", () => {
    const flipped = flipLevelHorizontally(uphillLevel(), null);
    // The 3-cell ramp lands on cols 5-7, and `step` still counts left-to-right — so the cell
    // that WAS the ramp's bottom (step 0, col 2) is now its top (step 2, col 7).
    expect(flipped.fg["2,5"]).toEqual({ c: "#6b7b3a", slope: -1, run: 3, step: 0 });
    expect(flipped.fg["2,6"]).toEqual({ c: "#6b7b3a", slope: -1, run: 3, step: 1 });
    expect(flipped.fg["2,7"]).toEqual({ c: "#6b7b3a", slope: -1, run: 3, step: 2 });
    expect(flipped.fg["2,2"]).toBeUndefined();
    expect(flipped.fg["3,9"]).toBe("#2b2b2b");   // a plain block just moves
  });

  test("a steeper-than-45° ramp keeps its rise through the mirror", () => {
    // A horizontal flip moves columns, never rows, so `rstep` must ride along untouched while
    // `step` counts from the far end. Dropping either would turn a steep slope into a broken one.
    const lv = uphillLevel();
    lv.fg["5,2"] = { c: "#6b7b3a", slope: 1, run: 1, step: 0, rise: 2, rstep: 0 };
    lv.fg["6,2"] = { c: "#6b7b3a", slope: 1, run: 1, step: 0, rise: 2, rstep: 1 };
    const flipped = flipLevelHorizontally(lv, null);
    expect(flipped.fg["5,7"]).toEqual({ c: "#6b7b3a", slope: -1, run: 1, step: 0, rise: 2, rstep: 0 });
    expect(flipped.fg["6,7"]).toEqual({ c: "#6b7b3a", slope: -1, run: 1, step: 0, rise: 2, rstep: 1 });
  });

  test("the mirrored ramp is the same walkable surface, not merely the same picture", () => {
    // This is the check that catches getting `step` wrong: the clip-path can look right while the
    // collision surface climbs the wrong way. Sample the real surface at mirrored x positions.
    const lv = uphillLevel(), flipped = flipLevelHorizontally(lv, null);
    const widthPx = lv.cols * 30;
    for (const x of [75, 95, 135]) {                        // low, middle and high along the ramp
      const before = slopeSurfaceAt(lv, x, 2, 2, 30, 30);
      const after = slopeSurfaceAt(flipped, widthPx - x, 2, 2, 30, 30);
      expect(after.y).toBeCloseTo(before.y);                // same height above the ground
      expect(after.dir).toBe(-before.dir);                  // climbing the other way
    }
  });

  test("every fill in a stacked cell flips, not just the one on top", () => {
    const peak = { c: "#8d8578", slope: 1, run: 2, step: 1, more: [{ c: "#6b7b3a", slope: -1, run: 2, step: 0 }] };
    const out = flipFgFill(peak);
    expect(out.slope).toBe(-1);
    expect(out.step).toBe(0);
    expect(out.more[0]).toEqual({ c: "#6b7b3a", slope: 1, run: 2, step: 1 });
  });

  test("an object moves by its whole footprint, so a wide prop lands where its art was", () => {
    // Anchored at col 2 and 4 cells wide, it covers cols 2-5 of a 10-wide level; mirrored it
    // covers 4-7, so its top-left anchor is 4. Mirroring the anchor alone (10-1-2 = 7) would
    // have shoved it four cells to the right.
    expect(flipLevelObject({ kind: "emoji", char: "🌳", size: 4 }, 2, 10, null).c).toBe(4);
    expect(flipLevelObject({ kind: "emoji", char: "🍄", size: 1 }, 2, 10, null).c).toBe(7);
  });

  test("an object's art, twist and sideways nudge all reverse with it", () => {
    const { o } = flipLevelObject({ kind: "emoji", char: "🚗", size: 2, rot: 20, ox: 0.5, oy: 1 }, 3, 10, null);
    expect(o.flip).toBe(true);
    expect(o.rot).toBe(340);
    expect(o.ox).toBeCloseTo(-0.5);
    expect(o.oy).toBe(1);                                   // vertical nudge is untouched by a left-right mirror
    expect(objRotStyle(o)).toEqual({ transform: "rotate(340deg) scaleX(-1)" });
    // Already-mirrored art un-mirrors, so flipping twice is a true round trip.
    expect(flipLevelObject(o, 5, 10, null).o.flip).toBe(false);
  });

  test("enemies turn to face the way they were watching", () => {
    const lv = { ...uphillLevel(), enemies: { "1,1": { enemyId: "e1", facing: -1, ai: "guard" }, "1,8": { enemyId: "e2", facing: 1 } } };
    const flipped = flipLevelHorizontally(lv, null);
    expect(flipped.enemies["1,8"]).toEqual({ enemyId: "e1", facing: 1, ai: "guard" });
    expect(flipped.enemies["1,1"]).toEqual({ enemyId: "e2", facing: -1 });
  });

  test("an enemy saved without a facing counts as left-facing, so its mirror faces right", () => {
    const flipped = flipLevelHorizontally({ ...uphillLevel(), enemies: { "1,1": { enemyId: "e1" } } }, null);
    expect(flipped.enemies["1,8"].facing).toBe(1);
  });

  test("the exits move to the edges they now sit on", () => {
    expect(flipConns({ W1: { open: true, accepts: "sewer" }, N1: { open: false, accepts: "" } }))
      .toEqual({ E1: { open: true, accepts: "sewer" }, N2: { open: false, accepts: "" } });
  });

  test("climb, hazard and marker cells move across untouched", () => {
    const lv = {
      ...uphillLevel(),
      climb: { "1,1": { kind: "ladder" } },
      hazard: { "1,2": { kind: "fire", dps: 8, life: 0 } },
      markers: { "1,3": { kind: "door", tag: "shop" } },
    };
    const flipped = flipLevelHorizontally(lv, null);
    expect(flipped.climb).toEqual({ "1,8": { kind: "ladder" } });
    expect(flipped.hazard).toEqual({ "1,7": { kind: "fire", dps: 8, life: 0 } });
    expect(flipped.markers).toEqual({ "1,6": { kind: "door", tag: "shop" } });
    expect(flipped.climb["1,1"]).toBeUndefined();
  });

  test("flipping twice gives back exactly what you started with", () => {
    // The property that makes the button safe to press: it is its own undo. Every field that the
    // flip writes is spelled out in the fixture, so this compares like with like.
    const lv = {
      id: "lv1", name: "Hill", floor: "1", section: "", cols: 10, rows: 4,
      fg: { "2,2": RAMP(0), "2,3": RAMP(1), "2,4": RAMP(2), "3,0": "#2b2b2b" },
      bg: { "0,0": { c: "#7aa2d6", slope: -1, run: 1, step: 0 } },
      front: { "0,9": "#3a3f52" },
      fx: { "1,2": [{ kind: "emoji", char: "🌳", size: 4, rot: 20, ox: 0.5, oy: 1, flip: false, solid: false, inFront: false }] },
      climb: { "1,1": { kind: "ladder" } },
      hazard: { "1,2": { kind: "fire", dps: 8, life: 0 } },
      markers: { "1,3": { kind: "door", tag: "shop" } },
      enemies: { "1,1": { enemyId: "e1", facing: -1 } },
      conns: { N1: { open: true, accepts: "" }, E2: { open: false, accepts: "" } },
    };
    expect(flipLevelHorizontally(flipLevelHorizontally(lv, null), null)).toEqual(lv);
  });

  test("the level's own name, size and floor survive the mirror", () => {
    const flipped = flipLevelHorizontally(uphillLevel(), null);
    expect(flipped.id).toBe("lv1");
    expect(flipped.name).toBe("Hill");
    expect(flipped.cols).toBe(10);
    expect(flipped.rows).toBe(4);
  });
});


// =================================================================================================
// SAVES.
//
// Two things have to hold for drawn work to be safe, and each has cost a library:
//   1. the project file must accept every KIND of work, not just assets, and must never be talked
//      into blanking itself by a page that had nothing to say yet;
//   2. the loaders must not throw, because a loader that throws is indistinguishable from the work
//      being gone — that is what "my saves disappeared" has actually meant every time so far.
// =================================================================================================
describe("the project-file library's write rules", () => {
  const { applyWrite, mergeById, removeById, KINDS } = require("./setupProxy").__test;
  const A = (id) => ({ id, name: id });
  const store = (assets, levels, stamps) => ({ assets: assets || [], levels: levels || [], stamps: stamps || [] });
  const ids = (l) => l.map((x) => x.id);

  test("an empty assets array never blanks a stored library", () => {
    const { next, keptAssets } = applyWrite(store([A("a1"), A("a2")]), { assets: [] }, []);
    expect(keptAssets).toBe(true);
    expect(ids(next.assets)).toEqual(["a1", "a2"]);
  });

  test("replace cannot use an empty list to wipe the file either", () => {
    const { next } = applyWrite(store([A("a1")]), { assets: [], replace: true }, []);
    expect(ids(next.assets)).toEqual(["a1"]);
  });

  test("a save carrying ONLY levels still stores them", () => {
    // The regression that left every level browser-only: the old handler saw an empty assets array
    // and returned before it looked at anything else in the same POST.
    const { next } = applyWrite(store([A("a1")]), { assets: [], levels: [A("lv1")] }, []);
    expect(ids(next.levels)).toEqual(["lv1"]);
    expect(ids(next.assets)).toEqual(["a1"]);
  });

  test("a save carrying ONLY a stored group still stores it", () => {
    const { next } = applyWrite(store([A("a1")]), { assets: [], stamps: [A("st1")] }, []);
    expect(ids(next.stamps)).toEqual(["st1"]);
    expect(ids(next.assets)).toEqual(["a1"]);
  });

  test("merging is additive — a partial save never drops what is already stored", () => {
    const { next } = applyWrite(store([A("a1"), A("a2")]), { assets: [A("a3")] }, [A("a3")]);
    expect(ids(next.assets).sort()).toEqual(["a1", "a2", "a3"]);
    expect(ids(mergeById([A("x")], [A("y")])).sort()).toEqual(["x", "y"]);
  });

  test("an explicit remove list is the one thing allowed to shrink the file", () => {
    const { next } = applyWrite(store([A("a1"), A("a2")]), { assets: [], remove: { assets: ["a1"] } }, []);
    expect(ids(next.assets)).toEqual(["a2"]);
  });

  test("removing one kind leaves the other kinds untouched", () => {
    const { next } = applyWrite(store([A("a1")], [A("lv1")], [A("st1")]), { assets: [], remove: { stamps: ["st1"] } }, []);
    expect(ids(next.assets)).toEqual(["a1"]);
    expect(ids(next.levels)).toEqual(["lv1"]);
    expect(next.stamps).toEqual([]);
    expect(removeById([A("k")], [])).toEqual([A("k")]);
  });

  // Derives `incoming` exactly the way the request handler does, so a test can post a body and
  // mean it.
  const write = (current, body) => applyWrite(current, body, (Array.isArray(body.assets) ? body.assets : []).filter((x) => x && x.id)).next;

  test("every kind of drawn work round-trips, not just the ones anyone remembered", () => {
    // The whole failure mode in one test: a kind that is handled by hand is a kind that gets
    // missed, and the missed one is the one that is lost. Each kind saves, merges and deletes.
    for (const kind of KINDS) {
      const start = store([A("keep")]);
      const saved = write(start, { assets: [], [kind]: [A("x1")] });
      expect(ids(saved[kind])).toContain("x1");
      const merged = write(saved, { assets: [], [kind]: [A("x2")] });
      expect(ids(merged[kind]).sort()).toEqual(kind === "assets" ? ["keep", "x1", "x2"] : ["x1", "x2"]);
      const gone = write(merged, { assets: [], remove: { [kind]: ["x1", "x2"] } });
      expect(ids(gone[kind])).toEqual(kind === "assets" ? ["keep"] : []);
    }
  });

  test("a library file written before a kind existed still reads", () => {
    // asset-data/library.json on disk predates textures and backgrounds having a home here.
    const { next } = applyWrite({ assets: [A("a1")] }, { assets: [], textures: [A("t1")] }, []);
    for (const k of KINDS) expect(Array.isArray(next[k])).toBe(true);
    expect(ids(next.textures)).toEqual(["t1"]);
    expect(ids(next.assets)).toEqual(["a1"]);
  });

  test("the app and the server agree on what the kinds ARE", () => {
    // Two lists that must not drift: PROJECT_KINDS in App.js, KINDS in setupProxy.js. If one grows
    // a kind and the other does not, that kind quietly stops being saved — which is the bug.
    const path = require("path");
    const src = require("fs").readFileSync(path.join(__dirname, "App.js"), "utf8");
    const m = src.match(/const PROJECT_KINDS = \[([^\]]*)\]/);
    expect(m).toBeTruthy();
    const appKinds = m[1].split(",").map((x) => x.trim().replace(/["']/g, "")).filter(Boolean);
    expect(appKinds).toEqual(KINDS);
  });
});

describe("every async storage helper is awaited", () => {
  // scanStoredIds became async so it could ask the host store as well as localStorage, and two of
  // its three call sites were updated. The third handed .filter a Promise, threw
  // "scanStoredIds(...).filter is not a function" on the way into the level tester, and took the
  // whole level list down with it — the levels were fine the entire time. A missing await inside a
  // 12,000-line component is invisible to both the compiler and to tests over pure functions, so
  // this reads the source and checks the shape directly.
  test("no async helper's return value is used without await", () => {
    const path = require("path");
    const src = require("fs").readFileSync(path.join(__dirname, "App.js"), "utf8");
    // Blank out comments, so prose describing this bug can never be mistaken for the bug.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\r\n]/g, " "))
      .replace(/(^|[^:])\/\/[^\r\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));
    const asyncNames = new Set();
    for (const m of code.matchAll(/(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*async\s*\(/g)) asyncNames.add(m[1]);
    for (const m of code.matchAll(/async\s+function\s+([A-Za-z0-9_$]+)/g)) asyncNames.add(m[1]);
    expect(asyncNames.has("scanStoredIds")).toBe(true); // the scan found something to check
    const offenders = [];
    code.split(/\r?\n/).forEach((ln, i) => {
      for (const n of asyncNames) {
        const re = new RegExp("(?<![.\\w])" + n + "\\s*\\(", "g");
        let m;
        while ((m = re.exec(ln))) {
          if (/await\s+$/.test(ln.slice(0, m.index))) continue;
          let depth = 0, j = m.index + m[0].length - 1;
          for (; j < ln.length; j++) { if (ln[j] === "(") depth++; else if (ln[j] === ")") { depth--; if (!depth) break; } }
          const after = ln.slice(j + 1);
          if (/^\s*\.(then|catch|finally)\b/.test(after)) continue; // handled as a promise on purpose
          if (/^\s*[.[]/.test(after)) offenders.push("App.js:" + (i + 1) + " — " + n + "() used without await");
        }
      }
    });
    expect(offenders).toEqual([]);
  });
});

describe("Tackle — walking into someone puts them on the floor", () => {
  // The player box and an enemy body box, in the same px space the physics loop uses.
  const player = [100, 200, 40, 90];
  const hit = (b) => boxesOverlap(...player, ...b);
  // What a horizontal-only test (boxGap) would have concluded about the same pair, kept explicit
  // so the reason the knockdown uses a full rectangle overlap survives a later tidy-up.
  const boxGapWouldSayTouching = (bx, bw) => (Math.abs((100 + 40 / 2) - (bx + bw / 2)) - (40 + bw) / 2) <= 0;

  test("standing inside them counts as contact", () => {
    expect(hit([120, 210, 40, 80])).toBe(true);
  });

  test("standing next to them does not — a tackle needs real contact", () => {
    expect(hit([200, 200, 40, 90])).toBe(false);
  });

  test("edges that merely touch are not an overlap, so you can walk up to someone", () => {
    expect(hit([140, 200, 40, 90])).toBe(false);
  });

  test("clearing their head with a jump does NOT floor them", () => {
    // Directly above and horizontally overlapping: boxGap would call this contact, which is
    // exactly why the knockdown test is a full rectangle overlap instead.
    expect(hit([110, 300, 40, 60])).toBe(false);
    expect(boxGapWouldSayTouching(110, 40)).toBe(true);
  });

  test("the knockdown lasts the seconds the item is set to", () => {
    expect(tackleDownFrames(2)).toBe(120);
    expect(tackleDownFrames(0.5)).toBe(30);
  });

  test("a zero or missing duration still reads as a knockdown, never as a no-op", () => {
    expect(tackleDownFrames(0)).toBe(1);
    expect(tackleDownFrames(undefined)).toBe(120); // the effect's own default
  });

  test("there is a real pause before a downed unit can be re-floored", () => {
    expect(TACKLE_GETUP_GRACE_FRAMES).toBeGreaterThan(0);
  });
});

describe("Status effects the PLAYER feels — an enemy's Stun weapon and Tackle kit", () => {
  const fresh = () => ({ stun: 0, down: 0, downCd: 0, blocking: { t: 4 }, throwAiming: true, burstLeft: 2 });

  test("seconds convert to frames the same way every other timer in the loop does", () => {
    expect(statusFreezeFrames(1)).toBe(60);
    expect(statusFreezeFrames(2.5)).toBe(150);
  });

  test("a fraction of a second is still a real freeze, never a silent no-op", () => {
    expect(statusFreezeFrames(0.001)).toBe(1);
  });

  test("nothing running means nothing frozen", () => {
    expect(playerFrozen(fresh())).toBe(false);
    expect(playerFrozen(null)).toBe(false);
  });

  test("both channels freeze, and they are separate timers", () => {
    const dazed = fresh(); stunPlayer(dazed, 1);
    const floored = fresh(); knockDownPlayer(floored, 2);
    expect(playerFrozen(dazed)).toBe(true);
    expect(dazed.down).toBe(0);          // a stun never puts you on the floor
    expect(playerFrozen(floored)).toBe(true);
    expect(floored.stun).toBe(0);        // ...and a knockdown never reads as a daze
    expect(floored.down).toBe(120);
  });

  test("a glancing second hit cannot cut a long freeze short", () => {
    const p = fresh();
    stunPlayer(p, 3);
    stunPlayer(p, 0.25);
    expect(p.stun).toBe(180);
    knockDownPlayer(p, 4);
    knockDownPlayer(p, 0.5);
    expect(p.down).toBe(240);
  });

  test("being hit drops a raised guard, a wound-up throw and any committed burst", () => {
    // The burst matters most: a salvo already in flight is COMMITTED state rather than a held
    // key, so blanking the input intent alone would leave you shooting through your own stun.
    const p = fresh();
    stunPlayer(p, 1);
    expect(p.blocking).toBe(null);
    expect(p.throwAiming).toBe(false);
    expect(p.burstLeft).toBe(0);
  });

  test("a weapon with no Stun set freezes nobody", () => {
    const p = fresh();
    stunPlayer(p, 0);
    stunPlayer(p, undefined);
    expect(playerFrozen(p)).toBe(false);
  });

  test("a frozen player has no input intent at all — that is the whole gate", () => {
    const held = { left: true, right: true, up: true, down: true, jump: true, fire: true, melee: true, crouch: true, reload: true, throw: true, interact: true, aimUp: true, aimDown: true, aimLeft: true, aimRight: true };
    const live = mergeInputIntent(held);
    const frozen = mergeInputIntent({});
    expect(Object.values(live).some(Boolean)).toBe(true);
    expect(Object.values(frozen).every((v) => v === false)).toBe(true);
    expect(Object.keys(frozen).sort()).toEqual(Object.keys(live).sort()); // same shape, so nothing downstream sees a missing key
  });
});

describe("Enemy tackle AI — a tackler comes and finds you", () => {
  test("the ability is read off the wearer's effects, whoever the wearer is", () => {
    expect(tackleSecsOf({ effects: [{ type: "tackle", secs: 3 }] })).toBe(3);
    expect(tackleSecsOf({ effects: [{ type: "tackle" }] })).toBe(2);      // the catalog default
  });

  test("a unit wearing anything else, or nothing, never charges", () => {
    expect(tackleSecsOf({ effects: [{ type: "glide", fall: 0.4 }] })).toBe(null);
    expect(tackleSecsOf({ effects: [] })).toBe(null);
    expect(tackleSecsOf({})).toBe(null);
    expect(tackleSecsOf(null)).toBe(null);
  });

  test("how often it charges rides Intelligence, like every other enemy decision", () => {
    expect(enemyTackleChargeChance(5)).toBeCloseTo(0.35, 5);
    expect(enemyTackleChargeChance(1)).toBeLessThan(enemyTackleChargeChance(10));
    expect(enemyTackleChargeChance(undefined)).toBe(enemyTackleChargeChance(5));
  });

  test("even a genius tackler leaves gaps you can move through", () => {
    expect(enemyTackleChargeChance(1000)).toBeLessThan(1);
  });

  test("a per-second chance rolled per frame compounds back to that chance over a second", () => {
    // Rolling the raw 0.35 sixty times a second would fire on the first frame in range, every
    // time — this is the conversion that stops the charge being constant.
    const perFrame = perFrameChance(0.35, 1);
    expect(perFrame).toBeLessThan(0.35 / 10);
    const missAllSecond = Math.pow(1 - perFrame, 60);
    expect(1 - missAllSecond).toBeCloseTo(0.35, 6);
  });

  test("a long frame is worth proportionally more of the second it covers", () => {
    expect(perFrameChance(0.35, 3)).toBeGreaterThan(perFrameChance(0.35, 1));
    expect(perFrameChance(0, 1)).toBe(0);
  });

  test("a charge is a sprint over a short, readable distance", () => {
    expect(TACKLE_CHARGE_SPEED_MUL).toBeGreaterThan(1);
    expect(TACKLE_CHARGE_FRAMES).toBeGreaterThan(0);
    expect(TACKLE_CHARGE_RANGE).toBeGreaterThan(0);
  });

  test("a landed tackle always hands back more time on your feet than the knockdown took", () => {
    // The soft-lock guard: without it a tackler stands over you and re-floors you every get-up
    // grace window, which a floored player cannot walk away from the way an enemy can.
    expect(TACKLE_RECOVER_FRAMES).toBeGreaterThan(TACKLE_GETUP_GRACE_FRAMES);
    expect(TACKLE_CHARGE_COOLDOWN_FRAMES).toBeGreaterThan(TACKLE_CHARGE_FRAMES);
  });
});

describe("asset JSON whose per-body fits arrived double-wrapped", () => {
  // The shape hand-written / AI-written asset files keep landing in: each variant boxed as
  // { angles: {...} } instead of being the flat pose map itself. Nothing errors — the art just
  // never draws, in the editor, in Dress Bob and in Playtest alike.
  const hat = () => ({
    type: "equipment", slot: "hat", id: "h1", name: "Helmet", guideId: "body9", lastFit: "body9",
    angles: { front: [{ id: "p1", kind: "rect", x: 60, y: 8, w: 60, h: 30, color: "#c9302c" }] },
    variants: {
      default: { angles: { front: [{ id: "p1", kind: "rect", x: 60, y: 8, w: 60, h: 30, color: "#c9302c" }] } },
      body9: { angles: { front: [{ id: "p2", kind: "rect", x: 61, y: 9, w: 60, h: 30, color: "#c9302c" }] } },
    },
  });

  test("the fit is unwrapped, so the art is where every reader looks for it", () => {
    const out = normalizeAssetJson(hat());
    expect(out.variants.default.front).toHaveLength(1);
    expect(out.variants.body9.front[0].id).toBe("p2");
  });

  test("every base pose is present on the repaired fit", () => {
    const out = normalizeAssetJson(hat());
    for (const a of ["front", "back", "side", "up", "crouch"]) expect(Array.isArray(out.variants.default[a])).toBe(true);
  });

  test("a correctly shaped fit is left exactly as it was", () => {
    const src = hat();
    src.variants = { default: { front: [{ id: "ok", kind: "rect", x: 1, y: 2, w: 3, h: 4, color: "#fff" }], back: [], side: [], up: [], crouch: [] } };
    expect(normalizeAssetJson(src).variants.default.front[0].id).toBe("ok");
  });

  test("a wrapped WEAPON fit lands in its Rest state rather than being thrown away", () => {
    const w = {
      type: "weapon", id: "w1", name: "Bat", wtype: "melee",
      angles: { side: [{ id: "b1", kind: "rect", x: 10, y: 10, w: 8, h: 60, color: "#8d6b3f" }] },
      variants: { default: { angles: { side: [{ id: "b1", kind: "rect", x: 10, y: 10, w: 8, h: 60, color: "#8d6b3f" }] } } },
    };
    expect(normalizeAssetJson(w).variants.default.states.rest.side).toHaveLength(1);
  });

  test("a weapon fit that already has states keeps its grip point", () => {
    const w = {
      type: "weapon", id: "w2", name: "Axe", wtype: "melee", angles: { side: [] },
      variants: { default: { hand: { side: { x: 5, y: 6 } }, states: { rest: { side: [{ id: "a1", kind: "rect", x: 0, y: 0, w: 9, h: 9, color: "#999" }] }, fire: {} } } },
    };
    const out = normalizeAssetJson(w);
    expect(out.variants.default.hand.side).toEqual({ x: 5, y: 6 });
    expect(out.variants.default.states.rest.side).toHaveLength(1);
  });
});

// The "⬇ Export everything" label. It read only the browser's levelIndex, which is empty on a
// brand-new preview address even when the project file holds levels — loadLevels() is what brings
// those down and it doesn't run until the Level Creator is opened. The button therefore said
// "0 levels" over a library with four, and "0 levels" is the reading that makes a backup missing
// every level look like there was nothing to lose. The bundle itself was always correct.
describe("the Export everything label counts levels honestly", () => {
  test("the project file's levels count even when the browser index is empty", () => {
    expect(exportLevelCount([], [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }])).toBe(4);
  });
  test("the browser's levels count when the project file has none", () => {
    expect(exportLevelCount([{ id: "a" }, { id: "b" }], [])).toBe(2);
  });
  test("whichever store knows about more is the answer — never their sum", () => {
    expect(exportLevelCount([{ id: "a" }, { id: "b" }], [{ id: "a" }, { id: "b" }])).toBe(2);
    expect(exportLevelCount([{ id: "a" }], [{ id: "a" }, { id: "b" }, { id: "c" }])).toBe(3);
  });
  test("a missing or unreadable store is zero, not a crash", () => {
    expect(exportLevelCount(null, undefined)).toBe(0);
    expect(exportLevelCount("not an array", { levels: 4 })).toBe(0);
    expect(exportLevelCount(undefined, [{ id: "a" }])).toBe(1);
  });
});

// ⧉ Replace. Painting a ramp onto a cell that already holds a block stacks by design — that is
// what lets a gravel ramp cross grass and two opposing ramps make a peak. But a cell that picked
// up a stack you never wanted could not be painted back out of it: repainting the ramp swaps the
// top fill and leaves the block underneath, so the cell reads as two colours forever. That got
// "fixed" once by recolouring every under-fill with the new paint, which made the cell one colour
// and made stacking meaningless in the same stroke (8 tests red for six days). The stack stays; the
// escape hatch is its own toggle, and it is a decision about WHETHER to merge, not about what
// merging does.
describe("stack or replace is a decision made before the merge", () => {
  const GRAVEL = { c: "#8d8578", tex: "tex-gravel" };
  const rampUp = { slope: 1, run: 3, step: 1 };

  test("Foreground with Replace off stacks, exactly as mergeFgFill says", () => {
    const out = paintIntoCell("fg", "#2e7d32", { ...GRAVEL, ...rampUp }, false);
    expect(out.c).toBe("#8d8578");
    expect(out.more).toEqual([{ c: "#2e7d32" }]);
  });

  test("Foreground with Replace on is the paint and nothing else", () => {
    const val = { ...GRAVEL, ...rampUp };
    expect(paintIntoCell("fg", "#2e7d32", val, true)).toBe(val);
  });

  test("Replace clears a stack the cell had already picked up", () => {
    const stacked = mergeFgFill("#2e7d32", { ...GRAVEL, ...rampUp });
    expect(stacked.more).toHaveLength(1);
    const out = paintIntoCell("fg", stacked, { c: "#c62828", ...rampUp }, true);
    expect(out.more).toBeUndefined();
    expect(fgFills(out).map((f) => f.c)).toEqual(["#c62828"]);
  });

  test("a ramp is never an eraser — every terrain layer keeps what was under it", () => {
    // Painting a ramp across a background brick wall used to DELETE the bricks beneath the
    // diagonal, leaving a hole through to the empty level behind. Foreground merged; the other
    // two replaced, on the reasoning that nothing walks on them — which confused collision with
    // paint. What a merge preserves is the wall you already painted.
    const val = { c: "#c62828", ...rampUp };
    for (const layer of ["fg", "bg", "front"]) {
      const merged = paintIntoCell(layer, "#2e7d32", val, false);
      expect(fgFills(merged).map((f) => f.c)).toEqual(["#c62828", "#2e7d32"]); // ramp over the wall
      expect(paintIntoCell(layer, "#2e7d32", val, true)).toBe(val);            // ⧉ Replace still replaces
    }
  });

  test("layers with no terrain vocabulary are untouched by the stacking rule", () => {
    const val = { c: "#c62828", ...rampUp };
    for (const layer of ["obj", "marker", "climb", "hazard"]) {
      expect(paintIntoCell(layer, "#2e7d32", val, false)).toBe(val);
    }
  });

  test("a plain block still covers the stack on Background, as it does on Foreground", () => {
    // mergeFgFill only stacks when the NEW paint is a diagonal; a solid block hides what's under
    // it, so painting a plain colour over a merged cell is still a clean one-material reset.
    const stacked = mergeFgFill("#2e7d32", { c: "#c62828", ...rampUp });
    expect(paintIntoCell("bg", stacked, "#111111", false)).toBe("#111111");
  });

  test("a plain block is still a clean reset on the Foreground with Replace off", () => {
    const stacked = mergeFgFill("#2e7d32", { ...GRAVEL, ...rampUp });
    expect(paintIntoCell("fg", stacked, "#111111", false)).toBe("#111111");
  });
});

describe("the Solid checkbox no longer decides what draws on top", () => {
  // The football-pitch bug, as a test. A grandstand you cannot walk through and a pitch you can
  // are two different collision answers, and that was being used as a drawing answer: solid went
  // on rung 2, decor on rung 1, and a CSS z-index beats DOM order — so the pitch could never be
  // brought over the stands however it was placed or reordered.
  test("a decorative prop can be drawn over a solid one", () => {
    const stands = { kind: "prop", propId: "stands", solid: true, z: 1 };
    const pitch = { kind: "prop", propId: "pitch", solid: false, z: 2 }; // placed second
    // Before: different rungs, and the rung wins no matter what z says.
    expect(objectLayerClass(stands)).not.toBe(objectLayerClass(pitch));
    expect(levelObjectZIndex(pitch, 1)).toBeLessThan(levelObjectZIndex(stands, 0));
    // After: put the pitch on the same layer and being placed second is enough.
    const lifted = { ...pitch, lay: "fg" };
    expect(objectLayerClass(lifted)).toBe(objectLayerClass(stands));
    expect(levelObjectZIndex(lifted, 1)).toBeGreaterThan(levelObjectZIndex(stands, 0));
    expect(lifted.solid).toBe(false); // and it still does not block you
  });

  test("an explicit layer beats what solid/inFront would have implied", () => {
    expect(objectLay({ solid: true })).toBe("fg");
    expect(objectLay({ solid: true, lay: "bg" })).toBe("bg");
    expect(objectLay({ inFront: true, lay: "fg" })).toBe("fg");
    expect(objectLay({ solid: false, lay: "front" })).toBe("front");
  });

  test("an object with no layer of its own behaves exactly as it always did", () => {
    // Every level in the library predates `lay`. None of them may move a pixel.
    expect(objectLay({ solid: true })).toBe("fg");
    expect(objectLay({ inFront: true })).toBe("front");
    expect(objectLay({ inFront: true, solid: true })).toBe("front");
    expect(objectLay({})).toBe("bg");
    expect(objectLay(undefined)).toBe("bg");
    expect(objectLay({ lay: "nonsense" })).toBe("bg"); // junk falls back, never throws
  });

  test("each layer's objects sit above their own cell rung and below the next one", () => {
    expect(levelObjectZIndex({ lay: "bg" }, 0)).toBeGreaterThan(LAYER_BASE_Z.bg);
    expect(levelObjectZIndex({ lay: "bg" }, 998)).toBeLessThan(LAYER_BASE_Z.fg);
    expect(levelObjectZIndex({ lay: "fg" }, 0)).toBeGreaterThan(LAYER_BASE_Z.fg);
    expect(levelObjectZIndex({ lay: "fg" }, 998)).toBeLessThan(LAYER_BASE_Z.front);
    expect(levelObjectZIndex({ lay: "front" }, 0)).toBeGreaterThan(LAYER_BASE_Z.front);
  });

  test("later in the draw order is always higher, and a runaway count cannot leak into the next rung", () => {
    expect(levelObjectZIndex({ lay: "fg" }, 5)).toBeGreaterThan(levelObjectZIndex({ lay: "fg" }, 4));
    expect(levelObjectZIndex({ lay: "bg" }, 99999)).toBeLessThan(LAYER_BASE_Z.fg);
  });

  test("draw order hands out a back-to-front position for the renderer to use", () => {
    const fx = { "1,1": [{ char: "a", z: 5 }], "2,2": [{ char: "b", z: 1 }] };
    expect(levelObjectsInDrawOrder(fx).map((e) => [e.o.char, e.ord])).toEqual([["b", 0], ["a", 1]]);
  });
});

describe("Front / Back move the layer too, not just the order", () => {
  const fx = () => ({ "1,1": [{ char: "pitch", solid: false }], "5,5": [{ char: "stands", solid: true }] });
  test("Front lifts a background object onto the top rung its neighbours use", () => {
    expect(orderEndLay(fx(), "1,1", 0, true)).toBe("fg");
  });
  test("Back drops a foreground object to the bottom rung its neighbours use", () => {
    expect(orderEndLay(fx(), "5,5", 0, false)).toBe("bg");
  });
  test("it never moves past its peers — Front with nothing above it is a no-op", () => {
    const flat = { "1,1": [{ char: "a", solid: false }], "2,2": [{ char: "b", solid: false }] };
    expect(orderEndLay(flat, "1,1", 0, true)).toBe("bg");
    expect(orderEndLay(flat, "1,1", 0, false)).toBe("bg");
  });
  test("it never promotes anything onto the over-the-player rung", () => {
    // "In front of player" is a gameplay decision, so an ordering button must not make it.
    const withFront = { "1,1": [{ char: "a", solid: false }], "9,9": [{ char: "cover", inFront: true }] };
    expect(orderEndLay(withFront, "1,1", 0, true)).toBe("bg");
    // ...and an object already on it is left alone in both directions.
    expect(orderEndLay(withFront, "9,9", 0, false)).toBe("front");
  });
  test("a missing object does not throw", () => {
    expect(orderEndLay({}, "0,0", 0, true)).toBe("bg");
  });
});

describe("a grenade's flame goes out on its own clock", () => {
  // Blake's Grenade: landEffectLife 2.5, landPropId -> his "Explosion" prop. The hazard is painted
  // hideInPlay (invisible, still damaging) and the prop is what you actually see. The countdown
  // ended the DAMAGE on time and nothing ever took the prop down, so the explosion sat there lit
  // until Playtest stopped — a 2.5-second fire that burned forever.
  test("the same answer governs the damage and the art that draws it", () => {
    const life = { "3,4": 2.5 };
    expect(hazardStillBurning(life, "3,4")).toBe(true);
    life["3,4"] = 0;
    expect(hazardStillBurning(life, "3,4")).toBe(false); // damage stops, and so does the prop
  });

  test("a cell that never entered the countdown is permanent and always burns", () => {
    // life 0 on the cell means "never goes out" — those keys deliberately stay out of the map.
    expect(hazardStillBurning({}, "1,1")).toBe(true);
    expect(hazardStillBurning({ "9,9": 0 }, "1,1")).toBe(true);
    expect(hazardStillBurning(null, "1,1")).toBe(true);
  });

  test("a landing seeds a countdown the prop and the hazard both read", () => {
    const { hazard, newHazKeys, newPropKeys } = applyLandingEffect({}, {}, ["3,4"], 10, 2.5, "expl0d3", 3);
    expect(hazard["3,4"].life).toBe(2.5);
    expect(hazard["3,4"].hideInPlay).toBe(true); // the prop is the visible half
    expect(newHazKeys).toEqual(["3,4"]);
    expect(newPropKeys).toEqual(["3,4"]); // same key, so one countdown covers both
  });
});

describe("throwables carry, and weight is what decides how far", () => {
  test("making a throwable lighter actually makes it go further", () => {
    // The old formula was max(0, weight - 3) — so 1, 2 and 3 were one value in three costumes.
    // Blake's Rock is weight 1 and threw exactly as far as a weight-3 grenade.
    expect(throwRangeBlocks(5, 1)).toBeGreaterThan(throwRangeBlocks(5, 2));
    expect(throwRangeBlocks(5, 2)).toBeGreaterThan(throwRangeBlocks(5, DEFAULT_THROW_WEIGHT));
  });

  test("weight matters across the whole slider, in both directions", () => {
    for (let w = 1; w < 10; w++) expect(throwRangeBlocks(5, w)).toBeGreaterThan(throwRangeBlocks(5, w + 1));
    // ...and it matters a LOT: lightest covers 4x the ground of heaviest.
    expect(throwRangeBlocks(5, 1) / throwRangeBlocks(5, 10)).toBeGreaterThan(3);
  });

  test("throwables got a real range buff at every strength", () => {
    const oldFormula = (str, w) => Math.max(2, (5 + Math.floor(str / 2)) - Math.max(0, w - 3) * 0.6);
    for (const str of [1, 3, 5, 8, 10]) for (const w of [1, 2, 3, 5, 8, 10]) {
      expect(throwRangeBlocks(str, w)).toBeGreaterThan(oldFormula(str, w));
    }
  });

  test("a light rock at average strength clears a useful distance", () => {
    expect(throwRangeBlocks(5, 1)).toBeGreaterThan(13); // was 7 — inside enemy shooting range
  });

  test("strength still helps, and the floor still holds", () => {
    expect(throwRangeBlocks(10, 3)).toBeGreaterThan(throwRangeBlocks(1, 3));
    expect(throwRangeBlocks(1, 10)).toBeGreaterThanOrEqual(2);
  });

  test("the multiplier is centred on the default weight and clamps outside the slider", () => {
    expect(throwWeightMultiplier(DEFAULT_THROW_WEIGHT)).toBeCloseTo(1, 5);
    expect(throwWeightMultiplier(0)).toBe(throwWeightMultiplier(1));   // below the slider
    expect(throwWeightMultiplier(50)).toBe(throwWeightMultiplier(10)); // above it
    expect(throwWeightMultiplier(undefined)).toBeCloseTo(1, 5);
  });
});

describe("a throwable does impact damage with the number you typed in", () => {
  // The Rock: landEffect none, 0 burn, 0 splash, damage 10. Its impact was the only damage it had
  // and nothing read it, so a thrown rock passed through people and did nothing at all.
  test("impact damage is the weapon's own Damage field", () => {
    expect(throwImpactDamage({ damage: 10 })).toBe(10); // Blake's Rock
    expect(throwImpactDamage({ damage: 12 })).toBe(12); // Grenade
    expect(throwImpactDamage({ damage: 8 })).toBe(8);   // Molotov
  });

  test("it does not depend on splash, burn or anything else the throwable leaves behind", () => {
    const rock = { damage: 10, landEffect: "none", landEffectDps: 0, landRadius: 0 };
    const nade = { damage: 10, landEffect: "fire", landEffectDps: 30, landRadius: 3 };
    expect(throwImpactDamage(rock)).toBe(throwImpactDamage(nade));
  });

  test("zero really means zero, so a purely-incendiary throwable can still exist", () => {
    // Distinct from "missing", which takes the usual weapon default.
    expect(throwImpactDamage({ damage: 0 })).toBe(0);
    expect(throwImpactDamage({})).toBe(5);
    expect(throwImpactDamage(null)).toBe(5);
    expect(throwImpactDamage(undefined)).toBe(5);
  });

  test("a nonsense value can never heal an enemy or land a fraction", () => {
    expect(throwImpactDamage({ damage: -20 })).toBe(0);
    expect(throwImpactDamage({ damage: 7.6 })).toBe(8);
  });

  test("the impact reach is contact, not a blast", () => {
    expect(THROW_IMPACT_RADIUS_CELLS).toBeLessThan(1);
    // ...and tighter than the stun reach of even a zero-splash throwable, which is a full block.
    expect(THROW_IMPACT_RADIUS_CELLS).toBeLessThan(throwStunRadiusCells(0));
  });

  test("an enemy standing at the impact point is inside the impact radius", () => {
    const CW = 30, radPx = THROW_IMPACT_RADIUS_CELLS * CW;
    // A body-sized box with the throwable landing on its feet.
    const box = { x: 100, y: 100, w: 20, h: 60 };
    expect(blastHitsBox(110, 158, box.x, box.y, box.w, box.h, radPx)).toBe(true);  // at its feet
    expect(blastHitsBox(110, 105, box.x, box.y, box.w, box.h, radPx)).toBe(true);  // to the head
    expect(blastHitsBox(300, 100, box.x, box.y, box.w, box.h, radPx)).toBe(false); // sailing past
  });
});

describe("the Front layer takes ramps, like every other terrain layer", () => {
  // The Block / Ramp buttons disappeared the instant you selected Front. They were gated to
  // fg and bg in five separate places plus terrainPaintShape, and the Front render had no
  // clip-path at all, so even a stored slope would have drawn as a full square.
  test("Front is a ramp-taking layer", () => {
    expect(layerTakesRamps("front")).toBe(true);
    expect(layerTakesRamps("fg")).toBe(true);
    expect(layerTakesRamps("bg")).toBe(true);
  });

  test("layers that have no terrain vocabulary still refuse a shape", () => {
    for (const l of ["obj", "marker", "climb", "hazard", "enemy", undefined, null, ""]) {
      expect(layerTakesRamps(l)).toBe(false);
      expect(terrainPaintShape(l, "slopeUp")).toBeNull();
    }
  });

  test("a Front ramp is the same diagonal a Background ramp is", () => {
    const extra = { run: 4, step: 2 };
    expect(terrainPaintShape("front", "slopeUp", false, false, extra))
      .toEqual(terrainPaintShape("bg", "slopeUp", false, false, extra));
    expect(terrainPaintShape("front", "slopeDown", true)).toEqual({ slope: -1, upsideDown: true });
  });

  test("a Front ramp never picks up collision, however it was painted", () => {
    // hideInPlay is a Foreground-only idea; Front must not sprout one, and must never be solid.
    expect(terrainPaintShape("front", "slopeUp", false, true)).toEqual({ slope: 1 });
    const ramp = paintValue("#6b7b3a", null, terrainPaintShape("front", "slopeUp", false, false, { run: 1, step: 0 }));
    const lv = { rows: 3, cols: 3, fg: {}, bg: {}, front: { "1,1": ramp } };
    expect(fgSolid(lv.fg["1,1"])).toBe(false);
    expect(slopeSurfaceAt(lv, 45, 1, 1, 30, 30)).toBeNull();
  });

  test("a Front ramp stacks over what was there, and the stack is still collision-free", () => {
    const ramp = paintValue("#6b7b3a", null, terrainPaintShape("front", "slopeUp", false, false, { run: 1, step: 0 }));
    const merged = paintIntoCell("front", "#111111", ramp, false);
    expect(fgFills(merged).map((f) => f.c)).toEqual(["#6b7b3a", "#111111"]);
    // Whatever it stacked, none of it may ever become something the player stands on.
    const lv = { rows: 3, cols: 3, fg: {}, bg: {}, front: { "1,1": merged } };
    expect(fgSolid(lv.fg["1,1"])).toBe(false);
    expect(slopeSurfaceAt(lv, 45, 1, 1, 30, 30)).toBeNull();
  });

  test("a Front ramp actually gets a diagonal drawn — the render half of the bug", () => {
    const ramp = paintValue("#6b7b3a", null, terrainPaintShape("front", "slopeUp", false, false, { run: 1, step: 0 }));
    expect(fgClipPath(ramp)).not.toBe("none");
    expect(fgClipPath("#6b7b3a")).toBe("none"); // a plain block is still a full square
  });
});

describe("the props shipped inside asset-data/library.json", () => {
  // Committing an asset into the project file IS how it reaches Blake — loadLibrary writes back
  // anything this browser store has never seen. So the file itself is the deliverable, and these
  // run the shipped records through the app's OWN code rather than trusting the script that wrote
  // them. Every check below is a mistake that has actually been made on a prop before.
  const library = () => JSON.parse(require("fs").readFileSync(
    require("path").join(__dirname, "..", "asset-data", "library.json"), "utf8"));
  const byId = (id) => {
    const a = library().assets.find((x) => x.id === id);
    expect(a).toBeTruthy();
    return a;
  };

  test.each(["cncstd1", "mdetsd1", "drnkmch1"])("%s survives normalizeAssetJson with its art intact", (id) => {
    const raw = byId(id);
    const out = normalizeAssetJson(raw);
    // migrate() does `a.angles = a.frames[0]`, so frames[0].front is what actually survives import.
    // A fit variant boxed as {angles:{…}} imports clean and then draws nothing at all.
    expect(out.frames[0].front.length).toBe(raw.frames[0].front.length);
    expect(out.angles.front.length).toBe(raw.frames[0].front.length);
    expect(out.type).toBe("prop");
    for (const p of out.frames[0].front) {
      for (const k of ["x", "y", "w", "h"]) expect(Number.isFinite(p[k])).toBe(true);
      expect(p.w).toBeGreaterThan(0);
      expect(p.h).toBeGreaterThan(0);
    }
  });

  test.each(["cncstd1", "mdetsd1", "drnkmch1"])("%s has a size the level editor can actually offer", (id) => {
    expect(LV_OBJ_SIZES).toContain(byId(id).size);   // 14 is not a size; 12 and 16 are
  });

  test("no stray block inflates any of the props' footprints", () => {
    // A forgotten 6px dot at y=210 in Trailer 1 doubles its box to 12x8.4 cells while drawing
    // nothing anyone can see. Empty canvas is free; one stray piece is not.
    expect(propVisibleArtBox(byId("cncstd1"))).toEqual({ minX: 6, minY: 60, w: 188, h: 170 });
    expect(propVisibleArtBox(byId("mdetsd1"))).toEqual({ minX: 68, minY: 36, w: 132, h: 194 });
    expect(propVisibleArtBox(byId("drnkmch1"))).toEqual({ minX: 55, minY: 40, w: 90, h: 190 });
  });

  test("the drink machine stands about as tall as Bob does", () => {
    // Blake's world scale, and the reason `size` is 6 rather than a guess: a player renders
    // PLAYER_H_CELLS cells tall over the whole 260-unit canvas and BoB's art fills 226 of it, so
    // Bob is 6.08 cells. A vending machine is a shade under head height, not a wardrobe.
    const dm = byId("drnkmch1");
    const fp = levelObjectFootprint({ kind: "prop", size: dm.size, fitArt: true }, dm);
    expect(fp.rows).toBeCloseTo(6, 6);
    expect(fp.rows).toBeGreaterThan(5);
    expect(fp.rows).toBeLessThan(7);
    expect(fp.cols).toBeLessThan(fp.rows);              // taller than it is wide, like a cabinet
  });

  test("the metal detector's beam reaches the crop edge, so a flipped pair butts into one arch", () => {
    // The whole point of shipping a SIDE rather than a whole gate: place two, flip the second,
    // and the two half-beams meet. That only works while the beam runs out to the very edge of
    // the visible art box — pull it in by a unit and the assembled arch gets a gap in the middle
    // that no amount of nudging closes, because both halves scale off their own crop.
    const det = byId("mdetsd1");
    const box = propVisibleArtBox(det);
    const right = box.minX + box.w;
    const atEdge = det.frames[0].front.filter((p) => Math.abs(p.x + p.w - right) < 0.001);
    expect(atEdge.length).toBeGreaterThan(0);
    // ...and the beam must be a drawn piece, not a hitbox/cutter that propVisibleArtBox ignores.
    expect(atEdge.some((p) => !p.isHitbox && !p.isMuzzle && !p.isCutter && p.h > 5)).toBe(true);
    // Two copies of ONE prop at one size always share a scale, so the seam is closable by design.
    const fp = levelObjectFootprint({ kind: "prop", size: det.size, fitArt: true }, det);
    expect(fp.rows).toBeCloseTo(det.size, 6);
    expect(fp.cols).toBeCloseTo(det.size * box.w / box.h, 6);
  });

  test("all three props stay inside the design canvas", () => {
    // worldArtBox measures each piece's UNROTATED box, so a piece hanging off the canvas widens
    // the footprint even though nothing is drawn out there.
    for (const id of ["cncstd1", "mdetsd1", "drnkmch1"]) {
      for (const p of byId(id).frames[0].front) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x + p.w).toBeLessThanOrEqual(200);
        expect(p.y + p.h).toBeLessThanOrEqual(260);
        if (p.mirror) expect(200 - (p.x + p.w)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("no text piece is boxed too narrow for its own words", () => {
    // A text piece is nowrap with overflow:hidden — a tight box silently CLIPS the first and last
    // letter instead of shrinking, and it reads as a typo rather than as a layout bug. Impact
    // averages well under 0.6em per uppercase glyph, so this bound is deliberately pessimistic.
    for (const id of ["cncstd1", "mdetsd1", "drnkmch1"]) {
      for (const p of byId(id).frames[0].front.filter((x) => x.kind === "text")) {
        const widest = String(p.text).length * 0.6 * (0.8 * p.h);
        expect(p.w).toBeGreaterThan(widest);
        expect(p.mirror).toBeFalsy();   // a mirrored text twin renders back-to-front
      }
    }
  });
});
