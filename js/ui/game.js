import { CHAPTERS } from '../data/chapters.js';
import { EFFECT_TEXT } from '../data/events.js';
import { INGREDIENT_EFFECT_TEXT } from '../data/ingredients.js';
import { localize, formatDuration } from '../data/i18n.js';
import { getRole } from '../data/roles.js';
import { getRemainingSeconds } from '../core/timers.js';
import { avatar, escapeHtml, percent, statusTag, t, tx } from './helpers.js';

const STAGE_COPY = Object.freeze({
  ingredients: {
    de: { label: '1 · Zutaten bestimmen', title: 'Vorratsereignis ziehen', button: 'Vorrats-Ereigniskarte ziehen', lead: 'Entdeckt, verändert und sichert die Zutaten dieses Gangs. Erst wenn alle festgelegt sind, öffnet sich das Auftragsdeck.' },
    en: { label: '1 · Choose ingredients', title: 'Draw a provision event', button: 'Draw provision event', lead: 'Discover, change, and lock the ingredients for this course. The work-order deck opens only when all are fixed.' }
  },
  tasks: {
    de: { label: '2 · Aufgaben verteilen', title: 'Auftragsereignis ziehen', button: 'Auftrags-Ereigniskarte ziehen', lead: 'Die Zutaten stehen fest. Jede Karte weist jetzt einen konkreten, fachlich möglichen Küchenauftrag zu.' },
    en: { label: '2 · Assign tasks', title: 'Draw a work-order event', button: 'Draw work-order event', lead: 'The ingredients are fixed. Every card now assigns a concrete and feasible kitchen job.' }
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
  veryFast: { de: 'Blitzschnell · +3', en: 'Lightning fast · +3' },
  onTime: { de: 'Rechtzeitig · +1', en: 'On time · +1' },
  late: { de: 'Etwas zu spät · −1', en: 'A little late · −1' },
  veryLate: { de: 'Deutlich zu spät · −3', en: 'Very late · −3' }
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

function stageCopy(engine, language) {
  return STAGE_COPY[engine.currentEventStage()]?.[language] ?? STAGE_COPY.cooking[language];
}

function renderCourseFlow(engine, language) {
  const current = engine.currentEventStage();
  const order = ['ingredients', 'tasks', 'cooking'];
  return `<div class="course-flow" aria-label="${language === 'de' ? 'Ablauf des Gangs' : 'Course flow'}">${order.map((stage, index) => {
    const state = order.indexOf(current) > index ? 'done' : current === stage ? 'active' : 'future';
    const labels = language === 'de' ? ['Zutaten', 'Aufgaben', 'Kochen'] : ['Ingredients', 'Tasks', 'Cooking'];
    return `<span data-state="${state}"><b>${state === 'done' ? '✓' : index + 1}</b>${labels[index]}</span>`;
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
    const treasure = actionCode === 'treasureAndTask' ? (language === 'de' ? '+5 Münzen + ' : '+5 coins + ') : '';
    return `${treasure}${t(card.title, language)} · ${help}`;
  }
  if (['watchChallenge', 'watchChallengeAlt', 'treasureAndWatch'].includes(actionCode)) {
    const challengeCode = actionCode === 'watchChallengeAlt' ? 'watchChallengeAlt' : 'watchChallenge';
    const challenge = engine.watchChallengeForAction(challengeCode);
    return `${actionCode === 'treasureAndWatch' ? (language === 'de' ? '+5 Münzen + ' : '+5 coins + ') : ''}${t(challenge, language)}`;
  }
  if (actionCode === 'lockIngredient') {
    const ingredient = engine.state.ingredients.find((entry) => entry.id === engine.state.lastIngredientId && entry.status === 'discovered') ?? engine.unlockedCourseIngredients().at(-1);
    return ingredient
      ? (language === 'de' ? `${t(ingredient.name, language)} verbindlich festlegen` : `Lock in ${t(ingredient.name, language)}`)
      : t(EFFECT_TEXT[actionCode], language);
  }
  if (actionCode === 'swapIngredient') {
    const ingredient = engine.state.ingredients.find((entry) => entry.id === engine.state.lastIngredientId && entry.status === 'discovered') ?? engine.unlockedCourseIngredients().at(-1);
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
  const nodes = CHAPTERS.map((chapter, index) => {
    const state = index < chapterIndex ? 'done' : index === chapterIndex ? 'active' : 'future';
    return `
      <div class="course-node" data-state="${state}" style="--course-color:${chapter.color}">
        <span class="node-number">${index < chapterIndex ? '✓' : chapter.number}</span>
        <span><small>${t(chapter.name, language)}</small><strong>${t(chapter.course, language)}</strong></span>
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
      <div class="station-scene" data-atlas="${scene.atlas}" data-chapter="${escapeHtml(engine.currentChapter.id)}" data-location="${group.locationIndex}" role="img" aria-label="${escapeHtml(`${t(activeLocation, language)} · ${t(engine.currentChapter.name, language)}`)}" style="${sceneStyle}">
        <div class="station-caption">
          <small>${t(engine.currentChapter.name, language)}</small>
          <strong>${t(activeLocation, language)}</strong>
        </div>
      </div>
      <details class="voyage-route"><summary>${language === 'de' ? 'Reiseroute anzeigen' : 'Show voyage route'}</summary><div class="board-overlay">${nodes}</div></details>
      <div class="location-track" aria-label="${tx('currentLocation', language)}">${locationDots}</div>
    </section>`;
}

function renderCourseBasket(engine, language) {
  if (engine.state.chapter.stage !== 'ingredients') return '';
  const basket = engine.unlockedCourseIngredients();
  const locked = engine.courseIngredients().filter((ingredient) => ingredient.status === 'locked');
  const minimum = engine.courseRule().minimum;
  const essentialLocked = locked.filter((ingredient) => ingredient.essential).length;
  const categoryLabels = {
    vegetable: { de: 'Gemüse', en: 'vegetables' }, pantry: { de: 'Grundlage/Extras', en: 'base/extras' },
    meat: { de: 'Fleisch', en: 'meat' }, fruit: { de: 'Obst', en: 'fruit' },
    dessert: { de: 'Dessertbasis', en: 'dessert base' }, drinks: { de: 'Getränkebasis', en: 'drink base' }
  };
  const profile = Object.entries(engine.courseRule().categoryMinimums ?? {}).map(([category, required]) => {
    const current = engine.courseCategoryCount(category, ['discovered', 'locked', 'used']);
    return statusTag(`${current}/${required} ${t(categoryLabels[category] ?? { de: category, en: category }, language)}`, current >= required ? 'green' : 'gold');
  }).join('');
  return `<section class="course-basket panel">
    <div class="panel-header"><div><p class="eyebrow">${language === 'de' ? 'Vorläufige Auswahl' : 'Draft selection'}</p><h3>${language === 'de' ? 'Gangkorb' : 'Course basket'}</h3></div>${statusTag(`${essentialLocked}/${minimum}`, essentialLocked >= minimum ? 'green' : 'gold')}</div>
    ${profile ? `<div class="stat-strip">${profile}</div>` : ''}
    ${basket.length ? `<div class="course-basket-list">${basket.map((ingredient) => `<article>
      <strong>${t(ingredient.name, language)}</strong><small>${t(ingredient.suggestedQuantity, language)}</small>
      <div class="button-row"><button class="secondary-button" type="button" data-action="lock-basket-ingredient" data-ingredient-id="${escapeHtml(ingredient.id)}">${language === 'de' ? 'Fest zuordnen' : 'Lock into course'}</button><button class="quiet-button" type="button" data-action="remove-basket-ingredient" data-ingredient-id="${escapeHtml(ingredient.id)}">${language === 'de' ? 'Zurücklegen' : 'Return'}</button></div>
    </article>`).join('')}</div>` : `<p class="muted">${language === 'de' ? 'Gefundene Zutaten landen zuerst hier. Ordnet sie fest zu oder legt sie zurück.' : 'Discovered ingredients land here first. Lock them in or return them.'}</p>`}
  </section>`;
}

function renderStatusPanel(engine, language) {
  const group = engine.activeGroup;
  const goal = engine.locationGoal(group);
  const chapterProgress = engine.state.groups.reduce((sum, item) => sum + item.completedLocations.length, 0);
  const chapterTotal = engine.state.groups.length * engine.currentChapter.locations.length;
  const currentIngredients = engine.courseIngredients();
  const fixedIngredients = currentIngredients.filter((ingredient) => ['locked', 'used'].includes(ingredient.status)).length;
  const chapterTasks = engine.state.tasks.filter((task) => task.chapterIndex === engine.state.chapterIndex);
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
      <div class="stat-strip">
        ${statusTag(`${tx('round', language)} ${engine.state.chapter.round}`)}
        ${statusTag(`● ${engine.state.coins}/${engine.state.coinGoal} ${tx('treasure', language)}`, 'gold')}
        ${statusTag(`${tx('events', language)} ${engine.state.chapter.eventsResolved}`)}
        ${statusTag(stage.label, 'blue')}
        ${engine.state.groups.length > 1 ? statusTag(language === 'de' ? 'Crew geteilt' : 'Crew split', 'coral') : ''}
      </div>
      <div class="progress-track" aria-label="${language === 'de' ? 'Ortsfortschritt' : 'Location progress'}"><span style="--progress:${percent(group.locationProgress, goal)}%"></span></div>
      <p class="muted" style="font-family:system-ui,sans-serif;font-size:.72rem;margin:.45rem 0 0">
        ${language === 'de' ? `${group.locationProgress} von ${goal} Ortsaktionen · ${chapterProgress}/${chapterTotal} Orte` : `${group.locationProgress} of ${goal} location actions · ${chapterProgress}/${chapterTotal} locations`}
      </p>
      <p class="muted" style="font-family:system-ui,sans-serif;font-size:.72rem;margin:.35rem 0 0">
        ${language === 'de' ? `${fixedIngredients} Zutaten für diesen Gang festgelegt · ${chapterTasks.length} Aufgaben zugewiesen` : `${fixedIngredients} ingredients locked for this course · ${chapterTasks.length} tasks assigned`}
      </p>
      <div class="coin-meter"><span style="--progress:${engine.coinProgress}%"></span><b>${engine.coinProgress}% ${language === 'de' ? 'der Süßigkeitenbeute' : 'of the sweet loot'}</b></div>
    </section>`;
}

function renderAbility(engine, language) {
  const player = engine.activePlayer;
  const role = getRole(player.roleId);
  const phase = engine.state.turn.phase;
  const key = `tactician-ignore-${engine.state.chapterIndex}`;
  const canIgnore = role.id === 'tactician' && phase === 'event' && engine.passiveUnused(player, key);
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

  if (!canIgnore && !canUse && !canUseAlchemistPassive && !canUseCategoryPassive) {
    return engine.state.turn.activeAbilityUsed ? `<div class="role-ability"><strong>${language === 'de' ? 'Spezialfähigkeit in diesem Zug bereits verwendet' : 'Special ability already used this turn'}</strong></div>` : '';
  }
  const activeButtons = role.activeCode === 'adjustDie' && canUse
    ? `<button class="secondary-button" type="button" data-action="use-ability" data-option="-1">−1</button><button class="secondary-button" type="button" data-action="use-ability" data-option="1">+1</button>`
    : canUse ? `<button class="secondary-button" type="button" data-action="use-ability">${tx('useAbility', language)} · ${player.activeUsesRemaining}</button>` : '';
  return `
    <div class="role-ability">
      <strong>${role.icon} ${t(role.name, language)}</strong>
      <p style="margin:.3rem 0 .7rem">${t(role.active, language)}</p>
      <div class="button-row">
        ${activeButtons}
        ${canIgnore ? `<button class="secondary-button" type="button" data-action="ignore-event">${language === 'de' ? 'Ereignis ignorieren' : 'Ignore event'}</button>` : ''}
        ${canUseAlchemistPassive ? `<button class="secondary-button" type="button" data-action="use-alchemist-passive">${language === 'de' ? 'Passiv tauschen' : 'Use passive swap'}</button>` : ''}
        ${canUseCategoryPassive ? `<button class="secondary-button" type="button" data-action="use-category-passive">${language === 'de' ? 'Passive Kategorienkarte ziehen' : 'Use category draw passive'}</button>` : ''}
      </div>
    </div>`;
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
      ${renderAbility(engine, language)}
    </article>`;
}

function renderEventCard(engine, language) {
  const event = engine.currentEvent;
  const choices = event.options?.map((code) => `
    <button type="button" class="choice-button" data-action="resolve-choice" data-choice="${code}">${eventActionText(engine, code, language)}</button>`).join('') ?? '';
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
      ${event.type === 'choice'
        ? `<div class="card-effect"><strong>${language === 'de' ? 'Die Crew darf beraten. Die endgültige Wahl trifft die aktive Person.' : 'The crew may discuss. The active player makes the final choice.'}</strong></div><div class="choice-list">${choices}</div>`
        : `<div class="card-effect">${language === 'de' ? 'Würfelt und folgt dem passenden Ergebnis: 1–2, 3–4 oder 5–6.' : 'Roll and follow the matching result: 1–2, 3–4, or 5–6.'}</div>
           <button class="primary-button" type="button" data-action="roll-die">${tx('roll', language)}</button>`}
      ${renderAbility(engine, language)}
    </article>`;
}

function renderRolledCard(engine, language) {
  const event = engine.currentEvent;
  const value = engine.state.turn.dieResult;
  const outcomeIndex = value <= 2 ? 0 : value <= 4 ? 1 : 2;
  const outcomeCode = event.outcomes[outcomeIndex];
  const smithKey = `smith-reroll-${engine.state.chapterIndex}`;
  const canReroll = engine.activePlayer.roleId === 'smith' && engine.passiveUnused(engine.activePlayer, smithKey);
  const hasPumpkinReroll = engine.state.bonuses.rerollNext > 0;
  const hasGingerAdjust = engine.state.bonuses.adjustNext > 0;
  const hasBeefDouble = engine.state.bonuses.doubleNextDie > 0;
  return `
    <article class="game-card">
      <p class="eyebrow">${escapeHtml(event.id)} · ${tx('outcome', language)}</p>
      <h2>${t(event.title, language)}</h2>
      <div class="dice-stage" data-rolling="true">
        <div class="die-scene" aria-label="${language === 'de' ? 'Würfel rollt' : 'Die rolling'}">
          <div class="die-cube" data-result="${value}">
            ${renderDieFace('die-front', 1)}${renderDieFace('die-back', 6)}
            ${renderDieFace('die-right', 3)}${renderDieFace('die-left', 5)}
            ${renderDieFace('die-top', 2)}${renderDieFace('die-bottom', 4)}
          </div>
        </div>
        <div class="dice-reveal"><span>${language === 'de' ? `Gewürfelt: ${value}` : `Rolled: ${value}`}</span><strong>${eventActionText(engine, outcomeCode, language)}</strong></div>
      </div>
      <div class="button-row dice-actions">
        <button class="primary-button" type="button" data-action="confirm-roll">${tx('resolve', language)}</button>
        ${canReroll ? `<button class="secondary-button" type="button" data-action="reroll-die">${tx('rollAgain', language)} · ${t(getRole('smith').name, language)}</button>` : ''}
        ${hasPumpkinReroll ? `<button class="secondary-button" type="button" data-action="reroll-ingredient-die">${language === 'de' ? 'Mit Kürbis neu würfeln' : 'Reroll with pumpkin'}</button>` : ''}
        ${hasGingerAdjust ? `<button class="secondary-button" type="button" data-action="adjust-ingredient-die" data-option="-1">${language === 'de' ? 'Ingwer −1' : 'Ginger −1'}</button><button class="secondary-button" type="button" data-action="adjust-ingredient-die" data-option="1">${language === 'de' ? 'Ingwer +1' : 'Ginger +1'}</button>` : ''}
      </div>
      ${hasBeefDouble ? `<div class="card-effect">${language === 'de' ? 'Rind-Bonus: Beim Ausführen zählt dieser Wurf doppelt (höchstens 6).' : 'Beef bonus: this roll counts double when resolved (maximum 6).'}</div>` : ''}
      ${renderAbility(engine, language)}
    </article>`;
}

function renderIngredientChoice(engine, language) {
  const event = engine.currentEvent;
  const choices = engine.state.turn.pendingIngredientIds.map((ingredientId) => {
    const ingredient = engine.getIngredient(ingredientId);
    const effect = INGREDIENT_EFFECT_TEXT[ingredient.effect] ?? { de: 'Kein zusätzlicher Karteneffekt.', en: 'No additional card effect.' };
    const canIgnore = engine.canCookIgnoreIngredientEffect(ingredient.id);
    return `
      <div class="ingredient-choice-card">
        <button type="button" class="choice-button" data-action="choose-ingredient" data-ingredient-id="${escapeHtml(ingredient.id)}">
          <strong>${t(ingredient.name, language)}</strong><br>
          <small>${t(ingredient.suggestedQuantity, language)} · ${ingredient.essential ? tx('required', language) : tx('optional', language)}</small>
        </button>
        <p>${t(effect, language)}</p>
        ${canIgnore ? `<button type="button" class="quiet-button" data-action="choose-ingredient-ignore" data-ingredient-id="${escapeHtml(ingredient.id)}">${language === 'de' ? 'Nehmen, Effekt als Koch ignorieren' : 'Take it and ignore the effect as Cook'}</button>` : ''}
      </div>`;
  }).join('');
  return `
    <article class="game-card">
      ${renderCourseFlow(engine, language)}
      <p class="eyebrow">${language === 'de' ? 'Vorratsereignis · aktive Entscheidung' : 'Provision event · active decision'}</p>
      <h2>${event ? t(event.title, language) : (language === 'de' ? 'Welchen Proviant nehmt ihr mit?' : 'Which provision do you take?')}</h2>
      <p class="card-story">${language === 'de' ? 'Besprecht die angebotenen Zutaten. Die aktive Person wählt eine Karte; sie bleibt veränderbar, bis ein späteres Ereignis sie festlegt.' : 'Discuss the offered ingredients. The active player chooses one card; it remains changeable until a later event locks it.'}</p>
      <div class="choice-list">${choices}</div>
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

function renderTaskBriefing(engine, language) {
  const instance = engine.state.tasks.find((task) => task.instanceId === engine.state.turn.assignedTaskId);
  const card = instance ? engine.getTaskCard(instance) : null;
  if (!instance || !card) return renderDrawCard(engine, language);
  const assigned = instance.assignedPlayerIds
    .map((playerId) => engine.state.players.find((player) => player.id === playerId)?.name)
    .filter(Boolean);
  const event = engine.currentEvent;
  const after = engine.state.turn.taskBriefingEndsTurn
    ? (language === 'de' ? 'Danach wird das Tablet weitergegeben; die Aufgabe läuft unabhängig von den nächsten Zügen weiter.' : 'Then pass the tablet; the task continues independently of later turns.')
    : (language === 'de' ? 'Danach zieht dieselbe aktive Person die erste Auftrags-Ereigniskarte.' : 'Then the same active player draws the first work-order event.');
  return `
    <article class="game-card">
      ${renderCourseFlow(engine, language)}
      <p class="eyebrow">${event ? (language === 'de' ? 'Auftragsereignis' : 'Work-order event') : (language === 'de' ? 'Automatischer Startauftrag' : 'Automatic opening job')}</p>
      <h2>${t(card.title, language)}</h2>
      ${event ? `<p class="card-story">${t(event.story, language)}</p>` : `<p class="card-story">${language === 'de' ? 'Die Tapas-Zutaten stehen bereits fest. Deshalb beginnt die Reise direkt mit einem echten Küchenauftrag.' : 'The tapas ingredients are already fixed, so the voyage begins with a real kitchen job.'}</p>`}
      <div class="task-briefing">
        <strong>${language === 'de' ? 'Konkreter Auftrag' : 'Concrete job'}</strong>
        <p>${t(card.instruction, language)}</p>
        <div class="stat-strip">
          ${statusTag(`${language === 'de' ? 'Verantwortlich' : 'Responsible'}: ${assigned.map(escapeHtml).join(', ')}`, 'blue')}
          ${statusTag(`${card.estimatedMinutes} min`, 'gold')}
          ${statusTag(language === 'de' ? 'Münz-Challenge startet automatisch' : 'Coin challenge starts automatically', 'coral')}
        </div>
      </div>
      <button class="primary-button" type="button" data-action="accept-task">${language === 'de' ? 'Aufgabe übernehmen & Challenge starten' : 'Take task & start challenge'}</button>
      ${renderIngredientBasket(engine, instance, language)}
      <div class="next-action"><strong>${language === 'de' ? `${assigned.map(escapeHtml).join(' & ')} übernehmen diese Aufgabe jetzt.` : `${assigned.map(escapeHtml).join(' & ')} take this task now.`}</strong><span>${after}</span></div>
    </article>`;
}

function renderResolvedCard(engine, language) {
  const event = engine.currentEvent;
  const code = engine.state.turn.outcomeCode;
  const chain = engine.state.turn.chainPending;
  const nextPlayer = engine.state.players[(engine.state.activePlayerIndex + 1) % engine.state.players.length];
  const handoverText = chain
    ? (language === 'de' ? 'Die Ereigniskette geht für dieselbe Person weiter.' : 'The event chain continues for the same player.')
    : `${tx('handTablet', language)} ${escapeHtml(nextPlayer.name)}.`;
  return `
    <article class="game-card">
      <p class="eyebrow">${tx('outcome', language)}</p>
      <h2>${t(event?.title ?? { de: 'Aktion abgeschlossen', en: 'Action complete' }, language)}</h2>
      <div class="card-effect"><strong>${code === 'ignored'
        ? (language === 'de' ? 'Der Effekt wurde ignoriert.' : 'The effect was ignored.')
        : eventActionText(engine, code, language)}</strong></div>
      <p>${handoverText}</p>
      <button class="primary-button" type="button" data-action="end-turn">${chain ? (language === 'de' ? 'Nächste Karte der Kette' : 'Next card in the chain') : tx('handOver', language)}</button>
    </article>`;
}

function renderWatchCard(engine, language) {
  const event = engine.currentEvent;
  const challenge = engine.currentWatchChallenge;
  const seconds = Math.max(0, Math.ceil(((engine.state.turn.watchEndsAt ?? Date.now()) - Date.now()) / 1000));
  return `
    <article class="game-card">
      ${renderCourseFlow(engine, language)}
      <p class="eyebrow">${challenge.secret ? (language === 'de' ? 'Geheime Karte · nicht laut vorlesen' : 'Secret card · do not read aloud') : (language === 'de' ? 'Zeitfüller · sofort ausführen' : 'Interlude · do it now')}</p>
      <h2>${t(challenge.title, language)}</h2>
      ${event ? `<p class="muted">${t(event.title, language)}</p>` : ''}
      <p class="card-story">${t(challenge, language)}</p>
      <div class="challenge-clock"><span class="timer" data-watch-timer>${formatDuration(seconds)}</span><strong>${challenge.coins > 0 ? `+${challenge.coins} ${language === 'de' ? 'Münzen' : 'coins'}` : (language === 'de' ? 'echte Pause' : 'real break')}</strong></div>
      <div class="card-effect">${challenge.secret ? (language === 'de' ? 'Merke dir den Auftrag, lege die Karte verdeckt und verhalte dich unauffällig.' : 'Remember the mission, hide the card, and act naturally.') : (language === 'de' ? 'Laufende Küchen-Challenges bleiben in der Aufgabenliste sichtbar.' : 'Running kitchen challenges remain visible in the task list.')}</div>
      <button class="primary-button" type="button" data-action="complete-watch">${language === 'de' ? 'Challenge abgeschlossen' : 'Challenge complete'}</button>
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
  return `
    <article class="game-card">
      <p class="eyebrow">${tx('chapterComplete', language)}</p>
      <h2>${t(engine.currentChapter.course, language)}</h2>
      <p class="card-story">${t(engine.currentChapter.description, language)}</p>
      <div class="stat-strip">
        ${statusTag(`${engine.state.coins}/${engine.state.coinGoal} ${tx('treasure', language)}`, 'gold')}
        ${statusTag(`${ingredients.length} ${language === 'de' ? 'Zutaten' : 'ingredients'}`, 'green')}
      </div>
      <p>${language === 'de' ? 'Richtet gemeinsam an. Essen hat keinen Zeitdruck – setzt die Reise fort, wenn alle bereit sind.' : 'Plate together. Eating is never timed — continue when everyone is ready.'}</p>
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
    case 'taskBriefing': return renderTaskBriefing(engine, language);
    case 'resolved': return renderResolvedCard(engine, language);
    case 'watch': return renderWatchCard(engine, language);
    case 'chapterReady': return renderChapterReady(engine, language);
    default: return renderDrawCard(engine, language);
  }
}

function renderAssignedTasks(engine, language) {
  const tasks = engine.state.tasks.filter((instance) =>
    instance.chapterIndex === engine.state.chapterIndex &&
    instance.assignedPlayerIds.includes(engine.activePlayer.id) &&
    instance.status !== 'done'
  );
  if (!tasks.length) return '';
  return `
    <section class="panel" style="box-shadow:none">
      <div class="panel-header"><h3>${language === 'de' ? 'Deine Küchenaufgaben' : 'Your galley tasks'}</h3>${statusTag(tasks.length, 'coral')}</div>
      <ul class="task-list">
        ${tasks.slice(0, 3).map((instance) => {
          const card = engine.getTaskCard(instance);
          const remaining = getRemainingSeconds(instance);
          return `<li class="task-item" data-status="${instance.status}">
            <div class="card-row"><strong>${t(card.title, language)}</strong>${instance.endAt ? `<span class="timer" data-task-timer="${escapeHtml(instance.instanceId)}">${formatDuration(remaining)}</span>` : ''}</div>
            <p class="muted">${t(card.instruction, language)}</p>
            ${renderIngredientBasket(engine, instance, language)}
            ${instance.status === 'queued' && instance.instanceId !== engine.state.turn.assignedTaskId ? `<button class="secondary-button" type="button" data-action="start-task" data-task-id="${escapeHtml(instance.instanceId)}">${language === 'de' ? 'Challenge starten' : 'Start challenge'}</button>` : ''}
            ${['queued', 'active', 'ready'].includes(instance.status) ? `<button class="primary-button" type="button" data-action="complete-task" data-task-id="${escapeHtml(instance.instanceId)}">${tx('completeTask', language)}</button>` : ''}
          </li>`;
        }).join('')}
      </ul>
      ${tasks.length > 3 ? `<button class="quiet-button" type="button" data-action="navigate" data-view="tasks">${language === 'de' ? 'Alle Aufgaben öffnen' : 'Open all tasks'}</button>` : ''}
    </section>`;
}

export function renderGame(engine, language) {
  if (engine.state.turn.phase === 'eating') return renderEating(engine, language);
  if (engine.state.turn.phase === 'complete' || engine.state.status === 'completed') return renderComplete(engine, language);
  const player = engine.activePlayer;
  const role = getRole(player.roleId);
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
            <p>${tx('activePlayer', language)} · ${t(role.name, language)} · ${tx('group', language)} ${engine.activeGroup.id}</p>
            <h2>${escapeHtml(player.name)}</h2>
          </div>
        </section>
        ${renderCurrentCard(engine, language)}
        ${renderCourseBasket(engine, language)}
        ${renderAssignedTasks(engine, language)}
      </div>
    </div>`;
}

export function renderEating(engine, language) {
  const course = engine.currentChapter;
  const menu = engine.state.menu[engine.state.chapterIndex];
  const ingredients = menu.ingredientIds.map((id) => engine.getIngredient(id)).filter(Boolean);
  return `
    <section class="hero-screen">
      <div class="panel hero-card">
        <p class="eyebrow">${tx('serveCourse', language)}</p>
        <h1 style="font-size:clamp(2.5rem,7vw,5rem)">${t(course.course, language)}</h1>
        <p class="lead">${t(course.description, language)}</p>
        <div class="stat-strip">${ingredients.slice(0, 12).map((ingredient) => statusTag(t(ingredient.name, language), ingredient.essential ? 'green' : '')).join('')}</div>
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
        <h1 style="font-size:clamp(2.6rem,8vw,5.4rem)">${tx('gameCompleteTitle', language)}</h1>
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
