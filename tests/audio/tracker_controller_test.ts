import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TrackerController, TrackerState } from '../../src/audio/tracker_controller';


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

describe('TrackerController', () => {
  let controller: TrackerController;
  let originalAudioContext: any;
  
  beforeEach(() => {

    originalAudioContext = (global as any).AudioContext;
    (global as any).AudioContext = MockAudioContext;
    
    controller = new TrackerController();
  });
  
  afterEach(() => {
    controller.dispose();
    (global as any).AudioContext = originalAudioContext;
  });
  
  describe('Initialization', () => {
    it('should create a new TrackerController', () => {
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(TrackerController);
    });
    
    it('should initialize with callbacks', () => {
      let stateChanged = false;
      
      controller.init({
        onStateChange: (state) => {
          stateChanged = true;
          expect(state).toBeDefined();
          expect(state.currentPattern).not.toBeNull();
        }
      });
      
      expect(stateChanged).toBe(true);
    });
    
    it('should return initial state', () => {
      controller.init();
      const state = controller.getState();
      
      expect(state.currentPattern).not.toBeNull();
      expect(state.selectedCell).toEqual({ channel: 0, step: 0 });
      expect(state.isPlaying).toBe(false);
      expect(state.bpm).toBe(120);
    });
  });
  
  describe('Pattern Management', () => {
    beforeEach(() => {
      controller.init();
    });
    
    it('should create new patterns', () => {
      controller.createPattern('Test Pattern', 32);
      const state = controller.getState();
      
      expect(state.currentPattern?.name).toBe('Test Pattern');
      expect(state.currentPattern?.length).toBe(32);
    });
    
    it('should clear pattern', () => {
      controller.setNote(0, 0, 'C4');
      controller.setNote(1, 4, 'G3');
      
      controller.clearPattern();
      
      expect(controller.getNote(0, 0)).toBe('---');
      expect(controller.getNote(1, 4)).toBe('---');
    });
    
    it('should load patterns by id', () => {
      controller.createPattern('Pattern 1', 16);
      const state1 = controller.getState();
      const pattern1Id = state1.currentPattern?.id;
      
      controller.createPattern('Pattern 2', 32);
      
      if (pattern1Id) {
        const success = controller.loadPattern(pattern1Id);
        expect(success).toBe(true);
        
        const state = controller.getState();
        expect(state.currentPattern?.name).toBe('Pattern 1');
      }
    });
  });
  
  describe('Note Editing', () => {
    beforeEach(() => {
      controller.init();
    });
    
    it('should set and get single notes', () => {
      controller.setNote(0, 0, 'C4');
      expect(controller.getNote(0, 0)).toBe('C4');
    });
    
    it('should set and get chords', () => {
      controller.setNote(0, 0, 'Am');
      expect(controller.getNote(0, 0)).toBe('Am');
    });
    
    it('should handle rests', () => {
      controller.setNote(0, 0, 'C4');
      controller.setNote(0, 0, '---');
      expect(controller.getNote(0, 0)).toBe('---');
    });
    
    it('should handle null/empty values', () => {
      controller.setNote(0, 0, 'C4');
      controller.setNote(0, 0, null);
      expect(controller.getNote(0, 0)).toBe('---');
    });
    
    it('should validate note format', () => {
      controller.setNote(0, 0, 'invalid');
      expect(controller.getNote(0, 0)).toBe('---');
    });
  });
  
  describe('Selection Management', () => {
    beforeEach(() => {
      controller.init();
    });
    
    it('should select cells', () => {
      controller.selectCell(2, 8);
      const cell = controller.getSelectedCell();
      
      expect(cell.channel).toBe(2);
      expect(cell.step).toBe(8);
    });
    
    it('should constrain selection to pattern bounds', () => {
      controller.selectCell(99, 99);
      const cell = controller.getSelectedCell();
      
      expect(cell.channel).toBeLessThan(4); // Default 4 channels
      expect(cell.step).toBeLessThan(16); // Default 16 steps
    });
    
    it('should move selection with arrow keys', () => {
      controller.selectCell(1, 1);
      
      controller.moveSelection(1, 0); // Right
      expect(controller.getSelectedCell()).toEqual({ channel: 2, step: 1 });
      
      controller.moveSelection(0, 1); // Down
      expect(controller.getSelectedCell()).toEqual({ channel: 2, step: 2 });
      
      controller.moveSelection(-1, 0); // Left
      expect(controller.getSelectedCell()).toEqual({ channel: 1, step: 2 });
      
      controller.moveSelection(0, -1); // Up
      expect(controller.getSelectedCell()).toEqual({ channel: 1, step: 1 });
    });
    
    it('should not move selection beyond bounds', () => {
      controller.selectCell(0, 0);
      
      controller.moveSelection(-1, -1);
      expect(controller.getSelectedCell()).toEqual({ channel: 0, step: 0 });
      
      controller.selectCell(3, 15); // Assuming 4 channels, 16 steps
      controller.moveSelection(1, 1);
      expect(controller.getSelectedCell()).toEqual({ channel: 3, step: 15 });
    });
  });
  
  describe('Playback Control', () => {
    beforeEach(() => {
      controller.init();
    });
    
    it('should set and get BPM', () => {
      controller.setBPM(140);
      const state = controller.getState();
      expect(state.bpm).toBe(140);
    });
    
    it('should start and stop playback', (done) => {
      let stepCount = 0;
      
      controller.init({
        onStepChange: (step) => {
          stepCount++;
          if (stepCount >= 2) {
            controller.stop();
            const state = controller.getState();
            expect(state.isPlaying).toBe(false);
            done();
          }
        }
      });
      
      controller.play();
      const state = controller.getState();
      expect(state.isPlaying).toBe(true);
    });
    
    it('should trigger note callbacks', (done) => {
      controller.setNote(0, 0, 'C4');
      
      controller.init({
        onNotePlay: (channel, note) => {
          expect(channel).toBe(0);
          expect(note.pitch).toBe('C4');
          controller.stop();
          done();
        }
      });
      
      controller.play();
    });
  });
  
  describe('Channel Configuration', () => {
    beforeEach(() => {
      controller.init();
    });
    
    it('should set channel voice', () => {
      controller.setChannelVoice(0, 'lead');
      const state = controller.getState();
      expect(state.currentPattern?.channels[0].voice).toBe('lead');
    });
    
    it('should validate voice types', () => {
      controller.setChannelVoice(0, 'invalid');
      const state = controller.getState();
      expect(state.currentPattern?.channels[0].voice).toBe('choir'); // Default
    });
    
    it('should set channel mute', () => {
      controller.setChannelMute(0, true);
      const state = controller.getState();
      expect(state.currentPattern?.channels[0].muted).toBe(true);
      
      controller.setChannelMute(0, false);
      const state2 = controller.getState();
      expect(state2.currentPattern?.channels[0].muted).toBe(false);
    });
    
    it('should set channel solo', () => {
      controller.setChannelSolo(1, true);
      const state = controller.getState();
      expect(state.currentPattern?.channels[1].solo).toBe(true);
    });
  });
  
  describe('Pattern Bank', () => {
    beforeEach(() => {
      controller.init();
    });
    
    it('should list all patterns', () => {
      controller.createPattern('Pattern 1', 16);
      controller.createPattern('Pattern 2', 32);
      
      const bank = controller.getPatternBank();
      expect(bank.length).toBeGreaterThanOrEqual(3); // Default + 2 new
    });
    
    it('should delete patterns', () => {
      controller.createPattern('To Delete', 16);
      const state = controller.getState();
      const patternId = state.currentPattern?.id;
      
      controller.createPattern('Current', 16); // Switch away
      
      if (patternId) {
        const success = controller.deletePattern(patternId);
        expect(success).toBe(true);
      }
    });
  });
  
  describe('Import/Export', () => {
    beforeEach(() => {
      controller.init();
    });
    
    it('should export current pattern', () => {
      controller.setNote(0, 0, 'C4');
      controller.setNote(1, 4, 'G3');
      
      const json = controller.exportPattern();
      expect(json).not.toBeNull();
      
      const parsed = JSON.parse(json!);
      expect(parsed.channels).toBeDefined();
    });
    
    it('should import pattern from JSON', () => {
      const json = controller.exportPattern();
      if (!json) throw new Error('No pattern to export');
      
      const parsed = JSON.parse(json);
      parsed.id = 'imported';
      parsed.name = 'Imported';
      
      const success = controller.importPattern(JSON.stringify(parsed));
      expect(success).toBe(true);
      
      controller.loadPattern('imported');
      const state = controller.getState();
      expect(state.currentPattern?.name).toBe('Imported');
    });
  });
  
  describe('Note Preview', () => {
    beforeEach(() => {
      controller.init();
    });
    
    it('should preview single notes', () => {
      expect(() => controller.previewNote(0, 'C4')).not.toThrow();
    });
    
    it('should preview chords', () => {
      expect(() => controller.previewNote(0, 'Am')).not.toThrow();
    });
    
    it('should handle invalid notes gracefully', () => {
      expect(() => controller.previewNote(0, 'invalid')).not.toThrow();
    });
  });
  
  describe('State Change Notifications', () => {
    it('should notify on pattern changes', (done) => {
      controller.init({
        onStateChange: (state) => {
          if (state.currentPattern?.name === 'New Pattern') {
            done();
          }
        }
      });
      
      controller.createPattern('New Pattern', 16);
    });
    
    it('should notify on note changes', (done) => {
      let changeCount = 0;
      
      controller.init({
        onStateChange: (state) => {
          changeCount++;
          if (changeCount === 2) { // Init + setNote
            done();
          }
        }
      });
      
      controller.setNote(0, 0, 'C4');
    });
  });
});