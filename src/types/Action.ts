import { Vec2 } from "./Vec2";

export interface Action {
  kind: string;
  source?: string;
  target?: string | Vec2;
  tick?: number; // Move tick to top level
  meta?: {
    tick?: number; // Keep for backward compatibility
    aspect?: string;
    radius?: number;
    amount?: number;
    unit?: any;
    [key: string]: any;
  };
}
