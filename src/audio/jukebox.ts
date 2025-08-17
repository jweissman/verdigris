/**
 * Jukebox - Simple sound bank for combat sounds and ambient music
 * Focus: Combat effects, simple progressions, background loops
 */

import { VoiceSynthesizer } from "./voice_synthesizer";
import { AudioWorkstation } from "./audio_workstation";
import { Simulator } from "../core/simulator";

export interface SoundConfig {
  frequencies: number[];
  duration: number;
  voice: "choir" | "bass" | "pluck" | "lead" | "pad";
  volume?: number;
}

export interface ProgressionConfig {
  name: string;
  chords: string[];
  tempo: number;
  duration: number;
  voice: "choir" | "bass" | "pluck" | "lead" | "pad";
}

export class Jukebox {
  private synthesizer: VoiceSynthesizer;
  private isPlaying: boolean = false;
  private currentLoop: any = null;
  private allTimeouts: Set<any> = new Set();

  private combatSounds: Record<string, SoundConfig> = {
    "attack-light": {
      frequencies: [200, 150],
      duration: 0.1,
      voice: "pluck",
      volume: 0.6,
    },
    "attack-heavy": {
      frequencies: [120, 80],
      duration: 0.3,
      voice: "bass",
      volume: 0.8,
    },
    block: {
      frequencies: [800, 1200],
      duration: 0.05,
      voice: "lead",
      volume: 0.4,
    },
    hit: {
      frequencies: [300, 200, 150],
      duration: 0.15,
      voice: "pluck",
      volume: 0.7,
    },
    footstep: {
      frequencies: [100, 120],
      duration: 0.08,
      voice: "bass",
      volume: 0.3,
    },
    victory: {
      frequencies: [523.25, 659.25, 783.99], // C5-E5-G5
      duration: 0.8,
      voice: "choir",
      volume: 0.6,
    },
    defeat: {
      frequencies: [146.83, 138.59, 130.81], // D3-C#3-C3
      duration: 1.0,
      voice: "pad",
      volume: 0.5,
    },

    "bird-chirp": {
      frequencies: [523, 587, 659], // C5-D5-E5 (octave lower, less harsh)
      duration: 0.3,
      voice: "lead",
      volume: 0.15, // Reduced volume
    },
    "bird-trill": {
      frequencies: [440, 493, 554, 493, 440], // A4-B4-C#5-B4-A4 (octave lower)
      duration: 0.6,
      voice: "pluck",
      volume: 0.1, // Much quieter
    },
    "squirrel-chitter": {
      frequencies: [300, 350, 280, 320], // Much lower, less waspy
      duration: 0.25,
      voice: "bass", // Changed from pluck to bass for smoother sound
      volume: 0.2,
    },
    "rustling-leaves": {
      frequencies: [400, 350, 420, 380],
      duration: 0.4,
      voice: "bass",
      volume: 0.1,
    },
    "wind-through-trees": {
      frequencies: [220, 246, 261, 293], // A3-B3-C4-D4
      duration: 2.0,
      voice: "pad",
      volume: 0.08,
    },
  };

  private progressions: Record<string, ProgressionConfig> = {
    "battle-theme": {
      name: "Battle Theme",
      chords: ["Am", "F", "C", "G"],
      tempo: 120,
      duration: 16, // 4 bars
      voice: "choir",
    },
    exploration: {
      name: "Exploration",
      chords: ["C", "Am", "F", "G"],
      tempo: 80,
      duration: 32, // 8 bars, slower
      voice: "pad",
    },
    "victory-fanfare": {
      name: "Victory Fanfare",
      chords: ["C", "C", "F", "C", "G", "C"],
      tempo: 140,
      duration: 12,
      voice: "lead",
    },
    "ambient-tension": {
      name: "Ambient Tension",
      chords: ["Dm", "Bb", "F", "C"],
      tempo: 60,
      duration: 24,
      voice: "pad",
    },
    "forest-tranquil": {
      name: "Forest Tranquil",
      chords: [
        "Em9",
        "Cmaj7",
        "G/B",
        "D7sus4",
        "Am7",
        "Fmaj7",
        "Cmaj7",
        "Em9",
        "Am7",
        "D9",
        "Gmaj7",
        "Em7",
        "Cmaj7",
        "Am7",
        "Fmaj7",
        "G7sus4",
      ],
      tempo: 55, // Gentle pace - not too slow
      duration: 48, // Longer, more evolving progression
      voice: "pad", // Soft pad voice
    },
    "forest-awakening": {
      name: "Forest Awakening",
      chords: ["Gmaj9", "Em9", "Cmaj7/G", "D7sus4", "Bm7", "Em7", "Am7", "D7"],
      tempo: 55,
      duration: 32,
      voice: "pad",
    },
    "forest-twilight": {
      name: "Forest Twilight",
      chords: [
        "Am",
        "F",
        "C",
        "G",
        "Dm7",
        "G7",
        "Cmaj7",
        "Am",
        "F",
        "Em",
        "Dm",
        "G",
        "Am7",
        "Fmaj7",
        "G7sus4",
        "C",
      ],
      tempo: 58,
      duration: 40,
      voice: "pad",
    },
    "forest-mist": {
      name: "Forest Mist",
      chords: [
        "Dm",
        "Am",
        "Gm",
        "Dm",
        "Bb",
        "F",
        "C",
        "Am",
        "Dm7",
        "Gm7",
        "C7",
        "Fmaj7",
        "Bb",
        "Am",
        "Dm",
        "A7",
      ],
      tempo: 52,
      duration: 44,
      voice: "pad",
    },
  };

  constructor() {
    this.synthesizer = new VoiceSynthesizer();
    this.synthesizer.init();
  }

  playSound(soundName: string): void {
    const sound = this.combatSounds[soundName];
    if (!sound) {
      console.warn(`Sound '${soundName}' not found`);
      return;
    }

    const volume = sound.volume || 1.0;
    const adjustedFreqs = sound.frequencies.map((f) => f * volume);

    this.synthesizer.playNote(sound.voice, adjustedFreqs, sound.duration);
  }

  playProgression(progressionName: string, loop: boolean = false): void {
    const progression = this.progressions[progressionName];
    if (!progression) {
      console.warn(`Progression '${progressionName}' not found`);
      return;
    }

    this.stopProgression(); // Stop any current progression
    this.isPlaying = true;

    const playChords = () => {
      if (!this.isPlaying) return;

      const chordDuration = progression.duration / progression.chords.length;
      let chordIndex = 0;

      const playNextChord = () => {
        this.allTimeouts.delete(this.currentLoop);

        if (!this.isPlaying || chordIndex >= progression.chords.length) {
          if (loop && this.isPlaying) {
            const restartTimeout = setTimeout(playChords, 100);
            this.allTimeouts.add(restartTimeout);
          } else {
            this.isPlaying = false;
          }
          return;
        }

        const chord = progression.chords[chordIndex];
        const chordNotes = this.parseChord(chord);

        if (chordNotes.length > 0) {
          const frequencies = chordNotes.map((note) =>
            AudioWorkstation.noteToFrequency(note, 4),
          );

          const shouldRest = chordIndex % 4 === 3; // Just rest on every 4th chord
          const actualDuration = shouldRest
            ? chordDuration * 0.8
            : chordDuration * 0.92; // Less extreme gaps

          this.synthesizer.playNote(
            progression.voice,
            frequencies,
            actualDuration,
            `progression-${progressionName}`,
          );

          if (
            progressionName === "forest-tranquil" ||
            progressionName === "forest-awakening"
          ) {
            const pattern = Simulator.rng.random();
            if (pattern > 0.25) {
              const arpNotes = chordNotes.slice(0, 3).map((note, i) => {
                const octave = i === 0 ? 4 : 5; // Mix octaves, not too high
                return AudioWorkstation.noteToFrequency(note, octave);
              });

              const arpLength = Simulator.rng.random() > 0.5 ? 2 : 3;
              arpNotes.slice(0, arpLength).forEach((freq, i) => {
                setTimeout(
                  () => {
                    if (this.isPlaying) {
                      this.synthesizer.playNote(
                        "pluck",
                        [freq],
                        0.3,
                        `arp-${progressionName}-${i}`,
                      );
                    }
                  },
                  i * 150 + Simulator.rng.random() * 50,
                ); // Quick arpeggio timing
              });
            }
          }
        }

        chordIndex++;

        const nextChordTime = (60 / progression.tempo) * 4 * 1000; // 4 beats per chord
        this.currentLoop = setTimeout(playNextChord, nextChordTime);
        this.allTimeouts.add(this.currentLoop);
      };

      playNextChord();
    };

    playChords();
  }

  stopProgression(): void {
    this.isPlaying = false;

    this.allTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.allTimeouts.clear();

    if (this.currentLoop) {
      clearTimeout(this.currentLoop);
      this.currentLoop = null;
    }

    this.synthesizer.stop();
  }

  createCombatSound(
    name: string,
    frequencies: number[],
    duration: number,
    voice: "choir" | "bass" | "pluck" | "lead" | "pad" = "pluck",
  ): void {
    this.combatSounds[name] = {
      frequencies,
      duration,
      voice,
      volume: 0.7,
    };
  }

  getAvailableSounds(): string[] {
    return Object.keys(this.combatSounds);
  }

  getAvailableProgressions(): string[] {
    return Object.keys(this.progressions);
  }

  getProgressionInfo(name: string): ProgressionConfig | null {
    return this.progressions[name] || null;
  }

  onAttack(isHeavy: boolean = false): void {
    this.playSound(isHeavy ? "attack-heavy" : "attack-light");
  }

  onHit(): void {
    this.playSound("hit");
  }

  onBlock(): void {
    this.playSound("block");
  }

  onFootstep(): void {
    this.playSound("footstep");
  }

  onVictory(): void {
    this.playSound("victory");

    setTimeout(() => {
      if (!this.isPlaying) {
        this.playProgression("victory-fanfare", false);
      }
    }, 500);
  }

  onDefeat(): void {
    this.stopProgression(); // Stop any happy music
    this.playSound("defeat");
  }

  startBattleMusic(): void {
    this.playProgression("battle-theme", true);
  }

  startExplorationMusic(): void {
    this.playProgression("exploration", true);
  }

  startTensionMusic(): void {
    this.playProgression("ambient-tension", true);
  }

  stopMusic(): void {
    this.stopProgression();
  }

  startForestMusic(): void {
    this.playProgression("forest-tranquil", true);
  }

  playBirdSong(): void {
    const sounds = ["bird-chirp", "bird-trill"];
    const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
    this.playSound(randomSound);
  }

  playForestAmbience(): void {
    const ambientSounds = [
      "rustling-leaves",
      "wind-through-trees",
      "squirrel-chitter",
    ];
    const randomSound =
      ambientSounds[Math.floor(Math.random() * ambientSounds.length)];
    this.playSound(randomSound);
  }

  startForestScene(): void {
    this.startForestMusic();

    const playRandomBirdSong = () => {
      if (Math.random() < 0.3) {
        this.playBirdSong();
      }
    };

    const playRandomAmbience = () => {
      if (Math.random() < 0.2) {
        this.playForestAmbience();
      }
    };

    setInterval(playRandomBirdSong, 3000 + Math.random() * 3000);

    setInterval(playRandomAmbience, 8000 + Math.random() * 7000);
  }

  private parseChord(chord: string): string[] {
    return AudioWorkstation.parseChord(chord) || [];
  }

  dispose(): void {
    this.stopProgression();
    this.synthesizer.dispose();
  }
}
