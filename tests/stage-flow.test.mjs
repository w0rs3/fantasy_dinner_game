import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { renderGame } from '../js/ui/game.js';
import { renderPantry, renderTasks } from '../js/ui/overlays.js';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Ella', 'Finn', 'Greta', 'Hugo'];
const now = 1_800_000_000_000;

function create(seed = 71) {
  return GameEngine.create({ names, title: 'Stage flow', defaultLanguage: 'de', seed }, now);
}

function beginSecondCourse(engine) {
  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(now + 1_000), true);
  assert.equal(engine.state.chapterIndex, 1);
}

test('Tapas starts with fixed ingredients and one concrete automatic task instead of a planning task', () => {
  const engine = create();
  const task = engine.state.tasks[0];
  const card = engine.getTaskCard(task);

  assert.equal(engine.state.chapter.stage, 'tasks');
  assert.equal(engine.state.turn.phase, 'taskBriefing');
  assert.ok(engine.courseIngredients().every((ingredient) => ingredient.status === 'locked'));
  assert.equal(card.playable, true);
  assert.notEqual(card.area, 'planning');
  assert.notEqual(card.area, 'story');
  assert.ok(task.basketIngredientIds.every((ingredientId) => engine.getIngredient(ingredientId).chapterIndex === 0));
  assert.ok(task.assignedPlayerIds.includes(engine.activePlayer.id));

  const html = renderGame(engine, 'de');
  assert.match(html, /Automatischer Startauftrag/);
  assert.match(html, /Relevante Zutaten dieses Gangs/);
  assert.match(html, /Aufgabe übernehmen/);
  assert.doesNotMatch(html, /Der Plan des Hafenmeisters/);

  const activePlayer = engine.activePlayer.id;
  assert.equal(engine.acceptTaskBriefing(now + 2_000), true);
  assert.equal(engine.state.turn.phase, 'draw');
  assert.equal(engine.activePlayer.id, activePlayer, 'the first player draws after accepting the opening job');
  assert.equal(task.status, 'active');
});

test('separate state decks never expose an impossible ingredient or task action', () => {
  const engine = create(72);
  engine.acceptTaskBriefing(now + 1_000);
  const taskEvent = engine.beginEvent(now + 2_000);
  assert.equal(taskEvent.stage, 'tasks');
  assert.ok((taskEvent.options ?? taskEvent.outcomes).every((action) => engine.actionAvailable(action)));
  assert.ok((taskEvent.options ?? taskEvent.outcomes).every((action) => !['discoverIngredient', 'lockIngredient', 'swapIngredient'].includes(action)));

  beginSecondCourse(engine);
  const ingredientEvent = engine.beginEvent(now + 3_000);
  assert.equal(ingredientEvent.stage, 'ingredients');
  const actions = ingredientEvent.options ?? ingredientEvent.outcomes;
  assert.ok(actions.every((action) => engine.actionAvailable(action)));
  assert.ok(actions.every((action) => !['drawTask', 'singleTask', 'teamTask', 'treasureAndTask'].includes(action)));
  assert.ok(!actions.includes('swapIngredient'), 'swap is hidden before any unlocked ingredient exists');
  assert.ok(!actions.includes('lockIngredient'), 'lock is hidden before any unlocked ingredient exists');
});

test('ingredients must be discovered and locked before the work-order deck can assign tasks', () => {
  const engine = create(73);
  beginSecondCourse(engine);
  const chapterIndex = engine.state.chapterIndex;

  let guard = 0;
  while (!engine.ingredientsLockedForCourse() && guard < 100) {
    guard += 1;
    const ingredient = engine.unlockedCourseIngredients()[0] ?? engine.courseIngredientCandidates()[0];
    assert.ok(ingredient, 'a valid ingredient must remain until the course composition is complete');
    if (ingredient.status === 'available') {
      ingredient.status = 'discovered';
      ingredient.chapterIndex = chapterIndex;
      ingredient.basketCourseIndex = chapterIndex;
    }
    ingredient.status = 'discovered';
    ingredient.discoveredAt = now + 2_000;
    ingredient.discoveredBy = engine.activePlayer.id;
    engine.state.lastIngredientId = ingredient.id;
    assert.equal(engine.lockLastIngredient(now + 3_000), true);
  }

  assert.equal(engine.ingredientsLockedForCourse(), true);
  assert.equal(engine.state.chapter.stage, 'tasks');
  assert.equal(engine.state.tasks.filter((task) => task.chapterIndex === chapterIndex).length, 0);
  engine.state.turn.phase = 'draw';
  const event = engine.beginEvent(now + 4_000);
  assert.equal(event.stage, 'tasks');
  assert.ok((event.options ?? event.outcomes).every((action) => engine.actionAvailable(action)));
});

test('course baskets can be edited and the pantry shows global, basket, and locked states', () => {
  const engine = create(74);
  beginSecondCourse(engine);
  assert.equal(engine.prepareIngredientChoice(null, 'ability', { count: 2 }), true);
  const basketIngredientId = engine.state.turn.pendingIngredientIds[0];
  assert.equal(engine.chooseIngredient(basketIngredientId, now + 2_000), true);
  const basketIngredient = engine.getIngredient(basketIngredientId);
  const untouched = engine.state.ingredients.find((ingredient) => ingredient.status === 'available' && ingredient.courseTags.includes('soup'));
  assert.equal(basketIngredient.status, 'discovered');
  assert.equal(basketIngredient.basketCourseIndex, 1);
  let pantry = renderPantry(engine, 'de');
  assert.match(pantry, /im Gangkorb/);
  assert.match(pantry, /global verfügbar/);
  assert.ok(pantry.includes(untouched.name.de));
  assert.equal(engine.lockIngredientFromBasket(basketIngredient.id, now + 3_000), true);
  assert.equal(basketIngredient.status, 'locked');
  pantry = renderPantry(engine, 'de');
  assert.match(pantry, /fest zugeordnet/);

  const restored = new GameEngine(engine.snapshot());
  assert.equal(restored.getIngredient(basketIngredient.id).status, 'locked');
  assert.equal(restored.getIngredient(basketIngredient.id).chapterIndex, 1);
});
