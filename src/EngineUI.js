import React, { useState } from 'react';
import fixtures from './game/fixtures';
import { initializeFromFixture, stepGroup, runSprints, getState } from './game/engine';
import FixtureLoader from './components/FixtureLoader';
import RunnerPanel from './components/RunnerPanel';
import StartScreen from './components/StartScreen';
import './EngineUI.css';

// tiny deterministic RNG from seed (mulberry32)
function seededRngFromString(seedStr) {
  if (!seedStr) return Math.random;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  let state = h >>> 0;
  return function() {
    state += 0x6D2B79F5;
    let t = Math.imul((state ^ (state >>> 15)), (1 | state));
    t = t + Math.imul((t ^ (t >>> 7)), (61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function EngineUI() {
  const [fixtureKey, setFixtureKey] = useState(Object.keys(fixtures)[0] || null);
  const [state, setState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [rngSeed, setRngSeed] = useState('');
  const [rng, setRng] = useState(Math.random);
  const [showStartScreen, setShowStartScreen] = useState(false);

  const load = (key = fixtureKey, seed = rngSeed) => {
    if (!key) return;
    const r = seededRngFromString(seed || '');
    setRng(() => r);
    const s = initializeFromFixture(fixtures[key], r);
    setState(s);
    setLogs([`Loaded ${key} (seed:${seed || '<random>'})`]);
  };

  // Start a game from a StartScreen config object.
  const startFromScreen = (cfg = {}, quick = false, seed = rngSeed) => {
    const r = seededRngFromString(seed || '');
    setRng(() => r);

    // Try to pick an existing fixture heuristically
    let fixtureObj = null;
    const name = (cfg.trackName || '').toLowerCase();
    if (name.includes('sprint') || cfg.totalRiders <= 2) {
      fixtureObj = fixtures['sprint_fixture'];
    } else if (name.includes('break') || cfg.totalRiders <= 4) {
      fixtureObj = fixtures['breakaway_fixture'];
    }

    // Otherwise build a simple fixture object from the config
    if (!fixtureObj) {
      const total = cfg.totalRiders || (cfg.numberOfTeams || 3) * (cfg.ridersPerTeam || 3);
      const cards = {};
      for (let i = 0; i < total; i++) {
        const teamIdx = (cfg.numberOfTeams && cfg.ridersPerTeam) ? (Math.floor(i / (cfg.ridersPerTeam || 1)) + 1) : 1;
        const name = `Rider${i+1}`;
        cards[name] = {
          position: Math.max(1, total - i),
          group: 1,
          finished: false,
          move_distance_for_prel: 0,
          cards: [],
          discarded: [],
          prel_time: 10000,
          result: 1000,
          team: `Team${teamIdx}`,
        };
      }
      fixtureObj = { meta: { name: cfg.trackName || 'generated' }, track: cfg.track || '', round: 1, cards };
    }

    const s = initializeFromFixture(fixtureObj, r);
    setState(s);
    setLogs(l => [...l, `Started game: ${cfg.trackName || '<generated>'} (${cfg.totalRiders || 'unknown'} riders) seed:${seed || '<random>'}`]);
  };

  const step = () => {
    if (!state) return setLogs(l => [...l, 'no state']);
    const groups = Array.from(new Set(Object.values(state.cards).filter(r => !r.finished).map(r => r.group))).sort((a,b) => b-a);
    if (groups.length === 0) return setLogs(l => [...l, 'no groups']);
    const newState = stepGroup(state, groups[0], rng);
    setState(newState);
    if (newState.logs) setLogs(l => [...l, ...newState.logs]);
  };

  const sprint = () => {
    if (!state) return setLogs(l => [...l, 'no state']);
    const newState = runSprints(state, null, rng);
    setState(newState);
    if (newState.logs) setLogs(l => [...l, ...newState.logs]);
  };

  const handleSubmitMove = (groupNum, payload) => {
    if (!state) return;
    const cards = { ...state.cards };
    if (payload.type === 'attack') {
      const r = { ...cards[payload.attacker] };
      r.planned_card_id = payload.planned_card_id;
      r.selected_value = payload.selected_value;
      cards[payload.attacker] = r;
    } else if (payload.type === 'pace') {
      const leader = payload.leader;
      const r = { ...cards[leader] };
      r.selected_value = payload.paceValue;
      cards[leader] = r;
    }
    const newState = { ...state, cards };
    const resolved = stepGroup(newState, groupNum, rng);
    setState(resolved);
    if (resolved.logs) setLogs(l => [...l, ...resolved.logs]);
  };

  return (
    <div className="engine-ui">
      <div className="engine-ui__controls space-y-2 p-3 bg-white rounded shadow">
        <strong>Engine UI</strong>
        <div className="mt-1">
          <button onClick={() => setShowStartScreen(s => !s)} className="mr-2 px-2 py-1 bg-blue-500 text-white rounded">{showStartScreen ? 'Close' : 'Open'} Start Screen</button>
        </div>
        <FixtureLoader initial={fixtureKey} onLoad={(k, seed) => { setFixtureKey(k); setRngSeed(seed); load(k, seed); }} />
        <div className="flex items-center gap-2">
          <input placeholder="seed (optional)" value={rngSeed} onChange={e => setRngSeed(e.target.value)} className="w-44 border px-2 py-1 rounded" />
          <button onClick={() => load(fixtureKey, rngSeed)} className="px-2 py-1 bg-gray-200 rounded">Reload with seed</button>
        </div>
        <div className="flex gap-2">
          <button onClick={step} disabled={!state} className="px-2 py-1 bg-green-500 text-white rounded disabled:opacity-50">Step</button>
          <button onClick={sprint} disabled={!state} className="px-2 py-1 bg-purple-500 text-white rounded disabled:opacity-50">Sprint</button>
          <button onClick={() => { if (state) setLogs(l => [...l, JSON.stringify(getState(state).cards, null, 2)]); }} className="px-2 py-1 bg-gray-300 rounded">Dump Cards</button>
        </div>
      </div>

      <div className="engine-ui__main mt-3 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="engine-ui__logs col-span-1 bg-gray-50 p-2 rounded">
          <pre className="m-0 text-xs font-mono max-h-64 overflow-auto">{logs.slice().reverse().join('\n')}</pre>
        </div>
        <div className="engine-ui__state col-span-2 bg-white p-3 rounded shadow">
          <div className="mb-3">
            {showStartScreen ? (
              <StartScreen onStartGame={(cfg, quick) => {
                // initialize state from the StartScreen configuration
                startFromScreen(cfg, quick, rngSeed);
                setShowStartScreen(false);
              }} onQuickStart={(cfg) => {
                startFromScreen(cfg, true, rngSeed);
                setShowStartScreen(false);
              }} />
            ) : (state ? <RunnerPanel state={state} onSubmitMove={handleSubmitMove} /> : 'No state loaded')}
          </div>
          <pre className="m-0 text-xs font-mono max-h-96 overflow-auto">{state ? JSON.stringify(getState(state), null, 2) : 'No state loaded'}</pre>
        </div>
      </div>
    </div>
  );
}
