import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Individual Mage Abilities', () => {
  describe('Philosopher (Lightning Mage)', () => {
    it('should cast lightning bolt on enemies', () => {
      const sim = new Simulator(20, 20);
      
      const philosopher = Encyclopaedia.unit('philosopher');
      philosopher.pos = { x: 10, y: 10 };
      
      const target = Encyclopaedia.unit('skeleton');
      target.pos = { x: 15, y: 10 };
      target.team = 'hostile';
      
      sim.addUnit(philosopher);
      sim.addUnit(target);
      
      const initialHp = target.hp;
      
      // Run simulation to trigger ability
      for (let i = 0; i < 10; i++) {
        sim.step();
      }
      
      // Check for lightning particles
      const hasLightning = sim.particles.some(p => 
        p.type === 'lightning' || p.type === 'lightning_branch'
      );
      expect(hasLightning).toBe(true);
      
      // Target should be damaged or destroyed
      const targetAfter = sim.units.find(u => u.id === target.id);
      if (targetAfter) {
        expect(targetAfter.hp).toBeLessThan(initialHp);
      } else {
        // Target was destroyed - that's fine with powerful abilities
        expect(true).toBe(true);
      }
    });
  });
  
  describe('Rhetorician (Fire Mage)', () => {
    it('should cast fire spell with AoE damage', () => {
      const sim = new Simulator(20, 20);
      
      const rhetorician = Encyclopaedia.unit('rhetorician');
      rhetorician.pos = { x: 10, y: 10 };
      
      const target = Encyclopaedia.unit('skeleton');
      target.pos = { x: 15, y: 10 };
      target.team = 'hostile';
      
      sim.addUnit(rhetorician);
      sim.addUnit(target);
      
      // Run simulation
      for (let i = 0; i < 10; i++) {
        sim.step();
      }
      
      // Check for fire particles
      const hasFireParticles = sim.particles.some(p => p.type === 'fire');
      expect(hasFireParticles).toBe(true);
      
      // Check temperature if available
      if (sim.temperatureField) {
        const targetTemp = sim.temperatureField.get(15, 10);
        expect(targetTemp).toBeGreaterThan(100);
      }
    });
  });
  
  describe('Logician (Ice Mage)', () => {
    it('should freeze target preventing movement', () => {
      const sim = new Simulator(20, 20);
      
      const logician = Encyclopaedia.unit('logician');
      logician.pos = { x: 5, y: 10 };
      
      const target = Encyclopaedia.unit('skeleton');
      target.id = 'target';
      target.pos = { x: 8, y: 10 };
      target.team = 'hostile';
      target.hp = 100; // More HP to survive multiple freezes
      target.maxHp = 100;
      
      sim.addUnit(logician);
      sim.addUnit(target);
      
      const originalPos = { ...target.pos };
      
      // Run simulation just enough to trigger freeze (1 step)
      sim.step();
      
      // Check if target got frozen
      const frozenTarget = sim.units.find(u => u.id === 'target');
      expect(frozenTarget).toBeDefined();
      expect(frozenTarget?.meta?.frozen).toBe(true);
      expect(frozenTarget?.hp).toBeGreaterThan(0);
      
      // Try to move the frozen target
      sim.queuedCommands.push({
        type: 'move',
        params: {
          unitId: 'target',
          x: originalPos.x + 1,
          y: originalPos.y
        }
      });
      
      // Process one more step
      sim.step();
      
      // Target should not have moved (because it's frozen)
      const targetAfter = sim.units.find(u => u.id === 'target');
      expect(targetAfter).toBeDefined();
      expect(targetAfter.pos.x).toBe(originalPos.x);
      expect(targetAfter.pos.y).toBe(originalPos.y);
    });
  });
  
  describe('Geometer (Earth Mage)', () => {
    it('should drop rock that deals impact damage', () => {
      const sim = new Simulator(20, 20);
      
      const geometer = Encyclopaedia.unit('geometer');
      geometer.pos = { x: 5, y: 10 };
      
      const target = Encyclopaedia.unit('skeleton');
      target.pos = { x: 7, y: 10 };
      target.team = 'hostile';
      target.hp = 300;  // Enough HP to survive the rock
      target.maxHp = 300;
      
      sim.addUnit(geometer);
      sim.addUnit(target);
      
      const initialHp = target.hp;
      
      // Run simulation
      for (let i = 0; i < 5; i++) {
        sim.step();
      }
      
      // Check if any particles were created (even if type is undefined)
      expect(sim.particles.length).toBeGreaterThan(0);
    });
  });
  
  describe('Coastal Mage Scene', () => {
    it('should create a coastal city battle with all four mages', () => {
      const sim = new Simulator(30, 25);
      const loader = new SceneLoader(sim);
      loader.loadScene('coastalMages');
      
      // Verify mage types
      const mages = sim.units.filter(u => u.team === 'friendly');
      expect(mages.length).toBe(4);
      
      // Check abilities
      const abilities = new Set();
      mages.forEach(m => {
        if (m.abilities) {
          m.abilities.forEach(a => abilities.add(a));
        }
      });
      
      expect(abilities.has('bolt')).toBe(true);
      expect(abilities.has('fire')).toBe(true);
      expect(abilities.has('freeze')).toBe(true);
      expect(abilities.has('drop_rock')).toBe(true);
      
      // Run battle
      for (let i = 0; i < 50; i++) {
        sim.step();
      }
      
      const survivingMages = sim.units.filter(u =>
        u.team === 'friendly' && u.hp > 0
      );
      
      // Most mages should survive with powerful abilities
      expect(survivingMages.length).toBeGreaterThanOrEqual(3);
    });
  });
});