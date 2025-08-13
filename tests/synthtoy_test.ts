import { describe, it, expect } from 'bun:test';
import { Synthbox, Oscillator, Note } from '../src/synthbox';

describe('Synthbox - Mathematical Sound Engine', () => {
  it('should generate pure sine waves', () => {
    const osc = new Oscillator('sine');
    const samples = osc.generate(440, 100, 44100); // A440, 100 samples at 44.1kHz
    
    // Should generate values between -1 and 1
    expect(samples.every(s => s >= -1 && s <= 1)).toBe(true);
    
    // Should complete roughly one cycle in 100 samples at 440Hz
    const cyclesExpected = 440 * 100 / 44100; // ~1 cycle
    const zeroCrossings = samples.filter((s, i) => 
      i > 0 && Math.sign(s) !== Math.sign(samples[i-1])
    ).length;
    expect(zeroCrossings).toBeGreaterThan(0);
    expect(zeroCrossings).toBeLessThan(4); // ~2 zero crossings per cycle
  });

  it('should support multiple waveforms', () => {
    const sine = new Oscillator('sine');
    const square = new Oscillator('square');
    const saw = new Oscillator('saw');
    const triangle = new Oscillator('triangle');
    
    const freq = 440;
    const samples = 100;
    const rate = 44100;
    
    const sineWave = sine.generate(freq, samples, rate);
    const squareWave = square.generate(freq, samples, rate);
    const sawWave = saw.generate(freq, samples, rate);
    const triangleWave = triangle.generate(freq, samples, rate);
    
    // Each should have different characteristics
    expect(sineWave).not.toEqual(squareWave);
    expect(squareWave).not.toEqual(sawWave);
    expect(sawWave).not.toEqual(triangleWave);
  });

  it('should convert note names to frequencies', () => {
    expect(Note.toFreq('A4')).toBeCloseTo(440, 1);
    expect(Note.toFreq('C4')).toBeCloseTo(261.63, 1);
    expect(Note.toFreq('C#4')).toBeCloseTo(277.18, 1);
    expect(Note.toFreq('E4')).toBeCloseTo(329.63, 1);
  });

  it('should parse chord symbols', () => {
    const cSharpMinor = Note.parseChord('C#m');
    expect(cSharpMinor).toEqual(['C#', 'E', 'G#']);
    
    const aMaj7 = Note.parseChord('Amaj7');
    expect(aMaj7).toEqual(['A', 'C#', 'E', 'G#']);
    
    const bMinor = Note.parseChord('Bm');
    expect(bMinor).toEqual(['B', 'D', 'F#']);
  });

  it('should create a 4-channel synthbox', () => {
    const synth = new Synthbox();
    
    // Configure channels
    synth.channel(0).setVoice('choir');    // Female choir
    synth.channel(1).setVoice('pluck');    // Pluck/bass
    synth.channel(2).setVoice('lead');     // Soloist/guitar
    synth.channel(3).setVoice('texture');  // Chitter/birdsong
    
    // Each channel should have different timbres
    const choir = synth.channel(0);
    const pluck = synth.channel(1);
    
    expect(choir.voice).toBe('choir');
    expect(pluck.voice).toBe('pluck');
  });

  it('should apply simple reverb', () => {
    const synth = new Synthbox();
    const dry = synth.channel(0).generate('A4', 1000);
    
    synth.channel(0).reverb = 0.5; // 50% wet
    const wet = synth.channel(0).generate('A4', 1000);
    
    // Reverb should produce different signal than dry
    expect(dry).not.toEqual(wet);
    
    // Both should have sound content
    const dryHasSound = dry.some(s => Math.abs(s) > 0.01);
    const wetHasSound = wet.some(s => Math.abs(s) > 0.01);
    expect(dryHasSound).toBe(true);
    expect(wetHasSound).toBe(true);
  });

  it('should sequence musical phrases', () => {
    const synth = new Synthbox();
    
    // Simple sequence: "uarp uarp rest uarp"
    const sequence = synth.sequence([
      { note: 'C4', duration: 0.25 },  // uarp
      { note: 'E4', duration: 0.25 },  // uarp
      { note: null, duration: 0.25 },  // rest
      { note: 'G4', duration: 0.25 },  // uarp
    ]);
    
    expect(sequence.length).toBe(4);
    expect(sequence[2].note).toBeNull(); // rest
  });

  it('should generate eerie mathematical harmonics', () => {
    const synth = new Synthbox();
    
    // Fibonacci-based harmonic series for eeriness
    const fibHarmonics = [1, 1, 2, 3, 5, 8, 13];
    const fundamental = 110; // A2
    
    const harmonics = fibHarmonics.map(n => fundamental * n);
    const composite = synth.mixHarmonics(harmonics, [1, 0.5, 0.3, 0.2, 0.1, 0.05, 0.02]);
    
    // Should create a complex waveform
    expect(composite.length).toBeGreaterThan(0);
    expect(composite.some(s => s !== 0)).toBe(true);
  });

  it('should support ADSR envelope shaping', () => {
    const osc = new Oscillator('sine');
    
    // Attack, Decay, Sustain, Release
    const envelope = {
      attack: 0.01,   // 10ms
      decay: 0.1,     // 100ms  
      sustain: 0.7,   // 70% level
      release: 0.2    // 200ms
    };
    
    const samples = osc.generateWithEnvelope(440, 1000, 44100, envelope);
    
    // Should start at 0 (attack)
    expect(samples[0]).toBeCloseTo(0, 2);
    
    // Should reach peak after attack time
    const attackSamples = Math.floor(envelope.attack * 44100);
    const peakRegion = samples.slice(attackSamples, attackSamples + 100);
    const maxAmplitude = Math.max(...peakRegion.map(Math.abs));
    expect(maxAmplitude).toBeGreaterThan(0.9);
  });
});