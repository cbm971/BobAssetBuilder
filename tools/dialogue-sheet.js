#!/usr/bin/env node
// BOB'S SPOKEN TEXT AS AN EXCEL SHEET BLAKE CORRECTS, AND BACK AGAIN (2026-11-28).
//
//   node tools/dialogue-sheet.js export LIB.json OUT.xlsx [--carry OLD.xlsx]
//   node tools/dialogue-sheet.js import LIB.json SHEET.xlsx OUT.json
//
// --carry brings his edits and notes from an older sheet (any layout) into the new one.
//
// LIB.json is the whole library as one object ({ assets, levels, dialogues, ... }): read the
// `saves` branch (his newest online copy) with src/libraryParts.js loadLibrary and write it out.
// OUT.json holds only the records the sheet changed, each with a new savedAt and `editedFrom` set
// to the version it was edited from, ready for `node tools/library.js add OUT.json`.
//
// What goes in: every conversation (speaker lines and the player's answers, in the order they are
// reached from the start), the objective text on level markers, and the cutscenes' button prompts
// and text layers. Answers that are only "..." or a digit (continue buttons, the Bridge Troll's
// joke numbers) are left out: there is nothing in them to correct. Text drawn into art is not here.
//
// The sheet carries a hidden `_orig` tab with every line as it was exported. Import changes a line
// only where the sheet differs from `_orig`, and refuses one whose library copy has changed since
// the export (edited in the game in between), so a sheet that sat for a week cannot undo newer work.
// A line emptied in the sheet is reported, never blanked. Notes come back as a list.
//
// No packages: an .xlsx is a zip of XML, written and read here with zlib.
"use strict";
const fs = require("fs");
const zlib = require("zlib");

// ---------- zip ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const zip = (files) => {
  const out = [], central = []; let off = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8"), raw = Buffer.from(f.data, "utf8"), comp = zlib.deflateRawSync(raw), crc = crc32(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(0, 10); lh.writeUInt16LE(33, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(0, 12); ch.writeUInt16LE(33, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    out.push(lh, name, comp); central.push(ch, name); off += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...out, cd, end]);
};
const unzip = (buf) => {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error("not a zip (no end record): is this an .xlsx?");
  const n = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16); const files = {};
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("bad zip directory");
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), lho = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28), data = buf.subarray(start, start + csize);
    files[name.replace(/^\/+/, "")] = method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data);
    p += 46 + nlen + elen + clen;
  }
  return files;
};

// ---------- xml ----------
const esc = (s) => String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const unesc = (s) => s.replace(/_x([0-9a-fA-F]{4})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const attr = (tag, name) => { const m = tag.match(new RegExp("\\s" + name + "=\"([^\"]*)\"")); return m ? unesc(m[1]) : null; };
const runText = (x) => { let s = ""; x.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").replace(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g, (_, t) => { s += t ? unesc(t) : ""; return ""; }); return s; };
const NS = "xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"";
const HEAD = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n";
const colLetter = (i) => String.fromCharCode(65 + i);
const colIndex = (ref) => ref.replace(/\d+/g, "").split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

// cell styles: [font, fill, border, alignment]. Fonts 0 plain, 1 bold, 2 small grey, 3 bold 11,
// 4 italic grey, 5 blue-grey; fills 3 bar blue, 4 the yellow you edit; border 1 a thin rule under.
const MAX_INDENT = 15;
const XFS = [
  [0, 0, 0, "vertical=\"bottom\""],               // 0 plain
  [1, 2, 1, "vertical=\"center\""],               // 1 header
  [3, 3, 1, "vertical=\"top\""],                  // 2 conversation bar: its name
  [0, 0, 1, "vertical=\"top\" wrapText=\"1\""],   // 3 who
  [0, 4, 1, "vertical=\"top\" wrapText=\"1\""],   // 4 the line to edit
  [2, 0, 1, "vertical=\"top\""],                  // 5 small grey
  [0, 0, 1, "vertical=\"top\" wrapText=\"1\""],   // 6 notes
  [4, 0, 0, "vertical=\"center\""],               // 7 legend
  [5, 0, 1, "vertical=\"top\" wrapText=\"1\""],   // 8 "You"
  [2, 3, 1, "vertical=\"center\" wrapText=\"1\""], // 9 conversation bar: where it is
  [1, 0, 1, "horizontal=\"center\" vertical=\"top\""], // 10 step number
  [5, 0, 1, "vertical=\"top\""],                  // 11 goes to
  [3, 3, 1, "horizontal=\"center\" vertical=\"top\""], // 12 conversation bar: blank cells
];
const LINE_INDENT0 = XFS.length;                   // the line to edit, indented 1..MAX_INDENT
for (let i = 1; i <= MAX_INDENT; i++) XFS.push([0, 4, 1, `vertical="top" wrapText="1" indent="${i}"`]);
const lineStyle = (indent) => (indent > 0 ? LINE_INDENT0 + Math.min(indent, MAX_INDENT) - 1 : 4);
const STYLES = HEAD + `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="6">
<font><sz val="10"/><name val="Arial"/><family val="2"/></font>
<font><b/><sz val="10"/><name val="Arial"/><family val="2"/></font>
<font><sz val="9"/><color rgb="FF8C8C8C"/><name val="Arial"/><family val="2"/></font>
<font><b/><sz val="11"/><name val="Arial"/><family val="2"/></font>
<font><i/><sz val="10"/><color rgb="FF595959"/><name val="Arial"/><family val="2"/></font>
<font><sz val="10"/><color rgb="FF4F6B8A"/><name val="Arial"/><family val="2"/></font>
</fonts>
<fills count="5">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE4ECF5"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF6CC"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFD0D0D0"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${XFS.length}">
${XFS.map(([font, fill, border, align]) => `<xf numFmtId="0" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment ${align}/></xf>`).join("\n")}
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

// rows: [[{ v, s } | null, ...], ...]
const sheetXml = ({ widths, rows, freeze, selected, heights }) => {
  let x = HEAD + "<worksheet " + NS + "><sheetPr><pageSetUpPr fitToPage=\"1\"/></sheetPr>";
  x += "<sheetViews><sheetView workbookViewId=\"0\"" + (selected ? " tabSelected=\"1\"" : "") + ">";
  if (freeze) x += `<pane ySplit="${freeze}" topLeftCell="A${freeze + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="B${freeze + 1}" sqref="B${freeze + 1}"/>`;
  x += "</sheetView></sheetViews><sheetFormatPr defaultRowHeight=\"15\"/><cols>";
  widths.forEach((w, i) => { x += `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`; });
  x += "</cols><sheetData>";
  rows.forEach((cells, ri) => {
    const h = heights && heights[ri];
    x += `<row r="${ri + 1}"${h ? ` ht="${h}" customHeight="1"` : ""}>`;
    cells.forEach((c, ci) => {
      if (!c) return;
      const ref = colLetter(ci) + (ri + 1), s = c.s ? ` s="${c.s}"` : "";
      x += c.v === undefined || c.v === null || c.v === "" ? `<c r="${ref}"${s}/>` : `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
    });
    x += "</row>";
  });
  x += "</sheetData><pageMargins left=\"0.4\" right=\"0.4\" top=\"0.5\" bottom=\"0.5\" header=\"0.3\" footer=\"0.3\"/>";
  x += "<pageSetup orientation=\"landscape\" fitToWidth=\"1\" fitToHeight=\"0\"/></worksheet>";
  return x;
};
const writeXlsx = (file, sheets) => {
  const ws = sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) }));
  const files = [
    { name: "[Content_Types].xml", data: HEAD + "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>" + ws.map((w) => `<Override PartName="/${w.name}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") + "<Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/></Types>" },
    { name: "_rels/.rels", data: HEAD + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>" },
    { name: "xl/workbook.xml", data: HEAD + "<workbook " + NS + "><bookViews><workbookView activeTab=\"0\"/></bookViews><sheets>" + sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}"${s.hidden ? " state=\"hidden\"" : ""} r:id="rId${i + 1}"/>`).join("") + "</sheets></workbook>" },
    { name: "xl/_rels/workbook.xml.rels", data: HEAD + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" + ws.map((w, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") + `<Relationship Id="rId${ws.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", data: STYLES },
    ...ws,
  ];
  fs.writeFileSync(file, zip(files));
};
// { sheetName: [[cell text, ...] by row index], ... } — rows keep their sheet row numbers (1-based).
const readXlsx = (file) => {
  const z = unzip(fs.readFileSync(file)), text = (n) => (z[n] ? z[n].toString("utf8") : "");
  const shared = []; text("xl/sharedStrings.xml").replace(/<si>([\s\S]*?)<\/si>/g, (_, si) => { shared.push(runText(si)); return ""; });
  const rels = {}; text("xl/_rels/workbook.xml.rels").replace(/<Relationship\b[^>]*>/g, (t) => { rels[attr(t, "Id")] = attr(t, "Target"); return ""; });
  const out = {};
  text("xl/workbook.xml").replace(/<sheet\b[^>]*>/g, (t) => {
    const target = rels[attr(t, "r:id")] || "", path = target.startsWith("/") ? target.slice(1) : "xl/" + target;
    const rows = [];
    text(path).replace(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g, (_, ra, body) => {
      const r = +attr(" " + ra, "r"), cells = [];
      (body || "").replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (__, ca, cb) => {
        const ref = attr(" " + ca, "r"), type = attr(" " + ca, "t"), inner = cb || "";
        const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        let val = "";
        if (type === "s") val = shared[+v] || "";
        else if (type === "inlineStr") val = runText((inner.match(/<is>([\s\S]*?)<\/is>/) || [])[1] || "");
        else if (v !== undefined) val = unesc(v);
        cells[colIndex(ref)] = val;
        return "";
      });
      rows[r] = cells;
      return "";
    });
    out[attr(t, "name")] = rows;
    return "";
  });
  return out;
};

// ---------- what is in the sheet ----------
const ACT = { shop: "Shop", heal: "Heal", hostile: "Hostile", friendly: "Friendly", money: "Money" };
const isButton = (s) => /^[\s.…!?0-9]*$/.test(s || "");
const FLOORS = ["Trailer Park", "Vietnam", "Tree Tops", "Sewer"];
const floorOf = (lv) => lv.floor || (/^(Trailer|TCloset|Liquor)/i.test(lv.name || "") ? "Trailer Park" : /^(VShaq|Tree Int|Tent)/i.test(lv.name || "") ? "Vietnam" : "");
const byName = (a, b) => String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" });

// Every editable line: { sheet, key, group, groupWhere, who, whoEditable, text, does }
const collect = (lib) => {
  const lines = [];
  const levelText = (lib.levels || []).map((lv) => [lv, JSON.stringify(lv)]);
  const where = (id) => levelText.filter(([, s]) => s.includes("\"" + id + "\"")).map(([lv]) => lv).sort((a, b) => {
    const fa = FLOORS.indexOf(floorOf(a)), fb = FLOORS.indexOf(floorOf(b));
    return (fa < 0 ? 99 : fa) - (fb < 0 ? 99 : fb) || byName(a.name, b.name);
  });
  const convs = (lib.dialogues || []).filter((d) => d && d.id).map((d) => ({ d, at: where(d.id) }));
  convs.sort((a, b) => {
    const ra = a.at.length ? FLOORS.indexOf(floorOf(a.at[0])) : 100, rb = b.at.length ? FLOORS.indexOf(floorOf(b.at[0])) : 100;
    return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) || byName(a.at[0] ? a.at[0].name : "", b.at[0] ? b.at[0].name : "") || byName(a.d.name, b.d.name);
  });
  // A conversation is laid out as a TREE (Blake, 2026-11-28: "I need better indication of what
  // leads to what"): each speaker line is numbered, each answer says where it goes (→ 3, or End),
  // and the line an answer leads to comes straight under that answer, one step further in. A line
  // already shown above (a loop back, two answers to one line) is only pointed at, never repeated.
  for (const { d, at } of convs) {
    const nodes = d.nodes || {}, printed = new Set(), seq = [];
    const answersOf = (n) => (n.choices || []).filter((c) => !isButton(c.text));
    const buttonsOf = (n) => (n.choices || []).filter((c) => isButton(c.text));
    const walk = (nid, depth) => {
      if (!nodes[nid] || printed.has(nid)) return;
      printed.add(nid);
      const n = nodes[nid];
      seq.push({ nid, n, depth });
      for (const c of answersOf(n)) { seq.push({ nid, c, depth }); if (c.to && nodes[c.to] && !printed.has(c.to)) walk(c.to, depth + 1); }
      for (const c of buttonsOf(n)) if (c.to && nodes[c.to] && !printed.has(c.to)) walk(c.to, depth + 1);
    };
    walk(d.start, 0);
    Object.keys(nodes).forEach((nid) => walk(nid, 0));
    const num = new Map();
    seq.filter((s) => !s.c).forEach((s, i) => num.set(s.nid, i + 1));
    const goes = (to) => (to && nodes[to] ? "→ " + num.get(to) : "End");
    const group = d.name || d.id, groupWhere = at.length ? at.map((lv) => lv.name).join(", ") : "Not placed in a level";
    for (const s of seq) {
      if (!s.c) {
        // a line whose only options are "..." or digits (left out of the sheet) still says where it goes
        const answers = answersOf(s.n), buttons = buttonsOf(s.n);
        const targets = [...new Set(buttons.map((c) => (c.to && nodes[c.to] ? String(num.get(c.to)) : "End")))];
        const next = answers.length ? "" : !buttons.length ? "End" : targets.length === 1 && targets[0] === "End" ? "End" : "→ " + targets.join(", ");
        const picks = !answers.length && buttons.some((c) => /\d/.test(c.text || ""));
        const does = [s.n.once ? "One time only" : "", picks ? "Pick a number" : ""].filter(Boolean).join(", ");
        lines.push({ sheet: "Dialogue", key: `dlg|${d.id}|${s.nid}`, group, groupWhere, step: num.get(s.nid), depth: s.depth,
          who: s.n.speaker || "", whoEditable: true, text: s.n.text || "", does, goes: next });
      } else {
        const does = (ACT[s.c.act] || "") + (s.c.money > 0 ? " " + s.c.money : "");
        lines.push({ sheet: "Dialogue", key: `dlg|${d.id}|${s.nid}|${s.c.id}`, group, groupWhere, step: "", depth: s.depth, answer: true,
          who: "You", text: s.c.text || "", does, goes: goes(s.c.to) });
      }
    }
  }
  // objective markers: one row per distinct text, every level that shows it in the one key
  const obj = new Map();
  for (const lv of (lib.levels || []).slice().sort((a, b) => byName(a.name, b.name))) {
    for (const [cell, m] of Object.entries(lv.markers || {})) {
      if (!m || typeof m.text !== "string" || !m.text.trim()) continue;
      const k = (m.kind || "") + "\u0000" + m.text;
      if (!obj.has(k)) obj.set(k, { kind: m.kind, text: m.text, keys: [], names: [] });
      const o = obj.get(k); o.keys.push(`lvl|${lv.id}|${cell}`); o.names.push(lv.name);
    }
  }
  for (const o of obj.values()) lines.push({ sheet: "Other text", key: o.keys.join(";"), group: o.names.join(", "), who: o.kind === "objective" ? "Objective" : (o.kind || "Marker"), text: o.text, does: "" });
  for (const a of (lib.assets || []).filter((x) => x.type === "anim").sort((p, q) => byName(p.name, q.name))) {
    (a.states || []).forEach((st, i) => { if (st && typeof st.prompt === "string" && st.prompt.trim()) lines.push({ sheet: "Other text", key: `anim|${a.id}|states|${i}|prompt`, group: a.name, who: "Button prompt", text: st.prompt, does: "" }); });
    (a.layers || []).forEach((ly, i) => {
      if (!ly || ly.kind !== "text") return;
      if (typeof ly.title === "string" && ly.title.trim()) lines.push({ sheet: "Other text", key: `anim|${a.id}|layers|${i}|title`, group: a.name, who: "Title", text: ly.title, does: "" });
      if (typeof ly.text === "string" && ly.text.trim()) lines.push({ sheet: "Other text", key: `anim|${a.id}|layers|${i}|text`, group: a.name, who: "Text", text: ly.text, does: "" });
    });
  }
  return lines;
};

// The edits in a sheet, by key: { text?, who?, note?, orig } where orig is that sheet's _orig entry.
// Columns are found by their header names, so a sheet from any layout of this tool reads.
const sheetEdits = (book) => {
  if (!book._orig) throw new Error("this sheet has no _orig tab: it was not made by tools/dialogue-sheet.js export");
  const orig = new Map();
  for (const r of book._orig.slice(2)) if (r && r[0]) orig.set(r[0], { who: norm(r[1]), text: norm(r[2]) });
  const edits = new Map();
  for (const sheet of ["Dialogue", "Other text"]) {
    const rows = book[sheet] || [];
    const h = rows.findIndex((r, i) => i > 0 && i < 6 && r && r.includes("Key"));
    if (h < 0) continue;
    const col = (name) => rows[h].indexOf(name);
    const cKey = col("Key"), cNote = col("Notes"), cText = col("Line") >= 0 ? col("Line") : col("Text"), cWho = sheet === "Dialogue" ? col("Who") : -1;
    for (const r of rows.slice(h + 1)) {
      if (!r || !r[cKey]) continue;
      const key = r[cKey], o = orig.get(key), e = { orig: o, text: norm(r[cText]), note: norm(r[cNote]).trim() };
      if (cWho >= 0 && key.split("|").length === 3 && key.startsWith("dlg|")) e.who = norm(r[cWho]);
      edits.set(key, e);
    }
  }
  return { orig, edits };
};

// carry: an older sheet whose edits and notes go into this one (its line text, names and notes,
// and its _orig for those lines, so the import still sees them as his edits against the version
// he started from).
const exportSheet = (lib, outFile, carryFile) => {
  const lines = collect(lib);
  let carried = 0;
  if (carryFile) {
    const { edits } = sheetEdits(readXlsx(carryFile));
    for (const l of lines) {
      const e = edits.get(l.key);
      if (!e || !e.orig) continue;
      const textEdited = e.text !== e.orig.text && e.text.trim(), whoEdited = e.who !== undefined && e.who !== e.orig.who;
      if (!textEdited && !whoEdited && !e.note) continue;
      l.origText = e.orig.text; l.origWho = e.orig.who;
      if (textEdited) l.text = e.text;
      if (whoEdited) l.who = e.who;
      if (e.note) l.note = e.note;
      carried++;
    }
  }
  const dlg = lines.filter((l) => l.sheet === "Dialogue"), other = lines.filter((l) => l.sheet === "Other text");
  const C = (v, s) => ({ v, s });
  const dRows = [[C("Fix any line in the yellow column, or a name under Who. Each answer's \"Goes to\" is the numbered line it leads to; that line sits right under it. Notes are for anything else. Leave Key alone.", 7)],
    [C("#", 1), C("Who", 1), C("Line", 1), C("Does", 1), C("Goes to", 1), C("Notes", 1), C("Key", 1)]];
  const dH = [24, 20];
  let last = null;
  for (const l of dlg) {
    if (l.group + "\u0000" + l.groupWhere !== last) {
      last = l.group + "\u0000" + l.groupWhere;
      // Excel under-sizes a wrapped row on open, so the level list's height is set here
      // (about 95 characters of 9pt Arial a line in the 78-wide column)
      dRows.push([C("", 12), C(l.group, 2), C(l.groupWhere, 9), C("", 12), C("", 12), C("", 12), C("", 12)]);
      dH.push(Math.max(20, Math.ceil(l.groupWhere.length / 95) * 12 + 6));
    }
    const indent = l.depth * 2 + (l.answer ? 1 : 0);
    dRows.push([C(l.step === "" ? "" : String(l.step), 10), C(l.who, l.answer ? 8 : 3), C(l.text, lineStyle(indent)), C(l.does, 5), C(l.goes, 11), C(l.note || "", 6), C(l.key, 5)]);
    dH.push(null);
  }
  const oRows = [[C("Fix any text in the yellow column. Notes are for anything else. Leave Key alone.", 7)],
    [C("Where", 1), C("What", 1), C("Text", 1), C("Notes", 1), C("Key", 1)]];
  const oH = [24, 20];
  for (const l of other) { oRows.push([C(l.group, 3), C(l.who, 5), C(l.text, 4), C(l.note || "", 6), C(l.key, 5)]); oH.push(null); }
  const orig = [[C("key"), C("who"), C("text")]];
  for (const l of lines) orig.push([C(l.key), C(l.origWho !== undefined ? l.origWho : l.who), C(l.origText !== undefined ? l.origText : l.text)]);
  writeXlsx(outFile, [
    { name: "Dialogue", widths: [5, 22, 78, 13, 9, 32, 26], rows: dRows, heights: dH, freeze: 2, selected: true },
    { name: "Other text", widths: [34, 14, 78, 32, 26], rows: oRows, heights: oH, freeze: 2 },
    { name: "_orig", widths: [30, 20, 80], rows: orig, hidden: true },
  ]);
  const convs = new Set(dlg.map((l) => l.group + "|" + l.groupWhere)).size;
  console.log(`wrote ${outFile}: ${convs} conversations, ${dlg.filter((l) => !l.answer).length} lines, ${dlg.filter((l) => l.answer).length} answers; ${other.length} other texts` + (carryFile ? `; carried ${carried} edited/noted row(s) from ${carryFile}` : ""));
};

// ---------- reading it back ----------
const norm = (s) => String(s == null ? "" : s).replace(/\r\n?/g, "\n");
const importSheet = (lib, sheetFile, outFile) => {
  const { edits } = sheetEdits(readXlsx(sheetFile));
  const changed = { dialogues: new Map(), levels: new Map(), assets: new Map() };
  const copyOf = (kind, list, id) => {
    if (!changed[kind].has(id)) {
      const cur = (lib[list] || []).find((x) => x && x.id === id);
      if (!cur) return null;
      changed[kind].set(id, { cur, next: JSON.parse(JSON.stringify(cur)) });
    }
    return changed[kind].get(id).next;
  };
  const report = { changed: [], conflicts: [], emptied: [], notes: [], missing: [] };
  {
    for (const [key, e] of edits) {
      const o = e.orig, text = e.text, who = e.who !== undefined ? e.who : "", note = e.note;
      if (note) report.notes.push({ key, who: e.who !== undefined ? e.who : (o ? o.who : ""), text, note });
      if (!o) { report.missing.push(key); continue; }
      const textChanged = text !== o.text, whoChanged = e.who !== undefined && who !== o.who;
      if (!textChanged && !whoChanged) continue;
      if (textChanged && !text.trim()) { report.emptied.push({ key, was: o.text }); if (!whoChanged) continue; }
      for (const k of key.split(";")) {
        const p = k.split("|");
        let target = null, cur = null;
        if (p[0] === "dlg") {
          const d = copyOf("dialogues", "dialogues", p[1]); const n = d && d.nodes && d.nodes[p[2]];
          if (!n) { report.missing.push(k); continue; }
          const curD = changed.dialogues.get(p[1]).cur.nodes[p[2]];
          if (p.length === 3) {
            if ((textChanged && text.trim() && norm(curD.text) !== o.text) || (whoChanged && norm(curD.speaker) !== o.who)) { report.conflicts.push({ key: k, sheet: text, now: curD.text }); continue; }
            if (textChanged && text.trim()) n.text = text;
            if (whoChanged) n.speaker = who;
          } else {
            const c = (n.choices || []).find((x) => x.id === p[3]), cc = (curD.choices || []).find((x) => x.id === p[3]);
            if (!c) { report.missing.push(k); continue; }
            if (norm(cc.text) !== o.text) { report.conflicts.push({ key: k, sheet: text, now: cc.text }); continue; }
            c.text = text;
          }
          report.changed.push({ key: k, was: o.text, now: text, who: whoChanged ? who : undefined });
          continue;
        }
        if (p[0] === "lvl") {
          const lv = copyOf("levels", "levels", p[1]); target = lv && lv.markers && lv.markers[p[2]];
          cur = target && changed.levels.get(p[1]).cur.markers[p[2]];
          if (!target) { report.missing.push(k); continue; }
          if (norm(cur.text) !== o.text) { report.conflicts.push({ key: k, sheet: text, now: cur.text }); continue; }
          target.text = text; report.changed.push({ key: k, was: o.text, now: text }); continue;
        }
        if (p[0] === "anim") {
          const a = copyOf("assets", "assets", p[1]); const obj = a && a[p[2]] && a[p[2]][+p[3]];
          if (!obj) { report.missing.push(k); continue; }
          const curObj = changed.assets.get(p[1]).cur[p[2]][+p[3]];
          if (norm(curObj[p[4]]) !== o.text) { report.conflicts.push({ key: k, sheet: text, now: curObj[p[4]] }); continue; }
          obj[p[4]] = text; report.changed.push({ key: k, was: o.text, now: text }); continue;
        }
        report.missing.push(k);
      }
    }
  }
  const now = Date.now(), out = { dialogues: [], levels: [], assets: [], notes: report.notes };
  for (const kind of ["dialogues", "levels", "assets"]) {
    for (const { cur, next } of changed[kind].values()) {
      const strip = (x) => { const c = { ...x }; delete c.savedAt; delete c.editedFrom; return JSON.stringify(c); };
      if (strip(cur) === strip(next)) continue;
      next.savedAt = Math.max(now, (typeof cur.savedAt === "number" ? cur.savedAt : 0) + 1);
      if (typeof cur.savedAt === "number") next.editedFrom = cur.savedAt; else delete next.editedFrom;
      out[kind].push(next);
    }
  }
  fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
  console.log(`${report.changed.length} line(s) changed in ${out.dialogues.length} conversation(s), ${out.levels.length} level(s), ${out.assets.length} cutscene(s) -> ${outFile}`);
  for (const c of report.changed) console.log("  " + c.key + (c.who ? "  [who -> " + c.who + "]" : "") + "\n    was: " + c.was + "\n    now: " + c.now);
  if (report.conflicts.length) { console.log(report.conflicts.length + " NOT changed: edited in the game since the export"); for (const c of report.conflicts) console.log("  " + c.key + "\n    sheet: " + c.sheet + "\n    game:  " + c.now); }
  if (report.emptied.length) { console.log(report.emptied.length + " emptied in the sheet, left as they were:"); for (const c of report.emptied) console.log("  " + c.key + ": " + c.was); }
  if (report.missing.length) console.log(report.missing.length + " key(s) no longer in the library: " + report.missing.join(", "));
  if (report.notes.length) { console.log(report.notes.length + " note(s):"); for (const n of report.notes) console.log("  " + n.key + " | " + n.who + " | " + n.text + "\n    NOTE: " + n.note); }
  return { report, out };
};

module.exports = { collect, exportSheet, importSheet, readXlsx, writeXlsx, zip, unzip };

if (require.main === module) {
  const [cmd, a, b, c] = process.argv.slice(2);
  const lib = a ? JSON.parse(fs.readFileSync(a, "utf8")) : null;
  if (cmd === "export" && lib && b) exportSheet(lib, b, c === "--carry" ? process.argv[6] : null);
  else if (cmd === "import" && lib && b && c) importSheet(lib, b, c);
  else { console.log("node tools/dialogue-sheet.js export LIB.json OUT.xlsx [--carry OLD.xlsx]\nnode tools/dialogue-sheet.js import LIB.json SHEET.xlsx OUT.json"); process.exit(1); }
}
