export class ScalarField {
  private grid: number[][];
  public readonly width: number;
  public readonly height: number;


  constructor(width: number, height: number, initialValue: number = 0) {
    this.width = width;
    this.height = height;
    this.grid = Array(height).fill(null).map(() => Array(width).fill(initialValue));
  }

  get(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.grid[Math.floor(y)][Math.floor(x)];
  }

  set(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.grid[Math.floor(y)][Math.floor(x)] = value;
  }

  add(x: number, y: number, delta: number): void {
    this.set(x, y, this.get(x, y) + delta);
  }

  // Smoothly blend a value over an area with falloff
  addGradient(centerX: number, centerY: number, radius: number, intensity: number): void {
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(centerY + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= radius) {
          const falloff = 1 - (distance / radius);
          const contribution = intensity * falloff * falloff; // Quadratic falloff
          this.add(x, y, contribution);
        }
      }
    }
  }

  // Apply diffusion to smooth out the field
  diffuse(rate: number = 0.1): void {
    const newGrid = this.grid.map(row => [...row]);

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const neighbors = [
          this.grid[y - 1][x], this.grid[y + 1][x], // vertical
          this.grid[y][x - 1], this.grid[y][x + 1] // horizontal
        ];
        const avgChange = neighbors.reduce((sum, val) => sum + val, 0) / 4 - this.grid[y][x];
        newGrid[y][x] += avgChange * rate;
      }
    }

    this.grid = newGrid;
  }

  // Decay all values toward zero
  decay(rate: number = 0.01): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] *= (1 - rate);
      }
    }
  }

  // Get the maximum value in the field
  getMaxValue(): number {
    let max = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        max = Math.max(max, Math.abs(this.grid[y][x]));
      }
    }
    return max;
  }
}
