/**
 * CLI for running AI tests
 * Usage: npm run test:ai              # Run all AI tests
 *        npm run test:ai -- --filter slope # Run tests matching "slope"
 */

import { parseArgs } from "util";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TestContext {
  grade?: string;
  hobbies?: string[];
  analogyIntensity?: number;
  [key: string]: unknown;
}

interface RawTestCase {
  id: string;
  name: string;
  type?: string;
  userMessage: string;
  context: TestContext;
  expected: {
    notContains?: string[];
    contains?: string[];
    minLength?: number;
    maxLength?: number;
  };
}

interface TestCase {
  id: string;
  name: string;
  userMessage: string;
  context: TestContext;
  expected: {
    notContains?: string[];
    contains?: string[];
    minLength?: number;
    maxLength?: number;
  };
}

async function loadTests(): Promise<TestCase[]> {
  try {
    const content = await readFile(join(process.cwd(), "tests.json"), "utf-8");
    const config = JSON.parse(content);
    return (config.testCases || [])
      .filter((t: RawTestCase) => t.type === "ai");
  } catch {
    return [];
  }
}

async function runTest(test: TestCase): Promise<{ passed: boolean; response: string; error?: string }> {
  try {
    const response = await fetch("/api/groq/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: test.userMessage }],
        userContext: test.context,
      }),
    });
    
    const data = await response.json();
    const content = data.content || "";
    
    if (test.expected.notContains) {
      for (const bad of test.expected.notContains) {
        if (content.toLowerCase().includes(bad.toLowerCase())) {
          return { passed: false, response: content, error: `Should NOT contain: ${bad}` };
        }
      }
    }
    
    return { passed: true, response: content };
  } catch (error) {
    return { passed: false, response: "", error: String(error) };
  }
}

async function main() {
  const args = parseArgs({
    options: {
      filter: { type: "string", short: "f", description: "Filter tests by name" },
    }
  });
  
  const tests = await loadTests();
  let filtered = tests;
  
  if (args.values.filter) {
    filtered = tests.filter(t => 
      t.name.toLowerCase().includes(args.values.filter!.toLowerCase())
    );
  }
  
  console.log(`\n📋 Running ${filtered.length} AI tests...\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const test of filtered) {
    const result = await runTest(test);
    if (result.passed) {
      console.log(`✅ ${test.name}`);
      passed++;
    } else {
      console.log(`❌ ${test.name}: ${result.error}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed}/${passed + failed} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);