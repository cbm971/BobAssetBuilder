// THE GAME'S SCREENS — title handoff, main menu, Load Game, Options, Unlocks, Quit, the pause menu
// and the floor-complete card (2026-10-17). The rules behind them are in gameFront.js; App.js owns
// the state and hands it in, and does the actual starting, loading and saving.
//
// THE LOOK is the Skyrim title screen, which is what Blake named: black, a cold metallic serif
// (Cinzel, the free face cut from the same Roman capitals as the Elder Scrolls titles), a slow fog,
// and a centred list whose lit row is white with a thin rule either side. No emoji and no icons
// ("I hate emojis"), and no helper text under anything (his standing rule): a screen is its title
// and its rows. The one sentence any of them can show is a ⚠ about something actually wrong.
//
// EVERY SCREEN IS DRIVEN BY THE KEYBOARD AND THE MOUSE ALIKE: up/down (or W/S) moves, Enter / Space /
// E picks, Esc goes back, left/right turns a slider or a tab; hovering a row lights it. A game that
// starts from the keyboard must never need a reach for the mouse to get into it.
import React, { useEffect, useRef, useState } from "react";
import {
  GAME_MENU, menuStep, introRemainingMs, INTRO_OUT_MS, formatPlayTime, UNLOCK_TABS, unlockPool,
} from "./gameFront";

const fmtNum = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");
const fmtWhen = (t) => {
  try { return new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch { return ""; }
};

// One window keydown listener per screen, re-pointed at the newest handlers every render so a
// handler never acts on a stale list.
const useMenuKeys = (enabled, handlers) => {
  const h = useRef(handlers);
  h.current = handlers;
  useEffect(() => {
    if (!enabled) return undefined;
    const kd = (e) => {
      const H = h.current, k = e.key;
      const t = e.target;
      if (t && (t.tagName === "INPUT" && t.type !== "range")) return;
      if (k === "ArrowUp" || k === "w" || k === "W") { e.preventDefault(); if (H.move) H.move(-1); }
      else if (k === "ArrowDown" || k === "s" || k === "S") { e.preventDefault(); if (H.move) H.move(1); }
      else if (k === "ArrowLeft" || k === "a" || k === "A") { if (H.side) { e.preventDefault(); H.side(-1); } }
      else if (k === "ArrowRight" || k === "d" || k === "D") { if (H.side) { e.preventDefault(); H.side(1); } }
      else if (k === "Enter" || k === " " || k === "e" || k === "E") { e.preventDefault(); if (H.pick) H.pick(); }
      else if (k === "Escape" || k === "Backspace") { e.preventDefault(); if (H.back) H.back(); }
      else if (k === "Delete" || k === "x" || k === "X") { if (H.del) { e.preventDefault(); H.del(); } }
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, [enabled]);
};

// A vertical list of rows with one lit. `rows`: [{ id, label, disabled, right }] and `onPick(row)`.
function MenuList({ rows, at, setAt, onPick, className = "" }) {
  return (
    <div className={"gList " + className}>
      {rows.map((r, i) => (
        <div key={r.id} role="button" className={"gItem" + (i === at ? " on" : "") + (r.disabled ? " off" : "")}
          onMouseEnter={() => { if (!r.disabled) setAt(i); }} onClick={() => { if (!r.disabled) { setAt(i); onPick(r); } }}>
          <span className="gItemTxt">{r.label}</span>
          {r.right != null && <span className="gItemRight">{r.right}</span>}
        </div>
      ))}
    </div>
  );
}

function Backdrop({ children, dim }) {
  return (
    <div className={"gScreen" + (dim ? " dim" : "")}>
      <div className="gFog a" /><div className="gFog b" /><div className="gVig" />
      <div className="gBody">{children}</div>
    </div>
  );
}

// ---------- the title: hand the boot intro (public/index.html) over to the menu ----------
function TitleHandoff({ ready, onDone }) {
  const skipped = useRef(false);
  const done = useRef(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const skip = () => { skipped.current = true; setTick((t) => t + 1); };
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => { window.removeEventListener("keydown", skip); window.removeEventListener("pointerdown", skip); };
  }, []);
  useEffect(() => {
    if (!ready || done.current) return undefined;
    const intro = typeof document !== "undefined" ? document.getElementById("bobIntro") : null;
    const at = typeof window !== "undefined" && typeof window.__bobIntroAt === "number" ? window.__bobIntroAt : null;
    const started = intro && at != null && document.documentElement.className.indexOf("biGo") >= 0;
    const nowT = typeof performance !== "undefined" ? performance.now() : 0;
    // Not started yet (the face is still coming in) counts as nothing elapsed.
    const wait = intro ? introRemainingMs(started ? nowT - at : 0, skipped.current) : 0;
    const t = setTimeout(() => {
      if (done.current) return;
      done.current = true;
      if (intro) {
        intro.classList.add("out");
        setTimeout(() => { try { intro.remove(); } catch { /* already gone */ } }, INTRO_OUT_MS + 50);
      }
      onDone();
    }, wait);
    return () => clearTimeout(t);
  }, [ready, tick, onDone]);
  return <div className="gScreen gBlack" />;
}

// ---------- the main menu ----------
// `at` lives in the shell, so coming back from Options or Unlocks lands on the row you left by.
function MainMenu({ go, onNewGame, note, click, at, setAt }) {
  const pick = (r) => {
    click();
    if (r.id === "new") onNewGame();
    else go(r.id);
  };
  useMenuKeys(true, { move: (d) => setAt((i) => menuStep(GAME_MENU, i, d)), pick: () => pick(GAME_MENU[at]) });
  return (
    <Backdrop>
      <div className="gLogo gLogoMenu">Bob</div>
      <MenuList rows={GAME_MENU} at={at} setAt={setAt} onPick={pick} className="gMain" />
      {note ? <div className="gWarn">⚠ {note}</div> : null}
    </Backdrop>
  );
}

// ---------- Load Game ----------
function LoadGame({ saves, onLoad, onDelete, back, click }) {
  const [at, setAt] = useState(0);
  const [arm, setArm] = useState(null); // the save id a second Delete will remove
  const rows = [
    ...saves.map((s) => ({
      id: s.id, save: s,
      label: <><span className="gSaveName">{s.lookName || "Bob"}</span><span className="gSaveWhere">{s.levelName || s.floor || ""}</span></>,
      right: <span className="gSaveMeta">Score {fmtNum(s.score && s.score.total)}<i>·</i>{formatPlayTime(s.playSecs)}<i>·</i>{fmtWhen(s.savedAt)}</span>,
    })),
    { id: "__back", label: "Back" },
  ];
  const cur = rows[Math.min(at, rows.length - 1)];
  const del = () => {
    if (!cur || !cur.save) return;
    // After the delete the list is one row shorter; stay on the same position, or the new last row.
    if (arm === cur.save.id) { setArm(null); onDelete(cur.save.id); setAt((i) => Math.max(0, Math.min(i, rows.length - 2))); }
    else setArm(cur.save.id);
  };
  const pick = (r) => { click(); if (r.id === "__back") back(); else onLoad(r.save); };
  useMenuKeys(true, { move: (d) => { setArm(null); setAt((i) => menuStep(rows, Math.min(i, rows.length - 1), d)); }, pick: () => pick(cur), back, del });
  return (
    <Backdrop>
      <div className="gHead">Load Game</div>
      {!saves.length && <div className="gEmpty">No saved games</div>}
      <div className="gSaves">
        {rows.map((r, i) => (
          <div key={r.id} className={"gSaveRow" + (i === at ? " on" : "")} onMouseEnter={() => { if (i !== at) setArm(null); setAt(i); }}>
            <div role="button" className={"gItem gSaveBtn" + (r.save ? "" : " gSaveBack") + (i === at ? " on" : "")} onClick={() => { setAt(i); pick(r); }}>
              <span className="gItemTxt">{r.label}</span>
              {r.right != null && <span className="gItemRight">{r.right}</span>}
            </div>
            {r.save && <div role="button" className={"gDel" + (arm === r.id ? " arm" : "")} onClick={() => { if (arm === r.id) { setArm(null); onDelete(r.id); setAt((j) => Math.max(0, Math.min(j, rows.length - 2))); } else { setAt(i); setArm(r.id); } }}>{arm === r.id ? "Delete?" : "Delete"}</div>}
          </div>
        ))}
      </div>
    </Backdrop>
  );
}

// ---------- Options ----------
const useFullscreen = () => {
  const [on, setOn] = useState(() => typeof document !== "undefined" && !!document.fullscreenElement);
  useEffect(() => {
    const f = () => setOn(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  const toggle = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    } catch { /* the browser said no */ }
  };
  return [on, toggle];
};
export function OptionsPanel({ options, setOptions, back, click, overlay }) {
  const [at, setAt] = useState(0);
  const [fs, toggleFs] = useFullscreen();
  const VOL_STEP = 5;
  const slider = (key) => (
    <span className="gSlider">
      <input type="range" min="0" max="100" step="1" value={options[key]} onChange={(e) => setOptions({ ...options, [key]: +e.target.value })} onMouseUp={(e) => e.currentTarget.blur()} />
      <b>{options[key]}%</b>
    </span>
  );
  const rows = [
    { id: "music", label: "Music", right: slider("music") },
    { id: "effects", label: "Sound Effects", right: slider("effects") },
    { id: "fullscreen", label: "Fullscreen", right: <b className="gToggle">{fs ? "On" : "Off"}</b> },
    { id: "__back", label: "Back" },
  ];
  const nudge = (d) => {
    const r = rows[at];
    if (r.id === "music" || r.id === "effects") setOptions({ ...options, [r.id]: Math.min(100, Math.max(0, options[r.id] + d * VOL_STEP)) });
    else if (r.id === "fullscreen") toggleFs();
  };
  const pick = (r) => {
    if (r.id === "__back") { click(); back(); }
    else if (r.id === "fullscreen") { click(); toggleFs(); }
  };
  useMenuKeys(true, { move: (d) => setAt((i) => menuStep(rows, i, d)), side: nudge, pick: () => pick(rows[at]), back });
  const body = (
    <>
      <div className="gHead">Options</div>
      <MenuList rows={rows} at={at} setAt={setAt} onPick={pick} className="gOpts" />
    </>
  );
  return overlay ? <div className="gOverlay">{body}</div> : <Backdrop>{body}</Backdrop>;
}

// ---------- Unlocks ----------
// Everything that can be found, drawn from his library; what this player has found is drawn in
// full and named, the rest is its silhouette. `renderArt(asset, px)` draws an asset's art centred
// in a px square (App.js; the shop shelf's drawing).
const UnlockGrid = React.memo(function UnlockGrid({ pool, have, renderArt, setHover }) {
  return (
    <div className="gGrid">
      {pool.map((a) => {
        const got = have.has(a.id);
        return (
          <div key={a.id} className={"gTile" + (got ? " got" : "")} onMouseEnter={() => setHover(got ? a.name : "???")} onMouseLeave={() => setHover("")}>
            <div className="gTileArt">{renderArt(a, 60)}</div>
          </div>
        );
      })}
    </div>
  );
});
function Unlocks({ assets, record, renderArt, back, click }) {
  const [tab, setTab] = useState(0);
  const [hover, setHover] = useState("");
  const pools = React.useMemo(() => UNLOCK_TABS.map((t) => unlockPool(assets, t.id)), [assets]);
  const haves = React.useMemo(() => [new Set(record.found), new Set(record.defeated)], [record]);
  const count = (i) => pools[i].filter((a) => haves[i].has(a.id)).length;
  useMenuKeys(true, { side: (d) => { setTab((t) => (t + d + UNLOCK_TABS.length) % UNLOCK_TABS.length); click(); }, back, pick: () => { click(); back(); } });
  return (
    <Backdrop>
      <div className="gHead">Unlocks</div>
      <div className="gStats">
        <span>Best Score <b>{fmtNum(record.bestScore)}</b></span>
        <span>Floors <b>{record.floors.length}</b></span>
        <span>Enemies Defeated <b>{fmtNum(record.kills)}</b></span>
      </div>
      <div className="gTabs">
        {UNLOCK_TABS.map((t, i) => (
          <div key={t.id} role="button" className={"gTab" + (i === tab ? " on" : "")} onClick={() => { click(); setTab(i); }}>
            {t.label} <span>{count(i)} / {pools[i].length}</span>
          </div>
        ))}
      </div>
      <UnlockGrid pool={pools[tab]} have={haves[tab]} renderArt={renderArt} setHover={setHover} />
      <div className="gHover">{hover || " "}</div>
      <MenuList rows={[{ id: "__back", label: "Back" }]} at={0} setAt={() => {}} onPick={() => { click(); back(); }} className="gBackOnly" />
    </Backdrop>
  );
}

// ---------- Quit ----------
// A browser only lets a page close the tab when the page opened it (the studio's tile does); a tab
// opened any other way stays, and gets a black screen instead. Any key or click comes back.
function QuitScreen({ back }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    try { window.close(); } catch { /* refused */ }
    const t = setTimeout(() => setShown(true), 250);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!shown) return undefined;
    const f = () => back();
    window.addEventListener("keydown", f); window.addEventListener("pointerdown", f);
    return () => { window.removeEventListener("keydown", f); window.removeEventListener("pointerdown", f); };
  }, [shown, back]);
  return <div className="gScreen gBlack">{shown && <div className="gLogo gLogoQuit">Bob</div>}</div>;
}

// ---------- the floor-complete card ----------
function FloorDone({ done, onContinue, click }) {
  const rows = [{ id: "continue", label: "Continue" }];
  useMenuKeys(true, { pick: () => { click(); onContinue(); }, back: () => { click(); onContinue(); } });
  return (
    <Backdrop>
      <div className="gHead gHeadBig">Floor Complete</div>
      {done.floor ? <div className="gSub">{done.floor}</div> : null}
      <div className="gStats gStatsBig">
        <span>Score <b>{fmtNum(done.score)}</b></span>
        <span>Time <b>{formatPlayTime(done.secs)}</b></span>
      </div>
      <MenuList rows={rows} at={0} setAt={() => {}} onPick={() => { click(); onContinue(); }} className="gBackOnly" />
    </Backdrop>
  );
}

// ---------- the pause menu (over the level, play frozen) ----------
export function GamePause({ onResume, onQuit, options, setOptions, click }) {
  const [sub, setSub] = useState(null);
  const [at, setAt] = useState(0);
  const rows = [{ id: "resume", label: "Resume" }, { id: "options", label: "Options" }, { id: "quit", label: "Quit to Main Menu" }];
  const pick = (r) => {
    click();
    if (r.id === "resume") onResume();
    else if (r.id === "options") setSub("options");
    else if (r.id === "quit") onQuit();
  };
  useMenuKeys(!sub, { move: (d) => setAt((i) => menuStep(rows, i, d)), pick: () => pick(rows[at]), back: () => { click(); onResume(); } });
  if (sub === "options") return <div className="gPause"><style>{GAME_CSS}</style><OptionsPanel options={options} setOptions={setOptions} back={() => setSub(null)} click={click} overlay /></div>;
  return (
    <div className="gPause">
      <style>{GAME_CSS}</style>
      <div className="gOverlay">
        <div className="gHead">Paused</div>
        <MenuList rows={rows} at={at} setAt={setAt} onPick={pick} />
      </div>
    </div>
  );
}

// ---------- the shell: whichever menu screen is up ----------
export function GameShell({ view, setView, ready, saves, options, setOptions, record, assets, renderArt, onNewGame, onLoad, onDelete, floorDone, onFloorDoneContinue, note, click }) {
  const toMenu = React.useCallback(() => setView("menu"), [setView]);
  const [menuAt, setMenuAt] = useState(0);
  return (
    <div className="gRoot">
      <style>{GAME_CSS}</style>
      {view === "title" && <TitleHandoff ready={ready} onDone={toMenu} />}
      {view === "menu" && <MainMenu go={setView} onNewGame={onNewGame} note={note} click={click} at={menuAt} setAt={setMenuAt} />}
      {view === "load" && <LoadGame saves={saves} onLoad={onLoad} onDelete={onDelete} back={toMenu} click={click} />}
      {view === "options" && <OptionsPanel options={options} setOptions={setOptions} back={toMenu} click={click} />}
      {view === "unlocks" && <Unlocks assets={assets} record={record} renderArt={renderArt} back={toMenu} click={click} />}
      {view === "quit" && <QuitScreen back={toMenu} />}
      {view === "floorDone" && floorDone && <FloorDone done={floorDone} onContinue={onFloorDoneContinue} click={click} />}
    </div>
  );
}

// The sheet. Cinzel is loaded by public/index.html for the game address only; offline it falls
// back to a plain serif and nothing else changes. Colours are fixed (a game screen, not a themed
// page): near-black, silver text, one cold highlight.
export const GAME_CSS = `
.gRoot,.gPause{font-family:Cinzel,'Trajan Pro',Georgia,'Times New Roman',serif;color:#d9dce1;-webkit-font-smoothing:antialiased}
.gScreen{position:fixed;inset:0;background:#030405;overflow:hidden;z-index:50}
.gScreen.gBlack{background:#000}
.gBody{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4vh 16px;box-sizing:border-box;overflow-x:hidden;overflow-y:auto}
.gFog{position:absolute;inset:-30%;pointer-events:none;opacity:.55;background:radial-gradient(ellipse 40% 30% at 30% 60%,rgba(120,132,150,.16),transparent 70%),radial-gradient(ellipse 35% 25% at 70% 40%,rgba(96,108,128,.14),transparent 70%)}
.gFog.a{animation:gDrift 38s ease-in-out infinite alternate}
.gFog.b{animation:gDrift 52s ease-in-out -20s infinite alternate-reverse;opacity:.4;transform:scale(1.3)}
@keyframes gDrift{from{transform:translate3d(-6%,2%,0) scale(1.1)}to{transform:translate3d(6%,-3%,0) scale(1.25)}}
.gVig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 45%,rgba(0,0,0,.85) 100%)}
.gLogo{font-weight:900;line-height:1;letter-spacing:.04em;background:linear-gradient(180deg,#fdfdfd 0%,#d5d9de 42%,#8d939b 54%,#e6e9ec 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 18px rgba(200,215,235,.28)) drop-shadow(0 3px 0 rgba(0,0,0,.6));user-select:none}
.gLogoMenu{font-size:clamp(72px,12vw,190px);margin-bottom:6vh;animation:gIn .9s ease both}
.gLogoQuit{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:clamp(60px,9vw,140px);opacity:.18}
@keyframes gIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.gList{display:flex;flex-direction:column;align-items:center;gap:.25em;animation:gIn .9s ease .15s both}
.gItem{position:relative;box-sizing:border-box;max-width:100%;display:flex;align-items:center;justify-content:center;gap:1.2em;background:none;border:0;padding:.32em 1.6em;margin:0;cursor:pointer;font:inherit;font-weight:600;font-size:clamp(19px,1.9vw,30px);letter-spacing:.16em;color:rgba(214,219,226,.46);text-shadow:0 2px 3px rgba(0,0,0,.8);transition:color .15s,text-shadow .15s;outline:none}
.gItem .gItemTxt{display:flex;align-items:baseline;gap:.8em}
.gItem::before,.gItem::after{content:"";position:absolute;top:50%;width:0;height:1px;background:linear-gradient(90deg,transparent,rgba(235,240,248,.85));transition:width .2s ease}
.gItem::before{right:100%}
.gItem::after{left:100%;transform:scaleX(-1)}
.gItem.on{color:#fff;text-shadow:0 0 14px rgba(210,225,245,.55),0 2px 3px rgba(0,0,0,.8)}
.gItem.on::before,.gItem.on::after{width:clamp(28px,4vw,64px)}
.gItem.off{opacity:.35;cursor:default}
.gItemRight{font-size:.62em;letter-spacing:.08em;color:rgba(214,219,226,.7);display:flex;align-items:center;gap:.6em}
.gHead{font-weight:700;font-size:clamp(26px,2.8vw,44px);letter-spacing:.22em;color:#eef0f3;margin-bottom:3.5vh;text-shadow:0 0 16px rgba(200,215,235,.25);animation:gIn .6s ease both}
.gHeadBig{font-size:clamp(34px,4vw,64px)}
.gSub{font-size:clamp(16px,1.5vw,24px);letter-spacing:.2em;color:rgba(214,219,226,.65);margin:-2vh 0 3vh}
.gWarn{position:absolute;bottom:5vh;left:0;right:0;text-align:center;font-family:Georgia,serif;font-size:16px;color:#e9c46a;letter-spacing:.04em}
.gEmpty{font-size:clamp(16px,1.4vw,22px);letter-spacing:.18em;color:rgba(214,219,226,.45);margin-bottom:3vh}
.gSaves{display:flex;flex-direction:column;align-items:stretch;gap:.2em;width:min(980px,92vw);animation:gIn .7s ease .1s both}
.gSaveRow{position:relative;display:flex;align-items:center}
.gSaveBtn{flex:1;justify-content:space-between;font-size:clamp(17px,1.6vw,26px);padding:.42em 1.2em;border-top:1px solid rgba(255,255,255,.05)}
.gSaveBtn::before,.gSaveBtn::after{display:none}
.gSaveBtn.gSaveBack{justify-content:center;border-top:0}
.gSaveRow.on .gSaveBtn{background:linear-gradient(90deg,transparent,rgba(190,205,225,.08) 20%,rgba(190,205,225,.08) 80%,transparent)}
.gSaveName{color:inherit}
.gSaveWhere{font-size:.7em;letter-spacing:.1em;color:rgba(214,219,226,.6)}
.gSaveMeta i{font-style:normal;opacity:.5;margin:0 .45em}
.gDel{position:absolute;right:-6.2em;background:none;border:1px solid rgba(255,255,255,.18);color:rgba(214,219,226,.55);font:inherit;font-size:13px;letter-spacing:.12em;padding:.3em .7em;cursor:pointer;opacity:0;transition:opacity .15s}
.gSaveRow.on .gDel,.gDel.arm{opacity:1}
.gDel.arm{color:#ffb4a2;border-color:#c0614a}
@media (max-width:1180px){.gDel{position:static;margin-left:.5em}}
.gOpts .gItem{min-width:min(640px,88vw);justify-content:space-between}
.gOpts .gItem::before,.gOpts .gItem::after{display:none}
.gOpts .gItem.on{background:linear-gradient(90deg,transparent,rgba(190,205,225,.08) 20%,rgba(190,205,225,.08) 80%,transparent)}
.gSlider{display:flex;align-items:center;gap:.9em}
.gSlider b,.gToggle{font-weight:600;min-width:3.2em;text-align:right;color:#eef0f3;font-size:1.25em}
.gSlider input[type=range]{-webkit-appearance:none;appearance:none;width:clamp(160px,18vw,280px);height:3px;background:linear-gradient(90deg,rgba(235,240,248,.8),rgba(235,240,248,.25));border-radius:2px;outline:none;cursor:pointer}
.gSlider input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;transform:rotate(45deg);background:#f2f4f7;border:1px solid #9aa2ad;box-shadow:0 0 8px rgba(210,225,245,.6);cursor:pointer}
.gSlider input[type=range]::-moz-range-thumb{width:12px;height:12px;background:#f2f4f7;border:1px solid #9aa2ad;border-radius:0;transform:rotate(45deg)}
.gStats{display:flex;gap:2.4em;flex-wrap:wrap;justify-content:center;font-size:clamp(14px,1.2vw,19px);letter-spacing:.16em;color:rgba(214,219,226,.6);margin:-1.5vh 0 2.5vh}
.gStats b{color:#f2f4f7;font-weight:700;margin-left:.45em;letter-spacing:.06em}
.gStatsBig{font-size:clamp(18px,1.7vw,28px);margin:0 0 5vh}
.gTabs{display:flex;gap:1.2em;margin-bottom:2vh}
.gTab{background:none;border:0;border-bottom:1px solid transparent;font:inherit;font-weight:600;font-size:clamp(16px,1.4vw,22px);letter-spacing:.16em;color:rgba(214,219,226,.45);padding:.3em .6em;cursor:pointer}
.gTab span{font-size:.72em;letter-spacing:.06em;margin-left:.5em}
.gTab.on{color:#fff;border-bottom-color:rgba(235,240,248,.7);text-shadow:0 0 12px rgba(210,225,245,.5)}
.gGrid{display:grid;grid-template-columns:repeat(auto-fill,72px);gap:8px;justify-content:center;width:min(1240px,94vw);max-height:52vh;overflow-x:hidden;overflow-y:auto;padding:4px;scrollbar-width:thin;scrollbar-color:rgba(235,240,248,.22) transparent}
.gGrid::-webkit-scrollbar{width:8px}
.gGrid::-webkit-scrollbar-track{background:transparent}
.gGrid::-webkit-scrollbar-thumb{background:rgba(235,240,248,.18);border-radius:4px}
.gTile{width:72px;height:72px;border:1px solid rgba(255,255,255,.07);background:radial-gradient(circle at 50% 40%,rgba(255,255,255,.035),transparent 70%);display:flex;align-items:center;justify-content:center;transition:border-color .15s,background .15s}
.gTile:hover{border-color:rgba(235,240,248,.45)}
/* The art plane is a 200x260 box scaled down into the tile; clipped here so its unscaled layout box
   never widens the grid into a scrollbar. Locked = a faint pale silhouette of the real thing. */
.gTileArt{width:60px;height:60px;position:relative;overflow:hidden;filter:brightness(0) invert(1) opacity(.14)}
.gTile.got .gTileArt{filter:none}
.gTile.got{border-color:rgba(235,240,248,.16);background:radial-gradient(circle at 50% 40%,rgba(200,215,235,.10),transparent 72%)}
.gHover{height:1.6em;margin:1.4vh 0 .6vh;font-size:clamp(15px,1.3vw,20px);letter-spacing:.14em;color:#eef0f3}
.gBackOnly{margin-top:1vh}
.gItem,.gTab,.gDel{user-select:none;-webkit-user-select:none}
.gPause{position:fixed;inset:0;z-index:9990;background:rgba(2,3,5,.72);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;font-family:Cinzel,'Trajan Pro',Georgia,serif;color:#d9dce1}
.gOverlay{display:flex;flex-direction:column;align-items:center}
`;
