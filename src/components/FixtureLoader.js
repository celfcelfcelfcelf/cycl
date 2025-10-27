import React, { useState } from 'react';
import fixtures from '../game/fixtures';

export default function FixtureLoader({ initial = Object.keys(fixtures)[0], onLoad }) {
  const [key, setKey] = useState(initial);
  const [seed, setSeed] = useState('');

  return (
    <div className="flex gap-2 items-center">
      <select value={key} onChange={e => setKey(e.target.value)} className="p-1 border rounded">
        {Object.keys(fixtures).map(k => <option key={k} value={k}>{k}</option>)}
      </select>
      <input placeholder="seed (optional)" value={seed} onChange={e => setSeed(e.target.value)} className="w-40 p-1 border rounded" />
      <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => onLoad && onLoad(key, seed)}>Load</button>
    </div>
  );
}
