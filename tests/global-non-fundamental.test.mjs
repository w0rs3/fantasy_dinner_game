import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { WATCH_CHALLENGES } from '../js/data/events.js';
import { STORY_QUIZ_CARDS } from '../js/data/story-events.js';
import { TASK_DECKS } from '../js/data/tasks.js';

const names = ['Anne', 'Ben', 'Cara', 'Dario', 'Elif', 'Finn'];
const now = 1_800_600_000_000;

function create(seed = 9_001) {
  return GameEngine.create({ names, title: 'Global deck regression', defaultLanguage: 'de', seed }, now);
}

function activateChallenge(engine, challengeId, timestamp = now + 10) {
  engine.state.turn.phase = 'draw';
  engine.state.nonFundamentalQueue = [
    challengeId,
    ...engine.state.nonFundamentalQueue.filter((id) => id !== challengeId)
  ];
  assert.equal(engine.startWatchChallenge('watchChallenge', timestamp, {}, challengeId), true);
  if (engine.currentWatchChallenge.secret) assert.equal(engine.revealSecretWatchChallenge(timestamp + 1), true);
  assert.equal(engine.activateOngoingWatchChallenge(timestamp + 2), true);
}

test('only secret-trigger curses and charades use the privacy screen', () => {
  const secretCards = WATCH_CHALLENGES.filter((card) => card.secret);
  assert.ok(secretCards.length > 0);
  assert.ok(secretCards.every((card) =>
    card.cardKind === 'charade' || (card.cardKind === 'curse' && card.endTrigger === 'secretTrigger')
  ));
  assert.ok(WATCH_CHALLENGES.filter((card) => card.cardKind === 'charade').every((card) => card.secret));
  assert.equal(WATCH_CHALLENGES.find((card) => card.id === 'folded-note').secret, false);
  assert.equal(WATCH_CHALLENGES.find((card) => card.id === 'folded-note').cardKind, 'fun');
});

test('unlocking quizzes never shuffles cards before a locked blessing', () => {
  const engine = create(9_002);
  activateChallenge(engine, 'chicken');
  const blessingId = engine.state.nonFundamentalLockedCardId;
  const lockIndex = engine.state.nonFundamentalQueue.indexOf(blessingId);
  assert.ok(lockIndex >= 3 && lockIndex <= 10);
  const lockedPrefix = engine.state.nonFundamentalQueue.slice(0, lockIndex + 1);

  engine.state.eventsDrawn.push('SI1');
  const newlyUnlocked = engine.unlockEligibleStoryQuizzes(now + 20);
  assert.ok(newlyUnlocked.some((id) => STORY_QUIZ_CARDS.find((quiz) => quiz.id === id)?.sourceStoryId === 'SI1'));
  assert.deepEqual(engine.state.nonFundamentalQueue.slice(0, lockIndex + 1), lockedPrefix);
  assert.equal(engine.state.nonFundamentalQueue[lockIndex], blessingId);
});

test('curses stay in the deck but cannot be drawn after the final fundamental card', () => {
  const engine = create(9_003);
  engine.state.tasks = TASK_DECKS[0].filter((card) => card.playable).map((card, index) => ({
    instanceId: `done-${index}`,
    taskId: card.id,
    chapterIndex: 0,
    groupId: 'A',
    assignedPlayerIds: [],
    status: 'done',
    assignedAt: now,
    startedAt: now,
    completedAt: now + 2
  }));
  engine.state.taskQueues[0] = [];
  engine.state.pendingLocationStoryIds = [];
  assert.equal(engine.fundamentalCardsComplete(), true);

  const curse = WATCH_CHALLENGES.find((card) => card.id === 'pirate-word-curse');
  const fun = WATCH_CHALLENGES.find((card) => card.id === 'folded-note');
  engine.state.nonFundamentalQueue = [curse.id, fun.id];
  engine.state.turn.phase = 'draw';
  const drawn = engine.drawNonFundamentalCard(now + 3);
  assert.equal(drawn.id, fun.id);
  assert.ok(engine.state.nonFundamentalQueue.includes(curse.id), 'the deferred curse remains available for a later island');

  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(now + 4), true);
  assert.ok(engine.state.nonFundamentalQueue.includes(curse.id));
  assert.equal(engine.nonFundamentalCardAvailable(curse.id), true);
});

test('secret curse triggers release only matching curses owned by another player', () => {
  const engine = create(9_004);
  activateChallenge(engine, 'pirate-word-curse');
  const curse = engine.state.activeChallenges.find((entry) => entry.challengeId === 'pirate-word-curse');
  assert.ok(curse);
  assert.equal(engine.resolveSecretTriggerCurses('shipWord', now + 20, engine.state.players[1].id), 0);
  assert.equal(engine.resolveSecretTriggerCurses('pirateWord', now + 21, curse.ownerPlayerId), 0);
  assert.equal(engine.resolveSecretTriggerCurses('pirateWord', now + 22, engine.state.players[1].id), 1);
  assert.equal(engine.state.activeChallenges.includes(curse), false);
});

test('a correct quiz and a standing fun card resolve their matching secret curses', () => {
  const quizEngine = create(9_005);
  activateChallenge(quizEngine, 'correct-quiz-curse');
  quizEngine.state.eventsDrawn.push('SI1');
  quizEngine.unlockEligibleStoryQuizzes(now + 20);
  const quizId = quizEngine.state.nonFundamentalQueue.find((id) =>
    STORY_QUIZ_CARDS.some((quiz) => quiz.id === id && quiz.sourceStoryId === 'SI1')
  );
  quizEngine.state.nonFundamentalQueue = [quizId];
  quizEngine.state.turn.phase = 'draw';
  const quiz = quizEngine.drawNonFundamentalCard(now + 21);
  assert.equal(quizEngine.answerStoryQuiz(quiz.correctAnswerId, now + 22), true);
  assert.equal(quizEngine.state.activeChallenges.some((entry) => entry.challengeId === 'correct-quiz-curse'), false);

  const standingEngine = create(9_006);
  activateChallenge(standingEngine, 'standing-fun-curse');
  assert.equal(standingEngine.endTurn(now + 29), true);
  const standing = WATCH_CHALLENGES.find((card) => card.standing && card.flow === 'immediate' && !card.secret);
  assert.ok(standing);
  standingEngine.state.turn.phase = 'draw';
  standingEngine.state.nonFundamentalQueue = [standing.id];
  assert.equal(standingEngine.startWatchChallenge('watchChallenge', now + 30, {}, standing.id), true);
  assert.equal(standingEngine.completeWatchChallenge(now + 31), true);
  assert.equal(standingEngine.state.activeChallenges.some((entry) => entry.challengeId === 'standing-fun-curse'), false);
});
