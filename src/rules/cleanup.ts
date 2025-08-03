import { Rule } from "./rule";

export default class Cleanup extends Rule {
  apply = () => {
    this.cullDeadUnits();
  }

  cullDeadUnits() {
    // Cull dead units from battlefield
    const beforeCount = this.sim.units.length;
    this.sim.units = this.sim.units.filter(unit => unit.state !== 'dead');
    const afterCount = this.sim.units.length;

    if (beforeCount !== afterCount) {
      const culled = beforeCount - afterCount;
      // console.log(`🧹 Culled ${culled} dead unit${culled > 1 ? 's' : ''} from battlefield`);
    }

  }
}