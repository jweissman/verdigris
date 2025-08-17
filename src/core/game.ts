import { Simulator } from "./simulator";
// @ts-ignore
import worm from "../assets/sprites/worm.png";
// @ts-ignore
import soldier from "../assets/sprites/soldier.png";
// @ts-ignore
import farmer from "../assets/sprites/farmer.png";
// @ts-ignore
import slinger from "../assets/sprites/slinger.png";
// @ts-ignore
import priest from "../assets/sprites/priest.png";
// @ts-ignore
import bombardier from "../assets/sprites/bombardier.png";
// @ts-ignore
import tamer from "../assets/sprites/squirrel-tamer.png";
// @ts-ignore
import squirrel from "../assets/sprites/squirrel.png";
// @ts-ignore
import megasquirrel from "../assets/sprites/megasquirrel.png";
// @ts-ignore
import leaf from "../assets/sprites/leaf.png";
// @ts-ignore
import rainmaker from "../assets/sprites/rainmaker.png";
// @ts-ignore
import demon from "../assets/sprites/demon.png";
// @ts-ignore
import ghost from "../assets/sprites/ghost.png";
// @ts-ignore
import mimicWorm from "../assets/sprites/mimic-worm.png";
// @ts-ignore
import skeleton from "../assets/sprites/skeleton.png";
// @ts-ignore
import bigWorm from "../assets/sprites/big-worm.png";
// @ts-ignore
import skeletonMage from "../assets/sprites/skeleton-mage.png";
// @ts-ignore
import clanker from "../assets/sprites/clanker.png";
// @ts-ignore
import freezebot from "../assets/sprites/freezebot.png";
// @ts-ignore
import spikebot from "../assets/sprites/spikebot.png";
// @ts-ignore
import swarmbot from "../assets/sprites/swarmbot.png";
// @ts-ignore
import jumpbot from "../assets/sprites/jumpbot.png";
// @ts-ignore
import zapper from "../assets/sprites/zapper.png";
// @ts-ignore
import toymaker from "../assets/sprites/toymaker.png";
// @ts-ignore
import bear from "../assets/sprites/bear.png";
// @ts-ignore
import owl from "../assets/sprites/owl.png";
// @ts-ignore
import deer from "../assets/sprites/deer.png";
// @ts-ignore
import buck from "../assets/sprites/buck.png";
// @ts-ignore
import lightning from "../assets/sprites/lightning.png";
// @ts-ignore
import mechatron from "../assets/sprites/mechatron.png";
// @ts-ignore
import mechantronist from "../assets/sprites/mechatronist.png";
// @ts-ignore
import grappler from "../assets/sprites/grappler.png";
// @ts-ignore
import waterpriest from "../assets/sprites/waterpriest.png";
// @ts-ignore
import wormrider from "../assets/sprites/wormrider.png";

// @ts-ignore
import builder from "../assets/sprites/builder.png";
// @ts-ignore
import fueler from "../assets/sprites/fueler.png";
// @ts-ignore
import mechanic from "../assets/sprites/mechanic.png";
// @ts-ignore
import engineer from "../assets/sprites/engineer.png";
// @ts-ignore
import welder from "../assets/sprites/welder.png";
// @ts-ignore
import assembler from "../assets/sprites/assembler.png";

// @ts-ignore
import lakeBg from "../assets/bg/lake.png";
// @ts-ignore
import mountainBg from "../assets/bg/mountain.png";
// @ts-ignore
import monasteryBg from "../assets/bg/monastery.png";
// @ts-ignore
import burningCityBg from "../assets/bg/burning-city.png";
// @ts-ignore
import winterBg from "../assets/bg/winter.png";
// @ts-ignore
import toyforgeBg from "../assets/bg/toyforge.png";
// @ts-ignore
import desertBg from "../assets/bg/desert.png";
// @ts-ignore
import forestBg from "../assets/bg/forest.png";
// @ts-ignore
import cellEffects from "../assets/cell-effects.png";

import Renderer, { createScaledRenderer } from "./renderer";

class Game {
  public sim: Simulator;
  private lastSimTime: number = 0;
  private simTickRate: number = 8; // Simulation runs at 8fps for strategic gameplay

  renderer: Renderer;
  private _handleResize: () => void;
  private draw: () => void;
  private addInputListener: (cb: (e: { key: string }) => void) => void;
  private animationFrame: (cb: () => void) => void;

  constructor(
    canvas: HTMLCanvasElement,
    opts?: {
      addInputListener?: (cb: (e: { key: string }) => void) => void;
      animationFrame?: (cb: () => void) => void;
    },
  ) {
    this.addInputListener =
      opts?.addInputListener ||
      (typeof window !== "undefined"
        ? (cb) => window.addEventListener("keydown", cb as any)
        : () => {});
    this.animationFrame =
      opts?.animationFrame ||
      (typeof window !== "undefined"
        ? (cb) => requestAnimationFrame(cb)
        : () => {});
    this.loop = this.loop.bind(this);
    this.sim = new Simulator(40, 25); // 40×25 grid = 320×200 pixels at 8px per cell

    if (typeof window !== "undefined") {

      const scaledRenderer = createScaledRenderer(
        320,
        200,
        canvas,
        this.sim,
        Game.loadSprites(),
        Game.loadBackgrounds(),
      );
      this.renderer = scaledRenderer.renderer;
      this._handleResize = scaledRenderer.handleResize;
      this.draw = scaledRenderer.draw;
    } else {
      const mockCanvas = {
        width: 320,
        height: 200,
        getContext: () =>
          ({
            clearRect: () => {},
            fillRect: () => {},
            drawImage: () => {},
            save: () => {},
            restore: () => {},
            imageSmoothingEnabled: false,
          }) as any,
      };
      this.renderer = new Renderer(
        320,
        200,
        mockCanvas,
        this.sim,
        new Map<string, HTMLImageElement>(),
      );
      this._handleResize = () => {};
      this.draw = () => this.renderer.draw();
    }
  }

  bootstrap() {
    this.sim.reset();

    this.setupInput();

    this.animationFrame(this.loop);
  }

  static spriteList = [
    { name: "worm", src: worm },
    { name: "soldier", src: soldier },
    { name: "farmer", src: farmer },
    { name: "slinger", src: slinger },
    { name: "priest", src: priest },
    { name: "bombardier", src: bombardier },
    { name: "tamer", src: tamer },
    { name: "squirrel", src: squirrel },
    { name: "megasquirrel", src: megasquirrel },
    { name: "leaf", src: leaf },
    { name: "rainmaker", src: rainmaker },
    { name: "demon", src: demon },
    { name: "ghost", src: ghost },
    { name: "mimic-worm", src: mimicWorm },
    { name: "skeleton", src: skeleton },
    { name: "big-worm", src: bigWorm },
    { name: "skeleton-mage", src: skeletonMage },
    { name: "clanker", src: clanker },
    { name: "freezebot", src: freezebot },
    { name: "spikebot", src: spikebot },
    { name: "swarmbot", src: swarmbot },
    { name: "jumpbot", src: jumpbot },
    { name: "toymaker", src: toymaker },
    { name: "zapper", src: zapper },
    { name: "bear", src: bear },
    { name: "owl", src: owl },
    { name: "deer", src: deer },
    { name: "buck", src: buck },
    { name: "mechatron", src: mechatron },
    { name: "mechatronist", src: mechantronist },
    { name: "lightning", src: lightning },
    { name: "grappler", src: grappler },
    { name: "waterpriest", src: waterpriest },
    { name: "wormrider", src: wormrider },

    { name: "builder", src: builder },
    { name: "fueler", src: fueler },
    { name: "mechanic", src: mechanic },
    { name: "engineer", src: engineer },
    { name: "welder", src: welder },
    { name: "assembler", src: assembler },
    { name: "cell-effects", src: cellEffects },
  ];

  static backgroundList = [
    { name: "lake", src: lakeBg },
    { name: "mountain", src: mountainBg },
    { name: "monastery", src: monasteryBg },
    { name: "burning-city", src: burningCityBg },
    { name: "winter", src: winterBg },
    { name: "toyforge", src: toyforgeBg },
    { name: "desert", src: desertBg },
    { name: "forest", src: forestBg },
  ];

  static loadBackgrounds(): Map<string, HTMLImageElement> {
    if (typeof Image === "undefined") {
      console.debug("Skipping background loading in headless environment");
      return new Map();
    }

    let backgrounds = new Map<string, HTMLImageElement>();
    Game.backgroundList.forEach(({ name, src }) => {
      const img = new Image();
      backgrounds.set(name, img);
      img.onload = () => {
        console.debug(`Loaded background: ${name}`);
      };
      img.onerror = () => {
        console.error(`Failed to load background: ${src}`);
      };
      img.src = src;
    });
    return backgrounds;
  }

  static loadSprites(): Map<string, HTMLImageElement> {
    if (typeof Image === "undefined") {
      console.debug("Skipping sprite loading in headless environment");
      return new Map();
    }

    let sprites = new Map<string, HTMLImageElement>();
    let master = Game.spriteList;
    master.forEach(({ name, src }) => {
      const img = new Image();
      img.onload = () => {
        sprites.set(name, img);
      };
      img.onerror = () => {
        console.error(`Failed to load sprite: ${src}`);
      };
      img.src = src;
    });

    return sprites;
  }

  setupInput() {
    this.addInputListener(this.getInputHandler());
  }

  getInputHandler(): (e: { key: string }) => void {
    return (e) => {
      console.debug(`Key pressed: ${e.key} [default handler]`);
    };
  }

  loop() {
    this.update();
    this.animationFrame(this.loop);
  }

  lastStep: number = 0;
  update() {
    const now = Date.now();

    const simTickInterval = 1000 / this.simTickRate;
    if (now - this.lastSimTime >= simTickInterval) {
      this.sim.step();
      this.lastSimTime = now;
    }

    this.drawFrame();
  }

  drawFrame() {
    let t0 = performance.now();
    this.draw();
    let t1 = performance.now();
    let elapsed = t1 - t0;
    if (elapsed > 10) {
      console.warn(`Frame drawn in ${elapsed.toFixed(2)}ms`);
    }
  }

  handleResize() {
    this._handleResize();
  }
}

export { Game };

if (typeof window !== "undefined") {
  (window as any).Game = Game;
}
