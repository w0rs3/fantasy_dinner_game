import { simulateGame, simulateMatrix } from './simulation-lib.mjs';

const results = simulateMatrix({ seedsPerPlayerCount: 20 });
const abilityAudit = simulateGame({ playerCount: 10, seed: 97_001, useAbilities: true });
const failed = results.filter((result) => !result.completed || result.essentialUnused.length || result.durationMinutes < 240 || result.durationMinutes > 305 || result.taskMarkerSpread > 2 || result.turnSpread > 3 || result.pureWaitingSteps > 0 || result.events !== result.uniqueEvents || result.failedTransitions || result.assignmentViolations || result.taskIngredientMismatches);
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
    maxTaskSpread: Math.max(...group.map((result) => result.taskMarkerSpread)),
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
