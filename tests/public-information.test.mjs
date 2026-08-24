import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { INGREDIENTS, SHOPPING_STAPLES } from '../js/data/ingredients.js';
import { renderFaq, renderIngredientGuide, renderRules } from '../js/ui/overlays.js';

test('complete ingredient and rule references render without an active voyage', () => {
  assert.deepEqual(
    SHOPPING_STAPLES.filter((staple) => ['coconut-milk', 'milk', 'cream'].includes(staple.id)).map((staple) => staple.id),
    ['coconut-milk', 'milk', 'cream']
  );
  const questPantryStaples = ['stock', 'cooking-oil', 'butter', 'vinegar', 'yoghurt', 'fresh-herbs', 'ice-cubes'];
  assert.deepEqual(
    SHOPPING_STAPLES.filter((staple) => questPantryStaples.includes(staple.id)).map((staple) => staple.id),
    questPantryStaples
  );
  for (const language of ['de', 'en']) {
    const ingredients = renderIngredientGuide(8, language);
    const rules = renderRules(language);
    const faq = renderFaq(language);
    assert.ok(INGREDIENTS.every((ingredient) => ingredients.includes(ingredient.name[language])));
    assert.ok(SHOPPING_STAPLES.every((staple) => ingredients.includes(staple.name[language])));
    assert.equal((ingredients.match(/class="ingredient-item"/g) ?? []).length, INGREDIENTS.length + SHOPPING_STAPLES.length);
    assert.match(ingredients, language === 'de' ? /Zutaten- & Einkaufsliste/ : /Ingredients & shopping list/);
    assert.match(ingredients, language === 'de' ? /Einkaufsrelevanter Grundvorrat/ : /Shopping staples/);
    assert.match(ingredients, language === 'de' ? /Allgemeiner Küchenvorrat/ : /Shared kitchen pantry/);
    assert.match(rules, language === 'de' ? /So wird gespielt/ : /How to play/);
    assert.match(rules, language === 'de' ? /Das Ziel/ : /The goal/);
    assert.match(rules, language === 'de' ? /Sicher kochen/ : /Cook safely/);
    assert.doesNotMatch(rules, language === 'de' ? /obersten drei Positionen|83 Prozent/ : /top three positions|83 percent/);
    assert.match(faq, language === 'de' ? /Häufige Fragen/ : /Frequently asked questions/);
    assert.match(faq, language === 'de' ? /Kokosmilch gegen Mandelmilch/ : /coconut milk to almond milk/);
    assert.match(faq, language === 'de' ? /Ingwer gegen Chili/ : /ginger to chilli/);
    assert.match(faq, language === 'de' ? /Äpfel gegen Bananen/ : /apples to bananas/);
    assert.match(faq, language === 'de' ? /Fleisch gegen Tofu/ : /meat to tofu/);
    assert.match(faq, language === 'de' ? /Gang-Zuordnung, Kategorie, Pflichtstatus, Karteneffekt/ : /Course assignment, category, essential status, card effect/);
    assert.match(rules, /Copyright/);
  }
});

test('FAQ is available from the sidebar before and during a voyage', async () => {
  const [index, appSource, translations] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../js/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/data/i18n.js', import.meta.url), 'utf8')
  ]);
  assert.match(index, /data-nav="faq"/);
  assert.match(index, /data-i18n="navFaq"/);
  assert.match(appSource, /view === 'faq'.*renderFaq\(currentLanguage\)/);
  assert.match(appSource, /'rules', 'faq'/);
  assert.match(translations, /navFaq: \{ de: 'FAQ', en: 'FAQ' \}/);
});
