import React from 'react';

export default function RiderCard({ name, rider, onPickCard, teamColor = null, textColor = null }) {
  const wrapperStyle = {
    backgroundColor: teamColor || 'white',
    color: textColor || 'black'
  };

  const cardBtnStyle = {
    backgroundColor: 'rgba(255,255,255,0.85)',
    color: '#111'
  };

  return (
    <div style={wrapperStyle} className="border border-gray-100 p-2 rounded w-48">
      <div className="font-bold">
        <span style={{ color: textColor || 'black' }}>{name}</span>
        <span style={{ fontSize: '0.75rem', marginLeft: 6, color: textColor || 'black' }}>({rider.team})</span>
      </div>
      <div className="text-sm" style={{ color: textColor || 'black' }}>
        pos: {rider.position} sv: {rider.sprint}
      </div>
      {typeof rider.win_chance === 'number' && (
        <div className="text-xs mt-1" style={{ color: textColor || 'black' }}>win_chance: {Number(rider.win_chance).toFixed(1)}</div>
      )}
      <div className="flex gap-2 mt-2">
        {(rider.cards || []).slice(0,4).map((c,i) => (
          <button key={i} onClick={() => onPickCard && onPickCard(name, c)} style={cardBtnStyle} className="p-1 text-xs rounded border" title={`${c.flat}|${c.uphill}`}>
            <div className="font-semibold">{c.id}</div>
            <div className="text-[10px]">{c.flat}|{c.uphill}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
