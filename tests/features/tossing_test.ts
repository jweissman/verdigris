import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import type { Unit } from '../../src/types/Unit';
import { CommandHandler } from '../../src/core/command_handler';
import { Tossing } from '../../src/rules/tossing';
import { EventHandler } from '../../src/rules/event_handler';

describe('Tossing mechanics', () => {
  it('should execute toss command and set unit state', () => {
    const sim = new Simulator(128, 128);


    const unit: Unit = {
      id: "target",
      team: 'friendly',
      abilities: [],
      state: 'idle',
      hp: 10, maxHp: 10,
      pos: { x: 5, y: 5 },
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      sprite: 'soldier',
      meta: {}
    };

    sim.addUnit(unit);


    sim.queuedCommands.push({
      type: 'toss',
      unitId: 'target',
      params: { direction: { x: 1, y: 0 }, force: 5, distance: 3 }
    });

    sim.tick();

    const context = sim.getTickContext();
    const tossedUnit = context.findUnitById('target')!;
    expect(tossedUnit.meta.tossing).toBe(true);
    expect(tossedUnit.meta.tossProgress).not.toBeUndefined();
    expect(tossedUnit.meta.tossOrigin).toEqual({ x: 5, y: 5 });
    expect(tossedUnit.meta.tossTarget).toEqual({ x: 8, y: 5 }); // 5 + 3 in x direction
    expect(tossedUnit.meta.tossForce).toBe(5);
  });

  it('should handle toss physics during flight', () => {
    const sim = new Simulator(128, 128);

    const unit: Unit = {
      id: "target",
      team: 'friendly',
      abilities: [],
      state: 'idle',
      hp: 10, maxHp: 10,
      pos: { x: 10, y: 10 },
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      sprite: 'soldier',
      meta: {}
    };

    sim.addUnit(unit);


    sim.queuedCommands.push({
      type: 'toss',
      unitId: 'target',
      params: { direction: { x: 1, y: 1 }, force: 4, distance: 2 }
    });

    sim.tick(); // Process command
    const context = sim.getTickContext();
    expect(context.findUnitById('target')!.meta.tossing).toBe(true);


    for (let i = 1; i < 8; i++) {
      sim.tick();
      const context = sim.getTickContext();
    const tossedUnit = context.findUnitById('target')!;
      
      expect(tossedUnit.meta.tossing).toBe(true);
      expect(tossedUnit.meta.tossProgress).toBe(i);
      expect(tossedUnit.meta.z).toBeGreaterThan(0); // Should be in the air
      

      expect(tossedUnit.pos.x).toBeGreaterThan(10);
      expect(tossedUnit.pos.y).toBeGreaterThan(10);
    }
  });

  it('should land at target position after toss duration', () => {
    const sim = new Simulator(128, 128);

    const unit: Unit = {
      id: "target",
      team: 'friendly',
      abilities: [],
      state: 'idle',
      hp: 10, maxHp: 10,
      pos: { x: 0, y: 0 },
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      sprite: 'soldier',
      meta: {}
    };

    sim.addUnit(unit);


    sim.queuedCommands.push({
      type: 'toss',
      unitId: 'target',
      params: { direction: { x: 1, y: 0 }, force: 6, distance: 4 }
    });

    sim.tick(); // Process command
    

    for (let i = 0; i < 8; i++) {
      sim.tick();
    }

    const landedUnit = sim.roster['target'];
    expect(landedUnit.meta.tossing).toBe(false);
    expect(landedUnit.meta.z).toBe(0); // Back on ground
    expect(landedUnit.pos.x).toBe(4); // Landed at target x
    expect(landedUnit.pos.y).toBe(0); // Landed at target y
  });

  it('should clamp toss target to field boundaries', () => {
    const sim = new Simulator(10, 10); // Small field

    const unit: Unit = {
      id: "target",
      team: 'friendly',
      abilities: [],
      state: 'idle',
      hp: 10, maxHp: 10,
      pos: { x: 8, y: 8 },
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      sprite: 'soldier',
      meta: {}
    };

    sim.addUnit(unit);


    sim.queuedCommands.push({
      type: 'toss',
      unitId: 'target',
      params: { direction: { x: 1, y: 1 }, force: 8, distance: 5 }
    });

    sim.tick();

    const context = sim.getTickContext();
    const tossedUnit = context.findUnitById('target')!;
    expect(tossedUnit.meta.tossTarget.x).toBe(9); // Clamped to field width - 1
    expect(tossedUnit.meta.tossTarget.y).toBe(9); // Clamped to field height - 1
  });

  it('should not toss dead units', () => {
    const sim = new Simulator(128, 128);

    const unit: Unit = {
      id: "target",
      team: 'friendly',
      abilities: [],
      state: 'dead',
      hp: 0, maxHp: 10,
      pos: { x: 5, y: 5 },
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      sprite: 'soldier',
      meta: {}
    };

    sim.addUnit(unit);


    sim.queuedCommands.push({
      type: 'toss',
      unitId: 'target',
      params: { direction: { x: 1, y: 0 }, force: 5, distance: 3 }
    });

    sim.tick();

    const deadUnit = sim.roster['target'];


    if (deadUnit) {
      expect(deadUnit.meta.tossing).toBeUndefined();
      expect(deadUnit.pos.x).toBe(5); // Position unchanged
    } else {

      expect(deadUnit).toBeUndefined();
    }
  });

  it('should generate AoE on high-force landing', () => {
    const sim = new Simulator(128, 128);

    const unit: Unit = {
      id: "target",
      team: 'friendly',
      abilities: [],
      state: 'idle',
      hp: 10, maxHp: 10,
      pos: { x: 5, y: 5 },
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      sprite: 'soldier',
      meta: {}
    };

    const addedUnit = sim.addUnit(unit);


    sim.queuedCommands.push({
      type: 'toss',
      unitId: addedUnit.id,
      params: { direction: { x: 1, y: 0 }, force: 8, distance: 3 }
    });

    sim.tick(); // Process command
    

    let aoeGenerated = false;
    let aoeEvent = null;
    const initialProcessedEvents = sim.getProcessedEvents().length;
    

    for (let i = 0; i < 10; i++) {
      sim.tick();


      if (!aoeGenerated) {

        if (sim.queuedEvents.length > 0) {
          aoeEvent = sim.queuedEvents.find(e => e.kind === 'aoe');
          if (aoeEvent) {
            aoeGenerated = true;
          }
        }
        

        if (sim.getProcessedEvents().length > initialProcessedEvents) {
          const recentEvents = sim.getProcessedEvents().slice(initialProcessedEvents);
          aoeEvent = recentEvents.find(e => e.kind === 'aoe');
          if (aoeEvent) {
            aoeGenerated = true;
          }
        }
      }
    }


    expect(aoeGenerated).toBe(true);
    expect(aoeEvent).toBeDefined();
    expect(aoeEvent?.meta.radius).toBe(1);
    expect(aoeEvent?.meta.amount).toBe(4);
  });

  it('should generate toss commands from AoE with mass difference', () => {
    const sim = new Simulator(128, 128);


    const heavyUnit: Unit = {
      id: "heavy",
      team: 'friendly',
      abilities: [],
      state: 'idle',
      hp: 20, maxHp: 20,
      pos: { x: 5, y: 5 },
      intendedMove: { x: 0, y: 0 },
      mass: 4,
      sprite: 'tank',
      meta: {}
    };


    const lightUnit: Unit = {
      id: "light",
      team: 'hostile',
      abilities: [],
      state: 'idle',
      hp: 15, maxHp: 15,
      pos: { x: 6, y: 5 },
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      sprite: 'scout',
      meta: {}
    };

    sim.addUnit(heavyUnit);
    sim.addUnit(lightUnit);


    // Use AoE command instead of event (events are now purely informational)
    sim.queuedCommands.push({
      type: 'aoe',
      unitId: 'heavy',
      params: {
        x: 5,
        y: 5,
        radius: 2,
        damage: 5,
        force: 8  // Add force to trigger toss based on mass difference
      }
    });

    sim.tick(); // Process AoE command (and any resulting toss commands due to fixpoint)



    const tossedUnit = sim.roster['light'];
    expect(tossedUnit.meta.tossing).toBe(true);
  });

  it('should not toss units with insufficient mass difference', () => {
    const sim = new Simulator(128, 128);


    const unit1: Unit = {
      id: "unit1",
      team: 'friendly',
      abilities: [],
      state: 'idle',
      hp: 10, maxHp: 10,
      pos: { x: 5, y: 5 },
      intendedMove: { x: 0, y: 0 },
      mass: 2,
      sprite: 'soldier',
      meta: {}
    };

    const unit2: Unit = {
      id: "unit2",
      team: 'hostile',
      abilities: [],
      state: 'idle',
      hp: 10, maxHp: 10,
      pos: { x: 6, y: 5 },
      intendedMove: { x: 0, y: 0 },
      mass: 1.5, // Ratio 2/1.5 = 1.33, less than 2
      sprite: 'soldier',
      meta: {}
    };

    sim.addUnit(unit1);
    sim.addUnit(unit2);


    sim.queuedEvents.push({
      kind: 'aoe',
      source: 'unit1',
      target: { x: 5, y: 5 },
      meta: {
        radius: 2,
        amount: 5
      }
    });

    sim.tick(); // Process AoE event


    const tossCommands = sim.queuedCommands?.filter(c => c.type === 'toss') || [];
    expect(tossCommands.length).toBe(0);
  });
});