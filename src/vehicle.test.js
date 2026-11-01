// VEHICLES (2026-10-31): the rules in vehicle.js, against fixtures built here — never his cars.
import {
  VEHICLE_STATES, vehicleStateOf, vehicleTakeHit, VEHICLE_FUSE_FRAMES, VEHICLE_WEAK_MULT, vehicleSideFacing,
  wheelHubs, spinWheelPieces, wheelTurnDeg, spinStepOf, wheelContactFracs, hoodFirePoint, vehicleStatePieces,
  autoVehicleDamage, isGlassColor,
  vehicleStep, VEH_STEP_UP, VEH_MAX_SPEED, vehicleCrashDamage,
  carBearsDown, vehicleDodgeKind, vehicleDodgeChance,
} from "./vehicle";

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
  test("fire and blasts land four times over; a crash dents the end that hit", () => {
    expect(vehicleTakeHit(car, 5, "fire").hp).toBe(100 - 5 * VEHICLE_WEAK_MULT);
    expect(vehicleTakeHit(car, 5, "blast").hp).toBe(80);
    expect(vehicleTakeHit(car, 5, "hit").hp).toBe(95);
    expect(vehicleTakeHit(car, 5, "hit", "rear").dent).toBeFalsy();
    expect(vehicleTakeHit(car, 5, "hit", "rear", true).dent).toBe("rear");
    expect(vehicleTakeHit(car, 45, "hit", "rear").dent).toBe("rear");
    expect(vehicleTakeHit({ ...car, dent: "rear" }, 5, "hit", "front", true).dent).toBe("front");
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
  test("front damage crumples the end the car faces and leaves the rear alone", () => {
    const fd = autoVehicleDamage(CAR, "frontDamage", false, ids);
    reachable(fd);
    const body = fd.find((p) => p.color === "#c43c3c" && p.y >= 119 && p.w > 100);
    expect(body.kind).toBe("poly");
    expect(body.x).toBeGreaterThan(20);            // the nose pushed in
    expect(body.x + body.w).toBeCloseTo(180, 5);   // the tail where it was
    expect(fd.find((p) => p.color === "#3b3735")).toBeTruthy(); // the headlight out
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
