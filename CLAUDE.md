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
- **His newest data is the `saves` branch** (`git fetch origin saves`, then `FETCH_HEAD:library.json`).
  The committed `asset-data/library.json` can be stale.
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
1. **The online save is the `saves` branch** (`library.json` + `head.json`). Every copy of the game
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

**Delivering or revising a record:**
- Keep the id. Put the record into `asset-data/library.json` **by text insertion**: splice it in
  before the `\r\n ],` that closes `assets`. Never re-serialise the whole file. Then parse both
  versions and assert every other record is identical.
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
  `library.bak.json` is tracked too and is the fallback when library.json fails to parse. If you
  touch one, check the other.

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

**Build only what his editor can make — anything else is "cheating" (Blake, 2026-10-09).** Run
`editorReachIssues(asset)` over every asset you deliver; it must return `[]`. A bending, tapering
piece (tail, neck, branch) is one 〰️ Curve-tool stroke (`curveBandPoints`: start, a point on the
curve, end, two thicknesses), not a hand-rolled polygon. If you need a shape or control the editor
lacks, add it to the editor first (he invited that), creation-only like Line / Fill / Curve.
Never set `outline` on a Curve or Fill piece: on a clip-path shape it is eight chained drop-shadows,
about 4px thick at any zoom (a square's or circle's is a 2px ring), and none of his own curved
pieces use it.
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
- **Sleeves need `overArms: true` + `limb: "arm"`.** A sleeve box copied without those flags hangs
  off the shoulder.
- **Underwear in Crouch: tick Behind legs on EVERY piece** (his Boxers do). The crouch thighs come up
  over the hips, so one unticked piece floats in front of the knees: Cheeky Bottoms' crotch on BoB
  and its hip bits on Bobbett, "behind legs in crouch isn't working right" (2026-10-24).
- Arm-flagged pieces (`limb:"arm"`, `role:"weaponArm"`, and every block drawn in the weapon editor)
  turn about the shoulder. `pieceOriginFrac` is the only place a pivot is decided.
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
- A translucent piece can carry an outline only as a rect, circle, roundrect or stadium. Any other
  shape draws its outline as a solid silhouette under the fill.
- **ONE 👻 Translucent slider, and it fades what is SELECTED** (its title says which): a block →
  `piece.translucency` (`pieceAlpha`, outline and fill fade together); a selected group → every block
  in it (`updSelAll`); nothing selected → the whole asset. Never add a second see-through slider: with
  two (one per block, one per asset) Blake reached for the asset one with ONE block selected and it
  faded his whole pill, three reports running. With 🪣 Change this color everywhere ON it fades every
  block wearing this block's colour, like Brightness and Fade (`seeThroughAssetGroup`, held through the
  drag by `colorDrag`; 2026-10-24, he asked: "change this color everywhere does not effect see through
  ness"), and the title then reads "this color everywhere". See-through is part of the colour
  (`fillLook.see`): a glass block and a solid block of one hex are different colours to 🪣.
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
  cliff, 🚶 top-down), painted cell by cell. To let Bob WALK over a prop (the M14 saucer), paint
  hidden Foreground (`hideInPlay`) blocks under its top with a 45° ramp wherever the height
  changes, each column at most one row from the next.
- **A ladder runs ONE ROW PAST the deck it reaches.** A climb pins you where your body last overlaps a
  ladder cell, so a ladder whose top cell is level with the deck leaves your feet a pixel inside the deck
  and you cannot step off. Decks joined by a ladder are at least NINE rows apart (seven tall + that row),
  or your head is in the deck above at the ladder top. The Climb layer is invisible in play: draw the rungs
  (ladder Objects, as M1 does, or the prop's own art).
- **Nothing solid taller than one cell across the only way through a level.** Agility -1 to 1
  jumps ONE cell (Army Bob, Roberta, Crocobob, Bobby, Billy), so a two-cell solid prop traps them
  for good. Place such props as scenery (Solid off), or give the path a way round.
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
  long segment, a rifle many thin ones), and throwables and extra lives are pips. SCORE
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
  page; the boxes too since 2026-10-24) — display only, the run starts as the look is saved. **Locked starters** (`STARTER_LOCKS`, by look name,
  spaces ignored so "VietBob" = "Viet Bob"): Bobby = Trailor Park floor done, Bobert = 50 items found
  (Items-tab ids in `record.found`), Roberta = Trailor Park done AS Rob (`record.floorsWith`), Rob =
  Trailor Park on Hard, Viet Bob = Vietnam on Hard, Bob Li = the conversation NAMED "Bob Li" opened in
  a game (`record.met`, dialogue names, written by openTalk; the NPC is Chun Bobette so no other look
  is named Bob Li), Robbie = 100 items found (same count as Bobert). Locked boxes show as a silhouette under
  a padlock, can be lit but not picked; the P1 card names what opens them. **Order** (`starterRoster`):
  every open fighter first (Bob, then A-Z), then the locked ones A-Z; an unlock moves a fighter up into
  its alphabetical place. A short last row is finished with **Coming Soon** boxes (`selectGridFill`):
  Bob as he would look LOCKED (his dressed silhouette, no padlock; he turned down a hollow outline of
  his body), never selectable. **Back sits beside
  START, under Easy** (his placement). Then **Easy 4 / Medium 2 / Hard 1 lives**
  (`DIFFICULTIES`). A death no 🐱 Extra Life catches costs one (`gameDeathRef`, called from
  `playerDefeated`; counted in the save as `deaths`); the last one freezes the loop and shows
  **Game Over** (Retry = same look, difficulty and seed; the save is deleted). A run life is the
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
- **Level cells:** `lv.fg` / `lv.bg` / `lv.front`, keyed `"r,c"`. A value is a colour or
  `{ c, tex, ol, slope, run, step, upsideDown, … }`, and `more` holds extra fills. Read cells with
  `fgFills` / `fgSolid` / `fgSlopeFills`, and paint with `mergeFgFill`. All three layers stack and
  take ramps (`layerTakesRamps`). Fill keeps every field except `PAINT_IDENTITY_KEYS`; never put a
  key allowlist over cell geometry. Anything with a left/right sense must be added to
  `flipLevelHorizontally`.
- **A flat landing takes any floor top the feet crossed THIS frame** (`landingReach`, used by the
  player, units and corpses). Never a fixed pixel window: a fast fall or a slow frame steps past it.
  On thick ground that sank you a cell; on M14's two-row slab it dropped you onto the street.
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
  labels 5070 / talk prompt 5080 (`SCENE_LABEL_Z`), front objects 5101+, front paint 6000, door
  prompt 9500, conversation 9600. A z-index only counts inside one stacking context, so a new
  in-level label goes in the shared label layer, never inside the thing it labels.
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
    are extra). **No level twice on a seed** (his rule): buildRun never re-picks a used street or sewer
    level, and a chain that runs dry ends at the last level an Exit joins. A run starts at the Intro's Lower Left gate even though it is closed (`spawnGateFor`). **A level's role comes from its gates and Floor only (`runRole`).** Blake
    retired the free-text Section box on 2026-10-09; an old save's `section` is ignored.
  - **A run is one floor's** (`buildRun(pool, seed, { floor })`, 2026-10-18): the Intro, the Exit and
    (with no Intro) the first level come from that floor; later levels join by gates alone. 🎲 Generate
    has a floor box (`runFloors`), opening on the editor level's floor; Hold-R keeps the run's floor.
    No floor = any Intro (the game's New Game). Vietnam is five middle levels, Forest M1-M5, all joined Lower Left to Lower Right (W2/E2, accepts "Vietnam"; M3 and M4 also open up into Tree Tops), and a run lays them in any order. Forest M5 (2026-10-25) is the thick-jungle one with a single shack, his M4 shack whose door tag "Shaq" leads to VShaq or VShaq 2 (the WBOB radio shack, 2026-10-25). Trailor Park M16 (2026-10-25, W2/E2) has the Liquor Store (`lqstor1`) with a door tagged "Liquor Store"; its room is Liquor Store 1 (`lqroom1`, roomTag "Liquor Store": Trailor Int5's top-down shell reskinned, The Shop Keeper selling the "Drink" items via `dlgliq1`).
  - Sewers and tree tops (Floor "Sewer", "Underground" or "Tree Top") are planned as passages
    with a way out. **No street level is laid with a top/bottom gate that leads nowhere** (his rule,
    2026-10-11: "an impossible seed"): `tryLay` takes a level back when its passage cannot be
    planned (`vertDead`), the Exit included, and the step back to an Exit never cuts a passage.
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
  is an `act`. Money is an item (`{kind:"money"}`), and the wallet is run-wide.
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
  "Level start" begins in the play effect, "Walk up + E" last in the E chain, both
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
  `throwStockKey` / `wpnClipKey` (playRunId|asset|knob) keep the grenade count and the clip across
  re-runs, or every Pokeball landing in its own fire refilled the stack ("infinite, not 3").
- **One body box for throws.** `unitBodyBox` is what a rock stops on, a stun reaches and a Capture ball
  claims. A bare `topFrac * height` sits above an animal by its ground anchor (`unitHitTop`); the capture
  payout used it, so a Crocodile (scale 1.6) was never caught and a Lion only by luck.
- **A grip that goes nowhere lets go** (`CLIMB_IDLE_LET_GO_FRAMES`): a unit on a ladder/bar/ledge with its
  target level and no movement for 1.5 s drops. Corpses clear `ep.climbing`. Crocobob, Ratman and Turtle
  Man are `character`s (people), so Capture refuses them by design — only Enemy-creator assets are catchable.
- A helper that two blocks of the play loop both call belongs at loop level. A `const` in one block
  is invisible to its sibling, and that once crashed the game on a parry.

## Blake's decisions — do not undo these

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
  rank. A shop never shows what you already hold or wear (`shopUnowned`).
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
- **🔥 Ignite (weapon ability, ranged + melee, 2026-10-18):** a connecting hit sets the body alight for `ignite` s at
  `igniteDps` (`igniteBody`). It is a timer on the body added to `hazardDpsAt` in the SAME burn pool fire cells use, so the
  onFire look and immunities are fire's own; it never paints cells (a 10/s flamethrower would re-raster the level). Applied at
  every hit site that applies a shot/swing stun, both directions. The Flamethrower (`flmthr1`, Flame `flmpuf1`) uses it.
- **🧯 Fire Immunity / 🪖 Explosion Immunity (clothing abilities, 2026-10-18):** `fireImmune(effects)` /
  `blastImmune(effects)`, the same call for the player (`pFireImmune`/`pBlastImmune`) and every unit (`ea.effects`).
  Fire = no burn pool at all (fire cells AND Ignite, zeroed where the pool is fed) plus a flame SHOT (`shotIsFlame`:
  a ranged round with ignite) washing over. Blast = every branch of `detonate` and the contact hit of an explosive
  throwable (`throwIsExplosive`: explode or Cluster). A new blast or flame damage site must ask them too.
- **🐞 Lucky / 🪞 Reflect / 🚒 Fire Resistance (clothing abilities, 2026-10-20):** every hit site, both ways, calls
  `shrugsHit(wearer, effects, dmg, by, x, y)` (loop level) once its damage is known and before HP moves. True = the hit
  does nothing to the wearer (no damage, stun, burn or i-frames); reflect has already put the wearer's post-armour damage
  on `by` ("player", a unit key, or null; shots carry `shooterKey`, unit throws `throwerKey`). Never reflected twice, and
  an own blast rolls luck only. Chances and resistances MULTIPLY across items (`hitFate`, `fireDamageMult`). Fire is not
  a hit: resistance scales the burn pool and a flame round (`fireResistedHit`), luck never reads fire. A new hit site
  calls shrugsHit (a test counts 16). The marks are booms with `slot: "fx.lucky" | "fx.reflect"`. Items: Lucky Hat
  `lckyhat`, Spiked Jacket `spkjkt1`, Fireman's Coat `frcoat1`, Fireman's Helmet `frhelm1`.
- **🔥 Fire damage / ❄️ Ice damage (weapon abilities, 2026-10-21):** "Fire damage" is the `ignite` key renamed in the
  picker; added now it starts on his 2 HP/s for 10 s (`FIRE_DAMAGE_*`), saved weapons keep theirs. Ice is `iceDamage`
  (+`iceDamageDps`, 1/s, 10 s): its own timer on the body (`chillBody`, `chillPool`), half walk speed and half jump HEIGHT
  (`chillMoveMult`, `chillJumpVMult`) for the player and every unit, AGI/SPD read half on the HUD. Every hit site calls
  `afflictBody(body, weaponOrShot)`, never igniteBody directly; a round copies the ice off its gun (`shotStatusOf`). The
  look: `bodyStatusFilter` (glow for the whole burn, a white rim while chilled) + `<StatusFx>` (CSS sparks / frost).
- **⏩ Double Shot (clothing, 2026-10-21):** every gun round goes up through `pushShot` (player and units): two parallel
  rounds `DOUBLE_SHOT_GAP_CELLS` apart for one round of ammo. A pair shares `pair`, so your i-frames from the first let
  its twin land (`p.invulnPair`).
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
- **A look's name is record keeping too.** A talker is named by its tree's speaker (`talkerName`):
  the "Talk to …" prompt and the box. A 🎲 tag placement rolls a different look every Playtest.
- There is no 👹 enemy flag and no weapon picker in Dress Bob. What a character carries is set per
  placement.
- Units walk only to targets on their own storey (`unitSharesLevel`), and allies guard the area
  around YOU, on a leash.

## Working style

- Ship it. Push fixes directly, with no option menus. Try things before calling them impossible.
- Find the root cause. If a fix keeps not working, the data model is probably wrong. Fixes here
  have often covered only ONE instance of a class of bug; look for the others.
- Do the whole request. It usually has several parts.
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
- the 🚁 helicopter rope ending: the Chinook, the rope layer, the walk-in scenery states.
- and, last, the game front end: why it is one app at two addresses, the title before the bundle, where saves live.
