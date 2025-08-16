/**
 * AudioWorkstation - Core DAW functionality
 * Manages patterns, sequencing, and synthesis coordination
 */

export interface Note {
  pitch: string; // Note name (C4, Am, etc)
  velocity: number;
  gate: number; // Duration in steps
}

export interface Pattern {
  id: string;
  name: string;
  length: number;
  channels: Channel[];
}

export interface Channel {
  id: string;
  voice: VoiceType;
  notes: (Note | null)[];
  muted: boolean;
  solo: boolean;
  volume: number;
}

export type VoiceType = "choir" | "bass" | "pluck" | "lead" | "pad";

export interface PlaybackState {
  playing: boolean;
  position: number;
  pattern: string;
  bpm: number;
}

export class AudioWorkstation {
  private patterns: Map<string, Pattern> = new Map();
  private currentPatternId: string = "";
  private playbackState: PlaybackState = {
    playing: false,
    position: 0,
    pattern: "",
    bpm: 120,
  };

  private playbackTimer: any = null;
  private onStepCallback?: (step: number) => void;
  private onPlayCallback?: (channel: Channel, note: Note) => void;
  private patternCounter: number = 0;

  constructor() {
    this.initializeDefaultPattern();
  }

  private initializeDefaultPattern(): void {
    const pattern = this.createPattern("default", 16);
    this.patterns.set(pattern.id, pattern);
    this.currentPatternId = pattern.id;
  }

  createPattern(
    name: string,
    length: number = 16,
    channels: number = 4,
  ): Pattern {
    const id = `pattern-${Date.now()}-${this.patternCounter++}`;
    const pattern: Pattern = {
      id,
      name,
      length,
      channels: [],
    };

    const voices: VoiceType[] = ["choir", "bass", "pluck", "lead"];
    for (let i = 0; i < channels; i++) {
      pattern.channels.push({
        id: `channel-${i}`,
        voice: voices[i % voices.length],
        notes: new Array(length).fill(null),
        muted: false,
        solo: false,
        volume: 0.8,
      });
    }

    this.patterns.set(id, pattern);

    return pattern;
  }

  loadPattern(id: string): boolean {
    if (this.patterns.has(id)) {
      this.currentPatternId = id;
      this.playbackState.pattern = id;
      return true;
    }
    return false;
  }

  getCurrentPattern(): Pattern | null {
    return this.patterns.get(this.currentPatternId) || null;
  }

  setNote(channelIndex: number, stepIndex: number, note: Note | null): boolean {
    const pattern = this.getCurrentPattern();
    if (!pattern) return false;

    const channel = pattern.channels[channelIndex];
    if (!channel || stepIndex < 0 || stepIndex >= pattern.length) {
      return false;
    }

    channel.notes[stepIndex] = note;
    return true;
  }

  getNote(channelIndex: number, stepIndex: number): Note | null {
    const pattern = this.getCurrentPattern();
    if (!pattern) return null;

    const channel = pattern.channels[channelIndex];
    if (!channel || stepIndex < 0 || stepIndex >= pattern.length) {
      return null;
    }

    return channel.notes[stepIndex];
  }

  setChannelVoice(channelIndex: number, voice: VoiceType): boolean {
    const pattern = this.getCurrentPattern();
    if (!pattern) return false;

    const channel = pattern.channels[channelIndex];
    if (!channel) return false;

    channel.voice = voice;
    return true;
  }

  clearPattern(): void {
    const pattern = this.getCurrentPattern();
    if (!pattern) return;

    pattern.channels.forEach((channel) => {
      channel.notes = new Array(pattern.length).fill(null);
    });
  }

  copyPattern(sourceId: string, targetId: string): boolean {
    const source = this.patterns.get(sourceId);
    if (!source) return false;

    const copy = JSON.parse(JSON.stringify(source));
    copy.id = targetId;
    copy.name = `${source.name} (copy)`;

    this.patterns.set(targetId, copy);
    return true;
  }

  play(
    onStep?: (step: number) => void,
    onPlay?: (channel: Channel, note: Note) => void,
  ): void {
    if (this.playbackState.playing) return;

    this.onStepCallback = onStep;
    this.onPlayCallback = onPlay;
    this.playbackState.playing = true;
    this.playbackState.position = 0;

    this.scheduleNextStep();
  }

  stop(): void {
    this.playbackState.playing = false;
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  private scheduleNextStep(): void {
    if (!this.playbackState.playing) return;

    const pattern = this.getCurrentPattern();
    if (!pattern) return;

    if (this.onStepCallback) {
      this.onStepCallback(this.playbackState.position);
    }

    pattern.channels.forEach((channel) => {
      if (channel.muted) return;

      const note = channel.notes[this.playbackState.position];
      if (note && this.onPlayCallback) {
        const hasSolo = pattern.channels.some((ch) => ch.solo);
        if (!hasSolo || channel.solo) {
          this.onPlayCallback(channel, note);
        }
      }
    });

    this.playbackState.position =
      (this.playbackState.position + 1) % pattern.length;

    const stepTime = 60000 / (this.playbackState.bpm * 4); // 16th notes
    this.playbackTimer = setTimeout(() => this.scheduleNextStep(), stepTime);
  }

  setBPM(bpm: number): void {
    this.playbackState.bpm = Math.max(60, Math.min(240, bpm));
  }

  getBPM(): number {
    return this.playbackState.bpm;
  }

  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  getPatternBank(): Pattern[] {
    return Array.from(this.patterns.values());
  }

  deletePattern(id: string): boolean {
    if (id === this.currentPatternId) return false; // Can't delete current
    if (!this.patterns.has(id)) return false;
    return this.patterns.delete(id);
  }

  exportPattern(id: string): string | null {
    const pattern = this.patterns.get(id);
    if (!pattern) return null;

    return JSON.stringify(pattern, null, 2);
  }

  importPattern(json: string): boolean {
    try {
      const pattern = JSON.parse(json) as Pattern;
      if (!pattern.id || !pattern.channels) return false;

      this.patterns.set(pattern.id, pattern);
      return true;
    } catch {
      return false;
    }
  }

  static parseChord(chord: string): string[] | null {
    let bassNote: string | null = null;
    let mainChord = chord;
    if (chord.includes("/")) {
      const parts = chord.split("/");
      mainChord = parts[0];
      bassNote = parts[1];
    }

    const intervals: Record<string, number[]> = {
      "": [0, 4, 7],
      m: [0, 3, 7],
      "7": [0, 4, 7, 10],
      maj7: [0, 4, 7, 11],
      maj9: [0, 4, 7, 11, 14],
      m7: [0, 3, 7, 10],
      m9: [0, 3, 7, 10, 14],
      dim: [0, 3, 6],
      aug: [0, 4, 8],
      sus2: [0, 2, 7],
      sus4: [0, 5, 7],
      "7sus4": [0, 5, 7, 10],
      "9": [0, 4, 7, 10, 14],
      "6": [0, 4, 7, 9],
      m6: [0, 3, 7, 9],
      add9: [0, 4, 7, 14],
    };

    const match = mainChord.match(
      /^([A-G][#b]?)(m|maj[79]?|m[679]|dim|aug|sus[24]|7sus4|7|9|6|add9)?$/,
    );
    if (!match) return null;

    const [, root, quality = ""] = match;
    const chordIntervals = intervals[quality];
    if (!chordIntervals) return null;

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
    let rootIndex = notes.indexOf(root.replace("b", ""));

    if (root.includes("b") && rootIndex > 0) {
      rootIndex--;
    }

    const chordNotes = chordIntervals.map((interval) => {
      const noteIndex = (rootIndex + interval) % 12;
      return notes[noteIndex];
    });

    if (bassNote) {
      const bassIndex = notes.indexOf(bassNote.replace("b", ""));
      if (bassIndex >= 0) {
        chordNotes.unshift(notes[bassIndex]);
      }
    }

    return chordNotes;
  }

  static noteToFrequency(note: string, octave: number = 4): number {
    const noteFrequencies: Record<string, number> = {
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

    const baseFreq = noteFrequencies[note];
    if (!baseFreq) return 0;

    return baseFreq * Math.pow(2, octave - 4);
  }
}
