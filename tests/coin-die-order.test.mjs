import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../js/core/game-engine.js';
import { EVENT_DECKS } from '../js/data/events.js';
import { renderGame } from '../js/ui/game.js';

const names = ['Anne', 'Ben', 'Cara', 'Dario', 'Elif', 'Finn'];
const now = 1_800_700_000_000;
const orderedOutcomes = ['coinLoss', 'coinLossSmall', 'treasureSmall', 'treasure', 'chain', 'treasureAndChain'];

function create(seed = 10_001) {
  const engine = GameEngine.create({ names, title: 'Ordered coin die', defaultLanguage: 'de', seed }, now);
  engine.activePlayer.roleId = 'scout';
  return engine;
}

test('pure coin-and-extra-card rolls reserve a unique increasingly better result for every face', () => {
  const orderedEvents = EVENT_DECKS.flat().filter((event) => event.orderedCoinRoll);
  assert.ok(orderedEvents.length > 0);
  assert.ok(orderedEvents.every((event) => ['cache', 'fortune'].includes(event.archetype)));
  assert.ok(orderedEvents.every((event) => event.type === 'dice'));
  assert.ok(orderedEvents.every((event) => new Set(event.outcomes).size === 6));
  assert.ok(orderedEvents.every((event) => orderedOutcomes.every((outcome, index) => event.outcomes[index] === outcome)));
});

test('coin die faces resolve from minus five on 1 to two coins plus another card on 6', () => {
  const event = EVENT_DECKS[0].find((card) => card.archetype === 'cache');
  const expected = [
    { action: 'coinLoss', coins: -5, chain: false },
    { action: 'coinLossSmall', coins: -3, chain: false },
    { action: 'treasureSmall', coins: 1, chain: false },
    { action: 'treasure', coins: 2, chain: false },
    { action: 'chain', coins: 0, chain: true },
    { action: 'treasureAndChain', coins: 2, chain: true }
  ];

  expected.forEach(({ action, coins, chain }, index) => {
    const engine = create(10_010 + index);
    engine.state.coins = 20;
    engine.state.turn.currentEventId = event.id;
    engine.state.turn.phase = 'rolled';
    engine.state.turn.dieResult = index + 1;
    assert.equal(engine.eventOutcomeForDie(engine.currentEvent, index + 1), action);
    assert.equal(engine.confirmRoll(now + index), true);
    assert.equal(engine.state.turn.outcomeCode, action);
    assert.equal(engine.state.coins, 20 + coins);
    assert.equal(engine.state.turn.chainPending, chain);
  });
});

test('fun, quiz, ingredient, and task rolls retain their existing grouped mapping', () => {
  const engine = create(10_020);
  const funRoll = EVENT_DECKS.flat().find((event) => event.archetype === 'card-fate');
  const ingredientRoll = EVENT_DECKS.flat().find((event) => event.archetype === 'market');
  const taskRoll = EVENT_DECKS.flat().find((event) => event.archetype === 'duty');

  [funRoll, ingredientRoll, taskRoll].forEach((event) => {
    assert.notEqual(event.orderedCoinRoll, true);
    assert.equal(event.outcomes.length, 3);
    assert.equal(engine.eventOutcomeForDie(event, 1), event.outcomes[0]);
    assert.equal(engine.eventOutcomeForDie(event, 2), event.outcomes[0]);
    assert.equal(engine.eventOutcomeForDie(event, 3), event.outcomes[1]);
    assert.equal(engine.eventOutcomeForDie(event, 4), event.outcomes[1]);
    assert.equal(engine.eventOutcomeForDie(event, 5), event.outcomes[2]);
    assert.equal(engine.eventOutcomeForDie(event, 6), event.outcomes[2]);
  });
});

test('coin-roll cards explain the ordered scale and display the exact rolled result', () => {
  const engine = create(10_030);
  const event = EVENT_DECKS[0].find((card) => card.archetype === 'fortune');
  engine.state.turn.currentEventId = event.id;
  engine.state.turn.phase = 'event';
  assert.match(renderGame(engine, 'de'), /1 ist das schlechteste, 6 das beste/);

  engine.state.turn.phase = 'rolled';
  engine.state.turn.dieResult = 2;
  const rolled = renderGame(engine, 'de');
  assert.match(rolled, /Gewürfelt: 2/);
  assert.match(rolled, /−3 Münzen/);
});
