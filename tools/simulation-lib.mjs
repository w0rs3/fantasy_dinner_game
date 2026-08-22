import { GameEngine } from '../js/core/game-engine.js';
import { updateTaskTimers } from '../js/core/timers.js';
import { CHAPTERS } from '../js/data/chapters.js';
import { ROLES } from '../js/data/roles.js';

const MINUTE = 60_000;

function chooseEventOption(engine, seed) {
  const options = engine.currentEvent.options;
  const priorities = engine.currentEventStage() === 'ingredients'
    ? ['discoverIngredient', 'treasureAndIngredient', 'lockIngredient', 'swapIngredient']
    : engine.currentEventStage() === 'tasks'
      ? ['teamTask', 'drawTask', 'singleTask', 'treasureAndTask']
      : ['treasureAndWatch', 'watchChallenge', 'watchChallengeAlt', 'treasureAndChain', 'treasure'];
  return priorities.find((option) => options.includes(option)) ?? options[0];
}

function serviceKitchenWork(engine, now) {
  updateTaskTimers(engine.state, now);
  let changed = false;
  for (const instance of engine.state.tasks) {
    const card = engine.getTaskCard(instance);
    const simulatedHandsOnMinutes = card.timingMode === 'background'
      ? card.backgroundMinutes
      : card.timingMode === 'manual'
        ? card.estimatedMinutes
        : Math.min(card.challengeMinutes || card.estimatedMinutes, 2);
    const estimatedEnd = instance.startedAt == null ? Infinity : instance.startedAt + simulatedHandsOnMinutes * MINUTE;
    if (instance.status === 'ready' || (instance.status === 'active' && now >= estimatedEnd)) {
      if (engine.isCauldronWatch(instance)) {
        const completedWatches = engine.state.tasks.filter((candidate) =>
          candidate.chapterIndex === engine.state.chapterIndex && candidate.status === 'done' && engine.isCauldronWatch(candidate)
        ).length;
        engine.completeCauldronWatch(instance.instanceId, completedWatches >= 2 ? 'soupReady' : 'relieve', now);
      } else {
        engine.completeTask(instance.instanceId, now);
      }
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

export function simulateGame({ playerCount = 8, seed = 1, turnSeconds = 20, maxSteps = 20_000, useAbilities = false, choiceStyle = 'balanced' } = {}) {
  const initialNow = 1_800_000_000_000 + seed * 10_000;
  let now = initialNow;
  const names = Array.from({ length: playerCount }, (_, index) => `Player ${index + 1}`);
  const engine = GameEngine.create({ names, title: `Simulation ${seed}`, defaultLanguage: 'de', audio: false, seed }, now);
  const assignedActiveCodes = new Set(engine.state.players
    .map((player) => ROLES.find((role) => role.id === player.roleId)?.activeCode)
    .filter(Boolean));
  now += 10 * MINUTE;
  let steps = 0;
  let maxConcurrentTasks = 0;
  let maxOpenTasksPerPlayer = 0;
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
  let taskAssigneeChoices = 0;
  let duplicateEventActions = 0;
  let activeCreatorAssignmentViolations = 0;
  const exercisedAbilities = new Set();
  const stageEvents = { ingredients: 0, tasks: 0, cooking: 0 };

  while (engine.state.status !== 'completed' && steps < maxSteps) {
    steps += 1;
    serviceKitchenWork(engine, now);
    maxConcurrentTasks = Math.max(maxConcurrentTasks, engine.state.tasks.filter((task) => ['active', 'ready'].includes(task.status)).length);
    maxOpenTasksPerPlayer = Math.max(maxOpenTasksPerPlayer, ...engine.state.players.map((player) => engine.openTasksForPlayer(player.id).length));
    timerTasks = engine.state.tasks.filter((instance) => engine.getTaskCard(instance).timerMinutes > 0).length;

    if (useAbilities) {
      const ability = exerciseActiveAbility(engine, now, exercisedAbilities);
      if (ability.attempted) abilityAttempts += 1;
      if (ability.attempted && !ability.used) failedAbilityAttempts += 1;
    }

    const phase = engine.state.turn.phase;
    if (phase === 'draw') {
      if (engine.state.tasks.some((task) =>
        task.chapterIndex === engine.state.chapterIndex && ['active', 'ready'].includes(task.status) && task.endAt
      )) {
        productiveWaitingTurns += 1;
      }
      if (!engine.beginEvent(now) && engine.state.turn.phase === 'draw') pureWaitingSteps += 1;
    } else if (phase === 'event') {
      const event = engine.currentEvent;
      if (['island', 'location'].includes(event.storyKind)) {
        if (!engine.completeStoryCard(now)) failedTransitions += 1;
      } else if (event.storyKind === 'quiz') {
        const answer = (seed + steps) % 4
          ? event.correctAnswerId
          : event.answers.find((candidate) => candidate.id !== event.correctAnswerId).id;
        if (!engine.answerStoryQuiz(answer, now)) failedTransitions += 1;
      } else {
        stageEvents[event.stage] += 1;
        if (event.stage !== engine.currentEventStage()) stageEventMismatches += 1;
        const actions = event.type === 'choice' ? event.options : event.outcomes;
        if (new Set(actions).size !== actions.length) duplicateEventActions += 1;
        invalidEventActions += actions.filter((action) => !engine.actionAvailable(action)).length;
        if (event.stage === 'tasks' && engine.state.chapter.stage !== 'clearing' && !engine.ingredientsLockedForCourse() && engine.state.chapterIndex !== 0) taskAssignmentsBeforeIngredientsLocked += 1;
        if (engine.currentEvent.type === 'choice') {
          if (!engine.resolveChoice(chooseEventOption(engine, seed), now)) failedTransitions += 1;
        } else if (!engine.rollDie(now)) failedTransitions += 1;
      }
    } else if (phase === 'rolled') {
      if (!engine.confirmRoll(now)) failedTransitions += 1;
    } else if (phase === 'watch') {
      let handled;
      if (engine.currentWatchChallenge?.secret && engine.state.turn.watchSecretRevealedAt == null) {
        handled = engine.revealSecretWatchChallenge(now);
      } else if (engine.currentWatchChallenge?.playerSelection) {
        const player = engine.state.players[(engine.state.activePlayerIndex + 1) % engine.state.players.length];
        handled = engine.selectWatchChallengePlayer(player.id) && engine.confirmWatchChallengePlayer(now);
      } else if (engine.currentWatchChallenge?.flow === 'ongoing') handled = engine.activateOngoingWatchChallenge(now);
      else if (engine.currentWatchChallenge?.secret && engine.state.turn.watchStartedAt == null) handled = engine.startWatchChallengeAction(now);
      else if (engine.currentWatchChallenge?.skillCheck) handled = engine.resolveWatchChallengeOutcome((seed + steps) % 3 ? 'success' : 'failure', now);
      else handled = engine.completeWatchChallenge(now);
      if (!handled) failedTransitions += 1;
    } else if (phase === 'ingredientChoice') {
      if (!engine.chooseIngredient(engine.state.turn.pendingIngredientIds[0], now)) failedTransitions += 1;
    } else if (phase === 'effectChoice') {
      if (!engine.resolveIngredientEffectChoice(engine.state.turn.pendingEffect.options[0], now)) failedTransitions += 1;
    } else if (phase === 'taskAssigneeChoice') {
      const pending = engine.state.turn.pendingTaskAssignment;
      const group = engine.state.groups.find((candidate) => candidate.id === pending?.groupId);
      const candidates = group ? engine.freePlayersForTask(group)
        .sort((a, b) => engine.taskAssignmentPriority(a, b)) : [];
      const alreadySelected = new Set(pending?.selectedPlayerIds ?? []);
      const remaining = Math.max(0, (pending?.requiredPeople ?? 0) - alreadySelected.size);
      for (const player of candidates.filter((candidate) => !alreadySelected.has(candidate.id)).slice(0, remaining)) {
        if (!engine.toggleTaskAssignee(player.id)) failedTransitions += 1;
      }
      if (!engine.confirmTaskAssignees(now)) failedTransitions += 1;
      else taskAssigneeChoices += 1;
    } else if (phase === 'taskBriefing') {
      const instance = engine.state.tasks.find((task) => task.instanceId === engine.state.turn.assignedTaskId);
      if (!instance || !engine.taskPrerequisitesMet(engine.getTaskCard(instance))) taskOrderViolations += 1;
      if (instance && !instance.assignedPlayerIds.includes(engine.activePlayer.id)) activeCreatorAssignmentViolations += 1;
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
    } else if (phase === 'courseDecision') {
      if (engine.currentChapter.id === 'cocktails') {
        if (engine.state.turn.courseDecisionType === 'cocktailSpiritCount') {
          const counts = engine.availableCocktailSpiritCounts();
          if (!engine.chooseCocktailSpiritCount(counts[seed % counts.length], now)) failedTransitions += 1;
        } else {
          const team = engine.state.turn.pendingCocktailTeam;
          const technique = (seed + (team === 'alcohol-free' ? 1 : 0)) % 2 ? 'mixed' : 'stirred';
          if (!engine.chooseCocktailTechnique(team, technique, now)) failedTransitions += 1;
        }
      } else {
        const style = choiceStyle === 'clear' ? 'clear' : choiceStyle === 'cream' ? 'cream' : seed % 2 ? 'clear' : 'cream';
        if (!engine.chooseSoupStyle(style, now)) failedTransitions += 1;
      }
    } else if (phase === 'cocktailTeamChoice') {
      const preferredTeam = engine.state.chapter.cocktailTeamSelectionIndex % 2 === 0 ? 'alcoholic' : 'alcohol-free';
      const availableTeams = engine.availableCocktailTeamChoices();
      if (!engine.chooseCocktailTeam(availableTeams.includes(preferredTeam) ? preferredTeam : availableTeams[0], now)) failedTransitions += 1;
    } else if (phase === 'crewBusy') {
      const ends = engine.state.tasks.filter((task) => task.status === 'active' && task.endAt).map((task) => task.endAt);
      now = ends.length ? Math.max(now + 1000, Math.min(...ends)) : now + turnSeconds * 1000;
    } else {
      throw new Error(`Unexpected phase ${phase} at step ${steps}`);
    }
  }

  const turns = engine.state.players.map((player) => player.turns);
  const markers = engine.state.players.map((player) => player.taskMarkers);
  const essentialUnused = engine.state.ingredients.filter((ingredient) => ingredient.essential && ingredient.status !== 'used');
  const optionalUnused = engine.state.ingredients.filter((ingredient) => !ingredient.essential && ingredient.status !== 'used');
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
  const cauldronWatches = engine.state.tasks
    .map((instance) => ({ instance, card: engine.getTaskCard(instance) }))
    .filter((entry) => entry.card?.chapterId === 'soup' && entry.card.questId === 'cauldron' && entry.card.timingMode === 'background')
    .sort((a, b) => engine.questStepNumber(a.card) - engine.questStepNumber(b.card));
  const cauldronHandoffViolations = cauldronWatches.slice(1).filter((entry, index) =>
    entry.instance.assignedPlayerIds.some((playerId) => cauldronWatches[index].instance.assignedPlayerIds.includes(playerId))
  ).length;

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
    islandStories: engine.state.eventsDrawn.filter((eventId) => eventId.startsWith('SI')).length,
    locationStories: engine.state.eventsDrawn.filter((eventId) => eventId.startsWith('SL')).length,
    storyQuizzes: engine.state.eventsDrawn.filter((eventId) => eventId.startsWith('SQ')).length,
    funCards: engine.state.funCardsDrawn.length,
    uniqueFunCards: new Set(engine.state.funCardsDrawn).size,
    maxConcurrentTasks,
    maxOpenTasksPerPlayer,
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
    duplicateEventActions,
    activeCreatorAssignmentViolations,
    taskAssigneeChoices,
    exercisedAbilities: [...exercisedAbilities],
    allActiveAbilitiesExercised: [...assignedActiveCodes].every((activeCode) => exercisedAbilities.has(activeCode)),
    assignmentViolations,
    taskIngredientMismatches,
    cauldronHandoffViolations,
    activeChallengesRemaining: engine.state.activeChallenges.length,
    followUpDelayViolations: engine.state.history.filter((entry) => entry.type === 'watchFollowUpScheduled' && (entry.data.delayTurns < 3 || entry.data.delayTurns > 5)).length,
    backgroundCoinViolations: engine.state.tasks.filter((instance) => instance.timingMode === 'background' && instance.challengeCoinValue !== 0).length,
    backgroundTasks: engine.state.tasks.filter((instance) => instance.timingMode === 'background').length,
    challengeTasks: engine.state.tasks.filter((instance) => instance.timingMode === 'challenge').length,
    manualTasks: engine.state.tasks.filter((instance) => instance.timingMode === 'manual').length,
    basketResidue: engine.state.ingredients.filter((ingredient) => ingredient.status === 'discovered').map((ingredient) => ingredient.id),
    soupStyle: engine.state.menu[1]?.courseStyle,
    cocktailTechniques: engine.state.menu[5]?.cocktailTechniques,
    cocktailTeamChoices: engine.state.history.filter((entry) => entry.type === 'cocktailTeamChosen').length,
    coins: engine.state.coins,
    stageEvents,
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
