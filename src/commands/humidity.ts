import { Command } from "../rules/command";

export class HumidityCommand extends Command {
  execute(unitId: string | null, params: any): void {
    const sim = this.sim;
    const { x, y, delta } = params;

    if (sim.humidityField && x !== undefined && y !== undefined) {
      const current = sim.humidityField.get(x, y);
      sim.humidityField.set(x, y, Math.max(0, Math.min(1, current + delta)));
    }
  }
}
