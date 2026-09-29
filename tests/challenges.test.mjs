import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { renderGame } from '../js/ui/game.js';
import { EVENT_DECKS, WATCH_CHALLENGES } from '../js/data/events.js';
import { TASK_DECKS } from '../js/data/tasks.js';
import { addOpeningTask } from './test-helpers.mjs';

const now = 1_800_300_000_000;
const names = ['Anne', 'Ben', 'Cara', 'Dario', 'Elif', 'Finn'];

const DURATION_WORDS = Object.freeze({
  five: 5, ten: 10, fifteen: 15, twenty: 20, thirty: 30, 'forty-five': 45, sixty: 60,
  fünf: 5, zehn: 10, fünfzehn: 15, zwanzig: 20, dreißig: 30, fünfundvierzig: 45, sechzig: 60
});

function statedDurations(challenge) {
  const values = [];
  const pattern = /(\d+|five|ten|fifteen|twenty|thirty|forty-five|sixty|fünf|zehn|fünfzehn|zwanzig|dreißig|fünfundvierzig|sechzig)[ -]?(?:sekünd\w*|seconds?)/gi;
  for (const text of [challenge.de, challenge.en]) {
    for (const match of text.matchAll(pattern)) {
      values.push(Number(match[1]) || DURATION_WORDS[match[1].toLowerCase()]);
    }
  }
  return [...new Set(values)];
}

function startChallenge(id, seed = 700, targetPlayerId = null, autoStart = true) {
  const engine = GameEngine.create({ names, title: id, defaultLanguage: 'de', seed }, now);
  engine.state.tasks.forEach((task) => { task.status = 'done'; });
  engine.state.turn = { ...engine.state.turn, phase: 'draw' };
  engine.state.chapter.queuedChallenges.push({
    id,
    targetPlayerId: targetPlayerId ?? engine.state.players[engine.nextFreePlayerIndex()].id
  });
  assert.equal(engine.startWatchChallenge('watchChallenge', now + 100), true);
  assert.equal(engine.currentWatchChallenge.id, id);
  if (autoStart && !engine.currentWatchChallenge.secret && engine.currentWatchChallenge.flow === 'immediate' &&
    engine.currentWatchChallenge.cardKind === 'fun' && !engine.currentWatchChallenge.playerSelection) {
    assert.equal(engine.startWatchChallengeAction(now + 110), true);
  }
  return engine;
}

test('timed public fun cards wait for an explicit start after the instructions are read', () => {
  for (const [id, durationSeconds] of [['pirate-weather', 20], ['skill-one-leg', 15]]) {
    const engine = startChallenge(id, id === 'pirate-weather' ? 7_030 : 8_300, null, false);
    assert.equal(engine.state.turn.watchStartedAt, null);
    assert.equal(engine.state.turn.watchEndsAt, null);
    assert.equal(engine.completeWatchChallenge(now + 150), false);

    const instructions = renderGame(engine, 'de');
    assert.match(instructions, /data-action="start-watch"[^>]*>Challenge starten/);
    assert.match(instructions, /Lest zuerst in Ruhe die vollständige Anweisung/);
    assert.doesNotMatch(instructions, /data-watch-timer/);
    assert.doesNotMatch(instructions, /data-action="complete-watch"|data-action="resolve-watch-outcome"/);

    assert.equal(engine.startWatchChallengeAction(now + 200), true);
    assert.equal(engine.state.turn.watchEndsAt - engine.state.turn.watchStartedAt, durationSeconds * 1000);
    const running = renderGame(engine, 'de');
    assert.match(running, /data-watch-timer/);
    assert.doesNotMatch(running, /data-action="start-watch"/);
  }
});

test('public multi-turn challenges show their instructions, then activate and hand over', () => {
  const engine = startChallenge('compliments');
  const ownerId = engine.activePlayer.id;
  const html = renderGame(engine, 'de');
  assert.match(html, /Rückenwind für die Crew|ehrliches, kurzes Kompliment/);
  assert.match(html, /data-action="activate-watch"/);
  assert.match(html, /Challenge starten &amp; Tablet weitergeben|Challenge starten & Tablet weitergeben/);
  assert.doesNotMatch(html, /Geheime Challenge|reveal-secret-watch|secret-instruction|Nicht vorlesen/);
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
    assert.equal(engine.currentWatchChallenge.secret, false);
    assert.equal(engine.revealSecretWatchChallenge(now + 150 + index), false);
    assert.equal(engine.currentWatchChallenge.flow, 'ongoing');
    assert.equal(engine.currentWatchChallenge.endTrigger, 'ownerNextTurn');
    assert.equal(engine.activateOngoingWatchChallenge(now + 200 + index), true);
    assert.equal(engine.state.activeChallenges.at(-1).ownerPlayerId, ownerId);
  }
});

test('target-turn and linked chicken challenges resolve at the correct later moment', () => {
  const laughter = startChallenge('laugh-turn', 701);
  const targetId = laughter.state.turn.watchTargetPlayerId;
  laughter.revealSecretWatchChallenge(now + 150);
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
  assert.equal(chicken.currentWatchChallenge.secret, false, 'linked curses reveal their rule because their blessing is not a secret trigger');
  chicken.activateOngoingWatchChallenge(now + 500);
  assert.equal(chicken.state.activeChallenges[0].endTrigger, 'followUp');
  chicken.endTurn(now + 600);
  const blessingId = chicken.state.nonFundamentalLockedCardId;
  const blessingIndex = chicken.state.nonFundamentalQueue.indexOf(blessingId);
  assert.equal(blessingId, 'stop-chicken');
  assert.ok(blessingIndex >= 3 && blessingIndex <= 10, 'the blessing is locked three to ten global cards later');
  assert.equal(chicken.unresolvedFollowUpCount(), 1);
  chicken.state.nonFundamentalQueue.splice(0, blessingIndex);
  chicken.state.chapter.stage = 'cooking';
  chicken.state.turn.phase = 'draw';
  chicken.drawNonFundamentalCard(now + 700);
  assert.equal(chicken.currentWatchChallenge.id, 'stop-chicken');
  assert.equal(chicken.state.turn.watchTargetPlayerId, cursedPlayerId);
  assert.equal(chicken.currentWatchChallenge.mandatory, true);
  assert.equal(chicken.currentWatchChallenge.cardKind, 'blessing');
  assert.notEqual(chicken.state.turn.watchStartedAt, null, 'blessings are public cards');
  const mandatoryAnnouncement = renderGame(chicken, 'de');
  assert.match(mandatoryAnnouncement, /Segen: Ruhe im Hühnerstall/);
  assert.doesNotMatch(mandatoryAnnouncement, /reveal-secret-watch|\{targetPlayer\}/);
  assert.equal(chicken.completeWatchChallenge(now + 800), true);
  assert.equal(chicken.state.activeChallenges.length, 0);
  assert.equal(chicken.state.coins, 2, 'curse and antidote both pay only after the antidote');
});

test('every linked counter-card ends its matching curse and follow-ups block serving until resolved', () => {
  const engine = startChallenge('nose-voice', 715);
  engine.activateOngoingWatchChallenge(now + 200);
  const blessingId = engine.state.nonFundamentalLockedCardId;
  const blessingIndex = engine.state.nonFundamentalQueue.indexOf(blessingId);
  assert.equal(blessingId, 'stop-nose');
  assert.ok(blessingIndex >= 3 && blessingIndex <= 10);
  engine.state.taskQueues[0] = [];
  engine.state.tasks.forEach((task) => { task.status = 'done'; });
  engine.state.groups.forEach((group) => { group.finished = true; });
  assert.equal(engine.evaluateChapter(now + 250).followUpsResolved, false);
  engine.state.nonFundamentalQueue.splice(0, blessingIndex);
  engine.state.chapter.stage = 'cooking';
  engine.state.turn.phase = 'draw';
  engine.drawNonFundamentalCard(now + 500);
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
    .filter((challenge) => !challenge.followUpOnly && challenge.id !== 'chicken')
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

test('every duration stated on a fun card matches its actual countdown', () => {
  WATCH_CHALLENGES.forEach((challenge) => {
    const durations = statedDurations(challenge);
    assert.ok(durations.length <= 1, `${challenge.id} states conflicting durations: ${durations.join(', ')}`);
    if (durations.length) assert.equal(challenge.durationSeconds, durations[0], challenge.id);
  });
});

test('the source event beneath a fun-card title uses the dark subtitle class', () => {
  const engine = startChallenge('pirate-weather', 7_031);
  assert.equal(engine.state.turn.watchEndsAt - engine.state.turn.watchStartedAt, 20_000);
  const sourceEvent = EVENT_DECKS[0].find((event) => event.archetype === 'mischief');
  engine.state.turn.currentEventId = sourceEvent.id;
  const html = renderGame(engine, 'de');
  assert.match(html, new RegExp(`<p class="event-subtitle">${sourceEvent.title.de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.doesNotMatch(html, new RegExp(`<p class="muted">${sourceEvent.title.de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
});

test('the audited challenge deck uses success and failure only for objectively failable cards', () => {
  const skillChecks = WATCH_CHALLENGES.filter((challenge) => challenge.skillCheck);
  const newDexterityIds = [
    'skill-one-leg', 'skill-thumb-ladder', 'skill-paper-catch',
    'skill-paper-balance', 'skill-opposite-feet', 'skill-opposite-circles'
  ];
  const charadeIds = [
    'charade-anchor', 'charade-parrot', 'charade-treasure-chest', 'charade-storm-ship',
    'charade-lighthouse', 'charade-cannon', 'charade-seasick-pirate', 'charade-buried-treasure'
  ];

  assert.equal(skillChecks.length, 23);
  assert.ok(skillChecks.every((challenge) =>
    challenge.flow === 'immediate' && challenge.successCoins === 3 && challenge.failureCoins === -2
  ));
  assert.ok(skillChecks.filter((challenge) => !charadeIds.includes(challenge.id)).every((challenge) => !challenge.secret));
  assert.ok(charadeIds.every((id) => {
    const challenge = WATCH_CHALLENGES.find((entry) => entry.id === id);
    return challenge?.skillCheck && challenge.secret && challenge.charade && !challenge.dexterity &&
      challenge.durationSeconds === 60 && challenge.requirements.includes('twoFreeGuessers');
  }));
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

test('secret charades hide the answer, start a one-minute guessing round, and score both outcomes', () => {
  const success = startChallenge('charade-anchor', 8_304);
  success.state.coins = 10;
  const announcement = renderGame(success, 'de');
  assert.match(announcement, /Geheimes Event|data-action="reveal-secret-watch"/);
  assert.doesNotMatch(announcement, /schweren Schiffsanker|Scharade: Der schwere Anker/);
  assert.equal(success.resolveWatchChallengeOutcome('success', now + 150), false);

  assert.equal(success.revealSecretWatchChallenge(now + 160), true);
  const revealed = renderGame(success, 'de');
  assert.match(revealed, /schweren Schiffsanker|Scharade: Der schwere Anker/);
  assert.match(revealed, /data-action="start-watch"/);
  assert.doesNotMatch(revealed, /data-action="resolve-watch-outcome"/);

  assert.equal(success.startWatchChallengeAction(now + 200), true);
  assert.equal(success.state.turn.watchEndsAt - success.state.turn.watchStartedAt, 60_000);
  const running = renderGame(success, 'de');
  assert.equal((running.match(/data-action="resolve-watch-outcome"/g) ?? []).length, 2);
  assert.match(running, /Erraten · \+3 Münzen/);
  assert.match(running, /Nicht erraten · −2 Münzen/);
  assert.equal(success.resolveWatchChallengeOutcome('success', now + 300), true);
  assert.equal(success.state.coins, 13);
  assert.match(renderGame(success, 'de'), /Scharade erraten · \+3 Münzen/);

  const failure = startChallenge('charade-parrot', 8_305);
  failure.state.coins = 10;
  assert.equal(failure.revealSecretWatchChallenge(now + 400), true);
  assert.equal(failure.startWatchChallengeAction(now + 410), true);
  assert.equal(failure.resolveWatchChallengeOutcome('failure', now + 500), true);
  assert.equal(failure.state.coins, 8);
  assert.equal(failure.state.turn.watchOutcome, 'failure');
  assert.match(renderGame(failure, 'de'), /Scharade nicht erraten · −2 Münzen/);
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

test('the long main-course oven journey keeps drawing from the global deck and prefers available co-op challenges', () => {
  const engine = GameEngine.create({ names, title: 'Oven interludes', defaultLanguage: 'de', seed: 7_181 }, now);
  const ovenStart = TASK_DECKS[3].find((card) => card.questId === 'oven');
  const cooperative = WATCH_CHALLENGES.find((challenge) => challenge.cooperative && !challenge.followUpOnly && !challenge.requirements.length);
  const solo = WATCH_CHALLENGES.find((challenge) => !challenge.cooperative && !challenge.followUpOnly && !challenge.requirements.length);

  engine.state.chapterIndex = 3;
  engine.state.chapter.stage = 'tasks';
  engine.state.tasks = [{
    instanceId: 'main-oven-started', taskId: ovenStart.id, chapterIndex: 3,
    groupId: 'A', assignedPlayerIds: [engine.state.players[0].id], status: 'done',
    assignedAt: now, startedAt: now, completedAt: now + 1
  }];
  engine.state.nonFundamentalQueue = [solo.id, cooperative.id];
  engine.state.funCardsDrawn = [];
  engine.state.chapter.funCardIdsDrawn = [];

  assert.equal(engine.mainOvenJourneyStarted(), true);
  assert.equal(engine.watchChallengeCandidates()[0].id, cooperative.id);
  engine.state.chapter.funCardIdsDrawn = Array.from({ length: 16 }, (_, index) => `main-fun-${index}`);
  assert.ok(engine.watchChallengeCandidates().length > 0, 'the main course remains playful beyond the normal per-course limit');
  engine.state.chapter.funCardIdsDrawn = Array.from({ length: 143 }, (_, index) => `main-fun-${index}`);
  assert.ok(engine.watchChallengeCandidates().length > 0, 'the main course keeps enough interludes for a long oven run');
  engine.state.chapter.funCardIdsDrawn = Array.from({ length: 144 }, (_, index) => `main-fun-${index}`);
  assert.ok(engine.watchChallengeCandidates().length > 0, 'there is no per-course fun-card limit');
});

test('break suggestion cards are absent from events and the challenge deck', () => {
  assert.equal(EVENT_DECKS.flat().some((card) => card.archetype === 'respite'), false);
  assert.equal(EVENT_DECKS.flat().some((card) => (card.options ?? card.outcomes ?? []).includes('fiveMinuteBreak')), false);
  assert.equal(WATCH_CHALLENGES.some((challenge) => challenge.id === 'five-minute-break'), false);
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

test('private jokes are public general fun cards without a secret reveal', () => {
  const engine = startChallenge('folded-note', 704);
  assert.equal(engine.currentWatchChallenge.secret, false);
  assert.equal(engine.currentWatchChallenge.cardKind, 'fun');
  const html = renderGame(engine, 'de');
  assert.match(html, /streng geheime Nachricht/);
  assert.doesNotMatch(html, /reveal-secret-watch|secret-instruction|Geheimes Event/);
  assert.equal(engine.completeWatchChallenge(now + 400), true);
});

test('event choices never reveal a secret challenge before it is drawn', () => {
  const engine = GameEngine.create({ names, title: 'Private preview', defaultLanguage: 'de', seed: 705 }, now);
  const secret = WATCH_CHALLENGES.find((challenge) => challenge.id === 'charade-anchor');
  const event = EVENT_DECKS[0].find((card) =>
    card.locationIndex === 0 && card.stage === 'cooking' && card.type === 'choice' && card.options.includes('watchChallenge')
  );
  assert.ok(event);
  engine.state.chapter.stage = 'cooking';
  engine.state.taskQueues[0] = [];
  engine.state.nonFundamentalQueue = [secret.id, ...engine.state.nonFundamentalQueue.filter((id) => id !== secret.id)];
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
  const event = EVENT_DECKS[1].find((card) => card.archetype === 'pantry-mischief');
  const publicJoke = WATCH_CHALLENGES.find((challenge) => challenge.id === 'folded-note');
  assert.deepEqual(event.options, ['watchChallenge', 'coinLoss']);
  engine.state.chapter.stage = 'ingredients';
  engine.state.nonFundamentalQueue = [publicJoke.id, ...engine.state.nonFundamentalQueue.filter((id) => id !== publicJoke.id)];
  engine.state.turn.currentEventId = event.id;
  engine.state.turn.phase = 'event';

  const html = renderGame(engine, 'de');
  assert.match(html, /Challenge annehmen:.*Nicht sagen, was hier draufsteht/s);
  assert.doesNotMatch(html, /nicht vorlesen|Geheime Challenge nur/);
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

test('the complete challenge set is present once in the shuffled global deck', () => {
  const order = (seed) => GameEngine.create({ names, title: `Fun deck ${seed}`, defaultLanguage: 'de', seed }, now)
    .state.nonFundamentalQueue.filter((id) => WATCH_CHALLENGES.some((challenge) => challenge.id === id));
  const first = order(8_001);
  const repeated = order(8_001);
  const second = order(8_002);

  const expected = WATCH_CHALLENGES.filter((challenge) => !challenge.followUpOnly).length;
  assert.equal(first.length, expected);
  assert.equal(new Set(first).size, expected);
  assert.deepEqual(first, repeated, 'the same seed recreates the same shuffled deck');
  assert.notDeepEqual(first.slice(0, 20), second.slice(0, 20), 'different voyages receive different opening orders');
  assert.equal(new Set(Array.from({ length: 12 }, (_, index) => order(8_100 + index)
    .find((id) => !WATCH_CHALLENGES.find((challenge) => challenge.id === id)?.followUpOnly))).size > 3, true);
});

test('co-op fun cards enter the pool only with enough task-free partners', () => {
  const engine = GameEngine.create({ names, title: 'Co-op availability', defaultLanguage: 'de', seed: 8_201 }, now);
  const pairCard = WATCH_CHALLENGES.find((challenge) => challenge.cooperative && challenge.partnerCount === 1);
  const trioCard = WATCH_CHALLENGES.find((challenge) => challenge.cooperative && challenge.partnerCount === 2);
  const otherPlayers = engine.state.players.filter((player) => player.id !== engine.activePlayer.id);
  engine.state.nonFundamentalQueue = [trioCard.id, pairCard.id, ...engine.state.nonFundamentalQueue.filter((id) => ![trioCard.id, pairCard.id].includes(id))];
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

test('secret charades enter the deck only while at least two guessers are free', () => {
  const engine = GameEngine.create({ names, title: 'Charade availability', defaultLanguage: 'de', seed: 8_206 }, now);
  const charade = WATCH_CHALLENGES.find((challenge) => challenge.id === 'charade-anchor');
  const otherPlayers = engine.state.players.filter((player) => player.id !== engine.activePlayer.id);
  engine.state.nonFundamentalQueue = [charade.id, ...engine.state.nonFundamentalQueue.filter((id) => id !== charade.id)];
  otherPlayers.slice(2).forEach((player, index) => engine.state.tasks.push({
    instanceId: `busy-charade-${index}`, taskId: 'A1-03', chapterIndex: 0,
    assignedPlayerIds: [player.id], status: 'active', assignedAt: now, startedAt: now
  }));
  assert.ok(engine.watchChallengeCandidates().some((challenge) => challenge.id === charade.id));

  engine.state.tasks.push({
    instanceId: 'busy-second-guesser', taskId: 'A1-03', chapterIndex: 0,
    assignedPlayerIds: [otherPlayers[1].id], status: 'active', assignedAt: now, startedAt: now
  });
  assert.equal(engine.watchChallengeCandidates().some((challenge) => challenge.id === charade.id), false);
});

test('a co-op card names only free partners and renders its complete crew', () => {
  const engine = GameEngine.create({ names, title: 'Co-op draw', defaultLanguage: 'de', seed: 8_202 }, now);
  const trioCard = WATCH_CHALLENGES.find((challenge) => challenge.id === 'coop-three-voice-chorus');
  engine.state.nonFundamentalQueue = [trioCard.id, ...engine.state.nonFundamentalQueue.filter((id) => id !== trioCard.id)];
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
  assert.match(html, /Koop-Kurzchallenge/);
  assert.match(html, /Beteiligte/);
  [engine.activePlayer.name, ...partnerNames].forEach((name) => assert.match(html, new RegExp(name)));
  assert.doesNotMatch(html, /\{partner2?\}|\{activePlayer\}/);
});
