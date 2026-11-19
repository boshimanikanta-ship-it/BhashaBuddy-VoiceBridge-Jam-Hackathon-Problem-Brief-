import type { RegionalLanguage } from '../types/podcast';

const TONIC_MAP: Record<RegionalLanguage, number> = {
  Hindi: 196.0,
  Tamil: 185.0,
  Telugu: 207.65,
  Malayalam: 174.61,
  Bengali: 220.0,
  Marathi: 196.0,
  Kannada: 207.65,
};

export class WebAudioFallbackPlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private pulseTimer: number | null = null;
  private tickTimer: number | null = null;
  private currentTime = 0;
  private duration = 75;
  private speed = 1;
  private volume = 0.8;
  private running = false;
  private onTick?: (time: number) => void;
  private onEnded?: () => void;

  public start(options: {
    language: RegionalLanguage;
    durationSec: number;
    startAtSec: number;
    volume: number;
    speed: number;
    onTick: (time: number) => void;
    onEnded: () => void;
  }) {
    this.stop();

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.volume = options.volume;
    this.speed = options.speed;
    this.duration = Math.max(10, options.durationSec);
    this.currentTime = Math.min(options.startAtSec, this.duration - 1);
    this.onTick = options.onTick;
    this.onEnded = options.onEnded;

    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.volume * 0.14), this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    const tonic = TONIC_MAP[options.language] || 196.0;
    this.osc1 = this.ctx.createOscillator();
    this.osc2 = this.ctx.createOscillator();
    this.osc1.type = 'sine';
    this.osc2.type = 'triangle';
    this.osc1.frequency.setValueAtTime(tonic * 0.5, this.ctx.currentTime);
    this.osc2.frequency.setValueAtTime(tonic * 0.75, this.ctx.currentTime);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.osc2.connect(subGain);
    subGain.connect(this.masterGain);
    this.osc1.connect(this.masterGain);

    this.osc1.start();
    this.osc2.start();
    this.running = true;

    const scale = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];
    let noteStep = 0;

    this.pulseTimer = window.setInterval(() => {
      if (!this.ctx || !this.masterGain || !this.running) return;
      const chime = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      const ratio = scale[noteStep % scale.length];
      noteStep += 1;

      chime.type = 'sine';
      chime.frequency.setValueAtTime(tonic * ratio, this.ctx.currentTime);
      chimeGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.18, this.ctx.currentTime + 0.05);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.1);

      chime.connect(chimeGain);
      chimeGain.connect(this.masterGain);
      chime.start();
      chime.stop(this.ctx.currentTime + 1.15);
    }, Math.max(450, 1350 / this.speed));

    this.tickTimer = window.setInterval(() => {
      if (!this.running) return;
      this.currentTime += 0.25 * this.speed;
      if (this.currentTime >= this.duration) {
        this.currentTime = this.duration;
        this.onTick?.(this.currentTime);
        this.stop();
        this.onEnded?.();
        return;
      }
      this.onTick?.(this.currentTime);
    }, 250);
  }

  public setVolume(vol: number) {
    this.volume = vol;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(Math.max(0.0001, vol * 0.14), this.ctx.currentTime, 0.05);
    }
  }

  public setSpeed(speed: number) {
    this.speed = speed;
  }

  public seek(sec: number) {
    this.currentTime = Math.max(0, Math.min(sec, this.duration));
    this.onTick?.(this.currentTime);
  }

  public stop() {
    this.running = false;
    if (this.pulseTimer !== null) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    try {
      this.osc1?.stop();
      this.osc2?.stop();
      this.ctx?.close();
    } catch {
      // Ignore already-closed AudioContext
    }
    this.osc1 = null;
    this.osc2 = null;
    this.masterGain = null;
    this.ctx = null;
  }
}
