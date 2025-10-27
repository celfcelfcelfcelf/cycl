// Simple Node script to print compact group listing from a fixture JSON
// Usage: node scripts/print_group_listing.js [fixture-file] [groupNum]

const path = require('path');
const fs = require('fs');

const fixtureFile = process.argv[2] || 'src/game/fixtures/breakaway_fixture.json';
const groupNum = Number(process.argv[3] || 1);

const abs = path.resolve(process.cwd(), fixtureFile);
if (!fs.existsSync(abs)) {
  console.error('Fixture not found:', abs);
  process.exit(2);
}

const fixture = JSON.parse(fs.readFileSync(abs, 'utf8'));
const cards = fixture.cards || {};

const entries = Object.entries(cards).filter(([, r]) => r.group === groupNum && !r.finished)
  .sort((a,b) => b[1].position - a[1].position);

if (entries.length === 0) {
  console.log(`No riders in group ${groupNum} for fixture ${fixtureFile}`);
  process.exit(0);
}

const listing = entries.map(([name, r]) => `${name} (${r.team})`).join(', ');
console.log(listing);
