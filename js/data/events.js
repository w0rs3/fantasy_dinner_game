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
      de: 'Eine versiegelte Vorratskiste trägt zwei Zeichen. Die Crew darf beraten; die aktive Person entscheidet, wie der Speiseplan weiterwächst.',
      en: 'A sealed provision crate bears two marks. The crew may discuss them; the active player decides how the menu develops.'
    },
    mechanics: ['discoverIngredient', 'lockIngredient']
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
      de: 'Eine bereits entdeckte Zutat wird noch einmal geprüft. Jetzt kann sie ausgetauscht oder verbindlich in den Gang aufgenommen werden.',
      en: 'A discovered ingredient is examined once more. It can now be exchanged or committed to the course.'
    },
    mechanics: ['swapIngredient', 'lockIngredient']
  },
  {
    id: 'chart', stage: 'ingredients', type: 'choice',
    title: { de: 'Die Speisekarte aus {location}', en: 'The Menu Chart from {location}' },
    scene: {
      de: 'Auf einer alten Karte sind zwei sinnvolle Wege markiert: den Vorrat erweitern oder eine gefundene Zutat endgültig sichern.',
      en: 'An old chart marks two sensible routes: expand the provisions or secure a discovered ingredient for good.'
    },
    mechanics: ['discoverIngredient', 'lockIngredient']
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
      de: 'Während Küchenarbeit oder Timer laufen, kann die Crew gemeinsam handeln oder sich für parallele Wege aufteilen.',
      en: 'While kitchen work or timers continue, the crew can act together or split across parallel routes.'
    },
    mechanics: ['watchChallenge', 'splitCrew']
  },
  {
    id: 'cache', stage: 'cooking', type: 'dice',
    title: { de: 'Das Versteck von {location}', en: 'The Cache of {location}' },
    scene: {
      de: 'Zwischen zwei Arbeitsschritten entdeckt die Crew ein Zeichen. Der Würfel führt zu einer kurzen Bordwache oder einem Schatz.',
      en: 'Between two kitchen steps the crew spots a sign. The die leads to a short deck duty or treasure.'
    },
    mechanics: ['watchChallenge', 'treasure', 'treasureAndWatch']
  },
  {
    id: 'interlude', stage: 'cooking', type: 'choice',
    title: { de: 'Eine seltsame Begegnung in {location}', en: 'A Strange Encounter at {location}' },
    scene: {
      de: 'Für einen Moment geht es nicht um den nächsten Arbeitsschritt. Eine kleine Begegnung, ein geheimer Auftrag oder etwas Glück lockert die Reise auf.',
      en: 'For a moment, the next kitchen step does not matter. A small encounter, a secret mission, or a little luck loosens up the voyage.'
    },
    mechanics: ['watchChallenge', 'storyMoment']
  },
  {
    id: 'fortune', stage: 'cooking', type: 'dice',
    title: { de: 'Das Münzorakel von {location}', en: 'The Coin Oracle of {location}' },
    scene: {
      de: 'Eine alte Münze springt über den Tisch. Manchmal bringt sie Beute, manchmal fordert die See ihren Anteil – und manchmal nur eine alberne Prüfung.',
      en: 'An old coin skips across the table. Sometimes it brings loot, sometimes the sea takes its share, and sometimes it merely demands a silly test.'
    },
    mechanics: ['coinLoss', 'watchChallengeAlt', 'treasure']
  },
  {
    id: 'respite', stage: 'cooking', type: 'choice',
    title: { de: 'Ruhiges Fahrwasser bei {location}', en: 'Calm Waters near {location}' },
    scene: {
      de: 'Die See wird still. Die Crew darf bewusst fünf Minuten durchatmen oder die freie Zeit für eine kurze Herausforderung nutzen.',
      en: 'The sea turns calm. The crew may deliberately take a five-minute breather or use the free time for a short challenge.'
    },
    mechanics: ['fiveMinuteBreak', 'watchChallenge']
  },
  {
    id: 'mischief', stage: 'cooking', type: 'dice',
    title: { de: 'Schabernack in {location}', en: 'Mischief at {location}' },
    scene: {
      de: 'Irgendjemand an Bord grinst verdächtig. Der Würfel entscheidet, ob daraus eine geheime Rolle, eine schnelle Aktion oder ein kleiner Münzfund wird.',
      en: 'Someone aboard is grinning suspiciously. The die decides whether it becomes a secret role, a quick action, or a small coin find.'
    },
    mechanics: ['watchChallenge', 'watchChallengeAlt', 'treasureAndWatch']
  }
]);

function interpolate(value, location) {
  return {
    de: value.de.replace('{location}', location.de),
    en: value.en.replace('{location}', location.en)
  };
}

export function buildEventDeck(chapterIndex) {
  const chapter = CHAPTERS[chapterIndex];
  return chapter.locations.flatMap((location, locationIndex) =>
    ARCHETYPES.map((archetype, archetypeIndex) => {
      const number = locationIndex * ARCHETYPES.length + archetypeIndex + 1;
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
        variant: locationIndex
      };
    })
  );
}

export const EVENT_DECKS = Object.freeze(CHAPTERS.map((_, index) => buildEventDeck(index)));

export const EFFECT_TEXT = Object.freeze({
  drawTask: { de: 'Übernehmt den nächsten sinnvollen Küchenauftrag mit der vorgesehenen Mindestbesetzung.', en: 'Take the next feasible kitchen job with its planned minimum crew.' },
  teamTask: { de: 'Übernehmt den nächsten Küchenauftrag mit einer zusätzlichen helfenden Person.', en: 'Take the next kitchen job with one additional helper.' },
  treasureAndTask: { de: 'Gewinnt Münzen und übernehmt anschließend den nächsten Küchenauftrag.', en: 'Gain coins, then take the next kitchen job.' },
  discoverIngredient: { de: 'Öffnet dieses Vorratsereignis und wählt eine der angebotenen Zutaten.', en: 'Open this provision event and choose one of the offered ingredients.' },
  treasureAndIngredient: { de: 'Gewinnt Münzen und wählt danach eine neue Zutat.', en: 'Gain coins, then choose a new ingredient.' },
  lockIngredient: { de: 'Legt die zuletzt entdeckte, noch veränderbare Zutat verbindlich für diesen Gang fest.', en: 'Lock the most recently discovered, still changeable ingredient into this course.' },
  swapIngredient: { de: 'Tauscht die zuletzt entdeckte, noch nicht festgelegte Zutat gegen eine passende Alternative.', en: 'Swap the most recently discovered, unlocked ingredient for a suitable alternative.' },
  watchChallenge: { de: 'Wählt die erste kurze Bordaufgabe und führt sie sofort aus.', en: 'Choose the first short deck duty and do it now.' },
  watchChallengeAlt: { de: 'Wählt die zweite kurze Bordaufgabe und führt sie sofort aus.', en: 'Choose the second short deck duty and do it now.' },
  treasureAndWatch: { de: 'Gewinnt Münzen und erledigt danach eine kurze Challenge.', en: 'Gain coins, then complete a short challenge.' },
  treasureAndChain: { de: 'Gewinnt Münzen und deckt sofort eine weitere Ereigniskarte auf.', en: 'Gain coins and immediately reveal another event.' },
  splitCrew: { de: 'Teilt die Crew möglichst gleichmäßig in zwei Gruppen.', en: 'Split the crew into two groups as evenly as possible.' },
  chain: { de: 'Deckt sofort eine weitere Ereigniskarte auf.', en: 'Immediately reveal another event card.' },
  treasure: { de: 'Gewinnt fünf Münzen.', en: 'Gain five coins.' },
  coinLoss: { de: 'Die Bordkasse verliert drei Münzen.', en: 'The ship’s purse loses three coins.' },
  storyMoment: { de: 'Genießt diesen kleinen Storymoment – er hat keine weitere Auswirkung.', en: 'Enjoy this small story moment — it has no further effect.' },
  fiveMinuteBreak: { de: 'Startet eine echte fünfminütige Pause für die ganze Crew.', en: 'Start a real five-minute break for the whole crew.' },
  singleTask: { de: 'Übernehmt den nächsten geeigneten Auftrag mit möglichst kleiner Besetzung.', en: 'Take the next suitable job with the smallest practical crew.' },
  watchComplete: { de: 'Die Bordaufgabe ist erledigt; die laufende Küchenzeit wurde sinnvoll genutzt.', en: 'The deck duty is complete; the running kitchen time was used productively.' }
});

const challenge = (id, de, en, options = {}) => ({
  id, de, en, title: options.title ?? { de: 'Kurze Challenge', en: 'Quick challenge' },
  minutes: options.minutes ?? 1, coins: options.coins ?? 2, secret: options.secret ?? false,
  followUpId: options.followUpId ?? null
});

export const WATCH_CHALLENGES = Object.freeze([
  challenge('clear-surface', 'Räumt gemeinsam eine Arbeitsfläche vollständig frei und wischt sie sauber.', 'Clear one work surface completely and wipe it clean together.'),
  challenge('next-steps', 'Prüft alle laufenden Aufgaben und nennt laut, was als Nächstes gebraucht wird.', 'Review every active task and say aloud what will be needed next.'),
  challenge('fresh-water', 'Stellt für jedes Crewmitglied frisches Wasser bereit.', 'Set out fresh water for every crew member.'),
  challenge('sort-tools', 'Sortiert Messer, Bretter und Schüsseln sicher nach ihrem nächsten Einsatz.', 'Sort knives, boards, and bowls safely for their next use.'),
  challenge('name-course', 'Erfindet in höchstens 60 Sekunden einen Namen für den entstehenden Gang.', 'Invent a name for the emerging course in no more than 60 seconds.'),
  challenge('ingredient-round', 'Nennt reihum je eine Zutat, die heute bereits sinnvoll verwendet wurde.', 'Go around once and name one ingredient already used well tonight.'),
  challenge('table-check', 'Prüft den Tisch: Fehlt Besteck, Wasser, ein Untersetzer oder Platz zum Servieren?', 'Check the table: is cutlery, water, a trivet, or serving space missing?'),
  challenge('collect-waste', 'Sammelt Verpackungen und Abfälle ein, ohne laufende Arbeitswege zu blockieren.', 'Collect packaging and waste without blocking active work routes.'),
  challenge('portion-captain', 'Bestimmt eine Person, die beim nächsten Servieren Portionsgrößen kontrolliert.', 'Choose one person to check portion sizes at the next serving.'),
  challenge('timer-check', 'Schaut auf alle Challenges und wiederholt gemeinsam die nächste Warnschwelle.', 'Look at every challenge and repeat the next alert threshold together.'),
  challenge('sea-story', 'Gebt {activePlayer} 60 Sekunden für eine kurze Seefahrergeschichte.', 'Give {activePlayer} 60 seconds for a short seafaring story.'),
  challenge('safety-check', 'Kontrolliert, dass heiße, scharfe und rohe Arbeitsbereiche klar getrennt sind.', 'Confirm that hot, sharp, and raw-food work areas are clearly separated.'),
  challenge('odd-dance', 'Steh auf und tanze 20 Sekunden so merkwürdig wie möglich. Danach geht das Spiel normal weiter.', 'Stand up and dance as strangely as possible for 20 seconds. Then continue normally.', { coins: 3, title: { de: 'Tanz auf Deck', en: 'Deck Dance' } }),
  challenge('table-lap', 'Steh auf, geh einmal um den Tisch und setz dich wieder hin, als wäre nichts passiert.', 'Stand up, walk once around the table, and sit down again as though nothing happened.', { title: { de: 'Geheimer Rundgang', en: 'Secret Circuit' }, secret: true }),
  challenge('compliments', 'Bis zu deinem nächsten Zug machst du der jeweils aktiven Person ein ehrliches, kurzes Kompliment.', 'Until your next turn, give the active player one brief, genuine compliment.', { coins: 3, title: { de: 'Nur für deine Augen', en: 'For Your Eyes Only' }, secret: true }),
  challenge('love-decisions', 'Bis zu deinem nächsten Zug findest du jede Entscheidung deiner Crew großartig. Übertreib freundlich, aber verrate die Karte nicht.', 'Until your next turn, you think every crew decision is wonderful. Exaggerate kindly, but do not reveal the card.', { coins: 3, title: { de: 'Nur für deine Augen', en: 'For Your Eyes Only' }, secret: true }),
  challenge('laugh-turn', 'In {targetPlayer}s nächstem Zug findest du alles erstaunlich lustig. Bleib freundlich und löse die Karte danach auf.', 'During {targetPlayer}’s next turn, find everything remarkably funny. Stay kind and end the bit afterwards.', { coins: 3, title: { de: 'Geheimes Lachen', en: 'Secret Laughter' }, secret: true }),
  challenge('chicken', 'Gackere einmal pro Minute leise wie ein Huhn. Verrate nicht warum und mache weiter, bis eine andere Person dich ausdrücklich erlöst.', 'Cluck quietly like a chicken once per minute. Do not say why and continue until another person explicitly releases you.', { coins: 3, title: { de: 'Der Hühnerfluch', en: 'The Chicken Curse' }, secret: true, followUpId: 'stop-chicken' }),
  challenge('stop-chicken', 'Sage {targetPlayer} irgendwann in diesem Zug: „Der Hühnerfluch ist gebrochen.“ Erklärt euch erst danach gegenseitig die Karten.', 'At some point this turn, tell {targetPlayer}: “The chicken curse is broken.” Only then explain the cards to each other.', { coins: 2, title: { de: 'Das Gegenmittel', en: 'The Antidote' }, secret: true }),
  challenge('five-minute-break', 'Fünf Minuten Pause: Trinkt etwas, setzt euch hin und lasst die Küche sicher ruhen. Laufende Geräte bleiben natürlich beaufsichtigt.', 'Five-minute break: have a drink, sit down, and let the kitchen rest safely. Running appliances must of course remain supervised.', { minutes: 5, coins: 0, title: { de: 'Ruhiges Fahrwasser', en: 'Calm Waters' } })
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
    valid: events.length === 504 && ids.size === 504 && titlesDe.size === 504 && titlesEn.size === 504 && storiesDe.size === 504 && storiesEn.size === 504 && EVENT_STAGES.every((stage) => stageCounts[stage] > 0)
  };
}
