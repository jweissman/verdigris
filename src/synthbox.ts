/**
 * Synthbox - A simple, mathematically pure sound synthesis engine
 * Four channels: Choir, Pluck/Bass, Lead/Guitar, Texture/Foley
 */
import { Simulator } from "./core/simulator";

export class Oscillator {
  constructor(public type: "sine" | "square" | "saw" | "triangle" = "sine") {}

  generate(
    frequency: number,
    numSamples: number,
    sampleRate: number = 44100,
  ): Float32Array {
    const samples = new Float32Array(numSamples);
    const period = sampleRate / frequency;

    for (let i = 0; i < numSamples; i++) {
      const phase = (i % period) / period; // 0 to 1

      switch (this.type) {
        case "sine":
          samples[i] = Math.sin(phase * 2 * Math.PI);
          break;

        case "square":
          samples[i] = phase < 0.5 ? 1 : -1;
          break;

        case "saw":
          samples[i] = 2 * phase - 1;
          break;

        case "triangle":
          samples[i] = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
          break;
      }
    }

    return samples;
  }

  generateWithEnvelope(
    frequency: number,
    numSamples: number,
    sampleRate: number = 44100,
    envelope: {
      attack: number;
      decay: number;
      sustain: number;
      release: number;
    },
  ): Float32Array {
    const raw = this.generate(frequency, numSamples, sampleRate);
    const output = new Float32Array(numSamples);

    const attackSamples = Math.floor(envelope.attack * sampleRate);
    const decaySamples = Math.floor(envelope.decay * sampleRate);
    const releaseSamples = Math.floor(envelope.release * sampleRate);
    const sustainSamples =
      numSamples - attackSamples - decaySamples - releaseSamples;

    let sampleIndex = 0;

    for (
      let i = 0;
      i < attackSamples && sampleIndex < numSamples;
      i++, sampleIndex++
    ) {
      const attackLevel = i / attackSamples;
      output[sampleIndex] = raw[sampleIndex] * attackLevel;
    }

    for (
      let i = 0;
      i < decaySamples && sampleIndex < numSamples;
      i++, sampleIndex++
    ) {
      const decayLevel = 1 - (1 - envelope.sustain) * (i / decaySamples);
      output[sampleIndex] = raw[sampleIndex] * decayLevel;
    }

    for (
      let i = 0;
      i < sustainSamples && sampleIndex < numSamples;
      i++, sampleIndex++
    ) {
      output[sampleIndex] = raw[sampleIndex] * envelope.sustain;
    }

    for (
      let i = 0;
      i < releaseSamples && sampleIndex < numSamples;
      i++, sampleIndex++
    ) {
      const releaseLevel = envelope.sustain * (1 - i / releaseSamples);
      output[sampleIndex] = raw[sampleIndex] * releaseLevel;
    }

    return output;
  }
}

export class Note {
  private static noteFreqs: Record<string, number> = {
    C: 261.63,
    "C#": 277.18,
    Db: 277.18,
    D: 293.66,
    "D#": 311.13,
    Eb: 311.13,
    E: 329.63,
    F: 349.23,
    "F#": 369.99,
    Gb: 369.99,
    G: 392.0,
    "G#": 415.3,
    Ab: 415.3,
    A: 440.0,
    "A#": 466.16,
    Bb: 466.16,
    B: 493.88,
  };

  static toFreq(note: string): number {
    const match = note.match(/([A-G]#?)(\d)/);
    if (!match) return 440; // Default to A4

    const [, noteName, octaveStr] = match;
    const octave = parseInt(octaveStr);
    const baseFreq = this.noteFreqs[noteName] || 440;

    const octaveShift = octave - 4;
    return baseFreq * Math.pow(2, octaveShift);
  }

  static parseChord(chord: string): string[] {
    const root = chord.match(/^[A-G]#?/)?.[0] || "C";
    const quality = chord.slice(root.length);

    const intervals: Record<string, number[]> = {
      "": [0, 4, 7], // Major
      m: [0, 3, 7], // Minor
      maj7: [0, 4, 7, 11], // Major 7th
      m7: [0, 3, 7, 10], // Minor 7th
      "7": [0, 4, 7, 10], // Dominant 7th
      dim: [0, 3, 6], // Diminished
      aug: [0, 4, 8], // Augmented
    };

    const notes = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    const rootIndex = notes.indexOf(root);
    const chordIntervals = intervals[quality] || intervals[""];

    return chordIntervals.map((interval) => notes[(rootIndex + interval) % 12]);
  }
}

export interface VoiceConfig {
  waveform: "sine" | "square" | "saw" | "triangle";
  harmonics: number[]; // Harmonic amplitudes [1, 0.5, 0.3...]
  detune: number; // Cents of detuning for richness
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  filter?: {
    type: "lowpass" | "highpass";
    cutoff: number; // Hz
    resonance: number; // 0-1
  };
  effects?: {
    chorus?: number; // 0-1 wet amount
    distortion?: number; // 0-1 amount
    noise?: number; // 0-1 noise mix
  };
}

export const VoicePresets: Record<string, VoiceConfig> = {
  choir: {
    waveform: "sine",
    harmonics: [1, 0.3, 0.15, 0.1, 0.05],
    detune: 15, // Slight detuning for ensemble
    envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.3 },
    effects: { chorus: 0.6 },
  },
  pluck: {
    waveform: "triangle",
    harmonics: [1, 0.5, 0.2],
    detune: 0,
    envelope: { attack: 0.001, decay: 0.5, sustain: 0.1, release: 0.1 },
    filter: { type: "lowpass", cutoff: 2000, resonance: 0.3 },
  },
  lead: {
    waveform: "saw",
    harmonics: [1, 0.7, 0.5, 0.3, 0.2],
    detune: 3,
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 0.2 },
    filter: { type: "lowpass", cutoff: 3000, resonance: 0.5 },
    effects: { distortion: 0.3 },
  },
  texture: {
    waveform: "square",
    harmonics: [1, 0, 0.3, 0, 0.2], // Odd harmonics
    detune: 50, // Heavy detuning for texture
    envelope: { attack: 0.001, decay: 0.01, sustain: 0.5, release: 0.05 },
    effects: { noise: 0.2, chorus: 0.3 },
  },
};

export class Channel {
  voice: string = "sine";
  voiceConfig: VoiceConfig = VoicePresets.choir;
  reverb: number = 0;
  private oscillator: Oscillator = new Oscillator("sine");
  private sampleRate: number = 44100;

  setVoice(voice: string): void {
    this.voice = voice;
    this.voiceConfig = VoicePresets[voice] || VoicePresets.choir;
    this.oscillator = new Oscillator(this.voiceConfig.waveform);
  }

  generate(note: string | number, numSamples: number): Float32Array {
    const freq = typeof note === "string" ? Note.toFreq(note) : note;

    let samples = this.oscillator.generateWithEnvelope(
      freq,
      numSamples,
      this.sampleRate,
      this.voiceConfig.envelope,
    );

    if (this.voice === "choir") {
      const detune1 = this.oscillator.generate(
        freq * 1.01,
        numSamples,
        this.sampleRate,
      );
      const detune2 = this.oscillator.generate(
        freq * 0.99,
        numSamples,
        this.sampleRate,
      );

      for (let i = 0; i < numSamples; i++) {
        samples[i] = (samples[i] + detune1[i] * 0.3 + detune2[i] * 0.3) / 1.6;
      }
    } else if (this.voice === "texture") {
      for (let i = 0; i < numSamples; i++) {
        samples[i] = samples[i] * 0.7 + (Simulator.rng.random() - 0.5) * 0.1;
      }
    }

    if (this.reverb > 0) {
      samples = this.applyReverb(samples, this.reverb);
    }

    return samples;
  }

  private applyReverb(samples: Float32Array, wetness: number): Float32Array {
    const output = new Float32Array(samples.length);

    const delayTime = 0.03; // 30ms delay
    const delaySamples = Math.floor(delayTime * this.sampleRate);
    const decay = 0.7;

    for (let i = 0; i < samples.length; i++) {
      output[i] = samples[i] * (1 - wetness);
    }

    for (let i = 0; i < samples.length; i++) {
      for (let tap = 1; tap <= 8; tap++) {
        const delayIndex = i - delaySamples * tap;
        if (delayIndex >= 0) {
          const reverbSample =
            samples[delayIndex] * Math.pow(decay, tap) * wetness;
          output[i] += reverbSample;

          const feedForward = i + Math.floor(delaySamples * 0.5);
          if (feedForward < samples.length) {
            output[feedForward] += reverbSample * 0.3;
          }
        }
      }
    }

    return output;
  }
}

export class Synthbox {
  private channels: Channel[] = [
    new Channel(),
    new Channel(),
    new Channel(),
    new Channel(),
  ];

  channel(index: number): Channel {
    return this.channels[index];
  }

  sequence(notes: Array<{ note: string | null; duration: number }>): any[] {
    return notes; // Simple passthrough for now
  }

  mixHarmonics(frequencies: number[], amplitudes: number[]): Float32Array {
    const numSamples = 1000;
    const output = new Float32Array(numSamples);
    const osc = new Oscillator("sine");

    for (let i = 0; i < frequencies.length; i++) {
      const harmonic = osc.generate(frequencies[i], numSamples);
      const amplitude = amplitudes[i] || 1;

      for (let j = 0; j < numSamples; j++) {
        output[j] += harmonic[j] * amplitude;
      }
    }

    const maxAmp = Math.max(...output.map(Math.abs));
    if (maxAmp > 0) {
      for (let i = 0; i < numSamples; i++) {
        output[i] /= maxAmp;
      }
    }

    return output;
  }

  play(pattern: string): void {
    const tracks = pattern.split("/").map((t) => t.trim());

    for (const track of tracks) {
      const [channelName, ...notes] = track.split(":").map((s) => s.trim());
      const channelIndex = this.getChannelIndex(channelName);

      if (channelIndex >= 0) {
        for (const note of notes.join(" ").split(" ")) {
          if (note === "rest") {
          } else if (note.includes("m") || note.includes("maj")) {
            const chordNotes = Note.parseChord(note);
          } else {
          }
        }
      }
    }
  }

  private getChannelIndex(name: string): number {
    const channelMap: Record<string, number> = {
      choir: 0,
      bass: 1,
      pluck: 1,
      lead: 2,
      guitar: 2,
      texture: 3,
      foley: 3,
    };
    return channelMap[name.toLowerCase()] ?? -1;
  }
}
