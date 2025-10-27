Goal

A compact design doc with low-fidelity mockups and component mapping for the player-facing UI. The goal is to go from fixture selection to moving a group and confirming moves.

Screens / panels

1) Setup / Fixture Selection
- Fixture selector (name, small preview)
- Seed input for deterministic runs
- "Load" button -> calls engine.initializeFromFixture(fixture, rng)

2) Runner Panel (main workspace)
- Top bar: Round, Current Group, Team Turn badge
- Left column: Controls & Logs
  - Step / Run Sprint buttons
  - Seed and Reload
  - Log window
- Main column: Track view + Group list
  - Track: colour tokens showing upcoming fields
  - Groups stacked (GroupDisplay component)
    - Each GroupDisplay shows riders (buttons) and group pos
    - Current group's GroupDisplay expands with HumanTurnInterface

3) HumanTurnInterface (expanded view)
- Shows the human team's riders in that group
- For each rider show top-4 cards (CardHand)
- Controls: Attack / Pace / Follow
- When "Attack" selected: pick rider, pick a top-4 card
- When "Pace" selected: pick leader and pace value (2-8)
- Submit button -> client writes selected values into engine state and calls engine.stepGroup

Components and props (minimal)

- FixtureLoader
  - props: initial (fixtureKey), onLoad(fixtureKey, seed)
- EngineUI (page-level)
  - state: engineState (from engine.initializeFromFixture)
  - methods: stepGroup(groupNum, rng), runSprints(groupNum, rng)
- RunnerPanel
  - props: engineState, onStep, onSprint
- GroupDisplay
  - props: groupNum, riders[], isActive, onHumanChoice
- RiderCard
  - props: rider (object), onSelectCard(cardId)
- CardHand
  - props: cards[], penalty, onPick(cardId)

Responsive notes
- Desktop: 3-column layout (controls, main track/groups, debug/logs)
- Mobile: single column, group accordion, FAB for Step/Run

Next steps
- Implement `GroupDisplay` + `CardHand` and wire `HumanTurnInterface` to apply selections to engine state (call engine.stepGroup with seeded RNG).
- Add small e2e smoke test that loads a fixture, issues a step, and verifies positions changed.


