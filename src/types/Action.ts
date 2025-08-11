import { Vec2 } from "./Vec2";

export interface Action {
  kind: string;
  source?: string;
  target?: string | Vec2;
  meta?: {
    aspect?: string;
    radius?: number;
    amount?: number;
    unit?: any;
    [key: string]: any;
  };
}