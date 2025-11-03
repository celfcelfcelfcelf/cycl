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

test('compute Jonas Vingegaard brostensbakke on FlandernRundt (ends with B)', () => {
  const flandern = '3333330033333311332233333333333330033333333331113333330033333333333FFFFFFFFFFFFFFB';
  const longest = getLongestHill(flandern);

  const rider = riders.find(r => r.NAVN && r.NAVN.includes('Jonas Vingegaard'));
  if (!rider) {
    console.log('Jonas Vingegaard not found');
    expect(rider).toBeDefined();
    return;
  }

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

  // Brosten handling: small flat boost for cobbled finales
  const isBrosten = /B$/.test(flandern);
  if (isBrosten && sumL > 0) {
    const brostenBoost = Math.round(sumL / 2);
    modified.FLAD = Math.round((Number(rider.FLAD) || 0) + brostenBoost);
    for (let k = 1; k <= 15; k++) {
      const fbase = Number(rider[`FLAD${k}`]) || Number(rider.FLAD) || 0;
      modified[`FLAD${k}`] = Math.round(fbase + brostenBoost);
    }
  }

  const cards = generateCards(modified, false);

  console.log('FlandernRundt longest:', longest);
  console.log('Jonas Vingegaard PUNCHEUR:', puncheurField);
  console.log('multiplier:', multiplier);
  console.log('rpf:', rpf);
  console.log('l array:', l);
  console.log('sumL:', sumL);
  console.log('modified BJERG:', modified.BJERG);
  console.log('modified FLAD:', modified.FLAD);
  console.log('generated cards count:', Array.isArray(cards) ? cards.length : typeof cards);
  console.log('cards (first 12):', Array.isArray(cards) ? cards.slice(0, 12) : cards);

  expect(Array.isArray(cards)).toBe(true);
});
