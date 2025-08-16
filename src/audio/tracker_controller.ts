/**
 * TrackerController - Coordinates between UI, AudioWorkstation, and VoiceSynthesizer
 * This is the main controller that the HTML interface will use
 */

import { AudioWorkstation, Pattern, Note, Channel } from "./audio_workstation";
import { VoiceSynthesizer } from "./voice_synthesizer";

export interface TrackerState {
  currentPattern: Pattern | null;
  selectedCell: { channel: number; step: number };
  isPlaying: boolean;
  bpm: number;
  patternBank: Pattern[];
}

export interface TrackerCallbacks {
  onStateChange?: (state: TrackerState) => void;
  onStepChange?: (step: number) => void;
  onNotePlay?: (channel: number, note: Note) => void;
}

export class TrackerController {
  private workstation: AudioWorkstation;
  private synthesizer: VoiceSynthesizer;
  private selectedCell = { channel: 0, step: 0 };
  private callbacks: TrackerCallbacks = {};

  constructor() {
    this.workstation = new AudioWorkstation();
    this.synthesizer = new VoiceSynthesizer();
  }

  init(callbacks?: TrackerCallbacks): void {
    this.callbacks = callbacks || {};
    this.synthesizer.init();
    this.notifyStateChange();
  }

  createPattern(name: string, length: number = 16): void {
    const pattern = this.workstation.createPattern(name, length);
    this.workstation.loadPattern(pattern.id);
    this.notifyStateChange();
  }

  loadPattern(id: string): boolean {
    const success = this.workstation.loadPattern(id);
    if (success) {
      this.notifyStateChange();
    }
    return success;
  }

  clearPattern(): void {
    this.workstation.clearPattern();
    this.notifyStateChange();
  }

  deletePattern(id: string): boolean {
    const success = this.workstation.deletePattern(id);
    if (success) {
      this.notifyStateChange();
    }
    return success;
  }

  setNote(channel: number, step: number, noteString: string | null): void {
    let note: Note | null = null;

    if (noteString && noteString !== "---" && noteString !== "...") {
      const match = noteString.match(
        /^([A-G][#b]?(?:m|maj7?|m7|dim|aug|sus[24]|7|9)?(?:\d)?)$/,
      );
      if (match) {
        note = {
          pitch: noteString,
          velocity: 0.8,
          gate: 1,
        };
      }
    }

    this.workstation.setNote(channel, step, note);
    this.notifyStateChange();
  }

  getNote(channel: number, step: number): string {
    const note = this.workstation.getNote(channel, step);
    return note ? note.pitch : "---";
  }

  selectCell(channel: number, step: number): void {
    const pattern = this.workstation.getCurrentPattern();
    if (!pattern) return;

    this.selectedCell.channel = Math.max(
      0,
      Math.min(pattern.channels.length - 1, channel),
    );
    this.selectedCell.step = Math.max(0, Math.min(pattern.length - 1, step));
    this.notifyStateChange();
  }

  moveSelection(deltaChannel: number, deltaStep: number): void {
    const pattern = this.workstation.getCurrentPattern();
    if (!pattern) return;

    this.selectedCell.channel = Math.max(
      0,
      Math.min(
        pattern.channels.length - 1,
        this.selectedCell.channel + deltaChannel,
      ),
    );
    this.selectedCell.step = Math.max(
      0,
      Math.min(pattern.length - 1, this.selectedCell.step + deltaStep),
    );

    this.notifyStateChange();
  }

  getSelectedCell(): { channel: number; step: number } {
    return { ...this.selectedCell };
  }

  play(): void {
    this.workstation.play(
      (step) => {
        if (this.callbacks.onStepChange) {
          this.callbacks.onStepChange(step);
        }
      },
      (channel, note) => {
        this.playNoteFromChannel(channel, note);

        const pattern = this.workstation.getCurrentPattern();
        if (pattern && this.callbacks.onNotePlay) {
          const channelIndex = pattern.channels.indexOf(channel);
          this.callbacks.onNotePlay(channelIndex, note);
        }
      },
    );

    this.notifyStateChange();
  }

  stop(): void {
    this.workstation.stop();
    this.notifyStateChange();
  }

  setBPM(bpm: number): void {
    this.workstation.setBPM(bpm);
    this.notifyStateChange();
  }

  previewNote(channel: number, noteString: string): void {
    const pattern = this.workstation.getCurrentPattern();
    if (!pattern || !pattern.channels[channel]) return;

    const channelConfig = pattern.channels[channel];

    let frequencies: number | number[];

    const chordNotes = AudioWorkstation.parseChord(noteString);
    if (chordNotes) {
      frequencies = chordNotes.map((note) =>
        AudioWorkstation.noteToFrequency(note, 4),
      );
    } else {
      const match = noteString.match(/^([A-G][#b]?)(\d)$/);
      if (match) {
        const [, note, octave] = match;
        frequencies = AudioWorkstation.noteToFrequency(note, parseInt(octave));
      } else {
        return; // Invalid note
      }
    }

    this.synthesizer.playNote(
      channelConfig.voice,
      frequencies,
      0.2,
      channelConfig.id,
    );
  }

  setChannelVoice(channel: number, voice: string): void {
    const validVoices = ["choir", "bass", "pluck", "lead", "pad"];
    if (validVoices.includes(voice)) {
      this.workstation.setChannelVoice(channel, voice as any);
      this.notifyStateChange();
    }
  }

  setChannelMute(channel: number, muted: boolean): void {
    const pattern = this.workstation.getCurrentPattern();
    if (pattern && pattern.channels[channel]) {
      pattern.channels[channel].muted = muted;
      this.notifyStateChange();
    }
  }

  setChannelSolo(channel: number, solo: boolean): void {
    const pattern = this.workstation.getCurrentPattern();
    if (pattern && pattern.channels[channel]) {
      pattern.channels[channel].solo = solo;
      this.notifyStateChange();
    }
  }

  getPatternBank(): Pattern[] {
    return this.workstation.getPatternBank();
  }

  exportPattern(): string | null {
    const pattern = this.workstation.getCurrentPattern();
    if (!pattern) return null;
    return this.workstation.exportPattern(pattern.id);
  }

  importPattern(json: string): boolean {
    const success = this.workstation.importPattern(json);
    if (success) {
      this.notifyStateChange();
    }
    return success;
  }

  getState(): TrackerState {
    const playbackState = this.workstation.getPlaybackState();

    return {
      currentPattern: this.workstation.getCurrentPattern(),
      selectedCell: { ...this.selectedCell },
      isPlaying: playbackState.playing,
      bpm: playbackState.bpm,
      patternBank: this.workstation.getPatternBank(),
    };
  }

  private playNoteFromChannel(channel: Channel, note: Note): void {
    let frequencies: number | number[];

    const chordNotes = AudioWorkstation.parseChord(note.pitch);
    if (chordNotes) {
      frequencies = chordNotes.map((n) => {
        const octaveMatch = note.pitch.match(/(\d)$/);
        const octave = octaveMatch ? parseInt(octaveMatch[1]) : 4;
        return AudioWorkstation.noteToFrequency(n, octave);
      });
    } else {
      const match = note.pitch.match(/^([A-G][#b]?)(\d)$/);
      if (match) {
        const [, noteName, octave] = match;
        frequencies = AudioWorkstation.noteToFrequency(
          noteName,
          parseInt(octave),
        );
      } else {
        return; // Invalid note
      }
    }

    const stepTime = 60 / (this.workstation.getBPM() * 4);
    const duration = stepTime * note.gate;

    this.synthesizer.playNote(channel.voice, frequencies, duration, channel.id);
  }

  private notifyStateChange(): void {
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(this.getState());
    }
  }

  dispose(): void {
    this.workstation.stop();
    this.synthesizer.dispose();
  }
}
