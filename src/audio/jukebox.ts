/**
 * Jukebox - Simple sound bank for combat sounds and ambient music
 * Focus: Combat effects, simple progressions, background loops
 */

import { VoiceSynthesizer } from './voice_synthesizer';
import { AudioWorkstation } from './audio_workstation';

export interface SoundConfig {
  frequencies: number[];
  duration: number;
  voice: 'choir' | 'bass' | 'pluck' | 'lead' | 'pad';
  volume?: number;
}

export interface ProgressionConfig {
  name: string;
  chords: string[];
  tempo: number;
  duration: number; // seconds
  voice: 'choir' | 'bass' | 'pluck' | 'lead' | 'pad';
}

export class Jukebox {
  private synthesizer: VoiceSynthesizer;
  private isPlaying: boolean = false;
  private currentLoop: any = null;
  
  // Pre-defined combat sounds
  private combatSounds: Record<string, SoundConfig> = {
    'attack-light': {
      frequencies: [200, 150],
      duration: 0.1,
      voice: 'pluck',
      volume: 0.6
    },
    'attack-heavy': {
      frequencies: [120, 80],
      duration: 0.3,
      voice: 'bass',
      volume: 0.8
    },
    'block': {
      frequencies: [800, 1200],
      duration: 0.05,
      voice: 'lead',
      volume: 0.4
    },
    'hit': {
      frequencies: [300, 200, 150],
      duration: 0.15,
      voice: 'pluck',
      volume: 0.7
    },
    'footstep': {
      frequencies: [100, 120],
      duration: 0.08,
      voice: 'bass',
      volume: 0.3
    },
    'victory': {
      frequencies: [523.25, 659.25, 783.99], // C5-E5-G5
      duration: 0.8,
      voice: 'choir',
      volume: 0.6
    },
    'defeat': {
      frequencies: [146.83, 138.59, 130.81], // D3-C#3-C3
      duration: 1.0,
      voice: 'pad',
      volume: 0.5
    }
  };
  
  // Pre-defined musical progressions
  private progressions: Record<string, ProgressionConfig> = {
    'battle-theme': {
      name: 'Battle Theme',
      chords: ['Am', 'F', 'C', 'G'],
      tempo: 120,
      duration: 16, // 4 bars
      voice: 'choir'
    },
    'exploration': {
      name: 'Exploration',
      chords: ['C', 'Am', 'F', 'G'],
      tempo: 80,
      duration: 32, // 8 bars, slower
      voice: 'pad'
    },
    'victory-fanfare': {
      name: 'Victory Fanfare',
      chords: ['C', 'C', 'F', 'C', 'G', 'C'],
      tempo: 140,
      duration: 12,
      voice: 'lead'
    },
    'ambient-tension': {
      name: 'Ambient Tension',
      chords: ['Dm', 'Bb', 'F', 'C'],
      tempo: 60,
      duration: 24,
      voice: 'pad'
    }
  };
  
  constructor() {
    this.synthesizer = new VoiceSynthesizer();
    this.synthesizer.init();
  }
  
  // Play single combat sound
  playSound(soundName: string): void {
    const sound = this.combatSounds[soundName];
    if (!sound) {
      console.warn(`Sound '${soundName}' not found`);
      return;
    }
    
    const volume = sound.volume || 1.0;
    const adjustedFreqs = sound.frequencies.map(f => f * volume);
    
    this.synthesizer.playNote(
      sound.voice,
      adjustedFreqs,
      sound.duration
    );
  }
  
  // Play musical progression (background music)
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
      
      const chordDuration = (progression.duration / progression.chords.length);
      let chordIndex = 0;
      
      const playNextChord = () => {
        if (!this.isPlaying || chordIndex >= progression.chords.length) {
          if (loop && this.isPlaying) {
            // Restart progression
            setTimeout(playChords, 100);
          } else {
            this.isPlaying = false;
          }
          return;
        }
        
        const chord = progression.chords[chordIndex];
        const chordNotes = this.parseChord(chord);
        
        if (chordNotes.length > 0) {
          const frequencies = chordNotes.map(note => 
            AudioWorkstation.noteToFrequency(note, 4)
          );
          
          this.synthesizer.playNote(
            progression.voice,
            frequencies,
            chordDuration,
            `progression-${progressionName}`
          );
        }
        
        chordIndex++;
        
        // Schedule next chord
        const nextChordTime = (60 / progression.tempo) * 4 * 1000; // 4 beats per chord
        this.currentLoop = setTimeout(playNextChord, nextChordTime);
      };
      
      playNextChord();
    };
    
    playChords();
  }
  
  // Stop current progression
  stopProgression(): void {
    this.isPlaying = false;
    if (this.currentLoop) {
      clearTimeout(this.currentLoop);
      this.currentLoop = null;
    }
  }
  
  // Create custom combat sound
  createCombatSound(
    name: string,
    frequencies: number[],
    duration: number,
    voice: 'choir' | 'bass' | 'pluck' | 'lead' | 'pad' = 'pluck'
  ): void {
    this.combatSounds[name] = {
      frequencies,
      duration,
      voice,
      volume: 0.7
    };
  }
  
  // Get available sounds and progressions
  getAvailableSounds(): string[] {
    return Object.keys(this.combatSounds);
  }
  
  getAvailableProgressions(): string[] {
    return Object.keys(this.progressions);
  }
  
  getProgressionInfo(name: string): ProgressionConfig | null {
    return this.progressions[name] || null;
  }
  
  // Quick access methods for common game events
  onAttack(isHeavy: boolean = false): void {
    this.playSound(isHeavy ? 'attack-heavy' : 'attack-light');
  }
  
  onHit(): void {
    this.playSound('hit');
  }
  
  onBlock(): void {
    this.playSound('block');
  }
  
  onFootstep(): void {
    this.playSound('footstep');
  }
  
  onVictory(): void {
    this.playSound('victory');
    // Also play victory fanfare after a short delay
    setTimeout(() => {
      if (!this.isPlaying) { // Only if no background music
        this.playProgression('victory-fanfare', false);
      }
    }, 500);
  }
  
  onDefeat(): void {
    this.stopProgression(); // Stop any happy music
    this.playSound('defeat');
  }
  
  // Set ambient music for different game states
  startBattleMusic(): void {
    this.playProgression('battle-theme', true);
  }
  
  startExplorationMusic(): void {
    this.playProgression('exploration', true);
  }
  
  startTensionMusic(): void {
    this.playProgression('ambient-tension', true);
  }
  
  stopMusic(): void {
    this.stopProgression();
  }
  
  // Utility: Parse simple chord notation
  private parseChord(chord: string): string[] {
    return AudioWorkstation.parseChord(chord) || [];
  }
  
  // Cleanup
  dispose(): void {
    this.stopProgression();
    this.synthesizer.dispose();
  }
}