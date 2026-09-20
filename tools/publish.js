#!/usr/bin/env node
// PUBLISH THE STUDIO TO ITS ONE PERMANENT ADDRESS: https://cbm971.github.io/BobAssetBuilder/
//
// Every library loss this project has had (2026-08-05, 09-10, 09-18, 09-20) was the StackBlitz
// preview address changing underneath a browser store that cannot follow it. GitHub Pages serves
// the app at an address that never changes, so the store never dies. This script is how a build
// gets there: it builds the production app under /BobAssetBuilder, puts the committed
// asset-data/library.json beside it as library.json (the seed a brand-new browser restores from —
// App.js falls back to it when there is no dev server /__library), and force-pushes the build
// directory as the gh-pages branch, which Pages is set to serve from (legacy "deploy from a
// branch" mode — a GitHub Actions workflow would do this on every push by itself, but the
// stored git credential on this machine has no `workflow` scope and cannot push one).
//
//   node tools/publish.js            (from the repo root, after tests + build are clean)
//
// RUN THIS AFTER EVERY PUSH TO THE PLAY BRANCH. Without it the published studio keeps running the
// previous build — never a data problem (his data lives in the browser store at that address and
// in his save folder), but a fix he is waiting for stays invisible to him.
"use strict";
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const run = (cmd, opts) => { console.log("> " + cmd); return execSync(cmd, { cwd: root, stdio: "inherit", ...opts }); };
const env = { ...process.env, PUBLIC_URL: "/BobAssetBuilder", CI: "false", MSYS_NO_PATHCONV: "1" };
run("npm run build", { env });
fs.copyFileSync(path.join(root, "asset-data", "library.json"), path.join(root, "build", "library.json"));
fs.writeFileSync(path.join(root, "build", ".nojekyll"), ""); // Pages must serve files starting with _ or . as they are
const wt = path.join(root, ".gh-pages-worktree");
if (fs.existsSync(wt)) { try { run(`git worktree remove --force "${wt}"`); } catch { fs.rmSync(wt, { recursive: true, force: true }); } }
// A fresh orphan branch every time: the site is a build product, its history is worthless, and a
// growing gh-pages history would just bloat every clone.
run(`git worktree add --detach "${wt}"`);
run("git checkout --orphan gh-pages", { cwd: wt });
run("git rm -rfq --cached .", { cwd: wt });
for (const f of fs.readdirSync(wt)) if (f !== ".git") fs.rmSync(path.join(wt, f), { recursive: true, force: true });
for (const f of fs.readdirSync(path.join(root, "build"))) fs.cpSync(path.join(root, "build", f), path.join(wt, f), { recursive: true });
run("git add -A", { cwd: wt });
run(`git -c user.email=cbm971@gmail.com -c user.name=cbm971 commit -q -m "Publish ${new Date().toISOString()} from ${execSync("git rev-parse --short HEAD", { cwd: root }).toString().trim()}"`, { cwd: wt });
run("git push --force origin HEAD:gh-pages", { cwd: wt });
run(`git worktree remove --force "${wt}"`);
console.log("published: https://cbm971.github.io/BobAssetBuilder/ (Pages serves it within a minute or two)");
