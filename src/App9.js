import React, { useState } from 'react';
import { Play, SkipForward, FileText, Trophy, ArrowRight } from 'lucide-react';

// ========== UTILITY FUNCTIONS ==========
const convertToSeconds = (number) => {
  const minutes = Math.floor(number / 60);
  const seconds = String(Math.floor(number - minutes * 60)).padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const getSlipstreamValue = (pos1, pos2, track) => {
  const segment = track.slice(pos1, pos2 + 1);
  const nedk = (segment.match(/_/g) || []).length;
  const adjustedPos2 = pos2 + nedk;
  if (track.slice(pos1, adjustedPos2 + 1).includes('0')) return 0;
  if (track.slice(pos1, adjustedPos2 + 1).includes('1')) return 1;
  if (track.slice(pos1, adjustedPos2 + 1).includes('2')) return 2;
  return 3;
};

const getLength = (track) => {
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

const getWeightedValue = (track, factor = 0.5) => {
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

const getValue = (track) => {
  let tr = track.slice(0, track.indexOf('F') + 1);
  tr = tr.replace(/_/g, '3');
  tr = tr.slice(0, tr.indexOf('F'));
  
  let sum = 0;
  for (const char of tr) {
    sum += parseFloat(char) * 2/3;
  }
  
  return tr.length > 0 ? 100 * Math.pow(2 - sum / tr.length, 2) : 100;
};

const getGroupSize = (cards, group) => {
  return Object.values(cards).filter(r => r.group === group).length;
};

const getEMoveLeft = (rider, cards, track) => {
  const groupSize = getGroupSize(cards, rider.group);
  const lengthLeft = track.slice(rider.position, track.indexOf('F')).length;
  const diffLeft = 2 - getWeightedValue(track.slice(rider.position));
  const avSpeed = 5 - 0.15 * (diffLeft * (70 - rider.bjerg)) - 1.5 * rider.fatigue;
  const trackValue = 100 * 0.2 + 0.8 * (100 - getValue(track.slice(rider.position)));
  const movesLeft = lengthLeft / (avSpeed + 0.001 * trackValue * Math.pow(groupSize, 0.5));
  return movesLeft;
};

const getFavoritPoints = (rider) => {
  return 1 / (1.5 + rider.e_moves_left);
};

const getTotalMovesLeft = (cards, factor) => {
  let sum = 0;
  for (const rider of Object.values(cards)) {
    sum += Math.pow(rider.favorit_points, factor);
  }
  return sum;
};

const getWinChanceWoSprint = (rider, sum, factor) => {
  return 100 * (Math.pow(rider.favorit_points, factor) / sum);
};

const getWinChance = (rider, sum, factor, sprintWeight) => {
  return (1 - sprintWeight) * rider.win_chance_wo_sprint + sprintWeight * rider.sprint_chance;
};

const getPullValue = (paces, sv) => {
  if (!paces || paces.length === 0) return [0, 0];
  const maxPace = Math.max(...paces.map(p => Number(p) || 0));
  return [maxPace, 1];
};

const getFatigue = (rider) => {
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

const detectSprintGroups = (cards, track) => {
  const sprintGroups = [];
  const finishLine = track.indexOf('F');
  
  for (const rider of Object.values(cards)) {
    if (rider.position >= finishLine - 1) {
      if (!sprintGroups.includes(rider.group)) {
        sprintGroups.push(rider.group);
      }
    }
  }
  
  return sprintGroups.sort((a, b) => a - b);
};

const colourTrack = (track) => {
  const colors = {
    '0': 'text-purple-600 font-bold', '1': 'text-red-600 font-bold',
    '2': 'text-red-400 font-bold', '3': 'text-gray-600',
    '_': 'text-blue-600', 'F': 'text-green-600 font-bold text-xl'
  };
  return track.split('').map((char, i) => (
    <span key={i} className={colors[char] || 'text-gray-800'}>{char}</span>
  ));
};

const getRandomTrack = () => {
  let track = String(Math.floor(Math.random() * 4));
  for (let i = 0; i < 60; i++) {
    const a = Math.random();
    if (a < 0.03) track += '0';
    else if (a < 0.25) track += '1';
    else if (a < 0.32) track += '2';
    else if (a < 0.62) track += '_';
    else track += '3';
  }
  return track + 'FFFFFFFFFFF';
};

const getNumberEcs = (rider) => {
  let ecs = 0;
  for (const card of rider.cards) {
    if (card.id === 'kort: 16') ecs++;
  }
  for (const card of rider.discarded) {
    if (card.id === 'kort: 16') ecs++;
  }
  return ecs;
};

const getNumberTk1 = (rider) => {
  let tk1 = 0;
  for (const card of rider.cards) {
    if (card.id === 'TK-1: 99') tk1++;
  }
  for (const card of rider.discarded) {
    if (card.id === 'TK-1: 99') tk1++;
  }
  return tk1;
};

// ========== DATA ==========
const ridersData = [
  { NAVN: 'Abdoujabarov', FLAD: 69, BJERG: 58, SPRINT: 10, MENTALITET: 2,
    FLAD1: 7, FLAD2: 7, FLAD3: 6, FLAD4: 6, FLAD5: 5, FLAD6: 5, FLAD7: 5, FLAD8: 4, FLAD9: 4, FLAD10: 4, FLAD11: 4, FLAD12: 4, FLAD13: 3, FLAD14: 3, FLAD15: 2,
    BJERG1: 6, BJERG2: 6, BJERG3: 5, BJERG4: 5, BJERG5: 5, BJERG6: 4, BJERG7: 4, BJERG8: 4, BJERG9: 4, BJERG10: 3, BJERG11: 3, BJERG12: 3, BJERG13: 2, BJERG14: 2, BJERG15: 2 },
  { NAVN: 'Sune', FLAD: 49, BJERG: 39, SPRINT: -3, MENTALITET: 2,
    FLAD1: 5, FLAD2: 4, FLAD3: 4, FLAD4: 4, FLAD5: 3, FLAD6: 3, FLAD7: 3, FLAD8: 3, FLAD9: 3, FLAD10: 3, FLAD11: 3, FLAD12: 3, FLAD13: 2, FLAD14: 2, FLAD15: 2,
    BJERG1: 4, BJERG2: 3, BJERG3: 3, BJERG4: 3, BJERG5: 3, BJERG6: 3, BJERG7: 2, BJERG8: 2, BJERG9: 2, BJERG10: 2, BJERG11: 2, BJERG12: 2, BJERG13: 2, BJERG14: 2, BJERG15: 2 },
  { NAVN: 'Alexander Kristoff', FLAD: 72, BJERG: 62, SPRINT: 9, MENTALITET: 4,
    FLAD1: 7, FLAD2: 7, FLAD3: 7, FLAD4: 6, FLAD5: 6, FLAD6: 6, FLAD7: 5, FLAD8: 5, FLAD9: 4, FLAD10: 4, FLAD11: 4, FLAD12: 3, FLAD13: 3, FLAD14: 3, FLAD15: 2,
    BJERG1: 7, BJERG2: 6, BJERG3: 5, BJERG4: 5, BJERG5: 5, BJERG6: 5, BJERG7: 4, BJERG8: 4, BJERG9: 4, BJERG10: 4, BJERG11: 3, BJERG12: 3, BJERG13: 3, BJERG14: 2, BJERG15: 2 },
  { NAVN: 'Allan Johansen', FLAD: 67, BJERG: 60, SPRINT: 3, MENTALITET: 3,
    FLAD1: 7, FLAD2: 6, FLAD3: 6, FLAD4: 6, FLAD5: 5, FLAD6: 5, FLAD7: 5, FLAD8: 5, FLAD9: 4, FLAD10: 4, FLAD11: 4, FLAD12: 3, FLAD13: 3, FLAD14: 2, FLAD15: 2,
    BJERG1: 6, BJERG2: 6, BJERG3: 6, BJERG4: 5, BJERG5: 5, BJERG6: 5, BJERG7: 4, BJERG8: 4, BJERG9: 4, BJERG10: 3, BJERG11: 3, BJERG12: 3, BJERG13: 2, BJERG14: 2, BJERG15: 2 },
  { NAVN: 'Bauke Mollema', FLAD: 71, BJERG: 76, SPRINT: 2, MENTALITET: 4,
    FLAD1: 7, FLAD2: 7, FLAD3: 7, FLAD4: 6, FLAD5: 6, FLAD6: 6, FLAD7: 5, FLAD8: 5, FLAD9: 4, FLAD10: 4, FLAD11: 3, FLAD12: 3, FLAD13: 3, FLAD14: 3, FLAD15: 2,
    BJERG1: 8, BJERG2: 8, BJERG3: 7, BJERG4: 6, BJERG5: 6, BJERG6: 5, BJERG7: 5, BJERG8: 5, BJERG9: 5, BJERG10: 4, BJERG11: 4, BJERG12: 4, BJERG13: 3, BJERG14: 3, BJERG15: 3 },
  { NAVN: 'Bjarne Riis', FLAD: 75, BJERG: 78, SPRINT: 3, MENTALITET: 4,
    FLAD1: 8, FLAD2: 7, FLAD3: 7, FLAD4: 6, FLAD5: 6, FLAD6: 5, FLAD7: 5, FLAD8: 5, FLAD9: 5, FLAD10: 5, FLAD11: 4, FLAD12: 4, FLAD13: 3, FLAD14: 3, FLAD15: 3,
    BJERG1: 8, BJERG2: 8, BJERG3: 7, BJERG4: 6, BJERG5: 6, BJERG6: 6, BJERG7: 6, BJERG8: 5, BJERG9: 5, BJERG10: 4, BJERG11: 4, BJERG12: 4, BJERG13: 3, BJERG14: 3, BJERG15: 3 },
  { NAVN: 'Bo Hamburger', FLAD: 66, BJERG: 73, SPRINT: 2, MENTALITET: 5,
    FLAD1: 7, FLAD2: 7, FLAD3: 6, FLAD4: 6, FLAD5: 6, FLAD6: 5, FLAD7: 4, FLAD8: 4, FLAD9: 4, FLAD10: 4, FLAD11: 3, FLAD12: 3, FLAD13: 3, FLAD14: 2, FLAD15: 2,
    BJERG1: 8, BJERG2: 7, BJERG3: 7, BJERG4: 6, BJERG5: 5, BJERG6: 5, BJERG7: 5, BJERG8: 5, BJERG9: 4, BJERG10: 4, BJERG11: 4, BJERG12: 4, BJERG13: 3, BJERG14: 3, BJERG15: 3 },
  { NAVN: 'Bobby Julich', FLAD: 74, BJERG: 75, SPRINT: 3, MENTALITET: 3,
    FLAD1: 7, FLAD2: 7, FLAD3: 7, FLAD4: 6, FLAD5: 6, FLAD6: 6, FLAD7: 5, FLAD8: 5, FLAD9: 5, FLAD10: 4, FLAD11: 4, FLAD12: 4, FLAD13: 3, FLAD14: 3, FLAD15: 3,
    BJERG1: 7, BJERG2: 7, BJERG3: 6, BJERG4: 6, BJERG5: 6, BJERG6: 6, BJERG7: 5, BJERG8: 5, BJERG9: 5, BJERG10: 4, BJERG11: 4, BJERG12: 4, BJERG13: 4, BJERG14: 3, BJERG15: 3 },
  { NAVN: 'Brian Holm', FLAD: 74, BJERG: 64, SPRINT: 2, MENTALITET: 2,
    FLAD1: 7, FLAD2: 7, FLAD3: 6, FLAD4: 6, FLAD5: 6, FLAD6: 6, FLAD7: 5, FLAD8: 5, FLAD9: 4, FLAD10: 4, FLAD11: 4, FLAD12: 4, FLAD13: 4, FLAD14: 3, FLAD15: 3,
    BJERG1: 6, BJERG2: 6, BJERG3: 6, BJERG4: 6, BJERG5: 5, BJERG6: 5, BJERG7: 5, BJERG8: 4, BJERG9: 4, BJERG10: 4, BJERG11: 3, BJERG12: 3, BJERG13: 3, BJERG14: 2, BJERG15: 2 },
  { NAVN: 'Chris Anker', FLAD: 67, BJERG: 69, SPRINT: 1, MENTALITET: 3,
    FLAD1: 7, FLAD2: 6, FLAD3: 6, FLAD4: 6, FLAD5: 6, FLAD6: 5, FLAD7: 5, FLAD8: 4, FLAD9: 4, FLAD10: 4, FLAD11: 3, FLAD12: 3, FLAD13: 3, FLAD14: 3, FLAD15: 2,
    BJERG1: 7, BJERG2: 7, BJERG3: 6, BJERG4: 6, BJERG5: 5, BJERG6: 5, BJERG7: 5, BJERG8: 4, BJERG9: 4, BJERG10: 4, BJERG11: 4, BJERG12: 3, BJERG13: 3, BJERG14: 3, BJERG15: 3 },
  { NAVN: 'Christopher Juul-Jensen', FLAD: 71, BJERG: 60, SPRINT: 0, MENTALITET: 2,
    FLAD1: 7, FLAD2: 7, FLAD3: 6, FLAD4: 6, FLAD5: 6, FLAD6: 5, FLAD7: 5, FLAD8: 5, FLAD9: 4, FLAD10: 4, FLAD11: 4, FLAD12: 4, FLAD13: 3, FLAD14: 3, FLAD15: 3,
    BJERG1: 6, BJERG2: 6, BJERG3: 6, BJERG4: 5, BJERG5: 5, BJERG6: 4, BJERG7: 4, BJERG8: 4, BJERG9: 4, BJERG10: 3, BJERG11: 3, BJERG12: 3, BJERG13: 3, BJERG14: 2, BJERG15: 2 },
  { NAVN: 'Claus Michael Møller', FLAD: 70, BJERG: 71, SPRINT: 0, MENTALITET: 5,
    FLAD1: 7, FLAD2: 7, FLAD3: 6, FLAD4: 6, FLAD5: 5, FLAD6: 5, FLAD7: 5, FLAD8: 5, FLAD9: 4, FLAD10: 4, FLAD11: 4, FLAD12: 4, FLAD13: 3, FLAD14: 3, FLAD15: 2,
    BJERG1: 7, BJERG2: 6, BJERG3: 6, BJERG4: 6, BJERG5: 6, BJERG6: 6, BJERG7: 5, BJERG8: 5, BJERG9: 4, BJERG10: 4, BJERG11: 4, BJERG12: 4, BJERG13: 3, BJERG14: 3, BJERG15: 2 },
  { NAVN: 'Dag Otto Lauritsen', FLAD: 70, BJERG: 66, SPRINT: 2, MENTALITET: 5,
    FLAD1: 7, FLAD2: 7, FLAD3: 7, FLAD4: 6, FLAD5: 6, FLAD6: 5, FLAD7: 5, FLAD8: 5, FLAD9: 4, FLAD10: 4, FLAD11: 3, FLAD12: 3, FLAD13: 3, FLAD14: 3, FLAD15: 2,
    BJERG1: 7, BJERG2: 7, BJERG3: 6, BJERG4: 5, BJERG5: 5, BJERG6: 5, BJERG7: 4, BJERG8: 4, BJERG9: 4, BJERG10: 4, BJERG11: 4, BJERG12: 3, BJERG13: 3, BJERG14: 3, BJERG15: 2 },
  { NAVN: 'Edvald Boasson Hagen', FLAD: 73, BJERG: 67, SPRINT: 7, MENTALITET: 6,
    FLAD1: 8, FLAD2: 7, FLAD3: 7, FLAD4: 6, FLAD5: 6, FLAD6: 6, FLAD7: 5, FLAD8: 5, FLAD9: 5, FLAD10: 4, FLAD11: 3, FLAD12: 3, FLAD13: 3, FLAD14: 3, FLAD15: 2,
    BJERG1: 7, BJERG2: 7, BJERG3: 6, BJERG4: 6, BJERG5: 5, BJERG6: 5, BJERG7: 5, BJERG8: 4, BJERG9: 4, BJERG10: 4, BJERG11: 4, BJERG12: 3, BJERG13: 3, BJERG14: 2, BJERG15: 2 },
  { NAVN: 'Eros Poli', FLAD: 69, BJERG: 58, SPRINT: 1, MENTALITET: 3,
    FLAD1: 7, FLAD2: 6, FLAD3: 6, FLAD4: 6, FLAD5: 5, FLAD6: 5, FLAD7: 5, FLAD8: 4, FLAD9: 4, FLAD10: 4, FLAD11: 4, FLAD12: 4, FLAD13: 3, FLAD14: 3, FLAD15: 3,
    BJERG1: 6, BJERG2: 6, BJERG3: 5, BJERG4: 5, BJERG5: 5, BJERG6: 4, BJERG7: 4, BJERG8: 4, BJERG9: 4, BJERG10: 3, BJERG11: 3, BJERG12: 3, BJERG13: 2, BJERG14: 2, BJERG15: 2 },
];
const tracks = {
  'Yorkshire': '33333333333311333333333333331133333333333333113333333333333311333333FFFFFFFFF',
  'Liege': '3311111___333333333111333333333300000_3333333333333311133333333333333FFFFFFFFF',
  'Amstel': '33333333333113333113311330000333333333333003333311133333322333333FFFFFFFFFF',
  'random': 'random'
};

// ========== MAIN COMPONENT ==========
const CyclingGame = () => {
  const [gameState, setGameState] = useState('setup');
  const [trackName, setTrackName] = useState('Yorkshire');
  const [track, setTrack] = useState('');
  const [numberOfTeams, setNumberOfTeams] = useState(3);
  const [ridersPerTeam, setRidersPerTeam] = useState(3);
  const [cards, setCards] = useState({});
  const [round, setRound] = useState(0);
  const [currentGroup, setCurrentGroup] = useState(0);
  const [teams, setTeams] = useState([]);
  const [currentTeam, setCurrentTeam] = useState('Me');
  const [teamPaces, setTeamPaces] = useState({});
  const [movePhase, setMovePhase] = useState('input');
  const [groupSpeed, setGroupSpeed] = useState(0);
  const [slipstream, setSlipstream] = useState(0);
  const [attackersInTurn, setAttackersInTurn] = useState([]);
  const [logs, setLogs] = useState([]);
  const [aiMessage, setAiMessage] = useState('');
  const [expandedRider, setExpandedRider] = useState(null);

  const addLog = (msg) => setLogs(p => [...p, `[R${round}] ${msg}`]);

  const generateCards = (rider, isBreakaway = false) => {
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
          flat: Math.max(2, Math.min(7, Math.floor(rider.FLAD / 15) + Math.floor(Math.random() * 3))), 
          uphill: Math.max(2, Math.min(7, Math.floor(rider.BJERG / 15) + Math.floor(Math.random() * 3)))
        });
      }
    }
    
    if (isBreakaway) {
      for (let i = 0; i < 4; i++) newCards.push({ id: 'kort: 16', flat: 2, uphill: 2 });
    }
    return newCards.sort(() => Math.random() - 0.5);
  };

  const getPenalty = (riderName) => {
    const riderCards = cards[riderName].cards;
    for (let i = 0; i < Math.min(4, riderCards.length); i++) {
      if (riderCards[i].id === 'TK-1: 99') return 1;
    }
    return 0;
  };

 
const chooseCardToPlay = (riderCards, sv, penalty, speed, chosenValue) => {
  console.log('chooseCardToPlay:', {
    rider: riderCards[0]?.id,
    sv,
    penalty,
    speed,
    chosenValue,
    cards: riderCards.slice(0,4).map(c => ({id: c.id, flat: c.flat, uphill: c.uphill}))
  });

  let chosenCard = null;
  let bestCardNumber = 999;
  let managed = false;
  // Determine whether tk_extra should be available: only if rider doesn't
  // have an EC card on hand (kort: 16) and minimumRequired allows it.
  const hasECOnHand = riderCards.some(c => c.id === 'kort: 16');
  const availableCardsBase = [...riderCards.slice(0, 4)];
  // We'll decide about tk_extra availability later when we know minimumRequired
  let availableCards = [...availableCardsBase];

  if (chosenValue > 0 && chosenValue === speed) {
    // LEAD RIDER - skal spille præcis speed
    for (const card of availableCards.slice(0, 4)) { // Ikke tk_extra
      const cardValue = sv > 2 ? card.flat - penalty : card.uphill - penalty;
      if (cardValue === chosenValue) {
        const cardNum = parseInt(card.id.match(/\d+/)?.[0] || '15');
        if (cardNum < bestCardNumber) {
          chosenCard = card;
          bestCardNumber = cardNum;
          managed = true;
        }
      }
    }
  } else {
    // FØLGENDE RYTTER - skal kunne følge med (minimum speed - sv)
    const minimumRequired = speed - sv;
    bestCardNumber = 0; // Find højeste kortnummer der kan klare det

    // Decide tk_extra availability: only if minimumRequired <= 2 and rider has no EC on hand
    if (minimumRequired <= 2 && !hasECOnHand) {
      availableCards = [...availableCardsBase, { id: 'tk_extra 15', flat: 2, uphill: 2 }];
    } else {
      availableCards = [...availableCardsBase];
    }

    for (const card of availableCards) {
      const cardValue = sv > 2 ? card.flat - penalty : card.uphill - penalty;
      if (cardValue >= minimumRequired) {
        const cardNum = parseInt(card.id.match(/\d+/)?.[0] || '15');
        if (cardNum > bestCardNumber) {
          chosenCard = card;
          bestCardNumber = cardNum;
          managed = true;
        }
      }
    }
  }

  // Hvis intet kort kan matche, tag det laveste
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

  return { chosenCard, managed };
};

const takesLeadFC = (riderName, cardsState, trackStr, numberOfTeams, floating = false, write = false) => {
  // Ported/adapted from the original Streamlit logic (App7).
  const rider = cardsState[riderName];
  if (!rider) return 0;

  if (rider.attacking_status === 'attacker') return 1;

  const group = rider.group;
  const groupRiders = Object.values(cardsState).filter(r => r.group === group);
  const groupSize = groupRiders.length;
  const teamsInGroup = new Set(groupRiders.map(r => r.team)).size;
  const lenLeft = trackStr.indexOf('F') - rider.position;
  let bestSelCard = 100;
  const favorit = (rider.favorit || 0) + 2;

  const team = rider.team;
  const fraTeamIGruppe = groupRiders.filter(r => r.team === team).length;
  const ratio = fraTeamIGruppe / Math.max(1, groupSize);
  const sv = getSlipstreamValue(rider.position, rider.position + 8, trackStr);

  // Minimal trace for debugging why function returns 0/1/2
  try {
    addLog(`TLFC START ${riderName} group=${group} groupSize=${groupSize} ratio=${ratio.toFixed(3)} sv=${sv}`);
  } catch (e) {}

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

  // Attack probability
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
    if (Math.floor(Math.random() * (attack_prob + 1)) === 1) {
      if (groupSize > 2) {
        if (!floating) return 2; else return 2;
      }
    }
  }

  // Calculate team/group/front/back probabilities
  let prob_front = 0, prob_team_front = 0, prob_group = 0;
  let prob_team_back = 0, prob_team_group = 0, prob_back = 0;
  let team_members_in_group = 0;

  for (const r of Object.values(cardsState)) {
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

  const prob_teammembers_in_group = prob_team_group - (rider.win_chance || 0) / 100;
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
      // Map chance_tl (0..inf) to a probability in (0..1): p = chance_tl / (1 + chance_tl)
      const prob = Math.max(0, chance_tl) / (1 + Math.max(0, chance_tl));
      if (Math.random() < prob) {
        try { addLog(`TLFC DECIDE ${riderName} chance_tl=${chance_tl.toFixed(4)} prob=${prob.toFixed(3)} -> RETURNS 1`); } catch(e) {}
        return 1;
      }
    } else {
      return chance_tl;
    }
  }

  try { addLog(`TLFC END ${riderName} chance_tl=${chance_tl.toFixed(4)} -> RETURNS 0`); } catch(e) {}
  return 0;
};

const humanResponsibility = (group, humanTeams, groupSize, teamsInGroup, numberOfTeams, lenLeft, cards) => {
  const responses = [];
  
  for (const team of humanTeams) {
    let chanceTL = 0;
    let probFront = 0, probTeamFront = 0, probGroup = 0;
    let probTeamBack = 0, probTeamGroup = 0, probBack = 0;
    let teamMembersInGroup = 0;
    
    for (const rider2 of Object.values(cards)) {
      if (rider2.group === group) {
        if (rider2.team.includes(team)) {
          probTeamGroup += rider2.win_chance / 100;
          probGroup += rider2.win_chance / 100;
          teamMembersInGroup++;
        } else {
          probGroup += rider2.win_chance / 100;
        }
      }
      if (rider2.group < group) {
        if (rider2.team.includes(team)) {
          probTeamFront += rider2.win_chance / 100;
          probFront += rider2.win_chance / 100;
        } else {
          probFront += rider2.win_chance / 100;
        }
      }
      if (rider2.group > group) {
        if (rider2.team.includes(team)) {
          probTeamBack += rider2.win_chance / 100;
          probBack += rider2.win_chance / 100;
        } else {
          probBack += rider2.win_chance / 100;
        }
      }
    }
    
    const probTeamGroupShare = probTeamGroup / probGroup;
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

const getTeamMatesInGroup = (riderName, cards) => {
  const rider = cards[riderName];
  const teamMates = [];
  
  for (const [name, r] of Object.entries(cards)) {
    if (r.team === rider.team && r.group === rider.group && name !== riderName) {
      teamMates.push(name);
    }
  }
  
  return teamMates;
};

// Faithful port of Streamlit pick_value (step-by-step)
const pickValue = (riderName, cardsState, trackStr, paces) => {
  // Mirrors the original Streamlit function exactly where practical.
  if (!cardsState[riderName]) return 0;
  const rider = cardsState[riderName];

  // If rider is not taking lead, return 0
  if (rider.takes_lead === 0) return 0;

  

  // Determine ideal_move
  let ideal_move;
  if (rider.attacking_status === 'attacker') {
    ideal_move = 100;
  } else {
    const track_length = trackStr.indexOf('F');
    const len_left = track_length - rider.position;

    const best_left = Math.max(1, track_length - Math.max(...Object.values(cardsState).map(r => r.position)));
    ideal_move = Math.pow(len_left / best_left, 2) + 4;

    // add takes_lead_fc influence (floating version used in Streamlit)
    try {
      const tlv = takesLeadFC(riderName, cardsState, trackStr, numberOfTeams, true, false);
      ideal_move = ideal_move + Math.pow(tlv, 0.4);
    } catch (e) {
      ideal_move = ideal_move + 0;
    }

    ideal_move = ideal_move - len_left / 20;

    if (trackStr[rider.position] === '_') {
      if (ideal_move < 7.2) ideal_move = -10;
    }
  }

  // slipstream and pull values
  const sv = getSlipstreamValue(rider.position, rider.position + Math.floor(ideal_move), trackStr);
  const [pvs0, pvs1] = getPullValue(paces, sv);

  if (Math.floor(ideal_move) <= pvs0) {
    if (!(sv === 3 && pvs1 === 1)) {
      return 0;
    }
  }

  // penalty determination (max 1)
  let penalty = 0;
  for (const c of (rider.cards || []).slice(0, 4)) {
    if (c.id === 'TK-1: 99') { penalty = 1; break; }
  }

  // Choose best card among top-4 using the same error metric as Streamlit
  let selectedCard = (rider.cards && rider.cards[0]) ? rider.cards[0] : { flat: 2, uphill: 2, id: 'kort: 1' };
  let bestError = 1000;

  for (const card of (rider.cards || []).slice(0, 4)) {
    // compute sv for this card (Streamlit used card[1] as flat move)
    const svCard = getSlipstreamValue(rider.position, rider.position + card.flat, trackStr);

    const value = svCard < 3 ? (card.uphill - penalty) : (card.flat - penalty);
    const error_card = Math.pow(Math.abs(value - ideal_move), 2) + card.uphill / 100;

    // team-mates contribution (errorTMs)
    let errorTMs = 0;
    const teamMates = getTeamMatesInGroup(riderName, cardsState);
    for (const tm of teamMates) {
      let errorTM = 25;
      const penaltyTM = getPenalty(tm);
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

  // selected numeric value depends on slipstream for the chosen card
  const svFinal = getSlipstreamValue(rider.position, rider.position + selectedCard.flat, trackStr);
  const selectedNumeric = svFinal === 3 ? selectedCard.flat : selectedCard.uphill;

  const [pv0, pv1] = getPullValue(paces, svFinal);
  
  if (selectedNumeric <= pv0) {
    if (!(svFinal === 3 && pv1 === 1)) return 0;
  }

  // final value is card-based minus penalty and must be integer
  const finalValue = Math.max(0, Math.round(selectedNumeric - penalty));

  // Ensure the finalValue corresponds to a value from top-4 cards (flat/uphill minus penalty)
  const top4 = (rider.cards || []).slice(0, 4);
  const allowed = new Set(top4.map(c => Math.round((getSlipstreamValue(rider.position, rider.position + c.flat, trackStr) === 3 ? c.flat : c.uphill) - (c.id === 'TK-1: 99' ? 1 : 0))));
  if (!allowed.has(finalValue)) {
    // If not present, try to find the closest allowed value (prefer exact match)
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

const takesLeadFCFloating = (riderName, cardsState, track, numberOfTeams) => {
  // Same as takesLeadFC but returns chanceTL value instead of 0/1
  const rider = cardsState[riderName];
  
  if (rider.attacking_status === 'attacker') return 6;
  
  const group = rider.group;
  const groupRiders = Object.values(cardsState).filter(r => r.group === group);
  const groupSize = groupRiders.length;
  const team = rider.team;
  const fraTeamIGruppe = groupRiders.filter(r => r.team === team).length;
  const ratio = fraTeamIGruppe / groupSize;
  
  if (ratio === 1) return 6;
  
  // ... (rest of the probability calculations from takesLeadFC)
  // Return chanceTL value instead of 0/1
  
  // Simplified for now - you can expand this
  return 1;
};



  const autoPlayTeam = (groupNum) => {
  const teamRiders = Object.entries(cards).filter(([,r]) => r.group === groupNum && r.team === currentTeam);
  
  let pace = 0;
  if (teamRiders.length === 0) {
    addLog(`${currentTeam}: no riders`);
    // No riders to play for this team — return a result so the caller
    // (AI Play handler) can submit once. This prevents duplicate submissions.
    return { pace: 0, updatedCards: { ...cards } };
  }
  
  // Build a map of team -> max pace from both submitted teamPaces and any
  // already-selected values in the cards state. This lets the AI see other
  // computers' choices even before handlePaceSubmit writes to teamPaces.
  const teamPaceMap = {};
  Object.entries(teamPaces).forEach(([k, v]) => {
    if (!k.startsWith(`${groupNum}-`)) return;
    const t = k.split('-')[1];
    teamPaceMap[t] = Math.max(teamPaceMap[t] || 0, parseInt(v) || 0);
  });

  // Also incorporate any selected_value already present in cards for this group
  Object.entries(cards).forEach(([, r]) => {
    if (r.group !== groupNum) return;
    // Do not include attacks (human attackers set attacking_status === 'attacker')
    if (typeof r.selected_value === 'number' && r.selected_value > 0 && r.attacking_status !== 'attacker') {
      teamPaceMap[r.team] = Math.max(teamPaceMap[r.team] || 0, Math.round(r.selected_value));
    }
  });

  const currentPaces = Object.values(teamPaceMap).map(v => Number(v) || 0);
  
  const maxPaceSoFar = currentPaces.length > 0 ? Math.max(...currentPaces.filter(p => p > 0)) : 0;
  
  const updatedCards = {...cards};
  
  // Evaluate each rider individually
  const teamAttackDeclared = {};
  for (const [name] of teamRiders) {
    updatedCards[name].takes_lead = takesLeadFC(name, updatedCards, track, numberOfTeams, false);
    try { addLog(`TRACE takesLeadFC called for ${name} -> ${updatedCards[name].takes_lead}`); } catch(e) {}

    // Enforce max one attacker per team: if this rider wants to attack but
    // their team already has an attacker, cancel this attack intent.
    const tteam = updatedCards[name].team;
    if (updatedCards[name].takes_lead === 2) {
      if (teamAttackDeclared[tteam]) {
        // cancel this rider's attack intention
        updatedCards[name].takes_lead = 0;
      } else {
        teamAttackDeclared[tteam] = true;
        // mark as attacker
        updatedCards[name].attacking_status = 'attacker';
  // mark planned attacker (no TK-1 added here; attackers should not take TK-1)

        // Clear teammates' take_lead/selected_value
        for (const [otherName, otherR] of Object.entries(updatedCards)) {
          if (otherR.team === tteam && otherR.group === groupNum && otherName !== name) {
            updatedCards[otherName] = { ...otherR, takes_lead: 0, selected_value: 0 };
          }
        }
      }
    }

    if (updatedCards[name].takes_lead > 0) {
      // Recompute paces array just before calling pickValue so it sees the
      // latest local teamPaceMap state (which may be updated during the loop).
  const pacesForCall = Object.values(teamPaceMap).map(v => Number(v) || 0);
      const selected = pickValue(name, updatedCards, track, pacesForCall, numberOfTeams, addLog);
      updatedCards[name].selected_value = updatedCards[name].takes_lead * selected;

      // Sanity check: selected_value must equal takes_lead * selected
      try {
        const lhs = updatedCards[name].selected_value;
        const rhs = (updatedCards[name].takes_lead || 0) * (selected || 0);
        if (lhs !== rhs) addLog(`ASSERT MISMATCH ${name} lhs=${lhs} rhs=${rhs} takes_lead=${updatedCards[name].takes_lead} selected=${selected}`);
      } catch (e) {}

      // If AI intends to take lead (selected_value > 0) AND it's a planned
      // attack (takes_lead === 2), store planned_card_id as the lowest
      // card number that can produce that value. This ensures the AI plays
      // the lowest card-number when attacking.
      if (updatedCards[name].selected_value > 0 && updatedCards[name].takes_lead === 2) {
        // Determine slipstream for the selected_value and pick a planned card that
        // matches the numeric selected_value (flat or uphill depending on sv).
        const sv = getSlipstreamValue(updatedCards[name].position, updatedCards[name].position + Math.floor(updatedCards[name].selected_value), track);
        const targetNumeric = Math.round(updatedCards[name].selected_value);

        let planned = null;
        let lowestNum = 999;
        for (const c of updatedCards[name].cards.slice(0,4)) {
          const cardNum = parseInt(c.id.match(/\d+/)?.[0] || '15');
          const cardValue = sv > 2 ? c.flat : c.uphill;
          if (cardValue === targetNumeric) {
            if (cardNum < lowestNum) {
              planned = c.id;
              lowestNum = cardNum;
            }
          }
        }
        // fallback: if none exactly match, pick lowest numbered card in top-4
        if (!planned && updatedCards[name].cards.length > 0) {
          for (const c of updatedCards[name].cards.slice(0,4)) {
            const cardNum = parseInt(c.id.match(/\d+/)?.[0] || '15');
            if (cardNum < lowestNum) {
              planned = c.id;
              lowestNum = cardNum;
            }
          }
        }
        updatedCards[name].planned_card_id = planned;
      }
      
      if (updatedCards[name].selected_value > 0) {
        pace = Math.max(pace, updatedCards[name].selected_value);
        // Only include this as a team pace if the rider is not attacking
        if (updatedCards[name].attacking_status !== 'attacker') {
          const tname = updatedCards[name].team;
          teamPaceMap[tname] = Math.max(teamPaceMap[tname] || 0, Math.round(updatedCards[name].selected_value));
          
        }
      }
    } else {
      updatedCards[name].selected_value = 0;
    }
  }
  
  // Ensure pace is an integer and within sensible bounds
  pace = Math.round(pace || 0);
  if (pace > 0 && pace <= maxPaceSoFar) pace = 0;
  if (pace === 0) pace = Math.floor(Math.random() * 3) + 2;
  if (pace <= maxPaceSoFar) pace = 0;

  // Clamp to integers >= 2
  pace = Math.max(2, Math.round(pace));

  const msg = pace === 0 ? `${currentTeam}: 0` : `${currentTeam}: ${pace}`;
  // Show a short-lived AI message for UX, but avoid adding a log here because
  // the definitive submission (and its log) is created by handlePaceSubmit.
  setAiMessage(msg);

// Return data i stedet for at kalde handlePaceSubmit direkte
return { pace, updatedCards };
};

  const initializeGame = () => {
  const selectedTrack = trackName === 'random' ? getRandomTrack() : tracks[trackName];
  setTrack(selectedTrack);
  const teamList = ['Me'];
  for (let i = 1; i < numberOfTeams; i++) teamList.push(`Comp${i}`);
  
  const total = numberOfTeams * ridersPerTeam;
  const breakawayCount = total > 9 ? 2 : 1;
  const breakawayIndices = [];
  while (breakawayIndices.length < breakawayCount) {
    const idx = Math.floor(Math.random() * total);
    if (!breakawayIndices.includes(idx)) breakawayIndices.push(idx);
  }
  
  const cardsObj = {};
  ridersData.slice(0, total).forEach((rider, idx) => {
    const team = teamList[Math.floor(idx / ridersPerTeam)];
    const isBreakaway = breakawayIndices.includes(idx);
    cardsObj[rider.NAVN] = {
      position: isBreakaway ? 5 : 0,
      cards: generateCards(rider, isBreakaway),
      discarded: [],
      group: isBreakaway ? 1 : 2,
      sprint: rider.SPRINT,
      bjerg: rider.BJERG,
      flad: rider.FLAD,
      mentalitet: rider.MENTALITET || 4,
      team,
      fatigue: 0,
      penalty: 0,
      favorit: idx + 1,
      e_moves_left: 12,
      favorit_points: 1,
      win_chance: 10,
      win_chance_wo_sprint: 10,
      sprint_chance: 10,
      takes_lead: 0,
      attacking_status: 'no',
      selected_value: -1
    };
  });
  
  // BEREGN WIN CHANCES FRA START
  for (const riderName in cardsObj) {
    const rider = cardsObj[riderName];
    rider.e_moves_left = getEMoveLeft(rider, cardsObj, selectedTrack);
    rider.favorit_points = getFavoritPoints(rider);
  }
  
  const factor = 17 - 0.6 * 0; // Round 0
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
  
  // RESET ALT STATE
  setCards(cardsObj);
  setRound(0);
  setCurrentGroup(2);
  setTeamPaces({});
  setMovePhase('input');
  setGroupSpeed(0);
  setSlipstream(0);
  setLogs([]);
  setAiMessage('');
  const shuffled = [...teamList].sort(() => Math.random() - 0.5);
  setTeams(shuffled);
  setCurrentTeam(shuffled[0]);
  setGameState('playing');
  
  setLogs([`Game started! Length: ${getLength(selectedTrack)} km`]);
};
  
  
  const handlePaceSubmit = (groupNum, pace, team = null, isAttack = false) => {
    const submittingTeam = team || currentTeam;
    const paceKey = `${groupNum}-${submittingTeam}`;

    // Prevent double-submission by same team
    if (teamPaces[paceKey] !== undefined) {
      addLog(`${submittingTeam} already chose for group ${groupNum}`);
      return;
    }

    // Build a local copy including this submission so we can synchronously
    // decide whether all teams have submitted for the group.
    const newTeamPaces = { ...teamPaces, [paceKey]: parseInt(pace) };
    setTeamPaces(newTeamPaces);

    if (isAttack) {
      addLog(`${submittingTeam}: attack`);
    } else {
      addLog(`${submittingTeam} chose ${pace}`);
    }
    const nextIdx = (teams.indexOf(submittingTeam) + 1) % teams.length;
    setCurrentTeam(teams[nextIdx]);

    // Determine which teams actually have riders in this group
    const groupRidersAll = Object.entries(cards).filter(([, r]) => r.group === groupNum);
    // Only consider teams that have at least one non-attacker rider for the
    // purposes of submitting and finalizing the group's pace. Teams whose
    // only presence in the group is an attacker should not block the basic
    // group pace decision.
    const teamsWithRiders = teams.filter(t => groupRidersAll.some(([, r]) => r.team === t && r.attacking_status !== 'attacker'));

    // Collect submitted paces per team for this group, but only include
    // submissions from teams that actually have non-attacker riders in the group.
    const submittedPaces = {};
    Object.entries(newTeamPaces).forEach(([k, v]) => {
      if (!k.startsWith(`${groupNum}-`)) return;
      const t = k.split('-')[1];
      if (!teamsWithRiders.includes(t)) return; // ignore teams without non-attacker riders
      submittedPaces[t] = Math.max(submittedPaces[t] || 0, parseInt(v));
    });

  // If the player's team ('Me') has riders in this group, require that
  // the player submits before finalizing — even if all AI teams (which
  // may have no riders) have submitted. This prevents AI from auto-
  // finalizing a group that contains human riders.
  if (teamsWithRiders.includes('Me') && (submittedPaces['Me'] === undefined)) return;

  // Wait until all teams that have non-attacker riders have submitted for this group
  if (Object.keys(submittedPaces).length < teamsWithRiders.length) return;

    // If any teams submitted explicit paces for this group, use the highest
    // submitted pace to determine group movement. Non-submitting teams are
    // treated as 0. This prevents an attacker's selected_value from overriding
    // announced team paces.
    const teamPacesForGroup = {};
    if (Object.keys(submittedPaces).length > 0) {
      for (const t of teams) {
        if (!teamsWithRiders.includes(t)) {
          teamPacesForGroup[t] = 0;
          try { addLog(`${t}: Team has no rider in the group`); } catch(e) {}
          continue;
        }
        teamPacesForGroup[t] = Math.max(submittedPaces[t] || 0, 0);
      }
    } else {
      // No submitted paces -> compute per-rider values (attackers excluded)
      for (const t of teams) {
        let teamMax = 0;
        const teamRiders = groupRidersAll.filter(([, r]) => r.team === t);
        if (teamRiders.length === 0) {
          teamPacesForGroup[t] = 0;
          try { addLog(`${t}: Team has no rider in the group`); } catch (e) {}
          continue;
        }
        for (const [name, rider] of teamRiders) {
          let riderValue = 0;
          if (rider.attacking_status === 'attacker') {
            riderValue = 0;
          } else if (rider.takes_lead === 0) {
            riderValue = 0;
          } else if (rider.takes_lead === 2) {
            riderValue = typeof rider.selected_value === 'number' && rider.selected_value > 0 ? Math.round(rider.selected_value) : 0;
          } else if (rider.takes_lead === 1) {
            try {
              const val = pickValue(name, cards, track, Object.values(submittedPaces));
              riderValue = Math.round(val || 0);
            } catch (e) {
              riderValue = 0;
            }
          }
          if (riderValue > teamMax) teamMax = riderValue;
        }
        teamPacesForGroup[t] = teamMax || 0;
      }
    }

    // DEBUG: dump computed paces and contributors to help diagnose incorrect speeds
    try {
      const nonAttackerValues = Object.entries(cards)
        .filter(([, r]) => r.group === groupNum && r.attacking_status !== 'attacker')
        .map(([n, r]) => ({ name: n, team: r.team, selected_value: r.selected_value }));
      addLog(`DEBUG teamsWithRiders=${JSON.stringify(teamsWithRiders)}`);
      addLog(`DEBUG submittedPaces=${JSON.stringify(submittedPaces)}`);
      addLog(`DEBUG teamPacesForGroup=${JSON.stringify(teamPacesForGroup)}`);
      addLog(`DEBUG nonAttackerSelected=${JSON.stringify(nonAttackerValues)}`);
    } catch (e) {}

    const allPaces = Object.values(teamPacesForGroup);
    

    let speed = Math.max(...allPaces.filter(p => p > 0), 2);
    const groupPos = Math.max(...Object.values(cards).filter(r => r.group === groupNum).map(r => r.position));
    if (track[groupPos] === '_') speed = Math.max(5, speed);
  let sv = getSlipstreamValue(groupPos, groupPos + speed, track);
    setGroupSpeed(speed);
    setSlipstream(sv);

    // If any group ahead (higher group number) has already moved and is now
    // positioned such that this group's chosen speed would move into/through
    // that group, cap this group's speed so it stops right behind the ahead group.
    // Find the maximum position among riders in groups ahead (group > groupNum)
    const aheadPositions = Object.values(cards)
      .filter(r => r.group > groupNum)
      .map(r => r.position);
    if (aheadPositions.length > 0) {
      const maxAheadPos = Math.max(...aheadPositions);
      // If chosen speed would reach or pass maxAheadPos, cap it
      if (groupPos + speed <= maxAheadPos) {
        const newSpeed = Math.max(0, maxAheadPos - groupPos);
        if (newSpeed !== speed) {
          try { addLog(`Group ${groupNum} blocked by group ahead at pos ${maxAheadPos}; capping speed ${speed}→${newSpeed}`); } catch(e) {}
          speed = newSpeed;
          // Clear any take-lead intentions in this group: no one leads
          setCards(prev => {
            const updated = { ...prev };
            for (const [n, r] of Object.entries(updated)) {
              if (r.group === groupNum) {
                updated[n] = { ...r, takes_lead: 0, selected_value: 0 };
              }
            }
            return updated;
          });

          // Recompute slipstream for the new capped speed
          const newSv = getSlipstreamValue(groupPos, groupPos + speed, track);
          setGroupSpeed(speed);
          setSlipstream(newSv);
          // update local sv variable for logs later
          sv = newSv;
        }
      }
    }

    // Ensure each team has a value (default 0)
    for (const t of teams) teamPacesForGroup[t] = Math.max(teamPacesForGroup[t] || 0, 0);

    const maxPace = allPaces.length > 0 ? Math.max(...allPaces.filter(p => p > 0)) : 0;

    if (maxPace > 0) {
      const teamsWithMax = Object.entries(teamPacesForGroup).filter(([t, p]) => p === maxPace).map(([t]) => t);
      let chosenTeam = teamsWithMax[0] || null;
      for (const t of teams) { if (teamsWithMax.includes(t)) { chosenTeam = t; break; } }

      if (chosenTeam) {
        // Assign exactly one lead from chosenTeam
        setCards(prev => {
          const updated = { ...prev };
          const groupRiders = Object.entries(updated).filter(([, r]) => r.group === groupNum);

          // If already has lead, skip
          const alreadyLead = Object.values(prev).some(r => r.group === groupNum && r.takes_lead === 1);
          if (alreadyLead) {
            addLog(`Lead already present for group ${groupNum}, skipping assignment`);
            return prev;
          }

          // Clear takes_lead
          for (const [n, r] of groupRiders) updated[n] = { ...updated[n], takes_lead: 0 };

          // Prefer non-attacking with existing takes_lead > 0
          let bestName = null;
          let bestSelectedValue = -Infinity;
          const nonAttackingCandidates = groupRiders
            .filter(([n, r]) => r.team === chosenTeam && r.attacking_status !== 'attacker' && r.takes_lead > 0);

          if (nonAttackingCandidates.length > 0) {
            for (const [n, r] of nonAttackingCandidates) {
              const svVal = (typeof r.selected_value === 'number' ? r.selected_value : -Infinity);
              if (svVal > bestSelectedValue) {
                bestSelectedValue = svVal; bestName = n;
              } else if (svVal === bestSelectedValue) {
                try {
                  const currScore = takesLeadFC(n, updated, track, numberOfTeams, false);
                  try { addLog(`TRACE takesLeadFC score ${n} -> ${currScore}`); } catch(e) {}
                  const bestScore = takesLeadFC(bestName, updated, track, numberOfTeams, false);
                  try { addLog(`TRACE takesLeadFC score ${bestName} -> ${bestScore}`); } catch(e) {}
                  if (currScore > bestScore) { bestName = n; try { addLog(`TRACE takesLeadFC choose ${n} over ${bestName}`); } catch(e) {} }
                } catch (e) {}
              }
            }
          } else {
            let bestScore = -Infinity;
            for (const [n, r] of groupRiders) {
              if (r.team !== chosenTeam) continue;
              // Do not consider riders who have takes_lead <= 0 as fallback leaders
              if (typeof r.takes_lead === 'number' && r.takes_lead <= 0) continue;
              try {
                const score = takesLeadFC(n, updated, track, numberOfTeams, false);
                try { addLog(`TRACE takesLeadFC score ${n} -> ${score}`); } catch(e) {}
                if (score > bestScore) { bestScore = score; bestName = n; }
              } catch (e) {}
            }
          }

          if (bestName) {
            const leadR = updated[bestName];
            // Prefer a selected_value the rider already planned (AI pickValue), otherwise compute one
            let leaderSelectedValue = (typeof leadR.selected_value === 'number' && leadR.selected_value > 0)
              ? Math.round(leadR.selected_value)
              : Math.round(pickValue(bestName, updated, track, Object.values(teamPacesForGroup)) || speed);

            // Ensure leaderSelectedValue does not exceed group speed (keep consistency)
            if (leaderSelectedValue > speed) leaderSelectedValue = speed;

            // Insert EC card into the front of hand (as game rules)
            const newHand = [...leadR.cards];
            newHand.unshift({ id: 'kort: 16', flat: 2, uphill: 2 });

            // Compute planned_card_id relative to the new hand (post-EC insertion)
            let planned = null;
            let lowestNum = 999;
            const top4AfterEC = newHand.slice(0, Math.min(4, newHand.length));
            const svAfter = getSlipstreamValue(leadR.position, leadR.position + Math.floor(leaderSelectedValue), track);
            const targetNumeric = Math.round(leaderSelectedValue);
            for (const c of top4AfterEC) {
              const cardNum = parseInt(c.id.match(/\d+/)?.[0] || '15');
              const cardValue = svAfter > 2 ? c.flat : c.uphill;
              if (cardValue === targetNumeric) {
                if (cardNum < lowestNum) { planned = c.id; lowestNum = cardNum; }
              }
            }
            // fallback: lowest numbered card in top-4
            if (!planned && top4AfterEC.length > 0) {
              for (const c of top4AfterEC) {
                const cardNum = parseInt(c.id.match(/\d+/)?.[0] || '15');
                if (cardNum < lowestNum) { planned = c.id; lowestNum = cardNum; }
              }
            }

            updated[bestName] = { ...leadR, takes_lead: 1, selected_value: leaderSelectedValue, cards: newHand, planned_card_id: planned };
            addLog(`${bestName} (${chosenTeam}) assigned as lead for group ${groupNum} (selected_value=${leaderSelectedValue}, planned=${planned})`);
          }

          return updated;
        });
      }
    }

    setMovePhase('cardSelection');
    addLog(`Group ${groupNum}: speed=${speed}, SV=${sv}`);
  };

const handleHumanChoices = (groupNum, choice) => {
  console.log('Human choices:', choice);
  
  const updatedCards = {...cards};
  
  // Find all riders in this group on the human team
  const humanRiders = Object.entries(updatedCards)
    .filter(([, r]) => r.group === groupNum && r.team === 'Me')
    .map(([name]) => name);
  
  if (choice.type === 'attack') {
    // Attacking rider gets the card value
    const attacker = choice.attacker;
    const card = choice.card;
    const sv = getSlipstreamValue(updatedCards[attacker].position, updatedCards[attacker].position + 8, track);
    const cardValue = sv > 2 ? card.flat : card.uphill;
    
    updatedCards[attacker].selected_value = cardValue;
    updatedCards[attacker].attacking_status = 'attacker';
    // Mark attacker as planned attacker (takes_lead = 2)
    updatedCards[attacker].takes_lead = 2;
    updatedCards[attacker].attack_card = card;
    // Ensure the chosen attack card will be played during the attacker move phase
    if (card && card.id) {
      updatedCards[attacker].planned_card_id = card.id;
    }
    
    // Other riders follow
    humanRiders.forEach(name => {
      if (name !== attacker) {
        updatedCards[name].selected_value = 0;
        updatedCards[name].takes_lead = 0;
      }
    });
    
    addLog(`${choice.attacker} angriber med ${card.id} (værdi: ${cardValue})`);
    
  } else if (choice.type === 'pace') {
    // Assign the chosen rider as the leader for this pace; others follow
    const leader = choice.paceLeader;
    humanRiders.forEach(name => {
      if (name === leader) {
        updatedCards[name].selected_value = choice.value;
        updatedCards[name].takes_lead = 1;
        updatedCards[name].attacking_status = 'no';
      } else {
        updatedCards[name].selected_value = 0;
        updatedCards[name].takes_lead = 0;
        updatedCards[name].attacking_status = 'no';
      }
    });
    
    addLog(`Me: hastighed ${choice.value}`);
    
  } else if (choice.type === 'follow') {
    // All riders follow
    humanRiders.forEach(name => {
      updatedCards[name].selected_value = 0;
      updatedCards[name].takes_lead = 0;
      updatedCards[name].attacking_status = 'no';
    });
    
    addLog(`Me: følger (0)`);
  }
  
  setCards(updatedCards);
  
  // Submit the team's pace (max of all riders' values)
  // Compute the team's non-attacker pace (attackers should not determine this)
  const teamPace = Math.max(...humanRiders.filter(n => updatedCards[n].attacking_status !== 'attacker').map(name => updatedCards[name].selected_value || 0));
  const isAttack = humanRiders.some(n => updatedCards[n].attacking_status === 'attacker');
  handlePaceSubmit(groupNum, teamPace, 'Me', isAttack);
};

const confirmMove = () => {
  const names = Object.entries(cards)
    .filter(([,r]) => r.group === currentGroup)
    .map(([n]) => n);
  
  const groupsNewPositions = [];
  
  addLog(`=== Moving group ${currentGroup} ===`);
  
  // Opret en kopi af hele cards-objektet som vi opdaterer
  const updatedCards = {...cards};
  
  // First phase: move non-attackers (regular riders)
  const nonAttackers = names.filter(n => updatedCards[n].attacking_status !== 'attacker');
  for (const name of nonAttackers) {
    const rider = updatedCards[name];
    const oldPosition = rider.position;
    const chosenValue = rider.selected_value || 0;
    const penalty = getPenalty(name);

    // Determine if this rider is the lead rider (used during card selection)
    const isLeadRider = chosenValue > 0 && chosenValue === groupSpeed;

    // ===== VÆLG KORT =====
    let chosenCard = null;
    let managed = false;

    // If AI previously planned a card, prefer that (if still available in hand)
    if (rider.planned_card_id) {
      const idx = rider.cards.findIndex(c => c.id === rider.planned_card_id);
      if (idx !== -1) {
        chosenCard = rider.cards[idx];
        managed = true;
        // remove planned_card_id after use
        delete updatedCards[name].planned_card_id;
      }
    }

    if (!chosenCard) {
      if (isLeadRider) {
        const targetVal = Math.round(chosenValue);
        const top4 = rider.cards.slice(0, Math.min(4, rider.cards.length));
        const svForLead = getSlipstreamValue(rider.position, rider.position + Math.floor(targetVal), track);
        let found = null;
        for (const c of top4) {
          const cv = svForLead > 2 ? c.flat : c.uphill;
          if (cv === targetVal) { found = c; break; }
        }
        if (found) { chosenCard = found; managed = true; }
      }

      if (!chosenCard) {
        const res = chooseCardToPlay(
          rider.cards,
          slipstream,
          penalty,
          groupSpeed,
          chosenValue
        );
        chosenCard = res.chosenCard;
        managed = res.managed;
      }
    }

    if (!chosenCard) {
      addLog(`${name} (${rider.team}): No valid card found!`);
      continue;
    }

    // ===== BEREGN NY POSITION =====
    const cardValue = slipstream > 2 ? chosenCard.flat : chosenCard.uphill;
    const effectiveValue = Math.max(cardValue - penalty, 0);

    const minRequiredToFollow = Math.max(0, groupSpeed - slipstream);
    let eligibleForSlip = effectiveValue >= minRequiredToFollow;
    let moveBy = eligibleForSlip ? Math.min(effectiveValue + slipstream, groupSpeed) : effectiveValue;
    let newPos = rider.position + moveBy;

    // Tilføj downhill-bonus
    const trackSegment = track.slice(rider.position, newPos + 1);
    let nedk = (trackSegment.match(/_/g) || []).length;
    newPos += nedk;

    // Juster baseret på andre rytteres positioner
    if (groupsNewPositions.length > 0) {
      const potPosition = oldPosition + effectiveValue + slipstream + nedk;
      for (const [targetPos] of groupsNewPositions) {
        if (potPosition >= targetPos) {
          newPos = Math.max(newPos, targetPos);
        }
      }
    }

    // ===== KORTHÅNDTERING =====
    let updatedHandCards = [...rider.cards];
    let updatedDiscarded = [...rider.discarded];

    const topN = Math.min(4, updatedHandCards.length);
    const topFour = updatedHandCards.slice(0, topN);

    if (chosenCard.id === 'tk_extra 15') {
      const cardsToDiscard = updatedHandCards.splice(0, topN);
      updatedDiscarded = [...updatedDiscarded, ...cardsToDiscard];
      addLog(`${name}: tk_extra brugt - ${cardsToDiscard.length} kort til discard`);
    } else {
      const globalIndex = updatedHandCards.findIndex(c => c.id === chosenCard.id);
      if (globalIndex !== -1) updatedHandCards.splice(globalIndex, 1);

      const moved = [];
      for (const c of topFour) {
        if (c.id !== chosenCard.id) {
          const idx = updatedHandCards.findIndex(hc => hc.id === c.id);
          if (idx !== -1) {
            const [removed] = updatedHandCards.splice(idx, 1);
            updatedDiscarded.push(removed);
            moved.push(removed.id);
          }
        }
      }
      addLog(`${name}: spillede ${chosenCard.id} - ${moved.length} kort sendt til discard`);
    }

    // DOWNHILL: remove cards from discard
    let nedk2 = nedk;
    const recentDiscarded = [...updatedDiscarded].reverse();
    for (const card of recentDiscarded) {
      if (nedk2 <= 0) break;
      const cardNum = parseInt(card.id.match(/\d+/)?.[0] || '0');
      if (cardNum > 12) {
        const idx = updatedDiscarded.lastIndexOf(card);
        updatedDiscarded.splice(idx, 1);
        nedk2--;
        addLog(`${name}: kort fjernet (downhill)`);
      }
    }

    // BLAND KORT HVIS UNDER 6
    if (updatedHandCards.length < 6) {
      updatedDiscarded = updatedDiscarded.map(c => {
        if (c.id && c.id.startsWith('TK-1')) return { id: 'kort: 16', flat: 2, uphill: 2 };
        return c;
      });
      updatedHandCards.push(...updatedDiscarded);
      updatedHandCards.sort(() => Math.random() - 0.5);
      updatedDiscarded = [];
      addLog(`${name}: kort blandet`);
    }

    // ===== TILFØJ EC / TK-1 KORT =====
    // Regular riders: evaluate EC and TK-1
    let ecs = 0;
    const cardNum = parseInt(chosenCard.id.match(/\d+/)?.[0] || '15');

    if (isLeadRider) {
      ecs = 1;
      try { addLog(`${name} (${rider.team}): +1 EC (føring)`); } catch (e) {}
    }
    if (cardNum >= 3 && cardNum <= 5) {
      ecs += 1;
      try { addLog(`${name} (${rider.team}): +1 EC (kort ${cardNum})`); } catch (e) {}
    }

    const hasTK1 = (cardNum >= 1 && cardNum <= 2);
    if (hasTK1) {
      updatedHandCards.unshift({ id: 'TK-1: 99', flat: -1, uphill: -1 });
      try { addLog(`${name} (${rider.team}): +TK-1 added to top of hand`); } catch (e) {}
    }

    const exhaustionCards = [];
    for (let i = 0; i < ecs; i++) exhaustionCards.push({ id: 'kort: 16', flat: 2, uphill: 2 });
    const totalEx = exhaustionCards.length + (hasTK1 ? 1 : 0);
    if (totalEx === 1) {
      if (!hasTK1 && exhaustionCards.length === 1) updatedHandCards.unshift(exhaustionCards[0]);
    } else if (totalEx >= 2) {
      if (hasTK1) {
        updatedDiscarded = [...updatedDiscarded, ...exhaustionCards];
        try { addLog(`${name}: ${exhaustionCards.length} exhaustion card(s) moved to discard`); } catch (e) {}
      } else {
        const frontCard = exhaustionCards.shift();
        if (frontCard) updatedHandCards.unshift(frontCard);
        if (exhaustionCards.length > 0) {
          updatedDiscarded = [...updatedDiscarded, ...exhaustionCards];
          try { addLog(`${name}: ${exhaustionCards.length} exhaustion card(s) moved to discard`); } catch (e) {}
        }
      }
    }

    // BEREGN FATIGUE
    const totalCards = updatedHandCards.length + updatedDiscarded.length;
    const tk1Count = [...updatedHandCards, ...updatedDiscarded].filter(c => c.id === 'TK-1: 99').length;
    const ecCount = [...updatedHandCards, ...updatedDiscarded].filter(c => c.id === 'kort: 16').length;
    const fatigue = totalCards > 0 ? (tk1Count * 1.5 + ecCount) / totalCards : 0;

    // OPDATER RYTTEREN
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
      moved_fields: newPos - oldPosition
    };

    // LOG FLYTNING
    const managedStr = managed ? '✓' : '✗';
    const takesLeadStr = chosenValue > 0 ? ' (lead)' : '';
    const cardFlat = chosenCard.flat ?? 0;
    const cardUphill = chosenCard.uphill ?? 0;
    addLog(`Group ${currentGroup}: ${name} (${rider.team}) spiller ${chosenCard.id} (${cardFlat}-${cardUphill}) ${oldPosition}→${newPos}${takesLeadStr} ${managedStr}`);

    groupsNewPositions.push([newPos, slipstream]);
    groupsNewPositions.sort((a, b) => b[0] - a[0]);
  }

  // Second phase: move attackers separately
  const attackers = names.filter(n => updatedCards[n].attacking_status === 'attacker');
  if (attackers.length > 0) addLog(`Attackers moving separately: ${attackers.join(', ')}`);

  // Determine chosen cards and effectiveValues for attackers first
  const attackerMoves = [];
  for (const name of attackers) {
    const rider = updatedCards[name];
    const oldPosition = rider.position;
    const chosenValue = rider.selected_value || 0;
    const penalty = getPenalty(name);

    // Choose card for attacker: prefer explicit attack_card, then planned_card_id,
    // otherwise fall back to heuristic. Also avoid picking TK-1 if a normal
    // card matching the intended numeric value is available.
    let chosenCard = null;
    let managed = false;

    const targetNumeric = Math.round(chosenValue || 0);

    // 1) Prefer explicit attack_card (set when human declared attack)
    if (rider.attack_card && rider.attack_card.id) {
      const idxA = rider.cards.findIndex(c => c.id === rider.attack_card.id);
      if (idxA !== -1) {
        chosenCard = rider.cards[idxA];
        managed = true;
      }
    }

    // 2) If not found, try planned_card_id (set for AI or previously)
    if (!chosenCard && rider.planned_card_id) {
      const idx = rider.cards.findIndex(c => c.id === rider.planned_card_id);
      if (idx !== -1) { chosenCard = rider.cards[idx]; managed = true; delete updatedCards[name].planned_card_id; }
    }

    // 3) If still not found, try to find any normal top-4 card matching targetNumeric
    if (!chosenCard && typeof targetNumeric === 'number' && targetNumeric > 0) {
      const top4 = rider.cards.slice(0, Math.min(4, rider.cards.length));
      // determine sv relative to potential move
      const svForAttack = getSlipstreamValue(rider.position, rider.position + Math.floor(targetNumeric), track);
      for (const c of top4) {
        if (c.id && c.id.startsWith('TK-1')) continue; // de-prioritize TK-1
        const cardVal = svForAttack > 2 ? c.flat : c.uphill;
        if (cardVal === targetNumeric) { chosenCard = c; managed = true; break; }
      }
    }

    // 4) Fallback to chooseCardToPlay
    if (!chosenCard) {
      const res = chooseCardToPlay(rider.cards, slipstream, penalty, groupSpeed, chosenValue);
      chosenCard = res.chosenCard; managed = res.managed;
    }

    // 5) If we accidentally picked a TK-1 but there exists another normal card in top-4
    // that better matches the targetNumeric, prefer that instead.
    if (chosenCard && chosenCard.id && chosenCard.id.startsWith('TK-1')) {
      const top4 = rider.cards.slice(0, Math.min(4, rider.cards.length));
      const svCheck = getSlipstreamValue(rider.position, rider.position + Math.floor(targetNumeric), track);
      for (const c of top4) {
        if (c.id && c.id.startsWith('TK-1')) continue;
        const cardVal = svCheck > 2 ? c.flat : c.uphill;
        if (cardVal === targetNumeric) { chosenCard = c; break; }
      }
    }
    if (!chosenCard) {
      addLog(`${name} (${rider.team}) attacker: No valid card found!`);
      continue;
    }

    const cardValue = slipstream > 2 ? chosenCard.flat : chosenCard.uphill;
    const effectiveValue = Math.max(cardValue - penalty, 0);

    attackerMoves.push({ name, rider, chosenCard, managed, oldPosition, cardValue, effectiveValue });
  }

  // Find highest attacker by effectiveValue (tie: keep first)
  attackerMoves.sort((a, b) => b.effectiveValue - a.effectiveValue);
  const leaderAttack = attackerMoves[0];

  // Process each attacker in order (leader first)
  let maxAttackerPos = -Infinity;
  for (let i = 0; i < attackerMoves.length; i++) {
    const m = attackerMoves[i];
    const name = m.name;
    const rider = updatedCards[name];
    const oldPosition = m.oldPosition;
    let chosenCard = m.chosenCard;
    const managed = m.managed;

    // For attackers: they do NOT receive EC or TK-1. So we skip exhaustion logic.
    // Compute base move and downhill
    let effectiveValue = m.effectiveValue;

    // Determine finish position on track
    const finishPos = track.indexOf('F');

    // Give extra field to the leader (first in sorted list), but do NOT
    // grant the extra if the rider would already reach/pass the finish line
    // without it or if the extra would push beyond finish. In that case the
    // extra is not applied.
    let extra = (i === 0) ? 1 : 0;
    if (extra === 1 && finishPos !== -1) {
      // If reaching finish without extra, do not grant extra.
      if (rider.position + effectiveValue >= finishPos) extra = 0;
      // If extra would push beyond finish, drop extra and cap later.
      if (rider.position + effectiveValue + extra > finishPos) extra = 0;
    }

    let moveBy = effectiveValue + extra;
    let newPos = rider.position + moveBy;

    // Downhill bonus
    const trackSegment = track.slice(rider.position, newPos + 1);
    let nedk = (trackSegment.match(/_/g) || []).length;
    newPos += nedk;

  // Now check slipstream catch from previously moved attackers (maxAttackerPos)
    // If any attacker ahead ended at pos P and P - slipstream <= this rider's base reach,
    // then this rider can slip to that attacker's pos.
    if (maxAttackerPos !== -Infinity) {
      const baseReach = rider.position + effectiveValue + nedk;
      if (maxAttackerPos - slipstream <= baseReach) {
        newPos = Math.max(newPos, maxAttackerPos);
      }
    }

  // Handle card hand/discard for attackers: still consume top-4 and move others to discard.
  // Per rules: attackers receive two TK-1 cards during the attacker move: one
  // placed on top of their hand and one placed into discarded.
    let updatedHandCards = [...rider.cards];
    let updatedDiscarded = [...rider.discarded];
    const topN = Math.min(4, updatedHandCards.length);
    const topFour = updatedHandCards.slice(0, topN);
    if (chosenCard.id === 'tk_extra 15') {
      const cardsToDiscard = updatedHandCards.splice(0, topN);
      updatedDiscarded = [...updatedDiscarded, ...cardsToDiscard];
      addLog(`${name}: (attacker) tk_extra brugt - ${cardsToDiscard.length} kort til discard`);
    } else {
      const globalIndex = updatedHandCards.findIndex(c => c.id === chosenCard.id);
      if (globalIndex !== -1) updatedHandCards.splice(globalIndex, 1);
      for (const c of topFour) {
        if (c.id !== chosenCard.id) {
          const idx = updatedHandCards.findIndex(hc => hc.id === c.id);
          if (idx !== -1) {
            const [removed] = updatedHandCards.splice(idx, 1);
            updatedDiscarded.push(removed);
          }
        }
      }
      addLog(`${name} (attacker): spillede ${chosenCard.id}`);
    }

    // DOWNHILL discard removal
    let nedk2 = nedk;
    const recentDiscarded = [...updatedDiscarded].reverse();
    for (const card of recentDiscarded) {
      if (nedk2 <= 0) break;
      const cardNum = parseInt(card.id.match(/\d+/)?.[0] || '0');
      if (cardNum > 12) {
        const idx = updatedDiscarded.lastIndexOf(card);
        updatedDiscarded.splice(idx, 1);
        nedk2--;
        addLog(`${name} (attacker): kort fjernet (downhill)`);
      }
    }

    // Add TK-1 cards for attackers: one to top of hand, one to discarded
    updatedHandCards.unshift({ id: 'TK-1: 99', flat: -1, uphill: -1 });
    updatedDiscarded = [...updatedDiscarded, { id: 'TK-1: 99', flat: -1, uphill: -1 }];
    try { addLog(`${name} (attacker): +TK-1 added to top of hand and discard (attack)`); } catch (e) {}

    // Shuffle if needed (convert TK-1 before shuffle as normal rule)
    if (updatedHandCards.length < 6) {
      updatedDiscarded = updatedDiscarded.map(c => {
        if (c.id && c.id.startsWith('TK-1')) return { id: 'kort: 16', flat: 2, uphill: 2 };
        return c;
      });
      updatedHandCards.push(...updatedDiscarded);
      updatedHandCards.sort(() => Math.random() - 0.5);
      updatedDiscarded = [];
      addLog(`${name} (attacker): kort blandet`);
    }

  // Cap to finish if necessary
  if (finishPos !== -1 && newPos > finishPos) newPos = finishPos;

  // Update rider: attackers do NOT get exhaustion/TK-1 attached this move
    updatedCards[name] = {
      ...rider,
      position: newPos,
      old_position: oldPosition,
      cards: updatedHandCards,
      discarded: updatedDiscarded,
      // keep takes_lead as-is for attackers
      fatigue: rider.fatigue,
      penalty: getPenalty(name),
      played_card: chosenCard.id,
      moved_fields: newPos - oldPosition,
      // attacker remains marked as attacker until round-end
    };

    // log
    addLog(`Attacker ${name}: ${oldPosition}→${newPos} (card ${chosenCard.id}${i===0 ? ', +1 extra field' : ''})`);

    groupsNewPositions.push([newPos, slipstream]);
    groupsNewPositions.sort((a, b) => b[0] - a[0]);

    // update maxAttackerPos
    if (newPos > maxAttackerPos) maxAttackerPos = newPos;
  }
  
  // ===== OPDATER STATE ÉN GANG =====
  // Post-move adjustment: for riders who could not follow the group (moved
  // less than groupSpeed), check if there are other riders up to `slipstream`
  // fields ahead. If so, move the rider forward to that field (furthest one)
  // to simulate catching slipstream from nearby riders.
  try {
    for (const name of names) {
      const r = updatedCards[name];
      if (!r) continue;
      const moved = r.moved_fields || 0;
      // If rider managed to move the full groupSpeed or more, skip
      if (moved >= groupSpeed) continue;
      // Use the recorded moves (groupsNewPositions) which contain [pos, sv]
      // and see if any moved rider ended up within their recorded sv ahead
      // of this rider's current position. If so, move the rider forward to
      // the furthest such recorded position.
      const reachable = groupsNewPositions
        .filter(([pos, recordedSv]) => pos > r.position && pos <= r.position + recordedSv)
        .map(([pos]) => pos);
      if (reachable.length > 0) {
        const targetPos = Math.max(...reachable);
        const oldPos = r.position;
        r.position = targetPos;
        r.moved_fields = targetPos - (r.old_position || oldPos);
        try { addLog(`Post-adjust: ${name} moved forward to ${targetPos} (slipstream catch)`); } catch(e) {}
      }
    }
  } catch (e) {}

  setCards(updatedCards);
  
  addLog(`Group ${currentGroup} moved`);
  
  // ===== FORTSÆT TIL NÆSTE GRUPPE ELLER AFSLUT RUNDE =====
  if (currentGroup > 1) {
    setCurrentGroup(p => p - 1);
    setTeamPaces({});
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    setTeams(shuffled);
    setCurrentTeam(shuffled[0]);
    setMovePhase('input');
  } else {
    // Alle grupper er flyttet - reassign groups
    setTimeout(() => {
      setCards(prevCards => {
        const sorted = Object.entries(prevCards).sort((a, b) => b[1].position - a[1].position);
        let gNum = 1;
        let curPos = sorted[0][1].position;
        const updatedCards = { ...prevCards };
        
        sorted.forEach(([n, r]) => {
          if (r.position < curPos) {
            gNum++;
            curPos = r.position;
          }
          updatedCards[n] = { ...updatedCards[n], group: gNum };
        });
        
        return updatedCards;
      });
      setMovePhase('roundComplete');
      addLog('All groups moved. Groups reassigned');
    }, 100);
  }
};

  const startNewRound = () => {
  console.log('=== START NEW ROUND ===');
  console.log('Current cards:', cards);
  
  const maxGroup = Math.max(...Object.values(cards).map(r => r.group));
  const newRound = round + 1;
  
  console.log('Max group:', maxGroup);
  console.log('New round:', newRound);
  
  setRound(newRound);
  setCurrentGroup(maxGroup);
  setTeamPaces({});
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  setTeams(shuffled);
  setCurrentTeam(shuffled[0]);
  setMovePhase('input');
  
  console.log('Shuffled teams:', shuffled);
  console.log('Current team set to:', shuffled[0]);
  
  // Update all rider statistics for new round
  const updatedCards = {...cards};

  // Clear transient per-round fields so previous attackers or planned values
  // do not carry over into the new round.
  for (const n of Object.keys(updatedCards)) {
    updatedCards[n] = {
      ...updatedCards[n],
      attacking_status: 'no',
      takes_lead: 0,
      selected_value: 0,
      planned_card_id: undefined,
    };
  }

  // ===== FIND LEAD RIDER =====
// Find alle ryttere i gruppen med selected_value = groupSpeed
// Build list of rider names in the leading group
const names = Object.entries(updatedCards).filter(([, r]) => r.group === maxGroup).map(([n]) => n);
const potentialLeaders = names.filter(name => 
  updatedCards[name].selected_value === groupSpeed
);

console.log('Group speed:', groupSpeed);
console.log('Potential leaders:', potentialLeaders.map(n => ({
  name: n, 
  team: updatedCards[n].team,
  selected_value: updatedCards[n].selected_value,
  takes_lead: updatedCards[n].takes_lead
})));

let leadRiderName = null;
if (potentialLeaders.length > 0) {
  // Vælg den med højeste takes_lead
  leadRiderName = potentialLeaders.reduce((best, name) => {
    if (!best) return name;
    return updatedCards[name].takes_lead >= updatedCards[best].takes_lead ? name : best;
  }, null);
  
  // Sæt alle andre potential leaders til selected_value = 0
  potentialLeaders.forEach(name => {
    if (name !== leadRiderName) {
      updatedCards[name].selected_value = 0;
    }
  });
  
  addLog(`${leadRiderName} (${updatedCards[leadRiderName].team}) tager føring`);
}
// ===== SLUT FIND LEAD RIDER =====
  
  // Calculate fatigue, e_moves_left, and favorit_points for each rider
  for (const riderName in updatedCards) {
    const rider = updatedCards[riderName];
    
    rider.fatigue = getFatigue(rider);
    rider.e_moves_left = getEMoveLeft(rider, updatedCards, track);
    rider.favorit_points = getFavoritPoints(rider);
    
    console.log(`${riderName}: fatigue=${rider.fatigue.toFixed(3)}, e_moves_left=${rider.e_moves_left.toFixed(2)}, favorit_points=${rider.favorit_points.toFixed(4)}`);
  }
  
  // Calculate factor and total points
  const factor = 17 - 0.6 * newRound;
  const totalPoints = getTotalMovesLeft(updatedCards, factor);
  
  console.log('Factor:', factor);
  console.log('Total points:', totalPoints);
  
  // Calculate sprint weight
  const maxPosition = Math.max(...Object.values(updatedCards).map(r => r.position));
  const sprintWeight = 0.8 * Math.pow(getWeightedValue(track.slice(maxPosition)) - 1, 2);
  
  console.log('Max position:', maxPosition);
  console.log('Sprint weight:', sprintWeight);
  
  // Calculate sprint chances
  const trackLength = track.indexOf('F');
  const minFieldsLeft = Math.min(...Object.values(updatedCards).map(r => trackLength - r.position));
  
  console.log('Track length:', trackLength);
  console.log('Min fields left:', minFieldsLeft);
  
  let sprint2Sum = 0;
  const sprint2Values = {};
  
  for (const riderName in updatedCards) {
    const rider = updatedCards[riderName];
    const fieldsLeft = trackLength - rider.position;
    const sprint2 = Math.pow((rider.sprint + 3) * Math.pow(minFieldsLeft / fieldsLeft, 2.5), 2);
    sprint2Values[riderName] = sprint2;
    sprint2Sum += sprint2;
  }
  
  console.log('Sprint2 sum:', sprint2Sum);
  
  // Update sprint_chance, win_chance_wo_sprint, and win_chance for each rider
  for (const riderName in updatedCards) {
    const rider = updatedCards[riderName];
    
    rider.sprint_chance = sprint2Sum > 0 ? (sprint2Values[riderName] / sprint2Sum) * 100 : 100 / Object.keys(updatedCards).length;
    rider.win_chance_wo_sprint = getWinChanceWoSprint(rider, totalPoints, factor);
    rider.win_chance = getWinChance(rider, totalPoints, factor, sprintWeight);
    
    console.log(`${riderName}: sprint_chance=${rider.sprint_chance.toFixed(1)}%, win_chance_wo_sprint=${rider.win_chance_wo_sprint.toFixed(1)}%, win_chance=${rider.win_chance.toFixed(1)}%`);
  }
  
  setCards(updatedCards);
  
  addLog(`Round ${newRound} - Statistics updated`);
  console.log('=== END NEW ROUND ===');
};

const HumanTurnInterface = ({ groupNum, riders, onSubmit }) => {
  const [teamChoice, setTeamChoice] = useState(null); // 'attack', 'pace', 'follow'
  const [paceValue, setPaceValue] = useState(null); // 2-8
  const [attackingRider, setAttackingRider] = useState(null); // rider name
  const [attackCard, setAttackCard] = useState(null); // card object
  const [paceLeader, setPaceLeader] = useState(null); // chosen leader when pacing

  const handleTeamChoice = (type, value = null) => {
    setTeamChoice(type);
    setPaceValue(value);
    setAttackingRider(null);
    setAttackCard(null);
    setPaceLeader(null);
  };

  const canSubmit = () => {
    if (!teamChoice) return false;
    if (teamChoice === 'attack') {
      return attackingRider !== null && attackCard !== null;
    }
    if (teamChoice === 'pace') {
      return paceLeader !== null;
    }
    return true;
  };

  const handleSubmit = () => {
    const result = {
      type: teamChoice,
      value: paceValue,
      attacker: attackingRider,
      card: attackCard,
      paceLeader
    };
    onSubmit(result);
  };

  return (
    <div className="bg-blue-50 p-3 rounded border-2 border-blue-500">
      <h4 className="font-bold mb-3">Your Team's Turn</h4>
      
      {/* Team choice buttons */}
      <div className="mb-4 p-3 bg-white rounded border">
        <p className="text-sm font-semibold mb-2">Choose team action:</p>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => handleTeamChoice('attack')}
            className={`px-3 py-2 text-sm rounded ${
              teamChoice === 'attack'
                ? 'bg-red-600 text-white font-bold'
                : 'bg-red-200 hover:bg-red-300'
            }`}
          >
            Angreb
          </button>
          
          {[2,3,4,5,6,7,8].map(pace => (
            <button
              key={pace}
              onClick={() => handleTeamChoice('pace', pace)}
              className={`px-3 py-2 text-sm rounded ${
                teamChoice === 'pace' && paceValue === pace
                  ? 'bg-green-600 text-white font-bold'
                  : 'bg-green-200 hover:bg-green-300'
              }`}
            >
              {pace}
            </button>
          ))}
          
          <button
            onClick={() => handleTeamChoice('follow', 0)}
            className={`px-3 py-2 text-sm rounded ${
              teamChoice === 'follow'
                ? 'bg-gray-600 text-white font-bold'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
          >
            0 (Følg)
          </button>
        </div>
      </div>

      {/* Attack selection */}
      {teamChoice === 'attack' && (
        <div className="mb-4 p-3 bg-red-50 rounded border border-red-300">
          <p className="text-sm font-semibold mb-2">Vælg rytter der angriber:</p>
          <div className="space-y-2 mb-3">
            {riders.map(([name, rider]) => (
              <button
                key={name}
                onClick={() => setAttackingRider(name)}
                className={`w-full px-3 py-2 text-sm rounded text-left ${
                  attackingRider === name
                    ? 'bg-red-600 text-white font-bold'
                    : 'bg-white hover:bg-red-100 border'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {attackingRider && (
            <div className="mt-3 p-2 bg-white rounded border">
              <p className="text-sm font-semibold mb-2">Vælg kort for {attackingRider}:</p>
              <div className="grid grid-cols-4 gap-2">
                {riders.find(([n]) => n === attackingRider)[1].cards.slice(0, 4).map((card, i) => (
                  <button
                    key={i}
                    onClick={() => setAttackCard(card)}
                    className={`p-2 rounded text-xs ${
                      attackCard === card
                        ? 'bg-red-600 text-white font-bold'
                        : 'bg-gray-100 hover:bg-red-100 border'
                    }`}
                  >
                    <div className="font-bold">{card.id}</div>
                    <div className="text-xs">{card.flat}|{card.uphill}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pace leader selection */}
      {teamChoice === 'pace' && (
        <div className="mb-4 p-3 bg-green-50 rounded border border-green-300">
          <p className="text-sm font-semibold mb-2">Vælg rytter der tager føring (pace):</p>
          <div className="space-y-2">
            {riders.map(([name]) => (
              <button
                key={name}
                onClick={() => setPaceLeader(name)}
                className={`w-full px-3 py-2 text-sm rounded text-left ${
                  paceLeader === name
                    ? 'bg-green-600 text-white font-bold'
                    : 'bg-white hover:bg-green-100 border'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Display all riders with their cards */}
      <div className="mb-4">
        <p className="text-sm font-semibold mb-2">Dine ryttere:</p>
        {riders.map(([name, rider]) => (
          <div key={name} className="mb-2 p-2 bg-white rounded border text-sm">
            <div className="font-semibold mb-1">{name}</div>
            <div className="grid grid-cols-4 gap-1">
              {rider.cards.slice(0, 4).map((card, i) => (
                <div key={i} className="bg-gray-100 p-1 rounded text-center text-xs">
                  {card.flat}|{card.uphill}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit()}
        className={`w-full py-2 rounded font-bold ${
          canSubmit()
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        Submit
      </button>
    </div>
  );
};

  const GroupDisplay = ({ groupNum }) => {
    const gr = Object.entries(cards).filter(([,r]) => r.group === groupNum);
    if (gr.length === 0) return null;
    const gp = Math.max(...gr.map(([,r]) => r.position));
    const mr = gr.filter(([,r]) => r.team === 'Me');
    
    return (
      <div className={`mb-4 p-4 bg-white rounded-lg shadow border-2 ${currentGroup === groupNum ? 'border-blue-500' : 'border-gray-200'}`}>
        <div className="flex justify-between mb-2">
          <h3 className="text-lg font-bold">Group {groupNum}</h3>
          <div className="text-sm">Pos: {gp}</div>
        </div>
        <div className="text-sm mb-2 p-2 bg-gray-100 rounded font-mono overflow-x-auto">
          {colourTrack(track.slice(gp, gp + 20))}
        </div>
        
        <div className="mb-3 space-y-2">
          {gr.map(([name, rider]) => (
            <div key={name}>
              <button
                onClick={() => {
                  addLog(`Clicked ${name}`);
                  setExpandedRider(expandedRider === name ? null : name);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-bold"
              >
                {name} ({rider.team}) {rider.win_chance > 0 && `${Math.round(rider.win_chance)}%`}
              </button>
            </div>
          ))}
        </div>
        
        {movePhase === 'input' && currentGroup === groupNum && (
          <div className="border-t pt-2">
            {aiMessage && <div className="mb-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm font-semibold">{aiMessage}</div>}
            {currentTeam === 'Me' && mr.length > 0 ? (
  <HumanTurnInterface 
    groupNum={groupNum}
    riders={mr}
    onSubmit={(choices) => handleHumanChoices(groupNum, choices)}
  />
	) : (
              <div className="bg-gray-50 p-2 rounded flex justify-between">
                <span className="text-sm">{currentTeam}'s turn</span>
                <button onClick={() => {
    const result = autoPlayTeam(groupNum);
    if (result) {
      setCards(result.updatedCards);
      const teamAtCall = currentTeam;
                // Submit the team's pace immediately so other AIs see it right away.
                            // Compute the team's non-attacker pace from the updatedCards and
                            // set isAttack if the team declared an attacker. This mirrors
                            // the human flow where attackers don't determine the basic team pace.
                            const teamRiders = Object.entries(result.updatedCards).filter(([, r]) => r.group === groupNum && r.team === teamAtCall).map(([n, r]) => ({ name: n, ...r }));
                            const nonAttackerPaces = teamRiders.filter(r => r.attacking_status !== 'attacker').map(r => Math.round(r.selected_value || 0));
                            const aiTeamPace = nonAttackerPaces.length > 0 ? Math.max(...nonAttackerPaces) : 0;
                            const aiIsAttack = teamRiders.some(r => r.attacking_status === 'attacker');
                            handlePaceSubmit(groupNum, aiTeamPace, teamAtCall, aiIsAttack);
                // Clear the AI message after a short delay for UX
                setTimeout(() => { setAiMessage(''); }, 1500);
    }
  }} 
  className="px-2 py-1 bg-gray-600 text-white rounded text-xs"
>
  AI Play
</button></div>
            )}
          </div>
        )}
        {movePhase === 'cardSelection' && currentGroup === groupNum && (
          <div className="border-t pt-2 bg-green-50 p-2 rounded">
            <div className="mb-2">Speed: {groupSpeed}, SV: {slipstream}</div>
            <button onClick={confirmMove} className="w-full bg-green-600 text-white py-2 rounded flex items-center justify-center gap-2">
              <ArrowRight size={14}/>Move Group
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">Cycling Race Game v9</h1>
        
        {gameState === 'setup' && (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4">Setup</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Track</label>
                <select value={trackName} onChange={(e) => setTrackName(e.target.value)} className="w-full px-2 py-1 border rounded">
                  {Object.keys(tracks).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teams (2-5)</label>
                <input type="number" min="2" max="5" value={numberOfTeams} onChange={(e) => setNumberOfTeams(parseInt(e.target.value))} className="w-full px-2 py-1 border rounded"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Riders/Team (1-3)</label>
                <input type="number" min="1" max="3" value={ridersPerTeam} onChange={(e) => setRidersPerTeam(parseInt(e.target.value))} className="w-full px-2 py-1 border rounded"/>
              </div>
              <button onClick={initializeGame} className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2">
                <Play size={18}/>Start Game
              </button>
            </div>
          </div>
        )}
        
        {gameState === 'playing' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-3">
                <h2 className="text-lg font-bold mb-2"><Trophy size={18} className="inline"/>Status</h2>
                <div className="space-y-1 text-sm">
                  <p><strong>Round:</strong> {round}</p>
                  <p><strong>Group:</strong> {currentGroup}</p>
                  <p><strong>Team:</strong> {currentTeam}</p>
                </div>
                {movePhase === 'roundComplete' && (
                  <button onClick={startNewRound} className="w-full mt-3 bg-green-600 text-white py-2 rounded flex items-center justify-center gap-2">
                    <SkipForward size={14}/>Round {round + 1}
                  </button>
                )}
                <button onClick={() => setGameState('setup')} className="w-full mt-3 bg-gray-600 text-white py-1 rounded text-sm">
                  Back to Setup
                </button>
              </div>
              <div className="bg-white rounded-lg shadow p-3 mt-3 max-h-96 overflow-y-auto">
                <h3 className="font-bold mb-2"><FileText size={16} className="inline"/>Log</h3>
                <div className="text-xs space-y-1">
                  {logs.slice(-50).reverse().map((l,i) => <div key={i} className="border-b pb-1">{l}</div>)}
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow p-3 mb-3">
                <h2 className="text-lg font-bold mb-2">{trackName}</h2>
                <div className="text-sm overflow-x-auto p-2 bg-gray-50 rounded font-mono">{colourTrack(track)}</div>
                <div className="mt-1 text-xs text-gray-600">Length: {getLength(track)} km</div>
              </div>
              
              {Array.from(new Set(Object.values(cards).map(r => r.group))).sort((a,b) => a - b).map(g => <GroupDisplay key={g} groupNum={g}/>)}
              
              <div className="bg-gray-900 text-green-400 rounded-lg shadow p-4 mt-6 font-mono text-xs max-h-96 overflow-y-auto">
                <h3 className="text-lg font-bold mb-3 text-white">🐛 DEBUG: All Rider Dictionaries</h3>
                <div className="space-y-4">
                  {Object.entries(cards).map(([name, rider]) => (
                    <div key={name} className="border border-green-600 rounded p-3 bg-gray-800">
                      <h4 className="text-yellow-400 font-bold mb-2">{name}</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {Object.entries(rider).filter(([k]) => k !== 'cards' && k !== 'discarded').map(([key, value]) => (
                          <div key={key} className="flex">
                            <span className="text-blue-400 w-32">{key}:</span>
                            <span className="text-green-300">
                              {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(3)) : String(value)}
                            </span>
                          </div>
                        ))}
                        <div className="flex col-span-2">
                          <span className="text-blue-400 w-32">cards:</span>
                          <span className="text-green-300">{rider.cards.length} cards</span>
                        </div>
                        <div className="col-span-2 ml-32 text-green-300 text-xs">
                          {rider.cards.map((c, i) => (
                            <div key={i}>{i+1}. {c.id} - F:{c.flat} U:{c.uphill}</div>
                          ))}
                        </div>
                        <div className="flex col-span-2">
                          <span className="text-blue-400 w-32">discarded:</span>
                          <span className="text-green-300">{rider.discarded.length} cards</span>
                        </div>
                        <div className="col-span-2 ml-32 text-green-300 text-xs">
                          {rider.discarded.map((c, i) => (
                            <div key={i}>{i+1}. {c.id} - F:{c.flat} U:{c.uphill}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CyclingGame;
