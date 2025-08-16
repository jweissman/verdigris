import { Vec2 } from "./Vec2";

export type Input = {
  commands: {
    [unitId: string]: {
      action: "move" | "attack" | "stop" | "cast";
      spell?: string;
      target?: Vec2 | string;
    }[];
  };
};
