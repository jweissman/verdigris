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
import forestDay from './scenes/forest-day.battle.txt';
import Encyclopaedia from "../dmg/encyclopaedia";
import { CommandHandler } from "../rules/command_handler";
import { SegmentedCreatures } from "../rules/segmented_creatures";

export class SceneLoader {
  static scenarios = { 
    simple, complex, healing, projectile, squirrel, chess, toymaker, desert, 
    toymakerChallenge, mechatronSolo, forestTracker, forestDay
  };
  private unitCreationIndex: number = 0;
  
  constructor(private sim: Simulator) {}

  loadScene(scenario: string): void {
    this.loadScenario(scenario);
  }

  loadScenario(scenario: string): void {
    if (scenario in SceneLoader.scenarios) {
      const sceneText = SceneLoader.scenarios[scenario];
      this.unitCreationIndex = 0; // Reset for each scene
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

  static defaultLegend: { [key: string]: string } = {
    A: 'assembler',
    a: "toymaker",
    b: 'bombardier',
    B: 'builder',
    C: 'clanker',
    D: 'deer',
    d: 'demon',
    E: 'engineer',
    e: "tamer",
    f: 'farmer',
    F: 'fueler',
    g: 'ghost',
    G: 'grappler',
    H: 'worm-hunter',
    h: "bombardier",
    I: 'sand-ant',
    i: "farmer",
    j: "mechatron",
    J: "mechatronist",
    k: 'skeleton',
    K: 'skirmisher',
    L: 'giant-sandworm',
    M: 'desert-worm',
    m: 'mimic-worm',
    N: 'forest-squirrel',
    n: "big-worm", 
    O: 'owl',
    o: 'desert-megaworm',
    p: 'priest',
    P: 'waterbearer',
    Q: 'megasquirrel',
    q: 'squirrel',
    r: 'ranger',
    R: 'roller',
    s: 'soldier',
    S: 'spiker',
    t: 'tamer',
    T: 'toymaker',
    u: 'rainmaker',
    V: 'bear',
    v: 'bird',
    W: 'bigworm',
    w: 'worm',
    X: 'mechatron',
    Y: 'tracker',
    Z: 'zapper',
    z: "rainmaker",
  }
  

  loadSimpleFormat(sceneText: string): void {
    this.sim.reset();
    const lines = sceneText.trim().split('\n');
    let inMetadata = false;
    // console.log("SceneLoader: Processing lines", lines.length);
    
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
        
        const template = SceneLoader.defaultLegend[char];
        if (template) {
          this.createUnit(template, x, y);
        }
      }
    }
    
    if (this.sim.queuedCommands && this.sim.queuedCommands.length > 0) {
      const commandHandler = new CommandHandler(this.sim);
      commandHandler.apply();
    }
    
    const segmentedRule = new SegmentedCreatures(this.sim);
    segmentedRule.apply();
  }
  
  private parseMetadata(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    const parts = trimmed.split(' ');
    const command = parts[0];
    const args = parts.slice(1);
    
    // Handle scene rendering metadata directly for now
    if (command === 'bg' || command === 'background') {
      (this.sim as any).background = args[0] || '';
      (this.sim as any).sceneBackground = args[0] || '';
      return;
    }
    
    if (command === 'strip') {
      (this.sim as any).stripWidth = args[0] || '';
      return;
    }
    
    if (command === 'height') {
      (this.sim as any).battleHeight = args[0] || '';
      return;
    }
    
    // Known commands go through parseCommand
    const knownCommands = ['weather', 'deploy', 'spawn', 'airdrop', 'drop', 'lightning', 'bolt', 'temperature', 'temp', 'wander'];
    if (knownCommands.includes(command)) {
      this.sim.parseCommand(`${command} ${args.join(' ')}`);
    } else {
      console.warn(`Scene loader: Unrecognized command '${command}' - ignoring`);
    }
  }

  private createUnit(unitName: string, x: number, y: number): void {
    const unitData = Encyclopaedia.unit(unitName);
    const unitWithPos = { ...unitData, pos: { x, y } };
    
    // Ensure meta is preserved - deep copy if it exists
    if (unitData.meta) {
      unitWithPos.meta = { ...unitData.meta };
    }
    
    // Stagger ability cooldowns to prevent simultaneous mass abilities
    // Particularly important for jump abilities to prevent mutual destruction
    if (unitWithPos.abilities && unitWithPos.abilities.includes('jumps')) {
      // Spread jumps across 100 ticks to prevent mass mutual destruction
      const offset = (this.unitCreationIndex % 20) * 10; // 0, 10, 20... up to 190
      unitWithPos.lastAbilityTick = {
        jumps: -50 + offset // Some can jump immediately, others wait up to 140 ticks
      };
      this.unitCreationIndex++;
    }
    
    // Queue add command instead of directly adding
    if (!this.sim.queuedCommands) {
      this.sim.queuedCommands = [];
    }
    this.sim.queuedCommands.push({
      type: 'spawn',
      params: { unit: unitWithPos }
    });
  }

}

if (typeof window !== 'undefined') {
  // @ts-ignore
  window.SceneLoader = SceneLoader; // Expose for browser use
}