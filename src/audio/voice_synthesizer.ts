/**
 * VoiceSynthesizer - Handles audio synthesis for different voice types
 * Separate from DAW logic, purely focused on sound generation
 */

import { VoiceType } from './audio_workstation';
import { Simulator } from '../core/simulator';

export interface SynthVoiceConfig {
  waveform: OscillatorType;
  harmonics?: number[];
  detune?: number;
  filter?: {
    type: BiquadFilterType;
    frequency: number;
    Q: number;
  };
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  effects?: {
    reverb?: number;
    chorus?: number;
  };
}

export class VoiceSynthesizer {
  private audioContext: AudioContext | null = null;
  private reverb: ConvolverNode | null = null;
  private inversionStates: Map<string, number> = new Map();
  private bassPatternStates: Map<string, number> = new Map();
  
  constructor() {}
  
  init(): void {
    if (!this.audioContext) {
      // Use global AudioContext for testing compatibility
      const AudioContextClass = typeof window !== 'undefined' 
        ? (window.AudioContext || (window as any).webkitAudioContext)
        : (global as any).AudioContext;
      
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        this.setupReverb();
      }
    }
  }
  
  private setupReverb(): void {
    if (!this.audioContext) return;
    
    const length = this.audioContext.sampleRate * 2;
    const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponentially decaying noise for reverb impulse
        channelData[i] = (Simulator.rng.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    
    this.reverb = this.audioContext.createConvolver();
    this.reverb.buffer = impulse;
  }
  
  playNote(
    voice: VoiceType,
    frequencies: number | number[],
    duration: number,
    channelId?: string
  ): void {
    if (!this.audioContext) this.init();
    if (!this.audioContext) return;
    
    switch (voice) {
      case 'choir':
        this.playChoir(frequencies, duration, channelId);
        break;
      case 'bass':
        this.playBass(frequencies, duration, channelId);
        break;
      case 'pluck':
        this.playPluck(frequencies, duration);
        break;
      case 'lead':
        this.playLead(frequencies, duration);
        break;
      case 'pad':
        this.playPad(frequencies, duration);
        break;
    }
  }
  
  private playChoir(
    freq: number | number[],
    duration: number,
    channelId?: string
  ): void {
    if (!this.audioContext || !this.reverb) return;
    
    const now = this.audioContext.currentTime;
    const masterGain = this.audioContext.createGain();
    const reverbSend = this.audioContext.createGain();
    
    // Handle chord inversions
    let frequencies = Array.isArray(freq) ? [...freq] : [freq];
    
    if (channelId && frequencies.length > 1) {
      const inversionState = this.inversionStates.get(channelId) || 0;
      const inversionAmount = inversionState % frequencies.length;
      
      // Rotate notes for inversion
      for (let i = 0; i < inversionAmount; i++) {
        const lowest = frequencies.shift();
        if (lowest) frequencies.push(lowest * 2);
      }
      
      this.inversionStates.set(channelId, inversionState + 1);
    }
    
    // Voice spreading configuration
    const voiceSpread = [
      { detune: 0, pan: 0, delay: 0 },
      { detune: 8, pan: -0.3, delay: 0.01 },
      { detune: -7, pan: 0.3, delay: 0.015 },
      { detune: 15, pan: -0.5, delay: 0.02 },
      { detune: -12, pan: 0.5, delay: 0.025 }
    ];
    
    // Create ensemble for each frequency
    frequencies.forEach((noteFreq, noteIndex) => {
      const notePan = (noteIndex - frequencies.length / 2) * 0.2;
      
      voiceSpread.slice(0, 3).forEach(voice => {
        const osc = this.audioContext!.createOscillator();
        const voiceGain = this.audioContext!.createGain();
        const panner = this.audioContext!.createStereoPanner();
        
        osc.type = 'sine';
        osc.frequency.value = noteFreq;
        osc.detune.value = voice.detune;
        
        // Add vibrato
        const vibrato = this.audioContext!.createOscillator();
        const vibratoGain = this.audioContext!.createGain();
        vibrato.frequency.value = 4.5;
        vibratoGain.gain.value = noteFreq * 0.02;
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        
        // ADSR envelope
        const level = 0.15 / Math.sqrt(frequencies.length);
        voiceGain.gain.setValueAtTime(0, now + voice.delay);
        voiceGain.gain.linearRampToValueAtTime(level, now + voice.delay + 0.15);
        voiceGain.gain.linearRampToValueAtTime(level * 0.8, now + voice.delay + 0.35);
        voiceGain.gain.exponentialRampToValueAtTime(0.01, now + voice.delay + duration);
        
        panner.pan.value = Math.max(-1, Math.min(1, notePan + voice.pan));
        
        osc.connect(voiceGain);
        voiceGain.connect(panner);
        panner.connect(masterGain);
        
        osc.start(now + voice.delay);
        osc.stop(now + voice.delay + duration);
        vibrato.start(now + voice.delay);
        vibrato.stop(now + voice.delay + duration);
      });
    });
    
    // Connect reverb
    reverbSend.gain.value = 0.35;
    masterGain.connect(this.audioContext.destination);
    masterGain.connect(reverbSend);
    reverbSend.connect(this.reverb);
    this.reverb.connect(this.audioContext.destination);
  }
  
  private playBass(
    freq: number | number[],
    duration: number,
    channelId?: string
  ): void {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    const frequencies = Array.isArray(freq) ? freq : [freq];
    
    let bassFreq: number;
    
    // Walking bass pattern for chords
    if (channelId && frequencies.length > 1) {
      const stepState = this.bassPatternStates.get(channelId) || 0;
      
      const patterns = [
        [0, 2, 1, 0], // 1-5-3-1
        [0, 1, 2, 1], // 1-3-5-3
        [0, 1, 0, 2], // 1-3-1-5
        [0, 2, 0, 1]  // 1-5-1-3
      ];
      
      const pattern = patterns[Math.floor(stepState / 4) % patterns.length];
      const noteIndex = pattern[stepState % 4];
      bassFreq = frequencies[noteIndex % frequencies.length] / 2;
      
      this.bassPatternStates.set(channelId, stepState + 1);
    } else {
      bassFreq = frequencies[0];
    }
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    osc.type = 'triangle';
    osc.frequency.value = bassFreq;
    
    filter.type = 'lowpass';
    filter.frequency.value = bassFreq * 4;
    filter.Q.value = 2;
    
    // Punchy envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start(now);
    osc.stop(now + duration);
  }
  
  private playPluck(freq: number | number[], duration: number): void {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    const frequencies = Array.isArray(freq) ? freq : [freq];
    
    // Arpeggiate chords
    frequencies.forEach((noteFreq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      const delay = i * 0.02;
      
      osc.type = 'triangle';
      osc.frequency.value = noteFreq;
      
      // Fast attack, natural decay
      const level = 0.4 / Math.sqrt(frequencies.length);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(level, now + delay + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + duration);
      
      osc.connect(gain);
      gain.connect(this.audioContext!.destination);
      
      osc.start(now + delay);
      osc.stop(now + delay + duration);
    });
  }
  
  private playLead(freq: number | number[], duration: number): void {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    const leadFreq = Array.isArray(freq) ? freq[freq.length - 1] : freq;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.value = leadFreq;
    
    filter.type = 'lowpass';
    filter.frequency.value = leadFreq * 8;
    filter.Q.value = 5;
    
    // Quick attack, sustained
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start(now);
    osc.stop(now + duration);
  }
  
  private playPad(freq: number | number[], duration: number): void {
    if (!this.audioContext || !this.reverb) return;
    
    const now = this.audioContext.currentTime;
    const frequencies = Array.isArray(freq) ? freq : [freq];
    
    const masterGain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    const reverbSend = this.audioContext.createGain();
    
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 1;
    
    frequencies.forEach(noteFreq => {
      const osc = this.audioContext!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = noteFreq;
      
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + duration + 0.5);
    });
    
    // Slow envelope for pad
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.1, now + 0.3);
    masterGain.gain.linearRampToValueAtTime(0.08, now + duration);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration + 0.5);
    
    filter.connect(masterGain);
    masterGain.connect(this.audioContext.destination);
    
    // Heavy reverb for pads
    reverbSend.gain.value = 0.5;
    masterGain.connect(reverbSend);
    reverbSend.connect(this.reverb);
    this.reverb.connect(this.audioContext.destination);
  }
  
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.inversionStates.clear();
    this.bassPatternStates.clear();
  }
}