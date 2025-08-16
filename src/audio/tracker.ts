/**
 * Tracker - Pattern-based music sequencer
 * Clean separation from synth engine
 */

import { SynthEngine, Pattern, Track, Note, NoteUtils } from "./synth_engine";

export interface TrackerPattern {
  id: string;
  name: string;
  length: number; // Steps
  tracks: TrackerTrack[];
}

export interface TrackerTrack {
  channel: number;
  notes: (TrackerNote | null)[];
  effects: TrackerEffect[];
}

export interface TrackerNote {
  note: string; // "C-4", "F#5", "---"
  instrument: number; // 0-255
  volume?: number; // 0-64 or ".."
  effect?: string; // "S10" (slide), "V40" (vibrato), etc
}

export interface TrackerEffect {
  type: "volume" | "pan" | "slide" | "vibrato" | "retrig";
  value: number;
  position: number; // Step position
}

export class Tracker {
  private engine: SynthEngine;
  private patterns: Map<string, TrackerPattern> = new Map();
  private currentPattern: string | null = null;
  private songOrder: string[] = [];
  private songPosition: number = 0;

  constructor(engine?: SynthEngine) {
    this.engine = engine || new SynthEngine();
  }

  loadPattern(text: string): TrackerPattern {
    const lines = text.trim().split("\n");
    const header = lines[0];
    const [id, name, lengthStr] = header.split(":");
    const length = parseInt(lengthStr) || 16;

    const pattern: TrackerPattern = {
      id,
      name,
      length,
      tracks: [],
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const track = this.parseTrackLine(line, length);
      pattern.tracks.push(track);
    }

    this.patterns.set(id, pattern);
    return pattern;
  }

  private parseTrackLine(line: string, length: number): TrackerTrack {
    const parts = line.split("|");
    const channel = parseInt(parts[0]) || 0;
    const noteData = parts[1].trim().split(/\s+/);

    const track: TrackerTrack = {
      channel,
      notes: [],
      effects: [],
    };

    for (let i = 0; i < length; i++) {
      const noteStr = noteData[i] || "---";

      if (noteStr === "---" || noteStr === "...") {
        track.notes.push(null);
      } else {
        const [note, inst, vol, fx] = noteStr.split(":");
        track.notes.push({
          note,
          instrument: parseInt(inst) || 0,
          volume: vol ? parseInt(vol) : undefined,
          effect: fx,
        });
      }
    }

    return track;
  }

  private convertToEnginePattern(trackerPattern: TrackerPattern): Pattern[] {
    return trackerPattern.tracks.map((track) => {
      const notes: (Note | null)[] = track.notes.map((trackerNote) => {
        if (!trackerNote) return null;

        return {
          pitch: NoteUtils.nameToFreq(trackerNote.note),
          velocity: trackerNote.volume ? trackerNote.volume * 2 : 100,
          gate: 1,
          slide: trackerNote.effect?.startsWith("S")
            ? parseInt(trackerNote.effect.slice(1))
            : undefined,
        };
      });

      return {
        notes,
        duration: 125, // Default 16th note at 120 BPM
        loop: false,
      };
    });
  }

  playPattern(patternId: string): void {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    this.engine = new SynthEngine();

    const enginePatterns = this.convertToEnginePattern(pattern);

    pattern.tracks.forEach((trackerTrack, i) => {
      const track: Track = {
        channel: trackerTrack.channel,
        patterns: [enginePatterns[i]],
        muted: false,
        volume: 0.8,
        pan: 0,
      };

      this.engine.addTrack(track);
    });

    this.currentPattern = patternId;
    this.engine.play();
  }

  stop(): void {
    this.engine.stop();
  }

  static parsePatternDSL(dsl: string): TrackerPattern {
    const tracks = dsl.split("/").map((t) => t.trim());
    const pattern: TrackerPattern = {
      id: "dsl_" + Date.now(),
      name: "DSL Pattern",
      length: 16,
      tracks: [],
    };

    tracks.forEach((trackDef, index) => {
      const [channelName, ...noteTokens] = trackDef.split(":");
      const notes = noteTokens.join("").trim().split(/\s+/);

      const track: TrackerTrack = {
        channel: this.getChannelForName(channelName.trim()),
        notes: [],
        effects: [],
      };

      notes.forEach((token) => {
        if (token === "..." || token === "rest") {
          track.notes.push(null);
        } else if (token.startsWith("uarp(")) {
          const root = token.match(/uarp\(([^)]+)\)/)?.[1] || "C4";
          const arpNotes = NoteUtils.uarp(root, 4);
          arpNotes.forEach((arpNote) => {
            track.notes.push({
              note: this.freqToNoteName(arpNote.pitch),
              instrument: 0,
            });
          });
        } else if (token.startsWith("darp(")) {
          const root = token.match(/darp\(([^)]+)\)/)?.[1] || "C4";
          const arpNotes = NoteUtils.darp(root, 4);
          arpNotes.forEach((arpNote) => {
            track.notes.push({
              note: this.freqToNoteName(arpNote.pitch),
              instrument: 0,
            });
          });
        } else {
          track.notes.push({
            note: token,
            instrument: 0,
          });
        }
      });

      while (track.notes.length < pattern.length) {
        track.notes.push(null);
      }
      track.notes = track.notes.slice(0, pattern.length);

      pattern.tracks.push(track);
    });

    return pattern;
  }

  private static getChannelForName(name: string): number {
    const channels: Record<string, number> = {
      bass: 0,
      lead: 1,
      pad: 2,
      drums: 3,
      fx: 3,
    };
    return channels[name.toLowerCase()] || 0;
  }

  private static freqToNoteName(freq: number): string {
    const A4 = 440;
    const semitones = 12 * Math.log2(freq / A4);
    const noteNum = Math.round(semitones) + 69; // A4 = MIDI 69

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
    const octave = Math.floor(noteNum / 12) - 1;
    const note = notes[noteNum % 12];

    return note + octave;
  }

  exportPattern(patternId: string): string {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return "";

    let output = `${pattern.id}:${pattern.name}:${pattern.length}\n`;

    pattern.tracks.forEach((track) => {
      const noteStrs = track.notes.map((note) => {
        if (!note) return "---";

        let str = note.note;
        if (note.instrument) str += ":" + note.instrument;
        if (note.volume !== undefined) str += ":" + note.volume;
        if (note.effect) str += ":" + note.effect;

        return str;
      });

      output += `${track.channel}|${noteStrs.join(" ")}\n`;
    });

    return output;
  }
}
