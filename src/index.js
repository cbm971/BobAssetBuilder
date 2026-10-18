import React from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { isGameAddress } from './gameFront';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

// NO StrictMode, on purpose (2026-09-18). Blake plays the DEV build (StackBlitz runs `npm start`),
// and StrictMode double-invokes every render in dev: the playtest loop re-renders the whole studio
// once per frame, so every frame's render ran twice and produced twice the garbage — measured on
// Trailor Park M7 at ~3,200 React elements a frame against ~1,600 without it. It never shipped a
// bug report he could read, and the checks it exists for (effects that don't clean up, legacy
// APIs) are not what this app fails on. Everything that was written to survive the double effect
// run (the loop's __ptLoopGen guard, the staged neighbour mount) still works with a single one.
//
// THE GAME (2026-10-17): the same app at the /game address is Bob Okay as players get it — the
// title, the main menu and a run, with none of the studio (see src/gameFront.js).
// A crash in the GAME used to be a plain black screen with the reason only in the console. Now the
// reason is on the screen (and Reload is one click), so a black screen can be reported as words.
class GameCrash extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { if (typeof console !== "undefined") console.error("[BOB] crashed:", err); }
  render() {
    if (!this.state.err) return this.props.children;
    const msg = String((this.state.err && (this.state.err.stack || this.state.err.message)) || this.state.err).slice(0, 900);
    return (
      <div style={{ position: "fixed", inset: 0, background: "#000", color: "#f2f2ee", padding: 32, font: "14px/1.5 Consolas, monospace", overflow: "auto", zIndex: 200000 }}>
        <div style={{ fontSize: 22, marginBottom: 12 }}>BOB stopped</div>
        <pre style={{ whiteSpace: "pre-wrap", color: "#ffb0a0" }}>{msg}</pre>
        <button style={{ marginTop: 16, padding: "8px 18px", font: "inherit", cursor: "pointer" }} onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}
const isGame = isGameAddress(window.location);
// Errors thrown outside rendering (a click handler, a timer) never reach the boundary above and used to
// leave a black screen too. They get a small strip that does not block play; click it to dismiss.
if (isGame) {
  window.addEventListener("error", (e) => {
    const m = String((e.error && (e.error.stack || e.error.message)) || e.message || "");
    if (!m || /ResizeObserver/.test(m) || document.getElementById("bobCrashStrip")) return;
    const d = document.createElement("div");
    d.id = "bobCrashStrip";
    d.style.cssText = "position:fixed;left:0;bottom:0;right:0;max-height:40vh;overflow:auto;z-index:200000;background:#300;color:#fdd;font:12px/1.4 Consolas,monospace;padding:8px 12px;white-space:pre-wrap;cursor:pointer";
    d.textContent = "BOB error (click to dismiss)\n" + m.slice(0, 700);
    d.onclick = () => d.remove();
    document.body.appendChild(d);
  });
}
root.render(isGame ? <GameCrash><App game={true} /></GameCrash> : <App game={false} />);
