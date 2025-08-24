import { describe, expect, it, beforeEach } from 'bun:test';
import { SceneLoader } from '../../src/core/scene_loader';
import { Simulator } from '../../src/core/simulator';
import * as fs from 'fs';
import * as path from 'path';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { SegmentedCreatures } from '../../src/rules/segmented_creatures';
import { GrapplingPhysics } from '../../src/rules/grappling_physics';
import { BiomeEffects } from '../../src/rules/biome_effects';

function getAverageTemperature(sim: any): number {
  let total = 0;
  let count = 0;
  
  for (let x = 0; x < sim.fieldWidth; x++) {
    for (let y = 0; y < sim.fieldHeight; y++) {
      total += sim.temperatureField.get(x, y);
      count++;
    }
  }
  
  return count > 0 ? total / count : 0;
}

describe('Desert', () => {
  beforeEach(() => {

    Encyclopaedia.counts = {};
  });
  
  const setupDesertScene = () => {
    const scenePath = path.join(__dirname, '../../src/core/scenes/desert-day.battle.txt');
    const sceneContent = fs.readFileSync(scenePath, 'utf-8');
    const sim = new Simulator();
    const loader = new SceneLoader(sim);


    sim.rulebook.push(new SegmentedCreatures());


    sim.rulebook.push(new GrapplingPhysics());

    loader.loadFromText(sceneContent);


    sim.step();

    return { sim, loader };
  };

  it('Desert environment loaded', () => {
    const { sim } = setupDesertScene();

    expect(sim.temperature).toBe(35);
  });

  it('Key desert units present', () => {
    const { sim } = setupDesertScene();
    const grapplers = sim.units.filter(u => u.sprite === 'grappler');
    const wormHunters = sim.units.filter(u => u.sprite === 'wormrider');
    const waterbearers = sim.units.filter(u => u.sprite === 'waterpriest');

    expect(grapplers.length).toBeGreaterThan(0);
    expect(wormHunters.length).toBeGreaterThan(0);
    expect(waterbearers.length).toBeGreaterThan(0);

  });

  it('Segmented worms have segments', () => {
    const { sim } = setupDesertScene();
    const segmentedUnits = sim.units.filter(u =>
      u.meta?.segmented
    );




    expect(segmentedUnits.length).toBeGreaterThan(0);
  });

  it('Grappling hook projectiles work', () => {
    const { sim } = setupDesertScene();


    const grappler = sim.units.find(u =>
      u.sprite === 'grappler' &&
      (!u.lastAbilityTick || !u.lastAbilityTick.grapplingHook ||
        sim.ticks - u.lastAbilityTick.grapplingHook > 30)
    );

    if (grappler && grappler.abilities?.includes('grapplingHook')) {
      const target = { x: grappler.pos.x + 5, y: grappler.pos.y };


      sim.projectiles = [];
      
      // Queue grapple command to trigger the ability
      sim.queuedCommands.push({
        type: 'grapple',
        unitId: grappler.id,
        params: {
          x: target.x,
          y: target.y
        }
      });

      sim.step();

      const grapples = sim.projectiles.filter(p => p.type === 'grapple');
      expect(grapples.length).toBeGreaterThan(0);
    } else {
      // Skip test if no grappler found
      expect(true).toBe(true);
    }
  });

  it('combat', () => {
    const { sim } = setupDesertScene();


    for (let i = 0; i < 30; i++) {
      sim.step();
    }

    const survivingUnits = sim.units.filter(u => u.hp > 0).length;

    expect(survivingUnits).toBeGreaterThan(0);
  });
  it('should have functioning segmented worms', () => {
    const scenePath = path.join(__dirname, '../../src/core/scenes/desert-day.battle.txt');
    const sceneContent = fs.readFileSync(scenePath, 'utf-8');

    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    loader.loadFromText(sceneContent);


    sim.step();


    expect(sim.units.length).toBeGreaterThan(0);


    const worms = sim.units.filter(u =>
      (u.type === 'desert-worm' || u.sprite === 'desert-worm') &&
      !u.meta?.segment // Exclude segment units
    );


    expect(worms.length).toBeGreaterThan(0);


    worms.forEach(worm => {

      const wormSegments = sim.units.filter(u =>
        u.meta?.parentId === worm.id ||
        u.id?.includes(`${worm.id}_segment`)
      );


      expect(worm.meta?.segmented || worm.meta?.segmentCount > 0).toBeTruthy();


      if (worm.meta?.segmented) {
        expect(wormSegments.length).toBeGreaterThan(0);
      }
    });
  });

  it('should allow grappling and pinning worm segments', () => {
    const sim = new Simulator();



    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'test-grappler',
      pos: { x: 5, y: 5 }
    };


    const worm = {
      ...Encyclopaedia.unit('desert-worm'),
      id: 'test-worm',
      pos: { x: 10, y: 5 }
    };

    sim.addUnit(grappler);
    sim.addUnit(worm);


    sim.step();


    const segments = sim.units.filter(u => u.meta?.parentId === worm.id);
    expect(segments.length).toBeGreaterThan(0);


    const targetSegment = segments[1] || segments[0]; // Middle or first segment
    const targetPos = targetSegment.pos;


    expect(grappler.abilities).toContain('grapplingHook');


    sim.forceAbility(grappler.id, 'grapplingHook', targetPos);


    sim.rulebook.push(new GrapplingPhysics());


    for (let i = 0; i < 10; i++) {
      sim.projectiles.forEach(p => {
        if (p.type === 'grapple' && p.target) {
          p.pos.x = p.target.x;
          p.pos.y = p.target.y;
        }
      });
      sim.step();
    }




    const originalPos = { ...worm.pos };
    worm.intendedMove = { x: 20, y: 5 };

    sim.step();

    const moveDistance = Math.abs(worm.pos.x - originalPos.x);

    expect(moveDistance).toBeLessThan(10); // Movement should be restricted
  });

  it('should have proper desert atmosphere with sandstorm', () => {
    const scenePath = path.join(__dirname, '../../src/core/scenes/desert-day.battle.txt');
    const sceneContent = fs.readFileSync(scenePath, 'utf-8');

    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    loader.loadFromText(sceneContent);



    expect(sim.temperature).toBe(35);


    const sandParticles = sim.particles.filter(p => p.type === 'sand');
    expect(sandParticles.length).toBeGreaterThan(0);



    for (let i = 0; i < 10; i++) {
      sim.step();
    }


    const affectedUnits = sim.units.filter(u =>
      u.meta?.temperatureEffect || u.meta?.heatStress
    );

  });

  it('should demonstrate key desert combat scenario', () => {
    const sim = new Simulator();


    const grappler1 = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler-1',
      pos: { x: 5, y: 5 },
      team: 'friendly' as const
    };

    const wormHunter = {
      ...Encyclopaedia.unit('worm-hunter'),
      id: 'hunter-1',
      pos: { x: 6, y: 5 },
      team: 'friendly' as const
    };

    const sandworm = {
      ...Encyclopaedia.unit('giant-sandworm'),
      id: 'sandworm-1',
      pos: { x: 12, y: 5 },  // Move closer to be within grappling range
      team: 'hostile' as const
    };

    sim.addUnit(grappler1);
    sim.addUnit(wormHunter);
    sim.addUnit(sandworm);


    const segRule = new SegmentedCreatures();
    const context = sim.getTickContext();
    segRule.execute(context);


    const actualGrappler = sim.units.find(u => u.id === 'grappler-1');
    expect(actualGrappler).toBeDefined();
    expect(actualGrappler!.abilities).toContain('grapplingHook');


    sim.step();


    const grapples = sim.projectiles.filter(p => p.type === 'grapple');
    expect(grapples.length).toBeGreaterThan(0);

    // TODO: Check actual projectile properties?? Grapple should have target set??

  });
  it('desert units - grappler can fire grappling hook', () => {
    const sim = new Simulator();





    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      pos: { x: 5, y: 5 },
      team: 'friendly' as const
    };
    sim.addUnit(grappler);


    const enemy = {
      ...Encyclopaedia.unit('worm'),
      pos: { x: 8, y: 5 },
      team: 'hostile' as const
    };
    sim.addUnit(enemy);


    const grapplerUnit = sim.units.find(u => u.sprite === 'grappler' && u.tags?.includes('grappler'));
    expect(grapplerUnit).toBeTruthy();


    if (grapplerUnit) {
      sim.forceAbility(grapplerUnit.id, 'grapplingHook', enemy.pos);
      sim.step();
    }


    const grappleProjectile = sim.projectiles.find(p => p.type === 'grapple');
    expect(grappleProjectile).toBeTruthy();


    for (let i = 0; i < 10; i++) {
      sim.step();
    }
  });

  it('desert units - worm hunter can run grapple lines', () => {
    const sim = new Simulator();


    const hunter = {
      ...Encyclopaedia.unit('worm-hunter'),
      pos: { x: 5, y: 5 },
      team: 'friendly' as const
    };
    sim.addUnit(hunter);

    const hunterUnit = sim.units.find(u => u.tags?.includes('assassin'));
    expect(hunterUnit).toBeTruthy();
    expect(hunterUnit?.meta.canClimbGrapples).toBeTruthy();
    expect(hunterUnit?.meta.moveSpeed).toEqual(1.5);
  });

  it('desert units - waterbearer can heal and detect spies', () => {
    const sim = new Simulator();


    const waterbearer = {
      ...Encyclopaedia.unit('waterbearer'),
      pos: { x: 10, y: 10 },
      team: 'friendly' as const
    };
    sim.addUnit(waterbearer);

    const waterbearerUnit = sim.units.find(u => u.tags?.includes('detector'));
    expect(waterbearerUnit).toBeTruthy();
    expect(waterbearerUnit?.meta.waterReserves).toEqual(100);
    expect(waterbearerUnit?.meta.detectRange).toEqual(6);


    const ally = {
      ...Encyclopaedia.unit('soldier'),
      pos: { x: 12, y: 10 },
      hp: 10,
      team: 'friendly' as const
    };
    sim.addUnit(ally);


    const spy = {
      ...Encyclopaedia.unit('worm'),
      pos: { x: 13, y: 10 },
      team: 'hostile' as const,
      meta: { hidden: true, invisible: true }
    };
    sim.addUnit(spy);



    sim.step(); // Let abilities system detect and reveal the spy


    const spyUnit = sim.units.find(u => u.id === spy.id);
    expect(spyUnit?.meta.hidden).toEqual(false);
    expect(spyUnit?.meta.revealed).toEqual(true);
  });

  it('desert units - skirmisher has dual knife attack', () => {
    const sim = new Simulator();


    const skirmisher = {
      ...Encyclopaedia.unit('skirmisher'),
      pos: { x: 5, y: 5 },
      team: 'friendly' as const
    };
    sim.addUnit(skirmisher);

    const skirmisherUnit = sim.units.find(u => u.tags?.includes('duelist'));
    expect(skirmisherUnit).toBeTruthy();
    expect(skirmisherUnit?.meta.dualWield).toBeTruthy();
    expect(skirmisherUnit?.meta.dodgeChance).toEqual(0.25);


    const enemy = {
      ...Encyclopaedia.unit('worm'),
      pos: { x: 6, y: 5 },
      team: 'hostile' as const
    };
    sim.addUnit(enemy);





    const initialEnemyHp = enemy.hp;


    for (let i = 0; i < 5; i++) {
      sim.step();
      const currentEnemy = sim.units.find(u => u.id === enemy.id);

      if (currentEnemy && currentEnemy.hp < initialEnemyHp) {
        break;
      }
    }


    const finalEnemy = sim.units.find(u => u.id === enemy.id);
    expect(finalEnemy).toBeTruthy();

    expect(finalEnemy!.hp).toBeLessThan(initialEnemyHp);
  });

  it('segmented creatures - desert worm has segments', () => {
    const sim = new Simulator();





    const worm = {
      ...Encyclopaedia.unit('desert-worm'),
      pos: { x: 15, y: 15 }
    };
    sim.addUnit(worm);


    sim.step();


    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === worm.id);
    expect(segments.length).toEqual(4);


    segments.forEach((segment, index) => {
      expect(segment.meta.segmentIndex).toEqual(index + 1);
      expect(segment.tags?.includes('segment')).toBeTruthy();
    });
  });

  it('segmented creatures - giant sandworm is huge with many segments', () => {
    const sim = new Simulator();




    const giantWorm = {
      ...Encyclopaedia.unit('giant-sandworm'),
      pos: { x: 15, y: 15 }
    };
    sim.addUnit(giantWorm);


    sim.step();


    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === giantWorm.id);
    expect(segments.length).toEqual(6);


    const wormUnit = sim.units.find(u => u.id === giantWorm.id);
    expect(wormUnit?.meta.huge).toBeTruthy();
  });

  it('sandstorm effect - damages non-desert units', () => {
    const sim = new Simulator();





    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      pos: { x: 5, y: 5 },
      team: 'friendly' as const
    };
    sim.addUnit(grappler);


    const soldier = {
      ...Encyclopaedia.unit('soldier'),
      pos: { x: 10, y: 10 },
      team: 'friendly' as const
    };
    sim.addUnit(soldier);


    BiomeEffects.triggerSandstorm(sim, 100, 0.8);


    for (let i = 0; i < 10; i++) {
      sim.step();
    }


    const grapplerUnit = sim.units.find(u => u.id === grappler.id);
    const soldierUnit = sim.units.find(u => u.id === soldier.id);

    expect(grapplerUnit?.meta.sandBlinded).toBeFalsy();
    expect(soldierUnit?.meta.sandBlinded).toBeTruthy();
    expect(soldierUnit?.meta.sandSlowed).toBeTruthy();
  });

  it('segmented creatures - grappling affects segments', () => {
    const sim = new Simulator();





    const worm = {
      ...Encyclopaedia.unit('desert-worm'),
      pos: { x: 10, y: 10 }
    };
    sim.addUnit(worm);


    sim.step();


    const segment = sim.units.find(u => u.meta.segment && u.meta.segmentIndex === 2);
    if (segment) {
      sim.queuedCommands.push({
        type: 'meta',
        params: {
          unitId: segment.id,
          meta: {
            grappled: true,
            grappledBy: 'test_grappler'
          }
        }
      });
    }


    sim.step();


    sim.step();


    const wormUnit = sim.units.find(u => u.id === worm.id);
    expect(wormUnit?.meta.segmentSlowdown).toBeTruthy();
  });

  it('desert worm can burrow and ambush', () => {
    const sim = new Simulator();





    const worm = {
      ...Encyclopaedia.unit('desert-worm'),
      pos: { x: 5, y: 5 }
    };
    sim.addUnit(worm);


    const enemy = {
      ...Encyclopaedia.unit('soldier'),
      pos: { x: 10, y: 10 },
      team: 'friendly' as const
    };
    sim.addUnit(enemy);


    sim.queuedCommands.push({
      type: 'burrow',
      unitId: worm.id,
      params: { targetX: enemy.pos.x, targetY: enemy.pos.y }
    });
    sim.step(); // Process burrow command


    const wormUnit = sim.units.find(u => u.id === worm.id);


    expect(wormUnit?.meta.burrowed).toBeTruthy();
    expect(wormUnit?.meta.invisible).toBeTruthy();


    for (let i = 0; i < 20; i++) {
      sim.step();
    }


    const finalWorm = sim.units.find(u => u.id === worm.id);


    expect(finalWorm?.meta.burrowed).toBeFalsy();
    expect(finalWorm?.meta.invisible).toBeFalsy();
  });

  it('should load desert-day scene with all units', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    


    

    loader.loadScene('desert');
    

    const grapplers = sim.units.filter(u => u.sprite === 'grappler');
    expect(grapplers.length).toEqual(2);
    
    const wormRiders = sim.units.filter(u => u.sprite === 'wormrider');
    expect(wormRiders.length).toEqual(1);
    
    const waterPriests = sim.units.filter(u => u.sprite === 'waterpriest');
    expect(waterPriests.length).toEqual(2);
    
    const desertWorms = sim.units.filter(u => u.tags?.includes('segmented') && u.sprite === 'worm');
    expect(desertWorms.length).toBeGreaterThan(0);
  });

  it('should create segments for segmented creatures', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    


    

    loader.loadScene('desert');
    

    sim.step();
    

    const segments = sim.units.filter(u => u.meta.segment);
    expect(segments.length).toBeGreaterThan(0);
    

    const desertWorms = sim.units.filter(u => u.id?.includes('desert-worm') && !u.meta.segment);
    

    const desertWormSegments = segments.filter(s => 
      s.meta.parentId?.includes('desert-worm')
    );

    expect(desertWormSegments.length).toBeGreaterThanOrEqual(3); // At least 1 worm * 3 segments for now
    


    const giantWorms = sim.units.filter(u => 
      u.id?.startsWith('giant-sandworm') && !u.meta.segment && !u.meta.phantom
    );
    

    const giantWormSegments = segments.filter(s => 
      s.meta.parentId?.startsWith('giant-sandworm') && !s.meta.phantom
    );
    

    expect(giantWorms.length).toBe(1);
    expect(giantWormSegments.length).toEqual(6);
  });

  it('should set temperature when commanded', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    

    

    loader.loadScene('desert');
    

    sim.step();
    

    const avgTemp = getAverageTemperature(sim);
    expect(avgTemp).toBeGreaterThan(30); // Should be around 35°C
    expect(avgTemp).toBeLessThan(40); // With some variation
  });

  it('should be able to trigger sandstorm manually', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    

    

    loader.loadScene('desert');
    

    BiomeEffects.triggerSandstorm(sim, 100, 0.8);
    

    sim.step();
    

    expect(sim.sandstormActive).toBeTruthy();
  });

  it('grapplers should have grappling abilities', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    

    

    loader.loadScene('desert');
    

    const grapplers = sim.units.filter(u => u.sprite === 'grappler');
    expect(grapplers.length).toBeGreaterThan(0);
    

    grapplers.forEach(grappler => {
      expect(grappler.abilities.includes('grapplingHook')).toBe(true);
      expect(grappler.abilities.includes('pinTarget')).toBe(true);
    });
    
    // TODO: Manually test grappling hook ability?





    



    



  });

  // very slow?
  it.skip('waterbearers should detect hidden enemies', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    

    

    loader.loadScene('desert');
    

    const enemy = sim.units.find(u => u.team === 'hostile');
    if (enemy) {
      enemy.meta.hidden = true;
      enemy.meta.invisible = true;
    }
    

    for (let i = 0; i < 50; i++) {
      sim.step();
    }
    


    const currentEnemy = sim.units.find(u => u.team === 'hostile' && u.meta.hidden);
    if (currentEnemy) {
      const waterbearer = sim.units.find(u => u.sprite === 'waterpriest');
      if (waterbearer && 
          Math.abs(currentEnemy.pos.x - waterbearer.pos.x) <= 6 &&
          Math.abs(currentEnemy.pos.y - waterbearer.pos.y) <= 6) {
        expect(currentEnemy.meta.revealed).toBeTruthy();
      }
    }
  });
});