import React, { useState } from 'react';

const tracks = {
  'Liege-Bastogne-Liege': '3311111___333333333111333333333300000_3333333333333311133333333333333FFFFFFFFF',
  'World Championship 2019 (Yorkshire)': '33333333333311333333333333331133333333333333113333333333333311333333FFFFFFFFF',
  'FlandernRundt': '3333330033333311332233333333333330033333333331113333330033333333333FFFFFFFFFFFFFFB',
  'BrostensTest': '3333330033333311332233333333333330033333333331113333330033333333333FFFFFFFFFFFFFF*'
};

function TrackVisualization({ track, trackName }) {
  const cells = track.split('');

  return (
    <div className="bg-white rounded p-3 shadow mb-3">
      <h3 className="m-0 mb-2 text-base font-semibold">{trackName}</h3>
      {/* Preview row: colored fields above the track (larger for visibility) */}
      <div className="flex overflow-x-auto pb-1">
        {cells.map((t, i) => {
          if (t === '2') {
            return (
              <div key={`preview-${i}`} title={`${i+1}: ${t}`} className="min-w-[8px] h-8 mr-1 flex" aria-label={`preview-${i+1}-${t}`}>
                <div className="flex-1 bg-gray-400" />
                <div className="flex-1 bg-red-500" />
              </div>
            );
          }

          const singleClass = (() => {
            switch (t) {
              case '3': return 'bg-gray-400';
              case '1': return 'bg-red-500';
              case '0': return 'bg-pink-300';
              case 'F': return 'bg-yellow-400';
              default: return 'bg-gray-300';
            }
          })();

          return <div key={`preview-${i}`} title={`${i+1}: ${t}`} className={`${singleClass} min-w-[8px] h-8 mr-1`} aria-label={`preview-${i+1}-${t}`} />;
        })}
      </div>

      {/* Legend for colors */}
      <div className="flex items-center gap-4 text-sm text-gray-700 mb-2">
        <div className="flex items-center gap-1"><span className="w-4 h-4 bg-gray-400 inline-block rounded" /> 3 (gravel)</div>
        <div className="flex items-center gap-1"><span className="w-4 h-4 bg-red-500 inline-block rounded" /> 1 (hard)</div>
        <div className="flex items-center gap-1"><span className="w-4 h-4 bg-pink-300 inline-block rounded" /> 0 (soft)</div>
        <div className="flex items-center gap-1"><span className="w-4 h-4 bg-yellow-400 inline-block rounded" /> F (finish)</div>
        <div className="flex items-center gap-1">2 (mixed): <span className="w-6 h-4 inline-block mr-1 align-middle"><span className="inline-block w-3 h-4 bg-gray-400 align-middle" /><span className="inline-block w-3 h-4 bg-red-500 align-middle" /></span></div>
      </div>

      <div className="flex overflow-x-auto py-1">
        {cells.map((t, i) => {
          // Value color mapping requested:
          // 3: gray, 2: gray/red (split), 1: red, 0: light pink, F: yellow
          if (t === '2') {
            return (
              <div key={i} title={`${i+1}: ${t}`} className="min-w-[6px] h-4 mr-1 flex" aria-label={`track-${i+1}-${t}`}>
                <div className="flex-1 bg-gray-400" />
                <div className="flex-1 bg-red-500" />
              </div>
            );
          }

          const singleClass = (() => {
            switch (t) {
              case '3': return 'bg-gray-400';
              case '1': return 'bg-red-500';
              case '0': return 'bg-pink-300';
              case 'F': return 'bg-yellow-400';
              default: return 'bg-gray-300';
            }
          })();

          return <div key={i} title={`${i+1}: ${t}`} className={`${singleClass} min-w-[6px] h-4 mr-1`} aria-label={`track-${i+1}-${t}`} />;
        })}
      </div>
      <div className="text-sm text-gray-600 mt-2">Length: {track.indexOf('F')} fields</div>
    </div>
  );
}

export default function StartScreen({ onStartGame, onQuickStart }) {
  const [selectedTrack, setSelectedTrack] = useState(Object.keys(tracks)[0]);
  const [numberOfTeams, setNumberOfTeams] = useState(3);
  const [ridersPerTeam, setRidersPerTeam] = useState(3);

  function handleStart() {
    const cfg = {
      track: tracks[selectedTrack],
      trackName: selectedTrack,
      numberOfTeams,
      ridersPerTeam,
      totalRiders: numberOfTeams * ridersPerTeam
    };
    onStartGame && onStartGame(cfg);
  }

  function handleQuick() {
    const quickCfg = {
      track: tracks[selectedTrack],
      trackName: selectedTrack,
      numberOfTeams: 3,
      ridersPerTeam: 3,
      totalRiders: 9
    };
    onQuickStart ? onQuickStart(quickCfg) : onStartGame && onStartGame(quickCfg, true);
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl p-6 shadow">
        <h1 className="text-center text-xl font-semibold mb-4">Cycling Game Setup</h1>

  <div className="flex flex-col md:flex-row md:gap-4 gap-3 mb-4">
          <div className="flex-1">
            <label className="block font-semibold mb-2">Choose track</label>
            <select value={selectedTrack} onChange={e => setSelectedTrack(e.target.value)} className="w-full p-2 border rounded">
              {Object.keys(tracks).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="w-40">
            <label className="block font-semibold mb-2">Teams</label>
            <select value={numberOfTeams} onChange={e => setNumberOfTeams(Number(e.target.value))} className="w-full p-2 border rounded">
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>

          <div className="w-40">
            <label className="block font-semibold mb-2">Riders / team</label>
            <select value={ridersPerTeam} onChange={e => setRidersPerTeam(Number(e.target.value))} className="w-full p-2 border rounded">
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
        </div>
        {/* Show visualization for the currently selected track under the controls */}
        <TrackVisualization track={tracks[selectedTrack]} trackName={selectedTrack} />

        <div className="flex gap-3 justify-center mt-3">
          <button onClick={handleStart} className="px-4 py-2 bg-blue-600 text-white rounded">Start Game</button>
          <button onClick={handleQuick} className="px-4 py-2 bg-emerald-500 text-white rounded">Quick Start</button>
        </div>
      </div>
    </div>
  );
}
