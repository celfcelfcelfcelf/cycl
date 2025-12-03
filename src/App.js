import React, { useState, useRef, useEffect } from 'react';
import { Play, SkipForward, FileText, Trophy, ArrowRight, Info } from 'lucide-react';
import {
  convertToSeconds,
  getSlipstreamValue,
  getEffectiveSV,
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
  'nedkørselstest': '_333______000___3___33333FFF',
  'Paris-Roubaix': '2333223331113330003333323333333333333232333311003233333233333333FFFFFFFFFF*',
  'Gent-Wevelgem': '333331113333333222333311133330033333333333333333333333333333333333333FFFFFFFB',
  'GiroStage20 Finestre': '11111100000000000000000000000000000_____3333322222221111111111111FFFFFFFFFF',
  'Milano - San Remo': '3333333222333223333333331111_33333333222222222___33333332222222__33333FFFFFFFFFFFF',
  'Dwars door Vlanderen': '333332233333333331133333333333333331333333333333331133333333333FFFFFFFFFFFB',
  'GP Montreal': '211_3333333333332211_3333333333331111_3333333333332211_3333333333FFFFFF',
  'Gran Premio Miguel Indurain': '333333222222133______0033333222223333333332222222333331113301133FFFFFF',
  'Classic Bretagne': '3333333330333333333333332333331133333333113333333333222333332233333FFFFFFFFFF',
  'VM 24 Zurich': '133333333111331111333333333___133333333111331111333333333___1333333FFFFFFFF',
  'Tour Down Under (24, E2 - Norwood-Lobethal)': '11113333333333333333333333223333333331111333333233333FFFFFFFF',
  'Volta a la Comunitat Valenciana (23, E5 / Paterna - Valencia)': '11111111111111_______333333333333333333333333333333333FFFFFFFFF',
  'Utsunomiya Japan Cup Road Race': '_333333222221_333333222221_333333222221_333333222221_333333FFFFFFFFF',
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
  const [numAttackers, setNumAttackers] = useState(1); // number of attackers (1-4)
  const [attackerLeadFields, setAttackerLeadFields] = useState(5); // fields ahead for attackers (1-10)
  const [dobbeltføring, setDobbeltføring] = useState(true); // enable double-leading mechanic
  
  // Update numAttackers default when numberOfTeams or ridersPerTeam changes
  useEffect(() => {
    const totalRiders = numberOfTeams * ridersPerTeam;
    const defaultAttackers = Math.ceil(totalRiders / 10);
    setNumAttackers(Math.min(defaultAttackers, 4)); // cap at 4
  }, [numberOfTeams, ridersPerTeam]);
  
  const [cards, setCards] = useState({});
  const [finalStandings, setFinalStandings] = useState([]); // accumulated finished riders {pos,name,time,timeSec,team}
  const [round, setRound] = useState(0);
  const [currentGroup, setCurrentGroup] = useState(0);
  const [teams, setTeams] = useState([]);
  const [pullConfirmGroup, setPullConfirmGroup] = useState(null);
  const [pullInvestGroup, setPullInvestGroup] = useState(null);
  const [pullInvestTeam, setPullInvestTeam] = useState(null);
  const [pullInvestSelections, setPullInvestSelections] = useState([]);
  const [pullInvestButtonsDisabled, setPullInvestButtonsDisabled] = useState(false);
  const [teamBaseOrder, setTeamBaseOrder] = useState([]); // fixed base order assigned at game start
  const processedInvestsRef = useRef(new Set());
  const addingInvestRef = useRef(new Set());
  const pullInvestHandledRef = useRef(new Set());
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
    try {
      for (let i = 0; i < trackStr.length; i++) {
        const ch = trackStr[i];
        if (ch === '0' || ch === '1') {
          cur += 1;
          if (cur > longest) longest = cur;
        } else if (ch === '2') {
          cur += 0.5;
          if (cur > longest) longest = cur;
        } else {
          cur = 0;
        }
      }
      return Math.max(1, Math.round(longest));
    } catch (e) { return 1; }
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
      
      // Try both lowercase and uppercase field names (cards use lowercase, allRiders use uppercase)
      const brostenField = Number(riderObj.brosten || riderObj.BROSTEN) || 0;
      const brostensbakkeField = Number(riderObj.brostensbakke || riderObj.BROSTENSBAKKE) || 0;
      const bjergField = Number(riderObj.bjerg || riderObj.BJERG) || 0;
      const fladField = Number(riderObj.flad || riderObj.FLAD) || 0;
      
      // If track ends with '*' we show Brosten = FLAD + BROSTEN
      let modifiedBJERG;
      if (typeof selectedTrackStr === 'string' && /\*$/.test(selectedTrackStr)) {
        modifiedBJERG = Math.round(fladField + brostenField);
      } else if (typeof selectedTrackStr === 'string' && /B$/.test(selectedTrackStr)) {
        // For Brostensbakke tracks (ending with 'B'), use BJERG + BROSTENSBAKKE
        modifiedBJERG = Math.round(bjergField + brostensbakkeField);
      } else {
        // otherwise include puncheur sum and plain BROSTEN
        const sumTotal = sumL + (isBrosten ? brostenField : 0);
        modifiedBJERG = Math.round(bjergField + sumTotal);
      }

      let label = 'BJERG';
  if (typeof selectedTrackStr === 'string' && /B$/.test(selectedTrackStr)) label = 'Brostensbakke';
  else if (typeof selectedTrackStr === 'string' && /\*$/.test(selectedTrackStr)) label = 'Brosten';
      else if (puncheur_factor > 0.3) label = 'BAKKE';

      return { modifiedBJERG, label, puncheur_factor };
    } catch (e) { 
      const bjergFallback = Number(riderObj.bjerg || riderObj.BJERG) || 0;
      return { modifiedBJERG: bjergFallback, label: 'BJERG', puncheur_factor: 0 }; 
    }
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
  const [isFlat, setIsFlat] = useState(true); // Track if terrain is flat (sv === 3)
  
  const [logs, setLogs] = useState([]);
  const [groupsMovedThisRound, setGroupsMovedThisRound] = useState([]);
  const [aiMessage, setAiMessage] = useState('');
  const [expandedRider, setExpandedRider] = useState(null);
  const [riderTooltip, setRiderTooltip] = useState(null); // { name, x, y }
  const [groupTimeGaps, setGroupTimeGaps] = useState({});
  const [latestPrelTime, setLatestPrelTime] = useState(6000); // Start at 100:00, can only decrease
  const [sprintResults, setSprintResults] = useState([]);
  const [sprintGroupsPending, setSprintGroupsPending] = useState([]);
  const [sprintAnimMsgs, setSprintAnimMsgs] = useState([]);
  const [sprintFocusGroup, setSprintFocusGroup] = useState(null);
  const [showDebugMobile, setShowDebugMobile] = useState(false);
  const [showEngineUI, setShowEngineUI] = useState(false);
  const [footerCollapsed, setFooterCollapsed] = useState(false);
  const [eliminateOpen, setEliminateOpen] = useState(false);
  const [eliminateSelection, setEliminateSelection] = useState({});
  const [postMoveInfo, setPostMoveInfo] = useState(null);
  const [pullInvestOutcome, setPullInvestOutcome] = useState({});
  const [diceMsg, setDiceMsg] = useState(null);
  const [diceEvent, setDiceEvent] = useState(null); // { who, kind, oldPos, newPos }

  const addLog = (msg) => {
    setLogs(p => {
      const newEntry = `[R${round}] ${msg}`;
      if (p.length > 0 && p[p.length - 1] === newEntry) return p; // avoid consecutive duplicates
      return [...p, newEntry];
    });
  };

  // Deterministic helpers for evaluating AI invests so UI predictions match processing
  const hashString = (s) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    return h >>> 0;
  };
  const seededRng = (seed) => {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  };

  const evaluateRiderAutoInvest = (groupNum, riderName, cardsState, logger = () => {}) => {
    try {
      const trackStr = getResolvedTrack();
      const seedBase = `${round}:${groupNum}:${riderName}`;
      const rng1 = seededRng(hashString(seedBase + ':a'));
      const rng2 = seededRng(hashString(seedBase + ':b'));
      const rng3 = seededRng(hashString(seedBase + ':d'));
      const rngCoin = seededRng(hashString(seedBase + ':c'));
      const res1 = takesLeadFC(riderName, cardsState, trackStr, numberOfTeams, false, false, [], logger, rng1);
      const res2 = takesLeadFC(riderName, cardsState, trackStr, numberOfTeams, false, false, [], logger, rng2);
      const res3 = takesLeadFC(riderName, cardsState, trackStr, numberOfTeams, false, false, [], logger, rng3);
      // Count successes and log them for diagnostics
      const succ = (res1 === 1 ? 1 : 0) + (res2 === 1 ? 1 : 0) + (res3 === 1 ? 1 : 0);
      // Require three consecutive takesLeadFC successes (3/3) before a coin flip allows investment
      if (res1 === 1 && res2 === 1 && res3 === 1) {
        if (Math.floor(rngCoin() * 2) === 0) {
          try { logger(`Evaluated auto-invest for ${riderName}: 1 (${succ}/3)`); } catch (e) {}
          return 1;
        }
      }
      try { logger(`Evaluated auto-invest for ${riderName}: 0 (${succ}/3)`); } catch (e) {}
    } catch (e) {}
    return 0;
  };

  const predictTeamInvest = (groupNum, teamName) => {
    try {
      const members = Object.entries(cards).filter(([, rr]) => rr.group === groupNum && !rr.finished && rr.team === teamName);
      for (const [nm, rr] of members) {
        if (!rr) continue;
        if (evaluateRiderAutoInvest(groupNum, nm, cards, () => {}) === 1) return true;
      }
    } catch (e) {}
    return false;
  };

  // Process AI riders in a group to decide automatic investments (TK-1).
  // humanChoice: { invested: boolean, rider: string|null, team: string|null }
  const processAutoInvests = (g, humanChoice = { invested: false, riders: null, rider: null, team: null }) => {
    // Guard against duplicate identical invocations (UI races/double clicks)
    // Use group number as primary key to prevent any duplicate processing
    try {
      const groupKey = `g:${g}`;
      if (processedInvestsRef.current.has(groupKey)) {
        try { addLog(`processAutoInvests: duplicate invocation ignored for group ${g}`); } catch (e) {}
        return;
      }
      processedInvestsRef.current.add(groupKey);
      setTimeout(() => { try { processedInvestsRef.current.delete(groupKey); } catch (e) {} }, 3000);

      // Log the specific call parameters for debugging
      const hcRiders = humanChoice && humanChoice.invested ? (Array.isArray(humanChoice.riders) ? humanChoice.riders.slice() : (humanChoice.rider ? [humanChoice.rider] : [])) : [];
      const hcTeam = humanChoice && humanChoice.team ? humanChoice.team : 'Me';
      hcRiders.sort();
      const key = `g:${g}|team:${hcTeam}|riders:${JSON.stringify(hcRiders)}`;
      try { addLog(`processAutoInvests called: ${key}`); } catch (e) {}
    } catch (e) {}

    // Use a ref to track if we've already set the outcome for this group
    const outcomeKey = `outcome_${g}`;
    let outcomeAlreadySet = false;

    setCards(prev => {
      try {
        const updated = { ...prev };
        const membersLocal = Object.entries(updated).filter(([, rr]) => rr.group === g && !rr.finished);

        // Track actual per-team investment counts for this processing run
        const perTeamInvestedActual = {};
        const perRiderInvested = [];

        // Determine which riders are eligible to invest:
        // 1. Must be in the group (g)
        // 2. Must not be an attacker themselves
        // 3. Must be at exactly the group's main position (position == groupMainPos)
        // 4. Must not be on a team that has an attacker
        const nonAttackers = membersLocal.filter(([, rr]) => (rr.attacking_status || '') !== 'attacker');
        const nonAttackerPositions = nonAttackers.map(([, rr]) => Number(rr.position || 0));
        const groupMainPos = nonAttackerPositions.length > 0 ? Math.max(...nonAttackerPositions) : 0;
        
        // Find teams that have attackers
        const teamsWithAttackers = new Set(
          membersLocal
            .filter(([, rr]) => (rr.attacking_status || '') === 'attacker')
            .map(([, rr]) => rr.team)
        );
        
        const eligibleInvestors = membersLocal.filter(([, rr]) => 
          (rr.attacking_status || '') !== 'attacker' && 
          (Number(rr.position || 0) === groupMainPos) &&
          !teamsWithAttackers.has(rr.team)
        );

        // Handle human choice: support multiple riders (array) or legacy single 'rider'
        if (humanChoice && humanChoice.invested) {
          const ridersChosen = Array.isArray(humanChoice.riders) ? humanChoice.riders : (humanChoice.rider ? [humanChoice.rider] : []);
          if (ridersChosen && ridersChosen.length > 0) {
            const teamName = humanChoice.team || 'Me';
            // Count desired investments per rider
            const desired = {};
            for (const r of ridersChosen) desired[r] = (desired[r] || 0) + 1;
            perTeamInvestedActual[teamName] = perTeamInvestedActual[teamName] || 0;
            for (const [chosen, want] of Object.entries(desired)) {
              try {
                if (!updated[chosen]) continue;
                // determine how many TK-1 already at top
                const prevCards = Array.isArray(updated[chosen].cards) ? updated[chosen].cards : [];
                let topTk = 0;
                for (const c of prevCards) {
                  if (c && String(c.id).startsWith('TK-1')) topTk++; else break;
                }
                // available team slots
                const teamSlotsLeft = Math.max(0, 2 - (perTeamInvestedActual[teamName] || 0));
                // how many the human wanted for this rider (want) but limited by slots
                const allowedWant = Math.min(want, teamSlotsLeft);
                // actual new TK-1 to add is allowedWant minus already-present topTk
                const toAdd = Math.max(0, allowedWant - topTk);
                if (toAdd <= 0) {
                  try { addLog(`Skipped human invest for ${chosen} (already has ${topTk} TK-1 or no slots)`); } catch (e) {}
                } else {
                  // Add one TK-1 to the top of the rider's hand and put any
                  // additional TK-1 into the discarded pile so only one TK-1
                  // sits at the top while extras are available as future cards.
                  const topInsert = { id: 'TK-1: 99' };
                  const extrasToDiscard = Math.max(0, toAdd - 1);
                  const newCards = [topInsert, ...prevCards];
                  const prevDiscarded = Array.isArray(updated[chosen].discarded) ? updated[chosen].discarded : [];
                  const newDiscarded = extrasToDiscard > 0 ? [...prevDiscarded, ...Array(extrasToDiscard).fill({ id: 'TK-1: 99' })] : prevDiscarded;
                  updated[chosen] = { ...updated[chosen], cards: newCards, discarded: newDiscarded, last_invest_group: g };
                  addLog(`${chosen} (team ${teamName}) invested TK-1 x${toAdd}`);
                  // record actual additions
                  for (let i = 0; i < toAdd; i++) perRiderInvested.push({ team: teamName, rider: chosen });
                  perTeamInvestedActual[teamName] = (perTeamInvestedActual[teamName] || 0) + toAdd;
                }
              } catch (e) { /* ignore */ }
            }
            addLog(`Human investment: ${ridersChosen.join(', ')} (${teamName})`);
          }
        }

        // Run AI investment checks for computer riders per team with team cap of 2
        const teamsMap = {};
        for (const [nm, rr] of eligibleInvestors) {
          if (!rr) continue;
          if (rr.team === 'Me') continue;
          teamsMap[rr.team] = teamsMap[rr.team] || [];
          teamsMap[rr.team].push([nm, rr]);
        }
        for (const teamName of Object.keys(teamsMap)) {
          perTeamInvestedActual[teamName] = perTeamInvestedActual[teamName] || 0;
          let slotsLeft = Math.max(0, 2 - perTeamInvestedActual[teamName]);
          if (slotsLeft <= 0) continue;
          // sort riders ascending by win_chance (lowest first)
          teamsMap[teamName].sort((a, b) => {
            const wa = Number((a[1] && a[1].win_chance) || 0);
            const wb = Number((b[1] && b[1].win_chance) || 0);
            return wa - wb;
          });
          for (const [nm, rr] of teamsMap[teamName]) {
            if (slotsLeft <= 0) break;
            try {
              const invest = evaluateRiderAutoInvest(g, nm, updated, addLog);
              // Detailed evaluation logging is performed inside evaluateRiderAutoInvest
              if (invest === 1) {
                // decide how much to invest: random 0..2
                const rnd = Math.floor(Math.random() * 3);
                if (rnd <= 0) {
                  try { addLog(`AI candidate ${nm} decided to invest 0`); } catch (e) {}
                  continue;
                }
                const prevCards = Array.isArray(updated[nm].cards) ? updated[nm].cards : [];
                let topTk = 0;
                for (const c of prevCards) { if (c && String(c.id).startsWith('TK-1')) topTk++; else break; }
                const want = Math.min(rnd, slotsLeft);
                const toAdd = Math.max(0, want - topTk);
                if (toAdd > 0) {
                  // Insert one TK-1 on top and move any remaining TK-1 to discarded
                  const topInsert = { id: 'TK-1: 99' };
                  const extrasToDiscard = Math.max(0, toAdd - 1);
                  const prevDiscarded = Array.isArray(updated[nm].discarded) ? updated[nm].discarded : [];
                  const newDiscarded = extrasToDiscard > 0 ? [...prevDiscarded, ...Array(extrasToDiscard).fill({ id: 'TK-1: 99' })] : prevDiscarded;
                  const newCards = [topInsert, ...prevCards];
                  updated[nm] = { ...updated[nm], cards: newCards, discarded: newDiscarded, last_invest_group: g };
                  try { addLog(`${nm} (${teamName}) invests and takes ${toAdd} TK-1`); } catch (e) {}
                  // record actual additions
                  for (let i = 0; i < toAdd; i++) perRiderInvested.push({ team: teamName, rider: nm });
                  perTeamInvestedActual[teamName] = (perTeamInvestedActual[teamName] || 0) + toAdd;
                } else {
                  try { addLog(`Skipped duplicate AI invest for ${nm} (already has ${topTk})`); } catch (e) {}
                }
                slotsLeft = Math.max(0, 2 - perTeamInvestedActual[teamName]);
              }
            } catch (e) { /* ignore per-rider errors */ }
          }
        }

        // Only pull attackers back if:
        // 1. At least two riders invested in total (across teams), AND
        // 2. At least one attacker is within slipstream range of the group
        const totalInvested = perRiderInvested.length;
        let shouldPull = false;
        if (totalInvested >= 2) {
          const nonAtk = membersLocal.filter(([, rr]) => (rr.attacking_status || '') !== 'attacker').map(([, rr]) => Number(rr.position || 0));
          const targetPos = nonAtk.length > 0 ? Math.max(...nonAtk) : (membersLocal.length > 0 ? Math.max(...membersLocal.map(([, rr]) => Number(rr.position || 0))) : 0);
          const attackers = membersLocal.filter(([, rr]) => (rr.attacking_status || '') === 'attacker');
          
          // Calculate slipstream value for the group's position
          const trackStr = getResolvedTrack();
          const sv = getSlipstreamValue(targetPos, targetPos + 8, trackStr);
          
          // Check if any attacker is within slipstream range
          const canPull = attackers.some(([, rr]) => {
            const pos = Number(rr.position || 0);
            return pos > targetPos && (pos - targetPos) <= sv;
          });
          
          if (canPull) {
            shouldPull = true;
            for (const [nm, rr] of attackers) {
              const oldPos = Number(rr.position || 0);
              updated[nm] = { ...rr, position: targetPos, old_position: oldPos };
            }
            addLog(`Attack is pulled back to group ${g}`);
          } else {
            addLog(`Investment made but attacker(s) too far away to pull back (beyond SV=${sv})`);
          }
        }

        // Set outcome only once (prevent duplicate setPullInvestOutcome calls if React re-runs callback)
        if (!outcomeAlreadySet) {
          outcomeAlreadySet = true;
          const outcomeData = { perTeam: perTeamInvestedActual, anyInvested: shouldPull, perRider: perRiderInvested, totalInvested };
          setPullInvestOutcome(prev => ({ ...prev, [g]: outcomeData }));
        }

        return updated;
      } catch (e) { return prev; }
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

  // Compute approximate kilometers left from furthest-forward rider to finish.
  // Uses the track token string and a mapping to numeric weights, then
  // converts summed token weights to kilometers (floor(sum/6)). This mirrors
  // earlier logic used for km estimates in the UI.
  const computeKmLeft = (trackStr, cardsObj) => {
    try {
      if (!trackStr || typeof trackStr !== 'string') return 0;
      // find furthest-forward rider position
      let maxPos = 0;
      if (cardsObj && typeof cardsObj === 'object') {
        Object.values(cardsObj).forEach(r => {
          if (r && !r.finished && typeof r.position === 'number') {
            if (r.position > maxPos) maxPos = r.position;
          }
        });
      }
      const finishIdx = trackStr.indexOf('F');
      if (finishIdx === -1) return 0;
      const startIdx = Math.min(maxPos, finishIdx);
      let tr = trackStr.slice(startIdx, finishIdx + 1);
      tr = tr.replace(/3/g, '6').replace(/_/g, '9').replace(/2/g, '4').replace(/1/g, '3').replace(/0/g, '2');
      const arr = tr.split('');
      let last = null;
      for (let i = arr.length - 1; i >= 0; i--) {
        const ch = arr[i];
        if ((/^[0-9]$/.test(ch)) || ch === 'F') last = ch;
        if (ch === '^' || ch === '*') arr[i] = last || '0';
      }
      const fIdx = arr.indexOf('F');
      const seq = fIdx !== -1 ? arr.slice(0, fIdx) : arr.slice();
      let sum = 0;
      for (const ch of seq) {
        if (ch === 'F') break;
        sum += parseInt(ch, 10) || 0;
      }
      // Convert token-weight sum to approximate kilometers left (mirror getLength logic)
      return Math.floor(sum / 6);
    } catch (e) { return 0; }
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

  // Close tooltip when clicking outside rider elements
  useEffect(() => {
    const handler = (e) => {
      try {
        if (!e || !e.target) return setRiderTooltip(null);
        // If click/tap happened on an element with data-rider, keep it.
        // Some browsers produce text nodes as the event target which don't
        // implement `closest`. Walk up parentNode chain to find an element
        // with `data-rider` instead of relying on `closest` existing.
        let node = e.target;
        let found = false;
        while (node) {
          try {
            if (node.getAttribute && node.getAttribute('data-rider')) { found = true; break; }
          } catch (inner) {}
          node = node.parentNode;
        }
        if (!found) setRiderTooltip(null);
      } catch (err) { setRiderTooltip(null); }
    };
    document.addEventListener('click', handler);
    // Also listen for pointerdown to open tooltip immediately on press
    const pointerHandler = (ev) => {
      try {
        if (!ev || !ev.target) return;
        let node = ev.target;
        while (node) {
          try {
            if (node.getAttribute && node.getAttribute('data-rider')) {
              const name = node.getAttribute('data-rider');
              const x = (ev.clientX != null) ? ev.clientX : (ev.touches && ev.touches[0] && ev.touches[0].clientX) || 0;
              const y = (ev.clientY != null) ? ev.clientY : (ev.touches && ev.touches[0] && ev.touches[0].clientY) || 0;
              setRiderTooltip({ name, x, y });
              return;
            }
          } catch (inner) {}
          node = node.parentNode;
        }
      } catch (e) {}
    };
    document.addEventListener('pointerdown', pointerHandler);
    return () => {
      try { document.removeEventListener('click', handler); } catch (e) {}
      try { document.removeEventListener('pointerdown', pointerHandler); } catch (e) {}
    };
  }, []);

  // Auto-open pull-invest modal if a post-move pull-back occurred and the human
  // has eligible non-attacker riders in that group. This is defensive: some
  // call paths may process investments immediately and skip opening the modal,
  // so ensure the player still gets a chance to invest when relevant.
  useEffect(() => {
    try {
      const p = postMoveInfo;
      if (!p || typeof p.groupMoved === 'undefined') return;
      const g = p.groupMoved;
      // If modal already open for this group, nothing to do
      if (pullInvestGroup === g) return;
      // If we've already handled this group's pull-invest (user responded), don't auto-open
      if (pullInvestHandledRef.current.has(g)) return;
      const members = Object.entries(cards).filter(([, r]) => r.group === g && !r.finished);
      const attackers = members.filter(([, r]) => (r.attacking_status || '') === 'attacker');
      if (!attackers || attackers.length === 0) return;
      // Determine the group's main position among non-attackers so we can
      // exclude riders who fell off (position < mainPos). Only riders who
      // stayed with the group's main non-attacker position are eligible to invest.
      const nonAttackerPositions = members.filter(([, r]) => (r.attacking_status || '') !== 'attacker').map(([, r]) => Number(r.position) || 0);
      const groupMainPos = nonAttackerPositions.length > 0 ? Math.max(...nonAttackerPositions) : (members.length > 0 ? Math.max(...members.map(([,r]) => Number(r.position) || 0)) : 0);
      
      // Check if any attacker is within slipstream range
      const trackStr = getResolvedTrack();
      const sv = getSlipstreamValue(groupMainPos, groupMainPos + 8, trackStr);
      const canPull = attackers.some(([, r]) => {
        const pos = Number(r.position || 0);
        return pos > groupMainPos && (pos - groupMainPos) <= sv;
      });
      
      // Only auto-open if attackers are within range
      if (!canPull) return;
      
      const humanHasEligible = members.some(([, r]) => r.team === 'Me' && !r.finished && (r.attacking_status || '') !== 'attacker' && (Number(r.position) || 0) >= groupMainPos);
      if (humanHasEligible) {
        try { addLog(`Auto-opening pull-invest modal for Me group ${g}`); } catch (e) {}
        // Close any other modal that might be open (e.g., card selection)
        setCardSelectionOpen(false);
        setPullInvestGroup(g);
        setPullInvestTeam('Me');
        setPullInvestSelections([]);
      }
    } catch (e) { /* ignore */ }
  }, [postMoveInfo, cards, pullInvestGroup]);

  // Debug: log pull-invest selection changes so we can diagnose why user can't submit
  useEffect(() => {
    try {
      if (typeof pullInvestSelections === 'undefined' || pullInvestSelections === null) return;
      addLog(`DEBUG pullInvestSelections -> ${JSON.stringify(pullInvestSelections)}`);
    } catch (e) {}
  }, [pullInvestSelections]);

  // (prepareSprints was removed — sprint detection runs after group reassignment in flow)

  // All helper implementations (getPenalty, takesLeadFC, humanResponsibility,
  // getTeamMatesInGroup, pickValue, takesLeadFCFloating) were moved to
  // `src/game/gameLogic.js`. App now imports and uses the shared versions.
  const autoPlayTeam = (groupNum, teamName = currentTeam, minPace = undefined) => {
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
        try {
          const finishPos = track.indexOf('F');
          const fieldsLeft = Math.max(1, finishPos - (updatedCards[name].position || 0));
          const mult = 8 / Math.pow(fieldsLeft, 0.5);
          if (typeof updatedCards[name].win_chance !== 'undefined' && typeof updatedCards[name].win_chance_original === 'undefined') {
            updatedCards[name].win_chance_original = updatedCards[name].win_chance;
            updatedCards[name].win_chance = (updatedCards[name].win_chance || 0) * mult;
            try { addLog(`Attacker boost applied to ${name}: win_chance ${updatedCards[name].win_chance_original} -> ${updatedCards[name].win_chance.toFixed(2)} (mult=${mult.toFixed(3)}, fieldsLeft=${fieldsLeft})`); } catch(e) {}
          }
        } catch (e) {}
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
  const localPenalty = top4.filter(c => c && c.id && c.id.startsWith('TK-1')).length;

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
  
  // In choice-2, enforce that pace is at least minPace (if provided)
  if (typeof minPace !== 'undefined' && minPace > 0) {
    if (pace < minPace) {
      try { addLog(`${teamName} AI choice adjusted from ${pace} to ${minPace} (minPace constraint)`); } catch (e) {}
      pace = minPace;
    }
  }

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
  const breakawayCount = Math.min(numAttackers, total); // use slider value, capped at total riders

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
      const isBrostensbakke = typeof selectedTrack === 'string' && /B$/.test(selectedTrack);
      const isBrostenStar = typeof selectedTrack === 'string' && /\*$/.test(selectedTrack);

  // Compute puncheur factor multiplier per your formula:
  // multiplier = min(1, 3 / max(longest_hill, 3))
  // rpf = int(rider.PUNCHEUR * multiplier * puncheur_param)
  // NOTE: `puncheur_param` is a global/track parameter (not the rider's PUNCHEUR).
  // If you don't have a UI control for a global puncheur, we default it to 1.
  const puncheurField = Number(rider.PUNCHEUR) || 0;
  const puncheur_param = 1; // TODO: replace with UI value if you want control over overall puncheur strength
  const multiplier = Math.min(1, 3 / Math.max(longest, 3));
  const rpf = Math.trunc(puncheurField * multiplier * puncheur_param);

      // Determine X for card distribution:
      // - Brostensbakke ('B'): X = BROSTENSBAKKE field from CSV
      // - Brosten ('*'): X = BROSTEN only
      // - Normal tracks: X = PUNCHEUR only
      const brostenField = Number(rider.BROSTEN) || 0;
      const brostensbakkeField = Number(rider.BROSTENSBAKKE) || 0;
      let X;
      if (isBrostensbakke) {
        X = brostensbakkeField;
      } else if (isBrostenStar) {
        X = brostenField;
      } else {
        X = rpf;
      }

      // Build l[] per your snippet: 15 entries corresponding to BJERG1..BJERG15
      let l = [];
      if (X !== 0) {
        const absr = Math.abs(X);
        const step = 16 / (absr + 1);
        for (let k = 1; k <= 15; k++) {
          if ((k % step) < 1) {
            l.push(Math.trunc(X / absr));
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
      // then apply the distributed BROSTEN adjustments (l[]) on top. The aggregate
      // displayed Brosten stat will be FLAD + BROSTEN (CSV) and is handled
      // below.
      let sumL = 0;
      if (//.test('')) {} // noop to keep patch context stable
      if (typeof selectedTrack === 'string' && /\*$/.test(selectedTrack)) {
        // Brosten-star behaviour: uphill per-card = FLADk + l[k]
        // where l[] contains the distributed BROSTEN adjustments
        for (let k = 1; k <= 15; k++) {
          const fbase = Number(rider[`FLAD${k}`]) || Number(rider.FLAD) || 0;
          const delta = l[k - 1] || 0;
          modifiedRider[`BJERG${k}`] = Math.round(fbase + delta);
          sumL += delta;
        }
        // Aggregate Brosten stat is FLAD + BROSTEN (CSV) — do not include puncheur sum here
        modifiedRider.BJERG = Math.round((Number(rider.FLAD) || 0) + (Number(rider.BROSTEN) || 0));
      } else {
        // Default behaviour (normal BJERG or Brostensbakke 'B'): base on rider.BJERG and apply l[]
        for (let k = 1; k <= 15; k++) {
          const base = Number(rider[`BJERG${k}`]) || Number(rider.BJERG) || 0;
          const delta = l[k - 1] || 0;
          modifiedRider[`BJERG${k}`] = Math.round(base + delta);
          sumL += delta;
        }
        // For Brostensbakke tracks (ending with 'B'), the aggregate stat should be
        // BJERG + BROSTENSBAKKE (from CSV). For normal tracks, just use BJERG + sumL (puncheur).
        if (isBrostensbakke) {
          modifiedRider.BJERG = Math.round((Number(rider.BJERG) || 0) + brostensbakkeField);
        } else {
          modifiedRider.BJERG = Math.round((Number(rider.BJERG) || 0) + sumL);
        }
      }
    } catch (e) {
      // On any error fall back to original rider
    }

    cardsObj[rider.NAVN] = {
      position: isBreakaway ? attackerLeadFields : 0,
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
  
        // Get previous pace from choice-1 so AI doesn't choose lower
        const paceKey = `${groupNum}-${t}`;
        const existingMeta = (teamPaceMeta && teamPaceMeta[paceKey]) ? teamPaceMeta[paceKey] : null;
        const prevPaceFromMeta = (existingMeta && typeof existingMeta.prevPace !== 'undefined') ? existingMeta.prevPace : undefined;
        const prevPaceFromStore = (teamPaces && typeof teamPaces[paceKey] !== 'undefined') ? teamPaces[paceKey] : undefined;
        const prevPace = (typeof prevPaceFromMeta !== 'undefined') ? prevPaceFromMeta : prevPaceFromStore;

        // Run AI decision for this team, passing the minimum allowed pace
        const res = autoPlayTeam(groupNum, t, prevPace);
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
        // Enforce: in choice-2 AI may not lower their previously announced pace.
        if (typeof prevPace !== 'undefined' && currentRound === 2) {
          if (aiTeamPace < prevPace) {
            try { addLog(`${t} (AI) attempted to lower pace in choice-2 (${aiTeamPace} < ${prevPace}) — clamped to ${prevPace}`); } catch (e) {}
            aiTeamPace = prevPace;
          }
        }

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

  const handlePaceSubmit = (groupNum, pace, team = null, isAttack = false, attackerName = null, doubleLead = null) => {
    // doubleLead: { pace1, pace2, rider1, rider2 } when dobbeltføring is active
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
  
  // Handle dobbeltføring: if doubleLead is provided and values are within 1, apply +1 bonus
  let finalPace = parseInt(pace);
  let isDoubleLead = false;
  if (dobbeltføring && doubleLead && doubleLead.pace1 && doubleLead.pace2) {
    const p1 = parseInt(doubleLead.pace1);
    const p2 = parseInt(doubleLead.pace2);
    if (Math.abs(p1 - p2) <= 1) {
      finalPace = Math.max(p1, p2) + 1;
      isDoubleLead = true;
      addLog(`${submittingTeam} dobbeltføring: ${p1},${p2} → speed ${finalPace}`);
    }
  }
  
  const newTeamPaces = { ...teamPaces, [paceKey]: finalPace };
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
  // In choice-2 (round 2) NEW attacks are not allowed. If this team did
  // not declare an attack in round-1, block any attempt to start an attack
  // now and log the action for visibility.
  if (currentRound === 2 && !(existingMeta && existingMeta.isAttack && existingMeta.round === 1)) {
    if (effectiveIsAttack) {
      addLog(`${submittingTeam} attempted a new attack in choice-2 — blocked`);
      effectiveIsAttack = false;
      effectiveAttacker = null;
    }
  }
  // If we blocked a new attack in choice-2, ensure no riders remain marked
  // as attackers for this submitting team in this group (clear any stale flags).
  if (!effectiveIsAttack) {
    setCards(prev => {
      try {
        const updated = { ...prev };
        for (const [nm, rr] of Object.entries(updated)) {
          if (!rr) continue;
          if (rr.group === groupNum && rr.team === submittingTeam && (rr.attacking_status || '') === 'attacker') {
            updated[nm] = { ...rr, attacking_status: 'no', takes_lead: 0, selected_value: 0, planned_card_id: null, attack_card: null };
          }
        }
        return updated;
      } catch (e) { return prev; }
    });
  }
  // record which round this submission belongs to so we can distinguish
  // round-1 vs round-2 submissions when finalizing the group.
  // If this is a round-2 revise and we have a previous pace from round-1,
  // record it so downstream logic can determine whether the team's pace
  // actually changed during choice-2 (we only apply EC penalty when it did).
  const metaEntry = { 
    isAttack: effectiveIsAttack, 
    attacker: effectiveAttacker, 
    round: currentRound,
    doubleLead: isDoubleLead ? doubleLead : null
  };
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

    // Ensure a minimum group speed of 2 (UI-level guard). Downhill override below
    speed = Math.max(2, speed);
    if (track[groupPos] === '_') speed = Math.max(5, speed);
    let sv = getSlipstreamValue(groupPos, groupPos + speed, track);
    setGroupSpeed(speed);
    setSlipstream(getEffectiveSV(sv, speed));
    setIsFlat(sv === 3);

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
          setSlipstream(getEffectiveSV(newSv, speed));
          setIsFlat(newSv === 3);
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
            const localPenalty = top4Before.filter(c => c && c.id && c.id.startsWith('TK-1')).length;

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
  // Support 'nochange' choice during choice-2: submit the previous round-1
  // selection unchanged (if available). This avoids forcing the player to
  // re-select their previous choice when choice-2 is open.
  if (choice.type === 'nochange') {
    try {
      const paceKey = `${groupNum}-Me`;
      const meta = teamPaceMeta && teamPaceMeta[paceKey];
      const prev = (teamPaces && typeof teamPaces[paceKey] !== 'undefined') ? teamPaces[paceKey] : undefined;
      if (typeof prev !== 'undefined') {
        handlePaceSubmit(groupNum, prev, 'Me', !!(meta && meta.isAttack), (meta && meta.attacker) || null);
        return;
      }
    } catch (e) {}
    // fallback to follow if no previous data
    handlePaceSubmit(groupNum, 0, 'Me', false, null);
    return;
  }
  
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
    try {
      const finishPos = track.indexOf('F');
      const fieldsLeft = Math.max(1, finishPos - (updatedCards[attacker].position || 0));
      const mult = 8 / Math.pow(fieldsLeft, 0.5);
      if (typeof updatedCards[attacker].win_chance !== 'undefined' && typeof updatedCards[attacker].win_chance_original === 'undefined') {
        updatedCards[attacker].win_chance_original = updatedCards[attacker].win_chance;
        updatedCards[attacker].win_chance = (updatedCards[attacker].win_chance || 0) * mult;
        try { addLog(`Attacker boost applied to ${attacker}: win_chance ${updatedCards[attacker].win_chance_original} -> ${updatedCards[attacker].win_chance.toFixed(2)} (mult=${mult.toFixed(3)}, fieldsLeft=${fieldsLeft})`); } catch(e) {}
      }
    } catch (e) {}
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
    
  } else if (choice.type === 'doublelead') {
    // Two riders lead together
    const rider1 = choice.rider1;
    const rider2 = choice.rider2;
    const pace1 = choice.pace1;
    const pace2 = choice.pace2;
    
    humanRiders.forEach(name => {
      if (name === rider1) {
        updatedCards[name].selected_value = pace1;
        updatedCards[name].takes_lead = 1;
        updatedCards[name].attacking_status = 'no';
      } else if (name === rider2) {
        updatedCards[name].selected_value = pace2;
        updatedCards[name].takes_lead = 1;
        updatedCards[name].attacking_status = 'no';
      } else {
        updatedCards[name].selected_value = 0;
        updatedCards[name].takes_lead = 0;
        updatedCards[name].attacking_status = 'no';
      }
    });
    
    addLog(`Me: dobbeltføring ${rider1}(${pace1}), ${rider2}(${pace2})`);
    
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
  
  // Build doubleLead object if this is a doublelead choice
  const doubleLead = choice.type === 'doublelead' ? {
    pace1: choice.pace1,
    pace2: choice.pace2,
    rider1: choice.rider1,
    rider2: choice.rider2
  } : null;
  
  handlePaceSubmit(groupNum, teamPace, 'Me', isAttack, attackerName, doubleLead);
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
    // Prefer a team that actually has riders in the next group so we don't
    // land on an empty team and stall the UI. Use existing helper.
    const preferred = findNextTeamWithRiders(0, nextGroup);
    if (preferred) setCurrentTeam(preferred);
    else setCurrentTeam(shuffled[0]);
    setMovePhase('input');
    // clear stored invest outcome for this moved group so UI doesn't retain old results
    try {
      const gMoved = postMoveInfo && postMoveInfo.groupMoved;
      if (typeof gMoved !== 'undefined') {
        setPullInvestOutcome(prev => { const cp = { ...prev }; delete cp[gMoved]; return cp; });
      }
    } catch (e) {}
    setPostMoveInfo(null);
  } else {
    // No remaining groups -> start new round
    setPostMoveInfo(null);
    startNewRound();
  }
};

  const startNewRound = () => {
  // Prevent starting a new round while sprints are still pending.
  if (sprintGroupsPending && sprintGroupsPending.length > 0) {
    try {
      const nextSprint = Math.min(...sprintGroupsPending);
      addLog(`Sprints pending for groups: ${sprintGroupsPending.join(', ')} — focus sprint for group ${nextSprint}`);
      setSprintAnimMsgs([`Sprints pending: focus group ${nextSprint}`]);
      setSprintFocusGroup(nextSprint);
    } catch (e) {}
    return;
  }

  console.log('=== START NEW ROUND ===');
  // Clear any sprint animation messages when beginning a new round so
  // the top status box returns to the normal chosen-speed UI.
  try { setSprintAnimMsgs([]); } catch (e) {}
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
  // clear any stored invest outcomes from previous round
  setPullInvestOutcome({});
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
      // Ensure old_position matches current position at the start of the new round
      // so groups are not flagged as "moved" immediately after round rollover.
      old_position: Number(updatedCards[n].position || 0),
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
  