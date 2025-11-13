import React from 'react';

export default function RiderCard({ name, rider, onPickCard, teamColor = null, textColor = null }) {
  const wrapperStyle = {
    backgroundColor: teamColor || 'white',
    color: textColor || 'black'
  };

  const cardBtnBase = {
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
        {(() => {
          const cards = (rider.cards || []).slice(0,4);
          const isSpecialId = (id) => {
            if (!id) return false;
            try { return id === '99' || id.startsWith('99') || id.startsWith('TK-1'); } catch (e) { return false; }
          };
          const hasTK1 = cards.some(c => c && c.id && isSpecialId(c.id));
          return cards.map((c, i) => {
            const isTK = c && c.id && isSpecialId(c.id);
            const cardStyle = {
              ...cardBtnBase,
              borderColor: isTK ? 'red' : undefined,
              backgroundColor: isTK ? 'rgba(255,230,230,0.95)' : cardBtnBase.backgroundColor,
              color: isTK ? 'darkred' : cardBtnBase.color,
            };
            const numbersStyle = { color: hasTK1 ? 'red' : undefined };

            return (
              <button key={i} onClick={() => onPickCard && onPickCard(name, c)} style={cardStyle} className="p-1 text-xs rounded border" title={`${c.flat}|${c.uphill}`}>
                <div className="font-semibold">{c.id}</div>
                <div className="text-[10px]" style={numbersStyle}>{c.flat}|{c.uphill}</div>
              </button>
            );
          });
        })()}
      </div>
    </div>
  );
}
