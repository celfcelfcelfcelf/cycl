import React, { useState, useEffect } from 'react';

// Mobile-first DraftSelection component
// Props:
// - teams: ordered array of team names (['Me','Comp1',...])
// - currentPickerIndex: starting index in teams array
// - onPick(team, value): callback when a team picks a rider (or auto-pick)
// - autoPickFn(team): optional function to compute auto-pick value for AI teams
// - picksRemaining: number of picks remaining
// - visible: boolean to show/hide

const DraftSelection = ({ teams = [], initialIndex = 0, onPick = () => {}, autoPickFn = null, picksRemaining = 1, visible = true }) => {
  const [index, setIndex] = useState(initialIndex);
  const [localMsg, setLocalMsg] = useState('');

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (!visible) return;
    // If current team is AI and autoPickFn is provided, auto-pick after a short delay
    const team = teams[index];
    if (team && team !== 'Me' && typeof autoPickFn === 'function') {
      const t = setTimeout(() => {
        const val = autoPickFn(team);
        setLocalMsg(`${team} auto-picked ${val}`);
        onPick(team, val);
        setIndex((idx) => (idx + 1) % teams.length);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [index, teams, autoPickFn, visible, onPick]);

  if (!visible) return null;

  const team = teams[index] || 'Me';

  const handleManualPick = (value) => {
    onPick(team, value);
    setLocalMsg(`You picked ${value}`);
    setIndex((idx) => (idx + 1) % teams.length);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 shadow-lg z-40">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Draft — current: <span className="font-bold">{team}</span></div>
        <div className="text-xs text-gray-500">Picks remaining: {picksRemaining}</div>
      </div>

      <div className="flex gap-2 overflow-x-auto mb-3">
        {teams.map((t, i) => (
          <div key={t} className={`px-3 py-1 rounded ${i === index ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
            {t}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2 mb-2">
        {[8,7,6,5,4,3,2].map((v, i) => (
          <button key={v} onClick={() => handleManualPick(v)} className="p-2 bg-green-200 rounded text-sm">{v}</button>
        ))}
      </div>

      <div className="text-xs text-gray-600">{localMsg}</div>
    </div>
  );
};

export default DraftSelection;
