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

**Poses.** `ANGLES` is the five base poses (front/back/side/up/crouch), but
`editablePoses(type, wtype)` is the real list per asset type — enemies also get
`attack` and `death`, and a ranged weapon has **no front pose at all**. Anything that
walks poses must use `editablePoses`, not `ANGLES`, or it silently drops art.
`displayPoseKey()` picks a pose that actually has art when showing an item on its own.

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

**Mirroring a level** (`flipLevelHorizontally`, the ⇄ Flip buttons) is c -> cols-1-c on
every layer plus a reversal of everything that carries a direction: ramp `slope` and
`step`, object `flip`/`rot`/`ox` (and its key moves by the whole footprint, not the
anchor), enemy `facing`, and the connectors via `CONN_FLIP_H`. It is an exact
involution — the round-trip test is what proves nothing was missed, so **anything new
with a left/right sense must be added there**, or a flipped level breaks in a way only
that field shows.

**Layer z-ladder:** 1 bg · 2 fg · 4 climb/pedestals · 5 player/hazards · 6 front.

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
* **There is no camera.** Nothing in `src/` calls `scrollLeft`/`scrollTop`/`scrollIntoView`, so
  `.lscroll` never follows the player — walking to x=1364 in an 878px viewport leaves scrollLeft at
  0. Verify before assuming a view-follow bug is a regression; it has never existed.
* Paint/raster is NOT measurable in the hidden pane — say so rather than inventing a number. What
  differs across Trailor Park is composition, not count: column 0 carries 1035 textured cells and
  164 Front-layer cells over them, column 120 carries 421 and 62.

Measuring it at all needs care: the Browser pane is usually hidden, so rAF never fires — patch it
to `setTimeout(cb, 16)`. And **do not sample with `setTimeout(…, 0)`**: nested timeouts are clamped
to 4ms by the spec, which made every measurement read "5ms" regardless of what was on screen and
sent a whole investigation down the wrong path. Post a `MessageChannel` message instead (not
clamped, and it lands after React's own scheduler task).

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
