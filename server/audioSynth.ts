import type { RegionalLanguage } from '../src/types/podcast';

const SAMPLE_RATE = 11025;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

// Regional scale intervals (in Hz from tonic) for warm meditative broadcast soundscapes
const LANGUAGE_SCALES: Record<RegionalLanguage, { tonic: number; notes: number[] }> = {
  Hindi: { tonic: 196.0, notes: [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2] }, // Bilawal/Yaman warm pentatonic feel
  Tamil: { tonic: 185.0, notes: [1, 16 / 15, 5 / 4, 4 / 3, 3 / 2, 8 / 5, 15 / 8, 2] }, // Mayamalavagowla / Carnatic evening
  Telugu: { tonic: 207.65, notes: [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2] }, // Mohanam pentatonic
  Malayalam: { tonic: 174.61, notes: [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5, 2] }, // Monsoon Kharaharapriya
  Bengali: { tonic: 220.0, notes: [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2] }, // Bhatiali river pentatonic
  Marathi: { tonic: 196.0, notes: [1, 16 / 15, 5 / 4, 4 / 3, 3 / 2, 8 / 5, 2] }, // Natyasangeet Bhairav warmth
  Kannada: { tonic: 207.65, notes: [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 15 / 8, 2] }, // Hamsadhwani / Janapada bright
};

const audioCache = new Map<string, Buffer>();
const MAX_CACHED_STREAMS = 12;

function hashEpisodeId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function getEpisodeWavBuffer(
  episodeId: string,
  language: RegionalLanguage,
  durationSec: number
): Buffer {
  const cached = audioCache.get(episodeId);
  if (cached) {
    return cached;
  }

  const safeDuration = Math.max(20, Math.min(durationSec, 120));
  const numSamples = Math.floor(SAMPLE_RATE * safeDuration);
  const dataSize = numSamples * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF/WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(NUM_CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8), 28);
  buffer.writeUInt16LE(NUM_CHANNELS * (BITS_PER_SAMPLE / 8), 32);
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const scale = LANGUAGE_SCALES[language] || LANGUAGE_SCALES.Hindi;
  const seed = hashEpisodeId(episodeId);
  const patternLen = 8;
  const stepSeconds = 1.25 + ((seed % 5) * 0.15);

  const melodyNotes: number[] = [];
  for (let i = 0; i < patternLen; i++) {
    const idx = (seed + i * 3 + (i % 2)) % scale.notes.length;
    melodyNotes.push(scale.tonic * scale.notes[idx]);
  }

  const droneBase = scale.tonic * 0.5;
  const droneFifth = droneBase * 1.5;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    // Gentle fade in (1.2s) and fade out (1.5s)
    const fadeIn = Math.min(1, t / 1.2);
    const fadeOut = Math.min(1, (safeDuration - t) / 1.5);
    const masterEnv = Math.max(0, Math.min(fadeIn, fadeOut));

    // Warm tanpura-like drone (fundamental + soft fifth)
    const droneLfo = 0.78 + 0.22 * Math.sin(2 * Math.PI * 0.16 * t);
    const drone =
      (Math.sin(2 * Math.PI * droneBase * t) * 0.26 +
        Math.sin(2 * Math.PI * droneFifth * t) * 0.16 +
        Math.sin(2 * Math.PI * scale.tonic * t) * 0.1) *
      droneLfo;

    // Plucked melodic motif synced to stepSeconds
    const stepIndex = Math.floor(t / stepSeconds) % patternLen;
    const stepPos = t % stepSeconds;
    const freq = melodyNotes[stepIndex];
    const pluckEnv = Math.exp(-stepPos * 2.8) * Math.min(1, stepPos / 0.035);
    const melody =
      (Math.sin(2 * Math.PI * freq * t) * 0.34 +
        Math.sin(2 * Math.PI * freq * 2 * t) * 0.08) *
      pluckEnv;

    // Subtle chapter transition chime every quarter
    const quarter = safeDuration / 4;
    const nearChapter = t % quarter;
    const chimeEnv = nearChapter < 1.4 ? Math.exp(-nearChapter * 3.2) * Math.min(1, nearChapter / 0.02) : 0;
    const chime = Math.sin(2 * Math.PI * (scale.tonic * 2) * t) * 0.22 * chimeEnv;

    const sampleFloat = (drone + melody + chime) * masterEnv * 0.45;
    const clamped = Math.max(-1, Math.min(1, sampleFloat));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  if (audioCache.size >= MAX_CACHED_STREAMS) {
    const oldestKey = audioCache.keys().next().value;
    if (oldestKey) {
      audioCache.delete(oldestKey);
    }
  }
  audioCache.set(episodeId, buffer);

  return buffer;
}
