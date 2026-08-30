import { CHAPTERS } from '../data/chapters.js';
import { COIN_VALUES } from '../config.js';
import { EFFECT_TEXT } from '../data/events.js';
import { INGREDIENT_EFFECT_TEXT } from '../data/ingredients.js';
import { localize, formatDuration } from '../data/i18n.js';
import { getRole } from '../data/roles.js';
import { avatar, escapeHtml, percent, statusTag, t, tx } from './helpers.js';

const STAGE_COPY = Object.freeze({
  clearing: {
    de: { label: '0 · Vorigen Gang abräumen', title: 'Tisch klarmachen', button: 'Abräum-Aufgabe ansehen', lead: 'Der vorige Gang wird vollständig abgeräumt. Erst nach diesem Küchenauftrag beginnt die Zutatenwahl.' },
    en: { label: '0 · Clear the previous course', title: 'Clear the table', button: 'View clearing task', lead: 'The previous course is cleared completely. Ingredient selection begins only after this kitchen job.' }
  },
  teamSelection: {
    de: { label: '1 · Cocktail-Teams wählen', title: 'Persönliche Cocktailwahl', button: 'Cocktail-Team wählen', lead: 'Jede Person entscheidet einmal selbst, welche Cocktailvariante sie später mittrinkt und zubereitet.' },
    en: { label: '1 · Choose cocktail teams', title: 'Personal cocktail choice', button: 'Choose cocktail team', lead: 'Each player decides once which cocktail version they will later drink and prepare.' }
  },
  ingredients: {
    de: { label: '1 · Zutaten bestimmen', title: 'Vorratsereignis ziehen', button: 'Vorrats-Ereigniskarte ziehen', lead: 'Entdeckt, verändert und sichert die Zutaten dieses Gangs. Erst wenn alle festgelegt sind, öffnet sich das Auftragsdeck.' },
    en: { label: '1 · Choose ingredients', title: 'Draw a provision event', button: 'Draw provision event', lead: 'Discover, change, and lock the ingredients for this course. The work-order deck opens only when all are fixed.' }
  },
  tasks: {
    de: { label: '2 · Spaß & Aufgaben', title: 'Karte aus dem Auftragsdeck ziehen', button: 'Nächste Karte ziehen', lead: 'Zieht die nächste Karte und entdeckt, was die Reise für eure Crew bereithält.' },
    en: { label: '2 · Fun & tasks', title: 'Draw from the work deck', button: 'Draw next card', lead: 'Draw the next card and discover what the voyage has in store for your crew.' }
  },
  cooking: {
    de: { label: '3 · Parallel kochen', title: 'Freies Ereignis ziehen', button: 'Eventkarte ziehen', lead: 'Küchenarbeit läuft parallel. Freie Personen erleben Challenges, Pausen, geheime Späße und Münzereignisse.' },
    en: { label: '3 · Cook in parallel', title: 'Draw an open event', button: 'Draw event card', lead: 'Kitchen work continues in parallel. Free players get challenges, breaks, secret fun, and coin events.' }
  }
});

const LOCATION_SCENES = Object.freeze({
  tapas: Object.freeze([
    '../assets/location-scenes/tapas-harbour-basin.jpg',
    '../assets/location-scenes/tapas-lighthouse.jpg',
    '../assets/location-scenes/tapas-village-square.jpg',
    '../assets/location-scenes/tapas-market-lane.jpg',
    '../assets/location-scenes/tapas-olive-grove.jpg',
    '../assets/location-scenes/tapas-smugglers-pier.jpg'
  ]),
  soup: '../assets/location-scenes/soup-locations-atlas.jpg',
  salad: '../assets/location-scenes/salad-locations-atlas.jpg',
  main: '../assets/location-scenes/main-locations-atlas.jpg',
  dessert: '../assets/location-scenes/dessert-locations-atlas.jpg',
  cocktails: '../assets/location-scenes/cocktails-locations-atlas.jpg'
});

function locationScene(chapterId, locationIndex) {
  const source = LOCATION_SCENES[chapterId];
  if (Array.isArray(source)) {
    return { source: source[locationIndex] ?? source[0], atlas: false, x: 50, y: 50 };
  }
  return {
    source,
    atlas: true,
    x: locationIndex % 2 === 0 ? 0 : 100,
    y: Math.floor(locationIndex / 2) * 50
  };
}

const CHALLENGE_RESULT_TEXT = Object.freeze({
  veryFast: { de: 'Blitzschnell · +2', en: 'Lightning fast · +2' },
  onTime: { de: 'Rechtzeitig · +1', en: 'On time · +1' },
  late: { de: 'Etwas zu spät · −2', en: 'A little late · −2' },
  veryLate: { de: 'Deutlich zu spät · −5', en: 'Very late · −5' },
  background: { de: 'Hintergrundzeit · keine Münzwertung', en: 'Background time · no coin score' }
});

const DIE_PIP_CELLS = Object.freeze({
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9]
});

function renderDieFace(className, value) {
  return `<span class="die-face ${className}" aria-hidden="true">${DIE_PIP_CELLS[value]
    .map((cell) => `<i class="die-pip" data-cell="${cell}"></i>`).join('')}</span>`;
}

function renderDieCube(value) {
  return `<div class="die-cube" data-result="${value}">
    ${renderDieFace('die-front', 1)}${renderDieFace('die-back', 6)}
    ${renderDieFace('die-right', 3)}${renderDieFace('die-left', 5)}
    ${renderDieFace('die-top', 2)}${renderDieFace('die-bottom', 4)}
  </div>`;
}

function renderDieResult(value, label, result) {
  return `<div class="dice-stage" data-rolling="false">
    <div class="die-scene" aria-label="${escapeHtml(label)}">
      ${renderDieCube(value)}
    </div>
    <div class="dice-reveal"><span>${escapeHtml(label)}</span><strong>${escapeHtml(result)}</strong></div>
  </div>`;
}

function stageCopy(engine, language) {
  const eventStage = engine.currentEventStage();
  const stage = engine.state.chapter.stage === 'teamSelection'
    ? 'teamSelection'
    : engine.state.chapter.stage === 'clearing' && eventStage === 'tasks'
      ? 'clearing'
      : eventStage;
  const copy = STAGE_COPY[stage]?.[language] ?? STAGE_COPY.cooking[language];
  if (engine.currentChapter.id !== 'cocktails') return copy;
  const stageNumber = { clearing: 0, teamSelection: 1, ingredients: 2, tasks: 3, cooking: 4 }[stage];
  return Number.isInteger(stageNumber) ? { ...copy, label: copy.label.replace(/^\d+/, String(stageNumber)) } : copy;
}

function renderCourseFlow(engine, language) {
  const current = ['clearing', 'teamSelection'].includes(engine.state.chapter.stage)
    ? engine.state.chapter.stage
    : engine.currentEventStage();
  const order = engine.currentChapter.id === 'cocktails'
    ? ['clearing', 'teamSelection', 'ingredients', 'tasks', 'cooking']
    : engine.state.chapterIndex === 0
    ? ['ingredients', 'tasks', 'cooking']
    : ['clearing', 'ingredients', 'tasks', 'cooking'];
  const labelMap = language === 'de'
    ? { clearing: 'Abräumen', teamSelection: 'Teams', ingredients: 'Zutaten', tasks: 'Aufgaben', cooking: 'Kochen' }
    : { clearing: 'Clear table', teamSelection: 'Teams', ingredients: 'Ingredients', tasks: 'Tasks', cooking: 'Cooking' };
  return `<div class="course-flow" aria-label="${language === 'de' ? 'Ablauf des Gangs' : 'Course flow'}">${order.map((stage, index) => {
    const state = order.indexOf(current) > index ? 'done' : current === stage ? 'active' : 'future';
    return `<span data-state="${state}"><b>${state === 'done' ? '✓' : engine.state.chapterIndex === 0 ? index + 1 : index}</b>${labelMap[stage]}</span>`;
  }).join('')}</div>`;
}

function renderIngredientBasket(engine, instance, language) {
  const ingredients = (instance?.basketIngredientIds ?? []).map((id) => engine.getIngredient(id)).filter(Boolean);
  return `<div class="task-basket">
    <strong>${language === 'de' ? 'Relevante Zutaten dieses Gangs' : 'Relevant ingredients for this course'}</strong>
    ${ingredients.length
      ? `<div class="basket-chips">${ingredients.map((ingredient) => `<span>${escapeHtml(t(ingredient.name, language))}</span>`).join('')}</div>`
      : `<p>${language === 'de' ? 'Für diesen Schritt sind keine bestimmten Gangzutaten nötig.' : 'This step does not need specific course ingredients.'}</p>`}
  </div>`;
}

function eventActionText(engine, actionCode, language) {
  if (['watchSuccess', 'watchFailure'].includes(actionCode)) {
    const coins = Number(engine.state.turn.watchCoinDelta) || 0;
    const coinText = `${coins > 0 ? '+' : coins < 0 ? '−' : '±'}${Math.abs(coins)}`;
    const charade = engine.currentWatchChallenge?.charade;
    return language === 'de'
      ? `${actionCode === 'watchSuccess' ? (charade ? 'Scharade erraten' : 'Challenge geschafft') : (charade ? 'Scharade nicht erraten' : 'Challenge gescheitert')} · ${coinText} Münzen`
      : `${actionCode === 'watchSuccess' ? (charade ? 'Charade guessed' : 'Challenge succeeded') : (charade ? 'Charade not guessed' : 'Challenge failed')} · ${coinText} coins`;
  }
  if (['drawTask', 'singleTask', 'teamTask', 'treasureAndTask'].includes(actionCode)) {
    const resolvedInstance = engine.state.turn.phase === 'resolved' && engine.state.turn.resolvedTaskId
      ? engine.state.tasks.find((instance) => instance.instanceId === engine.state.turn.resolvedTaskId)
      : null;
    const card = resolvedInstance ? engine.getTaskCard(resolvedInstance) : engine.taskForAction(actionCode);
    if (!card) return t(EFFECT_TEXT[actionCode], language);
    const people = resolvedInstance?.assignedPlayerIds.length ?? (actionCode === 'teamTask' && card.people[1] > card.people[0]
      ? Math.min(card.people[1], card.people[0] + 1)
      : card.people[0]);
    const help = language === 'de'
      ? `mit ${people} ${people === 1 ? 'Person' : 'Personen'}`
      : `with ${people} ${people === 1 ? 'person' : 'people'}`;
    const treasure = actionCode === 'treasureAndTask' ? (language === 'de' ? '+2 Münzen + ' : '+2 coins + ') : '';
    return `${treasure}${t(card.title, language)} · ${help}`;
  }
  if (['watchChallenge', 'watchChallengeAlt', 'treasureAndWatch'].includes(actionCode)) {
    const challengeCode = actionCode === 'watchChallengeAlt' ? 'watchChallengeAlt' : 'watchChallenge';
    const challenge = engine.state.turn.watchChallengeId ? engine.currentWatchChallenge : engine.watchChallengeForAction(challengeCode);
    const treasure = actionCode === 'treasureAndWatch' ? (language === 'de' ? '+2 Münzen + ' : '+2 coins + ') : '';
    const challengeChoice = engine.currentEvent?.type === 'choice' &&
      engine.currentEvent?.options?.includes('coinLoss') &&
      engine.currentEvent?.options?.some((option) => ['watchChallenge', 'watchChallengeAlt', 'treasureAndWatch'].includes(option));
    const accept = challengeChoice
      ? (language === 'de' ? 'Challenge annehmen: ' : 'Accept challenge: ')
      : '';
    if (challenge.secret) {
      return `${treasure}${accept}${language === 'de'
        ? `Geheime Challenge nur für ${escapeHtml(engine.activePlayer.name)} ziehen · nicht vorlesen`
        : `Draw a secret challenge for ${escapeHtml(engine.activePlayer.name)} only · do not read aloud`}`;
    }
    return `${treasure}${accept}${t(challenge, language)}`;
  }
  if (actionCode === 'coinLoss') {
    const challengeDecline = engine.currentEvent?.type === 'choice' &&
      engine.currentEvent?.options?.some((option) => ['watchChallenge', 'watchChallengeAlt', 'treasureAndWatch'].includes(option));
    const prefix = challengeDecline
      ? (language === 'de' ? 'Challenge ablehnen · ' : 'Decline challenge · ')
      : '';
    if (engine.state.turn.phase === 'resolved' && Number.isInteger(engine.state.turn.gamblerLossRoll)) {
      const roll = engine.state.turn.gamblerLossRoll;
      const actualLoss = Math.abs(engine.state.turn.coinChangeApplied ?? engine.state.turn.coinChangeModified ?? -roll);
      return language === 'de'
        ? `${prefix}Gambler-Wurf ${roll} · −${actualLoss} Münzen`
        : `${prefix}Gambler roll ${roll} · −${actualLoss} coins`;
    }
    const preview = engine.coinLossPreview(COIN_VALUES.coinLoss);
    if (preview.dice) {
      return language === 'de'
        ? `${prefix}Gambler würfelt den Verlust · 1–6 Münzen`
        : `${prefix}Gambler rolls the loss · 1–6 coins`;
    }
    const loss = Math.abs(preview.amount);
    return language === 'de' ? `${prefix}−${loss} Münzen` : `${prefix}−${loss} coins`;
  }
  if (actionCode === 'lockIngredient') {
    const ingredient = engine.state.turn.phase === 'resolved'
      ? engine.getIngredient(engine.state.turn.resolvedIngredientId)
      : engine.ingredientActionTarget();
    return ingredient
      ? (language === 'de' ? `${t(ingredient.name, language)} verbindlich festlegen` : `Lock in ${t(ingredient.name, language)}`)
      : t(EFFECT_TEXT[actionCode], language);
  }
  if (actionCode === 'returnIngredient') {
    const ingredient = engine.state.turn.phase === 'resolved'
      ? engine.getIngredient(engine.state.turn.resolvedIngredientId)
      : engine.ingredientActionTarget();
    return ingredient
      ? (language === 'de' ? `${t(ingredient.name, language)} aus dem Gangkorb zurücklegen` : `Return ${t(ingredient.name, language)} from the course basket`)
      : t(EFFECT_TEXT[actionCode], language);
  }
  if (actionCode === 'swapIngredient') {
    const ingredient = engine.state.turn.phase === 'resolved'
      ? engine.getIngredient(engine.state.turn.resolvedPreviousIngredientId)
      : engine.ingredientActionTarget();
    return ingredient
      ? (language === 'de' ? `${t(ingredient.name, language)} gegen eine Alternative tauschen` : `Swap ${t(ingredient.name, language)} for an alternative`)
      : t(EFFECT_TEXT[actionCode], language);
  }
  return t(EFFECT_TEXT[actionCode] ?? { de: actionCode, en: actionCode }, language);
}

function renderCourseBoard(engine, language) {
  const chapterIndex = engine.state.chapterIndex;
  const group = engine.activeGroup;
  const locations = engine.currentChapter.locations;
  const islands = CHAPTERS.map((chapter, index) => {
    const state = index < chapterIndex ? 'done' : index === chapterIndex ? 'active' : 'future';
    const routeState = index <= chapterIndex ? 'sailed' : 'future';
    return `${index ? `<span class="sea-route" data-state="${routeState}" aria-hidden="true"></span>` : ''}
      <div class="island-stop" data-state="${state}" style="--course-color:${chapter.color}">
        <span class="island-icon">${chapter.icon}</span><small>${t(chapter.name, language)}</small>
      </div>`;
  }).join('');
  const locationDots = locations.map((location, index) => {
    const state = group.completedLocations.includes(index) ? 'done' : index === group.locationIndex ? 'active' : 'future';
    return `<span class="location-dot" data-state="${state}" title="${t(location, language)}"></span>`;
  }).join('');
  const activeLocation = locations[group.locationIndex];
  const scene = locationScene(engine.currentChapter.id, group.locationIndex);
  const sceneStyle = `--scene-image:url(${scene.source});--scene-x:${scene.x}%;--scene-y:${scene.y}%`;

  return `
    <section class="course-board" aria-label="${t(engine.currentChapter.name, language)}">
      <header class="active-course-heading">
        <span>${language === 'de' ? `Gang ${chapterIndex + 1} von ${CHAPTERS.length}` : `Course ${chapterIndex + 1} of ${CHAPTERS.length}`}</span>
        <h2>${t(engine.currentChapter.course, language)}</h2>
      </header>
      <div class="voyage-map" aria-label="${language === 'de' ? 'Karte der Inselroute' : 'Map of the island route'}">
        <div class="voyage-map-title"><strong>${language === 'de' ? 'Inselkarte' : 'Island map'}</strong><span>${language === 'de' ? 'Die goldene Route zeigt die bisherige Reise.' : 'The golden route shows the voyage so far.'}</span></div>
        <div class="island-route">${islands}</div>
      </div>
      <div class="station-scene" data-atlas="${scene.atlas}" data-chapter="${escapeHtml(engine.currentChapter.id)}" data-location="${group.locationIndex}" role="img" aria-label="${escapeHtml(`${t(activeLocation, language)} · ${t(engine.currentChapter.name, language)}`)}" style="${sceneStyle}">
        <div class="station-caption">
          <small>${t(engine.currentChapter.name, language)}</small>
          <strong>${t(activeLocation, language)}</strong>
        </div>
      </div>
      <div class="location-track" aria-label="${tx('currentLocation', language)}">${locationDots}</div>
    </section>`;
}

function renderCourseBasket(engine, language) {
  if (engine.state.chapter.stage !== 'ingredients') return '';
  const basket = engine.unlockedCourseIngredients();
  const locked = engine.courseIngredients().filter((ingredient) => ingredient.status === 'locked');
  const target = engine.courseRule().target;
  const optionalLimit = engine.courseRule().optionalLimit ?? 0;
  const essentialLocked = locked.filter((ingredient) => ingredient.essential).length;
  const automaticallyLocked = locked.filter((ingredient) => ingredient.autoLockedChapterIndex === engine.state.chapterIndex);
  const categoryLabels = {
    vegetable: { de: 'Gemüse', en: 'vegetables' }, pantry: { de: 'Grundlage/Extras', en: 'base/extras' },
    meat: { de: 'Fleisch', en: 'meat' }, fruit: { de: 'Obst', en: 'fruit' },
    dessert: { de: 'Dessertbasis', en: 'dessert base' }, drinks: { de: 'Getränkebasis', en: 'drink base' },
    alcohol: { de: 'Spirituose', en: 'spirit' }
  };
  const cocktailCourse = engine.currentChapter.id === 'cocktails';
  const cocktailUseLabel = (use) => t({
    de: { alcoholic: 'nur alkoholische Mischung', 'alcohol-free': 'nur alkoholfreie Mischung', shared: 'für beide Mischungen' }[use],
    en: { alcoholic: 'alcoholic mix only', 'alcohol-free': 'alcohol-free mix only', shared: 'both mixes' }[use]
  }, language);
  const profile = Object.entries(engine.courseRule().categoryMinimums ?? {}).map(([category, required]) => {
    const current = engine.courseCategoryCount(category, ['discovered', 'locked', 'used']);
    return statusTag(`${current}/${required} ${t(categoryLabels[category] ?? { de: category, en: category }, language)}`, current >= required ? 'green' : 'gold');
  }).join('');
  const cocktailSpiritCount = cocktailCourse
    ? engine.courseCategoryCount('alcohol', ['discovered', 'locked', 'used'])
    : 0;
  const cocktailSpiritTarget = engine.state.chapter.cocktailSpiritTarget;
  const renderCocktailRecipeList = (team, title, tone) => {
    const ingredients = locked.filter((ingredient) => [team, 'shared'].includes(ingredient.cocktailUse));
    return `<section class="cocktail-recipe-list" data-team="${team}">
      <div class="card-row"><h4>${title}</h4>${statusTag(`${ingredients.length} ${language === 'de' ? 'Zutaten' : 'ingredients'}`, tone)}</div>
      ${ingredients.length ? ingredients.map((ingredient) => `<article><div><strong>${t(ingredient.name, language)}</strong><small>${ingredient.cocktailUse === 'shared' ? (language === 'de' ? 'Gemeinsame Grundlage · steht auch in der anderen Liste' : 'Shared base · also appears in the other list') : (language === 'de' ? 'Nur für dieses Rezept' : 'For this recipe only')}</small><small class="ingredient-effect">${t(INGREDIENT_EFFECT_TEXT[ingredient.effect], language)}</small></div></article>`).join('') : `<p class="muted">${language === 'de' ? 'Noch keine Zutat festgelegt.' : 'No ingredient locked yet.'}</p>`}
    </section>`;
  };
  const cocktailRecipeLists = cocktailCourse && locked.length
    ? `<div class="cocktail-recipe-lists">${renderCocktailRecipeList('alcoholic', language === 'de' ? 'Zutatenliste · alkoholisch' : 'Ingredient list · alcoholic', 'coral')}${renderCocktailRecipeList('alcohol-free', language === 'de' ? 'Zutatenliste · alkoholfrei' : 'Ingredient list · alcohol-free', 'green')}</div>`
    : '';
  return `<section class="course-basket panel">
    <div class="panel-header"><div><p class="eyebrow">${language === 'de' ? 'Vorläufige Auswahl' : 'Draft selection'}</p><h3>${language === 'de' ? 'Gangkorb' : 'Course basket'}</h3></div>${statusTag(`${essentialLocked}/${target} ${language === 'de' ? 'Pflichtzutaten' : 'required'}`, essentialLocked >= target ? 'green' : 'gold')}</div>
    <p class="muted">${language === 'de' ? `Dieser Gang braucht genau ${target} Pflichtzutaten${optionalLimit ? ` und erlaubt höchstens ${optionalLimit} optionales Extra` : ''}. Pflichtzutaten ohne späteren möglichen Gang werden zu Rundenbeginn automatisch festgelegt; alle übrigen Zutaten können nur durch Karten verbindlich festgelegt oder aus dem offenen Korb zurückgelegt werden. Vor dem Wechsel zu den Aufgaben muss der offene Korb leer sein.` : `This course needs exactly ${target} required ingredients${optionalLimit ? ` and allows at most ${optionalLimit} optional extra` : ''}. Required ingredients with no later eligible course are locked automatically at the start of the round; all other ingredients can only be locked in or returned from the open basket by cards. The open basket must be empty before tasks begin.`}</p>
    ${automaticallyLocked.length ? `<div class="card-effect"><strong>${language === 'de' ? 'Automatisch für diesen Gang festgelegt' : 'Automatically locked for this course'}</strong><span>${language === 'de' ? 'Diese Pflichtzutaten können in keinem späteren Gang mehr verwendet werden und sind deshalb nicht erst im offenen Korb gelandet.' : 'These required ingredients cannot be used in any later course, so they bypassed the open basket.'}</span></div>` : ''}
    ${cocktailCourse ? `<div class="card-effect cocktail-composition-hint"><strong>${language === 'de' ? 'Zwei getrennte Zutatenlisten' : 'Two separate ingredient lists'}</strong><span>${language === 'de' ? 'Wer eine Zutat auswählt, entscheidet damit für das eigene Cocktail-Team. Mitglieder des alkoholfreien Teams bekommen keine Spirituosen zur Auswahl. Automatisch festgelegte gemeinsame Grundlagen werden fair auf beide Listen verteilt.' : 'Choosing an ingredient adds it to the active player’s own cocktail team. Alcohol-free team members are never offered spirits. Automatically locked bases are distributed fairly between both lists.'}</span></div>` : ''}
    ${profile || cocktailCourse ? `<div class="stat-strip">${profile}${cocktailCourse ? statusTag(language === 'de' ? `${cocktailSpiritCount}/${cocktailSpiritTarget ?? '1–3'} Spirituosensorten für die alkoholische Mischung` : `${cocktailSpiritCount}/${cocktailSpiritTarget ?? '1–3'} spirits for the alcoholic mix`, Number.isInteger(cocktailSpiritTarget) && cocktailSpiritCount === cocktailSpiritTarget ? 'green' : 'gold') : ''}</div>` : ''}
    ${basket.length ? `<div class="course-basket-list">${basket.map((ingredient) => `<article>
      <strong>${t(ingredient.name, language)}</strong>
      ${ingredient.effect ? `<small class="ingredient-effect">${t(INGREDIENT_EFFECT_TEXT[ingredient.effect], language)}</small>` : `<small>${language === 'de' ? 'Kein zusätzlicher Karteneffekt.' : 'No additional card effect.'}</small>`}
      <small>${cocktailCourse ? `${cocktailUseLabel(ingredient.cocktailUse)} · ` : ''}${language === 'de' ? 'Wartet auf die nächste passende Kartenentscheidung.' : 'Waiting for the next applicable card decision.'}</small>
    </article>`).join('')}</div>` : `<p class="muted">${language === 'de' ? 'Gefundene Zutaten landen zuerst hier und werden anschließend ausschließlich durch Karten festgelegt oder zurückgelegt.' : 'Discovered ingredients land here first and are then locked in or returned exclusively by cards.'}</p>`}
    ${cocktailRecipeLists || (locked.length ? `<div class="cocktail-ingredient-assignments"><h4>${cocktailCourse
      ? (language === 'de' ? 'Bereits festgelegte Cocktailzutaten' : 'Locked cocktail ingredients')
      : (language === 'de' ? 'Bereits festgelegte Zutaten' : 'Locked ingredients')}</h4>${locked.map((ingredient) => `<article><div><strong>${t(ingredient.name, language)}</strong>${ingredient.autoLockedChapterIndex === engine.state.chapterIndex ? `<small>${language === 'de' ? 'Automatisch festgelegt · letzter möglicher Gang' : 'Automatically locked · final eligible course'}</small>` : ''}<small class="ingredient-effect">${t(INGREDIENT_EFFECT_TEXT[ingredient.effect], language)}</small></div></article>`).join('')}</div>` : '')}
  </section>`;
}

function renderCocktailTeams(engine, language) {
  if (engine.currentChapter.id !== 'cocktails') return '';
  const team = (id, title, tone) => {
    const names = engine.cocktailTeamMembers(id).map((player) => escapeHtml(player.name));
    const technique = engine.cocktailTechniqueForTeam(id);
    const techniqueLabel = technique === 'mixed'
      ? (language === 'de' ? 'Technik: mixen' : 'Technique: blend')
      : technique === 'stirred'
        ? (language === 'de' ? 'Technik: rühren' : 'Technique: stir')
        : (language === 'de' ? 'Technik noch offen' : 'Technique not chosen');
    const members = names.length ? names.join(', ') : (language === 'de' ? 'Noch niemand' : 'No one yet');
    return `<div data-team="${id}"><strong>${title}</strong>${statusTag(members, names.length ? tone : 'gold')}${statusTag(techniqueLabel, technique ? 'blue' : 'gold')}</div>`;
  };
  return `<section class="cocktail-team-board" aria-label="${language === 'de' ? 'Cocktail-Teams' : 'Cocktail teams'}">
    ${team('alcoholic', language === 'de' ? 'Mit Alkohol' : 'Alcoholic', 'coral')}
    ${team('alcohol-free', language === 'de' ? 'Alkoholfrei' : 'Alcohol-free', 'green')}
    <p>${language === 'de' ? 'Früchte, Eis, Mischen, Süße, Säure und Abschmecken werden für jedes Team getrennt vergeben. Nur Kennzeichnung, Servieren und Aufräumen bleiben gemeinsame Crew-Aufgaben.' : 'Fruit, ice, mixing, sweetness, acidity, and tasting are assigned separately to each team. Only labelling, serving, and cleanup remain shared crew jobs.'}</p>
  </section>`;
}

function renderStatusPanel(engine, language) {
  const group = engine.activeGroup;
  const courseProgress = engine.courseProgressDetails();
  const locationNumber = group.locationIndex + 1;
  const locationTotal = engine.currentChapter.locations.length;
  const currentIngredients = engine.courseIngredients();
  const fixedIngredients = currentIngredients.filter((ingredient) => ['locked', 'used'].includes(ingredient.status)).length;
  const freeCrew = engine.freePlayersForTask(group).length;
  const stage = stageCopy(engine, language);
  return `
    <section class="panel" style="box-shadow:none">
      <div class="panel-header">
        <div>
          <p class="eyebrow">${t(engine.currentChapter.name, language)}</p>
          <h2>${t(engine.currentChapter.locations[group.locationIndex], language)}</h2>
        </div>
        ${statusTag(`${tx('group', language)} ${group.id}`, 'blue')}
      </div>
      <p class="muted">${t(engine.currentChapter.atmosphere, language)}</p>
      ${renderCocktailTeams(engine, language)}
      <div class="stat-strip">
        ${statusTag(`${tx('round', language)} ${engine.state.chapter.round}`)}
        ${statusTag(`● ${engine.state.coins}/${engine.state.coinGoal} ${tx('treasure', language)}`, 'gold')}
        ${statusTag(`${tx('events', language)} ${engine.state.chapter.eventsResolved}`)}
        ${statusTag(stage.label, 'blue')}
        ${statusTag(language === 'de' ? `${freeCrew}/${group.playerIds.length} frei für Aufgaben` : `${freeCrew}/${group.playerIds.length} free for tasks`, freeCrew ? 'green' : 'coral')}
      </div>
      <div class="progress-track" aria-label="${language === 'de' ? 'Gangfortschritt' : 'Course progress'}"><span style="--progress:${courseProgress.percent}%"></span></div>
      <p class="muted" style="font-family:system-ui,sans-serif;font-size:.72rem;margin:.45rem 0 0">
        ${language === 'de' ? `${courseProgress.percent} % Gangfortschritt · Ort ${locationNumber} von ${locationTotal}` : `${courseProgress.percent}% course progress · location ${locationNumber} of ${locationTotal}`}
      </p>
      <p class="muted" style="font-family:system-ui,sans-serif;font-size:.72rem;margin:.35rem 0 0">
        ${language === 'de' ? `${fixedIngredients} Zutaten festgelegt · ${courseProgress.tasksDone}/${courseProgress.tasksTotal} Gangaufgaben abgeschlossen` : `${fixedIngredients} ingredients locked · ${courseProgress.tasksDone}/${courseProgress.tasksTotal} course tasks completed`}
      </p>
      <div class="coin-meter"><span style="--progress:${engine.coinProgress}%"></span><b>${engine.state.coins}/${engine.state.coinGoal} ${language === 'de' ? 'Münzen' : 'coins'} · ${engine.coinProgress}% ${language === 'de' ? 'der Süßigkeitenbeute' : 'of the sweet loot'}</b></div>
    </section>`;
}

function renderAbility(engine, language) {
  const player = engine.activePlayer;
  const role = getRole(player.roleId);
  const phase = engine.state.turn.phase;
  const key = `tactician-ignore-${engine.state.chapterIndex}`;
  const canIgnore = role.id === 'tactician' && ['event', 'rolled'].includes(phase) &&
    !engine.currentEvent?.storyKind && engine.passiveUnused(player, key);
  const categoryByRole = { herbalist: 'vegetable', hunter: 'meat', gatherer: 'fruit' };
  const passiveCategory = categoryByRole[role.id] ?? null;
  const categoryPassiveKey = `${role.id}-draw-${engine.state.chapterIndex}`;
  const ingredientStage = engine.state.chapter.stage === 'ingredients';
  const canUseCategoryPassive = ingredientStage && Boolean(passiveCategory) && ['draw', 'event'].includes(phase) &&
    !engine.state.turn.ingredientFlow && engine.passiveUnused(player, categoryPassiveKey) && engine.courseIngredientCandidates(passiveCategory).length > 0;
  const lastIngredient = engine.getIngredient(engine.state.lastIngredientId);
  const hasSwapAlternative = lastIngredient && engine.swapIngredientAlternatives(lastIngredient).length > 0;
  const alchemistKey = `alchemist-swap-${engine.state.chapterIndex}`;
  const canUseAlchemistPassive = role.id === 'alchemist' && ingredientStage && ['draw', 'event'].includes(phase) &&
    !engine.state.turn.ingredientFlow && hasSwapAlternative && engine.passiveUnused(player, alchemistKey);
  const canUse = engine.activeAbilityAvailable();
  const taskAbilityArmed = ['lucky', 'unlucky'].includes(role.id) && player.pendingTaskAbility?.roleId === role.id;
  const gamblerCourseUsed = role.id === 'gambler' && Boolean(player.passiveUsedByChapter[`gambler-active-${engine.state.chapterIndex}`]);
  const triggerNames = {
    dice: { de: 'beim Würfeln', en: 'on a die roll' },
    event: { de: 'bei der nächsten Ereigniskarte', en: 'on the next event card' },
    ingredient: { de: 'bei der nächsten Zutatenwahl', en: 'on the next ingredient choice' }
  };
  const effectStack = engine.storedIngredientEffects();
  const applicableEffect = engine.nextStoredIngredientEffect(engine.currentIngredientEffectTrigger());
  const storedBonuses = effectStack.map((entry, index) => {
    const ingredient = engine.getIngredient(entry.ingredientId);
    const storedBy = engine.state.players.find((candidate) => candidate.id === entry.storedByPlayerId);
    const targetPlayer = engine.state.players.find((candidate) => candidate.id === entry.targetPlayerId);
    const isNext = entry.id === applicableEffect?.id;
    const provenance = storedBy
      ? (language === 'de' ? ` · eingebracht von ${escapeHtml(storedBy.name)}` : ` · added by ${escapeHtml(storedBy.name)}`)
      : '';
    const target = targetPlayer
      ? (language === 'de' ? ` · für ${escapeHtml(targetPlayer.name)}` : ` · for ${escapeHtml(targetPlayer.name)}`)
      : '';
    return `<li data-next-applicable="${isNext}"><span class="effect-stack-position">${index + 1}</span><div><strong>${ingredient ? t(ingredient.name, language) : (language === 'de' ? 'Gespeicherter Effekt' : 'Stored effect')}</strong><small>${t(INGREDIENT_EFFECT_TEXT[entry.effect], language)}</small><em>${t(triggerNames[engine.ingredientEffectTrigger(entry.effect)], language)}${target}${provenance}</em></div>${isNext ? statusTag(language === 'de' ? 'als Nächstes anwendbar' : 'next applicable', 'green') : ''}</li>`;
  }).join('');
  const passiveKey = {
    cook: `cook-ignore-${engine.state.chapterIndex}`,
    smith: `smith-reroll-${engine.state.chapterIndex}`,
    herbalist: categoryPassiveKey,
    hunter: categoryPassiveKey,
    gatherer: categoryPassiveKey,
    treasurer: 'treasurer-secure-3',
    alchemist: alchemistKey,
    tactician: key
  }[role.id] ?? null;
  const passiveEnabled = engine.isPassiveEnabled(player);
  const passiveUsed = passiveKey ? !engine.passiveUnused(player, passiveKey) : false;
  const passiveAutomatic = ['scout', 'merchant', 'treasurer', 'lucky', 'unlucky', 'gambler'].includes(role.id);
  const passiveState = !passiveEnabled
    ? statusTag(language === 'de' ? 'im nächsten Zug deaktiviert' : 'disabled next turn', 'coral')
    : passiveUsed
      ? statusTag(language === 'de' ? 'für diesen Gang genutzt' : 'used this course')
      : passiveAutomatic
        ? statusTag(language === 'de' ? 'automatisch' : 'automatic', 'blue')
        : statusTag(language === 'de' ? 'bereit, sobald die Bedingung passt' : 'ready when its condition matches', 'green');
  const activeState = player.activeUsesRemaining <= 0
    ? statusTag(language === 'de' ? 'keine Einsätze übrig' : 'no uses left', 'coral')
    : taskAbilityArmed
      ? statusTag(language === 'de' ? 'für nächste passende Aufgabe vorgemerkt' : 'armed for the next eligible task', 'blue')
      : gamblerCourseUsed
        ? statusTag(language === 'de' ? 'für diesen Gang genutzt' : 'used this course')
    : engine.state.turn.activeAbilityUsed
      ? statusTag(language === 'de' ? 'in diesem Zug bereits genutzt' : 'already used this turn')
      : canUse
        ? statusTag(language === 'de' ? 'jetzt einsetzbar' : 'available now', 'green')
        : statusTag(language === 'de' ? 'Bedingung gerade nicht erfüllt' : 'condition not currently met');
  const activeButtons = role.activeCode === 'adjustDie' && canUse
    ? `${engine.activeAbilityAvailable(-1) ? `<button class="secondary-button" type="button" data-action="use-ability" data-option="-1">${language === 'de' ? 'Wurf um −1 ändern (aktiv)' : 'Adjust roll by −1 (active)'}</button>` : ''}${engine.activeAbilityAvailable(1) ? `<button class="secondary-button" type="button" data-action="use-ability" data-option="1">${language === 'de' ? 'Wurf um +1 ändern (aktiv)' : 'Adjust roll by +1 (active)'}</button>` : ''}`
    : canUse ? `<button class="secondary-button" type="button" data-action="use-ability">${t(role.activeButton, language)}</button>` : '';
  const gamblerAbilityResult = role.id === 'gambler' && Number.isInteger(engine.state.turn.gamblerAbilityRoll)
    ? renderDieResult(
      engine.state.turn.gamblerAbilityRoll,
      language === 'de' ? `Aktiver Gambler-Wurf: ${engine.state.turn.gamblerAbilityRoll}` : `Active Gambler roll: ${engine.state.turn.gamblerAbilityRoll}`,
      `${engine.state.turn.gamblerAbilityCoinDelta >= 0 ? '+' : '−'}${Math.abs(engine.state.turn.gamblerAbilityCoinDelta)} ${language === 'de' ? 'Münzen' : 'coins'}`
    )
    : '';
  const taskAbilityNotice = taskAbilityArmed
    ? `<div class="card-effect"><strong>${language === 'de' ? 'Vorgemerkt' : 'Armed'}</strong><p>${role.id === 'lucky'
      ? (language === 'de' ? 'Die nächste passende eigene Aufgaben-Challenge erhält +2 Minuten und −2 auf ihre Münzwertung.' : 'The next eligible assigned task challenge gets +2 minutes and −2 to its coin score.')
      : (language === 'de' ? 'Die nächste passende eigene Aufgaben-Challenge erhält −2 Minuten und +2 auf ihre Münzwertung.' : 'The next eligible assigned task challenge gets −2 minutes and +2 to its coin score.')}</p></div>`
    : '';
  const passiveButtons = `${canIgnore ? `<button class="secondary-button" type="button" data-action="ignore-event">${t(role.passiveButton, language)}</button>` : ''}
    ${canUseAlchemistPassive ? `<button class="secondary-button" type="button" data-action="use-alchemist-passive">${t(role.passiveButton, language)}</button>` : ''}
    ${canUseCategoryPassive ? `<button class="secondary-button" type="button" data-action="use-category-passive">${t(role.passiveButton, language)}</button>` : ''}`;
  return `
    <section class="role-guide" aria-label="${language === 'de' ? 'Fähigkeiten der aktuellen Person' : 'Current player abilities'}">
      <div class="role-guide-header">
        <div><p class="eyebrow">${language === 'de' ? 'Deine Charakterfähigkeiten' : 'Your character abilities'}</p><h3>${role.icon} ${t(role.name, language)}</h3></div>
        ${statusTag(player.name, 'gold')}
      </div>
      <div class="role-guide-grid">
        <div class="role-ability" data-ability-kind="passive">
          <div class="ability-heading"><strong>${language === 'de' ? 'Passive Fähigkeit' : 'Passive ability'}</strong>${passiveState}</div>
          <p><b>${t(role.passive, language)}</b></p>
          <p class="ability-usage"><span>${language === 'de' ? 'So funktioniert sie:' : 'How it works:'}</span> ${t(role.passiveUsage, language)}</p>
          ${passiveButtons.trim() ? `<div class="button-row">${passiveButtons}</div>` : ''}
        </div>
        <div class="role-ability" data-ability-kind="active">
          <div class="ability-heading"><strong>${language === 'de' ? 'Aktive Fähigkeit' : 'Active ability'} · ${player.activeUsesRemaining} ${language === 'de' ? 'Einsätze übrig' : 'uses left'}</strong>${activeState}</div>
          <p><b>${t(role.active, language)}</b></p>
          <p class="ability-usage"><span>${language === 'de' ? 'Wann und wie:' : 'When and how:'}</span> ${t(role.activeUsage, language)}</p>
          ${taskAbilityNotice}
          ${gamblerAbilityResult}
          ${activeButtons ? `<div class="button-row">${activeButtons}</div>` : ''}
        </div>
      </div>
      <div class="stored-bonuses"><strong>${language === 'de' ? 'Gemeinsamer Effektstapel der Crew' : 'Shared crew effect stack'}</strong>${storedBonuses
        ? `<p>${language === 'de' ? 'Alle teilen diesen Stapel. Der älteste zum aktuellen Spielschritt passende Effekt wird zuerst verwendet.' : 'The whole crew shares this stack. The oldest effect matching the current game step is used first.'}</p><ol class="ingredient-effect-stack">${storedBonuses}</ol>`
        : `<p>${language === 'de' ? 'Der Stapel ist leer. Soforteffekte erscheinen direkt auf der Zutatenkarte.' : 'The stack is empty. Immediate effects appear directly on the ingredient card.'}</p>`}</div>
    </section>`;
}

function renderDrawCard(engine, language) {
  const preview = engine.nextEventPreview();
  const scoutPreview = engine.activePlayer.roleId === 'scout' && engine.isPassiveEnabled(engine.activePlayer);
  const group = engine.activeGroup;
  const copy = stageCopy(engine, language);
  return `
    <article class="game-card">
      ${renderCourseFlow(engine, language)}
      <p class="eyebrow">${copy.label} · ${t(engine.currentChapter.locations[group.locationIndex], language)}</p>
      <h2>${copy.title}</h2>
      <p class="card-story">${copy.lead}</p>
      ${preview ? `<div class="card-effect"><strong>${scoutPreview ? (language === 'de' ? 'Kundschafter-Vorschau' : 'Scout preview') : (language === 'de' ? 'Apfel-Vorschau' : 'Apple preview')}:</strong><br>${t(preview.title, language)}</div>` : ''}
      <div class="next-action"><strong>${language === 'de' ? `${engine.activePlayer.name}, du bist dran.` : `${engine.activePlayer.name}, it is your turn.`}</strong><span>${language === 'de' ? 'Ziehe genau eine Karte aus dem jetzt passenden Deck.' : 'Draw exactly one card from the deck that matches the current state.'}</span></div>
      <button class="primary-button" type="button" data-action="draw-event">${copy.button}</button>
    </article>`;
}

function renderStoryEventCard(engine, language) {
  const card = engine.currentEvent;
  if (['island', 'location'].includes(card.storyKind)) {
    const islandStory = card.storyKind === 'island';
    return `
      <article class="game-card story-${card.storyKind}-card">
        ${renderCourseFlow(engine, language)}
        <div class="card-row">
          <p class="eyebrow">${language === 'de'
            ? (islandStory ? 'Verbindliche Inselgeschichte' : 'Verbindliche Ortsgeschichte')
            : (islandStory ? 'Required island story' : 'Required location story')} · ${escapeHtml(card.id)}</p>
          ${statusTag(language === 'de' ? 'Laut vorlesen' : 'Read aloud', 'gold')}
        </div>
        <h2>${t(card.title, language)}</h2>
        <p class="card-story">${t(card.story, language)}</p>
        <div class="card-effect"><strong>${language === 'de'
          ? (islandStory ? 'Diese Chronik eröffnet die neue Insel.' : 'Diese Chronik gehört zu diesem Ort.')
          : (islandStory ? 'This chronicle opens the new island.' : 'This chronicle belongs to this location.')}</strong><p>${language === 'de' ? 'Lest die Geschichte der Crew laut vor. Details daraus können später auf einer Erinnerungskarte abgefragt werden.' : 'Read the story aloud to the crew. A later memory card may ask about its details.'}</p></div>
        <button class="primary-button" type="button" data-action="complete-story-card">${language === 'de' ? 'Geschichte vorgelesen' : 'Story read aloud'}</button>
      </article>`;
  }
  const answers = card.answers.map((answer) => `
    <button type="button" class="choice-button" data-action="answer-story-quiz" data-answer-id="${escapeHtml(answer.id)}">${t(answer.label, language)}</button>`).join('');
  const wrongAnswerCoins = Math.abs(engine.coinLossPreview(-3).amount ?? -3);
  return `
    <article class="game-card story-quiz-card">
      ${renderCourseFlow(engine, language)}
      <div class="card-row">
        <p class="eyebrow">${language === 'de' ? 'Erinnerungskarte' : 'Memory card'} · ${escapeHtml(card.id)}</p>
        ${statusTag(language === 'de' ? `+3 / −${wrongAnswerCoins} Münzen` : `+3 / −${wrongAnswerCoins} coins`, 'gold')}
      </div>
      <h2>${t(card.title, language)}</h2>
      <p class="card-story">${t(card.question, language)}</p>
      <div class="card-effect"><strong>${language === 'de' ? 'Die aktive Person entscheidet.' : 'The active player decides.'}</strong><p>${language === 'de' ? `Richtige Antwort: +3 Münzen · falsche Antwort: −${wrongAnswerCoins} Münzen.` : `Correct answer: +3 coins · wrong answer: −${wrongAnswerCoins} coins.`}</p></div>
      <div class="choice-list">${answers}</div>
    </article>`;
}

function renderEventCard(engine, language) {
  const event = engine.currentEvent;
  if (event?.storyKind) return renderStoryEventCard(engine, language);
  const pauseBlocked = event.archetype === 'respite' && !event.options?.includes('fiveMinuteBreak');
  const choices = event.options?.map((code) => {
    const ingredientTarget = ['lockIngredient', 'returnIngredient', 'swapIngredient'].includes(code)
      ? engine.ingredientActionTarget()
      : null;
    const targetAttribute = ingredientTarget ? ` data-ingredient-id="${escapeHtml(ingredientTarget.id)}"` : '';
    return `
    <button type="button" class="choice-button" data-action="resolve-choice" data-choice="${code}"${targetAttribute}>${eventActionText(engine, code, language)}</button>`;
  }).join('') ?? '';
  const copy = STAGE_COPY[event.stage]?.[language] ?? stageCopy(engine, language);
  return `
    <article class="game-card">
      ${renderCourseFlow(engine, language)}
      <div class="card-row">
        <p class="eyebrow">${copy.label} · ${escapeHtml(event.id)}</p>
        ${statusTag(event.type === 'dice' ? 'W6' : (language === 'de' ? 'Entscheidung' : 'Decision'))}
      </div>
      <h2>${t(event.title, language)}</h2>
      <p class="card-story">${t(event.story, language)}</p>
      ${pauseBlocked ? `<div class="card-effect"><strong>${language === 'de' ? 'Noch keine Pause:' : 'No break yet:'}</strong> ${language === 'de' ? 'Die Pausenoption erscheint erst, wenn alle offenen Küchenaufgaben erledigt markiert sind.' : 'The break option appears only after every open kitchen task has been marked complete.'}</div>` : ''}
      ${event.type === 'choice'
        ? `${event.options.length > 1 ? `<div class="card-effect"><strong>${language === 'de' ? 'Die Crew darf beraten. Die endgültige Wahl trifft die aktive Person.' : 'The crew may discuss. The active player makes the final choice.'}</strong></div>` : ''}<div class="choice-list">${choices}</div>`
        : `<div class="card-effect">${language === 'de' ? 'Würfelt und folgt dem passenden Ergebnis: 1–2, 3–4 oder 5–6.' : 'Roll and follow the matching result: 1–2, 3–4, or 5–6.'}</div>
           <button class="primary-button" type="button" data-action="roll-die">${tx('roll', language)}</button>`}
    </article>`;
}

function renderRolledCard(engine, language) {
  const event = engine.currentEvent;
  const value = engine.state.turn.dieResult;
  const outcomeIndex = value <= 2 ? 0 : value <= 4 ? 1 : 2;
  const outcomeCode = event.outcomes[outcomeIndex];
  const smithKey = `smith-reroll-${engine.state.chapterIndex}`;
  const canReroll = engine.activePlayer.roleId === 'smith' && engine.passiveUnused(engine.activePlayer, smithKey);
  const nextDiceEffect = engine.nextStoredIngredientEffect('dice');
  const hasStoredReroll = nextDiceEffect?.effect === 'rerollDie';
  const hasStoredAdjustment = nextDiceEffect?.effect === 'adjustDie';
  const hasStoredDouble = nextDiceEffect?.effect === 'doubleDie';
  const storedEffectNotes = [
    hasStoredReroll ? (language === 'de'
      ? 'Du darfst diesen Wurf einmal wiederholen. Wenn du den Wurf direkt ausführst, verfällt der gespeicherte Effekt.'
      : 'You may reroll this result once. If you resolve the roll directly, the stored effect expires.') : '',
    hasStoredAdjustment ? (language === 'de'
      ? 'Du darfst diesen Wurf einmal um genau 1 erhöhen oder senken. Wenn du den Wurf direkt ausführst, verfällt der gespeicherte Effekt.'
      : 'You may increase or decrease this result by exactly 1 once. If you resolve the roll directly, the stored effect expires.') : '',
    hasStoredDouble ? (language === 'de'
      ? 'Beim Ausführen zählt dieser Wurf doppelt, höchstens jedoch als 6.'
      : 'When resolved, this roll counts double, up to a maximum of 6.') : ''
  ].filter(Boolean);
  return `
    <article class="game-card">
      <p class="eyebrow">${escapeHtml(event.id)} · ${tx('outcome', language)}</p>
      <h2>${t(event.title, language)}</h2>
      <div class="dice-stage" data-rolling="false">
         <div class="die-scene" aria-label="${language === 'de' ? 'Würfel rollt' : 'Die rolling'}">
          ${renderDieCube(value)}
        </div>
        <div class="dice-reveal"><span>${language === 'de' ? `Gewürfelt: ${value}` : `Rolled: ${value}`}</span><strong>${eventActionText(engine, outcomeCode, language)}</strong></div>
      </div>
      <div class="button-row dice-actions">
        <button class="primary-button" type="button" data-action="confirm-roll">${tx('resolve', language)}</button>
        ${canReroll ? `<button class="secondary-button" type="button" data-action="reroll-die">${tx('rollAgain', language)} · ${t(getRole('smith').name, language)}</button>` : ''}
        ${hasStoredReroll ? `<button class="secondary-button" type="button" data-action="reroll-ingredient-die">${language === 'de' ? 'Gespeicherten Neuwurf einsetzen' : 'Use stored reroll'}</button>` : ''}
        ${hasStoredAdjustment && engine.canAdjustDieWithIngredient(-1) ? `<button class="secondary-button" type="button" data-action="adjust-ingredient-die" data-option="-1">${language === 'de' ? 'Gespeicherten Effekt: −1' : 'Stored effect: −1'}</button>` : ''}
        ${hasStoredAdjustment && engine.canAdjustDieWithIngredient(1) ? `<button class="secondary-button" type="button" data-action="adjust-ingredient-die" data-option="1">${language === 'de' ? 'Gespeicherten Effekt: +1' : 'Stored effect: +1'}</button>` : ''}
      </div>
      ${storedEffectNotes.length ? `<div class="card-effect"><strong>${language === 'de' ? 'Gespeicherte Zutateneffekte' : 'Stored ingredient effects'}</strong><br>${storedEffectNotes.join('<br>')}</div>` : ''}
    </article>`;
}

function renderIngredientChoice(engine, language) {
  const event = engine.currentEvent;
  const cocktailTeam = engine.currentChapter.id === 'cocktails' ? engine.activePlayer.cocktailTeam : null;
  const cocktailChoiceNote = cocktailTeam === 'alcoholic'
    ? (language === 'de' ? `Die Auswahl wird der alkoholischen Zutatenliste von ${escapeHtml(engine.activePlayer.name)}s Team zugeordnet.` : `The choice is added to ${escapeHtml(engine.activePlayer.name)}’s alcoholic ingredient list.`)
    : cocktailTeam === 'alcohol-free'
      ? (language === 'de' ? `Die Auswahl wird der alkoholfreien Zutatenliste von ${escapeHtml(engine.activePlayer.name)}s Team zugeordnet; Spirituosen werden hier nicht angeboten.` : `The choice is added to ${escapeHtml(engine.activePlayer.name)}’s alcohol-free ingredient list; spirits are not offered here.`)
      : null;
  const choices = engine.state.turn.pendingIngredientIds.map((ingredientId) => {
    const ingredient = engine.getIngredient(ingredientId);
    const effect = INGREDIENT_EFFECT_TEXT[ingredient.effect] ?? { de: 'Kein zusätzlicher Karteneffekt.', en: 'No additional card effect.' };
    const canIgnore = engine.canCookIgnoreIngredientEffect(ingredient.id);
    return `
      <div class="ingredient-choice-card">
        <button type="button" class="choice-button" data-action="choose-ingredient" data-ingredient-id="${escapeHtml(ingredient.id)}">
          <strong>${t(ingredient.name, language)}</strong>
        </button>
        <p>${t(effect, language)}</p>
        ${ingredient.effect ? `<small>${engine.ingredientEffectTrigger(ingredient.effect)
          ? (language === 'de' ? 'Der Effekt kommt hinten auf den gemeinsamen Effektstapel der Crew.' : 'The effect is added to the back of the shared crew effect stack.')
          : (language === 'de' ? 'Dieser Effekt löst direkt nach der Auswahl aus.' : 'This effect resolves immediately after selection.')}</small>` : ''}
        ${canIgnore ? `<button type="button" class="quiet-button" data-action="choose-ingredient-ignore" data-ingredient-id="${escapeHtml(ingredient.id)}">${language === 'de' ? 'Nehmen, Effekt als Koch ignorieren' : 'Take it and ignore the effect as Cook'}</button>` : ''}
      </div>`;
  }).join('');
  return `
    <article class="game-card">
      ${renderCourseFlow(engine, language)}
      <p class="eyebrow">${language === 'de' ? 'Vorratsereignis · aktive Entscheidung' : 'Provision event · active decision'}</p>
      <h2>${event ? t(event.title, language) : (language === 'de' ? 'Welchen Proviant nehmt ihr mit?' : 'Which provision do you take?')}</h2>
      <p class="card-story">${language === 'de' ? 'Besprecht die angebotenen Zutaten. Die aktive Person wählt eine Karte; sie bleibt veränderbar, bis ein späteres Ereignis sie festlegt.' : 'Discuss the offered ingredients. The active player chooses one card; it remains changeable until a later event locks it.'}${cocktailChoiceNote ? ` ${cocktailChoiceNote}` : ''}</p>
      <div class="choice-list">${choices}</div>
    </article>`;
}

function renderSoupStyleChoice(engine, language) {
  return `<article class="game-card">
    ${renderCourseFlow(engine, language)}
    <p class="eyebrow">${language === 'de' ? 'Suppen-Quest · Grundentscheidung' : 'Soup quest · core decision'}</p>
    <h2>${language === 'de' ? 'Wird es eine klare Suppe oder eine Cremesuppe?' : 'Will it be a clear soup or a cream soup?'}</h2>
    <p class="card-story">${language === 'de'
      ? 'Brühe, Wasser, Öl, Essig, Sahne, frische Kräuter und andere Grundvorräte werden nicht erspielt. Diese Wahl bestimmt nur die Zubereitungs-Quest: sichtbare Einlagen oder späteres Pürieren.'
      : 'Stock, water, oil, vinegar, cream, fresh herbs, and other pantry staples are not played ingredients. This choice only determines the preparation quest: visible pieces or later blending.'}</p>
    <div class="choice-list">
      <button class="choice-button" type="button" data-action="choose-soup-style" data-style="clear"><strong>${language === 'de' ? 'Klare Suppe' : 'Clear soup'}</strong><small>&nbsp;– ${language === 'de' ? 'Einlagen bleiben sichtbar; nicht pürieren.' : 'Pieces remain visible; do not blend.'}</small></button>
      <button class="choice-button" type="button" data-action="choose-soup-style" data-style="cream"><strong>${language === 'de' ? 'Cremesuppe' : 'Cream soup'}</strong><small>&nbsp;– ${language === 'de' ? 'Weich garen und anschließend sicher pürieren.' : 'Cook until tender and blend safely afterwards.'}</small></button>
    </div>
  </article>`;
}

function renderCocktailTechniqueChoice(engine, language) {
  const team = engine.state.turn.pendingCocktailTeam ?? engine.nextCocktailTechniqueTeam();
  const alcoholic = team === 'alcoholic';
  const teamName = alcoholic
    ? (language === 'de' ? 'alkoholische Cocktail' : 'alcoholic cocktail')
    : (language === 'de' ? 'alkoholfreie Cocktail' : 'alcohol-free cocktail');
  const teamNameAccusative = alcoholic
    ? (language === 'de' ? 'alkoholischen Cocktail' : 'alcoholic cocktail')
    : (language === 'de' ? 'alkoholfreien Cocktail' : 'alcohol-free cocktail');
  return `<article class="game-card">
    ${renderCourseFlow(engine, language)}
    <p class="eyebrow">${language === 'de' ? 'Cocktail-Quest · verbindliche Rezeptentscheidung' : 'Cocktail quest · required recipe decision'}</p>
    <h2>${language === 'de' ? `Wird der ${teamName} gemixt oder gerührt?` : `Will the ${teamName} be blended or stirred?`}</h2>
    <p class="card-story">${language === 'de'
      ? `${escapeHtml(engine.activePlayer.name)} trifft diese Entscheidung als Mitglied des zuständigen Teams. Die Wahl gilt für dessen gesamte Zutatenliste und wird später im Mischauftrag angezeigt. Eis ist für beide Varianten verbindlicher Grundvorrat und keine erspielbare Zutatenkarte.`
      : `${escapeHtml(engine.activePlayer.name)} makes this decision as a member of the responsible team. It applies to that team’s entire ingredient list and is shown later in its mixing job. Ice is required basic stock for both versions, not a playable ingredient card.`}</p>
    <div class="choice-list">
      <button class="choice-button" type="button" data-action="choose-cocktail-technique" data-team="${team}" data-technique="mixed"><strong>${language === 'de' ? 'Mixen' : 'Blend'}</strong><small>&nbsp;– ${language === 'de' ? 'Portionsweise im Mixer gleichmäßig verbinden.' : 'Combine evenly in batches using a blender.'}</small></button>
      <button class="choice-button" type="button" data-action="choose-cocktail-technique" data-team="${team}" data-technique="stirred"><strong>${language === 'de' ? 'Rühren' : 'Stir'}</strong><small>&nbsp;– ${language === 'de' ? 'Mit Eis im Krug gründlich kalt rühren.' : 'Stir thoroughly with ice in a jug until cold.'}</small></button>
    </div>
    <div class="next-action"><strong>${language === 'de'
      ? `Die Entscheidung gilt verbindlich für den ${teamNameAccusative}.`
      : `The decision is binding for the ${teamName}.`}</strong><span>${language === 'de'
        ? alcoholic ? 'Danach folgt dieselbe Frage für den alkoholfreien Cocktail.' : 'Danach beginnt der Aufgabenstapel für die Cocktailzubereitung.'
        : alcoholic ? 'The same question for the alcohol-free cocktail follows next.' : 'The cocktail preparation task deck begins afterwards.'}</span></div>
  </article>`;
}

function renderCocktailSpiritCountChoice(engine, language) {
  const availableCounts = engine.availableCocktailSpiritCounts();
  return `<article class="game-card">
    ${renderCourseFlow(engine, language)}
    <p class="eyebrow">${language === 'de' ? 'Cocktail-Quest · Spirituosenauswahl' : 'Cocktail quest · spirit selection'}</p>
    <h2>${language === 'de' ? 'Wie viele Spirituosensorten kommen in den alkoholischen Cocktail?' : 'How many spirits go into the alcoholic cocktail?'}</h2>
    <p class="card-story">${language === 'de'
      ? `${escapeHtml(engine.activePlayer.name)} entscheidet als Mitglied des alkoholischen Teams, ob eine, zwei oder drei verschiedene noch verfügbare Spirituosensorten erspielt werden. Nur Mitglieder dieses Teams bekommen Spirituosen bei der Zutatenwahl angeboten.`
      : `${escapeHtml(engine.activePlayer.name)} decides as a member of the alcoholic team whether one, two, or three remaining spirits must be played. Only members of that team are offered spirits during ingredient selection.`}</p>
    <div class="choice-list">
      ${availableCounts.map((count) => `<button class="choice-button" type="button" data-action="choose-cocktail-spirit-count" data-count="${count}"><strong>${count} ${language === 'de' ? (count === 1 ? 'Spirituosensorte' : 'Spirituosensorten') : (count === 1 ? 'spirit' : 'spirits')}</strong><small>&nbsp;– ${language === 'de' ? 'wird anschließend durch Zutatenkarten verbindlich festgelegt.' : 'will then be locked in through ingredient cards.'}</small></button>`).join('')}
    </div>
  </article>`;
}

function renderCocktailTeamChoice(engine, language) {
  const availableTeams = engine.availableCocktailTeamChoices();
  const selectionNumber = (engine.state.chapter.cocktailTeamSelectionIndex ?? 0) + 1;
  const totalSelections = engine.state.chapter.cocktailTeamSelectionPlayerIds?.length ?? engine.state.players.length;
  const onlyOneTeamOpen = availableTeams.length === 1;
  const choice = (team, title, description, tone) => availableTeams.includes(team)
    ? `<button class="choice-button" type="button" data-action="choose-cocktail-team" data-team="${team}"><strong>${title}</strong><small>${description}</small>${statusTag(team === 'alcoholic'
      ? (language === 'de' ? `${engine.cocktailTeamMembers(team).length} bisher mit Alkohol` : `${engine.cocktailTeamMembers(team).length} currently alcoholic`)
      : (language === 'de' ? `${engine.cocktailTeamMembers(team).length} bisher alkoholfrei` : `${engine.cocktailTeamMembers(team).length} currently alcohol-free`), tone)}</button>`
    : '';
  return `<article class="game-card cocktail-team-choice-card">
    ${renderCourseFlow(engine, language)}
    <p class="eyebrow">${language === 'de' ? `Cocktail-Teamwahl · ${selectionNumber} von ${totalSelections}` : `Cocktail team choice · ${selectionNumber} of ${totalSelections}`}</p>
    <h2>${language === 'de' ? `${escapeHtml(engine.activePlayer.name)}, welche Variante trinkst du?` : `${escapeHtml(engine.activePlayer.name)}, which version will you drink?`}</h2>
    <p class="card-story">${language === 'de'
      ? 'Deine Wahl bestimmt, bei welcher der beiden Mischungen du später als Konsumentin oder Konsument mitarbeitest. Gemeinsame Grundlagen und das Servieren bleiben Aufgaben der ganzen Crew.'
      : 'Your choice determines which of the two mixes you will later prepare as one of its consumers. Shared bases and serving remain whole-crew jobs.'}</p>
    <div class="card-effect"><strong>${language === 'de' ? 'Beide Varianten brauchen mindestens eine Person.' : 'Both versions need at least one player.'}</strong><span>${onlyOneTeamOpen
      ? (language === 'de' ? 'Für die letzte offene Wahl bleibt deshalb die noch unbesetzte Variante.' : 'The final open choice therefore fills the version that still has no player.')
      : (language === 'de' ? 'Nach deiner Wahl wird das Tablet direkt an die nächste Person weitergegeben.' : 'After your choice, pass the tablet directly to the next player.')}</span></div>
    <div class="choice-list">
      ${choice('alcoholic', language === 'de' ? 'Ich trinke den Cocktail mit Alkohol' : 'I will drink the alcoholic cocktail', language === 'de' ? 'Du gehörst zum Team für die alkoholische Mischung.' : 'You join the team for the alcoholic mix.', 'coral')}
      ${choice('alcohol-free', language === 'de' ? 'Ich trinke alkoholfrei' : 'I will drink alcohol-free', language === 'de' ? 'Du gehörst zum Team für die alkoholfreie Mischung.' : 'You join the team for the alcohol-free mix.', 'green')}
    </div>
  </article>`;
}

function renderIngredientEffectChoice(engine, language) {
  const pending = engine.state.turn.pendingEffect;
  const categoryNames = {
    tapas: { de: 'Tapas', en: 'Tapas' }, vegetable: { de: 'Gemüse', en: 'Vegetables' }, meat: { de: 'Fleisch', en: 'Meat' },
    pantry: { de: 'Vorrat', en: 'Pantry' }, fruit: { de: 'Obst', en: 'Fruit' }, dessert: { de: 'Dessert', en: 'Dessert' },
    alcohol: { de: 'Alkohol', en: 'Alcohol' }, drinks: { de: 'Getränke', en: 'Drinks' }
  };
  const isPlayerChoice = pending?.code === 'disablePassive';
  const title = isPlayerChoice
    ? (language === 'de' ? 'Welche passive Fähigkeit pausiert?' : 'Whose passive ability pauses?')
    : (language === 'de' ? 'Welcher Zutatenstapel wird getauscht?' : 'Which ingredient deck is swapped?');
  const choices = (pending?.options ?? []).map((option) => {
    const player = isPlayerChoice ? engine.state.players.find((candidate) => candidate.id === option) : null;
    const role = player ? getRole(player.roleId) : null;
    const label = player ? `${player.name} · ${t(role.name, language)}` : t(categoryNames[option] ?? { de: option, en: option }, language);
    return `<button type="button" class="choice-button" data-action="resolve-ingredient-effect" data-option="${escapeHtml(option)}">${escapeHtml(label)}</button>`;
  }).join('');
  return `
    <article class="game-card">
      <p class="eyebrow">${language === 'de' ? 'Zutatenkarteneffekt' : 'Ingredient card effect'}</p>
      <h2>${title}</h2>
      <div class="choice-list">${choices}</div>
    </article>`;
}

function renderTaskAssigneeChoice(engine, language) {
  const pending = engine.state.turn.pendingTaskAssignment;
  const card = pending ? engine.getTaskCard({ taskId: pending.taskId }) : null;
  const group = pending ? engine.state.groups.find((candidate) => candidate.id === pending.groupId) : null;
  if (!pending || !card || !group) return renderDrawCard(engine, language);
  const selected = new Set(pending.selectedPlayerIds ?? []);
  const recommended = new Set(pending.recommendedPlayerIds ?? []);
  const freePlayers = engine.prioritizedFreePlayersForTask(group, card);
  const cocktailTeam = engine.cocktailTeamForTask(card);
  const choices = freePlayers.map((player) => {
    const role = getRole(player.roleId);
    const isSelected = selected.has(player.id);
    const isRecommended = recommended.has(player.id);
    return `<button type="button" class="choice-button task-assignee-option" data-action="toggle-task-assignee" data-player-id="${escapeHtml(player.id)}" data-selected="${isSelected}" aria-pressed="${isSelected}">
      <strong>${escapeHtml(player.name)}</strong><small>${role.icon} ${t(role.name, language)} · ${player.turns} ${language === 'de' ? 'Züge' : 'turns'}${isRecommended ? ` · ${language === 'de' ? 'fairer Vorschlag' : 'fair suggestion'}` : ''}</small>
    </button>`;
  }).join('');
  const complete = selected.size === pending.requiredPeople;
  return `
    <article class="game-card">
      ${renderCourseFlow(engine, language)}
      <p class="eyebrow">${language === 'de' ? 'Auftragsereignis · Crew wählen' : 'Work-order event · choose crew'}</p>
      <h2>${language === 'de' ? `Wer übernimmt „${t(card.title, language)}“?` : `Who takes “${t(card.title, language)}”?`}</h2>
      <p class="card-story">${t(card.instruction, language)}</p>
      <div class="card-effect"><strong>${language === 'de'
        ? `${engine.activePlayer.name} wählt genau ${pending.requiredPeople} ${pending.requiredPeople === 1 ? 'freie Person' : 'freie Personen'}. Die Crew darf beraten.`
        : `${engine.activePlayer.name} chooses exactly ${pending.requiredPeople} free ${pending.requiredPeople === 1 ? 'person' : 'people'}. The crew may discuss.`}</strong>${cocktailTeam ? `<span>${language === 'de' ? `Für diesen Auftrag stehen nur freie Personen aus dem ${cocktailTeam === 'alcoholic' ? 'alkoholischen' : 'alkoholfreien'} Cocktail-Team zur Wahl.` : `Only free people from the ${cocktailTeam === 'alcoholic' ? 'alcoholic' : 'alcohol-free'} cocktail team can be chosen for this job.`}</span>` : ''}</div>
      <div class="choice-list task-assignee-choices">${choices}</div>
      <div class="next-action"><strong>${language === 'de' ? `${selected.size}/${pending.requiredPeople} ausgewählt` : `${selected.size}/${pending.requiredPeople} selected`}</strong><span>${language === 'de' ? 'Vorbelegt sind freie Personen mit besonders vielen bisherigen Zügen. Die Auswahl darf geändert werden.' : 'Free players with the most completed turns are preselected. You may change the choice.'}</span></div>
      <button class="primary-button" type="button" data-action="confirm-task-assignees" ${complete ? '' : 'disabled'}>${language === 'de' ? 'Besetzung bestätigen' : 'Confirm crew'}</button>
    </article>`;
}

function renderTaskBriefing(engine, language) {
  const instance = engine.state.tasks.find((task) => task.instanceId === engine.state.turn.assignedTaskId);
  const card = instance ? engine.getTaskCard(instance) : null;
  if (!instance || !card) return renderDrawCard(engine, language);
  const assigned = instance.assignedPlayerIds
    .map((playerId) => engine.state.players.find((player) => player.id === playerId)?.name)
    .filter(Boolean);
  const event = engine.currentEvent;
  const cocktailTeam = engine.cocktailTeamForTask(card);
  const background = instance.timingMode === 'background';
  const manual = instance.timingMode === 'manual';
  const timerMinutes = background ? instance.backgroundMinutes : manual ? 0 : instance.challengeMinutes;
  const taskAbilityTags = (instance.taskAbilityAdjustments ?? []).map((adjustment) => {
    const owner = engine.state.players.find((player) => player.id === adjustment.playerId);
    const roleName = t(getRole(adjustment.roleId)?.name ?? { de: adjustment.roleId, en: adjustment.roleId }, language);
    const time = `${adjustment.timeMinutes > 0 ? '+' : '−'}${Math.abs(adjustment.timeMinutes)} min`;
    const coins = `${adjustment.coinDelta > 0 ? '+' : '−'}${Math.abs(adjustment.coinDelta)} ${language === 'de' ? 'Münzwertung' : 'coin score'}`;
    return statusTag(`${escapeHtml(owner?.name ?? roleName)} · ${roleName}: ${time} · ${coins}`, adjustment.roleId === 'lucky' ? 'green' : 'coral');
  }).join('');
  const after = engine.state.turn.taskBriefingEndsTurn
    ? (language === 'de' ? 'Danach wird das Tablet weitergegeben; die Aufgabe läuft unabhängig von den nächsten Zügen weiter.' : 'Then pass the tablet; the task continues independently of later turns.')
    : (language === 'de' ? 'Danach wird sichtbar an die nächste freie Person in Zugreihenfolge übergeben. Wer diese Aufgabe übernimmt, wird übersprungen.' : 'Then the tablet visibly passes to the next free player in turn order. Anyone taking this task is skipped.');
  return `
    <article class="game-card">
      ${renderCourseFlow(engine, language)}
      <p class="eyebrow">${t(card.questName, language)} · ${language === 'de' ? 'Questschritt' : 'quest step'} ${engine.questStepNumber(card)}</p>
      <h2>${t(card.title, language)}</h2>
      ${event
        ? `<p class="card-story">${t(event.story, language)}</p>`
        : `<p class="card-story">${card.questId === 'reset'
          ? (language === 'de' ? 'Bevor der neue Gang geplant wird, macht die Crew den Tisch gemeinsam für die nächste Etappe frei.' : 'Before planning the new course, the crew clears the table together for the next stage.')
          : (language === 'de' ? 'Die Spaßkarten des Auftakts sind beendet. Jetzt führt die gezogene Auftragskarte in die echte Küchenarbeit.' : 'The opening fun cards are complete. This work-order card now leads into the real kitchen work.')}</p>`}
      <div class="task-briefing">
        <strong>${language === 'de' ? 'Konkreter Auftrag' : 'Concrete job'}</strong>
        <p>${t(card.instruction, language)}</p>
        <div class="stat-strip">
          ${statusTag(`${language === 'de' ? 'Verantwortlich' : 'Responsible'}: ${assigned.map(escapeHtml).join(', ')}`, 'blue')}
          ${cocktailTeam ? statusTag(language === 'de' ? `Rezeptkorb: ${cocktailTeam === 'alcoholic' ? 'alkoholisch' : 'alkoholfrei'}` : `Recipe basket: ${cocktailTeam === 'alcoholic' ? 'alcoholic' : 'alcohol-free'}`, cocktailTeam === 'alcoholic' ? 'coral' : 'green') : ''}
          ${manual
            ? statusTag(language === 'de' ? 'Nach Gargrad · kein Spieltimer' : 'By doneness · no game timer', 'blue')
            : statusTag(`${timerMinutes} min`, background ? 'blue' : 'gold')}
          ${statusTag(manual
            ? (language === 'de' ? 'Manuell abhaken · keine Zeitwertung' : 'Check off manually · no time score')
            : background
              ? (language === 'de' ? 'Hintergrundtimer · keine Belohnung oder Strafe' : 'Background timer · no reward or penalty')
              : (language === 'de' ? 'Kurze Arbeits-Challenge mit Münzwertung' : 'Short scored work challenge'), (background || manual) ? 'blue' : 'coral')}
          ${taskAbilityTags}
        </div>
        ${taskAbilityTags ? `<p class="muted">${language === 'de' ? 'Die passive Verluständerung der beteiligten Figur wird bei einer negativen Wertung zusätzlich angewendet.' : 'The participating character’s passive loss modifier is additionally applied if the score is negative.'}</p>` : ''}
      </div>
      <button class="primary-button" type="button" data-action="accept-task">${manual
        ? (language === 'de' ? 'Aufgabe ohne Spieltimer übernehmen' : 'Take task without game timer')
        : background
          ? (language === 'de' ? 'Questschritt übernehmen & Hintergrundtimer starten' : 'Take quest step & start background timer')
          : (language === 'de' ? 'Aufgabe übernehmen & Arbeits-Challenge starten' : 'Take task & start work challenge')}</button>
      ${renderIngredientBasket(engine, instance, language)}
      <div class="next-action"><strong>${language === 'de' ? `${assigned.map(escapeHtml).join(' & ')} übernehmen diese Aufgabe jetzt.` : `${assigned.map(escapeHtml).join(' & ')} take this task now.`}</strong><span>${after}</span></div>
    </article>`;
}

function renderResolvedCard(engine, language) {
  const event = engine.currentEvent;
  if (event?.storyKind) {
    const quiz = event.storyKind === 'quiz';
    const correctAnswer = quiz ? event.answers.find((answer) => answer.id === event.correctAnswerId) : null;
    const correct = engine.state.turn.storyAnswerCorrect;
    const storyCoins = Number(engine.state.turn.storyCoinDelta) || 0;
    const storyCoinText = `${storyCoins >= 0 ? '+' : '−'}${Math.abs(storyCoins)}`;
    const nextPlayerIndex = engine.nextFreePlayerIndex(engine.state.activePlayerIndex);
    const nextPlayer = nextPlayerIndex == null ? null : engine.state.players[nextPlayerIndex];
    return `
      <article class="game-card ${quiz ? 'story-quiz-card' : 'story-location-card'}">
        <p class="eyebrow">${quiz ? (language === 'de' ? 'Erinnerung ausgewertet' : 'Memory checked') : (language === 'de' ? 'Ortsgeschichte gehört' : 'Location story heard')}</p>
        <h2>${t(event.title, language)}</h2>
        <div class="card-effect"><strong>${quiz
          ? correct
            ? (language === 'de' ? `Richtig · ${storyCoinText} Münzen` : `Correct · ${storyCoinText} coins`)
            : (language === 'de' ? `Leider falsch · ${storyCoinText} Münzen` : `Not quite · ${storyCoinText} coins`)
          : (language === 'de' ? 'Die Chronik dieses Ortes ist jetzt Teil eurer Reise.' : 'This location’s chronicle is now part of your voyage.')}</strong>${quiz ? `<p>${language === 'de' ? 'Richtige Antwort' : 'Correct answer'}: ${t(correctAnswer.label, language)}</p>` : ''}</div>
        <p>${nextPlayer
          ? `${tx('handTablet', language)} ${escapeHtml(nextPlayer.name)}.`
          : (language === 'de' ? 'Danach wartet die Zugfolge auf die nächste freie Person.' : 'The turn order then waits for the next free player.')}</p>
        <button class="primary-button" type="button" data-action="end-turn">${nextPlayer ? tx('handOver', language) : (language === 'de' ? 'Zug beenden & warten' : 'End turn & wait')}</button>
      </article>`;
  }
  const code = engine.state.turn.outcomeCode;
  const chain = engine.state.turn.chainPending;
  const nextPlayerIndex = engine.nextFreePlayerIndex(engine.state.activePlayerIndex);
  const nextPlayer = nextPlayerIndex == null ? null : engine.state.players[nextPlayerIndex];
  const resolvedIngredient = engine.state.turn.resolvedIngredientEffect
    ? engine.getIngredient(engine.state.turn.resolvedIngredientId)
    : null;
  const resolvedIngredientEffect = resolvedIngredient ? t(INGREDIENT_EFFECT_TEXT[engine.state.turn.resolvedIngredientEffect], language) : null;
  const effectMode = engine.state.turn.resolvedIngredientEffectMode;
  const gamblerLossResult = code === 'coinLoss' && Number.isInteger(engine.state.turn.gamblerLossRoll)
    ? renderDieResult(
      engine.state.turn.gamblerLossRoll,
      language === 'de' ? `Passiver Gambler-Wurf: ${engine.state.turn.gamblerLossRoll}` : `Passive Gambler roll: ${engine.state.turn.gamblerLossRoll}`,
      `${language === 'de' ? 'Tatsächlicher Verlust' : 'Actual loss'}: −${Math.abs(engine.state.turn.coinChangeApplied ?? 0)} ${language === 'de' ? 'Münzen' : 'coins'}`
    )
    : '';
  const handoverText = chain
    ? (language === 'de' ? 'Die Ereigniskette geht für dieselbe Person weiter.' : 'The event chain continues for the same player.')
    : nextPlayer
      ? `${tx('handTablet', language)} ${escapeHtml(nextPlayer.name)}.${nextPlayerIndex !== (engine.state.activePlayerIndex + 1) % engine.state.players.length
        ? ` ${language === 'de' ? 'Beschäftigte Personen werden dabei übersprungen.' : 'Busy players are skipped.'}`
        : ''}`
      : (language === 'de'
        ? 'Danach pausiert die Zugfolge, bis eine Aufgabe erledigt und die nächste freie Person in Reihenfolge übergeben wurde.'
        : 'Turn order then pauses until a task is completed and the next free player in sequence receives the handover.');
  return `
    <article class="game-card">
      <p class="eyebrow">${tx('outcome', language)}</p>
      <h2>${t(event?.title ?? { de: 'Aktion abgeschlossen', en: 'Action complete' }, language)}</h2>
      <div class="card-effect"><strong>${code === 'ignored'
        ? (language === 'de' ? 'Der Effekt wurde ignoriert.' : 'The effect was ignored.')
        : eventActionText(engine, code, language)}</strong></div>
      ${gamblerLossResult}
      ${resolvedIngredient ? `<div class="card-effect ingredient-result-effect"><strong>${language === 'de' ? `Zutateneffekt · ${t(resolvedIngredient.name, language)}` : `Ingredient effect · ${t(resolvedIngredient.name, language)}`}</strong><p>${effectMode === 'ignored'
        ? (language === 'de' ? 'Der Karteneffekt wurde ignoriert und nicht auf den Stapel gelegt.' : 'The card effect was ignored and was not added to the stack.')
        : resolvedIngredientEffect}</p>${effectMode === 'stored' ? `<small>${language === 'de' ? 'Dieser Effekt wartet jetzt hinten im gemeinsamen Effektstapel der Crew.' : 'This effect now waits at the back of the shared crew effect stack.'}</small>` : ''}</div>` : ''}
      <p>${handoverText}</p>
      <button class="primary-button" type="button" data-action="end-turn">${chain
        ? (language === 'de' ? 'Nächste Karte der Kette' : 'Next card in the chain')
        : nextPlayer ? tx('handOver', language) : (language === 'de' ? 'Zug beenden & warten' : 'End turn & wait')}</button>
    </article>`;
}

function renderWatchCard(engine, language) {
  const event = engine.currentEvent;
  const challenge = engine.currentWatchChallenge;
  const secretRevealed = !challenge.secret || engine.state.turn.watchSecretRevealedAt != null;
  if (challenge.secret && !secretRevealed) {
    const activeName = escapeHtml(engine.activePlayer.name);
    return `
      <article class="game-card secret-event-announcement">
        ${renderCourseFlow(engine, language)}
        <p class="eyebrow">${language === 'de' ? 'Private Karte auf dem Tablet' : 'Private card on the tablet'}</p>
        <h2>${language === 'de' ? 'Geheimes Event' : 'Secret event'}</h2>
        <div class="secret-screen-warning" role="status">
          <strong>${language === 'de' ? 'Alle außer der aktiven Person schauen jetzt vom großen Bildschirm weg.' : 'Everyone except the active player now looks away from the large screen.'}</strong>
          <p>${language === 'de'
            ? `${activeName} öffnet die Karte erst, wenn niemand sonst mehr auf den gespiegelten Bildschirm schaut.`
            : `${activeName} opens the card only after everyone else has stopped looking at the mirrored screen.`}</p>
        </div>
        <p class="card-story">${language === 'de'
          ? 'Die geheime Anweisung wird erst nach dem Öffnen sichtbar. Sie kann anschließend kurz gelesen und wieder zugeklappt werden.'
          : 'The secret instruction is only shown after opening. It can then be read briefly and collapsed again.'}</p>
        <button class="primary-button" type="button" data-action="reveal-secret-watch">${language === 'de' ? 'Geheimes Event öffnen' : 'Open secret event'}</button>
      </article>`;
  }
  if (challenge.playerSelection) {
    const selectedId = engine.state.turn.watchTargetPlayerId;
    const choices = engine.state.players.map((player) => {
      const isSelected = player.id === selectedId;
      return `<button type="button" class="choice-button task-assignee-option" data-action="choose-watch-player" data-player-id="${escapeHtml(player.id)}" data-selected="${isSelected}" aria-pressed="${isSelected}">
        ${avatar(player)}<strong>${escapeHtml(player.name)}</strong>
      </button>`;
    }).join('');
    return `
      <article class="game-card">
        ${renderCourseFlow(engine, language)}
        <p class="eyebrow">${language === 'de' ? 'Crewauftrag · Person bestimmen' : 'Crew duty · choose a player'}</p>
        <h2>${t(challenge.title, language)}</h2>
        ${event ? `<p class="muted">${t(event.title, language)}</p>` : ''}
        <p class="card-story">${t(challenge, language)}</p>
        <div class="card-effect">${language === 'de'
          ? 'Die ausgewählte Person wird beim nächsten Servieren als Portionswache angezeigt. Für diese Karte läuft kein Timer.'
          : 'The selected player will be shown as portion lookout at the next serving. This card has no timer.'}</div>
        <div class="choice-list task-assignee-choices">${choices}</div>
        <button class="primary-button" type="button" data-action="confirm-watch-player" ${selectedId ? '' : 'disabled'}>${language === 'de' ? 'Portionswache bestätigen' : 'Confirm portion lookout'}</button>
      </article>`;
  }
  const ongoing = challenge.flow === 'ongoing';
  const mandatory = challenge.mandatory;
  const cooperative = challenge.cooperative;
  const skillCheck = challenge.skillCheck;
  const charade = challenge.charade;
  const failurePreview = skillCheck ? engine.coinLossPreview(challenge.failureCoins) : null;
  const failureCoins = skillCheck ? Math.abs(failurePreview.amount) : 0;
  const skillScoreText = skillCheck
    ? (language === 'de'
      ? `${charade ? 'Erraten' : 'Erfolg'} +${challenge.successCoins} · ${charade ? 'nicht erraten' : 'Scheitern'} −${failureCoins} Münzen`
      : `${charade ? 'Guessed' : 'Success'} +${challenge.successCoins} · ${charade ? 'not guessed' : 'failure'} −${failureCoins} coins`)
    : '';
  const cooperativeNames = [engine.activePlayer.id, ...(challenge.partnerPlayerIds ?? [])]
    .map((playerId) => engine.state.players.find((player) => player.id === playerId)?.name)
    .filter(Boolean)
    .map(escapeHtml)
    .join(', ');
  const awaitingSecretStart = challenge.secret && !ongoing && engine.state.turn.watchStartedAt == null;
  const secretInstruction = challenge.secret ? `
    <div class="secret-reading-note"><strong>${language === 'de' ? `Nur ${escapeHtml(engine.activePlayer.name)} liest die Anweisung.` : `Only ${escapeHtml(engine.activePlayer.name)} reads the instruction.`}</strong> ${language === 'de' ? 'Danach bitte wieder zuklappen, bevor die anderen auf den Bildschirm schauen.' : 'Please collapse it again before everyone else looks at the screen.'}</div>
    <details class="secret-instruction" ${engine.state.turn.watchStartedAt == null ? 'open' : ''}>
      <summary data-open-label="${language === 'de' ? 'Ansehen' : 'View'}" data-close-label="${language === 'de' ? 'Zuklappen' : 'Collapse'}">${language === 'de' ? 'Geheime Anweisung anzeigen' : 'Show secret instruction'}</summary>
      <div class="secret-instruction-body">
        <h2>${t(challenge.title, language)}</h2>
        <p class="card-story">${t(challenge, language)}</p>
        <div class="card-effect"><strong>${language === 'de'
          ? mandatory ? 'Nicht vorlesen: Diese Anweisung ist verbindlich.' : 'Nicht vorlesen, nicht zeigen und der Gruppe nicht erklären.'
          : mandatory ? 'Do not read aloud: this instruction is mandatory.' : 'Do not read it aloud, show it, or explain it to the group.'}</strong></div>
      </div>
    </details>` : '';
  const seconds = Math.max(0, Math.ceil(((engine.state.turn.watchEndsAt ?? Date.now()) - Date.now()) / 1000));
  const durationText = challenge.endTrigger === 'ownerNextTurn'
    ? (language === 'de' ? 'Läuft bis zu deinem nächsten Zug' : 'Runs until your next turn')
    : challenge.endTrigger === 'targetTurnEnd'
      ? (language === 'de' ? 'Läuft während des nächsten Ziel-Zugs' : 'Runs during the target’s next turn')
      : (language === 'de' ? 'Läuft bis zur passenden Gegenkarte' : 'Runs until the matching counter-card');
  return `
    <article class="game-card">
      ${renderCourseFlow(engine, language)}
      <p class="eyebrow">${mandatory
        ? (language === 'de' ? `Verbindliche geheime Anweisung · nur ${escapeHtml(engine.activePlayer.name)} liest` : `Mandatory secret instruction · only ${escapeHtml(engine.activePlayer.name)} reads`)
        : challenge.secret
        ? (language === 'de' ? `Geheime Karte · nur ${escapeHtml(engine.activePlayer.name)} liest` : `Secret card · only ${escapeHtml(engine.activePlayer.name)} reads`)
        : skillCheck && cooperative
          ? (language === 'de' ? `Koop-${challenge.dexterity ? 'Geschicklichkeits' : 'Erfolgs'}-Challenge` : `Co-op ${challenge.dexterity ? 'dexterity' : 'success'} challenge`)
        : skillCheck
          ? (language === 'de' ? `${challenge.dexterity ? 'Geschicklichkeits' : 'Erfolgs'}-Challenge` : `${challenge.dexterity ? 'Dexterity' : 'Success'} challenge`)
        : cooperative
          ? (language === 'de' ? 'Koop-Zeitfüller · sofort gemeinsam ausführen' : 'Co-op interlude · do it together now')
          : (language === 'de' ? 'Zeitfüller · sofort ausführen' : 'Interlude · do it now')}</p>
      ${challenge.secret ? '' : `<h2>${t(challenge.title, language)}</h2>`}
      ${event ? `<p class="muted">${t(event.title, language)}</p>` : ''}
      ${cooperative ? `<div class="card-effect"><strong>${language === 'de' ? 'Beteiligte' : 'Participants'}: ${cooperativeNames}</strong><p>${language === 'de'
        ? 'Alle ausgewählten Personen sind gerade ohne laufende Küchenaufgabe.'
        : 'Every selected participant is currently free from an active kitchen task.'}</p></div>` : ''}
      ${secretInstruction}
      ${challenge.secret ? '' : `<p class="card-story">${t(challenge, language)}</p>`}
      <div class="challenge-clock">${awaitingSecretStart
        ? `<span>${language === 'de' ? 'Noch nicht gestartet' : 'Not started yet'}</span>`
        : mandatory ? `<span>${language === 'de' ? 'Jetzt verbindlich ausführen' : 'Carry out now'}</span>` : ongoing ? `<span>${durationText}</span>`
        : `<span class="timer" data-watch-timer>${formatDuration(seconds)}</span>`}<strong>${skillCheck ? skillScoreText : challenge.coins > 0 ? `+${challenge.coins} ${language === 'de' ? 'Münzen nach Abschluss' : 'coins after completion'}` : (language === 'de' ? 'echte Pause' : 'real break')}</strong></div>
      <div class="card-effect">${awaitingSecretStart
          ? (language === 'de' ? 'Lies die aufgeklappte Anweisung, klappe sie wieder zu und starte das geheime Event erst dann. Die Aktion beginnt erst mit dem Startknopf.' : 'Read the expanded instruction, collapse it again, and only then start the secret event. The action begins only with the start button.')
        : skillCheck
          ? charade
            ? (language === 'de' ? 'Die übrige Crew rät jetzt eine Minute. Drückt danach ehrlich „Erraten“ oder „Nicht erraten“.' : 'The rest of the crew now has one minute to guess. Afterwards, honestly press “Guessed” or “Not guessed.”')
            : (language === 'de' ? 'Führt genau den beschriebenen Versuch aus und wertet ehrlich. Drückt danach genau einen der beiden Ergebnis-Buttons.' : 'Perform the described attempt exactly and score it honestly. Then press exactly one of the two result buttons.')
        : mandatory
        ? (language === 'de' ? 'Führe die verbindliche Anweisung jetzt aus und bestätige sie anschließend.' : 'Carry out the mandatory instruction now, then confirm it.')
        : ongoing
        ? (language === 'de' ? 'Die Aktion beginnt erst mit dem Button. Danach wird das Tablet sofort weitergegeben; die Challenge endet später automatisch.' : 'The action starts only when you press the button. The tablet is then passed immediately and the challenge ends automatically later.')
        : challenge.secret
            ? (language === 'de' ? 'Die geheime Challenge läuft jetzt. Führe sie aus, ohne der Gruppe die Karte zu erklären.' : 'The secret challenge is now running. Carry it out without explaining the card to the group.')
            : (language === 'de' ? 'Erledigt die kurze Aktion jetzt; laufende Küchen-Challenges bleiben davon unberührt.' : 'Complete the short action now; running kitchen challenges continue independently.')}</div>
      ${awaitingSecretStart
        ? `<button class="primary-button" type="button" data-action="start-watch">${language === 'de' ? 'Geheimes Event starten' : 'Start secret event'}</button>`
        : skillCheck ? `<div class="button-row skill-check-actions">
        <button class="primary-button" type="button" data-action="resolve-watch-outcome" data-outcome="success">${language === 'de' ? `${charade ? 'Erraten' : 'Hat geklappt'} · +${challenge.successCoins} Münzen` : `${charade ? 'Guessed' : 'Succeeded'} · +${challenge.successCoins} coins`}</button>
        <button class="secondary-button" type="button" data-action="resolve-watch-outcome" data-outcome="failure">${language === 'de' ? `${charade ? 'Nicht erraten' : 'Gescheitert'} · −${failureCoins} Münzen` : `${charade ? 'Not guessed' : 'Failed'} · −${failureCoins} coins`}</button>
      </div>` : `<button class="primary-button" type="button" data-action="${ongoing ? 'activate-watch' : awaitingSecretStart ? 'start-watch' : 'complete-watch'}">${ongoing
        ? challenge.secret
          ? (language === 'de' ? 'Geheime Challenge starten & Tablet weitergeben' : 'Start secret challenge & pass the tablet')
          : (language === 'de' ? 'Challenge starten & Tablet weitergeben' : 'Start challenge & pass the tablet')
        : awaitingSecretStart
          ? (language === 'de' ? 'Geheimes Event starten' : 'Start secret event')
          : mandatory
            ? (language === 'de' ? 'Anweisung ausgeführt' : 'Instruction completed')
          : (language === 'de' ? 'Challenge abgeschlossen' : 'Challenge complete')}</button>`}
    </article>`;
}

function renderPreparationSummary(engine, language) {
  const tasks = engine.state.tasks
    .filter((instance) => instance.chapterIndex === engine.state.chapterIndex)
    .sort((a, b) => a.assignedAt - b.assignedAt)
    .map((instance) => engine.getTaskCard(instance))
    .filter(Boolean);
  if (!tasks.length) return '';
  return `<details class="preparation-summary">
    <summary>${language === 'de' ? 'Grobe Zubereitungsfolge anzeigen' : 'Show rough preparation order'}</summary>
    <ol>${tasks.map((card) => `<li><strong>${t(card.title, language)}</strong><span>${t(card.instruction, language)}</span></li>`).join('')}</ol>
  </details>`;
}

function renderChapterReady(engine, language) {
  const ingredients = engine.state.ingredients.filter((ingredient) => ingredient.chapterIndex === engine.state.chapterIndex && (ingredient.essential || ['discovered', 'locked', 'used'].includes(ingredient.status)));
  const portionCaptain = engine.state.players.find((player) => player.id === engine.state.chapter.portionCaptainPlayerId);
  return `
    <article class="game-card">
      <p class="eyebrow">${tx('chapterComplete', language)}</p>
      <h2>${t(engine.currentChapter.course, language)}</h2>
      <p class="card-story">${t(engine.currentChapter.description, language)}</p>
      <div class="stat-strip">
        ${statusTag(`${engine.state.coins}/${engine.state.coinGoal} ${tx('treasure', language)}`, 'gold')}
        ${statusTag(`${ingredients.length} ${language === 'de' ? 'Zutaten' : 'ingredients'}`, 'green')}
        ${portionCaptain ? statusTag(language === 'de' ? `Portionswache: ${escapeHtml(portionCaptain.name)}` : `Portion lookout: ${escapeHtml(portionCaptain.name)}`, 'blue') : ''}
      </div>
      <p>${language === 'de' ? 'Der Gang ist fertig zubereitet und serviert. Essen hat keinen Zeitdruck – setzt die Reise fort, wenn alle bereit sind.' : 'The course is prepared and served. Eating is never timed — continue when everyone is ready.'}</p>
      ${renderPreparationSummary(engine, language)}
      <button class="primary-button" type="button" data-action="serve-course">${tx('serveCourse', language)}</button>
    </article>`;
}

function renderCurrentCard(engine, language) {
  switch (engine.state.turn.phase) {
    case 'draw': return renderDrawCard(engine, language);
    case 'event': return renderEventCard(engine, language);
    case 'rolled': return renderRolledCard(engine, language);
    case 'ingredientChoice': return renderIngredientChoice(engine, language);
    case 'effectChoice': return renderIngredientEffectChoice(engine, language);
    case 'cocktailTeamChoice': return renderCocktailTeamChoice(engine, language);
    case 'courseDecision': return engine.currentChapter.id === 'cocktails'
      ? engine.state.turn.courseDecisionType === 'cocktailSpiritCount'
        ? renderCocktailSpiritCountChoice(engine, language)
        : renderCocktailTechniqueChoice(engine, language)
      : renderSoupStyleChoice(engine, language);
    case 'taskAssigneeChoice': return renderTaskAssigneeChoice(engine, language);
    case 'taskBriefing': return renderTaskBriefing(engine, language);
    case 'resolved': return renderResolvedCard(engine, language);
    case 'watch': return renderWatchCard(engine, language);
    case 'chapterReady': return renderChapterReady(engine, language);
    case 'crewBusy': {
      const anchor = engine.state.players[engine.state.busyAfterPlayerIndex ?? engine.state.activePlayerIndex];
      if (engine.state.busyReason === 'waitingForTask') {
        return `<article class="game-card"><p class="eyebrow">${language === 'de' ? 'Kurze Ruhe auf See' : 'A quiet moment at sea'}</p><h2>${language === 'de' ? 'Die Zugfolge wartet auf eine laufende Aufgabe' : 'Turn order is waiting for a running task'}</h2><p class="card-story">${language === 'de' ? `Gerade ist keine weitere Aktion offen. Die Reihenfolge ist hinter ${escapeHtml(anchor.name)} gespeichert. Sobald eine Aufgabe erledigt wird, erhält die nächste freie Person eine sichtbare Übergabe.` : `No further action is currently open. The order is saved after ${escapeHtml(anchor.name)}. As soon as a task is completed, the next free player receives a visible handover.`}</p><button class="primary-button" type="button" data-action="navigate" data-view="tasks">${language === 'de' ? 'Aufgabenliste öffnen' : 'Open task list'}</button></article>`;
      }
      return `<article class="game-card"><p class="eyebrow">${language === 'de' ? 'Alle Hände in der Kombüse' : 'All hands in the galley'}</p><h2>${language === 'de' ? 'Alle Personen haben gerade eine laufende Aufgabe' : 'Every player currently has a running task'}</h2><p class="card-story">${language === 'de' ? `Es wird kein Zug vergeben. Die Reihenfolge ist hinter ${escapeHtml(anchor.name)} gespeichert. Sobald eine Aufgabe erledigt wird, erhält die nächste freie Person in dieser Reihenfolge eine sichtbare Übergabe.` : `No turn is assigned. The order is saved after ${escapeHtml(anchor.name)}. As soon as a task is completed, the next free player in that order receives a visible handover.`}</p><button class="primary-button" type="button" data-action="navigate" data-view="tasks">${language === 'de' ? 'Aufgabenliste öffnen' : 'Open task list'}</button></article>`;
    }
    default: return renderDrawCard(engine, language);
  }
}

export function renderGame(engine, language) {
  if (engine.state.turn.phase === 'eating') return renderEating(engine, language);
  if (engine.state.turn.phase === 'complete' || engine.state.status === 'completed') return renderComplete(engine, language);
  const player = engine.activePlayer;
  const role = getRole(player.roleId);
  const activeAssignment = engine.currentChapter.id === 'cocktails'
    ? player.cocktailTeam === 'alcoholic'
      ? (language === 'de' ? 'Cocktail-Team alkoholisch' : 'alcoholic cocktail team')
      : player.cocktailTeam === 'alcohol-free'
        ? (language === 'de' ? 'Cocktail-Team alkoholfrei' : 'alcohol-free cocktail team')
        : (language === 'de' ? 'Cocktail-Team noch offen' : 'cocktail team not chosen yet')
    : `${tx('group', language)} ${engine.activeGroup.id}`;
  return `
    <h1 class="sr-only">Adventure Dinner · ${t(engine.currentChapter.name, language)} · ${t(engine.currentChapter.locations[engine.activeGroup.locationIndex], language)}</h1>
    <div class="game-grid">
      <div class="game-column">
        ${renderCourseBoard(engine, language)}
        ${renderStatusPanel(engine, language)}
      </div>
      <div class="game-column">
        <section class="turn-banner">
          ${avatar(player)}
          <div>
            <p>${tx('activePlayer', language)} · ${t(role.name, language)} · ${activeAssignment}</p>
            <h2>${escapeHtml(player.name)}</h2>
          </div>
        </section>
        ${renderAbility(engine, language)}
        ${renderCurrentCard(engine, language)}
        ${engine.state.turn.phase === 'cocktailTeamChoice' ? '' : renderCourseBasket(engine, language)}
      </div>
    </div>`;
}

export function renderEating(engine, language) {
  const course = engine.currentChapter;
  const menu = engine.state.menu[engine.state.chapterIndex];
  const ingredients = menu.ingredientIds.map((id) => engine.getIngredient(id)).filter(Boolean);
  const cocktailTechniques = course.id === 'cocktails'
    ? ['alcoholic', 'alcohol-free'].map((team) => {
        const technique = menu.cocktailTechniques?.[team];
        const teamLabel = team === 'alcoholic'
          ? (language === 'de' ? 'Mit Alkohol' : 'Alcoholic')
          : (language === 'de' ? 'Alkoholfrei' : 'Alcohol-free');
        const techniqueLabel = technique === 'mixed'
          ? (language === 'de' ? 'gemixt' : 'blended')
          : (language === 'de' ? 'gerührt' : 'stirred');
        return statusTag(`${teamLabel}: ${techniqueLabel}`, team === 'alcoholic' ? 'coral' : 'green');
      }).join('')
    : '';
  const cocktailIngredientLists = course.id === 'cocktails'
    ? `<div class="cocktail-recipe-lists eating-recipe-lists">${['alcoholic', 'alcohol-free'].map((team) => {
        const teamIngredients = ingredients.filter((ingredient) => [team, 'shared'].includes(ingredient.cocktailUse));
        const title = team === 'alcoholic'
          ? (language === 'de' ? 'Zutatenliste · alkoholisch' : 'Ingredient list · alcoholic')
          : (language === 'de' ? 'Zutatenliste · alkoholfrei' : 'Ingredient list · alcohol-free');
        return `<section class="cocktail-recipe-list" data-team="${team}"><h3>${title}</h3><div class="stat-strip">${teamIngredients.map((ingredient) => statusTag(t(ingredient.name, language), team === 'alcoholic' ? 'coral' : 'green')).join('')}</div></section>`;
      }).join('')}</div>`
    : '';
  return `
    <section class="hero-screen">
      <div class="panel hero-card">
        <p class="eyebrow">${tx('serveCourse', language)}</p>
        <h1 style="font-size:clamp(2.5rem,7vw,5rem)">${t(course.course, language)}</h1>
        <p class="lead">${t(course.description, language)}</p>
        ${cocktailIngredientLists || `<div class="stat-strip">${ingredients.slice(0, 12).map((ingredient) => statusTag(t(ingredient.name, language), ingredient.essential ? 'green' : '')).join('')}</div>`}
        ${cocktailTechniques ? `<div class="stat-strip">${cocktailTechniques}</div>` : ''}
        <p>${language === 'de' ? 'Genießt den Gang ohne Zeitdruck. Laufende Aufgaben-Challenges bleiben in der Aufgabenliste sichtbar.' : 'Enjoy the course without a time limit. Running task challenges remain visible in the task list.'}</p>
        ${renderPreparationSummary(engine, language)}
        <button class="primary-button" type="button" data-action="next-chapter">${tx('nextCourse', language)}</button>
      </div>
    </section>`;
}

export function renderComplete(engine, language) {
  const essentialIngredients = engine.state.ingredients.filter((ingredient) => ingredient.essential);
  const used = essentialIngredients.filter((ingredient) => ingredient.status === 'used').length;
  const duration = engine.state.completedAt ? Math.round((engine.state.completedAt - engine.state.startedAt) / 60_000) : 0;
  const rewardPercent = engine.coinProgress;
  return `
    <section class="hero-screen">
      <div class="panel hero-card">
        <p class="eyebrow">Adventure Dinner · Seafaring Adventure</p>
        <h1 class="game-complete-title">${tx('gameCompleteTitle', language)}</h1>
        <p class="lead">${tx('gameCompleteLead', language)}</p>
        <div class="stat-strip">
          ${statusTag(`${engine.state.players.reduce((sum, player) => sum + player.turns, 0)} ${language === 'de' ? 'Züge' : 'turns'}`, 'gold')}
          ${statusTag(`${engine.state.tasks.filter((task) => task.status === 'done').length} ${language === 'de' ? 'Aufgaben' : 'tasks'}`, 'green')}
          ${statusTag(`${used}/${essentialIngredients.length} ${language === 'de' ? 'Pflichtzutaten' : 'essential ingredients'}`)}
          ${statusTag(`${engine.state.coins}/${engine.state.coinGoal} ${language === 'de' ? 'Münzen' : 'coins'}`, 'gold')}
          ${duration ? statusTag(`${duration} min`) : ''}
        </div>
        <div class="reward-result"><strong>${rewardPercent}%</strong><span>${language === 'de' ? 'der vorbereiteten Süßigkeiten werden jetzt fair an die gesamte Crew verteilt.' : 'of the prepared sweets are now shared fairly across the entire crew.'}</span></div>
        <div class="button-row">
          <button class="primary-button" type="button" data-action="navigate" data-view="sessions">${tx('viewLog', language)}</button>
          <button class="secondary-button" type="button" data-action="open-setup">${tx('newGame', language)}</button>
        </div>
      </div>
    </section>`;
}
