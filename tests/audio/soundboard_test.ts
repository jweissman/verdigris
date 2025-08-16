import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Soundboard, SoundPad } from '../../src/audio/soundboard';


class MockAudioContext {
  sampleRate = 44100;
  currentTime = 0;
  destination = {};
  
  createOscillator() {
    return {
      type: 'sine',
      frequency: { value: 440 },
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
  
  close() {
    return Promise.resolve();
  }
}

describe('Soundboard', () => {
  let soundboard: Soundboard;
  let originalAudioContext: any;
  
  beforeEach(() => {
    originalAudioContext = (global as any).AudioContext;
    (global as any).AudioContext = MockAudioContext;
    soundboard = new Soundboard();
  });
  
  afterEach(() => {
    soundboard.dispose();
    (global as any).AudioContext = originalAudioContext;
  });
  
  describe('Initialization', () => {
    it('should create 4x4 grid (16 pads)', () => {
      const names = soundboard.getPadNames();
      expect(names.length).toBe(16);
    });
    
    it('should load default sounds', () => {
      const names = soundboard.getPadNames();
      expect(names[0]).toBe('kick');
      expect(names[1]).toBe('punch');
      expect(names[15]).toBe('error');
    });
    
    it('should have default master volume', () => {
      expect(soundboard.getMasterVolume()).toBe(0.7);
    });
  });
  
  describe('Pad Operations', () => {
    it('should play valid pad indices', () => {
      expect(soundboard.playPad(0)).toBe(true);
      expect(soundboard.playPad(15)).toBe(true);
    });
    
    it('should reject invalid pad indices', () => {
      expect(soundboard.playPad(-1)).toBe(false);
      expect(soundboard.playPad(16)).toBe(false);
      expect(soundboard.playPad(99)).toBe(false);
    });
    
    it('should return pad info', () => {
      const kick = soundboard.getPad(0);
      expect(kick?.name).toBe('kick');
      expect(kick?.frequencies).toEqual([60]);
      expect(kick?.waveform).toBe('sine');
    });
    
    it('should return null for invalid indices', () => {
      expect(soundboard.getPad(-1)).toBeNull();
      expect(soundboard.getPad(16)).toBeNull();
    });
  });
  
  describe('Custom Pad Creation', () => {
    it('should set custom sounds', () => {
      const success = soundboard.setPad(0, 'custom', [440, 880], 0.2, 'square', 0.8);
      expect(success).toBe(true);
      
      const pad = soundboard.getPad(0);
      expect(pad?.name).toBe('custom');
      expect(pad?.frequencies).toEqual([440, 880]);
      expect(pad?.duration).toBe(0.2);
      expect(pad?.waveform).toBe('square');
      expect(pad?.volume).toBe(0.8);
    });
    
    it('should validate pad index', () => {
      const success = soundboard.setPad(99, 'invalid', [440], 0.1);
      expect(success).toBe(false);
    });
    
    it('should validate frequencies array', () => {
      const success = soundboard.setPad(0, 'empty', [], 0.1);
      expect(success).toBe(false);
    });
    
    it('should validate duration', () => {
      const success = soundboard.setPad(0, 'zero-duration', [440], 0);
      expect(success).toBe(false);
    });
    
    it('should clamp volume to 0-1 range', () => {
      soundboard.setPad(0, 'loud', [440], 0.1, 'sine', 2.0);
      const pad = soundboard.getPad(0);
      expect(pad?.volume).toBe(1.0);
      
      soundboard.setPad(1, 'quiet', [440], 0.1, 'sine', -0.5);
      const pad2 = soundboard.getPad(1);
      expect(pad2?.volume).toBe(0.0);
    });
  });
  
  describe('Pad Management', () => {
    it('should clear pads', () => {
      expect(soundboard.clearPad(0)).toBe(true);
      expect(soundboard.getPad(0)).toBeNull();
      
      const names = soundboard.getPadNames();
      expect(names[0]).toBe('empty-0');
    });
    
    it('should reject invalid clear indices', () => {
      expect(soundboard.clearPad(-1)).toBe(false);
      expect(soundboard.clearPad(16)).toBe(false);
    });
    
    it('should not play cleared pads', () => {
      soundboard.clearPad(0);
      expect(soundboard.playPad(0)).toBe(false);
    });
  });
  
  describe('Master Volume', () => {
    it('should set master volume', () => {
      soundboard.setMasterVolume(0.5);
      expect(soundboard.getMasterVolume()).toBe(0.5);
    });
    
    it('should clamp master volume to 0-1', () => {
      soundboard.setMasterVolume(2.0);
      expect(soundboard.getMasterVolume()).toBe(1.0);
      
      soundboard.setMasterVolume(-0.5);
      expect(soundboard.getMasterVolume()).toBe(0.0);
    });
  });
  
  describe('Preset Helpers', () => {
    it('should create kick preset', () => {
      const kick = soundboard.createKick();
      expect(kick.name).toBe('kick');
      expect(kick.frequencies).toEqual([60, 80]);
      expect(kick.waveform).toBe('sine');
    });
    
    it('should create snare preset', () => {
      const snare = soundboard.createSnare();
      expect(snare.name).toBe('snare');
      expect(snare.frequencies).toEqual([200, 400, 800]);
      expect(snare.waveform).toBe('square');
    });
    
    it('should create hihat preset', () => {
      const hihat = soundboard.createHihat();
      expect(hihat.name).toBe('hihat');
      expect(hihat.frequencies).toEqual([8000, 12000]);
      expect(hihat.duration).toBe(0.03);
    });
    
    it('should create major chord', () => {
      const chord = soundboard.createChord(440, 'major');
      expect(chord.name).toBe('440hz-major');
      expect(chord.frequencies.length).toBe(3);
      expect(chord.frequencies[0]).toBeCloseTo(440, 1);
    });
    
    it('should create minor chord', () => {
      const chord = soundboard.createChord(440, 'minor');
      expect(chord.name).toBe('440hz-minor');
      expect(chord.frequencies.length).toBe(3);
    });
  });
  
  describe('Configuration Export/Import', () => {
    it('should export configuration', () => {
      const config = soundboard.exportConfig();
      const parsed = JSON.parse(config);
      
      expect(parsed.masterVolume).toBe(0.7);
      expect(parsed.pads).toBeDefined();
      expect(parsed.pads.length).toBe(16);
    });
    
    it('should import valid configuration', () => {
      const originalConfig = soundboard.exportConfig();
      
      soundboard.setMasterVolume(0.5);
      soundboard.clearPad(0);
      
      const success = soundboard.importConfig(originalConfig);
      expect(success).toBe(true);
      
      expect(soundboard.getMasterVolume()).toBe(0.7);
      expect(soundboard.getPad(0)?.name).toBe('kick');
    });
    
    it('should reject invalid configuration', () => {
      const success = soundboard.importConfig('invalid json');
      expect(success).toBe(false);
    });
    
    it('should reject configuration with wrong pad count', () => {
      const badConfig = JSON.stringify({
        masterVolume: 0.5,
        pads: new Array(8).fill(null) // Wrong size
      });
      
      const success = soundboard.importConfig(badConfig);
      expect(success).toBe(false);
    });
  });
  
  describe('Cleanup', () => {
    it('should stop all sounds', () => {
      expect(() => soundboard.stopAll()).not.toThrow();
    });
    
    it('should dispose cleanly', () => {
      expect(() => soundboard.dispose()).not.toThrow();
    });
  });
  
  describe('Integration', () => {
    it('should handle rapid pad presses', () => {
      for (let i = 0; i < 16; i++) {
        expect(soundboard.playPad(i)).toBe(true);
      }
    });
    
    it('should work with custom sounds', () => {
      soundboard.setPad(0, 'test', [200, 400], 0.05);
      expect(soundboard.playPad(0)).toBe(true);
    });
    
    it('should maintain state after volume changes', () => {
      soundboard.setMasterVolume(0.5);
      expect(soundboard.playPad(0)).toBe(true);
      expect(soundboard.getMasterVolume()).toBe(0.5);
    });
  });
});