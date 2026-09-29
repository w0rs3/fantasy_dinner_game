import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { TASK_DECKS } from '../js/data/tasks.js';
import { renderGame } from '../js/ui/game.js';
import { renderSetup } from '../js/ui/welcome.js';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Ella', 'Finn'];
const cocktailTeams = ['alcoholic', 'alcohol-free', 'alcoholic', 'alcohol-free', 'alcoholic', 'alcohol-free'];
const now = 1_804_000_000_000;

function create(seed = 9_101) {
  return GameEngine.create({ names, title: 'Two cocktail crews', defaultLanguage: 'de', seed }, now);
}

function assignFixtureTeams(engine) {
  engine.state.players.forEach((player, index) => { player.cocktailTeam = cocktailTeams[index]; });
  return engine;
}

function enterCocktailChapter(engine, stage = 'ingredients') {
  assignFixtureTeams(engine);
  engine.state.activePlayerIndex = 0;
  engine.state.chapterIndex = 5;
  engine.state.chapter.stage = stage;
  engine.state.chapter.cocktailSpiritTarget = 1;
  engine.state.turn.phase = 'draw';
  engine.state.turn.courseDecisionType = null;
  engine.state.turn.tasksAssignedThisTurn = 0;
  engine.state.tasks = [];
  return engine;
}

function beginCocktailTeamRound(engine) {
  engine.state.chapterIndex = 4;
  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(now + 100), true);
  const clearing = engine.state.tasks.find((task) => task.chapterIndex === 5 && engine.getTaskCard(task)?.questId === 'reset');
  assert.ok(clearing);
  assert.equal(engine.state.chapter.stage, 'clearing');
  assert.equal(engine.completeTask(clearing.instanceId, now + 200), true);
  assert.equal(engine.state.chapter.stage, 'teamSelection');
  assert.equal(engine.state.turn.phase, 'cocktailTeamChoice');
  return engine;
}

test('the voyage setup asks only for names and defers cocktail teams to the game', () => {
  const html = renderSetup('de', {
    title: 'Teamwahl später', playerCount: names.length, defaultLanguage: 'de', names
  });
  assert.doesNotMatch(html, /name="cocktail-team-/);
  assert.doesNotMatch(html, /Cocktail-Team wählen …/);
  assert.match(html, /zu Beginn des Cocktailgangs festgelegt/);
});

test('cocktail teams are chosen in one uninterrupted personal round at the start of the course', () => {
  const engine = create(9_100);
  assert.ok(engine.state.players.every((player) => player.cocktailTeam == null), 'setup does not preassign cocktail teams');
  const drawnBefore = engine.state.eventsDrawn.length;
  beginCocktailTeamRound(engine);
  const order = [...engine.state.chapter.cocktailTeamSelectionPlayerIds];
  assert.equal(order.length, names.length);
  assert.equal(new Set(order).size, names.length);

  for (let index = 0; index < order.length; index += 1) {
    assert.equal(engine.activePlayer.id, order[index]);
    assert.equal(engine.state.chapter.cocktailTeamSelectionIndex, index);
    const html = renderGame(engine, 'de');
    assert.match(html, new RegExp(`Cocktail-Teamwahl · ${index + 1} von ${order.length}`));
    assert.match(html, new RegExp(`${engine.activePlayer.name}, welche Variante trinkst du`));
    const preferred = index % 2 === 0 ? 'alcoholic' : 'alcohol-free';
    assert.ok(engine.availableCocktailTeamChoices().includes(preferred));
    assert.equal(engine.chooseCocktailTeam(preferred, now + 300 + index), true);
  }

  assert.equal(engine.state.chapter.stage, 'ingredients');
  assert.equal(engine.state.turn.phase, 'courseDecision');
  assert.equal(engine.state.turn.courseDecisionType, 'cocktailSpiritCount');
  assert.equal(engine.activePlayer.id, order[0], 'the regular cocktail round starts after the completed selection circuit');
  assert.equal(engine.cocktailTeamsReady(), true);
  const spiritChoice = renderGame(engine, 'de');
  assert.match(spiritChoice, /Wie viele Spirituosensorten kommen in den alkoholischen Cocktail/);
  assert.equal(engine.chooseCocktailSpiritCount(0, now + 399), false);
  assert.equal(engine.chooseCocktailSpiritCount(2, now + 400), true);
  assert.equal(engine.state.chapter.cocktailSpiritTarget, 2);
  assert.equal(engine.state.turn.phase, 'draw');
  assert.equal(engine.state.history.filter((entry) => entry.type === 'cocktailTeamChosen').length, names.length);
  assert.equal(engine.state.history.filter((entry) => entry.type === 'cocktailSpiritCountChosen').length, 1);
  assert.deepEqual(new Set(engine.state.history.filter((entry) => entry.type === 'cocktailTeamChosen').map((entry) => entry.data.playerId)), new Set(order));
  assert.equal(engine.state.eventsDrawn.length, drawnBefore, 'no event or fun card interrupts the team round');
});

test('the final personal choice keeps both cocktail teams staffed', () => {
  const engine = beginCocktailTeamRound(create(9_105));
  const total = engine.state.players.length;
  for (let index = 0; index < total - 1; index += 1) {
    assert.equal(engine.chooseCocktailTeam('alcoholic', now + 400 + index), true);
  }
  assert.deepEqual(engine.availableCocktailTeamChoices(), ['alcohol-free']);
  assert.equal(engine.chooseCocktailTeam('alcoholic', now + 500), false);
  assert.equal(engine.chooseCocktailTeam('alcohol-free', now + 501), true);
  assert.equal(engine.cocktailTeamMembers('alcoholic').length, total - 1);
  assert.equal(engine.cocktailTeamMembers('alcohol-free').length, 1);
});

function completeCocktailComposition(engine) {
  engine.state.chapter.cocktailSpiritTarget = 1;
  const selected = new Map([
    ['rum', 'alcoholic'],
    ['oranges', 'alcoholic'],
    ['ginger', 'alcoholic'],
    ['apple-juice', 'alcoholic'],
    ['lemons', 'alcohol-free'],
    ['chocolate', 'alcohol-free'],
    ['mineral-water', 'alcohol-free']
  ]);
  engine.state.ingredients.forEach((ingredient) => {
    if (selected.has(ingredient.id)) {
      ingredient.status = 'locked';
      ingredient.chapterIndex = 5;
      ingredient.basketCourseIndex = null;
      ingredient.cocktailUse = selected.get(ingredient.id);
    } else if (ingredient.essential) {
      ingredient.status = 'used';
      ingredient.chapterIndex = 4;
      ingredient.basketCourseIndex = null;
    }
  });
  engine.state.chapter.stage = 'ingredients';
  engine.state.turn.phase = 'resolved';
  return engine;
}

test('sweetness and acidity tasks use assigned ingredients from each cocktail recipe', () => {
  const engine = completeCocktailComposition(enterCocktailChapter(create(9_112)));
  const cards = TASK_DECKS[5].filter((card) =>
    ['Freebooter Sweetness', 'Helmsman Sweetness', 'Freebooter Acidity', 'Helmsman Acidity'].includes(card.title.en)
  );

  assert.equal(cards.length, 4);
  cards.forEach((card) => {
    const basket = engine.reserveTaskBasket(card, `ingredient-task-${card.cardNumber}`);
    const allowedCategories = new Set(card.ingredientRequirement.categories);
    assert.ok(basket.length > 0, `${card.title.en} receives ingredients from its recipe`);
    basket.forEach((ingredientId) => {
      const ingredient = engine.getIngredient(ingredientId);
      assert.ok(allowedCategories.has(ingredient.category));
      assert.equal(ingredient.cocktailUse, card.cocktailTeam);
    });
    assert.match(card.instruction.en, /assigned .*recipe list/);
  });

  const sweetness = cards.filter((card) => card.title.en.includes('Sweetness'));
  const acidity = cards.filter((card) => card.title.en.includes('Acidity'));
  assert.deepEqual(sweetness.map((card) => engine.reserveTaskBasket(card, `sweet-${card.cardNumber}`).sort()), [
    ['apple-juice', 'oranges'],
    ['chocolate', 'lemons', 'mineral-water']
  ]);
  assert.deepEqual(acidity.map((card) => engine.reserveTaskBasket(card, `acid-${card.cardNumber}`).sort()), [
    ['apple-juice', 'oranges'],
    ['lemons', 'mineral-water']
  ]);
});

test('cocktail ingredients are displayed in two separate recipe lists', () => {
  const engine = enterCocktailChapter(create());
  const rum = engine.getIngredient('rum');
  const oranges = engine.getIngredient('oranges');
  const appleJuice = engine.getIngredient('apple-juice');
  const mineralWater = engine.getIngredient('mineral-water');

  [rum, oranges, appleJuice, mineralWater].forEach((ingredient) => {
    ingredient.status = 'discovered';
    ingredient.chapterIndex = 5;
    ingredient.basketCourseIndex = 5;
  });

  assert.equal(engine.lockIngredientFromBasket(rum.id, now + 1, 'alcohol-free'), false, 'spirits can never enter the alcohol-free recipe');
  assert.equal(engine.lockIngredientFromBasket(rum.id, now + 2, 'alcoholic'), true);
  assert.equal(engine.lockIngredientFromBasket(appleJuice.id, now + 3, 'alcoholic'), true);
  engine.state.activePlayerIndex = 1;
  assert.equal(engine.lockIngredientFromBasket(oranges.id, now + 3, 'alcohol-free'), true);
  assert.equal(engine.lockIngredientFromBasket(mineralWater.id, now + 4, 'alcohol-free'), true);
  assert.equal(engine.cocktailCompositionReady(), true);
  assert.deepEqual(engine.cocktailNonAlcoholIngredientCounts(['locked']), { alcoholic: 1, 'alcohol-free': 2 });

  const alcoholicCard = TASK_DECKS[5].find((card) => card.cocktailTeam === 'alcoholic' && card.usesCocktailTechnique);
  const alcoholFreeCard = TASK_DECKS[5].find((card) => card.cocktailTeam === 'alcohol-free' && card.usesCocktailTechnique);
  assert.deepEqual(engine.reserveTaskBasket(alcoholicCard, 'alc').sort(), ['apple-juice', 'rum']);
  assert.deepEqual(engine.reserveTaskBasket(alcoholFreeCard, 'free').sort(), ['mineral-water', 'oranges']);

  engine.state.chapter.stage = 'ingredients';
  const html = renderGame(engine, 'de');
  assert.match(html, /Zwei getrennte Zutatenlisten/);
  assert.match(html, /Zutatenliste · alkoholisch/);
  assert.match(html, /Zutatenliste · alkoholfrei/);
  assert.match(html, /Apfelsaft/);
  assert.match(html, /Mineralwasser/);
  assert.doesNotMatch(html, /data-action="(?:lock|remove)-basket-ingredient"/, 'cocktail ingredients cannot be locked or returned manually from the draft basket');
  assert.doesNotMatch(html, /data-action="assign-cocktail-ingredient"/, 'locked cocktail assignments cannot be changed manually from the draft basket');
});

test('non-alcohol choices belong only to the selecting cocktail team while alcohol-free players never choose spirits', () => {
  const alcoholicEngine = enterCocktailChapter(create(9_108));
  alcoholicEngine.state.activePlayerIndex = 0;
  assert.equal(alcoholicEngine.prepareIngredientChoice('alcohol', 'event', { all: true }), true);
  assert.deepEqual(new Set(alcoholicEngine.state.turn.pendingIngredientIds), new Set(['rum', 'gin', 'vodka', 'amaretto', 'triple-sec']));
  assert.equal(alcoholicEngine.chooseIngredient('amaretto', now + 1), true);
  assert.equal(alcoholicEngine.getIngredient('amaretto').cocktailUse, 'alcoholic');

  const alcoholFreeEngine = enterCocktailChapter(create(9_109));
  alcoholFreeEngine.state.activePlayerIndex = 1;
  assert.equal(alcoholFreeEngine.prepareIngredientChoice('alcohol', 'event', { all: true }), false);
  assert.equal(alcoholFreeEngine.prepareIngredientChoice('drinks', 'event', { all: true }), true);
  const juiceId = alcoholFreeEngine.state.turn.pendingIngredientIds.find((ingredientId) => ingredientId.endsWith('-juice'));
  assert.ok(juiceId);
  assert.equal(alcoholFreeEngine.chooseIngredient(juiceId, now + 2), true);
  assert.equal(alcoholFreeEngine.getIngredient(juiceId).cocktailUse, 'alcohol-free');
  alcoholFreeEngine.state.activePlayerIndex = 0;
  assert.equal(alcoholFreeEngine.lockIngredientFromBasket(juiceId, now + 3), true,
    'a later confirmation preserves the selecting team assignment');
  assert.equal(alcoholFreeEngine.getIngredient(juiceId).cocktailUse, 'alcohol-free');
});

test('both cocktails receive distinct non-alcohol ingredients', () => {
  const engine = enterCocktailChapter(create(9_110));
  const ingredientIds = ['rum', 'apple-juice', 'oranges', 'mineral-water'];
  ingredientIds.forEach((ingredientId) => {
    const ingredient = engine.getIngredient(ingredientId);
    ingredient.status = 'discovered';
    ingredient.chapterIndex = 5;
    ingredient.basketCourseIndex = 5;
  });

  engine.state.activePlayerIndex = 0;
  assert.equal(engine.lockIngredientFromBasket('rum', now + 1, 'alcoholic'), true);
  assert.equal(engine.lockIngredientFromBasket('apple-juice', now + 2, 'alcoholic'), true);
  engine.state.activePlayerIndex = 1;
  assert.equal(engine.lockIngredientFromBasket('oranges', now + 4, 'alcohol-free'), true);
  assert.equal(engine.lockIngredientFromBasket('mineral-water', now + 5, 'alcohol-free'), true);
  assert.deepEqual(engine.cocktailNonAlcoholIngredientCounts(['locked']), { alcoholic: 1, 'alcohol-free': 2 });
  assert.equal(engine.cocktailCompositionReady(), true);
  const html = renderGame(engine, 'de');
  assert.match(html, /1:2 getrennte alkoholfreie Zutaten/);
  assert.equal(engine.reserveTaskBasket(
    TASK_DECKS[5].find((card) => card.cocktailTeam === 'alcoholic' && card.usesCocktailTechnique), 'alc-distinct'
  ).includes('oranges'), false);
});

test('returned cocktail ingredients lose stale team assignments and cannot fill the last slot for the wrong team', () => {
  const engine = enterCocktailChapter(create(9_113));
  engine.state.chapter.cocktailSpiritTarget = 3;
  engine.state.ingredients.forEach((ingredient) => {
    if (ingredient.essential && !ingredient.courseTags.includes('tapas')) {
      ingredient.status = 'used';
      ingredient.chapterIndex = 4;
    }
  });
  const locked = new Map([
    ['cherries', 'alcoholic'],
    ['ginger', 'alcoholic'],
    ['honey', 'alcoholic'],
    ['oranges', 'alcoholic'],
    ['rum', 'alcoholic'],
    ['gin', 'alcoholic'],
    ['vodka', 'alcoholic'],
    ['orange-juice', 'alcoholic'],
    ['apple-juice', 'alcoholic'],
    ['second-ice', 'alcoholic']
  ]);
  locked.forEach((use, ingredientId) => {
    const ingredient = engine.getIngredient(ingredientId);
    ingredient.status = 'locked';
    ingredient.chapterIndex = 5;
    ingredient.cocktailUse = use;
  });
  const mineralWater = engine.getIngredient('mineral-water');
  mineralWater.status = 'available';
  mineralWater.chapterIndex = null;
  mineralWater.cocktailUse = 'alcohol-free';

  engine.state.activePlayerIndex = 0;
  assert.equal(engine.activePlayer.cocktailTeam, 'alcoholic');
  assert.equal(engine.courseIngredientCandidates().some((ingredient) => ingredient.id === mineralWater.id), false,
    'a stale label must not make an alcoholic selection look valid for the alcohol-free recipe');

  engine.state.activePlayerIndex = 1;
  assert.equal(engine.activePlayer.cocktailTeam, 'alcohol-free');
  assert.equal(engine.courseIngredientCandidates().some((ingredient) => ingredient.id === mineralWater.id), true);
  mineralWater.status = 'discovered';
  mineralWater.chapterIndex = 5;
  mineralWater.basketCourseIndex = 5;
  mineralWater.cocktailUse = 'alcohol-free';
  assert.equal(engine.removeIngredientFromBasket(mineralWater.id, now + 1), true);
  assert.equal(mineralWater.cocktailUse, undefined);
});

test('a pantry ingredient alone does not satisfy a cocktail team recipe', () => {
  const engine = enterCocktailChapter(create(9_115));
  engine.state.chapter.cocktailSpiritTarget = 3;
  engine.state.ingredients.forEach((ingredient) => {
    if (ingredient.essential && !ingredient.courseTags.includes('tapas')) {
      ingredient.status = 'used';
      ingredient.chapterIndex = 4;
    }
  });
  const locked = new Map([
    ['peppermint', 'alcohol-free'],
    ['pears', 'alcoholic'],
    ['ginger', 'alcoholic'],
    ['second-ice', 'alcoholic'],
    ['gin', 'alcoholic'],
    ['rum', 'alcoholic'],
    ['vodka', 'alcoholic'],
    ['apple-juice', 'alcoholic'],
    ['orange-juice', 'alcoholic'],
    ['mineral-water', 'alcoholic']
  ]);
  locked.forEach((use, ingredientId) => {
    const ingredient = engine.getIngredient(ingredientId);
    ingredient.status = 'locked';
    ingredient.chapterIndex = 5;
    ingredient.cocktailUse = use;
  });
  const finalFruit = engine.getIngredient('oranges');
  finalFruit.status = 'available';
  finalFruit.chapterIndex = null;

  engine.state.activePlayerIndex = 0;
  assert.equal(engine.activePlayer.cocktailTeam, 'alcoholic');
  assert.equal(engine.courseIngredientCandidates().some((ingredient) => ingredient.id === 'oranges'), false);
  engine.state.activePlayerIndex = 1;
  assert.equal(engine.activePlayer.cocktailTeam, 'alcohol-free');
  assert.equal(engine.courseIngredientCandidates().some((ingredient) => ingredient.id === 'oranges'), true,
    'the final fruit-or-drink slot is reserved for the team that still lacks one');
});

test('earlier courses reserve enough non-alcohol ingredients for a one-spirit cocktail', () => {
  const engine = create(9_114);
  engine.state.ingredients.forEach((ingredient) => {
    if (!['rum', 'mineral-water', 'apple-juice', 'oranges', 'ginger', 'peppermint', 'honey', 'second-ice'].includes(ingredient.id)) {
      ingredient.status = 'used';
    }
  });

  assert.equal(engine.futureCourseHasCapacity(5), true);
  assert.equal(engine.futureCourseHasCapacity(5, 'honey'), false,
    'an earlier course cannot consume one of only five remaining required cocktail ingredients');
});

test('older shared cocktail saves split non-alcohol ingredients between the recipes', () => {
  const engine = enterCocktailChapter(create(9_111));
  const snapshot = engine.snapshot();
  for (const ingredientId of ['apple-juice', 'oranges']) {
    const ingredient = snapshot.ingredients.find((entry) => entry.id === ingredientId);
    ingredient.status = 'locked';
    ingredient.chapterIndex = 5;
    ingredient.basketCourseIndex = null;
    ingredient.cocktailUse = 'shared';
  }

  const restored = new GameEngine(snapshot);
  assert.deepEqual(new Set([
    restored.getIngredient('apple-juice').cocktailUse,
    restored.getIngredient('oranges').cocktailUse
  ]), new Set(['alcoholic', 'alcohol-free']));
});

test('one to three distinct spirit varieties can be required and the cocktail round waits for the exact target', () => {
  const engine = enterCocktailChapter(create(9_106));
  engine.state.chapter.cocktailSpiritTarget = 3;
  const assignments = new Map([
    ['rum', 'alcoholic'], ['gin', 'alcoholic'], ['vodka', 'alcoholic'],
    ['apple-juice', 'alcoholic'], ['chocolate', 'alcoholic'],
    ['oranges', 'alcohol-free'], ['mineral-water', 'alcohol-free']
  ]);
  engine.state.ingredients.forEach((ingredient) => {
    if (assignments.has(ingredient.id)) {
      ingredient.status = 'discovered';
      ingredient.chapterIndex = 5;
      ingredient.basketCourseIndex = 5;
    }
  });

  assert.equal(engine.lockIngredientFromBasket('rum', now + 1, 'alcoholic'), true);
  assert.equal(engine.cocktailCompositionReady(), false, 'one spirit does not satisfy a three-spirit recipe');
  assert.equal(engine.lockIngredientFromBasket('gin', now + 2, 'alcoholic'), true);
  assert.equal(engine.cocktailCompositionReady(), false, 'two spirits do not satisfy a three-spirit recipe');
  assert.equal(engine.lockIngredientFromBasket('vodka', now + 3, 'alcoholic'), true);
  assert.equal(engine.lockIngredientFromBasket('apple-juice', now + 4, 'alcoholic'), true);
  engine.state.activePlayerIndex = 1;
  assert.equal(engine.lockIngredientFromBasket('oranges', now + 4, 'alcohol-free'), true);
  engine.state.activePlayerIndex = 0;
  assert.equal(engine.lockIngredientFromBasket('chocolate', now + 5, 'alcoholic'), true);
  engine.state.activePlayerIndex = 1;
  assert.equal(engine.lockIngredientFromBasket('mineral-water', now + 6, 'alcohol-free'), true);
  assert.equal(engine.cocktailCompositionReady(), true);
  assert.equal(engine.courseCategoryCount('alcohol', ['locked']), 3);
  assert.match(renderGame(engine, 'de'), /3\/3 Spirituosensorten/);

  engine.state.chapter.cocktailSpiritTarget = 2;
  const rum = engine.getIngredient('rum');
  rum.status = 'discovered';
  rum.basketCourseIndex = 5;
  engine.state.lastIngredientId = 'rum';
  assert.equal(engine.lockLastIngredient(now + 7, 'alcoholic'), false, 'a stale basket card cannot exceed the selected target');
});

test('all spirit varieties remain available for the alcoholic cocktail selection', () => {
  const engine = enterCocktailChapter(create(9_107));
  engine.state.chapter.cocktailSpiritTarget = null;
  engine.state.turn.phase = 'courseDecision';
  engine.state.turn.courseDecisionType = 'cocktailSpiritCount';

  assert.deepEqual(engine.availableCocktailSpiritCounts(), [1, 2, 3]);
  assert.match(renderGame(engine, 'de'), /data-count="3"/);
  assert.equal(engine.chooseCocktailSpiritCount(3, now + 1), true);
});

test('variant-specific mixing jobs can only be created by and assigned to their consumers', () => {
  const engine = enterCocktailChapter(create(9_102), 'tasks');
  const alcoholicCard = TASK_DECKS[5].find((card) => card.title.de === 'Früchte der Freibeuter');
  const alcoholFreeCard = TASK_DECKS[5].find((card) => card.title.de === 'Früchte der Steuermänner');
  assert.notEqual(alcoholicCard.questId, alcoholFreeCard.questId, 'both recipe lines must unlock independently');
  engine.state.taskQueues[5] = [alcoholicCard.id, alcoholFreeCard.id];

  engine.state.activePlayerIndex = 1;
  assert.equal(engine.activePlayer.cocktailTeam, 'alcohol-free');
  assert.deepEqual(engine.assignableTaskCards().map((card) => card.id), [alcoholFreeCard.id], 'the alcohol-free team sees only its own recipe');

  engine.state.activePlayerIndex = 0;
  assert.equal(engine.activePlayer.cocktailTeam, 'alcoholic');
  assert.deepEqual(engine.assignableTaskCards().map((card) => card.id), [alcoholicCard.id]);
  const task = engine.assignTask({ card: alcoholicCard, now: now + 1_000 });
  assert.ok(task);
  assert.ok(task.assignedPlayerIds.every((playerId) => engine.state.players.find((player) => player.id === playerId).cocktailTeam === 'alcoholic'));

  engine.state.activePlayerIndex = 1;
  engine.state.turn.tasksAssignedThisTurn = 0;
  const secondTask = engine.assignTask({ card: alcoholFreeCard, now: now + 2_000 });
  assert.ok(secondTask, 'the alcohol-free mix can begin while the alcoholic mix is still open');
  assert.ok(secondTask.assignedPlayerIds.every((playerId) => engine.state.players.find((player) => player.id === playerId).cocktailTeam === 'alcohol-free'));
  assert.deepEqual(task.assignedPlayerIds.filter((playerId) => secondTask.assignedPlayerIds.includes(playerId)), []);
});

test('the cocktail screen names both consumer teams and explains the split recipe work', () => {
  const engine = enterCocktailChapter(create(9_103), 'tasks');
  const html = renderGame(engine, 'de');
  assert.match(html, /Mit Alkohol/);
  assert.match(html, /Ada, Cleo, Ella/);
  assert.match(html, /Alkoholfrei/);
  assert.match(html, /Ben, Dario, Finn/);
  assert.match(html, /für jedes Team getrennt vergeben/);
  assert.equal(TASK_DECKS[5].filter((card) => card.cocktailTeam === 'alcoholic').length, 6);
  assert.equal(TASK_DECKS[5].filter((card) => card.cocktailTeam === 'alcohol-free').length, 6);
  assert.equal(TASK_DECKS[5].filter((card) => card.title.de.startsWith('Abschmecken der')).length, 2);
});

test('both cocktails require their own binding blended-or-stirred decision', () => {
  const engine = completeCocktailComposition(enterCocktailChapter(create(9_104)));

  assert.equal(engine.ingredientsLockedForCourse(), true);
  assert.equal(engine.cocktailCompositionReady(), true);
  assert.equal(engine.updateChapterStage(now + 1), true);
  assert.equal(engine.state.chapter.stage, 'ingredients');
  assert.equal(engine.state.turn.phase, 'courseDecision');
  assert.equal(engine.state.turn.pendingCocktailTeam, 'alcoholic');
  assert.equal(engine.activePlayer.cocktailTeam, 'alcoholic');
  let html = renderGame(engine, 'de');
  assert.match(html, /Wird der alkoholische Cocktail gemixt oder gerührt/);
  assert.match(html, /Eis ist für beide Varianten verbindlicher Grundvorrat/);

  assert.equal(engine.chooseCocktailTechnique('alcohol-free', 'stirred', now + 2), false, 'the visible recipe must be decided first');
  assert.equal(engine.chooseCocktailTechnique('alcoholic', 'mixed', now + 3), true);
  assert.equal(engine.state.turn.phase, 'courseDecision');
  assert.equal(engine.state.turn.pendingCocktailTeam, 'alcohol-free');
  assert.equal(engine.activePlayer.cocktailTeam, 'alcohol-free');
  html = renderGame(engine, 'de');
  assert.match(html, /Wird der alkoholfreie Cocktail gemixt oder gerührt/);

  assert.equal(engine.chooseCocktailTechnique('alcohol-free', 'stirred', now + 4), true);
  assert.equal(engine.state.chapter.stage, 'tasks');
  assert.equal(engine.state.turn.phase, 'draw');
  assert.deepEqual(engine.state.chapter.cocktailTechniques, { alcoholic: 'mixed', 'alcohol-free': 'stirred' });
  assert.deepEqual(engine.state.menu[5].cocktailTechniques, { alcoholic: 'mixed', 'alcohol-free': 'stirred' });

  const alcoholicCard = TASK_DECKS[5].find((card) => card.cocktailTeam === 'alcoholic' && card.usesCocktailTechnique);
  const alcoholFreeCard = TASK_DECKS[5].find((card) => card.cocktailTeam === 'alcohol-free' && card.usesCocktailTechnique);
  assert.match(engine.getTaskCard({ taskId: alcoholicCard.id, chapterIndex: 5 }).instruction.de, /Verbindliche Technik: Mixen/);
  assert.match(engine.getTaskCard({ taskId: alcoholFreeCard.id, chapterIndex: 5 }).instruction.de, /Verbindliche Technik: Rühren/);
  html = renderGame(engine, 'de');
  assert.match(html, /Technik: mixen/);
  assert.match(html, /Technik: rühren/);
});
