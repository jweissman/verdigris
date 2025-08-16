import type { QueuedCommand } from "./command_handler";
import type { TickContext } from "../core/tick_context";

/**
 * Helper class to collect commands instead of queueing them directly.
 * This allows rules to return commands for parallel execution.
 */
export class CommandCollector {
  private commands: QueuedCommand[] = [];

  constructor(private context: TickContext) {}

  queueCommand(command: QueuedCommand): void {
    this.commands.push(command);
  }

  getCommands(): QueuedCommand[] {
    return this.commands;
  }

  getAllUnits() {
    return this.context.getAllUnits();
  }

  findUnitById(id: string) {
    return this.context.findUnitById(id);
  }

  findUnitsInRadius(center: { x: number; y: number }, radius: number) {
    return this.context.findUnitsInRadius(center, radius);
  }

  getUnitsAt(pos: { x: number; y: number }) {
    return this.context.getUnitsAt(pos);
  }

  getCurrentTick() {
    return this.context.getCurrentTick();
  }

  getFieldWidth() {
    return this.context.getFieldWidth();
  }

  getFieldHeight() {
    return this.context.getFieldHeight();
  }

  getRandom() {
    return this.context.getRandom();
  }

  getParticles() {
    return this.context.getParticles();
  }

  getProjectiles() {
    return this.context.getProjectiles();
  }

  isWinterActive() {
    return this.context.isWinterActive();
  }

  isSandstormActive() {
    return this.context.isSandstormActive();
  }
}
