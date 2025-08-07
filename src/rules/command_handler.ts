import { Rule } from "./rule";
import { Command } from "./command";
import { Toss } from "../commands/toss";
import { ChangeWeather } from "../commands/change_weather";
import { Deploy } from "../commands/deploy";
import { AirdropCommand } from "../commands/airdrop_command";

export type QueuedCommand = {
  type: string;
  args: string[];
  unitId?: string; // Optional for system commands
  tick?: number;
};

export class CommandHandler extends Rule {
  private commands: Map<string, Command> = new Map();

  constructor(sim: any) {
    super(sim);
    // Register available commands
    this.commands.set('toss', new Toss(sim));
    this.commands.set('weather', new ChangeWeather(sim));
    this.commands.set('deploy', new Deploy(sim));
    this.commands.set('spawn', new Deploy(sim)); // Alias for deploy
    this.commands.set('airdrop', new AirdropCommand(sim));
    this.commands.set('drop', new AirdropCommand(sim)); // Alias for airdrop
  }

  apply = () => {
    if (!this.sim.queuedCommands || this.sim.queuedCommands.length === 0) {
      return;
    }

    console.log("CommandHandler: Processing", this.sim.queuedCommands.length, "queued commands");
    
    for (const queuedCommand of this.sim.queuedCommands) {
      // Skip commands with undefined or null type
      if (!queuedCommand.type) {
        console.warn(`Skipping command with undefined/null type:`, queuedCommand);
        continue;
      }
      
      const command = this.commands.get(queuedCommand.type);
      if (command) {
        console.log(`Executing command: ${queuedCommand.type} with args:`, queuedCommand.args);
        queuedCommand.tick = this.sim.ticks;
        // Pass unitId if it exists, otherwise pass null for system commands
        command.execute(queuedCommand.unitId || null, ...queuedCommand.args);
      } else {
        console.warn(`Unknown command type: ${queuedCommand.type}`);
      }
    }

    // Clear processed commands
    this.sim.queuedCommands = [];
  }
}