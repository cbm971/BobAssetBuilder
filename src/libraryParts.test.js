/* The library as an index + parts (libraryParts.js, libraryFiles.js). */
const fs = require("fs");
const os = require("os");
const path = require("path");
const P = require("./libraryParts");
const F = require("./libraryFiles");

const rec = (id, n = 10) => ({ id, name: "Thing " + id, savedAt: 1000 + id.length, frames: [{ front: Array.from({ length: n }, (_, i) => ({ id: id + i, kind: "rect", x: i, y: i * 2, w: 5, h: 5, color: "#123456", text: "é ¢ \"q\" \\ " + i })) }] });
const lib = (na = 30, nl = 5) => ({
  savedAt: null,
  assets: Array.from({ length: na }, (_, i) => rec("a" + i, 5 + (i % 7))),
  levels: Array.from({ length: nl }, (_, i) => ({ id: "l" + i, fg: { "1,2": { c: "#fff" } }, savedAt: 5 })),
  stamps: [], textures: [{ id: "t1" }], backgrounds: [], dialogues: [{ id: "d1", tree: [] }], sounds: [],
  removed: { assets: ["gone1"] },
  removedAt: { assets: { gone1: 123 } },
});
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "bob-lib-"));

describe("libraryParts: the library as an index + parts", () => {
  test("round-trips every record, in order, with the other sections on the index", () => {
    const L = lib();
    const s = P.splitLibrary(L, "library.json", { maxChars: 4000 });
    expect(s.parts.length).toBeGreaterThan(3);
    const index = JSON.parse(s.index);
    expect(P.isPartsIndex(index)).toBe(true);
    expect(index.parts).toEqual(s.parts.map((p, i) => "library." + (i + 1) + ".json"));
    expect(index.assets).toBeUndefined();   // an older reader sees no records rather than half of them
    const back = P.assembleLibrary(index, s.parts.map((p) => JSON.parse(p.text)));
    for (const k of P.LIBRARY_KINDS) expect(back[k]).toEqual(L[k]);
    expect(back.removed).toEqual(L.removed);
    expect(back.removedAt).toEqual(L.removedAt);
  });
  test("each part prints exactly as JSON.stringify(part, null, 1) would", () => {
    const s = P.splitLibrary(lib(), "library.json", { maxChars: 4000 });
    for (const p of s.parts) expect(p.text).toBe(JSON.stringify(JSON.parse(p.text), null, 1));
  });
  test("no part is over the cap unless a single record is", () => {
    const max = 3000;
    const s = P.splitLibrary(lib(60), "library.json", { maxChars: max });
    for (const p of s.parts) {
      const d = JSON.parse(p.text), n = P.LIBRARY_KINDS.reduce((t, k) => t + (d[k] || []).length, 0);
      if (n > 1) expect(p.text.length).toBeLessThanOrEqual(max + 200);
    }
  });
  test("the default cap keeps every part a fifth of GitHub's 100 MB limit", () => {
    expect(P.PART_MAX_CHARS).toBeLessThanOrEqual(20 * 1000 * 1000);
  });
  test("the same library gives the same files; one changed record changes the set", () => {
    const a = P.splitLibrary(lib(), "library.json", { maxChars: 4000 }), b = P.splitLibrary(lib(), "library.json", { maxChars: 4000 });
    expect(b.index).toBe(a.index);
    expect(b.parts.map((p) => p.text)).toEqual(a.parts.map((p) => p.text));
    const L = lib(); L.assets[3] = { ...L.assets[3], name: "renamed" };
    expect(P.splitLibrary(L, "library.json", { maxChars: 4000 }).set).not.toBe(a.set);
  });
  test("parts from two different saves are refused, not mixed", () => {
    const a = P.splitLibrary(lib(), "library.json", { maxChars: 4000 });
    const L = lib(); L.assets[0] = { ...L.assets[0], name: "newer" };
    const b = P.splitLibrary(L, "library.json", { maxChars: 4000 });
    const mixed = [JSON.parse(b.parts[0].text), ...a.parts.slice(1).map((p) => JSON.parse(p.text))];
    expect(() => P.assembleLibrary(JSON.parse(a.index), mixed)).toThrow();
    expect(() => P.assembleLibrary(JSON.parse(a.index), a.parts.slice(1).map((p) => JSON.parse(p.text)))).toThrow();
    expect(() => P.assembleLibrary(JSON.parse(a.index), [...a.parts.map((p) => JSON.parse(p.text)).slice(0, -1), null])).toThrow();
  });
  test("an old one-file library reads as it is", () => {
    const L = lib();
    expect(P.loadLibrary((n) => (n === "library.json" ? L : null))).toBe(L);
  });
  test("a part name that leaves the folder is refused", () => {
    const index = { format: P.PARTS_FORMAT, set: "x", parts: ["../../secret.json"] };
    expect(() => P.loadLibrary(() => index)).toThrow();
    expect(P.safePartName("library.3.json")).toBe(true);
    expect(P.safePartName("a/b.json")).toBe(false);
  });
  test("part names follow the index name and never catch another file's parts", () => {
    expect(P.partName("library.bak.json", 2)).toBe("library.bak.2.json");
    expect(P.isPartOf("library.json", "library.12.json")).toBe(true);
    expect(P.isPartOf("library.json", "library.bak.1.json")).toBe(false);
    expect(P.isPartOf("library-2026-11-17.json", "library-2026-11-17.1.json")).toBe(true);
  });
  test("async read through fetch-like calls", async () => {
    const s = P.splitLibrary(lib(), "library.json", { maxChars: 4000 });
    const files = { "library.json": s.index, ...Object.fromEntries(s.parts.map((p) => [p.name, p.text])) };
    const back = await P.loadLibraryAsync(async (n) => (files[n] ? JSON.parse(files[n]) : null));
    expect(back.assets).toEqual(lib().assets);
  });
});

describe("libraryFiles: on disk", () => {
  test("write, read back, and a smaller library clears its leftover parts", () => {
    const dir = tmpDir(), file = path.join(dir, "library.json");
    F.writeLibraryFile(file, lib(60), { maxChars: 3000 });
    const many = fs.readdirSync(dir).filter((f) => P.isPartOf("library.json", f)).length;
    expect(F.readLibraryFile(file).assets).toEqual(lib(60).assets);
    expect(F.libraryFilesConsistent(file)).toBe(true);
    F.writeLibraryFile(file, lib(3), { maxChars: 3000 });
    const few = fs.readdirSync(dir).filter((f) => P.isPartOf("library.json", f)).length;
    expect(few).toBeLessThan(many);
    expect(F.readLibraryFile(file).assets).toEqual(lib(3).assets);
  });
  test("a copy under another name reads the same and keeps the original's files apart", () => {
    const dir = tmpDir(), file = path.join(dir, "library.json"), bak = path.join(dir, "library.bak.json");
    F.writeLibraryFile(file, lib(40), { maxChars: 3000 });
    F.copyLibraryFiles(file, bak);
    expect(F.readLibraryFile(bak)).toEqual(F.readLibraryFile(file));
    expect(JSON.parse(fs.readFileSync(bak, "utf8")).parts.every((n) => n.startsWith("library.bak."))).toBe(true);
    F.writeLibraryFile(file, lib(2), { maxChars: 3000 });
    expect(F.readLibraryFile(bak).assets).toEqual(lib(40).assets);
  });
  test("a write cut off between the parts and the index is detected", () => {
    const dir = tmpDir(), file = path.join(dir, "library.json");
    F.writeLibraryFile(file, lib(40), { maxChars: 3000 });
    const L = lib(40); L.assets[0] = { ...L.assets[0], name: "newer" };
    const s = P.splitLibrary(L, "library.json", { maxChars: 3000 });
    fs.writeFileSync(path.join(dir, s.parts[0].name), s.parts[0].text);   // the parts went out, the index never did
    expect(F.libraryFilesConsistent(file)).toBe(false);
    expect(() => F.readLibraryFile(file)).toThrow();
  });
  test("an old one-file library still reads, copies and checks", () => {
    const dir = tmpDir(), file = path.join(dir, "library.json");
    fs.writeFileSync(file, JSON.stringify(lib(), null, 1));
    expect(F.readLibraryFile(file).assets).toEqual(lib().assets);
    expect(F.libraryFilesConsistent(file)).toBe(true);
    F.copyLibraryFiles(file, path.join(dir, "library.bak.json"));
    expect(F.readLibraryFile(path.join(dir, "library.bak.json")).assets).toEqual(lib().assets);
  });
});

describe("the committed library", () => {
  test("asset-data/library.json reads whole and no file of it is near GitHub's limits", () => {
    const file = path.join(__dirname, "..", "asset-data", "library.json");
    const L = F.readLibraryFile(file);
    expect(L.assets.length).toBeGreaterThan(100);
    expect(F.libraryFilesConsistent(file)).toBe(true);
    for (const f of [...F.libraryFileNames(file), ...F.libraryFileNames(path.join(__dirname, "..", "asset-data", "library.bak.json"))]) expect(fs.statSync(f).size).toBeLessThan(45 * 1000 * 1000);
  });
});
