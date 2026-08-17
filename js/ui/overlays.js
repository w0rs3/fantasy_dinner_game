import { CHAPTERS } from '../data/chapters.js';
import { INGREDIENTS, INGREDIENT_EFFECT_TEXT, suggestQuantity } from '../data/ingredients.js';
import { formatDate, formatDuration } from '../data/i18n.js';
import { getRemainingSeconds } from '../core/timers.js';
import { avatar, escapeHtml, percent, statusTag, t, tx } from './helpers.js';
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
        const remaining = getRemainingSeconds(instance);
        const challengeMinutes = instance.challengeMinutes || card.timerMinutes || card.estimatedMinutes;
        const timerProgress = challengeMinutes && instance.startedAt
          ? percent(Math.max(0, Date.now() - instance.startedAt), challengeMinutes * 60_000)
          : 0;
        return `<li class="task-item" data-status="${instance.status}">
          <div class="card-row">
            <div><p class="eyebrow">${t(CHAPTERS[instance.chapterIndex].course, language)} · ${escapeHtml(card.id)}</p><h3>${t(card.title, language)}</h3></div>
            ${statusTag(taskStatusLabel(instance.status, language), STATUS_TONE[instance.status])}
          </div>
          <p>${t(card.instruction, language)}</p>
          ${renderTaskBasket(engine, instance, language)}
          <div class="stat-strip">
            ${statusTag(`${tx('assignedTo', language)}: ${assigned.map(escapeHtml).join(', ')}`, 'blue')}
            ${statusTag(card.people[0] === card.people[1] ? `${card.people[0]} ♙` : `${card.people[0]}–${card.people[1]} ♙`)}
            ${statusTag(`${challengeMinutes} min ${language === 'de' ? 'Challenge' : 'challenge'}`, 'gold')}
            ${instance.challengeResult ? statusTag(t({ de: { veryFast: 'Blitzschnell · +3', onTime: 'Rechtzeitig · +1', late: 'Verspätet · −1', veryLate: 'Stark verspätet · −3' }[instance.challengeResult], en: { veryFast: 'Lightning fast · +3', onTime: 'On time · +1', late: 'Late · −1', veryLate: 'Very late · −3' }[instance.challengeResult] }, language), instance.challengeCoinValue >= 0 ? 'green' : 'coral') : ''}
          </div>
          ${instance.endAt ? `<div class="card-row"><span class="timer" data-task-timer="${escapeHtml(instance.instanceId)}">${formatDuration(remaining)}</span><span class="muted">${tx('remaining', language)}</span></div><div class="progress-track"><span style="--progress:${timerProgress}%"></span></div>` : ''}
          <div class="button-row" style="margin-top:.8rem">
            ${instance.status === 'queued' ? `<button class="secondary-button" type="button" data-action="start-task" data-task-id="${escapeHtml(instance.instanceId)}">${language === 'de' ? 'Challenge starten' : 'Start challenge'}</button>` : ''}
            ${['queued', 'active', 'ready'].includes(instance.status) ? `<button class="primary-button" type="button" data-action="complete-task" data-task-id="${escapeHtml(instance.instanceId)}">${tx('completeTask', language)}</button>` : ''}
            ${instance.status === 'done' && instance.chapterIndex === engine.state.chapterIndex && !engine.state.chapter.served ? `<button class="quiet-button" type="button" data-action="undo-task" data-task-id="${escapeHtml(instance.instanceId)}">${language === 'de' ? 'Haken zurücknehmen' : 'Undo completion'}</button>` : ''}
          </div>
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
    const canEditBasket = isBasket && ingredient.chapterIndex === engine.state.chapterIndex && engine.state.chapter.stage === 'ingredients';
    return `<li class="ingredient-item">
      <strong>${t(ingredient.name, language)}</strong>${statusTag(label, tone)}
      <small>${tx('quantitySuggestion', language)}: ${t(ingredient.suggestedQuantity, language)} · ${ingredient.essential ? tx('required', language) : tx('optional', language)}</small>
      <small>${language === 'de' ? 'Mögliche Gänge' : 'Possible courses'}: ${escapeHtml(courseTagNames(ingredient))}</small>
      ${ingredient.effect ? `<small class="ingredient-effect">${t(INGREDIENT_EFFECT_TEXT[ingredient.effect], language)}</small>` : ''}
      ${canEditBasket ? `<div class="button-row"><button class="secondary-button" type="button" data-action="lock-basket-ingredient" data-ingredient-id="${escapeHtml(ingredient.id)}">${language === 'de' ? 'Fest zuordnen' : 'Lock into course'}</button><button class="quiet-button" type="button" data-action="remove-basket-ingredient" data-ingredient-id="${escapeHtml(ingredient.id)}">${language === 'de' ? 'Zurücklegen' : 'Return'}</button></div>` : ''}
    </li>`;
  };
  return `
    <section class="screen-padding">
      <div class="section-header">
        <div><p class="eyebrow">Adventure Dinner</p><h1>${tx('pantryTitle', language)}</h1><p class="muted">${tx('pantryLead', language)}</p></div>
        <div class="stat-strip">${statusTag(`${used}/${essential.length} ${tx('used', language)}`, 'green')}${statusTag(`${inBaskets} ${language === 'de' ? 'im Gangkorb' : 'in course basket'}`, 'gold')}${statusTag(`${available.length} ${language === 'de' ? 'global' : 'global'}`)}</div>
      </div>
      <div class="content-grid">
        <section class="panel ingredient-global">
          <div class="panel-header"><div><p class="eyebrow">${language === 'de' ? 'Noch keinem Gang zugeordnet' : 'Not assigned to a course yet'}</p><h2>${language === 'de' ? 'Global verfügbar' : 'Globally available'}</h2></div>${statusTag(String(available.length))}</div>
          <ul class="ingredient-list">${available.map(ingredientRow).join('')}</ul>
        </section>
        ${CHAPTERS.map((chapter, chapterIndex) => {
          const ingredients = engine.state.ingredients.filter((ingredient) => ingredient.chapterIndex === chapterIndex);
          return `<section class="panel">
            <div class="panel-header"><div><p class="eyebrow">${chapter.number}. ${t(chapter.name, language)}</p><h2>${t(chapter.course, language)}</h2></div>${chapterIndex === engine.state.chapterIndex ? statusTag(language === 'de' ? 'aktuell' : 'current', 'gold') : ''}</div>
            <ul class="ingredient-list">${ingredients.map(ingredientRow).join('')}</ul>
          </section>`;
        }).join('')}
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
          return `<article class="role-card" data-active="${isActive}">
            <div class="card-row">${avatar(player)}${isActive ? statusTag(tx('activePlayer', language), 'gold') : statusTag(`${player.turns} ${language === 'de' ? 'Züge' : 'turns'}`)}</div>
            <p class="eyebrow" style="margin-top:1rem">${role.icon} ${t(role.name, language)}</p>
            <h2>${escapeHtml(player.name)}</h2>
            <div class="role-ability"><strong>${tx('rolePassive', language)} ${passiveDisabled ? statusTag(language === 'de' ? 'nächster Zug pausiert' : 'paused next turn', 'coral') : ''}</strong><p>${t(role.passive, language)}</p></div>
            <div class="role-ability"><strong>${tx('roleActive', language)} · ${player.activeUsesRemaining} ${tx('usesLeft', language)}${isActive && engine.state.turn.activeAbilityUsed ? ` · ${language === 'de' ? 'in diesem Zug genutzt' : 'used this turn'}` : ''}</strong><p>${t(role.active, language)} ${language === 'de' ? 'Nur einmal pro eigenem Zug.' : 'Once per own turn only.'}</p></div>
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
    eventChainContinued: 'Ereigniskette fortgesetzt', dieRolled: 'Würfel geworfen', dieRerolled: 'Würfel neu geworfen',
    treasureFound: 'Münzen gefunden', coinsChanged: 'Münzstand verändert', ingredientDiscovered: 'Zutat in den Gangkorb gelegt', ingredientLocked: 'Zutat festgelegt', ingredientReturned: 'Zutat zurückgelegt', bonusIngredientDiscovered: 'Bonuszutat entdeckt',
    ingredientSwapped: 'Zutat getauscht', taskAssigned: 'Aufgabe zugeteilt', taskStarted: 'Aufgabe gestartet',
    taskCompleted: 'Aufgabe erledigt', taskCompletionUndone: 'Aufgabenhaken zurückgenommen', taskConvertedToTreasure: 'Aufgabe in Münzen umgewandelt', crewSplit: 'Crew aufgeteilt',
    crewReunited: 'Crew wieder vereint', locationCompleted: 'Ort abgeschlossen', turnEnded: 'Zug beendet',
    chapterReady: 'Gang bereit', courseServed: 'Gang serviert', chapterStarted: 'Neuer Gang gestartet',
    voyageCompleted: 'Reise abgeschlossen', activeAbilityUsed: 'Rollenfähigkeit eingesetzt',
    playerLanguageChanged: 'Spielersprache geändert', optionalIngredientChanged: 'Optionale Zutat geändert',
    watchChallengeStarted: 'Deckwache gestartet', watchChallengeCompleted: 'Deckwache erledigt',
    chapterStageChanged: 'Kartendeck gewechselt', taskBriefingShown: 'Auftrag geöffnet'
  } : {
    voyageStarted: 'Voyage started', eventDrawn: 'Event card drawn', eventResolved: 'Event resolved',
    eventIgnoredByBonus: 'Event bonus used', eventIgnoredByTactician: 'Event ignored tactically',
    eventChainContinued: 'Event chain continued', dieRolled: 'Die rolled', dieRerolled: 'Die rerolled',
    treasureFound: 'Coins found', coinsChanged: 'Coin balance changed', ingredientDiscovered: 'Ingredient put in course basket', ingredientLocked: 'Ingredient locked', ingredientReturned: 'Ingredient returned', bonusIngredientDiscovered: 'Bonus ingredient discovered',
    ingredientSwapped: 'Ingredient swapped', taskAssigned: 'Task assigned', taskStarted: 'Task started',
    taskCompleted: 'Task completed', taskCompletionUndone: 'Task completion undone', taskConvertedToTreasure: 'Task converted to coins', crewSplit: 'Crew split',
    crewReunited: 'Crew reunited', locationCompleted: 'Location completed', turnEnded: 'Turn ended',
    chapterReady: 'Course ready', courseServed: 'Course served', chapterStarted: 'New course started',
    voyageCompleted: 'Voyage completed', activeAbilityUsed: 'Role ability used',
    playerLanguageChanged: 'Player language changed', optionalIngredientChanged: 'Optional ingredient changed',
    watchChallengeStarted: 'Deck watch started', watchChallengeCompleted: 'Deck watch completed',
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
    ['1. Reihum spielen', 'Die hervorgehobene Person führt den Zug aus. Nach Abschluss zeigt das Spiel, an wen das Tablet weitergegeben wird. Entscheidungen dürfen gemeinsam besprochen werden.'],
    ['2. Jeder Gang hat drei Kartendecks', 'Zuerst erscheinen Vorratsereignisse, danach Auftragsereignisse. Während Küchenarbeit läuft, sorgen freie Eventkarten mit Pausen, Geschichten, Münzen und harmlosen geheimen Challenges für Abwechslung.'],
    ['3. Aktive Person entscheidet', 'Binäre Entscheidungen dürfen von der ganzen Crew diskutiert werden. Die hervorgehobene Person trifft die endgültige Wahl, würfelt oder übernimmt den Auftrag. Unmögliche Optionen werden nicht angezeigt.'],
    ['4. Aufgaben als Münz-Challenges', 'Jede offene Küchenaufgabe kann jederzeit in der Aufgabenliste erledigt markiert werden. Sehr schnelles Erledigen bringt drei Münzen, rechtzeitiges eine; verspätete Aufgaben kosten eine oder drei Münzen. Ein versehentlicher Haken kann zurückgenommen werden.'],
    ['5. Parallel kochen', 'Nach der Übernahme läuft eine Aufgabe unabhängig von den nächsten Zügen weiter. Die angezeigte Zeit ist eine Challenge und keine Sperre. Andere Personen ziehen derweil weitere Events.'],
    ['6. Orte automatisch bereisen', 'Jede abgeschlossene Ortsaktion bewegt die Gruppe sichtbar voran. Nach genug Aktionen zieht sie automatisch zum nächsten Ort; aufgeteilte Gruppen werden am gemeinsamen Ziel wieder vereint.'],
    ['7. Zutaten improvisieren', 'Nur Tapas sind festgelegt. Alle anderen Zutaten starten global mit möglichen Gang-Tags. Gefundene Zutaten landen zuerst im Gangkorb und werden von dort fest zugeordnet oder zurückgelegt. Jede Pflichtzutat wird genau einmal verwendet; nur optionale Zutaten dürfen übrig bleiben.'],
    ['8. Sicher arbeiten', 'Befolgt Packungs- und Gerätehinweise. Trennt rohes Fleisch von verzehrfertigen Lebensmitteln und reinigt danach Hände, Geräte und Flächen. Gart Fleisch vollständig und gleichmäßig; prüft im Zweifel mit einem sauberen Fleischthermometer mindestens 70 °C für zwei Minuten an allen Stellen. Bei Unsicherheit hat Sicherheit Vorrang vor der Karte.'],
    ['9. Münzen und Fähigkeiten', '100 Münzen entsprechen der vollständigen Süßigkeitenbeute; bei 50 Münzen wird die Hälfte verteilt. Der Stand darf negativ werden. Eine aktive Spezialfähigkeit darf höchstens einmal zwischen Übernahme und Weitergabe des Tablets benutzt werden.']
  ] : [
    ['1. Play in round robin order', 'The highlighted person leads the turn. When it ends, the game shows who receives the tablet next. Decisions may be discussed together.'],
    ['2. Every course has three event decks', 'Provision events come first, followed by work-order events. While kitchen work runs, open event cards add breaks, stories, coins, and harmless secret challenges.'],
    ['3. The active player decides', 'The whole crew may discuss binary decisions. The highlighted player makes the final choice, rolls, or takes the job. Impossible options are never shown.'],
    ['4. Tasks as coin challenges', 'Every open kitchen task can be marked complete from the task list at any time. Very fast completion earns three coins and on-time completion one; late tasks cost one or three coins. An accidental check can be undone.'],
    ['5. Cook in parallel', 'Once accepted, a task continues independently of later turns. The displayed time is a challenge, not a lock. Other players keep drawing events.'],
    ['6. Travel automatically', 'Every resolved location action advances the group. After enough actions it moves automatically; split groups reunite at their shared target.'],
    ['7. Improvise with ingredients', 'Only Tapas are fixed. Every other ingredient starts globally with possible course tags. Finds enter the course basket and are either locked in or returned. Every essential ingredient is used exactly once; only optional ingredients may remain.'],
    ['8. Work safely', 'Follow packaging and appliance instructions. Separate raw meat from ready-to-eat food, then clean hands, equipment, and surfaces. Cook meat thoroughly and evenly; if in doubt, verify at least 70 °C for two minutes throughout. Safety overrides every card.'],
    ['9. Coins and abilities', '100 coins equal the complete sweet reward; 50 coins mean half is shared. The balance may become negative. One active special ability may be used between receiving and passing on the tablet.']
  ];
  return `
    <section class="screen-padding">
      <div class="section-header"><div><p class="eyebrow">Adventure Dinner</p><h1>${tx('rulesTitle', language)}</h1></div></div>
      <div class="content-grid">${sections.map(([title, body]) => `<article class="panel"><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(body)}</p></article>`).join('')}</div>
      <section class="panel" style="margin-top:1rem"><p class="eyebrow">Copyright © 2026 Jonas Lummerzheim</p><p class="muted">${language === 'de' ? 'Die offizielle Website darf frei gespielt werden. Quellcode und Inhalte dürfen angesehen und heruntergeladen, aber nicht wiederverwendet, verändert oder neu gehostet werden.' : 'The official website may be played freely. Source and content may be viewed and downloaded, but may not be reused, modified, or rehosted.'}</p></section>
    </section>`;
}
