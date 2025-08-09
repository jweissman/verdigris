import Encyclopaedia from "./dmg/encyclopaedia";
import { Game } from "./game";
import { Simulator } from "./simulator";
import Isometric from "./views/isometric";
import Orthographic from "./views/orthographic";

// Isometric view configured for tiny encyclopedia canvases
// class TinyIsometric extends Isometric {
//   constructor(ctx: any, sim: any, width: number, height: number, sprites: any, backgrounds: any) {
//     super(ctx, sim, width, height, sprites, backgrounds);
//     // Adjust offsets for tiny 64x64 canvas - center the unit
//     this.baseOffsetX = 16;  // Center horizontally
//     this.baseOffsetY = 16;  // Center vertically (no +125 battlestrip offset)
//   }
// }

export interface CreatureData {
  type: string;
  sprite: string;
  hp: number;
  team: string;
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
      'farmer', 'soldier', 'worm', 'priest', 'ranger', 'bombardier',
      'squirrel', 'tamer', 'megasquirrel', 'rainmaker', 'skeleton',
      'demon', 'ghost', 'mimic-worm', 'big-worm', 'toymaker',
      'mechatron', 'grappler', 'desert-megaworm', 'builder', 'fueler',
      'mechanic', 'engineer', 'welder', 'assembler', 'clanker',
      'freezebot', 'spiker', 'swarmbot', 'roller', 'zapper'
    ];

    this.creatures = creatureTypes.map(type => {
      try {
        const unit = Encyclopaedia.unit(type);
        return {
          type,
          sprite: unit.sprite || 'unknown',
          hp: unit.hp || 0,
          team: unit.team || 'hostile',
          tags: unit.tags || [],
          abilities: Object.keys(unit.abilities || {}),
          isHuge: unit.tags?.includes('huge') || false,
          isMechanical: unit.tags?.includes('mechanical') || false,
          segmentCount: (unit as any).segments?.length || 0
        };
      } catch (error) {
        console.warn(`Failed to load creature: ${type}`);
        return null;
      }
    }).filter((c): c is CreatureData => c !== null);
  }

  getAll(): CreatureData[] {
    return this.creatures;
  }

  getByFilter(filterType: string): CreatureData[] {
    switch (filterType) {
      case 'huge':
        return this.creatures.filter(c => c.isHuge);
      case 'mechanical':
        return this.creatures.filter(c => c.isMechanical);
      case 'friendly':
        return this.creatures.filter(c => c.team === 'friendly');
      case 'hostile':
        return this.creatures.filter(c => c.team === 'hostile');
      case 'segmented':
        return this.creatures.filter(c => c.segmentCount > 0);
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
    // let bgs = Game.loadBackgrounds();
    // let sprites = Game.loadSprites();

    this.setupControls();
    // this.renderCreatures();
  }

  setupControls() {
    const filter = document.getElementById('creature-filter');
    if (!filter) {
      console.error('Filter element not found');
      return;
    }

    filter.addEventListener('change', () => {
      let filterType = (filter as HTMLSelectElement).value;
      this.renderCreatures(filterType);
    });
  }

  renderCreatures(filterType = 'all') {
    const grid = document.getElementById('creature-grid');
    const count = document.getElementById('creature-count');

    if (!grid || !count) return;

    const creatures = this.browser.getByFilter(filterType);
    count.textContent = creatures.length.toString();

    grid.innerHTML = creatures.map((creature, index) => `
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
                ${creature.segmentCount > 0 ? `<div><strong>Segments:</strong> ${creature.segmentCount}</div>` : ''}
                <div class="creature-tags">
                  ${creature.isHuge ? '<span class="tag huge">HUGE</span>' : ''}
                  ${creature.isMechanical ? '<span class="tag mechanical">MECHANICAL</span>' : ''}
                  ${creature.segmentCount > 0 ? '<span class="tag segmented">SEGMENTED</span>' : ''}
                </div>
              </div>
            </div>
          `).join('');

    this.renderSprites();
  }

  renderSprites() {
    console.log(`🎨 CREATURE BROWSER: Starting sprite rendering`);
    
    // sleep for 100ms to ensure sprites are loaded
    // setTimeout(() => {
    //   console.log(`   🖼️  Backgrounds loaded: ${bgs.size}`);
    // }, 100);

    
    console.log(`   📦 Loaded ${this.sprites.size} sprites, ${this.bgs.size} backgrounds`);
    console.log(`   🖼️  Available sprites: ${Array.from(this.sprites.keys()).slice(0, 10).join(', ')}...`);
    
    const canvases = document.querySelectorAll('.creature-canvas-left, .creature-canvas-right');
    console.log(`   🎯 Found ${canvases.length} canvases to render`);
    
    canvases.forEach((canvas, index) => {
      const canvasEl = canvas as HTMLCanvasElement;
      const ctx = canvasEl.getContext('2d');
      const creatureType = canvasEl.dataset.creature;
      const facing = canvasEl.dataset.facing;

      if (!ctx || !creatureType) {
        console.log(`   ❌ Canvas ${index}: Missing context or creature type`);
        return;
      }

      // Check if sprite exists for this creature
      const unit = Encyclopaedia.unit(creatureType);
      const spriteName = unit.sprite || 'soldier';
      const spriteImage = this.sprites.get(spriteName);
      
      if (!spriteImage && index < 5) { // Only log first few missing sprites
        console.log(`   ⚠️  Missing sprite for ${creatureType}: "${spriteName}"`);
      }

      // Setup sim - single unit centered
      let sim = new Simulator(1, 1);
      sim.addUnit({
        ...unit, pos: { x: 0, y: 0 }
      });

      // Create Isometric view with adjusted offsets for creature browser
      let view = new Isometric(ctx, sim, 320, 200, this.sprites, this.bgs);
      // Adjust offsets to center the single unit
      view.baseOffsetX = 160;  // Center horizontally in 320px
      view.baseOffsetY = 100;  // Center vertically in 200px
      view.show();
    });
    
    console.log(`\\n🏁 CREATURE BROWSER: Sprite rendering finished`);
  }
}

// Auto-boot when module loads
if (typeof window !== 'undefined') {
  // CreatureBrowser.boot();
  window.addEventListener('load', () => {
    console.log('CreatureBrowserUI booting...');
      new CreatureBrowserUI();
    });
}