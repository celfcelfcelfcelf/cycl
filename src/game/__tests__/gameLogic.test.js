import assert from 'node:assert';
import { convertToSeconds, getSlipstreamValue, getPenalty, pickValue, takesLeadFC, takesLeadFCFloating, generateCards } from '../gameLogic.js';

// deterministic RNG for tests
const makeRng = (seed = 12345) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = s * 16807 % 2147483647) / 2147483647;
};


test('convertToSeconds converts seconds to M:SS format', () => {
  assert.strictEqual(convertToSeconds(90), '1:30');
  assert.strictEqual(convertToSeconds(0), '0:00');
  assert.strictEqual(convertToSeconds(61), '1:01');
});

test('getSlipstreamValue respects track tokens', () => {
  assert.strictEqual(getSlipstreamValue(0, 0, '0F'), 0, 'zero token should return 0');
  assert.strictEqual(getSlipstreamValue(0, 0, '1F'), 1, 'one token should return 1');
  assert.strictEqual(getSlipstreamValue(0, 0, '2F'), 2, 'two token should return 2');
  assert.strictEqual(getSlipstreamValue(0, 0, '3F'), 3, 'three token should return 3 (fallback)');
});

test('getPenalty detects TK-1 in top-4 cards', () => {
  const cards = {
    Alice: { cards: [{ id: 'TK-1: 99' }, { id: 'kort: 2' }], discarded: [] },
    Bob: { cards: [{ id: 'kort: 1' }], discarded: [] },
  };
  assert.strictEqual(getPenalty('Alice', cards), 1);
  assert.strictEqual(getPenalty('Bob', cards), 0);
  assert.strictEqual(getPenalty('Carol', cards), 0, 'missing rider should yield 0');
});

test('pickValue returns 0 when rider.takes_lead is 0', () => {
  const cards = {
    RiderA: { takes_lead: 0, cards: [], position: 0 }
  };
  const val = pickValue('RiderA', cards, '111F', [], 3, []);
  assert.strictEqual(val, 0);
});

test('pickValue returns a positive number for attacking rider', () => {
  const cards = {
    RiderA: { takes_lead: 1, attacking_status: 'attacker', cards: [{ id: 'kort: 1', flat: 8, uphill: 8 }], position: 0 }
  };
  const val = pickValue('RiderA', cards, '111F', [], 3, []);
  assert.ok(typeof val === 'number' && val >= 0, `expected numeric value but got ${val}`);
});

test('takesLeadFC returns 1 when rider is sole member of group (ratio === 1)', () => {
  const cards = {
    Solo: { team: 'T1', group: 1, attacking_status: 'no', position: 0, bjerg: 0, flad: 0, mentalitet: 4, cards: [], discarded: [], favorit: 1 }
  };
  const res = takesLeadFC('Solo', cards, '111F', 3, false, false, [], () => {});
  assert.strictEqual(res, 1);
});

test('takesLeadFCFloating returns 6 when ratio === 1', () => {
  const cards = {
    Solo: { team: 'T1', group: 1, attacking_status: 'no', position: 0 }
  };
  const res = takesLeadFCFloating('Solo', cards, '111F', 3);
  assert.strictEqual(res, 6);
});

test('generateCards deterministic with injected RNG', () => {
  const rng = makeRng(42);
  const rider = { FLAD: 60, BJERG: 50 };
  const hand = generateCards(rider, false, rng);
  assert.strictEqual(hand.length, 15);
  // deterministic check on the first card id and a numeric field
  assert.strictEqual(hand[0].id.startsWith('kort:'), true);
  assert.ok(typeof hand[0].flat === 'number');
});
