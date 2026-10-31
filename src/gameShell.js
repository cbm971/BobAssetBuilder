// THE GAME'S SCREENS — title handoff, main menu, character select, Load Game, Options, Unlocks,
// Quit, the pause menu, Game Over and the floor-complete card (2026-10-17; the look redone
// 2026-10-18). The rules behind them are in gameFront.js; App.js owns the state and hands it in,
// and does the actual starting, loading and saving.
//
// THE LOOK is Blake's mock-up of 2026-10-18: "everything on a green menu", over "some Bob stuff
// going on in the background" with his ACTUAL characters. So every screen is a green panel — a
// flat field green (no patterns: he turned the striped first try down), an off-white border, a yellow ▶ on the lit row, Saira wide italic for the words (Russo One until 2026-10-18) and
// the BOB logo (Sarpanch, see public/index.html) on top — standing over one of his own levels
// with his Starter crew (dressed) and that level's units walking about in it — a different level
// behind each screen (SceneBackdrop; the levels and the walkers come from App.js menuSceneFor). It replaced the black Skyrim screen of 10-17.
// No emoji and no helper text under anything (his standing rule): a screen is its title and its
// rows. The one sentence any of them can show is a ⚠ about something actually wrong.
//
// EVERY SCREEN IS DRIVEN BY THE KEYBOARD AND THE MOUSE ALIKE: up/down (or W/S) moves, Enter / Space /
// E picks, Esc goes back, left/right turns a slider or a tab; hovering a row lights it. A game that
// starts from the keyboard must never need a reach for the mouse to get into it.
import React, { useEffect, useRef, useState } from "react";
import {
  GAME_MENU, menuStep, introRemainingMs, INTRO_OUT_MS, formatPlayTime, UNLOCK_TABS, unlockPool,
  starterRoster, pickStartLook, selectGridCols, selectGridFill, FIGHTER_PORTRAIT_FRAC, SOON_PORTRAIT_FRAC, gridStep, DIFFICULTIES, difficultyOf, stepMenuWalker, starterLock,
  starterStats, lookFloorMedals,
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

const useViewport = () => {
  const [vp, setVp] = useState(() => ({ w: typeof window !== "undefined" ? window.innerWidth : 1280, h: typeof window !== "undefined" ? window.innerHeight : 720 }));
  useEffect(() => {
    const f = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  return vp;
};

// The BOB logo, as on the title (three stacked copies; see .bobLogo in public/index.html).
export function BobLogo({ text = "BOB", className = "" }) {
  return <div className={"bobLogo " + className}><span className="bl1">{text}</span><span className="bl2">{text}</span><span className="bl3">{text}</span></div>;
}

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

// A screen: its contents on the green panel, centred over the scene (which the shell draws once,
// underneath every screen, so it keeps walking while you go in and out of Options).
function Panel({ children, className = "", wide }) {
  return (
    <div className="gBody">
      <div className={"gPanel gCenter" + (wide ? " wide" : "") + (className ? " " + className : "")}>{children}</div>
    </div>
  );
}

// ---------- the scene behind the menus ----------
// `scene` (App.js menuSceneFor): { id, w, h, cell, r0, viewRows, surface, layers, cast }. The level is
// drawn at the play view's own framing (viewRows tall, whatever the window), the camera drifts
// slowly from one end of it to the other and back, and each of the cast walks the ground on
// stepMenuWalker. React re-renders only this component per frame, and only the walkers in it
// change: `layers` is one element built once, so React skips the whole level every time.
export const MENU_PAN_PX_PER_S = 22;
export const MENU_PHASE_STEPS = 16; // the walk cycle is drawn in 16 cached frames per walker
function SceneBackdrop({ scene, vp }) {
  const [, setTick] = useState(0);
  const st = useRef(null);
  useEffect(() => {
    if (!scene) return undefined;
    st.current = {
      t: 0,
      walkers: scene.cast.map((c) => {
        const col = Math.max(0, Math.min(scene.surface.length - 1, Math.floor(c.x / scene.cell)));
        return { ...c, foot: (scene.surface[col] != null ? scene.surface[col] : scene.r0 + scene.viewRows - 6) * scene.cell, idle: Math.random() * 2, phase: Math.random() * 6, walking: false };
      }),
    };
    let raf = 0, last = performance.now(), drawn = 0;
    const loop = (now) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      const s = st.current;
      s.t += dt;
      s.walkers = s.walkers.map((w) => stepMenuWalker(w, dt, scene.surface, scene.cell));
      // At most ~60 redraws a second; his screen runs at 165 and the walkers gain nothing from it.
      if (now - drawn >= 15) { drawn = now; setTick((n) => (n + 1) % 1e9); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [scene]);
  if (!scene || !st.current) return <div className="gScene" />;
  const s = Math.max(0.25, vp.h / (scene.viewRows * scene.cell));
  const viewW = vp.w / s;
  const range = Math.max(0, scene.w - viewW);
  const period = Math.max(40, (2 * range) / MENU_PAN_PX_PER_S);
  const camX = range * (0.5 - 0.5 * Math.cos((2 * Math.PI * st.current.t) / period));
  const tx = -Math.round(camX * s * 2) / 2, ty = -Math.round(scene.r0 * scene.cell * s * 2) / 2;
  return (
    <div className="gScene">
      <div className="gSceneWorld" style={{ width: scene.w, height: scene.h, transform: "translate3d(" + tx + "px," + ty + "px,0) scale(" + s + ")" }}>
        {scene.layers}
        {st.current.walkers.map((w) => {
          if (w.x + w.w < camX - scene.cell * 4 || w.x - w.w > camX + viewW + scene.cell * 4) return null;
          const step = w.walking ? Math.floor(((w.phase / (2 * Math.PI)) % 1) * MENU_PHASE_STEPS) : -1;
          return (
            <div key={w.key} className="playerWrap enemySpawn" style={{ left: w.x - w.cf * w.w, top: w.foot - w.h + w.anchor, width: w.w, height: w.h, pointerEvents: "none", transform: w.flipFor(w.dir) ? "scaleX(-1)" : undefined }}>
              {w.art(step)}
            </div>
          );
        })}
      </div>
      <div className="gSceneShade" />
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
// The mock-up's layout: the panel down the left, the scene open to the right of it. `at` lives in
// the shell, so coming back from Options or Unlocks lands on the row you left by.
function MainMenu({ go, note, click, at, setAt }) {
  const pick = (r) => { click(); go(r.id === "new" ? "select" : r.id); };
  useMenuKeys(true, { move: (d) => setAt((i) => menuStep(GAME_MENU, i, d)), pick: () => pick(GAME_MENU[at]) });
  return (
    <div className="gBody gBodyMain">
      <div className="gPanel gMainPanel">
        <BobLogo className="gLogoMenu" />
        <div className="gKicker">Main Menu</div>
        <MenuList rows={GAME_MENU} at={at} setAt={setAt} onPick={pick} className="gMain" />
      </div>
      {note ? <div className="gWarn">⚠ {note}</div> : null}
    </div>
  );
}

// A padlock, drawn (no emoji in the menus).
const Padlock = ({ size }) => (
  <svg className="gPadlock" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    <rect x="4" y="10" width="16" height="12" rx="2" fill="currentColor" />
    <rect x="11" y="14" width="2" height="4" rx="1" fill="#111" />
  </svg>
);

// A floor's medal on the player card, drawn (no emoji in the menus). A floor with a picture
// (gameFront.js floorIcon) is drawn as a thin OUTLINE of it — the Trailor Park a little trailer,
// Vietnam an army helmet (Blake, 2026-10-25; the trailer replaced his first "sort of T symbol").
// Beaten on Easy, the picture fills in white; Medium gives it a yellow outline, Hard a red one. Any
// other floor gets its first letter in the logo face. NO COIN behind it (Blake, 2026-10-25: "Get rid
// of the ugly coin thing they are all inside. Make the outline less bold") — the picture stands on
// the card by itself, so the viewBox is cropped to the picture.
// Each picture is a list of shapes; `line` ones are strokes only (never filled).
const MEDAL_ICONS = {
  // A 60s canned-ham trailer side on: round-shouldered body with a window and a door cut out, the
  // hitch tongue off the front, one wheel.
  trailer: [
    { d: "M8.5 24.5V18A5.5 5.5 0 0 1 14 12.5H22.5A4.5 4.5 0 0 1 27 17V22.2L32 23.6V25L27 24.5Z M11.2 15.6H16.4V19.2H11.2Z M19.8 15.6H23.8V22.2H19.8Z" },
    { circle: [15.5, 25.4, 2.6] },
  ],
  // An M1 helmet side on: the dome with its flared brim, a band round it, and the chin strap.
  helmet: [
    { d: "M7.5 25.2Q7.5 23.2 10 22.9C10.6 15.6 14.8 11.5 20 11.5C25.2 11.5 29.4 15.6 30 22.9Q32.5 23.2 32.5 25.2Z M11 19.6H29V21H11Z" },
    { d: "M12.5 25.2Q20 31.5 27.5 25.2", line: true },
  ],
};
const medalShapes = (icon, cls) => MEDAL_ICONS[icon].map((s, i) => (s.circle
  ? <circle key={i} className={cls} cx={s.circle[0]} cy={s.circle[1]} r={s.circle[2]} />
  : <path key={i} className={cls + (s.line ? " line" : "")} d={s.d} fillRule="evenodd" />));
const FloorMedal = ({ mark, icon, done, diff, size, title }) => (
  <svg className={"gMedal" + (done ? " done" : "") + (done && diff === "medium" ? " medium" : "") + (done && diff === "hard" ? " hard" : "")} width={size} height={size} viewBox="6 6 28 28" role="img" aria-label={title}>
    <title>{title}</title>
    {icon && MEDAL_ICONS[icon]
      ? <g>{medalShapes(icon, "gMedalPic")}</g>
      : <text className="gMedalMark" x="20" y="26" textAnchor="middle" fontSize="17">{mark}</text>}
  </svg>
);

// ---------- New Game: the character select ----------
// Super Smash Bros., as Blake asked: a box per fighter, its HEAD filling it ("pretty much neck up")
// and the name on a black plate along its foot, the lit one ringed in yellow with a P1 tag; the one
// you are on stands full size in the P1 card bottom-left, DRESSED — a random shirt and pants on
// (renderDressed, App.js gameDressed), "how they would look if fully dressed". Below the boxes, the difficulty — Easy, Medium, Hard, each with
// its lives drawn as the lit fighter's own HEAD (the HUD draws them the same way; the 🐱 symbol is
// the Extra Lives ability's and only that) — and START. Beside the P1 card, the PLAYER CARD: the
// fighter's starting stats, as the HUD's own symbols, and a medal per floor they have beaten.
// Two steps for the keyboard: pick a fighter (arrows, Enter), then the difficulty (left/right,
// Enter starts; Esc or up goes back to the fighters). The mouse can do either at any time.
// LOCKED fighters (gameFront.js STARTER_LOCKS: Bobby, Bobert, Roberta, Rob, Viet Bob, Bob Li) stand
// in the grid as a dark silhouette under a padlock, AFTER every open one (starterRoster), and can be
// lit but not picked; the P1 card says what opens them.
// EVERY BOX IS THE FIGHTER DRESSED (Blake, 2026-10-24: the boxes should have "the randomized dressed
// look" too): the same random shirt and pants the P1 card wears (renderDressed — App.js gameDressed
// rolls them once per look per page), so a box and the card always agree. Locked boxes are that
// dressed fighter's silhouette.
// A short last row is finished with COMING SOON boxes (selectGridFill): Bob as he would look LOCKED
// (Blake, 2026-10-24, of the first try, a hollow outline of his whole body: "I mean outline of what
// Bob would look like if he was locked") — his dressed head as the same dark silhouette, but no
// padlock, since nothing opens it. They are not fighters — the arrows and the mouse never land on one.
// Back sits beside START, under Easy (Blake: "nestled between Easy and start").
function CharacterSelect({ assets, record, renderDressed, renderHead, statIcon, abilitiesOf, floors, difficulty, onStart, back, click, vp }) {
  const roster = React.useMemo(() => {
    const s = starterRoster(assets, record);
    if (s.length) return s;
    const one = pickStartLook(assets);
    return one ? [one] : [];
  }, [assets, record]);
  const [at, setAt] = useState(0);
  const [step, setStep] = useState("fighter");
  const [diff, setDiff] = useState(() => difficultyOf(difficulty).id);
  const cols = selectGridCols(roster.length);
  const box = Math.round(Math.max(92, Math.min(176, vp.w * 0.095, (vp.h * 0.36) / Math.ceil(Math.max(1, roster.length) / cols))));
  const artBox = Math.max(1, box - 8); // .gFighter carries a 4px border on each side
  const cur = roster[Math.min(at, roster.length - 1)] || null;
  const locks = React.useMemo(() => roster.map((a) => starterLock(a, record, assets)), [roster, record, assets]);
  const soon = selectGridFill(roster.length, cols);
  const soonLook = roster.find((a) => String(a.name || "").trim().toLowerCase() === "bob") || pickStartLook(assets);
  const curLock = cur ? locks[Math.min(at, roster.length - 1)] : null;
  const [shake, setShake] = useState(0);
  const refuse = () => { click(); setShake((n) => n + 1); };
  const di = DIFFICULTIES.findIndex((d) => d.id === diff);
  const start = () => { if (!cur) return; if (curLock) { refuse(); setStep("fighter"); return; } click(); onStart(cur, diff); };
  useMenuKeys(true, step === "fighter" ? {
    move: (d) => setAt((i) => gridStep(roster.length, cols, i, 0, d)),
    side: (d) => setAt((i) => gridStep(roster.length, cols, i, d, 0)),
    pick: () => { if (!cur) return; if (curLock) { refuse(); return; } click(); setStep("diff"); },
    back: () => { click(); back(); },
  } : {
    side: (d) => { click(); setDiff(DIFFICULTIES[(di + d + DIFFICULTIES.length) % DIFFICULTIES.length].id); },
    move: (d) => { if (d < 0) { click(); setStep("fighter"); } },
    pick: start,
    back: () => { click(); setStep("fighter"); },
  });
  const p1 = Math.round(Math.max(200, Math.min(400, vp.h * 0.4)));
  // The name on the P1 card shrinks to fit it: BOBERT and ROBERTA ran off the card's edge.
  const p1Name = cur ? String(cur.name || "").toUpperCase() : "";
  const p1NamePx = Math.round(Math.min(Math.max(26, Math.min(52, vp.w * 0.03)), (p1 * 0.82 * 0.86) / (Math.max(3, p1Name.length) * 0.9)));
  const stats = cur ? starterStats(cur) : [];
  const medals = cur ? lookFloorMedals(record, cur.name, floors) : [];
  const abilities = cur && abilitiesOf ? abilitiesOf(cur) : [];
  const silBlur = Math.max(2, Math.round(p1 * 0.009)); // the locked silhouette's smoothing, in px of the art box
  const statPx = Math.round(Math.max(16, Math.min(30, p1 * 0.072)));
  const medalPx = Math.round(Math.max(36, Math.min(68, p1 * 0.17)));
  const headPx = 18;
  return (
    <div className="gBody gSelect">
      <div className="gSelHead"><span>Select Character</span></div>
      <div className="gRoster" style={{ gridTemplateColumns: "repeat(" + cols + "," + box + "px)" }}>
        {roster.map((a, i) => (
          <div key={a.id + (i === at && locks[i] ? ":" + shake : "")} role="button" className={"gFighter" + (i === at ? " on" : "") + (i === at && step === "diff" ? " locked" : "") + (locks[i] ? " shut" : "") + (i === at && locks[i] && shake ? " no" : "")} style={{ width: box, height: Math.round(box * 1.12) }}
            onMouseEnter={() => { if (step === "fighter") setAt(i); }}
            onClick={() => { setAt(i); if (locks[i]) { refuse(); setStep("fighter"); return; } click(); setStep("diff"); }}>
            <div className="gFighterArt" style={{ width: artBox, height: artBox }}>{renderDressed(a, artBox, FIGHTER_PORTRAIT_FRAC)}</div>
            {locks[i] && <div className="gFighterLock"><Padlock size={Math.round(box * 0.34)} /></div>}
            <div className="gFighterName" style={{ fontSize: Math.max(11, Math.round(box * 0.12)) }}><span>{a.name}</span></div>
            {i === at && <div className="gP1Tag">P1</div>}
          </div>
        ))}
        {Array.from({ length: soon }, (_, i) => (
          <div key={"soon" + i} className="gFighter shut gSoon" style={{ width: box, height: Math.round(box * 1.12) }}>
            {soonLook && <div className="gFighterArt" style={{ width: artBox, height: artBox }}>{renderDressed(soonLook, artBox, SOON_PORTRAIT_FRAC)}</div>}
            <div className="gFighterName" style={{ fontSize: Math.max(10, Math.round(box * 0.085)) }}><span>Coming Soon</span></div>
          </div>
        ))}
        {!roster.length && <div className="gEmpty">No characters</div>}
      </div>
      <div className="gSelFoot">
        <div className="gP1Card" style={{ width: Math.round(p1 * 0.82), height: p1 }}>
          {curLock && <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true"><filter id="gSilhouette" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" /><feGaussianBlur stdDeviation={silBlur} /><feComponentTransfer><feFuncA type="linear" slope="16" intercept="-7.5" /></feComponentTransfer></filter></svg>}
          {cur && <div className={"gP1Art" + (curLock ? " shut" : "")} style={{ width: Math.round(p1 * 0.82), height: Math.round(p1 * 0.82) }}>{renderDressed(cur, Math.round(p1 * 0.82))}</div>}
          {curLock && <div className="gP1Lock"><Padlock size={Math.round(p1 * 0.22)} /></div>}
          <div className="gP1Name" style={{ fontSize: p1NamePx }}><BobLogo text={p1Name} /></div>
          {curLock && <div className="gP1Need" style={{ bottom: "calc(6% + " + Math.round(p1NamePx * 1.15) + "px)" }}><span>{curLock.need}</span>{curLock.of ? <b>{curLock.have.toLocaleString("en-US")} / {curLock.of.toLocaleString("en-US")}</b> : null}</div>}
          <div className="gP1Badge">P1</div>
        </div>
        {cur && (
          <div className="gPCard" style={{ height: p1, fontSize: statPx }}>
            <div className="gPStats">
              {stats.map((s) => (
                <div key={s.k} className="gPStat">
                  <span className="gPStatIcon">{statIcon(s.k, statPx)}</span>
                  <span className="gPStatLbl">{s.l}</span>
                  <b>{s.v}</b>
                </div>
              ))}
            </div>
            {medals.length > 0 && (
              <div className="gPFloors">
                {medals.map((m) => <FloorMedal key={m.floor} mark={m.mark} icon={m.icon} done={m.done} diff={m.diff} size={medalPx} title={m.floor} />)}
              </div>
            )}
          </div>
        )}
        {abilities.length > 0 && (
          <div className="gPCard gAbil" style={{ height: p1, fontSize: statPx }}>
            <div className="gAbilHead">Abilities</div>
            <div className="gAbilList">{abilities.map((n) => <div key={n} className="gAbilRow">{n}</div>)}</div>
          </div>
        )}
        <div className={"gDiffBox" + (step === "diff" ? " live" : "")}>
          <div className="gDiffRow">
            {DIFFICULTIES.map((d) => (
              <div key={d.id} role="button" className={"gDiff" + (d.id === diff ? " on" : "")} onClick={() => { click(); setDiff(d.id); setStep("diff"); }}>
                <span className="gDiffTxt">{d.label}</span>
                <span className={"gDiffLives" + (curLock ? " shut" : "")}>{cur && Array.from({ length: d.lives }, (_, i) => <i key={i} style={{ width: headPx, height: headPx }}>{renderHead(cur, headPx)}</i>)}</span>
              </div>
            ))}
          </div>
          <div className="gSelGo">
            {/* Back, on the screen as every other menu has it (Blake: "there is no way to back out of NEW
                GAME"; Esc always did). It leaves the screen; Esc leaves the difficulty step first. */}
            <div role="button" className="gSelBack" onClick={() => { click(); back(); }}><span>Back</span></div>
            <div role="button" className={"gStart" + (step === "diff" ? " ready" : "") + (curLock ? " shut" : "")} onClick={start}><span>Start</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Load Game ----------
function LoadGame({ saves, onLoad, onDelete, back, click }) {
  const [at, setAt] = useState(0);
  const [arm, setArm] = useState(null); // the save id a second Delete will remove
  const rows = [
    ...saves.map((s) => {
      const d = difficultyOf(s.difficulty);
      return {
        id: s.id, save: s,
        label: <><span className="gSaveName">{s.lookName || "Bob"}</span><span className="gSaveWhere">{s.levelName || s.floor || ""}</span></>,
        right: <span className="gSaveMeta">{d.label}<i>·</i>Score {fmtNum(s.score && s.score.total)}<i>·</i>{formatPlayTime(s.playSecs)}<i>·</i>{fmtWhen(s.savedAt)}</span>,
      };
    }),
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
    <Panel wide>
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
    </Panel>
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
// onUpload (main menu only): async (File) => short result text. Takes a file the studio exported
// (Export everything, or one asset) and updates the game's items from it — App.js gameUploadFile.
export function OptionsPanel({ options, setOptions, back, click, overlay, onUpload }) {
  const [at, setAt] = useState(0);
  const [upStatus, setUpStatus] = useState("");
  const fileRef = useRef(null);
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
    ...(onUpload ? [{ id: "upload", label: "Upload File", right: upStatus ? <b className="gToggle gUpStatus">{upStatus}</b> : null }] : []),
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
    else if (r.id === "upload") { click(); if (fileRef.current) fileRef.current.click(); }
  };
  const picked = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = ""; // the same file can be chosen again after it is edited
    if (!f || !onUpload) return;
    setUpStatus("Working");
    try { setUpStatus(await onUpload(f)); } catch { setUpStatus("Could not read that file"); }
  };
  useMenuKeys(true, { move: (d) => setAt((i) => menuStep(rows, i, d)), side: nudge, pick: () => pick(rows[at]), back });
  const body = (
    <>
      <div className="gHead">Options</div>
      <MenuList rows={rows} at={at} setAt={setAt} onPick={pick} className="gOpts" />
      {onUpload && <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={picked} />}
    </>
  );
  return overlay ? <div className="gPanel gCenter">{body}</div> : <Panel>{body}</Panel>;
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
    <Panel wide>
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
      <div className="gHover">{hover || " "}</div>
      <MenuList rows={[{ id: "__back", label: "Back" }]} at={0} setAt={() => {}} onPick={() => { click(); back(); }} className="gBackOnly" />
    </Panel>
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
  return <div className="gScreen gBlack">{shown && <BobLogo className="gLogoQuit" />}</div>;
}

// ---------- the floor-complete card ----------
function FloorDone({ done, onContinue, click }) {
  const rows = [{ id: "continue", label: "Continue" }];
  useMenuKeys(true, { pick: () => { click(); onContinue(); }, back: () => { click(); onContinue(); } });
  return (
    <Panel>
      <BobLogo text="FLOOR COMPLETE" className="gBanner" />
      {done.floor ? <div className="gSub">{done.floor}</div> : null}
      <div className="gStats gStatsBig">
        <span>Score <b>{fmtNum(done.score)}</b></span>
        <span>Time <b>{formatPlayTime(done.secs)}</b></span>
      </div>
      <MenuList rows={rows} at={0} setAt={() => {}} onPick={() => { click(); onContinue(); }} className="gBackOnly" />
    </Panel>
  );
}

// ---------- Game Over ----------
// Out of lives (gameFront.js DIFFICULTIES). Retry starts the same run again from its first level —
// same fighter, same difficulty, same seed, a full set of lives; Main Menu leaves it. The run's
// checkpoint is already gone (App.js gameGameOver): out of lives is the end of that run, or Hard
// would mean nothing.
function GameOver({ over, onRetry, onMenu, click }) {
  const [at, setAt] = useState(0);
  const rows = [{ id: "retry", label: "Retry" }, { id: "menu", label: "Main Menu" }];
  const pick = (r) => { click(); if (r.id === "retry") onRetry(); else onMenu(); };
  useMenuKeys(true, { move: (d) => setAt((i) => menuStep(rows, i, d)), pick: () => pick(rows[at]), back: () => { click(); onMenu(); } });
  return (
    <Panel className="gOver">
      <BobLogo text="GAME OVER" className="gBanner" />
      <div className="gSub">{[over.lookName, difficultyOf(over.difficulty).label, over.floor].filter(Boolean).join("  ·  ")}</div>
      <div className="gStats gStatsBig">
        <span>Score <b>{fmtNum(over.score)}</b></span>
        <span>Time <b>{formatPlayTime(over.secs)}</b></span>
      </div>
      <MenuList rows={rows} at={at} setAt={setAt} onPick={pick} />
    </Panel>
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
      <div className="gPanel gCenter">
        <div className="gHead">Paused</div>
        <MenuList rows={rows} at={at} setAt={setAt} onPick={pick} />
      </div>
    </div>
  );
}

// ---------- the shell: whichever menu screen is up, over the scene ----------
export function GameShell({ view, setView, ready, saves, options, setOptions, record, assets, renderArt, renderDressed, renderHead, statIcon, abilitiesOf, floors, sceneFor, onStartGame, onLoad, onUpload, onDelete, floorDone, onFloorDoneContinue, gameOver, onRetry, onGameOverMenu, note, click }) {
  const toMenu = React.useCallback(() => setView("menu"), [setView]);
  const [menuAt, setMenuAt] = useState(0);
  const vp = useViewport();
  const sceneUp = view !== "title" && view !== "quit";
  // Each screen stands over its own level (App.js menuSceneFor). Keyed by the level, so a new screen
  // mounts a fresh backdrop — its own camera and its own cast — and fades it in.
  const scene = sceneUp && sceneFor ? sceneFor(view) : null;
  return (
    <div className="gRoot">
      <style>{GAME_CSS}</style>
      {sceneUp && <div className={"gScreen gStage" + (view === "menu" ? "" : " dim")}><SceneBackdrop key={scene ? scene.id : "none"} scene={scene} vp={vp} /></div>}
      {view === "title" && <TitleHandoff ready={ready} onDone={toMenu} />}
      {view === "menu" && <MainMenu go={setView} note={note} click={click} at={menuAt} setAt={setMenuAt} />}
      {view === "select" && <CharacterSelect assets={assets} record={record} renderDressed={renderDressed} renderHead={renderHead} statIcon={statIcon} abilitiesOf={abilitiesOf} floors={floors} difficulty={options.difficulty} onStart={onStartGame} back={toMenu} click={click} vp={vp} />}
      {view === "load" && <LoadGame saves={saves} onLoad={onLoad} onDelete={onDelete} back={toMenu} click={click} />}
      {view === "options" && <OptionsPanel options={options} setOptions={setOptions} back={toMenu} click={click} onUpload={onUpload} />}
      {view === "unlocks" && <Unlocks assets={assets} record={record} renderArt={renderArt} back={toMenu} click={click} />}
      {view === "quit" && <QuitScreen back={toMenu} />}
      {view === "floorDone" && floorDone && <FloorDone done={floorDone} onContinue={onFloorDoneContinue} click={click} />}
      {view === "gameOver" && gameOver && <GameOver over={gameOver} onRetry={onRetry} onMenu={onGameOverMenu} click={click} />}
    </div>
  );
}

// The sheet. The faces (Saira — wide, extra-bold, italic: the free face nearest the CA Magic Hour
// Blake named on 2026-10-18 for "Retro, 1970s", which is a paid font — Sarpanch, UnifrakturCook) are loaded by public/index.html for the
// game address only; offline they fall back to Impact / a plain sans and nothing else changes.
// Colours are fixed (a game screen, not a themed page): field green, off-white, one yellow.
export const GAME_CSS = `
.gRoot,.gPause{--gG1:#245535;--gG2:#183d25;--gG3:#102d1d;--gInk:#f4f3ea;--gDim:rgba(236,240,226,.74);--gEdge:#f1efe4;--gGold:#f7c531;font-family:Saira,'Russo One',Impact,'Arial Black',sans-serif;font-style:italic;font-stretch:125%;font-weight:800;color:var(--gInk);-webkit-font-smoothing:antialiased}
.gScreen{position:fixed;inset:0;background:#0a0c12;overflow:hidden;z-index:50}
.gScreen.gBlack{background:#000;z-index:60}
.gStage{z-index:40}
.gScene{position:absolute;inset:0;overflow:hidden;background:#0a0c12;animation:gSceneIn .5s ease both}
@keyframes gSceneIn{from{opacity:0}to{opacity:1}}
.gSceneWorld{position:absolute;left:0;top:0;transform-origin:0 0;isolation:isolate;will-change:transform}
.gSceneShade{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 120% 90% at 60% 45%,transparent 55%,rgba(0,0,0,.45) 100%);transition:background .4s}
.gStage.dim .gSceneShade{background:rgba(4,10,6,.48)}
.gBody{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3vh 16px;box-sizing:border-box;overflow-x:hidden;overflow-y:auto}
.gPanel{position:relative;box-sizing:border-box;background:var(--gG2);border:4px solid var(--gEdge);box-shadow:inset 0 0 0 2px var(--gG3),0 18px 48px rgba(0,0,0,.55),0 4px 0 rgba(0,0,0,.35);animation:gIn .45s ease both}
.gCenter{display:flex;flex-direction:column;align-items:center;max-width:100%;padding:clamp(18px,3vh,36px) clamp(18px,3vw,48px)}
.gCenter.wide{width:min(1100px,94vw)}
.gBodyMain{align-items:flex-start;padding-left:clamp(16px,5vw,110px)}
.gMainPanel{width:clamp(290px,27vw,500px);padding:clamp(16px,2.6vh,34px) clamp(16px,2vw,34px) clamp(16px,2.8vh,36px);display:flex;flex-direction:column;align-items:stretch}
@media (max-width:700px){.gBodyMain{align-items:center;padding-left:16px}.gMainPanel{width:min(500px,100%)}}
@keyframes gIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.bobLogo{display:inline-grid;font-family:Sarpanch,'Russo One',Impact,sans-serif;font-style:normal;font-stretch:normal;font-weight:900;line-height:.92;letter-spacing:.02em;white-space:nowrap;user-select:none}
.bobLogo>span{grid-area:1/1;padding:0 .1em;transform:skewX(-9deg)}
.bobLogo .bl1{color:#fff;-webkit-text-stroke:.16em #fff;filter:drop-shadow(.02em .05em .03em rgba(0,0,0,.6))}
.bobLogo .bl2{color:#4e8a57;-webkit-text-stroke:.07em #4e8a57}

.bobLogo .bl3{color:#4e8a57}
.gLogoMenu{font-size:clamp(70px,8.2vw,156px);align-self:center;margin:.02em 0 .06em}
.gLogoQuit{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:clamp(60px,9vw,140px);opacity:.22}
.gBanner{font-size:clamp(34px,4.6vw,78px);margin-bottom:2.2vh}
.gKicker{font-size:clamp(14px,1.25vw,22px);letter-spacing:.32em;text-align:center;text-transform:uppercase;color:var(--gInk);padding:.2em 0 .55em;margin:0 0 .6em;border-bottom:2px solid rgba(241,239,228,.7);box-shadow:0 1px 0 rgba(0,0,0,.25)}
.gList{display:flex;flex-direction:column;align-items:stretch;gap:.1em}
.gItem{position:relative;box-sizing:border-box;max-width:100%;display:flex;align-items:center;justify-content:flex-start;gap:1em;padding:.24em .5em .24em 1.35em;margin:0;cursor:pointer;font:inherit;font-size:clamp(20px,2.1vw,38px);letter-spacing:.03em;text-transform:uppercase;color:var(--gDim);text-shadow:0 3px 0 rgba(0,0,0,.35);transition:color .12s,background .12s;outline:none;border-radius:2px}
.gItem .gItemTxt{display:flex;align-items:baseline;gap:.8em;min-width:0}
.gItem::before{content:"";position:absolute;left:.3em;top:50%;width:0;height:0;border-top:.36em solid transparent;border-bottom:.36em solid transparent;border-left:.56em solid var(--gGold);transform:translate(-.3em,-50%);opacity:0;transition:opacity .12s,transform .12s;filter:drop-shadow(0 2px 0 rgba(0,0,0,.4))}
.gItem.on{color:#fff;background:linear-gradient(90deg,rgba(0,0,0,.24),rgba(0,0,0,0) 85%)}
.gItem.on::before{opacity:1;transform:translate(0,-50%);animation:gNudge 1s ease-in-out infinite}
@keyframes gNudge{50%{transform:translate(.12em,-50%)}}
.gItem.off{opacity:.35;cursor:default}
.gItemRight{margin-left:auto;font-size:.6em;letter-spacing:.04em;text-transform:none;color:var(--gDim);display:flex;align-items:center;gap:.6em}
.gCenter .gList{min-width:min(420px,80vw)}
.gHead{font-size:clamp(24px,2.6vw,44px);letter-spacing:.12em;text-transform:uppercase;color:#fff;text-shadow:0 3px 0 rgba(0,0,0,.35);margin-bottom:2.4vh;padding-bottom:.3em;border-bottom:2px solid rgba(241,239,228,.6);align-self:stretch;text-align:center}
.gSub{font-size:clamp(14px,1.3vw,22px);letter-spacing:.14em;text-transform:uppercase;color:var(--gDim);margin:-1vh 0 2.4vh;text-align:center}
.gWarn{position:fixed;bottom:4vh;left:0;right:0;z-index:51;text-align:center;font-family:Georgia,serif;font-size:16px;color:#ffe08a;text-shadow:0 2px 3px #000}
.gEmpty{font-size:clamp(15px,1.3vw,21px);letter-spacing:.12em;text-transform:uppercase;color:var(--gDim);margin-bottom:2.4vh}
.gSaves{display:flex;flex-direction:column;align-items:stretch;gap:.15em;width:100%}
.gSaveRow{position:relative;display:flex;align-items:center;gap:.5em}
.gSaveBtn{flex:1;min-width:0;font-size:clamp(16px,1.5vw,25px);border-top:1px solid rgba(255,255,255,.08)}
.gSaveBtn.gSaveBack{border-top:0}
.gSaveName{color:inherit}
.gSaveWhere{font-size:.68em;letter-spacing:.06em;color:var(--gDim)}
.gSaveMeta i{font-style:normal;opacity:.5;margin:0 .45em}
.gDel{flex:none;background:rgba(0,0,0,.2);border:2px solid rgba(241,239,228,.35);color:var(--gDim);font-size:13px;letter-spacing:.1em;text-transform:uppercase;padding:.35em .7em;cursor:pointer;opacity:0;transition:opacity .15s}
.gSaveRow.on .gDel,.gDel.arm{opacity:1}
.gDel.arm{color:#ffd0c4;border-color:#e06a4f;background:rgba(120,20,10,.35)}
.gOpts .gItem{min-width:min(640px,86vw)}
.gSlider{display:flex;align-items:center;gap:.9em}
.gUpStatus{font-size:.8em;text-transform:none;letter-spacing:.02em}
.gSlider b,.gToggle{font-weight:inherit;min-width:3.2em;text-align:right;color:#fff;font-size:1.25em}
.gSlider input[type=range]{-webkit-appearance:none;appearance:none;width:clamp(150px,17vw,280px);height:6px;background:linear-gradient(90deg,var(--gGold),rgba(241,239,228,.35));border-radius:3px;outline:none;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.3)}
.gSlider input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:3px;background:var(--gEdge);border:2px solid var(--gG3);cursor:pointer}
.gSlider input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:3px;background:var(--gEdge);border:2px solid var(--gG3)}
.gStats{display:flex;gap:2.2em;flex-wrap:wrap;justify-content:center;font-size:clamp(13px,1.15vw,19px);letter-spacing:.1em;text-transform:uppercase;color:var(--gDim);margin:-1vh 0 2.2vh}
.gStats b{color:#fff;font-weight:inherit;margin-left:.45em;letter-spacing:.04em}
.gStatsBig{font-size:clamp(17px,1.6vw,27px);margin:0 0 3.2vh}
.gTabs{display:flex;gap:1em;margin-bottom:1.6vh}
.gTab{border:2px solid transparent;font-size:clamp(15px,1.3vw,21px);letter-spacing:.08em;text-transform:uppercase;color:var(--gDim);padding:.3em .8em;cursor:pointer;transform:skewX(-8deg)}
.gTab span{font-size:.72em;margin-left:.5em}
.gTab.on{color:var(--gG3);background:var(--gGold);border-color:var(--gEdge)}
.gGrid{display:grid;grid-template-columns:repeat(auto-fill,72px);gap:8px;justify-content:center;width:100%;max-height:46vh;overflow-x:hidden;overflow-y:auto;padding:4px;scrollbar-width:thin;scrollbar-color:rgba(241,239,228,.35) transparent}
.gGrid::-webkit-scrollbar{width:8px}
.gGrid::-webkit-scrollbar-track{background:transparent}
.gGrid::-webkit-scrollbar-thumb{background:rgba(241,239,228,.3);border-radius:4px}
.gTile{width:72px;height:72px;border:2px solid rgba(241,239,228,.14);background:radial-gradient(circle at 50% 40%,rgba(255,255,255,.07),rgba(0,0,0,.18) 75%);display:flex;align-items:center;justify-content:center;transition:border-color .15s}
.gTile:hover{border-color:var(--gGold)}
/* The art plane is a 200x260 box scaled down into the tile; clipped here so its unscaled layout box
   never widens the grid into a scrollbar. Locked = a dark silhouette of the real thing. */
.gTileArt{width:60px;height:60px;position:relative;overflow:hidden;filter:brightness(0) opacity(.5)}
.gTile.got .gTileArt{filter:none}
.gTile.got{border-color:rgba(241,239,228,.4);background:radial-gradient(circle at 50% 40%,rgba(255,255,255,.16),rgba(0,0,0,.12) 75%)}
.gHover{height:1.6em;margin:1.2vh 0 .4vh;font-size:clamp(14px,1.2vw,19px);letter-spacing:.1em;text-transform:uppercase;color:#fff}
.gBackOnly{margin-top:.6vh}
.gItem,.gTab,.gDel,.gFighter,.gDiff,.gStart,.gSelBack{user-select:none;-webkit-user-select:none}
/* ---- the character select ---- */
.gSelect{justify-content:space-between;padding:3vh clamp(16px,3vw,56px) 4vh}
.gSelHead{align-self:stretch;display:flex;justify-content:space-between;align-items:center}
.gSelGo{align-self:stretch;display:flex;align-items:center;justify-content:space-between;gap:clamp(8px,1vw,16px)}
.gSelBack{cursor:pointer;font-size:clamp(17px,1.6vw,28px);min-width:clamp(110px,10vw,170px);box-sizing:border-box;text-align:center;text-transform:uppercase;letter-spacing:.06em;color:#fff;background:var(--gG2);border:3px solid rgba(241,239,228,.75);padding:.35em .9em;transform:skewX(-10deg);box-shadow:0 6px 0 rgba(0,0,0,.35);text-shadow:0 3px 0 rgba(0,0,0,.35);transition:background .12s,color .12s}
.gSelBack>span{display:inline-block;transform:skewX(10deg)}
.gSelBack:hover{background:var(--gGold);color:var(--gG3);text-shadow:none}
.gSelHead>span{display:inline-block;font-size:clamp(20px,2.3vw,40px);letter-spacing:.08em;text-transform:uppercase;color:#fff;background:var(--gG2);border:4px solid var(--gEdge);padding:.2em 1.2em .2em .9em;transform:skewX(-12deg);box-shadow:0 6px 0 rgba(0,0,0,.35);text-shadow:0 3px 0 rgba(0,0,0,.35)}
.gRoster{display:grid;gap:clamp(8px,1vw,16px);justify-content:center;padding:6px}
.gFighter{position:relative;box-sizing:border-box;overflow:hidden;cursor:pointer;background:var(--gG1);border:4px solid var(--gEdge);box-shadow:0 6px 0 rgba(0,0,0,.4);transition:transform .1s,box-shadow .1s,border-color .1s;animation:gIn .35s ease both}
.gFighterArt{position:absolute;left:0;top:0;overflow:hidden;pointer-events:none}
.gFighterArt>div{filter:drop-shadow(0 4px 0 rgba(0,0,0,.25))}
.gFighterName{position:absolute;left:-2px;right:-2px;bottom:-2px;background:#111;color:#fff;text-transform:uppercase;letter-spacing:.04em;text-align:center;padding:.38em .3em .3em;clip-path:polygon(0 22%,100% 0,100% 100%,0 100%);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gFighter.on{border-color:var(--gGold);transform:translateY(-4px);box-shadow:0 0 0 3px var(--gGold),0 0 26px rgba(247,197,49,.55),0 10px 0 rgba(0,0,0,.4);z-index:1}
.gFighter.locked{animation:gLock .5s ease}
.gFighter.shut{background:var(--gG3)}
.gFighter.shut .gFighterArt>div{filter:brightness(0) opacity(.55)}
.gFighter.no{animation:gNo .35s ease}
.gFighter.gSoon{cursor:default}
.gSoon .gFighterName{color:var(--gDim)}
@keyframes gNo{20%,60%{transform:translate(-5px,-4px)}40%,80%{transform:translate(5px,-4px)}}
.gFighterLock,.gP1Lock{position:absolute;left:0;right:0;display:flex;justify-content:center;pointer-events:none;color:var(--gEdge);filter:drop-shadow(0 3px 0 rgba(0,0,0,.5))}
.gFighterLock{top:28%}
.gP1Art.shut>div{filter:brightness(0) opacity(.6);filter:url(#gSilhouette) opacity(.6)}
.gP1Lock{top:30%;transform:skewX(4deg)}
.gP1Need{position:absolute;left:0;right:0;padding:0 9%;display:flex;flex-direction:column;align-items:center;text-align:center;gap:.15em;line-height:1.15;font-size:clamp(12px,.95vw,16px);letter-spacing:.06em;text-transform:uppercase;color:var(--gGold);text-shadow:0 2px 0 rgba(0,0,0,.5);transform:skewX(4deg)}
.gP1Need b{color:#fff;font-weight:inherit}
.gStart.shut{opacity:.35;animation:none;filter:grayscale(.7)}
@keyframes gLock{30%{transform:translateY(-4px) scale(1.08)}}
.gP1Tag{position:absolute;left:4px;top:4px;background:var(--gGold);color:#2a1d00;font-size:13px;padding:.15em .45em;border:2px solid #fff;transform:skewX(-10deg);box-shadow:0 2px 0 rgba(0,0,0,.4)}
.gSelFoot{align-self:stretch;display:flex;align-items:flex-end;justify-content:space-between;gap:2vw;flex-wrap:wrap}
.gP1Card{position:relative;overflow:hidden;box-sizing:border-box;flex:none;background:var(--gG2);border:4px solid var(--gEdge);box-shadow:0 10px 0 rgba(0,0,0,.4),inset 0 0 0 2px var(--gG3);transform:skewX(-4deg)}
.gP1Art{position:absolute;left:0;top:2%;overflow:hidden;transform:skewX(4deg)}
.gP1Art>div{filter:drop-shadow(0 6px 0 rgba(0,0,0,.3))}
.gP1Name{position:absolute;left:0;right:0;bottom:6%;display:flex;justify-content:center;transform:skewX(4deg)}
.gP1Name .bobLogo{font-size:1em}
.gP1Badge{position:absolute;left:8px;top:8px;font-family:Sarpanch,'Russo One',sans-serif;font-style:normal;font-stretch:normal;font-weight:900;font-size:clamp(20px,2vw,34px);color:var(--gGold);text-shadow:0 3px 0 rgba(0,0,0,.45);transform:skewX(4deg)}
.gDiffBox{display:flex;flex-direction:column;align-items:flex-end;gap:2vh;margin-left:auto}
.gDiffRow{display:flex;gap:clamp(8px,1vw,16px);flex-wrap:wrap;justify-content:flex-end}
.gDiff{display:flex;flex-direction:column;align-items:center;gap:.3em;min-width:clamp(110px,10vw,170px);box-sizing:border-box;padding:.5em .9em .55em;cursor:pointer;background:var(--gG2);border:3px solid rgba(241,239,228,.75);color:var(--gDim);transform:skewX(-10deg);box-shadow:0 6px 0 rgba(0,0,0,.35);transition:transform .1s,background .1s}
.gDiff>*{transform:skewX(10deg)}
.gDiffTxt{font-size:clamp(17px,1.6vw,28px);text-transform:uppercase;letter-spacing:.06em}
.gDiffLives{display:flex;gap:3px;min-height:18px;align-items:center}
.gDiffLives i{position:relative;overflow:hidden;flex:none;display:inline-block;font-style:normal}
.gDiffLives i>div{filter:drop-shadow(0 2px 0 rgba(0,0,0,.35))}
.gDiffLives.shut i>div{filter:brightness(0) opacity(.55)}
.gPCard{flex:none;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;gap:1.2vh;min-width:clamp(150px,11vw,220px);padding:.8em 1.1em .9em;background:var(--gG2);border:4px solid var(--gEdge);box-shadow:0 10px 0 rgba(0,0,0,.4),inset 0 0 0 2px var(--gG3);transform:skewX(-4deg)}
.gPCard>*{transform:skewX(4deg)}
.gAbil{min-width:clamp(150px,11vw,220px);max-width:22vw;overflow:hidden}
.gAbilHead{color:var(--gDim);text-transform:uppercase;letter-spacing:.1em;border-bottom:2px solid rgba(241,239,228,.2);padding-bottom:.5em}
.gAbilList{flex:1;display:flex;flex-direction:column;justify-content:space-around;gap:.3em;overflow:hidden}
.gAbilRow{text-transform:uppercase;letter-spacing:.06em;color:#fff;font-size:1.05em;line-height:1.1}
@media (max-width:1279px){.gAbil{display:none}}
.gPStats{flex:1;display:flex;flex-direction:column;justify-content:space-around}
.gPStat{display:flex;align-items:center;gap:.5em;line-height:1;text-transform:uppercase;letter-spacing:.06em;color:var(--gDim)}
.gPStatIcon{display:inline-flex;flex:none}
.gPStatLbl{flex:1}
.gPStat b{font-weight:inherit;color:#fff;font-size:1.15em;min-width:1.4em;text-align:right}
.gPFloors{display:flex;flex-wrap:wrap;gap:.35em;border-top:2px solid rgba(241,239,228,.2);padding-top:.6em}
.gMedal{flex:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.45))}
.gMedalMark{fill:rgba(241,239,228,.26);font-family:Sarpanch,'Russo One',Impact,sans-serif;font-style:normal;font-weight:900}
.gMedal.done .gMedalMark{fill:#f6f4ea}
.gMedal.medium .gMedalMark{stroke:#d9a300;stroke-width:1;stroke-linejoin:round}
.gMedal.hard .gMedalMark{stroke:#e5201b;stroke-width:1;stroke-linejoin:round}
.gMedalPic{fill:none;stroke:rgba(241,239,228,.5);stroke-width:.8;stroke-linejoin:round;stroke-linecap:round}
.gMedal.done .gMedalPic{fill:#f6f4ea;stroke:#f6f4ea}
.gMedal.medium .gMedalPic{stroke:#d9a300;stroke-width:1}
.gMedal.hard .gMedalPic{stroke:#e5201b;stroke-width:1}
.gMedal.done .gMedalPic.line{fill:none;stroke:#f6f4ea;stroke-width:.9}
.gMedalPic.line{fill:none}
.gDiff.on{background:var(--gGold);border-color:#fff;color:#1d2a12;transform:skewX(-10deg) translateY(-3px)}
.gDiffBox.live .gDiff.on{box-shadow:0 0 0 3px #fff,0 0 24px rgba(247,197,49,.6),0 8px 0 rgba(0,0,0,.35)}
.gStart{cursor:pointer;font-family:Sarpanch,'Russo One',sans-serif;font-style:normal;font-stretch:normal;font-weight:900;font-size:clamp(28px,3vw,54px);text-transform:uppercase;letter-spacing:.06em;color:#fff;background:linear-gradient(180deg,#d8452f,#a52a1a);border:4px solid var(--gEdge);padding:.08em 1.1em .12em;transform:skewX(-10deg);box-shadow:0 8px 0 rgba(0,0,0,.4);text-shadow:0 3px 0 rgba(0,0,0,.4);opacity:.7;transition:opacity .15s}
.gStart>span{display:inline-block;transform:skewX(10deg)}
.gStart:hover,.gStart.ready{opacity:1}
.gStart.ready{animation:gPulse 1s ease-in-out infinite}
@keyframes gPulse{50%{box-shadow:0 0 0 4px rgba(255,255,255,.5),0 0 30px rgba(216,69,47,.7),0 8px 0 rgba(0,0,0,.4)}}
@media (max-width:760px){.gSelFoot{justify-content:center}.gDiffBox{align-items:center;margin-left:0}}
.gPause{position:fixed;inset:0;z-index:9990;background:rgba(4,10,6,.6);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center}
`;
