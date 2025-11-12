import React, { useState } from 'react';
import CardHand from './CardHand';
import RiderCard from './RiderCard';

export default function HumanTurnInterface({ groupRiders = {}, groupNum, onSubmit }) {
  const names = Object.keys(groupRiders);
  const riderCount = names.length;
  const canAttack = riderCount >= 3;
  const [mode, setMode] = useState('pace'); // 'pace' or 'attack'
  const [attacker, setAttacker] = useState(names[0] || null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [leader, setLeader] = useState(names[0] || null);
  const [paceValue, setPaceValue] = useState(1);
  const [touched, setTouched] = useState(false);

  function valid() {
    if (mode === 'attack') {
      return Boolean(attacker && selectedCard);
    }
    return Boolean(leader && paceValue !== null && paceValue !== undefined && paceValue !== '');
  }

  function submit() {
    setTouched(true);
    if (!valid()) return;
    if (mode === 'attack') {
      const choice = { type: 'attack', attacker, card: selectedCard };
      onSubmit && onSubmit(groupNum, choice);
    } else {
      const choice = { type: 'pace', leader, paceValue: Number(paceValue) || 1 };
      onSubmit && onSubmit(groupNum, choice);
    }
  }

  return (
    <div className="border-dashed border-gray-300 p-3 rounded mt-2 bg-gray-50">
      <div className="mb-2">
        <label className="mr-3"><input className="mr-1" type="radio" checked={mode==='pace'} onChange={() => { setMode('pace'); setTouched(false); }} /> Pace</label>
        <label>
          <input
            className="mr-1"
            type="radio"
            checked={mode==='attack'}
            onChange={() => { if (canAttack) { setMode('attack'); setTouched(false); } }}
            disabled={!canAttack}
          />
          Attack
        </label>
        {!canAttack && <span className="text-xs text-gray-500 ml-2">(angreb kræver mindst 3 ryttere i gruppen)</span>}
      </div>

      {mode === 'pace' ? (
        <div>
          <div className="mb-2">
            <label className="mr-2">Leader: </label>
            <select value={leader} onChange={e => setLeader(e.target.value)} className="p-1 border rounded">
              {names.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="mr-2">Pace value: </label>
            <input type="number" value={paceValue} min={0} max={10} onChange={e => setPaceValue(e.target.value)} className="w-20 p-1 border rounded" />
          </div>
          {touched && !valid() && <div className="text-red-600 mt-2">Please choose a leader and pace value.</div>}
        </div>
      ) : (
        <div>
          <div className="flex gap-2 flex-wrap">
            {names.map(n => (
              <div key={n} onClick={() => { setAttacker(n); setTouched(false); }} className={`${attacker===n ? 'border-2 border-blue-500' : 'border'} p-2 rounded cursor-pointer w-56`}>
                <RiderCard name={n} rider={groupRiders[n]} onPickCard={(name, card) => { setAttacker(name); setSelectedCard(card); setTouched(false); }} />
              </div>
            ))}
          </div>

          <div className="mt-2">
            <div className="mb-2">Selected card: {selectedCard ? selectedCard.id : 'none'}</div>
            <div>
              <CardHand cards={groupRiders[attacker]?.cards || []} onSelect={(c) => { setSelectedCard(c); setTouched(false); }} />
            </div>
            {touched && !valid() && <div className="text-red-600 mt-2">Pick an attacker and a card to attack.</div>}
          </div>
        </div>
      )}

      <div className="mt-3">
        <button onClick={submit} disabled={!valid()} className={`px-3 py-1 rounded ${valid() ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>Submit</button>
      </div>
    </div>
  );
}
