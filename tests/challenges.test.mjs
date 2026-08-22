import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { renderGame } from '../js/ui/game.js';
import { EVENT_DECKS, WATCH_CHALLENGES } from '../js/data/events.js';
import { TASK_DECKS } from '../js/data/tasks.js';
import { addOpeningTask } from './test-helpers.mjs';

const now = 1_800_300_000_000;
const names = ['Anne', 'Ben', 'Cara', 'Dario', 'Elif', 'Finn'];

function startChallenge(id, seed = 700, targetPlayerId = null) {
  const engine = GameEngine.create({ names, title: id, defaultLanguage: 'de', seed }, now);
  engine.state.tasks.forEach((task) => { task.status = 'done'; });
  engine.state.turn = { ...engine.state.turn, phase: 'draw' };
  engine.state.chapter.queuedChallenges.push({
    id,
    targetPlayerId: targetPlayerId ?? engine.state.players[engine.nextFreePlayerIndex()].id
  });
  assert.equal(engine.startWatchChallenge('watchChallenge', now + 100), true);
  assert.equal(engine.currentWatchChallenge.id, id);
  return engine;
}

test('multi-turn challenges activate and hand over instead of blocking the current turn', () => {
  const engine = startChallenge('compliments');
  const ownerId = engine.activePlayer.id;
  const html = renderGame(engine, 'de');
  assert.match(html, /data-action="activate-watch"/);
  assert.match(html, /Geheime Challenge starten &amp; Tablet weitergeben|Geheime Challenge starten & Tablet weitergeben/);
  assert.match(html, /Nicht vorlesen, nicht zeigen und der Gruppe nicht erklären/);
  assert.match(html, /Die Aktion beginnt erst mit dem Button/);
  assert.doesNotMatch(html, /data-watch-timer/);

  assert.equal(engine.activateOngoingWatchChallenge(now + 200), true);
  assert.equal(engine.state.turn.phase, 'resolved');
  assert.equal(engine.state.activeChallenges.length, 1);
  assert.equal(engine.state.coins, 0, 'coins are awarded only after the promised behaviour ran');

  assert.equal(engine.endTurn(now + 300), true);
  assert.notEqual(engine.activePlayer.id, ownerId);
  assert.equal(engine.state.activeChallenges.length, 1);

  while (engine.activePlayer.id !== ownerId) {
    engine.state.turn.phase = 'resolved';
    assert.equal(engine.endTurn(now + 400 + engine.activePlayer.turns), true);
  }
  assert.equal(engine.state.activeChallenges.length, 0);
  assert.equal(engine.state.coins, 1);
  assert.ok(engine.state.history.some((entry) => entry.type === 'watchChallengeCompleted' && entry.data.reason === 'ownerNextTurn'));
});

test('speech rules and captain permission last until the owner next receives the turn', () => {
  for (const [index, id] of ['aye-aye-sentences', 'arr-sentences', 'captain-permission'].entries()) {
    const engine = startChallenge(id, 710 + index);
    const ownerId = engine.activePlayer.id;
    const targetName = engine.state.players.find((player) => player.id === engine.state.turn.watchTargetPlayerId).name;
    const html = renderGame(engine, 'de');
    if (id === 'captain-permission') {
      assert.match(html, new RegExp(targetName));
      assert.doesNotMatch(html, /\{targetPlayer\}/);
    }
    assert.equal(engine.currentWatchChallenge.flow, 'ongoing');
    assert.equal(engine.currentWatchChallenge.endTrigger, 'ownerNextTurn');
    assert.equal(engine.activateOngoingWatchChallenge(now + 200 + index), true);
    assert.equal(engine.state.activeChallenges.at(-1).ownerPlayerId, ownerId);
  }
});

test('target-turn and linked chicken challenges resolve at the correct later moment', () => {
  const laughter = startChallenge('laugh-turn', 701);
  const targetId = laughter.state.turn.watchTargetPlayerId;
  laughter.activateOngoingWatchChallenge(now + 200);
  laughter.endTurn(now + 300);
  assert.equal(laughter.activePlayer.id, targetId);
  assert.equal(laughter.state.activeChallenges.length, 1);
  laughter.state.turn.phase = 'resolved';
  laughter.endTurn(now + 400);
  assert.equal(laughter.state.activeChallenges.length, 0);
  assert.equal(laughter.state.coins, 1);

  const chicken = startChallenge('chicken', 702);
  const cursedPlayerId = chicken.activePlayer.id;
  chicken.activateOngoingWatchChallenge(now + 500);
  assert.equal(chicken.state.activeChallenges[0].endTrigger, 'followUp');
  chicken.endTurn(now + 600);
  assert.equal(chicken.state.chapter.queuedChallenges.length, 0, 'the antidote must not appear for the next player');
  assert.equal(chicken.state.chapter.scheduledChallenges.length, 1);
  const scheduled = chicken.state.chapter.scheduledChallenges[0];
  assert.ok(scheduled.delayTurns >= 3 && scheduled.delayTurns <= 5);
  while (chicken.state.turnsElapsed < scheduled.dueTurn) {
    chicken.state.turn.phase = 'resolved';
    chicken.endTurn(now + 610 + chicken.state.turnsElapsed);
  }
  chicken.beginEvent(now + 700);
  assert.equal(chicken.currentWatchChallenge.id, 'stop-chicken');
  assert.equal(chicken.state.turn.watchTargetPlayerId, cursedPlayerId);
  assert.equal(chicken.currentWatchChallenge.mandatory, true);
  assert.equal(chicken.state.turn.watchStartedAt, now + 700, 'mandatory instructions start as soon as they appear');
  const mandatoryHtml = renderGame(chicken, 'de');
  assert.match(mandatoryHtml, new RegExp(chicken.state.players.find((player) => player.id === cursedPlayerId).name));
  assert.match(mandatoryHtml, /Verbindliche geheime Anweisung/);
  assert.match(mandatoryHtml, /data-action="complete-watch"/);
  assert.doesNotMatch(mandatoryHtml, /\{targetPlayer\}|data-action="start-watch"/);
  assert.equal(chicken.completeWatchChallenge(now + 800), true);
  assert.equal(chicken.state.activeChallenges.length, 0);
  assert.equal(chicken.state.coins, 2, 'curse and antidote both pay only after the antidote');
});

test('every linked counter-card ends its matching curse and follow-ups block serving until resolved', () => {
  const engine = startChallenge('nose-voice', 715);
  engine.activateOngoingWatchChallenge(now + 200);
  const dueTurn = engine.state.chapter.scheduledChallenges[0].dueTurn;
  engine.state.taskQueues[0] = [];
  engine.state.tasks.forEach((task) => { task.status = 'done'; });
  engine.state.groups.forEach((group) => { group.finished = true; });
  assert.equal(engine.evaluateChapter(now + 250).followUpsResolved, false);
  while (engine.state.turnsElapsed < dueTurn) {
    engine.state.turn.phase = 'resolved';
    engine.endTurn(now + 300 + engine.state.turnsElapsed);
  }
  engine.state.turn.phase = 'draw';
  engine.beginEvent(now + 500);
  assert.equal(engine.currentWatchChallenge.id, 'stop-nose');
  assert.equal(engine.completeWatchChallenge(now + 600), true);
  assert.equal(engine.state.activeChallenges.some((challenge) => challenge.challengeId === 'nose-voice'), false);
  assert.equal(engine.unresolvedFollowUpCount(), 0);
});

test('an ongoing challenge cannot be dealt to two people at the same time', () => {
  const engine = startChallenge('chicken', 706);
  assert.equal(engine.activateOngoingWatchChallenge(now + 200), true);
  engine.state.chapter.queuedChallenges = [];
  engine.state.turn.phase = 'draw';
  engine.state.chapter.challengeIdsByRound[String(engine.state.chapter.round)] = WATCH_CHALLENGES
    .filter((challenge) => !challenge.followUpOnly && challenge.id !== 'five-minute-break' && challenge.id !== 'chicken')
    .map((challenge) => challenge.id);

  assert.equal(engine.startWatchChallenge('watchChallenge', now + 300), true);
  assert.notEqual(engine.currentWatchChallenge.id, 'chicken');
});

test('short physical challenges remain immediate', () => {
  const engine = startChallenge('clear-surface', 703);
  assert.equal(engine.currentWatchChallenge.flow, 'immediate');
  assert.equal(engine.activateOngoingWatchChallenge(now + 200), false);
  assert.equal(engine.completeWatchChallenge(now + 300), true);
  assert.equal(engine.state.turn.phase, 'resolved');
  assert.equal(engine.state.activeChallenges.length, 0);
});

test('the audited challenge deck uses success and failure only for objectively failable cards', () => {
  const skillChecks = WATCH_CHALLENGES.filter((challenge) => challenge.skillCheck);
  const newDexterityIds = [
    'skill-one-leg', 'skill-thumb-ladder', 'skill-paper-catch',
    'skill-paper-balance', 'skill-opposite-feet', 'skill-opposite-circles'
  ];

  assert.equal(skillChecks.length, 15);
  assert.ok(skillChecks.every((challenge) =>
    challenge.flow === 'immediate' && !challenge.secret && challenge.successCoins === 3 && challenge.failureCoins === -2
  ));
  assert.ok(newDexterityIds.every((id) => {
    const challenge = WATCH_CHALLENGES.find((entry) => entry.id === id);
    return challenge?.skillCheck && challenge.dexterity && [15, 30].includes(challenge.durationSeconds);
  }));
  assert.equal(WATCH_CHALLENGES.find((challenge) => challenge.id === 'pirate-weather').skillCheck, false,
    'a playful performance with no real failure condition remains a one-button challenge');
});

test('dexterity cards show exactly two result buttons and award their success score', () => {
  const engine = startChallenge('skill-one-leg', 8_301);
  const startedAt = engine.state.turn.watchStartedAt;
  engine.state.coins = 10;
  engine.activePlayer.roleId = 'cook';

  assert.equal(engine.state.turn.watchEndsAt - startedAt, 15_000);
  const html = renderGame(engine, 'de');
  assert.match(html, /Geschicklichkeits-Challenge/);
  assert.match(html, /15 Sekunden auf einem Bein/);
  assert.equal((html.match(/data-action="resolve-watch-outcome"/g) ?? []).length, 2);
  assert.match(html, /data-outcome="success"[^>]*>Hat geklappt · \+3 Münzen/);
  assert.match(html, /data-outcome="failure"[^>]*>Gescheitert · −2 Münzen/);
  assert.doesNotMatch(html, /data-action="complete-watch"/);
  assert.equal(engine.completeWatchChallenge(now + 200), false, 'a scored challenge cannot bypass its result');

  assert.equal(engine.resolveWatchChallengeOutcome('success', now + 300), true);
  assert.equal(engine.state.coins, 13);
  assert.equal(engine.state.turn.watchOutcome, 'success');
  assert.equal(engine.state.turn.watchCoinDelta, 3);
  assert.equal(engine.state.turn.outcomeCode, 'watchSuccess');
  assert.match(renderGame(engine, 'de'), /Challenge geschafft · \+3 Münzen/);
});

test('failed challenges lose coins and preview lucky or unlucky passive modifiers', () => {
  for (const [roleId, expectedLoss, expectedCoins] of [
    ['lucky', 1, 9],
    ['unlucky', 3, 7]
  ]) {
    const engine = startChallenge('skill-paper-balance', roleId === 'lucky' ? 8_302 : 8_303);
    engine.state.coins = 10;
    engine.activePlayer.roleId = roleId;
    const html = renderGame(engine, 'de');
    assert.match(html, new RegExp(`Gescheitert · −${expectedLoss} Münzen`));

    assert.equal(engine.resolveWatchChallengeOutcome('failure', now + 500), true);
    assert.equal(engine.state.coins, expectedCoins);
    assert.equal(engine.state.turn.watchOutcome, 'failure');
    assert.equal(engine.state.turn.watchCoinDelta, -expectedLoss);
    assert.equal(engine.state.turn.outcomeCode, 'watchFailure');
    assert.match(renderGame(engine, 'de'), new RegExp(`Challenge gescheitert · −${expectedLoss} Münzen`));
  }
});

test('ordinary fun cards keep their single completion button after the audit', () => {
  const engine = startChallenge('pirate-weather', 8_304);
  const html = renderGame(engine, 'de');
  assert.equal((html.match(/data-action="complete-watch"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /data-action="resolve-watch-outcome"/);
  assert.equal(engine.completeWatchChallenge(now + 600), true);
  assert.equal(engine.state.coins, 1);
});

test('one-minute kitchen-themed challenges never interrupt active kitchen work', () => {
  for (const id of ['clear-surface', 'sort-tools']) {
    const engine = startChallenge(id, id === 'clear-surface' ? 708 : 709);
    const challenge = engine.currentWatchChallenge;
    assert.equal(challenge.minutes, 1);
    assert.match(challenge.de, /aktive Person/);
    assert.match(challenge.de, /Küchenarbeit/);
    assert.doesNotMatch(challenge.de, /Räumt gemeinsam|Sortiert Messer/);
    const html = renderGame(engine, 'de');
    assert.match(html, /60 Sekunden/);
    assert.match(html, /data-action="complete-watch"/);
  }
});

test('conditional challenges enter the draw pool only after their real prerequisites are met', () => {
  const engine = GameEngine.create({ names, title: 'Conditional deck', defaultLanguage: 'de', seed: 717 }, now);
  const candidateIds = () => engine.watchChallengeCandidates().map((challenge) => challenge.id);

  assert.equal(candidateIds().includes('ingredient-round'), false, 'the opening crew has not used enough ingredients yet');
  addOpeningTask(engine, now + 10);
  assert.equal(candidateIds().includes('next-steps'), true, 'the opening task makes the next-steps challenge meaningful');

  engine.state.ingredients.slice(0, names.length - 1).forEach((ingredient) => { ingredient.status = 'used'; });
  assert.equal(candidateIds().includes('ingredient-round'), false, 'one ingredient per person is required');
  engine.state.ingredients[names.length - 1].status = 'used';
  assert.equal(candidateIds().includes('ingredient-round'), true);

  const openingTask = engine.state.tasks[0];
  openingTask.status = 'done';
  openingTask.completedAt = now + 500;
  assert.equal(candidateIds().includes('next-steps'), false);
  assert.equal(candidateIds().includes('timer-check'), false);

  openingTask.status = 'active';
  openingTask.startedAt = now;
  openingTask.endAt = now + 60_000;
  assert.equal(candidateIds().includes('timer-check'), true);
  openingTask.status = 'ready';
  assert.equal(candidateIds().includes('timer-check'), true, 'overtime is still a meaningful timer state');
});

test('the long main-course oven journey allows more fun cards and prefers available co-op challenges', () => {
  const engine = GameEngine.create({ names, title: 'Oven interludes', defaultLanguage: 'de', seed: 7_181 }, now);
  const ovenStart = TASK_DECKS[3].find((card) => card.questId === 'oven');
  const cooperative = WATCH_CHALLENGES.find((challenge) => challenge.cooperative && !challenge.followUpOnly && !challenge.requirements.length);
  const solo = WATCH_CHALLENGES.find((challenge) => !challenge.cooperative && !challenge.followUpOnly && challenge.id !== 'five-minute-break' && !challenge.requirements.length);

  engine.state.chapterIndex = 3;
  engine.state.chapter.stage = 'tasks';
  engine.state.tasks = [{
    instanceId: 'main-oven-started', taskId: ovenStart.id, chapterIndex: 3,
    groupId: 'A', assignedPlayerIds: [engine.state.players[0].id], status: 'done',
    assignedAt: now, startedAt: now, completedAt: now + 1
  }];
  engine.state.funCardQueue = [solo.id, cooperative.id];
  engine.state.funCardsDrawn = [];
  engine.state.chapter.funCardIdsDrawn = [];

  assert.equal(engine.mainOvenJourneyStarted(), true);
  assert.equal(engine.watchChallengeCandidates()[0].id, cooperative.id);
  engine.state.chapter.funCardIdsDrawn = Array.from({ length: 16 }, (_, index) => `main-fun-${index}`);
  assert.ok(engine.watchChallengeCandidates().length > 0, 'the main course remains playful beyond the normal per-course limit');
  engine.state.chapter.funCardIdsDrawn = Array.from({ length: 24 }, (_, index) => `main-fun-${index}`);
  assert.equal(engine.watchChallengeCandidates().length, 0);
});

test('a real break is only offered when every open kitchen task is completed', () => {
  const engine = GameEngine.create({ names, title: 'Break safety', defaultLanguage: 'de', seed: 714 }, now);
  addOpeningTask(engine, now + 10);
  const event = EVENT_DECKS[0].find((card) => card.archetype === 'respite');
  const task = engine.state.tasks[0];
  engine.state.chapter.stage = 'cooking';
  engine.state.taskQueues[0] = [];
  engine.state.turn.currentEventId = event.id;
  engine.state.turn.phase = 'event';

  for (const status of ['queued', 'active', 'ready']) {
    task.status = status;
    assert.equal(engine.hasOpenTasks(), true);
    assert.equal(engine.actionAvailable('fiveMinuteBreak'), false);
    assert.ok(!engine.currentEvent.options.includes('fiveMinuteBreak'));
    const blockedHtml = renderGame(engine, 'de');
    assert.doesNotMatch(blockedHtml, /data-choice="fiveMinuteBreak"/);
    assert.match(blockedHtml, /Die Pausenoption erscheint erst, wenn alle offenen Küchenaufgaben erledigt markiert sind/);
    assert.equal(engine.startWatchChallenge('fiveMinuteBreak', now + 200), false);
  }

  task.status = 'done';
  assert.equal(engine.hasOpenTasks(), false);
  assert.equal(engine.actionAvailable('fiveMinuteBreak'), true);
  assert.ok(engine.currentEvent.options.includes('fiveMinuteBreak'));
  const availableHtml = renderGame(engine, 'de');
  assert.match(availableHtml, /data-choice="fiveMinuteBreak"/);
  assert.doesNotMatch(availableHtml, /Noch keine Pause/);
  assert.equal(engine.resolveChoice('fiveMinuteBreak', now + 300), true);
  assert.equal(engine.currentWatchChallenge.id, 'five-minute-break');
  assert.equal(engine.state.turn.phase, 'watch');
});

test('the pirate verse event accepts either a song or a dramatic poem', () => {
  const engine = startChallenge('pirate-verse', 707);
  const challenge = engine.currentWatchChallenge;
  assert.equal(challenge.secret, false);
  assert.equal(challenge.flow, 'immediate');
  const html = renderGame(engine, 'de');
  assert.match(html, /Die Ballade der wilden Kombüse/);
  assert.match(html, /Piratenlied oder Piratengedicht/);
  assert.match(html, /Singt es gemeinsam oder tragt es dramatisch vor/);
  assert.match(html, /data-action="complete-watch"/);
  assert.equal(engine.completeWatchChallenge(now + 500), true);
  assert.equal(engine.state.coins, 1);
});

test('private one-person challenges require an explicit start before completion', () => {
  const engine = startChallenge('table-lap', 704);
  assert.equal(engine.currentWatchChallenge.secret, true);
  assert.equal(engine.state.turn.watchStartedAt, null);
  assert.equal(engine.completeWatchChallenge(now + 200), false, 'reading the card does not start or complete it');

  const before = renderGame(engine, 'de');
  assert.match(before, /Noch nicht gestartet/);
  assert.match(before, /data-action="start-watch"/);
  assert.match(before, /Geheime Challenge starten/);

  assert.equal(engine.startWatchChallengeAction(now + 300), true);
  assert.equal(engine.startWatchChallengeAction(now + 301), false, 'the start boundary is unique');
  assert.equal(engine.state.turn.watchStartedAt, now + 300);
  const running = renderGame(engine, 'de');
  assert.match(running, /Die geheime Challenge läuft jetzt/);
  assert.match(running, /data-action="complete-watch"/);
  assert.equal(engine.completeWatchChallenge(now + 400), true);
});

test('event choices never reveal a secret challenge before it is drawn', () => {
  const engine = GameEngine.create({ names, title: 'Private preview', defaultLanguage: 'de', seed: 705 }, now);
  const secret = WATCH_CHALLENGES.find((challenge) => challenge.id === 'compliments');
  const event = EVENT_DECKS[0].find((card) =>
    card.locationIndex === 0 && card.stage === 'cooking' && card.type === 'choice' && card.options.includes('watchChallenge')
  );
  assert.ok(event);
  engine.state.chapter.stage = 'cooking';
  engine.state.taskQueues[0] = [];
  engine.state.funCardQueue = [secret.id, ...engine.state.funCardQueue.filter((id) => id !== secret.id)];
  engine.state.turn.currentEventId = event.id;
  engine.state.turn.phase = 'event';

  const html = renderGame(engine, 'de');
  assert.match(html, new RegExp(`Geheime Challenge nur für ${engine.activePlayer.name} ziehen · nicht vorlesen`));
  assert.doesNotMatch(html, new RegExp(secret.de));
});

test('strange encounters offer accepting the challenge or losing coins instead of a free reward', () => {
  const engine = GameEngine.create({ names, title: 'Meaningful choice', defaultLanguage: 'de', seed: 716 }, now);
  const event = EVENT_DECKS[0].find((card) => card.archetype === 'interlude');
  engine.state.chapter.stage = 'cooking';
  engine.state.taskQueues[0] = [];
  engine.state.turn.currentEventId = event.id;
  engine.state.turn.phase = 'event';

  const html = renderGame(engine, 'de');
  assert.match(html, /Challenge annehmen:/);
  assert.match(html, /Challenge ablehnen · −5 Münzen/);
  assert.doesNotMatch(html, /Gewinnt zwei Münzen/);

  engine.state.coins = 20;
  assert.equal(engine.resolveChoice('coinLoss', now + 1), true);
  assert.equal(engine.state.coins, 15, 'declining the challenge costs exactly five coins');
});

test('ingredient-round fun choices offer one challenge or a five-coin loss without duplicate rewards', () => {
  const engine = GameEngine.create({ names, title: 'Pantry choice', defaultLanguage: 'de', seed: 719 }, now);
  const event = EVENT_DECKS[0].find((card) => card.archetype === 'pantry-mischief');
  const secret = WATCH_CHALLENGES.find((challenge) => challenge.id === 'compliments');
  assert.deepEqual(event.options, ['watchChallenge', 'coinLoss']);
  engine.state.chapter.stage = 'ingredients';
  engine.state.funCardQueue = [secret.id, ...engine.state.funCardQueue.filter((id) => id !== secret.id)];
  engine.state.turn.currentEventId = event.id;
  engine.state.turn.phase = 'event';

  const html = renderGame(engine, 'de');
  assert.match(html, new RegExp(`Challenge annehmen: Geheime Challenge nur für ${engine.activePlayer.name} ziehen · nicht vorlesen`));
  assert.match(html, /Challenge ablehnen · −5 Münzen/);
  assert.doesNotMatch(html, /\+2 Münzen|Gewinnt zwei Münzen/);
  assert.equal((html.match(/data-action="resolve-choice"/g) ?? []).length, 2);
});

test('the portion captain uses a player choice instead of a challenge timer and remains visible for serving', () => {
  const engine = startChallenge('portion-captain', 717);
  const chosen = engine.state.players[3];

  const before = renderGame(engine, 'de');
  assert.match(before, /data-action="choose-watch-player"/);
  assert.doesNotMatch(before, /Als Portionswache auswählen/);
  assert.match(before, /data-action="confirm-watch-player" disabled/);
  assert.doesNotMatch(before, /data-watch-timer|Challenge abgeschlossen/);

  assert.equal(engine.selectWatchChallengePlayer(chosen.id), true);
  const selected = renderGame(engine, 'de');
  assert.match(selected, new RegExp(`${chosen.name}[\\s\\S]*data-selected="true"|data-selected="true"[\\s\\S]*${chosen.name}`));
  assert.match(selected, /data-action="confirm-watch-player" >/);
  assert.equal(engine.confirmWatchChallengePlayer(now + 200), true);
  assert.equal(engine.state.chapter.portionCaptainPlayerId, chosen.id);
  assert.equal(engine.state.turn.phase, 'resolved');

  engine.state.chapter.readyToServe = true;
  engine.state.turn.phase = 'chapterReady';
  const readyHtml = renderGame(engine, 'de');
  assert.match(readyHtml, new RegExp(`Portionswache: ${chosen.name}`));
  assert.match(readyHtml, /data-action="serve-course">Gemeinsam essen</);
  assert.doesNotMatch(readyHtml, /Servieren &amp; gemeinsam essen|Servieren & gemeinsam essen/);
  assert.equal(engine.serveCourse(now + 300), true);
  assert.equal(engine.state.menu[0].portionCaptainPlayerId, chosen.id);
});

test('a fun card can be drawn only once during the entire voyage', () => {
  const engine = startChallenge('pirate-weather', 718);
  assert.deepEqual(engine.state.funCardsDrawn, ['pirate-weather']);
  assert.equal(engine.completeWatchChallenge(now + 200), true);

  engine.state.chapterIndex = 1;
  engine.state.chapter.funCardIdsDrawn = [];
  engine.state.turn.phase = 'draw';
  engine.state.turn.currentEventId = null;
  engine.state.chapter.queuedChallenges.push({ id: 'pirate-weather', targetPlayerId: engine.activePlayer.id });
  assert.equal(engine.startWatchChallenge('watchChallenge', now + 300), true);
  assert.notEqual(engine.currentWatchChallenge.id, 'pirate-weather');
  assert.equal(engine.state.funCardsDrawn.filter((id) => id === 'pirate-weather').length, 1);
  assert.equal(new Set(engine.state.funCardsDrawn).size, engine.state.funCardsDrawn.length);
});

test('the complete fun-card deck is randomly shuffled per voyage and reproducible by seed', () => {
  const order = (seed) => GameEngine.create({ names, title: `Fun deck ${seed}`, defaultLanguage: 'de', seed }, now)
    .state.funCardQueue;
  const first = order(8_001);
  const repeated = order(8_001);
  const second = order(8_002);

  assert.equal(first.length, 139);
  assert.equal(new Set(first).size, 139);
  assert.deepEqual(first, repeated, 'the same seed recreates the same shuffled deck');
  assert.notDeepEqual(first.slice(0, 20), second.slice(0, 20), 'different voyages receive different opening orders');
  assert.equal(new Set(Array.from({ length: 12 }, (_, index) => order(8_100 + index)
    .find((id) => !WATCH_CHALLENGES.find((challenge) => challenge.id === id)?.followUpOnly && id !== 'five-minute-break'))).size > 3, true);
});

test('co-op fun cards enter the pool only with enough task-free partners', () => {
  const engine = GameEngine.create({ names, title: 'Co-op availability', defaultLanguage: 'de', seed: 8_201 }, now);
  const pairCard = WATCH_CHALLENGES.find((challenge) => challenge.cooperative && challenge.partnerCount === 1);
  const trioCard = WATCH_CHALLENGES.find((challenge) => challenge.cooperative && challenge.partnerCount === 2);
  const otherPlayers = engine.state.players.filter((player) => player.id !== engine.activePlayer.id);
  engine.state.funCardQueue = [trioCard.id, pairCard.id, ...engine.state.funCardQueue.filter((id) => ![trioCard.id, pairCard.id].includes(id))];
  otherPlayers.slice(1).forEach((player, index) => engine.state.tasks.push({
    instanceId: `busy-coop-${index}`, taskId: 'A1-03', chapterIndex: 0,
    assignedPlayerIds: [player.id], status: 'active', assignedAt: now, startedAt: now
  }));

  let cooperativeIds = engine.watchChallengeCandidates().filter((challenge) => challenge.cooperative).map((challenge) => challenge.id);
  assert.ok(cooperativeIds.includes(pairCard.id));
  assert.equal(cooperativeIds.includes(trioCard.id), false);

  engine.state.tasks.push({
    instanceId: 'busy-last-partner', taskId: 'A1-03', chapterIndex: 0,
    assignedPlayerIds: [otherPlayers[0].id], status: 'active', assignedAt: now, startedAt: now
  });
  cooperativeIds = engine.watchChallengeCandidates().filter((challenge) => challenge.cooperative).map((challenge) => challenge.id);
  assert.deepEqual(cooperativeIds, []);
});

test('a co-op card names only free partners and renders its complete crew', () => {
  const engine = GameEngine.create({ names, title: 'Co-op draw', defaultLanguage: 'de', seed: 8_202 }, now);
  const trioCard = WATCH_CHALLENGES.find((challenge) => challenge.id === 'coop-three-voice-chorus');
  engine.state.funCardQueue = [trioCard.id, ...engine.state.funCardQueue.filter((id) => id !== trioCard.id)];
  assert.equal(engine.startWatchChallenge('watchChallenge', now + 100), true);
  assert.equal(engine.currentWatchChallenge.id, trioCard.id);
  assert.equal(engine.state.turn.watchPartnerPlayerIds.length, 2);
  assert.equal(new Set(engine.state.turn.watchPartnerPlayerIds).size, 2);
  assert.ok(engine.state.turn.watchPartnerPlayerIds.every((playerId) =>
    playerId !== engine.activePlayer.id && engine.isPlayerFreeForTask(playerId)
  ));

  const partnerNames = engine.state.turn.watchPartnerPlayerIds
    .map((playerId) => engine.state.players.find((player) => player.id === playerId).name);
  const html = renderGame(engine, 'de');
  assert.match(html, /Koop-Zeitfüller/);
  assert.match(html, /Beteiligte/);
  [engine.activePlayer.name, ...partnerNames].forEach((name) => assert.match(html, new RegExp(name)));
  assert.doesNotMatch(html, /\{partner2?\}|\{activePlayer\}/);
});
