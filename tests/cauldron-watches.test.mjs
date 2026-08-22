import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { TASK_DECKS } from '../js/data/tasks.js';
import { renderTasks } from '../js/ui/overlays.js';

const now = 1_800_400_000_000;
const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Ella', 'Finn', 'Greta', 'Hugo'];

function instanceFor(card, index, status = 'done', watchInterval = null) {
  return {
    instanceId: `cauldron-test-${card.blueprintIndex}-${index}-${watchInterval ?? 0}`,
    taskId: card.id,
    chapterIndex: 1,
    locationIndex: 2,
    groupId: 'A',
    coreKey: null,
    assignedPlayerIds: [`player-${index + 1}`],
    status,
    assignedAt: now,
    startedAt: now,
    endAt: now + 300_000,
    challengeEndsAt: now + 300_000,
    readyAt: status === 'ready' ? now + 300_000 : null,
    completedAt: status === 'done' ? now + 300_000 : null,
    timingMode: card.timingMode,
    challengeMinutes: card.challengeMinutes,
    backgroundMinutes: card.backgroundMinutes,
    challengeCoinValue: status === 'done' ? 0 : null,
    challengeResult: status === 'done' ? 'background' : null,
    coinDelta: status === 'done' ? 0 : null,
    alertsSent: [],
    basketIngredientIds: [],
    watchInterval
  };
}

function createAtWatch() {
  const engine = GameEngine.create({ names, title: 'Cauldron decisions', defaultLanguage: 'de', seed: 8_201 }, now);
  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(now + 10), true);
  const clearing = engine.state.tasks.find((instance) => engine.getTaskCard(instance)?.questId === 'reset');
  assert.equal(engine.completeTask(clearing.instanceId, now + 20), true);
  engine.state.chapter.courseStyle = 'cream';
  engine.state.menu[1].courseStyle = 'cream';

  const cauldronStart = TASK_DECKS[1].find((card) => card.questId === 'cauldron' && !card.repeatOnRelief);
  const watch = TASK_DECKS[1].find((card) => card.repeatOnRelief);
  engine.state.tasks.push(instanceFor(cauldronStart, 0));
  const current = instanceFor(watch, 1, 'ready', 1);
  engine.state.tasks.push(current);
  engine.state.chapter.cauldronWatchIntervals = 1;
  engine.reconcileTaskQueue(1);
  return { engine, current, watch };
}

function assignRequeuedWatch(engine, watch, previousPlayerId, timestamp) {
  const nextIndex = engine.state.players.findIndex((player, index) => {
    if (player.id === previousPlayerId || !engine.isPlayerFreeForTask(player.id)) return false;
    engine.state.activePlayerIndex = index;
    return engine.taskHandoffAllowed(watch);
  });
  assert.ok(nextIndex >= 0);
  engine.state.activePlayerIndex = nextIndex;
  engine.state.turn.phase = 'draw';
  engine.state.turn.tasksAssignedThisTurn = 0;
  const nextCard = engine.taskCardCandidates().find((card) => card.id === watch.id);
  assert.ok(nextCard, 'the same watch card must be assignable from the top of the task deck');
  const nextWatch = engine.assignTask({ card: nextCard, now: timestamp });
  assert.ok(nextWatch);
  assert.notEqual(nextWatch.assignedPlayerIds[0], previousPlayerId);
  assert.equal(engine.startTask(nextWatch.instanceId, timestamp + 1), true);
  return nextWatch;
}

test('the cauldron voyage contains one recurring watch card with no numbered successors', () => {
  const watches = TASK_DECKS[1].filter((card) => card.questId === 'cauldron' && card.timingMode === 'background');
  assert.equal(watches.length, 1);
  assert.equal(watches[0].title.de, 'Kesselwache');
  assert.equal(watches[0].repeatOnRelief, true);
  assert.ok(!TASK_DECKS[1].some((card) => /Erste|Zweite|Dritte Kesselwache/.test(card.title.de)));
});

test('a cauldron watch offers soup-ready or relief instead of a generic completion button', () => {
  const { engine, current } = createAtWatch();
  const html = renderTasks(engine, 'de');

  assert.match(html, new RegExp(`data-action="resolve-cauldron-watch" data-decision="soupReady" data-task-id="${current.instanceId}"`));
  assert.match(html, new RegExp(`data-action="resolve-cauldron-watch" data-decision="relieve" data-task-id="${current.instanceId}"`));
  assert.match(html, /Suppe ist fertig/);
  assert.match(html, /Kesselwache ablösen/);
  assert.match(html, /ohne feste Obergrenze/);
  assert.doesNotMatch(html, new RegExp(`data-action="complete-task" data-task-id="${current.instanceId}"`));
});

test('confirming doneness completes the recurring watch and removes it from the stack', () => {
  const { engine, current, watch } = createAtWatch();
  assert.equal(engine.completeCauldronWatch(current.instanceId, 'soupReady', now + 400_000), true);
  assert.equal(current.status, 'done');
  assert.equal(engine.state.chapter.soupReady, true);
  assert.equal(engine.taskAppliesToCourse(watch), false);
  assert.ok(!engine.state.taskQueues[1].includes(watch.id));
  assert.equal(engine.canUndoTaskCompletion(current.instanceId), false);
});

test('relief completes one interval and puts the same card back on top for another player', () => {
  const { engine, current, watch } = createAtWatch();
  const previousPlayerId = current.assignedPlayerIds[0];
  assert.equal(engine.completeCauldronWatch(current.instanceId, 'relieve', now + 400_000), true);
  assert.equal(current.status, 'done');
  assert.equal(engine.state.chapter.soupReady, false);
  assert.equal(engine.state.taskQueues[1][0], watch.id);

  const nextWatch = assignRequeuedWatch(engine, watch, previousPlayerId, now + 410_000);
  assert.equal(nextWatch.taskId, current.taskId);
  assert.equal(nextWatch.watchInterval, 2);
});

test('the same watch can be relieved beyond fifteen minutes until the soup is actually ready', () => {
  const { engine, watch } = createAtWatch();
  let current = engine.state.tasks.find((instance) => instance.taskId === watch.id && instance.status === 'ready');
  let timestamp = now + 300_000;

  for (let relief = 0; relief < 4; relief += 1) {
    const previousPlayerId = current.assignedPlayerIds[0];
    assert.equal(engine.completeCauldronWatch(current.instanceId, 'relieve', timestamp), true);
    assert.equal(engine.state.taskQueues[1][0], watch.id);
    current = assignRequeuedWatch(engine, watch, previousPlayerId, timestamp + 1_000);
    timestamp += 300_000;
  }

  assert.equal(engine.state.chapter.cauldronWatchIntervals, 5);
  assert.equal(engine.state.tasks.filter((instance) => instance.taskId === watch.id).length, 5);
  assert.ok(timestamp - now > 15 * 60_000);
  assert.equal(engine.completeCauldronWatch(current.instanceId, 'soupReady', timestamp), true);
  assert.equal(engine.state.chapter.soupReady, true);
  assert.ok(!engine.state.taskQueues[1].includes(watch.id));
});
