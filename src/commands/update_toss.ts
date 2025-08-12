import { Command } from "../rules/command";
import { Transform } from "../core/transform";

export class UpdateTossCommand extends Command {
  private transform: Transform;
  
  constructor(sim: any, transform?: Transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }
  
  execute(unitId: string | null, params: Record<string, any>): void {
    const targetId = params.unitId as string;
    const complete = params.complete as boolean;
    
    if (!targetId) return;
    
    this.transform.mapUnits(unit => {
      if (unit.id === targetId) {
        if (complete) {
          // Toss completed
          return {
            ...unit,
            pos: { 
              x: params.targetX as number, 
              y: params.targetY as number 
            },
            meta: {
              ...unit.meta,
              tossing: false,
              tossProgress: undefined,
              tossOrigin: undefined,
              tossTarget: undefined,
              tossForce: undefined,
              z: 0
            }
          };
        } else {
          // Update toss progress
          return {
            ...unit,
            pos: { 
              x: params.x as number, 
              y: params.y as number 
            },
            meta: {
              ...unit.meta,
              tossProgress: params.progress as number,
              z: params.z as number
            }
          };
        }
      }
      return unit;
    });
  }
}