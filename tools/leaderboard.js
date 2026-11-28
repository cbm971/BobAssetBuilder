#!/usr/bin/env node
// BOB'S LEADERBOARD, FROM THIS PC (2026-11-28). The board itself is leaderboard/worker.js online; this
// reads it and takes junk off it.
//
//   node tools/leaderboard.js top              the top ten of the Beta board, with each entry's id
//   node tools/leaderboard.js recent           the newest 50 posts, with ids        (admin key)
//   node tools/leaderboard.js remove <id> ...  take entries off the board for good  (admin key)
//
// Options: --board <name> (default "beta"), --url <address> (default LEADERBOARD_URL in
// src/leaderboard.js). The admin key is the Worker secret ADMIN_KEY; this reads it from
// BOB_LB_ADMIN_KEY, else %LOCALAPPDATA%\BobOkay\leaderboard-admin-key.txt (written at deploy, never
// committed: anyone holding it can delete scores).
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf("--" + name); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const board = opt("board", "beta");
const builtIn = (fs.readFileSync(path.join(ROOT, "src", "leaderboard.js"), "utf8").match(/export const LEADERBOARD_URL = "([^"]*)"/) || [])[1] || "";
const base = String(opt("url", builtIn) || "").replace(/\/+$/, "");
const KEY_FILE = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "BobOkay", "leaderboard-admin-key.txt");
const adminKey = () => {
  if (process.env.BOB_LB_ADMIN_KEY) return process.env.BOB_LB_ADMIN_KEY.trim();
  try { return fs.readFileSync(KEY_FILE, "utf8").trim(); } catch { return ""; }
};

const call = async (p, init = {}, admin = false) => {
  const headers = { ...(init.headers || {}) };
  if (admin) {
    const k = adminKey();
    if (!k) throw new Error("no admin key: set BOB_LB_ADMIN_KEY or write it to " + KEY_FILE);
    headers.Authorization = "Bearer " + k;
  }
  const r = await fetch(base + p, { ...init, headers });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(p + " -> " + r.status + " " + (body.error || ""));
  return body;
};
const when = (t) => new Date(t).toISOString().replace("T", " ").slice(0, 16);

(async () => {
  if (!base) throw new Error("no leaderboard address: LEADERBOARD_URL in src/leaderboard.js is empty (pass --url)");
  const cmd = args[0];
  if (cmd === "top") {
    const b = await call("/scores?board=" + encodeURIComponent(board));
    console.log(board + ": " + b.total + " runs");
    for (const e of b.top) console.log(String(e.rank).padStart(4), String(e.score).padStart(9), " " + e.name.padEnd(17) + " id " + e.id);
  } else if (cmd === "recent") {
    const b = await call("/scores/recent?board=" + encodeURIComponent(board), {}, true);
    for (const e of b.recent) console.log(("id " + e.id).padEnd(10), String(e.score).padStart(9), " " + e.name.padEnd(17), when(e.at), [e.look, e.difficulty, e.floor].filter(Boolean).join(" / "));
  } else if (cmd === "remove") {
    const ids = args.slice(1).filter((a) => /^\d+$/.test(a));
    if (!ids.length) throw new Error("remove needs one or more entry ids (see top / recent)");
    for (const id of ids) {
      const r = await call("/scores/" + id, { method: "DELETE" }, true);
      console.log("removed id " + r.removed.id + ": " + r.removed.name + " " + r.removed.score);
    }
  } else {
    console.log("node tools/leaderboard.js top | recent | remove <id> ...   [--board beta] [--url https://...]");
  }
})().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
