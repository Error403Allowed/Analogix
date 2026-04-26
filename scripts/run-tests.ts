#!/usr/bin/env tsx
/**
 * Test Runner CLI
 * 
 * Usage:
 *   npx tsx scripts/run-tests.ts                    # Run all tests
 *   npx tsx scripts/run-tests.ts --filter "hook"   # Filter by name/ID
 *   npx tsx scripts/run-tests.ts --tag "ai"         # Filter by tag
 *   npx tsx scripts/run-tests.ts --type "unit"      # Filter by test type
 *   npx tsx scripts/run-tests.ts --verbose          # Show detailed output
 *   npx tsx scripts/run-tests.ts --watch            # Watch mode
 * 
 * Add tests to tests.json - no code required!
 */

import { parseArgs } from "util";
import { loadTestConfig, runAllTests, filterTests } from "../src/lib/test/testRunner";

async function main() {
  const args = parseArgs({
    options: {
      filter: { type: "string", short: "f", description: "Filter tests by name or ID" },
      tag: { type: "string", short: "t", description: "Filter tests by tag" },
      type: { type: "string", short: "T", description: "Filter by test type (unit/ai/integration)" },
      verbose: { type: "boolean", short: "v", description: "Show detailed output" },
      watch: { type: "boolean", short: "w", description: "Watch mode - rerun on file changes" },
      config: { type: "string", short: "c", description: "Path to test config (default: tests.json)" },
      list: { type: "boolean", short: "l", description: "List all available tests" }
    }
  });

  const config = loadTestConfig(args.values.config);

  if (args.values.list) {
    console.log("\n📋 Available Tests:\n");
    console.log(`Total: ${config.testCases.length} tests\n`);
    
    for (const test of config.testCases) {
      const tags = test.tags ? `[${test.tags.join(", ")}]` : "";
      console.log(`  ${test.id} (${test.type}) ${tags}`);
      console.log(`    ${test.name}`);
      if (test.description) {
        console.log(`    ${test.description}`);
      }
      console.log("");
    }
    return;
  }

  const result = await runAllTests(config, {
    tags: args.values.tag ? [args.values.tag] : undefined,
    type: args.values.type || undefined,
    search: args.values.filter || undefined,
    verbose: args.values.verbose || false
  });

  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch(console.error);