import { GameEngine } from '../js/core/game-engine.js';
import { updateTaskTimers } from '../js/core/timers.js';
import { CHAPTERS } from '../js/data/chapters.js';
import { ROLES } from '../js/data/roles.js';

const MINUTE = 60_000;

function chooseEventOption(engine, seed) {
  const options = engine.currentEvent.options;
  if (options.includes('splitCrew') && engine.state.groups.length === 1 && (seed + engine.state.chapter.eventsResolved) % 3 === 0) {
    return 'splitCrew';
  }
  const priorities = engine.currentEventStage() === 'ingredients'
    ? ['discoverIngredient', 'treasureAndIngredient', 'lockIngredient', 'swapIngredient']
    : engine.currentEventStage() === 'tasks'
      ? ['teamTask', 'drawTask', 'singleTask', 'treasureAndTask']
      : ['treasureAndWatch', 'watchChallenge', 'watchChallengeAlt', 'treasure', 'splitCrew'];
  return priorities.find((option) => options.includes(option)) ?? options[0];
}

function serviceKitchenWork(engine, now) {
  updateTaskTimers(engine.state, now);
  let changed = false;
  for (const instance of engine.state.tasks) {
    const card = engine.getTaskCard(instance);
    const simulatedHandsOnMinutes = card.timerMinutes || Math.min(card.estimatedMinutes, 2);
    const estimatedEnd = instance.startedAt == null ? Infinity : instance.startedAt + simulatedHandsOnMinutes * MINUTE;
    if (instance.status === 'ready' || (instance.status === 'active' && now >= estimatedEnd)) {
      engine.completeTask(instance.instanceId, now);
      changed = true;
    }
  }
  return changed;
}

function exerciseActiveAbility(engine, now, exercisedAbilities) {
  const player = engine.activePlayer;
  const role = ROLES.find((entry) => entry.id === player.roleId);
  if (!role || exercisedAbilities.has(role.activeCode)) return { attempted: false, used: false };
  const option = role.activeCode === 'adjustDie'
    ? (engine.state.turn.dieResult >= 6 ? -1 : 1)
    : null;
  if (!engine.activeAbilityAvailable(option)) return { attempted: false, used: false };
  const used = engine.useActiveAbility(option, now);
  if (used) exercisedAbilities.add(role.activeCode);
  return { attempted: true, used };
}

export function simulateGame({ playerCount = 8, seed = 1, turnSeconds = 20, maxSteps = 20_000, useAbilities = false } = {}) {
  const initialNow = 1_800_000_000_000 + seed * 10_000;
  let now = initialNow;
  const names = Array.from({ length: playerCount }, (_, index) => `Player ${index + 1}`);
  const engine = GameEngine.create({ names, title: `Simulation ${seed}`, defaultLanguage: 'de', audio: false, seed }, now);
  now += 12 * MINUTE;
  let steps = 0;
  let maxConcurrentTasks = 0;
  let productiveWaitingTurns = 0;
  let pureWaitingSteps = 0;
  let timerTasks = 0;
  let previousChapter = 0;
  let invalidEventActions = 0;
  let stageEventMismatches = 0;
  let taskOrderViolations = 0;
  let taskAssignmentsBeforeIngredientsLocked = 0;
  let failedTransitions = 0;
  let abilityAttempts = 0;
  let failedAbilityAttempts = 0;
  const exercisedAbilities = new Set();
  const stageEvents = { ingredients: 0, tasks: 0, cooking: 0 };

  while (engine.state.status !== 'completed' && steps < maxSteps) {
    steps += 1;
    serviceKitchenWork(engine, now);
    maxConcurrentTasks = Math.max(maxConcurrentTasks, engine.state.tasks.filter((task) => ['active', 'ready'].includes(task.status)).length);
    timerTasks = engine.state.tasks.filter((instance) => engine.getTaskCard(instance).timerMinutes > 0).length;

    if (useAbilities) {
      const ability = exerciseActiveAbility(engine, now, exercisedAbilities);
      if (ability.attempted) abilityAttempts += 1;
      if (ability.attempted && !ability.used) failedAbilityAttempts += 1;
    }

    const phase = engine.state.turn.phase;
    if (phase === 'draw') {
      if (engine.state.groups.every((group) => group.finished) && engine.state.tasks.some((task) => task.chapterIndex === engine.state.chapterIndex && task.status !== 'done')) {
        productiveWaitingTurns += 1;
      }
      if (!engine.beginEvent(now) && engine.state.turn.phase === 'draw') pureWaitingSteps += 1;
    } else if (phase === 'event') {
      const event = engine.currentEvent;
      stageEvents[event.stage] += 1;
      if (event.stage !== engine.currentEventStage()) stageEventMismatches += 1;
      const actions = event.type === 'choice' ? event.options : event.outcomes;
      invalidEventActions += actions.filter((action) => !engine.actionAvailable(action)).length;
      if (event.stage === 'tasks' && !engine.ingredientsLockedForCourse() && engine.state.chapterIndex !== 0) taskAssignmentsBeforeIngredientsLocked += 1;
      if (engine.currentEvent.type === 'choice') {
        if (!engine.resolveChoice(chooseEventOption(engine, seed), now)) failedTransitions += 1;
      } else if (!engine.rollDie(now)) failedTransitions += 1;
    } else if (phase === 'rolled') {
      if (!engine.confirmRoll(now)) failedTransitions += 1;
    } else if (phase === 'watch') {
      if (!engine.completeWatchChallenge(now)) failedTransitions += 1;
    } else if (phase === 'ingredientChoice') {
      if (!engine.chooseIngredient(engine.state.turn.pendingIngredientIds[0], now)) failedTransitions += 1;
    } else if (phase === 'effectChoice') {
      if (!engine.resolveIngredientEffectChoice(engine.state.turn.pendingEffect.options[0], now)) failedTransitions += 1;
    } else if (phase === 'taskBriefing') {
      const instance = engine.state.tasks.find((task) => task.instanceId === engine.state.turn.assignedTaskId);
      if (!instance || !engine.taskPrerequisitesMet(engine.getTaskCard(instance))) taskOrderViolations += 1;
      if (!engine.acceptTaskBriefing(now)) failedTransitions += 1;
    } else if (phase === 'resolved') {
      const result = engine.endTurn(now);
      if (result !== 'chain') {
        now += turnSeconds * 1000;
      }
    } else if (phase === 'chapterReady') {
      if (!engine.serveCourse(now)) failedTransitions += 1;
    } else if (phase === 'eating') {
      now += CHAPTERS[engine.state.chapterIndex].eatingMinutes * MINUTE;
      if (!engine.startNextChapter(now)) failedTransitions += 1;
      previousChapter = engine.state.chapterIndex;
    } else {
      throw new Error(`Unexpected phase ${phase} at step ${steps}`);
    }
  }

  const turns = engine.state.players.map((player) => player.turns);
  const markers = engine.state.players.map((player) => player.taskMarkers);
  const essentialUnused = engine.state.ingredients.filter((ingredient) => ingredient.essential && ingredient.status !== 'used');
  const optionalUnused = engine.state.ingredients.filter((ingredient) => !ingredient.essential && ingredient.status !== 'used');
  const splitCount = engine.state.history.filter((entry) => entry.type === 'crewSplit').length;
  const totalMinutes = Math.round((now - initialNow) / MINUTE);
  const assignmentViolations = engine.state.tasks.filter((instance) => {
    const card = engine.getTaskCard(instance);
    return instance.assignedPlayerIds.length < card.people[0] || instance.assignedPlayerIds.length > card.people[1] ||
      new Set(instance.assignedPlayerIds).size !== instance.assignedPlayerIds.length;
  }).length;
  const taskIngredientMismatches = engine.state.tasks.filter((instance) => {
    const card = engine.getTaskCard(instance);
    return card.ingredientTags.some((ingredientId) => !instance.basketIngredientIds.includes(ingredientId));
  }).length;

  return {
    playerCount,
    seed,
    completed: engine.state.status === 'completed',
    phase: engine.state.turn.phase,
    chapterIndex: engine.state.chapterIndex,
    steps,
    durationMinutes: totalMinutes,
    turns: turns.reduce((sum, value) => sum + value, 0),
    turnSpread: Math.max(...turns) - Math.min(...turns),
    tasks: engine.state.tasks.length,
    completedTasks: engine.state.tasks.filter((task) => task.status === 'done').length,
    taskMarkerSpread: Math.max(...markers) - Math.min(...markers),
    events: engine.state.eventsDrawn.length,
    uniqueEvents: new Set(engine.state.eventsDrawn).size,
    maxConcurrentTasks,
    productiveWaitingTurns,
    pureWaitingSteps,
    timerTasks,
    invalidEventActions,
    stageEventMismatches,
    taskOrderViolations,
    taskAssignmentsBeforeIngredientsLocked,
    failedTransitions,
    abilityAttempts,
    failedAbilityAttempts,
    exercisedAbilities: [...exercisedAbilities],
    allActiveAbilitiesExercised: ROLES.every((role) => exercisedAbilities.has(role.activeCode)),
    assignmentViolations,
    taskIngredientMismatches,
    stageEvents,
    splitCount,
    essentialUnused: essentialUnused.map((ingredient) => ingredient.id),
    optionalUnused: optionalUnused.map((ingredient) => ingredient.id),
    historyEntries: engine.state.history.length,
    snapshot: engine.snapshot()
  };
}

export function simulateMatrix({ seedsPerPlayerCount = 10 } = {}) {
  const results = [];
  for (let playerCount = 6; playerCount <= 10; playerCount += 1) {
    for (let seed = 1; seed <= seedsPerPlayerCount; seed += 1) {
      results.push(simulateGame({ playerCount, seed: playerCount * 1000 + seed }));
    }
  }
  return results;
}
