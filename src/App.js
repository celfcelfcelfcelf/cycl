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
  getEMoveLeftGC,
  getFavoritPointsGC,
  getTotalMovesLeftGC,
  getWinChanceGC,
  getPenalty,
  getFatigue,
  detectSprintGroups,
  detectMountainCrossing,
  calculateMountainPoints,
  processDobbeltforing,
  calculateGroupSpeed,
  getRandomTrack,
  generateCards,
  pickValue,
  takesLeadFC,
  colourTrackTokens,
  computeInitialStats,
  computeNonAttackerMoves,
  runSprintsPure,
  computeAttackerMoves,
  prepareNextStage
} from './game/gameLogic';
import { enforceBrosten } from './game/engine';
import EngineUI from './EngineUI';
import MultiplayerSetup from './components/MultiplayerSetup';
import MultiplayerLobby from './components/MultiplayerLobby';
import { 
  createGame, 
  joinGame, 
  subscribeToGame, 
  updateGameState,
  updateCurrentTurn,
  startMultiplayerGame,
  leaveGame,
  updatePlayerConnection,
  syncPlayerMove,
  syncAIMove
} from './firebase/gameService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase/config';
 
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
  'Saint-Julien-en-Saint-Alban  ›  Berre lÉtang': '333333333333333333333333333333333333333321_33333333333333333333FFFFFFFF',
  'Bukowina Resort  ›  Bukowina Tatrzańska (Polen, 25)': '3333333333333333333333333333320000011__33333333111112222FFFFFFFFF',
  'Sparkassen Münsterland Giro': '33333333333333333333333333333333333333333333333333333333333333FFFFFFFFFF',
  'Visegrad 4 Kerekparverseny': '33333333333333333333333333333333333333333333333111333333111FFFFFFFFFF',
  'Barcelona  ›  Barcelona, Catalonia (25, 7)': '322200_3333111322200_3333111322200_3333111322200_3333FFFFFFFF',
  'Huilongzhen  ›  Binhan Village  (Tour of Taihu Lake, 25, 3)': '333333333333333333333333333333333333333333333333FFFFFFFFFF',
  'Rundt um den Finanzplatz Eschborn-Frankfurt (2019)': '20011___3333333320011___3333333333333333333333333333333333333333FFFFFFFFFF',
  'Łańcut  ›  Rzeszów (Polen, 22, 5)': '31133333333331111333333333333333333333333333333333222_33333333333FFFFFFFFFF',
  'Gran Piemonte': '333111111112222__33333333333333333333111111112222__33333333333FFFFFFFFFF',
  'Küsnacht  ›  Küsnacht (Schweiz, 22, 1)': '33311110133__333333333333333333333333222221__3333311110133333FFFFFFFFFF',
'VM 2018 (Innsbruck)': '33333222111111111111__3333333222111111111111__333333311000001____333333FFFFFFFFFF',
'Östersund-Funäsdalen': '3333333333333333333333222222222222____3333333333333333333333333FFFFFFFFFF',
'Vitoria-Gasteiz  ›  Zamudio (Basque, 2022, 4)': '333333300000_33333333330000001111111111333333__3333333333333FFFFFFFFFF',
'Donostia San Sebastian Klasikoa': '11111111111111___33333333111100000___33333333333333000000_3333333FFFFFFFFFF',
'Brabantse Pijl': '33133313333333223332333331333133333332233323333313331333333322FFFFFFFFFFC',
'La Fleche Wallone': '23333333333311333333000000333333333322223333333333311333333000000FFFFFFFFFF',
'Omloop Het Nieuwsblad': '33323333323333333223311332233333333333311133113333333333333333FFFFFFFFFC'
}
// ========== TRACK BACKGROUND MAPPING ==========
// Maps track names to location-based background images
const getTrackBackground = (trackName) => {
  const trackBackgrounds = {
    // Classic Belgian Ardennes - Hilly forested regions
    'Liege-Bastogne-Liege': 'url("https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1600&q=80")', // Ardennes forest
    'La Fleche Wallone': 'url("https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1600&q=80")', // Ardennes
    
    // Northern France - Cobblestones
    'Paris-Roubaix': 'url("https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1600&q=80")', // Northern France countryside
    
    // Italian Riviera - Coastal
    'Milano - San Remo': 'url("https://images.unsplash.com/photo-1534113414509-0bd4d187a7d0?w=1600&q=80")', // Italian coast
    
    // Belgian Flanders - Flat/cobbles
    'FlandernRundt': 'url("https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1600&q=80")', // Belgian countryside
    'Omloop Het Nieuwsblad': 'url("https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1600&q=80")', // Belgium
    'Gent-Wevelgem': 'url("https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1600&q=80")', // Flanders
    'Dwars door Vlanderen': 'url("https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1600&q=80")', // Flanders
    'Brabantse Pijl': 'url("https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1600&q=80")', // Belgium
    
    // Netherlands - Flat/hilly
    'Amstel Gold Race': 'url("https://images.unsplash.com/photo-1534313314376-a34a6c5e7e9f?w=1600&q=80")', // Dutch hills
    
    // UK Yorkshire - Rolling hills
    'World Championship 2019 (Yorkshire)': 'url("https://images.unsplash.com/photo-1590268337347-9ac12e86b02a?w=1600&q=80")', // Yorkshire moors
    'Yorkshire': 'url("https://images.unsplash.com/photo-1590268337347-9ac12e86b02a?w=1600&q=80")', // Yorkshire
    
    // Mountain stages
    'Hautacam': 'url("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80")', // Pyrenees
    'GiroStage20 Finestre': 'url("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80")', // Italian Alps
    
    // Switzerland - Alpine
    'VM 2018 (Innsbruck)': 'url("https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1600&q=80")', // Austrian/Swiss Alps
    'Küsnacht  ›  Küsnacht (Schweiz, 22, 1)': 'url("https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1600&q=80")', // Switzerland
    'VM 24 Zurich': 'url("https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1600&q=80")', // Zurich
    
    // Spain - Varied terrain
    'Donostia San Sebastian Klasikoa': 'url("https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1600&q=80")', // Basque Country
    'Vitoria-Gasteiz  ›  Zamudio (Basque, 2022, 4)': 'url("https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1600&q=80")', // Basque
    'Barcelona  ›  Barcelona, Catalonia (25, 7)': 'url("https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1600&q=80")', // Barcelona
    
    // Germany - Varied
    'Rundt um den Finanzplatz Eschborn-Frankfurt (2019)': 'url("https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1600&q=80")', // German countryside
    'Sparkassen Münsterland Giro': 'url("https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1600&q=80")', // Germany
    'Kassel-Winterberg': 'url("https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1600&q=80")', // Germany
    
    // Scandinavia
    'Askersund-Ludvika': 'url("https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1600&q=80")', // Swedish forest
    'Östersund-Funäsdalen': 'url("https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=1600&q=80")', // Sweden
    
    // Italy - Various regions
    'Gran Piemonte': 'url("https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1600&q=80")', // Piedmont
    'Giro DellEmilia': 'url("https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1600&q=80")', // Italian hills
    'Parma-Genova': 'url("https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1600&q=80")', // Northern Italy
    'GP Industria': 'url("https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1600&q=80")', // Italy
    
    // Canada
    'GP Montreal': 'url("https://images.unsplash.com/photo-1517935706615-2717063c2225?w=1600&q=80")', // Montreal cityscape
    
    // Japan
    'Utsunomiya Japan Cup Road Race': 'url("https://images.unsplash.com/photo-1528164344705-47542687000d?w=1600&q=80")', // Japanese countryside
    
    // Middle East
    'UAE Tour': 'url("https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80")', // Dubai desert
    
    // Australia
    'Tour Down Under (24, E2 - Norwood-Lobethal)': 'url("https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1600&q=80")', // Australian landscape
    
    // Poland
    'Bukowina Resort  ›  Bukowina Tatrzańska (Polen, 25)': 'url("https://images.unsplash.com/photo-1505832018823-50331d70d237?w=1600&q=80")', // Polish Tatras
    'Łańcut  ›  Rzeszów (Polen, 22, 5)': 'url("https://images.unsplash.com/photo-1505832018823-50331d70d237?w=1600&q=80")', // Poland
    
    // France - Various
    'Classic Bretagne': 'url("https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80")', // Brittany coast
    'Saint-Julien-en-Saint-Alban  ›  Berre lÉtang': 'url("https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80")', // French countryside
    
    // Default: general cycling image
  };
  
  return trackBackgrounds[trackName] || 'url("https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1600&q=80")'; // Default cycling image
};

// ========== RIDER PHOTO MAPPING ==========
// Maps rider names to their photos - using UI Avatars with initials
const getRiderPhoto = (riderName) => {
  const encodedName = encodeURIComponent(riderName);
  return `https://ui-avatars.com/api/?name=${encodedName}&size=200&background=random&color=fff&bold=true`;
};

// ========== MAIN COMPONENT ==========
const CyclingGame = () => {
  // Multiplayer state
  const [gameMode, setGameMode] = useState(null); // null, 'single', 'multi'
  const [multiplayerMode, setMultiplayerMode] = useState(null); // null, 'create', 'join'
  const [roomCode, setRoomCode] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [multiplayerPlayers, setMultiplayerPlayers] = useState([]);
  const [multiplayerConfig, setMultiplayerConfig] = useState({
    numberOfTeams: 3,
    ridersPerTeam: 2,
    trackName: 'Yorkshire',
    track: '',
    isStageRace: false,
    stages: [],
    currentStageIndex: 0
  });
  const [inLobby, setInLobby] = useState(false);
  const unsubscribeRef = useRef(null);
  
  const [gameState, setGameState] = useState('setup');
  const gameInitializedRef = useRef(false); // Track if game has been initialized in multiplayer
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
  const [trackName, setTrackName] = useState('Yorkshire'); // Default, will be overridden by host selection or Firebase data
  const [track, setTrack] = useState('');
  const [numberOfTeams, setNumberOfTeams] = useState(3);
  const [ridersPerTeam, setRidersPerTeam] = useState(2);
  const [numberOfStages, setNumberOfStages] = useState(1); // number of stages (1-5)
  const [selectedStages, setSelectedStages] = useState([]); // array of {name, track} for multi-stage races
  const [currentStageIndex, setCurrentStageIndex] = useState(0); // which stage we're currently on
  const isStageRace = numberOfStages > 1; // boolean: true if stage race, false if single stage
  const [level, setLevel] = useState(50); // user-requested level slider 1-100 default 50
  const [numAttackers, setNumAttackers] = useState(1); // number of attackers (1-4)
  const [attackerLeadFields, setAttackerLeadFields] = useState(5); // fields ahead for attackers (1-10)
  const [tkPerTk1, setTkPerTk1] = useState(2); // TK-16 per TK-1 conversion rate (1-4)
  const [dobbeltføring, setDobbeltføring] = useState(true); // enable double-leading mechanic
  const [gcTestMode, setGcTestMode] = useState(false); // GC test mode: all stages use sprinttest
  const [manualStageSelection, setManualStageSelection] = useState([]); // Manual stage selection for stage races
  const [showStageSelector, setShowStageSelector] = useState(false); // Show stage selector modal
  
  // Update numAttackers default when numberOfTeams or ridersPerTeam changes
  useEffect(() => {
    const totalRiders = numberOfTeams * ridersPerTeam;
    const defaultAttackers = Math.ceil(totalRiders / 10);
    setNumAttackers(Math.min(defaultAttackers, 4)); // cap at 4
  }, [numberOfTeams, ridersPerTeam]);
  
  const [cards, setCards] = useState({});
  const [finalStandings, setFinalStandings] = useState([]); // accumulated finished riders {pos,name,time,timeSec,team}
  const [showClassifications, setShowClassifications] = useState(false); // modal for GC/prize/points
  const [showStages, setShowStages] = useState(false); // modal for showing stages in race
  const [showPrizeMoney, setShowPrizeMoney] = useState(false); // modal for prize money rules
  const [intermediateSprintOpen, setIntermediateSprintOpen] = useState(false); // modal for intermediate sprint at stage start
  const [intermediateSprintSelections, setIntermediateSprintSelections] = useState({}); // {riderName: value (0,1,2)}
  const [intermediateSprintResults, setIntermediateSprintResults] = useState(null); // {results: [{name, intSprintPoint, effort, points, timeBonus}]}
  const [finalBonusesAwarded, setFinalBonusesAwarded] = useState(false); // track if final bonuses were awarded
  const [round, setRound] = useState(0);
  const [currentGroup, setCurrentGroup] = useState(0);
  const [teams, setTeams] = useState([]);
  const [pullConfirmGroup, setPullConfirmGroup] = useState(null);
  const [pullInvestGroup, setPullInvestGroup] = useState(null);
  const [pullInvestTeam, setPullInvestTeam] = useState(null);
  const [pullInvestSelections, setPullInvestSelections] = useState([]);
  const [pullInvestButtonsDisabled, setPullInvestButtonsDisabled] = useState(false);
  const [teamBaseOrder, setTeamBaseOrder] = useState([]); // fixed base order assigned at game start
  const cardsSnapshotRef = useRef(null); // Store cards snapshot to avoid React state timing issues
  const processedInvestsRef = useRef(new Set());
  const addingInvestRef = useRef(new Set());
  const pullInvestHandledRef = useRef(new Set());
  const teamPacesRef = useRef({}); // Sync accumulator for teamPaces to avoid React state timing issues
  const teamPaceMetaRef = useRef({}); // Sync accumulator for teamPaceMeta to avoid React state timing issues
  const teamPaceRoundRef = useRef({}); // Track which round each team submitted for to prevent double submissions
  const roomCodeRef = useRef(null); // Ref to avoid closure issues with roomCode state
  const currentTeamRef = useRef('Me'); // Ref to avoid closure issues
  const currentGroupRef = useRef(0); // Ref to avoid closure issues
  const movePhaseRef = useRef('input'); // Ref to avoid closure issues
  const cardsRef = useRef({}); // Ref to avoid closure issues with cards state
  const postMoveInfoRef = useRef(null); // Ref to avoid closure issues with postMoveInfo state
  const roundRef = useRef(0); // Ref to avoid closure issues with round state
  const isLoadingFromFirebaseRef = useRef(false); // Prevent syncing while loading from Firebase
  const [currentTeam, setCurrentTeam] = useState('Me');
  const [teamColors, setTeamColors] = useState({});
  const [teamTextColors, setTeamTextColors] = useState({});
  const topTilesRef = useRef(null);
  const dobbeltføringLeadersRef = useRef([]);
  const teamPacesForGroupRef = useRef({});
  const groupSpeedRef = useRef(0); // Store groupSpeed for card selection dialog
  const slipstreamRef = useRef(0); // Store effective slipstream for card selection dialog
  const rawSVRef = useRef(3); // Store raw SV from terrain for card value selection
  const cardSelectionOpenedForGroupRef = useRef(null); // Track which group card selection was opened for
  const allGroupsThisTurnRef = useRef([]); // Track all group positions in current turn for slipstream catches
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
      const isBrosten = typeof selectedTrackStr === 'string' && /[B\*CX]$/.test(selectedTrackStr);
      // puncheur multiplier per-track (not multiplied by rider.PUNCHEUR)
  const puncheur_factor = Math.min(1, 3 / Math.max(longest, 3));
      const puncheur_param = 1; // global control placeholder
      
      // Declare puncheurField once here (will be used later for both rpf and C-track calculations)
      const puncheurField = Number(riderObj.puncheur || riderObj.PUNCHEUR) || 0;
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
      
      // Try both lowercase and uppercase field names (cards use lowercase, ridersData use uppercase)
      const brostenField = Number(riderObj.brosten || riderObj.BROSTEN) || 0;
      const brostensbakkeField = Number(riderObj.brostensbakke || riderObj.BROSTENSBAKKE) || 0;
      const bjergField = Number(riderObj.bjerg || riderObj.BJERG) || 0;
      const fladField = Number(riderObj.flad || riderObj.FLAD) || 0;
      
      // If track ends with '*' we show Brosten = FLAD + BROSTEN
      let modifiedBJERG;
      if (typeof selectedTrackStr === 'string' && /\*$/.test(selectedTrackStr)) {
        modifiedBJERG = Math.round(fladField + brostenField);
      } else if (typeof selectedTrackStr === 'string' && /X$/.test(selectedTrackStr)) {
        // For Brostens(bakke) tracks (ending with 'X'), use BJERG + Brostens(bakke)
        // where Brostens(bakke) = (FLAD + BROSTEN + BJERG + BROSTENSBAKKE) / 2 - BJERG
        const brostensBakke = (fladField + brostenField + bjergField + brostensbakkeField) / 2 - bjergField;
        modifiedBJERG = Math.round(bjergField + brostensBakke);
      } else if (typeof selectedTrackStr === 'string' && /C$/.test(selectedTrackStr)) {
        // For Brostensbakke+Puncheur tracks (ending with 'C'), use BJERG + (BROSTENSBAKKE + PUNCHEUR)/2
        modifiedBJERG = Math.round(bjergField + (brostensbakkeField + puncheurField) / 2);
      } else if (typeof selectedTrackStr === 'string' && /B$/.test(selectedTrackStr)) {
        // For Brostensbakke tracks (ending with 'B'), use BJERG + BROSTENSBAKKE
        modifiedBJERG = Math.round(bjergField + brostensbakkeField);
      } else {
        // otherwise include puncheur sum and plain BROSTEN
        const sumTotal = sumL + (isBrosten ? brostenField : 0);
        modifiedBJERG = Math.round(bjergField + sumTotal);
      }

      let label = 'BJERG';
  if (typeof selectedTrackStr === 'string' && /X$/.test(selectedTrackStr)) label = 'BROSTENS(BAKKE)';
  else if (typeof selectedTrackStr === 'string' && /C$/.test(selectedTrackStr)) label = '(BROSTENS)BAKKE';
  else if (typeof selectedTrackStr === 'string' && /B$/.test(selectedTrackStr)) label = 'Brostensbakke';
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
  // Track pull/invest submissions from teams in multiplayer
  const [teamPullInvests, setTeamPullInvests] = useState({});
  const teamPullInvestsRef = useRef({});
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
  const [slipstream, setSlipstream] = useState(0); // Effective SV (based on speed)
  const [rawSV, setRawSV] = useState(3); // Raw SV from terrain (minimum terrain value in segment)
  const [isFlat, setIsFlat] = useState(true); // Track if terrain is flat (sv === 3)
  const [waitingForCardSelections, setWaitingForCardSelections] = useState(false); // Track if HOST is waiting for other players
  
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
      const res1 = takesLeadFC(riderName, cardsState, trackStr, numberOfTeams, false, false, [], logger, rng1, isStageRace);
      const res2 = takesLeadFC(riderName, cardsState, trackStr, numberOfTeams, false, false, [], logger, rng2, isStageRace);
      const res3 = takesLeadFC(riderName, cardsState, trackStr, numberOfTeams, false, false, [], logger, rng3, isStageRace);
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
        // All riders from the original group can invest, including both AI and human riders,
        // even if the attacker has crossed the finish line.
        const eligibleInvestors = membersLocal;

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
                  // RULE: CALL BACK ATTACKERS = 2 MK (TK-1) total
                  // - 1st invested MK goes to hand (cards)
                  // - 2nd invested MK goes to discarded
                  const topInsert = { id: 'TK-1: 99', flat: -1, uphill: -1 };
                  const extrasToDiscard = Math.max(0, toAdd - 1);
                  const newCards = [topInsert, ...prevCards];
                  
                  const prevDiscarded = Array.isArray(updated[chosen].discarded) ? updated[chosen].discarded : [];
                  const newDiscarded = extrasToDiscard > 0 ? [...prevDiscarded, ...Array(extrasToDiscard).fill({ id: 'TK-1: 99', flat: -1, uphill: -1 })] : prevDiscarded;
                  
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
        const playerTeam = getPlayerTeamName();
        const teamsMap = {};
        for (const [nm, rr] of eligibleInvestors) {
          if (!rr) continue;
          if (rr.team === playerTeam) continue;
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
                  const topInsert = { id: 'TK-1: 99', flat: -1, uphill: -1 };
                  const extrasToDiscard = Math.max(0, toAdd - 1);
                  const prevDiscarded = Array.isArray(updated[nm].discarded) ? updated[nm].discarded : [];
                  const newDiscarded = extrasToDiscard > 0 ? [...prevDiscarded, ...Array(extrasToDiscard).fill({ id: 'TK-1: 99', flat: -1, uphill: -1 })] : prevDiscarded;
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
        
        // RULE: CALL BACK ATTACKERS
        // - Riders within SV of attackers can call them back.
        // - Cost: Total 2 TK-1 cards (invested by any riders in the group).
        // - Each team chooses 0, 1, or 2 TK-1.
        // - < 2 TK-1 total: Attackers go free.
        // - >= 2 TK-1 total: Attackers are pulled back to the group.
        // - Only riders in the group can invest.

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
  
  // Keep roomCodeRef in sync with roomCode state to avoid closure issues
  useEffect(() => {
    roomCodeRef.current = roomCode;
    console.log('🔗 roomCodeRef updated:', roomCode);
  }, [roomCode]);
  
  // Keep other refs in sync to avoid closure issues in syncMoveToFirebase
  useEffect(() => {
    currentTeamRef.current = currentTeam;
  }, [currentTeam]);
  
  useEffect(() => {
    currentGroupRef.current = currentGroup;
    // Clear confirmMove guard when moving to a new group
    // This allows confirmMove to be called for the new group
    confirmMoveCalledForGroupRef.current = null;
    leaderAssignedForGroupRef.current = null;
    console.log('🔄 Cleared confirmMoveCalledForGroupRef and leaderAssignedForGroupRef for new group:', currentGroup);
  }, [currentGroup]);
  
  useEffect(() => {
    movePhaseRef.current = movePhase;
    // Clear confirmMove guard when entering input phase (pace selection)
    // This allows confirmMove to be called again for this group
    if (movePhase === 'input') {
      confirmMoveCalledForGroupRef.current = null;
      leaderAssignedForGroupRef.current = null;
      console.log('🔄 Cleared confirmMoveCalledForGroupRef and leaderAssignedForGroupRef on input phase');
    }
  }, [movePhase]);
  
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);
  
  useEffect(() => {
    roundRef.current = round;
  }, [round]);
  
  useEffect(() => {
    postMoveInfoRef.current = postMoveInfo;
  }, [postMoveInfo]);
  
  useEffect(() => {
    roundRef.current = round;
  }, [round]);
  
  // Keep teamPaceRound ref in sync with state for Firebase sync
  useEffect(() => {
    teamPaceRoundRef.current = teamPaceRound;
  }, [teamPaceRound]);
  
  // Sync cards to Firebase when movePhase becomes 'roundComplete' (after group reassignment)
  // This ensures both HOST and JOINER see updated positions in footer after all groups move
  useEffect(() => {
    if (movePhase !== 'roundComplete') return;
    if (!roomCodeRef.current || !isHost) return;
    
    console.log('🚀 movePhase=roundComplete: Syncing group reassignment to Firebase');
    const timer = setTimeout(() => {
      syncMoveToFirebase().catch(err => console.error('Failed to sync roundComplete:', err));
    }, 150);
    
    return () => clearTimeout(timer);
  }, [movePhase, isHost]);
  
  // Award final bonuses when last stage is complete
  useEffect(() => {
    if (!isStageRace || finalBonusesAwarded) return;
    
    const allRidersFinished = Object.values(cards).length > 0 && Object.values(cards).every(r => r.finished);
    const isLastStage = currentStageIndex === numberOfStages - 1;
    
    if (allRidersFinished && isLastStage) {
      const updatedCards = { ...cards };
      
      // Get GC classification (sorted by gc_time)
      const gcRanking = Object.entries(updatedCards)
        .map(([name, r]) => ({ name, gc_time: typeof r.gc_time === 'number' ? r.gc_time : Infinity }))
        .sort((a, b) => a.gc_time - b.gc_time);
      
      // Get Points classification (sorted by points)
      const pointsRanking = Object.entries(updatedCards)
        .map(([name, r]) => ({ name, points: typeof r.points === 'number' ? r.points : 0 }))
        .sort((a, b) => b.points - a.points);
      
      // Award GC bonuses
      if (gcRanking.length > 0 && gcRanking[0].gc_time !== Infinity) {
        const gc1 = gcRanking[0].name;
        updatedCards[gc1].prize_money = (updatedCards[gc1].prize_money || 0) + 20000;
        addLog(`🏆 GC Winner: ${gc1} receives 20,000 prize money!`);
      }
      if (gcRanking.length > 1 && gcRanking[1].gc_time !== Infinity) {
        const gc2 = gcRanking[1].name;
        updatedCards[gc2].prize_money = (updatedCards[gc2].prize_money || 0) + 12000;
        addLog(`🥈 GC 2nd: ${gc2} receives 12,000 prize money!`);
      }
      if (gcRanking.length > 2 && gcRanking[2].gc_time !== Infinity) {
        const gc3 = gcRanking[2].name;
        updatedCards[gc3].prize_money = (updatedCards[gc3].prize_money || 0) + 8000;
        addLog(`🥉 GC 3rd: ${gc3} receives 8,000 prize money!`);
      }
      
      // Award Points classification bonus
      if (pointsRanking.length > 0 && pointsRanking[0].points > 0) {
        const points1 = pointsRanking[0].name;
        updatedCards[points1].prize_money = (updatedCards[points1].prize_money || 0) + 5000;
        addLog(`🟢 Points Winner: ${points1} receives 5,000 prize money!`);
      }
      
      setCards(updatedCards);
      setFinalBonusesAwarded(true);
      addLog('=== STAGE RACE COMPLETE - FINAL BONUSES AWARDED ===');
    }
  }, [cards, isStageRace, currentStageIndex, numberOfStages, finalBonusesAwarded]);

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
      
      // Use the SV from the actual move (stored in postMoveInfo), not recalculated
      const sv = (p.sv !== undefined) ? p.sv : 0;
      
      addLog(`🔍 Pull-back check: group ${g}, groupMainPos=${groupMainPos}, sv=${sv}, attackers=${attackers.length}`);
      
      const canPull = attackers.some(([name, r]) => {
        const pos = Number(r.position || 0);
        const dist = pos - groupMainPos;
        const withinRange = pos > groupMainPos && groupMainPos + sv >= pos;
        addLog(`🔍 Attacker ${name}: pos=${pos}, dist=${dist}, withinRange=${withinRange}`);
        return withinRange;
      });
      
      addLog(`🔍 canPull=${canPull}`);
      
      // Only auto-open if attackers are within range
      if (!canPull) return;
      
      const playerTeam = getPlayerTeamName();
      const humanHasEligible = members.some(([, r]) => r.team === playerTeam && !r.finished && (r.attacking_status || '') !== 'attacker' && (Number(r.position) || 0) >= groupMainPos);
      if (humanHasEligible) {
        try { addLog(`Auto-opening pull-invest modal for ${playerTeam} group ${g}`); } catch (e) {}
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

  // Auto-trigger AI moves in multiplayer mode (host only)
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (movePhase !== 'input') return;
    if (gameMode !== 'multi') return;
    if (!isHost) return; // Only host runs AI moves
    
    // Check if current team is an AI team (starts with "Comp")
    if (!currentTeam || !currentTeam.startsWith('Comp')) return;
    
    // Check if there are riders for this AI team in the current group
    const aiRiders = Object.entries(cards).filter(([, r]) => 
      r.team === currentTeam && r.group === currentGroup && !r.finished
    );
    
    if (aiRiders.length === 0) {
      console.log('🤖 Team', currentTeam, 'has no riders in group', currentGroup, '- skipping to next team');
      
      // In multiplayer, HOST should advance to next team automatically
      if (gameMode === 'multi' && isHost) {
        // Build teams array and find next team
        const teamsArray = teams.length > 0 ? teams : Array.from(new Set(Object.values(cards).map(r => r.team)));
        const teamIdx = teamsArray.indexOf(currentTeam);
        const nextIdx = (teamIdx + 1) % teamsArray.length;
        const nextTeam = teamsArray[nextIdx];
        
        if (nextTeam && nextTeam !== currentTeam) {
          console.log('🤖 Auto-advancing to next team:', nextTeam);
          setTimeout(() => {
            setCurrentTeam(nextTeam);
            // Sync to Firebase
            if (roomCode) {
              updateGameState(roomCode, { 
                currentTeam: nextTeam,
                lastUpdate: serverTimestamp()
              }).catch(err => console.error('Failed to sync team skip:', err));
            }
          }, 500);
        }
      }
      
      return;
    }
    
    console.log('🤖 Auto-triggering AI move for', currentTeam, 'in group', currentGroup);
    
    // Small delay to let UI update, then trigger AI move
    const timer = setTimeout(() => {
      console.log('🤖 AI timer fired for', currentTeam);
      try {
        const paceKey = `${currentGroup}-${currentTeam}`;
        const existingMeta = (teamPaceMeta && teamPaceMeta[paceKey]) ? teamPaceMeta[paceKey] : null;
        const prevPaceFromMeta = (existingMeta && typeof existingMeta.prevPace !== 'undefined') ? existingMeta.prevPace : undefined;
        const prevPaceFromStore = (teamPaces && typeof teamPaces[paceKey] !== 'undefined') ? teamPaces[paceKey] : undefined;
        const prevPace = (typeof prevPaceFromMeta !== 'undefined') ? prevPaceFromMeta : prevPaceFromStore;
        const currentRound = (teamPaceRound && teamPaceRound[currentGroup]) ? teamPaceRound[currentGroup] : 1;
        
        // Guard: If AI has already submitted for this round, do not re-submit
        // IMPORTANT: For round 2, we MUST allow re-submission if the previous submission was for round 1
        // The check existingMeta.round >= currentRound handles this correctly:
        // - If currentRound is 1 and existing is 1: 1 >= 1 (true) -> skip
        // - If currentRound is 2 and existing is 1: 1 >= 2 (false) -> proceed
        // - If currentRound is 2 and existing is 2: 2 >= 2 (true) -> skip
        if (existingMeta && existingMeta.round >= currentRound) {
          console.log(`🤖 AI ${currentTeam} already submitted for group ${currentGroup} round ${currentRound} - skipping`);
          return;
        }

        console.log('🤖 Calling autoPlayTeam for', currentTeam, 'group', currentGroup);
        const result = autoPlayTeam(currentGroup, currentTeam, currentRound === 2 ? prevPace : undefined);
        console.log('🤖 autoPlayTeam returned:', !!result);
        
        if (result) {
          setCards(result.updatedCards);
          const teamRiders = Object.entries(result.updatedCards)
            .filter(([, r]) => r.group === currentGroup && r.team === currentTeam)
            .map(([n, r]) => ({ name: n, ...r }));
          
          const nonAttackerPaces = teamRiders
            .filter(r => r.attacking_status !== 'attacker')
            .map(r => Math.round(r.selected_value || 0));
          
          let aiTeamPace = nonAttackerPaces.length > 0 ? Math.max(...nonAttackerPaces) : 0;
          const aiIsAttack = teamRiders.some(r => r.attacking_status === 'attacker');
          const aiDoubleLead = result.doubleLead || null;
          
          // Enforce: in choice-2 AI may not lower their previously announced pace
          if (typeof prevPace !== 'undefined' && currentRound === 2 && aiTeamPace < prevPace) {
            addLog(`${currentTeam} (AI auto) attempted to lower pace in choice-2 (${aiTeamPace} < ${prevPace}) — clamped to ${prevPace}`);
            aiTeamPace = prevPace;
          }
          
          const aiAttackerName = (teamRiders.find(r => r.attacking_status === 'attacker') || {}).name || null;
          setAiMessage(`${currentTeam} has chosen ${aiTeamPace}`);
          console.log('🤖 About to call handlePaceSubmit:', { currentGroup, aiTeamPace, currentTeam, aiIsAttack, aiAttackerName });
          handlePaceSubmit(currentGroup, aiTeamPace, currentTeam, aiIsAttack, aiAttackerName, aiDoubleLead, result.updatedCards);
          console.log('🤖 handlePaceSubmit completed');
        } else {
          console.warn('⚠️ autoPlayTeam returned no result for', currentTeam);
        }
      } catch (error) {
        console.error('Error in AI auto-trigger:', error);
      }
    }, 1000); // Increased to 1000ms to ensure previous move completes
    
    return () => clearTimeout(timer);
  }, [gameState, movePhase, gameMode, isHost, currentTeam, currentGroup]);

  // ========== MULTIPLAYER HANDLERS ==========
  
  // Handle creating a multiplayer game (called after setup screen)
  const handleCreateMultiplayerGame = async (hostName) => {
    try {
      setPlayerName(hostName);
      
      // Use current setup configuration
      const config = {
        numberOfTeams,
        ridersPerTeam,
        trackName,
        track: getResolvedTrack(),
        isStageRace: numberOfStages > 1,
        stages: selectedStages,
        currentStageIndex: 0,
        level,
        numAttackers,
        attackerLeadFields,
        tkPerTk1,
        dobbeltføring
      };
      
      const code = await createGame(hostName, config);
      setRoomCode(code);
      setIsHost(true);
      setInLobby(true);
      setGameMode('multi');
      
      // Subscribe to game updates
      const unsubscribe = subscribeToGame(code, (gameData) => {
        if (!gameData) {
          // Game was deleted
          handleLeaveLobby();
          return;
        }
        
        setMultiplayerPlayers(gameData.players || []);
        
        // If game started playing, initialize the game locally
        if (gameData.status === 'playing' && !gameInitializedRef.current) {
          console.log('📥 HOST (lobby): Game started, status=playing');
          const draftedFromFirebase = gameData.draftSelections || [];
          console.log('📥 HOST (lobby): draftSelections from Firebase:', draftedFromFirebase?.length);
          setInLobby(false);
          
          // Initialize game with draft selections from Firebase
          if (draftedFromFirebase && draftedFromFirebase.length > 0) {
            console.log('📥 HOST (lobby): Initializing game with', draftedFromFirebase.length, 'selections');
            console.log('📥 HOST (lobby): First selection:', draftedFromFirebase[0]?.rider?.NAVN, 'team:', draftedFromFirebase[0]?.team);
            console.log('📥 HOST (lobby): Breakaway teams:', gameData.breakawayTeams);
            console.log('📥 HOST (lobby): Team order:', gameData.teamOrder);
            console.log('📥 HOST (lobby): Starting team:', gameData.currentTeam);
            gameInitializedRef.current = true; // Mark as initialized immediately
            initializeGame(
              draftedFromFirebase, 
              selectedStages, 
              gameData.breakawayTeams, 
              'multi', 
              gameData.players, 
              gameData.teamOrder || null, 
              gameData.currentTeam || null
            );
            setDraftPool([]);
            setDraftRemaining([]);
            setDraftSelections([]);
            setDraftTeamsOrder([]);
            setDraftCurrentPickIdx(0);
            setIsDrafting(false);
            setGameState('playing');
            return; // Exit early
          } else {
            console.log('📥 HOST (lobby): Cannot initialize - no selections in Firebase');
          }
        }
        
        // If game started drafting, only update gameState (host has already set draft data locally)
        if (gameData.status === 'drafting' && gameData.draftData) {
          setInLobby(false);
          setGameMode('multi');
          setGameState(current => {
            if (current === 'draft' || current === 'playing') return current;
            // Host should NOT reload data from Firebase - it was already set locally
            // Just transition to draft state (do nothing else)
            return 'draft';
          });
        }
        
        // If already playing, continuously sync game state updates
        // Load updates whenever Firebase has new data, regardless of local React state
        if (gameData.status === 'playing' && gameInitializedRef.current) {
          console.log('📥 HOST: Game playing, checking for game state updates');
          console.log('📥 HOST: gameState type:', typeof gameData.gameState, 'value:', gameData.gameState);
          console.log('📥 HOST: currentTeam at root:', gameData.currentTeam);
          console.log('📥 HOST: Setting gameMode to multi');
          
          // Ensure gameMode is set to 'multi' when playing multiplayer
          setGameMode('multi');
          
          // Check if gameState is an object with actual state data (not just 'playing' string)
          if (gameData.gameState && typeof gameData.gameState === 'object') {
            console.log('📥 HOST: Loading game state updates from Firebase (from gameState object)');
            console.log('📥 HOST: currentTeam from gameState:', gameData.gameState.currentTeam);
            console.log('📥 HOST: lastUpdate from document:', gameData.lastUpdate);
            // Pass lastUpdate from document root (it's not inside gameState)
            loadMultiplayerGameState({
              ...gameData.gameState,
              lastUpdate: gameData.lastUpdate
            }, gameData.players, hostName);
          } else if (gameData.currentTeam !== undefined) {
            // Fallback: if currentTeam is at document root, use that
            console.log('📥 HOST: currentTeam found at root level, constructing state object');
            loadMultiplayerGameState({
              currentTeam: gameData.currentTeam,
              currentGroup: gameData.currentGroup,
              movePhase: gameData.movePhase,
              round: gameData.round,
              cards: gameData.cards,
              teamPaces: gameData.teamPaces,
              teamPaceMeta: gameData.teamPaceMeta,
              teamPaceRound: gameData.teamPaceRound,
              groupSpeed: gameData.groupSpeed,
              slipstream: gameData.slipstream,
              logs: gameData.logs,
              postMoveInfo: gameData.postMoveInfo,
              lastUpdate: gameData.lastUpdate
            }, gameData.players, hostName);
          }
        }
      });
      
      unsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error('Failed to create game:', error);
      alert('Failed to create game: ' + error.message);
    }
  };
  
  // Handle joining a multiplayer game
  const handleJoinGame = async (code, name) => {
    try {
      setPlayerName(name);
      const team = await joinGame(code, name);
      setRoomCode(code);
      setIsHost(false);
      setInLobby(true);
      
      // Subscribe to game updates
      const unsubscribe = subscribeToGame(code, (gameData) => {
        console.log('📥 JOINER: Subscriber called, status:', gameData?.status, 'gameState:', gameState, 'gameInitialized:', gameInitializedRef.current);
        if (!gameData) {
          handleLeaveLobby();
          return;
        }
        
        console.log('📥 Players from Firebase:', gameData.players);
        console.log('📥 My name from parameter:', name);
        setMultiplayerPlayers(gameData.players || []);
        
        // If game started playing, initialize the game locally
        if (gameData.status === 'playing' && !gameInitializedRef.current) {
          console.log('📥 JOINER: Game started, initializing...');
          const draftedFromFirebase = gameData.draftSelections || [];
          console.log('📥 JOINER: Draft selections from Firebase:', draftedFromFirebase?.length);
          setInLobby(false);
          
          // Initialize game with draft selections from Firebase
          if (draftedFromFirebase && draftedFromFirebase.length > 0) {
            console.log('📥 JOINER: First selection:', draftedFromFirebase[0]?.rider?.NAVN, 'team:', draftedFromFirebase[0]?.team);
            console.log('📥 JOINER: Breakaway teams:', gameData.breakawayTeams);
            console.log('📥 JOINER: Team order:', gameData.teamOrder);
            console.log('📥 JOINER: Starting team:', gameData.currentTeam);
            gameInitializedRef.current = true; // Mark as initialized immediately
            initializeGame(
              draftedFromFirebase, 
              selectedStages, 
              gameData.breakawayTeams, 
              'multi', 
              gameData.players, 
              gameData.teamOrder || null, 
              gameData.currentTeam || null
            );
            setDraftPool([]);
            setDraftRemaining([]);
            setDraftSelections([]);
            setDraftTeamsOrder([]);
            setDraftCurrentPickIdx(0);
            setIsDrafting(false);
            setGameState('playing');
            return; // Exit early, don't process draft updates
          } else {
            console.log('⚠️ JOINER: No draft selections in Firebase!', gameData);
          }
        }
        
        // If game started drafting, load draft data from Firebase (JOINER LOADS DATA)
        if (gameData.status === 'drafting' && gameData.draftData) {
          setInLobby(false);
          
          setGameState(current => {
            console.log('🔵 JOINER: setGameState callback, current:', current, 'status:', gameData.status);
            if (current === 'draft' || current === 'playing') {
              // Already in draft - just sync selections if they changed
              if (gameData.draftData.selections && Array.isArray(gameData.draftData.selections)) {
                console.log('🔄 JOINER: Syncing selections from Firebase:', gameData.draftData.selections.length, 'current:', draftSelections.length);
                
                const syncedSelections = gameData.draftData.selections.map(s => {
                  const rider = ridersData.find(r => r.NAVN === s.riderName);
                  return { team: s.team, rider: rider || { NAVN: s.riderName } };
                });
                
                // Only update if selections count changed
                if (syncedSelections.length > draftSelections.length) {
                  console.log('🔄 JOINER: Updating selections to', syncedSelections.length);
                  setDraftSelections(syncedSelections);
                  
                  // Recalculate remaining riders using full pool from Firebase
                  const pickedNames = syncedSelections.map(s => s.rider.NAVN);
                  const fullPool = gameData.draftData.pool.map(r => ridersData.find(rd => rd.NAVN === r.NAVN)).filter(Boolean);
                  const newRemaining = fullPool.filter(r => !pickedNames.includes(r.NAVN));
                  setDraftRemaining(newRemaining);
                  
                  // Continue processing with updated data
                  // Use teamsOrder and pickSequence from Firebase draftData, not from state
                  setTimeout(() => {
                    console.log('🔄 JOINER: Calling processNextPick after sync');
                    processNextPick(
                      newRemaining, 
                      gameData.draftData.teamsOrder, 
                      syncedSelections, 
                      gameData.draftData.pickSequence, 
                      'multi', 
                      name, 
                      gameData.players
                    );
                  }, 150);
                }
              }
              return current;
            }
            
            // Initial setup - load draft data for non-host players (JOINERS)
            if (current === 'setup' && gameData.draftData) {
              const { pool, trackName: draftTrackName, track: draftTrack, stages, numberOfTeams: draftTeams, ridersPerTeam: draftRidersPerTeam, teamsOrder: draftTeamsOrder, pickSequence: draftPickSequence } = gameData.draftData;
              
              console.log('🔵 JOINER: Initial draft setup, players:', gameData.players);
              
              // Set track and stages from draft data
              setTrackName(draftTrackName);
              setTrack(draftTrack);
              if (stages && stages.length > 0) {
                setSelectedStages(stages);
                setCurrentStageIndex(0);
              }
              setNumberOfTeams(draftTeams);
              setRidersPerTeam(draftRidersPerTeam);
              
              // IMPORTANT: Set multiplayer state BEFORE starting draft
              // This ensures processNextPick has the correct values
              setGameMode('multi');
              setMultiplayerPlayers(gameData.players || []);
              
              // Reconstruct full rider objects (matching what host has)
              const fullPool = pool.map(r => {
                const fullRider = ridersData.find(rd => rd.NAVN === r.NAVN);
                return fullRider || r;
              });
              
              // Set draft state directly with shared data
              setDraftPool(fullPool);
              setDraftRemaining(fullPool);
              setDraftSelections([]);
              setDraftTeamsOrder(draftTeamsOrder);
              setDraftPickSequence(draftPickSequence);
              setDraftCurrentPickIdx(0);
              setDraftRoundNum(1);
              setDraftTotalPicks(fullPool.length);
              setIsDrafting(true);
              
              // Wait longer to ensure state is set before calling processNextPick
              // IMPORTANT: Pass gameMode='multi' and players directly to avoid React state timing issues
              // Use 'name' parameter from handleJoinGame closure instead of playerName state
              setTimeout(() => {
                processNextPick(
                  fullPool, 
                  draftTeamsOrder, 
                  [], 
                  draftPickSequence,
                  'multi', // gameMode override
                  name, // playerName from handleJoinGame parameter (not React state!)
                  gameData.players // multiplayerPlayers override
                );
              }, 300);
            }
            console.log('🔵 JOINER: setGameState returning: draft');
            return 'draft';
          });
        }
        
        // If game started, transition to playing (but don't override draft state)
        if (gameData.status === 'playing' && gameInitializedRef.current) {
          console.log('📥 JOINER: Game playing, checking for game state updates');
          console.log('📥 JOINER: gameState type:', typeof gameData.gameState, 'value:', gameData.gameState);
          console.log('📥 JOINER: currentTeam at root:', gameData.currentTeam);
          setInLobby(false);
          
          // Check if gameState is an object with actual state data (not just 'playing' string)
          if (gameData.gameState && typeof gameData.gameState === 'object') {
            console.log('📥 JOINER: Loading game state updates from Firebase (from gameState object)');
            console.log('📥 JOINER: currentTeam from gameState:', gameData.gameState.currentTeam);
            console.log('📥 JOINER: lastUpdate from document:', gameData.lastUpdate);
            // Pass lastUpdate from document root (it's not inside gameState)
            loadMultiplayerGameState({
              ...gameData.gameState,
              lastUpdate: gameData.lastUpdate
            }, gameData.players, name);
          } else if (gameData.currentTeam !== undefined) {
            // Fallback: if currentTeam is at document root, use that
            console.log('📥 JOINER: currentTeam found at root level, constructing state object');
            loadMultiplayerGameState({
              currentTeam: gameData.currentTeam,
              currentGroup: gameData.currentGroup,
              movePhase: gameData.movePhase,
              round: gameData.round,
              cards: gameData.cards,
              teamPaces: gameData.teamPaces,
              teamPaceMeta: gameData.teamPaceMeta,
              teamPaceRound: gameData.teamPaceRound,
              groupSpeed: gameData.groupSpeed,
              slipstream: gameData.slipstream,
              logs: gameData.logs,
              postMoveInfo: gameData.postMoveInfo,
              lastUpdate: gameData.lastUpdate
            }, gameData.players, name);
          }
          
          // Only update gameState if we're not already in draft or playing
          setGameState(current => {
            console.log('📥 JOINER: setGameState callback, current:', current);
            if (current === 'draft' || current === 'playing') {
              return current;
            }
            console.log('📥 JOINER: Transitioning to playing');
            return 'playing';
          });
        }
      });
      
      unsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error('Failed to join game:', error);
      alert('Failed to join game: ' + error.message);
    }
  };
  
  // Handle leaving lobby
  const handleLeaveLobby = async () => {
    try {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      if (roomCode && playerName) {
        await leaveGame(roomCode, playerName);
      }
      
      setInLobby(false);
      setRoomCode(null);
      setPlayerName('');
      setIsHost(false);
      setMultiplayerPlayers([]);
      setGameMode(null);
      setMultiplayerMode(null);
    } catch (error) {
      console.error('Failed to leave lobby:', error);
    }
  };
  
  // Load game state from multiplayer
  const loadMultiplayerGameState = (state, players = null, playerNameParam = null) => {
    console.log('🔄 loadMultiplayerGameState called with state:', { 
      hasState: !!state,
      currentTeam: state?.currentTeam,
      teamPacesKeys: state?.teamPaces ? Object.keys(state.teamPaces) : [],
      teamPaceMetaKeys: state?.teamPaceMeta ? Object.keys(state.teamPaceMeta) : [],
      lastUpdate: state?.lastUpdate,
      lastUpdateType: typeof state?.lastUpdate,
      playersCount: players?.length || 0,
      playerNameParam: playerNameParam
    });
    
    if (!state) {
      console.log('🔄 Skipping: no state');
      return;
    }
    
    // Capture the current round BEFORE updating it - we need this to detect round changes
    const previousRound = roundRef.current;
    
    // Firebase serverTimestamp() returns a Timestamp object with seconds and nanoseconds
    // Convert it to milliseconds for comparison
    const lastSyncTime = loadMultiplayerGameState.lastSync || 0;
    let stateTime = 0;
    if (state.lastUpdate) {
      if (typeof state.lastUpdate === 'number') {
        stateTime = state.lastUpdate;
      } else if (state.lastUpdate.seconds) {
        // Firebase Timestamp object
        stateTime = state.lastUpdate.seconds * 1000 + Math.floor(state.lastUpdate.nanoseconds / 1000000);
      } else if (state.lastUpdate.toMillis) {
        // Firebase Timestamp with toMillis method
        stateTime = state.lastUpdate.toMillis();
      }
    }
    
    console.log('🔄 Timestamp check:', { lastSyncTime, stateTime, willSkip: stateTime <= lastSyncTime });
    
    // Skip if this is definitely old data
    // Allow updates only if:
    // 1. stateTime is 0 or undefined (no timestamp = always apply)
    // 2. stateTime is strictly newer than lastSyncTime (even 1ms newer)
    if (stateTime > 0 && lastSyncTime > 0 && stateTime <= lastSyncTime) {
      // This is old or duplicate data, skip
      console.log('🔄 Skipping: stale data (stateTime:', stateTime, '<= lastSyncTime:', lastSyncTime, ')');
      return;
    }
    
    // Update lastSync timestamp before processing
    // Use stateTime if available, otherwise use current time
    const newSyncTime = stateTime > 0 ? stateTime : Date.now();
    console.log('🔄 Processing update, setting lastSync to:', newSyncTime);
    loadMultiplayerGameState.lastSync = newSyncTime;
    
    console.log('🔄 Loading multiplayer game state update');
    
    // Update all game state from Firebase
    if (state.cards) {
      const ridersWithPlannedCards = Object.entries(state.cards)
        .filter(([, r]) => r.planned_card_id || r.human_planned)
        .map(([n, r]) => `${n}(${r.team}): ${r.planned_card_id}`);
      console.log('🔄 Loading cards from Firebase. Riders with planned cards:', ridersWithPlannedCards);
      setCards(state.cards);
    }
    if (typeof state.round !== 'undefined') {
      console.log('🔄 Round update - previous:', previousRound, 'new:', state.round);
      setRound(state.round);
      roundRef.current = state.round; // Update ref for future comparisons
    }
    if (typeof state.currentGroup !== 'undefined') setCurrentGroup(state.currentGroup);
    if (state.teams) setTeams(state.teams);
    if (state.currentTeam) {
      // Only update currentTeam if:
      // 1. We're the host (host controls turn order), OR
      // 2. The new value is different from our current value (handle initial sync)
      // This prevents stale Firebase updates from overwriting recent turn advancements
      if (isHost || state.currentTeam !== currentTeam) {
        console.log('🔄 Updating currentTeam from Firebase:', state.currentTeam, '(was:', currentTeam, ')');
        // Fix legacy 'Me' team name in multiplayer - should never be 'Me' in multiplayer
        let teamToSet = (gameMode === 'multi' && state.currentTeam === 'Me' && state.teams?.length > 0) 
          ? state.teams[0] // Use first team as fallback
          : state.currentTeam;
        
        // GUARD: Ensure currentTeam has riders in currentGroup (prevent stuck state)
        // If currentTeam has no riders in the current group, find a team that does
        const currentGroupNum = state.currentGroup || currentGroup;
        const currentCards = state.cards || cards;
        const teamHasRiders = Object.values(currentCards).some(r => 
          r.group === currentGroupNum && 
          r.team === teamToSet && 
          !r.finished && 
          r.attacking_status !== 'attacker'
        );
        
        if (!teamHasRiders && state.teams && state.teams.length > 0) {
          console.log('🔄 WARNING: currentTeam', teamToSet, 'has no riders in group', currentGroupNum, '- finding alternative');
          // Find first team with riders in this group
          const teamsWithRiders = state.teams.filter(t => 
            Object.values(currentCards).some(r => 
              r.group === currentGroupNum && 
              r.team === t && 
              !r.finished && 
              r.attacking_status !== 'attacker'
            )
          );
          
          if (teamsWithRiders.length > 0) {
            teamToSet = teamsWithRiders[0];
            console.log('🔄 Corrected currentTeam to:', teamToSet);
          } else {
            console.log('🔄 WARNING: No teams have riders in group', currentGroupNum, '- keeping', teamToSet);
          }
        }
        
        setCurrentTeam(teamToSet);
      } else {
        console.log('🔄 Skipping currentTeam update - keeping local value:', currentTeam);
      }
    }
    if (state.track) setTrack(state.track);
    if (state.trackName) setTrackName(state.trackName);
    if (typeof state.numberOfTeams !== 'undefined') setNumberOfTeams(state.numberOfTeams);
    if (typeof state.ridersPerTeam !== 'undefined') setRidersPerTeam(state.ridersPerTeam);
    
    // Sync team paces and metadata
    // REPLACE (don't merge) if:
    // 1. Firebase sends empty object - that's an explicit clear signal
    // 2. Round has changed - old submissions from previous round should be dropped
    // Otherwise MERGE to preserve our own submissions that may not be in Firebase yet
    if (state.teamPaces !== undefined) {
      console.log('🔄 Setting teamPaces from Firebase:', state.teamPaces);
      setTeamPaces(prev => {
        // If Firebase sends empty object OR round has changed, replace completely
        const firebaseKeys = Object.keys(state.teamPaces);
        const roundChanged = state.round !== undefined && state.round !== previousRound;
        const shouldReplace = firebaseKeys.length === 0 || roundChanged;
        
        // When round changes, drop all old data. Otherwise merge normally.
        const merged = shouldReplace ? state.teamPaces : { ...prev, ...state.teamPaces };
        
        console.log('🔄 teamPaces:', shouldReplace ? 'REPLACING' : 'MERGING', 'prev keys:', Object.keys(prev).length, 'firebase keys:', firebaseKeys.length, 'roundChanged:', roundChanged, '(prev:', previousRound, 'new:', state.round, ') result keys:', Object.keys(merged).length);
        // Also update ref to keep it in sync
        teamPacesRef.current = merged;
        return merged;
      });
    }
    if (state.teamPaceMeta !== undefined) {
      console.log('🔄 Setting teamPaceMeta from Firebase:', state.teamPaceMeta);
      setTeamPaceMeta(prev => {
        console.log('🔄 Previous teamPaceMeta:', prev);
        // If Firebase sends empty object OR round has changed, replace completely
        const firebaseKeys = Object.keys(state.teamPaceMeta);
        const roundChanged = state.round !== undefined && state.round !== previousRound;
        const shouldReplace = firebaseKeys.length === 0 || roundChanged;
        
        // When round changes (0→1, 1→2, etc.), drop all old submissions
        // Otherwise merge normally - don't filter based on pace round (choice-1 vs choice-2)
        const merged = shouldReplace ? state.teamPaceMeta : { ...prev, ...state.teamPaceMeta };
        
        console.log('🔄 teamPaceMeta:', shouldReplace ? 'REPLACING' : 'MERGING', 'prev keys:', Object.keys(prev).length, 'firebase keys:', firebaseKeys.length, 'roundChanged:', roundChanged, '(prev:', previousRound, 'new:', state.round, ') result keys:', Object.keys(merged).length);
        // Also update ref to keep it in sync
        teamPaceMetaRef.current = merged;
        
        // HOST ONLY: Check if we need to advance turn after receiving new submissions
        // This handles the case where a non-host player submits and the host needs to
        // advance currentTeam so the next team can submit
        // Check using multiple conditions since isHost/gameMode might not be set yet
        const playersToCheck = players || multiplayerPlayers;
        const nameToCheck = playerNameParam || playerName;
        console.log('🔄 Host check - playersToCheck:', playersToCheck, 'nameToCheck:', nameToCheck, 'isHost:', isHost);
        const isLikelyHost = isHost || (nameToCheck && playersToCheck.length > 0 && 
                             playersToCheck.some(p => {
                               console.log('🔄 Checking player:', p, 'p.isHost:', p.isHost, 'p.name:', p.name, 'matches:', p.name === nameToCheck);
                               return p.isHost && p.name === nameToCheck;
                             }));
        const isMultiplayer = gameMode === 'multi' || gameMode === 'join' || playersToCheck.length > 0;
        console.log('🔄 Host check result - isLikelyHost:', isLikelyHost, 'isMultiplayer:', isMultiplayer);
        
        if (isLikelyHost && isMultiplayer) {
          // Use currentTeam from Firebase state, not from React state (which might be stale)
          const currentTeamFromFirebase = state.currentTeam;
          console.log('🔄 HOST checking for submissions. isHost:', isHost, 'isLikelyHost:', isLikelyHost, 'gameMode:', gameMode, 'movePhase:', movePhase, 'currentTeam from state:', currentTeam, 'from Firebase:', currentTeamFromFirebase);
          
          // Allow turn advancement during 'input' phase (pace selection) and 'cardSelection' phase
          // During cardSelection, HOST may still need to advance turn if other players submit paces
          // Use Firebase movePhase if available to avoid race conditions
          const currentPhase = state.movePhase || movePhase;
          if (currentPhase !== 'input' && currentPhase !== 'cardSelection') {
            console.log('🔄 Skipping turn advancement - not in input/cardSelection phase (current phase:', currentPhase, ')');
            return merged;
          }
          
          // Check if the current team (from Firebase) has already submitted
          // Use merged state (prev + Firebase) to check submissions
          const groupNum = state.currentGroup || currentGroup;
          const currentTeamKey = `${groupNum}-${currentTeamFromFirebase}`;
          const currentTeamHasSubmitted = !!merged[currentTeamKey];
          
          console.log('🔄 Current team submission check:', {
            currentTeamFromFirebase,
            currentTeamKey,
            hasSubmitted: currentTeamHasSubmitted,
            mergedKeys: Object.keys(merged)
          });
          
          if (currentTeamHasSubmitted) {
            console.log('🔄 HOST detected current team has submitted, advancing turn');
            // Calculate next team and advance
            // Reconstruct teams array from players if not available in closure
            let teamsArray = teams;
            if (!teamsArray || teamsArray.length === 0) {
              // Build from players, including AI teams (Comp1, Comp2, etc.)
              teamsArray = playersToCheck.map(p => p.team).filter(Boolean);
              // Check if there are AI teams in cards that aren't in players
              if (state.cards) {
                const aiTeams = Object.values(state.cards)
                  .map(card => card.team)
                  .filter(t => t && t.startsWith('Comp') && !teamsArray.includes(t));
                teamsArray = [...teamsArray, ...aiTeams];
              }
            }
            // Deduplicate teams array to avoid infinite loops
            teamsArray = [...new Set(teamsArray)];
            console.log('🔄 Teams array for turn calculation:', teamsArray);
            
            // Check if all teams have already submitted
            // IMPORTANT: Only check teams that have riders in the current group
            console.log('🔄 Checking if all teams submitted. currentGroup:', state.currentGroup, 'fallback:', currentGroup);
            console.log('🔄 All merged keys:', Object.keys(merged));
            console.log('🔄 All merged entries:', Object.entries(merged).map(([k, v]) => `${k}=${JSON.stringify(v).substring(0, 50)}`));
            
            const cardsToCheck = state.cards || cards;
            const groupNum = state.currentGroup || currentGroup;
            const teamsWithRidersInGroup = [...new Set(
              Object.values(cardsToCheck)
                .filter(r => r.group === groupNum && !r.finished)
                .map(r => r.team)
            )];
            
            console.log('🔄 Teams with riders in group:', teamsWithRidersInGroup);
            
            const allSubmitted = teamsWithRidersInGroup.every(t => {
              const key = `${groupNum}-${t}`;
              const hasSubmitted = !!merged[key];
              console.log(`🔄 Team ${t} key ${key}: ${hasSubmitted ? 'submitted' : 'not submitted'}, value:`, merged[key]);
              return hasSubmitted;
            });
            console.log('🔄 All submitted check result:', allSubmitted);
            
            if (allSubmitted) {
              // Check current phase to determine what action to take
              const currentPhase = state.movePhase || movePhase;
              
              if (currentPhase === 'cardSelection') {
                console.log('🔄 Already in cardSelection phase - checking if card selections are complete');
                
                // Only HOST should check for card selections and trigger confirmMove
                // JOINER just waits for HOST to move the game forward
                if (!isLikelyHost) {
                  console.log('🔄 JOINER: Skipping card selection check, waiting for HOST');
                } else {
                  // Check if all human teams have also submitted their card selections
                  const groupNum = state.currentGroup || currentGroup;
                  const cardsToCheck = state.cards || cards;
                  const allHumanRidersInGroup = Object.entries(cardsToCheck)
                    .filter(([, r]) => r.group === groupNum && !r.finished && teamsArray.includes(r.team) && !r.team.startsWith('Comp'));
                  
                  const humanTeamsInGroup = [...new Set(allHumanRidersInGroup.map(([, r]) => r.team))];
                  const humanTeamsWithCardSelections = humanTeamsInGroup.filter(team => {
                    return Object.entries(cardsToCheck).some(([, r]) => 
                      r.group === groupNum && 
                      r.team === team && 
                      (r.planned_card_id || r.human_planned)
                    );
                  });
                  
                  console.log('🔄 HOST card selection check:', {
                    humanTeamsInGroup: humanTeamsInGroup.length,
                    humanTeamsWithCardSelections: humanTeamsWithCardSelections.length,
                    allCardsSubmitted: humanTeamsWithCardSelections.length === humanTeamsInGroup.length,
                    waitingForCardSelections
                  });
                  
                  // Only trigger confirmMove if we're not already waiting (prevents duplicate calls)
                  if (!waitingForCardSelections && (humanTeamsInGroup.length === 0 || humanTeamsWithCardSelections.length === humanTeamsInGroup.length)) {
                    console.log('🔄 HOST: All card selections complete - enabling monitoring');
                    // Instead of calling confirmMove directly, enable the monitoring useEffect
                    // This prevents duplicate calls and uses the existing monitoring flow
                    setWaitingForCardSelections(true);
                  } else {
                    console.log('🔄 HOST: Still waiting for card selections from', humanTeamsInGroup.length - humanTeamsWithCardSelections.length, 'team(s)');
                  }
                }
              } else if (currentPhase === 'input') {
                console.log('🔄 All teams have submitted! Triggering finalization...');
                // All teams have submitted - call handlePaceSubmit with forceFinalize to trigger finalization
                const groupNum = state.currentGroup || currentGroup;
                console.log('🔄 HOST calling handlePaceSubmit with forceFinalize for group:', groupNum);
                console.log('🔄 handlePaceSubmit type:', typeof handlePaceSubmit);
                
                // Schedule on next tick to ensure state is updated
                setTimeout(() => {
                try {
                  console.log('🔄 Executing handlePaceSubmit with forceFinalize');
                  // Use pace=0 since we're just triggering finalization, not submitting a new pace
                  // Pass state.cards as cardsSnapshot to ensure we have up-to-date card data
                  handlePaceSubmit(groupNum, 0, currentTeamFromFirebase, false, null, state.cards, null, true);
                  console.log('🔄 handlePaceSubmit completed');
                } catch (err) {
                  console.error('🔄 Error calling handlePaceSubmit:', err);
                }
              }, 50);
              } else {
                console.log('🔄 Ignoring allSubmitted - already finalized (phase:', currentPhase, ')');
              }
            } else {
              const teamIdx = teamsArray.indexOf(currentTeamFromFirebase);
              const nextIdx = (teamIdx + 1) % teamsArray.length;
              console.log('🔄 Calculating next team. teamsArray:', teamsArray, 'teamIdx:', teamIdx, 'nextIdx:', nextIdx);
              
              // Find next team that has riders in this group
              const groupToCheck = state.currentGroup || currentGroup;
              const cardsToCheck = state.cards || cards;
              let nextTeam = null;
              
              for (let i = 0; i < teamsArray.length; i++) {
                const idx = (nextIdx + i) % teamsArray.length;
                const t = teamsArray[idx];
                const hasRiders = Object.entries(cardsToCheck).some(([, r]) => 
                  r.group === groupToCheck && 
                  r.team === t && 
                  !r.finished && 
                  r.attacking_status !== 'attacker'
                );
                if (hasRiders) {
                  nextTeam = t;
                  break;
                }
              }
              
              // Fallback to simple rotation if no team with riders found
              if (!nextTeam) {
                nextTeam = teamsArray[nextIdx];
              }
              
              if (nextTeam && nextTeam !== currentTeamFromFirebase) {
                console.log('🔄 HOST setting currentTeam to:', nextTeam, '(has riders in group:', groupToCheck, ')');
                setCurrentTeam(nextTeam);
                // DON'T sync to Firebase here - we're in the middle of loading state from Firebase
                // and teamPacesRef/teamPaceMetaRef haven't been updated yet.
                // The sync will happen naturally from handlePaceSubmit or other game logic.
                console.log('🔄 Skipping Firebase sync during loadMultiplayerGameState to avoid overwriting data');
              } else if (nextTeam === currentTeamFromFirebase) {
                console.log('🔄 Next team is same as current team - skipping to avoid loop');
              } else {
                console.log('🔄 No next team found!');
              }
            }
          } else {
            console.log('🔄 Current team has not submitted yet, not advancing');
          }
        } else {
          console.log('🔄 Skipping turn advancement check. isHost:', isHost, 'isLikelyHost:', isLikelyHost, 'gameMode:', gameMode);
        }
        
        return merged;
      });
    }
    if (state.teamPaceRound !== undefined) {
      console.log('🔄 Loading teamPaceRound from Firebase:', state.teamPaceRound);
      // Replace (don't merge) if round has changed - clear old round submissions
      const roundChanged = state.round !== undefined && state.round !== previousRound;
      if (roundChanged) {
        console.log('🔄 teamPaceRound: REPLACING due to round change (old round:', previousRound, 'new round:', state.round, ')');
        setTeamPaceRound(state.teamPaceRound);
        teamPaceRoundRef.current = state.teamPaceRound; // Update ref
      } else {
        setTeamPaceRound(prev => {
          const merged = { ...prev, ...state.teamPaceRound };
          teamPaceRoundRef.current = merged; // Update ref
          return merged;
        });
      }
    }
    
    if (state.teamPullInvests !== undefined) {
      console.log('🔄 Loading teamPullInvests from Firebase:', state.teamPullInvests);
      setTeamPullInvests(prev => {
        // If Firebase sends empty object, replace completely (clearing)
        // Otherwise merge
        const shouldReplace = Object.keys(state.teamPullInvests).length === 0;
        const merged = shouldReplace ? state.teamPullInvests : { ...prev, ...state.teamPullInvests };
        teamPullInvestsRef.current = merged;
        return merged;
      });
    }
    
      // Sync move phase and speed info
    if (state.movePhase) {
      console.log('🔄 Loading movePhase from Firebase:', state.movePhase, '(current postMoveInfo:', postMoveInfo ? `Group ${postMoveInfo.groupMoved}` : 'null', ')');
      setMovePhase(state.movePhase);
      movePhaseRef.current = state.movePhase; // Update ref immediately
    }
    if (typeof state.groupSpeed !== 'undefined') {
      console.log('🔄 Loading groupSpeed from Firebase:', state.groupSpeed);
      setGroupSpeed(state.groupSpeed);
      groupSpeedRef.current = state.groupSpeed; // Update ref for card selection dialog
    }
    if (typeof state.slipstream !== 'undefined') {
      console.log('🔄 Loading slipstream from Firebase:', state.slipstream);
      setSlipstream(state.slipstream);
      slipstreamRef.current = state.slipstream; // Update ref for card selection dialog
    }
    
    // Sync postMoveInfo (yellow box) so JOINER sees the same results as HOST
    console.log('🔄 Checking postMoveInfo in state:', { 
      hasPostMoveInfo: !!state.postMoveInfo, 
      postMoveInfoValue: state.postMoveInfo,
      postMoveInfoType: typeof state.postMoveInfo,
      stateKeys: Object.keys(state)
    });
    
    if (state.postMoveInfo) {
      console.log('🔄 Loading postMoveInfo from Firebase:', state.postMoveInfo);
      setPostMoveInfo(state.postMoveInfo);
      postMoveInfoRef.current = state.postMoveInfo; // Update ref immediately
    } else if (state.postMoveInfo === null) {
      console.log('🔄 Clearing postMoveInfo (received null from Firebase)');
      setPostMoveInfo(null);
      postMoveInfoRef.current = null;
    } else {
      console.log('🔄 No postMoveInfo in state update - not in state keys:', !('postMoveInfo' in state));
    }
    
    // Sync recent logs (append them, don't replace)
    if (state.logs && Array.isArray(state.logs)) {
      state.logs.forEach(log => {
        if (!logs.includes(log)) {
          addLog(log);
        }
      });
    }
  };
  
  // Sync game state to multiplayer
  const syncGameState = async () => {
    if (!roomCode || gameMode !== 'multi') return;
    
    try {
      await updateGameState(roomCode, {
        cards,
        round,
        currentGroup,
        teams,
        currentTeam,
        track,
        trackName,
        numberOfTeams,
        ridersPerTeam,
        // Add more state as needed
      });
    } catch (error) {
      console.error('Failed to sync game state:', error);
    }
  };
  
  // Update connection status on mount/unmount
  useEffect(() => {
    if (roomCode && playerName && gameMode === 'multi') {
      updatePlayerConnection(roomCode, playerName, true);
      
      return () => {
        updatePlayerConnection(roomCode, playerName, false);
      };
    }
  }, [roomCode, playerName, gameMode]);

  // Helper: Check if it's the current player's turn in multiplayer
  const isMyTurn = () => {
    if (gameMode !== 'multi') return true; // In single player, always your turn
    if (!playerName || !currentTeam) return false;
    return currentTeam === playerName;
  };

  // Helper: Get the current player's team name
  const getPlayerTeamName = () => {
    return gameMode === 'multi' ? playerName : 'Me';
  };

  // Helper: Check if a team is the current player's team
  const isPlayerTeam = (teamName) => {
    const playerTeam = getPlayerTeamName();
    return teamName === playerTeam;
  };

  // Helper: Get display name for a team (in multiplayer, teams already have their actual names)
  const getTeamDisplayName = (teamName) => {
    // In multiplayer, teams already use player names and Comp1, Comp2
    // In single player, 'Me' stays as 'Me'
    return teamName;
  };

  // Helper: Sync game state to Firebase after a move
  // currentTeamOverride allows passing the next team value before setState completes
  // clearPostMoveInfo: explicitly set postMoveInfo to null in Firebase (for HOST when moving to next group)
  // Add rate limiting to prevent Firebase quota exhaustion
  let lastSyncTime = 0;
  const syncMoveToFirebase = async (currentTeamOverride = null, clearPostMoveInfo = false) => {
    const currentRoomCode = roomCodeRef.current;
    
    // Rate limit: max 1 sync per 200ms to prevent quota exhaustion
    const now = Date.now();
    if (now - lastSyncTime < 200) {
      console.log('📤 syncMoveToFirebase: Rate limited, skipping');
      return;
    }
    lastSyncTime = now;
    console.log('📤 syncMoveToFirebase called:', { roomCode: !!currentRoomCode, currentTeamOverride });
    
    // Check if we're in a multiplayer game by checking roomCode presence
    // Use ref instead of state variable to avoid stale closure value
    if (!currentRoomCode) {
      console.log('📤 syncMoveToFirebase: Skipping - no roomCode');
      return;
    }
    
    // Use refs for teamPaces and teamPaceMeta to get the most recent values
    // (setState is async, so state variables may be stale)
    const teamPacesToSync = teamPacesRef.current || teamPaces;
    const teamPaceMetaToSync = teamPaceMetaRef.current || teamPaceMeta;
    const teamPaceRoundToSync = teamPaceRoundRef.current !== undefined ? teamPaceRoundRef.current : teamPaceRound;
    const teamPullInvestsToSync = teamPullInvestsRef.current || teamPullInvests;
    
    // Use refs for currentTeam, currentGroup, movePhase, cards, postMoveInfo, round to avoid stale closure values
    const teamToSync = currentTeamOverride !== null ? currentTeamOverride : currentTeamRef.current;
    const groupToSync = currentGroupRef.current;
    const phaseToSync = movePhaseRef.current;
    const cardsToSync = cardsRef.current || cards;
    const postMoveInfoToSync = postMoveInfoRef.current;
    const roundToSync = roundRef.current;
    
    // Clean cards data: remove undefined values that Firebase doesn't accept
    const cleanedCards = {};
    for (const [name, rider] of Object.entries(cardsToSync)) {
      const cleanedRider = {};
      for (const [key, value] of Object.entries(rider)) {
        if (value !== undefined) {
          cleanedRider[key] = value;
        }
      }
      cleanedCards[name] = cleanedRider;
    }
    
    console.log('📤 Syncing move to Firebase:', {
      currentTeam: teamToSync,
      currentGroup: groupToSync,
      movePhase: phaseToSync,
      round,
      cardsCount: Object.keys(cardsToSync).length,
      teamPacesKeys: Object.keys(teamPacesToSync),
      teamPaceMetaKeys: Object.keys(teamPaceMetaToSync),
      postMoveInfo: postMoveInfoToSync ? `Group ${postMoveInfoToSync.groupMoved}` : 'null',
      groupSpeed,
      slipstream
    });
    
    try {
      console.log('📤 Calling syncPlayerMove with postMoveInfo:', postMoveInfoToSync);
      
      // Build sync payload - only include postMoveInfo if it exists
      // This prevents JOINER from overwriting HOST's postMoveInfo with null
      const syncPayload = {
        cards: cleanedCards, // Use cleaned cards without undefined values
        round: roundToSync,
        currentGroup: groupToSync,
        currentTeam: teamToSync,
        teamPaces: teamPacesToSync,
        teamPaceMeta: teamPaceMetaToSync,
        teamPaceRound: teamPaceRoundToSync,
        teamPullInvests: teamPullInvestsToSync,
        movePhase: phaseToSync,
        // Only sync groupSpeed if we are the host OR in input/cardSelection phase
        // In cardSelection phase, the speed has just been calculated and MUST be synced
        // This prevents Joiner from overwriting Host's calculated speed with a stale local value
        // IMPORTANT: Do not send undefined, as Firebase rejects it. If we shouldn't sync it, omit the key entirely.
        ...( (isHost || phaseToSync === 'input' || phaseToSync === 'cardSelection') ? { groupSpeed: (groupSpeedRef.current !== undefined ? groupSpeedRef.current : groupSpeed) } : {} ),
        slipstream: slipstreamRef.current !== undefined ? slipstreamRef.current : slipstream,
        logs: logs.slice(-20) // Only sync recent logs to avoid bloat
      };
      
      // Only include postMoveInfo if it exists (not null) OR if explicitly clearing
      if (postMoveInfoToSync) {
        console.log('📤 Including postMoveInfo in sync:', postMoveInfoToSync.groupMoved);
        syncPayload.postMoveInfo = postMoveInfoToSync;
      } else if (clearPostMoveInfo) {
        console.log('📤 Explicitly clearing postMoveInfo (setting to null)');
        syncPayload.postMoveInfo = null;
      } else {
        console.log('📤 NOT including postMoveInfo in sync (undefined)');
      }
      
      await syncPlayerMove(currentRoomCode, syncPayload);
      console.log('✅ Move synced successfully');
    } catch (error) {
      console.error('❌ Failed to sync move:', error);
    }
  };

  // Start multiplayer game (host only)
  const startMultiplayerGameSession = async () => {
    if (!isHost || !roomCode) return;
    
    try {
      // Generate draft pool locally (host controls the draft)
      const total = numberOfTeams * ridersPerTeam;
      const pool = [...ridersData];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const draftPoolToShare = pool.slice(0, total);
      
      // Build teams order for draft (use player names for human teams, Comp for AI)
      const teamsOrder = [];
      const numHumans = multiplayerPlayers.length;
      const numAI = numberOfTeams - numHumans;
      
      // In multiplayer, human teams use player names, AI teams use Comp1, Comp2, etc.
      // Get human team names (player names)
      const humanTeamNames = multiplayerPlayers.map(p => p.name);
      
      // Add AI teams first (Comp1, Comp2, ...)
      for (let i = 1; i <= numAI; i++) {
        teamsOrder.push(`Comp${i}`);
      }
      
      // Randomize human team order and add them
      const shuffledHumanTeams = [...humanTeamNames];
      for (let i = shuffledHumanTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledHumanTeams[i], shuffledHumanTeams[j]] = [shuffledHumanTeams[j], shuffledHumanTeams[i]];
      }
      teamsOrder.push(...shuffledHumanTeams);
      
      // Generate pick sequence (snake draft)
      const pickSequence = [];
      for (let round = 0; round < ridersPerTeam; round++) {
        if (round === 0) {
          // First round: forward
          for (const team of teamsOrder) {
            pickSequence.push(team);
          }
        } else {
          // Subsequent rounds: backward (snake draft)
          for (let i = teamsOrder.length - 1; i >= 0; i--) {
            pickSequence.push(teamsOrder[i]);
          }
        }
      }
      
      // Prepare draft data to share with all players
      const draftData = {
        pool: draftPoolToShare.map(r => ({ 
          NAVN: r.NAVN, 
          FLAD: r.FLAD, 
          BJERG: r.BJERG, 
          SPRINT: r.SPRINT,
          MENTALITET: r.MENTALITET 
        })),
        trackName,
        track: getResolvedTrack(),
        stages: selectedStages,
        numberOfTeams,
        ridersPerTeam,
        teamsOrder,
        pickSequence
      };
      
      // Update Firebase to notify all players that draft is starting
      const gameRef = doc(db, 'games', roomCode);
      await updateDoc(gameRef, {
        status: 'drafting',
        draftData: draftData,
        lastUpdate: serverTimestamp()
      });
      
      // Close lobby and start draft locally
      setInLobby(false);
      setGameMode('multi');
      
      // HOST: Subscribe to Firebase updates to see joiner picks
      // IMPORTANT: Capture playerName from state at this moment, and get players from Firebase data
      console.log('🔧 HOST: Setting up subscriber with playerName:', playerName, 'multiplayerPlayers:', multiplayerPlayers);
      const hostPlayerName = playerName; // Capture current playerName for closure
      const hostTeamsOrder = teamsOrder; // Capture teamsOrder for closure
      const hostPickSequence = pickSequence; // Capture pickSequence for closure
      const unsubscribe = subscribeToGame(roomCode, (gameData) => {
        console.log('📥 HOST: Subscriber called, status:', gameData?.status);
        console.log('📥 HOST: My name:', hostPlayerName, 'Players:', gameData?.players?.map(p => p.name + ':' + p.team));
        if (!gameData) return;
        
        // If game started playing, unsubscribe this draft subscriber (lobby subscriber handles game start)
        if (gameData.status === 'playing') {
          console.log('📥 HOST (draft): Game started, unsubscribing draft listener');
          unsubscribe();
          return;
        }
        
        // Sync selections from other players
        if (gameData.draftData?.selections && Array.isArray(gameData.draftData.selections)) {
          console.log('🔄 HOST: Syncing selections from Firebase:', gameData.draftData.selections.length, 'current:', draftSelections.length);
          
          const syncedSelections = gameData.draftData.selections.map(s => {
            const rider = ridersData.find(r => r.NAVN === s.riderName);
            return { team: s.team, rider: rider || { NAVN: s.riderName } };
          });
          
          // Only update if selections count changed
          if (syncedSelections.length > draftSelections.length) {
            console.log('🔄 HOST: Updating selections to', syncedSelections.length);
            setDraftSelections(syncedSelections);
            
            // Recalculate remaining riders using full pool from Firebase
            const pickedNames = syncedSelections.map(s => s.rider.NAVN);
            const fullPool = gameData.draftData.pool.map(r => ridersData.find(rd => rd.NAVN === r.NAVN)).filter(Boolean);
            const newRemaining = fullPool.filter(r => !pickedNames.includes(r.NAVN));
            setDraftRemaining(newRemaining);
            
            // Continue processing with updated data
            // Use hostPlayerName from closure and gameData.players from Firebase
            setTimeout(() => {
              console.log('🔄 HOST: Calling processNextPick after sync');
              console.log('🔄 HOST: Parameters:', {
                newRemaining: newRemaining?.length,
                teamsOrder: hostTeamsOrder?.length,
                syncedSelections: syncedSelections?.length,
                pickSequence: hostPickSequence?.length,
                hostPlayerName,
                players: gameData.players?.length
              });
              processNextPick(newRemaining, hostTeamsOrder, syncedSelections, hostPickSequence, 'multi', hostPlayerName, gameData.players);
            }, 150);
          }
        }
      });
      
      // Store unsubscribe function (you may want to call this when leaving the game)
      // For now, it will automatically unsubscribe when component unmounts
      
      // Initialize draft state directly with the generated data (same as joiners do)
      setDraftPool(draftPoolToShare);
      setDraftRemaining(draftPoolToShare);
      setDraftSelections([]);
      setDraftTeamsOrder(teamsOrder);
      setDraftPickSequence(pickSequence);
      setDraftCurrentPickIdx(0);
      setDraftRoundNum(1);
      setDraftTotalPicks(total);
      setIsDrafting(true);
      
      // Start processing picks after state is set
      // IMPORTANT: Pass gameMode='multi', playerName, and multiplayerPlayers for host
      setTimeout(() => {
        processNextPick(draftPoolToShare, teamsOrder, [], pickSequence, 'multi', playerName, multiplayerPlayers);
      }, 150);
      
    } catch (error) {
      console.error('Failed to start multiplayer game:', error);
      alert('Failed to start game: ' + error.message);
    }
  };

  // (prepareSprints was removed — sprint detection runs after group reassignment in flow)

  // All helper implementations (getPenalty, takesLeadFC, humanResponsibility,
  // getTeamMatesInGroup, pickValue, takesLeadFCFloating) were moved to
  // `src/game/gameLogic.js`. App now imports and uses the shared versions.
  const autoPlayTeam = (groupNum, teamName = currentTeam, minPace = undefined, cardsSnapshot = null) => {
  const cardsToUse = cardsSnapshot || cards;
  const teamRiders = Object.entries(cardsToUse).filter(([,r]) => r.group === groupNum && r.team === teamName && !r.finished);
  
  let pace = 0;
  if (teamRiders.length === 0) {
    addLog(`${currentTeam}: no riders`);
    // No riders to play for this team — return a result so the caller
    // (AI Play handler) can submit once. This prevents duplicate submissions.
    return { pace: 0, updatedCards: { ...cardsToUse } };
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
  Object.entries(cardsToUse).forEach(([, r]) => {
    if (r.finished) return;
    if (r.group !== groupNum) return;
    // Do not include attacks (human attackers set attacking_status === 'attacker')
    if (typeof r.selected_value === 'number' && r.selected_value > 0 && r.attacking_status !== 'attacker') {
      teamPaceMap[r.team] = Math.max(teamPaceMap[r.team] || 0, Math.round(r.selected_value));
    }
  });

  const currentPaces = Object.values(teamPaceMap).map(v => Number(v) || 0);
  
  const maxPaceSoFar = currentPaces.length > 0 ? Math.max(...currentPaces.filter(p => p > 0)) : 0;
  
  const updatedCards = {...cardsToUse};
  
  // Evaluate each rider individually
  const teamAttackDeclared = {};
  for (const [name] of teamRiders) {
  // Pass the app logger into takesLeadFC so its internal debug/probability
  // messages are routed to the game log. Set write=true to enable detailed logging.
  updatedCards[name].takes_lead = takesLeadFC(name, updatedCards, track, numberOfTeams, false, true, [], addLog, Math.random, isStageRace);

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
      selected = pickValue(name, updatedCards, track, pacesForCall, numberOfTeams, [], addLog);

      // IMPORTANT: selected_value must be limited to what the rider can actually play
      // If takes_lead > 0, verify the rider has a card that can produce this value
      let validatedSelected = selected;
      if (updatedCards[name].takes_lead > 0 && selected > 0) {
        const top4 = (updatedCards[name].cards || []).slice(0, 4);
        const localPenalty = top4.filter(c => c && c.id && c.id.startsWith('TK-1')).length;
        const pos = updatedCards[name].position || 0;
        const sv = getSlipstreamValue(pos, pos + Math.floor(selected), track);
        
        // Check if ANY top-4 card can produce the selected value
        let maxPlayable = 0;
        for (const c of top4) {
          if (!c || !c.id) continue;
          if (c.id.startsWith('TK-1')) continue; // Skip TK-1 cards
          const cardVal = sv > 2 ? c.flat : c.uphill;
          const effective = cardVal - localPenalty;
          maxPlayable = Math.max(maxPlayable, effective);
        }
        
        // If selected exceeds what can be played, cap it
        if (selected > maxPlayable) {
          validatedSelected = maxPlayable;
          addLog(`⚠️ ${name} wanted ${selected} but can only play ${maxPlayable} (sv=${sv}, penalty=${localPenalty})`);
        }
      }

      updatedCards[name].selected_value = updatedCards[name].takes_lead * validatedSelected;

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
  
  // Enforce: Only ONE rider can be declared as lead (takes_lead=1, not attacker)
  // Find all non-attacker riders with takes_lead=1 and selected_value>0
  const nonAttackerLeads = teamRiders
    .map(([name]) => ({ name, ...updatedCards[name] }))
    .filter(r => r.takes_lead === 1 && r.selected_value > 0 && r.attacking_status !== 'attacker');
  
  if (nonAttackerLeads.length > 1) {
    // Find the highest selected_value
    const maxSelected = Math.max(...nonAttackerLeads.map(r => r.selected_value));
    const topRiders = nonAttackerLeads.filter(r => r.selected_value === maxSelected);
    
    // If multiple riders have the same max selected_value, pick by win_chance_gc (or win_chance if not stage race)
    let chosenLead;
    if (topRiders.length === 1) {
      chosenLead = topRiders[0].name;
    } else {
      // Pick the one with LOWEST win_chance_gc (or win_chance if !isStageRace)
      topRiders.sort((a, b) => {
        const aChance = isStageRace ? (a.win_chance_gc || 0) : (a.win_chance || 0);
        const bChance = isStageRace ? (b.win_chance_gc || 0) : (b.win_chance || 0);
        return aChance - bChance; // ascending = lowest first
      });
      chosenLead = topRiders[0].name;
    }
    
    // Clear takes_lead for all others
    for (const r of nonAttackerLeads) {
      if (r.name !== chosenLead) {
        updatedCards[r.name].takes_lead = 0;
        // Recalculate selected_value based on new takes_lead
        updatedCards[r.name].selected_value = 0;
        try { addLog(`🚫 ${r.name} demoted from lead (${chosenLead} has higher priority)`); } catch(e) {}
      }
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

  // AI dobbeltføring: Check if team has 2+ riders with paces within 1
  // Automatic dobbeltføring detection happens in calculateGroupSpeed
  // AI just needs to decide if it's advantageous for this team
  let doubleLead = null;
  
  // AI doesn't need to do anything special - automatic detection in calculateGroupSpeed
  // will find the two leaders based on submission order and paces

  const msg = pace === 0 ? `${currentTeam}: 0` : `${currentTeam}: ${pace}`;
  // Show a short-lived AI message for UX, but avoid adding a log here because
  // the definitive submission (and its log) is created by handlePaceSubmit.
  setAiMessage(msg);

// Return data i stedet for at kalde handlePaceSubmit direkte
return { pace, updatedCards, doubleLead };
};

  // For Brosten tracks the UI offers an explicit "Check if crash" button
  // that the user must press. See `checkCrash()` which performs the roll.

  // initializeGame: set up teams, assign riders and breakaways
  // Accept an optional `drafted` argument which can be either:
  // - an array of { rider, team } objects (from an interactive draft), or
  // - an array of rider objects (a pool) which will be shuffled and assigned to teams.
  // breakawayTeamsParam: optional array of team names for breakaway (synced in multiplayer)
  const initializeGame = (drafted = null, stagesArray = null, breakawayTeamsParam = null, gameModeParam = null, playersParam = null, teamOrderParam = null, initialTeamParam = null) => {
  // Use provided stagesArray or fall back to selectedStages state
  const stagesToUse = stagesArray || selectedStages;
  
  // Use provided params or fall back to state
  const effectiveGameMode = gameModeParam || gameMode;
  const effectivePlayers = playersParam || multiplayerPlayers;
  
  // Debug logging - ALWAYS log
  console.log('🎮 initializeGame called:', {
    gameMode: effectiveGameMode,
    hasDrafted: !!drafted,
    draftedLength: drafted?.length,
    multiplayerPlayersCount: effectivePlayers?.length,
    hasTeamOrder: !!teamOrderParam,
    hasInitialTeam: !!initialTeamParam
  });
  
  // Debug logging for multiplayer
  if (effectiveGameMode === 'multi' && drafted) {
    console.log('🎮 initializeGame in multiplayer mode');
    console.log('🎮 Drafted array length:', drafted?.length);
    console.log('🎮 First 3 drafted teams:', drafted?.slice(0, 3).map(d => ({ rider: d.rider?.NAVN, team: d.team })));
    console.log('🎮 effectivePlayers:', effectivePlayers.map(p => ({ name: p.name, team: p.team })));
    console.log('🎮 teamOrderParam:', teamOrderParam);
    console.log('🎮 initialTeamParam:', initialTeamParam);
  }
  
  // Prepare selectedTrack and track state
  // In stage race mode, use the track from the first stage directly
  const selectedTrack = (stagesToUse && stagesToUse.length > 0) 
    ? stagesToUse[0].track 
    : getResolvedTrack();
  setTrack(selectedTrack);

  // build team list - use player names for human teams in multiplayer, Me/Comp in single player
  let teamList;
  if (effectiveGameMode === 'multi') {
    teamList = [];
    // Add AI teams (Comp1, Comp2, ...)
    const numAI = numberOfTeams - effectivePlayers.length;
    for (let i = 1; i <= numAI; i++) {
      teamList.push(`Comp${i}`);
    }
    // Add human player names as teams
    effectivePlayers.forEach(p => {
      teamList.push(p.name);
    });
  } else {
    teamList = ['Me'];
    for (let i = 1; i < numberOfTeams; i++) teamList.push(`Comp${i}`);
  }

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

  // Pick breakaway teams (use provided teams in multiplayer, or random in single player)
  let chosenTeams;
  if (breakawayTeamsParam && Array.isArray(breakawayTeamsParam)) {
    console.log('🎲 Using synced breakaway teams:', breakawayTeamsParam);
    chosenTeams = breakawayTeamsParam.slice(0, breakawayCount);
  } else {
    console.log('🎲 Randomly selecting breakaway teams');
    const shuffledTeams = [...teamList].sort(() => Math.random() - 0.5);
    chosenTeams = shuffledTeams.slice(0, breakawayCount);
  }
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

    const allCards = generateCards(modifiedRider, isBreakaway);
    const tk16Cards = allCards.filter(c => c.id === 'kort: 16');
    const regularCards = allCards.filter(c => c.id !== 'kort: 16');
    
    cardsObj[rider.NAVN] = {
      position: isBreakaway ? attackerLeadFields : 0,
      cards: regularCards,
      discarded: tk16Cards,
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
      selected_value: -1,
      gc_time: 0,
      prize_money: 0,
      points: 0,
      kom_points: 0,
      e_moves_left_total: 0,
      e_moves_left_gc_array: [],
      win_chance_stages_array: [],
      favorit_points_gc: 1,
      win_chance_gc: 10,
      XprizeMoney: 0
    };
  });
  
  // compute initial per-rider stats (moved to shared game logic)
  computeInitialStats(cardsObj, selectedTrack, 0, numberOfTeams);
  // computeInitialStats mutates cardsObj in-place and returns helper values
  
  console.log(`Draft initialization: isStageRace=${isStageRace}, numberOfStages=${numberOfStages}, stagesToUse.length=${stagesToUse.length}`);
  
  // Compute GC stats for stage races
  if (isStageRace && stagesToUse.length > 0) {
    console.log('Starting GC calculations...');
    // Pre-compute win_chance for ALL stages
    const winChanceStagesArrays = {};
    
    for (let stageIdx = 0; stageIdx < stagesToUse.length; stageIdx++) {
      const stage = stagesToUse[stageIdx];
      
      // Create temporary cards object for this stage calculation
      const tempCards = {};
      for (const riderName in cardsObj) {
        tempCards[riderName] = { ...cardsObj[riderName], position: 0 };
      }
      
      // Compute stats for this stage
      computeInitialStats(tempCards, stage.track, 0, numberOfTeams);
      
      // Store win_chance for this stage
      for (const riderName in tempCards) {
        if (!winChanceStagesArrays[riderName]) {
          winChanceStagesArrays[riderName] = [];
        }
        winChanceStagesArrays[riderName].push(tempCards[riderName].win_chance);
      }
    }
    
    // Assign win_chance_stages_array to each rider
    for (const riderName in cardsObj) {
      cardsObj[riderName].win_chance_stages_array = winChanceStagesArrays[riderName] || [];
      console.log(`${riderName}: win_chance_stages_array set to ${JSON.stringify(cardsObj[riderName].win_chance_stages_array)}`);
    }
    
    // Now compute e_moves_left_gc_array and GC stats
    for (const riderName in cardsObj) {
      const rider = cardsObj[riderName];
      
      // Pre-compute e_moves_left for ALL stages (only once at draft)
      rider.e_moves_left_gc_array = getEMoveLeftGC(rider, stagesToUse);
      
      // Calculate e_moves_left_total using pre-computed array
      const futureStages = rider.e_moves_left_gc_array.slice(currentStageIndex + 1);
      const sumFutureStages = futureStages.reduce((sum, val) => sum + val, 0);
      rider.e_moves_left_total = rider.e_moves_left + sumFutureStages;
      
      // Calculate GC favorit points
      rider.favorit_points_gc = getFavoritPointsGC(rider);
    }
    
    // Calculate GC win chances with correct formula: 17 - 0.6 * round + 7 * (numberOfStages - currentStageIndex - 1)
    const factorGC = 17 - 0.6 * 0 + 7 * (numberOfStages - currentStageIndex - 1);
    const totalPointsGC = getTotalMovesLeftGC(cardsObj, factorGC);
    
    for (const riderName in cardsObj) {
      const rider = cardsObj[riderName];
      rider.win_chance_gc = getWinChanceGC(rider, factorGC, totalPointsGC);
      
      // Calculate XprizeMoney: 12000 * (1-(1-win_chance_gc/100)^3) + sum(win_chance_stage * 7000)
      const gcPrize = 12000 * (1 - Math.pow(1 - rider.win_chance_gc / 100, 3));
      const stagePrizes = rider.win_chance_stages_array.reduce((sum, wc) => sum + (wc / 100) * 7000, 0);
      rider.XprizeMoney = Math.round(gcPrize + stagePrizes);
      
      console.log(`${riderName}: XPM calculation - gcPrize=${gcPrize.toFixed(0)}, stagePrizes=${stagePrizes.toFixed(0)}, win_chance_stages_array=${JSON.stringify(rider.win_chance_stages_array)}, XPM=${rider.XprizeMoney}`);
    }
  }
  
  // RESET ALT STATE
  setCards(cardsObj);
  
  // Debug logging for team assignments
  if (effectiveGameMode === 'multi') {
    const teamCounts = {};
    Object.entries(cardsObj).forEach(([name, rider]) => {
      teamCounts[rider.team] = (teamCounts[rider.team] || 0) + 1;
    });
    console.log('🎮 Cards created with teams:', teamCounts);
    console.log('🎮 Sample riders:', Object.entries(cardsObj).slice(0, 3).map(([name, r]) => ({ name, team: r.team })));
  }
  
  setRound(0);
  setTeamPaces({});
  setTeamPaceMeta({});
  teamPacesRef.current = {};
  teamPaceMetaRef.current = {};
  setMovePhase('input');
  setGroupSpeed(0);
  setSlipstream(0);
  setLogs([]);
  setAiMessage('');
  // Use synced team order in multiplayer, or generate random order in single player
  const shuffled = (effectiveGameMode === 'multi' && teamOrderParam) 
    ? teamOrderParam 
    : [...teamList].sort(() => Math.random() - 0.5);
  console.log('🎮 Team order:', shuffled);
  setTeams(shuffled);
  // store base order (who is team 1,2,3,...) so we can compute per-round turn rotation
  setTeamBaseOrder(shuffled);
  // pick first team that has riders in the starting group (group 2) to avoid landing on an empty team
  const firstTeamAtStart = findNextTeamWithRiders(0, 2);
  const firstTeamToUse = (effectiveGameMode === 'multi' && initialTeamParam) 
    ? initialTeamParam 
    : (firstTeamAtStart || shuffled[0]);
  console.log('🎮 Starting team:', firstTeamToUse);
  
  setGameState('playing');
  
  // Only show intermediate sprint modal for stage races
  if (isStageRace) {
    // Initialize intermediate sprint selections for human riders
    const playerTeam = getPlayerTeamName();
    const humanRiders = Object.entries(cardsObj)
      .filter(([, r]) => r.team === playerTeam && !r.finished)
      .map(([n]) => n);
    const initialSelections = {};
    humanRiders.forEach(name => initialSelections[name] = 0);
    setIntermediateSprintSelections(initialSelections);
    
    // Open intermediate sprint modal instead of starting immediately
    setIntermediateSprintOpen(true);
    
    // Store starting group and team for use after intermediate sprint
    window.pendingStageStart = { startingGroup: 2, firstTeam: firstTeamToUse };
  } else {
    // Single stage race: start immediately
    setCurrentGroup(2);
    setCurrentTeam(firstTeamToUse);
    setMovePhase('input');
  }
  
  setLogs([`Game started! Length: ${getLength(selectedTrack)} km`]);
  // include chosen level in the log for visibility
  setLogs(prev => [...prev, `Level: ${level}`]);
};

  const startDraft = (preselectedStages = null) => {
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
    setFinalBonusesAwarded(false); // Reset for new race
    setManualStageSelection([]); // Reset manual stage selection
    
    // Select stages if isStageRace
    let selected = [];
    if (isStageRace) {
      if (gcTestMode) {
        // GC test mode: all stages use sprinttest
        const sprinttest = tracks['sprinttest'] || '111111FFFFFFFFFF';
        selected = Array.from({ length: numberOfStages }, (_, i) => ({ 
          name: `Stage ${i + 1} (Sprint Test)`, 
          track: sprinttest 
        }));
      } else if (preselectedStages && preselectedStages.length === numberOfStages) {
        // Use preselected stages passed as parameter (from stage selector modal)
        selected = preselectedStages;
      } else if (selectedStages.length === numberOfStages) {
        // Use manually selected stages (already set when stage selector was confirmed)
        selected = selectedStages;
      } else {
        // Normal mode: random stages using Fisher-Yates shuffle for proper randomization
        const availableTracks = Object.entries(tracks).filter(([name]) => !name.toLowerCase().includes('test'));
        const shuffled = [...availableTracks];
        // Fisher-Yates shuffle for unbiased random selection
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        selected = shuffled.slice(0, numberOfStages).map(([name, track]) => ({ name, track }));
      }
      setSelectedStages(selected);
      setCurrentStageIndex(0);
      // Set first stage as the current track
      if (selected.length > 0) {
        setTrackName(selected[0].name);
        setTrack(selected[0].track);
      }
    } else {
      // Single stage - use selected track from setup
      setSelectedStages([]);
      setCurrentStageIndex(0);
      const selectedTrack = getResolvedTrack();
      setTrack(selectedTrack);
    }
    
    const total = numberOfTeams * ridersPerTeam;
    const pool = [...ridersData];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const pick = pool.slice(0, total);
    // Set both draftPool (visual) and draftRemaining (interactive picks)
    setDraftPool(pick);
    
    // Pre-compute GC stats for draft pool if stage race
    if (isStageRace && selected.length > 0) {
      const stagesToUse = selected;
      
      // Pre-compute win_chance for ALL stages
      const winChanceStagesArrays = {};
      
      for (let stageIdx = 0; stageIdx < stagesToUse.length; stageIdx++) {
        const stage = stagesToUse[stageIdx];
        
        // Create temporary cards for ALL riders for this stage
        const stageCards = {};
        for (const rider of pick) {
          stageCards[rider.NAVN] = {
            name: rider.NAVN,
            position: 0,
            bjerg: Number(rider.BJERG),
            sprint: Number(rider.SPRINT),
            flad: Number(rider.FLAD),
            mentalitet: Number(rider.MENTALITET) || 4,
            team: 'temp',
            fatigue: 0,
            penalty: 0,
            group: 2,
            cards: [],
            discarded: []
          };
        }
        
        // Compute stats for this stage with ALL riders together
        computeInitialStats(stageCards, stage.track, 0, numberOfTeams);
        
        // Store win_chance for this stage
        for (const riderName in stageCards) {
          if (!winChanceStagesArrays[riderName]) {
            winChanceStagesArrays[riderName] = [];
          }
          winChanceStagesArrays[riderName].push(stageCards[riderName].win_chance);
        }
      }
      
      // Now compute e_moves_left_gc_array and GC stats
      // Create tempCards for GC calculations (using first stage)
      const tempCards = {};
      for (const rider of pick) {
        tempCards[rider.NAVN] = {
          name: rider.NAVN,
          position: 0,
          bjerg: Number(rider.BJERG) || 50,
          sprint: Number(rider.SPRINT) || 50,
          flad: Number(rider.FLAD) || 50,
          mentalitet: Number(rider.MENTALITET) || 4,
          team: 'temp',
          fatigue: 0,
          penalty: 0,
          group: 2,
          cards: [],
          discarded: []
        };
      }
      
      computeInitialStats(tempCards, stagesToUse[0].track, 0, numberOfTeams);
      
      // Compute e_moves_left_gc_array and GC stats
      for (const rider of pick) {
        const riderName = rider.NAVN;
        rider.win_chance_stages_array = winChanceStagesArrays[riderName] || [];
        rider.e_moves_left_gc_array = getEMoveLeftGC(tempCards[riderName], stagesToUse);
        
        const futureStages = rider.e_moves_left_gc_array.slice(1);
        const sumFutureStages = futureStages.reduce((sum, val) => sum + val, 0);
        rider.e_moves_left_total = tempCards[riderName].e_moves_left + sumFutureStages;
        rider.gc_time = 0;
        const seconds_per_round = 100;
        rider.favorit_points_gc = 1 / (1.5 + (rider.e_moves_left_total + rider.gc_time / seconds_per_round));
      }
      
      // Calculate GC win chances
      const factorGC = 17 - 0.6 * 0 + 7 * (numberOfStages - 0 - 1);
      let totalPointsGC = 0;
      for (const rider of pick) {
        totalPointsGC += Math.pow(rider.favorit_points_gc, factorGC);
      }
      
      for (const rider of pick) {
        rider.win_chance_gc = 100 * (Math.pow(rider.favorit_points_gc, factorGC) / totalPointsGC);
        
        // Calculate XprizeMoney
        const gcPrize = 12000 * (1 - Math.pow(1 - rider.win_chance_gc / 100, 3));
        const stagePrizes = rider.win_chance_stages_array.reduce((sum, wc) => sum + (wc / 100) * 7000, 0);
        rider.XprizeMoney = Math.round(gcPrize + stagePrizes);
        
        console.log(`${rider.NAVN}: XPM=${rider.XprizeMoney}, win_chance_gc=${rider.win_chance_gc.toFixed(1)}%, stages=${JSON.stringify(rider.win_chance_stages_array.map(w => w.toFixed(1)))}`);
      }
    }
    
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
        let aiDoubleLead = null;
        if (res) {
          // Extract doubleLead if present
          if (res.doubleLead) aiDoubleLead = res.doubleLead;
          
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

        handlePaceSubmit(groupNum, aiTeamPace, t, aiIsAttack, aiAttackerName, aiDoubleLead);
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
        const allCards = generateCards(rider, false);
        const tk16Cards = allCards.filter(c => c.id === 'kort: 16');
        const regularCards = allCards.filter(c => c.id !== 'kort: 16');
        
        cardsObj[rider.NAVN] = {
            position: 0,
            cards: regularCards,
            discarded: tk16Cards,
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
            selected_value: -1,
            gc_time: 0,
            prize_money: 0,
            points: 0,
            kom_points: 0,
            e_moves_left_total: 0,
            e_moves_left_gc_array: [],
            win_chance_stages_array: [],
            favorit_points_gc: 1,
            win_chance_gc: 10,
            XprizeMoney: 0
          };
      }

  const selectedTrack = getResolvedTrack();
      // computeInitialStats mutates cardsObj and sets win_chance fields
      computeInitialStats(cardsObj, selectedTrack, 0, numberOfTeams);
      
      // Compute GC stats for stage races
      if (isStageRace && selectedStages.length > 0) {
        // Pre-compute win_chance for ALL stages
        const winChanceStagesArrays = {};
        
        for (let stageIdx = 0; stageIdx < selectedStages.length; stageIdx++) {
          const stage = selectedStages[stageIdx];
          
          // Create temporary cards object for this stage calculation
          const tempCards = {};
          for (const riderName in cardsObj) {
            tempCards[riderName] = { ...cardsObj[riderName], position: 0 };
          }
          
          // Compute stats for this stage
          computeInitialStats(tempCards, stage.track, 0, numberOfTeams);
          
          // Store win_chance for this stage
          for (const riderName in tempCards) {
            if (!winChanceStagesArrays[riderName]) {
              winChanceStagesArrays[riderName] = [];
            }
            winChanceStagesArrays[riderName].push(tempCards[riderName].win_chance);
          }
        }
        
        // Assign win_chance_stages_array to each rider
        for (const riderName in cardsObj) {
          cardsObj[riderName].win_chance_stages_array = winChanceStagesArrays[riderName] || [];
        }
        
        // Now compute e_moves_left_gc_array and GC stats
        for (const riderName in cardsObj) {
          const rider = cardsObj[riderName];
          
          // Pre-compute e_moves_left for ALL stages (only once at draft)
          rider.e_moves_left_gc_array = getEMoveLeftGC(rider, selectedStages);
          
          // Calculate e_moves_left_total using pre-computed array
          const futureStages = rider.e_moves_left_gc_array.slice(currentStageIndex + 1);
          const sumFutureStages = futureStages.reduce((sum, val) => sum + val, 0);
          rider.e_moves_left_total = rider.e_moves_left + sumFutureStages;
          rider.favorit_points_gc = getFavoritPointsGC(rider);
        }
        
        const factorGC = 17 - 0.6 * 0 + 7 * (numberOfStages - currentStageIndex - 1);
        const totalPointsGC = getTotalMovesLeftGC(cardsObj, factorGC);
        
        for (const riderName in cardsObj) {
          const rider = cardsObj[riderName];
          rider.win_chance_gc = getWinChanceGC(rider, factorGC, totalPointsGC);
          
          // Calculate XprizeMoney
          const gcPrize = 12000 * (1 - Math.pow(1 - rider.win_chance_gc / 100, 3));
          const stagePrizes = rider.win_chance_stages_array.reduce((sum, wc) => sum + (wc / 100) * 7000, 0);
          rider.XprizeMoney = Math.round(gcPrize + stagePrizes);
        }
      }
      
      const entry = cardsObj[candidate.NAVN];
      // For stage races, use XPM; otherwise use regular win chance
      if (entry) {
        if (isStageRace && typeof entry.XprizeMoney === 'number') {
          // Return XPM directly - AI will pick highest value
          // Ensure minimum of 0 to avoid negative values affecting sort order incorrectly
          const xpm = Math.max(0, entry.XprizeMoney);
          // Debug log to verify XPM is being used (only for AI picks during draft)
          const playerTeam = getPlayerTeamName();
          if (pickingTeam !== playerTeam) {
            console.log(`[DRAFT] ${pickingTeam} evaluating ${candidate.NAVN}: XPM=${xpm}`);
          }
          return xpm;
        }
        if (typeof entry.win_chance === 'number') {
          return entry.win_chance;
        }
      }
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
    } else if (riders_per_team === 1) {
      // For 1 rider per team: human picks at position Math.round((level * teams_count) / 100)
      const pickPosition = Math.round((level * teams_count) / 100);
      list_.push(Math.max(1, Math.min(pickPosition, riders)));
    } else if (riders_per_team === 5) {
      // For 5 riders per team: positions spread evenly based on teams_count
      for (let i = 0; i < 5; i++) {
        const position = Math.round(teams_count / 2) + teams_count * i;
        list_.push(position);
      }
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
    
    // Build teams order based on game mode
    const teamsOrder = [];
    if (gameMode === 'multi' && multiplayerPlayers && multiplayerPlayers.length > 0) {
      // Multiplayer: AI teams first, then human teams
      const numHumans = multiplayerPlayers.length;
      const numAI = numberOfTeams - numHumans;
      
      // Add AI teams
      for (let i = 1; i <= numAI; i++) {
        teamsOrder.push(`Comp${i}`);
      }
      
      // Randomize human team order
      const humanTeams = multiplayerPlayers.map(p => p.team);
      for (let i = humanTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [humanTeams[i], humanTeams[j]] = [humanTeams[j], humanTeams[i]];
      }
      
      // Add human teams
      teamsOrder.push(...humanTeams);
    } else {
      // Single player: computers first then 'Me' last
      for (let i = 1; i < numberOfTeams; i++) teamsOrder.push(`Comp${i}`);
      teamsOrder.push('Me');
    }

    setDraftRemaining(remaining);
    setDraftSelections([]);
    setDraftTeamsOrder(teamsOrder);
    setDraftCurrentPickIdx(0);
    setDraftRoundNum(1);
    setIsDrafting(true);

    // Compute explicit pick sequence using snake draft
    // Round 1: forward (Comp1, Comp2, ..., Human1, Human2, ...)
    // Round 2+: backward (..., Human2, Human1, ..., Comp2, Comp1)
    let seq = null;
    try {
      const totalPicks = remaining.length;
      setDraftTotalPicks(totalPicks);
      
      seq = [];
      for (let round = 0; round < ridersPerTeam; round++) {
        if (round === 0) {
          // First round: forward
          for (const team of teamsOrder) {
            seq.push(team);
          }
        } else {
          // Subsequent rounds: backward (snake draft)
          for (let i = teamsOrder.length - 1; i >= 0; i--) {
            seq.push(teamsOrder[i]);
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
  const processNextPick = (
    remainingArg = null, 
    teamsArg = null, 
    selectionsArg = null, 
    pickSequenceParam = null,
    gameModeOverride = null,
    playerNameOverride = null,
    multiplayerPlayersOverride = null
  ) => {
    const remaining = remainingArg || draftRemaining;
    const teamsOrder = teamsArg || draftTeamsOrder;
    const selections = Array.isArray(selectionsArg) ? selectionsArg : draftSelections;
    const effectiveGameMode = gameModeOverride || gameMode;
    const effectivePlayerName = playerNameOverride || playerName;
    const effectivePlayers = multiplayerPlayersOverride || multiplayerPlayers;

    // Basic guards
    if (!remaining || remaining.length === 0 || !teamsOrder || teamsOrder.length === 0) {
      console.log('❌ processNextPick early return: guards failed', {
        hasRemaining: !!remaining,
        remainingLength: remaining?.length,
        hasTeamsOrder: !!teamsOrder,
        teamsOrderLength: teamsOrder?.length
      });
      return;
    }

  const totalPicksNeeded = draftTotalPicks || (numberOfTeams * ridersPerTeam);
  if (selections.length >= totalPicksNeeded) { setIsDrafting(false); return; }

    // Build counts per team from provided selections
    const counts = {};
    for (const t of teamsOrder) counts[t] = 0;
    for (const s of selections) if (s && s.team) counts[s.team] = (counts[s.team] || 0) + 1;


    // Determine next team using the helper (which may consult draftPickSequence)
  const teamPicking = getNextDraftTeam(selections, teamsOrder, pickSequenceParam);
    if (!teamPicking) { setIsDrafting(false); return; }

    console.log('🎯 processNextPick:', { teamPicking, gameMode: effectiveGameMode, playerName: effectivePlayerName, multiplayerPlayers: effectivePlayers?.map(p => p.name + ':' + p.team) });

    // If it's human's turn, set state and wait for UI interaction
    // In single player, check for 'Me'. 
    // In multiplayer, check if this specific player controls the team
    const isMyTurn = effectiveGameMode === 'multi' 
      ? (effectivePlayers && effectivePlayers.find(p => p.name === effectivePlayerName)?.team === teamPicking)
      : (teamPicking === 'Me');
    
    // Check if ANY human controls this team (to distinguish from AI)
    const isHumanTeam = teamPicking === 'Me' || 
      (effectiveGameMode === 'multi' && effectivePlayers && effectivePlayers.some(p => p.team === teamPicking));
    
    console.log('🎯 isHumanTeam:', isHumanTeam, 'isMyTurn:', isMyTurn);
    
    if (isHumanTeam) {
      // current pick index equals current selections length
      const pickIndex = selections.length;
      setDraftCurrentPickIdx(pickIndex);
      setDraftRoundNum(Math.floor(pickIndex / teamsOrder.length) + 1);
      return; // Wait for human to pick (whether it's me or another player)
    }

    // Computer picks: rank remaining by computed win_chance and choose best
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      // For stage races, use pre-computed XprizeMoney directly from candidate
      // This ensures consistent evaluation across all candidates
      let s;
      if (isStageRace && typeof candidate.XprizeMoney === 'number') {
        s = candidate.XprizeMoney;
        console.log(`[DRAFT] ${teamPicking} evaluating ${candidate.NAVN}: XPM=${s} (pre-computed)`);
      } else {
        s = computeCandidateWinChance(candidate, teamPicking, selections, remaining);
      }
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    }
    const chosen = remaining[bestIdx];
    console.log(`[DRAFT] ${teamPicking} chose ${chosen.NAVN} with score ${bestScore}`);

    const newSelections = [...selections, { team: teamPicking, rider: chosen }];
    const newRemaining = [...remaining.slice(0, bestIdx), ...remaining.slice(bestIdx + 1)];
    setDraftSelections(newSelections);
    setDraftRemaining(newRemaining);
    setDraftPool(newRemaining);

    // Continue to next pick automatically (pass newSelections so state-sync not required)
    // IMPORTANT: Pass through effective parameters to maintain multiplayer context
    if (newSelections.length < totalPicksNeeded) {
      setTimeout(() => processNextPick(newRemaining, teamsOrder, newSelections, pickSequenceParam, effectiveGameMode, effectivePlayerName, effectivePlayers), 150);
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
    
    // Check if it's my turn
    // In single player: teamPicking should be 'Me'
    // In multiplayer: teamPicking should be playerName
    const playerTeam = getPlayerTeamName();
    const isMyDraftTurn = teamPicking === playerTeam;
    
    if (!isMyDraftTurn) {
      // Not our turn — log and ignore click
      return;
    }

    const chosenIdx = draftRemaining.findIndex(r => r.NAVN === rider.NAVN);
    if (chosenIdx === -1) return;

    const chosen = draftRemaining[chosenIdx];
    const newSelections = [...draftSelections, { team: teamPicking, rider: chosen }];
    const newRemaining = [...draftRemaining.slice(0, chosenIdx), ...draftRemaining.slice(chosenIdx + 1)];
    setDraftSelections(newSelections);
    setDraftRemaining(newRemaining);
    setDraftPool(newRemaining);

    // In multiplayer, sync the pick to Firebase
    if (gameMode === 'multi' && roomCode) {
      console.log('📤 Syncing pick to Firebase:', teamPicking, chosen.NAVN);
      const gameRef = doc(db, 'games', roomCode);
      updateDoc(gameRef, {
        'draftData.selections': newSelections.map(s => ({
          team: s.team,
          riderName: s.rider.NAVN
        })),
        lastUpdate: serverTimestamp()
      }).catch(err => console.error('Failed to sync draft pick:', err));
    }

    // Continue automatic picks after human selection — pass the explicit
    // pick sequence to avoid races between setState and the pick loop.
    // IMPORTANT: Pass gameMode, playerName, multiplayerPlayers for multiplayer context
    setTimeout(() => processNextPick(newRemaining, draftTeamsOrder, newSelections, seqLocal, gameMode, playerName, multiplayerPlayers), 120);
  };

  const confirmDraftAndStart = async () => {
    // If we completed an interactive draft, use the explicit team mapping
    const total = numberOfTeams * ridersPerTeam;
    console.log('🎮 confirmDraftAndStart called:', {
      draftSelectionsLength: draftSelections?.length,
      total,
      gameMode,
      roomCode
    });
    
    if (draftSelections && draftSelections.length === total) {
      // Debug: log all draft selections with teams
      console.log('🎮 All draft selections:');
      draftSelections.forEach((s, i) => {
        console.log(`  ${i}: ${s.rider?.NAVN} -> team: ${s.team}`);
      });
      
      // drafted array with explicit team marker: { rider, team }
      const drafted = draftSelections.slice(0, total).map(s => ({ rider: s.rider, team: s.team }));
      console.log('🎮 Drafted riders:', drafted.length, 'first:', drafted[0]?.rider?.NAVN, 'team:', drafted[0]?.team);
      
      // In multiplayer, sync game start to Firebase
      if (gameMode === 'multi' && roomCode) {
        try {
          // Generate breakaway selection (deterministic for both players)
          // Build team list using player names (same as initializeGame)
          const teamList = [];
          const numAI = numberOfTeams - multiplayerPlayers.length;
          for (let i = 1; i <= numAI; i++) {
            teamList.push(`Comp${i}`);
          }
          multiplayerPlayers.forEach(p => {
            teamList.push(p.name);
          });
          
          const total = numberOfTeams * ridersPerTeam;
          const breakawayCount = Math.min(numAttackers, total);
          
          // Pick breakaway teams randomly
          const shuffledTeams = [...teamList].sort(() => Math.random() - 0.5);
          const chosenTeams = shuffledTeams.slice(0, breakawayCount);
          
          // Map to team names from drafted (convert Team1/Team2 to actual player names)
          const breakawayTeamsWithPlayers = chosenTeams.map(t => {
            // Find first rider from this team
            const riderFromTeam = drafted.find(d => d.team === t);
            return riderFromTeam ? riderFromTeam.team : t;
          });
          
          // Generate team order that will be used by both players
          const gameTeamOrder = [...teamList].sort(() => Math.random() - 0.5);
          // Determine the starting team (first team with riders in group 2)
          const startingTeam = gameTeamOrder[0]; // For now, use first team (both will calculate findNextTeamWithRiders the same)
          
          const gameRef = doc(db, 'games', roomCode);
          await updateDoc(gameRef, {
            status: 'playing',
            gameState: 'playing',
            draftSelections: drafted, // Sync the drafted riders so joiner can access them
            breakawayTeams: breakawayTeamsWithPlayers, // Sync breakaway team selection
            teamOrder: gameTeamOrder, // Sync team order for consistent turn order
            currentTeam: startingTeam, // Sync starting team
            lastUpdate: serverTimestamp()
          });
          console.log('📤 Synced game start to Firebase with', drafted.length, 'riders and', breakawayTeamsWithPlayers.length, 'breakaway teams:', breakawayTeamsWithPlayers);
        } catch (err) {
          console.error('Failed to sync game start:', err);
        }
      }
      
      // In multiplayer, don't call initializeGame here - let the subscribers handle it
      // to ensure both players initialize with the same data from Firebase
      if (gameMode !== 'multi') {
        console.log('🎮 Single player: Calling initializeGame with', drafted.length, 'riders');
        initializeGame(drafted, selectedStages);
      } else {
        console.log('🎮 Multiplayer: Waiting for subscribers to initialize game');
      }
      
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

    console.log('⚠️ No draft selections, using fallback');
    // fallback: non-interactive flow (legacy)
    initializeGame(draftPool, selectedStages);
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

  const handlePaceSubmit = (groupNum, pace, team = null, isAttack = false, attackerName = null, doubleLead = null, cardsSnapshot = null, forceFinalize = false) => {
    // doubleLead: { pace1, pace2, rider1, rider2 } when dobbeltføring is active
    // cardsSnapshot: pass through updated cards from handleHumanChoices to avoid React state timing issues
    // forceFinalize: skip double-submission check and proceed to finalization (for multiplayer HOST)
    console.log('🚀 handlePaceSubmit START: group=', groupNum, 'team=', team || currentTeam, 'pace=', pace, 'hasSnapshot=', !!cardsSnapshot, 'forceFinalize=', forceFinalize);
    console.log('🔍 dobbeltføringLeadersRef at START:', JSON.stringify(dobbeltføringLeadersRef.current || []));
    
    // Guard: if we've already finalized movement for this group (movePhase is cardSelection), ignore
    // This prevents double-execution if multiple calls trigger finalization simultaneously
    if (movePhaseRef.current !== 'input') {
      console.warn(`⚠️ handlePaceSubmit called but movePhase is ${movePhaseRef.current} (expected input) - ignoring`);
      return;
    }

    const submittingTeam = team || currentTeam;
    
    console.log('🚀 Check 1: gameMode=', gameMode, 'submittingTeam=', submittingTeam, 'playerName=', playerName);
    
    // Check if this is an AI team
    const playerTeams = multiplayerPlayers.map(p => p.team);
    const isAITeam = !playerTeams.includes(submittingTeam);
    
    // In multiplayer mode, only allow submissions from:
    // 1. AI teams (if this is the host)
    // 2. The player's own team
    if (gameMode === 'multi' && submittingTeam !== playerName) {
      
      console.log('🚀 Check 2: isAITeam=', isAITeam, 'isHost=', isHost, 'playerTeams=', playerTeams);
      
      // Only host can submit AI moves
      if (isAITeam && !isHost) {
        console.log('❌ BLOCKED: Non-host attempted AI move');
        addLog(`⚠️ Non-host attempted to submit AI move for ${submittingTeam} - blocked`);
        return;
      }
      
      // Players can only submit for their own team
      if (!isAITeam && submittingTeam !== playerName) {
        console.log('❌ BLOCKED: Player attempted move for another team');
        addLog(`⚠️ Player attempted to submit for another player's team ${submittingTeam} - blocked`);
        return;
      }
    }
    
    console.log('🚀 Passed multiplayer checks');
    
    const paceKey = `${groupNum}-${submittingTeam}`;

    // Prevent double-submission by same team for the same round.
    // If the group is in round 2 we allow replacing a round-1 submission.
    const existingMeta = teamPaceMeta[paceKey];
    const existingRound = existingMeta && existingMeta.round ? existingMeta.round : 1;
    const currentRound = (teamPaceRound && teamPaceRound[groupNum]) ? teamPaceRound[groupNum] : 1;
    
    console.log('🚀 Check 3: existingMeta=', !!existingMeta, 'existingRound=', existingRound, 'currentRound=', currentRound);
    
    if (existingMeta && existingRound >= currentRound && !forceFinalize) {
      console.log('❌ BLOCKED: Team already chose for this group');
      addLog(`${submittingTeam} already chose for group ${groupNum}`);
      
      // In multiplayer mode, check if all teams have submitted and trigger finalization
      const isMultiplayer = !!roomCodeRef.current;
      if (isMultiplayer) {
        console.log('🔄 BLOCKED but checking if should finalize anyway...');
        const teamsArray = teams.filter(t => t !== 'Me');
        const groupRidersAll = Object.entries(cards).filter(([, r]) => r.group === groupNum && !r.finished);
        const teamsWithRiders = teamsArray.filter(t => groupRidersAll.some(([, r]) => r.team === t && r.attacking_status !== 'attacker'));
        
        const allSubmitted = teamsWithRiders.every(t => {
          const key = `${groupNum}-${t}`;
          return !!teamPaceMeta[key];
        });
        
        console.log('🔄 All teams submitted check:', { teamsWithRiders, allSubmitted, movePhase });
        
        // Check both isHost and amHost (derived from multiplayerPlayers)
        const amHost = isHost || (multiplayerPlayers && multiplayerPlayers.length > 0 && multiplayerPlayers.find(p => p.name === playerName)?.isHost);
        
        // Check if this player is the ONLY human player in this group
        const humanTeamsInGroup = teamsWithRiders.filter(t => !t.startsWith('Comp'));
        const isOnlyHumanInGroup = humanTeamsInGroup.length === 1 && humanTeamsInGroup[0] === submittingTeam;
        
        console.log('🔄 Group composition:', { 
          humanTeamsInGroup, 
          isOnlyHumanInGroup, 
          submittingTeam 
        });
        
        if (allSubmitted && movePhaseRef.current === 'input') {
          if (amHost || isOnlyHumanInGroup) {
            console.log('🔄 HOST or ONLY_HUMAN: All teams submitted, forcing finalization...');
            calculateGroupSpeed(groupNum, cardsSnapshot || cards);
            return;
          } else {
            console.log('🔄 JOINER: All teams submitted, waiting for HOST to finalize...');
            addLog('Waiting for host to finalize...');
            return;
          }
        }
      }
      
      // In single player AI already submitted check
      if (roomCodeRef.current && isHost && isAITeam) {
        console.log('🤖 AI team already submitted, checking if should finalize...');
        const teamsArray = teams.filter(t => t !== 'Me');
        const groupRidersAll = Object.entries(cards).filter(([, r]) => r.group === groupNum && !r.finished);
        const teamsWithRiders = teamsArray.filter(t => groupRidersAll.some(([, r]) => r.team === t && r.attacking_status !== 'attacker'));
        
        const allSubmitted = teamsWithRiders.every(t => {
          const key = `${groupNum}-${t}`;
          const hasMeta = teamPaceMeta[key] !== undefined;
          console.log(`🤖 Team ${t} key ${key}: ${hasMeta ? 'submitted' : 'not submitted'}`);
          return hasMeta;
        });
        
        if (allSubmitted) {
          console.log('🤖 All teams submitted! Triggering finalization...');
          const groupNum = currentGroup;
          setTimeout(() => {
            handlePaceSubmit(groupNum, 0, submittingTeam, false, null, cards, null, true);
          }, 50);
        } else {
          console.log('🤖 Not all teams submitted yet, advancing turn to next unsubmitted team...');
          // Not all teams submitted - advance turn to next team that hasn't submitted
          const currentTeamIdx = teamsArray.indexOf(submittingTeam);
          let nextTeam = null;
          
          for (let i = 1; i <= teamsArray.length; i++) {
            const idx = (currentTeamIdx + i) % teamsArray.length;
            const t = teamsArray[idx];
            const key = `${groupNum}-${t}`;
            const hasSubmitted = teamPaceMeta[key] !== undefined;
            const hasRiders = groupRidersAll.some(([, r]) => r.team === t && r.attacking_status !== 'attacker');
            
            console.log(`🤖 Checking team ${t}: hasSubmitted=${hasSubmitted}, hasRiders=${hasRiders}`);
            
            if (!hasSubmitted && hasRiders) {
              nextTeam = t;
              break;
            }
          }
          
          if (nextTeam && nextTeam !== currentTeam) {
            console.log('🤖 Advancing turn to next unsubmitted team:', nextTeam);
            setCurrentTeam(nextTeam);
            currentTeamRef.current = nextTeam;
            syncMoveToFirebase(nextTeam).catch(err => console.error('Failed to sync turn advancement:', err));
          } else {
            console.log('🤖 No next unsubmitted team found, staying on:', currentTeam);
          }
        }
      }
      
      return;
    }
    
    if (forceFinalize) {
      console.log('🚀 Skipping double-submission check due to forceFinalize flag');
    } else {
      console.log('🚀 Passed double-submission check, continuing...');
    }

  // Use cardsSnapshot if provided (from Play Group), otherwise use current cards state
  // In multiplayer with forceFinalize, use cardsRef to avoid stale state
  const cardsToUse = cardsSnapshot || (forceFinalize ? cardsRef.current : cards);
  
  console.log('🚀 cardsToUse: hasSnapshot=', !!cardsSnapshot, 'forceFinalize=', forceFinalize, 'cardsCount=', Object.keys(cardsToUse).length);
  
  // Additional debug for multiplayer finalization
  if (forceFinalize) {
    const ridersInGroup = Object.entries(cardsToUse).filter(([, r]) => r.group === groupNum && !r.finished);
    console.log('🚀 forceFinalize debug: groupNum=', groupNum, 'ridersInGroup=', ridersInGroup.length, 
      'riders=', ridersInGroup.map(([n, r]) => `${n}(team=${r.team})`).join(', '));
  }

  // Declare variables that will be used in finalization logic
  let newTeamPaces;
  let newMeta;

  // When forceFinalize is true, skip pace recording and jump directly to finalization checks
  if (!forceFinalize) {

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
    const groupRidersAllCheck = Object.entries(cardsToUse).filter(([, r]) => r.group === groupNum && !r.finished);
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
  
  // Process manual dobbeltføring if provided
  if (doubleLead) {
    const dobbeltforingResult = processDobbeltforing({
      teamPacesForGroup: {},  // Not needed for manual
      teamPaceMeta: {},
      groupNum,
      groupPos: 0,  // Not needed for manual terrain check
      currentSpeed: parseInt(pace),
      track,
      cards,
      manualDobbeltforing: doubleLead,
      enabled: dobbeltføring
    });
    
    if (dobbeltforingResult.applied) {
      finalPace = dobbeltforingResult.newSpeed;
      isDoubleLead = true;
      // Replace (not append) leaders - each submission should override previous
      dobbeltføringLeadersRef.current = dobbeltforingResult.leaders;
      dobbeltforingResult.logMessages.forEach(msg => addLog(msg));
      addLog(`🔍 DEBUG: Manual dobbeltføring - marking ${dobbeltforingResult.leaders.join(', ')} as leaders`);
    }
  }
  
  // Update refs synchronously for immediate use
  teamPacesRef.current = { ...teamPacesRef.current, [paceKey]: finalPace };
  newTeamPaces = teamPacesRef.current;
  
  // Also update React state (asynchronous)
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
  // IMPORTANT: Use roundRef.current (not teamPaceRound) to get the current game round
  // teamPaceRound tracks choice-1 vs choice-2 within a single group's turn
  // roundRef.current tracks the actual game round number (1, 2, 3, etc.)
  const metaEntry = { 
    pace: finalPace, // Include the pace value so all players can see it
    isAttack: effectiveIsAttack, 
    attacker: effectiveAttacker, 
    round: roundRef.current || round, // Use ref for immediate updates from Firebase
    doubleLead: isDoubleLead ? doubleLead : null,
    timestamp: Date.now() // Add timestamp to track submission order
  };
  if (currentRound === 2 && typeof prevPaceForThisTeam !== 'undefined') metaEntry.prevPace = prevPaceForThisTeam;
  
  // Update refs synchronously for immediate use
  teamPaceMetaRef.current = { ...teamPaceMetaRef.current, [paceKey]: metaEntry };
  newMeta = teamPaceMetaRef.current;
  
  // Also update React state (asynchronous)
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
  } else {
    // forceFinalize=true: Use existing values from refs
    console.log('🚀 forceFinalize=true, using existing teamPaces and teamPaceMeta from refs');
    newTeamPaces = teamPacesRef.current;
    newMeta = teamPaceMetaRef.current;
  } // End of if (!forceFinalize) - pace recording block
    
    // Calculate next team for turn advancement
    const nextIdx = (teams.indexOf(submittingTeam) + 1) % teams.length;
    const nextTeam = findNextTeamWithRiders(nextIdx, groupNum);

    // Determine which teams actually have riders in this group
  const groupRidersAll = Object.entries(cardsToUse).filter(([, r]) => r.group === groupNum && !r.finished);
    
    // DEBUG: Log what riders are actually in this group
    try {
      addLog(`DEBUG groupRidersAll for group ${groupNum}: ${groupRidersAll.map(([n, r]) => `${n}(team=${r.team},sv=${r.selected_value},tl=${r.takes_lead})`).join(', ')}`);
    } catch(e) {}
    
    // Only consider teams that have at least one non-attacker rider for the
    // purposes of submitting and finalizing the group's pace. Teams whose
    // only presence in the group is an attacker should not block the basic
    // group pace decision.
  console.log('🚀 Building teamsWithRiders: teams=', teams, 'groupRidersAll.length=', groupRidersAll.length);
  
  // Build teams list from cards if teams state is empty (multiplayer issue)
  const teamsList = teams.length > 0 ? teams : Array.from(new Set(Object.values(cardsToUse).map(r => r.team)));
  console.log('🚀 Using teamsList:', teamsList);
  
  const teamsWithRiders = teamsList.filter(t => groupRidersAll.some(([, r]) => r.team === t && r.attacking_status !== 'attacker'));
  console.log('🚀 teamsWithRiders result:', teamsWithRiders);

    // Collect submitted paces per team for this group, but only include
    // submissions that belong to the current round and from teams that
    // actually have non-attacker riders in the group.
    const submittedPaces = {};
    
    // Determine the actual round: prefer roundRef/round, but if they're 0/undefined,
    // extract the round from existing metadata for this group
    let actualRound = roundRef.current || round;
    if (!actualRound) {
      // Try to infer round from existing metadata for this group
      const groupMetaEntries = Object.entries(newMeta).filter(([k]) => k.startsWith(`${groupNum}-`));
      if (groupMetaEntries.length > 0) {
        const inferredRound = Math.max(...groupMetaEntries.map(([, meta]) => meta && meta.round ? meta.round : 1));
        actualRound = inferredRound;
        console.log('🚀 Inferred actualRound from metadata:', actualRound);
      } else {
        actualRound = 1; // Default to round 1
      }
    }
    
    addLog(`🔍 newTeamPaces keys: ${JSON.stringify(Object.keys(newTeamPaces).filter(k => k.startsWith(`${groupNum}-`)))}`);
    Object.entries(newTeamPaces).forEach(([k, v]) => {
      if (!k.startsWith(`${groupNum}-`)) return;
      const t = k.split('-')[1];
      if (!teamsWithRiders.includes(t)) return; // ignore teams without non-attacker riders
      const meta = newMeta[k] || {};
      const metaRound = meta && meta.round ? meta.round : 1;
      if (metaRound === actualRound) submittedPaces[t] = Math.max(submittedPaces[t] || 0, parseInt(v));
    });
    
    // Get player team name and check multiplayer status before using them
    const playerTeam = getPlayerTeamName();
    const isMultiplayer = !!roomCodeRef.current;
    
    // In multiplayer: If Host is force-finalizing and there are remote human teams that haven't submitted,
    // treat them as "submitted pace=0" so they don't block finalization.
    // Remote humans will just play cards to match the calculated group speed.
    // IMPORTANT: Only do this when forceFinalize=true, not on every submission
    if (isMultiplayer && isHost && forceFinalize) {
      const humanTeamsInGroup = teamsWithRiders.filter(t => !t.startsWith('Comp'));
      const remoteHumans = humanTeamsInGroup.filter(t => t !== playerTeam);
      
      for (const remoteTeam of remoteHumans) {
        if (submittedPaces[remoteTeam] === undefined) {
          addLog(`🔍 Auto-submitting pace=0 for remote human team ${remoteTeam} (will match group speed)`);
          submittedPaces[remoteTeam] = 0;
        }
      }
    }
    addLog(`🔍 submittedPaces built: ${JSON.stringify(submittedPaces)}, teamsWithRiders=${JSON.stringify(teamsWithRiders)}, will continue=${Object.keys(submittedPaces).length >= teamsWithRiders.length && (!teamsWithRiders.includes('Me') || submittedPaces['Me'] !== undefined)}`);

  console.log('🚀 Pre-finalization checks:', {
    submittedPacesCount: Object.keys(submittedPaces).length,
    teamsWithRidersCount: teamsWithRiders.length,
    submittedPaces,
    teamsWithRiders,
    playerTeam,
    forceFinalize
  });

  // CRITICAL: In multiplayer mode, sync the submission to Firebase immediately
  // so other players can see this team's move before we wait for all teams to submit
  // Host also advances currentTeam to the next team and syncs that value
  // Check roomCode ref instead of gameMode/roomCode state since they may have stale closure values
  if (roomCodeRef.current) {
    console.log('📤 Syncing partial submission to Firebase (team:', submittingTeam, ')');
    
    // In multiplayer, check if this is the only human team in the group
    // If so, don't advance currentTeam - just wait for finalization
    const humanTeamsInGroup = teamsWithRiders.filter(t => !t.startsWith('Comp'));
    const isOnlyHumanTeam = humanTeamsInGroup.length === 1 && humanTeamsInGroup[0] === submittingTeam;
    
    console.log('🔄 Human teams check:', { 
      humanTeamsInGroup, 
      submittingTeam, 
      isOnlyHumanTeam,
      nextTeam,
      isHost 
    });
    
    if (isHost && nextTeam && !isOnlyHumanTeam) {
      console.log('🔄 Host advancing currentTeam to:', nextTeam);
      setCurrentTeam(nextTeam);
      // Pass nextTeam to sync since setState is async
      syncMoveToFirebase(nextTeam).catch(err => console.error('Failed to sync partial submission:', err));
    } else if (!isHost && submittingTeam === currentTeamRef.current && nextTeam && !isOnlyHumanTeam) {
      // JOINER case: If JOINER just submitted and JOINER is currentTeam, advance to next team
      // This prevents JOINER from getting stuck on "Your Teams turn" after submission
      console.log('🔄 JOINER advancing currentTeam to:', nextTeam, '(after own submission)');
      setCurrentTeam(nextTeam);
      // Sync with new currentTeam so HOST sees the advancement
      syncMoveToFirebase(nextTeam).catch(err => console.error('Failed to sync JOINER turn advancement:', err));
    } else {
      if (isOnlyHumanTeam) {
        console.log('🔄 Only human team in group - NOT advancing currentTeam, waiting for finalization');
      }
      syncMoveToFirebase().catch(err => console.error('Failed to sync partial submission:', err));
    }
  }

  // If the player's team has riders in this group, require that
  // the player submits in the current round before finalizing.
  if (teamsWithRiders.includes(playerTeam) && (submittedPaces[playerTeam] === undefined)) {
    console.log('❌ RETURN: Waiting for player team to submit');
    return;
  }

  // Wait until all teams that have non-attacker riders have submitted for this ROUND
  if (Object.keys(submittedPaces).length < teamsWithRiders.length) {
    console.log('❌ RETURN: Not all teams have submitted yet. submitted:', Object.keys(submittedPaces).length, 'needed:', teamsWithRiders.length);
    // In multiplayer, even though not all teams submitted, we've already advanced currentTeam above
    // so the next team can start their submission
    return;
  }
  
  console.log('🚀 All teams have submitted, proceeding to finalize...');
  console.log('🚀 Finalization data:', {
    submittedPaces,
    teamsWithRiders,
    newTeamPaces: Object.keys(newTeamPaces).filter(k => k.startsWith(`${groupNum}-`)),
    newMeta: Object.keys(newMeta).filter(k => k.startsWith(`${groupNum}-`))
  });

  // If we're finishing round 1 and any team declared an attack in this group,
  // open a second round (choice-2) allowing all teams to resubmit. Do not
  // finalize movement during this transition.
  // SKIP this check if forceFinalize=true (we're already in choice-2)
  if (currentRound === 1 && !forceFinalize) {
    const anyAttack = Object.entries(newMeta).some(([k, m]) => k.startsWith(`${groupNum}-`) && m && m.isAttack);
    if (anyAttack) {
      setTeamPaceRound(prev => ({ ...(prev || {}), [groupNum]: 2 }));
      teamPaceRoundRef.current = { ...(teamPaceRoundRef.current || {}), [groupNum]: 2 }; // Update ref immediately
      addLog(`Choice-2 opened for group ${groupNum} due to attack — teams may revise their choices`);
      console.log('❌ RETURN: Opening choice-2 for attack');
      
      // Sync to Firebase so all players know we're in round 2
      if (roomCodeRef.current && isHost) {
        syncMoveToFirebase().catch(err => console.error('Failed to sync choice-2 opening:', err));
      }
      return;
    }
  }

    // If any teams submitted explicit paces for this group, use the highest
    // submitted pace to determine group movement. Non-submitting teams are
    // treated as 0. This prevents an attacker's selected_value from overriding
    // announced team paces.
    const teamPacesForGroup = {};
    addLog(`🔍 Building teamPacesForGroup for group ${groupNum}: submittedPaces keys=${Object.keys(submittedPaces).length}, teamsWithRiders=${JSON.stringify(teamsWithRiders)}`);
    if (Object.keys(submittedPaces).length > 0) {
      for (const t of teamsWithRiders) {
        if (!teamsWithRiders.includes(t)) {
          teamPacesForGroup[t] = 0;
          try { addLog(`${t}: Team has no rider in the group`); } catch(e) {}
          continue;
        }
        const submittedValue = submittedPaces[t] || 0;
        teamPacesForGroup[t] = Math.max(submittedValue, 0);
        addLog(`🔍 ${t}: submittedValue=${submittedValue} -> teamPacesForGroup[${t}]=${teamPacesForGroup[t]}`);
      }
    } else {
      // No submitted paces -> compute per-rider values (attackers excluded)
      for (const t of teamsWithRiders) {
        let teamMax = 0;
        const teamRiders = groupRidersAll.filter(([, r]) => r.team === t);
        if (teamRiders.length === 0) {
          teamPacesForGroup[t] = 0;
          try { addLog(`${t}: Team has no rider in the group`); } catch (e) {}
          continue;
        }
        try { addLog(`DEBUG ${t}: teamRiders=${teamRiders.map(([n, r]) => `${n}(sv=${r.selected_value},tl=${r.takes_lead})`).join(',')}`); } catch(e) {}
        for (const [name, rider] of teamRiders) {
          let riderValue = 0;
          if (rider.attacking_status === 'attacker') {
            riderValue = 0;
          } else if (rider.takes_lead === 0) {
            riderValue = 0;
          } else if (rider.takes_lead > 0) {
            // Use selected_value directly - it was already calculated in autoPlayTeam()
            riderValue = typeof rider.selected_value === 'number' && rider.selected_value > 0 ? Math.round(rider.selected_value) : 0;
            try { addLog(`DEBUG ${t}: ${name} takes_lead=${rider.takes_lead} selected_value=${rider.selected_value} -> riderValue=${riderValue}`); } catch(e) {}
          }
          if (riderValue > teamMax) teamMax = riderValue;
        }
        teamPacesForGroup[t] = teamMax || 0;
      }
    }

    // DEBUG: dump computed paces and contributors to help diagnose incorrect speeds
    try {
      const nonAttackerValues = Object.entries(cardsToUse)
        .filter(([, r]) => r.group === groupNum && r.attacking_status !== 'attacker')
        .map(([n, r]) => ({ name: n, team: r.team, selected_value: r.selected_value }));
      addLog(`DEBUG teamsWithRiders=${JSON.stringify(teamsWithRiders)}`);
      addLog(`DEBUG submittedPaces=${JSON.stringify(submittedPaces)}`);
      addLog(`DEBUG teamPacesForGroup BEFORE calculateGroupSpeed=${JSON.stringify(teamPacesForGroup)}`);
      addLog(`DEBUG nonAttackerSelected=${JSON.stringify(nonAttackerValues)}`);
    } catch (e) {
      addLog(`ERROR in debug logging: ${e.message || e}`);
    }

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
  const groupPos = Math.max(...Object.values(cardsToUse).filter(r => r.group === groupNum && !r.finished).map(r => r.position));

    // Determine the maximum chosen pace among teams (0 if none)
    const maxChosen = allPaces.length > 0 ? Math.max(...allPaces.filter(p => p > 0)) : 0;

    // Get positions of groups ahead for catch-up logic (exclude finished riders)
    const aheadPositions = Object.values(cardsToUse).filter(r => r.group > groupNum && !r.finished).map(r => r.position);
    
    // Calculate group speed using consolidated logic
    const speedResult = calculateGroupSpeed({
      teamPacesForGroup,
      teamPaceMeta: newMeta,
      groupNum,
      groupPos,
      track,
      cards: cardsToUse,
      aheadPositions,
      dobbeltforingEnabled: dobbeltføring,
      manualDobbeltforingLeaders: dobbeltføringLeadersRef.current || []
    });
    
    let speed = speedResult.speed;
    
    // Apply dobbeltføring leaders if automatic dobbeltføring was applied
    if (speedResult.dobbeltforingApplied) {
      dobbeltføringLeadersRef.current = speedResult.dobbeltforingLeaders;
      
      // Update teamPacesForGroup with the new speed (includes +1 from dobbeltføring)
      // Find which team(s) contributed to dobbeltføring and update their pace
      for (const leaderName of speedResult.dobbeltforingLeaders) {
        const leader = cardsToUse[leaderName];
        if (leader && teamPacesForGroup[leader.team] !== undefined) {
          // Update to the new speed (which already includes the +1 bonus)
          teamPacesForGroup[leader.team] = speed;
        }
      }
    }
    
    // Save teamPacesForGroup in ref AFTER dobbeltføring has been calculated and applied
    // This ensures confirmMove gets the correct speed including any dobbeltføring bonus
    teamPacesForGroupRef.current = { ...teamPacesForGroup };
    
    // Log all messages from speed calculation
    speedResult.logMessages.forEach(msg => {
      try { addLog(msg); } catch (e) {}
    });
    
    // If speed was forced by catch-up, clear selected_value/takes_lead for all riders
    if (speedResult.forcedByCatchUp) {
      addLog(`⚡ Group ${groupNum} overtaget bagfra — ingen lead rider (ingen træthedskort)`);
      
      // Clear dobbeltføring leaders since catch-up forcing overrides manual selection
      dobbeltføringLeadersRef.current = [];
      
      // Clear immediately in snapshot so confirmMove sees the cleared values
      if (cardsSnapshotRef.current) {
        for (const [n, r] of Object.entries(cardsSnapshotRef.current)) {
          if (r.group === groupNum) {
            cardsSnapshotRef.current[n] = { ...r, selected_value: 0, takes_lead: 0 };
          }
        }
      }
      setCards(prev => {
        const updated = { ...prev };
        for (const [n, r] of Object.entries(updated)) {
          if (r.group === groupNum) updated[n] = { ...r, selected_value: 0, takes_lead: 0 };
        }
        return updated;
      });
    }
    
    // If speed was blocked by group ahead, clear takes_lead/selected_value
    if (speedResult.blockedByAhead) {
      // Clear dobbeltføring leaders since blocking overrides manual selection
      dobbeltføringLeadersRef.current = [];
      
      // Clear immediately in snapshot so confirmMove sees the cleared values
      if (cardsSnapshotRef.current) {
        for (const [n, r] of Object.entries(cardsSnapshotRef.current)) {
          if (r.group === groupNum) {
            cardsSnapshotRef.current[n] = { ...r, takes_lead: 0, selected_value: 0 };
          }
        }
      }
      setCards(prev => {
        const updated = { ...prev };
        for (const [n, r] of Object.entries(updated)) {
          if (r.group === groupNum) {
            updated[n] = { ...r, takes_lead: 0, selected_value: 0 };
          }
        }
        return updated;
      });
    }
    
    // Compute slipstream for final speed (recomputed if blocked)
    let sv = getSlipstreamValue(groupPos, groupPos + speed, track);
    const effectiveSV = getEffectiveSV(sv, speed);
    setGroupSpeed(speed);
    setSlipstream(effectiveSV); // Effective SV for min-requirement calculation
    setRawSV(sv); // Raw SV from terrain for card value selection
    setIsFlat(sv === 3);
    // Store in refs so card selection dialog can show them even after state is reset
    groupSpeedRef.current = speed;
    slipstreamRef.current = effectiveSV;
    rawSVRef.current = sv;

    // Ensure each team has a value (default 0) - only for teams with riders in this group
    for (const t of teamsWithRiders) teamPacesForGroup[t] = Math.max(teamPacesForGroup[t] || 0, 0);

    const maxPace = allPaces.length > 0 ? Math.max(...allPaces.filter(p => p > 0)) : 0;

    // If maxPace is 0 but speed was increased due to slipstream catch-up, we need a leader
    const needsLeaderForSlipstream = maxPace === 0 && speed > 2;

    if (maxPace > 0 || needsLeaderForSlipstream) {
      // If slipstream catch-up, choose any team with a rider in the group
      const teamsWithMax = maxPace > 0 
        ? Object.entries(teamPacesForGroup).filter(([t, p]) => p === maxPace).map(([t]) => t)
        : teams.filter(t => Object.values(cardsToUse).some(r => r.group === groupNum && r.team === t));
      
      let chosenTeam = teamsWithMax[0] || null;
      for (const t of teams) { if (teamsWithMax.includes(t)) { chosenTeam = t; break; } }

      if (chosenTeam) {
        // GUARD: Prevent duplicate leader assignment for the same group
        // This protects against React batching multiple setCards calls
        if (leaderAssignedForGroupRef.current === groupNum) {
          console.warn(`⚠️ Leader already assigned for group ${groupNum} - skipping duplicate assignment`);
          // Still need to set movePhase to cardSelection, so jump to that section
          if (cardsSnapshot) {
            cardsSnapshotRef.current = cardsSnapshot;
          }
          setMovePhase('cardSelection');
          movePhaseRef.current = 'cardSelection';
          console.log('✅ Set movePhase to cardSelection (skipped leader assignment)');
          return;
        }
        
        // Mark that we're assigning a leader for this group
        leaderAssignedForGroupRef.current = groupNum;
        console.log(`🔒 Set leaderAssignedForGroupRef = ${groupNum}`);
        
        // Special handling for manual dobbeltføring: both riders are already marked as leaders
        const manualDobbeltføringLeaders = (dobbeltføringLeadersRef.current || []).filter(name => cardsToUse[name] && cardsToUse[name].group === groupNum);
        
        console.log('🔍 Leader assignment check: group=', groupNum, 'dobbeltføringLeaders=', JSON.stringify(manualDobbeltføringLeaders), 'length=', manualDobbeltføringLeaders.length);
        
        if (manualDobbeltføringLeaders.length === 2) {
          console.log('🎯 DOBBELTFØRING PATH: Setting takes_lead for 2 leaders');
          // For manual dobbeltføring, both riders are already leaders - just set their takes_lead and planned cards
          setCards(prev => {
            console.log('🎯 DOBBELTFØRING setCards UPDATER executing for group', groupNum);
            const updated = { ...prev };
            const groupRiders = Object.entries(updated).filter(([, r]) => r.group === groupNum).map(([n, r]) => ({ name: n, ...r }));
            
            // Clear takes_lead for all riders first
            for (const r of groupRiders) {
              updated[r.name] = { ...updated[r.name], takes_lead: 0 };
            }
            
            // Set takes_lead and planned card for both dobbeltføring leaders
            for (const leaderName of manualDobbeltføringLeaders) {
              const leadR = updated[leaderName];
              const leaderSelectedValue = leadR.selected_value || 0;
              
              let planned = null;
              const top4Before = leadR.cards.slice(0, Math.min(4, leadR.cards.length));
              const svAfter = getSlipstreamValue(leadR.position, leadR.position + Math.floor(leaderSelectedValue), track);
              const targetNumeric = Math.round(leaderSelectedValue);
              const localPenalty = top4Before.filter(c => c && c.id && c.id.startsWith('TK-1')).length;

              // Find best card (same logic as single leader)
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

              updated[leaderName] = { ...leadR, takes_lead: 1, planned_card_id: planned };
              console.log(`🎯 DOBBELTFØRING: Set ${leaderName} takes_lead=1, selected_value=${leaderSelectedValue}, planned=${planned}`);
              addLog(`${leaderName} (${leadR.team}) assigned as dobbeltføring leader for group ${groupNum} (selected_value=${leaderSelectedValue}, planned=${planned})`);
            }
            
            return updated;
          });
        } else {
          console.log('🎯 NORMAL PATH: Single leader assignment (not dobbeltføring)');
          // Normal single leader assignment
          setCards(prev => {
            console.log('🎯 NORMAL setCards UPDATER executing for group', groupNum);
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

            // If no candidates match selected_value (e.g., slipstream catch-up scenario),
            // pick any rider from chosenTeam who can play the required speed
            if (candidates.length === 0) {
              const teamRiders = groupRiders.filter(r => r.team === chosenTeam && r.attacking_status !== 'attacker');
              
              if (needsLeaderForSlipstream) {
                addLog(`⚠️ Slipstream catch-up: No rider in ${chosenTeam} with selected_value=${speedVal}, searching for capable rider...`);
              } else {
                addLog(`⚠️ Speed mismatch: No rider in ${chosenTeam} with selected_value=${speedVal} (speed was adjusted), searching for capable rider...`);
              }
              
              for (const r of teamRiders) {
                const top4 = (r.cards || []).slice(0, 4);
                const localPenalty = top4.filter(c => c && c.id && c.id.startsWith('TK-1')).length;
                const pos = r.position || 0;
                const sv = getSlipstreamValue(pos, pos + Math.floor(speedVal), track);
                
                // Check if rider can play speedVal
                for (const c of top4) {
                  if (!c || !c.id || c.id.startsWith('TK-1')) continue;
                  const cardVal = sv > 2 ? c.flat : c.uphill;
                  if (cardVal - localPenalty >= speedVal) {
                    candidates.push(r);
                    addLog(`Found capable rider: ${r.name} can play ${speedVal} with card value ${cardVal} (penalty=${localPenalty})`);
                    break;
                  }
                }
                if (candidates.length > 0) break;
              }
              
              if (candidates.length > 0) {
                addLog(`${candidates[0].name} (${chosenTeam}) selected to lead group ${groupNum} with speed ${speedVal}`);
              }
            }

            if (candidates.length === 0) {
              try { addLog(`⚠️ ERROR: No leader candidate in ${chosenTeam} can play speed ${speedVal} for group ${groupNum}!`); } catch(e) {}
              return prev;
            }

            // Choose the candidate: if multiple riders have the same selected_value,
            // prefer the one who submitted first (lowest timestamp in teamPaceMeta).
            // Get timestamp for each candidate's team submission
            const getTeamTimestamp = (rider) => {
              try {
                const paceKey = `${groupNum}-${rider.team}`;
                const meta = newMeta && newMeta[paceKey];
                return (meta && typeof meta.timestamp === 'number') ? meta.timestamp : Infinity;
              } catch (e) {
                return Infinity;
              }
            };
            
            // Sort by: 1) timestamp (earlier = first), 2) win_chance (lower = better for close calls)
            candidates.sort((a, b) => {
              const tsA = getTeamTimestamp(a);
              const tsB = getTeamTimestamp(b);
              if (tsA !== tsB) return tsA - tsB; // Earlier timestamp wins
              return (a.win_chance || 0) - (b.win_chance || 0); // Tie-breaker: lower win_chance
            });
            const bestName = candidates[0].name;

            // Clear takes_lead/selected_value for all riders in group
            for (const r of groupRiders) {
              updated[r.name] = { ...updated[r.name], takes_lead: 0, selected_value: 0 };
            }

            // Leader selected_value = group's speed (must match final speed after all adjustments)
            // IMPORTANT: Use actual 'speed' variable here, not speedVal, because speed may have
            // been adjusted by dobbeltføring, distance catch-up, or blocking logic
            const leaderSelectedValue = Math.round(speed);

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

            // Verify that the leader can actually play the required speed
            // If not, we need to find another leader or reduce the speed
            if (!planned) {
              addLog(`⚠️ Warning: ${bestName} cannot play speed ${leaderSelectedValue} - no suitable card found`);
              // Try to find the maximum speed this leader CAN play
              let maxPlayable = 0;
              for (const c of top4Before) {
                if (!c || !c.id || c.id.startsWith('TK-1')) continue;
                const cardValue = svAfter > 2 ? c.flat : c.uphill;
                const effective = cardValue - localPenalty;
                maxPlayable = Math.max(maxPlayable, effective);
              }
              if (maxPlayable > 0 && maxPlayable < leaderSelectedValue) {
                addLog(`⚠️ Reducing group ${groupNum} speed from ${leaderSelectedValue} to ${maxPlayable} (max playable by ${bestName})`);
                // Update the leader's selected_value to what they can actually play
                updated[bestName] = { ...leadR, takes_lead: 1, selected_value: maxPlayable, planned_card_id: planned };
                // Also update the global speed variable so confirmMove uses correct speed
                speed = maxPlayable;
                setGroupSpeed(speed);
                return updated;
              }
            }

            updated[bestName] = { ...leadR, takes_lead: 1, selected_value: leaderSelectedValue, planned_card_id: planned };
            console.log(`🎯 NORMAL: Set ${bestName} takes_lead=1, selected_value=${leaderSelectedValue}, planned=${planned}`);
            addLog(`${bestName} (${chosenTeam}) assigned as lead for group ${groupNum} (selected_value=${leaderSelectedValue}, planned=${planned})`);

            return updated;
          });
        }
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
    // Store cardsSnapshot in ref if provided, so openCardSelectionForGroup can use it
    if (cardsSnapshot) {
      cardsSnapshotRef.current = cardsSnapshot;
    }
    setMovePhase('cardSelection');
    movePhaseRef.current = 'cardSelection'; // Update ref immediately for sync
    console.log('✅ Set movePhase to cardSelection');
    addLog(`Group ${groupNum}: speed=${speed}, SV=${sv}`);
    
    // In multiplayer, set currentTeam to first team to signal finalization complete
    // Check roomCodeRef instead of gameMode since gameMode may have stale closure value
    if (roomCodeRef.current && isHost) {
      const firstTeam = teams[0];
      console.log('🚀 Finalization complete, setting currentTeam to:', firstTeam);
      setCurrentTeam(firstTeam);
    }
    
    console.log('🚀 handlePaceSubmit END: About to check for Firebase sync, gameMode:', gameMode, 'roomCode:', !!roomCodeRef.current);
    
    // Sync move to Firebase in multiplayer mode
    // Check roomCode ref instead of gameMode/roomCode state since they may have stale closure values
    // Add small delay to ensure React state updates (cards, movePhase, etc.) complete before syncing
    if (roomCodeRef.current) {
      console.log('🚀 handlePaceSubmit: Scheduling syncMoveToFirebase');
      setTimeout(() => {
        syncMoveToFirebase().catch(err => console.error('Failed to sync move:', err));
      }, 100);
    } else {
      console.log('🚀 handlePaceSubmit: NOT calling syncMoveToFirebase (no roomCode)');
    }
  };

const handleHumanChoices = (groupNum, choice) => {
  console.log('Human choices:', choice);
  
  const updatedCards = {...cards};
  const playerTeam = getPlayerTeamName();
  
  // Find all riders in this group on the human team
  const humanRiders = Object.entries(updatedCards)
    .filter(([, r]) => r.group === groupNum && r.team === playerTeam)
    .map(([name]) => name);
  // Support 'nochange' choice during choice-2: submit the previous round-1
  // selection unchanged (if available). This avoids forcing the player to
  // re-select their previous choice when choice-2 is open.
  if (choice.type === 'nochange') {
    try {
      const paceKey = `${groupNum}-${playerTeam}`;
      const meta = teamPaceMeta && teamPaceMeta[paceKey];
      const prev = (teamPaces && typeof teamPaces[paceKey] !== 'undefined') ? teamPaces[paceKey] : undefined;
      if (typeof prev !== 'undefined') {
        handlePaceSubmit(groupNum, prev, playerTeam, !!(meta && meta.isAttack), (meta && meta.attacker) || null);
        return;
      }
    } catch (e) {}
    // fallback to follow if no previous data
    handlePaceSubmit(groupNum, 0, getPlayerTeamName(), false, null);
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
      const playerTeam = getPlayerTeamName();
      addLog(`${(submittingTeam || playerTeam)} attempted an attack but group has fewer than 3 riders — attack ignored`);
      // Submit as follow (no attack)
      const teamPaceFallback = 0;
      handlePaceSubmit(groupNum, teamPaceFallback, playerTeam, false, null);
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
    // Handle both property naming conventions (leader/paceValue vs paceLeader/value)
    const leader = choice.leader || choice.paceLeader;
    const val = choice.paceValue !== undefined ? choice.paceValue : choice.value;
    
    humanRiders.forEach(name => {
      if (name === leader) {
        updatedCards[name].selected_value = val;
        updatedCards[name].takes_lead = 1;
        updatedCards[name].attacking_status = 'no';
      } else {
        updatedCards[name].selected_value = 0;
        updatedCards[name].takes_lead = 0;
        updatedCards[name].attacking_status = 'no';
      }
    });
    
    addLog(`Me: hastighed ${val}`);
    
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
    
    addLog(`${playerTeam}: dobbeltføring ${rider1}(${pace1}), ${rider2}(${pace2})`);
    
  } else if (choice.type === 'follow') {
    // All riders follow
    humanRiders.forEach(name => {
      updatedCards[name].selected_value = 0;
      updatedCards[name].takes_lead = 0;
      updatedCards[name].attacking_status = 'no';
    });
    
    addLog(`${playerTeam}: følger (0)`);
  }
  
  setCards(updatedCards);
  
  // Submit the team's pace (max of all riders' values)
  // Compute the team's non-attacker pace (attackers should not determine this)
  const teamPace = Math.max(...humanRiders.filter(n => updatedCards[n].attacking_status !== 'attacker').map(n => updatedCards[n].selected_value || 0));
  const isAttack = humanRiders.some(n => updatedCards[n].attacking_status === 'attacker');
  const attackerName = humanRiders.find(n => updatedCards[n].attacking_status === 'attacker') || null;
  
  // Build doubleLead object if this is a doublelead choice
  const doubleLead = choice.type === 'doublelead' ? {
    pace1: choice.pace1,
    pace2: choice.pace2,
    rider1: choice.rider1,
    rider2: choice.rider2
  } : null;
  
  // Pass updatedCards as snapshot to avoid React state timing issues
  console.log('📤 handleHumanChoices: About to call handlePaceSubmit', {
    groupNum,
    teamPace,
    playerTeam,
    isAttack,
    attackerName,
    gameMode
  });
  handlePaceSubmit(groupNum, teamPace, playerTeam, isAttack, attackerName, doubleLead, updatedCards);
};

/**
 * Check if a group has crossed the sprint line ('F') and needs to sprint.
 * This should be called immediately after a group moves to catch sprints
 * before group reassignment happens.
 * 
 * @param {object} cardsState - Current cards state
 * @param {number} groupNum - Group number to check
 * @param {string} trackStr - Track string
 * @returns {boolean} - True if the group should sprint
 */
const shouldGroupSprint = (cardsState, groupNum, trackStr) => {
  try {
    const finishLine = trackStr.indexOf('F');
    if (finishLine === -1) return false; // No sprint line on this track
    
    // Get all riders in this group who haven't finished
    const groupRiders = Object.values(cardsState).filter(r => r.group === groupNum && !r.finished);
    if (groupRiders.length === 0) return false;
    
    // Check if any rider in the group has crossed the finish line and hasn't sprinted yet
    const hasCrossedSprintLine = groupRiders.some(r => r.position >= finishLine);
    const alreadySprinted = groupRiders.some(r => r.sprint_points !== undefined && r.sprint_points > 0);
    
    // Group should sprint if it has crossed the line and hasn't sprinted yet
    return hasCrossedSprintLine && !alreadySprinted;
  } catch (e) {
    console.error('Error in shouldGroupSprint:', e);
    return false;
  }
};

const confirmMove = (cardsSnapshot) => {
  console.log('🚀 confirmMove called for group:', currentGroup);
  
  // Guard against duplicate calls - check if we've already called confirmMove for this group
  if (confirmMoveCalledForGroupRef.current === currentGroup) {
    console.log('🚀 confirmMove already called for group:', currentGroup, '- SKIPPING duplicate call');
    return;
  }
  
  // Mark that we're processing this group
  confirmMoveCalledForGroupRef.current = currentGroup;
  
  // Change movePhase immediately to prevent card selection from reopening
  setMovePhase('moving');
  movePhaseRef.current = 'moving';
  
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

  // FIRST: Clear dobbeltføring_leader flags ONLY for riders in the current group
  // (to prevent flags from previous group movements affecting this group)
  for (const name of names) {
    if (updatedCards[name] && updatedCards[name].dobbeltføring_leader === true) {
      updatedCards[name] = { ...updatedCards[name], dobbeltføring_leader: false };
    }
  }

  // SECOND: Ensure only ONE rider has takes_lead=1 - the one with highest selected_value
  // This fixes the bug where multiple teams submit different speeds and each gets their own leader
  const leadersInGroup = names.filter(n => updatedCards[n] && updatedCards[n].takes_lead === 1);
  if (leadersInGroup.length > 1) {
    addLog(`⚠️ Multiple leaders detected in group ${currentGroup}: ${leadersInGroup.join(', ')}`);
    
    // Find the leader with highest selected_value (and earliest timestamp as tiebreaker)
    let bestLeader = null;
    let maxSelectedValue = -1;
    let earliestTimestamp = Infinity;
    
    for (const name of leadersInGroup) {
      const rider = updatedCards[name];
      const sv = rider.selected_value || 0;
      const paceKey = `${currentGroup}-${rider.team}`;
      const meta = teamPaceMeta[paceKey];
      const timestamp = (meta && typeof meta.timestamp === 'number') ? meta.timestamp : Infinity;
      
      if (sv > maxSelectedValue || (sv === maxSelectedValue && timestamp < earliestTimestamp)) {
        bestLeader = name;
        maxSelectedValue = sv;
        earliestTimestamp = timestamp;
      }
    }
    
    // Clear takes_lead for all except bestLeader
    for (const name of leadersInGroup) {
      if (name !== bestLeader) {
        addLog(`🔧 Clearing takes_lead for ${name} (selected_value=${updatedCards[name].selected_value})`);
        updatedCards[name] = { ...updatedCards[name], takes_lead: 0, selected_value: 0 };
      }
    }
    
    addLog(`✅ Kept ${bestLeader} as sole leader (selected_value=${maxSelectedValue})`);
  }

  // Capture old positions and planned cards for all riders in this group
  const oldPositions = {};
  const plannedCards = {};
  names.forEach(n => {
    oldPositions[n] = Number(updatedCards[n] && updatedCards[n].position ? updatedCards[n].position : 0);
    // prefer planned_card_id, fallback to attack_card (object) or undefined
    plannedCards[n] = (updatedCards[n] && (updatedCards[n].planned_card_id || (updatedCards[n].attack_card && updatedCards[n].attack_card.id))) || null;
  });
  
  // Calculate speed for this group from riders' selected_value (don't rely on teamPaces state as it may not be updated yet)
  // This handles the case where confirmMove is called immediately after handlePaceSubmit
  const groupPos = Math.max(...Object.values(preCards).filter(r => r.group === currentGroup && !r.finished).map(r => r.position));
  const aheadPositions = Object.values(preCards).filter(r => r.group > currentGroup && !r.finished).map(r => r.position);
  
  // Get team paces from ref (saved by handlePaceSubmit before selected_value was cleared)
  // This contains the correct pace values including dobbeltføring bonuses
  // If ref is empty (e.g. when confirmMove is called without handlePaceSubmit),
  // build teamPacesForGroup from riders' selected_value
  let teamPacesForGroup = teamPacesForGroupRef.current || {};
  
  // If teamPacesForGroup is empty, build it from riders in the group
  if (Object.keys(teamPacesForGroup).length === 0) {
    const groupRiders = Object.entries(preCards).filter(([, r]) => r.group === currentGroup && !r.finished);
    const teamsInGroup = [...new Set(groupRiders.map(([, r]) => r.team))];
    
    teamsInGroup.forEach(team => {
      const teamRidersInGroup = groupRiders.filter(([, r]) => r.team === team);
      let maxPace = 0;
      
      teamRidersInGroup.forEach(([name, rider]) => {
        // Skip attackers
        if (rider.attacking_status === 'attacker') return;
        
        // Use selected_value if available, otherwise 0
        const pace = typeof rider.selected_value === 'number' && rider.selected_value > 0 ? rider.selected_value : 0;
        if (pace > maxPace) maxPace = pace;
      });
      
      teamPacesForGroup[team] = maxPace;
    });
    
    addLog(`🔍 confirmMove: Built teamPacesForGroup from riders: ${JSON.stringify(teamPacesForGroup)}`);
  }
  
  // Use the speed that was already calculated in handlePaceSubmit and stored in groupSpeed state
  // Do NOT recalculate here, as the riders' selected_value may have been modified during card selection
  // and may not accurately reflect the original pace submissions
  const computedSpeed = groupSpeed || groupSpeedRef.current || 0;
  const computedSlipstream = slipstream || slipstreamRef.current || 0;
  
  // Debug: log speed being used
  try { addLog(`Group ${currentGroup}: Using stored speed=${computedSpeed}, slipstream=${computedSlipstream} for movement (from handlePaceSubmit calculation)`); } catch (e) {}
  
  // Mark dobbeltføring leaders if they were set during handlePaceSubmit
  const leadersToMark = dobbeltføringLeadersRef.current || [];
  if (leadersToMark.length > 0) {
    addLog(`🔍 DEBUG: Marking ${leadersToMark.length} dobbeltføring leaders: ${leadersToMark.join(', ')}`);
    for (const leaderName of leadersToMark) {
      if (updatedCards[leaderName]) {
        updatedCards[leaderName] = { ...updatedCards[leaderName], dobbeltføring_leader: true };
        addLog(`🔍 DEBUG: Set dobbeltføring_leader=true on ${leaderName}`);
      }
    }
    // Clear the ref after using it
    dobbeltføringLeadersRef.current = [];
  }
  
  // First phase: move non-attackers (regular riders) — delegated to pure helper
  try {
  // Pass the updatedCards (with dobbeltføring_leader flags set) to the engine helper
  // Also pass previousGroupPositions from allGroupsThisTurnRef so riders can catch earlier groups
  const nonAttRes = computeNonAttackerMoves(updatedCards, currentGroup, computedSpeed, computedSlipstream, track, Math.random, tkPerTk1, allGroupsThisTurnRef.current);
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
    const attRes = computeAttackerMoves(updatedCards, currentGroup, computedSpeed, computedSlipstream, track, Math.random, tkPerTk1, allGroupsThisTurnRef.current);
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
  
  // Store this group's final positions for future groups to use in slipstream catches
  // This allows riders in later groups (e.g., Group 1) to catch earlier groups (e.g., Group 2)
  allGroupsThisTurnRef.current.push(...groupsNewPositions);
  allGroupsThisTurnRef.current.sort((a, b) => b[0] - a[0]); // Keep sorted by position descending
  
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
  // Update cardsRef immediately so syncMoveToFirebase gets the latest positions
  cardsRef.current = updatedCards;
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
          updatedCards[n].discarded = [...updatedCards[n].discarded, { id: 'kort: 16', flat: 2, uphill: 2 }];
          try { addLog(`Penalty applied: ${n} receives kort: 16 for leading after choice-2`); } catch (e) {}
        }
      } catch (e) {}
    }
    // persist any penalty changes
    setCards(updatedCards);
    // Update cardsRef immediately so syncMoveToFirebase gets the latest cards with penalties
    cardsRef.current = updatedCards;
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

        // Use eligible_for_speed from engine to determine if rider failed
        // This correctly handles cases where rider catches group ahead with slipstream
        const failed = updatedCards[n] && typeof updatedCards[n].eligible_for_speed === 'boolean'
          ? !updatedCards[n].eligible_for_speed
          : movedFields < Math.round(groupSpeed || 0); // fallback to distance check
        const isLead = (cards[n] && cards[n].takes_lead === 1) || (updatedCards[n] && updatedCards[n].takes_lead === 1);

        // Determine how many TK-1 and EC cards were added as a result of the move
        // by comparing pre-move and post-move hand+discard counts. This is robust
        // because the engine inserts 'TK-1: 99' and 'kort: 16' into hands/discards.
        let ecTaken = 0;
        let tkTaken = 0;
        let penaltyCount = 0;
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
          
          // Count penalty cards (TK-1 in top 4) BEFORE the move
          const preCards = (pre.cards || []).slice(0, 4);
          for (let i = 0; i < preCards.length; i++) {
            if (preCards[i] && preCards[i].id === 'TK-1: 99') penaltyCount++;
          }
        } catch (e) {
          // fallback: legacy leader heuristic
          if (isLead) ecTaken = 1;
        }

        const plainLine = `${n} (${team}) spiller kort: ${displayCard}${cardVals ? ` (${cardVals})` : ''} ${oldPositions[n]}→${newPos}${isLead ? ' (lead)' : ''} ${failed ? '✗' : '✓'}`;
        msgs.push({ name: n, team, displayCard, cardVals, oldPos: oldPositions[n], newPos, isLead, failed, plainLine, ecTaken, tkTaken, penaltyCount });
        // Also write the plain textual line to the global log so it appears in the Log panel
        addLog(plainLine);
      } catch (e) {
        // ignore per-rider errors
      }
    }

    const postMoveInfoData = { groupMoved: currentGroup, msgs, remainingNotMoved, sv: computedSlipstream, speed: computedSpeed };
    setPostMoveInfo(postMoveInfoData);
    postMoveInfoRef.current = postMoveInfoData; // Set ref immediately for sync
    
    // Sync to Firebase IMMEDIATELY after movement (HOST broadcasts results to all players)
    // No delay - we want JOINER to see results before HOST moves to next phase
    const amHost = isHost || (multiplayerPlayers && multiplayerPlayers.length > 0 && multiplayerPlayers.find(p => p.name === playerName)?.isHost);
    console.log('🚀 confirmMove: Checking if should sync. roomCode:', !!roomCodeRef.current, 'isHost:', isHost, 'amHost:', amHost);
    
    if (roomCodeRef.current && amHost) {
      console.log('🚀 confirmMove: Syncing results to Firebase IMMEDIATELY with postMoveInfo, speed:', computedSpeed, 'sv:', computedSlipstream);
      // Sync immediately (no setTimeout) so JOINER gets results before HOST moves on
      syncMoveToFirebase().catch(err => console.error('Failed to sync confirmMove results:', err));
    } else {
      console.log('🚀 confirmMove: NOT syncing (not host or no roomCode)');
    }
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
  setTeamPaceRound({});  // Reset round tracking for new group
  setGroupSpeed(0);  // Reset groupSpeed for the new group
  
  // Reset refs to match cleared state
  teamPacesRef.current = {};
  teamPaceMetaRef.current = {};
  cardSelectionOpenedForGroupRef.current = null; // Reset card selection tracking for new group
      
      // Reset selected_value and takes_lead for ALL riders to prevent values from
      // previous groups affecting speed calculations in the new group
      // Also clear planned_card_id and human_planned from the moved group
      setCards(prev => {
        const updated = { ...prev };
        for (const [name, rider] of Object.entries(updated)) {
          const needsUpdate = 
            rider.selected_value !== 0 || 
            rider.takes_lead !== 0 ||
            (rider.group === currentGroup && (rider.planned_card_id || rider.human_planned));
          
          if (needsUpdate) {
            updated[name] = { 
              ...rider, 
              selected_value: 0, 
              takes_lead: 0,
              // Clear planned_card_id only for riders in the group that just moved
              ...(rider.group === currentGroup ? { planned_card_id: undefined, human_planned: false } : {})
            };
          }
        }
        return updated;
      });
      
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      setTeams(shuffled);
      // choose first team that actually has non-attacker riders in the next group
      const firstTeam = findNextTeamWithRiders(0, nextGroup);
      if (firstTeam) setCurrentTeam(firstTeam);
      else setCurrentTeam(shuffled[0]);
      setMovePhase('input');
      
      // Sync cleared planned_card_id values to Firebase for next group
      if (roomCodeRef.current && amHost) {
        console.log('🚀 confirmMove: Syncing to Firebase after moving to next group (clearing planned_card_id)');
        setTimeout(() => {
          syncMoveToFirebase().catch(err => console.error('Failed to sync next group state:', err));
        }, 100);
      }
    } else {
      // No remaining non-finished groups: reassign groups and detect sprints
      // Clear the confirmMove guard so the new group 1 can be processed after reassignment
      confirmMoveCalledForGroupRef.current = null;
      console.log('🔄 Cleared confirmMoveCalledForGroupRef before reassignment');
      
      setTimeout(() => {
        setCards(prevCards => {
          // Only reassign groups for non-finished riders
          const notFinished = Object.entries(prevCards).filter(([, r]) => !r.finished);
          const sorted = notFinished.sort((a, b) => b[1].position - a[1].position);
          let gNum = 1;
          let curPos = sorted.length > 0 ? sorted[0][1].position : 0;
          const updatedCards2 = { ...prevCards };

          sorted.forEach(([n, r]) => {
            if (r.position < curPos) {
              gNum++;
              curPos = r.position;
            }
            // Reset selected_value and takes_lead when reassigning groups to prevent
            // values from previous groups affecting speed calculations in new groups
            updatedCards2[n] = { 
              ...updatedCards2[n], 
              group: gNum,
              selected_value: 0,
              takes_lead: 0
            };
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

          // Mountain points calculation - only runs in stage races after ALL groups have moved
          if (isStageRace) {
            try {
              let mountainCrossed = false;
              let mountainLength = 0;
              
              // First pass: collect ALL riders who crossed any mountain
              const allRidersData = [];
              for (const [name, rider] of Object.entries(updatedCards2)) {
                const oldPos = rider.old_position || 0;
                const newPos = rider.position || 0;
                const crossing = detectMountainCrossing(oldPos, newPos, track);
                
                if (crossing.crossedMountain) {
                  const randomTiebreaker = Math.random();
                  allRidersData.push({
                    name,
                    groupNum: rider.group || 999,
                    uphillValue: rider.last_uphill_value || 0,
                    flatValue: rider.last_flat_value || 0,
                    cardPlayed: rider.played_card || '?',
                    randomTiebreaker,
                    mountainLength: crossing.mountainLength,
                    oldPos,
                    newPos
                  });
                  
                  if (crossing.mountainLength > mountainLength) {
                    mountainCrossed = true;
                    mountainLength = crossing.mountainLength;
                  }
                }
              }
              
              // Second pass: debug log for all riders who moved
              for (const [name, rider] of Object.entries(updatedCards2)) {
                const oldPos = rider.old_position || 0;
                const newPos = rider.position || 0;
                
                if (oldPos !== newPos) {
                  const groupNum = rider.group || '?';
                  const cardPlayed = rider.played_card || '?';
                  const valuePlayed = rider.played_effective || '?';
                const crossing = detectMountainCrossing(oldPos, newPos, track);
              }
            }              // If we crossed a mountain, award points
              if (mountainCrossed && mountainLength > 0) {
                addLog(`⛰️  Mountain crossed! Length: ${mountainLength} fields`);
                
                // Filter to only riders who crossed the LONGEST mountain
                const ridersWhoCompete = allRidersData.filter(r => r.mountainLength === mountainLength);
                
                // Calculate and award points to all riders who crossed this mountain
                const pointsAwarded = calculateMountainPoints(ridersWhoCompete, mountainLength);
                
                // Apply points to the riders
                for (const award of pointsAwarded) {
                  if (updatedCards2[award.name]) {
                    const currentKOM = updatedCards2[award.name].kom_points || 0;
                    updatedCards2[award.name] = {
                      ...updatedCards2[award.name],
                      kom_points: currentKOM + award.points
                    };
                    addLog(`🏔️ ${award.name} (Group ${award.groupNum}): +${award.points} KOM points (uphill=${award.uphillValue}, flat=${award.flatValue}) → Total: ${currentKOM + award.points}`);
                  }
                }
              }
            } catch (e) {
              addLog(`Mountain points error: ${e.message}`);
            }
          }

          return updatedCards2;
        });
        setGroupsMovedThisRound([]); // Reset for new group assignments
        setMovePhase('roundComplete');
        setWaitingForCardSelections(false); // Clear monitoring flag when round is complete
        addLog('All groups moved. Groups reassigned');
      }, 100);
    }
  } catch (e) {
    // On any error fallback to the previous sequential behavior
    if (currentGroup > 1) {
      setCurrentGroup(p => p - 1);
  setTeamPaces({});
  setTeamPaceMeta({});
  teamPacesRef.current = {};
  teamPaceMetaRef.current = {};
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      setTeams(shuffled);
      setCurrentTeam(shuffled[0]);
      setMovePhase('input');
    } else {
      setTimeout(() => {
        setCards(prev => prev);
        setGroupsMovedThisRound([]); // Reset for new group assignments
        setMovePhase('roundComplete');
        setWaitingForCardSelections(false); // Clear monitoring flag when round is complete
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
  teamPacesRef.current = {};
  teamPaceMetaRef.current = {};
  setGroupSpeed(0);  // Reset groupSpeed for the new group
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
    postMoveInfoRef.current = null; // Clear ref so Firebase sync sends null
    
    // Reset confirmMove tracking for next group - REMOVED to rely on useEffect
    // confirmMoveCalledForGroupRef.current = null;
    
    // Sync state to Firebase so JOINER knows to move to next group
    // IMPORTANT: Clear postMoveInfo in Firebase by passing clearPostMoveInfo=true
    // This ensures JOINER doesn't see old results from previous group
    if (roomCodeRef.current && isHost) {
      console.log('🚀 moveToNextGroup: Syncing to Firebase and clearing postMoveInfo');
      setTimeout(() => {
        syncMoveToFirebase(null, true).catch(err => console.error('Failed to sync moveToNextGroup:', err));
      }, 100);
    }
  } else {
    // No remaining groups -> start new round
    setPostMoveInfo(null);
    postMoveInfoRef.current = null; // Clear ref so Firebase sync sends null
    startNewRound();
  }
};

const startNewRound = async () => {
  // RULE 1: ROUND DEFINITION
  // - A round consists of all groups moving in order: Group 4 -> 3 -> 2 -> 1.
  // - This function initializes the round starting with the highest group number (maxGroup).
  
  // RULE 2: CARD DRAW
  // - Riders draw cards at the start of the round (before any group moves).
  
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
  postMoveInfoRef.current = null; // Clear ref so Firebase sync sends null
  setWaitingForCardSelections(false); // Clear monitoring flag for new round
  
  // Reset confirmMove tracking for new round - REMOVED to rely on useEffect
  // confirmMoveCalledForGroupRef.current = null;
  
  const maxGroup = Math.max(...Object.values(cards).filter(r => !r.finished).map(r => r.group));
  const newRound = round + 1;
  
  console.log('Max group:', maxGroup);
  console.log('New round:', newRound);
  
  setRound(newRound);
  roundRef.current = newRound; // Update ref immediately for Firebase sync
  setCurrentGroup(maxGroup);
  // clear any stored invest outcomes from previous round
  setPullInvestOutcome({});
  setTeamPaces({});
  setTeamPaceMeta({});
  setTeamPaceRound({}); // Clear round tracking for new round
  teamPacesRef.current = {}; // Clear refs immediately for Firebase sync
  teamPaceMetaRef.current = {}; // Clear refs immediately for Firebase sync
  teamPaceRoundRef.current = {}; // Clear round tracking ref immediately for Firebase sync
  allGroupsThisTurnRef.current = []; // Clear group positions for new round
  setGroupSpeed(0);  // Reset groupSpeed for the new round
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
  const teamToSet = firstTeamForRound || order[0];
  setCurrentTeam(teamToSet);
  currentTeamRef.current = teamToSet; // Update ref immediately for Firebase sync
  setMovePhase('input');
  movePhaseRef.current = 'input'; // Update ref immediately for Firebase sync
  // Clear groups moved tracker for the new round
  setGroupsMovedThisRound([]);
  
  console.log('Computed team order for round:', order);
  console.log('Current team set to:', teamToSet);
  
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

  // ===== TK-16 → TK-1 CONVERSION (TK-test only) =====
  // At the start of each new round, convert TK-16 cards from discarded pile to TK-1 cards
  // Formula: For every X TK-16 cards in discarded, add 1 TK-1 to top of hand (X = tkPerTk1)
  const tk16ConversionMsgs = [];
  
  // Only perform conversion if we are NOT in the first round (round > 1)
  // This prevents conversion logic from running during initial setup or round 1 start
  if (newRound > 1) {
    for (const riderName of Object.keys(updatedCards)) {
      const rider = updatedCards[riderName];
      if (rider.finished) continue;
      
      const discarded = rider.discarded || [];
      const tk16Count = discarded.filter(c => c.id === 'kort: 16').length;
      const tk1sToAdd = Math.floor(tk16Count / tkPerTk1);
      
      if (tk1sToAdd > 0) {
        // Add TK-1 cards to the top of the hand
        const tk1Cards = Array(tk1sToAdd).fill({ id: 'TK-1: 99', flat: -1, uphill: -1 });
        updatedCards[riderName].cards = [...tk1Cards, ...(rider.cards || [])];
        
        // Remove tkPerTk1 * tk1sToAdd TK-16 cards from discarded
        let tk16Removed = 0;
        const newDiscarded = [];
        for (const card of discarded) {
          if (card.id === 'kort: 16' && tk16Removed < tk1sToAdd * tkPerTk1) {
            tk16Removed++;
            // Skip this card (remove it)
          } else {
            newDiscarded.push(card);
          }
        }
        updatedCards[riderName].discarded = newDiscarded;
        
        // Store message for display in yellow box
        tk16ConversionMsgs.push({ name: riderName, tk1Count: tk1sToAdd });
      }
    }
  }
  
  // If any conversions happened, show them in the yellow box and require Continue
  if (tk16ConversionMsgs.length > 0) {
    setCards(updatedCards);
    // Update cardsRef immediately for Firebase sync
    cardsRef.current = updatedCards;
    
    // Set postMoveInfoRef immediately so Firebase sync sends it
    const conversionInfo = {
      groupMoved: 0,
      roundNum: newRound - 1, // The round that just finished
      msgs: tk16ConversionMsgs.map(m => ({
        name: m.name,
        team: updatedCards[m.name].team,
        displayCard: `${m.tk1Count} TK-1`,
        oldPos: '',
        newPos: '',
        isLead: false,
        failed: false
      })),
      remainingNotMoved: [],
      sv: 0,
      speed: 0,
      isTK16Conversion: true
    };
    
    setPostMoveInfo(conversionInfo);
    postMoveInfoRef.current = conversionInfo;
    
    // Sync to Firebase immediately so all players see the conversion info
    if (roomCodeRef.current && isHost) {
      console.log('🚀 startNewRound: Syncing TK-1 conversion info to Firebase');
      setTimeout(() => {
        syncMoveToFirebase().catch(err => console.error('Failed to sync TK-1 conversion:', err));
      }, 100);
    }
    
    return; // Stop here, user must click Continue
  }
  // ===== END TK-16 → TK-1 CONVERSION =====

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
    // Clear any temporary attacker boost marker now that win_chance is recalculated
    if (typeof rider.win_chance_original !== 'undefined') {
      try { delete rider.win_chance_original; } catch (e) {}
    }

    console.log(`${riderName}: sprint_chance=${rider.sprint_chance.toFixed(1)}%, win_chance_wo_sprint=${rider.win_chance_wo_sprint.toFixed(1)}%, win_chance=${rider.win_chance.toFixed(1)}%`);
  }
  
  // Update GC stats for stage races
  if (isStageRace && selectedStages.length > 0) {
    for (const riderName in updatedCards) {
      const rider = updatedCards[riderName];
      
      // Use pre-computed e_moves_left_gc_array (calculated once at draft)
      const futureStages = rider.e_moves_left_gc_array.slice(currentStageIndex + 1);
      const sumFutureStages = futureStages.reduce((sum, val) => sum + val, 0);
      
      // e_moves_left_total = current stage e_moves_left + sum of future stages
      rider.e_moves_left_total = rider.e_moves_left + sumFutureStages;
      
      // Calculate GC favorit points
      rider.favorit_points_gc = getFavoritPointsGC(rider);
    }
    
    // Calculate GC win chances with correct formula: 17 - 0.6 * round + 7 * (numberOfStages - currentStageIndex - 1)
    const factorGC = 17 - 0.6 * newRound + 7 * (numberOfStages - currentStageIndex - 1);
    const totalPointsGC = getTotalMovesLeftGC(updatedCards, factorGC);
    
    for (const riderName in updatedCards) {
      const rider = updatedCards[riderName];
      rider.win_chance_gc = getWinChanceGC(rider, factorGC, totalPointsGC);
      
      // Update XprizeMoney based on new GC win chance
      const gcPrize = 12000 * (1 - Math.pow(1 - rider.win_chance_gc / 100, 3));
      const stagePrizes = rider.win_chance_stages_array.reduce((sum, wc) => sum + (wc / 100) * 7000, 0);
      rider.XprizeMoney = Math.round(gcPrize + stagePrizes);
      
      console.log(`${riderName}: GC - e_moves_left_total=${rider.e_moves_left_total.toFixed(2)}, favorit_points_gc=${rider.favorit_points_gc.toFixed(4)}, win_chance_gc=${rider.win_chance_gc.toFixed(1)}%, XPM=${rider.XprizeMoney}`);
    }
  }
  
  setCards(updatedCards);
  // Update cardsRef immediately for Firebase sync
  cardsRef.current = updatedCards;
  
  addLog(`Round ${newRound} - Statistics updated`);
  
  // Sync updated positions to Firebase immediately and WAIT for it (multiplayer)
  // This prevents race conditions where JOINER starts before HOST syncs
  if (roomCodeRef.current && isHost) {
    console.log('🚀 startNewRound: Syncing updated cards/positions to Firebase and waiting...');
    try {
      await syncMoveToFirebase();
      console.log('🚀 startNewRound: Sync completed successfully');
    } catch (err) {
      console.error('Failed to sync startNewRound:', err);
    }
  }
  
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
    let timeGap = 21 * (overallMaxPos - groupPos);
    if (timeGap !== 0) {
      const jitter = Math.floor(Math.random() * 11) - 5;
      timeGap = Math.max(0, timeGap + jitter);
    }
    gaps[g] = timeGap;
  }
  setGroupTimeGaps(gaps);
  // reset sprint results for the new round
  // NOTE: Do NOT reset latestPrelTime - it should only decrease across the entire game
  setSprintResults([]);
};

// Emergency recovery function - call from browser console if game gets stuck
const forceProgressGame = () => {
  try {
    addLog('🚨 EMERGENCY: Forcing game progression');
    
    // Check if there are any non-finished riders
    const nonFinished = Object.entries(cards).filter(([, r]) => !r.finished);
    if (nonFinished.length === 0) {
      addLog('⚠️ All riders finished - cannot progress');
      return;
    }
    
    // Reassign groups based on positions
    setCards(prev => {
      const updated = { ...prev };
      const notFinished = Object.entries(updated).filter(([, r]) => !r.finished);
      const sorted = notFinished.sort((a, b) => b[1].position - a[1].position);
      
      let gNum = 1;
      let curPos = sorted.length > 0 ? sorted[0][1].position : 0;
      
      sorted.forEach(([n, r]) => {
        if (r.position < curPos) {
          gNum++;
          curPos = r.position;
        }
        updated[n] = { ...updated[n], group: gNum };
      });
      
      addLog(`✓ Groups reassigned: ${gNum} groups created`);
      return updated;
    });
    
    // Clear stuck states
    setTeamPaces({});
    setTeamPaceMeta({});
    teamPacesRef.current = {};
    teamPaceMetaRef.current = {};
    setGroupSpeed(0);
    setPostMoveInfo(null);
    setSprintGroupsPending([]);
    
    // Find max group and start new round
    setTimeout(() => {
      const maxGroup = Math.max(...Object.values(cards).filter(r => !r.finished).map(r => r.group));
      setCurrentGroup(maxGroup);
      const firstTeam = findNextTeamWithRiders(0, maxGroup);
      if (firstTeam) setCurrentTeam(firstTeam);
      setMovePhase('input');
      addLog(`✓ Ready to continue with group ${maxGroup}`);
    }, 100);
    
  } catch (e) {
    addLog(`❌ Emergency recovery failed: ${e.message}`);
  }
};

// Expose emergency function to browser console
if (typeof window !== 'undefined') {
  window.forceProgressGame = forceProgressGame;
}

// Start the next stage in a stage race
const startNextStage = () => {
  if (!isStageRace || currentStageIndex >= numberOfStages - 1) {
    addLog('No more stages to start');
    return;
  }
  
  addLog(`=== STARTING STAGE ${currentStageIndex + 2} ===`);
  
  // Prepare riders for next stage (use numAttackers for breakaway count)
  const { updatedCards: preparedCards, logs } = prepareNextStage(cards, ridersData, attackerLeadFields, numAttackers);
  logs.forEach(log => addLog(log));
  
  // Move to next stage
  const nextStageIndex = currentStageIndex + 1;
  setCurrentStageIndex(nextStageIndex);
  
  // Update track to next stage's track
  const nextStage = selectedStages[nextStageIndex];
  if (nextStage) {
    setTrack(nextStage.track);
    setTrackName(nextStage.name);
    addLog(`Stage ${nextStageIndex + 1}: ${nextStage.name}`);
  }
  
  // Recalculate GC stats after stage transition (gc_time was updated in prepareNextStage)
  if (isStageRace && selectedStages.length > 0) {
    for (const riderName in preparedCards) {
      const rider = preparedCards[riderName];
      
      // Use pre-computed e_moves_left_gc_array
      const futureStages = rider.e_moves_left_gc_array.slice(nextStageIndex + 1);
      const sumFutureStages = futureStages.reduce((sum, val) => sum + val, 0);
      rider.e_moves_left_total = rider.e_moves_left + sumFutureStages;
      
      // Recalculate GC favorit points with updated gc_time
      rider.favorit_points_gc = getFavoritPointsGC(rider);
    }
    
    // Recalculate GC win chances
    const factorGC = 17 - 0.6 * 0 + 7 * (numberOfStages - nextStageIndex - 1);
    const totalPointsGC = getTotalMovesLeftGC(preparedCards, factorGC);
    
    for (const riderName in preparedCards) {
      const rider = preparedCards[riderName];
      rider.win_chance_gc = getWinChanceGC(rider, factorGC, totalPointsGC);
      
      // Update XprizeMoney
      const gcPrize = 12000 * (1 - Math.pow(1 - rider.win_chance_gc / 100, 3));
      const stagePrizes = rider.win_chance_stages_array.reduce((sum, wc) => sum + (wc / 100) * 7000, 0);
      rider.XprizeMoney = Math.round(gcPrize + stagePrizes);
      
      addLog(`${riderName}: GC stats after stage ${nextStageIndex} - gc_time=${rider.gc_time}, favorit_points_gc=${rider.favorit_points_gc.toFixed(4)}, win_chance_gc=${rider.win_chance_gc.toFixed(1)}%`);
    }
  }
  
  // Reset game state for new stage
  setCards(preparedCards);
  setRound(0);
  
  // Find the highest group number to start with (backmost group)
  const groupNumbers = Object.values(preparedCards)
    .filter(r => !r.finished)
    .map(r => r.group);
  const startingGroup = groupNumbers.length > 0 ? Math.max(...groupNumbers) : 2;
  
  // Find first team that has riders in the starting group
  const teamsInStartingGroup = Object.values(preparedCards)
    .filter(r => !r.finished && r.group === startingGroup)
    .map(r => r.team);
  const firstTeam = teamsInStartingGroup.length > 0 ? teamsInStartingGroup[0] : 'Me';
  
  // Only show intermediate sprint modal for stage races
  if (isStageRace) {
    // Initialize intermediate sprint selections for human riders
    const playerTeam = getPlayerTeamName();
    const humanRiders = Object.entries(preparedCards)
      .filter(([, r]) => r.team === playerTeam && !r.finished)
      .map(([n]) => n);
    const initialSelections = {};
    humanRiders.forEach(name => initialSelections[name] = 0);
    setIntermediateSprintSelections(initialSelections);
    
    // Open intermediate sprint modal instead of starting immediately
    setIntermediateSprintOpen(true);
    
    // Store starting group and team for use after intermediate sprint
    window.pendingStageStart = { nextGroup: startingGroup, firstTeam };
  } else {
    // Single stage: start immediately
    setCurrentGroup(startingGroup);
    setCurrentTeam(firstTeam);
  }
  
  setMovePhase('input');
  setSprintResults([]);
  setLatestPrelTime(0);
  setFinalStandings([]);
  setGroupsMovedThisRound([]);
  setTeamPaces({});
  setTeamPaceMeta({});
  teamPacesRef.current = {};
  teamPaceMetaRef.current = {};
  setGroupSpeed(0);  // Reset groupSpeed for the new stage
  setPullInvestOutcome({});
  setPostMoveInfo(null);
  setSprintAnimMsgs([]);
  setSprintFocusGroup(null);
  setSprintGroupsPending([]);
  
  // Don't compute initial stats yet for stage races - wait for intermediate sprint
};

// Confirm intermediate sprint and start the stage
const confirmIntermediateSprint = () => {
  if (!window.pendingStageStart) return;
  
  const { startingGroup, nextGroup, firstTeam } = window.pendingStageStart;
  
  // Use startingGroup (for first stage) or nextGroup (for subsequent stages)
  const groupToSet = startingGroup !== undefined ? startingGroup : nextGroup;
  
  // STEP 1: Calculate sprint_effort for all riders
  const sprintEfforts = {};
  
  // Human riders: use selections from modal
  Object.entries(intermediateSprintSelections).forEach(([name, value]) => {
    sprintEfforts[name] = value;
  });
  
  // AI riders: sprint_effort = min(round(rider.sprint_chance * random(0, 20)), 2)
  addLog('=== AI SPRINT EFFORT CALCULATION ===');
  const playerTeam = getPlayerTeamName();
  Object.entries(cards).forEach(([name, rider]) => {
    if (rider.team !== playerTeam && !rider.finished) {
      const randomFactor = Math.random() * 15 + 3; // 0 to 20
      const sprintChance = rider.sprint_chance || 10; // default if not set (in percentage)
      const rawCalculation = (sprintChance / 100) * randomFactor;
      const effort = Math.min(Math.round(rawCalculation), 2);
      sprintEfforts[name] = effort;
      
      addLog(`${name}: sprint_chance=${sprintChance.toFixed(1)}%, random=${randomFactor.toFixed(2)}, raw=${rawCalculation.toFixed(2)}, effort=${effort}`);
    }
  });
  addLog('====================================');
  
  // STEP 2: Calculate int_sprint_point for each rider
  const sprintPoints = [];
  
  Object.entries(cards).forEach(([name, rider]) => {
    if (rider.finished) return;
    
    const effort = sprintEfforts[name] || 0;
    const sprintStat = rider.sprint || 0;
    
    // Get flat values of rider's cards
    const riderCards = rider.cards || [];
    const flatValues = riderCards.map(card => {
      if (typeof card === 'string') {
        const [flat] = card.split('|').map(Number);
        return flat;
      } else if (card && typeof card.flat === 'number') {
        return card.flat;
      }
      return 0;
    }).sort((a, b) => b - a); // sort descending
    
    // Sum of best sprint_effort cards
    const bestCardsSum = flatValues.slice(0, effort).reduce((sum, val) => sum + val, 0);
    
    // int_sprint_point = sprint_stat + best_cards + random(0,1)
    const randomBonus = Math.random(); // 0 to 1
    const intSprintPoint = sprintStat + bestCardsSum + randomBonus;
    
    sprintPoints.push({ name, intSprintPoint, effort });
  });
  
  // Sort by int_sprint_point descending
  sprintPoints.sort((a, b) => b.intSprintPoint - a.intSprintPoint);
  
  // STEP 3 & 4: Build updated cards object with all changes, then recalculate GC stats
  const pointsAwards = [10, 7, 4, 1];
  const timeAwards = [-5, -2]; // in seconds
  const prizeMoney = 500; // $500 for intermediate sprint winner
  
  // Start with current cards
  let updatedCards = { ...cards };
  
  // Add 2|2 cards to each rider based on sprint_effort
  Object.entries(sprintEfforts).forEach(([name, effort]) => {
    if (updatedCards[name] && effort > 0) {
      // Add 'effort' number of TK kort: 16 to discarded pile (not hand)
      const existingDiscarded = updatedCards[name].discarded || [];
      const newTKCards = Array(effort).fill(null).map(() => ({
        id: 'kort: 16',
        flat: 2,
        uphill: 2
      }));
      
      updatedCards[name] = {
        ...updatedCards[name],
        discarded: [...existingDiscarded, ...newTKCards]
      };
    }
  });
  
  // Award points, time bonuses, and prize money
  sprintPoints.forEach((entry, index) => {
    const { name } = entry;
    if (!updatedCards[name]) return;
    
    // Award points (top 4)
    if (index < pointsAwards.length) {
      const points = pointsAwards[index];
      updatedCards[name] = {
        ...updatedCards[name],
        points: (updatedCards[name].points || 0) + points
      };
    }
    
    // Award time bonus (top 2)
    if (index < timeAwards.length) {
      const timeBonusSec = timeAwards[index];
      updatedCards[name] = {
        ...updatedCards[name],
        gc_time: (updatedCards[name].gc_time || 0) + timeBonusSec
      };
    }
    
    // Award prize money (winner only)
    if (index === 0) {
      updatedCards[name] = {
        ...updatedCards[name],
        prize_money: (updatedCards[name].prize_money || 0) + prizeMoney
      };
    }
  });
  
  // Prepare results for modal display
  const resultsForModal = sprintPoints.map((entry, index) => ({
    name: entry.name,
    team: updatedCards[entry.name]?.team || '',
    intSprintPoint: entry.intSprintPoint,
    effort: entry.effort,
    points: index < pointsAwards.length ? pointsAwards[index] : 0,
    timeBonus: index < timeAwards.length ? timeAwards[index] : 0,
    prizeMoney: index === 0 ? prizeMoney : 0
  }));
  
  // Recalculate GC stats with updated gc_time values
  if (isStageRace && selectedStages.length > 0) {
    for (const riderName in updatedCards) {
      const rider = updatedCards[riderName];
      
      // Use pre-computed e_moves_left_gc_array
      const futureStages = rider.e_moves_left_gc_array.slice(currentStageIndex + 1);
      const sumFutureStages = futureStages.reduce((sum, val) => sum + val, 0);
      rider.e_moves_left_total = rider.e_moves_left + sumFutureStages;
      
      // Recalculate GC favorit points with updated gc_time
      rider.favorit_points_gc = getFavoritPointsGC(rider);
    }
    
    // Recalculate GC win chances
    const factorGC = 17 - 0.6 * 0 + 7 * (numberOfStages - currentStageIndex - 1);
    const totalPointsGC = getTotalMovesLeftGC(updatedCards, factorGC);
    
    for (const riderName in updatedCards) {
      const rider = updatedCards[riderName];
      rider.win_chance_gc = getWinChanceGC(rider, factorGC, totalPointsGC);
      
      // Update XprizeMoney
      const gcPrize = 12000 * (1 - Math.pow(1 - rider.win_chance_gc / 100, 3));
      const stagePrizes = rider.win_chance_stages_array.reduce((sum, wc) => sum + (wc / 100) * 7000, 0);
      rider.XprizeMoney = Math.round(gcPrize + stagePrizes);
      
      addLog(`${riderName}: GC stats updated - gc_time=${rider.gc_time}, favorit_points_gc=${rider.favorit_points_gc.toFixed(4)}, win_chance_gc=${rider.win_chance_gc.toFixed(1)}%`);
    }
  }
  
  // Recompute initial stats (for single stage stats)
  const nextStage = selectedStages[currentStageIndex];
  computeInitialStats(updatedCards, nextStage ? nextStage.track : track, groupToSet, numberOfTeams);
  
  // Update state with all changes
  setCards(updatedCards);
  
  // Close intermediate sprint selection modal
  setIntermediateSprintOpen(false);
  
  // Show results modal
  setIntermediateSprintResults({ results: resultsForModal });
  
  // Now set currentGroup and currentTeam to actually start the stage
  setCurrentGroup(groupToSet);
  setCurrentTeam(firstTeam);
  setMovePhase('input');
  
  addLog('Stage ready to race!');
  
  // Close modal
  setIntermediateSprintOpen(false);
  delete window.pendingStageStart;
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
  const res = runSprintsPure(cards, trackStr, sprintGroup, round, sprintResults, latestPrelTime, undefined, isStageRace);
  // Debug: indicate pure runner returned and wipe previous animation messages
  try { addLog(`runSprints: pure runner returned (result.riders=${Object.keys(res.updatedCards || {}).length})`); } catch (e) {}
  // Wipe the animation box when a new group sprints and show an initial
  // summary message listing the group and participating riders with sprint stat
  const buildSprintSummary = (groupId, statsArr) => {
    try {
      if (!groupId) return ['Preparing sprint...'];
      const parts = (statsArr || []).map(s => `${s.name} (${s.sprint_stat})`);
      const joined = parts.join(', ');
      if (parts.length === 0) {
        return [`Group ${groupId} sprints.`, `No riders participate.`, ''];
      }
      const verb = parts.length === 1 ? 'participates.' : 'participate.';
      // Return multiple lines: bold headline, participants line, blank spacer
      return [`Group ${groupId} sprints.`, `${joined} ${verb}`, ''];
    } catch (e) { return ['Preparing sprint...']; }
  };
  setSprintAnimMsgs(buildSprintSummary(sprintGroup, []));

  // Collect riders in this sprint group and their computed sprint stats
      const updated = res.updatedCards || {};
      // Include riders even if they were marked `finished` by the pure runner
      // so the UI animation shows the computed sprint_points produced by
      // `runSprintsPure`. Filtering out finished riders caused the UI to
      // fall back to using the un-updated `cards` state where sprint_points
      // were not yet set (making the displayed points equal to the raw
      // sprint stat).
      const groupRiders = Object.entries(updated).filter(([, r]) => r.group === sprintGroup);
      // Build stats array from the pure-runner's updated cards and include team
      let stats = groupRiders.map(([name, r]) => ({
        name,
        team: r.team,
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
          team: r.team,
          // Prefer explicit sprint_points if present, otherwise approximate from r.sprint
          sprint_points: Math.round((typeof r.sprint_points === 'number') ? r.sprint_points : (typeof r.sprint === 'number' ? r.sprint : 0)),
          sprint_stat: (typeof r.sprint === 'number') ? r.sprint : 0,
          tk_penalty: (typeof r.tk_penalty === 'number') ? r.tk_penalty : 0
        }));

        if (fallbackStats.length > 0) {
          stats = fallbackStats;
          try { addLog(`runSprints: using fallback stats from cards, count=${stats.length}`); } catch (e) {}
          // Reset animation messages to the initial summary before we animate
          setSprintAnimMsgs(buildSprintSummary(sprintGroup, stats));
        }
      }

      if (stats.length > 0) {
        // Build a full summary list for the top animation box: include every
        // rider name and their computed sprint points so the top box shows
        // the complete standings before the per-rider reveal animation.
        const fullList = [];
        fullList.push(`Sprint: Group ${sprintGroup}`);
        for (const s of stats.slice().sort((a,b) => (b.sprint_points||0) - (a.sprint_points||0))) {
          fullList.push(`${s.name} - ${s.sprint_points} sprint points (Sprint stat: ${s.sprint_stat} TK_penalty: ${s.tk_penalty})`);
        }
        fullList.push('');
        setSprintAnimMsgs(fullList);
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
        // Reveal one combined line per rider and pause 100ms between reveals.
        const asc = stats.slice().sort((a,b) => a.sprint_points - b.sprint_points);
        await new Promise(r => setTimeout(r, 100));
        for (const s of asc) {
          // Try to find the official placement from res.result (if available)
          let placement = null;
          try {
            if (res && Array.isArray(res.result)) {
              const found = res.result.find(it => it && it[1] === s.name);
              if (found) placement = found[0];
            }
          } catch (e) { placement = null; }

          const placePrefix = placement ? `${placement}. ` : '';
          const line = `${placePrefix}${s.name} - ${s.sprint_points} sprint points (Sprint stat: ${s.sprint_stat} TK_penalty: ${s.tk_penalty})`;
          setSprintAnimMsgs(prev => [...prev, line]);
          try { addLog(`runSprints: animated sprint for ${s.name} -> ${s.sprint_points}`); } catch (e) {}
          // 0.1 seconds pause between rider reveals
          await new Promise(r => setTimeout(r, 100));
        }
      }
      else {
        try { addLog('runSprints: no sprint stats found for group'); } catch (e) {}
        setSprintAnimMsgs(prev => [...prev, 'No sprintable riders found.']);
      }

          // Persist finished riders into a dedicated finalStandings state
          if (res && Array.isArray(res.finishedThisRun) && res.finishedThisRun.length > 0) {
            setFinalStandings(prev => {
              // Append new finished entries, avoid duplicates by rider name
              const byName = new Map(prev.map(p => [p.name, p]));
              for (const f of res.finishedThisRun) {
                // Add current stage index to track which stage this rider finished
                byName.set(f.name, { ...f, stageIndex: currentStageIndex });
              }
              return Array.from(byName.values()).sort((a,b) => (a.pos || 9999) - (b.pos || 9999));
            });
          }
          // After recording finalStandings, update game state with survivors
          setCards(res.updatedCards);
          setSprintResults(res.result);
          // Prefer the pure-runner's explicit winner baseline when available.
          // CRITICAL: latestPrelTime can ONLY decrease, never increase.
          try {
            const candidate = (typeof res.winner_prel_time === 'number' && res.winner_prel_time > 0)
              ? res.winner_prel_time
              : (typeof res.latestPt === 'number' ? res.latestPt : 6000);
            setLatestPrelTime(prev => {
              // Always take minimum, starting from 6000 if prev is invalid
              const safePrev = (typeof prev === 'number' && prev > 0) ? prev : 6000;
              const safeCandidate = (typeof candidate === 'number' && candidate > 0) ? candidate : 6000;
              return Math.min(safePrev, safeCandidate);
            });
          } catch (e) {
            // Fallback: only update if res.latestPt is smaller than current
            try { 
              setLatestPrelTime(prev => {
                if (typeof res.latestPt !== 'number') return prev;
                return Math.min(prev || 6000, res.latestPt);
              });
            } catch (e) {}
          }
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
  // Count how many riders are in the whole group (not only the human's riders)
  // Attack is allowed as long as there are at least 3 riders in the group.
  const ridersCount = Array.isArray(riders) ? riders.length : 0;
  const totalGroupCount = Object.values(cards).filter(r => r.group === groupNum && !r.finished).length;
  const canAttack = totalGroupCount >= 3;
  const [teamChoice, setTeamChoice] = useState(null); // 'attack', 'pace', 'follow', 'doublelead'
  const [paceValue, setPaceValue] = useState(null); // 2-8
  const [attackingRider, setAttackingRider] = useState(null); // rider name
  const [attackCard, setAttackCard] = useState(null); // card object
  const [paceLeader, setPaceLeader] = useState(null); // chosen leader when pacing
  // For dobbeltføring
  const [doubleLeadPace1, setDoubleLeadPace1] = useState(null);
  const [doubleLeadPace2, setDoubleLeadPace2] = useState(null);
  const [doubleLeadRider1, setDoubleLeadRider1] = useState(null);
  const [doubleLeadRider2, setDoubleLeadRider2] = useState(null);
  // Default to 'nochange' in choice-2 when a previous round-1 submission exists
  useEffect(() => {
    try {
      const currentRound = (teamPaceRound && teamPaceRound[groupNum]) ? teamPaceRound[groupNum] : 1;
      const paceKey = `${groupNum}-Me`;
      const meta = teamPaceMeta && teamPaceMeta[paceKey];
      // Use the recorded teamPaces entry (round-1 submission) to decide
      // whether we should default to 'nochange' when choice-2 opens. The
      // `meta.prevPace` is only populated later when a round-2 submission
      // happens, so checking teamPaces is the reliable indicator here.
      if (currentRound === 2 && meta && meta.round === 1 && typeof teamPaces[paceKey] !== 'undefined') {
        setTeamChoice(prev => prev === null ? 'nochange' : prev);
      }
    } catch (e) {}
  }, [teamPaceRound, teamPaceMeta, teamPaces, groupNum]);
  
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

  // Return true if the given rider can play at least the given pace value
  // (i.e. has a card in top-4 whose effective value >= pace). This is used
  // when selecting a leader for a chosen pace: a leader who doesn't have the
  // exact value may still lead if they can play a higher card (and thus meet
  // the group's chosen speed by playing that higher card).
  const canRiderPlayAtLeast = (name, rider, pace) => {
    if (!rider) return false;
    const top4 = rider.cards.slice(0, Math.min(4, rider.cards.length));
    const penalty = getPenalty(name, cards) || 0;
    for (const c of top4) {
      if (!c || !c.id) continue;
      const sv = getSlipstreamValue(rider.position, rider.position + Math.floor(pace), track);
      const cv = sv > 2 ? c.flat : c.uphill;
      if ((cv - penalty) >= pace) return true;
    }
    return false;
  };
  
  // Check if dobbeltføring is allowed based on terrain
  // Returns the maximum allowed speed (distance to next numbered field) if allowed, 0 otherwise
  // Dobbeltføring is only allowed when:
  // 1. Current position is on a 3-field (flat terrain)
  // 2. All fields until the next numbered field (0,1,2) are also 3-fields
  const getDobbeltføringMaxSpeed = () => {
    if (!riders || riders.length === 0) return 0;
    try {
      // Use the first rider's position as group position
      const groupPos = riders[0][1].position;
      if (typeof groupPos !== 'number' || groupPos < 0 || groupPos >= track.length) return 0;
      
      // Check current field - must be '3'
      if (track[groupPos] !== '3') {
        console.log(`getDobbeltføringMaxSpeed: not on flat field (groupPos=${groupPos}, track[${groupPos}]='${track[groupPos]}')`);
        return 0;
      }
      
      // Find distance to next numbered field (0, 1, or 2) EXCLUDING F-fields
      // Count only '3' and 'F' fields from the NEXT position
      // We start from groupPos+1 because we count the fields we'll MOVE to
      let distance = 0;
      for (let i = groupPos + 1; i < track.length; i++) {
        const ch = track[i];
        if (ch === '0' || ch === '1' || ch === '2') {
          // Found next numbered field (NOT including F) - stop counting
          break;
        }
        if (ch === '3' || ch === 'F') {
          // Count flat fields and finish line fields
          distance++;
        } else if (ch === '_') {
          // Skip underscores (nedkørsler) - they don't count towards distance
          continue;
        } else if (ch === 'B' || ch === '*') {
          // Reached brosten marker (but not F)
          break;
        } else {
          // Non-flat terrain in the stretch - not allowed
          console.log(`getDobbeltføringMaxSpeed: non-flat terrain at position ${i} (track[${i}]='${ch}')`);
          return 0;
        }
      }
      
      // Return max pace value allowed for dobbeltføring
      // Since speed = max(pace1, pace2) + 1, the resulting speed must fit in distance
      // Example: 4 flat fields ahead → max pace 3 → speed 3+1=4 ✓
      const maxSpeed = distance > 0 ? distance - 1 : 0;
      console.log(`getDobbeltføringMaxSpeed: groupPos=${groupPos}, distance=${distance}, maxSpeed=${maxSpeed}, track snippet='${track.slice(groupPos, groupPos + 10)}'`);
      return maxSpeed;
    } catch (e) {
      return 0;
    }
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
    if (teamChoice === 'nochange') return true;
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
    if (teamChoice === 'doublelead') {
      // Require both pace values, both riders, paces within 1, riders different
      if (!doubleLeadPace1 || !doubleLeadPace2) return false;
      if (Math.abs(doubleLeadPace1 - doubleLeadPace2) > 1) return false;
      if (!doubleLeadRider1 || !doubleLeadRider2) return false;
      if (doubleLeadRider1 === doubleLeadRider2) return false;
      return true;
    }
    return true;
  };

  const handleSubmit = () => {
    if (teamChoice === 'doublelead') {
      const result = {
        type: 'doublelead',
        pace1: doubleLeadPace1,
        pace2: doubleLeadPace2,
        rider1: doubleLeadRider1,
        rider2: doubleLeadRider2
      };
      onSubmit(result);
    } else {
      const result = {
        type: teamChoice,
        value: teamChoice === 'pace' ? (paceValue || 2) : paceValue,
        attacker: attackingRider,
        card: attackCard,
        paceLeader
      };
      onSubmit(result);
    }
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
          {(() => {
            try {
              const currentRound = (teamPaceRound && teamPaceRound[groupNum]) ? teamPaceRound[groupNum] : 1;
              const paceKey = `${groupNum}-Me`;
              const meta = teamPaceMeta && teamPaceMeta[paceKey];
              if (currentRound === 2 && meta && meta.round === 1 && typeof teamPaces[paceKey] !== 'undefined') {
                return (
                  <button
                    onClick={() => handleTeamChoice('nochange')}
                    className={`px-3 py-2 text-sm rounded ${teamChoice === 'nochange' ? 'bg-blue-600 text-white font-bold' : 'bg-blue-200 hover:bg-blue-300'}`}
                  >
                    No change
                  </button>
                );
              }
            } catch (e) {}
            return null;
          })()}
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
          
          {(() => {
            const maxDobbeltSpeed = getDobbeltføringMaxSpeed();
            return dobbeltføring && riders.length >= 2 && maxDobbeltSpeed > 0 && (
              <button
                onClick={() => handleTeamChoice('doublelead')}
                className={`px-3 py-2 text-sm rounded ${
                  teamChoice === 'doublelead'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-purple-200 hover:bg-purple-300'
                }`}
                title={`To ryttere tager føring sammen for +1 speed bonus (koster 2 TK). Max speed: ${maxDobbeltSpeed}`}
              >
                Dobbeltføring
              </button>
            );
          })()}
          
          {(() => {
            const paces = [8,7,6,5,4,3,2];

            return paces.map(pace => {
              let disabled = false;
              let exactMatch = false; // someone has a card with effective value === pace
              let greaterMatch = false; // someone has a card with effective value > pace

              if (paceLeader) {
                // Restrict checks to the chosen leader
                try {
                  const riderObj = riders.find(([n]) => n === paceLeader)[1];
                  const top4 = (riderObj.cards || []).slice(0, Math.min(4, riderObj.cards.length));
                  const localPenalty = top4.slice(0,4).filter(tc => tc && tc.id === 'TK-1: 99').length;
                  // Calculate slipstream based on THIS pace value, not groupSpeed
                  const svForLead = getSlipstreamValue(riderObj.position, riderObj.position + pace, track);
                  for (const c of top4) {
                    const cardVal = svForLead > 2 ? c.flat : c.uphill;
                    const effective = cardVal - localPenalty;
                    if (effective === pace) exactMatch = true;
                    if (effective > pace) greaterMatch = true;
                  }
                  // If neither exact nor greater exist, this pace is not playable by leader
                  if (!exactMatch && !greaterMatch) disabled = true;
                } catch (e) { disabled = true; }
              } else {
                // Team-level: check any rider
                for (const [n, riderObj] of riders) {
                  try {
                    const top4 = (riderObj.cards || []).slice(0, Math.min(4, riderObj.cards.length));
                    const localPenalty = top4.slice(0,4).filter(tc => tc && tc.id === 'TK-1: 99').length;
                    // Calculate slipstream based on THIS pace value, not groupSpeed
                    const svForRider = getSlipstreamValue(riderObj.position, riderObj.position + pace, track);
                    for (const c of top4) {
                      const cardVal = svForRider > 2 ? c.flat : c.uphill;
                      const effective = cardVal - localPenalty;
                      if (effective === pace) exactMatch = true;
                      if (effective > pace) greaterMatch = true;
                    }
                  } catch (e) { /* ignore rider errors */ }
                }
                if (!exactMatch && !greaterMatch) disabled = true;
              }

              // CSS decisions:
              // - selected pace: full green
              // - disabled: grey
              // - exactMatch: full green (even if not selected)
              // - greaterMatch (but not exact): green border
              let cls;
              if (teamChoice === 'pace' && paceValue === pace) {
                cls = 'px-3 py-2 text-sm rounded bg-green-600 text-white font-bold';
              } else if (disabled) {
                cls = 'px-3 py-2 text-sm rounded bg-gray-200 text-gray-400 cursor-not-allowed';
              } else if (exactMatch) {
                cls = 'px-3 py-2 text-sm rounded bg-green-600 text-white';
              } else if (greaterMatch) {
                cls = 'px-3 py-2 text-sm rounded border border-green-600 bg-white text-green-700 hover:bg-green-50';
              } else {
                cls = 'px-3 py-2 text-sm rounded bg-green-200 hover:bg-green-300';
              }

              return (
                <button
                  key={pace}
                  onClick={() => { setTeamChoice('pace'); setPaceValue(pace); setPaceLeader(null); }}
                  disabled={disabled}
                  className={cls}
                >
                  {pace}
                </button>
              );
            });
          })()}
          
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
                        if (!canRiderPlayAtLeast(name, riderObj, paceValue)) setPaceValue(null);
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
                  {riders.filter(([n, r]) => canRiderPlayAtLeast(n, r, paceValue)).map(([n]) => (
                    <button key={n} onClick={() => setPaceLeader(n)} className={`w-full px-3 py-2 text-sm rounded text-left ${paceLeader === n ? 'bg-green-600 text-white font-bold' : 'bg-white hover:bg-green-100 border'}`}>
                      {n}
                    </button>
                  ))}
                  {riders.filter(([n, r]) => canRiderPlayAtLeast(n, r, paceValue)).length === 0 && (
                    <div className="text-xs text-gray-500">Ingen ryttere kan spille mindst {paceValue} med top-4 — vælg en anden værdi eller leader (fallback til 2 ved submit).</div>
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
                          if (!canRiderPlayAtLeast(name, riderObj, paceValue)) setPaceValue(null);
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

      {/* Dobbeltføring selection */}
      {teamChoice === 'doublelead' && (
        <div className="mb-4 p-3 bg-purple-50 rounded border border-purple-300">
          <p className="text-sm font-semibold mb-2 text-purple-800">Dobbeltføring (koster 2 TK)</p>
          <p className="text-xs mb-3 text-purple-700">
            Vælg to pace values (max 1 forskel) og to ryttere. Speed = max(pace1, pace2) + 1
          </p>
          
          {(() => {
            const maxSpeed = getDobbeltføringMaxSpeed();
            const flatFields = maxSpeed + 1; // maxSpeed is distance-1, so actual flat fields is maxSpeed+1
            return maxSpeed > 0 && (
              <div className="mb-3 p-2 bg-yellow-100 rounded border border-yellow-300">
                <p className="text-xs text-yellow-800">
                  ⚠️ Kun {flatFields} 3-felter frem til næste talfelt. Max pace: {maxSpeed}
                </p>
              </div>
            );
          })()}
          
          {/* Pace 1 selection */}
          <div className="mb-3 p-2 bg-white rounded border">
            <p className="text-sm font-semibold mb-2">Pace værdi 1:</p>
            <div className="flex gap-1 flex-wrap">
              {[8,7,6,5,4,3,2].map(pace => {
                const maxSpeed = getDobbeltføringMaxSpeed();
                const disabled = pace > maxSpeed;
                return (
                  <button
                    key={pace}
                    onClick={() => !disabled && setDoubleLeadPace1(pace)}
                    disabled={disabled}
                    className={`px-3 py-2 text-sm rounded ${
                      doubleLeadPace1 === pace
                        ? 'bg-purple-600 text-white font-bold'
                        : disabled
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-100 hover:bg-purple-200'
                    }`}
                  >
                    {pace}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pace 2 selection */}
          <div className="mb-3 p-2 bg-white rounded border">
            <p className="text-sm font-semibold mb-2">Pace værdi 2:</p>
            <div className="flex gap-1 flex-wrap">
              {[8,7,6,5,4,3,2].map(pace => {
                const maxSpeed = getDobbeltføringMaxSpeed();
                // Disabled if: 1) pace > maxSpeed, or 2) not within 1 of pace1
                const disabled = pace > maxSpeed || (doubleLeadPace1 && Math.abs(pace - doubleLeadPace1) > 1);
                return (
                  <button
                    key={pace}
                    onClick={() => !disabled && setDoubleLeadPace2(pace)}
                    disabled={disabled}
                    className={`px-3 py-2 text-sm rounded ${
                      doubleLeadPace2 === pace
                        ? 'bg-purple-600 text-white font-bold'
                        : disabled
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-100 hover:bg-purple-200'
                    }`}
                  >
                    {pace}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Speed preview */}
          {doubleLeadPace1 && doubleLeadPace2 && Math.abs(doubleLeadPace1 - doubleLeadPace2) <= 1 && (
            <div className="mb-3 p-2 bg-purple-100 rounded border border-purple-300">
              <p className="text-sm font-bold text-purple-800">
                Speed: max({doubleLeadPace1}, {doubleLeadPace2}) + 1 = {Math.max(doubleLeadPace1, doubleLeadPace2) + 1}
              </p>
            </div>
          )}

          {/* Rider 1 selection */}
          <div className="mb-3 p-2 bg-white rounded border">
            <p className="text-sm font-semibold mb-2">Rytter 1 (tager føring med pace {doubleLeadPace1 || '?'}):</p>
            <div className="space-y-2">
              {riders.map(([name, rider]) => {
                const canPlay = !doubleLeadPace1 || canRiderPlayAtLeast(name, rider, doubleLeadPace1);
                const disabled = !canPlay;
                return (
                  <button
                    key={name}
                    onClick={() => !disabled && setDoubleLeadRider1(name)}
                    disabled={disabled}
                    className={`w-full px-3 py-2 text-sm rounded text-left ${
                      doubleLeadRider1 === name
                        ? 'bg-purple-600 text-white font-bold'
                        : disabled
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white hover:bg-purple-100 border'
                    }`}
                    title={!canPlay && doubleLeadPace1 ? `Kan ikke spille ${doubleLeadPace1}` : ''}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rider 2 selection */}
          <div className="mb-3 p-2 bg-white rounded border">
            <p className="text-sm font-semibold mb-2">Rytter 2 (tager føring med pace {doubleLeadPace2 || '?'}):</p>
            <div className="space-y-2">
              {riders.map(([name, rider]) => {
                const canPlay = !doubleLeadPace2 || canRiderPlayAtLeast(name, rider, doubleLeadPace2);
                const isRider1 = name === doubleLeadRider1;
                const disabled = !canPlay || isRider1;
                return (
                  <button
                    key={name}
                    onClick={() => !disabled && setDoubleLeadRider2(name)}
                    disabled={disabled}
                    className={`w-full px-3 py-2 text-sm rounded text-left ${
                      doubleLeadRider2 === name
                        ? 'bg-purple-600 text-white font-bold'
                        : disabled
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white hover:bg-purple-100 border'
                    }`}
                    title={isRider1 ? 'Allerede valgt som rytter 1' : !canPlay && doubleLeadPace2 ? `Kan ikke spille ${doubleLeadPace2}` : ''}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-2 bg-yellow-50 border border-yellow-300 rounded">
            <p className="text-xs text-yellow-800 font-semibold">⚠️ Koster 2 TK i alt (1 TK per rytter)</p>
          </div>
        </div>
      )}

      {/* Display all riders with their cards */}
      <div className="mb-4">
        <p className="text-sm font-semibold mb-2">Dine ryttere:</p>
        {riders.map(([name, rider]) => {
          // Check if this rider is taking lead and with what value
          const isLeading = rider.takes_lead > 0;
          const leadValue = isLeading ? rider.selected_value : null;
          
          return (
            <div key={name} className="mb-2 p-2 bg-white rounded border text-sm">
              <div className="font-semibold mb-1">
                {name}
                {isLeading && leadValue && (
                  <span className="ml-2 text-xs font-normal text-green-700">
                    (Leads, {leadValue})
                  </span>
                )}
              </div>
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
          );
        })}
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

  // Prevent background scrolling when any modal (card select / fallback / draft) is open.
  useEffect(() => {
    try {
      const anyModalOpen = !!(cardSelectionOpen || fallBackOpen || gameState === 'draft');
      if (typeof document !== 'undefined' && document && document.body) {
        document.body.style.overflow = anyModalOpen ? 'hidden' : '';
      }
    } catch (e) {}
    return () => {
      try { if (typeof document !== 'undefined' && document && document.body) document.body.style.overflow = ''; } catch (e) {}
    };
  }, [cardSelectionOpen, fallBackOpen, gameState]);
  
  // Auto-open card selection when movePhase changes to 'cardSelection'
  // This ensures card selection opens automatically after all teams have submitted
  // and gives Firebase time to sync the cards state between players
  // Use a ref to track if we've already opened card selection for this group in this cardSelection phase
  const cardSelectionAutoOpenedRef = useRef(null);
  
  useEffect(() => {
    console.log('🎴 Auto-open useEffect triggered:', { movePhase, cardSelectionOpen, currentGroup, round, alreadyOpened: cardSelectionAutoOpenedRef.current, pullInvestGroup });
    
    // Reset the ref when leaving cardSelection phase
    if (movePhase !== 'cardSelection') {
      cardSelectionAutoOpenedRef.current = null;
      return;
    }
    
    // Don't auto-open if pull-invest modal is active
    if (pullInvestGroup !== null) {
      console.log('🎴 Pull-invest modal active for group:', pullInvestGroup, '- deferring auto-open');
      return;
    }
    
    if (movePhase === 'cardSelection' && !cardSelectionOpen) {
      // Check if we've already auto-opened for this group in this cardSelection phase
      // Use composite key of round-group to prevent stale refs from previous rounds
      const autoOpenKey = `${round}-${currentGroup}`;
      const alreadyAutoOpened = cardSelectionAutoOpenedRef.current === autoOpenKey;
      if (alreadyAutoOpened) {
        console.log('🎴 Already auto-opened card selection for group:', currentGroup, 'round:', round, '- skipping');
        return;
      }
      
      const playerTeam = getPlayerTeamName();
      const humanRiders = Object.entries(cards).filter(([, r]) => r.group === currentGroup && r.team === playerTeam && !r.finished);
      
      // Check if this player has already submitted their card selections
      // IMPORTANT: Only check human_planned, not planned_card_id, because planned_card_id
      // can be set by lead assignment but the player still needs to confirm it
      const alreadySubmitted = humanRiders.length > 0 && humanRiders.every(([, r]) => r.human_planned);
      
      console.log('🎴 Auto-open check:', {
        playerTeam,
        humanRidersCount: humanRiders.length,
        alreadySubmitted,
        waitingForCardSelections,
        riderDetails: humanRiders.map(([n, r]) => ({
          name: n,
          planned_card_id: r.planned_card_id,
          human_planned: r.human_planned,
          hasSubmitted: !!(r.planned_card_id || r.human_planned)
        }))
      });
      
      // IMPORTANT: If we're already waiting for card selections (monitoring is active),
      // don't reopen the dialog - let the monitoring useEffect handle finalization
      if (waitingForCardSelections) {
        console.log('🎴 Monitoring is active (waitingForCardSelections=true) - skipping auto-open');
        return;
      }
      
      console.log('🎴 About to check multiplayer/host logic. isMultiplayer:', !!roomCodeRef.current, 'amHost calculation starting...');
      
      // Check if there are ANY human teams in this group (not just current player)
      const isMultiplayer = !!roomCodeRef.current;
      const amHost = isHost || (multiplayerPlayers && multiplayerPlayers.length > 0 && multiplayerPlayers.find(p => p.name === playerName)?.isHost);
      
      console.log('🎴 Multiplayer/host check:', { isMultiplayer, amHost, isHost, playerName, playersCount: multiplayerPlayers?.length });
      
      if (isMultiplayer && amHost) {
        const humanTeams = teams.filter(t => !t.startsWith('Comp'));
        const allHumanRidersInGroup = Object.entries(cards)
          .filter(([, r]) => r.group === currentGroup && !r.finished && humanTeams.includes(r.team));
        
        if (allHumanRidersInGroup.length === 0) {
          // Check if we've already called confirmMove for this group
          if (confirmMoveCalledForGroupRef.current === currentGroup) {
            console.log('🎴 HOST: confirmMove already called for group:', currentGroup, '- skipping');
            return;
          }
          console.log('🎴 HOST: No human riders in group at all - calling confirmMove immediately');
          // confirmMoveCalledForGroupRef.current = currentGroup; // Removed to let confirmMove handle the guard
          confirmMove(cards);
          return;
        }
      }
      
      console.log('🎴 Final check before auto-open:', { 
        humanRidersLength: humanRiders.length, 
        alreadySubmitted,
        willAutoOpen: (humanRiders.length > 0 && !alreadySubmitted)
      });
      
      // Only auto-open if current player has riders in the group AND hasn't submitted yet
      if (humanRiders.length > 0 && !alreadySubmitted) {
        console.log('🎴 Auto-opening card selection for group:', currentGroup, 'round:', round, 'after 500ms delay');
        // Mark that we're auto-opening for this group
        cardSelectionAutoOpenedRef.current = autoOpenKey;
        const timer = setTimeout(() => {
          console.log('🎴 Timer fired, calling openCardSelectionForGroup');
          openCardSelectionForGroup(currentGroup);
        }, 500);
        return () => clearTimeout(timer);
      } else if (alreadySubmitted) {
        console.log('🎴 Player already submitted card selections for group:', currentGroup, '- NOT opening dialog');
      } else if (humanRiders.length === 0) {
        console.log('🎴 Player has no riders in group:', currentGroup, '- NOT opening dialog');
      }
    }
  }, [movePhase, currentGroup, round, cardSelectionOpen, cards, isHost, multiplayerPlayers, playerName, teams, waitingForCardSelections, pullInvestGroup]);
  
  // In multiplayer: HOST monitors when all human teams have submitted card selections
  // OR if a player is the only team in the group, they can finalize themselves
  useEffect(() => {
    // Don't monitor during roundComplete phase - groups are being reassigned
    if (movePhase === 'roundComplete' || movePhase === 'moving') {
      console.log('🎴 Monitoring: Skipping during', movePhase, 'phase');
      return;
    }
    
    // Check using both isHost state and multiplayer context
    const isMultiplayer = !!roomCodeRef.current;
    const amHost = isHost || (multiplayerPlayers && multiplayerPlayers.length > 0 && multiplayerPlayers.find(p => p.name === playerName)?.isHost);
    
    // Check if current player is the only human team in the group
    const playerTeam = getPlayerTeamName();
    const humanTeamNames = multiplayerPlayers ? multiplayerPlayers.map(p => p.team).filter(Boolean) : teams.filter(t => !t.startsWith('Comp'));
    const allHumanRidersInGroup = Object.entries(cards)
      .filter(([, r]) => r.group === currentGroup && !r.finished && humanTeamNames.includes(r.team));
    const humanTeamsInGroup = [...new Set(allHumanRidersInGroup.map(([, r]) => r.team))];
    const isOnlyTeamInGroup = humanTeamsInGroup.length === 1 && humanTeamsInGroup[0] === playerTeam;
    
    console.log('🎴 Monitoring useEffect check:', { 
      waitingForCardSelections, 
      isHost, 
      amHost, 
      gameMode, 
      isMultiplayer,
      isOnlyTeamInGroup,
      humanTeamsInGroup,
      playerTeam
    });
    
    // Allow finalization if:
    // 1. Host in multiplayer, OR
    // 2. Only team in the group (can finalize independently)
    if (!waitingForCardSelections || !isMultiplayer) return;
    if (!amHost && !isOnlyTeamInGroup) return;
    
    console.log('🎴 Monitoring useEffect triggered - can finalize:', amHost ? 'HOST' : 'ONLY_TEAM');
    
    // Check if all human teams in current group have submitted their card selections
    // Filter out AI teams (Comp1, Comp2, etc.)
    // IMPORTANT: Only count teams that HAVE riders in this group AND are controlled by human players
    
    console.log('🎴 All human riders in group:', allHumanRidersInGroup.map(([n, r]) => `${n} (${r.team})`));
    
    const humanTeamsInGroupForCheck = [...new Set(allHumanRidersInGroup.map(([, r]) => r.team))];
    
    const humanTeamsWithSelections = humanTeamsInGroupForCheck.filter(team => {
      // A team has submitted if ALL their riders in the group have human_planned set
      const teamRiders = Object.entries(cards).filter(([, r]) => r.group === currentGroup && r.team === team && !r.finished);
      const allHavePlanned = teamRiders.length > 0 && teamRiders.every(([, r]) => r.human_planned);
      
      console.log(`🎴 Team ${team} submission check:`, {
        ridersCount: teamRiders.length,
        riders: teamRiders.map(([n, r]) => ({ 
          name: n, 
          planned_card_id: r.planned_card_id, 
          human_planned: r.human_planned 
        })),
        allHavePlanned
      });
      
      return allHavePlanned;
    });
    
    console.log('🎴 Monitoring card selections:', {
      humanTeamsInGroup: humanTeamsInGroupForCheck,
      humanTeamsWithSelections: humanTeamsWithSelections.length,
      total: humanTeamsInGroupForCheck.length,
      details: humanTeamsInGroupForCheck.map(team => ({
        team,
        ridersInGroup: allHumanRidersInGroup.filter(([, r]) => r.team === team).length,
        riders: allHumanRidersInGroup
          .filter(([, r]) => r.team === team)
          .map(([n, r]) => `${n}: planned=${r.planned_card_id || 'null'}, human=${r.human_planned || false}`),
        hasSubmitted: Object.entries(cards).some(([, r]) => 
          r.group === currentGroup && 
          r.team === team && 
          r.human_planned
        )
      }))
    });
    
    if (humanTeamsInGroupForCheck.length === 0) {
      // Check if we've already called confirmMove for this group
      if (confirmMoveCalledForGroupRef.current === currentGroup) {
        console.log('🎴 Monitoring: confirmMove already called for group:', currentGroup, '- skipping');
        return;
      }
      console.log('🎴 No human teams in group - calling confirmMove immediately');
      setWaitingForCardSelections(false);
      // confirmMoveCalledForGroupRef.current = currentGroup; // Removed to let confirmMove handle the guard
      confirmMove(cards);
    } else if (humanTeamsWithSelections.length === humanTeamsInGroupForCheck.length) {
      // Check if we've already called confirmMove for this group
      if (confirmMoveCalledForGroupRef.current === currentGroup) {
        console.log('🎴 Monitoring: confirmMove already called for group:', currentGroup, '- skipping');
        return;
      }
      console.log('🎴 All human teams have submitted - calling confirmMove');
      setWaitingForCardSelections(false);
      // confirmMoveCalledForGroupRef.current = currentGroup; // Removed to let confirmMove handle the guard
      confirmMove(cards);
    } else {
      console.log(`🎴 HOST: Still waiting for ${humanTeamsInGroup.length - humanTeamsWithSelections.length} team(s)`);
    }
  }, [cards, waitingForCardSelections, isHost, gameMode, currentGroup, teams]);

  // Debug: Log when postMoveInfo changes
  useEffect(() => {
    console.log('🟨 postMoveInfo changed:', postMoveInfo ? `Group ${postMoveInfo.groupMoved}` : 'null', 
      '| movePhase:', movePhase, 
      '| isHost:', isHost,
      '| roomCode:', !!roomCode);
  }, [postMoveInfo, movePhase, isHost, roomCode]);

  // Clear planned_card_id and human_planned when entering cardSelection phase for the FIRST time
  // This ensures the auto-open logic doesn't think players have already submitted
  // Use a ref to track which group we've cleared to avoid clearing after submissions
  const cardSelectionClearedForGroupRef = useRef(null);
  
  // Track which group has had confirmMove called to prevent duplicate calls
  const confirmMoveCalledForGroupRef = useRef(null);
  const leaderAssignedForGroupRef = useRef(null);
  
  useEffect(() => {
    if (movePhase === 'cardSelection' && roomCodeRef.current) {
      // Only clear if we haven't cleared for this group yet
      if (cardSelectionClearedForGroupRef.current !== currentGroup) {
        console.log('🎴 First time entering cardSelection for group:', currentGroup, '- clearing human_planned only (preserving planned_card_id from lead assignment)');
        cardSelectionClearedForGroupRef.current = currentGroup;
        
        setCards(prev => {
          const updated = { ...prev };
          let cleared = false;
          for (const [name, rider] of Object.entries(updated)) {
            // Only clear human_planned flag, NOT planned_card_id (which may be set by lead assignment)
            if (rider.group === currentGroup && !rider.finished && rider.human_planned) {
              updated[name] = { ...rider, human_planned: false };
              cleared = true;
            }
          }
          if (cleared) {
            console.log('🎴 Cleared human_planned for riders in group', currentGroup);
          }
          return cleared ? updated : prev;
        });
      } else {
        console.log('🎴 Already cleared human_planned for group:', currentGroup, '- skipping');
      }
    }
    
    // Reset the ref when we leave cardSelection phase
    if (movePhase !== 'cardSelection' && cardSelectionClearedForGroupRef.current === currentGroup) {
      console.log('🎴 Left cardSelection phase - resetting cleared tracking');
      cardSelectionClearedForGroupRef.current = null;
    }
  }, [movePhase, currentGroup]);

  const openCardSelectionForGroup = (groupNum) => {
    // Don't open card selection if pull-invest modal is already active
    if (pullInvestGroup !== null) {
      try { addLog(`Card selection blocked: pull-invest modal is active for group ${pullInvestGroup}`); } catch (e) {}
      return;
    }
    // find human riders in the group
    // Use cardsSnapshotRef if available (set by handlePaceSubmit) to avoid React state timing issues
    const cardsToUse = cardsSnapshotRef.current || cards;
    const playerTeam = getPlayerTeamName();
    
    // In multiplayer, check if ANY human team has riders in this group
    // In single player, only check current player's team
    let humanRiders;
    if (gameMode === 'multi') {
      // Get all human teams (non-AI teams)
      const humanTeams = teams.filter(t => !t.startsWith('Comp'));
      humanRiders = Object.entries(cardsToUse).filter(([, r]) => 
        r.group === groupNum && 
        humanTeams.includes(r.team) && 
        !r.finished
      ).map(([n]) => n);
      
      // Filter to only this player's riders for the dialog
      const myRiders = humanRiders.filter(name => cardsToUse[name].team === playerTeam);
      
      console.log('🎴 openCardSelectionForGroup check:', {
        groupNum,
        humanTeams,
        totalHumanRiders: humanRiders.length,
        myRiders: myRiders.length,
        playerTeam
      });
      
      // If no human riders at all in this group, call confirmMove
      if (humanRiders.length === 0) {
        // Check if we've already called confirmMove for this group
        if (confirmMoveCalledForGroupRef.current === groupNum) {
          console.log('🎴 confirmMove already called for group:', groupNum, '- skipping');
          return;
        }
        console.log('🎴 No human riders in group - calling confirmMove immediately');
        // confirmMoveCalledForGroupRef.current = groupNum; // Removed to let confirmMove handle the guard
        const snapshot = cardsSnapshotRef.current;
        cardsSnapshotRef.current = null; // Clear after use
        confirmMove(snapshot);
        return;
      }
      
      // If this player has no riders but other humans do, just return (wait for them)
      if (myRiders.length === 0) {
        console.log('🎴 This player has no riders in group - waiting for other humans');
        
        // IMPORTANT: If I am the HOST, I must start monitoring card selections now!
        // Otherwise I will never detect when the other players have submitted.
        const amHost = isHost || (multiplayerPlayers && multiplayerPlayers.length > 0 && multiplayerPlayers.find(p => p.name === playerName)?.isHost);
        if (amHost) {
          console.log('🎴 HOST has no riders, but others do - enabling monitoring (setWaitingForCardSelections=true)');
          setWaitingForCardSelections(true);
        }
        
        return;
      }
      
      // This player has riders, proceed to show card selection
      humanRiders = myRiders;
    } else {
      // Single player mode - only check current player's team
      humanRiders = Object.entries(cardsToUse).filter(([, r]) => r.group === groupNum && r.team === playerTeam && !r.finished).map(([n]) => n);
      if (!humanRiders || humanRiders.length === 0) {
        // nothing to do
        const snapshot = cardsSnapshotRef.current;
        cardsSnapshotRef.current = null; // Clear after use
        confirmMove(snapshot);
        return;
      }
    }
    // Prepare default selections
    const initial = {};
    
    console.log('🎴 Opening card selection dialog:', {
      groupNum,
      groupSpeed,
      groupSpeedRef: groupSpeedRef.current,
      slipstream,
      slipstreamRef: slipstreamRef.current
    });
    
    // Pre-select a valid card for leaders (must match the group's speed) or
    // fallback to first top-4 for non-leaders.
    // If rider already has a planned_card_id (from lead assignment), use that.
    humanRiders.forEach(name => {
      const rider = cardsToUse[name] || { cards: [] };
      const top4 = (rider.cards || []).slice(0, Math.min(4, rider.cards.length));
      
      // If rider already has a planned card (from lead assignment), use it
      if (rider.planned_card_id) {
        console.log(`🎴 Using pre-assigned planned_card_id for ${name}:`, rider.planned_card_id);
        initial[name] = rider.planned_card_id;
      } else {
        const isLeader = (rider.takes_lead || 0) === 1;
        if (isLeader) {
  const svForLead = getSlipstreamValue(rider.position, rider.position + Math.floor(groupSpeed || 0), track);
  const localPenalty = top4.slice(0,4).filter(tc => tc && tc.id === 'TK-1: 99').length;
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
        console.log(`🎴 Pre-selected card for leader ${name}:`, best ? best.id : 'none');
      } else {
        // Don't pre-select for non-leaders - let human choose
        initial[name] = null;
        console.log(`🎴 No pre-selection for non-leader ${name} - human must choose`);
      }
      }
    });
    setCardSelections(initial);
    setCardSelectionOpen(true);
    // Note: cardsSnapshotRef is cleared in submitCardSelections after confirmMove is called
  };

  const handleCardChoice = (riderName, cardId) => {
    setCardSelections(prev => ({ ...prev, [riderName]: cardId }));
  };

  const submitCardSelections = () => {
    console.log('🎴 submitCardSelections called. cardSelections:', Object.keys(cardSelections).length, 'isMultiplayer:', !!roomCodeRef.current);
    
    // Apply selections into a fresh cards object
    const updated = JSON.parse(JSON.stringify(cards || {}));
    for (const [riderName, cardId] of Object.entries(cardSelections || {})) {
      if (!updated[riderName]) continue;
      
      // ALWAYS mark as human_planned to indicate submission occurred,
      // even if the user chose "no card" (null) or kept the pre-selected card.
      updated[riderName].human_planned = true;

      if (cardId === 'tk_extra 99') {
        // inject a special tk_extra card at the front so the engine can find it
        const existing = updated[riderName].cards || [];
  // tk_extra should behave as the low-value special card (2|2) for movement
  // while still keeping the descriptive id 'tk_extra 99' used in UI logs.
  const synthetic = { id: 'tk_extra 99', flat: 2, uphill: 2 };
        updated[riderName].cards = [synthetic, ...existing];
        updated[riderName].planned_card_id = 'tk_extra 99';
      } else if (typeof cardId === 'string') {
        // set planned_card_id to the chosen id (should exist in hand)
        updated[riderName].planned_card_id = cardId;
      } else {
        // cardId is null/undefined - clear planned_card_id
        updated[riderName].planned_card_id = null;
      }
    }
    
    // Close modal and update cards
    setCardSelectionOpen(false);
    setCards(updated);
    
    // IMPORTANT: Update cardsRef immediately so syncMoveToFirebase gets the updated cards
    // (useEffect that updates cardsRef runs AFTER this function completes)
    cardsRef.current = updated;
    
    console.log('🎴 submitCardSelections completed for', Object.keys(cardSelections).length, 'riders');
    console.log('🎴 Updated cards with planned_card_id:', Object.entries(updated)
      .filter(([, r]) => r.planned_card_id || r.human_planned)
      .map(([n, r]) => `${n}: ${r.planned_card_id}`)
    );
    
    // In multiplayer mode: Track card selections and only call confirmMove when ALL human players have submitted
    // JOINER just syncs their card selections to Firebase and waits for HOST
    // Do NOT change movePhase here - let HOST do it after confirmMove
    // Use roomCode ref to check multiplayer status (more reliable than gameMode state)
    const isMultiplayer = !!roomCodeRef.current;
    
    if (isMultiplayer) {
      console.log('🎴 Multiplayer: Syncing card selections to Firebase. isHost:', isHost, 'roomCode:', !!roomCodeRef.current);
      
      // Sync card selections to Firebase so other players can see them
      syncMoveToFirebase().catch(err => console.error('Failed to sync card selections:', err));
      
      // For HOST: Enable monitoring of card selections
      // The monitoring useEffect will detect when all players have submitted via cards state updates
      // Check both isHost state and isLikelyHost (derived from Firebase) for reliability
      const amHost = isHost || (multiplayerPlayers && multiplayerPlayers.length > 0 && multiplayerPlayers.find(p => p.name === playerName)?.isHost);
      console.log('🎴 Host check in submitCardSelections:', { isHost, playerName, amHost, playersCount: multiplayerPlayers?.length });
      
      if (amHost) {
        console.log('🎴 HOST: Enabling card selection monitoring (setWaitingForCardSelections = true)');
        setWaitingForCardSelections(true);
        addLog('Waiting for other players to select cards...');
      } else {
        console.log('🎴 JOINER: Card selections synced, waiting for HOST to move group');
        addLog('Waiting for host to move group...');
      }
    } else {
      // Single player: call confirmMove immediately
      cardsSnapshotRef.current = null; // Clear snapshot after use
      confirmMove(updated);
    }
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

  // Show multiplayer lobby
  if (inLobby) {
    return (
      <MultiplayerLobby
        isHost={isHost}
        roomCode={roomCode}
        players={multiplayerPlayers}
        onStartGame={startMultiplayerGameSession}
        onLeave={handleLeaveLobby}
        maxPlayers={numberOfTeams}
        gameConfig={{
          trackName,
          ridersPerTeam,
          isStageRace: numberOfStages > 1,
          stages: selectedStages
        }}
      />
    );
  }

  // Show join game dialog if gameMode === 'join'
  if (gameMode === 'join') {
    return (
      <MultiplayerSetup
        onJoinGame={handleJoinGame}
        onBackToSetup={() => setGameMode(null)}
      />
    );
  }

  return (<>
    <div className="min-h-screen p-4" style={{
      backgroundColor: '#dcfce7',
      backgroundImage: getTrackBackground(trackName),
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundBlend: 'overlay'
    }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="bg-white bg-opacity-80 p-4 rounded-lg shadow-md">
            {gameState === 'playing' ? (
              <>
                <h1 className="text-3xl font-bold text-black">{trackName}</h1>
                {gameMode === 'multi' && (
                  <div className="mt-2 mb-2 px-3 py-2 bg-blue-100 rounded border border-blue-300">
                    <div className="text-sm font-semibold text-blue-900">
                      {currentTeam === playerName ? (
                        <span className="text-green-600">🎮 Your turn ({playerName})</span>
                      ) : (
                        <span className="text-gray-600">⏳ Waiting for {currentTeam}</span>
                      )}
                    </div>
                    <div className="text-xs text-blue-700 mt-1">
                      Room: {roomCode} | Players: {multiplayerPlayers.length}
                    </div>
                  </div>
                )}
                <div className="text-xs text-black mt-2 space-y-0.5">
                  <div className="font-semibold">CYCL v. TEST1</div>
                  <div>• Alle Trætkort ryger i en bunke for sig</div>
                  <div>• Hver gang man har 2 TK bliver de omdannet til 1 MK (sæt antal nedenfor)</div>
                  <div>• Når man spiller TK-ekstra mister man et TK</div>
                </div>
                <div className="text-[11px] text-black mt-1">Level {level}</div>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-black">CYCL v. TEST1</h1>
                <div className="text-sm text-black mt-2 space-y-1">
                  <div>• Alle Trætkort ryger i bunden</div>
                  <div>• Når bunken blandes bliver hvert X=2 TK omdannet til MK til toppen (sæt X på startsiden)</div>
                  <div>• Når man spiller TK-ekstra mister man et TK</div>
                  <div>• Slipstream på flad er altid 3.</div>
                  <div>• Udbrydere starter med fuldt sæt uden TK'ere </div>
                </div>
              </>
            )}
          </div>
          <div>
            <a 
              href="https://docs.google.com/document/d/13MRZW8XQ0AIlg6cBjSI_f951bEpFaq4x/edit" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block py-2 px-3 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Regler
            </a>
          </div>
        </div>
        {showEngineUI && (
          <div className="mb-6">
            <EngineUI />
          </div>
        )}
        {/* If there are pending sprint groups, show a prominent sprint button at the top */}
        {gameState === 'playing' && sprintGroupsPending && sprintGroupsPending.length > 0 && (() => {
          try {
            const minG = Math.min(...sprintGroupsPending);
            return (
              <div className="mb-4">
                <button onClick={() => { setSprintAnimMsgs(['Preparing sprint...']); setSprintFocusGroup(minG); }} className="w-full bg-purple-600 text-white py-3 rounded-lg text-center font-semibold">
                  Sprint with group {minG}
                </button>
              </div>
            );
          } catch (e) { return null; }
        })()}
        
        {gameState === 'setup' && !inLobby && (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Game Setup</h2>
            </div>
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
                  {[2,3,4,5,6,7].map(n => (
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
                  {[1,2,3,4,5].map(n => (
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

              <div className="mt-4 p-3 bg-green-50 rounded border border-green-300">
                <label className="block text-sm font-medium mb-2 text-green-800">Antal etaper: {numberOfStages}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={numberOfStages}
                    onChange={(e) => setNumberOfStages(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="w-12 text-right font-bold text-green-800">{numberOfStages}</div>
                </div>
                <div className="flex justify-between text-xs text-green-600 mt-1">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
                
                {numberOfStages > 1 && (
                  <div className="mt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gcTestMode}
                        onChange={(e) => setGcTestMode(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-green-800">GC Test Mode (alle etaper = sprinttest)</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-white rounded border">
                <label className="block text-sm font-medium mb-2">Udbrydere: {numAttackers}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="4"
                    value={numAttackers}
                    onChange={(e) => setNumAttackers(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="w-12 text-right font-bold">{numAttackers}</div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded border">
                <label className="block text-sm font-medium mb-2">Felter foran: {attackerLeadFields}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={attackerLeadFields}
                    onChange={(e) => setAttackerLeadFields(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="w-12 text-right font-bold">{attackerLeadFields}</div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>5</span>
                  <span>10</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-300">
                <label className="block text-sm font-medium mb-2 text-yellow-900">TK-16 pr. TK-1: {tkPerTk1}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="4"
                    value={tkPerTk1}
                    onChange={(e) => setTkPerTk1(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="w-12 text-right font-bold text-yellow-900">{tkPerTk1}</div>
                </div>
                <div className="flex justify-between text-xs text-yellow-700 mt-1">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                </div>
                <div className="mt-2 text-xs text-yellow-800">
                  Hvor mange TK-16 der skal til for at få 1 TK-1 ved omblanding
                </div>
              </div>

              <div className="mt-4 p-3 bg-white rounded border">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dobbeltføring}
                    onChange={(e) => setDobbeltføring(e.target.checked)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <div>
                    <div className="text-sm font-medium">Dobbeltføring</div>
                  </div>
                </label>
              </div>
                
              
              {/* Spacer so mobile users can scroll the level slider above the fixed footer */}
              <div className="h-28 sm:h-32" />
            </div>
          </div>
        )}
        {gameState === 'setup' && !inLobby && (
          <div className="fixed left-0 right-0 bottom-0 p-4 bg-white border-t shadow-lg">
            <div className="max-w-7xl mx-auto px-4 space-y-3">
              {/* Main action button based on mode */}
              {!gameMode && (
                <>
                  <button 
                    onClick={() => {
                      setGameMode('single');
                      if (isStageRace && !gcTestMode) {
                        if (manualStageSelection.length === 0) {
                          const availableTracks = Object.keys(tracks).filter(name => !name.toLowerCase().includes('test'));
                          const shuffled = [...availableTracks];
                          for (let i = shuffled.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                          }
                          const randomSelection = shuffled.slice(0, numberOfStages);
                          setManualStageSelection(randomSelection);
                        }
                        setShowStageSelector(true);
                      } else {
                        startDraft();
                      }
                    }} 
                    className="w-full bg-blue-600 text-white py-4 rounded-lg text-xl font-bold flex items-center justify-center gap-3"
                  >
                    <Play size={20}/> Start Single Player
                  </button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        // Prompt for host name
                        const hostName = prompt('Enter your name:');
                        if (hostName && hostName.trim()) {
                          handleCreateMultiplayerGame(hostName.trim());
                        }
                      }}
                      className="w-full bg-green-600 text-white py-3 rounded-lg text-lg font-semibold"
                    >
                      Create Multiplayer
                    </button>
                    
                    <button
                      onClick={() => setGameMode('join')}
                      className="w-full bg-purple-600 text-white py-3 rounded-lg text-lg font-semibold"
                    >
                      Join Game
                    </button>
                  </div>
                </>
              )}
              
              {gameMode === 'single' && (
                <>
                  <button 
                    onClick={() => {
                      if (isStageRace && !gcTestMode) {
                        // Generate random default stages if not already set
                        if (manualStageSelection.length === 0) {
                          const availableTracks = Object.keys(tracks).filter(name => !name.toLowerCase().includes('test'));
                          const shuffled = [...availableTracks];
                          for (let i = shuffled.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                          }
                          const randomSelection = shuffled.slice(0, numberOfStages);
                          setManualStageSelection(randomSelection);
                        }
                        // Show stage selector for multi-stage races
                        setShowStageSelector(true);
                      } else {
                        // Go directly to draft for single stage or GC test mode
                        startDraft();
                      }
                    }} 
                    className="w-full bg-blue-600 text-white py-4 rounded-lg text-xl font-bold flex items-center justify-center gap-3"
                  >
                    <Play size={20}/> {isStageRace && !gcTestMode ? 'Vælg baner' : 'Start Game'}
                  </button>
                  <button
                    onClick={() => setGameMode(null)}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                  >
                    ← Back to Setup
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Stage Selector Modal */}
        {showStageSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Vælg {numberOfStages} baner til etapeløbet</h2>
              
              {Array.from({ length: numberOfStages }).map((_, idx) => (
                <div key={idx} className="mb-4 p-4 bg-gray-50 rounded border">
                  <label className="block text-sm font-medium mb-2">Etape {idx + 1}</label>
                  <select
                    value={manualStageSelection[idx] || ''}
                    onChange={(e) => {
                      const newSelection = [...manualStageSelection];
                      newSelection[idx] = e.target.value;
                      setManualStageSelection(newSelection);
                    }}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">-- Vælg bane --</option>
                    {Object.keys(tracks)
                      .filter(name => !name.toLowerCase().includes('test'))
                      .sort()
                      .map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))
                    }
                  </select>
                  {manualStageSelection[idx] && (() => {
                    const trackStr = tracks[manualStageSelection[idx]];
                    const finishIndex = trackStr.indexOf('F');
                    const fieldCount = finishIndex !== -1 ? finishIndex : trackStr.length;
                    return (
                      <div className="mt-3">
                        <div className="text-xs text-gray-600 mb-2">
                          Længde: {fieldCount} felter
                        </div>
                        {/* Track preview with colored numbers matching draft screen */}
                        <div className="overflow-x-auto">
                          <div className="flex items-center font-mono text-sm">
                            {colourTrackTokens(trackStr).map((t, i) => (
                              <span key={i} className={t.className}>{t.char}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowStageSelector(false);
                    setManualStageSelection([]);
                  }}
                  className="px-4 py-3 bg-gray-300 text-gray-800 rounded-lg font-semibold"
                >
                  Annuller
                </button>
                <button
                  onClick={() => {
                    // Randomize stage selection
                    const availableTracks = Object.keys(tracks).filter(name => !name.toLowerCase().includes('test'));
                    const shuffled = [...availableTracks];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    }
                    const randomSelection = shuffled.slice(0, numberOfStages);
                    setManualStageSelection(randomSelection);
                  }}
                  className="px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold"
                >
                  🎲 Tilfældige
                </button>
                <button
                  onClick={() => {
                    // Validate all stages are selected
                    if (manualStageSelection.length !== numberOfStages || manualStageSelection.some(s => !s)) {
                      alert(`Vælg venligst alle ${numberOfStages} baner`);
                      return;
                    }
                    
                    // Build selected stages array
                    const selected = manualStageSelection.map((trackName, idx) => ({
                      name: `${trackName}`,
                      track: tracks[trackName]
                    }));
                    
                    // Close modal and start draft with preselected stages
                    setShowStageSelector(false);
                    startDraft(selected);
                  }}
                  disabled={manualStageSelection.length !== numberOfStages || manualStageSelection.some(s => !s)}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Start draft →
                </button>
              </div>
            </div>
          </div>
        )}

        {(gameState === 'draft' || isDrafting) && (
          // On mobile we align modal to the top and allow inner scrolling so
          // long content (pool + selections) is reachable. On larger screens
          // keep centered behaviour.
          <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto z-50" style={{ position: 'relative' }}>
              {/* Show selected stages if multi-stage race */}
              {isStageRace && (
                <div className="mb-4 p-4 bg-green-50 border border-green-300 rounded">
                  <h3 className="text-lg font-bold text-green-800 mb-3">Etapeløb: {selectedStages.length} etaper</h3>
                  <div className="space-y-3">
                    {selectedStages.map((stage, idx) => (
                      <div key={idx} className={`p-3 rounded border ${idx === currentStageIndex ? 'bg-green-200 border-green-400' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-green-700 font-semibold">Etape {idx + 1}:</span>
                          <span className="font-bold">{stage.name}</span>
                          {idx === currentStageIndex && (
                            <span className="text-xs text-green-600 ml-auto">← Nuværende</span>
                          )}
                        </div>
                        <div className="text-sm overflow-x-auto p-2 bg-gray-50 rounded font-mono">
                          {colourTrackTokens(stage.track).map((t, i) => (
                            <span key={i} className={t.className}>{t.char}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
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
                  const playerTeam = getPlayerTeamName();
                  
                  // Check if it's the current player's turn
                  // In single player: check if currentPickingTeam === playerTeam
                  // In multiplayer: check if currentPickingTeam matches the player's name
                  const isMyDraftTurn = currentPickingTeam === playerTeam;
                  
                  // Only allow clicking when: drafting active, it's my turn, and
                  // the rider is still present in the live remaining list.
                  const inRemaining = Array.isArray(draftRemaining) && draftRemaining.some(rr => rr.NAVN === r.NAVN);
                  const isClickable = isDrafting && isMyDraftTurn && inRemaining;
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
                      <div>
                        <div className="font-semibold flex items-center gap-1">
                            <span>{r.NAVN}</span>
                            <Info 
                              size={14} 
                              className="text-blue-500 hover:text-blue-700 cursor-pointer flex-shrink-0"
                              data-rider={r.NAVN}
                              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setRiderTooltip({ name: r.NAVN, x: e.clientX, y: e.clientY }); }}
                              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setRiderTooltip({ name: r.NAVN, x: e.clientX, y: e.clientY }); }}
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setRiderTooltip({ name: r.NAVN, x: e.clientX, y: e.clientY }); }}
                              onTouchEnd={(e) => { const t = e.changedTouches && e.changedTouches[0]; if (t) { e.stopPropagation(); e.preventDefault(); setRiderTooltip({ name: r.NAVN, x: t.clientX, y: t.clientY }); } }}
                            />
                            {!inRemaining && <span className="ml-2 text-xs text-gray-500">(taken)</span>}
                          </div>
                          {(() => {
                            // If multi-stage race, show stats for all stages
                            if (isStageRace) {
                              const cardInDraft = draftPool.find(c => c.NAVN === r.NAVN);
                              const xpm = cardInDraft && cardInDraft.XprizeMoney ? cardInDraft.XprizeMoney : 0;
                              return (
                                <div className="text-xs text-gray-600 mt-1">
                                  <div className="font-semibold mb-0.5">FLAD: {r.FLAD} | SPRINT: {r.SPRINT}</div>
                                  {selectedStages.map((stage, idx) => {
                                    const { modifiedBJERG, label } = computeModifiedBJERG(r, stage.track);
                                    return (
                                      <div key={idx} className={`${idx === currentStageIndex ? 'text-green-700 font-semibold' : ''}`}>
                                        E{idx + 1}: {label}: {modifiedBJERG}
                                      </div>
                                    );
                                  })}
                                  <div className="font-semibold text-purple-700 mt-1">XPM: {xpm.toLocaleString()}</div>
                                </div>
                              );
                            }
                            // Single stage - show as before
                            const { modifiedBJERG, label } = computeModifiedBJERG(r, track);
                            return (<div className="text-xs text-gray-500">FLAD: {r.FLAD} {label}: {modifiedBJERG} SPRINT: {r.SPRINT}</div>);
                          })()}
                      </div>
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
                            {picks.length > 0 ? (
                              picks.map((name, idx) => (
                                <span key={name + idx} className="inline-flex items-center gap-0.5">
                                  <span>{name}</span>
                                  <Info 
                                    size={12} 
                                    className="text-blue-500 hover:text-blue-700 cursor-pointer inline-block"
                                    data-rider={name}
                                    onPointerDown={(e) => { e.stopPropagation(); setRiderTooltip({ name, x: e.clientX, y: e.clientY }); }}
                                    onMouseDown={(e) => { e.stopPropagation(); setRiderTooltip({ name, x: e.clientX, y: e.clientY }); }}
                                    onClick={(e) => { e.stopPropagation(); setRiderTooltip({ name, x: e.clientX, y: e.clientY }); }}
                                    onTouchEnd={(e) => { const t = e.changedTouches && e.changedTouches[0]; if (t) { e.stopPropagation(); setRiderTooltip({ name, x: t.clientX, y: t.clientY }); } }}
                                  />
                                  {idx < picks.length - 1 ? ', ' : ''}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400">(no picks yet)</span>
                            )}
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

              {/* Group chooser summary section (under the track) - hide if group has already moved */}
              {!groupsMovedThisRound.includes(currentGroup) && (
              <div className="bg-white rounded-lg shadow p-3 mb-3">
                  <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-extrabold">
                      {sprintFocusGroup !== null ? (
                        <div className="w-full">
                          <button onClick={() => { setSprintAnimMsgs(['Preparing sprint...']); runSprints(track, sprintFocusGroup); setSprintFocusGroup(null); }} className="w-full bg-purple-600 text-white py-2 rounded font-semibold">Sprint with group {sprintFocusGroup}</button>
                        </div>
                      ) : (
                        (() => {
                          // Find the position of the current group (max position of riders in the group)
                          const groupRiders = Object.values(cards).filter(r => r.group === currentGroup && !r.finished);
                          const groupPosition = groupRiders.length > 0 ? Math.max(...groupRiders.map(r => r.position || 0)) : 0;
                          return `Group ${currentGroup} moves. (Field ${groupPosition})`;
                        })()
                      )}
                    </div>
                    <div className="text-sm text-gray-700 mt-1">{currentTeam}'s turn to choose</div>
                    {/* Small, normal-font list of riders in the current group */}
                    <div className="text-sm text-gray-700 mt-1">
                      {(() => {
                        try {
                          const entries = Object.entries(cards).filter(([, r]) => r.group === currentGroup && !r.finished);
                          if (entries.length === 0) return <span className="text-gray-400">(no riders)</span>;
                          
                          // Find leaders for styling (same logic as footer)
                          const allRiders = Object.entries(cards).filter(([, r]) => !r.finished);
                          
                          const maxPoints = allRiders.length > 0 ? Math.max(...allRiders.map(([, r]) => r.points || 0)) : 0;
                          const pointsLeader = allRiders.find(([, r]) => r.points === maxPoints)?.[0];
                          
                          // GC leader = rider with lowest gc_time (same as footer)
                          const gcLeader = (() => {
                            if (!isStageRace) return null;
                            const ridersWithTime = allRiders.map(([name, r]) => ({
                              name,
                              gc_time: typeof r.gc_time === 'number' ? r.gc_time : Infinity
                            }));
                            const sorted = ridersWithTime.sort((a, b) => a.gc_time - b.gc_time);
                            return sorted.length > 0 && sorted[0].gc_time !== Infinity ? sorted[0].name : null;
                          })();
                          
                          // GC favorite in entire field = rider with highest win_chance_gc (italic + underline)
                          const gcFavoriteOverall = (() => {
                            if (!isStageRace) return null;
                            const ridersWithChance = allRiders.map(([name, r]) => ({
                              name,
                              win_chance_gc: typeof r.win_chance_gc === 'number' ? r.win_chance_gc : -Infinity
                            }));
                            const sorted = ridersWithChance.sort((a, b) => b.win_chance_gc - a.win_chance_gc);
                            return sorted.length > 0 && sorted[0].win_chance_gc !== -Infinity ? sorted[0].name : null;
                          })();
                          
                          // GC favorite in this group = rider in group with highest win_chance_gc (italic only)
                          const gcFavoriteInGroup = (() => {
                            if (!isStageRace) return null;
                            const ridersInGroup = entries.map(([name, r]) => ({
                              name,
                              win_chance_gc: typeof r.win_chance_gc === 'number' ? r.win_chance_gc : -Infinity
                            }));
                            const sorted = ridersInGroup.sort((a, b) => b.win_chance_gc - a.win_chance_gc);
                            return sorted.length > 0 && sorted[0].win_chance_gc !== -Infinity ? sorted[0].name : null;
                          })();
                          
                          return entries.map(([n, r], idx) => {
                            const isGCLeaderYellow = n === gcLeader; // Yellow jersey = GC leader (lowest gc_time)
                            const isPointsLeader = n === pointsLeader;
                            const isGCFavoriteOverall = n === gcFavoriteOverall; // Overall GC favorite (underline)
                            const isGCFavoriteInGroup = n === gcFavoriteInGroup; // Group GC favorite (italic)
                            
                            return (
                              <span key={n} className="inline">
                                <span 
                                  data-rider={n} 
                                  onPointerDown={(e) => { e.stopPropagation(); setRiderTooltip({ name: n, x: e.clientX, y: e.clientY }); }} 
                                  onMouseDown={(e) => { e.stopPropagation(); setRiderTooltip({ name: n, x: e.clientX, y: e.clientY }); }} 
                                  onClick={(e) => { e.stopPropagation(); setRiderTooltip({ name: n, x: e.clientX, y: e.clientY }); }} 
                                  onTouchEnd={(e) => { const t = e.changedTouches && e.changedTouches[0]; if (t) { e.stopPropagation(); setRiderTooltip({ name: n, x: t.clientX, y: t.clientY }); } }} 
                                  className={`cursor-pointer hover:underline ${isGCLeaderYellow ? 'bg-yellow-300 px-1 rounded' : ''} ${isPointsLeader ? 'text-green-600 font-semibold' : ''} ${isGCFavoriteInGroup ? 'italic' : ''} ${isGCFavoriteOverall ? 'underline' : ''}`}
                                >
                                  {n}
                                </span>
                                <span className="text-xs text-gray-500">({getTeamDisplayName(r.team)})</span>
                                {idx < entries.length - 1 ? ', ' : ''}
                              </span>
                            );
                          });
                        } catch (e) { return null; }
                      })()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">Phase: {movePhase}</div>
                </div>

                {/* If there is an active sprint animation, show it here and hide the usual status */}
                {sprintAnimMsgs && sprintAnimMsgs.length > 0 ? (
                  <div className="mt-3">
                    <div className="p-3 bg-purple-50 border rounded">
                      {sprintAnimMsgs.map((m, i) => (
                        <div key={i} className={`${i === 0 ? 'text-sm font-semibold text-gray-800' : 'text-xs text-gray-700'} ${i === 0 ? 'mb-2' : 'mb-1'}`}>
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (() => {
                  return (
                    <div className="mt-3">
                      <div className="text-sm font-semibold mb-2">Current chosen values</div>
                      {/* Group-from-behind box: shows numeric distance to a moved group ahead or X */}
                      {(() => {
                        try {
                          const groupNum = Number(currentGroup);
                          const groupPositions = Object.values(cards).filter(r => r.group === groupNum && !r.finished).map(r => Number(r.position || 0));
                          const groupPos = groupPositions.length > 0 ? Math.max(...groupPositions) : 0;
                          const aheadMoved = Object.values(cards).filter(r => r.group > groupNum && !r.finished && Number(r.position) !== Number(r.old_position || r.position)).map(r => Number(r.position || 0));
                          let display = 'X';
                          if (aheadMoved && aheadMoved.length > 0) {
                            const maxAheadPos = Math.max(...aheadMoved);
                            if (maxAheadPos > groupPos) display = String(maxAheadPos - groupPos);
                          }
                          return (
                            <div className="mb-2">
                              <div className="inline-block p-2 bg-white rounded border text-sm">
                                Group from behind: <strong>{display}</strong>
                              </div>
                            </div>
                          );
                        } catch (e) { return null; }
                      })()}
                      <div className="grid grid-cols-3 gap-2">
                        {(teams || []).map((t) => {
                          const paceKey = `${currentGroup}-${t}`;
                          const meta = teamPaceMeta && teamPaceMeta[paceKey];
                          const hasChosen = typeof meta !== 'undefined';
                          const teamHasRiders = Object.entries(cards).some(([, r]) => r.group === currentGroup && r.team === t && !r.finished);
                          // Get pace value from teamPaces if available, otherwise from metadata
                          const paceFromStore = teamPaces[paceKey];
                          const paceFromMeta = meta && meta.pace !== undefined ? meta.pace : null;
                          const value = hasChosen ? (paceFromStore !== undefined ? paceFromStore : paceFromMeta) : null;
                          
                          // Check if this is a dobbeltføring submission
                          const isDoubleLead = meta && meta.doubleLead;
                          const displayValue = isDoubleLead 
                            ? `${meta.doubleLead.pace1},${meta.doubleLead.pace2}`
                            : String(value);
                          
                          // If a team declared an attack, try to include the attacker's chosen card
                          const attackText = (() => {
                            if (!(hasChosen && meta && meta.isAttack)) return null;
                            if (!meta.attacker) return 'attacks';
                            try {
                              const attackerName = meta.attacker;
                              const riderObj = cards[attackerName];
                              let cardObj = null;
                              if (riderObj) {
                                // Prefer explicit attack_card (human attack) then planned_card_id
                                if (riderObj.attack_card && typeof riderObj.attack_card === 'object') cardObj = riderObj.attack_card;
                                else if (riderObj.planned_card_id && Array.isArray(riderObj.cards)) {
                                  cardObj = riderObj.cards.find(c => c && c.id === riderObj.planned_card_id) || null;
                                }
                              }
                              if (cardObj && typeof cardObj.flat !== 'undefined' && typeof cardObj.uphill !== 'undefined') {
                                return `${attackerName} attacks with ${cardObj.flat}|${cardObj.uphill}`;
                              }
                              // If the attacker is an AI and we only have a numeric selected_value,
                              // show that as value|value so the UI reports the effective attack value.
                              if (riderObj && typeof riderObj.selected_value === 'number' && riderObj.selected_value > 0) {
                                const v = Math.round(riderObj.selected_value);
                                return `${attackerName} attacks with ${v}|${v}`;
                              }
                              // fallback: if we only have an id string somewhere, try to display it
                              if (riderObj && riderObj.planned_card_id) return `${attackerName} attacks with ${riderObj.planned_card_id}`;
                              return `${attackerName} attacks`;
                            } catch (e) {
                              return `${meta.attacker} attacks`;
                            }
                          })();

                          return (
                            <div key={t} className="p-2 rounded border">
                              <div className="font-medium">{getTeamDisplayName(t)}</div>
                              <div className="mt-1">
                                {!teamHasRiders ? (
                                  <div className="text-lg font-bold">X</div>
                                ) : hasChosen ? (
                                  <div className="text-lg font-bold">{displayValue}</div>
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
                      const currentPlayerTeam = gameMode === 'multi' ? playerName : 'Me';
                      const humanRiders = Object.entries(cards).filter(([, r]) => r.group === currentGroup && r.team === currentPlayerTeam && !r.finished);
                      
                      console.log('🎮 Turn check:', {
                        gameMode,
                        currentTeam,
                        playerName,
                        currentPlayerTeam,
                        isMyTurn: currentTeam === playerName,
                        humanRidersCount: humanRiders.length
                      });
                      
                      // In multiplayer mode, check if it's actually this player's turn
                      if (gameMode === 'multi' && currentTeam !== playerName) {
                        return (
                          <div className="text-center text-gray-600 italic p-4">
                            Waiting for {getTeamDisplayName(currentTeam)} to make their move...
                          </div>
                        );
                      }
                      
                      if (currentTeam === currentPlayerTeam && humanRiders.length > 0) {
                        // Determine if choice-2 is open for this group and whether
                        // the team previously attacked in round 1. If so, force
                        // attack mode in the UI and prevent cancelling the attack.
                        const isChoice2 = teamPaceRound && teamPaceRound[currentGroup] === 2;
                        const paceKeyPlayer = `${currentGroup}-${currentPlayerTeam}`;
                        const metaPlayer = (teamPaceMeta && teamPaceMeta[paceKeyPlayer]) ? teamPaceMeta[paceKeyPlayer] : null;
                        const attackedInChoice1 = !!(metaPlayer && metaPlayer.isAttack && metaPlayer.round === 1);
                        const forcedAttacker = attackedInChoice1 ? (metaPlayer && metaPlayer.attacker) : null;

                        return (
                          (() => {
                            // If a post-move pull-back session exists for a different group and there are attackers,
                            // replace the human choice UI with the pull-back control so the competing team's choice
                            // is locked until the pull-back is resolved.
                            try {
                              const pullInfo = postMoveInfo;
                              const pullActive = !!(pullInfo && typeof pullInfo.groupMoved !== 'undefined');
                              if (pullActive) {
                                const g = pullInfo.groupMoved;
                                const members = Object.entries(cards).filter(([, r]) => r.group === g && !r.finished);
                                const attackers = members.filter(([, r]) => (r.attacking_status || '') === 'attacker');
                                const attackersExist = attackers && attackers.length > 0;
                                if (attackersExist && g !== currentGroup) {
                                  const nonAttackers = members.filter(([, r]) => (r.attacking_status || '') !== 'attacker').map(([, r]) => Number(r.position || 0));
                                  const groupPos = nonAttackers.length > 0 ? Math.max(...nonAttackers) : (members.length > 0 ? Math.max(...members.map(([, r]) => Number(r.position || 0))) : 0);
                                  const sv = Number(slipstream || 0);
                                  const canPull = attackers.some(([, r]) => {
                                    const pos = Number(r.position || 0);
                                    return pos > groupPos && (pos - groupPos) <= sv;
                                  });

                                  // Render pull-back controls for the human panel replacement
                                  if (!canPull) {
                                    const didNotGetFree = attackers.some(([, r]) => Number(r.position || 0) <= groupPos);
                                    const label = didNotGetFree ? 'attacker did not get free' : 'Attack is too far away to pull back';
                                    return (
                                      <div className="flex flex-col items-end">
                                        <div className="mb-1">
                                                <button onClick={() => { setPostMoveInfo(null); setTimeout(() => moveToNextGroup(), 40); }} className="px-4 py-2 bg-gray-300 text-gray-700 rounded font-semibold">{label}</button>
                                              </div>
                                        <div className="text-xs text-gray-600">
                                          {(() => {
                                            try {
                                              const outcome = (pullInvestOutcome && pullInvestOutcome[g]) ? pullInvestOutcome[g] : null;
                                              if (!outcome) return null;
                                              return (
                                                <>
                                                  {!isMyTurn() && (
                                                    <div>{(outcome.perTeam && outcome.perTeam[currentTeam]) ? `${currentTeam} invests` : `${currentTeam} does not invest`}</div>
                                                  )}
                                                  <div className="mt-1">{outcome.anyInvested ? 'attack is pulled back' : 'attack is not pulled back'}</div>
                                                </>
                                              );
                                            } catch (e) { return null; }
                                          })()}
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (pullConfirmGroup === g) {
                                    return (
                                      <div className="flex flex-col items-end">
                                        <div className="flex justify-end items-center gap-2">
                                          <div className="text-sm font-medium mr-2">Pull attacker(s) back? Invest?</div>
                                          <button onClick={() => {
                                            // Open invest-by-rider selector for the acting team, but only for human team
                                            const team = currentTeam;
                                              // If the human has eligible riders in this group, ask Me
                                              const playerTeam = getPlayerTeamName();
                                              const humanHasRiders = Object.entries(cards).some(([, rr]) => rr.group === g && rr.team === playerTeam && !rr.finished && (rr.attacking_status || '') !== 'attacker');
                                              if (humanHasRiders) {
                                                addLog(`Opening pull-invest modal for ${playerTeam} group ${g}`);
                                                setPullInvestGroup(g);
                                                setPullInvestTeam(playerTeam);
                                                setPullInvestSelections([]);
                                              } else {
                                                // Otherwise process AI investments immediately for the acting team
                                                if (gameMode === 'multi' && team === getPlayerTeamName()) {
                                                  handlePullInvestSubmit(g, { invested: false, riders: [], team });
                                                } else {
                                                  processAutoInvests(g, { invested: false, rider: null, team });
                                                }
                                              }
                                            setPullConfirmGroup(null);
                                          }} className="px-3 py-2 bg-yellow-600 text-black rounded font-semibold">Yes</button>
                                          <button onClick={() => { 
                                            setPullConfirmGroup(null); 
                                            if (gameMode === 'multi') {
                                              handlePullInvestSubmit(g, { invested: false, riders: [], team: currentTeam });
                                            } else {
                                              processAutoInvests(g, { invested: false, rider: null, team: currentTeam }); 
                                            }
                                          }} className="px-3 py-2 bg-gray-300 text-gray-700 rounded">No</button>
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1 text-right">
                                          {(() => {
                                            try {
                                              const outcome = (pullInvestOutcome && pullInvestOutcome[g]) ? pullInvestOutcome[g] : null;
                                              if (!outcome) return null;
                                              return (
                                                <>
                                                  {currentTeam !== 'Me' && (<div>{(outcome.perTeam && outcome.perTeam[currentTeam]) ? `${currentTeam} invests` : `${currentTeam} does not invest`}</div>)}
                                                  <div className="mt-1">{outcome.anyInvested ? 'attack is pulled back' : 'attack is not pulled back'}</div>
                                                </>
                                              );
                                            } catch (e) { return null; }
                                          })()}
                                        </div>
                                      </div>
                                    );
                                  }

                                  {
                                    return (
                                      <div className="flex flex-col items-end">
                                        <div className="mb-1">
                                            <button onClick={() => {
                                              const team = currentTeam;
                                              const playerTeam = getPlayerTeamName();
                                              if (team === playerTeam) {
                                                addLog(`Opening pull-invest modal for ${team} group ${g}`);
                                                setPullInvestGroup(g);
                                                setPullInvestTeam(team);
                                                setPullInvestSelections([]);
                                              } else {
                                                processAutoInvests(g, { invested: false, rider: null, team });
                                              }
                                            }} className="px-4 py-2 bg-yellow-600 text-black rounded font-semibold">Pull attacker(s) back</button>
                                          </div>
                                        <div className="text-xs text-gray-600 mt-1 text-right">
                                          {(() => {
                                            try {
                                              const outcome = (pullInvestOutcome && pullInvestOutcome[g]) ? pullInvestOutcome[g] : null;
                                              if (!outcome) return null;
                                              return (
                                                <>
                                                  {currentTeam !== 'Me' && (<div>{(outcome.perTeam && outcome.perTeam[currentTeam]) ? `${currentTeam} invests` : `${currentTeam} does not invest`}</div>)}
                                                  <div className="mt-1">{outcome.anyInvested ? 'attack is pulled back' : 'attack is not pulled back'}</div>
                                                </>
                                              );
                                            } catch (e) { return null; }
                                          })()}
                                        </div>
                                      </div>
                                    );
                                  }
                                }
                              }
                            } catch (e) { /* ignore and fall back to normal human UI */ }

                            return (
                              <HumanTurnInterface
                                key={`human-turn-${currentGroup}-${currentPlayerTeam}`}
                                groupNum={currentGroup}
                                riders={humanRiders}
                                onSubmit={(choices) => handleHumanChoices(currentGroup, choices)}
                                disableAttackUnlessChoice1={isChoice2}
                                forcedAttacker={forcedAttacker}
                                totalGroupCount={Object.entries(cards).filter(([, r]) => r.group === currentGroup && !r.finished).length}
                              />
                            );
                          })()
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

                            // If a post-move pull-back session exists for a different group and there are attackers,
                            // replace/disable the normal choice button here so the competing team's choice is locked
                            // until the pull-back is resolved.
                            try {
                              const pullInfo = postMoveInfo;
                              const pullActive = !!(pullInfo && typeof pullInfo.groupMoved !== 'undefined');
                              if (pullActive) {
                                const g = pullInfo.groupMoved;
                                const members = Object.entries(cards).filter(([, r]) => r.group === g && !r.finished);
                                const attackers = members.filter(([, r]) => (r.attacking_status || '') === 'attacker');
                                const attackersExist = attackers && attackers.length > 0;

                                // Only replace the button for other groups (the competing team's choice)
                                if (attackersExist && g !== currentGroup) {
                                  // Compute whether attackers are within SV relative to the group's main position
                                  const nonAttackers = members.filter(([, r]) => (r.attacking_status || '') !== 'attacker').map(([, r]) => Number(r.position || 0));
                                  const groupPos = nonAttackers.length > 0 ? Math.max(...nonAttackers) : (members.length > 0 ? Math.max(...members.map(([, r]) => Number(r.position || 0))) : 0);
                                  const sv = Number(slipstream || 0);
                                  const canPull = attackers.some(([, r]) => {
                                    const pos = Number(r.position || 0);
                                    return pos > groupPos && (pos - groupPos) <= sv;
                                  });

                                  // Render the pull-back control in place of the team's choice button
                                  return (
                                    <div className="flex flex-col items-start">
                                      <div className="flex items-center gap-2">
                                        {!teamHasRiders ? (
                                          <div className="text-sm italic text-gray-500">no riders in the group</div>
                                        ) : (
                                          canPull ? (
                                            <button onClick={() => {
                                              const team = currentTeam;
                                              const playerTeam = getPlayerTeamName();
                                              if (team === playerTeam) {
                                                  addLog(`Opening pull-invest modal for ${team} group ${g}`);
                                                  setPullInvestGroup(g); setPullInvestTeam(team); setPullInvestSelections([]);
                                                } else {
                                                  processAutoInvests(g, { invested: false, rider: null, team });
                                                }
                                            }} className="px-3 py-2 bg-yellow-600 text-black rounded font-semibold">Pull attacker(s) back</button>
                                          ) : (
                                            (() => {
                                              if (!canPull) {
                                                const didNotGetFree = attackers.some(([, r]) => Number(r.position || 0) <= groupPos);
                                                const label = didNotGetFree ? 'attacker did not get free' : 'Attack is too far away to pull back';
                                                return (
                                                  <button onClick={() => { setPostMoveInfo(null); setTimeout(() => moveToNextGroup(), 40); }} className="px-3 py-2 bg-gray-300 text-gray-700 rounded">{label}</button>
                                                );
                                              }
                                              if (pullConfirmGroup === g) {
                                                return (
                                                  <div className="flex items-center gap-2">
                                                    <div className="text-sm font-medium mr-2">Pull attacker(s) back? Invest?</div>
                                                    <button onClick={() => {
                                                        // open invest selector for the acting team (only for Me)
                                                        const playerTeam = getPlayerTeamName();
                                                        const humanHasRiders = Object.entries(cards).some(([, rr]) => rr.group === g && rr.team === playerTeam && !rr.finished && (rr.attacking_status || '') !== 'attacker');
                                                        if (humanHasRiders) {
                                                          addLog(`Opening pull-invest modal for ${playerTeam} group ${g}`);
                                                          setPullInvestGroup(g);
                                                          setPullInvestTeam(playerTeam);
                                                        } else {
                                                          if (gameMode === 'multi' && currentTeam === getPlayerTeamName()) {
                                                            handlePullInvestSubmit(g, { invested: false, riders: [], team: currentTeam });
                                                          } else {
                                                            processAutoInvests(g, { invested: false, rider: null, team: currentTeam });
                                                          }
                                                        }
                                                        setPullConfirmGroup(null);
                                                      }} className="px-3 py-2 bg-yellow-600 text-black rounded font-semibold">Yes</button>
                                                      <button onClick={() => { 
                                                        setPullConfirmGroup(null); 
                                                        if (gameMode === 'multi') {
                                                          handlePullInvestSubmit(g, { invested: false, riders: [], team: currentTeam });
                                                        } else {
                                                          processAutoInvests(g, { invested: false, rider: null, team: currentTeam }); 
                                                        }
                                                      }} className="px-3 py-2 bg-gray-300 text-gray-700 rounded">No</button>
                                                  </div>
                                                );
                                              }
                                              return (
                                                <button onClick={() => {
                                                  const team = currentTeam;
                                                  const playerTeam = getPlayerTeamName();
                                                  if (team === playerTeam) {
                                                    setPullInvestGroup(g);
                                                    setPullInvestTeam(team);
                                                  } else {
                                                    processAutoInvests(g, { invested: false, rider: null, team: currentTeam });
                                                  }
                                                }} className="px-3 py-2 bg-yellow-600 text-black rounded font-semibold">Pull attacker(s) back</button>
                                              );
                                            })()
                                          )
                                        )}
                                      </div>
                                      {/* prediction summary for this team and overall */}
                                      <div className="text-xs text-gray-600 mt-1">
                                        {(() => {
                                          try {
                                            const outcome = (pullInvestOutcome && pullInvestOutcome[g]) ? pullInvestOutcome[g] : null;
                                            if (!outcome) return null;
                                            return (
                                              <>
                                                {!isMyTurn() && (
                                                  <div>{(outcome.perTeam && outcome.perTeam[currentTeam]) ? `${currentTeam} invests` : `${currentTeam} does not invest`}</div>
                                                )}
                                                <div className="mt-1">{outcome.anyInvested ? 'attack is pulled back' : 'attack is not pulled back'}</div>
                                              </>
                                            );
                                          } catch (e) { return null; }
                                        })()}
                                      </div>
                                    </div>
                                  );
                                }
                              }
                            } catch (e) { /* ignore and fall back to normal rendering */ }

                            // Check if human has riders in this group (used for button logic)
                            const currentPlayerTeam = gameMode === 'multi' ? playerName : 'Me';
                            const humanHasRiders = Object.entries(cards).some(([, r]) => r.group === currentGroup && r.team === currentPlayerTeam && !r.finished);

                            return (
                              <div className="flex items-center gap-2">
                                {!teamHasRiders ? (
                                  <div className="text-sm italic text-gray-500">no riders in the group</div>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      // In multiplayer mode, only host can run AI moves
                                      if (gameMode === 'multi' && !isHost) {
                                        addLog('⚠️ Only host can run AI moves in multiplayer');
                                        return;
                                      }
                                      
                                      // If no human riders, auto-play all AI teams sequentially
                                      if (!humanHasRiders) {
                                        const teamsInGroup = Object.entries(cards)
                                          .filter(([, r]) => r.group === currentGroup && !r.finished)
                                          .map(([, r]) => r.team);
                                        const uniqueTeams = Array.from(new Set(teamsInGroup));
                                        
                                        // Build accumulated cards state through the loop
                                        // IMPORTANT: Reset selected_value and takes_lead for ALL riders first
                                        // to prevent values from previous groups affecting speed calculations
                                        let accumulatedCards = { ...cards };
                                        for (const [name, rider] of Object.entries(accumulatedCards)) {
                                          if (rider.selected_value !== 0 || rider.takes_lead !== 0) {
                                            accumulatedCards[name] = { ...rider, selected_value: 0, takes_lead: 0 };
                                          }
                                        }
                                        
                                        // Auto-play each team
                                        for (let i = 0; i < uniqueTeams.length; i++) {
                                          const team = uniqueTeams[i];
                                          const paceKey = `${currentGroup}-${team}`;
                                          const existingMeta = (teamPaceMeta && teamPaceMeta[paceKey]) ? teamPaceMeta[paceKey] : null;
                                          const prevPaceFromMeta = (existingMeta && typeof existingMeta.prevPace !== 'undefined') ? existingMeta.prevPace : undefined;
                                          const prevPaceFromStore = (teamPaces && typeof teamPaces[paceKey] !== 'undefined') ? teamPaces[paceKey] : undefined;
                                          const prevPace = (typeof prevPaceFromMeta !== 'undefined') ? prevPaceFromMeta : prevPaceFromStore;
                                          const currentRound = (teamPaceRound && teamPaceRound[currentGroup]) ? teamPaceRound[currentGroup] : 1;
                                          
                                          const result = autoPlayTeam(currentGroup, team, currentRound === 2 ? prevPace : undefined, accumulatedCards);
                                          if (result) {
                                            // Merge result.updatedCards into accumulatedCards instead of calling setCards
                                            accumulatedCards = { ...accumulatedCards, ...result.updatedCards };
                                            const teamRiders = Object.entries(result.updatedCards).filter(([, r]) => r.group === currentGroup && r.team === team).map(([n, r]) => ({ name: n, ...r }));
                                            const nonAttackerPaces = teamRiders.filter(r => r.attacking_status !== 'attacker').map(r => Math.round(r.selected_value || 0));
                                            let aiTeamPace = nonAttackerPaces.length > 0 ? Math.max(...nonAttackerPaces) : 0;
                                            const aiIsAttack = teamRiders.some(r => r.attacking_status === 'attacker');
                                            const aiDoubleLead = result.doubleLead || null;
                                            
                                            if (typeof prevPace !== 'undefined' && currentRound === 2 && aiTeamPace < prevPace) {
                                              aiTeamPace = prevPace;
                                            }
                                            
                                            const aiAttackerName = (teamRiders.find(r => r.attacking_status === 'attacker') || {}).name || null;
                                            addLog(`${team} chose ${aiTeamPace}`);
                                            handlePaceSubmit(currentGroup, aiTeamPace, team, aiIsAttack, aiAttackerName, aiDoubleLead, accumulatedCards);
                                          } else {
                                            addLog(`${team} chose 0`);
                                            handlePaceSubmit(currentGroup, 0, team, false, null, null, accumulatedCards);
                                          }
                                          
                                          // Small delay between teams for visual feedback
                                          if (i < uniqueTeams.length - 1) {
                                            await new Promise(r => setTimeout(r, 100));
                                          }
                                        }
                                        
                                        // Update cards state once with all accumulated changes
                                        setCards(accumulatedCards);
                                        
                                        // After last team submission, wait briefly then auto-trigger card selection
                                        await new Promise(r => setTimeout(r, 200));
                                        openCardSelectionForGroup(currentGroup);
                                        return;
                                      }
                                      
                                      // Original single-team logic for when human has riders
                                      // In multiplayer mode, only host can run AI moves
                                      if (gameMode === 'multi' && !isHost && currentTeam !== playerName) {
                        addLog('⚠️ Only host can run AI moves in multiplayer');
                                        return;
                                      }                                      const paceKey = `${currentGroup}-${currentTeam}`;
                                      const existingMeta = (teamPaceMeta && teamPaceMeta[paceKey]) ? teamPaceMeta[paceKey] : null;
                                      const prevPaceFromMeta = (existingMeta && typeof existingMeta.prevPace !== 'undefined') ? existingMeta.prevPace : undefined;
                                      const prevPaceFromStore = (teamPaces && typeof teamPaces[paceKey] !== 'undefined') ? teamPaces[paceKey] : undefined;
                                      const prevPace = (typeof prevPaceFromMeta !== 'undefined') ? prevPaceFromMeta : prevPaceFromStore;
                                      const currentRound = (teamPaceRound && teamPaceRound[currentGroup]) ? teamPaceRound[currentGroup] : 1;
                                      
                                      const result = autoPlayTeam(currentGroup, currentTeam, currentRound === 2 ? prevPace : undefined);
                                      const teamAtCall = currentTeam;
                                      if (result) {
                                        setCards(result.updatedCards);
                                        const teamRiders = Object.entries(result.updatedCards).filter(([, r]) => r.group === currentGroup && r.team === teamAtCall).map(([n, r]) => ({ name: n, ...r }));
                                        const nonAttackerPaces = teamRiders.filter(r => r.attacking_status !== 'attacker').map(r => Math.round(r.selected_value || 0));
                                        let aiTeamPace = nonAttackerPaces.length > 0 ? Math.max(...nonAttackerPaces) : 0;
                                        const aiIsAttack = teamRiders.some(r => r.attacking_status === 'attacker');
                                        const aiDoubleLead = result.doubleLead || null;
                                        
                                        // Enforce: in choice-2 AI may not lower their previously announced pace (safety check)
                                        if (typeof prevPace !== 'undefined' && currentRound === 2 && aiTeamPace < prevPace) {
                                          try { addLog(`${teamAtCall} (AI manual) attempted to lower pace in choice-2 (${aiTeamPace} < ${prevPace}) — clamped to ${prevPace}`); } catch (e) {}
                                          aiTeamPace = prevPace;
                                        }
                                        
                                        // Set a short-lived AI message for UX
                                        const aiAttackerName = (teamRiders.find(r => r.attacking_status === 'attacker') || {}).name || null;
                                        setAiMessage(`${teamAtCall} has chosen ${aiTeamPace}`);
                                        handlePaceSubmit(currentGroup, aiTeamPace, teamAtCall, aiIsAttack, aiAttackerName, aiDoubleLead, result.updatedCards);
                                      } else {
                                        const aiTeamPace = 0;
                                        const aiIsAttack = false;
                                        setAiMessage(`${teamAtCall} has chosen ${aiTeamPace}`);
                                        handlePaceSubmit(currentGroup, aiTeamPace, teamAtCall, aiIsAttack, null, null, cards);
                                      }
                                      setTimeout(() => { setAiMessage(''); }, 1500);
                                    }}
                                    className="px-3 py-2 bg-gray-700 text-white rounded"
                                  >
                                    {humanHasRiders ? (currentTeam + "'s choice") : "Play Group"}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()
                  )}

                  {/* When movePhase indicates cardSelection, show the Move Group button */}
                  {/* Card selection opens automatically after a delay, but show button in case of issues */}
                  {/* Don't show this section if postMoveInfo exists (results are ready to display) */}
                  {movePhase === 'cardSelection' && !cardSelectionOpen && !postMoveInfo && (() => {
                    const playerTeam = getPlayerTeamName();
                    const humanRiders = Object.entries(cards).filter(([, r]) => r.group === currentGroup && r.team === playerTeam && !r.finished);
                    const alreadySubmitted = humanRiders.length > 0 && humanRiders.every(([, r]) => r.planned_card_id || r.human_planned);
                    
                    return (
                      <div className="border-t pt-3 bg-green-50 p-3 rounded mt-3">
                        <div className="mb-2 text-sm font-medium">
                          Speed: <span className="font-bold">{groupSpeed}</span>, 
                          SV: <span className={`font-bold ${isFlat ? 'text-gray-700' : 'text-red-600'}`}>{slipstream}</span>
                        </div>
                        {alreadySubmitted ? (
                          <div className="text-sm text-green-600 italic text-center font-medium">
                            ✓ Cards submitted - waiting for other players...
                          </div>
                        ) : humanRiders.length > 0 ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="text-sm text-gray-600 italic">
                              Opening card selection...
                            </div>
                            <button onClick={() => openCardSelectionForGroup(currentGroup)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">
                              Open Now
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600 italic text-center">
                            No riders to select cards for
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
                        // In stage races, check if all riders are finished - if so, show "Start Next Stage" button
                        const allRidersFinished = isStageRace && Object.values(cards).every(r => r.finished);
                        const hasMoreStages = isStageRace && currentStageIndex < numberOfStages - 1;
                        
                        if (allRidersFinished && hasMoreStages) {
                          return (
                            <div className="flex flex-col gap-2">
                              <div className="text-sm font-semibold text-green-700">Stage {currentStageIndex + 1} Complete! 🏁</div>
                              <button 
                                onClick={startNextStage} 
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold flex items-center gap-2"
                              >
                                <SkipForward size={14}/> Start Stage {currentStageIndex + 2}
                              </button>
                            </div>
                          );
                        }
                        
                        if (allRidersFinished && !hasMoreStages) {
                          return (
                            <div className="text-sm font-semibold text-green-700">
                              Stage Race Complete! 🏆 Check Classifications for final results.
                            </div>
                          );
                        }
                        
                        return (
                          <div className="flex gap-2">
                            {/* Only HOST can use fall back in multiplayer */}
                            {(!roomCodeRef.current || isHost) && (
                              <button onClick={() => setFallBackOpen(true)} className="px-4 py-2 bg-yellow-500 text-black rounded font-semibold">Let rider fall back</button>
                            )}
                            {/* Only HOST can start new round in multiplayer */}
                            {(!roomCodeRef.current || isHost) ? (
                              <button onClick={startNewRound} className="px-4 py-2 bg-green-600 text-white rounded font-semibold flex items-center gap-2">
                                <SkipForward size={14}/> Next Round
                              </button>
                            ) : (
                              <div className="px-4 py-2 bg-gray-300 text-gray-600 rounded font-semibold text-center">
                                Waiting for host to start next round...
                              </div>
                            )}
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

                </div>
              </div>
              )}
              {/* End of Group chooser summary section */}

              {/* postMoveInfo yellow box - shown OUTSIDE white box so it's visible even after group moves */}
              {postMoveInfo && (() => {
                console.log('🟨 Rendering yellow box with postMoveInfo:', postMoveInfo.groupMoved);
                return (
                <div className="mt-3 p-3 border rounded bg-yellow-50">
                  <div className="mb-2 text-sm font-medium">
                    {/* Special display for TK-16 → TK-1 conversion */}
                    {postMoveInfo.isTK16Conversion ? (
                      <>
                        <div className="mb-2 text-sm font-bold">TK-16 → TK-1 Conversion (Start of Round)</div>
                        {postMoveInfo.msgs && postMoveInfo.msgs.map((m, i) => (
                          <div key={i} className="mb-1">
                            <span className="font-semibold">{m.name}</span> ({m.team}) har fået {m.displayCard}
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        {/* Show the group number and group stats at the top in bold */}
                        {postMoveInfo.isTK16Conversion ? (
                      <div className="mb-1 text-sm font-bold text-purple-800">TK-16 Conversion (End of Round {postMoveInfo.roundNum})</div>
                    ) : (
                      <div className="mb-1 text-sm font-bold">Group {postMoveInfo.groupMoved} (speed={postMoveInfo.speed || 0}, sv={postMoveInfo.sv || 0})</div>
                    )}
                        {postMoveInfo.msgs && postMoveInfo.msgs.map((m, i) => {
                      const isAttacker = (cards && cards[m.name] && (cards[m.name].attacking_status || '') === 'attacker');
                      return (
                      <div key={i} className={`mb-1 ${m.failed ? 'text-red-600' : (isAttacker ? 'text-green-700' : '')}`}>
                        {m.isLead ? (
                          <strong className={`${m.failed ? 'text-red-600' : (isAttacker ? 'text-green-700' : '')}`}>{m.name} ({m.team})</strong>
                        ) : (
                          <span className={`${isAttacker ? 'font-semibold' : ''}`}>{m.name} ({m.team})</span>
                        )}{' '}
                        <span>spiller kort: {m.displayCard}{m.cardVals ? ` (${m.cardVals})` : ''} {m.oldPos}→{m.newPos}{m.isLead ? ' (lead)' : ''} {m.failed ? '✗' : '✓'}</span>
                        {m.penaltyCount > 0 && <span className="text-orange-600 font-semibold"> P{m.penaltyCount}</span>}
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
                    );
                    })}
                      </>
                    )}
                  </div>
                  {(() => {
                    try {
                      const g = postMoveInfo.groupMoved;
                      const outcome = (pullInvestOutcome && pullInvestOutcome[g]) ? pullInvestOutcome[g] : null;
                      return (
                        outcome ? (
                          <div className="mb-2 text-xs text-gray-700">
                            {(teams || []).map(t => (
                              <div key={t}>{(outcome.perTeam && outcome.perTeam[t]) ? `${t} invests` : `${t} does not invest`}</div>
                            ))}
                            {outcome.perRider && outcome.perRider.length > 0 && (
                              <div className="mt-1">
                                {outcome.perRider.map((p, idx) => (
                                  <div key={idx} className="text-xs text-gray-700">{p.team} invests, {p.rider} takes 1 TK-1</div>
                                ))}
                              </div>
                            )}
                            <div className="mt-1 font-medium">{outcome.anyInvested ? 'attack is pulled back' : 'attack is not pulled back'}</div>
                            <div className="mt-2 flex justify-end">
                              <button onClick={() => moveToNextGroup()} className="px-4 py-2 bg-green-600 text-white rounded font-semibold">Next group</button>
                            </div>
                          </div>
                        ) : null
                      );
                    } catch (e) { return null; }
                  })()}
                  <div className="flex justify-end">
                    {/* Special handling for TK-16 conversion: just show Continue button */}
                    {postMoveInfo.isTK16Conversion ? (
                      <button onClick={() => { 
                        setPostMoveInfo(null); 
                        postMoveInfoRef.current = null;
                        syncMoveToFirebase(null, true);
                      }} className="px-4 py-2 bg-green-600 text-white rounded font-semibold">Continue</button>
                    ) : (
                      <>
                    {/* Offer pull-back action when attackers exist in the moved group */}
                    {(() => {
                      try {
                        const g = postMoveInfo.groupMoved;
                        const members = Object.entries(cards).filter(([, r]) => r.group === g && !r.finished);
                        const nonAttackers = members.filter(([, r]) => (r.attacking_status || '') !== 'attacker').map(([, r]) => Number(r.position || 0));
                        const groupPos = nonAttackers.length > 0 ? Math.max(...nonAttackers) : (members.length > 0 ? Math.max(...members.map(([, r]) => Number(r.position || 0))) : 0);
                        const attackers = members.filter(([, r]) => (r.attacking_status || '') === 'attacker');
                        if (!attackers || attackers.length === 0) {
                          return (
                            <button onClick={() => moveToNextGroup()} className="px-4 py-2 bg-green-600 text-white rounded font-semibold">Continue</button>
                          );
                        }

                        // Determine whether any attacker is within slipstream distance
                        const sv = Number(slipstream || 0);
                        const canPull = attackers.some(([, r]) => {
                          const pos = Number(r.position || 0);
                          return pos > groupPos && (pos - groupPos) <= sv;
                        });

                          if (!canPull) {
                            const didNotGetFree = attackers.some(([, r]) => Number(r.position || 0) <= groupPos);
                            const label = didNotGetFree ? 'attacker did not get free' : 'Attack is too far away to pull back';
                            return (
                              <button onClick={() => { setPostMoveInfo(null); setTimeout(() => moveToNextGroup(), 40); }} className="px-3 py-2 bg-gray-300 text-gray-700 rounded font-semibold">{label}</button>
                            );
                          }

                        // If pullable, show confirmation controls (Yes/No) after an initial press
                        if (pullConfirmGroup === g) {
                          return (
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium mr-2">Pull attacker(s) back? Invest?</div>
                              <button onClick={() => {
                                // Open invest selector for the acting team instead of immediately pulling
                                const playerTeam = getPlayerTeamName();
                                const humanHasRiders = Object.entries(cards).some(([, rr]) => rr.group === g && rr.team === playerTeam && !rr.finished && (rr.attacking_status || '') !== 'attacker');
                                if (humanHasRiders) {
                                  setPullInvestGroup(g);
                                  setPullInvestTeam(playerTeam);
                                  setPullInvestSelections([]);
                                } else {
                                  // If no riders, submit "no invest" automatically
                                  if (gameMode === 'multi') {
                                    handlePullInvestSubmit(g, { invested: false, riders: [], team: currentTeam });
                                  } else {
                                    processAutoInvests(g, { invested: false, rider: null, team: currentTeam });
                                  }
                                }
                                setPullConfirmGroup(null);
                              }} className="px-3 py-2 bg-yellow-600 text-black rounded font-semibold">Yes</button>
                              <button onClick={() => { 
                                setPullConfirmGroup(null); 
                                if (gameMode === 'multi') {
                                  handlePullInvestSubmit(g, { invested: false, riders: [], team: getPlayerTeamName() });
                                } else {
                                  processAutoInvests(g, { invested: false, riders: [], team: currentTeam }); 
                                }
                              }} className="px-3 py-2 bg-gray-300 text-gray-700 rounded">No</button>
                            </div>
                          );
                        }

                        return (
                          <button onClick={() => {
                            const team = currentTeam;
                            const playerTeam = getPlayerTeamName();
                            if (team === playerTeam) {
                              addLog(`Opening pull-invest modal for ${team} group ${g}`);
                              setPullInvestGroup(g);
                              setPullInvestTeam(team);
                              setPullInvestSelections([]);
                            } else {
                              processAutoInvests(g, { invested: false, rider: null, team: currentTeam });
                            }
                          }} className="px-4 py-2 bg-yellow-600 text-black rounded font-semibold">Pull attacker(s) back</button>
                        );
                      } catch (e) { return null; }
                    })()}
                      </>
                    )}
                  </div>
                </div>
                );
              })()}

              {/* Per-group panels removed per user request */}

              {/* Card selection modal for human riders when moving a group */}
              {cardSelectionOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-60">
                  <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 md:pb-12 max-h-[80vh] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', paddingBottom: '6rem', zIndex: 99999 }}>
                    <h3 className="text-lg font-bold mb-3">Choose cards for your riders (Group {currentGroup})</h3>
                    <div className="text-sm text-gray-600 mb-3">
                      Speed: <strong>{groupSpeed || groupSpeedRef.current || 0}</strong>, 
                      SV: <strong className={isFlat ? 'text-gray-700' : 'text-red-600'}>{rawSV !== undefined ? rawSV : (rawSVRef.current !== undefined ? rawSVRef.current : 3)}</strong>
                      {/* Show effective SV if different from raw SV */}
                      {(() => {
                        const actualRawSV = rawSV !== undefined ? rawSV : (rawSVRef.current !== undefined ? rawSVRef.current : 3);
                        const effectiveSVVal = slipstream !== undefined ? slipstream : (slipstreamRef.current !== undefined ? slipstreamRef.current : 0);
                        return actualRawSV !== effectiveSVVal ? (
                          <span className="text-gray-500 ml-1">(effective: {effectiveSVVal})</span>
                        ) : null;
                      })()}
                    </div>
                    <div className="space-y-4 mb-4">
                      {Object.entries(cards).filter(([, r]) => {
                        const playerTeam = getPlayerTeamName();
                        return r.group === currentGroup && r.team === playerTeam && !r.finished;
                      }).map(([name, rider]) => {
                        // Check if this rider is taking lead and with what value
                        const isLeading = rider.takes_lead > 0;
                        const leadValue = isLeading ? (rider.selected_value || groupSpeed || groupSpeedRef.current) : null;
                        
                        return (
                          <div key={name} className="p-3 border rounded">
                            <div data-rider={name} onPointerDown={(e) => { e.stopPropagation(); setRiderTooltip({ name, x: e.clientX, y: e.clientY }); }} onMouseDown={(e) => { e.stopPropagation(); setRiderTooltip({ name, x: e.clientX, y: e.clientY }); }} onClick={(e) => { e.stopPropagation(); setRiderTooltip({ name, x: e.clientX, y: e.clientY }); }} onTouchEnd={(e) => { const t = e.changedTouches && e.changedTouches[0]; if (t) { e.stopPropagation(); setRiderTooltip({ name, x: t.clientX, y: t.clientY }); } }} className="font-semibold mb-2 cursor-pointer">
                              {name}
                              {isLeading && (
                                <span className="ml-2 text-xs font-normal text-green-700">
                                  (Lead {leadValue})
                                </span>
                              )}
                            </div>
                          <div className="grid grid-cols-4 gap-2">
                            {(rider.cards || []).slice(0, Math.min(4, rider.cards.length)).map((c) => {
                              const isLeader = (rider.takes_lead || 0) === 1;
                              const isDownhill = track[rider.position] === '_';
                              let disabled = false;
                              let title = '';
                              try {
                                if (isLeader) {
                                  const svForLead = getSlipstreamValue(rider.position, rider.position + Math.floor(groupSpeed || 0), track);
                                  const top4 = (rider.cards || []).slice(0, Math.min(4, rider.cards.length));
                                  const localPenalty = top4.slice(0,4).filter(tc => tc && tc.id === 'TK-1: 99').length;
                                  let cardVal = svForLead > 2 ? c.flat : c.uphill;
                                  if (isDownhill) cardVal = Math.max(cardVal, 5);
                                  // Use rider's individual selected_value instead of groupSpeed for dobbeltføring
                                  const targetVal = Math.round(rider.selected_value || groupSpeed || 0);
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
                                  const localPenalty = top4.slice(0,4).filter(tc => tc && tc.id === 'TK-1: 99').length;
                                  let cardVal = svForLead > 2 ? c.flat : c.uphill;
                                  if (isDownhill) cardVal = Math.max(cardVal, 5);
                                  // Use rider's individual selected_value instead of groupSpeed for dobbeltføring
                                  const targetVal = Math.round(rider.selected_value || groupSpeed || 0);
                                  if ((cardVal - localPenalty) < targetVal) {
                                    localDisabled = true; // leader cannot play this card for the required pace
                                    titleText = `Must be ≥ ${targetVal}`;
                                  }
                                } else {
                                  // Non-leader: determine whether playing this card would cause rider to fall out
                                  const top4 = (rider.cards || []).slice(0, Math.min(4, rider.cards.length));
                                  const localPenalty = top4.slice(0,4).filter(tc => tc && tc.id === 'TK-1: 99').length;
                                  // Use rawSV (actual terrain SV) to select card value, not effectiveSV
                                  const actualSV = rawSV !== undefined ? rawSV : (rawSVRef.current !== undefined ? rawSVRef.current : 3);
                                  let cardVal = actualSV > 2 ? c.flat : c.uphill;
                                  if (isDownhill) cardVal = Math.max(cardVal, 5);
                                  const effective = (cardVal - localPenalty);
                                  const minRequiredToFollow = Math.max(0, (groupSpeed || 0) - (slipstream || 0));
                                  if (effective < minRequiredToFollow) {
                                    danger = true; // would fall out of group
                                    titleText = titleText || 'Would fall out of group if played';
                                  }
                                }
                              } catch (e) { /* ignore */ }

                              const btnClass = isSelected
                                ? 'p-2 rounded text-sm border bg-blue-100 text-blue-900'
                                : (localDisabled)
                                  ? 'p-2 rounded text-sm border bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : (danger)
                                    ? 'p-2 rounded text-sm border border-red-600 bg-red-50 text-red-700'
                                    : 'p-2 rounded text-sm border bg-white hover:bg-gray-50';

                              return (
                                <button key={c.id} type="button" title={titleText} onClick={() => !localDisabled && handleCardChoice(name, c.id)} disabled={localDisabled} className={btnClass}>
                                  <div className={`font-bold ${danger ? 'text-red-700' : ''}`}>{c.id}</div>
                                  <div className="text-base font-bold">
                                    <span className="text-gray-700">{c.flat}</span>
                                    |
                                    <span className="text-red-600">{c.uphill}</span>
                                  </div>
                                </button>
                              );
                            })}
                            {/* TK-extra option */}
                            {(() => {
                              const isLeader = (rider.takes_lead || 0) === 1;
                              const disabled = !!isLeader; // disallow tk_extra for leaders
                              return (
                                <button type="button" onClick={() => !disabled && handleCardChoice(name, 'tk_extra 99')} disabled={disabled} className={`p-2 rounded text-sm border ${cardSelections[name] === 'tk_extra 99' ? 'bg-blue-600 text-white' : disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}`}>
                                  <div className="font-bold">tk_extra</div>
                                  <div className="text-xs">2|2</div>
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                        );
                      })}
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
                  <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 pb-40 md:pb-6 max-h-[80vh] overflow-y-auto">
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

              {/* Pull-invest modal: choose which rider on the investing team receives TK-1 and performs the pull */}
                      {pullInvestGroup !== null && (() => {
                        const playerTeam = getPlayerTeamName();
                        return pullInvestTeam === playerTeam || pullInvestTeam === null;
                      })() && (
                (() => {
                  try {
                    const g = pullInvestGroup;
                    const team = getPlayerTeamName();
                    // Compute group's main non-attacker position and only offer
                    // candidates who are non-attackers at exactly the group position
                    // (position == groupMainPos) and whose team doesn't have an attacker.
                    const members = Object.entries(cards).filter(([, r]) => r.group === g && !r.finished);
                    const nonAttackerPositions = members.filter(([, r]) => (r.attacking_status || '') !== 'attacker').map(([, r]) => Number(r.position) || 0);
                    const groupMainPos = nonAttackerPositions.length > 0 ? Math.max(...nonAttackerPositions) : (members.length > 0 ? Math.max(...members.map(([,r]) => Number(r.position) || 0)) : 0);
                    
                    // Find teams that have attackers
                    const teamsWithAttackers = new Set(
                      members
                        .filter(([, r]) => (r.attacking_status || '') === 'attacker')
                        .map(([, r]) => r.team)
                    );
                    
                    const candidates = members.filter(([, r]) => 
                      r.team === team && 
                      (r.attacking_status || '') !== 'attacker' && 
                      (Number(r.position) || 0) === groupMainPos &&
                      !teamsWithAttackers.has(r.team)
                    );
                    return (
                      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-60">
                        <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 z-60">
                          <h3 className="text-lg font-bold mb-2">Which rider invests? (Me) — candidates: "{candidates.length}"</h3>
                          <div className="text-sm text-gray-600 mb-3">Choose one of your riders in group {g} (excluding attackers) to receive a TK-1 card on top of their hand, or choose "No investment".</div>
                          <div className="space-y-2 mb-4">
                            {candidates.length === 0 ? (
                              <div className="text-sm text-gray-500">No eligible riders in this group for team {team}.</div>
                            ) : (
                              <div className="grid gap-2">
                                {candidates.map(([name, r]) => {
                                  const selections = pullInvestSelections || [];
                                  const count = selections.filter(x => x === name).length;
                                  const slotsLeft = Math.max(0, 2 - selections.length);
                                  const invest1Selected = count >= 1;
                                  const invest2Selected = count >= 2;
                                  return (
                                    <div key={name} className="p-2 border rounded flex items-center justify-between">
                                      <div>
                                        <div className="font-medium">{name}</div>
                                        <div className="text-xs text-gray-500">Pos: {r.position}</div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button type="button" disabled={pullInvestButtonsDisabled} onClick={() => {
                                          if (pullInvestButtonsDisabled) return;
                                          setPullInvestButtonsDisabled(true);
                                          setTimeout(() => setPullInvestButtonsDisabled(false), 300);
                                          setPullInvestSelections(prev => {
                                            const cur = prev ? [...prev] : [];
                                            const existing = cur.indexOf(name);
                                            if (existing !== -1) {
                                              // remove one occurrence
                                              cur.splice(existing, 1);
                                              return cur;
                                            }
                                            // add one if room
                                            if (cur.length < 2) return [...cur, name];
                                            return cur;
                                          });
                                        }} className={`px-2 py-1 rounded border ${invest1Selected ? 'bg-yellow-100 border-yellow-500' : 'bg-white'}`}>+1</button>

                                        <button type="button" disabled={pullInvestButtonsDisabled} onClick={() => {
                                          if (pullInvestButtonsDisabled) return;
                                          setPullInvestButtonsDisabled(true);
                                          setTimeout(() => setPullInvestButtonsDisabled(false), 300);
                                          setPullInvestSelections(prev => {
                                            const cur = prev ? [...prev] : [];
                                            const cnt = cur.filter(x => x === name).length;
                                            if (cnt >= 2) {
                                              // remove both occurrences
                                              return cur.filter(x => x !== name);
                                            }
                                            // we need two slots to add two occurrences
                                            if (cur.length === 0) return [name, name];
                                            if (cur.length === 1 && cur[0] === name) return [name, name];
                                            // not enough room to add two; do nothing
                                            return cur;
                                          });
                                        }} className={`px-2 py-1 rounded border ${invest2Selected ? 'bg-yellow-100 border-yellow-500' : 'bg-white'}`}>+2</button>

                                        <div className="text-sm text-gray-600">{invest2Selected ? 'Selected x2' : (invest1Selected ? 'Selected x1' : (selections.length >= 2 ? 'Max selected' : 'Select'))}</div>
                                      </div>
                                    </div>
                                  );
                                })}
                                <div className="text-xs text-gray-600">Selected: {(() => {
                                      const sel = pullInvestSelections || [];
                                      if (sel.length === 0) return 'none';
                                      const counts = {};
                                      for (const s of sel) counts[s] = (counts[s] || 0) + 1;
                                      return Object.entries(counts).map(([n, c]) => c > 1 ? `${n} x${c}` : n).join(', ');
                                    })()}</div>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-end gap-2">
                            <button disabled={pullInvestButtonsDisabled} onClick={() => {
                                if (pullInvestButtonsDisabled) return;
                                setPullInvestButtonsDisabled(true);
                                setTimeout(() => setPullInvestButtonsDisabled(false), 500);
                                // mark handled so auto-open doesn't reopen modal immediately
                                try { pullInvestHandledRef.current.add(g); setTimeout(() => pullInvestHandledRef.current.delete(g), 5000); } catch (e) {}
                                setPullInvestGroup(null);
                                setPullInvestTeam(null);
                                setPullInvestSelections([]);
                                addLog(`Me chooses no investment (0 riders)`);
                                if (gameMode === 'multi') {
                                  handlePullInvestSubmit(g, { invested: false, riders: [], team: getPlayerTeamName() });
                                } else {
                                  processAutoInvests(g, { invested: false, riders: [], team: 'Me' });
                                }
                              }} className="px-3 py-2 bg-gray-300 text-gray-700 rounded">No investment</button>
                            <button disabled={pullInvestButtonsDisabled || !(pullInvestSelections && pullInvestSelections.length > 0)} onClick={() => {
                              if (pullInvestButtonsDisabled) return;
                              setPullInvestButtonsDisabled(true);
                              setTimeout(() => setPullInvestButtonsDisabled(false), 500);
                              // mark handled so auto-open doesn't reopen modal immediately
                              try { pullInvestHandledRef.current.add(g); setTimeout(() => pullInvestHandledRef.current.delete(g), 5000); } catch (e) {}
                              const riders = pullInvestSelections || [];
                              addLog(`Me chooses to invest ${riders.length} rider(s): ${riders.join(', ')}`);
                              if (gameMode === 'multi') {
                                handlePullInvestSubmit(g, { invested: true, riders, team: getPlayerTeamName() });
                              } else {
                                processAutoInvests(g, { invested: true, riders, team: 'Me' });
                              }
                              setPullInvestGroup(null);
                              setPullInvestTeam(null);
                              setPullInvestSelections([]);
                            }} className="px-3 py-2 bg-yellow-600 text-black rounded">Confirm investment</button>
                          </div>
                        </div>
                      </div>
                    );
                  } catch (e) { return null; }
                })()
              )}

              
            </div>

            {/* Sticky footer: minimizable */}
            <div className="fixed left-0 right-0 bottom-0 bg-white border-t shadow-lg z-50">
              <div className="max-w-7xl mx-auto px-3">
                <div className="relative">
                  {/* Toggle button to minimize/restore footer */}
                  <button onClick={() => setFooterCollapsed(fc => !fc)} aria-label="Toggle footer" aria-expanded={!footerCollapsed} className="absolute -top-6 right-3 bg-white border rounded-full p-1 shadow hover:ring-2 hover:ring-green-300 transition-all" title="Toggle footer">
                    <span className="text-sm" aria-hidden>{footerCollapsed ? '▲' : '▼'}</span>
                  </button>

                  <div className="py-2" style={{ overflow: 'hidden', transition: 'max-height 260ms ease', maxHeight: footerCollapsed ? 0 : '1000px' }} aria-hidden={footerCollapsed}>
                    {/* Track row (restored) */}
                    <div className="overflow-x-auto bg-gray-50 rounded p-1 mb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <div style={{ display: 'flex', gap: 1, alignItems: 'stretch', height: 'auto', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const tokens = colourTrackTokens(track || '').map((t, i) => ({ ...t, idx: i }));
                          const groupsList = Array.from(new Set(Object.values(cards).filter(r => !r.finished).map(r => r.group))).sort((a,b)=>a-b);

                          // Compute the "main" position for each group. If some riders in
                          // the group are attackers, compute the group's main position as
                          // the max position among non-attacker riders so the group's GX
                          // label is placed where the rest of the group is. If no
                          // non-attackers exist, fall back to the max of all members.
                          const groupMainPos = {};
                          const groupMoved = {};
                          for (const g of groupsList) {
                            const members = Object.entries(cards).filter(([,r]) => r.group === g && !r.finished);
                            const nonAttackers = members.filter(([,r]) => (r.attacking_status || '') !== 'attacker').map(([,r]) => r.position || 0);
                            if (nonAttackers.length > 0) groupMainPos[g] = Math.max(...nonAttackers);
                            else groupMainPos[g] = members.length ? Math.max(...members.map(([,r]) => r.position || 0)) : 0;
                            // Determine whether the group moved this round by comparing
                            // each member's position to their old_position. If any member
                            // changed position, consider the group as moved.
                            const moved = members.some(([,r]) => Number(r.position) !== Number(r.old_position || r.position));
                            groupMoved[g] = moved;
                          }

                          const posToGroups = {};
                          Object.entries(groupMainPos).forEach(([g, pos]) => { posToGroups[pos] = posToGroups[pos] || []; posToGroups[pos].push(Number(g)); });

                          // Map attacker riders (those with attacking_status==='attacker')
                          // to their landing positions so we can render their names on the
                          // tile they ended up on while the round is in progress.
                          const ridersAtPos = {};
                          for (const [name, r] of Object.entries(cards)) {
                            if (r && !r.finished && (r.attacking_status === 'attacker')) {
                              const p = Number(r.position) || 0;
                              ridersAtPos[p] = ridersAtPos[p] || [];
                              ridersAtPos[p].push(name);
                            }
                          }
                          // Map riders who fell out (couldn't follow the group's main speed)
                          // These are non-attackers whose position is strictly less than
                          // the group's main position. Render them on their own tile.
                          const fallenAtPos = {};
                          for (const [name, r] of Object.entries(cards)) {
                            if (!r || r.finished) continue;
                            if (r.attacking_status === 'attacker') continue; // already handled
                            const g = r.group;
                            const mainPos = typeof groupMainPos[g] !== 'undefined' ? Number(groupMainPos[g]) : null;
                            const pos = Number(r.position) || 0;
                            if (mainPos !== null && pos < mainPos) {
                              fallenAtPos[pos] = fallenAtPos[pos] || [];
                              fallenAtPos[pos].push(name);
                            }
                          }
                          const firstNameShort = (full) => {
                            if (!full || typeof full !== 'string') return full || '';
                            const parts = full.trim().split(/\s+/);
                            const first = parts[0] || '';
                            return first.slice(0, 5);
                          };

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
                                  {(() => {
                                    const attackersHere = ridersAtPos[t.idx] || [];
                                    const fallenHere = fallenAtPos[t.idx] || [];
                                    if (attackersHere.length > 0 || fallenHere.length > 0 || groupsHere.length > 0) {
                                      return (
                                        <div style={{ position: 'absolute', bottom: 6, left: 4, right: 4, textAlign: 'center' }}>
                                          {/* Attackers (if any) — render above group labels */}
                                          {attackersHere.length > 0 && attackersHere.map((n, i) => (
                                            <div key={n + i} style={{ marginBottom: i < attackersHere.length - 1 ? 2 : 4, color: styleColors.text, display: 'flex', alignItems: 'center', gap: 2, textAlign: 'left' }} className="w-full px-1 py-0.5 rounded text-[10px] font-light">
                                              <span>{firstNameShort(n)}</span>
                                              <button
                                                type="button"
                                                className="cursor-pointer flex-shrink-0 border-0 bg-transparent p-0 m-0"
                                                style={{ color: styleColors.text, pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center' }}
                                                onClick={(e) => { 
                                                  e.stopPropagation(); 
                                                  e.preventDefault(); 
                                                  setRiderTooltip({ name: n, x: e.clientX, y: e.clientY });
                                                }}
                                              >
                                                <Info size={10} />
                                              </button>
                                            </div>
                                          ))}

                                          {/* Groups (if any) — render below attackers */}
                                          {groupsHere.length > 0 && (() => {
                                            const unmovedGroups = groupsHere.filter(g => !(groupMoved && typeof groupMoved[g] !== 'undefined') || groupMoved[g] === false);
                                            const movedGroups = groupsHere.filter(g => (groupMoved && typeof groupMoved[g] !== 'undefined') && groupMoved[g] === true);
                                            return (
                                              <div>
                                                {unmovedGroups.length > 0 && (
                                                  <div style={{ display: 'block' }}>
                                                    {unmovedGroups.map((g, idx) => (
                                                      <div key={`u${g}`} className={`w-full px-1 py-0.5 rounded text-[10px] font-semibold bg-white border`} style={{ marginBottom: idx < unmovedGroups.length - 1 ? 4 : 0, fontSize: '0.9rem', fontWeight: 700, color: '#000' }}>{`G${g}`}</div>
                                                    ))}
                                                  </div>
                                                )}
                                                {movedGroups.length > 0 && (
                                                  <div style={{ display: 'block', marginTop: unmovedGroups.length > 0 ? 4 : 0 }}>
                                                    {movedGroups.map((g, idx) => (
                                                      <div key={`m${g}`} className={`px-1 py-0.5 rounded text-[10px] font-semibold`} style={{ marginBottom: idx < movedGroups.length - 1 ? 4 : 0, fontSize: '0.75rem', fontWeight: 700 }}>{`G${g}`}</div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })()}

                                          {/* Fallen riders (if any) — render below groups/attackers when present */}
                                          {fallenHere.length > 0 && fallenHere.map((n, i) => (
                                            <div key={`f${n}${i}`} style={{ marginTop: 4, color: styleColors.text, display: 'flex', alignItems: 'center', gap: 2, textAlign: 'left' }} className="w-full px-1 py-0.5 rounded text-[10px] font-light">
                                              <span>{firstNameShort(n)}</span>
                                              <button
                                                type="button"
                                                className="cursor-pointer flex-shrink-0 border-0 bg-transparent p-0 m-0"
                                                style={{ color: styleColors.text, pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center' }}
                                                onClick={(e) => { 
                                                  e.stopPropagation(); 
                                                  e.preventDefault(); 
                                                  setRiderTooltip({ name: n, x: e.clientX, y: e.clientY });
                                                }}
                                              >
                                                <Info size={10} />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
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
                    {sprintAnimMsgs && sprintAnimMsgs.length > 0 && (
                      <div className="mt-1 p-2 bg-purple-50 border rounded text-xs max-h-20 overflow-y-auto">
                        <div className="text-sm text-gray-800 font-bold">{sprintAnimMsgs[0]}</div>
                        {sprintAnimMsgs[1] && <div className="mt-1 text-xs text-gray-800">{sprintAnimMsgs[1]}</div>}
                        {sprintAnimMsgs.length > 2 && <div style={{ height: 8 }} />}
                        {sprintAnimMsgs.slice(3).map((m, idx) => (
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
                          
                          // Calculate GC leader (lowest gc_time) and points leader (highest points)
                          const gcLeader = (() => {
                            if (!isStageRace) return null;
                            const allRiders = Object.entries(cards).map(([name, r]) => ({
                              name,
                              gc_time: typeof r.gc_time === 'number' ? r.gc_time : Infinity
                            }));
                            const sorted = allRiders.sort((a, b) => a.gc_time - b.gc_time);
                            return sorted.length > 0 && sorted[0].gc_time !== Infinity ? sorted[0].name : null;
                          })();
                          
                          const pointsLeader = (() => {
                            if (!isStageRace) return null;
                            const allRiders = Object.entries(cards).map(([name, r]) => ({
                              name,
                              points: typeof r.points === 'number' ? r.points : 0
                            }));
                            const sorted = allRiders.sort((a, b) => b.points - a.points);
                            return sorted.length > 0 && sorted[0].points > 0 ? sorted[0].name : null;
                          })();
                          
                          // Virtual leader = rider with best current timing (GC time + current stage time gap)
                          const virtualLeader = (() => {
                            const allRiders = Object.entries(cards).filter(([, r]) => !r.finished);
                            if (allRiders.length === 0) return null;
                            
                            if (isStageRace) {
                              // For stage races: gc_time + current time gap
                              const ridersWithTiming = allRiders.map(([name, r]) => ({
                                name,
                                totalTime: (typeof r.gc_time === 'number' ? r.gc_time : Infinity) + 
                                          (typeof groupTimeGaps !== 'undefined' && typeof groupTimeGaps[r.group] === 'number' ? groupTimeGaps[r.group] : 0)
                              }));
                              const sorted = ridersWithTiming.sort((a, b) => a.totalTime - b.totalTime);
                              return sorted.length > 0 && sorted[0].totalTime !== Infinity ? sorted[0].name : null;
                            } else {
                              // For single stages: furthest position (or closest to finish)
                              const sorted = allRiders.sort((a, b) => (b[1].position || 0) - (a[1].position || 0));
                              return sorted.length > 0 ? sorted[0][0] : null;
                            }
                          })();
                          
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
                                        const hasYellowJersey = isStageRace && name === gcLeader;
                                        const hasGreenJersey = isStageRace && name === pointsLeader;
                                        const isVirtualLeader = name === virtualLeader;
                                        const displayName = abbrevFirstName(name);
                                        return (
                                            <div key={name} className="whitespace-nowrap inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: bg, color: txt }}>
                                            {hasYellowJersey && <span className="text-yellow-400" title="GC Leader">👕</span>}
                                            {hasGreenJersey && <span className="text-green-500" title="Points Leader">⭐</span>}
                                            <span>
                                              {isVirtualLeader && displayName.length > 0 ? (
                                                <>
                                                  <span style={{ color: '#DC2626' }}>{displayName.charAt(0)}</span>
                                                  {displayName.slice(1)}
                                                </>
                                              ) : displayName}
                                            </span>
                                            <button
                                              type="button"
                                              className="cursor-pointer flex-shrink-0 opacity-70 hover:opacity-100 border-0 bg-transparent p-0 m-0"
                                              style={{ color: txt, pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center' }}
                                              onClick={(e) => { 
                                                e.stopPropagation(); 
                                                e.preventDefault(); 
                                                setRiderTooltip({ name, x: e.clientX, y: e.clientY });
                                              }}
                                            >
                                              <Info size={12} />
                                            </button>
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
                  <p><strong>Team:</strong> {getTeamDisplayName(currentTeam)}</p>
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
                              {Object.entries(cards).filter(([,r]) => r.team === t).map(([n], idx, arr) => (
                                  <span key={n}>
                                  <span data-rider={n} onPointerDown={(e) => { e.stopPropagation(); setRiderTooltip({ name: n, x: e.clientX, y: e.clientY }); }} onMouseDown={(e) => { e.stopPropagation(); setRiderTooltip({ name: n, x: e.clientX, y: e.clientY }); }} onClick={(e) => { e.stopPropagation(); setRiderTooltip({ name: n, x: e.clientX, y: e.clientY }); }} onTouchEnd={(e) => { const t2 = e.changedTouches && e.changedTouches[0]; if (t2) { e.stopPropagation(); setRiderTooltip({ name: n, x: t2.clientX, y: t2.clientY }); } }} className="cursor-pointer">{n}</span>
                                  {idx < arr.length - 1 ? ', ' : ''}
                                </span>
                              )) || <span className="text-gray-400">(no riders)</span>}
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
                      {/* Only HOST can start new round in multiplayer */}
                      {(!roomCodeRef.current || isHost) ? (
                        <button onClick={startNewRound} className="w-full mt-3 bg-green-600 text-white py-2 rounded flex items-center justify-center gap-2">
                          <SkipForward size={14}/>Round {round + 1}
                        </button>
                      ) : (
                        <div className="w-full mt-3 bg-gray-300 text-gray-600 py-2 rounded text-center font-semibold">
                          Waiting for host to start round {round + 1}...
                        </div>
                      )}
                      {/* Only HOST can use fall back in multiplayer */}
                      {(!roomCodeRef.current || isHost) && (
                        <button onClick={() => setFallBackOpen(true)} className="w-full mt-3 bg-yellow-500 text-black py-2 rounded flex items-center justify-center gap-2">
                          Let rider fall back
                        </button>
                      )}
                      {diceEvent && (
                        <div className="mt-2 p-2 bg-yellow-50 border rounded text-sm">
                          <div className="font-medium">{diceEvent.kind === 'puncture' ? 'Puncture' : 'Crash'}: {diceEvent.who} {diceEvent.oldPos}→{diceEvent.newPos}</div>
                          <div className="text-xs text-gray-600">Use "Let rider fall back" to move riders back until you confirm.</div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {sprintAnimMsgs && sprintAnimMsgs.length > 0 && (
                  <div className="mt-3">
                    <div className="mt-2 p-2 bg-purple-50 border rounded text-xs max-h-20 overflow-y-auto">
                      <div className="text-sm text-gray-800 font-bold">{sprintAnimMsgs[0]}</div>
                      {sprintAnimMsgs[1] && <div className="mt-1 text-xs text-gray-800">{sprintAnimMsgs[1]}</div>}
                      {sprintAnimMsgs.length > 2 && <div style={{ height: 8 }} />}
                      {sprintAnimMsgs.slice(3).map((m, idx) => (
                        <div key={idx} className="text-xs text-gray-800">{m}</div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Back to Setup button removed per user request */}
                {isStageRace && (
                  <>
                    <button 
                      onClick={() => setShowClassifications(true)} 
                      className="w-full mt-3 bg-yellow-500 hover:bg-yellow-600 text-black py-3 rounded text-base font-semibold"
                      style={{ touchAction: 'manipulation', zIndex: 30 }}
                    >
                      Show Classifications
                    </button>
                    <button 
                      onClick={() => setShowStages(true)} 
                      className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded text-sm font-semibold"
                      style={{ touchAction: 'manipulation', zIndex: 30 }}
                    >
                      Show Stages
                    </button>
                    <button 
                      onClick={() => setShowPrizeMoney(true)} 
                      className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-semibold"
                      style={{ touchAction: 'manipulation', zIndex: 30 }}
                    >
                      Show Prize Money
                    </button>
                  </>
                )}
                <button onClick={() => { setEliminateSelection(Object.keys(cards).reduce((acc, k) => { acc[k] = false; return acc; }, {})); setEliminateOpen(true); }} className="w-full mt-3 bg-red-600 text-white py-2 rounded text-sm font-semibold" style={{ touchAction: 'manipulation', zIndex: 30 }}>
                  Eliminate rider
                </button>
                {/* Mobile floating button for easy activation on phones */}
                <button onClick={() => { setEliminateSelection(Object.keys(cards).reduce((acc, k) => { acc[k] = false; return acc; }, {})); setEliminateOpen(true); }} className="lg:hidden fixed bottom-6 right-4 z-50 bg-red-600 text-white p-3 rounded-full shadow-lg" aria-label="Eliminate riders (mobile)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M8 6v14"></path><path d="M16 6v14"></path><path d="M10 6v14"></path></svg>
                </button>
                
                {/* Mobile debug toggle button */}
                <div className="lg:hidden mt-3 px-3">
                  <button onClick={() => setShowDebugMobile(s => !s)} className="w-full py-2 bg-yellow-500 text-black rounded">
                    {showDebugMobile ? 'Hide Debug' : 'Show Debug'}
                  </button>
                </div>

                <div className={`${showDebugMobile ? '' : 'hidden lg:block'} bg-gray-900 text-green-400 rounded-lg shadow p-4 mt-6 font-mono text-xs max-h-96 overflow-y-auto`}>
                  {/* Eliminate modal */}
                  {eliminateOpen && (
                    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-start sm:items-center justify-center p-4" onClick={() => setEliminateOpen(false)}>
                      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-3">Eliminate riders</h3>
                        <div className="text-sm text-gray-600 mb-2">Select riders to remove from the current game. Default: none selected.</div>
                        <div className="flex gap-2 mb-2">
                          <button type="button" onClick={() => { const map = {}; Object.keys(cards).forEach(k => map[k] = true); setEliminateSelection(map); }} className="px-2 py-1 bg-gray-200 rounded">Select all</button>
                          <button type="button" onClick={() => { const map = {}; Object.keys(cards).forEach(k => map[k] = false); setEliminateSelection(map); }} className="px-2 py-1 bg-gray-200 rounded">Deselect all</button>
                        </div>
                        <div className="max-h-64 overflow-y-auto mb-3 border rounded p-2">
                          {Object.keys(cards).length === 0 ? (<div className="text-sm text-gray-500">No riders available</div>) : Object.keys(cards).map((n) => (
                            <label key={n} className="flex items-center gap-2 mb-1">
                              <input type="checkbox" checked={!!eliminateSelection[n]} onChange={(e) => setEliminateSelection(prev => ({ ...prev, [n]: !!e.target.checked }))} />
                              <span className="text-sm">{n}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEliminateOpen(false)} className="px-3 py-1 rounded border">Cancel</button>
                          <button type="button" onClick={() => {
                            const selected = Object.entries(eliminateSelection).filter(([,v]) => v).map(([k]) => k);
                            if (selected.length > 0) {
                              setCards(prev => { const copy = { ...prev }; selected.forEach(n => delete copy[n]); return copy; });
                              try { addLog(`Eliminated riders: ${selected.join(', ')}`); } catch (e) {}
                            }
                            setEliminateOpen(false);
                            setEliminateSelection({});
                          }} className="px-3 py-1 rounded bg-red-600 text-white">Confirm</button>
                        </div>
                      </div>
                    </div>
                  )}
                  <h3 className="text-lg font-bold mb-3 text-white">🐛 DEBUG: All Rider Dictionaries</h3>
                  <div className="space-y-4">
                      {Object.entries(cards).map(([name, rider]) => (
                      <div key={name} className="border border-green-600 rounded p-3 bg-gray-800">
                        <h4 data-rider={name} onPointerDown={(e) => { e.stopPropagation(); setRiderTooltip({ name, x: e.clientX, y: e.clientY }); }} onMouseDown={(e) => { e.stopPropagation(); setRiderTooltip({ name, x: e.clientX, y: e.clientY }); }} onClick={(e) => { e.stopPropagation(); setRiderTooltip({ name, x: e.clientX, y: e.clientY }); }} onTouchEnd={(e) => { const t = e.changedTouches && e.changedTouches[0]; if (t) { e.stopPropagation(); setRiderTooltip({ name, x: t.clientX, y: t.clientY }); } }} className="text-yellow-400 font-bold mb-2 cursor-pointer">{name}</h4>
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
                    // Merge finished riders recorded in `cards` (if any) and
                    // the accumulated `finalStandings` we persist when sprints
                    // happen. This ensures final placements are visible even
                    // after we remove finished riders from the live `cards`.
                    const fromCards = Object.entries(cards)
                      .filter(([, r]) => typeof r.result === 'number' && r.result < 1000)
                      .map(([name, r]) => ({ pos: r.result, name, team: r.team, timeSec: (typeof r.time_after_winner === 'number' ? r.time_after_winner : null) }));
                    const fromState = Array.isArray(finalStandings) ? finalStandings.map(f => ({ pos: f.pos, name: f.name, team: f.team, timeSec: f.timeSec })) : [];
                    const mergedByName = new Map();
                    for (const e of [...fromState, ...fromCards]) {
                      mergedByName.set(e.name, e);
                    }
                    // Build an array and sort by time-after-winner (ascending).
                    // Missing timeSec values are treated as very large so they land at the end.
                    const mergedArr = Array.from(mergedByName.values()).sort((a, b) => {
                      const ta = (typeof a.timeSec === 'number') ? a.timeSec : 1e9;
                      const tb = (typeof b.timeSec === 'number') ? b.timeSec : 1e9;
                      if (ta !== tb) return ta - tb;
                      const pa = (typeof a.pos === 'number') ? a.pos : 9999;
                      const pb = (typeof b.pos === 'number') ? b.pos : 9999;
                      if (pa !== pb) return pa - pb;
                      return (a.name || '').localeCompare(b.name || '');
                    });
                    // Re-assign consecutive positions 1..N to avoid duplicates
                    const merged = mergedArr.map((e, idx) => ({ ...e, pos: idx + 1 }));
                    if (merged.length === 0) return <div className="text-sm text-gray-500">No finishers yet</div>;
                    return (
                      <div className="text-sm space-y-1">
                        {merged.map((r) => (
                          <div key={r.name} className="flex justify-between">
                            <div>{r.pos}. {isPlayerTeam(r.team) ? (<strong>{r.name}</strong>) : r.name} <span className="text-xs text-gray-500">({r.team})</span></div>
                            <div className="text-xs text-green-600">{typeof r.timeSec === 'number' ? convertToSeconds(r.timeSec) : '-'}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-3 mt-3 max-h-96 overflow-y-auto">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold"><FileText size={16} className="inline"/>Log</h3>
                  <button 
                    onClick={() => {
                      const message = prompt('Skriv en kort beskrivelse af problemet:');
                      if (message === null) return; // User cancelled
                      
                      const logText = logs.slice().reverse().join('\n');
                      const emailBody = `Beskrivelse:\n${message}\n\n--- LOG ---\n${logText}`;
                      
                      // Send email via mailto link
                      const mailtoLink = `mailto:andersenjespersteen@gmail.com?subject=Cycling Game Log&body=${encodeURIComponent(emailBody)}`;
                      window.location.href = mailtoLink;
                    }}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded"
                    style={{ touchAction: 'manipulation' }}
                  >
                    Send Log
                  </button>
                </div>
                <div className="text-xs space-y-1">
                  {logs.slice(-100).reverse().map((l,i) => <div key={i} className="border-b pb-1">{l}</div>)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    {/* Rider tooltip */}
    {riderTooltip && (typeof window !== 'undefined') && (() => {
      // Try to find rider in cards first, then in ridersData
      let r = (cards && cards[riderTooltip.name]) ? cards[riderTooltip.name] : null;
      if (!r && ridersData) {
        r = ridersData.find(rider => rider.NAVN === riderTooltip.name);
      }
      if (!r) return null; // Rider not found
      const mod = computeModifiedBJERG(r, track);
      const boxW = 260;
      const boxH = 110;
      const left = Math.min(Math.max(8, (riderTooltip.x || 0) + 8), (window.innerWidth - boxW - 8));
      const top = Math.min(Math.max(8, (riderTooltip.y || 0) + 8), (window.innerHeight - boxH - 8));
      
      // Get values - try lowercase first (from cards), then uppercase (from ridersData)
      const fladValue = r.flad || r.FLAD || '';
      const sprintValue = r.sprint || r.SPRINT || '';
      
      return (
        <div style={{ position: 'fixed', left, top, width: boxW, backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, zIndex: 2000, boxShadow: '0 6px 24px rgba(0,0,0,0.12)' }} onClick={(e) => { e.stopPropagation(); setRiderTooltip(null); }}>
          <div className="font-semibold text-sm mb-1">{riderTooltip.name}</div>
          <div className="text-xs text-gray-600 mb-1">FLAD: {fladValue}</div>
          <div className="text-xs text-gray-600 mb-1">{mod.label}: {mod.modifiedBJERG}</div>
          <div className="text-xs text-gray-600">SPRINT: {sprintValue}</div>
        </div>
      );
    })()}
    
    {/* Classifications Modal */}
    {showClassifications && isStageRace && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={() => setShowClassifications(false)}
      >
        <div 
          className="bg-white rounded-lg shadow-xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Stage Race Classifications</h2>
            <button 
              onClick={() => setShowClassifications(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* GC Classification (Yellow) */}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-2 text-yellow-600">🟡 General Classification (GC)</h3>
            <div className="text-sm space-y-1">
              {(() => {
                // Get all riders with gc_time, sort by gc_time ascending
                const allRiders = Object.entries(cards).map(([name, r]) => ({
                  name,
                  team: r.team,
                  gc_time: typeof r.gc_time === 'number' ? r.gc_time : Infinity
                }));
                const sorted = allRiders.sort((a, b) => a.gc_time - b.gc_time);
                const minTime = sorted.length > 0 && sorted[0].gc_time !== Infinity ? sorted[0].gc_time : 0;
                
                if (sorted.length === 0 || sorted[0].gc_time === Infinity) {
                  return <div className="text-gray-500">No GC times recorded yet</div>;
                }
                
                return sorted.map((r, idx) => {
                  const gap = r.gc_time - minTime;
                  const isGCLeader = idx === 0;
                  // Get win_chance_gc from cards
                  const riderCard = cards[r.name];
                  const winChanceGC = riderCard && typeof riderCard.win_chance_gc === 'number' ? riderCard.win_chance_gc : null;
                  return (
                    <div key={r.name} className={`flex justify-between border-b pb-1 ${isGCLeader ? 'border-2 border-yellow-400 bg-yellow-50 rounded px-1' : ''}`}>
                      <div>
                        {idx + 1}. {isPlayerTeam(r.team) ? <strong>{r.name}</strong> : r.name}
                        <span className="text-xs text-gray-500 ml-2">({r.team})</span>
                        {winChanceGC !== null && (
                          <span className="text-xs text-gray-600 font-light ml-2 border border-gray-300 px-1 rounded">{winChanceGC.toFixed(0)}%</span>
                        )}
                      </div>
                      <div className="text-xs text-yellow-600">
                        {gap === 0 ? convertToSeconds(r.gc_time) : `+${convertToSeconds(gap)}`}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          
          {/* Points Classification (Green) */}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-2 text-green-600">🟢 Points Classification</h3>
            <div className="text-sm space-y-1">
              {(() => {
                const allRiders = Object.entries(cards).map(([name, r]) => ({
                  name,
                  team: r.team,
                  points: typeof r.points === 'number' ? r.points : 0
                }));
                const sorted = allRiders.sort((a, b) => b.points - a.points);
                
                if (sorted.length === 0 || sorted.every(r => r.points === 0)) {
                  return <div className="text-gray-500">No points awarded yet</div>;
                }
                
                // Find GC leader to check if same as points leader
                const gcLeader = (() => {
                  const allRiders = Object.entries(cards).map(([name, r]) => ({
                    name,
                    gc_time: typeof r.gc_time === 'number' ? r.gc_time : Infinity
                  }));
                  const gcSorted = allRiders.sort((a, b) => a.gc_time - b.gc_time);
                  return gcSorted.length > 0 && gcSorted[0].gc_time !== Infinity ? gcSorted[0].name : null;
                })();
                
                const pointsLeader = sorted.length > 0 ? sorted[0].name : null;
                const greenJerseyHolder = gcLeader === pointsLeader && sorted.length > 1 ? sorted[1].name : pointsLeader;
                
                return sorted.map((r, idx) => {
                  const hasGreenJersey = r.name === greenJerseyHolder;
                  return (
                    <div key={r.name} className="flex justify-between border-b pb-1">
                      <div className={hasGreenJersey ? 'text-green-600 font-semibold' : ''}>
                        {idx + 1}. {r.team === 'Me' ? <strong>{r.name}</strong> : r.name}
                        <span className="text-xs text-gray-500 ml-2">({r.team})</span>
                      </div>
                      <div className="text-xs text-green-600 font-semibold">
                        {r.points} pts
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* King of the Mountains Classification (Red/White Polka Dots) */}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-2 text-red-600">⛰️  King of the Mountains (KOM)</h3>
            <div className="text-sm space-y-1">
              {(() => {
                const allRiders = Object.entries(cards).map(([name, r]) => ({
                  name,
                  team: r.team,
                  kom_points: typeof r.kom_points === 'number' ? r.kom_points : 0
                }));
                const sorted = allRiders.sort((a, b) => b.kom_points - a.kom_points);
                
                if (sorted.length === 0 || sorted.every(r => r.kom_points === 0)) {
                  return <div className="text-gray-500">No mountain points awarded yet</div>;
                }
                
                return sorted.map((r, idx) => (
                  <div key={r.name} className="flex justify-between border-b pb-1">
                    <div>
                      {idx + 1}. {r.team === 'Me' ? <strong>{r.name}</strong> : r.name}
                      <span className="text-xs text-gray-500 ml-2">({r.team})</span>
                    </div>
                    <div className="text-xs text-red-600 font-semibold">
                      {r.kom_points} pts
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Prize Money Classification (Blue) */}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-2 text-blue-600">💰 Prize Money Classification</h3>
            <div className="text-sm space-y-1 mb-4">
              {(() => {
                const allRiders = Object.entries(cards).map(([name, r]) => ({
                  name,
                  team: r.team,
                  prize_money: typeof r.prize_money === 'number' ? r.prize_money : 0
                }));
                const sorted = allRiders.sort((a, b) => b.prize_money - a.prize_money);
                
                if (sorted.length === 0 || sorted.every(r => r.prize_money === 0)) {
                  return <div className="text-gray-500">No prize money awarded yet</div>;
                }
                
                return sorted.map((r, idx) => (
                  <div key={r.name} className="flex justify-between border-b pb-1">
                    <div>
                      {idx + 1}. {r.team === 'Me' ? <strong>{r.name}</strong> : r.name}
                      <span className="text-xs text-gray-500 ml-2">({r.team})</span>
                    </div>
                    <div className="text-xs text-blue-600 font-semibold">
                      ${r.prize_money.toLocaleString()}
                    </div>
                  </div>
                ));
              })()}
            </div>
            
            {/* Prize Money per Team */}
            <h4 className="text-md font-bold mb-2 text-blue-700">Prize Money per Team</h4>
            <div className="text-sm space-y-1">
              {(() => {
                const allRiders = Object.entries(cards).map(([name, r]) => ({
                  name,
                  team: r.team,
                  prize_money: typeof r.prize_money === 'number' ? r.prize_money : 0
                }));
                
                // Sum prize money by team
                const teamMoney = {};
                for (const r of allRiders) {
                  if (!teamMoney[r.team]) teamMoney[r.team] = 0;
                  teamMoney[r.team] += r.prize_money;
                }
                
                const sorted = Object.entries(teamMoney).sort((a, b) => b[1] - a[1]);
                
                if (sorted.length === 0 || sorted.every(([, money]) => money === 0)) {
                  return <div className="text-gray-500">No prize money awarded yet</div>;
                }
                
                return sorted.map(([team, money], idx) => (
                  <div key={team} className="flex justify-between border-b pb-1">
                    <div>
                      {idx + 1}. {isPlayerTeam(team) ? <strong>{team}</strong> : team}
                    </div>
                    <div className="text-xs text-blue-700 font-bold">
                      ${money.toLocaleString()}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Stage Results */}
          <div className="mt-8 pt-6 border-t-2">
            <h3 className="text-xl font-bold mb-4">Stage Results</h3>
            {selectedStages && selectedStages.map((stage, stageIdx) => {
              // Get riders who finished this stage from finalStandings
              const stageFinishers = finalStandings.filter(r => r.stageIndex === stageIdx);
              
              if (stageFinishers.length === 0) {
                return (
                  <div key={stageIdx} className="mb-6">
                    <h4 className="text-lg font-semibold mb-2">Stage {stageIdx + 1}:</h4>
                    <div className="text-sm text-gray-600 mb-1">{stage.name}</div>
                    <div className="text-sm text-gray-500">Not completed yet</div>
                  </div>
                );
              }

              // Sort by finish time
              const sorted = [...stageFinishers].sort((a, b) => a.timeSec - b.timeSec);
              const winnerTime = sorted[0].timeSec;

              return (
                <div key={stageIdx} className="mb-6">
                  <h4 className="text-lg font-semibold mb-2">Stage {stageIdx + 1}:</h4>
                  <div className="text-sm text-gray-600 mb-2">{stage.name}</div>
                  <div className="text-sm space-y-1">
                    {sorted.map((r, idx) => {
                      const gap = r.timeSec - winnerTime;
                      return (
                        <div key={r.name} className="flex justify-between border-b pb-1">
                          <div>
                            {idx + 1}. {isPlayerTeam(r.team) ? <strong>{r.name}</strong> : r.name}
                            <span className="text-xs text-gray-500 ml-2">({r.team})</span>
                          </div>
                          <div className="text-xs">
                            {gap === 0 ? r.time : `+${convertToSeconds(gap)}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}
    
    {/* Intermediate Sprint Modal */}
    {intermediateSprintOpen && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100]"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="bg-white rounded-lg shadow-xl p-6 max-w-4xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-bold mb-3 text-green-600">Intermediate Sprint</h2>
          <p className="text-gray-700 mb-4">
            Intermediate sprint before race entered its final kms.
            <br />
            <strong>How much will you sprint?</strong>
            <br />
            <span className="text-sm text-gray-600">One effort costs 1 TK (kort: 16)</span>
          </p>
          
          <div className="space-y-4 mb-6">
            {Object.entries(cards)
              .filter(([, r]) => r.team === 'Me' && !r.finished)
              .map(([name, rider]) => {
                const top4 = (rider.cards || []).slice(0, 4);
                const selectedValue = intermediateSprintSelections[name] || 0;
                
                return (
                  <div key={name} className="border rounded-lg p-4 bg-gray-50">
                    <div className="font-bold text-lg mb-2">{name}</div>
                    
                    {/* Show top 4 cards */}
                    <div className="flex gap-2 mb-3">
                      {top4.map((card, idx) => (
                        <div key={idx} className="bg-white border rounded px-2 py-1 text-sm">
                          {card.id.replace('kort: ', '')} ({card.flat}-{card.uphill})
                        </div>
                      ))}
                    </div>
                    
                    {/* Sprint effort buttons */}
                    <div className="flex gap-2">
                      <span className="text-sm font-medium mr-2 self-center">Effort:</span>
                      {[0, 1, 2].map(value => (
                        <button
                          key={value}
                          onClick={() => setIntermediateSprintSelections(prev => ({ ...prev, [name]: value }))}
                          className={`px-4 py-2 rounded font-semibold ${
                            selectedValue === value
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
          
          <button
            onClick={confirmIntermediateSprint}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold text-lg"
          >
            Confirm and Start Stage
          </button>
        </div>
      </div>
    )}
    
    {/* Intermediate Sprint Results Modal */}
    {intermediateSprintResults && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]"
        onClick={() => setIntermediateSprintResults(null)}
      >
        <div 
          className="bg-white rounded-lg shadow-xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-green-600">🏃 Intermediate Sprint Results</h2>
            <button 
              onClick={() => setIntermediateSprintResults(null)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2">
            {intermediateSprintResults.results.map((entry, idx) => {
              const isTop4 = idx < 4;
              const isTop2 = idx < 2;
              
              return (
                <div 
                  key={entry.name} 
                  className={`flex justify-between items-center border rounded-lg p-3 ${
                    isTop4 ? 'bg-green-50 border-green-300' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{idx + 1}.</span>
                      <span className={isPlayerTeam(entry.team) ? 'font-bold' : ''}>
                        {entry.name}
                      </span>
                      <span className="text-xs text-gray-500">({entry.team})</span>
                    </div>
                    <div className="text-xs text-gray-600 ml-6">
                      Score: {entry.intSprintPoint.toFixed(2)} • Effort: {entry.effort}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {entry.points > 0 && (
                      <div className="text-green-600 font-bold">
                        +{entry.points} pts
                      </div>
                    )}
                    {entry.timeBonus < 0 && (
                      <div className="text-yellow-600 font-semibold text-sm">
                        {entry.timeBonus}s GC
                      </div>
                    )}
                    {entry.prizeMoney > 0 && (
                      <div className="text-blue-600 font-bold text-sm">
                        ${entry.prizeMoney}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <button
            onClick={() => setIntermediateSprintResults(null)}
            className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold"
          >
            Continue Race
          </button>
        </div>
      </div>
    )}
    
    {/* Stages Modal */}
    {showStages && isStageRace && selectedStages.length > 0 && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={() => setShowStages(false)}
      >
        <div 
          className="bg-white rounded-lg shadow-xl p-6 max-w-3xl max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Stage Race Overview</h2>
            <button 
              onClick={() => setShowStages(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3">
            {selectedStages.map((stage, idx) => {
              const isCompleted = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isUpcoming = idx > currentStageIndex;
              
              return (
                <div 
                  key={idx} 
                  className={`border rounded-lg p-4 ${
                    isCurrent ? 'border-blue-500 bg-blue-50' : 
                    isCompleted ? 'border-green-500 bg-green-50' : 
                    'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">
                      Stage {idx + 1}: {stage.name}
                      {isCurrent && <span className="ml-2 text-sm text-blue-600">(Current)</span>}
                      {isCompleted && <span className="ml-2 text-sm text-green-600">✓ Completed</span>}
                      {isUpcoming && <span className="ml-2 text-sm text-gray-500">(Upcoming)</span>}
                    </h3>
                  </div>
                  
                  <div className="text-sm text-gray-700 space-y-1">
                    <div><strong>Distance:</strong> {stage.track.indexOf('F') !== -1 ? stage.track.indexOf('F') + 1 : stage.track.length} fields</div>
                    {stage.track.split('B').length - 1 > 0 && (
                      <div><strong>Sprint Points:</strong> {stage.track.split('B').length - 1} intermediate sprint(s)</div>
                    )}
                    <div className="mt-2">
                      <strong>Track Preview:</strong>
                      <div className="bg-white p-2 rounded mt-1 overflow-x-auto">
                        <div className="flex items-center">
                          {stage.track.split('').map((t, i) => {
                            if (t === '2') {
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
                                case 'B': return 'bg-green-400';
                                case '*': return 'bg-purple-400';
                                default: return 'bg-gray-300';
                              }
                            })();
                            return <div key={i} className={`${cls} min-w-[4px] h-4 mr-0.5`} title={`${i+1}: ${t}`} />;
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 text-sm text-gray-600 text-center">
            Total Stages: {selectedStages.length}
          </div>
        </div>
      </div>
    )}

    {/* Prize Money Modal */}
    {showPrizeMoney && (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[1100]" onClick={() => setShowPrizeMoney(false)}>
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowPrizeMoney(false)}
            className="absolute top-3 right-4 text-gray-500 hover:text-gray-700 text-2xl"
            aria-label="Close Prize Money Modal"
          >
            ×
          </button>
          <h2 className="text-2xl font-bold mb-4 text-blue-700">💰 Prize Money Rules</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-800 text-base">
            <li><strong>Stage Victory:</strong> $6,000 to the winner of each stage.</li>
            <li><strong>General Classification (GC):</strong>
              <ul className="list-disc pl-6">
                <li>1st place: $20,000</li>
                <li>2nd place: $12,000</li>
                <li>3rd place: $8,000</li>
              </ul>
            </li>
            <li><strong>Points Classification (Green Jersey):</strong> $5,000 to the overall points winner.</li>
            <li><strong>Intermediate Sprint:</strong> $500 to the winner of each intermediate sprint.</li>
            <li><strong>Other bonuses:</strong> Points and time bonuses are also awarded for sprints and stage results.</li>
          </ul>
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowPrizeMoney(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>

    )}
  </> 
  );
};

export default CyclingGame;
