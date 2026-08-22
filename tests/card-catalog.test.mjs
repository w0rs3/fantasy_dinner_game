import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GameEngine } from '../js/core/game-engine.js';
import { EVENT_DECKS, WATCH_CHALLENGES } from '../js/data/events.js';
import { INGREDIENTS } from '../js/data/ingredients.js';
import { ROLES } from '../js/data/roles.js';
import { LOCATION_STORY_CARDS, STORY_CARDS, STORY_QUIZ_CARDS } from '../js/data/story-events.js';
import { getPlayableQuestLines } from '../js/data/tasks.js';
import { renderCardCatalog } from '../js/ui/card-catalog.js';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Eva', 'Finn'];

function occurrences(source, needle) {
  return source.split(needle).length - 1;
}

test('card catalog exposes every playable card in the requested groups and quest graphs', () => {
  const html = renderCardCatalog(null, 'de');
  const questLines = Array.from({ length: 6 }, (_, chapterIndex) => getPlayableQuestLines(chapterIndex));
  const questCards = questLines.flat(2);
  const expectedTotal = questCards.length + EVENT_DECKS.flat().length + STORY_CARDS.length + WATCH_CHALLENGES.length + INGREDIENTS.length + ROLES.length;
  const expectedEdges = questLines.flat().reduce((sum, line) => sum + Math.max(0, line.length - 1), 0);

  assert.match(html, /Übersicht aller Karten/);
  assert.match(html, /Questlinien/);
  assert.match(html, /Spaßkarten/);
  assert.match(html, /Koop-Spaßkarten/);
  assert.match(html, /Storrykarten/);
  assert.match(html, /Detail-Quizkarten/);
  assert.match(html, /Insel-Quizkarten/);
  assert.match(html, /Ereigniskarten/);
  assert.match(html, /Zutatenkarten/);
  assert.match(html, /Figurenkarten/);
  assert.equal(occurrences(html, 'data-card-kind='), expectedTotal);
  assert.equal(occurrences(html, 'data-card-kind="quest"'), questCards.length);
  assert.equal(occurrences(html, 'data-card-kind="event"'), EVENT_DECKS.flat().length);
  assert.equal(occurrences(html, 'data-card-kind="story-location"'), LOCATION_STORY_CARDS.length);
  assert.equal(occurrences(html, 'data-card-kind="story-quiz"'), STORY_QUIZ_CARDS.length);
  assert.equal(occurrences(html, 'data-card-kind="fun"'), WATCH_CHALLENGES.filter((card) => !card.cooperative).length);
  assert.equal(occurrences(html, 'data-card-kind="coop-fun"'), WATCH_CHALLENGES.filter((card) => card.cooperative).length);
  assert.equal(occurrences(html, 'class="quest-edge"'), expectedEdges);
  assert.equal(occurrences(html, 'class="quest-line"'), questLines.flat().length);
  assert.doesNotMatch(html, /\{(?:activePlayer|targetPlayer|partner2?)\}/);
});

test('quest lines follow their practical course order and explain every prerequisite', () => {
  const html = renderCardCatalog(null, 'de');
  const renderedOrder = (chapterId) => [...html.matchAll(new RegExp(`data-chapter-id="${chapterId}" data-quest-id="([^"]+)"`, 'g'))].map((match) => match[1]);

  for (const chapterId of ['soup', 'salad', 'main', 'dessert', 'cocktails']) {
    const order = renderedOrder(chapterId);
    assert.equal(order[0], 'reset', `${chapterId} must begin by clearing the previous course`);
    assert.equal(order.at(-2), 'serve', `${chapterId} must place serving before cleanup`);
    assert.equal(order.at(-1), 'cleanup', `${chapterId} must end with cleanup`);
  }
  assert.deepEqual(renderedOrder('main'), ['reset', 'meat', 'vegetables', 'fruit', 'sauce', 'preheat', 'assembly', 'oven', 'finish', 'serve', 'cleanup']);
  assert.deepEqual(renderedOrder('soup'), ['reset', 'vegetables', 'extras', 'cauldron', 'finish', 'serve', 'cleanup']);
  assert.deepEqual(renderedOrder('tapas'), ['dates', 'bread', 'cold', 'serve', 'cleanup']);
  assert.match(html, /Vorherigen Gang abräumen → Zutaten festlegen → mögliche Zubereitungsquestlinien parallel starten → servieren → aufräumen/);
  assert.match(html, /Startet zuerst: Der vorherige Gang wurde gegessen/);

  const cardsWithRequirements = Array.from({ length: 6 }, (_, chapterIndex) => getPlayableQuestLines(chapterIndex).flat())
    .filter((card) => card.prerequisites?.length || card.alternativePrerequisites?.length || card.ingredientRequirement || card.courseStyles?.length);
  for (const card of cardsWithRequirements) {
    const cardStart = html.indexOf(`data-card-id="${card.id}"`);
    const cardEnd = html.indexOf('</article>', cardStart);
    assert.ok(cardStart >= 0 && cardEnd > cardStart, `${card.id} must be rendered`);
    assert.match(html.slice(cardStart, cardEnd), /class="quest-requirements"/, `${card.id} must explain its requirement`);
  }
  assert.match(html, /Nur wenn dem Gang Blattsalat zugeordnet ist\./);
  assert.match(html, /Nur bei Cremesuppe\./);
  assert.match(html, /Bei „Kesselwache ablösen“ wird dieselbe Karte wieder ganz oben auf den Aufgabenstapel gelegt/);
  assert.match(html, /Alle fachlich benötigten Zubereitungsaufgaben dieses Gangs müssen erledigt sein\./);
});

test('card catalog marks cards used by the current voyage without hiding unused cards', () => {
  const engine = GameEngine.create({ names, title: 'Kartenstatus', defaultLanguage: 'de', seed: 55_321 }, 1_800_000_000_000);
  const taskCard = getPlayableQuestLines(0)[0][0];
  const usedEvent = EVENT_DECKS[0][0];
  const unusedEvent = EVENT_DECKS[0][1];
  const standardFun = WATCH_CHALLENGES.find((challenge) => !challenge.cooperative && !challenge.followUpOnly);
  const usedStory = LOCATION_STORY_CARDS[0];
  const cooperativeFun = WATCH_CHALLENGES.find((challenge) => challenge.cooperative);
  const flexibleIngredient = engine.state.ingredients.find((ingredient) => ingredient.status === 'available');

  engine.state.tasks.push({ taskId: taskCard.id, chapterIndex: 0, status: 'done' });
  engine.state.eventsDrawn.push(usedEvent.id);
  engine.state.eventsDrawn.push(usedStory.id);
  engine.state.funCardsDrawn.push(standardFun.id, cooperativeFun.id);
  flexibleIngredient.status = 'locked';
  flexibleIngredient.chapterIndex = 1;

  const html = renderCardCatalog(engine, 'de');
  const assignedRoleId = engine.state.players[0].roleId;

  for (const id of [taskCard.id, usedEvent.id, usedStory.id, standardFun.id, cooperativeFun.id, flexibleIngredient.id, assignedRoleId]) {
    assert.match(html, new RegExp(`data-card-id="${id}" data-used="true"`), `${id} should be marked used`);
  }
  assert.match(html, new RegExp(`data-card-id="${unusedEvent.id}" data-used="false"`));
  assert.match(html, /verwendet · erledigt/);
  assert.match(html, /verwendet · festgelegt/);
});

test('sidebar and public routing expose the card catalog', async () => {
  const [index, appSource, translations] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../js/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/data/i18n.js', import.meta.url), 'utf8')
  ]);

  assert.match(index, /data-nav="cards"/);
  assert.match(index, /data-i18n="navCards"/);
  assert.match(appSource, /view === 'cards'.*renderCardCatalog\(engine, currentLanguage\)/);
  assert.match(appSource, /'pantry', 'cards', 'sessions'/);
  assert.match(translations, /navCards: \{ de: 'Karten', en: 'Cards' \}/);
});
