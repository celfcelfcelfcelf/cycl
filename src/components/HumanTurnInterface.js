import React, { useState, useRef, useEffect } from 'react';
import CardHand from './CardHand';
import RiderCard from './RiderCard';

export default function HumanTurnInterface({ groupRiders = {}, riders = null, groupNum, onSubmit, totalGroupCount = null }) {
  // Accept either `groupRiders` (object map) or `riders` (array of [name, rider])
  const groupRidersObj = (groupRiders && Object.keys(groupRiders).length > 0)
    ? groupRiders
    : (Array.isArray(riders) ? riders.reduce((acc, [n, r]) => { acc[n] = r; return acc; }, {}) : {});
  const names = Object.keys(groupRidersObj);
  const riderCount = names.length;
  // Prefer an explicit totalGroupCount prop when provided (caller can pass
  // the full group size). Otherwise fall back to the number of entries in
  // the provided groupRiders (which may be only human riders in some call
  // sites). Attack is allowed when the total group has at least 3 riders.
  const effectiveTotalCount = (typeof totalGroupCount === 'number') ? totalGroupCount : riderCount;
  const canAttack = effectiveTotalCount >= 3;
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    };
  }, []);
  const [mode, setMode] = useState('pace'); // 'pace' or 'attack'
  const [attacker, setAttacker] = useState(names[0] || null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [leader, setLeader] = useState(names[0] || null);
  const [paceValue, setPaceValue] = useState(1);
  const [touched, setTouched] = useState(false);

  function valid() {
    if (mode === 'attack') {
      return Boolean(canAttack && attacker && selectedCard);
    }
    return Boolean(leader && paceValue !== null && paceValue !== undefined && paceValue !== '');
  }

  function submit() {
    setTouched(true);
    if (!valid()) return;
    if (mode === 'attack') {
      const choice = { type: 'attack', attacker, card: selectedCard };
      if (onSubmit) {
        if (onSubmit.length >= 2) onSubmit(groupNum, choice); else onSubmit(choice);
      }
    } else {
      const choice = { type: 'pace', leader, paceValue: Number(paceValue) || 1 };
      if (onSubmit) {
        if (onSubmit.length >= 2) onSubmit(groupNum, choice); else onSubmit(choice);
      }
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
        {!canAttack && (
          <span className="relative inline-block ml-2">
            <button
              type="button"
              aria-label="info: attack requires at least 3 riders"
              title="Angreb kræver mindst 3 ryttere i gruppen"
              className="text-xs text-gray-500 underline"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              onTouchStart={() => {
                setShowTooltip(true);
                if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
                tooltipTimeoutRef.current = setTimeout(() => setShowTooltip(false), 2200);
              }}
              onClick={() => setShowTooltip(s => !s)}
            >
              (angreb kræver mindst 3 ryttere i gruppen)
            </button>
            {showTooltip && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-50">
                Angrib kun når gruppen har mindst 3 ryttere — ellers ignoreres angrebet automatisk.
              </div>
            )}
          </span>
        )}
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
