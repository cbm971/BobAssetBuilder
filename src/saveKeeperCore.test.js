// The save keeper's merge rules (src/saveKeeperCore.js). The fixtures are shaped like 2026-09-26:
// two copies of the game that each edited records from the same committed version.
const { gameStorageKey, merge3, decideSweep, libraryFromStore, sameContent, cloudSnapshot, reconcileRemovedAt } = require("./saveKeeperCore");

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

  // Sewer M1, 2026-10-10, from his real History: the committed version had no Front at all, a
  // second copy painted a pillar (folder = "combined"), then his new StackBlitz address loaded that
  // from the online save, deleted the pillar and painted a curve. The guessed base (the committed
  // file) had no pillar, so the deletion read as "no change" and the pillar came back — every save.
  const sewer = () => {
    const repo = lvl(1, { front: {} });
    const cur = lvl(5, { front: { "10,44": "#555", "11,44": "#555", "3,3": "#777" } });
    const mine = lvl(9, { front: { "3,3": "#777", "20,50": { c: "#555", slope: "tl" } }, editedFrom: 5 });
    const hist = [[repo, "repo"], [cur, "combined"]];
    return { repo, cur, mine, hist, at: (t) => (hist.find(([v]) => v.savedAt === t) || [null])[0] };
  };
  it("the guessed base brings a deleted cell back (why editedFrom exists)", () => {
    const { cur, mine, hist } = sewer();
    const { editedFrom, ...old } = mine;   // a save from before editedFrom: the guess is all there is
    const d = decideSweep({ inc: old, cur, curSource: "combined", source: "B", ...history(hist, "B") });
    expect(d.action).toBe("combine");
    expect(d.record.front["10,44"]).toBe("#555");
  });
  it("a save edited FROM the folder's current version simply replaces it: deleted stays deleted", () => {
    const { cur, mine, hist, at } = sewer();
    const d = decideSweep({ inc: mine, cur, curSource: "combined", source: "B", ...history(hist, "B"), baseAt: at });
    expect(d.action).toBe("take");
  });
  it("a save edited from an OLDER version merges against exactly that version", () => {
    const { cur, mine, hist, at } = sewer();
    // Another copy saved over cur (adding an enemy) while his copy was still editing version 5.
    const other = lvl(7, { front: cur.front, enemies: { "4,4": { enemyId: "rat" } } });
    const d = decideSweep({ inc: mine, cur: other, curSource: "C", source: "B", ...history([...hist, [other, "C"]], "B"), baseAt: at });
    expect(d.action).toBe("combine");
    expect(d.record.front).toEqual({ "3,3": "#777", "20,50": { c: "#555", slope: "tl" } });   // his deletion AND his curve
    expect(d.record.enemies).toEqual({ "4,4": { enemyId: "rat" } });                         // the other copy's enemy
    expect(d.record.editedFrom).toBeUndefined();
  });
  it("falls back to the old guess when History does not hold the version it names", () => {
    const { cur, mine, hist } = sewer();
    const d = decideSweep({ inc: { ...mine, editedFrom: 4 }, cur, curSource: "combined", source: "B", ...history(hist, "B"), baseAt: () => null });
    expect(d.action).toBe("combine");
  });

  // Tree Int 2, 2026-10-24, from his real History: the tab saved at 8:28 with nothing new in it
  // (editedFrom a save the keeper never saw, so the base is the guess). The merge equals the
  // folder's combined version. Kept in History only, the folder stayed older than the tab's save
  // and the tab's "⚠ Not backed up" banner never cleared.
  it("a NEWER save with nothing the folder lacks is combined (stamped newer), not just kept", () => {
    const mine1 = lvl(10, { climb: { "1,1": { kind: "topdown" } } });
    const cur = lvl(11, { climb: { "1,1": { kind: "topdown" }, "17,33": { kind: "topdown" } } });
    const again = lvl(12, { climb: { "1,1": { kind: "topdown" } }, editedFrom: 11.5 });
    const d = decideSweep({ inc: again, cur, curSource: "combined", source: "A", ...history([[mine1, "A"], [cur, "combined"]], "A"), baseAt: () => null });
    expect(d.action).toBe("combine");
    expect(d.record.climb).toEqual(cur.climb);   // the folder's content, nothing lost from either side
    // the same through an exact editedFrom
    const viaExact = decideSweep({ inc: { ...again, editedFrom: 10 }, cur, curSource: "combined", source: "A", ...history([[mine1, "A"], [cur, "combined"]], "A"), baseAt: (t) => (t === 10 ? mine1 : null) });
    expect(viaExact.action).toBe("combine");
    // an OLDER copy that adds nothing is still only kept
    expect(decideSweep({ inc: lvl(10.5, { climb: { "1,1": { kind: "topdown" } } }), cur, curSource: "combined", source: "A", ...history([[mine1, "A"], [cur, "combined"]], "A") }).action).toBe("keep");
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
  it("carries the date of each delete still on the list, in a stable order", () => {
    const lib = { assets: [{ id: "a" }], removed: { assets: ["z", "y"] } };
    const out = JSON.parse(cloudSnapshot(lib, { assets: { y: 2, z: 1, gone: 9 }, levels: { q: 3 } }));
    expect(out.removedAt.assets).toEqual({ y: 2, z: 1 });          // not "gone": no longer deleted
    expect(Object.keys(out.removedAt.assets)).toEqual(["y", "z"]);
    expect(out.removedAt.levels).toEqual({});
    expect(cloudSnapshot(lib, { assets: { z: 1, y: 2 } })).toBe(cloudSnapshot({ removed: { assets: ["y", "z"] }, assets: [{ id: "a" }] }, { assets: { y: 2, z: 1 } }));
    expect(JSON.parse(cloudSnapshot(lib)).removedAt).toBeUndefined();   // no dates given: the old shape
  });
  it("reconcileRemovedAt dates a delete when first seen, keeps it, and forgets a revived id", () => {
    const first = reconcileRemovedAt(null, { assets: ["a", "b"] }, 100);
    expect(first.assets).toEqual({ a: 100, b: 100 });
    const next = reconcileRemovedAt(first, { assets: ["b", "c"], levels: ["L"] }, 200);
    expect(next.assets).toEqual({ b: 100, c: 200 });                  // a revived, b kept its date, c is new
    expect(next.levels).toEqual({ L: 200 });
    const again = reconcileRemovedAt(next, { assets: ["a", "b", "c"], levels: ["L"] }, 300);
    expect(again.assets.a).toBe(300);                                 // deleted again: a fresh date
    expect(JSON.stringify(reconcileRemovedAt(again, { assets: ["a", "b", "c"], levels: ["L"] }, 400))).toBe(JSON.stringify(again)); // nothing new: same
  });
  it("drops records without an id and never edits what it was given", () => {
    const lib = { assets: [{ id: "a" }, null, { name: "no id" }] };
    const before = JSON.stringify(lib);
    expect(JSON.parse(cloudSnapshot(lib)).assets).toEqual([{ id: "a" }]);
    expect(JSON.stringify(lib)).toBe(before);
  });
});

describe("gameStorageKey", () => {
  // 2026-10-17: saves made in StackBlitz's editor view sat in a partitioned store the sweep never read.
  it("finds the game embedded in StackBlitz and on its own", () => {
    expect(gameStorageKey("https://bobassetbuilder-hzer--3000--2ed8f36d.local-credentialless.webcontainer.io/^0https://stackblitz.com")).toEqual({ host: "bobassetbuilder-hzer--3000--2ed8f36d.local-credentialless.webcontainer.io", top: "stackblitz.com" });
    expect(gameStorageKey("https://cbm971.github.io/")).toEqual({ host: "cbm971.github.io", top: "" });
  });
  it("ignores everything else, localhost included", () => {
    expect(gameStorageKey("https://www.youtube.com/^0https://google.com")).toBeNull();
    expect(gameStorageKey("http://localhost:47017/")).toBeNull();
    expect(gameStorageKey("https://stackblitz.com/")).toBeNull();
    expect(gameStorageKey(null)).toBeNull();
  });
});
