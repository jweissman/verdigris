import { Command } from "../rules/command";

export class RemoveProjectileCommand extends Command {
  execute(unitId: string | null, params: any): void {
    const { id } = params;
    
    if (!this.sim.projectiles) return;
    
    // Remove projectile by id
    const index = this.sim.projectiles.findIndex(p => p.id === id);
    if (index >= 0) {
      this.sim.projectiles.splice(index, 1);
    }
  }
}