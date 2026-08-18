import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { renderGame } from '../js/ui/game.js';
import { renderPantry, renderTasks } from '../js/ui/overlays.js';
import { EVENT_DECKS } from '../js/data/events.js';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Ella', 'Finn', 'Greta', 'Hugo'];
const now = 1_800_000_000_000;

function create(seed = 71) {
  return GameEngine.create({ names, title: 'Stage flow', defaultLanguage: 'de', seed }, now);
}

function beginSecondCourse(engine) {
  const openingTask = engine.state.tasks.find((task) => ['queued', 'active', 'ready'].includes(task.status));
  if (openingTask) assert.equal(engine.completeTask(openingTask.instanceId, now + 500), true);
  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(now + 1_000), true);
  assert.equal(engine.state.chapterIndex, 1);
  assert.equal(engine.state.chapter.stage, 'clearing');
  assert.equal(engine.state.turn.phase, 'taskBriefing');
  const clearingTask = engine.state.tasks.find((task) => task.chapterIndex === 1 && engine.getTaskCard(task)?.questId === 'reset');
  assert.ok(clearingTask);
  assert.equal(engine.completeTask(clearingTask.instanceId, now + 1_005), true);
  assert.equal(engine.state.chapter.stage, 'ingredients');
  assert.equal(engine.endTurn(now + 1_006), true);
  assert.ok(engine.beginEvent(now + 1_010));
  assert.equal(engine.state.turn.phase, 'courseDecision');
  assert.equal(engine.chooseSoupStyle('cream', now + 1_020), true);
}

test('every later course starts by clearing the previous table before ingredient selection', () => {
  const engine = create(70);
  engine.state.tasks.forEach((task) => { task.status = 'done'; });
  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(now + 1_000), true);
  const clearing = engine.state.tasks.find((task) => task.chapterIndex === 1 && engine.getTaskCard(task)?.questId === 'reset');
  assert.ok(clearing);
  assert.equal(engine.state.chapter.stage, 'clearing');
  assert.equal(engine.state.turn.phase, 'taskBriefing');
  assert.equal(engine.currentEventStage(), 'tasks');
  assert.equal(engine.courseIngredients().length, 0);
  const html = renderGame(engine, 'de');
  assert.match(html, /Tapastafel abräumen/);
  assert.match(html, /Abräumen/);
  assert.doesNotMatch(html, /Vorrats-Ereigniskarte ziehen/);
  assert.equal(engine.completeTask(clearing.instanceId, now + 1_100), true);
  assert.equal(engine.state.chapter.stage, 'ingredients');
});

test('Tapas starts with fixed ingredients and the fun-card draw instead of a kitchen task', () => {
  const engine = create();

  assert.equal(engine.state.chapter.stage, 'tasks');
  assert.equal(engine.state.turn.phase, 'draw');
  assert.ok(engine.courseIngredients().every((ingredient) => ingredient.status === 'locked'));
  assert.equal(engine.state.tasks.length, 0);
  assert.equal(engine.freePlayersForTask().length, names.length);

  const html = renderGame(engine, 'de');
  assert.match(html, /Nächste Karte ziehen/);
  assert.doesNotMatch(html, /Der Plan des Hafenmeisters/);
  assert.equal(engine.beginEvent(now + 2_000)?.archetype, 'work-mischief');
});

test('the first three event cards are varied fun cards and later task stacks keep fun between jobs', () => {
  for (let seed = 80; seed < 90; seed += 1) {
    const engine = create(seed);
    const firstQueue = engine.eventQueue('tasks');
    const firstThree = firstQueue.slice(0, 3).map((eventId) => EVENT_DECKS[0].find((event) => event.id === eventId));
    assert.ok(firstThree.every((event) => event?.archetype === 'work-mischief'));
    assert.equal(new Set(firstThree.map((event) => event.funVariant)).size, 3);

    engine.state.eventQueues.forEach((chapterQueues, chapterIndex) => {
      chapterQueues.tasks.forEach((queue, locationIndex) => {
        const firstFunIndex = queue.findIndex((eventId) => EVENT_DECKS[chapterIndex].find((event) => event.id === eventId)?.archetype === 'work-mischief');
        assert.ok(firstFunIndex >= 0 && firstFunIndex <= 1, `chapter=${chapterIndex} location=${locationIndex}`);
      });
    });
  }
});

test('a new voyage actually draws three fun cards before its first possible work-order card', () => {
  const engine = create(91);
  for (let index = 0; index < 3; index += 1) {
    const event = engine.beginEvent(now + index * 100);
    assert.equal(event.archetype, 'work-mischief', `card ${index + 1}`);
    engine.markEventResolved(event, now + index * 100 + 1);
    engine.state.turn.phase = 'resolved';
    assert.equal(engine.endTurn(now + index * 100 + 2), true);
    assert.equal(engine.state.tasks.length, 0, `card ${index + 1} must not create a hidden task`);
  }
  const fourth = engine.beginEvent(now + 400);
  assert.equal(fourth.stage, 'tasks');
  assert.notEqual(fourth.archetype, 'work-mischief');
  assert.ok(['orders', 'duty', 'guild'].includes(fourth.archetype));
});

test('separate state decks never expose an impossible ingredient or task action', () => {
  const engine = create(72);
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

test('fun events can be drawn and resolved during ingredient rounds without changing the basket', () => {
  const engine = create(721);
  beginSecondCourse(engine);
  const queue = engine.eventQueue('ingredients');
  const funIndex = queue.findIndex((eventId) => EVENT_DECKS[1].find((event) => event.id === eventId)?.archetype === 'pantry-mischief');
  assert.ok(funIndex >= 0);
  queue.unshift(queue.splice(funIndex, 1)[0]);

  const basketBefore = engine.courseIngredients().map((ingredient) => ingredient.id);
  const event = engine.beginEvent(now + 3_100);
  assert.equal(event.stage, 'ingredients');
  assert.equal(event.archetype, 'pantry-mischief');
  assert.ok(event.options.includes('watchChallenge'));
  assert.ok(event.options.includes('treasure'));
  assert.equal(event.options.includes('storyMoment'), false);
  assert.equal(engine.actionAvailable('watchChallenge'), true);
  const coinsBefore = engine.state.coins;
  assert.equal(engine.resolveChoice('treasure', now + 3_200), true);
  assert.equal(engine.state.turn.phase, 'resolved');
  assert.ok(engine.state.coins > coinsBefore);
  assert.deepEqual(engine.courseIngredients().map((ingredient) => ingredient.id), basketBefore);
  assert.equal(engine.state.chapter.stage, 'ingredients');
});

test('fun events can also be drawn during task rounds and dice outcomes stay distinct', () => {
  const engine = create(723);
  engine.state.chapter.stage = 'tasks';
  engine.state.turn.phase = 'draw';
  engine.activeGroup.locationIndex = 1;
  const queue = engine.eventQueue('tasks');
  const funIndex = queue.findIndex((eventId) => EVENT_DECKS[0].find((event) => event.id === eventId)?.archetype === 'work-mischief');
  assert.ok(funIndex >= 0);
  queue.unshift(queue.splice(funIndex, 1)[0]);
  const event = engine.beginEvent(now + 2_000);
  assert.equal(event.archetype, 'work-mischief');
  assert.equal(event.stage, 'tasks');
  assert.equal(new Set(event.outcomes).size, 3);
  assert.ok(event.outcomes.includes('watchChallenge'));
});

test('saved voyages receive missing ingredient fun events without restoring cards already drawn', () => {
  const engine = create(722);
  beginSecondCourse(engine);
  const snapshot = engine.snapshot();
  const funIds = EVENT_DECKS[1].filter((event) => event.archetype === 'pantry-mischief').map((event) => event.id);
  snapshot.eventQueues[1].ingredients = snapshot.eventQueues[1].ingredients.map((queue) => queue.filter((eventId) => !funIds.includes(eventId)));
  snapshot.eventsDrawn.push(funIds[0]);

  const restored = new GameEngine(snapshot);
  const restoredFunIds = restored.state.eventQueues[1].ingredients.flat().filter((eventId) => funIds.includes(eventId));
  assert.equal(restoredFunIds.length, funIds.length - 1);
  assert.ok(!restoredFunIds.includes(funIds[0]));
  assert.ok(funIds.slice(1).every((eventId) => restoredFunIds.includes(eventId)));
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
    assert.equal(engine.ingredientsLockedForCourse(), false, 'an open basket blocks the task stage even at the target');
    assert.equal(engine.lockLastIngredient(now + 3_000), true);
  }

  assert.equal(engine.ingredientsLockedForCourse(), true);
  assert.equal(engine.requiredCourseIngredients().filter((ingredient) => ingredient.status === 'locked').length, engine.courseRule().target);
  assert.equal(engine.unlockedCourseIngredients().length, 0);
  assert.equal(engine.state.chapter.stage, 'tasks');
  assert.equal(engine.state.tasks.filter((task) => task.chapterIndex === chapterIndex && engine.getTaskCard(task)?.questId !== 'reset').length, 0);
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
  const offeredIngredient = engine.getIngredient(basketIngredientId);
  let game = renderGame(engine, 'de');
  assert.match(game, /0\/6 Pflichtzutaten/);
  assert.match(game, /Vor dem Wechsel zu den Aufgaben muss der offene Korb leer sein/);
  const choiceButton = game.match(new RegExp(`<button[^>]+data-ingredient-id="${basketIngredientId}"[\\s\\S]*?<\\/button>`))?.[0] ?? '';
  assert.match(choiceButton, new RegExp(`>${offeredIngredient.name.de}<`));
  assert.doesNotMatch(choiceButton, /<small>|wesentlich|optional/);
  assert.ok(!choiceButton.includes(offeredIngredient.suggestedQuantity.de));

  assert.equal(engine.chooseIngredient(basketIngredientId, now + 2_000), true);
  const basketIngredient = engine.getIngredient(basketIngredientId);
  const untouched = engine.state.ingredients.find((ingredient) => ingredient.status === 'available' && ingredient.courseTags.includes('soup'));
  assert.equal(basketIngredient.status, 'discovered');
  assert.equal(basketIngredient.basketCourseIndex, 1);
  game = renderGame(engine, 'de');
  assert.ok(!game.includes(basketIngredient.suggestedQuantity.de), 'the game basket should only show the ingredient name');

  let pantry = renderPantry(engine, 'de');
  assert.match(pantry, /im Gangkorb/);
  assert.match(pantry, /global verfügbar/);
  assert.ok(pantry.includes(untouched.name.de));
  assert.ok(pantry.includes(basketIngredient.suggestedQuantity.de), 'the separate ingredient list keeps its quantity recommendation');
  assert.equal(engine.lockIngredientFromBasket(basketIngredient.id, now + 3_000), true);
  assert.equal(basketIngredient.status, 'locked');
  pantry = renderPantry(engine, 'de');
  assert.match(pantry, /fest zugeordnet/);

  const restored = new GameEngine(engine.snapshot());
  assert.equal(restored.getIngredient(basketIngredient.id).status, 'locked');
  assert.equal(restored.getIngredient(basketIngredient.id).chapterIndex, 1);
});

test('an ingredient can only be locked once and the resolved card names the ingredient that was actually locked', () => {
  const engine = create(75);
  beginSecondCourse(engine);
  const ingredients = engine.courseIngredientCandidates().slice(0, 2);
  assert.equal(ingredients.length, 2);
  ingredients.forEach((ingredient, index) => {
    ingredient.status = 'discovered';
    ingredient.chapterIndex = 1;
    ingredient.basketCourseIndex = 1;
    ingredient.discoveredAt = now + index;
  });
  engine.state.lastIngredientId = ingredients[1].id;
  const event = EVENT_DECKS[1].find((candidate) => candidate.type === 'choice' && candidate.options.includes('lockIngredient'));
  engine.state.turn.currentEventId = event.id;
  engine.state.turn.phase = 'event';

  assert.equal(engine.resolveChoice('lockIngredient', now + 2_000), true);
  assert.equal(ingredients[1].status, 'locked');
  assert.equal(ingredients[0].status, 'discovered');
  assert.equal(engine.state.turn.resolvedIngredientId, ingredients[1].id);
  const html = renderGame(engine, 'de');
  assert.match(html, new RegExp(`${ingredients[1].name.de} verbindlich festlegen`));
  assert.doesNotMatch(html, new RegExp(`${ingredients[0].name.de} verbindlich festlegen`));
  assert.equal(engine.lockIngredientFromBasket(ingredients[1].id), false, 'the same locked ingredient cannot be locked again');
  assert.equal(engine.lockIngredientFromBasket(ingredients[0].id), true);
  assert.equal(engine.actionAvailable('lockIngredient'), false);
});

test('ingredient events can return an unlocked basket ingredient to the global pantry', () => {
  const engine = create(76);
  beginSecondCourse(engine);
  const ingredient = engine.courseIngredientCandidates()[0];
  ingredient.status = 'discovered';
  ingredient.chapterIndex = 1;
  ingredient.basketCourseIndex = 1;
  ingredient.discoveredAt = now;
  engine.state.lastIngredientId = ingredient.id;
  const event = EVENT_DECKS[1].find((candidate) => candidate.type === 'choice' && candidate.options.includes('returnIngredient'));
  engine.state.turn.currentEventId = event.id;
  engine.state.turn.phase = 'event';

  assert.equal(engine.resolveChoice('returnIngredient', now + 1_000), true);
  assert.equal(ingredient.status, 'available');
  assert.equal(ingredient.chapterIndex, null);
  assert.equal(engine.unlockedCourseIngredients().length, 0);
  assert.equal(engine.state.turn.resolvedIngredientId, ingredient.id);
  assert.match(renderGame(engine, 'de'), new RegExp(`${ingredient.name.de} aus dem Gangkorb zurücklegen`));
});

test('locking the target count automatically returns every leftover basket ingredient', () => {
  const engine = create(77);
  beginSecondCourse(engine);
  const target = engine.courseRule().target;
  const selected = [];
  while (selected.length < target) {
    const candidate = engine.courseIngredientCandidates()[0];
    assert.ok(candidate);
    candidate.status = 'discovered';
    candidate.chapterIndex = 1;
    candidate.basketCourseIndex = 1;
    candidate.discoveredAt = now + selected.length;
    engine.state.lastIngredientId = candidate.id;
    selected.push(candidate);
    if (selected.length < target) assert.equal(engine.lockLastIngredient(now + 3_000 + selected.length), true);
  }
  const leftover = engine.state.ingredients.find((ingredient) => ingredient.status === 'available' && ingredient.courseTags.includes('soup'));
  assert.ok(leftover);
  leftover.status = 'discovered';
  leftover.chapterIndex = 1;
  leftover.basketCourseIndex = 1;
  leftover.discoveredAt = now + 9_000;
  engine.state.lastIngredientId = selected.at(-1).id;
  assert.equal(engine.lockLastIngredient(now + 10_000), true);
  assert.equal(engine.unlockedCourseIngredients().length, 0);
  assert.equal(leftover.status, 'available');
  assert.equal(leftover.chapterIndex, null);
  assert.equal(engine.ingredientsLockedForCourse(), true);
});
