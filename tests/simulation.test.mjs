import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { WATCH_CHALLENGES } from '../js/data/events.js';
import { TASK_DECKS } from '../js/data/tasks.js';
import { simulateGame } from '../tools/simulation-lib.mjs';

test('complete games finish for every supported crew size without pure waiting', () => {
  for (let playerCount = 6; playerCount <= 10; playerCount += 1) {
    for (let seed = 1; seed <= 2; seed += 1) {
      const result = simulateGame({ playerCount, seed: playerCount * 100 + seed, choiceStyle: seed % 2 ? 'clear' : 'cream' });
      assert.equal(result.completed, true, `crew=${playerCount} seed=${seed}`);
      assert.equal(result.chapterIndex, 5);
      assert.equal(result.phase, 'complete');
      assert.equal(result.pureWaitingSteps, 0);
      assert.equal(result.invalidEventActions, 0);
      assert.equal(result.stageEventMismatches, 0);
      assert.equal(result.taskOrderViolations, 0);
      assert.equal(result.taskAssignmentsBeforeIngredientsLocked, 0);
      assert.equal(result.failedTransitions, 0);
      assert.equal(result.duplicateEventActions, 0);
      assert.equal(result.activeCreatorAssignmentViolations, 0);
      assert.equal(result.assignmentViolations, 0);
      assert.ok(result.maxOpenTasksPerPlayer <= 1, 'a player must never have overlapping open tasks');
      assert.ok(result.taskAssigneeChoices > 0, 'the active player should receive crew choices during a full voyage');
      assert.equal(result.taskIngredientMismatches, 0);
      assert.equal(result.cauldronHandoffViolations, 0);
      assert.equal(result.activeChallengesRemaining, 0);
      assert.equal(result.followUpDelayViolations, 0);
      assert.equal(result.backgroundCoinViolations, 0);
      assert.equal(result.basketResidue.length, 0);
      assert.equal(result.events, result.uniqueEvents, 'a voyage must not repeat event cards');
      assert.equal(result.funCards, result.uniqueFunCards, 'a voyage must not repeat fun cards');
      assert.ok(result.funCards <= WATCH_CHALLENGES.length, 'the finite fun-card deck must never be exceeded');
      assert.ok(result.productiveWaitingTurns > 0, 'timer windows should contain playable turns');
      assert.equal(result.essentialUnused.length, 0);
      const cocktailSpiritTarget = result.snapshot.chapter.cocktailSpiritTarget;
      const cocktailSpiritCount = result.snapshot.menu[5].ingredientIds.filter((ingredientId) =>
        result.snapshot.ingredients.find((ingredient) => ingredient.id === ingredientId)?.category === 'alcohol'
      ).length;
      assert.ok([1, 2, 3].includes(cocktailSpiritTarget));
      assert.equal(cocktailSpiritCount, cocktailSpiritTarget);
      const cocktailIngredients = result.snapshot.menu[5].ingredientIds
        .map((ingredientId) => result.snapshot.ingredients.find((ingredient) => ingredient.id === ingredientId));
      const nonAlcoholCount = (team) => cocktailIngredients.filter((ingredient) =>
        ingredient.category !== 'alcohol' && [team, 'shared'].includes(ingredient.cocktailUse)
      ).length;
      const totalCount = (team) => cocktailIngredients.filter((ingredient) =>
        [team, 'shared'].includes(ingredient.cocktailUse)
      ).length;
      assert.equal(nonAlcoholCount('alcoholic'), nonAlcoholCount('alcohol-free'));
      assert.equal(totalCount('alcoholic'), totalCount('alcohol-free') + cocktailSpiritTarget);
      assert.ok(result.snapshot.coins <= 500 && result.snapshot.coins >= 0, 'coin score stays within the reward scale');
      assert.equal(result.tasks, result.completedTasks);
      const restored = new GameEngine(result.snapshot);
      restored.state.menu[1].servedAt = null;
      const expectedTasks = TASK_DECKS.reduce((total, deck, chapterIndex) => total +
        deck.filter((card) => card.playable && restored.taskAppliesToChapter(card, chapterIndex)).length, 0);
      const recurringWatchInstances = result.snapshot.tasks.filter((task) => restored.getTaskCard(task)?.repeatOnRelief).length;
      assert.equal(result.tasks, expectedTasks + Math.max(0, recurringWatchInstances - 1));
      assert.ok(result.backgroundTasks >= 4);
      assert.ok(result.manualTasks >= 3);
      assert.ok(result.turnSpread <= 25, `turn spread was ${result.turnSpread}`);
      assert.ok(result.durationMinutes >= 280 && result.durationMinutes <= 410, `duration was ${result.durationMinutes}`);
      assert.equal(result.soupStyle, seed % 2 ? 'clear' : 'cream');
      assert.ok(result.maxConcurrentTasks >= 2, 'parallel tasks should occur');
    }
  }
});
