import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('all timer notices are optional globally and only fire when a timer finishes', async () => {
  const [app, html, config, i18n] = await Promise.all([
    readFile(new URL('../js/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../js/config.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/data/i18n.js', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="notification-button"/);
  assert.equal((app.match(/Notification\.requestPermission\(\)/g) ?? []).length, 1);
  assert.match(app, /notificationButton\.addEventListener\('click',[\s\S]*?requestNotifications\(\)/);
  assert.match(config, /TIMER_ALERT_SECONDS = Object\.freeze\(\[0\]\)/);
  assert.doesNotMatch(i18n, /timerNotice5|timerNotice1|Noch fünf Minuten|Noch eine Minute/);
  assert.match(app, /const prefix = ui\('timerDone', currentLanguage\);[\s\S]*?systemNotice\(prefix, title\);/);
  assert.equal((app.match(/systemNotice\(prefix, title\)/g) ?? []).length, 1);
  const acceptTaskHandler = app.match(/case 'accept-task':([\s\S]*?)case 'complete-watch':/)?.[1] ?? '';
  const startTaskHandler = app.match(/case 'start-task':([\s\S]*?)case 'complete-task':/)?.[1] ?? '';
  assert.doesNotMatch(acceptTaskHandler, /Notification|requestNotifications/);
  assert.doesNotMatch(startTaskHandler, /Notification|requestNotifications/);
  assert.match(app, /\[data-task-progress\][\s\S]*?style\.setProperty\('--progress'/);
});
