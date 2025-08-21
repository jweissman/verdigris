/**
 * 2v2 Match System
 *
 * A focused combat testing system where each unit has exactly one ability
 * and we can run systematic tests of different combinations.
 */

import { Simulator } from "../core/simulator";
import { Unit } from "../types/Unit";
import Encyclopaedia from "../dmg/encyclopaedia";

export interface MatchResult {
  winner: "team1" | "team2" | "draw";
  survivors: string[];
  duration: number;
  team1Units: string[];
  team2Units: string[];
}

export interface MatchSetup {
  team1: [string, string]; // Unit types
  team2: [string, string];
  mapSize?: number;
  maxSteps?: number;
}

export class Match2v2 {
  private sim: Simulator;
  private setup: MatchSetup;

  constructor(setup: MatchSetup) {
    this.setup = setup;
    this.sim = new Simulator(setup.mapSize || 15, setup.mapSize || 15);
  }

  /**
   * Run a single 2v2 match
   */
  run(): MatchResult {
    const team1Units = this.deployTeam(this.setup.team1, "friendly", 1);

    const team2Units = this.deployTeam(
      this.setup.team2,
      "hostile",
      this.sim.width - 2,
    );

    // Debug initial setup for soldier matchup (disabled for CLI)
    const isDebugMatch = false; // Disabled for production

    const maxSteps = this.setup.maxSteps || 500;
    let step = 0;
    let lastDebugStep = -1;

    while (step < maxSteps) {
      this.sim.step();
      step++;

      const team1Alive = this.getAliveUnits("friendly");
      const team2Alive = this.getAliveUnits("hostile");
      

      if (team1Alive.length === 0 && team2Alive.length === 0) {
        const result = {
          winner: "draw" as const,
          survivors: [],
          duration: step,
          team1Units: team1Units,
          team2Units: team2Units,
        };
        this.cleanup();
        return result;
      }

      if (team1Alive.length === 0) {
        const result = {
          winner: "team2" as const,
          survivors: team2Alive.map((u) => u.id),
          duration: step,
          team1Units: team1Units,
          team2Units: team2Units,
        };
        this.cleanup();
        return result;
      }

      if (team2Alive.length === 0) {
        const result = {
          winner: "team1" as const,
          survivors: team1Alive.map((u) => u.id),
          duration: step,
          team1Units: team1Units,
          team2Units: team2Units,
        };
        this.cleanup();
        return result;
      }
    }

    const team1Alive = this.getAliveUnits("friendly");
    const team2Alive = this.getAliveUnits("hostile");

    let result: MatchResult;
    if (team1Alive.length > team2Alive.length) {
      result = {
        winner: "team1",
        survivors: team1Alive.map((u) => u.id),
        duration: step,
        team1Units: team1Units,
        team2Units: team2Units,
      };
    } else if (team2Alive.length > team1Alive.length) {
      result = {
        winner: "team2",
        survivors: team2Alive.map((u) => u.id),
        duration: step,
        team1Units: team1Units,
        team2Units: team2Units,
      };
    } else {
      result = {
        winner: "draw",
        survivors: [...team1Alive, ...team2Alive].map((u) => u.id),
        duration: step,
        team1Units: team1Units,
        team2Units: team2Units,
      };
    }
    
    this.cleanup();
    return result;
  }

  private deployTeam(
    unitTypes: [string, string],
    team: "friendly" | "hostile",
    x: number,
  ): string[] {
    const unitIds: string[] = [];

    for (let i = 0; i < unitTypes.length; i++) {
      const unitType = unitTypes[i];
      const unitData = Encyclopaedia.unit(unitType);

      const unit = {
        ...unitData,
        id: `${team}_${unitType}_${i}`,
        pos: {
          x: x,
          y: 5 + i * 3,
        },
        // CRITICAL: team must be set AFTER spread to override default
        team: team,
        // Ensure we have required combat fields
        hp: unitData.hp || 10,
        maxHp: unitData.maxHp || unitData.hp || 10,
        state: unitData.state || "idle",
        intendedMove: unitData.intendedMove || { x: 0, y: 0 }
      };

      this.sim.addUnit(unit);
      unitIds.push(unit.id);
    }

    return unitIds;
  }

  private getAliveUnits(team: "friendly" | "hostile"): Unit[] {
    return this.sim.units.filter((u) => u.team === team && u.hp > 0);
  }
  
  private cleanup(): void {
    // Reset the simulator to free up unit array slots
    this.sim.reset();
  }
}

/**
 * Run a tournament of all possible 2v2 combinations
 */
export class Tournament2v2 {
  private unitTypes: string[];
  private results: Map<string, MatchResult[]> = new Map();
  private sharedSim: Simulator;

  constructor(unitTypes: string[]) {
    this.unitTypes = unitTypes;
    // Create a shared simulator for all matches
    this.sharedSim = new Simulator(15, 15);
  }

  /**
   * Run all possible matchups
   */
  runAll(
    runsPerMatchup: number = 1,
    onProgress?: (current: number, total: number, stats?: { ticks?: number, simTimeMs?: number }) => void,
  ): Map<string, MatchResult[]> {
    const teams: [string, string][] = [];
    for (let i = 0; i < this.unitTypes.length; i++) {
      for (let j = i; j < this.unitTypes.length; j++) {
        teams.push([this.unitTypes[i], this.unitTypes[j]]);
      }
    }

    const totalMatchups = teams.length * teams.length * runsPerMatchup;
    let currentMatch = 0;
    let lastRankingReport = 0;

    for (const team1 of teams) {
      for (const team2 of teams) {
        const matchKey = `${team1.join("+")} vs ${team2.join("+")}`;
        const results: MatchResult[] = [];

        for (let run = 0; run < runsPerMatchup; run++) {
          // Run match using shared simulator
          const result = this.runMatch(team1, team2);
          results.push(result);
          currentMatch++;

          // Report progress more frequently for large tournaments
          if (onProgress) {
            // Report every match for first 100, then less frequently
            const reportFrequency = currentMatch < 100 ? 1 : 
                                   currentMatch < 1000 ? 10 :
                                   currentMatch < 10000 ? 100 : 1000;
            if (currentMatch % reportFrequency === 0) {
              // Pass performance stats if available
              onProgress(currentMatch, totalMatchups, result.stats);
            }
          }
        }

        this.results.set(matchKey, results);
      }
      
      // Print intermediate rankings every 10% or 5000 matches
      const percentComplete = (currentMatch / totalMatchups) * 100;
      if (percentComplete - lastRankingReport >= 10 || currentMatch - lastRankingReport * totalMatchups / 100 >= 5000) {
        console.log(`\n=== Intermediate Rankings at ${percentComplete.toFixed(1)}% ===`);
        this.printRankings();
        lastRankingReport = Math.floor(percentComplete / 10) * 10;
      }
    }

    return this.results;
  }

  /**
   * Run a single match using the shared simulator
   */
  private runMatch(team1: [string, string], team2: [string, string]): MatchResult & { stats?: { ticks: number, simTimeMs: number } } {
    // Use Match2v2 class instead of duplicating logic
    const match = new Match2v2({
      team1: team1,
      team2: team2,
      mapSize: this.sharedSim.width,
      maxSteps: 500
    });
    
    const startTime = performance.now ? performance.now() : Date.now();
    const result = match.run();
    const endTime = performance.now ? performance.now() : Date.now();
    
    // Add performance stats
    const resultWithStats = {
      ...result,
      stats: {
        ticks: result.duration,
        simTimeMs: endTime - startTime
      }
    };
    
    return resultWithStats;
  }
  
  /**
   * Get win rate statistics
   */
  getStats(): Map<
    string,
    { wins: number; losses: number; draws: number; avgDuration: number }
  > {
    const stats = new Map<
      string,
      { wins: number; losses: number; draws: number; avgDuration: number }
    >();

    for (const [matchup, results] of this.results.entries()) {
      const team1Name = matchup.split(" vs ")[0];

      if (!stats.has(team1Name)) {
        stats.set(team1Name, { wins: 0, losses: 0, draws: 0, avgDuration: 0 });
      }

      const teamStats = stats.get(team1Name)!;
      let totalDuration = 0;

      for (const result of results) {
        totalDuration += result.duration;

        if (result.winner === "team1") {
          teamStats.wins++;
        } else if (result.winner === "team2") {
          teamStats.losses++;
        } else {
          teamStats.draws++;
        }
      }

      teamStats.avgDuration = totalDuration / results.length;
    }

    return stats;
  }

  /**
   * Print current rankings (can be partial)
   */
  printRankings(): void {
    const stats = this.getStats();
    
    if (stats.size === 0) return;

    const sortedTeams = Array.from(stats.entries()).sort((a, b) => {
      const aTotal = a[1].wins + a[1].losses + a[1].draws;
      const bTotal = b[1].wins + b[1].losses + b[1].draws;
      const aWinRate = aTotal > 0 ? a[1].wins / aTotal : 0;
      const bWinRate = bTotal > 0 ? b[1].wins / bTotal : 0;
      return bWinRate - aWinRate;
    });

    // Only show top 10 for intermediate reports
    const teamsToShow = Math.min(10, sortedTeams.length);
    for (let i = 0; i < teamsToShow; i++) {
      const [team, stat] = sortedTeams[i];
      const total = stat.wins + stat.losses + stat.draws;
      if (total > 0) {
        const winRate = ((stat.wins / total) * 100).toFixed(1);
        console.log(
          `  #${i+1} ${team}: ${winRate}% (${stat.wins}W/${stat.losses}L/${stat.draws}D)`,
        );
      }
    }
  }

  /**
   * Print a summary report
   */
  printReport(): void {
    const stats = this.getStats();

    console.log("=== 2v2 Tournament Results ===");
    console.log("");

    const sortedTeams = Array.from(stats.entries()).sort((a, b) => {
      const aWinRate = a[1].wins / (a[1].wins + a[1].losses + a[1].draws);
      const bWinRate = b[1].wins / (b[1].wins + b[1].losses + b[1].draws);
      return bWinRate - aWinRate;
    });

    console.log("Team Rankings:");
    for (const [team, stat] of sortedTeams) {
      const total = stat.wins + stat.losses + stat.draws;
      const winRate = ((stat.wins / total) * 100).toFixed(1);
      console.log(
        `  ${team}: ${winRate}% win rate (${stat.wins}W/${stat.losses}L/${stat.draws}D) avg ${stat.avgDuration.toFixed(0)} steps`,
      );
    }
  }
}

export function test2v2() {
  const testUnits = ["soldier", "archer", "mage", "warrior"];

  const tournament = new Tournament2v2(testUnits);
  const results = tournament.runAll(3); // Run each matchup 3 times

  tournament.printReport();

  return results;
}
