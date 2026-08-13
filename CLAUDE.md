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

Seeding fake assets into `localStorage` (`asset:<id>` records plus an `assetIndex`
array of `{id,name,type}`) and reloading is the fastest way to get real data on
screen. Clicking through the drawing tools blind is not — it burns context and
usually fails.

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

**Every kind of drawn work goes to both tiers, in both directions.** The kinds are one
list — `PROJECT_KINDS` in `App.js`, `KINDS` in `setupProxy.js`, kept identical by a
test: **assets, levels, stamps, textures, backgrounds**. Each saves up
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
`EFFECT_TYPES` (clothing abilities), `TEXTURES` (level textures), `LV_OBJ_SIZES`.

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

**Objects** live in `lv.fx` → arrays of `{ kind, solid, inFront, size }`, keyed by the
object's **top-left** cell. Placement centres on the click (`objAnchor`), so the
clicked cell is usually *not* the key — find an object under a click with `objKeyAt`.
`rot` twists the art, `flip` mirrors it, `ox`/`oy` nudge it — all three move the ART
and never the footprint, which stays the axis-aligned square/rect `size` describes.

**Mirroring a level** (`flipLevelHorizontally`, the ⇄ Flip buttons) is c -> cols-1-c on
every layer plus a reversal of everything that carries a direction: ramp `slope` and
`step`, object `flip`/`rot`/`ox` (and its key moves by the whole footprint, not the
anchor), enemy `facing`, and the connectors via `CONN_FLIP_H`. It is an exact
involution — the round-trip test is what proves nothing was missed, so **anything new
with a left/right sense must be added there**, or a flipped level breaks in a way only
that field shows.

**Layer z-ladder:** 1 bg · 2 fg · 4 climb/pedestals · 5 player/hazards · 6 front.

**Piece rendering.** Cutters (`isCutter`) only punch through pieces in the same
contiguous same-source run (`cutterRuns` / `pieceSrcKey`). Anything that reorders
pieces must keep a cutter adjacent to what it cuts — see `groupWeaponBlocksByArm`.

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

**Weapon flags** live flat on the asset (`explode`, `ignoreArmor`, `burst`,
`burstDelay`, `resurrect`, `stun`, …). Adding one means three places: the `newAsset`
defaults, a `migrate` default so older saves get it, and the editor control.

Comments explain **why**, and usually name the bug that motivated the code. Match that
density.

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
