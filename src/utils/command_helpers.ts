// Helper functions for abilities to invoke system commands

// export function invokeCommand(sim: any, type: string, args: string[], unitId?: string) {
//   if (!sim.queuedCommands) {
//     sim.queuedCommands = [];
//   }
  
//   sim.queuedCommands.push({
//     type,
//     args,
//     unitId,
//     tick: sim.ticks
//   });
// }

// export function changeWeather(sim: any, weatherType: string, duration?: number, intensity?: number, sourceUnit?: any) {
//   const args = [weatherType];
//   if (duration) args.push(duration.toString());
//   if (intensity) args.push(intensity.toString());
  
//   invokeCommand(sim, 'weather', args, sourceUnit?.id);
// }

// export function deployUnit(sim: any, unitType: string, position?: {x: number, y: number}, team?: string, sourceUnit?: any) {
//   const args = [unitType];
//   if (position) {
//     args.push(position.x.toString());
//     args.push(position.y.toString());
//   }
//   if (team) {
//     args.push(team);
//   }
  
//   invokeCommand(sim, 'deploy', args, sourceUnit?.id);
// }