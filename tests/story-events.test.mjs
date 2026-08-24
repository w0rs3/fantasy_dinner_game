import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { CHAPTERS } from '../js/data/chapters.js';
import {
  ISLAND_STORY_CARDS,
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

test('story catalog contains island and location stories with their requested quiz groups', () => {
  assert.deepEqual(validateStoryCatalog(), {
    total: 150,
    islandStories: 6,
    locationStories: 36,
    quizzes: 108,
    islandDetailQuizzes: 12,
    locationDetailQuizzes: 72,
    routeQuizzes: 24,
    valid: true
  });
  assert.equal(STORY_CARDS.length, 150);
  assert.equal(new Set(STORY_CARDS.map((card) => card.id)).size, STORY_CARDS.length);

  for (let chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex += 1) {
    const locations = CHAPTERS[chapterIndex].locations;
    const islandStory = ISLAND_STORY_CARDS.find((card) => card.chapterIndex === chapterIndex);
    assert.ok(islandStory?.mandatory);
    assert.equal(STORY_QUIZ_CARDS.filter((card) => card.chapterId === CHAPTERS[chapterIndex].id && card.quizKind === 'island-detail').length, 2);
    assert.equal(STORY_QUIZ_CARDS.filter((card) => card.quizKind === 'island-detail' && card.sourceStoryId === islandStory.id).length, 2);
    for (const language of ['de', 'en']) {
      const sentences = islandStory.story[language].match(/[^.!?]+[.!?]/g) ?? [];
      assert.ok(sentences.length >= 3 && sentences.length <= 5, `${islandStory.id} ${language} has ${sentences.length} sentences`);
    }
    assert.equal(LOCATION_STORY_CARDS.filter((card) => card.chapterIndex === chapterIndex).length, locations.length);
    assert.equal(STORY_QUIZ_CARDS.filter((card) => card.chapterId === CHAPTERS[chapterIndex].id && card.quizKind === 'location-detail').length, locations.length * 2);
    assert.equal(STORY_QUIZ_CARDS.filter((card) => card.chapterId === CHAPTERS[chapterIndex].id && card.quizKind === 'route').length, 4);
    for (let locationIndex = 0; locationIndex < locations.length; locationIndex += 1) {
      const story = LOCATION_STORY_CARDS.find((card) => card.chapterIndex === chapterIndex && card.locationIndex === locationIndex);
      assert.ok(story?.mandatory);
      for (const language of ['de', 'en']) {
        const sentences = story.story[language].match(/[^.!?]+[.!?]/g) ?? [];
        assert.ok(sentences.length >= 3 && sentences.length <= 5, `${story.id} ${language} has ${sentences.length} sentences`);
      }
      assert.equal(STORY_QUIZ_CARDS.filter((card) => card.quizKind === 'location-detail' && card.sourceStoryId === story.id).length, 2);
    }
  }
  assert.ok(STORY_QUIZ_CARDS.every((card) => card.answers.length === 3 && card.answers.filter((answer) => answer.id === card.correctAnswerId).length === 1));
});

test('entering an island always queues its island story before the first location story', () => {
  const engine = create();
  engine.activePlayer.roleId = 'scout';
  engine.activePlayer.activeUsesRemaining = 2;
  assert.deepEqual(engine.state.pendingLocationStoryIds, ['SI1', 'SL1-1']);
  const islandStory = engine.beginEvent(now + 1);
  assert.equal(islandStory.id, 'SI1');
  assert.equal(islandStory.storyKind, 'island');
  assert.equal(engine.activeAbilityAvailable(), false, 'event replacement abilities cannot replace a required story');
  const islandHtml = renderGame(engine, 'de');
  assert.match(islandHtml, /Verbindliche Inselgeschichte/);
  assert.match(islandHtml, /Laut vorlesen/);
  assert.match(islandHtml, /data-action="complete-story-card"/);
  assert.equal(engine.completeStoryCard(now + 2), true);
  assert.equal(engine.state.turn.outcomeCode, 'storyRead');
  assert.equal(engine.endTurn(now + 3), true);
  const locationStory = engine.beginEvent(now + 4);
  assert.equal(locationStory.id, 'SL1-1');
  assert.equal(locationStory.storyKind, 'location');
  assert.match(renderGame(engine, 'de'), /Verbindliche Ortsgeschichte/);
  assert.equal(engine.completeStoryCard(now + 5), true);
  assert.equal(engine.endTurn(now + 6), true);
  assert.deepEqual(engine.state.eventsDrawn.slice(0, 2), ['SI1', 'SL1-1']);
});

test('mandatory stories and memory questions cannot be skipped by the Tactician passive', () => {
  const engine = create(91_006);
  engine.activePlayer.roleId = 'tactician';
  assert.equal(engine.beginEvent(now + 1).storyKind, 'island');
  assert.equal(engine.ignoreEventWithTactician(now + 2), false);
  assert.doesNotMatch(renderGame(engine, 'de'), /Ereignis ohne Wirkung abschließen \(passiv\)/);
  assert.equal(engine.state.turn.phase, 'event');
});

test('moving to another location queues exactly one new required story', () => {
  const engine = create(91_002);
  engine.beginEvent(now + 1);
  engine.completeStoryCard(now + 2);
  engine.endTurn(now + 3);
  engine.beginEvent(now + 4);
  engine.completeStoryCard(now + 5);
  engine.endTurn(now + 6);
  engine.activeGroup.locationProgress = 20;
  assert.equal(engine.maybeAdvanceGroup(engine.activeGroup, now + 7), true);
  assert.ok(engine.state.visitedLocationIds.includes('0:1'));
  assert.equal(engine.state.pendingLocationStoryIds.filter((id) => id === 'SL1-2').length, 1);
  assert.equal(engine.state.pendingLocationStoryIds.includes('SI1'), false);
  assert.equal(engine.beginEvent(now + 8).id, 'SL1-2');
  assert.equal(engine.activeAbilityAvailable(), false);
});

test('memory questions enforce prerequisites and apply character passives to their three-coin base score', () => {
  const prepareQuiz = (seed, answerCorrect) => {
    const engine = create(seed);
    engine.beginEvent(now + 1);
    engine.completeStoryCard(now + 2);
    engine.endTurn(now + 3);
    engine.beginEvent(now + 4);
    engine.completeStoryCard(now + 5);
    engine.endTurn(now + 6);
    engine.state.coins = 10;
    engine.activePlayer.roleId = answerCorrect ? 'lucky' : 'unlucky';
    const quiz = STORY_QUIZ_CARDS.find((card) => card.quizKind === (answerCorrect ? 'island-detail' : 'location-detail') && card.sourceStoryId === (answerCorrect ? 'SI1' : 'SL1-1'));
    engine.state.storyQuizQueue = [quiz.id];
    engine.state.chapter.nextStoryQuizAt = 0;
    const drawn = engine.beginEvent(now + 7);
    assert.equal(drawn.id, quiz.id);
    if (!answerCorrect) assert.match(renderGame(engine, 'de'), /falsche Antwort: −4 Münzen/);
    const answerId = answerCorrect ? quiz.correctAnswerId : quiz.answers.find((answer) => answer.id !== quiz.correctAnswerId).id;
    assert.equal(engine.answerStoryQuiz(answerId, now + 8), true);
    return engine;
  };

  const correct = prepareQuiz(91_003, true);
  assert.equal(correct.state.coins, 13);
  assert.equal(correct.state.turn.storyCoinDelta, 3);
  const wrong = prepareQuiz(91_004, false);
  assert.equal(wrong.state.coins, 6, 'Unlucky increases a loss caused during the player’s own turn');
  assert.equal(wrong.state.turn.storyCoinDelta, -4);
});

test('the card overview exposes all story groups, requirements, scoring, and current usage', () => {
  const engine = create(91_005);
  engine.beginEvent(now + 1);
  engine.completeStoryCard(now + 2);
  engine.endTurn(now + 3);
  engine.beginEvent(now + 4);
  engine.completeStoryCard(now + 5);
  const html = renderCardCatalog(engine, 'de');
  assert.equal((html.match(/data-card-kind="story-island"/g) ?? []).length, 6);
  assert.equal((html.match(/data-card-kind="story-location"/g) ?? []).length, 36);
  assert.equal((html.match(/data-card-kind="story-quiz"/g) ?? []).length, 108);
  assert.match(html, /Storykarten/);
  assert.doesNotMatch(html, /Storrykarten/);
  assert.match(html, /Story Insel Karten/);
  assert.match(html, /Story Ort Karten/);
  assert.match(html, /Detail Insel Quiz Karten/);
  assert.match(html, /Detail Ort Quiz Karten/);
  assert.match(html, /Insel Quiz Karten/);
  assert.match(html, /Richtig \+3 Münzen · falsch −3 Münzen/);
  assert.match(html, /data-card-id="SI1" data-used="true"/);
  assert.match(html, /data-card-id="SL1-1" data-used="true"/);
  assert.match(html, /als erste Storykarte oben auf den Stapel gelegt/);
  assert.match(html, /Pflichtkarte: Wird beim ersten Besuch/);
  assert.ok(html.indexOf('data-card-id="SL1-1"') < html.indexOf('data-card-id="SL1-2"'));
  assert.ok(html.indexOf('data-card-id="SL1-6"') < html.indexOf('data-card-id="SL2-1"'));
});

test('a complete simulated voyage reads every location story and resolves optional quizzes without stalling', () => {
  const result = simulateGame({ playerCount: 6, seed: 91_006, maxSteps: 30_000 });
  assert.equal(result.completed, true);
  assert.equal(result.islandStories, 6);
  assert.equal(result.locationStories, 36);
  assert.ok(result.storyQuizzes > 0 && result.storyQuizzes < STORY_QUIZ_CARDS.length);
  assert.equal(result.failedTransitions, 0);
  assert.equal(result.uniqueEvents, result.events);
});
