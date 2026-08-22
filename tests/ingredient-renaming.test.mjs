import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameEngine } from '../js/core/game-engine.js';
import { INGREDIENTS, SHOPPING_STAPLES } from '../js/data/ingredients.js';
import { TASK_DECKS } from '../js/data/tasks.js';
import { renderCardCatalog } from '../js/ui/card-catalog.js';
import { renderIngredientGuide, renderPantry } from '../js/ui/overlays.js';

const names = ['Ada', 'Ben', 'Cleo', 'Dario', 'Ella', 'Finn', 'Greta', 'Hugo'];
const now = 1_900_000_000_000;

function create(overrides = {}) {
  return GameEngine.create({
    names,
    title: 'Variable Zutaten',
    defaultLanguage: 'de',
    seed: 44_201,
    ...overrides
  }, now);
}

test('ingredient names can change without changing their stable game rules', () => {
  const engine = create();
  const original = structuredClone(engine.getIngredient('potatoes'));

  assert.equal(engine.renameIngredient('potatoes', {
    de: '  Festkochende   Drillinge  ',
    en: ' Waxy baby potatoes '
  }, now + 1), true);
  const renamed = engine.getIngredient('potatoes');
  assert.deepEqual(renamed.name, { de: 'Festkochende Drillinge', en: 'Waxy baby potatoes' });
  assert.deepEqual(renamed.customName, { de: 'Festkochende Drillinge', en: 'Waxy baby potatoes' });
  assert.equal(renamed.id, original.id);
  assert.equal(renamed.category, original.category);
  assert.deepEqual(renamed.courseTags, original.courseTags);
  assert.equal(renamed.effect, original.effect);
  assert.deepEqual(renamed.quantity, original.quantity);

  const potatoTask = TASK_DECKS.flat().find((card) => card.instruction.de.includes('Kartoffeln') && card.instruction.en.includes('Potatoes'));
  assert.ok(potatoTask);
  const contextualizedTask = engine.getTaskCard({ taskId: potatoTask.id, chapterIndex: 3 });
  assert.match(contextualizedTask.instruction.de, /Festkochende Drillinge/);
  assert.match(contextualizedTask.instruction.en, /Waxy baby potatoes/);
  assert.doesNotMatch(contextualizedTask.instruction.de, /Kartoffeln/);
  assert.doesNotMatch(contextualizedTask.instruction.en, /Potatoes/);
  assert.match(renderPantry(engine, 'de'), /<strong>Festkochende Drillinge<\/strong>/);
  assert.doesNotMatch(renderPantry(engine, 'de'), /<strong>Waxy baby potatoes<\/strong>/);
  assert.match(renderPantry(engine, 'en'), /<strong>Waxy baby potatoes<\/strong>/);
  assert.doesNotMatch(renderPantry(engine, 'en'), /<strong>Festkochende Drillinge<\/strong>/);
  const germanCatalog = renderCardCatalog(engine, 'de');
  const englishCatalog = renderCardCatalog(engine, 'en');
  assert.match(germanCatalog, /Festkochende Drillinge und anderes festes Gemüse/);
  assert.match(englishCatalog, /Waxy baby potatoes and other firm vegetables/);

  const restored = new GameEngine(structuredClone(engine.state));
  assert.deepEqual(restored.getIngredient('potatoes').customName, { de: 'Festkochende Drillinge', en: 'Waxy baby potatoes' });
  assert.equal(restored.resetIngredientName('potatoes', now + 2), true);
  assert.equal(restored.getIngredient('potatoes').name.de, INGREDIENTS.find((ingredient) => ingredient.id === 'potatoes').name.de);
  assert.equal('customName' in restored.getIngredient('potatoes'), false);
});

test('new voyages inherit configured ingredient and shopping-staple names', () => {
  const engine = create({
    ingredientNames: { pumpkin: { de: 'Hokkaidokürbis', en: 'Hokkaido squash' }, unknown: { de: 'Nicht erlaubt', en: 'Not allowed' } },
    shoppingStapleNames: { 'soy-sauce': { de: 'Tamari-Sauce', en: 'Tamari sauce' }, unknown: { de: 'Nicht erlaubt', en: 'Not allowed' } }
  });

  assert.equal(engine.getIngredient('pumpkin').name.de, 'Hokkaidokürbis');
  assert.equal(engine.getIngredient('pumpkin').name.en, 'Hokkaido squash');
  assert.equal(engine.shoppingStapleName('soy-sauce', 'de'), 'Tamari-Sauce');
  assert.equal(engine.shoppingStapleName('soy-sauce', 'en'), 'Tamari sauce');
  assert.deepEqual(engine.state.shoppingStapleNames, { 'soy-sauce': { de: 'Tamari-Sauce', en: 'Tamari sauce' } });
  assert.equal(engine.renameShoppingStaple('soy-sauce', { de: 'Dunkle Sojasauce', en: 'Dark soy sauce' }, now + 1), true);
  assert.equal(engine.shoppingStapleName('soy-sauce', 'en'), 'Dark soy sauce');
  assert.match(renderPantry(engine, 'de'), /Dunkle Sojasauce/);
  assert.match(renderPantry(engine, 'en'), /Dark soy sauce/);
  const sauceTask = TASK_DECKS.flat().find((card) => card.instruction.de.includes('Sojasauce') && card.instruction.en.includes('soy sauce'));
  assert.ok(sauceTask);
  const contextualizedTask = engine.getTaskCard({ taskId: sauceTask.id, chapterIndex: 3 });
  assert.match(contextualizedTask.instruction.de, /Dunkle Sojasauce/);
  assert.match(contextualizedTask.instruction.en, /Dark soy sauce/);
  assert.match(renderCardCatalog(engine, 'en'), /Dark soy sauce/);

  const restored = new GameEngine(structuredClone(engine.state));
  assert.equal(restored.shoppingStapleName('soy-sauce', 'de'), 'Dunkle Sojasauce');
  assert.equal(restored.resetShoppingStapleName('soy-sauce', now + 2), true);
  assert.equal(restored.shoppingStapleName('soy-sauce', 'de'), SHOPPING_STAPLES.find((staple) => staple.id === 'soy-sauce').name.de);
});

test('the public shopping list offers one rename control per editable item', () => {
  const ingredientNames = { pumpkin: { de: 'Hokkaido', en: 'Hokkaido squash' } };
  const stapleNames = { 'dry-wine': { de: 'Riesling trocken', en: 'Dry Riesling' } };
  const german = renderIngredientGuide(8, 'de', ingredientNames, stapleNames);
  const english = renderIngredientGuide(8, 'en', ingredientNames, stapleNames);
  assert.match(german, /Hokkaido/);
  assert.match(german, /Riesling trocken/);
  assert.match(english, /Hokkaido squash/);
  assert.match(english, /Dry Riesling/);
  assert.match(german, /data-current-name-de="Hokkaido"/);
  assert.match(german, /data-current-name-en="Hokkaido squash"/);
  assert.equal((german.match(/data-action="edit-ingredient-name"/g) ?? []).length, INGREDIENTS.length + SHOPPING_STAPLES.length);
  assert.equal((german.match(/data-action="reset-ingredient-name"/g) ?? []).length, 0);
});

test('empty, unknown, and excessively long ingredient names are rejected or bounded', () => {
  const engine = create();
  assert.equal(engine.renameIngredient('lettuce', '   '), false);
  assert.equal(engine.renameIngredient('lettuce', { de: '', en: '' }), false);
  assert.equal(engine.renameIngredient('not-an-ingredient', { de: 'Neu', en: 'New' }), false);
  assert.equal(engine.renameShoppingStaple('not-a-staple', { de: 'Neu', en: 'New' }), false);
  assert.equal(engine.renameIngredient('lettuce', { de: 'x'.repeat(120), en: 'y'.repeat(120) }), true);
  assert.equal(engine.getIngredient('lettuce').customName.de.length, 80);
  assert.equal(engine.getIngredient('lettuce').customName.en.length, 80);
});

test('legacy single-language custom names remain readable in both languages', () => {
  const engine = create({ ingredientNames: { lettuce: 'Romanasalat' }, shoppingStapleNames: { 'dry-wine': 'Riesling' } });
  assert.deepEqual(engine.getIngredient('lettuce').customName, { de: 'Romanasalat', en: 'Romanasalat' });
  assert.equal(engine.shoppingStapleName('dry-wine', 'de'), 'Riesling');
  assert.equal(engine.shoppingStapleName('dry-wine', 'en'), 'Riesling');
});

test('the rename dialog collects both language variants before saving', () => {
  const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(source, /id="ingredient-name-de-input"/);
  assert.match(source, /id="ingredient-name-en-input"/);
  assert.match(source, /!customName\.de \|\| !customName\.en/);
});
