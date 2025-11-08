import React from 'react';
import HumanTurnInterface from './HumanTurnInterface';
import { convertToSeconds } from '../game/gameLogic';

export default function GroupDisplay({ groupNum, cards = {}, onSubmitMove, teamColors = {}, teamTextColors = {}, groupTimeGaps = {} }) {
  const entries = Object.entries(cards).filter(([, r]) => r.group === groupNum && !r.finished).sort((a,b) => b[1].position - a[1].position);
  const hasHuman = entries.some(([, r]) => r.team === 'Me');

  // (removed unused teamColorFromName helper) kept compact and focused for the
  // Group display; if a team color mapping is needed later we can reintroduce
  // a small helper or use the passed-in `teamColors` prop.

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

  // Only show a precomputed time gap provided by the app. This ensures the
  // parenthetical time is updated only when the app explicitly sets
  // `groupTimeGaps` (for example at the start of a round or after pressing
  // "Move Group"). If no value exists, show 0:00.
  const timeSeconds = (groupTimeGaps && typeof groupTimeGaps[groupNum] === 'number')
    ? groupTimeGaps[groupNum]
    : 0;
  const timeStr = convertToSeconds(timeSeconds);

  return (
    <div className="border border-gray-200 p-2 rounded">
      <div className="font-bold">Group {groupNum} ({timeStr}):</div>
      {/* Group member list and per-rider cards removed. */}
      {hasHuman && <div className="mt-2">
        <HumanTurnInterface groupRiders={groupRiders} groupNum={groupNum} onSubmit={handleSubmit} />
      </div>}
    </div>
  );
}
