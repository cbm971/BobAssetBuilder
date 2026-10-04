/* ============================================================================
   ASSETS THAT SHIP WITH THE APP
   ----------------------------------------------------------------------------
   Everything in here is installed into the library the first time the app runs
   in a browser that doesn't have it yet — no downloading a file and importing it
   by hand. See installBundled() in App.js for the rules:

     - an id already in the library is NEVER touched, so editing one and saving
       keeps your version forever;
     - an id that was installed once and then deleted stays deleted (the ids that
       have been installed are remembered under "bundledSeeded"), so a deleted
       asset can't come crawling back on every reload.

   To ship another one: drop its .json next to this file and add it to the list.
   The files are plain asset saves — the same JSON the Download button writes —
   so they can still be opened by hand with Load → ⬆ Open a file.
   ========================================================================== */
import turtleShell from "./turtle-shell-jacket.json";

export const BUNDLED_ASSETS = [turtleShell];
