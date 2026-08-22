import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { TASK_DECKS } from '../js/data/tasks.js';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Eva', 'Finn', 'Greta', 'Hugo'];

test('the voyage always keeps the whole crew together', () => {
  const engine = GameEngine.create({ names, title: 'Single crew test', defaultLanguage: 'de', seed: 111 }, 1_800_000_000_000);
  assert.equal(engine.state.groups.length, 1);
  assert.deepEqual(engine.state.groups[0].playerIds, engine.state.players.map((player) => player.id));
  assert.equal(engine.actionAvailable('splitCrew'), false);
  assert.equal(typeof engine.splitCrew, 'undefined');
});

test('locations follow completed course work instead of the number of turns', () => {
  const engine = GameEngine.create({ names, title: 'Movement gate', defaultLanguage: 'de', seed: 112 }, 1_800_000_000_000);
  const group = engine.activeGroup;
  assert.equal(engine.state.tasks.length, 0, 'the opening fun-card sequence creates no hidden kitchen task');
  for (let index = 0; index < 8; index += 1) {
    engine.state.turn.phase = 'resolved';
    engine.endTurn(1_800_000_001_000 + index);
  }
  assert.equal(group.locationIndex, 0, 'fun cards and handovers alone do not move the location');
  assert.equal(engine.courseProgress(), 0);

  const completedCards = TASK_DECKS[0].filter((card) => card.playable && card.questId !== 'reset').slice(0, 3);
  engine.state.tasks.push(...completedCards.map((card, index) => ({
    instanceId: `progress-${index}`,
    taskId: card.id,
    chapterIndex: 0,
    assignedPlayerIds: [engine.state.players[0].id],
    status: 'done'
  })));
  assert.equal(engine.maybeAdvanceGroup(group), true);
  assert.equal(group.locationIndex, 1);
  assert.deepEqual(group.completedLocations, [0]);
  assert.ok(engine.courseProgress() >= 16.7);
});

test('legacy turn-based locations are rebased to measured course progress when loaded', () => {
  const engine = GameEngine.create({ names, title: 'Legacy movement', defaultLanguage: 'de', seed: 113 }, 1_800_000_000_000);
  const snapshot = engine.snapshot();
  snapshot.groups[0].locationIndex = 5;
  snapshot.groups[0].locationProgress = 3;
  snapshot.groups[0].completedLocations = [0, 1, 2, 3, 4];
  delete snapshot.groups[0].progressMode;

  const loaded = new GameEngine(snapshot);
  assert.equal(loaded.activeGroup.locationIndex, 0);
  assert.equal(loaded.activeGroup.locationProgress, 0);
  assert.equal(loaded.activeGroup.progressMode, 'course');
});

test('the final course location starts only after roughly five sixths of the real work', () => {
  const engine = GameEngine.create({ names, title: 'Late final location', defaultLanguage: 'de', seed: 114 }, 1_800_000_000_000);
  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(1_800_000_001_000), true);
  const clearing = engine.state.tasks.find((instance) => engine.getTaskCard(instance)?.questId === 'reset');
  assert.equal(engine.completeTask(clearing.instanceId, 1_800_000_002_000), true);
  engine.state.chapter.courseStyle = 'cream';
  engine.state.menu[1].courseStyle = 'cream';

  const target = engine.courseRule().target;
  const ingredients = engine.state.ingredients
    .filter((ingredient) => ingredient.essential && ingredient.status === 'available' && ingredient.courseTags.includes('soup'))
    .slice(0, target);
  assert.equal(ingredients.length, target);
  ingredients.forEach((ingredient) => {
    ingredient.status = 'locked';
    ingredient.chapterIndex = 1;
  });
  const taskCards = TASK_DECKS[1]
    .filter((card) => card.playable && card.questId !== 'reset' && engine.taskAppliesToCourse(card));
  const completedCountBeforeFinalLocation = Math.ceil(taskCards.length * ((100 / 6 * 5 - 30) / 70)) - 1;
  engine.state.tasks.push(...taskCards.slice(0, completedCountBeforeFinalLocation).map((card, index) => ({
    instanceId: `soup-progress-${index}`,
    taskId: card.id,
    chapterIndex: 1,
    assignedPlayerIds: [],
    status: 'done'
  })));
  engine.syncCourseLocations();
  assert.ok(engine.courseProgress() < 83.4);
  assert.equal(engine.activeGroup.locationIndex, 4, 'the penultimate location remains active before five sixths progress');

  const nextCard = taskCards[completedCountBeforeFinalLocation];
  engine.state.tasks.push({
    instanceId: 'soup-progress-final-threshold',
    taskId: nextCard.id,
    chapterIndex: 1,
    assignedPlayerIds: [],
    status: 'done'
  });
  engine.syncCourseLocations();
  assert.ok(engine.courseProgress() >= 83.4);
  assert.equal(engine.activeGroup.locationIndex, 5, 'the final location begins near the end of preparation');
});
