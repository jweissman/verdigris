import { Simulator } from "./simulator";
import { Unit } from "./sim/types";
import simple from './scenes/simple.battle.txt';
import complex from './scenes/complex.battle.txt';
import healing from './scenes/healing.battle.txt';
import projectile from './scenes/projectile.battle.txt';
import squirrel from './scenes/squirrel.battle.txt';
import { Freehold } from "./freehold";

export interface SceneDefinition {
  layout: string[];
  // legend: { [key: string]: UnitTemplate };
  scenery?: { [key: string]: SceneryTemplate };
}

// export interface UnitTemplate {
//   sprite: string;
//   team: 'friendly' | 'hostile';
//   hp?: number;
//   maxHp?: number;
//   mass?: number;
//   abilities?: any;
//   tags?: string[];
// }
// type UnitTemplate = Partial<Unit>

export interface SceneryTemplate {
  type: 'tree' | 'rock' | 'building' | 'water';
  size?: number;
  color?: string;
}

// const { farmer, soldier, worm, priest, ranger } = Freehold.bestiary;

export class SceneLoader {
  scenarios = { simple, complex, healing, projectile, squirrel };
  constructor(private sim: Simulator) {}

  loadScenario(scenario: string): void {
    if (scenario in this.scenarios) {
      const sceneText = this.scenarios[scenario];
      this.loadFromText(sceneText);
    } else {
      throw new Error(`Scenario "${scenario}" not found`);
    }
  }

  loadFromText(sceneText: string): void {
    try {
      this.loadSimpleFormat(sceneText);
    } catch (e) {
      console.error("Failed to load scene:", e);
      throw new Error("Invalid scene format");
    }
  }

  defaultLegend: { [key: string]: string } = {
    f: 'farmer', s: 'soldier', w: 'worm', p: 'priest', r: 'ranger', b: 'bombardier',
    q: 'squirrel', t: 'tamer', Q: 'megasquirrel', W: 'bigworm'
  }

  loadSimpleFormat(sceneText: string): void {
    this.sim.reset();
    const lines = sceneText.trim().split('\n');
    console.log("Loading scene from text:", lines);
    
    for (let y = 0; y < lines.length; y++) {
      const line = lines[y];
      if (!line.trim()) continue; // Skip empty lines
      // console.log(`Processing line ${y}: "${line}"`);
      if (line === "---") break; // End of scene definition

      for (let x = 0; x < line.length; x++) {
        const char = line[x];
        
        if (char === ' ' || char === '.') continue;
        
        const template = this.defaultLegend[char];
        if (template) {
          this.createUnit(template, x, y);
        }
      }
    }
  }

  private createUnit(unitName: string, x: number, y: number): void {
    console.log(`Creating unit ${unitName} at (${x}, ${y})`);
    // x += Math.floor(this.sim.fieldWidth / 2) - 10; // Centering offset
    // y += Math.floor(this.sim.fieldHeight / 2) - 10; // Centering
    this.sim.addUnit({ ...Freehold.unit(unitName), pos: { x, y } });
  }

}

console.log('SceneLoader module loaded.');
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.SceneLoader = SceneLoader; // Expose for browser use
}