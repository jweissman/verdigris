/**
 * Synth Engine - Core audio synthesis module
 * Testable, modular, and independent of UI
 */

export interface Pattern {
  notes: (Note | null)[];
  duration: number;
  loop: boolean;
}

export interface Note {
  pitch: number; // Hz or MIDI note number
  velocity: number; // 0-127
  gate: number; // Duration in steps
  slide?: number; // Portamento to next note
}

export interface Track {
  channel: number;
  patterns: Pattern[];
  muted: boolean;
  volume: number; // 0-1
  pan: number; // -1 to 1
}

export class SynthEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private tracks: Track[] = [];
  private isPlaying: boolean = false;
  private currentStep: number = 0;
  private bpm: number = 120;
  private stepsPerBeat: number = 4;
  private scheduleAheadTime: number = 0.1;
  private nextStepTime: number = 0;
  private timerID: number | null = null;

  constructor() {}

  init(): void {
    if (typeof window !== "undefined" && !this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
    }
  }

  addTrack(track: Track): number {
    this.tracks.push(track);
    return this.tracks.length - 1;
  }

  synthesize(note: Note, voice: VoicePreset): Float32Array {
    const sampleRate = 44100;
    const duration = (note.gate * 60) / this.bpm / this.stepsPerBeat;
    const numSamples = Math.floor(duration * sampleRate);
    const buffer = new Float32Array(numSamples);

    const omega = (2 * Math.PI * note.pitch) / sampleRate;

    for (let i = 0; i < numSamples; i++) {
      let sample = 0;

      switch (voice.waveform) {
        case "sine":
          sample = Math.sin(omega * i);
          break;
        case "square":
          sample = Math.sin(omega * i) > 0 ? 1 : -1;
          break;
        case "saw":
          sample = 2 * (((i * note.pitch) / sampleRate) % 1) - 1;
          break;
        case "triangle":
          const phase = ((i * note.pitch) / sampleRate) % 1;
          sample = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
          break;
      }

      const env = this.calculateEnvelope(
        i / sampleRate,
        duration,
        voice.envelope,
      );
      sample *= env;

      sample *= note.velocity / 127;

      buffer[i] = sample;
    }

    if (voice.filter) {
      this.applyFilter(buffer, voice.filter, sampleRate);
    }

    return buffer;
  }

  private calculateEnvelope(
    time: number,
    duration: number,
    env: { attack: number; decay: number; sustain: number; release: number },
  ): number {
    if (time < env.attack) {
      return time / env.attack;
    } else if (time < env.attack + env.decay) {
      const decayTime = time - env.attack;
      return 1 - (1 - env.sustain) * (decayTime / env.decay);
    } else if (time < duration - env.release) {
      return env.sustain;
    } else {
      const releaseTime = time - (duration - env.release);
      return env.sustain * (1 - releaseTime / env.release);
    }
  }

  private applyFilter(
    buffer: Float32Array,
    filter: { type: string; cutoff: number; resonance: number },
    sampleRate: number,
  ): void {
    if (filter.type === "lowpass") {
      const rc = 1.0 / (2 * Math.PI * filter.cutoff);
      const dt = 1.0 / sampleRate;
      const alpha = dt / (rc + dt);

      let lastOutput = 0;
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = lastOutput + alpha * (buffer[i] - lastOutput);
        lastOutput = buffer[i];
      }
    }
  }

  play(): void {
    if (!this.audioContext) this.init();

    this.isPlaying = true;
    this.currentStep = 0;
    this.nextStepTime = this.audioContext!.currentTime;
    this.scheduler();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.timerID !== null) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  private scheduler(): void {
    if (!this.isPlaying || !this.audioContext) return;

    while (
      this.nextStepTime <
      this.audioContext.currentTime + this.scheduleAheadTime
    ) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.nextNote();
    }

    this.timerID = setTimeout(() => this.scheduler(), 25) as any;
  }

  private scheduleStep(step: number, time: number): void {
    for (const track of this.tracks) {
      if (track.muted) continue;

      const pattern = this.getCurrentPattern(track, step);
      if (!pattern) continue;

      const noteIndex = step % pattern.notes.length;
      const note = pattern.notes[noteIndex];

      if (note) {
        this.scheduleNote(note, track, time);
      }
    }
  }

  private getCurrentPattern(track: Track, step: number): Pattern | null {
    return track.patterns[0] || null;
  }

  private scheduleNote(note: Note, track: Track, time: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const voice = this.getVoiceForChannel(track.channel);

    const samples = this.synthesize(note, voice);

    const buffer = this.audioContext.createBuffer(1, samples.length, 44100);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) {
      channelData[i] = samples[i];
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = track.volume;

    const panNode = this.audioContext.createStereoPanner();
    panNode.pan.value = track.pan;

    source.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(this.masterGain);

    source.start(time);
  }

  private nextNote(): void {
    const secondsPerStep = 60.0 / (this.bpm * this.stepsPerBeat);
    this.nextStepTime += secondsPerStep;
    this.currentStep++;
  }

  private getVoiceForChannel(channel: number): VoicePreset {
    const voices: VoicePreset[] = [
      {
        waveform: "sine",
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 },
      },
      {
        waveform: "square",
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.1 },
      },
      {
        waveform: "saw",
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
      },
      {
        waveform: "triangle",
        envelope: { attack: 0.001, decay: 0.01, sustain: 0.9, release: 0.05 },
      },
    ];

    return voices[channel % voices.length];
  }

  setNote(
    trackIndex: number,
    patternIndex: number,
    stepIndex: number,
    note: Note | null,
  ): void {
    const track = this.tracks[trackIndex];
    if (!track) return;

    const pattern = track.patterns[patternIndex];
    if (!pattern) return;

    pattern.notes[stepIndex] = note;
  }

  getCurrentPosition(): { bar: number; step: number } {
    const stepsPerBar = 16; // 4/4 time, 16th notes
    return {
      bar: Math.floor(this.currentStep / stepsPerBar),
      step: this.currentStep % stepsPerBar,
    };
  }

  setBPM(bpm: number): void {
    this.bpm = Math.max(60, Math.min(300, bpm));
  }

  getBPM(): number {
    return this.bpm;
  }
}

export interface VoicePreset {
  waveform: "sine" | "square" | "saw" | "triangle";
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  filter?: {
    type: string;
    cutoff: number;
    resonance: number;
  };
}

export class NoteUtils {
  private static noteNames = [
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

  static midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  static nameToMidi(name: string): number {
    const match = name.match(/([A-G]#?)(\d)/);
    if (!match) return 60; // Middle C

    const [, note, octave] = match;
    const noteIndex = this.noteNames.indexOf(note);
    return (parseInt(octave) + 1) * 12 + noteIndex;
  }

  static nameToFreq(name: string): number {
    return this.midiToFreq(this.nameToMidi(name));
  }

  static uarp(root: string, steps: number = 4): Note[] {
    const rootMidi = this.nameToMidi(root);
    const intervals = [0, 4, 7, 12]; // Major arpeggio

    return intervals.slice(0, steps).map((interval) => ({
      pitch: this.midiToFreq(rootMidi + interval),
      velocity: 100,
      gate: 1,
    }));
  }

  static darp(root: string, steps: number = 4): Note[] {
    return this.uarp(root, steps).reverse();
  }

  static parseTrackerNote(notation: string): Note | null {
    if (notation === "---" || notation === "...") return null;

    const parts = notation.split(" ");
    const noteName = parts[0].replace("-", "");

    return {
      pitch: this.nameToFreq(noteName),
      velocity: parseInt(parts[1] || "100"),
      gate: parseFloat(parts[2] || "1"),
    };
  }
}
