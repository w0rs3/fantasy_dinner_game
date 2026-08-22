import test from 'node:test';
import assert from 'node:assert/strict';
import { INGREDIENTS, SHOPPING_STAPLES } from '../js/data/ingredients.js';
import { renderIngredientGuide, renderRules } from '../js/ui/overlays.js';

test('complete ingredient and rule references render without an active voyage', () => {
  for (const language of ['de', 'en']) {
    const ingredients = renderIngredientGuide(8, language);
    const rules = renderRules(language);
    assert.ok(INGREDIENTS.every((ingredient) => ingredients.includes(ingredient.name[language])));
    assert.ok(SHOPPING_STAPLES.every((staple) => ingredients.includes(staple.name[language])));
    assert.equal((ingredients.match(/class="ingredient-item"/g) ?? []).length, INGREDIENTS.length + SHOPPING_STAPLES.length);
    assert.match(ingredients, language === 'de' ? /Zutaten- & Einkaufsliste/ : /Ingredients & shopping list/);
    assert.match(ingredients, language === 'de' ? /Einkaufsrelevanter Grundvorrat/ : /Shopping staples/);
    assert.match(rules, language === 'de' ? /So wird gespielt/ : /How to play/);
    assert.match(rules, /Copyright/);
  }
});
