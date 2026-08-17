import { TIMER_ALERT_SECONDS } from '../config.js';

export function getRemainingSeconds(task, now = Date.now()) {
  if (!task.endAt || task.status !== 'active') return 0;
  return Math.max(0, Math.ceil((task.endAt - now) / 1000));
}

export function updateTaskTimers(session, now = Date.now()) {
  const notices = [];
  let changed = false;

  session.tasks.forEach((task) => {
    if (task.status !== 'active' || !task.endAt) return;
    const remaining = getRemainingSeconds(task, now);
    task.alertsSent ??= [];

    for (const threshold of TIMER_ALERT_SECONDS) {
      if (remaining <= threshold && !task.alertsSent.includes(threshold)) {
        task.alertsSent.push(threshold);
        notices.push({ taskId: task.instanceId, threshold, remaining });
        changed = true;
      }
    }

    if (remaining <= 0) {
      task.status = 'ready';
      task.readyAt = now;
      changed = true;
    }
  });

  if (changed) session.updatedAt = now;
  return { changed, notices };
}

export function activeTimerCount(session) {
  return session.tasks.filter((task) => task.status === 'active' && task.endAt).length;
}
