import { Rule } from "./rule";
import { Command } from "./command";
import { Toss } from "../commands/toss";
import { ChangeWeather } from "../commands/change_weather";
import { Deploy } from "../commands/deploy";
import { AirdropCommand } from "../commands/airdrop_command";
import { Lightning } from "../commands/lightning";
import { Grapple } from "../commands/grapple";
import { Pin } from "../commands/pin";
import { Temperature } from "../commands/temperature";

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
    this.commands.set('lightning', new Lightning(sim));
    this.commands.set('bolt', new Lightning(sim)); // Alias for lightning
    this.commands.set('grapple', new Grapple(sim));
    this.commands.set('hook', new Grapple(sim)); // Alias for grapple
    this.commands.set('pin', new Pin(sim));
    this.commands.set('temperature', new Temperature(sim));
    this.commands.set('temp', new Temperature(sim)); // Alias
  }

  apply = () => {
    if (!this.sim.queuedCommands || this.sim.queuedCommands.length === 0) {
      return;
    }

    const commandsToProcess = [];
    const commandsToKeep = [];
    
    // Separate commands that should run now vs later
    for (const queuedCommand of this.sim.queuedCommands) {
      // Check if command is scheduled for a future tick
      if (queuedCommand.tick !== undefined && queuedCommand.tick > this.sim.ticks) {
        commandsToKeep.push(queuedCommand);
      } else {
        commandsToProcess.push(queuedCommand);
      }
    }
    
    // if (commandsToProcess.length > 0) {
    //   console.log("CommandHandler: Processing", commandsToProcess.length, "queued commands");
    // }
    
    for (const queuedCommand of commandsToProcess) {
      // Skip commands with undefined or null type
      if (!queuedCommand.type) {
        console.warn(`Skipping command with undefined/null type:`, queuedCommand);
        continue;
      }
      
      const command = this.commands.get(queuedCommand.type);
      if (command) {
        // console.log(`Executing command: ${queuedCommand.type} with args:`, queuedCommand.args);
        // Pass unitId if it exists, otherwise pass null for system commands
        command.execute(queuedCommand.unitId || null, ...queuedCommand.args);
      } else if (queuedCommand.type && queuedCommand.type !== '') {
        // Only warn for non-empty command types
        console.warn(`Unknown command type: ${queuedCommand.type}`);
      }
    }

    // Keep scheduled commands for later
    this.sim.queuedCommands = commandsToKeep;
  }
}