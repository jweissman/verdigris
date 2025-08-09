import { Command } from "../rules/command";

export class Temperature extends Command {
  name = "temperature";
  description = "Set the temperature across the battlefield";
  usage = "temperature <degrees> - Set temperature in Celsius";

  execute(_unitId: string | null, ...args: any[]): void {
    const temp = args[0] ? parseFloat(args[0]) : 20;

    if (isNaN(temp)) {
      console.error("Invalid temperature value");
      return;
    }

    // console.log(`🌡️ Setting temperature to ${temp}°C`);
    
    // Set global temperature
    // NOTE: Should actually set the scalar field baseline temperature?
    this.sim.temperature = temp;

    // Set temperature across the field
    for (let x = 0; x < this.sim.fieldWidth; x++) {
      for (let y = 0; y < this.sim.fieldHeight; y++) {
        // Add some variation for realism
        const variation = (Math.random() - 0.5) * 4; // ±2°C variation
        const finalTemp = temp + variation;
        
        this.sim.temperatureField.set(x, y, finalTemp);
      }
    }
  }
}