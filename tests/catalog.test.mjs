import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_DECKS, EVENT_STAGES, WATCH_CHALLENGES, validateEventCatalog } from '../js/data/events.js';
import { INGREDIENTS, buildIngredientPlan, validateIngredientPlan } from '../js/data/ingredients.js';
import { TASK_DECKS, validateTaskCatalog } from '../js/data/tasks.js';
import { ROLES } from '../js/data/roles.js';

test('catalog contains 504 uniquely named event cards including flexible interludes', () => {
  const result = validateEventCatalog();
  assert.equal(result.total, 504);
  assert.equal(result.uniqueIds, 504);
  assert.equal(result.uniqueGermanTitles, 504);
  assert.equal(result.uniqueEnglishTitles, 504);
  assert.equal(result.uniqueGermanStories, 504);
  assert.equal(result.uniqueEnglishStories, 504);
  assert.equal(result.valid, true);
  assert.ok(EVENT_DECKS.every((deck) => deck.length === 84));
  assert.ok(EVENT_DECKS.every((deck) => [0, 1, 2, 3, 4, 5].every((locationIndex) => deck.filter((event) => event.locationIndex === locationIndex).length === 14)));
  assert.deepEqual(result.stageCounts, { ingredients: 180, tasks: 108, cooking: 216 });
  assert.ok(EVENT_DECKS.every((deck) => EVENT_STAGES.every((stage) => deck.some((event) => event.stage === stage))));
  assert.ok(EVENT_DECKS.flat().every((event) => (event.options ?? event.outcomes).length >= 2));
});

test('interludes include safe secret missions, a linked chicken gag, and a real break', () => {
  assert.ok(WATCH_CHALLENGES.some((challenge) => challenge.secret));
  assert.ok(WATCH_CHALLENGES.some((challenge) => challenge.minutes === 5 && challenge.coins === 0));
  const chicken = WATCH_CHALLENGES.find((challenge) => challenge.id === 'chicken');
  assert.equal(chicken.followUpId, 'stop-chicken');
  assert.ok(WATCH_CHALLENGES.some((challenge) => challenge.id === chicken.followUpId && challenge.secret));
  assert.ok(EVENT_DECKS.flat().some((event) => event.archetype === 'mischief'));
});

test('catalog contains 144 uniquely named task cards', () => {
  const result = validateTaskCatalog();
  assert.equal(result.total, 144);
  assert.equal(result.uniqueIds, 144);
  assert.equal(result.uniqueGermanTitles, 144);
  assert.equal(result.uniqueEnglishTitles, 144);
  assert.equal(result.valid, true);
  assert.ok(TASK_DECKS.every((deck) => deck.length === 24));
  assert.deepEqual(TASK_DECKS.map((deck) => deck.filter((card) => card.playable).length), [10, 11, 11, 11, 10, 11]);
  assert.ok(TASK_DECKS.flat().filter((card) => card.playable).every((card) => !['planning', 'story', 'optional'].includes(card.area)));
});

test('all ten roles are unique and have finite active uses', () => {
  assert.equal(ROLES.length, 10);
  assert.equal(new Set(ROLES.map((role) => role.id)).size, 10);
  assert.ok(ROLES.every((role) => role.name.de && role.name.en && role.passive.de && role.active.en));
  assert.ok(ROLES.every((role) => role.uses > 0 && Number.isInteger(role.uses)));
});

test('ingredient planner keeps a tagged global pool and only fixes Tapas', () => {
  assert.equal(INGREDIENTS.length, 54);
  assert.deepEqual(INGREDIENTS.filter((ingredient) => !ingredient.essential).map((ingredient) => ingredient.id).sort(), ['gin', 'rum', 'second-ice', 'vodka']);
  assert.ok(['mince', 'milk', 'butter', 'cooking-cream', 'whipping-cream', 'olive-oil'].every((id) => !INGREDIENTS.some((ingredient) => ingredient.id === id)));
  for (let playerCount = 6; playerCount <= 10; playerCount += 1) {
    const { plan } = buildIngredientPlan(1200 + playerCount, playerCount);
    const validation = validateIngredientPlan(plan);
    assert.equal(validation.valid, true);
    assert.equal(validation.assigned, 9);
    assert.equal(validation.essentialAssigned, 9);
    assert.equal(validation.tagged, validation.total);
    assert.ok(plan.filter((ingredient) => ingredient.category !== 'tapas').every((ingredient) => ingredient.chapterIndex == null && ingredient.status === 'available'));
  }
});
