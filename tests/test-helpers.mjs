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

export function resolvePendingLocationStories(engine, now = Date.now()) {
  let offset = 0;
  while (engine.pendingLocationStoryForCurrentChapter()) {
    if (engine.state.turn.phase !== 'draw') throw new Error(`Cannot read a location story during ${engine.state.turn.phase}`);
    const story = engine.beginEvent(now + offset);
    if (story?.storyKind !== 'location' || !engine.completeStoryCard(now + offset + 1)) {
      throw new Error('Could not resolve pending location story');
    }
    if (!engine.endTurn(now + offset + 2)) throw new Error('Could not finish location story turn');
    offset += 3;
  }
  return offset;
}

export function drawNextNonStoryEvent(engine, now = Date.now()) {
  for (let offset = 0; offset < 100; offset += 3) {
    const card = engine.beginEvent(now + offset);
    if (!card?.storyKind) return card;
    const resolved = card.storyKind === 'location'
      ? engine.completeStoryCard(now + offset + 1)
      : engine.answerStoryQuiz(card.correctAnswerId, now + offset + 1);
    if (!resolved || !engine.endTurn(now + offset + 2)) throw new Error('Could not pass story card while drawing an event');
  }
  throw new Error('Could not reach a non-story event');
}
