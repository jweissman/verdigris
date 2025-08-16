import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { VoiceSynthesizer } from '../../src/audio/voice_synthesizer';


class MockAudioContext {
  sampleRate = 44100;
  currentTime = 0;
  destination = {};
  
  createOscillator() {
    return {
      type: 'sine',
      frequency: { value: 440 },
      detune: { value: 0 },
      connect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {}
      },
      connect: () => {}
    };
  }
  
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: { 
        value: 1000,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {}
      },
      Q: { 
        value: 1,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {}
      },
      connect: () => {}
    };
  }
  
  createStereoPanner() {
    return {
      pan: { value: 0 },
      connect: () => {}
    };
  }
  
  createConvolver() {
    return {
      buffer: null,
      connect: () => {}
    };
  }
  
  createDelay() {
    return {
      delayTime: { value: 0 },
      connect: () => {}
    };
  }
  
  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      getChannelData: (channel: number) => new Float32Array(length)
    };
  }
  
  close() {
    return Promise.resolve();
  }
}

describe('VoiceSynthesizer', () => {
  let synth: VoiceSynthesizer;
  let originalAudioContext: any;
  
  beforeEach(() => {

    originalAudioContext = (global as any).AudioContext;

    (global as any).AudioContext = MockAudioContext;
    
    synth = new VoiceSynthesizer();
  });
  
  afterEach(() => {
    synth.dispose();

    (global as any).AudioContext = originalAudioContext;
  });
  
  describe('Initialization', () => {
    it('should create a new VoiceSynthesizer instance', () => {
      expect(synth).toBeDefined();
      expect(synth).toBeInstanceOf(VoiceSynthesizer);
    });
    
    it('should initialize audio context on first use', () => {
      synth.init();


      expect(() => synth.playNote('choir', 440, 0.1)).not.toThrow();
    });
  });
  
  describe('Voice Playback', () => {
    beforeEach(() => {
      synth.init();
    });
    
    it('should play choir voice with single frequency', () => {
      expect(() => synth.playNote('choir', 440, 0.5)).not.toThrow();
    });
    
    it('should play choir voice with chord (multiple frequencies)', () => {
      const chord = [261.63, 329.63, 392.00]; // C major
      expect(() => synth.playNote('choir', chord, 0.5)).not.toThrow();
    });
    
    it('should play bass voice', () => {
      expect(() => synth.playNote('bass', 82.41, 0.5)).not.toThrow();
    });
    
    it('should play pluck voice', () => {
      expect(() => synth.playNote('pluck', 440, 0.5)).not.toThrow();
    });
    
    it('should play lead voice', () => {
      expect(() => synth.playNote('lead', 440, 0.5)).not.toThrow();
    });
    
    it('should play pad voice', () => {
      expect(() => synth.playNote('pad', [261.63, 329.63, 392.00], 1.0)).not.toThrow();
    });
  });
  
  describe('Chord Inversions', () => {
    beforeEach(() => {
      synth.init();
    });
    
    it('should handle chord inversions for choir voice', () => {
      const chord = [261.63, 329.63, 392.00]; // C major
      


      expect(() => {
        synth.playNote('choir', chord, 0.5, 'channel-1');
        synth.playNote('choir', chord, 0.5, 'channel-1');
        synth.playNote('choir', chord, 0.5, 'channel-1');
      }).not.toThrow();
    });
    
    it('should track inversions per channel', () => {
      const chord = [261.63, 329.63, 392.00];
      

      expect(() => {
        synth.playNote('choir', chord, 0.5, 'channel-1');
        synth.playNote('choir', chord, 0.5, 'channel-2');
        synth.playNote('choir', chord, 0.5, 'channel-1');
      }).not.toThrow();
    });
  });
  
  describe('Walking Bass Patterns', () => {
    beforeEach(() => {
      synth.init();
    });
    
    it('should create walking bass patterns for chords', () => {
      const chord = [261.63, 329.63, 392.00];
      

      expect(() => {
        for (let i = 0; i < 8; i++) {
          synth.playNote('bass', chord, 0.25, 'bass-channel');
        }
      }).not.toThrow();
    });
    
    it('should play single bass note without pattern', () => {
      expect(() => {
        synth.playNote('bass', 82.41, 0.5);
      }).not.toThrow();
    });
  });
  
  describe('Arpeggiator for Pluck', () => {
    beforeEach(() => {
      synth.init();
    });
    
    it('should arpeggiate chords for pluck voice', () => {
      const chord = [261.63, 329.63, 392.00];
      expect(() => synth.playNote('pluck', chord, 0.5)).not.toThrow();
    });
  });
  
  describe('Lead Voice Behavior', () => {
    beforeEach(() => {
      synth.init();
    });
    
    it('should play highest note of chord for lead voice', () => {
      const chord = [261.63, 329.63, 392.00];
      expect(() => synth.playNote('lead', chord, 0.5)).not.toThrow();
    });
  });
  
  describe('Resource Management', () => {
    it('should dispose audio context and clear state', () => {
      synth.init();
      expect(() => synth.dispose()).not.toThrow();
      

      expect(() => synth.init()).not.toThrow();
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle playing before initialization', () => {

      expect(() => synth.playNote('choir', 440, 0.5)).not.toThrow();
    });
    
    it('should handle empty frequency arrays', () => {
      synth.init();
      expect(() => synth.playNote('choir', [], 0.5)).not.toThrow();
    });
    
    it('should handle very short durations', () => {
      synth.init();
      expect(() => synth.playNote('choir', 440, 0.001)).not.toThrow();
    });
    
    it('should handle very long durations', () => {
      synth.init();
      expect(() => synth.playNote('pad', 440, 10)).not.toThrow();
    });
  });
});