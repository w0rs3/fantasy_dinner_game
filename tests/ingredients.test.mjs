import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { EVENT_DECKS } from '../js/data/events.js';
import { INGREDIENTS, INGREDIENT_EFFECT_TEXT } from '../js/data/ingredients.js';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Eva', 'Finn'];
const createEngine = (seed = 801) => {
  const engine = GameEngine.create({ names, title: 'Ingredient effects', defaultLanguage: 'de', seed }, 1_800_000_000_000);
  engine.completeTask(engine.state.tasks[0].instanceId, 1_800_000_000_050);
  engine.state.turn.phase = 'eating';
  engine.startNextChapter(1_800_000_000_100);
  engine.beginEvent(1_800_000_000_110);
  engine.chooseSoupStyle('cream', 1_800_000_000_120);
  return engine;
};

function effectCard(engine, effect) {
  return engine.state.ingredients.find((ingredient) => ingredient.effect === effect);
}

function beginAbilityIngredientFlow(engine) {
  engine.state.turn.ingredientFlow = {
    context: 'ability', previousPhase: engine.state.turn.phase, eventId: engine.currentEvent?.id ?? null,
    drawQueue: [], replaceCurrentEvent: false
  };
}

function moveIngredientToCurrentTop(engine, ingredientId) {
  const ingredient = engine.state.ingredients.find((entry) => entry.id === ingredientId);
  ingredient.chapterIndex = engine.state.chapterIndex;
  ingredient.status = 'available';
  engine.state.ingredientQueues.forEach((queue) => {
    const index = queue.indexOf(ingredientId);
    if (index >= 0) queue.splice(index, 1);
  });
  engine.state.ingredientQueues[engine.state.chapterIndex].unshift(ingredientId);
}

function completeSoupCompositionForTest(engine) {
  ['seeds', 'croutons', 'pumpkin', 'carrots', 'chicken', 'nuts'].forEach((ingredientId) => {
    const ingredient = engine.getIngredient(ingredientId);
    ingredient.status = 'used';
    ingredient.chapterIndex = 1;
    ingredient.basketCourseIndex = null;
  });
}

function completeSaladCompositionForTest(engine) {
  ['lettuce', 'garlic', 'herbs', 'vinegar', 'mustard', 'apples', 'pears', 'beef', 'chestnuts'].forEach((ingredientId) => {
    const ingredient = engine.getIngredient(ingredientId);
    ingredient.status = 'used';
    ingredient.chapterIndex = 2;
    ingredient.basketCourseIndex = null;
  });
}

test('every prepared ingredient effect is translated and handled by the engine', () => {
  const effects = [...new Set(INGREDIENTS.map((ingredient) => ingredient.effect).filter(Boolean))];
  assert.equal(effects.length, 20);
  for (const effect of effects) {
    assert.ok(INGREDIENT_EFFECT_TEXT[effect]?.de, `missing German text for ${effect}`);
    assert.ok(INGREDIENT_EFFECT_TEXT[effect]?.en, `missing English text for ${effect}`);
    const engine = createEngine(810 + effects.indexOf(effect));
    beginAbilityIngredientFlow(engine);
    const previousIngredientId = effect === 'repeatIngredient' ? effectCard(engine, 'doubleDie').id : null;
    assert.equal(engine.applyIngredientEffect(effectCard(engine, effect), 1_800_000_001_000, { previousIngredientId }), true, `unhandled ${effect}`);
    assert.equal(engine.state.history.at(-1).type, 'ingredientEffectApplied');
  }
});

test('persistent ingredient bonuses are consumed by the intended later action', () => {
  const engine = createEngine(850);
  beginAbilityIngredientFlow(engine);
  engine.applyIngredientEffect(effectCard(engine, 'doubleDie'));
  engine.applyIngredientEffect(effectCard(engine, 'rerollDie'));
  engine.applyIngredientEffect(effectCard(engine, 'adjustDie'));
  engine.applyIngredientEffect(effectCard(engine, 'ignoreEvent'));
  engine.applyIngredientEffect(effectCard(engine, 'ignoreIngredient'));
  engine.applyIngredientEffect(effectCard(engine, 'repeatNextIngredient'));
  engine.applyIngredientEffect(effectCard(engine, 'replaceIngredient'));
  engine.applyIngredientEffect(effectCard(engine, 'revealEvent'));
  engine.applyIngredientEffect(effectCard(engine, 'extraTurn'));
  engine.applyIngredientEffect(effectCard(engine, 'nextPlayer'));

  assert.deepEqual({
    double: engine.activeBonuses.doubleNextDie,
    reroll: engine.activeBonuses.rerollNext,
    adjust: engine.activeBonuses.adjustNext,
    ignoreEvent: engine.activeBonuses.ignoreNextEvent,
    ignoreIngredient: engine.activeBonuses.ignoreNextIngredientEffect,
    repeatIngredient: engine.activeBonuses.repeatNextIngredientEffect,
    replaceIngredient: engine.activeBonuses.replaceNextIngredient,
    reveal: engine.activeBonuses.revealNextEvent,
    chain: engine.state.turn.chainPending,
    extra: engine.activeBonuses.extraTurns,
    next: engine.activeBonuses.forceNextPlayer
  }, { double: 1, reroll: 1, adjust: 1, ignoreEvent: 1, ignoreIngredient: 1, repeatIngredient: 1, replaceIngredient: 1, reveal: 2, chain: true, extra: 0, next: 0 });

  const diceEvent = EVENT_DECKS[0].find((event) => event.type === 'dice');
  engine.state.turn.currentEventId = diceEvent.id;
  engine.state.turn.phase = 'rolled';
  engine.state.turn.dieResult = 3;
  assert.ok(engine.rerollDieWithIngredient() >= 1);
  assert.equal(engine.activeBonuses.rerollNext, 0);
  assert.equal(engine.adjustDieWithIngredient(1), true);
  assert.equal(engine.activeBonuses.adjustNext, 0);
  const adjustedResult = engine.state.turn.dieResult;
  assert.equal(engine.confirmRoll(), true);
  assert.equal(engine.state.turn.dieResult, Math.min(6, adjustedResult * 2));
  assert.equal(engine.activeBonuses.doubleNextDie, 0);
});

test('draw, character-choice, deck-swap, repeat, and event-replacement effects complete their UI flows', () => {
  const drawEngine = createEngine(880);
  beginAbilityIngredientFlow(drawEngine);
  drawEngine.applyIngredientEffect(effectCard(drawEngine, 'drawIngredient'));
  drawEngine.continueIngredientFlow();
  assert.equal(drawEngine.state.turn.phase, 'ingredientChoice');
  assert.ok(drawEngine.state.turn.pendingIngredientIds.length >= 1);

  const onionEngine = createEngine(881);
  beginAbilityIngredientFlow(onionEngine);
  onionEngine.applyIngredientEffect(effectCard(onionEngine, 'disablePassive'));
  assert.equal(onionEngine.state.turn.phase, 'effectChoice');
  assert.equal(onionEngine.resolveIngredientEffectChoice('player-2'), true);
  assert.equal(onionEngine.isPassiveEnabled(onionEngine.state.players[1]), false);
  onionEngine.state.players[1].turns += 1;
  assert.equal(onionEngine.isPassiveEnabled(onionEngine.state.players[1]), true);

  const swapEngine = createEngine(882);
  beginAbilityIngredientFlow(swapEngine);
  swapEngine.applyIngredientEffect(effectCard(swapEngine, 'swapTopCards'));
  const category = swapEngine.state.turn.pendingEffect.options[0];
  const before = swapEngine.ingredientCandidates(category).slice(0, 2).map((ingredient) => ingredient.id);
  assert.equal(swapEngine.resolveIngredientEffectChoice(category), true);
  assert.deepEqual(swapEngine.ingredientCandidates(category).slice(0, 2).map((ingredient) => ingredient.id), before.reverse());

  const repeatEngine = createEngine(883);
  beginAbilityIngredientFlow(repeatEngine);
  repeatEngine.applyIngredientEffect(effectCard(repeatEngine, 'repeatIngredient'), Date.now(), { previousIngredientId: effectCard(repeatEngine, 'doubleDie').id });
  assert.equal(repeatEngine.activeBonuses.doubleNextDie, 1);

  const replaceEngine = createEngine(884);
  replaceEngine.beginEvent();
  const replacedId = replaceEngine.currentEvent.id;
  replaceEngine.state.turn.ingredientFlow = {
    context: 'event', previousPhase: 'event', eventId: replacedId, drawQueue: [], replaceCurrentEvent: false
  };
  replaceEngine.applyIngredientEffect(effectCard(replaceEngine, 'replaceEvent'));
  replaceEngine.continueIngredientFlow();
  assert.equal(replaceEngine.state.turn.phase, 'event');
  assert.notEqual(replaceEngine.currentEvent.id, replacedId);
  assert.ok(Object.values(replaceEngine.state.eventQueues[1]).flat(2).includes(replacedId));
});

test('the Cook can ignore one ingredient effect per course and the Alchemist passive is separate from active uses', () => {
  const cookEngine = createEngine(900);
  cookEngine.activePlayer.roleId = 'cook';
  assert.equal(cookEngine.prepareIngredientChoice('meat', 'ability', { all: true }), true);
  assert.ok(cookEngine.state.turn.pendingIngredientIds.includes('beef'));
  assert.equal(cookEngine.chooseIngredient('beef', Date.now(), true), true);
  assert.equal(cookEngine.activeBonuses.doubleNextDie, 0);
  assert.equal(cookEngine.canCookIgnoreIngredientEffect(), false);

  const alchemistEngine = createEngine(901);
  alchemistEngine.activePlayer.roleId = 'alchemist';
  const first = alchemistEngine.ingredientCandidates()[0];
  const alternative = alchemistEngine.ingredientCandidates(first.category)[1];
  assert.ok(alternative, 'test requires an ingredient alternative');
  first.status = 'discovered';
  alchemistEngine.state.lastIngredientId = first.id;
  const uses = alchemistEngine.activePlayer.activeUsesRemaining;
  assert.equal(alchemistEngine.useAlchemistPassive(), true);
  assert.equal(alchemistEngine.activePlayer.activeUsesRemaining, uses);
  assert.equal(alchemistEngine.useAlchemistPassive(), false);
});

test('category-role and Treasurer passives follow the character-card wording', () => {
  const cases = [
    ['herbalist', 'pumpkin'],
    ['hunter', 'beef'],
    ['gatherer', 'apples']
  ];
  for (const [roleId, ingredientId] of cases) {
    const engine = createEngine(920 + cases.findIndex((entry) => entry[0] === roleId));
    engine.activePlayer.roleId = roleId;
    if (roleId === 'gatherer') {
      completeSoupCompositionForTest(engine);
      engine.state.turn.phase = 'eating';
      assert.equal(engine.startNextChapter(), true);
    }
    assert.equal(engine.useCategoryRolePassive(), true, roleId);
    const offered = engine.state.turn.pendingIngredientIds[0];
    assert.equal(engine.getIngredient(offered).category, engine.getIngredient(ingredientId).category);
    engine.chooseIngredient(offered);
    assert.equal(engine.useCategoryRolePassive(), false, `${roleId} passive must be once per course`);
  }

  const merchant = createEngine(930);
  merchant.activePlayer.roleId = 'merchant';
  assert.equal(merchant.prepareIngredientChoice(), true);
  assert.equal(merchant.state.turn.pendingIngredientIds.length, 2);

  const treasurer = createEngine(931);
  treasurer.activePlayer.roleId = 'treasurer';
  completeSoupCompositionForTest(treasurer);
  treasurer.state.turn.phase = 'eating';
  assert.equal(treasurer.startNextChapter(), true);
  assert.equal(treasurer.state.chapterIndex, 2);
  completeSaladCompositionForTest(treasurer);
  treasurer.state.turn.phase = 'eating';
  const before = treasurer.state.ingredients.filter((ingredient) => ingredient.chapterIndex === 3 && ingredient.status === 'discovered').length;
  assert.equal(treasurer.startNextChapter(), true);
  assert.equal(treasurer.state.chapterIndex, 3);
  assert.equal(treasurer.state.ingredients.filter((ingredient) => ingredient.chapterIndex === 3 && ingredient.status === 'discovered').length, before + 1);
  assert.equal(treasurer.secureTreasurerIngredient(), false);
});

test('cocktail spirits remain independent optional choices in the global pool', () => {
  const engine = createEngine(950);
  engine.state.chapterIndex = 4;
  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(), true);
  assert.equal(engine.state.chapterIndex, 5);
  assert.equal(engine.state.turn.phase, 'draw');
  assert.equal(engine.currentEventStage(), 'ingredients');
  assert.equal(engine.prepareIngredientChoice('alcohol', 'event', { all: true }), true);
  assert.deepEqual(new Set(engine.state.turn.pendingIngredientIds), new Set(['rum', 'gin', 'vodka']));
  assert.equal(engine.chooseIngredient('rum'), true);
  assert.equal(engine.getIngredient('rum').status, 'discovered');
  assert.equal(engine.getIngredient('rum').chapterIndex, 5);
  assert.equal(engine.getIngredient('gin').status, 'available');
  assert.equal(engine.getIngredient('second-ice').essential, false);
  assert.equal(engine.getIngredient('ice-cubes').essential, true);
  assert.equal(engine.removeIngredientFromBasket('rum'), true);
  assert.equal(engine.getIngredient('rum').status, 'available');
  assert.equal(engine.getIngredient('rum').chapterIndex, null);
});

test('active abilities can be used at most once before the tablet is handed over', () => {
  const engine = createEngine(960);
  engine.activePlayer.roleId = 'merchant';
  assert.equal(engine.useActiveAbility(), true);
  assert.equal(engine.state.turn.activeAbilityUsed, true);
  engine.state.turn.phase = 'draw';
  assert.equal(engine.useActiveAbility(), false);
});

test('ingredient bonus effects can add at most one extra ingredient before handover', () => {
  const engine = createEngine(970);
  beginAbilityIngredientFlow(engine);
  engine.activeBonuses.ignoreNextIngredientEffect = 3;
  assert.equal(engine.queueIngredientDraw(), true);
  assert.equal(engine.queueIngredientDraw(), true);
  assert.equal(engine.queueIngredientDraw(), false, 'a third ingredient in the same turn is capped');

  engine.continueIngredientFlow();
  assert.equal(engine.state.turn.phase, 'ingredientChoice');
  assert.equal(engine.chooseIngredient(engine.state.turn.pendingIngredientIds[0]), true);
  assert.equal(engine.state.turn.phase, 'ingredientChoice');
  assert.equal(engine.chooseIngredient(engine.state.turn.pendingIngredientIds[0]), true);
  assert.equal(engine.state.turn.ingredientsAddedThisTurn, 2);
  assert.equal(engine.prepareIngredientChoice(), false);
  assert.equal(engine.state.history.filter((entry) => entry.type === 'ingredientDiscovered').length, 2);
  engine.state.turn.phase = 'resolved';
  engine.state.turn.chainPending = true;
  assert.equal(engine.endTurn(), 'chain');
  assert.equal(engine.state.turn.ingredientsAddedThisTurn, 2, 'an event chain is still the same turn');
  assert.equal(engine.canAddIngredientThisTurn(), false);
});
