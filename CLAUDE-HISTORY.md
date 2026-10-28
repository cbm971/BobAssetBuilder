# Bob Asset Builder — full history and write-ups

**This is the archive, not the rules.** The rules are in `CLAUDE.md`, which Claude Code loads every
session. This file is the previous CLAUDE.md kept whole (2026-10-08): every bug story, measurement,
verification recipe and design note behind those rules. Grep it for a function or feature name
before changing that system. Line counts and dates below are as they were when each note was written.

---

# Bob Asset Builder — agent handoff

## FLYING CREATURES (`flies: true`, `flapCreatureWings`) & EAGLE ENEMY (`eagl1x9`) (2026-10-28)

- **Feature:** Added a **🦸 Flies** checkbox (`asset.flies`, `creatureFlies(ea)`) to the Enemy Creator's `📊 Stats` card for non-human enemies (`type: "enemy"`).
- **Flight & AI:** When `creatureFlies(ea)` is true and the creature is alive and not knocked down (`!(ep.down > 0)`), it stays airborne without falling under gravity, ignores ladders and top-down floor snaps, considers targets within `enemyChasesVertically` as reachable (`onMyLevel`), steers vertically toward the target's height (with a small hover clearance so it stays in the air while remaining within `sameLevel`), and hovers in place when idle or guarding. Playing as a flying creature in Playtest (`creatureFlies(basePlayerAsset)`) also flies continuously with W/↑/Space to climb and S/↓ to descend.
- **Wing Flapping (`flipPiecesVertically` & `flapCreatureWings`):** Pieces flagged `limb: "arm"` on a flying creature act as wings. While airborne, `ep.flapPhase` advances each frame (`FLAP_SPEED_IDLE` when hovering, `FLAP_SPEED_MOVE` when moving; skipped in `UNIT_ART_SIG_SKIP` so `unitArtCache` only updates when `ep.flapDown` toggles). When `flapDown` is true, `flapCreatureWings` reflects all wing pieces vertically across the wing's flat base edge (`wingBottom` when drawn above the body's midline, `wingTop` when drawn below), keeping the flat wing base in the same position relative to the bird while the pointed wingtips alternate above and below the body. `unitHoldArm` treats `limb: "arm"` on flying creatures as wings rather than hands so held weapons/throwables still attach at `holdPoint` / `enemyDefaultHoldPoint`.
- **Eagle Enemy (`eagl1x9`):** Authored the **Eagle** enemy (`type: "enemy"`, `flies: true`, `ai: "seek"`, `hp: 35`, `scale: 0.9`, `attackRange: 30`) across all 5 editable poses (`side`, `up`, `crouch`, `attack`, `death`) with zero `editorReachIssues`.

A browser game maker: draw assets out of blocks (bodies, skins, clothes, weapons,
enemies, props), dress a character, paint a level, then playtest it. Create React App
+ React 18. Everything is in **`src/App.js`** (~9400 lines). Tests in `src/App.test.js`.

## OCT 16 RECOVERY: MSIX VIRTUALIZATION, SELF-RESTART PORT RACE, AND BACKUP RESTORE (2026-10-16)

**What went wrong:** On Oct 15 Blake cleared cache/cookies, imported his backup, created 15 new assets
(`TV`, `TE1`–`TE6`, 7 characters, `Flannel Boxers`), deleted 6 old characters (`Bobbi`, `Roberta`,
`Billy`, `Bobby`, `Bobette`, `Bobert`), updated 11 items/weapons/equipment (which re-baked 26 worn
character looks), built `Trailor Int12`, updated 5 levels, painted `Smooth Wood`, and added 6 sounds.
On Oct 16 at 5:33 PM CDT, a new StackBlitz preview hostname came up on the stale Oct 14 `saves` branch
(295 assets instead of 304, 6 deleted characters resurrected, and backup import unable to clear them).

**Why:**
1. **The Save Keeper was dead since Oct 14 (`11:17:43Z`):**
   - Claude Desktop runs inside a Windows MSIX AppContainer (`Claude_pzs8sxrjxfjjc`), virtualizing
     `%LOCALAPPDATA%\BobOkay` to `Packages\Claude_pzs8sxrjxfjjc\LocalCache\Local\BobOkay` and killing
     its processes when Claude closed. Meanwhile the real `C:\Users\cbm97\AppData\Local\BobOkay\game`
     had an interrupted git reset from Sept 26 (`tools\bob-okay.js` missing from worktree), so
     `Startup\Bob Okay save keeper.cmd` silently exited at sign-in.
   - In `tools/bob-okay.js`, `restartIfNewCode()` and `keep()` called `server.close()` / `mutex.close()`
     without `closeAllConnections()` or awaiting the close callback before spawning the replacement
     process, causing `EADDRINUSE` / `pingKeep()` against the dying parent so both processes exited.
2. **Backup export/import & loader bugs in `src/App.js`:**
   - `exportAllAssets` did not export `removed`, and `restoreBackup` only added records on top of the
     stale `saves` branch and only called `projectLibrary.save(..., { revive: true })` for `sounds`,
     leaving the 6 deleted characters alive and letting loaders overwrite restored records from stale
     `projectLibrary`.
   - `migrateDialogue` stripped `savedAt`, `editedFrom`, and `soundVol` on every load and backup export.
   - `KNOWN_ASSET_TYPES` / `inferAssetType` / `normalizeAssetJson` / `migrate` lacked `"anim"`, so
     `restoreBackup` threw on `wakebed` and `cptrend` and skipped them.
   - Re-baking character looks in `saveAsset` did not call `stampSave(rebuilt, look)` or
     `projectLibrary.save({ assets: refreshedLooks })`, leaving `savedAt` unchanged so `decideSweep`
     and `newerRecord` ignored re-baked looks.

## EVERY COPY OF THE GAME OPENS ON HIS ONLINE SAVE (2026-10-03) — read this before anything about saving

**What went wrong, for the sixth time:** he plays on **StackBlitz**, not the desktop icon. On
2026-10-03 its preview came up on a new address. The new store was empty, so it restored the
committed `asset-data/library.json`, and an afternoon of edits (Rat, Fly and Turtle Mask, Super Bob,
Super Shirt, Proto Cape, new Super Mask/Boots/Pants) read as reverted. Two holes let it through:
1. **The keeper was not running.** Only the desktop icon started it, the PC restarted on 09-27,
   and nothing gathered his saves for a week.
2. **Even running, it could not have helped.** The keeper gathered every copy into the folder,
   but only the desktop copy ever READ the folder. A fresh StackBlitz address still started from the
   committed file.

All of it was still on disk (in the old address's Chrome IndexedDB). It was recovered in f35337d.

**What exists now:**
- **`saves` branch = his online save.** It holds `library.json` (`saveKeeperCore.cloudSnapshot`:
  sorted, stable, about 600 bytes of git delta per push) and `head.json` (`{hash, savedAt, records}`).
  The keeper (`cloudSync` in tools/bob-okay.js) pushes the folder there whenever it changes, at most
  once a minute. If someone else pushed meanwhile, it folds their file in first, newest save winning
  (`seedFrom("cloud")`), and pushes on top. It never force-pushes. A failed push is logged once and
  retried; the folder stays the save regardless.
- **Every copy reads it** (`cloudLibrary` + `mergeCloudLibrary` in App.js, merged inside
  `projectLibrary.load`): StackBlitz, Pages, the desktop copy, any brand-new address. It reads
  `raw.githubusercontent.com/cbm971/BobAssetBuilder/saves/head.json?t=…` and fetches `library.json`
  only when the hash changes. It checks again every 2 minutes while the tab is visible and not in
  Playtest, then runs every loader. Loaders adopt only STRICTLY newer records, so nothing saved in
  that copy is ever replaced. **Online deletes block restores but never purge:** a tombstone has no
  date, and the copy may hold something he brought back on purpose.
- **The keeper starts at sign-in and is watched.** `Startup\Bob Okay save keeper.cmd` runs
  `bob-okay.js keep`. That watchdog detaches, holds port 47018 as a single-instance lock, and restarts
  `serve` when two pings in a row fail. `launch` (the desktop icon) and `install` both put the
  Startup file in place, but only from the keeper's own clone (MANAGED), never from an agent's.

**Proof (2026-10-03):**
- A fresh browser, served the stale pre-recovery seed, opened on every one of his newest versions.
- The control (`localStorage.bobCloudSaves = "off"`, another fresh origin) showed the exact failure.
- An already-open stale copy adopted them on the next check.
- A scratch keeper against a local bare repo pushed a save in 24 s, merged another push instead of
  overwriting it, and survived an unreachable remote. Its watchdog restarted a killed keeper in 38 s.

**For agents:**
- **His newest saves are `git fetch origin saves` → `FETCH_HEAD:library.json`**, about a minute
  behind him while the keeper runs. Still re-read the live Chrome store before stamping his records
  ([[bab-rank-edits-on-newest-copy]] in memory).
- Deliver through the play branch's `asset-data/library.json` as before. The keeper reseeds it into
  the folder and publishes it.
- Push to `saves` only for a recovery, and only a superset built newest-wins. The keeper folds
  it in.
- Test a keeper with `BOB_CLOUD_REMOTE=<local bare repo>` or `BOB_NO_CLOUD=1`. Test the app with
  `localStorage.bobCloudSaves = "<base url>"` or `"off"`, set from `/asset-manifest.json` on a fresh
  origin (any other path on the dev server boots the app, which loads before you can set it).
- Running the dev server rewrites `asset-data/` from the browser. `git checkout -- asset-data/`
  before committing.

## HIS SAVES LIVE IN ONE FOLDER ON HIS PC (2026-09-26) — read this first

**`C:\Users\cbm97\OneDrive\Documents\Bob Okay\Saves`** is the save. One file per record
(`assets\<id>.json`, `levels\<id>.json`, ... + `removed.json`), and `History\<kind>\<id>\` holds
EVERY version ever seen, gzipped, named `<savedAt>~<which copy>.json.gz`. Nothing deletes from
History. It is OneDrive-backed, so it is also in his cloud.

**Why:** on 2026-09-26 he had two copies of the game open in one day. Each kept a private save
in its own browser storage and started from the committed `library.json`, so each showed half a
day as "reverted" (top-down interiors in one, M1–M9 edits in the other). It was the fifth loss of
that shape. He was clear: saves must work like Skyrim/Minecraft, one place, and **"addresses"
must never be his problem again — do not explain origins or preview hostnames to him.**

**How it works:** `tools/bob-okay.js` is the save keeper. The Desktop icon **"Bob Okay"**
(`tools/Bob Okay.cmd`, copied to his Desktop) runs `launch`. That fetches the play branch into
`%LOCALAPPDATA%\BobOkay\game` and rebuilds when the commit changed (~30–50 s, into
`%LOCALAPPDATA%\BobOkay\builds\<sha>`, keeping the last good build). It then starts the keeper
hidden and opens **http://localhost:47017**. The keeper serves the production build and
answers `/__library` from the folder, using setupProxy's own `applyWrite`, so App.js has one
storage path. On start and every minute it **sweeps every other copy of the game** out of the
Chrome/Edge profiles (StackBlitz previews, the Pages copy) with `tools/read-chrome-leveldb.js`
and folds their saves in. The rules are in `src/saveKeeperCore.js` and tested in
`saveKeeperCore.test.js`:
- newer work comes in;
- two copies that edited the same record from the same version are combined cell by cell;
- versions older than the keeper's first run are kept in History only (they are ancestors,
  never merged);
- a copy's deletes count only if made after the keeper first saw that copy.

Every 5 minutes it also checks GitHub, rebuilds, and restarts itself when its own code changed.
The log is `%LOCALAPPDATA%\BobOkay\keeper.log`.

**In the game:**
- **No save-status indicator on screen.** One shipped (a `💾 Documents\...` / `☁ Online copy`
  chip) and he rejected it the same day as clutter. `keeperLink.state` still says which copy
  this is, for code; the desktop copy only hides the 📁 Save folder button.
- The desktop copy refuses to be open in two tabs at once (Web Lock; "Play here instead" takes over).
- A desktop save that fails to reach the folder says so in a toast.

**For agents:**
- **His real library is the folder, not `asset-data/library.json`.**
  `node tools/bob-okay.js export <file>` writes it in library.json shape. Merge it into the
  repo file before building on his records or pushing library.json.
- Revisions you deliver through library.json reach the folder the same way as before: same id,
  strictly newer numeric `savedAt`.
- **Never point a test keeper at his folder.** Use `BOB_SAVES`, `BOB_HOME`, `BOB_PORT` and
  `BOB_NO_SWEEP=1`.
- The keeper only ever `git reset`s its own clone (`%LOCALAPPDATA%\BobOkay\game`). Run from
  your scratchpad clone, it leaves your tree alone.
- The StackBlitz link still works for anyone. Its saves are swept into his folder, but it does
  not *show* his folder's saves. That is why he plays from the icon.

## How Blake plays it

**In practice he still plays on the StackBlitz link** (the 2026-10-03 loss happened there). The "Bob
Okay" icon on his Desktop (2026-09-26) is the other copy. Since 2026-10-03 the copy he picks no
longer matters, because every copy opens on the online save (top of this file). Friends use the
**StackBlitz linked to PR #1**, not `main`. The branch is
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

**The Level Creator has TWO `<select>`s listing every character:** the enemy placement picker
(first option "— none —") and the Playtest player picker (first option "▢ Plain box"). Finding the
player picker by "has DK in it" picks the placement one, and you play as the plain box without
noticing. Match on the first option's text. The plain box has no asset, so the loop's `playerAsset`
is null. Until 2026-09-28, three `playerAsset.effects` reads in the shot and swing code threw on
the first trigger pull and froze the loop with no message. There is now a test that no unguarded
`playerAsset.effects` exists.

**Inject the rAF shim as a `<script>` element, not from inside `javascript_tool`.** A tool call
that throws (even a typo in a probe) tears down that call's context, and a MessageChannel shim
created there stops delivering frames: the game freezes and it looks like the feature broke. A shim
living in a page script survives. Put the per-frame driver (`window.__onFrame`, wrapped in
try/catch) in a page script too. After `location.reload()` the studio reopens on the screen it was
on, so "click Level Creator" can find nothing.

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
  Since 2026-09-27 it also turns arm-flagged pieces about the SHOULDER (`originFrac` = `pieceOriginFrac`) and
  keeps each cutter inside its own `_src` layer, so weapons and sleeves composed on a body render true —
  checked against the app's own `attachWeaponBlocks` output for Bobs Bow v2 (the aimed view came out the same both ways).
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
* **Add a record to `asset-data/library.json` by TEXT insertion, not by re-serialising the file.**
  The 2026-10-04 Turtle Shell commit (d175051) rewrote the whole file with a Python-style writer:
  every emoji is a `\uXXXX` escape and that record's numbers read `41.0`. `JSON.stringify(lib, null, 1)`
  no longer reproduces it byte for byte, so a parse-and-rewrite turns a one-record delivery into hundreds
  of changed lines (that commit shows 724 deletions for one new asset). Splice the new record in before the
  `\r\n ],` that closes `assets`, then parse both versions and assert every other record and section is
  identical. The Samurai Robes delivery did it this way and has 0 deleted lines (recipe: Samurai Robes, below).
  The dev server rewrites the file in its own style the next time it saves; that is harmless.
* **Samurai Robes (`smrrobe`, 2026-10-04): a jacket built on HIS Priest Cassock's rules** (`c4ss0ck`).
  The structure is robe top / sash / long skirt to y 245, with sleeves `overArms` + `limb:"arm"`. **Aim up**
  has every piece `overArms`, so the robe sits over the raised arms' base. **Crouch** has the skirt and sash
  `overArms`: the crouch reorder tucks plain jacket pieces in behind the bent knees, and without the flag the
  knees poke through the robe. The V neck is a point-down `tri` cutter, so whatever shirt is worn shows
  through. The side sleeve is the robe's colour, so only a dark cuff shows where it ends; keep the cuff clear
  of the sash. Start each sleeve 3 units above the shoulder, or the body arm's outline peeks over it.
  The generator, scratchpad `samurai.js`, is not committed; the record is in `assets/samurai-robes.json`.
* **Alien Mask (`alnmsk1`), Crocodile Mask (`crcmsk1`), Dino Tail Pants (`dinotl1`), 2026-10-04.** Blake asked
  for a cheap strap-on Halloween alien mask, a croc mask with the face showing through the open mouth, and
  costume pants with a dinosaur tail "for a crocodile human enemy". The pack is in
  `assets/croc-costume-and-alien-mask.json`. The masks were fitted the Turtle/Fly/Rat way: designed once on BoB
  front/side/back, then mapped to every body and pose with per-pose maps fitted from his Gorilla Mask. The pants
  use his Jeans' own boxes per body and pose, recoloured, with the belt, buckle and pockets dropped. Traps:
  - **What makes the alien look cheap:** a FACE plate, not a head. `ignoreHideIfHat: true` keeps his hair. Two
    thin `#1d1b1b` straps are drawn BEFORE the plate, so they show only at the head's sides and across the back
    of the head. Eye holes are mirrored circle cutters on that body's own iris (BoB `#5d6b39`, Bobbett `#560566`),
    re-placed per body after the mapping, so the wearer's eyes look out of the alien's.
  - **The croc's open mouth is a cutter.** A roundrect cutter on the hood shows the face, and the teeth are drawn
    after it so they are not cut. Side = one head-plus-upper-jaw poly whose underside stops above the eye, plus a
    lower jaw under the chin. The colours are his Crocodile enemy's. The eyes need a green half-circle LID: a
    round eye on a bump with no lid reads as a frog.
  - **The tail is a pants piece.** Front, Up and Crouch tails are `behindBody` and curl out on the floor beside the
    legs. The Side tail is listed before the pants pieces, so the seat covers its root. The Back tail sits over
    same-green pants, so it uses `fx.bright` 0.78. It carries no limb flag. `identifyLimbs` only guesses legs
    when nothing is flagged, and the pants legs carry `limb:"leg"`, so the tail never swings. Collision ignores
    it too, because `sideBodyShape` measures the body component of a dressed look.
  - Keep poly point counts small. A 160-sample tail outline added 31k lines to library.json; valley-peak-valley
    spikes give the same picture at 35 points.
  - **Hidden-pane proof that worked:** in Dress Bob, set the selects with the native value setter + `change`.
    Snapshot `.art` per pose through a computed-style-inlined `foreignObject`, and POST the canvas dataURL to a
    6-line local node receiver on another port.
* **Fly Wings (`flywng1`) and Crown of Thorns (`thrncrn`), 2026-10-05.** Blake asked for "a fly wings item, so like a
  cape" and "a sort of crown of thorns", saying he would give the crown an extra life himself, so its `effects` are
  left empty. The pack is in `assets/fly-wings-and-crown-of-thorns.json`, and the generator was scratchpad `gen.js`.
  - **The wings are worn the way his capes are:** jacket slot, category `T1/Cape/Bug` (the Bug tag pairs them with
    the Fly Mask), and they carry the 🦸 Fly effect at its defaults. Each wing is one `circle` membrane at
    `fx.opacity` 0.5 with a `#1d1b1b` outline, plus two dark vein rects. Front, Up and Crouch are `behindBody`. Back
    lies over the back (`overArms`) with a small dark mount where the wings meet. In Side, the far wing is
    `behindBody` and the near wing is `overArms`, both swept back.
  - **A translucent piece can only take an outline if it is a rect, circle, roundrect or stadium.** Those draw the
    outline as a box-shadow ring. Every clip-path shape (tri, poly, star, ...) draws its outline as a SOLID silhouette
    under the fill (`outlineFillStyle`), so a see-through tri or poly with an outline turns dark all over.
  - **The crown is a ring in two halves.** v1 was one `circle` with an inset `circle` cutter, drawn whole over the
    head. Blake: "The crown needs the back half to be behind the head and hair." Now each pose has two half-ring
    `poly`s, made from that ring's own ellipses with 12 steps per arc. The BACK (upper) half and every thorn
    standing on it are `behindBody`, so they go in the compositor's `back` bucket, under the body, the skin's hair
    and everything else. The FRONT (lower) half and its thorns stay over the forehead, and they reach 6° past each
    end so the halves overlap with no seam. This is the same in Back and Side: the upper arc is always the far
    side. Thorns are `tri`s on the ring's outer normal. `ignoreHideIfHat: true` keeps the hair. A flat band with
    thorns read as a stick, not a crown. **Any headband/ring hat should be split this way**, because a hat piece is
    otherwise drawn over the hair (hats are last in the stack, under only the arms).
  - **When the Browser pane cannot reach another port** (every cross-port `fetch` said "Failed to fetch" on
    2026-10-05), POST each snapshot to the dev server's own `/__library` as a throwaway record (`{assets:[{id:
    "zzshot-…", type:"prop", png:dataURL}]}`). Read it back out of `asset-data/library.json`, then
    `git checkout -- asset-data/` and re-run the delivery.

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

**How a dressed look is stacked (`layerBodyAndOverlays`), and the two rules added 2026-10-03.**
Back to front: behind-body pieces · body (with "Behind legs" pieces tucked in, see below) · skin
decor · shoes · undershirt · pants/underwear · shirt/jacket · **hat** · body arm · over-arms
pieces. Two of Blake's reports set that order:
- **"Behind legs should just put it behind legs. it shouldn't put it behind body."** It used to
  drop the piece under the WHOLE body, so his Jean Shorts (every Crouch piece ticked) vanished
  when you ducked; DK showed his Tidy Whiteys instead. Now `tuckBehindLegs` puts it over the
  torso and under the legs drawn after the torso. If any pants piece is tucked in a pose, the
  underwear bottoms are tucked with it, under the pants. BoB's and Bobbett's crouch legs start
  at the hip, so ticked shorts still show only around the legs; that is the flag doing what he
  said. Unticking it on a piece brings that piece over the legs.
- **"Arms went through helmet."** Hats were composed last, over the arms, so the raised arm of the
  Up pose, a swing windup or a throw went under the helmet. `hatsUnderArms` moves hat pieces to
  just under the body's arm (and under the held weapon's behind-arm grip). It also runs on the
  player's blocks and every unit's baked pose at render, so old saved looks get it too.
- The piece editor previews both: a pants/underwear piece ticked Behind legs draws under the
  guide's legs, and a hat draws under the guide's arm. It used to draw both over the whole guide,
  which is how the shorts bug went unseen while he drew them.
- **Units re-compose their look's DRAWING per run** (`liveEnemyAsset`, the art only; stats,
  effects and settings stay the saved look's). Before this a layering fix reached the player
  (`livePlayerBlocks` always re-composes) but never the enemies, whose art was frozen at save.

**Registries drive the UI generically** — one entry gets you the controls free:
`EFFECT_TYPES` (clothing abilities), `TEXTURES` (level textures), `LV_OBJ_SIZES`,
`PALETTES` (swatch-row colour themes — a new one appears in both pickers for free).

**A texture can be a BAND (2026-09-28: 🏗️ Steel girder, Blake's Donkey Kong girder — the only
one so far).** Every other `TEXTURES` entry is one tile repeated forever; a band's look depends
on how much of it is painted. A column of girder cells is ONE girder that many rows deep
(`textureBandAt`, capped at `GIRDER_MAX_DEPTH` = 4, taller stacks split evenly), drawn from a
tile made for that depth, with end posts where it stops (`cellBand` → `capL`/`capR`). So the
renderer needs the map: `cellRuns(map, texLib)` splits a row where the depth changes, and
`cellOutlineStyle(map, cell, r, c, texLib, span)` needs the run's `span` or the right-hand post
lands on the run's first cell. A deep girder must be two columns wide (`cellBandAt`) — the filler
under a dragged ramp came out as a row of pillars otherwise — and on a ramp the top chord rides
the surface (`rampBandY`), stepping like DK's slopes. `clear: true` means see-through holes: no
base colour under the tile, on cells and on art pieces. The pickers pass `TEX_SWATCH_BAND` /
`TEX_CHIP_BAND`; every other texture ignores that argument, so nothing else renders differently.
Verified in the real editor: 2- and 3-row girders, DK stairs, a brick Background showing through.

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

**The "Farm" prop folder (2026-10-03, `assets/farm-pack.json`) is the backdrop for the Super Bob fight.**
It is a 1960s Kansas farm (Super Bob is a Superman parody, so it is the Kent-farm look). Sixteen props:
- Grain Silo `frmsilo` 40, Farm Windmill `frmwmil` 30, Farmhouse `frmhous` 40.
- 1960s Tractor `frmtrac` 12, 1960s Pickup `frmpkup` 16.
- Hay Bale `frmbale` 4 (**solidDefault**: Super Bob stands on it, 2 cells up), Hay Stack `frmhays` 12.
- Farm Fence `frmfnce` 16, Corn Rows `frmcorn` 16.
- Scarecrow `frmscro` 7, Water Trough `frmtrgh` 8, Chicken Coop `frmcoop` 8, Milk Cans `frmmilk` 3.
- Mailbox `frmmail` 4 (text "OKAY", editable), Holstein Cow `frmcow1` 8, Chicken `frmchkn` 2.

What is load-bearing:
- **Exact ratios.** Every ground prop is drawn at a ratio that gives whole rows at its default size
  (2:1, 4:1, 3:2, 8:3, 5:4, 8:5, 1:1, or tall). Every ground-touching piece ends on y=250, so all 16
  footprints were verified to end on the floor row in the running app.
- **Tiling.** Fence and Corn tile when butted: the fence's end posts are HALF posts, so a joint makes
  one whole post, and no corn leaf crosses x 0 or 200.
- **His textures.** The coop walls and the silo's ladder chute use his barn's Red panelling texture
  (`brchpn5`), so they match his Red Barn. The scarecrow's shirt uses his Flannel texture (`a6htkkb`).
- **Animation.** The windmill turns (3 frames at 8 fps; 18 blades, so each frame steps 20°/3). The
  chicken pecks (frames stand, stand, stand, peck at 3 fps).
- **Vehicles.** Both use solid wheel wells. The pickup's door window is a cutter (walk-behind idiom).

The generator (scratchpad `farm.js`, not committed) builds every diagonal from 4-point polys (`line()`)
rather than rotated rects, because `worldArtBox` measures unrotated boxes.

**"THE WHEEL ISN'T ATTACHED" IS THE WHEEL-ARCH CUTTER, and the Canned Ham (`cnham60`, 2026-09-22) has
a solid well instead.** Blake asked for a trailer without "the floating on wheels effect a lot of the
existing cars and trailers have", and on seeing the first version clarified: "I meant the wheel wells
… it's as if you have a wheel not attached to the trailer." Trailer 1-5 and the three 1960s cars all
cut a see-through arch (until 2026-10-06, below: a cutter circle a few units bigger than the tyre), so a ring of sky or level
background shows all round the top of every wheel and the tyre reads as a loose disc beside the body.
The Canned Ham draws NO arch cutter: a flat dark `#33302e` half-disc well (circle clipped at the chassis
rail's bottom) goes over the body, and the `#2b2b2b` tyre sits in it, so the wheel tucks up into the
body with no gap. That is the vehicle wheel idiom he wants from now on — do not copy the cars' arch
cutter into anything new.

**2026-10-06: EVERY existing vehicle now has a solid well** ("get rid of the floating wheel well thing on
all trailors"). No vehicle prop in the library has a wheel-arch cutter any more; window cutters stay.
- **Trailer 5, Trailor 3, Beetle, Mustang, Station Wagon:** each arch cutter was replaced, at the same list
  index, by a dark `poly` = (the cutter's own shape) ∩ (the union of the pieces it used to cut), sampled
  per column. So the dark area is exactly the part of the old hole that lay INSIDE the body; outside the
  body nothing changed, and `propVisibleArtBox` is identical (cutters never counted), so no placement in
  any level moved or rescaled. His trailers use his own well colour (`#2b2b2b`, bright 1.2, which he
  picked on Trailer 6); the cars keep `#33302e`.
- **Trailers 1 and 2 were already his own idiom:** a `noCut` dark rect (`ij6gk1p`) behind the body that
  shows through the cutter holes. It stopped 3 units above the body's bottom edge, so a sky sliver showed
  under the wells. It now reaches y 154. Copy this idiom only when you keep the cutters for another reason.
- **Trailer 6 (`1jqfzdy`)** he had edited that morning trying to fix it himself: a dark rect added at the
  bottom of the stack (cut by the cutter, so only two stubs poked out under the body), and the cutter
  moved up, so a 50% grey line now crossed the hole. The fix turned HIS rect (same id and colour) into a
  clipped-circle well drawn just before the tyre, and removed the cutter. His tyre hung 80% below the body,
  which still read as "a wheel, then a trailer floating above it". So the tyre, hub and jack wheel moved up
  4 units and the jack post got 4 shorter. Its art box is now 4 units shorter at the bottom, with the same
  top, left and width. In his levels the body stays exactly where it was and the wheels end higher (M7 at
  size 20: the tyre went from half a cell into the gravel to sitting on it, checked in the running app).
- Verified in the running app on his M1/M4/M7 placements with the foreignObject capture. A Mustang window
  cutter rendering magenta was the control, proving the capture does show holes. Clone a `.lobj` with its
  inline styles only: inlining EVERY computed style blanked it, because the logical `inset-*` longhands come
  after `left` in the list and put it back to its level coordinates.

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

**The 1960s School Bus (`schbus6`, 2026-09-27, Trailor Park, size 30) is built from real numbers, not
eyeballed.** A 48-pupil conventional (the 1968 Dodge S500 is 48 pupils on a 197" wheelbase): ~9.4 m
long, ~2.8 m tall, so at Blake's ~3.2 cells/m it is drawn exactly **10:3** (x 0..200, y 110..170) —
size 20/30/40/50 give 6/9/12/15 whole rows, and the two flat-bottomed tyres are the only pieces on
y=170. Front axle at x=20, rear at 126.6 (the wheelbase), tyres Ø21.4 (~1 m). It shows the DRIVER'S
side, because a US bus facing left shows its left flank: no entry door (that is on the other side),
but the folded stop arm, which only ever sat on the driver's side. Period details: National School Bus
Chrome `#f7b500`, black rub rails and bumpers, split-sash aluminium windows (cutters over a slightly
larger frame, so a thin ring survives), a West Coast mirror, red roof flashers with visors (no amber —
that is 1970s), riveted panel seams, dished rear duals with a mud flap, solid wheel wells (the Canned
Ham idiom), "COUNTY SCHOOLS" and bus number 7 as editable text pieces.

**A flipped placement now keeps its lettering readable.** ⇄ Flip is a scaleX(-1) on the whole object,
so a flipped bus read "SLOOHCS YTNUOC". `renderObj` passes `o.flip` into `propArtInner`, which marks
TEXT pieces `_readFlip`, and `textInner` turns the glyphs back round inside their own box (the box
stays where the flip put it). It is part of the placement cache key. Proof, since the pane could not
screenshot: Range rects of the first and last letter — forwards with the fix, backwards with the inner
transform put back (the control).

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
`playerDefeated(p, msg)`**, never a bare `p.x = SPAWN.x`. **A real death (no life left) goes back to
the GATE YOU CAME IN BY (2026-09-26)**, not SPAWN (60,40, up in the sky of his levels):
`respawnAtEntry` re-places you with `placeSpawn` — the same code that places an arriving spawnReq —
using `respawnSpec`, which the spawnReq handler records on every arrival (Playtest's starting gate, a
room's door, the door you came back out of) and `seamHandoff` sets to `CONN_OPP` of the gate you
crossed (E2 → the neighbour's W2). Being flung above the top of the world uses it too. The pieces:

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

**🦸 FLY (`EFFECT_TYPES.fly`, 2026-10-02; controls, pose and hint redone 2026-10-03).** Blake: "add a
flying ability I can equip to clothes", then: "What happens if you have fly and glide? How do you
activate fly? I like to imagine if you press W in mid air it activates fly".
* **Controls (`flyKeys` → `flyState`).** A fresh PRESS of W in mid-air takes off. Then W held climbs
  at the item's **Lift** (blocks/second), S held comes down at the same rate, neither HOVERS
  (`vyTarget` 0, eased by `flyEaseVy`), and A/D steer at its **Air speed** (×, may exceed walking
  pace, so it skips `capAirborneSpeed` like a glide). Letting go of A/D drifts to a stop (`drag`,
  `FLY_DRAG`) instead of the glide's coast. It ends on landing, when the time runs out, or on a
  PRESS of Jump — Space lets go.
* **Raw W/S, never the arrows** (the 🚶 plane's rule): ↑ is aim, and aiming up in mid-air must not
  launch you. **A press, not a hold** (`p.wasFlyUp`): W is "walk up the road" on a plane and "climb"
  on a ladder, so W held into a hop or off the top of a ladder does not fly — re-press it. Next to a
  ladder, W in mid-air still grabs the ladder (the climb is decided first); once FLYING, nothing
  grabs you (`!p.flying` on `climbing`), or flying up past a ladder with W held would snatch you.
* **Fly + Glide** no longer share a key. W flies, Space glides: fly up, press Space to let go, keep
  it held and the glide carries you down (verified on Super Bob's Proto Cape). A ⤴️ Double Jump
  spends its jump on that same press. The first cut was "hold Jump in the air", so Fly won every
  time and the glide only appeared once the flight time ran out.
* **Flight time** refills on the ground, a 🚶 plane or a climb grip (`p.flyUsed`, frames). The
  slider's top stop `FLY_TIME_UNLIMITED` (30) means no limit and is the default. The param's `fmt`
  shows "∞" / "3s" / "×1.0" — `fmt` on an `EFFECT_TYPES` param is generic now.
* **The level's top edge is a ceiling for a flyer** unless a top gate with a level above is there.
  Without it a held flight hit `p.y < -200` and was "flung off the world" back to the entry gate.
* **NO designed animation — `noAnim: true`.** Blake: the 🎬 Design animation menu Fly shipped with "is
  un wanted. Just add in a logical flying animation". Every body flies in one built-in pose,
  `flyPose(h, v, t)`: HOVER (arms out for balance, legs treading, a ±2.5 px bob on the sprite only),
  CLIMB (fist straight up, legs together), COME DOWN (arms out ahead, legs apart), FLY ALONG (the body
  tips `FLY_TILT_DEG` 55° toward travel — 40° climbing, 70° diving — arms reaching ahead, legs in a
  flutter kick). `h`/`v` are eased per frame by `advanceFlyPose` from what the body ACTUALLY did
  (sideways px moved, not steered — flying into a wall stands you back up), so keys blend the poses.
  `flyPoseBlocks` = `flyLegBlocks` (the walk's addBackLeg pair) + `flyArmTarget` (`armRaiseAbs`, whose
  90/135/180 are `armAimAbs`/`armPushOffAbs`/`armClimbAbs`). The tip is the wrapper's `rotate`
  (`flyTiltDeg`, art-frame sign), zeroed while the arms are busy (`flyAim`: shot, aim, swing, throw,
  block) so a gun aimed level is level on screen. Old Fly items' designed frames are ignored — only
  the glide still loops an `effectAnim`.
* **The hint (`showFlyHint`, `FLY_HINT_TEXT`).** "when you pick up or start with a flying item it
  should say (In subtle font on screen) how to activate flight": one 12px, 72%-white line low in the
  view, 5 s, fired when the play effect (re)starts with Fly worn and `hadFly` was false — start of
  play, a pedestal pickup or a shop buy (both bump `equipGen`). A gate re-run says nothing.
* **Units fly too** (the unit loop, `eFlyUp`): a unit coming for a target more than 1.5 cells ABOVE
  its feet takes off and steers straight at it. **It measures the target's ACTUAL feet, not
  `standingLineY`** — that is null for anyone off their feet, and the first cut used it: a unit in
  Fly gear stood still under a player hanging in the air. Against a target standing on a ledge it
  climbs until level, then drops onto it. Against a target IN THE AIR (`flyTgtAir`) it stays up while
  that target is no more than a cell below and holds its height (`flyHoverVy`) — before 2026-10-03 it
  climbed, dropped a cell and a half and climbed again, a yo-yo that would have flicked between the
  flying pose and a fall. Measured in Forest M1: six Viatnamese looks held exactly the player's y for
  160 frames, and tipped ~54° chasing sideways. Units draw the same pose (legs at the walk stage, arms
  by `driveUnitArms` after the weapon base is read); a drawn creature keeps its paws and does not tip.
  The ranged stand-off rule is the climb route's (`following || !rangedEnemy || !targetOnLevel`). A
  flying unit bumping a roof is stopped (no rising through a storey) and grounded for 3 s
  (`ep.flyBlockT`) so the climb route can take it up the stairs. Placements whose 🎲 gear roll
  swapped the jacket lost the jacket's Fly, which is the gear system working.

**🦎 TAIL SWING (`EFFECT_TYPES.tailSwing`, 2026-10-05).** Blake: "an ability called tail swing (I will
put it on the crocodile pants) where turning around next to an enemy does damage to them and pushes
them backwards two cells. The range … inspired by how far out the Alligator pants extend." He adds it
to his Dino Tail Pants (`dinotl1`) himself; it was NOT put on that record.
* **The turn is the swing, and it hits the side you WERE facing.** In Side the tail points behind
  you; turning flips the sprite, so the tail ends up where you were looking. Face a croc, tap the
  other way, and it lands. The side you turn TOWARD is not hit. Player: only a turn made with the
  keys (`faceBeforeKeys` in the loop), never the stomp's turn-to-face or a door's arrival.
* **Geometry (`tailSwingTargets`).** From the wearer's middle out to Reach past the back of its body,
  over the lower 40% of its box plus half a cell under the feet (`TAIL_SWING_BAND_TOP` 0.6). Reach's
  default 1.5 cells is MEASURED: the Side tail tip sits 53–55 canvas units past the back of BoB and
  Bobbett, and a cell is 260/7 ≈ 37 units. A unit's reach grows with `enemyScale`; the push does not.
* **Damage** is `playerMeleeDamage(item damage, Strength)` with the Intelligence crit, then the
  target's armour — a melee weapon's rule, on both sides. **Cooldown** `TAIL_SWING_COOLDOWN_FRAMES`
  (0.5 s) starts only when a swing LANDS, so turning round in an empty street never eats the next turn.
* **The push (`knock = {left, dir}`, `knockbackStep`)** is fed into the body's own sideways move, so
  walls, kerbs and level edges treat it as a step; a wall that stops it ends it. 60 px takes ~12
  frames, fastest first. While shoved, a unit counts as `stunned` (no walk, turn or strike); on the
  player the shove replaces the walk for those frames. `placeSpawn` clears `p.knock`, so a killing
  blow does not shove you at the gate you respawn at.
* **Units, both halves at once (his rule).** Any turn a unit makes sweeps the same way (`ep.tailFace`
  is last frame's facing; the check runs after the attack commit). At the commit, a tail-wearer with an
  opposing body inside its reach IN FRONT turns its back instead of attacking (`eTailFront`): it sets
  `ep.tailFace` first, because a unit that only just swung round onto you would otherwise net no turn,
  then holds that back-turned pose with its feet planted for `TAIL_SWING_HOLD_FRAMES` (0.25 s, `ep.tailT`).
  It turns back during the hold's last `FACE_HOLD_FRAMES`, so it faces you again the frame its feet are
  free. Without the hold it showed its back for five frames and moonwalked toward you. Hits go through
  `applyHitTo`, so your i-frames, your guard and the revive window all apply.
* **Measured in play (dev server, seeded looks):**
  - Turning away from a 50 HP dummy half a cell off your front: 10 damage, and it slid 834 → 893.8 px,
    exactly 2 cells.
  - Turning to FACE it did nothing.
  - A second turn inside 0.5 s did nothing.
  - A shove toward the level edge stopped at the unit clamp (1734.6 of 1735).
  - A croc look (Str 5) walked in, turned its back for 14 frames, hit Viatnamese 3 (Def 3) for 8 and
    shoved him 60 px, then turned and came again.
* **A look dressed BEFORE the pants got the ability does not have it** — a look's effects are baked
  when it is saved (`liveEnemyAsset` re-composes only the picture). Re-open it in Dress Bob and save.
* **A MELEE UNIT WITH A TAIL ALTERNATES WEAPON AND TAIL (2026-10-07, `unitTailStepsIn`).** Blake, on
  his Crocobob (`gcfxvc3`, Seek, a rolled Meelee weapon): "do enemies use tail swing? I maybe saw it
  once but I feel they should use that ability more often when carrying meelee." It almost never
  fired, because of DISTANCE. The commit only turns its back on somebody already inside the tail's
  1.5 cells, but Seek stands off at 45–85% of the WEAPON's reach (`enemyMoveIntent`), which is further.
  Measured in the control: Crocobob with Bobs Bat held 84 px off DK and swung the bat 5 times, tail 0.
  - Now `ep.tailNext` alternates. While it is set, `engageRange` narrows to the tail's reach (the
    stomp's narrowing, the same way), so the unit walks in and the commit is the turn. The tail
    commit clears it; a weapon swing or a bare-handed hit sets it. Unset counts as set, so it OPENS
    with the tail.
  - Seek only (a Guard would stop swinging at you until you stepped right up), never a gunman, not
    while the tail cools down or the unit climbs.
  - Measured after: tail, bat, tail, bat, about one attack a second, every tail a 60 px shove.
* **A unit's stomp and tail are BODY blows: no weapon Stun, no Ignore Armor (2026-10-07).** They went
  through `applyHitTo`, which applied the held weapon's `stun` and `ignoreArmor` to every hit, so
  Crocobob's tail dazed you for Bobs Bat's 0.5 s. Your stomp and tail never carried your weapon's.
  `applyHitTo(…, bodyBlow)` now drops the weapon (`hitEw`) for those two calls.

**`.unitStatus` (a unit's HP bar, reload bar, 💫/😵, 💬) is UNDER the Front layer — z 5060,
since 2026-09-16.** It sat at 8000 from the start, on the theory that a unit's bars are information
you need even when it is behind a tree, and the result was an NPC inside a church, behind a painted
front wall, with its 💬 floating crisply on the outside of the building ("I don't like that I can
see the dialogue box … through a front layer"). 5060 is above the units (5000) and their corpses
(5050) and below Front objects (5101+) and Front paint (6000): whatever hides the unit hides its
badges, and the player's see-through window (frontFadeKeys/behindFade) reveals both together. The
player's own `.playerHpTrack` stays at 8000. If Blake ever asks for bars over trees again, that is
the object rung (5101) to slot between, not a return to 8000.

**The z only hides the part of a bar that paint happens to cover. A unit hidden behind Front loses
its whole status (`unitHiddenByFront`, 2026-10-04).** Blake: "You should hide enemy health bars that
are behind a front layer you can't see through." The bar floats a head's height above the body. In
Sewer M2 each Rat waits in a two-cell ceiling pocket hollow behind Front paint, and while the rat was
hidden its bar hung on the plain Foreground rock 1.5 cells above, marking the ambush.

The test samples 5 x 4 points over the unit's drawn box (hitbox width, `unitHitTop` to the feet), in
its own level's pixels:
* A point under a Front cell you cannot see through hides.
* A point inside painted Foreground counts neither way. It is the box's slack above a short animal;
  a body is never really inside rock.
* Any other point means the status stays.

You can see through three kinds of Front cell:
* the window you carry: `fadedFrontKeys` below `UNIT_FRONT_HIDE_OPACITY` 0.85, live level only;
* a ramp's half cell;
* a texture with `clear` (the girder).

The status is `visibility: hidden`, not unmounted, so nothing is rebuilt as a unit walks in and out
from behind a wall.

Verified in Sewer M2:
* The three rats still up in their pockets were hidden. The dropped rat, the player and the Turtle
  Men were shown.
* A rat held in its pocket was hidden with you at x 1900, 1600 and 1350, shown at 1250 and 1180 as
  your window faded the pocket's paint, and hidden again back at 1600.

**In a run, every point is asked of the level it is IN (`parts`, 2026-10-07).** Blake: "I can still
see the enemies HP bar when i'm far away but it goes away when I get close." Since 2026-09-26 the live
level ADOPTS every neighbour's units (`adoptRunNeighbours`). A unit across a gate is one of the live
set's own, at live-level pixels past the live grid's edge. The test looked those points up in the LIVE
level's Front, found nothing, and kept the bar. Every enemy behind Front in the next level along
showed its bar until you walked in and that level went live.
* The live unit set now carries `parts` (`runWorldParts` of the live level and its seams).
  `unitHiddenByFront(…, parts)` sends each point to `worldPartOfCell` and reads that level's
  Front/Foreground under that level's own key. A point off every level is open air.
* `seeThrough(k, cell, P)` gets the part, and the window counts only when `P.side` is null. Your
  window fades the live level's Front alone, so a neighbour's wall is never see-through.
* Measured on a two-level test run (A Intro, B Exit, a 10 x 9 Front wall in each, Turtles behind
  them and one in the open). From A at the gate, B's walled Turtle was `visible` before the fix and
  is `hidden` now. From B, A's walled Turtle is hidden too (that needs a ~3,400 px wide view to have
  both on screen, which is his). Everything else was unchanged: own-level walls hidden, the window
  revealing a Turtle you stand next to, open ground visible.
* A FOREIGN Front check is the trap here. Any future test of a unit against the scenery has to go
  through the parts, because the unit's own key and pixels are the live level's, not its own.

Front OBJECTS (props) still only hide whatever they overlap, by z.

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

**🧽 ERASE TAKES WHAT IS ON TOP, NOT JUST THE LIT TAB (`eraseTargetLayer`, 2026-09-28).** Blake:
"On Trailor Park M12 I cannot erase all of these blocks. I believe they are invisible walls." They
were: M12 is a copy of M3, and its Football Field prop had been deleted from the copy, leaving the
field's collision-only Foreground floor behind (row 35/36, cols 32–131). The Background tab was
lit, and paint-layer erase only ever touched the lit tab. So every stroke deleted the sky UNDER
the walls instead, 114 `#386aff` cells, which are the dark squares in the screenshot, and never
touched the walls. Props, ladders, markers and enemies already erased by click whatever the tab; painted cells
were the odd one out. Now the press picks the topmost paint at that cell (Front > Foreground >
Background), **never below the lit tab** (a Foreground stroke that starts on sky must keep erasing
Foreground, not turn into a stroke through the sky). It skips 👁-hidden layers and keeps that layer
for the whole drag (`lpaint.current.eraseFrom`). A toast names the layer only when it differs from
the tab. Verified in the pane on the real M12, A/B against the stashed old code on the same cells:
with the old code a Background-tab stroke over walls 35,80–82 erased nothing; with the new code it
erased exactly those three and left the sky. The 114 sky cells were restored into M12 via
library.json in the same commit. **Remember when reading editor screenshots: an EMPTY cell is the
dark grid (`#0e1018`), and Background is drawn at 42% opacity, so a hole in the sky looks like a
black block.**

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

**...THEN ×4 (2026-09-26): 40% consumables, 16% gear.** "Can you multiply the drop rate of
everything by 4?" Both gates, same ratio, pinned in the test. A worn 🍀 Lucky Find charm is NOT
scaled — its chance is a number he set on the item, and it already rolls before these gates.

**🎁 PICKING THINGS UP (2026-09-26): the callout, the banner, and abilities described.** Asked in
one message: the item name flashed "bold, semi retro, dopamine inducing" on pickup; abilities
described, "not just stat changes"; each change on its own line in a better font; "Press E to
swap" cut down to "E" and one swap symbol. Then, mid-build: "make sure the font isn't too large
and stack where you can as I don't want it too wide." What shipped:
* **`pickupChangeRows(item, ctx)`** (pure, tested) is the ONE description of a take — stat rows
  `{label, from, to}`, ability rows `{icon, label, desc, lost}`, or a consumable's text line.
  The callout and the banner both render it through `pickupRowsView`, so they cannot disagree.
* **Every ability has a `brief`** — `EFFECT_TYPES[k].brief(params)` and
  `WEAPON_ABILITIES[k].brief(weapon)` — a short line with the item's own numbers ("8 extra lives ·
  get back up where you fall", "shots explode · 2.5-cell blast"). The `blurb` is the editor's
  paragraph and far too long for the level. A test fails if a new ability ships without one.
  Weapon abilities are filtered to the ones its TYPE honours: his Grenade still carries a stale
  `explode: true` a throw never reads, and printing it would promise an explosion.
* **The callout floats over the PLAYER's head** (`takeCallout`, drawn with the player, z SCENE_LABEL_Z.label,
  anchored above the HP/reload bars), not on the pedestal — stacked, it grew straight up across
  the body standing in front of the item. The item's NAME stays on the item. Because the camera
  centres a 7-cell body, a tall stack near the top of a level ran off the view, so the top is
  estimated from the row count and clamped to the camera's top edge. `.pedcallout` needs
  `width:max-content`: it hangs off a zero-width anchor and would otherwise shrink to min-content.
* **Narrow on purpose:** 12px Chakra Petch, an ability's description stacked UNDER its name and
  wrapping at 150px. Stat numbers are a 4-column grid so they line up. Every class is `pk`-prefixed
  — a bare `.up` is the app's rounded button style and boxed every stat that went up.
* **The banner** (`showPickup`, `.pickupBanner`) is the name in Shrikhand (Bungee until 2026-09-27 — he found it generic; rank gradient, dark outline,
  3-D drop, a shine sweep, a pop-in, a burst) over the top-centre of the VIEW — a sibling of
  `.lgrid` inside `.lscroll.playing` (made `position:relative`), because `.lgrid` moves with the
  camera. 20-32px by name length. It REPLACED the blue toast for pedestal and drop pickups (same
  news twice = clutter); the shop still toasts, as its panel covers the level. `consumeItemNow(item,
  suffix, quiet)` returns "+5 HP" for it. `PICKUP_BANNER_MS` must match the `pbLife` keyframes.
* **Fonts** come from Google Fonts via one `<link>` (`loadGameFonts`, on studio mount) and are
  preloaded with sample text "A" — `document.fonts.load` fetches only the unicode-range subset
  covering the text it is given. Offline they fall back to Arial Black / Segoe UI.
* **Fixed on the way:** a throwable's callout compared it to your GUN and promised a swap and a
  damage change; it now compares to the throwable you carry, which is what E actually swaps.
* **The sheet is a template literal** — a backtick in a CSS comment ends it and the build fails
  with "Missing semicolon" at a CSS line.
Verified in the production build against his real items on a test level with five pedestals
(Cat Head, Grenade Launcher, First Aid Kit, a cape, a grenade) plus a drop injected into
`enemyDrops`: callout text, widths (≤150px), fonts actually loaded, banner position, no toast.

**A DRESSED LOOK'S OWN CLOTHES COME OFF IN THE NUMBERS TOO (2026-10-06, `mergeEquip`).** Blake: "when
picking up a piece of loot and replacing an existing piece it doesn't always show the stats that are
going down, after you … switch back and forth it shows all stats". Every character he plays (Bobby,
Billy, Super Bob, Army Bob …) is a dressed look, and `assembleLook` bakes its own garments' boosts,
armour and abilities into the look's `stats`/`defense`/`effects`. `mergeEquip` only ever ADDED
pickups, so a garment the look was dressed in never came off. `wornEquipMap` had already picked the
right garment to put on the plinth, but the numbers never subtracted it. Measured in his M5 as Bobby
with his Army Jacket dropped at the feet: the callout had no HP row (Leather Jacket's +2 HP stayed),
promised Def 14→19 (both jackets' 5), and taking the Leather Jacket back read HP 8→10 (counted
twice). He also really played on those numbers. Now any slot the pickup map has TOUCHED (an item, or
null for emptied) first subtracts the look's own garment: its stat boosts and defense, plus its
abilities by the `slot` that assembleLook packs them under (legacy looks with no slot lose them by
type, one per ability). The same drive now reads HP 8→6 / Agility 0→−1 / Str 7→9, and the way back
reads exactly 6→8 / −1→0 / 9→7. With nothing picked up, `mergeEquip` still returns `base` itself.
This one change also fixes the shop's clothing swap and the live stats.

**⭐ ITEM RANK (2026-09-27): Poor / Common / Rare / Legendary.** A `rank` field on the three
category-carrying types, set by four coloured buttons at the top of the item's side panel. It is
LOOK ONLY — drops, prices and pedestal searches ignore it. `itemRank(a)` reads it; anything
missing or garbled is Common (and `newAsset` starts there). His colours: Legendary PURPLE (it
replaced the banner's gold), Rare blue, Common green, Poor white — `ITEM_RANK_INFO`, which the
stylesheet interpolates, so change a colour there. "Each font slightly smaller or with slightly
less effects than the upgrade": `bannerScale` 1 / .92 / .85 / .78, and `.pbRank-*` takes one
effect off per step (Legendary: breathing glow + shine + burst; Rare: no breathing, smaller burst;
Common: no burst, no shine, softer pop; Poor: no glow). The same colour goes on `.pedestalCap`,
`.enemyDropCap` and `.shopName` via `rk-<rank>` (Legendary alone adds a purple glow). An x-rayed
pedestal's name still turns pale blue — that rule is more specific on purpose.
**All 75 of his items were ranked by guess** from his own tags (Rare/Common/Weak/T2), value and
abilities: Legendary = Cat Head, Cyclops Visor, Gorilla Mask, DK Arms, RPG, Grenade Launcher.
Delivered through library.json with `savedAt = max(now, newest + 1)` where "newest" was the
newest copy across the repo, his save folder AND the StackBlitz store he was working in at that
moment — four of the items (Bobs Bra, Flash Shirt, Suit Jacket, Grenade Launcher) had been edited
there that morning, and ranking the folder copies would have stamped over those edits. New work
found in that store (the Super Bob Logo prop, Furr Con Sign, Grenade Shell) went into the file
byte-for-byte; levels were left to the keeper's own three-way sweep.

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
  block runs exactly as before. A corpse rests on the plane the same way. (Until 2026-09-28 enemies
  did not WALK up or down the road — see the next bullet.) Verified in the running app against a
  control build with the hold gated off: a Chasing Pit Bull seeking across a 14-cell column painted
  down from the kerb fell 300 px to the level floor and stayed there; with the hold on it crossed
  twice at y 348 to the pixel.
* **Enemies WALK the plane to get at you (2026-09-28).** Blake: "enemies set to seek need to be able
  to seek you on top down climbing surfaces", about a 🎲 Trailor / Seek / Meelee placement in his
  Trailor Int7 (a whole room painted as a plane). Two separate things were wrong:
  - **It never moved at all** — not even toward him standing on its own line. Its seven-cell box,
    placed one cell in from the room's slanted side wall, started overlapping the solid wall blocks
    up the screen, and a unit's sideways step was tested against EVERY wall at the new spot,
    including the ones it was already inside — so both directions were "blocked" forever (measured
    on the old code: 41 frames, x 144 → 144). Units now use the player's own rule (`preWallKeys`):
    only a wall the step walks INTO stops it (`eInside` in the enemy loop). A wall ahead still stops
    it exactly as before; this is what also frees any unit a spawn or a seam hand-off left embedded.
  - **It could only move sideways.** On the plane a unit coming for someone — Seek that has noticed
    its target, every friendly (they are all Seek), a tackler's charge — now walks up/down toward the
    line that target STANDS on (`standingLineY`: the feet, the line a hop left, or null in the air so
    nothing chases the top of a jump), one `topdownStepToward` per frame at its walk speed: the whole
    step when the feet stay on the plane, else inch to the painted edge — the player's W/S rule,
    including "down stops at new solids, up ignores them". Guard and Avoid never walk the plane,
    Speed 0 still never walks, a stomp still plants the feet, and the legs cycle for the vertical
    step too. Measured in his Int7: Blue Football (Speed 7, bat) walked out of the wall (x 180 → 345
    on his line), followed him up to the back line (feet 540 → 376, his exactly) and landed 4 hits.
  Harness traps in a room: W on the door marker USES the door (the player snaps back to the spawn
  line), so walk off it first; Footbob is a tackler and floors you (clear `p.down`/`p.stun` in the
  sampler); a 🎲 tag rolls Billy/Bobby (Speed 0) 2 times in 9 — re-roll with ■ Stop / ▶ Playtest.
* **A weapon has no Front, so the Front pose holds its BACK art (2026-09-28, `weaponArtPose`).** The
  weapon editor offers Back / Side / Aim up / Crouch (`editablePoses`), and walking DOWN a plane is
  the player's Front pose — so the M16, bow, bat and RPG vanished from his hand facing the camera
  (Blake: "my own weapon visually disappears sometimes like if i am walking down and shooting
  diagonally"; measured: the M16 drawn side-on and walking up, not one piece of it facing front; "sometimes" = the older
  weapons still carry a hidden Front drawing from before the tab went, and showed that). Front and
  Back are the same weapon in the same hanging hand ("both of those are similar if you track the
  arms which is all that changes"), so Front bakes the Back art at the guide's Back grip and turns it
  by the Front arm's difference from the Back arm (`armBaseFrom`, pivot-aware) — at every play site
  that asks where the weapon is: the render, the throwable in hand, the muzzle spawn and the melee
  hit box. That last one was a silent bug of its own: a bat swung facing the camera baked no art,
  had no hit box and hit nothing (control: two swings at a unit a step away, no hit; now "Hit Roberta
  for 7"). A weapon with no 🔴 muzzle in its Back art fires from the far end of that art since
  2026-10-06 (`heldShotPoint`, below); it used to be the chest (his M16's only muzzles are
  Side/Crouch/Up).

Verified in the running app on a seeded 60x30 level (a street at row 24, a 10x8 intersection over it
and a 6-wide road running up to row 8): sideways across the crossing at y 510 the whole way with the
side signature unchanged, W up to the pinned y 15 (= row 8's top edge - half a cell - 210), S down in
the front pose with no crouch, the hop rising 87px and landing on y 454.8 exactly, and a sideways
walk-off falling 51 frames to the street.

**UNITS USE THE CLIMB LAYER TO REACH WHOEVER THEY ARE COMING FOR (2026-10-02).** Blake: "have NPCs
and enemies that are following the player try to utilize climbing surfaces including top down".
`unitClimbRoute(lv, me, tgt, jumpPx, CW, CH, floorAt)` picks ONE waypoint from `climbRunsOf(lv)`
(ladder columns, bars/cliff rows, 🚶 plane components; cached per `lv.climb` object): a ladder to
climb up/down, a bar/ledge to jump to and hang from, a plane edge to walk onto, or the plane edge
nearest a target that is off the plane. `floorAt` rejects routes whose walk has no ground under it
(the first drive walked off a ledge toward a road painted at ledge height). The enemy loop asks it
for an ally tagging along, Seek that has detected its target, or a charge, when the target STANDS
more than 1.5 cells above/below (or on a plane the unit is not on); a ranged unit already able to
shoot from its level keeps its stand-off. No route → the old walk, so "don't follow walking under"
still holds. Physics is the player's: `ep.climbing` ("ladder"/"bars"/"cliff"), CLIMB_SPEED, pinned
at the ladder top, `ep.climbJump` off the top or off a hang toward the target, `ep.navDropCd` after
letting go, `ep.navHangJump` for the jump up at a bar. Gravity is skipped while climbing; climbing
units cannot attack or dodge; they draw their Back pose (Side on bars) with the weapon's Back art.
Climb tests measure the VISIBLE body box (hitbox offset into the render box); plane tests use the
feet box `ep.x + epw/2`, as `topdownAt` does — mixing them dropped the plane route mid-walk.
Verified on a seeded test level (street, ladder to a ledge, bars to a second ledge, a road up the
screen): Seek and ally both walked to the ladder, climbed 100 frames, stepped off at the top; came
back down by dropping into the ladder; walked under the bars, jumped, hung, shimmied, jumped onto
the far ledge; walked onto the road and up it to the player, and back down off it.

**A HOLE IN THE FLOOR IS A WAY DOWN (2026-10-04, route kind `"drop"`).** Blake's Sewer M2 hides
Rats in two-cell pockets in the tunnel ceiling (hollow behind 🎭 Front paint) to drop on you, and
they never came. They sensed him (they turned to face him) but stood on the lip of their pockets.
There were two causes.
1. **There was no drop route.** Seek walks only to a target on its own level, and the routes offered
   ladders and bars but never "step into that hole". `unitDropSpot` (called from `unitClimbRoute`
   when the target is below) returns the nearest gap in the unit's floor that meets three conditions:
   * The physics box fits through it. It is measured with `me.fx` = `ep.x + epw/2`, the box the
     landing test uses, not the visible centre; the loop walks that box's centre to it, as for planes.
   * The box is fully over it within `UNIT_DROP_REACH_CELLS` (3) of where it stands. This keeps his
     2026-09-28 rule: a slab unit on a two-storey level still does not trek to a far edge to trail you.
   * The fall lands no lower than 1.5 cells under the target.
2. **Walls were checked with the full seven-cell box.** A Rat's box is 168 px tall round 48 px of art,
   so in a two-cell pocket the empty top of the box sat inside the rock above. Its first sideways step
   into a new column of that rock read as a wall, and it moved 7 px and stopped. A creature
   (`isCreatureUnit`, not crouched) now meets walls from `unitHitTop` down to its feet. Dressed looks
   keep the whole box.

**The hole has to be wider than the body.** A Rat is 124 px (4.1 cells) wide with its tail, and his
holes were 3–4 cells, so it would sit on both lips whatever the AI did. The unit also has to start ON
a lip: a hole that already contains the whole box drops it the moment the level loads.

A/B in his real level (a `window.__noDrop` switch, since removed), with one hole widened to 5 cells:
- With the route off, every rat stayed put.
- With it on, that rat walked 14 px, fell from feet 270 to 570 in 0.8 s and came for him.
- The rats over the unwidened holes stayed up.

**They wait until you are close.** The first cut dropped on detection. Seek sees six body lengths
(42 cells) ahead, so all four rats fell the instant he entered the tunnel 36 cells away, which made a
rain of rats rather than an ambush. `UNIT_DROP_TRIGGER_CELLS` (8) now holds each unit until the
target is that close to its gap, sideways.

**West edges were blind until 2026-10-22.** The scan counted a gap only at its FIRST (west-most)
column. Off the west end of a deck or perch the open air runs back across the level, so that column
was never in the scan window and the lip right beside the unit was skipped; off the east end the gap
starts beside it and always worked. Found on Tree Tops 3, where a Squirrel stood on the west lip of
its lookout with Blake below. A gap that runs on past the window's west end now counts at that end,
measured from its real first column. A/B on two static builds serving the same test level (a
14-cell deck, Squirrel on its west lip, player 7 cells west and below): the old build never dropped;
the fixed one waited while he was out of trigger range, then stepped off and came for him.

**His holes were widened for him (he asked: "You can edit my level").** The edit removed Foreground
at 9,10, 9,22, 9,27, 9,31 and 9,41, and at 8,27 (rat 3's pocket wall). It added his hole Front
paint (#29331f / tex 422iwrd) over the opened row-9 cells, so the ceiling still reads solid from below.
It was built on his live StackBlitz copy (savedAt 1791108716989, which matched his folder cell for
cell), with only those 11 cell keys changed.

Driven in the delivered level, walking the player along the tunnel: the rats left the ceiling at
player x 13 / 377 / 647 / 941, each about 6 cells short of its hole, one after another, and all landed
on the tunnel floor and chased him. The first rat drops at once because you enter right under it.

**A RAMP ACROSS OPEN AIR IS NOT YOUR HILL (2026-10-04, Sewer M3).** Blake: "when you drop down there
you clip through the foreground and fall under the level." His sewers have grass ramps along row 7
and nothing else, and `isHillFormationCell` scanned the two neighbouring columns each side all the
way to the top of the level. So every ramp up there made the solid cells below it "hill flesh":
3,700 of Sewer M3's 4,987 solid cells. Hill cells near the feet are not walls and, unless the body's
centre is over them, not floors. Walking off the street into his 4-wide waterfall hole carried
Super Bob sideways into the street, and he fell through all the rock to the world floor (y 360 →
1170). Now every column, the neighbours too, stops at the first empty cell above the hit row. Over all 29 of his levels only
cells whose ramp was 9+ rows up across air changed (four sewers, Trailor Park M8/M9) plus buried
Forest M1 ground. Sewer M2's rats still drop and chase.

**The second half was hidden by the first: a walk-off is no longer caught on the far lip.** The step
assist runs in mid-air (it saves a jump that lands a few px short). At walking speed you fall only
~30 px while crossing 115 px, so every hole up to 6 cells wide caught you on its far lip and you
walked over it. `p.offLedge` (`nextOffLedge`) marks an airtime that began by stepping off with
nothing sending you up; `shouldStepAssist` skips it. A jump, double jump, glide or flight still gets
the catch. In his library only Sewer M3's holes were 3-5 wide; the street-to-sewer manholes are 6.
Verified in the real loop: the same mid-air arrival is caught after a jump and falls in after a walk-off.

**His edit, same delivery:** the underground room dropped two rows, columns 4-155, all layers. Rows
28-29 copy row 27 (walls, waterfalls, back wall), row 30 is the pool (was 28), and row 31 is the floor
(was 29). The room is now 8 rows, so a 7-cell body walks in standing. Sewer M3 had never been in
library.json; it was inserted from his folder copy (savedAt 1791119042050) as 1791120038403.

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
  share ONE rule so a new label cannot quietly drift back to having a box. What a speaker SAYS is
  in that rule too since 2026-10-06 (`.talkWho`, `.talkText`): it was the one exception, a white
  speech bubble, until Blake asked for the bubble to go. `.pedestalEmpty` keeps its red after the
  shared rule, because "no match" is a mis-tagged-filter warning rather than a caption.
* **...AND THEY ALL SIT IN FRONT OF THE PLAYER (`.pedLabels`, z SCENE_LABEL_Z.label).** A pedestal draws BELOW the
  player on purpose — you walk in front of the item on its stand — but a z-index on a positioned
  element makes a stacking context, so its labels were trapped down there with it and the player's
  head covered the name of the very thing they were standing on to read. The labels are emitted as
  a SIBLING layer over the same box instead, exactly the trick `.unitStatus` already plays for an
  enemy's HP bar (stuck behind scenery for the same reason). Both are direct children of `.lgrid`,
  which is the one stacking context, so the label rung vs the player's 5000 is a real comparison. **A new
  in-level label goes in that layer, not inside the thing it labels.**
* **...BUT BEHIND THE FRONT LAYER (2026-09-27, `SCENE_LABEL_Z`).** They used to be at 7000–9600,
  over Front paint (6000), and Blake reported "item text and dialogue emojis going through front
  layer": M3's pedestal named its item through the trailer wall, and in M6 the Chaplin was hidden
  behind the church wall while "E Talk to The Chaplin" hung on its face. Drops (5063), pedestal
  labels and the take callout (5070) and the talk prompt (5080) now sit over units, corpses and HP
  bars but under Front props (5101+) and Front paint — the rung the 💬 over an NPC (UNIT_STATUS_Z)
  already used. The door prompt (9500) and the conversation bubble (9600) stay on top on purpose:
  a door is usually IN the Front wall, and once you are talking the bubble is the screen. A test
  reads the stylesheet back and fails on a bare number. The Level Creator's markers (💬 👹 🎲 💎)
  still draw over Front paint: they are editing handles, and 👁 Front hides the paint.
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

**☑ ONE TIME ONLY is a box on the TREE, in the 💬 Dialogue editor header beside the name**
(2026-09-28, Blake: "sometimes dialogue is meant to be one time use. Others it is not" — and "the
checkmark should be in the dialogue editor"). The record carries `once: true` ONLY when it is on;
`migrateDialogue` passes it through, and unticking DELETES the field rather than writing false. That
keeps every older tree byte-for-byte what it was, so the keeper sees no edit on a tree nobody
touched. (`migrateDialogue` still drops `savedAt`, as it always has; a fresh save re-stamps it.)
* **Spent per SPEAKER, when the talk CLOSES** (`closeTalk`). Every way out goes through that line:
  the last option, Esc, or Stop. The same tree on a sign and on Bobert is two separate one-time
  talks. An NPC keeps the fact on its `ep` (`ep.talkSpent`), because units are RE-KEYED at run
  gates (`moveRunUnit`) and a key-based set would forget them. A sign never moves, so it lives in
  `talkSpentSigns`, keyed `"<lv.runKey || lv.id>|<cell>"`. Only ▶ Playtest clears either one.
* A spent speaker is SKIPPED by the prompt, not matched and then refused. `signOverlapping` takes a
  `skip(cellKey)`, so standing on a spent sign offers the person beside it (checked in play: the
  sign's talk ended and "E Talk to Bobert" came up).
* **The prompt used to stay hidden after ANY talk until you walked off and back.** `openTalk` hides
  it, and `lastTalkSig` saw "same person" and never re-showed it. That would have made the new box
  look like it did nothing, so the paused-world return now clears `lastTalkSig` while a talk is
  open. A re-enterable NPC re-offers "E Talk" the frame the talk ends; a spent one does not.
* A spent NPC that is still talk-immune no longer says "press E to talk" (in `talkPhaseNote` and the
  hover title).

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
* **An NPC with something to say STANDS IN ITS FRONT POSE, and KEEPS standing in it after the talk
  unless the talk ended in a fight** (2026-09-28, Blake: "if the dialogue does not end in combat the
  NPC should stay facing front"). It used to turn side-on the moment `ep.talked` was set. Now
  `eFrontPose` holds for any talked unit that is still NEUTRAL. Turned hostile goes to Side, since
  that is the fight. Joined you also goes to Side: an ally walks, and a Front drawing cannot. The 💬
  badge (`eTalkWaiting`) still goes away once you have talked. Measured on Bobert: 80 pieces (Front)
  before and after a peaceful talk, and 47 (Side) once turned hostile. It is not mirrored while
  front-on (a flip on front-facing art just swaps the character's left and right).
  Art with no Front drawn — every animal — falls back through `enemyPoseKey` to Side and uses the
  turn-to-look rule instead (`TALK_NOTICE_CELLS`), which is the only reason that rule still exists.
  It feeds `wantFace`, **never `ep.face`** — a third direct writer in that loop is the sprite-strobe
  bug `holdFacing` exists to prevent. Both the Front and Attack poses go through
  `alignPoseFootBaseline` against Side, or the body floats by whatever empty canvas its own drawing
  leaves under it.
* **...and it HOLDS ITS WEAPON BY THE WEAPON'S BACK ART (2026-09-28, `eHeldView`).** No weapon
  has Front art (`weaponArtPose`), and a talker used to be handed the Side drawing. For the DK Arms,
  whose Side drawing is one forearm, that meant DK in Trailor Park M12 stood there with one DK fist
  and one bare arm. Blake: "the front facing dialogue position should use a weapons rear pose".
  It now follows the player's walking-down rule:
  - the Back art, gripped at the guide's Back hand;
  - turned by the Front arm's difference from the Back arm (`armBaseFrom`);
  - its mirrored twin, the second forearm, rides the body's other arm (`attachWeaponBlocksToArms`).
  A grenade in hand follows the same rule. A ✋ hold point keeps the Side path, since it only exists
  on Side and Crouch. Measured in the running app on his M12: the old code had 8 forearm pieces all
  on one side of DK; the fix has 6 on each side, mirror images, with the barrel in his hand.

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

**THE 2026-10-06 REVAMP: no bubble, answers in a grid, a retro face, nothing scrolls.** Blake, after
the Bridge Troll on Trailor Park M5 (nine answers, "1" to "9"): "a kind of ugly scroll down system
… I don't think we need the white bubble around the text, You should have a lot of options appear
in both rows and lines, i'd like a somewhat retro font / styling … but not to much that it's hard to
read". What shipped:
* **No white bubble.** The line is bare words in the shared bare-words outline rule, centred, under
  a gold name tag. The tail is now a small gold arrowhead (`.talkTail`) at `tailX`.
* **Answers are a grid** (`dialogueOptionGrid`, pure and tested). Up to three go side by side; four
  make a 2×2; five to nine go three across. When every answer is ≤ 10 characters the tiles size to
  their words (`compact`, a keypad), so the troll's 1–9 is a 3×3. Long answers widen the panel up to
  `TALK_PANEL_MAX_W` (660), which `talkBubbleBox` takes as its 5th argument and still clamps to the
  level and the view. Tiles are dark with a hard 2px edge and square corners, and the number key is
  a gold chip.
* **Nothing scrolls.** A panel taller than the room beside the head now SLIDES toward the middle of
  the view, over the speaker if it must, rather than being capped with the answers scrolling. `maxH`
  only caps a panel taller than the whole view (the last resort, thin gold scrollbar).
* **Font: DotGothic16** for everything in the panel (`GAME_FONTS_HREF`). Six pixel faces were set
  side by side at his real size. Pixelify Sans lost twice: as body text its capital G sits close to
  a B, and even as the name tag "BRIDGE" read "BRIDBE" and the 5 key read as an S. DotGothic16 ships
  as ~120 Japanese unicode slices, so `document.fonts.check("19px DotGothic16")` says false (the
  space glyph sits in an unloaded slice). Check with `"A"`, which reads true once Latin has loaded.
* **Measuring trap:** the panel measures itself with `getBoundingClientRect`, and the play loop does
  not re-render while a talk is open. Scaling `#root` for a screenshot and then changing the talk
  measures it 2× too tall, so it "slides" for no reason. Set the transform AFTER the last talk change.

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

**OVERLAPPING CUTTERS CUT THEIR UNION (2026-09-28).** Since 2026-09-20 a hole is an evenodd
`clip-path` polygon on each cut piece (it was a mask, which cost more than the rest of a frame).
Evenodd fills by PARITY, so where two cutters overlapped the art came BACK. Blake's Super Shirt shows
it: on Bobbett's side pose he trimmed the shield's point off the chest with five overlapping cutters,
and Dress Bob drew a striped half of the point anyway ("The cutter tool is not cutting part"). Bob's
side pose has one cutter and was fine. The same bug hit three of his older assets, which he built
while the mask still did a plain union:
- the Pit-Porion (15 cutters): its ruff drew as a white ring across its face;
- Trailers 1 and 2: the wheel wells, three cutters each, drew grey crescents across the tyres.

`cutterHoleClips` now returns an ARRAY of clips. It layers the holes so no two in a layer overlap
(bounds test, greedy), and `cutBox` stacks one nested full-size box per layer. With several layers,
position and turn stay on the outer box, the effects move to the innermost one, and every clip sits
between them, so glow and outline rings are cut the same way under every hole. One layer is still one
clip on the piece's own box.

The clip's outer edge is also PADDED past the box now (`CUTTER_CLIP_PAD_PCT`), so an outline ring or
glow outside the box survives except under a hole. Before this:
- Trailers 5 and 6 drew their top and bottom outline half as thick as the sloped ends;
- a fully cut piece left a hairline along its box edge (a white seam down the Dress Shirt's crouch
  collar).

Verified in the running app on his real library. Old code: 956 of 4,326 px under his five cutters were
painted, reproducing his screenshot. New code: 0 painted, and the part of the shield he kept was
unchanged (2,493 → 2,489 px). An old/new PNG diff of 13 captures (Dress Bob, props in M2/M4/M12, the
idle M4 Pit-Porions) showed nothing changed except these fixes.

Recipe:
- Rasterize the DOM with the foreignObject trick.
- POST the canvas `toDataURL` to a 10-line node sink on another port (CORS `*`) so PNGs land on disk
  without passing through tool output.
- To draw far units idle and uncalled, set `resize_window` to 5200 wide so nothing is view-culled.
- Keep the viewport the SAME for both runs, or every hash differs.

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
chain of levels` (module level, after `canAttach`), plus a few marked `// RUN —` / `// CAMERA —`
spots in the play loop and the level render. In plain words:

* **Starting one (buttons moved 2026-09-26).** The header's play button is split: **▶ Playtest | 🏁
  Play run** (`.splitPlay`); 🏁 always rolls a fresh seed. The seed box moved out of the toolbar into
  **🎲 Generate**, which is now a preview of the very run 🏁 would play — `rollGenerate` calls the
  same `buildRun(runPool(), seed)` as `startRun`, thumbnails each level as ONE canvas
  (`LevelThumb`), and has 🎲 Re-roll / a seed box (typing a seed re-previews it) / 🏁 Play this run.
  The old `generateChain` (East→West only, rooms and the unsaved level in its pool, no Intro/Exit)
  and its div-per-cell thumbnails (~75,000 divs for 8 of his levels, rebuilt on every editor hover —
  the dialog froze the page) are gone. `buildRun`
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
  **Top/bottom seams (2026-09-30, his first sewer):** up and down, ANY one open matching gate pair
  joins (`seamGatePair`), so they may be STAGGERED — Bottom Right over Top Left puts the sewer 40% of
  a level to the right. `runSeams` gives each seam `gates` (our gate → the neighbour gate that lands on
  it); only those lead through (`seamGateLeaving`), the staggered level's other gate is a wall. And a
  BLANK gate now welcomes a neighbour that names its floor (`connMatch`): his Sewer M1's blank Top Left
  meant "Sewer only" and turned down both Trailor bottom gates. Side seams keep the strict rule.
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
  into the strip (drawn static in the render body, props through `renderObj`). Fires and doors of a
  neighbour appear when it goes live. **Its ENEMIES are drawn from 2026-09-26** ("they just jump in
  out of the blue"): the play render's unit loop walks `playUnitSets` — the live level plus one set per
  seam (`{ lv, pos, hp, stripped, gear, off, ns }` off the neighbour's `roomState` bucket) — through
  the one sprite code, standing at their spawn cell or where you left them. Only the live level
  simulates (SUPERSEDED the same evening — see ONE WORLD below: the neighbours' units are adopted
  into the live level and simulated, so these neighbour sets are empty in a run). `prepRunNeighbours` (after `resolveRunSides`, in `togglePlaytest` and `seamHandoff`)
  makes each neighbour's bucket and its 🎲 gear-tag rolls up front, so they are drawn in the gear
  they fight in and the loop effect adopts the bucket untouched. Memoized on the live level, so per frame it costs
  nothing; per level it is ~300–400 extra cells on his levels (measured 371 + 299 on M1). It is NOT
  the ten-levels-in-one-DOM build he first described — tile count is what has cost frames twice.
* **The camera.** `cameraTarget` (pure): centre the body, clamp to the level, but let the view run past
  an edge by the strip's width where a neighbour is drawn (SUPERSEDED 2026-09-27: the clamp is the
  union of the drawn levels — see THE CAMERA HUNG ON THE LEVEL YOU WERE LEAVING below). `updateCamera` eases toward it
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
  - **Followers come with you** (SUPERSEDED 2026-09-26 by ONE WORLD below — `carryAlliesAcrossSeam`
    is gone; followers now walk through the gate) (`carryAlliesAcrossSeam`, `ALLY_CARRY_RANGE_CELLS` = 24): every
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
  - **What is chasing you comes through the gate too** (SUPERSEDED 2026-09-26 — this was the
    teleport Blake called "teleporty"; see ONE WORLD below). `carryAlliesAcrossSeam` took an `opts`
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
* **ONE WORLD: the neighbours are alive, shots cross gates, nothing teleports (2026-09-26 evening).**
  Blake: "the level to level transition needs to be smoother. You should be able to shoot from one
  level to the next if an enemy is close. And enemies need to be less teleporty." What was actually
  wrong, measured in the pane before touching anything:
  - A neighbour's units were drawn but FROZEN — deaf, blind, and bulletproof, because a shot was
    deleted the moment it left the live level's rectangle (`pr.x > lv.cols * CW`).
  - At the handoff `carryAlliesAcrossSeam` lifted chasers/followers to the next level's seam edge
    in one frame (a squirrel 600 px behind you appeared at the gate), and everything else froze.
  - The loop effect re-run at the swap refilled your clip (7 → 12, measured), reset the fire
    cooldown, restocked grenades, and wiped grenades/blasts in flight; shots in flight were never
    re-based, so they vanished 4,800 px off.
  - The camera skipped the swap frame: the player lurched 12 px on screen (658 → 670) at every gate.
  - Separately, units NEVER used ramps: a ramp cell is not solid, so a unit walked into the hill's
    backing and the step-up popped it 30 px in one frame at every column (measured on M5's hill at
    cols 104–108: 934.5 → 904.5 in one frame, then standing UNDER the ramp surface at 904.5).
  **How it works now** (block headed `ONE WORLD, NOT ONE LEVEL AT A TIME` above `runWorldParts`):
  - `adoptRunNeighbours(run, node, roomState)` moves every unit of every level across the live
    level's open seams INTO the live level's books: spawn under its own cell re-based into the live
    grid (keys like `"20,165"` / `"20,-12"` — outside 0..cols, which is exactly where it stands),
    live state (the SAME `ep` object, x/y/tdJumpY re-based), HP, gear roll, loot (re-based),
    stripped list. Called by `togglePlaytest` (run start) and `seamHandoff`. The one enemy loop then
    simulates them like any other unit — they see you, shoot you, get shot, chase, die, drop loot.
  - `releaseRunUnits(run, node, roomState, sideOf)` at the handoff gives every unit back to the
    level it is STANDING in (`unitSideOf` = `worldPartAt` of its box centre). A unit that walked
    into another level is re-filed under the cell it stands on, inside that level's grid, so every
    level's keys stay in its own grid and the next adoption never collides (`moveRunUnit` slides a
    taken key to the nearest free column). Nothing is "carried" any more: a chaser keeps walking.
  - Terrain for units/shots/grenades: `runWorldParts(lv, seams)` = the live level + each neighbour
    as a rectangle in live pixels (`ox/oy`, whole-cell `dr/dc` — `neighbourOffset` now ROUNDS to
    whole cells for exactly this), each with its own solid objects. In the loop: `cellsHitW`,
    `splitHillHitsW`, `inWorld`, `worldPartAt` for slope/top-down/floor lookups in the unit's own
    level, `unitClampX` / `unitFloorY` (a unit leaves its level sideways only through an open seam
    near its gate — the player's own rule — and falls through the live level's open bottom gate).
    **The PLAYER still uses the old `cellsHit`** — its crossing rules were tuned against the live
    level alone and are deliberately unchanged. With no seams (plain ▶ Playtest, rooms) the world is
    one rectangle and every W helper is the old single-level code.
  - Units walk ramps: `splitHillHitsW` hands a ramp's own backing to the vertical pass, which snaps
    to `slopeSurfaceForPlayer` in the unit's level (only while not rising). A genuine one-cell lip
    still steps up in one physics frame but is DRAWN easing (`ep.stepEase`, the player's `easeStep`).
  - Sprites are keyed by `ep.uid` (seeded with the unit), not `ns + "r,c"`, so re-filing at the
    handoff does not remount ~140 DOM nodes per unit on the frame that must be cheap.
  - `seamCarry` tells the effect a re-run is a seam swap: clip, cooldown, grenade count and what is
    in the air are kept (seamHandoff re-bases projectiles incl. startX/startY/groundY, thrown, booms).
    The camera takes the swap frame's step before `seamHandoff` returns.
  - A grenade landing across a gate hits/stuns/captures there but paints no fire (a neighbour's
    fires are neither drawn nor burned until it is live).
  - **💾 Save during a run saves `run.editorLevel`** (and updates it), never the run's working copy —
    that copy carries a runKey and now every neighbour's units; saving it would have written other
    levels' enemies into his level for good. The run keeps playing.
  **Measured (production builds, same pane, same seed 7 drive M5 → M6, old vs new):** swap frames
  44 + 36 ms → 28 + 26 ms against a 19 ms norm (cheaper — no sprite remounts); per-frame callback
  3.7 ms before and after the gate with 15 units simulated instead of 2; player screen x steady
  (658 → 656) instead of lurching to 670; clip stays 7; the chasing squirrel's screen x continuous
  (-152 → -175 across the swap, two frames of its walk). Squirrel over M5's hill: max 3.7 px/frame
  rise onto the ramp surface (old: one 30 px pop). A one-cell lip: physics 30 px, the sprite's
  `style.top` stepped ~5 px/frame (985 → 955). Shot from M5 hit a squirrel standing in M6 (25 → 19
  HP); a squirrel given an M16 standing in M5 shot the player standing in M6 ("Hit for 3").
  M5 ⇄ M6 three crossings: 49 units in the run before and after, no duplicate uid, no orphan
  ePos, no out-of-grid key in any non-live level. Plain ▶ Playtest on M5: one bucket, 7 units,
  player stopped at 4735, shots culled at 4785. Tests: `describe("runs")` covers the offset
  rounding, the world parts/clamps, adopt/release round trip, key sliding.
  **A/B recipe for the production build:** build HEAD and the change into two folders and serve each
  with a tiny static server that answers `GET /__library` from a copy of the committed
  library.json (POSTs acknowledged and dropped), then run the identical drive on both ports.
* **THE WORLD NEVER MOVES AT A GATE (2026-09-26, late).** Blake, after ONE WORLD: "try to remove the
  camera stall and game freeze so it's more seamless". Every earlier fix measured JS only; the
  hidden test pane never paints, and on his machine the frame is paint (see the cutter-mask note).
  What the handoff did to the page: every run wrapper's `left` changed by a level's width, `.lgrid`
  was resized to the entered level, and the camera transform moved back by the same amount. Nothing
  moved on screen, but everything moved INSIDE `.lgrid`'s compositor layer, so the browser had to
  re-rasterise every textured tile in view on the crossing frame. Measured as "area of elements whose
  box moved inside `.lgrid`, clipped to the view": **4.3 views' worth of tiles** at every gate.
  Four fixes, all run-only (plain ▶ Playtest, rooms and the editor are untouched):
  - **A fixed world frame.** `runOrigin` = where the live level sits in the run's frame (reset in
    `togglePlaytest`, moved by the seam offset in `seamHandoff` while the position and camera move
    back). Wrappers sit at `runOrigin + off`, the transform adds `runOrigin`, `.lgrid` keeps the
    first level's box all run (`.lgrid.inRun`: no own background; each wrapper paints the grid).
    Everything else is still drawn in live-level pixels inside **`.lvLive`**, which sits at
    `runOrigin` — no z-index, no transform, so NOT a stacking context and the z-ladder is unchanged;
    outside a run it is `display:contents`. After: **0 tiles move** at a crossing.
  - **One list of objects** (`runObjects` + the pass headed ONE LIST OF OBJECTS). Objects used to
    switch between the live passes and the neighbour pass at a handoff: 31 built / 27 torn down on
    the swap frame (more area than the view; a Front object is a compositor layer). Now one FLAT list
    keyed `run node | cell`, so an object keeps its element. Flat on purpose — a list of lists puts
    each level under its node's slot, and the slots reorder at every handoff. After: 0 rebuilt.
  - **The swap render reads the entered level's books.** The effect re-points enemyPos/enemyHP/
    drops/gear at a level's bucket (`pointLiveRefsAt`), but after the swap render, so that render drew
    the new spawn list against the OLD positions: units flashed at their spawn cells for a frame and
    were rebuilt twice. `seamHandoff` now points them first.
  - **The level after next is got ready while you walk** (`warmRunAhead`/`warmRunNode`). Its tile
    runs and its gear-rolled units' composed looks (`assembleLook`, 8.3 ms into M8) were computed on
    the swap frame. The chain's links exist from `buildRun`, so after a 40-frame hold it does one step
    every 3 frames (`RUN_WARM_HOLD_FRAMES`/`RUN_WARM_EVERY_FRAMES`). Only already-LINKED nodes are
    touched (nothing resolved early, a seed builds the same run); rolls are prepRunNeighbours' own.
  **Measured** (production builds, his seed 7, first entry into five fresh levels; timing marks
  compiled into throwaway copies — `r`/`c` around the render, `h0/h1` around seamHandoff, `u0/u1`,
  `t0/t1`, `L0/L1` — then stripped): swap render+commit **9–27 ms → 1.6–4.8 ms** (a normal render is
  0.8–3), frames around the crossing 27–39 ms → 19–27 against an 18 ms norm. Paint itself is still
  unmeasured (pane hidden); the proxy above is what went to zero.
* **THE CAMERA HUNG ON THE LEVEL YOU WERE LEAVING (2026-09-27).** Blake: "when playing a run and going
  from one level to the next the camera sort of hangs on the prior". Four earlier passes treated this
  as a freeze and measured JS or paint in a 1,243–1,564 px test view. It was the CAMERA CLAMP, and it
  only exists on a wide view: `cameraTarget` still let the view past a seam by `SEAM_STRIP_CELLS`
  (40 cells, 1,200 px) — the strip that was drawn before neighbours were drawn whole. **His screen is a
  3440×1440 ultrawide at 125% scaling (2752 CSS px) and he zooms the game to 75–80%** (Chrome's
  per-host zoom in his profile), so the level view is ~3,084×871 CSS px; at 100% it is 2,396, 4 px
  inside the old limit. Half a 3,084 view is past the strip, so the camera stopped ~50 frames before
  every gate (the body slid 1555 → 1857 px across the screen), and after the handoff the clamp
  flipped to the other level's strip and the view swung back past him (→ 1344) before settling.
  Measured on seed 7, M8 → M7, `resize_window` 3440×1230. **Test camera work at HIS view size.**
  Four fixes, all run-only:
  - `cameraTarget` clamps to the UNION of the levels drawn (live + neighbours as rectangles from
    their seam offset and own size), a neighbour counting on one axis only when the centred view
    overlaps it on the other. At a gate both levels overlap on both axes, so the target is the same
    world point whichever is live (tests: the before/after pair, a taller neighbour, a sewer).
    After: screen x 1555 ±0.5 px through M10→M9, M9→M8, M8→M7 and back M7→M8.
  - **React was MOVING DOM nodes at every handoff.** The tile wrappers and the one object list put the
    live level first; at the swap the two levels at the gate traded places, and a keyed reorder is an
    `insertBefore` — the browser drops the moved subtree's style, layout and paint and redoes it.
    MutationObserver on `.lgrid`, M9 → M8: the whole level being left (414 elements) + 39 in-front
    objects moved on the swap frame. The earlier "0 tiles move" proxy compared boxes, which a move
    does not change. Now both are in grid order (`runGridOrder`) and units in seed order
    (`unitDrawOrder`, by `ep.uid`): **0 nodes moved** on every crossing. Count moves this way
    (a removed node that is re-added in the same batch) after any change to a keyed list in play.
  - Neighbours contribute ALL their objects (the cull decides) — the camera can see past 40 cells now.
  - `seamHandoff` commits in `flushSync` (the swap was a plain setLevel: a held frame, then the
    render, then the effect re-run each in a later task; a SyncLane commit runs the effect re-run
    before flushSync returns), and the new loop's first step is the swap frame's own `dtMul`
    (`seamCarry.dt`) instead of 1 — 1 is 2.75 of his 165 Hz frames, a lurch at every gate.
  - `runTilesUpTo` mounts a WHOLE cached layer a slice at a time too (`entry.ends`): walking back
    past a gate re-mounted the level two gates back (414 elements) in the swap frame. Swap frame
    6.9 → 1.9 ms, forced layout 3.9 → 1.1 ms.
  **Harness traps this time:** a teleport can land on a 🚶 walkway (`p.topdown`, no gravity — reads
  as a dead loop; clear it and pick another x); the pane drops a held key on a stray blur, so re-press
  `d` every frame from the rAF wrapper; and sample the body's SCREEN x (`p.x - camRef.x`) per frame —
  it is the one number that shows a camera hang, a swing and a lurch at once.
* **THE LEVEL YOU LEFT BLINKED OUT AND REFILLED — "a little screen tearing" (2026-09-27).** The
  live level is drawn whole, but only a NEIGHBOUR ever wrote `RUN_MOUNT_PROGRESS`. So the level a run
  starts in had no count, and the frame you walked out of it, it became a neighbour "new to the
  screen" and was cut back to its first 30-item slice and staged in again from nothing. Measured at
  his 3,089-px view, first gate out of M4: 312 of its 354 tiles (bg, fg AND Front) removed on the
  swap frame, back 30 a frame for eleven frames — right behind you, in view. A level entered before its
  staged mount finished did the same from its stale count (43 tiles, measured). Fix: a live node
  records itself whole. After: 0 tiles removed at the first gate, forward or walking back; the only
  swap-frame changes are an off-screen level added (x 9,600) and one dropped. **How it was found:** a
  MutationObserver on `.lscroll` (childList, subtree) bucketed per frame from the rAF wrapper, with
  each node's `.seamStrip` and its `left` — the element-rect proxy and the move counter both miss a
  remove-then-re-add two frames apart. Player screen x, the view rect and the status row were all
  steady at the swap (±0.3 px), so it was never the camera.
* **GATES ARE KEYS, NOT DOORWAYS — SIDEWAYS (2026-10-02).** Blake: gates should be "more like keys
  which just decide what levels can generate/spawn next to another… it does not need an invisible
  wall… my mobility options are limited". Left/right gates now only choose the neighbour
  (`canAttach`, unchanged); once a level sits east or west, `seamGateLeaving` opens the WHOLE edge the
  two share (centre y inside the neighbour's rows; above both tops when the neighbour reaches as high).
  It hands back the joined gate nearest the crossing, used only for the death respawn. Top/bottom seams
  keep the gate-reach rule (a hole in a street that is not a sewer gate still stops you). Because the
  body may now straddle the edge anywhere, the player's `cellsHit` asks `solidAtW` for any cell off its
  grid, and its four `splitHillHits(lv, …)` calls became `splitHillHitsW` — so it meets the far side's
  walls and ramps while straddling (before, gates were lined up so the far half met nothing). Units
  follow automatically (`unitClampX` asks the same function). **Verified on his levels, prod build,
  seed s15:** crossing M6→M5 mid-air at y −69 swapped levels; the OLD build on the same drive stopped
  at x 4748 (the wall). A 2-column wall planted in M6's last columns stopped the player at x 0 in M5
  (no crossing, no embedding); removed, he walked back through.
* **A SEWER IS PLANNED WITH ITS WAY OUT (2026-10-02).** Blake: "entering the sewer by going down it has
  to generate both an entrance and exit … you need two levels with gates that go to the sewer", and
  nothing may "go back before the start". Passages used to be rolled one slot at a time
  (`resolveRunNeighbour`), so a sewer could open with no climb back out, or run west under the start.
  Now `buildRun` plans every passage (row +1 sewer, row −1 tree top) while it builds the chain:
  `planFrom(col, dir)` lists routes (in through that street level's gate, sideways through passage
  levels up to `RUN_PASSAGE_MAX` = 4, never to a column < 0) and keeps one that comes back up into a
  DIFFERENT street level — an existing column, or new columns chained east by `fillTo` so the last one
  fits. Routes whose exit lands exactly where the street puts that level (`seamOffX` sums) are tried
  first: his M6 → Sewer M1 → Sewer M2 → M5 is straight down/up and flat; M5 → … → M6 is staggered twice
  and comes up 80% of a level off (each seam still meets — only direct neighbours are drawn — so the
  lax pass still allows it). `run.planned` makes `resolveRunNeighbour` join only nodes already laid for
  a top/bottom gate or a passage level's side; the street may still grow east past a chain with no
  Exit. A gate with no route is a wall in that run. Section words **Sewer / Underground / Tree Top**
  give `runRole` "side": never a street level (his sewers had been "middle", so a run with no Intro
  could start in one). 🎲 Generate draws each passage level under (⬇) or over (⬆) its column
  (`runPassageLevels`). On his 13 street levels, 30 of 40 seeds lay a sewer. Lazy-roll tests pass
  `{ passages: false }`. The whole loop was driven on seed s15: dropped through M6's Bottom Left, walked
  east through the tunnel (his sewer's tunnel meets at rows 10–18 while Sewer M1's E1 mark is row 16
  — fine either way now), climbed Sewer M2's ladder and came up in M5 at the same x.
* **EVERY STREET LEVEL OVER A SEWER LINES UP WITH IT (2026-10-04).** Blake, seed 90084: "a trailor level
  with a sewer down gate was generated where there was not a sewer upgate… Sewer entrances have to line
  up on top and bottom." A sewer three levels long (M5 → Sewer M1 → Sewer M3 → Sewer M2 → M6) runs
  under a street level in the MIDDLE too, and `planFrom` only ever checked the way down and the way up.
  The middle M6's Bottom Left sat over Sewer M3, which has no top gate, so it was a wall that flashed
  "leads nowhere yet". Sewer M3 and M4 are both tunnels (W1 + E1 only). Now `vertSeamLinesUp(street,
  passage, dir)` must hold for EVERY column a passage runs under, entry and exit included: each open
  gate facing the other level leads through (`seamGates`, the same lined-up test `runSeams` uses), or
  neither level has a gate on that side. `fillTo` asks `fits(m, x, k)` of every street level it lays,
  not just the last. Measured on his online save in 🎲 Generate (prod builds, seeds 0–59): old code put
  M5/M6 over M3/M4 in 15 runs, new code in 0, with the same 38 runs getting a sewer and the same 27
  using M3/M4 (now under M3/M8/M9/M12, the levels with no bottom gate). The rule is strict on purpose:
  a street with Bottom Left AND Bottom Right over a sewer with one top gate is refused too, because one
  of the two would lead nowhere.
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

**An ally fights what is around YOU, on a leash (2026-09-27).** Blake: "using the pokeball the
followers were not really following me … they may be agro on my enemies", and "are player NPCs not
seeking? I have some set to chase me" (The Chaplin: 🏃 Seek + a dialogue with a "friendly" act). A
friendly targeted the nearest hostile ANYWHERE and followed you only when none was left — and since a
run adopts every neighbouring level's units (ONE WORLD), there always was one. Old-code control: an
ally beside you walked off toward a Pit Bull 180 cells away (x 584 → 3015 and going). Now
(`allyGuards`, `allyRegrouping`): a hostile counts only within `ALLY_GUARD_CELLS` (30) across and
`ALLY_GUARD_ROWS` (12) up/down of YOU; an ally more than `ALLY_LEASH_CELLS` (40) from you drops the
fight and comes back until within `ALLY_REGROUP_CELLS` (8) (`ep.regroup`). Measured: it stays with you
(x 568 → 386, you at 300), and walking up to the dog with the ally 43 cells back it regrouped
(4009 → 5060) and then engaged. Hostile Seek units are unchanged; note they only notice you within
6 body lengths (~42 cells — a third of his screen) and Speed 0 units (Billy, Bobby, Army Bob) never
walk, by his own rule.

**Units duck under what blocks them (2026-09-27, `ep.duckUnder`).** Blake: "NPCs, player and not,
should duck to get under obstacles if that is what is stopping them … my elephant may have gotten
stuck". A walking unit blocked at head height whose CROUCH box clears the wall at the same feet ducks
and walks under; each frame it stays down while its standing box would hit a wall (that also holds a
dodge-crouch that runs out under a ceiling). Only units with a drawn crouch pose, only on their feet.
Old-code control: Viatnamese 3 stood pressed against a 3-row overhang forever (x 1411); now it ducks
(y 540 → 624, feet unchanged), walks under for 111 frames and stands up clear of it. The Elaphant
(scale 2) ducks under a 4-row overhang and stays ducked while any of its 323 px body is under it.

**Units walk only to a target on their own level (2026-09-28, `unitSharesLevel`).** Blake: "If you
are walking a level above them enemies they shouldn't follow you, just if you are on the same level
as them. Some of my newer levels have enemies following walking under." Trailor Park M7–M11 are two
storeys — a slab at row 20 over a street at row 35, 450 px apart, with a hole at cols 76–81 — and
nothing that STEERS a unit ever asked how HIGH its target was: `enemyDetects`, `enemyMoveIntent`, the
tackle charge and the top-down walk all read the gap sideways. (The ATTACK test, `sameLevel` in the
enemy loop, always did — which is why they only ever shadowed you along the street, never shot up
through the ceiling.) A Seek unit now walks to a target only when the two pairs of feet are less than
one body length apart: `unitLevelBandPx` = the player's body length (7 cells, 210 px) or the unit's own
standing height if that is bigger. A jump (3–6 cells) and every hill inside the 42-cell sense range stay
inside it (his M1/M2 hills fall 15 rows over ~100 columns, so ≤ 6 rows in range); the two storeys never
do, whichever way round. Target CHOICE follows: a hostile prefers whoever shares its level (you or your
allies) and falls back to the nearest as before; an ally only takes on a foe on ITS level, else it tags
along (`followPlayer` never asks). Untouched on purpose: facing, sensing, aiming and shooting (the gun
has its own level test), Avoid (a retreat, not a chase), and two bodies BOTH on a 🚶 plane, which share
a level whatever their depth (depth is that plane's own axis). Measured on his real M7 in the pane, 620
frames with the player standing on the slab at x 1700: the street unit (34,42) travelled **0 px**; the
same run with the check switched off (a throwaway `window.__noLevelGate` in `unitSharesLevel`) walked it
**320 px**, x 1194 → 1514, right in under him. With the player dropped to the street the three slab
units stayed at 0 while the street units closed 799 px. A hostile Evil Shop Keeper on Int7's carpet
still walked 207 px + 30 up the plane to the player's line. Not verified: a 15-row hill (none exists
in range); the unit test pins the band, not a hill.

**A ducking unit's two arms (2026-09-28, `driveUnitArms`).** Blake: "I had an enemy crouch and aim at
me and their arms disfigured and had one go way below the other. They were crouched and aiming to
their side." Every dressed look draws its Crouch (and Front/Back) pose with TWO weapon arms — the drawn
one and a mirrored `_m` twin across the body. The unit's render turned the FIRST and carried everything
else flagged as an arm rigidly round ITS shoulder (`rigidArmFollow`), including the other weapon arm,
whose own shoulder is a body-width away: swing a point 90° about a pivot 98 px off and it lands 98 px
lower. Measured on all 20 looks with a crouch pose (Army Bob, Billy, DK, Bobbi, Roberta…): the far
shoulder went (51,124) → (149,222) the moment the unit aimed ducking (Bobbi/Roberta/Bobette (64,101) →
(123,172)). In Side there is one arm and every sleeve sits on its shoulder, so nobody saw it standing.
The player never had it: its aim branch gives every `role:"weaponArm"` its OWN absolute target about its
own shoulder (times `armMirrorTwist` for a twin) and only clothing follows, the NEAREST arm
(`armAnchorFinder`). `driveUnitArms(blocks, primary, armRotOf)` is that rule for units and the enemy
render now calls it for aim, swing and throw; `armMirrorTwist` moved to module level to be shared.
For one arm it is byte-identical to the old code (a test pins it against the old lines verbatim).
Real-app control on his Army Bob / Bobbi / DK / Bobette holding guns, ducking and aiming: old code the
far arm at `top: 85.38%` (a `left: 70%` twin, hanging by the feet in the screenshot), new code
`top: 47.69%` `left: 21%` — level with the near arm, rotations −90/90. Standing aim unchanged.

**A block is half a second (2026-09-28).** Blake: "You should halve the time the player spends
blocking when pressing Q." `BLOCK_FRAMES` 60 → 30 and ONLY that: the arms-down recovery
(`BLOCK_RECOVER_FRAMES`, 30) is the price of a block and was not what he asked about, so a held button
now pulses ~0.5 s up / ~0.5 s down (was ~1 s / ~0.5 s) and the held-guard uptime test reads ≥ 0.5.
Measured: a tap holds `p.blocking.t` from 0 to 29.9, then drops.

**The parry's `detonate` was out of scope (2026-09-28).** "ReferenceError: detonate is not defined
… at Array.filter … at loop." `detonate` was a `const` inside the projectile block, and the player's
melee PARRY — which sweeps a swing through incoming shots and detonates an explosive one where it was
struck — sits in an earlier sibling block and called it. A block-scoped const cannot be seen from a
sibling, so the first swing that struck an enemy's RPG rocket crashed the game (a unit's shot carries
its weapon's `explode`, `fireUnitShot`). It is now defined above both callers (its one use of
`intelligence` reads `pstats.intelligence`). Control on the original file: pushing an `explode`/`foe`
shot into a bat swing threw exactly that error and the loop died after one frame; fixed, the same swing
at three distances consumed the shot, spawned a boom and flashed "🗡️ Blocked!" with no error. Lesson: a
helper that two blocks of the loop both call belongs at loop level, not inside the block that first
needed it — the projectile block's own five callers are why nobody ever saw this.

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

**A SQUIRREL AT YOUR FEET: THE FLOOR LOCK AND THE 🦶 STOMP (2026-09-26).** Blake: "when it gets
close the gun and meelee don't like to hit it". Measured with Army Bob + M16 on a flat test level
before the fix: the level barrel sits 95px in front of the body and 150px above the feet, so a
46px Squirrel anywhere from touching you out to ~13 cells needed a 25–75° dip (the cone stops at
22°), and holding ↓ covered one two-cell strip. Level and ↓ both missed at every distance tried
except one. The close ones were also BEHIND the muzzle, which the cone skips (`dx <= 1`).
* **Floor lock** (`aimAssistAngle({ floorLock: true, bodyX, cellPx, muzzleAt })`, player only):
  a body whose feet are within a cell of yours, in front of your BODY and lower than the barrel,
  can always be locked while aiming level or down — bend down to 85°, or back up to level when
  ↓ is held. Tried only after the cone fails, so cone locks are unchanged; aiming up never
  reaches for the ground. `floorLockShot` sweeps the gun down and judges every angle from the
  barrel tip AT that angle (`muzzleAt` = the fire code's `muzzleSpawn`) — solving from the level
  muzzle, or a plain iterate, both measured shooting past the animal. No angle works = the body is
  under the gun: point-blank, the shot starts at the tip over it or inside it. Range is measured
  from the barrel, nearest-ness from the body. Verified: one hit per shot at 0–700px, level and ↓.
  Units do not pass `floorLock` (their held line already points at their target).
* **Stomp** (`STOMP_DAMAGE` 30 × Str/5, Int crit): Fire with a melee weapon or bare hands, or Q/V
  with a gun, stamps instead of swinging when `stompTargets` finds a body ≤ 40% of your standing
  height on your floor, overlapping your footprint or within 1 cell in front (`startStomp`). Q/V
  with a melee weapon is still the BLOCK. It plants you for 0.4s (left/right/jump/crouch/arrow-turn
  blanked in the K merge), damage lands on the one `stompLands` frame on everything short under
  the foot then, with a 💥 boom (visual only) and a 3px body dip. Pose is `stompLegBlocks`: the
  front leg swings 28° and lifts; Bob's one drawn leg gets `addBackLeg`'s clone as the planted
  one. 40° read as a kick and 14° hid the leg under Army Bob's coat — tuned in the running game.
  Squirrels (46–55px) qualify, Pit Bulls (93px+) do not.
* **Units stomp too** (Blake: "Enemies and allies can stomp", after being told a thug would then
  one-shot his captured pet Squirrel — so that is intended). Any non-creature unit, armed or not,
  runs `eStompFrom` (its own hit box against `aliveOpposite` + you) when it commits an attack and
  stomps instead of swinging/shooting/punching; `ep.stomp` is the same `{t, dur, hits}` clock,
  damage through `applyHitTo` at `stompDamage(its Strength)`, no crit. A MELEE unit whose target is
  short narrows `engageRange` to `STOMP_REACH_CELLS` so it walks in — at weapon reach it stood
  swinging over the Squirrel forever. A gunman keeps its range. Planted (`dxMove` 0, facing held),
  cancelled by a stun. You are never stomped: the player's box is the full 7-cell physics box.

**🐈 CHAP CAT (`c4tch4p`) AND 🦁 LION (`l10n5ht`), 2026-09-27 — "a Cat Enemy, inspired by Chap cat,
not too small but at stomp height", and "the cats attack should sort of paw at who it attacks".**
* **STOMP HEIGHT IS A HARD BUDGET, and Scale spends it.** A unit's box is `heightFrac` of its Side
  art × 7 cells × `scale`, and a stomp takes bodies ≤ 40% of the stomper's 210px = 84px, i.e. at
  most **104 canvas units of Side art at scale 1**. The cat is 97.5 units = 78.7px (Squirrel 46,
  Pit Bull 93+), so **its Scale past ~1.06 makes it unstompable**. HP 30 = one Str-5 stomp.
* The head IS his Chap — Cat Head hat's (`ch4pc4t`) side pose, mirrored to face left and scaled
  0.65: his pieces, colours and brights. Tuxedo body, four white socks.
* **The swat is the drawn Attack pose, not an animation.** `eUseAtkPose` swaps it in for the 14
  swing frames of each strike (~every 45), which reads as batting. 💪-flagged pieces in an Attack
  pose never swing (the arm path is gated off by `eUseAtkPose`), and lifting that gate would start
  swinging the Pika-Squirrel's attack arms, so it was left alone.
* **Lion:** scale 1.25, 4.6 cells tall, drawn with its feet on **y=190, not 150** — its rear-up
  otherwise left the top of the canvas (the ground comes from the art; the Elaphant stands at 242).
* **Both walk on FOUR leg columns** (far legs at his far-ear bright 0.62). `multiLegPivot` fuses
  leg pieces within 6 units of each other: the Lion's front paws sat exactly 6 apart and walked as
  one leg until moved. Check the column split with the real export, not by eye.
* Verified in Playtest: the cat swaps 31 → 36 pieces for 13-14 frames per strike ("Chap Cat hit you
  for 10"); BoB's bare-hands press stomps it (22 stomp frames) and it dies in its death pose on the
  floor; the same press beside the Lion punches (150 → 148), and the Lion's legs swing ±17.9° in
  alternating columns on Seek.

**🐄 COW (`c0wmoo1`), 🐊 CROCODILE (`cr0cd1l`), 🐢 TURTLE (`trtl5hl`), 🐀 RAT (`r4tbit3`), 2026-10-03 —
"can you build these non human Enemies".** Same recipe as the cat and lion (side-on facing left,
feet on y=150, Side/Up/Crouch one drawing with their own ids, a drawn Attack and Death). The stats
and scales are my picks, not his: Cow HP 120 / Speed 6 / Str 8 (butts for 16) at scale 1.7, 5.3
cells tall and NOT stompable; Crocodile 100 / 7 / 10 (bites for 20) at 1.6, 2.3 cells; Turtle
60 / 3 / 5 (10) at 1, 1.8 cells; Rat 20 / 16 / 3 (6) at 0.8, 1.6 cells — the last three are under
the stomp budget, and one stomp kills the rat. The record copy is `assets/animal-enemies-pack.json`.
* **FEET COUNT IN THE 6-UNIT COLUMN FUSE.** The crocodile's first draft had legs 18 apart, but its
  long feet bridged every gap and `multiLegPivot` made ONE column of all four, so it returned null
  and the croc would have slid like a block. Measure the gaps over the leg AND foot boxes.
* **The turtle's Crouch is it hiding in its shell** (feet only, no head). Units duck to dodge a
  shot, so that is what you see when you fire at one. Its feet stay on the floor (measured 780.0
  against a floor at 780).
* **An Attack pose with turned legs carries `groundLine.attack = 150`.** `alignPoseFootBaseline`
  measures leg pieces by their UNROTATED boxes, which sit below the drawn hooves of a braced leg, so
  without the line the head-butt would float a unit or two.
* **Belly-up deaths** (cow legs-up, croc belly-up, turtle on its shell): flip the standing drawing
  about `(backY + G) / 2` so the back lands on the ground line, then place the head by its TURNED
  corners. Placing it by the unrotated box left the cow's horn and the croc's jaw poking a few units
  under the floor line, where the corpse draws over the dirt.
* Verified in Playtest (BoB, Seek): all four walk on four alternating leg columns (±18°), turn to
  face him and swap to their Attack pose for each strike (rat 18 → 26 pieces for 10 frames, turtle
  17 → 18); the rat dies to one stomp and the turtle to two (60 → 30 → 0); every corpse's ground
  line lands on the floor to the pixel.

**"THERE IS NO SAVE BUTTON ON JACKETS/CAPES" (2026-10-09) WAS A FULL localStorage.** His screenshot of
Save & Open showed only ⬇ Download / ⬆ Upload. The 💾 Save there renders on `hasStore`, which came from
one probe write (`localStorage.setItem("__p", "1")`). `sset` saves to IndexedDB and only MIRRORS into
localStorage, so localStorage fills to Chrome's per-site cap and stays there. Measured with
`tools/read-chrome-leveldb.js ls` on a copy of his Chrome `Local Storage/leveldb`: all 16 Bob Okay
addresses (StackBlitz ones, their stackblitz.com-partitioned twins, cbm971.github.io) held
5,240,201–5,242,879 of 5,242,880 characters, and the one he was on had a single character free, so the
4-character probe threw QuotaExceededError. Not jacket-specific: every asset type shares the sheet, and
copies with a few hundred characters spare kept the button, which is why it looked random. My own
check at 1600 and 3440 px found the button and called it there; it was there in MY browser, whose
localStorage quota is far larger, so the same test cannot fill it. The fix asks IndexedDB too
(`idbOpen()` → `setHasStore(true)`). Verified with a page-level simulator (a script ahead of the
bundle in `public/index.html`, gated on a sessionStorage flag, making `localStorage.setItem` throw
QuotaExceededError; reverted before commit): the shipped code showed no 💾 Save (the control), the
fix showed it, and a real click saved the record into IndexedDB and the asset index. A source test
guards it.

**🦒 GIRAFFE (`g1raff3`) AND THE "Zoo" PROP FOLDER, 2026-10-09 — "make a few Zoo related props as
well as a Giraff Enemy", then, mid-job, "Make sure you don't cheat when making the asset. You may
add shapes and tools to the asset maker if you need to ... Just make sure its logical".**
* **What "cheating" turned out to mean, measured.** The first draft was built like every scripted
  asset before it: smooth tapered necks and tails as 18-point polygons nobody would click out with
  🪣 Fill, sizes and positions to three decimals, a 0.78 brightness between slider stops, prop
  default sizes of 16 and 20 that the 1–12 Default-size slider could not set, bars and mouth lines
  thinner than the 3-unit corner-drag minimum. His own animals (Elaphant, Pit Bull, Squirrel) use
  stock shapes only, on the half-unit grid, in whole degrees.
* **Tools added instead of tricks:** the 〰️ **Curve** tool (three clicks: start, a point the curve
  passes THROUGH, end, plus Start/End thickness sliders; bakes one ordinary "poly" exactly as Fill
  does; `curveBandPoints` + `polyBoxFromPoints`), and the Object editor's **Default size** became
  buttons for `PROP_DEFAULT_SIZES` (every Level Creator size plus the old slider's 9 and 11).
  `TEXT_FONTS` moved to module level so the checker can read it.
* **`editorReachIssues(asset)`** lists everything in an asset no control can produce. CALIBRATED on
  his save folder before trusting it: a strict "half-unit grid, 3-unit minimum, whole degrees" rule
  flagged 152 of 244 assets including his own hand-drawn weapons, because scaling a GROUP
  legitimately gives any 3-decimal size down to 0.05 and the Line tool gives tenths of a degree.
  The shipped rule flags 27 of 244: scripted props/animals with off-stop brightness (Lion, Chap
  Cat, Crocodile, Rat, Cassock, couch, armchair …), a few weapons with off-stop glow (Shock Baton,
  Grenade, Experimental Rifle — possibly an older slider), and polys whose outline does not reach
  its box. None of those were changed. Dress Bob composites (`type: "character"`) skip the geometry
  checks: Dress Bob, not a hand, fits their pieces. Also learned: Fill and Curve both measure the box
  FROM the outline, so a drawn poly always touches all four sides of its box.
* The generators (scratchpad `giraffe.js`, `zoo.js`, `editorrules.js`) snap to the stricter grid
  anyway (0.5 units, ≥ 3, whole degrees, 0.05 brightness), draw every curve through a copy of the
  Curve tool that a jest test compares against the real export, and report anything drawn thinner
  than 3 (60 bars/wires/grooves were redrawn at 3 units).
* **THE WALL BOX STARTS AT THE CANVAS'S LEFT EDGE.** First layout: the giraffe stood in the right
  80% of the canvas (x 38–198) to leave room for its head-swing attack. In Playtest it stopped
  walking left 64 px (2 cells) short of a solid rock: the unit wall box is `[ep.x, ep.x + fraction ×
  renderW]` (`wallBoxHits`), not offset like the hit box (`hitboxOffset`), and right-facing units are
  mirrored about the canvas centre, so facing right it would have pushed its nose 2 cells into
  walls. Every animal of his fills the width (Lion 3–194, Elaphant −6–208). Re-laid nose at x=0,
  tail swished out to x=199; re-measured: nose stops on the rock's edge.
* **Attack = necking, foreshortened.** A straight 83-unit neck swung down to Bob's head height
  leaves the canvas at every angle low enough (searched). Bull giraffes swing the neck SIDEWAYS, so
  seen side-on it comes toward you and reads shorter: the attack draws an arched, shorter neck
  (one Curve stroke) with the head nodded horns-first at Bob's height, the body tipped 4° onto front
  legs splayed just far enough (solved by bisection) that every hoof is on y=250.
* Giraffe: scale 2.1 (12.1 cells, 2× Bob, taller than the Elaphant), HP 180, Speed 9, Str 10 (hits
  for 20 — Bob has 25 HP), Agility 4, Int 3, Seek. 44 pieces a pose, four leg columns 7 units apart
  (`multiLegPivot` ±15.6° alternating), feet on y=250, `groundLine` attack/death 250, belly-up
  death with the neck along the floor and the dark tongue out. Verified in Playtest: walks to Bob,
  swaps to the Attack pose for 16 frames per strike, 25 → 5 HP; corpse body bottom 1.7 px into the
  floor (the drawn G+1), the pool 10 px.
* Zoo props (`category: "Zoo"`, `assets/zoo-pack.json`): Zoo Entrance `zoogate` 16 (4:3, his grey
  Stone brick pillars, "ZOO" text), Zoo Railing `zoorail` 16 (4:1, tiles with half posts), Animal
  Cage `zoocage` 12 (198×132 = 3:2 ON the half grid; no back wall — place it on the Front layer and
  an animal behind it shows through the bars; verified with the Lion), Ticket Booth `zootkt1` 10,
  Popcorn Cart `zoosnak` 6, Zoo Signpost `zoosign` 7 (LIONS / GIRAFFES / REPTILES, editable text),
  Giraffe Feeder `zoofeed` 12 (basket at the giraffe's head height), Acacia Tree `zootree` 20 (1:1),
  Enclosure Rocks `zoorock` 8 (2:1, **solidDefault**, his Rock texture; Bob stood on it), Flamingo
  `zooflmg` 4 (dips its head every 2 s). Awnings are Squares + Half circles turned 180°.

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
picked: Dress Bob's "Open saved look…" (optgroups via `lookOptions()`), Load → Dressed Looks, which
drills down by folder exactly as Objects does, and — **since 2026-09-26 as a FOLDER DROPDOWN, then the
characters in it, like the 🌿 Object picker** ("it is just one big list" with optgroups) — the Level
Creator's 👹 Enemy picker and the Playtest player picker (`characterPicker` over
`characterPickerGroups`: the looks' folders, plus 👹 Enemies for the animals and 🧍 Bodies for the
player). Browsing another folder never swaps out the current player (it stays listed); the Enemy
picker, a paint brush, lets go of a pick outside the folder, as Objects does. Fewer than two folders = the flat list it always was, so a wardrobe with nothing filed is
unchanged. The field lives in a 📂 Category card in Dress Bob's side panel with chips for the
folders already in use; `composeLook` trims it onto the saved record and `rebuildLook` keeps it
because it spreads the whole look. **Opening a saved look now fills its NAME into the header too**
(`openDressedLook`) — before, the box stayed blank and Save minted a second "<body> — dressed"
beside the one you had opened, which made "open it, file it, save" impossible.

**ROOMS FILE BY SECTION, FALLING BACK TO THE ROOM TAG (2026-09-26).** The Load dialog put every room
in one "🚪 Rooms" pile. `levelLoadGroups` now gives levels their Floor folders (as before) and rooms a
folder each by Section, else Room tag — his rooms only carry tags (Trailor Int ×6, Tree), so the tag
is what files them today. A room's "· tag:" hint is hidden when it repeats the folder name.

**🔀 MOVE MOVES THINGS (2026-09-26).** It used to be only the colour-layer swap (click paint → flood
pick → send to another layer), so clicking a trailer grabbed the whole Background behind it and there
was no way to lift the bottom of Trailor Park M9 up a few rows. Now, on EVERY layer: **drag a box** →
everything anchored in it (fg/bg/front, climb, fire, markers, enemy spawns, objects by their top-left
cell); **click an object** → just that object. Then drag it or arrow-key it (Shift = 5 cells); Esc or
✕ Deselect lets go; each nudge is one Undo step, and Undo/Redo drop the selection. A plain click on
bare paint still does the old layer swap (`pickMoveRegion`, unchanged). The mechanics are pure and
tested: `liftLevelArea` / `stampLevelArea` / `moveLevelArea`, `moveLevelObject`, `clampAreaShift`.
**The block is lifted ONCE and carried** (`areaFloat`, valid only while `level` is the level it last
stamped AND the selection is the one it made): the first build re-read the box on every nudge and, once
the box sat over the upper floor's bottom row, carried that row off with it. Verified on his real M9:
ground/ladder/trailer/row-35 enemies up two rows, everything above row 20 byte-identical.

**A HELD WEAPON'S "Behind the WHOLE body" PIECES (2026-09-26).** `mergeWeaponBlocks` — every held-weapon
render site (player, units, corpses, Dress Bob, and now `composeLook`'s bake too) — only knew
`behindArm`, so DK Arms' far arm, flagged `behindBody` and drawn behind the torso in the editor, sat on
DK's chest in Playtest. `groupWeaponBlocksByArm` now returns `{ under, behind, front }`: `under`
(behindBody wins over behindArm) goes before the whole body, capes included.

**A TWO-ARMED WEAPON'S SECOND FOREARM RIDES THE OTHER ARM (2026-09-26).** Blake's screenshot: climbing
in DK Arms, one DK forearm on his helmet with the barrel, the other floating out by the pole. The
back/front/up/crouch poses draw the forearm with ⇋ Mirror, so its twin IS the second arm, over the
body's other arm — and `attachWeaponBlocks` swept every piece round the one weapon arm's grip as a
rigid body, so the ladder/wire's 175° turn swung that twin half a circle to the far side (measured:
117–131% of the sprite width). `attachWeaponBlocksToArms` (player render, weapon + throwable) sends a
`_m` piece drawn on the far side of the body from the grip to the body's own twin arm (`twinArmOf`:
opposite `_m` parity, nearest the mirror spot — characters store it under its own id), attached
mirror-for-mirror. At rest on the guide body it is the identical picture; the barrel and anything on
the grip's side stay rigid with the weapon arm. Units are untouched: their other arms already follow
the primary arm rigidly, which matches the rigid attach. Only the DK Arms have mirrored weapon pieces
in his library today.

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

**A PLACEMENT CAN BE "ANY ONE OF THIS FOLDER" (2026-09-27).** Blake: "random spawn by tag … if it
spawned Trailor it can make the potential enemies spawned more random and allow me to delete dressed
assets." Pick a folder in the 👹 Enemy picker and the character list offers **🎲 Any in <folder>**
(value `ENEMY_TAG_PICK` + name, never saved); painting stamps `enemyTag` instead of `enemyId`.
The folder is the look's 📂 `category` (`enemyTagPool`); the animals answer to the picker's
"Enemies" folder (`ENEMY_FOLDER_LABEL`). A tag placement names no look, so deleting a look leaves no
❓ hole — the pool is asked who is in the folder when the level is entered.
* **Who it is is rolled with its gear, as ONE record** (`rollSpawn` → `{ enemyId, items }`) in
  the same per-level `gear` map, so `moveRunUnit` carries both across a gate under the unit's one
  key. `spawnRolls` gates it: a placement with neither tag never enters the map.
* **Every play-time reader asks `unitAssetAt(k, spawn, gear)` / `spawnEnemyIdAt`**, never
  `spawn.enemyId` — a tag placement has none. 22 readers were a mechanical
  `liveEnemyAsset(k, findA(x.enemyId), g)` and became `unitAssetAt(k, x, g)`; `liveSpawnAt` also
  folds the rolled `enemyId` in, for readers holding the folded spawn.

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
* **Up to THREE tags since 2026-09-27** (`gearTags`, `SPAWN_GEAR_TAGS_MAX`; the old single
  `gearTag` is read as a list of one). Three boxes STACKED in the toolbar, the next appearing when
  the one above has a tag ("stacked on top not side to side"). Each is its own roll, made from its
  pool MINUS every slot an earlier roll filled (`gearRollSlot`: hand, throw, one per garment slot),
  so there is never a second gun that could only replace the first, and "Trailor" typed three
  times is three different things. Garments ride in `wearIds` (a list); `wearId` is still read.
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

**...but it DOES stop at 0 from below** (`unitWalkSpeed`, 2026-09-26; Blake: "Speed should
effectively stop going down at 0"). A dressed look's Speed is skin plus gear, and gear can take
it negative — the saved Army Bob is −1 — which made `aiSpeed` negative and flipped every move
rule: a Seek Army Bob was measured walking steadily AWAY from its target (x 977 → 499), an Avoid
one runs at you. Negative now reads as 0: Army Bob, Billy and Bobby (Speed 0) hold their ground.
The player was never affected — its own speed clamps to 1–10.

**...and since 2026-09-28 ALL of the above is the Enemy-creator ANIMALS' scale only.** A dressed look
walks by the player's own formula (`unitMoveSpeed` → `playerWalkSpeed`: 7 px/frame at Speed 5, 0.6x
at ≤1, 1.5x at ≥10, half while crouched). Blake: "Enemies get all of the stats and abilities of their
dressed Character … Stats should too". On the old scale the same DK walked at a third of his speed
under your hands, and a Speed-0 look could not move at all. So Army Bob, Billy and Bobby now walk at
0.6x, as they do when you play them; no look goes negative, because the player's clamp floors at 1.
Animals keep 2.2 × Speed/5 (up to 20, floor 0), because the Squirrel's 14 is authored on that scale.
Measured in play: Nixon (Speed 3) Seek walked at 5.61 px/frame, against 5.6 expected (it used to be
1.32). A tackler's charge no longer sprints at 1.7x for dressed looks, since it now walks at your
pace and you have no sprint.

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

**A UNIT TAKES A HIT BY THE PLAYER'S RULE — ITS ARMOUR COUNTS (2026-09-28, `incomingUnitDamage`).**
Blake, playing DK: "Why do enemies have less HP than the player? … it would take about 2 projectile
hits to kill me but enemies are insta dying." Their HP was never the difference: a dressed look
placed as an enemy has exactly the player's pool (`enemyLookHP` = `maxPlayerHP`). The difference was
AFTER the HP. Every hit on the player went through `incomingPlayerDamage` (Defense, Back Guard,
Crouch Guard, floor of 1), and every hit on a unit was a bare subtraction. So the armour a dressed
👹 Enemy is drawn wearing did nothing. DK's 13 Defense means he takes 43% of a hit, and the same DK
placed as an enemy took 100%. Army Bob's 22 was worth nothing. Those are his "player enemies": the
dressed looks, which are the only units that carry Defense.
* `incomingUnitDamage(raw, ea, ep, attackerX, wearerX, ignoreArmor)` is `incomingPlayerDamage` with
  the unit's own numbers. It uses the assembled `ea.defense` (a rolled 🎲 garment is folded in by
  `liveEnemyAsset`), `ep.face` for "from behind", `ep.crouch`, and `guardReduceOf(ea.effects, …)`,
  which reads the same way as the player's two lines. Ignore Armor skips the Defense step on both sides.
* **All eight places that hurt a unit go through it:** the brawl (`applyHitTo`), your swing, your
  stomp, a thrown impact, a foe's blast on your allies, your blast, a foe's round into an ally, and
  your round. Crits double the raw number BEFORE armour. **Fire is the one exception**, as it is for
  the player (the burn skips Defense on both sides). A test reads App.js and fails on any
  `enemyHP.current[…] = Math.max(0, …)` subtraction that is neither the fire drain nor within three
  lines of an `incomingUnitDamage(` call, so a ninth site cannot quietly skip it.
* Enemy-creator animals have no Defense and no worn effects, so every number they take is unchanged
  (checked in play: the Squirrel took the full 20 off a DK Arms barrel).
* Measured in the running app, DK + DK Arms (20) against Billy (35 HP, 16 Defense): "🎯 Hit Billy for
  8 (27 HP left)", where it used to be 20. With DK Arms, most of his Trailor looks now take 3–6 hits
  instead of 2.
* The attack side was left alone in that commit and asked about. His answer, the same day: "there
  shouldn't be any differences". That is the next section.

**EVERY STAT AND ABILITY WORKS ON A UNIT BY THE PLAYER'S RULE (2026-09-28).** Blake: "Like we have
discussed there shouldn't be any differences. Enemies get all of the stats and abilities of their
dressed Character. I know 9 lives works. Stats should too." The audit, stat by stat and ability by
ability, and what each one does on a unit now:
* **Strength.** `enemyAttackDamage` is the player's math with the unit's numbers. A gun hits for
  its damage flat (`playerRangedDamage`). A melee weapon uses × Str/5 (`playerMeleeDamage`), and
  fists do too. It used to scale guns by Strength as well (Army Bob's M16: 12 against your 6). Throw
  reach and stomps already matched.
* **Intelligence.** Units CRIT: 2%/point, ×2 before armour, the player's `critChance`.
  - Swings, bites and stomps roll in `applyHitTo`.
  - A unit's round carries `critInt` and rolls where it lands: into you, into your ally, or, for a
    friendly unit's round, into a hostile, which used to roll off YOUR Intelligence.
  - Blasts do the same.
  - A crit on you shows "💥 Critical!" in the toast. Reload speed already matched.
* **Speed.** Covered above: a dressed look walks by `playerWalkSpeed`.
* **Agility.** Jump height already matched (`enemyJumpVelocity`). The above-5 "hold Jump for
  height" assist now applies to a unit's hop too, since a dodge-hop is always held;
  `JUMP_HOLD_BOOST_*` are module-level.
* **Defense, Back Guard, Crouch Guard:** `incomingUnitDamage` (the section above).
* **🧎 Crouch Guard needs the unit to DUCK INTO IT (2026-10-07).** Blake: "does the crouch guard
  ability work when an enemy NPC has it? I couldn't tell that they where taking less damage when
  they tried to use it." The maths worked; a hit on the guard almost never happened. A unit crouched
  only to DODGE a HIGH shot (`dodgeMoveFor`), so the shot it ducked for flew over it. The 24-frame duck
  was over before anything else arrived, and nothing made it duck for a swing.
  - Now a wearer with a drawn Crouch pose, on its feet, braces (`ep.crouch`, `CROUCH_HOLD_FRAMES`)
    whenever a round from the other side would strike it at ANY height. It also braces for a swing
    from the other side inside `GUARD_SWING_LOOKOUT_CELLS` (`swingComingAt`): yours, or an opposing
    unit's weapon swing. No Intelligence roll; it is armour, not a reflex.
  - Your attack is read AFTER the units move, so a point-blank swing landed on its first frame, one
    frame before the duck. The brace therefore also reacts to the frame you PRESS fire or Q (not Q
    with a melee weapon, which is the block).
  - The dodge's projectile test is side-aware now: a unit fighting for you watches the hostiles'
    rounds instead of yours, which fly through it.
  - `crouchGuardNote` puts " 🧎" after the number in every hit message whose target's guard took
    part, on both sides. On a heavily armoured look the difference is a point or two: Crocobob's 31
    Defense makes a 10 into 2 and the guard can only take that to the floor of 1.
  - Measured on his Turtle Man (Def 27, Crouch Guard 0.8): DK Arms 7 → "1 🧎"; Bobs Machete
    point-blank 4 → "1 🧎". The control (original code) showed no duck at all, and 7 and 4. With a gun
    he braces under M16 fire and still shoots back from the crouch.
  - Turtle Man wears TWO Crouch Guards (Turtle Shell 0.8, Turtle Mask 0.4); `guardReduceOf` reads
    the first, on both sides. Nobody has asked for them to stack.
* **🏹 Tag Damage:** folded into `enemyAttackDamage` for the weapon's tags.
* **🎯 Long Shot:** × on a unit shot's range (`fireUnitShot`).
* **🟣 Ally Health.** A unit wearing it raises everyone else on ITS side.
  - `sideAllyHp` sums the living wearers per side once a frame.
  - The payment goes through `applyAllyHPBonus` on a channel of its own (`ep.sideHpBonus` /
    `ep.sideHpGranted`), and `unitMaxHP` adds it.
  - The wearer does not buff itself. A dead wearer buffs nobody, so killing the leader trims the
    rest.
  - Your own ally bonus and the recruit/gear-swap settles keep the side share standing.
  - Measured: with Roberta (+15) on the field, every other hostile's HP rose by exactly 15.
* **🍀 Lucky Find.** Every unit hit records `ep.lastHitByFx`: the attacking unit's effects, or null
  for you. It is set by `applyHitTo`, a round's `shooterFx`, a grenade's `throwerFx` and blasts. The
  loot roll adds the killer's charm to yours; yours still counts on every body, as it always did.
* **🦸 Fly.** A unit flies up after a target above it, holds the height of one in the air, and flies in the player's pose (see the FLY section).
* **🪂 Glide.** Gravity × the item's Fall whenever the unit is falling (your glide with Jump held).
  Measured: Super Bob (Fall 0.8) fell at 0.803× Bobette's speed.
* **🛼 Slide.** A unit's feet ease through `horizVel` with the item's Grip. `dxMove` stays the
  intent, and `stepX` is the step it actually takes. The Downhill setting multiplies a ramp pull
  units do not have.
* **⤴️ Double Jump.** Used in the dodge: coming back DOWN into a shot, a unit wearing it takes its
  one extra jump. Height uses `jumpVelocityScale`, the Speed setting its gravity, and it refills on
  landing.
* **Weapon abilities.**
  - BURST FIRE now fires the whole burst (`ep.burstLeft`/`burstT`, `burstShotDue`). Measured:
    Army Bob with the Experimental Rifle fired 3 rounds of 9 per trigger pull; it used to fire one
    round of 12.
  - A foe's round or blast now also STUNS your ally, as yours stun a hostile.
  - Explode, pierce, Ignore Armor and Magazine Size already matched. Tackle, Pierce, Magazine Size
    and Extra Lives already worked on units.
* **Still different, deliberately, and not stats or abilities:**
  - Only the player gets `PLAYER_INVULN_FRAMES` (40 frames of i-frames after a hit). So only the
    first round of a unit's burst lands on you, while all of yours land on it. Asked about
    2026-09-28.
  - The AI's pacing: the reaction wind-up before each attack, and the 20-frame floor between unit
    shots.
  - Units steer in the air.
  - A unit holding a gun always shoots, never punches with it.
  - A Capture throwable is player-only.
  - The cape/jump effect ANIMATIONS do not play on units; the effects themselves do.

**AN ANIMAL HOLDING A GUN: IT FACES LEFT, AND IT HOLDS IT AT A ✋ HOLD POINT** (2026-09-26). A
placement's weapon picker, or a `gearTag` roll (the T1 Squirrels in Trailor Park M7–M9), can hand
ANY enemy a weapon. That began as a bug; Blake is keeping it ("think of like a squirrel holding an
M16 with its tail"). Do not "fix" it by stopping animals from carrying things. Two faults were
underneath his "wrong direction and in a weird place":

* **Direction.** Every weapon is drawn against a BODY (the weapon editor's "Design for body" lists
  bodies only), and a body's Side pose faces RIGHT. Animals face LEFT. The art was attached as drawn
  and the aim drove the arm to `armAimAbs`, which is forward only for right-facing art, so the nose
  pointed at you and the rifle pointed out of its back. Now, whenever `enemyArtFacesRight` is false,
  the held art is mirrored about its grip (`mirrorHeldArt`) and every arm angle is mirrored too
  (`armAimAbsFacing`, `armForwardSign`). Both are identities for right-facing art, so every dressed
  look takes exactly the code path it always did. This covers the living sprite, the grenade in the
  hand, and the corpse.
* **Place.** An armless enemy used to get `enemyAimArm`, an invisible arm in the middle of its
  bounding box (between the Squirrel's back and its tail). The rest pose then hung straight down off
  it and through the floor. Now an Enemy-creator asset can carry `holdPoint[pose] = {x, y}` plus
  `holdAngle` (degrees; default 90, which is level and forward). `unitHoldArm` is the one reader. It
  makes a ZERO-LENGTH arm at the point, so every aim, swing or throw turns the weapon ABOUT the
  grip and never moves the grip. Crouch falls back to Side's point. With no point set and no drawn
  arm, `enemyDefaultHoldPoint` puts it at the mouth (15% in from the leading edge of the art, 45%
  down). An enemy WITH a drawn 💪 arm and no point keeps holding with its arm.
* **Editor:** a ✋ Weapon hold card, shown on Side and Crouch only (the two poses a unit ever holds a
  weapon in). The orange ✋ marker on the canvas IS the control. Dragging it always writes that
  pose's own point; the checkbox clears it. The Preview picker draws a weapon at the point through
  the same `unitHoldArm` + attach the game uses. It lives in editor state and is never saved.
* **Shots leave the barrel** for a unit on a hold point (`enemyHeldMuzzleAt`, via
  `spriteCanvasPointToWorld`). The old spawn at 42% of the box put every Squirrel bullet in the air
  above its head. ~~Everyone else still fires from the chest~~ — no longer: see the next bullet.
* **EVERY unit fires from the gun in its hand (2026-10-06).** Blake: "when non player enemies get
  ranged weapons it seems like the projectile fire from a completely different place". Dressed
  looks and drawn-arm enemies had kept the chest spawn, and the aim pose holds the gun out at arm's
  length, so the round appeared a gun's length behind the barrel. `enemyHeldMuzzleAt` now picks the
  arm the way the render does (✋ hold point, else `flaggedArmOf`, else `enemyAimArm`), turns it the
  way the render's aim branch does (`armAimAbsFacing` + eShotTilt, × `armMirrorTwist`), and uses
  the BODY's weapon fit (`equippedBodyIdFor`) — it used to read the look's own id, which has no fit.
  Only a unit with no arm at all keeps the chest spawn.
* **`heldShotPoint` is the one rule for where a shot leaves a held weapon, player and units.** The
  🔴 muzzle of the FIRE drawing (what is on screen as it fires — `weaponPoseFired`), else Rest's,
  else the far end of the weapon art along the shot (the forward-most piece, at its middle line).
  His library needs all three: the M16's Crouch muzzle is only in Fire, the Grenade Launcher's Fire
  crouch moves the barrel ~40 px, Bobs Bow has no muzzle anywhere, the RPG has none on Bobbett.
* Measured in Playtest (seeded flat level, Army Bob + M16, Bobette + Bobs Bow, Squirrel + M16, all
  Guard). The M16's Fire art has a gold flash (`#c8a23c`) at the barrel, so filter the unit's
  divs by `rgb(200, 162, 60)` to find the DRAWN barrel tip; the bow's wood is `#6b4226`. Fixed:
  Army Bob's rounds start inside the flash's box on both facings, and Bobette's arrows start at the
  bow's front edge. Control (stash): Army Bob at (615,478), the body's middle, flash at (497,453);
  Bobette at 975, 50 px behind the bow. The Squirrel (hold point) is unchanged.
* Measured in Playtest with the old code as a control: facing left, the old gun sat 412–463 px
  against a body at 380–454, i.e. out of the back. With the fix it sits at 361–408, past the nose.
  Facing right, the fix mirrors correctly. Shots started within 10 px of the drawn barrel tip.

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

**...AND THE scaleY FIX ABOVE WAS ONLY HALF RIGHT (2026-09-27). The render now uses `spriteArtPlane`.**
Blake: "sometimes when an animal is holding a weapon the weapon deforms" and "enemies seem to float
when crouched". A `scaleY` on a group laid out in a squashed box is correct only for UPRIGHT pieces:
each piece is squashed in its own frame BEFORE its own `rotate()`, and the stretch happens after, in
the screen's. A piece turned 90° came out with its length at 60% and its thickness at 167% — and every
held gun is turned about 90° (rest poses hang from the hand; an animal holds at `holdAngle` 90). The
measurement above checked the group's scale, not a rotated piece, so it could not see it. Old-code
control in the pane: a ducking Squirrel's M16 broke into stretched, tilted blocks; every piece's
layout box read 1.67× the canvas aspect under a `scaleY(1.6667)`. Now a ducking sprite's art is laid
out on a plane as tall as the art really is (`renderW × renderW·H/W`, the player's `crouchArtPlane`
rule), positioned so the floor canvas-y stays on the floor: aspect 1.00, no stretch, and every point
lands where `spriteCanvasPointToWorld` (the muzzle) already put it — a test pins that equality.

**The float was a second, separate fault:** a ducking unit drew its CROUCH drawing pinned by its SIDE
drawing's feet, and no crouch is drawn with the feet in the same place (BoB 227 vs 260, Bobbett 209 vs
261, Elaphant 223 vs 242). `unitCrouchFrame(ea)` = the crouch pose's own ground line, else the Side
ground moved by the difference in the two drawings' lowest pixels (weapons excluded; each piece at its
DRAWN corners, `pieceDrawnVSpan`, since crouches are mostly bent pieces). Render and `enemyHeldMuzzleAt`
both use it; the HP bar sits the same height above the crouched head as above the standing one.
Measured, 3440-wide view, old → new: Bobette/Roberta/Viatnamese 3/Elaphant floated 22–25 px → now
−1.6/−1.6/−0.8/0.0 px, identical to their standing numbers. Only the crouch pose is re-anchored; a
unit mid-attack-pose while ducking keeps Side's line (that pose is aligned to Side's baseline).

**Corpses (same day).** Blake, with a screenshot: "when she dies [Bobette] her jacket over her arm
deforms". The olive piece jutting out of the body was **Bobs Bat** (same olive as her Army Shirt), held
at its angled REST pose, which on a body turned 90° points down into the dirt. A corpse still holds
its weapon (A CORPSE HOLDS WHAT THE PLACEMENT GAVE IT) — it now holds it LYING DOWN: `layHeldFlat`
turns the held pieces rigidly about the hand until the far end points down the body toward the feet,
for a placement's weapon and a look's baked-in one alike, only when the body lays down (no Death pose).
Separately, a unit killed mid-duck kept its crouch-height box, so its Side pose was squashed into it
(which also bends rotated sleeves): the corpse-gravity branch stands it back up about its feet, and
the corpse render always uses the standing box.

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
* **No helper text on screen.** He has asked for it to be removed more than once ("I often
  tell you to remove excess text and excess descriptions"). On 2026-09-27 he circled the
  multi-select tip and the "Whole group size" paragraph, and a sweep then took out every
  how-to line in the studio: the level editor's "👉 Clicking the canvas right now will
  paint…" row and the Adjust/Move walkthroughs, the dialogue editor's intro, the snap, ground-line
  and folder paragraphs, "(blank = any)"-style placeholder tails, the Value card's "Sells for
  about…" readout, and the control cheat-sheets in play (💣 "hold G to aim…", the talk box's
  "Press 1–3 · Esc…", the shop's "Esc to leave"). What stays: a control's value and unit
  ("2.5 cells", "0.8s"), short ⚠ warnings about something actually wrong, state (what is
  selected, copied, hidden), and **ability descriptions**. He needs those because they show in
  the level. The effect card shows the same `effectBrief` line as the pickup callout, not
  the catalog's long `blurb` (that is now only the ＋ Add button's hover title). Reasoning goes
  in a code comment or a `title` tooltip, never in the DOM.

## Sound (2026-10-08) — the audio system, and why the audio is a file

Blake asked for the game's first audio. There was none at all before this: no `new Audio`, no
AudioContext and no sound files. What shipped:
- a 🔊 Sounds screen (upload wav/mp3/ogg, ▶ preview, rename, a 📂 folder through `groupByCategory`,
  🗑);
- Basic sounds, one per `SOUND_EVENTS` entry: jump, land, punch, hurt, death, pickup, door, menu click;
- per-asset sounds on the weapon, throwable and enemy editors (`ASSET_SOUND_SLOTS`);
- one music track that loops during play, with a 🎵 on/off toggle in the play header.

The engine is `src/audio.js`, which has no React and no storage, because the game's own front end
will play the same data.

**The storage decision, with the numbers measured on 2026-10-08:**
- The online save (`saves/library.json`) was 26.4 MB raw, 1.67 MB gzipped. Every copy downloads it
  whole every time head.json changes, which is every save, at most once a minute. The committed
  library.json was 24.1 MB raw, 1.48 MB gzipped.
- Audio does not compress. The cost of each sound, inline as base64, added to every one of those
  downloads:

  | Inline as base64 | Base64 size | Added to every download |
  |---|---|---|
  | 8 SFX × 40 KB (mp3/ogg) | 0.41 MB | +0.31 MB |
  | 8 SFX × 180 KB (1 s stereo WAV) | 1.83 MB | +1.38 MB |
  | One 3-minute mp3 at 128 kbps | 3.66 MB | +2.76 MB |
  | One 3-minute mp3 at 192 kbps | 5.49 MB | +4.14 MB |

- Inline audio would also have been copied whole into his save folder's History on every rename,
  because History keeps every version of a record.
- So a sound RECORD (~200 B) names a **clip**: `<cyrb53 ×2, 28 hex>.<wav|mp3|ogg>`, the hash of its
  own bytes. A clip is written once, never changes and never merges, and each copy fetches it once.
- Cap: 10 MB per file. No re-encoding, so quality is exactly what he uploaded. A minutes-long WAV is
  refused with "save it as mp3 or ogg".
- Deleting a sound removes the record. The clip stays where it is (it may be shared, and a sweep may
  not have seen the delete yet). Nothing reads an orphan, and the same file uploaded again is found
  already there.

**Where clips live and how they travel:**
- **Browser:** IndexedDB only, key `clip:<name>`, value base64 STRING (a string because
  `tools/read-chrome-leveldb.js` reads strings). Never localStorage: 5 MB in all, and `localRemoved`'s
  synchronous delete list lives there. Never the host store: unknown limits, and audio filling it
  would push records out of it.
- **Dev server:** `asset-data/clips/<name>` with `GET /__clip` (list), `GET /__clip/<name>` and
  `PUT /__clip/<name>`. setupProxy refuses bytes that do not hash to the name.
- **Keeper:** `Saves\clips\<name>` with the same three routes. The sweep reads `clip:` keys out of
  every swept copy's store (`libraryFromStore` → `lib.clips`) and writes the files BEFORE folding the
  records. `reseed` copies `asset-data/clips`. `cloudSync` adds `clips/` to the `saves` branch,
  takes clips from a foreign push first, and folds the clip list into the head hash only once there
  is a clip, so this change alone did not make every copy re-download.
- **Pages:** `publish.js` copies `asset-data/clips` into `build/clips`.
- **A copy that lacks a clip** asks, in order: IndexedDB → `/__clip/<name>` → the 📁 folder →
  `<cloud base>clips/<name>` → `<PUBLIC_URL>/clips/<name>`. Every answer is hashed before it is
  believed (a dev server answers an unknown path with index.html). `clipStore.syncUp` (run by
  `loadSounds`) pushes clips the server or folder lacks, the same job the bulk sync does for records.
- **A StackBlitz upload reaches every copy like this:** its preview origin's IDB → the keeper's sweep
  → `Saves\clips` + `Saves\sounds` → `saves` branch → a fresh copy fetches the clip from
  raw.githubusercontent the first time it plays it.

**Play-loop wiring.** Moments fire where they happen, through `sndMoment(asset, slot, basic, x, y)`
and `sndEvent(basic, x, y)`:
- jumps: 4 player sites, 5 unit sites;
- the player's punch, swing, fire and throw, and a unit's attack, swing, fire and throw;
- weapon hits: `pr.snd` on every projectile, `detonate`, and the melee swing tests;
- thrown landings, doors (the two `p.transitioning` sets), pickups (`showPickup`), and menu clicks
  (a dialogue answer, a shop buy).

**Hurt, death and landing are a per-frame diff, not hooks.** `soundFrame` runs just before
`updateCamera`, because a unit can be hurt from fourteen places:
- **Units** are followed by `uid`, which survives a gate handoff.
- **HP** never written counts as max HP.
- **Hurt** has a 350 ms gap per body, so fire ticks are not a drone.
- **Landing** needs 24 frames in the air: a jump is about 64, a one-cell step about 18.
- **Player death** plays from `playerDefeated` and clears the HP memory, so the respawn's HP is not a
  "hurt".

Hearing: `updateCamera` writes the view rectangle into the engine. A sound inside it plays at full
volume, fading to silence half a view past the edge.

**Noise cap.** At most 3 copies of one sound. **The 4th CUTS the oldest; it is not dropped.** The
first drive used drop-the-newest, and with one clip on everything the kill shot's three gunshots
silenced the death. A machine gun with a 1 s gunshot would have lost 7 shots in 10. The same sound
within 50 ms is merged into one, and there is a 24-voice ceiling. A sound fired before the first
click or key is NOT started: a source started on a suspended context is queued, and they would all go
off at once on unlock. Every play, heard or not, lands in `bobAudio.trace()`
(`window.__bobAudio`).

**Traps hit while building it:**
- `import { x } from "./saveKeeperCore"` in App.js fails the build ("not exported", then "no
  default export"): babel adds helper imports to a CommonJS file in src/, which makes webpack treat it
  as an ES module with no exports. So `clipHash` is duplicated in audio.js, and sound.test.js holds
  the two equal.
- jsdom has no `TextEncoder`. Use `Buffer` in test fakes.
- `indexedDB.deleteDatabase` from the app's own page reports "blocked". Run it from
  `/asset-manifest.json`, which does not boot the app.
- The pane's AudioContext was "running" with no real click, so real `AudioBufferSourceNode.start`
  calls could be counted there. That will not always be true; read `trace().why === "locked"`.

**Verification recipe that worked (2026-10-08):**
1. Fake `window.storage` (get/set/list, no delete) in `public/index.html` behind `?fakehost=1`.
   Upload a WAV generated in the page through the real file input (DataTransfer). Assign it to Jump
   on the board and to the M16's Fire, then 💾 Save the weapon. Play Trailor Park M1 as Army Bob.
   Wrap `AudioBufferSourceNode.prototype.start` to count real starts. Space → a `jump` row and a
   0.3 s start; `j` → `fire` rows with asset `yykzkdg`. Teleport next to the M1 gang, top up HP from
   `__onFrame`, shoot: units' `attack`, `hurt` and `death` rows. A `jump` at x−4000 was not played;
   one just past the edge played at 0.75.
2. Fresh origin 127.0.0.2: the sound, its 📂 folder, every board assignment, the music pick and
   the M16's `sounds.fire` came back, and the clip was fetched from `/__clip` into IDB on first ▶.
3. A test keeper: `BOB_HOME`/`BOB_SAVES` scratch, `BOB_PORT=47099`, `BOB_NO_SWEEP=1`,
   `BOB_NO_UPDATE=1`, `BOB_CLOUD_REMOTE=<local bare repo>`. It seeded the clip, then the records,
   served `/__clip`, and pushed `clips/<name>`, byte-identical, plus library.json to the bare repo.
   That checkout, served from `public/__cloud/` with `localStorage.bobCloudSaves` pointed at it on
   origin 127.0.0.3, and with `asset-data/clips` moved away: `/__clip/<name>` 404 →
   `/__cloud/clips/<name>` → hashed, kept, played.
4. **The sweep, against a real Chromium store:** headless Edge with a throwaway
   `--user-data-dir`, driven over CDP by Node's built-in WebSocket
   (`scratchpad/edge-sweep-test.js`). Upload through the app, close Edge, copy its
   `IndexedDB/http_127.0.0.1_<port>.indexeddb.{leveldb,blob}`, run `readIdbRecords` +
   `libraryFromStore`. A 22 KB clip and a 1.3 MB one (stored as a 1,764,081-byte file under
   `.blob/1/00/`) both came back hashing to their names. The Browser pane keeps no on-disk profile, so
   it cannot be used for this.
5. Delete with the fake host store: the host record became `{"__deleted":1}`, IDB was cleared, and
   `removed.sounds` was set in the file and both local lists. It stayed deleted after a plain reload,
   after the project file was put back with the sound in it and no tombstone, and after localStorage
   and `bobAssetStudio` were wiped with that file still offering it.

**LADDER ARMS FLOATING + CLIMBING UNITS' PANTS (2026-10-08).** Blake: "The players arm on a ladder can go
too much up and down to look like his arms are floating. Enemy NPC pants does not properly line up."
Arms: the ladder pumped every arm piece ±10px vertically (armReach) while it pointed straight up
from the shoulder, so the up stroke lifted the shoulder end 10px clear of the body. Now 6px down and
at most 1.5px up (armReachUp); the top-down walk still pumps symmetrically, its arms hang down.
Pants: a climbing unit is `walking` (a climb step counts), so the render took the WALK branch: a
side-on hip rotation plus addBackLeg, drawn on its Back pose. Rotation from behind only splays the
leg, and a pant twin on the far side counter-rotates against the leg under it. A climbing unit now
gets the player's ladder step (alternate + legLift) and a hanging one keeps its legs as drawn.

**ENEMY STRENGTH SLIDER PINNED AT 10 (2026-10-08).** Blake: "The strength slider in the enemy builder does
not work", on the Crocodile. Measured in play with his library: the Crocodile at Str 10 bit a plain
box for 20, at Str 1 for 2, at Str 2 (moved in the Enemy creator and saved) for 4; Army Bob's 22
Defense took a 20 bite to 6 (20 x 10/32). Everything was wired. But the Crocodile, Lion and Elaphant
are authored AT 10, the slider's max, so dragging it right did nothing: the same UI-only ceiling
Speed had. ENEMY_STRENGTH_STAT_MAX = 20 for type "enemy" only; Str 15 then bit Army Bob for 9.

**THE STRENGTH SLIDER WAS 3PX WIDE; DEFENSE CURVE FLATTENED (2026-10-08).** After 8df43e4 raised the cap,
Blake sent a screenshot: "Str ●10 · bites for 20", a knob with no track. "The slider is broke. I cannot
adjust it." The " · bites for 20" note shared the half-width grid cell with the slider and squeezed the
range input to 3px (Speed/Agility/Int were 58-78px). I had "verified" the slider by setting its value
from script, which works at any width. Now the note is its own line (.statNote), the input has a 56px
floor and the grid is top-aligned; a real mouse drag moved it 10 -> 2 -> 20.

Same day: "defense seems to scale too much now ... no defense feel too weak and high defense feels too
strong." Audit: every hit applies Defense exactly once (16 call sites), and every look's saved Defense
matched its garments in his live store, so nothing was doubled or stale. The curve itself was the issue:
10/(10+D) gave Army Bob (22) 31% and Crocobob (31) 24% of every hit, ~4x a bare character's toughness,
and since 2026-09-28 armoured ENEMIES have it too. DEFENSE_HALF_AT = 20: Army Bob 48%, Crocobob 39%.
Measured in play, his Str 10 Crocodile in Sewer M1: Viatnamese 1 (0) took 20, Army Bob 10 (crit 19),
Crocobob 8 (crit 16; it was 5).

## TRAILOR PARK M14 "CRASH SITE", AND THE SECTION BOX RETIRED (2026-10-09)

Blake handed over his blank M14 ("I have ZERO ideas ... fill and decorate M14 however you think would
be fit and fun"; a zoo is planned for M15). M14 is two lanes that never meet on purpose: W1/E1 run on
the slab (rows 20-21, stand on row 20) and W2/E2 on the street (stand on row 35), 13 rows under it.

**What it became.** Upper lane: the Army's cordon round a flying saucer that came down on the hill —
RESTRICTED AREA signs at both ends, barbed wire, a GATE 3 booth, sandbags, a command tent, crates, two
searchlights crossing over the wreck, a radar trailer and an M35 truck; six Army Bobs (M16 / Bobs Gun,
two throwing grenades) and a Men-in-Black "Agent" by the wreck whose tree (Weather Balloon) ends in a
heal ("*FLASH* You saw a weather balloon") or a fight. The saucer is WALKABLE: hidden Foreground ramps
(hideInPlay) follow its hull from the dirt mound over the dome to the open hatch, where a pedestal
(Gun AND Rare: Experimental Rifle or Bobs Gun) sits, and down the far side. Lower lane: the secret lab
dug into the hill under it — a concrete portal with a hazard stripe (Front), his White Stone brick
walls over a painted lower wall, his Rec Hall Linoleum floor, a Sidewalk-concrete ceiling slab, his
fluorescent tubes; a "U.S. DEPT. OF AGRICULTURE WEATHER RESEARCH STATION — NOTHING TO SEE HERE" sign
outside, the vault door swung open, the guards' break room (his AA-meeting table, urn, doughnuts and
chair; pedestal Odd AND Mask = his Alien Mask), mainframes and a console, specimen tanks (two holding
an alien, two burst — the rats and the crocodile are loose), an autopsy table, a lab bench, and his Zoo
cage holding a Little Green Man whose tree (Phone Home) can free him as an ally. Two Army Bob guards
carry Shock Batons; one escaped alien has the Experimental Rifle. His tree with the squirrel and the
little distant trailer stay; his stump went (he said it could), and his trunk now stops at the road
(its rows 21-23 hung through what is now the lab ceiling).

**New records.** 20 props under category "Crash Site" (ufosacr saucer 30, ufoslit searchlight 20,
ufosand sandbags 6 [solidDefault], ufotrck truck 16, ufotent tent 12, ufosign sign 8, ufowire wire 8
[tiles], uforadr radar 10, ufobth1 booth 10, ufocrat crates 4 [solidDefault], ufotnka / ufotnkb tanks
12, ufocomp mainframe 7, ufocnsl console 6, ufovalt vault door 10, ufoatps autopsy table 8, ufofile
filing cabinet 4, ufobnch lab bench 6, ufowthr weather-station sign 7, ufoauth wall sign 3); Alien Skin
`alnskn1` (a green tone, no hair: his Alien Mask is the head); Dark Shades `drkshd1` (his Bobs Glasses,
lenses black); Silver Pants `slvpnt1` (his Black Pants in his Undershirt's grey). The two looks were
dressed IN DRESS BOB so the app baked them: Agent `c4ft0d4` (Rob Skin, Dark Shades, Suit Jacket, White
Dress Shirt, Black Pants, Army Boots) and Little Green Man `xclq3hs` (Alien Skin, Alien Mask,
Undershirt, Silver Pants). Bare BoB under an alien skin showed the body's own details, which is why
the suit exists. Dialogues `dlgwthr`, `dlgphon`. Every new asset passes editorReachIssues. Fallback
bundle: assets/crash-site-pack.json. Generators stayed in that session's scratchpad (ufo.js, m14.js,
sprof.js for the saucer's walk profile, extras.js, deliver.js).

**Measured in play (his library + these records, a Playtest per lane).** Bobert and Army Bob both walk
W1→E1 over the saucer (feet at row 10 on the dome) and W2→E2 through the lab with D alone. The first
build had the sandbags and the lab crates SOLID: Army Bob (Agility -1, a one-cell jump) topped out
28 px up against the two-cell crates and could never leave the lab. Agility is clamped to 1 for the
jump (0.5 x Agility + 0.5 cells), so everyone at -1..1 jumps exactly one cell — that is now a rule in
CLAUDE.md, and in M14 those props are scenery. A walk that "stopped" at column 41 was the harness:
a grenade blast cleared the held D; re-sending the keydown every few frames fixed the drive.

**The Section box (same message): "We can remove the 'Section' bit in the level creator. We can do
everything we need with matching gates/keys and floor."** Section did three jobs, and each now has
its answer elsewhere. runRole: no open left-hand gate = Intro, no open right-hand gate = Exit, Floor
Sewer/Underground/Tree Top = a side passage, everything else a middle (every street level he had
opened both sides and every sewer was already on Floor "Sewer", so nothing changed role). The load
dialog files rooms by Room tag only (every room carrying a Section had the same word as its tag) and
no longer prints "· Middle" after each level. Both Section inputs are gone; new levels and rooms are
created without the field; an old record's `section` is left on it and ignored.

## FALLING THROUGH M14'S SLAB, AND GOD MODE FOR TEST DRIVES (2026-10-09)

**Blake: "On Trailor park M14 ... there is a bug where normally around the saucer you can just fall
through the map. ... It brings you from the top bit to the bottom bit."** The upper lane is a two-row
slab (rows 20-21) with the lab's air under it; the saucer sits on hidden Foreground ramps (rows 10-19).

**Cause: every flat landing used a FIXED half-cell window.** After the vertical move, the player's
landing (walls, and the hill-top window for ramp-formation cells), a unit's and a corpse's all kept
only solid rows whose top was at most `CH * 0.5` (15 px) above the feet: the guard that stops a body
snapping UP onto a platform it overlaps. A frame that moved the feet more than 15 px put them past the
top row, so that row was refused as "above the feet"; on the next frame the second row was refused
the same way if the feet were more than 15 px into it. On thick ground that is the long-seen "lands a
cell deep" sink (a fresh Playtest landing at y 420 instead of 390 was in the harness notes since
September). On a two-row slab there is nothing after the second row. The step is fall speed × dt, so
it bites on long falls and on slow or hitching frames (dt runs to 3). Jumping off the saucer top is the
longest fall on M14, which is why it showed "around the saucer". The slab cells beside the mound are
also ramp-formation (hill) cells, but that turned out not to matter: plain wall columns 60 and 73 fell
through exactly like column 77.

**Measured in the real loop (Super Bob, M14 from library.json):**
- Old code, released at y 0 with vy 16: columns 60, 73 and 77 landed at y 840 (the street, row 35);
  76, 108 and 109 happened to catch row 20 at 390.
- Old code, six jumps off the saucer top with a 24 ms busy-wait added to every frame (frames slowed
  from the frame driver, fps not measured): 3 sank to 420, a full block into the slab. With 14 ms: 2 of 5.
- Fixed: the same six drops all at 390; a sweep of columns 68-118 at vy 40 with a 30 ms busy-wait
  landed every column on the slab or the mound; five saucer jumps with 14 ms all at 390.

**Fix: `landingReach(vy, dtMul, CH)` = max(half a cell, vy × dt + 2).** Any top the feet crossed this
frame is a floor, the same sweep `slopeSurfaceForPlayer` already uses for ramps. It never reaches
above where the feet started the frame, so the overhead-platform guard is unchanged. Used at all three
landing sites (player, unit, corpse); a test greps that none of them reverted to `CH * 0.5`.

**God mode (same message): "add the ability for you to have an invincible Bob for testing ... i don't
even need a button tbh".** `godModeOn()` reads `window.__bobGod`, `?god` in the address, or
localStorage `bobGod` = "1", at each hit. All five player damage sites (fire, melee, blast, thrown
impact, shot) now go through `playerHpAfterHit`, which leaves HP alone in god mode; hits still land,
flash, stun and knock you about. Verified on M14 beside the Army Bobs: 7 hits (melee 13, shots 4) with
HP held at 25, then god off and the next shots took it 25 → 21 → 17. It replaces the old harness trick
of finding the playerHP ref by hook order and topping it up every frame.

## 👻 TRANSLUCENT ASSETS AND THE 🎯 RANGE ITEM (2026-10-10)

**Blake: "On Bob in the asset creators (Including for items) can you add the ability to make items
translucent, with a scale ideally"**, then **"Also for items can you add one that increases range for
X duration"**.

**Translucency is per ASSET, not per piece.** Every piece already had a ✨ Fade slider (`fx.opacity`),
but that fades each piece on its own, so overlapping pieces show through each other: a dark-edge
piece under a fill reads as a murky band, and an outlined triangle's solid outline silhouette shows
through its own fill. `asset.translucency` (0–0.9, step 0.05; absent = solid, and the slider removes
the key at 0 so old records stay byte-identical) is one value the 👻 Translucent card sets in every
asset editor. `assetAlpha` turns it into an opacity, and `fadeGroup` wraps the drawn asset in one
full-frame box carrying it, so the asset composites first and fades as one picture.

**Two ways a piece list fades (`renderPieceRuns`):**
- `alpha`: the list is ONE asset (a prop via `propArtInner`, an item on a plinth, a drop, a shop row,
  a shot or a throw in flight, the weapon-hold preview). The whole list is one group.
- `alphaOf(runKey)`: the list is a COMPOSED sprite (the player, units, corpses, Dress Bob). Each
  `_src` run fades by its own asset (`spriteAlphaOf(root, held)`), so a glass helmet is see-through on
  a solid Bob. Held art baked live in play has no `_src` (key `"__weapon"`), so it fades by what is in
  the hand; untagged art fades by the root.

**Why a single asset is never faded by `_src`:** `layerBodyAndOverlays` writes `_src` onto the
garment's own piece objects (it mutates what `bake` returns), so that tag gets saved into assets and
travels with copied pieces. On 2026-10-10 his saves branch had 17 garments and 4 skins carrying
pieces tagged with ANOTHER asset's id (the Super Shirt's from shirt jfwt8r4). Faded by run key, half
of such a shirt would come out solid. Composition re-tags with the garment's real id, so `alphaOf` is
right for composed sprites.

The editor canvas wraps each stretch of the asset's own blocks in a group (`own(...)`) between guide
pieces, the way play splits a worn garment into runs. Selection outlines inside fade with it; the
resize handle does not. A test greps every `renderPieceRuns({` call for `alpha:` / `alphaOf:`.
`editorReachIssues` flags an off-stop `translucency`. `tools/rasterize-pieces.js` honours it
(`opts.alpha`, read off the asset by `--asset` and `--level`).

**Verified in the running app** with a seed (Army Jacket 0.4, M16 0.3, its bullet 6ufkkia 0.6, the
One Day at a Time banner 0.5, a range potion 0.5): the editor canvas put all 11 potion blocks in one
0.5 group, and the slider went 0% → 90% by mouse drag (162 px wide). In the Level Creator only the
banner of 19 objects was faded. In Playtest the player's sprite had jacket groups 0.6 ×4 ×4 (4 mirrored
side pieces) and M16 groups 0.7 ×2 (behind-arm) ×13 (17 minus muzzle, cutter and the 2 behind), with
the rest of Bob solid. Both pedestals and the bullet in flight drew at 0.5 / 0.4. On M14 two Army Bob
units matched the player exactly (×30 while firing = the Fire drawing), a corpse kept both groups,
and Dress Bob showed the jacket at 0.6.

**Follow-up, same day: it faded EVERYTHING.** Blake: "When i try to make something translucent it
tries to make everything translucent not just the shape I am editing. That is a bug". I had built
the slider for the whole asset because he said "make items translucent", and the card sat in the
sidebar where the selected block's Fade lives, so reaching for it faded the entire asset. He meant the
shape. Fix (6ce9d29): `piece.translucency` (`pieceAlpha`), a 👻 Translucent slider in the block's own
card, written through `updSelAll` (the selection or its group, never `recolorAll`); Static / Block /
MirrorGhost wrap outline + fill in one `fadeGroup`, with the selection dash kept outside the fade. The
whole-asset card is kept (never remove a feature) but titled "👻 Whole asset". Not the existing ✨
Fade: that fades the fill only, so an outlined poly shows its solid outline silhouette through it, and
1,602 pieces in his saves use Fade, so it is untouched. Verified in the app on ENERGY DRINK (11
blocks): at 60% exactly one fade group, opacity 0.4, covering 1 block; the Whole asset slider stayed
0; back to 0 removed the group. Lesson: when he asks to make "items" translucent in a drawing tool,
ask which level it acts on, or put the control where the thing he is editing is.

**🎯 Range item.** "Range" already meant how far a gun or bow shot flies (weapon Range in blocks, the
🎯 Long Shot clothing ability), so the item is Long Shot's multiplier on a timer:
`{ kind: "range", mult, duration }` (`normItemEffect`; floored at ×1 so it can never SHORTEN shots;
editor slider ×1.25–4 in quarters, Long Shot's scale). Consuming it pushes `{ kind: "range", mult,
until }` onto `itemBuffs` (expiry, doors and fresh playtests behave like a stat boost).
`activeBuffSum` skips it (no `stat`), and `activeRangeMult` multiplies the running ones into
`rangePxNow` with `rangeBoostMultiplier`, so the arc and the aim assist's reach both stretch. Throws
and melee are untouched, like Long Shot. Units do not drink items, so there is nothing for them to
mirror. Verified: E on the pedestal showed "Range ×2 for 30s" (callout and banner); the next M16 shot
had `rangePx` 1620 = 27 × 30 × 2; with the buff cleared the control shot was 810.

## Deleted sounds came back: a full localStorage froze the delete list (2026-10-10)

He reported: "It won't let me delete audio files. They immediately come back."

**What his copy held, read off the disk.** I read his StackBlitz copy
(`hzer--3000--2ed8f36d`) out of Chrome's profile with `tools/read-chrome-leveldb.js`, read-only, on
a copy of the folder.
- **localStorage** for that origin held about 5.24 M characters, at the 5 MB cap. Every one of his
  copies is there, because `sset` mirrors every record into localStorage.
- **Its `removedIndex`**, in localStorage AND in IndexedDB, listed 28 assets and 4 levels and **no
  sounds**.
- **Yet the keeper's log** had swept two sound deletes out of that same store one and two minutes
  earlier ("1 deleted" at 10:42 and 10:43).
- **`sound:x5jnxpb`**, deleted and already on the online save's `removed.sounds`, was back in the
  copy's store and its index.

**The mechanism.**
- `localRemoved.add` and `revive` read the list from localStorage, changed it, and then:
  - `write` back to localStorage, which fails when full, so the copy is frozen;
  - `push` the WHOLE list to the durable copy (`sset` → IndexedDB).
- With localStorage full, every change pushed "the frozen list + one id" over the durable list. That
  erased every delete made since the cap was reached. Any later add did it: a loader filing the
  project file's deletes (`tombstoneSet`), or another delete.
- The next load's restore loop then found the sound unlisted. The online save, or a rebuilt
  container's project file, still offered the record, so it came back.
- This is not sound-specific. Any kind's delete could be lost this way, though assets were usually
  held out by the dev server's `removed` list.

**The fix (App.js `localRemoved`). It removes no tier, and a writable localStorage behaves exactly
as before:**
- **`persist(change)`:** the durable copy is changed by a queued read-modify-write. An add unions
  its own ids onto what IndexedDB holds; a revive filters its own ids out. `hydrate` waits for the
  queue. No whole list from elsewhere is ever written over it again.
- **`removedMem`:** when a localStorage write fails, the page keeps the list in memory and reads
  that instead of the frozen copy. A later successful write clears it.
- **revive** now also takes the id off the durable copy when this page's list does not name it.
  Before, a re-created record could be purged again by hydrate's union.

**Verified.**
- **Unit test** (App.test.js, "the browser's own tombstone list"): his sequence with `setItem`
  throwing, which is a frozen list, a sound delete, another add, then hydrate. **Control: the same
  test on the old code loses the sound (`Received: undefined`).**
- **In the app** on a fresh origin, with every localStorage write throwing (`?lsfull=1` rig in
  `public/index.html`, not committed; the pane itself has no 5 MB cap, as it took 20 MB):
  1. Delete two uploads.
  2. Put back a project file offering both, with no tombstones.
  3. Reload, delete a third sound, and reload again.
  4. All three stayed deleted, and IndexedDB's `removedIndex.sounds` held all three.

**Left for him.** Sounds already resurrected in his copy before this fix (`x5jnxpb`) have no local
tombstone. An online tombstone blocks restores but never purges a copy that holds the record, by
design (see `mergeCloudLibrary`). He deletes them once more, and that delete now sticks.

## Sounds a fraction of a second late, the two-column Sounds screen, weapon and dialogue sounds (2026-10-10)

He asked: "all of the audio I have plays a fraction of a second too late … I have tried my best to
trim the beginning in Audacity", plus a Sounds screen rework (library on the right, folded folders
starting closed, a Weapons box under it, and a Dialogue card under Music that loops a sound while
someone talks: "a cat might meow but most people I will add a Gibberish noises type thing").

**Where the lateness was.** The play loop was never late: every sound fires on the frame its thing
happens (jump, swing, shot). Measured in the app (a probe on `AudioBufferSourceNode.start`), the jump
sound started 11 ms after the keydown and the bow 10 ms, which is one frame. The rest was:
- **Quiet at the head of his files**, decoded with OfflineAudioContext and scanned. Time until the
  clip first rises above -40 dB / 2% of its own peak: Jump (zapsplat whoosh) 50-55 ms, Landing Edit
  14-16 ms, Arrow Edit 0 ms (his Audacity trim worked on that one). A run of near-silence that quiet
  is invisible in Audacity's waveform.
- **The output itself**: `baseLatency` 10 ms + `outputLatency` 40 ms on this PC (44.1 kHz). The
  "interactive" hint is already the smallest; "balanced" and 0 measured the same, "playback" worse.
  Nothing in a page can go under that.
- **Bluetooth headphones** would add roughly 150-250 ms that no game can remove. Not checked; worth
  asking if he still hears it late.

**The fix.**
- `leadingSilence(channels, sampleRate)` (audio.js): the first sample louder than max(-50 dB,
  2% of the clip's peak), less 3 ms of pre-roll. Measured once per clip at decode (`starts`), and
  every buffer play does `src.start(0, skip)` with a 3 ms gain ramp so the cut never clicks. The
  file is not touched. On his clips: Jump skips 52 ms, Landing 13 ms, Arrow 0.
- `syncAwake`: while `setPlaying(true)`, a ConstantSourceNode at 1e-6 feeds `ctx.destination`
  directly. Chrome's silent-sink suspender parks a Web Audio output after ~30 s of exact zeros, and
  the first sound after that waits for the output to reopen. This is a precaution: the hidden pane
  showed no change in `outputLatency` or `getOutputTimestamp` over 88 s of silence, so the parking
  could not be measured here. Only during play, because an open audio stream also blocks Windows
  sleep.

**The Sounds screen.** Two grid columns (the left and right halves of the window, stacking under
900 px): Basic sounds, Music, Dialogue | Library, Weapons. Folders fold (`soundOpen`, keys
`lib:<folder>` / `wpn:<kind>`), all closed on every visit. An upload opens the folder it went into,
and so does refiling a sound, or the row seems to vanish. Weapons are grouped by kind (Ranged, Melee,
Throwable) because the kind decides the slots (`assetSoundSlots`).

**Saving picks made on that screen.** `saveWeaponSound` and `saveDialogueSound` read the STORED
record, change only `sounds` / `sound` plus `savedAt`, write it, `projectLibrary.save(..., { revive:
true })`, and patch the in-memory lists. A weapon open in the asset editor (`setAsset`) and a tree
open in the 💬 editor (`setDlgDoc` and `dlgBaseline`) take the same change. Without that the
editor's next 💾 Save would write the old sound back, and the dialogue editor would show "unsaved"
for a change it never made. Verified on his real library in the dev copy: Bobs Gun's record after
the pick differed from his saved weapon in `sounds` and `savedAt` only, and both picks survived a
reload. The weapon editor's 🔊 card showed the same pick. Saving the troll from the Dialogue editor
kept its sound, including after the sound was changed on the Sounds screen while the tree was open.

**Talking.** `dlg.sound`, carried by `migrateDialogue` only when set. Every load goes through it, so
without the pass-through the assignment would vanish on the next load. Lines appear whole (no
typing-out), so "while they are talking" is `talkSeconds(text)`: 18 characters a second, between
0.6 s and 10 s. `engine.talk(id, secs)` loops the clip from its trimmed start, and its end and an
80 ms fade are scheduled on the audio clock. `talk(null)` fades out in 40 ms. `talkSoundFor` is
called in openTalk, in the answer's commit (next line), and in closeTalk, which every exit goes
through. `setPlaying(false)` also stops it. No default sound: a dialogue nobody gave a sound to
stays silent, because "Don't add anything I didn't list" still stands. Verified in Playtest on
Trailor Park M5's Bridge Troll: the 31-character first line looped from 0.0522 s with its stop at
+1.722 s; answering started the 112-character line with its stop at +6.222 s; Esc stopped it 50 ms
later. The audio context was muted with a `destination` override in the page so nothing played out
of his speakers.

**Harness notes.** The keeper sweeps only Chrome/Edge profiles for StackBlitz and Pages origins
(`GAME_ORIGIN` in tools/bob-okay.js), so test edits made in the pane's dev copy never reach his
saves. In this pane, a CSS rule's width was beaten by a later `.sndEvt` rule of the same
specificity, so read the rendered width, not the stylesheet.

## The Enemies box on the Sounds screen (2026-10-10)

Blake: "add the non player enemy audio boxes to the audio tab so i can more easily assign and organize it? Put it on the right side". The right column is now Library, Weapons, Enemies. The box lists every Enemy-creator enemy A to Z under one `👹 Enemies` fold (key `enm`, shut on every visit like the others), each row the same Attack / Hurt / Death the enemy editor's 🔊 card shows. Dressed looks are not in it: `assetSoundSlots` gives a look no slots, so a look unit falls back to the basic sounds. Enemies have no 📂 folder of their own (no editor field), so there is one fold, named as the 👹 Enemy picker names them.

`saveWeaponSound` became `saveAssetSound`: nothing in it was weapon-specific, and a weapon row and an enemy row are now one `assetSoundRow`. Verified in the dev copy at 1600 px: 13 rows, Chap Cat Hurt set from the box, and the folder record differed from the committed one in `sounds` and `savedAt` only. After a reload the box still showed it, and Chap Cat's editor 🔊 card showed the same pick. At a 778 px column the Death slot wraps under the name; on his ~3,084 px view a row is one line.

## Swing vs contact, and a volume slider per sound (2026-10-11)

Blake: "there should be a general swing Audio, and if the weapons have a swing audio that should over write. And there needs to be a volume slider in AUDIO so I can adjust that. And the punch and weapon Audio (Not swing) should only fire when the weapon or punch makes contact with something".

Before: a stroke STARTING played the Punch (a melee weapon's empty Swing fell back to it, a bare fist and an enemy's Attack fired it on commit), so every swing at thin air sounded like a hit. Now `swing` is a basic sound of its own (`SOUND_EVENTS`, between Land and Punch), a melee weapon's Swing falls back to it, and its Hit falls back to Punch. Contact sites: the player's hit loop (a body struck or a shot parried, once a frame), `clashApart` (two blows meeting), a unit's weapon-arc test, and a unit's instant bite/punch when `applyAttackHit` returns true (i-frames return false: silent). A blow turned aside by your guard counts as contact now; before, it was silent. An enemy's Attack is its blow landing, so it moved to contact too; its lunge plays the basic Swing.

Volume is per sound (`vol` on the record, 0 to 200%, absent = 100%), because one slider then sets that clip everywhere it plays: basic, weapon/enemy slot, talk loop, music. It sits on each Library row, uncontrolled, and saves on release. Re-rendering the studio per drag tick just to move a label was the reason. Music is an `<audio>` element, so it stops at 100%.

Verified in the dev copy on Trailor Park M2 with fake clips (the trace records the chosen id even when the file is missing). Bare-handed: air swing on fire and on Q showed Swing only. Swinging into a Pit Bull showed Swing then Punch (player body). A Pit Bull biting showed Swing then Punch (its id) on each bite. Bobs Bat: air showed Swing only, and the hit showed Swing then Hit→Punch, with the toast "Hit Chasing Pit Bull for 8". The slider saved `vol: 0.4`, and its label and toast followed. Nothing was audible (no speakers).

## Furr Con Sign: the invisible ceiling, and ▲/▼ ordering (2026-10-10)

Blake: his Furr Con Sign would not go at the top of a room, "a massive invisible wall", and he wanted a way to put the sign behind chairs on the same layer. The sign's board is a 53x171 rect twisted -90°. Stored, it spans y -60..110; drawn, about -1..52. `worldArtBox` measures stored boxes, so a third of the footprint was empty space above the board. A placement's top-left cell is clamped to row 0, so that strip hit the ceiling first. Measured on his folder: a turned measure changes 16 props, and Sprinkler (40 placements), Bush, Bear Skin Rug and Church Pew are placed, so the turned box is opt-in per placement (`turnedBox`, set by fresh placement and by a Select/Copy drop, which re-centres on the click anyway). The scale stays on the unturned measure, so a new placement at size N renders at the same px per design unit as an old one at size N. Verified in the dev server: old sign 360x284 px box with art starting 98 px down; after a Select re-drop it was 284x211 at the same scale, art 7 px from the ceiling.

The ordering existed (⤒ Front / ⤓ Back) but ⤓ Back also demotes the layer (orderEndLay) and goes behind everything. ▲/▼ step past the nearest same-layer object whose art rect overlaps, skipping non-overlapping ones, and renumber every z 0..n-1 so tied z values from pasted copies cannot undo the step.

## Strength base, stomp 45, Defense 35, and the ⚔️ melee clash (2026-10-10)

Blake asked for three things in one message: "some type of small added base str so str 0 characters
do not feel so worthless, IE stomp is supposed to feel powerful but it can feel weak on a low str
character. Make sure the balance makes sense. Likely increase stomp damage." Then "The armor curve
needs to be a little weaker. High armor character are a tad too bullet spongy. IE the football
players." And: "If you are holding a ranged weapon and you meelee attack at the same time as the
enemy your attacks will bounce off each other pushing both you and the enemy back a little away
from each other".

**Strength.** Muscle was Str/5 all the way down, so Str 1 kept a fifth and Str 0 floored every
swing and stomp at 1. Read off his saves branch: skins are Str 1-3 and most looks sit at 1-4 (Ash
0; Readitor, Ratman, Little Green Man 1; Chaplin, Bobette, Nixon, the Viatnamese 2). Str 5 was
above most of the roster, so "5 neutral" undersold how much the low end hurt. `effectiveStrength`
keeps the stat from 5 up (nothing at Str 5+ changed: Army Bob, Crocobob and the football players
hit exactly as before) and gives 2.5 + Str/2 below it: 0 = 0.5x, 1 = 0.6x, 2 = 0.7x. Bobs Machete
at Str 2 went 5 -> 8, at Str 0 1 -> 6. The damage functions multiply by the effective Strength and
divide by 5 LAST: `45 * 0.7` is 31.4999… and rounded a Str-2 stomp to 31; `45 * 3.5 / 5` is 31.5.
Creature bites (2x Strength) and throw range (already a 7-block base) are not on the curve.

**Stomp.** Stompable creatures in his library (Side art x scale <= 104): Rat 15 HP, Squirrel 25,
Pika-Squirrel 30, Chap Cat 30, Turtle 60, Crocodile 100 (53 tall x 1.6). At 30 a Str-2 stomp did
12. 45 with the base: Str 0 = 23 (Rat), Str 1 = 27 (Squirrel), Str 2 = 32 (Pika, Chap Cat), Str 5
= 45, Str 10 = 90. 50 would have let Army Bob one-stomp the Crocodile; 45 keeps the Turtle and the
Crocodile at two. Measured in play as Readitor (Str 1): "🦶 Stomped Squirrel for 27" (the Squirrel's
HP raised to 100 so the toast survived; at 25 HP its loot toast replaced the stomp toast in the
same frame).

**Defense 20 -> 35.** Blue Football 17 and Footbob 19 Defense on a 25 HP pool. The curve alone
misleads here because every hit is rounded: the 7-damage M16 and Experimental Rifle land 4 on them
until the multiplier reaches 0.643, then 5, and 25 HP takes 7 rounds at 4 but 5 at 5 (there is no
6). For Footbob that needs DEFENSE_HALF_AT >= 34.2. At 30 the M16 and Bobs Gun were both unchanged
on them, and those are most of his guns. At 35: M16 7 -> 5 rounds, Bow 5 -> 4, Bat (Str 5) 7 -> 5
swings, Bobs Gun stays 5 (6 a hit, was 5); Army Bob and Crocobob take 7 M16 rounds, was 9; DK's 5
Defense takes 88% (was 80%). Measured in play: "🎯 Hit Footbob for 5", and Footbob's Str-6 bat hit
Readitor (4 Def) for 9, the Pit Bull's bite for 14.

**The clash.** The pistol-whip is `p.firing.unarmed` with a ranged weapon in hand. A unit's melee
is either a weapon-hitbox swing (`ep.swingT` with the `ep.swingHit` map, hits land mid-sweep) or an
instant bite/punch on the commit frame. Two hooks, one rule (`meleeClash`: each has the other in
front, the block's own front test): in `applyHitTo` (a unit blow reaching you while your whip is
live and has not struck it) and in your melee hit loop (your whip reaching a unit whose blow is in
the air, `unitBlowLive`). `clashApart` shoves both through the tail swing's `knock` channel (walls
stop it, a unit is frozen while it slides), cuts the unit's swing like a block, spends your stroke,
and gives the unit a full attack cooldown. The helpers sit at loop level because both blocks call
them (the parry crash).

First drive found the gap the wind-up window closes: point blank, the fist box overlaps the dog on
the whip's FIRST frame, so a whip thrown as the Pit Bull lunged always landed one frame before the
bite and the two traded ("👊 Hit for 1", then "hit you for 14"). That is the same instant to a hand
on a keyboard. `CLASH_WINDUP_FRAMES` (6) counts the last 0.1 s of a melee unit's wind-up (`reactT`,
`ep.meleeNext`) as thrown. After it: 4 of 4 timed drives on the dog clashed, Footbob's bat clashed
both ways round (whip first and bat first), and a whip thrown 13 frames before the bite still hit
and the bite still landed.

**Harness traps.** Two presses did not start a whip at all: the player was still 💫 dazed by
Footbob's stun bat because I froze Footbob in the same call that armed the trigger. Freeze the other
units and let any stun run out before timing a press. A per-frame trigger in the page script (press
Q when `ep.reactT < lead`, or the frame `ep.swingT` jumps to 14) is what made the timing exact;
`?god` keeps you alive, and `p.invuln` going to 40 is the tell that a blow landed.

## FALLING THROUGH M15'S MANHOLE WALL (2026-10-10)

**Blake: "On Trailor park M15 I still fall through the map. You tried to fix that in the past but
it's still not fixed."** M15 (`h5nuldp`, his zoo level, saved 10-09) has one hole: a 6-wide sewer shaft
at cols 45-50 (S1 accepts Sewer, a ladder at cols 47-48) with grey ramps at both lips (rows 33-35,
cols 40-55), hidden fill at cols 43 and 52 and empty slits at cols 42 and 53 under the street.

**Not M14's bug.** `landingReach` held: drop sweeps of all 160 columns (y 0, vy 16, at 60 fps and on
a 165 Hz fake clock) and walks/jumps end to end landed everywhere they should. Only the shaft lets you
down, which is by design.

**Cause: hill formation is neither wall nor floor for a body over a hole.** The ramps at the lips make
the shaft's walls ramp formation (`isHillFormationCell`) all the way down. `splitHillHits` stops hill
cells within 2.5 cells above the feet from being walls, so a wide hitbox's edge can poke into a ramp's
backing while its centre walks the surface. The flat landing accepts hill only under the body's
CENTRE. Over the shaft the centre is over air, so a sideways move walked the body into the wall and
nothing under its centre ever held it. Measured as Super Bob: climb the ladder to y 878, hold D, and
the body went x 1408 → 1525 (inside cols 51-53) and fell to y 1170, the bottom of the map. A 3-4
px/frame drift off the left lip did the same. The left wall is mostly saved by the overhang wedge at
33,45, which stops the head.

**Fix: `sideWalls(splitHillHits(...), groundUnderFeet(...))`, `sideWallsW` in the loop.** Hill stands
aside only when the body's centre column has a solid cell or a ramp between the feet and
`HILL_GROUND_REACH` (2.5) cells below them, or the body is on a 🚶 top-down plane. Used by the player's
sideways move, the player's flat-landing fallback, and a unit's sideways move. A unit's landing never
split hill out, so it already held on a lip. The first pass fixed only the sideways move. A 4-5
px/frame drift was then stepped up onto the right lip by the step-assist, refused as a floor there
(non-centre hill), and sank into it anyway. That is why the landing half exists.

**After:** all 36 ladder step-offs (heights 800-1140, both sides) end in the shaft or on the street,
never in rock. The vx 1-10 drift sweep ends in the shaft or standing on the lip. Walking over the
manhole both ways matches the old trace, and Sewer M3's waterfall still drops you into the room
(y 720). One deliberate change: a body overlapping a ramp-topped lip by part of its width now stands
on it, as on every other ledge (drops at cols 46, 50 and 51 land on the lip, not in the shaft).

**Harness notes.** A fake `performance.now` advanced one frame per game frame, running 4-8 game
frames per MessageChannel tick, sped drives up about 4x and made them deterministic. Capture the real
`performance.now` BEFORE patching it: a second shim that bound the patched one gated its ticks on a
frozen clock and deadlocked. The hidden pane barely runs between tool calls, so keep calls going
(~1.9 s each) while a sweep runs.

## FALLING UNDER M14'S SAUCER, FOR REAL THIS TIME (2026-10-10)

**Blake, after the M15 fix: "Wait it's M14 that's bugged. I didn't know of a M15 bug I misspoke ...
M14 beside the UFO is the bugged level where you fall under."** The M15 fix stays (the manhole bug was
real). The 10-09 `landingReach` fix was real too, but it was one instance. M14's saucer (`ufosacr`)
stands on a HIDDEN ramp mound I built in 9848c72 (cols 78-107, rows 10-19) on the two-row slab
(rows 20-21) over the lab. The whole slab under and beside it is hill formation.

**Two ways in, one way through.**
- **Walking into the right side.** That side's lowest ramp is at row 18 over a solid lip at (19,107),
  one cell above the slab, while the left side ramps all the way down. Hill near the feet stands aside
  for a walker, so the lip was no stair: the body walked into it, its centre reached col 107 with the
  ramp surface 34 px above the feet (`slopeSurfaceForPlayer` snaps up 31 px at most), and nothing
  lifted it. Control on 16927fc: walking left from x 3400, the body entered at 3215 and fell, y 390 →
  520 and on into the lab. Probably what he kept hitting.
- **A running jump from either foot.** Rising bodies are never snapped onto ramps (vy < 0), the
  mound's cells near the feet were "hill", and there was ground under the centre (the mound), so the
  M15 rule let it in. At the apex the feet were 40 px inside the mound (x 2264 → 2514, y 310, then
  straight down to y 840, the street). 3 of 16 take-off cells on the left foot, 4 of 15 on the right.
- **Through:** the centre-column hill window was measured from the TOPMOST hill cell in that column.
  For a body inside the mound that top is above the feet, so every row under the feet was refused,
  the slab included.

**Fix.**
- `hillStandsAside`: hill stands aside for a sideways move only for a body on its feet (`grounded`;
  units `onGround || climbing`) with ground under its centre, or on a top-down plane. In the air it is
  a wall; the step-assist still lifts a jump over one cell.
- `centreHillLanding`: a body inside the hill that is on its feet with the top at most a cell up
  steps onto it (eased with `stepEase`, if its head has room), so the right side is now walked up.
  Anything else lands on the row its feet crossed, so nothing falls through.

**After (same harness, Super Bob, his M14):**
- Walking left over the whole saucer climbs the right side and comes down the left.
- All 36 running jumps (cols 64-80 right, 106-124 left) land on the saucer or the slab.
- A drop sweep of cols 56-129 with every fourth frame at dt 3 is clean.
- Bodies started inside the mound settle 10 px and climb out.
- M15's ladder step-offs and manhole walk are unchanged, Sewer M3's waterfall still drops into the
  room, and Forest M1's boulder at x 1075 blocks Super Bob on the old code too (it is 6 cells, his
  jump about 3), so it is not a regression.
- Units keep their landing (it never split hill out); only their sideways move got the on-feet rule.

## DELETED THINGS CAME BACK: the keeper's guessed merge base (2026-10-10)

Blake: on Sewer M1 and M2 he deleted Front blocks (a pillar), reloaded, and they were back, while a
curve he painted where a block used to be was kept. Then the same with an Elaphant he deleted.

**Cause.** The keeper's sweep merges two copies' edits three-way (`merge3`). With no record of what
an edit started from, `decideSweep` guessed the base: the copy's own last save, else the committed
file. But every copy loads the online save, so the copy had really started from the folder's
current version. The guess was older and lacked the pillar; the folder had it ("ours changed"), his
save lacked it ("theirs unchanged" vs the guess), so the merge kept it. His second deletion was then
filed as "keep" and changed nothing. Additions survive this; deletions do not, which is exactly
what he saw.

**What it hit (scan of every `combined` version in History vs the save that triggered it):** Sewer
M1 front col 44 (26 cells, three times), Sewer M2 front col 108 (26 cells), Trailor Park M9 enemy
34,147 (the Elaphant, twice), Trailor Park M13 fx 13,42 + 12,39 (Farm corn, 10-04; that save kept
19 of the other copy's 21 objects, so he saw them and deleted two). Every asset combine equalled
his newest save. Repaired by POSTing just those four levels to the keeper (`assets: []` keeps the
assets), each equal to his own newest save, with savedAt newer than everything.

**Fix.** `stampSave(rec, from)` stamps `editedFrom = from.savedAt` on level, asset, texture,
dialogue and sound saves (a fork to a new id carries none; saveAsset now also updates the editor's
savedAt so the NEXT save names this one). `decideSweep` takes the save outright when `editedFrom`
is the folder's current savedAt, merges against that exact History version (`baseAt`, any source)
when it is older, and only falls back to the guess for saves made by older code. `merge3` never
copies `editedFrom` into a combined record.

## THE LEVEL ABOVE A SEWER IS ALWAYS DRAWN (2026-10-11)

**Blake, with a screenshot of a black band over the sewer under the trailers: "I believe this is
because where i am playing there is a level spawned and in the black there is not ... going to the next
level the camera lowers as there is nothing above. I don't like that lowering behavior. Id prefer it
stay smooth."** He offered two fixes: repeat the top rows of terrain up into the dead zone, or load the
level above, "since there will always be levels above. That may be easier and better." Both shipped:
the real level wherever it can be placed, his top-row idea where it cannot.

**Cause.** Only levels joined to the live one by a GATE were drawn (`runSeams`), and `cameraTarget`
clamps to what is drawn. Sewer M1 joins the street through its Top Left, so the street over it was
drawn and a view risen on a jump (~40 px at his 3,084×871 view) showed it. Sewer M3/M4 are tunnels with
no top gate, so the same street over them was not drawn: black above, and at the gate into the tunnel
the clamp dropped from -37 to 0 and the camera sank (measured on the old build, seed 10, his levels).

**Fix.**
- `runSceneryNodes`: every run node in the 3×3 grid slots around the live one that no gate joins is
  drawn whole (tiles + objects), placed by walking the joined seams. Not simulated; its units are not
  drawn (a frozen unit is worse than none) and wake when their level is joined, as always.
- `runPlacements`: in a STAGGERED passage (M5's Bottom Right onto Sewer M1's Top Left, 40% along; the
  way back up lands 80% off the street) the world is not one flat map, and a street level sits in two
  places depending on which way round the loop you walk. A level two routes disagree about is NOT
  drawn, so nothing ever leaps sideways at a gate. Over 400 seeds of his levels: 0 of 8,508 levels
  drawn from both sides of a gate sat in two places.
- `runFillAbove`: what is still uncovered over a sewer gets the sewer's own top row repeated up a
  level's height, a pseudo node drawn through the run tile cache. His sewers' top rows and his streets'
  bottom rows are the same olive ground (`qnfjme1`), so it reads as the street's ground. Decided from
  the sewer's own view, so it moves with the sewer.
- `runCameraParts`: under the street the view may always rise a level's height. Levels above or below
  (scenery, the fill, and top/bottom seams too) count for the up/down clamp only (`yOnly`). The
  top/bottom seam part fixed an older bug found on the way: in seed 20, the street over the last sewer
  (Sewer M2) hangs 1,920 px past its end, and a jump let the view slide off the end of the sewer into
  nothing (camera x 3,229 in a 4,800 level, 3,084 view; now held at 1,716).

**Measured on his levels (400 seeds):** sewers with a level fully over them 532 → 803 of 1,108, and
1,108 of 1,108 with the fill. **In the app** (prod builds, perfserve, view 3,084×891): seed 10 (flat,
M6/Sewer M1 then M3/Sewer M4) holds the camera at -40 through the gate and across M4 with six levels
drawn on the grid; the old build sinks -37 → 0 with three. Seed 20 (staggered) holds -37 into Sewer M3
with fills. Handoffs moved no wrapper (MutationObserver: 1 removed, 2 added, 0 moved). Seeds in a fresh
copy follow his saves branch's level order, so his own seed numbers reproduce there.

## THE FILL PAINTED OVER THE STADIUM, 8 LEVELS A FLOOR, AND THE START GATE (2026-10-11, later)

**Blake, screenshot on Trailor Park M5 with olive ground over the next level's sky and its stone tower
on top: "It looks like you've created a new bug when walking over that level with the football stadium.
I wonder if the issue is that the prop extends past the level?"** It was not the prop. The sewer fill
(previous entry) was worked out from each SEWER's view. M5's Bottom Right drops onto Sewer M1's Top
Left, 40% along, so M5 only covers Sewer M1's left 60%; from the sewer's view the next street level is
ambiguous (two routes, two places) and so "uncovered", and the fill went into its right 40%. From M5's
view that band is exactly where Trailor Park M3 is drawn as M5's east neighbour. Its fg cells (z 2000)
covered M3's sky (bg, z 1000) and M3's props drew on top. Offline over 300 seeds of his levels: 486
fill cells inside drawn levels; in the app (old build, seed 65): a 46-cell wrapper at x 6720 overlapping
M5 and M3 (1,920 px of M3). **Fix:** `runFills(run, live)` works the fill out from the LIVE level's view,
cell by cell, only where no level drawn from there is. Same content from two views is the same pseudo
node (`run.fillPool`), and a fill mounts whole, not a slice a frame. After: 0 fill cells inside a drawn
level and 0 of 894 sewers with a gap (300 seeds); seed 13 in the app draws M3 whole next to M5.

**"It is supposed to be 8 levels total per floor."** `RUN_MIDDLE_LEVELS` (8) was middles only, so with
his new Trailor Park S1 (start) and E1 (end) a run was 10. Now `RUN_LEVELS_PER_FLOOR` = 8 street levels
in all; buildRun takes 8 minus the ends the pool has. 300 of 300 seeds: 8 long, S1 first, E1 last.

**"Spawning the player on the far right of the starting level instead of the left near the closed
gates."** A run's first level is entered with `{ gate: true }`, and `preferredOpenGate` picks the
first OPEN gate: on S1 (only Lower Right open) that is the way out. `spawnGateFor`: an Intro-role level
puts you at its Lower Left gate (closed, so only the arrival point moves). Sewers and every other level
keep the open-gate rule (Sewer M1 still enters at its top). In the app: x 0 on S1, on the ground.

**The keeper was dead again** (no node on 47017/47018, last log 2026-10-10 22:32). His S1/E1 and an M3
edit were only in the StackBlitz store `hzer--3000--2ed8f36d`. Starting the Startup .cmd hidden swept 9
newer records and updated the online save in ten seconds.

## OWNED SHOP ROWS, THE "SHIRTLESS" NPC, GROUND UNDER EVERY STREET, NO REPEATS, THE RATS AND THE IDLE-UNIT REDRAW (2026-10-11, evening)

**"If you already have an object the shop is selling the shop shouldn't be selling that."** The shelf
is still rolled once per stall per run (`rollShopStock`); what is SHOWN now goes through `shopUnowned`:
the gun or melee weapon in your hands, a throwable only while you carry a full ×3 (buying it again
refills to 3, so with one left it is a real purchase), and any worn garment id (`wornEquipMap`, so the
look's own clothes count). Consumables always show. A shelf of three shows two while you hold the
third, and the row comes back if you trade that item away.

**"This NPC spawned without a shirt … they have a black shirt such as Hardy shirt and their skin layer
is just higher" (Trailor Park M2).** Not a bug, and nothing changed. The placement is a 🎲 Trailor tag
with two T1 gear rolls. It rolled Bobbi (brown skin, tone #5f4935, wearing the Hardy Shirt), plus the
Hipster Hat and the Hipster Jacket. The jacket's torso piece is #aa7d55 at bright 0.55 = #5d452f,
almost exactly her skin, and it is outlined, so on screen it reads as a bare outlined torso. The
compositor was checked anyway: every Trailor look × every T1 garment through `liveEnemyAsset` in the
app, and no combination drops or re-orders the look's own top. Same lesson as the bat that "deformed
the jacket": render HIS placement and match colours before calling it a layering bug.

**"Janky camera movement and then a blank area when I went from a level with no sewer to a level with
a sewer under it"** (Trailor Park M1 → M15, the trailer and fence on the left of his screenshot).
`runCameraParts` let the view below a street level only where a sewer was drawn under it. On M1 the
clamp held the view at M1's bottom (at his 871-913 px tall view, 22-60 px above where centring would
put it); once a sewer under M15 came into the clamp the view eased down that far, and under M1 nothing
was drawn: black. **Fix:** `runFills` also repeats every street level's bottom row `RUN_FILL_BELOW_ROWS`
(24) rows down wherever no drawn level covers it, and `runCameraParts` always adds a `below:` yOnly
part of that depth for a street level. So the vertical clamp is the same on every street level and
the view simply centres you. Measured on seed 328533 at a 3083×913 view: camera y 489 on M1 and on M15
through the gate (it would have been held at 467 on M1), and the screenshot shows grass under M1.

**"Make sure it doesn't generate the same level twice on a seed."** buildRun's `pick`/`order`
preferred unused levels but fell back to used ones, and passage routes could walk a sewer twice. Now a
used level is never a candidate: street picks, `fillTo` (which also excludes what the fill itself has
laid; that set is in its memo key), passage `firsts` and `walk`, and `commit` marks passage levels used.
With no repeats the chain runs until the pool is dry and often stops on a level no Exit joins, so it
steps back to the last level an Exit does join and ends the street there (dropping passages past it).
`resolveRunNeighbour`'s on-the-fly growth also skips levels already in the run. His levels, 300 seeds:
0 repeats, 300 of 300 runs 8 long with an Exit, 216 with sewers.

**"The rats in Sewer M2 are no longer dropping down."** Regression from the M14/M15 fix (2026-10-10,
`hillStandsAside`). Each rat's pocket has 30 px of air over its lip (row 8 open, row 7 a row of ramps
with a solid fill behind), and a rat is 36 px tall, so its head is 6 px into row 7. Walking to its
hole, the next row-7 cell was a NEW cell (a unit is only let out of cells it is already in). Before
10-10 the ramps were let through as hill because the rat was on its feet; since then, with its centre
over the hole, there is no ground under the centre, so the hill is a wall, and every rat moved 22 px
and stopped. Logged in the live loop: the only wall hit was `{r:7, c:18}`. **Fix:** `ceilingGrazeFree`
drops hits in the box's TOP row when the box already pokes into that row by at most half a cell: the
same roof running on. A real wall fills the rows below the head and still stops it. In the app (dev
and production builds): all four rats drop to the floor (y 444) as he approaches.

**"Maximum frame stability. Sometimes at random it feels a little slower."** Standing still by M15's
shaft, the dev build showed a ~45 ms frame every 22-23 frames with no DOM change, no shots and no route
planning. It was garbage collection: ~1.7 MB allocated per frame in the PRODUCTION build (heap read off
`performance.memory` every frame; a collection every ~8 frames). Timing marks in the loop and the
render (production build, Blake-sized view): 5.7 ms of script per frame, of which React's render was
4.4 ms and the unit pass 1.7 ms. The 7 visible units, all standing still, cost ~0.23 ms each to rebuild
(bake, limb swing, weapon attach, renderPieceRuns) into a picture identical to the last frame's, and
then React compared the whole tree. Off-screen units were already culled. **Fix:** `unitArtCache`.
The unit pass keys a unit's sprite element on `unitArtSig(ep)` (every field of its live state except
x, y, vy, slideVx, stepEase and uid, objects JSON-written; null if one cannot be written, meaning draw
fresh) plus asset, weapon, placement, render size, anchor, texture library and run id, and hands React
the SAME element when nothing changed, so the subtree is skipped. After: 1.9 ms of script per frame
(render 1.0, units 0.1), allocation 1.0 MB/frame, collections ~14 per 5 s instead of ~35. Verified
that animation still redraws: walking rats changed art on 35 of 39 moving frames (the other 4 were
mid-fall), and bites redrew while standing. The warm-ahead steps (`warmRunAhead`) were timed too and
are all ≤ 5 ms even in the dev build; they were not the hitch.

**Harness notes.** Production builds served by a scratch `serve.js` (static files + `/__library` from
the `saves` branch's library.json) are where per-frame numbers mean something; the dev build inflated
the same frame 2-3×. A temporary `window.__TMPHOOK` (refs + liveEnemyAsset/findA/bake) made the
compositor sweep and the rat probe one call each. Strip every hook and mark before committing.


## A volume slider beside every sound pick (2026-10-11, evening)

Blake, after asking about three times: "EACH SOUND SHOULD HAVE A VOLUME SLIDER NEXT TO IT. THERE ARE 0!" and then "It has volume where its saved. I wanted it where its placed." The morning's slider (04cd1b3) was only on Library rows, which sit inside 📂 folders that start shut. The screen he works from (Basic sounds, Music, Dialogue, Weapons, Enemies) and the editor's 🔊 card had none.

Now every one of those picks has its own slider, stored next to the pick and multiplied with the clip's Library volume. The same clip can be quiet as the Punch and loud as a gun's Fire. A weapon slot left on "— basic —" plays at the basic sound's slider (`resolveSoundVol` makes the same choice `resolveSound` makes). ▶ plays at that slider's volume. The talk loop takes the dialogue's `soundVol`, and music takes `board.musicVol`. The Sounds screen's pick rows no longer wrap the slider onto a second line.

Verified on a prod build with his library: 9/9 basic, 1/1 music, 14/14 dialogue, 32/32 weapon slots and 39/39 enemy slots have a slider. Jump moved to 40% and still read 40% after a reload. The engine test shows a 50% clip on a 40% Punch slot plays at 0.2 gain.


## No sewer gate that leads nowhere (2026-10-11, evening)

Blake: "I had a seed generate with a sewer entance on Level 7 and say nothing connect. There will not be a level 8 sewer exit so this is a impossible seed and shouldn't have generated".

buildRun laid a street level first and planned its passage after. When no route could be planned, the gate was simply left a wall. Level 7 is the last level before the Exit, and his Exit (Trailor Park E1) has no sewer gate. His sewers only let you climb back out east of where you went in (Sewer M1 runs east to M3/M4, then up through Sewer M2's Top Right), so a drop from level 7 had nowhere to come up. Over 1,000 seeds on his saves (`saves` branch library.json): 310 dead gates, 246 of them on level 7, the rest on levels 4-6 where the sewers left were already used.

Now `tryLay` lays each street level (the Exit too), plans its passages, and if any level it laid has an open top/bottom gate with no passage under it (`vertDead`), it puts everything back and tries the next candidate. The seeded pick is tried first, so seeds that never had a dead gate lay what they did. A gate no level in the pool could ever join is not held against the level. If no candidate fits, the seeded pick is laid anyway and the attempt scores lower than any clean one. The step back to a level an Exit joins is skipped when it would cut a planned passage in two.

After: 0 dead gates in 1,000 seeds, all 8 levels long, all ending at the Exit, sewers laid 2,249 times (was 2,089), same speed. The test fixture P6 (a sewer with no P5 to climb into) fails on the old code ("INTRO, Q, Q3, P6, EXIT2").

## 🎬 ANIMATIONS: the opening and closing cutscenes (2026-10-12)

Blake: the Trailor Park floor opens on a black screen fading in, Bob asleep in bed under a blanket
with an alarm clock going off, and "Press E to wake up"; it closes with Bob leaving on a helicopter
rope. About two per floor, a beginning and an ending. He asked how to add these to levels, then for
"an animation editor ... where I select an animation you made, and maybe it has a few states", with
the bed in it: the body under the covers at state 1, then on E the covers come off and he goes
"laying down, sit up, sit on side of bed, standing up" in one motion.

**What it is.** An animation is an ASSET (type "anim"), so it saves, syncs, exports and restores on
the existing asset wires; a new saved kind would have needed the five-way wiring in three files for
no gain. `src/anim.js` holds the rules (values at a moment, the state machine, the fade, editing),
with no React, storage or body code, because the game's own front end will play the same records.
Layers are props drawn the way placed props are (boomLayout + propArtInner, so the tight art box and
the size meaning are the same) and ONE actor, which in play is the player's live drawing
(livePlayerBlocks) and in the editor a look picked to preview with.

**Why the actor is keyed by its hip.** Lying, sitting up and standing all turn about the hip. A
sit-up interpolates the body's turn from -90 to 0 while the legs swing forward from 0 to 90 about
the same point, so the legs stay flat on the mattress the whole way (the turn and the swing ease by
the same curve, so their sum stays at a quarter turn). `legs` reuses applyLimbSwing (the walk's hip rotation),
`arms` the melee swing's rule with sleeves riding rigidly, and `sit` shortens the leg pieces toward
the hip (thighs toward the camera) for sitting on the edge facing front. No weapon on the actor.

**Traps found while building it.**
- A looping waiting state ("Asleep", 1.2 s) with a 2 s fade-in faded by the LOOPED time, so the
  screen went back to black every lap. The playhead now carries `el` (time in the state, unwrapped)
  beside `t`; the fade-in and the prompt go by `el`. Measured after: 0.86, 0.69, 0.54, 0.39 across
  the wrap.
- Play queues a gate spawn (spawnReq) on its first frame, and the cutscene returns before the loop
  reaches it, so the first frame after the handoff teleported you to the gate. cutFrame clears it
  and records the bed as the respawn point.
- Placed animations redraw every frame like everything in the level render. A finished bed is a
  still frame of ~100 pieces; the stage element is cached on (record, state, time, each running
  prop's frame, position). Measured: 0 DOM mutations in a second once the scene is over, 93 in
  0.6 s while it plays.
- His first look at the blanket: it "cuts straight down over his feet" and sat "too close where his
  skin peaks through". Measured where the lying body lands (hip 8.67,6.0 turned -90: torso x
  5.98..8.72 y 4.92..7.08, head to 6.06, legs to 10.61): the blanket started 0.2 cells short of the
  shoulders and its top at the fold was BELOW the torso's top, so a block of shoulder showed above
  and below the head. Redrawn in stage cells against those numbers: tucked under the chin, ~0.3
  cells of slack, a toe bump that drapes down in a curve past the feet, and a scalloped hem over the
  mattress edge like bed60s1's own quilt (which also hides anything a look hangs below the mattress).
  Checked on BoB, Bobbett, Army Bob and Super Bob (his cape still trails out under the hem).
- editorReachIssues refuses a prop record whose `size` is not a picker stop. A record's size is
  only where a placement starts; the animation gives each layer its own size (the editor's Size
  slider steps 0.05).

**Delivered:** `wakebed` "Wake Up (Bed)" (stage 17x9; Asleep: fade in 2 s, clock rattling, Zzz,
waits for E, loops; Get up: 3.1 s), with new props `blnkt01` Blanket, `blnkhp1` Blanket Heap,
`alrmclk` Alarm Clock (2 frames, ringing at 10 fps), `zzzfx01` Zzz (3 frames), reusing his
`bed60s1` 1960s Bed (mirrored, pillow left) and `nstlmp1` Nightstand Lamp. Verified in the running
app: ▶ in the editor (fade, prompt, E, end), Playtest of a level with the marker (camera on the bed,
player hidden, prompt in the label style, E, handoff with the hip on the actor's last hip and feet on
the stage floor, walking away), and a throwaway "Walk up + E" / "Leave the floor" animation (prompt
over your head, E, fade to black, the floor-complete message, play stops). No alarm sound: his
library has none; a state's 🔊 is where one goes.

## 🎬 The alarm: a sound, a prompt by the clock, a slap (2026-10-12, later)

Blake asked to "tag audio to the animation (an alarm clock noise)" and to "press E beside the alarm
clock to turn it off", with the prompt in a font "closer to the weapon pick up fonts", and, mid-task,
"make sure the blanket doesn't vanish before the arm hit away animation".

- Each state already had a 🔊 pick; his library had no alarm. `alrmsnd` "Alarm Clock Ring" is
  synthesised (scratch generator: two steel bells a little under a fifth apart, 24 hammer strikes a
  second, inharmonic partials, rendered into a circular buffer so the 2 s clip loops without a
  seam: the loop-point jump measured 0.038 against ordinary sample steps up to 0.45). Committed as
  `asset-data/clips/18ad98f3….wav` beside the project file's first `sounds` entry. Not listened to
  by me; he should judge it and can swap the pick for a recording.
- A waiting state's prompt can hang by any layer (`promptLayer`) and be raised (`promptLift`):
  over the clock at its own height it ran across the nightstand's lamp, so the bed lifts it 1.5
  cells. The editor shows the prompt while a waiting state is being edited, so it can be placed.
- The prompt is Shrikhand (the pickup banner's face) at 21px, its key in the take callout's gold.
- A state's sound plays for exactly that state, and E ends "Asleep" at once, but the hand lands a
  beat later. So "Slap" is its own 0.25 s state with the same ring: measured in Playtest, E stops the
  Asleep loop, Slap restarts the clip and schedules its end 0.25 s out, which is the frame the hand
  is on the clock, and "Get up" plays nothing.
- The covers are pinned by explicit keys through the reach, the hit and the arm coming back
  (opacity 1.00 to Get up 0.45 s, then off by 0.85 s) and ride 0.6 cells toward the clock with him.
  Bob slides 1.32 cells and turns -96° to reach: the nightstand stands left of the headboard and
  his arm is 2.18 cells, so from the pillow the hand fell a cell short.

## 🎬 The blanket stays; the prompt is over Bob (2026-10-12, latest)

Blake: "The blanket still disappears too early. The text should be centered over Bob not the alarm.
It should only Say "E - Get up.""

- The covers never vanish now. They slid off and faded from 0.45 s into Get up (once the arm was
  back, which is what his previous note asked for), and he still read it as too early: a blanket
  that fades is a blanket that disappears. Now they stay over him while he stirs, slide 1.15 cells
  toward the foot (to the footboard) and drop 0.6 as he sits up, so the tall chest end of the quilt
  lands at his waist rather than his chin, and they are left on the bed when he gets out. Getting
  out from UNDER them needs the blanket drawn BEHIND him, and a layer's draw order cannot change
  between keys, so "Blanket (behind)" is the same prop on a layer under the actor, and the two swap
  `show` across 0.02 s exactly when he turns from Side to Front on the edge (kg6), where the pose
  change hides the swap. Measured: exactly one blanket drawn in every sampled frame of the cutscene,
  and it is still drawn after the handoff. The Blanket Heap layer left the scene; the prop stays in
  his library.
- The prompt is "E - Get up." and hangs by the actor again (promptLayer ""), centred on the BODY:
  `animActorPromptSpot` moves it ANIM_BODY_MID_CELLS (1.09) up the body from the hip, turned with
  him, because lying down the hip is near his feet. Height is 4.4 cells over the hip standing (the
  old 3.6 sat inside his head; his head top is 4.12) and 2.2 lying. In Playtest it lands at stage x
  7.58, the middle of him from his head on the pillow to his feet under the covers.

- (Later still) Slid along with him, the blanket fell behind his body as he sat up and he passed
  through it. Blake: it "can phase like it did before it just needs to phase when the player does the
  second arm animation to shove a blanket away. It can then phase into the clump". So after the slap
  the arm comes up out of the covers (arms 115) and sweeps down toward his feet (20), and the blanket
  slides toward the foot and fades during that sweep only (0.7 to 1.05 s into Get up) while the Blanket
  Heap fades in; he sits up after, uncovered. "Blanket (behind)" is gone again. The lesson: two
  layers can only swap where nothing moves between them; anything that moves faster than a layer
  covering it will be seen passing through it.

- (2026-10-12, night) Blake: "the blanket ... fades away too early. I kept telling you to fix this ...
  It should just slide up with the player and then fade away after they do there arm lifting push
  away blanket animation." Two things were still wrong. In the Slap, Bob slides 1.32 cells toward the
  clock but the blanket slid 0.6, so his shoulders came up out of it (and it read as the blanket
  going). And the fade ran DURING the shove's sweep (0.7 to 1.05 s), not after it. Now the blanket
  keeps its resting 0.055-cell offset from the hip through the slide there and back (Slap ks1, Get up
  kg0/kgs1 at x 7.405), stays fully on through the lift and the sweep, and fades 1.05 to 1.4 s,
  drifting toward the foot while the heap fades in; kp3 moved to 1.4 and every later key +0.2 s, so
  he sits up only once it is gone (Get up 3.85 → 4.05 s). Measured in Playtest at his view size:
  actor and blanket left edges moved 39.6 px together, opacity 1.00 until 1.31 s after E, 0 by 1.67,
  the sit-up began at 1.7.

- (2026-10-13) Blake: "It still fades away too early for the animation. You are still failing." His
  copy held that exact version (read from his Chrome store), so it was the reading, not delivery.
  "Their arm lifting push away blanket animation" was never the lying-down shove added in 0dd3a58: it is
  the SEATED arm lift (kg3 arms 170 at 1.8 s, kg4 arms 0 at 2.15 s), in the scene since b67de96 and the
  "second arm animation" after the slap in his 0dd3a58 message. Every version from 0dd3a58 on faded the
  blanket before he had even sat up. "Slide up with the player" is the sit-up: the blanket stays on
  him and slides 1.15 cells toward the foot as he rises (its tall chest end lands over his lap, the top
  at his chest). Now: the lying-down shove is gone (timing back to 1574e1e/633d204 for Bob), the
  blanket is fully on through the slap, the sit-up, the arm lift and the push, fades 2.15-2.5 s while
  drifting into the heap, and the legs swing off after (kg5 on, +0.35 s; Get up 3.9 s). Measured in
  Playtest on S1 with Army Bob: opacity 1.00 until 2.42 s after E, 0 by 2.75, legs moved from 2.84.
  Frames were checked by rasterising `.animStageWrap` (foreignObject, computed styles inlined) and
  POSTing the PNG to a loopback receiver, because pane screenshots are 800 px wide.

- (2026-10-13, later) Blake on that: the blanket "seems to track the player too much" going left in
  the slap; "the character sits up and phases through the blanket while they are sitting up"; he
  "throws there arms to throw the blanket to the edge and then a fraction of a second later the top of
  the blanket fades". "I want it to be perfect, no phasing and in sync. Maybe the blanket needs to
  compact somehow before the player sits up."
  - **Compacting needed a new animation field.** A layer could only move, turn and fade, and a rigid
    quilt sized for a lying body is always where a rising torso goes. `sx`/`sy` (ANIM_NUM_FIELDS, prop
    defaults 1) squash a prop about its bottom-centre (`animPropTransform`: the turn stays outermost
    and about the middle, so an unsquashed layer draws the exact string it always did). Editor:
    Width/Height sliders, 10-200 % in 5s, on a prop layer's card. Checked by mouse drag at real size.
  - **Where it bunches decides whether he phases.** His upright torso reaches ~1.1 cells in front of
    the hip (x 9.8 on this stage), and a lap bunch (sx 0.5-0.6) still had his rising hips pass behind
    its cream fold. Bunched onto his SHINS (x 11.2, sx 0.45, sy 0.75, left edge 9.93) nothing ever
    overlaps the rising torso; his thighs show, which is what kicked-down covers look like.
  - **Every key is an ease-in/ease-out point for every layer**, so a blanket key in the middle of the
    arm's sweep would stall the arm. The throw therefore uses the arm's own keys: kg3 (1.8, arm up)
    to kg4 (2.15, arm down) squashes it to the heap's footprint (sx 0.45, sy 0.35 at x 11.4, y 7.3),
    fully drawn; kgf (2.25) swaps it for the heap in place in 0.1 s; legs swing from 2.25.
  - Slap drag 0.3 cells (he slides 1.32). Get up 3.65 s.
  Measured in Playtest on S1 (Army Bob): blanket 8.72 → 8.43 in the slap, bunched 0.70-1.16 s after
  E during his stir, unmoved through the sit-up (1.16-1.79) and the arm lift, squashing 2.05-2.40
  with the arm, heap at 2.50, legs from 2.5.
- (2026-10-13, take 5) Blake on that: "the blanket unrealistically follows the player slightly towards
  the alarm clock like its a clothing item, then immediately shrinks, phases through the feet and
  appears at the players ankles, then the player does the arm raise animation that's supposed to fully
  throw the blanket off, at nothing, but the blanket then fades out." Three readings were wrong:
  - **Any drag in the slap is "clothing".** The blanket now stays exactly where it lies until he sits
    up; his shoulders coming out from under it as he reaches for the clock is what a real cover does.
  - **"Compact before he sits up" meant "don't let him rise through it", not "move it early".** Moved
    while he lay still, it read as shrinking for no reason, and on his shins it left nothing for the
    throw. It now slides down off his chest into his lap on the sit-up's own keys (kg1 → kg2): foot end
    fixed at 11.55, left edge 5.9 → 7.4 (the back of his upright torso), sy 0.8 so it clears his jacket
    while its dip still covers his legs (sx 0.735). Take 3 had slid it at full height and buried him
    to the shoulders; the left edge always being inside his torso is what keeps it from standing where
    his chest was.
  - **The throw is the arm RAISE.** It lifts off his legs, tilting, on kg2 → kg3 (in the air over the
    foot when the arm is straight up), and lands on the foot of the bed as the arm comes down
    (kg3 → kg4), squashed to the heap's footprint; kgf at kg4 + 0.03 swaps it for the heap while the
    arm is already at rest, so the swap stalls nothing. The heap moved right of his toes (x 11.7,
    layer size 2.2, toes at 10.7, footboard at 12.75) so it never sits where his feet are.
  Measured in Playtest on S1 (Army Bob), from E: blanket unmoved 0-1.15 s; sliding into his lap
  1.20-1.77 on the same frames his turn goes -86 → 0; lifting 1.77-2.08 with the arm raise (turn to
  12°), landing 2.08-2.40 with the arm coming down; heap at 2.46; legs from 2.46. Frames checked with
  BoB and Army Bob.
- (2026-10-13, take 6) Blake: "That one still looks bad. The blanket should likely rise when the player
  reaches back for the alarm, and all you are doing is shrinking it in the phases. It still looks cheap,
  ugly and unnatural." He was right about the cause: every take had moved, turned, faded or squashed ONE
  stiff drawing, and no timing makes a stiff drawing behave like cloth over a moving body.
  - **A new layer kind, `"cloth"`.** `animClothShape` (anim.js) is a side-view drape worked out fresh
    every frame from the actor's outline: App.js hands it every painted piece's box as four corners
    relative to the hip (`animActorParts`, turned the way Static turns pieces, arms marked). The top
    line rests on the parts toward the foot from the head end and no further up the body than `cover`
    (cells from the hip, along the body, so it turns with him), on an arm just past the head end (by
    less the further past), and on the bare mattress (`bed`); it sits `CLOTH.thick` up, never falls
    away steeper than `CLOTH.slope` (a raised arm makes a tent), hollows are filled and corners
    rounded. It starts at him when nothing of him is under its head end (sat up, it is in his lap, not
    lying flat behind him). Its length (`len`) minus the top line's length bunches at the head end as
    rolls with fold creases (in his lap; a heap with the sheet showing at the foot). `lift` raises the
    head end hem and all, the hanging side further (`CLOTH.fly`), so a thrown blanket is a sheet with
    his legs showing under it. Drawn as one SVG over the stage in blnkt01's colours (pattern measured
    from the foot end along the top so it rides the cloth); only the cloth takes a click.
  - Stateless on purpose: a scrubbed timeline and a played one draw the same blanket.
  - Editor: "＋ 🛏 Blanket", card = Length, Mattress, Head/Foot/Hem, Cover, Lift, Show; dragging it moves
    both ends. Width/Height on props stay (they are a prop feature now unused by the Bed).
  - Wake Up (Bed): lyBlk + lyHep (blnkt01 + blnkhp1 props) replaced by lyCloth (len 6.25 = its rest
    top line + 0.1, bed 7.05). Keys only on the body's own keys: rest everywhere until kg1, cover 0.5 at
    kg2, head 9.2 / foot 12.3 / lift 1.5 at kg3 (arm up), head 11.0 / foot 12.65 / lift 0 at kg4 (the
    heap ends right of his hand once he stands; at 10.75 it touched it). kgf (the swap) is gone.
  - A sample count of `ceil(span / step)` came out one different for a mirrored stage (120.00000000000001)
    and a box edge exactly on a sample was in on one side and out on the other: both now take 1e-9.
  Measured in Playtest on S1 (Army Bob), from E: edge lifted to 3.90 at 0.12 s as the arm comes out and
  again at 0.55 as it goes back under; sit-up 1.19-1.75 (rides up to 3.95, settles to 5.38 in his lap)
  on the frames his turn goes -86 → 0; hem up to 5.20 by 2.09 with the arm raise; heap at 2.46 with
  the arm down; the heap stays after you take over. Frames checked with BoB and Army Bob.
- (2026-10-13, take 7) Blake: "very close to being ready other than the the edge of the blanket sort
  of clipping through the player as they are sitting up". Measured: sitting up, nothing of him reaches
  back to the blanket's own head end (5.9), so it starts at his back where `cover` cuts across him, and
  that cut climbs steeply toward his front (at turn -74 it rises 3.6 cells per cell across). The slope
  limit (a tent may fall at most 1.1 per cell) tented over that climb from his front, and the hollow
  fill did the same, so the head end stood up to 2 cells above the cut: a wall with the cream sheet down
  its face, and his shoulders and back slid behind it (at 1.1 s the top at the back corner was 5.12
  against a cut at 6.14). Now, when the blanket starts at him (x0 > its head end), the stretch where the
  outline climbs from that start keeps to what is under it plus its thickness (`hug` in
  `animClothShape`): the edge lies across him along the cut. Lying down it starts at its own head end
  and nothing changes; across the whole scene only Get up 1.0-1.65 s draws differently (swept at 0.05 s).
  Control: the new test reads 5.58 on the old code against > 6.27.
- (same day) **The 🎬 editor, for tweaking by hand.** He tried to fix it himself and "could not easily
  resize a block ... could not easily move a block, I could not undo and I could not load a un messed up
  version". His save showed the shipped record, so nothing of his was lost: the edits were never saved.
  What was wrong, found by driving it with the mouse:
  - Every layer took a click anywhere in its BOX. Lying down, the actor's box covers half the bed, so a
    click on the headboard picked Bob. Now only drawn pieces take a click (`.animStage.ed .animLayer`
    is `pointer-events:none`, its `div:empty` leaves and SVG shapes are not) and the stage asks
    `document.elementsFromPoint` what is drawn there, topmost first (`data-ly` on each layer).
  - Nothing under another layer could be dragged. A drag that starts on any drawn piece of the
    SELECTED layer now moves it whatever is over it (pick it in Layers, drag on the blanket over him);
    a plain click still picks whatever is on top.
  - A click that wobbled a pixel set a key at the playhead. Nothing changes until ANIM_DRAG_SLOP (4 px).
  - Resize: a prop's corner handle sets its Size (the whole animation, about the point it stands on);
    the blanket has a handle at each end (Head, Foot). Arrows nudge 0.05 cells, Shift 0.5.
  - **Move: This key | All keys.** Each state's first key holds its own copy of where everything is, so
    a bed moved in one state jumped back in the next. All keys (`animShiftLayer`) moves every key of the
    layer in every state by the same amount; drags, arrows and the typed X/Y/Head/Foot/Hem all obey it.
  - ↩ Undo / ↪ Redo (and Ctrl+Z, Ctrl+Y or Ctrl+Shift+Z): the record before each change, a burst closer
    than ANIM_UNDO_GAP (600 ms) being one step, a drag always its own. A restore keeps the CURRENT id,
    savedAt and editedFrom: an older savedAt would make the next save claim an older base. The buttons
    sit before the "· unsaved" badge: after it, Undo slid sideways the moment an undo reached the saved
    copy, and a second click landed on something else (caught by clicking it by hand).
  - "I could not load a un messed up version": the 📂 picker showed the open animation as picked, and
    picking it again fired nothing. It now always sits on its first line (the open one's name), so
    picking it reloads the saved copy, and ↺ Last save does the same in place (same state, moment and
    layer). Reloading the same animation is one undo step; opening another starts a fresh history.
  All driven by hand with `computer` clicks and drags in the pane (bed 8.3 → 9.3 → undo → 8.3; All keys
  9.3 in all three states; corner Size 10 → 12; Ctrl+Z; Last save back to 8.3 everywhere; Bob dragged
  from under the blanket 7.35 → 8.35; foot handle 11.55 → 10.55; a still click between keys added none).

## 🏠 Trailor Park S1: the bedroom's ceiling and closet door (2026-10-12)

Blake's S1 opens on a cutaway bedroom at the left end of a street level: a Background back wall of
his Light Atomic wallpaper (rows 19-34, with a one-row bump on row 18), a 7-row Foreground wood floor
in front of it (rows 35-41) whose left edge slants out via paired steep ramps (col 4 rise 3, col 3
rise 4), and a thin Foreground side wall (cols 3-4) that stopped at row 23. He asked for "a ceiling
looking thing that's sort of 2.5D" and a closet door where he drew one.

- **Where the ceiling goes is set by the camera, not the art.** Play centres the body, so on his
  871 px view a body standing on row 35 sees from row 17 down. A ceiling above his 16-row wall
  (rows 12-18) would have shown two rows in play. It meets the back wall at row 23 (where his side wall
  already stopped) and runs to row 16, the mirror of his 7-row floor about the wall's middle, so play
  shows 6 of its 7 rows and the cutscene all of it. It is painted OVER his wallpaper rows 18-22 as
  solid Foreground; nothing of his was erased, and taking the ceiling off shows his wall again.
- **The corner is his floor's ramps mirrored**: col 4 rows 20-22 (rise 3) and col 3 rows 16-19
  (rise 4) hold an upside-down ceiling ramp (slope +1, deeper to the right) plus a side-wall ramp
  (slope -1, high on the left) in `more`, so the line runs (5,23) → (4,20) → (3,16). The side wall
  continues up to it with his own wall cells.
- **Ceiling Tile** (`clgtl01`) is a checkerTile record with both tile colours the same cream, darker
  grout and heavy fleck: acoustic tiles, not a checkerboard. A grid of squares is what reads as a
  ceiling; plain cream read as a blank band.
- **Closet Door** (`clsdr01`, 📂 Interior, size 8) is his Wooden Door (`n0h690d`) with its five pieces
  untouched, drawn over a cream casing 8 units wider on each side and on top. At size 8 it is 8 rows
  tall and 5.2 wide, placed at "27,25" on the Background layer, so its bottom is the floor's top and
  Bob walks in front of it.
- The room stays open on the right (the floor, wall and ceiling all end at col 42), as he built it.

## 👢 STOMP: land on a head from above, both ways (2026-10-13)

**Blake: "add an ability that I can give to shoes or clothing where if you land on top of an enemy that
take a ton of damage? Call it stomp, think of it like in Mario. Have it where if you have the stomp
ability and are falling (not gliding or flying) you have a sort of special animation."** Then: **"make
sure that if enemies have the ability (and I'll give the item high agi) that they will try to jump into
the player too"**, and: "That is a stomp mechanic while this is an entirely different stomp ability."
The 🦶 foot-stamp (`STOMP_DAMAGE`, below) is untouched. The new one is `EFFECT_TYPES.headStomp`,
labelled "Stomp" (👢), and its code is all `headStomp*` / `HEAD_STOMP_*` / `p.hs*` / `ep.hs*`.
* **Armed (`headStompArmed`)** in the air, falling faster than `HEAD_STOMP_MIN_VY` (1 px/frame), not
  gliding, flying, climbing or on a 🚶 plane. Flying never reaches the gravity branch, so it never arms;
  Glide passes `p.gliding`. The `air` record (`headStompAirStep`: `{ rose, fromY }`) tells a jump from a
  walk-off. Anything that went up (a jump, a bounce, a flight let go) arms on the way down at once. A
  walk-off arms only after `HEAD_STOMP_WALKOFF_DROP_CELLS` (1.25), so a kerb or a stair (one cell)
  never flashes the pose. The record changes only at take-off, because a unit's sprite is cached on
  its state (`unitArtSig`).
* **Lands (`headStompLands`)** when the feet cross the TOP of an opposing body this frame (swept, so a
  fast fall cannot step past a head), from no deeper than `HEAD_STOMP_TOP_BAND` (35%) into it the frame
  before, so dropping down beside somebody is not a stomp. The highest head under you is the one hit.
  The player's test runs AFTER the landing pass (a fall that reached the floor this frame still
  crossed the head, and is put back on it) and BEFORE the landing resets (a bounce is not a landing).
  The unit's runs after `applyHitTo` is defined, because a `const` used above its line is a TDZ crash.
  Its fall stores `eHsArmed`/`eHsFeet0` for it, and nothing moves the unit in between.
* **Damage** is the item's Damage (default 60) through `playerMeleeDamage`, so Strength rides it, as
  the tail's does, with the Intelligence crit and then the target's armour. The player's goes through
  `incomingUnitDamage`; a unit's through `applyHitTo(..., bodyBlow true)`, so your i-frames, your guard
  and the revive window all apply. One stomp per body per time in the air (`hsHits`), so a bounce
  cannot juggle the same head; landing clears it.
* **Bounce (`headStompBounceVy`)** is the item's height in cells (default 3). Jump held as you land
  bounces `HEAD_STOMP_HELD_BOUNCE` (1.6) times as high, and a unit always holds it, as for its glide.
  There is no Agility hold boost on top (`jumpHoldT` set full). The bounce plays the jump sound, and a
  💥 (`HEAD_STOMP_PUFF_SIZE` 1.6) sits on the head.
* **The pose (`headStompPose`)** is Fly's rig: `flyPoseBlocks` for the player, and `flyLegBlocks` +
  `driveUnitArms`/`flyArmTarget` for units. Arms are raised 155° (up and a little forward) with a ±8°
  flutter, the legs are locked together (legSwing 0), and the body stays upright with no lean. The
  wrapper stretches about the feet with the fall speed (`headStompScaleCss`, up to 1.07). `.stompStreaks`
  draws speed lines trailing up off the head. Arms busy with a shot, swing, throw or block keep to
  those branches. It is `noAnim` (no 🎬 designer), Fly's rule.
* **Units leap at you (`headStompLeapPlan`).** The leap happens at an attack commit, after the
  foot-stamp's check and before the tail and the weapon. A wearer on its feet, with its target within
  `HEAD_STOMP_LEAP_REACH_CELLS` (5), leaps INSTEAD of swinging or shooting, but only if
  `headStompLeapFrames` says its own jump clears the head by `HEAD_STOMP_LEAP_CLEARANCE_CELLS`. That
  check flies the unit loop's own jump (`enemyJumpVelocity` plus Agility's held boost, which a unit
  always gets). Measured peaks: Agility 9 is 6.8 cells and Agility 10 is 7.8, so only 10 clears a 7-cell
  Bob from the same floor, while a Squirrel's head is in reach of anybody. Mid-leap it steers at the
  target's middle at its walking pace (`ep.hsLeap`, the first dxMove rule). After landing it waits
  `HEAD_STOMP_LEAP_COOLDOWN_FRAMES` (2 s) and fights with what it holds meanwhile. A neutral NPC's fall
  lands on nobody (`acts`).
* **Measured in the real build** (static build serving a library.json of his saves records plus scratch
  levels, Chromium via Playwright, god mode):
  - Bobert (Str 4) wearing it walked over a Guard Squirrel and jumped straight up. 51 frames of the
    pose on the way down, feet stopped 46 px over the floor (the Squirrel's head), and a 87 px
    (≈3-cell) bounce. "💀 Squirrel — defeated". The "👢 Stomped" toast was replaced the same frame by
    the loot drop's toast, which every killing blow with a drop already does.
  - Bobbi (Agility 10, Str 3, Seek, bare hands) wearing it came for a standing player. It leapt 239 px
    (8.0 cells), came down with its feet exactly on the player's head line, and hit for 47 (48 raw,
    then Bobert's armour). It bounced 140 px (the held 4.8 cells), landed beside him, and leapt again
    after the cooldown, about every 3.3 s. 199 frames of the pose on Bobbi.
  - Super Bob (Fly + Double Jump + Glide, Stomp added): 109 frames flying or hovering and 78 frames of
    letting go plus gliding with Space held showed the pose on NO frame. Releasing Space into a plain
    fall showed it on 73 of 75 frames, the stretch easing up to scale(0.965, 1.07).

## 🚁 The helicopter rope: the floor's closing cutscene (2026-10-13)

Blake: "start working on the next animation. It is of a large army helicopter, I am imagining the
duel blade one but the game does take place in the 60s, and it is dropping down a rope, and you grab
the rope and fly off, and that ends the floor."

**The ship.** The tandem-rotor one is the CH-47 Chinook, and the CH-47A entered Army service in 1962
(Vietnam from 1965), so it is period. `chnk47a` "CH-47 Chinook" (category Army, size 50, 4 frames at
20 fps, 37-39 pieces each) is drawn side-on facing LEFT at real proportions: rotor Ø 18 m, hubs
11.94 m apart, so tip to tip is the whole 200-unit canvas (6.68 units/m) and the tight box is
200 x 38.5. Fuselage, forward hump and tall aft pylon are Fill polys; sponson, engine pod, gear,
cockpit glass, five cabin windows, the open front door with the hoist bar over it, a white star and
"U.S. ARMY" (Impact, readable when flipped). The rotors are the frames: three Line-tool blades a
rotor, the fore and aft rotors turning opposite ways, 30° a frame (a quarter of the 120° a 3-blade
rotor repeats over), each blade reaching R·cosφ along the ship and 2.5 units up for the near half
(seen from a little below), over a faint 80%-translucent disc. Generator: scratchpad `copter.js`;
`editorReachIssues` is `[]`.

**Its size is set by the camera.** Play centres the body, so on his 871 px view a man standing on
the floor sees ~18 rows above it. A real-scale Chinook (3.2 cells/m) is 18 cells tall and could not
hover above a man's reach and still show its rotors. The layer is 52 cells (about 55% of world
scale: fuselage ~27 cells, ~10 tall with rotors), gear 7.5 cells over the floor, top at 17.5. Prop
layer Size now goes to 80 (`ANIM_PROP_SIZE_MAX`; the slider stopped at 30, migrate at 40).
Measured in Playtest at 1444 x 867: the aft rotor line is a few px inside the top edge.

**The rope is a layer kind (`"rope"`), for the blanket's reason.** A rope drawn as a prop would need
the ship, the rope and Bob keyed three times over in lockstep, and any edit to the flight path
would leave it hanging off nothing. `animRopeShape` works it out every frame: from the point of its
`from` prop layer at hookX/hookY (`animPropPoint`, the same mirror / bottom-centre squash / turn
about the middle that animPropTransform hands the browser; a test checks a mirrored stage), `drop`
cells of it (0 → 8.2 is it being let down), a free end swinging `swing`° on the clock (its lower
half further than its upper, the Curve tool's quadratic), and with `hold` it runs straight to the
actor's raised hands (`animHandsAt`: the tip of the arm reaching highest up the body) with the rest
hanging straight down from them. It is drawn BEHIND the actor, so the tail disappears behind him and
his fist closes over it. Manila `#c8a165` with the house `#1d1b1b` edge.

**Walk up + E grew scenery states.** "It is dropping down a rope" is the helicopter's move and "you
grab the rope" is yours, so the drop happens as you arrive. `eState` (picked by the Animation card's
E select, kept by id) names the state E starts; every state before it is scenery (actor hidden, you
still playing). State 0 loops from the moment the level is up; walking into the stage starts the rest
AS STATE 0'S LOOP COMES ROUND (`walkAt`, or the hovering ship jumped to where state 1 begins), they
play by themselves (`animSceneryStep`), and the last holds/loops with its prompt. With eState ""
(everything before this) nothing changes. E is taken only within `ANIM_REACH_CELLS` (2.5) of where
the actor starts: a 64-cell stage would otherwise let you grab a rope 30 cells away. The actor
starts from where YOU stood (the hip worked out from your feet, cutFrame's rule backwards) and eases
to its own first spot over `ANIM_ENTRY_SECONDS` (`animEntryOffset`), in cutFrame (so the camera
follows) and in the stage render alike.

**Every key is a stop for every layer.** Numbers ease by smoothstep per key span, so a key in the
middle of a flight stalls the ship there. The fly-off is ONE span (3 s, x 32 → 104, up 9.5, nose
down 10°, Bob swinging back 18°), its slow end hidden under the 1.2 s fade-out; the lift before it
is its own span, and the beat between them reads as the ship climbing then nosing over.

**`cptrend` "Helicopter Rope"**, stage 64 x 20 (marker = bottom-left, on the floor row): Hover
(1.6 s, waits/loops, a 0.1-cell bob, no rope) → Rope (1.6 s, let down, overshoots, starts to swing)
→ Waiting (1.6 s loop, "E - Grab the rope.", his "E - Get up." wording) → Grab (0.55 s: arms to 180,
a 0.4-cell hop, hold switches on at 0.3 s with the swing at 0) → Lift (1.4 s, up 3.3 with him on the
end) → Fly off (3 s, fade out 1.2). Ending "Leave the floor". Keys generated by scratchpad
`scene.js` from BoB's measured raised hands (-0.067, -4.658 cells from the hip, the same on Army
Bob); at every held key the hands are exactly 5.62 cells from the hook.

**Verified in Playtest** (a copy of Trailor Park M6 with the marker at 34,56, Army Bob, god mode,
the gated MessageChannel shim): walking in started the drop on the loop's wrap; the prompt came up
only near the rope; E handed over with a 0.18-cell entry offset; frames held mid-reach, mid-lift
and mid-flight (a `<script>` rAF wrapper with `__holdWhen` that stops the loop on a condition
read from cutRef, then `__release`); the screen went fully black and "🏁 Floor complete!" showed;
Wake Up (Bed) still draws its 55-piece actor and blanket. **M6's church is Front paint, and it
covered the ship as it flew off**: a playing stage sits under Front paint and Front objects like
the player does, and the see-through window does not run during a cutscene. Place the marker where
the flight path to the right is open sky. Not done: no rotor sound (a state's 🔊 plays only in the
cutscene states, not the scenery ones); not placed in any of his levels.
**"SAME SKIN, SAME STATS … I HAVE MORE HP" — TWO ONE-SIDED RULES (2026-10-14).** Blake, furious ("I have
asked you to fix about 10 times"): playing DK holding DK Arms, his barrel one-shot an NPC DK holding
DK Arms, and that DK's barrel took two to kill him. "It's most likely with all weapons." He assumed
armour again. Armour was fine: every hit site already went through `incomingUnitDamage`.
* **The numbers (his saves branch):** DK is 20 HP (skin 5, Jean Shorts -1), Defense 5 (Gorilla
  Mask). DK Arms hits 25 with Pierce, so a barrel is `25 × 35/40 = 21.9 → 22`. One barrel kills a
  DK on either side. In a clean drive it did, both ways: "🎯 Hit DK for 22 — defeated!" and
  "🏹 Hit for 22", "💀 Shot down" from a full 20.
* **Cause 1, hidden start HP (since the July pickup code):** `togglePlaytest` set
  `playerHP = maxPlayerHP(mergeEquip(base, equipped.current))` and then, in the same statement,
  `equipped.current = {}`. ■ Stop clears the pickups, so the usual Stop → ▶ path was fine. But
  📂 Load a level mid-test (`doOpenLevel` → `setPlay(false)`) ends play and KEEPS them. The next ▶
  then started with the old kit's HP and none of the kit. Measured: DK + a held Poke Jacket (+3 HP
  stat = +15) started on **35** while the bar drew 100%, because the bar clamps to the real 20. One
  barrel (22) cannot kill 35; two can. That is exactly his report. Fixed by reading
  `maxPlayerHP(basePlayerAsset)`, plus a per-frame `hpCeil` clamp in the loop so HP can never hide
  above the bar by any route. Re-measured: start 20, and HP forced to 35 mid-play is back to 20.
* **Cause 2, i-frames were the player's only:** `PLAYER_INVULN_FRAMES` (40 frames after a hit) was
  listed since 2026-09-28 as a "deliberate exception", asked about, never answered. A unit's 3-round
  burst landed one round on you and all three on it. Full auto and groups firing together hit you
  1.5 times a second and hit them every time. In any fight with more than one hit in flight, you
  had more HP than the identical enemy. Now `unitHitImmune(ep)` (grace window OR `ep.invuln > 0`)
  gates all ten unit hit sites, and each sets `ep.invuln = PLAYER_INVULN_FRAMES` where the matching
  player site sets `p.invuln`. Ticked in the unit loop beside `lifeGrace`. Fire still honours only
  the grace window (`unitUntouchable`), as on the player. Units blink 0.5/1 through it, your own
  blink. Measured: Experimental Rifle burst into DK, the first round "💥 Critical! Hit DK for 12 (8
  HP left)" and the other two consumed; next burst "Hit DK for 6 (2 HP left)", one round of three.
* **Harness:** `public/__test.js` loaded from `public/index.html` (gated MessageChannel rAF, muted
  AudioContext, a MutationObserver logging `.toast` text with the frame). His saves library as
  `asset-data/library.json`, plus a 60x25 flat level with one DK at 19,22. Refs by declaration
  order: enemyPos 35, playerHP 36, equipped 44, projectiles 18, player 88 (the `{current}` hook
  objects of AssetStudio, from `header.bar` walking `.return`). DK Arms is SLOW (speed 5): a barrel
  takes ~2 s to cross 530 px, so a check 0.7 s after the shot reads "nothing happened". Revert
  `public/`, `asset-data/` and `git clean asset-data/clips/` (the dev server writes his clips there).

## Symbols, the play HUD, the score and the end of the blue toast (2026-10-14)

**What he asked** (with a mock-up image): overhaul the play UI. HP bar top-left with "100/100"; ammo
as SEGMENTS, one per round in the magazine, with no round counter ("there is infinite ammo and most
weapons don't have many rounds"); a SCORE top-centre; stats top-right, with better symbols than the
mock-up's. Score rules: 100 a kill, dialogue can reward points, 500 a level minus 10 a second after
30 seconds, and "it shouldn't display this anywhere". Get rid of the blue "Blocked" boxes and show
something on screen instead. And "a symbol selector for everything we currently use an emoji for".

**How it went wrong first.** I read "everything we currently use an emoji for" as the whole studio.
I built a font that redraws ~170 interface emoji (Save, Load, tool buttons) as symbols, and I left
the in-game effects (explosion, fire) as emoji on the theory that they were "art". He was furious:
"WHAT IS THIS WHOLE SYMBOL THING ... MY ISSUE WAS YOU WANTED TO USE EMOJIS FOR THINGS LIKE THE STATS
ON THE NEW UI AND I ASKED YOU TO GET RID OF EMOJIS IN PLACES LIKE EXPLOSIONS, STUNNED ETC ... I JUST
WANTED A SELECTOR". He then kept the studio symbols ("at least I have something for those effects
for now") and set the real spec: "a selector I can insert props into, with the emoji as the default.
The new emojis can be the new default." **Lesson: when a request names a category, ask which
screen it is about before re-skinning the whole studio. "Things like explosions, stunned" was the
scope.** He also said "I hate emojis": no new emoji in new UI.

**What shipped:**
- `src/symbols.js` (no React, the game's). `symbolSlots.json` lists every slot: emoji slots (drawn
  by the FONT), and named slots `fx.*` (play effects), `stat.*` / `hud.*` (the HUD) drawn by
  `sym(key, cls, px)`. The board record `symbolboard` rides the sounds kind (`isSymbolBoard`, added
  to the restoreBackup filter) with `picks` and `colors`.
- **The font.** It is a hand-written TrueType built in the browser, with a COLRv0 layer per glyph in
  palette 0xFFFF. Measured on Chrome 152: without the colour table, every emoji followed by U+FE0F
  (⚔️ ❤️ 🗡️) still drew as colour emoji even though the first font in the stack had the glyph.
  With it, all of them take the symbol. FontFace rejects a bad font silently except through
  `load()`, so that is where a failure is logged.
- **Icons.** game-icons.net (CC BY 3.0, so the credits must name it) and Material Design Icons
  (Apache 2.0), via `tools/build-symbols.js` from the `@iconify-json/*` packages into one 1000-box
  integer relative-path dialect. `public/symbols/library.json` is 6.4 MB (2.3 MB gzipped) and is
  fetched only by the Symbols screen. `src/symbolArt.json` (~90 KB) holds the defaults.
- **Effects.** The boom render draws `fx.boom` when the blast has no prop of its own and its char is
  the default or none. Every stomp and tackle puff is pushed with "💥", so they follow too. A prop
  pick goes through boomLayout / propArtInner like a weapon's blast prop. The fire layer
  (`lvHazardLayer`) MOVED below propArtInner/findA so the flame can be a prop. Shots with no emoji of
  their own carry `DEFAULT_SHOT_CHAR`. The stunned, knocked-down and talk badges are `sym(...)`.
- **Toast.** `flash` checks `playLive`. During play it pushes a pop (`popText`): 12px outlined words
  over `popAnchor` (the player's head), on the labels' rung, shifted at seam handoffs, deduped within
  600 ms. The studio toast is dark now.
- **HUD** (`.hud`, sibling of .lgrid like the pickup banner). ATK is `enemyAttackDamage` with the
  buffed Strength, the rule both sides share. The player's over-head HP bar is gone; the reload bar
  over the head stays.
- **Score.** A kill is paid in the loot pass, the one place a death is seen once. To make
  `lastHitByFx === null` mean "your blow", the three unit sites (brawl, throw, shot) now store
  `ea.effects || []`. That is neutral for Lucky Find, because `[...player, ...[]]` is the player's
  own. A level clear is paid in `seamHandoff` for `runNow.curKey`, and at `animLeaveRef` for the
  last level. The clock ticks below the talk/shop/cutscene returns. Dialogue `points` are carried
  by migrateDialogue only when > 0.

**Verified in the dev server** (fresh 127.0.0.1 origin, cloud saves off, audio muted, gated rAF
shim): the font loads; the Symbols screen lists 182 slots and 11,770 icons; a real click on a Props
cell stored `fx.boom: prop:swiwj1p` (his Fire prop) in IDB. In ▶ Playtest on Trailor Park M1 as Army
Bob with the M16: 12 segments, 3 shots → 9 lit; grenade pips 3 → 2; "Thrown — 2 left" popped with
no toast; a pushed default "💥" boom drew the Fire prop, while a "🧨" boom stayed emoji; the stun and
down marks drew yellow symbols; a painted fire cell drew the orange flame; shooting Bobette (HP set
to 3) scored 0000100. **Not driven:** a level clear across a run's gate (unit-tested only).
Trap: `computer` coordinates in this pane did not line up with the screenshot; clicking by `ref`
from `find` worked.

## HUD corners, the save message, menu colour, and the height limit on hunting (2026-10-14)

**Asked:** "The enemies up down chasing range shouldn't be so high that on something like trailor park
M7 the enemies on the road below try to chase the player." SCORE semi-transparent. Money bottom-left,
the weapon's picture and current damage bottom-right. Mid-way: "it will not let me save props", then
"Nvm it saved but nothing indicated that it saved ... add a save indicator back. Honestly add some
color back to the main menu."

**The chase.** M7's road (feet row 35) and upper floor (row 20) are joined by a 🚶 walkway. Seek units
sense 42 cells sideways at any height. They turned to track him along the floor above, and the climb
route / Fly gear chase had no height limit. On his saved M7 (save folder, same as the repo copy) the
road units found no walkway route in my drive. What reproduced was the TURNING: with the limit off
(control, 99), 34,42 swung to face the player through the floor. With 1.5 body lengths it kept its
placed facing, while the upper-floor unit still engaged. `huntInReach` gates facing, `detected` and
`navPursuing` for hostiles. 10.5 cells keeps a ladder ledge and Sewer M2's rat-pocket drop.

**Save message.** I had made the studio toast dark (#1b2030) in 7c8b1c7. Nothing about saving broke,
but he could not see that it had worked. It also sat at the bottom, over the Save sheet's Copy/Close
row, for 1.6 s. Now the toast is blue again; a save is green, at the top, for 3 s, at z 60 above the
modal. A stale timer no longer clears a newer message.

**Weapon picture.** groundArt draws a weapon in its rest pose, along a hanging arm, so the M16 came
out 18 px wide, standing on its muzzle. `hudWeaponArt` turns tall art ±90° so the muzzle (else the tip)
points right, and adds a light outline for dark guns.

**Same day, round 3:** "There shouldn't be all that small white text every time you do something.
It's redundant." The play pops are gone (flash is silent in play). Ammo bar one width with segments
sized to fit (RPG 1 × 180 px, M16 12 × 13 px). ATK off the top row ("you don't need Atk at the top and
the weapon in the bottom right"). The money pickup's "+N" banner row ("super tiny text") is gone and
the HUD money count jumps instead. Verified in play: RPG one 180 px segment, $11 Bill 0 → 11 with an
empty row list, no toast, no pop.

**Round 4:** "you could have kept it it was just tiny": the money row is back, and all banner rows
went from 13 to 19px. "There is no indication that weapons are saved": playLive was `play`, which stays on after ‹ Menu
out of a running playtest, so every editor's flash was swallowed. That was also the real cause of the
earlier "can't save props" scare. "I hate the colors you made the main menu. I meant make the icons
have color again": the cards are plain again and the icons are coloured. "I dislike the enemies always on non
transparent thin long HP bar": bars now show for 2.5 s after a hit, 46×7px, see-through. Verified in play:
a weapon save after Playtest → ‹ Menu shows the green pill. No bars show at spawn, one shows after a hit, and it is gone
after 2.5 s. The $1 Bill row "💵 +1" shows at 19px.

**Round 5, the hunt limit:** "In trying to make it so enemies on a layer above or below on a two
storey level don't follow you made it so the tracking squirrels in trees that are meant to jump out
at you never do and enemies that are far across the map now try to chase you ... It's like vertical
tracking is gone instead of just weaker and sideways tracking is now far too strong." His tree
Squirrels stand on 3-cell branches 11 rows (M5, M6) and 14 rows (M7-M14: row 6 over the slab at row
20) above where he walks, past the flat 10.5-cell cutoff, so they never sensed him. Sight was always
6 body lengths (42 cells) sideways, at any height before the cutoff; nothing in round 1 widened it, but
he wanted it shorter. Now `enemySenseHeightFrac` makes the zone an ellipse: 4 lengths ahead, 1 behind,
times sqrt(1 - (dy/ry)^2), with ry 3 lengths when he is BELOW the unit (a drop, which unitDropSpot
already limits to a hole within 3 cells and him within 8) and 1.75 above (a climb). M7's road -> slab is
15 rows, so 1.75 (12.25 cells) keeps round 1's fix.
Measured in the dev build on the repo's M7 (god mode, player pinned): fixed, the tree Squirrel left its
branch and reached the slab beside him in ~70 frames (y 64 -> 485); the road's gun cat under him kept
its placed facing for 250 frames; slab unit 19,31 ignored him at 33 cells and chased at 22. Control
(round 1 code, bundle checked for the marker): the same Squirrel sat on its branch facing away for 260
frames.

## Aiming from a ladder and a 🚶 plane (2026-10-17)

Blake: "when you try to aim up with a gun while on a ladder it does not let you. In general you can
not aim up at steep enough angles on ladders and top down climbing surfaces and the arms are often
wonky when aiming up or aiming while climbing." Four separate causes:

* **Aiming was switched off on every climb.** `armHoldsAimPose` took `climbing` as "both hands
  busy", ladders included, so the arrows did nothing to the gun; Fire still shot, level, out of two
  arms pointing at the sky. A ladder now frees the gun hand (`climbFreesGunArm`); bars and ledges
  still take both.
* **↑ climbed instead of aiming.** `mergeInputIntent` folds the arrows into K.up/K.down for
  keyboard-only climbing. With a ranged weapon in hand (`gunAims`) the arrows are the gun's and W/S
  climb; unarmed or with a blade the arrows still climb.
* **Both arms aimed.** The Back pose a ladder shows has two weapon arms; the aim branch turned both,
  so the off hand left the rung. `gunArmOnly` (the gun arm plus the clothing riding it) limits the aim
  branch on a ladder and keeps that arm out of the hand pump, whose bob read as the arm coming loose.
* **The arm stopped 40° short.** `aimAngleDeg(-1)` fires straight up, but `aimArmOffsetDeg(-1)` was
  -50, so wherever the drawn Aim-up pose is not shown (walking, ladder, plane, push-off) the gun pointed
  50° up while the round went vertical. Now -90.
* **A plane over open air drew the jump pose.** The loop keeps `p.onGround` false on a plane, and the
  render's `airborne` did not exclude `p.topdown`, so standing or walking side-on across Trailor Park
  M7's crossing split the legs and leaned the body (and the aimed gun) by up to 16°.

Measured in the dev build, Army Bob + M16: Sewer M1's ladder at col 30, ↑ held 300 ms, y unchanged
(727), `aiming` true, `aimDir` -1; the gun arm at rotate(-180), the twin still at the climb's 180. A
shot fired up from the ladder started at the drawn barrel tip to the pixel, both facings (944,631 and
890,631), vx 0, vy -12. Trailor Park M7's plane: before the `airborne` fix the side-on idle and walk
snapshots were tilted with split legs; after, upright, with ↑ straight up and ↑+← at 45° in Side,
Back and Front. Units do not fire while climbing at all (`sameLevel` is false on a climb), so their
ladder render was left alone.
## Explosions always heard, no room tag on doors, TCloset redesigned (2026-10-17)

Blake: "weapons that make explosions use there hit sound every time they land". `detonate` already
asked for the weapon Hit at every landing. The engine dropped it: `soundGainAt` fades a sound to 0
half a view past the camera edge and `moment` skips anything under 0.02. Measured in the dev build
with the Grenade Launcher on Trailor Park M1: rounds landed ~860 px from the player, and the Hit
returned false with no trace row (the gain cut runs before `startVoice`). With `minGain:
EXPLOSION_MIN_GAIN` (0.6) the same landing played at 0.6, and every launch paired with a heard Hit.

"have it so it doesn't say Entering X when entering rooms. Room names are largly just simple record
keeping": the play door prompt read "🚪 Press E to enter · <roomTag>". The tag is gone from it.

TCloset 1 (`bv4u5mz`, his shell: wood panelling, checker tile, top-down plane) became a closet and
bathroom: Closet Nook `clsnk01` (rod, hangers, shelf, shoe rack, with gaps where the Shirt and Pants
pedestals hang their item and the Shoes item stands), his Mirror Dresser and Bear Skin Rug moved
into the closet half, Bathroom Sink `bthsnk1`, Laundry Hamper `lndhmp1` (the T1 pedestal sits on
it), 1960s Toilet `tlt60s1` under the window, Shower Stall `shwr601`, Bath Mat `bthmat1`; textures
Bath Tile `bthtl01` (wainscot) and Frosted glass `frstgl1`. The closet window, hidden behind the
nook, is panelled over. A pedestal draws only its item, centred in a 1.9x2.3-cell box whose bottom
is the marker row + 1, so an item "on" furniture is placed by its marker cell. All four arm from
the back row of the plane (body overlap, row-major: the shoes arm between the two hanging spots).
## Trailor Park E1: the draft office, the floor's last level (2026-10-17)

Blake: make "Trailor Park E1" with "a 1960s 'Draft' Office", the last Trailor Park level. His E1 (`5ao9ocf`)
was a blank street (gravel, grass, sky), W2 open, E2 closed (so `runRole` = Exit) and his Helicopter Rope
marker at 34,106. All of that is unchanged; the floor's objective is "Make it to the draft office".

**The building** is a 2.5D cutaway like S1's trailer, cols 30-95: Front paint = White Stone brick cornice
(row 16), Federal Brick band rows 17-20 (`fdbrck1`, new stoneBrick record), side walls only ABOVE the
doorways (rows 21-27) so you walk in, plaster partitions over the two inner doorways, water table + brick
foundation rows 38-41. Foreground = his Ceiling Tile rows 21-23 (solid) and Rec Hall Linoleum floor rows
35-41. Background = pale green over his Wood panelling (waiting room, board room), white over his Bath
Tile (exam room). Sidewalk outside, a painted helipad (cols 122-156, yellow edge cells) under the Chinook.

**Rooms:** waiting room (window, I Want You poster, clock, bulletin board with the Order to Report sign
marker, two banks of shell chairs, his ashtray stand, water cooler, his card table + urn + cups +
doughnuts, snake plant); the local board (Classification Chart, Draft Lottery Jar, Office Flag, window,
Steel Desk, his two Filing Cabinets); the induction physical (Eye Chart, Privacy Screen, Height Chart
drawn at 3.2 cells/m so Bob reads 6'2", Physician Scale, Exit Sign). Outside left: Bus Stop, Protest
Signs, Newspaper Box, his Mailbox, Flagpole. Out back: Helipad Sign, his sandbags and crates, Windsock.
22 props, category "Draft Office", ids `dft*`, each drawn on a whole-cell grid (size = longer side, the
box asserted exact) so every floor prop lands on row 35. All pass editorReachIssues. Generators
(props.js, level.js, deliver.js) stayed in that session's scratchpad.

**People:** hostiles on the walk in (two Trailor-tag placements with Meelee/T1 gear, a Chasing Pit Bull);
talkers: Readitor as the Protester (Hell No: heal or hostile), Bobert (Canada: heal, or hostile if you
call the Sergeant), Bobby (Lucky Number), the Agent from M14 as the Clerk (Draft Clerk, +100 for "Where
do I sign?"), Rob in his underwear waiting on the physical (Turn and Cough), Army Bob as the Sergeant
(Induction Sergeant: +100 for reading the chart's real bottom line, +100 for "Yes, Sergeant!", ends in a
heal and "grab the rope"). Draftees in underwear is period-accurate for the physical.

**Verified in Playtest** (dev build at 1800x1198, level view 874 px tall, BoB, god mode): the sign and
every text prop render; D held from col 31 walked to col 152 at y 840 with nothing blocking; the clerk,
sign and Sergeant trees open and pay (score 0 -> 100 -> 300); at col 146 the Chinook hovers over the pad
with the rope down and "E - Grab the rope." up. Not checked: his 3084 px wide view, and whether the
gate gang is too much right at the W2 gate.
**Follow-up the same evening.** Blake: the draftees were "starter characters ... who have yet to get
dressed. Can you change it to trailor Park Any? And can you have it display the name in the dialogue
box instead of the saved characters name like Te7". He had already switched Bobby and Bobert to
`enemyTag: "Trailor"` himself; Rob followed. The box already put each line's speaker first; the
leak was the "Talk to …" prompt, built from `ea2.name` (the rolled look, TE7). It now reads
`talkerName(tree)`. The three draftees' speakers became Earl, Dale and Rusty, since a rolled look
is no longer Bobby. The project file was 59 records behind his saves branch (his props re-filed and
his sign/windsock edits among them); all were folded in newest-wins with the same commit.

## 🎬 THE GENERAL'S BRIEFING (floor end) and 🎯 objectives as a list (2026-10-17)

**Ask:** "add a cut scene that plays at the end of the Trailor Park levels ... a close up of a General
and text is going up in a layer in front of him kind of like it's star wars ... look like he's in a
helicopter but ... super close up. I can edit the text ... 'Bob, only you can stop the Vietkong from
doing 911 in 50 years!' at the end. It should also look like he's talking some how."

**How it fits the 🎬 system.** The floor already ended in exactly one place: `cutFrame` when a
"Leave the floor" scene (his `cptrend` rope in E1) finished. A new trigger, "Floor end", marks an
animation that is never placed; `floorEndAnim(animLib, lv.floor)` picks it there (one naming this
Floor, else one naming none) and `cutRef` becomes `{ screen: true, ... }`. A screen cut has no stage
in the level and no actor to put you on: it is drawn in `.animScreen` (inside `.lscroll.playing`, z
49, under the cutscene fade at 50), the stage fitted to the view by `animScreenFit` and letterboxed
in black, never cropped, so the words always show. Its props' frames run on the cut's own `age`.
When it ends, the old "Floor complete" path runs (flash, `animLeaveRef` after 1.8 s). It starts on
the black the rope scene faded out to, and fades in by its own first state.

**The 🔤 text layer** is the crawl and the closing line both: `title` + `text` (blank lines split
paragraphs), `size` (cells per line), `wide`, `tilt` (degrees leaned back about the window's
bottom, CSS perspective; 0 = flat caption), `color`; per key x, y (window bottom), `rise`, show.
Font News Cycle (added to GAME_FONTS_HREF), outline in em so it scales with the view. `rise` is
LINEAR between keys (`ANIM_LINEAR_FIELDS`): every key is an ease point for every layer, so with the
General's push-in keyed mid-scene a smoothstepped crawl would stop dead and restart.

**The art** (scratchpad gen.js, session 704e81c6): `gnrlcu1` General (Close-Up), 12 frames at 8 fps,
Bob's face vocabulary (square head, rect eyes + iris, rect nose, square teeth), Army Green service
uniform with tan shirt and black tie, service cap with gold visor leaves, three stars each shoulder,
ribbon rack, and a headset ear cup + boom mic so a close-up still reads "in the helicopter". The frames
differ only in the mouth (shut/small/open/wide/oo), one blink, and a 1-unit rotor shudder on odd
frames; frame 0 is mouth shut, so Its own frames off = not talking. `chnkcb1` Chinook Cabin Wall:
ribs, red troop-seat webbing, floor, two windows as roundrect CUTTERS (after the ribs, or the ribs
cross the glass). `cbnsky1` Sky Rushing Past, a separate layer behind the cabin (20 frames at 20
fps, clouds over jungle) so the clouds need no clipping. Scene `gnrlbrf`, stage 48x20 (2.4:1):
Briefing 44 s (crawl rise 0 to 58, cabin and sky at 55% so the yellow reads), Only you 6.5 s (crawl
out, his line in white, the General pushed in to 1.14, cabin back to full, fade out).

**Bug caught in the running game:** the second state's first key left out the sky and cabin, so they
fell back to the layer default (middle of the floor) and the windows went black. Every state's first
key carries every layer.

**🎯 Objectives, same day:** "it won't let me set more than one objective. Like I set an object in S1,
tried to make a different one in the closet but it over wrote the other one." There was ONE slot
(`activeObjective = { targetTag }`, `objectiveText`), and every level's first marker took it over, so
the closet's line replaced S1's, and a second marker in one level was never read. Now
`objectivesOnArrival(list, done, lv)`: clear the ones whose target tag this room carries (into
`done`), add every objective marker here that is not up and not done (id = level id + cell). The
banner draws one line each. Verified in Playtest: S1 with two markers showed both; entering TCloset 1
cleared only "Check the closet"; leaving back to S1 did not bring it back.

## VIETNAM CONTENT PACK + 🏹 TIMED TAG DAMAGE ITEMS (2026-10-17)

Blake: "make a small content pack? I need a few Vietnam centric guns, I am thinking bolt rifle type
stuff. Also can you make a way to boost damage on items with a certain tag in the item builder? And
can you make clothing items with the ability tag damage gun and some with tag damage meelee?"

**"In the item builder" meant the 🧪 Item (consumable) editor.** Tag Damage already existed as a
clothing ability (`EFFECT_TYPES.tagBoost`), so the new thing is a fifth item effect beside Heal / Stat /
Money / Range: `{ kind: "tagDamage", tag, mult, duration }`. It rides `itemBuffs` like the 🎯 Range
item, and `withTimedTagBoosts` turns the running buffs into tagBoost-shaped entries appended to the
worn effects, so `tagDamageMultiplier` answers for gear and potions together (the shot, the melee
swing, and the HUD ATK/DPS). It returns the SAME array when nothing is running (the HUD asks every
frame). The tag is not trimmed while typed (it ate the space in "Assault Rifle"); the compare trims.

**His tags are "Gun" and "Meelee"** (his spelling, on every melee weapon: Bat, Cane, Machete, Shock
Baton). The pack matches it. A third tag "Vietnam" sits on every pack record (he already has a
Vietnam floor button and a Vietkong look folder).

**Delivered (asset-data/library.json, additive, 9 new ids):**
- Rifles, all ranged / Bullet 6ufkkia / the M16's fire+hit sounds / no land fire: `msnngt1`
  Mosin-Nagant (22 dmg, 0.8/s, 5 rounds, range 34, rare), `m40snpr` M40 Sniper (30, 0.6/s, 5, range
  42, scope, legendary), `typ53cb` Type 53 Carbine (18, 1/s, 5, range 28, spike bayonet out, common).
- Clothing: `bnyhat1` Boonie Hat (Gun x1.5), `flkvst1` Flak Vest (jacket, Gun x1.25, Def 8),
  `rdbndna` Red Bandana (hat, ignoreHideIfHat, Meelee x1.5), `blkpjms` Black Pajamas (his Army Shirt's
  own fit recoloured, Meelee x1.25).
- Items: `gunoil1` Gun Oil (Gun x1.5 for 30 s), `whtstn1` Whetstone (Meelee x1.5 for 30 s).

**Weapon recipe used:** one design in the AIM view (muzzle +X, top -Y, grip at the hand), placed per
body and pose at that body's weapon-arm hand (`armShoulderPoint` + the far end turned by the arm's
rot), turned by the shoulder->hand angle, as UNFLAGGED pieces (centre pivot, like his M16). Hanging,
the muzzle points down and the top faces forward, which is how the M16 is drawn; the bore sits ~20
units above the hand (the M16's is ~22). Back pose pieces are `behindBody`, the rest `behindArm`.
Fire = rest + two flash tris + the same 🔴 muzzle marker.

**Verified in Playtest (Forest M1, Army Bob, god mode, rAF shim):** M40 shot 45 (30 x his Army Hat's
Gun 1.5); Gun Oil taken from a real drop showed "Gun damage x1.5 for 30s" on the callout and banner,
shot 68, HUD DPS 22.5 -> 34, back to 45 when the 30 s ran out. Flak Vest by a real E pickup: callout
"Increase Gun damage x1.25", shot 56. Machete: Red Bandana DPS 130 -> 195, Whetstone 130 -> 195.
Mosin aims level from the shoulder when firing and points up on Up. Harness trap: writing
`equipped.current` directly changes the HUD but not the loop's `playerAsset` (no re-render); go
through a drop + E.

## Football team walked off M3 + 🎬 trimming a state (2026-10-17)

**"I had all of the football players wander out to the level to the left, their detection range
shouldn't be that high."** Trailor Park M3 has six Seek football players at cols 59-85, all facing
left. Only the PLAYER was ever range-checked (`enemyDetects`). A hostile picks the nearest of you and
your friendlies, and `detected` for a friendly UNIT target was just `acts && huntInReach`: seen at
any distance, a leftover of "you can't stealth past a melee your minion started". Since ONE WORLD
every neighbour's units are adopted into the live set, so any ally (captured, talked, raised) a level
away was a target. Fix: `enemySensesUnit` filters the friendly candidates to the sense oval's forward
reach, in either direction. A/B in the real loop (M3 playtest, player at col 0, one football player
flipped to a captured ally at col 5): fixed, the other five stayed at 64-83 for 4 s; old rule (a
temporary window flag), all five were at cols 14-18 four seconds later.

**"Add a way for me to make animations shorter. Specifically the text crawl one, one of the part
continues too long, idk how to trimm that section."** Length only moved the END: shortened, keys past
it stayed off the end of the timeline (unseen, ungrabbable) and the scene stopped between two keys, so
the Briefing's 44 s crawl cut to 30 froze a third short. Length also applied on every keystroke, so a
tail cut would have destroyed keys while typing. Now: Length commits on Enter/blur; ⇔ Stretch scales
every key (the crawl just runs faster and still reaches its last key); unticked, shortening cuts the
tail and keys the frame at the new end; ✂ Start / ✂ End cut at the playhead (a cut start re-keys every
layer at the new 0). Checked in the editor on gnrlbrf: stretch 44 to 30 put the end key at 30; ✂ End and
✂ Start at 21.55 s left the crawl at the identical translateY. ✂ needed a symbol slot (mdi:content-cut).

## THE GAME FRONT END: title, main menu, saves, options, unlocks (2026-10-17)

Blake: "the main game is still in its asset builder but I have everything I need for a stand alone
for the first floor. Separate from the asset builder with a seperate more direct UI. I want it to
start as before anything else even loads 'Blake presents..' in like the font at the beginning of
elder scrolls v Skyrim and then after half a second I want 'Bob' to pop up then it loads into the
game", with a menu of "New game" "Load Game" "options" "unlocks" "quit game". He asked whether he
needed a second StackBlitz link and whether to use Gemini or Claude for the loading screen. Answer:
neither. It is the same app at a second address, so every play fix reaches both.

- **Why not a second app:** the run engine (physics, AI, camera, gates, cutscenes) lives inside the
  one `AssetStudio` component and its refs. Copying it out would have been a second 28,000-line copy to
  keep in step. Instead `AssetStudio({ game })` hides every editor bar with `.bb.gameMode` and renders
  the game's screens when it is not in a level.
- **"Before anything else even loads":** the title is in public/index.html as plain HTML/CSS behind
  a path check, so it plays while the bundle (megabytes; more in StackBlitz's dev build) downloads.
  It waits for Cinzel (≤1.2 s) so the words never swap face mid-fade. The React side (TitleHandoff)
  fades it over the menu once the library AND the levels are loaded. The studio loads levels only
  when the Level Creator opens, so the game calls loadLevels/Textures/BgLib/Dialogues itself. The fading
  intro keeps taking clicks so a skip-click cannot land on a menu row.
- **Saves:** their own IndexedDB database. The keeper reads every IndexedDB record of a game address
  off disk but keeps only string values under the studio's key families; game saves are objects, so
  they never reach his folder. localStorage is full on his copies. The first load after a save showed
  no objective: the arrival check redraws the list only when it changes, and the restored list is no
  change. applyGameResume now sets it.
- **Verified in the dev server's /game/ (pane, sound muted through the game's own options):** intro
  frames black → "Blake presents…" → "Bob"; menu by keyboard; New Game put Bob in bed in S1 (seed
  211368, the 8-level chain S1 → E1) with no editor visible; checkpoint at S1 then at M3 with gate W2
  after a crossing; Esc froze the player while `d` was held and Resume did not walk on; Quit to Main
  Menu → Load Game listed "Bob | Trailor Park M3 | Score 500" and loading went live at M3 x=0 with the
  score; Options by arrows and by a real mouse drag (Music 10 → 50%, 280 px slider); Quit Game closed
  the script-opened tab, and with window.close stubbed showed the black screen and came back on a key;
  the floor-end hook showed Floor Complete and dropped the save; a kill put through the loot pass
  added Footbob to Unlocks and the loop kept running. Pane screenshots lag a frame and shrink when an
  emulated size is wider than the pane (506 px here). Read the DOM, not the picture.
- **Not verified:** the whole floor played start to finish in the game, the scaled view on his
  3440×1440 screen (paint cost grows with the window), menu music (none yet), and gamepad input (none).

## 🎬 "THE EDITS WON'T STAY" (2026-10-17)

He kept making General's Briefing's crawl white and deleting State 3 (the last line popped on, vanished, then
faded back in), and it kept coming back yellow and jumpy. Every store on his PC was read: Chrome and Edge IndexedDB,
the StackBlitz preview's store AND its partitioned twin under WebStorage/476 (the preview embedded in the StackBlitz
page), the save folder and History. No copy ever held a save of either change: only 💾 wrote, and Menu, ✚ New, 📂 on
the open animation and any page reload dropped the screen silently. Fixed by the editor saving itself. Same night:
the keeper never swept WebStorage buckets (now it does), and a record I wrote straight into Saves/assets was never
published online, so the game kept the old one until it was POSTed through /__library.

## THE GAME'S NEW LOOK, CHARACTER SELECT AND DIFFICULTY (2026-10-18)

Blake sent two mock-ups: the intro ("BLAKE Presents..." in a blackletter, then a slanted BOB with a
grey-green outline) and a main menu (a green panel down the left over a park with figures). He
also said the game is called **BOB** — "the Okay is hallucinated in" — so every display string
that said "Bob Okay" now says BOB (paths on his PC keep the old folder name).

- **Fonts.** A sheet of 7 blackletters and 14 squared italics was rendered beside his image. The
  intro image was set in New Rocker; he chose **Sarpanch 900 "with the slant"** for BOB (upright
  face + skewX(-9deg), so it is "slightly more squared and slightly less angled" than his mock).
- **The menu backdrop.** He wanted "actual characters not those made up ones". The first cut drew
  a random top-5 level; he called it "a pretty boring level" with a low-quality trailer, and said
  the diagonal stripes on the panel and the spinning rays on the P1 card were unwanted textures.
  Fixes: a fixed ranking (drawn props x3, emoji capped at 40, units x6), flat fills, and then —
  his next ask — a different level behind every screen. A first walker pass put two characters
  on collision-only cells high in the sky: the surface now ignores hidden-in-play fills and the
  cast only starts within 4 rows of the main ground.
- **Character select.** "Inboxes like in super smash bros", pulling the Starter folder. Box art
  first framed head-and-chest; he asked for "pretty much neck up / head", and for the full-body
  card to show the fighter "fully dressed … a random pants and shirt item". The walkers behind
  the menus wear the same rolled clothes ("better if the player in the screenshot was fully
  dressed").
- **Difficulty.** Easy 4, Medium 2, Hard 1 lives, then a Game Over / Retry screen. Verified in a
  dev /game/: Hard → one death → Game Over → Retry starts the same seed with the same fighter.

## Generate for one floor: Vietnam (2026-10-18)

Blake: "even though there is only one level for it, make sure generate works for vietnam". His
Vietnam floor is one middle level, Forest M1 (Right Upper open, Left Lower accepting "Vietnam").
buildRun took every saved level and started at an Intro whenever the pool had one, and the only
Intro is Trailor Park S1, so every seed rolled Trailor Park and Forest M1 could never be laid.
Now buildRun takes `opts.floor`: the Intro, the Exit and (with no Intro) the first level must be
on it. Later levels still join by gates, so a gate naming another floor still crosses. 🎲 Generate
has a floor box opening on the editor level's floor; 🏁 Play this run and Hold-R reroll keep it.
Verified on his online save in a prod build: Trailor Park seeds 1-3 roll the same chains as
before; Vietnam rolls "1 level, Forest M1" and Play this run starts "level 1 of 1 · Forest M1".

## FOREST M2 — THE ROCKET PROGRAM (2026-10-18)

Blake: "make a Forest M2 level ... themed around a vietkong rocket program (Like NASA) and you can go
somewhat wild and make whatever assets you'd like ... do keep in mind it's in a jungle". His Forest M1
(llbe2ks) is an early draft; its trees are not rounded yet ("I have yet to round the edges of some
trees but will"), so nothing of his was touched. New level `vcfrm02` "Forest M2", floor Vietnam,
180 x 46, ground on row 38 and berms on row 36 at both seams to meet M1's edges.

- **Gates:** W1 and E2 open, blank (= Vietnam). M1 has E1 + W2 open (W2 accepts "Vietnam"), so both pairs
  agree on both seams and buildRun lays M1>M2 and M2>M1 (checked over 40 seeds with { floor: "Vietnam" }).
- **West to east:** the Program Sign (a 💬 sign reads it), the trail depot under two camo nets (rocket
  bicycles, fuel drums), MISSION CONTROL, a stilt hut (plank floor row 29, eight clear rows under it,
  bamboo back wall, thatch roof in Front paint rows 15-20) reached up a grass hillside from the west and a
  ladder at its east end; the launch site (stone pad one row up, the Bamboo Gantry with two decks, the
  rocket, the plunger behind sandbags); the crash site of VC-0, still smoking.
- **The launch is a 🎬 "Walk up + E" animation** (`vcrlnch`, stage cols 100-143, marker on its bottom-left
  cell). The rocket only exists in the stage. E within reach of the plunger: countdown (Bob pushes it,
  the rocket rocks, smoke), liftoff with his explosion sound (aghad42), the rocket flies off the top,
  smoke clears, you take over. Measured in the dev build: the prompt shows, the layers move, the stage
  ends empty, Bob stands at the plunger.
- **Cast:** his Viatnamese 1/2/3 as hostiles (his M1 spawn shape: seek, T1 gear, Molotovs) with his
  machete, the Type 53 and a Mosin lookout on the gantry's top deck, and his Elaphant; inside the hut
  three talkers: Quartermaster (shop act, tag Vietnam: his Vietnam pack), Chief Engineer (100 points,
  heal, or hostile), Volunteer Pilot (heal, or "friendly" - he joins you). Pedestals: Item/Drink in the
  hut, Vietnam kit on the top deck.
- **New records:** 15 props in category "Rocket Program" (`vcr*`), anim `vcrlnch`, textures `vcbmbo1`
  Bamboo and `vcthch1` Thatch (new `bamboo`/`thatch` registry entries, icons gi:bamboo / gi:hut),
  dialogues `dlgvcsg` `dlgvceg` `dlgvcqm` `dlgvcpl`. Pack file: assets/forest-m2-rocket-program-pack.json
  (a version-1 backup, so importing it only adds). Every asset passes editorReachIssues.
- **Two climbing bugs found by driving it** (both now CLAUDE.md rules): the hut ladder's top cell level
  with the floor pinned Bob at feet 871 against a floor at 870 and he could not step off; with the ladder
  one row higher, the gantry's decks eight rows apart put his head in the upper deck at the lower ladder's
  top. Decks now rows 19 and 28.
- **Recipe:** generators vcprops.js (whole-cell grid; the drawing is stretched onto its grid, with a warning
  past 6%), vclevel.js (trees as ellipse lobes whose row ends become ONE ramp across the cells that stick
  out; one-cell ramps on every row end made a sawtooth), vcdeliver.js (text insertion, proofs) in session
  5786b7e8's scratchpad. Drive: dev server seeded with his folder export + the new records, gated
  MessageChannel shim and frame-scripted key holds as page scripts.
- **Not verified:** the look on his 3084 px view, the fight's difficulty, and the run seam with M1 in play
  (buildRun was checked, the crossing was not walked).

* **Horse Mask (`hrsmsk1`), Zebra Shirt (`zbrshrt`), Horse hooves (`hrshoof`), the 🦓 Zebra texture (`zebra`,
  record `zbrtex1`), and the 🧯 Fire Immunity / 🪖 Explosion Immunity abilities, 2026-10-18.** Blake asked for a black
  and white horse mask "obviously a mask as we do", the two immunities, a zebra shirt, and shoes called "Horse hooves".
  Pack file: assets/horse-mask-zebra-shirt-hooves.json (a version-1 backup, textures included). Tag `Horse` on all
  three (T1/Mask/Horse, T1/Shirt/Horse, T1/Shoes/Horse) so a gear tag rolls them as a set. Stats, rank and value are my
  picks; effects are left empty for him to assign the new immunities.
  - **The mask is the Alien Mask idiom**: two `#1d1b1b` straps drawn first (they show past the face plate and across
    the back of the head), a long white face plate whose muzzle hangs below the chin, black ears / forelock / nostrils,
    and the wearer's eyes through circle cutters on that body's iris. Every body and pose is mapped from alnmsk1's OWN
    plate (front/up/crouch), side plate and back straps, then the eye hole is re-placed on the body's iris. Back = straps
    + `behindBody` ears tall enough to tuck under the hair. `ignoreHideIfHat` keeps the hair.
  - **The shirt is his Blue Shirt box for box**, cloth pieces `tex: zbrtex1`, collar black. His Blue Shirt runs at
    `fx.bright` 0.8, which turned the zebra white grey in Dress Bob: the cloth is at 1.
  - **The hooves sit on his Bob's Shoes sole box** per body and pose: black hoof poly, steel `#8a929c` horseshoe, white
    tufted fetlock, all `limb:"leg"` and mirrored like his. Front hooves stop at the leg's inner edge (x 98) or the
    two feet merge into one block. The side slant is kept small: the mirrored far foot otherwise makes a cone.
  - **The zebra texture**: three bands per 40-unit tile whose centre wanders (two sines) and width swells, periodic in
    the tile height; some throw a tapering fork into the gap. Drawn one tile over each way so nothing clips at a seam.
  - **Driven in a real playtest** (seeded level, three clones of the Bob look: fireproof, blastproof, control): in the
    same fire the fireproof unit stayed 35/35 while the control burned to death in under a second; the player in fire
    held HP with the burn pool at 0 (a guard unit punching through it was the only loss, stunned to prove it); a
    60-damage RPG point-blank killed the control unit and the control PLAYER (instant respawn), while a blastproof unit
    3 cells from the blast and a blastproof player 2 cells from it took nothing. Not driven: thrown-grenade contact and
    the flamethrower wash-over (unit-tested helpers, same gate shape as the driven sites).
  - **Trap:** a brand-new store's startup `loadTextures` had not restored the new texture 8 s in; opening any editor
    (which calls it again) did. Assets were already there.

* **🐞 Lucky, 🪞 Reflect, 🚒 Fire Resistance + Lucky Hat, Spiked Jacket, Fireman's Coat and Helmet, 2026-10-20.** Blake:
  "an ability that adds a percent chance hits will not do any damage, and added to a 'Lucky hat' you decide the design. And
  an item that has a percent change to reflect damage back at the attacker ... maybe a jacket? I would also like a firemans
  jacket and hat, each with fire resistance."
  - **One gate, sixteen callers.** Damage had no single choke point on the unit side (12 `enemyHP` writes) and six on yours,
    so `shrugsHit` is asked at each one right after the damage number and before HP moves. Two existing grep-tests moved:
    `playerHpAfterHit` is now 7 (a reflect onto you), `unitUntouchable(` 6 (a reflect onto a unit honours only the revive
    grace: its i-frames from the blow it just took would otherwise swallow most reflections). The reflected line uses
    `- loss)` so the "every hit starts i-frames" test leaves it alone; a reflection is not a blow.
  - **Attackers:** your shots have no `shooterKey` (so "player"), a unit's do; unit throws got `throwerKey`. A foe's
    throw or blast with no key reflects to nobody. Your 👢 head stomp still bounces when the hit is shrugged.
  - **Fire Resistance is new rather than reusing 🧯** because a coat AND a helmet each "with fire resistance" only makes sense
    if they add up; immunity on both would make one of them pointless. Coat 40% + helmet 25% = 55% off.
  - **Art:** both jackets are his Leather Jacket's boxes per fit and pose. Spikes stand on the torso panel's WORLD top edge
    (his Bobbett panels are r175, upside down, so local "top" is the hem — the first render put the spikes at her hips).
    The coat is closed down the middle (a turned panel overlaps to x 96 or it gapes at the hem), 14 longer, with three
    `#e9ecef` reflective bands; the sleeve band is a sub-box placed in the sleeve's own rotated frame (`subBox`:
    d = (I-R)(O-T)). Lucky Hat = green bowler + four-leaf clover; helmet = red dome, gold front shield, long rear brim.
    Generators: scratchpad gen.js / view.js / deliver.js (session c314f27c).
  - **Driven in the running studio** (seeded flat level, Bob clones with 75% reflect / 75% lucky / 40%+25% resist): a Squirrel
    biting plain Bob took him 35→26→17→8→dead; on Reflect Bob it went 25→16→7→dead with him at 35/35; on Lucky Bob 3 bites
    in 10 s landed. Plain Bob shooting a Reflect Bob enemy with the Experimental Rifle lost HP to his own rounds. In a fire
    row plain Bob burned ~18 HP/s, resistant Bob ~8.4 (0.47, expected 0.45). Both marks drew in their slot colours.

## 2026-10-21: Fire / Ice / Double Shot / One Up, and "save and open autosaved the red one onto the black one"

- **What he asked:** a One Up for items, a Double Shot clothing ability, Fire damage and Ice damage for weapons; on fire "a
  reddish orange fire glow and sort of sparks", 2 damage/s for 10 s; ice "a white outline and effects", 1 damage/s, "half
  agility and speed".
- **Fire = the existing Ignite.** Ignite (2026-10-18) was an agent's name for the Flamethrower's burn. A second fire
  ability would have needed its own pool, immunity and look and stacked into a burn nobody set, so the picker now says
  "Fire damage" and a fresh add starts on 10 s at 2/s. The old glow showed only on the 12 frames after each HP tick, so at
  2/s it blinked; `bodyBurning` covers the whole clock.
- **Ice** is a twin pool (`chill`, `chillPool`). "Half agility" is read as half the jump HEIGHT (stat-halving would do
  nothing to an Agility-1 look and only 25% to speed). Drained in the loop beside the burn, both sides.
- **Double Shot** twins are PARALLEL, not fanned: a fanned twin missed anything closer than a few cells. A unit's pair
  hitting YOU was swallowed by your i-frames after the first round, hence `pair` / `p.invulnPair`.
- **One Up** is a RUN life (head row), not a 🐱 Extra Life, because he split those two on 2026-10-18.
- **Driven in a seeded studio Playtest:** one trigger pull with Double Shot put 2 rounds up, 13 px apart; the ice M16 gave
  the enemy the white rim + 7 frost particles and took 1 HP per 60 frames; chilled walk 6.2 → 2.9 px/frame; Bobs Gun with
  Fire damage gave the glow + 8 sparks and 1 HP per ~29 frames; the One Up pedestal added a head (0 → 1) and a fire death
  spent it (1 → 0, back to the start).

### The Black shirt and Scarf overwrite

He opened Black shirt and Scarf (`vv3nkdu`), recoloured it red, pressed 💾 Save & Open, renamed it "Red shirt and
Scarf" and saved. The rename forked `eo0mino` correctly, but the 1.2 s autosave and Save & Open's own save had ALREADY
written the red onto `vv3nkdu` under its old name, and every one of those saves re-baked the look wearing it
(Viatnamese 4, `dd1w8a2`) red too. 92 s later the same red was saved over `vv3nkdu` again.
**Recovery:** the keeper was dead (again). The folder and the saves branch still held the black (Oct 18). Reviving it swept
the red version in, then History held both. Black (History 1792354680292) and Viatnamese 4 (History 1792542744406, whose only
change since was the re-baked shirt) were POSTed back to the keeper with savedAt = now. Fallback bundle in Downloads:
"Black shirt and Scarf - restored 2026-10-21.json".
**Fix:** `saveAsRestores`: the asset and animation editors remember the stored record as OPENED, and a save that forks
writes it back over the original (re-baking the looks that wear it). Save & Open still saves in place, because the
Flamethrower report (2026-10-19) was exactly an edit lost to a Save & Open that did not save. Verified in the studio: the
autosave wrote Defense 9 over a test shirt saved at 3, and the rename's save left the original at 3 and the fork at 9, both
for a freshly made item and for one reopened from 📂 Load.


## 2026-10-21 (evening): "WHERE THE FUCK DID MY SHIT GO" - the keeper had been broken since 10-18

- **Lost-looking:** 1UP (new item 5z2auvk), Forest M3 (new level ihufs6x), Forest M1, AK-47, Flamethrower, Fireman's Coat.
  All six were in StackBlitz tab hzer--3000--ab3f81c1's IndexedDB (Chrome Default profile) and nowhere else; his
  fresh tab hzer-3vb61t3b had opened on the online save without them. Restarting the keeper swept them (5 newer + 1
  combined) and published; checked in the folder and on the saves branch.
- **Why:** the REAL install (%LOCALAPPDATA%\BobOkay, not the Claude app's virtualized copy) went corrupt in an update on
  10-18 at 1:23 PM ("fatal: bad object HEAD", tools\bob-okay.js gone). Its log stops at 10-18 9:34 AM. The sign-in .cmd
  found no bob-okay.js and exited silently, so from then on the only keepers were ones agents started from inside Claude:
  those run in the agent's job object and the virtualized home, and die with the session (no crash line). Today's
  agent-started keeper died at 7:12 PM. "Dead again at session start" in the memory notes since 10-18 is this.
- **Fixed:** cloneBroken/repairClone (rebuild the clone in place: fresh .git, fetch, reset; the process cwd is the clone so
  it cannot be renamed); the sign-in .cmd rebuilds it the same way and logs if it cannot; the studio's red "Not backed up"
  banner when a save has not reached the online save in 8 minutes (backupWatch). Both repair paths were run against a
  scratch clone broken exactly like his; the banner was driven in the dev studio with a local stand-in online save
  (shows when the save is missing past 8 min, clears when the snapshot holds it).
- An agent's attempt to repair the real install through WMI was refused by the permission layer; Blake runs it himself.
## Rooms play zoomed in (2026-10-23)

- Blake: "make the playable screen bigger when you go into rooms? There is a ton of dead space around the player".
  A room (40x24, 1,200x720 px) was drawn at the street's 1:1 scale, so on his ~3,084x871 studio view it sat in a
  small box in a black screen with the body a quarter of the view tall.
- Now the camera scales a room until the view is 16 rows tall (`roomViewZoom`), stopping where the room covers the
  view and never going below 1. His studio view gets ~1.8x; his fullscreen game view (29 rows, 3440:1440) gets the
  room edge to edge. The scale is a transform about .lgrid's top-left, so the camera centres a narrow room itself
  (`centreRoomInView`) and .lgrid's margin is 0 while zoomed. `.zoomed` drops will-change, because a
  will-change:transform layer made at scale 1 on the street would be stretched blurry, never re-rastered.
- Verified in the dev studio at 3084x1200 (view 2728x906): Trailor Park S1 street at z 1 with an unchanged
  transform, its Trailor Int door swaps to scale(1.8875) on the full-black frame, the room centred (grid left 246
  = (2728-2265)/2 + border), the camera follows W/S up the carpet and clamps at 720 - 480, the NPC drawn, and
  leaving swaps back to z 1 on black.

## Climb aim + Viet Bob / Bob Li locks + Coming Soon (2026-10-24)

- Blake: "jankyness when aiming left or right on some climbing surfaces. Like your arms go the other way." Reproduced on
  Trailor Park M2 hanging from the power line (cliff cells, row 25) beside the col-35 ladder, as Bob with the M16:
  fire right = arm level, fire left = arm straight down, rifle at the floor. p.firing.aimTilt was 85: the aim assist's
  FLOOR LOCK (the Squirrel-at-your-feet rule) uses the player's feet as "your floor", and hanging, the feet were a
  cell above the ground where a unit stood to the left. Point-blank rule, 85°. The ladder itself was fine both ways
  (no unit within a cell of the feet). Fix: floorLock only when not climbing (playerFloorLocks); a 🚶 plane keeps it.
  Re-driven on the same spot: tilt 0, arm out to the left. Proof was rasterized PNGs of .playerWrap (the pane was hidden).
- Locks: Viet Bob = Vietnam floor on Hard (the Rob rule). Bob Li = meet Bob Li: openTalk notes the DIALOGUE name into
  record.met (verified in a dev game: reading the TV sign wrote "tv news (controls)" to bobOkayGame). Viet Bob opens
  when gameFinishFloor records a level whose floor is Vietnam, on Hard; not played through to that end here.
- Select order: open first (Bob, A-Z), locked after (A-Z); an unlock moves up into its alphabetical place. Coming Soon
  fills a short last row (9 starters = 5 + 4 + 1). Bob's head alone is a square, so its outline read as an empty
  frame; the whole body reads as Bob. The fighter portrait fills its box, so an outline of it clipped to two brackets.
  Screens checked with headless Edge (real fonts): locked state, and a record with Bob Li met + Vietnam on Hard.
- Round 2 (same day): "When I said Bobs Outline I mean outline of what Bob would look like if he was locked" = the
  locked box's dark silhouette, not a drawn outline; Coming Soon is now that (no padlock). And the boxes show the
  randomized dressed look (gameDressed, the same roll as the P1 card) instead of the look in its underwear.
- Same day: "change this color everywhere does not effect see through ness." The 👻 slider wrote updSelAll only
  (on 10-10 I had ruled it out of the 🪣 path, after "it faded everything"). Now with 🪣 on it goes through the
  colour group like Brightness and Fade (seeThroughAssetGroup, held through the drag), the title reads "this color
  everywhere", and see-through is part of the colour (fillLook.see). Verified in the editor on Bobby Skin: at 40%
  all 30 white blocks (4 poses x 2 fits) faded, the 30 grey hair blocks of the same hex did not, back to 0 removed
  the key, and with 🪣 off it was one block. A fiber read from a DOM node showed the old value; the root's
  current tree had the new one.

## 🪃 Boomerang + Box of Playing Cards (2026-10-25)

- Blake: a boomerang ability for weapons AND grenades. "Instead of a projectile when you fire it throws and spins the
  item like a boomerang", a light homing, "generally goes forward its range and then back, no back tracking". The
  weapon one pierces both ways and has no reload: "one shot per and you are reloaded when your Boomerang returns". The
  grenade one does not pierce, comes back if it hits nothing, and "you can throw multiple at once". Two items: a box of
  playing cards (Grenade) with 52, and a boomerang.
- `WEAPON_ABILITIES.boomerang` (types ranged + throw). On a gun it is the whole firing mode, so it takes off burst,
  full auto, pierce, homing and resurrect (each of those takes it off again); on a throwable the payloads stay. One
  flight for both: `boomerangLaunch` (the aim, at `BOOMERANG_THROW_SPEED_CELLS`), `boomerangStep` (out, easing off near
  the range; `boomerangTurnHome` at the range, a wall or the floor; home at the hand, re-aimed every frame, caught
  within `BOOMERANG_CATCH_CELLS`, and `BOOMERANG_RETURN_FRAMES` as a hard stop so it always ends). The homing is
  `boomerangPick`: the nearest body ahead inside `BOOMERANG_HOME_CONE_DEG` of the aim, never one already hit, never on
  the way home. With nobody in the cone it eases back to `aim0`: before that, a throw that bent toward a body kept the
  bent heading once past it and flew off at an angle.
- Gun: `boomerangRound` puts the weapon's own art on the shot, the shot pierces, and the hit list resets at the turn,
  so the way back hits them again. `weaponClipSize` is 1 and `boomerangAmmo` loads it the frame none of yours is in
  the air (`boomerangOwners`): no reload timer at all, the clip/reload inputs hide on the card. The held art hides
  while it is out. `weaponDpsOver` counts a trip (`boomerangTripFrames`), two hits a throw.
- Throwable: the `thrown` entry carries `boomerang: true, owner`. It lands only on a body (struck or catchable) and is
  spent there; a wall or the floor turns it instead of landing it. Caught: `throwCarry` (the player) or `throwLeft`
  (a unit) goes up by one. The 18-frame throw cooldown is what spaces a hand of cards; three in the air were seen.
- Aim assist is skipped for a boomerang gun: `aimAssistAngle` solves for a falling round, and on this straight
  throw it tilted the launch about 12° down at a body's centre. The trajectory preview is `boomerangLinePoints`.
- Found on the way: the level effect that clears `thrown` on arrival re-ran when a throw's landing painted the level
  (setLevel), so one card landing on a unit wiped every other card in the air. `thrownPlaceKey` (run id + level) now
  keeps them unless the place changed; a door hands any boomerang in flight back to its thrower.
- `throwPickupCount` (`pickupCount` on the throwable, `DEFAULT_THROW_PICKUP` 3, max `THROW_PICKUP_MAX`) replaced the
  hardcoded 3 at the pedestal, the shop (and `shopUnowned`), the shop label and Playtest's "Start with". A "Comes in"
  input on the throwable card. Past 12 the HUD pips are the icon + "×N".
- Items: Boomerang `boomrg1` (ranged, 14 damage, Range 12, one wooden "<" poly with a dark edge, `limb: "arm"`,
  centred on each body's hand) and Box of Playing Cards `cardbx1` (throw, 52, 6 damage, no payload; a white card with
  a red diamond). Both fit BoB and Bobbett.
- Verified in the running app: the gun pierced two units, turned, hit both again and came home (ammo 0 → 1); a card
  that missed came home (50 → 51); a card on a unit did 6 and stayed spent; a unit with the gun hit the player both
  ways and caught it; a unit's dodged card went back to it (2 → 3).
- Round 2 (same day): Blake sent a photo of a wooden boomerang with red-painted tips: "redesign the Boomerang
  visually ... closer to this design, but as I often tell you, don't cheat". The wood is ONE 〰️ Curve stroke (start,
  a point through the elbow, end; 9 thick), checked in jest against App.js's own curveBandPoints/polyBoxFromPoints
  for all 30 pose lists. Each red tip is an ⬭ Oval turned to the arm's end angle (whole degrees, half-unit box,
  pivoting at the top centre like every arm-flagged weapon block) and sent UNDER the wood, so the wood's square end
  is the paint line and the Oval's round end is the tip. Bob holds it by the back wing, just past the red.
- The first try used `outline: true`, as the first Boomerang did. In the running editor the wood's edge came out
  ~4px against the Ovals' 2px: on a clip-path shape the outline is eight chained drop-shadows (OUTLINE_RING_PX 1.4
  each way, adding up), while a square/circle/oval gets one 2px box-shadow ring. His save: 130 assets use poly pieces
  and only 3 outline one, all agent-built. So the edge is now its own pieces: the same Curve clicks drawn 4 thicker
  in #1d1b1b, and each Oval duplicated 4 bigger, all under the colour, with no outline flags. Six pieces.
- Seen in the running app (DOM rasterised through a loopback receiver, the pane being hidden): the weapon editor,
  held in Bob's hand (attachWeaponBlocks kept the turned Ovals in place), spinning in flight, the HUD icon, and a
  unit holding it. editorReachIssues [].
- Round 3 (same day): "That's still an ugly un symetrical boomerang. Also it kind of looks cheated", then "Rebuild
  the Boomerang as a symmetric arch from stock shapes, no outline, like my other weapons." A sheet of his 32 weapons
  (saves branch) showed what "like my other weapons" means: Rock, Pokeball, Katana, Bobs Bat are 4-6 stock shapes
  turned into place, no outline. Now 6 ⬭ Ovals: a short wing at ±14° from the apex and a long one at ±42°, each
  joined cap-centre to cap-centre so the joints round off, and a red Oval on each end. Every piece has a mirror twin
  at -rot, centres reflected about the apex (App.test.js pins it, with editorReachIssues [] and no outline/limb).
- Three things only the running game showed. Held by the back wing, it sat behind Bob's wide side arm; held by the
  top of the apex it hangs symmetric below the hand. `behindArm` splices weapon pieces in before the arm, so Bob's
  legs and Bobbett's hips (later in the body list) covered the arch: no flag now, like his Rock and Grenade. His
  photo's light tan (#dcaa64) vanished against bare skin; #b0743a reads on skin and grass. And the HUD close-up had
  a hairline of wood round each red tip (two coincident edges, each anti-aliased): the wood now ends under the red.

## 🔇 Test mute (2026-10-25)

- Blake, while the Boomerang redesign was being checked: "Turn off the music. In fact, just turn off the music in testing
  in general". The agent's hidden Browser-pane tab was in ▶ Playtest on zz Boomerang Test and its music was coming out
  of his speakers. The page had the usual injected mute (an AudioContext whose `destination` is a zero gain), which
  silenced the effects, but the music is `music.el`, a plain `new Audio()` element in audio.js, which no Web Audio mute
  reaches. Closing the tab stopped it.
- `testMuteOn()` in audio.js, the twin of 🛡 `godModeOn`: `window.__bobMute`, `?mute` in the address, or localStorage
  `bobMute` = "1". The engine now runs master -> `gate` -> speakers; `applyMute()` (before every voice, talk loop,
  music sync, long preview and the first-input unlock) sets the gate to 0 and `muted` on the music and preview
  elements. Nothing else changes: moments start, trace and loop as before. `state().muted` says which.
- Verified in the dev server opened at `/?mute` with the studio's 🎵 On: in a Playtest the music element's play() was
  called already muted by the game, and the one gain feeding the speakers was the gate at 0 (the keep-awake source,
  1e-6, still goes direct, as designed). The page also carried a safety-net mute so the check itself made no sound.

## 🌴 Forest M5 (2026-10-25)

- Blake: "make another Vietnam level? Just lower to lower like most are, and for this one I want it to mostly just be
  thick jungle vegetation and trees and stuff. There should be a single shack some where (We will have more shacks later)".
- vcfrm05, 160x46, W2/E2 open with accepts "Vietnam", ground on row 36 at both seams. Painted the way his Forest levels
  are: chamfered canopy blobs of cells on Background (far wall, middle tier, near trees, understory) and Front (the roof
  you walk under, three trees on trunks with Tree Roots), his Vietnam grass, night sky and 🔶 stars, his Bush and Berry
  Bushes, a fallen log (one row, a hop) with his Shelf Fungus. The shack is HIS Forest M4 shack copied cell for cell 28
  columns right, door marker tag "Shaq" (enters VShaq). 7 Viet Cong on Seek, his M1/M2 placement shape.
- Four new Nature props, all stock pieces (editorReachIssues empty): Banana Plant vjbanan, Jungle Palm vjpalm1, Elephant
  Ear vjtaro1, Bamboo Clump vjbmboo.
- **Density budget.** The first draft had 2.7x Forest M1's elements in the level DOM (7085 vs 2617) and ran 21-26 fps
  against M1's ~60 in the Browser pane. Every 45° canopy corner is its own clipped tile (plain cells merge into runs), and
  each prop piece is ~2 divs. Trimmed to ~4400 (1.7x): corners only on the visible outline, the middle tier as single
  crowns, the understory in one colour so lumps merge into runs, 58 vine tiles instead of 184, fewer plants, and lighter
  props (palm 56->41 pieces, bamboo 60->44, elephant ear 35->25). Standing script time then matched M1. Paint on his
  GPU was not measured (the pane was hidden).

**VShaq 2, the WBOB radio shack (2026-10-25).** Blake asked for a new Shaq room (Vietnam, the 60s, "be creative") with a
basic T1 pedestal. `vshaq02` joins the "Shaq" door pool beside VShaq: a GI pirate radio station in a bamboo hut with an
A-frame thatch gable, same shell recipe as VShaq (plane rows 17-22, fences at cols 5/34, door 21,19). Eleven new props
(`wb*`: On Air Sign, WBOB Sign, Crate Desk, Reel-to-Reel with two turning frames, Desk Microphone, Record Crate, Wall
Records, PA Horn, Crank Generator, Jungle Window, Power Cable), all passing editorReachIssues. DJ Ronnie Ray (Readitor
look, dialogue `dlgwbob`, heal on one choice) and a T1 pedestal at 19,27. First playtest showed the sign cut off at the
top of the room view, hence the row-5 rule.


## Trailor Park M16 and the Liquor Store (2026-10-25)

Blake: "make a new Trailor park level that features a liquor store ... It'll be an enterable room. We can make the room
itself later." Level `trpm16a`, a W2/E2 middle built from HIS Trailor Park M5 parts: the clean road/grass column
(M5 col 44) for every column, M5's cloud rows, his power pole (M5 col 35: crossarms, pegs, ladder climb) cloned to
cols 25/88/150, his power lines (topOutline objects + cliff climb on rows 17 and 25) broken over the store, and his
cols 19-28 tree. New prop `lqstor1` Liquor Store (category Stage, 41 pieces, size 30 = exact 2:1 so 30x15 whole
cells): neon LIQUOR roof sign, PACKAGE GOODS - COLD BEER fascia, BEER/WINE windows with bottle shelves as mirror
twins, glass door with a glowing OPEN sign centred at x=100 so the door marker (33,65) lands on it. Around it: Trailer
6, parked 1960s Pickup, Newspaper Box, Drink Machine, Canned Ham, Trailor 3, and seven units copied from his own
Trailor tag / Pit Bull / Squirrel placements.

Measured in the running Level Creator: every prop's drawn bottom at y=1050 (row 35). The first pass had his Canned
Ham floating 11 px and Trailor 3 sunk 13 px (art not whole rows), fixed with `oy`. In Playtest the door prompt reads
`No room tagged "Liquor Store" yet`, and at his 886 px view the whole roof sign is on screen.

**The room (same day):** Liquor Store 1 (`lqroom1`, roomTag "Liquor Store") is Trailor Int5's top-down shell cell for
cell (plane rows 13-22 / cols 6-33, hideInPlay fences at cols 5/34, exit door 21,19), reskinned: White Stone brick side
walls, Ceiling Tile ceiling, White panels back wall (Int5's window filled in), his Checker tile floor. A ramp cell's `more`
fill is the wall half under a ceiling ramp, so a reskin must recolour `more` too (the first pass left Int5's red
panelling showing in the top corners). Seven props under the category Liquor Store (Liquor Shelf, Wine Shelf, Beer Cooler,
Store Counter, Neon Beer Sign, No Checks Sign, Beer Case Stack), all editorReachIssues []. The Shop Keeper at 13,26 with
`dlgliq1`: shop tag "Drink" (Energy Drink, Bepsi, Blu Vodka, 5LOKO), a draft line, and "This is a stick-up!" turns him
hostile with Bobs Bat. Driven live: E at M16's door enters on the plane, the back row shows the whole back wall, talk
and the shop open, E at the front door returns to M16 at the store. A text piece 0.95 cells tall clipped "NO CHECKS
CASHED" in play; text width scales with the box height, so size a long line's height to fit its width.

**Forest M6 (`vcfrm06`, 2026-10-26).** Blake: another dense-jungle Vietnam level with animals, melee mostly on Seek,
some random tags, and a tree entrance like Forest M1's. Generated (scratchpad levelgen-m6.js, seed 6061) with the Forest
M5 layering: painted-cell canopies on bg/Front, his Vietnam grass, night sky + 🔶 stars, the jungle plant props. W2/E2
"Vietnam", ground row 36 at both seams. West: a mud creek bed (row 38) with two Crocodiles and a hidden Item/Drink
pedestal; a ridge (row 34) with a giant #2a2017 tree: 10-wide trunk, flared foot, M1's #1d1b1b hollow made 3x5 with a
pointed top and a #5b4636 bark lip so it reads at night, his Oil Lantern inside, door tag "Tree" (any Tree Int room).
Spawns copy HIS M3/M4 tag shape: 🎲 Vietkong melee rolling T1 + Meelee (5 Seek, 1 Guard by the tree, 2 with Molotovs),
🎲 Vietkong gunners rolling T1 + Gun (Guard), Elaphant, Turtle and two Rats on Seek, one 🎲 "Enemies" on Guard.
Driven live: the playtest opens on the creek crocs; at the hollow "Press E to enter" shows and E lands in Tree Int 1.
~4000 elements under .lgrid in play (M5 shipped ~4400).

**Forest M7, the movie set (`vcfrm07`, 2026-10-28).** Blake: a Vietnam level that is a war-movie set, with any props
or items it needs. Generated (scratchpad mv/levelgen.js, seed 7071) with the M5/M6 layering, W2/E2 "Vietnam", ground
row 36 at both seams. West to east: jungle; the basecamp (APOCALYPSE BOB production sign, his trailer, wardrobe rack,
makeup mirror, road cases, the Craft Services sign over his Card Table/Coffee Urn/Doughnut Box, his Army Truck as the
grip truck, his crates and sandbags); video village (Quiet On Set
light, monitor cart, Director's Chair, the camera on a dolly track, boom mic); a camera crane; the set on a rise
(painted sunset backdrop, two hut facades with their braces showing, a prop palm, pyro mortars, smoke and wind
machines, a lit film light); a climbable Light Tower (ladder col 173 through a 1-wide hole in a hideInPlay deck at
row 24, a gunner extra and a Movie Set/Gun pedestal on top). 24 props in category "Movie Set", all editorReachIssues
[] and seated by levelObjectFootprint. Items: the Megaphone (`mgphn01`, melee, placed in the Machete's grip frame on
every variant/state/view) and Craft Services' Set Coffee (+3 Speed 120 s), Craft Donut (heal 10) and Box Lunch (heal 25).
The Director (`3t3iost`) was built and saved in Dress Bob (his BoB, skin, hat, shirt, pants, shoes) and stands at
video village on Guard holding the Megaphone; `dlgdir1` "Can I be in the movie?" → friendly (ally), "This movie
stinks." → hostile. The Craft Services board is a sign marker whose `dlgcrft` opens shop tag "Craft Services". The
extras are 🎲 Vietkong rolling T1 + Meelee (Seek, two with Molotovs) or T1 + Gun (Guard). His Vietnam grass texture
(`arsou0j`) was missing from the repo snapshot and was folded in verbatim from his online save. Driven live: the
Director's talk and both acts, the sign's shop (three items), the ladder climb to the deck, the Megaphone in his hand.
As an ally he walks off to fight the extras and can die doing it (ally behaviour, not level-specific).

**Forest M8, the UFO crash (`vcfrm08`, 2026-10-28).** Blake: a UFO crash level in Vietnam. Generated (scratchpad
ufo/levelgen.js) with the M5-M7 layering, W2/E2 "Vietnam", ground row 36 at both seams, 180 x 46. West to east: jungle
and a knoll with a VC gunner and a seeker; a red laterite crater (floor row 40, dark back wall); the Downed Saucer
(`uvsaucr`, 30 cells) nose-down in it, tilted along its own hull line; a smoking heap at the tail (row 31, the Odd +
Rare pedestal); a scorched furrow (row 37) strewn with snapped trees, a fallen trunk, hull plates, a hull ring, alien
goo, a power cell, a fire with a fire hazard; the AA nest (AA Gun, VC Flag, his sandbags and crate); the salvage camp
with Zorp's Bamboo Cage; jungle to the east edge. 12 props (`uv*`) in his own categories: Wacky (saucer, hull plate,
ring piece, power cell), Army (AA Gun, flag, salvage litter), Nature (snapped tree, fallen trunk), Exterior (cage),
Effects (animated goo and wreck smoke); all editorReachIssues [] and seated by levelObjectFootprint. The saucer is
flat house style (lens hull, dome, antenna, snapped leg, thruster bulbs, a glowing tear), and its hull top is ONE
straight line, 1 row per 3 cols, so hidden Foreground under it takes `run: 3` ramps that follow the drawn edge exactly
(the M14 saucer rule, sloped). The first pass of visible red spoil under the tail read as a staircase; it became a
dark crater hollow with hidden fill. Spawns: 🎲 Vietkong T1 + Gun (Guard) and T1 + Meelee (Seek), two Little Green Men
(`xclq3hs`) with Ray Guns (`qesn4h8`) on Guard in the crater and on the heap, and Zorp (a Little Green Man, no weapon)
in the cage whose `dlgzorp` "I'll get you out." -> "Let's go." is act friendly with 100 points. Driven live: walked
west to east and back over knoll, crater, up and down the hull, heap, furrow and camp with no snag; a seeker climbed
the hull to Bob and walked back down it; the crater alien fires its Ray Gun; Zorp's talk made him a following ally and
paid the points; the pedestal rolled the Ray Gun. ~1900 elements in play. A seeker that rolls a ranged weapon (Bobs
Bow) keeps its standoff and walks away; that is the Seek rule, not the level.

**Two stale tests after the 🦸 Flies / Eagle commit (2026-10-28).** 144548e (Argon) left two source-shape tests red. Both
were wording, not behaviour: the player's `flyState(...)` call now sits behind a `pCreatureFlies ?` branch (playing as
a flying creature), and the creature's descent lands with `landingReach` too, so the "all landings use it" count is 4,
not 3. The guarded paths (the Fly item, walking units, corpses) are unchanged; the tests now pin the new branch as well.
