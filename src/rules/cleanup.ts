import { Rule } from "./rule";

export default class Cleanup extends Rule {
  apply = () => {
    // Find dead units and queue remove commands for them
    const deadUnits = this.sim.units.filter(unit => unit.state === 'dead');
    
    for (const unit of deadUnits) {
      this.sim.queuedCommands.push({
        type: 'remove',
        params: { unitId: unit.id }
      });
    }
  }
}