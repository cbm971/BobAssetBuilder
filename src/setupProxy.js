/* Asset storage that lives in the PROJECT, not the browser.
 *
 * Browser storage is scoped to the page's address. The WebContainer/StackBlitz preview hostname
 * carries a session id, so when the container reboots and hands out a new hostname the studio opens
 * on a brand-new, empty store and a library built over months reads as gone — with every byte of it
 * still on disk under the old hostname, unreachable, because no page may read another origin's
 * storage. That is a browser security boundary, not a bug we can code around.
 *
 * The project directory has none of that problem: it survives reboots, it survives new hostnames,
 * and it is the thing that gets committed. So the dev server exposes the library as a file here.
 * CRA loads this automatically under `npm start`, which is how the studio is actually run.
 *
 * Safety rules, because this file IS the work:
 *   - A write must never shrink the library. Saves merge by id; only an explicit delete removes.
 *   - Every write leaves the previous contents in a .bak beside it.
 *   - A malformed or empty POST is rejected rather than persisted.
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "asset-data");
const DATA_FILE = path.join(DATA_DIR, "library.json");
const BAK_FILE = path.join(DATA_DIR, "library.bak.json");

const readLibrary = () => {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.assets)) return parsed;
  } catch { /* missing or unreadable — fall through to the backup */ }
  try {
    const parsed = JSON.parse(fs.readFileSync(BAK_FILE, "utf8"));
    if (parsed && Array.isArray(parsed.assets)) return parsed;
  } catch { /* nothing stored yet */ }
  return { assets: [], levels: [], savedAt: null };
};

const writeLibrary = (next) => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  try { if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, BAK_FILE); } catch { /* best effort */ }
  fs.writeFileSync(DATA_FILE, JSON.stringify(next, null, 1));
};

// Merge by id, incoming wins for anything it names, and nothing already stored is ever dropped.
const mergeById = (existing, incoming) => {
  const byId = new Map((existing || []).filter((a) => a && a.id).map((a) => [a.id, a]));
  for (const a of (incoming || [])) if (a && a.id) byId.set(a.id, a);
  return [...byId.values()];
};

module.exports = function (app) {
  app.use(require("express").json({ limit: "200mb" })); // a drawn library is megabytes of piece data

  app.get("/__library", (_req, res) => {
    const lib = readLibrary();
    res.json({ ok: true, assets: lib.assets, levels: lib.levels || [], savedAt: lib.savedAt });
  });

  app.post("/__library", (req, res) => {
    const body = req.body || {};
    const incomingAssets = Array.isArray(body.assets) ? body.assets.filter((a) => a && a.id) : null;
    if (!incomingAssets) return res.status(400).json({ ok: false, error: "no assets array" });
    const current = readLibrary();
    // An empty POST is never a reason to empty the file — that is how a library gets erased by a
    // page that merely hadn't finished loading yet.
    if (!incomingAssets.length && (current.assets || []).length) {
      return res.json({ ok: true, ignored: "refused to overwrite a stored library with nothing", assets: current.assets.length });
    }
    const next = {
      savedAt: new Date().toISOString(),
      assets: body.replace ? incomingAssets : mergeById(current.assets, incomingAssets),
      levels: Array.isArray(body.levels) ? mergeById(current.levels, body.levels) : (current.levels || []),
    };
    try { writeLibrary(next); } catch (e) { return res.status(500).json({ ok: false, error: String(e && e.message) }); }
    res.json({ ok: true, assets: next.assets.length, levels: next.levels.length });
  });
};
