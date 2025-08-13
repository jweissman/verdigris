/**
 * Soundboard - Simple 4x4 grid of sounds for immediate playback
 * Focus: Instant feedback, simple sound creation, practical for games
 */

export interface SoundPad {
  name: string;
  frequencies: number[];
  duration: number;
  waveform: 'sine' | 'square' | 'triangle' | 'sawtooth';
  volume: number;
}

export interface SoundboardConfig {
  masterVolume: number;
  pads: (SoundPad | null)[];
}

export class Soundboard {
  private audioContext: AudioContext | null = null;
  private config: SoundboardConfig;
  private activeSounds: Set<AudioBufferSourceNode> = new Set();
  
  constructor() {
    this.config = {
      masterVolume: 0.7,
      pads: new Array(16).fill(null)
    };
    
    this.loadDefaultSounds();
  }
  
  private loadDefaultSounds(): void {
    // Simple combat/game sounds for 4x4 grid
    const defaults: SoundPad[] = [
      // Row 1: Attacks
      { name: 'kick', frequencies: [60], duration: 0.1, waveform: 'sine', volume: 0.8 },
      { name: 'punch', frequencies: [200, 400], duration: 0.05, waveform: 'triangle', volume: 0.6 },
      { name: 'slash', frequencies: [800, 1200], duration: 0.08, waveform: 'sawtooth', volume: 0.5 },
      { name: 'stab', frequencies: [1500], duration: 0.03, waveform: 'square', volume: 0.4 },
      
      // Row 2: Impacts
      { name: 'thud', frequencies: [80, 120], duration: 0.15, waveform: 'triangle', volume: 0.7 },
      { name: 'clang', frequencies: [600, 900, 1200], duration: 0.12, waveform: 'square', volume: 0.5 },
      { name: 'crack', frequencies: [300, 600], duration: 0.06, waveform: 'sawtooth', volume: 0.6 },
      { name: 'pop', frequencies: [1000], duration: 0.02, waveform: 'square', volume: 0.3 },
      
      // Row 3: Movement
      { name: 'step', frequencies: [100], duration: 0.08, waveform: 'sine', volume: 0.3 },
      { name: 'jump', frequencies: [200, 400, 600], duration: 0.2, waveform: 'sine', volume: 0.4 },
      { name: 'land', frequencies: [80, 160], duration: 0.1, waveform: 'triangle', volume: 0.5 },
      { name: 'slide', frequencies: [150, 300], duration: 0.3, waveform: 'sawtooth', volume: 0.2 },
      
      // Row 4: UI/Events
      { name: 'select', frequencies: [800], duration: 0.05, waveform: 'sine', volume: 0.3 },
      { name: 'confirm', frequencies: [600, 800, 1000], duration: 0.1, waveform: 'sine', volume: 0.4 },
      { name: 'cancel', frequencies: [400, 300], duration: 0.08, waveform: 'triangle', volume: 0.3 },
      { name: 'error', frequencies: [200, 150, 100], duration: 0.15, waveform: 'square', volume: 0.4 }
    ];
    
    defaults.forEach((pad, index) => {
      this.config.pads[index] = pad;
    });
  }
  
  init(): void {
    if (!this.audioContext) {
      const AudioContextClass = typeof window !== 'undefined' 
        ? (window.AudioContext || (window as any).webkitAudioContext)
        : (global as any).AudioContext;
      
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }
  }
  
  // Play sound from pad index (0-15)
  playPad(padIndex: number): boolean {
    if (padIndex < 0 || padIndex >= 16) return false;
    
    const pad = this.config.pads[padIndex];
    if (!pad) return false;
    
    if (!this.audioContext) this.init();
    if (!this.audioContext) return false;
    
    const now = this.audioContext.currentTime;
    const masterGain = this.audioContext.createGain();
    masterGain.gain.value = this.config.masterVolume * pad.volume;
    
    // Create oscillators for each frequency
    pad.frequencies.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = pad.waveform;
      osc.frequency.value = freq;
      
      // Simple envelope
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.01, now + pad.duration);
      
      osc.connect(gain);
      gain.connect(masterGain);
      masterGain.connect(this.audioContext!.destination);
      
      osc.start(now);
      osc.stop(now + pad.duration);
    });
    
    return true;
  }
  
  // Set custom sound to pad
  setPad(
    padIndex: number, 
    name: string, 
    frequencies: number[], 
    duration: number = 0.1,
    waveform: 'sine' | 'square' | 'triangle' | 'sawtooth' = 'sine',
    volume: number = 0.5
  ): boolean {
    if (padIndex < 0 || padIndex >= 16) return false;
    if (frequencies.length === 0) return false;
    if (duration <= 0) return false;
    
    this.config.pads[padIndex] = {
      name,
      frequencies,
      duration,
      waveform,
      volume: Math.max(0, Math.min(1, volume))
    };
    
    return true;
  }
  
  // Clear pad
  clearPad(padIndex: number): boolean {
    if (padIndex < 0 || padIndex >= 16) return false;
    this.config.pads[padIndex] = null;
    return true;
  }
  
  // Get pad info
  getPad(padIndex: number): SoundPad | null {
    if (padIndex < 0 || padIndex >= 16) return null;
    return this.config.pads[padIndex];
  }
  
  // Get all pad names for UI
  getPadNames(): string[] {
    return this.config.pads.map((pad, i) => 
      pad ? pad.name : `empty-${i}`
    );
  }
  
  // Master volume control
  setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
  }
  
  getMasterVolume(): number {
    return this.config.masterVolume;
  }
  
  // Preset creation helpers
  createKick(): SoundPad {
    return {
      name: 'kick',
      frequencies: [60, 80],
      duration: 0.15,
      waveform: 'sine',
      volume: 0.8
    };
  }
  
  createSnare(): SoundPad {
    return {
      name: 'snare',
      frequencies: [200, 400, 800],
      duration: 0.08,
      waveform: 'square',
      volume: 0.6
    };
  }
  
  createHihat(): SoundPad {
    return {
      name: 'hihat',
      frequencies: [8000, 12000],
      duration: 0.03,
      waveform: 'square',
      volume: 0.3
    };
  }
  
  createChord(root: number, type: 'major' | 'minor' = 'major'): SoundPad {
    const intervals = type === 'major' ? [0, 4, 7] : [0, 3, 7];
    const frequencies = intervals.map(interval => 
      root * Math.pow(2, interval / 12)
    );
    
    return {
      name: `${root}hz-${type}`,
      frequencies,
      duration: 0.5,
      waveform: 'sine',
      volume: 0.4
    };
  }
  
  // Export/import configuration
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }
  
  importConfig(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson);
      if (!config.pads || !Array.isArray(config.pads) || config.pads.length !== 16) {
        return false;
      }
      
      this.config = config;
      return true;
    } catch {
      return false;
    }
  }
  
  // Stop all currently playing sounds
  stopAll(): void {
    this.activeSounds.forEach(source => {
      try {
        source.stop();
      } catch {
        // Already stopped
      }
    });
    this.activeSounds.clear();
  }
  
  // Cleanup
  dispose(): void {
    this.stopAll();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}