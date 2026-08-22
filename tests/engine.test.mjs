import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine, validateSessionState } from '../js/core/game-engine.js';
import { MemoryStorage, SessionRepository } from '../js/core/storage.js';
import { getElapsedSeconds, getRemainingSeconds, getTaskTimerProgress, updateTaskTimers } from '../js/core/timers.js';
import { EVENT_DECKS } from '../js/data/events.js';
import { getPlayableQuestLines } from '../js/data/tasks.js';
import { renderGame } from '../js/ui/game.js';
import { renderTasks } from '../js/ui/overlays.js';
import { addOpeningTask, createEngineWithTask, resolvePendingLocationStories } from './test-helpers.mjs';

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

test('new voyages choose a reproducible but genuinely varied random starting player', () => {
  const starters = Array.from({ length: 24 }, (_, index) =>
    GameEngine.create({ names, title: `Starter ${index}`, defaultLanguage: 'de', seed: 20_000 + index }, 1_800_000_000_000)
      .activePlayer.id
  );
  assert.ok(new Set(starters).size >= 4, `expected varied starters, got ${new Set(starters).size}`);
  const again = GameEngine.create({ names, title: 'Same starter', defaultLanguage: 'de', seed: 20_007 }, 1_800_000_000_000);
  assert.equal(again.activePlayer.id, starters[7], 'the same seed keeps the random start reproducible');
});

test('quest stacks start with one card per line and mix a completed line successor into the top three', () => {
  const engine = GameEngine.create({ names, title: 'Quest stack', defaultLanguage: 'de', seed: 20_101 }, 1_800_000_000_000);
  for (let chapterIndex = 1; chapterIndex < engine.state.taskQueues.length; chapterIndex += 1) {
    const starts = new Set(getPlayableQuestLines(chapterIndex)
      .map((line) => line.find((card) => engine.taskAppliesToChapter(card, chapterIndex))?.id)
      .filter(Boolean));
    assert.equal(engine.state.taskQueues[chapterIndex].length, starts.size);
    assert.ok(engine.state.taskQueues[chapterIndex].every((taskId) => starts.has(taskId)));
  }

  const opening = addOpeningTask(engine, 1_800_000_000_100);
  const openingCard = engine.getTaskCard(opening);
  const line = getPlayableQuestLines(0).find((candidate) => candidate[0].questId === openingCard.questId);
  assert.equal(openingCard.id, line[0].id, 'the automatic Tapas job is a quest-line start');
  assert.ok(line.length > 1);
  assert.ok(engine.state.taskQueues[0].every((taskId) => !line.slice(1).some((card) => card.id === taskId)));

  assert.equal(engine.completeTask(opening.instanceId, 1_800_000_001_000), true);
  const successorIndex = engine.state.taskQueues[0].indexOf(line[1].id);
  assert.ok(successorIndex >= 0 && successorIndex <= 2, `successor landed at stack position ${successorIndex}`);
  assert.ok(engine.state.taskQueues[0].every((taskId) => !line.slice(2).some((card) => card.id === taskId)));
});

test('different Tapas voyages can open with different quest lines', () => {
  const openingQuests = new Set(Array.from({ length: 30 }, (_, index) => {
    const engine = GameEngine.create({ names, title: `Quest order ${index}`, defaultLanguage: 'de', seed: 21_000 + index }, 1_800_000_000_000);
    return engine.getTaskCard(addOpeningTask(engine, 1_800_000_000_100 + index)).questId;
  }));
  assert.ok(openingQuests.has('bread'));
  assert.ok(openingQuests.has('dates'));
  assert.ok(openingQuests.size >= 3, `expected interleaved opening quests, got ${[...openingQuests].join(', ')}`);
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
  assert.match(renderGame(restored, 'de'), /41\/500 Münzen · 8% der Süßigkeitenbeute/);
});

test('saved voyages silently retire yoghurt as an ordinary optional kitchen staple', () => {
  const engine = GameEngine.create({ names, title: 'Legacy yoghurt', defaultLanguage: 'de', seed: 431 }, 1_800_000_000_000);
  addOpeningTask(engine, 1_800_000_000_010);
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
  const engine = createEngineWithTask({ names, title: 'Timer test', defaultLanguage: 'de', seed: 45 }, now);
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

test('manual frying tasks have no countdown and no time-based coin score', () => {
  const now = 1_800_000_050_000;
  const engine = createEngineWithTask({ names, title: 'Doneness test', defaultLanguage: 'de', seed: 451 }, now);
  const task = engine.state.tasks[0];
  const fryingCard = getPlayableQuestLines(0).flat().find((card) => card.title.de === 'Speckdatteln in der Pfanne braten');
  task.taskId = fryingCard.id;

  assert.equal(engine.startTask(task.instanceId, now), true);
  assert.equal(task.timingMode, 'manual');
  assert.equal(task.endAt, null);
  assert.equal(task.challengeEndsAt, null);
  assert.deepEqual(updateTaskTimers(engine.state, now + 60 * 60_000).notices, []);

  const coinsBefore = engine.state.coins;
  assert.equal(engine.completeTask(task.instanceId, now + 60 * 60_000), true);
  assert.equal(task.challengeResult, 'manual');
  assert.equal(task.challengeCoinValue, 0);
  assert.equal(engine.state.coins, coinsBefore);
});

test('the current briefing task can be checked directly from the task list without blocking the turn', () => {
  const now = 1_800_000_100_000;
  const engine = createEngineWithTask({ names, title: 'Direct check', defaultLanguage: 'de', seed: 46 }, now);
  const task = engine.state.tasks[0];
  assert.equal(engine.state.turn.phase, 'taskBriefing');
  assert.equal(task.status, 'queued');
  assert.equal(engine.completeTask(task.instanceId, now + 1_000), true);
  assert.equal(task.status, 'done');
  assert.equal(engine.state.turn.phase, 'resolved');
  assert.equal(engine.state.turn.assignedTaskId, null);
  assert.equal(engine.state.tasks.length, 1, 'checking the opening task does not create another assignment');
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

test('scored task timers run into overtime and freeze their duration, bar, and coin result on completion', () => {
  const start = 1_800_000_000_000;
  const engine = createEngineWithTask({ names, title: 'Frozen result', defaultLanguage: 'de', seed: 452 }, start);
  const task = engine.state.tasks[0];
  assert.equal(engine.startTask(task.instanceId, start), true);
  const targetSeconds = task.challengeMinutes * 60;
  const completedAt = start + (targetSeconds + 30) * 1000;

  assert.equal(getRemainingSeconds(task, completedAt), -30);
  assert.equal(engine.completeTask(task.instanceId, completedAt), true);
  assert.equal(task.challengeCoinValue, -2);
  assert.equal(getRemainingSeconds(task, completedAt + 60 * 60_000), -30, 'completed countdown remains frozen');
  assert.equal(getElapsedSeconds(task, completedAt + 60 * 60_000), targetSeconds + 30, 'completed duration remains frozen');
  assert.equal(getTaskTimerProgress(task, completedAt + 60 * 60_000), 100, 'completed progress bar remains frozen');

  const html = renderTasks(engine, 'de');
  assert.match(html, /Überlänge beim Abschluss/);
  assert.match(html, /Dauer: \d{2}:\d{2}/);
  assert.match(html, /Münzwertung: −2 Münzen/);
  assert.match(html, /data-overdue="true">−00:30/);
});

test('unscored background timers stop at zero instead of accumulating overtime', () => {
  const start = 1_800_000_000_000;
  const task = {
    status: 'ready', timingMode: 'background', startedAt: start,
    endAt: start + 60_000, completedAt: null
  };
  assert.equal(getRemainingSeconds(task, start + 90_000), 0);
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
  const engine = createEngineWithTask({ names, title: 'Round robin', defaultLanguage: 'de', seed: 51 }, 1_800_000_000_000);
  const firstId = engine.activePlayer.id;
  assert.equal(engine.acceptTaskBriefing(), true, 'the task fixture is accepted before the event');
  assert.equal(engine.state.turn.phase, 'resolved');
  assert.equal(engine.endTurn(), true);
  assert.notEqual(engine.activePlayer.id, firstId);
  resolvePendingLocationStories(engine, 1_800_000_000_100);
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
  if (engine.state.turn.phase === 'watch' && engine.currentWatchChallenge?.secret && engine.state.turn.watchSecretRevealedAt == null) {
    engine.revealSecretWatchChallenge();
  }
  if (engine.state.turn.phase === 'watch' && engine.currentWatchChallenge?.playerSelection) {
    engine.selectWatchChallengePlayer(engine.activePlayer.id);
    engine.confirmWatchChallengePlayer();
  } else if (engine.state.turn.phase === 'watch' && engine.currentWatchChallenge?.flow === 'ongoing') {
    engine.activateOngoingWatchChallenge();
  } else if (engine.state.turn.phase === 'watch' && engine.currentWatchChallenge?.secret && engine.state.turn.watchStartedAt == null) {
    engine.startWatchChallengeAction();
    engine.completeWatchChallenge();
  } else if (engine.state.turn.phase === 'watch' && engine.currentWatchChallenge?.skillCheck) {
    engine.resolveWatchChallengeOutcome('success');
  } else if (engine.state.turn.phase === 'watch') engine.completeWatchChallenge();
  while (engine.state.turn.chainPending) engine.state.turn.chainPending = false;
  assert.equal(engine.state.turn.phase, 'resolved');
  engine.endTurn();
  assert.notEqual(engine.activePlayer.id, firstId);
  assert.equal(engine.isPlayerFreeForTask(engine.activePlayer.id), true);
});

test('resolved work-order cards keep the task that was actually assigned', () => {
  const engine = createEngineWithTask({ names, title: 'Stable result', defaultLanguage: 'de', seed: 52 }, 1_800_000_000_000);
  const assigned = engine.state.tasks[0];
  const assignedTitle = engine.getTaskCard(assigned).title.de;
  engine.acceptTaskBriefing();
  engine.endTurn();
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

test('single-action event cards do not pretend that there is a crew decision', () => {
  const engine = GameEngine.create({ names, title: 'Single event action', defaultLanguage: 'de', seed: 53 }, 1_800_000_000_000);
  engine.state.chapter.stage = 'tasks';
  engine.state.turn.phase = 'event';
  const singleActionEvent = EVENT_DECKS[0].find((card) => {
    engine.state.turn.currentEventId = card.id;
    return engine.currentEvent?.type === 'choice' && engine.currentEvent.options.length === 1;
  });
  assert.ok(singleActionEvent);
  engine.state.turn.currentEventId = singleActionEvent.id;

  const html = renderGame(engine, 'de');
  assert.doesNotMatch(html, /Die Crew darf beraten\. Die endgültige Wahl trifft die aktive Person\./);
  assert.equal((html.match(/data-action="resolve-choice"/g) ?? []).length, 1);
});
