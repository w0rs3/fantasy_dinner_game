import { shuffle } from '../core/random.js';

const q = (min, max, unitDe, unitEn = unitDe, precision = 0) => ({ min, max, unitDe, unitEn, precision });
const item = (id, category, nameDe, nameEn, quantity, courseTags, options = {}) => ({
  id, category, name: { de: nameDe, en: nameEn }, quantity, essential: options.essential !== false,
  courseTags, effect: options.effect ?? null, note: options.note ?? null
});

export const COURSE_INGREDIENT_RULES = Object.freeze({
  // The five flexible courses consume exactly all 40 essential, non-Tapas
  // ingredients. Optional cocktail extras do not count towards these targets.
  tapas: { target: 9, optionalLimit: 0, categoryMinimums: {}, categoryLimits: {} },
  soup: { target: 6, optionalLimit: 0, categoryMinimums: { vegetable: 2, pantry: 2 }, categoryLimits: { meat: 1, fruit: 1 } },
  salad: { target: 9, optionalLimit: 0, categoryMinimums: { vegetable: 2, pantry: 1 }, categoryLimits: { fruit: 2, meat: 1 } },
  main: { target: 11, optionalLimit: 0, categoryMinimums: { vegetable: 2, meat: 1 }, categoryLimits: { fruit: 2 } },
  dessert: { target: 7, optionalLimit: 1, categoryMinimums: { fruit: 1, dessert: 2 }, categoryLimits: { vegetable: 1, meat: 0, fruit: 3 } },
  cocktails: { target: 7, optionalLimit: 1, categoryMinimums: { fruit: 1, drinks: 3 }, categoryLimits: { vegetable: 1, meat: 0 } }
});

export const INGREDIENT_EFFECT_TEXT = Object.freeze({
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
  repeatNextIngredient: { de: 'Die nächste Zutatenkarte löst ihren Effekt zweimal aus.', en: 'The next ingredient card triggers its effect twice.' },
  shuffleVegetables: { de: 'Mischt die noch verfügbaren Gemüsekarten.', en: 'Shuffle the remaining vegetable cards.' },
  swapTopCards: { de: 'Tauscht die obersten zwei Karten eines Zutatenstapels.', en: 'Swap the top two cards of an ingredient deck.' },
  adjustDie: { de: 'Ändert den nächsten Würfelwurf einmal um ±1.', en: 'Adjust the next die roll once by ±1.' },
  revealEvent: { de: 'Deckt die nächste Ereigniskarte als Vorschau auf.', en: 'Reveal the next event card as a preview.' },
  replaceIngredient: { de: 'Bei der nächsten Zutatenkarte wird eine zusätzliche Alternative angeboten.', en: 'The next ingredient draw offers one extra replacement option.' },
  shuffleEvents: { de: 'Mischt den verbleibenden Ereignisstapel des aktuellen Ortes.', en: 'Shuffle the current location’s remaining event deck.' },
  repeatIngredient: { de: 'Wiederholt den Effekt der zuvor gezogenen Zutatenkarte.', en: 'Repeat the effect of the previously drawn ingredient card.' },
  nextPlayer: { de: 'Die nächste Person sieht ihre Ereigniskarte vor dem Ziehen als Vorschau.', en: 'The next player previews their event card before drawing it.' },
  extraTurn: { de: 'Deckt als Teil desselben Zuges sofort eine weitere Ereigniskarte auf.', en: 'Immediately reveal another event card as part of the same turn.' }
});

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
  item('lettuce', 'vegetable', 'Blattsalat', 'Mixed leaves', q(500, 800, 'g'), ['salad']),
  item('cucumber', 'vegetable', 'Gurke', 'Cucumber', q(1, 2, 'Stück', 'pieces'), ['salad', 'main']),
  item('herbs', 'vegetable', 'Frische Kräuter', 'Fresh herbs', q(3, 4, 'Bund', 'bunches'), ['soup', 'salad', 'main']),

  item('chicken', 'meat', 'Hähnchen', 'Chicken', q(450, 600, 'g'), ['soup', 'salad', 'main'], { effect: 'drawIngredient' }),
  item('beef', 'meat', 'Rind', 'Beef', q(400, 500, 'g'), ['soup', 'salad', 'main'], { effect: 'doubleDie' }),
  item('pork', 'meat', 'Schwein', 'Pork', q(400, 500, 'g'), ['soup', 'salad', 'main'], { effect: 'chain' }),
  item('lamb', 'meat', 'Lamm', 'Lamb', q(350, 500, 'g'), ['soup', 'salad', 'main'], { effect: 'reserveIngredient' }),

  item('peppermint', 'pantry', 'Pfefferminze', 'Peppermint', q(2, 3, 'Bund', 'bunches'), ['salad', 'dessert', 'cocktails'], { effect: 'revealEvent' }),
  item('croutons', 'pantry', 'Croûtons', 'Croutons', q(150, 250, 'g'), ['soup', 'salad']),
  item('nuts', 'pantry', 'Nüsse', 'Nuts', q(150, 200, 'g'), ['soup', 'salad', 'main', 'dessert']),
  item('seeds', 'pantry', 'Kerne', 'Seeds', q(150, 200, 'g'), ['soup', 'salad', 'main', 'dessert']),
  item('vinegar', 'pantry', 'Essig', 'Vinegar', q(180, 250, 'ml'), ['salad', 'main']),
  item('mustard', 'pantry', 'Senf', 'Mustard', q(1, 1, 'Glas', 'jar'), ['salad', 'main']),
  item('honey', 'pantry', 'Honig', 'Honey', q(1, 1, 'Glas', 'jar'), ['salad', 'main', 'dessert', 'cocktails']),

  item('apples', 'fruit', 'Äpfel', 'Apples', q(3, 4, 'Stück', 'pieces'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'revealEvent' }),
  item('pears', 'fruit', 'Birnen', 'Pears', q(5, 6, 'Stück', 'pieces'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'replaceIngredient' }),
  item('oranges', 'fruit', 'Orangen', 'Oranges', q(4, 6, 'Stück', 'pieces'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'shuffleEvents' }),
  item('raspberries', 'fruit', 'Himbeeren', 'Raspberries', q(250, 400, 'g'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'repeatIngredient' }),
  item('currants', 'fruit', 'Johannisbeeren', 'Redcurrants', q(200, 300, 'g'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'nextPlayer' }),
  item('cherries', 'fruit', 'Kirschen', 'Cherries', q(300, 500, 'g'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'extraTurn' }),
  item('fruit-dates', 'fruit', 'Datteln', 'Dates', q(150, 200, 'g'), ['salad', 'main', 'dessert', 'cocktails'], { effect: 'reserveIngredient' }),
  item('lemons', 'fruit', 'Zitronen', 'Lemons', q(3, 4, 'Stück', 'pieces'), ['salad', 'main', 'dessert', 'cocktails']),
  item('limes', 'fruit', 'Limetten', 'Limes', q(4, 6, 'Stück', 'pieces'), ['salad', 'main', 'dessert', 'cocktails']),

  item('vanilla-ice', 'dessert', 'Vanilleeis', 'Vanilla ice cream', q(750, 1000, 'ml'), ['dessert']),
  item('second-ice', 'dessert', 'Zweite Eissorte', 'Second ice-cream flavour', q(750, 1000, 'ml'), ['dessert', 'cocktails'], { essential: false }),
  item('sprinkles', 'dessert', 'Schokostreusel', 'Chocolate sprinkles', q(1, 1, 'Packung', 'packet'), ['dessert']),
  item('chocolate', 'dessert', 'Schokolade', 'Chocolate', q(200, 300, 'g'), ['dessert', 'cocktails']),
  item('rum', 'alcohol', 'Rum', 'Rum', q(1, 1, 'Flasche', 'bottle'), ['dessert', 'cocktails'], { essential: false }),
  item('gin', 'alcohol', 'Gin', 'Gin', q(1, 1, 'Flasche', 'bottle'), ['dessert', 'cocktails'], { essential: false }),
  item('vodka', 'alcohol', 'Wodka', 'Vodka', q(1, 1, 'Flasche', 'bottle'), ['dessert', 'cocktails'], { essential: false }),
  item('mineral-water', 'drinks', 'Mineralwasser', 'Mineral water', q(3, 4, 'l'), ['cocktails']),
  item('juices', 'drinks', 'Säfte', 'Juices', q(2, 4, 'l'), ['cocktails']),
  item('ice-cubes', 'drinks', 'Eiswürfel', 'Ice cubes', q(3, 5, 'kg'), ['cocktails'])
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
  // Keep the established RNG cadence after retiring yoghurt so existing seeds do not reshuffle every later deck.
  const shuffled = shuffle([...plan.filter((entry) => entry.chapterIndex == null).map((entry) => entry.id), 'retired-yoghurt-slot'], state);
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
