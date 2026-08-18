import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { renderGame } from '../js/ui/game.js';
import { EVENT_DECKS, WATCH_CHALLENGES } from '../js/data/events.js';

const now = 1_800_300_000_000;
const names = ['Anne', 'Ben', 'Cara', 'Dario', 'Elif', 'Finn'];

function startChallenge(id, seed = 700, targetPlayerId = null) {
  const engine = GameEngine.create({ names, title: id, defaultLanguage: 'de', seed }, now);
  engine.state.tasks.forEach((task) => { task.status = 'done'; });
  engine.state.turn = { ...engine.state.turn, phase: 'draw' };
  engine.state.chapter.queuedChallenges.push({
    id,
    targetPlayerId: targetPlayerId ?? engine.state.players[1].id
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

test('a real break is only offered when every open kitchen task is completed', () => {
  const engine = GameEngine.create({ names, title: 'Break safety', defaultLanguage: 'de', seed: 714 }, now);
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
  const secretIndex = WATCH_CHALLENGES.indexOf(secret);
  const event = EVENT_DECKS[0].find((card) =>
    card.locationIndex === 0 && card.stage === 'cooking' && card.type === 'choice' && card.options.includes('watchChallenge')
  );
  assert.ok(event);
  engine.state.chapter.stage = 'cooking';
  engine.state.taskQueues[0] = [];
  engine.state.chapter.watchChallenges = secretIndex;
  engine.state.turn.currentEventId = event.id;
  engine.state.turn.phase = 'event';

  const html = renderGame(engine, 'de');
  assert.match(html, /Geheime Challenge nur für Anne ziehen · nicht vorlesen/);
  assert.doesNotMatch(html, new RegExp(secret.de));
});
