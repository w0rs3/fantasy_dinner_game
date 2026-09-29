import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { TASK_DECKS } from '../js/data/tasks.js';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Eva', 'Finn'];
const now = 1_800_000_000_000;

function createEngine(seed = 1_301) {
  return GameEngine.create({ names, title: 'Conditional salad jobs', defaultLanguage: 'de', seed }, now);
}

function saladCard(title) {
  return TASK_DECKS[2].find((card) => card.title.de === title);
}

function assignIngredient(engine, ingredientId) {
  const ingredient = engine.getIngredient(ingredientId);
  ingredient.chapterIndex = 2;
  ingredient.status = 'locked';
  ingredient.basketCourseIndex = null;
  return ingredient;
}

test('salad preparation jobs appear only for ingredients actually assigned to the salad', () => {
  const engine = createEngine();
  const leaves = saladCard('Blätter am Wasserfall');
  const fruit = saladCard('Früchte des Tempelgartens');
  const vegetables = saladCard('Gemüse aus dem Ruinenhof');
  const crunch = saladCard('Kerne und Eier am Papageienpfad');
  const meat = saladCard('Salatfleisch mundgerecht schneiden');

  assert.ok([leaves, fruit, vegetables, crunch, meat].every(Boolean));
  assert.equal(engine.taskAppliesToChapter(leaves, 2), false);
  assert.equal(engine.taskAppliesToChapter(fruit, 2), false);
  assert.equal(engine.taskAppliesToChapter(vegetables, 2), false);
  assert.equal(engine.taskAppliesToChapter(crunch, 2), false);
  assert.equal(engine.taskAppliesToChapter(meat, 2), false);

  assignIngredient(engine, 'lettuce');
  assert.equal(engine.taskAppliesToChapter(leaves, 2), true);
  assert.equal(engine.taskAppliesToChapter(vegetables, 2), false, 'leaf lettuce alone does not create a vegetable-cutting job');

  assignIngredient(engine, 'cucumber');
  assignIngredient(engine, 'apples');
  assignIngredient(engine, 'nuts');
  assignIngredient(engine, 'beef');
  assert.equal(engine.taskAppliesToChapter(vegetables, 2), true);
  assert.equal(engine.taskAppliesToChapter(fruit, 2), true);
  assert.equal(engine.taskAppliesToChapter(crunch, 2), true);
  assert.equal(engine.taskAppliesToChapter(meat, 2), true);
});

test('salad meat is cut first and only then unlocked for manual pan frying', () => {
  const engine = createEngine(1_302);
  engine.state.chapterIndex = 2;
  engine.state.chapter.stage = 'tasks';
  assignIngredient(engine, 'beef');
  const cut = saladCard('Salatfleisch mundgerecht schneiden');
  const fry = saladCard('Salatfleisch in der Pfanne braten');
  const assemble = saladCard('Die große Dschungelschale');

  assert.deepEqual(
    engine.nextAvailableQuestCards(2).filter((card) => card.questId === 'protein').map((card) => card.id),
    [cut.id]
  );
  assert.equal(engine.taskPrerequisitesMet(fry), false);
  assert.ok(assemble.prerequisites.some((requirement) => requirement.requiredBlueprintIndex === fry.blueprintIndex));
  assert.deepEqual(engine.reserveTaskBasket(cut, 'cut-meat'), ['beef']);
  assert.deepEqual(engine.reserveTaskBasket(fry, 'fry-meat'), ['beef']);

  engine.state.tasks.push({
    instanceId: 'cut-meat', taskId: cut.id, chapterIndex: 2,
    assignedPlayerIds: ['player-1'], status: 'done', assignedAt: now, startedAt: now, completedAt: now + 1
  });
  assert.equal(engine.taskPrerequisitesMet(fry), true);
  assert.deepEqual(
    engine.nextAvailableQuestCards(2).filter((card) => card.questId === 'protein').map((card) => card.id),
    [fry.id]
  );
  assert.equal(fry.timingMode, 'manual');
  assert.equal(fry.timerMinutes, 0);
  assert.equal(fry.challengeMinutes, 0);
});

test('a meat-free salad never receives either salad-meat job', () => {
  const engine = createEngine(1_303);
  engine.state.chapterIndex = 2;
  engine.state.chapter.stage = 'tasks';
  assignIngredient(engine, 'lettuce');
  assignIngredient(engine, 'cucumber');
  engine.state.taskQueues[2] = [];
  engine.reconcileTaskQueue(2, true, now + 1);

  const proteinIds = new Set(TASK_DECKS[2].filter((card) => card.questId === 'protein').map((card) => card.id));
  assert.ok(engine.state.taskQueues[2].every((taskId) => !proteinIds.has(taskId)));
  engine.state.tasks = TASK_DECKS[2]
    .filter((card) => card.playable && engine.taskAppliesToCourse(card))
    .map((card, index) => ({
      instanceId: `meat-free-${index}`, taskId: card.id, chapterIndex: 2,
      assignedPlayerIds: [], status: 'done', assignedAt: now, startedAt: now, completedAt: now
    }));
  assert.equal(engine.hasUnassignedCourseTasks(), false, 'inapplicable meat jobs do not block a meat-free salad');
});

test('independent salad preparations open as parallel quest lines', () => {
  const engine = createEngine(1_304);
  engine.state.chapterIndex = 2;
  engine.state.chapter.stage = 'tasks';
  ['lettuce', 'cucumber', 'apples', 'nuts', 'beef'].forEach((ingredientId) => assignIngredient(engine, ingredientId));
  engine.state.taskQueues[2] = [];
  engine.reconcileTaskQueue(2, true, now + 1);

  const parallelQuestIds = new Set(engine.taskCardCandidates().map((card) => card.questId));
  assert.ok(['leaves', 'fruit', 'vegetables', 'crunch', 'protein', 'dressing', 'seasoning']
    .every((questId) => parallelQuestIds.has(questId)), `parallel lines: ${[...parallelQuestIds].join(', ')}`);
  assert.equal(parallelQuestIds.has('assemble'), false, 'assembly still waits for every applicable preparation line');
});

test('salad eggs unlock the cooked egg preparation without requiring nuts or seeds', () => {
  const engine = createEngine(1_305);
  engine.state.chapterIndex = 2;
  engine.state.chapter.stage = 'tasks';
  assignIngredient(engine, 'eggs');
  const eggCard = saladCard('Kerne und Eier am Papageienpfad');

  assert.equal(engine.taskAppliesToChapter(eggCard, 2), true);
  assert.deepEqual(engine.reserveTaskBasket(eggCard, 'salad-eggs'), ['eggs']);
  assert.match(eggCard.instruction.de, /kocht sie vollständig hart/);
  assert.match(eggCard.instruction.en, /hard-boil them completely/);
  const assemblyCard = saladCard('Die große Dschungelschale');
  assert.ok(assemblyCard.prerequisites.some((requirement) =>
    requirement.requiredBlueprintIndex === eggCard.blueprintIndex && requirement.state === 'done'
  ), 'salad assembly waits until the eggs have been cooked and cooled');
});
