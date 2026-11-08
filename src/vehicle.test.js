// VEHICLES (2026-10-31): the rules in vehicle.js, against fixtures built here — never his cars.
import {
  VEHICLE_STATES, vehicleStateOf, vehicleHalvesOf, vehicleTakeHit, VEHICLE_FUSE_FRAMES, VEHICLE_WEAK_MULT, vehicleSideFacing,
  wheelHubs, spinWheelPieces, wheelTurnDeg, spinStepOf, wheelContactFracs, hoodFirePoint, hoodFireBox, vehicleStatePieces,
  autoVehicleDamage, isGlassColor, VEH_MAX_TILT,
  vehicleStep, VEH_STEP_UP, VEH_MAX_SPEED, VEH_BODY_SLACK, vehicleCrashDamage, vehicleClearanceOf,
  carBearsDown, vehicleDodgeKind, vehicleDodgeChance,
  VEH_SEAT_FRAC, vehicleSeatsPlayer, vehicleDrivable, vehiclePassengerOffsets, VEH_PASSENGER_SEATS, followerCanBoard, VEH_BOARD_MAX_SPEED, vehicleSpeedOf, vehiclePower, vehicleHalveHpOnce, VEHICLE_DEFAULT_HP } from "./vehicle";

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
  test("over a cliff it falls nose first, nothing steers it in the air, and it rocks down onto both wheels", () => {
    const cliff = worldOf((x) => ({ y: x < 2400 ? 600 : 900, slope: false }), 1e9);
    const v = newCar(100, 600);
    let air = 0, vxAtTakeoff = null;
    for (let i = 0; i < 600; i++) {
      // the pedal down to the edge, then both pedals mashed in the air: neither does anything there
      vehicleStep(v, !air ? { gas: true } : i % 2 ? { gas: true } : { brake: true }, cliff);
      if (!v.onGround) { air++; if (vxAtTakeoff == null) vxAtTakeoff = v.vx; else expect(v.vx).toBeCloseTo(vxAtTakeoff, 5); }
      if (air && v.onGround && !v.hang) break;
    }
    expect(air).toBeGreaterThan(5);
    expect(v.onGround).toBe(true);
    expect(v.yL).toBeCloseTo(900, 5); expect(v.yR).toBeCloseTo(900, 5);
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
  // 2026-11-07: the car is a body, not a stick between two wheels. Its front wheel rolled just off a
  // ledge, it rests on its underside on the edge (it used to swing down to its steepest pitch about
  // the back wheel, the body through the ledge's corner); driven on, it tips over and goes down.
  test("a front wheel just off a ledge: the car rests on its underside on the edge, and driven on it tips over", () => {
    const surf = (x) => ({ y: x < 2400 ? 600 : 900, slope: false });
    const w = withGround(surf, 1e9);
    const v = newCar(2215, 600); // no `clear`: its underside is a kerb (VEH_STEP_UP) above its wheels
    const underAtEdge = () => v.yL + ((v.yR - v.yL) * (2400 - (v.x + v.wl * v.w))) / ((v.wr - v.wl) * v.w) - VEH_STEP_UP;
    for (let i = 0; i < 120; i++) {
      vehicleStep(v, { gas: i < 6 }, w);
      expect(v.yL).toBeLessThanOrEqual(600.5);
      expect(buried(v, surf)).toBe(false);
      if (v.x + v.wr * v.w > 2400) expect(underAtEdge()).toBeLessThanOrEqual(600 + VEH_BODY_SLACK + 0.5);
    }
    expect(v.hang).toBe("R");
    expect(v.yR).toBeGreaterThan(605);
    for (let i = 0; i < 600 && !(v.onGround && v.yL > 850); i++) {
      vehicleStep(v, { gas: true }, w);
      if (v.onGround && v.x + v.wl * v.w < 2400) expect(v.yL).toBeLessThanOrEqual(600.5);
      expect(buried(v, surf)).toBe(false);
    }
    expect(v.yL).toBeGreaterThan(850);
  });
  // Blake 2026-11-02: "vehichles can clip through the sewer level" — a car crept over Trailor Park
  // M5's manhole put its nose down the shaft and its body through the street into the sewer.
  // The underside at x: the wheels' line, `clear` up (a kerb when the car has none).
  const underAt = (v, x) => v.yL + ((v.yR - v.yL) * (x - (v.x + v.wl * v.w))) / ((v.wr - v.wl) * v.w) - (v.clear > 0 ? v.clear : VEH_STEP_UP);
  const hangEndY = (v) => { const t = (v.tilt * Math.PI) / 180, lead = v.hang === "R"; const wx = v.x + (lead ? v.wr : v.wl) * v.w, bx = lead ? v.x + v.w : v.x; return (lead ? v.yR : v.yL) + (bx - wx) * Math.tan(t); };
  // 2026-11-07, Blake: "when you go over the manhole the vehichle becomes magic, becomes flat and stops
  // following the laws of physics". 3c15320 rolled a car across a hole shorter than it on a made-up
  // floor, dead level. A hole is a hole: a wheel over it dips in, the body rests on the lips (never
  // through them), and the wheel rolls up out over the far side.
  test("a hole shorter than the car: the wheels dip into it, the body rests on its lips, and it drives on out", () => {
    const surf = (x) => (x >= 700 && x < 850 ? null : { y: 600, slope: false }); // a 150 px manhole, nothing under it
    const w = withGround(surf, 1e9);
    for (const plan of [(i) => i % 3 === 0, () => true]) {
      const v = { ...newCar(400, 600), clear: 20, wheelR: 15 };
      let dip = 0;
      for (let i = 0; i < 900 && v.x < 1000; i++) {
        const ev = vehicleStep(v, { gas: plan(i) }, w);
        expect(ev.crash).toBeFalsy();
        expect(buried(v, surf)).toBe(false);
        dip = Math.max(dip, v.yL - 600, v.yR - 600);
        // the near lip it rests on; the far one its nose rides up at a 60° approach (a chamfer up to the
        // wall height), never deeper into it
        if (700 > v.x && 700 < v.x + v.w) expect(underAt(v, 700)).toBeLessThanOrEqual(600 + VEH_STEP_UP);
        if (850 > v.x && 850 < v.x + v.w) expect(underAt(v, 850) - 600).toBeLessThanOrEqual(Math.max(VEH_STEP_UP, v.h * 0.55 - 1.732 * (v.x + v.w - 850)) + 0.5);
      }
      expect(v.x).toBeGreaterThan(900);
      expect(dip).toBeGreaterThan(5);
    }
  });
  test("a pit narrower than the car against a wall: the nose dips in, and it meets the wall", () => {
    const surf = (x) => (x < 700 ? { y: 600, slope: false } : x < 850 ? null : { y: 300, slope: false });
    const v = newCar(400, 600);
    let dipped = false;
    const evs = []; for (let i = 0; i < 600; i++) { evs.push(vehicleStep(v, { gas: true }, withGround(surf, 1e9))); expect(buried(v, surf)).toBe(false); if (700 > v.x && 700 < v.x + v.w) expect(underAt(v, 700)).toBeLessThanOrEqual(600 + VEH_STEP_UP); if (v.yR > 601) dipped = true; }
    expect(dipped).toBe(true);
    expect(evs.some((e) => e.crash)).toBe(true);
    expect(v.x + v.w).toBeLessThanOrEqual(851);
  });
  test("a hole the car fits into it still drops into", () => {
    const surf = (x) => (x >= 700 && x < 1000 ? { y: 900, slope: false } : { y: 600, slope: false });
    const v = newCar(400, 600);
    let low = 0; for (let i = 0; i < 400; i++) { vehicleStep(v, { gas: i < 40 }, withGround(surf, 1e9)); low = Math.max(low, Math.min(v.yL, v.yR)); }
    expect(low).toBeGreaterThan(890);
  });
  test("tipping off a step, the nose rests on the ground below instead of going into it", () => {
    const surf = (x) => ({ y: x < 2400 ? 600 : 690, slope: false });
    const v = newCar(2215, 600);
    let hung = 0;
    for (let i = 0; i < 400; i++) {
      vehicleStep(v, { gas: i % 4 === 0 }, withGround(surf, 1e9));
      if (v.hang === "R") { hung++; expect(hangEndY(v)).toBeLessThanOrEqual(690 + VEH_STEP_UP + 0.5); }
    }
    expect(hung).toBeGreaterThan(0);
    expect(v.yL).toBeCloseTo(690, 0);
  });
  // Blake 2026-11-06: "No matter how fast I go over the manholes ... I do not get air time". The
  // manhole sits at the top of a ramp: fast, the car flies it (as before 3c15320); creeping, it is held.
  test("fast up a ramp onto a manhole the car takes off; creeping up it, nothing goes into the ground", () => {
    for (const top of [0, 30, 60]) {
      const a = 2000, b = a + top, c = b + 150, d = c + top;
      const surf = (x) => (x < 1600 ? { y: 600, slope: false } : x < a ? { y: 600 - (x - 1600) / 2, slope: true } : x < b ? { y: 400, slope: false } : x < c ? null : x < d ? { y: 400, slope: false } : x < d + 400 ? { y: 400 + (x - d) / 2, slope: true } : { y: 600, slope: false });
      const w = withGround(surf, 1e9);
      const fast = newCar(100, 600); let air = 0, high = 600;
      for (let i = 0; i < 700 && fast.x < 3200; i++) { vehicleStep(fast, { gas: true }, w); if (!fast.onGround) air++; high = Math.min(high, fast.yL, fast.yR); }
      expect(air).toBeGreaterThan(10);
      expect(high).toBeLessThan(380);
      const slow = newCar(1300, 600);
      for (let i = 0; i < 3000 && slow.x < 2600; i++) { vehicleStep(slow, { gas: i % 3 === 0 }, w); expect(buried(slow, surf)).toBe(false); if (slow.x + slow.w * slow.wr > b && slow.x + slow.w * slow.wl < c) expect(Math.max(slow.yL, slow.yR)).toBeLessThanOrEqual(400.5); }
    }
  });
  // Blake 2026-11-07: "I still dislike how the car auto flattens out as soon as it gets air ... You added some
  // stupid arcady bunny hop mechanism", "Get rid of that arcadey bullshit".
  test("no launch: off a ramp the car rises only as fast as the ramp threw it, the back wheel on the flat never leaves it, and in the air it keeps pitching as it left", () => {
    // a 150 px ramp up 60 px (a 0.4 slope), and past its top the ground 200 px down
    const surf = (x) => (x < 1200 ? { y: 1050, slope: false } : x < 1350 ? { y: 1050 - ((x - 1200) / 150) * 60, slope: true } : { y: 1250, slope: false });
    const w = withGround(surf, 1e9);
    const v = { x: 300, y: 1050 - 154, w: 445, h: 154, vx: 0, vy: 0, face: 1, onGround: true, yL: 1050, yR: 1050, wl: 0.19, wr: 0.82, tilt: 0, stopT: 0, turnT: 0, clear: 40, wheelR: 30 };
    let prevGap = null, prevRate = null, flew = 0, tookOff = 0;
    for (let i = 0; i < 600 && v.x < 3200; i++) {
      const was = v.onGround, sp = Math.abs(v.vx);
      vehicleStep(v, { gas: true }, w);
      if (v.x + v.wl * v.w < 1195) expect(v.yL).toBeCloseTo(1050, 5); // the back wheel on the street stays on it
      if (was && !v.onGround) { tookOff++; expect(-v.vy).toBeLessThanOrEqual(sp * 0.4 + 0.01); }
      if (!v.onGround && Math.abs(v.tilt) < VEH_MAX_TILT - 0.01) {
        const gap = v.yR - v.yL;
        if (prevGap != null) { const rate = gap - prevGap; if (prevRate != null) expect(rate).toBeCloseTo(prevRate, 6); prevRate = rate; }
        prevGap = gap; flew++;
      } else { prevGap = null; prevRate = null; }
    }
    expect(tookOff).toBe(1);
    expect(flew).toBeGreaterThan(10);
  });
  test("full-size car (wheelbase > ramp and > manhole, with sunken inner lip like M5/M6/M15) gets real air at speed, and creeping its front wheel dips into the shaft and climbs out", () => {
    // Mirrors Trailor Park M6/M15: 150 px ramp (1200..1350, y 1050->990), 30 px flat lip (1350..1380, y 990),
    // 150 px open shaft (1380..1530), 30 px sunken inner lip (1530..1560, y 1050->1020), far ramp (1560..1680, y 1000->1050).
    const surf = (x) => {
      if (x < 1200) return { y: 1050, slope: false };
      if (x < 1350) return { y: 1050 - ((x - 1200) / 150) * 60, slope: true };
      if (x < 1380) return { y: 990, slope: true };
      if (x < 1530) return null;
      if (x < 1560) return { y: 1050 - ((x - 1530) / 30) * 30, slope: true };
      if (x < 1680) return { y: 1000 + ((x - 1560) / 120) * 50, slope: true };
      return { y: 1050, slope: false };
    };
    const w = withGround(surf, 1e9);
    const mustang = (x, face) => ({ x, y: 1050 - 154, w: 445, h: 154, vx: 0, vy: 0, face, onGround: true, yL: 1050, yR: 1050, wl: 0.19, wr: 0.82, tilt: 0, stopT: 0, turnT: 0 });
    for (const [startX, face, done, top] of [[300, 1, (v) => v.x > 2200, 60], [2400, -1, (v) => v.x < 500, 50]]) {
      const fast = mustang(startX, face);
      let air = 0, peakRise = 0;
      for (let i = 0; i < 500 && !done(fast); i++) {
        const ev = vehicleStep(fast, { gas: true }, w);
        expect(ev.crash).toBeFalsy();
        if (!fast.onGround) air++;
        peakRise = Math.max(peakRise, 1050 - (fast.y + fast.h));
      }
      expect(air).toBeGreaterThan(35);
      expect(peakRise).toBeGreaterThan(top); // above the top of the ramp it left (60 px going right, the far ramp's 50 px going left)
    }
    for (const [startX, face, done] of [[650, 1, (v) => v.x > 1800], [1800, -1, (v) => v.x < 700]]) {
      const slow = mustang(startX, face);
      for (let i = 0; i < 900 && !done(slow); i++) {
        const ev = vehicleStep(slow, { gas: Math.abs(slow.vx) < 2.2 }, w);
        expect(ev.crash).toBeFalsy();
        expect(Math.max(slow.yL, slow.yR)).toBeLessThanOrEqual(1050.5);
      }
      expect(done(slow)).toBe(true);
    }
  });
  test("in the air, a wheel carried sideways into a rising ramp lands on it, never inside it", () => {
    // M20's scrap heap: hopping up it, the School Bus's back wheel went 15 px into the ramp under it
    const surf = (x) => (x < 1000 ? { y: 600, slope: false } : x < 1400 ? { y: 600 - (x - 1000) * 0.5, slope: true } : { y: 400, slope: false });
    const w = withGround(surf, 1e9);
    const v = { ...newCar(700, 600), onGround: false, yL: 590, yR: 590, y: 530, vx: 8, vy: -3 };
    let landedOnRamp = false;
    for (let i = 0; i < 200; i++) {
      vehicleStep(v, { gas: true }, w);
      expect(buried(v, surf)).toBe(false);
      if (v.onGround && v.x + v.wr * v.w > 1000 && v.x + v.wr * v.w < 1400) landedOnRamp = true;
    }
    expect(landedOnRamp).toBe(true);
    expect(v.x).toBeGreaterThan(1400);
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
  test("a car placed Solid is parked scenery: never got into (the M17 stunt bus)", () => {
    const you = 210, bus = { type: "vehicle" }, at = { kind: "prop", propId: "schbus6", size: 30 };
    expect(vehicleDrivable(at, bus, 270, you)).toBe(true);
    expect(vehicleDrivable({ ...at, solid: true }, bus, 270, you)).toBe(false);
    expect(vehicleDrivable(at, { type: "prop" }, 270, you)).toBe(false);
    expect(vehicleDrivable(at, bus, 80, you)).toBe(false);
  });
});

// "passenger seats so your human NPC followers can try to get in vehichles with you" (Blake, 2026-11-01).
describe("passenger places", () => {
  test("every car seats its passengers beside the driver, each a step further back", () => {
    const offs = vehiclePassengerOffsets();
    expect(offs).toHaveLength(VEH_PASSENGER_SEATS);
    expect(offs[0]).toBeGreaterThan(0);
    expect(offs[1]).toBeGreaterThan(offs[0]);
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

describe("vehicle HP halved once (Blake 2026-11-01)", () => {
  test("an old record halves, a halved one never again, a new one starts at 75", () => {
    const a = vehicleHalveHpOnce({ hp: 180 });
    expect([a.hp, a.hpHalved]).toEqual([90, true]);
    expect(vehicleHalveHpOnce(a).hp).toBe(90);
    expect(vehicleHalveHpOnce({ hp: 1 }).hp).toBe(1);
    expect(vehicleHalveHpOnce({}).hp).toBe(VEHICLE_DEFAULT_HP);
    expect(VEHICLE_DEFAULT_HP).toBe(75);
  });
});
