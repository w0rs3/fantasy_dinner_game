import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { EVENT_DECKS } from '../js/data/events.js';
import { CHAPTERS } from '../js/data/chapters.js';
import { MANDATORY_STORY_CARDS } from '../js/data/story-events.js';
import { renderGame } from '../js/ui/game.js';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Eva', 'Finn'];
const now = 1_800_000_000_000;

function createUnlockedEngine(seed = 8101) {
  const engine = GameEngine.create({ names, title: 'Active card choices', defaultLanguage: 'de', seed }, now);
  engine.state.chapter.stage = 'cooking';
  engine.state.eventsDrawn = [...new Set([
    ...engine.state.eventsDrawn,
    ...MANDATORY_STORY_CARDS.map((card) => card.id)
  ])];
  engine.state.visitedLocationIds = CHAPTERS.flatMap((chapter, chapterIndex) =>
    chapter.locations.map((_, locationIndex) => `${chapterIndex}:${locationIndex}`)
  );
  engine.unlockEligibleStoryQuizzes(now);
  engine.state.turn.phase = 'draw';
  return engine;
}

function revealChoiceEvent(engine, archetype) {
  const event = EVENT_DECKS[engine.state.chapterIndex].find((card) => card.archetype === archetype);
  assert.ok(event, `missing ${archetype} fixture`);
  engine.state.turn.currentEventId = event.id;
  engine.state.turn.phase = 'event';
  if (!engine.state.eventsDrawn.includes(event.id)) engine.state.eventsDrawn.push(event.id);
  return engine.currentEvent;
}

test('new event families cover rolled types, chosen types, quiz kinds, and named cards', () => {
  const events = EVENT_DECKS.flat();
  const fate = events.filter((event) => event.archetype === 'card-fate');
  const crossroads = events.filter((event) => event.archetype === 'deck-crossroads');
  const compass = events.filter((event) => event.archetype === 'quiz-compass');
  const gallery = events.filter((event) => event.archetype === 'named-card-gallery');

  assert.equal(fate.length, 36);
  assert.ok(fate.every((event) => event.type === 'dice' &&
    event.outcomes.join('|') === 'drawAnyQuiz|drawSoloFun|drawCoopFun'));
  assert.ok(crossroads.every((event) => event.type === 'choice' &&
    event.options.join('|') === 'drawAnyQuiz|drawSoloFun|drawCoopFun'));
  assert.ok(compass.every((event) => event.options.join('|') === 'drawIslandQuiz|drawLocationQuiz|drawRouteQuiz'));
  assert.ok(gallery.every((event) => event.options.join('|') === 'chooseNamedQuiz|chooseNamedFun'));
});

test('a die-selected card type immediately draws a currently eligible card', () => {
  const engine = createUnlockedEngine(8102);
  revealChoiceEvent(engine, 'card-fate');

  assert.ok(engine.rollDie(now + 1));
  engine.state.turn.dieResult = 1;
  assert.equal(engine.confirmRoll(now + 2), true);
  assert.equal(engine.state.turn.phase, 'event');
  assert.equal(engine.currentEvent.storyKind, 'quiz');
  assert.equal(engine.state.chapter.eventsResolved, 1, 'the wrapping event is resolved before the selected quiz opens');
});

test('the quiz compass draws only the quiz kind chosen by the active player', () => {
  const engine = createUnlockedEngine(8103);
  const event = revealChoiceEvent(engine, 'quiz-compass');
  assert.deepEqual(event.options, ['drawIslandQuiz', 'drawLocationQuiz', 'drawRouteQuiz']);

  assert.equal(engine.resolveChoice('drawRouteQuiz', now + 1), true);
  assert.equal(engine.currentEvent.storyKind, 'quiz');
  assert.equal(engine.currentEvent.quizKind, 'route');
});

test('named quiz offers show three playable titles and consume only the selected card', () => {
  const engine = createUnlockedEngine(8104);
  revealChoiceEvent(engine, 'named-card-gallery');

  assert.equal(engine.resolveChoice('chooseNamedQuiz', now + 1), true);
  assert.equal(engine.state.turn.phase, 'cardChoice');
  const offered = engine.cardOfferCards();
  assert.equal(offered.length, 3);
  assert.ok(offered.every((card) => card.storyKind === 'quiz'));

  const html = renderGame(engine, 'de');
  assert.equal((html.match(/data-action="choose-offered-card"/g) ?? []).length, 3);
  offered.forEach((card) => assert.match(html, new RegExp(card.title.de)));

  const selected = offered[1];
  const unselectedIds = offered.filter((card) => card.id !== selected.id).map((card) => card.id);
  assert.equal(engine.chooseOfferedCard(selected.id, now + 2), true);
  assert.equal(engine.currentEvent.id, selected.id);
  assert.ok(unselectedIds.every((id) => engine.state.storyQuizQueue.includes(id)));
  assert.equal(engine.state.storyQuizQueue.includes(selected.id), false);
});

test('named fun offers contain public playable cards and start exactly the selected challenge', () => {
  const engine = createUnlockedEngine(8105);
  revealChoiceEvent(engine, 'named-card-gallery');

  assert.equal(engine.resolveChoice('chooseNamedFun', now + 1), true);
  const offered = engine.cardOfferCards();
  assert.ok(offered.length >= 2 && offered.length <= 3);
  assert.ok(offered.every((card) => !card.secret));

  const selected = offered.at(-1);
  const unselectedIds = offered.filter((card) => card.id !== selected.id).map((card) => card.id);
  assert.equal(engine.chooseOfferedCard(selected.id, now + 2), true);
  assert.equal(engine.state.turn.phase, 'watch');
  assert.equal(engine.currentWatchChallenge.id, selected.id);
  assert.ok(engine.state.funCardsDrawn.includes(selected.id));
  assert.ok(unselectedIds.every((id) => !engine.state.funCardsDrawn.includes(id)));
});
