import { APP_VERSION, COIN_GOAL, COIN_VALUES, MAX_HISTORY_ITEMS, PLAYER_LIMITS, STATE_VERSION } from '../config.js';
import { createId, randomInt, shuffle } from './random.js';
import { CHAPTERS, EXPECTED_SESSION_MINUTES } from '../data/chapters.js';
import { EVENT_DECKS, EVENT_STAGES, WATCH_CHALLENGES } from '../data/events.js';
import { COURSE_INGREDIENT_RULES, INGREDIENTS, buildIngredientPlan } from '../data/ingredients.js';
import { ROLES, getRole } from '../data/roles.js';
import { TASK_DECKS } from '../data/tasks.js';

const clone = (value) => typeof structuredClone === 'function'
  ? structuredClone(value)
  : JSON.parse(JSON.stringify(value));

function chapterState(playerIds, chapterIndex = 0) {
  return {
    round: 1,
    coinsEarned: 0,
    eventsResolved: 0,
    turnsByPlayer: Object.fromEntries(playerIds.map((id) => [id, 0])),
    readyToServe: false,
    served: false,
    watchChallenges: 0,
    splitTargetLocation: null,
    challengeIdsByRound: {},
    queuedChallenges: [],
    stage: chapterIndex === 0 ? 'tasks' : 'ingredients'
  };
}

function freshTurn() {
  return {
    phase: 'draw',
    currentEventId: null,
    dieResult: null,
    chainPending: false,
    chainDepth: 0,
    pendingIngredientIds: [],
    pendingContext: null,
    previousPhase: null,
    ingredientFlow: null,
    pendingEffect: null,
    outcomeCode: null,
    watchChallengeIndex: null,
    watchChallengeId: null,
    watchTargetPlayerId: null,
    watchStartedAt: null,
    watchEndsAt: null,
    assignedTaskId: null,
    resolvedTaskId: null,
    taskBriefingEndsTurn: true,
    activeAbilityUsed: false
  };
}

function stageEventQueues(chapterIndex, initialQueues = null) {
  const result = Object.fromEntries(EVENT_STAGES.map((stage) => [stage,
    CHAPTERS[chapterIndex].locations.map((_, locationIndex) => {
      const source = initialQueues?.[locationIndex] ?? EVENT_DECKS[chapterIndex].map((event) => event.id);
      return source.filter((eventId) => {
        const event = eventById(eventId);
        return event?.locationIndex === locationIndex && event.stage === stage;
      });
    })
  ]));
  return result;
}

function freshBonuses() {
  return {
    doubleNextDie: 0,
    rerollNext: 0,
    adjustNext: 0,
    ignoreNextEvent: 0,
    extraTurns: 0,
    ignoreNextIngredientEffect: 0,
    repeatNextIngredientEffect: 0,
    replaceNextIngredient: 0,
    revealNextEvent: 0,
    replaceNextEvent: 0,
    forceNextPlayer: 0
  };
}

function ensureNames(names) {
  const clean = names.map((name) => String(name ?? '').trim()).filter(Boolean);
  if (clean.length < PLAYER_LIMITS.min || clean.length > PLAYER_LIMITS.max) {
    throw new Error(`The crew must contain ${PLAYER_LIMITS.min}–${PLAYER_LIMITS.max} named players.`);
  }
  return clean;
}

function eventById(id) {
  for (const deck of EVENT_DECKS) {
    const card = deck.find((entry) => entry.id === id);
    if (card) return card;
  }
  return null;
}

function taskById(id) {
  for (const deck of TASK_DECKS) {
    const card = deck.find((entry) => entry.id === id);
    if (card) return card;
  }
  return null;
}

export class GameEngine {
  constructor(state) {
    if (!state || state.version !== STATE_VERSION) throw new Error('Unsupported or missing game state.');
    this.state = clone(state);
    this.state.turn = { ...freshTurn(), ...this.state.turn };
    this.state.chapter.stage ??= this.state.chapterIndex === 0 ? 'tasks' : 'ingredients';
    this.state.eventQueues = this.state.eventQueues.map((chapterQueues, chapterIndex) =>
      Array.isArray(chapterQueues) ? stageEventQueues(chapterIndex, chapterQueues) : chapterQueues
    );
    this.state.taskQueues = this.state.taskQueues.map((queue, chapterIndex) => {
      const playable = new Set(TASK_DECKS[chapterIndex].filter((card) => card.playable).map((card) => card.id));
      const retained = queue.filter((taskId) => playable.has(taskId));
      const missing = [...playable].filter((taskId) => !retained.includes(taskId));
      return [...retained, ...missing];
    });
    this.state.tasks.forEach((task) => { task.basketIngredientIds ??= []; });
    this.state.ingredients.forEach((ingredient) => {
      ingredient.basketTaskId ??= null;
      ingredient.basketCourseIndex ??= ingredient.status === 'discovered' ? ingredient.chapterIndex : null;
    });
    this.state.coins ??= this.state.chapter?.treasure ?? 0;
    this.state.chapter.coinsEarned ??= this.state.chapter.treasure ?? 0;
    this.state.chapter.challengeIdsByRound ??= {};
    this.state.chapter.queuedChallenges ??= [];
    this.state.turn.activeAbilityUsed ??= false;
  }

  static create(setup, now = Date.now()) {
    const names = ensureNames(setup.names ?? []);
    let rngState = Number(setup.seed) || (now >>> 0) || 1;
    const roleResult = shuffle(ROLES, rngState);
    rngState = roleResult.state;

    const players = names.map((name, index) => {
      const role = roleResult.value[index];
      return {
        id: `player-${index + 1}`,
        name,
        roleId: role.id,
        language: setup.defaultLanguage === 'en' ? 'en' : 'de',
        turns: 0,
        taskMarkers: 0,
        activeUsesRemaining: role.uses,
        passiveUsedByChapter: {}
      };
    });

    const ingredients = buildIngredientPlan(rngState, players.length);
    rngState = ingredients.state;

    const eventQueues = [];
    for (let chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex += 1) {
      const stageQueues = {};
      for (const stage of EVENT_STAGES) {
        stageQueues[stage] = [];
        for (let locationIndex = 0; locationIndex < CHAPTERS[chapterIndex].locations.length; locationIndex += 1) {
          const ids = EVENT_DECKS[chapterIndex]
            .filter((event) => event.locationIndex === locationIndex && event.stage === stage)
            .map((event) => event.id);
          const shuffled = shuffle(ids, rngState);
          rngState = shuffled.state;
          stageQueues[stage].push(shuffled.value);
        }
      }
      eventQueues.push(stageQueues);
    }

    const taskQueues = [];
    for (let chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex += 1) {
      const ids = TASK_DECKS[chapterIndex]
        .filter((taskCard) => taskCard.playable)
        .map((taskCard) => taskCard.id);
      const randomizedTasks = shuffle(ids, rngState);
      rngState = randomizedTasks.state;
      taskQueues.push(randomizedTasks.value);
    }

    const ingredientQueues = [];
    for (let chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex += 1) {
      const chapterId = CHAPTERS[chapterIndex].id;
      const ids = ingredients.plan.filter((ingredient) => ingredient.courseTags.includes(chapterId)).map((ingredient) => ingredient.id);
      const shuffled = shuffle(ids, rngState);
      rngState = shuffled.state;
      ingredientQueues.push(shuffled.value);
    }

    const state = {
      version: STATE_VERSION,
      appVersion: APP_VERSION,
      id: createId('voyage'),
      title: String(setup.title || 'Adventure Dinner').trim(),
      status: 'active',
      createdAt: now,
      updatedAt: now,
      startedAt: now,
      completedAt: null,
      settings: {
        defaultLanguage: setup.defaultLanguage === 'en' ? 'en' : 'de',
        audio: setup.audio !== false
      },
      seed: Number(setup.seed) || now,
      rngState,
      expectedMinutes: EXPECTED_SESSION_MINUTES,
      players,
      activePlayerIndex: 0,
      chapterIndex: 0,
      chapter: chapterState(players.map((player) => player.id), 0),
      groups: [{
        id: 'A',
        playerIds: players.map((player) => player.id),
        locationIndex: 0,
        locationProgress: 0,
        completedLocations: [],
        finished: false
      }],
      turn: freshTurn(),
      eventQueues,
      taskQueues,
      ingredientQueues,
      eventsDrawn: [],
      discardedEvents: [],
      tasks: [],
      ingredients: ingredients.plan,
      coins: 0,
      coinGoal: COIN_GOAL,
      lastIngredientId: null,
      previousIngredientId: null,
      bonuses: freshBonuses(),
      menu: CHAPTERS.map((chapter) => ({ chapterId: chapter.id, servedAt: null, ingredientIds: [] })),
      history: []
    };

    const engine = new GameEngine(state);
    engine.log('voyageStarted', { players: players.map((player) => player.name) }, now);
    engine.initializeChapter(now);
    return engine;
  }

  snapshot() {
    return clone(this.state);
  }

  get activePlayer() {
    return this.state.players[this.state.activePlayerIndex];
  }

  get currentChapter() {
    return CHAPTERS[this.state.chapterIndex];
  }

  get currentEvent() {
    const event = eventById(this.state.turn.currentEventId);
    return event ? this.contextualizeEvent(event) : null;
  }

  get currentWatchChallenge() {
    const challenge = this.state.turn.watchChallengeId
      ? WATCH_CHALLENGES.find((entry) => entry.id === this.state.turn.watchChallengeId)
      : this.state.turn.watchChallengeIndex == null ? null : WATCH_CHALLENGES[this.state.turn.watchChallengeIndex];
    if (!challenge) return null;
    const target = this.state.players.find((player) => player.id === this.state.turn.watchTargetPlayerId) ?? this.activePlayer;
    const replaceNames = (value) => value
      .replaceAll('{activePlayer}', this.activePlayer.name)
      .replaceAll('{targetPlayer}', target.name);
    return { ...challenge, de: replaceNames(challenge.de), en: replaceNames(challenge.en) };
  }

  get activeGroup() {
    return this.groupForPlayer(this.activePlayer.id);
  }

  groupForPlayer(playerId) {
    return this.state.groups.find((group) => group.playerIds.includes(playerId)) ?? this.state.groups[0];
  }

  get coinProgress() {
    return Math.max(0, Math.min(100, Math.round((this.state.coins / this.state.coinGoal) * 100)));
  }

  initializeChapter(now = Date.now()) {
    if (this.state.chapterIndex !== 0) return false;
    this.courseIngredients().forEach((ingredient) => {
      if (!ingredient.essential || ingredient.status !== 'available') return;
      ingredient.status = 'locked';
      ingredient.lockedAt = now;
      ingredient.lockedBy = 'system';
      this.log('ingredientLocked', { ingredientId: ingredient.id, automatic: true }, now);
    });
    this.state.chapter.stage = 'tasks';
    const firstTask = this.assignTask({ group: this.activeGroup, now });
    if (firstTask) this.briefTask(firstTask, false, now);
    this.log('chapterStageChanged', { chapterIndex: 0, stage: 'tasks', automatic: true }, now);
    return true;
  }

  courseIngredients() {
    return this.state.ingredients.filter((ingredient) => ingredient.chapterIndex === this.state.chapterIndex);
  }

  requiredCourseIngredients() {
    return this.courseIngredients().filter((ingredient) => ingredient.essential);
  }

  courseRule(chapterIndex = this.state.chapterIndex) {
    return COURSE_INGREDIENT_RULES[CHAPTERS[chapterIndex].id];
  }

  ingredientLastCourseIndex(ingredient) {
    return Math.max(...ingredient.courseTags.map((tag) => CHAPTERS.findIndex((chapter) => chapter.id === tag)));
  }

  ingredientAllowedInCurrentCourse(ingredient) {
    if (!ingredient?.courseTags.includes(this.currentChapter.id)) return false;
    const limit = this.courseRule()?.categoryLimits?.[ingredient.category];
    if (limit == null) return true;
    const alreadyChosen = this.courseIngredients().filter((entry) =>
      entry.category === ingredient.category && ['discovered', 'locked'].includes(entry.status)
    ).length;
    return alreadyChosen < limit;
  }

  courseCategoryCount(category, statuses = ['discovered', 'locked', 'used']) {
    return this.courseIngredients().filter((ingredient) =>
      ingredient.category === category && statuses.includes(ingredient.status)
    ).length;
  }

  unmetCourseCategoryMinimums(statuses = ['discovered', 'locked', 'used']) {
    return Object.entries(this.courseRule()?.categoryMinimums ?? {})
      .filter(([category, minimum]) => this.courseCategoryCount(category, statuses) < minimum)
      .map(([category]) => category);
  }

  expiringIngredientCandidates() {
    return this.state.ingredients.filter((ingredient) =>
      ingredient.essential && ingredient.status === 'available' &&
      ingredient.courseTags.includes(this.currentChapter.id) &&
      this.ingredientLastCourseIndex(ingredient) <= this.state.chapterIndex
    );
  }

  futureCourseHasCapacity(chapterIndex, excludingIngredientId = null) {
    const chapter = CHAPTERS[chapterIndex];
    const rule = this.courseRule(chapterIndex);
    if (!chapter || !rule) return true;
    const candidates = this.state.ingredients.filter((ingredient) =>
      ingredient.essential && ingredient.status === 'available' &&
      ingredient.id !== excludingIngredientId && ingredient.courseTags.includes(chapter.id)
    );
    const categories = new Map();
    candidates.forEach((ingredient) => categories.set(ingredient.category, (categories.get(ingredient.category) ?? 0) + 1));
    const capacity = [...categories.entries()].reduce((total, [category, count]) => {
      const limit = rule.categoryLimits?.[category];
      return total + (limit == null ? count : Math.min(count, limit));
    }, 0);
    if (capacity < rule.minimum) return false;
    return Object.entries(rule.categoryMinimums ?? {}).every(([category, minimum]) =>
      (categories.get(category) ?? 0) >= minimum
    );
  }

  preservesFutureCourseCapacity(ingredient) {
    if (!ingredient?.essential) return true;
    for (let chapterIndex = this.state.chapterIndex + 1; chapterIndex < CHAPTERS.length; chapterIndex += 1) {
      if (!this.futureCourseHasCapacity(chapterIndex, ingredient.id)) return false;
    }
    return true;
  }

  courseIngredientCandidates(category = null) {
    const queue = this.state.ingredientQueues[this.state.chapterIndex] ?? [];
    let candidates = queue
      .map((ingredientId) => this.state.ingredients.find((ingredient) => ingredient.id === ingredientId))
      .filter((ingredient) => ingredient?.status === 'available' && this.ingredientAllowedInCurrentCourse(ingredient) &&
        this.preservesFutureCourseCapacity(ingredient) && (!category || ingredient.category === category));
    const plannedEssential = this.requiredCourseIngredients().filter((ingredient) => ['discovered', 'locked'].includes(ingredient.status)).length;
    if (plannedEssential >= this.courseRule().minimum) {
      const expiringIds = new Set(this.expiringIngredientCandidates().map((ingredient) => ingredient.id));
      const unmetCategories = new Set(this.unmetCourseCategoryMinimums());
      candidates = candidates.filter((ingredient) => expiringIds.has(ingredient.id) || unmetCategories.has(ingredient.category));
    }
    return candidates;
  }

  unlockedCourseIngredients() {
    return this.courseIngredients().filter((ingredient) => ingredient.status === 'discovered');
  }

  ingredientsLockedForCourse() {
    const chosen = this.courseIngredients();
    const lockedEssential = chosen.filter((ingredient) => ingredient.essential && ['locked', 'used'].includes(ingredient.status)).length;
    const basketEmpty = chosen.every((ingredient) => ingredient.status !== 'discovered');
    const noRequiredIngredientExpires = this.expiringIngredientCandidates().length === 0;
    const categoryMinimumsMet = this.unmetCourseCategoryMinimums(['locked', 'used']).length === 0;
    return lockedEssential >= this.courseRule().minimum && basketEmpty && noRequiredIngredientExpires && categoryMinimumsMet;
  }

  updateChapterStage(now = Date.now()) {
    const ingredientChoiceInProgress = ['event', 'ingredientChoice', 'effectChoice'].includes(this.state.turn.phase);
    if (this.state.chapter.stage === 'ingredients' && !ingredientChoiceInProgress && this.ingredientsLockedForCourse()) {
      this.state.chapter.stage = 'tasks';
      this.log('chapterStageChanged', { chapterIndex: this.state.chapterIndex, stage: 'tasks' }, now);
      return true;
    }
    if (this.state.chapter.stage === 'tasks' && !this.hasUnassignedCourseTasks()) {
      this.state.chapter.stage = 'cooking';
      this.log('chapterStageChanged', { chapterIndex: this.state.chapterIndex, stage: 'cooking' }, now);
      return true;
    }
    return false;
  }

  taskPrerequisitesMet(card) {
    return (card?.prerequisites ?? []).every((requirement) => {
      const prerequisite = this.state.tasks.find((instance) => {
        if (instance.chapterIndex !== this.state.chapterIndex) return false;
        const prerequisiteCard = this.getTaskCard(instance);
        return prerequisiteCard?.blueprintIndex === requirement.requiredBlueprintIndex;
      });
      if (!prerequisite) return false;
      return requirement.state === 'started'
        ? ['active', 'ready', 'done'].includes(prerequisite.status)
        : prerequisite.status === 'done';
    });
  }

  assignableTaskCards(peopleMode = null) {
    const queue = this.state.taskQueues[this.state.chapterIndex] ?? [];
    const usedBlueprints = new Set(this.state.tasks
      .filter((instance) => instance.chapterIndex === this.state.chapterIndex)
      .map((instance) => this.getTaskCard(instance)?.blueprintIndex)
      .filter(Number.isInteger));
    return queue
      .map((taskId) => taskById(taskId))
      .filter((card) => card?.playable && this.taskPrerequisitesMet(card))
      .filter((card) => !usedBlueprints.has(card.blueprintIndex))
      .filter((card) => peopleMode !== 'team' || card.people[1] > card.people[0])
      .filter((card) => peopleMode !== 'single' || card.people[0] === 1);
  }

  hasUnassignedCourseTasks() {
    return (this.state.taskQueues[this.state.chapterIndex] ?? []).length > 0;
  }

  currentEventStage() {
    if (this.state.chapter.stage === 'ingredients') return 'ingredients';
    if (this.assignableTaskCards().length) return 'tasks';
    return 'cooking';
  }

  eventQueue(stage = this.currentEventStage(), group = this.activeGroup) {
    return this.state.eventQueues[this.state.chapterIndex]?.[stage]?.[group.locationIndex] ?? [];
  }

  actionAvailable(actionCode) {
    switch (actionCode) {
      case 'discoverIngredient':
      case 'treasureAndIngredient': return this.currentEventStage() === 'ingredients' && this.courseIngredientCandidates().length > 0;
      case 'lockIngredient': return this.currentEventStage() === 'ingredients' && this.unlockedCourseIngredients().length > 0;
      case 'swapIngredient': {
        const ingredient = this.state.ingredients.find((entry) => entry.id === this.state.lastIngredientId && entry.status === 'discovered')
          ?? this.unlockedCourseIngredients().at(-1);
        return Boolean(ingredient && this.courseIngredientCandidates(ingredient.category).length);
      }
      case 'drawTask':
      case 'treasureAndTask': return this.currentEventStage() === 'tasks' && this.assignableTaskCards().length > 0;
      case 'singleTask': return this.currentEventStage() === 'tasks' && this.assignableTaskCards('single').length > 0;
      case 'teamTask': return this.currentEventStage() === 'tasks' && this.assignableTaskCards('team').length > 0;
      case 'watchChallenge':
      case 'watchChallengeAlt':
      case 'treasureAndWatch':
      case 'storyMoment':
      case 'fiveMinuteBreak': return this.currentEventStage() === 'cooking';
      case 'splitCrew': return this.currentEventStage() === 'cooking' && !this.hasUnassignedCourseTasks() && this.state.groups.length === 1;
      case 'treasure':
      case 'coinLoss':
      case 'chain':
      case 'treasureAndChain': return true;
      default: return false;
    }
  }

  fallbackActions(stage = this.currentEventStage()) {
    const candidates = stage === 'ingredients'
      ? ['discoverIngredient', 'lockIngredient', 'swapIngredient', 'treasureAndIngredient']
      : stage === 'tasks'
        ? ['drawTask', 'teamTask', 'singleTask', 'treasureAndTask']
        : ['watchChallenge', 'watchChallengeAlt', 'treasure', 'treasureAndWatch'];
    return candidates.filter((action) => this.actionAvailable(action));
  }

  contextualizeEvent(event) {
    const fallbacks = this.fallbackActions(event.stage);
    if (event.type === 'choice') {
      const options = [...new Set((event.options ?? []).filter((action) => this.actionAvailable(action)))];
      return { ...event, options: options.length ? options : fallbacks.slice(0, 2) };
    }
    const outcomes = (event.outcomes ?? []).map((action, index) =>
      this.actionAvailable(action) ? action : fallbacks[index % Math.max(1, fallbacks.length)]
    ).filter(Boolean);
    while (outcomes.length < 3 && fallbacks.length) outcomes.push(fallbacks[outcomes.length % fallbacks.length]);
    return { ...event, outcomes };
  }

  taskForAction(actionCode) {
    const mode = actionCode === 'teamTask' ? 'team' : actionCode === 'singleTask' ? 'single' : null;
    return this.assignableTaskCards(mode)[0] ?? this.assignableTaskCards()[0] ?? null;
  }

  watchChallengeForAction(actionCode, event = this.currentEvent) {
    const offset = actionCode === 'watchChallengeAlt' ? 1 : 0;
    const base = (this.state.chapter.watchChallenges + (event?.locationIndex ?? 0) * 2) % WATCH_CHALLENGES.length;
    return WATCH_CHALLENGES[(base + offset) % WATCH_CHALLENGES.length];
  }

  log(type, data = {}, timestamp = Date.now()) {
    this.state.history.push({ timestamp, type, data: clone(data) });
    if (this.state.history.length > MAX_HISTORY_ITEMS) {
      this.state.history.splice(0, this.state.history.length - MAX_HISTORY_ITEMS);
    }
    this.state.updatedAt = timestamp;
  }

  isPassiveEnabled(player = this.activePlayer) {
    return !player.passiveDisabledThroughTurn || player.turns >= player.passiveDisabledThroughTurn;
  }

  passiveUnused(player, key) {
    return this.isPassiveEnabled(player) && !player.passiveUsedByChapter[key];
  }

  ingredientCandidates(category = null) {
    const queue = this.state.ingredientQueues[this.state.chapterIndex] ?? [];
    return queue
      .map((ingredientId) => this.state.ingredients.find((ingredient) => ingredient.id === ingredientId))
      .filter((ingredient) => ingredient?.status === 'available' && this.ingredientAllowedInCurrentCourse(ingredient) && (!category || ingredient.category === category));
  }

  ingredientCategoriesWithAtLeast(count = 1) {
    const categories = new Map();
    this.courseIngredientCandidates().forEach((ingredient) => categories.set(ingredient.category, (categories.get(ingredient.category) ?? 0) + 1));
    return [...categories.entries()].filter(([, total]) => total >= count).map(([category]) => category);
  }

  shuffleIngredientCategory(category) {
    const queue = this.state.ingredientQueues[this.state.chapterIndex];
    const positions = queue.map((ingredientId, index) => ({ ingredientId, index }))
      .filter(({ ingredientId }) => {
        const ingredient = this.state.ingredients.find((entry) => entry.id === ingredientId);
        return ingredient?.status === 'available' && ingredient.category === category;
      });
    if (positions.length < 2) return false;
    const shuffled = shuffle(positions.map(({ ingredientId }) => ingredientId), this.state.rngState);
    this.state.rngState = shuffled.state;
    positions.forEach(({ index }, positionIndex) => { queue[index] = shuffled.value[positionIndex]; });
    return true;
  }

  swapTopIngredientCards(category) {
    const queue = this.state.ingredientQueues[this.state.chapterIndex];
    const positions = queue.map((ingredientId, index) => ({ ingredientId, index }))
      .filter(({ ingredientId }) => {
        const ingredient = this.state.ingredients.find((entry) => entry.id === ingredientId);
        return ingredient?.status === 'available' && ingredient.category === category;
      });
    if (positions.length < 2) return false;
    const first = positions[0].index;
    const second = positions[1].index;
    [queue[first], queue[second]] = [queue[second], queue[first]];
    return true;
  }

  nextEventPreview() {
    const scout = this.activePlayer.roleId === 'scout' && this.isPassiveEnabled(this.activePlayer);
    if ((!scout && this.state.bonuses.revealNextEvent <= 0) || this.state.turn.phase !== 'draw') return null;
    const queue = this.eventQueue();
    const event = eventById(queue[0]);
    return event ? this.contextualizeEvent(event) : null;
  }

  beginEvent(now = Date.now()) {
    if (this.state.status !== 'active' || this.state.turn.phase !== 'draw') return null;
    const group = this.activeGroup;
    this.evaluateChapter(now);
    if (this.state.turn.phase === 'chapterReady') return null;
    const stage = this.currentEventStage();
    const stageQueues = this.state.eventQueues[this.state.chapterIndex][stage];
    const preferredQueue = this.eventQueue(stage, group);
    const appropriate = (eventId) => {
      const candidate = eventById(eventId);
      return !(stage === 'cooking' && this.hasUnassignedCourseTasks() && candidate?.archetype === 'watch');
    };
    let queue = preferredQueue;
    let eventIndex = queue.findIndex(appropriate);
    if (eventIndex < 0) {
      queue = stageQueues.find((locationQueue) => locationQueue.some(appropriate)) ?? preferredQueue;
      eventIndex = queue.findIndex(appropriate);
    }
    if (eventIndex < 0) {
      if (stage === 'ingredients') {
        if (this.unlockedCourseIngredients().length) {
          this.lockLastIngredient(now);
          this.state.turn.outcomeCode = 'lockIngredient';
          this.state.turn.phase = 'resolved';
          this.log('fallbackIngredientLocked', { ingredientId: this.state.lastIngredientId }, now);
          return { fallback: true, action: 'lockIngredient' };
        }
        if (this.courseIngredientCandidates().length && this.prepareIngredientChoice(null, 'event', {}, now)) {
          this.log('fallbackIngredientChoice', {}, now);
          return { fallback: true, action: 'discoverIngredient' };
        }
      }
      if (stage === 'tasks' && this.assignableTaskCards().length) {
        const task = this.assignTask({ group, now });
        this.briefTask(task, true, now);
        this.log('fallbackTaskAssigned', { instanceId: task.instanceId }, now);
        return task;
      }
      this.startWatchChallenge('watchChallenge', now, { fallback: true });
      return this.currentWatchChallenge;
    }
    const eventId = queue.splice(eventIndex, 1)[0];
    this.state.turn.currentEventId = eventId;
    this.state.turn.phase = 'event';
    this.state.eventsDrawn.push(eventId);
    this.log('eventDrawn', { eventId, stage, playerId: this.activePlayer.id, groupId: group.id }, now);

    if (this.state.bonuses.revealNextEvent > 0) this.state.bonuses.revealNextEvent -= 1;

    if (this.state.bonuses.replaceNextEvent > 0) {
      this.state.bonuses.replaceNextEvent -= 1;
      if (this.state.eventsDrawn.at(-1) === eventId) this.state.eventsDrawn.pop();
      queue.push(eventId);
      this.log('eventReplacedByIngredient', { eventId }, now);
      this.state.turn.currentEventId = null;
      this.state.turn.phase = 'draw';
      return this.beginEvent(now);
    }

    if (this.state.bonuses.ignoreNextEvent > 0) {
      this.state.bonuses.ignoreNextEvent -= 1;
      this.state.turn.outcomeCode = 'ignored';
      this.state.turn.phase = 'resolved';
      this.log('eventIgnoredByBonus', { eventId }, now);
      this.markEventResolved(this.currentEvent, now);
    }
    return this.currentEvent;
  }

  completeWatchChallenge(now = Date.now()) {
    if (this.state.turn.phase !== 'watch' || !this.currentWatchChallenge) return false;
    const challenge = this.currentWatchChallenge;
    this.state.chapter.watchChallenges += 1;
    if (challenge.coins) this.addCoins(challenge.coins, 'challenge', now);
    if (challenge.followUpId) {
      this.state.chapter.queuedChallenges.push({ id: challenge.followUpId, targetPlayerId: this.activePlayer.id });
    }
    this.state.turn.outcomeCode = 'watchComplete';
    this.state.turn.phase = 'resolved';
    this.log('watchChallengeCompleted', { challengeId: challenge.id, coins: challenge.coins }, now);
    if (this.currentEvent) this.markEventResolved(this.currentEvent, now);
    return true;
  }

  resolveChoice(actionCode, now = Date.now()) {
    const event = this.currentEvent;
    if (!event || event.type !== 'choice' || this.state.turn.phase !== 'event') return false;
    if (!actionCode && event.options.length === 0) {
      this.state.turn.outcomeCode = 'storyMoment';
      this.state.turn.phase = 'resolved';
      this.markEventResolved(event, now);
      return true;
    }
    if (!event.options.includes(actionCode)) {
      throw new Error(`Choice is not available on this event: ${String(actionCode)} for ${event.id} (${event.stage}).`);
    }
    const needsChoice = this.applyAction(actionCode, now, 'event');
    this.state.turn.outcomeCode = actionCode;
    if (!needsChoice) {
      this.state.turn.phase = 'resolved';
      this.markEventResolved(event, now);
      this.updateChapterStage(now);
    }
    return true;
  }

  rollDie(now = Date.now()) {
    const event = this.currentEvent;
    if (!event || event.type !== 'dice' || this.state.turn.phase !== 'event') return null;
    const roll = randomInt(this.state.rngState, 1, 6);
    this.state.rngState = roll.state;
    this.state.turn.dieResult = roll.value;
    this.state.turn.phase = 'rolled';
    this.log('dieRolled', { value: roll.value, eventId: event.id, playerId: this.activePlayer.id }, now);
    return roll.value;
  }

  rerollDie(now = Date.now()) {
    if (this.state.turn.phase !== 'rolled') return null;
    const key = `smith-reroll-${this.state.chapterIndex}`;
    const player = this.activePlayer;
    if (player.roleId !== 'smith' || !this.passiveUnused(player, key)) return null;
    player.passiveUsedByChapter[key] = true;
    const roll = randomInt(this.state.rngState, 1, 6);
    this.state.rngState = roll.state;
    this.state.turn.dieResult = roll.value;
    this.log('dieRerolled', { value: roll.value, playerId: player.id }, now);
    return roll.value;
  }

  rerollDieWithIngredient(now = Date.now()) {
    if (this.state.turn.phase !== 'rolled' || this.state.bonuses.rerollNext <= 0) return null;
    this.state.bonuses.rerollNext -= 1;
    const roll = randomInt(this.state.rngState, 1, 6);
    this.state.rngState = roll.state;
    this.state.turn.dieResult = roll.value;
    this.log('dieRerolledByIngredient', { value: roll.value, playerId: this.activePlayer.id }, now);
    return roll.value;
  }

  adjustDieWithIngredient(amount, now = Date.now()) {
    if (this.state.turn.phase !== 'rolled' || this.state.bonuses.adjustNext <= 0 || ![-1, 1].includes(Number(amount))) return false;
    this.state.bonuses.adjustNext -= 1;
    this.state.turn.dieResult = Math.max(1, Math.min(6, this.state.turn.dieResult + Number(amount)));
    this.log('dieAdjustedByIngredient', { amount: Number(amount), value: this.state.turn.dieResult }, now);
    return true;
  }

  confirmRoll(now = Date.now()) {
    const event = this.currentEvent;
    if (!event || event.type !== 'dice' || this.state.turn.phase !== 'rolled') return false;
    let value = this.state.turn.dieResult;
    if (this.state.bonuses.doubleNextDie > 0) {
      value = Math.min(6, value * (2 ** this.state.bonuses.doubleNextDie));
      this.state.bonuses.doubleNextDie = 0;
      this.state.turn.dieResult = value;
    }
    const outcomeIndex = value <= 2 ? 0 : value <= 4 ? 1 : 2;
    const actionCode = event.outcomes[outcomeIndex] ?? this.fallbackActions(event.stage)[0];
    if (!actionCode) {
      this.state.turn.outcomeCode = 'storyMoment';
      this.state.turn.phase = 'resolved';
      this.markEventResolved(event, now);
      return true;
    }
    const needsChoice = this.applyAction(actionCode, now, 'event');
    this.state.turn.outcomeCode = actionCode;
    if (!needsChoice) {
      this.state.turn.phase = 'resolved';
      this.markEventResolved(event, now);
      this.updateChapterStage(now);
    }
    return true;
  }

  markEventResolved(event, now) {
    this.state.chapter.eventsResolved += 1;
    this.log('eventResolved', {
      eventId: event.id,
      outcomeCode: this.state.turn.outcomeCode,
      dieResult: this.state.turn.dieResult
    }, now);
  }

  applyAction(actionCode, now = Date.now(), context = 'event') {
    let taskInstance = null;
    switch (actionCode) {
      case 'drawTask': taskInstance = this.assignTask({ group: this.activeGroup, now }); break;
      case 'singleTask': taskInstance = this.assignTask({ group: this.activeGroup, peopleMode: 'single', now }); break;
      case 'teamTask': taskInstance = this.assignTask({ group: this.activeGroup, peopleMode: 'team', now }); break;
      case 'discoverIngredient': return this.prepareIngredientChoice(null, context, {}, now);
      case 'treasureAndIngredient':
        this.addCoins(COIN_VALUES.event, 'event', now);
        return this.prepareIngredientChoice(null, context, {}, now);
      case 'lockIngredient': this.lockLastIngredient(now); break;
      case 'treasure': this.addCoins(COIN_VALUES.event, 'event', now); break;
      case 'coinLoss': this.addCoins(-3, 'event', now); break;
      case 'storyMoment': break;
      case 'fiveMinuteBreak': this.startWatchChallenge('fiveMinuteBreak', now); return true;
      case 'treasureAndChain':
        this.addCoins(COIN_VALUES.event, 'event', now);
        if (this.state.turn.chainDepth < 1) this.state.turn.chainPending = true;
        break;
      case 'treasureAndTask':
        this.addCoins(COIN_VALUES.event, 'event', now);
        taskInstance = this.assignTask({ group: this.activeGroup, now });
        break;
      case 'watchChallenge':
      case 'watchChallengeAlt': this.startWatchChallenge(actionCode, now); return true;
      case 'treasureAndWatch':
        this.addCoins(COIN_VALUES.event, 'event', now);
        this.startWatchChallenge('watchChallenge', now);
        return true;
      case 'chain':
        if (this.state.turn.chainDepth < 1) this.state.turn.chainPending = true;
        else this.addCoins(COIN_VALUES.event, 'event', now);
        break;
      case 'splitCrew': this.splitCrew(now); break;
      case 'swapIngredient': this.swapLastIngredient(now); break;
      default: throw new Error(`Unknown action: ${actionCode}`);
    }
    if (taskInstance) {
      this.briefTask(taskInstance, true, now);
      return true;
    }
    return false;
  }

  startWatchChallenge(actionCode = 'watchChallenge', now = Date.now(), logData = {}) {
    const event = this.currentEvent;
    let challenge;
    let targetPlayerId = this.state.players[(this.state.activePlayerIndex + 1) % this.state.players.length].id;
    if (actionCode === 'fiveMinuteBreak') {
      challenge = WATCH_CHALLENGES.find((entry) => entry.id === 'five-minute-break');
    } else if (this.state.chapter.queuedChallenges.length) {
      const queued = this.state.chapter.queuedChallenges.shift();
      challenge = WATCH_CHALLENGES.find((entry) => entry.id === queued.id);
      targetPlayerId = queued.targetPlayerId;
    } else {
      const roundKey = String(this.state.chapter.round);
      const used = new Set(this.state.chapter.challengeIdsByRound[roundKey] ?? []);
      const pool = WATCH_CHALLENGES.filter((entry) => entry.id !== 'stop-chicken' && entry.id !== 'five-minute-break' && !used.has(entry.id));
      const candidates = pool.length ? pool : WATCH_CHALLENGES.filter((entry) => entry.id !== 'stop-chicken' && entry.id !== 'five-minute-break');
      const offset = actionCode === 'watchChallengeAlt' ? 1 : 0;
      const index = (this.state.chapter.watchChallenges + (event?.locationIndex ?? 0) * 2 + offset) % candidates.length;
      challenge = candidates[index];
      this.state.chapter.challengeIdsByRound[roundKey] = [...used, challenge.id];
    }
    this.state.turn.watchChallengeId = challenge.id;
    this.state.turn.watchChallengeIndex = WATCH_CHALLENGES.findIndex((entry) => entry.id === challenge.id);
    this.state.turn.watchTargetPlayerId = targetPlayerId;
    this.state.turn.watchStartedAt = now;
    this.state.turn.watchEndsAt = now + challenge.minutes * 60_000;
    this.state.turn.phase = 'watch';
    this.log('watchChallengeStarted', { challengeId: challenge.id, playerId: this.activePlayer.id, eventId: event?.id ?? null, ...logData }, now);
    return true;
  }

  addCoins(amount = 1, source = 'event', now = Date.now()) {
    const before = this.state.coins;
    this.state.coins = Math.min(this.state.coinGoal, before + amount);
    const applied = this.state.coins - before;
    this.state.chapter.coinsEarned += applied;
    this.log('coinsChanged', { amount: applied, requestedAmount: amount, source, total: this.state.coins }, now);
    return applied;
  }

  addTreasure(amount = 1, now = Date.now()) {
    return this.addCoins(amount * COIN_VALUES.event, 'event', now);
  }

  prepareIngredientChoice(category = null, context = 'event', options = {}, now = Date.now()) {
    // Abilities draw from the same composition-aware pool as events. This keeps
    // a role from bypassing course limits or consuming ingredients needed later.
    const available = this.courseIngredientCandidates(category);
    const randomized = shuffle(available, this.state.rngState);
    this.state.rngState = randomized.state;
    const candidates = randomized.value;
    if (!candidates.length) return false;

    if (!this.state.turn.ingredientFlow) {
      this.state.turn.ingredientFlow = {
        context,
        previousPhase: this.state.turn.phase,
        eventId: this.currentEvent?.id ?? null,
        drawQueue: [],
        replaceCurrentEvent: false
      };
      this.state.turn.pendingContext = context;
      this.state.turn.previousPhase = this.state.turn.phase;
    }

    let count = options.all ? candidates.length : Math.max(2, Number(options.count) || 2);
    const player = this.activePlayer;
    if (player.roleId === 'merchant' && this.isPassiveEnabled(player)) count = Math.max(count, 2);
    if (this.state.bonuses.replaceNextIngredient > 0) {
      this.state.bonuses.replaceNextIngredient -= 1;
      count += 1;
      this.log('ingredientReplacementOffered', { category }, now);
    }

    this.state.turn.pendingIngredientIds = candidates.slice(0, count).map((ingredient) => ingredient.id);
    this.state.turn.pendingEffect = null;
    this.state.turn.phase = 'ingredientChoice';
    return true;
  }

  queueIngredientDraw(category = null, options = {}) {
    if (!this.state.turn.ingredientFlow) return false;
    this.state.turn.ingredientFlow.drawQueue.push({ category, all: Boolean(options.all), count: options.count ?? 1 });
    return true;
  }

  canCookIgnoreIngredientEffect(ingredientId = null) {
    const player = this.activePlayer;
    const key = `cook-ignore-${this.state.chapterIndex}`;
    const ingredient = ingredientId ? this.getIngredient(ingredientId) : null;
    return player.roleId === 'cook' && this.passiveUnused(player, key) && (!ingredient || Boolean(ingredient.effect));
  }

  chooseIngredient(ingredientId, now = Date.now(), ignoreEffect = false) {
    if (this.state.turn.phase !== 'ingredientChoice' || !this.state.turn.pendingIngredientIds.includes(ingredientId)) {
      return false;
    }
    const ingredient = this.state.ingredients.find((entry) => entry.id === ingredientId);
    if (!ingredient || ingredient.status !== 'available') return false;
    if (ignoreEffect && !this.canCookIgnoreIngredientEffect(ingredientId)) return false;

    const previousIngredientId = this.state.lastIngredientId;
    ingredient.status = 'discovered';
    ingredient.chapterIndex = this.state.chapterIndex;
    ingredient.basketCourseIndex = this.state.chapterIndex;
    ingredient.discoveredAt = now;
    ingredient.discoveredBy = this.activePlayer.id;
    this.state.previousIngredientId = previousIngredientId;
    this.state.lastIngredientId = ingredient.id;
    this.state.turn.pendingIngredientIds = [];
    this.log('ingredientDiscovered', { ingredientId, chapterIndex: this.state.chapterIndex }, now);

    if (ignoreEffect) {
      const key = `cook-ignore-${this.state.chapterIndex}`;
      this.activePlayer.passiveUsedByChapter[key] = true;
      this.log('ingredientEffectIgnoredByCook', { ingredientId }, now);
    } else if (ingredient.effect && this.state.bonuses.ignoreNextIngredientEffect > 0) {
      this.state.bonuses.ignoreNextIngredientEffect -= 1;
      this.log('ingredientEffectIgnoredByBonus', { ingredientId }, now);
    } else if (ingredient.effect) {
      let times = 1;
      if (this.state.bonuses.repeatNextIngredientEffect > 0 && ingredient.effect !== 'repeatNextIngredient') {
        this.state.bonuses.repeatNextIngredientEffect -= 1;
        times = 2;
      }
      this.applyIngredientEffect(ingredient, now, { times, previousIngredientId });
    }

    this.continueIngredientFlow(now);
    return true;
  }

  applyIngredientEffect(ingredient, now = Date.now(), { times = 1, previousIngredientId = this.state.previousIngredientId } = {}) {
    if (!ingredient?.effect) return false;
    this.log('ingredientEffectApplied', { ingredientId: ingredient.id, effect: ingredient.effect, times }, now);
    switch (ingredient.effect) {
      case 'doubleDie': this.state.bonuses.doubleNextDie += times; break;
      case 'rerollDie': this.state.bonuses.rerollNext += times; break;
      case 'adjustDie': this.state.bonuses.adjustNext += times; break;
      case 'ignoreEvent': this.state.bonuses.ignoreNextEvent += times; break;
      case 'ignoreIngredient': this.state.bonuses.ignoreNextIngredientEffect += times; break;
      case 'repeatNextIngredient': this.state.bonuses.repeatNextIngredientEffect += times; break;
      case 'replaceIngredient': this.state.bonuses.replaceNextIngredient += times; break;
      case 'revealEvent': this.state.bonuses.revealNextEvent += times; break;
      case 'chain': this.state.turn.chainPending = true; break;
      case 'extraTurn': this.state.turn.chainPending = true; break;
      case 'nextPlayer': this.state.bonuses.revealNextEvent += times; break;
      case 'drawIngredient':
        for (let index = 0; index < times; index += 1) this.queueIngredientDraw();
        break;
      case 'drawVegetable':
        for (let index = 0; index < times; index += 1) this.queueIngredientDraw('vegetable');
        break;
      case 'reserveIngredient':
        for (let index = 0; index < times; index += 1) this.queueIngredientDraw(null, { all: true });
        break;
      case 'shuffleVegetables':
        for (let index = 0; index < times; index += 1) this.shuffleIngredientCategory('vegetable');
        break;
      case 'swapTopCards': {
        const categories = this.ingredientCategoriesWithAtLeast(2);
        if (categories.length) {
          this.state.turn.pendingEffect = { code: 'swapTopCards', options: categories };
          this.state.turn.phase = 'effectChoice';
        }
        break;
      }
      case 'disablePassive':
        this.state.turn.pendingEffect = { code: 'disablePassive', options: this.state.players.map((player) => player.id) };
        this.state.turn.phase = 'effectChoice';
        break;
      case 'replaceEvent':
        if (this.state.turn.ingredientFlow?.context === 'event' && this.currentEvent) this.state.turn.ingredientFlow.replaceCurrentEvent = true;
        else this.state.bonuses.replaceNextEvent += times;
        break;
      case 'shuffleEvents': {
        const queue = this.eventQueue(this.currentEvent?.stage ?? this.currentEventStage());
        for (let index = 0; index < times; index += 1) {
          const shuffled = shuffle(queue, this.state.rngState);
          this.state.rngState = shuffled.state;
          queue.splice(0, queue.length, ...shuffled.value);
        }
        break;
      }
      case 'repeatIngredient': {
        const previous = this.state.ingredients.find((entry) => entry.id === previousIngredientId);
        if (previous?.effect && previous.effect !== 'repeatIngredient') this.applyIngredientEffect(previous, now, { times });
        break;
      }
      default: return false;
    }
    return true;
  }

  resolveIngredientEffectChoice(option, now = Date.now()) {
    const pending = this.state.turn.pendingEffect;
    if (this.state.turn.phase !== 'effectChoice' || !pending?.options.includes(option)) return false;
    if (pending.code === 'disablePassive') {
      const player = this.state.players.find((candidate) => candidate.id === option);
      if (!player) return false;
      player.passiveDisabledThroughTurn = player.turns + 1;
      this.log('passiveDisabled', { playerId: player.id, throughTurn: player.passiveDisabledThroughTurn }, now);
    } else if (pending.code === 'swapTopCards') {
      this.swapTopIngredientCards(option);
      this.log('ingredientTopCardsSwapped', { category: option }, now);
    } else return false;
    this.state.turn.pendingEffect = null;
    this.state.turn.phase = 'ingredientChoice';
    this.continueIngredientFlow(now);
    return true;
  }

  continueIngredientFlow(now = Date.now()) {
    const flow = this.state.turn.ingredientFlow;
    if (!flow || this.state.turn.phase === 'effectChoice') return false;

    if (flow.replaceCurrentEvent && flow.context === 'event' && this.currentEvent) {
      const eventId = this.currentEvent.id;
      const queue = this.eventQueue(this.currentEvent.stage);
      if (this.state.eventsDrawn.at(-1) === eventId) this.state.eventsDrawn.pop();
      queue.push(eventId);
      const chainDepth = this.state.turn.chainDepth;
      this.log('eventReplacedByIngredient', { eventId }, now);
      this.state.turn = { ...freshTurn(), chainDepth };
      this.beginEvent(now);
      return true;
    }

    while (flow.drawQueue.length) {
      const request = flow.drawQueue.shift();
      if (this.prepareIngredientChoice(request.category, flow.context, request, now)) return true;
    }

    const event = flow.eventId ? eventById(flow.eventId) : null;
    const context = flow.context;
    const previousPhase = flow.previousPhase;
    this.state.turn.ingredientFlow = null;
    this.state.turn.pendingContext = null;
    this.state.turn.previousPhase = null;
    this.state.turn.pendingEffect = null;
    this.state.turn.pendingIngredientIds = [];
    if (context === 'event') {
      this.state.turn.phase = 'resolved';
      if (event) this.markEventResolved(event, now);
    } else {
      this.state.turn.phase = previousPhase ?? 'draw';
    }
    this.updateChapterStage(now);
    return true;
  }

  swapLastIngredient(now = Date.now()) {
    const previous = this.state.ingredients.find((entry) => entry.id === this.state.lastIngredientId && entry.status === 'discovered')
      ?? this.unlockedCourseIngredients().at(-1);
    if (!previous) return false;
    const alternatives = this.swapIngredientAlternatives(previous);
    if (!alternatives.length) return false;
    const selected = alternatives[0];
    previous.status = 'available';
    previous.chapterIndex = null;
    previous.basketCourseIndex = null;
    delete previous.discoveredAt;
    delete previous.discoveredBy;
    selected.status = 'discovered';
    selected.chapterIndex = this.state.chapterIndex;
    selected.basketCourseIndex = this.state.chapterIndex;
    selected.discoveredAt = now;
    selected.discoveredBy = this.activePlayer.id;
    this.state.lastIngredientId = selected.id;
    this.log('ingredientSwapped', { from: previous.id, to: selected.id }, now);
    return true;
  }

  lockLastIngredient(now = Date.now()) {
    const ingredient = this.state.ingredients.find((entry) => entry.id === this.state.lastIngredientId && entry.status === 'discovered')
      ?? [...this.unlockedCourseIngredients()].sort((a, b) => (b.discoveredAt ?? 0) - (a.discoveredAt ?? 0))[0];
    if (!ingredient) return false;
    ingredient.status = 'locked';
    ingredient.basketCourseIndex = null;
    ingredient.lockedAt = now;
    ingredient.lockedBy = this.activePlayer.id;
    this.state.lastIngredientId = ingredient.id;
    this.log('ingredientLocked', { ingredientId: ingredient.id, playerId: this.activePlayer.id }, now);
    this.updateChapterStage(now);
    return true;
  }

  removeIngredientFromBasket(ingredientId, now = Date.now()) {
    const ingredient = this.state.ingredients.find((entry) =>
      entry.id === ingredientId && entry.chapterIndex === this.state.chapterIndex && entry.status === 'discovered'
    );
    if (!ingredient || this.state.chapter.stage !== 'ingredients') return false;
    ingredient.status = 'available';
    ingredient.chapterIndex = null;
    ingredient.basketCourseIndex = null;
    delete ingredient.discoveredAt;
    delete ingredient.discoveredBy;
    if (this.state.lastIngredientId === ingredient.id) this.state.lastIngredientId = null;
    this.log('ingredientReturned', { ingredientId }, now);
    this.updateChapterStage(now);
    return true;
  }

  lockIngredientFromBasket(ingredientId, now = Date.now()) {
    const ingredient = this.state.ingredients.find((entry) =>
      entry.id === ingredientId && entry.chapterIndex === this.state.chapterIndex && entry.status === 'discovered'
    );
    if (!ingredient || this.state.chapter.stage !== 'ingredients') return false;
    this.state.lastIngredientId = ingredient.id;
    return this.lockLastIngredient(now);
  }

  ingredientCategoriesForTask(card) {
    const mapping = {
      vegetables: ['vegetable'], fruit: ['fruit'], protein: ['meat'], dressing: ['pantry'],
      seasoning: ['vegetable', 'pantry'], garnish: ['pantry', 'dessert'],
      hotplate: ['vegetable', 'pantry'], blender: ['vegetable', 'pantry'],
      oven: this.state.chapterIndex === 3 ? ['vegetable', 'meat', 'fruit', 'pantry'] : [],
      assembly: ['vegetable', 'fruit', 'dessert', 'pantry'], cold: ['dessert', 'fruit', 'drinks'],
      alcoholic: ['alcohol', 'drinks', 'fruit'], 'alcohol-free': ['drinks', 'fruit'],
      mixing: ['fruit', 'drinks'], sauce: ['fruit', 'pantry'], quality: [],
      'cold-prep': [], serving: [], cleanup: [], safety: []
    };
    return mapping[card.area] ?? [];
  }

  reserveTaskBasket(card, instanceId) {
    const explicit = new Set(card.ingredientTags ?? []);
    const categories = new Set(this.ingredientCategoriesForTask(card));
    const finalServing = card.area === 'serving' && (card.prerequisites?.length ?? 0) > 0;
    const candidates = this.courseIngredients().filter((ingredient) => {
      if (!['locked', 'used'].includes(ingredient.status)) return false;
      return explicit.has(ingredient.id) || finalServing || (!explicit.size && categories.has(ingredient.category));
    });
    return candidates.map((ingredient) => ingredient.id);
  }

  assignTask({ card = null, group = this.activeGroup, coreKey = null, peopleMode = null, now = Date.now() } = {}) {
    let selected = card;
    if (!selected) {
      const queue = this.state.taskQueues[this.state.chapterIndex];
      selected = this.assignableTaskCards(peopleMode)[0] ?? this.assignableTaskCards()[0] ?? null;
      if (selected) queue.splice(queue.indexOf(selected.id), 1);
    }
    if (!selected) return null;

    const minimumPeople = peopleMode === 'team'
      ? Math.min(selected.people[1], selected.people[0] + 1)
      : selected.people[0];
    const candidates = group.playerIds
      .map((playerId) => this.state.players.find((player) => player.id === playerId))
      .sort((a, b) => {
        const activeA = this.state.tasks.filter((entry) => entry.assignedPlayerIds.includes(a.id) && ['queued', 'active', 'ready'].includes(entry.status)).length;
        const activeB = this.state.tasks.filter((entry) => entry.assignedPlayerIds.includes(b.id) && ['queued', 'active', 'ready'].includes(entry.status)).length;
        return activeA - activeB || a.taskMarkers - b.taskMarkers || a.id.localeCompare(b.id);
      });
    const assignedPlayerIds = candidates.slice(0, Math.min(minimumPeople, candidates.length)).map((player) => player.id);
    const instance = {
      instanceId: createId('task'),
      taskId: selected.id,
      chapterIndex: this.state.chapterIndex,
      locationIndex: group.locationIndex,
      groupId: group.id,
      coreKey,
      assignedPlayerIds,
      status: 'queued',
      assignedAt: now,
      startedAt: null,
      endAt: null,
      readyAt: null,
      completedAt: null,
      challengeMinutes: selected.timerMinutes || selected.estimatedMinutes,
      challengeEndsAt: null,
      coinDelta: null,
      challengeResult: null,
      alertsSent: [],
      basketIngredientIds: []
    };
    instance.basketIngredientIds = this.reserveTaskBasket(selected, instance.instanceId);
    this.state.tasks.push(instance);
    this.log('taskAssigned', { taskId: selected.id, instanceId: instance.instanceId, assignedPlayerIds, basketIngredientIds: instance.basketIngredientIds }, now);
    this.updateChapterStage(now);
    return instance;
  }

  briefTask(instance, endsTurn = true, now = Date.now()) {
    if (!instance || instance.status !== 'queued') return false;
    this.state.turn.assignedTaskId = instance.instanceId;
    this.state.turn.taskBriefingEndsTurn = Boolean(endsTurn);
    this.state.turn.phase = 'taskBriefing';
    this.log('taskBriefingShown', { instanceId: instance.instanceId, endsTurn: Boolean(endsTurn) }, now);
    return true;
  }

  acceptTaskBriefing(now = Date.now()) {
    if (this.state.turn.phase !== 'taskBriefing' || !this.state.turn.assignedTaskId) return false;
    const instanceId = this.state.turn.assignedTaskId;
    const endsTurn = this.state.turn.taskBriefingEndsTurn;
    if (!this.startTask(instanceId, now)) return false;
    this.state.turn.resolvedTaskId = instanceId;
    this.state.turn.assignedTaskId = null;
    if (endsTurn) {
      const event = this.currentEvent;
      this.state.turn.phase = 'resolved';
      if (event) this.markEventResolved(event, now);
    } else {
      this.state.turn = freshTurn();
    }
    return true;
  }

  startTask(instanceId, now = Date.now()) {
    const instance = this.state.tasks.find((taskInstance) => taskInstance.instanceId === instanceId);
    if (!instance || instance.status !== 'queued') return false;
    const card = taskById(instance.taskId);
    instance.status = 'active';
    instance.startedAt = now;
    instance.challengeMinutes = card.timerMinutes || card.estimatedMinutes;
    instance.challengeEndsAt = now + instance.challengeMinutes * 60_000;
    instance.endAt = instance.challengeEndsAt;
    this.log('taskStarted', { instanceId, taskId: card.id, challengeMinutes: instance.challengeMinutes }, now);
    return true;
  }

  completeTask(instanceId, now = Date.now()) {
    const instance = this.state.tasks.find((taskInstance) => taskInstance.instanceId === instanceId);
    if (!instance || !['queued', 'active', 'ready'].includes(instance.status)) return false;
    const completesCurrentBriefing = this.state.turn.phase === 'taskBriefing' && this.state.turn.assignedTaskId === instanceId;
    const briefingEndsTurn = this.state.turn.taskBriefingEndsTurn;
    const briefingEvent = completesCurrentBriefing ? this.currentEvent : null;
    const card = taskById(instance.taskId);
    if (instance.status === 'queued') {
      instance.startedAt = instance.assignedAt;
      instance.challengeMinutes = card.timerMinutes || card.estimatedMinutes;
      instance.challengeEndsAt = instance.startedAt + instance.challengeMinutes * 60_000;
      instance.endAt = instance.challengeEndsAt;
    }
    const targetMs = Math.max(60_000, (instance.challengeMinutes || card.estimatedMinutes || 1) * 60_000);
    const elapsedMs = Math.max(0, now - (instance.startedAt ?? instance.assignedAt));
    let coinDelta;
    let challengeResult;
    if (elapsedMs <= targetMs / 2) {
      coinDelta = COIN_VALUES.veryFastTask;
      challengeResult = 'veryFast';
    } else if (elapsedMs <= targetMs) {
      coinDelta = COIN_VALUES.onTimeTask;
      challengeResult = 'onTime';
    } else if (elapsedMs <= targetMs * 1.5) {
      coinDelta = COIN_VALUES.lateTask;
      challengeResult = 'late';
    } else {
      coinDelta = COIN_VALUES.veryLateTask;
      challengeResult = 'veryLate';
    }
    instance.status = 'done';
    instance.completedAt = now;
    instance.challengeCoinValue = coinDelta;
    instance.challengeResult = challengeResult;
    instance.assignedPlayerIds.forEach((playerId) => {
      const player = this.state.players.find((candidate) => candidate.id === playerId);
      if (player) player.taskMarkers += 1;
    });
    instance.coinDelta = this.addCoins(coinDelta, 'task', now);
    this.log('taskCompleted', { instanceId, taskId: card.id, assignedPlayerIds: instance.assignedPlayerIds, coinDelta: instance.coinDelta, challengeCoinValue: coinDelta, challengeResult }, now);
    if (completesCurrentBriefing) {
      this.state.turn.resolvedTaskId = instanceId;
      this.state.turn.assignedTaskId = null;
      if (briefingEndsTurn) {
        this.state.turn.phase = 'resolved';
        if (briefingEvent) this.markEventResolved(briefingEvent, now);
      } else {
        this.state.turn = freshTurn();
      }
    }
    this.evaluateChapter(now);
    return true;
  }

  undoTaskCompletion(instanceId, now = Date.now()) {
    const instance = this.state.tasks.find((taskInstance) => taskInstance.instanceId === instanceId);
    if (!instance || instance.status !== 'done' || instance.chapterIndex !== this.state.chapterIndex || this.state.chapter.served) return false;
    if (instance.coinDelta) this.addCoins(-instance.coinDelta, 'taskUndo', now);
    instance.assignedPlayerIds.forEach((playerId) => {
      const player = this.state.players.find((candidate) => candidate.id === playerId);
      if (player) player.taskMarkers = Math.max(0, player.taskMarkers - 1);
    });
    instance.status = instance.challengeEndsAt && now >= instance.challengeEndsAt ? 'ready' : 'active';
    instance.completedAt = null;
    instance.coinDelta = null;
    instance.challengeCoinValue = null;
    instance.challengeResult = null;
    this.log('taskCompletionUndone', { instanceId, taskId: instance.taskId }, now);
    this.evaluateChapter(now);
    return true;
  }

  splitCrew(now = Date.now()) {
    if (this.state.groups.length > 1 || this.state.players.length < 6) {
      this.addTreasure(1, now);
      return false;
    }
    const current = this.state.groups[0];
    const groups = [
      { id: 'A', playerIds: [], locationIndex: current.locationIndex, locationProgress: current.locationProgress, completedLocations: [...current.completedLocations], finished: current.finished },
      { id: 'B', playerIds: [], locationIndex: current.locationIndex, locationProgress: current.locationProgress, completedLocations: [...current.completedLocations], finished: current.finished }
    ];
    current.playerIds.forEach((playerId, index) => groups[index % 2].playerIds.push(playerId));
    this.state.groups = groups;
    this.state.chapter.splitTargetLocation = Math.min(5, current.locationIndex + 2);
    this.log('crewSplit', { groups: groups.map((group) => group.playerIds), target: this.state.chapter.splitTargetLocation }, now);
    return true;
  }

  maybeReunite(now = Date.now()) {
    if (this.state.groups.length < 2 || this.state.chapter.splitTargetLocation == null) return false;
    if (!this.state.groups.every((group) => group.locationIndex >= this.state.chapter.splitTargetLocation || group.finished)) return false;
    const locationIndex = Math.min(...this.state.groups.map((group) => group.locationIndex));
    const completedLocations = this.state.groups
      .map((group) => new Set(group.completedLocations))
      .reduce((common, set) => new Set([...common].filter((location) => set.has(location))));
    this.state.groups = [{
      id: 'A',
      playerIds: this.state.players.map((player) => player.id),
      locationIndex,
      locationProgress: 0,
      completedLocations: [...completedLocations],
      finished: this.state.groups.every((group) => group.finished)
    }];
    this.state.chapter.splitTargetLocation = null;
    this.log('crewReunited', { locationIndex }, now);
    return true;
  }

  locationGoal(group) {
    return Math.max(1, Math.ceil(group.playerIds.length / 2));
  }

  maybeAdvanceGroup(group, now = Date.now()) {
    if (group.finished) return false;
    const goalReached = group.locationProgress >= this.locationGoal(group);
    if (!goalReached) return false;

    if (!group.completedLocations.includes(group.locationIndex)) group.completedLocations.push(group.locationIndex);
    const previousLocation = group.locationIndex;
    group.locationProgress = 0;
    if (group.locationIndex < this.currentChapter.locations.length - 1) group.locationIndex += 1;
    else group.finished = true;
    this.log('locationCompleted', { groupId: group.id, locationIndex: previousLocation, nextLocation: group.locationIndex }, now);
    this.maybeReunite(now);
    return true;
  }

  endTurn(now = Date.now()) {
    if (this.state.turn.phase !== 'resolved') return false;
    if (this.state.turn.chainPending) {
      this.state.turn = {
        ...freshTurn(),
        chainDepth: this.state.turn.chainDepth + 1,
        activeAbilityUsed: this.state.turn.activeAbilityUsed
      };
      this.log('eventChainContinued', { playerId: this.activePlayer.id }, now);
      return 'chain';
    }

    const player = this.activePlayer;
    const group = this.activeGroup;
    group.locationProgress += 1;
    player.turns += 1;
    this.state.chapter.turnsByPlayer[player.id] += 1;
    this.maybeAdvanceGroup(group, now);

    const previousIndex = this.state.activePlayerIndex;
    this.state.activePlayerIndex = (this.state.activePlayerIndex + 1) % this.state.players.length;
    if (this.state.activePlayerIndex <= previousIndex) this.state.chapter.round += 1;
    this.state.turn = freshTurn();
    this.log('turnEnded', { playerId: player.id, nextPlayerId: this.activePlayer.id }, now);
    this.evaluateChapter(now);
    return true;
  }

  evaluateChapter(now = Date.now()) {
    const chapterTasks = this.state.tasks.filter((taskInstance) => taskInstance.chapterIndex === this.state.chapterIndex);
    const allWorkComplete = !this.hasUnassignedCourseTasks() && chapterTasks.length > 0 && chapterTasks.every((taskInstance) => taskInstance.status === 'done');
    const allGroupsFinished = this.state.groups.every((group) => group.finished);
    const ingredientsReady = this.ingredientsLockedForCourse() || this.state.chapterIndex === 0;
    const ready = ingredientsReady && allWorkComplete && allGroupsFinished;
    const wasReady = this.state.chapter.readyToServe;
    this.state.chapter.readyToServe = ready;
    if (ready && this.state.turn.phase === 'draw') this.state.turn.phase = 'chapterReady';
    if (ready && !wasReady) this.log('chapterReady', { chapterIndex: this.state.chapterIndex }, now);
    if (!ready && this.state.turn.phase === 'chapterReady') this.state.turn.phase = 'draw';
    return { ingredientsReady, allWorkComplete, allGroupsFinished, ready };
  }

  serveCourse(now = Date.now()) {
    if (!this.state.chapter.readyToServe || this.state.turn.phase !== 'chapterReady') return false;
    if (this.state.chapterIndex === CHAPTERS.length - 1) {
      const unassignedEssential = this.state.ingredients.filter((ingredient) =>
        ingredient.essential && ingredient.status !== 'used' && ingredient.chapterIndex !== this.state.chapterIndex
      );
      if (unassignedEssential.length) return false;
    }
    const ingredientIds = [];
    this.state.ingredients.forEach((ingredient) => {
      if (ingredient.chapterIndex !== this.state.chapterIndex) return;
      if (ingredient.essential) {
        ingredient.status = 'used';
        ingredientIds.push(ingredient.id);
      } else if (['discovered', 'locked', 'used'].includes(ingredient.status)) {
        ingredient.status = 'used';
        ingredientIds.push(ingredient.id);
      }
    });
    this.state.menu[this.state.chapterIndex] = {
      chapterId: this.currentChapter.id,
      servedAt: now,
      ingredientIds
    };
    this.state.chapter.served = true;
    this.log('courseServed', { chapterIndex: this.state.chapterIndex, ingredientIds }, now);

    if (this.state.chapterIndex === CHAPTERS.length - 1) {
      this.state.status = 'completed';
      this.state.completedAt = now;
      this.state.turn.phase = 'complete';
      this.log('voyageCompleted', { durationMinutes: Math.round((now - this.state.startedAt) / 60_000) }, now);
    } else {
      this.state.turn.phase = 'eating';
    }
    return true;
  }

  secureTreasurerIngredient(now = Date.now()) {
    if (this.state.chapterIndex !== 3) return false;
    const treasurer = this.state.players.find((player) => player.roleId === 'treasurer');
    const key = `treasurer-secure-${this.state.chapterIndex}`;
    if (!treasurer || !this.passiveUnused(treasurer, key)) return false;
    const ingredient = this.ingredientCandidates()[0];
    if (!ingredient) return false;
    ingredient.status = 'discovered';
    ingredient.chapterIndex = this.state.chapterIndex;
    ingredient.basketCourseIndex = this.state.chapterIndex;
    ingredient.discoveredAt = now;
    ingredient.discoveredBy = treasurer.id;
    treasurer.passiveUsedByChapter[key] = true;
    this.state.previousIngredientId = this.state.lastIngredientId;
    this.state.lastIngredientId = ingredient.id;
    this.log('ingredientSecuredByTreasurer', { ingredientId: ingredient.id, playerId: treasurer.id }, now);
    return true;
  }

  startNextChapter(now = Date.now()) {
    if (this.state.turn.phase !== 'eating' || this.state.chapterIndex >= CHAPTERS.length - 1) return false;
    this.state.chapterIndex += 1;
    this.state.chapter = chapterState(this.state.players.map((player) => player.id), this.state.chapterIndex);
    this.state.groups = [{
      id: 'A',
      playerIds: this.state.players.map((player) => player.id),
      locationIndex: 0,
      locationProgress: 0,
      completedLocations: [],
      finished: false
    }];
    this.state.turn = freshTurn();
    this.state.lastIngredientId = null;
    this.state.previousIngredientId = null;
    this.state.bonuses = freshBonuses();
    this.log('chapterStarted', { chapterIndex: this.state.chapterIndex, stage: this.state.chapter.stage }, now);
    return true;
  }

  swapIngredientAlternatives(previous = null) {
    const ingredient = previous
      ?? this.state.ingredients.find((entry) => entry.id === this.state.lastIngredientId && entry.status === 'discovered')
      ?? this.unlockedCourseIngredients().at(-1);
    if (!ingredient) return [];
    // A mandatory ingredient on its final possible course may not be returned
    // to the global pool: there would be no later course left to consume it.
    if (ingredient.essential && this.ingredientLastCourseIndex(ingredient) <= this.state.chapterIndex) return [];
    return this.state.ingredients.filter((entry) =>
      entry.status === 'available' &&
      entry.essential === ingredient.essential &&
      entry.category === ingredient.category &&
      entry.courseTags.includes(this.currentChapter.id)
    );
  }

  activeAbilityAvailable(option = null) {
    const player = this.activePlayer;
    const role = getRole(player?.roleId);
    if (!role || player.activeUsesRemaining <= 0 || this.state.turn.activeAbilityUsed) return false;
    const phase = this.state.turn.phase;
    const stableIngredientPhase = this.state.chapter.stage === 'ingredients' &&
      ['draw', 'event'].includes(phase) && !this.state.turn.ingredientFlow;
    const category = { chooseVegetable: 'vegetable', chooseMeat: 'meat', chooseFruit: 'fruit' }[role.activeCode] ?? null;
    const lastIngredient = this.state.ingredients.find((entry) =>
      entry.id === this.state.lastIngredientId && entry.chapterIndex === this.state.chapterIndex && entry.status === 'discovered'
    );

    switch (role.activeCode) {
      case 'replaceEvent':
      case 'shuffleEvents': return Boolean(this.currentEvent) && ['event', 'rolled'].includes(phase);
      case 'adjustDie': return phase === 'rolled' && (option == null || [-1, 1].includes(Number(option)));
      case 'chooseVegetable':
      case 'chooseMeat':
      case 'chooseFruit': return stableIngredientPhase && this.courseIngredientCandidates(category).length > 0;
      case 'chooseIngredient':
      case 'reserveIngredient': return stableIngredientPhase && this.courseIngredientCandidates().length > 0;
      case 'swapIngredient': return stableIngredientPhase && this.swapIngredientAlternatives(lastIngredient).length > 0;
      case 'repeatIngredient': return stableIngredientPhase && Boolean(lastIngredient?.effect);
      default: return false;
    }
  }

  useActiveAbility(option = null, now = Date.now()) {
    const player = this.activePlayer;
    const role = getRole(player.roleId);
    if (!role || !this.activeAbilityAvailable(option)) return false;
    let used = true;

    switch (role.activeCode) {
      case 'replaceEvent':
        if (!this.currentEvent || !['event', 'rolled'].includes(this.state.turn.phase)) return false;
        this.state.discardedEvents.push(this.currentEvent.id);
        this.state.turn = freshTurn();
        this.beginEvent(now);
        break;
      case 'shuffleEvents': {
        if (!this.currentEvent || !['event', 'rolled'].includes(this.state.turn.phase)) return false;
        const queue = this.eventQueue(this.currentEvent.stage);
        queue.unshift(this.currentEvent.id);
        const shuffled = shuffle(queue, this.state.rngState);
        this.state.rngState = shuffled.state;
        queue.splice(0, queue.length, ...shuffled.value);
        this.state.turn = freshTurn();
        this.beginEvent(now);
        break;
      }
      case 'adjustDie':
        if (this.state.turn.phase !== 'rolled' || ![-1, 1].includes(Number(option))) return false;
        this.state.turn.dieResult = Math.max(1, Math.min(6, this.state.turn.dieResult + Number(option)));
        break;
      case 'chooseVegetable': used = this.prepareIngredientChoice('vegetable', 'ability', { count: 2 }, now); break;
      case 'chooseMeat': used = this.prepareIngredientChoice('meat', 'ability', { count: 2 }, now); break;
      case 'chooseFruit': used = this.prepareIngredientChoice('fruit', 'ability', { count: 2 }, now); break;
      case 'chooseIngredient': used = this.prepareIngredientChoice(null, 'ability', { count: 2 }, now); break;
      case 'reserveIngredient': used = this.prepareIngredientChoice(null, 'ability', { all: true }, now); break;
      case 'swapIngredient': used = this.swapLastIngredient(now); break;
      case 'repeatIngredient': {
        const ingredient = this.state.ingredients.find((entry) => entry.id === this.state.lastIngredientId);
        if (!ingredient) return false;
        this.state.turn.ingredientFlow = {
          context: 'ability', previousPhase: this.state.turn.phase, eventId: this.currentEvent?.id ?? null,
          drawQueue: [], replaceCurrentEvent: false
        };
        this.state.turn.pendingContext = 'ability';
        this.state.turn.previousPhase = this.state.turn.phase;
        this.applyIngredientEffect(ingredient, now, { previousIngredientId: this.state.previousIngredientId });
        this.continueIngredientFlow(now);
        break;
      }
      default: used = false;
    }

    if (!used) return false;
    player.activeUsesRemaining -= 1;
    this.state.turn.activeAbilityUsed = true;
    this.log('activeAbilityUsed', { playerId: player.id, roleId: role.id, activeCode: role.activeCode }, now);
    return true;
  }

  useCategoryRolePassive(now = Date.now()) {
    const player = this.activePlayer;
    const category = { herbalist: 'vegetable', hunter: 'meat', gatherer: 'fruit' }[player.roleId];
    if (!category || this.state.chapter.stage !== 'ingredients' || !['draw', 'event'].includes(this.state.turn.phase)) return false;
    const key = `${player.roleId}-draw-${this.state.chapterIndex}`;
    if (!this.passiveUnused(player, key) || !this.courseIngredientCandidates(category).length) return false;
    if (!this.prepareIngredientChoice(category, 'ability', { count: 1 }, now)) return false;
    player.passiveUsedByChapter[key] = true;
    this.log('categoryRolePassiveUsed', { playerId: player.id, category }, now);
    return true;
  }

  ignoreEventWithTactician(now = Date.now()) {
    const player = this.activePlayer;
    const key = `tactician-ignore-${this.state.chapterIndex}`;
    if (player.roleId !== 'tactician' || !this.passiveUnused(player, key) || this.state.turn.phase !== 'event') return false;
    player.passiveUsedByChapter[key] = true;
    this.state.turn.outcomeCode = 'ignored';
    this.state.turn.phase = 'resolved';
    this.markEventResolved(this.currentEvent, now);
    this.log('eventIgnoredByTactician', { playerId: player.id }, now);
    return true;
  }

  useAlchemistPassive(now = Date.now()) {
    const player = this.activePlayer;
    const key = `alchemist-swap-${this.state.chapterIndex}`;
    if (player.roleId !== 'alchemist' || this.state.chapter.stage !== 'ingredients' ||
      !['draw', 'event'].includes(this.state.turn.phase) || this.state.turn.ingredientFlow || !this.passiveUnused(player, key)) return false;
    if (!this.swapLastIngredient(now)) return false;
    player.passiveUsedByChapter[key] = true;
    this.log('alchemistPassiveUsed', { playerId: player.id, ingredientId: this.state.lastIngredientId }, now);
    return true;
  }

  changePlayerLanguage(playerId, language, now = Date.now()) {
    const player = this.state.players.find((candidate) => candidate.id === playerId);
    if (!player || !['de', 'en'].includes(language)) return false;
    player.language = language;
    this.log('playerLanguageChanged', { playerId, language }, now);
    return true;
  }

  setOptionalIngredientUsed(ingredientId, used, now = Date.now()) {
    const ingredient = this.state.ingredients.find((entry) => entry.id === ingredientId && !entry.essential);
    if (!ingredient) return false;
    ingredient.status = used ? 'used' : 'available';
    if (!used) ingredient.chapterIndex = null;
    this.log('optionalIngredientChanged', { ingredientId, used: Boolean(used) }, now);
    return true;
  }

  getTaskCard(instance) {
    return taskById(instance.taskId);
  }

  getIngredient(ingredientId) {
    return this.state.ingredients.find((entry) => entry.id === ingredientId) ?? INGREDIENTS.find((entry) => entry.id === ingredientId);
  }
}

export function validateSessionState(state) {
  const errors = [];
  if (state.version !== STATE_VERSION) errors.push('state version');
  if (!Array.isArray(state.players) || state.players.length < 6 || state.players.length > 10) errors.push('player count');
  if (!Number.isInteger(state.chapterIndex) || state.chapterIndex < 0 || state.chapterIndex >= CHAPTERS.length) errors.push('chapter index');
  if (!Array.isArray(state.ingredients) || state.ingredients.length !== INGREDIENTS.length) errors.push('ingredient plan');
  if (!Array.isArray(state.ingredientQueues) || state.ingredientQueues.length !== CHAPTERS.length) errors.push('ingredient queues');
  if (!Array.isArray(state.eventQueues) || state.eventQueues.length !== CHAPTERS.length) errors.push('event queues');
  if (!Array.isArray(state.taskQueues) || state.taskQueues.length !== CHAPTERS.length) errors.push('task queues');
  if (!Array.isArray(state.history)) errors.push('history');
  return { valid: errors.length === 0, errors };
}
