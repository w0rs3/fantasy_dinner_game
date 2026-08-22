import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('timer notices stay inside the game and only fire when a timer finishes', async () => {
  const [app, html, config, i18n, layout] = await Promise.all([
    readFile(new URL('../js/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../js/config.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/data/i18n.js', import.meta.url), 'utf8'),
    readFile(new URL('../css/layout.css', import.meta.url), 'utf8')
  ]);

  assert.doesNotMatch(html, /id="notification-button"|id="menu-button"/);
  assert.doesNotMatch(app, /\bNotification\b|requestNotifications|notificationButton|menuButton/);
  assert.match(config, /TIMER_ALERT_SECONDS = Object\.freeze\(\[0\]\)/);
  assert.doesNotMatch(config, /notifications/);
  assert.doesNotMatch(i18n, /timerNotice5|timerNotice1|Noch fünf Minuten|Noch eine Minute/);
  assert.doesNotMatch(layout, /menu-button|data-open|translateX/);
  assert.match(layout, /@media \(max-width: 720px\)[\s\S]*?\.app-nav \{[\s\S]*?position: fixed;[\s\S]*?bottom: 0;[\s\S]*?overflow-x: auto;/);
  assert.match(app, /const prefix = ui\('timerDone', currentLanguage\);[\s\S]*?showToast\(`\$\{prefix\}: \$\{title\}`\);[\s\S]*?audio\.play\('timer'\);/);
  const acceptTaskHandler = app.match(/case 'accept-task':([\s\S]*?)case 'complete-watch':/)?.[1] ?? '';
  const startTaskHandler = app.match(/case 'start-task':([\s\S]*?)case 'complete-task':/)?.[1] ?? '';
  assert.doesNotMatch(acceptTaskHandler, /Notification|requestNotifications/);
  assert.doesNotMatch(startTaskHandler, /Notification|requestNotifications/);
  assert.match(app, /\[data-task-progress\][\s\S]*?style\.setProperty\('--progress'/);
  const timerHandler = app.match(/function processTimers\(\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(timerHandler, /updateVisibleTimers\(\)/);
  assert.match(timerHandler, /showToast\(/);
  assert.match(timerHandler, /persist\(\)/);
  assert.doesNotMatch(timerHandler, /\brender\(\)/, 'a timer notification must not rebuild the current screen');
});
