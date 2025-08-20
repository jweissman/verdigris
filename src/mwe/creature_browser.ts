import Encyclopaedia from "../dmg/encyclopaedia";
import { Game } from "../core/game";
import { Simulator } from "../core/simulator";
import Isometric from "../views/isometric";
import Orthographic from "../views/orthographic";
export interface CreatureData {
  type: string;
  sprite: string;
  hp: number;
  team: 'friendly' | 'hostile' | 'neutral';
  tags: string[];
  abilities: string[];
  isHuge: boolean;
  isMechanical: boolean;
  segmentCount: number;
}

export class CreatureBrowser {
  creatures: CreatureData[] = [];

  constructor() {
    this.loadCreatures();
  }

  private loadCreatures(): void {
    const creatureTypes = [
      "farmer",
      "soldier",
      "worm",
      "priest",
      "ranger",
      "bombardier",
      "squirrel",
      "tamer",
      "megasquirrel",
      "rainmaker",
      "skeleton",
      "demon",
      "ghost",
      "mimic-worm",
      "big-worm",
      "mesoworm",
      "toymaker",
      "mechatron",
      "grappler",
      "desert-megaworm",
      "builder",
      "fueler",
      "mechanic",
      "engineer",
      "welder",
      "assembler",
      "clanker",
      "freezebot",
      "spiker",
      "swarmbot",
      "roller",
      "zapper",

      "worm-hunter",
      "waterbearer",
      "skirmisher",
      "desert-worm",

      "dragon",
      "lancer",
      "miner",
      "mindmender",
    ];

    this.creatures = creatureTypes
      .map((type) => {
        try {
          const unit = Encyclopaedia.unit(type);
          return {
            type,
            sprite: unit.sprite || "unknown",
            hp: unit.hp || 0,
            team: (unit.team || "hostile") as "friendly" | "hostile",
            tags: unit.tags || [],
            abilities: unit.abilities || [],
            isHuge: unit.tags?.includes("huge") || false,
            isMechanical: unit.tags?.includes("mechanical") || false,
            segmentCount: (unit.meta as any)?.segmentCount || 0,
          };
        } catch (error) {
          console.warn(`Failed to load creature: ${type}`);
          return null;
        }
        // @ts-ignore
      })
      .filter((c) => c !== null) as CreatureData[];
  }

  getAll(): CreatureData[] {
    return this.creatures;
  }

  getByFilter(filterType: string): CreatureData[] {
    switch (filterType) {
      case "huge":
        return this.creatures.filter((c) => c.isHuge);
      case "mechanical":
        return this.creatures.filter((c) => c.isMechanical);
      case "friendly":
        return this.creatures.filter((c) => c.team === "friendly");
      case "hostile":
        return this.creatures.filter((c) => c.team === "hostile");
      case "segmented":
        return this.creatures.filter((c) => c.segmentCount > 0);
      default:
        return this.creatures;
    }
  }

  getCount(): number {
    return this.creatures.length;
  }

  static boot(): void {
    (window as any).CreatureBrowser = new CreatureBrowser();
  }
}

export default class CreatureBrowserUI {
  browser: CreatureBrowser = new CreatureBrowser();
  bgs: Map<string, HTMLImageElement> = Game.loadBackgrounds();
  sprites: Map<string, HTMLImageElement> = Game.loadSprites();

  constructor() {
    this.setupControls();
    this.renderCreatures(); // Actually render the creatures!
  }

  setupControls() {
    const filter = document.getElementById("creature-filter");
    if (!filter) {
      console.error("Filter element not found");
      return;
    }

    filter.addEventListener("change", () => {
      let filterType = (filter as HTMLSelectElement).value;
      this.renderCreatures(filterType);
    });
  }

  renderCreatures(filterType = "all") {
    const grid = document.getElementById("creature-grid");
    const count = document.getElementById("creature-count");

    if (!grid || !count) return;

    const creatures = this.browser.getByFilter(filterType);
    count.textContent = creatures.length.toString();

    grid.innerHTML = creatures
      .map(
        (creature, index) => `
            <div class="creature-card">
              <h3>${creature.type}</h3>
              <div class="sprite-display">
                <div>
                  <canvas 
                    class="creature-canvas-left" 
                    width="320" 
                    height="200" 
                    data-creature="${creature.type}"
                    data-facing="left"
                    id="canvas-${index}-left">
                  </canvas>
                  <div class="sprite-label">Left</div>
                </div>
                <!--
                <div>
                  <canvas 
                    class="creature-canvas-right" 
                    width="320" 
                    height="200" 
                    data-creature="${creature.type}"
                    data-facing="right"
                    id="canvas-${index}-right">
                  </canvas>
                  <div class="sprite-label">Right</div>
                </div>
                -->
              </div>
              <div class="creature-info">
                <div><strong>HP:</strong> ${creature.hp} | <strong>Team:</strong> ${creature.team}</div>
                <div><strong>Sprite:</strong> ${creature.sprite}</div>
                <div><strong>Abilities:</strong> ${creature.abilities.length}</div>
                ${creature.segmentCount > 0 ? `<div><strong>Segments:</strong> ${creature.segmentCount}</div>` : ""}
                <div class="creature-tags">
                  ${creature.isHuge ? '<span class="tag huge">HUGE</span>' : ""}
                  ${creature.isMechanical ? '<span class="tag mechanical">MECHANICAL</span>' : ""}
                  ${creature.segmentCount > 0 ? '<span class="tag segmented">SEGMENTED</span>' : ""}
                </div>
              </div>
            </div>
          `,
      )
      .join("");

    this.renderSprites();
  }

  renderSprites() {
    const canvases = document.querySelectorAll(
      ".creature-canvas-left, .creature-canvas-right",
    );

    canvases.forEach((canvas, index) => {
      const canvasEl = canvas as HTMLCanvasElement;
      const ctx = canvasEl.getContext("2d");
      const creatureType = canvasEl.dataset.creature;
      const facing = canvasEl.dataset.facing;

      if (!ctx || !creatureType) {
        return;
      }

      const unit = Encyclopaedia.unit(creatureType);
      const spriteName = unit.sprite || "soldier";
      const spriteImage = this.sprites.get(spriteName);

      let sim = new Simulator(1, 1);
      sim.addUnit({
        ...unit,
        pos: { x: 0, y: 0 },
      });

      let view = new Isometric(ctx, sim, 320, 200, this.sprites, this.bgs);
      // Can't access protected properties directly, use the view as-is
      view.show();
    });
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    new CreatureBrowserUI();
  });
}
