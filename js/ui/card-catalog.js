import { CHAPTERS } from '../data/chapters.js';
import { EFFECT_TEXT, EVENT_DECKS, EVENT_STAGES, WATCH_CHALLENGES } from '../data/events.js';
import { INGREDIENT_EFFECT_TEXT, INGREDIENTS, SHOPPING_STAPLES } from '../data/ingredients.js';
import { localize } from '../data/i18n.js';
import { ROLES } from '../data/roles.js';
import { ISLAND_STORY_CARDS, LOCATION_STORY_CARDS, STORY_CARDS, STORY_QUIZ_CARDS, storyCardById } from '../data/story-events.js';
import { getPlayableQuestLines } from '../data/tasks.js';
import { escapeHtml, statusTag, t } from './helpers.js';

const CATALOG_STAGE_LABELS = Object.freeze({
  ingredients: { de: 'Vorratsereignisse', en: 'Provision events' },
  tasks: { de: 'Auftragsereignisse', en: 'Work-order events' },
  cooking: { de: 'Freie Kochereignisse', en: 'Open cooking events' }
});

const CATALOG_CATEGORY_LABELS = Object.freeze({
  tapas: { de: 'Feste Tapas-Zutaten', en: 'Fixed Tapas ingredients' },
  vegetable: { de: 'Gemüse', en: 'Vegetables' },
  meat: { de: 'Fleisch', en: 'Meat' },
  pantry: { de: 'Vorrat', en: 'Pantry' },
  fruit: { de: 'Obst', en: 'Fruit' },
  dessert: { de: 'Dessert', en: 'Dessert' },
  drinks: { de: 'Getränke', en: 'Drinks' },
  alcohol: { de: 'Spirituosen', en: 'Spirits' }
});

const CATALOG_TASK_STATUS = Object.freeze({
  queued: { de: 'zugeteilt', en: 'assigned' },
  active: { de: 'läuft', en: 'active' },
  ready: { de: 'zu prüfen', en: 'ready to check' },
  done: { de: 'erledigt', en: 'completed' }
});

const CATALOG_QUEST_PHASE = Object.freeze({
  reset: 0,
  dates: 100,
  bread: 100,
  cold: 100,
  vegetables: 100,
  leaves: 100,
  fruit: 100,
  dressing: 100,
  crunch: 100,
  protein: 100,
  extras: 100,
  prep: 100,
  meat: 100,
  sauce: 100,
  preheat: 100,
  alcoholic: 100,
  'alcohol-free': 100,
  cauldron: 300,
  assembly: 300,
  oven: 500,
  seasoning: 350,
  assemble: 500,
  mixes: 500,
  finish: 600,
  serve: 900,
  cleanup: 1000
});

function catalogLanguageText(language, german, english) {
  return language === 'de' ? german : english;
}

function catalogChallengeText(challenge, language) {
  const replacements = language === 'de' ? {
    activePlayer: 'die aktive Person',
    targetPlayer: 'die Zielperson',
    partner: 'die Partnerperson',
    partner2: 'die zweite Partnerperson'
  } : {
    activePlayer: 'the active player',
    targetPlayer: 'the target player',
    partner: 'the partner',
    partner2: 'the second partner'
  };
  return escapeHtml(String(localize(challenge, language)).replace(/\{(activePlayer|targetPlayer|partner2?)\}/g, (_, key) => replacements[key]));
}

function catalogUsage(engine) {
  const state = engine?.state;
  return {
    hasSession: Boolean(state),
    events: new Set(state?.eventsDrawn ?? []),
    stories: new Set((state?.eventsDrawn ?? []).filter((id) => Boolean(storyCardById(id)))),
    fun: new Set(state?.funCardsDrawn ?? []),
    tasks: new Map((state?.tasks ?? []).map((instance) => [instance.taskId, instance])),
    ingredients: new Map((state?.ingredients ?? []).map((ingredient) => [ingredient.id, ingredient])),
    shoppingStapleNames: state?.shoppingStapleNames ?? {},
    roles: new Set((state?.players ?? []).map((player) => player.roleId))
  };
}

function catalogUsedBadge(used, language, suffix = '') {
  if (!used) return '';
  const label = catalogLanguageText(language, 'verwendet', 'used');
  return statusTag(suffix ? `${label} · ${suffix}` : label, 'green');
}

function catalogGroupSummary(title, used, total, language) {
  const count = used == null
    ? `${total} ${catalogLanguageText(language, 'Karten', 'cards')}`
    : `${used}/${total} ${catalogLanguageText(language, 'verwendet', 'used')}`;
  return `<span class="catalog-summary-title">${escapeHtml(title)}</span><span class="catalog-summary-count">${escapeHtml(count)}</span>`;
}

function catalogTaskTiming(card, language) {
  if (card.timingMode === 'manual') return catalogLanguageText(language, 'Abschluss nach Gargrad', 'complete by doneness');
  if (card.timingMode === 'background') {
    return `${card.backgroundMinutes || card.timerMinutes} ${catalogLanguageText(language, 'Min. Hintergrundtimer', 'min background timer')}`;
  }
  if (card.challengeMinutes) return `${card.challengeMinutes} ${catalogLanguageText(language, 'Min. Challenge', 'min challenge')}`;
  return catalogLanguageText(language, 'ohne Timer', 'without timer');
}

function catalogOrderedQuestLines(chapterIndex) {
  return [...getPlayableQuestLines(chapterIndex)].sort((left, right) => {
    const leftQuest = left[0].questId;
    const rightQuest = right[0].questId;
    const phaseDifference = (CATALOG_QUEST_PHASE[leftQuest] ?? 400) - (CATALOG_QUEST_PHASE[rightQuest] ?? 400);
    if (phaseDifference) return phaseDifference;
    return Math.min(...left.map((card) => card.blueprintIndex)) - Math.min(...right.map((card) => card.blueprintIndex));
  });
}

function catalogPrerequisiteState(requirement, language) {
  return requirement.state === 'started'
    ? catalogLanguageText(language, 'begonnen sein', 'be started')
    : catalogLanguageText(language, 'erledigt sein', 'be completed');
}

function catalogIngredientRequirement(requirement, language, usage = null) {
  if (!requirement) return '';
  const ingredientById = (ingredientId) => usage?.ingredients.get(ingredientId) ?? INGREDIENTS.find((ingredient) => ingredient.id === ingredientId);
  const requiredIngredients = (requirement.ids ?? []).map(ingredientById).filter(Boolean);
  const requiredCategories = (requirement.categories ?? []).map((category) => localize(CATALOG_CATEGORY_LABELS[category] ?? category, language));
  const excludedIngredients = (requirement.excludeIds ?? []).map(ingredientById).filter(Boolean);
  const ingredientNames = requiredIngredients.map((ingredient) => localize(ingredient.name, language));
  const excludedNames = excludedIngredients.map((ingredient) => localize(ingredient.name, language));
  const alternatives = [...ingredientNames, ...requiredCategories];
  const selection = alternatives.join(catalogLanguageText(language, ' oder ', ' or '));
  const base = alternatives.length === 1
    ? catalogLanguageText(language, `Nur wenn dem Gang ${selection} zugeordnet ist.`, `Only if ${selection} is assigned to the course.`)
    : catalogLanguageText(language, `Nur wenn dem Gang mindestens eine passende Zutat zugeordnet ist: ${selection}.`, `Only if at least one matching ingredient is assigned to the course: ${selection}.`);
  if (!excludedNames.length) return base;
  return `${base} ${catalogLanguageText(language, `${excludedNames.join(', ')} zählt dabei nicht.`, `${excludedNames.join(', ')} does not count.`)}`;
}

function catalogQuoted(value, language) {
  return language === 'de' ? `„${value}“` : `“${value}”`;
}

function catalogIngredientText(value, usage) {
  if (!usage?.hasSession || !value || typeof value !== 'object') return value;
  const replacements = [
    ...INGREDIENTS.map((ingredient) => ({ originalName: ingredient.name, customName: usage.ingredients.get(ingredient.id)?.customName })),
    ...SHOPPING_STAPLES.map((staple) => ({ originalName: staple.name, customName: usage.shoppingStapleNames[staple.id] }))
  ].filter((replacement) => replacement.customName);
  return Object.fromEntries(['de', 'en'].map((language) => [language, replacements.reduce((text, replacement) => {
    const originalName = replacement.originalName[language];
    const lowerCaseVariant = `${originalName.charAt(0).toLocaleLowerCase(language)}${originalName.slice(1)}`;
    return [...new Set([originalName, lowerCaseVariant])]
      .reduce((result, variant) => result.replaceAll(variant, replacement.customName[language]), text);
  }, String(value[language] ?? ''))]));
}

function catalogTaskRequirements(card, cardByBlueprint, language, previousCard = null, usage = null) {
  const requirements = [];
  const directPrerequisites = card.prerequisites ?? [];
  const previousIsCompatible = previousCard && (!previousCard.courseStyles?.length || !card.courseStyles?.length || previousCard.courseStyles.some((style) => card.courseStyles.includes(style)));
  const previousIsExplicit = previousCard && [...directPrerequisites, ...(card.alternativePrerequisites ?? [])]
    .some((requirement) => requirement.requiredBlueprintIndex === previousCard.blueprintIndex);
  if (previousIsCompatible && !previousIsExplicit && !card.alternativePrerequisites?.length) {
    requirements.push(catalogLanguageText(
      language,
      `Der vorherige Questschritt ${catalogQuoted(localize(previousCard.title, language), language)} muss erledigt sein.`,
      `The previous quest step ${catalogQuoted(localize(previousCard.title, language), language)} must be completed.`
    ));
  }
  const crossLinePrerequisites = directPrerequisites.filter((requirement) => cardByBlueprint.get(requirement.requiredBlueprintIndex)?.questId !== card.questId);
  const sameLinePrerequisites = directPrerequisites.filter((requirement) => cardByBlueprint.get(requirement.requiredBlueprintIndex)?.questId === card.questId);
  if (card.questId === 'serve' && crossLinePrerequisites.length) {
    requirements.push(catalogLanguageText(language, 'Alle fachlich benötigten Zubereitungsaufgaben dieses Gangs müssen erledigt sein.', 'Every required preparation task for this course must be completed.'));
  } else if (card.questId === 'cleanup' && crossLinePrerequisites.length) {
    requirements.push(catalogLanguageText(language, 'Der Gang muss vollständig vorbereitet und serviert sein.', 'The course must be fully prepared and served.'));
  }
  const prerequisitesToName = ['serve', 'cleanup'].includes(card.questId) ? sameLinePrerequisites : directPrerequisites;
  prerequisitesToName.forEach((requirement) => {
      const prerequisite = cardByBlueprint.get(requirement.requiredBlueprintIndex);
      if (!prerequisite) return;
      requirements.push(catalogLanguageText(
        language,
        `${catalogQuoted(localize(prerequisite.title, language), language)} muss ${catalogPrerequisiteState(requirement, language)}.`,
        `${catalogQuoted(localize(prerequisite.title, language), language)} must ${catalogPrerequisiteState(requirement, language)}.`
      ));
  });
  if (card.alternativePrerequisites?.length) {
    const alternatives = card.alternativePrerequisites
      .map((requirement) => cardByBlueprint.get(requirement.requiredBlueprintIndex))
      .filter(Boolean)
      .map((prerequisite) => catalogQuoted(localize(prerequisite.title, language), language));
    if (alternatives.length) {
      requirements.push(catalogLanguageText(
        language,
        `Zusätzlich muss mindestens eine dieser Aufgaben erledigt sein: ${alternatives.join(' oder ')}.`,
        `In addition, at least one of these tasks must be completed: ${alternatives.join(' or ')}.`
      ));
    }
  }
  if (card.courseStyles?.length) {
    const styles = card.courseStyles.map((style) => style === 'cream'
      ? catalogLanguageText(language, 'Cremesuppe', 'cream soup')
      : style === 'clear'
        ? catalogLanguageText(language, 'klare Suppe', 'clear soup')
        : style);
    requirements.push(catalogLanguageText(language, `Nur bei ${styles.join(' oder ')}.`, `Only for ${styles.join(' or ')}.`));
  }
  const ingredientRequirement = catalogIngredientRequirement(card.ingredientRequirement, language, usage);
  if (ingredientRequirement) requirements.push(ingredientRequirement);
  if (card.repeatOnRelief) {
    requirements.push(catalogLanguageText(
      language,
      'Bei „Kesselwache ablösen“ wird dieselbe Karte wieder ganz oben auf den Aufgabenstapel gelegt. Erst „Suppe ist fertig“ schließt diese Questlinie ab.',
      'Choosing “Relieve cauldron watch” returns this same card to the very top of the task deck. Only “Soup is ready” completes this quest line.'
    ));
  }
  if (card.automatic) {
    requirements.push(catalogLanguageText(
      language,
      'Erscheint automatisch und ohne Personenzuweisung in der Aufgabenliste, sobald der vorherige Schritt abgeschlossen ist.',
      'Appears automatically in the task list without a player assignment once the previous step is complete.'
    ));
  }
  if (!requirements.length) return '';
  return `<div class="quest-requirements"><strong>${catalogLanguageText(language, 'Voraussetzung', 'Requirement')}</strong><ul>${requirements.map((requirement) => `<li>${escapeHtml(requirement)}</li>`).join('')}</ul></div>`;
}

function catalogTaskCard(card, usage, language, cardByBlueprint, previousCard = null) {
  const instance = usage.tasks.get(card.id);
  const used = Boolean(instance);
  const people = card.unassigned
    ? catalogLanguageText(language, 'nicht zugewiesen', 'unassigned')
    : `${card.people[0] === card.people[1] ? String(card.people[0]) : `${card.people[0]}–${card.people[1]}`} ${catalogLanguageText(language, 'Personen', 'players')}`;
  const taskState = instance ? t(CATALOG_TASK_STATUS[instance.status] ?? instance.status, language) : '';
  const title = catalogIngredientText(card.title, usage);
  const instruction = catalogIngredientText(card.instruction, usage);
  return `<article class="catalog-card quest-node" data-card-kind="quest" data-card-id="${escapeHtml(card.id)}" data-used="${used}">
    <div class="catalog-card-top"><span class="catalog-card-id">${escapeHtml(card.id)}</span>${catalogUsedBadge(used, language, taskState)}</div>
    <h4>${t(title, language)}</h4>
    <p>${t(instruction, language)}</p>
    ${catalogTaskRequirements(card, cardByBlueprint, language, previousCard, usage)}
    <div class="catalog-card-meta"><span>${escapeHtml(people)}</span><span>${escapeHtml(catalogTaskTiming(card, language))}</span></div>
  </article>`;
}

function catalogQuestLineRequirement(questId, language) {
  if (questId === 'reset') {
    return catalogLanguageText(language, 'Startet zuerst: Der vorherige Gang wurde gegessen und der Tisch kann abgeräumt werden.', 'Starts first: the previous course has been eaten and the table can be cleared.');
  }
  if (questId === 'serve') {
    return catalogLanguageText(language, 'Startet erst, wenn alle benötigten Zubereitungsquestlinien abgeschlossen sind.', 'Starts only after every required preparation quest line is complete.');
  }
  if (questId === 'cleanup') {
    return catalogLanguageText(language, 'Startet zuletzt, nachdem der Gang vollständig serviert wurde.', 'Starts last, after the course has been fully served.');
  }
  return '';
}

function catalogCourseFlow(chapterIndex, language) {
  return chapterIndex === 0
    ? catalogLanguageText(language, 'Zubereitungsquestlinien parallel starten → Tapas servieren → Kombüse aufräumen', 'Start preparation quest lines in parallel → serve Tapas → clean the galley')
    : catalogLanguageText(language, 'Vorherigen Gang abräumen → Zutaten festlegen → mögliche Zubereitungsquestlinien parallel starten → servieren → aufräumen', 'Clear the previous course → lock in ingredients → start eligible preparation quest lines in parallel → serve → clean up');
}

function catalogQuestGraphs(usage, language, currentChapterIndex) {
  return CHAPTERS.map((chapter, chapterIndex) => {
    const lines = catalogOrderedQuestLines(chapterIndex);
    const cards = lines.flat();
    const cardByBlueprint = new Map(cards.map((card) => [card.blueprintIndex, card]));
    const used = cards.filter((card) => usage.tasks.has(card.id)).length;
    const shouldOpen = chapterIndex === (Number.isInteger(currentChapterIndex) ? currentChapterIndex : 0);
    return `<details class="catalog-subgroup quest-course"${shouldOpen ? ' open' : ''}>
      <summary>${catalogGroupSummary(`${t(chapter.course, language)} · ${t(chapter.name, language)}`, usage.hasSession ? used : null, cards.length, language)}</summary>
      <div class="quest-graph" aria-label="${escapeHtml(catalogLanguageText(language, `Questlinien für ${localize(chapter.course, language)}`, `Quest lines for ${localize(chapter.course, language)}`))}">
        <p class="quest-course-flow"><strong>${catalogLanguageText(language, 'Typischer Ablauf', 'Typical flow')}:</strong> ${escapeHtml(catalogCourseFlow(chapterIndex, language))}</p>
        ${lines.map((line, lineIndex) => {
          const lineRequirement = catalogQuestLineRequirement(line[0].questId, language);
          return `<section class="quest-line" data-chapter-id="${escapeHtml(chapter.id)}" data-quest-id="${escapeHtml(line[0].questId)}" data-quest-order="${lineIndex + 1}">
          <div class="quest-line-heading"><span class="quest-line-marker" aria-hidden="true">${lineIndex + 1}</span><div><p class="eyebrow">${catalogLanguageText(language, 'Questlinie', 'Quest line')} ${lineIndex + 1}</p><h3>${t(line[0].questName, language)}</h3>${lineRequirement ? `<p class="quest-line-requirement">${escapeHtml(lineRequirement)}</p>` : ''}</div></div>
          <div class="quest-line-track">${line.map((card, index) => `${index ? '<span class="quest-edge" aria-hidden="true">→</span>' : ''}${catalogTaskCard(card, usage, language, cardByBlueprint, line[index - 1] ?? null)}`).join('')}</div>
        </section>`;
        }).join('')}
      </div>
    </details>`;
  }).join('');
}

function catalogFunCard(challenge, usage, language, kind) {
  const used = usage.fun.has(challenge.id);
  const traits = [];
  if (challenge.secret) traits.push(catalogLanguageText(language, 'geheim', 'secret'));
  if (challenge.flow === 'ongoing') traits.push(catalogLanguageText(language, 'mehrere Züge', 'multi-turn'));
  if (challenge.mandatory) traits.push(catalogLanguageText(language, 'verbindlich', 'mandatory'));
  if (challenge.partnerCount) traits.push(`${challenge.partnerCount + 1} ${catalogLanguageText(language, 'Personen', 'players')}`);
  if (challenge.durationSeconds && challenge.flow !== 'ongoing') traits.push(challenge.durationSeconds < 60
    ? `${challenge.durationSeconds} ${catalogLanguageText(language, 'Sek.', 'sec')}`
    : `${challenge.minutes} ${catalogLanguageText(language, 'Min.', 'min')}`);
  if (challenge.skillCheck) traits.push(language === 'de'
    ? `${challenge.dexterity ? 'Geschicklichkeit' : 'Erfolgswertung'} · Erfolg +${challenge.successCoins} · Scheitern −${Math.abs(challenge.failureCoins)}`
    : `${challenge.dexterity ? 'Dexterity' : 'Scored outcome'} · success +${challenge.successCoins} · failure −${Math.abs(challenge.failureCoins)}`);
  return `<article class="catalog-card" data-card-kind="${kind}" data-card-id="${escapeHtml(challenge.id)}" data-used="${used}">
    <div class="catalog-card-top"><span class="catalog-card-id">${escapeHtml(challenge.id)}</span>${catalogUsedBadge(used, language)}</div>
    <h3>${t(challenge.title, language)}</h3>
    <p>${catalogChallengeText(challenge, language)}</p>
    <div class="catalog-card-meta">${traits.map((trait) => `<span>${escapeHtml(trait)}</span>`).join('')}</div>
  </article>`;
}

function catalogFunGroup(challenges, usage, language, cooperative) {
  const id = cooperative ? 'coop-fun-cards' : 'fun-cards';
  const title = cooperative
    ? catalogLanguageText(language, 'Koop-Spaßkarten', 'Co-op fun cards')
    : catalogLanguageText(language, 'Spaßkarten', 'Fun cards');
  const lead = cooperative
    ? catalogLanguageText(language, 'Diese Karten binden zwei oder drei gerade freie Personen in eine gemeinsame Mini-Aufgabe ein.', 'These cards involve two or three currently free players in a shared mini-task.')
    : catalogLanguageText(language, 'Kurze, geheime und fortlaufende Bordaufgaben. Jede davon kann pro Reise nur einmal gezogen werden.', 'Quick, secret, and ongoing deck duties. Each can be drawn only once per voyage.');
  const used = challenges.filter((challenge) => usage.fun.has(challenge.id)).length;
  return `<section class="catalog-section" id="${id}">
    <div class="section-header"><div><p class="eyebrow">${catalogLanguageText(language, 'Eigenständiger Kartenstapel', 'Separate card deck')}</p><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(lead)}</p></div>${statusTag(usage.hasSession ? `${used}/${challenges.length}` : `${challenges.length}`, used ? 'green' : '')}</div>
    <div class="catalog-card-grid">${challenges.map((challenge) => catalogFunCard(challenge, usage, language, cooperative ? 'coop-fun' : 'fun')).join('')}</div>
  </section>`;
}

function catalogEventMechanics(event, language) {
  const mechanics = event.options ?? event.outcomes ?? [];
  if (!mechanics.length) return '';
  return `<details class="catalog-card-detail"><summary>${catalogLanguageText(language, 'Mögliche Effekte', 'Possible effects')}</summary><ul>${mechanics.map((mechanic) => `<li>${t(EFFECT_TEXT[mechanic] ?? mechanic, language)}</li>`).join('')}</ul></details>`;
}

function catalogEventCard(event, usage, language) {
  const used = usage.events.has(event.id);
  const type = event.type === 'dice'
    ? catalogLanguageText(language, 'Würfelkarte', 'dice card')
    : catalogLanguageText(language, 'Auswahlkarte', 'choice card');
  return `<article class="catalog-card" data-card-kind="event" data-card-id="${escapeHtml(event.id)}" data-used="${used}">
    <div class="catalog-card-top"><span class="catalog-card-id">${escapeHtml(event.id)}</span>${catalogUsedBadge(used, language)}</div>
    <h3>${t(event.title, language)}</h3>
    <p>${t(event.story, language)}</p>
    <div class="catalog-card-meta"><span>${escapeHtml(type)}</span></div>
    ${catalogEventMechanics(event, language)}
  </article>`;
}

function catalogEventGroups(usage, language) {
  return EVENT_STAGES.map((stage) => {
    const events = EVENT_DECKS.flatMap((deck) => deck.filter((event) => event.stage === stage));
    const used = events.filter((event) => usage.events.has(event.id)).length;
    return `<details class="catalog-subgroup event-stage">
      <summary>${catalogGroupSummary(t(CATALOG_STAGE_LABELS[stage], language), usage.hasSession ? used : null, events.length, language)}</summary>
      <div class="catalog-course-groups">${CHAPTERS.map((chapter, chapterIndex) => {
        const courseEvents = EVENT_DECKS[chapterIndex].filter((event) => event.stage === stage);
        return `<section><h3>${t(chapter.course, language)} · ${t(chapter.name, language)}</h3><div class="catalog-card-grid">${courseEvents.map((event) => catalogEventCard(event, usage, language)).join('')}</div></section>`;
      }).join('')}</div>
    </details>`;
  }).join('');
}

function catalogStoryRequirement(card, language) {
  if (card.storyKind === 'island') {
    return catalogLanguageText(
      language,
      `Pflichtkarte: Wird beim ersten Betreten der ${localize(CHAPTERS[card.chapterIndex].name, language)} als erste Storykarte oben auf den Stapel gelegt.`,
      `Required card: Placed on top of the deck as the first story card when ${localize(CHAPTERS[card.chapterIndex].name, language)} is entered.`
    );
  }
  if (card.storyKind === 'location') {
    const location = CHAPTERS[card.chapterIndex].locations[card.locationIndex];
    return catalogLanguageText(
      language,
      `Pflichtkarte: Wird beim ersten Besuch von ${localize(location, language)} oben auf den Stapel gelegt.`,
      `Required card: Placed on top of the deck on the first visit to ${localize(location, language)}.`
    );
  }
  const requirements = card.requirements ?? {};
  const parts = [];
  (requirements.storyIds ?? []).forEach((storyId) => {
    const source = storyCardById(storyId);
    if (source) parts.push(catalogLanguageText(language, `Erst nachdem „${localize(source.title, language)}“ vorgelesen wurde.`, `Only after “${localize(source.title, language)}” has been read aloud.`));
  });
  (requirements.visitedLocationIds ?? []).forEach((key) => {
    const [chapterIndex, locationIndex] = key.split(':').map(Number);
    const location = CHAPTERS[chapterIndex]?.locations[locationIndex];
    if (location) parts.push(catalogLanguageText(language, `${localize(location, language)} muss bereits besucht worden sein.`, `${localize(location, language)} must already have been visited.`));
  });
  (requirements.unvisitedLocationIds ?? []).forEach((key) => {
    const [chapterIndex, locationIndex] = key.split(':').map(Number);
    const location = CHAPTERS[chapterIndex]?.locations[locationIndex];
    if (location) parts.push(catalogLanguageText(language, `${localize(location, language)} darf noch nicht besucht worden sein.`, `${localize(location, language)} must not have been visited yet.`));
  });
  return parts.join(' ');
}

function catalogStoryCard(card, usage, language) {
  const used = usage.stories.has(card.id);
  const requirement = catalogStoryRequirement(card, language);
  const quiz = card.storyKind === 'quiz';
  const correctAnswer = quiz ? card.answers.find((answer) => answer.id === card.correctAnswerId) : null;
  const sentenceCount = quiz ? 0 : (localize(card.story, language).match(/[^.!?]+[.!?]/g) ?? []).length;
  return `<article class="catalog-card" data-card-kind="${quiz ? 'story-quiz' : `story-${card.storyKind}`}" data-story-kind="${escapeHtml(card.storyKind)}"${quiz ? ` data-quiz-kind="${escapeHtml(card.quizKind)}"` : ''} data-card-id="${escapeHtml(card.id)}" data-used="${used}">
    <div class="catalog-card-top"><span class="catalog-card-id">${escapeHtml(card.id)}</span>${catalogUsedBadge(used, language)}</div>
    <h3>${t(card.title, language)}</h3>
    <p>${quiz ? t(card.question, language) : t(card.story, language)}</p>
    <div class="quest-requirements"><strong>${catalogLanguageText(language, 'Voraussetzung', 'Requirement')}</strong><p>${escapeHtml(requirement)}</p></div>
    ${quiz ? `<details class="catalog-card-detail"><summary>${catalogLanguageText(language, 'Antworten und Wertung', 'Answers and scoring')}</summary><ul>${card.answers.map((answer) => `<li>${t(answer.label, language)}${answer.id === correctAnswer.id ? ` · ${catalogLanguageText(language, 'richtig', 'correct')}` : ''}</li>`).join('')}</ul><p>${catalogLanguageText(language, 'Richtig +3 Münzen · falsch −3 Münzen.', 'Correct +3 coins · wrong −3 coins.')}</p></details>` : `<div class="catalog-card-meta"><span>${escapeHtml(catalogLanguageText(language, `${sentenceCount} Sätze · laut vorlesen`, `${sentenceCount} sentences · read aloud`))}</span></div>`}
  </article>`;
}

function catalogStoryGroups(usage, language) {
  const islandUsed = ISLAND_STORY_CARDS.filter((card) => usage.stories.has(card.id)).length;
  const locationUsed = LOCATION_STORY_CARDS.filter((card) => usage.stories.has(card.id)).length;
  const islandDetailCards = STORY_QUIZ_CARDS.filter((card) => card.quizKind === 'island-detail');
  const locationDetailCards = STORY_QUIZ_CARDS.filter((card) => card.quizKind === 'location-detail');
  const routeCards = STORY_QUIZ_CARDS.filter((card) => card.quizKind === 'route');
  const islandDetailUsed = islandDetailCards.filter((card) => usage.stories.has(card.id)).length;
  const locationDetailUsed = locationDetailCards.filter((card) => usage.stories.has(card.id)).length;
  const routeUsed = routeCards.filter((card) => usage.stories.has(card.id)).length;
  const totalUsed = islandUsed + locationUsed + islandDetailUsed + locationDetailUsed + routeUsed;
  const locationGroups = CHAPTERS.map((chapter, chapterIndex) => {
    const cards = LOCATION_STORY_CARDS
      .filter((card) => card.chapterIndex === chapterIndex)
      .sort((left, right) => left.locationIndex - right.locationIndex);
    return `<section data-story-island="${escapeHtml(chapter.id)}"><h3>${chapter.number}. ${t(chapter.name, language)}</h3><div class="catalog-card-grid">${cards.map((card) => catalogStoryCard(card, usage, language)).join('')}</div></section>`;
  }).join('');
  return `<section class="catalog-section" id="story-cards">
    <div class="section-header"><div><p class="eyebrow">${catalogLanguageText(language, 'Chronik der Reise', 'Voyage chronicle')}</p><h2>${catalogLanguageText(language, 'Storykarten', 'Story cards')}</h2><p class="muted">${catalogLanguageText(language, 'Jede Insel beginnt mit ihrer verpflichtenden Inselgeschichte, direkt gefolgt von der Geschichte des ersten Ortes. Weitere Ortsgeschichten erscheinen beim ersten Besuch; Quizkarten beachten ihre Story- und Besuchsvoraussetzungen.', 'Each island begins with its required island story, immediately followed by the first location story. Further location stories appear on first visit; quiz cards respect their story and visit requirements.')}</p></div>${statusTag(usage.hasSession ? `${totalUsed}/${STORY_CARDS.length}` : `${STORY_CARDS.length}`, totalUsed ? 'green' : 'gold')}</div>
    <details class="catalog-subgroup" open><summary>${catalogGroupSummary(catalogLanguageText(language, 'Story Insel Karten', 'Island Story Cards'), usage.hasSession ? islandUsed : null, ISLAND_STORY_CARDS.length, language)}</summary><div class="catalog-card-grid">${ISLAND_STORY_CARDS.map((card) => catalogStoryCard(card, usage, language)).join('')}</div></details>
    <details class="catalog-subgroup" open><summary>${catalogGroupSummary(catalogLanguageText(language, 'Story Ort Karten', 'Location Story Cards'), usage.hasSession ? locationUsed : null, LOCATION_STORY_CARDS.length, language)}</summary><div class="catalog-course-groups">${locationGroups}</div></details>
    <details class="catalog-subgroup"><summary>${catalogGroupSummary(catalogLanguageText(language, 'Detail Insel Quiz Karten', 'Island Detail Quiz Cards'), usage.hasSession ? islandDetailUsed : null, islandDetailCards.length, language)}</summary><div class="catalog-card-grid">${islandDetailCards.map((card) => catalogStoryCard(card, usage, language)).join('')}</div></details>
    <details class="catalog-subgroup"><summary>${catalogGroupSummary(catalogLanguageText(language, 'Detail Ort Quiz Karten', 'Location Detail Quiz Cards'), usage.hasSession ? locationDetailUsed : null, locationDetailCards.length, language)}</summary><div class="catalog-card-grid">${locationDetailCards.map((card) => catalogStoryCard(card, usage, language)).join('')}</div></details>
    <details class="catalog-subgroup"><summary>${catalogGroupSummary(catalogLanguageText(language, 'Insel Quiz Karten', 'Island Quiz Cards'), usage.hasSession ? routeUsed : null, routeCards.length, language)}</summary><div class="catalog-card-grid">${routeCards.map((card) => catalogStoryCard(card, usage, language)).join('')}</div></details>
  </section>`;
}

function catalogIngredientUse(ingredientState, language) {
  if (!ingredientState || ingredientState.status === 'available') return { used: false, suffix: '' };
  const labels = {
    discovered: { de: 'im Gangkorb', en: 'in course basket' },
    locked: { de: 'festgelegt', en: 'locked in' },
    used: { de: 'zubereitet', en: 'prepared' }
  };
  return { used: true, suffix: t(labels[ingredientState.status] ?? ingredientState.status, language) };
}

function catalogIngredientCard(ingredient, usage, language) {
  const ingredientState = usage.ingredients.get(ingredient.id);
  const ingredientUse = catalogIngredientUse(ingredientState, language);
  const displayIngredient = ingredientState ?? ingredient;
  const courses = ingredient.courseTags.map((courseId) => CHAPTERS.find((chapter) => chapter.id === courseId)?.course ?? courseId);
  return `<article class="catalog-card" data-card-kind="ingredient" data-card-id="${escapeHtml(ingredient.id)}" data-used="${ingredientUse.used}">
    <div class="catalog-card-top"><span class="catalog-card-id">${escapeHtml(ingredient.id)}</span>${catalogUsedBadge(ingredientUse.used, language, ingredientUse.suffix)}</div>
    <h3>${t(displayIngredient.name, language)}</h3>
    ${ingredientState?.customName ? `<p class="muted">${catalogLanguageText(language, 'Angepasster Zutatenname', 'Customized ingredient name')}</p>` : ''}
    <p class="muted">${catalogLanguageText(language, 'Mögliche Gänge', 'Possible courses')}: ${courses.map((course) => t(course, language)).join(' · ')}</p>
    ${ingredient.effect ? `<p class="catalog-effect"><strong>${catalogLanguageText(language, 'Karteneffekt', 'Card effect')}:</strong> ${t(INGREDIENT_EFFECT_TEXT[ingredient.effect] ?? ingredient.effect, language)}</p>` : ''}
  </article>`;
}

function catalogIngredientGroups(usage, language) {
  const categories = [...new Set(INGREDIENTS.map((ingredient) => ingredient.category))];
  return categories.map((category) => {
    const ingredients = INGREDIENTS.filter((ingredient) => ingredient.category === category);
    const used = ingredients.filter((ingredient) => catalogIngredientUse(usage.ingredients.get(ingredient.id), language).used).length;
    return `<details class="catalog-subgroup ingredient-group">
      <summary>${catalogGroupSummary(t(CATALOG_CATEGORY_LABELS[category] ?? category, language), usage.hasSession ? used : null, ingredients.length, language)}</summary>
      <div class="catalog-card-grid">${ingredients.map((ingredient) => catalogIngredientCard(ingredient, usage, language)).join('')}</div>
    </details>`;
  }).join('');
}

function catalogRoleCard(role, usage, language) {
  const used = usage.roles.has(role.id);
  return `<article class="catalog-card role-catalog-card" data-card-kind="role" data-card-id="${escapeHtml(role.id)}" data-used="${used}">
    <div class="catalog-card-top"><span class="role-catalog-icon" style="--role-color:${escapeHtml(role.color)}" aria-hidden="true">${escapeHtml(role.icon)}</span>${catalogUsedBadge(used, language, catalogLanguageText(language, 'vergeben', 'assigned'))}</div>
    <h3>${t(role.name, language)}</h3>
    <p><strong>${catalogLanguageText(language, 'Passiv', 'Passive')}:</strong> ${t(role.passive, language)}</p>
    <p><strong>${catalogLanguageText(language, 'Aktiv', 'Active')}:</strong> ${t(role.active, language)}</p>
    <div class="catalog-card-meta"><span>${role.uses} ${catalogLanguageText(language, 'aktive Einsätze', 'active uses')}</span></div>
  </article>`;
}

function catalogUsageTotals(usage) {
  const tasks = CHAPTERS.flatMap((_, index) => getPlayableQuestLines(index).flat());
  const events = EVENT_DECKS.flat();
  const ingredientUsed = INGREDIENTS.filter((ingredient) => catalogIngredientUse(usage.ingredients.get(ingredient.id), 'de').used).length;
  const total = tasks.length + events.length + STORY_CARDS.length + WATCH_CHALLENGES.length + INGREDIENTS.length + ROLES.length;
  const used = tasks.filter((card) => usage.tasks.has(card.id)).length
    + events.filter((card) => usage.events.has(card.id)).length
    + STORY_CARDS.filter((card) => usage.stories.has(card.id)).length
    + WATCH_CHALLENGES.filter((card) => usage.fun.has(card.id)).length
    + ingredientUsed
    + ROLES.filter((role) => usage.roles.has(role.id)).length;
  return { total, used };
}

export function renderCardCatalog(engine, language) {
  const usage = catalogUsage(engine);
  const totals = catalogUsageTotals(usage);
  const standardFun = WATCH_CHALLENGES.filter((challenge) => !challenge.cooperative);
  const cooperativeFun = WATCH_CHALLENGES.filter((challenge) => challenge.cooperative);
  const statusLead = usage.hasSession
    ? catalogLanguageText(language, 'Grün markierte Karten wurden in der laufenden Reise bereits gezogen, zugeteilt oder festgelegt.', 'Cards marked in green have already been drawn, assigned, or locked in during the current voyage.')
    : catalogLanguageText(language, 'Startet oder ladet eine Reise, damit bereits verwendete Karten hier automatisch grün markiert werden.', 'Start or load a voyage to automatically mark used cards in green here.');
  return `<section class="screen-padding card-catalog">
    <header class="catalog-hero panel">
      <div><p class="eyebrow">${catalogLanguageText(language, 'Kartenarchiv der Crew', 'Crew card archive')}</p><h1>${catalogLanguageText(language, 'Übersicht aller Karten', 'All cards')}</h1><p class="muted">${escapeHtml(statusLead)}</p></div>
      ${statusTag(usage.hasSession ? `${totals.used}/${totals.total} ${catalogLanguageText(language, 'verwendet', 'used')}` : `${totals.total} ${catalogLanguageText(language, 'Karten', 'cards')}`, usage.hasSession && totals.used ? 'green' : 'gold')}
    </header>

    <nav class="catalog-jumps" aria-label="${catalogLanguageText(language, 'Kartengruppen', 'Card groups')}">
      <a href="#quest-cards">${catalogLanguageText(language, 'Questlinien', 'Quest lines')}</a>
      <a href="#story-cards">${catalogLanguageText(language, 'Story', 'Story')}</a>
      <a href="#fun-cards">${catalogLanguageText(language, 'Spaß', 'Fun')}</a>
      <a href="#coop-fun-cards">${catalogLanguageText(language, 'Koop-Spaß', 'Co-op fun')}</a>
      <a href="#event-cards">${catalogLanguageText(language, 'Ereignisse', 'Events')}</a>
      <a href="#ingredient-cards">${catalogLanguageText(language, 'Zutaten', 'Ingredients')}</a>
      <a href="#role-cards">${catalogLanguageText(language, 'Figuren', 'Characters')}</a>
    </nav>

    <section class="catalog-section" id="quest-cards">
      <div class="section-header"><div><p class="eyebrow">${catalogLanguageText(language, 'Küchenaufträge', 'Kitchen jobs')}</p><h2>${catalogLanguageText(language, 'Questlinien', 'Quest lines')}</h2><p class="muted">${catalogLanguageText(language, 'Die Pfeile zeigen die Reihenfolge innerhalb einer Questlinie. Verschiedene Linien können parallel laufen; Servieren und Aufräumen warten auf ihre fachlichen Voraussetzungen.', 'Arrows show the order within a quest line. Separate lines may run in parallel; serving and cleanup wait for their practical prerequisites.')}</p></div></div>
      ${catalogQuestGraphs(usage, language, engine?.state.chapterIndex)}
    </section>

    ${catalogStoryGroups(usage, language)}

    ${catalogFunGroup(standardFun, usage, language, false)}
    ${catalogFunGroup(cooperativeFun, usage, language, true)}

    <section class="catalog-section" id="event-cards">
      <div class="section-header"><div><p class="eyebrow">${catalogLanguageText(language, 'Nach Spielphase und Gang', 'By game stage and course')}</p><h2>${catalogLanguageText(language, 'Ereigniskarten', 'Event cards')}</h2><p class="muted">${catalogLanguageText(language, 'Öffnet eine Phase; darin sind die Karten nach Gängen gruppiert.', 'Open a stage; its cards are grouped by course.')}</p></div></div>
      ${catalogEventGroups(usage, language)}
    </section>

    <section class="catalog-section" id="ingredient-cards">
      <div class="section-header"><div><p class="eyebrow">${catalogLanguageText(language, 'Globaler Vorrat', 'Global pantry')}</p><h2>${catalogLanguageText(language, 'Zutatenkarten', 'Ingredient cards')}</h2><p class="muted">${catalogLanguageText(language, 'Die Gang-Tags zeigen, wo eine Zutat grundsätzlich eingesetzt werden kann.', 'Course tags show where an ingredient can generally be used.')}</p></div></div>
      ${catalogIngredientGroups(usage, language)}
    </section>

    <section class="catalog-section" id="role-cards">
      <div class="section-header"><div><p class="eyebrow">${catalogLanguageText(language, 'Crewfähigkeiten', 'Crew abilities')}</p><h2>${catalogLanguageText(language, 'Figurenkarten', 'Character cards')}</h2></div></div>
      <div class="catalog-card-grid">${ROLES.map((role) => catalogRoleCard(role, usage, language)).join('')}</div>
    </section>
  </section>`;
}
