import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine, validateSessionState } from '../js/core/game-engine.js';
import { COURSE_INGREDIENT_RULES, INGREDIENTS } from '../js/data/ingredients.js';
import { CHAPTERS } from '../js/data/chapters.js';
import { WATCH_CHALLENGES } from '../js/data/events.js';
import { TASK_DECKS } from '../js/data/tasks.js';
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
    const restored = new GameEngine(state);
    restored.state.menu[1].servedAt = null;
    const expectedTaskCounts = TASK_DECKS.map((deck, chapterIndex) =>
      deck.filter((card) => card.playable && restored.taskAppliesToChapter(card, chapterIndex)).length
    );
    const expectedTaskTotal = expectedTaskCounts.reduce((sum, count) => sum + count, 0);
    const recurringWatchInstances = state.tasks.filter((task) => restored.getTaskCard(task)?.repeatOnRelief).length;
    const recurringWatchExtras = Math.max(0, recurringWatchInstances - 1);
    const expectedInstanceCounts = expectedTaskCounts.map((count, chapterIndex) => count + (chapterIndex === 1 ? recurringWatchExtras : 0));

    assert.equal(validateSessionState(state).valid, true, label);
    assert.equal(result.completed, true, label);
    assert.equal(result.phase, 'complete', label);
    assert.ok(result.durationMinutes >= 280 && result.durationMinutes <= 410, `${label} duration=${result.durationMinutes}`);
    assert.equal(state.menu.length, 6, label);
    assert.ok(state.menu.every((course) => course?.ingredientIds.length > 0), label);
    assert.ok(state.menu.every((course, index) => index === 0 || course.servedAt > state.menu[index - 1].servedAt), label);
    assert.equal(state.history.filter((entry) => entry.type === 'courseServed').length, 6, label);
    assert.equal(state.history.filter((entry) => entry.type === 'chapterStarted').length, 5, label);
    assert.equal(state.history.at(-1)?.type, 'voyageCompleted', label);

    assert.equal(result.tasks, expectedTaskTotal + recurringWatchExtras, label);
    assert.equal(result.completedTasks, expectedTaskTotal + recurringWatchExtras, label);
    assert.deepEqual(taskCounts, expectedInstanceCounts, label);
    assert.equal(new Set(state.tasks.map((task) => task.taskId)).size, expectedTaskTotal, label);
    assert.ok(state.tasks.every((task) => Array.isArray(task.basketIngredientIds)), label);
    assert.ok(state.tasks.every((task) => task.assignedAt <= task.startedAt && task.startedAt <= task.completedAt), label);
    assert.ok(state.tasks.every((task) => (task.timingMode === 'manual' ? task.challengeEndsAt == null : task.challengeEndsAt > task.startedAt) && Number.isInteger(task.challengeCoinValue)), label);
    assert.equal(result.backgroundCoinViolations, 0, label);
    assert.ok(result.backgroundTasks >= 4, label);
    assert.ok(result.manualTasks >= 3, label);
    assert.ok(result.timerTasks >= 5, label);
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
    assert.ok(state.ingredients.filter((ingredient) => ingredient.category === 'alcohol' && ingredient.status === 'used').length <= 4,
      `${label} uses at most three cocktail spirits plus one optional dessert spirit`);
    assert.equal(state.ingredients.some((ingredient) => ingredient.status === 'discovered'), false, `${label} no ingredient may remain in a course basket`);
    const cocktailSpiritTarget = state.chapter.cocktailSpiritTarget;
    assert.ok([1, 2, 3].includes(cocktailSpiritTarget), `${label} cocktail spirit target is selected`);
    assert.equal(categoryCount(5, 'alcohol'), cocktailSpiritTarget, `${label} cocktail uses the selected number of spirit varieties`);
    const saladHasMeat = categoryCount(2, 'meat') > 0;
    const saladTaskTitles = new Set(state.tasks.filter((task) => task.chapterIndex === 2)
      .map((task) => restored.getTaskCard(task)?.title.de));
    assert.equal(saladTaskTitles.has('Salatfleisch mundgerecht schneiden'), saladHasMeat, label);
    assert.equal(saladTaskTitles.has('Salatfleisch in der Pfanne braten'), saladHasMeat, label);
    const selectedJuices = ['apple-juice', 'orange-juice', 'cherry-juice'].filter((ingredientId) => state.menu[5].ingredientIds.includes(ingredientId));
    assert.ok(state.menu[5].ingredientIds.includes('mineral-water'), label);
    assert.ok(selectedJuices.length >= 1 && selectedJuices.length <= 2, `${label} uses an optional juice selection, not every juice`);
    assert.equal(state.ingredients.some((ingredient) => ingredient.id === 'ice-cubes'), false, `${label} ice is basic stock, not a played ingredient`);
    assert.ok(['alcoholic', 'alcohol-free'].every((team) => ['mixed', 'stirred'].includes(state.menu[5].cocktailTechniques?.[team])), `${label} both cocktail techniques are fixed`);
    assert.equal(result.cocktailTeamChoices, result.playerCount, `${label} every player chooses a cocktail team exactly once`);
    assert.ok(['alcoholic', 'alcohol-free'].every((team) => state.players.some((player) => player.cocktailTeam === team)), `${label} both cocktail teams are staffed`);
    assert.ok(state.menu[4].ingredientIds.includes('vanilla-ice'), `${label} vanilla ice belongs to dessert`);
    assert.equal(state.menu[1].courseStyle, choiceStyle, label);
    assert.ok(state.coins <= 500 && state.coins >= 0, label);

    assert.equal(result.events, result.uniqueEvents, label);
    assert.equal(result.funCards, result.uniqueFunCards, `${label} fun cards must be unique`);
    assert.ok(result.funCards <= WATCH_CHALLENGES.length, `${label} finite fun-card deck`);
    assert.equal(result.cauldronHandoffViolations, 0, `${label} cauldron watches must change hands`);
    assert.ok(result.events >= 150 && result.events <= 540, `${label} events=${result.events}`);
    assert.ok(result.turnSpread <= 20, `${label} turnSpread=${result.turnSpread}`);
    assert.equal(new Set(state.players.map((player) => player.roleId)).size, state.players.length, label);
    assert.ok(state.history.every((entry, index) => index === 0 || entry.timestamp >= state.history[index - 1].timestamp), `${label} history order`);

    roleRosters.add(state.players.map((player) => player.roleId).join(','));
  }

  assert.ok(roleRosters.size >= 4, `expected varied role rosters, got ${roleRosters.size}`);
});
