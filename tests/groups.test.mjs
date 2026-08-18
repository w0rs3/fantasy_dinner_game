import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Eva', 'Finn', 'Greta', 'Hugo'];

test('the voyage always keeps the whole crew together', () => {
  const engine = GameEngine.create({ names, title: 'Single crew test', defaultLanguage: 'de', seed: 111 }, 1_800_000_000_000);
  assert.equal(engine.state.groups.length, 1);
  assert.deepEqual(engine.state.groups[0].playerIds, engine.state.players.map((player) => player.id));
  assert.equal(engine.actionAvailable('splitCrew'), false);
  assert.equal(typeof engine.splitCrew, 'undefined');
});

test('a location advances automatically after its visible action goal without creating meta tasks', () => {
  const engine = GameEngine.create({ names, title: 'Movement gate', defaultLanguage: 'de', seed: 112 }, 1_800_000_000_000);
  const group = engine.activeGroup;
  assert.equal(engine.state.tasks.length, 0, 'the opening fun-card sequence creates no hidden kitchen task');
  group.locationProgress = engine.locationGoal(group) - 1;
  assert.equal(engine.maybeAdvanceGroup(group), false);
  group.locationProgress += 1;
  assert.equal(engine.maybeAdvanceGroup(group), true);
  assert.equal(group.locationIndex, 1);
  assert.deepEqual(group.completedLocations, [0]);
});
