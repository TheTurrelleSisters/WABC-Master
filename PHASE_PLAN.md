# WABC Master — Phase Plan
## Repo: WABC-Master
## Source of truth: zip archives. GitHub is behind.

---

## Current Version: v1.2 (cache: wabc-v1.2)

---

## Repo Overview
Wide Area Ball Caller operator tool. VIEW ONLY. Shows the authoritative 75-ball sequence from DB that all players use. Shows connected player count. One functional control: Force All Players to Local.

## WABC Design Rules (permanent — never violate)
- Ball sequence lives in ball_call table, game_id='WABC'
- Sequence auto-renews when ball 75 is called OR Cover All occurs (triggered by games, not operator)
- Ball position is per-player local only — NEVER written to DB, NEVER broadcast
- WABC tool shows DB sequence snapshot — not live player positions
- Only operator control: Force Local (disconnects all players from WABC)
- No manual NEW CALL button — sequence is fully automatic

---

## Phase History

### v1.0 — Initial Build
- Splash + PIN screen
- Caller tab: ball grid display
- Status tab: connected players
- Controls tab: Force Local, Restore Wide, New Call button

### v1.1 — Presence Fix + WABC Code Removal from Progressive Operator
- Removed RESET POS button
- Presence re-sync fixed
- wabc_operator excluded from player presence count

### v1.2 — Architecture Correction
- Removed cmdNewCall() entirely — sequence is auto-managed by games
- Removed pos broadcast listener — ball position is per-player local, never reported
- Ball grid now shows full 75-ball sequence always visible (yellow=1-40, white=41-75)
- No position dimming — WABC tool does not track player positions
- renderCaller updated: shows connected players + sequence issued time
- _updateBallHeader updated: shows sequence metadata not position
- Controls tab: only Force Local / Restore Wide remain
- Cache bust: wabc-v1.2

---

## Pending
- [ ] Connected player count verified live with multiple game clients
- [ ] Force Local tested end-to-end — games switch to local, badge updates
- [ ] Restore Wide tested — games reconnect to WABC sequence
- [ ] New sequence auto-display when games trigger renewal at ball 75

---

## Rules
- ES5 only
- View only tool — no game state modifications except Force Local/Restore Wide
- Cache bust on every single build
