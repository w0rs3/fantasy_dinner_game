import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_DECKS, EVENT_STAGES, WATCH_CHALLENGES, validateEventCatalog } from '../js/data/events.js';
import { INGREDIENTS, buildIngredientPlan, validateIngredientPlan } from '../js/data/ingredients.js';
import { TASK_DECKS, getPlayableQuestLines, validateTaskCatalog } from '../js/data/tasks.js';
import { ROLES, getRole } from '../js/data/roles.js';

test('catalog contains 570 uniquely named event cards including expanded task-round fun events', () => {
  const result = validateEventCatalog();
  assert.equal(result.total, 570);
  assert.equal(result.uniqueIds, 570);
  assert.equal(result.uniqueGermanTitles, 570);
  assert.equal(result.uniqueEnglishTitles, 570);
  assert.equal(result.uniqueGermanStories, 570);
  assert.equal(result.uniqueEnglishStories, 570);
  assert.equal(result.valid, true);
  assert.ok(EVENT_DECKS.every((deck) => deck.length === 95));
  assert.ok(EVENT_DECKS.every((deck) => [18, 15, 16, 15, 16, 15]
    .every((expected, locationIndex) => deck.filter((event) => event.locationIndex === locationIndex).length === expected)));
  assert.deepEqual(result.stageCounts, { ingredients: 198, tasks: 156, cooking: 216 });
  assert.ok(EVENT_DECKS.every((deck) => EVENT_STAGES.every((stage) => deck.some((event) => event.stage === stage))));
  assert.ok(EVENT_DECKS.flat().every((event) => (event.options ?? event.outcomes).length >= 2));
  assert.ok(EVENT_DECKS.flat().every((event) => !(event.options ?? event.outcomes).includes('storyMoment')));
  assert.ok(EVENT_DECKS.every((deck) => deck.filter((event) => event.archetype === 'pantry-mischief' && event.stage === 'ingredients').length === 3));
  assert.ok(EVENT_DECKS.every((deck) => deck.filter((event) => event.archetype === 'work-mischief' && event.stage === 'tasks').length === 8));
});

test('interludes include safe secret missions, a linked chicken gag, and a real break', () => {
  assert.equal(WATCH_CHALLENGES.length, 100);
  assert.equal(new Set(WATCH_CHALLENGES.map((challenge) => challenge.id)).size, 100);
  assert.equal(new Set(WATCH_CHALLENGES.map((challenge) => challenge.title.de)).size, 100);
  assert.equal(new Set(WATCH_CHALLENGES.map((challenge) => challenge.title.en)).size, 100);
  assert.equal(new Set(WATCH_CHALLENGES.map((challenge) => challenge.de)).size, 100);
  assert.equal(new Set(WATCH_CHALLENGES.map((challenge) => challenge.en)).size, 100);
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
  assert.deepEqual(WATCH_CHALLENGES.find((challenge) => challenge.id === 'ingredient-round')?.requirements, ['usedIngredientPerPlayer']);
  assert.ok(['next-steps', 'portion-captain', 'timer-check', 'safety-check']
    .every((id) => WATCH_CHALLENGES.find((challenge) => challenge.id === id)?.requirements.length > 0));
  assert.equal(WATCH_CHALLENGES.find((challenge) => challenge.id === 'portion-captain')?.playerSelection, true);
  const interludes = EVENT_DECKS.flat().filter((event) => event.archetype === 'interlude');
  assert.ok(interludes.length > 0);
  assert.ok(interludes.every((event) => event.type === 'choice' && event.options?.length === 2));
  assert.ok(interludes.every((event) => event.options.includes('watchChallenge') && event.options.includes('coinLoss')));
  assert.ok(interludes.every((event) => !event.options.includes('treasure')));
});

test('catalog contains 86 unique, ordered quest steps including five between-course clearing jobs', () => {
  const result = validateTaskCatalog();
  assert.equal(result.total, 86);
  assert.equal(result.uniqueIds, 86);
  assert.equal(result.uniqueGermanTitles, 86);
  assert.equal(result.uniqueEnglishTitles, 86);
  assert.equal(result.valid, true);
  assert.deepEqual(TASK_DECKS.map((deck) => deck.length), [16, 16, 13, 15, 13, 13]);
  assert.deepEqual(TASK_DECKS.map((deck) => deck.filter((card) => card.playable).length), [13, 15, 12, 14, 11, 12]);
  assert.equal(TASK_DECKS.flat().filter((card) => card.playable && card.questId === 'reset').length, 5);
  assert.ok(TASK_DECKS.flat().filter((card) => card.playable).every((card) => !['planning', 'story', 'optional'].includes(card.area)));
  assert.ok(TASK_DECKS.flat().every((card) => card.questName.de && card.questName.en && card.questStep >= 1));
  assert.ok(TASK_DECKS.flat().filter((card) => card.timingMode === 'background').every((card) => card.challengeMinutes === 0 && card.backgroundMinutes > 0));
  assert.ok(TASK_DECKS.flat().filter((card) => card.timingMode === 'manual').every((card) => card.challengeMinutes === 0 && card.backgroundMinutes === 0 && card.timerMinutes === 0));
});

test('serving waits for every preparation line and cleanup waits for completed serving', () => {
  TASK_DECKS.forEach((deck, chapterIndex) => {
    const prepIndices = deck.filter((card) => card.playable && !['serve', 'cleanup', 'reset'].includes(card.questId))
      .map((card) => card.blueprintIndex);
    const beforeCleanupIndices = deck.filter((card) => card.playable && !['cleanup', 'reset'].includes(card.questId))
      .map((card) => card.blueprintIndex);
    deck.filter((card) => card.playable && card.questId === 'serve').forEach((card) => {
      const requirements = new Set(card.prerequisites.map((entry) => entry.requiredBlueprintIndex));
      assert.ok(prepIndices.every((index) => requirements.has(index)), `${card.title.de} opened before preparation ended`);
    });
    deck.filter((card) => card.playable && card.questId === 'cleanup').forEach((card) => {
      const requirements = new Set(card.prerequisites.map((entry) => entry.requiredBlueprintIndex));
      assert.ok(beforeCleanupIndices.every((index) => requirements.has(index)), `${card.title.de} opened before serving ended`);
    });
    if (chapterIndex > 0) assert.equal(getPlayableQuestLines(chapterIndex).filter((line) => line[0].questId === 'reset').length, 1);
  });
  const tapasServing = getPlayableQuestLines(0).find((line) => line[0].questId === 'serve');
  assert.deepEqual(tapasServing.map((card) => card.title.de), ['Der faire Vorrat', 'Das erste Deckmahl', 'Flaggen auf den Platten']);
});

test('bacon dates are fried actively in a pan instead of baked in the oven', () => {
  const datesLine = getPlayableQuestLines(0).find((line) => line[0].questId === 'dates');
  assert.deepEqual(datesLine.map((card) => card.title.de), [
    'Datteln in Speck rollen',
    'Speckdatteln in der Pfanne braten',
    'Speckdatteln aus der Pfanne nehmen'
  ]);
  assert.ok(datesLine.slice(1).every((card) => card.area === 'hotplate' && card.safety === 'hotPan'));
  assert.ok(datesLine.every((card) => card.timingMode !== 'background'));
  assert.equal(datesLine[1].timingMode, 'manual');
  assert.equal(datesLine[1].challengeMinutes, 0);
});

test('baking and roasting steps with uncertain doneness never create game timers', () => {
  const manualTitles = [
    'Speckdatteln in der Pfanne braten',
    'Brot backen lassen',
    'Bratschlauch im Ofen',
    'Letzte Ofenetappe'
  ];
  const manualCards = TASK_DECKS.flat().filter((card) => manualTitles.includes(card.title.de));
  assert.equal(manualCards.length, manualTitles.length);
  assert.deepEqual(manualCards.map((card) => card.title.de).sort(), [...manualTitles].sort());
  assert.ok(manualCards.every((card) => card.timingMode === 'manual' && card.timerMinutes === 0 && card.challengeMinutes === 0));
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
