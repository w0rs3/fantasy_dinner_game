import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateGame } from '../tools/simulation-lib.mjs';

test('complete games finish for every supported crew size without pure waiting', () => {
  for (let playerCount = 6; playerCount <= 10; playerCount += 1) {
    for (let seed = 1; seed <= 4; seed += 1) {
      const result = simulateGame({ playerCount, seed: playerCount * 100 + seed });
      assert.equal(result.completed, true, `crew=${playerCount} seed=${seed}`);
      assert.equal(result.chapterIndex, 5);
      assert.equal(result.phase, 'complete');
      assert.equal(result.pureWaitingSteps, 0);
      assert.equal(result.invalidEventActions, 0);
      assert.equal(result.stageEventMismatches, 0);
      assert.equal(result.taskOrderViolations, 0);
      assert.equal(result.taskAssignmentsBeforeIngredientsLocked, 0);
      assert.equal(result.failedTransitions, 0);
      assert.equal(result.assignmentViolations, 0);
      assert.equal(result.taskIngredientMismatches, 0);
      assert.equal(result.events, result.uniqueEvents, 'a voyage must not repeat event cards');
      assert.ok(result.productiveWaitingTurns > 0, 'timer windows should contain playable turns');
      assert.equal(result.essentialUnused.length, 0);
      assert.ok(result.snapshot.coins <= 100 && result.snapshot.coins >= -100, 'coin score stays within the reward scale');
      assert.equal(result.tasks, result.completedTasks);
      assert.ok(result.taskMarkerSpread <= 2, `task spread was ${result.taskMarkerSpread}`);
      assert.ok(result.turnSpread <= 3, `turn spread was ${result.turnSpread}`);
      assert.ok(result.durationMinutes >= 240 && result.durationMinutes <= 305, `duration was ${result.durationMinutes}`);
      assert.ok(result.maxConcurrentTasks >= 2, 'parallel tasks should occur');
    }
  }
});
