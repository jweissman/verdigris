import { describe, test, expect, beforeEach } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { HeroCommand } from '../../src/commands/hero_command';
import { EventHandler } from '../../src/rules/event_handler';
import { HeroAnimation } from '../../src/rules/hero_animation';
import { MeleeCombat } from '../../src/rules/melee_combat';
import { Hunting } from '../../src/rules/hunting';

describe('Hero Combat', () => {
  let sim: Simulator;
  
  beforeEach(() => {
    sim = new Simulator(20, 20);
    sim.rulebook.push(new HeroAnimation());
    sim.rulebook.push(new MeleeCombat());
    sim.rulebook.push(new EventHandler());
  });

  describe('Attack Range', () => {
    test('hero attack should hit enemies in 3 lanes', () => {
      // Place hero at center
      const hero = sim.addUnit({
        id: 'hero',
        pos: { x: 10, y: 10 },
        team: 'friendly',
        hp: 100,
        maxHp: 100,
        dmg: 20,
        tags: ['hero'],
        meta: {
          controlled: true,
          facing: 'right'
        }
      });

      // Place enemies in 3 lanes to the right
      const enemy1 = sim.addUnit({
        id: 'enemy1',
        pos: { x: 12, y: 9 }, // Lane above
        team: 'hostile',
        hp: 50,
        maxHp: 50
      });

      const enemy2 = sim.addUnit({
        id: 'enemy2',
        pos: { x: 12, y: 10 }, // Same lane
        team: 'hostile',
        hp: 50,
        maxHp: 50
      });

      const enemy3 = sim.addUnit({
        id: 'enemy3',
        pos: { x: 12, y: 11 }, // Lane below
        team: 'hostile',
        hp: 50,
        maxHp: 50
      });

      // Enemy out of range
      const enemy4 = sim.addUnit({
        id: 'enemy4',
        pos: { x: 12, y: 12 }, // Too far vertically
        team: 'hostile',
        hp: 50,
        maxHp: 50
      });

      // Execute hero attack
      sim.queuedCommands.push({
        type: 'hero',
        params: {
          action: 'attack',
          direction: 'right',
          range: 2
        }
      });

      // Process attack
      for (let i = 0; i < 5; i++) {
        sim.step();
      }
      
      // Debug output
      console.log('Attack zones:', hero.meta?.attackZones);
      console.log('Enemy positions:', {
        enemy1: enemy1.pos,
        enemy2: enemy2.pos,
        enemy3: enemy3.pos,
        enemy4: enemy4.pos
      });
      console.log('Events:', sim.processedEvents.map(e => ({ 
        kind: e.kind, 
        target: e.target,
        amount: e.meta?.amount 
      })));

      // Check that enemies in range took damage
      const e1 = sim.units.find(u => u.id === 'enemy1');
      const e2 = sim.units.find(u => u.id === 'enemy2');
      const e3 = sim.units.find(u => u.id === 'enemy3');
      const e4 = sim.units.find(u => u.id === 'enemy4');

      expect(e1?.hp).toBeLessThan(50);
      expect(e2?.hp).toBeLessThan(50);
      expect(e3?.hp).toBeLessThan(50);
      expect(e4?.hp).toBe(50); // Out of range, no damage
    });

    test('hero attack direction should matter', () => {
      const hero = sim.addUnit({
        id: 'hero',
        pos: { x: 10, y: 10 },
        team: 'friendly',
        hp: 100,
        dmg: 20,
        tags: ['hero'],
        meta: {
          controlled: true,
          facing: 'left'
        }
      });

      // Enemy behind (to the right)
      const enemyBehind = sim.addUnit({
        id: 'enemy_behind',
        pos: { x: 12, y: 10 },
        team: 'hostile',
        hp: 50,
        maxHp: 50
      });

      // Enemy in front (to the left)
      const enemyFront = sim.addUnit({
        id: 'enemy_front',
        pos: { x: 8, y: 10 },
        team: 'hostile',
        hp: 50,
        maxHp: 50
      });

      // Attack left
      sim.queuedCommands.push({
        type: 'hero',
        params: {
          action: 'attack',
          direction: 'left',
          range: 2
        }
      });

      for (let i = 0; i < 5; i++) {
        sim.step();
      }

      const behind = sim.units.find(u => u.id === 'enemy_behind');
      const front = sim.units.find(u => u.id === 'enemy_front');

      expect(behind?.hp).toBe(50); // Behind, no damage
      expect(front?.hp).toBeLessThan(50); // In front, damaged
    });
  });

  describe('Attack Animation', () => {
    test('attack should have proper timing', () => {
      const hero = sim.addUnit({
        id: 'hero',
        pos: { x: 10, y: 10 },
        team: 'friendly',
        hp: 100,
        tags: ['hero'],
        meta: {
          controlled: true,
          useRig: true
        }
      });

      // Start attack
      sim.queuedCommands.push({
        type: 'hero',
        params: {
          action: 'attack',
          direction: 'right'
        }
      });

      sim.step();
      
      // Check attack state is set
      const heroAfterStart = sim.units.find(u => u.id === 'hero');
      expect(heroAfterStart?.state).toBe('attack');
      expect(heroAfterStart?.meta?.attackStartTick).toBeDefined();
      expect(heroAfterStart?.meta?.attackEndTick).toBeDefined();

      // Step through attack animation (16 ticks - matches attackEndTick in HeroCommand)
      for (let i = 0; i < 16; i++) {
        sim.step();
      }

      // Check attack state is cleared
      const heroAfterEnd = sim.units.find(u => u.id === 'hero');
      console.log('Hero after attack animation:', {
        state: heroAfterEnd?.state,
        attackStartTick: heroAfterEnd?.meta?.attackStartTick,
        attackEndTick: heroAfterEnd?.meta?.attackEndTick,
        currentTick: sim.ticks
      });
      expect(heroAfterEnd?.state).toBe('idle');
      expect(heroAfterEnd?.meta?.attackStartTick).toBeUndefined();
      expect(heroAfterEnd?.meta?.attackEndTick).toBeUndefined();
    });
  });

  describe('Ninja Behavior', () => {
    test('ninjas should hunt the hero', () => {
      // Add hunting rule for this test
      sim.rulebook.push(new Hunting());
      
      const hero = sim.addUnit({
        id: 'hero',
        pos: { x: 5, y: 10 },
        team: 'friendly',
        hp: 100,
        tags: ['hero']
      });

      const ninja = sim.addUnit({
        id: 'ninja',
        pos: { x: 15, y: 10 },
        team: 'hostile',
        hp: 30,
        dmg: 5,
        tags: ['ninja', 'enemy'],
        meta: {
          hunting: true,
          speed: 1
        }
      });

      const initialDistance = Math.abs(ninja.pos.x - hero.pos.x);

      // Simulate several steps
      for (let i = 0; i < 10; i++) {
        sim.step();
      }

      const ninjaAfter = sim.units.find(u => u.id === 'ninja');
      const heroAfter = sim.units.find(u => u.id === 'hero');
      const finalDistance = Math.abs(ninjaAfter!.pos.x - heroAfter!.pos.x);

      // Ninja should have moved closer
      expect(finalDistance).toBeLessThan(initialDistance);
    });

    test('ninjas should attack when in range', () => {
      const hero = sim.addUnit({
        id: 'hero',
        pos: { x: 10, y: 10 },
        team: 'friendly',
        hp: 100,
        maxHp: 100,
        tags: ['hero']
      });

      const ninja = sim.addUnit({
        id: 'ninja',
        pos: { x: 11, y: 10 }, // Adjacent
        team: 'hostile',
        hp: 30,
        dmg: 5,
        tags: ['ninja', 'enemy']
      });

      // Run combat
      for (let i = 0; i < 5; i++) {
        sim.step();
      }

      const heroAfter = sim.units.find(u => u.id === 'hero');
      expect(heroAfter?.hp).toBeLessThan(100); // Hero should have taken damage
    });
  });

  describe('Attack Visual Feedback', () => {
    test('attack should create damage zones', () => {
      const hero = sim.addUnit({
        id: 'hero',
        pos: { x: 10, y: 10 },
        team: 'friendly',
        hp: 100,
        dmg: 20,
        tags: ['hero'],
        meta: {
          controlled: true,
          facing: 'right'
        }
      });

      // Execute attack
      sim.queuedCommands.push({
        type: 'hero',
        params: {
          action: 'attack',
          direction: 'right',
          range: 2
        }
      });

      sim.step();

      // Check for attack zones in metadata or events
      const heroAfter = sim.units.find(u => u.id === 'hero');
      
      // Should have attack zones defined
      expect(heroAfter?.meta?.attackZones).toBeDefined();
      if (heroAfter?.meta?.attackZones) {
        const zones = heroAfter.meta.attackZones;
        expect(zones.length).toBe(6); // 3 lanes × 2 range
        
        // Check zones cover the right area
        const expectedZones = [
          { x: 11, y: 9 }, { x: 12, y: 9 },  // Top lane
          { x: 11, y: 10 }, { x: 12, y: 10 }, // Middle lane
          { x: 11, y: 11 }, { x: 12, y: 11 }  // Bottom lane
        ];
        
        for (const expected of expectedZones) {
          const hasZone = zones.some(z => z.x === expected.x && z.y === expected.y);
          expect(hasZone).toBe(true);
        }
      }
    });
  });

  describe('Attack Power-up', () => {
    test('holding attack should charge power', () => {
      const hero = sim.addUnit({
        id: 'hero',
        pos: { x: 10, y: 10 },
        team: 'friendly',
        hp: 100,
        dmg: 20,
        tags: ['hero'],
        meta: {
          controlled: true
        }
      });

      // Start charging
      sim.queuedCommands.push({
        type: 'hero',
        params: {
          action: 'charge_attack',
          direction: 'right'
        }
      });

      sim.step();
      
      const heroCharging = sim.units.find(u => u.id === 'hero');
      expect(heroCharging?.meta?.attackCharge).toBe(1);

      // Continue charging
      for (let i = 0; i < 5; i++) {
        sim.step();
      }

      const heroCharged = sim.units.find(u => u.id === 'hero');
      expect(heroCharged?.meta?.attackCharge).toBeGreaterThan(1);

      // Release charged attack
      sim.queuedCommands.push({
        type: 'hero',
        params: {
          action: 'release_attack'
        }
      });

      // Place enemy to test damage
      const enemy = sim.addUnit({
        id: 'enemy',
        pos: { x: 11, y: 10 },
        team: 'hostile',
        hp: 100,
        maxHp: 100
      });

      sim.step();

      const enemyAfter = sim.units.find(u => u.id === 'enemy');
      // Charged attack should do more damage
      expect(enemyAfter?.hp).toBeLessThan(80); // More than base 20 damage
    });
  });
});