import { Simulator } from "./simulator";
import { Unit } from "./sim/types";
import simple from './scenes/simple.battle.txt';
import complex from './scenes/complex.battle.txt';
import healing from './scenes/healing.battle.txt';
import projectile from './scenes/projectile.battle.txt';
import squirrel from './scenes/squirrel.battle.txt';
import chess from './scenes/chesslike.battle.txt';
import toymaker from './scenes/toymaker.battle.txt';
import desertday from './scenes/desert-day.battle.txt';
import { Freehold } from "./freehold";
import Encyclopaedia from "./dmg/encyclopaedia";

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
  static scenarios = { simple, complex, healing, projectile, squirrel, chess, toymaker, 'desert-day': desertday };
  constructor(private sim: Simulator) {}

  loadScene(scenario: string): void {
    this.loadScenario(scenario);
  }

  loadScenario(scenario: string): void {
    if (scenario in SceneLoader.scenarios) {
      const sceneText = SceneLoader.scenarios[scenario];
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
    q: 'squirrel', t: 'tamer', Q: 'megasquirrel', W: 'bigworm', u: 'rainmaker',
    d: 'demon', g: 'ghost', m: 'mimic-worm', k: 'skeleton', T: 'toymaker',
    
    // Desert Day creatures
    M: 'desert-worm', G: 'grappler', X: 'mechatron',
    H: 'worm-hunter', P: 'waterbearer', K: 'skirmisher',
    L: 'giant-sandworm', I: 'sand-ant',
    
    // Forest Day creatures  
    O: 'owl', // B conflicts with builder
    
    // Mechanist support units
    B: 'builder', F: 'fueler', E: 'engineer', A: 'assembler',
    
    // Constructs  
    C: 'clanker', Z: 'zapper', R: 'roller', S: 'spiker'
  }

  loadSimpleFormat(sceneText: string): void {
    this.sim.reset();
    const lines = sceneText.trim().split('\n');
    console.log("Loading scene from text:", lines);
    
    let inMetadata = false;
    
    for (let y = 0; y < lines.length; y++) {
      const line = lines[y];
      if (!line.trim()) continue; // Skip empty lines
      
      if (line === "---") {
        inMetadata = true;
        continue;
      }
      
      if (inMetadata) {
        // Parse metadata like "bg: lake"
        this.parseMetadata(line);
        continue;
      }

      // Process unit placement
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
  
  private parseMetadata(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    // Simple command format: "command arg1 arg2"
    const parts = trimmed.split(' ');
    const command = parts[0];
    const args = parts.slice(1);
    
    // Handle background separately (it's not a game command)
    if (command === 'bg') {
      (this.sim as any).sceneBackground = args[0] || '';
      return;
    }
    
    // Everything else goes through the command queue
    if (!this.sim.queuedCommands) {
      this.sim.queuedCommands = [];
    }
    
    this.sim.queuedCommands.push({
      type: command,
      args: args
    });
  }

  private createUnit(unitName: string, x: number, y: number): void {
    // console.log(`Creating unit ${unitName} at (${x}, ${y})`);
    this.sim.addUnit({ ...Encyclopaedia.unit(unitName), pos: { x, y } });
  }

}

console.log('SceneLoader module loaded.');
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.SceneLoader = SceneLoader; // Expose for browser use
}