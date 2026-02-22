# Agent Handoff — Cycling Game (22. feb 2026)

---

## RULES — MUST BE FOLLOWED AT ALL TIMES

1. **Minimal fixes only.** Fix the exact reported bug. Do not refactor, clean up, rename, or "improve" surrounding code that is not broken.
2. **One bug at a time.** Confirm the fix works before moving to the next issue.
3. **Never touch working code.** If a feature is not mentioned as broken, leave it alone.
4. **No new files unless explicitly asked.** Do not create helper files, docs, or components unless the user directly requests it.
5. **Always commit after a fix is confirmed.** Use a short, descriptive commit message explaining what was broken and how it was fixed.
6. **Do not merge branches.** The user controls branch strategy. Ask if unsure.
7. **Do not push unless asked.** Commit locally first, push only when user says so.
8. **English only in code.** All variable names, comments, log messages, and UI strings must be in English.
9. **Ask before making any structural changes** (state shape, Firebase schema, function signatures beyond the minimum needed).
10. **Test with the 2TK-MK mode** (activates `TestMode.js`) for single-player logic, and the real multiplayer flow for multiplayer bugs.

---

## Project Overview

**Cycling card game** — players draft riders, then race them across a track using card-based pace mechanics.

- **Framework**: React (Create React App), deployed on Vercel
- **Multiplayer**: Firebase Firestore real-time sync
- **Key files**:
  - `src/modes/MultiplayerGame.js` — main game UI (~12,900 lines), contains both HOST and JOINER logic
  - `src/game/gameLogic.js` — pure game engine (computeNonAttackerMoves, computeRiderValues, etc.)
  - `src/game/engine.js` — lower-level engine
  - `src/firebase/gameService.js` — Firebase helpers (createGame, joinGame, subscribeToGame)
  - `src/modes/TestMode.js` — single-player test mode (same engine as MultiplayerGame)
- **Run**: `npm start` in `/Users/jespersandersen/CyclingGame/cycling-game`
- **Active branch**: `multiplayer`
- **Main branch**: `main` (stable, pushed to GitHub/Vercel)

---

## Current Branch: `multiplayer`

HEAD: `7e286ee` — "fix: draft 3rd pick greyed out - stale closure uses wrong ridersPerTeam default"

This branch contains multiplayer-specific work. It is ahead of `main`. Do NOT fast-forward or merge into main without user instruction.

---

## Recent Fixes (all committed)

| Commit | Fix |
|--------|-----|
| `7e286ee` | Draft 3rd pick greyed out — stale closure in JOINER subscriber used `ridersPerTeam=2` default instead of real pool size. Fixed by adding `totalPicksOverride` param to `processNextPick`, passed as `pool.length` from Firebase. |
| `0497f3c` | Group 1 skipped when attacker broke away — `setPostMoveInfo(null)` race before `setTimeout` made "Next Round" appear prematurely. Fixed 3 attack-too-far buttons and guarded Next Round condition. |
| `9c10da6` | Lead rider cards not greyed out — `isLeading` checked `selected_value === maxSelectedValue` which fails at 0. Fixed to use `rider.takes_lead > 0` as primary check. |
| `5d78ec4` | `kort: 16` appearing in hand — exhaustion cards were `unshift`-ed into `updatedHandCards`. Fixed to always route them to `updatedDiscarded`. |

---

## Architecture Notes

### Firebase `players` array
Only contains **human** players. AI teams (`Comp1`, `Comp2`, etc.) are NOT stored in Firebase.
```js
// Structure per player in Firebase:
{ name: "PlayerName", team: "PlayerName", isHost: true/false }
// team === name always
```

### Draft system
- `draftPickSequence`: snake-draft array, e.g. `["Comp1","HEPKTV","fsd","fsd","HEPKTV","Comp1",...]`
- `processNextPick(remainingArg, teamsArg, selectionsArg, pickSequenceParam, gameModeOverride, playerNameOverride, multiplayerPlayersOverride, totalPicksOverride)`
- The 8th param `totalPicksOverride` was added in `7e286ee` to bypass stale closure. **Always pass `pool.length` when calling from Firebase subscribers.**
- `isHumanTeam` stops the AI auto-pick loop for ANY human player's turn (both HOST and JOINER), so each human picks via UI or Firebase sync.

### Stale closure pattern
The JOINER subscriber is set up inside `handleJoinGame`. It captures React state at creation time. To work around this:
- Pass values as explicit parameters to functions (not relying on closed-over state)
- Use `useRef` for values that must be current inside async callbacks (e.g. `gameInitializedRef`)

### HOST vs JOINER flow
- **HOST**: calls `confirmDraftAndStart` → writes `status: 'playing'` + `draftSelections` to Firebase
- **JOINER**: subscriber detects `status === 'playing'` → calls `initializeGame` locally with Firebase data
- Both players initialize independently from the same Firebase data

### `isDrafting` flag
The UI uses `isDrafting` to enable/disable rider click targets. It is set `false` in these places:
- When `selections.length >= totalPicksNeeded` in `processNextPick`
- When HOST calls `confirmDraftAndStart`
- When JOINER subscriber sees `status === 'playing' && !gameInitializedRef.current`
- Back button on draft screen

---

## Known Issues / Not Yet Fixed

None currently reported. Await user's next bug report.

---

## How to Test Multiplayer

1. `npm start` on this machine → HOST player (e.g. "fsd")
2. Open second browser tab or incognito → JOINER (e.g. "HEPKTV")
3. Use 3 teams (2 human + 1 AI = Comp1) and 3 riders per team for the full draft scenario
4. Check browser console for `🎯`, `🔄`, `📥`, `📤` log prefixes for draft/sync events
