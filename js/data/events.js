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
    mechanics: ['coinLoss', 'treasure', 'treasureAndChain']
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
    mechanics: ['coinLoss', 'treasureAndChain', 'treasure']
  },
  {
    id: 'respite', stage: 'cooking', type: 'choice',
    title: { de: 'Ruhiges Fahrwasser bei {location}', en: 'Calm Waters near {location}' },
    scene: {
      de: 'Die See wird still. Wenn keine Küchenaufgabe mehr offen ist, darf die Crew fünf Minuten durchatmen; andernfalls findet sie eine kleine Münzbeute.',
      en: 'The sea turns calm. If no kitchen task remains open, the crew may take a five-minute breather; otherwise it finds a small coin reward.'
    },
    mechanics: ['fiveMinuteBreak', 'treasure']
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

const INGREDIENT_FUN_ARCHETYPE = Object.freeze({
  id: 'pantry-mischief', stage: 'ingredients', type: 'choice',
  title: { de: 'Schabernack im Vorrat von {location}', en: 'Pantry Mischief at {location}' },
  scene: {
    de: 'Zwischen den Zutaten versteckt sich eine verspielte Botschaft. Für einen Moment darf die Crew lachen, eine kleine Herausforderung annehmen oder nebenbei ein paar Münzen erspielen.',
    en: 'A playful message is hidden among the ingredients. For a moment, the crew may laugh, take on a small challenge, or earn a few coins along the way.'
  },
  mechanics: ['watchChallenge', 'treasure', 'treasureAndWatch']
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

export function buildEventDeck(chapterIndex) {
  const chapter = CHAPTERS[chapterIndex];
  const regularEvents = chapter.locations.flatMap((location, locationIndex) =>
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
  const taskFunEvents = chapter.locations.flatMap((location, locationIndex) => {
    const variants = locationIndex === 0
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
  return [...regularEvents, ...ingredientFunEvents, ...taskFunEvents];
}

export const EVENT_DECKS = Object.freeze(CHAPTERS.map((_, index) => buildEventDeck(index)));

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
  treasureAndChain: { de: 'Gewinnt Münzen und deckt sofort eine weitere Ereigniskarte auf.', en: 'Gain coins and immediately reveal another event.' },
  chain: { de: 'Deckt sofort eine weitere Ereigniskarte auf.', en: 'Immediately reveal another event card.' },
  treasure: { de: 'Gewinnt zwei Münzen.', en: 'Gain two coins.' },
  coinLoss: { de: 'Die Bordkasse verliert fünf Münzen.', en: 'The ship’s purse loses five coins.' },
  fiveMinuteBreak: { de: 'Startet eine echte fünfminütige Pause für die ganze Crew.', en: 'Start a real five-minute break for the whole crew.' },
  singleTask: { de: 'Übernehmt den nächsten geeigneten Auftrag mit möglichst kleiner Besetzung.', en: 'Take the next suitable job with the smallest practical crew.' },
  watchComplete: { de: 'Die Bordaufgabe ist erledigt; die laufende Küchenzeit wurde sinnvoll genutzt.', en: 'The deck duty is complete; the running kitchen time was used productively.' },
  watchActive: { de: 'Die Challenge läuft über weitere Züge und blockiert die Übergabe nicht.', en: 'The challenge continues across later turns without blocking handover.' },
  quietHandover: { de: 'Die Wache wechselt, damit der nächste fachlich mögliche Auftrag an eine andere freie Person gehen kann.', en: 'The watch changes so the next feasible job can go to another free player.' }
});

const challenge = (id, de, en, options = {}) => ({
  id, de, en, title: options.title ?? { de: 'Kurze Challenge', en: 'Quick challenge' },
  minutes: options.minutes ?? 1,
  coins: options.coins === 0 ? 0 : Math.max(1, Math.ceil((options.coins ?? 2) / 3)),
  secret: options.secret ?? false,
  followUpId: options.followUpId ?? null, flow: options.flow ?? 'immediate',
  endTrigger: options.endTrigger ?? null, mandatory: options.mandatory ?? false,
  playerSelection: options.playerSelection ?? false,
  followUpOnly: options.followUpOnly ?? false,
  requirements: options.requirements ?? []
});

export const WATCH_CHALLENGES = Object.freeze([
  challenge('clear-surface', 'Die aktive Person erfindet in 60 Sekunden einen Piratennamen für eine sichtbare, gerade freie Ablagefläche. Niemand unterbricht dafür die Küchenarbeit oder räumt etwas um.', 'The active player has 60 seconds to invent a pirate name for a visible, currently unused surface. Nobody interrupts kitchen work or moves anything for it.', { title: { de: 'Die geheime Schatzablage', en: 'The Secret Treasure Shelf' } }),
  challenge('next-steps', 'Prüft alle laufenden Aufgaben und nennt laut, was als Nächstes gebraucht wird.', 'Review every active task and say aloud what will be needed next.', { requirements: ['openTask'], title: { de: 'Der Blick voraus', en: 'A Look Ahead' } }),
  challenge('fresh-water', 'Stellt für jedes Crewmitglied frisches Wasser bereit.', 'Set out fresh water for every crew member.', { title: { de: 'Wasser für die Mannschaft', en: 'Water for the Crew' } }),
  challenge('sort-tools', 'Die aktive Person erfindet in 60 Sekunden für drei sichtbare Küchenwerkzeuge je einen Piratennamen. Fasst nichts an, was gerade benutzt wird, und unterbrecht keine Küchenarbeit.', 'The active player has 60 seconds to invent a pirate name for each of three visible kitchen tools. Do not touch anything currently in use or interrupt kitchen work.', { title: { de: 'Die Taufe der Kombüsenwerkzeuge', en: 'Naming the Galley Tools' } }),
  challenge('name-course', 'Erfindet in höchstens 60 Sekunden einen Namen für den entstehenden Gang.', 'Invent a name for the emerging course in no more than 60 seconds.', { title: { de: 'Die Taufe des Gangs', en: 'Naming the Course' } }),
  challenge('ingredient-round', 'Nennt reihum jeweils eine andere Zutat, die heute bereits sinnvoll verwendet wurde. Jede Person nennt genau eine.', 'Go around once and have each player name a different ingredient already used well tonight. Every player names exactly one.', { requirements: ['usedIngredientPerPlayer'], title: { de: 'Die Erinnerungskette', en: 'The Ingredient Chain' } }),
  challenge('table-check', 'Prüft den Tisch: Fehlt Besteck, Wasser, ein Untersetzer oder Platz zum Servieren?', 'Check the table: is cutlery, water, a trivet, or serving space missing?', { title: { de: 'Klar Schiff am Tisch', en: 'Clear the Table Deck' } }),
  challenge('collect-waste', 'Sammelt Verpackungen und Abfälle ein, ohne laufende Arbeitswege zu blockieren.', 'Collect packaging and waste without blocking active work routes.', { title: { de: 'Die Bilge wird leer', en: 'Emptying the Bilge' } }),
  challenge('portion-captain', 'Bestimmt eine Person, die beim nächsten Servieren Portionsgrößen kontrolliert.', 'Choose one person to check portion sizes at the next serving.', { requirements: ['courseWorkStarted'], playerSelection: true, title: { de: 'Die Portionswache', en: 'The Portion Lookout' } }),
  challenge('timer-check', 'Schaut auf alle laufenden Aufgaben-Timer. Nennt gemeinsam, welche Aufgabe als Nächstes endet oder bereits in der Überlänge ist.', 'Check every running task timer. Together, identify which task finishes next or is already in overtime.', { requirements: ['taskTimerRunning'], title: { de: 'Sanduhren im Blick', en: 'Eyes on the Hourglasses' } }),
  challenge('sea-story', 'Gebt {activePlayer} 60 Sekunden für eine kurze Seefahrergeschichte.', 'Give {activePlayer} 60 seconds for a short seafaring story.', { title: { de: 'Eine Runde Seemannsgarn', en: 'A Tale from the Sea' } }),
  challenge('pirate-verse', 'Erfindet in höchstens 90 Sekunden ein kurzes Piratenlied oder Piratengedicht mit mindestens zwei Zeilen. Singt es gemeinsam oder tragt es dramatisch vor – beides zählt vollständig.', 'In no more than 90 seconds, invent a short pirate song or pirate poem of at least two lines. Sing it together or perform it dramatically — either counts in full.', { minutes: 2, coins: 3, title: { de: 'Die Ballade der wilden Kombüse', en: 'Ballad of the Wild Galley' } }),
  challenge('safety-check', 'Kontrolliert, dass heiße, scharfe und rohe Arbeitsbereiche klar getrennt sind.', 'Confirm that hot, sharp, and raw-food work areas are clearly separated.', { requirements: ['hazardousTaskOpen'], title: { de: 'Die sichere Kombüse', en: 'The Safe Galley' } }),
  challenge('odd-dance', 'Steh auf und tanze 20 Sekunden so merkwürdig wie möglich. Danach geht das Spiel normal weiter.', 'Stand up and dance as strangely as possible for 20 seconds. Then continue normally.', { coins: 3, title: { de: 'Tanz auf Deck', en: 'Deck Dance' }, secret: true }),
  challenge('table-lap', 'Steh auf, geh einmal um den Tisch und setz dich wieder hin, als wäre nichts passiert.', 'Stand up, walk once around the table, and sit down again as though nothing happened.', { title: { de: 'Geheimer Rundgang', en: 'Secret Circuit' }, secret: true }),
  challenge('compliments', 'Bis zu deinem nächsten Zug machst du der jeweils aktiven Person ein ehrliches, kurzes Kompliment.', 'Until your next turn, give the active player one brief, genuine compliment.', { coins: 3, title: { de: 'Rückenwind für die Crew', en: 'A Tailwind for the Crew' }, secret: true, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('love-decisions', 'Bis zu deinem nächsten Zug findest du jede Entscheidung deiner Crew großartig. Übertreib freundlich, aber verrate die Karte nicht.', 'Until your next turn, you think every crew decision is wonderful. Exaggerate kindly, but do not reveal the card.', { coins: 3, title: { de: 'Begeisterung an Bord', en: 'Delight Aboard' }, secret: true, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('laugh-turn', 'In {targetPlayer}s nächstem Zug findest du alles erstaunlich lustig. Bleib freundlich und löse die Karte danach auf.', 'During {targetPlayer}’s next turn, find everything remarkably funny. Stay kind and end the bit afterwards.', { coins: 3, title: { de: 'Geheimes Lachen', en: 'Secret Laughter' }, secret: true, flow: 'ongoing', endTrigger: 'targetTurnEnd' }),
  challenge('chicken', 'Gackere einmal pro Minute leise wie ein Huhn. Verrate nicht warum und mache weiter, bis eine andere Person dich ausdrücklich erlöst.', 'Cluck quietly like a chicken once per minute. Do not say why and continue until another person explicitly releases you.', { coins: 3, title: { de: 'Der Hühnerfluch', en: 'The Chicken Curse' }, secret: true, followUpId: 'stop-chicken', flow: 'ongoing', endTrigger: 'followUp' }),
  challenge('stop-chicken', 'Verbindliche Anweisung: Sage jetzt zu {targetPlayer}: „Der Hühnerfluch ist gebrochen.“ Erklärt euch erst danach gegenseitig die Karten.', 'Mandatory instruction: Tell {targetPlayer} now: “The chicken curse is broken.” Only then explain the cards to each other.', { coins: 2, title: { de: 'Das Gegenmittel', en: 'The Antidote' }, secret: true, mandatory: true, followUpOnly: true }),
  challenge('nose-voice', 'Halte dir beim Reden sanft die Nase zu. Verrate nicht warum und mache weiter, bis eine andere Person dich ausdrücklich erlöst.', 'Gently hold your nose while speaking. Do not say why and continue until another person explicitly releases you.', { coins: 3, title: { de: 'Die verschnupfte Freibeuterin', en: 'The Snuffly Buccaneer' }, secret: true, followUpId: 'stop-nose', flow: 'ongoing', endTrigger: 'followUp' }),
  challenge('stop-nose', 'Verbindliche Anweisung: Sage jetzt zu {targetPlayer}: „Du kannst wieder frei sprechen.“ Verratet erst danach, was auf euren Karten stand.', 'Mandatory instruction: Tell {targetPlayer} now: “You may speak freely again.” Only then reveal what your cards said.', { coins: 2, title: { de: 'Freie Nase voraus', en: 'Clear Air Ahead' }, secret: true, mandatory: true, followUpOnly: true }),
  challenge('impatient-fingers', 'Tippe bis zu deinem nächsten Zug immer wieder ungeduldig mit den Fingern auf den Tisch, als hättest du großen Zeitdruck. Verrate nicht warum.', 'Until your next turn, drum your fingers impatiently on the table as though time were running out. Do not reveal why.', { coins: 3, title: { de: 'Die ungeduldige Wache', en: 'The Impatient Watch' }, secret: true, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('three-hops', 'Steh auf und hüpf dreimal auf der Stelle, wenn das für dich sicher ist. Alternativ wippst du dreimal übertrieben auf den Zehenspitzen. Setz dich danach kommentarlos wieder hin.', 'Stand and hop three times in place if that is safe for you. Otherwise rise dramatically onto your toes three times. Sit down again without comment.', { title: { de: 'Dreifacher Seegang', en: 'Triple Sea Legs' }, secret: true }),
  challenge('under-table-search', 'Schau auffällig unter den Tisch, als hättest du dort etwas Wichtiges verloren. Krabble nicht und blockiere keine Laufwege. Setz dich danach wieder hin, ohne etwas zu erklären.', 'Look conspicuously under the table as though you lost something important there. Do not crawl or block walkways. Sit back down without explaining.', { title: { de: 'Unter Deck gesucht', en: 'Search Below Deck' }, secret: true }),
  challenge('soap-opera-pirate', 'Spiele bis zu deinem nächsten Zug eine völlig überdramatische Figur aus einer Piraten-Seifenoper. Seufze bedeutungsvoll und reagiere theatralisch, ohne eine reale Person oder Gruppe nachzuahmen.', 'Until your next turn, play an outrageously dramatic character from a pirate soap opera. Sigh meaningfully and react theatrically without imitating a real person or group.', { coins: 3, title: { de: 'Piraten-Seifenoper', en: 'Pirate Soap Opera' }, secret: true, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('accent-shift', 'Sprich bis zu deinem nächsten Zug in einem freundlichen Dialekt oder Fantasieakzent, den du gut kannst – zum Beispiel kölsch oder sächsisch. Karikiere keine Person oder Herkunft.', 'Until your next turn, use a friendly regional or invented accent you know well. Do not caricature any person or background.', { coins: 3, title: { de: 'Neue Stimme an Bord', en: 'A New Voice Aboard' }, secret: true, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('self-compliments', 'Mach dir bis zu deinem nächsten Zug bei passenden Gelegenheiten kurze, völlig übertriebene Komplimente. Verrate nicht, warum du heute so begeistert von dir bist.', 'Until your next turn, give yourself brief, wildly exaggerated compliments whenever an opportunity appears. Do not reveal why you are so impressed with yourself.', { coins: 3, title: { de: 'Eigenlob mit Rückenwind', en: 'Self-Praise with Tailwind' }, secret: true, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('aye-aye-sentences', 'Beginne bis zum Beginn deines nächsten Zuges jeden gesprochenen Satz mit „Ai, ai“. Verrate nicht, warum du das tust.', 'Until the start of your next turn, begin every spoken sentence with “Aye, aye”. Do not reveal why you are doing it.', { coins: 3, title: { de: 'Ai, ai vorweg', en: 'Aye, Aye First' }, secret: true, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('arr-sentences', 'Beende bis zum Beginn deines nächsten Zuges jeden gesprochenen Satz mit einem deutlichen „Arr“. Verrate nicht, warum du das tust.', 'Until the start of your next turn, end every spoken sentence with a clear “Arr”. Do not reveal why you are doing it.', { coins: 3, title: { de: 'Arr zum Schluss', en: 'Arr at the End' }, secret: true, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('captain-permission', 'Ernenne {targetPlayer} innerlich zum Kapitän. Bis zum Beginn deines nächsten Zuges musst du vor jeder eigenen Entscheidung oder Aktion höflich um Erlaubnis bitten. Erkläre die Karte nicht.', 'Silently appoint {targetPlayer} as captain. Until the start of your next turn, politely ask the captain for permission before each decision or action of your own. Do not explain the card.', { coins: 4, title: { de: 'Befehl des Kapitäns', en: 'Captain’s Orders' }, secret: true, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('self-talk', 'Führe 20 Sekunden lang ein ernstes Gespräch mit dir selbst und beantworte dabei deine eigenen Fragen. Mach danach kommentarlos weiter.', 'Hold a serious 20-second conversation with yourself and answer your own questions. Then continue without comment.', { title: { de: 'Zwiegespräch an Deck', en: 'A Talk with Yourself' }, secret: true }),
  challenge('bad-joke', 'Erzähle der Crew einen absichtlich richtig schlechten, harmlosen Witz. Erkläre nicht, warum du ihn plötzlich erzählen musstest.', 'Tell the crew an intentionally terrible, harmless joke. Do not explain why you suddenly had to tell it.', { title: { de: 'Flachwitz aus der Bilge', en: 'A Joke from the Bilge' }, secret: true }),
  challenge('hiccups', 'Simuliere bis zu deinem nächsten Zug gelegentlich einen harmlosen Schluckauf. Übertreib nicht so stark, dass Gespräche oder Küchenarbeit gestört werden.', 'Until your next turn, occasionally pretend to hiccup. Do not overdo it enough to disrupt conversation or kitchen work.', { coins: 3, title: { de: 'Schluckauf auf See', en: 'Hiccups at Sea' }, secret: true, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('mime-self-slap', 'Spiele pantomimisch und mit deutlichem Abstand eine dramatische Backpfeife gegen dich selbst. Berühre oder schlage dich dabei nicht wirklich.', 'Mime a dramatic self-slap while keeping a clear distance. Do not actually touch or hit yourself.', { title: { de: 'Dramatische Erkenntnis', en: 'Dramatic Realisation' }, secret: true }),
  challenge('hand-trumpet', 'Simuliere einen richtig lauten Pfurz, indem du in deine Hand pustest wie in eine Trompete. Bleib danach völlig ernst.', 'Simulate a very loud fart by blowing into your hand like a trumpet. Keep a completely straight face afterwards.', { title: { de: 'Die Nebelhornprobe', en: 'The Foghorn Test' }, secret: true }),
  challenge('chair-circle', 'Dreh dich sicher einmal mit einem geeigneten Drehstuhl im Kreis. Falls der Stuhl nicht dafür geeignet ist, steh auf und geh einmal um ihn herum.', 'Safely spin once in a suitable swivel chair. If the chair is not suitable, stand and walk around it once instead.', { title: { de: 'Einmal rund um die Insel', en: 'Once Around the Island' }, secret: true }),
  challenge('ceremonial-greeting', 'Bestehe freundlich darauf, deinen Sitznachbarn feierlich zu begrüßen. Die andere Person wählt zwischen Handschlag, Faustgruß oder Winken.', 'Politely insist on ceremonially greeting the person beside you. They choose between a handshake, fist bump, or wave.', { title: { de: 'Feierlicher Matrosengruß', en: 'Ceremonial Sailor Greeting' }, secret: true }),
  challenge('folded-note', 'Nimm einen Zettel und schreibe: „Nicht sagen, was hier draufsteht.“ Falte ihn und gib ihn einer beliebigen Person. Erkläre nichts weiter.', 'Take a note and write: “Do not say what is written here.” Fold it and hand it to any player. Explain nothing further.', { title: { de: 'Die streng geheime Nachricht', en: 'The Highly Secret Note' }, secret: true }),
  challenge('captain-pose', 'Steh auf und nimm zehn Sekunden lang deine überzeugendste Kapitänspose ein. Setz dich danach wortlos wieder hin.', 'Stand and hold your most convincing captain’s pose for ten seconds. Then sit down again without a word.', { title: { de: 'Die Pose des Kapitäns', en: 'The Captain’s Pose' }, secret: true }),
  challenge('invisible-parrot', 'Begrüße einen unsichtbaren Papagei auf deiner Schulter und frage ihn leise nach seiner Meinung. Erkläre der Crew nichts.', 'Greet an invisible parrot on your shoulder and quietly ask for its opinion. Explain nothing to the crew.', { title: { de: 'Der unsichtbare Papagei', en: 'The Invisible Parrot' }, secret: true }),
  challenge('pirate-weather', 'Gib der Crew einen 20-sekündigen Wetterbericht für die aktuelle Piratenreise. Mindestens Wind, Wellen und die Aussicht auf Beute müssen vorkommen.', 'Give the crew a 20-second weather report for the current pirate voyage. Mention wind, waves, and the chance of treasure.', { title: { de: 'Wetterbericht von hoher See', en: 'High-Seas Weather Report' } }),
  challenge('royal-toast', 'Erhebe dein Getränk und bringe einen kurzen, dramatischen Trinkspruch auf die Crew aus. Ein Glas Wasser zählt genauso.', 'Raise your drink and make a short dramatic toast to the crew. A glass of water counts just as well.', { title: { de: 'Der große Crew-Trinkspruch', en: 'The Grand Crew Toast' } }),
  challenge('forbidden-yes', 'Vermeide bis zu deinem nächsten Zug das Wort „ja“. Falls es dir herausrutscht, tu so, als wäre nichts gewesen. Verrate die Karte nicht.', 'Avoid the word “yes” until your next turn. If it slips out, act as though nothing happened. Do not reveal the card.', { coins: 3, title: { de: 'Das verbotene Ja', en: 'The Forbidden Yes' }, secret: true, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('dramatic-whisper', 'Sprich deinen nächsten vollständigen Satz in einem verschwörerischen Flüsterton. Danach redest du wieder normal und erklärst nichts.', 'Speak your next full sentence in a conspiratorial whisper. Then return to normal and explain nothing.', { title: { de: 'Das Flüstern aus der Kajüte', en: 'The Cabin Whisper' }, secret: true }),
  challenge('imaginary-rope', 'Zieh zehn Sekunden lang pantomimisch an einem schweren unsichtbaren Tau. Bleib dabei sicher an deinem Platz.', 'Mime pulling a heavy invisible rope for ten seconds. Stay safely in your place while doing it.', { title: { de: 'Das unsichtbare Tau', en: 'The Invisible Rope' }, secret: true }),
  challenge('tiny-telescope', 'Forme mit den Händen ein Fernrohr und suche fünf Sekunden lang den Raum nach einer fernen Insel ab.', 'Make a telescope with your hands and scan the room for a distant island for five seconds.', { title: { de: 'Land in Sicht', en: 'Land Ahoy' }, secret: true }),
  challenge('course-riddle', 'Erfinde ein kurzes, leicht lösbares Rätsel über eine Zutat oder ein Küchengerät. Die Crew darf genau dreimal raten.', 'Invent a short, easy riddle about an ingredient or kitchen tool. The crew gets exactly three guesses.', { title: { de: 'Das Rätsel der Kombüse', en: 'The Galley Riddle' } }),
  challenge('pirate-oath', 'Lege eine Hand aufs Herz und schwöre feierlich, die Crew sicher bis zum nächsten Gang zu begleiten.', 'Place a hand over your heart and solemnly swear to guide the crew safely to the next course.', { title: { de: 'Der feierliche Piratenschwur', en: 'The Solemn Pirate Oath' } }),
  challenge('table-rhythm', 'Trommle mit zwei Fingern zehn Sekunden lang einen einfachen Rhythmus. Die Crew versucht, ihn einmal gemeinsam nachzumachen.', 'Tap a simple ten-second rhythm with two fingers. The crew tries to repeat it together once.', { title: { de: 'Der Takt der Galeere', en: 'The Galley Beat' } }),
  challenge('statue-lookout', 'Erstarre zehn Sekunden lang wie eine steinerne Galionsfigur und blicke entschlossen in die Ferne.', 'Freeze for ten seconds like a stone figurehead and stare determinedly into the distance.', { title: { de: 'Die lebende Galionsfigur', en: 'The Living Figurehead' }, secret: true }),
  challenge('course-nickname', 'Gebt dem entstehenden Gang gemeinsam einen albernen Piraten-Spitznamen. Die aktive Person entscheidet bei Gleichstand.', 'Give the emerging course a silly pirate nickname together. The active player breaks any tie.', { title: { de: 'Der Spitzname der Beute', en: 'A Nickname for the Loot' } }),
  challenge('one-word-captain', 'Antworte auf die nächste Frage, die dir gestellt wird, nur mit „Kapitän“. Danach sprichst du wieder normal.', 'Answer the next question you are asked using only “Captain”. Then speak normally again.', { title: { de: 'Nur ein Wort: Kapitän', en: 'One Word: Captain' }, secret: true }),
  challenge('sea-legs', 'Schwanke im Sitzen fünf Sekunden ganz leicht, als hätte das Schiff eine kleine Welle erwischt. Achte auf Abstand zu heißen oder scharfen Dingen.', 'Sway very gently while seated for five seconds as though the ship hit a small wave. Keep clear of anything hot or sharp.', { title: { de: 'Eine kleine Welle', en: 'A Little Wave' }, secret: true }),
  challenge('treasure-announcer', 'Kündige den aktuellen Münzstand mit der Stimme eines übertrieben wichtigen königlichen Herolds an.', 'Announce the current coin total in the voice of an absurdly important royal herald.', { title: { de: 'Der Herold der Bordkasse', en: 'Herald of the Ship’s Purse' } }),
  challenge('synchronized-arr', 'Zählt gemeinsam von drei herunter und ruft dann alle gleichzeitig ein möglichst überzeugendes „Arr!“', 'Count down together from three, then everyone gives their most convincing “Arr!” at the same time.', { title: { de: 'Das gemeinsame Arr', en: 'The Crew’s Arr' } }),
  challenge('imaginary-map', 'Breite pantomimisch eine riesige Schatzkarte aus, zeige auf einen erfundenen Ort und nicke bedeutungsvoll.', 'Mime unrolling a huge treasure map, point to an imaginary place, and nod meaningfully.', { title: { de: 'Die Karte ohne Papier', en: 'The Map Without Paper' }, secret: true }),
  challenge('pirate-commercial', 'Erfinde in 20 Sekunden einen übertriebenen Werbespruch für den aktuellen Gang, als wäre er die größte Beute der Welt.', 'In 20 seconds, invent an exaggerated advertisement for the current course as though it were the world’s greatest treasure.', { title: { de: 'Reklame für die Beute', en: 'An Advert for the Loot' } }),
  challenge('friendly-salute', 'Grüße jede Person am Tisch einmal mit einem kleinen, selbst erfundenen Piratengruß, ohne jemanden zu berühren.', 'Give every person at the table a small invented pirate salute without touching anyone.', { title: { de: 'Der Gruß der ganzen Crew', en: 'A Salute for the Whole Crew' } }),
  challenge('compass-north', 'Zeige plötzlich sehr überzeugt in eine beliebige Richtung und verkünde: „Dort ist Norden.“ Erkläre nichts weiter.', 'Suddenly point confidently in any direction and announce, “That way is north.” Explain nothing further.', { title: { de: 'Der zweifelhafte Kompass', en: 'The Questionable Compass' }, secret: true }),
  challenge('imaginary-beard', 'Streiche zehn Sekunden nachdenklich über einen unsichtbaren langen Piratenbart und nicke dabei ernst.', 'Thoughtfully stroke an invisible long pirate beard for ten seconds while nodding seriously.', { title: { de: 'Der Bart des alten Seebären', en: 'The Old Sea Dog’s Beard' }, secret: true }),
  challenge('captain-inspection', 'Mustere den Tisch fünfzehn Sekunden wie ein Kapitän bei einer wichtigen Schiffsinspektion. Berühre und verändere dabei nichts.', 'Inspect the table for fifteen seconds like a captain conducting an important ship inspection. Touch and change nothing.', { title: { de: 'Inspektion an Deck', en: 'Inspection on Deck' }, secret: true }),
  challenge('three-pirate-laughs', 'Führe nacheinander drei unterschiedliche Piratenlacher vor: leise, vornehm und völlig übertrieben.', 'Perform three different pirate laughs in sequence: quiet, refined, and wildly exaggerated.', { title: { de: 'Dreifaches Piratengelächter', en: 'Three Pirate Laughs' } }),
  challenge('cannon-countdown', 'Zählt gemeinsam von fünf herunter. Bei null ruft die aktive Person „Kanone!“, alle anderen machen ein kurzes, leises Explosionsgeräusch.', 'Count down together from five. At zero, the active player calls “Cannon!” and everyone else makes a brief, quiet explosion sound.', { title: { de: 'Die freundliche Bordkanone', en: 'The Friendly Deck Cannon' } }),
  challenge('message-bottle', 'Flüstere einen kurzen freundlichen Satz in eine imaginäre Flasche, verschließe sie pantomimisch und schiebe sie über den Tisch ins Meer.', 'Whisper a short friendly sentence into an imaginary bottle, mime sealing it, and send it across the table into the sea.', { title: { de: 'Post aus der Flasche', en: 'A Message in a Bottle' }, secret: true }),
  challenge('imaginary-gold-test', 'Prüfe eine unsichtbare Goldmünze fachmännisch gegen das Licht und erkläre sie anschließend feierlich für echt.', 'Examine an invisible gold coin expertly against the light, then solemnly declare it genuine.', { title: { de: 'Die Prüfung des Goldstücks', en: 'Testing the Gold Piece' }, secret: true }),
  challenge('invisible-knot', 'Erkläre der Crew mit reinen Handbewegungen, wie man einen völlig erfundenen Seemannsknoten bindet. Echtes Küchenmaterial bleibt liegen.', 'Use only hand gestures to teach the crew a completely invented sailor’s knot. Leave real kitchen items untouched.', { title: { de: 'Der Knoten, den keiner kennt', en: 'The Knot Nobody Knows' } }),
  challenge('gull-call', 'Imitiere einmal kurz und nicht zu laut eine Möwe. Blicke danach empört zur Decke, als wäre das Geräusch von dort gekommen.', 'Briefly imitate a seagull without being too loud. Then glare at the ceiling as though the sound came from there.', { title: { de: 'Die Möwe über der Kombüse', en: 'The Gull Above the Galley' }, secret: true }),
  challenge('chair-ship-name', 'Gib deinem Stuhl einen würdevollen Schiffsnamen und stelle ihn der Crew in einem einzigen Satz vor.', 'Give your chair a dignified ship name and introduce it to the crew in a single sentence.', { title: { de: 'Die Taufe des Sitzschiffs', en: 'Naming the Chair-Ship' } }),
  challenge('sea-monster', 'Beschreibe in zwanzig Sekunden ein freundliches Seeungeheuer, das am liebsten Küchenabfälle frisst und beim Kochen hilft.', 'In twenty seconds, describe a friendly sea monster that loves eating kitchen scraps and helping with cooking.', { title: { de: 'Das freundliche Ungeheuer', en: 'The Friendly Sea Monster' } }),
  challenge('treasure-inventory', 'Wähle drei harmlose sichtbare Gegenstände und führe sie mit übertrieben wertvollen Namen als Teil des Piratenschatzes auf.', 'Choose three harmless visible objects and list them as pirate treasure using extravagantly valuable names.', { title: { de: 'Inventur der kostbaren Beute', en: 'Inventory of Precious Loot' } }),
  challenge('ship-bell', 'Sage zweimal deutlich „Ding-ding“ und verkünde anschließend mit ernster Stimme den Beginn einer neuen Schiffswache.', 'Say “ding-ding” twice, then solemnly announce the beginning of a new ship’s watch.', { title: { de: 'Die unsichtbare Schiffsglocke', en: 'The Invisible Ship’s Bell' }, secret: true }),
  challenge('mast-lookout', 'Steh auf, falls es sicher ist, schirme die Augen mit einer Hand ab und melde kurz, was du am Horizont siehst. Im Sitzen gilt es genauso.', 'Stand if safe, shade your eyes with one hand, and briefly report what you see on the horizon. Doing it seated counts equally.', { title: { de: 'Wache im Krähennest', en: 'Watch in the Crow’s Nest' } }),
  challenge('distant-wave', 'Winke fünf Sekunden freundlich einem weit entfernten erfundenen Schiff zu und warte ernst auf eine Antwort.', 'Wave for five seconds at an imaginary distant ship and wait seriously for a reply.', { title: { de: 'Gruß an das ferne Schiff', en: 'Greeting the Distant Ship' }, secret: true }),
  challenge('cutlery-vote', 'Lasst die Crew per Handzeichen entscheiden, ob Löffel oder Gabel das bessere Piratenwerkzeug ist. Die aktive Person verkündet das Ergebnis.', 'Have the crew vote by show of hands whether a spoon or fork is the better pirate tool. The active player announces the result.', { title: { de: 'Der große Besteckentscheid', en: 'The Great Cutlery Vote' } }),
  challenge('galley-motto', 'Erfindet gemeinsam ein kurzes Motto für eure Kombüse, das mit „Eine Crew, ein …“ beginnt.', 'Invent a short motto for your galley together beginning with “One crew, one …”.', { title: { de: 'Das Motto der Kombüse', en: 'The Galley Motto' } }),
  challenge('pirate-haiku', 'Dichte spontan drei sehr kurze Zeilen über Meer, Essen und Mannschaft. Reime sind ausdrücklich nicht nötig.', 'Improvise three very short lines about sea, food, and crew. Rhymes are explicitly unnecessary.', { title: { de: 'Drei Zeilen auf hoher See', en: 'Three Lines on the High Seas' } }),
  challenge('secret-wink', 'Zwinkere der nächsten Person, die dich direkt ansieht, einmal verschwörerisch zu. Verhalte dich danach wieder völlig normal.', 'Give one conspiratorial wink to the next person who looks directly at you. Then behave completely normally again.', { title: { de: 'Das verschwörerische Zwinkern', en: 'The Conspiratorial Wink' }, secret: true }),
  challenge('slow-motion-reach', 'Führe zehn Sekunden lang pantomimisch in Zeitlupe vor, wie du nach einem weit entfernten Schatz greifst. Greife nicht nach echten Gegenständen.', 'For ten seconds, mime reaching for a distant treasure in slow motion. Do not reach for real objects.', { title: { de: 'Die Beute in Zeitlupe', en: 'Treasure in Slow Motion' }, secret: true }),
  challenge('anchor-drop', 'Mime mit beiden Händen, wie du vorsichtig einen schweren Anker hinablässt, und wische dir danach erleichtert die Stirn.', 'Mime carefully lowering a heavy anchor with both hands, then wipe your brow in relief.', { title: { de: 'Anker fallen lassen', en: 'Lowering the Anchor' }, secret: true }),
  challenge('captain-log', 'Sprich einen zwanzigsekündigen Eintrag für das Kapitänslogbuch: aktueller Gang, Stimmung der Crew und Zustand der See.', 'Deliver a twenty-second captain’s log entry covering the current course, crew morale, and state of the sea.', { title: { de: 'Eintrag ins Kapitänslogbuch', en: 'Captain’s Log Entry' } }),
  challenge('crew-flag', 'Beschreibt gemeinsam in höchstens einer Minute eine Flagge für eure Crew: Farbe, Symbol und einen völlig unnötigen Zusatz.', 'In no more than one minute, describe a flag for your crew: its colour, symbol, and one completely unnecessary extra detail.', { title: { de: 'Die Flagge der Mannschaft', en: 'The Crew’s Flag' } }),
  challenge('compass-crew', 'Die aktive Person ruft eine Himmelsrichtung. Alle zeigen sofort in die Richtung, die sie dafür halten; unterschiedliche Antworten sind ausdrücklich erlaubt.', 'The active player calls a compass direction. Everyone immediately points where they think it is; different answers are explicitly allowed.', { title: { de: 'Kompassprobe der Crew', en: 'The Crew Compass Test' } }),
  challenge('treasure-guard', 'Verschränke zehn Sekunden die Arme und bewache eine unsichtbare Schatztruhe vor dir mit besonders ernstem Blick.', 'Fold your arms for ten seconds and guard an invisible treasure chest in front of you with an especially serious expression.', { title: { de: 'Wache vor der leeren Truhe', en: 'Guarding the Empty Chest' }, secret: true }),
  challenge('suspicious-cup', 'Mustere dein eigenes Getränk kurz misstrauisch, rieche nur aus sicherem Abstand daran und nicke dann erleichtert.', 'Briefly inspect your own drink with suspicion, smell it only from a safe distance, then nod with relief.', { title: { de: 'Der verdächtige Becher', en: 'The Suspicious Cup' }, secret: true }),
  challenge('crew-applause', 'Schenkt allen Personen mit einer laufenden oder bereits erledigten Küchenaufgabe gemeinsam fünf Sekunden Applaus.', 'Give everyone with a current or completed kitchen task five seconds of applause together.', { title: { de: 'Applaus für die Kombüse', en: 'Applause for the Galley' }, requirements: ['courseWorkStarted'] }),
  challenge('storm-chorus', 'Erzeugt gemeinsam zehn Sekunden lang einen leisen Sturm nur mit Fingerschnippen, Händereiben und sanftem Klopfen.', 'Create a quiet ten-second storm together using only finger snaps, rubbing hands, and gentle tapping.', { title: { de: 'Der Sturm im Kleinformat', en: 'A Pocket-Sized Storm' } }),
  challenge('parrot-echo', 'Wiederhole das letzte Wort des nächsten vollständigen Satzes, den eine andere Person sagt, einmal leise wie ein Papagei.', 'Quietly repeat the final word of the next full sentence spoken by another player, like a parrot.', { title: { de: 'Das Echo des Papageis', en: 'The Parrot’s Echo' }, secret: true }),
  challenge('secret-coordinate', 'Verkünde eine frei erfundene Schatzkoordinate aus Zahl, Buchstabe und Himmelsrichtung. Bestehe darauf, dass sie „ungefähr stimmen müsste“.', 'Announce an invented treasure coordinate containing a number, letter, and compass direction. Insist it “should be roughly correct.”', { title: { de: 'Die geheime Koordinate', en: 'The Secret Coordinate' } }),
  challenge('royal-taster', 'Rieche kurz in die Luft und erkläre mit wichtiger Stimme, dass die Kombüse die königliche Geschmacksprüfung bestanden hat.', 'Briefly sniff the air and announce importantly that the galley has passed the royal taste inspection.', { title: { de: 'Die königliche Geschmackswache', en: 'The Royal Taste Watch' }, secret: true }),
  challenge('eyebrow-signal', 'Hebe beim Aufdecken der nächsten Karte einmal bedeutungsvoll beide Augenbrauen, egal was darauf steht.', 'When the next card is revealed, raise both eyebrows meaningfully once, no matter what it says.', { title: { de: 'Das geheime Augenbrauensignal', en: 'The Secret Eyebrow Signal' }, secret: true, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('invisible-hat', 'Ziehe einen unsichtbaren Piratenhut, verbeuge dich damit kurz vor der Crew und setze ihn wieder auf.', 'Remove an invisible pirate hat, bow briefly to the crew with it, and put it back on.', { title: { de: 'Der unsichtbare Dreispitz', en: 'The Invisible Tricorn' }, secret: true }),
  challenge('course-prophecy', 'Sage mit geheimnisvoller Stimme voraus, welche Geschmacksrichtung oder welcher Arbeitsschritt als Nächstes wichtig wird.', 'Mysteriously predict which flavour direction or work step will become important next.', { title: { de: 'Die Prophezeiung des Gangs', en: 'The Course Prophecy' } }),
  challenge('harbor-name', 'Erfinde für den aktuellen Raum einen prächtigen Piratenhafennamen und verkünde, dass ihr soeben dort angelegt habt.', 'Invent a grand pirate-harbour name for the current room and announce that the crew has just docked there.', { title: { de: 'Ein neuer Hafenname', en: 'A New Harbour Name' } }),
  challenge('cannonball-catch', 'Fange pantomimisch eine federleichte unsichtbare Kanonenkugel, bestaune sie kurz und lege sie vorsichtig ab.', 'Mime catching a feather-light invisible cannonball, admire it briefly, and set it down carefully.', { title: { de: 'Die federleichte Kanonenkugel', en: 'The Feather-Light Cannonball' }, secret: true }),
  challenge('shanty-hum', 'Summe fünfzehn Sekunden eine frei erfundene Seemannsmelodie. Die Crew darf im Takt mit einem Finger wippen.', 'Hum an invented sailor’s tune for fifteen seconds. The crew may keep time with one finger.', { title: { de: 'Die Melodie ohne Worte', en: 'The Wordless Shanty' } }),
  challenge('flag-signal', 'Erfinde mit beiden Händen ein einfaches Flaggensignal und erkläre der Crew anschließend, was es angeblich bedeutet.', 'Invent a simple flag signal using both hands, then tell the crew what it supposedly means.', { title: { de: 'Das Signal der unsichtbaren Flaggen', en: 'The Invisible Flag Signal' } }),
  challenge('captain-address', 'Sprich die jeweils aktive Person bis zu deinem nächsten Zug nur mit „Käpt’n“ an. Verrate nicht, warum.', 'Until your next turn, address the active player only as “Captain.” Do not reveal why.', { coins: 3, title: { de: 'Alle heißen Käpt’n', en: 'Everyone Is Captain' }, secret: true, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('seated-wave', 'Startet eine kleine La-Ola-Welle einmal rund um den Tisch. Alle bleiben dabei sicher sitzen oder stehen ruhig am eigenen Platz.', 'Send a small Mexican wave once around the table. Everyone stays safely seated or stands calmly in their own place.', { title: { de: 'Die Welle rund ums Deck', en: 'The Wave Around the Deck' } }),
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
    valid: ids.size === events.length && titlesDe.size === events.length && titlesEn.size === events.length && storiesDe.size === events.length && storiesEn.size === events.length && EVENT_STAGES.every((stage) => stageCounts[stage] > 0)
  };
}
