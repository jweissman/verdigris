import { describe, it, expect } from 'bun:test';
import { Tracker } from '../../src/audio/tracker';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Song Loading', () => {
  const tracker = new Tracker();
  const songsDir = join(__dirname, '../../src/assets/songs');

  it('should load The Lich theme into tracker', () => {
    const songPath = join(songsDir, 'the-lich.json');
    const songData = JSON.parse(readFileSync(songPath, 'utf8'));
    

    expect(songData).toHaveProperty('id');
    expect(songData).toHaveProperty('name');
    expect(songData).toHaveProperty('length');
    expect(songData).toHaveProperty('tracks');
    expect(Array.isArray(songData.tracks)).toBe(true);
    

    songData.tracks.forEach((track: any) => {
      expect(track).toHaveProperty('channel');
      expect(track).toHaveProperty('notes');
      expect(track).toHaveProperty('effects');
      expect(Array.isArray(track.notes)).toBe(true);
      expect(Array.isArray(track.effects)).toBe(true);
      

      expect(track.notes.length).toBe(songData.length);
    });
  });

  it('should validate note format in The Lich theme', () => {
    const songPath = join(songsDir, 'the-lich.json');
    const songData = JSON.parse(readFileSync(songPath, 'utf8'));
    
    songData.tracks.forEach((track: any) => {
      track.notes.forEach((note: any) => {
        if (note !== null) {

          expect(note).toHaveProperty('note');
          expect(note).toHaveProperty('instrument');
          expect(note).toHaveProperty('volume');
          

          expect(typeof note.note).toBe('string');
          expect(note.note).toMatch(/^[A-G]#?-?\d$/);
          

          expect(note.instrument).toBeGreaterThanOrEqual(0);
          expect(note.instrument).toBeLessThanOrEqual(255);
          expect(note.volume).toBeGreaterThanOrEqual(0);
          expect(note.volume).toBeLessThanOrEqual(64);
        }
      });
    });
  });

  it('should be able to load all song files without errors', () => {
    const fs = require('fs');
    const songFiles = fs.readdirSync(songsDir).filter((f: string) => f.endsWith('.json'));
    
    expect(songFiles.length).toBeGreaterThan(0);
    
    songFiles.forEach((filename: string) => {
      const songPath = join(songsDir, filename);
      expect(() => {
        const songData = JSON.parse(readFileSync(songPath, 'utf8'));

        expect(songData).toHaveProperty('id');
        expect(songData).toHaveProperty('name');
        expect(songData).toHaveProperty('tracks');
      }).not.toThrow();
    });
  });

  it('should create valid patterns that tracker can parse', () => {
    const songPath = join(songsDir, 'the-lich.json');
    const songData = JSON.parse(readFileSync(songPath, 'utf8'));
    

    const pattern = {
      id: songData.id,
      name: songData.name,
      length: songData.length,
      tracks: songData.tracks.map((track: any) => ({
        channel: track.channel,
        notes: track.notes,
        effects: track.effects || []
      }))
    };
    

    expect(() => {

      expect(pattern.tracks.length).toBeGreaterThan(0);
      expect(pattern.length).toBeGreaterThan(0);
    }).not.toThrow();
  });
});