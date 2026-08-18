import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { TASK_DECKS } from '../js/data/tasks.js';
import { renderGame } from '../js/ui/game.js';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Ella', 'Finn'];
const cocktailTeams = ['alcoholic', 'alcohol-free', 'alcoholic', 'alcohol-free', 'alcoholic', 'alcohol-free'];
const now = 1_804_000_000_000;

function create(seed = 9_101) {
  return GameEngine.create({ names, cocktailTeams, title: 'Two cocktail crews', defaultLanguage: 'de', seed }, now);
}

function enterCocktailChapter(engine, stage = 'ingredients') {
  engine.state.chapterIndex = 5;
  engine.state.chapter.stage = stage;
  engine.state.turn.phase = 'draw';
  engine.state.turn.tasksAssignedThisTurn = 0;
  engine.state.tasks = [];
  return engine;
}

test('cocktail ingredients are assigned to one recipe basket or shared by both', () => {
  const engine = enterCocktailChapter(create());
  const rum = engine.getIngredient('rum');
  const oranges = engine.getIngredient('oranges');
  const juices = engine.getIngredient('juices');

  [rum, oranges, juices].forEach((ingredient) => {
    ingredient.status = 'discovered';
    ingredient.chapterIndex = 5;
    ingredient.basketCourseIndex = 5;
  });

  assert.equal(engine.lockIngredientFromBasket(rum.id, now + 1, 'alcohol-free'), false, 'spirits can never enter the alcohol-free recipe');
  assert.equal(engine.lockIngredientFromBasket(rum.id, now + 2, 'alcoholic'), true);
  assert.equal(engine.lockIngredientFromBasket(oranges.id, now + 3, 'alcohol-free'), true);
  assert.equal(engine.lockIngredientFromBasket(juices.id, now + 4, 'shared'), true);
  assert.equal(engine.cocktailCompositionReady(), true);

  const alcoholicCard = TASK_DECKS[5].find((card) => card.area === 'alcoholic');
  const alcoholFreeCard = TASK_DECKS[5].find((card) => card.area === 'alcohol-free');
  assert.deepEqual(engine.reserveTaskBasket(alcoholicCard, 'alc').sort(), ['juices', 'rum']);
  assert.deepEqual(engine.reserveTaskBasket(alcoholFreeCard, 'free').sort(), ['juices', 'oranges']);

  engine.state.chapter.stage = 'ingredients';
  const html = renderGame(engine, 'de');
  assert.match(html, /Zwei echte Rezeptkörbe/);
  assert.match(html, /nur alkoholische Mischung/);
  assert.match(html, /nur alkoholfreie Mischung/);
  assert.match(html, /für beide Mischungen/);
});

test('variant-specific mixing jobs can only be created by and assigned to their consumers', () => {
  const engine = enterCocktailChapter(create(9_102), 'tasks');
  const juiceCard = TASK_DECKS[5].find((card) => card.blueprintIndex === 2);
  const alcoholicCard = TASK_DECKS[5].find((card) => card.area === 'alcoholic');
  const alcoholFreeCard = TASK_DECKS[5].find((card) => card.area === 'alcohol-free');
  assert.notEqual(alcoholicCard.questId, alcoholFreeCard.questId, 'both recipe lines must unlock independently');
  engine.state.tasks.push({
    instanceId: 'finished-base', taskId: juiceCard.id, chapterIndex: 5,
    assignedPlayerIds: [], status: 'done', assignedAt: now, completedAt: now
  });
  engine.state.taskQueues[5] = [alcoholicCard.id, alcoholFreeCard.id];

  engine.state.activePlayerIndex = 1;
  assert.equal(engine.activePlayer.cocktailTeam, 'alcohol-free');
  assert.deepEqual(engine.assignableTaskCards().map((card) => card.id), [alcoholFreeCard.id], 'the alcohol-free team sees only its own recipe');

  engine.state.activePlayerIndex = 0;
  assert.equal(engine.activePlayer.cocktailTeam, 'alcoholic');
  assert.deepEqual(engine.assignableTaskCards().map((card) => card.id), [alcoholicCard.id]);
  const task = engine.assignTask({ card: alcoholicCard, now: now + 1_000 });
  assert.ok(task);
  assert.ok(task.assignedPlayerIds.every((playerId) => engine.state.players.find((player) => player.id === playerId).cocktailTeam === 'alcoholic'));

  engine.state.activePlayerIndex = 1;
  engine.state.turn.tasksAssignedThisTurn = 0;
  const secondTask = engine.assignTask({ card: alcoholFreeCard, now: now + 2_000 });
  assert.ok(secondTask, 'the alcohol-free mix can begin while the alcoholic mix is still open');
  assert.ok(secondTask.assignedPlayerIds.every((playerId) => engine.state.players.find((player) => player.id === playerId).cocktailTeam === 'alcohol-free'));
  assert.deepEqual(task.assignedPlayerIds.filter((playerId) => secondTask.assignedPlayerIds.includes(playerId)), []);
});

test('the cocktail screen names both consumer teams while shared work remains crew-wide', () => {
  const engine = enterCocktailChapter(create(9_103), 'tasks');
  const html = renderGame(engine, 'de');
  assert.match(html, /Mit Alkohol/);
  assert.match(html, /Ada, Cleo, Ella/);
  assert.match(html, /Alkoholfrei/);
  assert.match(html, /Ben, Dario, Finn/);
  assert.match(html, /gemeinsame Crew-Aufgaben/);
});
