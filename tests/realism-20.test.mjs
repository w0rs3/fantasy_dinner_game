import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSessionState } from '../js/core/game-engine.js';
import { COURSE_INGREDIENT_RULES, INGREDIENTS } from '../js/data/ingredients.js';
import { CHAPTERS } from '../js/data/chapters.js';
import { simulateGame } from '../tools/simulation-lib.mjs';

test('five complete dinners with varied crews and soup routes remain coherent from setup to treasure', () => {
  const roleRosters = new Set();

  for (let run = 1; run <= 5; run += 1) {
    const choiceStyle = run % 2 ? 'clear' : 'cream';
    const result = simulateGame({ playerCount: 5 + run, seed: 88_000 + run, choiceStyle });
    const state = result.snapshot;
    const label = `run=${run} seed=${88_000 + run}`;
    const servedIngredients = new Set(state.menu.flatMap((course) => course?.ingredientIds ?? []));
    const essentialIds = INGREDIENTS.filter((ingredient) => ingredient.essential).map((ingredient) => ingredient.id);
    const taskCounts = Array.from({ length: 6 }, (_, chapterIndex) =>
      state.tasks.filter((task) => task.chapterIndex === chapterIndex).length
    );

    assert.equal(validateSessionState(state).valid, true, label);
    assert.equal(result.completed, true, label);
    assert.equal(result.phase, 'complete', label);
    assert.ok(result.durationMinutes >= 280 && result.durationMinutes <= 350, `${label} duration=${result.durationMinutes}`);
    assert.equal(state.menu.length, 6, label);
    assert.ok(state.menu.every((course) => course?.ingredientIds.length > 0), label);
    assert.ok(state.menu.every((course, index) => index === 0 || course.servedAt > state.menu[index - 1].servedAt), label);
    assert.equal(state.history.filter((entry) => entry.type === 'courseServed').length, 6, label);
    assert.equal(state.history.filter((entry) => entry.type === 'chapterStarted').length, 5, label);
    assert.equal(state.history.at(-1)?.type, 'voyageCompleted', label);

    assert.equal(result.tasks, 71, label);
    assert.equal(result.completedTasks, 71, label);
    assert.deepEqual(taskCounts, [13, 13, 11, 13, 10, 11], label);
    assert.equal(new Set(state.tasks.map((task) => task.taskId)).size, 71, label);
    assert.ok(state.tasks.every((task) => Array.isArray(task.basketIngredientIds)), label);
    assert.ok(state.tasks.every((task) => task.assignedAt <= task.startedAt && task.startedAt <= task.completedAt), label);
    assert.ok(state.tasks.every((task) => task.challengeEndsAt > task.startedAt && Number.isInteger(task.challengeCoinValue)), label);
    assert.equal(result.backgroundCoinViolations, 0, label);
    assert.ok(result.backgroundTasks >= 8, label);
    assert.ok(result.timerTasks >= 6, label);
    assert.ok(result.maxConcurrentTasks >= 2, label);
    assert.ok(result.productiveWaitingTurns > 0, label);
    assert.equal(result.pureWaitingSteps, 0, label);
    assert.equal(result.invalidEventActions, 0, label);
    assert.equal(result.stageEventMismatches, 0, label);
    assert.equal(result.taskOrderViolations, 0, label);
    assert.equal(result.taskAssignmentsBeforeIngredientsLocked, 0, label);
    assert.equal(result.failedTransitions, 0, label);
    assert.equal(result.duplicateEventActions, 0, label);
    assert.equal(result.activeCreatorAssignmentViolations, 0, label);
    assert.equal(result.followUpDelayViolations, 0, label);
    assert.equal(result.assignmentViolations, 0, label);
    assert.ok(result.maxOpenTasksPerPlayer <= 1, `${label} maxOpenTasksPerPlayer=${result.maxOpenTasksPerPlayer}`);
    assert.ok(result.taskAssigneeChoices > 0, `${label} taskAssigneeChoices=${result.taskAssigneeChoices}`);
    assert.equal(result.taskIngredientMismatches, 0, label);
    assert.equal(result.activeChallengesRemaining, 0, label);
    assert.equal(result.basketResidue.length, 0, label);
    assert.ok(Object.values(result.stageEvents).every((count) => count > 0), label);

    assert.ok(essentialIds.every((ingredientId) => servedIngredients.has(ingredientId)), label);
    assert.equal(result.essentialUnused.length, 0, label);
    const categoryCount = (courseIndex, category) => state.menu[courseIndex].ingredientIds.filter((id) => state.ingredients.find((ingredient) => ingredient.id === id)?.category === category).length;
    for (let courseIndex = 1; courseIndex < CHAPTERS.length; courseIndex += 1) {
      const chapter = CHAPTERS[courseIndex];
      const rule = COURSE_INGREDIENT_RULES[chapter.id];
      const ids = state.menu[courseIndex].ingredientIds;
      const essentialCount = ids.filter((id) => state.ingredients.find((ingredient) => ingredient.id === id)?.essential).length;
      assert.equal(essentialCount, rule.target, `${label} ${chapter.id} required ingredient total`);
      assert.ok(ids.every((id) => state.ingredients.find((ingredient) => ingredient.id === id)?.courseTags.includes(chapter.id)), `${label} ${chapter.id} tags`);
      for (const [category, minimum] of Object.entries(rule.categoryMinimums ?? {})) {
        assert.ok(categoryCount(courseIndex, category) >= minimum, `${label} ${chapter.id} ${category} minimum`);
      }
      for (const [category, limit] of Object.entries(rule.categoryLimits ?? {})) {
        assert.ok(categoryCount(courseIndex, category) <= limit, `${label} ${chapter.id} ${category} limit`);
      }
    }
    assert.ok(categoryCount(1, 'meat') <= 1, label);
    assert.ok(categoryCount(2, 'fruit') <= 2, label);
    assert.ok(categoryCount(3, 'fruit') <= 2, label);
    assert.ok(state.ingredients.filter((ingredient) => ingredient.category === 'alcohol' && ingredient.status === 'used').length <= 3, label);
    assert.equal(state.ingredients.some((ingredient) => ingredient.status === 'discovered'), false, `${label} no ingredient may remain in a course basket`);
    assert.ok(['mineral-water', 'juices', 'ice-cubes'].every((ingredientId) => state.menu[5].ingredientIds.includes(ingredientId)), label);
    assert.ok(state.menu[4].ingredientIds.includes('vanilla-ice'), `${label} vanilla ice belongs to dessert`);
    assert.equal(state.menu[1].courseStyle, choiceStyle, label);
    assert.ok(state.coins <= 500 && state.coins >= 0, label);

    assert.equal(result.events, result.uniqueEvents, label);
    assert.equal(result.cauldronHandoffViolations, 0, `${label} cauldron watches must change hands`);
    assert.ok(result.events >= 150 && result.events <= 540, `${label} events=${result.events}`);
    assert.ok(result.splitCount >= 1, label);
    assert.ok(result.turnSpread <= 20, `${label} turnSpread=${result.turnSpread}`);
    assert.equal(new Set(state.players.map((player) => player.roleId)).size, state.players.length, label);
    assert.ok(state.history.every((entry, index) => index === 0 || entry.timestamp >= state.history[index - 1].timestamp), `${label} history order`);

    roleRosters.add(state.players.map((player) => player.roleId).join(','));
  }

  assert.ok(roleRosters.size >= 4, `expected varied role rosters, got ${roleRosters.size}`);
});
