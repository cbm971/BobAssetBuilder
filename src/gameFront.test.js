// The game's front-end rules (src/gameFront.js). Fixtures only — never his library (CLAUDE.md:
// "A test must never pin his data").
import {
  isGameAddress, gameAddressFor, introRemainingMs, INTRO_MIN_MS, INTRO_BOB_AT_MS, GAME_MENU, menuStep, pickStartLook,
  makeGameSave, sortGameSaves, upsertGameSave, dropGameSave, GAME_SAVES_MAX, resumeNodeKey, formatPlayTime, scorePlaySecs,
  normalizeGameOptions, GAME_OPTIONS_DEFAULT, newGameRecord, normalizeGameRecord, recordFound, recordDefeated, recordFloorDone,
  unlockPool, createGameStore, starterLooks, selectGridCols, gridStep, DIFFICULTIES, difficultyOf, runLivesLeft, deathEndsRun,
  pickMenuLevel, sceneSurface, sceneTopRow, stepMenuWalker, MENU_SCENE_PROP_CAP, menuLevelScore, menuLevelLineup, sceneLevelFor, MENU_SCENE_VIEWS,
  starterLock, STARTER_LOCKS, starterStats, floorMark, lookFloorMedals, recordMet, starterRoster, selectGridFill,
} from "./gameFront";
import fs from "fs";
import path from "path";

describe("the game's address", () => {
  test("the /game path, with or without a slash or index.html, on any base folder", () => {
    for (const p of ["/game", "/game/", "/game/index.html", "/BobAssetBuilder/game/", "/BobAssetBuilder/game", "/bob", "/BobAssetBuilder/bob/", "/bob/index.html"]) expect(isGameAddress({ pathname: p, search: "" })).toBe(true);
  });
  test("?game works where a path cannot be chosen", () => {
    expect(isGameAddress({ pathname: "/", search: "?game" })).toBe(true);
    expect(isGameAddress({ pathname: "/", search: "?god&game=1" })).toBe(true);
  });
  test("the studio is not the game", () => {
    for (const [p, q] of [["/", ""], ["/BobAssetBuilder/", ""], ["/games/", ""], ["/endgame", ""], ["/", "?god"], ["/", "?gamer"]]) expect(isGameAddress({ pathname: p, search: q })).toBe(false);
    expect(isGameAddress(null)).toBe(false);
  });
  test("the studio's tile opens the game beside it", () => {
    expect(gameAddressFor({ origin: "https://cbm971.github.io", pathname: "/BobAssetBuilder/" })).toBe("https://cbm971.github.io/BobAssetBuilder/bob/");
    expect(gameAddressFor({ origin: "http://localhost:3000", pathname: "/" })).toBe("http://localhost:3000/bob/");
    expect(gameAddressFor({ origin: "http://localhost:3000", pathname: "/index.html" })).toBe("http://localhost:3000/bob/");
  });
  test("public/index.html recognises the same addresses (its boot script copies the rule)", () => {
    const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    expect(html).toContain('/\\/(bob|game)(\\/(index\\.html)?)?$/i');
    expect(html).toContain('id="bobIntro"');
    expect(html).toContain(">BLAKE Presents...<");
    expect(html).toContain("family=UnifrakturCook:wght@700");
    expect(html).toContain("Sarpanch:wght@700;900");
  });
});

describe("the title sequence", () => {
  test("Bob pops half a second after Blake presents is fully in", () => {
    expect(INTRO_BOB_AT_MS).toBe(250 + 1000 + 500);
  });
  test("the menu waits until Bob has been read, unless skipped", () => {
    expect(introRemainingMs(0, false)).toBe(INTRO_MIN_MS);
    expect(introRemainingMs(INTRO_MIN_MS + 50, false)).toBe(0);
    expect(introRemainingMs(100, true)).toBe(0);
    expect(introRemainingMs(-40, false)).toBe(INTRO_MIN_MS);
  });
  test("the index.html CSS timings match", () => {
    const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    expect(html).toMatch(/biFade 1s ease \.25s/);
    expect(html).toMatch(/biPop \.52s [^;]* 1\.75s/);
  });
});

describe("the main menu", () => {
  test("is Blake's list, in his order", () => {
    expect(GAME_MENU.map((m) => m.label)).toEqual(["New Game", "Load Game", "Options", "Unlocks", "Quit Game"]);
  });
  test("up/down wraps and skips disabled rows", () => {
    const rows = [{}, { disabled: true }, {}];
    expect(menuStep(rows, 0, 1)).toBe(2);
    expect(menuStep(rows, 2, 1)).toBe(0);
    expect(menuStep(rows, 0, -1)).toBe(2);
    expect(menuStep([], 0, 1)).toBe(0);
  });
});

describe("who New Game starts as", () => {
  const look = (id, name, category) => ({ id, type: "character", name, category });
  test("the Starter look named Bob", () => {
    expect(pickStartLook([look("a", "Bobby", "Starter"), look("b", "Bob", "Starter"), look("c", "Bob", "Army")]).id).toBe("b");
  });
  test("any look named Bob, then the first Starter, then any look", () => {
    expect(pickStartLook([look("a", "Bobby", "Starter"), look("c", " bob ", "")]).id).toBe("c");
    expect(pickStartLook([look("x", "Rob", ""), look("a", "Bobby", "starter")]).id).toBe("a");
    expect(pickStartLook([{ id: "w", type: "weapon", name: "Bob" }, look("x", "Rob", "")]).id).toBe("x");
    expect(pickStartLook([])).toBe(null);
  });
});

describe("saved games", () => {
  const base = { seed: "123", nodeKey: "n3", levelId: "L3", levelName: "Trailor Park M3", gateKey: "W2", lookId: "bob", hp: 12, wallet: 40, score: { total: 900, secs: { n1: 30, n2: 45.5 } }, objectives: { list: [{ id: "S1|3,4", text: "Go" }], done: new Set(["x"]) }, talkSpent: new Set(["t1"]), equipped: { hat: "h1", shirt: null } };
  test("a save is plain data: Sets become arrays, nothing shared with the live state", () => {
    const s = makeGameSave(null, { ...base, id: "g1" });
    expect(s.objectives.done).toEqual(["x"]);
    expect(s.talkSpent).toEqual(["t1"]);
    expect(s.equipped).toEqual({ hat: "h1", shirt: null });
    base.score.total = 1;
    expect(s.score.total).toBe(900);
    base.score.total = 900;
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
  test("a checkpoint keeps its game's id and start", () => {
    const first = makeGameSave(null, { ...base, id: "g1", startedAt: 5 });
    const next = makeGameSave(first, { ...base, id: "other", startedAt: 99, nodeKey: "n4" });
    expect(next.id).toBe("g1");
    expect(next.startedAt).toBe(5);
    expect(next.nodeKey).toBe("n4");
  });
  test("the list is newest first, one row per game, capped", () => {
    const saves = [];
    for (let i = 0; i < GAME_SAVES_MAX + 3; i++) saves.push({ id: "g" + i, savedAt: i });
    saves.push({ id: "g2", savedAt: 1000 });
    const out = sortGameSaves(saves);
    expect(out.length).toBe(GAME_SAVES_MAX);
    expect(out[0]).toEqual({ id: "g2", savedAt: 1000 });
    expect(out.filter((s) => s.id === "g2").length).toBe(1);
    expect(upsertGameSave(out, { id: "g5", savedAt: 2000 })[0].id).toBe("g5");
    expect(dropGameSave(out, "g2").some((s) => s.id === "g2")).toBe(false);
  });
  test("a load resumes at its node, or wherever its level went, or nowhere", () => {
    const run = { nodes: { n1: { key: "n1", level: { id: "L1" } }, n2: { key: "n2", level: { id: "L3" } } } };
    expect(resumeNodeKey(run, { nodeKey: "n2", levelId: "L3" })).toBe("n2");
    expect(resumeNodeKey(run, { nodeKey: "n7", levelId: "L3" })).toBe("n2");
    expect(resumeNodeKey(run, { nodeKey: "n1", levelId: "L3" })).toBe("n2"); // n1 now holds another level
    expect(resumeNodeKey(run, { nodeKey: "n9", levelId: "L9" })).toBe(null);
    expect(resumeNodeKey(null, {})).toBe(null);
  });
  test("play time", () => {
    expect(formatPlayTime(0)).toBe("0:00");
    expect(formatPlayTime(75.6)).toBe("1:15");
    expect(formatPlayTime(3729)).toBe("1:02:09");
    expect(scorePlaySecs({ secs: { a: 30, b: 45.5 } })).toBe(75.5);
    expect(scorePlaySecs(null)).toBe(0);
  });
});

describe("options", () => {
  test("volumes are whole percents, 0-100, defaulted", () => {
    expect(normalizeGameOptions(null)).toEqual(GAME_OPTIONS_DEFAULT);
    expect(normalizeGameOptions({ music: 140, effects: -3 })).toEqual({ music: 100, effects: 0, difficulty: "medium" });
    expect(normalizeGameOptions({ music: 33.4, effects: "x" })).toEqual({ music: 33, effects: GAME_OPTIONS_DEFAULT.effects, difficulty: "medium" });
  });
});

describe("unlocks", () => {
  test("found and defeated grow once per id; kills count every time", () => {
    let r = newGameRecord();
    r = recordFound(r, "a");
    expect(recordFound(r, "a")).toBe(r); // unchanged: the caller skips the write
    r = recordDefeated(recordDefeated(r, "dog"), "dog");
    expect(r.defeated).toEqual(["dog"]);
    expect(r.kills).toBe(2);
    r = recordFloorDone(r, "Trailor Park", 5000);
    r = recordFloorDone(r, "Trailor Park", 3000);
    expect(r.floors).toEqual(["Trailor Park"]);
    expect(r.bestScore).toBe(5000);
  });
  test("a stored record is cleaned on the way in", () => {
    expect(normalizeGameRecord({ found: ["a", "a", 3, ""], kills: "7", bestScore: -2 })).toEqual({ ...newGameRecord(), found: ["a"], kills: 7, bestScore: 0 });
    expect(normalizeGameRecord("junk")).toEqual(newGameRecord());
  });
  test("the tabs list what can be carried, and what can be fought", () => {
    const assets = [
      { id: "1", type: "weapon", name: "Bat" }, { id: "2", type: "projectile", name: "Bullet" }, { id: "3", type: "equipment", name: "Hat" },
      { id: "4", type: "item", name: "Beer" }, { id: "5", type: "prop", name: "Tree" }, { id: "6", type: "enemy", name: "Squirrel" }, { id: "7", type: "character", name: "Bob" },
    ];
    expect(unlockPool(assets, "items").map((a) => a.name)).toEqual(["Bat", "Beer", "Hat"]);
    expect(unlockPool(assets, "enemies").map((a) => a.name)).toEqual(["Bob", "Squirrel"]);
  });
});

describe("the game's store", () => {
  test("with no IndexedDB it still keeps values for the session", async () => {
    const st = createGameStore(null);
    expect(await st.get("game:saves")).toBe(null);
    expect(await st.set("game:saves", [{ id: "g1" }])).toBe(false); // nothing durable to write to
    expect(await st.get("game:saves")).toEqual([{ id: "g1" }]);
  });
});

describe("the character select (2026-10-18)", () => {
  const look = (id, name, category) => ({ id, type: "character", name, category });
  test("the roster is every look filed under Starter, Bob first, then by name", () => {
    const r = starterLooks([look("1", "Rob", "Starter"), look("2", "Bobette", " starter "), look("3", "Bob", "Starter"), look("4", "Army Bob", "Army"), { id: "5", type: "weapon", name: "Bob", category: "Starter" }]);
    expect(r.map((a) => a.name)).toEqual(["Bob", "Bobette", "Rob"]);
    expect(starterLooks([])).toEqual([]);
  });
  test("the grid is never wider than six and fits seven as 4 + 3", () => {
    expect(selectGridCols(7)).toBe(4);
    expect(selectGridCols(1)).toBe(2);
    expect(selectGridCols(40)).toBe(6);
  });
  test("arrows: left/right wrap the list, up/down keep the column and land in a short last row", () => {
    expect(gridStep(7, 4, 3, 1, 0)).toBe(4);
    expect(gridStep(7, 4, 0, -1, 0)).toBe(6);
    expect(gridStep(7, 4, 1, 0, 1)).toBe(5);
    expect(gridStep(7, 4, 3, 0, 1)).toBe(6);
    expect(gridStep(7, 4, 5, 0, 1)).toBe(1);
    expect(gridStep(0, 4, 0, 1, 0)).toBe(0);
  });
});

describe("difficulty (Blake: Easy 4 lives, Medium 2, Hard 1)", () => {
  test("the lives", () => {
    expect(DIFFICULTIES.map((d) => [d.id, d.lives])).toEqual([["easy", 4], ["medium", 2], ["hard", 1]]);
    expect(difficultyOf("nope").id).toBe("medium");
  });
  test("Hard ends the run on the first death, Medium on the second, Easy on the fourth", () => {
    expect(deathEndsRun("hard", 0)).toBe(true);
    expect(deathEndsRun("medium", 0)).toBe(false);
    expect(deathEndsRun("medium", 1)).toBe(true);
    expect([0, 1, 2, 3].map((n) => deathEndsRun("easy", n))).toEqual([false, false, false, true]);
  });
  test("lives left counts the one being played", () => {
    expect(runLivesLeft("hard", 0)).toBe(1);
    expect(runLivesLeft("easy", 1)).toBe(3);
    expect(runLivesLeft("medium", 5)).toBe(0);
  });
  test("a save keeps the difficulty and the deaths; an old save without them is Medium with none lost", () => {
    const s = makeGameSave(null, { seed: "7", difficulty: "hard", deaths: 0 });
    expect([s.difficulty, s.deaths]).toEqual(["hard", 0]);
    const t = makeGameSave(s, { seed: "7", deaths: 1.2 });
    expect([t.difficulty, t.deaths]).toEqual(["hard", 1]);
    expect(makeGameSave(null, { seed: "7" }).difficulty).toBe("medium");
  });
  test("🍄 a One Up is one more life of the run, and the save keeps it", () => {
    expect(runLivesLeft("hard", 0, 1)).toBe(2);
    expect(runLivesLeft("medium", 2, 1)).toBe(1);
    expect(runLivesLeft("hard", 0, undefined)).toBe(1); // an old save, a studio caller
    expect(deathEndsRun("hard", 0, 1)).toBe(false);   // Hard with one picked up survives the first death...
    expect(deathEndsRun("hard", 1, 1)).toBe(true);    // ...and not the second
    expect(makeGameSave(null, { seed: "7", oneUps: 2 }).oneUps).toBe(2);
    expect(makeGameSave(null, { seed: "7" }).oneUps).toBe(0);
  });
  test("options remember the difficulty last started with", () => {
    expect(normalizeGameOptions({ music: 10, effects: 20, difficulty: "easy" }).difficulty).toBe("easy");
    expect(normalizeGameOptions({ difficulty: "insane" }).difficulty).toBe("medium");
  });
});

describe("the menu's backdrop scene", () => {
  const lv = (id, extra) => ({ id, name: id, floor: "Park", cols: 60, rows: 30, fx: {}, enemies: {}, ...extra });
  const fx = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => ["1," + i, [{ kind: "prop" }]]));
  test("a street level of the main floor, never a room or a sewer, busiest first", () => {
    const levels = [lv("room", { isRoom: true, cols: 40, rows: 24, enemies: { a: 1, b: 1, c: 1 } }), lv("sewer", { floor: "Sewer", enemies: { a: 1, b: 1, c: 1, d: 1 } }), lv("quiet"), lv("busy", { enemies: { a: 1, b: 1 } }), lv("other", { floor: "Elsewhere" })];
    expect(pickMenuLevel(levels, () => 0).id).toBe("busy");
    expect(pickMenuLevel([], () => 0)).toBe(null);
  });
  test("a church full of props does not outrank a street full of people", () => {
    const levels = [lv("church", { fx: fx(MENU_SCENE_PROP_CAP + 200) }), lv("street", { fx: fx(MENU_SCENE_PROP_CAP - 10), enemies: { a: 1, b: 1, c: 1 } })];
    expect(pickMenuLevel(levels, () => 0).id).toBe("street");
  });
  test("his drawn props count three times an emoji, and only 40 emoji count at all", () => {
    const emoji = Object.fromEntries(Array.from({ length: 90 }, (_, i) => ["2," + i, [{ kind: "emoji" }]]));
    expect(menuLevelScore(lv("e", { fx: emoji }))).toBe(40);
    expect(menuLevelScore(lv("p", { fx: fx(10) }))).toBe(30);
  });
  test("every screen gets its own level, best first, wrapping when there are fewer levels", () => {
    const levels = [lv("a", { fx: fx(1) }), lv("b", { fx: fx(5) }), lv("c", { fx: fx(3) })];
    const line = menuLevelLineup(levels);
    expect(line.map((l) => l.id)).toEqual(["b", "c", "a"]);
    expect(sceneLevelFor(line, "menu").id).toBe("b");
    expect(sceneLevelFor(line, "select").id).toBe("c");
    expect(sceneLevelFor(line, "load").id).toBe("a");
    expect(sceneLevelFor(line, "options").id).toBe("b");
    expect(sceneLevelFor(line, "nope").id).toBe("b");
    expect(sceneLevelFor([], "menu")).toBe(null);
    expect(new Set(MENU_SCENE_VIEWS).size).toBe(MENU_SCENE_VIEWS.length);
  });
  test("the surface is the first ground with a body's height of air over it", () => {
    // Column 0: ground at row 20. Column 1: a canopy at row 5 with only 3 rows over it, ground at 20.
    // Column 2: a roof at row 10 with open sky over it is stood on, never the floor 3 rows under it.
    const solid = new Set(["20,0", "21,0", "2,1", "20,1", "10,2", "14,2"]);
    const s = sceneSurface(24, 3, (r, c) => solid.has(r + "," + c), 7);
    expect(s).toEqual([20, 20, 10]);
  });
  test("the view puts the ground about three-quarters down, inside the level", () => {
    expect(sceneTopRow([30, 30, 31, null], 46, 29)).toBe(8);
    expect(sceneTopRow([44], 46, 29)).toBe(17);
    expect(sceneTopRow([3], 46, 29)).toBe(0);
  });
  test("a walker walks, follows a one-row step, and turns at a cliff", () => {
    const surface = [null, 10, 10, 10, 11, 11, 20, 20];
    let w = { x: 75, foot: 300, dir: 1, speed: 30, idle: 0, phase: 0 };
    w = stepMenuWalker(w, 1, surface, 30, () => 0.9);
    expect(w.x).toBe(105);
    expect(w.walking).toBe(true);
    expect(w.foot).toBe(300);
    w = stepMenuWalker({ ...w, x: 115 }, 1, surface, 30, () => 0.9);
    expect(w.foot).toBe(330); // eased onto the lower row (dt*12 >= 1)
    const t = stepMenuWalker({ ...w, x: 175 }, 1, surface, 30, () => 0.9);
    expect(t.dir).toBe(-1);
    expect(t.x).toBe(175);
    const idle = stepMenuWalker({ ...w, idle: 0.5 }, 0.2, surface, 30, () => 0.9);
    expect(idle.idle).toBeCloseTo(0.3);
    expect(idle.x).toBe(w.x);
  });
});

describe("locked starters", () => {
  const look = (name) => ({ id: name, type: "character", category: "Starter", name });
  const items = Array.from({ length: 60 }, (_, i) => ({ id: "i" + i, type: i % 2 ? "weapon" : "equipment", name: "Item " + i }));
  const assets = [...items, { id: "dog", type: "enemy", name: "Dog" }];
  test("Bob and the rest are open from the start (Rob is not)", () => {
    for (const n of ["Bob", "Bobette", "Bobbi"]) expect(starterLock(look(n), newGameRecord(), assets)).toBeNull();
  });
  test("Bobby opens on Trailor Park, by anyone, either spelling", () => {
    expect(starterLock(look("Bobby"), newGameRecord(), assets).need).toBe("Complete Trailor Park");
    expect(starterLock(look("Bobby"), recordFloorDone(newGameRecord(), "Trailor Park", 10, "Bobette"), assets)).toBeNull();
    expect(starterLock(look("bobby"), recordFloorDone(newGameRecord(), "Trailer park", 10, "Bob"), assets)).toBeNull();
    expect(starterLock(look("Bobby"), recordFloorDone(newGameRecord(), "Sewer", 10, "Bob"), assets)).not.toBeNull();
  });
  test("Bobert opens at 50 ITEMS found; enemies and repeats do not count", () => {
    let r = newGameRecord();
    for (let i = 0; i < 49; i++) r = { ...r, found: [...r.found, "i" + i] };
    r = { ...r, found: [...r.found, "dog", "i0"] };
    expect(starterLock(look("Bobert"), r, assets)).toEqual({ need: "Unlock 50 Items", have: 49, of: 50 });
    r = { ...r, found: [...r.found, "i55"] };
    expect(starterLock(look("Bobert"), r, assets)).toBeNull();
  });
  test("Roberta opens only on Trailor Park finished AS Rob", () => {
    let r = recordFloorDone(newGameRecord(), "Trailor Park", 10, "Bob");
    expect(starterLock(look("Roberta"), r, assets).need).toBe("Complete Trailor Park as Rob");
    r = recordFloorDone(r, "Trailor Park", 10, "Rob");
    expect(r.floorsWith).toEqual({ "Trailor Park": ["bob", "rob"] });
    expect(starterLock(look("Roberta"), r, assets)).toBeNull();
    expect(STARTER_LOCKS.map((l) => l.name)).toEqual(["bobby", "bobert", "roberta", "rob", "viet bob", "bob li"]);
  });
  test("Rob is locked until the Trailor Park is beaten on Hard, by anyone", () => {
    let r = newGameRecord();
    expect(starterLock(look("Rob"), r, assets).need).toBe("Complete Trailor Park on Hard");
    r = recordFloorDone(r, "Trailor Park", 10, "Bob", "easy");
    r = recordFloorDone(r, "Trailor Park", 10, "Bob", "medium");
    expect(starterLock(look("Rob"), r, assets)).not.toBeNull();
    expect(starterLock(look("Rob"), recordFloorDone(newGameRecord(), "Sewer", 10, "Bob", "hard"), assets)).not.toBeNull();
    r = recordFloorDone(r, "Trailer Park", 10, "Bobette", "hard");
    expect(starterLock(look("Rob"), r, assets)).toBeNull();
  });
  test("Viet Bob is locked until Vietnam is beaten on Hard, and VietBob is the same fighter", () => {
    let r = recordFloorDone(newGameRecord(), "Vietnam", 10, "Bob", "medium");
    expect(starterLock(look("Viet Bob"), r, assets).need).toBe("Complete Vietnam on Hard");
    expect(starterLock(look("VietBob"), r, assets)).not.toBeNull();
    expect(starterLock(look("Viet Bob"), recordFloorDone(r, "Trailor Park", 10, "Bob", "hard"), assets)).not.toBeNull();
    r = recordFloorDone(r, "Vietnam", 10, "Rob", "hard");
    expect(starterLock(look("Viet Bob"), r, assets)).toBeNull();
    expect(starterLock(look("VietBob"), r, assets)).toBeNull();
  });
  test("Bob Li opens once the Bob Li conversation has been met, and the record keeps it", () => {
    let r = newGameRecord();
    expect(starterLock(look("Bob Li"), r, assets).need).toBe("Meet Bob Li");
    r = recordMet(r, "Chun Bobette");
    expect(starterLock(look("Bob Li"), r, assets)).not.toBeNull();
    r = recordMet(r, " Bob Li ");
    expect(r.met).toEqual(["chun bobette", "bob li"]);
    expect(recordMet(r, "bob li")).toBe(r);
    expect(starterLock(look("Bob Li"), r, assets)).toBeNull();
    expect(normalizeGameRecord(JSON.parse(JSON.stringify(r))).met).toEqual(r.met);
    expect(normalizeGameRecord({ floors: [] }).met).toEqual([]);
  });
  test("the select lists open fighters first (Bob, then A to Z), then the locked ones A to Z", () => {
    const roster = ["Rob", "Viet Bob", "Bobette", "Bob Li", "Bobby", "Bob", "Bobert", "Roberta", "Bobbi"].map(look);
    let r = newGameRecord();
    expect(starterRoster([...assets, ...roster], r).map((a) => a.name)).toEqual(["Bob", "Bobbi", "Bobette", "Bob Li", "Bobby", "Bobert", "Rob", "Roberta", "Viet Bob"]);
    r = recordFloorDone(recordMet(r, "Bob Li"), "Trailor Park", 10, "Bob", "easy");
    expect(starterRoster([...assets, ...roster], r).map((a) => a.name)).toEqual(["Bob", "Bob Li", "Bobbi", "Bobby", "Bobette", "Bobert", "Rob", "Roberta", "Viet Bob"]);
  });
  test("Coming Soon boxes finish a short last row, and only that", () => {
    expect(selectGridFill(9, 5)).toBe(1);
    expect(selectGridFill(7, 4)).toBe(1);
    expect(selectGridFill(8, 4)).toBe(0);
    expect(selectGridFill(1, 2)).toBe(1);
    expect(selectGridFill(0, 4)).toBe(0);
  });
  test("a floor remembers the hardest difficulty each fighter beat it on", () => {
    let r = recordFloorDone(newGameRecord(), "Trailor Park", 10, "Bob", "hard");
    r = recordFloorDone(r, "Trailor Park", 10, "Bob", "easy");
    r = recordFloorDone(r, "Trailor Park", 10, "Rob", "medium");
    expect(r.floorsDiff).toEqual({ "Trailor Park": { bob: 3, rob: 2 } });
    expect(normalizeGameRecord(r).floorsDiff).toEqual(r.floorsDiff);
    expect(normalizeGameRecord({ floorsDiff: { "Trailor Park": { bob: 9, rob: "x", "": 2 } } }).floorsDiff).toEqual({});
  });
  test("an old record with no floorsWith still loads, and a stored one survives", () => {
    expect(normalizeGameRecord({ floors: ["Trailor Park"] }).floorsWith).toEqual({});
    expect(normalizeGameRecord({ floorsWith: { "Trailor Park": ["rob", 4, "rob"], "": ["x"] } }).floorsWith).toEqual({ "Trailor Park": ["rob"] });
  });
});

describe("the character select's player card", () => {
  test("starting stats read like the HUD: unset is 5, zero stays zero, DEF is the look's defense", () => {
    const s = starterStats({ stats: { hp: 7, strength: 2, speed: 0 }, defense: 3.4 });
    expect(s.map((x) => x.l)).toEqual(["HP", "STR", "DEF", "SPD", "AGI", "INT"]);
    expect(s.map((x) => x.v)).toEqual([7, 2, 3, 0, 5, 5]);
    expect(starterStats({}).find((x) => x.l === "DEF").v).toBe(0);
  });
  test("a floor's mark is its first letter: T for the Trailor Park", () => {
    expect(floorMark("Trailor Park")).toBe("T");
    expect(floorMark("  vietnam")).toBe("V");
    expect(floorMark("")).toBe("?");
  });
  test("medals are beaten AS THIS look, by name, in the run's floor order, either spelling", () => {
    let r = recordFloorDone(newGameRecord(), "Trailer Park", 10, "Rob");
    r = recordFloorDone(r, "Vietnam", 10, "Bob");
    expect(lookFloorMedals(r, "Rob", ["Trailor Park", "Vietnam"])).toEqual([
      { floor: "Trailor Park", mark: "T", done: true, diff: "easy" },
      { floor: "Vietnam", mark: "V", done: false, diff: null },
    ]);
    expect(lookFloorMedals(r, "bob", ["Trailor Park"])).toEqual([
      { floor: "Trailor Park", mark: "T", done: false, diff: null },
      { floor: "Vietnam", mark: "V", done: true, diff: "easy" },
    ]);
    // the T is outlined by the hardest difficulty this look beat the floor on
    let d = recordFloorDone(newGameRecord(), "Trailor Park", 10, "Bob", "medium");
    expect(lookFloorMedals(d, "Bob", ["Trailor Park"])[0].diff).toBe("medium");
    d = recordFloorDone(d, "Trailor Park", 10, "Bob", "hard");
    expect(lookFloorMedals(d, "Bob", ["Trailor Park"])[0].diff).toBe("hard");
    expect(lookFloorMedals(d, "Rob", ["Trailor Park"])[0].diff).toBeNull();
    expect(lookFloorMedals(null, "Bob", [])).toEqual([]);
  });
});
