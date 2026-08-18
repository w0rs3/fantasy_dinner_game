import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_DECKS, EVENT_STAGES, WATCH_CHALLENGES, validateEventCatalog } from '../js/data/events.js';
import { INGREDIENTS, buildIngredientPlan, validateIngredientPlan } from '../js/data/ingredients.js';
import { TASK_DECKS, validateTaskCatalog } from '../js/data/tasks.js';
import { ROLES, getRole } from '../js/data/roles.js';

test('catalog contains 540 uniquely named event cards including ingredient- and task-round fun events', () => {
  const result = validateEventCatalog();
  assert.equal(result.total, 540);
  assert.equal(result.uniqueIds, 540);
  assert.equal(result.uniqueGermanTitles, 540);
  assert.equal(result.uniqueEnglishTitles, 540);
  assert.equal(result.uniqueGermanStories, 540);
  assert.equal(result.uniqueEnglishStories, 540);
  assert.equal(result.valid, true);
  assert.ok(EVENT_DECKS.every((deck) => deck.length === 90));
  assert.ok(EVENT_DECKS.every((deck) => [0, 1, 2, 3, 4, 5].every((locationIndex) => deck.filter((event) => event.locationIndex === locationIndex).length === 15)));
  assert.deepEqual(result.stageCounts, { ingredients: 198, tasks: 126, cooking: 216 });
  assert.ok(EVENT_DECKS.every((deck) => EVENT_STAGES.every((stage) => deck.some((event) => event.stage === stage))));
  assert.ok(EVENT_DECKS.flat().every((event) => (event.options ?? event.outcomes).length >= 2));
  assert.ok(EVENT_DECKS.every((deck) => deck.filter((event) => event.archetype === 'pantry-mischief' && event.stage === 'ingredients').length === 3));
  assert.ok(EVENT_DECKS.every((deck) => deck.filter((event) => event.archetype === 'work-mischief' && event.stage === 'tasks').length === 3));
});

test('interludes include safe secret missions, a linked chicken gag, and a real break', () => {
  assert.ok(WATCH_CHALLENGES.some((challenge) => challenge.secret));
  assert.ok(WATCH_CHALLENGES.some((challenge) => challenge.minutes === 5 && challenge.coins === 0));
  const chicken = WATCH_CHALLENGES.find((challenge) => challenge.id === 'chicken');
  assert.equal(chicken.followUpId, 'stop-chicken');
  assert.ok(WATCH_CHALLENGES.some((challenge) => challenge.id === chicken.followUpId && challenge.secret));
  assert.ok(['compliments', 'love-decisions', 'laugh-turn', 'chicken'].every((id) =>
    WATCH_CHALLENGES.find((challenge) => challenge.id === id)?.flow === 'ongoing'
  ));
  assert.ok(WATCH_CHALLENGES.every((challenge) => ['immediate', 'ongoing'].includes(challenge.flow)));
  assert.equal(WATCH_CHALLENGES.find((challenge) => challenge.id === 'odd-dance')?.secret, true);
  assert.ok(WATCH_CHALLENGES.length >= 40, `expected a varied challenge deck, got ${WATCH_CHALLENGES.length}`);
  assert.equal(new Set(WATCH_CHALLENGES.map((challenge) => challenge.id)).size, WATCH_CHALLENGES.length);
  assert.ok(['nose-voice', 'impatient-fingers', 'three-hops', 'under-table-search', 'accent-shift', 'self-compliments',
    'aye-aye-sentences', 'arr-sentences', 'captain-permission', 'self-talk', 'bad-joke', 'hiccups', 'mime-self-slap',
    'hand-trumpet', 'chair-circle', 'ceremonial-greeting', 'folded-note']
    .every((id) => WATCH_CHALLENGES.some((challenge) => challenge.id === id && challenge.secret)));
  assert.ok(WATCH_CHALLENGES.filter((challenge) => challenge.followUpOnly).every((challenge) => challenge.mandatory && challenge.secret));
  const pirateVerse = WATCH_CHALLENGES.find((challenge) => challenge.id === 'pirate-verse');
  assert.equal(pirateVerse?.secret, false);
  assert.match(pirateVerse?.de ?? '', /Piratenlied|Piratengedicht/);
  assert.ok(EVENT_DECKS.flat().some((event) => event.archetype === 'mischief'));
});

test('catalog contains only the 81 unique, ordered quest steps that can actually appear', () => {
  const result = validateTaskCatalog();
  assert.equal(result.total, 81);
  assert.equal(result.uniqueIds, 81);
  assert.equal(result.uniqueGermanTitles, 81);
  assert.equal(result.uniqueEnglishTitles, 81);
  assert.equal(result.valid, true);
  assert.deepEqual(TASK_DECKS.map((deck) => deck.length), [16, 15, 12, 14, 12, 12]);
  assert.deepEqual(TASK_DECKS.map((deck) => deck.filter((card) => card.playable).length), [13, 14, 11, 13, 10, 11]);
  assert.ok(TASK_DECKS.flat().filter((card) => card.playable).every((card) => !['planning', 'story', 'optional'].includes(card.area)));
  assert.ok(TASK_DECKS.flat().every((card) => card.questName.de && card.questName.en && card.questStep >= 1));
  assert.ok(TASK_DECKS.flat().filter((card) => card.timingMode === 'background').every((card) => card.challengeMinutes === 0 && card.backgroundMinutes > 0));
});

test('all ten roles are unique and have finite active uses', () => {
  assert.equal(ROLES.length, 10);
  assert.equal(new Set(ROLES.map((role) => role.id)).size, 10);
  assert.ok(ROLES.every((role) => role.name.de && role.name.en && role.passive.de && role.active.en));
  assert.ok(ROLES.every((role) => {
    const described = getRole(role.id);
    return described.passiveUsage.de && described.passiveUsage.en && described.activeUsage.de && described.activeUsage.en && described.activeButton.de && described.activeButton.en;
  }));
  assert.ok(ROLES.every((role) => role.uses > 0 && Number.isInteger(role.uses)));
});

test('ingredient planner keeps a tagged global pool and only fixes Tapas', () => {
  assert.equal(INGREDIENTS.length, 53);
  assert.deepEqual(INGREDIENTS.filter((ingredient) => !ingredient.essential).map((ingredient) => ingredient.id).sort(), ['gin', 'rum', 'second-ice', 'vodka']);
  assert.ok(['mince', 'milk', 'butter', 'yoghurt', 'broth', 'cooking-cream', 'whipping-cream', 'olive-oil'].every((id) => !INGREDIENTS.some((ingredient) => ingredient.id === id)));
  assert.deepEqual(INGREDIENTS.find((ingredient) => ingredient.id === 'peppermint').courseTags, ['salad', 'dessert', 'cocktails']);
  assert.deepEqual(INGREDIENTS.find((ingredient) => ingredient.id === 'cucumber').courseTags, ['salad', 'main']);
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
