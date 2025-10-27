import React from 'react';
import HumanTurnInterface from './HumanTurnInterface';
import RiderCard from './RiderCard';

export default function GroupDisplay({ groupNum, cards = {}, onSubmitMove, teamColors = {}, teamTextColors = {} }) {
  const entries = Object.entries(cards).filter(([, r]) => r.group === groupNum && !r.finished).sort((a,b) => b[1].position - a[1].position);
  const hasHuman = entries.some(([, r]) => r.team === 'Me');

  // build a compact map of riders in this group for the human UI
  const groupRiders = entries.reduce((acc, [name, r]) => { acc[name] = r; return acc; }, {});

  function handleSubmit(g, choice) {
    if (choice.type === 'attack') {
      const { attacker, card } = choice;
      const payload = { type: 'attack', attacker, planned_card_id: card.id, selected_value: card.flat };
      onSubmitMove && onSubmitMove(g, payload);
    } else if (choice.type === 'pace') {
      const { leader, paceValue } = choice;
      const payload = { type: 'pace', leader, paceValue };
      onSubmitMove && onSubmitMove(g, payload);
    }
  }

  return (
    <div className="border border-gray-200 p-2 rounded">
      <div className="font-bold">Group {groupNum} - pos {entries.length ? Math.max(...entries.map(([,r])=>r.position)) : 0}</div>
      <div className="flex gap-2 mt-2">
        {entries.map(([name, r]) => (
          <div key={name} className="p-1">
            <RiderCard name={name} rider={r} teamColor={teamColors[r.team]} textColor={teamTextColors[r.team]} />
          </div>
        ))}
      </div>
      {hasHuman && <div className="mt-2">
        <HumanTurnInterface groupRiders={groupRiders} groupNum={groupNum} onSubmit={handleSubmit} />
      </div>}
    </div>
  );
}
