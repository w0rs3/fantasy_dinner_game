import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { renderGame } from '../js/ui/game.js';
import { renderPantry, renderTasks } from '../js/ui/overlays.js';
import { EVENT_DECKS, WATCH_CHALLENGES, isNonFundamentalEvent } from '../js/data/events.js';
import { STORY_QUIZ_CARDS } from '../js/data/story-events.js';
import { INGREDIENT_EFFECT_TEXT, SHOPPING_STAPLES } from '../js/data/ingredients.js';
import { TASK_DECKS } from '../js/data/tasks.js';
import { drawNextNonStoryEvent, resolvePendingLocationStories } from './test-helpers.mjs';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Ella', 'Finn', 'Greta', 'Hugo'];
const now = 1_800_000_000_000;

function create(seed = 71) {
  return GameEngine.create({ names, title: 'Stage flow', defaultLanguage: 'de', seed }, now);
}

function dieFaceForOutcome(event, outcomeCode) {
  const index = event.outcomes.indexOf(outcomeCode);
  return event.orderedCoinRoll ? index + 1 : [1, 3, 5][index];
}

function beginSecondCourse(engine) {
  const openingTask = engine.state.tasks.find((task) => ['queued', 'active', 'ready'].includes(task.status));
  if (openingTask) assert.equal(engine.completeTask(openingTask.instanceId, now + 500), true);
  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(now + 1_000), true);
  assert.equal(engine.state.chapterIndex, 1);
  assert.equal(engine.state.chapter.stage, 'clearing');
  assert.equal(engine.state.turn.phase, 'taskBriefing');
  const clearingTask = engine.state.tasks.find((task) => task.chapterIndex === 1 && engine.getTaskCard(task)?.questId === 'reset');
  assert.ok(clearingTask);
  assert.equal(engine.completeTask(clearingTask.instanceId, now + 1_005), true);
  assert.equal(engine.state.chapter.stage, 'ingredients');
  assert.equal(engine.endTurn(now + 1_006), true);
  assert.ok(engine.beginEvent(now + 1_010));
  assert.equal(engine.state.turn.phase, 'courseDecision');
  assert.equal(engine.chooseSoupStyle('cream', now + 1_020), true);
  resolvePendingLocationStories(engine, now + 1_021);
}

test('the dessert treasure-plan card names the exact people in both subteams', () => {
  const engine = create(70);
  engine.state.chapterIndex = 4;
  const card = TASK_DECKS[4].find((candidate) => candidate.title.de === 'Die zwei Schatzpläne');
  const instance = {
    taskId: card.id,
    chapterIndex: 4,
    assignedPlayerIds: engine.state.players.slice(0, 4).map((player) => player.id)
  };
  const instruction = engine.getTaskCard(instance).instruction.de;
  assert.match(instruction, /Frucht-Team: Ada, Ben\./);
  assert.match(instruction, /Schatz-Team: Cleo, Dario\./);
});

test('every later course starts by clearing the previous table before ingredient selection', () => {
  const engine = create(70);
  engine.state.tasks.forEach((task) => { task.status = 'done'; });
  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(now + 1_000), true);
  const clearing = engine.state.tasks.find((task) => task.chapterIndex === 1 && engine.getTaskCard(task)?.questId === 'reset');
  assert.ok(clearing);
  assert.equal(engine.state.chapter.stage, 'clearing');
  assert.equal(engine.state.turn.phase, 'taskBriefing');
  assert.equal(engine.currentEventStage(), 'cooking');
  assert.equal(engine.courseIngredients().length, 0);
  const html = renderGame(engine, 'de');
  assert.match(html, /Tapastafel abräumen/);
  assert.match(html, /Abräumen/);
  assert.doesNotMatch(html, /Vorrats-Ereigniskarte ziehen/);
  assert.equal(engine.completeTask(clearing.instanceId, now + 1_100), true);
  assert.equal(engine.state.chapter.stage, 'ingredients');
});

test('free players draw ordinary events while the clearing task is still running', () => {
  const engine = create(7_006);
  engine.state.tasks.forEach((task) => { task.status = 'done'; });
  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(now + 1_000), true);
  const clearing = engine.state.tasks.find((task) => task.chapterIndex === 1 && engine.getTaskCard(task)?.questId === 'reset');
  assert.ok(clearing);

  assert.equal(engine.acceptTaskBriefing(now + 1_010), true);
  assert.equal(clearing.status, 'active');
  assert.equal(engine.state.chapter.stage, 'clearing');
  assert.equal(engine.endTurn(now + 1_020), true);
  assert.equal(engine.currentEventStage(), 'cooking');

  const drawHtml = renderGame(engine, 'de');
  assert.match(drawHtml, /Vom globalen Stapel ziehen/);
  assert.doesNotMatch(drawHtml, /Tisch klarmachen|Abräum-Aufgabe ansehen|Der vorige Gang wird vollständig abgeräumt/);

  resolvePendingLocationStories(engine, now + 1_030);
  const taskCount = engine.state.tasks.length;
  const cookingEvent = EVENT_DECKS[1].find((card) => card.stage === 'cooking' && card.archetype === 'cache');
  engine.state.nonFundamentalQueue = [cookingEvent.id];
  const event = drawNextNonStoryEvent(engine, now + 1_100);
  assert.equal(event.stage, 'cooking');
  assert.equal(engine.state.tasks.length, taskCount, 'a free turn must not start another kitchen task while clearing runs');
  assert.equal(clearing.status, 'active');
  assert.equal(engine.state.chapter.stage, 'clearing');
});

test('required ingredients in their final eligible course are locked automatically when the ingredient round begins', () => {
  const engine = create(7_005);
  engine.state.chapterIndex = 1;
  engine.state.turn.phase = 'eating';
  assert.equal(engine.startNextChapter(now + 1_000), true);
  assert.equal(engine.currentChapter.id, 'salad');
  const expiringIds = engine.expiringIngredientCandidates().map((ingredient) => ingredient.id);
  assert.ok(expiringIds.includes('lettuce'));
  assert.ok(expiringIds.includes('croutons'));
  const optionalIds = engine.state.ingredients.filter((ingredient) => !ingredient.essential).map((ingredient) => ingredient.id);
  const ingredientCoinChangesBefore = engine.state.history.filter((entry) => entry.type === 'coinsChanged' && entry.data.source === 'ingredient').length;
  const effectsBefore = engine.state.ingredientEffectStack.length;
  const clearing = engine.state.tasks.find((task) => task.chapterIndex === 2 && engine.getTaskCard(task)?.questId === 'reset');

  assert.equal(engine.completeTask(clearing.instanceId, now + 1_100), true);

  assert.equal(engine.state.chapter.stage, 'ingredients');
  assert.deepEqual(new Set(engine.state.chapter.autoLockedIngredientIds), new Set(expiringIds));
  expiringIds.forEach((ingredientId) => {
    const ingredient = engine.getIngredient(ingredientId);
    assert.equal(ingredient.status, 'locked');
    assert.equal(ingredient.chapterIndex, 2);
    assert.equal(ingredient.basketCourseIndex, null);
    assert.equal(ingredient.lockedBy, null);
    assert.equal(ingredient.autoLockedChapterIndex, 2);
  });
  assert.ok(optionalIds.every((ingredientId) => engine.getIngredient(ingredientId).autoLockedChapterIndex == null), 'optional ingredients may remain unused');
  assert.equal(engine.unlockedCourseIngredients().length, 0, 'automatic ingredients never enter the open basket');
  assert.equal(engine.state.history.filter((entry) => entry.type === 'coinsChanged' && entry.data.source === 'ingredient').length, ingredientCoinChangesBefore, 'automatic locking does not trigger draw effects');
  assert.equal(engine.state.ingredientEffectStack.length, effectsBefore, 'automatic locking does not store card effects');
  assert.match(renderGame(engine, 'de'), /Automatisch festgelegt · letzter möglicher Gang/);
});

test('Tapas starts with its required stories and then mixes global and fundamental cards', () => {
  const engine = create();

  assert.equal(engine.state.chapter.stage, 'tasks');
  assert.equal(engine.state.turn.phase, 'draw');
  assert.ok(engine.courseIngredients().every((ingredient) => ingredient.status === 'locked'));
  assert.equal(engine.state.tasks.length, 0);
  assert.equal(engine.freePlayersForTask().length, names.length);

  const html = renderGame(engine, 'de');
  assert.match(html, /Nächste Karte ziehen/);
  assert.doesNotMatch(html, /Der Plan des Hafenmeisters/);
  const story = engine.beginEvent(now + 2_000);
  assert.equal(story.storyKind, 'island');
  assert.equal(engine.completeStoryCard(now + 2_001), true);
  assert.equal(engine.endTurn(now + 2_002), true);
  const locationStory = engine.beginEvent(now + 2_003);
  assert.equal(locationStory.storyKind, 'location');
  assert.equal(locationStory.locationIndex, 0);
  assert.equal(engine.completeStoryCard(now + 2_004), true);
  assert.equal(engine.endTurn(now + 2_005), true);

  const globalEvent = EVENT_DECKS[0].find((event) => isNonFundamentalEvent(event) && event.archetype === 'watch');
  engine.state.nonFundamentalQueue = [globalEvent.id];
  engine.state.chapter.eventDeckHistory = ['fundamental', 'fundamental'];
  assert.equal(engine.nextEventDeckKind(), 'nonFundamental');
  const globalDrawHtml = renderGame(engine, 'de');
  assert.match(globalDrawHtml, /2 · Spaß & Aufgaben/);
  assert.match(globalDrawHtml, /Vom globalen Stapel ziehen/);
  assert.equal(engine.beginEvent(now + 2_006).id, globalEvent.id);
  assert.equal(engine.resolveChoice('treasure', now + 2_007), true);
  assert.equal(engine.endTurn(now + 2_008), true);

  assert.equal(engine.nextEventDeckKind(), 'fundamental');
  assert.ok(['orders', 'duty', 'guild'].includes(engine.beginEvent(now + 2_009)?.archetype));
});

test('mixed deck selection is random when both sources are ready and prevents three-card source streaks', () => {
  const seen = new Set();
  for (let seed = 100; seed < 140; seed += 1) {
    const engine = create(seed);
    engine.state.pendingLocationStoryIds = [];
    engine.state.chapter.eventDeckHistory = [];
    seen.add(engine.nextEventDeckKind());
  }
  assert.deepEqual(seen, new Set(['fundamental', 'nonFundamental']));

  const engine = create(140);
  engine.state.pendingLocationStoryIds = [];
  engine.state.chapter.eventDeckHistory = ['fundamental', 'fundamental'];
  assert.equal(engine.nextEventDeckKind(), 'nonFundamental');
  engine.state.chapter.eventDeckHistory = ['nonFundamental', 'nonFundamental'];
  assert.equal(engine.nextEventDeckKind(), 'fundamental');

  engine.state.eventQueues[0].tasks.forEach((queue) => queue.splice(0, queue.length));
  engine.state.taskQueues[0] = [];
  assert.equal(engine.fundamentalCardAvailable(), false);
  assert.equal(engine.nextEventDeckKind(), 'nonFundamental');
});

test('an exhausted ingredient-event queue still finishes a seven-of-eight salad', () => {
  const engine = create(141);
  engine.state.ingredients.filter((ingredient) => ingredient.chapterIndex === 0)
    .forEach((ingredient) => { ingredient.status = 'used'; });
  engine.state.chapterIndex = 1;
  engine.state.chapter.stage = 'ingredients';
  engine.state.pendingLocationStoryIds = [];

  let timestamp = now + 10_000;
  const lockNextCandidate = () => {
    const ingredient = engine.courseIngredientCandidates()[0];
    assert.ok(ingredient);
    ingredient.status = 'discovered';
    ingredient.chapterIndex = engine.state.chapterIndex;
    ingredient.basketCourseIndex = engine.state.chapterIndex;
    ingredient.discoveredAt = timestamp;
    ingredient.discoveredBy = engine.activePlayer.id;
    engine.state.lastIngredientId = ingredient.id;
    assert.equal(engine.lockLastIngredient(timestamp + 1), true);
    timestamp += 2;
  };

  while (!engine.ingredientsLockedForCourse()) lockNextCandidate();
  engine.courseIngredients().forEach((ingredient) => { ingredient.status = 'used'; });
  engine.state.chapterIndex = 2;
  engine.state.chapter.stage = 'ingredients';
  engine.autoLockExpiringIngredients(timestamp);
  while (engine.courseIngredients().filter((ingredient) => ingredient.essential && ingredient.status === 'locked').length < 7) {
    lockNextCandidate();
  }

  engine.state.eventQueues[2].ingredients.forEach((queue) => queue.splice(0, queue.length));
  engine.state.turn.phase = 'draw';
  engine.state.chapter.eventDeckHistory = ['nonFundamental', 'nonFundamental'];
  assert.equal(engine.courseIngredients().filter((ingredient) => ingredient.essential && ingredient.status === 'locked').length, 7);
  assert.ok(engine.courseIngredientCandidates().length > 0);
  assert.equal(engine.fundamentalCardAvailable(), true, 'the guaranteed progress action counts as a fundamental draw');
  assert.equal(engine.nextEventDeckKind(), 'fundamental');

  const result = engine.beginEvent(timestamp + 1);
  assert.deepEqual(result, { fallback: true, action: 'discoverIngredient' });
  assert.equal(engine.state.turn.phase, 'ingredientChoice');
  assert.ok(engine.state.turn.pendingIngredientIds.length > 0);
});

test('fundamental task queues contain no fun cards and the global deck contains every fun wrapper', () => {
  for (let seed = 80; seed < 90; seed += 1) {
    const engine = create(seed);
    const nonFundamentalEventIds = EVENT_DECKS.flat().filter(isNonFundamentalEvent).map((event) => event.id);
    const fundamentalIds = Object.values(engine.state.eventQueues).flatMap((chapterQueues) => Object.values(chapterQueues).flat(2));
    assert.ok(nonFundamentalEventIds.every((id) => engine.state.nonFundamentalQueue.includes(id)));
    assert.ok(nonFundamentalEventIds.every((id) => !fundamentalIds.includes(id)));
  }
});

test('reading lore unlocks its quizzes into the shuffled global deck', () => {
  const engine = create(91);
  assert.equal(engine.state.nonFundamentalQueue.some((id) => STORY_QUIZ_CARDS.some((quiz) => quiz.id === id)), false);
  resolvePendingLocationStories(engine, now + 10);
  const unlocked = STORY_QUIZ_CARDS.filter((quiz) => ['SI1', 'SL1-1'].includes(quiz.sourceStoryId));
  assert.ok(unlocked.length > 0);
  assert.ok(unlocked.every((quiz) => engine.state.nonFundamentalQueue.includes(quiz.id)));
  assert.ok(engine.state.history.some((entry) => entry.type === 'nonFundamentalDeckShuffled' && entry.data.reason === 'quizUnlocked'));
});

test('separate state decks never expose an impossible ingredient or task action', () => {
  const engine = create(72);
  resolvePendingLocationStories(engine, now + 1_900);
  engine.state.chapter.eventDeckHistory = ['nonFundamental', 'nonFundamental'];
  const taskEvent = engine.beginEvent(now + 2_000);
  assert.equal(taskEvent.stage, 'tasks');
  assert.ok((taskEvent.options ?? taskEvent.outcomes).every((action) => engine.actionAvailable(action)));
  assert.ok((taskEvent.options ?? taskEvent.outcomes).every((action) => !['discoverIngredient', 'lockIngredient', 'swapIngredient'].includes(action)));

  beginSecondCourse(engine);
  engine.state.chapter.eventDeckHistory = ['nonFundamental', 'nonFundamental'];
  const ingredientEvent = engine.beginEvent(now + 3_000);
  assert.equal(ingredientEvent.stage, 'ingredients');
  const actions = ingredientEvent.options ?? ingredientEvent.outcomes;
  assert.ok(actions.every((action) => engine.actionAvailable(action)));
  assert.ok(actions.every((action) => !['drawTask', 'singleTask', 'teamTask', 'treasureAndTask'].includes(action)));
  assert.ok(!actions.includes('swapIngredient'), 'swap is hidden before any unlocked ingredient exists');
  assert.ok(!actions.includes('lockIngredient'), 'lock is hidden before any unlocked ingredient exists');
});

test('ordinary and fun events borrowed from another queue use the currently active location in their text', () => {
  for (const archetype of ['orders', 'work-mischief']) {
    const engine = create(archetype === 'orders' ? 7201 : 7202);
    engine.state.pendingLocationStoryIds = [];
    const activeLocationIndex = engine.activeGroup.locationIndex;
    const sourceLocationIndex = activeLocationIndex + 1;
    const activeLocation = engine.currentChapter.locations[activeLocationIndex];
    const sourceLocation = engine.currentChapter.locations[sourceLocationIndex];
    const card = EVENT_DECKS[engine.state.chapterIndex].find((event) =>
      event.stage === 'tasks' && event.locationIndex === sourceLocationIndex && event.archetype === archetype
    );
    assert.ok(card);
    const stageQueues = engine.state.eventQueues[engine.state.chapterIndex].tasks;
    stageQueues.forEach((queue) => queue.splice(0, queue.length));
    if (isNonFundamentalEvent(card)) {
      engine.state.nonFundamentalQueue = [card.id];
      engine.state.chapter.eventDeckHistory = ['fundamental', 'fundamental'];
    } else {
      stageQueues[sourceLocationIndex].push(card.id);
      engine.state.chapter.eventDeckHistory = ['nonFundamental', 'nonFundamental'];
    }

    const drawn = engine.beginEvent(now + 2_500);
    assert.equal(drawn.id, card.id);
    assert.equal(drawn.locationIndex, sourceLocationIndex, 'the physical source queue remains available for correct requeueing');
    assert.match(drawn.title.de, new RegExp(activeLocation.de));
    assert.match(drawn.title.en, new RegExp(activeLocation.en));
    assert.match(drawn.story.de, new RegExp(activeLocation.de));
    assert.match(drawn.story.en, new RegExp(activeLocation.en));
    assert.doesNotMatch(drawn.title.de, new RegExp(sourceLocation.de));
    assert.doesNotMatch(drawn.title.en, new RegExp(sourceLocation.en));
  }
});

test('fun events can be drawn and resolved during ingredient rounds without changing the basket', () => {
  const engine = create(721);
  beginSecondCourse(engine);
  const funCard = EVENT_DECKS[1].find((event) => event.archetype === 'pantry-mischief');
  const challenge = WATCH_CHALLENGES.find((card) => card.id === 'folded-note');
  engine.state.nonFundamentalQueue = [funCard.id, challenge.id];

  const basketBefore = engine.courseIngredients().map((ingredient) => ingredient.id);
  const event = engine.drawNonFundamentalCard(now + 3_100);
  assert.equal(event.stage, 'ingredients');
  assert.equal(event.archetype, 'pantry-mischief');
  assert.ok(event.options.includes('watchChallenge'));
  assert.ok(event.options.includes('coinLoss'));
  assert.equal(event.options.includes('treasure'), false);
  assert.equal(event.options.includes('storyMoment'), false);
  assert.equal(engine.actionAvailable('watchChallenge'), true);
  const coinsBefore = engine.state.coins;
  assert.equal(engine.resolveChoice('coinLoss', now + 3_200), true);
  assert.equal(engine.state.turn.phase, 'resolved');
  assert.ok(engine.state.coins <= coinsBefore);
  assert.deepEqual(engine.courseIngredients().map((ingredient) => ingredient.id), basketBefore);
  assert.equal(engine.state.chapter.stage, 'ingredients');
});

test('fun events can also be drawn during task rounds and dice outcomes stay distinct', () => {
  const engine = create(723);
  resolvePendingLocationStories(engine, now + 1_900);
  engine.state.chapter.stage = 'tasks';
  engine.state.turn.phase = 'draw';
  engine.activeGroup.locationProgress = 20;
  engine.maybeAdvanceGroup(engine.activeGroup);
  resolvePendingLocationStories(engine, now + 1_950);
  const funCard = EVENT_DECKS[0].find((event) => event.archetype === 'work-mischief');
  const challenge = WATCH_CHALLENGES.find((card) => card.id === 'folded-note');
  engine.state.nonFundamentalQueue = [funCard.id, challenge.id];
  const event = engine.drawNonFundamentalCard(now + 2_000);
  assert.equal(event.archetype, 'work-mischief');
  assert.equal(event.stage, 'tasks');
  assert.equal(new Set(event.outcomes).size, 3);
  assert.ok(event.outcomes.includes('watchChallenge'));
});

test('the global deck can draw an unlocked quiz while kitchen work remains open', () => {
  const engine = create(7231);
  engine.state.pendingLocationStoryIds = [];
  engine.state.chapter.stage = 'cooking';
  engine.state.taskQueues[0] = [];
  const taskCard = TASK_DECKS[0].find((card) => card.playable && card.people[0] > 0);
  engine.state.tasks = [{
    instanceId: 'long-running-kitchen-work',
    taskId: taskCard.id,
    chapterIndex: 0,
    groupId: engine.activeGroup.id,
    assignedPlayerIds: [engine.state.players[1].id],
    status: 'active',
    assignedAt: now,
    startedAt: now
  }];
  engine.state.eventsDrawn.push('SI1');
  engine.unlockEligibleStoryQuizzes(now + 2_050);
  const quizId = engine.state.nonFundamentalQueue.find((id) => STORY_QUIZ_CARDS.some((quiz) => quiz.id === id));
  engine.state.nonFundamentalQueue = [quizId];

  const result = engine.beginEvent(now + 2_100);
  assert.equal(engine.state.turn.phase, 'event');
  assert.equal(result.storyKind, 'quiz');
  assert.equal(engine.state.history.some((entry) => entry.type === 'crewWaitingForTask'), false);
  assert.equal(engine.state.history.some((entry) => entry.type === 'crewWaitingForTask'), false);
});

test('event chains remember every earlier card and cannot alternate forever', () => {
  const engine = create(724);
  resolvePendingLocationStories(engine, now - 10);
  engine.state.chapter.stage = 'cooking';
  engine.state.taskQueues[0] = [];
  engine.state.tasks = TASK_DECKS[0].filter((card) => card.playable).map((card, index, cards) => ({
    instanceId: `done-${index}`,
    taskId: card.id,
    chapterIndex: 0,
    assignedPlayerIds: [],
    status: index === cards.length - 1 ? 'active' : 'done',
    assignedAt: now,
    startedAt: now,
    completedAt: now
  }));
  const watchCards = EVENT_DECKS[0].filter((event) => event.archetype === 'watch');
  const chainDice = EVENT_DECKS[0].find((event) => event.type === 'dice' && event.outcomes?.includes('treasureAndChain'));
  const exitCard = EVENT_DECKS[0].find((event) => event.stage === 'cooking' && event.archetype === 'mischief');
  assert.ok(watchCards.length >= 2 && chainDice && exitCard);
  engine.maybeAdvanceGroup(engine.activeGroup);
  resolvePendingLocationStories(engine, now - 5);
  const activePlayerId = engine.activePlayer.id;
  engine.state.nonFundamentalQueue = [watchCards[0].id, chainDice.id, exitCard.id];
  engine.state.turn.phase = 'draw';

  const first = engine.beginEvent(now + 1);
  assert.equal(first.id, watchCards[0].id);
  assert.equal(engine.resolveChoice('treasureAndChain', now + 2), true);
  assert.equal(engine.endTurn(now + 3), 'chain');
  assert.equal(engine.state.turn.chainDepth, 1);

  const second = engine.beginEvent(now + 4);
  assert.equal(second.id, chainDice.id, 'an available card with different controls is preferred over the same two choices again');
  engine.rollDie(now + 5);
  const chainOutcomeIndex = engine.currentEvent.outcomes.indexOf('treasureAndChain');
  assert.ok(chainOutcomeIndex >= 0);
  engine.state.turn.dieResult = dieFaceForOutcome(engine.currentEvent, 'treasureAndChain');
  assert.equal(engine.confirmRoll(now + 6), true);
  assert.equal(engine.state.turn.chainPending, true, 'a second chain result must not be silently converted into a turn end');
  assert.equal(engine.endTurn(now + 7), 'chain');
  assert.equal(engine.state.turn.chainDepth, 2);
  assert.equal(engine.actionAvailable('treasureAndChain'), false, 'two follow-up cards are the hard limit for one event chain');
  assert.equal(engine.state.turn.chainEventSignatures.length, 2);
  assert.equal(new Set(engine.state.turn.chainEventSignatures).size, 2);

  const third = engine.beginEvent(now + 8);
  assert.equal(third.id, exitCard.id, 'the chain must not return to the watch template already used at its start');
  assert.notEqual(third.archetype, first.archetype);
  assert.notEqual(third.archetype, second.archetype);
  assert.ok(!(third.options ?? third.outcomes ?? []).includes('treasureAndChain'));
  assert.equal(engine.activePlayer.id, activePlayerId, 'the same turn and active player survive the whole event chain');
});

test('an exhausted global deck ends a chain cleanly', () => {
  const engine = create(7241);
  resolvePendingLocationStories(engine, now - 10);
  engine.state.chapter.stage = 'cooking';
  engine.state.taskQueues[0] = [];
  engine.state.tasks = TASK_DECKS[0].filter((card) => card.playable).map((card, index, cards) => ({
    instanceId: `chain-exhausted-${index}`,
    taskId: card.id,
    chapterIndex: 0,
    assignedPlayerIds: [],
    status: index === cards.length - 1 ? 'active' : 'done',
    assignedAt: now,
    startedAt: now,
    completedAt: now
  }));
  engine.maybeAdvanceGroup(engine.activeGroup);
  resolvePendingLocationStories(engine, now - 5);
  const repeatedDice = EVENT_DECKS[0].filter((event) =>
    event.stage === 'cooking' && event.type === 'dice' && event.archetype === 'cache' && event.outcomes.includes('treasureAndChain')
  );
  assert.ok(repeatedDice.length >= 2);
  engine.state.nonFundamentalQueue = [repeatedDice[0].id];
  engine.state.turn.phase = 'draw';

  assert.equal(engine.beginEvent(now + 30).id, repeatedDice[0].id);
  engine.rollDie(now + 31);
  const chainOutcomeIndex = engine.currentEvent.outcomes.indexOf('treasureAndChain');
  engine.state.turn.dieResult = dieFaceForOutcome(engine.currentEvent, 'treasureAndChain');
  assert.equal(engine.confirmRoll(now + 32), true);
  assert.equal(engine.endTurn(now + 33), 'chain');

  const ended = engine.beginEvent(now + 34);
  assert.deepEqual(ended, { fallback: true, action: 'chainComplete' });
  assert.equal(engine.state.turn.phase, 'resolved');
  assert.equal(engine.currentEvent, null);
  assert.match(renderGame(engine, 'de'), /Die Ereigniskette endet, bevor sich eine Karte oder Auswahl wiederholt/);
});

test('a chained draw follows the physical order of the global deck', () => {
  const engine = create(725);
  resolvePendingLocationStories(engine, now - 10);
  engine.state.chapter.stage = 'cooking';
  engine.state.taskQueues[0] = [];
  engine.state.tasks = TASK_DECKS[0].filter((card) => card.playable).map((card, index, cards) => ({
    instanceId: `chain-done-${index}`,
    taskId: card.id,
    chapterIndex: 0,
    assignedPlayerIds: [],
    status: index === cards.length - 1 ? 'active' : 'done',
    assignedAt: now,
    startedAt: now,
    completedAt: now
  }));
  engine.maybeAdvanceGroup(engine.activeGroup);
  resolvePendingLocationStories(engine, now - 5);
  const repeatedDice = EVENT_DECKS[0].filter((event) =>
    event.stage === 'cooking' && event.type === 'dice' && event.archetype === 'cache' && event.outcomes.includes('treasureAndChain')
  );
  const visiblyDifferent = EVENT_DECKS[0].find((event) => event.stage === 'cooking' && event.archetype === 'watch');
  assert.ok(repeatedDice.length >= 2 && visiblyDifferent);
  engine.state.nonFundamentalQueue = [
    repeatedDice[0].id,
    repeatedDice[1].id,
    visiblyDifferent.id
  ];
  engine.state.turn.phase = 'draw';

  assert.equal(engine.beginEvent(now + 20).id, repeatedDice[0].id);
  assert.ok(engine.rollDie(now + 21));
  const chainOutcomeIndex = engine.currentEvent.outcomes.indexOf('treasureAndChain');
  engine.state.turn.dieResult = dieFaceForOutcome(engine.currentEvent, 'treasureAndChain');
  assert.equal(engine.confirmRoll(now + 22), true);
  assert.equal(engine.endTurn(now + 23), 'chain');

  const chained = engine.beginEvent(now + 24);
  assert.equal(chained.id, repeatedDice[1].id);
  assert.equal(chained.archetype, repeatedDice[0].archetype);
  assert.deepEqual(chained.options ?? chained.outcomes, repeatedDice[0].outcomes);
});

test('loading a voyage removes drawn and duplicate IDs from the global deck', () => {
  const engine = create(726);
  const snapshot = engine.snapshot();
  const queue = snapshot.nonFundamentalQueue;
  const drawnId = queue[0];
  const duplicateId = queue[1];
  snapshot.eventsDrawn.push(drawnId);
  queue.unshift(drawnId, duplicateId);

  const restored = new GameEngine(snapshot);
  const queuedIds = restored.state.nonFundamentalQueue;
  assert.equal(queuedIds.includes(drawnId), false);
  assert.equal(queuedIds.filter((eventId) => eventId === duplicateId).length, 1);
  assert.equal(new Set(queuedIds).size, queuedIds.length);
});

test('saved voyages receive missing ingredient fun events without restoring cards already drawn', () => {
  const engine = create(722);
  beginSecondCourse(engine);
  const snapshot = engine.snapshot();
  const funIds = EVENT_DECKS[1].filter((event) => event.archetype === 'pantry-mischief').map((event) => event.id);
  snapshot.nonFundamentalQueue = snapshot.nonFundamentalQueue.filter((eventId) => !funIds.includes(eventId));
  snapshot.eventsDrawn.push(funIds[0]);

  const restored = new GameEngine(snapshot);
  const restoredFunIds = restored.state.nonFundamentalQueue.filter((eventId) => funIds.includes(eventId));
  assert.equal(restoredFunIds.length, funIds.length - 1);
  assert.ok(!restoredFunIds.includes(funIds[0]));
  assert.ok(funIds.slice(1).every((eventId) => restoredFunIds.includes(eventId)));
});

test('ingredients must be discovered and locked before the work-order deck can assign tasks', () => {
  const engine = create(73);
  beginSecondCourse(engine);
  const chapterIndex = engine.state.chapterIndex;

  let guard = 0;
  while (!engine.ingredientsLockedForCourse() && guard < 100) {
    guard += 1;
    const ingredient = engine.unlockedCourseIngredients()[0] ?? engine.courseIngredientCandidates()[0];
    assert.ok(ingredient, 'a valid ingredient must remain until the course composition is complete');
    if (ingredient.status === 'available') {
      ingredient.status = 'discovered';
      ingredient.chapterIndex = chapterIndex;
      ingredient.basketCourseIndex = chapterIndex;
    }
    ingredient.status = 'discovered';
    ingredient.discoveredAt = now + 2_000;
    ingredient.discoveredBy = engine.activePlayer.id;
    engine.state.lastIngredientId = ingredient.id;
    assert.equal(engine.ingredientsLockedForCourse(), false, 'an open basket blocks the task stage even at the target');
    assert.equal(engine.lockLastIngredient(now + 3_000), true);
  }

  assert.equal(engine.ingredientsLockedForCourse(), true);
  assert.equal(engine.requiredCourseIngredients().filter((ingredient) => ingredient.status === 'locked').length, engine.courseRule().target);
  assert.equal(engine.unlockedCourseIngredients().length, 0);
  assert.equal(engine.state.chapter.stage, 'tasks');
  assert.equal(engine.state.tasks.filter((task) => task.chapterIndex === chapterIndex && engine.getTaskCard(task)?.questId !== 'reset').length, 0);
  engine.state.turn.phase = 'draw';
  engine.state.chapter.eventDeckHistory = ['nonFundamental', 'nonFundamental'];
  const event = drawNextNonStoryEvent(engine, now + 4_000);
  assert.equal(event.stage, 'tasks');
  assert.ok((event.options ?? event.outcomes).every((action) => engine.actionAvailable(action)));
});

test('the main course exposes parallel preparation lines before every selected ingredient enters the roasting bag', () => {
  const engine = create(7_403);
  const selectedIds = ['beef', 'potatoes', 'carrots', 'apples', 'nuts'];
  engine.state.chapterIndex = 3;
  engine.state.chapter.stage = 'tasks';
  engine.state.turn.phase = 'draw';
  engine.state.tasks = [];
  engine.state.ingredients.forEach((ingredient) => {
    if (selectedIds.includes(ingredient.id)) {
      ingredient.status = 'locked';
      ingredient.chapterIndex = 3;
      ingredient.basketCourseIndex = null;
    } else if (ingredient.essential) {
      ingredient.status = 'used';
      ingredient.chapterIndex = ingredient.courseTags.includes('tapas') ? 0 : 2;
      ingredient.basketCourseIndex = null;
    }
  });
  engine.reconcileTaskQueue(3);

  const questIds = new Set(engine.taskCardCandidates().map((card) => card.questId));
  assert.ok(['meat', 'vegetables', 'fruit', 'sauce', 'preheat'].every((questId) => questIds.has(questId)), 'all five preparation jobs can be dealt independently');
  assert.equal(questIds.has('assembly'), false, 'the roasting bag waits for preparation');

  const fillCard = TASK_DECKS[3].find((card) => card.title.de === 'Das große Feuerpaket befüllen');
  assert.deepEqual(engine.reserveTaskBasket(fillCard, 'main-fill').sort(), [...selectedIds].sort(), 'the roasting bag receives meat, vegetables, fruit, nuts, and other selected components');
});

test('a completed ingredient target switches decks before another card is drawn', () => {
  const engine = create(7_406);
  const selectedIds = new Set(['beef', 'potatoes', 'carrots', 'asparagus', 'onions', 'garlic', 'mustard', 'apples', 'nuts', 'seeds', 'kohlrabi']);
  engine.state.chapterIndex = 3;
  engine.state.chapter.stage = 'ingredients';
  engine.state.turn.phase = 'draw';
  engine.state.tasks = [];
  engine.state.ingredients.forEach((ingredient) => {
    if (selectedIds.has(ingredient.id)) {
      ingredient.status = 'locked';
      ingredient.chapterIndex = 3;
      ingredient.basketCourseIndex = null;
    } else if (ingredient.essential) {
      ingredient.status = 'used';
      ingredient.chapterIndex = ingredient.courseTags.includes('tapas') ? 0 : 2;
      ingredient.basketCourseIndex = null;
    }
  });

  assert.equal(engine.ingredientsLockedForCourse(), true);
  engine.state.chapter.eventDeckHistory = ['nonFundamental', 'nonFundamental'];
  const event = drawNextNonStoryEvent(engine, now + 1);
  assert.equal(engine.state.chapter.stage, 'tasks');
  assert.equal(event.stage, 'tasks');
  assert.equal(engine.state.turn.phase, 'event');
});

test('loading the main-course roasting bag automatically opens one unassigned baking task that gates the finish', () => {
  const engine = create(7_404);
  const main = TASK_DECKS[3];
  const completedCards = main.filter((card) => card.playable && card.blueprintIndex <= 7);
  engine.state.chapterIndex = 3;
  engine.state.chapter.stage = 'tasks';
  engine.state.turn.phase = 'draw';
  engine.state.tasks = completedCards.map((card, index) => ({
    instanceId: `main-complete-${index}`,
    taskId: card.id,
    chapterIndex: 3,
    locationIndex: 0,
    groupId: engine.activeGroup.id,
    coreKey: null,
    assignedPlayerIds: [engine.state.players[index % engine.state.players.length].id],
    status: 'done',
    assignedAt: now + index,
    startedAt: now + index,
    endAt: null,
    readyAt: null,
    completedAt: now + index + 1,
    timingMode: card.timingMode,
    challengeMinutes: card.challengeMinutes,
    backgroundMinutes: card.backgroundMinutes,
    challengeEndsAt: null,
    taskAbilityAdjustments: [],
    taskCoinAdjustment: 0,
    basketIngredientIds: []
  }));
  engine.state.taskQueues[3] = [];

  engine.reconcileTaskQueue(3, false, now + 100);

  const bakingCard = main.find((card) => card.title.de === 'Bratschlauch backen lassen');
  const bakingTask = engine.state.tasks.find((task) => task.taskId === bakingCard.id);
  assert.ok(bakingTask, 'the baking task appears immediately after the roasting bag was loaded');
  assert.equal(bakingTask.status, 'active');
  assert.deepEqual(bakingTask.assignedPlayerIds, []);
  assert.equal(bakingTask.endAt, null);
  assert.equal(engine.taskCardCandidates().some((card) => card.id === bakingCard.id), false, 'the automatic task is never dealt as a player card');
  assert.equal(engine.state.players.every((player) => engine.isPlayerFreeForTask(player.id)), true, 'the shared oven status occupies no player');

  const tasksHtml = renderTasks(engine, 'de');
  assert.match(tasksHtml, /Bratschlauch backen lassen/);
  assert.match(tasksHtml, /Gemeinsamer Status · niemandem zugewiesen/);
  assert.match(tasksHtml, />Backen ist fertig</);

  const restCard = main.find((card) => card.title.de === 'Ruhe vor dem Festmahl');
  assert.equal(engine.taskCardCandidates().some((card) => card.id === restCard.id), false, 'finishing work stays locked while the bag bakes');
  assert.equal(engine.completeTask(bakingTask.instanceId, now + 45 * 60_000), true);
  assert.equal(engine.taskCardCandidates().some((card) => card.id === restCard.id), true, 'confirming the finished bake unlocks the next step');
});

test('course baskets are card-driven while the pantry shows global, basket, and locked states', () => {
  const engine = create(74);
  beginSecondCourse(engine);
  assert.equal(engine.prepareIngredientChoice(null, 'ability', { count: 2 }), true);
  const skippedIngredientId = engine.state.turn.pendingIngredientIds[0];
  const basketIngredientId = engine.state.turn.pendingIngredientIds[1];
  const offeredIngredient = engine.getIngredient(basketIngredientId);
  let game = renderGame(engine, 'de');
  assert.match(game, /0\/5 Pflichtzutaten/);
  assert.match(game, /Vor dem Wechsel zu den Aufgaben muss der offene Korb leer sein/);
  const choiceButton = game.match(new RegExp(`<button[^>]+data-ingredient-id="${basketIngredientId}"[\\s\\S]*?<\\/button>`))?.[0] ?? '';
  assert.match(choiceButton, new RegExp(`>${offeredIngredient.name.de}<`));
  assert.doesNotMatch(choiceButton, /<small>|wesentlich|optional/);
  assert.ok(!choiceButton.includes(offeredIngredient.suggestedQuantity.de));
  assert.ok(game.includes(INGREDIENT_EFFECT_TEXT[offeredIngredient.effect].de), 'ingredient choices explain their game effect');

  assert.equal(engine.chooseIngredient(basketIngredientId, now + 2_000), true);
  const basketIngredient = engine.getIngredient(basketIngredientId);
  assert.equal(engine.getIngredient(skippedIngredientId).status, 'available', 'the unselected visible ingredient id stays untouched');
  const untouched = engine.state.ingredients.find((ingredient) => ingredient.status === 'available' && ingredient.courseTags.includes('soup'));
  assert.equal(basketIngredient.status, 'discovered');
  assert.equal(basketIngredient.basketCourseIndex, 1);
  game = renderGame(engine, 'de');
  assert.ok(!game.includes(basketIngredient.suggestedQuantity.de), 'the game basket should only show the ingredient name');
  assert.ok(game.includes(INGREDIENT_EFFECT_TEXT[basketIngredient.effect].de), 'the open basket keeps the ingredient effect visible');
  assert.match(game, /Pflichtzutaten ohne späteren möglichen Gang werden zu Rundenbeginn automatisch festgelegt/);
  assert.doesNotMatch(game, /data-action="(?:lock|remove)-basket-ingredient"/, 'the draft basket is informational and cannot bypass ingredient cards');
  assert.doesNotMatch(game, /data-action="assign-cocktail-ingredient"/, 'cocktail assignment cannot be changed manually in the draft basket');

  let pantry = renderPantry(engine, 'de');
  assert.match(pantry, /im Gangkorb/);
  assert.match(pantry, /global verfügbar/);
  assert.ok(pantry.includes(untouched.name.de));
  assert.ok(SHOPPING_STAPLES.every((staple) => pantry.includes(staple.name.de)), 'the active-game ingredient list keeps every shopping staple visible');
  assert.match(pantry, /Allgemeiner Küchenvorrat/);
  assert.ok(pantry.includes(basketIngredient.suggestedQuantity.de), 'the separate ingredient list keeps its quantity recommendation');
  assert.doesNotMatch(pantry, /data-action="(?:lock|remove)-basket-ingredient"/, 'the separate ingredient list is informational and does not edit the course basket');
  assert.equal(engine.lockIngredientFromBasket(basketIngredient.id, now + 3_000), true);
  assert.equal(basketIngredient.status, 'locked');
  game = renderGame(engine, 'de');
  assert.ok(game.includes(INGREDIENT_EFFECT_TEXT[basketIngredient.effect].de), 'locked course ingredients keep the ingredient effect visible');
  pantry = renderPantry(engine, 'de');
  assert.match(pantry, /fest zugeordnet/);

  const restored = new GameEngine(engine.snapshot());
  assert.equal(restored.getIngredient(basketIngredient.id).status, 'locked');
  assert.equal(restored.getIngredient(basketIngredient.id).chapterIndex, 1);
});

test('an ingredient can only be locked once and the resolved card names the ingredient that was actually locked', () => {
  const engine = create(75);
  beginSecondCourse(engine);
  const ingredients = engine.courseIngredientCandidates().slice(0, 2);
  assert.equal(ingredients.length, 2);
  ingredients.forEach((ingredient, index) => {
    ingredient.status = 'discovered';
    ingredient.chapterIndex = 1;
    ingredient.basketCourseIndex = 1;
    ingredient.discoveredAt = now + index;
  });
  engine.state.lastIngredientId = ingredients[1].id;
  const event = EVENT_DECKS[1].find((candidate) => candidate.type === 'choice' && candidate.options.includes('lockIngredient'));
  engine.state.turn.currentEventId = event.id;
  engine.state.turn.phase = 'event';

  assert.equal(engine.resolveChoice('lockIngredient', now + 2_000), true);
  assert.equal(ingredients[1].status, 'locked');
  assert.equal(ingredients[0].status, 'discovered');
  assert.equal(engine.state.turn.resolvedIngredientId, ingredients[1].id);
  const html = renderGame(engine, 'de');
  assert.match(html, new RegExp(`${ingredients[1].name.de} verbindlich festlegen`));
  assert.doesNotMatch(html, new RegExp(`${ingredients[0].name.de} verbindlich festlegen`));
  assert.equal(engine.lockIngredientFromBasket(ingredients[1].id), false, 'the same locked ingredient cannot be locked again');
  assert.equal(engine.lockIngredientFromBasket(ingredients[0].id), true);
  assert.equal(engine.actionAvailable('lockIngredient'), false);
});

test('ingredient events can return an unlocked basket ingredient to the global pantry', () => {
  const engine = create(76);
  beginSecondCourse(engine);
  const ingredient = engine.courseIngredientCandidates()[0];
  ingredient.status = 'discovered';
  ingredient.chapterIndex = 1;
  ingredient.basketCourseIndex = 1;
  ingredient.discoveredAt = now;
  engine.state.lastIngredientId = ingredient.id;
  const event = EVENT_DECKS[1].find((candidate) => candidate.type === 'choice' && candidate.options.includes('returnIngredient'));
  engine.state.turn.currentEventId = event.id;
  engine.state.turn.phase = 'event';

  assert.equal(engine.resolveChoice('returnIngredient', now + 1_000), true);
  assert.equal(ingredient.status, 'available');
  assert.equal(ingredient.chapterIndex, null);
  assert.equal(engine.unlockedCourseIngredients().length, 0);
  assert.equal(engine.state.turn.resolvedIngredientId, ingredient.id);
  assert.match(renderGame(engine, 'de'), new RegExp(`${ingredient.name.de} aus dem Gangkorb zurücklegen`));
});

test('ingredient cards keep no ingredient ids in the stack and bind their target only when revealed', () => {
  const engine = create(780);
  beginSecondCourse(engine);
  const event = EVENT_DECKS[1].find((candidate) =>
    candidate.type === 'choice' && candidate.options.includes('returnIngredient')
  );
  const stageQueues = engine.state.eventQueues[1].ingredients;
  stageQueues.forEach((queue) => queue.splice(0, queue.length));
  const queue = stageQueues[engine.activeGroup.locationIndex];
  queue.push(event.id);

  assert.deepEqual(queue, [event.id]);
  assert.equal(typeof queue[0], 'string');
  assert.equal(engine.state.turn.ingredientActionTargetId, null);
  assert.equal(Object.hasOwn(event, 'ingredientId'), false);
  assert.equal(Object.hasOwn(event, 'ingredientIds'), false);

  const [older, newest, later] = engine.courseIngredientCandidates().slice(0, 3);
  assert.ok(older && newest && later);
  older.status = 'discovered';
  older.chapterIndex = 1;
  older.basketCourseIndex = 1;
  older.discoveredAt = now + 100;
  newest.status = 'discovered';
  newest.chapterIndex = 1;
  newest.basketCourseIndex = 1;
  newest.discoveredAt = now + 200;
  engine.state.lastIngredientId = newest.id;
  engine.state.chapter.eventDeckHistory = ['nonFundamental', 'nonFundamental'];

  assert.equal(engine.beginEvent(now + 300).id, event.id);
  assert.equal(queue.length, 0, 'the event is removed from the stack before its ingredient target is bound');
  assert.equal(engine.state.turn.ingredientActionTargetId, newest.id);

  // A later basket change cannot retarget the already revealed card. Cards
  // still waiting in the stack remain plain ids and will bind afresh later.
  later.status = 'discovered';
  later.chapterIndex = 1;
  later.basketCourseIndex = 1;
  later.discoveredAt = now + 400;
  engine.state.lastIngredientId = later.id;
  const html = renderGame(engine, 'de');
  const button = html.match(/<button[^>]+data-choice="returnIngredient"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? '';
  assert.ok(button.includes(`data-ingredient-id="${newest.id}"`));
  assert.ok(button.includes(newest.name.de));
  assert.ok(!button.includes(later.name.de));
  assert.equal(engine.resolveChoice('returnIngredient', now + 500, newest.id), true);
  assert.equal(newest.status, 'available');
  assert.equal(later.status, 'discovered');
});

test('ingredient-choice alternatives are generated only after the revealed card is activated', () => {
  const engine = create(779);
  beginSecondCourse(engine);
  const event = EVENT_DECKS[1].find((candidate) =>
    candidate.type === 'choice' && candidate.options.includes('discoverIngredient')
  );
  const stageQueues = engine.state.eventQueues[1].ingredients;
  stageQueues.forEach((queue) => queue.splice(0, queue.length));
  stageQueues[engine.activeGroup.locationIndex].push(event.id);

  assert.deepEqual(engine.state.turn.pendingIngredientIds, []);
  assert.equal(engine.beginEvent(now + 300).id, event.id);
  assert.deepEqual(engine.state.turn.pendingIngredientIds, [], 'revealing the event does not preselect hidden ingredient cards');
  assert.equal(engine.resolveChoice('discoverIngredient', now + 400), true);
  assert.equal(engine.state.turn.phase, 'ingredientChoice');
  assert.ok(engine.state.turn.pendingIngredientIds.length >= 2);
  assert.ok(engine.state.turn.pendingIngredientIds.every((ingredientId) =>
    engine.getIngredient(ingredientId).status === 'available'
  ));
  const [skippedId, selectedId] = engine.state.turn.pendingIngredientIds;
  assert.equal(engine.chooseIngredient(selectedId, now + 500), true);
  assert.equal(engine.getIngredient(selectedId).status, 'discovered');
  assert.equal(engine.getIngredient(skippedId).status, 'available');
});

test('ingredient event labels, button ids, and effects always address the same basket ingredient', () => {
  const cases = [
    { action: 'lockIngredient', expectedStatus: 'locked', seed: 781 },
    { action: 'returnIngredient', expectedStatus: 'available', seed: 782 }
  ];

  cases.forEach(({ action, expectedStatus, seed }) => {
    const engine = create(seed);
    beginSecondCourse(engine);
    const [newest, older, stale] = engine.courseIngredientCandidates().slice(0, 3);
    assert.ok(newest && older && stale);
    newest.status = 'discovered';
    newest.chapterIndex = 1;
    newest.basketCourseIndex = 1;
    newest.discoveredAt = now + 200;
    older.status = 'discovered';
    older.chapterIndex = 1;
    older.basketCourseIndex = 1;
    older.discoveredAt = now + 100;
    stale.status = 'discovered';
    stale.chapterIndex = 0;
    stale.basketCourseIndex = 0;
    stale.discoveredAt = now + 300;
    engine.state.lastIngredientId = stale.id;

    const event = EVENT_DECKS[1].find((candidate) =>
      candidate.type === 'choice' && candidate.options.includes(action)
    );
    engine.state.turn.currentEventId = event.id;
    engine.state.turn.phase = 'event';
    engine.captureIngredientActionTarget(engine.currentEvent);

    assert.equal(engine.state.turn.ingredientActionTargetId, newest.id, 'the newest ingredient in the current course is pinned by id');
    const html = renderGame(engine, 'de');
    const button = html.match(new RegExp(`<button[^>]+data-choice="${action}"[^>]*>[\\s\\S]*?<\\/button>`))?.[0] ?? '';
    assert.ok(button.includes(`data-ingredient-id="${newest.id}"`));
    assert.ok(button.includes(newest.name.de));
    assert.ok(!button.includes(older.name.de));
    assert.ok(!button.includes(stale.name.de));

    assert.equal(engine.resolveChoice(action, now + 1_000, newest.id), true);
    assert.equal(newest.status, expectedStatus);
    assert.equal(older.status, 'discovered');
    assert.equal(stale.status, 'discovered');
    assert.equal(stale.chapterIndex, 0);
    assert.equal(engine.state.turn.resolvedIngredientId, newest.id);
  });
});

test('swap ingredient events replace exactly the id named on the event card', () => {
  const engine = create(783);
  beginSecondCourse(engine);
  const target = engine.courseIngredientCandidates().find((ingredient) =>
    engine.swapIngredientAlternatives(ingredient).length > 0
  );
  assert.ok(target);
  const reservedAlternativeId = engine.swapIngredientAlternatives(target)[0].id;
  const decoy = engine.courseIngredientCandidates().find((ingredient) =>
    ![target.id, reservedAlternativeId].includes(ingredient.id)
  );
  const stale = engine.courseIngredientCandidates().find((ingredient) =>
    ![target.id, reservedAlternativeId, decoy?.id].includes(ingredient.id)
  );
  assert.ok(target && decoy && stale);
  target.status = 'discovered';
  target.chapterIndex = 1;
  target.basketCourseIndex = 1;
  target.discoveredAt = now + 200;
  decoy.status = 'discovered';
  decoy.chapterIndex = 1;
  decoy.basketCourseIndex = 1;
  decoy.discoveredAt = now + 100;
  stale.status = 'discovered';
  stale.chapterIndex = 0;
  stale.basketCourseIndex = 0;
  stale.discoveredAt = now + 300;
  engine.state.lastIngredientId = stale.id;

  const event = EVENT_DECKS[1].find((candidate) =>
    candidate.type === 'choice' && candidate.options.includes('swapIngredient')
  );
  engine.state.turn.currentEventId = event.id;
  engine.state.turn.phase = 'event';
  engine.captureIngredientActionTarget(engine.currentEvent);
  const html = renderGame(engine, 'de');
  const button = html.match(/<button[^>]+data-choice="swapIngredient"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? '';
  assert.ok(button.includes(`data-ingredient-id="${target.id}"`));
  assert.ok(button.includes(target.name.de));

  assert.equal(engine.resolveChoice('swapIngredient', now + 1_000, target.id), true);
  assert.equal(target.status, 'available');
  assert.equal(decoy.status, 'discovered');
  assert.equal(stale.status, 'discovered');
  assert.equal(engine.state.turn.resolvedPreviousIngredientId, target.id);
  const replacement = engine.getIngredient(engine.state.turn.resolvedIngredientId);
  assert.equal(replacement.status, 'discovered');
  assert.notEqual(engine.state.turn.resolvedIngredientId, decoy.id);
  assert.deepEqual(engine.state.turn.resolvedIngredientIds, [replacement.id]);
  const resultHtml = renderGame(engine, 'de');
  assert.match(resultHtml, new RegExp(`${target.name.de} wurde durch ${replacement.name.de} ersetzt\\.`));
  assert.match(resultHtml, /Zum Gangkorb hinzugefügt/);
  assert.match(resultHtml, new RegExp(`>${replacement.name.de}<`));
});

test('ingredient event choices reject a stale or tampered target id without changing the basket', () => {
  const engine = create(784);
  beginSecondCourse(engine);
  const [target, other] = engine.courseIngredientCandidates().slice(0, 2);
  [target, other].forEach((ingredient, index) => {
    ingredient.status = 'discovered';
    ingredient.chapterIndex = 1;
    ingredient.basketCourseIndex = 1;
    ingredient.discoveredAt = now + index;
  });
  engine.state.lastIngredientId = other.id;
  const event = EVENT_DECKS[1].find((candidate) =>
    candidate.type === 'choice' && candidate.options.includes('returnIngredient')
  );
  engine.state.turn.currentEventId = event.id;
  engine.state.turn.phase = 'event';
  engine.captureIngredientActionTarget(engine.currentEvent);

  assert.equal(engine.resolveChoice('returnIngredient', now + 1_000, target.id), false);
  assert.equal(target.status, 'discovered');
  assert.equal(other.status, 'discovered');
  assert.equal(engine.state.turn.phase, 'event');
});

test('locking the target count automatically returns every leftover basket ingredient', () => {
  const engine = create(77);
  beginSecondCourse(engine);
  const target = engine.courseRule().target;
  const selected = [];
  while (selected.length < target) {
    const candidate = engine.courseIngredientCandidates()[0];
    assert.ok(candidate);
    candidate.status = 'discovered';
    candidate.chapterIndex = 1;
    candidate.basketCourseIndex = 1;
    candidate.discoveredAt = now + selected.length;
    engine.state.lastIngredientId = candidate.id;
    selected.push(candidate);
    if (selected.length < target) assert.equal(engine.lockLastIngredient(now + 3_000 + selected.length), true);
  }
  const leftover = engine.state.ingredients.find((ingredient) => ingredient.status === 'available' && ingredient.courseTags.includes('soup'));
  assert.ok(leftover);
  leftover.status = 'discovered';
  leftover.chapterIndex = 1;
  leftover.basketCourseIndex = 1;
  leftover.discoveredAt = now + 9_000;
  engine.state.lastIngredientId = selected.at(-1).id;
  assert.equal(engine.lockLastIngredient(now + 10_000), true);
  assert.equal(engine.unlockedCourseIngredients().length, 0);
  assert.equal(leftover.status, 'available');
  assert.equal(leftover.chapterIndex, null);
  assert.equal(engine.ingredientsLockedForCourse(), true);
});
