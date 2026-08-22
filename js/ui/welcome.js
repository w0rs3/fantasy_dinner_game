import { CHAPTERS } from '../data/chapters.js';
import { escapeHtml, tx } from './helpers.js';

export function renderWelcome(language, currentSession) {
  return `
    <section class="hero-screen">
      <div class="hero-card">
        <p class="eyebrow">${tx('welcomeKicker', language)}</p>
        <h1>Adventure Dinner</h1>
        <p class="lead">${tx('welcomeLead', language)}</p>
        <div class="stat-strip">
          <span class="stat-chip"><span aria-hidden="true">♙</span>${tx('players', language)}</span>
          <span class="stat-chip"><span aria-hidden="true">◷</span>${tx('duration', language)}</span>
          <span class="stat-chip"><span aria-hidden="true">↯</span>${tx('offline', language)}</span>
          <span class="stat-chip"><span aria-hidden="true">${CHAPTERS.length}</span>${language === 'de' ? ' Gänge' : ' courses'}</span>
        </div>
        <div class="hero-actions">
          ${currentSession ? `<button class="primary-button" type="button" data-action="continue-session" data-session-id="${escapeHtml(currentSession.id)}">${tx('continueGame', language)}</button>` : ''}
          <button class="${currentSession ? 'secondary-button' : 'primary-button'}" type="button" data-action="open-setup">${tx('newGame', language)}</button>
        </div>
        ${currentSession ? `<p class="muted" style="margin-top:1rem">${escapeHtml(currentSession.title)} · ${escapeHtml(currentSession.players.map((player) => player.name).join(', '))}</p>` : ''}
      </div>
    </section>`;
}

export function renderSetup(language, setupDraft) {
  const playerFields = Array.from({ length: setupDraft.playerCount }, (_, index) => `
    <label class="player-input">
      <b>${index + 1}</b>
      <span class="player-setup-fields">
        <span class="sr-only">${tx('playerName', language)} ${index + 1}</span>
        <input name="player-${index}" value="${escapeHtml(setupDraft.names[index] ?? '')}" placeholder="${tx('playerName', language)} ${index + 1}" autocomplete="off" required maxlength="28">
      </span>
    </label>`).join('');

  return `
    <section class="screen-padding">
      <div class="section-header">
        <div>
          <p class="eyebrow">Adventure Dinner</p>
          <h1>${tx('setupTitle', language)}</h1>
          <p class="muted">${tx('setupLead', language)}</p>
        </div>
      </div>

      <form id="setup-form" class="setup-form panel" autocomplete="off">
        <div class="form-grid">
          <div class="field">
            <label for="session-title">${tx('sessionName', language)}</label>
            <input id="session-title" name="title" value="${escapeHtml(setupDraft.title)}" placeholder="${tx('sessionNamePlaceholder', language)}" maxlength="56" required>
          </div>
          <div class="field">
            <label for="player-count">${tx('crewSize', language)}</label>
            <select id="player-count" name="playerCount" data-action="change-player-count">
              ${[6,7,8,9,10].map((count) => `<option value="${count}" ${count === setupDraft.playerCount ? 'selected' : ''}>${count}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="default-language">${tx('startingLanguage', language)}</label>
            <select id="default-language" name="defaultLanguage">
              <option value="de" ${setupDraft.defaultLanguage === 'de' ? 'selected' : ''}>Deutsch</option>
              <option value="en" ${setupDraft.defaultLanguage === 'en' ? 'selected' : ''}>English</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label>${language === 'de' ? 'Spielernamen in Zugreihenfolge' : 'Player names in turn order'}</label>
          <p class="field-hint">${language === 'de'
            ? 'Die Cocktail-Teams werden später gemeinsam zu Beginn des Cocktailgangs festgelegt.'
            : 'Cocktail teams are chosen together later, at the start of the cocktail course.'}</p>
          <div class="player-fields">${playerFields}</div>
        </div>

        <div class="panel" style="box-shadow:none;background:rgba(3,18,25,.34)">
          <p class="eyebrow">${language === 'de' ? 'Vor dem Start' : 'Before departure'}</p>
          <p class="muted" style="margin-bottom:0">${language === 'de'
            ? 'Legt alle Zutaten bereit, prüft euren Bratschlauch und haltet Mixer, Ofen, Herd, Töpfe, Pfannen, Messer und Timer-Zugriff bereit. Rollen werden erst nach dem Start sichtbar.'
            : 'Set out all ingredients, check the roasting bag, and have the blender, oven, hob, pots, pans, knives, and timer access ready. Roles are revealed only after departure.'}</p>
        </div>

        <div class="button-row">
          <button class="primary-button" type="submit">${tx('beginAdventure', language)}</button>
          <button class="secondary-button" type="button" data-action="go-home">${tx('back', language)}</button>
        </div>
      </form>
    </section>`;
}
