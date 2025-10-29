import { runSprintsPure } from '../gameLogic.js';

// This test acts as a runnable fixture to exercise runSprintsPure with a Streamlit-like input.
// It prints logs and final result to stdout so we can inspect behavior.

test('fixture: runSprintsPure with representative Streamlit-like state', () => {
  const rng = () => 0.1; // deterministic RNG for reproducibility

  // Build a small cards object inspired by the Streamlit structure.
  // Use the JS shape expected by gameLogic: { id, flat, uphill } for cards
  const cards = {
    Alice: {
      position: 8, // at or beyond finish
      old_position: 6,
      group: 1,
      finished: false,
      move_distance_for_prel: 3,
      last_group_speed: 4,
      cards: [
        { id: 'kort: 1', flat: 6, uphill: 4 },
        { id: 'kort: 2', flat: 5, uphill: 5 },
        { id: 'kort: 3', flat: 4, uphill: 6 },
        { id: 'kort: 4', flat: 3, uphill: 3 },
        { id: 'kort: 5', flat: 2, uphill: 2 }
      ],
      discarded: [],
      sprint: 8,
      prel_time: 10000,
      ranking: 0,
      team: 'Me'
    },
    Bob: {
      position: 8,
      old_position: 5,
      group: 1,
      finished: false,
      move_distance_for_prel: 4,
      last_group_speed: 5,
      cards: [
        { id: 'kort: 6', flat: 7, uphill: 3 },
        { id: 'kort: 7', flat: 5, uphill: 4 },
        { id: 'kort: 8', flat: 4, uphill: 5 },
        { id: 'kort: 9', flat: 3, uphill: 2 },
      ],
      discarded: [],
      sprint: 6,
      prel_time: 10000,
      ranking: 0,
      team: 'Comp1'
    },
    Carol: {
      position: 7,
      old_position: 4,
      group: 1,
      finished: false,
      move_distance_for_prel: 5,
      last_group_speed: 6,
      cards: [
        { id: 'kort: 10', flat: 6, uphill: 6 },
        { id: 'kort: 11', flat: 5, uphill: 5 },
        { id: 'kort: 12', flat: 4, uphill: 4 },
        { id: 'kort: 13', flat: 3, uphill: 3 }
      ],
      discarded: [],
      sprint: 10,
      prel_time: 10000,
      ranking: 0,
      team: 'Comp2'
    }
  };

  const track = '11111111F';
  const round = 0;
  const sprintGroup = 1;

  const res = runSprintsPure(cards, track, sprintGroup, round, [], 0, rng);

  console.log('\n=== runSprintsPure fixture output ===');
  console.log('logs:');
  res.logs.forEach(l => console.log(l));
  console.log('results:');
  console.log(res.result);
  console.log('updatedCards summary:');
  for (const [name, c] of Object.entries(res.updatedCards)) {
    console.log(name, { position: c.position, prel_time: c.prel_time, ranking: c.ranking, finished: c.finished });
  }

  // Basic assertions: should have assigned result entries and marked some finished
  expect(Array.isArray(res.result)).toBe(true);
  const finishedCount = Object.values(res.updatedCards).filter(r => r.finished).length;
  expect(finishedCount).toBeGreaterThanOrEqual(1);
});
