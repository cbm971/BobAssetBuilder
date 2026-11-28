# BOB's leaderboard service

One public board that every copy of the game reads and writes, wherever it is played. It is a
Cloudflare Worker (`worker.js`) with a D1 SQLite database (`schema.sql`), on Cloudflare's free plan:
100,000 requests a day, 5 GB of storage (tens of millions of runs), no card, and it never sleeps.
The rules it shares with the game are `src/leaderboard.js`; the game's screens are in
`src/gameShell.js` (PostScore, LeaderboardScreen).

**Live since 2026-11-28** at https://bob-leaderboard.bob-leaderboard.workers.dev, on Blake's
Cloudflare account (D1 database `bob-leaderboard`, id in `wrangler.toml`; secrets `ADMIN_KEY` and
`SALT`; the admin key's copy is `%LOCALAPPDATA%\BobOkay\leaderboard-admin-key.txt` on his PC).
Deploying a change is `npx wrangler deploy` from this folder after `npx wrangler login` (he clicks
Allow in his browser).

The game shows nothing of it (no name box, no menu row) while `LEADERBOARD_URL` in
`src/leaderboard.js` is empty.

## Test it locally

```
cd leaderboard
npm install
npx wrangler d1 execute bob-leaderboard --local --file=schema.sql
echo ADMIN_KEY=local-test-key > .dev.vars
npx wrangler dev --local --port 8787 --ip 127.0.0.1
```

Then open the game at `http://localhost:3000/bob/?mute&lb=http://127.0.0.1:8787` (the `lb` address
overrides `LEADERBOARD_URL` for that page; localStorage `bobLeaderboard` does the same).

## Deploy (once, on Blake's Cloudflare account)

```
cd leaderboard
npx wrangler login                                  # Blake approves in the browser
npx wrangler d1 create bob-leaderboard              # prints database_id: put it in wrangler.toml
npx wrangler d1 execute bob-leaderboard --remote --file=schema.sql
npx wrangler secret put ADMIN_KEY                   # a long random string; keep a copy in
                                                    # %LOCALAPPDATA%\BobOkay\leaderboard-admin-key.txt
npx wrangler deploy                                 # prints https://bob-leaderboard.<name>.workers.dev
```

Put the printed address in `LEADERBOARD_URL` (src/leaderboard.js), then test, push and publish as
usual. `node tools/leaderboard.js top` reads the live board; `recent` and `remove <id>` need the
admin key.

## Changing it later

- `schema.sql` is safe to re-run (every statement is `IF NOT EXISTS`). A new column needs an
  `ALTER TABLE` run by hand with `wrangler d1 execute --remote --command "..."`.
- `LB_BUCKET` in `src/leaderboard.js` must match the `score / 100` in the triggers (a test checks).
- The full release gets its own board: change `LEADERBOARD_BOARD`. The Beta's board stays as it was.
