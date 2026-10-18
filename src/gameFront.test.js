// The game's front-end rules (src/gameFront.js). Fixtures only — never his library (CLAUDE.md:
// "A test must never pin his data").
import {
  isGameAddress, gameAddressFor, introRemainingMs, INTRO_MIN_MS, INTRO_BOB_AT_MS, GAME_MENU, menuStep, pickStartLook,
  makeGameSave, sortGameSaves, upsertGameSave, dropGameSave, GAME_SAVES_MAX, resumeNodeKey, formatPlayTime, scorePlaySecs,
  normalizeGameOptions, GAME_OPTIONS_DEFAULT, newGameRecord, normalizeGameRecord, recordFound, recordDefeated, recordFloorDone,
  unlockPool, createGameStore,
} from "./gameFront";
import fs from "fs";
import path from "path";

describe("the game's address", () => {
  test("the /game path, with or without a slash or index.html, on any base folder", () => {
    for (const p of ["/game", "/game/", "/game/index.html", "/BobAssetBuilder/game/", "/BobAssetBuilder/game"]) expect(isGameAddress({ pathname: p, search: "" })).toBe(true);
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
    expect(gameAddressFor({ origin: "https://cbm971.github.io", pathname: "/BobAssetBuilder/" })).toBe("https://cbm971.github.io/BobAssetBuilder/game/");
    expect(gameAddressFor({ origin: "http://localhost:3000", pathname: "/" })).toBe("http://localhost:3000/game/");
    expect(gameAddressFor({ origin: "http://localhost:3000", pathname: "/index.html" })).toBe("http://localhost:3000/game/");
  });
  test("public/index.html recognises the same addresses (its boot script copies the rule)", () => {
    const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    expect(html).toContain('/\\/game(\\/(index\\.html)?)?$/i');
    expect(html).toContain('id="bobIntro"');
    expect(html).toContain("Blake presents");
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
    expect(normalizeGameOptions({ music: 140, effects: -3 })).toEqual({ music: 100, effects: 0 });
    expect(normalizeGameOptions({ music: 33.4, effects: "x" })).toEqual({ music: 33, effects: GAME_OPTIONS_DEFAULT.effects });
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
