// THE GAME'S FRONT END — BOB AS PLAYERS GET IT (2026-10-17; the look redone 2026-10-18).
// (The game is called BOB. Earlier notes here said "Bob Okay"; the "Okay" was never his.)
//
// The studio is not the game (Blake, 2026-10-08, emphatic). The game is a title sequence ("BLAKE
// Presents…", then "BOB"), a main menu (New Game, Load Game, Options, Unlocks, Quit Game), and a
// run of floor 1 with none of the editor on screen. It is the SAME app at a second address — the
// page path ends in /game (see isGameAddress) — so it plays his levels, looks and sounds through
// the exact engine the studio's 🏁 Play run uses, and every fix to play reaches both at once. A
// second StackBlitz project or a second codebase would have been a second copy of 28,000 lines to
// keep in step, and the first fix made in one would have been missing from the other.
//
// This file is the rules, with no React and no studio code, the way audio.js and anim.js are: the
// save shape, the options, the unlock record, and the game's own little store. App.js wires them.
//
// WHERE A GAME'S SAVES LIVE: their own IndexedDB database, "bobOkayGame", never the studio's
// `bobAssetStudio` store. Three reasons, each of which has cost this project a day before:
// * The studio's store is his LIBRARY. Its loaders, the orphan scan and the keeper's sweep all walk
//   it by key family, and a record they do not recognise is exactly what a loader that throws looks
//   like from the outside. Nothing of the game's goes near it.
// * localStorage is FULL on every copy of his game (Chrome's 5 MiB cap; see CLAUDE.md "Saving"), so
//   a save written there would fail silently on his machine and work in every test browser.
// * The keeper reads every IndexedDB record of a game address off disk (tools/read-chrome-leveldb.js)
//   but keeps only STRING values under the studio's key families. The game stores plain objects
//   under "game:" keys, so the sweep skips them and they never reach his save folder or `saves`.
// A play-through is the player's, not Blake's library: losing one is a lost checkpoint, not lost
// work, so it gets this simple store rather than the library's five-way wiring.

// ---------- the address ----------
// /game, /game/ or /game/index.html at the end of the path (the Pages copy is
// /BobAssetBuilder/game/, the dev server's is /game), or ?game in the query for any host where a
// path cannot be chosen.
export const GAME_PATH_RE = /\/game(\/(index\.html)?)?$/i;
export const isGameAddress = (loc) => {
  if (!loc) return false;
  if (GAME_PATH_RE.test(loc.pathname || "")) return true;
  return /(^|[?&])game(=|&|$)/i.test((loc.search || "").replace(/^\?/, "&"));
};
// The address of the game for whichever copy the studio is running in: the studio's own folder
// plus "game/" (so the Pages studio at /BobAssetBuilder/ opens /BobAssetBuilder/game/, and the
// dev server's / opens /game/).
export const gameAddressFor = (loc) => {
  if (!loc) return "game/";
  const path = (loc.pathname || "/").replace(/[^/]*$/, "");
  return (loc.origin || "") + path + "game/";
};

// ---------- the title sequence ----------
// The intro is drawn by public/index.html before a byte of the app has loaded (his words: "before
// anything else even loads"), so these timings are mirrored there in its CSS. They are here for
// the React side, which decides when the intro may hand over to the menu.
// "Blake presents…" fades in, then half a second after it is fully in, "Bob" pops.
export const INTRO_PRESENTS_IN_MS = 250;     // black first, so the fade reads as a fade
export const INTRO_PRESENTS_FADE_MS = 1000;
export const INTRO_BOB_AT_MS = INTRO_PRESENTS_IN_MS + INTRO_PRESENTS_FADE_MS + 500;
export const INTRO_BOB_POP_MS = 520;
// The menu never comes up before "Bob" has been on screen long enough to read.
export const INTRO_MIN_MS = INTRO_BOB_AT_MS + INTRO_BOB_POP_MS + 1300;
export const INTRO_OUT_MS = 700;
// How long the intro still has to run, `elapsed` ms after it started. A skip (any key or click)
// once the game has loaded cuts it to the fade-out.
export const introRemainingMs = (elapsed, skipped) => (skipped ? 0 : Math.max(0, INTRO_MIN_MS - Math.max(0, elapsed || 0)));

// ---------- the main menu ----------
// Blake's list, in his order (2026-10-17). Ids, not labels, are what the code switches on.
export const GAME_MENU = [
  { id: "new", label: "New Game" },
  { id: "load", label: "Load Game" },
  { id: "options", label: "Options" },
  { id: "unlocks", label: "Unlocks" },
  { id: "quit", label: "Quit Game" },
];
// Up/down through a list, wrapping, skipping disabled rows.
export const menuStep = (items, at, dir) => {
  const n = (items || []).length;
  if (!n) return 0;
  let i = at;
  for (let tries = 0; tries < n; tries++) {
    i = (i + dir + n) % n;
    if (!items[i].disabled) return i;
  }
  return at;
};

// ---------- who you play ----------
// New Game opens the CHARACTER SELECT (2026-10-18, Blake: "inboxes like in super smash bros", pulling
// "from the characters inside of the Starter sub category"). The roster is every dressed look filed
// under Starter — Bob, Bobby, Bobert, Bobette, Bobbi, Rob, Roberta on his copy — read live from the
// library, so a look he files under Starter tomorrow is a box on the screen tomorrow. Bob leads (he
// is the hero; the cursor starts on him), the rest by name.
// pickStartLook is the fallback when the folder is empty: "Bob" by NAME (a rename to "Bob" is how
// he would point the game at a new hero), else the first Starter, else any look.
export const START_LOOK_FOLDER = "starter";
const normName = (s) => String(s || "").trim().toLowerCase();
export const starterLooks = (assets) => {
  const looks = (assets || []).filter((a) => a && a.type === "character" && a.id && normName(a.category) === START_LOOK_FOLDER);
  return looks.sort((a, b) => (normName(a.name) === "bob" ? -1 : 0) - (normName(b.name) === "bob" ? -1 : 0) || String(a.name || "").localeCompare(String(b.name || "")) || (a.id < b.id ? -1 : 1));
};
export const pickStartLook = (assets) => {
  const looks = (assets || []).filter((a) => a && a.type === "character" && a.id);
  const starters = looks.filter((a) => normName(a.category) === START_LOOK_FOLDER);
  return starters.find((a) => normName(a.name) === "bob") || looks.find((a) => normName(a.name) === "bob") || starters[0] || looks[0] || null;
};
// The Smash grid: as square as the roster allows, never wider than 6 boxes (7 starters = 4 + 3).
export const selectGridCols = (n) => Math.max(1, Math.min(6, Math.ceil(Math.sqrt(Math.max(1, n)) * 1.4)));
// Arrow keys over that grid. Left/right wrap along the whole list; up/down keep the column, and a
// step into the short last row lands on its last box rather than on nothing.
export const gridStep = (n, cols, at, dx, dy) => {
  if (n <= 0) return 0;
  if (dx) return (at + dx + n) % n;
  const rows = Math.ceil(n / cols);
  const col = at % cols;
  let row = Math.floor(at / cols) + dy;
  row = (row + rows) % rows;
  return Math.min(n - 1, row * cols + col);
};

// ---------- difficulty ----------
// Blake (2026-10-18): Easy gives 4 lives, Medium 2, Hard 1, and running out ends the run on the
// Game Over / Retry screen. A life is a whole try: losing one is the ordinary death (back to the
// gate you came in by, full HP). It is counted per RUN in `deaths`, saved with the checkpoint, so
// quitting to the menu and loading cannot buy them back. 🐱 Extra Lives (the item) are separate and
// spent first — they get you up where you fell, as they always have.
export const DIFFICULTIES = [
  { id: "easy", label: "Easy", lives: 4 },
  { id: "medium", label: "Medium", lives: 2 },
  { id: "hard", label: "Hard", lives: 1 },
];
export const DEFAULT_DIFFICULTY = "medium";
export const difficultyOf = (id) => DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES.find((d) => d.id === DEFAULT_DIFFICULTY);
// Lives still in hand, the one being played included (Hard starts on 1).
export const runLivesLeft = (diffId, deaths) => Math.max(0, difficultyOf(diffId).lives - Math.max(0, Math.round(Number(deaths) || 0)));
// Does this death end the run? `deathsBefore` is the count before it.
export const deathEndsRun = (diffId, deathsBefore) => runLivesLeft(diffId, (deathsBefore || 0) + 1) <= 0;

// ---------- the menu's backdrop: one of his levels, with his people walking it ----------
// Blake's mock-up had the menu over a park scene with made-up figures; he wants "actual characters
// not those made up ones … some Bob stuff going on in the background". So the menu stands over one
// of his own levels, drawn by the game's own tile and prop code (App.js menuSceneFor), with his
// Starter crew and that level's own placed units strolling along its ground. Nobody fights, nothing
// is simulated: a walker follows the level's top surface, turns at a wall, a drop or now and then
// for no reason, and stops to stand a moment. The geometry is here, the drawing is in App.js.
//
// Which levels: the street levels of the floor most of his levels belong to (not rooms, not
// sewers), ranked by what there is to look at. A placed PROP is his drawn art and counts three; an
// emoji object counts one, and only the first 40 (a field of grass emoji is not scenery); the sum
// is capped so a church of 300 objects cannot drown out a street full of people, and each unit
// adds six. He called a low-ranked pick "a pretty boring level", so the order is fixed: the main
// menu always stands over the best of them.
//
// EACH SCREEN HAS ITS OWN LEVEL (Blake, 2026-10-18: "when you went to different sub menus it used
// different menus / level screenshots"). MENU_SCENE_VIEWS gives every screen its slot in that
// ranked lineup — the main menu the best, the character select the next, and so on — wrapping when
// he has fewer levels than screens.
export const MENU_SCENE_PROP_CAP = 160;
export const MENU_SCENE_VIEWS = ["menu", "select", "load", "options", "unlocks", "gameOver", "floorDone"];
export const menuLevelScore = (l) => {
  const objs = Object.values((l && l.fx) || {}).flat().filter(Boolean);
  const props = objs.filter((o) => o.kind === "prop").length;
  return Math.min(MENU_SCENE_PROP_CAP, props * 3 + Math.min(40, objs.length - props)) + 6 * Object.keys((l && l.enemies) || {}).length;
};
export const menuLevelLineup = (levels) => {
  const all = (levels || []).filter((l) => l && l.cols && l.rows);
  const street = all.filter((l) => !l.isRoom && l.cols >= 40 && l.rows >= 20 && !/sewer/i.test((l.floor || "") + " " + (l.name || "")));
  if (!street.length) return all.slice(0, 1);
  const floors = {};
  for (const l of street) floors[l.floor || ""] = (floors[l.floor || ""] || 0) + 1;
  const main = Object.keys(floors).sort((a, b) => floors[b] - floors[a] || (a < b ? -1 : 1))[0];
  return street.filter((l) => (l.floor || "") === main).sort((a, b) => menuLevelScore(b) - menuLevelScore(a) || (a.id < b.id ? -1 : 1));
};
export const pickMenuLevel = (levels) => menuLevelLineup(levels)[0] || null;
export const sceneLevelFor = (lineup, view) => {
  if (!lineup || !lineup.length) return null;
  const i = MENU_SCENE_VIEWS.indexOf(view);
  return lineup[(i < 0 ? 0 : i) % lineup.length];
};
// The row each column's walkable top surface is on: the first solid cell from the top with a body's
// height of open air over it (so a tree canopy or a roof with no room under the sky is skipped
// past, and so is a ceiling). null where nothing in the column can be stood on.
export const MENU_BODY_ROWS = 7;
export const sceneSurface = (rows, cols, solidAt, bodyRows = MENU_BODY_ROWS) => {
  const out = new Array(cols).fill(null);
  for (let c = 0; c < cols; c++) {
    let open = 0;
    for (let r = 0; r < rows; r++) {
      if (solidAt(r, c)) { if (open >= bodyRows) { out[c] = r; break; } open = 0; }
      else open++;
    }
  }
  return out;
};
// Where the view stands vertically: the ground the walkers are on (the median of the surface) a
// little under three-quarters of the way down, the way the mock-up framed its gravel path.
export const MENU_GROUND_AT = 0.76;
// The level's main ground: the median of the surface. Walkers start only within MENU_GROUND_BAND rows
// of it, so nobody begins on a rooftop or a ledge (and, turning at every step of more than a row,
// nobody climbs onto one either).
export const MENU_GROUND_BAND = 4;
export const sceneGroundRow = (surface, rows) => {
  const s = (surface || []).filter((v) => v != null).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : rows - 4;
};
export const sceneTopRow = (surface, rows, viewRows) => {
  const ground = sceneGroundRow(surface, rows);
  return Math.max(0, Math.min(Math.max(0, rows - viewRows), Math.round(ground - viewRows * MENU_GROUND_AT)));
};
// One walker, `dt` seconds on. A walker is { x (its centre, px), foot (px, eased), dir (±1), speed
// (px/s), idle (s left standing), phase (the walk cycle, the loop's own 0.03 rad per px) }.
// It turns back at the level's ends, at a step of more than one row, and at a column with no
// surface, and stands for a beat when it does half the time.
export const MENU_WALK_PHASE_PER_PX = 0.03;
export const stepMenuWalker = (w, dt, surface, cell, rnd = Math.random) => {
  const ease = (foot, to) => foot + (to - foot) * Math.min(1, dt * 12);
  if (w.idle > 0) return { ...w, idle: Math.max(0, w.idle - dt), walking: false };
  const n = surface.length;
  const cur = Math.max(0, Math.min(n - 1, Math.floor(w.x / cell)));
  const nx = w.x + w.dir * w.speed * dt;
  const c = Math.floor(nx / cell);
  const here = surface[cur], next = c >= 1 && c < n - 1 ? surface[c] : null;
  if (next == null || (here != null && Math.abs(next - here) > 1)) {
    return { ...w, dir: -w.dir, idle: rnd() < 0.5 ? 0.5 + rnd() * 1.5 : 0, walking: false };
  }
  const out = { ...w, x: nx, foot: ease(w.foot, next * cell), walking: true, phase: (w.phase || 0) + w.speed * dt * MENU_WALK_PHASE_PER_PX };
  // Now and then — about once every twelve seconds of walking — stop and look the other way.
  if (rnd() < dt / 12) { out.dir = -w.dir; out.idle = 0.8 + rnd() * 2; out.walking = false; }
  return out;
};

// ---------- saved games ----------
// A save is a CHECKPOINT: made as each level of the run goes live (the gate you came in by is where
// it puts you back, the same place a death does), and again on Quit to Main Menu. It holds what
// the run needs to be rebuilt — the seed, and the level by its run key AND its level id, because
// buildRun is re-run from the seed over whatever levels exist when it is loaded and he keeps
// editing them — plus what you were carrying.
export const GAME_SAVE_VERSION = 1;
export const GAME_SAVES_MAX = 12;
export const newGameSaveId = (now = Date.now()) => "g" + now.toString(36) + Math.floor(Math.random() * 1296).toString(36);
export const makeGameSave = (prev, s) => ({
  v: GAME_SAVE_VERSION,
  id: (prev && prev.id) || s.id || newGameSaveId(),
  startedAt: (prev && prev.startedAt) || s.startedAt || Date.now(),
  savedAt: s.savedAt || Date.now(),
  seed: String(s.seed || ""),
  nodeKey: s.nodeKey || null,
  levelId: s.levelId || null,
  levelName: s.levelName || "",
  floor: s.floor || "",
  gateKey: s.gateKey || null,
  lookId: s.lookId || "",
  lookName: s.lookName || "",
  weaponId: s.weaponId || "",
  throwId: s.throwId || "",
  throwCount: Math.max(0, Math.round(Number(s.throwCount) || 0)),
  equipped: s.equipped && typeof s.equipped === "object" ? { ...s.equipped } : {},
  hp: typeof s.hp === "number" && isFinite(s.hp) ? s.hp : null,
  wallet: Math.max(0, Math.round(Number(s.wallet) || 0)),
  livesUsed: Math.max(0, Math.round(Number(s.livesUsed) || 0)),
  difficulty: difficultyOf(s.difficulty || (prev && prev.difficulty)).id,
  deaths: Math.max(0, Math.round(Number(s.deaths) || 0)),
  score: s.score && typeof s.score === "object" ? JSON.parse(JSON.stringify(s.score)) : null,
  objectives: s.objectives && Array.isArray(s.objectives.list) ? { list: s.objectives.list.map((o) => ({ ...o })), done: [...(s.objectives.done || [])] } : null,
  talkSpent: [...(s.talkSpent || [])],
  playSecs: Math.max(0, Number(s.playSecs) || 0),
});
// Newest first, at most GAME_SAVES_MAX, one per id (the newest copy of an id wins).
export const sortGameSaves = (saves) => {
  const byId = new Map();
  for (const s of saves || []) if (s && s.id && (!byId.has(s.id) || (s.savedAt || 0) > (byId.get(s.id).savedAt || 0))) byId.set(s.id, s);
  return [...byId.values()].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)).slice(0, GAME_SAVES_MAX);
};
export const upsertGameSave = (saves, save) => sortGameSaves([save, ...(saves || []).filter((s) => s && s.id !== save.id)]);
export const dropGameSave = (saves, id) => (saves || []).filter((s) => s && s.id !== id);
// Which run node a loaded save resumes at: its own key when that key still holds the same level,
// else wherever that level now sits in the rebuilt run, else nothing (the caller starts the run
// from its beginning — the levels changed under the save).
export const resumeNodeKey = (run, save) => {
  if (!run || !run.nodes || !save) return null;
  const n = save.nodeKey && run.nodes[save.nodeKey];
  if (n && n.level && (!save.levelId || n.level.id === save.levelId)) return save.nodeKey;
  if (save.levelId) for (const k of Object.keys(run.nodes)) { const m = run.nodes[k]; if (m && m.level && m.level.id === save.levelId) return k; }
  return null;
};
// "12:04" or "1:02:09" — the play time a save row shows.
export const formatPlayTime = (secs) => {
  const t = Math.max(0, Math.floor(Number(secs) || 0));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const two = (n) => (n < 10 ? "0" : "") + n;
  return h ? h + ":" + two(m) + ":" + two(s) : m + ":" + two(s);
};
// The run's seconds are kept per level in the score (sc.secs); the play time is their sum.
export const scorePlaySecs = (score) => Object.values((score && score.secs) || {}).reduce((n, v) => n + (Number(v) || 0), 0);

// ---------- options ----------
// Volumes are 0-100 on screen and multiply everything (the music element, the effects' master
// gain); fullscreen is the browser's own, asked for on the click that turns it on.
// The difficulty last started with rides here too, so the character select opens on it.
export const GAME_OPTIONS_DEFAULT = { music: 80, effects: 100, difficulty: DEFAULT_DIFFICULTY };
export const normalizeGameOptions = (o) => {
  const pct = (v, d) => (typeof v === "number" && isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : d);
  return { music: pct(o && o.music, GAME_OPTIONS_DEFAULT.music), effects: pct(o && o.effects, GAME_OPTIONS_DEFAULT.effects), difficulty: difficultyOf(o && o.difficulty).id };
};

// ---------- unlocks ----------
// What a player has turned up across every game on this copy: each item they have picked up or
// bought, each kind of enemy they have put down, and the floors they have finished. The Unlocks
// screen draws everything that could be found as a silhouette and fills in what has been.
// Ids only — the art comes from his library when the screen is drawn, so a garment he redraws
// shows its new self here too.
export const newGameRecord = () => ({ found: [], defeated: [], floors: [], bestScore: 0, kills: 0, games: 0 });
export const normalizeGameRecord = (r) => {
  const b = newGameRecord();
  if (!r || typeof r !== "object") return b;
  const ids = (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === "string" && x))] : []);
  const n = (v) => Math.max(0, Math.round(Number(v) || 0));
  return { found: ids(r.found), defeated: ids(r.defeated), floors: ids(r.floors), bestScore: n(r.bestScore), kills: n(r.kills), games: n(r.games) };
};
// Returns the SAME object when nothing changed, so a caller can skip the write.
export const recordFound = (rec, id) => (!id || rec.found.includes(id) ? rec : { ...rec, found: [...rec.found, id] });
export const recordDefeated = (rec, id) => (!id ? rec : { ...rec, kills: rec.kills + 1, defeated: rec.defeated.includes(id) ? rec.defeated : [...rec.defeated, id] });
export const recordFloorDone = (rec, floor, score) => ({ ...rec, floors: !floor || rec.floors.includes(floor) ? rec.floors : [...rec.floors, floor], bestScore: Math.max(rec.bestScore, Math.round(Number(score) || 0)) });
// What each Unlocks tab lists, in a stable order (by name). Items are what can be carried or worn —
// weapons (not their projectiles), clothing and consumables; enemies are every animal and every
// dressed look, since any look can be placed as a unit.
export const UNLOCK_TABS = [
  { id: "items", label: "Items", match: (a) => a.type === "weapon" || a.type === "equipment" || a.type === "item" },
  { id: "enemies", label: "Enemies", match: (a) => a.type === "enemy" || a.type === "character" },
];
export const unlockPool = (assets, tabId) => {
  const tab = UNLOCK_TABS.find((t) => t.id === tabId) || UNLOCK_TABS[0];
  return (assets || []).filter((a) => a && a.id && tab.match(a)).sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")) || (a.id < b.id ? -1 : 1));
};

// ---------- the game's own store ----------
// One small IndexedDB database. Values are plain objects (structured clone), never strings — see
// the header for why that keeps them out of the keeper's sweep. When IndexedDB cannot be opened (a
// private window that refuses it) the game still plays; it just forgets on reload.
export const GAME_DB_NAME = "bobOkayGame", GAME_DB_STORE = "kv";
export const GAME_KEYS = { saves: "game:saves", options: "game:options", record: "game:record" };
export const createGameStore = (idb = (typeof indexedDB !== "undefined" ? indexedDB : null)) => {
  const mem = new Map();
  let conn = null;
  const open = () => {
    if (conn) return conn;
    conn = new Promise((resolve) => {
      try {
        if (!idb) return resolve(null);
        const req = idb.open(GAME_DB_NAME, 1);
        req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(GAME_DB_STORE)) db.createObjectStore(GAME_DB_STORE); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
        setTimeout(() => resolve(null), 6000); // an open that never answers must not hang the menu (see idbOpen in App.js)
      } catch { resolve(null); }
    });
    return conn;
  };
  const run = async (mode, fn) => {
    const db = await open();
    if (!db) return { ok: false };
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(GAME_DB_STORE, mode);
        const req = fn(tx.objectStore(GAME_DB_STORE));
        tx.onabort = tx.onerror = () => resolve({ ok: false });
        req.onsuccess = () => resolve({ ok: true, value: req.result });
        req.onerror = () => resolve({ ok: false });
      } catch { resolve({ ok: false }); }
    });
  };
  return {
    get: async (k) => { const r = await run("readonly", (st) => st.get(k)); if (r.ok && r.value !== undefined) return r.value; return mem.has(k) ? mem.get(k) : null; },
    set: async (k, v) => { mem.set(k, v); const r = await run("readwrite", (st) => st.put(v, k)); return r.ok; },
  };
};
