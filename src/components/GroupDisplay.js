import React from 'react';
import HumanTurnInterface from './HumanTurnInterface';
import { convertToSeconds } from '../game/gameLogic';

export default function GroupDisplay({ groupNum, cards = {}, onSubmitMove, teamColors = {}, teamTextColors = {} }) {
  const entries = Object.entries(cards).filter(([, r]) => r.group === groupNum && !r.finished).sort((a,b) => b[1].position - a[1].position);
  const hasHuman = entries.some(([, r]) => r.team === 'Me');

  // map a team name to a deterministic readable HSL color for text
  const teamColorFromName = (team) => {
    if (!team) return '#111';
    // simple hash
    let h = 0;
    for (let i = 0; i < team.length; i++) h = (h * 31 + team.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return `hsl(${hue} 70% 40%)`;
  };

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

  // compute overall max position across all (non-finished) riders
  const allPositions = Object.values(cards).filter(r => !r.finished && typeof r.position === 'number').map(r => r.position);
  const overallMax = allPositions.length ? Math.max(...allPositions) : 0;
  const groupFrontPos = entries.length ? Math.max(...entries.map(([, r]) => r.position)) : 0;
  const fieldsToFront = Math.max(0, overallMax - groupFrontPos);
  const timeSeconds = 13 * fieldsToFront;
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
