import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { randomInt } from '../js/core/random.js';
import { EVENT_DECKS } from '../js/data/events.js';
import { ROLES, getRole } from '../js/data/roles.js';
import { renderGame } from '../js/ui/game.js';
import { simulateGame } from '../tools/simulation-lib.mjs';
import { resolvePendingLocationStories } from './test-helpers.mjs';

const now = 1_800_200_000_000;
const names = Array.from({ length: 10 }, (_, index) => `Crew ${index + 1}`);

function finishClearingPhase(engine, timestamp) {
  const clearingTask = engine.state.tasks.find((instance) =>
    instance.chapterIndex === engine.state.chapterIndex && engine.getTaskCard(instance)?.questId === 'reset' && instance.status !== 'done'
  );
  assert.ok(clearingTask, 'the new course starts with a clearing task');
  assert.equal(engine.completeTask(clearingTask.instanceId, timestamp), true);
  assert.equal(engine.state.chapter.stage, 'ingredients');
  assert.equal(engine.state.turn.phase, 'resolved');
  assert.equal(engine.endTurn(timestamp + 1), true);
}

function create(roleId, seed = 4_200) {
  const engine = GameEngine.create({ names, title: `Ability ${roleId}`, defaultLanguage: 'de', seed }, now);
  engine.state.tasks.forEach((task) => { task.status = 'done'; });
  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(now + 100), true);
  finishClearingPhase(engine, now + 105);
  assert.ok(engine.beginEvent(now + 110));
  assert.equal(engine.state.turn.phase, 'courseDecision');
  assert.equal(engine.chooseSoupStyle('cream', now + 120), true);
  resolvePendingLocationStories(engine, now + 121);
  engine.activePlayer.roleId = roleId;
  engine.activePlayer.activeUsesRemaining = 3;
  return engine;
}

function completeSoupCompositionForTest(engine) {
  ['seeds', 'croutons', 'pumpkin', 'carrots', 'chicken', 'nuts'].forEach((ingredientId) => {
    const ingredient = engine.getIngredient(ingredientId);
    ingredient.status = 'used';
    ingredient.chapterIndex = 1;
    ingredient.basketCourseIndex = null;
  });
}

function settleIngredientFlow(engine, timestamp = now + 1_000) {
  let guard = 0;
  while (['ingredientChoice', 'effectChoice'].includes(engine.state.turn.phase) && guard < 30) {
    guard += 1;
    if (engine.state.turn.phase === 'ingredientChoice') {
      assert.ok(engine.state.turn.pendingIngredientIds.length, 'ingredient choice must contain an option');
      assert.equal(engine.chooseIngredient(engine.state.turn.pendingIngredientIds[0], timestamp + guard), true);
    } else {
      assert.ok(engine.state.turn.pendingEffect?.options.length, 'effect choice must contain an option');
      assert.equal(engine.resolveIngredientEffectChoice(engine.state.turn.pendingEffect.options[0], timestamp + guard), true);
    }
  }
  assert.ok(guard < 30, 'ingredient ability flow must settle');
  assert.ok(['draw', 'event', 'resolved'].includes(engine.state.turn.phase), `unexpected settled phase ${engine.state.turn.phase}`);
}

test('all thirteen active role abilities execute once and leave a progressable turn', () => {
  const exercised = new Set();

  for (const role of ROLES) {
    const engine = create(role.id, 4_200 + ROLES.indexOf(role));
    if (role.id === 'gatherer') {
      completeSoupCompositionForTest(engine);
      engine.state.turn.phase = 'eating';
      assert.equal(engine.startNextChapter(now + 150), true);
      finishClearingPhase(engine, now + 160);
      engine.activePlayer.roleId = role.id;
      engine.activePlayer.activeUsesRemaining = 3;
    }
    const beforeUses = engine.activePlayer.activeUsesRemaining;
    let option = null;

    if (['scout', 'tactician'].includes(role.id)) {
      assert.ok(engine.beginEvent(now + 200));
      assert.equal(engine.state.turn.phase, 'event');
    } else if (role.id === 'smith') {
      const diceEvent = EVENT_DECKS[1].find((event) => event.type === 'dice');
      engine.state.turn.currentEventId = diceEvent.id;
      engine.state.turn.phase = 'rolled';
      engine.state.turn.dieResult = 3;
      option = 1;
    } else if (role.id === 'cook') {
      const ingredient = engine.courseIngredientCandidates().find((entry) => entry.effect && !['drawIngredient', 'drawVegetable', 'reserveIngredient', 'disablePassive', 'swapTopCards'].includes(entry.effect));
      assert.ok(ingredient);
      ingredient.status = 'discovered';
      ingredient.chapterIndex = engine.state.chapterIndex;
      ingredient.basketCourseIndex = engine.state.chapterIndex;
      engine.state.lastIngredientId = ingredient.id;
    } else if (role.id === 'alchemist') {
      const ingredient = engine.courseIngredientCandidates().find((entry) => engine.swapIngredientAlternatives(entry).length > 0);
      assert.ok(ingredient);
      ingredient.status = 'discovered';
      ingredient.chapterIndex = engine.state.chapterIndex;
      ingredient.basketCourseIndex = engine.state.chapterIndex;
      engine.state.lastIngredientId = ingredient.id;
    }

    assert.equal(engine.activeAbilityAvailable(option), true, role.id);
    assert.equal(engine.useActiveAbility(option, now + 300), true, role.id);
    exercised.add(role.activeCode);
    assert.equal(engine.activePlayer.activeUsesRemaining, beforeUses - 1, role.id);
    assert.equal(engine.state.turn.activeAbilityUsed, true, role.id);

    if (['ingredientChoice', 'effectChoice'].includes(engine.state.turn.phase)) settleIngredientFlow(engine);
    assert.ok(!['ingredientChoice', 'effectChoice'].includes(engine.state.turn.phase), `${role.id} left an unfinished choice`);
    assert.equal(engine.useActiveAbility(option, now + 2_000), false, `${role.id} must not be usable twice in one turn`);
  }

  assert.deepEqual(exercised, new Set(ROLES.map((role) => role.activeCode)));
});

test('ingredient abilities cannot overwrite an already open ingredient flow', () => {
  const engine = create('cook', 4_300);
  assert.equal(engine.prepareIngredientChoice(null, 'event', { count: 2 }, now + 100), true);
  const flowBefore = structuredClone(engine.state.turn.ingredientFlow);
  const choicesBefore = [...engine.state.turn.pendingIngredientIds];
  const last = engine.getIngredient(choicesBefore[0]);
  engine.state.lastIngredientId = last.id;

  assert.equal(engine.useActiveAbility(null, now + 200), false);
  assert.deepEqual(engine.state.turn.ingredientFlow, flowBefore);
  assert.deepEqual(engine.state.turn.pendingIngredientIds, choicesBefore);
  assert.equal(engine.state.turn.phase, 'ingredientChoice');

  engine.activePlayer.roleId = 'alchemist';
  assert.equal(engine.useAlchemistPassive(now + 300), false);
  assert.deepEqual(engine.state.turn.ingredientFlow, flowBefore);
});

test('the Cook cannot spend an active use when a repeat card has no repeatable predecessor', () => {
  const engine = create('cook', 4_301);
  const repeat = engine.state.ingredients.find((ingredient) => ingredient.effect === 'repeatIngredient');
  assert.ok(repeat);
  repeat.status = 'discovered';
  repeat.chapterIndex = engine.state.chapterIndex;
  repeat.basketCourseIndex = engine.state.chapterIndex;
  engine.state.lastIngredientId = repeat.id;
  engine.state.previousIngredientId = null;
  const uses = engine.activePlayer.activeUsesRemaining;
  assert.equal(engine.activeAbilityAvailable(), false);
  assert.equal(engine.useActiveAbility(), false);
  assert.equal(engine.activePlayer.activeUsesRemaining, uses);

  const repeatable = engine.state.ingredients.find((ingredient) => ingredient.effect === 'doubleDie');
  engine.state.previousIngredientId = repeatable.id;
  assert.equal(engine.activeAbilityAvailable(), true);
});

test('the current-player UI always explains both abilities and uses concrete action labels', () => {
  for (const roleEntry of ROLES) {
    const engine = create(roleEntry.id, 4_500 + ROLES.indexOf(roleEntry));
    const role = getRole(roleEntry.id);
    const html = renderGame(engine, 'de');
    assert.match(html, /Deine Charakterfähigkeiten/);
    assert.match(html, /Passive Fähigkeit/);
    assert.match(html, /Aktive Fähigkeit/);
    assert.ok(html.includes(role.passive.de), `${role.id} passive summary`);
    assert.ok(html.includes(role.passiveUsage.de), `${role.id} passive usage`);
    assert.ok(html.includes(role.active.de), `${role.id} active summary`);
    assert.ok(html.includes(role.activeUsage.de), `${role.id} active usage`);
    assert.doesNotMatch(html, /<button[^>]*>\s*Passiv\s*<\/button>/i);
  }

  const herbalist = create('herbalist', 4_600);
  const herbalistHtml = renderGame(herbalist, 'de');
  assert.match(herbalistHtml, /Eine Gemüsekarte ziehen \(passiv\)/);
  assert.match(herbalistHtml, /Zwei Gemüsekarten ziehen/);

  const alchemist = create('alchemist', 4_601);
  const ingredient = alchemist.courseIngredientCandidates().find((entry) => alchemist.swapIngredientAlternatives(entry).length > 0);
  ingredient.status = 'discovered';
  ingredient.chapterIndex = alchemist.state.chapterIndex;
  ingredient.basketCourseIndex = alchemist.state.chapterIndex;
  alchemist.state.lastIngredientId = ingredient.id;
  const alchemistHtml = renderGame(alchemist, 'de');
  assert.match(alchemistHtml, /Letzte Zutat tauschen \(passiv\)/);
  assert.match(alchemistHtml, /Letzte Zutat tauschen \(aktiv\)/);
});

test('adjusting a die by plus one keeps the roll confirmation visible and progressable', () => {
  const engine = create('smith', 4_602);
  const diceEvent = EVENT_DECKS[1].find((event) => event.type === 'dice');
  engine.state.turn.currentEventId = diceEvent.id;
  engine.state.turn.phase = 'rolled';
  engine.state.turn.dieResult = 3;

  assert.equal(engine.useActiveAbility(1, now + 300), true);
  assert.equal(engine.state.turn.phase, 'rolled');
  assert.equal(engine.state.turn.dieResult, 4);

  const html = renderGame(engine, 'de');
  assert.match(html, /data-rolling="false"/);
  assert.match(html, /data-action="confirm-roll"/);
  assert.equal(engine.confirmRoll(now + 400), true);
  assert.notEqual(engine.state.turn.phase, 'rolled');
});

test('the Smith cannot spend an active use on a clamped no-op at die boundaries', () => {
  const engine = create('smith', 4_604);
  const diceEvent = EVENT_DECKS[1].find((event) => event.type === 'dice');
  engine.state.turn.currentEventId = diceEvent.id;
  engine.state.turn.phase = 'rolled';
  engine.state.turn.dieResult = 1;
  const uses = engine.activePlayer.activeUsesRemaining;

  assert.equal(engine.activeAbilityAvailable(-1), false);
  assert.equal(engine.activeAbilityAvailable(1), true);
  assert.equal(engine.useActiveAbility(-1, now + 300), false);
  assert.equal(engine.activePlayer.activeUsesRemaining, uses);
  const html = renderGame(engine, 'de');
  assert.doesNotMatch(html, /data-action="use-ability" data-option="-1"/);
  assert.match(html, /data-action="use-ability" data-option="1"/);
  assert.equal(engine.useActiveAbility(1, now + 301), true);
  assert.equal(engine.state.turn.dieResult, 2);
});

test('the Tactician really shuffles the open event back instead of silently discarding it', () => {
  const engine = create('tactician', 4_605);
  assert.ok(engine.beginEvent(now + 300));
  const originalId = engine.currentEvent.id;
  assert.equal(engine.distinctEventReplacementAvailable(), true);
  assert.equal(engine.useActiveAbility(null, now + 301), true);
  assert.notEqual(engine.currentEvent.id, originalId);
  assert.equal(engine.state.eventsDrawn.includes(originalId), false);
  const originalCard = EVENT_DECKS[engine.state.chapterIndex].find((event) => event.id === originalId);
  assert.ok(engine.state.eventQueues[engine.state.chapterIndex][originalCard.stage][originalCard.locationIndex].includes(originalId));
});

test('the Tactician may cancel a rolled event before its effect is resolved', () => {
  const engine = create('tactician', 4_606);
  const diceEvent = EVENT_DECKS[1].find((event) => event.type === 'dice');
  engine.state.turn.currentEventId = diceEvent.id;
  engine.state.turn.phase = 'rolled';
  engine.state.turn.dieResult = 2;
  assert.match(renderGame(engine, 'de'), /Ereignis ohne Wirkung abschließen \(passiv\)/);
  assert.equal(engine.ignoreEventWithTactician(now + 302), true);
  assert.equal(engine.state.turn.phase, 'resolved');
  assert.equal(engine.state.turn.outcomeCode, 'ignored');
});

test('stored ingredient roll effects are explained without looking like character abilities', () => {
  const engine = create('herbalist', 4_603);
  const diceEvent = EVENT_DECKS[1].find((event) => event.type === 'dice');
  engine.applyIngredientEffect(engine.state.ingredients.find((ingredient) => ingredient.effect === 'rerollDie'));
  engine.applyIngredientEffect(engine.state.ingredients.find((ingredient) => ingredient.effect === 'adjustDie'));
  engine.applyIngredientEffect(engine.state.ingredients.find((ingredient) => ingredient.effect === 'doubleDie'));
  engine.state.turn.currentEventId = diceEvent.id;
  engine.state.turn.phase = 'rolled';
  engine.state.turn.dieResult = 3;

  const html = renderGame(engine, 'de');
  assert.match(html, /Gemeinsamer Effektstapel der Crew/);
  assert.match(html, /Alle teilen diesen Stapel/);
  assert.match(html, /eingebracht von/);
  assert.match(html, /als Nächstes anwendbar/);
  assert.match(html, /Gespeicherten Neuwurf einsetzen/);
  assert.doesNotMatch(html, /Gespeicherten Effekt: −1/);
  assert.doesNotMatch(html, /Gespeicherten Effekt: \+1/);
  assert.match(html, /Wenn du den Wurf direkt ausführst, verfällt der gespeicherte Effekt/);
  assert.doesNotMatch(html, /Mit Kürbis neu würfeln|Ingwer [−+]|Rind-Bonus/);

  assert.ok(engine.rerollDieWithIngredient() >= 1);
  const afterReroll = renderGame(engine, 'de');
  if (engine.state.turn.dieResult === 1) {
    assert.doesNotMatch(afterReroll, /Gespeicherten Effekt: −1/);
    assert.match(afterReroll, /Gespeicherten Effekt: \+1/);
  } else if (engine.state.turn.dieResult === 6) {
    assert.match(afterReroll, /Gespeicherten Effekt: −1/);
    assert.doesNotMatch(afterReroll, /Gespeicherten Effekt: \+1/);
  } else {
    assert.match(afterReroll, /Gespeicherten Effekt: −1/);
    assert.match(afterReroll, /Gespeicherten Effekt: \+1/);
  }
  assert.doesNotMatch(afterReroll, /Gespeicherten Neuwurf einsetzen/);
});

test('Lucky and Unlucky passives modify every loss caused by their own event turn', () => {
  const lossEvent = EVENT_DECKS.flat().find((event) => event.type === 'choice' && event.options.includes('coinLoss'));
  assert.ok(lossEvent);
  for (const [roleId, expectedLoss] of [['lucky', 4], ['unlucky', 6]]) {
    const engine = create(roleId, 4_700 + expectedLoss);
    engine.state.coins = 30;
    engine.state.turn.currentEventId = lossEvent.id;
    engine.state.turn.phase = 'event';

    const before = renderGame(engine, 'de');
    assert.match(before, new RegExp(`−${expectedLoss} Münzen`), roleId);
    assert.equal(engine.resolveChoice('coinLoss', now + 500), true, roleId);
    assert.equal(engine.state.coins, 30 - expectedLoss, roleId);
    assert.equal(engine.state.turn.coinChangeModified, -expectedLoss, roleId);
  }
});

test('Lucky and Unlucky task abilities change the next eligible timer and score while their passives remain active', () => {
  const cases = [
    { roleId: 'lucky', timeDelta: 2, scoreDelta: -2, expectedVeryLate: -6 },
    { roleId: 'unlucky', timeDelta: -2, scoreDelta: 2, expectedVeryLate: -4 }
  ];

  for (const [index, config] of cases.entries()) {
    const engine = GameEngine.create({ names, title: `Task luck ${config.roleId}`, defaultLanguage: 'de', seed: 4_800 + index }, now);
    engine.activePlayer.roleId = config.roleId;
    engine.activePlayer.activeUsesRemaining = 3;
    engine.state.coins = 100;
    const card = engine.assignableTaskCards().find((candidate) => candidate.timingMode === 'challenge' && candidate.challengeMinutes > 2);
    assert.ok(card, config.roleId);

    assert.equal(engine.useActiveAbility(null, now + 10), true, config.roleId);
    assert.equal(engine.activePlayer.pendingTaskAbility?.roleId, config.roleId, config.roleId);
    const instance = engine.assignTask({ card, now: now + 20 });
    assert.ok(instance, config.roleId);
    assert.equal(engine.activePlayer.pendingTaskAbility, null, config.roleId);
    assert.equal(instance.challengeMinutes, card.challengeMinutes + config.timeDelta, config.roleId);
    assert.equal(instance.taskCoinAdjustment, config.scoreDelta, config.roleId);
    assert.deepEqual(instance.taskAbilityAdjustments.map((adjustment) => adjustment.roleId), [config.roleId]);

    assert.equal(engine.briefTask(instance, true, now + 30), true);
    const briefing = renderGame(engine, 'de');
    assert.match(briefing, new RegExp(`${instance.challengeMinutes} min`), config.roleId);
    assert.match(briefing, new RegExp(config.roleId === 'lucky' ? 'Glückspilz' : 'Pechvogel'), config.roleId);
    assert.equal(engine.startTask(instance.instanceId, now + 40), true);
    assert.equal(engine.completeTask(instance.instanceId, now + 40 + instance.challengeMinutes * 2 * 60_000), true);
    assert.equal(instance.challengeResult, 'veryLate', config.roleId);
    assert.equal(instance.challengeCoinValue, config.expectedVeryLate, `${config.roleId} active and passive both apply`);
    assert.equal(engine.state.coins, 100 + config.expectedVeryLate, config.roleId);
  }
});

test('the Gambler rolls event losses and maps every active die face exactly once per course', () => {
  const lossEvent = EVENT_DECKS.flat().find((event) => event.type === 'choice' && event.options.includes('coinLoss'));
  const passiveEngine = create('gambler', 4_900);
  passiveEngine.state.coins = 30;
  passiveEngine.state.turn.currentEventId = lossEvent.id;
  passiveEngine.state.turn.phase = 'event';
  assert.match(renderGame(passiveEngine, 'de'), /Gambler würfelt den Verlust · 1–6 Münzen/);
  assert.equal(passiveEngine.resolveChoice('coinLoss', now + 10), true);
  const passiveRoll = passiveEngine.state.turn.gamblerLossRoll;
  assert.ok(passiveRoll >= 1 && passiveRoll <= 6);
  assert.equal(passiveEngine.state.coins, 30 - passiveRoll);
  const passiveResult = renderGame(passiveEngine, 'de');
  assert.match(passiveResult, new RegExp(`data-result="${passiveRoll}"`));
  assert.match(passiveResult, new RegExp(`Tatsächlicher Verlust: −${passiveRoll} Münzen`));

  const rngStateByValue = new Map();
  let rngState = 1;
  for (let attempt = 0; attempt < 1_000 && rngStateByValue.size < 6; attempt += 1) {
    const stateBeforeRoll = rngState;
    const roll = randomInt(stateBeforeRoll, 1, 6);
    rngState = roll.state;
    if (!rngStateByValue.has(roll.value)) rngStateByValue.set(roll.value, stateBeforeRoll);
  }
  assert.equal(rngStateByValue.size, 6);
  const expectedByRoll = { 1: -6, 2: -4, 3: -2, 4: 2, 5: 4, 6: 6 };
  for (let value = 1; value <= 6; value += 1) {
    const engine = create('gambler', 4_910 + value);
    engine.state.coins = 100;
    engine.state.rngState = rngStateByValue.get(value);
    assert.equal(engine.useActiveAbility(null, now + value), true);
    assert.equal(engine.state.turn.gamblerAbilityRoll, value);
    assert.equal(engine.state.turn.gamblerAbilityCoinDelta, expectedByRoll[value]);
    assert.equal(engine.state.coins, 100 + expectedByRoll[value]);
    engine.state.turn.activeAbilityUsed = false;
    assert.equal(engine.activeAbilityAvailable(), false, 'the active roll is limited to once in the same course');
    engine.state.chapterIndex += 1;
    assert.equal(engine.activeAbilityAvailable(), true, 'a new course unlocks the active roll again');
  }
});

test('a complete ten-player voyage can exercise every assigned active ability without getting stuck', () => {
  const result = simulateGame({ playerCount: 10, seed: 97_003, useAbilities: true });

  assert.equal(result.completed, true);
  assert.equal(result.phase, 'complete');
  assert.equal(result.allActiveAbilitiesExercised, true);
  assert.equal(result.exercisedAbilities.length, 10);
  assert.equal(result.failedAbilityAttempts, 0);
  assert.equal(result.failedTransitions, 0);
  assert.equal(result.assignmentViolations, 0);
  assert.equal(result.taskIngredientMismatches, 0);
});
