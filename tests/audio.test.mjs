import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { GameAudio, SOUND_DESIGNS } from '../js/core/audio.js';

const root = fileURLToPath(new URL('..', import.meta.url));

class AudioParamStub {
  constructor() { this.value = 0; }
  setValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
}

class AudioNodeStub {
  connect(node) { return node; }
}

class AudioContextStub {
  constructor() {
    this.state = 'running';
    this.currentTime = 1;
    this.sampleRate = 8_000;
    this.destination = new AudioNodeStub();
    this.oscillators = [];
    this.noiseSources = [];
  }
  createGain() {
    const node = new AudioNodeStub();
    node.gain = new AudioParamStub();
    return node;
  }
  createOscillator() {
    const node = new AudioNodeStub();
    node.frequency = new AudioParamStub();
    node.detune = new AudioParamStub();
    node.start = () => {};
    node.stop = () => {};
    this.oscillators.push(node);
    return node;
  }
  createBiquadFilter() {
    const node = new AudioNodeStub();
    node.frequency = new AudioParamStub();
    node.Q = new AudioParamStub();
    return node;
  }
  createBuffer(channels, length) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  createBufferSource() {
    const node = new AudioNodeStub();
    node.start = () => {};
    node.stop = () => {};
    this.noiseSources.push(node);
    return node;
  }
  async resume() { this.state = 'running'; }
}

test('every game cue has a distinct pirate or medieval sound design', () => {
  assert.deepEqual(SOUND_DESIGNS, {
    card: 'parchment-and-wood',
    dice: 'wooden-dice-cup',
    move: 'ship-deck-knock',
    treasure: 'metal-coins',
    timer: 'ship-bell',
    complete: 'lute-cadence'
  });
});

test('all atmospheric cues build successfully from Web Audio nodes', async () => {
  const originalAudioContext = globalThis.AudioContext;
  globalThis.AudioContext = AudioContextStub;
  try {
    const audio = new GameAudio(true);
    const signatures = new Set();
    for (const cue of Object.keys(SOUND_DESIGNS)) {
      const oscillatorsBefore = audio.context?.oscillators.length ?? 0;
      const noiseBefore = audio.context?.noiseSources.length ?? 0;
      assert.equal(await audio.play(cue), true, cue);
      signatures.add(`${audio.context.oscillators.length - oscillatorsBefore}:${audio.context.noiseSources.length - noiseBefore}`);
    }
    assert.equal(signatures.size, Object.keys(SOUND_DESIGNS).length, 'each cue uses a distinct acoustic texture');
  } finally {
    if (originalAudioContext === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = originalAudioContext;
  }
});

test('muted audio remains silent and does not create an audio context', async () => {
  const originalAudioContext = globalThis.AudioContext;
  globalThis.AudioContext = AudioContextStub;
  try {
    const audio = new GameAudio(false);
    assert.equal(await audio.play('treasure'), false);
    assert.equal(audio.context, null);
  } finally {
    if (originalAudioContext === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = originalAudioContext;
  }
});

test('game actions use their matching acoustic cue', async () => {
  const app = await readFile(`${root}/js/app.js`, 'utf8');
  assert.match(app, /treasureAndTask[\s\S]*?return 'treasure'/);
  assert.match(app, /drawTask[\s\S]*?return 'card'/);
  assert.match(app, /case 'choose-ingredient':[\s\S]*?audio\.play\('card'\)/);
  assert.match(app, /case 'lock-basket-ingredient':[\s\S]*?audio\.play\('move'\)/);
  assert.doesNotMatch(app, /case 'choose-ingredient':[^\n]*audio\.play\('treasure'\)/);
});
