import React from 'react';

export default function CardHand({ cards = [], onSelect }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {cards.map((c, idx) => (
        <div key={idx} className="border border-gray-300 p-2 rounded">
          <div className="text-sm font-semibold">{c.id}</div>
          <div className="text-xs">{c.flat} / {c.uphill}</div>
          <button className="mt-2 px-2 py-1 bg-gray-200 rounded" onClick={() => onSelect && onSelect(c)}>Select</button>
        </div>
      ))}
    </div>
  );
}
