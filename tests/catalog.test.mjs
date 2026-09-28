import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_DECKS, EVENT_STAGES, WATCH_CHALLENGES, validateEventCatalog } from '../js/data/events.js';
import { COURSE_INGREDIENT_RULES, INGREDIENTS, buildIngredientPlan, validateIngredientPlan } from '../js/data/ingredients.js';
import { TASK_DECKS, getPlayableQuestLines, validateTaskCatalog } from '../js/data/tasks.js';
import { ROLES, getRole } from '../js/data/roles.js';

test('catalog contains 688 uniquely named event cards including active deck-choice events', () => {
  const result = validateEventCatalog();
  assert.equal(result.total, 688);
  assert.equal(result.uniqueIds, 688);
  assert.equal(result.uniqueGermanTitles, 688);
  assert.equal(result.uniqueEnglishTitles, 688);
  assert.equal(result.uniqueGermanStories, 688);
  assert.equal(result.uniqueEnglishStories, 688);
  assert.equal(result.valid, true);
  assert.deepEqual(EVENT_DECKS.map((deck) => deck.length), [113, 113, 113, 123, 113, 113]);
  EVENT_DECKS.forEach((deck, chapterIndex) => {
    const expectedCounts = chapterIndex === 3 ? [21, 20, 21, 20, 21, 20] : [21, 18, 19, 18, 19, 18];
    assert.ok(expectedCounts.every((expected, locationIndex) => deck.filter((event) => event.locationIndex === locationIndex).length === expected));
  });
  assert.equal(EVENT_DECKS[3].filter((event) => event.archetype === 'work-mischief').length, 18);
  assert.deepEqual(result.stageCounts, { ingredients: 198, tasks: 166, cooking: 324 });
  assert.ok(['card-fate', 'deck-crossroads', 'quiz-compass', 'named-card-gallery']
    .every((archetype) => EVENT_DECKS.flat().filter((event) => event.archetype === archetype).length === 36));
  assert.equal(EVENT_DECKS.flat().some((event) => event.archetype === 'respite'), false);
  assert.equal(EVENT_DECKS.flat().some((event) => (event.options ?? event.outcomes).includes('fiveMinuteBreak')), false);
  assert.ok(EVENT_DECKS.every((deck) => EVENT_STAGES.every((stage) => deck.some((event) => event.stage === stage))));
  assert.ok(EVENT_DECKS.flat().every((event) => (event.options ?? event.outcomes).length >= 2));
  assert.ok(EVENT_DECKS.flat().every((event) => !(event.options ?? event.outcomes).includes('storyMoment')));
  assert.ok(EVENT_DECKS.every((deck) => deck.filter((event) => event.archetype === 'pantry-mischief' && event.stage === 'ingredients').length === 3));
  assert.deepEqual(EVENT_DECKS.map((deck) => deck.filter((event) => event.archetype === 'work-mischief' && event.stage === 'tasks').length), [8, 8, 8, 18, 8, 8]);
});

test('interludes reserve privacy for linked surprises alongside drinks and co-op cards', () => {
  assert.equal(WATCH_CHALLENGES.length, 237);
  assert.equal(new Set(WATCH_CHALLENGES.map((challenge) => challenge.id)).size, 237);
  assert.equal(new Set(WATCH_CHALLENGES.map((challenge) => challenge.title.de)).size, 237);
  assert.equal(new Set(WATCH_CHALLENGES.map((challenge) => challenge.title.en)).size, 237);
  assert.equal(new Set(WATCH_CHALLENGES.map((challenge) => challenge.de)).size, 237);
  assert.equal(new Set(WATCH_CHALLENGES.map((challenge) => challenge.en)).size, 237);
  const cooperative = WATCH_CHALLENGES.filter((challenge) => challenge.cooperative);
  assert.equal(cooperative.length, 70);
  assert.equal(cooperative.filter((challenge) => challenge.partnerCount === 1).length, 44);
  assert.equal(cooperative.filter((challenge) => challenge.partnerCount === 2).length, 26);
  assert.deepEqual(
    WATCH_CHALLENGES.filter((challenge) => challenge.secret).map((challenge) => challenge.id),
    ['pirate-word-curse', 'ship-word-curse', 'treasure-word-curse', 'standing-fun-curse', 'correct-quiz-curse',
      'charade-anchor', 'charade-parrot', 'charade-treasure-chest', 'charade-storm-ship',
      'charade-lighthouse', 'charade-cannon', 'charade-seasick-pirate', 'charade-buried-treasure']
  );
  assert.equal(WATCH_CHALLENGES.some((challenge) => challenge.id === 'five-minute-break'), false);
  const chicken = WATCH_CHALLENGES.find((challenge) => challenge.id === 'chicken');
  assert.equal(chicken.followUpId, 'stop-chicken');
  assert.ok(WATCH_CHALLENGES.some((challenge) => challenge.id === chicken.followUpId && challenge.cardKind === 'blessing' && !challenge.secret));
  assert.ok(['compliments', 'love-decisions', 'laugh-turn', 'chicken'].every((id) =>
    WATCH_CHALLENGES.find((challenge) => challenge.id === id)?.flow === 'ongoing'
  ));
  assert.ok(WATCH_CHALLENGES.every((challenge) => ['immediate', 'ongoing'].includes(challenge.flow)));
  assert.equal(WATCH_CHALLENGES.find((challenge) => challenge.id === 'odd-dance')?.secret, false);
  assert.ok(WATCH_CHALLENGES.length >= 40, `expected a varied challenge deck, got ${WATCH_CHALLENGES.length}`);
  assert.equal(new Set(WATCH_CHALLENGES.map((challenge) => challenge.id)).size, WATCH_CHALLENGES.length);
  assert.ok(['odd-dance', 'table-lap', 'compliments', 'love-decisions', 'laugh-turn', 'impatient-fingers',
    'three-hops', 'under-table-search', 'accent-shift', 'self-compliments', 'aye-aye-sentences', 'arr-sentences',
    'captain-permission', 'self-talk', 'bad-joke', 'hiccups', 'mime-self-slap', 'hand-trumpet', 'chair-circle',
    'ceremonial-greeting'].every((id) => WATCH_CHALLENGES.some((challenge) => challenge.id === id && !challenge.secret)));
  assert.equal(WATCH_CHALLENGES.filter((challenge) => challenge.cardKind === 'curse').length, 24);
  assert.equal(WATCH_CHALLENGES.filter((challenge) => challenge.cardKind === 'blessing').length, 5);
  assert.equal(WATCH_CHALLENGES.filter((challenge) => challenge.cardKind === 'charade').length, 8);
  assert.ok(WATCH_CHALLENGES.filter((challenge) => challenge.followUpOnly).every((challenge) => challenge.mandatory && challenge.cardKind === 'blessing' && !challenge.secret));
  assert.equal(WATCH_CHALLENGES.find((challenge) => challenge.id === 'folded-note')?.secret, false);
  const pirateVerse = WATCH_CHALLENGES.find((challenge) => challenge.id === 'pirate-verse');
  assert.equal(pirateVerse?.secret, false);
  assert.match(pirateVerse?.de ?? '', /Piratenlied|Piratengedicht/);
  assert.ok(EVENT_DECKS.flat().some((event) => event.archetype === 'mischief'));
  assert.deepEqual(WATCH_CHALLENGES.find((challenge) => challenge.id === 'ingredient-round')?.requirements, ['usedIngredientPerPlayer']);
  assert.ok(['next-steps', 'portion-captain', 'timer-check', 'safety-check']
    .every((id) => WATCH_CHALLENGES.find((challenge) => challenge.id === id)?.requirements.length > 0));
  assert.equal(WATCH_CHALLENGES.find((challenge) => challenge.id === 'portion-captain')?.playerSelection, true);
  const drinkServiceCards = WATCH_CHALLENGES.filter((challenge) => ['drink-refill-round', 'empty-glass-lookout', 'drink-supplies-check', 'drink-wishes'].includes(challenge.id));
  assert.equal(drinkServiceCards.length, 4);
  assert.ok(drinkServiceCards.every((challenge) => /Getränk|Gläser|Becher/.test(`${challenge.title.de} ${challenge.de}`)));
  assert.ok(drinkServiceCards.every((challenge) => !/Wasser|water/i.test(`${challenge.title.de} ${challenge.de} ${challenge.title.en} ${challenge.en}`)));
  assert.equal(WATCH_CHALLENGES.some((challenge) => challenge.id === 'fresh-water'), false);
  assert.doesNotMatch(WATCH_CHALLENGES.find((challenge) => challenge.id === 'table-check').de, /Wasser/);
  const interludes = EVENT_DECKS.flat().filter((event) => event.archetype === 'interlude');
  assert.ok(interludes.length > 0);
  assert.ok(interludes.every((event) => event.type === 'choice' && event.options?.length === 2));
  assert.ok(interludes.every((event) => event.options.includes('watchChallenge') && event.options.includes('coinLoss')));
  assert.ok(interludes.every((event) => !event.options.includes('treasure')));
});

test('catalog contains 87 unique, ordered quest steps including five between-course clearing jobs', () => {
  const result = validateTaskCatalog();
  assert.equal(result.total, 87);
  assert.equal(result.uniqueIds, 87);
  assert.equal(result.uniqueGermanTitles, 87);
  assert.equal(result.uniqueEnglishTitles, 87);
  assert.equal(result.valid, true);
  assert.deepEqual(TASK_DECKS.map((deck) => deck.length), [16, 14, 15, 14, 11, 17]);
  assert.deepEqual(TASK_DECKS.map((deck) => deck.filter((card) => card.playable).length), [13, 13, 14, 13, 10, 16]);
  assert.equal(TASK_DECKS.flat().filter((card) => card.playable && card.questId === 'reset').length, 5);
  assert.ok(TASK_DECKS.flat().filter((card) => card.playable).every((card) =>
    !['planning', 'story'].includes(card.area) && (card.area !== 'optional' || card.ingredientRequirement)
  ));
  assert.ok(TASK_DECKS.flat().every((card) => card.questName.de && card.questName.en && card.questStep >= 1));
  assert.ok(TASK_DECKS.flat().filter((card) => card.timingMode === 'background').every((card) => card.challengeMinutes === 0 && card.backgroundMinutes > 0));
  assert.ok(TASK_DECKS.flat().filter((card) => card.timingMode === 'manual').every((card) => card.challengeMinutes === 0 && card.backgroundMinutes === 0 && card.timerMinutes === 0));
  assert.deepEqual(TASK_DECKS[1].filter((card) => card.repeatOnRelief).map((card) => card.title.de), ['Kesselwache']);
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

test('the main-course workflow prepares in parallel and opens one unassigned baking gate after loading the oven', () => {
  const main = TASK_DECKS[3];
  const prepQuestIds = ['meat', 'vegetables', 'fruit', 'sauce', 'preheat'];
  const prepCards = prepQuestIds.map((questId) => main.find((card) => card.questId === questId));
  const fill = main.find((card) => card.title.de === 'Das große Feuerpaket befüllen');
  const load = main.find((card) => card.title.de === 'Feuerpaket verschließen und einschiffen');
  const ovenLine = getPlayableQuestLines(3).find((line) => line[0].questId === 'oven');
  const baking = main.find((card) => card.title.de === 'Bratschlauch backen lassen');
  const rest = main.find((card) => card.title.de === 'Ruhe vor dem Festmahl');
  const sauceFinish = main.find((card) => card.title.de === 'Sauce aus dem Bratschlauch vollenden');

  assert.ok(prepCards.every((card) => card && card.prerequisites.length === 0), 'all preparation lines can start in parallel');
  const fillRequirements = new Set(fill.prerequisites.map((entry) => entry.requiredBlueprintIndex));
  assert.ok(prepCards.every((card) => fillRequirements.has(card.blueprintIndex)), 'the bag waits for every applicable preparation line');
  assert.ok(load.prerequisites.some((entry) => entry.requiredBlueprintIndex === fill.blueprintIndex));
  assert.deepEqual(ovenLine.map((card) => card.title.de), ['Feuerpaket verschließen und einschiffen', 'Bratschlauch backen lassen']);
  assert.equal(baking.timingMode, 'manual');
  assert.equal(baking.challengeMinutes, 0);
  assert.equal(baking.automatic, true);
  assert.equal(baking.unassigned, true);
  assert.deepEqual(baking.people, [0, 0]);
  assert.ok(baking.prerequisites.some((entry) => entry.requiredBlueprintIndex === load.blueprintIndex));
  assert.ok(rest.prerequisites.some((entry) => entry.requiredBlueprintIndex === baking.blueprintIndex));
  assert.equal(rest.timingMode, 'background');
  assert.equal(rest.backgroundMinutes, 10);
  assert.match(rest.instruction.de, /fünf Minuten ruhen/);
  assert.ok(sauceFinish.prerequisites.some((entry) => entry.requiredBlueprintIndex === rest.blueprintIndex));

  const dessert = TASK_DECKS[4];
  const ice = dessert.find((card) => card.title.de === 'Eis aus der Höhle');
  const warmFruit = dessert.find((card) => card.title.de === 'Die warme Fruchtbeute');
  const plans = dessert.find((card) => card.title.de === 'Die zwei Schatzpläne');
  const chocolate = dessert.find((card) => card.title.de === 'Schokoladenschatz');
  assert.equal(dessert.some((card) => card.title.de === 'Kühle Wache'), false);
  assert.equal(dessert.some((card) => card.title.de === 'Die erste Lagunenprobe'), false);
  assert.ok(ice.prerequisites.some((entry) => entry.requiredBlueprintIndex === warmFruit.blueprintIndex && entry.state === 'done'));
  assert.ok(ice.prerequisites.some((entry) => entry.requiredBlueprintIndex === plans.blueprintIndex && entry.state === 'done'));
  assert.deepEqual(ice.ingredientRequirement.ids, ['vanilla-ice', 'second-ice']);
  assert.equal(chocolate.playable, true);
  assert.deepEqual(chocolate.ingredientRequirement, { ids: ['chocolate'] });
  assert.equal(dessert.some((card) => card.ingredientRequirement?.categories?.includes('alcohol')), false);
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
    'Salatfleisch in der Pfanne braten',
    'Brot backen lassen',
    'Bratschlauch backen lassen'
  ];
  const manualCards = TASK_DECKS.flat().filter((card) => manualTitles.includes(card.title.de));
  assert.equal(manualCards.length, manualTitles.length);
  assert.deepEqual(manualCards.map((card) => card.title.de).sort(), [...manualTitles].sort());
  assert.ok(manualCards.every((card) => card.timingMode === 'manual' && card.timerMinutes === 0 && card.challengeMinutes === 0));
});

test('the soup protein insert is completed by safe doneness and only ingredient-backed garnish work is dealt', () => {
  const soupProtein = TASK_DECKS[1].find((card) => card.title.de === 'Einlage aus dem Pilzwald');
  const soupCrunch = TASK_DECKS[1].find((card) => card.title.de === 'Knusperbeute im Nebel');
  const dessertGarnish = TASK_DECKS[4].find((card) => card.title.de === 'Garnitur aus der Truhe');
  assert.equal(soupProtein.timingMode, 'manual');
  assert.equal(soupProtein.challengeMinutes, 0);
  assert.deepEqual(soupCrunch.ingredientRequirement.ids, ['croutons', 'nuts', 'seeds']);
  assert.deepEqual(dessertGarnish.ingredientRequirement.ids, ['sprinkles', 'chocolate', 'nuts', 'seeds']);
});

test('all thirteen roles are unique and have finite active uses', () => {
  assert.equal(ROLES.length, 13);
  assert.equal(new Set(ROLES.map((role) => role.id)).size, 13);
  assert.ok(ROLES.every((role) => role.name.de && role.name.en && role.passive.de && role.active.en));
  assert.ok(ROLES.every((role) => {
    const described = getRole(role.id);
    return described.passiveUsage.de && described.passiveUsage.en && described.activeUsage.de && described.activeUsage.en && described.activeButton.de && described.activeButton.en;
  }));
  assert.ok(ROLES.every((role) => role.uses > 0 && Number.isInteger(role.uses)));
});

test('ingredient planner keeps a tagged global pool and only fixes Tapas', () => {
  assert.equal(INGREDIENTS.length, 53);
  assert.deepEqual(INGREDIENTS.filter((ingredient) => !ingredient.essential).map((ingredient) => ingredient.id).sort(), ['amaretto', 'apple-juice', 'cherry-juice', 'gin', 'orange-juice', 'rum', 'second-ice', 'triple-sec', 'vodka']);
  assert.ok(['mince', 'milk', 'butter', 'yoghurt', 'broth', 'herbs', 'vinegar', 'ice-cubes', 'fruit-dates', 'cooking-cream', 'whipping-cream', 'olive-oil'].every((id) => !INGREDIENTS.some((ingredient) => ingredient.id === id)));
  assert.equal(Object.entries(COURSE_INGREDIENT_RULES).filter(([course]) => course !== 'tapas').reduce((sum, [, rule]) => sum + rule.target, 0), 35);
  assert.equal(COURSE_INGREDIENT_RULES.main.target, 11);
  assert.equal(COURSE_INGREDIENT_RULES.dessert.target, 6);
  assert.deepEqual(COURSE_INGREDIENT_RULES.cocktails.categoryMinimums, { fruit: 1, drinks: 2 });
  assert.equal(COURSE_INGREDIENT_RULES.cocktails.target, 5);
  assert.ok(INGREDIENTS.filter((ingredient) => ingredient.category !== 'tapas').every((ingredient) => ingredient.effect), 'every flexible ingredient must have a card effect');
  assert.deepEqual(INGREDIENTS.filter((ingredient) => ['coins3', 'coins5'].includes(ingredient.effect)).map((ingredient) => ingredient.id), ['lettuce', 'honey', 'vanilla-ice', 'mineral-water']);
  assert.deepEqual(INGREDIENTS.find((ingredient) => ingredient.id === 'peppermint').courseTags, ['salad', 'dessert', 'cocktails']);
  assert.deepEqual(INGREDIENTS.find((ingredient) => ingredient.id === 'cucumber').courseTags, ['salad', 'main']);
  assert.ok(!INGREDIENTS.some((ingredient) => ingredient.id === 'juices'));
  assert.deepEqual(INGREDIENTS.filter((ingredient) => ingredient.category === 'drinks' && !ingredient.essential).map((ingredient) => ingredient.id).sort(), ['apple-juice', 'cherry-juice', 'orange-juice']);
  assert.ok(!INGREDIENTS.find((ingredient) => ingredient.id === 'potatoes').courseTags.includes('salad'), 'potatoes require cooking and cannot be assigned to the salad');
  assert.ok(!INGREDIENTS.find((ingredient) => ingredient.id === 'chestnuts').courseTags.includes('salad'), 'chestnuts require cooking and cannot be assigned to the salad');
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
