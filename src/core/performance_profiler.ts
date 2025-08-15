export interface TimingData {
  ruleName: string;
  totalTime: number;
  callCount: number;
  avgTime: number;
  maxTime: number;
  minTime: number;
}

export class PerformanceProfiler {
  private timings: Map<string, number[]> = new Map();
  private currentTimer: { name: string; startTime: number } | null = null;
  
  startTimer(name: string): void {
    if (this.currentTimer) {
      console.warn(`Timer ${this.currentTimer.name} still running, finishing it first`);
      this.endTimer();
    }
    this.currentTimer = { name, startTime: performance.now() };
  }
  
  endTimer(): void {
    if (!this.currentTimer) return;
    
    const elapsed = performance.now() - this.currentTimer.startTime;
    const name = this.currentTimer.name;
    
    if (!this.timings.has(name)) {
      this.timings.set(name, []);
    }
    this.timings.get(name)!.push(elapsed);
    
    this.currentTimer = null;
  }
  
  getReport(): TimingData[] {
    const report: TimingData[] = [];
    
    for (const [ruleName, times] of this.timings.entries()) {
      if (times.length === 0) continue;
      
      const totalTime = times.reduce((a, b) => a + b, 0);
      const avgTime = totalTime / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      report.push({
        ruleName,
        totalTime,
        callCount: times.length,
        avgTime,
        maxTime,
        minTime
      });
    }
    
    // Sort by total time descending
    return report.sort((a, b) => b.totalTime - a.totalTime);
  }
  
  printReport(): void {
    const report = this.getReport();
    const totalTime = report.reduce((sum, r) => sum + r.totalTime, 0);
    
    console.warn(`Total time: ${totalTime.toFixed(2)}ms\n`);
    
    for (const timing of report) {
      const percentage = (timing.totalTime / totalTime * 100).toFixed(1);
      console.debug(
        `${timing.ruleName.padEnd(25)} | ` +
        `Total: ${timing.totalTime.toFixed(2)}ms (${percentage}%) | ` +
        `Avg: ${timing.avgTime.toFixed(2)}ms | ` +
        `Max: ${timing.maxTime.toFixed(2)}ms | ` +
        `Calls: ${timing.callCount}`
      );
    }
  }
  
  reset(): void {
    this.timings.clear();
    this.currentTimer = null;
  }
}