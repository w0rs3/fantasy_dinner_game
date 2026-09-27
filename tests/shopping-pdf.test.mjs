import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { INGREDIENTS, SHOPPING_STAPLES } from '../js/data/ingredients.js';
import { renderIngredientGuide } from '../js/ui/overlays.js';
import { buildShoppingListSections, createShoppingListPdf } from '../js/ui/shopping-pdf.js';

test('the pre-game ingredient list offers a shopping PDF download', async () => {
  const html = renderIngredientGuide(8, 'de');
  const [appSource, componentStyles] = await Promise.all([
    readFile(new URL('../js/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../css/components.css', import.meta.url), 'utf8')
  ]);
  assert.match(html, /data-action="download-shopping-pdf"/);
  assert.match(html, /Einkaufsliste als PDF/);
  assert.match(html, /Personen für Liste und PDF/);
  assert.match(html, /data-action="change-shopping-player-count"/);
  assert.equal((html.match(/<option value="(?:6|7|8|9|10)"/g) ?? []).length, 5);
  assert.match(html, /<option value="8" selected>/);
  assert.match(appSource, /case 'download-shopping-pdf'/);
  assert.match(appSource, /change-shopping-player-count/);
  assert.match(appSource, /ingredientNames: preferences\.ingredientNames/);
  assert.match(appSource, /shoppingStapleNames: preferences\.shoppingStapleNames/);
  assert.match(componentStyles, /\.shopping-player-count select \{[\s\S]*appearance: none/);
  assert.match(componentStyles, /calc\(100% - 0\.95rem\)/);
  assert.doesNotMatch(componentStyles, /https?:\/\//i);
  assert.match(componentStyles, /\.shopping-player-count select option \{[\s\S]*color: var\(--parchment-ink\);[\s\S]*background: #fff8e7/);
});

test('the selected crew size changes the shopping quantities used by the PDF', () => {
  const sixPlayers = buildShoppingListSections({ playerCount: 6, language: 'de' }).flatMap((section) => section.items);
  const tenPlayers = buildShoppingListSections({ playerCount: 10, language: 'de' }).flatMap((section) => section.items);
  assert.equal(sixPlayers.find((item) => item.id === 'tapas-dates').quantity, '20 Stück');
  assert.equal(tenPlayers.find((item) => item.id === 'tapas-dates').quantity, '30 Stück');
});

test('the shopping PDF contains every item and identifies renamed originals', () => {
  const sections = buildShoppingListSections({
    playerCount: 8,
    language: 'de',
    ingredientNames: { pumpkin: { de: 'Hokkaido', en: 'Hokkaido squash' } },
    shoppingStapleNames: { 'dry-wine': { de: 'Riesling trocken', en: 'Dry Riesling' } }
  });
  const items = sections.flatMap((section) => section.items);
  assert.equal(items.length, INGREDIENTS.length + SHOPPING_STAPLES.length);
  assert.equal(items.find((item) => item.id === 'pumpkin').name, 'Hokkaido (Original: Kürbis)');
  assert.equal(items.find((item) => item.id === 'dry-wine').name, 'Riesling trocken (Original: Trockener Wein)');
  assert.equal(items.find((item) => item.id === 'pumpkin').quantity, '1 klein');
});

test('the generated shopping document is a complete multi-page A4 PDF', () => {
  const bytes = createShoppingListPdf({ playerCount: 10, language: 'en' });
  const source = new TextDecoder('latin1').decode(bytes);
  assert.ok(bytes.length > 10_000);
  assert.equal(source.slice(0, 8), '%PDF-1.4');
  assert.match(source, /\/Type \/Pages \/Count [2-9]/);
  assert.equal((source.match(/\/Type \/Page \/Parent/g) ?? []).length >= 2, true);
  assert.match(source, /\/MediaBox \[0 0 595\.28 841\.89\]/);
  assert.match(source, /xref\r?\n0 /);
  assert.match(source, /%%EOF\n$/);
});
