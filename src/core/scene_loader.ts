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
import Encyclopaedia from "../dmg/encyclopaedia";
import { CommandHandler } from "../rules/command_handler";

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

    ç: "champion",
    α: "acrobat",
    β: "berserker",
    γ: "guardian",
    σ: "shadowBlade",
  };

  loadSimpleFormat(sceneText: string): void {
    this.sim.reset();
    const lines = sceneText.trim().split("\n");
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

      for (let x = 0; x < line.length; x++) {
        const char = line[x];

        if (char === " " || char === ".") continue;

        const template = SceneLoader.defaultLegend[char];
        if (template) {
          this.createUnit(template, x, y);
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

    const parts = trimmed.split(" ");
    const command = parts[0];
    const args = parts.slice(1);

    if (command === "bg" || command === "background") {
      (this.sim as any).background = args[0] || "";
      (this.sim as any).sceneBackground = args[0] || "";
      return;
    }

    if (command === "strip") {
      (this.sim as any).stripWidth = args[0] || "";
      return;
    }

    if (command === "height") {
      (this.sim as any).battleHeight = args[0] || "";
      return;
    }

    const knownCommands = [
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
        console.warn(
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
