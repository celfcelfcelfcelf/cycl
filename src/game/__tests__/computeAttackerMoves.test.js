// using Jest's test() API
import assert from 'node:assert';
import { computeAttackerMoves } from '../gameLogic.js';

// Simple deterministic RNG
const rng = () => 0.42;

test('computeAttackerMoves: plays human-declared attack_card and updates position', () => {
  const cards = {
    Attacker: {
      position: 0,
      cards: [{ id: 'kort: 8', flat: 8, uphill: 6 }, { id: 'kort: 7', flat: 7, uphill: 5 }],
      discarded: [],
      group: 1,
      attacking_status: 'attacker',
      attack_card: { id: 'kort: 8', flat: 8, uphill: 6 },
      planned_card_id: undefined,
      fatigue: 0
    },
    Teammate: {
      position: 0,
      cards: [{ id: 'kort: 5', flat: 5, uphill: 4 }],
      discarded: [],
      group: 1,
      attacking_status: 'no',
      planned_card_id: undefined,
      fatigue: 0
    }
  };

  const res = computeAttackerMoves(cards, 1, 5, 0, '11111F', rng);
  assert.ok(res.updatedCards.Attacker.position > 0, 'attacker moved forward');
  assert.ok(res.logs.length > 0, 'logs produced');
});

test('computeAttackerMoves: uses planned_card_id for AI attacker', () => {
  const cards = {
    AI: {
      position: 2,
      cards: [{ id: 'kort: 6', flat: 6, uphill: 5 }, { id: 'kort: 9', flat: 9, uphill: 7 }],
      discarded: [],
      group: 1,
      attacking_status: 'attacker',
      planned_card_id: 'kort: 9',
      fatigue: 0
    }
  };

  const res = computeAttackerMoves(cards, 1, 4, 0, '11111F', rng);
  assert.strictEqual(res.updatedCards.AI.played_card, 'kort: 9');
});

test('computeAttackerMoves: leader +1 denied near finish', () => {
  // leader would reach finish without extra, so extra should be denied
  const cards = {
    L: {
      position: 3,
      cards: [{ id: 'kort: 5', flat: 5, uphill: 4 }],
      discarded: [],
      group: 1,
      attacking_status: 'attacker',
      planned_card_id: 'kort: 5',
      fatigue: 0
    }
  };
  // track finish at index 8 (positions 0..8 -> F at 8)
  const res = computeAttackerMoves(cards, 1, 5, 0, '11111111F', rng);
  // ensure no extra beyond intended: moved_fields should equal card flat minus penalties
  const moved = res.updatedCards.L.moved_fields || 0;
  assert.ok(moved <= 5, 'leader extra not applied to reach finish');
});

test('computeAttackerMoves: prefer non-TK top-4 card over TK-1 for matching numeric', () => {
  const cards = {
    P: {
      position: 0,
      cards: [
        { id: 'TK-1: 99', flat: -1, uphill: -1 },
        { id: 'kort: 4', flat: 4, uphill: 3 },
        { id: 'kort: 3', flat: 3, uphill: 2 }
      ],
      discarded: [],
      group: 1,
      attacking_status: 'attacker',
      planned_card_id: undefined,
      attack_card: undefined,
      selected_value: 4,
      fatigue: 0
    }
  };
  const res = computeAttackerMoves(cards, 1, 4, 0, '11111F', rng);
  // ensure played_card is not TK-1
  assert.ok(!String(res.updatedCards.P.played_card).startsWith('TK-1'), 'should prefer non-TK card');
});
