import { simulateGame } from './simulation-lib.mjs';
import { WATCH_CHALLENGES } from '../js/data/events.js';

const results = [6, 7, 8, 9, 10].map((playerCount, index) => simulateGame({
  playerCount,
  seed: 97_101 + index,
  choiceStyle: index % 2 ? 'cream' : 'clear'
}));
const abilityAudit = simulateGame({ playerCount: 10, seed: 97_003, useAbilities: true });
const failed = results.filter((result) => !result.completed || result.essentialUnused.length || result.durationMinutes < 280 || result.durationMinutes > 400 || result.turnSpread > 20 || result.pureWaitingSteps > 0 || result.events !== result.uniqueEvents || result.funCards !== result.uniqueFunCards || result.funCards > WATCH_CHALLENGES.length || result.failedTransitions || result.assignmentViolations || result.maxOpenTasksPerPlayer > 1 || result.taskAssigneeChoices < 1 || result.taskIngredientMismatches || result.activeChallengesRemaining || result.cauldronHandoffViolations || result.duplicateEventActions || result.followUpDelayViolations || result.backgroundCoinViolations || result.basketResidue.length);
const durations = results.map((result) => result.durationMinutes);
const events = results.map((result) => result.events);
const tasks = results.map((result) => result.tasks);

console.table([6, 7, 8, 9, 10].map((playerCount) => {
  const group = results.filter((result) => result.playerCount === playerCount);
  return {
    players: playerCount,
    games: group.length,
    minMinutes: Math.min(...group.map((result) => result.durationMinutes)),
    avgMinutes: Math.round(group.reduce((sum, result) => sum + result.durationMinutes, 0) / group.length),
    maxMinutes: Math.max(...group.map((result) => result.durationMinutes)),
    avgEvents: Math.round(group.reduce((sum, result) => sum + result.events, 0) / group.length),
    avgTasks: Math.round(group.reduce((sum, result) => sum + result.tasks, 0) / group.length),
    coins: group[0].coins,
    soup: group[0].soupStyle,
    maxTurnSpread: Math.max(...group.map((result) => result.turnSpread)),
    complete: group.every((result) => result.completed)
  };
}));

console.log(JSON.stringify({
  games: results.length,
  durationRangeMinutes: [Math.min(...durations), Math.max(...durations)],
  eventRange: [Math.min(...events), Math.max(...events)],
  taskRange: [Math.min(...tasks), Math.max(...tasks)],
  allEssentialIngredientsUsed: results.every((result) => result.essentialUnused.length === 0),
  allGamesCompleted: results.every((result) => result.completed),
  noPureWaiting: results.every((result) => result.pureWaitingSteps === 0),
  noOverbookedPlayers: results.every((result) => result.maxOpenTasksPerPlayer <= 1),
  everyVoyageOffersCrewChoices: results.every((result) => result.taskAssigneeChoices > 0),
  noUnfinishedChallenges: results.every((result) => result.activeChallengesRemaining === 0),
  abilityAudit: {
    completed: abilityAudit.completed,
    durationMinutes: abilityAudit.durationMinutes,
    exercisedAbilities: abilityAudit.exercisedAbilities.length,
    allActiveAbilitiesExercised: abilityAudit.allActiveAbilitiesExercised,
    failedAbilityAttempts: abilityAudit.failedAbilityAttempts,
    failedTransitions: abilityAudit.failedTransitions
  },
  failures: failed.length
}, null, 2));

if (failed.length || !abilityAudit.completed || !abilityAudit.allActiveAbilitiesExercised || abilityAudit.failedAbilityAttempts || abilityAudit.failedTransitions) {
  console.error('First failed simulation:', failed[0]);
  process.exitCode = 1;
}
