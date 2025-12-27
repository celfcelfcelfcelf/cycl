// Shared pure game logic utilities (exported for UI modules)
// 
// EXPERIMENTAL RULE (flat50 branch):
// - On flat terrain (sv=3), slipstream value becomes speed/2 instead of fixed 3
// - Card value selection unchanged: still use flat card values on flat terrain

export const convertToSeconds = (number) => {
  const minutes = Math.floor(number / 60);
  const seconds = String(Math.floor(number - minutes * 60)).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const getSlipstreamValue = (pos1, pos2, track) => {
  const segment = track.slice(pos1, pos2 + 1);
  const nedk = (segment.match(/_/g) || []).length;
  const adjustedPos2 = pos2 + nedk;
  // Get the terrain segment excluding downhill fields
  const terrainSegment = track.slice(pos1, adjustedPos2 + 1).replace(/_/g, '');
  if (terrainSegment.includes('0')) return 0;
  if (terrainSegment.includes('1')) return 1;
  if (terrainSegment.includes('2')) return 2;
  return 3;
};

// Helper function: get effective slipstream value for card selection
// When sv=3 (flat), return speed/2 instead of 3
export const getEffectiveSV = (sv, speed) => {
  if (sv === 3) return speed / 2;
  return sv;
};

// Helper function: check if terrain is flat (for card value selection)
export const isFlatTerrain = (sv, speed) => {
  // Check if we're on flat terrain (original SV = 3)
  // sv can be either:
  // - Original SV value (3 for flat)
  // - Effective SV value (speed/2 for flat terrain after getEffectiveSV)
  // To handle both cases: flat terrain means sv === 3 OR sv === speed/2
  return sv === 3 || sv === speed / 2;
};

export const getLength = (track) => {
  let tr = track.slice(0, track.indexOf('F') + 1);
  tr = tr.replace(/3/g, '6').replace(/_/g, '9').replace(/2/g, '4').replace(/1/g, '3').replace(/0/g, '2');
  const chars = tr.slice(0, tr.indexOf('F')).split('');
  let sum = 0;
  for (const char of chars) {
    if (char === 'F') break;
    sum += parseInt(char);
  }
  return Math.floor(sum / 6);
};

export const getWeightedValue = (track, factor = 0.5) => {
  let tr = track.slice(0, track.indexOf('F') + 1);
  tr = tr.slice(0, tr.indexOf('F'));
  tr = tr.split('').reverse().join('');
  tr = tr.replace(/_/g, '3');
  
  let sum = 0;
  let totalSum = 0;
  let i = 1;
  
  for (const char of tr) {
    let number = parseInt(char) || 0;
    if (number === 0) number = 0.5;
    number = number * 2 / 3;
    sum += number * Math.pow(1/i, factor);
    totalSum += Math.pow(1/i, factor);
    i++;
  }
  
  return totalSum > 0 ? sum / totalSum : 3;
};

export const getValue = (track) => {
  let tr = track.slice(0, track.indexOf('F') + 1);
  tr = tr.replace(/_/g, '3');
  tr = tr.slice(0, tr.indexOf('F'));
  
  let sum = 0;
  for (const char of tr) {
    sum += parseFloat(char) * 2/3;
  }
  
  return tr.length > 0 ? 100 * Math.pow(2 - sum / tr.length, 2) : 100;
};

export const getGroupSize = (cards, group) => {
  return Object.values(cards).filter(r => r.group === group && !r.finished).length;
};

export const getEMoveLeft = (rider, cards, track) => {
  const groupSize = getGroupSize(cards, rider.group);
  const lengthLeft = track.slice(rider.position, track.indexOf('F')).length;
  const diffLeft = 2 - getWeightedValue(track.slice(rider.position));
  const avSpeed = 5 - 0.15 * (diffLeft * (70 - rider.bjerg)) - 1.5 * rider.fatigue;
  const trackValue = 100 * 0.2 + 0.8 * (100 - getValue(track.slice(rider.position)));
  const movesLeft = lengthLeft / (avSpeed + 0.001 * trackValue * Math.pow(groupSize, 0.5));
  return movesLeft;
};

export const getFavoritPoints = (rider) => {
  return 1 / (1.5 + rider.e_moves_left);
};

// Detect if a rider just crossed a mountain peak (KOM point)
// Returns { crossedMountain: boolean, mountainLength: number }
export const detectMountainCrossing = (oldPos, newPos, track) => {
  // A mountain is a sequence of 0, 1, 2 fields
  // We detect crossing when rider moves FROM before/on the mountain TO after it
  
  if (oldPos >= newPos) return { crossedMountain: false, mountainLength: 0 };
  
  // Find any mountain segment between oldPos and newPos
  // A mountain is any continuous sequence of '0', '1', '2' fields
  let foundMountain = false;
  let mountainStart = -1;
  let mountainEnd = -1;
  
  // Scan the path from oldPos to newPos to find a mountain
  for (let i = oldPos; i <= newPos; i++) {
    const char = track[i] || '';
    const isHill = ['0', '1', '2'].includes(char);
    
    if (isHill && mountainStart === -1) {
      // Found start of mountain
      mountainStart = i;
    } else if (!isHill && mountainStart !== -1) {
      // Found end of mountain (moved off the hill)
      mountainEnd = i - 1;
      foundMountain = true;
      break;
    }
  }
  
  // Special case: still on mountain at newPos, but it's the last mountain before finish
  if (mountainStart !== -1 && mountainEnd === -1) {
    const newChar = track[newPos] || '';
    if (['0', '1', '2'].includes(newChar)) {
      // Check if remaining fields are all F (finish)
      const restIsFinish = track.slice(newPos + 1).split('').every(c => c === 'F' || c === '');
      if (restIsFinish) {
        mountainEnd = newPos;
        foundMountain = true;
      }
    }
  }
  
  if (!foundMountain || mountainStart === -1 || mountainEnd === -1) {
    return { crossedMountain: false, mountainLength: 0 };
  }
  
  // Calculate mountain length (number of hill fields)
  let mountainLength = 0;
  for (let i = mountainStart; i <= mountainEnd; i++) {
    if (['0', '1', '2'].includes(track[i])) {
      mountainLength++;
    }
  }
  
  return { 
    crossedMountain: mountainLength > 0, 
    mountainLength 
  };
};

// Calculate mountain points for riders who crossed a mountain
// Points: 1st = mountainLength, 2nd = floor(mountainLength/2), 3rd = floor(mountainLength/4), etc.
// Ranking: 1) Lowest group number, 2) Highest uphill card value, 3) Lowest card number, 4) Random tiebreaker
export const calculateMountainPoints = (ridersWhoMoved, mountainLength) => {
  if (mountainLength === 0 || !ridersWhoMoved || ridersWhoMoved.length === 0) {
    return [];
  }
  
  // Sort riders by: 1) group number (ascending), 2) uphill value (descending), 3) card number (ascending), 4) random
  const sorted = [...ridersWhoMoved].sort((a, b) => {
    // First: lower group number wins (Group 1 before Group 2)
    const groupA = a.groupNum || 999;
    const groupB = b.groupNum || 999;
    if (groupA !== groupB) return groupA - groupB;
    
    // Second: higher uphill value wins
    const uphillA = a.uphillValue || 0;
    const uphillB = b.uphillValue || 0;
    if (uphillB !== uphillA) return uphillB - uphillA;
    
    // Third: lower card number wins (extract from "kort: X" format)
    const extractCardNumber = (cardPlayed) => {
      if (!cardPlayed || cardPlayed === '?') return 999;
      const match = cardPlayed.match(/kort:\s*(\d+)/);
      return match ? parseInt(match[1], 10) : 999;
    };
    
    const cardNumA = extractCardNumber(a.cardPlayed);
    const cardNumB = extractCardNumber(b.cardPlayed);
    if (cardNumA !== cardNumB) return cardNumA - cardNumB;
    
    // Fourth: random tiebreaker (use pre-generated random number)
    const randomA = a.randomTiebreaker ?? 0.5;
    const randomB = b.randomTiebreaker ?? 0.5;
    return randomA - randomB;
  });
  
  // Assign points: 1st gets mountainLength, 2nd gets floor(mountainLength/2), etc.
  const pointsAwarded = [];
  for (let i = 0; i < sorted.length; i++) {
    const points = Math.floor(mountainLength / Math.pow(2, i));
    if (points === 0) break; // Stop when points become 0
    pointsAwarded.push({
      name: sorted[i].name,
      points,
      groupNum: sorted[i].groupNum,
      uphillValue: sorted[i].uphillValue,
      flatValue: sorted[i].flatValue
    });
  }
  
  return pointsAwarded;
};

/**
 * Count flat distance (3-fields) from next position until next numbered field
 */
function countFlatDistance(track, groupPos) {
  let flatDistance = 0;
  if (track[groupPos] === '3') {
    for (let i = groupPos + 1; i < track.length; i++) {
      const ch = track[i];
      // Only stop at mountain fields (0, 1, 2)
      if (ch === '0' || ch === '1' || ch === '2') break;
      // Count flat fields (3) and allow dobbeltføring over finish line (F), downhill (_), sprint (B), etc.
      if (ch === '3') flatDistance++;
      else if (ch === '_' || ch === 'F' || ch === 'B' || ch === '*') flatDistance++;
      else break;
    }
  }
  return flatDistance;
}

/**
 * Select the two dobbeltføring leaders based on submission order and pace
 * 
 * Leader 1: First rider (in submission order) who declared speed = max(paces)
 * Leader 2: First rider (in submission order) who declared speed = max(paces) or max(paces)-1, excluding leader 1
 */
function selectDobbeltforingLeaders({
  teamPacesForGroup,
  teamPaceMeta,
  groupNum,
  finalSpeed,
  cards
}) {
  const leaders = [];
  const groupRidersAll = Object.entries(cards).filter(([, r]) => r.group === groupNum && !r.finished);
  
  // Find max pace
  const allPaces = Object.values(teamPacesForGroup).filter(p => p > 0);
  if (allPaces.length === 0) return leaders;
  const maxPace = Math.max(...allPaces);
  
  // Get all riders with their paces and submission timestamps
  const ridersWithPaces = [];
  for (const [name, rider] of groupRidersAll) {
    const paceKey = `${groupNum}-${rider.team}`;
    const meta = teamPaceMeta[paceKey];
    const timestamp = meta && meta.timestamp ? meta.timestamp : 0;
    const pace = rider.selected_value || 0;
    if (pace > 0) {
      ridersWithPaces.push({ name, pace, timestamp, team: rider.team });
    }
  }
  
  // Sort by timestamp (earliest first = submission order)
  ridersWithPaces.sort((a, b) => a.timestamp - b.timestamp);
  
  // Leader 1: First rider with pace = maxPace
  let leader1 = null;
  for (const rider of ridersWithPaces) {
    if (rider.pace === maxPace) {
      leader1 = rider.name;
      leaders.push(rider.name);
      break;
    }
  }
  
  // Leader 2: First rider with pace = maxPace or maxPace-1, excluding leader 1
  for (const rider of ridersWithPaces) {
    if (rider.name === leader1) continue;
    if (rider.pace === maxPace || rider.pace === maxPace - 1) {
      leaders.push(rider.name);
      break;
    }
  }
  
  return leaders;
}

/**
 * Processes dobbeltføring (double-leading) logic for a group
 * 
 * @param {Object} params
 * @param {Object} params.teamPacesForGroup - Object mapping team names to their declared pace values
 * @param {Object} params.teamPaceMeta - Metadata including timestamps for submission order
 * @param {number} params.groupNum - The group number being processed
 * @param {number} params.groupPos - Current position of the group on track
 * @param {number} params.currentSpeed - Calculated speed before dobbeltføring bonus
 * @param {string} params.track - The race track string
 * @param {Object} params.cards - All rider cards/state
 * @param {Object} params.manualDobbeltforing - Manual dobbeltføring from user { rider1, rider2, pace1, pace2 } or null
 * @param {boolean} params.enabled - Whether dobbeltføring is enabled globally
 * 
 * @returns {Object} {
 *   applied: boolean,           // Whether dobbeltføring was applied
 *   newSpeed: number,           // Updated speed (speed + 1 if applied, otherwise unchanged)
 *   leaders: string[],          // Array of rider names who are leading [rider1, rider2]
 *   type: 'manual'|'automatic'|null,  // Type of dobbeltføring applied
 *   logMessages: string[]       // Log messages to display
 * }
 */
export function processDobbeltforing({
  teamPacesForGroup,
  teamPaceMeta,
  groupNum,
  groupPos,
  currentSpeed,
  track,
  cards,
  manualDobbeltforing = null,
  enabled = true
}) {
  
  const result = {
    applied: false,
    newSpeed: currentSpeed,
    leaders: [],
    type: null,
    logMessages: []
  };
  
  if (!enabled) {
    return result;
  }
  
  // === MANUAL DOBBELTFØRING ===
  if (manualDobbeltforing) {
    const { rider1, rider2, pace1, pace2 } = manualDobbeltforing;
    const p1 = parseInt(pace1);
    const p2 = parseInt(pace2);
    
    // Check if paces are within 1 of each other
    if (Math.abs(p1 - p2) > 1) {
      return result;
    }
    
    // Check terrain: count flat fields from groupPos
    const flatDistance = countFlatDistance(track, groupPos);
    const newSpeed = currentSpeed + 1;
    
    // Validate terrain allows the speed bonus
    if (flatDistance === 0 || newSpeed > flatDistance) {
      result.logMessages.push(
        `Dobbeltføring rejected: insufficient flat terrain (flat=${flatDistance}, speed+1=${newSpeed})`
      );
      return result;
    }
    
    // Dobbeltføring is valid
    result.applied = true;
    result.newSpeed = newSpeed;
    result.leaders = [rider1, rider2];
    result.type = 'manual';
    result.logMessages.push(
      `Manual dobbeltføring: ${rider1}(${p1}), ${rider2}(${p2}) → speed ${result.newSpeed}`
    );
    return result;
  }
  
  // === AUTOMATIC DOBBELTFØRING ===
  
  // Find all riders in the group with their paces (from cards.selected_value)
  const ridersWithPaces = Object.entries(cards)
    .filter(([name, rider]) => 
      rider.group === groupNum && 
      !rider.finished && 
      rider.attacking_status !== 'attacker' &&
      rider.selected_value > 0
    )
    .map(([name, rider]) => ({ name, pace: rider.selected_value, team: rider.team }))
    .sort((a, b) => b.pace - a.pace); // sort by pace descending
  
  if (ridersWithPaces.length < 2) {
    return result;
  }
  
  const topPace = ridersWithPaces[0].pace;
  const secondPace = ridersWithPaces[1].pace;
  
  // Check if top two paces are within 1 of each other
  if (Math.abs(topPace - secondPace) > 1) {
    return result;
  }
  
  // Check terrain: count 3-fields from next position until next numbered field
  const flatDistance = countFlatDistance(track, groupPos);
  
  // Apply dobbeltføring if terrain allows it
  // speed will be increased by +1, so final speed must fit within flatDistance
  if (flatDistance === 0 || (currentSpeed + 1) > flatDistance) {
    result.logMessages.push(
      `Dobbeltføring rejected: insufficient flat terrain (flat=${flatDistance}, speed+1=${currentSpeed + 1})`
    );
    return result;
  }
  
  // Dobbeltføring is valid!
  const newSpeed = currentSpeed + 1;
  const rider1 = ridersWithPaces[0].name;
  const rider2 = ridersWithPaces[1].name;
  
  result.applied = true;
  result.newSpeed = newSpeed;
  result.type = 'automatic';
  result.logMessages.push(
    `⚡ Dobbeltføring detected! ${rider1}(${topPace}) + ${rider2}(${secondPace}) → speed ${newSpeed} (before: ${currentSpeed})`
  );
  
  // Find leaders based on submission order
  result.leaders = selectDobbeltforingLeaders({
    teamPacesForGroup,
    teamPaceMeta,
    groupNum,
    finalSpeed: newSpeed,
    cards
  });
  
  result.logMessages.push(
    `⚡ Dobbeltføring leaders: ${result.leaders.join(', ')}`
  );
  
  return result;
}

/**
 * Calculate final group speed from team paces, considering all constraints
 * 
 * @param {Object} params
 * @param {Object} params.teamPacesForGroup - Team name → declared pace value
 * @param {Object} params.teamPaceMeta - Metadata with timestamps for dobbeltføring
 * @param {number} params.groupNum - Group number
 * @param {number} params.groupPos - Current position on track
 * @param {string} params.track - Track string
 * @param {Object} params.cards - All riders
 * @param {number[]} params.aheadPositions - Positions of groups ahead (for catch-up logic)
 * @param {boolean} params.dobbeltforingEnabled - Global dobbeltføring setting
 * @param {string[]} params.manualDobbeltforingLeaders - Already applied manual leaders
 * 
 * @returns {Object} {
 *   speed: number,                    // Final speed for the group
 *   dobbeltforingApplied: boolean,    // Whether dobbeltføring was applied
 *   dobbeltforingLeaders: string[],   // Names of riders who lead (pay 2 TK)
 *   forcedByCatchUp: boolean,         // Speed forced to catch group ahead
 *   blockedByAhead: boolean,          // Speed capped to avoid collision
 *   minimumApplied: boolean,          // Minimum speed (2 or 5) applied
 *   downhillBoost: boolean,           // Downhill minimum (5) applied
 *   baseSpeed: number,                // Speed before dobbeltføring/minimums
 *   logMessages: string[]             // Log messages
 * }
 */
export function calculateGroupSpeed({
  teamPacesForGroup,
  teamPaceMeta,
  groupNum,
  groupPos,
  track,
  cards,
  aheadPositions = [],
  dobbeltforingEnabled = true,
  manualDobbeltforingLeaders = []
}) {
  
  const result = {
    speed: 0,
    dobbeltforingApplied: false,
    dobbeltforingLeaders: [],
    forcedByCatchUp: false,
    blockedByAhead: false,
    minimumApplied: false,
    downhillBoost: false,
    baseSpeed: 0,
    logMessages: []
  };
  
  // Step 1: Calculate base speed from team paces
  const allPaces = Object.values(teamPacesForGroup);
  const maxChosen = allPaces.length > 0 ? Math.max(...allPaces.filter(p => p > 0)) : 0;
  
  let speed = Math.max(...allPaces.filter(p => p > 0), 2);
  result.baseSpeed = speed;
  
  result.logMessages.push(
    `DEBUG Group ${groupNum}: teamPaces=${JSON.stringify(teamPacesForGroup)}, allPaces=[${allPaces.join(',')}], maxChosen=${maxChosen}`
  );
  
  // Step 2: Apply minimum speed constraints FIRST
  const beforeMinimum = speed;
  speed = Math.max(2, speed);
  
  if (track[groupPos] === '_') {
    speed = Math.max(5, speed);
    result.downhillBoost = true;
  }
  
  if (speed !== beforeMinimum) {
    result.minimumApplied = true;
  }
  
  result.logMessages.push(
    `DEBUG Group ${groupNum}: speed after minimum=${speed}, groupPos=${groupPos}, track[${groupPos}]='${track[groupPos] || ''}'`
  );
  
  // Step 3: Check if group ahead forces higher speed (AFTER minimums, BEFORE dobbeltføring)
  // If distance to group ahead > speed (after minimum), override speed and skip dobbeltføring
  if (aheadPositions.length > 0) {
    const maxAheadPos = Math.max(...aheadPositions);
    if (maxAheadPos > groupPos) {
      const distance = maxAheadPos - groupPos;
      result.logMessages.push(`DEBUG Distance to group ahead=${distance}`);
      
      if (distance > speed) {
        speed = distance;
        result.speed = speed;
        result.forcedByCatchUp = true;
        result.logMessages.push(
          `Group ${groupNum}: distance ${distance} > current speed ${speed}, setting speed=${speed} and clearing selected_value/takes_lead`
        );
        // Early return: when forced by catch-up, no dobbeltføring or other modifications
        return result;
      }
    }
  }
  
  // Step 4: Check for dobbeltføring (AFTER minimum speed, BEFORE collision check)
  const manualApplied = manualDobbeltforingLeaders.length > 0;
  
  if (manualApplied) {
    // Manual dobbeltføring leaders already set - speed bonus already included in base speed calculation
    // Just record that dobbeltføring is active
    result.dobbeltforingApplied = true;
    result.dobbeltforingLeaders = manualDobbeltforingLeaders;
    result.logMessages.push(
      `⚡ Manual dobbeltføring active (leaders: ${manualDobbeltforingLeaders.join(', ')})`
    );
  } else if (dobbeltforingEnabled) {
    // Automatic dobbeltføring - detect and apply
    const dobbeltforingResult = processDobbeltforing({
      teamPacesForGroup,
      teamPaceMeta,
      groupNum,
      groupPos,
      currentSpeed: speed,
      track,
      cards,
      manualDobbeltforing: null,
      enabled: true
    });
    
    if (dobbeltforingResult.applied) {
      speed = dobbeltforingResult.newSpeed;
      result.dobbeltforingApplied = true;
      result.dobbeltforingLeaders = dobbeltforingResult.leaders;
      result.logMessages.push(...dobbeltforingResult.logMessages);
    }
  }
  
  // Step 5: Check if speed would collide with group ahead (AFTER dobbeltføring)
  // If speed would reach or pass group ahead, cap it
  if (aheadPositions.length > 0) {
    const maxAheadPos = Math.max(...aheadPositions);
    
    if (groupPos + speed <= maxAheadPos) {
      const newSpeed = Math.max(0, maxAheadPos - groupPos);
      if (newSpeed !== speed) {
        result.logMessages.push(
          `Group ${groupNum} blocked by group ahead at pos ${maxAheadPos}; capping speed ${speed}→${newSpeed}`
        );
        speed = newSpeed;
        result.blockedByAhead = true;
      }
    }
  }
  
  result.speed = speed;
  return result;
}

export const getTotalMovesLeft = (cards, factor) => {
  let sum = 0;
  for (const rider of Object.values(cards)) {
    sum += Math.pow(rider.favorit_points, factor);
  }
  return sum;
};

export const getWinChanceWoSprint = (rider, sum, factor) => {
  return 100 * (Math.pow(rider.favorit_points, factor) / sum);
};

export const getWinChance = (rider, sum, factor, sprintWeight) => {
  return (1 - sprintWeight) * rider.win_chance_wo_sprint + sprintWeight * rider.sprint_chance;
};

// GC (General Classification) functions for stage races
export const getEMoveLeftGC = (rider, stages) => {
  const eMoveLeftArray = [];
  for (const stage of stages) {
    const track = stage.track;
    const groupSize = 8;
    const lengthLeft = track.indexOf('F');
    const diffLeft = 2 - getWeightedValue(track);
    const avSpeed = 5 - 0.15 * (diffLeft * (70 - rider.bjerg));
    const trackValue = 100 * 0.2 + 0.8 * (100 - getValue(track));
    const movesLeft = lengthLeft / (avSpeed + 0.001 * trackValue * Math.pow(groupSize, 0.5));
    eMoveLeftArray.push(movesLeft);
  }
  return eMoveLeftArray;
};

export const getFavoritPointsGC = (rider) => {
  const seconds_per_round = 100;
  return 1 / (1.5 + (rider.e_moves_left_total + rider.gc_time / seconds_per_round));
};

export const getTotalMovesLeftGC = (cards, factor) => {
  let sum = 0;
  for (const rider of Object.values(cards)) {
    sum += Math.pow(rider.favorit_points_gc, factor);
  }
  return sum;
};

export const getWinChanceGC = (rider, factor, sum) => {
  return 100 * (Math.pow(rider.favorit_points_gc, factor) / sum);
};

export const getPullValue = (paces, sv) => {
  if (!paces || paces.length === 0) return [0, 0];
  const maxPace = Math.max(...paces.map(p => Number(p) || 0));
  return [maxPace, 1];
};

export const getFatigue = (rider) => {
  let tk1Count = 0;
  let ecCount = 0;
  
  for (const card of rider.cards) {
    if (card.id === 'TK-1: 99') tk1Count++;
    if (card.id === 'kort: 16') ecCount++;
  }
  
  for (const card of rider.discarded) {
    if (card.id === 'TK-1: 99') tk1Count++;
    if (card.id === 'kort: 16') ecCount++;
  }
  
  const totalCards = rider.cards.length + rider.discarded.length;
  return totalCards > 0 ? (tk1Count * 1.5 + ecCount) / totalCards : 0;
};

export const detectSprintGroups = (cards, track) => {
  const sprintGroups = [];
  const finishLine = track.indexOf('F');
  
  // No sprint line on this track
  if (finishLine === -1) return sprintGroups;
  
  try {
    const groups = Array.from(new Set(Object.values(cards).map(r => r.group))).sort((a,b) => a-b);
    const groupPositions = {};
    for (const g of groups) {
      groupPositions[g] = Math.max(...Object.values(cards).filter(r => r.group === g && !r.finished).map(r => r.position));
    }
    // eslint-disable-next-line no-console
    console.log('detectSprintGroups: finishLine=', finishLine, 'groupPositions=', groupPositions);
  } catch (e) {}

  for (const rider of Object.values(cards)) {
    // Skip finished riders
    if (rider.finished) continue;
    
    // Skip riders who already have sprint points assigned (already sprinted)
    if (rider.sprint_points !== undefined && rider.sprint_points > 0) continue;
    
    // Check if rider has crossed the sprint line
    if (rider.position >= finishLine) {
      // eslint-disable-next-line no-console
      console.log(`detectSprintGroups: ${rider.name} at position ${rider.position} >= finishLine ${finishLine}, group ${rider.group}`);
      if (!sprintGroups.includes(rider.group)) {
        sprintGroups.push(rider.group);
      }
    }
  }
  
  // eslint-disable-next-line no-console
  console.log('detectSprintGroups: returning', sprintGroups);
  return sprintGroups.sort((a, b) => a - b);
};

export const getRandomTrack = (rng = Math.random) => {
  const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;

  // Start with the max of two random ints in [0,3]
  let track = String(Math.max(randInt(0, 3), randInt(0, 3)));
  let ned = 0;

  // If initial is '2', sometimes make it '1'
  if (track === '2' && rng() > 0.4) track = '1';

  const limit = 55 + randInt(0, 6) + randInt(0, 6);
  let i = 0;
  while (i < limit) {
    const cur = track.charAt(i);

    if (cur === '_' && rng() < ned * 0.04) {
      // repeat underscore and re-evaluate same index (python set i = i-1 -> keep i)
      track += '_';
      // do not increment i so the loop will examine this same i again
      continue;
    } else if (cur !== '_' && rng() > (0.5 - (parseInt(cur) || 0) * 0.1)) {
      // copy the current token
      track += cur;
    } else {
      const a = rng();
      if (a < 0.03) {
        track += '0';
        ned += 1;
      } else if (a < 0.25) {
        track += '1';
        ned += 1;
      } else if (a < 0.32) {
        track += '2';
        ned += 0.5;
      } else if (a < 0.62 && cur !== '3') {
        track += '_';
        ned -= 1.5;
      } else {
        track += '3';
        ned = 0;
      }
    }

    i += 1;
  }

  track += 'FFFFFFFFFFF';
  return track;
};

export const getNumberEcs = (rider) => {
  let ecs = 0;
  for (const card of rider.cards) {
    if (card.id === 'kort: 16') ecs++;
  }
  for (const card of rider.discarded) {
    if (card.id === 'kort: 16') ecs++;
  }
  return ecs;
};

export const getNumberTk1 = (rider) => {
  let tk1 = 0;
  for (const card of rider.cards) {
    if (card.id === 'TK-1: 99') tk1++;
  }
  for (const card of rider.discarded) {
    if (card.id === 'TK-1: 99') tk1++;
  }
  return tk1;
};

// Generate a shuffled hand of cards for a rider. Pure helper (uses Math.random).
export const generateCards = (rider, isBreakaway = false, rng = Math.random) => {
  const newCards = [];
  
  if (rider.FLAD1 !== undefined) {
    for (let i = 1; i <= 15; i++) {
      if (isBreakaway && (i === 5 || i === 10)) continue;
      newCards.push({ 
        id: `kort: ${i}`, 
        flat: rider[`FLAD${i}`] || 2,
        uphill: rider[`BJERG${i}`] || 2
      });
    }
  } else {
    for (let i = 1; i <= 15; i++) {
      if (isBreakaway && (i === 5 || i === 10)) continue;
      newCards.push({ 
        id: `kort: ${i}`, 
        flat: Math.max(2, Math.min(7, Math.floor(rider.FLAD / 15) + Math.floor(rng() * 3))), 
        uphill: Math.max(2, Math.min(7, Math.floor(rider.BJERG / 15) + Math.floor(rng() * 3)))
      });
    }
  }
  
  if (isBreakaway) {
    // Breakaway riders start with two exhaustion cards (kort: 16)
    // Previously this pushed 4 cards; reduce to 2 as initial state.
    for (let i = 0; i < 2; i++) newCards.push({ id: 'kort: 16', flat: 2, uphill: 2 });
  }
  return shuffle(newCards, rng);
};

// AI helper: choose a card to play from a rider's hand (pure function)
export const chooseCardToPlay = (riderCards, sv, penalty, speed, chosenValue, isDownhill = false, riderName = '') => {
  // (function body preserved from App.js)
  let chosenCard = null;
  let bestCardNumber = 999;
  let managed = false;
  const hasECOnHand = riderCards.some(c => c.id === 'kort: 16');
  const availableCardsBase = [...riderCards.slice(0, 4)];
  let availableCards = [...availableCardsBase];
  
  // Debug logging
  if (riderName) {
    console.log(`🎴 chooseCardToPlay ${riderName}: sv=${sv} penalty=${penalty} speed=${speed} chosenValue=${chosenValue} isDownhill=${isDownhill}`);
    console.log(`🎴 Top 4 cards:`, availableCardsBase.map(c => `${c.id}(${c.flat}|${c.uphill})`).join(', '));
  }

  if (chosenValue > 0 && chosenValue === speed) {
    if (riderName) console.log(`🎴 ${riderName}: chosenValue === speed (${chosenValue} === ${speed}), looking for exact match`);
    let fallbackTK = null;
    for (const card of availableCards.slice(0, 4)) {
      const cardValue = isFlatTerrain(sv, speed) ? card.flat - penalty : card.uphill - penalty;
      if (riderName) console.log(`🎴   ${card.id}: cardValue=${cardValue} (flat=${card.flat} uphill=${card.uphill} penalty=${penalty} isFlatTerrain=${isFlatTerrain(sv, speed)})`);
      if (cardValue === chosenValue) {
        const cardNum = parseInt(card.id.match(/\d+/)?.[0] || '15');
        if (card.id && card.id.startsWith('TK-1')) {
          if (!fallbackTK || cardNum < parseInt(fallbackTK.match(/\d+/)?.[0] || '15')) fallbackTK = card.id;
          if (riderName) console.log(`🎴     TK-1 card, saving as fallback`);
          continue;
        }
        if (cardNum < bestCardNumber) {
          chosenCard = card;
          bestCardNumber = cardNum;
          managed = true;
          if (riderName) console.log(`🎴     ✓ New best match: ${card.id}`);
        }
      }
    }
    if (!chosenCard && fallbackTK) {
      const nonTKExists = availableCards.slice(0,4).some(c => c && c.id && !c.id.startsWith('TK-1'));
      if (!nonTKExists) {
        const tkIdx = availableCards.findIndex(c => c.id === fallbackTK);
        if (tkIdx !== -1) {
          chosenCard = availableCards[tkIdx];
          managed = true;
          if (riderName) console.log(`🎴 ${riderName}: Using TK-1 fallback: ${fallbackTK}`);
        }
      }
    }
    if (riderName && !chosenCard) console.log(`🎴 ${riderName}: No exact match found for speed=${speed}, falling through to else block`);
  } else {
  let minimumRequired = speed - getEffectiveSV(sv, speed);
  // If we are on a downhill '_' tile and the required minimum is modest
  // (<= 5), treat it as easier to satisfy (lower the minimum to 2) so
  // tk_extra (2|2) becomes a considered candidate. This follows the
  // suggested rule: if minimumRequired <= 5 && groupPosition === '_' -> 2
  if (isDownhill && minimumRequired <= 5) minimumRequired = 2;
  
  // If chosenValue is provided and higher than minimumRequired, use it as the minimum
  // This ensures riders play at least the value they chose
  if (chosenValue > 0 && chosenValue > minimumRequired) {
    minimumRequired = chosenValue;
    if (riderName) console.log(`🎴 ${riderName}: Raising minimumRequired to chosenValue (${chosenValue})`);
  }
  
    bestCardNumber = 0;

    if (minimumRequired <= 2 && !hasECOnHand) {
      availableCards = [...availableCardsBase, { id: 'tk_extra 99', flat: 2, uphill: 2 }];
      if (riderName) console.log(`🎴 ${riderName}: TK-extra added (minimumRequired=${minimumRequired}, hasECOnHand=${hasECOnHand})`);
    } else {
      availableCards = [...availableCardsBase];
      if (riderName) console.log(`🎴 ${riderName}: NO TK-extra (minimumRequired=${minimumRequired}, hasECOnHand=${hasECOnHand})`);
    }

    if (riderName) console.log(`🎴 ${riderName}: Looking for cards >= minimumRequired (${minimumRequired})`);
    for (const card of availableCards) {
      const cardValue = isFlatTerrain(sv, speed) ? card.flat - penalty : card.uphill - penalty;
      if (riderName) console.log(`🎴   ${card.id}: cardValue=${cardValue} (need >= ${minimumRequired})`);
      if (cardValue >= minimumRequired) {
        const cardNum = card.id === 'tk_extra 99' ? 99 : parseInt(card.id.match(/\d+/)?.[0] || '15');
        if (card.id && card.id.startsWith('TK-1')) {
          if (!chosenCard) {
            chosenCard = card;
            bestCardNumber = cardNum;
            managed = true;
            if (riderName) console.log(`🎴     ✓ Chose TK-1: ${card.id}`);
          }
        } else {
        // Prefer higher card numbers (worse cards) to save good cards
        // TK-extra (99) should be preferred over all normal cards
        if (!chosenCard || (chosenCard.id && chosenCard.id.startsWith('TK-1')) || cardNum > bestCardNumber) {
            chosenCard = card;
            bestCardNumber = cardNum;
            managed = true;
            if (riderName) console.log(`🎴     ✓ New choice: ${card.id} (cardNum=${cardNum} > bestCardNumber=${bestCardNumber})`);
          }
        }
      }
    }
  }

  if (!chosenCard) {
    // No card meets the minimum requirement. Choose the best card available
    // to move as far as possible. Prefer highest value card (lowest card number).
    let bestValue = -1;
    let lowestNum = 999;
    if (riderName) console.log(`🎴 ${riderName}: No card met minimum requirement, choosing best available`);
    for (const card of availableCards.slice(0, 4)) {
      if (!card || !card.id) continue;
      // Skip TK-1 cards as they will be replaced anyway
      if (card.id.startsWith('TK-1')) continue;
      
      const cardValue = isFlatTerrain(sv, speed) ? card.flat - penalty : card.uphill - penalty;
      const cardNum = parseInt(card.id.match(/\d+/)?.[0] || '15');
      
      if (riderName) console.log(`🎴   ${card.id}: cardValue=${cardValue} cardNum=${cardNum} (bestValue=${bestValue} lowestNum=${lowestNum})`);
      
      // Choose card with highest value (best card), or if equal value, lowest card number
      if (cardValue > bestValue || (cardValue === bestValue && cardNum < lowestNum)) {
        chosenCard = card;
        bestValue = cardValue;
        lowestNum = cardNum;
        if (riderName) console.log(`🎴     ✓ New best card: ${card.id}`);
      }
    }
    
    // If still no card found (all were TK-1), pick any non-TK card or lowest number
    if (!chosenCard) {
      if (riderName) console.log(`🎴 ${riderName}: Still no card found, picking lowest number`);
      for (const card of availableCards.slice(0, 4)) {
        const cardNum = parseInt(card.id.match(/\d+/)?.[0] || '15');
        if (cardNum < lowestNum) {
          chosenCard = card;
          lowestNum = cardNum;
          if (riderName) console.log(`🎴     ${card.id} (num=${cardNum})`);
        }
      }
    }
  }

  if (riderName && chosenCard) console.log(`🎴 ${riderName}: FINAL CHOICE: ${chosenCard.id} (flat=${chosenCard.flat} uphill=${chosenCard.uphill})`);

  if (chosenCard && chosenCard.id && chosenCard.id.startsWith('TK-1')) {
    const nonTkTop4 = riderCards.slice(0, Math.min(4, riderCards.length)).find(c => c && c.id && !c.id.startsWith('TK-1'));
    const nonTkAny = riderCards.find(c => c && c.id && !c.id.startsWith('TK-1'));
    const ec = riderCards.find(c => c && c.id === 'kort: 16');
    const replacement = nonTkTop4 || nonTkAny || ec || null;
    if (replacement) {
      chosenCard = replacement;
      managed = false;
    }
  }

  return { chosenCard, managed };
};

// Return a plain string representation suitable for testing and non-React usage
export const colourTrack = (track) => {
  // Map tokens to single-character markers (no JSX)
  const map = { '0': '0', '1': '1', '2': '2', '3': '3', '_': '_', 'F': 'F' };
  return track.split('').map(c => map[c] || c).join('');
};

// React-specific helper that returns JSX elements for rendering in App.js
export const colourTrackTokens = (track) => {
  const colors = {
    '0': 'text-purple-600 font-bold', '1': 'text-red-600 font-bold',
    '2': 'text-red-400 font-bold', '3': 'text-gray-600',
    '_': 'text-blue-600', 'F': 'text-green-600 font-bold text-xl'
  };
  return track.split('').map((char) => ({ char, className: colors[char] || 'text-gray-800' }));
};

// Fisher-Yates shuffle that accepts an injectable RNG (default Math.random)
export const shuffle = (arr, rng = Math.random) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
};

export const getPenalty = (riderName, cards) => {
  const riderCards = (cards[riderName] && cards[riderName].cards) || [];
  // Filter out synthetic tk_extra cards before counting penalty, as they're temporarily injected
  const realCards = riderCards.filter(c => !(c && c.id === 'tk_extra 99'));
  let penalty = 0;
  for (let i = 0; i < Math.min(4, realCards.length); i++) {
    if (realCards[i].id === 'TK-1: 99') penalty++;
  }
  return penalty;
};

export const getTeamMatesInGroup = (riderName, cards) => {
  const rider = cards[riderName];
  const teamMates = [];
  if (!rider) return teamMates;
  for (const [name, r] of Object.entries(cards)) {
    if (r.finished) continue;
    if (r.team === rider.team && r.group === rider.group && name !== riderName) {
      teamMates.push(name);
    }
  }
  return teamMates;
};

export const humanResponsibility = (group, humanTeams, groupSize, teamsInGroup, numberOfTeams, lenLeft, cards) => {
  const responses = [];
  
  for (const team of humanTeams) {
    let chanceTL = 0;
    let probFront = 0, probTeamFront = 0, probGroup = 0;
    let probTeamBack = 0, probTeamGroup = 0, probBack = 0;
    let teamMembersInGroup = 0;
    
    for (const rider2 of Object.values(cards)) {
      if (rider2.finished) continue;
      if (rider2.group === group) {
        if (rider2.team.includes(team)) {
          probTeamGroup += (rider2.win_chance || 0) / 100;
          probGroup += (rider2.win_chance || 0) / 100;
          teamMembersInGroup++;
        } else {
          probGroup += (rider2.win_chance || 0) / 100;
        }
      }

      if (rider2.group < group) {
        if (rider2.team.includes(team)) {
          probTeamFront += (rider2.win_chance || 0) / 100;
          probFront += (rider2.win_chance || 0) / 100;
        } else {
          probFront += (rider2.win_chance || 0) / 100;
        }
      }

      if (rider2.group > group) {
        if (rider2.team.includes(team)) {
          probTeamBack += (rider2.win_chance || 0) / 100;
          probBack += (rider2.win_chance || 0) / 100;
        } else {
          probBack += (rider2.win_chance || 0) / 100;
        }
      }
    }

    const probTeamGroupShare = probTeamGroup / Math.max(1e-9, probGroup);
    const frontOwnTeamSh = probTeamFront / (probFront + 0.1);

    if (probTeamGroupShare > frontOwnTeamSh) {
      chanceTL = Math.pow((probTeamGroupShare - probTeamFront) * numberOfTeams, 2);
      chanceTL = chanceTL * ((teamMembersInGroup) / (groupSize / teamsInGroup));
      chanceTL = chanceTL * Math.pow(Math.max(1 / numberOfTeams, probFront - probTeamFront * numberOfTeams, probBack - probTeamBack * numberOfTeams) * numberOfTeams, 2);
      chanceTL = chanceTL * Math.pow(60 / lenLeft, 0.5);
    }

    responses.push(chanceTL);
  }

  return Math.max(...responses);
};

// GC version of humanResponsibility - uses win_chance_gc for stage races
export const humanResponsibilityGC = (group, humanTeams, groupSize, teamsInGroup, numberOfTeams, lenLeft, cards) => {
  const responses = [];

  for (const team of humanTeams) {
    let chanceTL = 0;
    let probFront = 0, probTeamFront = 0, probGroup = 0;
    let probTeamBack = 0, probTeamGroup = 0, probBack = 0;
    let teamMembersInGroup = 0;
    
    for (const rider2 of Object.values(cards)) {
      if (rider2.finished) continue;
      if (rider2.group === group) {
        if (rider2.team.includes(team)) {
          probTeamGroup += (rider2.win_chance_gc || 0) / 100;
          probGroup += (rider2.win_chance_gc || 0) / 100;
          teamMembersInGroup++;
        } else {
          probGroup += (rider2.win_chance_gc || 0) / 100;
        }
      }

      if (rider2.group < group) {
        if (rider2.team.includes(team)) {
          probTeamFront += (rider2.win_chance_gc || 0) / 100;
          probFront += (rider2.win_chance_gc || 0) / 100;
        } else {
          probFront += (rider2.win_chance_gc || 0) / 100;
        }
      }

      if (rider2.group > group) {
        if (rider2.team.includes(team)) {
          probTeamBack += (rider2.win_chance_gc || 0) / 100;
          probBack += (rider2.win_chance_gc || 0) / 100;
        } else {
          probBack += (rider2.win_chance_gc || 0) / 100;
        }
      }
    }

    const probTeamGroupShare = probTeamGroup / Math.max(1e-9, probGroup);
    const frontOwnTeamSh = probTeamFront / (probFront + 0.1);

    if (probTeamGroupShare > frontOwnTeamSh) {
      chanceTL = Math.pow((probTeamGroupShare - probTeamFront) * numberOfTeams, 2);
      chanceTL = chanceTL * ((teamMembersInGroup) / (groupSize / teamsInGroup));
      chanceTL = chanceTL * Math.pow(Math.max(1 / numberOfTeams, probFront - probTeamFront * numberOfTeams, probBack - probTeamBack * numberOfTeams) * numberOfTeams, 2);
    }

    responses.push(chanceTL);
  }

  return Math.max(...responses);
};

export const takesLeadFC = (riderName, cardsState, trackStr, numberOfTeams, floating = false, write = false, attackersInTurn = [], logger = () => {}, rng = Math.random, isStageRace = false) => {
  const rider = cardsState[riderName];
  if (!rider) return 0;
  
  if (rider.attacking_status === 'attacker') return 1;

  const group = rider.group;
  const groupRiders = Object.values(cardsState).filter(r => r.group === group && !r.finished);
  const groupSize = groupRiders.length;
  const teamsInGroup = new Set(groupRiders.map(r => r.team)).size;
  const lenLeft = trackStr.indexOf('F') - rider.position;
  let bestSelCard = 100;
  const favorit = (rider.favorit || 0) + 2;

  const team = rider.team;
  const fraTeamIGruppe = groupRiders.filter(r => r.team === team).length;
  const ratio = fraTeamIGruppe / Math.max(1, groupSize);
  const sv = getSlipstreamValue(rider.position, rider.position + 8, trackStr);

  if (write) { try { logger(`=== TAKE LEAD EVALUATION: ${riderName} (${team}) ===`); } catch (e) {} }
  if (write) { try { logger(`📊 Group ${group}: ${groupSize} riders, ${teamsInGroup} teams, ${fraTeamIGruppe} from ${team} (ratio=${(ratio*100).toFixed(1)}%), sv=${sv}`); } catch (e) {} }

  if (ratio === 1) {
    if (!floating) return 1; else return 6;
  }

  const bjerg = rider.bjerg || 0;
  const flad = rider.flad || 0;

  let fb_ratio = Math.pow((flad / Math.max(1, bjerg)), 2);
  if (sv < 2) fb_ratio = 1 / fb_ratio;

  const mentalitet = rider.mentalitet || 4;

  for (const card of (rider.cards || []).slice(0, 4)) {
    const cardNum = parseInt(card.id.match(/\d+/)?.[0] || '15');
    bestSelCard = Math.min(bestSelCard, cardNum);
  }

  if (groupSize > 2 && rider.attacking_status !== 'attacked') {
    // If best card is worse than 7, no chance to attack
    if (bestSelCard > 7) {
      if (write) { try { logger(`⊘ ${riderName}: cannot attack (best card ${bestSelCard} > 7)`); } catch(e) {} }
      // Skip attack calculation entirely
    } else {
    let attack_prob_percent = 0.25;
    if ((attackersInTurn || []).length > 0) attack_prob_percent = attack_prob_percent * 4;
    if (ratio > 0.4999) attack_prob_percent = attack_prob_percent * Math.pow(ratio / 0.4, 8);
    attack_prob_percent = attack_prob_percent * Math.pow(Math.pow(20 / Math.max(1, lenLeft), favorit / 5), 0.5);
    attack_prob_percent = attack_prob_percent / bestSelCard;
    attack_prob_percent = attack_prob_percent / Math.pow(group, 1.45);
    attack_prob_percent = attack_prob_percent / Math.pow(Math.max(1, sv), favorit / 5);
    attack_prob_percent = attack_prob_percent / Math.max(1, Object.keys(cardsState).length) * 9;
    attack_prob_percent = attack_prob_percent * (mentalitet / 4);
    attack_prob_percent = attack_prob_percent * fb_ratio;
    attack_prob_percent = attack_prob_percent * (1.2 - (rider.fatigue || 0));  // Reduce attack probability when fatigued

    const attack_prob = Math.floor(1 / Math.max(1e-9, attack_prob_percent)) + 1;
    const attack_roll = Math.floor(rng() * (attack_prob + 1));
    if (write) { try { logger(`🎯 ${riderName}: attack_prob=${attack_prob_percent.toFixed(4)}% (1-in-${attack_prob}) roll=${attack_roll}`); } catch(e) {} }
    if (attack_roll === 1) {
      if (groupSize > 2) {
        if (write) { try { logger(`⚔️ ${riderName} ATTACKS! (prob=${attack_prob_percent.toFixed(4)}%)`); } catch(e) {} }
        if (!floating) return 2; else return 2;
      }
    } else {
      if (write) { try { logger(`✓ ${riderName} does not attack (roll ${attack_roll} ≠ 1)`); } catch(e) {} }
    }
    }
  }

  let prob_front = 0, prob_team_front = 0, prob_group = 0;
  let prob_team_back = 0, prob_team_group = 0, prob_back = 0;
  let team_members_in_group = 0;

  for (const r of Object.values(cardsState)) {
    if (r.finished) continue;
    // Treat explicit attackers as being "in front" of the group for the
    // purpose of these prob_* tallies. This makes take-lead decisions aware
    // of attackers even if callers don't pass an attackersInTurn array.
    if (r.attacking_status === 'attacker') {
      if (r.team === team) {
        prob_team_front += (r.win_chance || 0) / 100;
        prob_front += (r.win_chance || 0) / 100;
      } else {
        prob_front += (r.win_chance || 0) / 100;
      }
      // attackers are considered front for these tallies, skip normal group handling
      continue;
    }

    if (r.group === group) {
      if (r.team === team) {
        prob_team_group += (r.win_chance || 0) / 100;
        prob_group += (r.win_chance || 0) / 100;
        team_members_in_group++;
      } else {
        prob_group += (r.win_chance || 0) / 100;
      }
    }
    if (r.group < group) {
      if (r.team === team) {
        prob_team_front += (r.win_chance || 0) / 100;
        prob_front += (r.win_chance || 0) / 100;
      } else {
        prob_front += (r.win_chance || 0) / 100;
      }
    }
    if (r.group > group) {
      if (r.team === team) {
        prob_team_back += (r.win_chance || 0) / 100;
        prob_back += (r.win_chance || 0) / 100;
      } else {
        prob_back += (r.win_chance || 0) / 100;
      }
    }
  }

  // const prob_teammembers_in_group = prob_team_group - (rider.win_chance || 0) / 100; // unused helper
  const helping_team = prob_team_group / Math.max(1e-9, (rider.win_chance || 0) / 100);
  const captain = helping_team < team_members_in_group ? 1 : 0;
  const prob_team_group_share = (prob_team_group - 0.1 * (rider.win_chance || 0) / 100) / Math.max(1e-9, prob_group);

  let chance_tl = 0;

  if (prob_team_group_share > (prob_team_front / (prob_front + 0.1))) {
    chance_tl = Math.pow((prob_team_group_share - prob_team_front) * numberOfTeams, 2);

    if (rider.attacking_status === 'attacked') {
      let chance_tl2 = chance_tl * (25 / Math.max(1, lenLeft));
      let favort = 0;
      for (const ar of (attackersInTurn || [])) favort += (cardsState[ar]?.favorit || 0);
      chance_tl2 = chance_tl2 * Math.max(1, favort / 5);
      chance_tl = Math.max(chance_tl2, chance_tl);
    }

    chance_tl = chance_tl * ((helping_team - 0.5 * captain) / Math.max(1, team_members_in_group));

    if (sv < 2 && (rider.bjerg || 0) > 71) {
      let chance_tl2 = chance_tl * ((rider.bjerg || 0) - 72);
      chance_tl2 = chance_tl2 * (10 / Math.max(1, lenLeft));
      chance_tl2 = chance_tl2 * Math.pow(1 / Math.max(1, bestSelCard), 0.5);
      chance_tl = Math.max(chance_tl2, chance_tl);
    }

    chance_tl = chance_tl * ((team_members_in_group - captain) / Math.max(1, groupSize / Math.max(1, teamsInGroup)));
    chance_tl = chance_tl * Math.pow(Math.max(1 / numberOfTeams, prob_front - prob_team_front * numberOfTeams, prob_back - prob_team_back * numberOfTeams) * numberOfTeams, 2);
    chance_tl = chance_tl * Math.pow(1 - (rider.fatigue || 0), 0.5);
    chance_tl = chance_tl * Math.pow(Math.min(1, 7 / Math.max(1, bestSelCard)), 2);
    chance_tl = chance_tl * Math.pow(60 / Math.max(1, lenLeft), 0.5);
    const human = humanResponsibility(group, ['Me'], groupSize, teamsInGroup, numberOfTeams, lenLeft, cardsState);
    chance_tl = chance_tl / Math.max(1, Math.pow(human, 0.5));

    // Reduce take-lead chance when the group already has high chosen speeds.
    // Find the highest chosen speed (selected_value) among non-attacker riders
    // in the same group and divide chance_tl by at least 2 or that value.
      try {
      const chosenSpeeds = (groupRiders || []).map(r => Math.round(r.selected_value || 0)).filter(v => v > 0);
      const maxChosen = chosenSpeeds.length > 0 ? Math.max(...chosenSpeeds) : 0;
      const denom = Math.max(2, maxChosen);
      chance_tl = chance_tl / denom;
      if (write) { logger && logger(`TLFC ADJUST ${riderName}: maxChosen=${maxChosen} denom=${denom} -> chance_tl=${chance_tl.toFixed(6)}`); }
    } catch (e) {}

    // Stage race GC blending: combine regular chance_tl (33%) with GC-based chance_tl_gc (67%)
    let chance_tl_original = chance_tl;
    let chance_tl_gc = 0;
    if (isStageRace) {
      
      // Calculate GC probabilities using win_chance_gc
      let prob_front_gc = 0, prob_team_front_gc = 0, prob_group_gc = 0;
      let prob_team_back_gc = 0, prob_team_group_gc = 0, prob_back_gc = 0;
      let team_members_in_group_gc = 0;

      for (const r of Object.values(cardsState)) {
        if (r.finished) continue;
        
        if (r.attacking_status === 'attacker') {
          if (r.team === team) {
            prob_team_front_gc += (r.win_chance_gc || 0) / 100;
            prob_front_gc += (r.win_chance_gc || 0) / 100;
          } else {
            prob_front_gc += (r.win_chance_gc || 0) / 100;
          }
          continue;
        }

        if (r.group === group) {
          if (r.team === team) {
            prob_team_group_gc += (r.win_chance_gc || 0) / 100;
            prob_group_gc += (r.win_chance_gc || 0) / 100;
            team_members_in_group_gc++;
          } else {
            prob_group_gc += (r.win_chance_gc || 0) / 100;
          }
        }
        if (r.group < group) {
          if (r.team === team) {
            prob_team_front_gc += (r.win_chance_gc || 0) / 100;
            prob_front_gc += (r.win_chance_gc || 0) / 100;
          } else {
            prob_front_gc += (r.win_chance_gc || 0) / 100;
          }
        }
        if (r.group > group) {
          if (r.team === team) {
            prob_team_back_gc += (r.win_chance_gc || 0) / 100;
            prob_back_gc += (r.win_chance_gc || 0) / 100;
          } else {
            prob_back_gc += (r.win_chance_gc || 0) / 100;
          }
        }
      }

      const helping_team_gc = prob_team_group_gc / Math.max(1e-9, (rider.win_chance_gc || 0) / 100);
      const captain_gc = helping_team_gc < team_members_in_group_gc ? 1 : 0;
      const prob_team_group_share_gc = (prob_team_group_gc - 0.1 * (rider.win_chance_gc || 0) / 100) / Math.max(1e-9, prob_group_gc);
      const front_own_team_sh_gc = prob_team_front_gc / (prob_front_gc + 0.1);

      if (prob_team_group_share_gc > front_own_team_sh_gc) {
        chance_tl_gc = Math.pow((prob_team_group_share_gc - prob_team_front_gc) * numberOfTeams, 2);

        if (rider.attacking_status === 'attacked') {
          let chance_tl2_gc = chance_tl_gc * (25 / Math.max(1, lenLeft));
          let favort = 0;
          for (const ar of (attackersInTurn || [])) favort += (cardsState[ar]?.favorit || 0);
          chance_tl2_gc = chance_tl2_gc * Math.max(1, favort / 5);
          chance_tl_gc = Math.max(chance_tl2_gc, chance_tl_gc);
        }

        chance_tl_gc = chance_tl_gc * ((helping_team_gc - 0.5 * captain_gc) / Math.max(1, team_members_in_group_gc));

        if (sv < 2 && (rider.bjerg || 0) > 71) {
          let chance_tl2_gc = chance_tl_gc * ((rider.bjerg || 0) - 72);
          chance_tl2_gc = chance_tl2_gc * (10 / Math.max(1, lenLeft));
          chance_tl2_gc = chance_tl2_gc * Math.pow(1 / Math.max(1, bestSelCard), 0.5);
          chance_tl_gc = Math.max(chance_tl2_gc, chance_tl_gc);
        }

        chance_tl_gc = chance_tl_gc * ((team_members_in_group_gc - captain_gc) / Math.max(1, groupSize / Math.max(1, teamsInGroup)));
        chance_tl_gc = chance_tl_gc * Math.pow(Math.max(1 / numberOfTeams, prob_front_gc - prob_team_front_gc * numberOfTeams, prob_back_gc - prob_team_back_gc * numberOfTeams) * numberOfTeams, 2);
        chance_tl_gc = chance_tl_gc * Math.pow(1 - (rider.fatigue || 0), 0.5);
        chance_tl_gc = chance_tl_gc * Math.pow(Math.min(1, 7 / Math.max(1, bestSelCard)), 2);
        chance_tl_gc = chance_tl_gc * Math.pow(60 / Math.max(1, lenLeft), 0.5);
        const human_gc = humanResponsibilityGC(group, ['Me'], groupSize, teamsInGroup, numberOfTeams, lenLeft, cardsState);
        chance_tl_gc = chance_tl_gc / Math.max(1, Math.pow(human_gc, 0.5));

        try {
          const chosenSpeeds_gc = (groupRiders || []).map(r => Math.round(r.selected_value || 0)).filter(v => v > 0);
          const maxChosen_gc = chosenSpeeds_gc.length > 0 ? Math.max(...chosenSpeeds_gc) : 0;
          const denom_gc = Math.max(2, maxChosen_gc);
          chance_tl_gc = chance_tl_gc / denom_gc;
        } catch (e) {}
      }

      // Blend: 1/3 regular + 2/3 GC
      chance_tl_original = chance_tl;
      chance_tl = chance_tl * 0.3333 + chance_tl_gc * 0.6667;
      if (write) { 
        try { 
          logger(`🔀 GC-BLEND ${riderName}: stage=${chance_tl_original.toFixed(4)} gc=${chance_tl_gc.toFixed(4)} → blended=${chance_tl.toFixed(4)}`); 
        } catch(e) {} 
      }
    }

    if (!floating) {
      const prob = Math.max(0, chance_tl) / (1 + Math.max(0, chance_tl));
      const roll = rng();
      if (isStageRace && write) {
        try { 
          const prob_stage = Math.max(0, chance_tl_original || 0) / (1 + Math.max(0, chance_tl_original || 0));
          const prob_gc = Math.max(0, chance_tl_gc || 0) / (1 + Math.max(0, chance_tl_gc || 0));
          logger(`🎲 ${riderName}: take_lead prob=${(prob*100).toFixed(2)}% [stage=${(prob_stage*100).toFixed(2)}% gc=${(prob_gc*100).toFixed(2)}%] roll=${roll.toFixed(3)}`); 
        } catch(e) {} 
      } else if (write) {
        try { logger(`🎲 ${riderName}: take_lead prob=${(prob*100).toFixed(2)}% (chance_tl=${chance_tl.toFixed(4)}) roll=${roll.toFixed(3)}`); } catch(e) {} 
      }
      if (roll < prob) {
        if (write) { try { logger(`👑 ${riderName} TAKES LEAD! (${roll.toFixed(3)} < ${prob.toFixed(3)})`); } catch(e) {} }
        return 1;
      } else {
        if (write) { try { logger(`✓ ${riderName} does not take lead (${roll.toFixed(3)} ≥ ${prob.toFixed(3)})`); } catch(e) {} }
      }
    } else {
      return chance_tl;
    }
  }

  return 0;
};

// GC version of takesLeadFC - uses win_chance_gc for stage races
export const takesLeadFCGC = (riderName, cardsState, trackStr, numberOfTeams, floating = false, write = false, attackersInTurn = [], logger = () => {}, rng = Math.random) => {
  const rider = cardsState[riderName];
  if (!rider) return 0;
  
  // Attackers always take lead
  if (rider.attacking_status === 'attacker') return 1;

  const group = rider.group;
  const groupRiders = Object.values(cardsState).filter(r => r.group === group && !r.finished);
  const groupSize = groupRiders.length;
  const teamsInGroup = new Set(groupRiders.map(r => r.team)).size;
  const lenLeft = trackStr.indexOf('F') - rider.position;
  let bestSelCard = 100;

  const team = rider.team;
  const teamMembersInGroupCount = groupRiders.filter(r => r.team === team).length;
  const ratio = teamMembersInGroupCount / Math.max(1, groupSize);
  const sv = getSlipstreamValue(rider.position, rider.position + 8, trackStr);

  if (write) { try { logger(`TLFC-GC START ${riderName} group=${group} groupSize=${groupSize} ratio=${ratio.toFixed(3)} sv=${sv}`); } catch (e) {} }

  if (ratio === 1) {
    if (!floating) return 1; else return 6;
  }

  for (const card of (rider.cards || []).slice(0, 4)) {
    const cardNum = parseInt(card.id.match(/\d+/)?.[0] || '15');
    bestSelCard = Math.min(bestSelCard, cardNum);
  }

  // Calculate probabilities using win_chance_gc
  let prob_front = 0, prob_team_front = 0, prob_group = 0;
  let prob_team_back = 0, prob_team_group = 0, prob_back = 0;
  let team_members_in_group = 0;

  for (const r of Object.values(cardsState)) {
    if (r.finished) continue;
    
    // Treat explicit attackers as being "in front"
    if (r.attacking_status === 'attacker') {
      if (r.team === team) {
        prob_team_front += (r.win_chance_gc || 0) / 100;
        prob_front += (r.win_chance_gc || 0) / 100;
      } else {
        prob_front += (r.win_chance_gc || 0) / 100;
      }
      continue;
    }

    if (r.group === group) {
      if (r.team === team) {
        prob_team_group += (r.win_chance_gc || 0) / 100;
        prob_group += (r.win_chance_gc || 0) / 100;
        team_members_in_group++;
      } else {
        prob_group += (r.win_chance_gc || 0) / 100;
      }
    }
    if (r.group < group) {
      if (r.team === team) {
        prob_team_front += (r.win_chance_gc || 0) / 100;
        prob_front += (r.win_chance_gc || 0) / 100;
      } else {
        prob_front += (r.win_chance_gc || 0) / 100;
      }
    }
    if (r.group > group) {
      if (r.team === team) {
        prob_team_back += (r.win_chance_gc || 0) / 100;
        prob_back += (r.win_chance_gc || 0) / 100;
      } else {
        prob_back += (r.win_chance_gc || 0) / 100;
      }
    }
  }

  const helping_team = prob_team_group / Math.max(1e-9, (rider.win_chance_gc || 0) / 100);
  const captain = helping_team < team_members_in_group ? 1 : 0;
  const prob_team_group_share = (prob_team_group - 0.1 * (rider.win_chance_gc || 0) / 100) / Math.max(1e-9, prob_group);
  const front_own_team_sh = prob_team_front / (prob_front + 0.1);

  let chance_tl = 0;

  if (prob_team_group_share > front_own_team_sh) {
    // Base chance: team strength in group vs front
    chance_tl = Math.pow((prob_team_group_share - prob_team_front) * numberOfTeams, 2);

    // Boost if rider was attacked
    if (rider.attacking_status === 'attacked') {
      let chance_tl2 = chance_tl * (25 / Math.max(1, lenLeft));
      let favort = 0;
      for (const ar of (attackersInTurn || [])) favort += (cardsState[ar]?.favorit || 0);
      chance_tl2 = chance_tl2 * Math.max(1, favort / 5);
      chance_tl = Math.max(chance_tl2, chance_tl);
    }

    // Adjust for helping team (domestique factor)
    chance_tl = chance_tl * ((helping_team - 0.5 * captain) / Math.max(1, team_members_in_group));

    // Captain on hills late in race
    if (sv < 2 && (rider.bjerg || 0) > 71) {
      let chance_tl2 = chance_tl * ((rider.bjerg || 0) - 72);
      chance_tl2 = chance_tl2 * (10 / Math.max(1, lenLeft));
      chance_tl2 = chance_tl2 * Math.pow(1 / Math.max(1, bestSelCard), 0.5);
      chance_tl = Math.max(chance_tl2, chance_tl);
    }

    // More teammates = higher chance
    chance_tl = chance_tl * ((team_members_in_group - captain) / Math.max(1, groupSize / Math.max(1, teamsInGroup)));
    
    // Danger from front or back
    chance_tl = chance_tl * Math.pow(Math.max(1 / numberOfTeams, prob_front - prob_team_front * numberOfTeams, prob_back - prob_team_back * numberOfTeams) * numberOfTeams, 2);
    
    // Fatigue and card quality
    chance_tl = chance_tl * Math.pow(1 - (rider.fatigue || 0), 0.5);
    chance_tl = chance_tl * Math.pow(Math.min(1, 7 / Math.max(1, bestSelCard)), 2);
    
    // Distance left
    chance_tl = chance_tl * Math.pow(60 / Math.max(1, lenLeft), 0.5);
    
    // Human responsibility
    const human = humanResponsibility(group, ['Me'], groupSize, teamsInGroup, numberOfTeams, lenLeft, cardsState);
    chance_tl = chance_tl / Math.max(1, Math.pow(human, 0.5));

    // Reduce based on already chosen speeds in group
    try {
      const chosenSpeeds = (groupRiders || []).map(r => Math.round(r.selected_value || 0)).filter(v => v > 0);
      const maxChosen = chosenSpeeds.length > 0 ? Math.max(...chosenSpeeds) : 0;
      const denom = Math.max(2, maxChosen);
      chance_tl = chance_tl / denom;
    } catch (e) {}

    if (!floating) {
      const prob = Math.max(0, chance_tl) / (1 + Math.max(0, chance_tl));
      if (rng() < prob) {
        if (write) { try { logger(`TLFC-GC DECIDE ${riderName} chance_tl=${chance_tl.toFixed(4)} prob=${prob.toFixed(3)} -> RETURNS 1`); } catch(e) {} }
        return 1;
      }
    } else {
      return chance_tl;
    }
  }

  if (write) { try { logger(`TLFC-GC END ${riderName} -> RETURNS 0`); } catch(e) {} }
  return 0;
};

export const takesLeadFCFloating = (riderName, cardsState, track, numberOfTeams) => {
  const rider = cardsState[riderName];
  if (!rider) return 0;
  if (rider.attacking_status === 'attacker') return 6;
  const group = rider.group;
  const groupRiders = Object.values(cardsState).filter(r => r.group === group);
  const groupSize = groupRiders.length;
  const team = rider.team;
  const fraTeamIGruppe = groupRiders.filter(r => r.team === team).length;
  const ratio = fraTeamIGruppe / groupSize;
  if (ratio === 1) return 6;
  return 1;
};

export const pickValue = (riderName, cardsState, trackStr, paces = [], numberOfTeams = 3, attackersInTurn = [], logger = () => {}) => {
  if (!cardsState[riderName]) return 0;
  const rider = cardsState[riderName];

  if (rider.takes_lead === 0) return 0;

  // Calculate speed from paces (same logic as in App.js)
  const speed = paces.length > 0 ? Math.max(...paces.filter(p => p > 0), 2) : 2;

  let ideal_move;
  if (rider.attacking_status === 'attacker') {
    ideal_move = 100;
  } else {
    const track_length = trackStr.indexOf('F');
    const len_left = track_length - rider.position;

    const best_left = Math.max(1, track_length - Math.max(...Object.values(cardsState).map(r => r.position)));
    ideal_move = Math.pow(len_left / best_left, 2) + 4;

    try {
      const tlv = takesLeadFC(riderName, cardsState, trackStr, numberOfTeams, true, false, attackersInTurn, logger);
      ideal_move = ideal_move + Math.pow(tlv, 0.4);
    } catch (e) {
      ideal_move = ideal_move + 0;
    }

    ideal_move = ideal_move - len_left / 20;

    // Apply rider-specific adjustment based on track characteristics and rider abilities
    const track_left = trackStr.slice(rider.position);
    const get_value_track_left = getValue(track_left);
    const FLAD = rider.flad || 50;
    const BJERG = rider.bjerg || 50;
    const multiplier = (get_value_track_left * (FLAD - BJERG) / 1.5 + 2 * BJERG - FLAD) / 68;
    ideal_move = ideal_move * multiplier;
  }

  const sv = getSlipstreamValue(rider.position, rider.position + Math.floor(ideal_move), trackStr);
  const effectiveSV = getEffectiveSV(sv, speed);
  const [pvs0, pvs1] = getPullValue(paces, effectiveSV);

  if (Math.floor(ideal_move) <= pvs0) {
    if (!(isFlatTerrain(sv, speed) && pvs1 === 1)) {
      return 0;
    }
  }

  // Penalty is the count of TK-1 cards in the top-4 (non-binary)
  let penalty = 0;
  for (const c of (rider.cards || []).slice(0, 4)) {
    if (c && c.id === 'TK-1: 99') { penalty += 1; }
  }

  let selectedCard = (rider.cards && rider.cards[0]) ? rider.cards[0] : { flat: 2, uphill: 2, id: 'kort: 1' };
  let bestError = 1000;

  for (const card of (rider.cards || []).slice(0, 4)) {
    const svCard = getSlipstreamValue(rider.position, rider.position + card.flat, trackStr);
    const value = isFlatTerrain(svCard, speed) ? (card.flat - penalty) : (card.uphill - penalty);
    const error_card = Math.pow(Math.abs(value - ideal_move), 2) + card.uphill / 100;

    let errorTMs = 0;
    const teamMates = getTeamMatesInGroup(riderName, cardsState);
    for (const tm of teamMates) {
      let errorTM = 25;
      const penaltyTM = getPenalty(tm, cardsState);
      const possible = [...(cardsState[tm].cards || []).slice(0, 4), { flat: 2, uphill: 2 }];
      for (const ctm of possible) {
        const vtm = isFlatTerrain(svCard, speed) ? (ctm.flat - penaltyTM) : (ctm.uphill - penaltyTM);
        const errTMcard = Math.abs(value - vtm + getEffectiveSV(svCard, speed));
        if (errTMcard < errorTM) errorTM = errTMcard;
      }
      errorTM = errorTM * ((cardsState[tm].win_chance || 0) / 100);
      errorTMs += errorTM;
    }

    const track_length = trackStr.indexOf('F');
    const len_left = track_length - rider.position;
    const error_total = (isFlatTerrain(svCard, speed) ? error_card : 4 * error_card) / Math.max(1, len_left) + errorTMs;

    if (error_total < bestError) {
      selectedCard = card;
      bestError = error_total;
    }
  }

  const svFinal = getSlipstreamValue(rider.position, rider.position + selectedCard.flat, trackStr);
  const selectedNumeric = isFlatTerrain(svFinal, speed) ? selectedCard.flat : selectedCard.uphill;
  const effectiveSVFinal = getEffectiveSV(svFinal, speed);

  const [pv0, pv1] = getPullValue(paces, effectiveSVFinal);
  
  if (selectedNumeric <= pv0) {
    if (!(isFlatTerrain(svFinal, speed) && pv1 === 1)) return 0;
  }

  // Return the value the selected card can produce (after penalty)
  // Don't snap to other cards' values - the AI chose this card for a reason
  let finalValue = Math.max(0, Math.round(selectedNumeric - penalty));
  
  // Apply downhill rule at the end: if on '_' and selection < 7, return 0
  if (trackStr[rider.position] === '_') {
    if (finalValue < 7) {
      finalValue = 0;
    }
  }
  
  return finalValue;
};

// Compute initial per-rider stats (e_moves_left, favorit_points, sprint and win chances)
export const computeInitialStats = (cardsObj, selectedTrack, round = 0, numberOfTeams = 3) => {
  // compute e_moves_left and favorit_points
  for (const riderName in cardsObj) {
    const rider = cardsObj[riderName];
    rider.e_moves_left = getEMoveLeft(rider, cardsObj, selectedTrack);
    rider.favorit_points = getFavoritPoints(rider);
  }

  const factor = 17 - 0.6 * round;
  const totalPoints = getTotalMovesLeft(cardsObj, factor);

  const maxPosition = Math.max(...Object.values(cardsObj).map(r => r.position));
  const sprintWeight = 0.8 * Math.pow(getWeightedValue(selectedTrack.slice(maxPosition)) - 1, 2);

  const trackLength = selectedTrack.indexOf('F');
  const minFieldsLeft = Math.min(...Object.values(cardsObj).map(r => trackLength - r.position));

  let sprint2Sum = 0;
  const sprint2Values = {};
  for (const riderName in cardsObj) {
    const rider = cardsObj[riderName];
    const fieldsLeft = trackLength - rider.position;
    const sprint2 = Math.pow((rider.sprint + 3) * Math.pow(minFieldsLeft / fieldsLeft, 2.5), 2);
    sprint2Values[riderName] = sprint2;
    sprint2Sum += sprint2;
  }

  for (const riderName in cardsObj) {
    const rider = cardsObj[riderName];
    rider.sprint_chance = sprint2Sum > 0 ? (sprint2Values[riderName] / sprint2Sum) * 100 : 100 / Object.keys(cardsObj).length;
    rider.win_chance_wo_sprint = getWinChanceWoSprint(rider, totalPoints, factor);
    rider.win_chance = getWinChance(rider, totalPoints, factor, sprintWeight);
  }

  return { cardsObj, factor, totalPoints, sprintWeight };
};

// Compute non-attacker moves for a group as a pure function.
// Returns updatedCards (new object), groupsNewPositions array and logs array.
export const computeNonAttackerMoves = (cardsObj, groupNum, groupSpeed, slipstream, track, rng = Math.random, tkPerTk1 = 0, previousGroupPositions = []) => {
  // Deep clone cardsObj to avoid mutating caller state
  const updatedCards = JSON.parse(JSON.stringify(cardsObj));
  const groupsNewPositions = [];
  const logs = [];

  const names = Object.entries(updatedCards)
    .filter(([, r]) => r.group === groupNum)
    .map(([n]) => n);

  // First phase: move non-attackers
  const nonAttackers = names.filter(n => (updatedCards[n].attacking_status || 'no') !== 'attacker');

  for (const name of nonAttackers) {
    const rider = updatedCards[name];
    const oldPosition = rider.position;
    const chosenValue = rider.selected_value || 0;
    const penalty = getPenalty(name, updatedCards);

    // Check if this rider is a dobbeltføring leader
    const isDobbeltføringLeader = rider.dobbeltføring_leader === true;
    
    // Determine if this rider takes lead:
    // - If dobbeltføring_leader flag is set, they take lead (even if chosenValue < groupSpeed)
    // - Otherwise, normal rule: chosenValue === groupSpeed
    const isLeadRider = isDobbeltføringLeader || (chosenValue > 0 && chosenValue === groupSpeed);

    // Choose card
    let chosenCard = null;
    let managed = false;

    if (rider.planned_card_id) {
      const idx = (rider.cards || []).findIndex(c => c.id === rider.planned_card_id);
      if (idx !== -1) {
        const plannedCandidate = (rider.cards || [])[idx];
        let acceptPlanned = true;
        // If this rider explicitly chose the card in the UI, honor it even if
        // it would not strictly meet the leader target. This lets human-picked
        // cards be played regardless of the group's computed pace.
        if (isLeadRider && !rider.human_planned) {
          const targetVal = Math.round(chosenValue);
          const svForLead = getSlipstreamValue(rider.position, rider.position + Math.floor(targetVal), track);
          const top4 = (rider.cards || []).slice(0, Math.min(4, (rider.cards || []).length));
          const localPenalty = top4.slice(0,4).filter(tc => tc && tc.id === 'TK-1: 99').length;
          const plannedCardVal = svForLead > 2 ? plannedCandidate.flat : plannedCandidate.uphill;
          // Accept planned if it exactly matches target, or if it's greater-or-equal (lenient acceptance)
          const plannedEffective = plannedCardVal - localPenalty;
          if (plannedEffective < targetVal) acceptPlanned = false;
        }
        if (acceptPlanned) { chosenCard = plannedCandidate; managed = true; delete updatedCards[name].planned_card_id; delete updatedCards[name].human_planned; }
      }
    }

    if (!chosenCard) {
      if (isLeadRider) {
        const targetVal = Math.round(chosenValue);
  const top4 = (rider.cards || []).slice(0, Math.min(4, (rider.cards || []).length));
  const svForLead = getSlipstreamValue(rider.position, rider.position + Math.floor(targetVal), track);
  const localPenalty = top4.slice(0,4).filter(tc => tc && tc.id === 'TK-1: 99').length;
        let found = null;
        // Prefer exact match
        for (const c of top4) {
          const cv = svForLead > 2 ? c.flat : c.uphill;
          if ((cv - localPenalty) === targetVal) { found = c; break; }
        }
        // If no exact match, choose smallest card that is >= target (lenient)
        if (!found) {
          let candidate = null;
          let candidateEff = Infinity;
          for (const c of top4) {
            const cv = svForLead > 2 ? c.flat : c.uphill;
            const eff = cv - localPenalty;
            if (eff >= targetVal && eff < candidateEff) { candidate = c; candidateEff = eff; }
          }
          if (candidate) found = candidate;
        }
        if (found) { chosenCard = found; managed = true; }
      }
    }

    if (!chosenCard) {
  const isDown = (track && typeof rider.position === 'number') ? track[rider.position] === '_' : false;
  const res = chooseCardToPlay(rider.cards || [], slipstream, penalty, groupSpeed, chosenValue, isDown, name);
      chosenCard = res.chosenCard;
      managed = res.managed;
    }

    if (!chosenCard) {
      logs.push(`${name} (${rider.team}): No valid card found!`);
      continue;
    }

    if (chosenCard.id && chosenCard.id.startsWith('TK-1')) {
      const top4Alt = (rider.cards || []).slice(0, Math.min(4, (rider.cards || []).length)).find(c => c && c.id && !c.id.startsWith('TK-1'));
      const handAlt = (rider.cards || []).find(c => c && c.id && !c.id.startsWith('TK-1'));
      const replacement = top4Alt || handAlt || null;
      if (replacement) {
        logs.push(`${name}: TK-1 could not be played directly; substituting ${replacement.id}`);
        chosenCard = replacement;
        managed = false;
      } else {
        logs.push(`${name}: TK-1 found with no substitutable card — skipping play`);
        continue;
      }
    }

  // If starting on a downhill '_' field, movement uses at least 5 before penalties
  let cardValue = slipstream > 2 ? chosenCard.flat : chosenCard.uphill;
  if (track[rider.position] === '_') cardValue = Math.max(cardValue, 5);
  const effectiveValue = Math.max(cardValue - penalty, 0);

    const minRequiredToFollow = Math.max(0, groupSpeed - slipstream);
    let eligibleForSlip = effectiveValue >= minRequiredToFollow;
    let moveBy = eligibleForSlip ? Math.min(effectiveValue + slipstream, groupSpeed) : effectiveValue;
    let newPos = (rider.position || 0) + moveBy;
    let caughtOtherGroup = false;

    // If rider cannot follow own group, check if they can catch other groups
    // This includes both riders from the same group who have already moved (groupsNewPositions)
    // AND groups that moved earlier in this turn (previousGroupPositions)
    if (!eligibleForSlip) {
      const riderStartPos = rider.position || 0;
      const maxReachWithSV = riderStartPos + effectiveValue + slipstream;
      const maxReachWithoutSV = riderStartPos + effectiveValue;
      
      // Combine both same-group positions and previous-group positions
      const allAvailablePositions = [...groupsNewPositions, ...previousGroupPositions];
      
      // Find the furthest group position this rider can reach
      let bestTargetPos = newPos; // default to their solo movement
      for (const [targetPos, targetSV] of allAvailablePositions) {
        // Rider can catch this group if it's within their card value + slipstream range
        if (targetPos >= maxReachWithoutSV && targetPos <= maxReachWithSV) {
          if (targetPos > bestTargetPos) {
            bestTargetPos = targetPos;
            caughtOtherGroup = true;
          }
        }
      }
      
      if (caughtOtherGroup) {
        newPos = bestTargetPos;
        logs.push(`${name}: Cannot follow own group (eff=${effectiveValue} < minReq=${minRequiredToFollow}), but catches group at pos ${bestTargetPos} with slipstream`);
      }
    }

    // For riders who CAN follow their group, also check if overlapping with already-moved groups
    if (eligibleForSlip) {
      const potPosition = (rider.position || 0) + effectiveValue + slipstream;
      // Check both same-group and previous-group positions
      const allAvailablePositions = [...groupsNewPositions, ...previousGroupPositions];
      for (const [targetPos] of allAvailablePositions) {
        if (potPosition >= targetPos) newPos = Math.max(newPos, targetPos);
      }
    }

    // card hand/discard handling (simplified: remove chosenCard from hand, push others from top4 to discarded)
    let updatedHandCards = [...(rider.cards || [])];
    let updatedDiscarded = [...(rider.discarded || [])];
    const topN = Math.min(4, updatedHandCards.length);
    const topFour = updatedHandCards.slice(0, topN);

    if (chosenCard.id === 'tk_extra 99') {
      // Remove any synthetic tk_extra cards from hand (they should not be discarded)
      updatedHandCards = updatedHandCards.filter(c => !(c && c.id === 'tk_extra 99'));
      // Discard the top 4 REAL cards (cards 1-4). If fewer than 4 remain, discard what's available.
      const discardCount = Math.min(4, updatedHandCards.length);
      const cardsToDiscard = updatedHandCards.splice(0, discardCount);
      const converted = cardsToDiscard.map(cd => (cd && cd.id && cd.id.startsWith('TK-1')) ? { id: 'kort: 16', flat: 2, uphill: 2 } : cd);
      updatedDiscarded = [...updatedDiscarded, ...converted];
      logs.push(`${name}: tk_extra brugt - ${converted.length} kort til discard`);
      // Ensure any planned tk_extra marker is cleared
      try { delete updatedCards[name].planned_card_id; delete updatedCards[name].human_planned; } catch (e) {}
    } else {
      // Remove exactly the chosen card instance from hand (match by reference)
      const globalIndex = updatedHandCards.findIndex(c => c === chosenCard);
      if (globalIndex !== -1) updatedHandCards.splice(globalIndex, 1);

      // For the top-four, discard the other cards (match by reference to avoid
      // removing all duplicates that share the same id string).
      for (const c of topFour) {
        if (c === chosenCard) continue;
        const idx = updatedHandCards.findIndex(hc => hc === c);
        if (idx !== -1) {
          const [removed] = updatedHandCards.splice(idx, 1);
          const disc = (removed && removed.id && removed.id.startsWith('TK-1')) ? { id: 'kort: 16', flat: 2, uphill: 2 } : removed;
          updatedDiscarded.push(disc);
        }
      }
    }

    // (Previously there was downhill pass-through extra and related discard removal here.)
    // That pass-through bonus has been removed per new downhill rules.

    // reshuffle if under 5
    if (updatedHandCards.length < 5) {
      updatedHandCards.push(...updatedDiscarded);
      // shuffle using Fisher-Yates with injected rng
      shuffle(updatedHandCards, rng);
      updatedDiscarded = [];
      logs.push(`${name}: kort blandet`);
    }

    // add EC / TK-1 handling simplified
    let ecs = 0;
    const cardNum = parseInt(chosenCard.id.match(/\d+/)?.[0] || '15');
    const hasTK1 = (chosenCard.id && chosenCard.id.startsWith('TK-1')) || (cardNum >= 1 && cardNum <= 2);
    
    logs.push(`🔍 ${name} DEBUG TK: isLeadRider=${isLeadRider}, isDobbeltføringLeader=${isDobbeltføringLeader}, hasTK1=${hasTK1}, chosenValue=${chosenValue}, groupSpeed=${groupSpeed}`);
    
    if (isLeadRider) ecs = 1;
    if (cardNum >= 3 && cardNum <= 5) ecs += 1;
    
    if (hasTK1) {
      updatedHandCards.unshift({ id: 'TK-1: 99', flat: -1, uphill: -1 });
      logs.push(`${name} (${rider.team}): +TK-1 added to top of hand`);
    }
    
    const exhaustionCards = [];
    for (let i = 0; i < ecs; i++) exhaustionCards.push({ id: 'kort: 16', flat: 2, uphill: 2 });
    const totalEx = exhaustionCards.length + (hasTK1 ? 1 : 0);
    if (totalEx === 1) {
      if (!hasTK1 && exhaustionCards.length === 1) updatedHandCards.unshift(exhaustionCards[0]);
    } else if (totalEx >= 2) {
      if (hasTK1) {
        updatedDiscarded = [...updatedDiscarded, ...exhaustionCards];
        logs.push(`${name}: ${exhaustionCards.length} exhaustion card(s) moved to discard`);
      } else {
        const frontCard = exhaustionCards.shift();
        if (frontCard) updatedHandCards.unshift(frontCard);
        if (exhaustionCards.length > 0) updatedDiscarded = [...updatedDiscarded, ...exhaustionCards];
      }
    }

    // compute fatigue
    const totalCards = updatedHandCards.length + updatedDiscarded.length;
    const tk1Count = [...updatedHandCards, ...updatedDiscarded].filter(c => c.id === 'TK-1: 99').length;
    const ecCount = [...updatedHandCards, ...updatedDiscarded].filter(c => c.id === 'kort: 16').length;
    const fatigue = totalCards > 0 ? (tk1Count * 1.5 + ecCount) / totalCards : 0;

    // Extract card values for logging and KOM calculation
    const cardFlat = chosenCard.flat ?? 0;
    const cardUphill = chosenCard.uphill ?? 0;

    updatedCards[name] = {
      ...rider,
      position: newPos,
      old_position: oldPosition,
      cards: updatedHandCards,
      discarded: updatedDiscarded,
      takes_lead: chosenValue > 0 ? 1 : 0,
      fatigue,
      penalty,
      played_card: chosenCard.id,
      // store the computed effective played value so other systems (Brosten enforcement)
      // can order riders by the actual speed they played (after penalties/slipstream).
      played_effective: effectiveValue,
      moved_fields: newPos - oldPosition,
      move_distance_for_prel: newPos - oldPosition,
      last_group_speed: groupSpeed,
      // Store uphill and flat values for mountain points calculation
      last_uphill_value: cardUphill,
      last_flat_value: cardFlat,
      kom_points: rider.kom_points || 0, // Preserve existing mountain points
      eligible_for_speed: eligibleForSlip // Track if rider met minimum speed requirement
    };
    // Detailed debugging log for card play and movement decisions
    const takesLeadStr = chosenValue > 0 ? ' (lead)' : '';
    const followChar = eligibleForSlip ? '✓' : '✗';
    const managedInfo = managed ? '' : ' (auto)';
    // Filter out synthetic tk_extra cards when showing the hand, as they're injected temporarily
    const realCards = (rider.cards || []).filter(c => !(c && c.id === 'tk_extra 99'));
    const top4Cards = realCards.slice(0, 4).map(c => `${c.id}(${c.flat}|${c.uphill})`).join(', ');
    logs.push(`Group ${groupNum}: ${name} (${rider.team}) spiller ${chosenCard.id} (${cardFlat}-${cardUphill}) ${oldPosition}→${newPos}${takesLeadStr} ${followChar}${managedInfo} [havde: ${top4Cards}]`);
    logs.push(`${name} DEBUG: sv=${slipstream} penalty=${penalty} cardVal=${cardValue} effective=${effectiveValue} minReq=${minRequiredToFollow} eligible=${eligibleForSlip} moveBy=${moveBy} finalPos=${newPos} groupsNewPositionsTop=${groupsNewPositions.map(g=>g[0]).slice(0,5).join(',')}`);

    groupsNewPositions.push([newPos, slipstream]);
    groupsNewPositions.sort((a, b) => b[0] - a[0]);
  }

  // Mountain points calculation has been moved to App.js
  // It now runs after ALL groups have moved, not after each individual group

  // NOTE: Brosten capacity enforcement is intentionally performed by the
  // engine wrapper (`stepGroup`) as the final step after post-adjust
  // slipstream catches. Doing it there ensures the final persisted
  // positions cannot violate capacity even if slipstream moves riders
  // onto Brosten tiles. The enforcement here was removed so that the
  // capacity rule appears last in the log and only runs once.

  return { updatedCards, groupsNewPositions, logs };
};

// Prepare riders for the next stage in a stage race
// Resets position/group, reissues cards, removes half of TK/TK-1 cards (rounded down)
export const prepareNextStage = (cardsObj, riderData, attackerLeadFields = 5, numBreakawayRiders = 2, rng = Math.random) => {
  const updatedCards = {};
  const logs = [];
  
  // Get all teams and select breakaway riders (one per team, up to numBreakawayRiders)
  const allRiders = Object.entries(cardsObj);
  const teams = [...new Set(allRiders.map(([, r]) => r.team))];
  const shuffledTeams = teams.sort(() => rng() - 0.5);
  const breakawayTeams = shuffledTeams.slice(0, Math.min(numBreakawayRiders, teams.length));
  
  // For each breakaway team, pick one random rider
  const breakawayRiders = new Set();
  for (const team of breakawayTeams) {
    const teamRiders = allRiders.filter(([, r]) => r.team === team);
    if (teamRiders.length > 0) {
      const [name] = teamRiders[Math.floor(rng() * teamRiders.length)];
      breakawayRiders.add(name);
    }
  }
  
  logs.push(`Breakaway riders for new stage: ${[...breakawayRiders].join(', ')}`);
  
  for (const [name, rider] of Object.entries(cardsObj)) {
    // Find rider in original data to regenerate cards
    const originalRider = riderData.find(r => r.NAVN === name);
    if (!originalRider) {
      logs.push(`Warning: Could not find original data for ${name}`);
      continue;
    }
    
    // Determine if this rider should be in breakaway (new selection for each stage)
    const isBreakaway = breakawayRiders.has(name);
    
    // Count existing TK-1 and exhaustion cards
    const allCards = [...(rider.cards || []), ...(rider.discarded || [])];
    const tk1Cards = allCards.filter(c => c.id === 'TK-1: 99');
    const exhaustionCards = allCards.filter(c => c.id === 'kort: 16');
    
    // Convert all TK-1 cards to regular TK (kort: 16)
    // Keep half of existing exhaustion cards
    const convertedTKFromTK1 = tk1Cards.length; // Each TK-1 becomes one TK
    const halfExhaustion = Math.floor(exhaustionCards.length / 2);
    
    logs.push(`${name}: TK-1=${tk1Cards.length} (converted to TK), Exhaustion=${exhaustionCards.length} (keeping half=${halfExhaustion})`);
    
    // Generate fresh cards for the rider
    const freshCards = generateCards(originalRider, isBreakaway);
    
    // Add converted TK-1 cards and half of exhaustion cards
    const cardsToAdd = [];
    
    // Add all TK-1 as regular TK (kort: 16)
    for (let i = 0; i < convertedTKFromTK1; i++) {
      cardsToAdd.push({ id: 'kort: 16', flat: 2, uphill: 2 });
    }
    
    // Add half of exhaustion cards
    for (let i = 0; i < halfExhaustion; i++) {
      cardsToAdd.push({ id: 'kort: 16', flat: 2, uphill: 2 });
    }
    
    // Combine fresh cards with kept TK cards and shuffle
    const allNewCards = [...freshCards, ...cardsToAdd];
    // Shuffle using Fisher-Yates
    for (let i = allNewCards.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [allNewCards[i], allNewCards[j]] = [allNewCards[j], allNewCards[i]];
    }
    
    logs.push(`${name}: Added ${cardsToAdd.length} TK cards (${convertedTKFromTK1} from TK-1 conversion, ${halfExhaustion} from exhaustion)`);
    
    updatedCards[name] = {
      ...rider,
      position: isBreakaway ? attackerLeadFields : 0,
      old_position: isBreakaway ? attackerLeadFields : 0,
      group: isBreakaway ? 1 : 2,
      cards: allNewCards,
      discarded: [],
      finished: false,
      prel_time: 10000,
      time_after_winner: 10000,
      result: 1000,
      ranking: 0,
      takes_lead: 0,
      selected_value: -1,
      attacking_status: 'no',
      fatigue: cardsToAdd.length / allNewCards.length, // Recalculate fatigue based on TK ratio
      penalty: 0,
      sprint_points: 0, // Reset sprint points for new stage
      tk_penalty: 0, // Reset TK penalty for new stage
      // Preserve GC stats: gc_time, prize_money, points, kom_points
      // These are already in rider object and will be kept
    };
  }
  
  return { updatedCards, logs };
};

// Pure runSprints implementation extracted from App.js.
// Returns { updatedCards, result, latestPt, logs }
export const runSprintsPure = (cardsObj, trackStr, sprintGroup = null, round = 0, sprintResults = [], latestPrel = 0, rng = Math.random, isStageRace = false) => {
  const logs = [];
  const sprintGroups = sprintGroup !== null ? [sprintGroup] : detectSprintGroups(cardsObj, trackStr);
  if (!sprintGroups || sprintGroups.length === 0) return { updatedCards: cardsObj, result: sprintResults, latestPt: latestPrel, logs };

  const updatedCards = JSON.parse(JSON.stringify(cardsObj));
  let winnerTime = Infinity;
  let result = [...sprintResults];
  let latestPt = latestPrel || 0;
  // winner_prel_time: baseline prel_time for "time after winner" calculations.
  // Initialize to 100:00 (6000s), then take minimum with existing times.
  // This ensures the baseline can ONLY decrease, never increase.
  let winner_prel_time = 6000; // Start at 100:00
  try {
    const existingPrels = Object.values(cardsObj)
      .filter(r => typeof r.prel_time === 'number' && r.prel_time !== 10000 && r.prel_time > 0)
      .map(r => r.prel_time);
    const minExisting = existingPrels.length > 0 ? Math.min(...existingPrels) : null;
    const candidates = [winner_prel_time]; // Always start with 6000
    if (minExisting !== null) candidates.push(minExisting);
    if (latestPrel && latestPrel > 0 && latestPrel < 6000) candidates.push(latestPrel);
    winner_prel_time = Math.min(...candidates);
  } catch (e) {
    // Fallback: start at 6000, or use latestPrel if it's smaller
    winner_prel_time = (latestPrel && latestPrel > 0 && latestPrel < 6000) ? latestPrel : 6000;
  }

  // First pass: assign prel_time for riders in all sprint groups (if they crossed finish)
  const assignedPrel = new Set();
  const finishPos = trackStr.indexOf('F');
  if (finishPos !== -1) {
    for (const sprintGroupId of sprintGroups) {
      // compute minimum prel_time from riders NOT in this sprint group
      const otherPrels = Object.values(updatedCards)
        .filter(r => r.group !== sprintGroupId && typeof r.prel_time === 'number' && r.prel_time !== 10000)
        .map(r => r.prel_time);
      const minOtherPrel = otherPrels.length > 0 ? Math.min(...otherPrels) : null;

      for (const riderName of Object.keys(updatedCards)) {
        const r = updatedCards[riderName];
        if (r.group !== sprintGroupId) continue;
        if (r.finished) continue; // Skip riders who already finished in previous rounds
        if (typeof r.position !== 'number' || r.position < finishPos) continue;
        try {
          // Determine a robust previous position for fraction calculation.
          // Use `old_position` only when it represents a position *before* the current one.
          // Otherwise prefer `position - move_distance_for_prel`, then `position - last_group_speed`.
          let prevPos = r.position;
          try {
            if (typeof r.old_position === 'number' && r.old_position < r.position) {
              prevPos = r.old_position;
            } else if (typeof r.move_distance_for_prel === 'number' && r.move_distance_for_prel > 0) {
              prevPos = r.position - r.move_distance_for_prel;
            } else if (typeof r.last_group_speed === 'number' && r.last_group_speed > 0) {
              prevPos = r.position - r.last_group_speed;
            } else {
              // conservative fallback: assume they started one field behind
              prevPos = Math.max(0, r.position - 1);
            }
            // clamp to valid range
            if (prevPos < 0) prevPos = 0;
            if (prevPos > r.position) prevPos = r.position;
          } catch (e) {
            prevPos = (typeof r.position === 'number') ? r.position : 0;
          }

          const fieldsToFinish = Math.max(0, finishPos - prevPos);
          const speedForFraction = (r && typeof r.move_distance_for_prel === 'number' && r.move_distance_for_prel > 0)
            ? r.move_distance_for_prel
            : ((r && typeof r.last_group_speed === 'number' && r.last_group_speed > 0)
              ? r.last_group_speed
              : 1);
          const fraction = Math.max(0, Math.min(1, fieldsToFinish / speedForFraction));
          const candidatePrel = (round + fraction) * 100;
          // Apply rule: prel_time = max(min(prel_time_of_others) + 2, candidate)
          const minBased = (minOtherPrel !== null) ? (minOtherPrel + 2) : null;
          const finalPrel = (minBased !== null) ? Math.max(minBased, candidatePrel) : candidatePrel;

          if (!(typeof r.prel_time === 'number' && r.prel_time !== 10000)) {
            // Update gc_time for stage races: gc_time = gc_time + prel_time
            const updatedGcTime = (typeof r.gc_time === 'number' ? r.gc_time : 0) + finalPrel;
            updatedCards[riderName] = { ...r, prel_time: finalPrel, gc_time: updatedGcTime };
            assignedPrel.add(riderName);
            latestPt = Math.max(latestPt, finalPrel);
            try {
              // provisional globalMin including this newly assigned prel_time
              const provisionalPrels = Object.values(updatedCards)
                .filter(rr => typeof rr.prel_time === 'number' && rr.prel_time !== 10000)
                .map(rr => rr.prel_time);
              const provisionalGlobalMin = provisionalPrels.length > 0 ? Math.min(...provisionalPrels) : null;
              const provisionalTaf = provisionalGlobalMin !== null ? Math.max(0, finalPrel - provisionalGlobalMin) : null;
              logs.push(`Assigned prel_time for ${riderName} (group ${sprintGroupId}): prel=${convertToSeconds(finalPrel)} (${finalPrel}s) candidate=${convertToSeconds(candidatePrel)} (round=${round}) fraction=${fraction.toFixed(3)} denom=${speedForFraction} prevPos=${prevPos} finishPos=${finishPos} fieldsToFinish=${fieldsToFinish} pos=${r.position} move_distance_for_prel=${r.move_distance_for_prel} old_position=${r.old_position} minOther=${minOtherPrel !== null ? convertToSeconds(minOtherPrel) + ` (${minOtherPrel}s)` : 'N/A'} provisionalGlobalMin=${provisionalGlobalMin !== null ? convertToSeconds(provisionalGlobalMin) + ` (${provisionalGlobalMin}s)` : 'N/A'} provisional_taw=${provisionalTaf !== null ? convertToSeconds(provisionalTaf) + ` (${provisionalTaf}s)` : 'N/A'}`);
            } catch (e) {
              logs.push(`Assigned prel_time for ${riderName} (group ${sprintGroupId}): ${convertToSeconds(finalPrel)} (fraction=${fraction.toFixed(3)}, denom=${speedForFraction}, prevPos=${prevPos}, finishPos=${finishPos}, fieldsToFinish=${fieldsToFinish}, pos=${r.position}, move_distance_for_prel=${r.move_distance_for_prel}, old_position=${r.old_position}, minOther=${minOtherPrel !== null ? convertToSeconds(minOtherPrel) : 'N/A'})`);
            }
          }
        } catch (e) {}
      }
    }

    // Normalize within each sprint group.
    // Use the group's earliest assigned prel_time (min) so all riders in the
    // sprint group get the same best time from their group.
    for (const sprintGroupId of sprintGroups) {
      const groupRidersAtFinish = Object.entries(updatedCards)
        .filter(([n, r]) => r.group === sprintGroupId && !r.finished && typeof r.position === 'number' && r.position >= finishPos);
      const groupPrels = groupRidersAtFinish.map(([, r]) => r.prel_time).filter(t => typeof t === 'number' && t !== 10000);
      if (groupPrels.length > 0) {
        const groupMin = Math.min(...groupPrels);
        for (const [n] of groupRidersAtFinish) {
          updatedCards[n] = { ...updatedCards[n], prel_time: groupMin };
        }
        logs.push(`Normalized prel_time for group ${sprintGroupId} to group min ${convertToSeconds(groupMin)}`);
      }
    }

    const allPrels = Object.values(updatedCards)
      .filter(r => typeof r.prel_time === 'number' && r.prel_time !== 10000)
      .map(r => r.prel_time);
    if (allPrels.length > 0) {
      const globalMin = Math.min(...allPrels);
      // CRITICAL: winner_prel_time can ONLY decrease, never increase.
      // Always take the minimum of current baseline and new minimum.
      winner_prel_time = Math.min(winner_prel_time, globalMin);
      for (const [n, r] of Object.entries(updatedCards)) {
        if (typeof r.prel_time === 'number' && r.prel_time !== 10000) {
          const taf = Math.max(0, r.prel_time - winner_prel_time);
          updatedCards[n] = { ...updatedCards[n], time_after_winner: taf };
          try {
            logs.push(`Set time_after_winner for ${n}: taf=${convertToSeconds(taf)} (${taf}s) prel=${convertToSeconds(r.prel_time)} (${r.prel_time}s) winner_prel=${convertToSeconds(winner_prel_time)} (${winner_prel_time}s)`);
          } catch (e) {
            logs.push(`Set time_after_winner for ${n}: ${convertToSeconds(taf)}`);
          }
        }
      }
      try { logs.push(`Using winner_prel_time baseline ${convertToSeconds(winner_prel_time)} (${winner_prel_time}s)`); } catch (e) {}
    }
  }

  // Second pass: perform sprint scoring, logging and assign placements per sprint group
  // Record finished riders added by this run so we can build a final-standings
  // text before we delete them from the returned cards object.
  const resultStartIndex = result.length;
  const finishedThisRun = [];
  for (const sprintGroupId of sprintGroups) {
    for (const riderName of Object.keys(updatedCards)) {
      const rider = updatedCards[riderName];
      if (rider.group !== sprintGroupId) continue;

      // move discarded back to hand and shuffle
  rider.cards = [...rider.cards, ...rider.discarded];
  rider.discarded = [];
  shuffle(rider.cards, rng);

      const cardsAvailable = [];
      let tk_penalty = 0;

      let sprint_type = 3;
      try {
        const ch = trackStr[trackStr.indexOf('F') - 1];
        const parsed = parseInt(ch);
        sprint_type = Number.isNaN(parsed) ? 3 : parsed;
      } catch (e) { sprint_type = 3; }

      for (let i = 0; i < Math.min(4, rider.cards.length); i++) {
        const c = rider.cards[i];
        const val = sprint_type <= 2 ? c.flat : c.uphill;
        cardsAvailable.push(val);
      }

      for (let i = 4; i < Math.min(8, rider.cards.length); i++) {
        if (rider.cards[i].id === 'kort: 16') tk_penalty += 1;
      }

      while (cardsAvailable.length < 4) cardsAvailable.push(2);
      cardsAvailable.sort((a,b) => b-a);

      rider.sprint_points = (rider.sprint || 0) * 1.05 + (cardsAvailable[0] || 0) + (cardsAvailable[1] || 0)
        + (cardsAvailable[2] || 0) * 0.01 + (cardsAvailable[3] || 0) * 0.001 - tk_penalty;
      rider.tk_penalty = tk_penalty;
    }

    // Only include riders who have crossed the finish line (position >= finishPos)
    const groupRiders = Object.entries(updatedCards).filter(([n, r]) => 
      r.group === sprintGroupId && 
      !r.finished && 
      typeof r.position === 'number' && 
      r.position >= finishPos
    );

    const groupTimes = groupRiders.map(([,r]) => r.prel_time).filter(t => typeof t === 'number');
    const groupMinTime = groupTimes.length > 0 ? Math.min(...groupTimes) : null;
    if (groupMinTime !== null) {
      winnerTime = Math.min(winnerTime, groupMinTime);
      latestPt = Math.max(groupMinTime, latestPt + 5);
    } else {
      latestPt = latestPt + 5;
    }

    const groupTAWs = Object.values(updatedCards).filter(r => r.group === sprintGroupId && typeof r.time_after_winner === 'number').map(r => r.time_after_winner);
    const groupMinTAW = groupTAWs.length > 0 ? Math.min(...groupTAWs) : null;
    logs.push(`SPRINT: GROUP ${sprintGroupId} (${groupMinTAW !== null ? convertToSeconds(groupMinTAW) : convertToSeconds(latestPt)})`);

    const alreadyFinishedCount = Object.values(updatedCards).filter(rr => rr.finished).length;

    groupRiders.sort((a, b) => {
      const ra = a[1], rb = b[1];
      const ta = typeof ra.prel_time === 'number' ? ra.prel_time : Infinity;
      const tb = typeof rb.prel_time === 'number' ? rb.prel_time : Infinity;
      if (ta !== tb) return ta - tb;
      return (rb.sprint_points || 0) - (ra.sprint_points || 0);
    });

    let placeCounter = 0;
    for (const [rName, rObj] of groupRiders) {
      placeCounter += 1;
      const overallPos = alreadyFinishedCount + placeCounter;
      logs.push(`${overallPos}. ${rName} - ${Math.round(rObj.sprint_points || 0)} sprint points (Sprint stat: ${Math.round(rObj.sprint || 0)} TK_penalty: ${rObj.tk_penalty || 0})`);
      // Prefer time_after_winner for final standings. If missing, derive from prel_time and winner_prel_time.
      const taf = (typeof rObj.time_after_winner === 'number')
        ? Math.round(rObj.time_after_winner)
        : (typeof rObj.prel_time === 'number' && typeof winner_prel_time === 'number'
          ? Math.max(0, Math.round(rObj.prel_time - winner_prel_time))
          : 0);
      result.push([overallPos, rName, convertToSeconds(taf), rObj.team]);
      const timeSec = taf;
      const finishedEntry = { pos: overallPos, name: rName, time: convertToSeconds(timeSec), timeSec, team: rObj.team };
      finishedThisRun.push(finishedEntry);
      
      // Stage race bonuses: prize money, time bonuses, and points for top finishers
      let prizeMoney = (typeof rObj.prize_money === 'number' ? rObj.prize_money : 0);
      let gcTime = (typeof rObj.gc_time === 'number' ? rObj.gc_time : 0);
      let points = (typeof rObj.points === 'number' ? rObj.points : 0);
      
      if (overallPos === 1) {
        prizeMoney += 5000;
        gcTime -= 10; // 10 second time bonus
        points += 20;
      } else if (overallPos === 2) {
        prizeMoney += 1000;
        gcTime -= 6; // 6 second time bonus
        points += 15;
      } else if (overallPos === 3) {
        gcTime -= 4; // 4 second time bonus
        points += 10;
      } else if (overallPos === 4) {
        points += 6;
      } else if (overallPos === 5) {
        points += 3;
      } else if (overallPos === 6) {
        points += 1;
      }
      
      updatedCards[rName] = { ...rObj, ranking: placeCounter, finished: true, result: overallPos, prize_money: prizeMoney, gc_time: gcTime, points: points };
    }
  }

  // Build a final standings text from the riders finished in this run
  // (do this BEFORE removing finished riders from returned cards).
  try {
    if (finishedThisRun.length > 0) {
      const lines = finishedThisRun.map(f => `${f.pos}. ${f.name}${f.team ? ' (' + f.team + ')' : ''} - ${f.time}`);
      const finalStandingsText = `FINAL STANDINGS:\n${lines.join('\n')}`;
      logs.push(finalStandingsText);
      // In stage races, keep all riders (including finished ones) for next stage
      // In single races, filter out finished riders
      const survivors = isStageRace ? updatedCards : Object.fromEntries(Object.entries(updatedCards).filter(([k, v]) => !v.finished));
      return { updatedCards: survivors, result, latestPt, logs, winner_prel_time, finalStandingsText, finishedThisRun };
    }
  } catch (e) {}

  // In stage races, keep all riders; in single races, filter out finished riders
  const survivors = isStageRace ? updatedCards : Object.fromEntries(Object.entries(updatedCards).filter(([k, v]) => !v.finished));
  return { updatedCards: survivors, result, latestPt, logs, winner_prel_time, finishedThisRun: [] };
};

// Compute attacker moves for a group as a pure function.
// Accepts the cards object (which should already include non-attacker updates),
// and returns { updatedCards, groupsNewPositions, logs }.
export const computeAttackerMoves = (cardsObj, groupNum, groupSpeed, slipstream, track, rng = Math.random, tkPerTk1 = 0, previousGroupPositions = []) => {
  const updatedCards = JSON.parse(JSON.stringify(cardsObj));
  const logs = [];
  const groupsNewPositions = [];

  const names = Object.entries(updatedCards)
    .filter(([, r]) => r.group === groupNum)
    .map(([n]) => n);

  // Second phase: attackers
  const attackers = names.filter(n => updatedCards[n].attacking_status === 'attacker');
  if (attackers.length > 0) logs.push(`Attackers moving separately: ${attackers.join(', ')}`);

  // Calculate group position (max position of non-attackers in this group)
  const nonAttackers = names.filter(n => (updatedCards[n].attacking_status || '') !== 'attacker');
  const groupPosition = nonAttackers.length > 0 ? Math.max(...nonAttackers.map(n => updatedCards[n].position || 0)) : undefined;

  const attackerMoves = [];
  for (const name of attackers) {
    const rider = updatedCards[name];
    const oldPosition = rider.position;
    const chosenValue = rider.selected_value || 0;
    const penalty = getPenalty(name, updatedCards);

    let chosenCard = null;
    let managed = false;

    const targetNumeric = Math.round(chosenValue || 0);

    if (rider.attack_card && rider.attack_card.id) {
      const idxA = (rider.cards || []).findIndex(c => c.id === rider.attack_card.id);
      if (idxA !== -1) { chosenCard = rider.cards[idxA]; managed = true; }
    }

    if (!chosenCard && rider.planned_card_id) {
      const idx = (rider.cards || []).findIndex(c => c.id === rider.planned_card_id);
      if (idx !== -1) { chosenCard = rider.cards[idx]; managed = true; delete updatedCards[name].planned_card_id; delete updatedCards[name].human_planned; }
    }

    if (!chosenCard && typeof targetNumeric === 'number' && targetNumeric > 0) {
      const top4 = (rider.cards || []).slice(0, Math.min(4, rider.cards.length));
      const svForAttack = getSlipstreamValue(rider.position, rider.position + Math.floor(targetNumeric), track);
  const localPenalty = top4.slice(0,4).filter(tc => tc && tc.id === 'TK-1: 99').length;
      // Prefer exact match
      for (const c of top4) {
        if (c.id && c.id.startsWith('TK-1')) continue;
        const cardVal = svForAttack > 2 ? c.flat : c.uphill;
        if ((cardVal - localPenalty) === targetNumeric) { chosenCard = c; managed = true; break; }
      }
      // If no exact, choose smallest >= targetNumeric
      if (!chosenCard) {
        let candidate = null;
        let candidateEff = Infinity;
        for (const c of top4) {
          if (c.id && c.id.startsWith('TK-1')) continue;
          const cardVal = svForAttack > 2 ? c.flat : c.uphill;
          const eff = cardVal - localPenalty;
          if (eff >= targetNumeric && eff < candidateEff) { candidate = c; candidateEff = eff; }
        }
        if (candidate) { chosenCard = candidate; managed = true; }
      }
    }

    if (!chosenCard) {
  const isDown = (track && typeof rider.position === 'number') ? track[rider.position] === '_' : false;
  const res = chooseCardToPlay(rider.cards || [], slipstream, penalty, groupSpeed, chosenValue, isDown, name);
      chosenCard = res.chosenCard; managed = res.managed;
    }

    // Attackers must never play TK-1 or tk_extra cards - they should use high-value cards (1-7)
    // If chooseCardToPlay returned a TK-1 or tk_extra, find a non-TK card from hand
    if (chosenCard && chosenCard.id && (chosenCard.id.startsWith('TK-1') || chosenCard.id === 'tk_extra 99')) {
      const nonTKCards = (rider.cards || []).filter(c => c && c.id && !c.id.startsWith('TK-1') && c.id !== 'tk_extra 99');
      if (nonTKCards.length > 0) {
        // Pick the highest value card for attacker (lowest card number = best card)
        const svCheck = getSlipstreamValue(rider.position, rider.position + 10, track);
        let bestCard = nonTKCards[0];
        let bestVal = svCheck > 2 ? bestCard.flat : bestCard.uphill;
        let bestNum = parseInt(bestCard.id.match(/\d+/)?.[0] || '15');
        for (const c of nonTKCards) {
          const val = svCheck > 2 ? c.flat : c.uphill;
          const num = parseInt(c.id.match(/\d+/)?.[0] || '15');
          if (val > bestVal || (val === bestVal && num < bestNum)) { 
            bestCard = c; 
            bestVal = val;
            bestNum = num;
          }
        }
        chosenCard = bestCard;
        logs.push(`${name}: Attacker replacing TK-1 with best available card ${bestCard.id}`);
      }
    }

    // Final check: if still holding TK-1 or tk_extra, try to replace with a regular card
    if (chosenCard && chosenCard.id && (chosenCard.id.startsWith('TK-1') || chosenCard.id === 'tk_extra 99')) {
      const top4 = (rider.cards || []).slice(0, Math.min(4, rider.cards.length));
      const svCheck = getSlipstreamValue(rider.position, rider.position + Math.floor(targetNumeric), track);
      // Prefer exact match
      let replacement = null;
      for (const c of top4) {
        if (c.id && (c.id.startsWith('TK-1') || c.id === 'tk_extra 99')) continue;
        const cardVal = svCheck > 2 ? c.flat : c.uphill;
        if (cardVal === targetNumeric) { replacement = c; break; }
      }
      // Fallback to smallest >= targetNumeric
      if (!replacement) {
        let candidate = null;
        let candidateEff = Infinity;
  const localPenalty = top4.slice(0,4).filter(tc => tc && tc.id === 'TK-1: 99').length;
        for (const c of top4) {
          if (c.id && (c.id.startsWith('TK-1') || c.id === 'tk_extra 99')) continue;
          const cardVal = svCheck > 2 ? c.flat : c.uphill;
          const eff = cardVal - localPenalty;
          if (eff >= targetNumeric && eff < candidateEff) { candidate = c; candidateEff = eff; }
        }
        if (candidate) replacement = candidate;
      }
      if (replacement) chosenCard = replacement;
    }

    if (!chosenCard) { logs.push(`${name} (${rider.team}) attacker: No valid card found!`); continue; }

  // If starting on a downhill '_' field, movement uses at least 5 before penalties
  let cardValue = slipstream > 2 ? chosenCard.flat : chosenCard.uphill;
  if (track[rider.position] === '_') cardValue = Math.max(cardValue, 5);
  const effectiveValue = Math.max(cardValue - penalty, 0);

    attackerMoves.push({ name, rider, chosenCard, managed, oldPosition, cardValue, effectiveValue });
  }

  attackerMoves.sort((a, b) => b.effectiveValue - a.effectiveValue);

  let maxAttackerPos = -Infinity;
  for (let i = 0; i < attackerMoves.length; i++) {
  const m = attackerMoves[i];
  const name = m.name;
  const rider = updatedCards[name];
  const oldPosition = m.oldPosition;
  let chosenCard = m.chosenCard;

    let effectiveValue = m.effectiveValue;
    const finishPos = track.indexOf('F');

    let extra = (i === 0) ? 1 : 0;
    let absorbedIntoGroup = false;
    
    if (extra === 1) {
      // Deny extra field if attacker speed is less than group speed
      if (effectiveValue < groupSpeed) {
        extra = 0;
        logs.push(`Lead attacker extra denied (attacker speed ${effectiveValue} < group speed ${groupSpeed}): ${name}`);
        
        // Check if attacker should be absorbed back into group (within slipstream range)
        const attackerNewPos = rider.position + effectiveValue;
        if (groupPosition !== undefined && attackerNewPos < groupPosition && groupPosition - attackerNewPos <= slipstream) {
          absorbedIntoGroup = true;
          logs.push(`Attacker absorbed into group (within SV=${slipstream}): ${name} would be at ${attackerNewPos}, group at ${groupPosition}`);
        }
      } else if (finishPos !== -1) {
        if (rider.position + effectiveValue >= finishPos) {
          extra = 0;
          logs.push(`Lead attacker extra denied (would reach finish without extra): ${name} pos=${rider.position} eff=${effectiveValue} finish=${finishPos}`);
        } else {
          let tentativeNewPos = rider.position + effectiveValue + extra;
          const tentativeSegment = track.slice(rider.position, tentativeNewPos + 1);
          const tentativeNedk = (tentativeSegment.match(/_/g) || []).length;
          tentativeNewPos += tentativeNedk;
          if (tentativeNewPos >= finishPos) {
            extra = 0; logs.push(`Lead attacker extra denied (extra would reach or pass finish): ${name} pos=${rider.position} eff=${effectiveValue} tentativeNewPos=${tentativeNewPos} finish=${finishPos}`);
          } else {
            logs.push(`Lead attacker extra granted: ${name} pos=${rider.position} eff=${effectiveValue} tentativeNewPos=${tentativeNewPos} finish=${finishPos}`);
          }
        }
      }
    }

    let moveBy = effectiveValue + extra;
    let newPos = rider.position + moveBy;
    
    // If absorbed into group, move to group position instead
    if (absorbedIntoGroup && groupPosition !== undefined) {
      newPos = groupPosition;
      moveBy = newPos - rider.position;
    }

    // Check if attacker can catch other attackers from same group
    if (maxAttackerPos !== -Infinity && !absorbedIntoGroup) {
      const baseReach = rider.position + effectiveValue;
      if (maxAttackerPos - slipstream <= baseReach) {
        newPos = Math.max(newPos, maxAttackerPos);
      }
    }
    
    // Check if attacker can catch groups that moved earlier in this turn
    if (!absorbedIntoGroup && previousGroupPositions.length > 0) {
      const riderStartPos = rider.position || 0;
      const maxReachWithSV = riderStartPos + effectiveValue + slipstream;
      const maxReachWithoutSV = riderStartPos + effectiveValue;
      
      // Find the furthest group position this attacker can reach
      for (const [targetPos, targetSV] of previousGroupPositions) {
        // Attacker can catch this group if it's within their card value + slipstream range
        if (targetPos >= maxReachWithoutSV && targetPos <= maxReachWithSV) {
          if (targetPos > newPos) {
            newPos = targetPos;
            logs.push(`${name} (attacker): Catches group at pos ${targetPos} with slipstream`);
          }
        }
      }
    }

    let updatedHandCards = [...(rider.cards || [])];
    let updatedDiscarded = [...(rider.discarded || [])];
    const topN = Math.min(4, updatedHandCards.length);
    const topFour = updatedHandCards.slice(0, topN);
    if (chosenCard.id === 'tk_extra 99') {
      // Remove any synthetic tk_extra cards from hand (they should not be discarded)
      updatedHandCards = updatedHandCards.filter(c => !(c && c.id === 'tk_extra 99'));
      // Discard the top 4 REAL cards (cards 1-4). If fewer than 4 remain, discard what's available.
      const discardCount = Math.min(4, updatedHandCards.length);
      const cardsToDiscard = updatedHandCards.splice(0, discardCount);
      const converted = cardsToDiscard.map(cd => (cd && cd.id && cd.id.startsWith('TK-1')) ? { id: 'kort: 16', flat: 2, uphill: 2 } : cd);
      updatedDiscarded = [...updatedDiscarded, ...converted];
      logs.push(`${name}: (attacker) tk_extra brugt - ${converted.length} kort til discard`);
      try { delete updatedCards[name].planned_card_id; delete updatedCards[name].human_planned; } catch (e) {}
    } else {
      // Remove exactly the chosen card instance (match by reference)
      const globalIndex = updatedHandCards.findIndex(c => c === chosenCard);
      if (globalIndex !== -1) updatedHandCards.splice(globalIndex, 1);
      for (const c of topFour) {
        if (c === chosenCard) continue;
        const idx = updatedHandCards.findIndex(hc => hc === c);
        if (idx !== -1) {
          const [removed] = updatedHandCards.splice(idx, 1);
          const disc = (removed && removed.id && removed.id.startsWith('TK-1')) ? { id: 'kort: 16', flat: 2, uphill: 2 } : removed;
          updatedDiscarded.push(disc);
        }
      }
      logs.push(`${name} (attacker): spillede ${chosenCard.id}`);
    }

    // Removed downhill pass-through extra and related discard removal per new rules.

    updatedHandCards.unshift({ id: 'TK-1: 99', flat: -1, uphill: -1 });
    updatedDiscarded = [...updatedDiscarded, { id: 'TK-1: 99', flat: -1, uphill: -1 }];
    logs.push(`${name} (attacker): +TK-1 added to top of hand and TK-1 to discard (attack)`);

    if (updatedHandCards.length < 5) {
      updatedHandCards.push(...updatedDiscarded);
      shuffle(updatedHandCards, rng);
      updatedDiscarded = [];
      logs.push(`${name} (attacker): kort blandet`);
    }

    try {
      if (finishPos !== -1 && oldPosition < finishPos && newPos >= finishPos) {
        logs.push(`Attacker crossed finish: ${name} (group ${rider.group}) — prel_time will be assigned when sprint is processed`);
      }
    } catch (e) {}

    updatedCards[name] = {
      ...rider,
      position: newPos,
      old_position: oldPosition,
      cards: updatedHandCards,
      discarded: updatedDiscarded,
      fatigue: rider.fatigue,
      penalty: getPenalty(name, cardsObj),
      played_card: chosenCard.id,
      // store the attacker's effective played value for consistent ordering
      played_effective: effectiveValue,
      moved_fields: newPos - oldPosition,
      move_distance_for_prel: newPos - oldPosition,
      last_group_speed: groupSpeed,
      eligible_for_speed: true // Attackers always meet their own speed requirement
    };

    const cardFlatA = chosenCard.flat ?? 0;
    const cardUphillA = chosenCard.uphill ?? 0;
    logs.push(`Attacker ${name}: ${oldPosition}→${newPos} (card ${chosenCard.id} #(${cardFlatA}-${cardUphillA})#${extra===1 ? ', +1 extra field' : ''})`);

    groupsNewPositions.push([newPos, slipstream]);
    groupsNewPositions.sort((a, b) => b[0] - a[0]);

    if (newPos > maxAttackerPos) maxAttackerPos = newPos;
  }

  return { updatedCards, groupsNewPositions, logs };
};
