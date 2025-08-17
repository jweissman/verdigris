import { describe, it, expect, beforeEach } from 'bun:test';
import { AudioWorkstation, Pattern, Note, VoiceType } from '../../src/audio/audio_workstation';

describe.skip('AudioWorkstation', () => {
  let workstation: AudioWorkstation;
  
  beforeEach(() => {
    workstation = new AudioWorkstation();
  });
  
  describe('Pattern Management', () => {
    it('should initialize with a default pattern', () => {
      const pattern = workstation.getCurrentPattern();
      expect(pattern).not.toBeNull();
      expect(pattern?.name).toBe('default');
      expect(pattern?.length).toBe(16);
      expect(pattern?.channels.length).toBe(4);
    });
    
    it('should create patterns with specified parameters', () => {
      const pattern = workstation.createPattern('test', 32, 8);
      expect(pattern.name).toBe('test');
      expect(pattern.length).toBe(32);
      expect(pattern.channels.length).toBe(8);
      expect(pattern.id).toContain('pattern-');
    });
    
    it('should assign default voices to channels', () => {
      const pattern = workstation.createPattern('test', 16, 4);
      expect(pattern.channels[0].voice).toBe('choir');
      expect(pattern.channels[1].voice).toBe('bass');
      expect(pattern.channels[2].voice).toBe('pluck');
      expect(pattern.channels[3].voice).toBe('lead');
    });
    
    it('should load patterns by id', () => {
      const pattern = workstation.createPattern('new', 16);
      workstation.loadPattern(pattern.id);
      
      const current = workstation.getCurrentPattern();
      expect(current?.id).toBe(pattern.id);
    });
    
    it('should return false when loading non-existent pattern', () => {
      const result = workstation.loadPattern('non-existent');
      expect(result).toBe(false);
    });
    
    it('should copy patterns', () => {
      const pattern = workstation.getCurrentPattern();
      if (!pattern) throw new Error('No current pattern');
      
      const copied = workstation.copyPattern(pattern.id, 'copy-id');
      expect(copied).toBe(true);
      
      workstation.loadPattern('copy-id');
      const copy = workstation.getCurrentPattern();
      expect(copy?.name).toContain('(copy)');
    });
    
    it('should clear all notes in pattern', () => {

      workstation.setNote(0, 0, { pitch: 'C4', velocity: 0.8, gate: 1 });
      workstation.setNote(1, 4, { pitch: 'G3', velocity: 0.7, gate: 2 });
      
      workstation.clearPattern();
      
      expect(workstation.getNote(0, 0)).toBeNull();
      expect(workstation.getNote(1, 4)).toBeNull();
    });
    
    it('should export pattern as JSON', () => {
      const pattern = workstation.getCurrentPattern();
      if (!pattern) throw new Error('No current pattern');
      
      const json = workstation.exportPattern(pattern.id);
      expect(json).not.toBeNull();
      
      const parsed = JSON.parse(json!);
      expect(parsed.id).toBe(pattern.id);
      expect(parsed.channels).toBeDefined();
    });
    
    it('should import pattern from JSON', () => {
      const pattern = workstation.getCurrentPattern();
      if (!pattern) throw new Error('No current pattern');
      
      const json = workstation.exportPattern(pattern.id);
      const modified = JSON.parse(json!);
      modified.id = 'imported';
      modified.name = 'Imported Pattern';
      
      const success = workstation.importPattern(JSON.stringify(modified));
      expect(success).toBe(true);
      
      workstation.loadPattern('imported');
      const imported = workstation.getCurrentPattern();
      expect(imported?.name).toBe('Imported Pattern');
    });
  });
  
  describe('Note Management', () => {
    it('should set and get notes', () => {
      const note: Note = { pitch: 'C4', velocity: 0.8, gate: 1 };
      
      const success = workstation.setNote(0, 0, note);
      expect(success).toBe(true);
      
      const retrieved = workstation.getNote(0, 0);
      expect(retrieved).toEqual(note);
    });
    
    it('should handle null notes (rests)', () => {
      workstation.setNote(0, 0, null);
      const note = workstation.getNote(0, 0);
      expect(note).toBeNull();
    });
    
    it('should validate channel index', () => {
      const note: Note = { pitch: 'C4', velocity: 0.8, gate: 1 };
      
      const success = workstation.setNote(99, 0, note);
      expect(success).toBe(false);
      
      const retrieved = workstation.getNote(99, 0);
      expect(retrieved).toBeNull();
    });
    
    it('should validate step index', () => {
      const note: Note = { pitch: 'C4', velocity: 0.8, gate: 1 };
      
      const success = workstation.setNote(0, 99, note);
      expect(success).toBe(false);
      
      const retrieved = workstation.getNote(0, 99);
      expect(retrieved).toBeNull();
    });
  });
  
  describe('Channel Configuration', () => {
    it('should change channel voice', () => {
      const success = workstation.setChannelVoice(0, 'lead');
      expect(success).toBe(true);
      
      const pattern = workstation.getCurrentPattern();
      expect(pattern?.channels[0].voice).toBe('lead');
    });
    
    it('should handle invalid channel index', () => {
      const success = workstation.setChannelVoice(99, 'lead');
      expect(success).toBe(false);
    });
    
    it('should initialize channels with proper defaults', () => {
      const pattern = workstation.getCurrentPattern();
      if (!pattern) throw new Error('No current pattern');
      
      const channel = pattern.channels[0];
      expect(channel.muted).toBe(false);
      expect(channel.solo).toBe(false);
      expect(channel.volume).toBe(0.8);
      expect(channel.notes.length).toBe(pattern.length);
    });
  });
  
  describe('Playback Control', () => {
    it('should set and get BPM', () => {
      workstation.setBPM(140);
      expect(workstation.getBPM()).toBe(140);
    });
    
    it('should clamp BPM to valid range', () => {
      workstation.setBPM(30);
      expect(workstation.getBPM()).toBe(60);
      
      workstation.setBPM(300);
      expect(workstation.getBPM()).toBe(240);
    });
    
    it('should track playback state', () => {
      const state = workstation.getPlaybackState();
      expect(state.playing).toBe(false);
      expect(state.position).toBe(0);
      expect(state.bpm).toBe(120);
    });
    
    it('should start and stop playback', (done) => {
      let stepCount = 0;
      
      workstation.play((step) => {
        stepCount++;
        if (stepCount >= 2) {
          workstation.stop();
          const state = workstation.getPlaybackState();
          expect(state.playing).toBe(false);
          done();
        }
      });
      
      const state = workstation.getPlaybackState();
      expect(state.playing).toBe(true);
    });
    
    it('should trigger note callbacks during playback', (done) => {
      const note: Note = { pitch: 'C4', velocity: 0.8, gate: 1 };
      workstation.setNote(0, 0, note);
      
      workstation.play(undefined, (channel, playedNote) => {
        expect(channel.voice).toBe('choir');
        expect(playedNote).toEqual(note);
        workstation.stop();
        done();
      });
    });
    
    it('should respect mute state', (done) => {
      const pattern = workstation.getCurrentPattern();
      if (!pattern) throw new Error('No current pattern');
      
      pattern.channels[0].muted = true;
      workstation.setNote(0, 0, { pitch: 'C4', velocity: 0.8, gate: 1 });
      
      let triggered = false;
      workstation.play(undefined, () => {
        triggered = true;
      });
      
      setTimeout(() => {
        workstation.stop();
        expect(triggered).toBe(false);
        done();
      }, 100);
    });
    
    it('should respect solo state', (done) => {
      const pattern = workstation.getCurrentPattern();
      if (!pattern) throw new Error('No current pattern');
      
      pattern.channels[1].solo = true;
      workstation.setNote(0, 0, { pitch: 'C4', velocity: 0.8, gate: 1 });
      workstation.setNote(1, 0, { pitch: 'G3', velocity: 0.8, gate: 1 });
      
      const playedChannels: number[] = [];
      
      workstation.play(undefined, (channel) => {
        const index = pattern.channels.indexOf(channel);
        playedChannels.push(index);
      });
      
      setTimeout(() => {
        workstation.stop();
        expect(playedChannels).toContain(1); // Solo channel
        expect(playedChannels).not.toContain(0); // Non-solo channel
        done();
      }, 100);
    });
  });
  
  describe('Pattern Bank', () => {
    it('should list all patterns', () => {
      workstation.createPattern('pattern1', 16);
      workstation.createPattern('pattern2', 32);
      
      const bank = workstation.getPatternBank();
      expect(bank.length).toBeGreaterThanOrEqual(3);
    });
    
    it('should delete patterns except current', () => {
      const pattern = workstation.createPattern('to-delete', 16);
      const patternId = pattern.id;
      
      const deleted = workstation.deletePattern(patternId);
      expect(deleted).toBe(true);
      
      const loaded = workstation.loadPattern(patternId);
      expect(loaded).toBe(false);
    });
    
    it('should not delete current pattern', () => {
      const pattern = workstation.getCurrentPattern();
      if (!pattern) throw new Error('No current pattern');
      
      const deleted = workstation.deletePattern(pattern.id);
      expect(deleted).toBe(false);
    });
  });
  
  describe('Chord Parsing', () => {
    it('should parse major chords', () => {
      const notes = AudioWorkstation.parseChord('C');
      expect(notes).toEqual(['C', 'E', 'G']);
    });
    
    it('should parse minor chords', () => {
      const notes = AudioWorkstation.parseChord('Am');
      expect(notes).toEqual(['A', 'C', 'E']);
    });
    
    it('should parse 7th chords', () => {
      const notes = AudioWorkstation.parseChord('G7');
      expect(notes).toEqual(['G', 'B', 'D', 'F']);
    });
    
    it('should parse major 7th chords', () => {
      const notes = AudioWorkstation.parseChord('Cmaj7');
      expect(notes).toEqual(['C', 'E', 'G', 'B']);
    });
    
    it('should handle sharps', () => {
      const notes = AudioWorkstation.parseChord('F#m');
      expect(notes).toEqual(['F#', 'A', 'C#']);
    });
    
    it('should handle flats', () => {
      const notes = AudioWorkstation.parseChord('Bb');
      expect(notes).toEqual(['A#', 'D', 'F']); // Converts to sharp internally
    });
    
    it('should parse diminished chords', () => {
      const notes = AudioWorkstation.parseChord('Bdim');
      expect(notes).toEqual(['B', 'D', 'F']);
    });
    
    it('should parse augmented chords', () => {
      const notes = AudioWorkstation.parseChord('Caug');
      expect(notes).toEqual(['C', 'E', 'G#']);
    });
    
    it('should parse suspended chords', () => {
      const sus2 = AudioWorkstation.parseChord('Csus2');
      expect(sus2).toEqual(['C', 'D', 'G']);
      
      const sus4 = AudioWorkstation.parseChord('Csus4');
      expect(sus4).toEqual(['C', 'F', 'G']);
    });
    
    it('should return null for invalid chords', () => {
      const notes = AudioWorkstation.parseChord('invalid');
      expect(notes).toBeNull();
    });
  });
  
  describe('Note to Frequency Conversion', () => {
    it('should convert notes to frequencies', () => {
      expect(AudioWorkstation.noteToFrequency('A', 4)).toBeCloseTo(440, 1);
      expect(AudioWorkstation.noteToFrequency('C', 4)).toBeCloseTo(261.63, 1);
      expect(AudioWorkstation.noteToFrequency('C', 5)).toBeCloseTo(523.25, 1);
    });
    
    it('should handle different octaves', () => {
      const c3 = AudioWorkstation.noteToFrequency('C', 3);
      const c4 = AudioWorkstation.noteToFrequency('C', 4);
      const c5 = AudioWorkstation.noteToFrequency('C', 5);
      
      expect(c4).toBeCloseTo(c3 * 2, 1);
      expect(c5).toBeCloseTo(c4 * 2, 1);
    });
    
    it('should handle sharps and flats', () => {
      const cSharp = AudioWorkstation.noteToFrequency('C#', 4);
      const dFlat = AudioWorkstation.noteToFrequency('Db', 4);
      
      expect(cSharp).toBe(dFlat);
      expect(cSharp).toBeCloseTo(277.18, 1);
    });
    
    it('should return 0 for invalid notes', () => {
      expect(AudioWorkstation.noteToFrequency('X', 4)).toBe(0);
    });
  });
});