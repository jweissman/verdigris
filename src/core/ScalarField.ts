export class ScalarField {
  private data: Float32Array; // Flat array for SIMD vectorization
  private temp: Float32Array; // Temp buffer for diffusion (avoid allocation)
  public readonly width: number;
  public readonly height: number;
  private readonly size: number;

  constructor(width: number, height: number, initialValue: number = 0) {
    this.width = width;
    this.height = height;
    this.size = width * height;
    this.data = new Float32Array(this.size);
    this.temp = new Float32Array(this.size);
    this.data.fill(initialValue);
  }

  get(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    const idx = Math.floor(y) * this.width + Math.floor(x);
    return this.data[idx];
  }

  set(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = Math.floor(y) * this.width + Math.floor(x);
    this.data[idx] = value;
  }

  add(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = Math.floor(y) * this.width + Math.floor(x);
    this.data[idx] += value;
  }

  addGradient(
    centerX: number,
    centerY: number,
    radius: number,
    intensity: number,
  ): void {
    const startX = Math.max(0, Math.floor(centerX - radius));
    const endX = Math.min(this.width - 1, Math.ceil(centerX + radius));
    const startY = Math.max(0, Math.floor(centerY - radius));
    const endY = Math.min(this.height - 1, Math.ceil(centerY + radius));
    const radiusSq = radius * radius;

    for (let y = startY; y <= endY; y++) {
      const dy = y - centerY;
      const dySq = dy * dy;
      const rowOffset = y * this.width;

      for (let x = startX; x <= endX; x++) {
        const dx = x - centerX;
        const distSq = dx * dx + dySq;

        if (distSq <= radiusSq) {
          const falloff = 1 - distSq / radiusSq;
          const contribution = intensity * falloff * falloff;
          this.data[rowOffset + x] += contribution;
        }
      }
    }
  }

  diffuse(rate: number = 0.1): void {
    this.temp.set(this.data);

    const w = this.width;
    for (let y = 1; y < this.height - 1; y++) {
      const row = y * w;

      for (let x = 1; x < w - 1; x++) {
        const idx = row + x;

        const neighbors =
          (this.temp[idx - w] +
            this.temp[idx + w] +
            this.temp[idx - 1] +
            this.temp[idx + 1]) *
          0.25;

        this.data[idx] = this.temp[idx] * (1 - rate) + neighbors * rate;
      }
    }
  }

  decay(rate: number = 0.01): void {
    const factor = 1 - rate;

    for (let i = 0; i < this.size; i++) {
      this.data[i] *= factor;
    }
  }

  decayAndDiffuse(decayRate: number = 0.01, diffuseRate: number = 0.1): void {
    const decayFactor = 1 - decayRate;
    const keepFactor = 1 - diffuseRate;
    const neighborFactor = diffuseRate * 0.25;

    for (let i = 0; i < this.size; i++) {
      this.temp[i] = this.data[i] * decayFactor;
    }

    const w = this.width;
    for (let y = 1; y < this.height - 1; y++) {
      const row = y * w;
      for (let x = 1; x < w - 1; x++) {
        const idx = row + x;
        const neighbors =
          this.temp[idx - w] +
          this.temp[idx + w] +
          this.temp[idx - 1] +
          this.temp[idx + 1];
        this.data[idx] =
          this.temp[idx] * keepFactor + neighbors * neighborFactor;
      }
    }
  }

  getMaxValue(): number {
    let max = 0;
    for (let i = 0; i < this.size; i++) {
      if (this.data[i] > max) max = this.data[i];
    }
    return max;
  }

  getAverageValue(): number {
    let sum = 0;
    for (let i = 0; i < this.size; i++) {
      sum += this.data[i];
    }
    return sum / this.size;
  }
}
