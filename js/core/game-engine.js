import { APP_VERSION, COIN_GOAL, COIN_VALUES, MAX_HISTORY_ITEMS, PLAYER_LIMITS, STATE_VERSION } from '../config.js';
import { createId, randomInt, shuffle } from './random.js';
import { CHAPTERS, EXPECTED_SESSION_MINUTES } from '../data/chapters.js';
import { EVENT_DECKS, EVENT_STAGES, WATCH_CHALLENGES } from '../data/events.js';
import { COURSE_INGREDIENT_RULES, INGREDIENTS, SHOPPING_STAPLES, buildIngredientPlan } from '../data/ingredients.js';
import { ROLES, getRole } from '../data/roles.js';
import { MANDATORY_STORY_CARDS, STORY_QUIZ_CARDS, islandStoryCard, locationStoryCard, storyCardById, storyLocationKey } from '../data/story-events.js';
import { TASK_DECKS, getPlayableQuestLines } from '../data/tasks.js';

const clone = (value) => typeof structuredClone === 'function'
  ? structuredClone(value)
  : JSON.parse(JSON.stringify(value));

const TASK_ASSIGNEE_CHOICE_INTERVAL = 3;
const MAX_INGREDIENTS_PER_TURN = 2;
const DEFAULT_FUN_CARDS_PER_CHAPTER = 16;
const MAIN_FUN_CARDS_PER_CHAPTER = 24;
const MAX_EVENT_CHAIN_DEPTH = 2;
const RETIRED_INGREDIENT_IDS = new Set(['yoghurt', 'broth', 'herbs', 'vinegar', 'ice-cubes', 'fruit-dates', 'juices']);
const CURRENT_INGREDIENTS_BY_ID = new Map(INGREDIENTS.map((ingredient) => [ingredient.id, ingredient]));
const CURRENT_INGREDIENT_IDS = new Set(CURRENT_INGREDIENTS_BY_ID.keys());
const CURRENT_SHOPPING_STAPLE_IDS = new Set(SHOPPING_STAPLES.map((staple) => staple.id));
const STORED_INGREDIENT_EFFECTS = Object.freeze({
  doubleDie: { bonus: 'doubleNextDie', trigger: 'dice' },
  rerollDie: { bonus: 'rerollNext', trigger: 'dice' },
  adjustDie: { bonus: 'adjustNext', trigger: 'dice' },
  ignoreEvent: { bonus: 'ignoreNextEvent', trigger: 'event' },
  revealEvent: { bonus: 'revealNextEvent', trigger: 'event' },
  nextPlayer: { bonus: 'forceNextPlayer', trigger: 'event' },
  replaceEvent: { bonus: 'replaceNextEvent', trigger: 'event' },
  ignoreIngredient: { bonus: 'ignoreNextIngredientEffect', trigger: 'ingredient' },
  repeatNextIngredient: { bonus: 'repeatNextIngredientEffect', trigger: 'ingredient' },
  replaceIngredient: { bonus: 'replaceNextIngredient', trigger: 'ingredient' }
});
const LEGACY_STORED_EFFECT_ORDER = Object.freeze([
  'doubleDie', 'rerollDie', 'adjustDie', 'ignoreEvent', 'revealEvent', 'replaceEvent',
  'ignoreIngredient', 'repeatNextIngredient', 'replaceIngredient'
]);

function normalizedCustomName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function normalizedLocalizedName(value) {
  if (typeof value === 'string') {
    const name = normalizedCustomName(value);
    return name ? { de: name, en: name } : null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const de = normalizedCustomName(value.de);
  const en = normalizedCustomName(value.en);
  if (!de && !en) return null;
  return { de: de || en, en: en || de };
}

function sanitizedNameMap(source, allowedIds) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
  return Object.fromEntries(Object.entries(source)
    .filter(([id]) => allowedIds.has(id))
    .map(([id, name]) => [id, normalizedLocalizedName(name)])
    .filter(([, name]) => Boolean(name)));
}

function supportedIngredientPlan(ingredients) {
  if (!Array.isArray(ingredients)) return false;
  const ids = ingredients.map((ingredient) => ingredient?.id);
  const uniqueIds = new Set(ids);
  return uniqueIds.size === ids.length &&
    INGREDIENTS.every((ingredient) => uniqueIds.has(ingredient.id)) &&
    ids.every((id) => CURRENT_INGREDIENT_IDS.has(id) || RETIRED_INGREDIENT_IDS.has(id));
}

function chapterState(playerIds, chapterIndex = 0) {
  return {
    round: 1,
    coinsEarned: 0,
    eventsResolved: 0,
    turnsByPlayer: Object.fromEntries(playerIds.map((id) => [id, 0])),
    readyToServe: false,
    served: false,
    watchChallenges: 0,
    challengeIdsByRound: {},
    queuedChallenges: [],
    scheduledChallenges: [],
    funCardIdsDrawn: [],
    storyQuizIdsDrawn: [],
    nextStoryQuizAt: 4,
    portionCaptainPlayerId: null,
    soupReady: false,
    cauldronWatchIntervals: 0,
    cauldronPreviousPlayerIds: [],
    cocktailTeamSelectionPlayerIds: [],
    cocktailTeamSelectionIndex: 0,
    cocktailTechniques: { alcoholic: null, 'alcohol-free': null },
    cocktailSpiritTarget: null,
    autoLockedIngredientIds: [],
    courseStyle: chapterIndex === 1 ? null : 'not-required',
    stage: chapterIndex === 0 ? 'tasks' : 'clearing'
  };
}

function freshTurn() {
  return {
    phase: 'draw',
    currentEventId: null,
    dieResult: null,
    chainPending: false,
    chainDepth: 0,
    eventChoiceSignature: null,
    previousEventChoiceSignature: null,
    eventSignature: null,
    previousEventSignature: null,
    previousEventId: null,
    chainEventIds: [],
    chainEventSignatures: [],
    chainEventChoiceSignatures: [],
    pendingIngredientIds: [],
    pendingContext: null,
    previousPhase: null,
    ingredientFlow: null,
    pendingEffect: null,
    outcomeCode: null,
    watchChallengeIndex: null,
    watchChallengeId: null,
    watchTargetPlayerId: null,
    watchPartnerPlayerIds: [],
    pendingCocktailTeam: null,
    courseDecisionType: null,
    watchSecretRevealedAt: null,
    watchStartedAt: null,
    watchEndsAt: null,
    watchOutcome: null,
    watchCoinDelta: null,
    watchCoinApplied: null,
    pendingTaskAssignment: null,
    assignedTaskId: null,
    resolvedTaskId: null,
    resolvedIngredientId: null,
    resolvedIngredientIds: [],
    ingredientActionTargetId: null,
    resolvedIngredientEffect: null,
    resolvedIngredientEffectMode: null,
    resolvedPreviousIngredientId: null,
    ingredientEffectConsumedForChoice: false,
    taskBriefingEndsTurn: true,
    activeAbilityUsed: false,
    gamblerLossRoll: null,
    gamblerAbilityRoll: null,
    gamblerAbilityCoinDelta: null,
    storyAnswerId: null,
    storyAnswerCorrect: null,
    storyCoinDelta: null,
    coinChangeRequested: null,
    coinChangeModified: null,
    coinChangeApplied: null,
    ingredientsAddedThisTurn: 0,
    tasksAssignedThisTurn: 0
  };
}

function continuedTurnContext(turn, rememberCurrentEvent = true) {
  const currentEventId = rememberCurrentEvent ? turn.currentEventId : null;
  const currentEventSignature = rememberCurrentEvent ? turn.eventSignature : null;
  const currentChoiceSignature = rememberCurrentEvent ? turn.eventChoiceSignature : null;
  return {
    chainDepth: turn.chainDepth,
    previousEventId: currentEventId ?? turn.previousEventId,
    previousEventSignature: currentEventSignature ?? turn.previousEventSignature,
    previousEventChoiceSignature: currentChoiceSignature ?? turn.previousEventChoiceSignature,
    chainEventIds: [...new Set([...(turn.chainEventIds ?? []), currentEventId].filter(Boolean))],
    chainEventSignatures: [...new Set([...(turn.chainEventSignatures ?? []), currentEventSignature].filter(Boolean))],
    chainEventChoiceSignatures: [...new Set([...(turn.chainEventChoiceSignatures ?? []), currentChoiceSignature].filter(Boolean))],
    activeAbilityUsed: turn.activeAbilityUsed,
    ingredientsAddedThisTurn: turn.ingredientsAddedThisTurn,
    tasksAssignedThisTurn: turn.tasksAssignedThisTurn
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

function reconcileEventQueues(chapterIndex, chapterQueues, drawnEventIds = []) {
  const result = Array.isArray(chapterQueues)
    ? stageEventQueues(chapterIndex, chapterQueues)
    : Object.fromEntries(EVENT_STAGES.map((stage) => [stage,
      CHAPTERS[chapterIndex].locations.map((_, locationIndex) =>
        [...(chapterQueues?.[stage]?.[locationIndex] ?? [])]
      )
    ]));
  const drawn = new Set(drawnEventIds);
  const queued = new Set();
  EVENT_STAGES.forEach((stage) => {
    result[stage].forEach((queue, locationIndex) => {
      result[stage][locationIndex] = queue.filter((eventId) => {
        const event = eventById(eventId);
        if (!event || event.chapterId !== CHAPTERS[chapterIndex].id || event.stage !== stage ||
          event.locationIndex !== locationIndex || drawn.has(eventId) || queued.has(eventId)) return false;
        queued.add(eventId);
        return true;
      });
    });
  });
  EVENT_DECKS[chapterIndex].forEach((event) => {
    if (queued.has(event.id) || drawn.has(event.id)) return;
    result[event.stage][event.locationIndex].unshift(event.id);
    queued.add(event.id);
  });
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
  const storyCard = storyCardById(id);
  if (storyCard) return storyCard;
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
    this.state.ingredients = this.state.ingredients.filter((ingredient) => !RETIRED_INGREDIENT_IDS.has(ingredient.id));
    const refreshedIngredients = buildIngredientPlan(this.state.rngState || 1, this.state.players.length).plan;
    refreshedIngredients.forEach((ingredient) => {
      if (!this.state.ingredients.some((entry) => entry.id === ingredient.id)) this.state.ingredients.push(ingredient);
    });
    const staleSoupCucumber = this.state.ingredients.find((ingredient) =>
      ingredient.id === 'cucumber' && ingredient.chapterIndex === 1 && ingredient.status === 'discovered'
    );
    if (staleSoupCucumber) {
      staleSoupCucumber.chapterIndex = null;
      staleSoupCucumber.status = 'available';
      staleSoupCucumber.basketCourseIndex = null;
      staleSoupCucumber.basketTaskId = null;
    }
    this.state.ingredients.forEach((ingredient) => {
      const current = CURRENT_INGREDIENTS_BY_ID.get(ingredient.id);
      if (current) {
        ingredient.courseTags = [...current.courseTags];
        const customName = normalizedLocalizedName(ingredient.customName);
        if (customName) {
          ingredient.customName = customName;
          ingredient.name = clone(customName);
        } else {
          delete ingredient.customName;
          ingredient.name = clone(current.name);
        }
      }
    });
    this.state.shoppingStapleNames = sanitizedNameMap(this.state.shoppingStapleNames, CURRENT_SHOPPING_STAPLE_IDS);
    this.state.ingredientQueues = this.state.ingredientQueues.map((queue, chapterIndex) => {
      const chapterId = CHAPTERS[chapterIndex].id;
      const retained = queue.filter((ingredientId) => {
        const ingredient = CURRENT_INGREDIENTS_BY_ID.get(ingredientId);
        return ingredient?.courseTags.includes(chapterId);
      });
      const missing = this.state.ingredients
        .filter((ingredient) => ingredient.courseTags.includes(chapterId) && !retained.includes(ingredient.id))
        .map((ingredient) => ingredient.id);
      return [...retained, ...missing];
    });
    const retiredTaskInstanceIds = new Set(this.state.tasks
      .filter((taskInstance) => !taskById(taskInstance.taskId))
      .map((taskInstance) => taskInstance.instanceId));
    this.state.tasks = this.state.tasks.filter((taskInstance) => !retiredTaskInstanceIds.has(taskInstance.instanceId));
    if (retiredTaskInstanceIds.has(this.state.turn.assignedTaskId)) {
      this.state.turn.assignedTaskId = null;
      this.state.turn.taskBriefingEndsTurn = false;
      if (this.state.turn.phase === 'taskBriefing') this.state.turn.phase = 'draw';
    }
    if (this.state.turn.pendingTaskAssignment && !taskById(this.state.turn.pendingTaskAssignment.taskId)) {
      this.state.turn.pendingTaskAssignment = null;
      if (this.state.turn.phase === 'taskAssigneeChoice') this.state.turn.phase = 'draw';
    }
    this.state.tasks.forEach((task) => {
      task.basketIngredientIds = (task.basketIngredientIds ?? []).filter((ingredientId) =>
        !RETIRED_INGREDIENT_IDS.has(ingredientId) && !(staleSoupCucumber && ingredientId === 'cucumber')
      );
      const card = taskById(task.taskId);
      if (card && task.status !== 'done') {
        task.taskAbilityAdjustments ??= [];
        task.timingMode = card.timingMode ?? 'challenge';
        const taskTimeAdjustment = task.taskAbilityAdjustments.reduce((total, adjustment) => total + (Number(adjustment.timeMinutes) || 0), 0);
        task.challengeMinutes = task.timingMode === 'challenge' && card.challengeMinutes > 0
          ? Math.max(1, card.challengeMinutes + taskTimeAdjustment)
          : card.challengeMinutes ?? 0;
        task.backgroundMinutes = card.backgroundMinutes ?? 0;
        const timerMinutes = task.timingMode === 'background'
          ? task.backgroundMinutes
          : task.timingMode === 'challenge' ? task.challengeMinutes : 0;
        if (task.startedAt && ['active', 'ready'].includes(task.status)) {
          task.challengeEndsAt = timerMinutes > 0 ? task.startedAt + timerMinutes * 60_000 : null;
          task.endAt = task.challengeEndsAt;
          if (!task.endAt && task.status === 'ready') task.status = 'active';
        }
      }
    });
    this.state.menu.forEach((course) => {
      course.ingredientIds = course.ingredientIds.filter((ingredientId) => !RETIRED_INGREDIENT_IDS.has(ingredientId));
      if (course.chapterId === 'cocktails') course.cocktailTechniques ??= { alcoholic: null, 'alcohol-free': null };
    });
    const currentCourseId = CHAPTERS[this.state.chapterIndex].id;
    this.state.turn.pendingIngredientIds = this.state.turn.pendingIngredientIds.filter((ingredientId) => {
      const ingredient = CURRENT_INGREDIENTS_BY_ID.get(ingredientId);
      return ingredient && ingredient.courseTags.includes(currentCourseId);
    });
    if (RETIRED_INGREDIENT_IDS.has(this.state.lastIngredientId)) this.state.lastIngredientId = null;
    if (RETIRED_INGREDIENT_IDS.has(this.state.previousIngredientId)) this.state.previousIngredientId = null;
    if (this.state.turn.phase === 'ingredientChoice' && this.state.turn.pendingIngredientIds.length === 0) {
      this.state.turn.phase = 'draw';
      this.state.turn.pendingContext = null;
      this.state.turn.ingredientFlow = null;
    }
    this.state.chapter.stage ??= this.state.chapterIndex === 0 ? 'tasks' : 'ingredients';
    this.state.eventQueues = this.state.eventQueues.map((chapterQueues, chapterIndex) =>
      reconcileEventQueues(chapterIndex, chapterQueues, this.state.eventsDrawn ?? [])
    );
    this.state.taskQueues = this.state.taskQueues.map((queue, chapterIndex) => {
      const playable = new Set(TASK_DECKS[chapterIndex].filter((card) => card.playable).map((card) => card.id));
      return [...new Set(queue.filter((taskId) => playable.has(taskId)))];
    });
    this.state.ingredients.forEach((ingredient) => {
      ingredient.basketTaskId ??= null;
      ingredient.basketCourseIndex ??= ingredient.status === 'discovered' ? ingredient.chapterIndex : null;
    });
    this.state.coins ??= this.state.chapter?.treasure ?? 0;
    this.state.coinGoal = COIN_GOAL;
    this.state.chapter.coinsEarned ??= this.state.chapter.treasure ?? 0;
    this.state.chapter.challengeIdsByRound ??= {};
    this.state.chapter.queuedChallenges ??= [];
    this.state.chapter.scheduledChallenges ??= [];
    this.state.chapter.funCardIdsDrawn ??= [];
    this.state.chapter.storyQuizIdsDrawn ??= [];
    this.state.chapter.nextStoryQuizAt ??= 4;
    this.state.chapter.portionCaptainPlayerId ??= null;
    this.state.chapter.soupReady ??= false;
    this.state.chapter.cauldronWatchIntervals ??= 0;
    this.state.chapter.cauldronPreviousPlayerIds ??= [];
    this.state.chapter.cocktailTeamSelectionPlayerIds ??= [];
    this.state.chapter.cocktailTeamSelectionIndex ??= 0;
    this.state.chapter.cocktailTechniques ??= { alcoholic: null, 'alcohol-free': null };
    if (!Number.isInteger(this.state.chapter.cocktailSpiritTarget) && currentCourseId === 'cocktails') {
      const fixedSpiritCount = this.state.ingredients.filter((ingredient) =>
        ingredient.chapterIndex === this.state.chapterIndex && ingredient.category === 'alcohol' && ['locked', 'used'].includes(ingredient.status)
      ).length;
      this.state.chapter.cocktailSpiritTarget = fixedSpiritCount ? Math.min(3, fixedSpiritCount) : null;
    } else this.state.chapter.cocktailSpiritTarget ??= null;
    this.state.chapter.autoLockedIngredientIds ??= [];
    this.state.chapter.courseStyle ??= this.state.chapterIndex === 1 ? null : 'not-required';
    if (this.state.chapter.stage === 'ingredients') {
      this.autoLockExpiringIngredients(this.state.updatedAt ?? Date.now());
    }
    for (let chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex += 1) {
      this.reconcileTaskQueue(chapterIndex);
    }
    this.state.activeChallenges ??= [];
    this.state.funCardsDrawn ??= [];
    this.state.visitedLocationIds = [...new Set((this.state.visitedLocationIds ?? []).filter((key) =>
      /^\d+:\d+$/.test(key)
    ))];
    const knownLocationStoryIds = new Set(MANDATORY_STORY_CARDS.map((card) => card.id));
    this.state.pendingLocationStoryIds = [...new Set((this.state.pendingLocationStoryIds ?? []).filter((id) =>
      knownLocationStoryIds.has(id) && !(this.state.eventsDrawn ?? []).includes(id)
    ))];
    const knownStoryQuizIds = new Set(STORY_QUIZ_CARDS.map((card) => card.id));
    const drawnStoryQuizIds = new Set((this.state.eventsDrawn ?? []).filter((id) => knownStoryQuizIds.has(id)));
    const retainedStoryQuizIds = [...new Set((this.state.storyQuizQueue ?? []).filter((id) =>
      knownStoryQuizIds.has(id) && !drawnStoryQuizIds.has(id)
    ))];
    const missingStoryQuizIds = STORY_QUIZ_CARDS.map((card) => card.id)
      .filter((id) => !drawnStoryQuizIds.has(id) && !retainedStoryQuizIds.includes(id));
    const shuffledMissingStoryQuizzes = shuffle(missingStoryQuizIds, this.state.rngState || 1);
    this.state.rngState = shuffledMissingStoryQuizzes.state;
    this.state.storyQuizQueue = [...retainedStoryQuizIds, ...shuffledMissingStoryQuizzes.value];
    const knownFunCardIds = new Set(WATCH_CHALLENGES.map((challenge) => challenge.id));
    const retainedFunCardIds = [...new Set((this.state.funCardQueue ?? []).filter((id) => knownFunCardIds.has(id)))];
    const missingFunCardIds = WATCH_CHALLENGES.map((challenge) => challenge.id)
      .filter((id) => !retainedFunCardIds.includes(id));
    const shuffledMissingFunCards = shuffle(missingFunCardIds, this.state.rngState || 1);
    this.state.rngState = shuffledMissingFunCards.state;
    this.state.funCardQueue = [...retainedFunCardIds, ...shuffledMissingFunCards.value];
    this.state.turnsElapsed ??= this.state.players.reduce((total, player) => total + (player.turns ?? 0), 0);
    const validBusyAnchor = Number.isInteger(this.state.busyAfterPlayerIndex) &&
      this.state.busyAfterPlayerIndex >= 0 && this.state.busyAfterPlayerIndex < this.state.players.length;
    this.state.busyAfterPlayerIndex = this.state.turn.phase === 'crewBusy'
      ? (validBusyAnchor ? this.state.busyAfterPlayerIndex : this.state.activePlayerIndex)
      : null;
    this.state.busyReason ??= this.state.turn.phase === 'crewBusy' ? 'allPlayersBusy' : null;
    const hadSharedEffectStack = Array.isArray(this.state.ingredientEffectStack);
    const migratedEffectStack = [];
    this.state.players.forEach((player, index) => {
      const personalStack = Array.isArray(player.ingredientEffectStack) ? player.ingredientEffectStack : [];
      const personalBonuses = { ...freshBonuses(), ...(player.ingredientBonuses ?? {}) };
      if (!hadSharedEffectStack && personalStack.length) {
        personalStack.forEach((entry) => migratedEffectStack.push({
          ...entry,
          storedByPlayerId: entry.storedByPlayerId ?? player.id
        }));
      } else if (!hadSharedEffectStack) {
        LEGACY_STORED_EFFECT_ORDER.forEach((effect) => {
          const bonus = STORED_INGREDIENT_EFFECTS[effect].bonus;
          for (let count = 0; count < (Number(personalBonuses[bonus]) || 0); count += 1) {
            migratedEffectStack.push({
              id: `legacy-${player.id}-${effect}-${count + 1}`,
              effect,
              ingredientId: null,
              storedByPlayerId: player.id,
              storedAt: this.state.updatedAt ?? this.state.startedAt
            });
          }
        });
      }
      delete player.ingredientEffectStack;
      delete player.ingredientBonuses;
      if (!['alcoholic', 'alcohol-free'].includes(player.cocktailTeam)) player.cocktailTeam = null;
      player.passiveUsedByChapter ??= {};
      player.pendingTaskAbility ??= null;
      player.activeUsesRemaining ??= getRole(player.roleId)?.uses ?? 0;
    });
    if (!hadSharedEffectStack) {
      migratedEffectStack.sort((left, right) => (Number(left.storedAt) || 0) - (Number(right.storedAt) || 0));
      this.state.ingredientEffectStack = migratedEffectStack;
      LEGACY_STORED_EFFECT_ORDER.forEach((effect) => {
        const config = STORED_INGREDIENT_EFFECTS[effect];
        for (let count = 0; count < (Number(this.state.bonuses?.[config.bonus]) || 0); count += 1) {
          this.state.ingredientEffectStack.push({
            id: `legacy-crew-${effect}-${count + 1}`,
            effect,
            ingredientId: null,
            storedByPlayerId: null,
            storedAt: this.state.updatedAt ?? this.state.startedAt
          });
        }
      });
    }
    this.state.ingredientEffectStack ??= [];
    this.state.ingredientBonuses = freshBonuses();
    this.state.ingredientEffectStack.forEach((entry) => {
      const config = STORED_INGREDIENT_EFFECTS[entry.effect];
      if (config) this.state.ingredientBonuses[config.bonus] += 1;
    });
    this.state.bonuses = freshBonuses();
    this.state.turn.activeAbilityUsed ??= false;
    this.state.turn.watchPartnerPlayerIds ??= [];
    this.state.groups.forEach((group) => {
      const legacyLocationProgress = group.progressMode !== 'course';
      this.syncGroupLocation(group, this.state.updatedAt ?? Date.now(), { rebase: legacyLocationProgress, log: false });
      this.registerLocationVisit(this.state.chapterIndex, group.locationIndex, this.state.updatedAt ?? Date.now(), { log: false });
    });
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
        cocktailTeam: null,
        language: setup.defaultLanguage === 'en' ? 'en' : 'de',
        turns: 0,
        taskMarkers: 0,
        activeUsesRemaining: role.uses,
        passiveUsedByChapter: {},
        pendingTaskAbility: null
      };
    });

    const startingPlayer = randomInt(rngState, 0, players.length - 1);
    rngState = startingPlayer.state;

    const ingredients = buildIngredientPlan(rngState, players.length);
    rngState = ingredients.state;
    const configuredIngredientNames = sanitizedNameMap(setup.ingredientNames, CURRENT_INGREDIENT_IDS);
    ingredients.plan.forEach((ingredient) => {
      const customName = configuredIngredientNames[ingredient.id];
      if (!customName) return;
      ingredient.customName = customName;
      ingredient.name = clone(customName);
    });
    const shoppingStapleNames = sanitizedNameMap(setup.shoppingStapleNames, CURRENT_SHOPPING_STAPLE_IDS);

    const eventQueues = [];
    for (let chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex += 1) {
      const stageQueues = {};
      for (const stage of EVENT_STAGES) {
        stageQueues[stage] = [];
        for (let locationIndex = 0; locationIndex < CHAPTERS[chapterIndex].locations.length; locationIndex += 1) {
          const locationEvents = EVENT_DECKS[chapterIndex]
            .filter((event) => event.locationIndex === locationIndex && event.stage === stage);
          const ids = locationEvents
            .filter((event) => !['pantry-mischief', 'work-mischief'].includes(event.archetype))
            .map((event) => event.id);
          const shuffled = shuffle(ids, rngState);
          rngState = shuffled.state;
          const queue = [...shuffled.value];
          const pantryFun = locationEvents.filter((event) => event.archetype === 'pantry-mischief');
          pantryFun.forEach((event) => queue.splice(Math.min(2, queue.length), 0, event.id));
          const taskFunIds = locationEvents
            .filter((event) => event.archetype === 'work-mischief')
            .map((event) => event.id);
          const shuffledFun = shuffle(taskFunIds, rngState);
          rngState = shuffledFun.state;
          if (stage === 'tasks' && chapterIndex === 0 && locationIndex === 0) {
            queue.unshift(...shuffledFun.value);
          } else if (stage === 'tasks') {
            shuffledFun.value.forEach((eventId, index) => queue.splice(Math.min(index * 2 + 1, queue.length), 0, eventId));
          }
          stageQueues[stage].push(queue);
        }
      }
      eventQueues.push(stageQueues);
    }

    const taskQueues = [];
    for (let chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex += 1) {
      const starts = getPlayableQuestLines(chapterIndex).map((line) => line[0].id);
      const shuffled = shuffle(starts, rngState);
      rngState = shuffled.state;
      taskQueues.push(shuffled.value);
    }

    const ingredientQueues = [];
    for (let chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex += 1) {
      const chapterId = CHAPTERS[chapterIndex].id;
      const ids = ingredients.plan.filter((ingredient) => ingredient.courseTags.includes(chapterId)).map((ingredient) => ingredient.id);
      const shuffled = shuffle(ids, rngState);
      rngState = shuffled.state;
      ingredientQueues.push(shuffled.value);
    }

    const funCardDeck = shuffle(WATCH_CHALLENGES.map((challenge) => challenge.id), rngState);
    rngState = funCardDeck.state;

    const storyQuizDeck = shuffle(STORY_QUIZ_CARDS.map((card) => card.id), rngState);
    rngState = storyQuizDeck.state;

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
      activePlayerIndex: startingPlayer.value,
      busyAfterPlayerIndex: null,
      busyReason: null,
      chapterIndex: 0,
      chapter: chapterState(players.map((player) => player.id), 0),
      groups: [{
        id: 'A',
        playerIds: players.map((player) => player.id),
        locationIndex: 0,
        locationProgress: 0,
        progressMode: 'course',
        completedLocations: [],
        finished: false
      }],
      turn: freshTurn(),
      eventQueues,
      taskQueues,
      ingredientQueues,
      eventsDrawn: [],
      pendingLocationStoryIds: [],
      visitedLocationIds: [],
      storyQuizQueue: storyQuizDeck.value,
      funCardQueue: funCardDeck.value,
      funCardsDrawn: [],
      discardedEvents: [],
      tasks: [],
      ingredients: ingredients.plan,
      coins: 0,
      coinGoal: COIN_GOAL,
      lastIngredientId: null,
      previousIngredientId: null,
      ingredientEffectStack: [],
      shoppingStapleNames,
      ingredientBonuses: freshBonuses(),
      bonuses: freshBonuses(),
      activeChallenges: [],
      turnsElapsed: 0,
      menu: CHAPTERS.map((chapter) => ({
        chapterId: chapter.id,
        servedAt: null,
        ingredientIds: [],
        courseStyle: null,
        cocktailTechniques: chapter.id === 'cocktails' ? { alcoholic: null, 'alcohol-free': null } : null
      })),
      history: []
    };

    const engine = new GameEngine(state);
    engine.log('voyageStarted', {
      players: players.map((player) => player.name),
      startingPlayerId: engine.activePlayer.id
    }, now);
    engine.initializeChapter(now);
    return engine;
  }

  snapshot() {
    return clone(this.state);
  }

  get activePlayer() {
    return this.state.players[this.state.activePlayerIndex];
  }

  get activeBonuses() {
    this.state.ingredientBonuses ??= freshBonuses();
    return this.state.ingredientBonuses;
  }

  storedIngredientEffects() {
    this.state.ingredientEffectStack ??= [];
    return this.state.ingredientEffectStack;
  }

  ingredientEffectTrigger(effect) {
    return STORED_INGREDIENT_EFFECTS[effect]?.trigger ?? null;
  }

  currentIngredientEffectTrigger() {
    if (this.state.turn.phase === 'rolled') return 'dice';
    if (this.state.turn.phase === 'ingredientChoice') return 'ingredient';
    if (this.state.turn.phase === 'draw') return 'event';
    return null;
  }

  nextStoredIngredientEffect(trigger = null) {
    const stack = this.storedIngredientEffects();
    const queued = stack.find((entry) => {
      if (trigger && this.ingredientEffectTrigger(entry.effect) !== trigger) return false;
      return entry.effect !== 'nextPlayer' || !entry.targetPlayerId || entry.targetPlayerId === this.activePlayer.id;
    });
    if (queued) return queued;
    if (stack.length) return null;
    const legacyEffect = LEGACY_STORED_EFFECT_ORDER.find((effect) => {
      const config = STORED_INGREDIENT_EFFECTS[effect];
      return (!trigger || config.trigger === trigger) && (Number(this.activeBonuses[config.bonus]) || 0) > 0;
    });
    return legacyEffect ? { id: null, effect: legacyEffect, ingredientId: null, legacy: true } : null;
  }

  storeIngredientEffect(ingredient, effect, times = 1, now = Date.now()) {
    const config = STORED_INGREDIENT_EFFECTS[effect];
    if (!config) return false;
    const targetPlayerIndex = effect === 'nextPlayer'
      ? this.nextFreePlayerIndex(this.state.activePlayerIndex)
      : null;
    const targetPlayerId = targetPlayerIndex == null ? null : this.state.players[targetPlayerIndex]?.id ?? null;
    for (let count = 0; count < times; count += 1) {
      const stack = this.storedIngredientEffects();
      stack.push({
        id: `ingredient-effect-${this.activePlayer.id}-${this.state.history.length}-${stack.length + 1}`,
        effect,
        ingredientId: ingredient?.id ?? null,
        storedByPlayerId: this.activePlayer.id,
        targetPlayerId,
        storedAt: now
      });
      this.activeBonuses[config.bonus] += 1;
      this.log('ingredientEffectStored', {
        effect,
        ingredientId: ingredient?.id ?? null,
        playerId: this.activePlayer.id,
        targetPlayerId,
        stackPosition: stack.length
      }, now);
    }
    return true;
  }

  consumeStoredIngredientEffect(effect, trigger, now = Date.now()) {
    const config = STORED_INGREDIENT_EFFECTS[effect];
    if (!config || config.trigger !== trigger) return null;
    const candidate = this.nextStoredIngredientEffect(trigger);
    if (!candidate || candidate.effect !== effect) return null;
    if (!candidate.legacy) {
      const stack = this.storedIngredientEffects();
      const index = stack.findIndex((entry) => entry.id === candidate.id);
      if (index < 0) return null;
      stack.splice(index, 1);
    }
    this.activeBonuses[config.bonus] = Math.max(0, this.activeBonuses[config.bonus] - 1);
    this.log('ingredientEffectConsumed', {
      effect,
      ingredientId: candidate.ingredientId ?? null,
      playerId: this.activePlayer.id,
      storedByPlayerId: candidate.storedByPlayerId ?? null,
      trigger
    }, now);
    return candidate;
  }

  get currentChapter() {
    return CHAPTERS[this.state.chapterIndex];
  }

  get currentEvent() {
    const event = eventById(this.state.turn.currentEventId);
    return event?.storyKind ? event : event ? this.contextualizeEvent(event) : null;
  }

  get currentWatchChallenge() {
    const challenge = this.state.turn.watchChallengeId
      ? WATCH_CHALLENGES.find((entry) => entry.id === this.state.turn.watchChallengeId)
      : this.state.turn.watchChallengeIndex == null ? null : WATCH_CHALLENGES[this.state.turn.watchChallengeIndex];
    if (!challenge) return null;
    return this.personalizeWatchChallenge(
      challenge,
      this.state.turn.watchTargetPlayerId,
      this.state.turn.watchPartnerPlayerIds
    );
  }

  personalizeWatchChallenge(challenge, targetPlayerId = null, partnerPlayerIds = []) {
    if (!challenge) return null;
    const target = this.state.players.find((player) => player.id === targetPlayerId) ?? this.activePlayer;
    const partners = partnerPlayerIds
      .map((playerId) => this.state.players.find((player) => player.id === playerId))
      .filter(Boolean);
    const firstPartner = partners[0] ?? target;
    const secondPartner = partners[1] ?? firstPartner;
    const replaceNames = (value) => value
      .replaceAll('{activePlayer}', this.activePlayer.name)
      .replaceAll('{targetPlayer}', target.name)
      .replaceAll('{partner2}', secondPartner.name)
      .replaceAll('{partner}', firstPartner.name);
    return {
      ...challenge,
      partnerPlayerIds: partners.map((player) => player.id),
      de: replaceNames(challenge.de),
      en: replaceNames(challenge.en),
      title: {
        de: replaceNames(challenge.title.de),
        en: replaceNames(challenge.title.en)
      }
    };
  }

  completeActiveChallenge(instance, reason, now = Date.now()) {
    const challenge = WATCH_CHALLENGES.find((entry) => entry.id === instance?.challengeId);
    if (!challenge) return false;
    const index = this.state.activeChallenges.findIndex((entry) => entry.instanceId === instance.instanceId);
    if (index < 0) return false;
    this.state.activeChallenges.splice(index, 1);
    if (challenge.coins) this.addCoins(challenge.coins, 'challenge', now);
    this.log('watchChallengeCompleted', {
      challengeId: challenge.id,
      coins: challenge.coins,
      delayed: true,
      reason,
      ownerPlayerId: instance.ownerPlayerId
    }, now);
    return true;
  }

  resolveActiveChallengesAfterTurn(endedPlayerId, nextPlayerId, now = Date.now()) {
    const completed = this.state.activeChallenges.filter((instance) =>
      (instance.endTrigger === 'targetTurnEnd' && instance.targetPlayerId === endedPlayerId) ||
      (instance.endTrigger === 'ownerNextTurn' && instance.ownerPlayerId === nextPlayerId)
    );
    completed.forEach((instance) => this.completeActiveChallenge(instance, instance.endTrigger, now));
    return completed.length;
  }

  expireActiveChallenges(reason, now = Date.now()) {
    const expired = [...this.state.activeChallenges];
    this.state.activeChallenges = [];
    expired.forEach((instance) => this.log('watchChallengeExpired', {
      challengeId: instance.challengeId,
      ownerPlayerId: instance.ownerPlayerId,
      reason
    }, now));
    return expired.length;
  }

  scheduleFollowUp(challenge, targetPlayerId, now = Date.now()) {
    if (!challenge?.followUpId || !targetPlayerId) return false;
    const delay = randomInt(this.state.rngState, 3, 5);
    this.state.rngState = delay.state;
    const scheduled = {
      id: challenge.followUpId,
      targetPlayerId,
      dueTurn: this.state.turnsElapsed + delay.value,
      delayTurns: delay.value,
      scheduledAt: now
    };
    this.state.chapter.scheduledChallenges.push(scheduled);
    this.log('watchFollowUpScheduled', scheduled, now);
    return true;
  }

  releaseDueFollowUps(force = false, now = Date.now()) {
    const scheduled = this.state.chapter.scheduledChallenges ?? [];
    const due = scheduled.filter((entry) => force || entry.dueTurn <= this.state.turnsElapsed);
    if (!due.length) return 0;
    this.state.chapter.scheduledChallenges = scheduled.filter((entry) => !due.includes(entry));
    due.forEach((entry) => this.state.chapter.queuedChallenges.push({ id: entry.id, targetPlayerId: entry.targetPlayerId }));
    this.log('watchFollowUpsReleased', { challengeIds: due.map((entry) => entry.id), forced: force }, now);
    return due.length;
  }

  unresolvedFollowUpCount() {
    const active = this.state.activeChallenges.filter((instance) => instance.endTrigger === 'followUp').length;
    return active + (this.state.chapter.scheduledChallenges?.length ?? 0) + (this.state.chapter.queuedChallenges?.length ?? 0);
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
    this.state.turn = freshTurn();
    this.syncCourseLocations(now);
    this.log('chapterStageChanged', { chapterIndex: 0, stage: 'tasks', automatic: true, openingFunCards: 3 }, now);
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

  courseCategoryLimitAllows(ingredient, excludingIngredientId = null) {
    const limit = this.courseRule()?.categoryLimits?.[ingredient?.category];
    if (limit == null) return true;
    const alreadyChosen = this.courseIngredients().filter((entry) =>
      entry.id !== excludingIngredientId && entry.category === ingredient.category &&
      ['discovered', 'locked', 'used'].includes(entry.status)
    ).length;
    return alreadyChosen < limit;
  }

  ingredientAllowedInCurrentCourse(ingredient) {
    if (!ingredient?.courseTags.includes(this.currentChapter.id)) return false;
    const plannedEssential = this.requiredCourseIngredients().filter((entry) =>
      ['discovered', 'locked', 'used'].includes(entry.status)
    ).length;
    if (ingredient.essential && plannedEssential >= this.courseRule().target) return false;
    const plannedOptional = this.courseIngredients().filter((entry) =>
      !entry.essential && ['discovered', 'locked', 'used'].includes(entry.status)
    ).length;
    if (!ingredient.essential && plannedOptional >= (this.courseRule().optionalLimit ?? 0)) return false;
    if (this.currentChapter.id === 'cocktails' && ingredient.category === 'alcohol' &&
      Number.isInteger(this.state.chapter.cocktailSpiritTarget) &&
      this.courseCategoryCount('alcohol') >= this.state.chapter.cocktailSpiritTarget) return false;
    return this.courseCategoryLimitAllows(ingredient);
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

  autoLockExpiringIngredients(now = Date.now()) {
    if (this.state.chapter.stage !== 'ingredients' || this.state.chapterIndex === 0) return [];
    const expiring = this.expiringIngredientCandidates();
    if (!expiring.length) return [];

    const cocktailUseCounts = { alcoholic: 0, 'alcohol-free': 0 };
    if (this.currentChapter.id === 'cocktails') {
      this.courseIngredients().forEach((ingredient) => {
        if (ingredient.cocktailUse === 'alcoholic') cocktailUseCounts.alcoholic += 1;
        if (ingredient.cocktailUse === 'alcohol-free') cocktailUseCounts['alcohol-free'] += 1;
      });
    }
    expiring.forEach((ingredient) => {
      ingredient.status = 'locked';
      ingredient.chapterIndex = this.state.chapterIndex;
      ingredient.basketCourseIndex = null;
      ingredient.basketTaskId = null;
      ingredient.lockedAt = now;
      ingredient.lockedBy = null;
      ingredient.autoLockedChapterIndex = this.state.chapterIndex;
      if (this.currentChapter.id === 'cocktails') {
        ingredient.cocktailUse = ingredient.category === 'alcohol'
          ? 'alcoholic'
          : cocktailUseCounts.alcoholic <= cocktailUseCounts['alcohol-free'] ? 'alcoholic' : 'alcohol-free';
        cocktailUseCounts[ingredient.cocktailUse] += 1;
      }
    });
    const ingredientIds = expiring.map((ingredient) => ingredient.id);
    this.state.chapter.autoLockedIngredientIds = [...new Set([
      ...(this.state.chapter.autoLockedIngredientIds ?? []),
      ...ingredientIds
    ])];
    this.log('ingredientsAutoLockedForLastCourse', {
      chapterIndex: this.state.chapterIndex,
      ingredientIds
    }, now);
    return ingredientIds;
  }

  futureCourseHasCapacity(chapterIndex, excludingIngredientId = null) {
    const chapter = CHAPTERS[chapterIndex];
    const rule = this.courseRule(chapterIndex);
    if (!chapter || !rule) return true;
    const candidates = this.state.ingredients.filter((ingredient) =>
      ingredient.essential && ingredient.status === 'available' &&
      ingredient.id !== excludingIngredientId && ingredient.courseTags.includes(chapter.id)
    );
    const categoryCandidates = this.state.ingredients.filter((ingredient) =>
      ingredient.status === 'available' && ingredient.id !== excludingIngredientId && ingredient.courseTags.includes(chapter.id)
    );
    const categories = new Map();
    candidates.forEach((ingredient) => categories.set(ingredient.category, (categories.get(ingredient.category) ?? 0) + 1));
    const capacity = [...categories.entries()].reduce((total, [category, count]) => {
      const limit = rule.categoryLimits?.[category];
      return total + (limit == null ? count : Math.min(count, limit));
    }, 0);
    if (capacity < rule.target) return false;
    return Object.entries(rule.categoryMinimums ?? {}).every(([category, minimum]) =>
      categoryCandidates.filter((ingredient) => ingredient.category === category).length >= minimum
    );
  }

  preservesFutureCourseCapacity(ingredient) {
    if (!ingredient?.essential) return true;
    const plannedEssential = this.requiredCourseIngredients().filter((entry) =>
      ['discovered', 'locked', 'used'].includes(entry.status)
    ).length;
    // Ingredients that expire in a later course may still occupy one of the
    // remaining slots in the current course. Count those slots as part of the
    // cumulative capacity after hypothetically choosing this ingredient.
    let cumulativeTargets = this.courseRule().target - plannedEssential - 1;
    for (let chapterIndex = this.state.chapterIndex + 1; chapterIndex < CHAPTERS.length; chapterIndex += 1) {
      if (!this.futureCourseHasCapacity(chapterIndex, ingredient.id)) return false;
      cumulativeTargets += this.courseRule(chapterIndex).target;
      const essentialIngredientsExpiringByThen = this.state.ingredients.filter((entry) =>
        entry.essential && entry.status === 'available' && entry.id !== ingredient.id &&
        this.ingredientLastCourseIndex(entry) > this.state.chapterIndex &&
        this.ingredientLastCourseIndex(entry) <= chapterIndex
      ).length;
      if (essentialIngredientsExpiringByThen > cumulativeTargets) return false;
    }
    return true;
  }

  canAddIngredientThisTurn() {
    return (this.state.turn.ingredientsAddedThisTurn ?? 0) < MAX_INGREDIENTS_PER_TURN;
  }

  selectionKeepsCurrentCourseFeasible(ingredient) {
    if (!ingredient?.essential) return true;
    const rule = this.courseRule();
    const planned = this.requiredCourseIngredients().filter((entry) =>
      ['discovered', 'locked', 'used'].includes(entry.status)
    );
    const allPlanned = this.courseIngredients().filter((entry) =>
      ['discovered', 'locked', 'used'].includes(entry.status)
    );
    const slotsAfter = rule.target - planned.length - 1;
    if (slotsAfter < 0) return false;

    const mandatory = this.expiringIngredientCandidates().filter((entry) => entry.id !== ingredient.id);
    if (mandatory.length > slotsAfter) return false;
    const counts = new Map();
    [...allPlanned, ingredient, ...mandatory].forEach((entry) =>
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1)
    );
    let extraEssentialSlotsNeeded = 0;
    for (const [category, minimum] of Object.entries(rule.categoryMinimums ?? {})) {
      const deficit = Math.max(0, minimum - (counts.get(category) ?? 0));
      const availableInCategory = this.state.ingredients.filter((entry) =>
        entry.status === 'available' && entry.id !== ingredient.id &&
        !mandatory.some((mandatoryEntry) => mandatoryEntry.id === entry.id) &&
        entry.category === category && entry.courseTags.includes(this.currentChapter.id)
      );
      if (availableInCategory.length < deficit) return false;
      const optionalAvailable = availableInCategory.filter((entry) => !entry.essential).length;
      extraEssentialSlotsNeeded += Math.max(0, deficit - optionalAvailable);
    }
    return mandatory.length + extraEssentialSlotsNeeded <= slotsAfter;
  }

  courseIngredientCandidates(category = null) {
    const queue = this.state.ingredientQueues[this.state.chapterIndex] ?? [];
    let candidates = queue
      .map((ingredientId) => this.state.ingredients.find((ingredient) => ingredient.id === ingredientId))
      .filter((ingredient) => ingredient?.status === 'available' && this.ingredientAllowedInCurrentCourse(ingredient) &&
        this.selectionKeepsCurrentCourseFeasible(ingredient) &&
        this.preservesFutureCourseCapacity(ingredient) && (!category || ingredient.category === category));
    if (this.currentChapter.id === 'cocktails' && this.activePlayer.cocktailTeam === 'alcohol-free') {
      candidates = candidates.filter((ingredient) => ingredient.category !== 'alcohol');
    }
    return candidates;
  }

  unlockedCourseIngredients() {
    return this.courseIngredients().filter((ingredient) => ingredient.status === 'discovered');
  }

  openCourseIngredient(ingredientId) {
    if (!ingredientId) return null;
    return this.state.ingredients.find((ingredient) =>
      ingredient.id === ingredientId &&
      ingredient.chapterIndex === this.state.chapterIndex &&
      ingredient.status === 'discovered'
    ) ?? null;
  }

  latestUnlockedCourseIngredient() {
    return this.unlockedCourseIngredients().reduce((latest, ingredient) => {
      if (!latest) return ingredient;
      return (ingredient.discoveredAt ?? 0) >= (latest.discoveredAt ?? 0) ? ingredient : latest;
    }, null);
  }

  ingredientActionTarget() {
    return this.openCourseIngredient(this.state.turn.ingredientActionTargetId)
      ?? this.openCourseIngredient(this.state.lastIngredientId)
      ?? this.latestUnlockedCourseIngredient();
  }

  captureIngredientActionTarget(event = this.currentEvent) {
    const actions = event?.options ?? event?.outcomes ?? [];
    const needsIngredientTarget = actions.some((actionCode) =>
      ['lockIngredient', 'returnIngredient', 'swapIngredient'].includes(actionCode)
    );
    const currentTarget = this.openCourseIngredient(this.state.lastIngredientId)
      ?? this.latestUnlockedCourseIngredient();
    this.state.turn.ingredientActionTargetId = needsIngredientTarget
      ? currentTarget?.id ?? null
      : null;
    return this.state.turn.ingredientActionTargetId;
  }

  ingredientsLockedForCourse() {
    const chosen = this.courseIngredients();
    const lockedEssential = chosen.filter((ingredient) => ingredient.essential && ['locked', 'used'].includes(ingredient.status)).length;
    const basketEmpty = chosen.every((ingredient) => ingredient.status !== 'discovered');
    const noRequiredIngredientExpires = this.expiringIngredientCandidates().length === 0;
    const categoryMinimumsMet = this.unmetCourseCategoryMinimums(['locked', 'used']).length === 0;
    // `>=` keeps already-running legacy sessions with a formerly larger basket
    // playable. New choices are capped at the exact target above.
    return lockedEssential >= this.courseRule().target && basketEmpty && noRequiredIngredientExpires && categoryMinimumsMet;
  }

  defaultCocktailUseForIngredient(ingredient) {
    if (this.currentChapter.id !== 'cocktails') return null;
    if (ingredient.category === 'alcohol') return 'alcoholic';
    if (['alcoholic', 'alcohol-free'].includes(ingredient.cocktailUse)) return ingredient.cocktailUse;
    const discoverer = this.state.players.find((player) => player.id === ingredient.discoveredBy);
    if (['alcoholic', 'alcohol-free'].includes(discoverer?.cocktailTeam)) return discoverer.cocktailTeam;
    if (['alcoholic', 'alcohol-free'].includes(this.activePlayer?.cocktailTeam)) return this.activePlayer.cocktailTeam;
    return 'shared';
  }

  cocktailCompositionReady() {
    if (this.currentChapter.id !== 'cocktails') return true;
    const fixed = this.courseIngredients().filter((ingredient) => ['locked', 'used'].includes(ingredient.status));
    const validUses = new Set(['alcoholic', 'alcohol-free', 'shared']);
    const spiritTarget = this.state.chapter.cocktailSpiritTarget;
    const spiritCount = fixed.filter((ingredient) => ingredient.category === 'alcohol' && ingredient.cocktailUse === 'alcoholic').length;
    const hasTeamBase = (team) => fixed.some((ingredient) =>
      [team, 'shared'].includes(ingredient.cocktailUse) && ingredient.category !== 'alcohol'
    );
    return fixed.length > 0 && fixed.every((ingredient) => validUses.has(ingredient.cocktailUse)) &&
      Number.isInteger(spiritTarget) && spiritTarget >= 1 && spiritTarget <= 3 && spiritCount === spiritTarget &&
      hasTeamBase('alcoholic') && hasTeamBase('alcohol-free') &&
      fixed.some((ingredient) => ['alcohol-free', 'shared'].includes(ingredient.cocktailUse) && !['alcohol', 'drinks'].includes(ingredient.category));
  }

  activateCocktailDecisionTeam(team) {
    if (!['alcoholic', 'alcohol-free'].includes(team)) return false;
    if (this.activePlayer?.cocktailTeam === team) return true;
    const selectionOrder = this.state.chapter.cocktailTeamSelectionPlayerIds ?? [];
    const decisionPlayerId = selectionOrder.find((playerId) =>
      this.state.players.find((player) => player.id === playerId)?.cocktailTeam === team
    ) ?? this.cocktailTeamMembers(team)[0]?.id;
    const playerIndex = this.state.players.findIndex((player) => player.id === decisionPlayerId);
    if (playerIndex < 0) return false;
    this.state.activePlayerIndex = playerIndex;
    return true;
  }

  cocktailTeamsReady() {
    const teams = this.state.players.map((player) => player.cocktailTeam);
    return teams.every((team) => ['alcoholic', 'alcohol-free'].includes(team)) &&
      teams.includes('alcoholic') && teams.includes('alcohol-free');
  }

  availableCocktailTeamChoices() {
    if (this.currentChapter.id !== 'cocktails' || this.state.chapter.stage !== 'teamSelection' ||
      this.state.turn.phase !== 'cocktailTeamChoice') return [];
    const order = this.state.chapter.cocktailTeamSelectionPlayerIds ?? [];
    const selectionIndex = this.state.chapter.cocktailTeamSelectionIndex ?? 0;
    if (order[selectionIndex] !== this.activePlayer.id || this.activePlayer.cocktailTeam) return [];
    const remainingAfterChoice = Math.max(0, order.length - selectionIndex - 1);
    return ['alcoholic', 'alcohol-free'].filter((choice) => {
      const assignedAfterChoice = this.state.players.map((player) =>
        player.id === this.activePlayer.id ? choice : player.cocktailTeam
      );
      return ['alcoholic', 'alcohol-free'].every((team) =>
        assignedAfterChoice.includes(team) || remainingAfterChoice > 0
      );
    });
  }

  startCocktailTeamSelection(now = Date.now()) {
    if (this.currentChapter.id !== 'cocktails' || !['clearing', 'teamSelection'].includes(this.state.chapter.stage)) return false;
    const clearingCards = TASK_DECKS[this.state.chapterIndex].filter((card) => card.playable && card.questId === 'reset');
    const clearingComplete = clearingCards.length > 0 && clearingCards.every((card) =>
      this.state.tasks.some((instance) => instance.chapterIndex === this.state.chapterIndex && instance.taskId === card.id && instance.status === 'done')
    );
    if (!clearingComplete) return false;

    if (!(this.state.chapter.cocktailTeamSelectionPlayerIds ?? []).length) {
      const startIndex = this.state.activePlayerIndex;
      this.state.chapter.cocktailTeamSelectionPlayerIds = Array.from({ length: this.state.players.length }, (_, offset) =>
        this.state.players[(startIndex + offset) % this.state.players.length].id
      );
      this.state.chapter.cocktailTeamSelectionIndex = 0;
      this.state.players.forEach((player) => { player.cocktailTeam = null; });
      this.log('cocktailTeamSelectionStarted', {
        playerIds: this.state.chapter.cocktailTeamSelectionPlayerIds
      }, now);
    }

    const playerId = this.state.chapter.cocktailTeamSelectionPlayerIds[this.state.chapter.cocktailTeamSelectionIndex];
    const playerIndex = this.state.players.findIndex((player) => player.id === playerId);
    if (playerIndex < 0) return false;
    this.state.chapter.stage = 'teamSelection';
    this.state.activePlayerIndex = playerIndex;
    this.state.turn = { ...freshTurn(), phase: 'cocktailTeamChoice' };
    return true;
  }

  chooseCocktailTeam(team, now = Date.now()) {
    if (!this.availableCocktailTeamChoices().includes(team)) return false;
    const order = this.state.chapter.cocktailTeamSelectionPlayerIds;
    const selectionIndex = this.state.chapter.cocktailTeamSelectionIndex;
    const player = this.activePlayer;
    player.cocktailTeam = team;
    this.log('cocktailTeamChosen', {
      playerId: player.id,
      team,
      selectionNumber: selectionIndex + 1,
      totalSelections: order.length
    }, now);
    this.state.chapter.cocktailTeamSelectionIndex += 1;

    if (this.state.chapter.cocktailTeamSelectionIndex < order.length) {
      const nextPlayerId = order[this.state.chapter.cocktailTeamSelectionIndex];
      this.state.activePlayerIndex = this.state.players.findIndex((candidate) => candidate.id === nextPlayerId);
      this.state.turn = { ...freshTurn(), phase: 'cocktailTeamChoice' };
      return true;
    }

    if (!this.cocktailTeamsReady()) return false;
    const nextPlayerId = order[0];
    this.state.activePlayerIndex = this.state.players.findIndex((candidate) => candidate.id === nextPlayerId);
    this.state.chapter.stage = 'ingredients';
    this.state.turn = freshTurn();
    this.autoLockExpiringIngredients(now);
    this.startCocktailSpiritCountChoice(now);
    this.log('cocktailTeamSelectionCompleted', {
      alcoholicPlayerIds: this.cocktailTeamMembers('alcoholic').map((member) => member.id),
      alcoholFreePlayerIds: this.cocktailTeamMembers('alcohol-free').map((member) => member.id)
    }, now);
    this.log('chapterStageChanged', {
      chapterIndex: this.state.chapterIndex,
      stage: 'ingredients',
      afterCocktailTeamSelection: true
    }, now);
    this.syncCourseLocations(now);
    return true;
  }

  startCocktailSpiritCountChoice(now = Date.now()) {
    if (this.currentChapter.id !== 'cocktails' || this.state.chapter.stage !== 'ingredients' ||
      Number.isInteger(this.state.chapter.cocktailSpiritTarget)) return false;
    if (!this.activateCocktailDecisionTeam('alcoholic')) return false;
    this.state.turn.phase = 'courseDecision';
    this.state.turn.courseDecisionType = 'cocktailSpiritCount';
    this.state.turn.pendingCocktailTeam = null;
    this.log('cocktailSpiritCountChoiceStarted', {}, now);
    return true;
  }

  availableCocktailSpiritCounts() {
    if (this.currentChapter.id !== 'cocktails' || this.state.chapter.stage !== 'ingredients') return [];
    const remainingSpiritVarieties = this.state.ingredients.filter((ingredient) =>
      ingredient.category === 'alcohol' && ingredient.courseTags.includes('cocktails') &&
      (ingredient.status === 'available' || ingredient.chapterIndex === this.state.chapterIndex)
    ).length;
    return Array.from({ length: Math.min(3, remainingSpiritVarieties) }, (_, index) => index + 1);
  }

  chooseCocktailSpiritCount(count, now = Date.now()) {
    const spiritCount = Number(count);
    if (this.currentChapter.id !== 'cocktails' || this.state.chapter.stage !== 'ingredients' ||
      this.state.turn.phase !== 'courseDecision' || this.state.turn.courseDecisionType !== 'cocktailSpiritCount' ||
      this.activePlayer.cocktailTeam !== 'alcoholic' ||
      !this.availableCocktailSpiritCounts().includes(spiritCount)) return false;
    this.state.chapter.cocktailSpiritTarget = spiritCount;
    this.state.turn = freshTurn();
    this.log('cocktailSpiritCountChosen', { count: spiritCount, playerId: this.activePlayer.id }, now);
    this.syncCourseLocations(now);
    return true;
  }

  cocktailTechniqueForTeam(team, chapterIndex = this.state.chapterIndex) {
    if (!['alcoholic', 'alcohol-free'].includes(team)) return null;
    const techniques = chapterIndex === this.state.chapterIndex
      ? this.state.chapter.cocktailTechniques
      : this.state.menu?.[chapterIndex]?.cocktailTechniques;
    return techniques?.[team] ?? null;
  }

  cocktailTechniquesReady() {
    if (this.currentChapter.id !== 'cocktails') return true;
    return ['alcoholic', 'alcohol-free'].every((team) =>
      ['mixed', 'stirred'].includes(this.cocktailTechniqueForTeam(team))
    );
  }

  nextCocktailTechniqueTeam() {
    return ['alcoholic', 'alcohol-free'].find((team) => !this.cocktailTechniqueForTeam(team)) ?? null;
  }

  startCocktailTechniqueChoice(now = Date.now()) {
    if (this.currentChapter.id !== 'cocktails' || this.state.chapter.stage !== 'ingredients' ||
      !this.ingredientsLockedForCourse() || !this.cocktailCompositionReady()) return false;
    const team = this.nextCocktailTechniqueTeam();
    if (!team) return false;
    if (!this.activateCocktailDecisionTeam(team)) return false;
    this.state.turn.phase = 'courseDecision';
    this.state.turn.courseDecisionType = 'cocktailTechnique';
    this.state.turn.pendingCocktailTeam = team;
    this.log('cocktailTechniqueChoiceStarted', { team }, now);
    return true;
  }

  chooseCocktailTechnique(team, technique, now = Date.now()) {
    if (this.currentChapter.id !== 'cocktails' || this.state.chapter.stage !== 'ingredients' ||
      this.state.turn.phase !== 'courseDecision' || this.state.turn.courseDecisionType !== 'cocktailTechnique' ||
      this.state.turn.pendingCocktailTeam !== team ||
      this.activePlayer.cocktailTeam !== team ||
      !['alcoholic', 'alcohol-free'].includes(team) || !['mixed', 'stirred'].includes(technique)) return false;
    this.state.chapter.cocktailTechniques[team] = technique;
    this.state.menu[this.state.chapterIndex].cocktailTechniques = clone(this.state.chapter.cocktailTechniques);
    this.log('cocktailTechniqueChosen', { team, technique, playerId: this.activePlayer.id }, now);

    const nextTeam = this.nextCocktailTechniqueTeam();
    if (nextTeam) {
      if (!this.activateCocktailDecisionTeam(nextTeam)) return false;
      this.state.turn.pendingCocktailTeam = nextTeam;
      this.state.turn.courseDecisionType = 'cocktailTechnique';
      this.log('cocktailTechniqueChoiceStarted', { team: nextTeam }, now);
      return true;
    }

    this.state.chapter.stage = 'tasks';
    this.reconcileTaskQueue(this.state.chapterIndex, true, now);
    this.state.turn = freshTurn();
    this.log('chapterStageChanged', { chapterIndex: this.state.chapterIndex, stage: 'tasks', afterCocktailTechniques: true }, now);
    this.syncCourseLocations(now);
    return true;
  }

  setCocktailIngredientUse(ingredientId, use, now = Date.now()) {
    if (this.currentChapter.id !== 'cocktails' || this.state.chapter.stage !== 'ingredients' ||
      !['alcoholic', 'alcohol-free', 'shared'].includes(use)) return false;
    const ingredient = this.courseIngredients().find((entry) => entry.id === ingredientId && entry.status === 'locked');
    if (!ingredient || (ingredient.category === 'alcohol' && use !== 'alcoholic') ||
      (use !== 'shared' && this.activePlayer.cocktailTeam !== use)) return false;
    ingredient.cocktailUse = use;
    this.log('cocktailIngredientAssigned', { ingredientId, use }, now);
    this.updateChapterStage(now);
    return true;
  }

  updateChapterStage(now = Date.now()) {
    if (this.state.chapter.stage === 'clearing') {
      const clearingCards = TASK_DECKS[this.state.chapterIndex].filter((card) => card.playable && card.questId === 'reset');
      const clearingComplete = clearingCards.length > 0 && clearingCards.every((card) =>
        this.state.tasks.some((instance) => instance.chapterIndex === this.state.chapterIndex && instance.taskId === card.id && instance.status === 'done')
      );
      if (clearingComplete) {
        if (this.currentChapter.id === 'cocktails' && !this.cocktailTeamsReady()) {
          const started = this.startCocktailTeamSelection(now);
          this.syncCourseLocations(now);
          return started;
        }
        this.state.chapter.stage = 'ingredients';
        this.autoLockExpiringIngredients(now);
        this.log('chapterStageChanged', { chapterIndex: this.state.chapterIndex, stage: 'ingredients', afterTableClearing: true }, now);
        if (this.state.chapterIndex === 3) this.secureTreasurerIngredient(now);
        this.syncCourseLocations(now);
        return true;
      }
      this.syncCourseLocations(now);
      return false;
    }
    const ingredientChoiceInProgress = ['event', 'ingredientChoice', 'effectChoice', 'courseDecision'].includes(this.state.turn.phase);
    if (this.state.chapter.stage === 'ingredients' && !ingredientChoiceInProgress && this.ingredientsLockedForCourse() && this.cocktailCompositionReady()) {
      if (this.currentChapter.id === 'cocktails' && !this.cocktailTechniquesReady()) {
        const started = this.startCocktailTechniqueChoice(now);
        this.syncCourseLocations(now);
        return started;
      }
      this.state.chapter.stage = 'tasks';
      this.reconcileTaskQueue(this.state.chapterIndex, true, now);
      this.log('chapterStageChanged', { chapterIndex: this.state.chapterIndex, stage: 'tasks' }, now);
      this.syncCourseLocations(now);
      return true;
    }
    if (this.state.chapter.stage === 'tasks' && !this.hasUnassignedCourseTasks()) {
      this.state.chapter.stage = 'cooking';
      this.log('chapterStageChanged', { chapterIndex: this.state.chapterIndex, stage: 'cooking' }, now);
      this.syncCourseLocations(now);
      return true;
    }
    this.syncCourseLocations(now);
    return false;
  }

  taskPrerequisitesMet(card) {
    const requirementMet = (requirement) => {
      const requiredCard = TASK_DECKS[this.state.chapterIndex]
        .find((candidate) => candidate.blueprintIndex === requirement.requiredBlueprintIndex);
      if (requiredCard?.repeatOnRelief && !this.state.chapter.soupReady) return false;
      if (requiredCard && !this.taskAppliesToCourse(requiredCard)) return true;
      const prerequisite = this.state.tasks.find((instance) => {
        if (instance.chapterIndex !== this.state.chapterIndex) return false;
        const prerequisiteCard = this.getTaskCard(instance);
        return prerequisiteCard?.blueprintIndex === requirement.requiredBlueprintIndex;
      });
      if (!prerequisite) return false;
      return requirement.state === 'started'
        ? ['active', 'ready', 'done'].includes(prerequisite.status)
        : prerequisite.status === 'done';
    };
    return (card?.prerequisites ?? []).every(requirementMet) &&
      (!(card?.alternativePrerequisites?.length) || card.alternativePrerequisites.some(requirementMet));
  }

  taskAppliesToCourse(card) {
    return this.taskAppliesToChapter(card, this.state.chapterIndex);
  }

  courseStyleForChapter(chapterIndex) {
    if (chapterIndex === this.state.chapterIndex) return this.state.chapter.courseStyle;
    if (chapterIndex === 1) return this.state.menu?.[chapterIndex]?.courseStyle ?? null;
    return 'not-required';
  }

  taskAppliesToChapter(card, chapterIndex) {
    const style = this.courseStyleForChapter(chapterIndex);
    const soupReady = chapterIndex === this.state.chapterIndex
      ? this.state.chapter.soupReady
      : Boolean(this.state.menu?.[chapterIndex]?.servedAt);
    if (soupReady && card?.chapterId === 'soup' && card.questId === 'cauldron' && card.timingMode === 'background') return false;
    const styleApplies = !card?.courseStyles?.length || style == null || card.courseStyles.includes(style);
    if (!styleApplies) return false;
    const requirement = card?.ingredientRequirement;
    if (!requirement) return true;
    const requiredIds = new Set(requirement.ids ?? []);
    const requiredCategories = new Set(requirement.categories ?? []);
    const excludedIds = new Set(requirement.excludeIds ?? []);
    return this.state.ingredients.some((ingredient) =>
      ingredient.chapterIndex === chapterIndex && ['discovered', 'locked', 'used'].includes(ingredient.status) &&
      !excludedIds.has(ingredient.id) && (requiredIds.has(ingredient.id) || requiredCategories.has(ingredient.category))
    );
  }

  nextAvailableQuestCards(chapterIndex = this.state.chapterIndex) {
    const instances = this.state.tasks.filter((instance) => instance.chapterIndex === chapterIndex);
    const byTaskId = new Map();
    instances.forEach((instance) => {
      if (!byTaskId.has(instance.taskId)) byTaskId.set(instance.taskId, []);
      byTaskId.get(instance.taskId).push(instance);
    });
    return getPlayableQuestLines(chapterIndex).flatMap((line) => {
      const applicableLine = line.filter((card) => this.taskAppliesToChapter(card, chapterIndex));
      for (const card of applicableLine) {
        const cardInstances = byTaskId.get(card.id) ?? [];
        if (card.repeatOnRelief) {
          if (cardInstances.some((instance) => ['queued', 'active', 'ready'].includes(instance.status))) return [];
          return [card];
        }
        const instance = cardInstances.at(-1);
        if (!instance) return [card];
        if (instance.status !== 'done') return [];
      }
      return [];
    });
  }

  questStepNumber(card) {
    if (!card) return 0;
    const chapterIndex = CHAPTERS.findIndex((chapter) => chapter.id === card.chapterId);
    const line = getPlayableQuestLines(chapterIndex).find((candidate) => candidate.some((entry) => entry.id === card.id));
    const index = line?.findIndex((entry) => entry.id === card.id) ?? -1;
    return index >= 0 ? index + 1 : card.questStep;
  }

  reconcileTaskQueue(chapterIndex = this.state.chapterIndex, randomizeMissing = false, now = Date.now()) {
    const desiredCards = this.nextAvailableQuestCards(chapterIndex);
    const automaticCards = chapterIndex === this.state.chapterIndex
      ? desiredCards.filter((card) => card.automatic && this.taskAppliesToCourse(card) && this.taskPrerequisitesMet(card))
      : [];
    const desiredIds = new Set(desiredCards.filter((card) => !card.automatic).map((card) => card.id));
    const queue = [...new Set((this.state.taskQueues[chapterIndex] ?? []).filter((taskId) => desiredIds.has(taskId)))];
    const missingCards = desiredCards.filter((card) => !card.automatic && !queue.includes(card.id));
    missingCards.forEach((card) => {
      if (randomizeMissing) {
        const insertion = randomInt(this.state.rngState, 0, Math.min(2, queue.length));
        this.state.rngState = insertion.state;
        queue.splice(insertion.value, 0, card.id);
        this.log('questTaskUnlocked', {
          chapterIndex,
          taskId: card.id,
          questId: card.questId,
          position: insertion.value
        }, now);
      } else {
        queue.push(card.id);
      }
    });
    this.state.taskQueues[chapterIndex] = queue;
    automaticCards.forEach((card) => this.startAutomaticTask(card, now));
    return missingCards;
  }

  startAutomaticTask(card, now = Date.now()) {
    if (!card?.automatic || card.chapterId !== this.currentChapter.id ||
      this.state.tasks.some((instance) => instance.chapterIndex === this.state.chapterIndex && instance.taskId === card.id)) return null;
    const instance = {
      instanceId: createId('task'),
      taskId: card.id,
      chapterIndex: this.state.chapterIndex,
      locationIndex: this.activeGroup.locationIndex,
      groupId: this.activeGroup.id,
      coreKey: null,
      assignedPlayerIds: [],
      status: 'active',
      assignedAt: now,
      startedAt: now,
      endAt: null,
      readyAt: null,
      completedAt: null,
      timingMode: card.timingMode ?? 'manual',
      baseChallengeMinutes: 0,
      challengeMinutes: 0,
      backgroundMinutes: 0,
      challengeEndsAt: null,
      taskAbilityAdjustments: [],
      taskCoinAdjustment: 0,
      basketIngredientIds: this.reserveTaskBasket(card, null)
    };
    this.state.tasks.push(instance);
    this.log('automaticTaskStarted', { taskId: card.id, instanceId: instance.instanceId, assignedPlayerIds: [] }, now);
    return instance;
  }

  openTasksForPlayer(playerId, excludingInstanceId = null) {
    return this.state.tasks.filter((instance) =>
      instance.instanceId !== excludingInstanceId &&
      instance.assignedPlayerIds.includes(playerId) &&
      ['queued', 'active', 'ready'].includes(instance.status)
    );
  }

  hasOpenTasks() {
    return this.state.tasks.some((instance) => ['queued', 'active', 'ready'].includes(instance.status));
  }

  isPlayerFreeForTask(playerId, excludingInstanceId = null) {
    return this.openTasksForPlayer(playerId, excludingInstanceId).length === 0;
  }

  freePlayersForTask(group = this.activeGroup) {
    return group.playerIds
      .map((playerId) => this.state.players.find((player) => player.id === playerId))
      .filter((player) => player && this.isPlayerFreeForTask(player.id));
  }

  availableCoopPartners(group = this.activeGroup) {
    const freeIds = new Set(this.freePlayersForTask(group).map((player) => player.id));
    const ordered = [];
    for (let offset = 1; offset < this.state.players.length; offset += 1) {
      const player = this.state.players[(this.state.activePlayerIndex + offset) % this.state.players.length];
      if (player?.id !== this.activePlayer.id && group.playerIds.includes(player.id) && freeIds.has(player.id)) ordered.push(player);
    }
    return ordered;
  }

  coopPartnerPlayerIds(challenge, group = this.activeGroup) {
    if (!challenge?.cooperative) return [];
    return this.availableCoopPartners(group).slice(0, challenge.partnerCount).map((player) => player.id);
  }

  cocktailTeamForTask(card) {
    if (card?.chapterId !== 'cocktails') return null;
    if (['alcoholic', 'alcohol-free'].includes(card.cocktailTeam)) return card.cocktailTeam;
    if (card.area === 'alcoholic') return 'alcoholic';
    if (card.area === 'alcohol-free') return 'alcohol-free';
    return null;
  }

  cocktailTeamMembers(team) {
    return this.state.players.filter((player) => player.cocktailTeam === team);
  }

  eligibleFreePlayersForTask(card, group = this.activeGroup) {
    const free = this.freePlayersForTask(group);
    const cocktailTeam = this.cocktailTeamForTask(card);
    return cocktailTeam ? free.filter((player) => player.cocktailTeam === cocktailTeam) : free;
  }

  taskAssignmentPriority(a, b) {
    return (b.turns ?? 0) - (a.turns ?? 0) ||
      (a.taskMarkers ?? 0) - (b.taskMarkers ?? 0) ||
      a.id.localeCompare(b.id);
  }

  prioritizedFreePlayersForTask(group = this.activeGroup, card = null) {
    return this.eligibleFreePlayersForTask(card, group).sort((a, b) => {
      if (a.id === this.activePlayer.id) return -1;
      if (b.id === this.activePlayer.id) return 1;
      return this.taskAssignmentPriority(a, b);
    });
  }

  recommendedTaskPlayers(card, group = this.activeGroup, peopleMode = null) {
    const requiredPeople = this.requiredPeopleForTask(card, peopleMode);
    const free = this.eligibleFreePlayersForTask(card, group);
    const active = free.find((player) => player.id === this.activePlayer.id);
    if (!active || free.length < requiredPeople) return [];
    const helpers = free
      .filter((player) => player.id !== active.id)
      .sort((a, b) => this.taskAssignmentPriority(a, b));
    return [active, ...helpers.slice(0, requiredPeople - 1)];
  }

  requiredPeopleForTask(card, peopleMode = null) {
    if (!card) return Infinity;
    const requested = peopleMode === 'team'
      ? Math.min(card.people[1], card.people[0] + 1)
      : card.people[0];
    const cocktailTeam = this.cocktailTeamForTask(card);
    if (!cocktailTeam) return requested;
    const teamSize = this.cocktailTeamMembers(cocktailTeam).length;
    return teamSize ? Math.min(requested, teamSize) : Infinity;
  }

  shouldOfferTaskAssigneeChoice(card, group = this.activeGroup, peopleMode = null) {
    const requiredPeople = this.requiredPeopleForTask(card, peopleMode);
    const chapterTaskCount = this.state.tasks.filter((instance) => instance.chapterIndex === this.state.chapterIndex).length;
    return requiredPeople > 1 && chapterTaskCount > 0 && chapterTaskCount % TASK_ASSIGNEE_CHOICE_INTERVAL === 1 &&
      this.eligibleFreePlayersForTask(card, group).length > requiredPeople;
  }

  taskHandoffAllowed(card, group = this.activeGroup) {
    if (card?.chapterId !== 'soup' || card.questId !== 'cauldron' || card.timingMode !== 'background') return true;
    if (card.repeatOnRelief && (this.state.chapter.cauldronPreviousPlayerIds ?? []).includes(this.activePlayer.id)) return false;
    const previous = this.state.tasks
      .filter((instance) => instance.chapterIndex === this.state.chapterIndex)
      .map((instance) => ({ instance, card: this.getTaskCard(instance) }))
      .filter((entry) => entry.card?.questId === card.questId && this.questStepNumber(entry.card) < this.questStepNumber(card))
      .sort((a, b) => this.questStepNumber(b.card) - this.questStepNumber(a.card))[0];
    if (!previous || !group.playerIds.includes(this.activePlayer.id)) return true;
    return !previous.instance.assignedPlayerIds.includes(this.activePlayer.id);
  }

  isCauldronWatch(instanceOrId) {
    const instance = typeof instanceOrId === 'string'
      ? this.state.tasks.find((candidate) => candidate.instanceId === instanceOrId)
      : instanceOrId;
    const card = instance ? this.getTaskCard(instance) : null;
    return this.isCauldronWatchCard(card);
  }

  isCauldronWatchCard(card) {
    return Boolean(card?.chapterId === 'soup' && card.questId === 'cauldron' && card.timingMode === 'background' && card.repeatOnRelief);
  }

  recurringTaskCardAvailable(card) {
    if (!card?.repeatOnRelief || this.state.chapter.soupReady) return false;
    return !this.state.tasks.some((instance) => instance.chapterIndex === this.state.chapterIndex &&
      instance.taskId === card.id && ['queued', 'active', 'ready'].includes(instance.status));
  }

  cauldronReliefCandidates(instanceOrId) {
    const instance = typeof instanceOrId === 'string'
      ? this.state.tasks.find((candidate) => candidate.instanceId === instanceOrId)
      : instanceOrId;
    if (!instance || !this.isCauldronWatch(instance)) return [];
    const group = this.state.groups.find((candidate) => candidate.id === instance.groupId) ?? this.activeGroup;
    const currentWatch = new Set(instance.assignedPlayerIds);
    return group.playerIds
      .map((playerId) => this.state.players.find((player) => player.id === playerId))
      .filter((player) => player && !currentWatch.has(player.id) && this.isPlayerFreeForTask(player.id, instance.instanceId))
      .sort((a, b) => this.taskAssignmentPriority(a, b));
  }

  canRelieveCauldronWatch(instanceOrId) {
    const instance = typeof instanceOrId === 'string'
      ? this.state.tasks.find((candidate) => candidate.instanceId === instanceOrId)
      : instanceOrId;
    if (!instance || !['active', 'ready'].includes(instance.status) || !this.isCauldronWatch(instance)) return false;
    return this.cauldronReliefCandidates(instance).length > 0;
  }

  completeCauldronWatch(instanceId, decision, now = Date.now()) {
    const instance = this.state.tasks.find((candidate) => candidate.instanceId === instanceId);
    if (!instance || !['active', 'ready'].includes(instance.status) || !this.isCauldronWatch(instance) ||
      !['soupReady', 'relieve'].includes(decision)) return false;

    if (decision === 'soupReady') {
      this.state.chapter.soupReady = true;
      this.state.chapter.cauldronPreviousPlayerIds = [];
      if (!this.completeTask(instanceId, now)) {
        this.state.chapter.soupReady = false;
        return false;
      }
      this.log('cauldronWatchDecision', {
        instanceId,
        decision,
        interval: instance.watchInterval ?? this.state.chapter.cauldronWatchIntervals
      }, now);
      return true;
    }

    const previousPlayerIds = [...instance.assignedPlayerIds];
    const nextPlayerIds = this.cauldronReliefCandidates(instance).map((player) => player.id);
    if (!nextPlayerIds.length) return false;
    this.state.chapter.cauldronPreviousPlayerIds = previousPlayerIds;
    if (!this.completeTask(instanceId, now)) return false;
    const card = this.getTaskCard(instance);
    const queue = this.state.taskQueues[this.state.chapterIndex];
    this.state.taskQueues[this.state.chapterIndex] = [card.id, ...queue.filter((taskId) => taskId !== card.id)];
    this.log('cauldronWatchRequeued', {
      instanceId,
      taskId: card.id,
      previousPlayerIds,
      eligibleNextPlayerIds: nextPlayerIds,
      completedInterval: instance.watchInterval ?? this.state.chapter.cauldronWatchIntervals,
      stackPosition: 0
    }, now);
    return true;
  }

  taskCardCandidates(peopleMode = null, group = this.activeGroup) {
    const queue = this.state.taskQueues[this.state.chapterIndex] ?? [];
    const usedBlueprints = new Set(this.state.tasks
      .filter((instance) => instance.chapterIndex === this.state.chapterIndex)
      .map((instance) => this.getTaskCard(instance)?.blueprintIndex)
      .filter(Number.isInteger));
    return queue
      .map((taskId) => taskById(taskId))
      .filter((card) => card?.playable && !card.automatic && this.taskAppliesToCourse(card) && this.taskPrerequisitesMet(card))
      .filter((card) => this.state.chapter.stage === 'clearing' ? card.questId === 'reset' : card.questId !== 'reset')
      .filter((card) => this.taskHandoffAllowed(card, group))
      .filter((card) => !usedBlueprints.has(card.blueprintIndex) || this.recurringTaskCardAvailable(card))
      .filter((card) => peopleMode !== 'team' || card.people[1] > card.people[0])
      .filter((card) => peopleMode !== 'single' || card.people[0] === 1)
      .filter((card) => this.requiredPeopleForTask(card, peopleMode) <= this.eligibleFreePlayersForTask(card, group).length);
  }

  assignableTaskCards(peopleMode = null, group = this.activeGroup) {
    if (!group.playerIds.includes(this.activePlayer.id) || !this.isPlayerFreeForTask(this.activePlayer.id) ||
      this.state.turn.tasksAssignedThisTurn >= 1) return [];
    return this.taskCardCandidates(peopleMode, group)
      .filter((card) => this.eligibleFreePlayersForTask(card, group).some((player) => player.id === this.activePlayer.id));
  }

  hasUnassignedCourseTasks() {
    const recurringWatch = TASK_DECKS[this.state.chapterIndex].find((card) => this.isCauldronWatchCard(card));
    if (recurringWatch && this.recurringTaskCardAvailable(recurringWatch) &&
      this.state.tasks.some((instance) => instance.chapterIndex === this.state.chapterIndex && instance.taskId === recurringWatch.id)) return true;
    const assignedTaskIds = new Set(this.state.tasks
      .filter((instance) => instance.chapterIndex === this.state.chapterIndex)
      .map((instance) => instance.taskId));
    return TASK_DECKS[this.state.chapterIndex]
      .some((card) => card.playable && this.taskAppliesToCourse(card) && !assignedTaskIds.has(card.id));
  }

  currentEventStage() {
    // The clearing deck exists only to hand out the one opening clearing job.
    // Once that job is assigned, free crew members keep drawing ordinary fun
    // events while the task runs instead of seeing another clearing prompt.
    if (this.state.chapter.stage === 'clearing') {
      return this.taskCardCandidates().length ? 'tasks' : 'cooking';
    }
    if (this.state.chapter.stage === 'ingredients') return 'ingredients';
    if (this.taskCardCandidates().length) return 'tasks';
    return 'cooking';
  }

  eventQueue(stage = this.currentEventStage(), group = this.activeGroup) {
    return this.state.eventQueues[this.state.chapterIndex]?.[stage]?.[group.locationIndex] ?? [];
  }

  eventQueueForCard(event = this.currentEvent) {
    return event
      ? this.state.eventQueues[this.state.chapterIndex]?.[event.stage]?.[event.locationIndex] ?? this.eventQueue(event.stage)
      : [];
  }

  actionAvailable(actionCode) {
    switch (actionCode) {
      case 'discoverIngredient':
      case 'treasureAndIngredient': return this.currentEventStage() === 'ingredients' &&
        this.canAddIngredientThisTurn() && this.courseIngredientCandidates().length > 0;
      case 'lockIngredient': return this.currentEventStage() === 'ingredients' &&
        this.canLockIngredient(this.ingredientActionTarget());
      case 'returnIngredient': return this.currentEventStage() === 'ingredients' && Boolean(this.ingredientActionTarget());
      case 'swapIngredient': {
        const ingredient = this.ingredientActionTarget();
        return Boolean(ingredient && this.swapIngredientAlternatives(ingredient).length);
      }
      case 'drawTask':
      case 'treasureAndTask': return this.currentEventStage() === 'tasks' && this.assignableTaskCards().length > 0;
      case 'singleTask': return this.currentEventStage() === 'tasks' && this.assignableTaskCards('single').length > 0;
      case 'teamTask': return this.currentEventStage() === 'tasks' && this.assignableTaskCards('team').length > 0;
      case 'watchChallenge':
      case 'watchChallengeAlt':
      case 'treasureAndWatch': return ['ingredients', 'tasks', 'cooking'].includes(this.currentEventStage()) &&
        this.watchChallengeCandidates(actionCode).length > 0;
      case 'fiveMinuteBreak': return ['ingredients', 'cooking'].includes(this.currentEventStage()) && !this.hasOpenTasks() &&
        this.state.chapter.funCardIdsDrawn.length < this.funCardLimit() &&
        !this.state.funCardsDrawn.includes('five-minute-break');
      case 'treasure':
      case 'coinLoss': return true;
      case 'chain':
      case 'treasureAndChain': return this.state.turn.chainDepth < MAX_EVENT_CHAIN_DEPTH;
      default: return false;
    }
  }

  fallbackActions(stage = this.currentEventStage()) {
    const candidates = stage === 'ingredients'
      ? ['discoverIngredient', 'lockIngredient', 'returnIngredient', 'swapIngredient', 'treasureAndIngredient']
      : stage === 'tasks'
        ? ['drawTask', 'teamTask', 'singleTask', 'watchChallenge', 'coinLoss', 'treasure']
        : ['watchChallenge', 'watchChallengeAlt', 'treasure', 'treasureAndWatch'];
    return candidates.filter((action) => this.actionAvailable(action));
  }

  contextualizeEvent(event) {
    const fallbacks = this.fallbackActions(event.stage);
    if (event.type === 'choice') {
      const options = [...new Set((event.options ?? []).filter((action) => this.actionAvailable(action)))];
      return this.contextualizeIngredientText({
        ...event,
        options: options.length ? options : fallbacks.slice(0, 2)
      });
    }
    const pool = [...new Set([...(event.outcomes ?? []), ...fallbacks, 'coinLoss', 'treasure'])]
      .filter((action) => this.actionAvailable(action));
    const outcomes = [];
    (event.outcomes ?? []).forEach((action) => {
      const selected = this.actionAvailable(action) && !outcomes.includes(action)
        ? action
        : pool.find((candidate) => !outcomes.includes(candidate));
      if (selected) outcomes.push(selected);
    });
    while (outcomes.length < 3) {
      const selected = pool.find((candidate) => !outcomes.includes(candidate));
      if (!selected) break;
      outcomes.push(selected);
    }
    return this.contextualizeIngredientText({ ...event, outcomes });
  }

  taskForAction(actionCode) {
    const mode = actionCode === 'teamTask' ? 'team' : actionCode === 'singleTask' ? 'single' : null;
    return this.assignableTaskCards(mode, this.activeGroup)[0] ?? null;
  }

  watchChallengeForAction(actionCode, event = this.currentEvent) {
    const candidates = this.watchChallengeCandidates(actionCode);
    if (!candidates.length) return null;
    const offset = actionCode === 'watchChallengeAlt' ? 1 : 0;
    const challenge = candidates[offset % candidates.length];
    const targetPlayerId = this.state.players[(this.state.activePlayerIndex + 1) % this.state.players.length].id;
    return this.personalizeWatchChallenge(challenge, targetPlayerId, this.coopPartnerPlayerIds(challenge));
  }

  challengeRequirementsMet(challenge) {
    if (!challenge) return false;
    if (challenge.cooperative && this.availableCoopPartners().length < challenge.partnerCount) return false;
    const openChapterTasks = this.state.tasks.filter((instance) =>
      instance.chapterIndex === this.state.chapterIndex && ['queued', 'active', 'ready'].includes(instance.status)
    );
    return (challenge.requirements ?? []).every((requirement) => {
      switch (requirement) {
        case 'openTask': return openChapterTasks.length > 0;
        case 'usedIngredientPerPlayer':
          return this.state.ingredients.filter((ingredient) => ingredient.status === 'used').length >= this.state.players.length;
        case 'courseWorkStarted':
          return this.state.tasks.some((instance) => instance.chapterIndex === this.state.chapterIndex && instance.startedAt != null);
        case 'taskTimerRunning':
          return openChapterTasks.some((instance) => instance.endAt && ['active', 'ready'].includes(instance.status));
        case 'hazardousTaskOpen':
          return openChapterTasks.some((instance) => Boolean(this.getTaskCard(instance)?.safety));
        case 'twoFreeGuessers': return this.availableCoopPartners().length >= 2;
        default: return false;
      }
    });
  }

  funCardLimit() {
    return this.currentChapter.id === 'main' ? MAIN_FUN_CARDS_PER_CHAPTER : DEFAULT_FUN_CARDS_PER_CHAPTER;
  }

  mainOvenJourneyStarted() {
    if (this.currentChapter.id !== 'main') return false;
    return this.state.tasks.some((instance) => {
      if (instance.chapterIndex !== this.state.chapterIndex || instance.startedAt == null) return false;
      const card = this.getTaskCard(instance);
      return card?.questId === 'oven';
    });
  }

  watchChallengeCandidates(actionCode = 'watchChallenge') {
    if (this.state.chapter.funCardIdsDrawn.length >= this.funCardLimit()) return [];
    const roundKey = String(this.state.chapter.round);
    const used = new Set(this.state.chapter.challengeIdsByRound[roundKey] ?? []);
    const active = new Set(this.state.activeChallenges.map((instance) => instance.challengeId));
    const drawn = new Set(this.state.funCardsDrawn);
    const challengesById = new Map(WATCH_CHALLENGES.map((entry) => [entry.id, entry]));
    const available = this.state.funCardQueue
      .map((id) => challengesById.get(id))
      .filter((entry) => entry && !entry.followUpOnly && entry.id !== 'five-minute-break' && !active.has(entry.id) &&
        !drawn.has(entry.id) && this.challengeRequirementsMet(entry));
    const pool = available.filter((entry) => !used.has(entry.id));
    const candidates = pool.length ? pool : available;
    if (!this.mainOvenJourneyStarted()) return candidates;
    return [
      ...candidates.filter((entry) => entry.cooperative),
      ...candidates.filter((entry) => !entry.cooperative)
    ];
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
    const pendingStory = this.pendingLocationStoryForCurrentChapter();
    if (pendingStory && this.state.turn.phase === 'draw') return pendingStory;
    const scout = this.activePlayer.roleId === 'scout' && this.isPassiveEnabled(this.activePlayer);
    const storedEffect = this.nextStoredIngredientEffect('event');
    const revealsEvent = ['revealEvent', 'nextPlayer'].includes(storedEffect?.effect);
    if ((!scout && !revealsEvent) || this.state.turn.phase !== 'draw') return null;
    const pendingQuiz = this.storyQuizDue() ? this.eligibleStoryQuiz() : null;
    if (pendingQuiz) return pendingQuiz;
    const queue = this.eventQueue();
    const event = eventById(queue[0]);
    return event ? this.contextualizeEvent(event) : null;
  }

  registerLocationVisit(chapterIndex, locationIndex, now = Date.now(), { log = true } = {}) {
    const card = locationStoryCard(chapterIndex, locationIndex);
    const islandCard = islandStoryCard(chapterIndex);
    if (!card || !islandCard) return false;
    const key = storyLocationKey(chapterIndex, locationIndex);
    const firstVisit = !this.state.visitedLocationIds.includes(key);
    if (firstVisit) this.state.visitedLocationIds.push(key);
    const islandStoryAlreadyKnown = this.state.eventsDrawn.includes(islandCard.id) || this.state.pendingLocationStoryIds.includes(islandCard.id);
    if (!islandStoryAlreadyKnown) {
      const firstChapterStoryIndex = this.state.pendingLocationStoryIds.findIndex((storyId) =>
        storyCardById(storyId)?.chapterIndex === chapterIndex
      );
      if (firstChapterStoryIndex < 0) this.state.pendingLocationStoryIds.push(islandCard.id);
      else this.state.pendingLocationStoryIds.splice(firstChapterStoryIndex, 0, islandCard.id);
    }
    const storyAlreadyKnown = this.state.eventsDrawn.includes(card.id) || this.state.pendingLocationStoryIds.includes(card.id);
    if (!storyAlreadyKnown) this.state.pendingLocationStoryIds.push(card.id);
    if (firstVisit && log) {
      this.log('storyLocationVisited', { chapterIndex, locationIndex, locationKey: key, islandStoryCardId: islandCard.id, storyCardId: card.id }, now);
    }
    return firstVisit || !islandStoryAlreadyKnown || !storyAlreadyKnown;
  }

  pendingLocationStoryForCurrentChapter() {
    const id = this.state.pendingLocationStoryIds.find((storyId) =>
      storyCardById(storyId)?.chapterIndex === this.state.chapterIndex
    );
    return id ? storyCardById(id) : null;
  }

  storyQuizPrerequisitesMet(card) {
    if (!card || card.storyKind !== 'quiz') return false;
    const requirements = card.requirements ?? {};
    const visited = new Set(this.state.visitedLocationIds);
    const drawn = new Set(this.state.eventsDrawn);
    return (requirements.storyIds ?? []).every((id) => drawn.has(id)) &&
      (requirements.visitedLocationIds ?? []).every((id) => visited.has(id)) &&
      (requirements.unvisitedLocationIds ?? []).every((id) => !visited.has(id));
  }

  eligibleStoryQuiz() {
    const quizId = this.state.storyQuizQueue.find((id) => this.storyQuizPrerequisitesMet(storyCardById(id)));
    return quizId ? storyCardById(quizId) : null;
  }

  storyQuizDue() {
    return this.state.turn.chainDepth === 0 &&
      (this.state.chapter.storyQuizIdsDrawn?.length ?? 0) < 3 &&
      this.state.chapter.eventsResolved >= this.state.chapter.nextStoryQuizAt;
  }

  openStoryCard(card, now = Date.now()) {
    if (!card || this.state.turn.phase !== 'draw') return null;
    if (['island', 'location'].includes(card.storyKind)) {
      const pendingIndex = this.state.pendingLocationStoryIds.indexOf(card.id);
      if (pendingIndex < 0) return null;
      this.state.pendingLocationStoryIds.splice(pendingIndex, 1);
    } else if (card.storyKind === 'quiz') {
      if (!this.storyQuizPrerequisitesMet(card)) return null;
      const quizIndex = this.state.storyQuizQueue.indexOf(card.id);
      if (quizIndex < 0) return null;
      this.state.storyQuizQueue.splice(quizIndex, 1);
      this.state.chapter.storyQuizIdsDrawn.push(card.id);
      const nextQuiz = randomInt(this.state.rngState, 5, 8);
      this.state.rngState = nextQuiz.state;
      this.state.chapter.nextStoryQuizAt = this.state.chapter.eventsResolved + nextQuiz.value;
    } else return null;
    this.state.turn.currentEventId = card.id;
    this.state.turn.phase = 'event';
    if (!this.state.eventsDrawn.includes(card.id)) this.state.eventsDrawn.push(card.id);
    this.state.turn.eventChoiceSignature = card.storyKind === 'quiz' ? `story-quiz:${card.id}` : `story-${card.storyKind}:${card.id}`;
    this.state.turn.eventSignature = this.state.turn.eventChoiceSignature;
    this.log('storyCardDrawn', {
      eventId: card.id,
      storyKind: card.storyKind,
      mandatory: Boolean(card.mandatory),
      playerId: this.activePlayer.id
    }, now);
    return card;
  }

  completeStoryCard(now = Date.now()) {
    const card = this.currentEvent;
    if (this.state.turn.phase !== 'event' || !['island', 'location'].includes(card?.storyKind)) return false;
    this.state.turn.outcomeCode = 'storyRead';
    this.state.turn.phase = 'resolved';
    if (card.storyKind === 'location') this.markEventResolved(card, now);
    else this.log('eventResolved', { eventId: card.id, outcomeCode: this.state.turn.outcomeCode, dieResult: null }, now);
    this.log(card.storyKind === 'island' ? 'islandStoryRead' : 'locationStoryRead', {
      eventId: card.id,
      chapterIndex: card.chapterIndex,
      locationKey: card.locationKey ?? null
    }, now);
    this.evaluateChapter(now);
    return true;
  }

  answerStoryQuiz(answerId, now = Date.now()) {
    const card = this.currentEvent;
    if (this.state.turn.phase !== 'event' || card?.storyKind !== 'quiz' ||
      !card.answers.some((answer) => answer.id === answerId)) return false;
    const correct = answerId === card.correctAnswerId;
    const requestedCoins = correct ? 3 : -3;
    this.addCoins(requestedCoins, 'storyQuiz', now);
    const modifiedCoins = this.state.lastCoinChange?.modifiedAmount ?? requestedCoins;
    const appliedCoins = this.state.lastCoinChange?.appliedAmount ?? modifiedCoins;
    this.state.turn.storyAnswerId = answerId;
    this.state.turn.storyAnswerCorrect = correct;
    this.state.turn.storyCoinDelta = modifiedCoins;
    this.state.turn.outcomeCode = correct ? 'storyQuizCorrect' : 'storyQuizWrong';
    this.state.turn.phase = 'resolved';
    this.markEventResolved(card, now);
    this.log('storyQuizAnswered', {
      eventId: card.id,
      answerId,
      correct,
      requestedCoins,
      modifiedCoins,
      appliedCoins
    }, now);
    return true;
  }

  distinctEventReplacementAvailable(event = this.currentEvent) {
    if (!event || event.storyKind) return false;
    const stageQueues = this.state.eventQueues[this.state.chapterIndex]?.[event.stage] ?? [];
    const alreadyDrawn = new Set(this.state.eventsDrawn);
    return stageQueues.some((queue) => queue.some((eventId) => {
      if (eventId === event.id || alreadyDrawn.has(eventId)) return false;
      const candidate = eventById(eventId);
      return Boolean(candidate) && !(event.stage === 'cooking' && this.hasUnassignedCourseTasks() && candidate.archetype === 'watch');
    }));
  }

  beginEvent(now = Date.now(), skipStoredIngredientEffect = false) {
    if (this.state.status !== 'active' || this.state.turn.phase !== 'draw') return null;
    if (this.state.chapterIndex === 1 && this.state.chapter.stage === 'ingredients' && !this.state.chapter.courseStyle) {
      this.state.turn.phase = 'courseDecision';
      this.log('soupStyleChoiceStarted', {}, now);
      return { courseDecision: 'soupStyle' };
    }
    if (this.currentChapter.id === 'cocktails' && this.state.chapter.stage === 'ingredients' &&
      !Number.isInteger(this.state.chapter.cocktailSpiritTarget)) {
      this.startCocktailSpiritCountChoice(now);
      return { courseDecision: 'cocktailSpiritCount' };
    }
    if (this.currentChapter.id === 'cocktails' && this.state.chapter.stage === 'ingredients' &&
      this.ingredientsLockedForCourse() && this.cocktailCompositionReady() && !this.cocktailTechniquesReady()) {
      this.startCocktailTechniqueChoice(now);
      return { courseDecision: 'cocktailTechnique', team: this.state.turn.pendingCocktailTeam };
    }
    // A target can become complete between two cards, for example through an
    // automatically locked final-course ingredient. Move to the matching deck
    // before drawing so an exhausted ingredient round cannot strand a die card.
    this.updateChapterStage(now);
    const group = this.activeGroup;
    this.evaluateChapter(now);
    if (this.state.turn.phase === 'chapterReady') return null;
    this.releaseDueFollowUps(false, now);
    const chapterWorkDone = !this.hasUnassignedCourseTasks() &&
      this.state.tasks.filter((task) => task.chapterIndex === this.state.chapterIndex).every((task) => task.status === 'done') &&
      this.state.groups.every((candidate) => candidate.finished);
    if (chapterWorkDone && !this.state.chapter.queuedChallenges.length && this.state.chapter.scheduledChallenges.length) {
      this.releaseDueFollowUps(true, now);
    }
    if (this.state.chapter.queuedChallenges.length) {
      this.startWatchChallenge('watchChallenge', now, { mandatoryFollowUp: true });
      return this.currentWatchChallenge;
    }
    const pendingStory = this.pendingLocationStoryForCurrentChapter();
    if (pendingStory && this.state.turn.chainDepth === 0) return this.openStoryCard(pendingStory, now);
    if (this.storyQuizDue()) {
      const storyQuiz = this.eligibleStoryQuiz();
      if (storyQuiz) return this.openStoryCard(storyQuiz, now);
    }
    const stage = this.currentEventStage();
    const stageQueues = this.state.eventQueues[this.state.chapterIndex][stage];
    const preferredQueue = this.eventQueue(stage, group);
    const alreadyDrawn = new Set(this.state.eventsDrawn);
    const appropriate = (eventId) => {
      const candidate = eventById(eventId);
      if (!candidate || alreadyDrawn.has(eventId) ||
        (stage === 'cooking' && this.hasUnassignedCourseTasks() && candidate.archetype === 'watch')) return false;
      const contextualized = this.contextualizeEvent(candidate);
      const actions = contextualized.type === 'choice' ? contextualized.options : contextualized.outcomes;
      return (actions ?? []).length > 0;
    };
    const controlSignature = (event) => event
      ? `${event.type}:${[...new Set(event.options ?? event.outcomes ?? [])].sort().join('|')}`
      : null;
    const eventSignature = (event) => event
      ? `${event.archetype ?? ''}:${event.funVariant ?? ''}`
      : null;
    const candidateSignatures = (eventId) => {
      const candidate = eventById(eventId);
      const contextualized = candidate ? this.contextualizeEvent(candidate) : null;
      return { controls: controlSignature(contextualized), event: eventSignature(contextualized) };
    };
    const findQueue = (predicate) => {
      if (preferredQueue.some(predicate)) return preferredQueue;
      return stageQueues.find((locationQueue) => locationQueue.some(predicate)) ?? null;
    };
    const chainActive = this.state.turn.chainDepth > 0;
    const chainEventSignatures = new Set([
      ...(this.state.turn.chainEventSignatures ?? []),
      this.state.turn.previousEventSignature
    ].filter(Boolean));
    const chainChoiceSignatures = new Set([
      ...(this.state.turn.chainEventChoiceSignatures ?? []),
      this.state.turn.previousEventChoiceSignature
    ].filter(Boolean));
    let queue = preferredQueue;
    const fullyDistinct = (eventId) => {
      if (!appropriate(eventId) || eventId === this.state.turn.previousEventId) return false;
      const signatures = candidateSignatures(eventId);
      return !chainEventSignatures.has(signatures.event) && !chainChoiceSignatures.has(signatures.controls);
    };
    const visiblyDistinct = (eventId) => {
      if (!appropriate(eventId) || eventId === this.state.turn.previousEventId) return false;
      return !chainEventSignatures.has(candidateSignatures(eventId).event);
    };
    queue = findQueue(fullyDistinct) ?? findQueue(visiblyDistinct) ?? (chainActive ? null : findQueue(appropriate)) ?? preferredQueue;
    let eventIndex = queue.findIndex(fullyDistinct);
    if (eventIndex < 0) eventIndex = queue.findIndex(visiblyDistinct);
    if (eventIndex < 0 && !chainActive) eventIndex = queue.findIndex(appropriate);
    if (eventIndex < 0) {
      if (chainActive) {
        this.state.turn.chainPending = false;
        this.state.turn.outcomeCode = 'chainComplete';
        this.state.turn.phase = 'resolved';
        this.log('eventChainCompleted', { playerId: this.activePlayer.id, chainDepth: this.state.turn.chainDepth, reason: 'noDistinctEvent' }, now);
        return { fallback: true, action: 'chainComplete' };
      }
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
        this.state.turn.outcomeCode = 'quietHandover';
        this.state.turn.phase = 'resolved';
        this.log('quietHandover', { playerId: this.activePlayer.id, reason: 'noIngredientActionForPlayer' }, now);
        return { fallback: true, action: 'quietHandover' };
      }
      if (stage === 'tasks' && this.assignableTaskCards().length) {
        const task = this.assignTask({ group, now });
        this.briefTask(task, true, now);
        this.log('fallbackTaskAssigned', { instanceId: task.instanceId }, now);
        return task;
      }
      if (this.hasOpenTasks()) {
        this.state.busyAfterPlayerIndex = this.state.activePlayerIndex;
        this.state.busyReason = 'waitingForTask';
        this.state.turn.phase = 'crewBusy';
        this.log('crewWaitingForTask', { afterPlayerId: this.activePlayer.id, reason: 'noPlayableCards' }, now);
        return { waitingForTask: true };
      }
      if (this.hasUnassignedCourseTasks()) {
        this.state.turn.outcomeCode = 'quietHandover';
        this.state.turn.phase = 'resolved';
        this.log('quietHandover', { playerId: this.activePlayer.id, reason: 'nextTaskNeedsDifferentPlayer' }, now);
        return { fallback: true, action: 'quietHandover' };
      }
      return null;
    }
    const eventId = queue.splice(eventIndex, 1)[0];
    this.state.turn.currentEventId = eventId;
    this.state.turn.phase = 'event';
    this.state.eventsDrawn.push(eventId);
    // Ingredient ids never live on queued event cards. Bind a concrete target
    // only after this card has actually left the stack and is being revealed.
    this.captureIngredientActionTarget(this.currentEvent);
    this.state.turn.eventChoiceSignature = controlSignature(this.currentEvent);
    this.state.turn.eventSignature = eventSignature(this.currentEvent);
    this.log('eventDrawn', { eventId, stage, playerId: this.activePlayer.id, groupId: group.id }, now);

    const pendingStoredEventEffect = skipStoredIngredientEffect ? null : this.nextStoredIngredientEffect('event');
    const storedEventEffect = pendingStoredEventEffect?.effect !== 'replaceEvent' ||
      this.distinctEventReplacementAvailable(this.currentEvent)
      ? pendingStoredEventEffect
      : null;
    if (storedEventEffect) this.consumeStoredIngredientEffect(storedEventEffect.effect, 'event', now);

    if (storedEventEffect?.effect === 'replaceEvent') {
      if (this.state.eventsDrawn.at(-1) === eventId) this.state.eventsDrawn.pop();
      queue.push(eventId);
      this.log('eventReplacedByIngredient', { eventId }, now);
      const turnContext = continuedTurnContext(this.state.turn);
      this.state.turn = { ...freshTurn(), ...turnContext };
      return this.beginEvent(now, true);
    }

    if (storedEventEffect?.effect === 'ignoreEvent') {
      this.state.turn.outcomeCode = 'ignored';
      this.state.turn.phase = 'resolved';
      this.log('eventIgnoredByBonus', { eventId }, now);
      this.markEventResolved(this.currentEvent, now);
    }
    return this.currentEvent;
  }

  completeWatchChallenge(now = Date.now(), outcome = null) {
    if (this.state.turn.phase !== 'watch' || !this.currentWatchChallenge) return false;
    const challenge = this.currentWatchChallenge;
    if (challenge.playerSelection && !this.state.turn.watchTargetPlayerId) return false;
    if (challenge.flow === 'ongoing' || (challenge.secret && this.state.turn.watchStartedAt == null)) return false;
    if (challenge.skillCheck && !['success', 'failure'].includes(outcome)) return false;
    this.state.chapter.watchChallenges += 1;
    if (challenge.followUpOnly) {
      const curse = this.state.activeChallenges.find((instance) => {
        const source = WATCH_CHALLENGES.find((entry) => entry.id === instance.challengeId);
        return source?.followUpId === challenge.id && instance.ownerPlayerId === this.state.turn.watchTargetPlayerId;
      });
      if (curse) this.completeActiveChallenge(curse, 'followUp', now);
    }
    const requestedCoins = challenge.skillCheck
      ? (outcome === 'success' ? challenge.successCoins : challenge.failureCoins)
      : challenge.coins;
    const appliedCoins = requestedCoins ? this.addCoins(requestedCoins, 'challenge', now) : 0;
    const modifiedCoins = requestedCoins ? (this.state.lastCoinChange?.modifiedAmount ?? requestedCoins) : 0;
    if (challenge.followUpId) this.scheduleFollowUp(challenge, this.activePlayer.id, now);
    this.state.turn.watchOutcome = challenge.skillCheck ? outcome : null;
    this.state.turn.watchCoinDelta = modifiedCoins;
    this.state.turn.watchCoinApplied = appliedCoins;
    this.state.turn.outcomeCode = challenge.skillCheck
      ? (outcome === 'success' ? 'watchSuccess' : 'watchFailure')
      : 'watchComplete';
    this.state.turn.phase = 'resolved';
    this.log('watchChallengeCompleted', {
      challengeId: challenge.id,
      coins: modifiedCoins,
      requestedCoins,
      appliedCoins,
      outcome: challenge.skillCheck ? outcome : null,
      skillCheck: challenge.skillCheck
    }, now);
    if (this.currentEvent) this.markEventResolved(this.currentEvent, now);
    return true;
  }

  resolveWatchChallengeOutcome(outcome, now = Date.now()) {
    if (!this.currentWatchChallenge?.skillCheck || !['success', 'failure'].includes(outcome)) return false;
    return this.completeWatchChallenge(now, outcome);
  }

  selectWatchChallengePlayer(playerId) {
    const challenge = this.currentWatchChallenge;
    if (this.state.turn.phase !== 'watch' || !challenge?.playerSelection ||
      !this.state.players.some((player) => player.id === playerId)) return false;
    this.state.turn.watchTargetPlayerId = playerId;
    return true;
  }

  confirmWatchChallengePlayer(now = Date.now()) {
    const challenge = this.currentWatchChallenge;
    const playerId = this.state.turn.watchTargetPlayerId;
    if (this.state.turn.phase !== 'watch' || !challenge?.playerSelection ||
      !this.state.players.some((player) => player.id === playerId)) return false;
    this.state.chapter.portionCaptainPlayerId = playerId;
    this.log('watchPlayerAssigned', { challengeId: challenge.id, playerId }, now);
    return this.completeWatchChallenge(now);
  }

  activateOngoingWatchChallenge(now = Date.now()) {
    if (this.state.turn.phase !== 'watch' || !this.currentWatchChallenge || this.currentWatchChallenge.flow !== 'ongoing') return false;
    const challenge = this.currentWatchChallenge;
    if (challenge.secret && this.state.turn.watchSecretRevealedAt == null) return false;
    this.state.turn.watchStartedAt = now;
    const ownerPlayerId = this.activePlayer.id;
    const instance = {
      instanceId: `watch-${this.state.chapterIndex}-${this.state.chapter.watchChallenges + 1}-${challenge.id}`,
      challengeId: challenge.id,
      chapterIndex: this.state.chapterIndex,
      ownerPlayerId,
      targetPlayerId: this.state.turn.watchTargetPlayerId,
      endTrigger: challenge.endTrigger,
      startedAt: now
    };
    this.state.chapter.watchChallenges += 1;
    this.state.activeChallenges.push(instance);
    if (challenge.followUpId) this.scheduleFollowUp(challenge, ownerPlayerId, now);
    this.state.turn.outcomeCode = 'watchActive';
    this.state.turn.phase = 'resolved';
    this.log('watchChallengeActivated', { challengeId: challenge.id, instanceId: instance.instanceId, ownerPlayerId, targetPlayerId: instance.targetPlayerId }, now);
    if (this.currentEvent) this.markEventResolved(this.currentEvent, now);
    return true;
  }

  startWatchChallengeAction(now = Date.now()) {
    const challenge = this.currentWatchChallenge;
    if (this.state.turn.phase !== 'watch' || !challenge?.secret || challenge.flow !== 'immediate' ||
      this.state.turn.watchSecretRevealedAt == null || this.state.turn.watchStartedAt != null) return false;
    this.state.turn.watchStartedAt = now;
    this.state.turn.watchEndsAt = now + challenge.durationSeconds * 1000;
    this.log('watchChallengeActionStarted', { challengeId: challenge.id, playerId: this.activePlayer.id }, now);
    return true;
  }

  revealSecretWatchChallenge(now = Date.now()) {
    const challenge = this.currentWatchChallenge;
    if (this.state.turn.phase !== 'watch' || !challenge?.secret || this.state.turn.watchSecretRevealedAt != null) return false;
    this.state.turn.watchSecretRevealedAt = now;
    this.log('watchChallengeSecretRevealed', { challengeId: challenge.id, playerId: this.activePlayer.id }, now);
    return true;
  }

  resolveChoice(actionCode, now = Date.now(), ingredientTargetId = null) {
    const event = this.currentEvent;
    if (!event || event.type !== 'choice' || this.state.turn.phase !== 'event') return false;
    if (!actionCode && event.options.length === 0) return false;
    if (!event.options.includes(actionCode)) {
      throw new Error(`Choice is not available on this event: ${String(actionCode)} for ${event.id} (${event.stage}).`);
    }
    if (['lockIngredient', 'returnIngredient', 'swapIngredient'].includes(actionCode)) {
      const target = this.ingredientActionTarget();
      if (!target || (ingredientTargetId && ingredientTargetId !== target.id)) return false;
      // Pin the concrete id before applying the card. This also protects calls
      // restored from a turn that predates ingredient target ids.
      this.state.turn.ingredientActionTargetId = target.id;
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
    if (this.state.turn.phase !== 'rolled' || !this.consumeStoredIngredientEffect('rerollDie', 'dice', now)) return null;
    const roll = randomInt(this.state.rngState, 1, 6);
    this.state.rngState = roll.state;
    this.state.turn.dieResult = roll.value;
    this.log('dieRerolledByIngredient', { value: roll.value, playerId: this.activePlayer.id }, now);
    return roll.value;
  }

  adjustDieWithIngredient(amount, now = Date.now()) {
    if (!this.canAdjustDieWithIngredient(amount) ||
      !this.consumeStoredIngredientEffect('adjustDie', 'dice', now)) return false;
    this.state.turn.dieResult += Number(amount);
    this.log('dieAdjustedByIngredient', { amount: Number(amount), value: this.state.turn.dieResult }, now);
    return true;
  }

  dieAdjustmentAvailable(amount = null) {
    if (this.state.turn.phase !== 'rolled' || !Number.isInteger(this.state.turn.dieResult)) return false;
    if (amount == null) return this.state.turn.dieResult >= 1 && this.state.turn.dieResult <= 6;
    const adjustment = Number(amount);
    if (![-1, 1].includes(adjustment)) return false;
    const adjusted = this.state.turn.dieResult + adjustment;
    return adjusted >= 1 && adjusted <= 6;
  }

  canAdjustDieWithIngredient(amount = null) {
    return this.nextStoredIngredientEffect('dice')?.effect === 'adjustDie' && this.dieAdjustmentAvailable(amount);
  }

  confirmRoll(now = Date.now()) {
    const event = this.currentEvent;
    if (!event || event.type !== 'dice' || this.state.turn.phase !== 'rolled') return false;
    let value = this.state.turn.dieResult;
    const storedDiceEffect = this.nextStoredIngredientEffect('dice');
    if (storedDiceEffect?.effect === 'doubleDie' && this.consumeStoredIngredientEffect('doubleDie', 'dice', now)) {
      value = Math.min(6, value * 2);
      this.state.turn.dieResult = value;
    } else if (['rerollDie', 'adjustDie'].includes(storedDiceEffect?.effect)) {
      const skippedEffect = this.consumeStoredIngredientEffect(storedDiceEffect.effect, 'dice', now);
      if (skippedEffect) {
        this.log('ingredientEffectSkipped', {
          effect: skippedEffect.effect,
          ingredientId: skippedEffect.ingredientId ?? null,
          playerId: this.activePlayer.id,
          reason: 'rollConfirmedWithoutUse'
        }, now);
      }
    }
    const outcomeIndex = value <= 2 ? 0 : value <= 4 ? 1 : 2;
    const actionCode = event.outcomes[outcomeIndex] ?? event.outcomes.at(-1) ?? this.fallbackActions(event.stage)[0];
    if (!actionCode) return false;
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
    const ingredientTargetId = context === 'event' ? this.state.turn.ingredientActionTargetId : null;
    switch (actionCode) {
      case 'drawTask': return this.prepareTaskAssignment({ group: this.activeGroup, now });
      case 'singleTask': return this.prepareTaskAssignment({ group: this.activeGroup, peopleMode: 'single', now });
      case 'teamTask': return this.prepareTaskAssignment({ group: this.activeGroup, peopleMode: 'team', now });
      case 'discoverIngredient': return this.prepareIngredientChoice(null, context, {}, now);
      case 'treasureAndIngredient':
        this.addCoins(COIN_VALUES.event, 'event', now);
        return this.prepareIngredientChoice(null, context, {}, now);
      case 'lockIngredient': this.lockLastIngredient(now, null, ingredientTargetId); break;
      case 'returnIngredient': this.returnLastIngredient(now, ingredientTargetId); break;
      case 'treasure': this.addCoins(COIN_VALUES.event, 'event', now); break;
      case 'coinLoss': this.addCoins(COIN_VALUES.coinLoss, 'event', now); break;
      case 'fiveMinuteBreak': return this.startWatchChallenge('fiveMinuteBreak', now);
      case 'treasureAndChain':
        this.addCoins(COIN_VALUES.event, 'event', now);
        if (this.state.turn.chainDepth < MAX_EVENT_CHAIN_DEPTH) this.state.turn.chainPending = true;
        break;
      case 'treasureAndTask':
        this.addCoins(COIN_VALUES.event, 'event', now);
        return this.prepareTaskAssignment({ group: this.activeGroup, now });
      case 'watchChallenge':
      case 'watchChallengeAlt': this.startWatchChallenge(actionCode, now); return true;
      case 'treasureAndWatch':
        this.addCoins(COIN_VALUES.event, 'event', now);
        this.startWatchChallenge('watchChallenge', now);
        return true;
      case 'chain':
        if (this.state.turn.chainDepth < MAX_EVENT_CHAIN_DEPTH) this.state.turn.chainPending = true;
        break;
      case 'swapIngredient': this.swapLastIngredient(now, ingredientTargetId); break;
      default: throw new Error(`Unknown action: ${actionCode}`);
    }
    return false;
  }

  startWatchChallenge(actionCode = 'watchChallenge', now = Date.now(), logData = {}) {
    if (actionCode === 'fiveMinuteBreak' && this.hasOpenTasks()) return false;
    if (actionCode === 'fiveMinuteBreak' && this.state.chapter.funCardIdsDrawn.length >= this.funCardLimit()) return false;
    const event = this.currentEvent;
    const drawn = new Set(this.state.funCardsDrawn);
    let challenge;
    let targetPlayerId = this.state.players[(this.state.activePlayerIndex + 1) % this.state.players.length].id;
    if (actionCode === 'fiveMinuteBreak') {
      challenge = WATCH_CHALLENGES.find((entry) => entry.id === 'five-minute-break');
    } else {
      while (this.state.chapter.queuedChallenges.length && !challenge) {
        const queued = this.state.chapter.queuedChallenges.shift();
        if (drawn.has(queued.id)) continue;
        const queuedChallenge = WATCH_CHALLENGES.find((entry) => entry.id === queued.id);
        if (queuedChallenge?.cooperative && !this.challengeRequirementsMet(queuedChallenge)) continue;
        challenge = queuedChallenge;
        targetPlayerId = queued.targetPlayerId;
      }
    }
    if (!challenge && actionCode !== 'fiveMinuteBreak') {
      const roundKey = String(this.state.chapter.round);
      const used = new Set(this.state.chapter.challengeIdsByRound[roundKey] ?? []);
      const candidates = this.watchChallengeCandidates(actionCode);
      if (!candidates.length) return false;
      const offset = actionCode === 'watchChallengeAlt' ? 1 : 0;
      challenge = candidates[offset % candidates.length];
      this.state.chapter.challengeIdsByRound[roundKey] = [...used, challenge.id];
    }
    if (!challenge || drawn.has(challenge.id)) return false;
    this.state.funCardsDrawn.push(challenge.id);
    this.state.chapter.funCardIdsDrawn.push(challenge.id);
    this.state.turn.watchChallengeId = challenge.id;
    this.state.turn.watchChallengeIndex = WATCH_CHALLENGES.findIndex((entry) => entry.id === challenge.id);
    this.state.turn.watchTargetPlayerId = challenge.playerSelection ? null : targetPlayerId;
    this.state.turn.watchPartnerPlayerIds = this.coopPartnerPlayerIds(challenge);
    this.state.turn.watchSecretRevealedAt = challenge.secret ? null : now;
    this.state.turn.watchStartedAt = challenge.playerSelection || challenge.secret ? null : now;
    this.state.turn.watchEndsAt = challenge.playerSelection || challenge.secret ? null : now + challenge.durationSeconds * 1000;
    this.state.turn.phase = 'watch';
    this.log('watchChallengeStarted', {
      challengeId: challenge.id,
      playerId: this.activePlayer.id,
      partnerPlayerIds: this.state.turn.watchPartnerPlayerIds,
      eventId: event?.id ?? null,
      ...logData
    }, now);
    return true;
  }

  coinLossPreview(amount = COIN_VALUES.coinLoss) {
    const requestedAmount = Number(amount) || 0;
    const player = this.activePlayer;
    if (requestedAmount >= 0 || !player || !this.isPassiveEnabled(player)) {
      return { amount: requestedAmount, dice: false };
    }
    if (player.roleId === 'gambler' && requestedAmount === COIN_VALUES.coinLoss) {
      return { amount: null, dice: true, minimumLoss: 1, maximumLoss: 6 };
    }
    if (player.roleId === 'lucky') return { amount: Math.min(0, requestedAmount + 1), dice: false };
    if (player.roleId === 'unlucky') return { amount: requestedAmount - 1, dice: false };
    return { amount: requestedAmount, dice: false };
  }

  addCoins(amount = 1, source = 'event', now = Date.now(), options = {}) {
    const requestedAmount = Number(amount) || 0;
    let modifiedAmount = requestedAmount + (Number(options.taskCoinAdjustment) || 0);
    const skipRoleModifiers = options.skipRoleModifiers || source === 'taskUndo';
    let gamblerRoll = null;
    const affectedPlayers = source === 'task'
      ? [...new Set(options.playerIds ?? [])]
        .map((playerId) => this.state.players.find((player) => player.id === playerId))
        .filter(Boolean)
      : [this.activePlayer].filter(Boolean);

    if (!skipRoleModifiers && source === 'event' && requestedAmount === COIN_VALUES.coinLoss) {
      const gambler = affectedPlayers.find((player) => player.roleId === 'gambler' && this.isPassiveEnabled(player));
      if (gambler) {
        const roll = randomInt(this.state.rngState, 1, 6);
        this.state.rngState = roll.state;
        gamblerRoll = roll.value;
        modifiedAmount = -roll.value;
        this.state.turn.gamblerLossRoll = roll.value;
        this.log('gamblerLossRolled', { playerId: gambler.id, value: roll.value, source }, now);
      }
    }

    const passiveAdjustments = [];
    if (!skipRoleModifiers && modifiedAmount < 0) {
      affectedPlayers.forEach((player) => {
        if (!this.isPassiveEnabled(player)) return;
        if (player.roleId === 'lucky') passiveAdjustments.push({ playerId: player.id, roleId: player.roleId, amount: 1 });
        if (player.roleId === 'unlucky') passiveAdjustments.push({ playerId: player.id, roleId: player.roleId, amount: -1 });
      });
      modifiedAmount = Math.min(0, modifiedAmount + passiveAdjustments.reduce((total, adjustment) => total + adjustment.amount, 0));
    }

    const before = this.state.coins;
    this.state.coins = Math.max(0, Math.min(this.state.coinGoal, before + modifiedAmount));
    const applied = this.state.coins - before;
    this.state.chapter.coinsEarned += applied;
    this.state.lastCoinChange = {
      requestedAmount,
      modifiedAmount,
      appliedAmount: applied,
      source,
      gamblerRoll,
      passiveAdjustments
    };
    this.state.turn.coinChangeRequested = requestedAmount;
    this.state.turn.coinChangeModified = modifiedAmount;
    this.state.turn.coinChangeApplied = applied;
    this.log('coinsChanged', {
      amount: applied,
      requestedAmount,
      modifiedAmount,
      source,
      total: this.state.coins,
      gamblerRoll,
      passiveAdjustments
    }, now);
    return applied;
  }

  addTreasure(amount = 1, now = Date.now()) {
    return this.addCoins(amount * COIN_VALUES.event, 'event', now);
  }

  prepareIngredientChoice(category = null, context = 'event', options = {}, now = Date.now()) {
    // Abilities draw from the same composition-aware pool as events. This keeps
    // a role from bypassing course limits or consuming ingredients needed later.
    if (!this.canAddIngredientThisTurn()) return false;
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

    this.state.turn.ingredientEffectConsumedForChoice = false;
    let count = options.all ? candidates.length : Math.max(1, Number(options.count) || 2);
    const player = this.activePlayer;
    if (context === 'event' && player.roleId === 'merchant' && this.isPassiveEnabled(player)) count = Math.max(count, 3);
    if (!options.all && candidates.length > count &&
      this.nextStoredIngredientEffect('ingredient')?.effect === 'replaceIngredient' &&
      this.consumeStoredIngredientEffect('replaceIngredient', 'ingredient', now)) {
      this.state.turn.ingredientEffectConsumedForChoice = true;
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
    const scheduled = this.state.turn.ingredientFlow.drawQueue.length;
    if ((this.state.turn.ingredientsAddedThisTurn ?? 0) + scheduled >= MAX_INGREDIENTS_PER_TURN) {
      return false;
    }
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
    // Revalidate a pending choice at commit time. A category limit may have
    // become full since the alternatives were prepared (for example through
    // another ingredient effect or a restored UI state).
    if (!this.courseIngredientCandidates().some((entry) => entry.id === ingredientId)) return false;
    if (ignoreEffect && !this.canCookIgnoreIngredientEffect(ingredientId)) return false;

    const previousIngredientId = this.state.lastIngredientId;
    ingredient.status = 'discovered';
    ingredient.chapterIndex = this.state.chapterIndex;
    ingredient.basketCourseIndex = this.state.chapterIndex;
    ingredient.discoveredAt = now;
    ingredient.discoveredBy = this.activePlayer.id;
    if (this.currentChapter.id === 'cocktails') {
      ingredient.cocktailUse = this.defaultCocktailUseForIngredient(ingredient);
    }
    this.state.previousIngredientId = previousIngredientId;
    this.state.lastIngredientId = ingredient.id;
    this.state.turn.ingredientsAddedThisTurn = (this.state.turn.ingredientsAddedThisTurn ?? 0) + 1;
    this.state.turn.pendingIngredientIds = [];
    this.state.turn.resolvedIngredientId = ingredient.id;
    this.state.turn.resolvedIngredientIds = [
      ...(this.state.turn.resolvedIngredientIds ?? []),
      ingredient.id
    ];
    this.state.turn.resolvedIngredientEffect = ingredient.effect;
    this.log('ingredientDiscovered', {
      ingredientId,
      chapterIndex: this.state.chapterIndex,
      cocktailUse: ingredient.cocktailUse ?? null
    }, now);

    if (ignoreEffect) {
      const key = `cook-ignore-${this.state.chapterIndex}`;
      this.activePlayer.passiveUsedByChapter[key] = true;
      this.state.turn.resolvedIngredientEffectMode = 'ignored';
      this.log('ingredientEffectIgnoredByCook', { ingredientId }, now);
    } else if (ingredient.effect && !this.state.turn.ingredientEffectConsumedForChoice &&
      this.nextStoredIngredientEffect('ingredient')?.effect === 'ignoreIngredient' &&
      this.consumeStoredIngredientEffect('ignoreIngredient', 'ingredient', now)) {
      this.state.turn.ingredientEffectConsumedForChoice = true;
      this.state.turn.resolvedIngredientEffectMode = 'ignored';
      this.log('ingredientEffectIgnoredByBonus', { ingredientId }, now);
    } else if (ingredient.effect) {
      let times = 1;
      if (!this.state.turn.ingredientEffectConsumedForChoice && ingredient.effect !== 'repeatNextIngredient' &&
        this.nextStoredIngredientEffect('ingredient')?.effect === 'repeatNextIngredient' &&
        this.consumeStoredIngredientEffect('repeatNextIngredient', 'ingredient', now)) {
        this.state.turn.ingredientEffectConsumedForChoice = true;
        times = 2;
      }
      this.applyIngredientEffect(ingredient, now, { times, previousIngredientId });
      this.state.turn.resolvedIngredientEffectMode = STORED_INGREDIENT_EFFECTS[ingredient.effect] ? 'stored' : 'immediate';
    }

    this.continueIngredientFlow(now);
    return true;
  }

  applyIngredientEffect(ingredient, now = Date.now(), { times = 1, previousIngredientId = this.state.previousIngredientId } = {}) {
    if (!ingredient?.effect) return false;
    this.log('ingredientEffectApplied', { ingredientId: ingredient.id, effect: ingredient.effect, times }, now);
    switch (ingredient.effect) {
      case 'doubleDie':
      case 'rerollDie':
      case 'adjustDie':
      case 'ignoreEvent':
      case 'ignoreIngredient':
      case 'repeatNextIngredient':
      case 'replaceIngredient':
      case 'revealEvent':
      case 'nextPlayer':
        this.storeIngredientEffect(ingredient, ingredient.effect, times, now);
        break;
      case 'coins3': this.addCoins(3 * times, 'ingredient', now); break;
      case 'coins5': this.addCoins(5 * times, 'ingredient', now); break;
      case 'chain':
      case 'extraTurn':
        if (this.state.turn.chainDepth < MAX_EVENT_CHAIN_DEPTH) this.state.turn.chainPending = true;
        break;
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
        if (this.state.turn.ingredientFlow?.context === 'event' && this.currentEvent &&
          this.distinctEventReplacementAvailable(this.currentEvent)) this.state.turn.ingredientFlow.replaceCurrentEvent = true;
        else this.storeIngredientEffect(ingredient, ingredient.effect, times, now);
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
      const turnsUntilEnabled = player.id === this.activePlayer.id ? 2 : 1;
      player.passiveDisabledThroughTurn = player.turns + turnsUntilEnabled;
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
      const queue = this.eventQueueForCard(this.currentEvent);
      if (this.state.eventsDrawn.at(-1) === eventId) this.state.eventsDrawn.pop();
      queue.push(eventId);
      const turnContext = continuedTurnContext(this.state.turn);
      this.log('eventReplacedByIngredient', { eventId }, now);
      this.state.turn = { ...freshTurn(), ...turnContext };
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

  swapLastIngredient(now = Date.now(), ingredientId = null) {
    const previous = ingredientId
      ? this.openCourseIngredient(ingredientId)
      : this.openCourseIngredient(this.state.lastIngredientId) ?? this.latestUnlockedCourseIngredient();
    if (!previous || (this.currentChapter.id === 'cocktails' &&
      ['alcoholic', 'alcohol-free'].includes(previous.cocktailUse) &&
      this.activePlayer.cocktailTeam !== previous.cocktailUse)) return false;
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
    if (this.currentChapter.id === 'cocktails') selected.cocktailUse = previous.cocktailUse;
    this.state.lastIngredientId = selected.id;
    this.state.turn.resolvedPreviousIngredientId = previous.id;
    this.state.turn.resolvedIngredientId = selected.id;
    this.log('ingredientSwapped', { from: previous.id, to: selected.id }, now);
    return true;
  }

  canLockIngredient(ingredient, cocktailUse = null) {
    if (!this.openCourseIngredient(ingredient?.id)) return false;
    // The ingredient itself is already in the basket, so exclude it while
    // checking whether a different ingredient has filled this category.
    if (!this.courseCategoryLimitAllows(ingredient, ingredient.id)) return false;
    if (this.currentChapter.id === 'cocktails') {
      if (ingredient.category === 'alcohol') {
        const spiritTarget = this.state.chapter.cocktailSpiritTarget;
        const otherFixedSpirits = this.courseIngredients().filter((entry) =>
          entry.id !== ingredient.id && entry.category === 'alcohol' && ['locked', 'used'].includes(entry.status)
        ).length;
        if (!Number.isInteger(spiritTarget) || otherFixedSpirits >= spiritTarget) return false;
      }
      const use = cocktailUse ?? ingredient.cocktailUse ?? this.defaultCocktailUseForIngredient(ingredient);
      if (!['alcoholic', 'alcohol-free', 'shared'].includes(use) ||
        (ingredient.cocktailUse && cocktailUse && ingredient.cocktailUse !== cocktailUse) ||
        (ingredient.category === 'alcohol' && use !== 'alcoholic')) return false;
    }
    return true;
  }

  lockLastIngredient(now = Date.now(), cocktailUse = null, ingredientId = null) {
    const ingredient = ingredientId
      ? this.openCourseIngredient(ingredientId)
      : this.openCourseIngredient(this.state.lastIngredientId) ?? this.latestUnlockedCourseIngredient();
    if (!this.canLockIngredient(ingredient, cocktailUse)) return false;
    if (this.currentChapter.id === 'cocktails') {
      ingredient.cocktailUse = cocktailUse ?? ingredient.cocktailUse ?? this.defaultCocktailUseForIngredient(ingredient);
    }
    ingredient.status = 'locked';
    ingredient.basketCourseIndex = null;
    ingredient.lockedAt = now;
    ingredient.lockedBy = this.activePlayer.id;
    this.state.lastIngredientId = ingredient.id;
    this.state.turn.resolvedIngredientId = ingredient.id;
    this.log('ingredientLocked', { ingredientId: ingredient.id, playerId: this.activePlayer.id, cocktailUse: ingredient.cocktailUse ?? null }, now);
    this.finalizeIngredientBasketIfReady(now);
    this.state.turn.resolvedIngredientId = ingredient.id;
    this.updateChapterStage(now);
    return true;
  }

  finalizeIngredientBasketIfReady(now = Date.now()) {
    const lockedEssential = this.courseIngredients().filter((entry) =>
      entry.essential && ['locked', 'used'].includes(entry.status)
    ).length;
    if (lockedEssential < this.courseRule().target || this.unmetCourseCategoryMinimums(['locked', 'used']).length) return false;
    const returned = this.unlockedCourseIngredients().map((entry) => entry.id);
    returned.forEach((ingredientId) => this.removeIngredientFromBasket(ingredientId, now));
    if (returned.length) this.log('ingredientBasketAutoCleared', { ingredientIds: returned }, now);
    return true;
  }

  chooseSoupStyle(style, now = Date.now()) {
    if (this.state.chapterIndex !== 1 || this.state.turn.phase !== 'courseDecision' || !['clear', 'cream'].includes(style)) return false;
    this.state.chapter.courseStyle = style;
    this.state.menu[this.state.chapterIndex].courseStyle = style;
    const queue = [...this.state.taskQueues[this.state.chapterIndex]];
    const removed = queue.filter((taskId) => {
      const card = taskById(taskId);
      return card?.courseStyles?.length && !card.courseStyles.includes(style);
    });
    this.reconcileTaskQueue(this.state.chapterIndex, true, now);
    this.state.turn = freshTurn();
    this.log('soupStyleChosen', { style, removedTaskIds: removed }, now);
    this.syncCourseLocations(now);
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
    this.state.turn.resolvedIngredientId = ingredient.id;
    if (this.state.lastIngredientId === ingredient.id) this.state.lastIngredientId = null;
    this.log('ingredientReturned', { ingredientId }, now);
    this.updateChapterStage(now);
    return true;
  }

  returnLastIngredient(now = Date.now(), ingredientId = null) {
    const ingredient = ingredientId
      ? this.openCourseIngredient(ingredientId)
      : this.openCourseIngredient(this.state.lastIngredientId) ?? this.latestUnlockedCourseIngredient();
    return ingredient ? this.removeIngredientFromBasket(ingredient.id, now) : false;
  }

  lockIngredientFromBasket(ingredientId, now = Date.now(), cocktailUse = null) {
    const ingredient = this.state.ingredients.find((entry) =>
      entry.id === ingredientId && entry.chapterIndex === this.state.chapterIndex && entry.status === 'discovered'
    );
    if (!ingredient || this.state.chapter.stage !== 'ingredients') return false;
    return this.lockLastIngredient(now, cocktailUse, ingredient.id);
  }

  ingredientCategoriesForTask(card) {
    if (card?.chapterId === 'cocktails' && card.usesCocktailTechnique) {
      return ['alcohol', 'drinks', 'fruit', 'vegetable', 'pantry', 'dessert'];
    }
    const mapping = {
      vegetables: ['vegetable'], fruit: ['fruit'], protein: card?.chapterId === 'soup' ? ['meat', 'vegetable', 'pantry'] : ['meat'], dressing: ['pantry'],
      seasoning: [], garnish: ['pantry', 'dessert'],
      hotplate: ['vegetable', 'pantry'], blender: ['vegetable', 'pantry'],
      oven: this.state.chapterIndex === 3 ? ['vegetable', 'meat', 'fruit', 'pantry'] : [],
      assembly: card?.chapterId === 'main'
        ? ['vegetable', 'meat', 'fruit', 'pantry']
        : ['vegetable', 'fruit', 'dessert', 'pantry'],
      cold: ['dessert', 'fruit', 'drinks'],
      alcoholic: ['alcohol', 'drinks', 'fruit'], 'alcohol-free': ['drinks', 'fruit'],
      mixing: ['fruit', 'drinks'], sauce: ['fruit', 'pantry'], quality: [],
      'cold-prep': [], serving: [], cleanup: [], safety: []
    };
    return mapping[card.area] ?? [];
  }

  reserveTaskBasket(card, instanceId) {
    const explicit = new Set(card.ingredientTags ?? []);
    const categories = new Set(this.ingredientCategoriesForTask(card));
    const requirement = card.ingredientRequirement;
    const requirementIds = new Set(requirement?.ids ?? []);
    const requirementCategories = new Set(requirement?.categories ?? []);
    const excludedRequirementIds = new Set(requirement?.excludeIds ?? []);
    const matchesRequirement = (ingredient) => !excludedRequirementIds.has(ingredient.id) &&
      (requirementIds.has(ingredient.id) || requirementCategories.has(ingredient.category));
    const finalServing = card.area === 'serving' && (card.prerequisites?.length ?? 0) > 0;
    const cocktailTeam = this.cocktailTeamForTask(card);
    const candidates = this.courseIngredients().filter((ingredient) => {
      if (!['locked', 'used'].includes(ingredient.status)) return false;
      if (cocktailTeam && ![cocktailTeam, 'shared'].includes(ingredient.cocktailUse)) return false;
      return explicit.has(ingredient.id) || finalServing ||
        (!explicit.size && (requirement ? matchesRequirement(ingredient) : categories.has(ingredient.category)));
    });
    return candidates.map((ingredient) => ingredient.id);
  }

  prepareTaskAssignment({ group = this.activeGroup, coreKey = null, peopleMode = null, now = Date.now() } = {}) {
    const card = this.assignableTaskCards(peopleMode, group)[0] ?? null;
    if (!card) return false;
    if (this.shouldOfferTaskAssigneeChoice(card, group, peopleMode)) {
      const recommendedPlayerIds = this.recommendedTaskPlayers(card, group, peopleMode).map((player) => player.id);
      this.state.turn.pendingTaskAssignment = {
        taskId: card.id,
        groupId: group.id,
        coreKey,
        peopleMode,
        requiredPeople: this.requiredPeopleForTask(card, peopleMode),
        selectedPlayerIds: recommendedPlayerIds,
        recommendedPlayerIds
      };
      this.state.turn.phase = 'taskAssigneeChoice';
      this.log('taskAssigneeChoiceStarted', { taskId: card.id, groupId: group.id, requiredPeople: this.state.turn.pendingTaskAssignment.requiredPeople }, now);
      return true;
    }
    const instance = this.assignTask({ card, group, coreKey, peopleMode, now });
    return Boolean(instance && this.briefTask(instance, true, now));
  }

  toggleTaskAssignee(playerId) {
    const pending = this.state.turn.pendingTaskAssignment;
    if (this.state.turn.phase !== 'taskAssigneeChoice' || !pending) return false;
    const group = this.state.groups.find((candidate) => candidate.id === pending.groupId);
    const card = taskById(pending.taskId);
    if (!group || !card || !this.eligibleFreePlayersForTask(card, group).some((player) => player.id === playerId)) return false;
    const selected = pending.selectedPlayerIds ?? [];
    const index = selected.indexOf(playerId);
    if (index >= 0) {
      if (playerId === this.activePlayer.id) return false;
      selected.splice(index, 1);
      return true;
    }
    if (selected.length >= pending.requiredPeople) return false;
    selected.push(playerId);
    return true;
  }

  confirmTaskAssignees(now = Date.now()) {
    const pending = this.state.turn.pendingTaskAssignment;
    if (this.state.turn.phase !== 'taskAssigneeChoice' || !pending) return false;
    const selectedPlayerIds = [...new Set(pending.selectedPlayerIds ?? [])];
    if (selectedPlayerIds.length !== pending.requiredPeople) return false;
    const group = this.state.groups.find((candidate) => candidate.id === pending.groupId);
    const card = taskById(pending.taskId);
    if (!group || !card) return false;
    const instance = this.assignTask({
      card,
      group,
      coreKey: pending.coreKey,
      peopleMode: pending.peopleMode,
      playerIds: selectedPlayerIds,
      now
    });
    if (!instance) return false;
    this.state.turn.pendingTaskAssignment = null;
    this.log('taskAssigneesChosen', { instanceId: instance.instanceId, assignedPlayerIds: selectedPlayerIds }, now);
    return this.briefTask(instance, true, now);
  }

  consumeTaskAbilityAdjustments(card, assignedPlayerIds, now = Date.now()) {
    if ((card.timingMode ?? 'challenge') !== 'challenge' || !(card.challengeMinutes > 0)) return [];
    const adjustments = [];
    assignedPlayerIds.forEach((playerId) => {
      const player = this.state.players.find((candidate) => candidate.id === playerId);
      const pending = player?.pendingTaskAbility;
      if (!player || !pending) return;
      const config = pending.roleId === 'lucky'
        ? { timeMinutes: 2, coinDelta: -2 }
        : pending.roleId === 'unlucky' && card.challengeMinutes > 2
          ? { timeMinutes: -2, coinDelta: 2 }
          : null;
      if (!config) return;
      adjustments.push({
        playerId,
        roleId: pending.roleId,
        timeMinutes: config.timeMinutes,
        coinDelta: config.coinDelta,
        armedAt: pending.armedAt
      });
      player.pendingTaskAbility = null;
      this.log('taskAbilityConsumed', { playerId, roleId: pending.roleId, taskId: card.id, ...config }, now);
    });
    return adjustments;
  }

  assignTask({ card = null, group = this.activeGroup, coreKey = null, peopleMode = null, playerIds = null, now = Date.now() } = {}) {
    let selected = card;
    let selectedFromQueue = false;
    if (selected) {
      selected = this.assignableTaskCards(peopleMode, group).find((candidate) => candidate.id === selected.id) ?? null;
      selectedFromQueue = Boolean(selected);
    } else {
      selected = this.assignableTaskCards(peopleMode, group)[0] ?? null;
      selectedFromQueue = Boolean(selected);
    }
    if (!selected) return null;

    const minimumPeople = this.requiredPeopleForTask(selected, peopleMode);
    const candidates = this.eligibleFreePlayersForTask(selected, group);
    if (candidates.length < minimumPeople) return null;
    const activeMustParticipate = group.playerIds.includes(this.activePlayer.id) && candidates.some((candidate) => candidate.id === this.activePlayer.id);
    if (!activeMustParticipate) return null;
    const selectedPlayerIds = playerIds == null ? null : [...new Set(playerIds)];
    if (selectedPlayerIds && (selectedPlayerIds.length !== minimumPeople ||
      selectedPlayerIds.some((playerId) => !candidates.some((candidate) => candidate.id === playerId)) ||
      (activeMustParticipate && !selectedPlayerIds.includes(this.activePlayer.id)))) return null;
    if (selectedFromQueue) {
      const queue = this.state.taskQueues[this.state.chapterIndex];
      queue.splice(queue.indexOf(selected.id), 1);
    }
    const assignedPlayerIds = selectedPlayerIds ?? this.recommendedTaskPlayers(selected, group, peopleMode).map((player) => player.id);
    const taskAbilityAdjustments = this.consumeTaskAbilityAdjustments(selected, assignedPlayerIds, now);
    const taskTimeAdjustment = taskAbilityAdjustments.reduce((total, adjustment) => total + adjustment.timeMinutes, 0);
    const taskCoinAdjustment = taskAbilityAdjustments.reduce((total, adjustment) => total + adjustment.coinDelta, 0);
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
      timingMode: selected.timingMode ?? 'challenge',
      baseChallengeMinutes: selected.challengeMinutes ?? 0,
      challengeMinutes: (selected.timingMode ?? 'challenge') === 'challenge' && selected.challengeMinutes > 0
        ? Math.max(1, selected.challengeMinutes + taskTimeAdjustment)
        : selected.challengeMinutes ?? 0,
      backgroundMinutes: selected.backgroundMinutes ?? 0,
      taskAbilityAdjustments,
      taskCoinAdjustment,
      challengeEndsAt: null,
      coinDelta: null,
      challengeResult: null,
      alertsSent: [],
      basketIngredientIds: []
    };
    if (this.isCauldronWatchCard(selected)) {
      this.state.chapter.cauldronWatchIntervals = (this.state.chapter.cauldronWatchIntervals ?? 0) + 1;
      instance.watchInterval = this.state.chapter.cauldronWatchIntervals;
    }
    instance.basketIngredientIds = this.reserveTaskBasket(selected, instance.instanceId);
    this.state.tasks.push(instance);
    this.state.turn.tasksAssignedThisTurn += 1;
    this.log('taskAssigned', {
      taskId: selected.id,
      instanceId: instance.instanceId,
      assignedPlayerIds,
      basketIngredientIds: instance.basketIngredientIds,
      taskAbilityAdjustments,
      challengeMinutes: instance.challengeMinutes,
      taskCoinAdjustment
    }, now);
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
      const previousIndex = this.state.activePlayerIndex;
      const nextIndex = this.nextFreePlayerIndex(previousIndex);
      this.state.turn = freshTurn();
      if (nextIndex == null) {
        this.state.busyAfterPlayerIndex = previousIndex;
        this.state.busyReason = 'allPlayersBusy';
        this.state.turn.phase = 'crewBusy';
        this.log('allPlayersBusy', { afterPlayerId: this.state.players[previousIndex].id, reason: 'openingTaskStarted' }, now);
      } else {
        this.state.busyAfterPlayerIndex = null;
        this.state.busyReason = null;
        this.state.activePlayerIndex = nextIndex;
        this.log('turnPassedAfterTaskStarted', {
          playerId: this.state.players[previousIndex].id,
          nextPlayerId: this.activePlayer.id
        }, now);
      }
    }
    return true;
  }

  startTask(instanceId, now = Date.now()) {
    const instance = this.state.tasks.find((taskInstance) => taskInstance.instanceId === instanceId);
    if (!instance || instance.status !== 'queued') return false;
    const card = taskById(instance.taskId);
    instance.status = 'active';
    instance.startedAt = now;
    instance.timingMode = card.timingMode ?? 'challenge';
    instance.baseChallengeMinutes ??= card.challengeMinutes ?? 0;
    instance.challengeMinutes ??= card.challengeMinutes ?? 0;
    instance.backgroundMinutes = card.backgroundMinutes ?? 0;
    const timerMinutes = instance.timingMode === 'background'
      ? instance.backgroundMinutes
      : instance.timingMode === 'challenge' ? instance.challengeMinutes : 0;
    instance.challengeEndsAt = timerMinutes > 0 ? now + timerMinutes * 60_000 : null;
    instance.endAt = instance.challengeEndsAt;
    if (instance.assignedPlayerIds.includes(this.activePlayer.id) && this.state.turn.chainPending) {
      this.state.turn.chainPending = false;
      this.log('eventChainStoppedForTask', { instanceId, taskId: card.id, playerId: this.activePlayer.id }, now);
    }
    this.log('taskStarted', { instanceId, taskId: card.id, timingMode: instance.timingMode, timerMinutes }, now);
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
      instance.timingMode = card.timingMode ?? 'challenge';
      instance.baseChallengeMinutes ??= card.challengeMinutes ?? 0;
      instance.challengeMinutes ??= card.challengeMinutes ?? 0;
      instance.backgroundMinutes = card.backgroundMinutes ?? 0;
      const timerMinutes = instance.timingMode === 'background'
        ? instance.backgroundMinutes
        : instance.timingMode === 'challenge' ? instance.challengeMinutes : 0;
      instance.challengeEndsAt = timerMinutes > 0 ? instance.startedAt + timerMinutes * 60_000 : null;
      instance.endAt = instance.challengeEndsAt;
    }
    const targetMs = Math.max(60_000, (instance.challengeMinutes || 1) * 60_000);
    const elapsedMs = Math.max(0, now - (instance.startedAt ?? instance.assignedAt));
    let coinDelta;
    let challengeResult;
    if (instance.timingMode === 'manual') {
      coinDelta = 0;
      challengeResult = 'manual';
    } else if (instance.timingMode === 'background' || !instance.challengeMinutes) {
      coinDelta = 0;
      challengeResult = 'background';
    } else if (elapsedMs <= targetMs / 2) {
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
    instance.baseChallengeCoinValue = coinDelta;
    instance.challengeResult = challengeResult;
    instance.assignedPlayerIds.forEach((playerId) => {
      const player = this.state.players.find((candidate) => candidate.id === playerId);
      if (player) player.taskMarkers += 1;
    });
    instance.coinDelta = this.addCoins(coinDelta, 'task', now, {
      playerIds: instance.assignedPlayerIds,
      taskCoinAdjustment: instance.taskCoinAdjustment ?? 0
    });
    instance.challengeCoinValue = this.state.lastCoinChange?.modifiedAmount ?? coinDelta;
    instance.coinRoleAdjustments = clone(this.state.lastCoinChange?.passiveAdjustments ?? []);
    this.log('taskCompleted', {
      instanceId,
      taskId: card.id,
      assignedPlayerIds: instance.assignedPlayerIds,
      coinDelta: instance.coinDelta,
      baseChallengeCoinValue: coinDelta,
      challengeCoinValue: instance.challengeCoinValue,
      taskCoinAdjustment: instance.taskCoinAdjustment ?? 0,
      coinRoleAdjustments: instance.coinRoleAdjustments,
      challengeResult
    }, now);
    this.reconcileTaskQueue(this.state.chapterIndex, true, now);
    this.updateChapterStage(now);
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
    if (this.state.chapter.stage === 'teamSelection' && this.state.turn.phase !== 'cocktailTeamChoice') {
      this.startCocktailTeamSelection(now);
    }
    this.evaluateChapter(now);
    this.resumeTurnIfCrewWasBusy(now);
    return true;
  }

  undoTaskCompletion(instanceId, now = Date.now()) {
    const instance = this.state.tasks.find((taskInstance) => taskInstance.instanceId === instanceId);
    if (!this.canUndoTaskCompletion(instanceId)) return false;
    if (instance.coinDelta) this.addCoins(-instance.coinDelta, 'taskUndo', now, { skipRoleModifiers: true });
    instance.assignedPlayerIds.forEach((playerId) => {
      const player = this.state.players.find((candidate) => candidate.id === playerId);
      if (player) player.taskMarkers = Math.max(0, player.taskMarkers - 1);
    });
    instance.status = instance.challengeEndsAt && now >= instance.challengeEndsAt ? 'ready' : 'active';
    instance.completedAt = null;
    instance.coinDelta = null;
    instance.baseChallengeCoinValue = null;
    instance.challengeCoinValue = null;
    instance.coinRoleAdjustments = [];
    instance.challengeResult = null;
    this.reconcileTaskQueue(this.state.chapterIndex);
    this.log('taskCompletionUndone', { instanceId, taskId: instance.taskId }, now);
    this.evaluateChapter(now);
    return true;
  }

  canUndoTaskCompletion(instanceId) {
    const instance = this.state.tasks.find((taskInstance) => taskInstance.instanceId === instanceId);
    const card = instance ? taskById(instance.taskId) : null;
    const laterQuestStepExists = card && this.state.tasks.some((candidate) => {
      if (candidate.chapterIndex !== instance.chapterIndex || candidate.instanceId === instance.instanceId) return false;
      const candidateCard = taskById(candidate.taskId);
      return candidateCard?.questId === card.questId && this.questStepNumber(candidateCard) > this.questStepNumber(card);
    });
    const dependentTaskExists = card && this.state.tasks.some((candidate) => {
      if (candidate.chapterIndex !== instance.chapterIndex || candidate.instanceId === instance.instanceId) return false;
      const candidateCard = taskById(candidate.taskId);
      return [...(candidateCard?.prerequisites ?? []), ...(candidateCard?.alternativePrerequisites ?? [])]
        .some((requirement) => requirement.requiredBlueprintIndex === card.blueprintIndex);
    });
    return Boolean(instance && instance.status === 'done' && !this.isCauldronWatch(instance) && instance.chapterIndex === this.state.chapterIndex && !this.state.chapter.served &&
      !laterQuestStepExists && !dependentTaskExists && card?.questId !== 'reset' &&
      instance.assignedPlayerIds.every((playerId) => this.isPlayerFreeForTask(playerId, instanceId)));
  }

  nextFreePlayerIndex(fromIndex = this.state.activePlayerIndex) {
    for (let offset = 1; offset <= this.state.players.length; offset += 1) {
      const index = (fromIndex + offset) % this.state.players.length;
      if (this.isPlayerFreeForTask(this.state.players[index].id)) return index;
    }
    return null;
  }

  resumeTurnIfCrewWasBusy(now = Date.now()) {
    if (this.state.turn.phase !== 'crewBusy') return false;
    const anchorIndex = Number.isInteger(this.state.busyAfterPlayerIndex)
      ? this.state.busyAfterPlayerIndex
      : this.state.activePlayerIndex;
    const nextIndex = this.nextFreePlayerIndex(anchorIndex);
    if (nextIndex == null) return false;
    this.state.activePlayerIndex = nextIndex;
    this.state.busyAfterPlayerIndex = null;
    this.state.busyReason = null;
    this.state.turn = freshTurn();
    this.resolveActiveChallengesAfterTurn(null, this.activePlayer.id, now);
    this.log('crewTurnResumed', {
      afterPlayerId: this.state.players[anchorIndex].id,
      playerId: this.activePlayer.id
    }, now);
    this.evaluateChapter(now);
    return true;
  }

  courseProgressDetails() {
    const chapterIndex = this.state.chapterIndex;
    const applicableCards = TASK_DECKS[chapterIndex]
      .filter((card) => card.playable && this.taskAppliesToCourse(card));
    const clearingCards = applicableCards.filter((card) => card.questId === 'reset');
    const courseTaskCards = applicableCards.filter((card) => card.questId !== 'reset');
    const completedTaskIds = new Set(this.state.tasks
      .filter((instance) => instance.chapterIndex === chapterIndex && instance.status === 'done')
      .map((instance) => instance.taskId));
    const clearingDone = clearingCards.filter((card) => completedTaskIds.has(card.id)).length;
    const tasksDone = courseTaskCards.filter((card) => completedTaskIds.has(card.id)).length;
    const ingredientTarget = this.courseRule().target;
    const ingredientsFixed = this.requiredCourseIngredients()
      .filter((ingredient) => ['locked', 'used'].includes(ingredient.status)).length;
    const clearingRatio = chapterIndex === 0 || clearingCards.length === 0
      ? 1
      : clearingDone / clearingCards.length;
    const ingredientRatio = chapterIndex === 0
      ? 1
      : Math.min(1, ingredientsFixed / Math.max(1, ingredientTarget));
    const taskRatio = courseTaskCards.length ? tasksDone / courseTaskCards.length : 1;
    const rawPercent = chapterIndex === 0
      ? taskRatio * 100
      : clearingRatio * 5 + ingredientRatio * 25 + taskRatio * 70;
    return {
      percent: Math.max(0, Math.min(100, Math.round(rawPercent * 10) / 10)),
      clearingDone,
      clearingTotal: clearingCards.length,
      ingredientsFixed,
      ingredientTarget,
      tasksDone,
      tasksTotal: courseTaskCards.length
    };
  }

  courseProgress() {
    return this.courseProgressDetails().percent;
  }

  locationGoal() {
    return 100;
  }

  syncGroupLocation(group, now = Date.now(), { rebase = false, log = true } = {}) {
    if (!group) return false;
    const previousLocation = group.locationIndex;
    const measuredProgress = this.courseProgress();
    const previousProgress = Number(group.locationProgress) || 0;
    group.locationProgress = rebase ? measuredProgress : Math.max(previousProgress, measuredProgress);
    group.progressMode = 'course';
    const locationCount = this.currentChapter.locations.length;
    const lastLocationIndex = Math.max(0, locationCount - 1);
    const targetLocationIndex = Math.min(
      lastLocationIndex,
      Math.floor((Math.min(99.999, group.locationProgress) * locationCount) / 100)
    );
    group.finished = group.locationProgress >= 100;
    group.locationIndex = group.finished ? lastLocationIndex : targetLocationIndex;
    const completedCount = group.finished ? locationCount : group.locationIndex;
    group.completedLocations = Array.from({ length: completedCount }, (_, index) => index);
    const changed = previousLocation !== group.locationIndex;
    if (changed && group.locationIndex > previousLocation) {
      for (let locationIndex = previousLocation + 1; locationIndex <= group.locationIndex; locationIndex += 1) {
        this.registerLocationVisit(this.state.chapterIndex, locationIndex, now, { log });
      }
    }
    if (changed && log) {
      this.log('locationCompleted', {
        groupId: group.id,
        locationIndex: previousLocation,
        nextLocation: group.locationIndex,
        courseProgress: group.locationProgress
      }, now);
    }
    return changed;
  }

  syncCourseLocations(now = Date.now()) {
    let changed = false;
    this.state.groups.forEach((group) => {
      changed = this.syncGroupLocation(group, now) || changed;
    });
    return changed;
  }

  maybeAdvanceGroup(group, now = Date.now()) {
    return this.syncGroupLocation(group, now);
  }

  endTurn(now = Date.now()) {
    if (this.state.turn.phase !== 'resolved') return false;
    if (this.state.turn.chainPending && this.state.turn.chainDepth >= MAX_EVENT_CHAIN_DEPTH) {
      this.state.turn.chainPending = false;
      this.log('eventChainCompleted', { playerId: this.activePlayer.id, chainDepth: this.state.turn.chainDepth, reason: 'maximumDepth' }, now);
    }
    if (this.state.turn.chainPending && this.isPlayerFreeForTask(this.activePlayer.id)) {
      const previousEventId = this.state.turn.currentEventId;
      const chainEventIds = [...new Set([...(this.state.turn.chainEventIds ?? []), previousEventId].filter(Boolean))];
      const chainEventSignatures = [...new Set([...(this.state.turn.chainEventSignatures ?? []), this.state.turn.eventSignature].filter(Boolean))];
      const chainEventChoiceSignatures = [...new Set([...(this.state.turn.chainEventChoiceSignatures ?? []), this.state.turn.eventChoiceSignature].filter(Boolean))];
      this.state.turn = {
        ...freshTurn(),
        chainDepth: this.state.turn.chainDepth + 1,
        previousEventChoiceSignature: this.state.turn.eventChoiceSignature,
        previousEventSignature: this.state.turn.eventSignature,
        previousEventId,
        chainEventIds,
        chainEventSignatures,
        chainEventChoiceSignatures,
        activeAbilityUsed: this.state.turn.activeAbilityUsed,
        ingredientsAddedThisTurn: this.state.turn.ingredientsAddedThisTurn,
        tasksAssignedThisTurn: this.state.turn.tasksAssignedThisTurn
      };
      this.log('eventChainContinued', { playerId: this.activePlayer.id, chainDepth: this.state.turn.chainDepth }, now);
      return 'chain';
    }

    const player = this.activePlayer;
    const group = this.activeGroup;
    player.turns += 1;
    this.state.turnsElapsed += 1;
    this.state.chapter.turnsByPlayer[player.id] += 1;
    this.maybeAdvanceGroup(group, now);

    const previousIndex = this.state.activePlayerIndex;
    const nextIndex = this.nextFreePlayerIndex(previousIndex);
    const skippedPlayerIds = [];
    if (nextIndex != null) {
      for (let offset = 1; offset < this.state.players.length; offset += 1) {
        const index = (previousIndex + offset) % this.state.players.length;
        if (index === nextIndex) break;
        if (!this.isPlayerFreeForTask(this.state.players[index].id)) skippedPlayerIds.push(this.state.players[index].id);
      }
      this.state.activePlayerIndex = nextIndex;
      this.state.busyAfterPlayerIndex = null;
      this.state.busyReason = null;
      if (nextIndex <= previousIndex) this.state.chapter.round += 1;
      this.state.turn = freshTurn();
      this.resolveActiveChallengesAfterTurn(player.id, this.activePlayer.id, now);
      skippedPlayerIds.forEach((playerId) => this.log('turnSkippedForTask', { playerId }, now));
      this.log('turnEnded', { playerId: player.id, nextPlayerId: this.activePlayer.id, skippedPlayerIds }, now);
    } else {
      this.state.busyAfterPlayerIndex = previousIndex;
      this.state.busyReason = 'allPlayersBusy';
      this.state.turn = { ...freshTurn(), phase: 'crewBusy' };
      this.resolveActiveChallengesAfterTurn(player.id, null, now);
      this.log('allPlayersBusy', { afterPlayerId: player.id }, now);
    }
    this.evaluateChapter(now);
    return true;
  }

  evaluateChapter(now = Date.now()) {
    const chapterTasks = this.state.tasks.filter((taskInstance) => taskInstance.chapterIndex === this.state.chapterIndex);
    const allWorkComplete = !this.hasUnassignedCourseTasks() && chapterTasks.length > 0 && chapterTasks.every((taskInstance) => taskInstance.status === 'done');
    this.syncCourseLocations(now);
    const allGroupsFinished = this.state.groups.every((group) => group.finished);
    const ingredientsReady = this.ingredientsLockedForCourse() || this.state.chapterIndex === 0;
    const followUpsResolved = this.unresolvedFollowUpCount() === 0;
    const locationStoriesResolved = !this.state.pendingLocationStoryIds.some((storyId) =>
      storyCardById(storyId)?.chapterIndex === this.state.chapterIndex
    );
    const ready = ingredientsReady && allWorkComplete && allGroupsFinished && followUpsResolved && locationStoriesResolved;
    const wasReady = this.state.chapter.readyToServe;
    this.state.chapter.readyToServe = ready;
    if (ready && this.state.turn.phase === 'draw') this.state.turn.phase = 'chapterReady';
    if (ready && !wasReady) this.log('chapterReady', { chapterIndex: this.state.chapterIndex }, now);
    if (!ready && this.state.turn.phase === 'chapterReady') this.state.turn.phase = 'draw';
    return { ingredientsReady, allWorkComplete, allGroupsFinished, followUpsResolved, locationStoriesResolved, ready };
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
      ingredientIds,
      portionCaptainPlayerId: this.state.chapter.portionCaptainPlayerId,
      courseStyle: this.state.chapter.courseStyle,
      cocktailTechniques: this.currentChapter.id === 'cocktails' ? clone(this.state.chapter.cocktailTechniques) : null
    };
    this.state.chapter.served = true;
    this.log('courseServed', { chapterIndex: this.state.chapterIndex, ingredientIds, portionCaptainPlayerId: this.state.chapter.portionCaptainPlayerId }, now);

    if (this.state.chapterIndex === CHAPTERS.length - 1) {
      this.expireActiveChallenges('voyageCompleted', now);
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
    const ingredient = this.courseIngredientCandidates()[0];
    if (!ingredient) return false;
    ingredient.status = 'discovered';
    ingredient.chapterIndex = this.state.chapterIndex;
    ingredient.basketCourseIndex = this.state.chapterIndex;
    ingredient.discoveredAt = now;
    ingredient.discoveredBy = treasurer.id;
    this.state.turn.ingredientsAddedThisTurn = (this.state.turn.ingredientsAddedThisTurn ?? 0) + 1;
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
      progressMode: 'course',
      completedLocations: [],
      finished: false
    }];
    this.state.turn = freshTurn();
    this.state.busyReason = null;
    this.state.lastIngredientId = null;
    this.state.previousIngredientId = null;
    this.state.bonuses = freshBonuses(); // legacy compatibility; the shared ingredient effect stack persists
    this.log('chapterStarted', { chapterIndex: this.state.chapterIndex, stage: this.state.chapter.stage }, now);
    this.registerLocationVisit(this.state.chapterIndex, 0, now);
    const clearingTask = this.assignTask({ group: this.activeGroup, now });
    if (clearingTask) this.briefTask(clearingTask, true, now);
    return true;
  }

  swapIngredientAlternatives(previous = null) {
    const ingredient = previous
      ?? this.openCourseIngredient(this.state.lastIngredientId)
      ?? this.latestUnlockedCourseIngredient();
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

  repeatableIngredientEffect(ingredient = null) {
    if (!ingredient?.effect) return false;
    if (ingredient.effect !== 'repeatIngredient') return true;
    const previous = this.state.ingredients.find((entry) => entry.id === this.state.previousIngredientId);
    return Boolean(previous?.effect && previous.effect !== 'repeatIngredient');
  }

  activeAbilityAvailable(option = null) {
    const player = this.activePlayer;
    const role = getRole(player?.roleId);
    if (!role || player.activeUsesRemaining <= 0 || this.state.turn.activeAbilityUsed) return false;
    const phase = this.state.turn.phase;
    const stableIngredientPhase = this.state.chapter.stage === 'ingredients' &&
      ['draw', 'event'].includes(phase) && !this.state.turn.ingredientFlow;
    const stableCardStep = ['draw', 'event', 'rolled', 'resolved'].includes(phase) &&
      !this.state.turn.ingredientFlow && !this.state.turn.pendingTaskAssignment;
    const category = { chooseVegetable: 'vegetable', chooseMeat: 'meat', chooseFruit: 'fruit' }[role.activeCode] ?? null;
    const lastIngredient = this.state.ingredients.find((entry) =>
      entry.id === this.state.lastIngredientId && entry.chapterIndex === this.state.chapterIndex && entry.status === 'discovered'
    );

    switch (role.activeCode) {
      case 'replaceEvent':
      case 'shuffleEvents': return Boolean(this.currentEvent) && !this.currentEvent.storyKind &&
        ['event', 'rolled'].includes(phase) && this.distinctEventReplacementAvailable(this.currentEvent);
      case 'adjustDie': return this.dieAdjustmentAvailable(option);
      case 'chooseVegetable':
      case 'chooseMeat':
      case 'chooseFruit': return stableIngredientPhase && this.canAddIngredientThisTurn() && this.courseIngredientCandidates(category).length > 0;
      case 'chooseIngredient':
      case 'reserveIngredient': return stableIngredientPhase && this.canAddIngredientThisTurn() && this.courseIngredientCandidates().length > 0;
      case 'swapIngredient': return stableIngredientPhase && this.swapIngredientAlternatives(lastIngredient).length > 0;
      case 'repeatIngredient': return stableIngredientPhase && this.repeatableIngredientEffect(lastIngredient);
      case 'extendNextTask':
      case 'shortenNextTask': return stableCardStep && !player.pendingTaskAbility;
      case 'gambleCoins': return stableCardStep && !player.passiveUsedByChapter[`gambler-active-${this.state.chapterIndex}`];
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
        if (!this.currentEvent || this.currentEvent.storyKind || !['event', 'rolled'].includes(this.state.turn.phase)) return false;
        this.state.discardedEvents.push(this.currentEvent.id);
        const turnContext = continuedTurnContext(this.state.turn);
        this.state.turn = {
          ...freshTurn(),
          ...turnContext
        };
        this.beginEvent(now);
        break;
      case 'shuffleEvents': {
        if (!this.currentEvent || this.currentEvent.storyKind || !['event', 'rolled'].includes(this.state.turn.phase)) return false;
        const queue = this.eventQueueForCard(this.currentEvent);
        const drawnIndex = this.state.eventsDrawn.lastIndexOf(this.currentEvent.id);
        if (drawnIndex >= 0) this.state.eventsDrawn.splice(drawnIndex, 1);
        queue.unshift(this.currentEvent.id);
        const shuffled = shuffle(queue, this.state.rngState);
        this.state.rngState = shuffled.state;
        queue.splice(0, queue.length, ...shuffled.value);
        const turnContext = continuedTurnContext(this.state.turn);
        this.state.turn = {
          ...freshTurn(),
          ...turnContext
        };
        this.beginEvent(now);
        break;
      }
      case 'adjustDie':
        if (!this.dieAdjustmentAvailable(option)) return false;
        this.state.turn.dieResult += Number(option);
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
      case 'extendNextTask':
      case 'shortenNextTask':
        player.pendingTaskAbility = {
          roleId: role.id,
          armedAt: now,
          armedChapterIndex: this.state.chapterIndex
        };
        this.log('taskAbilityArmed', { playerId: player.id, roleId: role.id, activeCode: role.activeCode }, now);
        break;
      case 'gambleCoins': {
        const roll = randomInt(this.state.rngState, 1, 6);
        this.state.rngState = roll.state;
        const coinByRoll = { 1: -6, 2: -4, 3: -2, 4: 2, 5: 4, 6: 6 };
        const requestedCoinDelta = coinByRoll[roll.value];
        this.addCoins(requestedCoinDelta, 'gamblerAbility', now);
        this.state.turn.gamblerAbilityRoll = roll.value;
        this.state.turn.gamblerAbilityCoinDelta = this.state.lastCoinChange?.modifiedAmount ?? requestedCoinDelta;
        player.passiveUsedByChapter[`gambler-active-${this.state.chapterIndex}`] = true;
        this.log('gamblerAbilityRolled', {
          playerId: player.id,
          value: roll.value,
          requestedCoinDelta,
          appliedCoinDelta: this.state.lastCoinChange?.appliedAmount ?? 0
        }, now);
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
    if (player.roleId !== 'tactician' || !this.passiveUnused(player, key) || !['event', 'rolled'].includes(this.state.turn.phase) ||
      !this.currentEvent || this.currentEvent.storyKind) return false;
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
    const card = taskById(instance.taskId);
    const team = this.cocktailTeamForTask(card);
    const technique = team && card?.usesCocktailTechnique
      ? this.cocktailTechniqueForTeam(team, instance.chapterIndex ?? this.state.chapterIndex)
      : null;
    if (!card) return card;
    let contextualizedCard = this.contextualizeIngredientText(card);
    if (card.dessertTeamSplit && (instance.assignedPlayerIds?.length ?? 0) >= 2) {
      const assignedNames = instance.assignedPlayerIds
        .map((playerId) => this.state.players.find((player) => player.id === playerId)?.name)
        .filter(Boolean);
      const splitIndex = Math.ceil(assignedNames.length / 2);
      const fruitTeam = assignedNames.slice(0, splitIndex).join(', ');
      const treasureTeam = assignedNames.slice(splitIndex).join(', ');
      contextualizedCard = {
        ...contextualizedCard,
        instruction: {
          de: `${contextualizedCard.instruction.de} Frucht-Team: ${fruitTeam}. Schatz-Team: ${treasureTeam}.`,
          en: `${contextualizedCard.instruction.en} Fruit team: ${fruitTeam}. Treasure team: ${treasureTeam}.`
        }
      };
    }
    if (!technique) return contextualizedCard;
    const techniqueInstruction = technique === 'mixed'
      ? {
          de: 'Verbindliche Technik: Mixen. Verarbeitet die Mischung portionsweise im Mixer, bis sie gleichmäßig verbunden ist.',
          en: 'Required technique: blend. Process the drink in batches until the mixture is evenly combined.'
        }
      : {
          de: 'Verbindliche Technik: Rühren. Rührt die Mischung mit Eis im Krug gründlich kalt, ohne sie zu mixen.',
          en: 'Required technique: stir. Stir the mixture thoroughly with ice in a jug until cold; do not blend it.'
        };
    return {
      ...contextualizedCard,
      instruction: {
        de: `${contextualizedCard.instruction.de} ${techniqueInstruction.de}`,
        en: `${contextualizedCard.instruction.en} ${techniqueInstruction.en}`
      }
    };
  }

  contextualizeIngredientText(value) {
    const ingredientReplacements = this.state.ingredients
      .filter((ingredient) => ingredient.customName)
      .map((ingredient) => ({
        customName: ingredient.customName,
        originalName: CURRENT_INGREDIENTS_BY_ID.get(ingredient.id)?.name
      }))
      .filter((replacement) => replacement.originalName);
    const stapleReplacements = SHOPPING_STAPLES
      .filter((staple) => this.state.shoppingStapleNames?.[staple.id])
      .map((staple) => ({
        customName: this.state.shoppingStapleNames[staple.id],
        originalName: staple.name
      }));
    const replacements = [...ingredientReplacements, ...stapleReplacements];
    if (!replacements.length || !value || typeof value !== 'object') return value;
    const contextualize = (text, language) => replacements.reduce((result, replacement) => {
      const originalName = replacement.originalName[language];
      if (!originalName) return result;
      const lowerCaseVariant = `${originalName.charAt(0).toLocaleLowerCase(language)}${originalName.slice(1)}`;
      return [...new Set([originalName, lowerCaseVariant])]
        .reduce((localizedResult, variant) => localizedResult.replaceAll(variant, replacement.customName[language]), result);
    }, String(text ?? ''));
    return {
      ...value,
      ...Object.fromEntries(['title', 'story', 'instruction', 'questName', 'completionLabel']
        .filter((key) => value[key]?.de !== undefined || value[key]?.en !== undefined)
        .map((key) => [key, {
          de: contextualize(value[key]?.de, 'de'),
          en: contextualize(value[key]?.en, 'en')
        }]))
    };
  }

  getIngredient(ingredientId) {
    return this.state.ingredients.find((entry) => entry.id === ingredientId) ?? INGREDIENTS.find((entry) => entry.id === ingredientId);
  }

  renameIngredient(ingredientId, name, now = Date.now()) {
    const ingredient = this.state.ingredients.find((entry) => entry.id === ingredientId);
    const customName = normalizedLocalizedName(name);
    if (!ingredient || !customName) return false;
    ingredient.customName = customName;
    ingredient.name = clone(customName);
    this.log('ingredientRenamed', { ingredientId, customName }, now);
    return true;
  }

  resetIngredientName(ingredientId, now = Date.now()) {
    const ingredient = this.state.ingredients.find((entry) => entry.id === ingredientId);
    const original = CURRENT_INGREDIENTS_BY_ID.get(ingredientId);
    if (!ingredient || !original) return false;
    delete ingredient.customName;
    ingredient.name = clone(original.name);
    this.log('ingredientNameReset', { ingredientId }, now);
    return true;
  }

  shoppingStapleName(stapleId, language = 'de') {
    const staple = SHOPPING_STAPLES.find((entry) => entry.id === stapleId);
    if (!staple) return '';
    const localizedName = this.state.shoppingStapleNames?.[stapleId];
    return localizedName?.[language === 'en' ? 'en' : 'de'] || staple.name[language === 'en' ? 'en' : 'de'];
  }

  renameShoppingStaple(stapleId, name, now = Date.now()) {
    if (!CURRENT_SHOPPING_STAPLE_IDS.has(stapleId)) return false;
    const customName = normalizedLocalizedName(name);
    if (!customName) return false;
    this.state.shoppingStapleNames ??= {};
    this.state.shoppingStapleNames[stapleId] = customName;
    this.log('shoppingStapleRenamed', { stapleId, customName }, now);
    return true;
  }

  resetShoppingStapleName(stapleId, now = Date.now()) {
    if (!CURRENT_SHOPPING_STAPLE_IDS.has(stapleId)) return false;
    this.state.shoppingStapleNames ??= {};
    delete this.state.shoppingStapleNames[stapleId];
    this.log('shoppingStapleNameReset', { stapleId }, now);
    return true;
  }
}

export function validateSessionState(state) {
  const errors = [];
  if (state.version !== STATE_VERSION) errors.push('state version');
  if (!Array.isArray(state.players) || state.players.length < 6 || state.players.length > 10) errors.push('player count');
  if (!Number.isInteger(state.chapterIndex) || state.chapterIndex < 0 || state.chapterIndex >= CHAPTERS.length) errors.push('chapter index');
  if (!supportedIngredientPlan(state.ingredients)) errors.push('ingredient plan');
  if (!Array.isArray(state.ingredientQueues) || state.ingredientQueues.length !== CHAPTERS.length) errors.push('ingredient queues');
  if (!Array.isArray(state.eventQueues) || state.eventQueues.length !== CHAPTERS.length) errors.push('event queues');
  if (!Array.isArray(state.taskQueues) || state.taskQueues.length !== CHAPTERS.length) errors.push('task queues');
  if (!Array.isArray(state.history)) errors.push('history');
  return { valid: errors.length === 0, errors };
}
