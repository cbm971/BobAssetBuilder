# Grenade pack

Six assets, built in the same 200×260 design canvas the app uses, in the same flat
two-tone style as the Fire prop and the army gear (`#3d4a28` olive, `#2b2b2b`,
`#8a929c` steel, `#b0504f`/`#ff7b00`/`#ffe8a8` for flame, `#504134` wood).

| Asset | Type | What it is |
| --- | --- | --- |
| **Explosion** | 🌿 Object / Prop | 5-frame boom: white-hot flash → fireball with spikes → ragged peak + flying debris → collapse into smoke → drifting smoke and embers. |
| **Crumbled Rock** | 🌿 Object / Prop | A pile of broken chunks with a little dust. **One frame on purpose** (see below). What the Rock leaves where it lands. |
| **Grenade Shell** | 🔮 Projectile | The grenade the launcher fires. Tumbling pineapple grenade, `size 0.9`. |
| **Grenade Launcher** | ⚔️ Weapon (Ranged) | Stubby break-action launcher — wood stock, olive tube, flared muzzle. Rest + Fire art (Fire has recoil and a muzzle flash) for Side / Aim-up / Crouch / Back. |
| **Grenade** | ⚔️ Weapon (Throwable) | The same grenade in Bob's hand, thrown with **G**. |
| **Rock** | ⚔️ Weapon (Throwable) | Grey lump. Barely hurts anything, never explodes. |

## They're wired to each other already

```
Grenade Launcher ──fires──▶ Grenade Shell (projectile)
        └──explodes into──▶ Explosion          (plays once, 2.5-cell blast)

Grenade (thrown with G) ──lands as──▶ Fire     (your existing Fire prop)
Rock    (thrown with G) ──lands as──▶ Crumbled Rock
```

The links are stored as asset ids (`gr3nsh1`, `expl0d3`, `r0ckrub`), so importing the whole
pack in one go keeps them connected. Import assets one at a time and you'll have to re-pick
them from the dropdowns in the weapon editor.

## Getting them into the app

**All six at once** — `grenade-pack.json` is in the same backup format as
`assetbuilder-backup-2026-07-25.json`:

1. Download `assets/grenade-pack.json` (Raw → save).
2. In the app: home screen → **Load** → **⬆ Open a file** → pick it.
3. It says *"Restored 6 asset(s) from the backup ✓"*.

This **merges** — it never wipes the library. Assets are keyed by id, so re-importing an
updated pack overwrites just these six and leaves everything else alone.

**One at a time** — open any of the single files (`explosion.json`, `grenade.json`, …)
with the same **⬆ Open a file** button; it loads straight into the editor, then hit Save.

## The looping-explosion trap

Two different code paths draw an explosion, and only one of them plays the animation once:

- A **ranged** weapon's 💥 Explode (`explodePropId`) is transient. The engine steps the prop's
  frames once across the boom time, fades it out, and drops it — it never touches the level.
  **That is what the Explosion prop was drawn for**, and why its last frames fade to smoke.
- A **throwable**'s **Fire look** (`landPropId`) is not. That prop gets *stamped into the level*
  on the cells the grenade lands on, and a placed prop loops its frames at its own `animFps`
  until you press Stop. Put an explosion there and it re-detonates forever.

So the Explosion is on the launcher, and the throwables land as things that are *supposed* to
sit there: the Grenade leaves your existing 🌿 **Fire** burning for 2.5s, and the Rock leaves
🌿 **Crumbled Rock** — one frame, so there is nothing to loop.

The Grenade already carries `explode / explodePropId → Explosion / explodeSize 4 /
explodeLife 0.7` in its data, ready for the day the throw code learns to detonate. Today the
engine ignores those fields on a throwable (the editor doesn't even show the 💥 card for one),
so they change nothing.

## Numbers they were given (all tweakable in the editor)

- **Grenade Launcher** — 16 damage, 2.5-cell blast, fire rate 1/sec, clip 4, 2.2s reload,
  projectile speed 11, 0.5s stun, boom size 4 cells for 0.8s. Categories: `T2 / Launcher / Rare`.
  The 🔴 muzzle marker sits at the mouth of the barrel in every pose, so shots leave the tube.
- **Grenade** — weight 3 (≈7 blocks at Strength 5), 14 HP/sec for 2.5s, 3×3 splash.
  Categories: `T1 / Grenade / Common`.
- **Rock** — weight 6 (≈5 blocks, drops short), 2 HP/sec for 1s, single cell, no explosion.
  Categories: `T1 / Rock / Common`.

Both throwables and the launcher ship with pre-built fits for **BoB** and **Bobbett**
(plus the default guide body), so they sit in the right hand on either body without refitting.
