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
        (this.sim as any).background = value;
        (this.sim as any).sceneBackground = value;
        break;

      case "strip":
        (this.sim as any).stripWidth = value;
        break;

      case "height":
        (this.sim as any).battleHeight = value;
        break;

      default:
        console.warn(`Unknown scene metadata type: ${metadataType}`);
    }
  }
}
