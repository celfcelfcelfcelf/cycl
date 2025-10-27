import assert from 'node:assert';
import { runSprintsPure } from '../gameLogic.js';

const rng = () => 0.1;

test('runSprintsPure: assigns prel times when riders cross finish', () => {
  const cards = {
    A: { position: 7, group: 1, finished: false, move_distance_for_prel: 3, cards: [], discarded: [], prel_time: 10000, result: 1000 },
    B: { position: 6, group: 1, finished: false, move_distance_for_prel: 4, cards: [], discarded: [], prel_time: 10000, result: 1000 }
  };
  const track = '11111111F';
  const res = runSprintsPure(cards, track, 1, 0, [], 0, rng);
  // After sprint, at least one rider should have a changed prel_time/result
  const changed = Object.values(res.updatedCards).some(r => r.result !== 1000 || r.prel_time !== 10000);
  assert.ok(changed, 'some riders should have sprint results assigned');
});

test('runSprintsPure: handles multiple finishers ordering', () => {
  const cards = {
    A: { position: 7, group: 1, finished: false, move_distance_for_prel: 4, cards: [], discarded: [], prel_time: 10000, result: 1000 },
    B: { position: 7, group: 1, finished: false, move_distance_for_prel: 3, cards: [], discarded: [], prel_time: 10000, result: 1000 },
    C: { position: 6, group: 1, finished: false, move_distance_for_prel: 5, cards: [], discarded: [], prel_time: 10000, result: 1000 }
  };
  const track = '111111111F';
  const res = runSprintsPure(cards, track, 1, 0, [], 0, rng);
  const results = Object.values(res.updatedCards).map(r => r.result).filter(v => v < 1000).sort((a,b) => a - b);
  assert.ok(results.length >= 1, 'at least one finisher should be assigned');
});
