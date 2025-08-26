import { Command } from "../rules/command";

export class RemoveProjectileCommand extends Command {
  execute(unitId: string | null, params: any): void {
    const { id } = params;

    // Remove from SoA arrays
    if (this.sim.projectileArrays) {
      this.sim.invalidateProjectilesCache();
      this.sim.projectileArrays.removeProjectileById(id);
    }
  }
}
