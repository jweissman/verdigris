#!/usr/bin/env bun

import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

interface TestGroupResult {
  directory: string;
  duration: number;
  testCount: number;
  success: boolean;
  error?: string;
}

function getSubdirectories(dir: string): string[] {
  try {
    return readdirSync(dir)
      .map(name => join(dir, name))
      .filter(path => statSync(path).isDirectory());
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
    return [];
  }
}

async function runTestGroup(testDir: string): Promise<TestGroupResult> {
  const startTime = Date.now();
  const relativeDir = testDir.replace(process.cwd() + '/', '');
  
  console.log(`🧪 Running tests in ${relativeDir}...`);
  
  return new Promise((resolve) => {
    const child = spawn('bun', ['test', testDir], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      // Extract test count from output
      const testCountMatch = stdout.match(/(\d+) pass/);
      const testCount = testCountMatch ? parseInt(testCountMatch[1], 10) : 0;
      
      const result: TestGroupResult = {
        directory: relativeDir,
        duration,
        testCount,
        success: code === 0,
      };
      
      if (code !== 0) {
        result.error = stderr || 'Test failed with non-zero exit code';
        console.log(`❌ ${relativeDir} failed (${duration}ms)`);
      } else {
        console.log(`✅ ${relativeDir} completed (${duration}ms, ${testCount} tests)`);
      }
      
      resolve(result);
    });
    
    child.on('error', (error) => {
      const duration = Date.now() - startTime;
      console.log(`💥 ${relativeDir} errored (${duration}ms)`);
      resolve({
        directory: relativeDir,
        duration,
        testCount: 0,
        success: false,
        error: error.message
      });
    });
  });
}

async function analyzeTestPerformance() {
  const testsDir = join(process.cwd(), 'tests');
  const subdirectories = getSubdirectories(testsDir);
  
  if (subdirectories.length === 0) {
    console.log('No test subdirectories found');
    return;
  }
  
  console.log(`Found ${subdirectories.length} test subdirectories\n`);
  
  const results: TestGroupResult[] = [];
  
  // Run tests sequentially to avoid resource conflicts
  for (const subdir of subdirectories) {
    const result = await runTestGroup(subdir);
    results.push(result);
  }
  
  // Sort by duration (slowest first)
  results.sort((a, b) => b.duration - a.duration);
  
  console.log('\n📊 Test Performance Analysis');
  console.log('=' .repeat(60));
  
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const totalTests = results.reduce((sum, r) => sum + r.testCount, 0);
  const successfulResults = results.filter(r => r.success);
  
  console.log(`Total execution time: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Total tests: ${totalTests}`);
  console.log(`Successful groups: ${successfulResults.length}/${results.length}\n`);
  
  console.log('🐌 Slowest Test Groups:');
  console.log('-'.repeat(60));
  
  results.forEach((result, index) => {
    const percentage = ((result.duration / totalDuration) * 100).toFixed(1);
    const status = result.success ? '✅' : '❌';
    const testsInfo = result.testCount > 0 ? ` (${result.testCount} tests)` : '';
    
    console.log(
      `${(index + 1).toString().padStart(2)}. ${status} ${result.directory.padEnd(25)} ` +
      `${(result.duration / 1000).toFixed(2)}s ${percentage.padStart(5)}%${testsInfo}`
    );
    
    if (!result.success && result.error) {
      console.log(`    Error: ${result.error.split('\n')[0]}`);
    }
  });
  
  console.log('\n🚀 Performance Recommendations:');
  console.log('-'.repeat(60));
  
  const slowestGroups = results.slice(0, 3);
  slowestGroups.forEach((group, index) => {
    if (group.success) {
      const avgTimePerTest = group.testCount > 0 ? (group.duration / group.testCount).toFixed(0) : 'N/A';
      console.log(
        `${index + 1}. Focus on optimizing ${group.directory} ` +
        `(${avgTimePerTest}ms avg per test)`
      );
    }
  });
  
  const failedGroups = results.filter(r => !r.success);
  if (failedGroups.length > 0) {
    console.log(`\n⚠️  ${failedGroups.length} test group(s) failed and should be investigated first.`);
  }
}

if (import.meta.main) {
  analyzeTestPerformance().catch(console.error);
}
