import { GameEngine } from '../js/core/game-engine.js';

export function addOpeningTask(engine, now = Date.now()) {
  const task = engine.assignTask({ now });
  if (!task || !engine.briefTask(task, true, now)) throw new Error('Could not create task fixture');
  return task;
}

export function createEngineWithTask(setup, now = Date.now()) {
  const engine = GameEngine.create(setup, now);
  addOpeningTask(engine, now);
  return engine;
}
