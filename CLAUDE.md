# BOB — agent handoff

**This file is the RULES. Read all of it; it is kept short on purpose.** The full write-ups behind
each rule (bug stories, measurements, verification recipes, design notes) are in
**`CLAUDE-HISTORY.md`**, which is the previous CLAUDE.md kept whole. Before you change a system,
grep that file for its function names or its feature. Most systems have a section there about a
trap that already cost a day. When a code comment says "see CLAUDE.md" for a write-up, it means
that file.

## What this is

The repo holds two things, and they are NOT the same thing:

- **The studio (Bob Asset Builder).** Blake draws assets out of blocks (bodies, skins, clothes,
  weapons, enemies, props), dresses characters, paints levels, writes dialogue and playtests.
  Everything on screen today is the studio.
- **The game (BOB).** What players get. Its name is **BOB** — never "Bob Okay"; the "Okay" was an
  agent's invention he called out on 2026-10-18 (the `DocumentsBob OkaySaves` folder and the
  `Bob Okay.cmd` icon keep their old names only because they are real paths on his PC). It needs none of the studio. It is a title sequence,
  then a main menu (his 2026-10-17 list: New Game, Load Game, Options, Unlocks, Quit Game), then a
  run. Floor 1 is the Trailor Park, and its objective is "Make it to the draft office". Game-facing
  UI must not pull editor controls into it. It is BUILT (2026-10-17): see "The game front end".

It is Create React App + React 18. **Everything is in `src/App.js`** (~24,300 lines), with tests in
`src/App.test.js`. `src/saveKeeperCore.js` holds the save keeper's merge rules, `src/setupProxy.js`
serves the project file in dev, and `tools/` holds the keeper, the publisher, the rasteriser and the
Chrome store reader.

## How Blake plays it, and how your work reaches him

- He plays on **StackBlitz linked to PR #1**, branch `agent/scaled-hitboxes-projectile-range`
  (not `main`). Friends use the same link. **Pushing to that branch is the delivery.** They reload
  the link.
- The same app is published at **https://cbm971.github.io/BobAssetBuilder/**. `npm run publish`
  (`tools/publish.js`) builds it and force-pushes the build as `gh-pages`. Run it after every push
  to the play branch, or the fix stays invisible there.
- The **"Bob Okay" Desktop icon** (`tools/Bob Okay.cmd` → `tools/bob-okay.js launch`) builds the
  branch into `%LOCALAPPDATA%\BobOkay` and serves it at http://localhost:47017 alongside the save
  keeper.
- **His screen** is a 3440×1440 ultrawide at 125% scaling, with the game zoomed to 75–80%. That
  makes the level view **~3,084×871 CSS px**. Test the camera and anything sized to the view at
  that size.

## Setup and before every push

- There is no local clone, and the working folder is empty. Clone the branch into your scratchpad.
  A fresh clone has no git identity: `git config user.email "cbm971@gmail.com"` and
  `git config user.name "cbm971"`.
- Node is installed but **not on PATH**. Prepend
  `C:\Users\cbm97\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.18.0-win-x64`.
  A bare `node` check lies.
- Run `npm install` once, then **both** `CI=true npm test` and `npm run build`. Tests only cover
  pure exports; the build is what catches JSX and scope errors.
- **`src/App.js` is entirely CRLF.** A scripted edit with `\n` in its pattern silently matches
  nothing. Convert patterns with `.replace(/\n/g, "\r\n")` and assert exactly one match before
  writing. Never `sed -i` it.
- **Python is not installed**; use `node -e`. PowerShell is 5.1, so there is no `&&` and no ternary.
- Before committing: delete `build/` and run `git checkout -- package-lock.json`. Revert
  `asset-data/` if the dev server wrote to it, after reading the trap under "Saving".
- Commit with `git commit -F <file>`, **never `-m`**. Other agents push to this branch, so run
  `git fetch` then `git rebase`, and never force-push. There is no `gh` CLI; confirm a push with
  `git ls-remote`. Then run `npm run publish`.

## Verify in the running app, not just in tests

Passing tests have hidden broken render paths more than once. Start the dev server
(`BROWSER=none PORT=3000 npm start`, in the background), open it in the preview AS
`http://localhost:3000/?mute`, drive it with JavaScript, and read the DOM back as the proof.

- **Always test muted** (Blake, 2026-10-25: "turn off the music in testing in general"). The hidden
  pane's sound is real and comes out of his speakers. `?mute` in the address (or `window.__bobMute =
  true`, or localStorage `bobMute` = "1") is `testMuteOn` in audio.js: the effects' gate goes to 0
  and the music and preview `<audio>` elements play muted, so everything still starts and traces.
  An injected AudioContext mute is NOT enough: the music is an `<audio>` element, and that is how
  he heard a Playtest's music. Close every test tab when you are done.

- Buttons have no accessible names. Find them by `textContent`.
- Seed real data: `asset:<id>` + `assetIndex`, and `level:<id>` + `levelIndex`, cloned from real
  records. **Seed localStorage on the FIRST load only.** After that the app reads IndexedDB
  (`bobAssetStudio`, store `kv`), and a later localStorage write is silently shadowed. Write to IDB.
- **His newest data is the `saves` branch** (`git fetch origin saves`). It is an index + parts, so read
  it with `libraryParts.loadLibrary((n) => JSON.parse(<git show FETCH_HEAD:n>))`. `FETCH_HEAD:library.json`
  alone is only the index. The committed `asset-data/library.json` can be stale.
- **The Browser pane is usually hidden**, so rAF never fires. Inject a rAF shim (MessageChannel,
  gated) as a `<script>` element. A shim made inside a tool call dies when that call throws. Put
  the per-frame driver in a page script too. Never sample with `setTimeout(…, 0)`, which is clamped
  to 4 ms. A hidden pane never paints, so paint cost cannot be measured there. Say so; do not invent
  a number.
- The Level Creator has two character `<select>`s. Find the Playtest player picker by its
  "▢ Plain box" option. Matching it by a look's name gets the enemy picker, and you play as a box.
- To see art without a browser, run `node tools/rasterize-pieces.js --asset <id> out.png` and read
  the PNG; `--level <name> out.png [px] [c0 c1 r0 r1] [--lib file] [--play]` draws a whole level
  (props, spawns, gates). Extend that tool; do not write another. In the page, rasterise with an SVG
  `foreignObject` drawn into a canvas.
- A script that HOLDS a key in play must re-send its keydown every few frames: a hit (a grenade
  blast) clears the held keys, and the walk stops dead mid-level as if something blocked it.
- After changing a keyed list that renders in play, count DOM moves with a MutationObserver (a
  node removed and re-added in the same batch). Comparing boxes misses moves.
- **Drive in god mode unless you are testing damage:** `window.__bobGod = true` (or `?god` in the
  address, or localStorage `bobGod` = "1"). Hits still land, flash and stun, but HP never drops, so
  the church Squirrel or M1's gate gang cannot respawn you mid-drive (a respawn looks like a failed
  teleport). Blake asked for it (2026-10-09); it has no button on purpose.
- **A test must never pin his data.** Test rules against fixtures you build. Test his file only for
  structural invariants (ids, no gravestones, KINDS match).
- Test storage code against a fake `window.storage` with get/set/list and NO delete. His host has
  `window.storage` and the test browser does not, so a fix that passes without it can still be
  broken for him.

## Saving — read this before touching anything that saves or delivers

Losing work is the worst failure this project has had, and it has happened six times. **His data
has never actually been gone; the bytes were always still on disk.** Never clear storage to
"reset". Never tell him something is lost before running the recovery
(`tools/read-chrome-leveldb.js` on the old address's Chrome store; the procedure is in its header).

**Where it lives:**
1. **The online save is the `saves` branch** (`library.json` index + `library.N.json` parts + `head.json`). Every copy of the game
   (StackBlitz, Pages, the desktop copy, any new address) reads it through `cloudLibrary` /
   `mergeCloudLibrary` inside `projectLibrary.load`, and adopts only STRICTLY newer records. The
   keeper (`cloudSync` in `tools/bob-okay.js`) pushes his folder there at most once a minute. It
   folds in other pushes newest-wins and never forces. Push to `saves` yourself only for a
   recovery, and only a newest-wins superset.
   **Copies read it BY COMMIT** (`cloudSavesRoot`, 2026-10-18): raw caches the branch path 5 minutes
   and ignores query strings, so a copy opened right after a save used to read the save before it
   (his "the game has the old spelling, and my new item got deleted"). The newest commit id comes
   from the API (`CLOUD_SAVES_SHA_URL`, 60/hour per network, asked at most every 30 s per copy).
   When the API refuses, the copy falls back to the branch path.
   **Deletes are dated:** the keeper dates each id when it first sees it deleted
   (`core.reconcileRemovedAt`, kept in keeper-state.json) and publishes `removedAt`. A copy drops a
   record it holds only if that copy is not newer than the delete (`cloudDeleteReaches`).
2. **His save folder** is `C:\Users\cbm97\OneDrive\Documents\Bob Okay\Saves`. It holds one file per
   record, and `History\` keeps every version ever seen and never deletes. The keeper
   (`tools/bob-okay.js keep`, started at sign-in) sweeps every other copy's browser store into it.
   `node tools/bob-okay.js export <file>` writes the folder in library.json shape. **Never point a
   test keeper at his folder.** Use `BOB_SAVES`, `BOB_HOME`, `BOB_PORT`, `BOB_NO_SWEEP=1`, and
   `BOB_NO_CLOUD=1` or `BOB_CLOUD_REMOTE=<local bare repo>`.
   The sweep also reads Chrome's **WebStorage/<bucket>** copies (QuotaManager maps bucket to storage key,
   `core.gameStorageKey`): the preview shown INSIDE the StackBlitz page is a partitioned store there, and
   its saves never left it before 2026-10-17. **To deliver a record, POST it to the keeper**
   (`localhost:47017/__library`, `revive:true`): a file written straight into the folder is NOT published
   online, so no copy (the game included) sees it.
   **Every save carries `editedFrom`** (App.js `stampSave`): the savedAt of the version the editor was
   holding. The sweep's three-way merge uses EXACTLY that version as the base, or simply takes the
   save when `editedFrom` is the folder's current version. Never stamp `savedAt: Date.now()` by
   hand on a save path; a guessed base turns his deletions into "no change" and the merge puts
   them back (2026-10-10, see History "DELETED THINGS CAME BACK").
3. **Browser storage** (`asset:<id>` / `assetIndex`, and one key family per kind, mirrored into
   IndexedDB) is a cache tied to the page's address.
4. **`asset-data/library.json`** is the committed project file. It is the agents' **delivery
   channel** and the seed for a brand-new browser. It is not his live library.

**THE LIBRARY IS AN INDEX + PARTS** (2026-11-17). Blake: "Eventually there will be 600+ items ...
much more than 100MB".
- **Why:** GitHub refuses any file over 100 MB, and the one library.json was 60 MB that day. Past
  100 MB the keeper's push to `saves` fails on every try, and his online save silently stops updating.
- **The shape:** `library.json` is a small index (`format`, `set`, `parts`, plus `savedAt`, `removed`,
  `removedAt`). It names `library.1.json`, `library.2.json`, ... of at most 20 MB each
  (`src/libraryParts.js`, `PART_MAX_CHARS`). As the library grows it gains parts.
- **The set check:** every part repeats the index's `set` (a content hash). A reader that gets parts
  from two different saves refuses the read rather than mixing them.
- **Where it applies:** the `saves` branch, `asset-data/` (and `library.bak.*`), the Pages seed, and
  the dev server's snapshots.
- **How to read and write:** only through `src/libraryFiles.js` (Node) or
  `libraryParts.loadLibraryAsync` (browser). Both still read an old one-file library.
- **The guard:** `libraryParts.test.js` fails if any committed file reaches 45 MB.

**Delivering or revising a record:**
- Keep the id. Put records in with **`node tools/library.js add <records.json>`** (`{ assets: [...],
  levels: [...] }`). It writes `library.json` and `library.bak.json`, appending new ids and
  replacing a known id only with a strictly newer savedAt. Never splice into a part file by hand:
  its `set` must match the index. Then read both back and assert every other record is identical.
  `node tools/library.js size` lists every file.
- Stamp `savedAt = max(now, newest + 1)`. "Newest" means the newest copy across the repo, the
  `saves` branch / his folder, AND the live StackBlitz store he may be working in right now. He
  works while you work, and stamping over a stale base silently reverts his edits in every copy.
- Never tombstone an id to revise it; that purges his copy. A tombstone retires a record. A newer
  `savedAt` revises one.
- **Renaming a loaded asset or level and saving makes a NEW record** (`resolveSaveTarget`). That is
  his rule. **And the original goes back to how it was OPENED** (`saveAsRestores`, `assetOpened` /
  `animOpened`): the autosave writes edits in place before the rename, so a fork alone kept his recolour
  on the original (Black shirt and Scarf, 2026-10-21). Any editor that autosaves must do the same.
  **💾 Save & Open writes NOTHING** (it only opens the sheet) and the autosave holds while the sheet is up:
  "it says 'Saved' right away even before i try to save anything" (2026-10-21). The sheet's 💾 Save is the save.
- Start an asset job from his existing asset of the same kind, not from a blank page.
- The dev server rewrites `asset-data/` from the browser. **`git checkout -- asset-data/` also
  restores anything he deleted that session**, so check `git diff --stat asset-data/` first.
  `library.bak.json` (+ its parts) is tracked too and is the fallback when library.json fails to
  read whole. If you touch one, check the other.

**Rules the code depends on (do not "tidy" them):**
- **Every saved kind is wired five ways:** save up, restore down, delete up, export, and
  `restoreBackup`. The kinds are one list: `PROJECT_KINDS` (App.js) = `KINDS` (setupProxy.js) =
  `KINDS` (saveKeeperCore.js) = assets, levels, stamps, textures, backgrounds, dialogues, sounds.
  Tests keep the lists identical.
- Deleting is the only operation allowed to shrink the record; everything else merges by id. A
  delete must call `projectLibrary.forget(kind, ids)`. Bulk syncs never pass `revive`; a deliberate
  save does.
- A key that will not delete is overwritten with `TOMBSTONE_VALUE` (a gravestone), and every loader
  reads `isTombstoneRecord` as deleted. Every loader computes `tombstoneSet` once, and BOTH the purge
  and the restore-from-project skip it. A new kind without that skip brings deletes back. Do not
  replace gravestones with an index-based scheme.
- `newerRecord` / `fileIsNewer`: a strictly newer numeric `savedAt` wins in both directions
  (`mergeById` applies it on the way up), and a dated save beats an undated one.
- A loader that throws looks exactly like lost work. Never wrap a whole load loop in one try/catch;
  skip and name the bad record. **Never call an async helper without `await`.** A test greps for it.
- **localStorage is only a mirror, and it is FULL.** `sset` writes IndexedDB first and copies into
  localStorage best effort, so every copy of his game sits at Chrome's 5 MiB cap. Never gate a
  feature on a localStorage write succeeding: the asset editor's 💾 Save vanished that way
  (2026-10-09, one character free). Ask the store that actually saves (`idbOpen`).
- **Never write a whole list read from localStorage over the durable copy.** The full localStorage
  copy is FROZEN. `localRemoved` changes the durable delete list by read-modify-write (`persist`:
  an add adds its ids, a revive removes its ids), and keeps its own copy in memory once a
  localStorage write fails. Pushing the frozen list wiped every delete made since the cap
  (2026-10-10, "deleted sounds come back"). Test delete code with `setItem` throwing.
- **`exportAllAssets` / `restoreBackup`, `migrateDialogue`, `"anim"`, and re-baked looks (2026-10-16):**
  - `exportAllAssets` carries `removed` (tombstones), and for a full v2 backup (`assetBuilderBackup >= 2`),
    `restoreBackup` purges/forgets any id present in browser storage or `projectLibrary` (or `bk.removed`)
    that is absent from `bk[kind]`, and calls `await projectLibrary.save(restoredPayload, { revive: true })`
    for **all 7 kinds** before calling any loader.
  - `migrateDialogue` MUST preserve `soundVol`, `savedAt`, and `editedFrom` (stripping `savedAt` made
    `fileIsNewer` overwrite dialogues from `projectLibrary` on every load).
  - `KNOWN_ASSET_TYPES`, `inferAssetType`, `normalizeAssetJson`, and `migrate` must include `"anim"`
    (delegating to `migrateAnim`) so cutscene animations (`wakebed`, `cptrend`) survive backup import.
  - Re-baking character looks in `saveAsset` (`rebuildLook(swapLookComponent(look, payload))`) must call
    `stampSave(rebuilt, look)` and `projectLibrary.save({ assets: refreshedLooks })`, or the re-baked
    look keeps its old `savedAt` and is ignored by `decideSweep` and `newerRecord`.
  - **Windows MSIX trap:** Claude Desktop runs inside `Packages\Claude_pzs8sxrjxfjjc\LocalCache\Local`,
    which virtualizes `%LOCALAPPDATA%`. Check the real `C:\Users\cbm97\AppData\Local\BobOkay` as well,
    and keep `closeAllConnections()` + awaited `close()` on `server`/`mutex` before self-restart in
    `tools/bob-okay.js`.
  - **NEVER "revive" the keeper from inside Claude (2026-10-21).** A keeper an agent starts runs in the
    agent's Windows job (`IsProcessInJob` = true) and from the VIRTUALIZED home, and dies with the agent's
    session, silently. Since 2026-10-18 the real install was corrupt (`fatal: bad object HEAD`, no
    bob-okay.js), the sign-in .cmd quietly exited, and agent-started keepers were the only ones; one died
    at 7:12 PM and two hours of his work stayed in one tab. `cloneBroken`/`repairClone` and the sign-in
    .cmd now rebuild a broken clone. Read the REAL `%LOCALAPPDATA%\BobOkay\keeper.log` (a WMI-launched
    script sees it; your shell sees the virtualized one). If the real keeper is down, Blake runs the
    repair in his own PowerShell; an agent may start one only as a stopgap and must say it dies with the session.
  - **⚠ Not backed up** (`backupWatch`, `noteUnbacked`/`clearBackedUp`/`unbackedOverdue`): every deliberate
    save is watched until the ONLINE save holds it; past `BACKUP_WARN_MS` (8 min) a red banner says so on
    every studio screen. It is the one save message allowed on screen: it only shows when work is at risk.
- There is **no save-status indicator** on screen; he rejected one. **Never explain origins,
  preview hostnames or "addresses" to him.**
- 💾 Save during a run saves `run.editorLevel`, never the run's working copy.

## Building assets

**The piece he drew is the spec.** "Fix the alignment" means nudge HIS piece, keeping its size,
tone and tilt. "Add it to the other poses" means put that same piece there, scaled to the other
body. Do not add outlines he did not use, and do not "improve" things he did not mention; name
them in one line instead. Your diff should leave his pieces byte-identical except the ones he named.

**He describes what he sees, and two parts that share a colour read to him as one.** A "deforming
jacket" was a bat of the same olive. Reproduce his exact placement from his data, render it next
to his screenshot and match piece by piece before deciding what is broken. Then tell him plainly
what the part really was.

**Prop folders are CATEGORIES, never level names (Blake, 2026-10-31).** File a new prop under his
existing folders (Interior, Decoration, Exterior, Stage, Science, Equipment, Army, Nature, Effects, Wacky,
Vietnam, Trailor Park, ...) by what the THING is. "Liquor Store", "Math Magicians", "Movie Set" and "Pho Shaq"
were level-named folders he asked to have dissolved; Vietnam holds only things that read as Vietnamese.

**Build only what his editor can make — anything else is "cheating" (Blake, 2026-10-09).** Run
`editorReachIssues(asset)` over every asset you deliver; it must return `[]`. A bending, tapering
piece (tail, neck, branch) is one 〰️ Curve-tool stroke (`curveBandPoints`: start, a point on the
curve, end, two thicknesses), not a hand-rolled polygon. If you need a shape or control the editor
lacks, add it to the editor first (he invited that), creation-only like Line / Fill / Curve.
Never set `outline` on a Curve or Fill piece: none of his own curved pieces use it. (Since
2026-10-31 a polygon shape's outline is one traced SVG line, `shapeOutlinePoints`, 2px outside the
edge like a square's ring; before that it was eight chained drop-shadows, lumpy and ~4px.)
**A weapon looks like his weapons: a few STOCK shapes turned into place, no outline** (Blake on the
🪃 Boomerang, 2026-10-25: a smooth Curve over a dark copy of itself was "an ugly un symetrical
boomerang. Also it kind of looks cheated"). Survey his own first: Rock, Pokeball, Katana, Bobs Bat
are 4-6 rects/ovals/triangles at whole-degree turns. A symmetric thing is built symmetric: each
piece and its mirror twin at -rot, centres reflected about one axis (`boomrg1` is 6 ⬭ Ovals and
App.test.js checks the twins). Two pieces whose edges coincide leave a hairline of the lower colour,
so end the lower piece INSIDE the upper one. Held art drawn `behindArm` is spliced in before the
arm, so the body's later pieces (Bob's legs, Bobbett's hips) cover it too.

**Clothing, and anything worn: `ASSET_AUTHORING.md` is the spec. Read it first.** It is also what
he pastes into chats that have no repo access, so keep it in step with the code. The essentials,
plus traps it does not cover:
- **A fit variant IS the flat pose map.** `variants.<fit>` is `{front:[…],back:[…],…}` (a weapon's
  is `{states:{rest,fire}}`), never `{angles:{…}}`. Boxed, it imports "successfully" and draws
  nothing.
- Fit **both bodies**, BoB `telfv37` and Bobbett `oipvf3l`, in all five poses. Crouch is the front
  art moved down by that body's head drop (BoB +36, Bobbett +25).
- **Clothes fit both bodies; a skin fits ONE.** A skin made by renaming another body's skin (Save As)
  keeps that body's fit and its ✓ in `confirmedFits`, so Dress Bob lists it for both. Vietnamese F
  Skin (`30gzhfn`), forked from the BoB Vietnamese Skin, showed up on Bob (2026-10-24). A Bobbett
  skin carries only `variants.oipvf3l` and `confirmedFits: ["oipvf3l"]`.
- House style: flat, 4–8 pieces, one colour plus a dark edge (`#1d1b1b`), no shading, gradients or
  tiers, and the face left open.
- **A belt on a shirt or jacket: tick Over arms on the crouch belt band + knot only** (Blake, 2026-11-20, Karate
  Shirt `krtgi01`: "the belt should not tuck into the pants but it should be behind the legs"). Crouch tucks plain
  shirt pieces under the pants, which hid the whole belt; the hanging tails stay plain so the knees still cover them.
- **Sleeves need `overArms: true` + `limb: "arm"`.** A sleeve box copied without those flags hangs
  off the shoulder.
- **Underwear in Crouch: tick Behind legs on EVERY piece** (his Boxers do). The crouch thighs come up
  over the hips, so one unticked piece floats in front of the knees: Cheeky Bottoms' crotch on BoB
  and its hip bits on Bobbett, "behind legs in crouch isn't working right" (2026-10-24).
- Arm-flagged pieces (`limb:"arm"`, `role:"weaponArm"`, and every block drawn in the weapon editor)
  turn about the shoulder. `pieceOriginFrac` is the only place a pivot is decided, and `rigidLimbTransform`
  orbits `pieceOriginPoint(piece)` (never forcing `_animPivotTop` onto rotated leg/shoe blocks, which made
  Stompers' 179°-flipped sole spikes snap up into the ankle on a step).
- A ring hat (a crown, a headband) is split in two: the back half is `behindBody`, the front half
  sits over the forehead. Otherwise a hat piece draws over the hair. `ignoreHideIfHat: true` keeps
  the hair.
- Robes follow his Priest Cassock (`c4ss0ck`) and the Samurai Robes (`smrrobe`). Aim-up pieces are
  all `overArms`, the crouch skirt and sash are `overArms`, and a V neck is a point-down `tri`
  cutter.
- Masks are fitted with per-pose maps taken from his Gorilla Mask. Eye holes are mirrored circle
  cutters on that body's iris.
- "Behind legs" on pants puts the piece under the legs only, not under the body. Hats compose
  under the arms (`hatsUnderArms`).
- **Transparency never fades an outline** (2026-10-31, Blake: "make it so transparency does not effect
  outlines", on his Star Shades lens `rkshade`). 👻 Translucent fades the fill alone (the fadeGroup
  wraps only the body in Static / Block / MirrorGhost), and under a see-through fill (👻 or ✨ Fade,
  `pieceFillSeeThrough`) a polygon outline is clipped to the outside (`shapeOutsideClip`), so no
  outline shows through the glass. The whole-asset fade (nothing selected) still fades the finished
  picture as one, outlines included.
- **ONE 👻 Translucent slider, and it fades what is SELECTED** (its title says which): a block →
  `piece.translucency` (`pieceAlpha`, the fill only; its outline stays solid); a selected group → every block
  in it (`updSelAll`); nothing selected → the whole asset. Never add a second see-through slider: with
  two (one per block, one per asset) Blake reached for the asset one with ONE block selected and it
  faded his whole pill, three reports running. With 🪣 Change this color everywhere ON it fades every
  block wearing this block's colour, like Brightness and Fade (`seeThroughAssetGroup`, held through the
  drag by `colorDrag`; 2026-10-24, he asked: "change this color everywhere does not effect see through
  ness"), and the title then reads "this color everywhere". See-through is part of the colour
  (`fillLook.see`): a glass block and a solid block of one hex are different colours to 🪣.
- **A colour on a PATTERNED block replaces the pattern** (`flatColorAssetGroup`, 2026-10-31, Dale Undies: "Change this
  color everywhere STILL does not work on patterns ... As soon as I switch poses it changes it back"). The pattern is
  part of the colour to 🪣 (`fillLook.tex`), and the hex under it is not, because it never shows. Never put the
  `background` shorthand beside a pattern's longhands in a piece style: a colour-only change then wipes the pattern off
  the DOM until a pose switch redraws it. A pattern made in the editor (Save & use it here) obeys 🪣 too.
- **A whole asset is see-through by `asset.translucency`** (0–0.9, that slider with nothing selected;
  `assetAlpha`). It fades the finished picture as ONE group (`fadeGroup`), unlike the
  per-piece ✨ Fade. Every `renderPieceRuns` call passes `alpha` (one asset: prop, plinth, drop, shop,
  shot) or `alphaOf` (a composed sprite, per `_src` run via `spriteAlphaOf`); a test fails if a call
  passes neither. Never fade a single asset by `_src`: garments still carry the `_src` of the asset
  they were copied from.
- Keep poly point counts small. A 160-point tail added 31k lines to library.json.

**Props** (scenery; his own run 20–33 pieces, so the 4–8 rule is for clothing only):
- Only `frames[0].front` is drawn (`migrate` sets `angles = frames[0]`). Hitbox and muzzle blocks
  are metadata. Animation is more frames (his windmill: 3 frames at 8 fps).
- **The footprint is cropped tight to the visible art** (`propVisibleArtBox`: unrotated boxes,
  cutters skipped), and `size` is the longer side in cells, from `LV_OBJ_SIZES`. One stray dot
  inflates the whole prop. A rotated piece whose stored box hangs off the canvas widens it too.
  Placements made since 2026-10-10 carry `turnedBox` and crop to where rotated pieces are DRAWN
  (`propVisibleArtBox(asset, true)`), but keep the SCALE from the unturned measure so they match
  the 316 older placements, which stay on the unturned box (40 Sprinklers would shift otherwise).
- **A ground prop must sit on its row.** Draw it at a ratio that gives whole rows at the sizes it
  will be used at (2:1, 8:1, 10:3 …), and end every ground-touching piece on one y. Fractional rows
  make it float (or sink). For one of HIS props that is not whole rows (his edited Canned Ham is 9.63
  rows at size 20, Trailor 3 10.45 at 16), nudge the placement with `oy` (cells) onto the floor line.
- The world scale is ~3.2 cells per metre, and Bob stands ~6 cells tall.
- Vehicles get **solid wheel wells**: a dark well drawn over the body with the tyre in it. Never a
  see-through arch cutter ("the wheel isn't attached"). Window cutters are fine.
- A cutter only cuts pieces EARLIER in the list, within the same source run. Order body → trim →
  cutter → whatever must stay whole. Overlapping cutters cut their union.
- Text pieces (`kind:"text"`) are part of his style. Never `mirror` one; draw the pair. A flipped
  placement keeps its text readable.
- Draw diagonals as 4-point polys, not rotated rects (`worldArtBox` measures unrotated boxes).
- **A sign on a Front-painted wall needs a hole in the paint.** Front objects draw UNDER Front paint
  (5101+ vs 6000), so cut the paint where the sign sits (E1's Local Board Sign, rows 17-19).
- Reuse his palettes (`PALETTES.trailer60s`, `PALETTES.vietnam` + the `vietnamGrass` texture for the Vietnam floor, `#2b2b2b` for tyres and trim, `#8a929c` for chrome)
  and his textures. The Vietnam floor also has `bamboo` (canes, walls) and `thatch` (roofs) registry textures.
- `solidDefault` sets the Solid box when the prop is picked (still editable). Solid means collision
  and nothing else; the drawing layer is `lay` (bg / fg / front).
- **Props cannot be climbed.** Climbing comes only from the level's Climb layer (ladder, bars,
  cliff, 🚶 top-down, 📶 stairs), painted cell by cell. To let Bob WALK over a prop (the M14 saucer), paint
  hidden Foreground (`hideInPlay`) blocks under its top with a 45° ramp wherever the height
  changes, each column at most one row from the next. A SLOPED top (M8's tilted saucer) is drawn as
  ONE straight line through cell corners (1 row per 3 cols = `run: 3` ramps); a curved or off-grid top
  leaves the hidden ramps zig-zagging under the art. The art box is `{w, h, minX, minY}`, not x/y.
- **Nothing crosses a level's first or last column.** Runs join levels edge to edge, so a tree, canopy,
  bush or plant the edge cuts shows as half a tree on BOTH sides of the seam. Pull it in whole or leave
  it out. A change of ground (grass to earth, earth to laterite) wanders a column or two a row down; a
  ruled vertical line reads as fake. A prop that floats is usually a stray piece under its art: seat
  the part that should touch the ground (M7's Trailer 1 and its tyres).
- **A ladder runs ONE ROW PAST the deck it reaches.** A climb pins you where your body last overlaps a
  ladder cell, so a ladder whose top cell is level with the deck leaves your feet a pixel inside the deck
  and you cannot step off. Decks joined by a ladder are at least NINE rows apart (seven tall + that row),
  or your head is in the deck above at the ladder top. The Climb layer is invisible in play: draw the rungs
  (ladder Objects, as M1 does, or the prop's own art).
- **Nothing solid taller than one cell across the only way through a level.** Agility -1 to 1
  jumps ONE cell (Army Bob, Roberta, Crocobob, Bobby, Billy), so a two-cell solid prop traps them
  for good. Place such props as scenery (Solid off), or give the path a way round.
- **Rewards are scarce: one or two item sources a level, zero is fine** (Blake, 2026-11-06, on M19's five
  pedestals: "you can't flood a level with items. You should really consider balance"). An item source is a
  pedestal, a shop, or a door into a room that holds one. One consumable ITEM plus one EQUIPABLE may share a
  level. **No pedestal may roll a gold (Legendary) item** ("they are meant to be rare and feel rewarding"):
  never tag one "Legendary", and AND-narrow a broad tag that a gold item carries. **At most ONE purple
  (Rare) source a level.** Check what a pedestal can roll (`pedestalItemPool`) before placing it: M19's
  tower is Rare AND Trailer (Sledgehammer / Spiked Jacket only), its blind Heal OR Drink (Poor/Common).
- **Every trailer used as scenery is enterable** (a door marker, tag "Trailor Int"). "Stop making some
  trailor not enterable." A door is an item source too, so a level that should not have a Trailor Int
  uses no walk-past trailer at all: dress it with something else (M19's chicken coop). His own
  foreground trailer (Front layer, M19 col 0) is his call.
- **A 🚶 top-down room's walls stay outside the plane's columns for seven rows above its back row.**
  The body is 7 rows tall, so at the back line its head is 7 rows up. A wall that narrows inward lower
  than that (Tree Int 2's first trunk shape did) lets W walk the body into it, and then A/D cannot get
  out. Narrow the room only above that height.

**Animals (Enemy-creator enemies):**
- Drawn side-on, **facing LEFT**, with no front or back. `side`, `up` and `crouch` are the same
  drawing with their own piece ids, plus a drawn `attack` and `death`.
- Feet on **y=150** in every pose, or set `groundLine` for that pose. The death pose's lowest pixel
  sits on the line. A belly-up death flips about `(backY + G) / 2` and places parts by their turned
  corners.
- Leg pieces carry `limb:"leg"` and fall into **two or more x-separated columns**. `multiLegPivot`
  fuses pieces within 6 units of each other, feet included; one column slides as a block.
- On-screen height is `(artHeight / 260) × 7 × scale` cells. A unit can be stomped only if its Side
  art is ≤ 104 canvas units tall at scale 1.
- **The Side art must fill the canvas WIDTH** (nose near x=0, tail near x=200). A unit's wall box
  starts at the canvas's left edge and is as wide as the art, and a right-facing unit is mirrored
  about the canvas centre. Art drawn in the right part of the canvas stops short of walls facing
  left and pokes into them facing right. Action poses must fit inside 0–200 too.
- A creature bites for 2 × Strength. There is no damage field; do not add one.
- **Flying creatures (`flies: true`, `creatureFlies(ea)`):** Ticked via **🦸 Flies** in the Enemy Creator's `📊 Stats` card. A flying creature stays airborne without gravity while alive and not knocked down (`ep.down > 0`), chases/retreats vertically as well as horizontally, hovers at its altitude when idle/guarding, and flaps pieces flagged `limb:"arm"` (wings) via `flapCreatureWings(blocks, ep.flapDown)` (`flipPiecesVertically` across the wing's flat base edge so the base stays anchored to the body while the pointed wingtip alternates above and below the bird). On a flying creature, `limb:"arm"` pieces are wings rather than hands, so `unitHoldArm` still uses `holdPoint` / `enemyDefaultHoldPoint`. Shipped flying creature: **Eagle** (`eagl1x9`).
- An animal holding a gun is intended. It holds it at a ✋ hold point (`holdPoint[pose]`,
  `holdAngle`).
- A stored group stamped onto an animal joins its source run, so a costume's cutter cuts the animal
  too; draw holes as shape. Stored groups keep absolute x/y, so author them on the creature's own
  landmarks.

**Weapons:**
- There is no Front pose. Front uses the Back art (`weaponArtPose`), and a ranged weapon has no
  front at all.
- A one-round gun draws its projectile in the Rest art and leaves it out of Fire.
- A fired projectile renders in a square `size` cells across over the whole 200×260 canvas, so
  fill the canvas.
- Shots leave from the 🔴 muzzle of the Fire drawing, else Rest's, else the far end of the art
  (`heldShotPoint`), for the player and units alike.
- Weapon flags live flat on the asset. A new one needs a `newAsset` default, a `migrate` default
  and an editor control.

## Sound

- **`src/audio.js` is the game's, not the studio's.** It holds the engine and the rules, with no
  React and no storage; the studio hands it `loadClip`. The game's own front end will use it as it
  is, so keep studio code out of it.
- What plays is `resolveSound`: the asset's own slot (`asset.sounds[slot]`), else the board's basic
  sound, else silence. A slot naming a deleted sound counts as empty. A new everyday moment is one
  `SOUND_EVENTS` entry; a new per-asset moment is one `ASSET_SOUND_SLOTS` entry. The UI follows.
- **Sounds are the seventh saved kind.** A record is `{ id, type:"sound", name, category, clip,
  bytes, dur }`, and one board record (id `soundboard`) holds the basic sounds and the music pick.
  **The audio is never in a record.** It is a clip file named by the hash of its bytes
  (`<28 hex>.<wav|mp3|ogg>`). It lives in `asset-data/clips`, `Saves\clips`, `clips/` on `saves`,
  and IndexedDB `clip:<name>` (base64; never localStorage or the host store). Every copy downloads
  the online save on every change, so inline audio would ride every download.
- The clip hash exists twice: `audio.js` for the bundle (babel strips a CommonJS file's exports)
  and `saveKeeperCore.js` for Node. A test keeps them equal; change both.
- Fire sounds where the thing happens in the play loop (`sndMoment` / `sndEvent`), never from the
  render. Hurt, death and landing come from `soundFrame`'s per-frame diff, for the player and every
  unit; do not add hurt sounds at damage sites. Units make the same calls the player does.
  Hurt and Death are four basic rows (`playerHurt/playerDeath/enemyHurt/enemyDeath`); an old board's
  single `hurt`/`death` is split into both sides by `splitHurtDeath`.
- Underwear (`under_top`/`under_bottom`) never cross-displaces an outer garment through a shared tag
  (`equipDisplacedSlot`): an undershirt and a shirt are both tagged Shirt.
- **Melee is two sounds: Swing as the stroke starts, the blow only on CONTACT** (his rule,
  2026-10-11). Start: the weapon's Swing, else the basic Swing (fists and bites too). Contact (a
  body struck, a shot parried, a clash, a guard hit): the weapon's Hit, else the body's Attack,
  else the basic Punch. Never fire Punch/Hit/Attack where a swing starts.
- Each sound has its own `vol` (0-2, absent = 1; `soundVolume`), set by the 🔊 slider on its
  Library row and applied by every play. Music caps at 1 (an `<audio>` element cannot go higher).
- **A 🔊 slider sits beside EVERY sound pick** (he asked three times; the Library-only slider read
  as "THERE ARE 0"). Stored beside the pick: `board.basicVol[key]`, `board.musicVol`, a dialogue's
  `soundVol`, an asset's `soundVol[slot]` (absent = 100%, `slotVolume`/`withSlotVolume`), and it
  multiplies the sound's own `vol`. `resolveSoundVol` follows resolveSound's choice. Any new place
  a sound is picked gets `volSlider` beside it, and its ▶ passes that volume.
- **An explosion is heard wherever it lands** (`EXPLOSION_MIN_GAIN`, a `minGain` floor on the
  off-screen fade): a launcher round lobs past the screen edge and its Hit was faded to nothing.
- The dev server writes uploads into `asset-data/clips/`. Delete test clips before committing.
- 10 MB per file; the answer to a bigger one is mp3/ogg, not a bigger cap. The 🎵 toggle is per copy
  (localStorage `bobMusic`).
- **Every clip starts where its sound starts** (`leadingSilence`, measured once at decode, applied by
  every buffer play: moments, the studio ▶, the talk loop). His "plays a fraction of a second late"
  was quiet at the head of the files, not the loop. Never edit the file to fix timing.
- During play the engine feeds the output a -120 dB constant (`syncAwake`) so Chrome never parks it;
  only during play, because an open stream also keeps Windows awake.
- A dialogue's talk sound is `dlg.sound` (migrateDialogue carries it only when set). It loops for
  `talkSeconds(text)` and is started/stopped by `talkSoundFor` where the line changes (openTalk, an
  answer, closeTalk). The Sounds screen saves weapon, enemy and dialogue picks IN PLACE
  (`saveAssetSound`, `saveDialogueSound`): read the stored record, change only that field, and
  patch the editor's open copy (and the dialogue baseline). Its right column is Library, Weapons,
  Enemies; a weapon or enemy row is `assetSoundRow`, the same slots as the editor's 🔊 card.

## Symbols, the play HUD and the score (2026-10-14)

- **No new emoji, anywhere in the interface** (Blake: "I hate emojis"). Interface emoji are drawn
  as symbols by a font the app builds in the browser (`src/symbols.js`, listed first in every UI
  font stack as `${SYMBOL_FONT_FAMILY}`). Every emoji in App.js / audio.js needs a slot in
  `src/symbolSlots.json`, and a test fails otherwise. New UI that needs an icon draws a NAMED slot
  with `sym("group.name")` (an `<svg>`), never an emoji character. Blake picks symbols on the
  Symbols screen. The picks live on the `symbolboard` record (sounds kind, beside the sound board).
- The font's COLR table is load-bearing. Without it Chrome still draws "⚔️"-style emoji (the ones
  carrying U+FE0F) in colour.
- **What he actually asked for is the PLAY EFFECTS** (he was furious that the first pass swapped
  studio buttons and left these as emoji). The built-in explosion / impact puff, fire cell, emoji
  shot, stunned and knocked-down marks and the talk bubble draw `fx.*` slots. Each defaults to a
  symbol in the slot's colour, and **he can put one of his PROPS in any drawn slot**
  (`prop:<id>`, the Props tab; a picked blast prop animates like a weapon's own). A weapon's own
  blast / landing / shot emoji or prop, emoji pieces and level emoji objects are HIS art and stay
  as he chose (`ART_EMOJI_FONT`). The weapon defaults 💥 / 🔥 count as "use the slot".
  A new in-game effect gets an `fx.*` slot and is drawn with `sym(key, null, px)`.
- **A thrown Blast stands on its ground disc** (2026-11-26, Mini Nuke): if the blast prop's lowest piece is a
  flat oval (`boomGroundLine`), that oval's CENTRE LINE is the ground; its far half draws at `BOOM_GROUND_BACK_Z`
  (behind bodies) and its near half in front. A Blast with Burn off paints nothing on landing: the boom is the landing.
- The icons are game-icons.net (`gi:`, **CC BY 3.0, so the game's credits must name it**) and
  Material Design Icons (`mdi:`, Apache 2.0). `tools/build-symbols.js` writes them into
  `public/symbols/library.json` (fetched only by the Symbols screen) and `src/symbolArt.json` (the
  defaults). Re-run it after changing a default.
- **No messages during play at all.** `flash` returns while `playLive` is set: `play && screen === "level"`.
  ‹ Menu out of a running playtest leaves `play` on, and keyed on `play` alone it silenced every
  editor's "Saved ✓" ("no indication that weapons are saved"). The blue box went first,
  then its replacement (words rising over the player) the same day: "all that small white text every
  time you do something. It's redundant." The HUD, pickup banner and shop panel already say it. The
  studio toast is blue; a save (`toastIsSave`) is a green pill at the TOP, 3 s, above any dialog.
- **The play HUD** (`.hud`, after his mock-up) shows the HP bar with cur/max top-left. Below it,
  ammo is ONE SEGMENT PER ROUND with no counter, in a bar of ONE fixed width (a one-shot RPG is one
  long segment, a rifle many thin ones), and extra lives are pips. Throwables are a row of minis drawn
  from each one's own art (`hudThrowMini`, 18px tall), one per grenade in stack order; past 12 in all
  (`THROW_HUD_MINIS_MAX`) each group is one mini and ×N. SCORE
  sits top-centre, half see-through, and the live stats (AGI DEF HP INT SPD STR, no ATK) top-right.
  Bottom-left is the money (`hud.money`), bottom-right the held weapon's picture (`hudWeaponArt`:
  the ground art turned on its side when tall, muzzle to the right) with its ATK, the only place ATK
  shows. Banner rows (`.pbRows`, the money "💵 +N" too) are 19px; the HUD money count also jumps
  (`walletRises`). He wanted the money row BIGGER, not gone.
- **Enemy HP bars show only after a hit** (`unitHpBarAlpha`, 2.5 s from the latest fall, fading over
  the last 0.5 s): short (46px), 7px, see-through. Never an always-on bar. There is no HP
  bar over the player's head.
- **The main menu has colour in its ICONS**: each tile and equipment slot carries `--tc`, the icon's
  colour; the cards stay plain (he hated tinted cards). A new tile gets one too.
- **A hostile senses the player inside an OVAL** (`enemySenseHeightFrac`): 4 body lengths (28 cells)
  ahead on its own level, 1 behind, and that reach SHRINKS with the height between the two pairs of
  feet, reaching 0 at 3 body lengths below it and 1.75 above. Past the top or bottom
  (`enemyChasesVertically`) it does not turn, sense, climb, walk a walkway, drop or fly. Never a flat
  height cutoff: 1.5 lengths stopped his tree Squirrels (11 and 14 rows up) dropping on him. 1.75 up keeps
  M7's road units off the floor above (15 rows).
  **Your ALLIES are sensed inside the same oval** (`enemySensesUnit`, either side, no blind spot):
  a friendly unit used to count as seen at ANY range, and runs adopt neighbour levels' units, so a
  far ally pulled M3's whole football team into the level to its left. Nothing a hostile targets is
  ever unbounded.
- **Score** (the SCORE block): a hostile unit killed by YOUR last blow is 100
  (`lastHitByFx === null`; a unit's blow always stores an array, so keep it never-null). A
  dialogue option's `points` pay once per run. A level pays 500, minus 10 per whole second after
  30, on its first gate exit or at the floor's end. **Never show the rules on screen.**

## The game front end (2026-10-17)

- **One app, two addresses.** A path ending in `/game` (or `?game`) starts `AssetStudio` with `game`
  (`isGameAddress`, src/index.js); `/bob` is the address named after the game, `/game` still works.
  Pages: https://cbm971.github.io/BobAssetBuilder/bob/ (`tools/publish.js` copies index.html into
  `bob/` and `game/`). **Run `node tools/publish.js` after every push he will test on Pages** — on
  2026-10-18 he opened the Pages link and saw none of a shipped change because it had not been run. StackBlitz and the studio: the studio menu's
  **Play BOB** tile opens `<this copy>/game/` in a new tab. Never fork the engine into a second
  app; a fix to play must reach both.
- Rules and the game's store are `src/gameFront.js` (no React); screens are `src/gameShell.js`; the
  wiring is the **GAME FRONT END** block after `startRun` in App.js. No studio screen is reachable in
  game mode, and `flash` is silent there.
- **The title is plain HTML/CSS in `public/index.html`**, so it shows before the bundle arrives (his
  words: "before anything else even loads"). Its timings are mirrored by `INTRO_*` in gameFront.js
  (a test checks both). `TitleHandoff` fades it out. Faces, picked by him from a sheet on 2026-10-18:
  **UnifrakturCook**, plain white (no sheen or tint — he rejected that), for "BLAKE Presents...",
  **Sarpanch 900** upright with a -9° skew for BOB (a GREEN face inside a thin WHITE edge — he went
  white/green line/white, then "have the inside of that outline be green as well"; never a bold
  green outline: three stacked copies, `.bobLogo`, in BOTH index.html and
  GAME_CSS), and for the menus **Saira, wide (125%), 800, italic** (2026-10-18: he named CA Magic
  Hour, "Retro, 1970s" and not pixely; that face is paid, Saira is the nearest free one; Russo One
  before). BOB stays Sarpanch. Loaded only at the game's address. The panel greens are a touch
  darker since then (he asked "very slightly darker"); the BOB logo green did not change.
- **The look (2026-10-18, his mock-up): every screen is a FLAT green panel** (off-white border,
  yellow ▶ on the lit row) over one of his own levels with his people walking it. **No patterned
  fills** — he turned down the striped panel and the rayed card. The backdrop is `menuSceneFor`
  (App.js): the level's tiles and objects drawn by the play code, the cast = the level's units +
  every Starter look (dressed, see below) walking the visible main ground (`stepMenuWalker`; never
  collision-only cells, or they walk on the sky). **Each screen has its own level** (`sceneLevelFor`
  over `menuLevelLineup`, ranked by drawn props x3 + units; he called a low-ranked pick "a pretty
  boring level"). `?scene=<level name>` pins the main menu's.
- **New Game → character select, Smash style**: a box per look filed under **Starter**
  (`starterLooks`, Bob first), the box shows the HEAD only ("neck up"), the P1 card the whole body;
  BOTH are **dressed in the same random shirt + pants** drawn for its body (`gameDressed`, kept per
  page; the boxes too since 2026-10-24; a look already wearing a shirt, like Super Bob, keeps it and only its pants roll; a LOCKED fighter is never dressed, its box and P1 silhouette are the look as saved, 2026-10-31; **Bobena is never auto-dressed**, she wears his Pink Dress: `SELECT_KEEP_OUTFIT` / `keepsSavedOutfit` by name, 2026-11-07) — display only, the run starts as the look is saved. **Locked starters** (`STARTER_LOCKS`, by look name,
  spaces ignored so "VietBob" = "Viet Bob"): Bobby = Trailor Park floor done, Bobert = 50 items found
  (Items-tab ids in `record.found`), Roberta = Trailor Park done AS Rob (`record.floorsWith`), Rob =
  Trailor Park on Hard, Viet Bob = Vietnam on Hard, Bob Li = the conversation NAMED "Bob Li" opened in
  a game (`record.met`, dialogue names, written by openTalk; the Tree Tops 2 NPC who says it, at 38,130,
  wears Chun Bobette `hrr4xyc` again since 2026-11-26: "the starter character shouldn't be in game"; the dialogue is still `8meobob` "Bob Li", so meeting her still unlocks Bob Li), Robbie = 100 items found (same count as Bobert), Robert = 200 items found, Super Bob = 500 items COLLECTED (`record.picked`, every pickup, repeats included),
  Bob The Alien = 500 kills whose last blow was a shot or throw (`record.rangedKills`, from `ep.lastHitRanged`;
  counted from 2026-10-31 on), Bobb = 250 kills whose last blow was YOUR swing with a melee weapon in hand (`record.meleeKills`, `ep.lastHitMelee`, set only by the swing hit and cleared by every other blow; bare fists, stomps, shots, throws and allies never count; counted from 2026-11-26), Agent Bob = 1,000 kills (`record.kills`), The General = 500 enemies defeated in Vietnam (`record.floorKills`), Bob the builder = Vietnam beaten on Medium or harder by 5 DIFFERENT fighters (`record.floorsDiff`, `floorDiffCharacters`; Blake 2026-11-26: "unique wins like filling player cards", so one fighter's repeats never count, and it was Hard earlier that day; `gameDressed` skips pants when his Overalls carry them), Bobena = 50 unique enemies defeated (`record.defeated`, Enemies-tab ids). Locked boxes show as a silhouette under
  a padlock, can be lit but not picked; the P1 card names what opens them. **Order** (`starterRoster`):
  every open fighter first (Bob, then A-Z), then the locked ones A-Z; an unlock moves a fighter up into
  its alphabetical place. `selectGridCols` is always **6** to a row (Blake, 2026-11-07; 5 before). **A box NEVER changes size with the roster** (Blake, 2026-11-07: adding Bobena opened a 4th row and shrank every box; "The boxes should not change size when you add rows"): `selectBoxPx(vw, vh)` is the 3-row size from the screen alone, and past `SELECT_GRID_ROWS_SHOWN` rows the roster scrolls (the lit box kept in view). Never divide the box by the row count again. The P1 card's dead space on the right lists the look's ABILITIES (`lookAbilityNames`, names only; hidden under 1280px wide),
  fighter portraits frame `FIGHTER_PORTRAIT_FRAC` (0.36) inside the inner `box - 8` window centred on the
  body (not worn gear, and `textPieceBox` crops `kind:"text"` bounds to the centred glyphs so a wide text
  wrapper on a hat/undies never shoves a fighter or life head off-centre), and **Coming Soon** boxes
  (`selectGridFill`, `SOON_PORTRAIT_FRAC` 0.52) finish a short last row with Bob's dressed silhouette
  zoomed out enough to show his head and shoulders, no padlock, never selectable. **Back sits beside
  START, under Easy** (his placement). Then **Easy 4 / Medium 2 / Hard 1 lives**
  (`DIFFICULTIES`). A death no 🐱 Extra Life catches costs one (`gameDeathRef`, called from
  `playerDefeated`; counted in the save as `deaths`); the last one shows
  **Game Over** once the body has fallen over (💀 `deathFrame`, see Blake's decisions; it used to freeze the loop on its feet for 1.1 s) (Retry = same look and difficulty on a fresh seed via `freshRunSeed`; the save is deleted). A run life is the
  editor's death (back where you entered, full HP), never the 🐱 get-up. **The HUD draws run lives
  as the PLAYER'S HEAD** (`.hudHeads`, `gameHead`: the front drawing cut at the rig's shoulder line,
  hat included, from the LIVE kit-merged body), and the difficulty boxes draw the lit fighter's head; the 🐱 symbol is ONLY the Extra Lives ability, on its own row ABOVE the heads.
  Blake (2026-10-18): one shared cat row read as "a multi lives ability".
- **Player card** beside the P1 card: starting stats (`starterStats`, HUD symbols, unset = 5) and a
  medal per floor (`lookFloorMedals`: the floors of intro levels, then `PLANNED_FLOORS` (Vietnam) so
  its medal shows before a run can reach it; gold when beaten AS that look by name). A floor in
  `FLOOR_ICONS` is drawn as an OUTLINE picture (`FloorMedal`/`MEDAL_ICONS`: Trailor Park = trailer,
  Vietnam = helmet; 2026-10-25, replacing the slab T); beaten on Easy it fills white, Medium adds a
  yellow outline, Hard a red one, all thin lines. Any other floor shows its first letter. **No coin
  behind the picture** (he called it the ugly coin thing); never put a disc back.
- **Unlocking a fighter shows a banner** (2026-10-25): "Unlocked", the fighter's box (dressed, as on the
  select), then the name, in the pickup banner's gold face. `putGameRecord` diffs every record change
  with `newlyUnlocked` and queues one per fighter (`unlockBanner`/`unlockBannerEl`, App.js); it shows over a
  level or the Floor Complete card for `UNLOCK_BANNER_MS` (mirrors the `ubLife` CSS). A new lock needs no code.
- **Saves are checkpoints** in their OWN IndexedDB database `bobOkayGame` (plain objects under
  `game:` keys), never the studio's `bobAssetStudio` store or localStorage (full). One is written
  400 ms after each run level goes live (never on the seam frame) and on Quit to Main Menu. Load
  rebuilds `buildRun` from the save's seed and goes live at `resumeNodeKey` (key, else the same
  level id) by the saved gate (`run.curKey` + `run.resumeSpawn`, `togglePlaytest(run, save)`).
  A finished floor deletes its save.
- **Esc pauses** on the loop's conversation line (`gamePauseRef`); leaving the window pauses too.
  Held keys are cleared both ways. The view is scaled to `GAME_VIEW_ROWS` (29) rows tall on any
  window (`gameViewStyle` on `.lscroll`), matching his 871 px Playtest; HUD included.
- **Unlocks** is a record (`game:record`): `found` from `showPickup(…, item)` and `buyFromShop`,
  `defeated` from the loot pass's kill (`spawnEnemyIdAt`), floors and best score from the floor end.
  New pickup or kill sites must call `gameNoteRef.current`.
- **The menus have music** (`bobAudio.setMenuMusic`): the sound board's 📋 Menus track, else the
  🏁 Run track (`musicTrackFor`, audio.js). The menu click plays at `GAME_MENU_CLICK_GAIN` (0.45);
  at full it was "too loud". A silent menu read to him as "the game audio didn't work".
- Options volumes go through `bobAudio.setVolumes` (master gain + music element); the studio
  never calls it. The game's music follows the slider, not the studio's 🎵 toggle.
- His menu has no Credits screen yet; the game-icons.net symbols still need crediting somewhere.
- **Options → Upload File (2026-10-18)** takes a file from the studio (Export everything, or one asset) and
  updates THIS address's items from it (`gameUploadFile`, App.js; the row is `onUpload` on OptionsPanel, main
  menu only). It is the studio's `restoreBackup`, but a full export is passed in as a version-1 backup, so it
  ADDS/REPLACES by id and never deletes what the file leaves out. **It takes only records NEWER than the copy
  held here, as saved** (`restoreBackup(bk, { keepNewer: true })`, 2026-10-18). It used to restamp everything
  newer, so an old export uploaded in the game would have become the newest version of everything in it, and
  the keeper would have swept that into every copy. **The game must never write an older version over the
  studio's.**
- **The pointer** is a slightly larger green arrow with a white outline (`html.bobGame *{cursor:…}` in
  public/index.html, so the title has it too). The studio never gets it.
- **Item tiers were RENAMED (2026-10-18), not re-keyed.** Ids on saved items: poor, common, rare, legendary,
  mystic. Names he reads: Poor (white), Common (green), **Good** (blue, id `rare`), **Rare** (purple, id
  `legendary`), **Legendary** (gold, id `mystic`). Never "fix" the ids: every saved item carries them. No
  sparkles, emoji or art glow on any tier; gold has only a second shine pass on the banner and a slow glow on
  its caption. A gold pickup plays the standard pickup sound held 3x as long (`PICKUP_LEGENDARY_STRETCH`,
  `stretchChannels` in audio.js, pitch kept), not three copies of it.
- **The rank is a tag (2026-10-31).** `itemTagList` = the item's three boxes + its rank LABEL, and every tag search
  (pedestal, shop, gear roll, 🍀 Lucky Find, 🏹 Tag Damage) goes through it, so "Rare" finds every purple item and
  "Odd" AND "Legendary" finds the Ray Gun. Never type a rarity into a tag box; the 57 items that had one were
  retagged that day. Theme tags in use: Trailer (Trailor Park world items, like Vietnam / Army; its people's LOOK
  folder and 🎲 enemyTag are "Trailer" too), Odd, Furry, Speed (Fast merged in), Hippy, Super, Sewer, Fire, Underwear, Item. **Kind-tag trap:** `equipKindTags` treats a tag on at most 2 garment
  slots and on no weapon or consumable as a garment KIND, so the two items take each other off. A two-piece theme
  (Wizards Hat + a cape both "Magic") would strip itself; Fire on the Fireman's Coat + Helmet did until the
  Molotov joined it. Give a set a third slot or a weapon, or pick another tag.

## Architecture — where things are

- Pure logic is `export const` at module level and unit-tested. The giant `AssetStudio()` component
  holds all state and rendering. Player state is the `player.current` ref, and one big play
  `useEffect` runs physics and AI.
- **Registries drive the UI**; one entry gets you the controls free. `EFFECT_TYPES` (clothing
  abilities; each needs a `brief`, and a test fails without one), `WEAPON_ABILITIES`, `TEXTURES` (a
  band texture like the girder needs the run's `span`), `LV_OBJ_SIZES`, `PALETTES`,
  `DIALOGUE_ACTS`, `DIALOGUE_TONES`, `ALLY_KINDS`, `ITEM_RANK_INFO`.
- **Poses:** walk `editablePoses(type, wtype)`, never `ANGLES`. Enemies add attack and death, and
  weapons lack front. Walking `ANGLES` has silently deleted art.
- Piece ids are unique only inside one pose list. Never re-id saved art.
- **Look stacking** (`layerBodyAndOverlays`), back to front: behind-body · body (with Behind-legs
  pieces tucked under the legs) · skin decor · shoes · underwear bottom · undershirt · pants · shirt/jacket
  · hat · body arm · over-arms. Units re-compose their drawing per run (`liveEnemyAsset`); a look's
  stats and effects are baked when it is saved.
- **Anti-seep** (`underwearSeepCuts`, last step of `layerBodyAndOverlays`): underwear poking out the SIDE of a
  pants/shirt/jacket piece drawn over it, by at most `SEEP_TOL` (6) units, is trimmed as `seepCut` holes in its own box
  (cut by `cutterHoleClips`, ring included). Never above the waistband, never between two covering pieces, never a
  wider overhang (that is design). An outlined underwear piece flush with an un-outlined garment seeps by its RING.
- **Level cells:** `lv.fg` / `lv.bg` / `lv.front`, keyed `"r,c"`. A value is a colour or
  `{ c, tex, ol, slope, run, step, upsideDown, … }`, and `more` holds extra fills. Read cells with
  `fgFills` / `fgSolid` / `fgSlopeFills`, and paint with `mergeFgFill`. A ramp painted over a plain
  block is decoration: the surface finders read `fgSurfaceFills`, which gives it no slope, so the
  block's flat top is the floor (Forest M11's dirt stripes walked you down into the grass). All three layers stack and
  take ramps (`layerTakesRamps`). Fill keeps every field except `PAINT_IDENTITY_KEYS`; never put a
  key allowlist over cell geometry. Anything with a left/right sense must be added to
  `flipLevelHorizontally`.
- **A flat landing takes any floor top the feet crossed THIS frame** (`landingReach`, used by the
  player, units and corpses). Never a fixed pixel window: a fast fall or a slow frame steps past it.
  On thick ground that sank you a cell; on M14's two-row slab it dropped you onto the street.
- **Agility gates** (Forest M11's ladder, Forest M12's nets, Trailor Park M19): a climb cell catches you
  once your HEAD is inside it (a ladder also needs W/up held), and a standing jump with Space held lifts
  the head 120.5 px at Agility 6, 147 at 7, 174.6 at 8, 204 at 9 and 235 at 10 at 60 fps; the frame rate
  moves it (6: 117-124, 7: 143-150, 8: 171-178, 9: 200-208, 10: 231-239 px from 30 fps to the limit).
  A ladder whose bottom is k rows over a standing head needs k*30: 5 rows = Agility 8, 6 = 9, 7 = 10.
  The jump code with 60-360 Hz and ±25% frame jitter never lifts 7 past 149.6 px or 9 past 208, so 5 and 7
  rows are exact gates for 8 and 10 (Monte Carlo + real loop, Forest M20, 2026-11-22). A WALL to leap over gates
  only if it is plain blocks with a FLAT top: ramps on top make it hill, a ledge under the body edge in the air,
  and M20's ramp-topped gable caught an Agility 4 leap off bars 10 px under its ramp.
  **There is no Agility 7 gate:** 4 rows (120 px) is caught by Agility 6 (measured 2026-11-05; M12's low
  limb has this leak). Gate only with a jump straight up from a floor under the ladder: there is no air
  control, so a sideways leap gates on Speed (at Speed 10 a leap off a platform crossed 32 cols onto
  the next, higher one). So bring the ladder up through a 1-cell trapdoor in the platform, and keep
  every platform out of a lower Agility's leap (32+ cols off, or walled and roofed like M19's blind).
  A missed jump off bars re-grabs a row higher; a ladder's top is a launch one row above its deck, so
  roof it. That top cell must stand a row ABOVE the deck: a climber stops 0.3 px under the ladder's top
  edge, so a ladder ending flush with the floor leaves him a hair inside it and he cannot step off. BoB
  is exactly 7 rows tall, so a roofed room over a ladder needs 8 rows inside (M19, 2026-11-06).
  Holding Space through a bar/cliff catch jumps you straight back off it (a climb jump), so a line caught
  at the very top of a jump bounces until Space is let go; that is normal, not a missed gate.
- **A stair is a 📶 Stairs flight, not solid blocks** (Blake, 2026-11-24: M18's solid wedge with a red carpet ramp
  "comes off as a red ramp"). Paint the steps on the BACKGROUND (plank tread on top of each column, his wood under it,
  no ramp, no red) and the walk on the Climb layer's 📶 Stairs: one cell per column corner to corner, the foot cell IN the
  floor row (tread = floor top) and the top cell IN the deck row (make that deck cell a plank). The surface is the top of
  each column's stairs cells, eased column to column (`stairSurfaceY`). W boards it within a step of a tread (the foot
  or the head), A/D walk it, S hops off, walking off an end leaves it, a jump lands back on it, W held in a fall catches it;
  units board it by `unitClimbRoute`'s `stairs` route. The hallway in front passes straight by, so a flight no longer
  walls off its storey — but a SOLID flight still does, so never draw one. Keep the hole above a flight open for the
  climbing head (body 7 rows over the step); a walker on the deck above falls through that hole, it does not board.
  A unit that climbs out at the head and finds you there must not back straight down that hole: a crowded Seek's
  stand-off step (`enemyMoveIntent`'s near band) is taken only with a floor cell under its feet box (`ep.x … ep.x + epw`,
  the landing test's box, not the art-centred hit box) after the step (2026-11-26, Forest M22's F2: three climbs, three falls).
  Never spawn a unit over a hatch: it falls through at once.
- **A ladder you must climb DOWN needs a hole a body fits through.** Climbing down tests the whole body
  box (`cellsHit`; every character is 2.18 cells, 65.4 px) against solid cells and stops at any; climbing
  up tests nothing. So a 1-cell trapdoor is up-only (right for an Agility gate), and S on its deck only
  crouches. A ladder joining two lanes stands in a 4-cell hole, 2 wide (size-2 `ladder` shapes every
  second row, climb cells 2 wide), like his sewer manholes (Sewer M2/M3) and Trailer Park M21's shafts:
  a walker drops in and grabs with W or S, and A+S from the lip steps in and climbs down (2026-11-08).
- **A ramp's backing (hill) stands aside only for a body ON ITS FEET with ground under its centre**
  (`hillStandsAside`, `sideWallsW` in the loop). In the air it is a wall, and over a hole it is a ledge
  for the player's landing. Otherwise a jump rises into a mound and falls through it (M14's saucer), or
  a ramp-lipped hole's wall swallows you (M15's manhole). A body already INSIDE hill steps up at most a
  cell or lands on the row its feet cross (`centreHillLanding`); it must never fall through. Any new
  sideways or landing pass goes through these. A unit whose head already grazes a roof row walks on
  under it (`ceilingGrazeFree`), or Sewer M2's rats stop a step short of their holes.
- **Objects:** `lv.fx["r,c"]` (the object's top-left cell) is a list of
  `{ kind, solid, lay, z, size, rot, flip, ox, oy, … }`. Render through `levelObjectsInDrawOrder`,
  and new placements take `nextObjectZ`. The layer comes from `lay` (`objectLay`), not from Solid.
  ⤒/⤓ go to the level-wide extremes and may change layer; ▲/▼ (`orderStepZ`) step past the next
  OVERLAPPING object on the same layer and never change layer.
- **Z ladder** (all inside `.lgrid`, which has `isolation:isolate`): bg cells 1000, fg 2000, climb
  and pedestals 4000, 🎬 animation stages 4990, player and units 5000, corpses 5050, unit status 5060–5062, drops 5063,
  labels 5070 / talk prompt 5080 (`SCENE_LABEL_Z`), front objects 5101+, front paint 6000, revealed item names
  6010 (`FRONT_REVEAL_LABEL_Z`, lifted only when `itemCoverState` finds you share every Front obstacle covering
  the item — otherwise hidden behind unshared Front), item hover comparison callout 9400 (`TAKE_CALLOUT_Z`,
  always in front of Front blocks and props), door prompt 9500, conversation 9600. A z-index only counts inside
  one stacking context, so a new in-level label goes in the shared label layer, never inside the thing it labels.
- **Facing:** enemy art faces LEFT and player art faces RIGHT (`enemyNeedsFlip`,
  `playerSpriteMirrored`). A unit's facing has ONE gated writer (`wantFace` → `holdFacing`). Never
  add another direct `ep.face` write in the AI loop.
- **Damage invariants:**
  - Every player death goes through `playerDefeated(p, msg)`, and every player HP loss through
    `playerHpAfterHit` (god mode lives there; a test greps for a bare subtraction).
  - Every hit on a unit goes through `incomingUnitDamage` (fire excepted), asks `unitHitImmune(ep)`
    first and sets `ep.invuln = PLAYER_INVULN_FRAMES` after, exactly as the player's sites do with
    `p.invuln`. Fire and the gold revive glow alone ask `unitUntouchable` (the grace window). Tests
    grep for bare HP subtractions and for a hit site that skips the i-frames.
  - Your HP never sits above your HP bar (`hpCeil` clamp in the loop; the bar clamps its drawing).
    A new Playtest starts on the look's OWN HP (`maxPlayerHP(basePlayerAsset)`): it empties
    `equipped` in the same statement, so reading HP off `equipped` there gave last session's kit.
  - Every unit hit box starts at `unitHitTop`.
  - "What am I wearing" means `wornEquipMap`, not `equipped`. A slot emptied on purpose is `null`.
  - A spawn's weapon comes from `spawnWeaponFor`, and its look from `unitAssetAt` (a tag placement
    has no `enemyId`).
- **Spawns:** `lv.enemies["r,c"] = { enemyId | enemyTag, facing, ai?, dialogueId?, weaponId?,
  throwId?, throwCount?, gearTags? }`. `weaponId` "" means the look's own weapon, and `"none"`
  means bare hands. Rolls (tag looks, gear) happen once on level entry into that level's
  `roomState`. Only ▶ Playtest re-rolls.
- **Runs** are the game loop, in the block headed `RUNS — a playable chain of levels`.
  - `buildRun(runPool(), seed)` is seeded. It picks an Intro (a level with no open left-hand
    gate), then middles chained by `canAttach`, then an Exit (no open right-hand gate). **A floor
    is `RUN_LEVELS_PER_FLOOR` (8) street levels IN ALL, start and end counted** (his rule; sewers
    are extra). **A floor's POOL is not a run** (2026-11-01): "we are going to 24 levels per floor" means a floor will hold about 24 levels to pick from, and a seed still shows 8 of them. An agent set the constant to 24 and Blake: "YOU DO NOT SEE EVERY FREAKING LEVEL EVERY FREAKING SEED!!!! YOU SEE 8". Never change it without asking. **No level twice on a seed** (his rule): buildRun never re-picks a used street or sewer
    level, and a chain that runs dry ends at the last level an Exit joins. A run starts at the Intro's Lower Left gate even though it is closed (`spawnGateFor`). **A level's role comes from its gates and Floor only (`runRole`).** Blake
    retired the free-text Section box on 2026-10-09; an old save's `section` is ignored.
  - **A run is one floor's** (`buildRun(pool, seed, { floor })`, 2026-10-18): the Intro, the Exit and
    (with no Intro) the first level come from that floor; later levels join by gates alone. 🎲 Generate
    has a floor box (`runFloors`), opening on the editor level's floor; Hold-R keeps the run's floor.
    No floor = any Intro. **The game names its floor** (`gameRunFloor`, 2026-11-10): New Game is `GAME_FLOORS[0]` (Trailer Park), a save's `runFloor` rebuilds its own run's floor, and the studio's 🏁 Play run uses the editor level's floor. Vietnam S1 made a second Intro, and with no floor New Game started in Vietnam on some seeds. `GAME_FLOORS` is the order the floors are played in, and **the floors are chained** (Blake, 2026-11-10: "Yes, chain floors"): at a floor's end (`gameFinishFloor`) the save becomes the start of the next floor in `GAME_FLOORS` (`carryToNextFloor`: same game id, seed, fighter, gear, HP, money, lives, difficulty and score; no level, objectives or spent signs), and the Floor Complete card's Continue loads it, so after the General's briefing Continue opens Vietnam S1 with the Helicopter Arrival. The score's per-level books (`secs`, `cleared`) are keyed by run slot (`run1`...) and every floor's run reuses those slots, so the carry files the finished floor's entries as `"<floor>|run1"` (`fileScoreUnderFloor`): without that, the next floor's levels never paid their clear. Only the last floor (or a next floor with no level a run can start on, `gameNextFloorReady`) ends the game and drops the save; the studio's 🏁 Play run still stops at a floor's end. Vietnam S1 (`vtnms1a`, 2026-11-10) is Vietnam's Intro, FIREBASE FREEDOM (W gates closed, E2 open, column 159 is Forest M9's column 179 cell for cell): the 🎬 Helicopter Arrival (`cptrarv`, trigger "start", ending "play") is his Helicopter Rope ending run backwards (the same Chinook, hook and rope geometry, stage 64 x 30 on the ground at col 0); it sets you down on the LZ (PSP strip, Helipad Sign, Windsock), flies off east and ends invisible because a played stage keeps its last frame. The First Sergeant (`dlgfbs1`) meets you there; then the flag, the command tent, his Army Jeep (drivable), the supply tent with the Supply Sign (`splsign`), the mess under his Camo Net, the PX (PX Sign `pxsign1`, The Shop Keeper as the PX Clerk, `dlgfbpx` opens shop tag "Army or Drink or Food"), and the Firebase Gate (`fbgate1`: FIREBASE FREEDOM board, white EXIT board with a red arrow) with the gate MP (`dlgfbmp`, M16). Its objective marker "Stop 9/11 from happening in 50 years" has an empty target, so it stays up for the whole floor. **The two big tents are item rooms** (Blake, 2026-11-10: "make a Tent interior which spawns an Army tag. Keep in mind the closet on the TP floor ... Not a random jacket on the ground"): a door tagged "Tent" in each doorway (row 34, cols 63 and 98) and a second objective, "Gear up in the tents" (target "Tent", 100 points), the way Trailer Park S1 points at the TCloset. roomTag "Tent" holds Tent Int 1 (`tntint1`, the command tent: Situation Map, Office Flag, Bulletin Board, Radio Desk, Filing Cabinet) and Tent Int 2 (`tntint2`, the bunk and supply tent: Army Cot, Duffel Bags, Rifle Rack, Army Crates), so the two doors never get the same room on a seed. Each is VShaq 3's shell (floor, fences at cols 5/34, 🚶 plane rows 17-22, door 21,19) under a canvas GABLE (eaves row 7 at cols 6/34, ridge row 2 over col 20, two roof slopes as fg ramps) with the Tent Pole and an Oil Lantern at the back and sandbags in the near corners. One pedestal each, on a Footlocker: Army AND Good in Int 1, Army AND Common in Int 2 (the Army pool has five purples, and the PX already sells them). New props `tntcot1` / `tntlck1` / `tntpol1` / `tntmap1` / `tntduf1` under Army. Four more Army Bobs make the base busy, one line each (`dlgfbg1`-`dlgfbg4`: the gunner at the west gun, the command tent guard, the jeep mechanic, the mess cook). The backdrop is drawn like his Forest M11: single #4a5a28 canopies with a narrower crown on thin #2a2017 trunks and the night sky BETWEEN the trunks (the first version was one solid wall of leaves to the ground and read as a green sky), open sky over the LZ. C-Rations (`crtns01`, heal 15, tags T1 / Food / Heal) is the first item tagged Food. Vietnam is twelve middle levels, Forest M1-M12, all joined Lower Left to Lower Right (W2/E2, accepts "Vietnam"; M3, M4 and M21 also open up into Tree Tops — Tree Tops 1–5 (5 is the Eagle’s Nest, see the tree-top rules), where Tree Tops 4 `lvk24zl` pairs Squirrels `sqrl1x9` / `qp0eawu` with the Monkey enemy `mnky1x9` across stilted bamboo-and-thatch watchtowers, a twin-tier bamboo treehouse, a cantilevered camo-net perch, and a horizontal bamboo monkey-bar frame atop the bare canopy with zero ground trees or bushes), and a run lays them in any order. Forest M5 (2026-10-25) is the thick-jungle one with a single shack, his M4 shack whose door tag "Shaq" leads to VShaq, VShaq 2 (the WBOB radio shack, 2026-10-25), VShaq 3 (`vshaq03`, 2026-10-27: the Pho Shaq noodle kitchen, Viatnamese 5 as Mama Pho whose `dlgpho1` pho option heals, a T1 pedestal, its 11 `ph*` props filed under Vietnam / Interior, the `phearth` Packed Earth floor texture) or VShaq 4 (`vshaq04`, 2026-11-22: a village barber's hut, Viatnamese 4 as the Barber whose `dlgbrb1` shave heals, a T1 pedestal, 12 `bh*` props filed under Interior / Decoration / Vietnam, the `bhtile1` Clay Tile floor), each in three versions (see Shop Keeper versions of a room). Forest M6 (`vcfrm06`, 2026-10-26) is dense jungle with a mud creek bed (crocodiles) and a giant hollow tree on a ridge whose door tag "Tree" leads to a Tree Int room, like M1's; its spawns are all 🎲 tag rolls or animals. Forest M7 (`vcfrm07`, 2026-10-28) is a war-movie SET in the jungle ("NAPALM SUNSET", Monsoon Films): basecamp, video village, a hilltop set of fake huts on a painted backdrop, and a climbable light tower; 24 `mv*` props filed under Equipment / Stage / Interior / Decoration, the Megaphone (`mgphn01`, melee), the Craft Services items (`stcofe1`, `crdnut1`, `bxlnch1`, shop tag "Craft Services" via the sign's `dlgcrft`), and The Director (`3t3iost`, a Dress Bob character) whose `dlgdir1` can make him an ally or turn him hostile; the extras are 🎲 Vietkong tag rolls. Forest M8 (`vcfrm08`, 2026-10-28) is a UFO crash: the Downed Saucer (`uvsaucr`) the VC shot down, nose-down in a red crater with a scorched furrow behind it, the AA nest and a salvage camp; 12 `uv*` props in his own categories (Wacky, Army, Nature, Exterior, Effects). The tilted hull is walkable (hidden run-3 ramps under its top line). Little Green Men (`xclq3hs`) with Ray Guns (`qesn4h8`) hold the crater and the heap top, the rest are 🎲 Vietkong tag rolls, and Zorp, a Little Green Man in the camp's Bamboo Cage, becomes an ally through `dlgzorp` (100 points); an Odd + Legendary pedestal on the heap top rolls the Ray Gun. Forest M9 (`vcfrm09`, 2026-10-29) is the night assault on a Viet Cong base camp: a US squad of two Army Bobs at the west tree line (`dlgsqd1` Sarge, `dlgsqd2` Sparks; each tree ends on act friendly), a wired and staked kill zone, a rise (row 34) to the camp behind a bamboo palisade and the Camp Gate (QUYẾT THẮNG banner), two Tree Tops 3 style watchtowers (deck row 25, ladder), a gun nest, his M4 shack as the barracks (door tag "Shaq"), the walkable Log Bunker (`vbbnkr1`: hidden run-1 ramps under its straight sides, roof row 28, his AA Gun on it), a cook fire with a hazard, and the ammo dump under his Camo Net; 11 `vb*` props in his Army / Exterior / Effects categories. Its posts (towers, gun nest, bunker roof) are 🎲 Vietkong with a fixed `weaponId` and no gear roll (Mosin, AK-47, RPG, Type 53); the rest are his tag rolls. Forest M10 (`vcfrm10`, 2026-10-31) is a rock concert in the jungle, JUNGLE JAM '68: the crowd, a sound tower (deck row 27, ladder, Hippy pedestal), the Merch Stand (a sign whose `dlgmrch` is a shop of tag "Hippy") and a free-beer Ice Chest (`dlgbeer` heals) west of the walkable Concert Stage (`rkstage`: hidden run-1 ramps up both ends, deck row 32) under its truss backdrop and swinging lights; the band The Mekong Deltas on it are Dress Bob looks in category "Concert": Jet (`62moas1`, `dlgrck1` pays 100 points or turns him hostile), Lola (`a6a5vke`, `dlgrck2` ends on act friendly) and Moose the drummer (`jjfvdl1`); Jet and Lola swing the Electric Guitar (`rkguitr`, melee, tag Hippy). `rk*` props in the "Concert" folder plus the rock star outfit: Rock Star Jacket (`rkjackt`, his Lucky Dodge + Reflect), Lightning Pants (`rkpants`), Star Shades (`rkshade`), Band Tee (`rkteesh`). The raiders are 🎲 Vietkong tag rolls. No item, pedestal or shop uses a "Concert" TAG (Blake, 2026-10-31: a needless tag); "Concert" is only a look/prop folder. Forest M11 (`3zyuyzu`) is his own: a canopy deck (row 12) whose vine ladder only a high jump reaches, a Rare pedestal on it. Forest M12 (`vcfrm12`, 2026-10-31) is thick jungle with two climbing trees that pay for Agility (see Agility gates below): the Old Banyan's low limb (row 23, net 4 rows over your head, Agility 7, Good pedestal) under an upper limb that roofs the net's top, its crown limb (row 8, net 6 rows over the low limb, Agility 9, Legendary pedestal, the Monkey `mnky1x9` on guard), and the east tree's limb (row 20, net 5 rows up, Agility 8, Rare pedestal). Red laterite under a knoll, bare loam under the banyan and a mud hollow (a crocodile, a Heal/Drink pedestal); every ground seam is a straight ramp diagonal. The VC are 🎲 tag rolls. Forest M17 (`vcfrm17`, 2026-11-21, W2/E2, 180 wide) is dense jungle with a canopy PARKOUR route any look can run (Agility 1 and Speed 0 measured): a vine ladder (col 9) to limb A (row 26), the vine line (bars, row 18, cols 19-43) over the gorge, a drop onto limb B (row 29), a vine ladder (col 59) to limb C (row 16, a Heal OR Food pedestal), a running leap to the karst cap (row 18, cols 89-104) or straight onto the cliff ledge (row 9, cols 92-119), a shimmy and drop onto limb D (row 18), and a vine ladder (col 134) to the VC lookout (bamboo deck row 8 under his Camo Net, one Vietnam AND Rare pedestal, a sniper on guard). A drop off a hang keeps the shimmy's momentum (about 10 cols at Speed 5, 14 at Speed 10), so the vine line ends 1 col short of limb B and the ledge 6 cols into limb D; measured landings stay on the limbs from Speed 0 to 10. Below it the ground route (a V-sided mud creek with a crocodile, the karst knoll) walks edge to edge both ways. Its painted blobs have clean 45-degree chamfers (ramp cells ON the diagonal, cells inside it untouched): a single corner ramp with empty cells beside it is what Blake called "broken jagged edges". Forest M18 (`vcfrm18`, 2026-11-21, W2/E2, 180 wide) is the raid on a French colonial mansion the VC hold, a three-storey cutaway (his Trailer Park S1 house style: Background wallpaper with a cornice and wainscot, plank floor slabs, ochre outer walls two columns thick, a terracotta roof). Floor tops: lawn 36, ground floor 34 (porch steps both ends), F2 24, F3 14, roof slab 4, so every storey has 9 clear rows. The way through, both ways: the foyer (two storeys tall, chandelier, piano) -> the grand stair (cols 60-69) up to F2 -> hatch A (cols 76-79, a 2-wide ladder) down into the dining room -> the kitchen (a Food OR Drink pedestal) -> the back porch. Off the route: hatch B (cols 92-95) from F2 up to F3 west (VC barracks and the library), the office stair (cols 100-109) up to F3 east (the commander's office, one Vietnam AND Good pedestal), and hatch C (cols 134-137) down to F2 east, the master bedroom. Fifteen 🎲 Vietkong on every floor; Seek units follow you up and down the hatch ladders. New props `mnchnd1` Chandelier, `mnpian1` Grand Piano, `mndtbl1` Dining Table, `mnfire1` Fireplace, `mnfan01` Ceiling Fan, `mnrail1` Balustrade (Interior) and `mnport1` Portrait (Decoration). Generator: `gen18.js` + `props18.js` in that session's scratchpad. Forest M19 (`vcfrm19`, 2026-11-21, W2/E2, 200 wide) is the CAR level, a laterite dike road through the paddies: the Xe Lam (`xelam01`, drivable) waits at the village stop (col 13) beside its driver (`dlgxlm1`, one line) and a Food OR Drink pedestal; the road climbs run-4 ramps onto the dike (row 34) between flooded paddies (Front water), passes a bomb crater with a puddle, goes down a gentle west bank (row 36 at run 4, then run 2) into the river (bed row 42, a crocodile), up a fallen plank span (run 2) to the east road and a burnt US convoy on a rise (Burnt Army Truck `brnatrk` and Burnt Jeep `brnjeep`, his Army Truck's and Jeep's Destroyed looks as Army props, with smoke, wire and sandbags), one Army AND Good pedestal and a 🎲 Vietkong gun ambush. The VC before the river are melee Seek units the car runs down: a gun guard on the dike met the car first, and one M40 Sniper roll (35 a shot) wrecked the 55 HP Xe Lam 4 s after it set off. A headless both-ways scan (every start column, full gas from rest, crash AND landing damage counted) is clean for the Xe Lam, Jeep, Beetle, Pickup and Army Truck (the Monster Truck is Trailer Park's and is not tuned for it); driven in the real game edge to edge both ways and walked both ways. Generator: `gen19.js` + `xelam.js` in that session's scratchpad. Trailor Park M19 (`trpm19a`, 2026-11-05, redrawn 2026-11-06 after "ugly and basic ... props largely misaligned", W2/E2, 160 wide) is the Agility course (see Agility gates): the Roadside Billboard (`trbill1`, FIZZ COLA) whose catwalk (row 21) is an Agility 8 jump up through a trapdoor at col 51 (a lookout, no reward), the Deer Stand (`trdeer1`, a closed blind: roof row 12, walls cols 87/93, floor row 21, trapdoor col 90, Agility 9, a Heal OR Drink pedestal) and the Water Tower (`trtowr1`, TRAILOR PARK on the tank, catwalk row 19, trapdoor col 129, Agility 10, one Rare AND Trailer pedestal and a guard). Those two are the level's only item sources (rebalanced 2026-11-06, see Rewards are scarce). Every hidden collision cell lies under art covering exactly that cell, coloured like it (props authored in level cells, `props2.js` of that session); the misalignment he saw was full-cell collision under thin or offset art. Big pieces carry his #2b2b2b outline like his trailers. Lawn flamingos and a card table at the west end, corn behind the deer stand, a chicken coop in the east, clouds; power poles at cols 22 and 153 like M16, HIS Trailer 6 in the foreground at col 0 (no door, his edit), 🎲 Trailer residents. Trailor Park M20 (`trpm20a`, 2026-11-07, W2/E2, 160 wide, built on M19's street and poles) is the junkyard parkour route to the Double Billboard (`trbil2`, LUCKY LOU'S BAIL BONDS under STARLITE DRIVE-IN), its one item source, no trailers: the walkable Scrap Heap (`trscrp1`, hidden run-3 ramps under its top line, flat top row 29 cols 48-51) is the takeoff for an Agility 6 jump onto the yard power line (cliff, row 17, west pole col 22 to the billboard's riser mast col 102; 120.5 px just catches it, 7 is clean, 5 misses); shimmy it over the 🎲 Trailer gang, drop onto the lower catwalk (row 25, broken grating cols 122-125, a guard at col 142), and an Agility 8 jump with W at col 148 catches the ladder (rows 10-12) up through the upper catwalk's trapdoor (row 11) to one Rare AND Shoes pedestal (Super Boots). Hanging from the line (feet row 24) or on the catwalk, no ground unit can hit you or follow (attacks need `sameLevel`, walks `unitSharesLevel`, and no ladder foot reaches the floor), while you can shoot down: measured 0 hits in 900 frames over the gun guards. Junked Pickup / Junked Beetle (`jnkpkp1`, `jnkbtl1`) are his cars' Destroyed looks as scenery props; Burn Barrel `trbrnb1`, Salvage Sign `trslvg1`. Trailor Park M16 (2026-10-25, W2/E2) has the Liquor Store (`lqstor1`) with a door tagged "Liquor Store"; its room is Liquor Store 1 (`lqroom1`, roomTag "Liquor Store": Trailor Int5's top-down shell reskinned, The Shop Keeper selling the "Drink" items via `dlgliq1`). Trailor Park M17 (`trpm17a`, 2026-11-01, W2/E2) is the car stunt jump: parked 1969 Muscle Car (`mscl69m`, speed 1.25) at col 8, a 46-col run-up strip, a 10-row launch kicker (cols 52–71) rising to row 25, two 1960s School Buses (`schbus6`) parked bumper-to-bumper on row 35 (cols 73–102), soaring flight over both roofs (apex row 23.6 vs bus roof row 29), landing at col 103, and smashing into stacked Hay Bales (`frmbale`) and Hay Stack (`frmhays`) at cols 124–136 with cliff climb lines, plus Trailer 2 (`trlr002`) and stunt reward pedestal. Trailer Park M4 (`ml8g3tb`, HIS level: Pika-Squirrel gatekeeper, his red fence + net, Pit-Porions, Ash Kechmeoutside) is an OVERGROWN FIELD at night (2026-11-18). A first pass as a tournament (arch, bracket board, podium, signs, stands) was "ugly" and he removed all of it: "You're obsessed with texts and signs". **Polishing a level means terrain and natural scenery in his cell style, never text props or signs.** What it has now is background paint plus his own bushes: far hills as ramp drags in his blue-grey #3a3f52, his tree copied to cols 33, 110 (mirrored), 126 and 144 (mirrored), his cloud copied twice, an olive #556b2f grass band along the road (0-1 rows by the trailers, up to 3 near Ash), and his Bush / berry bushes. Foreground, spawns, dialogue, door and gates are untouched; the tournament props `tm*` are retired. Trailor Park M18 (`trpm18a`, 2026-11-01, W1/E1 like M4, 200 wide) is the drag strip, DUSTBOWL DRAGWAY: the Dragster (`drgstr1`) on the launch pad (cols 47–60, its nose on col 48 beside the Christmas Tree `drgtree`), a straight asphalt strip on row 20 (cols 21–178) past two grandstands, the crowd and a guardrail, the 1/8 Mile Marker, the Timing Board (`drgbord`, E.T. 7.98, 186 MPH) and the Finish Line arch (`drgfnsh`, col 157). Past the finish the RPG guy (TE3 `8wrlq12` with the RPG `ma7adq1`, Guard) waits behind sandbags at col 184: he fires once the car is about 25 cells off, and one rocket wrecks the Dragster. A Speed/Rare pedestal sits behind the tyre stack; the pit crew at cols 9 and 15 are 🎲 Trailer tag rolls. Its `drg*` props are filed under his Equipment / Decoration / Stage / Exterior folders. Trailer Park M21 (`trpm21a`, 2026-11-08, W1/W2/E1/E2 like M7 and M14, 160 wide, both edges cut exactly like M7's) is the two-lane junkyard: the gravel hill slab (rows 20-21) at each end over the earth cutaway, and between them the TRI-COUNTY AUTO WRECKING yard. The upper lane (row 20) crosses on the junk: the Gantry Crane's girder (`jygantr`, 10 TON, a junked sedan on its magnet over the Car Crusher `jycrush`), the Salvage Office's deck (`jyofice`: a tin shed with a PARTS window and WE BUY JUNK CARS, its roof on row 11), two Car Stacks (`jystck1`, `jystck2`, one flipped) and a Steel I-Beam (`jyibeam`). Three 4-cell ladder shafts with 2-wide ladders join the lanes (cols 14-17, 60-63, 104-107), and a ladder beside the roof's east end climbs to it. The lower lane (row 35) is the yard: Chain-Link Fence panels (`jyfence`), Tyre Piles (`jytyres`), BRUTUS's Dog House (`jydogh1`) and its Beware of Dog sign (`jydogsn`), M20's junked cars, burn barrels and tyre stacks, and a drinks machine and break table under the office. Item sources: Trailer AND Meelee on the roof (the Sledgehammer is its one purple) and Drink by the machine. His Pit Bulls (`lu5q4sk`, `5ey3l1q`) roam the yard; the scrappers are 🎲 Trailer tag rolls. The `jy*` props are filed under Exterior / Equipment / Decoration. Trailer Park M23 (`trpm23a`, 2026-11-15, W2 in / E1 out, 180 wide) is the monster truck rally, THUNDER PIT: a hill climb from row 35 to row 20. Its gates come from a 500-seed run simulation: a 2→1 level gave the evenest spread of how often each Trailer Park level shows up (sd 19.0 → 15.1), and every seed still lays 8 levels with an Exit. The Monster Truck (`mnstrk1`, drivable, size 20, hp 150, his Pickup's body lifted on two 66-unit tyres, MUDSLINGER) is parked at col 22. Ahead of it are the crush row (three Crushed Car props `crcrsh1`-`3` on row 33, cols 48-71), a mud pit of Front Dirty Water, and terraces up to the top. The surface is M2's two-row band over grass: gravel at the ends, packed earth on the course. The props are the Rally Billboard (`mtbill1`), the Stadium Stands, HIS Trailer 6 with a door tagged "Trailer Int", light towers, hay bales, tyre stacks and the concession stand with one Drink pedestal. His edit (2026-11-15) took out the Pit Boss and deleted his dialogue `dlgmtk1` (gone from the repo library too) and added an Eagle (`eagl1x9`, seek) over the start; it pecks a driven truck for 1 hp a swoop. The rest are 🎲 Trailer tag rolls and a Pit Bull. **The invisible wall he hit (2026-11-15) is a terrain rule, not physics.** vehicleStep's bumper probe extends the wheel line about 4 cells ahead of the front wheel. Only cells within 2 columns of a ramp (`isHillFormationCell`) are exempt. So a short run-3 ramp onto a long flat top stops the car when its bumper reaches past those 2 columns while the wheel is still low. Two layouts did this. One was a dip (the car nose-down, its rear on the next ramp); heading west the truck stalled at col 74 from rest. The other was a fast approach (13-16 px/frame east, at col 50 and col 121). The fixed layout has no dip east of the crushed cars (row 33 continues to col 87, then a run-3 ramp up to row 31). The ramp onto the cars is run 4 (cols 40-47). The row-27 terrace climb ends with a run-6 row (cols 116-121); his Hay Bale moved to col 122 and the light tower to col 126. A headless scan starts each vehicle at rest at every column, both ways, under full gas. With the fix it records 0 crashes and 0 stalls for the truck and his Pickup, Beetle, Muscle Car, Jeep and Mustang. Driven in the real game both ways from edge to edge. When building a car course, run that both-ways scan; a single drive from the parking spot missed both bugs. Trailer Park M24 (`trpm24a`, 2026-11-17, W2/E2 plus the S2 manhole down to the sewer, gates and both edge columns exactly M5's, M5's manhole copied cell for cell at cols 100-122) is the parkour level at the drained PINE LAGOON community pool (CLOSED). The route goes up the Snack Shack ladder (cols 12-13) to its roof (row 26), across the Cabana roof (row 24) and the Lifeguard Tower deck (row 22). From there the high pennant line (bars, row 14) carries you over the pool; hold S at its east end to drop onto the High Dive board (row 22) and one Slide pedestal (Bobs Skates or #2 Socks). The low pennant line (row 27) crosses the pool from the deck, and the deep end's ladder climbs straight onto it. In the east, the Water Slide tower ladder (cols 120-121) climbs to the platform (row 12), and the flume rides down east to the deck. Every walkway is hidden fg under art that covers exactly that cell. There is a Food or Drink pedestal by the shack. **The pool is the car stopper:** walls of 5 rows (shallow) and 9 rows (deep) against a 10 px wheel step. A headless vehicleStep scan from both sides traps every drivable car in it, and the 30-cell School Bus can only back out the way it came. Nothing solid stands on deck rows 28-34. Props are `pl*`, filed under Decoration / Exterior. The units are 🎲 Trailer tag rolls plus two Pit Bulls (one in the deep end). Trailer Park M25 (`trpm25a`, 2026-11-25, W2/E2, 180 wide, edge columns M16's) is Forest M18 rebuilt as a 1980s Miami mansion (white stucco, gold trim, Spanish tile roof, pink and turquoise rooms): every storey, slab, hatch, stair and car wall is M18's, the lawn comes up to row 35 to meet the street, and the foyer gains a second 📶 flight mirrored round a Fountain (`mmfntn1`, a gold globe on top), rising west to a gallery (row 24, cols 38-42). Upstairs the office over the foyer (Executive Desk `mmdesk1`, one Gun AND Rare pedestal) is the balcony shootout; the den on F3 west (deal table, wrapped bricks) holds one Drug pedestal. The pool on the east lawn (cols 156-171) is square: stone coping on row 35, tile walls, a one-row step at each end (cols 158-159 and 168-169, so Agility -1 walks in and out), a tile bottom on row 37, Front Pool Water `plwatr1` on rows 35-36 with pool tile painted in the Background behind it (Front fades round Bob, and an empty Background showed the night backdrop through the water). Floors are Marble Checker (`mmchkr1`). Gunmen are his Agent look (`c4ft0d4`, gear T1 + Gun), two 🎲 Trailer thugs and two Pit Bulls. New props `mmcolm1` Deco Column (Exterior), `mmwndw1` Arched Window (Interior). **Cleanup 2026-11-25** (Blake: "looks ai made but poorly": AI-looking chandelier, power lines cut off, a nightstand over a dresser, a standing bear rug, a floating piano, oversized kitchen, a cash register in a mansion, a jagged pool, floating columns). Power poles at cols 5 and 176 in M19's recipe (pole, arms, ladder rows 26-34) end the rows 17/25 lines from the edges, so a seed never cuts them. The porch columns stand on the porch floor (row 34) under a terracotta canopy (rows 23-24) and the open porch shows sky. `mnchnd1` Chandelier, `mnpian1` Grand Piano and `mmcolm1` were redrawn flat in his style; M18 shares the chandelier and piano, so it changed too, and the piano now stands on its legs. The kitchen is real scale beside Bob (cabinets 6, oven 3, fridge 5, the Dining Table and fan over it), the F2 nightstand stands clear beside the bed, then the dresser, and the bear rug is the new flat `mmbrrg1` Bear Rug. The lounge's store counter and WHISKEY shelf became the new `mmbar01` Home Bar (stools, ice bucket, no till) and `mmbbar1` Back Bar (mirror, bottles, no lettering). Generators `gen25.js`/`props25.js`, then `fix25.js`/`props-fix.js` (the cleanup, run on his newest copy), in those sessions' scratchpads.
  - **A floor can have several Intros** (2026-11-21): `pick(intros)` draws one `rnd()` however many
    there are, so a second Intro with the first one's exact gates changes only the room a seed starts
    in, and every later level of the run lays the same. Trailer Park S2 (`trps2a1`) and S3 (`trps3a1`)
    are S1 with small changes; a third of the seeds start in each. Vietnam S2 (`vtnms2a`: his Army Truck in place of the Jeep, the fuel drums on the LZ, the PX and the mess trade places, the flare over the LZ) and Vietnam S3 (`vtnms3a`: the Jeep parked by the flagpole, the command tent with its lantern and door 11 columns east, the PX tent in Army Tent (Tan) `ufotnt2`) are Vietnam S1 the same way (Blake, 2026-11-26) and keep its Helicopter Arrival marker on column 0. The two item-room tents stay olive because their interiors are olive canvas. **Talking reaches 6 cells (`TALK_RANGE_CELLS`) and takes E before a car does**, so a talker standing on a parked car hides its Press E to drive: keep at least a few of its columns clear of every talker. A variant keeps the original's
    gates and its edge columns (0, 1, 158, 159) cell for cell; change only what is inside. A REAL
    library test checks all three. **A textured cell draws its texture's own colours** (the tile's
    ground covers the cell's `c`), so a wallpaper in a new colour is a new texture record.
  - Sewers and tree tops (Floor "Sewer", "Underground" or "Tree Top") are planned as passages
    with a way out. **No street level is laid with a top/bottom gate that leads nowhere** (his rule,
    2026-10-11: "an impossible seed"): `tryLay` takes a level back when its passage cannot be
    planned (`vertDead`), the Exit included, and the step back to an Exit never cuts a passage.
  - His sewers: M1/M5 (N1 in, E1 on), M3/M4 (W1/E1 tunnels) and two EXITS, M2 and Sewer M6
    (`swrm06a`, 2026-11-19: W1 in, N2 manhole up). Every sewer chain climbs out through an exit, so
    a second exit spreads the sewers out (400 seeds: M2 282 -> 184, M6 200). M6 keeps M2's rows 0-9
    and manhole shaft cell for cell (an N2 shaft must line up with every street S2 manhole); below
    that, a flooded stretch (no walkway, Front water, a one-row dip) and, past the manhole, the dead
    end: a drop shaft to a lower gallery running back west to one T1 pedestal, with a sunken pool.
  - One level is live at a time. Neighbours are drawn whole from cached tiles. Their units are
    adopted into the live level (`adoptRunNeighbours` / `releaseRunUnits`), so shots and chases
    cross gates.
  - **The levels above, below and diagonal are drawn too, gate or no gate** (`runSceneryNodes`;
    scenery only, units not drawn). A level two routes of seams put in two places (a staggered
    sewer) is never drawn (`runPlacements`), or it leaps at the next gate. What is still uncovered
    over a sewer gets the sewer's own top row repeated up (`runFills`), worked out from the LIVE
    level's view so it never paints over a drawn level (from the sewer's view it landed on the
    next street's sky). Nothing over a sewer may be black (his 2026-10-11 reports).
  - Crossing a gate is `seamHandoff`. Side gates are keys, and the whole shared edge opens.
    Top/bottom gates must line up.
- **Camera:** `cameraTarget` clamps to the union of the drawn levels (`runCameraParts`), feeds
  `camRef`, and becomes a `translate3d` on `.lgrid` inside `commitFrame`. Nothing scrolls during
  play. A level above or below (top/bottom seam, scenery, the sewer fill) widens it up and down
  only (`yOnly`), never sideways, or a risen view slides off the end of a sewer into nothing.
  Under every street level its bottom row is repeated `RUN_FILL_BELOW_ROWS` down (`runFills`) and the
  camera may always go that deep (`below:` part), so the view never moves at a gate, sewer or not.
  So on his 871 px view play shows only ~14.5 rows above the body's middle (floor row 35 → row 17
  and down). A 2.5D room in a street level (Trailor Park S1) puts its ceiling inside that band.
- **Rooms play zoomed in** (`roomViewZoom`, `camRef.current.z`): the view is ROOM_VIEW_ROWS (16) rows
  tall, capped where the room covers the view, never below 1; streets are always 1. Anything that
  turns the camera into a level-pixel rectangle divides `clientWidth/Height` by `z` (cull, talk
  bubble, sound view). The camera centres a narrow room (`centreRoomInView`), not margin:auto.
  In a 24-row room the view never climbs above about row 4, even with you on the plane's back row,
  so a sign or anything meant to be read sits at row 5 or lower (VShaq 2's WBOB sign was cut off at row 3).
- **Dialogue trees** are the sixth saved kind: `{ id, name, start, once?, nodes: { nId: { speaker,
  text, choices: [{ text, to, act, tone, shopTag? }] } } }`. `to` and `act` are independent. Keys
  1–9 pick options. A tree on a spawn makes it peaceful, and a conversation pauses the WORLD. A shop
  is an `act`. Money is an item (`{kind:"money"}`), and the wallet is run-wide. **A shop tag can
  name several tags** (`shopTagFilter`, Blake 2026-11-10: "a shop that sells "Army or Drink or
  Food""): "or" (or `,` `/` `|`) sells anything with ANY of them, "and" (or `&` `+`) only what has
  ALL of them, through the pedestal's own matcher (`itemMatchesPedestal`); a single tag such as
  "Craft Services" is still one tag. The box takes 48 characters.
- **🎬 Animations (cutscenes)** are assets of type `"anim"` (no new saved kind); the rules are in
  `src/anim.js`, which is the game's like `audio.js`. Built on the 🎬 Animations screen, placed with
  a 🎬 marker whose cell is the stage's BOTTOM-LEFT (`animStageBox`; `flipMarkerLayer` moves it on
  a mirror). Layers are props plus one actor: the player's own look, keyed by its HIP and turned
  about it (`animActorHip`, `animActorBlocks`). Number values ease between keys; pose/flip/play
  switch AT a key. A waiting state holds for E; its fade-in and prompt go by elapsed `el`, never
  the looped `t`. Its prompt hangs by a chosen layer (`promptLayer`, raised `promptLift`), and a
  state's sound loops for exactly that state, so a sound that must stop on a HIT (the alarm) gets
  a short state of its own. Draw order is per LAYER, never per key, and an actor moving under a
  covering layer that moves slower shows through it. A prop can be squashed per key (`sx`/`sy`,
  Width/Height in the editor, about its bottom-centre, `animPropTransform`). A BLANKET is its own
  layer kind, `"cloth"` (🛏 in the editor): `animClothShape` works its shape out fresh every frame
  from the actor's outline (`animActorParts`) — it lies over whatever of him is under it, up to
  `cover` cells along his body from the hip, an arm coming out past its head end lifts the edge,
  spare cloth (`len`) bunches into rolls and folds, and `lift` raises its head end hem and all.
  Its colour is the layer's `color` (the Colour box under Show; none is his rust quilt, `CLOTH_LOOK`):
  `clothLook` keeps the white sheet and works the dots (+16 lightness) and seam (-8) out of it.
  A stiff drawing moved, turned or squashed under a moving body was rejected eight times ("cheap,
  ugly and unnatural"); never cover a moving body with a prop again. The Bed: the blanket's keys
  are only on the body's own keys (cover 2.8 → 0.5 on the sit-up, thrown on the arm raise, heap as
  it comes down; CLAUDE-HISTORY.md has every key). When it starts AT him (sat up, x0 past its head
  end) its outline climbs his body only as high as the cut plus its thickness (`hug`) — the slope
  tent stood a wall in front of his shoulders. Never invent a motion he did not ask for to hang a
  fix on. An actor's prompt centres on the BODY (`animActorPromptSpot`), not the hip.
  A ROPE is a layer kind too (`"rope"`, 🪢): it hangs from a point of a prop layer (`from`,
  hookX/hookY; `animPropPoint` is animPropTransform's math) and, with `hold`, runs to the actor's
  raised hands (`animHandsAt`), so only the ship and the actor need keys. "Walk up + E": the states
  before `eState` are scenery (actor hidden); state 0 loops until you walk into the stage, then the
  rest play by themselves and the last holds with its prompt (`animSceneryStep`); E only within
  `ANIM_REACH_CELLS` of where the actor starts, and the actor starts from where you stood
  (`animEntryOffset`). Every key is a stop for EVERY layer (smoothstep per span), so a flight is
  one key span. Front paint and Front objects draw over a playing stage.
  **Floor end** (`trigger: "floor"` + `floor`, 2026-10-17) is never placed: when a "Leave the floor"
  scene ends, `floorEndAnim` picks the one for the level's Floor and it plays over the whole view
  (`.animScreen`, letterboxed by `animScreenFit`), then the floor ends. Trailor Park's is `gnrlbrf`, the
  General's briefing (props gnrlcu1 / chnkcb1 / cbnsky1). A **🔤 text layer** is words in a window down
  to y: `rise` is the one field that moves at an EVEN speed (`ANIM_LINEAR_FIELDS`, a crawl must not
  stall at other layers' keys), `tilt` leans it back. **Every state's first key must carry every
  layer**: one left out falls back to its default spot (the sky dropped out of the windows).
  A **🧑 Character layer** (`kind: "look"`, `lookId`, `size` cells tall, 2026-11-07) is a saved look that
  is NOT you, posed like the actor about its hip, `sx/sy` a zoom about the hip, `talk` = its mouth moves
  (`animTalkOpen`, an uneven 9 fps beat, beat 0 shut). `weaponId` (🔫 picker under the look, "" = ✋ empty
  hands, 2026-11-12) puts a weapon in its hands: `animLookHeld` grips the weapon's Rest art for that body's
  fit and sweeps it about the shoulder by the key's arm turn (`attachWeaponBlocks`), so `arms` 90 on a
  top-pivot arm holds it level. Side/Crouch only. The look's own frozen gun is still stripped (animActorBlocks).
  The mouth is the skin's **👄 Talking mouth** blocks
  (`piece.talkMouth`, a skin checkbox): `layerBodyAndOverlays(..., { mouthOpen })` draws them only on an
  open beat (`animLookArt`, re-composed from the look's components); everywhere else they never show, and
  the asset editor hides them unless one is selected. Blake asked for the General as "an actual character
  ... using Bobs body type" instead of the necked close-up. The briefing (`gnrlbr2`) shows **The General
  (Briefing)** `gnrlbf1` (Army folder: General Skin `gnrlskn` on BoB, General's Cap `gnrlcap`, General's
  Jacket `gnrljkt`, his White Dress Shirt / Military Fatigues / Army Boots), NOT the playable Starter
  **The General** `thgnrl1`: he re-dressed that one and the cutscene changed with it ("I don't want him
  to have the starter look in the cut scene"). `thgnrl1` is locked behind 500 enemies defeated in
  Vietnam (STARTER_LOCKS `on`, the game record's `floorKills`). `gnrlcu1` stays, unused.
  The 🎬 editor: only DRAWN pieces take a click (`.animStage.ed` css, `elementsFromPoint` over
  `data-ly`); a drag on the SELECTED layer's pieces moves it even under another; nothing changes
  before ANIM_DRAG_SLOP; prop corner = Size, blanket ends = Head/Foot; arrows nudge; Move: All keys
  is `animShiftLayer`. ↩/↪ (Ctrl+Z/Y) step through `animRemember` and never restore an older
  id/savedAt; ↺ Last save reloads the saved copy. **The editor saves by itself** ANIM_AUTOSAVE_MS after
  a change (`animAutoSaves`: saved before, same name; new/renamed wait for 💾), and ‹ Menu, ✚ New, 📂 and
  closing the page write first — only 💾 wrote before, and his edits were lost for a day (2026-10-17).
  **Shortening a state never leaves keys past its end**: Length is set on Enter/blur (typing 30 over 44
  passes 3), ⇔ Stretch scales every key (`animSetLength`), otherwise the tail is cut with a key at the
  new end holding that frame; ✂ Start / ✂ End cut at the playhead (`animCutStart`/`animCutEnd`).
  "Level start" begins in the play effect, "Walk up + E" last in the E chain, "Walk in"
  (`animWalkedIn`, 2026-11-10: no E, it starts once when you reach the spot its actor starts on; until
  then the stage shows state 0's first frame with no actor) right after that chain, all
  through `beginCut`; a cutscene pauses the world like a conversation (`cutFrame`, one return at
  the top of the loop). "You take over" puts your standing hip on the actor's last hip and clears
  the queued gate spawn. A finished stage hands back its cached element (`animStageCache`).
- **Performance.** The component re-renders every frame (`setPframe` through `commitFrame`), so
  everything in the render body runs 60+ times a second.
  - Nothing in the render body reads the library bare; `useMemo` it.
  - Sort names with `NAME_COLLATOR` / `NUMERIC_COLLATOR`, never `localeCompare` with options.
  - Cell predicates allocate nothing.
  - Anything that must be on screen for the frame it was computed in goes through `commitFrame`.
  - Keep keyed lists in a stable order during play (`runGridOrder`, `unitDrawOrder`). A reorder is
    a DOM move.
  - "Stuttery" (frame pacing) and "low FPS" (load) are different bugs; ask which one he means. On
    his machine the frame cost is paint, not script.
  - A unit's sprite element is reused while `unitArtSig(ep)`, its asset, weapon, placement and size
    are unchanged (`unitArtCache`). New art input that is not on `ep` must join that check.
- **Limbs seen from behind (ladder, Back pose) move by TRANSLATION, never rotation.** A hip
  rotation only splays a leg from behind, and a far-side pant twin counter-rotates off the leg.
  Units climbing take the player's ladder step (`legLift`), not the walk swing, and raise
  their arms like yours (`eClimbArms`, ahead of aim/swing; creatures keep paws as drawn). Raised ladder arms
  may drop but not rise (`LADDER_ARM_REACH_UP`), or they float off the shoulder.
- **Every climb frees the gun hand** (`climbFreesGunArm`: ladder, bars, ledge). Only the gun arm and
  its sleeves aim (`gunArmOnly`, also skipped by the ladder pump); the off hand stays on the rung or grip.
  With a gun in hand the arrows aim and only W/S climb (`mergeInputIntent(RK, gunAims)`).
- **The aim assist's floor lock is for a STANDING player** (`playerFloorLocks`). Climbing, your feet are
  in the air, so a unit on the ground just under them counted as "on your floor" and the shot swung 85°
  down at it, arm and all: "arms go the other way" on a power line, only on the side the unit stood.
- **The arm points where the shot goes.** ↑ alone is -90 off level everywhere the drawn Aim-up pose
  is not shown (walking, ladder, plane, push-off); `aimArmOffsetDeg(-1)` must equal `aimAngleDeg(-1)`.
- **A 🚶 plane is a floor to the render** (`airborne` excludes `p.topdown`). The loop keeps
  `p.onGround` false on it, and a plane over open air drew the jump pose and lean.
- **The CSS sheets are JS template literals.** A backtick in a CSS comment breaks the build at a
  line far from the cause.
- **The play effect re-runs for reasons that are not a new session** (a landed grenade paints fire with
  setLevel, a pickup bumps `equipGen`, a door changes `level`). Anything it seeds must be keyed:
  `throwStockKey` (playRunId|picker id|knob) seeds the throwable stack once a session and
  `wpnClipKey` (playRunId|asset|knob) keeps the clip across re-runs, or every Pokeball landing in its
  own fire refilled the stack ("infinite, not 3").
- **One body box for throws.** `unitBodyBox` is what a rock stops on, a stun reaches and a Capture ball
  claims. A bare `topFrac * height` sits above an animal by its ground anchor (`unitHitTop`); the capture
  payout used it, so a Crocodile (scale 1.6) was never caught and a Lion only by luck.
- **A grip that goes nowhere lets go** (`CLIMB_IDLE_LET_GO_FRAMES`): a unit on a ladder/bar/ledge with its
  target level and no movement for 1.5 s drops. Corpses clear `ep.climbing`. Crocobob, Ratman and Turtle
  Man are `character`s (people), so Capture refuses them by design — only Enemy-creator assets are catchable.
- A helper that two blocks of the play loop both call belongs at loop level. A `const` in one block
  is invisible to its sibling, and that once crashed the game on a parry.
- **Vehicle HP is halved ONCE on load** (2026-11-01, `vehicleHalveHpOnce`): a vehicle record without
  `hpHalved: true` has its `hp` halved and gets the flag. A vehicle record you generate must carry
  `hpHalved: true` with the HP it should really have, or it loses half. Default HP is 75.
- **🚗 Cars only Foreground paint** (`carsOnly` + `hideInPlay` on a fill) is a wall only cars meet:
  `fgSolid` skips it, `vehSolid` adds `fgCarWall`. For a Front-layer interior a car must not enter.
- **Vehicles: the rules are `src/vehicle.js`** (pure, `vehicle.test.js`); the loop's 🚗 blocks wire
  them to the level. A placed car is drawn by the ordinary prop passes, untouched, until you get in
  or a blast or a grenade's fire reaches it. Then it is a LIVE car in `vehLive` (one bucket per
  level, by runKey or id, cleared when play starts), drawn by `vehCarEl`. A car is keyed RUN-WIDE by
  its uid (the level it was placed in, then the placement), because it can be driven out of its
  level: `seamHandoff` moves every live car standing in the level being entered into that level's
  bucket, re-based, and `vehWoken` (not the bucket) is what the three placement passes ask
  (`vehIsLive`), so its placement back home stays empty. Its ground (`vehWorld`) asks
  `worldParts`, as units do. A car is a rigid BODY (2026-11-07, Blake: "when you go over the manhole
  the vehichle becomes magic, becomes flat and stops following the laws of physics"): there is NO
  floor made up across a hole (3c15320's bridge is gone; never bring it back). A wheel over a hole
  drops into it; the underside, `clear` px above the wheel line (`vehicleClearanceOf`, off his art),
  comes down onto the lips between and past the wheels and the car rests there (high-centred on a
  crest); a wheel in a hole rolls up out over the far lip along its tyre's curve (`rollOut`, onto a
  lip no more than a wheel across above the other wheel's road), and a nose that runs into the far
  side rides up it at a 60° approach. In the air a leading wheel whose
  hub meets a block hits its face, the trailing wheel rides over a corner, and the belly lands on a
  lip. NO ARCADE (2026-11-07, Blake: "I still dislike how the car auto flattens out as soon as it
  gets air ... Not every car has to be able to clear it ... stupid arcady bunny hop mechanism", "Get
  rid of that arcadey bullshit"): there is no launch rule, no boost and no levelling. Every wheel
  keeps the speed it has: on the road it rises and falls with the road's slope at this speed, off it
  it falls from the speed it left with, and it leaves the road only when the road drops away faster
  than that; both off, the car flies with the two wheels' speeds, its rise and its `pitchRate` kept
  until it lands, and the far end of a car rocking about one grounded wheel stops on the ground like
  a bumper. In the air a wheel meets a ramp it is carried into (else it sank into M20's heap); the
  belly coming down on ONE point takes the blow as a rigid body does (that point stops; how much the
  car rises and turns goes by its inertia, never a wheel swung by a lever); on TWO points it sits there
  and scrapes (`VEH_SCRAPE`), and a wheel within `VEH_DROOP` of the ground reaches it on its springs so
  the engine drives on (`v.rest`), nothing moved to put that wheel down. A car too slow for a gap comes down in it. Fixes are CONSTRAINTS (no body or wheel in the
  ground, never stuck), never motion tuned so every car clears something. Never let a wheel pivot a
  car's body through ground it has not fallen onto. A drivable car (`vehicleSeatsPlayer`: its placed art at least
  `VEH_SEAT_FRAC` of your height) is never a solid object; one placed with Solid ticked is parked scenery (`vehicleDrivable`), solid and never got into. At the wheel your body gets empty intent, your box is seated on the car every frame
  (`vehSeat`), and every hit on "player" meets the car instead (`hitBodyOf`, `applyHitTo`, the
  foe-shot test). Wheels are pieces flagged 🛞 `wheel`, turned about their tyre (`spinWheelPieces`,
  snapped to 15° so the art rebuilds rarely). On your car the 🪟 `driverWindow` piece becomes a
  cutter, and your own Side head is drawn under it, cut off at the gun arm's shoulder. With no
  window, a 🪑 `driverSeat` piece is where you sit: your Side drawing from the hips up
  (`vehRider`, cut where `identifyLimbs` puts the legs), at your own size, over the car.
  A car whose two ends differ is two clipped copies of its art split at the editor's centre line
  (`vehicleHalvesOf`); the 🔥 is drawn from the marker's own box (`hoodFireBox`).
  Passengers: no flags (Blake took the 🪟/🪑 Passenger checkboxes out, 2026-11-01): every car seats
  `VEH_PASSENGER_SEATS` human allies beside the driver, each `VEH_PASSENGER_STEP` further back. While you drive,
  each free place goes to the nearest ally that is not a creature; it drops its fight, follows you,
  and gets in when `followerCanBoard`. A rider lives on `ep.ride = { car: uid, seat }` (the ep moves
  with the unit at a handoff, its key does not), is pinned to its place with i-frames, skipped by
  the unit sprite pass and `aliveOpposite`, and drawn inside `vehCarEl` (`car.riders`, rebuilt every
  frame) behind the car and behind you. Out of your car for any reason, it steps out at its place.
  Audio: the Car engine loop is loud on the throttle and murmurs off it (`carEngineGain`); the Car
  radio basic sound loops at one level the whole time you are at the wheel (`heldLoop` in audio.js).

## Blake's decisions — do not undo these

- **The floor is "Trailer Park" (renamed from "Trailor", 2026-11-07, his call).** Every level name, Floor,
  gate accepts, door/room tag, prop folder and sign was renamed on his newest records. Older text
  (comments, CLAUDE-HISTORY, his saved games, a stray old copy) still says Trailor, so every place
  comparison goes through `placeKey` (App.js; anim.js floorEndAnim; gameFront floorKey) which treats
  the two spellings as one place. Write "Trailer" in anything new.
- **Never remove a feature to fix a bug.** Narrow the fix instead. Gear is a choice the player makes
  and can undo; a body stat is not. A hat boosting a gun is intended. Removing anything is his
  call, so ask, and keep building everything else.
- **No explanatory text on screen.** A card is a title plus its inputs. What stays: values with
  units, short ⚠ warnings about something actually wrong, state, and ability descriptions (the
  `brief`). Reasoning goes in a code comment or a `title` tooltip.
- **Enemies play by the player's rules** ("there shouldn't be any differences"). Stats, armour,
  crits and abilities all apply to units, and an ability that ships player-only comes back as a
  bug. The deliberate exceptions are AI pacing and Capture being player-only. I-frames were one
  until 2026-10-14 ("same skin, same stats … I have more HP"); units have yours now. When he says
  "same character, I'm tougher", diff EVERYTHING between the two sides — HP at spawn, armour, hit
  windows, not just the damage formula — and measure both directions in the running game.
- Floating labels are bare words (white, with a black outline and glow) and never boxes. There is
  no 🐱×N count by HP bars. The shop panel is square and has no emoji. Dialogue has no bubble,
  answers sit in a grid, and the font is DotGothic16. The pickup banner is Shrikhand, coloured by
  rank. A shop never shows what you already hold or wear (`shopUnowned`); throwables always show,
  because they stack.
- **A shop has a Buy and a Sell tab** (Blake, 2026-11-26: "The sell menu should not let you sell underwear
  top or bottom"). It opens on Buy, which is the shelf exactly as before; the panel hangs from the top
  (`.shopModal`) so the tabs never move. Sell lists the held weapon, each carried throwable and every worn
  garment, the look's own included, and **never `under_top`/`under_bottom`**: the rule is in the pure
  `shopSellables`/`shopSellsSlot`, and `sellToShop` only sells an entry that list returns. A sale pays
  `shopSellPrice` = the Buy tab's trade-in (`shopTradeInValue`); a throwable is that box's trade-in times
  count / `throwPickupCount`. A sold garment's slot goes `null`, a sold weapon leaves bare hands (""). The
  Sell tab reads and writes the throwable stack ONLY through `sellableThrows` / `sellThrow`: one row per kind carried, and a sale removes every one of that kind (`throwStackRemove`).
- **Defense:** a hit times `DEFENSE_HALF_AT / (DEFENSE_HALF_AT + Defense)`, DEFENSE_HALF_AT = 35 (10 until
  2026-10-08, 20 until 2026-10-10: "a tad too bullet spongy. IE the football players"). Applied ONCE per
  hit, on the player and on units alike. A look's Defense is the sum of its garments; negative totals
  clamp to 0. Each hit is ROUNDED, so on small guns judge a change by rounds-to-kill: the 7-damage M16
  only moved on the football players (17/19) once a hit rounded up to 5, which needed ~35, not 30.
- **Strength** multiplies muscle (swings, fists, pistol-whip, stomp, tail) by `effectiveStrength / 5`:
  the stat itself from 5 up, `STRENGTH_BASE` (2.5) + Str/2 below it, so Str 0 hits at half a Str-5 hit
  ("so str 0 characters do not feel so worthless"). His roster is mostly Str 0-4, not 5. Creature
  bites (2x Str) and throw range are not on it. Stomp is `STOMP_DAMAGE` 45 at Str 5: one stomp kills
  a Squirrel from Str 1 and a Pika from Str 2; the Turtle and the Crocodile still take two.
- **👢 Stomp (`EFFECT_TYPES.headStomp`, 2026-10-13) is NOT the 🦶 stomp.** The 🦶 one is everybody's
  foot-stamp on something short (`STOMP_DAMAGE`, `p.stomp`). 👢 is worn: fall onto a head for the
  item's Damage (`playerMeleeDamage`, so Strength rides it) and bounce off. It is armed only while
  falling, not gliding, flying, climbing or on a plane (`headStompArmed`), and the built-in pose
  (`headStompPose`, Fly's rig, no designer) shows exactly then. A wearing unit leaps at its target at
  an attack commit (`headStompLeapPlan`) only if its jump clears the head: Agility 10 clears a 7-cell
  Bob, 9 does not. Keep the `hs*` names; `stomp*` is taken.
- **🐒 Tail Hold (`EFFECT_TYPES.tailHold`, 2026-11-22):** a FRESH Jump press in the air with no unspent Double Jump
  catches (`tailHoldStep`): vy 0, dx 0, one hold per time in the air. Jump again or S lets go; W flight, a ladder,
  landing or being floored ends it; `time` 30 = no limit. Guns and swings work while hanging. The body swings from
  the top of the Monkey Pants' tail curl (`TAIL_HOLD_HOOK_X/Y`, canvas (50, 94); the sprite box IS the 200x260
  canvas), calmer while aiming. A unit with it AND a ranged weapon hops at an attack commit (`eTailHop`), catches at
  the apex, shoots (sameFloor still holds), lets go after `TAIL_HOLD_UNIT_SECS`, then waits
  `TAIL_HOLD_UNIT_COOLDOWN_FRAMES`. Throw-only units (the monkeys' rocks) never hop: `rangedNow` is the weapon's.
- **🔥 Ignite (weapon ability, ranged + melee, 2026-10-18):** a connecting hit sets the body alight for `ignite` s at
  `igniteDps` (`igniteBody`). It is a timer on the body added to `hazardDpsAt` in the SAME burn pool fire cells use, so the
  onFire look and immunities are fire's own; it never paints cells (a 10/s flamethrower would re-raster the level). Applied at
  every hit site that applies a shot/swing stun, both directions. The Flamethrower (`flmthr1`, Flame `flmpuf1`) uses it.
- **🧯 Fire Immunity / 🪖 Explosion Immunity (clothing abilities, 2026-10-18):** `fireImmune(effects)` /
  `blastImmune(effects)`, the same call for the player (`pFireImmune`/`pBlastImmune`) and every unit (`ea.effects`).
  Fire = no burn pool at all (fire cells AND Ignite, zeroed where the pool is fed) plus a flame SHOT (`shotIsFlame`:
  a ranged round with ignite) washing over. Blast = every branch of `detonate` and the contact hit of an explosive
  throwable (`throwIsExplosive`: explode or Cluster). A new blast or flame damage site must ask them too, and player/friendly hits stopped by `blastImmune` or `fireImmune` float bare-words `"Immune"` at the hit point (`pushImmuneCallout`, `.hitCallout`).
- **🐞 Lucky / 🪞 Reflect / 🚒 Fire Resistance (clothing abilities, 2026-10-20):** every hit site, both ways, calls
  `shrugsHit(wearer, effects, dmg, by, x, y)` (loop level) once its damage is known and before HP moves. True = the hit
  does nothing to the wearer (no damage, stun, burn or i-frames); reflect has already put the wearer's post-armour damage
  on `by` ("player", a unit key, or null; shots carry `shooterKey`, unit throws `throwerKey`). Never reflected twice, and
  an own blast rolls luck only. Chances and resistances MULTIPLY across items (`hitFate`, `fireDamageMult`). Fire is not
  a hit: resistance scales the burn pool and a flame round (`fireResistedHit`), luck never reads fire. A new hit site
  calls shrugsHit (a test counts 16). The marks are booms with `slot: "fx.lucky" | "fx.reflect"`. Items: Lucky Hat
  `lckyhat`, Spiked Jacket `spkjkt1`, Fireman's Coat `frcoat1`, Fireman's Helmet `frhelm1`.
  **A SHOT is turned for real (2026-11-16):** the three projectile-meets-body sites call `turnShot` on contact, before
  the explode branch (`shotFate` = hitFate's same rolls). Lucky → `deflectShot`: the round stops, hops back one cell,
  falls, lies ~1s, gone, a dud (rockets too). Reflect → `reflectShot`: it flies back at the shooter's body as a shot of
  the wearer's side (`foe` flipped, `reflected` so never again). Those sites then pass shrugsHit's `rolled` flag so
  nothing rolls twice; a rocket's blast does the same for the body it struck (`pr.turnRolled`). 🪃 keeps the old path.
  He calls Lucky "deflect" ("the one that makes attacks ignore").
- **🔥 Fire damage / ❄️ Ice damage (weapon abilities, 2026-10-21):** "Fire damage" is the `ignite` key renamed in the
  picker; added now it starts on his 2 HP/s for 10 s (`FIRE_DAMAGE_*`), saved weapons keep theirs. Ice is `iceDamage`
  (+`iceDamageDps`, 1/s, 10 s): its own timer on the body (`chillBody`, `chillPool`), half walk speed and half jump HEIGHT
  (`chillMoveMult`, `chillJumpVMult`) for the player and every unit, AGI/SPD read half on the HUD. Every hit site calls
  `afflictBody(body, weaponOrShot)`, never igniteBody directly; a round copies the ice off its gun (`shotStatusOf`). The
  look: `bodyStatusFilter` (glow for the whole burn, a white rim while chilled) + `<StatusFx>` (CSS sparks / frost).
- **⏩ Double Shot (clothing, 2026-10-21):** every gun round goes up through `pushShot` (player and units): two parallel
  rounds `DOUBLE_SHOT_GAP_CELLS` apart for one round of ammo. A pair shares `pair`, so your i-frames from the first let
  its twin land (`p.invulnPair`).
- **💵 Money = Power (`EFFECT_TYPES.moneyPower`, clothing, 2026-11-11):** scales outgoing damage linearly with wallet money (`moneyPowerMultiplier(effects, money)`): ×1 at \$0, ×1.25 at \$10, ×1.5 at \$20, capping at \$40 (`MONEY_POWER_CAP`) and ×2 (`MONEY_POWER_MAX_MULT`). Applied once when worn (`moneyPowerOn`), across shots, melee swings, bare-handed punches, creature bites, throws, tail swings, stomps, and `enemyAttackDamage` / `playerWeaponDps` / HUD ATK. Items: Money Glasses `mnyglas`, Fancy Little Top Hat `fcythat`.
- **🍄 One Up (item effect `oneUp`, 2026-10-21):** a life of the RUN (a head on the HUD row), never a 🐱 Extra Life. In a
  game run it is `gameCur.oneUps` (saved; `runLivesLeft(diff, deaths, oneUps)`); outside a run `studioOneUps`, spent by a death.
- **🪃 Boomerang (weapon ability, ranged + throw, 2026-10-25):** the item itself flies, spinning (`boomerangStep`): out
  along the aim to its Range with a light homing (`boomerangPick`, a cone ahead, never behind, easing back to the aim line
  with nobody in it), a turn, then straight home to the thrower's hand; no back tracking. A gun's (`boomerangRound`)
  pierces both ways (its hit list resets at the turn) and has no magazine or reload: one throw, loaded again the frame
  none of yours is in the air (`weaponClipSize` 1, `boomerangAmmo`). A thrown one (`thrown`, `boomerang: true`) does not
  pierce: a body stops it and it is spent; a miss comes home into the stock, and several fly at once. Aim assist is off for
  it (that solves for a falling round). Player and units alike. A throwable's stock is `throwPickupCount` (`pickupCount`,
  3 unless set). Items: Boomerang `boomrg1`, Box of Playing Cards `cardbx1` (52).
- **Throwables stack in pickup order** (2026-11-26, "you acquire them based on when they are picked up"):
  `throwStack` is `[{ id, n }]`. A pickup or buy of the kind in the LAST group adds to it; anything else
  appends a group, and nothing is traded in. **G throws the NEWEST group first** (Blake, 2026-11-26: "Newest
  first"; `THROW_STACK_OLDEST_FIRST = false`), and the HUD draws next-to-throw first, so the last pickup is on
  the left. A boomerang or capture ball that comes home goes back into its group, or on top.
  Read and write it only through the pure `throwStack*` helpers. Saves write `throws` plus the head as
  `throwId`/`throwCount` for older copies, and a save without `throws` loads as one group. The studio
  picker (`playtestThrowId`/`playtestThrowCount`) is only the first group; a pickup never changes it.
  Enemy throwables (`ep.throwLeft`) are separate.
- **💥 Blast (`throwBlast`, a throw ability, 2026-11-26, the Mini Nuke `mnnuke1`):** the throwable goes off where it
  lands through `detonate` (flat Damage to every body in the radius, cars, and YOU if you stand in it). Its own flag:
  his Grenade carries a stale `explode: true` that throws never read, so never make `explode` live on throws. Its boom
  stands ON the ground (`boomRise` → `rise`), and booms clear only when the place changes (`leftThrownPlace`), never
  on the landing paint's re-run of the play effect (that wiped the cloud after one frame). Explode card ceilings:
  `BLAST_RADIUS_MAX` 12, `BOOM_SIZE_MAX` 24. A rising boom over 18 cells loses its top on his 29-row view from the
  ground. The nuke: radius 9, boom 18, Damage 100, Weight 1 (a plain lob lands ~17 cells out, clear of its blast;
  ↑ or a body in your face nukes you, like an RPG point blank).
- **🔴 Brimstone laser (`WEAPON_ABILITIES.chargeLaser`, ranged ability, 2026-11-26, Brimstone Launcher `brmlnch` + Brimstone Demon prop `brmdemn` in `Design Elements`):** hold Fire to charge (`chargeLaserSecs`, default 0.65s) and release to fire a multi-tick piercing blood laser (`laserBeamSecs`, default 0.55s, ticking every `LASER_TICK_FRAMES`); releasing early cancels (`stepChargeLaser`). Once charged while still held, `weaponPoseFired` switches immediately to the `Fire` pose (showing the charged muzzle beam) and holds `Fire` while the beam is live. Audio swaps slots: charge start plays `fire` whole (`maxSecs: 0`), and release or cancel fades `fire` via `stopAssetSlot` and plays `hit` on release. The SVG beam (`brimstoneBeamPath`, `.brimstoneBeam`) stops on solid cells and wriggles worm-like through targets when `shotHomes` is on; player and units both charge and fire it.
- **Clothing prints are textures** (Tye Dye, Flannel, 🦓 `zebra`): the piece carries `tex: <texture record id>`, and the
  record ships in library.json `textures`. A fresh store restores textures when an editor opens (`loadTextures`).
- **Melee DPS is damage x a fixed swing** (`PLAYER_SWING_FRAMES` 12, 5 swings/s); a melee weapon's Fire rate does nothing.
  Melee is balanced on damage vs stun / reach (hitbox) / ignoreArmor. Roster 2026-10-18: Cane 7, Bat 7+0.25 stun, Knife 8
  (short), Baton 9+1 stun, Crowbar 11+0.25, Machete 13, Katana 13+ignore armour (long), Punji 15, Sledgehammer 17+0.5 stun.
- **⚔️ Melee clash:** a Q/V pistol-whip WITH A GUN IN HAND and a unit's melee blow in the air together
  (`meleeClash`, face to face) both miss and both bodies are shoved `CLASH_PUSH_CELLS` apart. A bite
  lands the frame it commits, so the last `CLASH_WINDUP_FRAMES` of a melee wind-up count as thrown.
  A blow that already landed still hurts. Not stomps, tails, shots, or a melee weapon (Q blocks there).
- **A control must be operable at its real size.** Setting a slider's value from script works at any
  width, which is how a 3px Strength slider shipped. Check the rendered width and drag it with the mouse.
- "Range" means how far a gun or bow shot flies (the weapon's Range, 🎯 Long Shot, the 🎯 Range
  item). An item's range boost multiplies with Long Shot at the trigger (`activeRangeMult`); throws
  and melee are untouched.
- **🧪 Item effects are clothing abilities on a timer** (`itemBuffs`): 🎯 Range is Long Shot, 🏹 Tag damage
  (2026-10-17) is Tag Damage. A timed tag buff reaches the shot, the swing and the HUD's ATK only through
  `withTimedTagBoosts(effects, itemBuffs.current, now)` into `tagDamageMultiplier`; never a second multiplier.
  His weapon tags are `Gun` and `Meelee` (his spelling; match them).
- **An item can have several effects** (2026-11-21): `effect` is the first, `moreEffects` the rest; every
  user of an item reads `itemEffectsOf(item)` / `itemSummary(item)`, never `item.effect` alone (only
  `isMoneyItem` does). 💥 Damage is a timed tagBoost with `any` (every weapon, fists, throws via
  `timedDamageMult`); 💔 Lose HP stops at 1 (`applyHurt`); a heal can be `full`; a stat boost can be negative.
  🌀 `item.screenFx` (blur / tint, seconds) is a `kind: "screen"` buff drawn by `.consumeFx` under the HUD;
  with none of its own an item takes its tag's (`ITEM_TAG_SCREEN_FX`: Alcohol blurs), `{kind:"none"}` turns it off.
  Items: Hamburger, Hot Dog, Pizza Slice (a circle cut to a wedge by two cutters), French Fries, Steroids,
  Ritalin (renamed from Ritilin at his word), Whiskey, Wine, Joint.
  **A NEW effect kind must reach the published site (`npm run publish`) the same day:** an older page reads an
  unknown kind as the default Heal 5 HP, and saving the item there writes Heal 5 over it (Whiskey, 2026-11-21).
- Talk reach is `TALK_RANGE_CELLS` = 6. The Enemy-creator Speed AND Strength sliders go to 20 (the animals' scale; a
  creature's Strength is its bite, 2x, unclamped), a
  dressed look walks by `playerWalkSpeed`, and Speed floors at 0.
- **Global feel knobs (2026-10-10):** `MOVE_SPEED_BOOST` and `JUMP_HEIGHT_BOOST` (both 1.1) multiply the BASE walk
  (`playerWalkSpeed`, `UNIT_WALK_SPEED`) and the BASE jump height (`enemyJumpVelocity` and the player's
  `jumpHeightBlocks`), so Speed 5 / Agility 5 are 1.1x what they were and every stat still scales from there. They hit
  the player AND every unit (looks and animals) so a fight keeps its pace; change the constant, never one call site.
  The jump knob is HEIGHT, so velocity goes by its square root (Double Jump rides along).
- **🎯 Objectives are a LIST** (`objectivesOnArrival`): every objective marker in a level adds its line,
  reaching a room with ITS target tag clears only that one, and a cleared one stays done all session.
  One slot let the closet's marker wipe S1's (2026-10-17).
- **Room names and tags are record keeping.** Play never shows them (the door prompt is just
  "Press E to enter"); only a door whose tag matches no room names the tag.
- **Shop Keeper versions of a room** (Blake, 2026-11-22: "3 variants of each, one with a shop keeper, one with
  an evil shop keeper and whatever the base is"). His own Trailer Int1/3/7 (2/4/8, 5/6/9) set the pattern: the
  same room with its pedestal removed, plus The Shop Keeper (`vmcrl51`, guard, his `h4o3v93` shop T1) or the Evil
  Shop Keeper (`63edlrj`, seek, his `95e2gzd`, gearTags Meelee + T1). The keeper is the room's item source. Every
  Shaq room has both (`vshqNNs` / `vshqNNe`, named "<room> Shop Keeper" / "<room> Evil Shop Keeper") and keeps
  its own residents; a door rolls any of the 12 with one draw. A new Shaq room gets its two versions too.
  **Tree Int rooms** (Blake, 2026-11-26) carry a Shop Keeper version (`trnt0Ns`, pedestals out, keeper at a pedestal's
  spot) and a Vietkong version (`trnt0Nv`, "<room> Vietkong": pedestals kept, plus one 🎲 Vietkong on Seek, gearTags T1),
  not an Evil one; the "Tree" pool is 9. A REAL library test holds each to its room cell for cell.
- **Drug dens** (Blake, 2026-11-23: "you enter a shaq and it is a drug dealers den and two people attack you", plus
  "a simular Trailor room"). VShaq 5 (`vshaq05` + `vshq05s` / `vshq05e`, so the Shaq pool is 15) is VShaq's shell
  with Bamboo walls and the Packed Earth floor; Trailer Int13 (`trlnt13`) is his Trailer Int11 shell with Wood panelling,
  the new `dshag01` Dirty Shag Carpet and a stained ceiling. Each has two 🎲 tag units on Seek at 17,10 / 17,27 that
  rush you the moment you walk in (Vietkong Meelee + Gun; Trailer Meelee + Meelee), no dialogue, and one pedestal of
  tag "Drug" at 18,31 (Extended Range Pill, Joint, Ritalin, Steroids: one blue at most). Props `dd*`: Dirty Mattress,
  Deal Table, Foil Window, Bead Curtain (Interior), Trash Pile, Bong, Wrapped Bricks (Decoration), Opium Bed (Vietnam).
- **A look's name is record keeping too.** A talker is named by its tree's speaker (`talkerName`):
  the "Talk to …" prompt and the box. A 🎲 tag placement rolls a different look every Playtest.
- There is no 👹 enemy flag and no weapon picker in Dress Bob. What a character carries is set per
  placement.
- Units walk only to targets on their own storey (`unitSharesLevel`), and allies guard the area
  around YOU, on a leash. **But an ally always defends ITSELF** (`allyDefendsItself`, 2026-11-26): a
  hostile whose target is that ally (`ep.foeKey`) or that stands right against it is fought whatever
  the guard ring or leash says. Rules measured only from you left a follower down a pit taking hits.
- **🚗 Vehicles (2026-10-31)** are their own asset type ("Prop / Item / Vehicle"), placed like a prop.
  Five looks, in this order: Stock, Front damage, Rear damage, Imminent explosion (both ends plus the
  🔥 hood-fire marker), Destroyed (the smouldering wreck). A car has its own HP and Defense; fire and
  blasts land 4x and ignore Defense (`VEHICLE_WEAK_MULT`). At a quarter of its HP the 5 s fuse lights
  and nothing stops it; the bang is `detonate` (Defense, 🪖 and god mode count), 30 damage, and you
  are thrown out first. Driving is momentum: no control in the air, hills speed it up or slow it,
  faster than a fast walker but not by much, and what is painted stops it ("they largely get stuck
  not too far in"). A level's edge never does where you could walk on: a car drives across a seam
  into the next level with you (2026-11-01, "Unnacceptible."), and only an edge with no level behind
  it is a wall. You get in only if you fit sitting down (a car at least 0.6 of your height as placed);
  an open car (a tractor) has a 🪑 seat, and you sit on it. One Car engine sound (a loop pitched by speed), plus Car crash and Car
  totaled. A unit that sees yours coming jumps it, or steps back behind it in its Front pose, or
  forward in front of it in its Back pose; units hit a car only while it is slow
  (`VEH_MELEE_MAX_SPEED`), and the car keeps your i-frames.
- **A dented car is two halves (2026-11-01, Blake: "front damage should only effect the part of the
  vehichle tro the right of the center line while rear damage to the left that way we can have
  both").** The nose half (right of the editor's centre line when the car faces right) is drawn from
  Front damage and the tail half from Rear damage, so a car hit at both ends shows both; Imminent
  explosion and Destroyed are whole looks. Generated damage copies HIS Army Truck edit, never spiky
  lines ("less just spiky lines"): the last 5% of the width is pushed in (`crumpleEnd`), the lamp
  squashed and dimmed to #daa520 with a dark crack, the bumper tilted, a body-colour curly-triangle
  buckle and a lid strip at 150°/30°; wheels, wells, the cab and the glass stay Stock. Imminent
  explosion and Destroyed are built from the car's Front damage, his when he drew it. The hood fire
  sits on the hood ahead of the windscreen, at most a quarter of the car's height (it was 0.6 of it:
  "on the big truck the hood fire was akward and too big").
- **Ramp lip carry & vehicle Speed scaling (2026-11-01):** A wheel past a rising slope's lip keeps the slope's own upward speed, so it does not drop from rest and tip the car nose-down (+13°); 2026-11-01's `carry` that did this is gone since 2026-11-07 (the per-wheel speeds above). Vehicle asset `speed` scales power (`vehicleSpeedOf`, `vehiclePower`, 0.5–1.5, default 1.0; editor slider on vehicle card) scaling throttle acceleration and engine top speed clamp. High-speed crashes trigger visual boom puffs (`slot: "fx.boom"`). Asset `mscl69m` (1969 Muscle Car, size 16, speed 1.25, 180 HP, Defense 12, 5 damage looks, driver & passenger cutter windows, spinning wheels). Trailor Park M17 (`trpm17a`, W2/E2) is the car stunt jump over two school buses into a solid hay bale barrier.
- **1957 Gasser (2026-11-02), was the Dragster:** `drgstr1` keeps its id but is now a '57 Bel Air gasser for Trailor Park M18. Blake (2026-11-02): "I don't love how your dragster looks, I would have prefered something that looks like a standard drag racing muscle car. Such as this belair." Nose right, size 16, 80 HP (`hpHalved`), Defense 10, speed 1.5 (top speed about 20.5 px a frame). Black, as in his photo, with the nose-up stance (a big slick in a radiused rear arch, a skinny front tyre hanging in a deep front well with the leaf spring showing), the fin, the '57 side panel, a hood scoop, "A/G 57" on the quarter glass and "SPEED SHOP" down the side. Bob's head shows in the door window (`driverWindow` cutter). All four damage looks come from `autoVehicleDamage`, the editor's button, since it is an ordinary car shape. In M18 it sits at 15,32 (oy 0.04): tyres on row 20, nose on col 48 where the Dragster's was.
- **Xe Lam (`xelam01`, 2026-11-21):** the three-wheeled Lambretta Lambro 550, Saigon's shared taxi in the 1960s (the period's tuk-tuk), made for Forest M19. Nose right, size 12 (seats a sitting player), 55 HP (`hpHalved`), Defense 8, speed 0.8. Teal `#4f9aa0` (kept off `isGlassColor`) under a cream upper: an open passenger box (two bay cutters, a grab rail, a roof rack with a rattan and a bundle) and a round scooter cab whose `driverWindow` cutter shows your head, on small 24-unit wheels. Category Civilian; its damage looks are `autoVehicleDamage`'s.
- **Manhole ramps & sunken lips (`src/vehicle.js`):** Real drivable cars (`w = 385..560 px`, `wheelbase = 240..478 px`) are longer than the 120–150 px manhole ramps and 150 px shafts on Trailer Park M5/M6/M15, and M5 (`c108`) / M6 / M15 (`c51`) have sunken `r34` inner lips inside the hole. bb57a90's `rampLaunch` (2026-11-06: the whole car thrown up at 1.6x the slope plus a kick, its pitch squashed, levelled in the air) was REMOVED 2026-11-07 as arcade; a fast car's front wheel now carries on up off the ramp at the ramp's own rate and the car flies only on the wheels' real speeds. Creeping cars dip into the shaft, rest on the lips on their underside and roll out over the far lip; `src/vehicle.test.js` holds both, and a no-launch test (the back wheel on the flat never leaves it, the pitch rate is kept in the air).
- **Super Bob unlock = 500 unique items (`src/gameFront.js`, 2026-11-06):** `STARTER_LOCKS` keeps `{ name: "super bob", items: 500 }` (distinct ids in `record.found`, never `picks` / `record.picked`). Never swap unique-item unlock rules to total pickups.
- **Play-loop & S1 TV stutter guards (`src/App.js`, 2026-11-06):** `underwearSeepCuts` uses precomputed local-space shape/cutter samplers, AABB-clamped grid bounds, and `SEEP_CUT_CACHE`; `playerLookCache` and `enemyGearLookCache` are keyed without `playRunId` so composed looks survive across runs; `cutRef.current` runs `prePromoteFront()` and `warmRunAhead()` so opening cutscenes (`wakebed` on S1) finish Front layer promotion and `n2` warming before the player walks past the TV; `xrayRegionRef` caches the active `connectedFrontRegion` Set and promotes its cells once on entry; `gameHead` and `hudWeaponArt` cache their rendered JSX elements; and `!game` skips rendering hidden studio chrome (`.bar`, `.catbar`, `.ltools`, `.statusrow`, `.lside`).
- **Rock-crawling hill formations (`vcfrm13`, Forest M13, 2026-11-06):** `vehicleStep` calls `wallAt(bumperX, leadY, VEH_STEP_UP, wallH)` using the previous frame's wheel Y while `bumperX` extends `1 - wr` (`2.52` cols on the size-12 Army Jeep `wlysjp1`) ahead of the lead wheel, and `isHillFormationCell` only exempts flat plateau cells within `HILL_NEAR = 2` cols of a ramp and within `2.5` rows (`75` px) above `leadY`. So (a) a continuous `run: 1` (45°) ramp cannot exceed 2–3 rows without a terrace before `bumperX` hits a backing block `> 75` px above `leadY`, and (b) the top step of an uphill climb onto a flat shelf of `>= 3` cols must use `run: 3` so the remaining rise when `bumperX` reaches `C_lastRamp + 3` is `< VEH_STEP_UP` (`10` px).
- **Cutscene text names Bob in the third person (2026-11-10):** "on the cut scene after the Vietnam levels, make sure Bob is only refered to in the 3rd person". The General's Briefing (`gnrlbr2`, the scene between Trailer Park and Vietnam) says "That is where Bob comes in", "found Bob", "His cholesterol", "He is a specimen" and "Only Bob can stop the Vietkong ..."; never "you" in its crawl or its last line.
- **Every death falls over (2026-11-10/11):** "when the player dies i want them to fall over before it says game over", then "Every death should fall over" (he said he is still debating respawn deaths; ask before changing). `playerDefeated` no longer respawns or ends the run itself: it spends the life and sets `p.dying`; the loop's 💀 pause line runs `deathFrame` (world paused like a cutscene, body drops to the floor by the corpse rule, turned by `playerDeathFallDeg` with `fallOverLiftPx`), and after `PLAYER_DEATH_FRAMES` it is the walk back to the gate on full HP, or `gameGameOver`. HP stays 0 during the fall, so `gameSnapshot` saves `hp: null` (= full) mid-fall. `gameDeathRef` no longer freezes the loop or times Game Over. The 🐱 Extra Life get-up is untouched.
- **Forest M15 (`vcfrm15`, 2026-11-14) is the fishing village:** a plank pier flush with both banks over a river whose bed is the level's LAST row. The water is his Dirty Water as Front paint (rows 38-44, like his Sewer M3), so it is see-through only round you. Two 4-cell plank holes with 2-wide ladders are the way down and back up; an Agility 1 look (Army Bob) still jumps them. **A creature on Seek climbs ladders** (the Crocodiles walked the pier), so river animals go on Guard. A boat you walk across is hidden Foreground under its gunwale, with no plank over its upswept ends. **Villager lines are ONE short line** (Blake: "not too generic, long and corny (I often have to edit dialogue you make)").
- **Forest M16 (`vcfrm16`, 2026-11-20) is the deep jungle:** W2/E2, 180 wide, ground row 36 at both seams. Up two terraces (34, 32) to a ridge on row 30 with a red laterite clearing and a VC cache under his Camo Net (crates, rice, rifle rack, lantern) holding the level's ONE item source, a Heal OR Food pedestal; down to a creek gully (mud bed row 38, one row of his Dirty Water as Front paint, a Fallen Trunk in it), a knoll (35) and back to 36. Three canopy layers (#4a5a28 / #6b7b3a / #85ca2f) on 2-3 cell trunks with the sky between, three Front trees (3-wide trunks, Tree Roots, his M12 placement), mixed plant clumps, 51 vines (kept few: ~7 elements a tile). Nine 🎲 Vietkong tag rolls (two with Molotovs). In play it is 4,469 elements under .lgrid against M12's 3,729 (M5 shipped ~4,400); if he calls it heavy, thin the Front canopies first. Generator: seeded `gen16.js` in that session's scratchpad.
- **Forest M20 (`vcfrm20`, 2026-11-22) is the Agility temple:** bombed Cham ruins (his request: a parkour Vietnam level that rewards high Agility), W2/E2, 200 wide, ground row 36. The ground route walks both ways at Agility 1 / Speed 1 through the gopura passage, a bomb crater, the mandapa hall, the kalan and the fire house. Up high: vine bars B1 off the gopura deck (any) → B2 three rows up (Agility 5) over the hall gable onto its roof → B3 → terrace; a loft ladder 5 rows over the head in the fire house (Agility 8, Heal OR Food); a rope ladder 7 rows over the head inside the hollow kalan, up a 1-cell hatch to the summit (Agility 10, Vietnam AND Rare). No gold. **In side view a doorway through a tower is a hole in BOTH side walls**, 8 rows: a hole only in the middle is a closed pocket (the gopura stopped the walk both ways until fixed). Walk every route BOTH ways: the roof slab first overhung the terrace steps and clipped the head of anyone walking west. Texture Cham Brick (`chmbrk1`). 3,198 elements under .lgrid in play. Generator `gen20.js` stays in that session's scratchpad.
- **Forest M21 (`vcfrm21`, 2026-11-22) is the third Vietnam TRUNK level** (his ask: another Vietnam level with a tree tops entrance): W2/E2 plus N2 accepting "Tree Tops", 180 wide, ground row 36. The giant tree on a root mound (row 32, cols 112-139) carries a 4-wide vine ladder (cols 124-127, rows 0-31) under the N2 gate (col 126), so `gateHasClimb` passes and `planTree` lays tree tops on it like M3. Off the trunk: a VC lookout deck (row 18, a sniper, one Vietnam AND Good pedestal) and the east limb (row 23, a Monkey). On the ground: a drowned plank bridge (row 38), a porter way station (Heal OR Food under his Camo Net), a bomb crater, an AA knoll. New prop Cargo Bicycle (`hcmbike`, Vietnam): his Rocket Bicycle with the rocket off and rice sacks on. Over 300 Vietnam seeds on his online save, runs with a tree top went from 158 to 194; trunks used: M21 82, M3 80, M4 82. **An overhang beside a ladder foot needs 8+ rows too:** the limb first sat 7 rows over the mound, and walking off the ladder foot east stuck under it (on a ladder you hang 0.05 row higher than standing). Played both ways and up into Tree Tops 5 in a real run.
- **Forest M22 (`vcfrm22`, 2026-11-26) is the VC hill fort raid** (his ask: raiding an enemy base, few friendlies, use the new stairs): W2/E2, 180 wide, ground row 36, NO friendly units, 14 Vietkong-tagged spawns. Kill zone of snapped trees, wire, punji and a spider hole (cols 26-47) → the fort: a log-roofed gallery dug under the hill (floor row 36), the command floor L2 (feet row 26) and the summit (row 15) with the AA gun, searchlight and gong. Four 📶 flights, all timber treads in the Background: FW (ground → west terrace) and FE (east terrace → ground) outside, F1 (gallery → L2, rising west) and F2 (L2 → summit under his Camo Net, rising east) inside, each with its open well. Rewards: one Vietnam AND Good pedestal in the command post (25,98), Heal OR Food at the aid station in the gallery (35,85). No gold. Walked both routes edge to edge both ways (ground; FW → door → F2 → summit → slope → FE, and back), F1 up and its well down, and a Seek up F2 at a player standing at its head. Generator `gen22.js` stays in that session's scratchpad.
- **Forest M23 (`vcfrm23`, 2026-11-26) is Doom Town, a mock village at a nuclear test site** (his ask: built to be blown up by a Mini Nuke): W2/E2, 180 wide, ground row 36, edge columns copied cell for cell from M22 (= M16). An observation bunker under an earth bank (roof rows 26-27, cols 34-54, a 📶 stair from col 24; instruments, radio and the Heal OR Food pedestal inside), then stilt huts, a market stall and conical-hat mannequins between blast-gauge poles and cable runs, the Test Tower (`dttowr1`, ladder cols 107-108 up through its deck hole to row 20) holding the level's ONE purple: a Grenade AND Rare pedestal that only rolls the Mini Nuke, and scorched huts at both ends. 11 🎲 Vietkong spawns, no friendlies, no gold. The deck under the prop is plain #4f4f4f Foreground (his girder texture drew it red).
- **Vietnam S1's supply tent (`tntint2`) has a grenade source** (2026-11-26): a Grenade AND Army pedestal (= his Grenade `gr3nad3` only) on the left footlocker (13,13), beside the Army AND Common one on the right. Every S1 has both tent rooms, so every run has it.
- **Vietnam E1 (`vtnme1a`) ends in the Jungle Ambush (`vcambs1`, 2026-11-11):** the floor's Exit (W2 open, no east gate). "Walk in" cutscene at cols 110-153: his Bush props shake, four of his Viatnamese looks come out both sides, Bob falls on his back (the same quarter turn a death uses), fade, ending "Leave the floor". Nothing Front stands inside the stage (Front draws over it) and no unit spawns in the last 60 columns; the two nearest are guards so nobody is chasing him into the scene. Since 2026-11-12 (take 2, his ask: "more dramatic"): a 0.9 s **Look** state after Rustle has Bob in his Front pose staring at the camera (held into the Ambush's first 0.1 s), and the VC hold rifles (Type 53 Carbine / Mosin-Nagant alternating; his VC AK-47 `vcak47r` is DELETED in his removed.json, never revive it) levelled at arms 90, lowered to 75 onto him as he lies down. **Take 3 (2026-11-21), his ask: "fire or use their bayonet at the player instead of just kind of running into them":** they plant short of Bob (upright, no lean), then **Fire** (V2 and V4 shoot, his hands go up), **Bayonet** (V3 lunges with the Type 53 spike, which ends INSIDE him; state sound = the rifle's Hit `6hh0w94`; V1 shoots), then Down. A Character key has **🔥 Firing** (`fire`, a step field): the held gun draws its Fire drawing (his rifles carry the muzzle flash) and plays its Fire sound once as it switches on (`animShotsBetween`). Never add a key inside a fall to time a shot: every key is an ease point for every layer.
- **A generated level must look like HIS levels, not a flat strip (2026-11-12, on E1: "floating bushes in a perfect line, low density of thin trees, you never ramp off the gravel").** Copy Forest M11: the ground rises and falls on long ramps; every earth patch meets the grass on ramp cells (earth slope + grass `more`), never stair-steps; the backdrop is overlapping wide canopies in two or three greens on trunks 2-3 cells wide, plus a few Front trees with Tree Root props; plants stand in mixed clumps of mixed sizes with their bases sunk, never evenly spaced twins. A cutscene's props get the same treatment and need Background planting around them. Clay Jars read as potions next to the Rice Sacks: use Army Crates.

### His bug list of 2026-11-14 (ten items, one push)

- **Off a tree top you FALL.** No side or bottom edge of a tree-top level (run row < 0) is a wall or a floor where a level lies under it: `runFallSeams` joins the level under the air past each side (`fall`, or `fallSides` on the seam already joined below) and marks every level beneath `under` (`seamUnder`: the whole bottom edge is open, not only the ladder's gate). `p.skyFall` keeps the "flung off the top of the world" respawn from firing on the way down. His Tree Tops 2 and 3 stop part-way across the level on purpose.
- **Walking + ↑ (or ↓) is the 45°** (`aimSideHeld`: A/D count as the sideways half). Standing still, ↑ alone is straight up.
- **The gun stays in the same hand in both facings** in the two-arm poses (`heldArmOf`, `heldArmView`, `attachHeldToArms`); units too.
- **Ladder hands and feet move a rung per rung climbed** (`climbPhaseStep`, `LADDER_RUNG_PX`), player and units.
- **Flying creatures swoop** (`flyerSwoopStep`, the `FLYER_SWOOP_*` constants) and flying fighters sense 3x as far up and down (`FLYER_SENSE_HEIGHT_MUL`); NPC flyers and the player's own Fly are unchanged.
- **Followers walk single file and climb after you** (`followChain`, `followLeader`, `me.follower` in `unitClimbRoute` / `unitDropSpot`).
- **No Floor Complete card.** A finished floor goes straight on; after the last floor a "To be continued" screen leads to the main menu.
- **The gold pickup's slowed sound** is a phase vocoder (`stretchChannels`), built when the clip decodes.
- **A one-paragraph crawl layer centres itself** (text-align-last), so a short closing line sits in the middle.

### His bug list of 2026-11-15 (six items, one push)

- **A car never runs your own side down.** `carRamsUnit` is who `vehRam` hits: not a rider, a dodger, a talker, a body in its i-frames, or an ally (`ep.friendly`).
- **C, F or Q calls a throw off** (`throwCalledOff`, `p.throwOff`). It is the PRESS while G is held (a trigger already down does not count), S does not, and it stays off until G comes up.
- **A grenade in flight draws at `THROWN_Z` (5050):** just over the bodies, under their bars, Front props and Front paint. Yours and theirs are one list.
- **A paused world holds your buffs** (`holdBuffs`). A buff ends at a wall-clock `until`, so every paused frame (cutscene, conversation, shop, pause menu, the fall of a death) gives its real time back. **Buffs ride in the save** as milliseconds left (`buffsToSave`, `buffsFromSave`, `makeGameSave.buffs`), so a drink goes on to the next floor.
- **🐢 Game speed (2026-11-25) slows the WORLD through `dtMul`.** In the play loop `dtReal` is the clock's frame and `dtMul` is the world's (`dtReal * gameSpeedAt(itemBuffs, now)`, set just below the pause/death/cutscene returns, which keep real time). Anything that moves or counts frames reads `dtMul` and slows for free; anything that must stay real (the score clock) reads `dtReal`. Other drinks' wall-clock `until`s are slowed to match (`holdBuffsForGameSpeed`); the 🐢 buff and 🌀 screen filters are not.
- **📢 Sound wave (melee weapon ability, 2026-11-25/26, on the Megaphone `mgphn01`, which went Poor → Common, value 5 → 9).** While the Block guard is up (`advanceBlock`, Q/V with the weapon in hand) a ring leaves the held weapon's far tip (`heldShotPoint` — the Megaphone's horn rim, via `pWaveMouth` / `enemyHeldMuzzleAt`) every `SOUND_WAVE_EVERY_FRAMES`, fanning out from horn-bell size in concentric `)` arcs (`soundWaveArcs`) while sweeping body height (`backDx` / `centerDy` relative to `b.x`/`b.y` so seam shifts stay exact); rings are `booms` entries with a `wave` and do their work in the pass just before the booms tick: other-side bodies get `knock` (once per ring), other-side shots `blowShotBack` (a dud on Lucky's fall), throws turn round; a solid cell stops the ring. Units do it too (`ep.waveGuard`, `unitWantsSoundWave`, arm drawn level). **`enemyHP.current[k]` is undefined for a unit nothing has hurt yet** — a pass that asks `> 0` skips every fresh unit; treat undefined as alive.
- **🕊️ Non-hostile (`nonHostile` item effect, 2026-11-26; pills `zanex01` "Zanex" 15s and `antips1` "Anti Physcotic" 25s).** Rides `itemBuffs` (`enemiesNonHostile` into `unitSide(..., pacified)` in the AI/aura loops, keeping allies `"friendly"` and cancelling any active enemy wind-up/aim/swing/stomp/waveGuard; kill score and unlocks still ask un-pacified `unitSide(ea, ep)` so killing a pacified foe still pays). A shorter pill never cuts a longer running truce short.
- **Press E to skip** a full-screen floor-end scene (`animCanSkip`): armed after `ANIM_SKIP_ARM_SECS`, never on a state that is itself waiting for E. A scene on a stage in the level is not skippable (you are left where its actor ends).
- **General's Briefing (`gnrlbr2`) keeps his crawl speed** (1.318 cells a second). Trim it by where the state ends, not by the speed: the Briefing ends 4.5 s after the last crawl line is fully in, and the crawl fades over the 1.2 s the last line fades in. His State 3 (the held last line) is his.
- **A bare blow reaches only a little over the DRAWN body** (`bareBlowReaches`). A bite or punch (no gun, no swung weapon) needs the target's box inside the drawn body plus half its height. A creature's physics box is seven cells times its scale whatever is drawn in it: never gate a hit on it.
- **A trunk comes up only where there is something to climb.** A level over the street (a "side" level above a street level) joins the level under it only through a bottom gate with ladder cells in its last two rows, within two columns of the gate (`gateHasClimb`, in `seamGatePair` and `seamGates`). A gate without one is a drop. His Tree Tops 2 and 3 are the two ENDS of a tree: their bottom gate is the open shaft past the canopy.
- **A tree top stands SQUARE over its trunk level** (2026-11-26, "my tree tops levels are not aligned with Vietnam"): a level over the street joins the level under it only STRAIGHT up (Bottom Left over Top Left, Bottom Right over Top Right; `overStreet` in `vertWayOk`). The staggered pairs are for sewers only. Before, Tree Tops 1/4 (S2) stood diagonally on Forest M4 (N1) and Tree Tops 5 (S1) on Forest M3/M21 (N2): the ladders met, but the tree top and everything grown along it hung 64 cells off the Vietnam levels under them. Now M4 takes Tree Tops 5, M3 and M21 take Tree Tops 1/4. **And every tree top is as wide as the street level in its slot** (same day, "And match any broken widths"): the run's own copy is widened by `fitTreeTop`/`widenLevel` (his saved level is never touched). Over a trunk the extra columns split by the gate's % so the ladder still lands on the trunk's (Tree Tops 1 on Forest M21: 14 west, 6 east, ladder 110-112 -> 124-126); a west end grows west, an east end east. fg/bg/front carry on the edge's 7-cell rhythm; every cell-keyed layer (fx, climb, hazard, markers, enemies) shifts. The node level carries `widened: { from, left, right }`. Over 300 Vietnam seeds all 594 tree tops sit at the x and width of the level under them; a street level narrower than the tree top is left alone (no shrinking).
- **A tree top is laid on its trunk** (`planTree` in `buildRun`), with no way back down to find: you fall off it. The ends are added along the tree once the street is final, only over the street and clear of every other trunk and tree top. A tree-top node's unused sides are set to null at once, so the grid never matches them later. Under a tree top with no gate down, `runFallSeams` joins the level beneath as a `fall` on side S.
- **Tree Tops 5** (`trtops5`, 2026-11-20, "the Eagle's Nest") is the third CENTER tree top (W2/E2 + a trunk gate) and the first with its trunk ladder at Bottom LEFT (S1, col 48; 1 wide through rows 38-40, 3 wide below like Tree Tops 1), so it stands square over Forest M4's Top Left trunk. Rows 39-45 are his Tree Tops 1 canopy cell for cell with the trunk section (TT1 cols 82-145) moved 63 west, a multiple of his 7-cell underside rhythm, so every bump and both edges match. On top: the West Giant (crown top row 24, cols 62-88, vine ladder col 70, a Heal OR Drink pedestal, a Monkey; a Squirrel on his 3-cell perch clump at row 30, cols 57-59), a flat bamboo rope bridge on row 24 (cols 89-107), and the East Giant: a lower tier on row 24 (cols 108-136, ladder col 132 up from the canopy) under a nest crown on row 10 (cols 110-132, ladder col 112) holding a twig nest and one Vietnam AND Good pedestal (8 blue items, no purple or gold). **Bob is 7 rows tall**: the nest crown first sat on row 14 and left 6 rows over the tier, and he stopped dead against it at col 109; keep 8+ rows under any overhang you walk beneath. Two Eagles (seek), two Monkeys with rocks, three 🎲 Vietkong on the canopy. 300 Vietnam seeds over his online save: it appears in 75 runs (Tree Tops 1: 77, Tree Tops 4: 78), 35 on M4 and 40 on M3, with ends attached in 67. Driven in the running game: the trunk from the shaft bottom, both edges both ways over the 1-wide hole, all three ladders up and down, the bridge both ways, the tier under the nest crown, the nest.
- **Poison, Auras, Swing Speed & Fire Rate (2026-11-15):** Poison (`poisonBody`, `POISON_DAMAGE_SECS = 5`, `POISON_TIC_FRAMES = 12`) runs 1s ticks (`poisonPool += dtMul / 60 >= 1 - 1e-6`), green-tints via `POISON_TINT_CSS` only while `onPoison > 0`, and stacks across weapons (`WEAPON_ABILITIES.poison`), Poisonous clothes (`EFFECT_TYPES.poison`), and non-player enemies (`enemy.poison`) into `totalPoisonDps` and `weaponDpsOver`. Clothing Auras (`poisonAura`, `flameAura`, `iceAura`) use `auraDpsForTarget` (`boxDistance <= range * cellPx`) and stop immediately outside range. Clothing `swingSpeed` boosts both melee and ranged pistol-whip swings (`playerSwingFrames`, `unitSwingFrames`, `unitMeleeCooldownFrames`, stacking with melee-only `WEAPON_ABILITIES.swingSpeed`), and clothing `fireRate` scales `weaponFireCooldownFrames`; both feed `weaponDpsOver`.

### His bug list of 2026-11-15, second one (six items, one push)

- **Pedestals of the levels joined to yours are drawn too** (`playPedSets`: the live level plus each seam neighbour, at its seam offset). `prepRunNeighbours` rolls a neighbour's pedestals ahead, so walking through a gate does not make the item you could see disappear. Off-screen ones are culled like everything else. Enemy loot drops still draw for the live level only.
- **A two-arm weapon keeps its far arm while it fires** (`firedOffArmTwins`). Fire art replaces Rest art, and `bake()` twins only `mirror` pieces. His DK Arms and Harambe Arms have Rest back/up/crouch with 6 mirror pieces and Fire with none, so the far arm vanished on a ladder, aiming or crouched. The Rest pose's twins are added to Fire art that has no mirror pieces of its own (never Side, muzzles, hitboxes, cutters or a piece on the centre line). Player and units both.
- **A ladder goes down where it came up** (`ladderFootHits`): climbing down stops only at a solid cell the body is not already in, on a row where the ladder does not carry on through an open cell beside the body's centre. A deck the ladder passes through is not its foot. **S on the deck a ladder's top is flush with gets you on it** (`ladderUnderFeet`). Units use both.
- **A ladder that steps a cell sideways is slid across** (`ladderJogDx`), the way you hold A/D at the top of the first run. Forest M1's tree (column 35 to row 26, then column 36) had every follower climbing, letting go and falling for good.
- **A follower jumps a wall it can clear** (`followJumpsWall`: more than a cell, at most its jump less a quarter cell). Any ally, attacking or following, at its own Agility. `ep.wallHop` keeps it from grabbing a ladder mid-jump.
- **The way you went** (`followTrail`, `trailDrop` every `TRAIL_STEP_CELLS` on ground, plane or climb, never in the air or a car). A follower blocked for `FOLLOW_BLOCKED_FRAMES` makes for the crumbs one by one (`followDetourStep`), each an ordinary target, and is back in the line once beside you. A crumb not reached in `FOLLOW_TRAIL_GIVE_UP_FRAMES` is given up. The trail is re-based at a seam and cleared by a door.
- **A follower more than a level behind is brought to you at the gate** (`catchUpFollowers` in `seamHandoff`): an ally more than `FOLLOW_CATCHUP_CELLS` (160) away in the world, or in a level that has left the world, is set down at your spot with its climb and trail forgotten. Never a hostile, a rider or a dead one.

### His bug list of 2026-11-26 (five items, then "followers follow across levels", one push)

- **The shop's Sell tab shows what selling costs you** (`shopSellChangeRows`): a weapon gives a DPS row, from its DPS to your unarmed DPS; a worn piece gives its stat rows (`pickupChangeRows`, stat rows only) with just its slot emptied. A throwable shows none.
- **The shop panel is RETRO** (his: "slightly more retro"): a blue gradient box, hard white border, hard drop shadow, pixel font, gold title and wallet. It still has no emoji and square corners. Its buttons are styled through `.shopDlg .shopBuy`, because `.bb button` (0,1,1) beat the bare `.shopBuy` and the old colours never showed.
- **A `brief` is one short line** (his: Money = Power "doesn't have to mention the cap"). Say what it does. Never add a cap, a duration, a range or how it works, and never a " · " second half. A test checks all of them: no " · " and at most 36 characters.
- **A gunshot sounds for 0.1 s and an enemy's death for 1 s** (`FIRE_SOUND_MAX_S`, `ENEMY_DEATH_SOUND_MAX_S`, `momentMaxSecs`, `soundCutTimes`). The voice fades over `SOUND_CUT_FADE_S` and stops there. Only a `fire` slot and the `enemyDeath` basic are cut. The player's death and the studio ▶ preview play whole.
- **🟣 Ally Health is paid once per ITEM per LIFE** (`allyHPSources`, `payAllyHPSources`, `ep.allyHpPaid`). Putting on or picking up a piece tops every living ally up by that piece's HP once. A piece already paid this life pays nothing more, so swapping cannot farm it. Every extra life (`extraLifeHP`) comes back on `EXTRA_LIFE_HP` plus the whole worn bonus, and counts every worn piece as paid again. It never raises the wearer's own HP.
- **Followers go through doors and on to the next floor** (his: "be sure followers follow across levels"). A door takes every living, non-riding ally (`isFollower`) out of the level into the `arrivingFollowers` books (`takeFollowersOut`, `moveRunUnit`) and sets them down beside you on the other side (`setFollowerDown`, the placement `catchUpFollowers` uses). A unit recruited inside a room goes in the room bucket's `gone`, so the room, re-made from the library, never spawns it twice. A dead ally stays where it fell. A game save carries them (`followersToSave` → `makeGameSave.allies` → `applyGameResume`), so the next floor starts with them. Plain ▶ Playtest's ■ Stop after a door hands the editor back its own level (`playEditorLevel`), never a copy with units moved out.

## Working style

- Ship it. Push fixes directly, with no option menus. Try things before calling them impossible.
- Find the root cause. If a fix keeps not working, the data model is probably wrong. Fixes here
  have often covered only ONE instance of a class of bug; look for the others.
- Do the whole request. It usually has several parts.
- Do not put Bob in names. A movie, studio, shop or sign does not need Bob in it (M7's "APOCALYPSE
  BOB" from "Bob Pictures presents" was too on the nose).
- Say plainly what was verified and what was not. Flag any side effects beyond what was asked.
- Match the code's comments: they explain WHY and name the bug that motivated the code.
- When you learn something future sessions need, add a short RULE here and the story to
  `CLAUDE-HISTORY.md`, in the same commit. Keep this file short. If a rule needs a paragraph, the
  paragraph goes in the history file.

## What CLAUDE-HISTORY.md covers

Grep it for the function or feature name. In order, it covers:
- the online save and save folder, Storage and deletes, and verify-in-app recipes;
- look stacking, texture bands, the colour-group repaint, stored groups and Object art;
- level cells and objects: draw order, layers, Adjust, Fill, ramps;
- props: church, farm, vehicles and wheel wells, the Canned Ham ratios, the school bus;
- throwables and capture, Extra Lives, Fly, Tail Swing;
- unit status and Front hiding, melee multi-hit, See-through, Erase, drops;
- loot, pickups, ranks, level mirroring and top-down planes;
- units climbing, dropping and holes, and the Trailor Int5 room;
- the Front fade and the church performance fix;
- dialogue, shops, allies and the conversation UI;
- cutters and pivots, and runs (camera, seams, ONE WORLD, sewers, gate rules);
- playtest performance, facing, following and ducking;
- weapon flags, Melee Boost, aim assist, the stomp, and the animal recipes;
- spawns and gear tags, stat sliders, creature damage, unit armour and ability parity;
- crouch rendering and corpses;
- sound: the storage measurements and why audio is a file, the clip ladder, the keeper's sweep of
  clips, and the test rigs (fake host store, a test keeper with a local bare repo, headless Edge);
- the 👢 Stomp clothing ability (`headStomp`), with how it was driven in a real build;
- the 🐒 Tail Hold clothing ability, the Monkey Pants refit to Bobbett, and Tree Tops 6 and 7;
- the 🚁 helicopter rope ending: the Chinook, the rope layer, the walk-in scenery states.
- the game front end: why it is one app at two addresses, the title before the bundle, where saves live;
- and, last, the 🚗 vehicles: his 7 cars migrated, what was measured driving one, and the car's i-frames;
  then cars across seams, "a sitting player should fit", Bob on the tractor seat, ramp jump momentum carry, vehicle speed scaling, 1969 Muscle Car, and Trailor Park M17; then the Dragster and Trailor Park M18.
