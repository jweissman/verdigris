import { Simulator } from "./simulator";
import simple from './scenes/simple.battle.txt';
import complex from './scenes/complex.battle.txt';
import healing from './scenes/healing.battle.txt';
import projectile from './scenes/projectile.battle.txt';
import squirrel from './scenes/squirrel.battle.txt';
import chess from './scenes/chesslike.battle.txt';
import toymaker from './scenes/toymaker.battle.txt';
import desert from './scenes/desert-day.battle.txt';
import toymakerChallenge from './scenes/toymaker-challenge.battle.txt';
import mechatronSolo from './scenes/mechatron-solo.battle.txt';
import forestTracker from './scenes/forest-tracker.battle.txt';
import Encyclopaedia from "../dmg/encyclopaedia";
import { CommandHandler } from "../rules/command_handler";
import { SegmentedCreatures } from "../rules/segmented_creatures";

export class SceneLoader {
  static scenarios = { 
    simple, complex, healing, projectile, squirrel, chess, toymaker, desert, 
    toymakerChallenge, mechatronSolo, forestTracker 
  };
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
    V: 'bear', // Using V for bear since B is builder
    v: 'bird', // Using lowercase v for bird since b is bombardier  
    N: 'forest-squirrel', // N for nature squirrel
    Y: 'tracker', // Y for tracker
    
    // Mechanist support units
    B: 'builder', F: 'fueler', E: 'engineer', A: 'assembler',
    
    // Constructs  
    C: 'clanker', Z: 'zapper', R: 'roller', S: 'spiker'
  }

  loadSimpleFormat(sceneText: string): void {
    this.sim.reset();
    const lines = sceneText.trim().split('\n');
    let inMetadata = false;
    
    for (let y = 0; y < lines.length; y++) {
      const line = lines[y];
      if (!line.trim()) continue;
      
      if (line === "---") {
        inMetadata = true;
        continue;
      }
      
      if (inMetadata) {
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
    
    // Process queued commands immediately
    if (this.sim.queuedCommands && this.sim.queuedCommands.length > 0) {
      const commandHandler = new CommandHandler(this.sim);
      commandHandler.apply();
    }
    
    // Initialize segmented creatures immediately after loading
    const segmentedRule = new SegmentedCreatures(this.sim);
    segmentedRule.apply();
  }
  
  private parseMetadata(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    const parts = trimmed.split(' ');
    const command = parts[0];
    const args = parts.slice(1);
    
    if (command === 'bg') {
      (this.sim as any).background = args[0] || '';
      (this.sim as any).sceneBackground = args[0] || '';
      return;
    }
    
    // Handle strip width metadata
    if (command === 'strip') {
      (this.sim as any).stripWidth = args[0] || '';
      return;
    }
    
    // Handle battlefield height metadata
    if (command === 'height') {
      (this.sim as any).battleHeight = args[0] || '';
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
    const unitData = Encyclopaedia.unit(unitName);
    const unitWithPos = { ...unitData, pos: { x, y } };
    
    // Ensure meta is preserved - deep copy if it exists
    if (unitData.meta) {
      unitWithPos.meta = { ...unitData.meta };
    }
    
    this.sim.addUnit(unitWithPos);
  }

}

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.SceneLoader = SceneLoader; // Expose for browser use
}