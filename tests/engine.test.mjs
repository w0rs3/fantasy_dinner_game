import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine, validateSessionState } from '../js/core/game-engine.js';
import { MemoryStorage, SessionRepository } from '../js/core/storage.js';
import { updateTaskTimers } from '../js/core/timers.js';
import { EVENT_DECKS } from '../js/data/events.js';
import { renderGame } from '../js/ui/game.js';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Eva', 'Finn'];

test('new voyages assign unique random roles and preserve individual languages', () => {
  const engine = GameEngine.create({ names, title: 'Test voyage', defaultLanguage: 'de', seed: 44 }, 1_800_000_000_000);
  assert.equal(new Set(engine.state.players.map((player) => player.roleId)).size, names.length);
  assert.ok(engine.state.players.every((player) => player.language === 'de'));
  engine.changePlayerLanguage(engine.state.players[2].id, 'en');
  assert.equal(engine.state.players[2].language, 'en');
  assert.ok(engine.state.players.filter((_, index) => index !== 2).every((player) => player.language === 'de'));
  assert.equal(validateSessionState(engine.snapshot()).valid, true);

  const assignments = new Set(Array.from({ length: 8 }, (_, index) =>
    GameEngine.create({ names, title: `Variation ${index}`, defaultLanguage: 'de', seed: 1000 + index }, 1_800_000_000_000 + index)
      .state.players.map((player) => player.roleId).join(',')
  ));
  assert.ok(assignments.size >= 6, 'new voyages should produce meaningfully different role rosters');
});

test('new and saved voyages use 500 coins as the complete treasure', () => {
  const engine = GameEngine.create({ names, title: 'Coin goal', defaultLanguage: 'de', seed: 43 }, 1_800_000_000_000);
  assert.equal(engine.state.coinGoal, 500);
  engine.state.coins = 41;
  engine.state.coinGoal = 100;

  const restored = new GameEngine(engine.snapshot());
  assert.equal(restored.state.coins, 41, 'already earned coins are preserved');
  assert.equal(restored.state.coinGoal, 500, 'the old reward goal is migrated');
  assert.equal(restored.coinProgress, 8);
  assert.match(renderGame(restored, 'de'), /41\/500 Münzen/);
});

test('saved voyages silently retire yoghurt as an ordinary optional kitchen staple', () => {
  const engine = GameEngine.create({ names, title: 'Legacy yoghurt', defaultLanguage: 'de', seed: 431 }, 1_800_000_000_000);
  const legacy = engine.snapshot();
  legacy.ingredients.push({
    id: 'yoghurt', category: 'pantry', name: { de: 'Joghurt', en: 'Yoghurt' },
    quantity: { min: 400, max: 500, unitDe: 'g', unitEn: 'g', precision: 0 },
    essential: true, courseTags: ['soup', 'salad', 'dessert', 'cocktails'], effect: null,
    note: null, chapterIndex: 1, status: 'discovered', basketCourseIndex: 1,
    basketTaskId: null, suggestedQuantity: { de: '450 g', en: '450 g' }
  });
  legacy.ingredientQueues[1].push('yoghurt');
  legacy.tasks[0].basketIngredientIds.push('yoghurt');
  legacy.menu[1].ingredientIds.push('yoghurt');
  legacy.lastIngredientId = 'yoghurt';
  legacy.previousIngredientId = 'yoghurt';
  legacy.turn.phase = 'ingredientChoice';
  legacy.turn.pendingIngredientIds = ['yoghurt'];

  assert.equal(validateSessionState(legacy).valid, true, 'the previous catalogue remains loadable');
  const restored = new GameEngine(legacy);
  assert.ok(!restored.state.ingredients.some((ingredient) => ingredient.id === 'yoghurt'));
  assert.ok(restored.state.ingredientQueues.every((queue) => !queue.includes('yoghurt')));
  assert.ok(restored.state.tasks.every((task) => !task.basketIngredientIds.includes('yoghurt')));
  assert.ok(restored.state.menu.every((course) => !course.ingredientIds.includes('yoghurt')));
  assert.equal(restored.state.lastIngredientId, null);
  assert.equal(restored.state.previousIngredientId, null);
  assert.equal(restored.state.turn.phase, 'draw');
  assert.equal(validateSessionState(restored.snapshot()).valid, true);
});

test('saved voyages retire broth from the played pool and add peppermint globally', () => {
  const engine = GameEngine.create({ names, title: 'Legacy broth', defaultLanguage: 'de', seed: 433 }, 1_800_000_000_000);
  const legacy = engine.snapshot();
  const peppermint = legacy.ingredients.find((ingredient) => ingredient.id === 'peppermint');
  legacy.ingredients = legacy.ingredients.filter((ingredient) => ingredient.id !== 'peppermint');
  legacy.ingredients.push({ ...peppermint, id: 'broth', name: { de: 'Brühe', en: 'Stock' }, courseTags: ['soup'] });
  legacy.ingredientQueues[1].push('broth');
  const restored = new GameEngine(legacy);
  assert.equal(restored.state.ingredients.some((ingredient) => ingredient.id === 'broth'), false);
  const restoredPeppermint = restored.getIngredient('peppermint');
  assert.equal(restoredPeppermint.status, 'available');
  assert.equal(restoredPeppermint.chapterIndex, null);
  assert.deepEqual(restoredPeppermint.courseTags, ['salad', 'dessert', 'cocktails']);
});

test('saved voyages return an unlocked cucumber from the soup basket', () => {
  const engine = GameEngine.create({ names, title: 'Legacy cucumber soup', defaultLanguage: 'de', seed: 432 }, 1_800_000_000_000);
  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(1_800_000_001_000), true);
  const legacy = engine.snapshot();
  const cucumber = legacy.ingredients.find((ingredient) => ingredient.id === 'cucumber');
  cucumber.courseTags = ['soup', 'salad', 'main'];
  cucumber.chapterIndex = 1;
  cucumber.status = 'discovered';
  cucumber.basketCourseIndex = 1;
  legacy.ingredientQueues[1].push('cucumber');
  legacy.turn.phase = 'ingredientChoice';
  legacy.turn.pendingIngredientIds = ['cucumber'];

  const restored = new GameEngine(legacy);
  const restoredCucumber = restored.getIngredient('cucumber');
  assert.deepEqual(restoredCucumber.courseTags, ['salad', 'main']);
  assert.equal(restoredCucumber.status, 'available');
  assert.equal(restoredCucumber.chapterIndex, null);
  assert.equal(restoredCucumber.basketCourseIndex, null);
  assert.ok(!restored.state.ingredientQueues[1].includes('cucumber'));
  assert.equal(restored.state.turn.phase, 'draw');
  assert.deepEqual(restored.state.turn.pendingIngredientIds, []);
});

test('every task can be completed early and its challenge score survives persistence', () => {
  const now = 1_800_000_000_000;
  const engine = GameEngine.create({ names, title: 'Timer test', defaultLanguage: 'de', seed: 45 }, now);
  engine.beginEvent(now);
  const coreTask = engine.state.tasks[0];
  const card = engine.getTaskCard(coreTask);
  assert.ok(card);
  engine.startTask(coreTask.instanceId, now);

  assert.ok(coreTask.challengeEndsAt > now);
  const coinsBefore = engine.state.coins;
  assert.equal(engine.completeTask(coreTask.instanceId, now + 1_000), true);
  assert.equal(coreTask.challengeResult, 'veryFast');
  assert.equal(coreTask.challengeCoinValue, 2);
  assert.equal(engine.state.coins, coinsBefore + 2);
  const restored = new GameEngine(engine.snapshot());
  assert.equal(restored.state.tasks[0].status, 'done');
  assert.equal(restored.undoTaskCompletion(coreTask.instanceId, now + 2_000), true);
  assert.notEqual(restored.state.tasks[0].status, 'done');
});

test('the current briefing task can be checked directly from the task list without blocking the turn', () => {
  const now = 1_800_000_100_000;
  const engine = GameEngine.create({ names, title: 'Direct check', defaultLanguage: 'de', seed: 46 }, now);
  const task = engine.state.tasks[0];
  assert.equal(engine.state.turn.phase, 'taskBriefing');
  assert.equal(task.status, 'queued');
  assert.equal(engine.completeTask(task.instanceId, now + 1_000), true);
  assert.equal(task.status, 'done');
  assert.equal(engine.state.turn.phase, 'draw');
  assert.equal(engine.state.turn.assignedTaskId, null);
});

test('timer alerts fire once at completion and stay silent at five and one minute', () => {
  const start = 1_800_000_000_000;
  const task = {
    instanceId: 'timer-check', status: 'active', endAt: start + 10 * 60_000,
    readyAt: null, alertsSent: []
  };
  const session = { tasks: [task], updatedAt: start };

  let result = updateTaskTimers(session, start + 5 * 60_000);
  assert.deepEqual(result.notices, []);
  result = updateTaskTimers(session, start + 9 * 60_000);
  assert.deepEqual(result.notices, []);

  const restored = structuredClone(session);
  result = updateTaskTimers(restored, start + 10 * 60_000);
  assert.deepEqual(result.notices.map((notice) => notice.threshold), [0]);
  assert.equal(restored.tasks[0].status, 'ready');
  assert.deepEqual(updateTaskTimers(restored, start + 11 * 60_000).notices, []);
});

test('repository round-trips the complete game state and deletes only the target voyage', () => {
  const storage = new MemoryStorage();
  const repository = new SessionRepository(storage);
  const first = GameEngine.create({ names, title: 'First', defaultLanguage: 'de', seed: 10 }, 1_800_000_000_000);
  first.beginEvent(1_800_000_001_000);
  const savedFirst = repository.saveSession(first.snapshot());
  const second = GameEngine.create({ names, title: 'Second', defaultLanguage: 'en', seed: 11 }, 1_800_000_010_000);
  repository.saveSession(second.snapshot());

  const restored = repository.getSession(first.state.id);
  assert.equal(restored.turn.currentEventId, savedFirst.turn.currentEventId);
  assert.deepEqual(restored.eventQueues, savedFirst.eventQueues);
  assert.deepEqual(restored.ingredients, savedFirst.ingredients);
  assert.deepEqual(restored.history, savedFirst.history);
  assert.equal(repository.listSessions().length, 2);
  repository.deleteSession(first.state.id);
  assert.equal(repository.listSessions().length, 1);
  assert.equal(repository.listSessions()[0].title, 'Second');
  repository.clearSessions();
  assert.equal(repository.listSessions().length, 0);
  assert.equal(repository.getCurrentSession(), null);
});

test('handover advances to the next free player and skips task owners', () => {
  const engine = GameEngine.create({ names, title: 'Round robin', defaultLanguage: 'de', seed: 51 }, 1_800_000_000_000);
  const firstId = engine.activePlayer.id;
  assert.equal(engine.acceptTaskBriefing(), true, 'the automatic opening task is accepted before the first event');
  engine.beginEvent();
  if (engine.currentEvent.type === 'choice') {
    engine.resolveChoice(engine.currentEvent.options[0]);
  } else {
    engine.rollDie();
    engine.confirmRoll();
  }
  if (engine.state.turn.phase === 'ingredientChoice') engine.chooseIngredient(engine.state.turn.pendingIngredientIds[0]);
  if (engine.state.turn.phase === 'taskAssigneeChoice') {
    const pending = engine.state.turn.pendingTaskAssignment;
    const selected = new Set(pending.selectedPlayerIds);
    engine.freePlayersForTask().filter((player) => !selected.has(player.id)).slice(0, pending.requiredPeople - selected.size).forEach((player) => engine.toggleTaskAssignee(player.id));
    engine.confirmTaskAssignees();
  }
  if (engine.state.turn.phase === 'taskBriefing') engine.acceptTaskBriefing();
  if (engine.state.turn.phase === 'watch') engine.completeWatchChallenge();
  while (engine.state.turn.chainPending) engine.state.turn.chainPending = false;
  assert.equal(engine.state.turn.phase, 'resolved');
  engine.endTurn();
  assert.notEqual(engine.activePlayer.id, firstId);
  assert.equal(engine.isPlayerFreeForTask(engine.activePlayer.id), true);
});

test('resolved work-order cards keep the task that was actually assigned', () => {
  const engine = GameEngine.create({ names, title: 'Stable result', defaultLanguage: 'de', seed: 52 }, 1_800_000_000_000);
  const assigned = engine.state.tasks[0];
  const assignedTitle = engine.getTaskCard(assigned).title.de;
  const nextTitle = engine.taskForAction('drawTask').title.de;
  assert.notEqual(assignedTitle, nextTitle);

  const event = EVENT_DECKS[0].find((card) => card.stage === 'tasks' && card.type === 'choice');
  engine.state.turn.currentEventId = event.id;
  engine.state.turn.phase = 'resolved';
  engine.state.turn.outcomeCode = 'drawTask';
  engine.state.turn.resolvedTaskId = assigned.instanceId;

  const resultText = renderGame(engine, 'de').match(/<div class="card-effect"><strong>(.*?)<\/strong><\/div>/s)?.[1] ?? '';
  assert.match(resultText, new RegExp(assignedTitle));
  assert.doesNotMatch(resultText, new RegExp(nextTitle));
});
