import { Command, CommandParams } from "../rules/command";

/**
 * SceneMetadata command - sets scene rendering metadata
 * Used for bg, strip, height commands
 */
export class SceneMetadata extends Command {
  execute(_unitId: string | null, params: CommandParams): void {
    const metadataType = params.type as string;
    const value = params.value;

    switch (metadataType) {
      case "bg":
      case "background":
        this.sim.setBackground(value);
        break;

      case "strip":
        this.sim.setStripWidth(value);
        break;

      case "height":
        this.sim.setBattleHeight(value);
        break;

      default:
        console.warn(`Unknown scene metadata type: ${metadataType}`);
    }
  }
}
