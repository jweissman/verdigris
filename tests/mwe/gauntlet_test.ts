import { describe, test, expect } from 'bun:test';
import { GauntletGame } from '../../src/mwe/gauntlet';

describe('Gauntlet MWE', () => {
  test('creates gauntlet game instance', () => {
    const gauntlet = new GauntletGame();
    expect(gauntlet).toBeDefined();
    expect(gauntlet.sim).toBeDefined();
    expect(gauntlet.renderer).toBeDefined();
  });

  test('has stage configuration data', () => {
    const gauntlet = new GauntletGame();
    

    const stages = (gauntlet as any).stages;
    expect(stages).toBeDefined();
    expect(stages.length).toBe(5);
    

    expect(stages[0].name).toBe('Castle Gates');
    expect(stages[0].background).toBe('castle');
    expect(stages[0].width).toBe(80);
    expect(stages[0].height).toBe(40);
    expect(stages[0].enemies).toContain('soldier');
    expect(stages[0].enemies).toContain('ranger');
  });

  test('stage dimensions are epic scale', () => {
    const gauntlet = new GauntletGame();
    const stages = (gauntlet as any).stages;
    

    for (const stage of stages) {
      expect(stage.width).toBeGreaterThan(50);
      expect(stage.height).toBeGreaterThan(25);
    }
    

    expect(stages[1].width).toBe(120); // Piedmont Hills
    expect(stages[3].width).toBe(140); // Mountain Pass  
    expect(stages[4].width).toBe(160); // Desert Oasis
  });

  test('has diverse enemy types per stage', () => {
    const gauntlet = new GauntletGame();
    const stages = (gauntlet as any).stages;
    

    expect(stages[0].enemies).toEqual(['soldier', 'ranger']);
    

    expect(stages[2].enemies).toEqual(['ranger', 'wildmage', 'naturist']);
    

    expect(stages[3].enemies).toEqual(['bombardier', 'clanker', 'mechatronist']);
    

    expect(stages[4].enemies).toEqual(['bombardier', 'naturist', 'farmer']);
  });

  test('background stitching covers different environments', () => {
    const gauntlet = new GauntletGame();
    const stages = (gauntlet as any).stages;
    
    const backgrounds = stages.map((stage: any) => stage.background);
    

    expect(backgrounds).toContain('castle');
    expect(backgrounds).toContain('mountain');
    expect(backgrounds).toContain('forest');
    expect(backgrounds).toContain('desert');
    

    expect(new Set(backgrounds).size).toBe(4);
  });

  test('ability mapping covers all enemy types', () => {
    const gauntlet = new GauntletGame();
    const abilityMap = (gauntlet as any).getAbilitiesForType;
    
    expect(abilityMap('soldier')).toEqual(['melee']);
    expect(abilityMap('ranger')).toEqual(['ranged']);
    expect(abilityMap('priest')).toEqual(['heal']);
    expect(abilityMap('bombardier')).toEqual(['ranged', 'explosive']);
    expect(abilityMap('wildmage')).toEqual(['bolt']);
    expect(abilityMap('naturist')).toEqual(['heal', 'plant']);
    expect(abilityMap('clanker')).toEqual(['melee', 'explosive']);
    expect(abilityMap('mechatronist')).toEqual(['callAirdrop']);
    expect(abilityMap('farmer')).toEqual(['plant']);
    

    expect(abilityMap('unknown')).toEqual(['melee']);
  });

  test('input handler processes gauntlet controls', () => {
    const gauntlet = new GauntletGame();
    const handler = gauntlet.getInputHandler();
    
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
    

    handler({ key: 'w', type: 'keydown' });
    handler({ key: 'a', type: 'keydown' });
    handler({ key: ' ', type: 'keydown' });
    handler({ key: 'e', type: 'keydown' });
    handler({ key: 'n', type: 'keydown' });
    handler({ key: 'p', type: 'keydown' });
    handler({ key: 'r', type: 'keydown' });
  });

  test('stage progression sequences match VISION.md', () => {
    const gauntlet = new GauntletGame();
    const stages = (gauntlet as any).stages;
    

    expect(stages[0].name).toBe('Castle Gates');
    expect(stages[0].description).toBe('Storm the castle gates');
    
    expect(stages[1].name).toBe('Piedmont Hills');
    expect(stages[1].description).toBe('Traverse rolling hills');
    
    expect(stages[2].name).toBe('Forest Depths');
    expect(stages[2].description).toBe('Navigate ancient woods');
    
    expect(stages[3].name).toBe('Mountain Pass');
    expect(stages[3].description).toBe('Scale treacherous peaks');
    
    expect(stages[4].name).toBe('Desert Oasis');
    expect(stages[4].description).toBe('Cross burning sands');
  });
});