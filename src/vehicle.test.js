// VEHICLES (2026-10-31): the rules in vehicle.js, against fixtures built here — never his cars.
import {
  VEHICLE_STATES, vehicleStateOf, vehicleHalvesOf, vehicleTakeHit, VEHICLE_FUSE_FRAMES, VEHICLE_WEAK_MULT, vehicleSideFacing,
  wheelHubs, spinWheelPieces, wheelTurnDeg, spinStepOf, wheelContactFracs, hoodFirePoint, hoodFireBox, vehicleStatePieces,
  autoVehicleDamage, isGlassColor,
  vehicleStep, VEH_STEP_UP, VEH_MAX_SPEED, vehicleCrashDamage,
  carBearsDown, vehicleDodgeKind, vehicleDodgeChance,
  VEH_SEAT_FRAC, vehicleSeatsPlayer, vehiclePassengerSpots, isPassengerSpot, followerCanBoard, VEH_BOARD_MAX_SPEED, vehicleSpeedOf, vehiclePower } from "./vehicle";

const CAR = [
  { id: "body", kind: "rect", x: 20, y: 120, w: 160, h: 40, color: "#c43c3c" },
  { id: "roof", kind: "poly", x: 60, y: 95, w: 70, h: 25, color: "#c43c3c", points: [[0, 1], [0.2, 0], [0.8, 0], [1, 1]] },
  { id: "glass", kind: "poly", x: 68, y: 100, w: 25, h: 18, color: "#7aa2d6", points: [[0, 1], [0.3, 0], [1, 0], [1, 1]], driverWindow: true },
  { id: "light", kind: "circle", x: 21, y: 128, w: 6, h: 6, color: "#ffe7a0" },
  { id: "bump", kind: "rect", x: 16, y: 150, w: 14, h: 4, color: "#9aa0a6" },
  { id: "tyreF", kind: "circle", x: 40, y: 145, w: 30, h: 30, color: "#1d1b1b", wheel: true },
  { id: "hubF", kind: "circle", x: 48, y: 153, w: 14, h: 14, color: "#c9cdd2", wheel: true },
  { id: "lugF", kind: "circle", x: 53, y: 154, w: 3, h: 3, color: "#1d1b1b", wheel: true },
  { id: "tyreR", kind: "circle", x: 130, y: 145, w: 30, h: 30, color: "#1d1b1b", wheel: true },
  { id: "hubR", kind: "circle", x: 138, y: 153, w: 14, h: 14, color: "#c9cdd2", wheel: true },
];
const boxOf = (ps) => {
  const d = ps.filter((p) => !p.isCutter && !p.isHoodFire);
  const x0 = Math.min(...d.map((p) => p.x)), y0 = Math.min(...d.map((p) => p.y));
  const x1 = Math.max(...d.map((p) => p.x + p.w)), y1 = Math.max(...d.map((p) => p.y + p.h));
  return { minX: x0, minY: y0, w: x1 - x0, h: y1 - y0 };
};

describe("vehicle states and damage", () => {
  const car = { hp: 100, maxHp: 100, fuse: 0, dent: null, dead: false };
  test("the five looks, in the order the editor shows them", () => {
    expect(VEHICLE_STATES).toEqual(["front", "frontDamage", "rearDamage", "burning", "destroyed"]);
    expect(vehicleStateOf(car)).toBe("front");
    expect(vehicleStateOf({ ...car, dent: "front" })).toBe("frontDamage");
    expect(vehicleStateOf({ ...car, dent: "rear" })).toBe("rearDamage");
    expect(vehicleStateOf({ ...car, dent: "rear", fuse: 10 })).toBe("burning");
    expect(vehicleStateOf({ ...car, fuse: 10, dead: true })).toBe("destroyed");
  });
  test("fire lands four times over, a blast twelve; a crash dents the end that hit", () => {
    expect(vehicleTakeHit(car, 5, "fire").hp).toBe(100 - 5 * VEHICLE_WEAK_MULT);
    expect(vehicleTakeHit(car, 5, "blast").hp).toBe(40);
    expect(vehicleTakeHit(car, 5, "hit").hp).toBe(95);
    expect(vehicleTakeHit(car, 5, "hit", "rear").dent).toBeFalsy();
    expect(vehicleTakeHit(car, 5, "hit", "rear", true).dent).toBe("rear");
    expect(vehicleTakeHit(car, 45, "hit", "rear").dent).toBe("rear");
    expect(vehicleTakeHit({ ...car, dent: "rear" }, 5, "hit", "front", true).dent).toBe("both");
    expect(vehicleTakeHit({ ...car, dent: "rear" }, 5, "hit", "rear", true).dent).toBe("rear");
    expect(vehicleTakeHit({ ...car, dent: "both" }, 5, "hit", "front", true).dent).toBe("both");
  });
  test("both ends at once: the nose's half from Front damage, the tail's from Rear damage (Blake 2026-11-01)", () => {
    expect(vehicleHalvesOf(car)).toEqual({ front: "front", rear: "front" });
    expect(vehicleHalvesOf({ ...car, dent: "front" })).toEqual({ front: "frontDamage", rear: "front" });
    expect(vehicleHalvesOf({ ...car, dent: "rear" })).toEqual({ front: "front", rear: "rearDamage" });
    expect(vehicleHalvesOf({ ...car, dent: "both" })).toEqual({ front: "frontDamage", rear: "rearDamage" });
    expect(vehicleHalvesOf({ ...car, dent: "both", fuse: 10 })).toEqual({ front: "burning", rear: "burning" });
    expect(vehicleHalvesOf({ ...car, dead: true })).toEqual({ front: "destroyed", rear: "destroyed" });
    expect(vehicleStateOf({ ...car, dent: "both" })).toBe("frontDamage");
  });
  test("a quarter of its HP lights the five-second fuse, once", () => {
    const hot = vehicleTakeHit(car, 76, "hit");
    expect(hot.fuse).toBe(VEHICLE_FUSE_FRAMES);
    expect(vehicleTakeHit({ ...hot, fuse: 40 }, 10, "hit").fuse).toBe(40);
    expect(vehicleTakeHit(car, 74, "hit").fuse).toBe(0);
  });
  test("which end a hit came from follows the way the car faces", () => {
    expect(vehicleSideFacing(-1, 100, 20)).toBe("front");
    expect(vehicleSideFacing(-1, 100, 180)).toBe("rear");
    expect(vehicleSideFacing(1, 100, 180)).toBe("front");
  });
});

describe("wheels", () => {
  test("a hubcap and its lug nut turn about the tyre they sit in", () => {
    const hubs = wheelHubs(CAR);
    expect(hubs.get(5)).toEqual({ x: 55, y: 160, r: 15 });
    expect(hubs.get(7)).toEqual(hubs.get(5));
    expect(hubs.get(9)).toEqual({ x: 145, y: 160, r: 15 });
    expect(hubs.has(0)).toBe(false);
  });
  test("spinning moves the lug round and leaves the body alone", () => {
    const spun = spinWheelPieces(CAR, 90);
    expect(spun[0]).toBe(CAR[0]);
    const lug = spun[7];
    // lug middle (54.5,155.5) is 0.5 left and 4.5 up of the hub: a quarter turn clockwise puts it 4.5 right, 0.5 up
    expect(lug.x + lug.w / 2).toBeCloseTo(59.5, 5);
    expect(lug.y + lug.h / 2).toBeCloseTo(159.5, 5);
    expect(lug.rot).toBe(90);
    expect(spinWheelPieces(CAR, 360)).toBe(CAR);
  });
  test("roll distance turns the wheel by arc length; drawn spin snaps to 15°", () => {
    expect(wheelTurnDeg(Math.PI * 10, 10)).toBeCloseTo(180, 5);
    expect(spinStepOf(22)).toBe(15);
    expect(spinStepOf(-8)).toBe(345);
    expect(spinStepOf(359)).toBe(0);
  });
  test("contact points sit under the outermost hubs", () => {
    const box = boxOf(CAR);
    const w = wheelContactFracs(CAR, box);
    expect(w.l).toBeCloseTo((55 - box.minX) / box.w, 5);
    expect(w.r).toBeCloseTo((145 - box.minX) / box.w, 5);
    expect(wheelContactFracs([], box).l).toBeCloseTo(1 / 6, 5);
  });
});

describe("damage art from Stock", () => {
  const ids = (() => { let n = 0; return () => "n" + n++; })();
  const reachable = (ps) => {
    for (const p of ps) {
      expect(p.w).toBeGreaterThan(0.04); expect(p.h).toBeGreaterThan(0.04);
      if (p.rot) expect(Math.abs(p.rot * 10 - Math.round(p.rot * 10))).toBeLessThan(1e-9);
      if (p.kind === "poly") {
        const us = p.points.map((q) => q[0]), vs = p.points.map((q) => q[1]);
        expect(Math.min(...us)).toBeLessThan(1e-3); expect(Math.max(...us)).toBeGreaterThan(1 - 1e-3);
        expect(Math.min(...vs)).toBeLessThan(1e-3); expect(Math.max(...vs)).toBeGreaterThan(1 - 1e-3);
      }
    }
  };
  test("front damage pushes in the end the car faces, in his clean shapes, and leaves the rear alone", () => {
    const fd = autoVehicleDamage(CAR, "frontDamage", false, ids);
    reachable(fd);
    const body = fd.find((p) => p.color === "#c43c3c" && p.y >= 119 && p.w > 100);
    expect(body.kind).toBe("rect");                // a rect stays a rect: no zig-zag
    expect(body.x).toBeCloseTo(16 + 164 * 0.05 + (20 - 16) / 2, 5); // the nose pushed in one crush-width
    expect(body.x + body.w).toBeCloseTo(180, 5);   // the tail where it was
    const roof = fd.find((p) => p.color === "#c43c3c" && p.y < 100);
    expect(roof.x).toBe(60);                       // nothing further back than the crush moves (his cab)
    const lamp = fd.find((p) => p.color === "#daa520");
    expect(lamp.fx.bright).toBe(0.55);             // his broken headlight: dimmed,
    expect(lamp.h).toBeGreaterThan(lamp.w);        // squashed tall,
    expect(fd[fd.length - 1].kind).toBe("tri");    // with a dark wedge of crack drawn over everything
    expect(fd.find((p) => p.color === "#9aa0a6").rot).toBe(346); // the bumper hanging
    expect(fd[0].kind).toBe("curlytri");           // the hood buckled, behind everything
    expect(fd.filter((p) => (p.rot === 30)).length).toBe(1); // and its lid sprung
    expect(fd.find((p) => p.id && isGlassColor(p.color)).kind).toBe("poly");
    expect(fd.filter((p) => p.color === "#1d1b1b" && !p.wheel).length).toBe(0); // no crease lines, no cracks across the glass
    expect(fd.filter((p) => p.wheel).length).toBe(CAR.filter((p) => p.wheel).length);
    expect(new Set(fd.map((p) => p.id)).size).toBe(fd.length);
    expect(fd.some((p) => CAR.some((q) => q.id === p.id))).toBe(false); // new ids: copying a state never aliases Stock's pieces
  });
  test("rear damage is the other end; burning is both, with the fire marker", () => {
    const rd = autoVehicleDamage(CAR, "rearDamage", false, ids);
    reachable(rd);
    const body = rd.find((p) => p.color === "#c43c3c" && p.y >= 119 && p.w > 100);
    expect(body.x).toBeCloseTo(20, 5);
    expect(body.x + body.w).toBeLessThan(180);
    const burning = autoVehicleDamage(CAR, "burning", false, ids);
    reachable(burning);
    const fire = hoodFirePoint(burning);
    expect(fire).toBeTruthy();
    expect(fire.x).toBeLessThan(100); // over the front half
  });
  test("the hood fire stands on the hood, not the roof, and is not most of the car tall", () => {
    const fb = hoodFireBox(autoVehicleDamage(CAR, "burning", false, ids));
    expect(fb.x).toBeGreaterThan(20); expect(fb.x).toBeLessThan(60); // between the nose and the windscreen
    expect(fb.bottom).toBeGreaterThan(120); expect(fb.bottom).toBeLessThan(126); // sunk a little into the hood top (y 120)
    expect(fb.h).toBeLessThanOrEqual(80 * 0.25 + 1e-9);
  });
  test("Imminent explosion starts from the Front damage he drew", () => {
    const his = [...CAR.slice(0, 3), { id: "dent", kind: "rect", x: 24, y: 118, w: 10, h: 4, color: "#123456" }, ...CAR.slice(4)];
    const b = autoVehicleDamage(CAR, "burning", false, ids, { frontDamage: his });
    expect(b.some((p) => p.color === "#123456")).toBe(true);
    expect(b.some((p) => p.color === "#ffe7a0")).toBe(false); // his look has no headlight, so neither does this
    expect(b.filter((p) => p.isHoodFire).length).toBe(1);
  });
  test("destroyed is charred and sits on flat tyres; no state outgrows Stock", () => {
    const d = autoVehicleDamage(CAR, "destroyed", false, ids);
    reachable(d);
    expect(d.filter((p) => !p.isCutter && p.color === "#c43c3c").length).toBe(0);
    expect(d.filter((p) => isGlassColor(p.color)).length).toBe(0);
    const stockBox = boxOf(CAR);
    for (const k of ["frontDamage", "rearDamage", "burning", "destroyed"]) {
      const b = boxOf(autoVehicleDamage(CAR, k, false, ids));
      expect(b.minX).toBeGreaterThanOrEqual(stockBox.minX - 3);
      expect(b.minX + b.w).toBeLessThanOrEqual(stockBox.minX + stockBox.w + 3);
      expect(b.minY + b.h).toBeLessThanOrEqual(stockBox.minY + stockBox.h + 0.01);
    }
  });
  test("a state with nothing drawn shows Stock, and markers never draw", () => {
    const asset = { frames: [{ front: CAR, frontDamage: [], burning: autoVehicleDamage(CAR, "burning", false, ids) }] };
    expect(vehicleStatePieces(asset, "frontDamage")).toEqual(CAR);
    expect(vehicleStatePieces(asset, "burning").some((p) => p.isHoodFire)).toBe(false);
  });
  test("glass is blue that is clearly bluer than it is green: his turquoise paint is not a window", () => {
    expect(isGlassColor("#7aa2d6")).toBe(true);
    expect(isGlassColor("#40e0d0")).toBe(false);
    expect(isGlassColor("#c43c3c")).toBe(false);
  });
});

// A strip of ground for the car to drive on: `surf(x)` is { y, slope } or null (a pit).
const worldOf = (surf, edge = 4000) => ({
  floorAt: (x, fromY, upSlope, upStep, down) => {
    const s = x < 0 || x >= edge ? null : surf(x);
    if (!s) return { y: null, steep: false };
    const up = s.slope ? upSlope : upStep;
    if (s.y >= fromY - up - 1e-6 && s.y <= fromY + down) return { y: s.y, steep: false };
    return { y: null, steep: s.slope && s.y < fromY - up };
  },
  wallAt: (x, fromY, upStep) => {
    if (x < 0 || x >= edge) return true;
    const s = surf(x);
    return !!s && !s.slope && s.y < fromY - upStep;
  },
});
const newCar = (x, groundY, face = 1) => ({ x, y: groundY - 60, w: 200, h: 60, vx: 0, vy: 0, face, onGround: true, yL: groundY, yR: groundY, wl: 0.15, wr: 0.85, tilt: 0, stopT: 0, turnT: 0 });
const drive = (v, world, frames, ctl = { gas: true }) => { const evs = []; for (let i = 0; i < frames; i++) evs.push(vehicleStep(v, ctl, world)); return evs; };

describe("driving", () => {
  const flat = worldOf(() => ({ y: 600, slope: false }), 1e9);
  test("on the flat it tops out a quarter past the fastest walker, in a few seconds", () => {
    const v = newCar(100, 600);
    drive(v, flat, 180);
    expect(v.vx).toBeGreaterThan(11.6);  // Speed 10 walks 11.55
    expect(v.vx).toBeLessThan(13.5);
    drive(v, flat, 600);
    expect(v.vx).toBeGreaterThan(13.8);
    expect(v.vx).toBeLessThan(15.5);
    expect(v.y).toBe(540);
  });
  test("off the pedal it coasts down, and holding the other way stops it and turns it round", () => {
    const v = newCar(100, 600);
    drive(v, flat, 300);
    drive(v, flat, 60, {});
    expect(v.vx).toBeGreaterThan(5);
    // Holding Left: the brake while it faces right, the gas once it has turned round.
    const evs = [];
    for (let i = 0; i < 70; i++) evs.push(vehicleStep(v, { gas: v.face < 0, brake: v.face > 0 }, flat));
    expect(evs.filter((e) => e.turned).length).toBe(1);
    expect(v.face).toBe(-1);
    expect(v.wl).toBeCloseTo(0.15, 5);
    expect(v.vx).toBeLessThan(0); // and away it goes, the other way
  });
  test("a hill slows it going up and speeds it coming down", () => {
    // flat to x=1000, then a 45° hill up (y falls 1 px per px) to x=1600, then flat on top
    const hillY = (x) => (x < 1000 ? 600 : x < 2600 ? 600 - (x - 1000) : -1000);
    const hill = worldOf((x) => ({ y: hillY(x), slope: x >= 1000 && x < 2600 }), 1e9);
    const up = newCar(100, 600);
    drive(up, hill, 240);
    const flatSpeed = newCar(100, 600); drive(flatSpeed, flat, 240);
    let peak = 0, low = Infinity;
    for (let i = 0; i < 900 && up.x < 2200; i++) { vehicleStep(up, { gas: true }, hill); if (up.x > 1000) { low = Math.min(low, Math.abs(up.vx)); } peak = Math.max(peak, Math.abs(up.vx)); }
    expect(low).toBeLessThan(flatSpeed.vx * 0.6);
    expect(up.tilt).toBeLessThan(-30); // nose up, right end high
    // ...and down the other way, off the pedal, it runs past its flat top speed
    const down = newCar(1400, hillY(1400), -1);
    down.yL = hillY(1400 + 0.15 * 200); down.yR = hillY(1400 + 0.85 * 200);
    let top = 0;
    for (let i = 0; i < 300 && down.x > 1010; i++) { vehicleStep(down, {}, hill); top = Math.max(top, Math.abs(down.vx)); }
    expect(top).toBeGreaterThan(8);
    expect(top).toBeLessThanOrEqual(VEH_MAX_SPEED);
  });
  test("a kerb is climbed, a block is a wall: it stops dead and the crash is reported", () => {
    const kerb = worldOf((x) => ({ y: x < 700 ? 600 : 600 - (VEH_STEP_UP - 2), slope: false }), 1e9);
    const a = newCar(100, 600); drive(a, kerb, 200);
    expect(a.x).toBeGreaterThan(800);
    const wall = worldOf((x) => ({ y: x < 700 ? 600 : 570, slope: false }), 1e9);
    const b = newCar(100, 600);
    const evs = drive(b, wall, 200);
    const crash = evs.find((e) => e.crash);
    expect(crash).toBeTruthy();
    expect(crash.crash.end).toBe("front");
    expect(b.x + b.w).toBeLessThanOrEqual(700);
    expect(vehicleCrashDamage(crash.crash.speed)).toBeGreaterThan(0);
    expect(vehicleCrashDamage(3)).toBe(0);
  });
  test("the level's edge is a wall too", () => {
    const w = worldOf(() => ({ y: 600, slope: false }), 900);
    const v = newCar(100, 600); drive(v, w, 300);
    expect(v.x + v.w).toBeLessThanOrEqual(900);
  });
  test("over a cliff it falls, and nothing steers it in the air", () => {
    const cliff = worldOf((x) => ({ y: x < 2400 ? 600 : 900, slope: false }), 1e9);
    const v = newCar(100, 600);
    let air = 0, vxAtTakeoff = null;
    for (let i = 0; i < 600; i++) {
      // the pedal down to the edge, then both pedals mashed in the air: neither does anything there
      vehicleStep(v, !air ? { gas: true } : i % 2 ? { gas: true } : { brake: true }, cliff);
      if (!v.onGround) { air++; if (vxAtTakeoff == null) vxAtTakeoff = v.vx; else expect(v.vx).toBeCloseTo(vxAtTakeoff, 5); }
      if (air && v.onGround) break;
    }
    expect(air).toBeGreaterThan(5);
    expect(v.onGround).toBe(true);
    expect(v.y).toBeCloseTo(840, 0);
  });
  // Blake 2026-11-01: "I went over a ramp ... my vehichle merged into the ground".
  const withGround = (surf, edge) => ({ ...worldOf(surf, edge), groundTop: (x, y) => { const s = surf(x); return s && !s.slope && y - 0.5 > s.y ? s.y : null; } });
  const buried = (v, surf) => [[v.x + v.wl * v.w, v.yL], [v.x + v.wr * v.w, v.yR]].some(([x, y]) => { const s = surf(x); return !!s && y > s.y + 0.5; });
  test("a wheel that hangs into a gap climbs out of it, and never ends a frame inside the ground", () => {
    const surf = (x) => (x >= 700 && x < 820 ? null : { y: 600, slope: false });
    const w = withGround(surf, 1e9);
    const v = newCar(400, 600);
    for (let i = 0; i < 400; i++) { vehicleStep(v, { gas: true }, w); expect(buried(v, surf)).toBe(false); }
    expect(v.x).toBeGreaterThan(820);
    expect(v.tilt).toBeCloseTo(0, 5);
    // ...and crawling over it, the front wheel dips in and climbs the far lip too
    const slow = newCar(400, 600);
    for (let i = 0; i < 900; i++) { vehicleStep(slow, { gas: i % 3 === 0 }, w); expect(buried(slow, surf)).toBe(false); }
    expect(slow.x).toBeGreaterThan(820);
  });
  test("hanging off a ledge at its steepest, the wheel still on the ledge stays on top of it", () => {
    const surf = (x) => ({ y: x < 2400 ? 600 : 900, slope: false });
    const w = withGround(surf, 1e9);
    const v = newCar(2215, 600);
    let held = 0;
    for (let i = 0; i < 400 && !(v.onGround && v.yL > 850); i++) {
      vehicleStep(v, { gas: i < 6 }, w);
      if (v.onGround && v.x + v.wl * v.w < 2400) { expect(v.yL).toBeLessThanOrEqual(600.5); if (Math.abs(v.tilt) >= 49.9) held++; }
      expect(buried(v, surf)).toBe(false);
    }
    expect(held).toBeGreaterThan(0);
  });
  test("nose down off the foot of a ramp, the flat ahead is not a wall", () => {
    const surf = (x) => (x < 1000 ? { y: 300, slope: false } : x < 1300 ? { y: 300 + (x - 1000), slope: true } : { y: 600, slope: false });
    const v = newCar(700, 300);
    const evs = drive(v, withGround(surf, 1e9), 300);
    expect(evs.some((e) => e.crash)).toBe(false);
    expect(v.x).toBeGreaterThan(1600);
  });
});

describe("units and the car", () => {
  const car = { x: 100, y: 540, w: 200, h: 60, vx: 12 };
  const unit = (x, w = 30) => ({ x, y: 400, w, h: 200 });
  test("a unit ahead of the bumper, looking at the car, sees it coming", () => {
    expect(carBearsDown(car, unit(420), -1)).toBe(true);
    expect(carBearsDown(car, unit(420), 1)).toBe(false);          // its back to the road: it never sees it
    expect(carBearsDown(car, unit(20), 1)).toBe(false);           // behind the car
    expect(carBearsDown({ ...car, vx: 2 }, unit(420), -1)).toBe(false); // crawling: something to hit, not to dive from
    expect(carBearsDown(car, unit(2000), -1)).toBe(false);        // too far yet
    expect(carBearsDown(car, { x: 420, y: 100, w: 30, h: 100 }, -1)).toBe(false); // up on a ledge
  });
  test("a dodge is one it can do", () => {
    expect(vehicleDodgeKind({ onGround: false, hasBack: false }, 0.99)).toBe("bg");
    expect(vehicleDodgeKind({ onGround: true, hasBack: true }, 0)).toBe("jump");
    expect(vehicleDodgeKind({ onGround: true, hasBack: true }, 0.99)).toBe("fg");
    expect(vehicleDodgeChance(10)).toBeGreaterThan(vehicleDodgeChance(1));
    expect(vehicleDodgeChance(100)).toBeLessThan(1);
  });
});

describe("who fits in a car", () => {
  test("a car as tall as you sitting down seats you; a toy on a shelf does not", () => {
    const you = 210; // PLAYER_H_CELLS cells of LV_CELL px
    expect(vehicleSeatsPlayer(you * VEH_SEAT_FRAC, you)).toBe(true);
    expect(vehicleSeatsPlayer(154, you)).toBe(true);  // his Mustang at 16
    expect(vehicleSeatsPlayer(80, you)).toBe(false);  // his Tractor at 4 (M13)
    expect(vehicleSeatsPlayer(13, you)).toBe(false);  // his Beetle at 1 (M5)
  });
});

// "passenger seats so your human NPC followers can try to get in vehichles with you" (Blake, 2026-11-01).
describe("passenger places", () => {
  const jeep = [
    { id: "body", kind: "rect", x: 20, y: 120, w: 160, h: 40, color: "#556b2f" },
    { id: "bed", kind: "rect", x: 25, y: 110, w: 50, h: 10, color: "#556b2f", passengerSeat: true },
    { id: "pwin", kind: "rect", x: 100, y: 90, w: 20, h: 20, color: "#5a8fd8", passengerWindow: true },
    { id: "dwin", kind: "rect", x: 120, y: 90, w: 20, h: 20, color: "#5a8fd8", driverWindow: true },
  ];
  test("the one nearest the driver is taken first, then the bed", () => {
    expect(vehiclePassengerSpots(jeep).map((p) => p.id)).toEqual(["pwin", "bed"]);
    expect(vehiclePassengerSpots([...jeep].reverse()).map((p) => p.id)).toEqual(["pwin", "bed"]);
  });
  test("a car with none flagged has no passengers; a window drawn as a cutter still is one", () => {
    expect(vehiclePassengerSpots(CAR)).toEqual([]);
    expect(isPassengerSpot({ passengerWindow: true, isCutter: true })).toBe(true);
  });
  test("a follower gets in beside a stopped car, never a moving one", () => {
    const car = { x: 100, y: 200, w: 300, h: 120, vx: 0 };
    expect(followerCanBoard(car, 150, 320)).toBe(true);
    expect(followerCanBoard(car, 90, 320)).toBe(false);                       // not beside it yet
    expect(followerCanBoard(car, 150, 200)).toBe(false);                      // up on its roof, not at its door
    expect(followerCanBoard({ ...car, vx: VEH_BOARD_MAX_SPEED + 1 }, 150, 320)).toBe(false);
  });
});

describe("engine power and speed scaling", () => {
  test("vehicleSpeedOf clamps between 0.5 and 1.5, default 1", () => {
    expect(vehicleSpeedOf({})).toBe(1);
    expect(vehicleSpeedOf({ speed: 1.25 })).toBe(1.25);
    expect(vehicleSpeedOf({ speed: 0.1 })).toBe(0.5);
    expect(vehicleSpeedOf({ speed: 2.5 })).toBe(1.5);
    expect(vehiclePower({ power: 1.25 })).toBe(1.25);
    expect(vehiclePower({})).toBe(1);
  });
  test("a car with higher power accelerates faster and reaches higher top speed", () => {
    const flat = worldOf(() => ({ y: 600, slope: false }), 1e9);
    const standard = newCar(100, 600);
    const muscle = { ...newCar(100, 600), power: 1.25 };
    drive(standard, flat, 120);
    drive(muscle, flat, 120);
    expect(muscle.vx).toBeGreaterThan(standard.vx);
    expect(muscle.x).toBeGreaterThan(standard.x);
  });
});
