# Bob Asset Builder — agent handoff

A browser game maker: draw assets out of blocks (bodies, skins, clothes, weapons,
enemies, props), dress a character, paint a level, then playtest it. Create React App
+ React 18. Everything is in **`src/App.js`** (~9400 lines). Tests in `src/App.test.js`.

## How Blake plays it

From a **StackBlitz linked to PR #1**, not `main`. The branch is
`agent/scaled-hitboxes-projectile-range`. **Pushing to that branch is what reaches
them** — they reload the link. There is no other delivery path.

Assets and levels live in **browser storage on the StackBlitz origin**, not in the
repo. Nothing you do locally can see them, and nothing local can back them up.

## Setup

There is no local clone — the working folder is empty. Clone the PR branch into the
scratchpad and work there.

Node is installed but **not on PATH**. Prepend:

```
C:\Users\cbm97\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.18.0-win-x64
```

A bare `node` check lies — it fails even though Node is there. Then `npm install`
once, `CI=true npm test`, `npm run build`.

## Before every push

* **Run both `npm test` and `npm run build`.** Tests only cover pure functions; the
  build is what catches JSX and scope mistakes. Both must be clean.
* Delete `build/` and `git checkout -- package-lock.json`.
* `git commit -F <file>`, **never `-m`** — quotes and dashes break inline.
* Other agents push to this branch. Always `fetch` + `rebase` before pushing. Never
  force.
* No `gh` CLI. Confirm a push landed with `git ls-remote`.
* **Then `npm run publish`** so https://cbm971.github.io/BobAssetBuilder/ runs what you just pushed (see the Storage section).

## Verify in the running app, not just in tests

Blake has been burned by fixes that passed tests and were still broken. Tests over
pure functions do not prove a render path works. Start the app and drive it:

```
BROWSER=none PORT=3000 npm start        # run in background
```

then `preview_start` at `http://localhost:3000` and drive it with
`mcp__Claude_Browser__javascript_tool`. Reading the DOM back is the proof — element
counts, computed styles, clip-paths. Buttons have no accessible names, so find them
by `textContent`:

```js
const byText = (re) => [...document.querySelectorAll('button')]
  .find(b => re.test((b.textContent || '').trim()));
```

Seeding fake assets into storage (`asset:<id>` records plus an `assetIndex` array of
`{id,name,type}`, and `level:<id>` plus `levelIndex`) and reloading is the fastest way
to get real data on screen. `asset-data/library.json` in this repo is 81 real assets
and 4 real levels — clone from those rather than hand-writing art, and serve the file
out of `public/` so the seed script isn't a giant inline string. Clicking through the
drawing tools blind is not — it burns context and usually fails.

**Seed `localStorage` on the FIRST load only.** After that the app has copied
everything into IndexedDB (`bobAssetStudio`, store `kv`, same `asset:<id>` keys) and
reads from there, so a later `localStorage.setItem` is silently shadowed by the stale
IDB copy: the edit lands, reads back correctly, and the game keeps using the old
value. Writing to IDB instead is what actually takes. This looked exactly like a
broken weapon flag for two round-trips.

Running the dev server **writes the browser's library back into `asset-data/`**, so
`git checkout -- asset-data/` before committing or your synthetic test assets ship.

## Gotchas that have cost real time

* **`src/App.js` is entirely CRLF.** Node/regex edits with `\n` in the pattern match
  nothing and fail silently. Convert patterns with `.replace(/\n/g, "\r\n")`. Always
  assert the match count is exactly 1 before writing.
* **Python is not installed.** Use `node -e` for scripted edits.
* `PowerShell` here is Windows PowerShell 5.1 — no `&&`, no ternary.
* **A spawn's loadout is per PLACEMENT.** Anything that reads "what weapon is this enemy holding"
  must take the spawn, not just the asset — see the 👹-flag section under *Weapon flags*.
* **To SEE a piece of art without a browser, run `node tools/rasterize-pieces.js --asset <id> out.png`** and
  Read the PNG. It reimplements the flat-art renderer (poly, mirror, rot, cutters, outline) and has been
  rebuilt from notes in four sessions before it was committed; extend it rather than writing another.
* **Building an asset by hand? Read `ASSET_AUTHORING.md` first.** It is the spec Blake hands to a
  chat that has no repo access: the file envelope, both bodies' real head/torso geometry per pose,
  the shape list, and the flat-colour house style (4–8 pieces, no shading — assisted assets that
  arrive airbrushed get rejected). Keep it in step with the code.
* **Writing asset JSON by hand: a fit variant IS the flat pose map.** `a.variants.default`
  must be `{front:[…],back:[…],…}` (a weapon's is `{states:{rest,fire}}`) — NOT
  `{angles:{front:[…]}}`. Box it and nothing errors: `fitVariantEmpty` sees no poses and
  calls the asset empty, `migrate` then loads `a.angles` from that empty box and overwrites
  the good top-level art, and the asset imports, saves and opens drawing **nothing at all**.
  Two hats and a jersey were built that way and read as "the upload function is broken".
  `normalizeAssetJson` now unwraps it, but write it correctly in the first place.

## Storage — read this before touching anything that saves

Losing work is the single worst failure this project has, and it has happened more
than once. The rules below are not style preferences.

**Two tiers.** Browser storage is a *cache*. The project file is the *record*.

* **Browser storage** — `assetIndex` → `asset:<id>`, `levelIndex` → `level:<id>`,
  `stampIndex` → `stamp:<id>`, `backgroundIndex` → `background:<id>`, `textureIndex` →
  `texture:<id>`, plus `lColor`/`recentColors`. Via `sget`/`sset`, which read BOTH
  `window.storage` and `localStorage` and write to whichever the host provides. It is
  scoped to the page's address, and the preview hostname **changes when the container
  reboots**. Anything that lives only here is one reboot from being unreachable.
* **The project file** — `asset-data/library.json`, served by `src/setupProxy.js` at
  `/__library`, holding `{ assets, levels, stamps }`. It is in the repo, so it survives
  reboots, new hostnames and the container itself. `writeLibrary` writes to a temp file
  and renames (atomic — no half-written library), keeps `library.bak.json`, and puts the
  first write of each day aside in `asset-data/snapshots/` keeping the last 5 (gitignored;
  the committed `library.json` is the copy that leaves the container).

**THE STUDIO HAS ONE PERMANENT ADDRESS: https://cbm971.github.io/BobAssetBuilder/ (2026-09-20).**
The root cause of every loss was the address changing; this address never does, so the browser
store there never dies, and it is the production build (no dev server, no StrictMode, no
dev-mode prop validation — the StackBlitz preview runs the dev build). `npm run publish`
(`tools/publish.js`) builds under `/BobAssetBuilder`, puts the committed `library.json` beside
the app (the read-only seed `projectLibrary.load` falls back to when there is no `/__library`),
and force-pushes the build as the `gh-pages` branch. **Run it after every push to the play
branch** — a published site that lags the branch is never a data problem, but the fix he is
waiting for stays invisible until someone publishes. GitHub Pages is enabled on the repo; the
source has to be "Deploy from a branch: gh-pages / (root)" (Settings → Pages) — setting it
through the API was refused by the tool permission classifier on this machine, and the stored
git credential has no `workflow` scope, so a Pages Actions workflow cannot be pushed either.
On the permanent address his data lives in the browser store (`navigator.storage.persist()`
is requested) and in his 📁 Save folder; the committed seed only matters for a brand-new
browser. The StackBlitz link still works exactly as before for anyone who uses it.

**THREE tiers since 2026-09-20, and the third is the one that cannot die with the address.**
Trailor Park M7, nine assets and two days of edits vanished on 2026-09-20 because the studio
came up on a new preview address (`bobassetbuilder-hzer-nkzk0qq2…`), its browser store was
empty, and the committed `library.json` had not been refreshed since the 2026-09-16 export —
the fourth time this exact thing happened. The two tiers above are BOTH tied to something that
gets replaced: the browser store to the page address, the project file to the running
container (it only reaches git when an agent commits it). So there is now:

* **📁 Save folder** (`diskLibrary` in App.js, right above `projectLibrary`) — a folder on
  Blake's own disk, picked once through the browser's directory picker (File System Access
  API). One file per record, `<kind>/<id>.json`, plus `removed.json` for deleted ids. The
  handle is kept in IndexedDB so the same address finds it again without a picker; Chrome may
  want one click to re-grant write access (the button reads **Reconnect save folder** and a
  toast says so once). It is a full peer of the project file through the ONE seam every
  loader already uses: `projectLibrary.load()` returns `mergeLibraries(serverFile, folder)`
  (newest `savedAt` per id, tombstones unioned), `save()` writes both, `forget()` tombstones
  both. Nothing else in the loaders changed. On a brand-new address the front screen shows
  **📁 Save folder**; one click on it runs every loader and the whole library comes back out
  of the folder. Verified in the running app on a fresh origin with the project file taken
  away and the browser store wiped: 0 assets → click → 161 assets, 13 levels (M7 included), 19
  groups, 17 textures, 5 dialogues; a level save bumps the folder's copy; a delete removes
  the file and lands in `removed.json` and stays deleted across a reload; a delete made while
  the folder was NOT connected is pushed into the folder at connect time (`connectSaveFolder`
  hands `localRemoved` to `diskLibrary.forget` before the loaders run). Tests: `mergeLibraries`
  and `diskLibrary` against an in-memory handle.
* The picker cannot open inside a cross-origin iframe (Chrome: "Cross origin sub frames
  aren't allowed to show a file picker") — that is the preview PANEL inside the StackBlitz
  editor. The preview in its own tab is fine; `connect` reports the frame case as `"iframe"`
  and the click says to open the preview in its own tab. There is no picker in my Browser pane
  either: test the folder path by shimming `window.showDirectoryPicker = () =>
  navigator.storage.getDirectory()` (OPFS has the same handle interface) and reading the
  files back from `navigator.storage.getDirectory()`.
* **The rule that follows:** a change of address is now a one-click recovery, not an outage —
  but ONLY once he has clicked 📁 Save folder once on the address he is using. Until he does,
  the old rules stand: merge his newest export into `library.json` before EVERY push, and when
  the address changes anyway, `tools/read-chrome-leveldb.js` on the old origin's IndexedDB
  is how everything comes back (2026-09-20: 161 assets / 13 levels read out of
  `…hzer--3000--d5306e6f…`, merged newest-wins against the new address and the file).

**A dated full backup lives at the repo root** — `assetbuilder-backup-<date>.json`,
`{assetBuilderBackup:2, assets, levels, stamps, textures, backgrounds, dialogues}`. Keep exactly
ONE, the newest, and check it is a superset before deleting the one it replaces (the
2026-07-25 file was version 1 and held **zero levels** — the old export bug). Merge each
new backup into `library.json` too, additively by id: that file is what restores into
Blake's studio on a cold browser, and it had drifted 9 days and 29 assets stale while
looking perfectly healthy.

**Every kind of drawn work goes to both tiers, in both directions.** The kinds are one
list — `PROJECT_KINDS` in `App.js`, `KINDS` in `setupProxy.js`, kept identical by a
test: **assets, levels, stamps, textures, backgrounds, dialogues**. Each saves up
(`projectLibrary.save({ levels })`) and restores down on load.

Every outage so far has been a kind of work that only went one way. Levels were written
to browser storage and nowhere else. Stored groups reached the project file only if you
made a NEW one. The **⬇ Export everything** button wrote assets and nothing else, so two
backup files taken by hand — 25 Jul and 4 Aug — contained zero levels; the backups made
to survive exactly this were no use. So: **anything a person can draw and name must be
wired into all five places** — save up, restore down, delete up, in the export, and back
out of `restoreBackup`. Add the word to `KINDS` and most of it follows.

**Deleting is the only operation allowed to shrink the file.** Every other write is
additive and merges by id, because a page that hasn't finished loading must never be
able to blank the record. That means a delete which does not call
`projectLibrary.forget(kind, ids)` is not a delete — the next load hands the record
straight back.

**...AND A DELETE HAS TO OUTLIVE EVERY BROWSER THAT STILL HAS THE RECORD.** This is the one Blake
actually hit, reported as "I cannot delete the testing weapons or testing creatures, they just come
back". `deleteAsset` was not broken: it clears all three browser stores, shrinks the index, calls
`forget`, and a single delete was verified sticking across a reload. Two things outside it undid it.

1. `asset-data/library.json` is **git-tracked**, and StackBlitz rebuilds the container from the
   repo, so his delete only ever reached the container's working copy — the next fresh container
   served the committed copy back.
2. Worse, and the reason removing the records from the committed file is not enough on its own:
   `loadLibrary` **pushes everything this browser holds back into the project file**. That push is
   what rebuilds a library on a new preview address, so it can't go away — but it means any browser
   that never heard about the delete (a second tab, another machine, or the same one after a
   rebuild handed the record back) re-uploads it within seconds of the app opening. Delete, reload,
   restored, forever.

**...AND THE HALF THAT WAS STILL MISSING, WHICH IS WHY HE KEPT SAYING IT WAS NOT FIXED.** Read the
paragraph below as the design and the four points after it as what was actually wired up, because
for a long time they were not the same thing and this document said they were.

1. **`sdel` never checked that anything was deleted.** It fired ONE guessed host-store method —
   `ws.delete(k, false)` — into a try/catch that swallowed the failure, then returned `true`
   unconditionally. `enumerateHostKeys` two lines away tries SIX spellings because there is no
   agreed host storage API; deleting assumed there was exactly one. On a host that spells removal
   any other way every delete reported success and kept the record — and because the loader treats
   the RECORDS as truth and the index as a hint, the orphan scan found it on the next load and
   re-filed it as real. That is "there is a delete button, but nothing deletes". `hostDelete` now
   tries every spelling and READS THE KEY BACK; only a key that is gone counts.
2. **Only `loadLibrary` purged.** Levels, stored groups, textures, backgrounds and dialogues each
   had the entire loop intact. One `purgeRemoved`, called by all six loaders.
3. **The tombstone needed a dev server to exist at all.** `localRemoved` (one `removedIndex` key)
   keeps the same list in the browser, so a delete sticks with no `/__library` AND when the store
   physically will not erase the record. Same two writers as the server: `forget` adds, a
   deliberate `revive` save takes back off.
4. **Levels, rooms and backgrounds had no delete AT ALL** — not a missing button, no code path.
   Every experiment and every copy a rename forked (`resolveSaveTarget`, deliberate) was permanent.
   The committed library carried one called "Combat Test delete", which is what you do when the
   only way to mark a level as junk is its name. Both are deletable now, two taps.

5. **The index MIRROR was a place the delete never reached.** `writeAssetIndex` copies the
   PREVIOUS index into `assetIndex.bak` before every write — right for an ordinary save, exactly
   wrong for a delete, because the previous index is the one that still names what you just
   deleted. `loadLibrary` unions the mirror back in on the next load, and that union cannot go
   away (it is what rescues a library from one bad index write). `deleteAsset` now rewrites the
   mirror to the shrunk list.
6. **AND THE ONE THAT ACTUALLY MATTERED: erasing is optional, saving is not.** Even with every
   spelling tried, a host store that exposes no removal method at all keeps the record — and the
   orphan scan then re-files it as real on the very next load. So when a key refuses to
   disappear, its VALUE is overwritten with `TOMBSTONE_VALUE` (a **gravestone**), and all six
   loaders read `isTombstoneRecord` as deleted — not as an asset, and not as a corrupt record to
   warn about either. This is the only form of "deleted" that survives losing every index there
   is, because it lives in the same slot as the thing it is about. **Do not remove it in favour
   of a tidier index-based scheme; the indexes are all recoverable-from-records by design, which
   means every recovery path ends by reading the record.**

**Verified against a fake `window.storage` with get/set/list and NO delete of any name** — the
shape the real one appears to have. A probe written straight into the host store is rescued by the
orphan scan (120 → 121), deleted through the shelf, and then stays deleted across all three ways
it used to come back: a plain reload, a container rebuilt from the repo (which wipes the project
file's `removed` list), and a brand-new preview address (localStorage and IndexedDB gone, host
store surviving). Re-run that rig before touching any of this; a test browser with no
`window.storage` exercises none of it and will pass while the real thing is broken.

**THE PROJECT FILE'S TOMBSTONE LIST DOES NOT SURVIVE A CONTAINER REBUILD.** StackBlitz rebuilds
from the repo, so `removed` reverts to whatever was last COMMITTED. A delete he makes only ever
reaches the container's working copy. That is why the same six assets came back for a month: the
record is in the committed `library.json`, his delete removed it from the container's copy, and
the next session served the committed one back. The browser-side gravestone is what now holds it
out — but if you want a delete to be permanent for everyone, **commit `asset-data/library.json`
after he deletes**, so both the missing record and its tombstone ship.

7. **THE ONE THAT WAS ACTUALLY DOING IT: the purge and the restore fought each other.** Every
   loader purges deleted ids from its list, and then restores from the project file by asking
   "which ids does this browser NOT have?" The purge creates, precisely, the condition the
   restore fires on — the id is missing, therefore this browser has never seen it, therefore
   write it back in. The delete removed the record and the very next loop in the same pass put it
   back, on every single load. **That is why a tombstone list on its own never fixed anything**,
   in six loaders, for a month, with the whole scheme apparently in place and a passing test for
   every piece of it. `tombstoneSet` is now computed once per loader and BOTH halves read it: the
   purge and the restore-from-project skip. **If you add a seventh kind, that skip is not
   optional — it is the half that looks done and is not.**

8. A blocked `indexedDB.open` never fires success, error OR blocked (blocked is raised on the
   DELETE request, not the open), so every sget/sset awaited a promise that never settled and the
   studio sat on "Loading your saves…" for ever with a full library on disk. `idbOpen` now times
   out and resolves null, which sget/sset already treat as "no IndexedDB here".

9. **A project-file restore is not a rescue, and used to announce itself as one a load late.**
   `loadLibrary` heals two copies of the index — `assetIndex` and its mirror `assetIndex.bak` —
   but only the RESCUE branch (mirror or orphan scan found an id the index lacked) wrote both; a
   load whose only event was a restore from `asset-data/library.json` fell through to the clean-load
   branch and refreshed the mirror alone. Index 136, mirror 137, so the NEXT load found the new id
   in the mirror, filed it as `fromMirror`, and flashed "🛟 Recovered 1 asset the index had lost —
   137 loaded" plus a console warning for an asset that was never lost. Every asset an agent
   delivered through the project file produced that once. `assetIndexHealPlan` (module level,
   tested against a constructed two-load fixture) now decides the writes in one place: rescue →
   both copies + the message; restore → both copies, no extra message; clean load → mirror only;
   nothing loaded → nothing written. The index write still goes through `writeAssetIndex`, which
   merges by id, so none of this can shrink the list. The other five loaders never had the gap —
   each already rewrites its index whenever `restored`/`fromProject` is non-zero.

**The reproduction that finally caught it** (worth keeping — every earlier test passed while the
bug was live): stand up the fake `window.storage` rig, let the project file restore into it, add a
few assets that exist ONLY in the browser, delete one browser-only asset AND one that IS in the
project file, then `git checkout -- asset-data/` and reload. The browser-only one stays deleted;
the one from the project file came back, with its full record rewritten over the gravestone. A
test that only ever deletes browser-only records cannot see this, which is exactly why it survived
three rounds of "verified in the running app".

A delete the project file did not accept now says so in the flash instead of showing a ✓.

So the file now REMEMBERS deletions, in `removed: { assets: [...], levels: [...], … }`
(`rememberRemoved` in `setupProxy.js`). An ordinary additive merge can never re-add a remembered
id, the GET hands the list to the studio, and `loadLibrary` **purges its own stale copies** of
anything on it — which is what stops the loop at the source. The safety valve is `revive`: any
DELIBERATE save (one asset, one level, one stored group, an import — `projectLibrary.save(payload,
{ revive: true })`) takes its id back off the list, so re-creating or re-importing something always
wins. **The bulk syncs must never pass `revive`**; defaulting to no-revive is the safe direction,
because missing a deliberate call site only means a re-created id doesn't stick, while missing a
bulk one is the original bug.

Two traps that follow from all this, both of which quietly undo the user's work:

* **`git checkout -- asset-data/` is the standing advice above, and it restores anything he
  deleted this session.** Before running it, check whether the diff is your own test seeding or his
  real deletions — `git diff --stat asset-data/` and look at the asset count. Revert the seeding by
  hand if both are in there.
* **`asset-data/library.bak.json` is tracked too**, and `readLibrary` falls back to it whenever
  `library.json` fails to parse. It is written one write behind, so the committed copy is however
  stale the last commit left it — as of 2026-08-23 it held **76 assets against library.json's 113**.
  A single bad parse would therefore serve a library missing 37 assets, and the app would then save
  that back as truth. If you touch one copy, check the other.

**WHAT THE PLAYER IS WEARING IS TWO LAYERS, AND ONLY ONE OF THEM WAS EVER ASKED.** `equipped`
holds pedestal pickups for this run; a composed character's own clothing is in
`components.equipment`. The pedestal swap consulted `equipped` alone, so the first jacket you took
off a plinth displaced "nothing" — nothing went back on the plinth, it marked itself spent, and
`livePlayerBlocks` (which layers a pickup OVER the look's own garment) took the old jacket off Bob
anyway. Off his body, not on the pedestal, gone for the run. Ask `wornEquipMap(base, equipped)`,
never `equipped`, for any "what am I wearing / what comes off" question. A slot emptied on purpose
records **null** rather than being deleted — absent means "wear the look's own", which is how a
displaced garment came back on you the same frame its twin landed on the pedestal.

**A TALKABLE NPC CANNOT BE TOUCHED UNTIL A CHOICE STARTS THE FIGHT** (`unitTalkImmune`). Shots,
swings, splash, fire, thrown rocks and tackles pass straight through, exactly the way they already
pass through your allies — no flinch, no stun, no bullet spent, no HP bar drawn. The only door
into a fight is a dialogue option carrying the 😡 act; punching used to be the other one and is
not any more. Fire is included deliberately: a Burn throwable paints hazard cells, so leaving it
out makes a molotov the way to kill anyone your bullets cannot touch.

**The dialogue sheet is inside a JS template literal.** A backtick in a CSS comment there ends the
string and takes the whole app down with a parse error that points at the JSX far below it.
Also: `.bb button, …{color:inherit}` is specificity (0,1,1), so a lone `.talkOpt` (0,1,0) loses the
colour — pale text on the new white bubble, invisible, with markup that looks perfectly correct.

**A loader that throws is indistinguishable from lost work.** That is what "my saves
are gone" has meant every single time so far; the bytes were always still on disk.
So: never a single try/catch around a whole load loop (a bad record is skipped and
named via `flash` + `console.warn`), and **never call an async helper without
`await`** — `scanStoredIds("level:").filter(...)` threw
`scanStoredIds(...).filter is not a function` and took the entire level list down with
it. `App.test.js` now reads `App.js` and fails on any un-awaited async helper; if that
test fires, you are one line away from blanking a library.

If work ever looks missing: **it is almost certainly still there.** Back up first (a
read-only dump of every key to a downloaded JSON), then diagnose. Never clear storage
to "reset".

### THE ONE THING TO KNOW ABOUT HIS DATA: it is never gone, and it is never only in git

On 2026-09-10 Blake opened the studio after two weeks away. StackBlitz had built a new container
on a new preview address, so the browser store was empty and the studio restored the COMMITTED
`asset-data/library.json` — a snapshot that was weeks old. Every asset he had made since was
missing, 83 he had edited were back at old versions, and 18 he had deleted were back. He said,
reasonably, that an asset builder that cannot save is worthless. Nothing was lost: the old
address's IndexedDB was still on disk in Chrome's profile, complete to the last write. The
reader that gets it out is now committed as **`tools/read-chrome-leveldb.js`** (it had been
rebuilt from a paragraph twice). Run it, merge with newest-`savedAt`-wins, honour the
`removedIndex` it also recovers (his deletion list), commit the result. The whole procedure
and every format fact are in the file header. **Do this before telling him anything is lost.**

Three rules that came out of it, all now in the code:

* **The project file can be newer than the browser, and when it is, it wins.** Every restore
  loop used to ask only "which ids do I not have?", so a browser holding a stale copy could
  never be told about a newer one — that is why 83 assets stayed old after the recovery until
  `fileIsNewer` (savedAt, both sides numeric, strictly newer) was added to all six loaders. It
  is also why agents had been re-issuing reworked assets under new ids; that is no longer
  needed. **`mergeById` in setupProxy applies the same rule on the way UP**, so a stale browser's
  bulk push can no longer roll the file back either.
* **A level (or dialogue, texture, background) that carries no `savedAt` cannot be told from a
  stale one.** Assets and stored groups were always stamped on save; the other four kinds never
  were, so `fileIsNewer`'s first form — both sides dated — reached every asset in the 2026-09-10
  recovery and not one of the four levels he was actually missing. His tab kept its Aug 22
  copies of Trailor Park M1-M3 and Forest M1 (no concession stand, no new enemies, 54 front cells
  short on the football level) while the file held the Sep 1 ones. Every save stamps now, and
  `newerRecord` — one exported rule, used by the six loaders AND by `mergeById` on the way up —
  says a dated save beats an undated one. To push a rebuilt record into a browser that already
  holds an undated copy, stamp it in the file; leave records you do NOT want to override undated.
  When you recover from a store, check the level metrics against every backup by hand before
  trusting "newest wins": M1/M2's front layer LOST 98/94 cells between Aug 22 and Sep 1, and
  that was his deliberate erase (cells drawn over a trailer that belonged under it), not a bug —
  a union would have put them back.
* **A test must never pin his data.** Two agent-written test blocks asserted that specific
  assets (three Vaporeon props, the Squirrel's death-pose geometry) exist in
  `asset-data/library.json` in a specific state. He had deleted the props and redrawn the
  Squirrel, and the tests would have vetoed the commit that brought his library back. Test
  authoring RULES against fixtures you construct; test his file only for structural invariants
  (every record has an id, no gravestones, KINDS match), never for the presence or shape of a
  particular piece of his art.
* **Commit `asset-data/` after he works, or the next container rebuild throws it away.** The
  container's copy of the file dies with the container; his browser store dies with the preview
  address. Git is the only durable tier, and only an agent commits to it. A dated full backup
  (`assetbuilder-backup-<date>.json`, exactly one, the newest) sits at the repo root as the
  second copy; the merged 2026-09-10 one is also in his Downloads.

### Getting data out of a preview address that is gone

An origin whose container no longer serves anything cannot be reached by the in-app
"Recover from a previous address" tool — that needs the old page to load so it can
answer a postMessage. But the browser still has the storage on disk, and it can be read
directly. This is how the 4 levels and 9 stored groups lost on 5 Aug were recovered.

Chrome keeps localStorage in a LevelDB at
`%LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Storage\leveldb`. The `.ldb`
tables are snappy-compressed, so grepping them finds the key names and returns garbage
for the values; they have to be parsed properly (SSTable footer -> index block -> data
blocks -> snappy -> prefix-compressed entries), plus the `.log` write-ahead file for the
most recent writes. Keys are `_<origin>\x00\x01<key>`, values are prefixed `\x00` for
UTF-16LE or `\x01` for Latin-1. Read-only, and Chrome does not need to be closed.

The old origin's records were then merged into `asset-data/library.json`, which is all it
takes: opening the studio on any address pulls the whole library back down.

## Architecture worth knowing

**Registries drive the UI generically** — one entry gets you the controls free:
`EFFECT_TYPES` (clothing abilities), `TEXTURES` (level textures), `LV_OBJ_SIZES`,
`PALETTES` (swatch-row colour themes — a new one appears in both pickers for free).

**A swatch row has two layers, in this order,** and any new one must keep it:
`palettePicker(...)`, the palette's own colours, `{swBreak}`, the recents, the `＋`
picker. `swBreak` is a full-width zero-height `div` that forces a flex wrap, so the
palette above it renders exactly as authored no matter how many recents exist. Put
the recents on the same line and they wrap *into* the palette — every custom colour
picked then shifts the palette's colours around, which is how the three palettes
came to look slowly "distorted" and got fixed. The `PALETTES` constants themselves
have never changed; if a palette looks wrong, suspect the row, not the hexes.

**PIECE IDS ARE NOT UNIQUE ACROSS AN ASSET, and anything that walks the whole asset by id has to
know that.** They are unique inside ONE pose list; the other poses and the per-body fits under
`.variants` are separate lists and do repeat them. **Eight of the 120 assets in the library carry
a collision.** The Jeans has `frwly0y` twice — a gold `#c8a23c` 6x10 belt buckle at (98,171) in
`angles.front`, and a blue `#386aff` 7x25 trouser leg at (63,206) in `variants.default.front`.

That is what broke **🪣 Change this color everywhere**, reported as “changing the blue on these
pants to black also changes the yellow belt buckle”. The group is resolved to piece IDS — and it
has to be, because a `<input type="color">` fires continuously while dragged, so re-matching on
the colour every step enrols anything the drag passes over. But an id ALONE then swept in a
different block that merely shared one: measured on his real Jeans, the old rule repainted **73**
blocks where there are only **71** blue ones, the two extras being that buckle in `angles.front`
(the copy actually on screen) and in the other body's fit.

So `inColorGroup` needs **both halves, and each is there because the other alone was wrong**: a
piece is in the group if its id is in the set **AND** it is still wearing one of the shades this
edit has painted. Two things follow that are easy to get wrong:

* **The shade being painted joins `seen` only AFTER this step** (`applyPieceColor`,
  `remapPalette`). Add it first and a same-id piece that already wears the colour you are painting
  TO passes the colour test — the same bug through the other door.
* **Carrying a group across a repaint means carrying that shade with it** —
  `colorGroupAfter(g, to)`. Its members are wearing the new colour by then, so a group handed on
  without it recognises nobody and the control goes dead on its second step. `updFx` (the
  brightness/glow/fade sliders) shares the same group deliberately, so both controls mean one
  thing.

**Do not “fix” this by re-IDing the saved art.** Ids are what saved groups, arm flags and every
other cross-pose reference are written in terms of; rewriting them rewrites his library. The
colour test costs nothing and is right whether or not ids are ever made unique.

**Poses.** `ANGLES` is the five base poses (front/back/side/up/crouch), but
`editablePoses(type, wtype)` is the real list per asset type — enemies also get
`attack` and `death`, and a ranged weapon has **no front pose at all**. Anything that
walks poses must use `editablePoses`, not `ANGLES`, or it silently drops art.
`displayPoseKey()` picks a pose that actually has art when showing an item on its own.

**ART COMES INTO THE EDITOR TWO WAYS, AND THE SECOND ONE IS THE PROPS LIBRARY.** A stored group
(a “stamp”) is a deep copy of some blocks kept outside any asset; the 📦 Stored shelf places one.
The trouble is that it is a flat list of names with no filing of any kind, so Blake was keeping a
SECOND, uncategorised copy of every reusable visual element on it purely so it could be stamped.
The 🌿 **Object art** shelf sits under it and does the same thing out of the props library, which
is the one asset kind carrying a sub-category (`propCat` / `groupProps`) — so the folders he
already files scenery under are the folders he picks trim, badges and signage out of.

* `propArtPieces(prop, frameIdx)` is the read: `frames[i].front`, which is the only pose a prop
  ever draws. Hitbox and muzzle blocks are dropped (metadata, never drawn — they would arrive as
  invisible mystery rows in the layer list); cutters are kept, because a cutter is part of the
  look it was drawn with. The list comes back BY REFERENCE, so `placeProp` copies before it bakes.
* **Mirroring is baked out on the way in**, for `storeGroup`'s reason (a live `scaleX(-1)` twin is
  not a group member, so the group would rotate and resize around something that doesn't follow)
  and for one specific to this door: a prop's art lives in `front`, where mirror applies, but the
  pose it is being dropped into may be `side`, where `pmirror` says it does not — an un-baked
  mirrored block would arrive as half of itself. That is also why the shelf's block count is
  `propArtBlockCount`, not `.length`: 12 entries on the middle frame of his Explosion LAND as 18.
* Nothing about the prop changes. It is not opened, not saved, not touched; what lands is
  ordinary blocks in the asset being drawn, held as a group with add-mode off so the first drag
  and the group controls move the whole arrival.
* **AND IT ARRIVES AT PROP SIZE, so it has to be shrinkable** — a bookshelf is 76 blocks spanning
  172 of the canvas's 200 units, and a badge on a shirt is maybe fifteen. It could not be shrunk
  at all, by two separate clamps that each reported success and changed nothing, which is why it
  read as a dead slider rather than as a limit.
  * `scalePieceGroup`'s floor was **one whole design unit per member**, expressed as the largest
    scale any member needs the group to keep. One 1-unit sliver therefore pinned the WHOLE group
    at 1.0 forever; a 2-unit one allowed exactly one halving and then pinned it. The bookshelf's
    thinnest block is 2, so the old floor let it go to 0.5 once and never again. It is
    `MIN_GROUP_PIECE_SIZE` (0.05) now — fifty times the 3-decimal rounding step, which is all the
    floor was ever really for: a member rounded to zero width is gone for good, because zero times
    any later scale is still zero. The output is clamped as well, so no route reaches zero.
  * Two rules stop the clamp doing the opposite of what was asked, and the old one broke both: a
    member already at or under the floor is **skipped** rather than counted (counted, it demands a
    scale above 1 and a request to shrink GROWS the group), and the clamp is **capped at 1**. A
    shrink may be refused, never inverted. `groupScaleFloor` is the one exported answer so the
    control can SAY it has hit the limit instead of going quiet.
  * The second clamp was the **control**, and it is the half that would have looked fixed and not
    been. A group's size was only ever askable through the anchor block's **Width** slider
    (`updSelSize` turns its new width into a group scale) — whole units, floor of 1 — so once the
    block you happened to have selected reached 1 there was no smaller number to ask for, whatever
    the other 75 were doing. **↙ Whole group size** (`scaleGroupBy`) takes a ratio instead. It is
    RELATIVE and re-centres on 100% when you let go, which is what makes it unlimited: measured on
    the real bookshelf, 172 units down to 1.25 over repeated drags, with its thinnest block
    resting exactly on the floor and never at zero.

**Level cells.** `lv.fg` / `lv.bg` / `lv.front`, keyed `"r,c"`. A value is a colour
string or `{ c, tex, ol, slope, run, step, upsideDown }`. A **foreground cell can hold
more than one fill**: `more` is an array of extra fills under the primary one, so a
gravel ramp can sit over grass blocks and two opposing ramps can share a cell. Read
cells through `fgFills` / `fgSolid` / `fgSlopeFills` — never test `!fgIsSlope(cell)`
for solidity, that only sees the primary fill. Paint through `mergeFgFill`.

**Objects** live in `lv.fx` → arrays of `{ kind, solid, inFront, size, z }`, keyed by the
object's **top-left** cell. Placement centres on the click (`objAnchor`), so the
clicked cell is usually *not* the key — find an object under a click with `objKeyAt`.
`rot` twists the art, `flip` mirrors it, `ox`/`oy` nudge it — all three move the ART
and never the footprint, which stays the axis-aligned square/rect `size` describes.

**A PROP'S "SOLID BY DEFAULT" IS READ BY THE OBJECT PICKER NOW** (2026-09-14). The flag was set in the
Object editor and read nowhere: picking a prop copied its default `size` into the placement controls
and left the Solid box at whatever it was last, so a stage flagged solid placed as decor right after a
row of pews and a bookshelf flagged solid blocked nothing. The picker's `onChange` now sets `lSolid`
from `solidDefault` beside the size. It is only the STARTING value — the box is still editable — and
nothing already placed changes, because `solid` is stamped on the placement.

**The "Church" prop folder (`chrpew1` Church Pew, `chrstg1` Chancel Stage, `chrplp1` Pulpit, `chraltr`
Altar Table, `chrcndl` Candle Stand, `chrcrss` Wall Cross; also `assets/church-pack.json`)** was built
for a small church interior. Two things about it are load-bearing: the pew is drawn END-ON (the view
from the aisle — end panel hides the seat, backrest leaning up behind it) and faces right, so a row
facing the other way is ⇄ Flip on each placement; and the stage is drawn exactly 8:1 so that at size 8
(or 16) its solid footprint is a whole number of cells — the collision grid is whole cells, so a
1.25-cell-tall solid prop blocks two rows and leaves an invisible ledge above the art. A 1-cell stage
is a step (`rise <= CH`), not a jump, for the player and for enemies alike. Verified in Playtest: a
character spawned above it settles with its feet on the stage row, not the floor.

**"THE WHEEL ISN'T ATTACHED" IS THE WHEEL-ARCH CUTTER, and the Canned Ham (`cnham60`, 2026-09-22) has
a solid well instead.** Blake asked for a trailer without "the floating on wheels effect a lot of the
existing cars and trailers have", and on seeing the first version clarified: "I meant the wheel wells
… it's as if you have a wheel not attached to the trailer." Trailer 1-5 and the three 1960s cars all
cut a see-through arch (a cutter circle a few units bigger than the tyre), so a ring of sky or level
background shows all round the top of every wheel and the tyre reads as a loose disc beside the body.
The Canned Ham draws NO arch cutter: a flat dark `#33302e` half-disc well (circle clipped at the chassis
rail's bottom) goes over the body, and the `#2b2b2b` tyre sits in it, so the wheel tucks up into the
body with no gap. That is the vehicle wheel idiom he wants from now on — do not copy the cars' arch
cutter into anything new.

**Separately, a prop can float for a second reason: fractional footprint rows.** A placed prop's
footprint top sits on a whole cell and its art is stretched to exactly
`rows = box.h * size / max(box.w, box.h)` — so when that is fractional, the art's bottom lands mid-cell
and the tyres hang up to a cell above the floor (Trailer 5 at his size 24 is 11.03 rows: ~1 cell of
air; Beetle 5.14 rows; Trailor 3's jack post reaches lower than its tyre, and Trailer 1's stray dot at
y=210 lifts it ~3 cells). The fix is in the DRAWING, not the code: the Canned Ham's visible art is
exactly **2:1** (190 x 95 units, x 6..196, y 75..170), so every even size is a whole number of rows
(24 -> 24x12, its default; 20 -> 20x10; 30 -> 30x15), and six pieces end exactly on the ground line
y=170 — the flat-bottomed tyre, three cinder blocks (tongue jack, door steps) and two stabiliser jack
feet. Verified in the running app: art bottom = floor top to the pixel, placed by click. A new ground
prop should do the same: pick a width:height with an integer rows-per-size at the sizes it will be
used at, and end every ground-touching piece on one y.

**Object draw order is `z`, and every render pass must go through
`levelObjectsInDrawOrder(fx)`.** It used to be `Object.keys(lv.fx)` order, which means
the order each *cell key* first entered the map — so dropping a prop onto a cell that
already held anything rendered it under everything placed since, and Blake hit this as
"I place the second prop and it goes behind the first". `migrateLevel` stamps the old
implicit order onto every object that has no `z` (`withObjectDrawOrder`), so existing
levels open unchanged; placement, drop and paste all take `nextObjectZ(fx)`. Anything
new that renders `lv.fx` and sorts by key order re-introduces the bug.

**...and `z` only orders objects WITHIN a layer, which is the second half of that same
bug and took a second attempt to find.** The rung an object drew on used to come from
its **Solid checkbox** (`solid ? rung 2 : rung 1`), and a CSS z-index beats DOM order
absolutely — so a solid grandstand was permanently in front of a decorative pitch and
neither placement order nor `⤒ Front` could ever swap them. The `z` work above was
correct and was simply being overruled one rung up; from outside it read as "you didn't
fix it".

An object now carries its own drawing layer in **`lay`** (`"bg"`/`"fg"`/`"front"`,
read via `objectLay`), independent of Solid — Solid means collision and nothing else.
`objectLay` falls back to the old solid/inFront rule when `lay` is absent, so every
existing level opens identical. The **Layer** buttons in the Adjust panel set it, and
`⤒ Front`/`⤓ Back` move `lay` as well as `z` (`orderEndLay`) so "Front" means front.

The CSS ladder is in **thousands** (1000 bg cells, 2000 fg cells, 6000 front cells) to
leave each rung room for its objects, and each object gets an explicit inline z-index of
rung + its place in the draw order (`levelObjectZIndex`). That explicitness matters:
props and emoji/shape objects render from **two different containers**, so DOM order
could never order them against each other whatever `z` said. `.lgrid` carries
`isolation:isolate` so those four-digit numbers stay local and can't outrank the modals
(z 30) and toasts (z 40).

**The `✥ Adjust` tool is how you get at an object that is already placed.** Everything
below hangs off it, and shipping the controls without it was worthless: the side panel
used to open only on an object you had just PLACED (or picked up and put down with
`👆 Select`), so a prop already sitting in a saved level could not be selected at all
and none of its alignment controls could be reached. Adjust clicks go through
`objTopAt` (key + stack index, topmost by z, smallest footprint wins), select without
moving anything, drag by exact pixels, and take arrow keys. **If you add another
per-object control, put it in the `📐 Move & align` card, not inside a stack row** —
folded into a row it reads as that row's colour-and-size settings and gets missed.

**Two props line up with each other through three things**, all in that card:
`snapTargetFor` + `relocateLevelObject` (butt edges / align tops / sit on ground — a
snap re-files the object under a new cell, because it routinely needs to travel further
than `OBJ_NUDGE_LIMIT`), the `OBJ_NUDGE_STEPS` ladder down to one screen pixel, and
`canvasScale`. That last one is the subtle one: by default `size` means the longer side
of a prop's **own visible art**, so `levelObjectFootprint` divides by each prop's own
crop and two halves of one backdrop come out at different scales however carefully they
were drawn to match. `canvasScale` divides by the shared 200x260 canvas instead, so any
two props at the same size render at identical px-per-design-unit.

**All three terrain layers STACK** (`paintIntoCell` → `mergeFgFill`), and all three offer
⧉ Replace to opt out. Only Foreground used to, on the reasoning that nothing walks on the
others so there was nothing to preserve — which confuses collision with paint. What a
merge preserves is the wall you already painted: a ramp drawn across a background brick
wall deleted the bricks under its diagonal and left a hole through to the empty level
behind. A ramp is not an eraser on any layer.

**🪣 Fill has TWO halves and they fail separately.** Its REACH is `computeFillRegion` +
`cellHasPaint`/`samePaint` — which cells the flood reaches (this is what "Fill skips the corners of
a room" and "Fill bleeds across textures" were). What it WRITES is `recolorMatching` — and that is
where "Fill distorts the ramps" lived, unfixed through three commits that all correctly fixed the
reach. It kept an ALLOWLIST of geometry keys to carry over, the list never learned about `rise` and
`rstep` when ramps grew a second dimension, and every steep ramp it touched came back as flat 45°
with every row claiming to be row 0. Trailor Int1 is one material end to end — walls, floor and all
24 of its ramps are the same wood panelling — so one click flattened 21 overhangs. It is a DENYLIST
now (`PAINT_IDENTITY_KEYS` = `c`, `tex`: the only two fields a recolour is for), so a future ramp
field is carried by default. **Never reintroduce a key allowlist over cell geometry.**
Rendering a stacked cell: nest the extra fills INSIDE the one `.lcell` rather than
emitting siblings. That div carries Background's 42% fade (and Front's `data-fk`, which
the play loop queries to fade covered cells), so siblings would each fade separately and
a merged cell would come out more solid than its neighbours.

**Foreground, Background AND Front all take ramps** — `terrainPaintShape` / `layerTakesRamps`
is the single gate, and every path (toolbar, click, drag, fill, ghost, eyedropper) must
ask it rather than testing layers itself. Front was excluded, so the ⬛/◢/◣ buttons
vanished the moment you picked the Front layer. Two halves again: the shape had nowhere
to be stored AND `lvFrontLayer` had no `clipPath`, so even a stored slope drew as a full
square. Watch `targetLayer` in the ramp-drag commit — it read
`lLayer === "bg" ? "bg" : "fg"`, which would have silently filed every Front ramp under
Foreground and given decoration collision. Front and Background never touch physics.

**A THROWABLE'S LOOK BELONGS TO THE THROWABLE, NOT TO ITS PAYLOAD.** `landPropId` — what a thrown
object leaves on the ground — used to live inside the 🔥 Burn ability card, and that is a bug of the
same shape as the Front-layer ramp buttons: pick a different payload and the control vanished with
it. A **Capture** throwable (Blake's Pokeball) therefore had no way to change its own appearance at
all, and the only route to the picker was to switch Burn on — setting light to the very creature it
was trying to catch. It is on the throwable's own card now (**⬇ Landing look**), beside Splash,
reachable whichever payload is selected. Landing ART and landing DAMAGE are separate: a 0 dps
landing still leaves its mark.

**And the two "default" emoji are per-weapon** (`landChar`, `explodeChar`, defaulting to
`DEFAULT_LAND_CHAR` 🔥 and `DEFAULT_BOOM_CHAR` 💥). Both used to be hard-coded at the point of
render — 💥 inside the boom layer, 🔥 inside the `HAZARDS` table — so "how do I change the explosion
emoji" had no answer: drawing a whole Prop was the only way to change either. The landing emoji
rides on the hazard cell as `char`; a cell written without one renders exactly as before. Both
pickers reuse the existing emoji modal via `setPicker({ mode: "land" | "boom" })` — note the app
renders **two copies** of that dialog (one in the Level Creator, one in the asset editor), so a new
mode has to be taught to both or it silently gets the other one's title.

**Explode is a SHOT's ability and is read nowhere on a throw.** `detonate` only ever runs from the
projectile pipeline; the thrown-landing path reads `landEffect*`, `landRadius`, `clusterCount`,
`captureMax` and `stun` and never looks at `explode`. Blake's Grenade carries `explode: true` and a
Boom art from before the picker was typed, so the card shows (`weaponAbilitiesFor` lists an ability
that is already on, so a stale flag can be removed) and does nothing — the explosion he sees is its
`landPropId`. The card now says so rather than sitting there looking live. **If you make throwables
really explode, that is a damage change to every grenade already built** — ask first.

**A shot's boom is sized like a placed prop (`boomLayout`, 2026-09-16).** "Boom size N" means the longer
side of the explosion prop's VISIBLE art spans N cells — the same `fitArt` footprint rule a fresh
placement uses, one box across every frame. It used to hand `propArtInner` four arguments against
a seven-argument signature (frame index in the `heightPx` slot, key in `frameIdx`): the whole
200x260 canvas was scaled into N cells and `frames[NaN]` meant only frame 0 ever drew, so Blake's
RPG at Boom size 8 came out 2.8 cells wide and never animated. Measured A/B in one page: 2.83 →
7.7 cells, 1 → 5 frames. Anything else that draws a prop outside `renderObj` must pass the tight
box, or it draws at canvas scale.

**A throwable's `damage` is its IMPACT damage** (`throwImpactDamage`), applied to whatever
it physically strikes — tested every frame of flight, so it catches both a hit in mid-air
and one that lands at someone's feet. It was read for melee and for shots and **for
throwables it was read nowhere**, so a thrown item passed straight through people: it
only ever collided with solid terrain. Blake's Rock (no burn, no splash, damage 10) did
literally nothing. Note the two damages are different things and the UI used to call both
"Damage" — Impact is the hit, Burn (`landEffectDps`) is the fire left behind.

**...and that impact scan is a scan for things to HURT, so a CAPTURE ball needs its own.** It skips
anything already at 0 HP and never runs at all on a 0-damage throwable — both right for Burn, Shock
and Cluster, both exactly backwards for a pokeball, whose only target in the world is a corpse. So
the one thing it was thrown at was the one thing it could not collide with: it went clean through the
dog and detonated wherever the floor happened to be. Measured against a body from every distance:
**from 1 to 5 cells away the catch failed every single time**, and it worked only from 6 to 8, where
the 45° arc comes down on the body by accident. That window is a function of throw distance, so it
slides whenever Strength, Weight or the weight curve moves — which is how it "used to work". Fixed
by `captureStopsOnBody` in the `landed` test: the ball STOPS on a body it could claim, built off the
same `canCapture` the payout uses so it can never stop on something it then refuses to catch. It
deals no damage doing it. **The general rule: a payload has to collide with its own target rather
than hoping the ballistics agree with it.**

**A throw is AIMED, on its own channel** (`p.throwAim`, `throwAimRad`). ↑/↓ and the diagonals
tip the arc the way they tip a gun's aim: neutral is the 45° lob it has always been, ↑ is a
high short lob over a wall, ↓ is a genuinely downward throw off a ledge. Two things were in
the way and both had to go. `p.aimDir` is gated on `p.aiming`, which `armHoldsAimPose` only
ever grants to a RANGED weapon, so every arrow read 0 with a grenade in hand — hence a fixed
45° whatever you held. And `throwLaunchVel` solved `R = v²·sin(2θ)/g` **per angle**, so any
throw at or below level collapsed to `v = 1` (sin(2θ) is 0 at horizontal, negative below, and
the `Math.max(1, …)` floor caught it): a grenade dropped on your own feet. Speed is now solved
once at 45° — bit-identical for a neutral throw — and simply fired along the aimed angle,
because how hard you throw is a property of the arm, not of the angle.

`p.throwAim` is deliberately NOT `p.aimDir`. That number also angles a gun's shot, so letting
a held throwable widen its gate would tilt the rifle you are carrying without its arm leaving
the level aim pose — a shot going somewhere the pose is not pointing.

**A thrown grenade's fire has TWO halves and they must expire together.** The damage is
a `lv.hazard` cell with a `life` countdown in `hazLife.current`; the thing you actually
SEE, when the throwable has a `landPropId`, is a separate `_thrown` prop pushed into
`lv.fx` at the same key (the hazard is flagged `hideInPlay` so the prop can draw over
it). Both must ask `hazardStillBurning(hazLife.current, key)` — the render pass had no
such check, so a Grenade set to 2.5 seconds stopped hurting on time and then sat there
visibly burning until Playtest stopped. Neither half is ever deleted mid-play: the
strip is a dedicated effect keyed on `play` alone, because this effect re-runs every
time a landing grenade calls `setLevel` and stripping here deleted each grenade's own
flames a frame after they landed.

**🐱 EXTRA LIVES (`EFFECT_TYPES.extraLives`, added 2026-09-12) — EVERY PLAYER DEATH GOES THROUGH
`playerDefeated`, and that is the invariant to keep.** Blake asked for "nine lives on the cat
head": instead of dying you flash and get back up on 1 HP *exactly where you fell*. There were
five death sites in the loop (fire, melee, thrown impact, blast, shot), each carrying its own copy
of the respawn line — precisely the shape that lets a rule reach four and miss the fifth — so they
now all call one closure in the Playtest effect. **Add a sixth way to die and route it through
`playerDefeated(p, msg)`**, never a bare `p.x = SPAWN.x`. The pieces:

* `extraLivesGranted(effects)` sums `lives` across worn items (Magazine Size / Ally Health style);
  `extraLivesLeft(effects, livesUsed.current)` is what you actually have. **`livesUsed` is a
  RUN-WIDE ref like `playerHP` and the wallet, wiped only by the ▶ button** — deliberately not
  per-item, so a pedestal swap off-and-on cannot restock (the Ally Health anti-farming rule).
  It survives doors and the effect's mid-play re-runs. The HUD line in the status row and the
  loop read the same two functions, so the number shown is the number you get.
* `reviveInPlace(p)` touches no position or velocity. **Losing a life KNOCKS YOU DOWN (since
  2026-09-16, Blake: "fall down for half a second and be invincible until they stand back up")**:
  it sets `down = EXTRA_LIFE_DOWN_FRAMES` (30) — the same 😵 channel a Tackle uses, so the sprite
  lays flat, input/AI freeze, and the loop sets the ordinary get-up grace by itself when `down`
  hits zero (`downCd` is deliberately not touched here). The untouchable window is
  `EXTRA_LIFE_GRACE_FRAMES` = 30 down + `EXTRA_LIFE_GETUP_FRAMES` (30) on your feet: read
  literally, "until they stand up" hands the next life straight to the fire you fell in, because
  you cannot walk while down and have a sixth of a second once up. `invuln` is raised to the same
  60 so the existing hit-blink shows the window, tinted gold, and **`p.lifeGrace` is the field
  fire honours** — `invuln` is ignored by fire on purpose (steady drain, not a hit). The same
  hands-empty clears as `knockDownPlayer` (blocking, throw aim, burst).
* **It works on ENEMIES too (2026-09-16), and it shipped without that first.** The line above
  used to say "player-side only, like Ally Health"; Blake's first report was "enemies with a bonus
  lives item do not get the bonus lives", which from where he stands is a bug — Tackle and
  Magazine Size both work in both directions. Do not take the enemy half out again. It is built
  the way the loot roll is built, and for the same reason: **eight** places can hurt a unit (fire,
  your swing, your shot, a splash, a thrown impact, a brawl hit, a foe's bullet into your ally, a
  grenade on your side), so the revive is ONE central pass just before the loot roll, using the
  loot pass's own "died this frame" test (HP ≤ 0 and no drop record yet). It runs before the
  loot roll and before the render, so a unit with a life left never drops loot and is never drawn
  as a corpse. The spent count is `ep.livesUsed` (the per-level bucket — a door does not restock,
  ▶ Playtest does); the lives come off `liveEnemyAsset(k, …).effects`, so a gear-tag roll that
  handed out the cat head counts. `reviveInPlace` is the same function (`ep` has the same fields;
  it also clears `restedDead`). **Every one of the eight damage sites asks `unitUntouchable(ep)`**
  (`ep.lifeGrace > 0`) — a ninth way to hurt a unit must ask it too, or a machine gun spends
  nine lives in a second. Shots and brawl hits on an untouchable unit are consumed and do nothing
  (the player's own i-frame reading); your melee arc and a splash pass it by; a rock still stops
  on it. On screen: the same gold blink on the wrapper and the same fall. **NO `🐱×N` count by
  the HP bar** — it shipped for one day and Blake's reply was "I don't like the x8 at all"; the
  toast and the fall are the whole tell. Do not bring it back.
* The effect card in the equipment editor now shows each effect's `blurb` (it never had, for any
  effect), and the ＋ Add buttons carry it as a tooltip.

**`.unitStatus` (a unit's HP bar, reload bar, 💫/😵, 💬) is UNDER the Front layer — z 5060,
since 2026-09-16.** It sat at 8000 from the start, on the theory that a unit's bars are information
you need even when it is behind a tree, and the result was an NPC inside a church, behind a painted
front wall, with its 💬 floating crisply on the outside of the building ("I don't like that I can
see the dialogue box … through a front layer"). 5060 is above the units (5000) and their corpses
(5050) and below Front objects (5101+) and Front paint (6000): whatever hides the unit hides its
badges, and the player's see-through window (frontFadeKeys/behindFade) reveals both together. The
player's own `.playerHpTrack` stays at 8000. If Blake ever asks for bars over trees again, that is
the object rung (5101) to slot between, not a return to 8000.

**Inside 5060 the bars sort themselves by who is being hurt (`unitStatusZ`, 2026-09-17).** Blake:
"whatever HP bars are going down shouldn't stay hidden under the ones that are not". A full bar is
5060, a bar that has ever fallen is 5061, and one that fell within the last `HP_BAR_HOT_MS` (1.5 s)
is 5062 — so in a pack the bar draining right now is always the one on top, and the whole band
still sits under Front objects at 5101. Detected by the bar's own HP falling between two renders
(`noteUnitHp` on the `unitHpSeen` ref), the ONE place every way of hurting a unit meets, rather
than a stamp at each of the eight damage sites.

**A melee swing hits EVERY body in its arc, once each (2026-09-17).** Blake: "a melee weapon
should be able to hit multiple enemies at once if they are all in the hit box." The player's swing
keeps `p.swingHits` (spawn key → true) for the stroke; each frame the arc is tested against every
living enemy not already in the map, so a swing overlapping the same body for six frames lands
once and a swing through three dogs lands three times, reported in ONE toast. `p.hitRegistered`
now means only "this stroke is spent" (a throw, a raise). The AI side is the same rule:
`ep.swingHit` is that map (it was a one-shot boolean), swept over the chosen target first, then
every other unit on the opposing side, then the player when a hostile was fighting your ally —
via `hitBodyOf`/`applyHitTo`, which are `applyAttackHit` parametrised by the body. A blocked blow
still staggers the swinger and ends the sweep. Verified in the running app: one machete swing took
20 off each of three overlapping 100-HP dummies and lifted all three bars to 5062; an enemy's
machete swing landed once on the player and once on the raised dummy beside them.

**👁 SEE THROUGH — hiding Foreground/Front in the editor (`lHidden`, 2026-09-16).** Blake: "I need
a button to inspect layers behind front layers so that I can edit the background layer behind this
front layer without erasing the front layer." Two toggles in their own `See through:` group beside
the layer tabs put `hideFg` / `hideFront` on `.lgrid` (only while NOT playing — Playtest never
inherits it); CSS `display:none`s that layer's cells and its `lay-*` objects, so nothing hidden
takes a click or an erase and the data is untouched. Picking a hidden layer's own tab shows it
again (never paint blind), hiding the layer you are on moves you to Background, a status line
says what is hidden, and Adjust refuses an object on a hidden layer with a message. Foreground
cells are bare `.lcell` — the fg rule excludes `.bg`, `.front` and `.moveSel`.

**A DROP SETTLES ONTO THE GROUND (`settleDropY`, 2026-09-16).** Blake: "an item dropped and I
cannot pick it up. I think it slightly dropped underground." It had: the loot pass placed a drop at
`ep.y + standH` whatever pose the unit died in, and a creature that DUCKED under the fatal shot
(crouch-capable units crouch-dodge incoming fire) has a crouch-height wrapper, so its loot went
`standH − crouchH` into the floor — 84px on a Bobby-sized look, past the ~40px pickup box. Now
the feet are the wrapper's ACTUAL bottom (crouch or stand) and the point settles: inside solid or
under the level, it comes UP to the top of that solid run (a downward-only scan started past the
level's end for a bottom-row corpse — the unit test caught it); in the air it comes down to the
first solid cell or object; nothing at all, the level floor. `enemyDropOverlapping` also grew a
half-cell apron below and beside the resting point (`DROP_PICK_SLACK_CELLS`) as the safety net.
The x is now the visible body's centre (`ep.x + centerFrac·renderW`), not the wrapper's left edge
plus half the hit width.

**LOOT ODDS DOUBLED, AND WHICH ITEM IS WEIGHTED (2026-09-17).** Blake, after playtesting the run:
"in testing not enough items drop" — and specifically that money notes never came up. Two changes:
* `ENEMY_ITEM_DROP_CHANCE` 5% → **10%** and `ENEMY_GEAR_DROP_CHANCE` 2% → **4%** (he asked for
  weapons and armour doubled too). Same two independent gates as before, consumables first.
* **Which consumable falls is a weighted pick** (`pickWeightedFromPool`), by a per-item
  `dropWeight` set in the item maker's 🎲 Drop weight card (default `DEFAULT_DROP_WEIGHT` = 1,
  so his existing library picks evenly, exactly as before). A note at weight 3 beside two weight-1
  potions is 3/5 of consumable drops. **Weight 0 = never off a body** — still fine on a pedestal or
  in a shop — and a pool that is ALL weight 0 rolls nothing rather than falling back to an even
  pick. Gear has no weight: what falls off a body is what it wore, and that pick stays even (in a
  mixed 🍀 Lucky Find pool gear counts as 1; a tagged pool that is all weight 0 is "nothing
  available" and does not spend the charm's roll). **The card is the number and nothing else** —
  the first cut had a live "X% of picks, 1 in N kills" readout under it, and the ⌨ controls
  banner in the level tester and the money item's how-to blurb went in the same breath: "you
  have a bad habit of leaving in useless UI text that just adds clutter". Both asset
  normalisers default the field, so an old item never reads as `undefined`.

Verified by seeding a 5-HP character carrying `{type:"extraLives", lives:3}` into
`asset-data/library.json` with a 30-dps fire pit and sampling every frame through the rAF shim:
three revives at the same (x,y) on HP 1 with `lifeGrace` 90→0 and the gold filter, then the
ordinary "Burned to a crisp" respawn at (60,40). Dress Bob packs a hat's `lives` onto the look
generically (checked on a saved look: `{type:"extraLives", lives:9, slot:"hat"}`). The enemy
half the same way, twice: the same look placed as a 👹 in the fire pit next to a no-lives control
(three revives at its own (x,y), the control dead from frame 3 and never back, then both corpses
and "burned up!"), and on a fire-free range shot with Bobs Gun — the first round kills and it gets
back up, the seven rounds fired during the flash change nothing, the first round after it kills
again, and after the third life "🎯 Hit … — defeated!" leaves a corpse that stays down.

**Mirroring a level** (`flipLevelHorizontally`, the ⇄ Flip buttons) is c -> cols-1-c on
every layer plus a reversal of everything that carries a direction: ramp `slope` and
`step`, object `flip`/`rot`/`ox` (and its key moves by the whole footprint, not the
anchor), enemy `facing`, and the connectors via `CONN_FLIP_H`. It is an exact
involution — the round-trip test is what proves nothing was missed, so **anything new
with a left/right sense must be added there**, or a flipped level breaks in a way only
that field shows.

**Layer z-ladder:** 1 bg · 2 fg · 4 climb/pedestals · 5 player/hazards · 6 front.

**🚶 TOP-DOWN IS THE FOURTH CLIMB KIND, AND IT IS A FLOOR, NOT A GRIP (added 2026-09-13).** Blake asked
for a crosswalk intersection: a patch of the level that plays like a top-down game — ←/→ is the
ordinary sideways walk, up/down the SCREEN shows the character's Back or Front, no gravity. It is
painted on the Climb layer as `{ kind: "topdown" }` so it gets the painting tool, the erase-by-glyph,
the flip rule and `migrateLevel` for free, and it is the only climb kind that takes the brush
(`paintBrush`), because an intersection is an area and the others are rungs. Everything else about
it is deliberately NOT a climb:

* **The loop keeps it in `p.topdown`, never `p.climbing`.** Every "no aiming / throwing / blocking
  while climbing" gate therefore stays exactly as it was and you can still fight on a street —
  verified: aim-up, an M16 shot and the hop all work standing on the plane. `climbKindAt` and
  `resolveClimbKind` skip top-down cells outright; a real ladder painted through the intersection is
  still a ladder and wins.
* **You are on it when your FEET are** (`topdownAt`: a one-cell window centred on the feet line at
  the body's horizontal centre), never by box overlap. A seven-cell body overlapping "any painted
  cell" would let the feet walk seven cells above the painted road before the head left it. Half a
  cell of slop either side so a region painted on the street row and one painted just above it both
  catch a player standing on the ground. It grabs automatically — there is no opt-in key, you are
  simply standing on a road — and the feet can't walk past the painted edge: W/S inch to it and pin
  there, the ladder's own top-of-zone rule. Walking sideways off the plane hands you back to gravity.
* **W/S walk up and down, the ARROWS still aim.** The merged `K.up`/`K.down` fold the arrows in (a
  ladder takes ↑/↓ on purpose), and reading those here made holding ↑ to aim a rifle also walk you
  80px up the road. The topdown branch reads raw `RK.up`/`RK.down`. S never crouches on the plane
  (crouch reads the dedicated C key there), or the key that walks you toward the camera would also
  squash you flat.
* **The pose is `p.tdView`** — "side"/"back"/"front", the direction you last walked, held when you
  stop; sideways wins a diagonal. `playerPoseKey` returns it below the crouch and aim-up rules, and
  it is the ONE place the player's Front pose is rendered in play (the pose-tab audit comment in the
  editor still says "NEVER front" for the player — it now means "never on a normal floor"). The
  front/back walk cycle is the ladder's alternating leg LIFT plus a gentle arm pump
  (`applyLimbSwing` with `legLift`/`armReach`), because a hip swing reads as nothing head-on.
* **Space is a beat-em-up hop**: `p.tdJumpY` remembers the line you left and the re-grab waits for
  `vy >= 0 && y >= tdJumpY`, then snaps you onto it. Without the height gate a plane painted tall
  enough that the feet never leave it mid-air made every jump a teleport up the road; without the
  `vy` half the re-grab fired the frame after take-off, while y still equalled the line — measured
  as a one-frame "jump". The view is kept through the hop, so you land still facing the way you were
  walking.
* **Enemies stand on it too (2026-09-17).** They used to know nothing about it and walked the real
  ground under gravity — so a road painted UP the screen, which has nothing solid under it, was a
  hole: a unit patrolling the kerb fell straight down the crossing the moment its feet left the
  last solid cell (Blake: "enemies can fall down the top down climbing surface. They should treat
  it like flat ground"). The enemy loop now runs the player's own two checks before its gravity:
  `topdownAt` at the FEET, then `topdownHolds` (the one shared hold rule — standing on it holds
  at the current height; a hop off it, `ep.tdJumpY`, is only re-grabbed when falling and back down
  to the line it left). Held, a unit has `vy = 0`, counts as `onGround` (so it keeps walking,
  dodging and fighting) and `ep.topdown` is set for the dodge-jump to read; otherwise the gravity
  block runs exactly as before. A corpse rests on the plane the same way. Enemies still do not WALK
  up or down the road — they hold whatever height they had when they stepped on, which for a
  crossing painted on the street is the street. Verified in the running app against a control build
  with the hold gated off: a Chasing Pit Bull seeking across a 14-cell column painted down from the
  kerb fell 300 px to the level floor and stayed there; with the hold on it crossed twice at
  y 348 to the pixel.

Verified in the running app on a seeded 60x30 level (a street at row 24, a 10x8 intersection over it
and a 6-wide road running up to row 8): sideways across the crossing at y 510 the whole way with the
side signature unchanged, W up to the pinned y 15 (= row 8's top edge - half a cell - 210), S down in
the front pose with no crouch, the hop rising 87px and landing on y 454.8 exactly, and a sideways
walk-off falling 51 frames to the street.

**A ROOM CAN BE A TOP-DOWN FLOOR: Trailor Int5, the back bedroom (2026-09-22).** Blake's trailer
interiors (Int1 kitchen, Int2 living room; Int3/Int4 are copies with an NPC) are one-point-perspective
dioramas: solid Foreground side walls, a Background back wall and carpet, and a hideInPlay floor row
the player walks along. Background ALWAYS draws at 42% over the grid (`.lcell.bg`), which is why the
far surfaces read dim — that is the look, not a bug. Int5 keeps it (bright birch Foreground side walls
and a curved ceiling, a dim Atomic-wallpaper back wall, his Yellow Carpet) and paints the whole
carpet as a 🚶 Top-down plane (rows 13..22, cols 6..33), so W/S walk you around the room. Blake had
held back from this because top-down "gets wonky around solid surfaces". What keeps it clean:
* **Nothing solid on the plane, and nothing standing ON it at all.** There is no y-sorting, so a
  piece placed mid-floor draws on the wrong side of a player walking behind it. Furniture stands
  against the back wall with its foot on the back-wall line (y 12; the feet reach 12.5 at most),
  the rug lies flat under the player, and the two foreground pieces (Snake Plant, Tripod Floor
  Lamp, `lay: "front"`) sit in the front corners the fence keeps you out of.
* **The plane's sides are FENCED, with full-height columns.** Walking sideways off a plane hands
  you back to gravity (deliberate, for crosswalks — do not change it for rooms). A staircase of
  fence cells along the perspective diagonal does not work: the body is 7 rows tall, so a fence
  cell a few rows above the feet lands inside the body's columns and pins it far from the edge.
  Int5 uses the solid side-wall blocks above the floor line and invisible (hideInPlay) blocks at
  cols 5 and 34 below it; the two slanted ramp rows between need nothing, because the body always
  overlaps a block above or below them.
* **Plane bottom row 22, not 23** — topdownAt's half-cell slop lets the feet go half a cell past
  the painted edge, and at 23 that is below the room. **The door sits at the front centre
  (21,19)** — doorOverlapping tests the whole body box, so a door at the back would fire from half
  the floor.
Verified in the running app: spawn at the door onto the plane; W to feet 376 (the back-wall line);
A and D stop the box on cols 6 / 34 at every depth with `topdown` held the whole way; S to the front;
a hop lands back on its line; door and pedestal prompts fire only at their spots; the Lava Lamp
cycles its 3 frames. New: the `atomicWallpaper` texture (registry), texture records Birch panelling
`brchpn5` and Atomic wallpaper `atmwlp5`, and eleven props under 📂 Interior — 1960s Bed `bed60s1`,
Nightstand Lamp `nstlmp1`, Mirror Dresser `drsrmr1`, Console TV `cnsltv1`, Sunburst Clock `snbrstc`,
Lava Lamp `lvlamp1` (animated), Cafe Curtains `cfcrtn1`, Braided Rug `brdrug1`, Snake Plant
`snkplnt`, Tripod Floor Lamp `trplmp1`, Sputnik Light `sptnklt` (`lay: "fg"`, so it draws over the
Foreground ceiling). Each is drawn on an exact whole-cell box (the Canned Ham rule) so it sits on
its line to the pixel. The whole set is also in `assets/trailer-bedroom-pack.json`.


**A FRONT-LAYER OBJECT FADES WHEN YOU WALK BEHIND IT, AND THAT FADE HAS TO BE COMPOSITED.**
`.lobj.infront` transitions `opacity`, and an un-promoted opacity transition is repainted by the
CPU on every one of the ~7 frames it runs — repainting the object's whole subtree, which for a
prop is its pixel art plus a CSS mask wrapper per cutter (Blake's Trailer 2 is 31 blocks and 5
cutters drawn 20 cells wide; a Berry Bush is 48 and 6, at size 8). He reported it as lag “just
when I first walk behind and when I am no longer behind”, and that shape is the diagnosis:
`behind` is a single boolean over the whole object, so those two moments are the only ones it
flips and therefore the only ones the transition runs — fully behind, opacity is constant and
nothing repaints, which is why the middle was smooth. The element carries `will-change: opacity`
for the duration of a playtest, so the transition runs on the compositor.

Two things that are deliberately NOT done, both of which look like the obvious next step:

* **`.lcell.front` fades the same way and is left alone.** Its see-through window is PADDED
  (`FRONT_FADE_PAD_CELLS`), so it slides a few cells at a time and those transitions run
  constantly while you walk rather than twice per object — if they were the expensive ones the
  stutter would be continuous, not at the two ends. They are plain boxes rather than masked art,
  and Tree Treasure Room 1 has **917** of them; a layer each would cost far more than the repaint
  it saved.
* **The promotion is gated on `play`.** `behind` cannot be true outside a playtest, so in the
  editor a layer per Front object is memory spent on a fade that can never happen.

Ruled out on the way, so nobody re-derives them: the per-cell `querySelector('[data-fk=...]')`
burst is **0.06–0.29 ms** for 131 cells measured on the real 917-cell sheet, and
`connectedFrontRegion` is gated behind a signature that changes on every cell boundary while you
walk, not just at the two ends. Neither matches the symptom.

**THE FRONT-PAINT WINDOW IS ROUND AND GRADED (`frontFadeMap`, 2026-09-16).** Blake, looking at
the padded rectangle at a flat 0.55: "it all becomes invisible in a big square … I'd like it to
become a more almost circular radius where the closer the front layer is to the player the more
you can see through it." So every Front cell within `FRONT_FADE_RADIUS_CELLS` (5) of the body's
BOX gets its own opacity: `FRONT_FADE_MIN_OPACITY` (0.15) touching you, rising with the square
of the distance to solid at the radius. Measured from the box, not the centre — a 7-cell body
measured from its middle would have its own feet half behind the wall — so it is a rounded
capsule, which reads as round once the radius beats the body's width. Quantised to
`FRONT_FADE_STEP` (0.05) and a cell that rounds to 1 is left out of the map, so a cell is written
only when its step moves: measured on the real church room, **~39 cell writes a frame while
walking and 0 standing still** (108 cells in the window). Elements are indexed per mounted layer
(`frontCellEl`, re-looked-up on a miss or a detached node) instead of a query per cell per frame.
The pedestal x-ray keeps the old flat `FRONT_XRAY_OPACITY` (0.55) — that is a reveal, not a
window. `frontFadeKeys` (unpadded) is still the yes/no "am I inside this building" test;
`FRONT_FADE_PAD_CELLS` is now unused by the loop and kept only for that function's tests.

**DIALOGUE TREES are the sixth saved kind, and that is the whole design.** A tree is authored on
its own screen (`screen === "dialogue"`, the 💬 tile on the menu) and levels only ever refer to it
by id. Written inside the level editor it would have belonged to the one sign you were standing on,
and hanging the same conversation on a second NPC would mean writing it twice.

    { id, name, start, nodes: { [nodeId]: { id, speaker, text, choices: [ { id, text, to, act, tone } ] } } }

* `to` is the next line (blank = the talk ends) and `act` is what taking it DOES. **They are
  independent** — "make me" turns a guard hostile AND still lets him get a last line out.
* `DIALOGUE_ACTS` is the registry: `hostile` / `friendly` / `calm` / `heal`. One entry gets you the
  editor picker and the play-side toast free. `DIALOGUE_TONES` is the same shape for the ✅/❌
  right-wrong flash, which shows **only once an option is picked** — colouring the list up front
  would hand the player the answer.
* Node/choice ids are prefixed `n`/`c` deliberately. `nodes` is an object, and JS floats
  integer-like keys to the front however they were inserted; `uid()` is base36 and does come out
  all-digits sometimes, which would silently reorder the editor.
* **Numbers 1-9 pick options and nothing else does** (`dialogueChoiceForKey`). A line with no
  options is given a synthesized "(Leave)", generated in ONE place (`dialogueOptions`) so what the
  screen offers and what a keypress does cannot drift.

**💵 MONEY AND SHOPS HANG OFF THAT SAME REGISTRY, and a shop is an OPTION rather than a place.**
`DIALOGUE_ACTS.shop` is the fifth act; taking it opens a shelf. That means a shopkeeper is an
ordinary talkable NPC and everything the tree already does works on one — he can refuse to trade
until you have said the right thing, sell you a rifle and *then* turn hostile, and the same tree
can hang on six market stalls. The act carries `tagParam: true` (the idiom `EFFECT_TYPES.tagBoost`
uses) and the choice grows one field, `shopTag`, because "browse his guns" and "browse his potions"
are two options on one line. `dialogueActNeedsPerson` is why a sign can run a shop but cannot turn
anybody hostile.

* **Money is an ITEM, not a new kind of thing** — a third `normItemEffect` kind next to heal and
  stat (`{kind:"money", amount}`). A dollar bill is drawn in the item editor like a potion, tagged
  like a potion, rolls onto a pedestal like a potion and drops off a body like a potion. Every
  route cash can reach the player by already existed; a separate "currency pickup" would have meant
  re-teaching all four of them. `isMoneyItem` is the one reader.
* **The wallet is run-wide** (`wallet` ref + `walletUI` state, the talkRef/talk pattern). Same
  shape as `playerHP` and for the same reason — money carried through a door is still money. It is
  deliberately NOT in the per-level `roomState` bucket, and only ▶ Playtest clears it. The 💵 badge
  in the header is the only permanent readout this game has; everything else is a toast, which is
  fine for what just happened and useless for a number you are about to spend.
* **`value` is on the asset, one number, read by every shop** (`itemValue`, on the three
  `HAS_CATEGORIES` types beside the categories, because a shop finds stock by the tag and prices it
  by the value). Not a price list per shopkeeper: re-price a rifle and every T1 stall re-prices it,
  and no two shops can disagree about what a rifle costs. 0 means FREE and is shown as such — a
  shop that refused to stock unpriced items would look broken rather than unfinished.
* **Nobody ever pays the value.** Buying costs 25% over at Intelligence 0 and 5% over at 10; a
  trade-in pays 75% of its own value at 0 and 95% at 10. Both slide 2% a point and they are
  separate constants, because they are separate dials and one spread would silently move both.
  `shopIntel` clamps to 0–10 rather than the slider's 1–10: worn kit and a timed 🧪 boost push the
  stat either side, and an unclamped line eventually pays you to shop. **Prices are quoted against
  the LIVE stat**, so an Int potion really does buy eight seconds of better prices — and the
  opposite is visible too: buying the Army Hat (−1 Int) puts every other price on the shelf up by a
  point, which is the feature, not a bug.
* **`shopNetPrice` IS SIGNED — a trade worth more than what you are buying hands the change back.**
  It shipped floored at zero out of a farming worry and the worry was wrong; refusing change is
  quietly confiscating the balance, since you handed the rifle over. **A round trip is a loss BY
  CONSTRUCTION:** buying costs at least 1.05x value and a trade-in pays at most 0.95x, so buying
  anything back always costs more than selling it just paid, at every Intelligence. There is a test
  asserting `shopTradeMultiplier(i) < shopBuyMultiplier(i)` across the whole range — **if either
  constant is ever moved so they cross, that stops being true** and the floor (or a real sell
  price) has to come back. Only a POSITIVE net can be unaffordable; the button shows `+39` in blue
  rather than a price when the trade pays you.
* **A TIER TAG IS NOT A KIND OF GARMENT, and `equipDisplacedSlot` used to think it was.** The
  cross-slot half of that rule ("you can't wear two Coats") reads free-text categories, and Blake's
  boxes hold three different sorts of thing: "Shirt" is a kind, "T1" is a tier, "Strong" is a mood.
  All 33 of his garments carry `t1`, across all seven slots — so a T1 hat "shared a category" with
  T1 underwear and claimed it, and since `SLOT_ORDER` starts at `under_bottom` the underwear was
  simply the first occupied slot the search reached. He reported it as "it is saying a hat would
  replace underwear". `equipKindTags(assets)` now asks the library which tags behave like kinds,
  and **both** signals are needed — measured on his data, either alone still lets a label through:
  * **how many slots it spans** (≤ `EQUIP_KIND_TAG_MAX_SLOTS`, 2): kills `t1` (7), `common` (5),
    `army` (5), `football` (3). Two is also the floor — a tag living in ONE slot can never
    cross-displace anyway, because the incoming item is then in that slot and the slot rule has
    already answered.
  * **whether a rifle also carries it**: kills `rare`, which is on a shirt and a jacket (so it
    passes the slot test) and on three of his guns. A kind of garment is not a kind of gun.
  What survives is exactly right: shirt, hat, glasses, shoes, pants, underwear, cape, jacket,
  socks. The `kindTags` argument is OPTIONAL and omitting it keeps the old library-blind answer, so
  no existing test or future caller changes behaviour by accident. **This fixes pedestals too** —
  the same wrong swap was there and nobody had noticed.
* **EVERY FLOATING LABEL IN THE LEVEL IS BARE WORDS — no box, no plate, no border on any of them.**
  `.pedcallout`, `.pedestalCap`, `.pedestalEmpty`, `.enemyDropCap`, `.doorPromptFloat`,
  `.talkCallout` and its `.talkKey`. They are the labels with no fixed backdrop: each hangs
  wherever its thing is standing, which might be a dark trailer wall, a pale sky or a lit fire. A
  panel would have to be opaque enough for the worst of those and would then be a slab in the
  middle of the room, so the contrast is carried by the TEXT — white, outlined in black on all four
  sides, with two soft black glows under that. **Both halves are load-bearing:** drop the four hard
  shadows and it dies on a light wall, drop the two soft ones and it dies on a busy texture. They
  share ONE rule so a new label cannot quietly drift back to having a box. Two deliberate
  exceptions: the dialogue BUBBLE keeps its panel (black on white — somebody is talking, and it is
  meant to read as a panel), and `.pedestalEmpty` keeps its red after the shared rule, because
  "no match" is a mis-tagged-filter warning rather than a caption.
* **...AND THEY ALL SIT IN FRONT OF THE PLAYER (`.pedLabels`, z 8500).** A pedestal draws BELOW the
  player on purpose — you walk in front of the item on its stand — but a z-index on a positioned
  element makes a stacking context, so its labels were trapped down there with it and the player's
  head covered the name of the very thing they were standing on to read. The labels are emitted as
  a SIBLING layer over the same box instead, exactly the trick `.unitStatus` already plays for an
  enemy's HP bar (stuck behind scenery for the same reason). Both are direct children of `.lgrid`,
  which is the one stacking context, so 8500 vs the player's 5000 is a real comparison. **A new
  in-level label goes in that layer, not inside the thing it labels.**
* The gold loot glow moved from `.enemyDropPlay` to `.enemyDropOrb` at the same time. A CSS filter
  applies to the whole subtree, so on the wrapper it put a gold halo around white letters that are
  supposed to be outlined in black. On the orb it still marks the loot, and on a drop with real art
  it now follows the drawn silhouette rather than a square.
* **The panel is square, slightly brighter and slightly transparent, with NO emoji in it at all**
  (Blake's call). The transparency is why every colour in the shop CSS is stated as `rgba` rather
  than inherited: the level shows through, so anything on top has to stay readable over whatever is
  behind it. Losing the emoji also lost the 💵, so amounts are labelled in words — a "Wallet" chip
  and bare numbers — rather than being given an invented currency sign. Do not let the app-wide
  rounded `.dlg`/`.ltbtn` look creep back in.
* **A blank tag sells NOTHING** — the opposite of a pedestal's blank filter, which searches the
  whole library on purpose. A shopkeeper whose tag you forgot to type offering every item in the
  game is a bug you would only find in Playtest. **And money is never stock**: a note worth 20 sold
  at a markup is a row that can only cost you money to press.
* **A SHOPKEEPER PUTS THREE THINGS OUT** (`SHOP_SHELF_SIZE`, `rollShopStock`), not his whole
  warehouse — 44 items tagged T1 is a scrolling spreadsheet, and it makes every stall selling that
  tag identical. Which three is decided ONCE per shopkeeper per run, from a seed, keyed
  `"<talk key>|<tag>"` in `shopRolls` — same shape and lifetime as `pedestalRolls`, wiped only by
  ▶ Playtest. Rolling on each open would let you close and re-open the panel until the thing you
  wanted appeared, and the rifle you left to go and afford would be gone when you came back with
  the money. The key includes the SPEAKER, so two stalls selling "T1" stock different things —
  which is the whole reason not to put the pool on one shelf. Ids are stored, not assets, so
  re-pricing an item mid-session reaches the shelf.
* **THE PANEL SHOWS WHAT YOU GIVE UP AND WHAT IT COSTS, AND NOTHING ELSE.** The first pass printed
  the arithmetic on every row ("💵 115 − 💵 85 for your Machete"), the shopkeeper's tag in the
  title, and a line explaining how Intelligence moves both rates; Blake's note was that this is
  reading a spreadsheet to buy a hat. The sum is unchanged, it is just not narrated — the button IS
  the price, and the only other thing a shopper needs is `↔ Replaces your X`, shown only when
  something actually leaves. Do not re-add the working out. Same call in the item editor's 💵 Value
  card: one short line at the neutral Int 5, not the range and the formula.
* **A purchase is a pedestal pickup that costs money**, and `buyFromShop` is written to keep it
  literally that — the same `wornEquipMap`/`equipDisplacedSlot`/`mergeEquip` swap, the same weapon
  and throwable slots, the same NULL-not-delete on the vacated slot. The only differences are that
  money changes hands and what you traded in does not land back on a plinth. `settleAllyHPCeiling`
  is now shared by both doors, because swapping kit is the only thing that moves the worn ally
  bonus and two copies of the top-up would be two chances to pay an ally twice.
* **The shop is a `.modal`, not a speech bubble**, and that is a deliberate departure from the rule
  above. What he SAYS is still in his bubble; this is a price list with a wallet, a trade-in column
  and a button per row, which is a menu — and the app's idiom for a menu is `.modal > .dlg`. It
  pauses the world on the same line the conversation does (`shopRef`, one early return), owns the
  keyboard while it is up (or Esc would close the talk *underneath* the shelf), and closing it
  drops you back into whatever the shopkeeper is still saying — the option's `to` is untouched, so
  act and destination stay independent exactly as they are everywhere else here.
* **One flash, not two.** `consumeItemNow` takes the shop's receipt as a `suffix` rather than the
  shop firing a second `flash`: two on the same tick and the second silently replaces the first —
  measured in play, buying a tonic showed only "paid 💵 23" and how much it healed you never
  appeared. A toast is a single slot.

Attachment is per PLACEMENT, not per asset: a `sign` marker (`{kind:"sign", dialogueId, text}` —
the `text` is the five-second version, a one-off line with no tree) and a spawn's `dialogueId`.

**ATTACHING A TREE TO A SPAWN IS WHAT MAKES IT PEACEFUL** (`spawnStartsPeaceful`). There is no
second "peaceful?" tickbox — a talkable enemy that opens fire before you can speak is not a thing
anyone would place. `unitSide` grew two gates in front of the old rule: `ep.turned`
("hostile"/"neutral", written ONLY by a choice being taken) and `ep.peaceful`. Both ride on `ep`,
which lives in the per-level `roomState` bucket, so an NPC you talked round is still on your side
after you leave through a door and come back. Recruiting reuses `ep.friendly` — the Resurrect
staff's own flag and its whole ally pipeline — rather than adding a second kind of ally.

**THERE IS ONE ALLY PIPELINE AND THREE WAYS INTO IT, and they are different colours.** `ep.friendly`
is still the only flag that means "fights for you" — same HP ceiling, targeting, follow behaviour,
immunity to your own shots. `ep.allyKind` records only where the ally CAME FROM, and `ALLY_KINDS`
is the registry that turns that into a glow, a hover badge and a verb, so the three can't drift:
`raised` 🟣 (the staff), `captured` 🔴 (a Capture throwable), `talked` 🟢 (a dialogue). An `ep`
with no `allyKind` falls back to purple, which is what every ally was before — so nothing already
standing in a level loses its glow. The glow is deliberately ONE soft shadow at ~70%: two stacked
solid ones read as a status effect painted over the art rather than as "this one is yours".

**THE TWO REVIVE BUDGETS ARE SEPARATE AND NEITHER SPENDS THE OTHER'S.** `canCapture` used to call
`canResurrect`, so a ball and a staff shared one "second life" per corpse. That ceiling is correct
for the STAFF — you carry it the whole level, so without it one weapon farms an endless army out of
one dog. A throwable is already its own ceiling, because every catch costs a grenade; charging it
against a per-body counter as well meant a stack of grenades you physically could not use. So the
staff still gets one raise per body ever (`resurrectedOnce`, which nothing else writes), and a
Capture throwable has no per-body limit at all — three of them raise the same creature three times.
A corpse the staff already spent can still be caught; a corpse a grenade raised has still not spent
the staff's raise. `ep.reviveCount` is the throwable's own tally and **gates nothing** — it exists
so the flash can say which life the thing is on.

Three things that are easy to get wrong here:

* **A conversation pauses the WORLD**, with one early return at the top of the rAF loop, not by
  zeroing the player's input the way a stun does. Freezing only the player leaves the pit bull
  chewing on you while you read, and every timer running down behind the text.
* **A peaceful NPC fights back when hit**, and that is checked ONCE per frame off its HP falling —
  not at the eight places that can damage a unit. One reader cannot fall out of step with itself.
  Deliberately narrow: only a spawn made peaceful by a dialogue. An asset with 🕊️ "Not hostile"
  ticked still stands there and never fights, exactly as levels already rely on.
* **An NPC with something still to say STANDS IN ITS FRONT POSE** until `ep.talked`, and is not
  mirrored while it does (a flip on front-facing art just swaps the character's left and right).
  Art with no Front drawn — every animal — falls back through `enemyPoseKey` to Side and uses the
  turn-to-look rule instead (`TALK_NOTICE_CELLS`), which is the only reason that rule still exists.
  It feeds `wantFace`, **never `ep.face`** — a third direct writer in that loop is the sprite-strobe
  bug `holdFacing` exists to prevent. Both the Front and Attack poses go through
  `alignPoseFootBaseline` against Side, or the body floats by whatever empty canvas its own drawing
  leaves under it.

### What the conversation looks like, and why it is where it is

**The bubble hangs over the speaker, INSIDE `.lgrid`, in level pixels** (`talkBubbleBox`, z 9600 —
above the door prompt's 9500). It shipped once as a bar fixed to the bottom of the window and that
was wrong twice over: you read the words in one place and watch the face in another, and with
several NPCs in a room it never said which of them was talking. `.lgrid`'s `isolation:isolate`
keeps those four-digit z-indexes local, so nothing in here can be relied on to sit above a modal.

`talkBubbleBox` does three things and each is a bug it prevents: it flips **below** the speaker
when the bubble would not fit above (a first line clipped off the top of the level), it **clamps**
to the level's width (a bubble hanging off into nothing at column 2), and it then puts the **tail**
back over the speaker's real head wherever the clamp moved the box to. It needs a measured height,
so the bubble renders once, measures itself into `talkH`, and settles — height 0 means "not laid
out yet" and must never be read as "it doesn't fit".

`scrollIntoView({block:"nearest"})` on open is the one concession to there being **no camera**. It
is scoped to opening a conversation only. Do not let it grow into a camera.

**Every pick acknowledges itself.** A tagged option flashes its ✅/❌ colour for
`TALK_PICK_FLASH_MS`; an untagged one flashes the panel's own blue for `TALK_PICK_FLASH_PLAIN_MS`,
about a third as long. The first pass committed untagged options on the same tick with nothing
changing on screen, and a keypress that worked was indistinguishable from one that was ignored.
`dialogueToneStyle` always returns a style, so the panel never has to ask whether a tone exists.

**Talk reach is `TALK_RANGE_CELLS` = 6, set by Blake from playing it.** 2.2 meant walking a
body-width past somebody made the prompt vanish. Do not tidy it back. The prompt is anchored to
the live body (`talkAnchorFor`), not the spawn cell — at six cells the difference is a third of a
room. `TALK_NOTICE_CELLS` must stay wider than the talk range.

**Piece rendering.** Cutters (`isCutter`) only punch through pieces in the same
contiguous same-source run (`cutterRuns` / `pieceSrcKey`). Anything that reorders
pieces must keep a cutter adjacent to what it cuts — see `groupWeaponBlocksByArm`.

**...and "the same run" is the whole trap when you are drawing a COSTUME.** `pieceSrcKey` is
`p._src || p._slot || "__body"`, so every piece of one enemy pose shares one source. A stored group
stamped onto an animal joins that run — which means a cutter drawn to punch a hole in the costume
punches straight through the ANIMAL, and you see the level through its leg. (Blake's own Pit Bulls
each carry a deliberate belly cutter, so this is a live idiom, not a hypothetical.) Draw holes as
shape instead — the Vaporeon set's leg holes are a sleeve with an open hem and bare leg below it.

**A STORED GROUP KEEPS ITS ABSOLUTE x/y** (`placeStamp` only re-ids the pieces). So a costume meant
for a particular creature must be authored ON that creature's own landmarks, or it lands somewhere
else and has to be dragged back by hand in every pose. Both shipped Pit Bulls have geometrically
identical side poses — head circle x34..68 y51..81, chest x50..86 y70..109, back line y79, rump
x116..144 y79..113, feet y150 — so those numbers are the fit for anything cloned from one.

**What point a piece turns about is `pieceOriginFrac`, and only that.** A block normally
rotates about its own centre, but one flagged `limb:"arm"` / `role:"weaponArm"` turns about
its shoulder — and every block drawn in the weapon editor is arm-flagged, so this is the
common case, not the exception. `shapeStyle`, `outlineStyle`, `cutterMaskCss` and the edge
snapper all read that one function. They used to each restate the rule and `cutterMaskCss`
got it wrong, so a cutter's hole was rotated about the box's middle while the art it was
cutting rotated about its top edge: the hole missed by `(I - R(rot))·(centre→edge)` and the
piece rendered solid. In-hand weapons were the ONE place it looked right, because
`attachWeaponBlocks` strips `limb`/`role` and pre-shifts the box to the centre-pivot
equivalent — which is why it read as "a pedestal bug" (bows, dropped loot and sleeve cutters
were all affected). Add a new pivot in `pieceOriginFrac`, never at a call site.

**Snap to edges** (🧲 checkbox, "Add a block"). While dragging, `findEdgeSnap` looks for an edge
of another block that is near (midpoints within `SNAP_DIST`), pointing roughly the same way
(`SNAP_ANGLE`) and of similar length (`SNAP_LEN_TOL`); `applyEdgeSnap` then welds the two edges
together, taking the neighbour's exact angle and edge length. Polygon shapes snap by their real
silhouette (`shapePolyPoints`), everything else by its box. Two things that are easy to get wrong:
the drag must re-derive the snap from the pick-up size/angle (`drag.current.base`) every frame or
the block welds to the first edge it brushes and can never be pulled off; and edge geometry must
use the same rotation origin the renderer does (`pieceOriginFrac`, arms pivot at the shoulder).
A held group only ever translates — turning it to suit one member would tear the assembly apart.

**A RUN IS THE GAME, AND THE CAMERA CAME WITH IT (2026-09-16).** Blake's first test build: an Intro
level, up to eight middle levels joined by their gates, an Exit level, sewers underneath — played as
one continuous world. Everything for it sits in one block of `App.js` headed `RUNS — a playable
chain of levels` (module level, just after `generateChain`), plus a few marked `// RUN —` / `// CAMERA —`
spots in the play loop and the level render. In plain words:

* **Starting one.** 🏁 Play run in the Level Creator's toolbar, with a seed box beside it. `buildRun`
  takes every SAVED level (the editor's live copy stands in for its saved one; a never-saved level
  stays out, or the blank one the creator opens on filled every slot with itself), picks a level whose
  free-text **Section** reads Intro (or Start/Beginning), chains middle levels east→west by
  `canAttach` — both gate pairs on the seam agree, at least one is an open mutual match, unused
  levels preferred so a level can still repeat — up to `RUN_MIDDLE_LEVELS` (8, the one knob), then a
  level whose Section reads Exit (or End/Ending) that attaches to the last one. Rooms are never in the
  chain. No Intro or Exit yet? It runs with the middles and the run line over the level says what is
  missing; it never refuses. The seed drives a `seededRng` (mulberry32 over `roomSeed`'s hash), so the
  same seed is the same run; blank rolls one and the box then shows it. `togglePlaytest` is the old
  ▶ Playtest button body, shared: the same per-session resets, plus parking the editor's scroll,
  snapping the camera, and on ■ Stop handing the editor its own level back (`run.editorLevel`).
* **One level is live at a time.** A run is a grid of NODES (`run.nodes`, `col`/`row`, `links` per
  side). Each node holds its own shallow, migrated copy of the level with a `runKey`, and the loop
  keys `roomState` and `sessionRooms` on `runKey || id`, so the two M4s in one run are two places.
  What lies on a side is decided the moment a level goes live (`resolveRunSides` →
  `resolveRunNeighbour`) and remembered: a node already sitting in that grid slot is joined when the
  gates agree and a wall when they don't; an empty slot gets a seeded pick among middle levels that
  attach there (Intro/Exit never fill side slots). That is how a bottom gate accepting "Sewer" finds a
  level with floor "Sewer" whose top gate accepts "Trailor Park", how the sewer's east gate leads to
  the slot under the NEXT main level, and why walking back through any gate lands in the SAME level.
  Behind the start and beyond the Exit's right gates the links are pinned to null: the run begins and
  ends there (the far side of the Exit flashes "Floor complete"; the next floor is a stub).
* **Crossing.** `runSeams` gives the live level its neighbours with each one's origin in this level's
  pixels (`neighbourOffset`: the offset that lays E1 on W1, S1 on N1 — the pairs share a coordinate,
  which is why his "bottom gates misplaced" worry was unfounded). At an open seam with a level behind
  it the edge clamp and the world-floor clamp are lifted — only near that gate, `gateLeavingThrough`
  (nearest open gate on that edge within `GATE_REACH_CELLS`); elsewhere the edge is the wall it always
  was. The body may straddle the edge; when its CENTRE crosses, `seamHandoff` subtracts the offset
  from the position AND the camera, stashes the held keys in `carryKeys` (the loop effect re-runs on
  `setLevel` and its stuck-key guard would drop a held D), keeps the leaving level's live copy on its
  node, and `setLevel`s the neighbour — the same mechanism a door uses, minus the animation. Momentum,
  facing and crouch are untouched. Verified on his real export: M1→M3→M2→M4 and back, x rebased by
  exactly 4800 each time, camera by exactly 4800, a mid-air vx of 20.47 carried across; a door on M1
  entered and left inside the run, back to the same slot.
* **What you see across a seam (superseded the same evening — see the seam-hitch bullet below; the
  strips became whole cached neighbours).** `seamStripLayers` drew `SEAM_STRIP_CELLS` (40) of each
  neighbour's bg/fg/front cells across the seam through the very same run/outline/clip code as the
  live layers, positioned by the offset, and `seamStripObjects` the objects whose footprint reaches
  into the strip (drawn static in the render body, props through `renderObj`). Enemies, fires and
  doors of a neighbour appear when it goes live. Memoized on the live level, so per frame it costs
  nothing; per level it is ~300–400 extra cells on his levels (measured 371 + 299 on M1). It is NOT
  the ten-levels-in-one-DOM build he first described — tile count is what has cost frames twice.
* **The camera.** `cameraTarget` (pure): centre the body, clamp to the level, but let the view run past
  an edge by the strip's width where a neighbour is drawn. `updateCamera` eases toward it
  (`CAMERA_EASE`, dt-scaled) into `camRef`; the level render reads `camRef` and emits a
  `translate3d` on `.lgrid` while play is on, inside `commitFrame`, so it lands on the frame it was
  computed for. `.lscroll` gets `overflow:hidden` (`.playing`) and its scroll position is parked at
  0,0 and restored on Stop; in the editor no transform is emitted at all. A door is a cut: both door
  swaps set `camRef.init = false` so the camera snaps on the far side instead of panning across the
  level. A plain ▶ Playtest gets the camera too (verified: follows, clamps, no strips, no run line).
* **The seam hitch, followers, and the bubble (later on 2026-09-16).** Blake's first play: "too much
  lag going from one level to the next", "followers should follow you through levels", and a
  nine-option dialogue whose words scrolled off the top. Measured in the test pane (dev build, ~30 ms
  frames): the handoff frame was **60 ms + 54 ms** — the whole live level's DOM torn down and the
  next one's built, ~2,000 nodes. Two changes, both in the level render:
  - **Tiles are cached per cell map and neighbours are drawn WHOLE** (`RUN_TILE_CACHE`, `runTiles`,
    `cachedRunTiles`): one wrapper per run node keyed by the node, so at the swap React only rewrites
    two `left` values and creates nothing. This replaced the 40-cell strips — a strip has different
    elements from the full level, so it could never be reused as the level. Whole neighbours cost
    per-frame JS (15.4 ms standing vs 12.3 with strips, 2,193 cells mounted vs 1,301) until…
  - **View culling during play** (`cullView` / `offScreen`, `VIEW_CULL_MARGIN_CELLS` = 8): props,
    front objects, neighbour objects and unit sprites (alive and dead, ~140 nodes each) are not
    rendered when their box misses the camera window by more than the margin. Physics, AI, collision,
    hazards and loot never read the DOM, so nothing else changes; the editor culls nothing. Standing
    per-frame JS **7.6 ms** (from 15.4), walking median 7 ms (from 16), the handoff **51 + 35 ms**
    (from 60 + 54) with the first new-level frame 19 ms (from 39). What is left of the hitch is the
    new level's on-screen sprites mounting and the loop effect re-running; if it is still felt, the
    next step is keying the object passes per node the way the tiles are.
  - Because the level being left stays mounted, `seamHandoff` un-fades its Front cells and drops
    their `will-change` BEFORE `setLevel` — the effect cleanup runs after `frontCellsRef` has moved.
  - **Followers come with you** (`carryAlliesAcrossSeam`, `ALLY_CARRY_RANGE_CELLS` = 24): every
    living `ep.friendly` unit within that range of the body at the crossing is moved — its spawn
    record into the next level's `enemies` under a fresh "r,c" key at its new place, its live state
    (position re-based, HP if it has one, rolled gear) into that level's bucket — and out of the level
    left. A unit that has never been hurt has NO `eHP` entry; that is alive, not dead (the first
    version got this wrong and carried nobody). Verified: a talked-over unit crossed M1→M3 as key
    "35,0" with its HP, M1 lost it, M3 gained it. The gang at M1's lower-right gate kills an ally in
    seconds, so a test ally needs its HP topped up like the player's.
  - **The bubble stays on SCREEN, not merely inside the level** (`talkBubbleBox` with `view`): the
    camera's window in level pixels is the fourth clamp; it flips below only when there is genuinely
    more room there, and hands back `maxH`, which caps the bubble — `.talkBubble` is a flex column,
    `.talkBox` never shrinks, `.talkOpts` scrolls. Verified on the Bridge Troll's nine-option node:
    bubble top 433 in a view starting at 423, the words fully visible, options 445 px scrolling in 64.
* **The seam hitch, measured and halved; chasers cross with you (2026-09-17).** Blake: "the camera
  sort of stops for a second, and then jerks with you again on the next level", and "if you have
  enemies following you they disappear as soon as you enter a new level … you can cheese enemy
  spawning with obvious level boundaries". Timing marks around the handoff in the test pane (dev
  build, 64 fps shim) put the freeze at **~100 ms**: 62 ms swap render + commit, then the first new
  frame took 28 ms, of which 25 ms was a forced layout and 1 ms was physics. The camera itself was
  continuous (rebased by exactly the seam offset, the transform on the very next commit) — the
  "stop" IS the freeze, and the "jerk" is play resuming. Three things were in that freeze:
  - **The level BEYOND the one entered was mounted whole in the swap** — ~1,300 tile boxes built
    (15 ms of elements), inserted and laid out, for a level 4,800 px off screen. Now a neighbour new
    to the run is built AND mounted `RUN_MOUNT_ITEMS_PER_FRAME` (30) items a frame (`runMountPlan`,
    `runTilesUpTo`, progress per node in `RUN_MOUNT_PROGRESS`, cleared by the wrapper's ref on
    unmount): bg runs, then fg runs, then front keys, until whole; then the one cached element as
    before. `runTiles` is no longer a `useMemo` for that reason (three small elements a frame; the
    cached layer elements inside bail out as they always did). The ref callback is one function
    per node (`runWrapperRef`) — an inline arrow is a new ref every render and React would call
    the old one with null each commit, wiping the progress.
  - **The editor's three tile memos were rebuilt for every swap** (`lvBgLayer`/`lvFgLayer`/
    `lvFrontLayer`, ~8,000 elements each, doubled by StrictMode) although the run wrappers draw
    the level. They are gated on `runNodeNow` now; a room inside a run has no `runKey` and still
    renders through them.
  - Result in the same pane: **handoff-to-first-new-commit 99 → 58 ms**, the swap render 62 → 22
    ms, the first frame's forced layout 25 → 7 ms; the ~16 frames after run 10–19 ms (dev build,
    StrictMode double-invokes the render so it mounts 2× the budget) then settle at 7–8. What is
    left is roughly two frames' worth of work in one; StrictMode's double render is a third of it
    and is not touched here. Note the loop's first frame after a swap has `lastT = null`, so
    `dtMul` is 1 — the lost time is not caught up, on purpose (catching up IS a jerk).
  - **What is chasing you comes through the gate too.** `carryAlliesAcrossSeam` takes an `opts`
    tail: `follows(ep, spawn, k)` decides which HOSTILE comes (the loop's rule in `seamHandoff`:
    not friendly, not `peaceful`, not floored or stunned, effective AI `seek` — `spawn.ai || ea.ai`,
    a Guard holds its ground and an Avoid keeps away — and `enemyDetects` true this frame, the
    game's own "aggro"), and `widthOf(spawn)` + `dst.cols` clamp every arrival INSIDE the next
    level, lined up one body apart from the seam edge (`atLow`/`atHigh`) — re-based, something
    behind you lands at x < 0 where `cellsHit` sees no cells and it would fall out of the world,
    and two same-speed chasers dropped on one pixel stay on it for good and read as one enemy
    (seen with four Pika-Squirrels). Allies get the same clamp. A room is a door, not a seam:
    nothing follows into one. Verified on his run seed 7, M4 → M1 through E1: the four Seek units
    that had caught sight of the player crossed as keys 19,0 / 19,2 / 19,11 / 19,16 (x 0, 64, …),
    the Guard squirrel and the peaceful Ash stayed on M4, and they kept chasing on M1.
* **Gates with nothing behind them.** Pressed against an edge at an open gate no level attaches to,
  the loop flashes once every 2.5 s (`gateNag`): "🚧 Bottom Left gate leads nowhere yet … (it accepts
  "Sewer")", "🏁 The run starts here", or "🏁 Floor complete!". Plain Playtest edges stay silent.

The tests (`describe("runs")`) build their own fixtures — never his levels — and cover the role
words, the seeded rng, the gate geometry, the chain rules, the missing-Intro/Exit notes, the sewer
slot logic, the camera clamp and the strip filters.

**Playtest performance.** The loop re-renders this whole component every frame (`setPframe`), so
anything in the level render body runs 60x a second. What is actually true, measured on Forest M1
(160x46, ~8,400 painted cells) — do not re-guess this, measure:

* the physics loop itself is **0.2ms**; JS render+commit is **~2.4ms**; forced layout **<0.5ms**.
* so the frame is not JS-bound locally. The load that was worth removing was **DOM size**:
  `cellRuns` merges horizontally-adjacent identical cells into one box, 8,361 tiles -> 805.
* tile layers are memoized AND each wrapped in its own memoized element (`CELL_LAYER_STYLE`).
  A memoized array alone is not enough but is worth little either — measured at ~0.2ms.
* `groundArt` caches the bake for items on pedestals / lying on the ground; both call sites used
  to re-bake and re-measure every item every frame.
* **Frame time is flat across a level; steady-state garbage was the other load.** Trailor Park
  measures the same at column 0, 70 and 130, so "slow at the start" is not script. What the loop
  *was* doing was allocating: `fgSolid`/`fgSlopeFills` built a throwaway array per cell per call,
  ~440 a frame (~26k/s) with the player and 7 enemies each running `cellsHit` several times.
  Both now take an allocation-free path — measured 440/frame → 0. A cell with `more` is the rare
  case; write these predicates to walk it, never to build a list.
* **"Stuttery" and "low FPS" are different bugs — ask which one.** The stutter was frame pacing,
  not load. Under `createRoot` a plain `setPframe` inside rAF only SCHEDULES the render: measured
  140 frames out of 140 where the DOM still held the previous position when the callback returned,
  the new one landing ~6ms later in a separate scheduler task. The browser painted the old position
  on the vsync the frame was computed for, so the visible step drifted in and out of phase — worst
  on ramps, where the small vertical step makes a doubled or dropped one obvious. `commitFrame()`
  wraps it in `flushSync`, which puts the commit back inside the frame (verified 104/104 in-frame,
  step SD 0.33px). Anything new that must be on screen for the frame it was computed for goes
  through `commitFrame`, not a bare setState.
* **There was no camera until 2026-09-16.** The view now follows the body during play through a
  `translate3d` on `.lgrid` (see the RUN section above: `cameraTarget`, `camRef`), not by scrolling —
  `.lscroll` is `overflow:hidden` while play is on and nothing calls `scrollLeft`. A view-follow bug
  is therefore a camera bug, and the editor never gets the transform at all.
* Paint/raster is NOT measurable in the hidden pane — say so rather than inventing a number. What
  differs across Trailor Park is composition, not count: column 0 carries 1035 textured cells and
  164 Front-layer cells over them, column 120 carries 421 and 62.
* **"Suddenly way laggier … random pretty bad stutters" (2026-09-18, Trailor Park M7).** The
  frame had DOUBLED and the collector was taking a frame every ten. Bisected in the test pane with
  his M7 export (10 units, 11 props): 64dae83 walked at p50 6.4 ms, HEAD at 10.3 ms. Two things,
  and a rule that comes out of them:
  - **Nothing in the render body may read the library bare.** `groupProps(allAssets)`,
    `groupLooks(allAssets)`, `catSuggest` and `floorSuggest` were plain `const`s in
    `AssetStudio`, so each playtest frame re-grouped and re-sorted 152 assets (twice, under
    StrictMode). They are `useMemo`s on `allAssets` / `levelLib` now. The tell in a profile is
    `groupByCategory` or `cmp` under `AssetStudio` at all.
  - **`localeCompare(y, undefined, { numeric: true })` builds an Intl.Collator PER CALL** (V8 only
    caches the no-options form), and a sort is hundreds of calls — ~3 µs each plus ICU garbage
    that fattens every scavenge. `NAME_COLLATOR` / `NUMERIC_COLLATOR` are the two collators the
    module owns; every sort by name goes through them. Same order, byte for byte (tested).
  - Also in that commit, because the profile showed them once the sorts were gone: `propArtCache`
    hands React the SAME element for a placed prop whose inputs have not changed (React bails out
    of the ~90-node subtree; the editor's erase path is uncached), `PROP_ART_BOX_CACHE` measures a
    prop record once, `CLIP_PATH_CACHE` builds a polygon string once per points array, and
    `src/index.js` no longer wraps the app in StrictMode — he plays the dev build, and the double
    render was ~3,200 React elements a frame against ~1,600 (see the comment there).
  - Result in the same pane, dressed Super Bob + M16 on M7: standing p50 5.9 → 4.1 ms, walking
    9.5 → 5.2 ms, p99 19.2 → 9.0 ms; garbage ~1.9 → ~1.4 MB a frame, so the scavenge every ~10
    frames costs ~6 ms instead of ~11. What is left is the sprites themselves (`Static` per piece,
    ~140 nodes for a look, rebuilt each frame because poses animate) and React dev-mode prop
    validation (~15% of the frame) — a per-unit sprite memo keyed on the pose inputs is the next
    step if he asks again.
  - **The JS self-profiler works in the pane.** `setupProxy.js` can set
    `Document-Policy: js-profiling` (temporarily — do not commit it) and then
    `new Profiler({ sampleInterval: 1 })` in `javascript_tool` gives real stacks with function
    names and bundle lines (the interval clamps to ~16 ms, so profile for 10+ s). Aggregate
    "total" time per App-level frame name; `sed -n <line>p` on the dev bundle maps a line back to
    App.js. Allocation: `performance.memory.usedJSHeapSize` is cached ~30 ms, so only the rate
    over 40+ frames means anything — and subtract the gated shim's own ~0.16 MB/frame of
    postMessage spin. Counting React elements a frame: wrap `Object.freeze` and count objects
    with `$typeof` (dev jsxDEV freezes every element).
  - **The Playtest player picker is not the first `<select>` with a look in it** any more — the
    👹 Enemy picker lists the wardrobe too since 9f0cbfd. A driver that picks a select by an
    option's text lands on the enemy picker and the player stays a ▢ Plain box, which measures
    ~2 ms a frame lighter than his real look. Find the player picker by its "Plain box" option.

Measuring it at all needs care: the Browser pane is usually hidden, so rAF never fires — patch it
to `setTimeout(cb, 16)`. And **do not sample with `setTimeout(…, 0)`**: nested timeouts are clamped
to 4ms by the spec, which made every measurement read "5ms" regardless of what was on screen and
sent a whole investigation down the wrong path. Post a `MessageChannel` message instead (not
clamped, and it lands after React's own scheduler task).

**THE CHURCH ON TRAILOR PARK M6 (2026-09-16): the see-through window was repainting textured cells.**
Blake: frame-rate dips, mostly inside the church, worse in combat, some on M3 too. Measured on his real
export (152 assets, 12 levels) in the running game, Squirrel in tow:

* Script is NOT it, and it is flat: the loop + React commit is **5.9–6.5 ms a frame** (dev build,
  timing wrapper on) at column 10 outdoors and at column 128 inside the church, standing or walking.
  Frame pacing on the shim is 60/60 everywhere. Nothing in the JS numbers tells the church apart.
* What tells it apart is what changes on screen. Walking outdoors writes **0** Front-cell styles a
  frame; walking through the church writes **~40–70** (144 cells sit in the window at once), and each
  write starts the 120 ms `.lcell.front` opacity transition. The church's Front sheet is 937 cells,
  704 of them textured — 588 white stone brick (90×45 tile, 18 rects), 64 stained glass (150×150 tile,
  **304 paths, 63 KB of SVG per cell**), 36 wood panelling. An un-promoted opacity change repaints the
  cell, and a repaint rebuilds the cell's SVG pattern from its vector paths (the rasterised tile is
  cached only for as long as the cell's paint record lives). Measured in the same page with a canvas
  pattern fill of the exact background image, per 30-px cell: **stained glass 0.58 ms fresh vs
  0.02 ms cached, grass 0.35 vs 0.01, stone brick 0.017 vs 0.007**. Up to ~20 glass cells plus ~100
  brick ones are in the window, and with the transition running all of them repaint every frame —
  that is a frame budget's worth of raster on top of the ordinary work, and nothing of the kind
  happens outdoors because nothing outdoors is a Front cell.
* The fix is `promotedFrontKeys`: the fade loop gives a Front cell `will-change: opacity` the FIRST
  time the window writes to it, so the opacity and its transition run on the compositor and the cell
  is never repainted again; the cleanup takes every layer back when play stops. Only cells the window
  has reached are promoted (144 standing, 529 after walking half the church, 0 outdoors, 0 after
  ■ Stop, all verified by reading the DOM back), and a cell stays promoted rather than following the
  window out, because dropping the layer repaints the cell into the sheet — the exact re-raster this
  avoids, at the trailing edge, on every cell boundary. Script cost after: 6.1–6.5 ms, unchanged.
* **What was NOT measured, and why.** The Browser pane stayed hidden for the whole session (the
  Claude window was on screen; the pane itself was closed), so the compositor produced no frames:
  no real frame times, no paint or raster timings, and the long-animation-frame API went silent too.
  The canvas number above is a stand-in for the raster, not the raster. If the pane is ever visible,
  the A/B is one CSS rule away in the same page: inject `.lcell.front{will-change:auto !important}`
  to get the old behaviour back, walk the church both ways, and compare rAF intervals.
* Ruled out on the way: props with cutters (9 masked elements on the whole level, none in the church
  viewport); Front-layer objects (28, none in the church viewport); DOM count (the church viewport
  holds 257 Front cells + 33 Background boxes + 6 objects against ~40 boxes outdoors — more, but
  static); the per-cell element lookup (indexed, see `frontCellEl`). Do not "fix" the stained glass
  by simplifying its SVG — it is Blake's texture, and with the layer its cost is paid once.
* Trap: the Squirrel follows you into the church and kills a 25 HP player in ~2 s, which reads as
  "the teleport failed" (the player is back at x=60). Find the HP ref (the numeric ref that drops by
  10 on a bite) and top it up before measuring.

**Facing.** Enemy art is drawn facing LEFT by default; player art (body/skin/dressed)
faces RIGHT. `enemyNeedsFlip` and `playerSpriteMirrored` are the two answers, and
anything deriving piece-local x from the mirror (muzzle spawn, melee hitbox) must read
the same one as the wrapper's `scaleX(-1)`.

**A unit's facing has exactly ONE writer per frame, and it is gated.** Two rules decide it —
`enemyFaceToward` (turn to your target) and then `enemyFaceThisFrame` (your feet override it
unless you're committed to an attack) — and they used to write to `ep.face` directly, one
after the other. A unit whose two rules disagree therefore mirrored its entire sprite every
frame. Measured on a resurrected Squirrel following the player: a run of 92 frames facing
left, ONE frame facing right, 44 more facing left. A 180° flip held for 16ms does not read as
a turn, it reads as **the sprite being in both orientations at once** — which is exactly how
Blake reported it ("its tail is both in front and behind at the same time"). Both rules now
feed a `wantFace` local and the single commit goes through `holdFacing`, which requires the
new direction to be wanted for `FACE_HOLD_FRAMES` (5, under a tenth of a second) before the
sprite takes it. **Do not add a third direct write to `ep.face` in the AI loop** — the one in
the attack-commit branch is deliberate and one-shot; anything else re-introduces the strobe.

Watch out for the trap on the way: dwelling only the SECOND rule makes it worse, not better.
The two then ping-pong on the dwell's own period and the ally strobes at a steady 5-on/1-off
instead of twitching occasionally — 30 flips in 288 frames, measured, against 3 before.

**Following you is not engaging you** (`ALLY_FOLLOW_RANGE_CELLS`). A friendly with no hostile
left to fight falls through to following the player, and it used to hold station on its own
*engage* range — the reach it attacks from. For an animal that is tiny: the Squirrel's is 30px,
so the stand-off band was 13.5–25.5px while the thing moves 6.2px a frame at Speed 14. It could
not sit still in a band two frames wide, so it corrected constantly, and every backward
correction turned it round. The follow band is ~1.2–2.2 cells instead.

Widening the band was not enough on its own, and this is the half that finished it: **`seek` has a
near side that REVERSES** when the target crowds it, so walking up to your own pet made it moonwalk
away from you facing the wrong way. Right for a fighter holding its range off an enemy, wrong for
something following you. Following has its own intent now (`allyFollowIntent`): close the distance,
or stand still, **never away, at any distance**. Walk into a follower and you simply walk through
it. The two thresholds (`ALLY_FOLLOW_RANGE_CELLS`, `ALLY_FOLLOW_STOP`) are hysteresis so it moves in
proper strides rather than stuttering one step at a time — a stride shorter than a few frames of its
own speed reads as a broken walk cycle, not as following.

**And a follower standing still faces the way YOU face**, rather than turning to look at you —
otherwise it spins to stare every time you walk past, and walking along together leaves it
permanently side-on. Measured after: 0 backward steps across 425 frames × 7 followers, facing runs
of 98–117 frames, and an idle follower matches the player's facing within the 5-frame `holdFacing`
dwell (80ms) and never longer. Combat stand-off is untouched — an archer still holds you at ITS
range and still backs off when crowded.

**Weapon flags** live flat on the asset (`explode`, `ignoreArmor`, `burst`,
`burstDelay`, `resurrect`, `stun`, …). Adding one means three places: the `newAsset`
defaults, a `migrate` default so older saves get it, and the editor control.
(`pierce` and `meleeBoost` skip the first two on purpose: absent reads as off.)

**🦍 MELEE BOOST (`WEAPON_ABILITIES.meleeBoost`, `meleeBoostOf`, added 2026-09-25) — a ranged weapon
you wear on your fists.** With a gun in hand, Q/V is the bare-handed pistol-whip: `UNARMED_DAMAGE`
x Strength/5, whatever the gun. `meleeBoost` (a number, 1.5–6, default 3; <= 1 is off, like
Burn/Cluster's numbers) multiplies that `UNARMED_DAMAGE` for as long as the weapon is held, and the
hit flash reads 🦍 instead of 👊. Ranged only: a melee weapon's swing is its own Damage already.
Built for the **DK Arms** (`dkarms1`), which also carries 🪡 Pierce. Verified in the running game:
"🦍 Hit Billy for 6" at Strength 5 (2 x 3).

**A ONE-ROUND gun can look loaded.** `weaponPoseFired` holds a `clipSize: 1` weapon on its FIRE art
for the whole reload, so draw the projectile IN the Rest art and leave it out of Fire, and the
weapon is visibly empty exactly while it reloads. The RPG does it with its rocket; the DK Arms do
it with the barrel (Rest: fists wrapped round a barrel; Fire: open hands). Put the 🔴 muzzle marker
on the held projectile's centre so the shot leaves from where it was drawn.

**A fired Projectile renders in a square `size` cells across, pieces as % of the 200x260 canvas**
(not `prepFlyingArt` — that is throwables). Art drawn at body scale comes out tiny: the first
Barrel was drawn 58 units wide and flew as a ~10px speck. Fill the canvas and set the size with
Scale instead (the Barrel is 174x208 at size 2.2).

**A UNIT'S HIT BOX STARTS AT `unitHitTop`, NEVER AT `ep.y + topFrac * eph`.** The renderer pushes
every sprite DOWN so the art's floor line sits on the terrain (`eAnchor`), and the HP bar with it;
the hit tests boxed the body on its UNPUSHED canvas. For a body drawn to the canvas floor that is
the same thing. For every animal it is one whole body height out: the Pit Bulls (ground line
y 148) had their box 107–208px above their feet with the drawn dog at 0–100px, the Squirrel the
same. Measured in the running game before the fix: a level shot at y 451 registered a hit on a dog
whose topmost drawn pixel was at y 500. Eleven sites (shots, swings, bites, tackles, blasts, rocks,
resurrect, capture, the dodge look-out) now all go through `unitHitTop(ea, shape, eph)`, which is
the renderer's own anchor rule. If you write a twelfth, use it.

**Ranged shots get a slight lock-on (`aimAssistAngle`).** A keyboard aims in five fixed directions
and the arc from each is fixed, so from a given spot there were five lines a bullet could fly. Now
the held direction picks a `AIM_ASSIST_CONE_DEG` (22°, half the spacing between held directions)
cone, and the shot is bent onto the NEAREST hostile whose box centre the real arc
(`projectileDropAtDistance`) can reach inside it — nearest, not smallest bend: the first drive with
smallest-bend sent a level shot over a dog 11 cells out to kill a squirrel 27 cells out. A body
whose centre is outside the cone still gets the cone-edge shot if that crosses its middle half; a
body behind solid cells (`shotPathClear`, the shot's own 2×2 probe) never locks. The fire block
re-reads the muzzle at the bent arm angle, and `p.firing.aimTilt` tilts the arm for the fire pose
so the lock-on is visible. No target in the cone = the shot flies exactly as held, including
straight up and facing away (both measured).

**Units get the same lock-on, pointed the other way.** A unit's "held direction" is the straight
line to its target's aim point (what it always fired along, which ignores the drop and so fell
short past half range), its targets come from the same `shotTargetsFor(foe, …)` builder the
player uses — you and your friendlies for a hostile, hostiles for a friendly — and `ep.shotTilt`
tilts its aim arm for the swing frames. Measured: an M16 Army Bob 762px from a CROUCHED player
put every straight-line round into the ground short of them (HP 100% for 330 frames); with the
solve it launches 7° higher and kills. Guns in enemy hands are meaningfully more dangerous at
range now, and crouching is no longer a way to duck long-range fire. The brawl target box in the
enemy loop was a twelfth un-anchored site (and sized the target with the SHOOTER's height); both
fixed there.

**THERE IS NO 👹 ENEMY FLAG ON A DRESSED LOOK ANY MORE, AND IT WAS REMOVED BECAUSE IT MADE
DUPLICATES.** `isEnemy` used to decide which Dress Bob looks the Level Creator would offer as
enemies, so wanting the same outfit as a fightable enemy meant saving it twice — and wanting that
enemy with a different gun meant saving it a third and a fourth time. The library shows exactly
what that cost: `Billy` / `Billy Enemy` (a bat) / `COUNTRY BILLY` (a gun) are one drawing, and so
are `Army Bob` / `Army Bob E` / `Army Bob EV` / `Army Bob EVG`, and `Footbob` / two separate
`Footbob E` / `FootBall Bob E`. Twenty character assets for perhaps eight looks, each one needing
every future edit made in all of its copies.

**A DRESSED LOOK FILES UNDER ONE FREE-TEXT 📂 CATEGORY, THE SAME ONE AN OBJECT CARRIES** (added
2026-09-18, "there are becoming a decently large amount of dressed Bobs"). Same `category` field,
same rules (trimmed, case-folded, "Unknown" last, names A→Z inside a folder), one reader:
`groupByCategory(assets, type)`, with `groupProps` and `groupLooks` as its two type-bound
spellings. Nothing in the game reads it — it is filing. It shows up in every place a look is
picked, all through one `lookOptions()` helper in App: Dress Bob's "Open saved look…", the Level
Creator's 👹 Enemy picker (animals get their own heading only once the looks have folders), the
Playtest player picker, and Load → Dressed Looks, which drills down by folder exactly as Objects
does. Fewer than two folders = the flat list it always was, so a wardrobe with nothing filed is
unchanged. The field lives in a 📂 Category card in Dress Bob's side panel with chips for the
folders already in use; `composeLook` trims it onto the saved record and `rebuildLook` keeps it
because it spreads the whole look. **Opening a saved look now fills its NAME into the header too**
(`openDressedLook`) — before, the box stayed blank and Save minted a second "<body> — dressed"
beside the one you had opened, which made "open it, file it, save" impossible.

So **every `character` is placeable as an enemy**, and what a placement CARRIES is stamped on the
spawn beside the facing, the AI and the dialogue that were already stamped there:

    lv.enemies["r,c"] = { enemyId, facing, ai?, dialogueId?, weaponId?, throwId?, throwCount? }

* `weaponId` absent or `""` = the look's own weapon, so **every level already saved opens
  unchanged** — that is the whole reason "" cannot double as "bare hands". `SPAWN_WEAPON_NONE`
  ("none") is bare hands; anything else is a weapon id. Read it through `spawnWeaponIdOf`, and ask
  `spawnOverridesWeapon` when you need to know whether the placement decided.
* **One resolver, `spawnWeaponFor`, and four readers** — the AI loop, the living sprite, the corpse
  and the loot roll. Four copies of "spawn override, else the look's own, else the embedded
  fallback" would be four chances to disagree, and they disagree *visibly*: the unit shoots one gun
  and is drawn holding another.
* **A dressed look bakes a frozen copy of its own weapon into its art**, so an override has to
  STRIP it (`_isWeapon`) before the real one is attached — and `if (ew)` is not the test, because
  "bare hands" leaves `ew` null and the old rifle painted on a unit that is punching you. Both the
  living sprite and the corpse ask `spawnOverridesWeapon`. The corpse only takes the strip-and-
  reattach path when the placement actually overrides, so untouched corpses render exactly as
  before (the baked-in position and the attached one are not guaranteed to agree to the pixel).
* `isEnemy` on looks already saved is **inert** — nothing reads it, so nothing needs migrating.
  `enemyMaxHP` splits on `type === "character"` now, which is the same line `isCreatureUnit` draws
  and always claimed to be.

**ENEMIES THROW GRENADES, and a thrown payload has a side exactly the way a bullet does.**
`throwId` + `throwCount` on the spawn is its own slot, not the weapon field — a rifleman who also
lobs one is the point, and one field would force a choice. The AI throw sits in the attack pipeline
and is gated at BOTH ends (`enemyWantsToThrow`): inside `ENEMY_THROW_MIN_CELLS` it stops throwing
and closes on you instead, which is also what stops it dropping one on its own feet, and the far
edge is the throwable's REAL reach — `throwRangeBlocks` on the thrower's Strength and the item's
Weight, the identical call your own throw makes. It lobs AT the target (`enemyThrowVelocity`)
rather than always at maximum reach, for the reason the Capture ball records: a payload has to
collide with its own target instead of hoping the ballistics agree with it.

Three things about it that are easy to get wrong:

* **It is deliberately NOT gated on `inSight`.** That test is a straight line through solid
  Foreground, and the entire reason to lob something is that it goes over the wall you are standing
  behind. It still has to have noticed you (`detected`) and be roughly on your floor.
* **`g.foe` is the same flag `pr.foe` is on a shot**, and every payload branches on it: impact
  damage, the Shock stun and the cluster bomblets. A hostile's grenade hits you and your allies,
  yours hits the hostiles, and neither ever hits the side that threw it. The landing FIRE is
  deliberately neutral — it burns whoever stands in it, thrower included, exactly as it always did.
  **Capture is the one payload that does nothing on a foe throw**: it is a player mechanic and the
  AI has no use for a corpse.
* **The throw animation is `ep.throwT`, never `ep.swingT`.** swingT drives the melee hit test, so
  borrowing it would mean a toss that also lands a punch — and on a unit holding a gun the aim pose
  outranks the swing, so a throw would not read as one. While throwT runs, the held weapon is
  suppressed and the grenade is drawn in the hand instead (you cannot swing a rifle to throw
  something), the same way the player's throwable-in-hand render works.

**And what drops is what it was FIGHTING with.** `enemyEquippedGear(ea, findAsset, spawn)` takes
the placement, so a spawn handed a bat drops the bat and not the rifle its look was drawn with, a
bare-handed spawn drops no weapon at all, and the grenades it has been lobbing are lootable (a
picked-up throwable arrives at ×3 like any other). The embedded `components.weapon` copy still
covers a weapon deleted from the library, but ONLY when the id is the look's own — otherwise a
placement pointed at some third deleted weapon would quietly hand you the look's rifle instead.
One consequence in `pieceBelongsToAsset`: a **throwable is never drawn on the body**, so it must
not answer the `_isWeapon` question, or looting a grenade off a corpse strips the rifle still lying
in its hands.

**AND A PLACEMENT CAN ROLL ITS GEAR OFF A TAG INSTEAD OF BEING HANDED ONE THING** — `gearTag` on
the spawn, beside the weapon and grenade pickers, running the **same search a 💎 Pedestal runs**
over the same free-text categories already typed on the items. Six copies of one guard tagged
"T1" are six loadouts instead of six identical ones. Blake's library is already tagged this way
(44 items on `t1`, 11 on `army`, 6 on `hat`), so the feature needed no new vocabulary.

* **The roll happens once, when the level is entered**, into the level's own `roomState` bucket
  (`gear`) next to the pedestal rolls — so leaving through a door and coming back does not
  re-dress everybody, and only ▶ Playtest re-rolls. Four readers each asking the tag for
  themselves would be four separate rolls: the unit shoots one gun, is drawn holding a second and
  drops a third. That is the exact failure `spawnWeaponFor` exists to prevent.
* **What it rolled is folded back into the placement** (`spawnWithRolledGear`) rather than read
  separately anywhere: a gun becomes `weaponId`, so `spawnOverridesWeapon` goes true and the
  frozen weapon baked into a dressed look is stripped exactly as a hand-picked override strips it;
  a grenade becomes `throwId`; a garment becomes `wearId`, which is its own field because it
  cannot ride in the weapon one. Nothing rolled returns the placement OBJECT ITSELF, so every
  level already saved goes through untouched — verified in the running app: an untagged spawn's
  sprite and corpse are byte-identical across five Playtests, a tagged one cycles the pool.
* **Clothing is actually worn**, not just dropped: `liveEnemyAsset` re-composes the look through
  `assembleLook` — the same compositor Dress Bob and the player's pedestal pickups use — with the
  rolled garment over that slot, which also writes it into the recipe so it loots off the body and
  strips off the corpse art. An Enemy-creator asset (an animal, a turret) has no body to dress, so
  it comes back untouched and the coat is loot only, via the `wearId` line in `enemyEquippedGear`.
* **Consumables are deliberately out of the pool** (`enemyGearTagPool`), which is the one place
  this parts company with a pedestal. A pedestal can hand you a potion because you drink it; an
  enemy is being asked what it CARRIES, and a rifleman holding a health tonic is the pool being
  wrong, not the roll.
* **A blank tag is not "everything".** A pedestal with no filter searches the whole library on
  purpose; a spawn with no tag is not rolling at all, and returning the library there would arm
  every enemy in every level ever saved with a random weapon.

**THE WEAPON PICKER IS GONE FROM DRESS BOB** (removed 2026-08-28, at Blake's request — "it's
clutter, I won't use it there"). What a character fights with is decided where it is USED: per
placement in the Level Creator, and per session for the player. A third place to answer it was the
only one whose answer gets FROZEN — a look saved holding a rifle bakes a copy of that rifle into
every pose, which every override downstream then has to strip back off the art. The card still
appears, and only then, for a look saved BEFORE this and carrying a `recipe.weaponId`, so a rifle
already baked into one of those can still be set to none and saved out. Do not "restore" it for
new looks.

Comments explain **why**, and usually name the bug that motivated the code. Match that
density.

**Stat sliders are 1-10 — except an enemy's Speed, which goes to 20** (`statSliderMax`).
That one number feeds `aiSpeed` (`2.2 * stat/5` px a frame) with nothing clamping it, so 10
was a UI ceiling rather than a game one — and both Pit Bulls were already sitting on it, so
there was no way to author an enemy faster than a dog until the Squirrel needed to be one.
Do NOT "tidy" it back to 10. The opposite half is deliberate too: every other stat, and every
stat on a skin, still stops at 10, because the player's own speed and agility go through
`Math.min(10, …)` and a slider that sets a number the game then ignores is worse than one
that stops.

**AN ANIMAL HAS NO ARM, AND TWO SYSTEMS ASSUMED EVERYTHING DOES.** Both halves read to Blake
as one bug — "the squirrel does 0 damage whether it's controlled by me or attacking me" — and
they are in completely different places, which is the usual shape here (see the throwable
`damage` note above).

* **Playing AS one could not attack at all.** The player's whole melee block hung off
  `armOf(...)`, which finds only a `role:"weaponArm"` piece; an animal has none, so the
  hit-test, the parry and resurrect-on-a-swing were all skipped and every swing was a silent
  no-op. Verified: 12 swings at an adjacent enemy, 25/25 HP untouched, not one flash. It now
  falls back to `creatureBiteBox` — one box in front of its own body, no arm, no guide hand,
  no weapon fit. That box is placed off `face`, **not** off the art's mirror, because the
  wrapper's `scaleX(-1)` always ends with the nose on the facing side however the art was
  drawn, so the facing IS the answer and cannot fall out of step with the sprite.
* **Its bite damage could not be set anywhere.** A creature holds no weapon, so
  `enemyAttackDamage` gave it `UNARMED_DAMAGE` scaled by Strength — Bob's bare knuckles — and the
  Enemy editor had HP, Speed, Strength and ⚔️ range but no damage field at all. Every animal in
  the game therefore sat between 1 and 4 damage however it was authored.

**A CREATURE'S MELEE IS 2x ITS STRENGTH** (`creatureMeleeDamage`, `CREATURE_MELEE_PER_STRENGTH`).
A separate `attackDamage` field was tried first and Blake rejected it as clutter, correctly:
Strength already means "how hard does this hit", and on a creature it fed *nothing else at all*,
so a second number was a dial that had to be kept in step with a dial that did nothing. Strength
is now the whole rule — 2 to 20 across the slider — and the 💪 Str hint in the editor reads
"· bites for N" so the rule is visible. **Do not re-add a damage field.**

The line is `isCreatureUnit` (asset type `enemy`), and it matters:

* **armed** anything → the weapon's own damage × Str/5, exactly as before. Untouched.
* **a creature** with no weapon → 2 × Strength.
* **a PERSON** with no weapon — a body, a dressed look, a 👹 Enemy in a hat — → `UNARMED_DAMAGE` ×
  Str/5, exactly as before. This half is load-bearing: the documented rule is that an enemy's
  fists are worth precisely what yours are, and putting thug knuckles on 2 × Str would restore
  the "Strength-10 thug punches for 20 while you punch the same thug for 4" bug. There is a test
  on it. Playing AS a creature bites for the same 2 × Str the AI bites you with.

**BALANCE, measured in play — this was a 5x increase at every Strength** (the old rule divided by
5, this one multiplies by 2), and Blake asked for it knowing that. Against the 15–30 HP pool a
body actually has:

| creature | Str | was | now | hits to drop a 25 HP body |
|---|---|---|---|---|
| Squirrel | 3 | 1 | 6 | 5 (was 25) |
| Jumping / Chasing Pit Bull | 8 | 3 | **16** | **2** |
| Elaphant | 10 | 4 | **20** | **2** |

Verified in Playtest: "👹 Elaphant hit you for 20", "👹 Jumping Pit Bull hit you for 16", Bobbett's
own fists still 2. So the Pit Bulls and the Elaphant two-shot an unarmoured player, and **Trailor
Park M1 has five Pit Bulls in it**. Defense still applies on top (10 Defense halves it), and this
is the intended shape of the change — but if a level suddenly reads as unfair, this is why, and the
dial to turn is that creature's 💪 Strength, not the constant.

**A CROUCHING UNIT'S BOX IS NOT THE SHAPE OF ITS ART, AND THAT SQUASHED THE GUN.** Sprite pieces
are laid out as percentages of their wrapper, so the wrapper's box IS the scale: horizontally
`renderW/W`, vertically `boxH/H`. Standing, those are equal by construction — `PLAYER_RENDER_W_CELLS`
is `PLAYER_H_CELLS * (W/H)` precisely so the render box is aspect-true. Duck and the height alone
drops 7 cells to 4.2, so everything inside flattens to **60% while staying full width**: the body,
and the rifle attached to its arm. Blake reported it as "enemies distort weapons when crouching and
firing" — the two happen together because enemies duck to **dodge a shot**, not to fire, so a ranged
one keeps aiming the whole time it is down there. Squashing is wrong on its own terms too:
`ePoseKey` already switches to the hand-drawn CROUCH pose, so the art was being crouched twice, once
by the artist and once by arithmetic.

The player never had this — `crouchArtPlane` keeps its art at a uniform scale and lets it overflow
the shorter box (`.playerWrap` is `overflow:visible`). `spriteUnsquashY(renderW, boxH)` is that same
rule for enemies, written as the correction factor rather than a second layout, and applied about
`spriteFloorY` (the floor line) so the feet stay planted and the body grows back UP out of the
shorter hitbox. It is **exactly 1** when the box is already aspect-true, so a standing unit renders
bit-identically and no extra element is emitted at all. Measured in Playtest with the correction
stripped on the same frame as a control: scaleX 0.8077 / scaleY 0.4846 (aspect 0.600) without it,
0.8077 / 0.8077 (aspect 1.000) with it, and the lowest drawn edge moves 0.00px either way.

**Animals are drawn side-on facing LEFT** (Jumping Pit Bull, Elaphant, Squirrel). No front or
back art at all; `side` / `up` / `crouch` are the same drawing with their own piece ids, plus
a hand-drawn `attack` and `death`. Feet land on a y=150 baseline — author the action poses on
that same line so `alignPoseFootBaseline` is a no-op rather than a drop, and keep the death
pose's lowest pixel there too or the corpse hangs in the air (`poseFootGapFrac`). Leg pieces
carry `limb:"leg"` and must fall into **two or more x-separated columns** (`multiLegPivot`
groups them with a 6px gap tolerance); one column falls through to the biped path and the
whole animal shuffles as one rigid block. On-screen height is `(artHeight / 260) * 7 * scale`
cells — canvas size and `scale` trade off exactly, so judge how big something is from that
number and never from how it looks in the editor.

## NEVER remove a feature to fix a bug

This is the rule that has been broken most often, and it makes Blake angrier than the
original bug. **Fix the defect. Do not delete the surrounding capability.** If a feature
looks like it is causing the bug, you have almost certainly misread the bug.

Both real examples come from the ranged-damage saga:

* Ranged crits were deleted while removing Strength scaling. Blake had said repeatedly
  that **crit chance is the one thing that SHOULD vary per character** on a gun.
* Tag Damage was then made melee-only because a hat made Army Bob's rifle hit 1.5x
  harder. That hat is **the feature working exactly as designed.**

The distinction that was missed both times, and the one to reason from:

> **Gear is a choice the player makes and can undo. A body stat is not.**
> A hat boosting your gun is intended. Your Strength stat boosting your gun was the bug.

So: an effect, ability, tooltip, control or behaviour that already exists is there because
Blake wanted it. Removing one is a product decision and is **his to make, not yours** — if
you genuinely think something must go, ask first and keep building everything else. When a
fix and a feature seem to conflict, narrow the fix until they don't.

## Working style Blake expects

* Ship it. Push fixes directly; don't present option menus. Try things before calling
  them impossible.
* Diagnose the actual root cause. Several bugs here were "fixed" repeatedly at the
  wrong layer — if a fix keeps not working, the data model is probably the problem.
* Say plainly what was verified and what wasn't. Flag behaviour changes that go
  beyond what was asked (e.g. a stat rule that also changes enemy difficulty).
* Do the whole request. It usually has several parts (a bug fix *and* UI cleanup);
  finishing only the interesting one reads as ignoring him.
