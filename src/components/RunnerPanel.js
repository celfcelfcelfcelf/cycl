import React from 'react';
import GroupDisplay from './GroupDisplay';

export default function RunnerPanel({ state, onSubmitMove }) {
  if (!state) return null;

  const groups = Array.from(new Set(Object.values(state.cards).filter(r => !r.finished).map(r => r.group))).sort((a,b) => a - b);

  return (
    <div className="flex flex-col gap-3">
      {groups.map(g => (
        <GroupDisplay key={g} groupNum={g} cards={state.cards} onSubmitMove={onSubmitMove} />
      ))}
    </div>
  );
}
