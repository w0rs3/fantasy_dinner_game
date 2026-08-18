import test from 'node:test';
import assert from 'node:assert/strict';
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
      assert.ok(result.productiveWaitingTurns > 0, 'timer windows should contain playable turns');
      assert.equal(result.essentialUnused.length, 0);
      assert.ok(result.snapshot.coins <= 500 && result.snapshot.coins >= 0, 'coin score stays within the reward scale');
      assert.equal(result.tasks, result.completedTasks);
      assert.equal(result.tasks, 71);
      assert.ok(result.backgroundTasks >= 8);
      assert.ok(result.taskMarkerSpread <= 3, `task spread was ${result.taskMarkerSpread}`);
      assert.ok(result.durationMinutes >= 280 && result.durationMinutes <= 350, `duration was ${result.durationMinutes}`);
      assert.equal(result.soupStyle, seed % 2 ? 'clear' : 'cream');
      assert.ok(result.maxConcurrentTasks >= 2, 'parallel tasks should occur');
    }
  }
});
