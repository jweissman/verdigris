import { Rule } from "./rule";
import { Command } from "./command";
import { Toss } from "../commands/toss_command";

export type QueuedCommand = {
  commandType: 'toss';
  unitId: string;
  args: any[];
  tick?: number;
};

export class CommandHandler extends Rule {
  private commands: Map<string, Command> = new Map();

  constructor(sim: any) {
    super(sim);
    // Register available commands
    this.commands.set('toss', new Toss(sim));
  }

  apply = () => {
    if (!this.sim.queuedCommands || this.sim.queuedCommands.length === 0) {
      return;
    }

    console.log("CommandHandler: Processing", this.sim.queuedCommands.length, "queued commands");
    
    for (const queuedCommand of this.sim.queuedCommands) {
      const command = this.commands.get(queuedCommand.commandType);
      if (command) {
        console.log(`Executing command: ${queuedCommand.commandType} on ${queuedCommand.unitId}`);
        queuedCommand.tick = this.sim.ticks;
        command.execute(queuedCommand.unitId, ...queuedCommand.args);
      } else {
        console.warn(`Unknown command type: ${queuedCommand.commandType}`);
      }
    }

    // Clear processed commands
    this.sim.queuedCommands = [];
  }
}