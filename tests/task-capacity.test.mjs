import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { renderGame } from '../js/ui/game.js';
import { renderCrew } from '../js/ui/overlays.js';
import { createEngineWithTask } from './test-helpers.mjs';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Ella', 'Finn', 'Greta', 'Hugo'];
const now = 1_800_100_000_000;

function create(seed = 501) {
  return createEngineWithTask({ names, title: 'Crew capacity', defaultLanguage: 'de', seed }, now);
}

test('new tasks are assigned only to crew members without an open task', () => {
  const engine = create();
  assert.equal(engine.acceptTaskBriefing(now + 1_000), true);
  assert.equal(engine.endTurn(now + 1_500), true);

  const firstTask = engine.state.tasks[0];
  const secondTask = engine.assignTask({ now: now + 2_000 });
  assert.ok(secondTask, 'a second parallel task should fit into an eight-person crew');
  assert.ok(secondTask.assignedPlayerIds.includes(engine.activePlayer.id), 'the active player must be part of the new task');
  assert.deepEqual(
    firstTask.assignedPlayerIds.filter((playerId) => secondTask.assignedPlayerIds.includes(playerId)),
    [],
    'parallel tasks must never share a person'
  );

  assert.equal(engine.assignTask({ now: now + 3_000 }), null, 'the busy active player cannot create another task');
  engine.state.turn.phase = 'draw';
  assert.equal(engine.actionAvailable('drawTask'), false);
  assert.equal(engine.actionAvailable('teamTask'), false);
  assert.equal(engine.prepareTaskAssignment({ now: now + 3_100 }), false, 'a second task in the same turn is impossible');

  for (const player of engine.state.players) {
    assert.ok(engine.openTasksForPlayer(player.id).length <= 1, `${player.name} received overlapping tasks`);
  }
});

test('task cards pause while the whole active group is occupied', () => {
  const engine = create(502);
  const openingTask = engine.state.tasks[0];
  openingTask.assignedPlayerIds = [...engine.activeGroup.playerIds];
  openingTask.status = 'active';

  assert.equal(engine.freePlayersForTask().length, 0);
  assert.equal(engine.assignableTaskCards().length, 0);
  assert.equal(engine.currentEventStage(), 'cooking');
  assert.equal(engine.actionAvailable('drawTask'), false);
  assert.equal(engine.actionAvailable('singleTask'), false);
  assert.equal(engine.actionAvailable('teamTask'), false);

  assert.equal(engine.completeTask(openingTask.instanceId, now + 10_000), true);
  assert.equal(engine.freePlayersForTask().length, names.length);
  engine.state.turn.phase = 'resolved';
  assert.equal(engine.endTurn(now + 11_000), true);
  assert.ok(engine.assignableTaskCards().length > 0, 'work-order cards return after the crew is free');
});

test('a completed task cannot be reopened after one of its people received a new task', () => {
  const engine = create(503);
  const completedTask = engine.state.tasks[0];
  assert.equal(engine.completeTask(completedTask.instanceId, now + 1_000), true);
  assert.equal(engine.endTurn(now + 1_500), true);

  engine.state.players.forEach((player) => {
    player.turns = completedTask.assignedPlayerIds.includes(player.id) ? 9 : 0;
  });
  const completedCard = engine.getTaskCard(completedTask);
  const unrelatedCard = engine.assignableTaskCards('team').find((card) => card.questId !== completedCard.questId);
  const newTask = engine.assignTask({ card: unrelatedCard, peopleMode: 'team', now: now + 2_000 });
  assert.ok(newTask);
  assert.ok(newTask.assignedPlayerIds.some((playerId) => completedTask.assignedPlayerIds.includes(playerId)));
  assert.equal(engine.canUndoTaskCompletion(completedTask.instanceId), false);
  assert.equal(engine.undoTaskCompletion(completedTask.instanceId, now + 3_000), false);

  assert.equal(engine.completeTask(newTask.instanceId, now + 4_000), true);
  assert.equal(engine.canUndoTaskCompletion(completedTask.instanceId), true);
});

test('crew and game views make free and occupied task capacity visible', () => {
  const engine = create(504);
  const assignedCount = engine.state.tasks[0].assignedPlayerIds.length;
  const crewHtml = renderCrew(engine, 'de');
  const gameHtml = renderGame(engine, 'de');

  assert.match(crewHtml, /Aufgabe läuft/);
  assert.match(crewHtml, /frei für neue Aufgabe/);
  assert.match(gameHtml, new RegExp(`${names.length - assignedCount}/${names.length} frei für Aufgaben`));
  assert.doesNotMatch(gameHtml, /Deine Küchenaufgaben/);
});

test('the active player sometimes chooses the exact free crew for a task', () => {
  const engine = create(505);
  assert.equal(engine.acceptTaskBriefing(now + 1_000), true);
  const openingTask = engine.state.tasks[0];
  assert.equal(engine.endTurn(now + 1_500), true);

  assert.equal(engine.prepareTaskAssignment({ peopleMode: 'team', now: now + 2_000 }), true);
  assert.equal(engine.state.turn.phase, 'taskAssigneeChoice');
  const pending = engine.state.turn.pendingTaskAssignment;
  assert.ok(pending.requiredPeople >= 2);
  assert.ok(pending.selectedPlayerIds.includes(engine.activePlayer.id), 'the active player is a mandatory assignee');
  assert.equal(pending.selectedPlayerIds.length, pending.requiredPeople, 'the fair turn-count suggestion is preselected');
  assert.equal(engine.toggleTaskAssignee(openingTask.assignedPlayerIds[0]), false, 'busy people are not selectable');

  const available = engine.freePlayersForTask();
  pending.selectedPlayerIds.filter((playerId) => playerId !== engine.activePlayer.id)
    .forEach((playerId) => assert.equal(engine.toggleTaskAssignee(playerId), true));
  const chosen = available
    .filter((player) => player.id !== engine.activePlayer.id && !pending.recommendedPlayerIds.includes(player.id))
    .slice(0, pending.requiredPeople - 1).map((player) => player.id);
  chosen.forEach((playerId) => assert.equal(engine.toggleTaskAssignee(playerId), true));
  const choiceHtml = renderGame(engine, 'de');
  assert.match(choiceHtml, /Crew wählen/);
  assert.match(choiceHtml, new RegExp(`${pending.requiredPeople}/${pending.requiredPeople} ausgewählt`));
  assert.doesNotMatch(choiceHtml, new RegExp(`data-player-id="${openingTask.assignedPlayerIds[0]}"`));

  assert.equal(engine.confirmTaskAssignees(now + 3_000), true);
  assert.equal(engine.state.turn.phase, 'taskBriefing');
  const assigned = engine.state.tasks.find((task) => task.instanceId === engine.state.turn.assignedTaskId);
  assert.deepEqual(assigned.assignedPlayerIds, [engine.activePlayer.id, ...chosen]);

  assert.equal(engine.acceptTaskBriefing(now + 4_000), true);
  assert.equal(engine.completeTask(openingTask.instanceId, now + 5_000), true);
  assert.equal(engine.completeTask(assigned.instanceId, now + 5_000), true);
  assert.equal(engine.endTurn(now + 5_500), true);
  assert.equal(engine.prepareTaskAssignment({ now: now + 6_000 }), true);
  assert.equal(engine.state.turn.phase, 'taskBriefing', 'the following task returns to fair automatic assignment');
  assert.equal(engine.state.turn.pendingTaskAssignment, null);
});

test('automatic helper assignment prefers free players with the most completed turns', () => {
  const engine = create(5_051);
  assert.equal(engine.completeTask(engine.state.tasks[0].instanceId, now + 1_000), true);
  assert.equal(engine.endTurn(now + 1_500), true);
  engine.state.players.forEach((player, index) => { player.turns = index * 3; });
  const card = engine.assignableTaskCards('team')[0];
  assert.ok(card);
  const required = engine.requiredPeopleForTask(card, 'team');
  const expectedHelpers = engine.freePlayersForTask()
    .filter((player) => player.id !== engine.activePlayer.id)
    .sort((a, b) => engine.taskAssignmentPriority(a, b))
    .slice(0, required - 1).map((player) => player.id);
  const assigned = engine.assignTask({ card, peopleMode: 'team', now: now + 2_000 });
  assert.deepEqual(assigned.assignedPlayerIds, [engine.activePlayer.id, ...expectedHelpers]);
});

test('players with running tasks are skipped and a turn resumes when somebody becomes free', () => {
  const engine = create(506);
  const firstPlayerId = engine.activePlayer.id;
  assert.equal(engine.acceptTaskBriefing(now + 1_000), true);
  assert.equal(engine.activePlayer.id, firstPlayerId, 'the opening task is still the first player’s turn');
  assert.equal(engine.state.tasks.length, 1);
  assert.equal(engine.endTurn(now + 1_500), true);
  assert.notEqual(engine.activePlayer.id, firstPlayerId, 'handover skips the opening task owner');

  const currentId = engine.activePlayer.id;
  const task = engine.assignTask({ now: now + 2_000 });
  assert.ok(task.assignedPlayerIds.includes(currentId), 'the active player must join the task they create');
  engine.state.turn.phase = 'resolved';
  assert.equal(engine.endTurn(now + 3_000), true);
  assert.notEqual(engine.activePlayer.id, firstPlayerId);
  assert.notEqual(engine.activePlayer.id, currentId);

  engine.state.players.forEach((player) => {
    if (engine.isPlayerFreeForTask(player.id)) {
      engine.state.tasks.push({
        instanceId: `busy-${player.id}`, taskId: engine.state.tasks[0].taskId, chapterIndex: 0,
        assignedPlayerIds: [player.id], status: 'active', assignedAt: now, startedAt: now,
        timingMode: 'challenge', challengeMinutes: 5, endAt: now + 300_000, alertsSent: [], basketIngredientIds: []
      });
    }
  });
  engine.state.turn.phase = 'resolved';
  engine.endTurn(now + 4_000);
  assert.equal(engine.state.turn.phase, 'crewBusy');
  assert.equal(engine.completeTask(engine.state.tasks[0].instanceId, now + 5_000), true);
  assert.equal(engine.state.turn.phase, 'draw');
});

test('a fully occupied crew resumes strictly after the saved last active player', () => {
  const engine = create(507);
  const taskId = engine.state.tasks[0].taskId;
  const makeBusyTask = (instanceId, assignedPlayerIds) => ({
    instanceId, taskId, chapterIndex: 0, locationIndex: 0, groupId: 'A', coreKey: null,
    assignedPlayerIds, status: 'active', assignedAt: now, startedAt: now,
    timingMode: 'challenge', challengeMinutes: 7, backgroundMinutes: 0,
    challengeEndsAt: now + 420_000, endAt: now + 420_000, readyAt: null,
    completedAt: null, coinDelta: null, challengeResult: null, alertsSent: [], basketIngredientIds: []
  });
  const [p1, p2, p3, p4, p5, p6, p7, p8] = engine.state.players;
  const releasedLater = makeBusyTask('release-two', [p2.id, p5.id]);
  engine.state.tasks = [
    releasedLater,
    makeBusyTask('busy-1-3', [p1.id, p3.id]),
    makeBusyTask('busy-4-6', [p4.id, p6.id]),
    makeBusyTask('busy-7-8', [p7.id, p8.id])
  ];
  engine.state.activePlayerIndex = 2;
  engine.state.turn.phase = 'resolved';

  assert.equal(engine.endTurn(now + 1_000), true);
  assert.equal(engine.state.turn.phase, 'crewBusy');
  assert.equal(engine.state.busyAfterPlayerIndex, 2, 'the last active position is persisted as the resume anchor');
  assert.equal(engine.activePlayer.id, p3.id, 'the active index stays on the last active player while paused');

  const restored = new GameEngine(engine.snapshot());
  assert.equal(restored.state.busyAfterPlayerIndex, 2, 'the anchor survives save and reload');
  assert.equal(restored.completeTask(releasedLater.instanceId, now + 2_000), true);
  assert.equal(restored.state.turn.phase, 'draw');
  assert.equal(restored.activePlayer.id, p5.id, 'from player 3, player 5 is the first newly free player in order');
  assert.equal(restored.state.busyAfterPlayerIndex, null);
  assert.ok(restored.state.history.some((entry) => entry.type === 'crewTurnResumed' &&
    entry.data.afterPlayerId === p3.id && entry.data.playerId === p5.id));
});

test('handover preview skips busy people and explains a completely occupied crew', () => {
  const engine = create(508);
  const busyIds = new Set(engine.state.tasks[0].assignedPlayerIds);
  const activeIndex = engine.state.players.findIndex((player, index) =>
    !busyIds.has(player.id) && busyIds.has(engine.state.players[(index + 1) % engine.state.players.length].id)
  );
  assert.ok(activeIndex >= 0);
  engine.state.activePlayerIndex = activeIndex;
  engine.state.turn.phase = 'resolved';
  const preview = renderGame(engine, 'de');
  const nextPlayer = engine.state.players[engine.nextFreePlayerIndex()];
  assert.match(preview, new RegExp(`Tablet weitergeben an ${nextPlayer.name}`));
  assert.match(preview, /Beschäftigte Personen werden dabei übersprungen/);
  assert.doesNotMatch(preview, /Tablet weitergeben an Ben/);

  const taskId = engine.state.tasks[0].taskId;
  const alreadyBusy = new Set(engine.state.tasks
    .filter((task) => ['queued', 'active', 'ready'].includes(task.status))
    .flatMap((task) => task.assignedPlayerIds));
  engine.state.players.filter((player) => !alreadyBusy.has(player.id)).forEach((player) => engine.state.tasks.push({
    instanceId: `preview-busy-${player.id}`, taskId, chapterIndex: 0,
    assignedPlayerIds: [player.id], status: 'active', assignedAt: now, startedAt: now,
    timingMode: 'challenge', challengeMinutes: 5, endAt: now + 300_000,
    alertsSent: [], basketIngredientIds: []
  }));
  const pausedPreview = renderGame(engine, 'de');
  assert.match(pausedPreview, /Danach pausiert die Zugfolge/);
  assert.match(pausedPreview, /Zug beenden & warten/);
});
