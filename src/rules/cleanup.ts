import { Rule } from "./rule";

export default class Cleanup extends Rule {
  apply = () => {
    this.cullDeadUnits();
  }

  cullDeadUnits() {
    this.sim.units = this.sim.units.filter(unit => unit.state !== 'dead');
  }
}