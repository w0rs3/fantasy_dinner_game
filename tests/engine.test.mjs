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
  assert.equal(coreTask.challengeCoinValue, 3);
  assert.equal(engine.state.coins, coinsBefore + 3);
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

test('timer alerts fire once at five minutes, one minute, and completion', () => {
  const start = 1_800_000_000_000;
  const task = {
    instanceId: 'timer-check', status: 'active', endAt: start + 10 * 60_000,
    readyAt: null, alertsSent: []
  };
  const session = { tasks: [task], updatedAt: start };

  let result = updateTaskTimers(session, start + 5 * 60_000);
  assert.deepEqual(result.notices.map((notice) => notice.threshold), [300]);
  result = updateTaskTimers(session, start + 9 * 60_000);
  assert.deepEqual(result.notices.map((notice) => notice.threshold), [60]);

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

test('round-robin handover advances exactly one player after a completed turn', () => {
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
  if (engine.state.turn.phase === 'taskBriefing') engine.acceptTaskBriefing();
  if (engine.state.turn.phase === 'watch') engine.completeWatchChallenge();
  while (engine.state.turn.chainPending) engine.state.turn.chainPending = false;
  assert.equal(engine.state.turn.phase, 'resolved');
  engine.endTurn();
  assert.notEqual(engine.activePlayer.id, firstId);
  assert.equal(engine.activePlayer.id, engine.state.players[1].id);
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
