import { CHAPTERS } from '../data/chapters.js';
import { INGREDIENTS, INGREDIENT_EFFECT_TEXT, SHOPPING_STAPLES, suggestQuantity } from '../data/ingredients.js';
import { formatDate, formatDuration } from '../data/i18n.js';
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

export function renderPantry(engine, language) {
  const used = engine.state.ingredients.filter((ingredient) => ingredient.essential && ingredient.status === 'used').length;
  const inBaskets = engine.state.ingredients.filter((ingredient) => ingredient.status === 'discovered').length;
  const essential = engine.state.ingredients.filter((ingredient) => ingredient.essential);
  const available = engine.state.ingredients.filter((ingredient) => ingredient.status === 'available');
  const courseTagNames = (ingredient) => ingredient.courseTags.map((courseId) => {
    const chapter = CHAPTERS.find((entry) => entry.id === courseId);
    return chapter ? t(chapter.course, language) : courseId;
  }).join(' · ');
  const ingredientRow = (ingredient) => {
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
      <strong>${t(ingredient.name, language)}</strong>${statusTag(label, tone)}
      <small>${tx('quantitySuggestion', language)}: ${t(ingredient.suggestedQuantity, language)} · ${ingredient.essential ? tx('required', language) : tx('optional', language)}</small>
      <small>${language === 'de' ? 'Mögliche Gänge' : 'Possible courses'}: ${escapeHtml(courseTagNames(ingredient))}</small>
      ${ingredient.effect ? `<small class="ingredient-effect">${t(INGREDIENT_EFFECT_TEXT[ingredient.effect], language)}</small>` : ''}
    </li>`;
  };
  return `
    <section class="screen-padding">
      <div class="section-header">
        <div><p class="eyebrow">Adventure Dinner</p><h1>${tx('pantryTitle', language)}</h1><p class="muted">${tx('pantryLead', language)}</p></div>
        <div class="stat-strip">${statusTag(`${used}/${essential.length} ${tx('used', language)}`, 'green')}${statusTag(`${inBaskets} ${language === 'de' ? 'im Gangkorb' : 'in course basket'}`, 'gold')}${statusTag(`${available.length} ${language === 'de' ? 'global' : 'global'}`)}</div>
      </div>
      <div class="content-grid">
        ${renderShoppingStaples(engine.state.players.length, language)}
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

function renderShoppingStaples(playerCount, language) {
  const mainCourse = CHAPTERS.find((chapter) => chapter.id === 'main');
  return `<section class="panel ingredient-global" data-shopping-staples>
    <div class="panel-header"><div><p class="eyebrow">${language === 'de' ? 'Einkaufsrelevanter Grundvorrat' : 'Shopping staples'}</p><h2>${language === 'de' ? 'Hauptgang · Backschlauch' : 'Main course · roasting bag'}</h2></div>${statusTag(String(SHOPPING_STAPLES.length), 'gold')}</div>
    <p class="muted">${language === 'de' ? 'Diese Dinge werden nicht erspielt, müssen aber vor dem Spiel eingekauft beziehungsweise geprüft werden.' : 'These items are not played as ingredient cards, but must be bought or checked before the game.'}</p>
    <ul class="ingredient-list">${SHOPPING_STAPLES.map((staple) => `<li class="ingredient-item">
      <strong>${t(staple.name, language)}</strong>${statusTag(language === 'de' ? 'Grundvorrat · verbindlich' : 'staple · required', 'blue')}
      <small>${tx('quantitySuggestion', language)}: ${escapeHtml(suggestQuantity(staple, playerCount, language))}</small>
      <small>${language === 'de' ? 'Verwendung' : 'Used for'}: ${t(mainCourse.course, language)}</small>
      <small class="ingredient-effect">${t(staple.note, language)}</small>
    </li>`).join('')}</ul>
  </section>`;
}

export function renderIngredientGuide(playerCount, language) {
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
        ${statusTag(`${crewSize} ${language === 'de' ? 'Personen' : 'players'}`, 'gold')}
      </div>
      <div class="content-grid">
        ${renderShoppingStaples(crewSize, language)}
        ${INGREDIENT_GROUPS.map((group) => {
          const ingredients = INGREDIENTS.filter((ingredient) => ingredient.category === group.id);
          return `<section class="panel">
            <div class="panel-header"><h2>${escapeHtml(group[language])}</h2>${statusTag(String(ingredients.length))}</div>
            <ul class="ingredient-list">${ingredients.map((ingredient) => `<li class="ingredient-item">
              <strong>${t(ingredient.name, language)}</strong>
              ${statusTag(ingredient.essential ? tx('required', language) : tx('optional', language), ingredient.essential ? '' : 'gold')}
              <small>${tx('quantitySuggestion', language)}: ${escapeHtml(suggestQuantity(ingredient, crewSize, language))}</small>
              <small>${language === 'de' ? 'Mögliche Gänge' : 'Possible courses'}: ${ingredient.courseTags.map((courseId) => t(CHAPTERS.find((chapter) => chapter.id === courseId)?.course ?? courseId, language)).join(' · ')}</small>
              ${ingredient.effect ? `<small class="ingredient-effect">${t(INGREDIENT_EFFECT_TEXT[ingredient.effect], language)}</small>` : ''}
            </li>`).join('')}</ul>
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
    ['1. Zufällig beginnen, dann reihum spielen', 'Zu Reisebeginn wird die erste Person zufällig bestimmt. Danach führt die hervorgehobene freie Person den Zug aus. Wer eine offene Küchenaufgabe hat, wird automatisch übersprungen. Sind alle beschäftigt, wartet das Spiel in der Aufgabenansicht, bis ein fertiger Schritt abgehakt wurde. Die Crewansicht zählt alle Züge pro Person.'],
    ['2. Drei Decks plus frühe Spaßkarten', 'Vorrats-, Auftrags- und freie Kochereignisse folgen dem echten Zustand des Gangs. Die ersten drei gezogenen Ereigniskarten des Spiels sind unterschiedliche Spaßkarten. Danach liegen während der Besetzung der Crew regelmäßig weitere Spaßkarten zwischen den Aufträgen. Challenges mit Voraussetzungen bleiben außerhalb des Ziehstapels, bis etwa genügend Zutaten verwendet wurden oder ein passender Timer beziehungsweise Küchenauftrag läuft. Eine echte Pause wird nur angeboten, wenn keine Küchenaufgabe offen ist.'],
    ['3. Aktive Person entscheidet und arbeitet mit', 'Die Crew darf beraten; die aktive Person trifft die endgültige Wahl. Erzeugt ihr Zug eine Küchenaufgabe, gehört sie immer selbst zur ausführenden Besetzung. Für weitere Plätze werden freie Personen mit den meisten bisherigen Zügen bevorzugt; bei manchen Karten darf die aktive Person den fairen Vorschlag ändern.'],
    ['4. Gemischte, aber fachlich abhängige Questlinien', 'Jeder Gang nach den Tapas beginnt mit einem Abräumauftrag für den vorigen Tisch; erst danach öffnet sich die Zutatenwahl. Im Auftragsstapel liegen zunächst nur die Startkarten der Questlinien. Ein erledigter Schritt mischt seinen Nachfolger in die obersten drei Positionen. Servieraufträge werden erst freigegeben, wenn sämtliche Zubereitungsreihen fertig sind; Aufräumarbeiten folgen erst nach dem vollständigen Servieren. Spaßkarten bleiben dazwischen erhalten.'],
    ['5. Challenge, Hintergrundzeit oder Gargrad', 'Kurze Handgriffe haben Münz-Challenges: sehr schnell +2, rechtzeitig +1, verspätet −2, deutlich verspätet −5. Feste Ruhe-, Koch- und Kühlzeiten können als unbewertete Hintergrundtimer laufen. Back- und Bratschritte mit unklarem Garzeitpunkt haben keinen Spieltimer und werden nach dem tatsächlichen Gargrad abgehakt. Jede offene Aufgabe kann jederzeit in der Aufgabenliste erledigt werden.'],
    ['6. Orte nach Gangfortschritt bereisen', 'Abräumen, verbindlich festgelegte Zutaten und tatsächlich abgeschlossene Gangaufgaben bestimmen gemeinsam den Fortschritt. Die sechs Locations wechseln an festen Fortschrittsschwellen; die letzte beginnt erst bei ungefähr 83 Prozent. Spaßkarten und bloße Übergaben bewegen die Route nicht.'],
    ['7. Zutaten improvisieren', 'Nur Tapas sind festgelegt. Alle anderen Zutaten starten global mit Gang-Tags. Beginnt der letzte mögliche Gang einer noch verfügbaren Pflichtzutat, wird sie sofort automatisch für diesen Gang festgelegt; optionale Zutaten bleiben frei. Die Suppe wird zuerst als klar oder cremig festgelegt. Zu Beginn der Cocktail-Zutatenrunde legt die aktive Person verbindlich eine, zwei oder drei Spirituosensorten für den alkoholischen Cocktail fest. Brühe, Sahne, Essig, frische Kräuter und andere Mittel zum Abschmecken sind Grundvorrat, keine Spielzutaten. Beim Erreichen der festen Zielzahl gehen übrige Korbzutaten automatisch global zurück. Jede Pflichtzutat wird genau einmal verwendet.'],
    ['8. Sicher arbeiten', 'Befolgt Packungs- und Gerätehinweise. Trennt rohes Fleisch von verzehrfertigen Lebensmitteln und reinigt danach Hände, Geräte und Flächen. Gart Fleisch vollständig und gleichmäßig; prüft im Zweifel mit einem sauberen Fleischthermometer mindestens 70 °C für zwei Minuten an allen Stellen. Bei Unsicherheit hat Sicherheit Vorrang vor der Karte.'],
    ['9. Münzen, Effekte und geheime Folgen', '500 Münzen entsprechen der vollständigen Süßigkeitenbeute; bei 250 Münzen wird die Hälfte verteilt. Verluste können den Stand bis auf null senken. Zutateneffekte werden für die ziehende Person gespeichert. Aktive Fähigkeiten gelten einmal pro Zug. Gegenkarten zu geheimen Flüchen erscheinen zufällig drei bis fünf Züge später und müssen vor Gangende aufgelöst werden.']
  ] : [
    ['1. Random start, then round robin', 'The first player is chosen randomly when the voyage begins. After that, the highlighted free player leads the turn. Anyone with an open kitchen task is skipped automatically. If everyone is busy, the game waits in the task view until a finished step is checked off. The crew view counts every player’s turns.'],
    ['2. Three decks plus early fun cards', 'Provision, work-order, and open cooking events follow the real state of the course. The first three event cards drawn in the game are different fun cards. More fun cards then appear regularly between work orders while the crew is being staffed. Conditional challenges stay out of the draw pool until enough ingredients have been used or a relevant timer or kitchen job is running. A real break appears only when no kitchen task is open.'],
    ['3. The active player decides and participates', 'The crew may discuss; the active player makes the final choice. If their turn creates a kitchen task, they are always part of its assigned crew. Free players with the most completed turns are preferred for extra places; on some cards the active player may change that fair suggestion.'],
    ['4. Shuffled but practical quest dependencies', 'Every course after Tapas starts with a job clearing the previous table; ingredient selection opens only afterwards. The work stack initially contains only quest-line starts, and each completed step shuffles its successor into the top three positions. Serving unlocks only after every preparation line is complete; cleanup follows only after serving is finished. Fun cards remain between work events.'],
    ['5. Challenge, background time, or doneness', 'Short hands-on jobs are scored: very fast +2, on time +1, late −2, very late −5. Fixed resting, cooking, and chilling periods may use unscored background timers. Baking and frying steps with uncertain timing have no game timer and are checked off by actual doneness. Every open job can be completed from the task list at any time.'],
    ['6. Travel by course progress', 'Clearing, locked ingredients, and actually completed course jobs determine progress together. The six locations change at fixed progress thresholds, with the final one starting around 83 percent. Fun cards and handovers alone do not move the route.'],
    ['7. Improvise with ingredients', 'Only Tapas are fixed. Every other ingredient starts globally with course tags. When an available required ingredient enters its final eligible course, it is immediately locked into that course; optional ingredients remain free. Soup is first chosen as clear or cream. At the start of the cocktail ingredient round, the active player locks in whether the alcoholic cocktail will use one, two, or three spirit varieties. Stock, cream, vinegar, fresh herbs, and other final-seasoning supplies are shared pantry staples, not played ingredients. When the target count is locked, basket leftovers automatically return globally. Every essential ingredient is used exactly once.'],
    ['8. Work safely', 'Follow packaging and appliance instructions. Separate raw meat from ready-to-eat food, then clean hands, equipment, and surfaces. Cook meat thoroughly and evenly; if in doubt, verify at least 70 °C for two minutes throughout. Safety overrides every card.'],
    ['9. Coins, effects, and secret follow-ups', '500 coins equal the complete sweet reward; 250 coins mean half is shared. Losses can reduce the balance to zero. Ingredient effects are stored for the player who drew them. Active abilities are once per turn. Counter-cards to secret curses appear randomly three to five turns later and must resolve before the course ends.']
  ];
  return `
    <section class="screen-padding">
      <div class="section-header"><div><p class="eyebrow">Adventure Dinner</p><h1>${tx('rulesTitle', language)}</h1></div></div>
      <div class="content-grid">${sections.map(([title, body]) => `<article class="panel"><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(body)}</p></article>`).join('')}</div>
      <section class="panel" style="margin-top:1rem"><p class="eyebrow">Copyright © 2026 Jonas Lummerzheim</p><p class="muted">${language === 'de' ? 'Die offizielle Website darf frei gespielt werden. Quellcode und Inhalte dürfen angesehen und heruntergeladen, aber nicht wiederverwendet, verändert oder neu gehostet werden.' : 'The official website may be played freely. Source and content may be viewed and downloaded, but may not be reused, modified, or rehosted.'}</p></section>
    </section>`;
}
