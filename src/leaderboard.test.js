import {
  cleanName, nameAllowed, maskName, LB_MASK, cleanScore, cleanPost, cleanBoard, runToken, scoreBucket, boardRows, leaderboardUrl, createLeaderboard,
  normalizeLbMemory, rememberLbPost, LB_NAME_MAX, LB_SCORE_MAX, LB_BUCKET, LEADERBOARD_BOARD,
} from "./leaderboard";
import { gameMenuRows, GAME_MENU, MENU_SCENE_VIEWS } from "./gameFront";

describe("leaderboard names", () => {
  test("a name is trimmed, single-spaced and cut to the limit", () => {
    expect(cleanName("  Big   Bob  ")).toBe("Big Bob");
    expect(cleanName("ABCDEFGHIJKLMNOPQRSTUVWXYZ")).toHaveLength(LB_NAME_MAX);
    expect(cleanName(null)).toBe("");
  });
  test("emoji, markup and stacked marks are dropped; letters of any language stay", () => {
    expect(cleanName("Bob\u{1F600}")).toBe("Bob");
    expect(cleanName("<b>x</b>")).toBe("bxb");
    expect(cleanName("Zóe")).toBe("Zóe");    // an accent that composes stays
    expect(cleanName("B̶̷̸ob")).toBe("Bob"); // stacked marks go
    expect(cleanName("José Müller")).toBe("José Müller");
    expect(cleanName("Ｂｏｂ")).toBe("Bob"); // full-width folds to plain
  });
  test("a racial or hate slur turns to ****, ordinary words that contain one do not (Blake, 2026-11-28)", () => {
    for (const ok of ["Blake", "Spicy Bob", "Cocoon", "Therapist", "Shinigami", "Torpedo", "Big Bob", "Zóe", "Rob!", "Snigdha"]) expect(maskName(ok)).toBe(cleanName(ok));
    expect(LB_MASK).toBe("****");
    expect(maskName("n1gg3r")).toBe("****");
    expect(maskName("big fag")).toBe("big ****");
    expect(maskName("HITLER99")).toBe("****");
    expect(maskName("Bob the n.1.g.g.a")).toBe("Bob the ****");
    expect(maskName("n 1 g g 3 r")).toBe("**** 3 r");    // the letters that spell it go; one **** for the lot
    expect(maskName("Spic Bob")).toBe("**** Bob");
    expect(maskName("Spicy Bob")).toBe("Spicy Bob");
    expect(maskName("****")).toBe("****");               // masking twice changes nothing (stored, then read)
    expect(maskName("Holy shit")).toBe("Holy shit");        // swearing stays: racism and hate speech only
    expect(maskName("")).toBe("");
    // a name is only ever refused for being empty now
    expect(nameAllowed("n1gg3r")).toBe(true);
    expect(nameAllowed("  ")).toBe(false);
  });
});

describe("leaderboard posts", () => {
  test("a score must be a whole number in range", () => {
    expect(cleanScore(1234.4)).toBe(1234);
    expect(cleanScore(-1)).toBe(null);
    expect(cleanScore(LB_SCORE_MAX + 1)).toBe(null);
    expect(cleanScore("x")).toBe(null);
  });
  test("a post needs a name, a score and a run token", () => {
    const p = cleanPost({ name: " Rob ", score: 900, run: "gabc:seed1", look: "Bob", difficulty: "hard", floor: "Vietnam", secs: 61.6 });
    expect(p).toEqual({ board: LEADERBOARD_BOARD, run: "gabc:seed1", name: "Rob", score: 900, look: "Bob", difficulty: "hard", floor: "Vietnam", secs: 62 });
    expect(cleanPost({ name: "", score: 900, run: "r" })).toBe(null);
    expect(cleanPost({ name: "Rob", score: 900, run: "" })).toBe(null);
    expect(cleanPost({ name: "Rob", score: -5, run: "r" })).toBe(null);
  });
  test("the run token is the save id and seed", () => {
    expect(runToken("gk3x9", "a1b2")).toBe("gk3x9:a1b2");
    expect(runToken("gk3x9", "")).toBe("gk3x9");
    expect(runToken("g<1>", "s s")).toBe("g1:ss");
  });
  test("boards are lower-case keys, the Beta's by default", () => {
    expect(cleanBoard("")).toBe(LEADERBOARD_BOARD);
    expect(cleanBoard("V1!")).toBe("v1");
  });
  // worker.js counts ranks inside a bucket of LB_BUCKET points and schema.sql's triggers file each
  // entry under score / 100; the two must agree or every rank is off.
  test("the server's bucket triggers use the same width as the rules", () => {
    const sql = require("fs").readFileSync(require("path").join(__dirname, "..", "leaderboard", "schema.sql"), "utf8");
    const widths = [...sql.matchAll(/score \/ (\d+)/g)].map((m) => Number(m[1]));
    expect(widths.length).toBeGreaterThanOrEqual(3);
    expect(new Set(widths)).toEqual(new Set([LB_BUCKET]));
    expect(scoreBucket(1999)).toBe(19);
  });
});

describe("the board's rows", () => {
  const e = (rank, score, id = rank) => ({ id, name: "P" + rank, score, rank });
  const top = Array.from({ length: 10 }, (_, i) => e(i + 1, 1000 - i * 10));
  test("in the top ten: the ten, yours lit, no gap", () => {
    const rows = boardRows({ top, me: e(4, 970), above: [e(2, 990), e(3, 980)], below: [e(5, 960), e(6, 950)] });
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(rows.filter((r) => r.me).map((r) => r.rank)).toEqual([4]);
    expect(rows.some((r) => r.gap)).toBe(false);
  });
  test("further down: the top five, a gap, then two above, you, two below", () => {
    const rows = boardRows({ top, me: e(40, 500, 99), above: [e(38, 520), e(39, 510)], below: [e(41, 490), e(42, 480)] });
    expect(rows.map((r) => (r.gap ? "gap" : r.rank))).toEqual([1, 2, 3, 4, 5, "gap", 38, 39, 40, 41, 42]);
    expect(rows.find((r) => r.me).rank).toBe(40);
  });
  test("just under the top: no gap where the rows meet", () => {
    const rows = boardRows({ top, me: e(8 + 0, 930), above: [], below: [] });
    expect(rows.some((r) => r.gap)).toBe(false);
    const near = boardRows({ top, me: e(13, 880, 99), above: [e(11, 900), e(12, 890)], below: [e(14, 870)] });
    expect(near.map((r) => (r.gap ? "gap" : r.rank))).toEqual([1, 2, 3, 4, 5, "gap", 11, 12, 13, 14]);
    const meets = boardRows({ top, me: e(7 + 5, 890, 99), above: [e(10, 910), e(11, 900)], below: [] });
    expect(meets.map((r) => (r.gap ? "gap" : r.rank))).toEqual([1, 2, 3, 4, 5, "gap", 10, 11, 12]);
  });
  test("an empty or missing answer draws nothing", () => {
    expect(boardRows(null)).toEqual([]);
    expect(boardRows({ top: [], me: null })).toEqual([]);
  });
});

describe("the game's side", () => {
  test("the address comes from ?lb, then the stored test address, then the built-in one", () => {
    expect(leaderboardUrl({ search: "?lb=http://127.0.0.1:8787/" }, () => "")).toBe("http://127.0.0.1:8787");
    expect(leaderboardUrl({ search: "" }, () => "https://x.workers.dev")).toBe("https://x.workers.dev");
    expect(leaderboardUrl({ search: "?lb=javascript:alert(1)" }, () => "")).toBe("");
  });
  test("with no address it is off and never calls out", async () => {
    const fetchImpl = jest.fn();
    const lb = createLeaderboard("", fetchImpl);
    expect(lb.enabled).toBe(false);
    expect((await lb.view()).ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  test("a post sends the cleaned run to /scores and hands back the board", async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ total: 3, top: [], me: { id: 7, rank: 2 } }) }));
    const lb = createLeaderboard("https://lb.test", fetchImpl);
    const r = await lb.post({ name: " Rob ", score: 1500, run: "g1:s", look: "Bob", difficulty: "easy", floor: "Vietnam", secs: 300 });
    expect(r.ok).toBe(true);
    expect(r.me.rank).toBe(2);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://lb.test/scores");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({ board: LEADERBOARD_BOARD, name: "Rob", score: 1500, run: "g1:s" });
  });
  test("a slur leaves the game already masked; a dead network is an answer, not a throw", async () => {
    const fetchImpl = jest.fn(async () => { throw new Error("down"); });
    const lb = createLeaderboard("https://lb.test", fetchImpl);
    expect(await lb.post({ name: "big n1gg3r", score: 10, run: "r" })).toEqual({ ok: false, error: "offline" });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).name).toBe("big ****");
    expect(await lb.view(5)).toEqual({ ok: false, error: "offline" });
    expect(fetchImpl.mock.calls[1][0]).toBe("https://lb.test/scores?board=" + LEADERBOARD_BOARD + "&around=5");
  });
  test("a server refusal comes back as its error", async () => {
    const lb = createLeaderboard("https://lb.test", async () => ({ ok: false, status: 429, json: async () => ({ error: "wait" }) }));
    expect(await lb.post({ name: "Rob", score: 10, run: "r" })).toEqual({ ok: false, error: "wait" });
  });
  test("the game remembers the last name and its best post per board", () => {
    let m = normalizeLbMemory(undefined);
    expect(m).toEqual({ name: "", best: {} });
    m = rememberLbPost(m, "beta", "Rob", { id: 4, score: 900 });
    m = rememberLbPost(m, "beta", "Robby", { id: 9, score: 400 });
    expect(m).toEqual({ name: "Robby", best: { beta: { id: 4, score: 900 } } });
    m = rememberLbPost(m, "beta", "Robby", { id: 12, score: 1200 });
    expect(m.best.beta).toEqual({ id: 12, score: 1200 });
    expect(normalizeLbMemory({ name: 5, best: { beta: { id: "x", score: 1 } } })).toEqual({ name: "5", best: {} });
  });
  test("the main menu gets Leaderboard before Quit Game only when there is a board", () => {
    expect(gameMenuRows(false)).toBe(GAME_MENU);
    expect(gameMenuRows(true).map((m) => m.label)).toEqual(["New Game", "Load Game", "Options", "Unlocks", "Leaderboard", "Quit Game"]);
    expect(MENU_SCENE_VIEWS).toContain("leaderboard");
  });
});
