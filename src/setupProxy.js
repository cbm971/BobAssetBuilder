/* Asset storage that lives in the PROJECT, not the browser.
 *
 * Browser storage is scoped to the page's address. The preview hostname carries a session id, so
 * when the container reboots and hands out a new one the studio opens on a brand-new, empty store
 * and a library built over months reads as gone — with every byte still on disk under the old
 * hostname, unreachable, because no page may read another origin's storage. The project directory
 * has none of that problem: it survives reboots, it survives new hostnames, and it is what gets
 * committed. So the dev server keeps the real copy here.
 *
 * NOTHING IN THIS FILE MAY THROW. CRA runs it while starting the dev server, so an exception here —
 * a missing dependency, a read-only filesystem, anything — takes the whole studio down and the page
 * doesn't load at all. Every part of it is therefore optional: if this can't run, the app falls back
 * to browser storage exactly as before and the only thing lost is the extra safety net.
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "asset-data");
const DATA_FILE = path.join(DATA_DIR, "library.json");
const BAK_FILE = path.join(DATA_DIR, "library.bak.json");

const readLibrary = () => {
  for (const f of [DATA_FILE, BAK_FILE]) {
    try {
      const parsed = JSON.parse(fs.readFileSync(f, "utf8"));
      if (parsed && Array.isArray(parsed.assets)) return parsed;
    } catch { /* try the backup, then give up quietly */ }
  }
  return { assets: [], levels: [], savedAt: null };
};

const writeLibrary = (next) => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  try { if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, BAK_FILE); } catch { /* best effort */ }
  fs.writeFileSync(DATA_FILE, JSON.stringify(next, null, 1));
};

// Merge by id, incoming wins for anything it names, nothing already stored is ever dropped.
const mergeById = (existing, incoming) => {
  const byId = new Map((existing || []).filter((a) => a && a.id).map((a) => [a.id, a]));
  for (const a of (incoming || [])) if (a && a.id) byId.set(a.id, a);
  return [...byId.values()];
};

// Read a JSON body without depending on express's parser being available.
const readJsonBody = (req) => new Promise((resolve) => {
  let raw = "";
  req.on("data", (c) => { raw += c; if (raw.length > 400 * 1024 * 1024) req.destroy(); });
  req.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve(null); } });
  req.on("error", () => resolve(null));
});

module.exports = function (app) {
  try {
    app.use("/__library", async (req, res, next) => {
      try {
        if (req.method === "GET") {
          const lib = readLibrary();
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify({ ok: true, assets: lib.assets, levels: lib.levels || [], savedAt: lib.savedAt }));
        }
        if (req.method === "POST") {
          const body = (req.body && typeof req.body === "object") ? req.body : await readJsonBody(req);
          const incoming = (body && Array.isArray(body.assets)) ? body.assets.filter((a) => a && a.id) : null;
          res.setHeader("Content-Type", "application/json");
          if (!incoming) { res.statusCode = 400; return res.end(JSON.stringify({ ok: false, error: "no assets array" })); }
          const current = readLibrary();
          // An empty POST is never a reason to empty the file — that is how a library gets erased by
          // a page that merely hadn't finished loading yet.
          if (!incoming.length && (current.assets || []).length) {
            return res.end(JSON.stringify({ ok: true, ignored: "refused to overwrite a stored library with nothing", assets: current.assets.length }));
          }
          const next = {
            savedAt: new Date().toISOString(),
            assets: body.replace ? incoming : mergeById(current.assets, incoming),
            levels: Array.isArray(body.levels) ? mergeById(current.levels, body.levels) : (current.levels || []),
          };
          writeLibrary(next);
          return res.end(JSON.stringify({ ok: true, assets: next.assets.length, levels: next.levels.length }));
        }
        return next();
      } catch (e) {
        try { res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: String(e && e.message) })); } catch { /* socket already gone */ }
      }
    });
  } catch (e) {
    // The studio matters more than the safety net. Say so in the terminal and let the app boot.
    console.warn("[Bob] project-file library disabled (" + (e && e.message) + ") — browser storage only");
  }
};
