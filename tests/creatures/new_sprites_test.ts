import { describe, expect, it } from "bun:test";
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from "../../src/dmg/encyclopaedia";

describe("New Sprites Integration", () => {
  it("should create Big Worm with correct sprite", () => {


    const bigWorm = Encyclopaedia.unit("big-worm");
    
    expect(bigWorm.sprite).toBe('big-worm'); // Should use new sprite
    expect(bigWorm.meta?.segmented).toBe(true);
    expect(bigWorm.meta?.segmentCount).toBe(5); // Big worm has 5 segments
    expect(bigWorm.abilities).toContain('breatheFire');
    expect(bigWorm.team).toBe('hostile');
    expect(bigWorm.hp).toBe(120);
  });

  it("should create skeleton-mage from encyclopaedia", () => {
    const sim = new Simulator(10, 10);
    
    const skeletonMage = Encyclopaedia.unit('skeleton-mage');
    skeletonMage.pos = { x: 5, y: 5 };
    sim.addUnit(skeletonMage);
    
    expect(skeletonMage.sprite).toBe('skeleton-mage');
    expect(skeletonMage.team).toBe('hostile');
    expect(skeletonMage.meta.perdurance).toBe('undead');
    expect(skeletonMage.tags).toContain('undead');
    expect(skeletonMage.tags).toContain('black');
    expect(skeletonMage.tags).toContain('caster');
    expect(skeletonMage.hp).toBe(20); // Lighter than regular skeleton
    expect(skeletonMage.mass).toBe(0.7); // Lighter than regular skeleton
  });

  it("should run segmented creatures rule for Big Worm", () => {
    const sim = new Simulator(15, 15);
    const bigWormUnit = Encyclopaedia.unit("big-worm");
    sim.addUnit({ ...bigWormUnit, pos: { x: 5, y: 5 } });
    const bigWorm = sim.units.find(u => u.type === 'big-worm');
    const wormId = bigWorm.id;
    

    sim.step();
    

    const updatedWorm = sim.roster[wormId];
    expect(updatedWorm).toBeDefined();
    

    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === wormId);
    expect(segments.length).toBeGreaterThanOrEqual(1);
    

    if (segments.length > 0) {
      const firstSegment = segments[0];
      expect(firstSegment.sprite).toBe('big-worm'); // Segments now inherit parent sprite
      expect(firstSegment.meta.segmentType).toBeDefined();
      expect(firstSegment.meta.parentId).toBe(wormId);
    }
  });

  it("should verify all sprite names are loaded", () => {
    const sim = new Simulator(5, 5);
    

    const rainmaker = Encyclopaedia.unit('rainmaker');
    expect(rainmaker.sprite).toBe('rainmaker');
    
    const demon = Encyclopaedia.unit('demon');
    expect(demon.sprite).toBe('demon');
    
    const ghost = Encyclopaedia.unit('ghost');
    expect(ghost.sprite).toBe('ghost');
    
    const mimicWorm = Encyclopaedia.unit('mimic-worm');
    expect(mimicWorm.sprite).toBe('mimic-worm');
    
    const skeleton = Encyclopaedia.unit('skeleton');
    expect(skeleton.sprite).toBe('skeleton');
    
    const skeletonMage = Encyclopaedia.unit('skeleton-mage');
    expect(skeletonMage.sprite).toBe('skeleton-mage');
    

    const bigWormUnit = Encyclopaedia.unit('big-worm');
    expect(bigWormUnit.sprite).toBe('big-worm');
  });

  it("should have proper black faction variety", () => {
    const sim = new Simulator(10, 10);
    

    const units = [
      Encyclopaedia.unit('skeleton'),
      Encyclopaedia.unit('skeleton-mage'),
      Encyclopaedia.unit('ghost'),
      Encyclopaedia.unit('demon'),
      Encyclopaedia.unit('mimic-worm')
    ];
    

    units.forEach((unit, i) => {
      unit.pos = { x: i + 1, y: 1 };
      sim.addUnit(unit);
    });
    

    units.forEach(unit => {
      expect(unit.team).toBe('hostile');
      expect(unit.tags).toContain('black');
    });
    

    expect(units[0].meta.perdurance).toBe('undead');
    expect(units[1].meta.perdurance).toBe('undead');
    expect(units[2].meta.perdurance).toBe('spectral');
    expect(units[3].meta.perdurance).toBe('fiendish');
    expect(units[4].meta.perdurance).toBeUndefined();
    

    expect(units[1].tags).toContain('caster');
    expect(units[2].tags).toContain('spectral');
    expect(units[3].abilities.includes('fireBlast')).toBe(true);
    expect(units[4].meta.segmented).toBe(true);
  });
});