import { CHAPTERS } from './chapters.js';

export const EVENT_STAGES = Object.freeze(['ingredients', 'tasks', 'cooking']);

/*
 * Each course has three genuinely separate event decks. The engine only draws
 * from the deck that matches the current real-world state of the course.
 */
const ARCHETYPES = Object.freeze([
  {
    id: 'provision', stage: 'ingredients', type: 'choice',
    title: { de: 'Die Vorratskiste von {location}', en: 'The Provision Crate of {location}' },
    scene: {
      de: 'Eine versiegelte Vorratskiste trägt drei Zeichen. Die Crew darf beraten; die aktive Person kann den Gang erweitern, festlegen oder eine Korbzutat zurücklegen.',
      en: 'A sealed provision crate bears three marks. The crew may discuss them; the active player can expand the course, lock it in, or return a basket ingredient.'
    },
    mechanics: ['discoverIngredient', 'lockIngredient', 'returnIngredient']
  },
  {
    id: 'market', stage: 'ingredients', type: 'dice',
    title: { de: 'Der Markt bei {location}', en: 'The Market near {location}' },
    scene: {
      de: 'Die Händler öffnen ihre besten Körbe. Ein Würfelwurf bestimmt, ob neue Ware, eine feste Zusage oder zusätzliche Beute wartet.',
      en: 'The traders open their best baskets. A die roll decides whether fresh goods, a firm commitment, or extra loot awaits.'
    },
    mechanics: ['discoverIngredient', 'lockIngredient', 'treasureAndIngredient']
  },
  {
    id: 'tasting', stage: 'ingredients', type: 'choice',
    title: { de: 'Die Probe in {location}', en: 'The Tasting at {location}' },
    scene: {
      de: 'Eine bereits entdeckte Zutat wird noch einmal geprüft. Jetzt kann sie ausgetauscht, verbindlich aufgenommen oder in den globalen Vorrat zurückgelegt werden.',
      en: 'A discovered ingredient is examined once more. It can now be exchanged, committed to the course, or returned to the global pantry.'
    },
    mechanics: ['swapIngredient', 'lockIngredient', 'returnIngredient']
  },
  {
    id: 'chart', stage: 'ingredients', type: 'choice',
    title: { de: 'Die Speisekarte aus {location}', en: 'The Menu Chart from {location}' },
    scene: {
      de: 'Auf einer alten Karte sind zwei sinnvolle Wege markiert: den Gang erweitern oder eine noch offene Korbzutat wieder freigeben.',
      en: 'An old chart marks two sensible routes: expand the course or release an unlocked basket ingredient.'
    },
    mechanics: ['discoverIngredient', 'returnIngredient']
  },
  {
    id: 'omen', stage: 'ingredients', type: 'dice',
    title: { de: 'Das Küchenorakel von {location}', en: 'The Galley Oracle of {location}' },
    scene: {
      de: 'Das Orakel kennt den nächsten Geschmack, überlässt die genaue Wendung aber dem Würfel.',
      en: 'The oracle knows the next flavour but leaves the exact turn to the die.'
    },
    mechanics: ['swapIngredient', 'discoverIngredient', 'treasureAndIngredient']
  },
  {
    id: 'orders', stage: 'tasks', type: 'choice',
    title: { de: 'Der Arbeitsauftrag von {location}', en: 'The Work Order from {location}' },
    scene: {
      de: 'Die Zutaten stehen fest. Der nächste fachlich mögliche Arbeitsschritt wird sichtbar; die aktive Person entscheidet über die Besetzung.',
      en: 'The ingredients are fixed. The next feasible kitchen step is revealed; the active player decides how it is staffed.'
    },
    mechanics: ['drawTask', 'teamTask']
  },
  {
    id: 'duty', stage: 'tasks', type: 'dice',
    title: { de: 'Die Kombüsenwache von {location}', en: 'The Galley Watch at {location}' },
    scene: {
      de: 'Die Wache verteilt den nächsten realen Küchenauftrag. Der Würfel bestimmt, wie viel Unterstützung mitgeschickt wird.',
      en: 'The watch assigns the next real kitchen job. The die decides how much support is sent with it.'
    },
    mechanics: ['drawTask', 'teamTask', 'treasureAndTask']
  },
  {
    id: 'guild', stage: 'tasks', type: 'choice',
    title: { de: 'Die Küchenzunft von {location}', en: 'The Kitchen Guild of {location}' },
    scene: {
      de: 'Die Zunft kennt den nächsten sinnvollen Handgriff. Die Crew kann ihn schlank oder mit zusätzlicher Hilfe besetzen.',
      en: 'The guild knows the next sensible step. The crew can staff it leanly or add another pair of hands.'
    },
    mechanics: ['drawTask', 'teamTask']
  },
  {
    id: 'watch', stage: 'cooking', type: 'choice',
    title: { de: 'Die aktive Deckwache von {location}', en: 'The Active Deck Watch at {location}' },
    scene: {
      de: 'Während Küchenarbeit oder Timer laufen, entscheidet die Crew zwischen einer kleinen sicheren Beute und einer sofortigen weiteren Ereigniskarte.',
      en: 'While kitchen work or timers continue, the crew chooses between a small safe reward and immediately drawing another event card.'
    },
    mechanics: ['treasure', 'treasureAndChain']
  },
  {
    id: 'cache', stage: 'cooking', type: 'dice',
    title: { de: 'Das Versteck von {location}', en: 'The Cache of {location}' },
    scene: {
      de: 'Zwischen zwei Arbeitsschritten entdeckt die Crew ein Zeichen. Der Würfel entscheidet über Verlust, Beute oder eine weitere Ereigniskarte.',
      en: 'Between two kitchen steps the crew spots a sign. The die decides between a loss, loot, or another event card.'
    },
    mechanics: ['coinLoss', 'coinLossSmall', 'treasureSmall', 'treasure', 'chain', 'treasureAndChain'],
    orderedCoinRoll: true
  },
  {
    id: 'interlude', stage: 'cooking', type: 'choice',
    title: { de: 'Eine seltsame Begegnung in {location}', en: 'A Strange Encounter at {location}' },
    scene: {
      de: 'Für einen Moment geht es nicht um den nächsten Arbeitsschritt. Die aktive Person nimmt eine kleine Challenge an oder lehnt sie ab und zahlt dafür aus der Bordkasse.',
      en: 'For a moment, the next kitchen step does not matter. The active player accepts a small challenge or declines it and pays from the ship’s purse.'
    },
    mechanics: ['watchChallenge', 'coinLoss']
  },
  {
    id: 'fortune', stage: 'cooking', type: 'dice',
    title: { de: 'Das Münzorakel von {location}', en: 'The Coin Oracle of {location}' },
    scene: {
      de: 'Eine alte Münze springt über den Tisch. Manchmal bringt sie Beute, manchmal fordert die See ihren Anteil – und manchmal nur eine alberne Prüfung.',
      en: 'An old coin skips across the table. Sometimes it brings loot, sometimes the sea takes its share, and sometimes it merely demands a silly test.'
    },
    mechanics: ['coinLoss', 'coinLossSmall', 'treasureSmall', 'treasure', 'chain', 'treasureAndChain'],
    orderedCoinRoll: true
  },
  {
    id: 'mischief', slot: 13, stage: 'cooking', type: 'dice',
    title: { de: 'Schabernack in {location}', en: 'Mischief at {location}' },
    scene: {
      de: 'Irgendjemand an Bord grinst verdächtig. Der Würfel entscheidet, ob daraus eine geheime Rolle, eine schnelle Aktion oder ein kleiner Münzfund wird.',
      en: 'Someone aboard is grinning suspiciously. The die decides whether it becomes a secret role, a quick action, or a small coin find.'
    },
    mechanics: ['watchChallenge', 'watchChallengeAlt', 'treasureAndWatch']
  }
]);

const CARD_DRAW_ARCHETYPES = Object.freeze([
  {
    id: 'card-fate', stage: 'cooking', type: 'dice',
    title: { de: 'Das Kartenschicksal von {location}', en: 'Card Fate at {location}' },
    scene: {
      de: 'Drei unterschiedlich verzierte Kartenstapel liegen bereit. Der Würfel entscheidet, ob die Crew ihr Gedächtnis, eine einzelne Person oder das Team herausfordert.',
      en: 'Three differently decorated card decks are waiting. The die decides whether the crew tests its memory, one person, or the team.'
    },
    mechanics: ['drawAnyQuiz', 'drawSoloFun', 'drawCoopFun']
  },
  {
    id: 'deck-crossroads', stage: 'cooking', type: 'choice',
    title: { de: 'Die Kartenkreuzung von {location}', en: 'The Card Crossroads at {location}' },
    scene: {
      de: 'Drei offene Wege führen zu verschiedenen Kartendecks. Die Crew darf beraten, doch die aktive Person bestimmt, welche Art von Karte als Nächstes gezogen wird.',
      en: 'Three open paths lead to different card decks. The crew may discuss them, but the active player decides which kind of card is drawn next.'
    },
    mechanics: ['drawAnyQuiz', 'drawSoloFun', 'drawCoopFun']
  },
  {
    id: 'quiz-compass', stage: 'cooking', type: 'choice',
    title: { de: 'Der Erinnerungskompass von {location}', en: 'The Memory Compass at {location}' },
    scene: {
      de: 'Die Kompassnadel zeigt gleichzeitig auf Inselchronik, Ortsdetails und Reiseroute. Die aktive Person wählt, aus welchem bekannten Teil der Reise die Frage stammen soll.',
      en: 'The compass needle points toward island lore, location details, and the voyage route at once. The active player chooses which known part of the journey supplies the question.'
    },
    mechanics: ['drawIslandQuiz', 'drawLocationQuiz', 'drawRouteQuiz']
  },
  {
    id: 'named-card-gallery', stage: 'cooking', type: 'choice',
    title: { de: 'Die Kartengalerie von {location}', en: 'The Card Gallery at {location}' },
    scene: {
      de: 'Mehrere Karten hängen mit sichtbaren Titeln an goldenen Klammern. Zuerst wählt die aktive Person zwischen Quiz und Spaß; danach darf sie eine von zwei oder drei konkret angebotenen Karten nehmen.',
      en: 'Several cards hang from golden clips with their titles visible. The active player first chooses quiz or fun, then takes one of two or three specifically offered cards.'
    },
    mechanics: ['chooseNamedQuiz', 'chooseNamedFun']
  }
]);

const INGREDIENT_FUN_ARCHETYPE = Object.freeze({
  id: 'pantry-mischief', stage: 'ingredients', type: 'choice',
  title: { de: 'Schabernack im Vorrat von {location}', en: 'Pantry Mischief at {location}' },
  scene: {
    de: 'Zwischen den Zutaten versteckt sich eine verspielte Botschaft. Die aktive Person nimmt die Challenge an oder lehnt sie ab und zahlt dafür aus der Bordkasse.',
    en: 'A playful message is hidden among the ingredients. The active player accepts the challenge or declines it and pays from the ship’s purse.'
  },
  mechanics: ['watchChallenge', 'coinLoss']
});

const TASK_FUN_VARIANTS = Object.freeze([
  {
    id: 'deck-prank', type: 'dice',
    title: { de: 'Schabernack zwischen den Aufträgen von {location}', en: 'Mischief between Orders at {location}' },
    scene: {
      de: 'Zwischen zwei Questschritten taucht eine versiegelte Spaßkarte auf. Der Würfel bringt eine harmlose Challenge, eine kleine Flaute in der Bordkasse oder einen Münzfund.',
      en: 'Between two quest steps, a sealed fun card appears. The die brings a harmless challenge, a small dip in the ship’s purse, or a coin find.'
    },
    mechanics: ['coinLoss', 'watchChallenge', 'treasure']
  },
  {
    id: 'crew-ritual', type: 'choice',
    title: { de: 'Der seltsame Bordbrauch von {location}', en: 'The Strange Shipboard Custom at {location}' },
    scene: {
      de: 'Noch bevor der nächste Küchenauftrag verteilt wird, verlangt ein alter Bordbrauch eine alberne Prüfung. Die aktive Person nimmt sie an oder zahlt aus der Bordkasse.',
      en: 'Before the next kitchen job is dealt, an old shipboard custom demands a silly trial. The active player accepts it or pays from the ship’s purse.'
    },
    mechanics: ['watchChallenge', 'coinLoss']
  },
  {
    id: 'pirate-mood', type: 'dice',
    title: { de: 'Die Laune der Piraten von {location}', en: 'The Pirates’ Mood at {location}' },
    scene: {
      de: 'Die Mannschaft ist noch nicht vollständig in der Kombüse gebunden. Ein Wurf entscheidet über eine zweite Challenge, eine belohnte Mutprobe oder einen kleinen Münzfund.',
      en: 'The crew is not yet fully occupied in the galley. A roll decides between another challenge, a rewarded dare, or a small coin find.'
    },
    mechanics: ['watchChallengeAlt', 'treasureAndWatch', 'treasure']
  }
]);

function interpolate(value, location) {
  return {
    de: value.de.replace('{location}', location.de),
    en: value.en.replace('{location}', location.en)
  };
}

function eventLocationCopy(event) {
  if (event?.archetype === INGREDIENT_FUN_ARCHETYPE.id) return INGREDIENT_FUN_ARCHETYPE;
  if (event?.archetype === 'work-mischief') {
    return TASK_FUN_VARIANTS.find((variant) => variant.id === event.funVariant) ?? null;
  }
  return [...ARCHETYPES, ...CARD_DRAW_ARCHETYPES].find((archetype) => archetype.id === event?.archetype) ?? null;
}

export function contextualizeEventLocation(event, locationIndex, chapterIndex = null) {
  if (!event || event.storyKind) return event;
  const chapter = Number.isInteger(chapterIndex)
    ? CHAPTERS[chapterIndex]
    : CHAPTERS.find((entry) => entry.id === event.chapterId);
  const location = chapter?.locations?.[locationIndex];
  const copy = eventLocationCopy(event);
  if (!chapter || !location || !copy) return event;
  const title = interpolate(copy.title, location);
  return {
    ...event,
    title: {
      de: `${title.de} · ${chapter.name.de}`,
      en: `${title.en} · ${chapter.name.en}`
    },
    story: {
      de: `In ${location.de} beginnt die Szene: ${copy.scene.de} ${chapter.atmosphere.de}`,
      en: `The scene begins at ${location.en}: ${copy.scene.en} ${chapter.atmosphere.en}`
    }
  };
}

export function buildEventDeck(chapterIndex) {
  const chapter = CHAPTERS[chapterIndex];
  const regularEventSlotCount = 14;
  const regularEvents = chapter.locations.flatMap((location, locationIndex) =>
    ARCHETYPES.map((archetype, archetypeIndex) => {
      // Slot 13 used to contain the removed break card. Keep the original ID
      // spacing so existing saves do not reinterpret later event IDs.
      const number = locationIndex * regularEventSlotCount + (archetype.slot ?? archetypeIndex) + 1;
      const baseTitle = interpolate(archetype.title, location);
      return {
        id: `E${chapterIndex + 1}-${String(number).padStart(2, '0')}`,
        chapterId: chapter.id,
        locationIndex,
        archetype: archetype.id,
        stage: archetype.stage,
        type: archetype.type,
        title: {
          de: `${baseTitle.de} · ${chapter.name.de}`,
          en: `${baseTitle.en} · ${chapter.name.en}`
        },
        story: {
          de: `In ${location.de} beginnt die Szene: ${archetype.scene.de} ${chapter.atmosphere.de}`,
          en: `The scene begins at ${location.en}: ${archetype.scene.en} ${chapter.atmosphere.en}`
        },
        options: archetype.type === 'choice' ? archetype.mechanics : undefined,
        outcomes: archetype.type === 'dice' ? archetype.mechanics : undefined,
        orderedCoinRoll: archetype.orderedCoinRoll ?? false,
        variant: locationIndex
      };
    })
  );
  const ingredientFunEvents = chapter.locations.flatMap((location, locationIndex) => {
    if (locationIndex % 2 !== 0) return [];
    const title = interpolate(INGREDIENT_FUN_ARCHETYPE.title, location);
    return [{
      id: `F${chapterIndex + 1}-${String(locationIndex + 1).padStart(2, '0')}`,
      chapterId: chapter.id,
      locationIndex,
      archetype: INGREDIENT_FUN_ARCHETYPE.id,
      stage: INGREDIENT_FUN_ARCHETYPE.stage,
      type: INGREDIENT_FUN_ARCHETYPE.type,
      title: {
        de: `${title.de} · ${chapter.name.de}`,
        en: `${title.en} · ${chapter.name.en}`
      },
      story: {
        de: `In ${location.de} beginnt die Szene: ${INGREDIENT_FUN_ARCHETYPE.scene.de} ${chapter.atmosphere.de}`,
        en: `The scene begins at ${location.en}: ${INGREDIENT_FUN_ARCHETYPE.scene.en} ${chapter.atmosphere.en}`
      },
      options: [...INGREDIENT_FUN_ARCHETYPE.mechanics],
      variant: locationIndex
    }];
  });
  const cardDrawEvents = chapter.locations.flatMap((location, locationIndex) =>
    CARD_DRAW_ARCHETYPES.map((archetype) => {
      const title = interpolate(archetype.title, location);
      return {
        id: `D${chapterIndex + 1}-${String(locationIndex + 1).padStart(2, '0')}-${archetype.id}`,
        chapterId: chapter.id,
        locationIndex,
        archetype: archetype.id,
        stage: archetype.stage,
        type: archetype.type,
        title: { de: `${title.de} · ${chapter.name.de}`, en: `${title.en} · ${chapter.name.en}` },
        story: {
          de: `In ${location.de} beginnt die Szene: ${archetype.scene.de} ${chapter.atmosphere.de}`,
          en: `The scene begins at ${location.en}: ${archetype.scene.en} ${chapter.atmosphere.en}`
        },
        options: archetype.type === 'choice' ? [...archetype.mechanics] : undefined,
        outcomes: archetype.type === 'dice' ? [...archetype.mechanics] : undefined,
        variant: locationIndex
      };
    })
  );
  const taskFunEvents = chapter.locations.flatMap((location, locationIndex) => {
    const variants = chapter.id === 'main' || locationIndex === 0
      ? TASK_FUN_VARIANTS
      : [TASK_FUN_VARIANTS[(locationIndex - 1) % TASK_FUN_VARIANTS.length]];
    return variants.map((variant, variantIndex) => {
      const title = interpolate(variant.title, location);
      return {
        id: `T${chapterIndex + 1}-${String(locationIndex + 1).padStart(2, '0')}-${variant.id}`,
        chapterId: chapter.id,
        locationIndex,
        archetype: 'work-mischief',
        funVariant: variant.id,
        stage: 'tasks',
        type: variant.type,
        title: { de: `${title.de} · ${chapter.name.de}`, en: `${title.en} · ${chapter.name.en}` },
        story: {
          de: `In ${location.de} beginnt die Szene: ${variant.scene.de} ${chapter.atmosphere.de}`,
          en: `The scene begins at ${location.en}: ${variant.scene.en} ${chapter.atmosphere.en}`
        },
        options: variant.type === 'choice' ? [...variant.mechanics] : undefined,
        outcomes: variant.type === 'dice' ? [...variant.mechanics] : undefined,
        variant: locationIndex * TASK_FUN_VARIANTS.length + variantIndex
      };
    });
  });
  return [...regularEvents, ...cardDrawEvents, ...ingredientFunEvents, ...taskFunEvents];
}

export const EVENT_DECKS = Object.freeze(CHAPTERS.map((_, index) => buildEventDeck(index)));

export function isNonFundamentalEvent(event) {
  return Boolean(event) && (
    event.stage === 'cooking' ||
    event.archetype === 'work-mischief' ||
    event.archetype === 'pantry-mischief'
  );
}

export const EFFECT_TEXT = Object.freeze({
  drawTask: { de: 'Übernehmt den nächsten sinnvollen Küchenauftrag mit der vorgesehenen Mindestbesetzung.', en: 'Take the next feasible kitchen job with its planned minimum crew.' },
  teamTask: { de: 'Übernehmt den nächsten Küchenauftrag mit einer zusätzlichen helfenden Person.', en: 'Take the next kitchen job with one additional helper.' },
  treasureAndTask: { de: 'Gewinnt Münzen und übernehmt anschließend den nächsten Küchenauftrag.', en: 'Gain coins, then take the next kitchen job.' },
  discoverIngredient: { de: 'Öffnet dieses Vorratsereignis und wählt eine der angebotenen Zutaten.', en: 'Open this provision event and choose one of the offered ingredients.' },
  treasureAndIngredient: { de: 'Gewinnt Münzen und wählt danach eine neue Zutat.', en: 'Gain coins, then choose a new ingredient.' },
  lockIngredient: { de: 'Legt die zuletzt entdeckte, noch veränderbare Zutat verbindlich für diesen Gang fest.', en: 'Lock the most recently discovered, still changeable ingredient into this course.' },
  returnIngredient: { de: 'Legt die zuletzt entdeckte, noch veränderbare Zutat aus dem Gangkorb zurück in den globalen Vorrat.', en: 'Return the most recently discovered, still changeable ingredient from the course basket to the global pantry.' },
  swapIngredient: { de: 'Tauscht die zuletzt entdeckte, noch nicht festgelegte Zutat gegen eine passende Alternative.', en: 'Swap the most recently discovered, unlocked ingredient for a suitable alternative.' },
  watchChallenge: { de: 'Wählt die erste kurze Bordaufgabe und führt sie sofort aus.', en: 'Choose the first short deck duty and do it now.' },
  watchChallengeAlt: { de: 'Wählt die zweite kurze Bordaufgabe und führt sie sofort aus.', en: 'Choose the second short deck duty and do it now.' },
  treasureAndWatch: { de: 'Gewinnt Münzen und erledigt danach eine kurze Challenge.', en: 'Gain coins, then complete a short challenge.' },
  drawAnyQuiz: { de: 'Zieht ein beliebiges freigeschaltetes Quiz.', en: 'Draw any unlocked quiz.' },
  drawIslandQuiz: { de: 'Zieht ein Quiz zur Inselchronik.', en: 'Draw an island-lore quiz.' },
  drawLocationQuiz: { de: 'Zieht ein Quiz zu einem bekannten Ort.', en: 'Draw a quiz about a known location.' },
  drawRouteQuiz: { de: 'Zieht ein Quiz zur bisherigen Reiseroute.', en: 'Draw a quiz about the voyage route so far.' },
  drawSoloFun: { de: 'Zieht eine Spaßkarte für eine einzelne Person.', en: 'Draw a fun card for one person.' },
  drawCoopFun: { de: 'Zieht eine gemeinsame Koop-Spaßkarte.', en: 'Draw a cooperative fun card.' },
  chooseNamedQuiz: { de: 'Lasst euch zwei oder drei Quizkarten mit Namen zeigen und wählt eine davon.', en: 'Reveal two or three named quiz cards and choose one.' },
  chooseNamedFun: { de: 'Lasst euch zwei oder drei Spaßkarten mit Namen zeigen und wählt eine davon.', en: 'Reveal two or three named fun cards and choose one.' },
  treasureAndChain: { de: 'Gewinnt 2 Münzen und zieht sofort eine weitere Karte vom globalen Stapel.', en: 'Gain 2 coins and immediately draw another card from the global deck.' },
  chain: { de: 'Zieht sofort eine weitere Karte vom globalen Stapel.', en: 'Immediately draw another card from the global deck.' },
  chainComplete: { de: 'Die Ereigniskette endet, bevor sich eine Karte oder Auswahl wiederholt.', en: 'The event chain ends before a card or choice can repeat.' },
  treasure: { de: 'Gewinnt zwei Münzen.', en: 'Gain two coins.' },
  treasureSmall: { de: 'Gewinnt eine Münze.', en: 'Gain one coin.' },
  coinLoss: { de: 'Die Bordkasse verliert fünf Münzen.', en: 'The ship’s purse loses five coins.' },
  coinLossSmall: { de: 'Die Bordkasse verliert drei Münzen.', en: 'The ship’s purse loses three coins.' },
  singleTask: { de: 'Übernehmt den nächsten geeigneten Auftrag mit möglichst kleiner Besetzung.', en: 'Take the next suitable job with the smallest practical crew.' },
  watchComplete: { de: 'Die Bordaufgabe ist erledigt; die laufende Küchenzeit wurde sinnvoll genutzt.', en: 'The deck duty is complete; the running kitchen time was used productively.' },
  watchSuccess: { de: 'Die Geschicklichkeits-Challenge wurde geschafft.', en: 'The dexterity challenge succeeded.' },
  watchFailure: { de: 'Die Geschicklichkeits-Challenge ist gescheitert.', en: 'The dexterity challenge failed.' },
  watchActive: { de: 'Die Challenge läuft über weitere Züge und blockiert die Übergabe nicht.', en: 'The challenge continues across later turns without blocking handover.' },
  quietHandover: { de: 'Die Wache wechselt, damit der nächste fachlich mögliche Auftrag an eine andere freie Person gehen kann.', en: 'The watch changes so the next feasible job can go to another free player.' }
});

// Privacy is reserved for cards whose linked surprise would stop working if
// the mirrored screen revealed it to the crew. Ordinary timed, physical and
// ongoing challenges stay public.
const SECRET_CHARADE_IDS = new Set([
  'charade-anchor', 'charade-parrot', 'charade-treasure-chest', 'charade-storm-ship',
  'charade-lighthouse', 'charade-cannon', 'charade-seasick-pirate', 'charade-buried-treasure'
]);
const challenge = (id, de, en, options = {}) => {
  const cardKind = options.cardKind ?? (SECRET_CHARADE_IDS.has(id)
    ? 'charade'
    : options.followUpOnly ? 'blessing' : options.flow === 'ongoing' ? 'curse' : 'fun');
  return ({
  id, de, en, title: options.title ?? { de: 'Kurze Challenge', en: 'Quick challenge' },
  minutes: options.minutes ?? 1,
  coins: options.skillCheck
    ? Math.max(1, Number(options.successCoins) || 3)
    : options.coins === 0 ? 0 : Math.max(1, Math.ceil((options.coins ?? 2) / 3)),
  skillCheck: options.skillCheck ?? false,
  dexterity: options.dexterity ?? false,
  charade: SECRET_CHARADE_IDS.has(id),
  successCoins: options.skillCheck ? Math.max(1, Number(options.successCoins) || 3) : null,
  failureCoins: options.skillCheck ? -Math.max(1, Math.abs(Number(options.failureCoins) || 2)) : null,
  durationSeconds: Math.max(1, Number(options.durationSeconds) || (options.minutes ?? 1) * 60),
  cardKind,
  secret: cardKind === 'charade' || (cardKind === 'curse' && options.endTrigger === 'secretTrigger'),
  followUpId: options.followUpId ?? null, flow: options.flow ?? 'immediate',
  endTrigger: options.endTrigger ?? null, mandatory: options.mandatory ?? false,
  triggerKind: options.triggerKind ?? null,
  standing: options.standing ?? false,
  playerSelection: options.playerSelection ?? false,
  cooperative: options.cooperative ?? false,
  partnerCount: options.partnerCount ?? 0,
  followUpOnly: options.followUpOnly ?? false,
  requirements: options.requirements ?? (SECRET_CHARADE_IDS.has(id) ? ['twoFreeGuessers'] : [])
  });
};

const LONG_COURSE_SOLO_THEMES = Object.freeze([
  ['captains-shadow', 'Der Schatten des Kapitäns', 'The Captain’s Shadow'],
  ['ghost-telescope', 'Das Geisterfernrohr', 'The Ghost Telescope'],
  ['talking-compass', 'Der sprechende Kompass', 'The Talking Compass'],
  ['moonlit-map', 'Die Seekarte im Mondlicht', 'The Moonlit Sea Chart'],
  ['polite-kraken', 'Der höfliche Kraken', 'The Polite Kraken'],
  ['singing-anchor', 'Der singende Anker', 'The Singing Anchor'],
  ['backwards-harbour', 'Der rückwärts gebaute Hafen', 'The Backwards Harbour'],
  ['cloud-pirates', 'Die Piraten über den Wolken', 'The Pirates above the Clouds'],
  ['tiny-lighthouse', 'Der winzige Leuchtturm', 'The Tiny Lighthouse'],
  ['golden-parrot', 'Der goldene Papagei', 'The Golden Parrot'],
  ['sleepy-storm', 'Der schläfrige Sturm', 'The Sleepy Storm'],
  ['invisible-island', 'Die unsichtbare Insel', 'The Invisible Island'],
  ['captains-breakfast', 'Das Frühstück des Kapitäns', 'The Captain’s Breakfast'],
  ['dancing-sails', 'Die tanzenden Segel', 'The Dancing Sails'],
  ['whispering-waves', 'Die flüsternden Wellen', 'The Whispering Waves'],
  ['lost-ship-bell', 'Die verlorene Schiffsglocke', 'The Lost Ship’s Bell'],
  ['friendly-cannon', 'Die freundliche Kanone', 'The Friendly Cannon'],
  ['treasure-with-legs', 'Der Schatz auf Beinen', 'The Treasure with Legs'],
  ['seagull-captain', 'Die Möwe als Kapitän', 'The Seagull Captain'],
  ['harbour-in-a-bottle', 'Der Hafen in der Flasche', 'The Harbour in a Bottle'],
  ['storm-in-a-cup', 'Der Sturm in der Teetasse', 'The Storm in a Teacup'],
  ['wooden-whale', 'Der Wal aus Holz', 'The Wooden Whale'],
  ['upside-down-flag', 'Die kopfstehende Flagge', 'The Upside-Down Flag'],
  ['midnight-market', 'Der Mitternachtsmarkt', 'The Midnight Market'],
  ['seashell-crown', 'Die Krone aus Muscheln', 'The Seashell Crown'],
  ['hiccup-compass', 'Der Kompass mit Schluckauf', 'The Compass with Hiccups'],
  ['cloud-anchor', 'Der Anker in den Wolken', 'The Anchor in the Clouds'],
  ['laughing-map', 'Die lachende Schatzkarte', 'The Laughing Treasure Map'],
  ['pirate-librarian', 'Der Pirat als Bibliothekar', 'The Pirate Librarian'],
  ['floating-galley', 'Die schwebende Kombüse', 'The Floating Galley'],
  ['sleepwalking-parrot', 'Der schlafwandelnde Papagei', 'The Sleepwalking Parrot'],
  ['captains-missing-hat', 'Der verschwundene Kapitänshut', 'The Captain’s Missing Hat'],
  ['island-on-wheels', 'Die Insel auf Rädern', 'The Island on Wheels'],
  ['whistling-treasure', 'Der pfeifende Schatz', 'The Whistling Treasure'],
  ['backwards-clock', 'Die rückwärts laufende Borduhr', 'The Backwards Ship’s Clock'],
  ['rainbow-sails', 'Die Regenbogensegel', 'The Rainbow Sails'],
  ['crab-navigator', 'Die Krabbe als Navigator', 'The Crab Navigator'],
  ['bottle-lighthouse', 'Der Leuchtturm in der Flasche', 'The Lighthouse in a Bottle'],
  ['captains-cloud-chair', 'Der Wolkenstuhl des Kapitäns', 'The Captain’s Cloud Chair'],
  ['treasure-sneezes', 'Der Schatz, der niesen muss', 'The Treasure That Sneezes']
]);

const LONG_COURSE_PAIR_THEMES = Object.freeze([
  ['double-lookout', 'Die doppelte Ausguckwache', 'The Double Lookout'],
  ['map-and-wind', 'Seekarte und Wind', 'Sea Chart and Wind'],
  ['two-captains', 'Zwei Kapitäne, ein Schiff', 'Two Captains, One Ship'],
  ['lighthouse-dialogue', 'Gespräch der Leuchttürme', 'Dialogue of the Lighthouses'],
  ['shared-telescope', 'Das geteilte Fernrohr', 'The Shared Telescope'],
  ['anchor-debate', 'Der große Ankerstreit', 'The Great Anchor Debate'],
  ['storm-reporters', 'Reporter im Sturm', 'Reporters in the Storm'],
  ['pirate-translators', 'Die Piratendolmetscher', 'The Pirate Interpreters'],
  ['two-part-shanty', 'Das zweiteilige Seemannslied', 'The Two-Part Shanty'],
  ['mirror-helms', 'Die gespiegelten Steuerräder', 'The Mirrored Helms'],
  ['coin-with-two-sides', 'Die Münze mit zwei Geschichten', 'The Coin with Two Stories'],
  ['rope-of-riddles', 'Das Tau der Rätsel', 'The Rope of Riddles'],
  ['moon-and-tide', 'Mond und Gezeiten', 'Moon and Tide'],
  ['parrot-detectives', 'Die Papageien-Detektive', 'The Parrot Detectives'],
  ['two-weather-oracles', 'Die zwei Wetterorakel', 'The Two Weather Oracles'],
  ['captain-and-ghost', 'Kapitän und Schiffsgeist', 'Captain and Ship’s Ghost'],
  ['shared-crown', 'Die geteilte Piratenkrone', 'The Shared Pirate Crown'],
  ['harbour-architects', 'Die Hafenbaumeister', 'The Harbour Architects'],
  ['wave-conductors', 'Die Dirigenten der Wellen', 'The Wave Conductors'],
  ['treasure-witnesses', 'Die Zeugen des Schatzes', 'The Treasure Witnesses'],
  ['sail-tailors', 'Die Schneider der Segel', 'The Sail Tailors'],
  ['deck-photographers', 'Die Fotografen an Deck', 'The Deck Photographers'],
  ['island-guides', 'Die Reiseführer der Insel', 'The Island Guides'],
  ['cannon-poets', 'Die Dichter der Kanone', 'The Cannon Poets']
]);

const LONG_COURSE_TRIO_THEMES = Object.freeze([
  ['three-part-storm', 'Der Sturm in drei Teilen', 'The Three-Part Storm'],
  ['harbour-council', 'Der Rat des Hafens', 'The Harbour Council'],
  ['lighthouse-crew', 'Die Leuchtturmcrew', 'The Lighthouse Crew'],
  ['three-clue-island', 'Die Insel mit drei Hinweisen', 'The Island of Three Clues'],
  ['pirate-news-team', 'Das Piraten-Nachrichtenteam', 'The Pirate News Team'],
  ['treasure-auction', 'Die Versteigerung der Beute', 'The Treasure Auction'],
  ['wind-wave-ship', 'Wind, Welle und Schiff', 'Wind, Wave, and Ship'],
  ['three-voice-voyage', 'Die Reise mit drei Stimmen', 'The Three-Voice Voyage'],
  ['three-captain-portrait', 'Das Bild der drei Kapitäne', 'Portrait of the Three Captains'],
  ['storm-jury', 'Das Gericht über den Sturm', 'The Storm Jury'],
  ['island-radio', 'Das Inselradio', 'Island Radio'],
  ['three-part-map', 'Die Karte aus drei Teilen', 'The Three-Part Map'],
  ['parrot-orchestra', 'Das Papageienorchester', 'The Parrot Orchestra'],
  ['harbour-theatre', 'Das Hafentheater', 'The Harbour Theatre'],
  ['treasure-committee', 'Das Schatzkomitee', 'The Treasure Committee'],
  ['three-lighthouse-keepers', 'Die drei Leuchtturmwärter', 'The Three Lighthouse Keepers']
]);

const LONG_COURSE_CHALLENGES = Object.freeze([
  ...LONG_COURSE_SOLO_THEMES.map(([id, deTitle, enTitle], index) => {
    const prompts = [
      [`Erfinde eine kurze Borddurchsage über „${deTitle}“ und trage sie in höchstens dreißig Sekunden vor.`, `Invent a short shipboard announcement about “${enTitle}” and perform it in no more than thirty seconds.`],
      [`Stelle „${deTitle}“ zehn Sekunden pantomimisch dar. Bleib sicher am eigenen Platz.`, `Mime “${enTitle}” for ten seconds. Stay safely in your own place.`],
      [`Beschreibe „${deTitle}“ in genau zwei Sätzen, als stünde es heute im Logbuch.`, `Describe “${enTitle}” in exactly two sentences as if it appeared in today’s logbook.`],
      [`Gib „${deTitle}“ eine unverwechselbare Stimme und sage damit einen kurzen, freundlichen Satz zur Crew.`, `Give “${enTitle}” a distinctive voice and use it to say one short, friendly sentence to the crew.`]
    ];
    const [de, en] = prompts[index % prompts.length];
    const durationSeconds = [30, 10, 30, 30][index % prompts.length];
    return challenge(`long-solo-${id}`, de, en, { durationSeconds, title: { de: deTitle, en: enTitle } });
  }),
  ...LONG_COURSE_PAIR_THEMES.map(([id, deTitle, enTitle], index) => {
    const prompts = [
      [`{activePlayer} und {partner}: Erzählt abwechselnd eine vier Sätze lange Geschichte über „${deTitle}“. Jede Person sagt zwei Sätze.`, `{activePlayer} and {partner}: Alternate telling a four-sentence story about “${enTitle}.” Each person says two sentences.`],
      [`{activePlayer} und {partner}: Stellt „${deTitle}“ gemeinsam zehn Sekunden als sicheres Standbild am Platz dar.`, `{activePlayer} and {partner}: Together, hold a safe ten-second tableau of “${enTitle}” in your own places.`],
      [`{activePlayer} und {partner}: Diskutiert dreißig Sekunden, warum „${deTitle}“ auf einer Piratenreise nützlich oder völlig nutzlos wäre.`, `{activePlayer} and {partner}: Debate for thirty seconds why “${enTitle}” would be useful or completely useless on a pirate voyage.`],
      [`{activePlayer} und {partner}: Führt einen kurzen Dialog zwischen zwei Figuren aus „${deTitle}“. Jede Person spricht genau zweimal.`, `{activePlayer} and {partner}: Perform a short dialogue between two characters from “${enTitle}.” Each person speaks exactly twice.`]
    ];
    const [de, en] = prompts[index % prompts.length];
    const durationSeconds = [45, 10, 30, 45][index % prompts.length];
    return challenge(`long-pair-${id}`, de, en, { cooperative: true, partnerCount: 1, durationSeconds, title: { de: deTitle, en: enTitle } });
  }),
  ...LONG_COURSE_TRIO_THEMES.map(([id, deTitle, enTitle], index) => {
    const prompts = [
      [`{activePlayer}, {partner} und {partner2}: Erzählt „${deTitle}“ in genau drei Sätzen. Jede Person übernimmt einen Satz.`, `{activePlayer}, {partner}, and {partner2}: Tell “${enTitle}” in exactly three sentences. Each person contributes one sentence.`],
      [`{activePlayer}, {partner} und {partner2}: Bildet am Platz ein sicheres Standbild zu „${deTitle}“. Jede Person stellt einen anderen Teil der Szene dar.`, `{activePlayer}, {partner}, and {partner2}: Make a safe tableau of “${enTitle}” in place. Each person represents a different part of the scene.`],
      [`{activePlayer}, {partner} und {partner2}: Beratet dreißig Sekunden, welche wichtigste Regel zu „${deTitle}“ ins Logbuch gehört, und einigt euch auf eine.`, `{activePlayer}, {partner}, and {partner2}: Deliberate for thirty seconds on the most important rule for “${enTitle}” and agree on one.`],
      [`{activePlayer}, {partner} und {partner2}: Erzeugt gemeinsam zehn Sekunden die Geräuschkulisse von „${deTitle}“. Jede Person verwendet ein anderes leises Geräusch.`, `{activePlayer}, {partner}, and {partner2}: Create a ten-second soundscape for “${enTitle}.” Each person uses a different quiet sound.`]
    ];
    const [de, en] = prompts[index % prompts.length];
    const durationSeconds = [45, 45, 30, 10][index % prompts.length];
    return challenge(`long-trio-${id}`, de, en, { cooperative: true, partnerCount: 2, durationSeconds, title: { de: deTitle, en: enTitle } });
  })
]);

export const WATCH_CHALLENGES = Object.freeze([
  challenge('clear-surface', 'Die aktive Person erfindet in 60 Sekunden einen Piratennamen für eine sichtbare, gerade freie Ablagefläche. Niemand unterbricht dafür die Küchenarbeit oder räumt etwas um.', 'The active player has 60 seconds to invent a pirate name for a visible, currently unused surface. Nobody interrupts kitchen work or moves anything for it.', { title: { de: 'Die geheime Schatzablage', en: 'The Secret Treasure Shelf' } }),
  challenge('next-steps', 'Prüft alle laufenden Aufgaben und nennt laut, was als Nächstes gebraucht wird.', 'Review every active task and say aloud what will be needed next.', { requirements: ['openTask'], title: { de: 'Der Blick voraus', en: 'A Look Ahead' } }),
  challenge('drink-refill-round', 'Prüft kurz, welche tatsächlich zu Tisch gereichten Getränke nachgefüllt werden sollen. Fragt jede Person und füllt nur auf Wunsch nach; das Spiel gibt keine Getränkesorte vor.', 'Briefly check which drinks actually served at the table need refilling. Ask each person and refill only when wanted; the game does not prescribe any type of drink.', { title: { de: 'Getränkerunde an Deck', en: 'Drinks Round on Deck' } }),
  challenge('empty-glass-lookout', 'Haltet am Tisch nach leeren oder fast leeren Gläsern Ausschau. Fragt die betreffenden Personen, ob und womit aus den vorhandenen Tischgetränken nachgefüllt werden soll.', 'Look around the table for empty or nearly empty glasses. Ask those players whether they want a refill and which of the available table drinks they prefer.', { title: { de: 'Die Wache der leeren Gläser', en: 'The Empty-Glass Lookout' } }),
  challenge('drink-supplies-check', 'Prüft, ob von den selbst gewählten Tischgetränken noch genug griffbereit ist. Holt bei Bedarf gemeinsam passenden Nachschub, ohne laufende Küchenwege zu blockieren.', 'Check whether enough of the table drinks chosen by the group remain within reach. If needed, fetch suitable refills together without blocking active kitchen routes.', { title: { de: 'Proviant für die Becher', en: 'Supplies for the Cups' } }),
  challenge('drink-wishes', 'Macht eine kurze Getränkewunsch-Runde: Jede Person sagt nur „gleiches Getränk“, „anderes vorhandenes Getränk“ oder „gerade nichts“. Füllt anschließend entsprechend nach.', 'Make a quick drinks-request round: each person says only “same drink,” “another available drink,” or “nothing right now.” Refill accordingly.', { title: { de: 'Wünsche aus der Mannschaft', en: 'The Crew’s Drink Requests' } }),
  challenge('sort-tools', 'Die aktive Person erfindet in 60 Sekunden für drei sichtbare Küchenwerkzeuge je einen Piratennamen. Fasst nichts an, was gerade benutzt wird, und unterbrecht keine Küchenarbeit.', 'The active player has 60 seconds to invent a pirate name for each of three visible kitchen tools. Do not touch anything currently in use or interrupt kitchen work.', { title: { de: 'Die Taufe der Kombüsenwerkzeuge', en: 'Naming the Galley Tools' } }),
  challenge('name-course', 'Erfindet in höchstens 60 Sekunden einen Namen für den entstehenden Gang.', 'Invent a name for the emerging course in no more than 60 seconds.', { title: { de: 'Die Taufe des Gangs', en: 'Naming the Course' } }),
  challenge('ingredient-round', 'Nennt reihum jeweils eine andere Zutat, die heute bereits sinnvoll verwendet wurde. Jede Person nennt genau eine.', 'Go around once and have each player name a different ingredient already used well tonight. Every player names exactly one.', { requirements: ['usedIngredientPerPlayer'], title: { de: 'Die Erinnerungskette', en: 'The Ingredient Chain' } }),
  challenge('table-check', 'Prüft den Tisch: Fehlen Besteck, gewünschte Tischgetränke, ein Untersetzer oder Platz zum Servieren?', 'Check the table: is cutlery, a requested table drink, a trivet, or serving space missing?', { title: { de: 'Klar Schiff am Tisch', en: 'Clear the Table Deck' } }),
  challenge('collect-waste', 'Sammelt Verpackungen und Abfälle ein, ohne laufende Arbeitswege zu blockieren.', 'Collect packaging and waste without blocking active work routes.', { title: { de: 'Die Bilge wird leer', en: 'Emptying the Bilge' } }),
  challenge('portion-captain', 'Bestimmt eine Person, die beim nächsten Servieren Portionsgrößen kontrolliert.', 'Choose one person to check portion sizes at the next serving.', { requirements: ['courseWorkStarted'], playerSelection: true, title: { de: 'Die Portionswache', en: 'The Portion Lookout' } }),
  challenge('timer-check', 'Schaut auf alle laufenden Aufgaben-Timer. Nennt gemeinsam, welche Aufgabe als Nächstes endet oder bereits in der Überlänge ist.', 'Check every running task timer. Together, identify which task finishes next or is already in overtime.', { requirements: ['taskTimerRunning'], title: { de: 'Sanduhren im Blick', en: 'Eyes on the Hourglasses' } }),
  challenge('sea-story', 'Gebt {activePlayer} 60 Sekunden für eine kurze Seefahrergeschichte.', 'Give {activePlayer} 60 seconds for a short seafaring story.', { title: { de: 'Eine Runde Seemannsgarn', en: 'A Tale from the Sea' } }),
  challenge('pirate-verse', 'Erfindet in höchstens 90 Sekunden ein kurzes Piratenlied oder Piratengedicht mit mindestens zwei Zeilen. Singt es gemeinsam oder tragt es dramatisch vor – beides zählt vollständig.', 'In no more than 90 seconds, invent a short pirate song or pirate poem of at least two lines. Sing it together or perform it dramatically — either counts in full.', { minutes: 2, durationSeconds: 90, coins: 3, title: { de: 'Die Ballade der wilden Kombüse', en: 'Ballad of the Wild Galley' } }),
  challenge('safety-check', 'Kontrolliert, dass heiße, scharfe und rohe Arbeitsbereiche klar getrennt sind.', 'Confirm that hot, sharp, and raw-food work areas are clearly separated.', { requirements: ['hazardousTaskOpen'], title: { de: 'Die sichere Kombüse', en: 'The Safe Galley' } }),
  challenge('odd-dance', 'Steh auf und tanze 20 Sekunden so merkwürdig wie möglich. Danach geht das Spiel normal weiter.', 'Stand up and dance as strangely as possible for 20 seconds. Then continue normally.', { durationSeconds: 20, coins: 3, standing: true, title: { de: 'Tanz auf Deck', en: 'Deck Dance' } }),
  challenge('table-lap', 'Steh auf, geh einmal um den Tisch und setz dich wieder hin.', 'Stand up, walk once around the table, and sit down again.', { standing: true, title: { de: 'Rundgang an Deck', en: 'Circuit around the Deck' } }),
  challenge('compliments', 'Bis zu deinem nächsten Zug machst du der jeweils aktiven Person ein ehrliches, kurzes Kompliment.', 'Until your next turn, give the active player one brief, genuine compliment.', { coins: 3, title: { de: 'Rückenwind für die Crew', en: 'A Tailwind for the Crew' }, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('love-decisions', 'Bis zu deinem nächsten Zug findest du jede Entscheidung deiner Crew großartig. Übertreib dabei freundlich.', 'Until your next turn, you think every crew decision is wonderful. Exaggerate kindly.', { coins: 3, title: { de: 'Begeisterung an Bord', en: 'Delight Aboard' }, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('laugh-turn', 'In {targetPlayer}s nächstem Zug findest du alles erstaunlich lustig. Bleib freundlich und löse die Karte danach auf.', 'During {targetPlayer}’s next turn, find everything remarkably funny. Stay kind and end the bit afterwards.', { coins: 3, title: { de: 'Lachen an Deck', en: 'Laughter Aboard' }, flow: 'ongoing', endTrigger: 'targetTurnEnd' }),
  challenge('chicken', 'Gackere einmal pro Minute leise wie ein Huhn. Verrate nicht warum und mache weiter, bis eine andere Person dich ausdrücklich erlöst.', 'Cluck quietly like a chicken once per minute. Do not say why and continue until another person explicitly releases you.', { coins: 3, title: { de: 'Der Hühnerfluch', en: 'The Chicken Curse' }, followUpId: 'stop-chicken', flow: 'ongoing', endTrigger: 'followUp' }),
  challenge('stop-chicken', 'Segen: Sage jetzt zu {targetPlayer}: „Der Hühnerfluch ist gebrochen.“ Danach endet der Fluch sofort.', 'Blessing: Tell {targetPlayer} now: “The chicken curse is broken.” The curse ends immediately afterwards.', { coins: 2, title: { de: 'Segen: Ruhe im Hühnerstall', en: 'Blessing: Peace in the Henhouse' }, mandatory: true, followUpOnly: true }),
  challenge('nose-voice', 'Halte dir beim Reden sanft die Nase zu. Verrate nicht warum und mache weiter, bis eine andere Person dich ausdrücklich erlöst.', 'Gently hold your nose while speaking. Do not say why and continue until another person explicitly releases you.', { coins: 3, title: { de: 'Die verschnupfte Freibeuterin', en: 'The Snuffly Buccaneer' }, followUpId: 'stop-nose', flow: 'ongoing', endTrigger: 'followUp' }),
  challenge('stop-nose', 'Segen: Sage jetzt zu {targetPlayer}: „Du kannst wieder frei sprechen.“ Danach endet der Fluch sofort.', 'Blessing: Tell {targetPlayer} now: “You may speak freely again.” The curse ends immediately afterwards.', { coins: 2, title: { de: 'Segen: Freie Nase voraus', en: 'Blessing: Clear Air Ahead' }, mandatory: true, followUpOnly: true }),
  challenge('echo-curse', 'Fluch: Wiederhole nach jedem eigenen Satz leise dein letztes Wort, bis der passende Segen gezogen wird.', 'Curse: Quietly repeat the final word of each sentence you speak until the matching blessing is drawn.', { coins: 3, title: { de: 'Fluch des letzten Wortes', en: 'Curse of the Last Word' }, followUpId: 'echo-blessing', flow: 'ongoing', endTrigger: 'followUp' }),
  challenge('echo-blessing', 'Segen: Sage zu {targetPlayer}: „Dein Echo darf verstummen.“ Danach endet der Fluch des letzten Wortes.', 'Blessing: Tell {targetPlayer}: “Your echo may fall silent.” The Curse of the Last Word then ends.', { coins: 2, title: { de: 'Segen der stillen Bucht', en: 'Blessing of the Quiet Bay' }, mandatory: true, followUpOnly: true }),
  challenge('salute-curse', 'Fluch: Grüße bei jeder neu aufgedeckten Karte einmal feierlich, bis der passende Segen gezogen wird.', 'Curse: Give one ceremonial salute whenever a new card is revealed until the matching blessing is drawn.', { coins: 3, title: { de: 'Fluch des ewigen Grußes', en: 'Curse of the Endless Salute' }, followUpId: 'salute-blessing', flow: 'ongoing', endTrigger: 'followUp' }),
  challenge('salute-blessing', 'Segen: Verbeuge dich kurz vor {targetPlayer} und erkläre die endlose Grußpflicht für beendet.', 'Blessing: Give {targetPlayer} a short bow and declare the endless saluting duty over.', { coins: 2, title: { de: 'Segen der entspannten Wache', en: 'Blessing of the Relaxed Watch' }, mandatory: true, followUpOnly: true }),
  challenge('whisper-curse', 'Fluch: Sprich nur noch mit leiser Stimme, bis der passende Segen gezogen wird. Küchenwarnungen und Sicherheitshinweise sagst du weiterhin klar und laut.', 'Curse: Speak only softly until the matching blessing is drawn. Continue to give kitchen warnings and safety instructions clearly and loudly.', { coins: 3, title: { de: 'Fluch der flüsternden See', en: 'Curse of the Whispering Sea' }, followUpId: 'whisper-blessing', flow: 'ongoing', endTrigger: 'followUp' }),
  challenge('whisper-blessing', 'Segen: Sage zu {targetPlayer}: „Die See hört deine Stimme wieder.“ Danach endet der Flüsterfluch.', 'Blessing: Tell {targetPlayer}: “The sea can hear your voice again.” The whispering curse then ends.', { coins: 2, title: { de: 'Segen der klaren Stimme', en: 'Blessing of the Clear Voice' }, mandatory: true, followUpOnly: true }),
  challenge('pirate-word-curse', 'Fluch: Sprich bei jeder eigenen Antwort besonders vornehm. Der Fluch endet heimlich, sobald eine andere Person das Wort „Pirat“ oder „pirate“ sagt.', 'Curse: Speak with exaggerated refinement whenever you answer. The curse secretly ends when another player says “Pirat” or “pirate.”', { coins: 3, title: { de: 'Fluch der vornehmen Piratin', en: 'Curse of the Refined Pirate' }, flow: 'ongoing', endTrigger: 'secretTrigger', triggerKind: 'pirateWord' }),
  challenge('ship-word-curse', 'Fluch: Halte bei jeder Erwähnung einer Richtung kurz Ausschau. Der Fluch endet heimlich, sobald eine andere Person „Schiff“ oder „ship“ sagt.', 'Curse: Briefly scan the horizon whenever a direction is mentioned. The curse secretly ends when another player says “Schiff” or “ship.”', { coins: 3, title: { de: 'Fluch der rastlosen Wache', en: 'Curse of the Restless Lookout' }, flow: 'ongoing', endTrigger: 'secretTrigger', triggerKind: 'shipWord' }),
  challenge('treasure-word-curse', 'Fluch: Bewache deinen Platz übertrieben misstrauisch. Der Fluch endet heimlich, sobald eine andere Person „Schatz“ oder „treasure“ sagt.', 'Curse: Guard your place with exaggerated suspicion. The curse secretly ends when another player says “Schatz” or “treasure.”', { coins: 3, title: { de: 'Fluch des misstrauischen Schatzes', en: 'Curse of the Suspicious Treasure' }, flow: 'ongoing', endTrigger: 'secretTrigger', triggerKind: 'treasureWord' }),
  challenge('standing-fun-curse', 'Fluch: Tu so, als wäre dein Stuhl ein kleines Boot. Der Fluch endet heimlich, sobald eine andere Person für eine Spaßkarte aufsteht.', 'Curse: Pretend your chair is a tiny boat. The curse secretly ends when another player stands up for a fun card.', { coins: 3, title: { de: 'Fluch des winzigen Bootes', en: 'Curse of the Tiny Boat' }, flow: 'ongoing', endTrigger: 'secretTrigger', triggerKind: 'standingFun' }),
  challenge('correct-quiz-curse', 'Fluch: Reagiere auf jede Behauptung der Crew mit einem prüfenden Blick. Der Fluch endet heimlich, sobald ein Quiz richtig beantwortet wird.', 'Curse: Give every claim from the crew a scrutinising look. The curse secretly ends when a quiz is answered correctly.', { coins: 3, title: { de: 'Fluch der strengen Prüfung', en: 'Curse of the Stern Examination' }, flow: 'ongoing', endTrigger: 'secretTrigger', triggerKind: 'quizCorrect' }),
  challenge('impatient-fingers', 'Tippe bis zu deinem nächsten Zug immer wieder ungeduldig mit den Fingern auf den Tisch, als hättest du großen Zeitdruck.', 'Until your next turn, drum your fingers impatiently on the table as though time were running out.', { coins: 3, title: { de: 'Die ungeduldige Wache', en: 'The Impatient Watch' }, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('three-hops', 'Steh auf und hüpf dreimal auf der Stelle, wenn das für dich sicher ist. Alternativ wippst du dreimal übertrieben auf den Zehenspitzen.', 'Stand and hop three times in place if that is safe for you. Otherwise rise dramatically onto your toes three times.', { standing: true, title: { de: 'Dreifacher Seegang', en: 'Triple Sea Legs' } }),
  challenge('under-table-search', 'Schau auffällig unter den Tisch, als hättest du dort etwas Wichtiges verloren. Krabble nicht und blockiere keine Laufwege. Setz dich danach wieder hin.', 'Look conspicuously under the table as though you lost something important there. Do not crawl or block walkways. Sit back down afterwards.', { standing: true, title: { de: 'Unter Deck gesucht', en: 'Search Below Deck' } }),
  challenge('soap-opera-pirate', 'Spiele bis zu deinem nächsten Zug eine völlig überdramatische Figur aus einer Piraten-Seifenoper. Seufze bedeutungsvoll und reagiere theatralisch, ohne eine reale Person oder Gruppe nachzuahmen.', 'Until your next turn, play an outrageously dramatic character from a pirate soap opera. Sigh meaningfully and react theatrically without imitating a real person or group.', { coins: 3, title: { de: 'Piraten-Seifenoper', en: 'Pirate Soap Opera' }, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('accent-shift', 'Sprich bis zu deinem nächsten Zug in einem freundlichen Dialekt oder Fantasieakzent, den du gut kannst – zum Beispiel kölsch oder sächsisch. Karikiere keine Person oder Herkunft.', 'Until your next turn, use a friendly regional or invented accent you know well. Do not caricature any person or background.', { coins: 3, title: { de: 'Neue Stimme an Bord', en: 'A New Voice Aboard' }, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('self-compliments', 'Mach dir bis zu deinem nächsten Zug bei passenden Gelegenheiten kurze, völlig übertriebene Komplimente.', 'Until your next turn, give yourself brief, wildly exaggerated compliments whenever an opportunity appears.', { coins: 3, title: { de: 'Eigenlob mit Rückenwind', en: 'Self-Praise with Tailwind' }, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('aye-aye-sentences', 'Beginne bis zum Beginn deines nächsten Zuges jeden gesprochenen Satz mit „Ai, ai“.', 'Until the start of your next turn, begin every spoken sentence with “Aye, aye”.', { coins: 3, title: { de: 'Ai, ai vorweg', en: 'Aye, Aye First' }, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('arr-sentences', 'Beende bis zum Beginn deines nächsten Zuges jeden gesprochenen Satz mit einem deutlichen „Arr“.', 'Until the start of your next turn, end every spoken sentence with a clear “Arr”.', { coins: 3, title: { de: 'Arr zum Schluss', en: 'Arr at the End' }, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('captain-permission', 'Ernenne {targetPlayer} zum Kapitän. Bis zum Beginn deines nächsten Zuges musst du vor jeder eigenen Entscheidung oder Aktion höflich um Erlaubnis bitten.', 'Appoint {targetPlayer} as captain. Until the start of your next turn, politely ask the captain for permission before each decision or action of your own.', { coins: 4, title: { de: 'Befehl des Kapitäns', en: 'Captain’s Orders' }, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('self-talk', 'Führe 20 Sekunden lang ein ernstes Gespräch mit dir selbst und beantworte dabei deine eigenen Fragen. Mach danach kommentarlos weiter.', 'Hold a serious 20-second conversation with yourself and answer your own questions. Then continue without comment.', { durationSeconds: 20, title: { de: 'Zwiegespräch an Deck', en: 'A Talk with Yourself' } }),
  challenge('bad-joke', 'Erzähle der Crew einen absichtlich richtig schlechten, harmlosen Witz.', 'Tell the crew an intentionally terrible, harmless joke.', { title: { de: 'Flachwitz aus der Bilge', en: 'A Joke from the Bilge' } }),
  challenge('hiccups', 'Simuliere bis zu deinem nächsten Zug gelegentlich einen harmlosen Schluckauf. Übertreib nicht so stark, dass Gespräche oder Küchenarbeit gestört werden.', 'Until your next turn, occasionally pretend to hiccup. Do not overdo it enough to disrupt conversation or kitchen work.', { coins: 3, title: { de: 'Schluckauf auf See', en: 'Hiccups at Sea' }, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('mime-self-slap', 'Spiele pantomimisch und mit deutlichem Abstand eine dramatische Backpfeife gegen dich selbst. Berühre oder schlage dich dabei nicht wirklich.', 'Mime a dramatic self-slap while keeping a clear distance. Do not actually touch or hit yourself.', { title: { de: 'Dramatische Erkenntnis', en: 'Dramatic Realisation' } }),
  challenge('hand-trumpet', 'Simuliere einen richtig lauten Pfurz, indem du in deine Hand pustest wie in eine Trompete. Bleib danach völlig ernst.', 'Simulate a very loud fart by blowing into your hand like a trumpet. Keep a completely straight face afterwards.', { title: { de: 'Die Nebelhornprobe', en: 'The Foghorn Test' } }),
  challenge('chair-circle', 'Dreh dich sicher einmal mit einem geeigneten Drehstuhl im Kreis. Falls der Stuhl nicht dafür geeignet ist, steh auf und geh einmal um ihn herum.', 'Safely spin once in a suitable swivel chair. If the chair is not suitable, stand and walk around it once instead.', { standing: true, title: { de: 'Einmal rund um die Insel', en: 'Once Around the Island' } }),
  challenge('ceremonial-greeting', 'Bestehe freundlich darauf, deinen Sitznachbarn feierlich zu begrüßen. Die andere Person wählt zwischen Handschlag, Faustgruß oder Winken.', 'Politely insist on ceremonially greeting the person beside you. They choose between a handshake, fist bump, or wave.', { title: { de: 'Feierlicher Matrosengruß', en: 'Ceremonial Sailor Greeting' } }),
  challenge('folded-note', 'Nimm einen Zettel und schreibe: „Nicht sagen, was hier draufsteht.“ Falte ihn und gib ihn einer beliebigen Person. Erkläre nichts weiter.', 'Take a note and write: “Do not say what is written here.” Fold it and hand it to any player. Explain nothing further.', { title: { de: 'Die streng geheime Nachricht', en: 'The Highly Secret Note' } }),
  challenge('charade-anchor', 'Stelle pantomimisch einen schweren Schiffsanker dar, der erst hochgezogen und anschließend ins Meer gelassen wird. Sprich nicht, mache keine Geräusche und zeige nicht auf Gegenstände. Die übrige Crew hat nach dem Start 60 Sekunden Zeit, „Anker“ oder „Schiffsanker“ zu erraten.', 'Mime a heavy ship anchor being hauled up and then lowered into the sea. Do not speak, make sounds, or point at objects. After the start, the rest of the crew has 60 seconds to guess “anchor” or “ship anchor.”', { skillCheck: true, durationSeconds: 60, successCoins: 3, failureCoins: -2, title: { de: 'Scharade: Der schwere Anker', en: 'Charade: The Heavy Anchor' } }),
  challenge('charade-parrot', 'Stelle pantomimisch einen Papagei dar, der auf einer Piratenschulter sitzt, Körner pickt und mit den Flügeln schlägt. Sprich nicht, mache keine Tiergeräusche und zeige nicht auf Gegenstände. Die übrige Crew hat nach dem Start 60 Sekunden Zeit, „Papagei“ zu erraten.', 'Mime a parrot sitting on a pirate’s shoulder, pecking seeds, and flapping its wings. Do not speak, make animal sounds, or point at objects. After the start, the rest of the crew has 60 seconds to guess “parrot.”', { skillCheck: true, durationSeconds: 60, successCoins: 3, failureCoins: -2, title: { de: 'Scharade: Der Papagei', en: 'Charade: The Parrot' } }),
  challenge('charade-treasure-chest', 'Stelle pantomimisch dar, wie du eine schwere verschlossene Schatztruhe findest, mühsam öffnest und vom Inhalt geblendet wirst. Sprich nicht, mache keine Geräusche und zeige nicht auf Gegenstände. Die übrige Crew hat nach dem Start 60 Sekunden Zeit, „Schatztruhe“ zu erraten.', 'Mime finding a heavy locked treasure chest, struggling to open it, and being dazzled by its contents. Do not speak, make sounds, or point at objects. After the start, the rest of the crew has 60 seconds to guess “treasure chest.”', { skillCheck: true, durationSeconds: 60, successCoins: 3, failureCoins: -2, title: { de: 'Scharade: Die Schatztruhe', en: 'Charade: The Treasure Chest' } }),
  challenge('charade-storm-ship', 'Stelle pantomimisch ein Piratenschiff in einem heftigen Sturm dar: schwankendes Deck, starkes Steuern und hohe Wellen. Bleib dabei sicher an deinem Platz. Sprich nicht und mache keine Geräusche. Die übrige Crew hat nach dem Start 60 Sekunden Zeit, „Schiff im Sturm“ oder „Piratenschiff im Sturm“ zu erraten.', 'Mime a pirate ship in a fierce storm: a rolling deck, hard steering, and towering waves. Stay safely in place. Do not speak or make sounds. After the start, the rest of the crew has 60 seconds to guess “ship in a storm” or “pirate ship in a storm.”', { skillCheck: true, durationSeconds: 60, successCoins: 3, failureCoins: -2, title: { de: 'Scharade: Sturm auf See', en: 'Charade: Storm at Sea' } }),
  challenge('charade-lighthouse', 'Stelle pantomimisch einen Leuchtturm dar, dessen Licht langsam über das Meer wandert und einem Schiff den Weg zeigt. Sprich nicht, mache keine Geräusche und zeige nicht auf echte Lampen. Die übrige Crew hat nach dem Start 60 Sekunden Zeit, „Leuchtturm“ zu erraten.', 'Mime a lighthouse whose beam slowly sweeps across the sea and guides a ship. Do not speak, make sounds, or point at real lights. After the start, the rest of the crew has 60 seconds to guess “lighthouse.”', { skillCheck: true, durationSeconds: 60, successCoins: 3, failureCoins: -2, title: { de: 'Scharade: Der Leuchtturm', en: 'Charade: The Lighthouse' } }),
  challenge('charade-cannon', 'Stelle pantomimisch dar, wie eine Schiffskanone geladen, ausgerichtet und abgefeuert wird. Bleib an deinem Platz und berühre niemanden. Sprich nicht und mache keinen Kanonenknall. Die übrige Crew hat nach dem Start 60 Sekunden Zeit, „Kanone“ oder „Schiffskanone“ zu erraten.', 'Mime loading, aiming, and firing a ship’s cannon. Stay in place and touch nobody. Do not speak or imitate the cannon blast. After the start, the rest of the crew has 60 seconds to guess “cannon” or “ship’s cannon.”', { skillCheck: true, durationSeconds: 60, successCoins: 3, failureCoins: -2, title: { de: 'Scharade: Die Schiffskanone', en: 'Charade: The Ship’s Cannon' } }),
  challenge('charade-seasick-pirate', 'Stelle pantomimisch einen seekranken Piraten auf starkem Wellengang dar, der sich am Mast festhält und trotzdem weiter Ausschau hält. Bleib sicher an deinem Platz und spiele nur. Sprich nicht und mache keine Geräusche. Die übrige Crew hat nach dem Start 60 Sekunden Zeit, „seekranker Pirat“ oder „Seekrankheit“ zu erraten.', 'Mime a seasick pirate in heavy waves, clinging to the mast while still keeping watch. Stay safely in place and only act it out. Do not speak or make sounds. After the start, the rest of the crew has 60 seconds to guess “seasick pirate” or “seasickness.”', { skillCheck: true, durationSeconds: 60, successCoins: 3, failureCoins: -2, title: { de: 'Scharade: Der seekranke Pirat', en: 'Charade: The Seasick Pirate' } }),
  challenge('charade-buried-treasure', 'Stelle pantomimisch dar, wie du einer Schatzkarte folgst, an der richtigen Stelle gräbst und einen vergrabenen Schatz findest. Sprich nicht, mache keine Geräusche und benutze keine echten Gegenstände. Die übrige Crew hat nach dem Start 60 Sekunden Zeit, „vergrabener Schatz“ oder „Schatzsuche“ zu erraten.', 'Mime following a treasure map, digging in the right place, and finding buried treasure. Do not speak, make sounds, or use real objects. After the start, the rest of the crew has 60 seconds to guess “buried treasure” or “treasure hunt.”', { skillCheck: true, durationSeconds: 60, successCoins: 3, failureCoins: -2, title: { de: 'Scharade: Der vergrabene Schatz', en: 'Charade: The Buried Treasure' } }),
  challenge('captain-pose', 'Steh auf und nimm zehn Sekunden lang deine überzeugendste Kapitänspose ein. Setz dich danach wortlos wieder hin.', 'Stand and hold your most convincing captain’s pose for ten seconds. Then sit down again without a word.', { durationSeconds: 10, title: { de: 'Die Pose des Kapitäns', en: 'The Captain’s Pose' } }),
  challenge('invisible-parrot', 'Begrüße einen unsichtbaren Papagei auf deiner Schulter und frage ihn leise nach seiner Meinung.', 'Greet an invisible parrot on your shoulder and quietly ask for its opinion.', { title: { de: 'Der unsichtbare Papagei', en: 'The Invisible Parrot' } }),
  challenge('pirate-weather', 'Gib der Crew einen 20-sekündigen Wetterbericht für die aktuelle Piratenreise. Mindestens Wind, Wellen und die Aussicht auf Beute müssen vorkommen.', 'Give the crew a 20-second weather report for the current pirate voyage. Mention wind, waves, and the chance of treasure.', { durationSeconds: 20, title: { de: 'Wetterbericht von hoher See', en: 'High-Seas Weather Report' } }),
  challenge('royal-toast', 'Erhebe dein vorhandenes Getränk und bringe einen kurzen, dramatischen Trinkspruch auf die Crew aus. Falls du gerade keines hast, genügt ein imaginäres Glas.', 'Raise your current drink and make a short dramatic toast to the crew. If you do not have one right now, an imaginary glass is enough.', { title: { de: 'Der große Crew-Trinkspruch', en: 'The Grand Crew Toast' } }),
  challenge('forbidden-yes', 'Vermeide bis zu deinem nächsten Zug das Wort „ja“. Falls es dir herausrutscht, machst du einfach normal weiter.', 'Avoid the word “yes” until your next turn. If it slips out, simply continue normally.', { coins: 3, title: { de: 'Das verbotene Ja', en: 'The Forbidden Yes' }, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('dramatic-whisper', 'Sprich deinen nächsten vollständigen Satz in einem verschwörerischen Flüsterton. Danach redest du wieder normal.', 'Speak your next full sentence in a conspiratorial whisper. Then return to normal.', { title: { de: 'Das Flüstern aus der Kajüte', en: 'The Cabin Whisper' } }),
  challenge('imaginary-rope', 'Zieh zehn Sekunden lang pantomimisch an einem schweren unsichtbaren Tau. Bleib dabei sicher an deinem Platz.', 'Mime pulling a heavy invisible rope for ten seconds. Stay safely in your place while doing it.', { durationSeconds: 10, title: { de: 'Das unsichtbare Tau', en: 'The Invisible Rope' } }),
  challenge('tiny-telescope', 'Forme mit den Händen ein Fernrohr und suche fünf Sekunden lang den Raum nach einer fernen Insel ab.', 'Make a telescope with your hands and scan the room for a distant island for five seconds.', { durationSeconds: 5, title: { de: 'Land in Sicht', en: 'Land Ahoy' } }),
  challenge('course-riddle', 'Erfinde ein kurzes, leicht lösbares Rätsel über eine Zutat oder ein Küchengerät. Die Crew darf genau dreimal raten. Errät sie die Lösung, ist die Challenge geschafft; sonst ist sie gescheitert.', 'Invent a short, easy riddle about an ingredient or kitchen tool. The crew gets exactly three guesses. If they find the answer, the challenge succeeds; otherwise it fails.', { skillCheck: true, title: { de: 'Das Rätsel der Kombüse', en: 'The Galley Riddle' } }),
  challenge('pirate-oath', 'Lege eine Hand aufs Herz und schwöre feierlich, die Crew sicher bis zum nächsten Gang zu begleiten.', 'Place a hand over your heart and solemnly swear to guide the crew safely to the next course.', { title: { de: 'Der feierliche Piratenschwur', en: 'The Solemn Pirate Oath' } }),
  challenge('table-rhythm', 'Trommle mit zwei Fingern einen kurzen Rhythmus. Die Crew hat genau einen Versuch, ihn gemeinsam richtig nachzumachen. Stimmt die Folge, ist die Challenge geschafft.', 'Tap a short rhythm with two fingers. The crew gets exactly one attempt to repeat it correctly together. If the sequence matches, the challenge succeeds.', { skillCheck: true, dexterity: true, durationSeconds: 30, title: { de: 'Der Takt der Galeere', en: 'The Galley Beat' } }),
  challenge('statue-lookout', 'Erstarre zehn Sekunden lang wie eine steinerne Galionsfigur und blicke entschlossen in die Ferne.', 'Freeze for ten seconds like a stone figurehead and stare determinedly into the distance.', { durationSeconds: 10, title: { de: 'Die lebende Galionsfigur', en: 'The Living Figurehead' } }),
  challenge('course-nickname', 'Gebt dem entstehenden Gang gemeinsam einen albernen Piraten-Spitznamen. Die aktive Person entscheidet bei Gleichstand.', 'Give the emerging course a silly pirate nickname together. The active player breaks any tie.', { title: { de: 'Der Spitzname der Beute', en: 'A Nickname for the Loot' } }),
  challenge('one-word-captain', 'Antworte auf die nächste Frage, die dir gestellt wird, nur mit „Kapitän“. Danach sprichst du wieder normal.', 'Answer the next question you are asked using only “Captain”. Then speak normally again.', { title: { de: 'Nur ein Wort: Kapitän', en: 'One Word: Captain' } }),
  challenge('sea-legs', 'Schwanke im Sitzen fünf Sekunden ganz leicht, als hätte das Schiff eine kleine Welle erwischt. Achte auf Abstand zu heißen oder scharfen Dingen.', 'Sway very gently while seated for five seconds as though the ship hit a small wave. Keep clear of anything hot or sharp.', { durationSeconds: 5, title: { de: 'Eine kleine Welle', en: 'A Little Wave' } }),
  challenge('treasure-announcer', 'Kündige den aktuellen Münzstand mit der Stimme eines übertrieben wichtigen königlichen Herolds an.', 'Announce the current coin total in the voice of an absurdly important royal herald.', { title: { de: 'Der Herold der Bordkasse', en: 'Herald of the Ship’s Purse' } }),
  challenge('synchronized-arr', 'Zählt gemeinsam von drei herunter und ruft dann alle gleichzeitig ein möglichst überzeugendes „Arr!“', 'Count down together from three, then everyone gives their most convincing “Arr!” at the same time.', { title: { de: 'Das gemeinsame Arr', en: 'The Crew’s Arr' } }),
  challenge('imaginary-map', 'Breite pantomimisch eine riesige Schatzkarte aus, zeige auf einen erfundenen Ort und nicke bedeutungsvoll.', 'Mime unrolling a huge treasure map, point to an imaginary place, and nod meaningfully.', { title: { de: 'Die Karte ohne Papier', en: 'The Map Without Paper' } }),
  challenge('pirate-commercial', 'Erfinde in 20 Sekunden einen übertriebenen Werbespruch für den aktuellen Gang, als wäre er die größte Beute der Welt.', 'In 20 seconds, invent an exaggerated advertisement for the current course as though it were the world’s greatest treasure.', { durationSeconds: 20, title: { de: 'Reklame für die Beute', en: 'An Advert for the Loot' } }),
  challenge('friendly-salute', 'Grüße jede Person am Tisch einmal mit einem kleinen, selbst erfundenen Piratengruß, ohne jemanden zu berühren.', 'Give every person at the table a small invented pirate salute without touching anyone.', { title: { de: 'Der Gruß der ganzen Crew', en: 'A Salute for the Whole Crew' } }),
  challenge('compass-north', 'Zeige sehr überzeugt in eine beliebige Richtung und verkünde: „Dort ist Norden.“', 'Point confidently in any direction and announce, “That way is north.”', { title: { de: 'Der zweifelhafte Kompass', en: 'The Questionable Compass' } }),
  challenge('imaginary-beard', 'Streiche zehn Sekunden nachdenklich über einen unsichtbaren langen Piratenbart und nicke dabei ernst.', 'Thoughtfully stroke an invisible long pirate beard for ten seconds while nodding seriously.', { durationSeconds: 10, title: { de: 'Der Bart des alten Seebären', en: 'The Old Sea Dog’s Beard' } }),
  challenge('captain-inspection', 'Mustere den Tisch fünfzehn Sekunden wie ein Kapitän bei einer wichtigen Schiffsinspektion. Berühre und verändere dabei nichts.', 'Inspect the table for fifteen seconds like a captain conducting an important ship inspection. Touch and change nothing.', { durationSeconds: 15, title: { de: 'Inspektion an Deck', en: 'Inspection on Deck' } }),
  challenge('three-pirate-laughs', 'Führe nacheinander drei unterschiedliche Piratenlacher vor: leise, vornehm und völlig übertrieben.', 'Perform three different pirate laughs in sequence: quiet, refined, and wildly exaggerated.', { title: { de: 'Dreifaches Piratengelächter', en: 'Three Pirate Laughs' } }),
  challenge('cannon-countdown', 'Zählt gemeinsam von fünf herunter. Bei null ruft die aktive Person „Kanone!“, alle anderen machen ein kurzes, leises Explosionsgeräusch.', 'Count down together from five. At zero, the active player calls “Cannon!” and everyone else makes a brief, quiet explosion sound.', { title: { de: 'Die freundliche Bordkanone', en: 'The Friendly Deck Cannon' } }),
  challenge('message-bottle', 'Flüstere einen kurzen freundlichen Satz in eine imaginäre Flasche, verschließe sie pantomimisch und schiebe sie über den Tisch ins Meer.', 'Whisper a short friendly sentence into an imaginary bottle, mime sealing it, and send it across the table into the sea.', { title: { de: 'Post aus der Flasche', en: 'A Message in a Bottle' } }),
  challenge('imaginary-gold-test', 'Prüfe eine unsichtbare Goldmünze fachmännisch gegen das Licht und erkläre sie anschließend feierlich für echt.', 'Examine an invisible gold coin expertly against the light, then solemnly declare it genuine.', { title: { de: 'Die Prüfung des Goldstücks', en: 'Testing the Gold Piece' } }),
  challenge('invisible-knot', 'Erkläre der Crew mit reinen Handbewegungen, wie man einen völlig erfundenen Seemannsknoten bindet. Echtes Küchenmaterial bleibt liegen.', 'Use only hand gestures to teach the crew a completely invented sailor’s knot. Leave real kitchen items untouched.', { title: { de: 'Der Knoten, den keiner kennt', en: 'The Knot Nobody Knows' } }),
  challenge('gull-call', 'Imitiere einmal kurz und nicht zu laut eine Möwe. Blicke danach empört zur Decke, als wäre das Geräusch von dort gekommen.', 'Briefly imitate a seagull without being too loud. Then glare at the ceiling as though the sound came from there.', { title: { de: 'Die Möwe über der Kombüse', en: 'The Gull Above the Galley' } }),
  challenge('chair-ship-name', 'Gib deinem Stuhl einen würdevollen Schiffsnamen und stelle ihn der Crew in einem einzigen Satz vor.', 'Give your chair a dignified ship name and introduce it to the crew in a single sentence.', { title: { de: 'Die Taufe des Sitzschiffs', en: 'Naming the Chair-Ship' } }),
  challenge('sea-monster', 'Beschreibe in zwanzig Sekunden ein freundliches Seeungeheuer, das am liebsten Küchenabfälle frisst und beim Kochen hilft.', 'In twenty seconds, describe a friendly sea monster that loves eating kitchen scraps and helping with cooking.', { durationSeconds: 20, title: { de: 'Das freundliche Ungeheuer', en: 'The Friendly Sea Monster' } }),
  challenge('treasure-inventory', 'Wähle drei harmlose sichtbare Gegenstände und führe sie mit übertrieben wertvollen Namen als Teil des Piratenschatzes auf.', 'Choose three harmless visible objects and list them as pirate treasure using extravagantly valuable names.', { title: { de: 'Inventur der kostbaren Beute', en: 'Inventory of Precious Loot' } }),
  challenge('ship-bell', 'Sage zweimal deutlich „Ding-ding“ und verkünde anschließend mit ernster Stimme den Beginn einer neuen Schiffswache.', 'Say “ding-ding” twice, then solemnly announce the beginning of a new ship’s watch.', { title: { de: 'Die unsichtbare Schiffsglocke', en: 'The Invisible Ship’s Bell' } }),
  challenge('mast-lookout', 'Steh auf, falls es sicher ist, schirme die Augen mit einer Hand ab und melde kurz, was du am Horizont siehst. Im Sitzen gilt es genauso.', 'Stand if safe, shade your eyes with one hand, and briefly report what you see on the horizon. Doing it seated counts equally.', { title: { de: 'Wache im Krähennest', en: 'Watch in the Crow’s Nest' } }),
  challenge('distant-wave', 'Winke fünf Sekunden freundlich einem weit entfernten erfundenen Schiff zu und warte ernst auf eine Antwort.', 'Wave for five seconds at an imaginary distant ship and wait seriously for a reply.', { durationSeconds: 5, title: { de: 'Gruß an das ferne Schiff', en: 'Greeting the Distant Ship' } }),
  challenge('cutlery-vote', 'Lasst die Crew per Handzeichen entscheiden, ob Löffel oder Gabel das bessere Piratenwerkzeug ist. Die aktive Person verkündet das Ergebnis.', 'Have the crew vote by show of hands whether a spoon or fork is the better pirate tool. The active player announces the result.', { title: { de: 'Der große Besteckentscheid', en: 'The Great Cutlery Vote' } }),
  challenge('galley-motto', 'Erfindet gemeinsam ein kurzes Motto für eure Kombüse, das mit „Eine Crew, ein …“ beginnt.', 'Invent a short motto for your galley together beginning with “One crew, one …”.', { title: { de: 'Das Motto der Kombüse', en: 'The Galley Motto' } }),
  challenge('pirate-haiku', 'Dichte spontan drei sehr kurze Zeilen über Meer, Essen und Mannschaft. Reime sind ausdrücklich nicht nötig.', 'Improvise three very short lines about sea, food, and crew. Rhymes are explicitly unnecessary.', { title: { de: 'Drei Zeilen auf hoher See', en: 'Three Lines on the High Seas' } }),
  challenge('secret-wink', 'Zwinkere der nächsten Person, die dich direkt ansieht, einmal verschwörerisch zu. Verhalte dich danach wieder völlig normal.', 'Give one conspiratorial wink to the next person who looks directly at you. Then behave completely normally again.', { title: { de: 'Das verschwörerische Zwinkern', en: 'The Conspiratorial Wink' } }),
  challenge('slow-motion-reach', 'Führe zehn Sekunden lang pantomimisch in Zeitlupe vor, wie du nach einem weit entfernten Schatz greifst. Greife nicht nach echten Gegenständen.', 'For ten seconds, mime reaching for a distant treasure in slow motion. Do not reach for real objects.', { durationSeconds: 10, title: { de: 'Die Beute in Zeitlupe', en: 'Treasure in Slow Motion' } }),
  challenge('anchor-drop', 'Mime mit beiden Händen, wie du vorsichtig einen schweren Anker hinablässt, und wische dir danach erleichtert die Stirn.', 'Mime carefully lowering a heavy anchor with both hands, then wipe your brow in relief.', { title: { de: 'Anker fallen lassen', en: 'Lowering the Anchor' } }),
  challenge('captain-log', 'Sprich einen zwanzigsekündigen Eintrag für das Kapitänslogbuch: aktueller Gang, Stimmung der Crew und Zustand der See.', 'Deliver a twenty-second captain’s log entry covering the current course, crew morale, and state of the sea.', { durationSeconds: 20, title: { de: 'Eintrag ins Kapitänslogbuch', en: 'Captain’s Log Entry' } }),
  challenge('crew-flag', 'Beschreibt gemeinsam in höchstens einer Minute eine Flagge für eure Crew: Farbe, Symbol und einen völlig unnötigen Zusatz.', 'In no more than one minute, describe a flag for your crew: its colour, symbol, and one completely unnecessary extra detail.', { title: { de: 'Die Flagge der Mannschaft', en: 'The Crew’s Flag' } }),
  challenge('compass-crew', 'Die aktive Person ruft eine Himmelsrichtung. Alle zeigen sofort in die Richtung, die sie dafür halten; unterschiedliche Antworten sind ausdrücklich erlaubt.', 'The active player calls a compass direction. Everyone immediately points where they think it is; different answers are explicitly allowed.', { title: { de: 'Kompassprobe der Crew', en: 'The Crew Compass Test' } }),
  challenge('treasure-guard', 'Verschränke zehn Sekunden die Arme und bewache eine unsichtbare Schatztruhe vor dir mit besonders ernstem Blick.', 'Fold your arms for ten seconds and guard an invisible treasure chest in front of you with an especially serious expression.', { durationSeconds: 10, title: { de: 'Wache vor der leeren Truhe', en: 'Guarding the Empty Chest' } }),
  challenge('suspicious-cup', 'Mustere dein eigenes Getränk kurz misstrauisch, rieche nur aus sicherem Abstand daran und nicke dann erleichtert.', 'Briefly inspect your own drink with suspicion, smell it only from a safe distance, then nod with relief.', { title: { de: 'Der verdächtige Becher', en: 'The Suspicious Cup' } }),
  challenge('crew-applause', 'Schenkt allen Personen mit einer laufenden oder bereits erledigten Küchenaufgabe gemeinsam fünf Sekunden Applaus.', 'Give everyone with a current or completed kitchen task five seconds of applause together.', { durationSeconds: 5, title: { de: 'Applaus für die Kombüse', en: 'Applause for the Galley' }, requirements: ['courseWorkStarted'] }),
  challenge('storm-chorus', 'Erzeugt gemeinsam zehn Sekunden lang einen leisen Sturm nur mit Fingerschnippen, Händereiben und sanftem Klopfen.', 'Create a quiet ten-second storm together using only finger snaps, rubbing hands, and gentle tapping.', { durationSeconds: 10, title: { de: 'Der Sturm im Kleinformat', en: 'A Pocket-Sized Storm' } }),
  challenge('parrot-echo', 'Wiederhole das letzte Wort des nächsten vollständigen Satzes, den eine andere Person sagt, einmal leise wie ein Papagei.', 'Quietly repeat the final word of the next full sentence spoken by another player, like a parrot.', { title: { de: 'Das Echo des Papageis', en: 'The Parrot’s Echo' } }),
  challenge('secret-coordinate', 'Verkünde eine frei erfundene Schatzkoordinate aus Zahl, Buchstabe und Himmelsrichtung. Bestehe darauf, dass sie „ungefähr stimmen müsste“.', 'Announce an invented treasure coordinate containing a number, letter, and compass direction. Insist it “should be roughly correct.”', { title: { de: 'Die geheime Koordinate', en: 'The Secret Coordinate' } }),
  challenge('royal-taster', 'Rieche kurz in die Luft und erkläre mit wichtiger Stimme, dass die Kombüse die königliche Geschmacksprüfung bestanden hat.', 'Briefly sniff the air and announce importantly that the galley has passed the royal taste inspection.', { title: { de: 'Die königliche Geschmackswache', en: 'The Royal Taste Watch' } }),
  challenge('eyebrow-signal', 'Hebe beim Aufdecken der nächsten Karte einmal bedeutungsvoll beide Augenbrauen, egal was darauf steht.', 'When the next card is revealed, raise both eyebrows meaningfully once, no matter what it says.', { title: { de: 'Das geheime Augenbrauensignal', en: 'The Secret Eyebrow Signal' }, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('invisible-hat', 'Ziehe einen unsichtbaren Piratenhut, verbeuge dich damit kurz vor der Crew und setze ihn wieder auf.', 'Remove an invisible pirate hat, bow briefly to the crew with it, and put it back on.', { title: { de: 'Der unsichtbare Dreispitz', en: 'The Invisible Tricorn' } }),
  challenge('course-prophecy', 'Sage mit geheimnisvoller Stimme voraus, welche Geschmacksrichtung oder welcher Arbeitsschritt als Nächstes wichtig wird.', 'Mysteriously predict which flavour direction or work step will become important next.', { title: { de: 'Die Prophezeiung des Gangs', en: 'The Course Prophecy' } }),
  challenge('harbor-name', 'Erfinde für den aktuellen Raum einen prächtigen Piratenhafennamen und verkünde, dass ihr soeben dort angelegt habt.', 'Invent a grand pirate-harbour name for the current room and announce that the crew has just docked there.', { title: { de: 'Ein neuer Hafenname', en: 'A New Harbour Name' } }),
  challenge('cannonball-catch', 'Fange pantomimisch eine federleichte unsichtbare Kanonenkugel, bestaune sie kurz und lege sie vorsichtig ab.', 'Mime catching a feather-light invisible cannonball, admire it briefly, and set it down carefully.', { title: { de: 'Die federleichte Kanonenkugel', en: 'The Feather-Light Cannonball' } }),
  challenge('shanty-hum', 'Summe fünfzehn Sekunden eine frei erfundene Seemannsmelodie. Die Crew darf im Takt mit einem Finger wippen.', 'Hum an invented sailor’s tune for fifteen seconds. The crew may keep time with one finger.', { durationSeconds: 15, title: { de: 'Die Melodie ohne Worte', en: 'The Wordless Shanty' } }),
  challenge('flag-signal', 'Erfinde mit beiden Händen ein einfaches Flaggensignal und erkläre der Crew anschließend, was es angeblich bedeutet.', 'Invent a simple flag signal using both hands, then tell the crew what it supposedly means.', { title: { de: 'Das Signal der unsichtbaren Flaggen', en: 'The Invisible Flag Signal' } }),
  challenge('captain-address', 'Sprich die jeweils aktive Person bis zu deinem nächsten Zug nur mit „Käpt’n“ an.', 'Until your next turn, address the active player only as “Captain.”', { coins: 3, title: { de: 'Alle heißen Käpt’n', en: 'Everyone Is Captain' }, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('seated-wave', 'Startet eine kleine La-Ola-Welle einmal rund um den Tisch. Alle bleiben dabei sicher sitzen oder stehen ruhig am eigenen Platz.', 'Send a small Mexican wave once around the table. Everyone stays safely seated or stands calmly in their own place.', { title: { de: 'Die Welle rund ums Deck', en: 'The Wave Around the Deck' } }),
  challenge('skill-one-leg', 'Steh 15 Sekunden auf einem Bein, ohne dich festzuhalten oder mit dem freien Fuß den Boden zu berühren. Bleib neben einem stabilen Stuhl und versuche es nur, wenn es sicher ist. Als sitzende Alternative balancierst du 15 Sekunden einen gefalteten Zettel auf deiner Schuhspitze.', 'Stand on one leg for 15 seconds without holding on or touching the floor with the free foot. Stay beside a stable chair and try only if it is safe. As a seated alternative, balance a folded note on the tip of your shoe for 15 seconds.', { skillCheck: true, dexterity: true, durationSeconds: 15, title: { de: 'Standfest im Seegang', en: 'Steady in the Swell' } }),
  challenge('skill-thumb-ladder', 'Berühre mit dem Daumen nacheinander Zeige-, Mittel-, Ring- und kleinen Finger und dann rückwärts zurück. Schaffe die vollständige Folge dreimal in 15 Sekunden, ohne einen Finger auszulassen oder zu vertauschen.', 'Touch your thumb to your index, middle, ring, and little finger in order, then return in reverse. Complete the full sequence three times in 15 seconds without skipping or swapping a finger.', { skillCheck: true, dexterity: true, durationSeconds: 15, title: { de: 'Die Fingerleiter des Steuermanns', en: 'The Helmsman’s Finger Ladder' } }),
  challenge('skill-paper-catch', 'Falte einen kleinen Zettel oder eine saubere Serviette locker zusammen. Wirf ihn höchstens bis auf Augenhöhe und fange ihn mit der anderen Hand. Zwei von drei sicheren Versuchen müssen gelingen.', 'Loosely fold a small note or clean napkin. Toss it no higher than eye level and catch it with the other hand. Two of three safe attempts must succeed.', { skillCheck: true, dexterity: true, durationSeconds: 30, title: { de: 'Die federleichte Beute', en: 'The Featherlight Prize' } }),
  challenge('skill-paper-balance', 'Lege einen gefalteten Zettel auf deinen Handrücken. Halte ihn dort 15 Sekunden und drehe das Handgelenk dabei einmal langsam nach links und zurück, ohne dass der Zettel herunterfällt.', 'Place a folded note on the back of your hand. Keep it there for 15 seconds while slowly turning your wrist left and back once without dropping the note.', { skillCheck: true, dexterity: true, durationSeconds: 15, title: { de: 'Fracht auf ruhiger Hand', en: 'Cargo on a Steady Hand' } }),
  challenge('skill-opposite-feet', 'Bleib sicher sitzen. Stelle bei einem Fuß nur die Ferse und beim anderen nur die Zehenspitzen auf den Boden. Tausche beide Positionen sechsmal in 15 Sekunden, ohne dass beide Füße gleichzeitig dieselbe Position haben.', 'Remain safely seated. Put only the heel of one foot and only the toes of the other on the floor. Swap both positions six times in 15 seconds without both feet ever taking the same position.', { skillCheck: true, dexterity: true, durationSeconds: 15, title: { de: 'Der verwirrte Deckschritt', en: 'The Tangled Deck Step' } }),
  challenge('skill-opposite-circles', 'Strecke beide Zeigefinger mit Abstand vor dir aus. Zeichne gleichzeitig fünf Kreise: links im Uhrzeigersinn, rechts gegen den Uhrzeigersinn. Richtungswechsel oder gleichlaufende Kreise bedeuten einen Fehlversuch; du hast zwei Versuche.', 'Hold both index fingers apart in front of you. Draw five circles at the same time: left clockwise, right counter-clockwise. Changing direction or making matching circles counts as a failed attempt; you get two attempts.', { skillCheck: true, dexterity: true, durationSeconds: 30, title: { de: 'Zwei Strudel voraus', en: 'Two Whirlpools Ahead' } }),
  challenge('coop-ship-name-debate', '{activePlayer} und {partner}: Diskutiert höchstens 45 Sekunden, welcher Name besser zu eurem Piratenschiff passt: „Die Wilde Gabel“ oder „Der Tanzende Kessel“. Einigt euch auf einen Sieger.', '{activePlayer} and {partner}: Debate for no more than 45 seconds which name better suits your pirate ship: “The Wild Fork” or “The Dancing Cauldron.” Agree on a winner.', { cooperative: true, partnerCount: 1, durationSeconds: 45, title: { de: 'Der große Schiffsnamenstreit', en: 'The Great Ship-Name Debate' } }),
  challenge('coop-snack-debate', '{activePlayer} und {partner}: Diskutiert kurz, welcher harmlose Snack auf einer langen Piratenreise unverzichtbar wäre. Jede Person nennt genau ein Argument.', '{activePlayer} and {partner}: Briefly debate which harmless snack would be essential on a long pirate voyage. Each person gives exactly one argument.', { cooperative: true, partnerCount: 1, title: { de: 'Proviant vor Gericht', en: 'Provisions on Trial' } }),
  challenge('coop-dance-invite', '{activePlayer}: Fordere {partner} zu einem sicheren 20-Sekunden-Piratentanz am eigenen Platz auf. Erfindet gemeinsam zwei einfache Bewegungen und wiederholt sie.', '{activePlayer}: Invite {partner} to a safe 20-second pirate dance at your own places. Invent two simple moves together and repeat them.', { cooperative: true, partnerCount: 1, durationSeconds: 20, title: { de: 'Tanzduell ohne Gegner', en: 'A Dance Duel without Rivals' } }),
  challenge('coop-handshake', '{activePlayer} und {partner}: Erfindet einen extravaganten Piratengruß aus drei kurzen Bewegungen. Handschlag, Faustgruß oder eine komplett berührungslose Variante sind gleichermaßen erlaubt.', '{activePlayer} and {partner}: Invent an extravagant pirate greeting made of three short moves. A handshake, fist bump, or entirely contact-free version are equally valid.', { cooperative: true, partnerCount: 1, title: { de: 'Der extravagante Piratengruß', en: 'The Extravagant Pirate Greeting' } }),
  challenge('coop-shanty-duet', '{activePlayer} und {partner}: Singt ein kurzes Duett. Eine Person beginnt mit „Hejo, hejo“, die andere antwortet „wir segeln los“, danach singt ihr die ganze Zeile gemeinsam.', '{activePlayer} and {partner}: Sing a short duet. One starts with “Heave-ho, heave-ho,” the other answers “off to sea we go,” then sing the whole line together.', { cooperative: true, partnerCount: 1, title: { de: 'Duett auf hoher See', en: 'Duet on the High Seas' } }),
  challenge('coop-mirror-captains', '{activePlayer} und {partner}: Stellt euch sicher gegenüber oder bleibt sitzen. Eine Person macht drei langsame Kapitänsposen vor, die andere versucht sie gleichzeitig zu spiegeln. Alle drei Spiegelungen müssen beim ersten Durchlauf stimmen.', '{activePlayer} and {partner}: Safely face each other or remain seated. One performs three slow captain poses while the other tries to mirror them at the same time. All three reflections must match on the first run.', { cooperative: true, partnerCount: 1, skillCheck: true, title: { de: 'Die Spiegelkapitäne', en: 'The Mirror Captains' } }),
  challenge('coop-weather-dialogue', '{activePlayer} und {partner}: Gebt gemeinsam einen 30-sekündigen Seewetterbericht. Wechselt euch nach jedem Satz ab und erwähnt Wind, Wellen und Abendessen.', '{activePlayer} and {partner}: Give a 30-second sea-weather report together. Alternate after every sentence and mention wind, waves, and dinner.', { cooperative: true, partnerCount: 1, durationSeconds: 30, title: { de: 'Wetterstudio an Deck', en: 'The Deck Weather Studio' } }),
  challenge('coop-pirate-rps', '{activePlayer} und {partner}: Spielt eine Runde „Papagei, Anker, Kanone“ nach den Regeln von Schere-Stein-Papier. Erfindet gemeinsam, welches Zeichen welches schlägt, bevor ihr spielt.', '{activePlayer} and {partner}: Play one round of “Parrot, Anchor, Cannon” using rock-paper-scissors rules. Agree which sign beats which before playing.', { cooperative: true, partnerCount: 1, title: { de: 'Papagei, Anker, Kanone', en: 'Parrot, Anchor, Cannon' } }),
  challenge('coop-secret-greeting', '{activePlayer} und {partner}: Erfindet wortlos einen gut sichtbaren Geheimgruß aus zwei Gesten und führt ihn danach genau einmal synchron vor. Stimmen Reihenfolge oder Timing nicht, ist der Versuch gescheitert.', '{activePlayer} and {partner}: Silently invent a clearly visible secret greeting made of two gestures, then perform it in sync exactly once. If the order or timing does not match, the attempt fails.', { cooperative: true, partnerCount: 1, skillCheck: true, title: { de: 'Der wortlose Bund', en: 'The Wordless Pact' } }),
  challenge('coop-double-figurehead', '{activePlayer} und {partner}: Werdet für zehn Sekunden zu zwei unterschiedlichen Galionsfiguren desselben Schiffs. Eine blickt mutig, die andere dramatisch besorgt.', '{activePlayer} and {partner}: Become two different figureheads on the same ship for ten seconds. One looks brave, the other dramatically worried.', { cooperative: true, partnerCount: 1, durationSeconds: 10, title: { de: 'Doppelte Galionsfigur', en: 'Double Figurehead' } }),
  challenge('coop-command-echo', '{activePlayer} spricht drei harmlose Fantasiekommandos wie „Segel aus Käse setzen!“. {partner} wiederholt jedes Kommando mit maximaler Kapitänswürde.', '{activePlayer} gives three harmless imaginary commands such as “Raise the cheese sails!” {partner} repeats each with maximum captainly dignity.', { cooperative: true, partnerCount: 1, title: { de: 'Kommando und Echo', en: 'Command and Echo' } }),
  challenge('coop-compliment-duel', '{activePlayer} und {partner}: Macht euch abwechselnd je zwei kurze, ehrliche Komplimente. Jedes Kompliment muss etwas anderes betreffen.', '{activePlayer} and {partner}: Take turns giving each other two brief, genuine compliments. Every compliment must be about something different.', { cooperative: true, partnerCount: 1, title: { de: 'Das freundliche Komplimentduell', en: 'The Friendly Compliment Duel' } }),
  challenge('coop-pantomime-guess', '{activePlayer} stellt pantomimisch einen harmlosen Gegenstand auf einem Piratenschiff dar. {partner} hat drei Versuche, ihn zu erraten; echtes Küchenmaterial bleibt unberührt. Ohne richtige Antwort ist die Challenge gescheitert.', '{activePlayer} mimes a harmless object found on a pirate ship. {partner} gets three guesses; real kitchen equipment remains untouched. Without a correct answer, the challenge fails.', { cooperative: true, partnerCount: 1, skillCheck: true, title: { de: 'Pantomime unter Segeln', en: 'Mime under Sail' } }),
  challenge('coop-rhythm-copy', '{activePlayer} klopft mit zwei Fingern einen kurzen Rhythmus auf den Tisch. {partner} hat einen Versuch, ihn richtig zu wiederholen und genau einen Schlag zu ergänzen; danach spielt ihr die erweiterte Folge gemeinsam.', '{activePlayer} taps a short rhythm on the table. {partner} gets one attempt to repeat it correctly and add exactly one beat; then perform the extended sequence together.', { cooperative: true, partnerCount: 1, skillCheck: true, title: { de: 'Der wachsende Bordtakt', en: 'The Growing Deck Beat' } }),
  challenge('coop-pirate-interview', '{activePlayer} interviewt {partner} 30 Sekunden als berühmte Piratenpersönlichkeit. Stellt zwei Fragen über ein erfundenes Abenteuer und beantwortet sie spontan.', '{activePlayer} interviews {partner} for 30 seconds as a famous pirate. Ask two questions about an imaginary adventure and answer them spontaneously.', { cooperative: true, partnerCount: 1, durationSeconds: 30, title: { de: 'Interview mit einer Legende', en: 'Interview with a Legend' } }),
  challenge('coop-air-map', '{activePlayer} und {partner}: Zeichnet abwechselnd mit einem Finger dieselbe unsichtbare Schatzkarte in die Luft. Eine Person zeichnet Insel und Weg, die andere ergänzt Schatz und Seeungeheuer.', '{activePlayer} and {partner}: Take turns drawing the same invisible treasure map in the air. One draws the island and route; the other adds treasure and a sea monster.', { cooperative: true, partnerCount: 1, title: { de: 'Die Schatzkarte in der Luft', en: 'The Treasure Map in the Air' } }),
  challenge('coop-synchronous-toast', '{activePlayer} und {partner}: Erfindet einen Trinkspruch mit höchstens acht Wörtern und sprecht ihn in genau einem Versuch exakt gleichzeitig. Eure vorhandenen Getränke oder leere imaginäre Gläser genügen.', '{activePlayer} and {partner}: Invent a toast of no more than eight words and say it at exactly the same time in one attempt. Your current drinks or empty imaginary glasses are enough.', { cooperative: true, partnerCount: 1, skillCheck: true, title: { de: 'Der synchrone Trinkspruch', en: 'The Synchronous Toast' } }),
  challenge('coop-one-word-story', '{activePlayer} und {partner}: Erzählt eine Piratengeschichte aus genau zwölf Wörtern, indem ihr immer abwechselnd nur ein Wort sagt. Versprecht ihr euch, wechselt ihr die Reihenfolge oder stimmt die Wortzahl nicht, ist die Challenge gescheitert.', '{activePlayer} and {partner}: Tell a pirate story of exactly twelve words by alternating one word at a time. If you misspeak, break the order, or end on the wrong word count, the challenge fails.', { cooperative: true, partnerCount: 1, skillCheck: true, title: { de: 'Zwölf Wörter Seemannsgarn', en: 'A Twelve-Word Sea Tale' } }),
  challenge('coop-gull-dialogue', '{activePlayer} und {partner}: Führt fünfzehn Sekunden einen leisen Dialog zwischen zwei empörten Hafenmöwen. Niemand muss laut kreischen.', '{activePlayer} and {partner}: Perform a quiet fifteen-second dialogue between two indignant harbour gulls. Nobody needs to screech loudly.', { cooperative: true, partnerCount: 1, durationSeconds: 15, title: { de: 'Zwei Möwen beschweren sich', en: 'Two Gulls Complain' } }),
  challenge('coop-rope-pull', '{activePlayer} und {partner}: Zieht zehn Sekunden gemeinsam an demselben unsichtbaren Tau. Bleibt an euren sicheren Plätzen und stimmt eure Bewegungen aufeinander ab.', '{activePlayer} and {partner}: Pull the same invisible rope together for ten seconds. Stay safely in place and coordinate your movements.', { cooperative: true, partnerCount: 1, durationSeconds: 10, title: { de: 'Gemeinsam am unsichtbaren Tau', en: 'Together on the Invisible Rope' } }),
  challenge('coop-three-voice-chorus', '{activePlayer}, {partner} und {partner2}: Singt zweimal gemeinsam: „Ai, ai, der Wind weht frei – unsere Crew ist mit dabei!“ Eine einfache selbst erfundene Melodie reicht.', '{activePlayer}, {partner}, and {partner2}: Sing together twice: “Aye, aye, the wind blows free — our brave crew sails the sea!” Any simple invented melody is enough.', { cooperative: true, partnerCount: 2, title: { de: 'Der dreistimmige Piratenchor', en: 'The Three-Voice Pirate Chorus' } }),
  challenge('coop-island-debate', '{activePlayer}, {partner} und {partner2}: Diskutiert 45 Sekunden, was auf einer perfekten Schatzinsel wichtiger ist: Schatten, Obst oder eine Hängematte. Jede Person verteidigt eine Sache.', '{activePlayer}, {partner}, and {partner2}: Debate for 45 seconds what matters most on a perfect treasure island: shade, fruit, or a hammock. Each person defends one.', { cooperative: true, partnerCount: 2, durationSeconds: 45, title: { de: 'Rat der Schatzinsel', en: 'Treasure Island Council' } }),
  challenge('coop-sea-soundscape', '{activePlayer}, {partner} und {partner2}: Erzeugt gemeinsam zehn Sekunden Meereskulisse. Eine Person macht Wind, eine Wellen und eine eine leise Möwe.', '{activePlayer}, {partner}, and {partner2}: Create a ten-second seascape together. One makes wind, one waves, and one a quiet gull.', { cooperative: true, partnerCount: 2, durationSeconds: 10, title: { de: 'Das kleine Meereshörspiel', en: 'The Tiny Sea Soundscape' } }),
  challenge('coop-pose-sequence', '{activePlayer}, {partner} und {partner2}: Erfindet drei sichere Piratenposen und zeigt sie danach in genau einem Versuch gleichzeitig in derselben Reihenfolge. Im Sitzen gilt die Aufgabe genauso.', '{activePlayer}, {partner}, and {partner2}: Invent three safe pirate poses, then perform them together in the same order and at the same time in exactly one attempt. Doing them seated counts equally.', { cooperative: true, partnerCount: 2, skillCheck: true, title: { de: 'Die Pose der drei Freibeuter', en: 'Pose of the Three Freebooters' } }),
  challenge('coop-three-line-poem', '{activePlayer}, {partner} und {partner2}: Dichtet ein dreizeiliges Piratengedicht. Jede Person erfindet genau eine Zeile; Reime sind nicht erforderlich.', '{activePlayer}, {partner}, and {partner2}: Create a three-line pirate poem. Each person invents exactly one line; rhymes are not required.', { cooperative: true, partnerCount: 2, title: { de: 'Drei Zeilen, drei Piraten', en: 'Three Lines, Three Pirates' } }),
  challenge('coop-ship-name-jury', '{activePlayer} nennt zwei absurde Schiffsnamen. {partner} und {partner2} beraten kurz als Jury und verkünden gemeinsam den Sieger.', '{activePlayer} proposes two absurd ship names. {partner} and {partner2} briefly deliberate as judges and announce the winner together.', { cooperative: true, partnerCount: 2, title: { de: 'Das Schiffsnamen-Gericht', en: 'The Ship-Name Court' } }),
  challenge('coop-cannonball-circle', '{activePlayer}, {partner} und {partner2}: Reicht eine federleichte unsichtbare Kanonenkugel einmal im Kreis weiter. Jede Person verändert pantomimisch ihr Gewicht.', '{activePlayer}, {partner}, and {partner2}: Pass a feather-light invisible cannonball around once. Each person changes its imaginary weight.', { cooperative: true, partnerCount: 2, title: { de: 'Die wandernde Kanonenkugel', en: 'The Travelling Cannonball' } }),
  challenge('coop-compliment-chain', '{activePlayer} macht {partner} ein ehrliches Kompliment, {partner} macht {partner2} eines und {partner2} schließt die Kette mit einem Kompliment an {activePlayer}.', '{activePlayer} gives {partner} a genuine compliment, {partner} gives one to {partner2}, and {partner2} closes the chain by complimenting {activePlayer}.', { cooperative: true, partnerCount: 2, title: { de: 'Die Komplimentkette', en: 'The Compliment Chain' } }),
  challenge('coop-human-compass', '{activePlayer}, {partner} und {partner2}: Wählt gemeinsam Norden, Osten und Westen im Raum. Auf Kommando zeigt jede Person gleichzeitig in eine andere vereinbarte Richtung.', '{activePlayer}, {partner}, and {partner2}: Agree where north, east, and west are in the room. On command, each points simultaneously in a different agreed direction.', { cooperative: true, partnerCount: 2, title: { de: 'Der dreiköpfige Kompass', en: 'The Three-Headed Compass' } }),
  challenge('coop-mini-orchestra', '{activePlayer}, {partner} und {partner2}: Spielt fünfzehn Sekunden als Mini-Bordorchester. Eine Person summt, eine klopft mit zwei Fingern den Takt und eine macht leise Windgeräusche.', '{activePlayer}, {partner}, and {partner2}: Perform for fifteen seconds as a tiny deck orchestra. One hums, one taps the beat with two fingers, and one makes quiet wind sounds.', { cooperative: true, partnerCount: 2, durationSeconds: 15, title: { de: 'Das Mini-Bordorchester', en: 'The Tiny Deck Orchestra' } }),
  ...LONG_COURSE_CHALLENGES
]);

export function validateEventCatalog() {
  const events = EVENT_DECKS.flat();
  const ids = new Set(events.map((event) => event.id));
  const titlesDe = new Set(events.map((event) => event.title.de));
  const titlesEn = new Set(events.map((event) => event.title.en));
  const storiesDe = new Set(events.map((event) => event.story.de));
  const storiesEn = new Set(events.map((event) => event.story.en));
  const stageCounts = Object.fromEntries(EVENT_STAGES.map((stage) => [stage, events.filter((event) => event.stage === stage).length]));
  return {
    total: events.length,
    uniqueIds: ids.size,
    uniqueGermanTitles: titlesDe.size,
    uniqueEnglishTitles: titlesEn.size,
    uniqueGermanStories: storiesDe.size,
    uniqueEnglishStories: storiesEn.size,
    stageCounts,
    valid: ids.size === events.length && titlesDe.size === events.length && titlesEn.size === events.length && storiesDe.size === events.length && storiesEn.size === events.length && EVENT_STAGES.every((stage) => stageCounts[stage] > 0)
  };
}
