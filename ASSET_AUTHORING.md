# Prompt: making assets for Bob Okay (paste this whole thing into the other chat)

I'm going to ask you to build an asset for my game "Bob Okay" (a Bob Asset Builder project). You
will produce **one JSON file** that I upload with the **⬆ Open a file** button. You cannot see the
game and you cannot test it, so follow this spec exactly — every rule below exists because an
earlier attempt broke it and shipped me something that didn't work.

---

## 1. The file envelope

```json
{
 "assetBuilderBackup": 1,
 "exportedAt": 1785000000000,
 "assets": [ { ...one asset... } ]
}
```

Put one asset in the array (or several — they all import together).

## 2. The asset

```json
{
  "id": "pick7ab",
  "name": "Hood",
  "type": "equipment",
  "slot": "hat",
  "guideId": "telfv37",
  "angles":   { "front": [], "back": [], "side": [], "up": [], "crouch": [] },
  "groups":   { "front": [], "back": [], "side": [], "up": [], "crouch": [] },
  "variants": {
    "default": { "front": [], "back": [], "side": [], "up": [], "crouch": [] },
    "telfv37": { "front": [], "back": [], "side": [], "up": [], "crouch": [] },
    "oipvf3l": { "front": [], "back": [], "side": [], "up": [], "crouch": [] }
  },
  "lastFit": "telfv37",
  "confirmedFits": ["telfv37", "oipvf3l"],
  "statBoosts": { "hp": 0, "speed": 0, "agility": 0, "intelligence": 0, "strength": 0 },
  "defense": 0,
  "effects": [],
  "categories": ["", "", ""],
  "savedAt": 1785000000000
}
```

### THE RULE THAT KEEPS GETTING BROKEN

**Each entry in `variants` IS the pose map itself.** It is `{"front":[...],"back":[...],...}`.

It is **NOT** `{"angles": {"front": [...]}}`. Wrapping it in an `angles` key produces a file that
imports with a success message and then draws **nothing at all**, in every pose, with no error
anywhere. Three assets were lost to exactly this. Copy the shape above literally.

`angles` at the top level holds the same pose map as `variants[guideId]`. Fill both.

### Slots
`hat`, `jacket`, `shoes`, `shirt`, `pants`, `under_top`, `under_bottom`.
`type` is `"equipment"` for all clothing.

---

## 3. The canvas and the two bodies

The drawing canvas is **200 wide × 260 tall**. x grows right, y grows **down**. The body is
centred on **x = 100**.

There are two bodies. Fit **both** — an asset fitted to only one is useless to me on the other.

| | pose | head box (x, y, w, h) | torso box |
|---|---|---|---|
| **BoB** `telfv37` | front / back / up | 72, 34, 56, 56 | 60, 88, 80, 102 |
| | side | 73, 35, 56, 56 | 60, 88, 80, 102 |
| | crouch | 72, **70**, 56, 50 | 60, 118, 80, 74 |
| **Bobbett** `oipvf3l` | front | 74, 34, 44, 51 | 66, 85, 64, 94 |
| | back / up | 72, 34, 56, 56 | 70, 85, 64, 94 |
| | side | 74, 34, 44, 51 | 69, 85, 58, 94 |
| | crouch | 74, **59**, 49, 48 | 70, 103, 56, 53 |

Practical consequences:

* A head covering should be about **64 wide centred on x=100** — that fits BoB's 56-wide head and
  still reaches Bobbett's narrower one.
* **Crouch is the same art moved down.** BoB: +36 on every y. Bobbett: +25.
* **Aim-up puts the head where Front does**, so Front's art is usually correct for `up` too.
* Arms pivot at the shoulder, around **(146, 86)** on BoB's front pose. Don't put sleeves far from it.

## 4. A piece

```json
{
  "id": "abc123",
  "kind": "rect",
  "x": 68, "y": 40, "w": 12, "h": 52,
  "color": "#3a3d44",
  "mirror": false,
  "fx": { "opacity": 1, "glow": 0, "glowColor": "#ffd76b", "bright": 1 }
}
```

`kind` is one of: `rect`, `roundrect`, `circle`, `stadium`, `halfcircle` (dome, flat side down),
`tri`, `tri2`, `diamond`, `pentagon`, `hexagon`, `star`, `trapezoid`.

Optional: `"rot": 28` (degrees), `"outline": true`.

**`"mirror": true` duplicates the piece reflected about x = 100.** A piece at x=68 w=12 (68–80)
also appears at 120–132. Use it for anything symmetrical — one piece instead of two, and it stays
symmetrical if I edit it later. It is useless for a piece already centred on 100.

**Later pieces draw on top of earlier ones.** Order the list back-to-front.

---

## 5. Style — this is not optional

Look at my Army Hat, which is five pieces:

```
halfcircle 70,12 59×22  #3d4a28     <- crown
tri        61,24 26×16  #3d4a28  mirror   <- brim
rect       81,30 39×10  #3d4a28     <- band
rect       69,31 61×1   #1d1b1b  rot 181  <- one dark edge line
star       93,15 16×15  #c8a23c     <- badge
```

That is the house style. Match it:

* **4–8 pieces per pose.** Not 13. Not 20.
* **One main colour, plus at most one dark accent tone** (`#1d1b1b` or similar) for edges and one
  optional highlight colour for a badge/stripe.
* **No shading. No shadows. No gradients. No lighter/darker tiers of the same colour to fake
  volume.** I don't draw that way and I don't want assisted assets to either. Flat blocks of colour.
* Leave the **face open**. Do not paint a dark shape over where the face is — the skin has to show
  through the gap between pieces. A near-black block where the face goes is the single ugliest
  mistake and it has been made already.
* Don't cover the whole upper body. A hat is a hat.

Existing palette to draw from: `#3d4a28` olive, `#8f3b2e` brick, `#1d1b1b` near-black, `#2b2b2b`
dark grey, `#e2b48c` skin, `#c98f63` skin shadow, `#c8a23c` gold, `#efe9dc` off-white.

---

## 6. All five poses. Every time.

`front`, `back`, `side`, `up`, `crouch` — all five, in all three variants. An asset missing poses
looks broken the moment I turn around or duck.

* **back** — no face opening; the garment is solid from behind. Drop badges and front detail.
* **side** — profile. The art faces **right**. Cloth covers the back of the head/body; the opening
  or the face is on the right.
* **up** — reuse Front.
* **crouch** — Front shifted down (+36 BoB / +25 Bobbett).

It is fine to base an asset on an existing one — but then you must do **all five poses**, not just
the one you copied.

---

## 7. Before you give me the file, check

1. Every `variants` entry is a bare pose map — no `angles` wrapper anywhere inside `variants`.
2. All five pose keys present in `angles` and in all three variants, each an array.
3. `confirmedFits` lists both `telfv37` and `oipvf3l`.
4. Nothing paints over the face.
5. Piece count per pose is single digits.
6. Two or three colours total, no gradient tiers.
7. Crouch really is shifted down, not a copy of Front at the same y.
8. It's valid JSON and the top level has `assetBuilderBackup`, `exportedAt` and `assets`.

---

**Now: build me a `<DESCRIBE THE ITEM HERE>` for the `<SLOT>` slot.**
