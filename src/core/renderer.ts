import { Simulator } from "./simulator";
import Orthographic from "../views/orthographic";
import Cinematic from "../views/cinematic";
import Isometric from "../views/isometric";
import { InventoryView } from "../views/inventory";
import { HeroAnimationManager } from "../rendering/hero_animation_manager";

interface CanvasLike {
  width: number;
  height: number;
  getContext(type: "2d"): CanvasRenderingContext2D | null;
}

function createCanvas(width: number, height: number): CanvasLike {
  if (typeof document !== "undefined" && document.createElement) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  return {
    width,
    height,
    getContext: () =>
      ({
        fillRect: () => {},
        clearRect: () => {},
        drawImage: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        arc: () => {},
        fillStyle: "",
        fill: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        globalAlpha: 1,
        imageSmoothingEnabled: false,
      }) as any,
  };
}

class Display {
  protected readonly width: number;
  protected readonly height: number;
  protected readonly ctx: CanvasRenderingContext2D;
  private rotationAngle: number = 0;

  constructor(width: number, height: number, canvas: CanvasLike) {
    this.width = width;
    this.height = height;
    this.ctx = canvas.getContext("2d")!;
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  draw() {
    this.clear();
    this.render();
  }

  protected render() {
    console.warn(
      "[RED TRIANGLE] Display#render() not implemented in",
      this.constructor.name,
    );

    this.ctx.fillStyle = "#0000ff";
    this.ctx.fillRect(0, 0, this.width, this.height);

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(this.rotationAngle);

    this.ctx.fillStyle = "red";
    this.ctx.beginPath();
    this.ctx.moveTo(0, -20);
    this.ctx.lineTo(-20, 20);
    this.ctx.lineTo(20, 20);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();

    this.rotationAngle += 0.02;
  }

  protected clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}

class ScaledDisplay {
  private virtualCanvas: CanvasLike;
  private display: Display;
  private scale: number = 1;

  constructor(
    private targetWidth: number,
    private targetHeight: number,
    private physicalCanvas: HTMLCanvasElement,
  ) {
    this.virtualCanvas = createCanvas(targetWidth, targetHeight);
    this.display = new Display(targetWidth, targetHeight, this.virtualCanvas);

    const physicalCtx = this.physicalCanvas.getContext("2d")!;
    physicalCtx.imageSmoothingEnabled = false;
  }

  handleResize() {
    if (typeof window === "undefined") return;

    const scaleX = Math.floor(window.innerWidth / this.targetWidth);
    const scaleY = Math.floor(window.innerHeight / this.targetHeight);
    this.scale = Math.max(1, Math.min(scaleX, scaleY));

    this.physicalCanvas.width = this.targetWidth * this.scale;
    this.physicalCanvas.height = this.targetHeight * this.scale;

    const ctx = this.physicalCanvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
  }

  draw() {
    this.display.draw();
    this.blit();
  }

  private blit() {
    const ctx = this.physicalCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, this.physicalCanvas.width, this.physicalCanvas.height);
    ctx.drawImage(
      this.virtualCanvas as HTMLCanvasElement,
      0,
      0,
      this.targetWidth,
      this.targetHeight,
      0,
      0,
      this.physicalCanvas.width,
      this.physicalCanvas.height,
    );
  }
}

type ViewMode = "grid" | "cinematic" | "iso" | "inventory";
export default class Renderer extends Display {
  public viewMode: ViewMode = "iso";
  private battle: Orthographic | null = null;
  private cinematic: Cinematic | null = null;
  private isometric: Isometric | null = null;
  private inventory: InventoryView | null = null;
  public hoverCell: { x: number; y: number } | null = null;
  private animationManager: HeroAnimationManager;

  constructor(
    width: number,
    height: number,
    canvas: CanvasLike,
    private sim: Simulator,
    private sprites: Map<string, HTMLImageElement>,
    private backgrounds: Map<string, HTMLImageElement> = new Map(),
  ) {
    super(width, height, canvas);
    
    // Renderer owns animation management
    this.animationManager = new HeroAnimationManager();

    this.battle = new Orthographic(
      this.ctx,
      this.sim,
      this.width,
      this.height,
      this.sprites,
      this.backgrounds,
    );
    this.cinematic = new Cinematic(
      this.ctx,
      this.sim,
      this.width,
      this.height,
      this.sprites,
      this.backgrounds,
    );
    this.isometric = new Isometric(
      this.ctx,
      this.sim,
      this.width,
      this.height,
      this.sprites,
      this.backgrounds,
    );
  }

  setViewMode(mode: ViewMode) {
    this.viewMode = mode;
  }

  private updateAnimations() {
    // Update hero animations based on current sim state
    this.animationManager.update(this.sim.units, this.sim.ticks);
  }
  
  getAnimationManager(): HeroAnimationManager {
    return this.animationManager;
  }

  get cinematicView() {
    return this.viewMode === "cinematic";
  }
  get isometricView() {
    return this.viewMode === "iso";
  }
  get gridView() {
    return this.viewMode === "grid";
  }

  render() {
    // Update animations based on sim state
    this.updateAnimations();
    
    if (this.viewMode === "cinematic") {
      if (this.cinematic) {
        this.cinematic.sim = this.sim;
        this.cinematic.show();
      }
    } else if (this.viewMode === "grid") {
      if (this.battle) {
        this.battle.sim = this.sim;
        this.battle.show();
      }
    } else if (this.viewMode === "iso") {
      if (this.isometric) {
        this.isometric.sim = this.sim;
        // Pass hover cell to isometric view
        (this.isometric as any).hoverCell = this.hoverCell;
        this.isometric.show();
      }
    } else if (this.viewMode === "inventory") {
      if (!this.inventory) {
        this.inventory = new InventoryView(this.sim, this.ctx, this.width, this.height, this.sprites);
      }
      this.inventory.render();
    }
  }
}

export function createScaledRenderer(
  targetWidth: number,
  targetHeight: number,
  physicalCanvas: HTMLCanvasElement,
  sim: Simulator,
  sprites: Map<string, HTMLImageElement>,
  backgrounds: Map<string, HTMLImageElement> = new Map(),
) {
  const virtualCanvas = createCanvas(targetWidth, targetHeight);
  const renderer = new Renderer(
    targetWidth,
    targetHeight,
    virtualCanvas,
    sim,
    sprites,
    backgrounds,
  );

  let scale = 1;

  const handleResize = () => {
    if (typeof window === "undefined") return;

    const dpr = window.devicePixelRatio || 1;
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight;

    const scaleX = Math.floor(availableWidth / targetWidth);
    const scaleY = Math.floor(availableHeight / targetHeight);
    scale = Math.max(1, Math.min(scaleX, scaleY));

    const exactWidth = targetWidth * scale;
    const exactHeight = targetHeight * scale;

    physicalCanvas.width = exactWidth;
    physicalCanvas.height = exactHeight;

    physicalCanvas.style.width = `${exactWidth}px`;
    physicalCanvas.style.height = `${exactHeight}px`;

    physicalCanvas.style.imageRendering = "pixelated";
    physicalCanvas.style.imageRendering = "crisp-edges";

    const ctx = physicalCanvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    console.debug(
      `Scaled to ${scale}x: virtual(${targetWidth}x${targetHeight}) → physical(${exactWidth}x${exactHeight}), DPR: ${dpr}`,
    );
  };

  const draw = () => {
    renderer.draw();

    const ctx = physicalCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, physicalCanvas.width, physicalCanvas.height);

    const exactScale = Math.floor(scale); // Use integer scale only
    ctx.drawImage(
      virtualCanvas as HTMLCanvasElement,
      0,
      0,
      targetWidth,
      targetHeight, // Source: exact virtual canvas size
      0,
      0,
      targetWidth * exactScale,
      targetHeight * exactScale, // Dest: exact scaled size
    );
  };

  return { renderer, handleResize, draw };
}

if (typeof window !== "undefined") {
  // @ts-ignore
  window.Display = Display;
  // @ts-ignore
  window.ScaledDisplay = ScaledDisplay;
  // @ts-ignore
  window.Renderer = Renderer;
  // @ts-ignore
  window.createScaledRenderer = createScaledRenderer;
}
