import { initializeFromFixture, stepGroup } from '../../game/engine.js';

// Deterministic RNG for tie-breaking
const rng = () => 0.1;

describe('Brosten capacity enforcement', () => {
  test('pushes back overflow riders on 0 token (33%)', () => {
  // Build a tiny fixture: track where pos 5 is '0' and pos 7 is also '0' (riders will move to pos7)
  const track = '33333030F*'; // pos 5 == '0', pos 7 == '0'

    // Create 6 riders total (peloton=6). Four riders (A,B,C,D) in group 1 are on pos 5.
    const cards = {
      A: { position: 5, group: 1, team: 'T1', finished: false, cards: [] , takes_lead: 1, last_group_speed: 2 },
      B: { position: 5, group: 1, team: 'T1', finished: false, cards: [] , takes_lead: 0, last_group_speed: 1 },
      C: { position: 5, group: 1, team: 'T2', finished: false, cards: [] , takes_lead: 0, last_group_speed: 1 },
      D: { position: 5, group: 1, team: 'T2', finished: false, cards: [] , takes_lead: 0, last_group_speed: 0 },
      E: { position: 2, group: 2, team: 'T3', finished: false, cards: [] },
      F: { position: 1, group: 2, team: 'T3', finished: false, cards: [] }
    };

    const fixture = { track, round: 0, cards };

    // Initialize state (will compute initial stats but should keep positions)
    const state = initializeFromFixture(fixture, rng);

    // Run stepGroup for group 1 - this should enforce Brosten capacity
    const newState = stepGroup(state, 1, rng);

  const positions = Object.fromEntries(Object.entries(newState.cards).map(([n, r]) => [n, r.position]));

  // Peloton size = 6 -> allowed on '0' token = ceil(6 * 0.33) = ceil(1.98) = 2
  const allowed = 2;

  // In this fixture riders moved from pos 5 -> pos 7; enforcement happened on pos 7
  const atPos7 = Object.entries(positions).filter(([, p]) => p === 7).map(([n]) => n);
  const atPos6 = Object.entries(positions).filter(([, p]) => p === 6).map(([n]) => n);

  // Expect exactly `allowed` riders left at pos 7
  expect(atPos7.length).toBe(allowed);

  // The overflow (4 - allowed = 2) riders should have been pushed back to pos 6
  expect(atPos6.length).toBe(4 - allowed);

  // Ensure leader A remained at the Brosten spot (leader preference)
  expect(atPos7).toContain('A');

  // Ensure logs contain the user-facing push-back message
  const pushLogs = (newState.logs || []).filter(l => typeof l === 'string' && l.includes('drops 1 field due to limited capacity'));
  expect(pushLogs.length).toBeGreaterThanOrEqual(1);
  });
});
