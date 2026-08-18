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
      de: 'Die See wird still. Wenn keine Küchenaufgabe mehr offen ist, darf die Crew fünf Minuten durchatmen; andernfalls nutzt sie den Moment für eine kurze Herausforderung.',
      en: 'The sea turns calm. If no kitchen task remains open, the crew may take a five-minute breather; otherwise it uses the moment for a short challenge.'
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

const INGREDIENT_FUN_ARCHETYPE = Object.freeze({
  id: 'pantry-mischief', stage: 'ingredients', type: 'choice',
  title: { de: 'Schabernack im Vorrat von {location}', en: 'Pantry Mischief at {location}' },
  scene: {
    de: 'Zwischen den Zutaten versteckt sich eine verspielte Botschaft. Für einen Moment darf die Crew lachen, eine kleine Herausforderung annehmen oder nebenbei ein paar Münzen erspielen.',
    en: 'A playful message is hidden among the ingredients. For a moment, the crew may laugh, take on a small challenge, or earn a few coins along the way.'
  },
  mechanics: ['watchChallenge', 'storyMoment', 'treasureAndWatch']
});

const TASK_FUN_ARCHETYPE = Object.freeze({
  id: 'work-mischief', stage: 'tasks', type: 'dice',
  title: { de: 'Schabernack zwischen den Aufträgen von {location}', en: 'Mischief between Orders at {location}' },
  scene: {
    de: 'Zwischen zwei Questschritten taucht eine versiegelte Spaßkarte auf. Der Würfel bringt eine harmlose Challenge, eine kleine Flaute in der Bordkasse oder einen reinen Storymoment.',
    en: 'Between two quest steps, a sealed fun card appears. The die brings a harmless challenge, a small dip in the ship’s purse, or a pure story moment.'
  },
  mechanics: ['coinLoss', 'watchChallenge', 'storyMoment']
});

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
    if (locationIndex % 2 === 0) return [];
    const title = interpolate(TASK_FUN_ARCHETYPE.title, location);
    return [{
      id: `T${chapterIndex + 1}-${String(locationIndex + 1).padStart(2, '0')}`,
      chapterId: chapter.id,
      locationIndex,
      archetype: TASK_FUN_ARCHETYPE.id,
      stage: TASK_FUN_ARCHETYPE.stage,
      type: TASK_FUN_ARCHETYPE.type,
      title: { de: `${title.de} · ${chapter.name.de}`, en: `${title.en} · ${chapter.name.en}` },
      story: {
        de: `In ${location.de} beginnt die Szene: ${TASK_FUN_ARCHETYPE.scene.de} ${chapter.atmosphere.de}`,
        en: `The scene begins at ${location.en}: ${TASK_FUN_ARCHETYPE.scene.en} ${chapter.atmosphere.en}`
      },
      outcomes: [...TASK_FUN_ARCHETYPE.mechanics],
      variant: locationIndex
    }];
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
  splitCrew: { de: 'Teilt die Crew möglichst gleichmäßig in zwei Gruppen.', en: 'Split the crew into two groups as evenly as possible.' },
  chain: { de: 'Deckt sofort eine weitere Ereigniskarte auf.', en: 'Immediately reveal another event card.' },
  treasure: { de: 'Gewinnt zwei Münzen.', en: 'Gain two coins.' },
  coinLoss: { de: 'Die Bordkasse verliert fünfzehn Münzen.', en: 'The ship’s purse loses fifteen coins.' },
  storyMoment: { de: 'Genießt diesen kleinen Storymoment – er hat keine weitere Auswirkung.', en: 'Enjoy this small story moment — it has no further effect.' },
  fiveMinuteBreak: { de: 'Startet eine echte fünfminütige Pause für die ganze Crew.', en: 'Start a real five-minute break for the whole crew.' },
  singleTask: { de: 'Übernehmt den nächsten geeigneten Auftrag mit möglichst kleiner Besetzung.', en: 'Take the next suitable job with the smallest practical crew.' },
  watchComplete: { de: 'Die Bordaufgabe ist erledigt; die laufende Küchenzeit wurde sinnvoll genutzt.', en: 'The deck duty is complete; the running kitchen time was used productively.' },
  watchActive: { de: 'Die Challenge läuft über weitere Züge und blockiert die Übergabe nicht.', en: 'The challenge continues across later turns without blocking handover.' }
});

const challenge = (id, de, en, options = {}) => ({
  id, de, en, title: options.title ?? { de: 'Kurze Challenge', en: 'Quick challenge' },
  minutes: options.minutes ?? 1,
  coins: options.coins === 0 ? 0 : Math.max(1, Math.ceil((options.coins ?? 2) / 3)),
  secret: options.secret ?? false,
  followUpId: options.followUpId ?? null, flow: options.flow ?? 'immediate',
  endTrigger: options.endTrigger ?? null, mandatory: options.mandatory ?? false,
  followUpOnly: options.followUpOnly ?? false
});

export const WATCH_CHALLENGES = Object.freeze([
  challenge('clear-surface', 'Die aktive Person erfindet in 60 Sekunden einen Piratennamen für eine sichtbare, gerade freie Ablagefläche. Niemand unterbricht dafür die Küchenarbeit oder räumt etwas um.', 'The active player has 60 seconds to invent a pirate name for a visible, currently unused surface. Nobody interrupts kitchen work or moves anything for it.', { title: { de: 'Die geheime Schatzablage', en: 'The Secret Treasure Shelf' } }),
  challenge('next-steps', 'Prüft alle laufenden Aufgaben und nennt laut, was als Nächstes gebraucht wird.', 'Review every active task and say aloud what will be needed next.'),
  challenge('fresh-water', 'Stellt für jedes Crewmitglied frisches Wasser bereit.', 'Set out fresh water for every crew member.'),
  challenge('sort-tools', 'Die aktive Person erfindet in 60 Sekunden für drei sichtbare Küchenwerkzeuge je einen Piratennamen. Fasst nichts an, was gerade benutzt wird, und unterbrecht keine Küchenarbeit.', 'The active player has 60 seconds to invent a pirate name for each of three visible kitchen tools. Do not touch anything currently in use or interrupt kitchen work.', { title: { de: 'Die Taufe der Kombüsenwerkzeuge', en: 'Naming the Galley Tools' } }),
  challenge('name-course', 'Erfindet in höchstens 60 Sekunden einen Namen für den entstehenden Gang.', 'Invent a name for the emerging course in no more than 60 seconds.'),
  challenge('ingredient-round', 'Nennt reihum je eine Zutat, die heute bereits sinnvoll verwendet wurde.', 'Go around once and name one ingredient already used well tonight.'),
  challenge('table-check', 'Prüft den Tisch: Fehlt Besteck, Wasser, ein Untersetzer oder Platz zum Servieren?', 'Check the table: is cutlery, water, a trivet, or serving space missing?'),
  challenge('collect-waste', 'Sammelt Verpackungen und Abfälle ein, ohne laufende Arbeitswege zu blockieren.', 'Collect packaging and waste without blocking active work routes.'),
  challenge('portion-captain', 'Bestimmt eine Person, die beim nächsten Servieren Portionsgrößen kontrolliert.', 'Choose one person to check portion sizes at the next serving.'),
  challenge('timer-check', 'Schaut auf alle Challenges und wiederholt gemeinsam die nächste Warnschwelle.', 'Look at every challenge and repeat the next alert threshold together.'),
  challenge('sea-story', 'Gebt {activePlayer} 60 Sekunden für eine kurze Seefahrergeschichte.', 'Give {activePlayer} 60 seconds for a short seafaring story.'),
  challenge('pirate-verse', 'Erfindet in höchstens 90 Sekunden ein kurzes Piratenlied oder Piratengedicht mit mindestens zwei Zeilen. Singt es gemeinsam oder tragt es dramatisch vor – beides zählt vollständig.', 'In no more than 90 seconds, invent a short pirate song or pirate poem of at least two lines. Sing it together or perform it dramatically — either counts in full.', { minutes: 2, coins: 3, title: { de: 'Die Ballade der wilden Kombüse', en: 'Ballad of the Wild Galley' } }),
  challenge('safety-check', 'Kontrolliert, dass heiße, scharfe und rohe Arbeitsbereiche klar getrennt sind.', 'Confirm that hot, sharp, and raw-food work areas are clearly separated.'),
  challenge('odd-dance', 'Steh auf und tanze 20 Sekunden so merkwürdig wie möglich. Danach geht das Spiel normal weiter.', 'Stand up and dance as strangely as possible for 20 seconds. Then continue normally.', { coins: 3, title: { de: 'Tanz auf Deck', en: 'Deck Dance' }, secret: true }),
  challenge('table-lap', 'Steh auf, geh einmal um den Tisch und setz dich wieder hin, als wäre nichts passiert.', 'Stand up, walk once around the table, and sit down again as though nothing happened.', { title: { de: 'Geheimer Rundgang', en: 'Secret Circuit' }, secret: true }),
  challenge('compliments', 'Bis zu deinem nächsten Zug machst du der jeweils aktiven Person ein ehrliches, kurzes Kompliment.', 'Until your next turn, give the active player one brief, genuine compliment.', { coins: 3, title: { de: 'Nur für deine Augen', en: 'For Your Eyes Only' }, secret: true, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
  challenge('love-decisions', 'Bis zu deinem nächsten Zug findest du jede Entscheidung deiner Crew großartig. Übertreib freundlich, aber verrate die Karte nicht.', 'Until your next turn, you think every crew decision is wonderful. Exaggerate kindly, but do not reveal the card.', { coins: 3, title: { de: 'Nur für deine Augen', en: 'For Your Eyes Only' }, secret: true, flow: 'ongoing', endTrigger: 'ownerNextTurn' }),
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
