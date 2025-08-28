import { describe, expect, it } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import Encyclopaedia from "../../src/dmg/encyclopaedia";

describe("Mentalist and Trickster Abilities", () => {
  describe("Mentalist", () => {
    it("should be able to levitate", () => {
      const sim = new Simulator(20, 20);
      
      const mentalist = Encyclopaedia.unit('mentalist');
      mentalist.pos = { x: 10, y: 10 };
      
      sim.addUnit(mentalist);
      
      // Run simulation to trigger levitate
      sim.step();
      
      // Check if mentalist has flying status
      const unit = sim.units.find(u => u.id === mentalist.id);
      expect(unit).toBeDefined();
      expect(unit?.meta?.flying).toBe(true);
      expect(unit?.meta?.flyingHeight).toBe(3);
    });
    
    it("should have mind control ability", () => {
      const sim = new Simulator(20, 20);
      
      const mentalist = Encyclopaedia.unit('mentalist');
      mentalist.pos = { x: 5, y: 10 };
      
      const enemy = Encyclopaedia.unit('skeleton');
      enemy.pos = { x: 8, y: 10 };
      enemy.team = 'hostile';
      
      sim.addUnit(mentalist);
      sim.addUnit(enemy);
      
      // Verify abilities are loaded
      expect(mentalist.abilities).toContain('mind_control');
      expect(mentalist.abilities).toContain('levitate');
    });
  });
  
  describe("Trickster", () => {
    it("should have blink ability", () => {
      const sim = new Simulator(20, 20);
      
      const trickster = Encyclopaedia.unit('trickster');
      trickster.pos = { x: 10, y: 10 };
      
      const enemy = Encyclopaedia.unit('skeleton');
      enemy.pos = { x: 11, y: 10 };  // Very close to trigger blink
      enemy.team = 'hostile';
      
      sim.addUnit(trickster);
      sim.addUnit(enemy);
      
      const originalPos = { ...trickster.pos };
      
      // Run simulation - blink should trigger when enemy is close
      for (let i = 0; i < 5; i++) {
        sim.step();
      }
      
      // Trickster might have moved (blinked)
      const unit = sim.units.find(u => u.id === trickster.id);
      expect(unit).toBeDefined();
      
      // Verify abilities
      expect(trickster.abilities).toContain('blink');
      expect(trickster.abilities).toContain('confuse');
    });
  });
  
  describe("Integration", () => {
    it("should allow both units to coexist", () => {
      const sim = new Simulator(30, 30);
      
      const mentalist = Encyclopaedia.unit('mentalist');
      mentalist.pos = { x: 5, y: 15 };
      
      const trickster = Encyclopaedia.unit('trickster');
      trickster.pos = { x: 25, y: 15 };
      
      sim.addUnit(mentalist);
      sim.addUnit(trickster);
      
      // Run a few steps
      for (let i = 0; i < 3; i++) {
        sim.step();
      }
      
      // Both should still exist
      expect(sim.units.length).toBe(2);
      expect(sim.units.some(u => u.abilities?.includes('levitate'))).toBe(true);
      expect(sim.units.some(u => u.abilities?.includes('blink'))).toBe(true);
    });
  });
});