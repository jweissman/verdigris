import { Simulator } from "./simulator";
import simple from "./scenes/simple.battle.txt";
import complex from "./scenes/complex.battle.txt";
import healing from "./scenes/healing.battle.txt";
import projectile from "./scenes/projectile.battle.txt";
import squirrel from "./scenes/squirrel.battle.txt";
import chess from "./scenes/chesslike.battle.txt";
import toymaker from "./scenes/toymaker.battle.txt";
import desert from "./scenes/desert-day.battle.txt";
import toymakerChallenge from "./scenes/toymaker-challenge.battle.txt";
import mechatronSolo from "./scenes/mechatron-solo.battle.txt";
import forestTracker from "./scenes/forest-tracker.battle.txt";
import forestDay from "./scenes/forest-day.battle.txt";
import simpleMesowormTest from "./scenes/simple-mesoworm-test.battle.txt";
import toymakerBalanced from "./scenes/toymaker-balanced-challenge.battle.txt";
import heroShowcase from "./scenes/hero-showcase.battle.txt";
import titleBackground from "./scenes/title-background.battle.txt";
import citySiege from "./scenes/city-siege.battle.txt";
import swampAmbush from "./scenes/swamp-ambush.battle.txt";
import hamletDefense from "./scenes/hamlet-defense.battle.txt";
import ultimateGauntlet from "./scenes/ultimate-gauntlet.battle.txt";
import survivalArena from "./scenes/survival-arena.battle.txt";
import tacticalGauntlet from "./scenes/tactical-gauntlet.battle.txt";
import mythicDragonLair from "./scenes/mythic-dragon-lair.battle.txt";
import mythicTitanColossus from "./scenes/mythic-titan-colossus.battle.txt";
import mythicLichThrone from "./scenes/mythic-lich-throne.battle.txt";
import mythicKrakenDepths from "./scenes/mythic-kraken-depths.battle.txt";
import dragonEncounter from "./scenes/dragon-encounter.battle.txt";
import mageBattle from "./scenes/mage-battle.battle.txt";
import coastalMages from "./scenes/coastal-mages.battle.txt";
import coastalAgora from "./scenes/coastal-agora.battle.txt";
import Encyclopaedia from "../dmg/encyclopaedia";
import { CommandHandler } from "./command_handler";

export class SceneLoader {
  static scenarios = {
    simple,
    complex,
    healing,
    projectile,
    squirrel,
    chess,
    toymaker,
    desert,
    toymakerChallenge,
    mechatronSolo,
    forestTracker,
    forestDay,
    simpleMesowormTest,
    toymakerBalanced,
    heroShowcase,
    titleBackground,
    citySiege,
    swampAmbush,
    hamletDefense,
    ultimateGauntlet,
    survivalArena,
    tacticalGauntlet,
    mythicDragonLair,
    mythicTitanColossus,
    mythicLichThrone,
    mythicKrakenDepths,
    dragonEncounter,
    mageBattle,
    coastalMages,
    coastalAgora,
  };
  private unitCreationIndex: number = 0;
  private customLegend: { [key: string]: string } = {};

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
    A: "assembler",
    a: "toymaker",
    b: "bombardier",
    B: "builder",
    C: "clanker",
    D: "deer",
    d: "demon",
    E: "engineer",
    e: "tamer",
    f: "farmer",
    F: "fueler",
    g: "ghost",
    G: "grappler",
    H: "worm-hunter",
    h: "bombardier",
    I: "sand-ant",
    i: "farmer",
    j: "mechatron",
    J: "mechatronist",
    k: "skeleton",
    K: "skirmisher",
    L: "giant-sandworm",
    m: "mimic-worm",
    M: "desert-worm",
    N: "forest-squirrel",
    n: "big-worm",
    O: "owl",
    o: "desert-megaworm",
    p: "priest",
    P: "waterbearer",
    Q: "megasquirrel",
    q: "squirrel",
    r: "ranger",
    R: "roller",
    s: "soldier",
    S: "spiker",
    t: "tamer",
    T: "toymaker",
    u: "rainmaker",
    V: "bear",
    v: "bird",
    W: "bigworm",
    w: "worm",
    x: "mesoworm",
    X: "mechatron",
    Y: "tracker",
    Z: "zapper",
    z: "rainmaker",

    // TODO i don't love these either??
    ç: "champion",
    α: "acrobat",
    β: "berserker",
    γ: "guardian",
    σ: "shadowBlade",
    dragon: "dragon",

    // todo use builtin index
    // Adding mage mappings using extended ASCII
    // "1": "philosopher",
    // "2": "rhetorician", 
    // "3": "logician",
    // "4": "geometer",
    // "5": "mentalist",
    // "6": "trickster",
  };

  loadSimpleFormat(sceneText: string): void {
    this.sim.reset();
    this.customLegend = {}; // Reset custom legend for each scene
    const lines = sceneText.trim().split("\n");
    
    // First pass: find and parse metadata (including legend)
    let metadataStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === "---") {
        metadataStartIndex = i + 1;
        break;
      }
    }
    
    if (metadataStartIndex >= 0) {
      for (let i = metadataStartIndex; i < lines.length; i++) {
        this.parseMetadata(lines[i]);
      }
    }
    
    // Second pass: parse the grid using the legend
    for (let y = 0; y < lines.length; y++) {
      const line = lines[y];
      if (!line.trim()) continue;
      
      if (line === "---") {
        break; // Stop at metadata marker
      }

      let x = 0;
      while (x < line.length) {
        const char = line[x];

        if (char === " " || char === ".") {
          x++;
          continue;
        }

        // Check for multi-character legends (like "dragon")
        let matched = false;
        for (const [legend, unitType] of Object.entries(this.customLegend)) {
          if (legend.length > 1 && line.substring(x, x + legend.length) === legend) {
            this.createUnit(unitType, x, y);
            x += legend.length;
            matched = true;
            break;
          }
        }

        if (!matched) {
          // Check single character legend
          const template = this.customLegend[char] || SceneLoader.defaultLegend[char];
          if (template) {
            this.createUnit(template, x, y);
          }
          x++;
        }
      }
    }

    if (this.sim.queuedCommands && this.sim.queuedCommands.length > 0) {
      const commandHandler = new CommandHandler(this.sim);

      const context = this.sim.getTickContext();
      commandHandler.execute(context);
    }
  }

  private parseMetadata(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Check for legend definition (e.g., "1: philosopher" or "a: skeleton" or "dragon: dragon")
    if (trimmed.includes(":") && !trimmed.startsWith("#")) {
      const colonIndex = trimmed.indexOf(":");
      const char = trimmed.substring(0, colonIndex).trim();
      const unitType = trimmed.substring(colonIndex + 1).trim().split(" ")[0]; // Take first word after colon
      
      // Support both single character and multi-character legends
      if (char.length > 0) {
        this.customLegend[char] = unitType;
        return;
      }
    }

    const parts = trimmed.split(" ");
    const command = parts[0];
    const args = parts.slice(1);

    if (command === "bg" || command === "background") {
      this.sim.setBackground(args[0] || "");
      return;
    }

    if (command === "strip") {
      this.sim.setStripWidth(args[0] || "");
      return;
    }

    if (command === "height") {
      this.sim.setBattleHeight(args[0] || "");
      return;
    }

    const knownCommands = [
      "bg",
      "weather",
      "deploy",
      "spawn",
      "airdrop",
      "drop",
      "lightning",
      "bolt",
      "temperature",
      "temp",
      "wander",
    ];
    if (knownCommands.includes(command)) {
      this.sim.parseCommand(`${command} ${args.join(" ")}`);
    } else {
      if (command === "#") {
      } else {
        throw new Error(
          `Scene loader: Unrecognized command '${command}' - ignoring`,
        );
      }
    }
  }

  private createUnit(unitName: string, x: number, y: number): void {
    if (!this.sim.queuedCommands) {
      this.sim.queuedCommands = [];
    }

    this.sim.queuedCommands.push({
      type: "spawn",
      params: {
        unitType: unitName,
        x: x,
        y: y,
      },
    });
  }
}

if (typeof window !== "undefined") {
  // @ts-ignore
  window.SceneLoader = SceneLoader; // Expose for browser use
}
