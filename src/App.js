import React, { useState, useRef, useEffect } from 'react';
import { Play, SkipForward, FileText, Trophy, ArrowRight } from 'lucide-react';
import {
  convertToSeconds,
  getSlipstreamValue,
  getLength,
  getWeightedValue,
  getEMoveLeft,
  getFavoritPoints,
  getTotalMovesLeft,
  getWinChanceWoSprint,
  getWinChance,
  getPenalty,
  getFatigue,
  detectSprintGroups,
  getRandomTrack,
  generateCards,
  pickValue,
  takesLeadFC,
  colourTrackTokens,
  computeInitialStats,
  computeNonAttackerMoves,
  runSprintsPure,
  computeAttackerMoves
} from './game/gameLogic';
import { enforceBrosten } from './game/engine';
import EngineUI from './EngineUI';
 
import ridersFromCsv from './data/ridersCsv';

// Use riders loaded from external CSV data. The CSV loader maps fields such
// as NAVN, FLAD, BJERG, SPRINT, MENTALITET and FLAD1..FLAD15, BJERG1..BJERG15.
const ridersData = ridersFromCsv;
const tracks = {
  'Liege-Bastogne-Liege': '3311111___333333333111333333333300000_3333333333333311133333333333333FFFFFFFFF',
  'World Championship 2019 (Yorkshire)': '33333333333311333333333333331133333333333333113333333333333311333333FFFFFFFFF',
  'Yorkshire': '33333333333311333333333333331133333333333333113333333333333311333333FFFFFFFFF',
  'bjerg-flad': '11111111111111111___33333333333333333333333333333333333333333FFFFFFFFFFFFF',
  'Bemer Cyclassics': '3333333333333333333333333333333313333311333333311333333333333333333FFFFFFFFFFFFF',
  'Hautacam': '331111111111111111_______333331111111111111000000111111111111FFFFFFFFF',
  'Giro DellEmilia': '1___1111111_11___1111111_11___1111111_11___1111111_11___1111111FFFFFFFFFF',
  'sprinttest': '111111FFFFFFFFFF',
  'GP Industria': '3333333333333111111__333333333333333333333333111111__33333333333FFFFFFFFFFFFF',
  'Kassel-Winterberg': '333333333333333333333333333333331111111133333333333333__1111111333FFFFFFFFFFFFF',
  'Askersund-Ludvika': '3333333333333333333333333333333333333333333333333333331111__33333FFFFFFFFFFFFFFF',
  'UAE Tour': '33333333332222222221111111111111111111111111111111111111FFFFFFFFFF',
  'Kiddesvej': '33333333333333311333333333330033333333333003333333333333300FFFFFFFFFFFFF',
  'Allerød-Køge': '3333333333333333333333333333333333333333333333333333333333333FFFFFFFFFF',
  'Amstel Gold Race': '33333333333113333113311330000333333333333003333311133333322333333FFFFFFFFFF',
  'Amstel': '33333333333113333113311330000333333333333003333311133333322333333FFFFFFFFFF',
  'Parma-Genova': '33222222222___3333333333111111111__333333333333333333333333FFFFFFFFFFFF',
  'FlandernRundt': '3333330033333311332233333333333330033333333331113333330033333333333FFFFFFFFFFFFFFB',
  'BrostensTest': '3333330033333311332233333333333330033333333331113333330033333333333FFFFFFFFFFFFFF*',
  'Paris-Roubaix': '2333223331113330003333323333333333333232333311003233333233333333FFFFFFFFFF*',
  'random': 'random'
};

// ========== MAIN COMPONENT ==========
const CyclingGame = () => {
  const [gameState, setGameState] = useState('setup');
  const [draftPool, setDraftPool] = useState([]);
  const [draftRemaining, setDraftRemaining] = useState([]);
  const [draftSelections, setDraftSelections] = useState([]); // {team, rider}
  const [draftTeamsOrder, setDraftTeamsOrder] = useState([]);
  const [draftPickSequence, setDraftPickSequence] = useState(null); // explicit full sequence of picks (team names) when set
  const [draftCurrentPickIdx, setDraftCurrentPickIdx] = useState(0);
  const [draftRoundNum, setDraftRoundNum] = useState(1);
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftTotalPicks, setDraftTotalPicks] = useState(null);
const [draftDebugMsg, setDraftDebugMsg] = useState(null);
  const [trackName, setTrackName] = useState(() => {
    // Pick a random named track as the initial selection (exclude the 'random' sentinel)
    try {
      const names = Object.keys(tracks).filter(k => k !== 'random');
      if (names.length === 0) return 'Yorkshire';
      return names[Math.floor(Math.random() * names.length)];
    } catch (e) {
      return 'Yorkshire';
    }
  });
  const [track, setTrack] = useState('');
  const [numberOfTeams, setNumberOfTeams] = useState(3);
  const [ridersPerTeam, setRidersPerTeam] = useState(3);
  const [level, setLevel] = useState(50); // user-requested level slider 1-100 default 50
  const [cards, setCards] = useState({});
  const [round, setRound] = useState(0);
  const [currentGroup, setCurrentGroup] = useState(0);
  const [teams, setTeams] = useState([]);
  const [teamBaseOrder, setTeamBaseOrder] = useState([]); // fixed base order assigned at game start
  const [currentTeam, setCurrentTeam] = useState('Me');
  const [teamColors, setTeamColors] = useState({});
  const [teamTextColors, setTeamTextColors] = useState({});
  const topTilesRef = useRef(null);
  // Abbreviate a full name for footer: initials of given names + last name, e.g. "L.P.Nordhaug"
  const abbrevFirstName = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return fullName || '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const last = parts[parts.length - 1];
    const initials = parts.slice(0, -1).map(p => (p && p[0] ? p[0].toUpperCase() : '')).filter(Boolean).join('.');
    return `${initials}.${last}`;
  };

  // Compute the longest climb/hill stretch in the track string.
  // Ported behavior: start longest at 1, accumulate current hill length by
  // +1 for tokens '0' or '1', +0.5 for '2', and reset current to 0 on '3' or '_'.
  // Return the maximum encountered (minimum 1).
  const getLongestHill = (trackStr) => {
    if (!trackStr || typeof trackStr !== 'string') return 1;
    let longest = 1;
    let cur = 0;
    for (let i = 0; i < trackStr.length; i++) {
      const ch = trackStr[i];
      if (ch === '0' || ch === '1') {
        cur += 1;
      } else if (ch === '2') {
        cur += 0.5;
      } else if (ch === '3' || ch === '_') {
        cur = 0;
      }
      if (cur > longest) longest = cur;
    }
    return Math.max(1, longest);
  };
  // Compute approximate kilometers left from the current furthest-forward
  // (maximum) rider position until the finish by scanning the resolved
  // track tokens. This implementation follows the Python `get_length` you
  // provided: apply the converter mapping first, copy previous numeric
  // values into '^'/'*' tokens, sum the digits (with a small subtraction
  // for the last 13 tokens), divide by 6 and return the integer part.
  const computeKmLeft = (trackStr, cardsObj) => {
    try {
      if (!trackStr || typeof trackStr !== 'string') return 0;
      // find the furthest-forward (max) position among riders who are not finished
      let maxPos = 0;
      Object.values(cardsObj).forEach(r => {
        if (r && !r.finished && typeof r.position === 'number') {
          if (r.position > maxPos) maxPos = r.position;
        }
      });

      const finishIdx = trackStr.indexOf('F');
      if (finishIdx === -1) return 0;
      const startIdx = Math.min(maxPos, finishIdx);
      // slice from the furthest-forward rider to the finish (inclusive of 'F')
      let tr = trackStr.slice(startIdx, finishIdx + 1);

      // Apply the converter mapping exactly as in your Python snippet.
      tr = tr.replace(/3/g, '6').replace(/_/g, '9').replace(/2/g, '4').replace(/1/g, '3').replace(/0/g, '2');

      // Convert to array for in-place edits and copy last numeric into '^'/'*'
      const arr = tr.split('');
      let last = null;
      for (let i = arr.length - 1; i >= 0; i--) {
        const ch = arr[i];
        // treat any digit or 'F' as a numeric anchor to copy
        if ((/^[0-9]$/.test(ch)) || ch === 'F') {
          last = ch;
        }
        if (ch === '^' || ch === '*') {
          arr[i] = last || '0';
        }
      }

      // Take everything up to (but not including) 'F'
      const fIdx = arr.indexOf('F');
      const seq = fIdx !== -1 ? arr.slice(0, fIdx) : arr.slice();

      // Sum numeric values
      let sum = 0;
      for (const ch of seq) {
        if (ch === 'F') break;
        sum += parseInt(ch, 10) || 0;
      }

      // Subtract 0.23 * value for the last up-to-13 tokens
      const tail = seq.slice(-13);
      for (const ch of tail) {
        const n = parseInt(ch, 10) || 0;
        sum = sum - n * 0.23;
      }

      const km = Math.floor(sum / 6);
      return km >= 0 ? km : 0;
    } catch (e) { return 0; }
  };

  // Compute modified BJERG and label for display given a rider and the current track.
  // Returns { modifiedBJERG, label, puncheur_factor }
  const computeModifiedBJERG = (riderObj, trackStr) => {
    try {
      // Accept either the tokenized track string or (when unavailable)
      // fall back to the selected trackName key mapped in `tracks`.
      // This handles the draft preview case where `track` state may be
      // empty but `trackName` (e.g. "BrostensTest") is selected.
      const selectedTrackStr = (typeof trackStr === 'string' && trackStr.trim().length > 0)
        ? trackStr
        : (tracks[trackName] || '');
      const longest = getLongestHill(selectedTrackStr);
      const isBrosten = typeof selectedTrackStr === 'string' && /[B\*]$/.test(selectedTrackStr);
      // puncheur multiplier per-track (not multiplied by rider.PUNCHEUR)
  const puncheur_factor = Math.min(1, 3 / Math.max(longest, 3));
      const puncheurField = Number(riderObj.PUNCHEUR) || 0;
      const puncheur_param = 1; // global control placeholder
      const rpf = Math.trunc(puncheurField * puncheur_factor * puncheur_param);

      // build l[] per same logic used for card generation
      let l = [];
      if (rpf !== 0) {
        const absr = Math.abs(rpf);
        const step = 16 / (absr + 1);
        for (let k = 1; k <= 15; k++) {
          if ((k % step) < 1) l.push(Math.trunc(rpf / absr)); else l.push(0);
        }
      } else {
        l = Array(15).fill(0);
      }

      let sumL = 0;
      for (let k = 0; k < 15; k++) sumL += l[k] || 0;
      const brostenField = Number(riderObj.BROSTEN) || 0;
      // If track ends with '*' we show Brosten = FLAD + BROSTEN
      let modifiedBJERG;
      if (typeof selectedTrackStr === 'string' && /\*$/.test(selectedTrackStr)) {
        modifiedBJERG = Math.round((Number(riderObj.FLAD) || 0) + brostenField);
      } else {
        // otherwise include puncheur sum and plain BROSTEN (for 'B' behaviour)
        const sumTotal = sumL + (isBrosten ? brostenField : 0);
        modifiedBJERG = Math.round((Number(riderObj.BJERG) || 0) + sumTotal);
      }

      let label = 'BJERG';
  if (typeof selectedTrackStr === 'string' && /B$/.test(selectedTrackStr)) label = 'Brostensbakke';
  else if (typeof selectedTrackStr === 'string' && /\*$/.test(selectedTrackStr)) label = 'Brosten';
      else if (puncheur_factor > 0.3) label = 'BAKKE';

      return { modifiedBJERG, label, puncheur_factor };
    } catch (e) { return { modifiedBJERG: Number(riderObj.BJERG) || 0, label: 'BJERG', puncheur_factor: 0 }; }
  };
  // Touch helpers to avoid accidental taps while scrolling the draft pool on mobile
  const touchInfoRef = useRef({});
  const lastTouchHandledRef = useRef({});
  const [teamPaces, setTeamPaces] = useState({});
  // Meta information about team submissions for a given group: key -> { isAttack, attacker }
  const [teamPaceMeta, setTeamPaceMeta] = useState({});
  // Per-group submission round tracker: 1 (initial) or 2 (choice-2)
  const [teamPaceRound, setTeamPaceRound] = useState({});
  // When the user selects the sentinel 'random' track we pick one random
  // concrete track and keep it for the preview and the actual game start so
  // the preview matches the runtime track. This stores that single choice.
  const [chosenRandomTrack, setChosenRandomTrack] = useState(null);
  const [movePhase, setMovePhase] = useState('input');
  const [groupSpeed, setGroupSpeed] = useState(0);
  const [slipstream, setSlipstream] = useState(0);
  
  const [logs, setLogs] = useState([]);
  const [groupsMovedThisRound, setGroupsMovedThisRound] = useState([]);
  const [aiMessage, setAiMessage] = useState('');
  const [expandedRider, setExpandedRider] = useState(null);
  const [groupTimeGaps, setGroupTimeGaps] = useState({});
  const [latestPrelTime, setLatestPrelTime] = useState(0);
  const [sprintResults, setSprintResults] = useState([]);
  const [sprintGroupsPending, setSprintGroupsPending] = useState([]);
  const [sprintAnimMsgs, setSprintAnimMsgs] = useState([]);
  const [showDebugMobile, setShowDebugMobile] = useState(false);
  const [showEngineUI, setShowEngineUI] = useState(false);
  const [footerCollapsed, setFooterCollapsed] = useState(false);
  const [postMoveInfo, setPostMoveInfo] = useState(null);
  const [diceMsg, setDiceMsg] = useState(null);
  const [diceEvent, setDiceEvent] = useState(null); // { who, kind, oldPos, newPos }

  const addLog = (msg) => {
    setLogs(p => {
      const newEntry = `[R${round}] ${msg}`;
      if (p.length > 0 && p[p.length - 1] === newEntry) return p; // avoid consecutive duplicates
      return [...p, newEntry];
    });
  };

  // Resolve the effective selected track token string. When trackName is
  // 'random' this returns the single chosenRandomTrack (picking one if
  // necessary). For named tracks it returns the mapping from `tracks`.
  const getResolvedTrack = (overrideTrackName) => {
    const tn = typeof overrideTrackName === 'string' ? overrideTrackName : trackName;
    if (tn === 'random') {
      if (chosenRandomTrack) return chosenRandomTrack;
      // Lazily pick and persist a random track so previews and game start
      // remain consistent even if the user opens/closes the draft.
      const r = getRandomTrack();
      setChosenRandomTrack(r);
      return r;
    }
    return tracks[tn] || '';
  };

  // If the user selects a named track (not 'random'), clear any previously
  // chosen random track so re-selecting 'random' later picks a fresh one.
  useEffect(() => {
    if (trackName !== 'random' && chosenRandomTrack) setChosenRandomTrack(null);
  }, [trackName]);

  // Colour helpers: generate random team background colour (HSL) and pick
  // readable text colour (black/white) with a contrast check. If neither
  // black nor white passes the contrast threshold, regenerate a new bg.
  const hslToRgb = (h, s, l) => {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
  };

  const rgbToLuminance = (r, g, b) => {
    const srgb = [r, g, b].map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  };

  const contrastRatio = (lum1, lum2) => {
    const L1 = Math.max(lum1, lum2);
    const L2 = Math.min(lum1, lum2);
    return (L1 + 0.05) / (L2 + 0.05);
  };

  const makeReadableBgText = (attempt = 0) => {
    // pick random hue, moderate saturation/lightness for pleasant team colours
    const hue = Math.floor(Math.random() * 360);
    const sat = 60 + Math.floor(Math.random() * 20); // 60-80
    const light = 45 + Math.floor(Math.random() * 20); // 45-65
    const [r, g, b] = hslToRgb(hue, sat, light);
    const lumBg = rgbToLuminance(r, g, b);
    const lumWhite = rgbToLuminance(255, 255, 255);
    const lumBlack = rgbToLuminance(0, 0, 0);
    const contrastWithWhite = contrastRatio(lumBg, lumWhite);
    const contrastWithBlack = contrastRatio(lumBg, lumBlack);
    // WCAG AA for normal text is 4.5:1. If neither meets threshold, try again.
    if (contrastWithWhite < 4.5 && contrastWithBlack < 4.5 && attempt < 8) return makeReadableBgText(attempt + 1);
    const textColor = contrastWithWhite >= contrastWithBlack ? '#ffffff' : '#000000';
    const bg = `rgb(${r}, ${g}, ${b})`;
    return { bg, textColor };
  };

  const generateTeamColors = (teamList) => {
    const colors = {};
    const textCols = {};
    const usedHues = new Set();
    for (const t of teamList) {
      // try a few times to avoid hue collisions
      let entry = makeReadableBgText();
      colors[t] = entry.bg;
      textCols[t] = entry.textColor;
    }
    return { colors, textCols };
  };

  // Auto-scroll top tiles so the left-most visible field corresponds to the
  // group that is furthest back (smallest position). Re-run when cards or
  // track change.
  useEffect(() => {
    if (!topTilesRef || !topTilesRef.current) return;
    try {
      const posMap = {};
      Object.values(cards).filter(r => !r.finished).forEach(r => {
        const g = r.group;
        posMap[g] = Math.max(posMap[g] || 0, Number(r.position) || 0);
      });
      const posVals = Object.values(posMap);
      if (posVals.length === 0) return;
      const furthestBackPos = Math.min(...posVals);
      const el = topTilesRef.current.querySelector(`[data-idx='${furthestBackPos}']`);
      if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ inline: 'start', block: 'nearest', behavior: 'auto' });
    } catch (e) {}
  }, [cards, track]);

  // (prepareSprints was removed — sprint detection runs after group reassignment in flow)

  // All helper implementations (getPenalty, takesLeadFC, humanResponsibility,
  // getTeamMatesInGroup, pickValue, takesLeadFCFloating) were moved to
  // `src/game/gameLogic.js`. App now imports and uses the shared versions.
  const autoPlayTeam = (groupNum, teamName = currentTeam) => {
  const teamRiders = Object.entries(cards).filter(([,r]) => r.group === groupNum && r.team === teamName && !r.finished);
  
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
    if (r.finished) return;
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
  // Pass the app logger into takesLeadFC so its internal debug/probability
  // messages are routed to the game log (previously the logger param was
  // omitted and so no TLFC logs were emitted).
  updatedCards[name].takes_lead = takesLeadFC(name, updatedCards, track, numberOfTeams, false, false, [], addLog);
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

      let selected = 0;
      // If this rider is an AI attacker (takes_lead === 2), pick the lowest-numbered
      // card among the top-4 (highest effort) and use its flat/uphill as the selected value.
      // Use the shared pickValue for both attacker and non-attacker selection so
      // local penalties (TK-1 / kort:16) and slipstream are always considered.
      // This prevents AI choosing a selected_value that cannot actually be played
      // when penalties are present.
      selected = pickValue(name, updatedCards, track, pacesForCall, numberOfTeams, addLog);

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
        // If a planned_card_id was already set earlier (AI attacker policy), don't overwrite it.
        if (!updatedCards[name].planned_card_id) {
        // Determine slipstream for the selected_value and pick a planned card that
        // meets the numeric selected_value accounting for local penalty (TK-1 in top-4)
        const sv = getSlipstreamValue(updatedCards[name].position, updatedCards[name].position + Math.floor(updatedCards[name].selected_value), track);
        const targetNumeric = Math.round(updatedCards[name].selected_value);

        let planned = null;
        // compute local penalty from top-4 (if any TK-1 present)
        const top4 = updatedCards[name].cards.slice(0,4);
        const localPenalty = top4.some(c => c && c.id && c.id.startsWith('TK-1')) ? 1 : 0;

        // We want the non-TK top-4 card with lowest numeric id (highest effort)
        // that has cardValue >= targetNumeric + localPenalty
        let bestNum = Infinity;
        for (const c of top4) {
          if (!c || !c.id) continue;
          if (c.id.startsWith('TK-1')) continue; // prefer non-TK
          const cardNum = parseInt(c.id.match(/\d+/)?.[0] || '15');
          const cardValue = sv > 2 ? c.flat : c.uphill;
          if ((cardValue - localPenalty) >= targetNumeric) {
            if (cardNum < bestNum) { planned = c.id; bestNum = cardNum; }
          }
        }
        // If no non-TK candidate found, fallback to TK-1 options that match the raw targetNumeric
        if (!planned) {
          const nonTKExists = top4.some(c => c && c.id && !c.id.startsWith('TK-1'));
          if (!nonTKExists) {
            for (const c of top4) {
              if (!c || !c.id) continue;
              const cardNum = parseInt(c.id.match(/\d+/)?.[0] || '15');
              const cardValue = sv > 2 ? c.flat : c.uphill;
              if (cardValue === targetNumeric) {
                if (cardNum < bestNum) { planned = c.id; bestNum = cardNum; }
              }
            }
          }
        }
        // Final fallback: pick highest-numbered non-TK in top-4 if any, otherwise any highest-numbered card
        if (!planned && top4.length > 0) {
          for (const c of top4) {
            if (!c || !c.id) continue;
            const cardNum = parseInt(c.id.match(/\d+/)?.[0] || '15');
            if (!c.id.startsWith('TK-1')) {
              if (cardNum < bestNum) { planned = c.id; bestNum = cardNum; }
            }
          }
          if (!planned) {
            // no non-TK found, pick lowest-numbered from top4 (could be TK-1)
            for (const c of top4) {
              if (!c || !c.id) continue;
              const cardNum = parseInt(c.id.match(/\d+/)?.[0] || '15');
              if (cardNum < bestNum) { planned = c.id; bestNum = cardNum; }
            }
          }
        }
          updatedCards[name].planned_card_id = planned;
        }
      }
      
      if (updatedCards[name].selected_value > 0 && updatedCards[name].attacking_status !== 'attacker') {
        // Only non-attacker selected_values contribute to the team's announced pace
        pace = Math.max(pace, updatedCards[name].selected_value);
        const tname = updatedCards[name].team;
        teamPaceMap[tname] = Math.max(teamPaceMap[tname] || 0, Math.round(updatedCards[name].selected_value));
      }
    } else {
      updatedCards[name].selected_value = 0;
    }
  }
  
  // Determine the team's announced pace from the non-attacker selected_values
  // we recorded in teamPaceMap during the loop. This ensures the returned
  // `pace` matches an actual non-attacker selected_value when possible.
  const teamDeclaredPace = Math.round(teamPaceMap[teamName] || 0);
  // Determine max pace already present from OTHER teams (exclude this team)
  const otherPaces = Object.entries(teamPaceMap).filter(([k]) => k !== teamName).map(([, v]) => Number(v) || 0);
  const otherMax = otherPaces.length > 0 ? Math.max(...otherPaces) : 0;

  let finalPace = teamDeclaredPace;
  // If our declared pace is non-positive or would not affect the group (<= otherMax)
  // fall back to the random minimal choice (2-4) to mirror original AI unpredictability.
  if (!finalPace || finalPace <= otherMax) {
    finalPace = 0;
  }
  if (finalPace === 0) finalPace = Math.floor(Math.random() * 3) + 2;
  if (finalPace <= otherMax) finalPace = 0;
  // Ensure integer >= 2
  pace = Math.max(2, Math.round(finalPace || 0));

  const msg = pace === 0 ? `${currentTeam}: 0` : `${currentTeam}: ${pace}`;
  // Show a short-lived AI message for UX, but avoid adding a log here because
  // the definitive submission (and its log) is created by handlePaceSubmit.
  setAiMessage(msg);

// Return data i stedet for at kalde handlePaceSubmit direkte
return { pace, updatedCards };
};

  // For Brosten tracks the UI offers an explicit "Check if crash" button
  // that the user must press. See `checkCrash()` which performs the roll.

  // initializeGame: set up teams, assign riders and breakaways
  // Accept an optional `drafted` argument which can be either:
  // - an array of { rider, team } objects (from an interactive draft), or
  // - an array of rider objects (a pool) which will be shuffled and assigned to teams.
  const initializeGame = (drafted = null) => {
  // Prepare selectedTrack and track state
  const selectedTrack = getResolvedTrack();
  setTrack(selectedTrack);

  // build team list
  const teamList = ['Me'];
  for (let i = 1; i < numberOfTeams; i++) teamList.push(`Comp${i}`);

  const total = numberOfTeams * ridersPerTeam;
  const breakawayCount = total > 9 ? 2 : 1;

  // Build selectedRidersWithTeam depending on drafted argument
  let selectedRidersWithTeam = [];
  if (Array.isArray(drafted) && drafted.length > 0) {
    // Case 1: drafted is explicit mapping [{ rider, team }, ...]
    if (drafted[0] && drafted[0].rider) {
      const clipped = drafted.slice(0, total);
      selectedRidersWithTeam = clipped.map((d, idx) => ({ rider: d.rider, originalIdx: d.rider && d.rider._origIdx ? d.rider._origIdx : idx, idx, team: d.team || teamList[Math.floor(idx / ridersPerTeam)] }));
    } else if (drafted[0] && drafted[0].NAVN) {
      // Case 2: drafted is an array of rider objects
      const selectedRiders = drafted.slice(0, total).map((r, i) => ({ r, i }));
      for (let i = selectedRiders.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selectedRiders[i], selectedRiders[j]] = [selectedRiders[j], selectedRiders[i]];
      }
      selectedRidersWithTeam = selectedRiders.map(({ r: rider, i: originalIdx }, idx) => ({ rider, originalIdx, idx, team: teamList[Math.floor(idx / ridersPerTeam)] }));
    }
  }

  // Fallback: no drafted arg -> take from global ridersData and shuffle
  if (selectedRidersWithTeam.length === 0) {
    const selectedRiders = ridersData.slice(0, total).map((r, i) => ({ r, i }));
    for (let i = selectedRiders.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selectedRiders[i], selectedRiders[j]] = [selectedRiders[j], selectedRiders[i]];
    }
    selectedRidersWithTeam = selectedRiders.map(({ r: rider, i: originalIdx }, idx) => ({ rider, originalIdx, idx, team: teamList[Math.floor(idx / ridersPerTeam)] }));
  }

  // Pick breakaway teams randomly (no duplicate teams)
  const shuffledTeams = [...teamList].sort(() => Math.random() - 0.5);
  const chosenTeams = shuffledTeams.slice(0, breakawayCount);
  // For each chosen team, pick one random rider from that team to be in breakaway
  const breakawayAssignedIdxs = new Set();
  for (const bt of chosenTeams) {
    const candidates = selectedRidersWithTeam.filter(s => s.team === bt);
    if (candidates.length === 0) continue;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    breakawayAssignedIdxs.add(pick.idx);
  }

  // Prepare container for generated card/state objects
  const cardsObj = {};

  selectedRidersWithTeam.forEach(({ rider, originalIdx, idx, team }) => {
    const isBreakaway = breakawayAssignedIdxs.has(idx);
    // Create a modified shallow copy of the rider and apply light per-track
    // adjustments before generating cards. This mirrors the Streamlit logic
    // intent: boost climbing (BJERG) on tracks with longer hill sequences
    // and apply a smaller cobble/pave (brosten) boost when the track ends
    // with 'B' or '*'. The exact numeric mapping is intentionally small and
    // conservative so it doesn't destabilize existing behaviour.
    const modifiedRider = { ...rider };
    try {
      const longest = getLongestHill(selectedTrack);
      const isBrosten = typeof selectedTrack === 'string' && /[B\*]$/.test(selectedTrack);

  // Compute puncheur factor multiplier per your formula:
  // multiplier = min(1, 3 / max(longest_hill, 3))
  // rpf = int(rider.PUNCHEUR * multiplier * puncheur_param)
  // NOTE: `puncheur_param` is a global/track parameter (not the rider's PUNCHEUR).
  // If you don't have a UI control for a global puncheur, we default it to 1.
  const puncheurField = Number(rider.PUNCHEUR) || 0;
  const puncheur_param = 1; // TODO: replace with UI value if you want control over overall puncheur strength
  const multiplier = Math.min(1, 3 / Math.max(longest, 3));
  const rpf = Math.trunc(puncheurField * multiplier * puncheur_param);

      // Build l[] per your snippet: 15 entries corresponding to BJERG1..BJERG15
      let l = [];
      if (rpf !== 0) {
        const absr = Math.abs(rpf);
        const step = 16 / (absr + 1);
        for (let k = 1; k <= 15; k++) {
          if ((k % step) < 1) {
            l.push(Math.trunc(rpf / absr));
          } else {
            l.push(0);
          }
        }
      } else {
        l = Array(15).fill(0);
      }

      // Apply l[] to per-card BJERGk values.
      // If this is a "Brosten" track (ends with '*'), per the requested
      // behaviour we derive per-card uphill values from the FLAD values and
      // then apply the puncheur l[] adjustments on top. The aggregate
      // displayed Brosten stat will be FLAD + BROSTEN (CSV) and is handled
      // below.
      let sumL = 0;
      if (//.test('')) {} // noop to keep patch context stable
      if (typeof selectedTrack === 'string' && /\*$/.test(selectedTrack)) {
        // Brosten-star behaviour: uphill per-card = FLADk + l[k]
        for (let k = 1; k <= 15; k++) {
          const fbase = Number(rider[`FLAD${k}`]) || Number(rider.FLAD) || 0;
          const delta = l[k - 1] || 0;
          modifiedRider[`BJERG${k}`] = Math.round(fbase + delta);
          sumL += delta;
        }
        // Aggregate Brosten stat is FLAD + BROSTEN (CSV) — do not include puncheur sum here
        modifiedRider.BJERG = Math.round((Number(rider.FLAD) || 0) + (Number(rider.BROSTEN) || 0));
      } else {
        // Default behaviour (normal BJERG): base on rider.BJERG and apply l[]
        for (let k = 1; k <= 15; k++) {
          const base = Number(rider[`BJERG${k}`]) || Number(rider.BJERG) || 0;
          const delta = l[k - 1] || 0;
          modifiedRider[`BJERG${k}`] = Math.round(base + delta);
          sumL += delta;
        }
        // If the track ends with plain 'B' (brostensbakke) we additionally
        // distribute the CSV BROSTEN value across per-card BJERG slots so the
        // number of lowered cards matches BROSTEN; otherwise include BROSTEN in total.
        const brostenField = Number(rider.BROSTEN) || 0;
        if (isBrosten && brostenField !== 0) {
          const sign = brostenField > 0 ? 1 : -1;
          let need = Math.abs(brostenField);
          for (let k = 1; k <= 15 && need > 0; k++) {
            if ((l[k - 1] || 0) === 0) {
              modifiedRider[`BJERG${k}`] = Math.round((Number(modifiedRider[`BJERG${k}`]) || 0) + sign);
              need -= 1;
            }
          }
          for (let k = 1; k <= 15 && need > 0; k++) {
            if (need <= 0) break;
            modifiedRider[`BJERG${k}`] = Math.round((Number(modifiedRider[`BJERG${k}`]) || 0) + sign);
            need -= 1;
          }
          sumL += brostenField;
        }
        modifiedRider.BJERG = Math.round((Number(rider.BJERG) || 0) + sumL);
      }
    } catch (e) {
      // On any error fall back to original rider
    }

    cardsObj[rider.NAVN] = {
      position: isBreakaway ? 5 : 0,
      cards: generateCards(modifiedRider, isBreakaway),
      discarded: [],
      group: isBreakaway ? 1 : 2,
      prel_time: 10000,
      time_after_winner: 10000,
      result: 1000,
      sprint: rider.SPRINT,
      // Use the per-track adjusted BJERG value (which may be derived from
      // FLAD, BROSTEN and puncheur adjustments) so the draft UI reflects the
      // aggregated stat that was used when generating cards.
      bjerg: (modifiedRider && typeof modifiedRider.BJERG !== 'undefined') ? Number(modifiedRider.BJERG) : Number(rider.BJERG),
      flad: (modifiedRider && typeof modifiedRider.FLAD !== 'undefined') ? Number(modifiedRider.FLAD || rider.FLAD) : Number(rider.FLAD),
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
  
  // compute initial per-rider stats (moved to shared game logic)
  computeInitialStats(cardsObj, selectedTrack, 0, numberOfTeams);
  // computeInitialStats mutates cardsObj in-place and returns helper values
  
  // RESET ALT STATE
  setCards(cardsObj);
  setRound(0);
  setCurrentGroup(2);
  setTeamPaces({});
  setTeamPaceMeta({});
  setMovePhase('input');
  setGroupSpeed(0);
  setSlipstream(0);
  setLogs([]);
  setAiMessage('');
  const shuffled = [...teamList].sort(() => Math.random() - 0.5);
  setTeams(shuffled);
  // store base order (who is team 1,2,3,...) so we can compute per-round turn rotation
  setTeamBaseOrder(shuffled);
  // pick first team that has riders in the starting group (group 2) to avoid landing on an empty team
  const firstTeamAtStart = findNextTeamWithRiders(0, 2);
  if (firstTeamAtStart) setCurrentTeam(firstTeamAtStart);
  else setCurrentTeam(shuffled[0]);
  setGameState('playing');
  
  setLogs([`Game started! Length: ${getLength(selectedTrack)} km`]);
  // include chosen level in the log for visibility
  setLogs(prev => [...prev, `Level: ${level}`]);
};

  const startDraft = () => {
    // Start an interactive draft: clear previous riders and build pool
    // Ensure a fresh set of riders each time Start Game is clicked.
    // Defensive reset of all draft state to avoid stale values when re-entering the draft
    setCards({});
    setDraftSelections([]);
    setDraftRemaining([]);
    setDraftPool([]);
    setDraftTeamsOrder([]);
    setDraftPickSequence(null);
    setDraftTotalPicks(null);
    setDraftCurrentPickIdx(0);
    setDraftRoundNum(1);
    setIsDrafting(false);
    setDraftDebugMsg(null);
  // Ensure the track preview matches the currently selected trackName
  const selectedTrack = getResolvedTrack();
  setTrack(selectedTrack);
    const total = numberOfTeams * ridersPerTeam;
    const pool = [...ridersData];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const pick = pool.slice(0, total);
    // Set both draftPool (visual) and draftRemaining (interactive picks)
    setDraftPool(pick);
    startInteractiveDraft(pick);
    setGameState('draft');
  };
  
  // Run AI resubmissions for choice-2 for the given group. This will iterate
  // AI teams that have non-attacker riders in the group and invoke their
  // decision logic, then submit via handlePaceSubmit. Human ('Me') is skipped.
  const runChoice2AI = async (groupNum) => {
    try {
      // If round changed or was cleared, abort.
      const currentRound = (teamPaceRound && teamPaceRound[groupNum]) ? teamPaceRound[groupNum] : 1;
      if (currentRound !== 2) return;
  
      const groupRidersAll = Object.entries(cards).filter(([, r]) => r.group === groupNum && !r.finished);
      const teamsWithRiders = teams.filter(t => groupRidersAll.some(([, r]) => r.team === t && r.attacking_status !== 'attacker'));
  
      for (const t of teamsWithRiders) {
        if (t === 'Me') continue; // human decides manually
        // abort if round changed while looping
        const roundNow = (teamPaceRound && teamPaceRound[groupNum]) ? teamPaceRound[groupNum] : 1;
        if (roundNow !== 2) return;
  
        // Run AI decision for this team (reuse autoPlayTeam helper)
        const res = autoPlayTeam(groupNum, t);
        let aiTeamPace = 0;
        let aiIsAttack = false;
        let aiAttackerName = null;
        if (res) {
          // Prefer the explicit pace computed by autoPlayTeam. If missing or 0,
          // fall back to inferring from the per-rider selected_value in updatedCards.
          if (typeof res.pace === 'number') aiTeamPace = Math.round(res.pace || 0);
          if ((!aiTeamPace || aiTeamPace === 0) && res.updatedCards) {
            const teamRidersRes = Object.entries(res.updatedCards).filter(([, r]) => r.group === groupNum && r.team === t && !r.finished);
            const nonAttackerPaces = teamRidersRes.filter(([, r]) => r.attacking_status !== 'attacker').map(([, r]) => Math.round(r.selected_value || 0));
            aiTeamPace = nonAttackerPaces.length > 0 ? Math.max(...nonAttackerPaces) : 0;
            aiIsAttack = teamRidersRes.some(([, r]) => r.attacking_status === 'attacker');
            aiAttackerName = (teamRidersRes.find(([, r]) => r.attacking_status === 'attacker') || [null, null])[0] || null;
          } else if (res.updatedCards) {
            // Still extract attack info from updatedCards even if we used res.pace
            const teamRidersRes = Object.entries(res.updatedCards).filter(([, r]) => r.group === groupNum && r.team === t && !r.finished);
            aiIsAttack = teamRidersRes.some(([, r]) => r.attacking_status === 'attacker');
            aiAttackerName = (teamRidersRes.find(([, r]) => r.attacking_status === 'attacker') || [null, null])[0] || null;
          }
        }
  
        addLog(`${t} (AI) resubmits for choice-2: pace=${aiTeamPace}${aiIsAttack ? ' attack' : ''}`);
        handlePaceSubmit(groupNum, aiTeamPace, t, aiIsAttack, aiAttackerName);
        // small delay so logs and UI update smoothly
        await new Promise(r => setTimeout(r, 90));
      }
    } catch (e) {
      // ignore errors in AI resubmission
    }
  };

  // Simple heuristic win score for ranking riders during draft picks.
  // This is intentionally lightweight — we only need a stable relative ordering
  // so computer teams can choose the 'best' remaining rider.
  // Fallback simple heuristic (kept for debug) — we will prefer computing
  // the real `win_chance` via computeInitialStats below when possible.
  const computeWinScore = (rider) => {
    if (!rider) return 0;
    let score = 0;
    // Use per-track adjusted BJERG when available so the simple heuristic
    // better matches the per-track modified stat used by computeInitialStats.
    const selectedTrackLocal = getResolvedTrack();
    const modified = computeModifiedBJERG(rider, selectedTrackLocal) || {};
    const bjergVal = (typeof modified.modifiedBJERG !== 'undefined') ? Number(modified.modifiedBJERG) : Number(rider.BJERG);
    score += (Number(rider.FLAD) || 0) * 1.0;
    score += (bjergVal || 0) * 1.0;
    score += (Number(rider.SPRINT) || 0) * 1.0;
    score += (Number(rider.MENTALITET) || 0) * 0.5;
    for (let i = 1; i <= 15; i++) {
      score += (Number(rider[`FLAD${i}`]) || 0) * 0.02;
      score += (Number(rider[`BJERG${i}`]) || 0) * 0.02;
    }
    return score;
  };

  // Compute a candidate's win_chance as computeInitialStats would compute it
  // when the game is started. Build a temporary roster filling remaining
  // slots arbitrarily and then call computeInitialStats.
  const computeCandidateWinChance = (candidate, pickingTeam, selections, remainingPool) => {
    try {
      const total = numberOfTeams * ridersPerTeam;
      // teams in initializeGame: ['Me', 'Comp1', ...]
      const teamList = ['Me'];
      for (let i = 1; i < numberOfTeams; i++) teamList.push(`Comp${i}`);

      // Count already assigned per team from selections
      const counts = {};
      for (const t of teamList) counts[t] = 0;
      const assigned = [];
      (selections || []).forEach(s => { if (s && s.team && s.rider) { assigned.push({ rider: s.rider, team: s.team }); counts[s.team]++; } });
      // include the hypothetical pick
      assigned.push({ rider: candidate, team: pickingTeam });
      counts[pickingTeam] = (counts[pickingTeam] || 0) + 1;

      // Build filler list from remainingPool (excluding candidate), then global ridersData
      const usedNames = new Set(assigned.map(a => a.rider.NAVN));
      const poolCandidates = (remainingPool || []).filter(r => r.NAVN !== candidate.NAVN);
      let fillers = [...poolCandidates];
      if (fillers.length + assigned.length < total) {
        for (const r of ridersData) {
          if (usedNames.has(r.NAVN)) continue;
          fillers.push(r);
          if (fillers.length + assigned.length >= total) break;
        }
      }

      // Assign fillers to teams to reach ridersPerTeam per team in teamList order
      let fillIdx = 0;
      for (const t of teamList) {
        while (counts[t] < ridersPerTeam && fillIdx < fillers.length) {
          assigned.push({ rider: fillers[fillIdx++], team: t });
          counts[t]++;
        }
      }

      // If still not enough, return fallback score
      if (assigned.length < total) return computeWinScore(candidate);

      // Build cardsObj similar to initializeGame
      const cardsObj = {};
      // no breakaway handling here — just default false
      for (let idx = 0; idx < assigned.length; idx++) {
        const { rider, team } = assigned[idx];
        // Use per-track modified BJERG when computing candidate win chances
        // so the draft AI evaluates riders using the same adjusted stat used
        // when starting a game. computeModifiedBJERG returns { modifiedBJERG, label, puncheur_factor }.
        const modified = computeModifiedBJERG(rider, selectedTrack);
        cardsObj[rider.NAVN] = {
            position: 0,
            cards: generateCards(rider, false),
            discarded: [],
            group: 2,
            prel_time: 10000,
            time_after_winner: 10000,
            result: 1000,
            sprint: rider.SPRINT,
            // prefer per-track adjusted BJERG when available
            bjerg: (modified && typeof modified.modifiedBJERG !== 'undefined') ? Number(modified.modifiedBJERG) : Number(rider.BJERG),
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
      }

  const selectedTrack = getResolvedTrack();
      // computeInitialStats mutates cardsObj and sets win_chance fields
      computeInitialStats(cardsObj, selectedTrack, 0, numberOfTeams);
      const entry = cardsObj[candidate.NAVN];
      if (entry && typeof entry.win_chance === 'number') return entry.win_chance;
      return computeWinScore(candidate);
    } catch (e) {
      return computeWinScore(candidate);
    }
  };

  // Compute human pick positions for the interactive draft.
  // Ported from the provided Python snippet. Currently supports riders_per_team == 3 behavior.
  const computeHumanPickPositions = (riders_per_team, teams_count, level) => {
    const riders = riders_per_team * teams_count;
    const list_ = [];
    const minimum = 1 + riders_per_team * 0.5 - 0.5;
    const maximum = riders - 0.5 * riders_per_team + 0.5;

    if (riders_per_team === 3) {
      // replicate the Python logic
      const avg = level * (maximum - minimum) / 100 + minimum;
      let first = Math.round(level * (maximum - minimum) / 100 + minimum);
      let second = Math.max(first - teams_count, 1);
      const thirdInitial = Math.round(avg * riders_per_team - first - second);
      let third = thirdInitial;
      let a = 0;
      // Ensure third does not exceed riders
      while (third > riders) {
        if (a % 2 === 1) {
          first = 1 + first;
          third = third - 1;
          a = 1 + a;
        } else {
          second = 1 + second;
          third = third - 1;
          a = 1 + a;
        }
      }

      list_.push(first);
      list_.push(second);
      list_.push(third);
      } else if (riders_per_team === 4) {
        // Implemented from the provided formula for 4 riders per team
        const minimum = 1 + (4 - 1) * 0.5; // 1 + 3*0.5
        const maximum = teams_count * 4 - (4 - 1) * 0.5; // teams*4 - 1.5
        const forskel = maximum - minimum;
        const average = minimum + forskel * (level / 100);

        let afstand = 50 - Math.abs(level - 50);
        afstand = 1 + afstand * ((teams_count - 1) / 50);

        let first = Math.round(average - 1.5 * afstand);
        let rest = first - (average - 1.5 * afstand);
        let second = Math.round(average - 0.5 * afstand + rest);
        rest = second - (average - 0.5 * afstand + rest);
        let third = Math.round(average + 0.5 * afstand + rest);
  let fourth = Math.round(average * 4 - (first + second + third));

  // If third and fourth resolve to the same pick index, nudge the
  // fourth one up by one to avoid duplicate pick positions.
  if (third === fourth) fourth = fourth + 1;

  list_.push(first);
  list_.push(second);
  list_.push(third);
  list_.push(fourth);
    } else if (riders_per_team === 2) {
      // Ported from provided Python logic for riders_per_team == 2
      const average = level * (maximum - minimum) / 100 + minimum;
      let first = Math.max(Math.round(average - teams_count / 2), 1);
      let second = Math.round(average * 2 - first);
      // Ensure second does not exceed riders: bump first and decrement second until in range
      while (second > riders) {
        first = 1 + first;
        second = second - 1;
      }

      list_.push(first);
      list_.push(second);
    } else {
      // Fallback: evenly space human picks across the draft
      const total = riders_per_team * teams_count;
      for (let i = 0; i < riders_per_team; i++) {
        list_.push(1 + Math.round((i * total) / riders_per_team));
      }
    }

    // Ensure unique, sorted, and within range
    const uniq = Array.from(new Set(list_.map(x => Math.max(1, Math.min(x, riders)))));
    uniq.sort((a, b) => a - b);
    return uniq;
  };

  const startInteractiveDraft = (pool) => {
    // pool: array of rider objects
    // Defensive reset at start of interactive draft to ensure no stale state
    setDraftPickSequence(null);
    setDraftTotalPicks(null);
    setDraftDebugMsg(null);
    const remaining = [...pool];
    // Teams: computers first then human last
    const teamsOrder = [];
    for (let i = 1; i < numberOfTeams; i++) teamsOrder.push(`Comp${i}`);
    teamsOrder.push('Me');

    setDraftRemaining(remaining);
    setDraftSelections([]);
    setDraftTeamsOrder(teamsOrder);
    setDraftCurrentPickIdx(0);
    setDraftRoundNum(1);
    setIsDrafting(true);

    // Compute explicit pick sequence using the actual remaining pool length
    // as the authoritative total number of picks. The helper returns 1-based
    // global pick indices where the human should pick (e.g. [2,5,8]).
    // Declare seq in the outer scope so it's safe to reference below even
    // if the try-block fails (avoids ReferenceError).
    let seq = null;
    try {
      const totalPicks = remaining.length;
      setDraftTotalPicks(totalPicks);
      const humanPositions = computeHumanPickPositions(ridersPerTeam, numberOfTeams, level) || [];
      // clamp positions and make unique
      const uniq = Array.from(new Set(humanPositions.map(p => Math.max(1, Math.min(totalPicks, Math.round(p)))))).sort((a,b) => a-b);
      // Prepare counts remaining per team after reserving human picks
      const countsRemaining = {};
      for (const t of teamsOrder) countsRemaining[t] = ridersPerTeam;
      // Reserve human picks in the sequence
  seq = Array(totalPicks).fill(null);
      for (const p of uniq) {
        if (countsRemaining['Me'] > 0) {
          seq[p - 1] = 'Me';
          countsRemaining['Me'] = countsRemaining['Me'] - 1;
        }
      }
      // Build an available teams list in round-robin order from remaining counts
      const tempCounts = { ...countsRemaining };
      const available = [];
      for (let r = 0; r < ridersPerTeam; r++) {
        for (const t of teamsOrder) {
          if (tempCounts[t] > 0) {
            available.push(t);
            tempCounts[t] = tempCounts[t] - 1;
          }
        }
      }
      // Fill remaining slots from the available list
      let aiIdx = 0;
      for (let i = 0; i < seq.length; i++) {
        if (seq[i] === null) {
          if (aiIdx < available.length) {
            seq[i] = available[aiIdx++];
          } else {
            // fallback: assign in round-robin
            seq[i] = teamsOrder[i % teamsOrder.length];
          }
        }
      }
      setDraftPickSequence(seq);
    } catch (e) {
      // ignore and leave draftPickSequence null if something fails
      setDraftPickSequence(null);
    }

    // kick off the first automated picks (if first picks are computers)
    // Pass the freshly computed seq into the pick loop to avoid a race
    // where the async setDraftPickSequence hasn't propagated to state yet.
    setTimeout(() => processNextPick(remaining, teamsOrder, 0, seq), 50);
  };

  // Helper: compute which team should pick next based on current selections
  const getNextDraftTeam = (selections, teamsOrderLocal, pickSequenceParam = null) => {
    if (!teamsOrderLocal || teamsOrderLocal.length === 0) return null;
    // If an explicit pick sequence is provided, prefer it
    try {
      const seq = Array.isArray(pickSequenceParam) ? pickSequenceParam : (draftPickSequence && Array.isArray(draftPickSequence) ? draftPickSequence : null);
      if (seq && selections && selections.length < seq.length) {
        const idx = selections.length;
        const candidate = seq[idx];
        // validate candidate still has remaining picks
        const counts = {};
        for (const t of teamsOrderLocal) counts[t] = 0;
        for (const s of (selections || [])) if (s && s.team) counts[s.team] = (counts[s.team] || 0) + 1;
        if ((counts[candidate] || 0) < ridersPerTeam) return candidate;
        // otherwise fall through to fallback logic
      }
    } catch (e) {
      // ignore and fallback to default
    }

    const counts = {};
    for (const t of teamsOrderLocal) counts[t] = 0;
    for (const s of (selections || [])) if (s && s.team) counts[s.team] = (counts[s.team] || 0) + 1;
    let offset = 0;
    while (offset < teamsOrderLocal.length) {
      const idx = ((selections || []).length + offset) % teamsOrderLocal.length;
      const candidate = teamsOrderLocal[idx];
      if ((counts[candidate] || 0) < ridersPerTeam) return candidate;
      offset += 1;
    }
    return null;
  };

  // pickSequenceParam: optional explicit per-pick sequence array; when provided
  // the function will use the passed-in sequence for all internal decisions
  // to avoid state races with async setState updates.
  const processNextPick = (remainingArg = null, teamsArg = null, selectionsArg = null, pickSequenceParam = null) => {                                                                                             // Accept current values or use provided args
    const remaining = remainingArg || draftRemaining;
    const teamsOrder = teamsArg || draftTeamsOrder;
    const selections = Array.isArray(selectionsArg) ? selectionsArg : draftSelections;

    // Basic guards
    if (!remaining || remaining.length === 0 || !teamsOrder || teamsOrder.length === 0) return;

  const totalPicksNeeded = draftTotalPicks || (numberOfTeams * ridersPerTeam);
  if (selections.length >= totalPicksNeeded) { setIsDrafting(false); return; }

    // Build counts per team from provided selections
    const counts = {};
    for (const t of teamsOrder) counts[t] = 0;
    for (const s of selections) if (s && s.team) counts[s.team] = (counts[s.team] || 0) + 1;


    // Determine next team using the helper (which may consult draftPickSequence)
  const teamPicking = getNextDraftTeam(selections, teamsOrder, pickSequenceParam);
    if (!teamPicking) { setIsDrafting(false); return; }

    // If it's human's turn, set state and wait for UI interaction
    if (teamPicking === 'Me') {
      // current pick index equals current selections length
      const pickIndex = selections.length;
      setDraftCurrentPickIdx(pickIndex);
      setDraftRoundNum(Math.floor(pickIndex / teamsOrder.length) + 1);
      return;
    }

    // Computer picks: rank remaining by computed win_chance and choose best
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const s = computeCandidateWinChance(candidate, teamPicking, selections, remaining);
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    }
    const chosen = remaining[bestIdx];

    const newSelections = [...selections, { team: teamPicking, rider: chosen }];
    const newRemaining = [...remaining.slice(0, bestIdx), ...remaining.slice(bestIdx + 1)];
    setDraftSelections(newSelections);
    setDraftRemaining(newRemaining);
    setDraftPool(newRemaining);

    // Continue to next pick automatically (pass newSelections so state-sync not required)
    if (newSelections.length < totalPicksNeeded) {
      setTimeout(() => processNextPick(newRemaining, teamsOrder, newSelections, pickSequenceParam), 150);
    } else {
      setIsDrafting(false);
    }
  };

  const handleHumanPick = (rider) => {
    if (!isDrafting) return;
    // Use the authoritative next-team calculation and pass the explicit
    // sequence so we avoid any potential state-race (Vercel timing differences).
    const seqLocal = Array.isArray(draftPickSequence) ? draftPickSequence : null;
    const teamPicking = getNextDraftTeam(draftSelections, draftTeamsOrder, seqLocal);
    const dbgMsg = `humanPick clicked: expected=${teamPicking} seqLen=${seqLocal ? seqLocal.length : 'n/a'} total=${draftTotalPicks || 'n/a'}`;
    setDraftDebugMsg(dbgMsg);
    setTimeout(() => setDraftDebugMsg(null), 2000);
    if (teamPicking !== 'Me') {
      // Not our turn — log and ignore click
      return;
    }

    const chosenIdx = draftRemaining.findIndex(r => r.NAVN === rider.NAVN);
    if (chosenIdx === -1) return;

    const chosen = draftRemaining[chosenIdx];
    const newSelections = [...draftSelections, { team: 'Me', rider: chosen }];
    const newRemaining = [...draftRemaining.slice(0, chosenIdx), ...draftRemaining.slice(chosenIdx + 1)];
    setDraftSelections(newSelections);
    setDraftRemaining(newRemaining);
    setDraftPool(newRemaining);

    // Continue automatic picks after human selection — pass the explicit
    // pick sequence to avoid races between setState and the pick loop.
    setTimeout(() => processNextPick(newRemaining, draftTeamsOrder, newSelections, seqLocal), 120);
  };

  const confirmDraftAndStart = () => {
    // If we completed an interactive draft, use the explicit team mapping
    const total = numberOfTeams * ridersPerTeam;
    if (draftSelections && draftSelections.length === total) {
      // drafted array with explicit team marker: { rider, team }
      const drafted = draftSelections.slice(0, total).map(s => ({ rider: s.rider, team: s.team }));
      initializeGame(drafted);
      // clear draft state
      setDraftPool([]);
      setDraftRemaining([]);
      setDraftSelections([]);
      setDraftTeamsOrder([]);
      setDraftCurrentPickIdx(0);
      setIsDrafting(false);
      setGameState('playing');
      return;
    }

    // fallback: non-interactive flow (legacy)
    initializeGame(draftPool);
    setDraftPool([]);
  };
  
  
  // Find next team index that has at least one non-attacker rider in the group
  const findNextTeamWithRiders = (startIdx, groupNum) => {
    if (!Array.isArray(teams) || teams.length === 0) return null;
    for (let i = 0; i < teams.length; i++) {
      const idx = (startIdx + i) % teams.length;
      const t = teams[idx];
      const has = Object.entries(cards).some(([, r]) => r.group === groupNum && r.team === t && !r.finished && r.attacking_status !== 'attacker');
      if (has) return t;
    }
    // fallback: return the original start team
    return teams[startIdx % teams.length];
  };

  const handlePaceSubmit = (groupNum, pace, team = null, isAttack = false, attackerName = null) => {
    const submittingTeam = team || currentTeam;
    const paceKey = `${groupNum}-${submittingTeam}`;

    // Prevent double-submission by same team for the same round.
    // If the group is in round 2 we allow replacing a round-1 submission.
    const existingMeta = teamPaceMeta[paceKey];
    const existingRound = existingMeta && existingMeta.round ? existingMeta.round : 1;
    const currentRound = (teamPaceRound && teamPaceRound[groupNum]) ? teamPaceRound[groupNum] : 1;
    if (existingMeta && existingRound >= currentRound) {
      addLog(`${submittingTeam} already chose for group ${groupNum}`);
      return;
    }

  // Hide any lingering post-move summary when a new choice is being made.
  // This removes the yellow played-cards panel until the next group moves.
  try {
    if (postMoveInfo) setPostMoveInfo(null);
  } catch (e) {}

  // Ensure attacks are only allowed when the group has at least 3 riders.
  // If the UI (human) or AI requested an attack but the group is too small,
  // ignore the attack and clear any attacker flags that may have been set
  // earlier by UI code (handleHumanChoices sets attacker state before
  // calling handlePaceSubmit).
  try {
    const groupRidersAllCheck = Object.entries(cards).filter(([, r]) => r.group === groupNum && !r.finished);
    if (isAttack && groupRidersAllCheck.length < 3) {
      addLog(`${submittingTeam} attempted an attack but group has fewer than 3 riders — attack ignored`);
      // Clear any attacker flags that UI may have set for this team in this group
      setCards(prev => {
        try {
          const updated = { ...prev };
          for (const [nm, r] of Object.entries(updated)) {
            if (r && r.group === groupNum && r.team === submittingTeam && r.attacking_status === 'attacker') {
              updated[nm] = { ...r, attacking_status: 'no', takes_lead: 0, selected_value: 0, planned_card_id: null, attack_card: null };
            }
          }
          return updated;
        } catch (e) { return prev; }
      });
      // ignore the attack for the remainder of this submission
      isAttack = false;
      attackerName = null;
    }
  } catch (e) {}

  // Build a local copy including this submission so we can synchronously
  // decide whether all teams have submitted for the group. Keep numeric
  // pace values in `teamPaces` (backwards compatible) and store a
  // per-team metadata entry in `teamPaceMeta` so the UI can show attacks
  // and distinguish "no submission" from an explicit 0 choice.
  // Capture previous pace (from round 1) before overwriting so we can
  // later decide whether choice-2 actually changed the announced speed.
  const prevPaceForThisTeam = (teamPaces && typeof teamPaces[paceKey] !== 'undefined') ? teamPaces[paceKey] : undefined;
  const newTeamPaces = { ...teamPaces, [paceKey]: parseInt(pace) };
  setTeamPaces(newTeamPaces);
  // If this is a round-2 resubmission and the team previously declared an
  // attack in round-1, enforce that the attacker remains attacker.
  let effectiveIsAttack = !!isAttack;
  let effectiveAttacker = attackerName || null;
  if (currentRound === 2 && existingMeta && existingMeta.isAttack && existingMeta.round === 1) {
    if (!effectiveIsAttack) {
      // Force attacker to remain attacker on revise
      effectiveIsAttack = true;
      effectiveAttacker = existingMeta.attacker || effectiveAttacker;
      addLog(`${submittingTeam} revised choice but attacker ${effectiveAttacker} remains attacker`);
    }
  }
  // record which round this submission belongs to so we can distinguish
  // round-1 vs round-2 submissions when finalizing the group.
  // If this is a round-2 revise and we have a previous pace from round-1,
  // record it so downstream logic can determine whether the team's pace
  // actually changed during choice-2 (we only apply EC penalty when it did).
  const metaEntry = { isAttack: effectiveIsAttack, attacker: effectiveAttacker, round: currentRound };
  if (currentRound === 2 && typeof prevPaceForThisTeam !== 'undefined') metaEntry.prevPace = prevPaceForThisTeam;
  const newMeta = { ...teamPaceMeta, [paceKey]: metaEntry };
  setTeamPaceMeta(newMeta);
  // If we're enforcing attacker persistence on revise, also ensure the
  // rider's card state marks them as attacker so movement helpers use it.
  if (currentRound === 2 && existingMeta && existingMeta.isAttack && existingMeta.round === 1) {
    const attackerToEnforce = existingMeta.attacker || effectiveAttacker;
    if (attackerToEnforce) {
      setCards(prev => {
        try {
          const updated = { ...prev };
          if (updated[attackerToEnforce]) {
            updated[attackerToEnforce] = {
              ...updated[attackerToEnforce],
              attacking_status: 'attacker',
              takes_lead: 2,
            };
          }
          return updated;
        } catch (e) { return prev; }
      });
    }
  }

    if (isAttack) {
      addLog(`${submittingTeam}: attack`);
    } else {
      addLog(`${submittingTeam} chose ${pace}`);
    }
  const nextIdx = (teams.indexOf(submittingTeam) + 1) % teams.length;
  const nextTeam = findNextTeamWithRiders(nextIdx, groupNum);
  if (nextTeam) setCurrentTeam(nextTeam);

    // Determine which teams actually have riders in this group
  const groupRidersAll = Object.entries(cards).filter(([, r]) => r.group === groupNum && !r.finished);
    // Only consider teams that have at least one non-attacker rider for the
    // purposes of submitting and finalizing the group's pace. Teams whose
    // only presence in the group is an attacker should not block the basic
    // group pace decision.
  const teamsWithRiders = teams.filter(t => groupRidersAll.some(([, r]) => r.team === t && r.attacking_status !== 'attacker'));

    // Collect submitted paces per team for this group, but only include
    // submissions that belong to the current round and from teams that
    // actually have non-attacker riders in the group.
    const submittedPaces = {};
    Object.entries(newTeamPaces).forEach(([k, v]) => {
      if (!k.startsWith(`${groupNum}-`)) return;
      const t = k.split('-')[1];
      if (!teamsWithRiders.includes(t)) return; // ignore teams without non-attacker riders
      const meta = newMeta[k] || {};
      const metaRound = meta && meta.round ? meta.round : 1;
      if (metaRound === currentRound) submittedPaces[t] = Math.max(submittedPaces[t] || 0, parseInt(v));
    });

  // If the player's team ('Me') has riders in this group, require that
  // the player submits in the current round before finalizing.
  if (teamsWithRiders.includes('Me') && (submittedPaces['Me'] === undefined)) return;

  // Wait until all teams that have non-attacker riders have submitted for this ROUND
  if (Object.keys(submittedPaces).length < teamsWithRiders.length) return;

  // If we're finishing round 1 and any team declared an attack in this group,
  // open a second round (choice-2) allowing all teams to resubmit. Do not
  // finalize movement during this transition.
  if (currentRound === 1) {
    const anyAttack = Object.entries(newMeta).some(([k, m]) => k.startsWith(`${groupNum}-`) && m && m.isAttack);
    if (anyAttack) {
      setTeamPaceRound(prev => ({ ...(prev || {}), [groupNum]: 2 }));
      addLog(`Choice-2 opened for group ${groupNum} due to attack — teams may revise their choices`);
      return;
    }
  }

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

    // If any team has declared an attacker in this group, clear selected_value
    // and takes_lead for the other riders from that team in this group. This
    // ensures the attacker's intent takes precedence and teammates don't also
    // act as pacers.
    setCards(prev => {
      const updated = { ...prev };
      const groupEntries = Object.entries(updated).filter(([, r]) => r.group === groupNum);
      const teamsWithAttackers = new Set(groupEntries.filter(([, r]) => r.attacking_status === 'attacker').map(([n, r]) => r.team));
      if (teamsWithAttackers.size > 0) {
        for (const [name, r] of groupEntries) {
          if (teamsWithAttackers.has(r.team) && r.attacking_status !== 'attacker') {
            updated[name] = { ...r, selected_value: 0, takes_lead: 0 };
          }
        }
        try { addLog(`Cleared selected_value for teammates of attackers in group ${groupNum}: ${[...teamsWithAttackers].join(', ')}`); } catch(e) {}
      }
      return updated;
    });

    const allPaces = Object.values(teamPacesForGroup);

    // Determine group's current position
  const groupPos = Math.max(...Object.values(cards).filter(r => r.group === groupNum && !r.finished).map(r => r.position));

    // Determine the maximum chosen pace among teams (0 if none)
    const maxChosen = allPaces.length > 0 ? Math.max(...allPaces.filter(p => p > 0)) : 0;

    // If a group ahead has already moved, compute distance to that group's
    // furthest position. If that distance is larger than maxChosen, override
    // the group's speed to that distance and clear any leaders.
    const aheadPositions = Object.values(cards).filter(r => r.group > groupNum).map(r => r.position);
    let speed = Math.max(...allPaces.filter(p => p > 0), 2);
    if (aheadPositions.length > 0) {
      const maxAheadPos = Math.max(...aheadPositions);
      if (maxAheadPos > groupPos) {
        const distance = maxAheadPos - groupPos;
        try { addLog(`DEBUG Distance to group ahead=${distance}`); } catch (e) {}
        if (distance > maxChosen) {
          speed = distance;
          try { addLog(`Group ${groupNum}: distance ${distance} > max chosen ${maxChosen}, setting speed=${speed} and clearing selected_value/takes_lead`); } catch(e) {}
          setCards(prev => {
            const updated = { ...prev };
            for (const [n, r] of Object.entries(updated)) {
              if (r.group === groupNum) updated[n] = { ...r, selected_value: 0, takes_lead: 0 };
            }
            return updated;
          });
        }
      }
    }

    if (track[groupPos] === '_') speed = Math.max(5, speed);
    let sv = getSlipstreamValue(groupPos, groupPos + speed, track);
    setGroupSpeed(speed);
    setSlipstream(sv);

    // If any group ahead (higher group number) has already moved and is now
    // positioned such that this group's chosen speed would move into/through
    // that group, cap this group's speed so it stops right behind the ahead group.
    // (reuse aheadPositions computed above)
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
        // Assign exactly one lead from chosenTeam: pick the rider (prefer non-attacker)
        // with the lowest win_chance. Clear takes_lead/selected_value for all others.
        setCards(prev => {
          const updated = { ...prev };
          const groupRiders = Object.entries(updated).filter(([, r]) => r.group === groupNum).map(([n, r]) => ({ name: n, ...r }));

            // Determine candidates from chosenTeam that have selected_value equal
            // to the group's speed. Prefer non-attacking riders first.
            const speedVal = Math.round(speed);
            let candidates = groupRiders.filter(r => r.team === chosenTeam && r.attacking_status !== 'attacker' && Math.round(r.selected_value || 0) === speedVal);
            if (candidates.length === 0) {
              // Try including attackers if no non-attacking candidate matches
              candidates = groupRiders.filter(r => r.team === chosenTeam && Math.round(r.selected_value || 0) === speedVal);
            }

            if (candidates.length === 0) {
              try { addLog(`No leader candidate in ${chosenTeam} with selected_value=${speedVal} for group ${groupNum}`); } catch(e) {}
              return prev;
            }

            // Choose the candidate with the lowest win_chance
            candidates.sort((a, b) => (a.win_chance || 0) - (b.win_chance || 0));
            const bestName = candidates[0].name;

            // Clear takes_lead/selected_value for all riders in group
            for (const r of groupRiders) {
              updated[r.name] = { ...updated[r.name], takes_lead: 0, selected_value: 0 };
            }

            // Leader selected_value = group's speed (cap to speed as safety)
            const leaderSelectedValue = Math.min(speedVal, speed);

            const leadR = updated[bestName];

            // Do NOT mutate the rider's hand here by inserting EC; that would
            // push any TK-1 out of the top-4 and make getPenalty miss it at
            // play time. Instead compute a planned_card_id from the current
            // top-4 without changing the hand; EC will be applied when the
            // card is actually played in confirmMove.
            let planned = null;
            const top4Before = leadR.cards.slice(0, Math.min(4, leadR.cards.length));
            const svAfter = getSlipstreamValue(leadR.position, leadR.position + Math.floor(leaderSelectedValue), track);
            const targetNumeric = Math.round(leaderSelectedValue);
            const localPenalty = top4Before.some(c => c && c.id && c.id.startsWith('TK-1')) ? 1 : 0;

            // Prefer a non-TK top-4 card whose value (after applying localPenalty)
            // is >= targetNumeric. Among candidates pick the one with highest numeric id.
            let bestNum = -1;
            for (const c of top4Before) {
              if (!c || !c.id) continue;
              if (c.id.startsWith('TK-1')) continue;
              const cardNum = parseInt(c.id.match(/\d+/)?.[0] || '15');
              const cardValue = svAfter > 2 ? c.flat : c.uphill;
              if ((cardValue - localPenalty) >= targetNumeric) {
                if (cardNum > bestNum) { planned = c.id; bestNum = cardNum; }
              }
            }

            // If no non-TK meets requirement, and no non-TK exists in top-4,
            // fallback to TK-1 candidates that match raw targetNumeric.
            if (!planned) {
              const nonTKExists = top4Before.some(c => c && c.id && !c.id.startsWith('TK-1'));
              if (!nonTKExists) {
                for (const c of top4Before) {
                  if (!c || !c.id) continue;
                  const cardNum = parseInt(c.id.match(/\d+/)?.[0] || '15');
                  const cardValue = svAfter > 2 ? c.flat : c.uphill;
                  if (cardValue === targetNumeric) {
                    if (cardNum > bestNum) { planned = c.id; bestNum = cardNum; }
                  }
                }
              }
            }

            // Final fallback: choose highest-numbered non-TK in top-4 if present,
            // otherwise highest-numbered card in top-4 (may be TK-1).
            if (!planned && top4Before.length > 0) {
              for (const c of top4Before) {
                if (!c || !c.id) continue;
                const cardNum = parseInt(c.id.match(/\d+/)?.[0] || '15');
                if (!c.id.startsWith('TK-1')) {
                  if (cardNum > bestNum) { planned = c.id; bestNum = cardNum; }
                }
              }
              if (!planned) {
                for (const c of top4Before) {
                  if (!c || !c.id) continue;
                  const cardNum = parseInt(c.id.match(/\d+/)?.[0] || '15');
                  if (cardNum > bestNum) { planned = c.id; bestNum = cardNum; }
                }
              }
            }

            updated[bestName] = { ...leadR, takes_lead: 1, selected_value: leaderSelectedValue, planned_card_id: planned };
          addLog(`${bestName} (${chosenTeam}) assigned as lead for group ${groupNum} (selected_value=${leaderSelectedValue}, planned=${planned})`);

          return updated;
        });
      }
    }

    // Clear any per-group round state now that we've finalized movement for this group
    try {
      setTeamPaceRound(prev => {
        if (!prev) return prev;
        const copy = { ...prev };
        if (copy.hasOwnProperty(groupNum)) delete copy[groupNum];
        return copy;
      });
    } catch (e) {}
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
    // Defensive: disallow human-initiated attacks when the TOTAL group size
    // is fewer than 3 riders. This mirrors the server-side guard and avoids
    // races where the UI could set attacker flags before the guard takes effect.
    const groupRidersAllCheck = Object.entries(updatedCards).filter(([, r]) => r.group === groupNum && !r.finished);
    if (groupRidersAllCheck.length < 3) {
      // clear any attacker flags the UI may have set
      humanRiders.forEach(name => {
        if (updatedCards[name]) {
          updatedCards[name].attacking_status = 'no';
          updatedCards[name].takes_lead = 0;
          updatedCards[name].selected_value = 0;
          updatedCards[name].planned_card_id = null;
          updatedCards[name].attack_card = null;
        }
      });
      setCards(updatedCards);
      addLog(`${(submittingTeam || 'Me')} attempted an attack but group has fewer than 3 riders — attack ignored`);
      // Submit as follow (no attack)
      const teamPaceFallback = 0;
      handlePaceSubmit(groupNum, teamPaceFallback, 'Me', false, null);
      return;
    }
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
  const attackerName = humanRiders.find(n => updatedCards[n].attacking_status === 'attacker') || null;
  handlePaceSubmit(groupNum, teamPace, 'Me', isAttack, attackerName);
};

const confirmMove = (cardsSnapshot) => {
  // Allow callers to pass a snapshot of cards (e.g. immediately after the
  // human submitted planned cards) so we avoid a race with React state
  // updates. If not provided, fall back to the current `cards` state.
  const preCards = cardsSnapshot || cards;

  const names = Object.entries(preCards)
    .filter(([,r]) => r.group === currentGroup)
    .map(([n]) => n);

  const groupsNewPositions = [];

  addLog(`=== Moving group ${currentGroup} ===`);

  // Opret en kopi af hele cards-objektet som vi opdaterer
  const updatedCards = { ...preCards };

  // Capture old positions and planned cards for all riders in this group
  const oldPositions = {};
  const plannedCards = {};
  names.forEach(n => {
    oldPositions[n] = Number(preCards[n] && preCards[n].position ? preCards[n].position : 0);
    // prefer planned_card_id, fallback to attack_card (object) or undefined
    plannedCards[n] = (preCards[n] && (preCards[n].planned_card_id || (preCards[n].attack_card && preCards[n].attack_card.id))) || null;
  });
  
  // First phase: move non-attackers (regular riders) — delegated to pure helper
  try {
  // Pass the pre-move snapshot into the engine helper so it sees any
  // planned_card_id/human_planned flags that were just set by the UI.
  const nonAttRes = computeNonAttackerMoves(preCards, currentGroup, groupSpeed, slipstream, track);
    // replace updated cards and collect logs
    for (const [n, r] of Object.entries(nonAttRes.updatedCards)) updatedCards[n] = r;
    for (const entry of nonAttRes.logs || []) addLog(entry);
    // merge groupsNewPositions from helper
    groupsNewPositions.push(...(nonAttRes.groupsNewPositions || []));
    groupsNewPositions.sort((a, b) => b[0] - a[0]);
  } catch (e) {
    // fallback to original logic if helper throws (keeps behaviour stable)
    try { addLog('Error in computeNonAttackerMoves, falling back to inline logic'); } catch (err) {}
  }

    

  // Second phase: move attackers separately (delegated to pure helper)
  try {
    const attRes = computeAttackerMoves(updatedCards, currentGroup, groupSpeed, slipstream, track, Math.random);
    if (attRes && attRes.updatedCards) {
      for (const [n, r] of Object.entries(attRes.updatedCards)) updatedCards[n] = r;
    }
    if (attRes && attRes.logs) for (const entry of attRes.logs) addLog(`[attacker] ${entry}`);
    if (attRes && attRes.groupsNewPositions) {
      groupsNewPositions.push(...attRes.groupsNewPositions);
      groupsNewPositions.sort((a, b) => b[0] - a[0]);
    }
  } catch (e) {
    try { addLog('Error in computeAttackerMoves, falling back to inline attacker logic'); } catch (err) {}
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

  // Enforce Brosten capacity on final positions after post-adjust so the
  // UI confirmMove path mirrors the engine wrapper behaviour. This ensures
  // riders pushed back due to limited capacity remain pushed when the
  // UI updates state and that the user-facing log lines appear last.
  try {
    if (typeof track === 'string' && /\*$/.test(track)) {
      // Delegate to the shared enforcement helper so UI and engine behaviour match
      try {
        const res = enforceBrosten(updatedCards, track, currentGroup, Math.random);
        // updatedCards is mutated in-place by enforceBrosten; append returned logs
        for (const l of (res.logs || [])) addLog(l);
      } catch (e) {
        try { addLog('Brosten enforcement error (UI): ' + (e && e.message)); } catch (err) {}
      }
    }
  } catch (e) {
    try { addLog('Brosten enforcement error: ' + (e && e.message)); } catch (err) {}
  }

  setCards(updatedCards);
  // mark this group as moved this round
  setGroupsMovedThisRound(prev => Array.from(new Set([...(prev || []), currentGroup])));
  // Apply choice-2 penalty: if a team's submission for THIS GROUP was in
  // round 2 and that team's rider ends up leading the group, give that
  // rider an extra penalty card 'kort: 16'. This happens only for choice-2
  // submissions (round === 2).
  try {
    for (const n of names) {
      try {
        const r = updatedCards[n];
        if (!r) continue;
        // leader detection post-move (takes_lead === 1)
        const isLeadNow = Number(r.takes_lead) === 1;
        if (!isLeadNow) continue;
        const teamKey = `${currentGroup}-${r.team}`;
  const meta = (teamPaceMeta && teamPaceMeta[teamKey]) ? teamPaceMeta[teamKey] : null;
  // Only apply the choice-2 lead penalty when the team's round-2
  // submission actually changed the announced speed compared to
  // the stored previous round-1 pace (meta.prevPace). If prevPace
  // is undefined we conservatively do not apply the extra EC.
  const newPace = (teamPaces && typeof teamPaces[teamKey] !== 'undefined') ? teamPaces[teamKey] : undefined;
  const paceChangedInChoice2 = meta && typeof meta.prevPace !== 'undefined' && typeof newPace !== 'undefined' && meta.prevPace !== newPace;
  if (meta && meta.round === 2 && paceChangedInChoice2) {
          // Add the penalty card to discarded so existing post-move diff
          // logic picks it up (confirmMove compares pre/post discarded/cards)
          if (!Array.isArray(updatedCards[n].discarded)) updatedCards[n].discarded = [];
          updatedCards[n].discarded = [...updatedCards[n].discarded, { id: 'kort: 16' }];
          try { addLog(`Penalty applied: ${n} receives kort: 16 for leading after choice-2`); } catch (e) {}
        }
      } catch (e) {}
    }
    // persist any penalty changes
    setCards(updatedCards);
  } catch (e) {}

  addLog(`Group ${currentGroup} moved`);


  // Compute post-move summary and postpone auto-advance until user presses "Move next group"
  try {
    const remainingGroupsAll = Object.values(updatedCards).filter(r => !r.finished).map(r => r.group);
    const remainingGroupsSet = Array.from(new Set(remainingGroupsAll));
    const groupsMovedLocal = Array.from(new Set([...(groupsMovedThisRound || []), currentGroup]));
    const remainingNotMoved = remainingGroupsSet.filter(g => !groupsMovedLocal.includes(g));

    // Build per-rider message objects for the moved group
    const msgs = [];
    for (const n of names) {
      try {
        const newPos = updatedCards[n] ? Number(updatedCards[n].position || 0) : oldPositions[n];
        const team = (cards[n] && cards[n].team) || (updatedCards[n] && updatedCards[n].team) || '';
        const plannedId = plannedCards[n];

        // Determine display label for the card (handle TK extras)
        // Prefer the actual played card id from the post-move updatedCards if available,
        // then fall back to any planned_card_id we had before the move. If neither is
        // available, show '??'. We try to look up the original card object in the
        // pre-move `cards` snapshot so we can show flat/uphill values when possible.
        let displayCard = '??';
        let cardVals = null;
        const playedId = updatedCards[n] && updatedCards[n].played_card;
        const candidates = [playedId, plannedId].filter(Boolean);
        let foundObj = null;
        for (const id of candidates) {
          if (id && cards[n] && Array.isArray(cards[n].cards)) {
            const obj = cards[n].cards.find(c => c && c.id === id) || null;
            if (obj) { foundObj = obj; displayCard = obj.id; cardVals = `${obj.flat}-${obj.uphill}`; break; }
          }
        }
        // If we couldn't find a card object but have an id (played or planned), show the id string
        if (displayCard === '??') {
          if (playedId) displayCard = String(playedId);
          else if (plannedId) displayCard = String(plannedId);
        } else {
          // Normalize displayCard to the numeric short form when possible
          const numMatch = (foundObj && foundObj.id && foundObj.id.match(/\d+/)) ? foundObj.id.match(/\d+/)[0] : null;
          if (numMatch) displayCard = numMatch;
          // If the id looks like a TK/TK-1 style, prefer a 'tk_extra <num>' label
          if (foundObj && /^TK/i.test(foundObj.id)) {
            const tkNum = foundObj.id.match(/\d+/)?.[0] || displayCard;
            displayCard = `tk_extra ${tkNum}`;
          }
        }

        // Determine moved fields — prefer explicit moved_fields, otherwise diff
        const movedFields = updatedCards[n] && typeof updatedCards[n].moved_fields === 'number'
          ? Number(updatedCards[n].moved_fields)
          : Math.max(0, (updatedCards[n] ? Number(updatedCards[n].position || 0) : newPos) - (oldPositions[n] || 0));

        const failed = movedFields < Math.round(groupSpeed || 0);
        const isLead = (cards[n] && cards[n].takes_lead === 1) || (updatedCards[n] && updatedCards[n].takes_lead === 1);

        // Determine how many TK-1 and EC cards were added as a result of the move
        // by comparing pre-move and post-move hand+discard counts. This is robust
        // because the engine inserts 'TK-1: 99' and 'kort: 16' into hands/discards.
        let ecTaken = 0;
        let tkTaken = 0;
        try {
          const pre = cards[n] || { cards: [], discarded: [] };
          const post = updatedCards[n] || { cards: [], discarded: [] };
          const preAll = [...(pre.cards || []), ...(pre.discarded || [])];
          const postAll = [...(post.cards || []), ...(post.discarded || [])];
          const preTK = preAll.filter(c => c && String(c.id) === 'TK-1: 99').length;
          const postTK = postAll.filter(c => c && String(c.id) === 'TK-1: 99').length;
          const preEC = preAll.filter(c => c && String(c.id) === 'kort: 16').length;
          const postEC = postAll.filter(c => c && String(c.id) === 'kort: 16').length;
          tkTaken = Math.max(0, postTK - preTK);
          ecTaken = Math.max(0, postEC - preEC);
        } catch (e) {
          // fallback: legacy leader heuristic
          if (isLead) ecTaken = 1;
        }

        const plainLine = `${n} (${team}) spiller kort: ${displayCard}${cardVals ? ` (${cardVals})` : ''} ${oldPositions[n]}→${newPos}${isLead ? ' (lead)' : ''} ✓`;
        msgs.push({ name: n, team, displayCard, cardVals, oldPos: oldPositions[n], newPos, isLead, failed, plainLine, ecTaken, tkTaken });
        // Also write the plain textual line to the global log so it appears in the Log panel
        addLog(plainLine);
      } catch (e) {
        // ignore per-rider errors
      }
    }

    setPostMoveInfo({ groupMoved: currentGroup, msgs, remainingNotMoved });
  } catch (e) {}

  // After moving this group, compute remaining (non-finished) groups.
  // If any remain that haven't moved this round, continue the round with
  // the highest-numbered remaining-not-yet-moved group. Otherwise, perform
  // group reassignment and sprint detection as usual.
  try {
    const remainingGroupsAll = Object.values(updatedCards).filter(r => !r.finished).map(r => r.group);
    const remainingGroupsSet = Array.from(new Set(remainingGroupsAll));
    // Build a local view of which groups have moved this round. Don't rely on
    // the React state (setGroupsMovedThisRound) being updated synchronously.
    const groupsMovedLocal = Array.from(new Set([...(groupsMovedThisRound || []), currentGroup]));
    const remainingNotMoved = remainingGroupsSet.filter(g => !groupsMovedLocal.includes(g));
    addLog(`Debug groups: all=${remainingGroupsSet.join(',') || 'none'} movedLocal=${groupsMovedLocal.join(',') || 'none'} remainingNotMoved=${remainingNotMoved.join(',') || 'none'}`);

    if (remainingNotMoved.length > 0) {
      const nextGroup = Math.max(...remainingNotMoved);
      // If nextGroup is the same as currentGroup (possible if some riders remained),
      // still set up for the next input phase to avoid a stuck UI.
      setCurrentGroup(nextGroup);
  setTeamPaces({});
  setTeamPaceMeta({});
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      setTeams(shuffled);
      // choose first team that actually has non-attacker riders in the next group
      const firstTeam = findNextTeamWithRiders(0, nextGroup);
      if (firstTeam) setCurrentTeam(firstTeam);
      else setCurrentTeam(shuffled[0]);
      setMovePhase('input');
    } else {
      // No remaining non-finished groups: reassign groups and detect sprints
      setTimeout(() => {
        setCards(prevCards => {
          const sorted = Object.entries(prevCards).sort((a, b) => b[1].position - a[1].position);
          let gNum = 1;
          let curPos = sorted[0][1].position;
          const updatedCards2 = { ...prevCards };

          sorted.forEach(([n, r]) => {
            if (r.position < curPos) {
              gNum++;
              curPos = r.position;
            }
            updatedCards2[n] = { ...updatedCards2[n], group: gNum };
          });

          // Detect sprint groups now that groups have been reassigned
          try {
            const detected = detectSprintGroups(updatedCards2, track);
            if (detected && detected.length > 0) {
              setSprintGroupsPending(detected);
              addLog(`Detected sprint groups after reassignment: ${detected.join(', ')}`);
            } else {
              setSprintGroupsPending([]);
            }
          } catch (e) {
            // ignore detection errors
          }

          return updatedCards2;
        });
        setMovePhase('roundComplete');
        addLog('All groups moved. Groups reassigned');
      }, 100);
    }
  } catch (e) {
    // On any error fallback to the previous sequential behavior
    if (currentGroup > 1) {
      setCurrentGroup(p => p - 1);
  setTeamPaces({});
  setTeamPaceMeta({});
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      setTeams(shuffled);
      setCurrentTeam(shuffled[0]);
      setMovePhase('input');
    } else {
      setTimeout(() => {
        setCards(prev => prev);
        setMovePhase('roundComplete');
        addLog('All groups moved. Groups reassigned');
      }, 100);
    }
  }
};

// Called by the UI after a move has been confirmed and the post-move
// summary is displayed. Advances to the next not-yet-moved group, or
// if none remain, starts the next round.
const moveToNextGroup = () => {
  if (!postMoveInfo) return;
  const remaining = postMoveInfo.remainingNotMoved || [];
  if (remaining.length > 0) {
    const nextGroup = Math.max(...remaining);
    setCurrentGroup(nextGroup);
  setTeamPaces({});
  setTeamPaceMeta({});
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    setTeams(shuffled);
    setCurrentTeam(shuffled[0]);
    setMovePhase('input');
    setPostMoveInfo(null);
  } else {
    // No remaining groups -> start new round
    setPostMoveInfo(null);
    startNewRound();
  }
};

  const startNewRound = () => {
  console.log('=== START NEW ROUND ===');
  console.log('Current cards:', cards);
  // Clear the post-move yellow panel when the user starts a new round
  // so the played-cards summary is not left visible between rounds.
  setPostMoveInfo(null);
  
  const maxGroup = Math.max(...Object.values(cards).filter(r => !r.finished).map(r => r.group));
  const newRound = round + 1;
  
  console.log('Max group:', maxGroup);
  console.log('New round:', newRound);
  
  setRound(newRound);
  setCurrentGroup(maxGroup);
  setTeamPaces({});
  setTeamPaceMeta({});
  // Compute deterministic team order for this round based on base order
  const base = teamBaseOrder && teamBaseOrder.length === teams.length ? teamBaseOrder : [...teams];
  let order = [...base];
  // For even rounds (round % 2 === 0) we rotate clockwise by (round/2) steps
  // For odd rounds we take the reverse of the previous order after rotation
  const half = Math.floor(newRound / 2);
  const rotate = (arr, k) => arr.slice(k % arr.length).concat(arr.slice(0, k % arr.length));
  if (newRound % 2 === 0) {
    order = rotate(base, half);
  } else {
    // reverse the previous rotation
    const prev = rotate(base, half);
    order = [...prev].reverse();
  }
  setTeams(order);
  // pick first team that has riders in the leading group to avoid starting with an empty team
  const firstTeamForRound = findNextTeamWithRiders(0, maxGroup);
  if (firstTeamForRound) setCurrentTeam(firstTeamForRound);
  else setCurrentTeam(order[0]);
  setMovePhase('input');
  // Clear groups moved tracker for the new round
  setGroupsMovedThisRound([]);
  
  console.log('Computed team order for round:', order);
  console.log('Current team set to:', order[0]);
  
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
const names = Object.entries(updatedCards).filter(([, r]) => r.group === maxGroup && !r.finished).map(([n]) => n);
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
  // Brosten special: roll a 1-6 die on new round and possibly cause a puncture
  try {
    // Do not auto-roll here. For Brosten tracks the UI provides an explicit
    // "Check if crash" button which the user must press. Clear any
    // previous dice state so the new round starts clean.
    setDiceEvent(null);
    setDiceMsg(null);
  } catch (e) {
    // ignore dice errors
  }
  console.log('=== END NEW ROUND ===');
  // Compute and store time gaps per group so they only update once per new round
  const gaps = {};
  const overallMaxPos = Math.max(...Object.values(updatedCards).map(r => r.position));
  const groups = Array.from(new Set(Object.values(updatedCards).map(r => r.group)));
  for (const g of groups) {
  const groupPos = Math.max(...Object.values(updatedCards).filter(r => r.group === g && !r.finished).map(r => r.position));
    let timeGap = 13 * (overallMaxPos - groupPos);
    if (timeGap !== 0) {
      const jitter = Math.floor(Math.random() * 11) - 5;
      timeGap = Math.max(0, timeGap + jitter);
    }
    gaps[g] = timeGap;
  }
  setGroupTimeGaps(gaps);
  // reset sprint results/time for the new round
  setSprintResults([]);
  setLatestPrelTime(0);
};

// Check crash handler: called by the UI when user presses "Check if crash"
const checkCrash = () => {
  try {
    const selectedTrackStr = (typeof track === 'string' && track && track.length > 0)
      ? track
      : (tracks && tracks[trackName] ? tracks[trackName] : '');
    const isBrostenTrack = typeof selectedTrackStr === 'string' && /\*$/.test(selectedTrackStr);
    if (!isBrostenTrack) return;
    const roll = Math.floor(Math.random() * 6) + 1;
    addLog(`Brosten die roll: ${roll}`);
    setDiceMsg(`Rolled: ${roll}`);
    if (roll === 1 || roll === 2) {
      // move a random non-finished rider back 3 fields
      const updatedCards = { ...cards };
      const candidates = Object.entries(updatedCards).filter(([, r]) => !r.finished).map(([n]) => n);
      if (candidates.length > 0) {
        const idx = Math.floor(Math.random() * candidates.length);
        const who = candidates[idx];
        const oldPos = Number(updatedCards[who].position || 0);
        const newPos = Math.max(0, oldPos - 3);
        updatedCards[who] = { ...updatedCards[who], position: newPos };
        updatedCards[who].moved_fields = newPos - (updatedCards[who].old_position || oldPos);
        const kind = roll === 1 ? 'puncture' : 'crash';
        const capital = roll === 1 ? 'Puncture' : 'Crash';
        const msg = `${who} gets a ${kind} and moves from field ${oldPos} to ${newPos}`;
        addLog(msg);
        setDiceMsg(`${capital}: ${who} ${oldPos}→${newPos}`);
        setDiceEvent({ who, kind, oldPos, newPos });
        // Reassign groups immediately
        try {
          const sorted = Object.entries(updatedCards).sort((a, b) => b[1].position - a[1].position);
          let gNum = 1;
          let curPos = sorted.length > 0 ? sorted[0][1].position : 0;
          for (const [n, r] of sorted) {
            if (r.position < curPos) {
              gNum++;
              curPos = r.position;
            }
            updatedCards[n] = { ...updatedCards[n], group: gNum };
          }
        } catch (e) {}
      }
      setCards(updatedCards);
    } else {
      setDiceEvent({ who: null, kind: 'none', roll });
      // Show exact text requested by user when there is no crash
      setDiceMsg('no crash');
    }
  } catch (e) {}
};

  const runSprints = async (trackStr, sprintGroup = null) => {
    // Run the pure sprint logic to compute results, but present an animated
    // sequence in the UI: show riders' sprint stats, then sequentially "sprint"
    // the lowest->highest sprinter with delays to make it more exciting.
    try {
  const res = runSprintsPure(cards, trackStr, sprintGroup, round, sprintResults, latestPrelTime);
  // Debug: indicate pure runner returned and wipe previous animation messages
  try { addLog(`runSprints: pure runner returned (result.riders=${Object.keys(res.updatedCards || {}).length})`); } catch (e) {}
  // Wipe the animation box when a new group sprints and show initial Preparing message
  setSprintAnimMsgs(['Preparing sprint...']);

  // Collect riders in this sprint group and their computed sprint stats
  const updated = res.updatedCards || {};
      const groupRiders = Object.entries(updated).filter(([, r]) => r.group === sprintGroup && !r.finished);
      // Build stats array from the pure-runner's updated cards
      let stats = groupRiders.map(([name, r]) => ({
        name,
        sprint_points: Math.round(r.sprint_points || 0),
        sprint_stat: (typeof r.sprint === 'number') ? r.sprint : 0,
        tk_penalty: (typeof r.tk_penalty === 'number') ? r.tk_penalty : 0
      }));

      // If the pure runner returned no stats for this group, fall back to
      // computing a lightweight stats array from the current `cards` state so
      // the UI animation still shows something useful.
      if (stats.length === 0) {
        try { addLog('runSprints: pure runner returned no stats, attempting fallback from cards'); } catch (e) {}
        const fallbackGroup = Object.entries(cards).filter(([, r]) => r.group === sprintGroup && !r.finished);
        const fallbackStats = fallbackGroup.map(([name, r]) => ({
          name,
          // Prefer explicit sprint_points if present, otherwise approximate from r.sprint
          sprint_points: Math.round((typeof r.sprint_points === 'number') ? r.sprint_points : (typeof r.sprint === 'number' ? r.sprint : 0)),
          sprint_stat: (typeof r.sprint === 'number') ? r.sprint : 0,
          tk_penalty: (typeof r.tk_penalty === 'number') ? r.tk_penalty : 0
        }));

        if (fallbackStats.length > 0) {
          stats = fallbackStats;
          try { addLog(`runSprints: using fallback stats from cards, count=${stats.length}`); } catch (e) {}
          // Reset animation messages to the initial state before we animate
          setSprintAnimMsgs(['Preparing sprint...']);
        }
      }

      if (stats.length > 0) {
        // Clear any previous animation messages (keep the initial 'Preparing sprint...' briefly)
        setSprintAnimMsgs(['Preparing sprint...']);
        try { addLog(`runSprints: stats count=${stats.length}`); } catch (e) {}
        // Helper: try to find an exact sprint log line for a rider from res.logs
        const findLogLine = (name) => {
          try {
            if (!res.logs || res.logs.length === 0) return null;
            // Find first log entry that contains the rider name and 'sprint points'
            const entry = res.logs.find(l => l && l.includes(name) && l.includes('sprint points'));
            if (!entry) return null;
            // Strip any leading numeric placement like '7. ' to match previous UI format
            const m = entry.match(/^\s*\d+\.\s*(.*)$/);
            return m ? m[1] : entry;
          } catch (e) { return null; }
        };

        // 2) Sprint each rider starting from the lowest sprint_points (worst sprinter)
        const asc = stats.slice().sort((a,b) => a.sprint_points - b.sprint_points);
        for (const s of asc) {
          const logLine = findLogLine(s.name);
          const msg = logLine ? `Sprint: ${logLine}` : `Sprint: ${s.name} - ${s.sprint_points} sprint points (Sprint stat: ${s.sprint_stat} TK_penalty: ${s.tk_penalty})`;
          setSprintAnimMsgs(prev => [...prev, msg]);
          try { addLog(`runSprints: animated sprint for ${s.name}`); } catch (e) {}
          // Wait 3 seconds between each message to emphasize the animation
          await new Promise(r => setTimeout(r, 3000));
        }
      }
      else {
        try { addLog('runSprints: no sprint stats found for group'); } catch (e) {}
        setSprintAnimMsgs(prev => [...prev, 'No sprintable riders found.']);
      }

      // After animation, apply the computed results to state and global logs
      setCards(res.updatedCards);
      setSprintResults(res.result);
      setLatestPrelTime(res.latestPt);
      for (const l of res.logs || []) addLog(l);

      // Remove the sprintGroup we just ran from the pending list so the
      // UI no longer shows the "Sprint with group X" button.
      // If sprintGroup is null we ran all detected groups -> clear all pending.
      setSprintGroupsPending(prev => {
        try {
          if (sprintGroup === null) return [];
          return (prev || []).filter(g => g !== sprintGroup);
        } catch (e) {
          return [];
        }
      });

      return res;
    } catch (e) {
      addLog('runSprintsPure failed: ' + (e && e.message));
    }
  };

  const HumanTurnInterface = ({ groupNum, riders, onSubmit }) => {
  const ridersCount = Array.isArray(riders) ? riders.length : 0;
  const canAttack = ridersCount >= 3;
  const [teamChoice, setTeamChoice] = useState(null); // 'attack', 'pace', 'follow'
  const [paceValue, setPaceValue] = useState(null); // 2-8
  const [attackingRider, setAttackingRider] = useState(null); // rider name
  const [attackCard, setAttackCard] = useState(null); // card object
  const [paceLeader, setPaceLeader] = useState(null); // chosen leader when pacing
  
  // Compute playable pace values for a given rider name and rider object.
  // Returns an array of integers (descending) from highest playable down to 2.
  const computePlayablePaces = (name, rider) => {
    if (!rider) return [];
    const top4 = rider.cards.slice(0, Math.min(4, rider.cards.length));
  const penalty = getPenalty(name, cards) || 0; // global/local penalty from top-4 TK-1
    const possible = new Set();

    // Try speeds from 8 down to 2 and test whether the rider can play a card that
    // equals the target after applying penalty and using the correct flat/uphill
    // value depending on sv for that speed.
    for (let s = 8; s >= 2; s--) {
      const sv = getSlipstreamValue(rider.position, rider.position + Math.floor(s), track);
      for (const c of top4) {
        if (!c || !c.id) continue;
        const cv = sv > 2 ? c.flat : c.uphill;
        const effective = cv - penalty;
        if (effective === s) {
          possible.add(s);
          break; // one matching card is enough
        }
      }
    }

    // Return as sorted array descending
    return Array.from(possible).sort((a,b) => b - a);
  };
  // Return true if the given rider (top-4) can play the specific pace value
  const canRiderPlayValue = (name, rider, pace) => {
    if (!rider) return false;
    const top4 = rider.cards.slice(0, Math.min(4, rider.cards.length));
  const penalty = getPenalty(name, cards) || 0;
    const sv = getSlipstreamValue(rider.position, rider.position + Math.floor(pace), track);
    for (const c of top4) {
      if (!c || !c.id) continue;
      const cv = sv > 2 ? c.flat : c.uphill;
      if ((cv - penalty) === pace) return true;
    }
    return false;
  };
  const handleTeamChoice = (type, value = null) => {
    // For 'pace' we don't set a pace value immediately; pace options depend on chosen leader
    setTeamChoice(type);
    setPaceValue(type === 'pace' ? null : value);
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
      // If user already chose a pace value, require a leader to be selected from
      // the riders who can play that value. If no pace value chosen (user will
      // pick leader first), require both leader and a chosen pace.
      if (paceValue) return paceLeader !== null;
      return paceLeader !== null && paceValue !== null;
    }
    return true;
  };

  const handleSubmit = () => {
    const result = {
      type: teamChoice,
      value: teamChoice === 'pace' ? (paceValue || 2) : paceValue,
      attacker: attackingRider,
      card: attackCard,
      paceLeader
    };
    onSubmit(result);
  };

  return (
    <div className="bg-blue-50 p-3 rounded border-2 border-blue-500">
      <h4 className="font-bold mb-3">Your Team's Turn</h4>
      {/* Choice-2 banner: show when the group is in round 2 (choice-2 open) */}
      {(() => {
        try {
          const currentRound = (teamPaceRound && teamPaceRound[groupNum]) ? teamPaceRound[groupNum] : 1;
          if (currentRound === 2) {
            const paceKey = `${groupNum}-Me`;
            const meta = teamPaceMeta && teamPaceMeta[paceKey];
            return (
              <div className="mb-3 p-2 rounded bg-yellow-100 border border-yellow-300">
                <div className="font-medium text-yellow-800">Choice-2 open for this group</div>
                <div className="text-xs text-yellow-700">An attack was declared — all teams may revise their choice. Your previous choice will be replaced when you submit.</div>
                {meta && meta.round === 1 && (
                  <div className="text-xs text-gray-700 mt-1">You previously submitted in round 1: {teamPaces[paceKey] || 0} {meta.isAttack ? "(attack)" : ''}</div>
                )}
              </div>
            );
          }
        } catch (e) {}
        return null;
      })()}
      
      {/* Team choice buttons */}
      <div className="mb-4 p-3 bg-white rounded border">
        <p className="text-sm font-semibold mb-2">Choose team action:</p>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => { if (canAttack) handleTeamChoice('attack'); }}
            disabled={!canAttack}
            title={!canAttack ? 'Angreb kræver mindst 3 ryttere i gruppen' : ''}
            className={`px-3 py-2 text-sm rounded ${
              teamChoice === 'attack'
                ? 'bg-red-600 text-white font-bold'
                : (!canAttack ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-red-200 hover:bg-red-300')
            }`}
          >
            Angreb
          </button>
          
          {[8,7,6,5,4,3,2].map(pace => {
            // If a leader is chosen, compute playable set for that leader; otherwise
            // enable the value if any rider in the human team can play it.
            let disabled = false;
            if (paceLeader) {
              const riderObj = riders.find(([n]) => n === paceLeader)[1];
              const playable = computePlayablePaces(paceLeader, riderObj) || [];
              const playableSet = new Set(playable);
              if (playable.length > 0 && !playableSet.has(pace)) disabled = true;
            } else {
              // No leader chosen: enable only if at least one rider can play this pace
              const anyCan = riders.some(([n, r]) => canRiderPlayValue(n, r, pace));
              if (!anyCan) disabled = true;
            }

            return (
              <button
                key={pace}
                onClick={() => { setTeamChoice('pace'); setPaceValue(pace); setPaceLeader(null); }}
                disabled={disabled}
                className={`px-3 py-2 text-sm rounded ${
                  teamChoice === 'pace' && paceValue === pace
                    ? 'bg-green-600 text-white font-bold'
                    : disabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-200 hover:bg-green-300'
                }`}
              >
                {pace}
              </button>
            );
          })}
          
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
                onClick={() => {
                  // When selecting a leader, ensure chosen pace still valid; otherwise clear
                  setPaceLeader(name);
                  if (paceValue) {
                    const riderObj = riders.find(([n]) => n === name)[1];
                    const playable = computePlayablePaces(name, riderObj) || [];
                    if (playable.length > 0 && !playable.includes(paceValue)) setPaceValue(null);
                  }
                }}
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
          <div className="mt-3 p-2 bg-white rounded border">
            {paceValue ? (
              <>
                <p className="text-sm font-semibold mb-2">Ryttere der kan spille {paceValue}:</p>
                <div className="space-y-2">
                  {riders.filter(([n, r]) => canRiderPlayValue(n, r, paceValue)).map(([n]) => (
                    <button key={n} onClick={() => setPaceLeader(n)} className={`w-full px-3 py-2 text-sm rounded text-left ${paceLeader === n ? 'bg-green-600 text-white font-bold' : 'bg-white hover:bg-green-100 border'}`}>
                      {n}
                    </button>
                  ))}
                  {riders.filter(([n, r]) => canRiderPlayValue(n, r, paceValue)).length === 0 && (
                    <div className="text-xs text-gray-500">Ingen ryttere kan spille {paceValue} med top-4 — vælg en anden værdi eller leader (fallback til 2 ved submit).</div>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold mb-2">Vælg rytter der tager føring (valgfrit - kan vælges senere):</p>
                <div className="space-y-2">
                  {riders.map(([name]) => (
                    <button
                      key={name}
                      onClick={() => {
                        setPaceLeader(name);
                        if (paceValue) {
                          const riderObj = riders.find(([n]) => n === name)[1];
                          const playable = computePlayablePaces(name, riderObj) || [];
                          if (playable.length > 0 && !playable.includes(paceValue)) setPaceValue(null);
                        }
                      }}
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
              </>
            )}
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
              {rider.cards.slice(0, 4).map((card, i) => {
                const num = card.id.match(/\d+/)?.[0] || '?';
                return (
                <div key={i} className="bg-gray-100 p-1 rounded text-center text-xs">
                  <div className="font-semibold lowercase">kort {num}: {card.flat}|{card.uphill}</div>
                </div>
                );
              })}
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

  // --- Card selection UI for human riders when moving a group ---
  const [cardSelectionOpen, setCardSelectionOpen] = useState(false);
  const [cardSelections, setCardSelections] = useState({}); // { riderName: cardId }
  const [fallBackOpen, setFallBackOpen] = useState(false);
  const [fallRider, setFallRider] = useState(null);
  const [fallTargetGroup, setFallTargetGroup] = useState(null);

  const openCardSelectionForGroup = (groupNum) => {
    // find human riders in the group
    const humanRiders = Object.entries(cards).filter(([, r]) => r.group === groupNum && r.team === 'Me' && !r.finished).map(([n]) => n);
    if (!humanRiders || humanRiders.length === 0) {
      // nothing to do
      confirmMove();
      return;
    }
    // Prepare default selections (choose first top-4 or null)
    const initial = {};
    // Pre-select a valid card for leaders (must match the group's speed) or
    // fallback to first top-4 for non-leaders.
    humanRiders.forEach(name => {
      const rider = cards[name] || { cards: [] };
      const top4 = (rider.cards || []).slice(0, Math.min(4, rider.cards.length));
      const isLeader = (rider.takes_lead || 0) === 1;
      if (isLeader) {
        const svForLead = getSlipstreamValue(rider.position, rider.position + Math.floor(groupSpeed || 0), track);
        const localPenalty = top4.slice(0,4).some(tc => tc && tc.id === 'TK-1: 99') ? 1 : 0;
        const targetVal = Math.round(groupSpeed || 0);
        // prefer exact match, otherwise pick smallest card >= targetVal
        let best = null;
        let bestExcess = Infinity;
        for (const c of top4) {
          const cardVal = svForLead > 2 ? c.flat : c.uphill;
          const eff = (cardVal - localPenalty);
          if (eff === targetVal) { best = c; bestExcess = 0; break; }
          if (eff >= targetVal) {
            const excess = eff - targetVal;
            if (excess < bestExcess) { best = c; bestExcess = excess; }
          }
        }
        initial[name] = best ? best.id : null;
      } else {
        initial[name] = top4.length > 0 ? top4[0].id : null;
      }
    });
    setCardSelections(initial);
    setCardSelectionOpen(true);
  };

  const handleCardChoice = (riderName, cardId) => {
    setCardSelections(prev => ({ ...prev, [riderName]: cardId }));
  };

  const submitCardSelections = () => {
    // Apply selections into a fresh cards object and then call confirmMove after state update
    const updated = JSON.parse(JSON.stringify(cards || {}));
    for (const [riderName, cardId] of Object.entries(cardSelections || {})) {
      if (!updated[riderName]) continue;
      if (cardId === 'tk_extra 15') {
        // inject a special tk_extra card at the front so the engine can find it
        const existing = updated[riderName].cards || [];
        const synthetic = { id: 'tk_extra 15', flat: 15, uphill: 15 };
        updated[riderName].cards = [synthetic, ...existing];
        updated[riderName].planned_card_id = 'tk_extra 15';
      } else if (typeof cardId === 'string') {
        // set planned_card_id to the chosen id (should exist in hand)
        updated[riderName].planned_card_id = cardId;
        // Mark that this was a human-chosen card so the engine should honor it
        // even if it doesn't exactly match the group's computed speed.
        updated[riderName].human_planned = true;
      }
    }
    // Close modal and set cards; then call confirmMove after a short delay so state is in sync
    setCardSelectionOpen(false);
    setCards(updated);
    // Call confirmMove with the updated snapshot to avoid a race where
    // React hasn't yet flushed `cards` to state when the engine reads it.
    confirmMove(updated);
  };

  const confirmFallBack = () => {
    if (!fallRider || fallTargetGroup === null) return;
    const targetG = Number(fallTargetGroup);
    const riderObj = cards[fallRider];
    if (!riderObj) return;
    // Only allow falling to a group strictly behind (higher group number)
    if (!(targetG > (riderObj.group || 0))) {
      addLog(`Invalid fall-back: ${fallRider} cannot fall to group ${targetG} (not behind)`);
      setFallBackOpen(false);
      setFallRider(null);
      setFallTargetGroup(null);
      return;
    }

    setCards(prev => {
      const updated = { ...prev };
      if (!updated[fallRider]) return prev;
      // Determine the furthest forward position of the target group (max position)
      const positions = Object.values(prev).filter(r => r.group === targetG && !r.finished).map(r => Number(r.position || 0));
      const targetPos = positions.length > 0 ? Math.max(...positions) : 0;
      updated[fallRider] = { ...updated[fallRider], group: targetG, position: targetPos };
      return updated;
    });
    addLog(`Action: ${fallRider} fell back to group ${fallTargetGroup}`);
    setFallBackOpen(false);
    setFallRider(null);
    setFallTargetGroup(null);
    // clear any dice event once the user has applied the fall-back choice
    try { setDiceEvent(null); setDiceMsg(null); } catch (e) {}
  };

  // Group UI removed per user request.

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            {gameState === 'playing' ? (
              <>
                <h1 className="text-3xl font-bold">{trackName}</h1>
                <div className="text-[11px] text-gray-600 mt-1">Level {level}</div>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold">CYCL 1.1.</h1>
                <div className="text-[11px] text-gray-800 mt-1 font-medium">Nu kan man selv vælge hvilket kort man spiller</div>
                <div className="text-[11px] text-gray-600 mt-1 leading-tight">
                  <div>Man har mulighed for at lave om efter angreb. Det koster en TK.</div>
                  <div>Up next Alle de ting du rapporterede.</div>
                </div>
              </>
            )}
          </div>
          <div>
            <button onClick={() => setShowEngineUI(s => !s)} className="py-2 px-3 bg-indigo-600 text-white rounded">
              {showEngineUI ? 'Hide Engine UI' : 'Show Engine UI'}
            </button>
          </div>
        </div>
        {showEngineUI && (
          <div className="mb-6">
            <EngineUI />
          </div>
        )}
        
        {gameState === 'setup' && (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">Track</label>
                <select value={trackName} onChange={(e) => setTrackName(e.target.value)} className="w-full px-2 py-1 border rounded">
                  {Object.keys(tracks).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {/* Track preview: show color-coded fields for the selected track (up to the first F). */}
              <div className="mt-3 bg-white p-3 rounded border">
                <div className="text-sm font-semibold mb-2">Track preview</div>
                  {(() => {
                  const raw = getResolvedTrack() || '';
                  const selected = raw ? raw.slice(0, (raw.indexOf('F') === -1 ? raw.length : raw.indexOf('F') + 1)) : '';
                  const chars = (selected || '').split('');
                  return (
                    <div className="overflow-x-auto">
                      <div className="flex items-center">
                        {chars.map((t, i) => {
                          if (t === '2') {
                            // gradient from gray to red
                            return (
                              <div key={i} className="min-w-[4px] h-4 mr-0.5 bg-gradient-to-r from-gray-400 to-red-500" title={`${i+1}: ${t}`} />
                            );
                          }
                          const cls = (() => {
                            switch (t) {
                              case '3': return 'bg-gray-400';
                              case '1': return 'bg-red-500';
                              case '0': return 'bg-pink-300';
                              case 'F': return 'bg-yellow-400';
                              case '_': return 'bg-blue-200';
                              default: return 'bg-gray-300';
                            }
                          })();
                          return <div key={i} className={`${cls} min-w-[4px] h-4 mr-0.5`} title={`${i+1}: ${t}`} />;
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Teams</label>
                <div className="grid grid-cols-4 gap-2">
                  {[2,3,4,5].map(n => (
                    <button key={n} onClick={() => setNumberOfTeams(n)} className={`py-4 rounded text-lg font-semibold ${numberOfTeams===n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spacer so main content is not hidden behind the fixed sticky track footer */}
              <div style={{ height: '6.25rem' }} />

              <div>
                <label className="block text-sm font-medium mb-2">Riders / Team</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2,3,4].map(n => (
                    <button key={n} onClick={() => setRidersPerTeam(n)} className={`py-4 rounded text-lg font-semibold ${ridersPerTeam===n ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded border">
                <label className="block text-sm font-medium mb-2">Level</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="w-12 text-right font-bold">{level}</div>
                </div>
                
              </div>
              {/* Spacer so mobile users can scroll the level slider above the fixed footer */}
              <div className="h-28 sm:h-32" />
            </div>
          </div>
        )}
        {gameState === 'setup' && (
          <div className="fixed left-0 right-0 bottom-0 p-4 bg-white border-t shadow-lg">
            <div className="max-w-7xl mx-auto px-4">
              <button onClick={startDraft} className="w-full bg-blue-600 text-white py-4 rounded-lg text-xl font-bold flex items-center justify-center gap-3">
                <Play size={20}/> Start Game
              </button>
            </div>
          </div>
        )}

        {gameState === 'draft' && (
          // On mobile we align modal to the top and allow inner scrolling so
          // long content (pool + selections) is reachable. On larger screens
          // keep centered behaviour.
          <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto z-50" style={{ position: 'relative' }}>
              {/* Track title + coloured track preview above the draft header */}
              <div className="mb-3">
                <div className="text-2xl font-extrabold mb-2">{trackName}</div>
                <div className="text-sm overflow-x-auto p-2 bg-gray-50 rounded font-mono mb-2">
                  {colourTrackTokens(track).map((t, i) => (
                    <span key={i} className={t.className}>{t.char}</span>
                  ))}
                </div>
              </div>

              <h2 className="text-xl font-bold mb-2">Draft Riders</h2>
              <p className="text-sm text-gray-600 mb-2">Teams: {numberOfTeams} × Riders/Team: {ridersPerTeam} =&nbsp;<strong>{numberOfTeams * ridersPerTeam}</strong> riders total</p>
              {(() => {
                try {
                  const humanPositions = computeHumanPickPositions(ridersPerTeam, numberOfTeams, level) || [];
                  if (humanPositions && humanPositions.length > 0) {
                    return (
                      <div>
                        <div className="text-sm text-gray-700 mb-2">Your picks: <strong>{humanPositions.join(', ')}</strong></div>
                        {/* Debug panel: shows pool/sequence info to diagnose mismatches */}
                        <div className="text-xs text-gray-500 mb-2 bg-gray-50 p-2 rounded">
                          <div>Pool total (draftPool.length): <strong>{Array.isArray(draftPool) ? draftPool.length : 0}</strong></div>
                          <div>Remaining (draftRemaining.length): <strong>{Array.isArray(draftRemaining) ? draftRemaining.length : 0}</strong></div>
                          <div>draftTotalPicks: <strong>{draftTotalPicks || 'n/a'}</strong></div>
                          <div>humanPositions: <strong>{humanPositions.join(', ')}</strong></div>
                          <div>draftPickSequence: <strong>{draftPickSequence ? draftPickSequence.join(', ') : 'n/a'}</strong></div>
                        </div>
                      </div>
                    );
                  }
                } catch (e) {}
                return null;
              })()}
              <div className="mb-3 text-sm">
                {isDrafting ? (
                  (() => {
                    // Use the authoritative next-team calculation so the UI
                    // remains consistent with the draft engine (avoids stale
                    // draftCurrentPickIdx problems).
                    const teamPicking = getNextDraftTeam(draftSelections, draftTeamsOrder) || (draftTeamsOrder.length > 0 ? draftTeamsOrder[draftCurrentPickIdx % draftTeamsOrder.length] : '-');
                    const displayRound = draftRoundNum || (draftTeamsOrder && draftTeamsOrder.length > 0 ? Math.floor(draftSelections.length / draftTeamsOrder.length) + 1 : 1);
                    return (<div>Picking: <strong>{teamPicking}</strong> (Round {displayRound})</div>);
                  })()
                ) : (
                  <div className="text-gray-500">Draft not active</div>
                )}
              </div>

              <div className="max-h-[48vh] sm:max-h-72 overflow-y-auto mb-4 grid grid-cols-2 gap-2">
                {draftPool.map((r, i) => {
                  // Authoritative next team for current pick (may consult draftPickSequence)
                  const currentPickingTeam = getNextDraftTeam(draftSelections, draftTeamsOrder);
                  // Only allow clicking when: drafting active, it's Me's turn, and
                  // the rider is still present in the live remaining list.
                  const inRemaining = Array.isArray(draftRemaining) && draftRemaining.some(rr => rr.NAVN === r.NAVN);
                  const isClickable = isDrafting && currentPickingTeam === 'Me' && inRemaining;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!isClickable}
                      onClick={(e) => {
                        e.stopPropagation();
                        // If a recent touch event already handled this tap, ignore click
                        const last = lastTouchHandledRef.current[r && r.NAVN];
                        if (last && Date.now() - last < 700) {
                          // ignore synthetic click after touch
                          return;
                        }
                        const msg = `pool click ${r && r.NAVN} isClickable=${isClickable}`;
                        console.debug(msg);
                        setDraftDebugMsg(msg);
                        if (isClickable) handleHumanPick(r);
                        setTimeout(() => setDraftDebugMsg(null), 2000);
                      }}
                      // Touch handling: register start, track move, and only treat as
                      // a tap on touchend when there was no significant movement.
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        const t = e.touches && e.touches[0];
                        if (!t) return;
                        touchInfoRef.current[r && r.NAVN] = { x: t.clientX, y: t.clientY, time: Date.now(), moved: false };
                      }}
                      onTouchMove={(e) => {
                        const t = e.touches && e.touches[0];
                        if (!t) return;
                        const info = touchInfoRef.current[r && r.NAVN];
                        if (!info) return;
                        const dx = Math.abs(t.clientX - info.x);
                        const dy = Math.abs(t.clientY - info.y);
                        // treat small jitter as no-move; threshold 8px
                        if (dx > 8 || dy > 8) info.moved = true;
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        const info = touchInfoRef.current[r && r.NAVN];
                        if (!info) return;
                        const duration = Date.now() - info.time;
                        const moved = info.moved;
                        // cleanup
                        delete touchInfoRef.current[r && r.NAVN];
                        if (!moved && duration < 500 && isClickable) {
                          // treat as tap
                          lastTouchHandledRef.current[r && r.NAVN] = Date.now();
                          const msg = `pool tap ${r && r.NAVN} isClickable=${isClickable}`;
                          console.debug(msg);
                          setDraftDebugMsg(msg);
                          handleHumanPick(r);
                          setTimeout(() => setDraftDebugMsg(null), 2000);
                        } else {
                          // likely a scroll gesture — ignore
                          const msg = `scroll ignored ${r && r.NAVN}`;
                          setDraftDebugMsg(msg);
                          setTimeout(() => setDraftDebugMsg(null), 800);
                        }
                      }}
                      className={`w-full text-left p-2 rounded border ${isClickable ? 'bg-white hover:bg-blue-50 cursor-pointer' : 'bg-gray-50 opacity-60 cursor-not-allowed'}`}
                      style={{ zIndex: 60, pointerEvents: 'auto' }}
                    >
                      <div className="font-semibold">{r.NAVN}{!inRemaining && <span className="ml-2 text-xs text-gray-500">(taken)</span>}</div>
                      {(() => {
                        const { modifiedBJERG, label } = computeModifiedBJERG(r, track);
                        return (<div className="text-xs text-gray-500">FLAD: {r.FLAD} {label}: {modifiedBJERG} SPRINT: {r.SPRINT}</div>);
                      })()}
                    </button>
                  );
                })}

                {/* Small on-screen debug toast for mobile where console is hard to access */}
                {draftDebugMsg && (
                  <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 rounded text-xs z-[9999]">
                    {draftDebugMsg}
                  </div>
                )}

              </div>

                <div className="mb-4">
                <div className="text-sm font-semibold mb-2">Selections so far</div>
                <div className="grid grid-cols-2 gap-2 max-h-[28vh] sm:max-h-32 overflow-y-auto">
                  {(() => {
                    // Build team list for display (use draftTeamsOrder when available)
                    const teamsForDisplay = (draftTeamsOrder && draftTeamsOrder.length > 0) ? draftTeamsOrder : (() => {
                      const arr = [];
                      for (let i = 1; i < numberOfTeams; i++) arr.push(`Comp${i}`);
                      arr.push('Me');
                      return arr;
                    })();

                    return teamsForDisplay.map((t) => {
                      const picks = draftSelections.filter(s => s.team === t).map(s => s.rider && s.rider.NAVN).filter(Boolean);
                      return (
                        <div key={t} className="p-2 bg-gray-50 rounded border text-sm">
                          <div className="font-semibold">{t}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {picks.length > 0 ? picks.join(', ') : <span className="text-gray-400">(no picks yet)</span>}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => { setGameState('setup'); setIsDrafting(false); }} className="px-4 py-2 rounded border">Back</button>
                <button onClick={confirmDraftAndStart} className="px-4 py-2 rounded bg-green-600 text-white">Confirm & Start</button>
              </div>
            </div>
          </div>
        )}
        
        {gameState === 'playing' && (
          // Render main game area first, and place the Status section below
          <div className="grid grid-cols-1 gap-4">
            <div>

              {/* Group chooser summary section (under the track) */}
              <div className="bg-white rounded-lg shadow p-3 mb-3">
                  <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-extrabold">Group {currentGroup} moves.</div>
                    <div className="text-sm text-gray-700 mt-1">{currentTeam}'s turn to choose</div>
                    {/* Small, normal-font list of riders in the current group */}
                    <div className="text-sm text-gray-700 mt-1">
                      {(() => {
                        try {
                          const names = Object.entries(cards)
                            .filter(([, r]) => r.group === currentGroup && !r.finished)
                            .map(([n]) => n);
                          return names.length > 0 ? names.join(', ') : <span className="text-gray-400">(no riders)</span>;
                        } catch (e) { return null; }
                      })()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">Phase: {movePhase}</div>
                </div>

                {/* Current chosen values for the group */}
                {(() => {
                  return (
                    <div className="mt-3">
                      <div className="text-sm font-semibold mb-2">Current chosen values</div>
                      <div className="grid grid-cols-3 gap-2">
                        {(teams || []).map((t) => {
                          const paceKey = `${currentGroup}-${t}`;
                          const meta = teamPaceMeta && teamPaceMeta[paceKey];
                          const hasChosen = typeof meta !== 'undefined';
                          const teamHasRiders = Object.entries(cards).some(([, r]) => r.group === currentGroup && r.team === t && !r.finished);
                          const value = hasChosen ? (teamPaces[paceKey] !== undefined ? teamPaces[paceKey] : 0) : null;
                          const attackText = hasChosen && meta && meta.isAttack ? (meta.attacker ? `${meta.attacker} attacks` : 'attacks') : null;

                          return (
                            <div key={t} className="p-2 rounded border">
                              <div className="font-medium">{t}</div>
                              <div className="mt-1">
                                {!teamHasRiders ? (
                                  <div className="text-lg font-bold">X</div>
                                ) : hasChosen ? (
                                  <div className="text-lg font-bold">{String(value)}</div>
                                ) : (
                                  <div className="text-lg font-bold">&nbsp;</div>
                                )}
                                {attackText && (
                                  <div className="text-xs text-red-600 mt-1">{attackText}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-3">
                  {movePhase === 'input' && (
                    (() => {
                      // If it's the human's turn and human has riders in this group, show human interface
                      const humanRiders = Object.entries(cards).filter(([, r]) => r.group === currentGroup && r.team === 'Me' && !r.finished);
                      if (currentTeam === 'Me' && humanRiders.length > 0) {
                        return (
                          <HumanTurnInterface
                            groupNum={currentGroup}
                            riders={humanRiders}
                            onSubmit={(choices) => handleHumanChoices(currentGroup, choices)}
                          />
                        );
                      }

                      // Otherwise show AI Play button for the currentTeam (with feedback message)
                      return (
                        <div className="flex items-center justify-end gap-3">
                          {aiMessage && (
                            <div className="text-base font-bold text-gray-700">
                              {aiMessage}
                            </div>
                          )}
                          {(() => {
                            const teamHasRiders = Object.entries(cards).some(([, r]) => r.group === currentGroup && r.team === currentTeam && !r.finished);
                            return (
                              <div className="flex items-center gap-2">
                                {!teamHasRiders ? (
                                  <div className="text-sm italic text-gray-500">no riders in the group</div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      const result = autoPlayTeam(currentGroup);
                                      const teamAtCall = currentTeam;
                                      if (result) {
                                        setCards(result.updatedCards);
                                        const teamRiders = Object.entries(result.updatedCards).filter(([, r]) => r.group === currentGroup && r.team === teamAtCall).map(([n, r]) => ({ name: n, ...r }));
                                        const nonAttackerPaces = teamRiders.filter(r => r.attacking_status !== 'attacker').map(r => Math.round(r.selected_value || 0));
                                        const aiTeamPace = nonAttackerPaces.length > 0 ? Math.max(...nonAttackerPaces) : 0;
                                        const aiIsAttack = teamRiders.some(r => r.attacking_status === 'attacker');
                                        // Set a short-lived AI message for UX
                                        const aiAttackerName = (teamRiders.find(r => r.attacking_status === 'attacker') || {}).name || null;
                                        setAiMessage(`${teamAtCall} has chosen ${aiTeamPace}`);
                                        handlePaceSubmit(currentGroup, aiTeamPace, teamAtCall, aiIsAttack, aiAttackerName);
                                      } else {
                                        const aiTeamPace = 0;
                                        const aiIsAttack = false;
                                        setAiMessage(`${teamAtCall} has chosen ${aiTeamPace}`);
                                        handlePaceSubmit(currentGroup, aiTeamPace, teamAtCall, aiIsAttack, null);
                                      }
                                      setTimeout(() => { setAiMessage(''); }, 1500);
                                    }}
                                    className="px-3 py-2 bg-gray-700 text-white rounded"
                                  >
                                    {currentTeam + "'s choice"}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()
                  )}

                  {/* When movePhase indicates cardSelection, show the Move Group controls here */}
                  {movePhase === 'cardSelection' && (
                    <div className="border-t pt-3 bg-green-50 p-3 rounded mt-3">
                      <div className="mb-2 text-sm font-medium">Speed: <span className="font-bold">{groupSpeed}</span>, SV: <span className="font-bold">{slipstream}</span></div>
                        <div className="flex justify-end">
                        <button onClick={() => openCardSelectionForGroup(currentGroup)} className="px-4 py-2 bg-green-600 text-white rounded font-semibold flex items-center gap-2">
                          <ArrowRight size={14}/> Move Group
                        </button>
                      </div>
                    </div>
                  )}
                  {movePhase === 'roundComplete' && sprintGroupsPending.length === 0 && (
                    <div className="mt-3 flex justify-end">
                      {(() => {
                        const isBrosten = typeof track === 'string' && /\*$/.test(track);
                        // If this is a Brosten track, require the user to press "Check if crash"
                        // before offering the fallback/next round actions. If diceEvent exists
                        // (user already checked), reveal the normal controls.
                        if (isBrosten && !diceEvent) {
                          return (
                            <div className="flex items-center gap-3">
                              <button onClick={checkCrash} className="px-4 py-2 bg-yellow-500 text-black rounded font-semibold">Check if crash</button>
                              {diceMsg && (
                                <div className="ml-2 text-sm text-gray-700">{diceMsg}</div>
                              )}
                            </div>
                          );
                        }

                        // Default behaviour: show fallback + next round controls
                        return (
                          <div className="flex gap-2">
                            <button onClick={() => setFallBackOpen(true)} className="px-4 py-2 bg-yellow-500 text-black rounded font-semibold">Let rider fall back</button>
                            <button onClick={startNewRound} className="px-4 py-2 bg-green-600 text-white rounded font-semibold flex items-center gap-2">
                              <SkipForward size={14}/> Next Round
                            </button>
                          </div>
                        );
                      })()}

                      {/* If a recent Brosten dice event happened show it here in a yellow panel */}
                      {diceEvent && (
                        <div className="mt-2 p-2 bg-yellow-50 border rounded text-sm ml-3">
                          <div className="font-medium">{diceEvent.kind === 'puncture' ? 'Puncture' : 'Crash'}: {diceEvent.who} {diceEvent.oldPos}→{diceEvent.newPos}</div>
                          <div className="text-xs text-gray-600">You may move riders back — press "Let rider fall back" to choose.</div>
                        </div>
                      )}
                    </div>
                  )}

                  {postMoveInfo && (
                    <div className="mt-3 p-3 border rounded bg-yellow-50">
                                      <div className="mb-2 text-sm font-medium">
                                        {/* Show the group number at the top in bold */}
                                        <div className="mb-1 text-sm font-bold">Group {postMoveInfo.groupMoved}</div>
                                        {postMoveInfo.msgs && postMoveInfo.msgs.map((m, i) => (
                          <div key={i} className={`mb-1 ${m.failed ? 'text-red-600' : ''}`}>
                            {m.isLead ? (
                              <strong className={`${m.failed ? 'text-red-600' : ''}`}>{m.name} ({m.team})</strong>
                            ) : (
                              <span>{m.name} ({m.team})</span>
                            )}{' '}
                            <span>spiller kort: {m.displayCard}{m.cardVals ? ` (${m.cardVals})` : ''} {m.oldPos}→{m.newPos}{m.isLead ? ' (lead)' : ''} {m.failed ? '✗' : '✓'}</span>
                            {/* Additional consequences for riders who took TK-1 or EC */}
                            { (m.tkTaken || m.ecTaken) && (
                              <div className="text-xs text-gray-700 ml-3">
                                {(() => {
                                  const parts = [];
                                  if (m.tkTaken) parts.push(`${m.tkTaken} Tk-1`);
                                  if (m.ecTaken) parts.push(`${m.ecTaken} EC`);
                                  return `.... takes ${parts.join(' and ')}`;
                                })()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        {/* Move next group button removed per UX polish */}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Per-group panels removed per user request */}

              {/* Card selection modal for human riders when moving a group */}
              {cardSelectionOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-60">
                  <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 pb-12 max-h-[80vh] overflow-y-auto">
                    <h3 className="text-lg font-bold mb-3">Choose cards for your riders (Group {currentGroup})</h3>
                    <div className="text-sm text-gray-600 mb-3">Speed: <strong>{groupSpeed}</strong>, SV: <strong>{slipstream}</strong></div>
                    <div className="space-y-4 mb-4">
                      {Object.entries(cards).filter(([, r]) => r.group === currentGroup && r.team === 'Me' && !r.finished).map(([name, rider]) => (
                        <div key={name} className="p-3 border rounded">
                          <div className="font-semibold mb-2">{name}</div>
                          <div className="grid grid-cols-4 gap-2">
                            {(rider.cards || []).slice(0, Math.min(4, rider.cards.length)).map((c) => {
                              const isLeader = (rider.takes_lead || 0) === 1;
                              let disabled = false;
                              let title = '';
                              try {
                                if (isLeader) {
                                  const svForLead = getSlipstreamValue(rider.position, rider.position + Math.floor(groupSpeed || 0), track);
                                  const top4 = (rider.cards || []).slice(0, Math.min(4, rider.cards.length));
                                  const localPenalty = top4.slice(0,4).some(tc => tc && tc.id === 'TK-1: 99') ? 1 : 0;
                                  const cardVal = svForLead > 2 ? c.flat : c.uphill;
                                  const targetVal = Math.round(groupSpeed || 0);
                                  if ((cardVal - localPenalty) < targetVal) {
                                    disabled = true;
                                    title = `Must be ≥ ${targetVal}`;
                                  }
                                }
                              } catch (e) { disabled = false; }
                              // Determine state for this card: leader-disabled (grey), non-leader-danger (red), selected, or normal
                              const isSelected = cardSelections[name] === c.id;
                              let localDisabled = false;
                              let danger = false;
                              let titleText = title || '';
                              try {
                                if (isLeader) {
                                  const svForLead = getSlipstreamValue(rider.position, rider.position + Math.floor(groupSpeed || 0), track);
                                  const top4 = (rider.cards || []).slice(0, Math.min(4, rider.cards.length));
                                  const localPenalty = top4.slice(0,4).some(tc => tc && tc.id === 'TK-1: 99') ? 1 : 0;
                                  const cardVal = svForLead > 2 ? c.flat : c.uphill;
                                  const targetVal = Math.round(groupSpeed || 0);
                                  if ((cardVal - localPenalty) < targetVal) {
                                    localDisabled = true; // leader cannot play this card for the required pace
                                    titleText = `Must be ≥ ${targetVal}`;
                                  }
                                } else {
                                  // Non-leader: determine whether playing this card would cause rider to fall out
                                  const top4 = (rider.cards || []).slice(0, Math.min(4, rider.cards.length));
                                  const localPenalty = top4.slice(0,4).some(tc => tc && tc.id === 'TK-1: 99') ? 1 : 0;
                                  const cardVal = slipstream > 2 ? c.flat : c.uphill;
                                  const effective = (cardVal - localPenalty);
                                  const minRequiredToFollow = Math.max(0, (groupSpeed || 0) - (slipstream || 0));
                                  if (effective < minRequiredToFollow) {
                                    danger = true; // would fall out of group
                                    titleText = titleText || 'Would fall out of group if played';
                                  }
                                }
                              } catch (e) { /* ignore */ }

                              const btnClass = isSelected
                                ? 'p-2 rounded text-sm border bg-blue-600 text-white'
                                : (localDisabled)
                                  ? 'p-2 rounded text-sm border bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : (danger)
                                    ? 'p-2 rounded text-sm border border-red-600 bg-red-50 text-red-700'
                                    : 'p-2 rounded text-sm border bg-white hover:bg-gray-50';

                              return (
                                <button key={c.id} type="button" title={titleText} onClick={() => !localDisabled && handleCardChoice(name, c.id)} disabled={localDisabled} className={btnClass}>
                                  <div className={`font-bold ${danger ? 'text-red-700' : ''}`}>{c.id}</div>
                                  <div className="text-xs">{c.flat}|{c.uphill}</div>
                                </button>
                              );
                            })}
                            {/* TK-extra option */}
                            {(() => {
                              const isLeader = (rider.takes_lead || 0) === 1;
                              const disabled = !!isLeader; // disallow tk_extra for leaders
                              return (
                                <button type="button" onClick={() => !disabled && handleCardChoice(name, 'tk_extra 15')} disabled={disabled} className={`p-2 rounded text-sm border ${cardSelections[name] === 'tk_extra 15' ? 'bg-blue-600 text-white' : disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}`}>
                                  <div className="font-bold">tk_extra</div>
                                  <div className="text-xs">2|2</div>
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setCardSelectionOpen(false)} className="px-3 py-2 border rounded">Cancel</button>
                      <button disabled={Object.values(cardSelections).length === 0 || Object.values(cardSelections).some(v => v === null)} onClick={submitCardSelections} className="px-4 py-2 bg-green-600 text-white rounded">Submit</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Fall-back modal: let one human rider fall back to a group behind them */}
              {fallBackOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-60">
                  <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
                    <h3 className="text-lg font-bold mb-3">Let rider fall back</h3>
                    <p className="text-sm text-gray-600 mb-3">Choose one of your riders and move them back to a group behind them.</p>
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-1">Which rider</label>
                      <select value={fallRider || ''} onChange={e => { setFallRider(e.target.value || null); setFallTargetGroup(null); }} className="w-full p-2 border rounded">
                        <option value="">-- select rider --</option>
                        {Object.entries(cards).filter(([, r]) => r.team === 'Me' && !r.finished).map(([name, r]) => (
                          <option key={name} value={name}>{name} (Group {r.group})</option>
                        ))}
                      </select>
                    </div>
                    {fallRider && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">Back to group (only groups behind the rider are allowed)</label>
                        {(() => {
                          const riderObj = cards[fallRider];
                          const allGroups = Array.from(new Set(Object.values(cards).filter(rr => !rr.finished).map(rr => rr.group))).sort((a,b) => b - a);
                          // groups behind the rider are those with a greater group number
                          // (do NOT allow falling forward to groups with a lower group number)
                          const behind = allGroups.filter(g => g > (riderObj ? riderObj.group : 0));
                          if (behind.length === 0) return <div className="text-sm text-gray-500">No group is behind {fallRider}.</div>;
                          return (
                            <div className="space-y-2">
                              {behind.map(g => (
                                <label key={g} className={`p-2 border rounded flex items-start gap-3 ${Number(fallTargetGroup) === Number(g) ? 'bg-gray-100' : ''}`}>
                                  <input type="radio" name="fallGroup" value={g} checked={Number(fallTargetGroup) === Number(g)} onChange={() => setFallTargetGroup(g)} />
                                  <div className="text-sm">
                                    <div className="font-semibold">Group {g}</div>
                                    <div className="text-xs text-gray-600">Riders: {Object.entries(cards).filter(([,r]) => r.group === g && !r.finished).map(([n]) => n).join(', ')}</div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    <div className="flex justify-end gap-3">
                      <button onClick={() => { setFallBackOpen(false); setFallRider(null); setFallTargetGroup(null); }} className="px-3 py-2 border rounded">Cancel</button>
                      <button onClick={confirmFallBack} disabled={!fallRider || fallTargetGroup === null} className="px-4 py-2 bg-yellow-500 text-black rounded">Confirm</button>
                    </div>
                  </div>
                </div>
              )}

              
            </div>

            {/* Sticky footer: minimizable */}
            <div className="fixed left-0 right-0 bottom-0 bg-white border-t shadow-lg z-50">
              <div className="max-w-7xl mx-auto px-3">
                <div className="relative">
                  {/* Toggle button to minimize/restore footer */}
                  <button onClick={() => setFooterCollapsed(fc => !fc)} aria-label="Toggle footer" className="absolute -top-6 right-3 bg-white border rounded-full p-1 shadow">
                    <span className="text-sm">{footerCollapsed ? '▲' : '▼'}</span>
                  </button>

                  <div className={`py-2 ${footerCollapsed ? 'hidden' : ''}`}>
                    {/* Track row (restored) */}
                    <div className="overflow-x-auto bg-gray-50 rounded p-1 mb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <div style={{ display: 'flex', gap: 1, alignItems: 'stretch', height: 'auto', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const tokens = colourTrackTokens(track || '').map((t, i) => ({ ...t, idx: i }));
                          const groupsList = Array.from(new Set(Object.values(cards).filter(r => !r.finished).map(r => r.group))).sort((a,b)=>a-b);
                          const groupPosMap = {};
                          groupsList.forEach(g => {
                            const entries = Object.entries(cards).filter(([,r]) => r.group === g && !r.finished).map(([,r]) => r.position || 0);
                            groupPosMap[g] = entries.length ? Math.max(...entries) : 0;
                          });
                          const posToGroups = {};
                          Object.entries(groupPosMap).forEach(([g, pos]) => { posToGroups[pos] = posToGroups[pos] || []; posToGroups[pos].push(Number(g)); });

                          const isSmall = (typeof window !== 'undefined') ? (window.innerWidth < 640) : false;
                          // make tiles roughly twice as big
                          const base = (isSmall ? 20 : 32) * 2;
                          const w = Math.round(base * 0.8);
                          const h = Math.round(w * 1.6);

                          return tokens.map((t) => {
                            const groupsHere = posToGroups[t.idx] || [];
                            const char = t.char;
                            const map = {
                              '3': { bg: '#D1D5DB', text: '#111827' },
                              '2': { bg: '#8B3A3A', text: '#FFFFFF' },
                              '1': { bg: '#DC2626', text: '#FFFFFF' },
                              '0': { bg: '#F9A8D4', text: '#111827' },
                              '_': { bg: '#60A5FA', text: '#03133E' },
                              'F': { bg: '#FACC15', text: '#111827' }
                            };
                            const styleColors = map[char] || { bg: '#F3F4F6', text: '#111827' };

                            return (
                              <div key={t.idx} data-idx={t.idx} className="flex flex-col items-center" style={{ width: w + 4, marginRight: 1, display: 'inline-flex' }}>
                                <div title={`Field ${t.idx}: ${char}`} style={{ width: w, height: h, backgroundColor: styleColors.bg, color: styleColors.text }} className="rounded-sm relative flex-shrink-0 border">
                                  {/* tile number: smaller, thin, positioned at the top */}
                                  <div style={{ position: 'absolute', top: 4, left: 6, fontSize: isSmall ? '8px' : '10px', fontWeight: 300, lineHeight: 1, opacity: 0.95 }}>{t.idx}</div>
                                  {/* If this is a Brosten track (trailing '*') show the small capacity % under the tile number for 0/1/2 tokens */}
                                  {(() => {
                                    try {
                                      const isBrosten = typeof track === 'string' && /\*$/.test(track);
                                      if (!isBrosten) return null;
                                      const ch = t.char;
                                      if (ch !== '0' && ch !== '1' && ch !== '2') return null;
                                      // For Brosten tracks we show a small capacity hint under
                                      // tokens 0/1/2. Adjust distribution: make '2' 50%, '1' 33%
                                      // and '0' 25% (user-requested change).
                                      const label = (ch === '2') ? '50%' : (ch === '0' ? '25%' : '33%');
                                      return (
                                        <div style={{ position: 'absolute', top: isSmall ? 14 : 16, left: 6, fontSize: isSmall ? '7px' : '9px', lineHeight: 1, opacity: 0.9, color: styleColors.text }} className="pointer-events-none">{label}</div>
                                      );
                                    } catch (e) { return null; }
                                  })()}
                                  <div style={{ position: 'absolute', top: 3, right: 6 }} className="text-xs font-semibold" aria-hidden>{char}</div>
                                  {groupsHere.length > 0 && (
                                    <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center' }}>
                                      {groupsHere.map((g, idx) => (
                                        <span key={g} style={{ display: 'inline-block', marginRight: idx < groupsHere.length - 1 ? 6 : 0, fontSize: (g === 1 || g === 2) ? '0.975rem' : '0.65rem', fontWeight: 700 }}>{`G${g}`}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    {/* Controls + groups below the track (condensed) */}
                    {(() => {
                      // Compute kilometers left from the furthest-forward rider
                      const kmLeft = computeKmLeft(getResolvedTrack(), cards);
                      return (
                        <div className="mb-1 text-sm font-semibold"><strong>{`Km's left: ${kmLeft}`}</strong></div>
                      );
                    })()}
                    <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                  <div className="md:col-span-1">
                    {sprintGroupsPending.length > 0 && (() => {
                      const minG = Math.min(...sprintGroupsPending);
                      return (
                        <div className="mb-1">
                          <button onClick={() => { setSprintAnimMsgs(['Preparing sprint...']); runSprints(track, minG); }} className="w-full bg-purple-500 text-white py-2 rounded">
                            Sprint with group {minG}
                          </button>
                        </div>
                      );
                    })()}

                    {sprintAnimMsgs && sprintAnimMsgs.length > 0 && (
                      <div className="mt-1 p-2 bg-purple-50 border rounded text-xs max-h-20 overflow-y-auto">
                        {sprintAnimMsgs.map((m, idx) => (
                          <div key={idx} className="text-xs text-gray-800">{m}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-600 max-h-28 overflow-y-auto">
                      {(() => {
                        const groupsListLocal = Array.from(new Set(Object.values(cards).filter(r => !r.finished).map(r => r.group))).sort((a,b)=>a-b);
                        if (groupsListLocal.length === 0) return <div className="text-xs text-gray-400">(none)</div>;
                        return groupsListLocal.map(g => {
                          const storedGap = (groupTimeGaps && typeof groupTimeGaps[g] === 'number') ? groupTimeGaps[g] : 0;
                          const timeStr = convertToSeconds(storedGap);
                          const riders = Object.entries(cards).filter(([, r]) => r.group === g && !r.finished).map(([n]) => n);
                          const namesStr = riders.join(', ');
                          return (
                            <div key={g} className="mb-0.5">
                              <div className="flex items-center gap-3">
                                <div className="font-medium text-sm">G{g} <span className="text-gray-500 text-xs">{timeStr}</span></div>
                                <div className="flex-1 overflow-x-auto">
                                  <div className="flex gap-2 items-center text-xs">
                                      {riders.map(name => {
                                        const team = (cards[name] && cards[name].team) || '';
                                        const bg = (teamColors && teamColors[team]) || 'transparent';
                                        const txt = (teamTextColors && teamTextColors[team]) || '#111827';
                                        return (
                                          <div key={name} className="whitespace-nowrap inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: bg, color: txt }}>
                                            {abbrevFirstName(name)}
                                            <span className="ml-1 text-[10px] text-opacity-80" style={{ color: txt === '#000000' ? '#444' : txt }}>{`(${team})`}</span>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
                  </div>

                  {footerCollapsed && (
                    <div className="py-2 flex items-center justify-center text-sm text-gray-700">Sticky footer minimized</div>
                  )}

                </div>
              </div>
            </div>

            {/* Status section moved to bottom */}
            <div>
              <div className="bg-white rounded-lg shadow p-3">
                <h2 className="text-lg font-bold mb-2"><Trophy size={18} className="inline"/>Status</h2>
                <div className="space-y-1 text-sm">
                  <p><strong>Round:</strong> {round}</p>
                  <p><strong>Group:</strong> {currentGroup}</p>
                  <p><strong>Team:</strong> {currentTeam}</p>
                </div>
                {/* Team rosters: show which riders each team currently has */}
                <div className="mt-3">
                  <h4 className="font-bold mb-2">Team Rosters</h4>
                  <div className="text-sm space-y-2">
                    {(() => {
                      // collect team names from cards or fallback to generated teams
                      const teamNames = teamBaseOrder && teamBaseOrder.length > 0 ? teamBaseOrder : Array.from(new Set(Object.values(cards).map(r => r.team))).filter(Boolean);
                      if (!teamNames || teamNames.length === 0) return <div className="text-xs text-gray-500">No teams yet</div>;
                      return teamNames.map(t => {
                        const bg = teamColors[t] || 'white';
                        const txt = teamTextColors[t] || '#111';
                        return (
                          <div key={t} className="p-2 rounded border" style={{ backgroundColor: bg, color: txt }}>
                            <div className="font-semibold">{t}</div>
                            <div className="text-xs" style={{ color: txt === '#000000' ? '#111' : '#f0f0f0' }}>
                              {Object.entries(cards).filter(([,r]) => r.team === t).map(([n]) => n).join(', ') || <span className="text-gray-400">(no riders)</span>}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                {((movePhase === 'roundComplete' || diceEvent) && sprintGroupsPending.length === 0) && (() => {
                  const isBrosten = typeof track === 'string' && /\*$/.test(track);
                  if (isBrosten && !diceEvent) {
                    return (
                      <div>
                        <button onClick={checkCrash} className="w-full mt-3 bg-yellow-500 text-black py-2 rounded flex items-center justify-center gap-2">Check if crash</button>
                        {diceMsg && <div className="mt-2 text-sm text-gray-700">{diceMsg}</div>}
                      </div>
                    );
                  }
                  return (
                    <>
                      <button onClick={startNewRound} className="w-full mt-3 bg-green-600 text-white py-2 rounded flex items-center justify-center gap-2">
                        <SkipForward size={14}/>Round {round + 1}
                      </button>
                      <button onClick={() => setFallBackOpen(true)} className="w-full mt-3 bg-yellow-500 text-black py-2 rounded flex items-center justify-center gap-2">
                        Let rider fall back
                      </button>
                      {diceEvent && (
                        <div className="mt-2 p-2 bg-yellow-50 border rounded text-sm">
                          <div className="font-medium">{diceEvent.kind === 'puncture' ? 'Puncture' : 'Crash'}: {diceEvent.who} {diceEvent.oldPos}→{diceEvent.newPos}</div>
                          <div className="text-xs text-gray-600">Use "Let rider fall back" to move riders back until you confirm.</div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Sprint controls: show per-group sprint buttons when pending */}
                {sprintGroupsPending.length > 0 && (
                  <div className="mt-3">
                    {(() => {
                      const minG = Math.min(...sprintGroupsPending);
                      return (
                        <button key={minG} onClick={() => runSprints(track, minG)} className="w-full bg-purple-500 text-white py-2 rounded">
                          Sprint with group {minG}
                        </button>
                      );
                    })()}
                  </div>
                )}
                <button onClick={() => setGameState('setup')} className="w-full mt-3 bg-gray-600 text-white py-1 rounded text-sm">
                  Back to Setup
                </button>
                
                {/* Mobile debug toggle button */}
                <div className="lg:hidden mt-3 px-3">
                  <button onClick={() => setShowDebugMobile(s => !s)} className="w-full py-2 bg-yellow-500 text-black rounded">
                    {showDebugMobile ? 'Hide Debug' : 'Show Debug'}
                  </button>
                </div>

                <div className={`${showDebugMobile ? '' : 'hidden lg:block'} bg-gray-900 text-green-400 rounded-lg shadow p-4 mt-6 font-mono text-xs max-h-96 overflow-y-auto`}>
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
                            {rider.cards.map((c, i) => {
                              const num = (c.id && c.id.match(/\d+/)) ? c.id.match(/\d+/)[0] : '?';
                              return (<div key={i}>{i+1}. Kort {num}: {c.flat}|{c.uphill}</div>);
                            })}
                          </div>
                          <div className="flex col-span-2">
                            <span className="text-blue-400 w-32">discarded:</span>
                            <span className="text-green-300">{rider.discarded.length} cards</span>
                          </div>
                          <div className="col-span-2 ml-32 text-green-300 text-xs">
                            {rider.discarded.map((c, i) => {
                              const num = (c.id && c.id.match(/\d+/)) ? c.id.match(/\d+/)[0] : '?';
                              return (<div key={i}>{i+1}. Kort {num}: {c.flat}|{c.uphill}</div>);
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              
                {/* Final standings */}
                <div className="bg-white rounded-lg shadow p-3 mt-3">
                  <h3 className="font-bold mb-2">Final Standings</h3>
                  <div className="text-xs text-gray-500 mb-1">Level: {level}</div>
                  {(() => {
                    const finished = Object.entries(cards)
                      .filter(([, r]) => typeof r.result === 'number' && r.result < 1000)
                      .sort((a, b) => (a[1].result || 9999) - (b[1].result || 9999));
                    if (finished.length === 0) return <div className="text-sm text-gray-500">No finishers yet</div>;
                    return (
                      <div className="text-sm space-y-1">
                        {finished.map(([name, r]) => (
                          <div key={name} className="flex justify-between">
                            <div>{r.result}. {r.team === 'Me' ? (<strong>{name}</strong>) : name} <span className="text-xs text-gray-500">({r.team})</span></div>
                            <div className="text-xs text-green-600">{typeof r.time_after_winner === 'number' ? convertToSeconds(r.time_after_winner) : '-'}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-3 mt-3 max-h-96 overflow-y-auto">
                <h3 className="font-bold mb-2"><FileText size={16} className="inline"/>Log</h3>
                <div className="text-xs space-y-1">
                  {logs.slice(-50).reverse().map((l,i) => <div key={i} className="border-b pb-1">{l}</div>)}
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
