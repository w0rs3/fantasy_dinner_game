import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { EVENT_DECKS } from '../js/data/events.js';
import { ROLES, getRole } from '../js/data/roles.js';
import { renderGame } from '../js/ui/game.js';
import { simulateGame } from '../tools/simulation-lib.mjs';

const now = 1_800_200_000_000;
const names = Array.from({ length: 10 }, (_, index) => `Crew ${index + 1}`);

function create(roleId, seed = 4_200) {
  const engine = GameEngine.create({ names, title: `Ability ${roleId}`, defaultLanguage: 'de', seed }, now);
  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(now + 100), true);
  assert.ok(engine.beginEvent(now + 110));
  assert.equal(engine.state.turn.phase, 'courseDecision');
  assert.equal(engine.chooseSoupStyle('cream', now + 120), true);
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

test('all ten active role abilities execute once and leave a progressable turn', () => {
  const exercised = new Set();

  for (const role of ROLES) {
    const engine = create(role.id, 4_200 + ROLES.indexOf(role));
    if (role.id === 'gatherer') {
      completeSoupCompositionForTest(engine);
      engine.state.turn.phase = 'eating';
      assert.equal(engine.startNextChapter(now + 150), true);
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

test('a complete ten-player voyage can exercise every active ability without getting stuck', () => {
  const result = simulateGame({ playerCount: 10, seed: 97_001, useAbilities: true });

  assert.equal(result.completed, true);
  assert.equal(result.phase, 'complete');
  assert.equal(result.allActiveAbilitiesExercised, true);
  assert.equal(result.exercisedAbilities.length, ROLES.length);
  assert.equal(result.failedAbilityAttempts, 0);
  assert.equal(result.failedTransitions, 0);
  assert.equal(result.assignmentViolations, 0);
  assert.equal(result.taskIngredientMismatches, 0);
});
