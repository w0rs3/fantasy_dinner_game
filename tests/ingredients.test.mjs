import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { EVENT_DECKS } from '../js/data/events.js';
import { INGREDIENTS, INGREDIENT_EFFECT_TEXT } from '../js/data/ingredients.js';
import { TASK_DECKS } from '../js/data/tasks.js';
import { addOpeningTask, resolvePendingLocationStories } from './test-helpers.mjs';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Eva', 'Finn'];
function finishClearingPhase(engine, timestamp = 1_800_000_000_105) {
  const clearingTask = engine.state.tasks.find((instance) =>
    instance.chapterIndex === engine.state.chapterIndex && engine.getTaskCard(instance)?.questId === 'reset' && instance.status !== 'done'
  );
  assert.ok(clearingTask);
  assert.equal(engine.completeTask(clearingTask.instanceId, timestamp), true);
  if (engine.currentChapter.id === 'cocktails') {
    while (engine.state.turn.phase === 'cocktailTeamChoice') {
      const preferred = engine.state.chapter.cocktailTeamSelectionIndex % 2 === 0 ? 'alcoholic' : 'alcohol-free';
      const available = engine.availableCocktailTeamChoices();
      assert.equal(engine.chooseCocktailTeam(available.includes(preferred) ? preferred : available[0], timestamp + 1), true);
    }
    assert.equal(engine.state.chapter.stage, 'ingredients');
    assert.equal(engine.state.turn.phase, 'courseDecision');
    assert.equal(engine.chooseCocktailSpiritCount(1, timestamp + 2), true);
    assert.equal(engine.state.turn.phase, 'draw');
    return;
  }
  assert.equal(engine.state.chapter.stage, 'ingredients');
  assert.equal(engine.endTurn(timestamp + 1), true);
}

const createEngine = (seed = 801) => {
  const engine = GameEngine.create({ names, title: 'Ingredient effects', defaultLanguage: 'de', seed }, 1_800_000_000_000);
  addOpeningTask(engine, 1_800_000_000_010);
  engine.completeTask(engine.state.tasks[0].instanceId, 1_800_000_000_050);
  engine.state.turn.phase = 'eating';
  engine.startNextChapter(1_800_000_000_100);
  finishClearingPhase(engine);
  engine.beginEvent(1_800_000_000_110);
  engine.chooseSoupStyle('cream', 1_800_000_000_120);
  resolvePendingLocationStories(engine, 1_800_000_000_121);
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
  ['lettuce', 'cucumber', 'garlic', 'mustard', 'apples', 'pears', 'beef', 'chestnuts'].forEach((ingredientId) => {
    const ingredient = engine.getIngredient(ingredientId);
    ingredient.status = 'used';
    ingredient.chapterIndex = 2;
    ingredient.basketCourseIndex = null;
  });
}

test('every prepared ingredient effect is translated and handled by the engine', () => {
  const effects = [...new Set(INGREDIENTS.map((ingredient) => ingredient.effect).filter(Boolean))];
  assert.equal(effects.length, 22);
  for (const effect of effects) {
    assert.ok(INGREDIENT_EFFECT_TEXT[effect]?.de, `missing German text for ${effect}`);
    assert.ok(INGREDIENT_EFFECT_TEXT[effect]?.en, `missing English text for ${effect}`);
    const engine = createEngine(810 + effects.indexOf(effect));
    beginAbilityIngredientFlow(engine);
    const previousIngredientId = effect === 'repeatIngredient' ? effectCard(engine, 'doubleDie').id : null;
    assert.equal(engine.applyIngredientEffect(effectCard(engine, effect), 1_800_000_001_000, { previousIngredientId }), true, `unhandled ${effect}`);
    assert.ok(engine.state.history.some((entry) => entry.type === 'ingredientEffectApplied' && entry.data.effect === effect));
  }
});

test('the crew shares one ordered effect stack and consumes the oldest effect matching the trigger', () => {
  const engine = createEngine(850);
  beginAbilityIngredientFlow(engine);
  const firstContributorId = engine.activePlayer.id;
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

  assert.deepEqual(engine.storedIngredientEffects().map((entry) => entry.effect), [
    'doubleDie', 'rerollDie', 'adjustDie', 'ignoreEvent', 'ignoreIngredient',
    'repeatNextIngredient', 'replaceIngredient', 'revealEvent', 'nextPlayer'
  ]);
  assert.ok(engine.storedIngredientEffects().every((entry) => entry.storedByPlayerId === firstContributorId));
  const restored = new GameEngine(engine.snapshot());
  assert.deepEqual(restored.storedIngredientEffects(), engine.storedIngredientEffects(), 'the shared stack survives persistence in order');
  assert.ok(restored.state.players.every((player) => !Object.hasOwn(player, 'ingredientEffectStack')));

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
  }, { double: 1, reroll: 1, adjust: 1, ignoreEvent: 1, ignoreIngredient: 1, repeatIngredient: 1, replaceIngredient: 1, reveal: 1, chain: true, extra: 0, next: 1 });

  const diceEvent = EVENT_DECKS[0].find((event) => event.type === 'dice');
  engine.state.turn.currentEventId = diceEvent.id;
  engine.state.turn.phase = 'rolled';
  engine.state.turn.dieResult = 3;
  assert.equal(engine.nextStoredIngredientEffect('dice').effect, 'doubleDie');
  assert.equal(engine.rerollDieWithIngredient(), null, 'a later reroll may not jump over the older double effect');
  assert.equal(engine.adjustDieWithIngredient(1), false, 'a later adjustment may not jump over the older double effect');
  assert.equal(engine.confirmRoll(), true);
  assert.equal(engine.state.turn.dieResult, 6);
  assert.equal(engine.activeBonuses.doubleNextDie, 0);

  engine.state.activePlayerIndex = (engine.state.activePlayerIndex + 1) % engine.state.players.length;
  assert.notEqual(engine.activePlayer.id, firstContributorId);
  engine.state.turn.currentEventId = diceEvent.id;
  engine.state.turn.phase = 'rolled';
  engine.state.turn.dieResult = 3;
  const rerolled = engine.rerollDieWithIngredient();
  assert.ok(rerolled >= 1, 'another crew member can consume the shared reroll');
  assert.equal(engine.activeBonuses.rerollNext, 0);
  assert.equal(engine.adjustDieWithIngredient(rerolled >= 6 ? -1 : 1), true);
  assert.equal(engine.activeBonuses.adjustNext, 0);

  engine.state.turn.currentEventId = null;
  engine.state.turn.phase = 'draw';
  engine.state.turn.ingredientFlow = null;
  assert.equal(engine.nextStoredIngredientEffect('event').effect, 'ignoreEvent');
  assert.equal(engine.nextEventPreview(), null, 'the later preview effect waits behind the older ignore effect');
  assert.ok(engine.beginEvent(1_800_000_002_000));
  assert.equal(engine.state.turn.outcomeCode, 'ignored');
  assert.equal(engine.nextStoredIngredientEffect('event').effect, 'revealEvent');
});

test('unused optional dice effects expire in order instead of blocking the shared stack', () => {
  const engine = createEngine(852);
  beginAbilityIngredientFlow(engine);
  engine.applyIngredientEffect(effectCard(engine, 'rerollDie'));
  engine.applyIngredientEffect(effectCard(engine, 'adjustDie'));
  engine.applyIngredientEffect(effectCard(engine, 'doubleDie'));
  const diceEvent = EVENT_DECKS[1].find((event) => event.id === 'E2-10');
  const prepareRoll = () => {
    engine.state.turn.currentEventId = diceEvent.id;
    engine.state.turn.phase = 'rolled';
    engine.state.turn.dieResult = 3;
    engine.state.turn.ingredientFlow = null;
  };

  prepareRoll();
  assert.equal(engine.confirmRoll(), true);
  assert.equal(engine.state.turn.dieResult, 3, 'declining a reroll does not alter the result');
  assert.equal(engine.nextStoredIngredientEffect('dice').effect, 'adjustDie');

  prepareRoll();
  assert.equal(engine.confirmRoll(), true);
  assert.equal(engine.state.turn.dieResult, 3, 'declining an adjustment does not alter the result');
  assert.equal(engine.nextStoredIngredientEffect('dice').effect, 'doubleDie');

  prepareRoll();
  assert.equal(engine.confirmRoll(), true);
  assert.equal(engine.state.turn.dieResult, 6, 'the mandatory double effect is eventually applied');
  assert.equal(engine.nextStoredIngredientEffect('dice'), null);
  assert.deepEqual(engine.state.history.filter((entry) => entry.type === 'ingredientEffectSkipped')
    .map((entry) => entry.data.effect), ['rerollDie', 'adjustDie']);
});

test('a next-player preview is reserved for the named next free crew member', () => {
  const engine = createEngine(853);
  engine.state.players.forEach((player) => { player.roleId = 'cook'; });
  const ownerId = engine.activePlayer.id;
  const targetIndex = engine.nextFreePlayerIndex(engine.state.activePlayerIndex);
  const targetId = engine.state.players[targetIndex].id;
  beginAbilityIngredientFlow(engine);
  engine.applyIngredientEffect(effectCard(engine, 'nextPlayer'));
  const storedPreview = engine.storedIngredientEffects().find((entry) => entry.effect === 'nextPlayer');
  assert.equal(storedPreview.targetPlayerId, targetId);

  engine.state.turn.ingredientFlow = null;
  engine.state.turn.currentEventId = null;
  engine.state.turn.phase = 'draw';
  assert.equal(engine.activePlayer.id, ownerId);
  assert.equal(engine.nextEventPreview(), null, 'the current player cannot use the next player’s preview');

  engine.state.activePlayerIndex = targetIndex;
  const preview = engine.nextEventPreview();
  assert.ok(preview);
  assert.equal(engine.beginEvent(1_800_000_002_500).id, preview.id);
  assert.equal(engine.storedIngredientEffects().some((entry) => entry.id === storedPreview.id), false);
});

test('coin ingredient effects reward the crew immediately and never enter the deferred stack', () => {
  const engine = createEngine(851);
  beginAbilityIngredientFlow(engine);
  const before = engine.state.coins;
  engine.applyIngredientEffect(effectCard(engine, 'coins3'));
  engine.applyIngredientEffect(effectCard(engine, 'coins5'));

  assert.equal(engine.state.coins, before + 8);
  assert.equal(engine.storedIngredientEffects().length, 0);
});

test('draw, character-choice, deck-swap, repeat, and event-replacement effects complete their UI flows', () => {
  const drawEngine = createEngine(880);
  beginAbilityIngredientFlow(drawEngine);
  drawEngine.applyIngredientEffect(effectCard(drawEngine, 'drawIngredient'));
  drawEngine.continueIngredientFlow();
  assert.equal(drawEngine.state.turn.phase, 'ingredientChoice');
  assert.equal(drawEngine.state.turn.pendingIngredientIds.length, 1, 'a singular draw effect offers exactly one card');

  const onionEngine = createEngine(881);
  beginAbilityIngredientFlow(onionEngine);
  onionEngine.applyIngredientEffect(effectCard(onionEngine, 'disablePassive'));
  assert.equal(onionEngine.state.turn.phase, 'effectChoice');
  const otherPlayer = onionEngine.state.players.find((player) => player.id !== onionEngine.activePlayer.id);
  assert.equal(onionEngine.resolveIngredientEffectChoice(otherPlayer.id), true);
  assert.equal(onionEngine.isPassiveEnabled(otherPlayer), false);
  otherPlayer.turns += 1;
  assert.equal(onionEngine.isPassiveEnabled(otherPlayer), true);

  const selfOnionEngine = createEngine(885);
  beginAbilityIngredientFlow(selfOnionEngine);
  const activePlayer = selfOnionEngine.activePlayer;
  selfOnionEngine.applyIngredientEffect(effectCard(selfOnionEngine, 'disablePassive'));
  assert.equal(selfOnionEngine.resolveIngredientEffectChoice(activePlayer.id), true);
  assert.equal(selfOnionEngine.isPassiveEnabled(activePlayer), false);
  activePlayer.turns += 1;
  assert.equal(selfOnionEngine.isPassiveEnabled(activePlayer), false, 'the passive stays disabled throughout the player’s next turn');
  activePlayer.turns += 1;
  assert.equal(selfOnionEngine.isPassiveEnabled(activePlayer), true);

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
  first.chapterIndex = alchemistEngine.state.chapterIndex;
  first.basketCourseIndex = alchemistEngine.state.chapterIndex;
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
      finishClearingPhase(engine);
      engine.activePlayer.roleId = roleId;
    }
    assert.equal(engine.useCategoryRolePassive(), true, roleId);
    assert.equal(engine.state.turn.pendingIngredientIds.length, 1, `${roleId} passive draws exactly one card`);
    const offered = engine.state.turn.pendingIngredientIds[0];
    assert.equal(engine.getIngredient(offered).category, engine.getIngredient(ingredientId).category);
    engine.chooseIngredient(offered);
    assert.equal(engine.useCategoryRolePassive(), false, `${roleId} passive must be once per course`);
  }

  const merchant = createEngine(930);
  merchant.activePlayer.roleId = 'merchant';
  assert.equal(merchant.prepareIngredientChoice(), true);
  assert.equal(merchant.state.turn.pendingIngredientIds.length, 3);

  const ordinaryFind = createEngine(932);
  ordinaryFind.activePlayer.roleId = 'cook';
  assert.equal(ordinaryFind.prepareIngredientChoice(), true);
  assert.equal(ordinaryFind.state.turn.pendingIngredientIds.length, 2);

  const merchantAbility = createEngine(933);
  merchantAbility.activePlayer.roleId = 'merchant';
  assert.equal(merchantAbility.prepareIngredientChoice(null, 'ability', { count: 2 }), true);
  assert.equal(merchantAbility.state.turn.pendingIngredientIds.length, 2, 'the active ability still follows its two-card wording');

  const treasurer = createEngine(931);
  treasurer.activePlayer.roleId = 'treasurer';
  completeSoupCompositionForTest(treasurer);
  treasurer.state.turn.phase = 'eating';
  assert.equal(treasurer.startNextChapter(), true);
  assert.equal(treasurer.state.chapterIndex, 2);
  finishClearingPhase(treasurer);
  completeSaladCompositionForTest(treasurer);
  treasurer.state.turn.phase = 'eating';
  const before = treasurer.state.ingredients.filter((ingredient) => ingredient.chapterIndex === 3 && ingredient.status === 'discovered').length;
  assert.equal(treasurer.startNextChapter(), true);
  assert.equal(treasurer.state.chapterIndex, 3);
  assert.equal(treasurer.state.ingredients.filter((ingredient) => ingredient.chapterIndex === 3 && ingredient.status === 'discovered').length, before);
  finishClearingPhase(treasurer);
  assert.equal(treasurer.state.ingredients.filter((ingredient) => ingredient.chapterIndex === 3 && ingredient.status === 'discovered').length, before + 1);
  assert.equal(treasurer.secureTreasurerIngredient(), false);
});

test('a replacement alternative waits until it can add a real extra choice', () => {
  const engine = createEngine(934);
  beginAbilityIngredientFlow(engine);
  engine.storeIngredientEffect(effectCard(engine, 'replaceIngredient'), 'replaceIngredient');
  const available = engine.courseIngredientCandidates();
  assert.ok(available.length > 2);
  const [first, second] = available;
  engine.state.ingredientQueues[engine.state.chapterIndex] = [first.id];

  assert.equal(engine.prepareIngredientChoice(null, 'ability', { count: 1 }), true);
  assert.deepEqual(engine.state.turn.pendingIngredientIds, [first.id]);
  assert.equal(engine.nextStoredIngredientEffect('ingredient')?.effect, 'replaceIngredient', 'the effect is not spent as a no-op');

  engine.state.turn.phase = 'draw';
  engine.state.turn.pendingIngredientIds = [];
  engine.state.turn.ingredientFlow = null;
  engine.state.ingredientQueues[engine.state.chapterIndex] = [first.id, second.id];
  assert.equal(engine.prepareIngredientChoice(null, 'ability', { count: 1 }), true);
  assert.equal(engine.state.turn.pendingIngredientIds.length, 2);
  assert.equal(engine.nextStoredIngredientEffect('ingredient'), null);
});

test('a stored die adjustment cannot be consumed in a direction that leaves the die unchanged', () => {
  const engine = createEngine(935);
  beginAbilityIngredientFlow(engine);
  engine.applyIngredientEffect(effectCard(engine, 'adjustDie'));
  const diceEvent = EVENT_DECKS[1].find((event) => event.type === 'dice');
  engine.state.turn.ingredientFlow = null;
  engine.state.turn.currentEventId = diceEvent.id;
  engine.state.turn.phase = 'rolled';
  engine.state.turn.dieResult = 1;

  const storedId = engine.nextStoredIngredientEffect('dice').id;
  assert.equal(engine.canAdjustDieWithIngredient(-1), false);
  assert.equal(engine.adjustDieWithIngredient(-1), false);
  assert.equal(engine.nextStoredIngredientEffect('dice').id, storedId, 'an invalid direction keeps the effect on the shared stack');
  assert.equal(engine.canAdjustDieWithIngredient(1), true);
  assert.equal(engine.adjustDieWithIngredient(1), true);
  assert.equal(engine.state.turn.dieResult, 2);
  assert.equal(engine.nextStoredIngredientEffect('dice'), null);
});

test('a stored event replacement waits instead of redrawing the only remaining event forever', () => {
  const engine = createEngine(936);
  beginAbilityIngredientFlow(engine);
  engine.applyIngredientEffect(effectCard(engine, 'replaceEvent'));
  engine.state.turn.ingredientFlow = null;
  engine.state.turn.phase = 'draw';
  const stage = engine.currentEventStage();
  const stageQueues = engine.state.eventQueues[engine.state.chapterIndex][stage];
  const onlyEventId = stageQueues.flat().find((eventId) => !engine.state.eventsDrawn.includes(eventId));
  assert.ok(onlyEventId);
  stageQueues.forEach((queue) => queue.splice(0, queue.length));
  engine.eventQueue(stage).push(onlyEventId);

  assert.equal(engine.beginEvent()?.id, onlyEventId);
  assert.equal(engine.state.turn.phase, 'event');
  assert.equal(engine.nextStoredIngredientEffect('event')?.effect, 'replaceEvent', 'the unusable replacement remains stored');
  assert.equal(engine.state.eventsDrawn.filter((eventId) => eventId === onlyEventId).length, 1);
});

test('cocktail spirits remain independent optional choices in the global pool', () => {
  const engine = createEngine(950);
  engine.state.chapterIndex = 4;
  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(), true);
  assert.equal(engine.state.chapterIndex, 5);
  assert.equal(engine.state.turn.phase, 'taskBriefing');
  finishClearingPhase(engine);
  assert.equal(engine.state.turn.phase, 'draw');
  assert.equal(engine.currentEventStage(), 'ingredients');
  assert.equal(engine.prepareIngredientChoice('alcohol', 'event', { all: true }), true);
  assert.deepEqual(new Set(engine.state.turn.pendingIngredientIds), new Set(['rum', 'gin', 'vodka']));
  assert.equal(engine.chooseIngredient('rum'), true);
  assert.equal(engine.getIngredient('rum').status, 'discovered');
  assert.equal(engine.getIngredient('rum').chapterIndex, 5);
  assert.equal(engine.getIngredient('gin').status, 'available');
  assert.equal(engine.getIngredient('second-ice').essential, false);
  assert.equal(engine.getIngredient('ice-cubes'), undefined, 'ice is required basic stock, not an ingredient card');
  assert.equal(engine.courseRule().target, 6);
  assert.equal(engine.courseRule().optionalLimit, 4);
  assert.equal(engine.courseRule().categoryLimits.alcohol, 3);
  assert.equal(engine.courseRule().categoryMinimums.drinks, 2);
  assert.equal(engine.removeIngredientFromBasket('rum'), true);
  assert.equal(engine.getIngredient('rum').status, 'available');
  assert.equal(engine.getIngredient('rum').chapterIndex, null);
});

test('the optional dessert spirit task appears only when alcohol was assigned to dessert', () => {
  const engine = createEngine(951);
  const spiritTask = TASK_DECKS[4].find((card) => card.id === 'A5-19');
  assert.equal(spiritTask.title.de, 'Optionale Geisterbeute');
  assert.equal(engine.taskAppliesToChapter(spiritTask, 4), false);
  const vodka = engine.getIngredient('vodka');
  vodka.status = 'locked';
  vodka.chapterIndex = 4;
  assert.equal(engine.taskAppliesToChapter(spiritTask, 4), true);
});

test('soup and salad accept at most one meat variety, including stale pending choices', () => {
  const cases = [
    { course: 'soup', first: 'beef', second: 'chicken' },
    { course: 'salad', first: 'pork', second: 'lamb' }
  ];

  for (const [index, { course, first, second }] of cases.entries()) {
    const engine = createEngine(955 + index);
    if (course === 'salad') {
      completeSoupCompositionForTest(engine);
      engine.state.turn.phase = 'eating';
      assert.equal(engine.startNextChapter(), true);
      finishClearingPhase(engine);
    }

    assert.equal(engine.currentChapter.id, course);
    assert.equal(engine.prepareIngredientChoice('meat', 'ability', { all: true }), true);
    assert.ok(engine.state.turn.pendingIngredientIds.includes(first));
    assert.ok(engine.state.turn.pendingIngredientIds.includes(second));
    assert.equal(engine.chooseIngredient(first), true);
    assert.deepEqual(engine.courseIngredientCandidates('meat'), [], `${course} must stop offering meat`);
    assert.equal(engine.lockIngredientFromBasket(first), true);

    // Simulate a stale UI choice that was prepared before the first meat was
    // fixed. Committing it must still be rejected.
    engine.state.turn.phase = 'ingredientChoice';
    engine.state.turn.pendingIngredientIds = [second];
    assert.equal(engine.chooseIngredient(second), false);
    assert.equal(engine.getIngredient(second).status, 'available');

    // Defense in depth: even a stale basket entry may not be fixed as a second
    // meat variety.
    const staleBasketMeat = engine.getIngredient(second);
    staleBasketMeat.status = 'discovered';
    staleBasketMeat.chapterIndex = engine.state.chapterIndex;
    staleBasketMeat.basketCourseIndex = engine.state.chapterIndex;
    engine.state.lastIngredientId = second;
    assert.equal(engine.lockIngredientFromBasket(second), false);
    assert.equal(engine.courseCategoryCount('meat', ['locked']), 1);
  }
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
