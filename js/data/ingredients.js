import { shuffle } from '../core/random.js';

const q = (min, max, unitDe, unitEn = unitDe, precision = 0) => ({ min, max, unitDe, unitEn, precision });
const item = (id, category, nameDe, nameEn, quantity, courseTags, options = {}) => ({
  id, category, name: { de: nameDe, en: nameEn }, quantity, essential: options.essential !== false,
  courseTags, effect: options.effect ?? null, note: options.note ?? null
});
const shoppingStaple = (id, nameDe, nameEn, quantity, noteDe, noteEn, courseTags = ['main']) => ({
  id, name: { de: nameDe, en: nameEn }, quantity, note: { de: noteDe, en: noteEn }, courseTags
});

export const COURSE_INGREDIENT_RULES = Object.freeze({
  // The five flexible courses consume exactly all 36 essential, non-Tapas
  // ingredients. Optional cocktail extras do not count towards these targets.
  tapas: { target: 9, optionalLimit: 0, categoryMinimums: {}, categoryLimits: {} },
  soup: { target: 5, optionalLimit: 0, categoryMinimums: { vegetable: 2, pantry: 2 }, categoryLimits: { meat: 1, fruit: 1 } },
  salad: { target: 8, optionalLimit: 0, categoryMinimums: { vegetable: 2, pantry: 1 }, categoryLimits: { fruit: 2, meat: 1 } },
  main: { target: 11, optionalLimit: 0, categoryMinimums: { vegetable: 2, meat: 1 }, categoryLimits: { fruit: 2 } },
  dessert: { target: 6, optionalLimit: 1, categoryMinimums: { fruit: 1, dessert: 2 }, categoryLimits: { vegetable: 1, meat: 0, fruit: 3 } },
  cocktails: { target: 6, optionalLimit: 4, categoryMinimums: { fruit: 1, drinks: 2 }, categoryLimits: { vegetable: 1, meat: 0, alcohol: 3 } }
});

export const INGREDIENT_EFFECT_TEXT = Object.freeze({
  coins3: { de: 'Gewinnt sofort 3 Münzen.', en: 'Immediately gain 3 coins.' },
  coins5: { de: 'Gewinnt sofort 5 Münzen.', en: 'Immediately gain 5 coins.' },
  drawIngredient: { de: 'Zieht sofort die nächste Zutatenkarte.', en: 'Immediately draw the next ingredient card.' },
  doubleDie: { de: 'Der nächste Würfelwurf zählt doppelt.', en: 'The next die roll counts double.' },
  chain: { de: 'Deckt sofort die nächste Ereigniskarte auf.', en: 'Immediately reveal the next event card.' },
  reserveIngredient: { de: 'Sichert sofort eine beliebige Zutatenkarte.', en: 'Immediately secure any ingredient card.' },
  ignoreIngredient: { de: 'Der Effekt der nächsten Zutatenkarte wird ignoriert.', en: 'Ignore the effect of the next ingredient card.' },
  disablePassive: { de: 'Wählt eine Figur. Ihre passive Fähigkeit ist im nächsten Zug deaktiviert.', en: 'Choose a character. Their passive ability is disabled for their next turn.' },
  ignoreEvent: { de: 'Der nächste Ereigniseffekt wird ignoriert.', en: 'Ignore the next event effect.' },
  drawVegetable: { de: 'Zieht sofort eine weitere Gemüsekarte.', en: 'Immediately draw another vegetable card.' },
  replaceEvent: { de: 'Legt die aktuelle Ereigniskarte unter den Stapel und deckt eine neue auf.', en: 'Put the current event card under its deck and reveal a new one.' },
  rerollDie: { de: 'Der nächste Würfelwurf darf wiederholt werden.', en: 'The next die roll may be rerolled.' },
  repeatNextIngredient: { de: 'Der Effekt der nächsten Zutatenkarte wird soweit sinnvoll zweimal ausgeführt. Einmalige Auswahlen, Stapeltausche und Ereignisketten bleiben einmalig.', en: 'The next ingredient card effect is applied twice where it can be counted. One-off choices, deck swaps, and event chains remain single.' },
  shuffleVegetables: { de: 'Mischt die noch verfügbaren Gemüsekarten.', en: 'Shuffle the remaining vegetable cards.' },
  swapTopCards: { de: 'Tauscht die obersten zwei Karten eines Zutatenstapels.', en: 'Swap the top two cards of an ingredient deck.' },
  adjustDie: { de: 'Der nächste Würfelwurf darf einmal um ±1 geändert werden.', en: 'The next die roll may be adjusted once by ±1.' },
  revealEvent: { de: 'Deckt die nächste Ereigniskarte als Vorschau auf.', en: 'Reveal the next event card as a preview.' },
  replaceIngredient: { de: 'Bei der nächsten Zutatenkarte wird eine zusätzliche Alternative angeboten.', en: 'The next ingredient draw offers one extra replacement option.' },
  shuffleEvents: { de: 'Mischt den verbleibenden Ereignisstapel des aktuellen Ortes.', en: 'Shuffle the current location’s remaining event deck.' },
  repeatIngredient: { de: 'Wiederholt den Effekt der zuvor gezogenen Zutatenkarte.', en: 'Repeat the effect of the previously drawn ingredient card.' },
  nextPlayer: { de: 'Die nächste Person sieht ihre Ereigniskarte vor dem Ziehen als Vorschau.', en: 'The next player previews their event card before drawing it.' },
  extraTurn: { de: 'Deckt als Teil desselben Zuges sofort eine weitere Ereigniskarte auf.', en: 'Immediately reveal another event card as part of the same turn.' }
});

export const SHOPPING_STAPLES = Object.freeze([
  shoppingStaple(
    'roasting-bags', 'Bratschläuche', 'Roasting bags', q(2, 2, 'Stück', 'bags'),
    'Für den Hauptgang verbindlich. Verwendet ausreichend große, ofenfeste Bratschläuche samt passenden Verschlüssen und beachtet die Packungsangaben.',
    'Required for the main course. Use sufficiently large oven-safe roasting bags with suitable ties and follow the package instructions.'
  ),
  shoppingStaple(
    'dry-wine', 'Trockener Wein', 'Dry wine', q(250, 400, 'ml'),
    'Grundlage der Sauce, die vor dem Garen in den Bratschlauch gegeben wird.',
    'Base for the sauce added to the roasting bag before cooking.'
  ),
  shoppingStaple(
    'soy-sauce', 'Sojasauce', 'Soy sauce', q(100, 150, 'ml'),
    'Für Würze und Umami in der Backschlauch-Sauce; wegen des Salzgehalts vorsichtig dosieren.',
    'Adds seasoning and umami to the roasting-bag sauce; use carefully because it is salty.'
  ),
  shoppingStaple(
    'main-seasonings', 'Gewürze für den Hauptgang', 'Main-course seasonings', q(1, 1, 'Grundausstattung', 'basic selection'),
    'Mindestens Salz, Pfeffer und Paprika; weitere passende Gewürze können nach Geschmack ergänzt werden.',
    'At minimum salt, pepper, and paprika; add other suitable seasonings to taste.'
  )
]);

export const INGREDIENTS = Object.freeze([
  item('tapas-dates', 'tapas', 'Datteln für Speckmantel', 'Dates for bacon wrapping', q(18, 30, 'Stück', 'pieces'), ['tapas']),
  item('bacon', 'tapas', 'Frühstücksspeck', 'Breakfast bacon', q(250, 400, 'g'), ['tapas']),
  item('aioli', 'tapas', 'Aioli', 'Aioli', q(250, 350, 'g'), ['tapas']),
  item('tomato-pepper-dip', 'tapas', 'Tomaten-Paprika-Dip', 'Tomato and pepper dip', q(250, 350, 'g'), ['tapas']),
  item('olives', 'tapas', 'Oliven', 'Olives', q(300, 500, 'g'), ['tapas']),
  item('cheese', 'tapas', 'Käsewürfel', 'Cheese cubes', q(300, 450, 'g'), ['tapas']),
  item('serrano', 'tapas', 'Serrano-Schinken', 'Serrano ham', q(200, 350, 'g'), ['tapas']),
  item('goat-cheese', 'tapas', 'Schafs- oder Ziegenkäse', 'Sheep or goat cheese', q(250, 400, 'g'), ['tapas']),
  item('baguettes', 'tapas', 'Aufbackbaguettes', 'Part-baked baguettes', q(3, 5, 'Stück', 'loaves'), ['tapas']),

  item('pumpkin', 'vegetable', 'Kürbis', 'Pumpkin', q(1, 1, 'klein', 'small'), ['soup', 'salad', 'main'], { effect: 'rerollDie' }),
  item('asparagus', 'vegetable', 'Spargel', 'Asparagus', q(400, 500, 'g'), ['soup', 'salad', 'main'], { effect: 'shuffleVegetables' }),
  item('potatoes', 'vegetable', 'Kartoffeln', 'Potatoes', q(1, 1.5, 'kg'), ['soup', 'salad', 'main'], { effect: 'ignoreIngredient' }),
  item('carrots', 'vegetable', 'Möhren', 'Carrots', q(.75, 1, 'kg'), ['soup', 'salad', 'main'], { effect: 'repeatNextIngredient' }),
  item('kohlrabi', 'vegetable', 'Kohlrabi', 'Kohlrabi', q(2, 2, 'Stück', 'pieces'), ['soup', 'salad', 'main'], { effect: 'swapTopCards' }),
  item('peppers', 'vegetable', 'Paprika', 'Bell peppers', q(5, 7, 'Stück', 'pieces'), ['soup', 'salad', 'main'], { effect: 'drawVegetable' }),
  item('tomatoes', 'vegetable', 'Tomaten', 'Tomatoes', q(.8, 1.2, 'kg'), ['soup', 'salad', 'main'], { effect: 'replaceEvent' }),
  item('onions', 'vegetable', 'Zwiebeln', 'Onions', q(6, 8, 'Stück', 'pieces'), ['soup', 'salad', 'main'], { effect: 'disablePassive' }),
  item('garlic', 'vegetable', 'Knoblauch', 'Garlic', q(2, 2, 'Knollen', 'bulbs'), ['soup', 'salad', 'main'], { effect: 'ignoreEvent' }),
  item('ginger', 'vegetable', 'Ingwer', 'Ginger', q(100, 100, 'g'), ['soup', 'salad', 'main', 'dessert', 'cocktails'], { effect: 'adjustDie' }),
  item('chestnuts', 'pantry', 'Maronen', 'Chestnuts', q(200, 300, 'g'), ['soup', 'salad', 'main', 'dessert'], { effect: 'drawIngredient' }),
  item('lettuce', 'vegetable', 'Blattsalat', 'Mixed leaves', q(500, 800, 'g'), ['salad'], { effect: 'coins3' }),
  item('cucumber', 'vegetable', 'Gurke', 'Cucumber', q(1, 2, 'Stück', 'pieces'), ['salad', 'main'], { effect: 'shuffleVegetables' }),
  item('chicken', 'meat', 'Hähnchen', 'Chicken', q(450, 600, 'g'), ['soup', 'salad', 'main'], { effect: 'drawIngredient' }),
  item('beef', 'meat', 'Rind', 'Beef', q(400, 500, 'g'), ['soup', 'salad', 'main'], { effect: 'doubleDie' }),
  item('pork', 'meat', 'Schwein', 'Pork', q(400, 500, 'g'), ['soup', 'salad', 'main'], { effect: 'chain' }),
  item('lamb', 'meat', 'Lamm', 'Lamb', q(350, 500, 'g'), ['soup', 'salad', 'main'], { effect: 'reserveIngredient' }),

  item('peppermint', 'pantry', 'Pfefferminze', 'Peppermint', q(2, 3, 'Bund', 'bunches'), ['salad', 'dessert', 'cocktails'], { effect: 'revealEvent' }),
  item('croutons', 'pantry', 'Croûtons', 'Croutons', q(150, 250, 'g'), ['soup', 'salad'], { effect: 'reserveIngredient' }),
  item('nuts', 'pantry', 'Nüsse', 'Nuts', q(150, 200, 'g'), ['soup', 'salad', 'main', 'dessert'], { effect: 'repeatNextIngredient' }),
  item('seeds', 'pantry', 'Kerne', 'Seeds', q(150, 200, 'g'), ['soup', 'salad', 'main', 'dessert'], { effect: 'adjustDie' }),
  item('mustard', 'pantry', 'Senf', 'Mustard', q(1, 1, 'Glas', 'jar'), ['salad', 'main'], { effect: 'rerollDie' }),
  item('honey', 'pantry', 'Honig', 'Honey', q(1, 1, 'Glas', 'jar'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'coins5' }),

  item('apples', 'fruit', 'Äpfel', 'Apples', q(3, 4, 'Stück', 'pieces'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'revealEvent' }),
  item('pears', 'fruit', 'Birnen', 'Pears', q(5, 6, 'Stück', 'pieces'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'replaceIngredient' }),
  item('oranges', 'fruit', 'Orangen', 'Oranges', q(4, 6, 'Stück', 'pieces'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'shuffleEvents' }),
  item('raspberries', 'fruit', 'Himbeeren', 'Raspberries', q(250, 400, 'g'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'repeatIngredient' }),
  item('currants', 'fruit', 'Johannisbeeren', 'Redcurrants', q(200, 300, 'g'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'nextPlayer' }),
  item('cherries', 'fruit', 'Kirschen', 'Cherries', q(300, 500, 'g'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'extraTurn' }),
  item('lemons', 'fruit', 'Zitronen', 'Lemons', q(3, 4, 'Stück', 'pieces'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'ignoreEvent' }),
  item('limes', 'fruit', 'Limetten', 'Limes', q(4, 6, 'Stück', 'pieces'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'replaceEvent' }),

  item('vanilla-ice', 'dessert', 'Vanilleeis', 'Vanilla ice cream', q(750, 1000, 'ml'), ['dessert'], { effect: 'coins5' }),
  item('second-ice', 'dessert', 'Zweite Eissorte', 'Second ice-cream flavour', q(750, 1000, 'ml'), ['dessert', 'cocktails'], { essential: false, effect: 'revealEvent' }),
  item('sprinkles', 'dessert', 'Schokostreusel', 'Chocolate sprinkles', q(1, 1, 'Packung', 'packet'), ['dessert'], { effect: 'repeatIngredient' }),
  item('chocolate', 'dessert', 'Schokolade', 'Chocolate', q(200, 300, 'g'), ['dessert', 'cocktails'], { effect: 'drawIngredient' }),
  item('rum', 'alcohol', 'Rum', 'Rum', q(1, 1, 'Flasche', 'bottle'), ['dessert', 'cocktails'], { essential: false, effect: 'chain' }),
  item('gin', 'alcohol', 'Gin', 'Gin', q(1, 1, 'Flasche', 'bottle'), ['dessert', 'cocktails'], { essential: false, effect: 'shuffleEvents' }),
  item('vodka', 'alcohol', 'Wodka', 'Vodka', q(1, 1, 'Flasche', 'bottle'), ['dessert', 'cocktails'], { essential: false, effect: 'replaceIngredient' }),
  item('mineral-water', 'drinks', 'Mineralwasser', 'Mineral water', q(3, 4, 'l'), ['cocktails'], { effect: 'coins3' }),
  item('juices', 'drinks', 'Säfte', 'Juices', q(2, 4, 'l'), ['cocktails'], { effect: 'nextPlayer' })
]);

const COURSE_INDEX = Object.freeze({ tapas: 0, soup: 1, salad: 2, main: 3, dessert: 4, cocktails: 5 });

export function suggestQuantity(ingredient, playerCount, language = 'de') {
  const count = Math.min(10, Math.max(6, Number(playerCount) || 6));
  const ratio = (count - 6) / 4;
  const value = ingredient.quantity.min + (ingredient.quantity.max - ingredient.quantity.min) * ratio;
  const rounded = ingredient.quantity.precision
    ? value.toFixed(ingredient.quantity.precision)
    : value >= 10 ? Math.round(value / 5) * 5 : Math.round(value * 4) / 4;
  const unit = language === 'de' ? ingredient.quantity.unitDe : ingredient.quantity.unitEn;
  return `${String(rounded).replace('.', language === 'de' ? ',' : '.')} ${unit}`;
}

export function buildIngredientPlan(initialSeed, playerCount) {
  let state = initialSeed;
  const plan = INGREDIENTS.map((ingredient) => ({
    ...ingredient,
    chapterIndex: ingredient.courseTags.includes('tapas') ? COURSE_INDEX.tapas : null,
    status: ingredient.courseTags.includes('tapas') ? 'locked' : 'available',
    basketCourseIndex: null,
    basketTaskId: null,
    suggestedQuantity: {
      de: suggestQuantity(ingredient, playerCount, 'de'),
      en: suggestQuantity(ingredient, playerCount, 'en')
    }
  }));
  // Keep the established RNG cadence after retiring pantry staples so existing seeds do not reshuffle every later deck.
  const shuffled = shuffle([
    ...plan.filter((entry) => entry.chapterIndex == null).map((entry) => entry.id),
    'retired-yoghurt-slot',
    'retired-vinegar-slot',
    'retired-ice-cubes-slot',
    'retired-fruit-dates-slot'
  ], state);
  state = shuffled.state;
  return { state, plan };
}

export function validateIngredientPlan(plan) {
  const essential = plan.filter((entry) => entry.essential);
  return {
    total: plan.length,
    assigned: plan.filter((entry) => Number.isInteger(entry.chapterIndex)).length,
    essential: essential.length,
    essentialAssigned: essential.filter((entry) => Number.isInteger(entry.chapterIndex)).length,
    tagged: plan.filter((entry) => Array.isArray(entry.courseTags) && entry.courseTags.length > 0).length,
    valid: plan.length === INGREDIENTS.length && plan.every((entry) => Array.isArray(entry.courseTags) && entry.courseTags.length > 0)
  };
}
