export const SOUND_DESIGNS = Object.freeze({
  card: 'parchment-and-wood',
  dice: 'wooden-dice-cup',
  move: 'ship-deck-knock',
  treasure: 'metal-coins',
  timer: 'ship-bell',
  complete: 'lute-cadence'
});

export class GameAudio {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
    this.master = null;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  async unlock() {
    if (!this.enabled || typeof AudioContext === 'undefined') return false;
    this.context ??= new AudioContext();
    if (!this.master) {
      this.master = this.context.createGain();
      this.master.gain.value = 0.72;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context.state === 'running';
  }

  tone(frequency, delay, duration, options = {}) {
    const start = this.context.currentTime + 0.012 + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = options.type ?? 'triangle';
    oscillator.frequency.setValueAtTime(frequency, start);
    if (options.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, start + duration);
    if (options.detune) oscillator.detune.setValueAtTime(options.detune, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(options.gain ?? 0.035, start + (options.attack ?? 0.006));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    if (options.filterFrequency) {
      const filter = this.context.createBiquadFilter();
      filter.type = options.filterType ?? 'lowpass';
      filter.frequency.setValueAtTime(options.filterFrequency, start);
      filter.Q.value = options.filterQ ?? 0.7;
      oscillator.connect(filter).connect(gain).connect(this.master);
    } else {
      oscillator.connect(gain).connect(this.master);
    }
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  noise(delay, duration, options = {}) {
    const start = this.context.currentTime + 0.012 + delay;
    const frameCount = Math.max(1, Math.ceil(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, frameCount, this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      const fade = 1 - index / samples.length;
      samples[index] = (Math.random() * 2 - 1) * fade;
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    filter.type = options.filterType ?? 'bandpass';
    filter.frequency.setValueAtTime(options.frequency ?? 1200, start);
    filter.Q.value = options.q ?? 0.8;
    gain.gain.setValueAtTime(options.gain ?? 0.025, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  woodHit(delay, pitch = 105, strength = 1) {
    this.noise(delay, 0.045, { frequency: 720, q: 0.55, gain: 0.035 * strength });
    this.tone(pitch, delay, 0.075, {
      type: 'triangle', gain: 0.04 * strength, endFrequency: Math.max(48, pitch * 0.62), filterFrequency: 850
    });
  }

  coin(delay, frequency) {
    this.tone(frequency, delay, 0.28, { type: 'sine', gain: 0.026, attack: 0.003 });
    this.tone(frequency * 2.71, delay + 0.004, 0.19, { type: 'sine', gain: 0.012, attack: 0.002 });
    this.tone(frequency * 4.08, delay + 0.008, 0.11, { type: 'sine', gain: 0.006, attack: 0.002 });
  }

  bell(delay = 0) {
    const partials = [523.25, 1046.5, 1277, 1568, 2093];
    const gains = [0.038, 0.023, 0.015, 0.011, 0.006];
    partials.forEach((frequency, index) => this.tone(frequency, delay, 0.72 - index * 0.08, {
      type: 'sine', gain: gains[index], attack: 0.003
    }));
    this.noise(delay, 0.025, { frequency: 2100, q: 1.2, gain: 0.018 });
  }

  pluck(frequency, delay, duration = 0.34) {
    this.tone(frequency, delay, duration, {
      type: 'triangle', gain: 0.032, attack: 0.004, filterFrequency: 1800
    });
    this.tone(frequency * 2, delay + 0.003, duration * 0.62, {
      type: 'sine', gain: 0.008, attack: 0.003
    });
    this.noise(delay, 0.018, { frequency: 2600, q: 0.9, gain: 0.009 });
  }

  playCard() {
    this.noise(0, 0.13, { frequency: 1900, q: 0.45, gain: 0.025 });
    this.noise(0.075, 0.11, { frequency: 2900, q: 0.6, gain: 0.018 });
    this.woodHit(0.16, 92, 0.55);
  }

  playDice() {
    [[0, 132, 0.7], [0.055, 108, 0.82], [0.12, 145, 0.68], [0.19, 96, 0.9], [0.28, 82, 1]]
      .forEach(([delay, pitch, strength]) => this.woodHit(delay, pitch, strength));
  }

  playMove() {
    this.woodHit(0, 98, 0.72);
    this.woodHit(0.095, 73, 0.95);
  }

  playTreasure() {
    [[0, 1046.5], [0.075, 1318.5], [0.145, 1568], [0.21, 1174.7]]
      .forEach(([delay, frequency]) => this.coin(delay, frequency));
  }

  playTimer() {
    this.bell(0);
    this.bell(0.42);
  }

  playComplete() {
    [[0, 293.66], [0.095, 349.23], [0.19, 440], [0.29, 587.33]]
      .forEach(([delay, frequency], index) => this.pluck(frequency, delay, index === 3 ? 0.62 : 0.36));
  }

  async play(name) {
    if (!this.enabled || typeof AudioContext === 'undefined') return false;
    try {
      if (!await this.unlock()) return false;
      switch (name) {
        case 'dice': this.playDice(); break;
        case 'move': this.playMove(); break;
        case 'treasure': this.playTreasure(); break;
        case 'timer': this.playTimer(); break;
        case 'complete': this.playComplete(); break;
        case 'card':
        default: this.playCard(); break;
      }
      return true;
    } catch {
      // Audio is atmospheric only. The visual game remains fully usable.
      return false;
    }
  }
}
