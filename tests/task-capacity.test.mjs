import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { renderGame } from '../js/ui/game.js';
import { renderCrew } from '../js/ui/overlays.js';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Ella', 'Finn', 'Greta', 'Hugo'];
const now = 1_800_100_000_000;

function create(seed = 501) {
  return GameEngine.create({ names, title: 'Crew capacity', defaultLanguage: 'de', seed }, now);
}

test('new tasks are assigned only to crew members without an open task', () => {
  const engine = create();
  assert.equal(engine.acceptTaskBriefing(now + 1_000), true);

  const firstTask = engine.state.tasks[0];
  const secondTask = engine.assignTask({ now: now + 2_000 });
  assert.ok(secondTask, 'a second parallel task should fit into an eight-person crew');
  assert.deepEqual(
    firstTask.assignedPlayerIds.filter((playerId) => secondTask.assignedPlayerIds.includes(playerId)),
    [],
    'parallel tasks must never share a person'
  );

  while (engine.assignTask({ now: now + 3_000 })) {
    // Fill every currently possible work order while assigned people remain busy.
  }

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
  assert.ok(engine.assignableTaskCards().length > 0, 'work-order cards return after the crew is free');
});

test('a completed task cannot be reopened after one of its people received a new task', () => {
  const engine = create(503);
  const completedTask = engine.state.tasks[0];
  assert.equal(engine.completeTask(completedTask.instanceId, now + 1_000), true);

  engine.state.players.forEach((player) => {
    player.taskMarkers = completedTask.assignedPlayerIds.includes(player.id) ? 0 : 2;
  });
  const newTask = engine.assignTask({ now: now + 2_000 });
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
});

test('the active player sometimes chooses the exact free crew for a task', () => {
  const engine = create(505);
  assert.equal(engine.acceptTaskBriefing(now + 1_000), true);
  const openingTask = engine.state.tasks[0];

  assert.equal(engine.prepareTaskAssignment({ peopleMode: 'team', now: now + 2_000 }), true);
  assert.equal(engine.state.turn.phase, 'taskAssigneeChoice');
  const pending = engine.state.turn.pendingTaskAssignment;
  assert.ok(pending.requiredPeople >= 2);
  assert.deepEqual(pending.selectedPlayerIds, [engine.activePlayer.id], 'the active player is a mandatory assignee');
  assert.equal(engine.toggleTaskAssignee(openingTask.assignedPlayerIds[0]), false, 'busy people are not selectable');

  const available = engine.freePlayersForTask();
  const chosen = available.filter((player) => player.id !== engine.activePlayer.id).slice(-(pending.requiredPeople - 1)).map((player) => player.id);
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
  engine.state.turn.phase = 'draw';
  assert.equal(engine.prepareTaskAssignment({ now: now + 6_000 }), true);
  assert.equal(engine.state.turn.phase, 'taskBriefing', 'the following task returns to fair automatic assignment');
  assert.equal(engine.state.turn.pendingTaskAssignment, null);
});

test('players with running tasks are skipped and a turn resumes when somebody becomes free', () => {
  const engine = create(506);
  const firstPlayerId = engine.activePlayer.id;
  assert.equal(engine.acceptTaskBriefing(now + 1_000), true);
  assert.notEqual(engine.activePlayer.id, firstPlayerId, 'the opening task owner is skipped immediately');

  const currentId = engine.activePlayer.id;
  const task = engine.assignTask({ now: now + 2_000 });
  assert.ok(task.assignedPlayerIds.includes(currentId), 'the active player must join the task they create');
  engine.state.turn.phase = 'resolved';
  assert.equal(engine.endTurn(now + 3_000), true);
  assert.notEqual(engine.activePlayer.id, firstPlayerId);
  assert.notEqual(engine.activePlayer.id, currentId);

  engine.state.players.slice(2).forEach((player) => {
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
