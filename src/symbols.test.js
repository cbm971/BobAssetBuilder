// SYMBOLS (2026-10-14): the interface's emoji drawn as picked symbols by a font the app builds
// (src/symbols.js), and the score rules that shipped with the new play HUD (App.js, SCORE).
import fs from "fs";
import path from "path";
import {
  SYMBOL_SLOTS, SYMBOL_DEFAULT_ART, SYMBOL_BOARD_ID, newSymbolBoard, isSymbolBoard, symbolSlot, symbolPick,
  symbolPicksNeedingLibrary, emojiKeysIn, PROP_PICK, isPropPick, propPickId, symbolColor, isEmojiSlot, symbolPathCmds, symbolContours, buildSymbolFont, symbolFontGlyphs,
} from "./symbols";
import {
  SCORE_KILL, SCORE_LEVEL_CLEAR, newScoreState, levelClearPoints, scoreLevelClear, scoreDialogueChoice, scoreDigits,
  migrateDialogue,
} from "./App";
import { isSoundRecord, isSoundBoard } from "./audio";

// The interface's own text: App.js and audio.js minus comment lines, and minus the emoji picker's
// keyword table (EMOJI_KEYWORDS), which lists emoji to DRAW with — art, not interface.
const uiSource = () => {
  const app = fs.readFileSync(path.join(__dirname, "App.js"), "utf8");
  const start = app.indexOf("const EMOJI_KEYWORDS = {");
  const end = app.indexOf("\n};", start);
  const appUi = app.slice(0, start) + app.slice(end);
  const audio = fs.readFileSync(path.join(__dirname, "audio.js"), "utf8");
  const code = (s) => s.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  return code(appUi) + "\n" + code(audio);
};

describe("symbol slots", () => {
  test("every emoji the interface uses has a slot (a new one must be added to symbolSlots.json)", () => {
    const keys = new Set(SYMBOL_SLOTS.map((s) => s.k));
    const missing = [...emojiKeysIn(uiSource())].filter((ch) => !keys.has(ch));
    expect(missing).toEqual([]);
  });
  test("slot keys are unique, and an emoji slot is ONE character the font can map", () => {
    const keys = SYMBOL_SLOTS.map((s) => s.k);
    expect(new Set(keys).size).toBe(keys.length);
    for (const s of SYMBOL_SLOTS) {
      expect(typeof s.l).toBe("string");
      expect(typeof s.g).toBe("string");
      if (isEmojiSlot(s.k)) expect([...s.k].length).toBe(1);
    }
  });
  test("every default is in the shipped art, so the font never waits for the library", () => {
    const missing = SYMBOL_SLOTS.filter((s) => !SYMBOL_DEFAULT_ART[s.d]).map((s) => s.k + " " + s.d);
    expect(missing).toEqual([]);
  });
  test("the HUD's own slots exist", () => {
    for (const k of ["stat.hp", "stat.atk", "stat.def", "stat.str", "stat.agi", "stat.spd", "stat.int", "hud.life", "hud.throw", "ui.symbols"]) expect(symbolSlot(k)).toBeTruthy();
  });
});

describe("the symbol board", () => {
  test("a pick wins, a missing or blank one falls back to the default", () => {
    const b = { ...newSymbolBoard(), picks: { "💾": "gi:save", "⚠": "" } };
    expect(symbolPick(b, "💾")).toBe("gi:save");
    expect(symbolPick(b, "⚠")).toBe(symbolSlot("⚠").d);
    expect(symbolPick(null, "stat.str")).toBe(symbolSlot("stat.str").d);
  });
  test("only picks outside the shipped art make the app fetch the library", () => {
    expect(symbolPicksNeedingLibrary(newSymbolBoard())).toEqual([]);
    expect(symbolPicksNeedingLibrary({ ...newSymbolBoard(), picks: { "💾": "gi:not-shipped-thing" } })).toEqual(["gi:not-shipped-thing"]);
  });
  test("a drawn slot can hold a PROP; the font never fetches for one and falls back to the default", () => {
    const b = { ...newSymbolBoard(), picks: { "fx.boom": PROP_PICK + "abc123", "💾": PROP_PICK + "abc123" } };
    expect(isPropPick(symbolPick(b, "fx.boom"))).toBe(true);
    expect(propPickId(symbolPick(b, "fx.boom"))).toBe("abc123");
    expect(symbolPicksNeedingLibrary(b)).toEqual([]);
    // the font draws the emoji slot's DEFAULT for a prop pick (a glyph cannot be a prop)
    const save = symbolFontGlyphs(b, SYMBOL_DEFAULT_ART).find((g) => g.cp === "💾".codePointAt(0));
    expect(save.d).toBe(SYMBOL_DEFAULT_ART[symbolSlot("💾").d]);
  });
  test("the effects are slots, each with its own colour; a board colour wins, a bad one does not", () => {
    for (const k of ["fx.boom", "fx.fire", "fx.shot", "fx.stun", "fx.down", "fx.talk"]) { expect(symbolSlot(k)).toBeTruthy(); expect(isEmojiSlot(k)).toBe(false); }
    expect(symbolColor(newSymbolBoard(), "fx.boom")).toBe(symbolSlot("fx.boom").c);
    expect(symbolColor({ colors: { "fx.boom": "#00ff00" } }, "fx.boom")).toBe("#00ff00");
    expect(symbolColor({ colors: { "fx.boom": "red; x" } }, "fx.boom")).toBe(symbolSlot("fx.boom").c);
    expect(symbolColor(newSymbolBoard(), "stat.str")).toBe(null);
  });
  test("it rides the sounds kind without being taken for a sound or the sound board", () => {
    const b = newSymbolBoard();
    expect(b.id).toBe(SYMBOL_BOARD_ID);
    expect(isSymbolBoard(b)).toBe(true);
    expect(isSoundRecord(b)).toBe(false);
    expect(isSoundBoard(b)).toBe(false);
  });
});

describe("the symbol font", () => {
  test("the path dialect reads back as absolute points", () => {
    expect(symbolPathCmds("m10 20l5-5c1 1 2 2 3 3z")).toEqual([
      { type: "M", x: 10, y: 20 }, { type: "L", x: 15, y: 15 },
      { type: "C", x1: 16, y1: 16, x2: 17, y2: 17, x: 18, y: 18 }, { type: "Z" },
    ]);
  });
  test("a square becomes one closed contour, y flipped to font space", () => {
    const c = symbolContours("m0 0l1000 0l0 1000l-1000 0z");
    expect(c.length).toBe(1);
    expect(c[0].length).toBe(4);
    expect(c[0].every((p) => p.on)).toBe(true);
    const ys = c[0].map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(1000);
  });
  // Reads the table directory and the format-12 cmap back out of the bytes.
  const readFont = (u8) => {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const n = dv.getUint16(4);
    const tables = {};
    for (let i = 0; i < n; i++) {
      const o = 12 + i * 16;
      const tag = String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3]);
      tables[tag] = { off: dv.getUint32(o + 8), len: dv.getUint32(o + 12) };
    }
    const cm = tables.cmap.off, recs = dv.getUint16(cm + 2), map = new Map();
    for (let r = 0; r < recs; r++) {
      const plat = dv.getUint16(cm + 4 + r * 8), enc = dv.getUint16(cm + 6 + r * 8), sub = cm + dv.getUint32(cm + 8 + r * 8);
      if (plat === 3 && enc === 10) {
        const groups = dv.getUint32(sub + 12);
        for (let g = 0; g < groups; g++) { const s = dv.getUint32(sub + 16 + g * 12), e = dv.getUint32(sub + 20 + g * 12), gid = dv.getUint32(sub + 24 + g * 12); for (let c = s; c <= e; c++) map.set(c, gid + c - s); }
      }
    }
    return { dv, tables, map, tags: Object.keys(tables) };
  };
  test("the default board builds a font that maps every emoji slot and carries the colour table", () => {
    const glyphs = symbolFontGlyphs(newSymbolBoard(), SYMBOL_DEFAULT_ART);
    const u8 = buildSymbolFont(glyphs);
    const { dv, tables, map, tags } = readFont(u8);
    expect(dv.getUint32(0)).toBe(0x00010000);
    for (const t of ["OS/2", "COLR", "CPAL", "cmap", "glyf", "head", "hhea", "hmtx", "loca", "maxp", "name", "post"]) expect(tags).toContain(t);
    expect([...tags]).toEqual([...tags].sort());
    for (const s of SYMBOL_SLOTS.filter((x) => isEmojiSlot(x.k))) expect(map.get(s.k.codePointAt(0))).toBeGreaterThan(0);
    // Every drawn glyph is a COLR base glyph (that is what keeps "⚔️" off the colour emoji font).
    expect(dv.getUint16(tables.COLR.off + 2)).toBe(glyphs.length);
    // The whole-font checksum the head table promises.
    let sum = 0;
    for (let i = 0; i < u8.length; i += 4) sum = (sum + dv.getUint32(i)) >>> 0;
    expect(sum).toBe(0xB1B0AFBA);
  });
});

describe("score", () => {
  test("a level is 500, less 10 a whole second after 30, never below 0", () => {
    expect(SCORE_LEVEL_CLEAR).toBe(500);
    expect(levelClearPoints(0)).toBe(500);
    expect(levelClearPoints(30)).toBe(500);
    expect(levelClearPoints(30.9)).toBe(500);
    expect(levelClearPoints(31)).toBe(490);
    expect(levelClearPoints(45.5)).toBe(350);
    expect(levelClearPoints(80)).toBe(0);
    expect(levelClearPoints(500)).toBe(0);
  });
  test("a level pays once; a dialogue option pays once; a kill is 100", () => {
    expect(SCORE_KILL).toBe(100);
    const sc = newScoreState();
    sc.secs.a = 40;
    expect(scoreLevelClear(sc, "a")).toBe(400);
    expect(scoreLevelClear(sc, "a")).toBe(0);
    expect(scoreDialogueChoice(sc, "tree|c1", 250)).toBe(250);
    expect(scoreDialogueChoice(sc, "tree|c1", 250)).toBe(0);
    expect(scoreDialogueChoice(sc, "tree|c2", 0)).toBe(0);
    expect(sc.total).toBe(650);
  });
  test("the HUD's seven digits", () => {
    expect(scoreDigits(2480)).toBe("0002480");
    expect(scoreDigits(-5)).toBe("0000000");
    expect(scoreDigits(123456789)).toBe("9999999");
  });
  test("a dialogue option keeps its points, and a tree without any comes through unchanged", () => {
    const raw = { id: "d", name: "D", start: "n1", nodes: { n1: { id: "n1", speaker: "", text: "hi", choices: [{ id: "c1", text: "a", to: "", act: "", tone: "", shopTag: "", points: 150 }, { id: "c2", text: "b", to: "", act: "", tone: "", shopTag: "" }] } } };
    const d = migrateDialogue(raw);
    expect(d.nodes.n1.choices[0].points).toBe(150);
    expect("points" in d.nodes.n1.choices[1]).toBe(false);
    expect(migrateDialogue(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });
});
