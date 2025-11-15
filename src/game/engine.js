import { computeInitialStats, computeNonAttackerMoves, computeAttackerMoves, runSprintsPure, shuffle } from './gameLogic.js';

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
    // Debug: snapshot groupsNewPositions so we can see slipstream windows used
    logs.push(`DEBUG groupsNewPositions: ${JSON.stringify(groupsNewPositions.slice(0, 50))}`);

    // Snapshot positions before post-adjust
    try {
      const beforePos = Object.fromEntries(Object.entries(cardsObj).map(([n, r]) => [n, Number(r.position) || 0]));
      logs.push(`DEBUG positions_before_post_adjust: ${JSON.stringify(beforePos)}`);
    } catch (e) {
      // ignore
    }

    for (const [name, r] of Object.entries(cardsObj)) {
      const moved = r.moved_fields || 0;
      if (moved >= groupSpeed) continue;
      const reachable = groupsNewPositions
        .filter(([pos, sv]) => pos > r.position && pos <= r.position + (sv || 0))
        .map(([pos]) => pos);
      if (reachable.length > 0) {
        const targetPos = Math.max(...reachable);
        // Debug info about why we move this rider
        logs.push(`DEBUG post-adjust candidate: ${name} pos=${r.position} moved_fields=${moved} groupSpeed=${groupSpeed} reachable=${JSON.stringify(reachable)} -> ${targetPos}`);
        r.position = targetPos;
        r.moved_fields = targetPos - (r.old_position || r.position);
        logs.push(`Post-adjust: ${name} -> ${targetPos}`);
      }
    }

    // Snapshot positions after post-adjust and before Brosten enforcement
    try {
      const afterPost = Object.fromEntries(Object.entries(cardsObj).map(([n, r]) => [n, Number(r.position) || 0]));
      logs.push(`DEBUG positions_after_post_adjust: ${JSON.stringify(afterPost)}`);
    } catch (e) {}

    // Enforce Brosten capacity on final positions after post-adjust
    try {
      if (typeof track === 'string' && /\*$/.test(track)) {
        // delegate to helper so tests can call enforcement directly
        const res = enforceBrosten(cardsObj, track, groupNum, rng);
        logs.push(...(res.logs || []));
      }
    } catch (e) {
      logs.push('Brosten enforcement error: ' + (e && e.message));
    }
  } catch (e) {
    logs.push('stepGroup error: ' + (e && e.message));
  }

  return { ...state, cards: cardsObj, logs };
}

// Exported helper to enforce Brosten capacity on a cards object. Mutates cardsObj
// and returns an object { cards: cardsObj, logs: [] } so it can be tested in isolation.
export function enforceBrosten(cardsObj, track, groupNum, rng = Math.random) {
  const logs = [];
  try {
    const totalPeloton = Object.values(cardsObj).filter(r => !r.finished).length || 1;
    // Determine passed tokens for this moved group
    const passedTokens = new Set();
    for (const r of Object.values(cardsObj)) {
      try {
        if (!r || r.finished) continue;
        if (r.group !== groupNum) continue;
        const oldPos = Math.max(0, Math.round(Number(r.old_position || r.position) || 0));
        const newPos = Math.max(0, Math.round(Number(r.position) || 0));
        if (newPos <= oldPos) continue;
        for (let p = oldPos + 1; p <= newPos; p++) {
          const tok = (typeof track === 'string' && track[p]) ? track[p] : null;
          if (tok && ['0', '1', '2'].indexOf(tok) !== -1) passedTokens.add(tok);
        }
      } catch (e) { /* ignore per-rider issues */ }
    }

    let minAllowedFromPassed = null;
    if (passedTokens.size > 0) {
      // Map token -> fraction: '2' => 50%, '1' => 33%, '0' => 25%
      const allowedList = Array.from(passedTokens).map(tok => {
        let frac = 0.33;
        if (tok === '2') frac = 0.5;
        else if (tok === '1') frac = 0.33;
        else if (tok === '0') frac = 0.25;
        // Use floor to compute minimal allowed count (user expectation: 25% of 9 -> 2)
        return Math.max(1, Math.floor(totalPeloton * frac));
      });
      minAllowedFromPassed = Math.max(1, Math.min(...allowedList));
      logs.push(`Brosten: group ${groupNum} passed tokens ${Array.from(passedTokens).join(',')} -> applying minimal allowed=${minAllowedFromPassed}`);
    }

    // Iteratively enforce capacity per Brosten tile (cascade pushes backwards)
    let iteration = 0;
    while (true) {
      iteration++;
      const localPosMap = {};
      for (const [n, r] of Object.entries(cardsObj)) {
        const p = Math.max(0, Math.round(Number(r.position) || 0));
        localPosMap[p] = localPosMap[p] || [];
        localPosMap[p].push(n);
      }

      let anyChange = false;
      const positions = Object.keys(localPosMap).map(s => parseInt(s, 10)).sort((a, b) => b - a);
      for (const pos of positions) {
        const token = (typeof track === 'string' && track[pos]) ? track[pos] : null;
        if (!token || ['0','1','2'].indexOf(token) === -1) continue;

        const namesAtPos = localPosMap[pos] || [];
        const namesInGroup = namesAtPos.filter(nm => {
          const rr = cardsObj[nm];
          return rr && rr.group === groupNum && !rr.finished;
        });
        if (namesInGroup.length <= 0) continue;

        // Determine allowed slots for this token. If a minimal allowed from
        // passed tokens was computed earlier, use that. Otherwise compute
        // per-token fraction mapping. Use Math.floor to get the minimal
        // allowed count (but at least 1).
        const fracForToken = token === '2' ? 0.5 : (token === '1' ? 0.33 : (token === '0' ? 0.25 : 0.33));
        const defaultAllowed = Math.max(1, Math.floor(totalPeloton * fracForToken));
        const allowed = (minAllowedFromPassed !== null) ? minAllowedFromPassed : defaultAllowed;

        // Count how many riders already occupy this tile that are NOT part of the moved group.
        const existingOthers = namesAtPos.filter(nm => {
          const rr = cardsObj[nm];
          return rr && rr.group !== groupNum && !rr.finished;
        }).length;

        // Slots available for this moved group at this tile (cannot exceed allowed minus existing others)
        const slotsForGroup = Math.max(0, allowed - existingOthers);
        if (namesInGroup.length <= slotsForGroup) continue;

        logs.push(`Brosten capacity check pos=${pos} token=${token} totalPeloton=${totalPeloton} allowed=${allowed} existingOthers=${existingOthers} slotsForGroup=${slotsForGroup} groupMembers=[${namesInGroup.join(',')}]`);

        // Build and sort candidates
        const candidates = namesInGroup.map(nm => {
          const r = cardsObj[nm];
          const moved = Number(r.moved_fields || 0) || 0;
          const prevSpeed = Number(r.last_group_speed || 0) || 0;
          const isLeader = ((r.takes_lead || 0) === 1) ? 1 : 0;
          // Prefer the computed effective played value (after penalties/slipstream)
          // If not available, fall back to selected_value or numeric id parse.
          let cardEffective = 0;
          try {
            if (typeof r.played_effective === 'number') cardEffective = Number(r.played_effective);
            else if (typeof r.selected_value === 'number' && r.selected_value > 0) cardEffective = Number(r.selected_value);
            else {
              const pid = (r && (r.played_card || r.planned_card_id)) || '';
              const m = String(pid).match(/\d+/);
              cardEffective = m ? Number(m[0]) : 0;
            }
          } catch (e) { cardEffective = 0; }
          return { name: nm, isLeader, cardEffective, prevSpeed, moved };
    });

  // Diagnostic log of raw candidates
  logs.push(`Brosten DEBUG raw candidates at pos=${pos}: ${JSON.stringify(candidates)}`);

    // Randomize baseline order using Fisher-Yates (so we don't rely on
    // sort with a random comparator which is biased). After shuffling,
    // perform a deterministic sort for prioritization; shuffle provides
    // the random tie-break behavior.
    shuffle(candidates, rng);

    candidates.sort((a, b) => {
      if (b.isLeader - a.isLeader !== 0) return b.isLeader - a.isLeader;
      if ((b.cardEffective || 0) - (a.cardEffective || 0) !== 0) return (b.cardEffective || 0) - (a.cardEffective || 0);
      if (b.prevSpeed - a.prevSpeed !== 0) return b.prevSpeed - a.prevSpeed;
      if (b.moved - a.moved !== 0) return b.moved - a.moved;
      return 0;
    });

  // Diagnostic log of sorted candidates
  logs.push(`Brosten DEBUG sorted candidates at pos=${pos}: ${JSON.stringify(candidates)}`);

        // Choose keepers deterministically but limited to slots available for this moved group
        // (slotsForGroup accounts for existing non-group riders on the tile).
        const keep = [];
        // sort full candidates list by the same comparator used above
        const sortedCandidates = [...candidates].sort((a, b) => {
          if ((b.cardEffective || 0) - (a.cardEffective || 0) !== 0) return (b.cardEffective || 0) - (a.cardEffective || 0);
          if (b.prevSpeed - a.prevSpeed !== 0) return b.prevSpeed - a.prevSpeed;
          if (b.moved - a.moved !== 0) return b.moved - a.moved;
          return 0;
        });
        // pick top N up to slotsForGroup
        const slotsToKeep = Math.min(Math.max(0, slotsForGroup), sortedCandidates.length);
        for (let i = 0; i < slotsToKeep; i++) keep.push(sortedCandidates[i].name);

  // More diagnostics about fill state (report allowed and slotsForGroup)
  logs.push(`Brosten DEBUG fill info pos=${pos} allowed=${allowed} slotsForGroup=${slotsForGroup} candidatesLen=${candidates.length} slotsKept=${keep.length}`);
  // Diagnostic log of keepers chosen
  logs.push(`Brosten DEBUG keepers at pos=${pos}: ${JSON.stringify(keep)}`);

        const keepSet = new Set(keep);
        for (const nm of namesInGroup) {
          if (keepSet.has(nm)) logs.push(`Brosten check: ${nm} — stays`);
          else logs.push(`Brosten check: ${nm} — drops`);
        }

        const toPushBack = namesInGroup.filter(nm => !keepSet.has(nm));
        if (toPushBack.length > 0) {
          for (const nm of toPushBack) {
            const r = cardsObj[nm];
            const oldPos = Number(r.position) || 0;
            const newPos = Math.max(0, Math.round(oldPos) - 1);
            r.position = newPos;
            r.moved_fields = newPos - (r.old_position || oldPos);
            logs.push(`${nm} drops 1 field due to limited capacity.`);
            logs.push(`Brosten capacity: pushed back ${nm} from ${pos} to ${newPos} (allowed ${allowed})`);
          }
          anyChange = true;
        }
      }

      if (!anyChange) break;
      if (iteration > 50) { logs.push('Brosten enforcement: reached max iterations'); break; }
    }
  } catch (e) {
    logs.push('Brosten enforcement error: ' + (e && e.message));
  }

  return { cards: cardsObj, logs };
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
