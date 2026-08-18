import { DEFAULT_PREFERENCES } from './config.js';
import { GameAudio } from './core/audio.js';
import { GameEngine, validateSessionState } from './core/game-engine.js';
import { SessionRepository } from './core/storage.js';
import { getRemainingSeconds, updateTaskTimers } from './core/timers.js';
import { formatDuration, localize, ui } from './data/i18n.js';
import { getRole } from './data/roles.js';
import { AppDialog } from './ui/dialog.js';
import { renderGame } from './ui/game.js';
import { escapeHtml, playerInitials } from './ui/helpers.js';
import { renderCrew, renderIngredientGuide, renderPantry, renderRules, renderSessions, renderTasks } from './ui/overlays.js';
import { renderSetup, renderWelcome } from './ui/welcome.js';

const root = document.querySelector('#screen-root');
const app = document.querySelector('#app');
const nav = document.querySelector('#app-nav');
const taskBadge = document.querySelector('#task-badge');
const languageButton = document.querySelector('#language-button');
const audioButton = document.querySelector('#audio-button');
const notificationButton = document.querySelector('#notification-button');
const menuButton = document.querySelector('#menu-button');
const saveIndicator = document.querySelector('#save-indicator');
const toastRegion = document.querySelector('#toast-region');
const liveRegion = document.querySelector('#live-region');
const dialog = new AppDialog(document.querySelector('#app-dialog'));

const repository = new SessionRepository();
let preferences = { ...DEFAULT_PREFERENCES, ...repository.getPreferences() };
let engine = null;
let view = 'welcome';
let publicHomeView = 'welcome';
let deleteCandidateId = null;
let wakeLock = null;
let setupDraft = {
  title: '',
  playerCount: 6,
  defaultLanguage: preferences.language,
  names: Array(10).fill('')
};

const currentSnapshot = repository.getCurrentSession();
if (currentSnapshot && validateSessionState(currentSnapshot).valid) {
  engine = new GameEngine(currentSnapshot);
}

const audio = new GameAudio(engine?.state.settings.audio ?? preferences.audio);

function cueForAction(actionCode) {
  if (['treasure', 'treasureAndTask', 'treasureAndIngredient', 'treasureAndWatch', 'treasureAndChain'].includes(actionCode)) return 'treasure';
  if (['drawTask', 'singleTask', 'teamTask', 'discoverIngredient', 'lockIngredient', 'swapIngredient'].includes(actionCode)) return 'card';
  return 'move';
}

function language() {
  if (engine && view !== 'setup' && view !== 'welcome') return engine.activePlayer?.language ?? preferences.language;
  return preferences.language;
}

function updateHeader(currentLanguage) {
  document.documentElement.lang = currentLanguage;
  languageButton.querySelector('span').textContent = currentLanguage.toUpperCase();
  languageButton.setAttribute('aria-label', currentLanguage === 'de' ? 'Auf Englisch wechseln' : 'Switch to German');
  audioButton.querySelector('span').textContent = audio.enabled ? '♪' : '×';
  audioButton.setAttribute('aria-label', ui(audio.enabled ? 'audioOn' : 'audioOff', currentLanguage));
  const notificationsSupported = 'Notification' in window;
  const notificationsEnabled = notificationsSupported && preferences.notifications && Notification.permission === 'granted';
  notificationButton.hidden = !notificationsSupported;
  notificationButton.dataset.enabled = String(notificationsEnabled);
  notificationButton.querySelector('span').textContent = notificationsEnabled ? '🔔' : '🔕';
  notificationButton.setAttribute('aria-label', currentLanguage === 'de'
    ? notificationsEnabled ? 'Timer-Endmeldungen ausschalten' : 'Timer-Endmeldungen einschalten'
    : notificationsEnabled ? 'Disable timer-finished notifications' : 'Enable timer-finished notifications');
  notificationButton.title = currentLanguage === 'de'
    ? 'Benachrichtigt nur, wenn ein Timer abgelaufen ist'
    : 'Only notifies when a timer has finished';
  const activeTasks = engine?.state.tasks.filter((task) => ['queued', 'active', 'ready'].includes(task.status)).length ?? 0;
  taskBadge.hidden = activeTasks === 0;
  taskBadge.textContent = String(activeTasks);
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = ui(element.dataset.i18n, currentLanguage);
  });
  nav.querySelectorAll('[data-nav]').forEach((button) => {
    button.toggleAttribute('aria-current', button.dataset.nav === view || (view === 'welcome' && button.dataset.nav === 'game'));
  });
}

function render() {
  const currentLanguage = language();
  app.dataset.screen = view;
  updateHeader(currentLanguage);

  if (view === 'welcome') root.innerHTML = renderWelcome(currentLanguage, engine?.snapshot() ?? null);
  else if (view === 'setup') root.innerHTML = renderSetup(currentLanguage, setupDraft);
  else if (view === 'pantry') root.innerHTML = engine
    ? renderPantry(engine, currentLanguage)
    : renderIngredientGuide(setupDraft.playerCount, currentLanguage);
  else if (view === 'sessions') root.innerHTML = renderSessions(repository.listSessions(), engine?.state.id, currentLanguage);
  else if (view === 'rules') root.innerHTML = renderRules(currentLanguage);
  else if (!engine) {
    view = publicHomeView;
    root.innerHTML = view === 'setup'
      ? renderSetup(currentLanguage, setupDraft)
      : renderWelcome(currentLanguage, null);
  } else if (view === 'game') root.innerHTML = renderGame(engine, currentLanguage);
  else if (view === 'tasks') root.innerHTML = renderTasks(engine, currentLanguage);
  else if (view === 'crew') root.innerHTML = renderCrew(engine, currentLanguage);
  else root.innerHTML = renderGame(engine, currentLanguage);
  updateVisibleTimers();
}

function persist() {
  if (!engine) return;
  saveIndicator.dataset.state = 'saving';
  saveIndicator.lastElementChild.textContent = ui('saving', language());
  try {
    engine.state.updatedAt = Date.now();
    repository.saveSession(engine.snapshot());
    saveIndicator.dataset.state = 'saved';
    saveIndicator.lastElementChild.textContent = ui('saved', language());
  } catch (error) {
    showToast(language() === 'de' ? 'Speichern fehlgeschlagen. Prüft den freien Browserspeicher.' : 'Save failed. Check available browser storage.');
    console.error(error);
  }
}

function showToast(message, timeout = 4600) {
  const element = document.createElement('div');
  element.className = 'toast';
  element.textContent = message;
  toastRegion.append(element);
  liveRegion.textContent = message;
  window.setTimeout(() => element.remove(), timeout);
}

function readSetupForm() {
  const form = document.querySelector('#setup-form');
  if (!form) return setupDraft;
  const data = new FormData(form);
  const playerCount = Number(data.get('playerCount')) || setupDraft.playerCount;
  const names = Array.from({ length: Math.max(playerCount, setupDraft.names.length) }, (_, index) =>
    String(data.get(`player-${index}`) ?? setupDraft.names[index] ?? '').trim()
  );
  setupDraft = {
    ...setupDraft,
    title: String(data.get('title') ?? setupDraft.title),
    playerCount,
    defaultLanguage: String(data.get('defaultLanguage') ?? setupDraft.defaultLanguage),
    names
  };
  return setupDraft;
}

async function requestWakeLock() {
  if (!engine || engine.state.status !== 'active' || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch {
    wakeLock = null;
  }
}

async function requestNotifications() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'denied') {
    preferences = repository.savePreferences({ notifications: false });
    return false;
  }
  try {
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    preferences = repository.savePreferences({ notifications: permission === 'granted' });
    return permission === 'granted';
  } catch {
    return false;
  }
}

function systemNotice(title, body) {
  if (!preferences.notifications || !('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(title, { body, tag: 'adventure-dinner-timer' }); } catch { /* in-app notice remains */ }
}

function showCrewReveal() {
  const currentLanguage = language();
  dialog.show({
    kicker: currentLanguage === 'de' ? 'Die Rollen sind verteilt' : 'The roles are assigned',
    title: currentLanguage === 'de' ? 'Willkommen an Bord' : 'Welcome aboard',
    content: `<div class="crew-list">${engine.state.players.map((player) => {
      const role = getRole(player.roleId);
      return `<div class="crew-item"><div class="card-row"><span class="avatar" style="background:${role.color}">${escapeHtml(playerInitials(player.name))}</span><div style="flex:1"><strong>${escapeHtml(player.name)}</strong><br><span class="muted">${escapeHtml(localize(role.name, currentLanguage))} · ${escapeHtml(localize(role.passive, currentLanguage))}</span></div></div></div>`;
    }).join('')}</div>`,
    actions: `<button type="button" class="primary-button" data-action="close-dialog">${ui('confirmHandover', currentLanguage)}</button>`
  });
}

function showHandover() {
  const next = engine.activePlayer;
  const nextLanguage = next.language;
  const role = getRole(next.roleId);
  dialog.show({
    kicker: ui('handTablet', nextLanguage),
    title: next.name,
    content: `<div class="turn-banner"><span class="avatar" style="background:${role.color}">${escapeHtml(playerInitials(next.name))}</span><div><p>${escapeHtml(localize(role.name, nextLanguage))} · ${ui('group', nextLanguage)} ${engine.activeGroup.id}</p><h2>${escapeHtml(localize(engine.currentChapter.locations[engine.activeGroup.locationIndex], nextLanguage))}</h2></div></div>`,
    actions: `<button type="button" class="primary-button" data-action="close-dialog">${ui('confirmHandover', nextLanguage)}</button>`
  });
}

function showDeleteConfirmation(sessionId) {
  deleteCandidateId = sessionId;
  const currentLanguage = language();
  const deleteAll = sessionId === '__all__';
  dialog.show({
    kicker: currentLanguage === 'de' ? 'Gespeicherte Reise' : 'Saved voyage',
    title: deleteAll ? (currentLanguage === 'de' ? 'Alle Reisen dauerhaft löschen?' : 'Permanently delete all voyages?') : ui('deleteConfirm', currentLanguage),
    content: `<p>${currentLanguage === 'de' ? `${deleteAll ? 'Alle Spielstände' : 'Spielstand, Timer, Menü und Reisetagebuch'} werden nur auf diesem Gerät gelöscht. Dies kann nicht rückgängig gemacht werden.` : `${deleteAll ? 'All saved games' : 'Game state, timers, menu, and voyage log'} will be deleted only on this device. This cannot be undone.`}</p>`,
    actions: `<button type="button" class="secondary-button" data-action="close-dialog">${ui('back', currentLanguage)}</button><button type="button" class="danger-button" data-action="confirm-delete-session">${ui('delete', currentLanguage)}</button>`
  });
}

function resumeSession(sessionId) {
  const snapshot = repository.getSession(sessionId);
  if (!snapshot || !validateSessionState(snapshot).valid) {
    showToast(language() === 'de' ? 'Dieser Spielstand ist beschädigt oder veraltet.' : 'This saved game is damaged or outdated.');
    return;
  }
  engine = new GameEngine(snapshot);
  repository.setCurrent(sessionId);
  audio.setEnabled(engine.state.settings.audio);
  updateTaskTimers(engine.state);
  view = 'game';
  persist();
  render();
  requestWakeLock();
}

function navigate(nextView) {
  if (view === 'setup') readSetupForm();
  if (!engine && nextView === 'game') nextView = publicHomeView;
  if (!engine && !['welcome', 'setup', 'pantry', 'sessions', 'rules'].includes(nextView)) nextView = publicHomeView;
  if (!engine && ['welcome', 'setup'].includes(nextView)) publicHomeView = nextView;
  view = nextView;
  nav.dataset.open = 'false';
  menuButton.setAttribute('aria-expanded', 'false');
  render();
  document.querySelector('#main-content')?.focus({ preventScroll: true });
}

function updateVisibleTimers() {
  if (!engine) return;
  document.querySelectorAll('[data-task-timer]').forEach((element) => {
    const task = engine.state.tasks.find((candidate) => candidate.instanceId === element.dataset.taskTimer);
    if (task) element.textContent = formatDuration(getRemainingSeconds(task));
  });
  document.querySelectorAll('[data-task-progress]').forEach((element) => {
    const task = engine.state.tasks.find((candidate) => candidate.instanceId === element.dataset.taskProgress);
    if (!task?.startedAt) return;
    const card = engine.getTaskCard(task);
    const minutes = task.timingMode === 'background'
      ? (task.backgroundMinutes || card.backgroundMinutes)
      : (task.challengeMinutes || card.challengeMinutes);
    const elapsed = Math.max(0, Date.now() - task.startedAt);
    element.style.setProperty('--progress', `${Math.min(100, Math.round((elapsed / Math.max(1, minutes * 60_000)) * 100))}%`);
  });
  document.querySelectorAll('[data-watch-timer]').forEach((element) => {
    const remaining = Math.max(0, Math.ceil(((engine.state.turn.watchEndsAt ?? Date.now()) - Date.now()) / 1000));
    element.textContent = formatDuration(remaining);
  });
}

function animateVisibleDie() {
  const stage = document.querySelector('.dice-stage');
  if (!stage) return;
  stage.dataset.rolling = 'true';
  window.setTimeout(() => {
    stage.dataset.rolling = 'false';
    stage.querySelector('.die-scene')?.setAttribute('aria-label', language() === 'de' ? 'Würfelergebnis sichtbar' : 'Die result visible');
  }, preferences.reducedMotion ? 50 : 1250);
}

function processTimers() {
  if (!engine || engine.state.status !== 'active') return;
  const result = updateTaskTimers(engine.state);
  updateVisibleTimers();
  if (!result.changed) return;
  result.notices.forEach(({ taskId }) => {
    const instance = engine.state.tasks.find((task) => task.instanceId === taskId);
    const card = instance ? engine.getTaskCard(instance) : null;
    const currentLanguage = language();
    const prefix = ui('timerDone', currentLanguage);
    const title = card ? localize(card.title, currentLanguage) : ui('timerDone', currentLanguage);
    showToast(`${prefix}: ${title}`);
    systemNotice(prefix, title);
    audio.play('timer');
  });
  persist();
  if (result.notices.some((notice) => notice.threshold === 0)) render();
}

async function handleAction(target) {
  const action = target.dataset.action;
  await audio.unlock();
  switch (action) {
    case 'open-setup':
      setupDraft = { title: '', playerCount: 6, defaultLanguage: preferences.language, names: Array(10).fill('') };
      publicHomeView = 'setup';
      navigate('setup');
      break;
    case 'go-home': publicHomeView = 'welcome'; navigate('welcome'); break;
    case 'continue-session':
    case 'resume-session': resumeSession(target.dataset.sessionId); break;
    case 'navigate': navigate(target.dataset.view); break;
    case 'draw-event': engine.beginEvent(); audio.play('card'); persist(); render(); break;
    case 'resolve-choice': {
      const choice = target.dataset.choice;
      if (engine.resolveChoice(choice)) audio.play(cueForAction(choice));
      persist(); render(); break;
    }
    case 'roll-die': {
      engine.rollDie();
      audio.play('dice');
      persist();
      render();
      animateVisibleDie();
      break;
    }
    case 'reroll-die': engine.rerollDie(); audio.play('dice'); persist(); render(); animateVisibleDie(); break;
    case 'reroll-ingredient-die': engine.rerollDieWithIngredient(); audio.play('dice'); persist(); render(); animateVisibleDie(); break;
    case 'adjust-ingredient-die': engine.adjustDieWithIngredient(Number(target.dataset.option)); audio.play('move'); persist(); render(); break;
    case 'confirm-roll':
      if (engine.confirmRoll()) audio.play(cueForAction(engine.state.turn.outcomeCode));
      persist(); render(); break;
    case 'accept-task': {
      const previousPlayerId = engine.activePlayer.id;
      if (engine.acceptTaskBriefing()) {
        audio.play('move'); persist(); render();
        if (engine.state.turn.phase !== 'crewBusy' && engine.activePlayer.id !== previousPlayerId) showHandover();
      }
      break;
    }
    case 'complete-watch': engine.completeWatchChallenge(); audio.play('complete'); persist(); render(); break;
    case 'start-watch':
      if (engine.startWatchChallengeAction()) { audio.play('move'); persist(); render(); }
      break;
    case 'activate-watch': {
      if (engine.activateOngoingWatchChallenge()) {
        const result = engine.endTurn();
        audio.play('move');
        persist();
        render();
        if (result !== 'chain' && engine.state.turn.phase !== 'crewBusy') showHandover();
      }
      break;
    }
    case 'choose-ingredient': engine.chooseIngredient(target.dataset.ingredientId); audio.play('card'); persist(); render(); break;
    case 'choose-soup-style':
      if (engine.chooseSoupStyle(target.dataset.style)) { audio.play('move'); persist(); render(); }
      break;
    case 'choose-ingredient-ignore': engine.chooseIngredient(target.dataset.ingredientId, Date.now(), true); audio.play('move'); persist(); render(); break;
    case 'resolve-ingredient-effect': engine.resolveIngredientEffectChoice(target.dataset.option); audio.play('move'); persist(); render(); break;
    case 'toggle-task-assignee':
      if (engine.toggleTaskAssignee(target.dataset.playerId)) { audio.play('move'); persist(); render(); }
      break;
    case 'confirm-task-assignees':
      if (engine.confirmTaskAssignees()) { audio.play('card'); persist(); render(); }
      break;
    case 'use-ability': {
      const used = engine.useActiveAbility(target.dataset.option == null ? null : Number(target.dataset.option));
      if (used) { audio.play('move'); persist(); render(); }
      else showToast(language() === 'de'
        ? 'Diese Spezialfähigkeit kann nur in einem passenden, abgeschlossenen Kartenschritt eingesetzt werden.'
        : 'This special ability can only be used during a matching, settled card step.');
      break;
    }
    case 'ignore-event': engine.ignoreEventWithTactician(); persist(); render(); break;
    case 'use-alchemist-passive': engine.useAlchemistPassive(); audio.play('move'); persist(); render(); break;
    case 'use-category-passive': engine.useCategoryRolePassive(); audio.play('card'); persist(); render(); break;
    case 'end-turn': {
      const result = engine.endTurn();
      audio.play(result === 'chain' ? 'card' : 'move');
      persist();
      render();
      if (result !== 'chain' && engine.state.turn.phase !== 'crewBusy') showHandover();
      break;
    }
    case 'start-task': {
      if (engine.startTask(target.dataset.taskId)) {
        audio.play('move'); persist(); render();
      }
      break;
    }
    case 'complete-task': {
      const wasCrewBusy = engine.state.turn.phase === 'crewBusy';
      if (engine.completeTask(target.dataset.taskId)) {
        const task = engine.state.tasks.find((entry) => entry.instanceId === target.dataset.taskId);
        const score = task?.challengeCoinValue ?? 0;
        showToast(task?.challengeResult === 'background'
          ? (language() === 'de' ? 'Hintergrundzeit beendet · keine Münzwertung' : 'Background time complete · no coin score')
          : `${score >= 0 ? '+' : ''}${score} ${language() === 'de' ? 'Münzen für die Aufgaben-Challenge' : 'coins for the task challenge'}`);
        audio.play('complete'); persist(); render();
        if (wasCrewBusy && engine.state.turn.phase !== 'crewBusy') showHandover();
      }
      break;
    }
    case 'undo-task':
      if (engine.undoTaskCompletion(target.dataset.taskId)) { audio.play('move'); persist(); render(); }
      break;
    case 'lock-basket-ingredient':
      if (engine.lockIngredientFromBasket(target.dataset.ingredientId)) { audio.play('move'); persist(); render(); }
      break;
    case 'remove-basket-ingredient':
      if (engine.removeIngredientFromBasket(target.dataset.ingredientId)) { audio.play('move'); persist(); render(); }
      break;
    case 'serve-course': engine.serveCourse(); audio.play('complete'); persist(); render(); break;
    case 'next-chapter': engine.startNextChapter(); audio.play('move'); persist(); render(); showHandover(); break;
    case 'toggle-optional': engine.setOptionalIngredientUsed(target.dataset.ingredientId, target.dataset.used === 'true'); persist(); render(); break;
    case 'delete-session': showDeleteConfirmation(target.dataset.sessionId); break;
    case 'delete-all-sessions': showDeleteConfirmation('__all__'); break;
    case 'confirm-delete-session': {
      const deletedId = deleteCandidateId;
      if (deletedId === '__all__') {
        repository.clearSessions();
        engine = null;
      } else {
        repository.deleteSession(deletedId);
        if (engine?.state.id === deletedId) engine = null;
      }
      deleteCandidateId = null;
      dialog.close();
      navigate('sessions');
      break;
    }
    case 'close-dialog': dialog.close(); break;
    default: break;
  }
}

document.addEventListener('click', async (event) => {
  const actionTarget = event.target.closest('[data-action]');
  if (actionTarget) {
    event.preventDefault();
    await handleAction(actionTarget);
    return;
  }
  const navTarget = event.target.closest('[data-nav]');
  if (navTarget) navigate(navTarget.dataset.nav);
});

document.addEventListener('change', (event) => {
  const target = event.target;
  if (target.matches('[data-action="change-player-count"]')) {
    readSetupForm();
    setupDraft.playerCount = Number(target.value);
    render();
  }
  if (target.matches('[data-action="player-language"]') && engine) {
    engine.changePlayerLanguage(target.dataset.playerId, target.value);
    persist();
    render();
  }
});

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'setup-form') return;
  event.preventDefault();
  const draft = readSetupForm();
  const names = draft.names.slice(0, draft.playerCount).map((name) => name.trim());
  if (names.some((name) => !name)) {
    showToast(language() === 'de' ? 'Bitte gebt für jede Person einen Namen ein.' : 'Please enter a name for every player.');
    return;
  }
  engine = GameEngine.create({ ...draft, names, audio: preferences.audio });
  preferences = repository.savePreferences({ language: draft.defaultLanguage });
  audio.setEnabled(preferences.audio);
  view = 'game';
  persist();
  render();
  requestWakeLock();
  showCrewReveal();
});

document.querySelector('#brand-button').addEventListener('click', () => navigate(engine ? 'game' : 'welcome'));
languageButton.addEventListener('click', () => {
  if (engine && view !== 'welcome' && view !== 'setup') {
    const next = engine.activePlayer.language === 'de' ? 'en' : 'de';
    engine.changePlayerLanguage(engine.activePlayer.id, next);
    persist();
  } else {
    const next = preferences.language === 'de' ? 'en' : 'de';
    preferences = repository.savePreferences({ language: next });
    setupDraft.defaultLanguage = next;
  }
  render();
});
audioButton.addEventListener('click', async () => {
  audio.setEnabled(!audio.enabled);
  preferences = repository.savePreferences({ audio: audio.enabled });
  if (engine) { engine.state.settings.audio = audio.enabled; persist(); }
  if (audio.enabled) await audio.play('card');
  render();
});
notificationButton.addEventListener('click', async () => {
  const currentLanguage = language();
  if (!('Notification' in window)) {
    showToast(currentLanguage === 'de' ? 'Dieser Browser unterstützt keine Systemmeldungen.' : 'This browser does not support system notifications.');
    return;
  }
  if (preferences.notifications && Notification.permission === 'granted') {
    preferences = repository.savePreferences({ notifications: false });
    showToast(currentLanguage === 'de'
      ? 'Meldungen bei abgelaufenen Timern sind ausgeschaltet.'
      : 'Timer-finished notifications are disabled.');
    render();
    return;
  }
  const granted = await requestNotifications();
  showToast(currentLanguage === 'de'
    ? granted
      ? 'Du wirst nur benachrichtigt, wenn ein Timer abgelaufen ist.'
      : Notification.permission === 'denied'
        ? 'Systemmeldungen sind im Browser blockiert. Du kannst sie in den Website-Einstellungen freigeben.'
        : 'Systemmeldungen bleiben ausgeschaltet.'
    : granted
      ? 'You will only be notified when a timer has finished.'
      : Notification.permission === 'denied'
        ? 'System notifications are blocked by the browser. You can enable them in the site settings.'
        : 'System notifications remain disabled.');
  render();
});
menuButton.addEventListener('click', () => {
  const open = nav.dataset.open !== 'true';
  nav.dataset.open = String(open);
  menuButton.setAttribute('aria-expanded', String(open));
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    processTimers();
    requestWakeLock();
  }
});

if (['http:', 'https:'].includes(window.location.protocol) && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
}

window.setInterval(processTimers, 1000);
render();
processTimers();
