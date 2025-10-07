#!/usr/bin/env bun

/**
 * Test Runner - Run all tests
 * Usage: bun tests/run-all.ts
 */

import { $ } from 'bun';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const tests = [
  { name: 'Single Tab', file: 'test-single-tab.ts', timeout: 15000 },
  { name: 'User-Agent Simple', file: 'test-ua-simple.ts', timeout: 5000 },
  // Add more tests as needed
  // { name: 'reCAPTCHA', file: 'test-recaptcha.ts', timeout: 120000 },
  // { name: 'Stealth', file: 'test-stealth.ts', timeout: 30000 },
];

async function runTest(test: { name: string; file: string; timeout: number }): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log(`\n🧪 Running: ${test.name}...`);

    // Run the test
    await $`bun tests/${test.file}`.quiet();

    const duration = Date.now() - startTime;
    console.log(`✅ ${test.name} PASSED (${duration}ms)`);

    return {
      name: test.name,
      passed: true,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ ${test.name} FAILED (${duration}ms)`);

    return {
      name: test.name,
      passed: false,
      duration,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('🚀 Running All Tests');
  console.log('═══════════════════════════════════════');

  const results: TestResult[] = [];

  // Run tests sequentially
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
  }

  // Print summary
  console.log('\n═══════════════════════════════════════');
  console.log('📊 Test Summary');
  console.log('═══════════════════════════════════════');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms`);

  // Print failed tests details
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  console.log('\n═══════════════════════════════════════\n');

  // Exit with error if any test failed
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
