// Shared pure game logic utilities (exported for UI modules)

export const convertToSeconds = (number) => {
  const minutes = Math.floor(number / 60);
  const seconds = String(Math.floor(number - minutes * 60)).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const getSlipstreamValue = (pos1, pos2, track) => {
  const segment = track.slice(pos1, pos2 + 1);
  const nedk = (segment.match(/_/g) || []).length;
  const adjustedPos2 = pos2 + nedk;
  if (track.slice(pos1, adjustedPos2 + 1).includes('0')) return 0;
  if (track.slice(pos1, adjustedPos2 + 1).includes('1')) return 1;
  if (track.slice(pos1, adjustedPos2 + 1).includes('2')) return 2;
  return 3;
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
  try {
    const groups = Array.from(new Set(Object.values(cards).map(r => r.group))).sort((a,b) => a-b);
    const groupPositions = {};
    for (const g of groups) {
      groupPositions[g] = Math.max(...Object.values(cards).filter(r => r.group === g).map(r => r.position));
    }
    // eslint-disable-next-line no-console
    console.log('detectSprintGroups: finishLine=', finishLine, 'groupPositions=', groupPositions);
  } catch (e) {}

  for (const rider of Object.values(cards)) {
    if (rider.position >= finishLine) {
      if (!sprintGroups.includes(rider.group)) {
        sprintGroups.push(rider.group);
      }
    }
  }
  
  return sprintGroups.sort((a, b) => a - b);
};

export const getRandomTrack = (rng = Math.random) => {
  let track = String(Math.floor(rng() * 4));
  for (let i = 0; i < 60; i++) {
    const a = rng();
    if (a < 0.03) track += '0';
    else if (a < 0.25) track += '1';
    else if (a < 0.32) track += '2';
    else if (a < 0.62) track += '_';
    else track += '3';
  }
  return track + 'FFFFFFFFFFF';
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
    for (let i = 0; i < 4; i++) newCards.push({ id: 'kort: 16', flat: 2, uphill: 2 });
  }
  return newCards.sort(() => rng() - 0.5);
};

// AI helper: choose a card to play from a rider's hand (pure function)
export const chooseCardToPlay = (riderCards, sv, penalty, speed, chosenValue) => {
  // (function body preserved from App.js)
  let chosenCard = null;
  let bestCardNumber = 999;
  let managed = false;
  const hasECOnHand = riderCards.some(c => c.id === 'kort: 16');
  const availableCardsBase = [...riderCards.slice(0, 4)];
  let availableCards = [...availableCardsBase];

  if (chosenValue > 0 && chosenValue === speed) {
    let fallbackTK = null;
    for (const card of availableCards.slice(0, 4)) {
      const cardValue = sv > 2 ? card.flat - penalty : card.uphill - penalty;
      if (cardValue === chosenValue) {
        const cardNum = parseInt(card.id.match(/\d+/)?.[0] || '15');
        if (card.id && card.id.startsWith('TK-1')) {
          if (!fallbackTK || cardNum < parseInt(fallbackTK.match(/\d+/)?.[0] || '15')) fallbackTK = card.id;
          continue;
        }
        if (cardNum < bestCardNumber) {
          chosenCard = card;
          bestCardNumber = cardNum;
          managed = true;
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
        }
      }
    }
  } else {
    const minimumRequired = speed - sv;
    bestCardNumber = 0;

    if (minimumRequired <= 2 && !hasECOnHand) {
      availableCards = [...availableCardsBase, { id: 'tk_extra 15', flat: 2, uphill: 2 }];
    } else {
      availableCards = [...availableCardsBase];
    }

    for (const card of availableCards) {
      const cardValue = sv > 2 ? card.flat - penalty : card.uphill - penalty;
      if (cardValue >= minimumRequired) {
        const cardNum = parseInt(card.id.match(/\d+/)?.[0] || '15');
        if (card.id && card.id.startsWith('TK-1')) {
          if (!chosenCard) {
            chosenCard = card;
            bestCardNumber = cardNum;
            managed = true;
          }
        } else {
        if (!chosenCard || (chosenCard.id && chosenCard.id.startsWith('TK-1')) || cardNum > bestCardNumber) {
            chosenCard = card;
            bestCardNumber = cardNum;
            managed = true;
          }
        }
      }
    }
  }

  if (!chosenCard) {
    let lowestNum = 999;
    for (const card of availableCards.slice(0, 4)) {
      const cardNum = parseInt(card.id.match(/\d+/)?.[0] || '15');
      if (cardNum < lowestNum) {
        chosenCard = card;
        lowestNum = cardNum;
      }
    }
  }

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

export const getPenalty = (riderName, cards) => {
  const riderCards = (cards[riderName] && cards[riderName].cards) || [];
  for (let i = 0; i < Math.min(4, riderCards.length); i++) {
    if (riderCards[i].id === 'TK-1: 99') return 1;
  }
  return 0;
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

export const takesLeadFC = (riderName, cardsState, trackStr, numberOfTeams, floating = false, write = false, attackersInTurn = [], logger = () => {}, rng = Math.random) => {
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

  try { logger(`TLFC START ${riderName} group=${group} groupSize=${groupSize} ratio=${ratio.toFixed(3)} sv=${sv}`); } catch (e) {}

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

    const attack_prob = Math.floor(1 / Math.max(1e-9, attack_prob_percent)) + 1;
    try { logger(`TLFC ${riderName}: attack_prob_percent=${attack_prob_percent.toFixed(6)} attack_prob=${attack_prob}`); } catch(e) {}
    if (Math.floor(rng() * (attack_prob + 1)) === 1) {
      if (groupSize > 2) {
        try { logger(`TLFC DECISION ${riderName} chooses to ATTACK (attack_prob_percent=${attack_prob_percent.toFixed(6)}, attack_prob=${attack_prob})`); } catch(e) {}
        if (!floating) return 2; else return 2;
      }
    }
  }

  let prob_front = 0, prob_team_front = 0, prob_group = 0;
  let prob_team_back = 0, prob_team_group = 0, prob_back = 0;
  let team_members_in_group = 0;

  for (const r of Object.values(cardsState)) {
    if (r.finished) continue;
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

    if (!floating) {
      const prob = Math.max(0, chance_tl) / (1 + Math.max(0, chance_tl));
      if (rng() < prob) {
        try { logger(`TLFC DECIDE ${riderName} chance_tl=${chance_tl.toFixed(4)} prob=${prob.toFixed(3)} -> RETURNS 1`); } catch(e) {}
        return 1;
      }
    } else {
      return chance_tl;
    }
  }

  try { logger(`TLFC END ${riderName} chance_tl=${chance_tl.toFixed(4)} -> RETURNS 0`); } catch(e) {}
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

    if (trackStr[rider.position] === '_') {
      if (ideal_move < 7.2) ideal_move = -10;
    }
  }

  const sv = getSlipstreamValue(rider.position, rider.position + Math.floor(ideal_move), trackStr);
  const [pvs0, pvs1] = getPullValue(paces, sv);

  if (Math.floor(ideal_move) <= pvs0) {
    if (!(sv === 3 && pvs1 === 1)) {
      return 0;
    }
  }

  let penalty = 0;
  for (const c of (rider.cards || []).slice(0, 4)) {
    if (c.id === 'TK-1: 99') { penalty = 1; break; }
  }

  let selectedCard = (rider.cards && rider.cards[0]) ? rider.cards[0] : { flat: 2, uphill: 2, id: 'kort: 1' };
  let bestError = 1000;

  for (const card of (rider.cards || []).slice(0, 4)) {
    const svCard = getSlipstreamValue(rider.position, rider.position + card.flat, trackStr);
    const value = svCard < 3 ? (card.uphill - penalty) : (card.flat - penalty);
    const error_card = Math.pow(Math.abs(value - ideal_move), 2) + card.uphill / 100;

    let errorTMs = 0;
    const teamMates = getTeamMatesInGroup(riderName, cardsState);
    for (const tm of teamMates) {
      let errorTM = 25;
      const penaltyTM = getPenalty(tm, cardsState);
      const possible = [...(cardsState[tm].cards || []).slice(0, 4), { flat: 2, uphill: 2 }];
      for (const ctm of possible) {
        const vtm = svCard < 3 ? (ctm.uphill - penaltyTM) : (ctm.flat - penaltyTM);
        const errTMcard = Math.abs(value - vtm + svCard);
        if (errTMcard < errorTM) errorTM = errTMcard;
      }
      errorTM = errorTM * ((cardsState[tm].win_chance || 0) / 100);
      errorTMs += errorTM;
    }

    const track_length = trackStr.indexOf('F');
    const len_left = track_length - rider.position;
    const error_total = (svCard < 3 ? 4 * error_card : error_card) / Math.max(1, len_left) + errorTMs;

    if (error_total < bestError) {
      selectedCard = card;
      bestError = error_total;
    }
  }

  const svFinal = getSlipstreamValue(rider.position, rider.position + selectedCard.flat, trackStr);
  const selectedNumeric = svFinal === 3 ? selectedCard.flat : selectedCard.uphill;

  const [pv0, pv1] = getPullValue(paces, svFinal);
  
  if (selectedNumeric <= pv0) {
    if (!(svFinal === 3 && pv1 === 1)) return 0;
  }

  const finalValue = Math.max(0, Math.round(selectedNumeric - penalty));

  const top4 = (rider.cards || []).slice(0, 4);
  const allowed = new Set(top4.map(c => Math.round((getSlipstreamValue(rider.position, rider.position + c.flat, trackStr) === 3 ? c.flat : c.uphill) - (c.id === 'TK-1: 99' ? 1 : 0))));
  if (!allowed.has(finalValue)) {
    let best = null;
    let bestDiff = Infinity;
    for (const v of allowed) {
      const d = Math.abs(v - finalValue);
      if (d < bestDiff) { bestDiff = d; best = v; }
    }
    if (best === null) return 0;
    return best;
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
export const computeNonAttackerMoves = (cardsObj, groupNum, groupSpeed, slipstream, track, rng = Math.random) => {
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

    const isLeadRider = chosenValue > 0 && chosenValue === groupSpeed;

    // Choose card
    let chosenCard = null;
    let managed = false;

    if (rider.planned_card_id) {
      const idx = (rider.cards || []).findIndex(c => c.id === rider.planned_card_id);
      if (idx !== -1) {
        const plannedCandidate = (rider.cards || [])[idx];
        let acceptPlanned = true;
        if (isLeadRider) {
          const targetVal = Math.round(chosenValue);
          const svForLead = getSlipstreamValue(rider.position, rider.position + Math.floor(targetVal), track);
          const top4 = (rider.cards || []).slice(0, Math.min(4, (rider.cards || []).length));
          const localPenalty = top4.slice(0,4).some(tc => tc && tc.id === 'TK-1: 99') ? 1 : 0;
          const plannedCardVal = svForLead > 2 ? plannedCandidate.flat : plannedCandidate.uphill;
          if ((plannedCardVal - localPenalty) !== targetVal) acceptPlanned = false;
        }
        if (acceptPlanned) { chosenCard = plannedCandidate; managed = true; delete updatedCards[name].planned_card_id; }
      }
    }

    if (!chosenCard) {
      if (isLeadRider) {
        const targetVal = Math.round(chosenValue);
        const top4 = (rider.cards || []).slice(0, Math.min(4, (rider.cards || []).length));
        const svForLead = getSlipstreamValue(rider.position, rider.position + Math.floor(targetVal), track);
        let found = null;
        for (const c of top4) {
          const cv = svForLead > 2 ? c.flat : c.uphill;
          const localPenalty = top4.slice(0,4).some(tc => tc && tc.id === 'TK-1: 99') ? 1 : 0;
          if ((cv - localPenalty) === targetVal) { found = c; break; }
        }
        if (found) { chosenCard = found; managed = true; }
      }
    }

    if (!chosenCard) {
      const res = chooseCardToPlay(rider.cards || [], slipstream, penalty, groupSpeed, chosenValue);
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

    const cardValue = slipstream > 2 ? chosenCard.flat : chosenCard.uphill;
    const effectiveValue = Math.max(cardValue - penalty, 0);

    const minRequiredToFollow = Math.max(0, groupSpeed - slipstream);
    let eligibleForSlip = effectiveValue >= minRequiredToFollow;
    let moveBy = eligibleForSlip ? Math.min(effectiveValue + slipstream, groupSpeed) : effectiveValue;
    let newPos = (rider.position || 0) + moveBy;

    // downhill bonus
    const trackSegment = track.slice(rider.position, newPos + 1);
    let nedk = (trackSegment.match(/_/g) || []).length;
    newPos += nedk;

    // adjust based on groupsNewPositions to avoid overlapping
    if (groupsNewPositions.length > 0) {
      const potPosition = (rider.position || 0) + effectiveValue + slipstream + nedk;
      for (const [targetPos] of groupsNewPositions) {
        if (potPosition >= targetPos) newPos = Math.max(newPos, targetPos);
      }
    }

    // card hand/discard handling (simplified: remove chosenCard from hand, push others from top4 to discarded)
    let updatedHandCards = [...(rider.cards || [])];
    let updatedDiscarded = [...(rider.discarded || [])];
    const topN = Math.min(4, updatedHandCards.length);
    const topFour = updatedHandCards.slice(0, topN);

    if (chosenCard.id === 'tk_extra 15') {
      const cardsToDiscard = updatedHandCards.splice(0, topN);
      const converted = cardsToDiscard.map(cd => (cd && cd.id && cd.id.startsWith('TK-1')) ? { id: 'kort: 16', flat: 2, uphill: 2 } : cd);
      updatedDiscarded = [...updatedDiscarded, ...converted];
      logs.push(`${name}: tk_extra brugt - ${converted.length} kort til discard`);
    } else {
      const globalIndex = updatedHandCards.findIndex(c => c.id === chosenCard.id);
      if (globalIndex !== -1) updatedHandCards.splice(globalIndex, 1);

      for (const c of topFour) {
        if (c.id !== chosenCard.id) {
          const idx = updatedHandCards.findIndex(hc => hc.id === c.id);
          if (idx !== -1) {
            const [removed] = updatedHandCards.splice(idx, 1);
            const disc = (removed && removed.id && removed.id.startsWith('TK-1')) ? { id: 'kort: 16', flat: 2, uphill: 2 } : removed;
            updatedDiscarded.push(disc);
          }
        }
      }
    }

    // downhill discard removal
    let nedk2 = nedk;
    const recentDiscarded = [...updatedDiscarded].reverse();
    for (const card of recentDiscarded) {
      if (nedk2 <= 0) break;
      const cardNum = parseInt(card.id.match(/\d+/)?.[0] || '0');
      if (cardNum > 12) {
        const idx = updatedDiscarded.lastIndexOf(card);
        updatedDiscarded.splice(idx, 1);
        nedk2--;
        logs.push(`${name}: kort fjernet (downhill) - ${card.id}`);
      }
    }

    // reshuffle if under 6
    if (updatedHandCards.length < 6) {
      updatedHandCards.push(...updatedDiscarded);
      // simple shuffle using rng
      updatedHandCards.sort(() => rng() - 0.5);
      updatedDiscarded = [];
      logs.push(`${name}: kort blandet`);
    }

    // add EC / TK-1 handling simplified
    let ecs = 0;
    const cardNum = parseInt(chosenCard.id.match(/\d+/)?.[0] || '15');
    if (isLeadRider) ecs = 1;
    if (cardNum >= 3 && cardNum <= 5) ecs += 1;
    const hasTK1 = (chosenCard.id && chosenCard.id.startsWith('TK-1')) || (cardNum >= 1 && cardNum <= 2);
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
      moved_fields: newPos - oldPosition,
      move_distance_for_prel: newPos - oldPosition,
      last_group_speed: groupSpeed
    };

    const managedStr = managed ? '✓' : '✗';
    const takesLeadStr = chosenValue > 0 ? ' (lead)' : '';
    const cardFlat = chosenCard.flat ?? 0;
    const cardUphill = chosenCard.uphill ?? 0;
    logs.push(`Group ${groupNum}: ${name} (${rider.team}) spiller ${chosenCard.id} (${cardFlat}-${cardUphill}) ${oldPosition}→${newPos}${takesLeadStr} ${managedStr}`);

    groupsNewPositions.push([newPos, slipstream]);
    groupsNewPositions.sort((a, b) => b[0] - a[0]);
  }

  return { updatedCards, groupsNewPositions, logs };
};

// Pure runSprints implementation extracted from App.js.
// Returns { updatedCards, result, latestPt, logs }
export const runSprintsPure = (cardsObj, trackStr, sprintGroup = null, round = 0, sprintResults = [], latestPrel = 0, rng = Math.random) => {
  const logs = [];
  const sprintGroups = sprintGroup !== null ? [sprintGroup] : detectSprintGroups(cardsObj, trackStr);
  if (!sprintGroups || sprintGroups.length === 0) return { updatedCards: cardsObj, result: sprintResults, latestPt: latestPrel, logs };

  const updatedCards = JSON.parse(JSON.stringify(cardsObj));
  let winnerTime = Infinity;
  let result = [...sprintResults];
  let latestPt = latestPrel || 0;

  // First pass: assign prel_time for riders in all sprint groups (if they crossed finish)
  const assignedPrel = new Set();
  const finishPos = trackStr.indexOf('F');
  if (finishPos !== -1) {
    for (const sprintGroupId of sprintGroups) {
      for (const riderName of Object.keys(updatedCards)) {
        const r = updatedCards[riderName];
        if (r.group !== sprintGroupId) continue;
        if (typeof r.position !== 'number' || r.position < finishPos) continue;
        try {
          const oldPos = (typeof r.old_position === 'number') ? r.old_position : r.position;
          const fieldsToFinish = Math.max(0, finishPos - oldPos);
          const speedForFraction = (r && r.move_distance_for_prel && r.move_distance_for_prel > 0)
            ? r.move_distance_for_prel
            : ((r && r.last_group_speed && r.last_group_speed > 0)
              ? r.last_group_speed
              : 1);
          const fraction = Math.max(0, Math.min(1, fieldsToFinish / speedForFraction));
          const prelSeconds = (round + fraction) * 60;
          if (!(typeof r.prel_time === 'number' && r.prel_time !== 10000)) {
            updatedCards[riderName] = { ...r, prel_time: prelSeconds };
            assignedPrel.add(riderName);
            latestPt = Math.max(latestPt, prelSeconds);
            logs.push(`Assigned prel_time for ${riderName} (group ${sprintGroupId}): ${convertToSeconds(prelSeconds)} (fraction=${fraction.toFixed(3)}, denom=${speedForFraction}, oldPos=${oldPos})`);
          }
        } catch (e) {}
      }
    }

    // Normalize within each sprint group
    for (const sprintGroupId of sprintGroups) {
      const groupRidersAtFinish = Object.entries(updatedCards)
        .filter(([n, r]) => r.group === sprintGroupId && typeof r.position === 'number' && r.position >= finishPos);
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
      for (const [n, r] of Object.entries(updatedCards)) {
        if (typeof r.prel_time === 'number' && r.prel_time !== 10000) {
          const taf = Math.max(0, r.prel_time - globalMin);
          updatedCards[n] = { ...updatedCards[n], time_after_winner: taf };
          logs.push(`Set time_after_winner for ${n}: ${convertToSeconds(taf)}`);
        }
      }
    }
  }

  // Second pass: perform sprint scoring, logging and assign placements per sprint group
  for (const sprintGroupId of sprintGroups) {
    for (const riderName of Object.keys(updatedCards)) {
      const rider = updatedCards[riderName];
      if (rider.group !== sprintGroupId) continue;

      // move discarded back to hand and shuffle
      rider.cards = [...rider.cards, ...rider.discarded];
      rider.discarded = [];
      rider.cards.sort(() => rng() - 0.5);

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

    const groupRiders = Object.entries(updatedCards).filter(([n, r]) => r.group === sprintGroupId && !r.finished);

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
      result.push([overallPos, rName, convertToSeconds(rObj.prel_time || groupMinTime || 0), rObj.team]);
      updatedCards[rName] = { ...rObj, ranking: placeCounter, finished: true, result: overallPos };
    }
  }

  return { updatedCards, result, latestPt, logs };
};

// Compute attacker moves for a group as a pure function.
// Accepts the cards object (which should already include non-attacker updates),
// and returns { updatedCards, groupsNewPositions, logs }.
export const computeAttackerMoves = (cardsObj, groupNum, groupSpeed, slipstream, track, rng = Math.random) => {
  const updatedCards = JSON.parse(JSON.stringify(cardsObj));
  const logs = [];
  const groupsNewPositions = [];

  const names = Object.entries(updatedCards)
    .filter(([, r]) => r.group === groupNum)
    .map(([n]) => n);

  // Second phase: attackers
  const attackers = names.filter(n => updatedCards[n].attacking_status === 'attacker');
  if (attackers.length > 0) logs.push(`Attackers moving separately: ${attackers.join(', ')}`);

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
      if (idx !== -1) { chosenCard = rider.cards[idx]; managed = true; delete updatedCards[name].planned_card_id; }
    }

    if (!chosenCard && typeof targetNumeric === 'number' && targetNumeric > 0) {
      const top4 = (rider.cards || []).slice(0, Math.min(4, rider.cards.length));
      const svForAttack = getSlipstreamValue(rider.position, rider.position + Math.floor(targetNumeric), track);
      const localPenalty = top4.slice(0,4).some(tc => tc && tc.id === 'TK-1: 99') ? 1 : 0;
      for (const c of top4) {
        if (c.id && c.id.startsWith('TK-1')) continue;
        const cardVal = svForAttack > 2 ? c.flat : c.uphill;
        if ((cardVal - localPenalty) === targetNumeric) { chosenCard = c; managed = true; break; }
      }
    }

    if (!chosenCard) {
      const res = chooseCardToPlay(rider.cards || [], slipstream, penalty, groupSpeed, chosenValue);
      chosenCard = res.chosenCard; managed = res.managed;
    }

    if (chosenCard && chosenCard.id && chosenCard.id.startsWith('TK-1')) {
      const top4 = (rider.cards || []).slice(0, Math.min(4, rider.cards.length));
      const svCheck = getSlipstreamValue(rider.position, rider.position + Math.floor(targetNumeric), track);
      for (const c of top4) {
        if (c.id && c.id.startsWith('TK-1')) continue;
        const cardVal = svCheck > 2 ? c.flat : c.uphill;
        if (cardVal === targetNumeric) { chosenCard = c; break; }
      }
    }

    if (!chosenCard) { logs.push(`${name} (${rider.team}) attacker: No valid card found!`); continue; }

    const cardValue = slipstream > 2 ? chosenCard.flat : chosenCard.uphill;
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
    if (extra === 1 && finishPos !== -1) {
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

    let moveBy = effectiveValue + extra;
    let newPos = rider.position + moveBy;

    const trackSegment = track.slice(rider.position, newPos + 1);
    let nedk = (trackSegment.match(/_/g) || []).length;
    newPos += nedk;

    if (maxAttackerPos !== -Infinity) {
      const baseReach = rider.position + effectiveValue + nedk;
      if (maxAttackerPos - slipstream <= baseReach) {
        newPos = Math.max(newPos, maxAttackerPos);
      }
    }

    let updatedHandCards = [...(rider.cards || [])];
    let updatedDiscarded = [...(rider.discarded || [])];
    const topN = Math.min(4, updatedHandCards.length);
    const topFour = updatedHandCards.slice(0, topN);
    if (chosenCard.id === 'tk_extra 15') {
      const cardsToDiscard = updatedHandCards.splice(0, topN);
      const converted = cardsToDiscard.map(cd => (cd && cd.id && cd.id.startsWith('TK-1')) ? { id: 'kort: 16', flat: 2, uphill: 2 } : cd);
      updatedDiscarded = [...updatedDiscarded, ...converted];
      logs.push(`${name}: (attacker) tk_extra brugt - ${converted.length} kort til discard`);
    } else {
      const globalIndex = updatedHandCards.findIndex(c => c.id === chosenCard.id);
      if (globalIndex !== -1) updatedHandCards.splice(globalIndex, 1);
      for (const c of topFour) {
        if (c.id !== chosenCard.id) {
          const idx = updatedHandCards.findIndex(hc => hc.id === c.id);
          if (idx !== -1) {
            const [removed] = updatedHandCards.splice(idx, 1);
            const disc = (removed && removed.id && removed.id.startsWith('TK-1')) ? { id: 'kort: 16', flat: 2, uphill: 2 } : removed;
            updatedDiscarded.push(disc);
          }
        }
      }
      logs.push(`${name} (attacker): spillede ${chosenCard.id}`);
    }

    let nedk2 = nedk;
    const recentDiscarded = [...updatedDiscarded].reverse();
    for (const card of recentDiscarded) {
      if (nedk2 <= 0) break;
      const cardNum = parseInt(card.id.match(/\d+/)?.[0] || '0');
      if (cardNum > 12) {
        const idx = updatedDiscarded.lastIndexOf(card);
        updatedDiscarded.splice(idx, 1);
        nedk2--;
        logs.push(`${name} (attacker): kort fjernet (downhill) - ${card.id}`);
      }
    }

    updatedHandCards.unshift({ id: 'TK-1: 99', flat: -1, uphill: -1 });
    updatedDiscarded = [...updatedDiscarded, { id: 'TK-1: 99', flat: -1, uphill: -1 }];
    logs.push(`${name} (attacker): +TK-1 added to top of hand and TK-1 to discard (attack)`);

    if (updatedHandCards.length < 6) {
      updatedHandCards.push(...updatedDiscarded);
      updatedHandCards.sort(() => rng() - 0.5);
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
      moved_fields: newPos - oldPosition,
      move_distance_for_prel: newPos - oldPosition,
      last_group_speed: groupSpeed,
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
