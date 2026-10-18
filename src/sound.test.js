// SOUND (2026-10-08): the rules for which sound plays (src/audio.js), and the sounds kind's trip
// through every store — the dev server's file, the keeper's save folder, the browser's 📁 folder, the
// online snapshot and the sweep of other copies. Every fixture here is built in the test; none of it
// is his data (CLAUDE.md: a test must never pin his data).
import {
  SOUND_EVENTS, SOUND_EVENT_KEYS, ASSET_SOUND_SLOTS, assetSoundSlots, withAssetSound, resolveSound,
  soundGainAt, EXPLOSION_MIN_GAIN, voicePlan, MAX_COPIES, MAX_VOICES, RETRIGGER_MS, clipExtOf, clipMime, CLIP_MAX_BYTES,
  clipHash, clipNameOk, clipMatches, createAudioEngine, SOUND_BOARD_ID, newSoundBoard, isSoundRecord, isSoundBoard,
  leadingSilence, ONSET_FLOOR, ONSET_OF_PEAK, ONSET_PREROLL_S, talkSeconds, TALK_CHARS_PER_S, TALK_MIN_S, TALK_MAX_S, dialogueSoundId,
  soundVolume, SOUND_VOL_MAX, slotVolume, withSlotVolume, oneVolume, resolveSoundVol, splitHurtDeath,
  musicTrackFor, stretchChannels, PICKUP_LEGENDARY_STRETCH,
} from "./audio";
import { groupByCategory, mergeLibraries, mergeCloudLibrary, diskLibrary } from "./App";

const core = require("./saveKeeperCore");
const { applyWrite, KINDS } = require("./setupProxy").__test;

const snd = (id, name, category, clip) => ({ id, type: "sound", name, category, clip: clip || ("0".repeat(28) + ".mp3"), bytes: 100, dur: 0.5 });
const board = (basic, music) => ({ ...newSoundBoard(), basic: basic || {}, music: music || "" });
const bytesOf = (n, seed) => { const b = new Uint8Array(n); let x = seed || 7; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) >>> 0; b[i] = x >>> 24; } return b; };

describe("hurt and death are separate sounds for the player and for enemies", () => {
  test("an enemy asset falls back to the ENEMY rows", () => {
    const byKey = Object.fromEntries(ASSET_SOUND_SLOTS.enemy.map((x) => [x.key, x.basic]));
    expect(byKey.hurt).toBe("enemyHurt");
    expect(byKey.death).toBe("enemyDeath");
  });
  test("a board saved with the one shared Hurt/Death keeps both sides sounding the same", () => {
    const old = { ...board({ hurt: "yelp", death: "thud", punch: "whoosh" }), basicVol: { hurt: 0.5, death: 1.5 } };
    const up = splitHurtDeath(old);
    expect(up.basic).toEqual({ punch: "whoosh", playerHurt: "yelp", enemyHurt: "yelp", playerDeath: "thud", enemyDeath: "thud" });
    expect(up.basicVol).toEqual({ playerHurt: 0.5, enemyHurt: 0.5, playerDeath: 1.5, enemyDeath: 1.5 });
    expect(old.basic.hurt).toBe("yelp"); // never edited in place
  });
  test("a side he already set is not overwritten, and a migrated board is left alone", () => {
    const mixed = splitHurtDeath(board({ hurt: "yelp", enemyHurt: "growl" }));
    expect(mixed.basic).toEqual({ playerHurt: "yelp", enemyHurt: "growl" });
    const done = board({ playerHurt: "a", enemyDeath: "b" });
    expect(splitHurtDeath(done)).toBe(done);
    expect(splitHurtDeath(null)).toBe(null);
  });
  test("the engine plays the player row for the player and the enemy row for an enemy", () => {
    const b2 = board({ playerHurt: "ouch", enemyHurt: "grr" });
    const has2 = (id) => id === "ouch" || id === "grr";
    expect(resolveSound({ asset: { type: "character" }, slot: "hurt", basic: "playerHurt", board: b2, has: has2 })).toBe("ouch");
    expect(resolveSound({ asset: { type: "enemy" }, slot: "hurt", basic: "enemyHurt", board: b2, has: has2 })).toBe("grr");
  });
});

describe("which sound plays: the asset's own, else the basic one, else silence", () => {
  const lib = new Set(["gunshot", "whoosh", "thud", "yelp"]);
  const has = (id) => lib.has(id);
  const b = board({ punch: "whoosh", enemyHurt: "yelp" });

  test("the asset's own sound wins", () => {
    const gun = { id: "g", type: "weapon", wtype: "ranged", sounds: { fire: "gunshot" } };
    expect(resolveSound({ asset: gun, slot: "fire", basic: null, board: b, has })).toBe("gunshot");
    const bat = { id: "b", type: "weapon", wtype: "melee", sounds: { swing: "thud" } };
    expect(resolveSound({ asset: bat, slot: "swing", basic: "punch", board: b, has })).toBe("thud");
  });

  test("an empty slot falls back to the basic sound", () => {
    const bat = { id: "b", type: "weapon", wtype: "melee" };                    // never given a sounds map at all
    expect(resolveSound({ asset: bat, slot: "swing", basic: "punch", board: b, has })).toBe("whoosh");
    const dog = { id: "d", type: "enemy", sounds: {} };
    expect(resolveSound({ asset: dog, slot: "hurt", basic: "enemyHurt", board: b, has })).toBe("yelp");
    expect(resolveSound({ asset: dog, slot: "hurt", basic: "playerHurt", board: b, has })).toBe(null); // the player's hurt is its own row, not the enemy's
    expect(resolveSound({ asset: null, slot: null, basic: "punch", board: b, has })).toBe("whoosh"); // an everyday moment, no asset
  });

  test("no asset sound and no basic sound is silence", () => {
    const gun = { id: "g", type: "weapon", wtype: "ranged", sounds: {} };
    expect(resolveSound({ asset: gun, slot: "fire", basic: null, board: b, has })).toBeNull();    // a gunshot has no everyday stand-in
    expect(resolveSound({ asset: null, slot: null, basic: "door", board: b, has })).toBeNull();   // nothing on the board for doors
    expect(resolveSound({ asset: null, basic: "jump", board: null, has })).toBeNull();            // no board saved yet
    expect(resolveSound()).toBeNull();
  });

  test("a slot pointing at a DELETED sound falls through as if it were empty", () => {
    const bat = { id: "b", type: "weapon", wtype: "melee", sounds: { swing: "deleted-one" } };
    expect(resolveSound({ asset: bat, slot: "swing", basic: "punch", board: b, has })).toBe("whoosh");
    const b2 = board({ punch: "also-deleted" });
    expect(resolveSound({ asset: bat, slot: "swing", basic: "punch", board: b2, has })).toBeNull();
  });

  test("the slots each kind of asset has, and setting / clearing one", () => {
    expect(assetSoundSlots({ type: "weapon", wtype: "melee" }).map((s) => s.key)).toEqual(["swing", "hit"]);
    expect(assetSoundSlots({ type: "weapon", wtype: "ranged" }).map((s) => s.key)).toEqual(["fire", "hit"]);
    expect(assetSoundSlots({ type: "weapon", wtype: "throw" }).map((s) => s.key)).toEqual(["throw", "land"]);
    expect(assetSoundSlots({ type: "weapon" }).map((s) => s.key)).toEqual(["swing", "hit"]); // an old weapon with no wtype is melee, as migrate says
    expect(assetSoundSlots({ type: "enemy" }).map((s) => s.key)).toEqual(["attack", "hurt", "death"]);
    for (const t of ["prop", "equipment", "body", "character", "item"]) expect(assetSoundSlots({ type: t })).toEqual([]);
    // every fallback names a real everyday moment
    for (const list of Object.values(ASSET_SOUND_SLOTS)) for (const s of list) if (s.basic) expect(SOUND_EVENT_KEYS).toContain(s.basic);
    const one = withAssetSound(undefined, "fire", "gunshot");
    expect(one).toEqual({ fire: "gunshot" });
    expect(withAssetSound(one, "fire", "")).toEqual({});                          // cleared = absent, never ""
    expect(one).toEqual({ fire: "gunshot" });                                    // and never edited in place
  });

  test("the basic-sound registry: every moment he asked for, each one a row", () => {
    expect(SOUND_EVENT_KEYS).toEqual(["jump", "land", "swing", "punch", "playerHurt", "playerDeath", "enemyHurt", "enemyDeath", "pickup", "door", "menuClick"]);
    for (const e of SOUND_EVENTS) { expect(typeof e.label).toBe("string"); expect(e.label.length).toBeGreaterThan(0); }
  });
});

/* "THERE SHOULD BE A GENERAL SWING AUDIO, and if the weapons have a swing audio that should over
   write … the punch and weapon Audio (Not swing) should only fire when the weapon or punch makes
   contact" (Blake, 2026-10-11). The stroke starting is Swing; the blow landing is Hit / Attack / Punch. */
describe("a swing is the swing, the punch is the blow landing", () => {
  const lib = new Set(["whoosh", "smack", "clang", "chomp"]);
  const has = (id) => lib.has(id);
  const b = board({ swing: "whoosh", punch: "smack" });
  const slot = (kind, key) => ASSET_SOUND_SLOTS[kind].find((s) => s.key === key);

  test("a melee weapon's Swing overrides the basic Swing, and falls back to it", () => {
    expect(slot("melee", "swing").basic).toBe("swing");
    const plain = { id: "p", type: "weapon", wtype: "melee" };
    const sword = { id: "s", type: "weapon", wtype: "melee", sounds: { swing: "clang" } };
    expect(resolveSound({ asset: plain, slot: "swing", basic: "swing", board: b, has })).toBe("whoosh");
    expect(resolveSound({ asset: sword, slot: "swing", basic: "swing", board: b, has })).toBe("clang");
    expect(resolveSound({ asset: null, slot: "swing", basic: "swing", board: b, has })).toBe("whoosh"); // bare hands
  });

  test("the contact sounds: a blade's Hit else the Punch, a body's Attack else the Punch", () => {
    expect(slot("melee", "hit").basic).toBe("punch");
    expect(slot("enemy", "attack").basic).toBe("punch");
    expect(slot("ranged", "hit").basic).toBeNull(); // a bullet landing is not a punch
    const plain = { id: "p", type: "weapon", wtype: "melee" };
    expect(resolveSound({ asset: plain, slot: "hit", basic: "punch", board: b, has })).toBe("smack");
    const dog = { id: "d", type: "enemy", sounds: { attack: "chomp" } };
    expect(resolveSound({ asset: dog, slot: "attack", basic: "punch", board: b, has })).toBe("chomp");
  });

  // The play loop is one giant effect and cannot be driven from here, so the WIRING is pinned by
  // reading the source: no stroke start may fire the Punch or an Attack any more.
  test("no stroke START fires the Punch; every contact site does", () => {
    const src = require("fs").readFileSync(require("path").join(__dirname, "App.js"), "utf8");
    const count = (needle) => src.split(needle).length - 1;
    expect(count('"swing" : "attack", "punch"')).toBe(0);
    expect(count('sndMoment(basePlayerAsset, "attack", "punch", p.x, p.y)')).toBe(0);
    expect(count('sndMoment(playtestWeapon, "swing", "swing", p.x, p.y)')).toBe(1);
    expect(count('sndEvent("swing", p.x, p.y)')).toBe(1);
    expect(count("if (swingHitNotes.length || swingParried)")).toBe(1);
    expect(count('ew ? "hit" : "attack", "punch"')).toBe(2); // a unit's arc test and its instant blow
  });
});

describe("each sound has its own volume", () => {
  test("soundVolume: absent is 100%, clamped to 0..SOUND_VOL_MAX", () => {
    expect(soundVolume(snd("a", "A"))).toBe(1);
    expect(soundVolume({ ...snd("a", "A"), vol: 0.4 })).toBe(0.4);
    expect(soundVolume({ ...snd("a", "A"), vol: 9 })).toBe(SOUND_VOL_MAX);
    expect(soundVolume({ ...snd("a", "A"), vol: -1 })).toBe(0);
    expect(soundVolume({ ...snd("a", "A"), vol: NaN })).toBe(1);
    expect(soundVolume(null)).toBe(1);
  });

  // Blake, 2026-10-11, third time of asking: a slider beside EVERY pick, not only on Library rows.
  test("slotVolume / withSlotVolume: absent is 100%, 100% is stored as absent", () => {
    expect(slotVolume(undefined, "jump")).toBe(1);
    expect(slotVolume({ jump: 0.3 }, "jump")).toBe(0.3);
    expect(slotVolume({ jump: 7 }, "jump")).toBe(SOUND_VOL_MAX);
    expect(withSlotVolume({ jump: 0.3 }, "jump", 1)).toEqual({});
    expect(withSlotVolume(undefined, "fire", 1.5)).toEqual({ fire: 1.5 });
    expect(oneVolume(undefined)).toBe(1);
    expect(oneVolume(0.25)).toBe(0.25);
  });
  test("resolveSoundVol follows the same choice resolveSound makes", () => {
    const has = () => true;
    const b = { ...board({ punch: "whoosh" }), basicVol: { punch: 0.5 } };
    const bat = { id: "bat", sounds: { hit: "thud" }, soundVol: { hit: 1.8 } };
    const plain = { id: "plain", soundVol: { hit: 0.1 } }; // its own slot is empty: the Punch plays, at the Punch's volume
    expect(resolveSoundVol({ asset: bat, slot: "hit", basic: "punch", board: b, has })).toBe(1.8);
    expect(resolveSoundVol({ asset: plain, slot: "hit", basic: "punch", board: b, has })).toBe(0.5);
    expect(resolveSoundVol({ basic: "jump", board: b, has })).toBe(1);
  });
  test("the engine plays a moment at sound volume x slot volume", () => {
    const e = createAudioEngine({});
    e.setLibrary([{ ...snd("w", "W"), vol: 0.5 }, { ...board({ punch: "w" }), basicVol: { punch: 0.4 } }]);
    e.event("punch");
    const row = e.trace().pop();
    expect(row && row.gain).toBeCloseTo(0.2);
  });
  test("every pick on the Sounds screen and in the editor's 🔊 card has a slider beside it", () => {
    const src = require("fs").readFileSync(require("path").join(__dirname, "App.js"), "utf8");
    const count = (needle) => src.split(needle).length - 1;
    expect(count('{volSlider("b" + ev.key')).toBe(1);   // Basic sounds
    expect(count('{volSlider("music"')).toBe(1);        // Music
    expect(count('{volSlider("d" + d.id')).toBe(1);     // Dialogue
    expect(count('{volSlider(w.id + sl.key')).toBe(1);  // Weapons and Enemies rows
    expect(count('{volSlider("a" + sl.key')).toBe(1);   // the weapon / enemy editor's own card
  });
});

describe("sounds file under 📂 folders the same way props and looks do", () => {
  test("groupByCategory: folders A→Z, Unknown last, names A→Z inside, the board never listed", () => {
    const recs = [
      snd("1", "Shotgun", "Weapons"), snd("2", "bark", "Animals"), snd("3", "Uzi", "weapons "), snd("4", "Click"),
      snd("5", "Axe", "Weapons"), board({ jump: "1" }),
    ];
    const g = groupByCategory(recs, "sound");
    expect(g.map((x) => x.label)).toEqual(["Animals", "Weapons", "Unknown"]);   // "weapons " is the same folder as "Weapons"
    expect(g[1].props.map((s) => s.name)).toEqual(["Axe", "Shotgun", "Uzi"]);
    expect(g.flatMap((x) => x.props).some(isSoundBoard)).toBe(false);
    expect(recs.filter(isSoundRecord)).toHaveLength(5);
    expect(isSoundBoard({ id: SOUND_BOARD_ID })).toBe(true);
  });
});

describe("a sound file is named by its own bytes", () => {
  test("the studio's hash and the dev server / keeper's hash are the same function", () => {
    // They are two copies (the bundle cannot import the keeper's CommonJS file). If they ever
    // disagree, every copy rejects every file as corrupt — so they are held equal here.
    for (const b of [new Uint8Array(0), new Uint8Array([1]), new Uint8Array([1, 2]), bytesOf(1000, 3), bytesOf(100000, 9)]) {
      expect(clipHash(b)).toBe(core.clipHash(b));
      expect(clipHash(b)).toMatch(/^[0-9a-f]{28}$/);
    }
    expect(clipHash(bytesOf(500, 1))).not.toBe(clipHash(bytesOf(500, 2)));
    const a = bytesOf(500, 1), flipped = a.slice(); flipped[250] ^= 1;
    expect(clipHash(a)).not.toBe(clipHash(flipped));                               // one bit changes the name
  });

  test("names are checked, and bytes must match their name", () => {
    const b = bytesOf(2000, 4), name = clipHash(b) + ".wav";
    expect(clipNameOk(name)).toBe(true);
    expect(clipMatches(name, b)).toBe(true);
    expect(core.clipMatches(name, Buffer.from(b))).toBe(true);
    const other = bytesOf(2000, 5);
    expect(clipMatches(name, other)).toBe(false);                                  // index.html handed back for a missing file is refused
    for (const bad of ["../x.wav", clipHash(b) + ".exe", clipHash(b) + ".wav/../..", "", null, "abc.mp3"]) { expect(clipNameOk(bad)).toBe(false); expect(core.clipNameOk(bad)).toBe(false); }
  });

  test("what an upload is stored as", () => {
    expect(clipExtOf("Jump.WAV", "")).toBe("wav");
    expect(clipExtOf("boom.mp3", "audio/mpeg")).toBe("mp3");
    expect(clipExtOf("theme.ogg", "")).toBe("ogg");
    expect(clipExtOf("noext", "audio/x-wav")).toBe("wav");
    expect(clipExtOf("song.FLAC", "")).toBe("flac");
    expect(clipExtOf("a.m4a", "")).toBe("m4a");
    expect(clipExtOf("noext", "audio/flac")).toBe("flac");
    expect(clipExtOf("song.wma", "audio/x-ms-wma")).toBeNull();
    expect(clipExtOf("notes.txt", "text/plain")).toBeNull();
    expect(clipMime("a".repeat(28) + ".mp3")).toBe("audio/mpeg");
    expect(CLIP_MAX_BYTES).toBe(10 * 1024 * 1024);
  });
});

describe("a room of fifteen units is not noise", () => {
  const view = { x0: 0, y0: 0, x1: 1000, y1: 500 };
  test("on screen is full volume, just off it is quieter, far off it is silent", () => {
    expect(soundGainAt(500, 250, view)).toBe(1);
    expect(soundGainAt(1000, 500, view)).toBe(1);                                  // the edge itself
    const near = soundGainAt(1100, 250, view), mid = soundGainAt(1300, 250, view);
    expect(near).toBeGreaterThan(mid);
    expect(near).toBeLessThan(1);
    expect(soundGainAt(1500, 250, view)).toBe(0);                                  // half a view's width past the edge
    expect(soundGainAt(5000, 250, view)).toBe(0);
    expect(soundGainAt(500, 250, null)).toBe(1);                                   // no view (a menu, the studio's ▶)
    expect(soundGainAt(undefined, undefined, view)).toBe(1);                       // no position
  });

  test("at most three copies of one sound — a fourth cuts the oldest — none restarted within the retrigger gap, and a ceiling overall", () => {
    const t = 10000;
    expect(voicePlan([], "bark", t)).toEqual({ play: true, steal: null });
    const three = [{ id: "bark", at: t - 400 }, { id: "bark", at: t - 500 }, { id: "bark", at: t - 300 }];
    expect(voicePlan(three, "bark", t)).toEqual({ play: true, steal: three[1] });     // the newest is heard; the oldest copy stops
    expect(voicePlan(three, "shot", t)).toEqual({ play: true, steal: null });         // the cap is per sound
    expect(voicePlan([{ id: "bark", at: t - (RETRIGGER_MS - 1) }], "bark", t).play).toBe(false); // the same frame: one bang
    expect(voicePlan([{ id: "bark", at: t - (RETRIGGER_MS + 1) }], "bark", t).play).toBe(true);
    const full = Array.from({ length: MAX_VOICES }, (_, i) => ({ id: "s" + i, at: 100 + i }));
    expect(voicePlan(full, "new", t)).toEqual({ play: true, steal: full[0] });        // everything at once: the oldest sound of all goes
    expect(MAX_COPIES).toBe(3);
  });
});

describe("the engine, against a stand-in Web Audio", () => {
  // Just enough of AudioContext to show what the engine STARTS: every started source is recorded with
  // the buffer it was given, and every buffer remembers the bytes it was decoded from.
  const install = (state) => {
    const started = [];
    class FakeCtx {
      constructor() { this.state = state; this.destination = {}; }
      resume() { this.state = "running"; return Promise.resolve(); }
      createGain() { return { gain: { value: 1 }, connect: () => {}, disconnect: () => {} }; }
      createBufferSource() { const s = { buffer: null, connect: (n) => n, start: () => started.push(s), stop: () => { s.stopped = true; }, onended: null }; return s; }
      decodeAudioData(ab, ok) { const p = Promise.resolve({ duration: 0.4, from: new Uint8Array(ab)[0] }); p.then(ok); return p; }
    }
    window.AudioContext = FakeCtx;
    return started;
  };
  afterEach(() => { delete window.AudioContext; });
  const clipA = "a".repeat(28) + ".wav", clipB = "b".repeat(28) + ".wav";
  const files = { [clipA]: new Uint8Array([65]), [clipB]: new Uint8Array([66]) };
  const make = () => {
    const e = createAudioEngine({ loadClip: async (n) => files[n] || null });
    e.setLibrary([snd("jumpS", "Boing", "Bob", clipA), snd("gunS", "Bang", "Weapons", clipB), board({ jump: "jumpS" })]);
    return e;
  };
  const settle = () => new Promise((r) => setTimeout(r, 0));

  test("a moment plays the clip its rule picks, decoded once, and the trace says so", async () => {
    const started = install("running");
    const e = make();
    e.preload(["jumpS", "gunS"]); await settle(); await settle();
    expect(e.state().decoded.sort()).toEqual([clipA, clipB]);
    const gun = { id: "w1", type: "weapon", wtype: "ranged", sounds: { fire: "gunS" } };
    expect(e.moment({ asset: gun, slot: "fire", basic: null })).toBe(true);
    expect(e.event("jump")).toBe(true);
    expect(e.event("door")).toBe(false);                                           // nothing assigned: silence
    expect(started.map((s) => s.buffer.from)).toEqual([66, 65]);                   // the gun's bytes, then the jump's
    const tr = e.trace();
    expect(tr.map((r) => [r.id, r.clip, r.heard])).toEqual([["gunS", clipB, true], ["jumpS", clipA, true]]);
    expect(tr[0]).toMatchObject({ slot: "fire", asset: "w1" });
  });

  test("an explosion's Hit is heard wherever it lands; anything else far off screen stays silent", async () => {
    install("running");
    const e = make();
    e.preload(["gunS"]); await settle(); await settle();
    e.setView({ x0: 0, y0: 0, x1: 1000, y1: 500 });
    const launcher = { id: "gl", type: "weapon", wtype: "ranged", sounds: { hit: "gunS" } };
    expect(e.moment({ asset: launcher, slot: "hit", x: 5000, y: 250 })).toBe(false);  // the old fade: silent
    expect(e.moment({ asset: launcher, slot: "hit", x: 5000, y: 250, minGain: EXPLOSION_MIN_GAIN })).toBe(true);
    expect(e.trace().slice(-1)[0].gain).toBeCloseTo(EXPLOSION_MIN_GAIN);
    const realNow = performance.now; let t = 1e6; performance.now = () => t;      // past the retrigger gap
    try { expect(e.moment({ asset: launcher, slot: "hit", x: 500, y: 250, minGain: EXPLOSION_MIN_GAIN })).toBe(true); }
    finally { performance.now = realNow; }
    expect(e.trace().slice(-1)[0].gain).toBe(1);                                   // on screen it is still full volume
  });

  test("never more than three copies of one sound: the fourth is heard and the oldest is cut", async () => {
    const started = install("running");
    const e = make();
    e.preload(["jumpS"]); await settle(); await settle();
    const realNow = performance.now;
    let t = 1000; performance.now = () => t;
    try {
      const heard = [];
      for (let i = 0; i < 5; i++) { heard.push(e.event("jump")); t += RETRIGGER_MS + 5; }
      expect(heard).toEqual([true, true, true, true, true]);                       // every new one is heard...
      expect(started.map((s) => !!s.stopped)).toEqual([true, true, false, false, false]); // ...and only three are still sounding
      expect(e.state().voices).toBe(3);
      t -= RETRIGGER_MS + 4;                                                        // 1 ms after the last one started
      expect(e.event("jump")).toBe(false);
      expect(e.trace().slice(-1)[0]).toMatchObject({ heard: false, why: "retrigger" });
    } finally { performance.now = realNow; }
  });

  test("a sound fired before the first click or key is not queued up to go off later", async () => {
    const started = install("suspended");
    const e = make();
    e.preload(["jumpS"]); await settle(); await settle();
    expect(e.event("jump")).toBe(false);
    expect(started).toHaveLength(0);
    expect(e.trace().slice(-1)[0]).toMatchObject({ id: "jumpS", heard: false, why: "locked" });
  });

  test("off screen it is quieter, and far off it is not played at all", async () => {
    const started = install("running");
    const e = make();
    e.preload(["jumpS"]); await settle(); await settle();
    e.setView({ x0: 0, y0: 0, x1: 1000, y1: 500 });
    expect(e.event("jump", 5000, 200)).toBe(false);
    expect(started).toHaveLength(0);
    expect(e.event("jump", 1100, 200)).toBe(true);
    expect(e.trace().slice(-1)[0].gain).toBeLessThan(1);
  });

  test("a sound's volume scales every play of it, and 0% plays nothing", async () => {
    install("running");
    const e = createAudioEngine({ loadClip: async (n) => files[n] || null });
    e.setLibrary([{ ...snd("jumpS", "Boing", "Bob", clipA), vol: 0.5 }, { ...snd("gunS", "Bang", "Weapons", clipB), vol: 0 }, board({ jump: "jumpS", punch: "gunS" })]);
    e.preload(["jumpS", "gunS"]); await settle(); await settle();
    expect(e.event("jump")).toBe(true);
    expect(e.trace().slice(-1)[0]).toMatchObject({ id: "jumpS", gain: 0.5, heard: true });
    expect(e.event("punch")).toBe(false);
    expect(e.trace().slice(-1)[0]).toMatchObject({ id: "gunS", heard: false, why: "volume 0" });
  });
});

/* "ALL OF MY AUDIO PLAYS A FRACTION OF A SECOND TOO LATE" (2026-10-10). The play loop fires on the
   frame; the lateness was quiet at the head of the files (his Jump: 55 ms before it is really
   sound). Each clip now starts where its sound starts. */
describe("a sound starts where the sound starts, not where the file does", () => {
  const SR = 1000;
  const clip = (n, at, level, before) => { const d = new Float32Array(n); for (let i = 0; i < n; i++) d[i] = i < at ? (before || 0) : level; return d; };

  test("quiet at the head is skipped, less a hair of pre-roll", () => {
    expect(leadingSilence([clip(1000, 100, 0.5)], SR)).toBeCloseTo(0.1 - ONSET_PREROLL_S, 6);
  });

  test("a clip that starts loud, or is silent, or is nothing, is left alone", () => {
    expect(leadingSilence([clip(1000, 0, 0.5)], SR)).toBe(0);
    expect(leadingSilence([clip(1000, 1000, 0.5)], SR)).toBe(0);           // all silence
    expect(leadingSilence([clip(1000, 100, ONSET_FLOOR / 2)], SR)).toBe(0); // nothing rises above the floor
    expect(leadingSilence([], SR)).toBe(0);
    expect(leadingSilence(null, SR)).toBe(0);
    expect(leadingSilence([clip(10, 5, 0.5)], 0)).toBe(0);
  });

  test("hiss under the floor and a fade-in far under the clip's own peak both count as quiet", () => {
    expect(leadingSilence([clip(1000, 200, 0.8, ONSET_FLOOR * 0.5)], SR)).toBeCloseTo(0.2 - ONSET_PREROLL_S, 6);
    expect(leadingSilence([clip(1000, 200, 0.8, 0.8 * ONSET_OF_PEAK * 0.5)], SR)).toBeCloseTo(0.2 - ONSET_PREROLL_S, 6);
    // ...but a quiet clip is judged against ITSELF: its own soft start is not thrown away.
    expect(leadingSilence([clip(1000, 200, 0.01, 0.004)], SR)).toBe(0);
  });

  test("stereo: whichever side makes a sound first", () => {
    expect(leadingSilence([clip(1000, 300, 0.5), clip(1000, 120, 0.5)], SR)).toBeCloseTo(0.12 - ONSET_PREROLL_S, 6);
  });
});

describe("dialogue talks while the line is being said", () => {
  test("how long a line takes to say", () => {
    expect(talkSeconds("")).toBe(0);
    expect(talkSeconds("   ")).toBe(0);
    expect(talkSeconds(null)).toBe(0);
    expect(talkSeconds("Hi.")).toBe(TALK_MIN_S);
    expect(talkSeconds("x".repeat(TALK_CHARS_PER_S * 2))).toBeCloseTo(2, 6);
    expect(talkSeconds("x".repeat(2000))).toBe(TALK_MAX_S);
  });

  test("a dialogue talks with its own sound, if that sound still exists, and otherwise not at all", () => {
    const has = (id) => id === "meow";
    expect(dialogueSoundId({ sound: "meow" }, has)).toBe("meow");
    expect(dialogueSoundId({ sound: "deleted" }, has)).toBe(null);
    expect(dialogueSoundId({}, has)).toBe(null);
    expect(dialogueSoundId(null, has)).toBe(null);
  });
});

describe("the engine trims, talks and keeps the card awake, against a stand-in Web Audio", () => {
  // A stand-in whose decoded buffers carry real samples: the first byte of a clip is how many
  // samples of silence it starts with (at 1000 samples a second), then it is loud to the end.
  const install = (state) => {
    const log = { started: [], consts: [] };
    class FakeCtx {
      constructor() { this.state = state || "running"; this.destination = {}; this.currentTime = 5; }
      resume() { this.state = "running"; return Promise.resolve(); }
      createGain() {
        const ev = [];
        return { ev, gain: { value: 1, setValueAtTime: (v, t) => ev.push(["set", v, t]), linearRampToValueAtTime: (v, t) => ev.push(["ramp", v, t]), cancelScheduledValues: () => {} }, connect: () => {}, disconnect: () => {} };
      }
      createBufferSource() { const s = { buffer: null, loop: false, connect: (n) => { s.out = n; return n; }, start: (when, off) => { s.off = off; log.started.push(s); }, stop: (t) => { s.stopAt = t; }, onended: null }; return s; }
      createConstantSource() { const c = { offset: { value: 1 }, connect: (n) => { c.to = n; }, start: () => { c.on = true; log.consts.push(c); }, stop: () => { c.on = false; }, disconnect: () => {} }; return c; }
      decodeAudioData(ab, ok) {
        const lead = new Uint8Array(ab)[0], d = new Float32Array(1000);
        for (let i = lead; i < 1000; i++) d[i] = 0.5;
        const p = Promise.resolve({ duration: 1, sampleRate: 1000, numberOfChannels: 1, getChannelData: () => d });
        p.then(ok); return p;
      }
    }
    window.AudioContext = FakeCtx;
    return log;
  };
  afterEach(() => { delete window.AudioContext; });
  const clipA = "a".repeat(28) + ".mp3", clipB = "b".repeat(28) + ".mp3";
  const files = { [clipA]: new Uint8Array([100]), [clipB]: new Uint8Array([0]) };
  const make = () => {
    const e = createAudioEngine({ loadClip: async (n) => files[n] || null });
    e.setLibrary([snd("whoosh", "Whoosh", "Bob", clipA), snd("gab", "Gibberish", "Talk", clipB), board({ jump: "whoosh" })]);
    return e;
  };
  const settle = () => new Promise((r) => setTimeout(r, 0));

  test("a jump starts 97 ms into a clip with 100 ms of quiet, ramped in, and the trace says how much was skipped", async () => {
    const log = install();
    const e = make();
    e.preload(["whoosh", "gab"]); await settle(); await settle();
    expect(e.state().skips[clipA]).toBeCloseTo(0.097, 6);
    expect(e.state().skips[clipB]).toBe(0);
    expect(e.event("jump")).toBe(true);
    expect(log.started[0].off).toBeCloseTo(0.097, 6);
    const [set, ramp] = log.started[0].out.ev;                   // in from silence over 3 ms: no click at the cut
    expect(set).toEqual(["set", 0, 5]);
    expect(ramp[0]).toBe("ramp"); expect(ramp[1]).toBe(1); expect(ramp[2]).toBeCloseTo(5.003, 9);
    expect(e.trace().slice(-1)[0].skip).toBeCloseTo(0.097, 6);
  });

  test("a line loops its dialogue's sound for as long as it takes to say, and stops when the line does", async () => {
    const log = install();
    const e = make();
    e.preload(["gab"]); await settle(); await settle();
    expect(e.talk("gab", 2)).toBe(true);
    const src = log.started[0];
    expect(src.loop).toBe(true);
    expect(src.stopAt).toBe(7);                                  // its end is on the audio clock: now + 2 s
    expect(e.state().talking).toBe(true);
    e.talk(null);                                                // answered / walked away
    expect(src.stopAt).toBeCloseTo(5.05, 6);
    expect(e.state().talking).toBe(false);
    expect(e.talk("gab", 0)).toBe(false);                        // a blank line says nothing
    expect(e.talk("nope", 2)).toBe(false);                       // a deleted sound says nothing
  });

  test("a talk sound still decoding starts when it is ready, unless the line has moved on", async () => {
    const log = install();
    const e = make();
    e.talk("gab", 2); await settle(); await settle(); await settle();
    expect(log.started).toHaveLength(1);
    const e2 = make();
    e2.talk("whoosh", 2); e2.talk(null); await settle(); await settle(); await settle();
    expect(log.started).toHaveLength(1);                         // the second never started
  });

  test("the card is kept awake while a run is going and let sleep the moment it stops", async () => {
    const log = install();
    const e = make();
    e.preload(["gab"]); await settle(); await settle();          // the context exists now
    expect(log.consts).toHaveLength(0);
    e.setPlaying(true);
    expect(log.consts).toHaveLength(1);
    expect(log.consts[0].on).toBe(true);
    expect(log.consts[0].offset.value).toBeLessThanOrEqual(1e-6); // -120 dB: nothing anyone can hear
    expect(e.state().awake).toBe(true);
    e.talk("gab", 3);
    e.setPlaying(false);
    expect(log.consts[0].on).toBe(false);
    expect(e.state().awake).toBe(false);
    expect(e.state().talking).toBe(false);                       // and nobody is left talking
  });
});

describe("the sounds kind goes everywhere every other kind goes", () => {
  test("it is a kind in all three lists — App, the dev server, the keeper", () => {
    expect(KINDS).toContain("sounds");
    expect(core.KINDS).toEqual(KINDS);
    expect(core.PREFIX.sounds).toBe("sound");
  });

  // Derives `incoming` the way the request handler does.
  const write = (current, body) => applyWrite(current, body, (Array.isArray(body.assets) ? body.assets : []).filter((x) => x && x.id)).next;
  const empty = () => ({ assets: [{ id: "keep" }], removed: {} });

  test("the project file: save up, newer wins, delete, and a delete outlives a stale browser's push", () => {
    const s1 = { ...snd("s1", "Boing", "Bob"), savedAt: 100 };
    let lib = write(empty(), { assets: [], sounds: [s1], revive: true });
    expect(lib.sounds.map((s) => s.name)).toEqual(["Boing"]);
    lib = write(lib, { assets: [], sounds: [{ ...s1, name: "Boing!", savedAt: 200 }] });
    lib = write(lib, { assets: [], sounds: [{ ...s1, name: "stale", savedAt: 150 }] });  // an older copy never wins
    expect(lib.sounds[0].name).toBe("Boing!");
    lib = write(lib, { assets: [], remove: { sounds: ["s1"] } });
    expect(lib.sounds).toEqual([]);
    expect(lib.removed.sounds).toEqual(["s1"]);
    lib = write(lib, { assets: [], sounds: [{ ...s1, savedAt: 300 }] });                   // a browser that never heard: the bulk sync
    expect(lib.sounds).toEqual([]);                                                        // ...cannot bring it back
    lib = write(lib, { assets: [], sounds: [{ ...s1, savedAt: 400 }], revive: true });     // re-uploading it on purpose can
    expect(lib.sounds.map((s) => s.id)).toEqual(["s1"]);
    expect(lib.assets.map((a) => a.id)).toEqual(["keep"]);                                 // and no other kind was touched
  });

  test("the board is one record: the newest pick of basic sounds wins", () => {
    let lib = write(empty(), { assets: [], sounds: [{ ...board({ jump: "a" }), savedAt: 10 }], revive: true });
    lib = write(lib, { assets: [], sounds: [{ ...board({ jump: "a", punch: "b" }), savedAt: 20 }] });
    lib = write(lib, { assets: [], sounds: [{ ...board({}), savedAt: 15 }] });
    expect(lib.sounds).toHaveLength(1);
    expect(lib.sounds[0].basic).toEqual({ jump: "a", punch: "b" });
  });

  test("the save folder and the online snapshot carry sounds and their deletes", () => {
    const a = { assets: [], sounds: [{ ...snd("s1", "old"), savedAt: 1 }], removed: { sounds: ["dead"] } };
    const b = { assets: [], sounds: [{ ...snd("s1", "new"), savedAt: 2 }, { ...snd("s2", "two"), savedAt: 1 }] };
    const m = mergeLibraries(a, b);
    expect(m.sounds.map((s) => s.name).sort()).toEqual(["new", "two"]);
    expect(m.removed.sounds).toEqual(["dead"]);
    const c = mergeCloudLibrary({ assets: [], sounds: [{ ...snd("gone", "x"), savedAt: 1 }] }, { assets: [], sounds: [{ ...snd("s3", "online"), savedAt: 5 }], removed: { sounds: ["gone"] } });
    expect(c.sounds.map((s) => s.id)).toEqual(["s3"]);                                     // deleted online: never restored into a fresh copy
    const snap = JSON.parse(core.cloudSnapshot({ assets: [], sounds: [{ ...snd("z", "Z"), savedAt: 1 }, { ...snd("a", "A"), savedAt: 1 }], removed: { sounds: ["q"] } }));
    expect(snap.sounds.map((s) => s.id)).toEqual(["a", "z"]);
    expect(snap.removed.sounds).toEqual(["q"]);
  });

  test("the keeper's sweep picks a StackBlitz copy's sounds AND their audio out of its store", () => {
    const b = bytesOf(3000, 11), name = clipHash(b) + ".mp3";
    const entries = [
      { key: "sound:s1", value: JSON.stringify({ ...snd("s1", "Boing", "Bob", name), savedAt: 5 }) },
      { key: "sound:" + SOUND_BOARD_ID, value: JSON.stringify({ ...board({ jump: "s1" }), savedAt: 6 }) },
      { key: "soundIndex", value: "[]" },
      { key: "clip:" + name, value: Buffer.from(b).toString("base64") },
      { key: "clip:../../evil.wav", value: "AAAA" },
      { key: "removedIndex", value: JSON.stringify({ sounds: ["old"] }) },
    ];
    const lib = core.libraryFromStore(entries);
    expect(lib.sounds.map((s) => s.id).sort()).toEqual(["s1", SOUND_BOARD_ID].sort());
    expect(Object.keys(lib.clips)).toEqual([name]);                                        // the bad name is ignored
    expect(core.clipMatches(name, Buffer.from(lib.clips[name], "base64"))).toBe(true);
    expect(lib.removed.sounds).toEqual(["old"]);
  });
});

describe("the keeper's save folder holds sound files beside the records", () => {
  const os = require("os"), path = require("path"), fs = require("fs");
  let home, saves, SaveFolder;
  beforeAll(() => {
    // Its own scratch home and folder — never his (CLAUDE.md: never point a test keeper at his folder).
    home = fs.mkdtempSync(path.join(os.tmpdir(), "bob-snd-home-"));
    saves = fs.mkdtempSync(path.join(os.tmpdir(), "bob-snd-saves-"));
    process.env.BOB_HOME = home; process.env.BOB_SAVES = saves; process.env.BOB_NO_SWEEP = "1"; process.env.BOB_NO_CLOUD = "1"; process.env.BOB_NO_UPDATE = "1";
    ({ SaveFolder } = require("../tools/bob-okay.js"));
  });
  afterAll(() => { for (const d of [home, saves]) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* temp */ } } });

  test("save, reload, delete — and the audio file stays put, checked against its name", async () => {
    const folder = new SaveFolder(saves);
    await folder.load();
    const b = Buffer.from(bytesOf(4096, 21)), name = clipHash(b) + ".wav";
    expect(await folder.putClip(name, b)).toBe(true);
    expect(await folder.putClip(name, b)).toBe(false);                                     // already there: written once
    expect(await folder.putClip(clipHash(b) + ".mp3", Buffer.from("not it"))).toBe(false); // bytes that do not match their name
    const rec = { ...snd("s1", "Boing", "Bob", name), savedAt: 10 };
    await folder.write({ assets: [], sounds: [rec], revive: true });
    const again = new SaveFolder(saves);
    await again.load();
    expect(again.lib.sounds.map((s) => s.name)).toEqual(["Boing"]);
    expect(fs.existsSync(path.join(saves, "sounds", "s1.json"))).toBe(true);
    expect(again.clipNames()).toEqual([name]);
    expect(Buffer.compare(again.readClip(name), b)).toBe(0);
    await again.write({ assets: [], remove: { sounds: ["s1"] } });
    const third = new SaveFolder(saves);
    await third.load();
    expect(third.lib.sounds).toEqual([]);
    expect(third.lib.removed.sounds).toEqual(["s1"]);
    expect(third.hasClip(name)).toBe(true);                                                // a name is its content: nothing to un-write
    fs.writeFileSync(path.join(saves, "clips", name), Buffer.from("corrupted"));
    expect(third.readClip(name)).toBeNull();                                               // a damaged file is read as missing
  });
});

describe("the 📁 save folder in the browser holds sound files too", () => {
  // A binary-capable stand-in for a FileSystemDirectoryHandle (the other diskLibrary test's fake
  // stores text only).
  const fakeDir = (name) => {
    const files = new Map(), dirs = new Map();
    return {
      name, kind: "directory",
      queryPermission: async () => "granted", requestPermission: async () => "granted",
      getDirectoryHandle: async (n, o) => { if (!dirs.has(n)) { if (!(o && o.create)) throw new Error("NotFoundError"); dirs.set(n, fakeDir(n)); } return dirs.get(n); },
      getFileHandle: async (n, o) => {
        if (!files.has(n)) { if (!(o && o.create)) throw new Error("NotFoundError"); files.set(n, new Uint8Array(0)); }
        return { kind: "file", name: n, getFile: async () => ({ arrayBuffer: async () => files.get(n).slice().buffer, text: async () => Buffer.from(files.get(n)).toString("utf8") }), createWritable: async () => { let parts = []; return { write: async (t) => { parts.push(typeof t === "string" ? Buffer.from(t, "utf8") : t); }, close: async () => { const n2 = parts.reduce((s, p) => s + p.length, 0); const out = new Uint8Array(n2); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } files.set(n, out); } }; } };
      },
      entries: async function* () { for (const [n] of files) yield [n, { kind: "file", name: n }]; for (const [n, sub] of dirs) yield [n, sub]; },
      removeEntry: async (n) => { if (!files.delete(n) && !dirs.delete(n)) throw new Error("NotFoundError"); },
    };
  };

  test("a clip goes in once, comes back byte for byte, and sound records ride the ordinary record path", async () => {
    diskLibrary.handle = null; diskLibrary.state = "none"; diskLibrary.name = ""; diskLibrary.known = {}; diskLibrary.initP = null;
    const root = fakeDir("Saves");
    window.showDirectoryPicker = async () => root;
    expect(await diskLibrary.connect(true)).toBe("ready");
    const b = bytesOf(777, 31), name = clipHash(b) + ".ogg";
    expect(await diskLibrary.putClip(name, b)).toBe(true);
    expect(await diskLibrary.putClip("../escape.ogg", b)).toBe(false);
    expect(await diskLibrary.clipNames()).toEqual([name]);
    const back = await diskLibrary.getClip(name);
    expect(clipMatches(name, back)).toBe(true);
    await diskLibrary.save({ sounds: [{ ...snd("s9", "Click", "UI", name), savedAt: 3 }] }, { revive: true });
    const lib = await diskLibrary.load();
    expect(lib.sounds.map((s) => s.id)).toEqual(["s9"]);
    expect(await diskLibrary.forget("sounds", ["s9"])).toBe(true);
    const after = await diskLibrary.load();
    expect(after.sounds).toEqual([]);
    expect(after.removed.sounds).toEqual(["s9"]);
    delete window.showDirectoryPicker;
  });
});

describe("the sounds loader is wired like every other kind", () => {
  // loadSounds lives inside the studio component, so its shape is checked in the source — the same
  // way the await guard is. These are the halves that have each been missed on some earlier kind.
  const src = require("fs").readFileSync(require("path").join(__dirname, "App.js"), "utf8");
  const body = (from, to) => src.slice(src.indexOf(from), src.indexOf(to, src.indexOf(from)));
  test("restore down skips the tombstones, save up, delete up, the export and restoreBackup", () => {
    const load = body("const loadSounds = async", "const putSoundRecord = async");
    expect(load).toContain('tombstoneSet(proj, "sounds")');
    expect(load).toContain('purgeRemoved(proj, "sounds", "sound:"');
    expect(load).toContain("tombedS.has(raw.id)) continue");                     // the skip in the restore loop
    expect(load).toContain("fileIsNewer(raw");
    expect(load).toContain("projectLibrary.save({ sounds: full })");               // the bulk sync never revives
    expect(body("const putSoundRecord = async", "const uploadSounds = async")).toContain("projectLibrary.save({ sounds: [payload] }, { revive: true })");
    expect(body("const deleteSound = async", "const soundLib = ")).toContain('projectLibrary.forget("sounds", [id])');
    expect(body("const exportAllAssets = async", "const restoreBackup = async")).toContain("loadSounds()");
    expect(body("const restoreBackup = async", "const start = (type")).toContain('"sound:", "soundIndex"');
    expect(src).toMatch(/reloadAllRef\.current = \(\) => Promise\.all\(\[[^\]]*loadSounds\(\)/);
  });
});

describe("which music plays (2026-10-18: the game's menus have music)", () => {
  const board = { music: "run", musicVol: 0.8 };
  test("a run plays the Run track", () => {
    expect(musicTrackFor(board, true, true)).toEqual({ id: "run", vol: 0.8 });
  });
  test("the menus play the Menus track, or the Run track when none is picked", () => {
    expect(musicTrackFor(board, false, true)).toEqual({ id: "run", vol: 0.8 });
    expect(musicTrackFor({ ...board, menuMusic: "menu", menuMusicVol: 0.5 }, false, true)).toEqual({ id: "menu", vol: 0.5 });
  });
  test("neither: silence", () => {
    expect(musicTrackFor(board, false, false)).toBe(null);
    expect(musicTrackFor({}, true, true)).toBe(null);
    expect(musicTrackFor(null, true, true)).toBe(null);
  });
});

/* A gold (Legendary) pickup is the standard pickup sound held three times as long — the same
   sound, not three copies of it, and not slowed down (a plain slow-down drops the pitch). */
describe("stretchChannels", () => {
  const sr = 44100;
  const tone = (hz, secs) => Float32Array.from({ length: Math.round(sr * secs) }, (_, i) => 0.6 * Math.sin((2 * Math.PI * hz * i) / sr));
  const crossings = (d, from, to) => { let c = 0; for (let i = from + 1; i < to; i++) if (d[i - 1] < 0 && d[i] >= 0) c++; return c; };
  test("the gold pickup holds the sound 3x as long", () => {
    expect(PICKUP_LEGENDARY_STRETCH).toBe(3);
  });
  test("comes out about factor times as long, finite, and no louder than it went in", () => {
    const src = tone(880, 0.88);
    const [out] = stretchChannels([src], sr, 3);
    expect(out.length).toBe(Math.ceil(src.length * 3));
    let peak = 0; for (const v of out) { expect(Number.isFinite(v)).toBe(true); peak = Math.max(peak, Math.abs(v)); }
    expect(peak).toBeLessThan(0.75);
    expect(peak).toBeGreaterThan(0.4);
  });
  test("keeps the pitch: the same number of cycles per second, not a third as many", () => {
    const src = tone(880, 0.88);
    const [out] = stretchChannels([src], sr, 3);
    const hz = (d) => crossings(d, Math.round(sr * 0.2), Math.round(sr * 0.6)) / 0.4;
    // the middle of the stretched sound, 0.6 s to 1.8 s in, measured over a second
    const mid = crossings(out, Math.round(sr * 0.6), Math.round(sr * 1.6)) / 1.0;
    expect(Math.abs(mid - hz(src))).toBeLessThan(hz(src) * 0.05);
  });
  test("a factor of 1 or less, and a clip too short to cut, come back unchanged", () => {
    const src = tone(440, 0.1);
    expect(stretchChannels([src], sr, 1)[0].length).toBe(src.length);
    expect(stretchChannels([src], sr, 0.5)[0].length).toBe(src.length);
    expect(stretchChannels([new Float32Array(10)], sr, 3)[0].length).toBe(10);
    expect(stretchChannels(null, sr, 3)).toEqual([]);
  });
  test("every channel is stretched to the same length", () => {
    const [l, r] = stretchChannels([tone(440, 0.3), tone(660, 0.3)], sr, 3);
    expect(l.length).toBe(r.length);
  });
});
