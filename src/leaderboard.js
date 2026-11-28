// THE LEADERBOARD (2026-11-28). Blake: "after a run you type a name to be posted on a public
// leaderboard that keeps track of all scores and it kind of shows you your current place on that
// leaderboard. I want the same leaderboard to show up for me as it would for someone playing in a
// different state."
//
// One board for every copy of the game in the world needs one place on the internet that holds it,
// so the scores live in a tiny web service of their own: leaderboard/worker.js, a Cloudflare Worker
// with a D1 (SQLite) database behind it (free tier: 5 GB, so tens of millions of entries, and it
// never goes to sleep the way some free databases do). The game only ever calls it over HTTPS:
// GET /scores for the board, POST /scores to add a run. Nothing here touches his library, the keeper
// or the `saves` branch — a player's score is the player's, not his studio data.
//
// THIS FILE IS SHARED. The worker imports the same rules (what a name may be, the score's range, how
// a run is keyed) so the game and the server can never disagree about them; the client calls at the
// bottom are the game's side. No React and nothing that reads `window` at import time: the worker
// runs it too.
//
// Every run is kept — the board is all of history, not a top 100 — and a run posts ONCE (its token
// is unique on the server, so a double Enter or a reload of the same screen returns the first post).

// The address of the service: the Worker on Blake's Cloudflare account (deployed 2026-11-28,
// leaderboard/README.md). Empty = no leaderboard: the game shows no name box and no menu row, and
// plays exactly as before.
export const LEADERBOARD_URL = "https://bob-leaderboard.bob-leaderboard.workers.dev";
// Which board a post goes to. The Beta (two floors) has its own; a full release with more floors
// would score higher for the same play, so it gets a fresh board ("v1") and the Beta's stays as it was.
export const LEADERBOARD_BOARD = "beta";

export const LB_NAME_MAX = 16;          // characters on the board
export const LB_SCORE_MAX = 5000000;    // far above any real run (a kill is 100, a level 500); a typed-in 999999999 is refused
export const LB_TOP_N = 10;             // rows on the board
export const LB_NEAR = 2;               // rows above and below yours when you are off the top
export const LB_BUCKET = 100;           // score bucket width the server counts ranks by (worker.js: rank without a full scan)
export const LB_POST_GAP_MS = 10000;    // one post per player per 10 s

// ---------- names ----------
// Letters and digits of any language, spaces and a little punctuation, at most LB_NAME_MAX. No emoji
// (the menus draw none) and no combining marks (stacked "zalgo" text would climb over the rows).
const NAME_DROP = /[^\p{L}\p{N} .'_!?&-]/gu;
export const cleanName = (s) => {
  let t = String(s == null ? "" : s).normalize("NFKC").replace(/\p{M}/gu, "").replace(NAME_DROP, "").replace(/\s+/g, " ").trim();
  t = Array.from(t).slice(0, LB_NAME_MAX).join("").trim();
  return t;
};
// A public board gets slurs typed into it on day one. The worst are refused outright (the game shows
// its one ⚠ line); anything else that gets through, Blake removes (tools/leaderboard.js remove <id>).
// Stored base64 so the words themselves do not sit in his source. Matched on the name squashed to
// plain letters with the usual stand-ins undone (n1gg3r, f@g), as a part of a word for the long
// stems and as a whole word for the short ones (so "Spicy" and "Cocoon" stay fine).
const b64 = (s) => (typeof atob === "function" ? atob(s) : Buffer.from(s, "base64").toString("binary"));
// (Stems that sit inside ordinary words were left out on purpose: "therapist", "torpedo", "Shinigami".)
const BLOCK_STEMS = ["bmlnZw==", "ZmFnZ290", "a2lrZQ==", "Y2hpbms=", "dHJhbm55", "aGl0bGVy", "bmF6aQ=="].map(b64);
const BLOCK_WORDS = ["ZmFn", "ZmFncw==", "c3BpYw==", "Y29vbg==", "a2tr", "cmFwZQ=="].map(b64);
const UNLEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s", "!": "i" };
const unleet = (s) => String(s).toLowerCase().replace(/[013457@$!]/g, (c) => UNLEET[c] || c);
export const nameAllowed = (name) => {
  const n = cleanName(name);
  if (!n) return false;
  const squashed = unleet(n).replace(/[^a-z]/g, "");
  if (BLOCK_STEMS.some((w) => squashed.includes(w))) return false;
  const words = unleet(n).split(/[^a-z]+/).filter(Boolean);
  return !words.some((w) => BLOCK_WORDS.includes(w));
};

// ---------- the rest of a post ----------
export const cleanScore = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= LB_SCORE_MAX ? n : null;
};
export const scoreBucket = (score) => Math.floor(Math.max(0, score) / LB_BUCKET);
export const cleanBoard = (s) => {
  const t = String(s || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24);
  return t || LEADERBOARD_BOARD;
};
// The run's token: the save id the game gave the run at New Game (it is carried floor to floor) and
// its seed. Unique on the server per board, so the same run cannot be posted twice.
export const cleanRun = (s) => String(s || "").replace(/[^A-Za-z0-9:_-]/g, "").slice(0, 64);
export const runToken = (saveId, seed) => cleanRun([saveId, seed].filter(Boolean).join(":"));
const cleanTag = (s) => String(s == null ? "" : s).replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 24);
// What the game sends, made safe; null when it cannot go on the board at all.
export const cleanPost = (p) => {
  if (!p || typeof p !== "object") return null;
  const name = cleanName(p.name), score = cleanScore(p.score), run = cleanRun(p.run);
  if (!name || score == null || !run) return null;
  const secs = Math.round(Number(p.secs));
  return {
    board: cleanBoard(p.board), run, name, score,
    look: cleanTag(p.look), difficulty: cleanTag(p.difficulty), floor: cleanTag(p.floor),
    secs: Number.isFinite(secs) && secs >= 0 && secs < 1e7 ? secs : 0,
  };
};

// ---------- what the board shows ----------
// The server answers { total, top: [entry], me: entry|null, above: [entry], below: [entry] }, every
// entry carrying its rank. On the board: the top ten with your row lit when you are in it; when you
// are further down, the top five, a gap, then the two above you, you, and the two below — the same
// height either way, so the panel does not jump.
export const boardRows = (res, topN = LB_TOP_N) => {
  if (!res || !Array.isArray(res.top)) return [];
  const me = res.me || null;
  const off = me && me.rank > topN;
  const head = res.top.slice(0, off ? Math.ceil(topN / 2) : topN);
  const byRank = new Map();
  for (const e of [...head, ...(off ? [...(res.above || []), me, ...(res.below || [])] : [])]) if (e && e.rank) byRank.set(e.rank, e);
  const ranks = [...byRank.keys()].sort((a, b) => a - b);
  const rows = [];
  ranks.forEach((r, i) => {
    if (i > 0 && r > ranks[i - 1] + 1) rows.push({ gap: true, key: "gap" + r });
    const e = byRank.get(r);
    rows.push({ key: "r" + r, rank: r, name: e.name, score: e.score, me: !!(me && e.id === me.id) });
  });
  return rows;
};

// ---------- the game's side ----------
// Where the service is: `?lb=<url>` in the address or localStorage `bobLeaderboard` (a test against
// a local `wrangler dev`), else LEADERBOARD_URL. Only http(s); trailing slashes dropped.
export const leaderboardUrl = (loc, readStored) => {
  let u = "";
  try {
    const q = loc && loc.search ? new URLSearchParams(loc.search).get("lb") : null;
    u = q || (readStored ? readStored() : "") || LEADERBOARD_URL;
  } catch { u = LEADERBOARD_URL; }
  u = String(u || "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^\s]+$/i.test(u) ? u : "";
};
// The two calls. Each resolves to { ok: true, ...answer } or { ok: false, error } — never throws, so
// a dead network leaves a ⚠ line and the rest of the screen working. 8 s and it gives up.
export const createLeaderboard = (base, fetchImpl = (typeof fetch === "function" ? fetch.bind(globalThis) : null), board = LEADERBOARD_BOARD) => {
  const call = async (path, init) => {
    if (!base || !fetchImpl) return { ok: false, error: "off" };
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), 8000) : null;
    try {
      const r = await fetchImpl(base + path, { ...(init || {}), ...(ctl ? { signal: ctl.signal } : {}) });
      let body = null;
      try { body = await r.json(); } catch { body = null; }
      if (!r.ok || !body) return { ok: false, error: (body && body.error) || "http" + r.status };
      return { ok: true, ...body };
    } catch {
      return { ok: false, error: "offline" };
    } finally { if (timer) clearTimeout(timer); }
  };
  return {
    enabled: !!base,
    board,
    view: (mineId) => call("/scores?board=" + encodeURIComponent(board) + (mineId ? "&around=" + encodeURIComponent(mineId) : "")),
    post: (entry) => {
      const p = cleanPost({ ...entry, board });
      if (!p) return Promise.resolve({ ok: false, error: "bad" });
      if (!nameAllowed(p.name)) return Promise.resolve({ ok: false, error: "name" });
      return call("/scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    },
  };
};
// What the game remembers between runs (its own IndexedDB key, gameFront.js GAME_KEYS.leaderboard):
// the last name typed, to fill the box next time, and the player's best post per board, so the
// Leaderboard screen can show where they stand.
export const normalizeLbMemory = (m) => {
  const name = cleanName(m && m.name);
  const best = {};
  const b = m && m.best && typeof m.best === "object" ? m.best : {};
  for (const k of Object.keys(b)) {
    const e = b[k];
    if (e && Number.isFinite(Number(e.id)) && cleanScore(e.score) != null) best[cleanBoard(k)] = { id: Number(e.id), score: cleanScore(e.score) };
  }
  return { name, best };
};
export const rememberLbPost = (mem, board, name, entry) => {
  const m = normalizeLbMemory(mem);
  const b = cleanBoard(board);
  const prev = m.best[b];
  const best = entry && entry.id && (!prev || entry.score > prev.score) ? { ...m.best, [b]: { id: Number(entry.id), score: entry.score } } : m.best;
  return { name: cleanName(name) || m.name, best };
};
