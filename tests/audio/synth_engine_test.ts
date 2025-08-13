import { describe, it, expect } from 'bun:test';
import { SynthEngine, NoteUtils, Pattern, Track, Note } from '../../src/audio/synth_engine';

describe('SynthEngine', () => {
  it('should synthesize basic waveforms', () => {
    const engine = new SynthEngine();
    const note: Note = {
      pitch: 440,
      velocity: 100,
      gate: 1
    };
    
    const voice = {
      waveform: 'sine' as const,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.2 }
    };
    
    const buffer = engine.synthesize(note, voice);
    
    expect(buffer).toBeInstanceOf(Float32Array);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.some(s => s !== 0)).toBe(true);
    
    // Should be within -1 to 1 range
    expect(buffer.every(s => s >= -1 && s <= 1)).toBe(true);
  });
  
  it('should handle pattern sequencing', () => {
    const engine = new SynthEngine();
    
    // Create a simple pattern: C-E-G-rest
    const pattern: Pattern = {
      notes: [
        { pitch: NoteUtils.nameToFreq('C4'), velocity: 100, gate: 1 },
        { pitch: NoteUtils.nameToFreq('E4'), velocity: 100, gate: 1 },
        { pitch: NoteUtils.nameToFreq('G4'), velocity: 100, gate: 1 },
        null // rest
      ],
      duration: 125, // 120 BPM, 16th notes
      loop: true
    };
    
    const track: Track = {
      channel: 0,
      patterns: [pattern],
      muted: false,
      volume: 0.8,
      pan: 0
    };
    
    const trackIndex = engine.addTrack(track);
    expect(trackIndex).toBe(0);
    
    // Test pattern modification
    engine.setNote(0, 0, 1, { pitch: NoteUtils.nameToFreq('F4'), velocity: 80, gate: 2 });
    expect(track.patterns[0].notes[1]?.pitch).toBeCloseTo(NoteUtils.nameToFreq('F4'), 1);
  });
  
  it('should parse tracker notation', () => {
    expect(NoteUtils.parseTrackerNote('---')).toBeNull();
    expect(NoteUtils.parseTrackerNote('...')).toBeNull();
    
    const note = NoteUtils.parseTrackerNote('C-4 64 1');
    expect(note).not.toBeNull();
    expect(note?.velocity).toBe(64);
    expect(note?.gate).toBe(1);
    expect(note?.pitch).toBeCloseTo(NoteUtils.nameToFreq('C4'), 1);
  });
  
  it('should generate uarp patterns', () => {
    const arp = NoteUtils.uarp('C4', 4);
    
    expect(arp.length).toBe(4);
    expect(arp[0].pitch).toBeCloseTo(NoteUtils.nameToFreq('C4'), 1);
    expect(arp[1].pitch).toBeCloseTo(NoteUtils.nameToFreq('E4'), 1);
    expect(arp[2].pitch).toBeCloseTo(NoteUtils.nameToFreq('G4'), 1);
    expect(arp[3].pitch).toBeCloseTo(NoteUtils.nameToFreq('C5'), 1);
  });
  
  it('should generate darp patterns', () => {
    const arp = NoteUtils.darp('C4', 4);
    
    expect(arp.length).toBe(4);
    expect(arp[0].pitch).toBeCloseTo(NoteUtils.nameToFreq('C5'), 1);
    expect(arp[3].pitch).toBeCloseTo(NoteUtils.nameToFreq('C4'), 1);
  });
  
  it('should handle BPM changes', () => {
    const engine = new SynthEngine();
    
    engine.setBPM(140);
    expect(engine.getBPM()).toBe(140);
    
    engine.setBPM(50); // Too slow, should clamp
    expect(engine.getBPM()).toBe(60);
    
    engine.setBPM(400); // Too fast, should clamp
    expect(engine.getBPM()).toBe(300);
  });
  
  it('should track playback position', () => {
    const engine = new SynthEngine();
    
    const pos = engine.getCurrentPosition();
    expect(pos.bar).toBe(0);
    expect(pos.step).toBe(0);
  });
  
  it('should apply envelope correctly', () => {
    const engine = new SynthEngine();
    
    const note: Note = {
      pitch: 440,
      velocity: 127,
      gate: 4  // Longer note to test envelope
    };
    
    const voice = {
      waveform: 'sine' as const,
      envelope: { 
        attack: 0.01,   // 10ms
        decay: 0.05,    // 50ms
        sustain: 0.5,   // 50% level
        release: 0.1    // 100ms
      }
    };
    
    const buffer = engine.synthesize(note, voice);
    
    // Check attack phase (should start quiet)
    const firstSamples = buffer.slice(0, 10);
    const attackPeak = Math.max(...firstSamples.map(Math.abs));
    expect(attackPeak).toBeLessThan(0.5);
    
    // Check sustain phase (should stabilize around sustain level)
    const midPoint = Math.floor(buffer.length / 2);
    const sustainSamples = buffer.slice(midPoint, midPoint + 100);
    const sustainAvg = sustainSamples.reduce((a, b) => a + Math.abs(b), 0) / sustainSamples.length;
    
    // Sustain level should be around 0.5 * amplitude
    // But sine wave averages to ~0.636 of peak, so expect ~0.318
    expect(sustainAvg).toBeGreaterThan(0.2); // Should have substantial amplitude
    expect(sustainAvg).toBeLessThan(0.5);   // But less than peak
  });
  
  it('should apply lowpass filter', () => {
    const engine = new SynthEngine();
    
    // High frequency square wave
    const note: Note = {
      pitch: 2000, // High frequency
      velocity: 127,
      gate: 1
    };
    
    const voiceUnfiltered = {
      waveform: 'square' as const,
      envelope: { attack: 0, decay: 0, sustain: 1, release: 0 }
    };
    
    const voiceFiltered = {
      ...voiceUnfiltered,
      filter: { type: 'lowpass', cutoff: 500, resonance: 0 }
    };
    
    const unfiltered = engine.synthesize(note, voiceUnfiltered);
    const filtered = engine.synthesize(note, voiceFiltered);
    
    // Filtered should have less high frequency content (smoother)
    // Calculate variance as measure of smoothness
    let unfilteredVar = 0;
    let filteredVar = 0;
    
    for (let i = 1; i < 100; i++) {
      unfilteredVar += Math.abs(unfiltered[i] - unfiltered[i-1]);
      filteredVar += Math.abs(filtered[i] - filtered[i-1]);
    }
    
    // Filtered signal should be smoother (less variance)
    expect(filteredVar).toBeLessThan(unfilteredVar * 0.8);
  });
});