import { enforceBrosten } from '../engine';

// Deterministic rng for tests
const rng = () => 0.12345;

describe('Brosten enforcement reproduction', () => {
  test('allowed stays equal capacity and cascades', () => {
    // Build minimal cards object matching user's snapshot
    const cards = {
      'Mads Pedersen': { position: 6, group: 2, finished: false, old_position: 0, played_card: 'kort: 5', moved_fields: -1, last_group_speed: 7, takes_lead: 0 },
      'Jussi Veikkanen': { position: 6, group: 2, finished: false, old_position: 0, played_card: 'kort: 5', moved_fields: -1, last_group_speed: 7, takes_lead: 0 },
      'Michael Rasmussen': { position: 6, group: 2, finished: false, old_position: 0, played_card: 'kort: 4', moved_fields: -1, last_group_speed: 7, takes_lead: 0 },
      'Jørgen V Petersen': { position: 6, group: 2, finished: false, old_position: 0, played_card: 'kort: 2', moved_fields: -1, last_group_speed: 7, takes_lead: 0 },
      'Jørgen Marcussen': { position: 6, group: 2, finished: false, old_position: 0, played_card: 'kort: 1', moved_fields: -1, last_group_speed: 7, takes_lead: 0 },
      // other riders to reach totalPeloton=9
      'Søren Lilholt': { position: 7, group: 2, finished: false, old_position: 0, played_card: 'kort: 8', moved_fields: 7, last_group_speed: 7, takes_lead: 0 },
      'Rigoberto Uran Uran': { position: 7, group: 2, finished: false, old_position: 0, played_card: 'kort: 3', moved_fields: 7, last_group_speed: 7, takes_lead: 1 },
      'Gianni Bugno': { position: 5, group: 1, finished: false, old_position: 0, played_card: null, moved_fields: 0, last_group_speed: 0, takes_lead: 0 },
      'Zbigniew Spruch': { position: 5, group: 2, finished: false, old_position: 0, played_card: 'kort: 5', moved_fields: 5, last_group_speed: 7, takes_lead: 0 },
    };

    // create a track where positions 6 and 7 are Brosten '1' and track ends with '*'
    const track = '______11*';

    const res = enforceBrosten(cards, track, 2, rng);
    // Count riders remaining at pos 6 after enforcement
  const at6 = Object.entries(res.cards).filter(([, r]) => (Number(r.position) || 0) === 6 && !r.finished).map(([n]) => n);
  const logs = res.logs.join('\n');
  // Dump logs to help debugging
  // eslint-disable-next-line no-console
  console.log('\n--- ENFORCEMENT LOGS ---\n' + logs + '\n--- END LOGS ---\n');

    // Allowed should be Math.max(1, ceil(9 * 0.33)) => ceil(2.97)=3
    expect(at6.length).toBe(3);

    // Print logs for debugging if assertion fails (Jest shows on failure)
    // Also assert that there is a Brosten capacity check log
    expect(logs).toMatch(/Brosten capacity check pos=6/);
  });
});
