export const APP_VERSION = '1.4.0';
export const STATE_VERSION = 3;
export const STORAGE_KEYS = Object.freeze({
  sessions: 'adventure-dinner:sessions:v3',
  currentSession: 'adventure-dinner:current-session:v3',
  preferences: 'adventure-dinner:preferences:v3'
});

export const PLAYER_LIMITS = Object.freeze({ min: 6, max: 10 });
export const COIN_GOAL = 500;
export const COIN_VALUES = Object.freeze({
  event: 2,
  challenge: 2,
  veryFastTask: 2,
  onTimeTask: 1,
  lateTask: -2,
  veryLateTask: -5
});
export const LOCATION_PROGRESS_PER_TWO_PLAYERS = 1;
export const MAX_HISTORY_ITEMS = 5000;
export const TIMER_ALERT_SECONDS = Object.freeze([0]);
export const DEFAULT_PREFERENCES = Object.freeze({
  language: 'de',
  audio: true,
  reducedMotion: false,
  notifications: false
});

export const SESSION_STATUS = Object.freeze({
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
});
