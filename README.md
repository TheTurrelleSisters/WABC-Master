# WABC — Wide Area Ball Caller
**Stray-Pup LLC / The Turrelle Sisters LLC**

Standalone PWA operator tool for the Gold Coins Casino wide area bingo ball call system.

---

## Why this repo exists

Ball position was previously written to the `ball_call` postgres table every 1.3 seconds
per active game client. Under load (3+ players) this saturated the Supabase CDC replication
pool, causing `PoolingReplicationError` queue timeouts and dropping Realtime connections
across ALL channels — including the jackpot-critical `progressive` and `progressive_commands`
channels.

**The fix:** Ball position advances are now sent over **Supabase Broadcast** (a pure
message-passing layer that bypasses postgres entirely). The `ball_call` table is only
written on meaningful state changes (new sequence, reset, force/restore).

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | WABC operator PWA — splash, PIN login, ball caller dashboard |
| `wabc.js` | Drop-in client library for game repos (StrayPups, TSBIGMUNNY) |
| `service-worker.js` | PWA caching — bump `CACHE_VER` on every deploy |
| `manifest.json` | PWA manifest |
| `icons/` | Copy from `progressive_operator` repo — same icon set |

---

## Setup

### 1. Create the GitHub repo

Create a new GitHub repo named `wabc` (or `wabc_operator`). Enable GitHub Pages
(Settings → Pages → Deploy from branch → `main` / `root`).

### 2. Drop in the icons

Copy the `icons/` folder from your `progressive_operator` repo into this repo root.
The PWA manifest references the same icon filenames.

### 3. Change the PIN

Open `index.html` and find line:
```js
var WABC_PIN = '7777';
```
Change to your preferred 4-digit PIN. This is independent of the progressive operator PIN.

### 4. Deploy

Commit all files and push. Your WABC dashboard will be live at:
```
https://<your-github-username>.github.io/wabc/
```

---

## Installing wabc.js in game repos

For each game repo (StrayPups $1, StrayPups $5, TSBIGMUNNY):

**Step 1** — Copy `wabc.js` into the game repo root (same level as `progressive.js`).

**Step 2** — In `index.html`, add the script tag immediately after the Supabase SDK
loads and before your game JS. The exact placement depends on your load order, but
it must come AFTER the Supabase SDK:

```html
<!-- After supabase SDK, before game JS -->
<script src="wabc.js?v=1.0"></script>
```

**Step 3** — In your game's spin/ball logic, replace any direct `ball_pos` DB writes
with WABC API calls:

```js
// OLD — wrote to postgres every 1.3s:
_client.rpc('update_ball_pos', { p_game_id: 'WABC', p_pos: newPos });

// NEW — no DB write, pure broadcast receive:
WABC.onChange(function(ballPos, sequence) {
  // ballPos is the current position (updated by operator WABC tool)
  // sequence[ballPos] is the next ball number
  renderBallGrid(sequence, ballPos);
});
```

**Step 4** — Initialize WABC after Progressive.init():

```js
Progressive.init(function() {
  WABC.init(function() {
    console.log('WABC connected, ball pos:', WABC.getBallPos());
  });
});
```

**Step 5** — Handle force/restore if your game uses local fallback:

```js
WABC.onForceLocal(function() {
  // Operator has forced all players to local ball call
  // Switch your game to local mode
  _useLocalBallCall = true;
});

WABC.onRestoreWide(function(sequence, issuedAt) {
  // Wide area restored — switch back
  _useLocalBallCall = false;
});
```

---

## How ball position works now

| Event | Before (broken) | After (fixed) |
|-------|-----------------|---------------|
| Ball advances every 1.3s | `UPDATE ball_call SET ball_pos = N` | Supabase Broadcast `pos` event |
| New 75-ball sequence | `INSERT/UPDATE ball_call` | DB write + Broadcast `new_call` |
| Reset position | `UPDATE ball_call SET ball_pos = 0` | DB write + Broadcast `reset_pos` |
| Force local | `INSERT progressive_commands` | DB write + Broadcast `force_local` |
| Restore wide | `UPDATE ball_call` + `INSERT progressive_commands` | Both + Broadcast `restore_wide` |

DB writes under 3-player load:
- **Before:** ~2–3 writes/second (every ball advance × every active player)
- **After:** ~0.013 writes/second (1 write per 75-ball cycle ÷ ~75 seconds)

---

## WABC Dashboard tabs

**Caller** — Live ball grid showing called/uncalled balls with Next Ball, Position,
and Remaining counts. Updates in real time as the game advances.

**Status** — Connected players per game, last spin times, connection health,
force/restore mode indicator, and session audit log.

**Controls** — Issue new sequence, reset ball position, force all players to local,
restore wide area. All actions broadcast instantly to all connected game clients.

---

## Versioning

| File | Version string | Where |
|------|---------------|-------|
| `index.html` | `v1.0` in splash `#splash-ver` | Update on every change |
| `service-worker.js` | `CACHE_VER = 'wabc-v1.0'` | Bump on every deploy |
| `wabc.js` | Comment header `v1.0` + `?v=` cache-bust in game repos | Bump when API changes |

---

## Supabase config

Uses the same project and anon key as all other Gold Coins Casino repos:
```
Project: gdmmoeggkqsvqnqyrubx
Broadcast channel: wabc-ballpos
Presence channel:  presence-lobby (shared with progressive controller)
```

No new Supabase tables or RPCs are needed. All existing `ball_call` RPCs
(`upsert_ball_call`, `update_ball_pos`, `get_ball_call_with_pos`) remain in use
for initial state fetch and checkpoint writes.
