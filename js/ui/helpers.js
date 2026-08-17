import { localize, ui } from '../data/i18n.js';
import { getRole } from '../data/roles.js';

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function t(value, language) {
  return escapeHtml(localize(value, language));
}

export function tx(key, language) {
  return escapeHtml(ui(key, language));
}

export function playerInitials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

export function avatar(player) {
  const role = getRole(player.roleId);
  return `<span class="avatar" style="background:${role?.color ?? '#e1b75a'}" aria-hidden="true">${escapeHtml(playerInitials(player.name))}</span>`;
}

export function statusTag(label, tone = '') {
  return `<span class="tag"${tone ? ` data-tone="${tone}"` : ''}>${escapeHtml(label)}</span>`;
}

export function button(label, action, className = 'primary-button', attributes = '') {
  return `<button type="button" class="${className}" data-action="${escapeHtml(action)}" ${attributes}>${escapeHtml(label)}</button>`;
}

export function percent(value, total) {
  return total > 0 ? Math.max(0, Math.min(100, Math.round(value / total * 100))) : 0;
}
