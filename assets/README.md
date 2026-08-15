# Grenade pack

Six assets, built in the same 200×260 design canvas the app uses, in the same flat
two-tone style as the Fire prop and the army gear (`#3d4a28` olive, `#2b2b2b`,
`#8a929c` steel, `#b0504f`/`#ff7b00`/`#ffe8a8` for flame, `#504134` wood).

| Asset | Type | What it is |
| --- | --- | --- |
| **Explosion** | 🌿 Object / Prop | 5-frame boom: white-hot flash → fireball with spikes → ragged peak + flying debris → collapse into smoke → drifting smoke and embers. |
| **Crumbled Rock** | 🌿 Object / Prop | A pile of broken chunks with a little dust. One frame — nothing to animate. What the Rock leaves where it lands. |
| **Grenade Shell** | 🔮 Projectile | The grenade the launcher fires. Tumbling pineapple grenade, `size 0.9`. |
| **Grenade Launcher** | ⚔️ Weapon (Ranged) | Stubby break-action launcher — wood stock, olive tube, flared muzzle. Rest + Fire art (Fire has recoil and a muzzle flash) for Side / Aim-up / Crouch / Back. |
| **Grenade** | ⚔️ Weapon (Throwable) | The same grenade in Bob's hand, thrown with **G**. |
| **Rock** | ⚔️ Weapon (Throwable) | Grey lump. Barely hurts anything, never explodes. |

## They're wired to each other already

```
Grenade Launcher ──fires──▶ Grenade Shell (projectile)
        └──bursts into──▶ Explosion            (2.5-cell blast, boom art plays once)

Grenade (thrown with G) ──bursts into──▶ Explosion   (2-cell blast, 💥 Explode)
                        └──leaves──────▶ Fire        (your existing Fire prop, 2.5s burn)
Rock    (thrown with G) ──leaves──────▶ Crumbled Rock
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

## How an explosion gets drawn (this changed in the app itself)

Throwables can now explode. **💥 Explode** used to be a Ranged-only setting; it's on the
Throwable panel too, so a grenade bursts where it lands — the same one-shot boom a shot makes
(frames played through once, then gone), plus splash damage in the blast radius.

That matters because the *other* way to get an explosion out of a throwable — pointing its
**Fire look** at an explosion Object — is ground art, and ground art used to loop forever.
Two fixes went in with this pack:

- A grenade's landing art now plays its frames through **once** across the burn and clears when
  the burn ends. Before, it looped at the Object's own `animFps` until you pressed Stop, so an
  explosion picked as the "Fire look" kept re-detonating on the ground.
- A shot that hits **nothing** now detonates when its fuse runs out instead of silently
  vanishing, so firing the launcher across open ground actually shows the boom.

So in this pack: the Explosion is the **boom art** on both the launcher and the grenade
(`explodePropId`), and the **Fire look** is the stuff that's meant to sit on the ground
afterwards — your existing 🌿 Fire for the Grenade, 🌿 Crumbled Rock for the Rock.

## Numbers they were given (all tweakable in the editor)

- **Grenade Launcher** — 16 damage, 2.5-cell blast, fire rate 1/sec, clip 4, 2.2s reload,
  projectile speed 11, 0.5s stun, boom size 4 cells for 0.8s. Categories: `T2 / Launcher / Rare`.
  The 🔴 muzzle marker sits at the mouth of the barrel in every pose, so shots leave the tube.
- **Grenade** — weight 3 (≈7 blocks at Strength 5), 💥 2-cell blast for 12 damage, then burns
  14 HP/sec for 2.5s over a 3×3 splash. Categories: `T1 / Grenade / Common`.
- **Rock** — weight 6 (≈5 blocks, drops short), 2 HP/sec for 1s, single cell, no explosion.
  Categories: `T1 / Rock / Common`.

Both throwables and the launcher ship with pre-built fits for **BoB** and **Bobbett**
(plus the default guide body), so they sit in the right hand on either body without refitting.
