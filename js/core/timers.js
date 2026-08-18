import { TIMER_ALERT_SECONDS } from '../config.js';

export function getRemainingSeconds(task, now = Date.now()) {
  if (!task.endAt || task.status === 'queued') return 0;
  const reference = task.status === 'done' && task.completedAt ? task.completedAt : now;
  const delta = task.endAt - reference;
  const seconds = delta >= 0 ? Math.ceil(delta / 1000) : -Math.ceil(Math.abs(delta) / 1000);
  return task.timingMode === 'background' ? Math.max(0, seconds) : seconds;
}

export function getElapsedSeconds(task, now = Date.now()) {
  if (!task.startedAt) return 0;
  const reference = task.status === 'done' && task.completedAt ? task.completedAt : now;
  return Math.max(0, Math.ceil((reference - task.startedAt) / 1000));
}

export function getTaskTimerProgress(task, now = Date.now()) {
  if (!task.startedAt || !task.endAt || task.endAt <= task.startedAt) return 0;
  const elapsed = getElapsedSeconds(task, now) * 1000;
  return Math.max(0, Math.min(100, Math.round(elapsed / (task.endAt - task.startedAt) * 100)));
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
