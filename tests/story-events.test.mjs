import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { CHAPTERS } from '../js/data/chapters.js';
import {
  LOCATION_STORY_CARDS,
  STORY_CARDS,
  STORY_QUIZ_CARDS,
  validateStoryCatalog
} from '../js/data/story-events.js';
import { renderCardCatalog } from '../js/ui/card-catalog.js';
import { renderGame } from '../js/ui/game.js';
import { simulateGame } from '../tools/simulation-lib.mjs';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Eva', 'Finn'];
const now = 1_801_000_000_000;
const create = (seed = 91_001) => GameEngine.create({ names, title: 'Story voyage', defaultLanguage: 'de', seed }, now);

test('story catalog contains one story, two detail questions per location, and four route questions per island', () => {
  assert.deepEqual(validateStoryCatalog(), {
    total: 132,
    locationStories: 36,
    quizzes: 96,
    detailQuizzes: 72,
    routeQuizzes: 24,
    valid: true
  });
  assert.equal(STORY_CARDS.length, 132);
  assert.equal(new Set(STORY_CARDS.map((card) => card.id)).size, STORY_CARDS.length);

  for (let chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex += 1) {
    const locations = CHAPTERS[chapterIndex].locations;
    assert.equal(LOCATION_STORY_CARDS.filter((card) => card.chapterIndex === chapterIndex).length, locations.length);
    assert.equal(STORY_QUIZ_CARDS.filter((card) => card.chapterId === CHAPTERS[chapterIndex].id && card.quizKind === 'detail').length, locations.length * 2);
    assert.equal(STORY_QUIZ_CARDS.filter((card) => card.chapterId === CHAPTERS[chapterIndex].id && card.quizKind === 'route').length, 4);
    for (let locationIndex = 0; locationIndex < locations.length; locationIndex += 1) {
      const story = LOCATION_STORY_CARDS.find((card) => card.chapterIndex === chapterIndex && card.locationIndex === locationIndex);
      assert.ok(story?.mandatory);
      for (const language of ['de', 'en']) {
        const sentences = story.story[language].match(/[^.!?]+[.!?]/g) ?? [];
        assert.ok(sentences.length >= 3 && sentences.length <= 5, `${story.id} ${language} has ${sentences.length} sentences`);
      }
      assert.equal(STORY_QUIZ_CARDS.filter((card) => card.quizKind === 'detail' && card.sourceStoryId === story.id).length, 2);
    }
  }
  assert.ok(STORY_QUIZ_CARDS.every((card) => card.answers.length === 3 && card.answers.filter((answer) => answer.id === card.correctAnswerId).length === 1));
});

test('the first visit puts its required story above ordinary events and the UI makes reading it explicit', () => {
  const engine = create();
  engine.activePlayer.roleId = 'scout';
  engine.activePlayer.activeUsesRemaining = 2;
  const story = engine.beginEvent(now + 1);
  assert.equal(story.id, 'SL1-1');
  assert.equal(story.storyKind, 'location');
  assert.equal(engine.activeAbilityAvailable(), false, 'event replacement abilities cannot replace a required story');
  const html = renderGame(engine, 'de');
  assert.match(html, /Verbindliche Ortsgeschichte/);
  assert.match(html, /Laut vorlesen/);
  assert.match(html, /data-action="complete-story-card"/);
  assert.equal(engine.completeStoryCard(now + 2), true);
  assert.equal(engine.state.turn.outcomeCode, 'storyRead');
  assert.equal(engine.endTurn(now + 3), true);
  assert.equal(engine.state.eventsDrawn.filter((id) => id === story.id).length, 1);
});

test('moving to another location queues exactly one new required story', () => {
  const engine = create(91_002);
  engine.beginEvent(now + 1);
  engine.completeStoryCard(now + 2);
  engine.endTurn(now + 3);
  engine.activeGroup.locationProgress = 20;
  assert.equal(engine.maybeAdvanceGroup(engine.activeGroup, now + 4), true);
  assert.ok(engine.state.visitedLocationIds.includes('0:1'));
  assert.equal(engine.state.pendingLocationStoryIds.filter((id) => id === 'SL1-2').length, 1);
  assert.equal(engine.beginEvent(now + 5).id, 'SL1-2');
  assert.equal(engine.activeAbilityAvailable(), false);
});

test('memory questions enforce their prerequisites and award or remove exactly three coins', () => {
  const prepareQuiz = (seed, answerCorrect) => {
    const engine = create(seed);
    engine.beginEvent(now + 1);
    engine.completeStoryCard(now + 2);
    engine.endTurn(now + 3);
    engine.state.coins = 10;
    engine.activePlayer.roleId = answerCorrect ? 'lucky' : 'unlucky';
    const quiz = STORY_QUIZ_CARDS.find((card) => card.quizKind === 'detail' && card.sourceStoryId === 'SL1-1');
    engine.state.storyQuizQueue = [quiz.id];
    engine.state.chapter.nextStoryQuizAt = 0;
    const drawn = engine.beginEvent(now + 4);
    assert.equal(drawn.id, quiz.id);
    const answerId = answerCorrect ? quiz.correctAnswerId : quiz.answers.find((answer) => answer.id !== quiz.correctAnswerId).id;
    assert.equal(engine.answerStoryQuiz(answerId, now + 5), true);
    return engine;
  };

  const correct = prepareQuiz(91_003, true);
  assert.equal(correct.state.coins, 13);
  assert.equal(correct.state.turn.storyCoinDelta, 3);
  const wrong = prepareQuiz(91_004, false);
  assert.equal(wrong.state.coins, 7, 'Unlucky does not change the fixed story-quiz loss');
  assert.equal(wrong.state.turn.storyCoinDelta, -3);
});

test('the card overview exposes all story groups, requirements, scoring, and current usage', () => {
  const engine = create(91_005);
  engine.beginEvent(now + 1);
  engine.completeStoryCard(now + 2);
  const html = renderCardCatalog(engine, 'de');
  assert.equal((html.match(/data-card-kind="story-location"/g) ?? []).length, 36);
  assert.equal((html.match(/data-card-kind="story-quiz"/g) ?? []).length, 96);
  assert.match(html, /Storrykarten/);
  assert.match(html, /Detail-Quizkarten/);
  assert.match(html, /Insel-Quizkarten/);
  assert.match(html, /Richtig \+3 Münzen · falsch −3 Münzen/);
  assert.match(html, /data-card-id="SL1-1" data-used="true"/);
  assert.match(html, /Pflichtkarte: Wird beim ersten Besuch/);
});

test('a complete simulated voyage reads every location story and resolves optional quizzes without stalling', () => {
  const result = simulateGame({ playerCount: 6, seed: 91_006, maxSteps: 30_000 });
  assert.equal(result.completed, true);
  assert.equal(result.locationStories, 36);
  assert.ok(result.storyQuizzes > 0 && result.storyQuizzes < STORY_QUIZ_CARDS.length);
  assert.equal(result.failedTransitions, 0);
  assert.equal(result.uniqueEvents, result.events);
});
