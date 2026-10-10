# Bob Okay — agent handoff

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
- **The game (Bob Okay).** What players get. It needs none of the studio. It is a title sequence,
  then a main menu (New Game, Load Game, Unlocks, Extras, Asset Builder sign-up, Credits), then a
  run. Floor 1 is the Trailor Park, and its objective is "Make it to the draft office". Game-facing
  UI must not pull editor controls into it.

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
(`BROWSER=none PORT=3000 npm start`, in the background), open it in the preview, drive it with
JavaScript, and read the DOM back as the proof.

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
2. **His save folder** is `C:\Users\cbm97\OneDrive\Documents\Bob Okay\Saves`. It holds one file per
   record, and `History\` keeps every version ever seen and never deletes. The keeper
   (`tools/bob-okay.js keep`, started at sign-in) sweeps every other copy's browser store into it.
   `node tools/bob-okay.js export <file>` writes the folder in library.json shape. **Never point a
   test keeper at his folder.** Use `BOB_SAVES`, `BOB_HOME`, `BOB_PORT`, `BOB_NO_SWEEP=1`, and
   `BOB_NO_CLOUD=1` or `BOB_CLOUD_REMOTE=<local bare repo>`.
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
  his rule.
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

**Clothing, and anything worn: `ASSET_AUTHORING.md` is the spec. Read it first.** It is also what
he pastes into chats that have no repo access, so keep it in step with the code. The essentials,
plus traps it does not cover:
- **A fit variant IS the flat pose map.** `variants.<fit>` is `{front:[…],back:[…],…}` (a weapon's
  is `{states:{rest,fire}}`), never `{angles:{…}}`. Boxed, it imports "successfully" and draws
  nothing.
- Fit **both bodies**, BoB `telfv37` and Bobbett `oipvf3l`, in all five poses. Crouch is the front
  art moved down by that body's head drop (BoB +36, Bobbett +25).
- House style: flat, 4–8 pieces, one colour plus a dark edge (`#1d1b1b`), no shading, gradients or
  tiers, and the face left open.
- **Sleeves need `overArms: true` + `limb: "arm"`.** A sleeve box copied without those flags hangs
  off the shoulder.
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
- **A whole asset is see-through by `asset.translucency`** (0–0.9, the 👻 Translucent card in every
  asset editor; `assetAlpha`). It fades the finished picture as ONE group (`fadeGroup`), unlike the
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
- **A ground prop must sit on its row.** Draw it at a ratio that gives whole rows at the sizes it
  will be used at (2:1, 8:1, 10:3 …), and end every ground-touching piece on one y. Fractional rows
  make it float.
- The world scale is ~3.2 cells per metre, and Bob stands ~6 cells tall.
- Vehicles get **solid wheel wells**: a dark well drawn over the body with the tyre in it. Never a
  see-through arch cutter ("the wheel isn't attached"). Window cutters are fine.
- A cutter only cuts pieces EARLIER in the list, within the same source run. Order body → trim →
  cutter → whatever must stay whole. Overlapping cutters cut their union.
- Text pieces (`kind:"text"`) are part of his style. Never `mirror` one; draw the pair. A flipped
  placement keeps its text readable.
- Draw diagonals as 4-point polys, not rotated rects (`worldArtBox` measures unrotated boxes).
- Reuse his palettes (`PALETTES.trailer60s`, `#2b2b2b` for tyres and trim, `#8a929c` for chrome)
  and his textures.
- `solidDefault` sets the Solid box when the prop is picked (still editable). Solid means collision
  and nothing else; the drawing layer is `lay` (bg / fg / front).
- **Props cannot be climbed.** Climbing comes only from the level's Climb layer (ladder, bars,
  cliff, 🚶 top-down), painted cell by cell. To let Bob WALK over a prop (the M14 saucer), paint
  hidden Foreground (`hideInPlay`) blocks under its top with a 45° ramp wherever the height
  changes, each column at most one row from the next.
- **Nothing solid taller than one cell across the only way through a level.** Agility -1 to 1
  jumps ONE cell (Army Bob, Roberta, Crocobob, Bobby, Billy), so a two-cell solid prop traps them
  for good. Place such props as scenery (Solid off), or give the path a way round.

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
- The dev server writes uploads into `asset-data/clips/`. Delete test clips before committing.
- 10 MB per file; the answer to a bigger one is mp3/ogg, not a bigger cap. The 🎵 toggle is per copy
  (localStorage `bobMusic`).

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
  pieces tucked under the legs) · skin decor · shoes · undershirt · pants/underwear · shirt/jacket
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
- **Objects:** `lv.fx["r,c"]` (the object's top-left cell) is a list of
  `{ kind, solid, lay, z, size, rot, flip, ox, oy, … }`. Render through `levelObjectsInDrawOrder`,
  and new placements take `nextObjectZ`. The layer comes from `lay` (`objectLay`), not from Solid.
- **Z ladder** (all inside `.lgrid`, which has `isolation:isolate`): bg cells 1000, fg 2000, climb
  and pedestals 4000, player and units 5000, corpses 5050, unit status 5060–5062, drops 5063,
  labels 5070 / talk prompt 5080 (`SCENE_LABEL_Z`), front objects 5101+, front paint 6000, door
  prompt 9500, conversation 9600. A z-index only counts inside one stacking context, so a new
  in-level label goes in the shared label layer, never inside the thing it labels.
- **Facing:** enemy art faces LEFT and player art faces RIGHT (`enemyNeedsFlip`,
  `playerSpriteMirrored`). A unit's facing has ONE gated writer (`wantFace` → `holdFacing`). Never
  add another direct `ep.face` write in the AI loop.
- **Damage invariants:**
  - Every player death goes through `playerDefeated(p, msg)`, and every player HP loss through
    `playerHpAfterHit` (god mode lives there; a test greps for a bare subtraction).
  - Every hit on a unit goes through `incomingUnitDamage` (fire excepted) and asks
    `unitUntouchable(ep)`. A test greps for bare HP subtractions.
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
    gate), then up to `RUN_MIDDLE_LEVELS` (8) middles chained by `canAttach`, then an Exit (no open
    right-hand gate). **A level's role comes from its gates and Floor only (`runRole`).** Blake
    retired the free-text Section box on 2026-10-09; an old save's `section` is ignored.
  - Sewers and tree tops (Floor "Sewer", "Underground" or "Tree Top") are planned as passages
    with a way out.
  - One level is live at a time. Neighbours are drawn whole from cached tiles. Their units are
    adopted into the live level (`adoptRunNeighbours` / `releaseRunUnits`), so shots and chases
    cross gates.
  - Crossing a gate is `seamHandoff`. Side gates are keys, and the whole shared edge opens.
    Top/bottom gates must line up.
- **Camera:** `cameraTarget` clamps to the union of the drawn levels, feeds `camRef`, and becomes a
  `translate3d` on `.lgrid` inside `commitFrame`. Nothing scrolls during play.
- **Dialogue trees** are the sixth saved kind: `{ id, name, start, once?, nodes: { nId: { speaker,
  text, choices: [{ text, to, act, tone, shopTag? }] } } }`. `to` and `act` are independent. Keys
  1–9 pick options. A tree on a spawn makes it peaceful, and a conversation pauses the WORLD. A shop
  is an `act`. Money is an item (`{kind:"money"}`), and the wallet is run-wide.
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
- **Limbs seen from behind (ladder, Back pose) move by TRANSLATION, never rotation.** A hip
  rotation only splays a leg from behind, and a far-side pant twin counter-rotates off the leg.
  Units climbing take the player's ladder step (`legLift`), not the walk swing, and raise
  their arms like yours (`eClimbArms`, ahead of aim/swing; creatures keep paws as drawn). Raised ladder arms
  may drop but not rise (`LADDER_ARM_REACH_UP`), or they float off the shoulder.
- **The CSS sheets are JS template literals.** A backtick in a CSS comment breaks the build at a
  line far from the cause.
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
  bug. The deliberate exceptions are player i-frames, AI pacing, and Capture being player-only.
- Floating labels are bare words (white, with a black outline and glow) and never boxes. There is
  no 🐱×N count by HP bars. The shop panel is square and has no emoji. Dialogue has no bubble,
  answers sit in a grid, and the font is DotGothic16. The pickup banner is Shrikhand, coloured by
  rank.
- **Defense:** a hit times `DEFENSE_HALF_AT / (DEFENSE_HALF_AT + Defense)`, DEFENSE_HALF_AT = 20 (was 10
  until 2026-10-08: "no defense too weak, high defense too strong"). Applied ONCE per hit, on the player
  and on units alike. A look's Defense is the sum of its garments; negative totals clamp to 0.
- **A control must be operable at its real size.** Setting a slider's value from script works at any
  width, which is how a 3px Strength slider shipped. Check the rendered width and drag it with the mouse.
- "Range" means how far a gun or bow shot flies (the weapon's Range, 🎯 Long Shot, the 🎯 Range
  item). An item's range boost multiplies with Long Shot at the trigger (`activeRangeMult`); throws
  and melee are untouched.
- Talk reach is `TALK_RANGE_CELLS` = 6. The Enemy-creator Speed AND Strength sliders go to 20 (the animals' scale; a
  creature's Strength is its bite, 2x, unclamped), a
  dressed look walks by `playerWalkSpeed`, and Speed floors at 0.
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
  clips, and the test rigs (fake host store, a test keeper with a local bare repo, headless Edge).
