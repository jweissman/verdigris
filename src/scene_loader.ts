import { Simulator } from "./simulator";
import { Unit } from "./sim/types";

export interface SceneDefinition {
  layout: string[];
  legend: { [key: string]: UnitTemplate };
  scenery?: { [key: string]: SceneryTemplate };
}

export interface UnitTemplate {
  sprite: string;
  team: 'friendly' | 'hostile';
  hp?: number;
  maxHp?: number;
  mass?: number;
  abilities?: any;
  tags?: string[];
}

export interface SceneryTemplate {
  type: 'tree' | 'rock' | 'building' | 'water';
  size?: number;
  color?: string;
}

export class SceneLoader {
  constructor(private sim: Simulator) {}

  loadFromText(sceneText: string): void {
    try {
      const scene: SceneDefinition = JSON.parse(sceneText);
      this.loadScene(scene);
    } catch (e) {
      // Try parsing as simple text format
      this.loadSimpleFormat(sceneText);
    }
  }

  loadScene(scene: SceneDefinition): void {
    this.sim.reset();
    
    const lines = scene.layout;
    const legend = scene.legend;
    
    for (let y = 0; y < lines.length; y++) {
      const line = lines[y];
      for (let x = 0; x < line.length; x++) {
        const char = line[x];
        
        if (char === ' ' || char === '.') continue; // Empty space
        
        const template = legend[char];
        if (template) {
          this.createUnitFromTemplate(template, x, y, `${char}_${x}_${y}`);
        }
      }
    }
  }

  loadSimpleFormat(sceneText: string): void {
    // Simple format: each line is a row, characters represent units
    // Default legend for common units
    const defaultLegend: { [key: string]: UnitTemplate } = {
      'f': { sprite: 'farmer', team: 'friendly', hp: 8, mass: 1 },
      'F': { sprite: 'farmer', team: 'friendly', hp: 12, mass: 2 }, // Heavy farmer
      's': { sprite: 'soldier', team: 'friendly', hp: 15, mass: 2 },
      'S': { sprite: 'soldier', team: 'friendly', hp: 20, mass: 3 }, // Heavy soldier
      'w': { sprite: 'worm', team: 'hostile', hp: 10, mass: 1, 
             abilities: {
               jumps: {
                 name: 'jump',
                 cooldown: 15,
                 config: { height: 5, duration: 10, impact: { radius: 2, damage: 3 } },
                 effect: (u: Unit, t: any) => {
                   u.meta.jumping = true;
                   u.meta.jumpProgress = 0;
                   u.meta.jumpOrigin = { x: u.pos.x, y: u.pos.y };
                   u.meta.jumpTarget = t || { x: u.pos.x + 2, y: u.pos.y };
                 }
               }
             }
           },
      'W': { sprite: 'worm', team: 'hostile', hp: 20, mass: 5 }, // Heavy worm for tossing
      'p': { sprite: 'priest', team: 'friendly', hp: 12, mass: 1, 
             abilities: {
               heal: {
                 name: 'heal',
                 cooldown: 20,
                 config: { radius: 2, amount: 8 },
                 effect: (u: Unit) => {
                   // Find nearby friendly units to heal
                   const nearbyAllies = u.intendedMove; // Placeholder for now
                   console.log(`${u.id} casting healing aura`);
                 }
               }
             }
           }, // Healer
      'r': { sprite: 'slinger', team: 'friendly', hp: 10, mass: 1 }, // Ranged unit
      'o': { sprite: 'orc', team: 'hostile', hp: 18, mass: 3 },
      'O': { sprite: 'orc', team: 'hostile', hp: 25, mass: 4 }, // Heavy orc
    };

    this.sim.reset();
    const lines = sceneText.trim().split('\n');
    
    for (let y = 0; y < lines.length; y++) {
      const line = lines[y];
      for (let x = 0; x < line.length; x++) {
        const char = line[x];
        
        if (char === ' ' || char === '.') continue;
        
        const template = defaultLegend[char];
        if (template) {
          this.createUnitFromTemplate(template, x, y, `${char}_${x}_${y}`);
        }
      }
    }
  }

  private createUnitFromTemplate(template: UnitTemplate, x: number, y: number, id: string): void {
    const unit: Partial<Unit> = {
      id,
      sprite: template.sprite,
      team: template.team,
      hp: template.hp || 10,
      maxHp: template.maxHp || template.hp || 10,
      mass: template.mass || 1,
      pos: { x, y },
      intendedMove: { x: 0, y: 0 },
      state: 'idle',
      abilities: template.abilities || {},
      tags: template.tags || [],
      meta: {}
    };

    this.sim.addUnit(unit);
  }

  // Generate a simple battle formation
  static generateSimpleBattle(): string {
    return `
  s.f.s
  f.f.f
  .....
  .....
  w.w.w
  .W...`;
  }

  // Generate a more complex scenario
  static generateComplexBattle(): string {
    return `
S.f.f.s
f....f.
......
......
w.w..w
.W..O.`;
  }

  // Generate a scenario to test tossing mechanics
  static generateTossTest(): string {
    return `
..f..
.....
.....
..W..
.....`;
  }
}