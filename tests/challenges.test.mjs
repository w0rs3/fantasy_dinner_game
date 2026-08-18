import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { renderGame } from '../js/ui/game.js';
import { EVENT_DECKS, WATCH_CHALLENGES } from '../js/data/events.js';
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

test('the portion captain uses a player choice instead of a challenge timer and remains visible for serving', () => {
  const engine = startChallenge('portion-captain', 717);
  const chosen = engine.state.players[3];

  const before = renderGame(engine, 'de');
  assert.match(before, /data-action="choose-watch-player"/);
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

  assert.equal(first.length, 100);
  assert.equal(new Set(first).size, 100);
  assert.deepEqual(first, repeated, 'the same seed recreates the same shuffled deck');
  assert.notDeepEqual(first.slice(0, 20), second.slice(0, 20), 'different voyages receive different opening orders');
  assert.equal(new Set(Array.from({ length: 12 }, (_, index) => order(8_100 + index)
    .find((id) => !WATCH_CHALLENGES.find((challenge) => challenge.id === id)?.followUpOnly && id !== 'five-minute-break'))).size > 3, true);
});
