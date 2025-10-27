import { computeInitialStats, computeNonAttackerMoves, computeAttackerMoves, runSprintsPure } from './gameLogic.js';

// Lightweight engine wrapper that operates on plain JS objects and returns new states.
export function initializeFromFixture(fixture, rng = Math.random) {
  const track = fixture.track;
  const round = fixture.round || 0;
  const cards = JSON.parse(JSON.stringify(fixture.cards || {}));

  // compute initial stats (may mutate cards)
  computeInitialStats(cards, track, round, 3);

  return {
    cards,
    track,
    round,
    logs: []
  };
}

export function stepGroup(state, groupNum, rng = Math.random) {
  // state: { cards, track, round }
  const cardsObj = JSON.parse(JSON.stringify(state.cards));
  const track = state.track;
  const logs = [];

  // Determine simple teamPaces: for now, choose max non-attacker selected_value or fallback 2
  // but engine user can pre-set selected_value on cards to control pace.
  const groupRiders = Object.entries(cardsObj).filter(([, r]) => r.group === groupNum && !r.finished).map(([n, r]) => ({ name: n, ...r }));
  const nonAttackers = groupRiders.filter(r => r.attacking_status !== 'attacker');
  let maxPace = 0;
  for (const r of nonAttackers) {
    const v = Math.round(r.selected_value || 0);
    if (v > maxPace) maxPace = v;
  }
  if (maxPace === 0) maxPace = 2;

  const groupSpeed = Math.max(2, maxPace);
  // group's furthest position (not needed in this wrapper but kept for reference)
  // const groupPos = Math.max(...groupRiders.map(r => r.position));
  const slipstream = 0;

  try {
    const nonAtt = computeNonAttackerMoves(cardsObj, groupNum, groupSpeed, slipstream, track, rng);
    for (const [n, r] of Object.entries(nonAtt.updatedCards)) cardsObj[n] = r;
    logs.push(...(nonAtt.logs || []));

    const att = computeAttackerMoves(cardsObj, groupNum, groupSpeed, slipstream, track, rng);
    for (const [n, r] of Object.entries(att.updatedCards)) cardsObj[n] = r;
    logs.push(...(att.logs || []));

    // Post-move: apply simple slipstream catches using groups positions
    const groupsNewPositions = [...(nonAtt.groupsNewPositions || []), ...(att.groupsNewPositions || [])];
    for (const [name, r] of Object.entries(cardsObj)) {
      const moved = r.moved_fields || 0;
      if (moved >= groupSpeed) continue;
      const reachable = groupsNewPositions.filter(([pos, sv]) => pos > r.position && pos <= r.position + (sv || 0)).map(([pos]) => pos);
      if (reachable.length > 0) {
        const targetPos = Math.max(...reachable);
        r.position = targetPos;
        r.moved_fields = targetPos - (r.old_position || r.position);
        logs.push(`Post-adjust: ${name} -> ${targetPos}`);
      }
    }
  } catch (e) {
    logs.push('stepGroup error: ' + (e && e.message));
  }

  return { ...state, cards: cardsObj, logs };
}

export function runSprints(state, sprintGroup = null, rng = Math.random) {
  try {
    const res = runSprintsPure(state.cards, state.track, sprintGroup, state.round, [], 0, rng);
    return { ...state, cards: res.updatedCards, logs: res.logs || [] };
  } catch (e) {
    return { ...state, logs: [(e && e.message) || 'runSprints error'] };
  }
}

export function getState(state) {
  return JSON.parse(JSON.stringify(state));
}
