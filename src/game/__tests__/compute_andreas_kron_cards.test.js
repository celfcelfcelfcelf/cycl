import riders from '../../data/ridersCsv';
import { generateCards } from '../gameLogic';

// Recreate getLongestHill from App.js
const getLongestHill = (trackStr) => {
  if (!trackStr || typeof trackStr !== 'string') return 1;
  let longest = 1;
  let cur = 0;
  for (let i = 0; i < trackStr.length; i++) {
    const ch = trackStr[i];
    if (ch === '0' || ch === '1') {
      cur += 1;
    } else if (ch === '2') {
      cur += 0.5;
    } else if (ch === '3' || ch === '_') {
      cur = 0;
    }
    if (cur > longest) longest = cur;
  }
  return Math.max(1, longest);
};

test('print Andreas Kron cards on Kiddesvej', () => {
  // Kiddesvej track string (copied from App.js)
  const kiddesvej = '33333333333333311333333333330033333333333003333333333333300FFFFFFFFFFFFF';
  const longest = getLongestHill(kiddesvej);

  const rider = riders.find(r => r.NAVN && r.NAVN.includes('Andreas Kron'));
  if (!rider) {
    console.log('Andreas Kron not found in riders data');
    expect(rider).toBeDefined();
    return;
  }

  // Compute puncheur per App.js logic: multiplier * rider.PUNCHEUR * puncheur_param
  const puncheurField = Number(rider.PUNCHEUR) || 0;
  const puncheur_param = 1;
  const multiplier = Math.min(1, 3 / Math.max(longest, 3));
  const rpf = Math.trunc(puncheurField * multiplier * puncheur_param);

  // Build l[]
  let l = [];
  if (rpf !== 0) {
    const absr = Math.abs(rpf);
    const step = 16 / (absr + 1);
    for (let k = 1; k <= 15; k++) {
      if ((k % step) < 1) {
        l.push(Math.trunc(rpf / absr));
      } else {
        l.push(0);
      }
    }
  } else {
    l = Array(15).fill(0);
  }

  // Apply l[] to BJERG1..15 and aggregate to BJERG
  const modified = { ...rider };
  let sumL = 0;
  for (let k = 1; k <= 15; k++) {
    const base = Number(rider[`BJERG${k}`]) || Number(rider.BJERG) || 0;
    const delta = l[k - 1] || 0;
    modified[`BJERG${k}`] = Math.round(base + delta);
    sumL += delta;
  }
  modified.BJERG = Math.round((Number(rider.BJERG) || 0) + sumL);

  const cards = generateCards(modified, false);

  console.log('Kiddesvej longest:', longest);
  console.log('Andreas Kron PUNCHEUR:', puncheurField);
  console.log('rpf:', rpf);
  console.log('l array:', l);
  console.log('modified BJERG:', modified.BJERG);
  console.log('generated cards count:', Array.isArray(cards) ? cards.length : typeof cards);
  console.log('cards (first 10):', Array.isArray(cards) ? cards.slice(0, 10) : cards);

  expect(Array.isArray(cards)).toBe(true);
});

test('print Andreas Kron cards on Kiddesvej with puncheur_param = 0', () => {
  const kiddesvej = '33333333333333311333333333330033333333333003333333333333300FFFFFFFFFFFFF';
  const longest = getLongestHill(kiddesvej);
  const rider = riders.find(r => r.NAVN && r.NAVN.includes('Andreas Kron'));
  const puncheurField = Number(rider.PUNCHEUR) || 0;
  const puncheur_param = 0; // force zero
  const multiplier = Math.min(1, 3 / Math.max(longest, 3));
  const rpf = Math.trunc(puncheurField * multiplier * puncheur_param);

  let l = [];
  if (rpf !== 0) {
    const absr = Math.abs(rpf);
    const step = 16 / (absr + 1);
    for (let k = 1; k <= 15; k++) {
      if ((k % step) < 1) {
        l.push(Math.trunc(rpf / absr));
      } else {
        l.push(0);
      }
    }
  } else {
    l = Array(15).fill(0);
  }

  const modified = { ...rider };
  let sumL = 0;
  for (let k = 1; k <= 15; k++) {
    const base = Number(rider[`BJERG${k}`]) || Number(rider.BJERG) || 0;
    const delta = l[k - 1] || 0;
    modified[`BJERG${k}`] = Math.round(base + delta);
    sumL += delta;
  }
  modified.BJERG = Math.round((Number(rider.BJERG) || 0) + sumL);

  const cards = generateCards(modified, false);

  console.log('--- puncheur_param=0 ---');
  console.log('rpf:', rpf);
  console.log('l array:', l);
  console.log('modified BJERG:', modified.BJERG);
  console.log('cards (first 10):', Array.isArray(cards) ? cards.slice(0, 10) : cards);

  expect(Array.isArray(cards)).toBe(true);
});

const debugRiders = ['Mattias Skjelmose', 'Edvald Boasson Hagen'];

debugRiders.forEach(name => {
  test(`debug ${name} cards puncheur_param 0 and 1`, () => {
    const kiddesvej = '33333333333333311333333333330033333333333003333333333333300FFFFFFFFFFFFF';
    const longest = getLongestHill(kiddesvej);
    const rider = riders.find(r => r.NAVN && r.NAVN.includes(name));
    if (!rider) {
      console.log(`${name} not found`);
      expect(rider).toBeDefined();
      return;
    }

    [0, 1].forEach(puncheur_param => {
      const puncheurField = Number(rider.PUNCHEUR) || 0;
      const multiplier = Math.min(1, 3 / Math.max(longest, 3));
      const rpf = Math.trunc(puncheurField * multiplier * puncheur_param);

      let l = [];
      if (rpf !== 0) {
        const absr = Math.abs(rpf);
        const step = 16 / (absr + 1);
        for (let k = 1; k <= 15; k++) {
          if ((k % step) < 1) l.push(Math.trunc(rpf / absr)); else l.push(0);
        }
      } else {
        l = Array(15).fill(0);
      }

      const modified = { ...rider };
      let sumL = 0;
      for (let k = 1; k <= 15; k++) {
        const base = Number(rider[`BJERG${k}`]) || Number(rider.BJERG) || 0;
        const delta = l[k - 1] || 0;
        modified[`BJERG${k}`] = Math.round(base + delta);
        sumL += delta;
      }
      modified.BJERG = Math.round((Number(rider.BJERG) || 0) + sumL);

      const cards = generateCards(modified, false);

      console.log(`--- ${name} puncheur_param=${puncheur_param} ---`);
      console.log('PUNCHEUR:', puncheurField, 'multiplier:', multiplier, 'rpf:', rpf);
      console.log('l array:', l);
      console.log('modified BJERG:', modified.BJERG);
      console.log('cards (first 10):', Array.isArray(cards) ? cards.slice(0, 10) : cards);
      expect(Array.isArray(cards)).toBe(true);
    });
  });
});
