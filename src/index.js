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
root.render(<App game={isGameAddress(window.location)} />);
