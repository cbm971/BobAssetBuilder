// BOB's LEADERBOARD SERVICE (2026-11-28) — a Cloudflare Worker over a D1 (SQLite) database.
// Every copy of the game, wherever it is played, reads and writes this one board, so Blake sees the
// same list a player in another state does. The rules (what a name may be, the score range, a run's
// token) are src/leaderboard.js, shared with the game; the tables are schema.sql; deploying is
// README.md.
//
//   GET    /scores?board=beta[&around=<id>]   the top ten, the total, and (with around) that entry's
//                                             rank with the two above and below it
//   POST   /scores   { name, score, run, look, difficulty, floor, secs }   adds a run; answers as GET
//                                             around the new entry. The same run posted again returns
//                                             the first post (so a retry after a dropped answer is safe)
//   GET    /scores/recent?board=beta          the newest 50 posts with ids        (admin key)
//   DELETE /scores/<id>                       removes one entry                    (admin key)
//
// The admin key is the Worker secret ADMIN_KEY (`wrangler secret put ADMIN_KEY`); without one set, the
// admin calls always refuse. tools/leaderboard.js wraps them.
//
// ANYONE CAN POST. The game runs on the player's machine, so a determined player can send any score
// they like; the service refuses only what is plainly not a run (a score past LB_SCORE_MAX, a bad
// name, a second post of the same run, more than one post per player per 10 s). A fake that gets on
// the board is removed by hand.
import { cleanBoard, cleanPost, nameAllowed, scoreBucket, LB_BUCKET, LB_TOP_N, LB_NEAR, LB_POST_GAP_MS } from "../src/leaderboard.js";

const CORS = {
  "Access-Control-Allow-Origin": "*", // the game is served from Pages, itch.io, StackBlitz, a local file — any page may read the board
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS },
});

const ENTRY = "id, name, score";
const withRank = (rows, rankOf) => rows.map((r, i) => ({ id: r.id, name: r.name, score: r.score, rank: rankOf(i) }));

// Where `row` stands: 1 + every entry ahead of it (a higher score, or the same score posted earlier).
// The buckets above its own are summed from the bucket table; inside its own bucket the few ahead
// are counted directly. Then the nearest two ahead and behind, for the board's middle rows.
async function standing(db, board, row) {
  const b = scoreBucket(row.score);
  const [agg, inside, sameAhead, higher, sameBehind, lower] = await db.batch([
    db.prepare("SELECT COALESCE(SUM(n), 0) AS total, COALESCE(SUM(CASE WHEN b > ?2 THEN n ELSE 0 END), 0) AS above FROM buckets WHERE board = ?1").bind(board, b),
    db.prepare("SELECT COUNT(*) AS c FROM scores WHERE board = ?1 AND score >= ?2 AND score < ?3 AND (score > ?4 OR (score = ?4 AND id < ?5))").bind(board, b * LB_BUCKET, (b + 1) * LB_BUCKET, row.score, row.id),
    db.prepare(`SELECT ${ENTRY} FROM scores WHERE board = ?1 AND score = ?2 AND id < ?3 ORDER BY id DESC LIMIT ?4`).bind(board, row.score, row.id, LB_NEAR),
    db.prepare(`SELECT ${ENTRY} FROM scores WHERE board = ?1 AND score > ?2 ORDER BY score ASC, id DESC LIMIT ?3`).bind(board, row.score, LB_NEAR),
    db.prepare(`SELECT ${ENTRY} FROM scores WHERE board = ?1 AND score = ?2 AND id > ?3 ORDER BY id ASC LIMIT ?4`).bind(board, row.score, row.id, LB_NEAR),
    db.prepare(`SELECT ${ENTRY} FROM scores WHERE board = ?1 AND score < ?2 ORDER BY score DESC, id ASC LIMIT ?3`).bind(board, row.score, LB_NEAR),
  ]);
  const a = agg.results[0] || { total: 0, above: 0 };
  const rank = Number(a.above) + Number((inside.results[0] || {}).c || 0) + 1;
  const ahead = [...sameAhead.results, ...higher.results].slice(0, LB_NEAR);     // nearest first
  const behind = [...sameBehind.results, ...lower.results].slice(0, LB_NEAR);
  return {
    total: Number(a.total),
    me: { id: row.id, name: row.name, score: row.score, rank },
    above: withRank(ahead, (i) => rank - 1 - i).reverse(),
    below: withRank(behind, (i) => rank + 1 + i),
  };
}

async function boardView(db, board, aroundId) {
  const top = await db.prepare(`SELECT ${ENTRY} FROM scores WHERE board = ?1 ORDER BY score DESC, id ASC LIMIT ?2`).bind(board, LB_TOP_N).all();
  let mine = null;
  const id = Number(aroundId);
  if (Number.isInteger(id) && id > 0) {
    const row = await db.prepare(`SELECT ${ENTRY} FROM scores WHERE board = ?1 AND id = ?2`).bind(board, id).first();
    if (row) mine = await standing(db, board, row);
  }
  const total = mine ? mine.total : Number(((await db.prepare("SELECT COALESCE(SUM(n), 0) AS total FROM buckets WHERE board = ?1").bind(board).first()) || {}).total || 0);
  return { board, total, top: withRank(top.results, (i) => i + 1), me: mine ? mine.me : null, above: mine ? mine.above : [], below: mine ? mine.below : [] };
}

const sha = async (s) => {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 12).map((x) => x.toString(16).padStart(2, "0")).join("");
};

async function postScore(req, env) {
  const text = await req.text();
  if (text.length > 4096) return json({ error: "bad" }, 413);
  let body = null;
  try { body = JSON.parse(text); } catch { return json({ error: "bad" }, 400); }
  const p = cleanPost(body);
  if (!p) return json({ error: "bad" }, 400);
  if (!nameAllowed(p.name)) return json({ error: "name" }, 400);
  const db = env.DB;
  const again = await db.prepare(`SELECT ${ENTRY} FROM scores WHERE board = ?1 AND run = ?2`).bind(p.board, p.run).first();
  if (again) return json({ ...(await boardView(db, p.board, again.id)), again: true });
  const now = Date.now();
  const who = await sha((env.SALT || "bob-leaderboard") + "|" + (req.headers.get("CF-Connecting-IP") || "local"));
  const last = await db.prepare("SELECT at FROM posters WHERE who = ?1").bind(who).first();
  if (last && now - Number(last.at) < LB_POST_GAP_MS) return json({ error: "wait" }, 429);
  const [ins] = await db.batch([
    db.prepare(`INSERT INTO scores (board, run, name, score, look, difficulty, floor, secs, at, who) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
      ON CONFLICT (board, run) DO NOTHING RETURNING ${ENTRY}`).bind(p.board, p.run, p.name, p.score, p.look, p.difficulty, p.floor, p.secs, now, who),
    db.prepare("INSERT INTO posters (who, at) VALUES (?1, ?2) ON CONFLICT (who) DO UPDATE SET at = excluded.at").bind(who, now),
  ]);
  const row = ins.results[0] || (await db.prepare(`SELECT ${ENTRY} FROM scores WHERE board = ?1 AND run = ?2`).bind(p.board, p.run).first());
  if (!row) return json({ error: "server" }, 500);
  return json(await boardView(db, p.board, row.id));
}

const isAdmin = (req, env) => {
  const key = env.ADMIN_KEY || "";
  const got = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!key || got.length !== key.length) return false;
  let diff = 0;
  for (let i = 0; i < key.length; i++) diff |= key.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
};

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    try {
      if (path === "/") return json({ ok: true, service: "bob-leaderboard" });
      if (path === "/scores" && req.method === "GET") return json(await boardView(env.DB, cleanBoard(url.searchParams.get("board")), url.searchParams.get("around")));
      if (path === "/scores" && req.method === "POST") return await postScore(req, env);
      if (path === "/scores/recent" && req.method === "GET") {
        if (!isAdmin(req, env)) return json({ error: "admin" }, 403);
        const r = await env.DB.prepare("SELECT id, name, score, look, difficulty, floor, secs, at FROM scores WHERE board = ?1 ORDER BY id DESC LIMIT 50").bind(cleanBoard(url.searchParams.get("board"))).all();
        return json({ recent: r.results });
      }
      const del = path.match(/^\/scores\/(\d+)$/);
      if (del && req.method === "DELETE") {
        if (!isAdmin(req, env)) return json({ error: "admin" }, 403);
        const r = await env.DB.prepare("DELETE FROM scores WHERE id = ?1 RETURNING id, name, score").bind(Number(del[1])).first();
        return r ? json({ removed: r }) : json({ error: "missing" }, 404);
      }
      return json({ error: "missing" }, 404);
    } catch (e) {
      return json({ error: "server" }, 500);
    }
  },
};
