import { CHAPTERS } from '../data/chapters.js';
import { INGREDIENTS, INGREDIENT_EFFECT_TEXT, SHOPPING_STAPLES, suggestQuantity } from '../data/ingredients.js';
import { formatDate, formatDuration, localize } from '../data/i18n.js';
import { getElapsedSeconds, getRemainingSeconds, getTaskTimerProgress } from '../core/timers.js';
import { avatar, escapeHtml, statusTag, t, tx } from './helpers.js';
import { getRole } from '../data/roles.js';

const STATUS_TONE = { queued: '', active: 'gold', ready: 'coral', done: 'green' };

function taskStatusLabel(status, language) {
  const labels = {
    queued: { de: 'zugeteilt', en: 'assigned' },
    active: { de: 'läuft', en: 'active' },
    ready: { de: 'prüfen', en: 'check now' },
    done: { de: 'erledigt', en: 'completed' }
  };
  return t(labels[status] ?? status, language);
}

function renderTaskBasket(engine, instance, language) {
  const ingredients = (instance.basketIngredientIds ?? []).map((id) => engine.getIngredient(id)).filter(Boolean);
  return `<div class="task-basket"><strong>${language === 'de' ? 'Relevante Gangzutaten' : 'Relevant course ingredients'}</strong>${ingredients.length
    ? `<div class="basket-chips">${ingredients.map((ingredient) => `<span>${escapeHtml(t(ingredient.name, language))}</span>`).join('')}</div>`
    : `<p>${language === 'de' ? 'Für diesen Schritt sind keine bestimmten Gangzutaten nötig.' : 'This step does not need specific course ingredients.'}</p>`}</div>`;
}

function taskTimerCaption(instance, timingMode, remaining, language) {
  if (timingMode === 'background') {
    return language === 'de' ? 'Erinnerung bis zum nächsten Questschritt' : 'reminder until the next quest step';
  }
  if (remaining < 0) {
    return instance.status === 'done'
      ? (language === 'de' ? 'Überlänge beim Abschluss' : 'overtime at completion')
      : (language === 'de' ? 'Überlänge' : 'overtime');
  }
  return instance.status === 'done'
    ? (language === 'de' ? 'Restzeit beim Abschluss' : 'time remaining at completion')
    : tx('remaining', language);
}

function taskCoinTag(instance, language) {
  if (instance.status !== 'done' || !Number.isFinite(instance.challengeCoinValue)) return '';
  if (['background', 'manual'].includes(instance.challengeResult)) {
    return statusTag(language === 'de' ? 'Keine Münzwertung' : 'No coin score', 'blue');
  }
  const coins = instance.challengeCoinValue;
  const value = `${coins > 0 ? '+' : coins < 0 ? '−' : '±'}${Math.abs(coins)}`;
  return statusTag(`${language === 'de' ? 'Münzwertung' : 'Coin score'}: ${value} ${language === 'de' ? 'Münzen' : 'coins'}`, coins > 0 ? 'green' : coins < 0 ? 'coral' : 'blue');
}

export function renderTasks(engine, language) {
  const order = { ready: 0, active: 1, queued: 2, done: 3 };
  const tasks = [...engine.state.tasks].sort((a, b) =>
    (a.chapterIndex === engine.state.chapterIndex ? 0 : 1) - (b.chapterIndex === engine.state.chapterIndex ? 0 : 1) ||
    order[a.status] - order[b.status] || b.assignedAt - a.assignedAt
  );
  const activeCount = tasks.filter((instance) => ['queued', 'active', 'ready'].includes(instance.status)).length;

  return `
    <section class="screen-padding">
      <div class="section-header">
        <div><p class="eyebrow">${t(engine.currentChapter.name, language)}</p><h1>${tx('taskList', language)}</h1><p class="muted">${tx('noWaiting', language)}</p></div>
        ${statusTag(`${activeCount} ${language === 'de' ? 'offen' : 'open'}`, activeCount ? 'gold' : 'green')}
      </div>
      ${tasks.length ? `<ul class="task-list">${tasks.map((instance) => {
        const card = engine.getTaskCard(instance);
        const assigned = instance.assignedPlayerIds.map((playerId) => engine.state.players.find((player) => player.id === playerId)?.name).filter(Boolean);
        const unassigned = card.unassigned || assigned.length === 0;
        const remaining = getRemainingSeconds(instance);
        const elapsed = getElapsedSeconds(instance);
        const timingMode = instance.timingMode ?? card.timingMode ?? 'challenge';
        const cauldronWatch = engine.isCauldronWatch(instance);
        const canRelieveCauldron = cauldronWatch && engine.canRelieveCauldronWatch(instance);
        const timerMinutes = timingMode === 'background'
          ? (instance.backgroundMinutes || card.backgroundMinutes)
          : timingMode === 'manual' ? 0 : (instance.challengeMinutes || card.challengeMinutes);
        const timerProgress = getTaskTimerProgress(instance);
        const taskAbilityTags = (instance.taskAbilityAdjustments ?? []).map((adjustment) => {
          const owner = engine.state.players.find((player) => player.id === adjustment.playerId);
          const role = getRole(adjustment.roleId);
          const time = `${adjustment.timeMinutes > 0 ? '+' : '−'}${Math.abs(adjustment.timeMinutes)} min`;
          const coins = `${adjustment.coinDelta > 0 ? '+' : '−'}${Math.abs(adjustment.coinDelta)} ${language === 'de' ? 'Münzwertung' : 'coin score'}`;
          return statusTag(`${escapeHtml(owner?.name ?? t(role.name, language))} · ${t(role.name, language)}: ${time} · ${coins}`, adjustment.roleId === 'lucky' ? 'green' : 'coral');
        }).join('');
        return `<li class="task-item" data-status="${instance.status}">
          <div class="card-row">
            <div><p class="eyebrow">${t(CHAPTERS[instance.chapterIndex].course, language)} · ${t(card.questName, language)} · ${language === 'de' ? 'Schritt' : 'step'} ${engine.questStepNumber(card)}</p><h3>${t(card.title, language)}</h3></div>
            ${statusTag(taskStatusLabel(instance.status, language), STATUS_TONE[instance.status])}
          </div>
          <p>${t(card.instruction, language)}</p>
          ${renderTaskBasket(engine, instance, language)}
          <div class="stat-strip">
            ${unassigned
              ? statusTag(language === 'de' ? 'Gemeinsamer Status · niemandem zugewiesen' : 'Shared status · assigned to nobody', 'blue')
              : statusTag(`${tx('assignedTo', language)}: ${assigned.map(escapeHtml).join(', ')}`, 'blue')}
            ${unassigned ? '' : statusTag(card.people[0] === card.people[1] ? `${card.people[0]} ♙` : `${card.people[0]}–${card.people[1]} ♙`)}
            ${timingMode === 'manual'
              ? statusTag(language === 'de' ? 'Nach Gargrad · kein Spieltimer' : 'By doneness · no game timer', 'blue')
              : timingMode === 'background'
                ? statusTag(`${timerMinutes} min ${language === 'de' ? 'Hintergrundzeit · ohne Münzdruck' : 'background time · no coin pressure'}`, 'blue')
                : statusTag(`${timerMinutes} min ${language === 'de' ? 'Arbeits-Challenge' : 'work challenge'}`, 'gold')}
            ${instance.challengeResult && !['background', 'manual'].includes(instance.challengeResult) ? statusTag(t({ de: { veryFast: 'Blitzschnell', onTime: 'Rechtzeitig', late: 'Verspätet', veryLate: 'Stark verspätet' }[instance.challengeResult], en: { veryFast: 'Lightning fast', onTime: 'On time', late: 'Late', veryLate: 'Very late' }[instance.challengeResult] }, language), instance.challengeCoinValue >= 0 ? 'green' : 'coral') : ''}
            ${taskAbilityTags}
            ${instance.status === 'done' && instance.startedAt ? statusTag(`${language === 'de' ? 'Dauer' : 'Duration'}: ${formatDuration(elapsed)}`, 'blue') : ''}
            ${taskCoinTag(instance, language)}
          </div>
          ${instance.endAt ? `<div class="card-row"><span class="timer" data-task-timer="${escapeHtml(instance.instanceId)}" data-overdue="${remaining < 0}">${formatDuration(remaining)}</span><span class="muted" data-task-timer-caption="${escapeHtml(instance.instanceId)}">${taskTimerCaption(instance, timingMode, remaining, language)}</span></div><div class="progress-track"><span data-task-progress="${escapeHtml(instance.instanceId)}" style="--progress:${timerProgress}%"></span></div>` : ''}
          ${cauldronWatch && ['active', 'ready'].includes(instance.status) ? `<div class="card-effect"><strong>${language === 'de' ? 'Gargradentscheidung am Kessel' : 'Cauldron doneness decision'}</strong><br>${language === 'de' ? 'Prüft die Suppe. Ist sie noch nicht fertig, legt „Kesselwache ablösen“ dieselbe Karte wieder oben auf den Aufgabenstapel. Das kann ohne feste Obergrenze wiederholt werden.' : 'Check the soup. If it is not ready, “Relieve cauldron watch” returns this same card to the top of the task deck. This can repeat without a fixed limit.'}</div>` : ''}
          <div class="button-row" style="margin-top:.8rem">
            ${instance.status === 'queued' && !card.automatic ? `<button class="secondary-button" type="button" data-action="start-task" data-task-id="${escapeHtml(instance.instanceId)}">${timingMode === 'manual' ? (language === 'de' ? 'Aufgabe beginnen' : 'Start task') : timingMode === 'background' ? (language === 'de' ? 'Hintergrundtimer starten' : 'Start background timer') : (language === 'de' ? 'Arbeits-Challenge starten' : 'Start work challenge')}</button>` : ''}
            ${cauldronWatch && ['active', 'ready'].includes(instance.status)
              ? `<button class="primary-button" type="button" data-action="resolve-cauldron-watch" data-decision="soupReady" data-task-id="${escapeHtml(instance.instanceId)}">${language === 'de' ? 'Suppe ist fertig' : 'Soup is ready'}</button>
                 <button class="secondary-button" type="button" data-action="resolve-cauldron-watch" data-decision="relieve" data-task-id="${escapeHtml(instance.instanceId)}" ${canRelieveCauldron ? '' : 'disabled'}>${language === 'de' ? 'Kesselwache ablösen' : 'Relieve cauldron watch'}</button>`
              : !cauldronWatch && ['queued', 'active', 'ready'].includes(instance.status) ? `<button class="primary-button" type="button" data-action="complete-task" data-task-id="${escapeHtml(instance.instanceId)}">${card.completionLabel ? t(card.completionLabel, language) : tx('completeTask', language)}</button>` : ''}
            ${engine.canUndoTaskCompletion(instance.instanceId) ? `<button class="quiet-button" type="button" data-action="undo-task" data-task-id="${escapeHtml(instance.instanceId)}">${language === 'de' ? 'Haken zurücknehmen' : 'Undo completion'}</button>` : ''}
          </div>
          ${cauldronWatch && ['active', 'ready'].includes(instance.status) && !canRelieveCauldron ? `<small class="muted">${language === 'de' ? 'Ablösung ist möglich, sobald eine andere Person keine laufende Aufgabe hat.' : 'Relief becomes available once another player has no running task.'}</small>` : ''}
        </li>`;
      }).join('')}</ul>` : `<div class="empty-state"><h2>${tx('noTasks', language)}</h2></div>`}
    </section>`;
}

function renderShoppingPdfActions(playerCount, language) {
  const crewSize = Math.min(10, Math.max(6, Number(playerCount) || 6));
  return `<div class="shopping-guide-actions">
    <label class="shopping-player-count">
      <span>${language === 'de' ? 'Personen für Liste und PDF' : 'Players for list and PDF'}</span>
      <select data-action="change-shopping-player-count" aria-label="${language === 'de' ? 'Personenzahl für Einkaufsliste und PDF' : 'Player count for shopping list and PDF'}">
        ${Array.from({ length: 5 }, (_, index) => index + 6).map((count) => `<option value="${count}" ${count === crewSize ? 'selected' : ''}>${count}</option>`).join('')}
      </select>
    </label>
    <button type="button" class="primary-button" data-action="download-shopping-pdf">${language === 'de' ? 'Einkaufsliste als PDF' : 'Download shopping PDF'}</button>
  </div>`;
}

export function renderPantry(engine, language, shoppingPlayerCount = engine.state.players.length) {
  const crewSize = Math.min(10, Math.max(6, Number(shoppingPlayerCount) || engine.state.players.length));
  const used = engine.state.ingredients.filter((ingredient) => ingredient.essential && ingredient.status === 'used').length;
  const inBaskets = engine.state.ingredients.filter((ingredient) => ingredient.status === 'discovered').length;
  const essential = engine.state.ingredients.filter((ingredient) => ingredient.essential);
  const available = engine.state.ingredients.filter((ingredient) => ingredient.status === 'available');
  const courseTagNames = (ingredient) => ingredient.courseTags.map((courseId) => {
    const chapter = CHAPTERS.find((entry) => entry.id === courseId);
    return chapter ? t(chapter.course, language) : courseId;
  }).join(' · ');
  const renameControl = (ingredient) => ingredientRenameControl({
    id: ingredient.id,
    kind: 'ingredient',
    currentNames: ingredient.name,
    defaultNames: INGREDIENTS.find((entry) => entry.id === ingredient.id)?.name ?? ingredient.name,
    customized: Boolean(ingredient.customName)
  }, language);
  const ingredientRow = (ingredient) => {
    const catalogIngredient = INGREDIENTS.find((entry) => entry.id === ingredient.id) ?? ingredient;
    const isBasket = ingredient.status === 'discovered';
    const tone = ingredient.status === 'used' ? 'green' : isBasket ? 'gold' : ingredient.status === 'locked' ? 'blue' : '';
    const label = isBasket
      ? (language === 'de' ? 'im Gangkorb' : 'in course basket')
      : ingredient.status === 'available'
        ? (language === 'de' ? 'global verfügbar' : 'globally available')
        : ingredient.status === 'locked'
          ? (language === 'de' ? 'fest zugeordnet' : 'locked into course')
          : tx(ingredient.status, language);
    return `<li class="ingredient-item">
      <div class="ingredient-name-line"><strong>${t(ingredient.name, language)}</strong>${renameControl(ingredient)}</div>${statusTag(label, tone)}
      <small>${tx('quantitySuggestion', language)}: ${escapeHtml(suggestQuantity(catalogIngredient, crewSize, language))} · ${ingredient.essential ? tx('required', language) : tx('optional', language)}</small>
      <small>${language === 'de' ? 'Mögliche Gänge' : 'Possible courses'}: ${escapeHtml(courseTagNames(ingredient))}</small>
      ${ingredient.effect ? `<small class="ingredient-effect">${t(INGREDIENT_EFFECT_TEXT[ingredient.effect], language)}</small>` : ''}
    </li>`;
  };
  return `
    <section class="screen-padding">
      <div class="section-header">
        <div><p class="eyebrow">Adventure Dinner</p><h1>${tx('pantryTitle', language)}</h1><p class="muted">${tx('pantryLead', language)}</p></div>
        <div class="pantry-header-actions">
          <div class="stat-strip">${statusTag(`${used}/${essential.length} ${tx('used', language)}`, 'green')}${statusTag(`${inBaskets} ${language === 'de' ? 'im Gangkorb' : 'in course basket'}`, 'gold')}${statusTag(`${available.length} ${language === 'de' ? 'global' : 'global'}`)}</div>
          ${renderShoppingPdfActions(crewSize, language)}
        </div>
      </div>
      <div class="content-grid">
        ${renderShoppingStaples(crewSize, language, engine.state.shoppingStapleNames, true)}
        ${CHAPTERS.map((chapter, chapterIndex) => {
          const ingredients = engine.state.ingredients.filter((ingredient) => ingredient.chapterIndex === chapterIndex);
          return `<section class="panel">
            <div class="panel-header"><div><p class="eyebrow">${chapter.number}. ${t(chapter.name, language)}</p><h2>${t(chapter.course, language)}</h2></div>${chapterIndex === engine.state.chapterIndex ? statusTag(language === 'de' ? 'aktuell' : 'current', 'gold') : ''}</div>
            <ul class="ingredient-list">${ingredients.map(ingredientRow).join('')}</ul>
            </section>`;
        }).join('')}
        <section class="panel ingredient-global">
          <div class="panel-header"><div><p class="eyebrow">${language === 'de' ? 'Nach den einzelnen Gängen' : 'After the individual courses'}</p><h2>${language === 'de' ? 'Global verfügbar' : 'Globally available'}</h2></div>${statusTag(String(available.length))}</div>
          <p class="muted">${language === 'de' ? 'Diese Zutaten sind noch keinem Gang zugeordnet und bleiben im gemeinsamen Vorrat.' : 'These ingredients are not assigned to a course yet and remain in the shared pantry.'}</p>
          <ul class="ingredient-list">${available.map(ingredientRow).join('')}</ul>
        </section>
      </div>
    </section>`;
}

const INGREDIENT_GROUPS = Object.freeze([
  { id: 'tapas', de: 'Tapas & Brot', en: 'Tapas & bread' },
  { id: 'vegetable', de: 'Gemüse', en: 'Vegetables' },
  { id: 'meat', de: 'Fleisch', en: 'Meat' },
  { id: 'pantry', de: 'Suppenbasis, Salat & Dressings', en: 'Soup base, salad & dressings' },
  { id: 'fruit', de: 'Obst', en: 'Fruit' },
  { id: 'dessert', de: 'Dessert', en: 'Dessert' },
  { id: 'alcohol', de: 'Optionale Spirituosen', en: 'Optional spirits' },
  { id: 'drinks', de: 'Cocktails & Getränke', en: 'Cocktails & drinks' }
]);

function localizedRenameNames(customNames, defaultNames) {
  if (typeof customNames === 'string') return { de: customNames, en: customNames };
  return {
    de: customNames?.de || defaultNames.de,
    en: customNames?.en || defaultNames.en
  };
}

function ingredientRenameControl({ id, kind, currentNames, defaultNames, customized = false }, language) {
  const editLabel = language === 'de' ? 'Name ändern' : 'Rename';
  const currentName = localize(currentNames, language);
  return `<button type="button" class="quiet-button ingredient-rename-button" data-action="edit-ingredient-name" data-ingredient-kind="${escapeHtml(kind)}" data-ingredient-id="${escapeHtml(id)}" data-current-name-de="${escapeHtml(currentNames.de)}" data-current-name-en="${escapeHtml(currentNames.en)}" data-default-name-de="${escapeHtml(defaultNames.de)}" data-default-name-en="${escapeHtml(defaultNames.en)}" data-customized="${customized}" aria-label="${escapeHtml(language === 'de' ? `${currentName} umbenennen` : `Rename ${currentName}`)}">✎ ${editLabel}</button>`;
}

function renderShoppingStaples(playerCount, language, customNames = {}, editable = false) {
  return `<section class="panel ingredient-global" data-shopping-staples>
    <div class="panel-header"><div><p class="eyebrow">${language === 'de' ? 'Einkaufsrelevanter Grundvorrat' : 'Shopping staples'}</p><h2>${language === 'de' ? 'Allgemeiner Küchenvorrat' : 'Shared kitchen pantry'}</h2></div>${statusTag(String(SHOPPING_STAPLES.length), 'gold')}</div>
    <p class="muted">${language === 'de' ? 'Diese Dinge werden nicht erspielt, müssen aber vor dem Spiel eingekauft beziehungsweise geprüft werden. Verwendet sie nur, wenn sie zur gemeinsam komponierten Speise passen.' : 'These items are not played as ingredient cards, but must be bought or checked before the game. Use them only when they suit the dish composed by the crew.'}</p>
    <ul class="ingredient-list">${SHOPPING_STAPLES.map((staple) => {
      const currentNames = localizedRenameNames(customNames?.[staple.id], staple.name);
      const currentName = localize(currentNames, language);
      const courseNames = staple.courseTags.map((courseId) => {
        const chapter = CHAPTERS.find((entry) => entry.id === courseId);
        return chapter ? localize(chapter.course, language) : courseId;
      }).join(' · ');
      return `<li class="ingredient-item">
      <div class="ingredient-name-line"><strong>${escapeHtml(currentName)}</strong>${editable ? ingredientRenameControl({ id: staple.id, kind: 'staple', currentNames, defaultNames: staple.name, customized: Boolean(customNames?.[staple.id]) }, language) : ''}</div>${statusTag(language === 'de' ? 'Grundvorrat · Einkaufsliste' : 'staple · shopping list', 'blue')}
      <small>${tx('quantitySuggestion', language)}: ${escapeHtml(suggestQuantity(staple, playerCount, language))}</small>
      <small>${language === 'de' ? 'Mögliche Verwendung' : 'Possible use'}: ${escapeHtml(courseNames)}</small>
      <small class="ingredient-effect">${t(staple.note, language)}</small>
    </li>`;
    }).join('')}</ul>
  </section>`;
}

export function renderIngredientGuide(playerCount, language, ingredientNames = {}, shoppingStapleNames = {}) {
  const crewSize = Math.min(10, Math.max(6, Number(playerCount) || 6));
  return `
    <section class="screen-padding">
      <div class="section-header">
        <div>
          <p class="eyebrow">Adventure Dinner</p>
          <h1>${language === 'de' ? 'Zutaten- & Einkaufsliste' : 'Ingredients & shopping list'}</h1>
          <p class="muted">${language === 'de'
            ? 'Alle Zutaten sind jederzeit sichtbar. Die Mengen sind grobe Vorschläge; Appetit, Packungsgrößen und eure eigene Rezeptentscheidung haben Vorrang.'
            : 'Every ingredient remains visible at all times. Quantities are rough suggestions; appetite, pack sizes, and your own recipe decisions take priority.'}</p>
        </div>
        ${renderShoppingPdfActions(crewSize, language)}
      </div>
      <div class="content-grid">
        ${renderShoppingStaples(crewSize, language, shoppingStapleNames, true)}
        ${INGREDIENT_GROUPS.map((group) => {
          const ingredients = INGREDIENTS.filter((ingredient) => ingredient.category === group.id);
          return `<section class="panel">
            <div class="panel-header"><h2>${escapeHtml(group[language])}</h2>${statusTag(String(ingredients.length))}</div>
            <ul class="ingredient-list">${ingredients.map((ingredient) => {
              const currentNames = localizedRenameNames(ingredientNames?.[ingredient.id], ingredient.name);
              const currentName = localize(currentNames, language);
              return `<li class="ingredient-item">
              <div class="ingredient-name-line"><strong>${escapeHtml(currentName)}</strong>${ingredientRenameControl({ id: ingredient.id, kind: 'ingredient', currentNames, defaultNames: ingredient.name, customized: Boolean(ingredientNames?.[ingredient.id]) }, language)}</div>
              ${statusTag(ingredient.essential ? tx('required', language) : tx('optional', language), ingredient.essential ? '' : 'gold')}
              <small>${tx('quantitySuggestion', language)}: ${escapeHtml(suggestQuantity(ingredient, crewSize, language))}</small>
              <small>${language === 'de' ? 'Mögliche Gänge' : 'Possible courses'}: ${ingredient.courseTags.map((courseId) => t(CHAPTERS.find((chapter) => chapter.id === courseId)?.course ?? courseId, language)).join(' · ')}</small>
              ${ingredient.effect ? `<small class="ingredient-effect">${t(INGREDIENT_EFFECT_TEXT[ingredient.effect], language)}</small>` : ''}
            </li>`;
            }).join('')}</ul>
          </section>`;
        }).join('')}
      </div>
    </section>`;
}

export function renderCrew(engine, language) {
  return `
    <section class="screen-padding">
      <div class="section-header"><div><p class="eyebrow">${engine.state.players.length} ${language === 'de' ? 'Abenteurer' : 'adventurers'}</p><h1>${tx('crewTitle', language)}</h1></div></div>
      <div class="content-grid">
        ${engine.state.players.map((player, index) => {
          const role = getRole(player.roleId);
          const isActive = index === engine.state.activePlayerIndex;
          const passiveDisabled = !engine.isPassiveEnabled(player);
          const taskAbilityArmed = ['lucky', 'unlucky'].includes(role.id) && player.pendingTaskAbility?.roleId === role.id;
          const activeUsedThisCourse = role.id === 'gambler' && Boolean(player.passiveUsedByChapter[`gambler-active-${engine.state.chapterIndex}`]);
          const openTasks = engine.openTasksForPlayer(player.id);
          const cocktailTeam = player.cocktailTeam === 'alcoholic'
            ? (language === 'de' ? 'Cocktail-Team: alkoholisch' : 'Cocktail team: alcoholic')
            : player.cocktailTeam === 'alcohol-free'
              ? (language === 'de' ? 'Cocktail-Team: alkoholfrei' : 'Cocktail team: alcohol-free')
              : (language === 'de' ? 'Cocktail-Team: noch offen' : 'Cocktail team: not chosen yet');
          const taskAvailability = openTasks.length
            ? statusTag(language === 'de' ? 'Aufgabe läuft' : 'task in progress', 'coral')
            : statusTag(language === 'de' ? 'frei für neue Aufgabe' : 'free for a new task', 'green');
          return `<article class="role-card" data-active="${isActive}">
            <div class="card-row">${avatar(player)}<span>${isActive ? statusTag(tx('activePlayer', language), 'gold') : ''} ${statusTag(`${player.turns} ${language === 'de' ? 'Züge' : 'turns'}`)} ${taskAvailability} ${statusTag(cocktailTeam, player.cocktailTeam === 'alcoholic' ? 'coral' : player.cocktailTeam === 'alcohol-free' ? 'green' : 'gold')}</span></div>
            <p class="eyebrow" style="margin-top:1rem">${role.icon} ${t(role.name, language)}</p>
            <h2>${escapeHtml(player.name)}</h2>
            <div class="role-ability"><strong>${tx('rolePassive', language)} ${passiveDisabled ? statusTag(language === 'de' ? 'nächster Zug pausiert' : 'paused next turn', 'coral') : ''}</strong><p><b>${t(role.passive, language)}</b></p><p class="muted">${t(role.passiveUsage, language)}</p></div>
            <div class="role-ability"><strong>${tx('roleActive', language)} · ${player.activeUsesRemaining} ${tx('usesLeft', language)}${isActive && engine.state.turn.activeAbilityUsed ? ` · ${language === 'de' ? 'in diesem Zug genutzt' : 'used this turn'}` : ''} ${taskAbilityArmed ? statusTag(language === 'de' ? 'für nächste passende Aufgabe vorgemerkt' : 'armed for next eligible task', 'blue') : ''} ${activeUsedThisCourse ? statusTag(language === 'de' ? 'in diesem Gang genutzt' : 'used this course') : ''}</strong><p><b>${t(role.active, language)}</b></p><p class="muted">${t(role.activeUsage, language)}</p></div>
            <div class="field" style="margin-top:.8rem">
              <label for="language-${escapeHtml(player.id)}">${language === 'de' ? 'Spielersprache' : 'Player language'}</label>
              <select id="language-${escapeHtml(player.id)}" data-action="player-language" data-player-id="${escapeHtml(player.id)}">
                <option value="de" ${player.language === 'de' ? 'selected' : ''}>Deutsch</option>
                <option value="en" ${player.language === 'en' ? 'selected' : ''}>English</option>
              </select>
            </div>
          </article>`;
        }).join('')}
      </div>
    </section>`;
}

function sessionProgress(session, language) {
  const chapter = CHAPTERS[session.chapterIndex] ?? CHAPTERS[0];
  if (session.status === 'completed') return language === 'de' ? 'Abgeschlossen' : 'Completed';
  return `${t(chapter.course, language)} · ${language === 'de' ? 'Runde' : 'round'} ${session.chapter?.round ?? 1}`;
}

function historyLabel(entry, language) {
  const labels = language === 'de' ? {
    voyageStarted: 'Reise gestartet', eventDrawn: 'Ereigniskarte gezogen', eventResolved: 'Ereignis abgeschlossen',
    eventIgnoredByBonus: 'Ereignisbonus eingesetzt', eventIgnoredByTactician: 'Ereignis taktisch ignoriert',
    eventChainContinued: 'Ereigniskette fortgesetzt', eventChainStoppedForTask: 'Ereigniskette wegen Küchenauftrag beendet', dieRolled: 'Würfel geworfen', dieRerolled: 'Würfel neu geworfen',
    treasureFound: 'Münzen gefunden', coinsChanged: 'Münzstand verändert', ingredientDiscovered: 'Zutat in den Gangkorb gelegt', ingredientLocked: 'Zutat festgelegt', ingredientReturned: 'Zutat zurückgelegt', bonusIngredientDiscovered: 'Bonuszutat entdeckt',
    ingredientSwapped: 'Zutat getauscht', taskAssigneeChoiceStarted: 'Aufgabenbesetzung geöffnet', taskAssigneesChosen: 'Aufgabenbesetzung gewählt', taskAssigned: 'Aufgabe zugeteilt', taskStarted: 'Aufgabe gestartet',
    taskCompleted: 'Aufgabe erledigt', questTaskUnlocked: 'Nächster Questschritt eingemischt', taskCompletionUndone: 'Aufgabenhaken zurückgenommen', taskConvertedToTreasure: 'Aufgabe in Münzen umgewandelt',
    locationCompleted: 'Ort abgeschlossen', turnEnded: 'Zug beendet',
    chapterReady: 'Gang bereit', courseServed: 'Gang serviert', chapterStarted: 'Neuer Gang gestartet',
    voyageCompleted: 'Reise abgeschlossen', activeAbilityUsed: 'Rollenfähigkeit eingesetzt',
    playerLanguageChanged: 'Spielersprache geändert', optionalIngredientChanged: 'Optionale Zutat geändert',
    watchChallengeStarted: 'Deckwache geöffnet', watchChallengeActionStarted: 'Geheime Challenge gestartet', watchChallengeActivated: 'Mehrzug-Challenge aktiviert', watchChallengeCompleted: 'Deckwache erledigt', watchChallengeExpired: 'Challenge mit der Reise beendet',
    watchFollowUpScheduled: 'Verknüpfte Challenge vorgemerkt', watchFollowUpsReleased: 'Verknüpfte Challenge freigegeben',
    turnSkippedForTask: 'Beschäftigte Person übersprungen', turnPassedAfterTaskStarted: 'Nach Aufgabenstart weitergegeben', allPlayersBusy: 'Ganze Crew beschäftigt', crewTurnResumed: 'Crewzug fortgesetzt',
    soupStyleChosen: 'Suppenstil festgelegt', ingredientBasketAutoCleared: 'Gangkorb automatisch geleert',
    chapterStageChanged: 'Kartendeck gewechselt', taskBriefingShown: 'Auftrag geöffnet'
  } : {
    voyageStarted: 'Voyage started', eventDrawn: 'Event card drawn', eventResolved: 'Event resolved',
    eventIgnoredByBonus: 'Event bonus used', eventIgnoredByTactician: 'Event ignored tactically',
    eventChainContinued: 'Event chain continued', eventChainStoppedForTask: 'Event chain ended for kitchen task', dieRolled: 'Die rolled', dieRerolled: 'Die rerolled',
    treasureFound: 'Coins found', coinsChanged: 'Coin balance changed', ingredientDiscovered: 'Ingredient put in course basket', ingredientLocked: 'Ingredient locked', ingredientReturned: 'Ingredient returned', bonusIngredientDiscovered: 'Bonus ingredient discovered',
    ingredientSwapped: 'Ingredient swapped', taskAssigneeChoiceStarted: 'Task crew selection opened', taskAssigneesChosen: 'Task crew selected', taskAssigned: 'Task assigned', taskStarted: 'Task started',
    taskCompleted: 'Task completed', questTaskUnlocked: 'Next quest step shuffled in', taskCompletionUndone: 'Task completion undone', taskConvertedToTreasure: 'Task converted to coins',
    locationCompleted: 'Location completed', turnEnded: 'Turn ended',
    chapterReady: 'Course ready', courseServed: 'Course served', chapterStarted: 'New course started',
    voyageCompleted: 'Voyage completed', activeAbilityUsed: 'Role ability used',
    playerLanguageChanged: 'Player language changed', optionalIngredientChanged: 'Optional ingredient changed',
    watchChallengeStarted: 'Deck watch opened', watchChallengeActionStarted: 'Secret challenge started', watchChallengeActivated: 'Multi-turn challenge activated', watchChallengeCompleted: 'Deck watch completed', watchChallengeExpired: 'Challenge ended with the voyage',
    watchFollowUpScheduled: 'Linked challenge scheduled', watchFollowUpsReleased: 'Linked challenge released',
    turnSkippedForTask: 'Busy player skipped', turnPassedAfterTaskStarted: 'Turn passed after task start', allPlayersBusy: 'Whole crew busy', crewTurnResumed: 'Crew turn resumed',
    soupStyleChosen: 'Soup style chosen', ingredientBasketAutoCleared: 'Course basket cleared automatically',
    chapterStageChanged: 'Event deck changed', taskBriefingShown: 'Work order opened'
  };
  const label = labels[entry.type] ?? entry.type;
  const detail = entry.data?.eventId ?? entry.data?.taskId ?? entry.data?.ingredientId ?? '';
  return detail ? `${label} · ${detail}` : label;
}

function renderHistory(session, language) {
  const entries = (session.history ?? []).slice(-12).reverse();
  if (!entries.length) return '';
  const formatter = new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `<details class="voyage-log">
    <summary>${language === 'de' ? 'Letzte Logeinträge ansehen' : 'View recent log entries'}</summary>
    <ol>${entries.map((entry) => `<li><time datetime="${new Date(entry.timestamp).toISOString()}">${formatter.format(new Date(entry.timestamp))}</time><span>${escapeHtml(historyLabel(entry, language))}</span></li>`).join('')}</ol>
  </details>`;
}

export function renderSessions(sessions, currentSessionId, language) {
  return `
    <section class="screen-padding">
      <div class="section-header"><div><p class="eyebrow">LocalStorage · ${language === 'de' ? 'nur dieses Gerät' : 'this device only'}</p><h1>${tx('sessionsTitle', language)}</h1><p class="muted">${language === 'de' ? 'Jeder Zug, Timer, Kartenfund und Menüschritt wird nach einer Aktion gespeichert.' : 'Every turn, timer, card discovery, and menu step is saved after each action.'}</p></div>${sessions.length ? `<button class="danger-button" type="button" data-action="delete-all-sessions">${language === 'de' ? 'Alle Reisen löschen' : 'Delete all voyages'}</button>` : ''}</div>
      ${sessions.length ? `<ul class="session-list">${sessions.map((session) => {
        const isCurrent = session.id === currentSessionId;
        return `<li class="session-item">
          <div class="card-row">
            <div><p class="eyebrow">${formatDate(session.updatedAt, language)}</p><h2>${escapeHtml(session.title)}</h2></div>
            ${isCurrent ? statusTag(language === 'de' ? 'aktuell' : 'current', 'gold') : session.status === 'completed' ? statusTag(language === 'de' ? 'fertig' : 'complete', 'green') : ''}
          </div>
          <p class="muted">${escapeHtml(session.players.map((player) => player.name).join(' · '))}</p>
          <div class="stat-strip">${statusTag(sessionProgress(session, language))}${statusTag(`${session.history?.length ?? 0} ${language === 'de' ? 'Logeinträge' : 'log entries'}`)}</div>
          ${renderHistory(session, language)}
          <div class="button-row">
            <button class="primary-button" type="button" data-action="resume-session" data-session-id="${escapeHtml(session.id)}">${tx('resume', language)}</button>
            <button class="danger-button" type="button" data-action="delete-session" data-session-id="${escapeHtml(session.id)}">${tx('delete', language)}</button>
          </div>
        </li>`;
      }).join('')}</ul>` : `<div class="empty-state"><h2>${tx('noSession', language)}</h2></div>`}
    </section>`;
}

export function renderRules(language) {
  const sections = language === 'de' ? [
    ['1. Das Ziel', 'Bereitet als Crew sechs Gänge zu und folgt dabei den Karten auf dem Tablet. Ihr sammelt gemeinsam Münzen: 500 Münzen entsprechen der vollständigen Süßigkeitenbeute, ein kleinerer Stand dem gleichen Anteil der Belohnung.'],
    ['2. Ein Zug', 'Die markierte Person zieht eine Karte und führt sie aus. Die Crew darf beraten, die aktive Person entscheidet. Eine aktive Spezialfähigkeit darf höchstens einmal pro Zug verwendet werden. Danach wird das Tablet an die angezeigte nächste freie Person weitergegeben.'],
    ['3. Zutaten', 'Tapas sind fest vorgegeben. Für alle späteren Gänge bringen Karten Zutaten in den Gangkorb, legen sie verbindlich fest oder legen sie zurück. Vor den Küchenaufgaben muss der Gangkorb leer sein. Jede Pflichtzutat wird im Spiel genau einmal verwendet.'],
    ['4. Küchenaufgaben und Zeit', 'Neue Aufgaben gehen nur an freie Personen; die aktive Person ist an einer in ihrem Zug verteilten Aufgabe beteiligt. Jede offene Aufgabe kann jederzeit über die Aufgabenliste erledigt werden. Challenge-Zeit beeinflusst Münzen, echte Garzeit und Sicherheit haben immer Vorrang.'],
    ['5. Ein Gang', 'Nach dem ersten Gang wird zuerst der Tisch abgeräumt. Danach bestimmt ihr Zutaten, erledigt die freigeschalteten Küchenaufgaben und esst gemeinsam. Geschichten, Spaßkarten und Ortswechsel führt die App automatisch zum passenden Zeitpunkt ein.'],
    ['6. Sicher kochen', 'Befolgt Packungs- und Gerätehinweise, trennt rohe von verzehrfertigen Lebensmitteln und reinigt Hände, Geräte sowie Flächen. Gart Fleisch und Ersatzprodukte entsprechend ihren Vorgaben vollständig. Bei Unsicherheit gilt: Sicherheit vor Karte.']
  ] : [
    ['1. The goal', 'Prepare six courses as one crew and follow the cards shown on the tablet. You collect coins together: 500 coins equal the complete sweet reward, and a lower total awards the same share of it.'],
    ['2. A turn', 'The highlighted player draws and resolves one card. The crew may discuss, but the active player decides. An active special ability may be used at most once per turn. Then pass the tablet to the next free player shown.'],
    ['3. Ingredients', 'Tapas are fixed. In every later course, cards add ingredients to the course basket, lock them in, or return them. The basket must be empty before kitchen tasks begin. Every essential ingredient is used exactly once during the game.'],
    ['4. Kitchen tasks and time', 'New tasks are assigned only to free players, and the active player participates in any task dealt during their turn. Every open task can be completed from the task list at any time. Challenge time affects coins; real doneness and safety always take priority.'],
    ['5. A course', 'After the first course, clear the table first. Then choose ingredients, complete the unlocked kitchen tasks, and eat together. The app introduces stories, fun cards, and location changes at the appropriate time.'],
    ['6. Cook safely', 'Follow packaging and appliance instructions, separate raw food from ready-to-eat food, and clean hands, equipment, and surfaces. Cook meat and substitutes fully according to their instructions. When in doubt, safety overrides the card.']
  ];
  return `
    <section class="screen-padding">
      <div class="section-header"><div><p class="eyebrow">Adventure Dinner</p><h1>${tx('rulesTitle', language)}</h1></div></div>
      <div class="content-grid">${sections.map(([title, body]) => `<article class="panel"><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(body)}</p></article>`).join('')}</div>
      <section class="panel" style="margin-top:1rem"><p class="eyebrow">Copyright © 2026 Jonas Lummerzheim</p><p class="muted">${language === 'de' ? 'Die offizielle Website darf frei gespielt werden. Quellcode und Inhalte dürfen angesehen und heruntergeladen, aber nicht wiederverwendet, verändert oder neu gehostet werden.' : 'The official website may be played freely. Source and content may be viewed and downloaded, but may not be reused, modified, or rehosted.'}</p></section>
    </section>`;
}

export function renderFaq(language) {
  const entries = language === 'de' ? [
    ['Wann und wie sollte ich eine Zutat umbenennen?', 'Am besten passt ihr die Namen vor einer neuen Reise in der Zutatenliste an – besonders vor dem Einkauf. Tippt neben der Zutat auf „Name ändern“ und tragt einen deutschen sowie einen englischen Namen ein. Während einer laufenden Reise könnt ihr den Namen dort ebenfalls ändern.'],
    ['Wofür ist das Umbenennen gedacht?', 'Damit könnt ihr eine vorhandene Zutat durch eine für eure Crew passendere Zutat ersetzen, etwa wegen Geschmack, Ernährung, Allergien oder Verfügbarkeit. Es entsteht keine zusätzliche Zutat: Der neue Name übernimmt den Platz der ursprünglichen Zutat.'],
    ['Welcher Ersatz ist geeignet?', 'Der Ersatz sollte kulinarisch eine ähnliche Aufgabe erfüllen und in allen bei der ursprünglichen Zutat angezeigten Gängen sinnvoll verwendbar sein. Möglich sind zum Beispiel Kokosmilch gegen Mandelmilch, Ingwer gegen Chili, Äpfel gegen Bananen oder Fleisch gegen Tofu beziehungsweise ein anderes vegetarisches Ersatzprodukt.'],
    ['Was bleibt nach dem Umbenennen gleich?', 'Gang-Zuordnung, Kategorie, Pflichtstatus, Karteneffekt und Spielregeln bleiben unverändert. Eine umbenannte Zutat kann weiterhin nur in den Gängen erscheinen, die bei der ursprünglichen Zutat stehen. Prüft außerdem selbst, ob der angezeigte Mengenvorschlag für den Ersatz angepasst werden sollte.'],
    ['Warum werden ein deutscher und ein englischer Name benötigt?', 'Jede Person kann das Spiel in ihrer eigenen Sprache sehen. Tragt deshalb beide Varianten ein, damit auf Karten, in Aufgaben und in der Zutatenliste immer der passende Name erscheint.'],
    ['Was passiert, wenn alle Personen beschäftigt sind?', 'Die Zugfolge wartet, bis eine laufende Küchenaufgabe über die Aufgabenliste beendet wird. Danach ist die nächste freie Person in der bisherigen Reihenfolge am Zug.'],
    ['Muss eine Aufgabe bis zum Timerende laufen?', 'Nein. Aufgaben dürfen jederzeit als erledigt markiert werden. Der Challenge-Timer bestimmt nur die Münzwertung; bei Backen, Braten und anderen Garprozessen entscheidet der tatsächliche Gargrad.']
  ] : [
    ['When and how should I rename an ingredient?', 'It is best to adjust names in the ingredient list before starting a new voyage, especially before shopping. Tap “Rename” beside the ingredient and enter both a German and an English name. You can also change the name during an active voyage.'],
    ['What is ingredient renaming for?', 'It lets you replace an existing ingredient with one that better suits your crew because of taste, diet, allergies, or availability. It does not add another ingredient: the new name takes the original ingredient’s place.'],
    ['What makes a suitable substitute?', 'The substitute should serve a similar culinary purpose and work in every course listed for the original ingredient. Examples include coconut milk to almond milk, ginger to chilli, apples to bananas, or meat to tofu or another vegetarian substitute.'],
    ['What stays the same after renaming?', 'Course assignment, category, essential status, card effect, and game rules remain unchanged. A renamed ingredient can still appear only in the courses listed for the original ingredient. Also decide for yourselves whether the displayed quantity suggestion needs adjusting.'],
    ['Why do I need a German and an English name?', 'Each player can view the game in their own language. Enter both versions so cards, tasks, and the ingredient list always show the appropriate name.'],
    ['What happens when everyone is busy?', 'Turn order waits until an active kitchen task is completed from the task list. The next free player in the existing order then takes the turn.'],
    ['Must a task run until its timer ends?', 'No. Tasks can be marked complete at any time. A challenge timer affects only the coin score; baking, frying, and other cooking processes follow actual doneness.']
  ];
  return `
    <section class="screen-padding">
      <div class="section-header"><div><p class="eyebrow">Adventure Dinner</p><h1>${tx('faqTitle', language)}</h1><p class="muted">${language === 'de' ? 'Kurze Antworten auf Fragen, die vor oder während einer Reise auftauchen können.' : 'Short answers to questions that may come up before or during a voyage.'}</p></div></div>
      <div class="faq-list">${entries.map(([question, answer], index) => `<details class="panel faq-item" ${index === 0 ? 'open' : ''}><summary><span>${escapeHtml(question)}</span></summary><p class="muted">${escapeHtml(answer)}</p></details>`).join('')}</div>
    </section>`;
}
