#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { runSprintsPure } from '../src/game/gameLogic.js';

const fixtureName = process.argv[2] || 'sprint_fixture.json';
const fixturesDir = path.resolve(new URL(import.meta.url).pathname, '..', 'src', 'game', 'fixtures');
// workaround for path resolution when running from project root
const fixturesPath = path.resolve(process.cwd(), 'src', 'game', 'fixtures', fixtureName);

if (!fs.existsSync(fixturesPath)) {
  console.error('Fixture not found:', fixturesPath);
  process.exit(2);
}

const raw = fs.readFileSync(fixturesPath, 'utf8');
const fixture = JSON.parse(raw);

console.log('Running fixture:', fixture.meta?.name || fixtureName);
const cards = fixture.cards;
const track = fixture.track;

// deterministic rng for runner
let seed = 12345;
const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

try {
  const res = runSprintsPure(cards, track, 1, fixture.round || 0, [], 0, rng);
  console.log('Result sprint output:');
  for (const [n, r] of Object.entries(res.updatedCards)) {
    console.log(`- ${n}: position=${r.position} prel_time=${r.prel_time} result=${r.result}`);
  }
  process.exit(0);
} catch (e) {
  console.error('Runner failed:', e && e.message);
  process.exit(1);
}
