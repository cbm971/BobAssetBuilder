// The save keeper's merge rules (src/saveKeeperCore.js). The fixtures are shaped like 2026-09-26:
// two copies of the game that each edited records from the same committed version.
const { merge3, decideSweep, libraryFromStore, sameContent, cloudSnapshot } = require("./saveKeeperCore");

const lvl = (savedAt, extra) => ({ id: "i80q4s6", name: "Trailor Int1", savedAt, section: "", fg: { "1,1": "#111", "2,2": "#222" }, climb: {}, enemies: {}, ...extra });

describe("merge3", () => {
  it("keeps a top-down floor painted in one copy AND a rename made in the other", () => {
    const base = lvl(1);
    const floor = lvl(2, { fg: { "1,1": "#111" }, climb: { "5,5": { kind: "topdown" }, "5,6": { kind: "topdown" } } });
    const named = lvl(3, { section: "Trailor Int" });
    const { record, conflicts } = merge3(base, floor, named);
    expect(record.section).toBe("Trailor Int");
    expect(Object.keys(record.climb)).toEqual(["5,5", "5,6"]);
    expect(record.fg).toEqual({ "1,1": "#111" });            // the cell the floor copy erased stays erased
    expect(conflicts).toEqual([]);
  });
  it("merges one map cell by cell and lets the newer copy win a cell both changed", () => {
    const base = lvl(1);
    const a = lvl(2, { enemies: { "19,59": { enemyId: "pitbull" }, "3,3": { enemyId: "squirrel" } } });
    const b = lvl(3, { enemies: { "19,59": { enemyId: "football" }, "4,4": { enemyId: "chaplin" } } });
    const { record, conflicts } = merge3(base, a, b);
    expect(record.enemies).toEqual({ "19,59": { enemyId: "football" }, "3,3": { enemyId: "squirrel" }, "4,4": { enemyId: "chaplin" } });
    expect(conflicts).toEqual(["enemies (1)"]);
  });
  it("drops savedAt so the caller stamps the merged record", () => {
    expect(merge3(lvl(1), lvl(2), lvl(3)).record.savedAt).toBeUndefined();
  });
});

describe("decideSweep", () => {
  // History as the keeper holds it: [version, the copy that wrote it]. baseFor only ever answers
  // with a version from the SAME copy or the committed file, exactly as SaveFolder.baseFrom does.
  const history = (entries, src) => ({
    seen: (at) => entries.some(([v]) => v.savedAt === at),
    baseFor: (at) => (entries.filter(([v, s]) => v.savedAt < at && (s === src || s === "repo")).sort((x, y) => y[0].savedAt - x[0].savedAt)[0] || [null])[0],
  });
  it("takes a record the folder has never had", () => {
    expect(decideSweep({ inc: lvl(5), cur: null, ...history([], "A") }).action).toBe("take");
  });
  it("does not bring back a record deleted from the folder, but keeps the copy in History", () => {
    expect(decideSweep({ inc: lvl(5), cur: null, deleted: true, ...history([], "A") }).action).toBe("keep");
  });
  it("ignores load noise: same savedAt, different bytes", () => {
    const cur = lvl(5), inc = { ...lvl(5), fg: { "1,1": "#111", "2,2": "#222", _src: "x" } };
    expect(decideSweep({ inc, cur, curSource: "repo", source: "A", ...history([[cur, "repo"]], "A") }).action).toBe("none");
  });
  it("ignores a version History already holds (a stale copy, not an edit)", () => {
    const old = lvl(2), cur = lvl(5, { section: "x" });
    expect(decideSweep({ inc: old, cur, curSource: "desktop", source: "A", ...history([[old, "repo"], [cur, "desktop"]], "A") }).action).toBe("none");
  });
  it("lets a copy's newer save replace the committed version it started from", () => {
    const cur = lvl(1);
    expect(decideSweep({ inc: lvl(2, { section: "y" }), cur, curSource: "repo", source: "A", ...history([[cur, "repo"]], "A") }).action).toBe("take");
  });
  it("lets a copy continue its own work", () => {
    const cur = lvl(2, { section: "y" });
    expect(decideSweep({ inc: lvl(3, { section: "z" }), cur, curSource: "A", source: "A", ...history([[lvl(1), "repo"], [cur, "A"]], "A") }).action).toBe("take");
  });
  it("COMBINES two copies that each edited from the same version (the 2026-09-26 case)", () => {
    const base = lvl(1);
    const b = lvl(2, { climb: { "5,5": { kind: "topdown" } } });        // copy B, swept first
    const a = lvl(3, { section: "Trailor Int" });                       // copy A, started from base
    const d = decideSweep({ inc: a, cur: b, curSource: "B", source: "A", ...history([[base, "repo"], [b, "B"]], "A") });
    expect(d.action).toBe("combine");
    expect(d.record.section).toBe("Trailor Int");
    expect(d.record.climb).toEqual({ "5,5": { kind: "topdown" } });
  });
  it("combines an OLDER edit from another copy too, instead of dropping it", () => {
    const base = lvl(1);
    const desk = lvl(5, { section: "Trailor Int" });
    const online = lvl(3, { climb: { "5,5": { kind: "topdown" } } });
    const d = decideSweep({ inc: online, cur: desk, curSource: "desktop", source: "A", ...history([[base, "repo"], [desk, "desktop"]], "A") });
    expect(d.action).toBe("combine");
    expect(d.record.section).toBe("Trailor Int");
    expect(d.record.climb).toEqual({ "5,5": { kind: "topdown" } });
  });
  it("never uses the desktop's own earlier save as the other copy's starting point", () => {
    // desktop saved at 2 and 5; the online copy edited at 3 FROM the committed version (1). With
    // the desktop's 2 as the base, the desktop's own change at 2 would read as something the
    // online copy undid, and be reverted.
    const base = lvl(1), d2 = lvl(2, { section: "desk" }), d5 = lvl(5, { section: "desk", name: "Renamed" });
    const online = lvl(3, { climb: { "5,5": { kind: "topdown" } } });
    const d = decideSweep({ inc: online, cur: d5, curSource: "desktop", source: "A", ...history([[base, "repo"], [d2, "desktop"], [d5, "desktop"]], "A") });
    expect(d.action).toBe("combine");
    expect(d.record.section).toBe("desk");
    expect(d.record.name).toBe("Renamed");
    expect(d.record.climb).toEqual({ "5,5": { kind: "topdown" } });
  });
  it("never merges an OLD copy from before the keeper existed — it is an ancestor, kept in History", () => {
    const base = lvl(1), anc = lvl(2, { section: "old" }), cur = lvl(50, { section: "new", climb: { "1,1": { kind: "topdown" } } });
    expect(decideSweep({ inc: anc, cur, curSource: "repo", source: "old copy", epoch: 40, ...history([[base, "repo"], [cur, "repo"]], "old copy") }).action).toBe("keep");
    // ...but an old copy holding something NEWER than the folder is unsaved work, and comes in
    expect(decideSweep({ inc: lvl(60, { section: "unsaved" }), cur, curSource: "repo", source: "old copy", epoch: 40, ...history([[base, "repo"], [cur, "repo"]], "old copy") }).action).toBe("take");
  });
  it("with no common version, a newer copy wins and an older one goes to History only", () => {
    const cur = lvl(5, { section: "x" });
    expect(decideSweep({ inc: lvl(9, { section: "y" }), cur, curSource: "desktop", source: "A", ...history([[cur, "desktop"]], "A") }).action).toBe("take");
    expect(decideSweep({ inc: lvl(3, { section: "y" }), cur, curSource: "desktop", source: "A", ...history([[cur, "desktop"]], "A") }).action).toBe("keep");
  });
});

describe("libraryFromStore", () => {
  it("reads every kind and the deleted list, skipping what will not parse", () => {
    const lib = libraryFromStore([
      { key: "asset:a1", value: JSON.stringify({ id: "a1", name: "DK Arms" }) },
      { key: "level:l1", value: JSON.stringify({ id: "l1" }) },
      { key: "dialogue:d1", value: JSON.stringify({ id: "d1" }) },
      { key: "asset:bad", value: "{not json" },
      { key: "assetIndex", value: "[]" },
      { key: "removedIndex", value: JSON.stringify({ assets: ["gone"] }) },
    ]);
    expect(lib.assets.map((a) => a.id)).toEqual(["a1"]);
    expect(lib.levels.map((a) => a.id)).toEqual(["l1"]);
    expect(lib.dialogues.map((a) => a.id)).toEqual(["d1"]);
    expect(lib.removed.assets).toEqual(["gone"]);
    expect(lib.removed.levels).toEqual([]);
  });
  it("sameContent ignores only savedAt", () => {
    expect(sameContent({ id: 1, savedAt: 1 }, { id: 1, savedAt: 2 })).toBe(true);
    expect(sameContent({ id: 1, a: 1 }, { id: 1, a: 2 })).toBe(false);
  });
});

describe("cloudSnapshot", () => {
  // The online copy every copy of the game opens on (the saves branch). It must be the same text for
  // the same folder, whatever order the records were read in, or the keeper would push every minute
  // and git would store a fresh 20 MB blob each time instead of a small delta.
  it("is sorted, stable and carries no timestamp", () => {
    const a = { assets: [{ id: "b", savedAt: 2 }, { id: "a", savedAt: 1 }], levels: [{ id: "L" }], removed: { assets: ["z", "y", "z"] } };
    const b = { levels: [{ id: "L" }], assets: [{ id: "a", savedAt: 1 }, { id: "b", savedAt: 2 }], removed: { assets: ["y", "z"] } };
    expect(cloudSnapshot(a)).toBe(cloudSnapshot(b));
    const out = JSON.parse(cloudSnapshot(a));
    expect(out.assets.map((r) => r.id)).toEqual(["a", "b"]);
    expect(out.removed.assets).toEqual(["y", "z"]);
    expect(out.savedAt).toBeNull();
    expect(out.stamps).toEqual([]);
    expect(out.removed.levels).toEqual([]);
    expect(JSON.parse(cloudSnapshot(null)).assets).toEqual([]);
  });
  it("drops records without an id and never edits what it was given", () => {
    const lib = { assets: [{ id: "a" }, null, { name: "no id" }] };
    const before = JSON.stringify(lib);
    expect(JSON.parse(cloudSnapshot(lib)).assets).toEqual([{ id: "a" }]);
    expect(JSON.stringify(lib)).toBe(before);
  });
});
