const PATTERNS = Object.freeze({
  card: [[330, .045, 0], [494, .08, .04]],
  dice: [[180, .04, 0], [230, .04, .07], [290, .06, .14]],
  move: [[392, .07, 0], [523, .11, .08]],
  treasure: [[392, .07, 0], [523, .07, .08], [659, .16, .16]],
  timer: [[660, .12, 0], [660, .12, .22], [880, .2, .44]],
  complete: [[440, .08, 0], [554, .08, .08], [659, .18, .16]]
});

export class GameAudio {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  async unlock() {
    if (!this.enabled || typeof AudioContext === 'undefined') return false;
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context.state === 'running';
  }

  async play(name) {
    if (!this.enabled || typeof AudioContext === 'undefined') return;
    try {
      await this.unlock();
      const pattern = PATTERNS[name] ?? PATTERNS.card;
      const start = this.context.currentTime;
      pattern.forEach(([frequency, duration, delay]) => {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = name === 'dice' ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(frequency, start + delay);
        gain.gain.setValueAtTime(0.0001, start + delay);
        gain.gain.exponentialRampToValueAtTime(0.055, start + delay + .012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + duration);
        oscillator.connect(gain).connect(this.context.destination);
        oscillator.start(start + delay);
        oscillator.stop(start + delay + duration + .02);
      });
    } catch {
      // Audio is atmospheric only. The visual game remains fully usable.
    }
  }
}
