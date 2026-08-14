# Grenade pack

Five assets, built in the same 200×260 design canvas the app uses, in the same flat
two-tone style as the Fire prop and the army gear (`#3d4a28` olive, `#2b2b2b`,
`#8a929c` steel, `#b0504f`/`#ff7b00`/`#ffe8a8` for flame, `#504134` wood).

| Asset | Type | What it is |
| --- | --- | --- |
| **Explosion** | 🌿 Object / Prop | 5-frame boom: white-hot flash → fireball with spikes → ragged peak + flying debris → collapse into smoke → drifting smoke and embers. |
| **Grenade Shell** | 🔮 Projectile | The grenade the launcher fires. Tumbling pineapple grenade, `size 0.9`. |
| **Grenade Launcher** | ⚔️ Weapon (Ranged) | Stubby break-action launcher — wood stock, olive tube, flared muzzle. Rest + Fire art (Fire has recoil and a muzzle flash) for Side / Aim-up / Crouch / Back. |
| **Grenade** | ⚔️ Weapon (Throwable) | The same grenade in Bob's hand, thrown with **G**. |
| **Rock** | ⚔️ Weapon (Throwable) | Grey lump. Barely hurts anything, never explodes. |

## They're wired to each other already

```
Grenade Launcher ──fires──▶ Grenade Shell (projectile)
        └──explodes into──▶ Explosion (boom art, 💥 2.5-cell blast radius)

Grenade (thrown with G) ──lands as──▶ Explosion
```

The links are stored as asset ids (`gr3nsh1`, `expl0d3`), so importing the whole pack in
one go keeps them connected. Import assets one at a time and you'll have to re-pick them
from the dropdowns in the weapon editor.

## Getting them into the app (works fine on a phone)

**All five at once** — `grenade-pack.json` is in the same backup format as
`assetbuilder-backup-2026-07-25.json`:

1. Download `assets/grenade-pack.json` from GitHub (Raw → save to Files/Downloads).
2. In the app: home screen → **Load** → **⬆ Open a file** → pick it.
3. It says *"Restored 5 asset(s) from the backup ✓"*.

This **merges** — it never wipes the library. Assets are keyed by id, so re-importing an
updated pack overwrites just these five and leaves everything else alone.

**One at a time** — open any of the single files (`explosion.json`, `grenade.json`, …)
with the same **⬆ Open a file** button; it loads straight into the editor, then hit Save.

## Numbers they were given (all tweakable in the editor)

- **Grenade Launcher** — 16 damage, 2.5-cell blast, fire rate 1/sec, clip 4, 2.2s reload,
  projectile speed 11, 0.5s stun, boom size 4 cells for 0.8s. Categories: `T2 / Launcher / Rare`.
  The 🔴 muzzle marker sits at the mouth of the barrel in every pose, so shots leave the tube.
- **Grenade** — weight 3 (≈7 blocks at Strength 5), 14 HP/sec for 2.5s, 3×3 splash.
  Categories: `T1 / Grenade / Common`.
- **Rock** — weight 6 (≈5 blocks, drops short), 1 HP/sec for 1s, single cell, no explosion.
  Categories: `T1 / Rock / Common`.

Both throwables and the launcher ship with pre-built fits for **BoB** and **Bobbett**
(plus the default guide body), so they sit in the right hand on either body without refitting.

## One quirk worth knowing

A **ranged** weapon's explosion is transient: the engine plays the prop's frames once across
the boom time and then drops it. That's what the Explosion prop was drawn for, and it's why
the last frames fade to smoke.

A **thrown** grenade's landing art works differently — the engine stamps the prop into the
level as the "fire look" and loops it until you stop Playtest, so the Explosion will keep
puffing on the ground for the rest of the run (its `animFps` was set to 6 to keep that slow
rather than strobing). If you'd rather have lingering flames there, open **Grenade** →
**Fire look** and pick 🌿 **Fire** instead — one dropdown, nothing else changes.
