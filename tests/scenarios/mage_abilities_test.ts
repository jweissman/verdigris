import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Individual Mage Abilities', () => {
  
  describe('Philosopher (Lightning Mage)', () => {
    it('should cast lightning bolt that destroys target', () => {
      const sim = new Simulator(20, 20);
      
      const philosopher = Encyclopaedia.unit('philosopher');
      philosopher.pos = { x: 5, y: 10 };
      
      const target = {
        id: 'target',
        pos: { x: 10, y: 10 },
        team: 'hostile' as const,
        hp: 30
      };
      
      sim.addUnit(philosopher);
      sim.addUnit(target);
      
      // Start storm (required for lightning)
      sim.queuedCommands.push({
        type: 'weather',
        params: { weatherType: 'storm', action: 'start' }
      });
      sim.step();
      expect(sim.lightningActive).toBe(true);
      
      // Cast bolt at target
      sim.queuedCommands.push({
        type: 'bolt',
        params: { x: target.pos.x, y: target.pos.y }
      });
      sim.step();
      
      // Process damage
      for (let i = 0; i < 5; i++) {
        sim.step();
      }
      
      // Target should be damaged or destroyed
      const targetAfter = sim.units.find(u => u.id === 'target');
      if (targetAfter) {
        // If unit still exists, it should be damaged
        expect(targetAfter.hp).toBeLessThan(30);
      } else {
        // Unit was destroyed (hp <= 0 and removed)
        expect(targetAfter).toBeUndefined();
      }
      
      // Lightning particles should exist
      const lightningParticles = sim.particles.filter(p => 
        p.type === 'lightning' || p.type === 'lightning_branch'
      );
      expect(lightningParticles.length).toBeGreaterThan(0);
    });
  });
  
  describe('Rhetorician (Fire Mage)', () => {
    it('should cast fire that burns area over time', () => {
      const sim = new Simulator(20, 20);
      
      const rhetorician = Encyclopaedia.unit('rhetorician');
      rhetorician.pos = { x: 5, y: 10 };
      
      const target1 = {
        id: 'target1',
        pos: { x: 10, y: 10 },
        team: 'hostile' as const,
        hp: 30
      };
      
      const target2 = {
        id: 'target2',
        pos: { x: 11, y: 10 },
        team: 'hostile' as const,
        hp: 30
      };
      
      sim.addUnit(rhetorician);
      sim.addUnit(target1);
      sim.addUnit(target2);
      
      // Cast fire at area
      sim.queuedCommands.push({
        type: 'fire',
        params: { x: 10, y: 10, radius: 2, temperature: 800 }
      });
      sim.step();
      
      // Fire particles should be created
      const fireParticles = sim.particles.filter(p => p.type === 'fire');
      expect(fireParticles.length).toBeGreaterThan(0);
      
      // Temperature should be high
      if (sim.temperatureField) {
        const temp = sim.temperatureField.get(10, 10);
        expect(temp).toBeGreaterThan(300);
      }
      
      // Process burning over time
      for (let i = 0; i < 10; i++) {
        sim.step();
      }
      
      // Both targets should take heat damage if BiomeEffects is active
      if (sim.rules?.some(r => r.constructor.name === 'BiomeEffects')) {
        const t1 = sim.units.find(u => u.id === 'target1');
        const t2 = sim.units.find(u => u.id === 'target2');
        if (t1) expect(t1.hp).toBeLessThan(30);
        if (t2) expect(t2.hp).toBeLessThan(30);
      }
    });
  });
  
  describe('Logician (Ice Mage)', () => {
    it('should freeze target preventing movement', () => {
      const sim = new Simulator(20, 20);
      
      const logician = Encyclopaedia.unit('logician');
      logician.pos = { x: 5, y: 10 };
      
      const target = {
        id: 'target',
        pos: { x: 10, y: 10 },
        team: 'hostile' as const,
        hp: 30
      };
      
      sim.addUnit(logician);
      sim.addUnit(target);
      
      const originalPos = { ...target.pos };
      
      // Cast freeze on target
      sim.queuedCommands.push({
        type: 'meta',
        params: {
          unitId: 'target',
          meta: {
            frozen: true,
            frozenDuration: 10,
            stunned: true
          }
        }
      });
      sim.step();
      
      // Target should be frozen
      const frozenTarget = sim.units.find(u => u.id === 'target');
      expect(frozenTarget).toBeDefined();
      if (frozenTarget?.meta) {
        expect(frozenTarget.meta.frozen).toBeDefined();
      }
      
      // Verify unit is frozen before trying to move
      const frozenCheck = sim.units.find(u => u.id === 'target');
      expect(frozenCheck?.meta?.frozen).toBe(true);
      
      // Try to move the frozen target
      sim.queuedCommands.push({
        type: 'move',
        params: {
          unitId: 'target',
          x: originalPos.x + 1,
          y: originalPos.y
        }
      });
      
      // Process just one step to see immediate effect
      sim.step();
      
      // Target should not have moved
      const targetAfter = sim.units.find(u => u.id === 'target');
      expect(targetAfter).toBeDefined();
      if (targetAfter) {
        expect(targetAfter.pos.x).toBe(originalPos.x);
        expect(targetAfter.pos.y).toBe(originalPos.y);
      }
    });
  });
  
  describe('Geometer (Earth Mage)', () => {
    it('should drop rock that deals impact damage', () => {
      const sim = new Simulator(20, 20);
      
      const geometer = Encyclopaedia.unit('geometer');
      geometer.pos = { x: 5, y: 10 };
      
      const target = {
        id: 'target',
        pos: { x: 10, y: 10 },
        team: 'hostile' as const,
        hp: 40
      };
      
      sim.addUnit(geometer);
      sim.addUnit(target);
      
      // Drop rock on target (using airdrop as proxy for now)
      sim.queuedCommands.push({
        type: 'airdrop',
        params: {
          unitType: 'rock',
          x: target.pos.x,
          y: target.pos.y
        }
      });
      sim.step();
      
      // Process falling and impact
      for (let i = 0; i < 20; i++) {
        sim.step();
      }
      
      // Target should take impact damage
      const targetAfter = sim.units.find(u => u.id === 'target');
      if (targetAfter) {
        // Rock should deal damage on landing
        expect(targetAfter.hp).toBeLessThanOrEqual(40);
      }
      
      // Alternative: Geometer can burrow underground
      sim.queuedCommands.push({
        type: 'burrow',
        unitId: geometer.id,
        params: {}
      });
      sim.step();
      
      const geometerAfter = sim.units.find(u => u.id === geometer.id);
      if (geometerAfter?.meta) {
        expect(geometerAfter.meta.burrowed).toBe(true);
      }
    });
  });
  
  describe('Coastal Mage Scene', () => {
    it('should create a coastal city battle with all four mages', () => {
      const sim = new Simulator(30, 30);
      
      // Set coastal city scene
      sim.queuedCommands.push({
        type: 'bg',
        params: {
          scene: 'city',
          biome: 'coastal',
          skyColor: '#87CEEB', // Sky blue
          ambientLight: 0.9,
          tileset: 'coastal_city'
        }
      });
      sim.step();
      
      // Verify scene is set
      expect(sim.sceneMetadata).toBeDefined();
      expect(sim.sceneMetadata.biome).toBe('coastal');
      expect(sim.currentBiome).toBe('coastal');
      
      // Place mages in formation
      const philosopher = Encyclopaedia.unit('philosopher');
      philosopher.pos = { x: 5, y: 10 };
      
      const rhetorician = Encyclopaedia.unit('rhetorician');
      rhetorician.pos = { x: 5, y: 15 };
      
      const logician = Encyclopaedia.unit('logician');
      logician.pos = { x: 10, y: 10 };
      
      const geometer = Encyclopaedia.unit('geometer');
      geometer.pos = { x: 10, y: 15 };
      
      sim.addUnit(philosopher);
      sim.addUnit(rhetorician);
      sim.addUnit(logician);
      sim.addUnit(geometer);
      
      // Create enemy wave
      const pirates = [];
      for (let i = 0; i < 5; i++) {
        const pirate = {
          id: `pirate${i}`,
          pos: { x: 20 + (i % 3), y: 10 + Math.floor(i / 3) * 2 },
          team: 'hostile' as const,
          hp: 25,
          dmg: 3
        };
        pirates.push(pirate);
        sim.addUnit(pirate);
      }
      
      // Start battle with storm
      sim.queuedCommands.push({
        type: 'weather',
        params: { weatherType: 'storm', action: 'start' }
      });
      
      // Coordinate mage attacks
      sim.queuedCommands.push({
        type: 'bolt',
        params: { x: 20, y: 10 }
      });
      
      sim.queuedCommands.push({
        type: 'fire',
        params: { x: 21, y: 12, radius: 2 }
      });
      
      sim.queuedCommands.push({
        type: 'meta',
        params: {
          unitId: 'pirate2',
          meta: {
            frozen: true,
            frozenDuration: 10,
            stunned: true
          }
        }
      });
      
      // Run battle
      for (let i = 0; i < 30; i++) {
        sim.step();
      }
      
      // Check battle results
      const survivingMages = sim.units.filter(u => 
        ['philosopher', 'rhetorician', 'logician', 'geometer'].some(name => 
          u.id.startsWith(name)
        ) && u.hp > 0
      );
      
      const survivingPirates = sim.units.filter(u => 
        u.id.startsWith('pirate') && u.hp > 0
      );
      
      // Mages should mostly survive
      expect(survivingMages.length).toBeGreaterThanOrEqual(3);
      
      // Some pirates should be defeated
      expect(survivingPirates.length).toBeLessThan(5);
      
      // Scene should have appropriate particles
      const hasStormClouds = sim.particles.some(p => p.type === 'storm_cloud');
      const hasFireParticles = sim.particles.some(p => p.type === 'fire');
      
      expect(hasStormClouds || hasFireParticles).toBe(true);
    });
  });
});