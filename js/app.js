import { DEFAULT_PREFERENCES } from './config.js';
import { GameAudio } from './core/audio.js';
import { GameEngine, validateSessionState } from './core/game-engine.js';
import { SessionRepository } from './core/storage.js';
import { getRemainingSeconds, getTaskTimerProgress, updateTaskTimers } from './core/timers.js';
import { formatDuration, localize, ui } from './data/i18n.js';
import { INGREDIENTS, SHOPPING_STAPLES } from './data/ingredients.js';
import { getRole } from './data/roles.js';
import { AppDialog } from './ui/dialog.js';
import { renderCardCatalog } from './ui/card-catalog.js';
import { renderGame } from './ui/game.js';
import { escapeHtml, playerInitials } from './ui/helpers.js';
import { renderCrew, renderFaq, renderIngredientGuide, renderPantry, renderRules, renderSessions, renderTasks } from './ui/overlays.js';
import { renderSetup, renderWelcome } from './ui/welcome.js';

const root = document.querySelector('#screen-root');
const app = document.querySelector('#app');
const nav = document.querySelector('#app-nav');
const taskBadge = document.querySelector('#task-badge');
const languageButton = document.querySelector('#language-button');
const audioButton = document.querySelector('#audio-button');
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
let ingredientRenameTarget = null;
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
    : renderIngredientGuide(setupDraft.playerCount, currentLanguage, preferences.ingredientNames, preferences.shoppingStapleNames);
  else if (view === 'cards') root.innerHTML = renderCardCatalog(engine, currentLanguage);
  else if (view === 'sessions') root.innerHTML = renderSessions(repository.listSessions(), engine?.state.id, currentLanguage);
  else if (view === 'rules') root.innerHTML = renderRules(currentLanguage);
  else if (view === 'faq') root.innerHTML = renderFaq(currentLanguage);
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
  const assignment = engine.currentChapter.id === 'cocktails'
    ? next.cocktailTeam === 'alcoholic'
      ? (nextLanguage === 'de' ? 'Cocktail-Team: alkoholisch' : 'Cocktail team: alcoholic')
      : next.cocktailTeam === 'alcohol-free'
        ? (nextLanguage === 'de' ? 'Cocktail-Team: alkoholfrei' : 'Cocktail team: alcohol-free')
        : engine.state.turn.phase === 'cocktailTeamChoice'
          ? (nextLanguage === 'de' ? 'Cocktail-Team jetzt wählen' : 'Choose cocktail team now')
          : (nextLanguage === 'de' ? 'Cocktail-Team noch offen' : 'Cocktail team not chosen yet')
    : `${ui('group', nextLanguage)} ${engine.activeGroup.id}`;
  dialog.show({
    kicker: ui('handTablet', nextLanguage),
    title: next.name,
    content: `<div class="turn-banner"><span class="avatar" style="background:${role.color}">${escapeHtml(playerInitials(next.name))}</span><div><p>${escapeHtml(localize(role.name, nextLanguage))} · ${escapeHtml(assignment)}</p><h2>${escapeHtml(localize(engine.currentChapter.locations[engine.activeGroup.locationIndex], nextLanguage))}</h2></div></div>`,
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

function normalizedIngredientName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function normalizedIngredientNames() {
  return {
    de: normalizedIngredientName(document.querySelector('#ingredient-name-de-input')?.value),
    en: normalizedIngredientName(document.querySelector('#ingredient-name-en-input')?.value)
  };
}

function showIngredientNameEditor(target) {
  const currentLanguage = language();
  ingredientRenameTarget = {
    kind: target.dataset.ingredientKind,
    id: target.dataset.ingredientId,
    currentNames: { de: target.dataset.currentNameDe, en: target.dataset.currentNameEn },
    defaultNames: { de: target.dataset.defaultNameDe, en: target.dataset.defaultNameEn },
    customized: target.dataset.customized === 'true'
  };
  const label = ingredientRenameTarget.kind === 'staple'
    ? (currentLanguage === 'de' ? 'Grundvorrat umbenennen' : 'Rename shopping staple')
    : (currentLanguage === 'de' ? 'Zutat umbenennen' : 'Rename ingredient');
  dialog.show({
    kicker: currentLanguage === 'de' ? 'Zutatenliste anpassen' : 'Customize ingredient list',
    title: label,
    content: `<div class="field"><label for="ingredient-name-de-input">Deutsch</label><input id="ingredient-name-de-input" name="ingredientNameDe" maxlength="80" value="${escapeHtml(ingredientRenameTarget.currentNames.de)}" autocomplete="off" autofocus></div><div class="field"><label for="ingredient-name-en-input">English</label><input id="ingredient-name-en-input" name="ingredientNameEn" maxlength="80" value="${escapeHtml(ingredientRenameTarget.currentNames.en)}" autocomplete="off"></div><p class="muted">${currentLanguage === 'de' ? 'Beide Namen werden passend zur Sprache der aktuellen Person angezeigt. Gang-Tags, Karteneffekt, Mengenempfehlung und Spiellogik bleiben unverändert.' : 'Each name is shown according to the current player’s language. Course tags, card effect, quantity suggestion, and game logic remain unchanged.'}</p>`,
    actions: `${ingredientRenameTarget.customized ? `<button type="button" class="quiet-button" data-action="reset-ingredient-name">${currentLanguage === 'de' ? 'Originalnamen wiederherstellen' : 'Restore original name'}</button>` : ''}<button type="button" class="secondary-button" data-action="close-dialog">${ui('back', currentLanguage)}</button><button type="button" class="primary-button" data-action="save-ingredient-name">${currentLanguage === 'de' ? 'Namen speichern' : 'Save name'}</button>`
  });
  window.setTimeout(() => document.querySelector('#ingredient-name-de-input')?.select(), 0);
}

function updateDefaultIngredientName(kind, id, name = null) {
  const key = kind === 'staple' ? 'shoppingStapleNames' : 'ingredientNames';
  const catalog = kind === 'staple' ? SHOPPING_STAPLES : INGREDIENTS;
  if (!catalog.some((entry) => entry.id === id)) return false;
  const names = { ...(preferences[key] ?? {}) };
  if (name == null) delete names[id];
  else names[id] = name;
  preferences = repository.savePreferences({ [key]: names });
  return true;
}

function saveIngredientName(reset = false) {
  if (!ingredientRenameTarget) return false;
  const { kind, id } = ingredientRenameTarget;
  const customName = reset ? null : normalizedIngredientNames();
  if (!reset && (!customName.de || !customName.en)) {
    showToast(language() === 'de' ? 'Bitte tragt den deutschen und den englischen Zutatennamen ein.' : 'Please enter both the German and English ingredient name.');
    return false;
  }
  const changed = engine
    ? kind === 'staple'
      ? reset ? engine.resetShoppingStapleName(id) : engine.renameShoppingStaple(id, customName)
      : reset ? engine.resetIngredientName(id) : engine.renameIngredient(id, customName)
    : updateDefaultIngredientName(kind, id, customName);
  if (!changed) return false;
  if (engine) persist();
  ingredientRenameTarget = null;
  dialog.close();
  render();
  showToast(language() === 'de' ? (reset ? 'Originalname wiederhergestellt.' : 'Zutatenname gespeichert.') : (reset ? 'Original name restored.' : 'Ingredient name saved.'));
  return true;
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
  if (!engine && !['welcome', 'setup', 'pantry', 'cards', 'sessions', 'rules', 'faq'].includes(nextView)) nextView = publicHomeView;
  if (!engine && ['welcome', 'setup'].includes(nextView)) publicHomeView = nextView;
  view = nextView;
  render();
  document.querySelector('#main-content')?.focus({ preventScroll: true });
}

function updateVisibleTimers() {
  if (!engine) return;
  document.querySelectorAll('[data-task-timer]').forEach((element) => {
    const task = engine.state.tasks.find((candidate) => candidate.instanceId === element.dataset.taskTimer);
    if (task) {
      const remaining = getRemainingSeconds(task);
      element.textContent = formatDuration(remaining);
      element.dataset.overdue = String(remaining < 0);
      const caption = document.querySelector(`[data-task-timer-caption="${task.instanceId}"]`);
      if (caption && task.timingMode !== 'background') {
        caption.textContent = remaining < 0
          ? task.status === 'done'
            ? (language() === 'de' ? 'Überlänge beim Abschluss' : 'overtime at completion')
            : (language() === 'de' ? 'Überlänge' : 'overtime')
          : task.status === 'done'
            ? (language() === 'de' ? 'Restzeit beim Abschluss' : 'time remaining at completion')
            : ui('remaining', language());
      }
    }
  });
  document.querySelectorAll('[data-task-progress]').forEach((element) => {
    const task = engine.state.tasks.find((candidate) => candidate.instanceId === element.dataset.taskProgress);
    if (!task?.startedAt) return;
    element.style.setProperty('--progress', `${getTaskTimerProgress(task)}%`);
  });
  document.querySelectorAll('[data-watch-timer]').forEach((element) => {
    const remaining = Math.max(0, Math.ceil(((engine.state.turn.watchEndsAt ?? Date.now()) - Date.now()) / 1000));
    element.textContent = formatDuration(remaining);
  });
}

function animateVisibleDie(selector = '.game-card .dice-stage') {
  const stage = document.querySelector(selector);
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
    audio.play('timer');
  });
  persist();
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
    case 'edit-ingredient-name': showIngredientNameEditor(target); break;
    case 'save-ingredient-name': saveIngredientName(false); break;
    case 'reset-ingredient-name': saveIngredientName(true); break;
    case 'draw-event': engine.beginEvent(); audio.play('card'); persist(); render(); break;
    case 'complete-story-card':
      if (engine.completeStoryCard()) { audio.play('complete'); persist(); render(); }
      break;
    case 'answer-story-quiz': {
      const answered = engine.answerStoryQuiz(target.dataset.answerId);
      if (answered) audio.play(engine.state.turn.storyAnswerCorrect ? 'complete' : 'move');
      persist(); render();
      break;
    }
    case 'resolve-choice': {
      const choice = target.dataset.choice;
      const resolved = engine.resolveChoice(choice, Date.now(), target.dataset.ingredientId ?? null);
      const gamblerRolled = resolved && Number.isInteger(engine.state.turn.gamblerLossRoll);
      if (resolved) audio.play(gamblerRolled ? 'dice' : cueForAction(choice));
      persist(); render();
      if (gamblerRolled) animateVisibleDie();
      break;
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
    case 'resolve-watch-outcome': {
      const outcome = target.dataset.outcome;
      if (engine.resolveWatchChallengeOutcome(outcome)) {
        audio.play(outcome === 'success' ? 'complete' : 'move');
        persist(); render();
      }
      break;
    }
    case 'choose-watch-player':
      if (engine.selectWatchChallengePlayer(target.dataset.playerId)) { audio.play('move'); persist(); render(); }
      break;
    case 'confirm-watch-player':
      if (engine.confirmWatchChallengePlayer()) { audio.play('complete'); persist(); render(); }
      break;
    case 'reveal-secret-watch':
      if (engine.revealSecretWatchChallenge()) { audio.play('card'); persist(); render(); }
      break;
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
    case 'choose-cocktail-technique':
      if (engine.chooseCocktailTechnique(target.dataset.team, target.dataset.technique)) { audio.play('move'); persist(); render(); }
      break;
    case 'choose-cocktail-spirit-count':
      if (engine.chooseCocktailSpiritCount(Number(target.dataset.count))) { audio.play('move'); persist(); render(); }
      break;
    case 'choose-cocktail-team': {
      const previousPlayerId = engine.activePlayer.id;
      if (engine.chooseCocktailTeam(target.dataset.team)) {
        audio.play('move'); persist(); render();
        if (engine.activePlayer.id !== previousPlayerId) showHandover();
      }
      break;
    }
    case 'choose-ingredient-ignore': engine.chooseIngredient(target.dataset.ingredientId, Date.now(), true); audio.play('move'); persist(); render(); break;
    case 'resolve-ingredient-effect': engine.resolveIngredientEffectChoice(target.dataset.option); audio.play('move'); persist(); render(); break;
    case 'toggle-task-assignee':
      if (engine.toggleTaskAssignee(target.dataset.playerId)) { audio.play('move'); persist(); render(); }
      break;
    case 'confirm-task-assignees':
      if (engine.confirmTaskAssignees()) { audio.play('card'); persist(); render(); }
      break;
    case 'use-ability': {
      const roleId = engine.activePlayer.roleId;
      const used = engine.useActiveAbility(target.dataset.option == null ? null : Number(target.dataset.option));
      if (used) {
        audio.play(roleId === 'gambler' ? 'dice' : 'move');
        persist(); render();
        if (roleId === 'gambler') animateVisibleDie('.role-guide .dice-stage');
      }
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
          : task?.challengeResult === 'manual'
            ? (language() === 'de' ? 'Nach Gargrad erledigt · keine Zeitwertung' : 'Completed by doneness · no time score')
            : `${score >= 0 ? '+' : ''}${score} ${language() === 'de' ? 'Münzen für die Aufgaben-Challenge' : 'coins for the task challenge'}`);
        audio.play('complete'); persist(); render();
        if (wasCrewBusy && engine.state.turn.phase !== 'crewBusy') showHandover();
      }
      break;
    }
    case 'resolve-cauldron-watch': {
      const wasCrewBusy = engine.state.turn.phase === 'crewBusy';
      const decision = target.dataset.decision;
      if (engine.completeCauldronWatch(target.dataset.taskId, decision)) {
        showToast(decision === 'soupReady'
          ? (language() === 'de' ? 'Suppe ist fertig · weitere Kesselwachen entfallen' : 'Soup is ready · no further cauldron watches are needed')
          : (language() === 'de' ? 'Kesselwache abgelöst · die Karte liegt wieder oben auf dem Aufgabenstapel' : 'Cauldron watch relieved · the card is back on top of the task deck'));
        audio.play('complete'); persist(); render();
        if (wasCrewBusy && engine.state.turn.phase !== 'crewBusy') showHandover();
      }
      break;
    }
    case 'undo-task':
      if (engine.undoTaskCompletion(target.dataset.taskId)) { audio.play('move'); persist(); render(); }
      break;
    case 'lock-basket-ingredient':
      if (engine.lockIngredientFromBasket(target.dataset.ingredientId, Date.now(), target.dataset.cocktailUse ?? null)) { audio.play('move'); persist(); render(); }
      break;
    case 'assign-cocktail-ingredient':
      if (engine.setCocktailIngredientUse(target.dataset.ingredientId, target.dataset.cocktailUse)) { audio.play('move'); persist(); render(); }
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
    case 'close-dialog': ingredientRenameTarget = null; dialog.close(); break;
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
  if (event.target.matches('#app-dialog .dialog-frame') && ingredientRenameTarget) {
    event.preventDefault();
    saveIngredientName(false);
    return;
  }
  if (event.target.id !== 'setup-form') return;
  event.preventDefault();
  const draft = readSetupForm();
  const names = draft.names.slice(0, draft.playerCount).map((name) => name.trim());
  if (names.some((name) => !name)) {
    showToast(language() === 'de' ? 'Bitte gebt für jede Person einen Namen ein.' : 'Please enter a name for every player.');
    return;
  }
  engine = GameEngine.create({
    ...draft,
    names,
    audio: preferences.audio,
    ingredientNames: preferences.ingredientNames,
    shoppingStapleNames: preferences.shoppingStapleNames
  });
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
