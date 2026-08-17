import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Eva', 'Finn', 'Greta', 'Hugo'];

test('split crews keep player-specific locations and reunite automatically at the target', () => {
  const engine = GameEngine.create({ names, title: 'Split test', defaultLanguage: 'de', seed: 111 }, 1_800_000_000_000);
  assert.equal(engine.splitCrew(), true);
  assert.deepEqual(engine.state.groups.map((group) => group.playerIds.length), [4, 4]);
  assert.equal(engine.groupForPlayer('player-1').id, 'A');
  assert.equal(engine.groupForPlayer('player-2').id, 'B');

  engine.state.groups[0].locationIndex = 1;
  engine.state.groups[1].locationIndex = 2;
  engine.state.activePlayerIndex = 0;
  assert.equal(engine.activeGroup.locationIndex, 1);
  engine.state.activePlayerIndex = 1;
  assert.equal(engine.activeGroup.locationIndex, 2);

  const target = engine.state.chapter.splitTargetLocation;
  engine.state.groups.forEach((group) => { group.locationIndex = target; });
  assert.equal(engine.maybeReunite(), true);
  assert.equal(engine.state.groups.length, 1);
  assert.equal(engine.state.groups[0].playerIds.length, names.length);
});

test('a location advances automatically after its visible action goal without creating meta tasks', () => {
  const engine = GameEngine.create({ names, title: 'Movement gate', defaultLanguage: 'de', seed: 112 }, 1_800_000_000_000);
  const group = engine.activeGroup;
  assert.equal(engine.state.tasks.length, 1, 'only the real automatic opening task exists');
  group.locationProgress = engine.locationGoal(group) - 1;
  assert.equal(engine.maybeAdvanceGroup(group), false);
  group.locationProgress += 1;
  assert.equal(engine.maybeAdvanceGroup(group), true);
  assert.equal(group.locationIndex, 1);
  assert.deepEqual(group.completedLocations, [0]);
});
