/**
 * Lightweight, dependency-free sound effects synthesized with the Web Audio API
 * (no asset files). Each cue layers a couple of short oscillator envelopes and
 * randomizes pitch/timing slightly so repeated plays don't sound identical.
 */
export class SfxEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;

  /** Creates (or resumes) the AudioContext. Must be called from a user-gesture handler. */
  unlock(): void {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    this.context = new Ctor();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 1;
    this.masterGain.connect(this.context.destination);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 1;
  }

  private tone(
    freq: number,
    duration: number,
    options: { type?: OscillatorType; gain?: number; delay?: number; freqEnd?: number } = {},
  ): void {
    if (!this.context || !this.masterGain) return;
    const { type = 'sine', gain = 0.25, delay = 0, freqEnd } = options;

    const start = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const envelope = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), start + duration);

    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(gain, start + Math.min(0.015, duration * 0.3));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(envelope);
    envelope.connect(this.masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private jitter(value: number, amount: number): number {
    return value * (1 + (Math.random() * 2 - 1) * amount);
  }

  /** A short upward blip on launch; pitch scales gently with pull power. */
  playJump(power: number): void {
    this.tone(this.jitter(320 + power * 140, 0.08), 0.1, { type: 'triangle', gain: 0.16 });
  }

  /** A soft, low thump on a routine landing — deliberately subtle (see playSplash for contrast). */
  playLand(): void {
    this.tone(this.jitter(150, 0.1), 0.08, { type: 'sine', gain: 0.14, freqEnd: 90 });
  }

  /** A cheerful blip that rises in pitch with the combo level, for escalating feedback. */
  playCatch(combo: number): void {
    const base = this.jitter(520 + combo * 60, 0.06);
    this.tone(base, 0.09, { type: 'square', gain: 0.14 });
    this.tone(base * 1.5, 0.09, { type: 'sine', gain: 0.1, delay: 0.05 });
  }

  /** A bigger, descending failure tone — real consequences should stand out from routine actions. */
  playSplash(): void {
    this.tone(this.jitter(260, 0.08), 0.4, { type: 'sawtooth', gain: 0.22, freqEnd: 60 });
    this.tone(this.jitter(140, 0.08), 0.35, { type: 'sine', gain: 0.18, freqEnd: 40, delay: 0.04 });
  }

  /** A short rising two-note fanfare for distance milestones. */
  playMilestone(): void {
    this.tone(this.jitter(440, 0.04), 0.12, { type: 'triangle', gain: 0.16 });
    this.tone(this.jitter(660, 0.04), 0.16, { type: 'triangle', gain: 0.18, delay: 0.1 });
  }
}
