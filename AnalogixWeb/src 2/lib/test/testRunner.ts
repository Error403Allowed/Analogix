/**
 * Dynamic Test Runner
 * 
 * A flexible, data-driven testing system that can be configured via JSON.
 * Supports multiple test types: unit tests, AI response tests, and custom validators.
 * 
 * Usage:
 * - Add test cases to tests.json
 * - Run: npx tsx scripts/run-tests.ts
 * - Filter: npx tsx scripts/run-tests.ts --filter "hook"
 * 
 * Test Configuration Format (tests.json):
 * {
 *   "version": "1.0",
 *   "testTypes": {
 *     "unit": { "description": "Test utility functions" },
 *     "ai": { "description": "Test AI responses" },
 *     "integration": { "description": "Test API endpoints" }
 *   },
 *   "testCases": [
 *     {
 *       "id": "unique-id",
 *       "name": "Human readable name",
 *       "type": "unit",
 *       "module": "@/lib/document-content",
 *       "function": "getDocumentPlainText",
 *       "input": { "content": "..." },
 *       "expected": { "result": "expected output" },
 *       "validate": "equals|contains|throws|custom",
 *       "tags": ["tag1", "tag2"],
 *       "timeout": 5000
 *     }
 *   ]
 * }
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

export interface TestContext {
  [key: string]: unknown;
}

export interface ValidationRule {
  type: "equals" | "contains" | "notContains" | "regex" | "throws" | "greaterThan" | "lessThan" | "custom";
  expected?: unknown;
  match?: string;
  description?: string;
}

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  type: "unit" | "ai" | "integration";
  
  // For unit tests
  module?: string;
  function?: string;
  importPath?: string;
  input?: Record<string, unknown>;
  
  // For AI tests
  userMessage?: string;
  context?: TestContext;
  
  // Expected result
  expected?: Record<string, unknown>;
  validate?: ValidationRule["type"];
  validation?: ValidationRule;
  
  // Meta
  tags?: string[];
  timeout?: number;
  skip?: boolean;
}

export interface TestConfig {
  version: string;
  testTypes?: Record<string, { description: string }>;
  testCases: TestCase[];
}

export interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  duration: number;
  actual?: unknown;
  expected?: unknown;
  error?: string;
}

/**
 * Load test configuration from JSON file
 */
export function loadTestConfig(path?: string): TestConfig {
  const configPath = path || resolve(process.cwd(), "tests.json");
  
  if (!existsSync(configPath)) {
    return { version: "1.0", testCases: [] };
  }
  
  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load test config from ${configPath}:`, error);
    return { version: "1.0", testCases: [] };
  }
}

/**
 * Filter test cases by tags, IDs, or type
 */
export function filterTests(
  tests: TestCase[],
  options: {
    tags?: string[];
    ids?: string[];
    type?: string;
    search?: string;
  }
): TestCase[] {
  let filtered = tests;
  
  if (options.tags?.length) {
    filtered = filtered.filter(t => 
      t.tags?.some(tag => options.tags!.includes(tag))
    );
  }
  
  if (options.ids?.length) {
    filtered = filtered.filter(t => options.ids!.includes(t.id));
  }
  
  if (options.type) {
    filtered = filtered.filter(t => t.type === options.type);
  }
  
  if (options.search) {
    const search = options.search.toLowerCase();
    filtered = filtered.filter(t => 
      t.name.toLowerCase().includes(search) ||
      t.id.toLowerCase().includes(search) ||
      t.description?.toLowerCase().includes(search)
    );
  }
  
  return filtered.filter(t => !t.skip);
}

/**
 * Validate a value against validation rules
 */
export function validateResult(
  actual: unknown,
  validation?: ValidationRule,
  expected?: unknown
): { passed: boolean; error?: string } {
  if (!validation) {
    return { passed: true };
  }
  
  switch (validation.type) {
    case "equals":
      if (actual !== expected && JSON.stringify(actual) !== JSON.stringify(expected)) {
        return { passed: false, error: `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}` };
      }
      return { passed: true };
    
    case "contains":
      if (typeof actual !== "string" || !actual.includes(String(validation.expected))) {
        return { passed: false, error: `Expected string to contain "${validation.expected}"` };
      }
      return { passed: true };
    
    case "notContains":
      if (typeof actual === "string" && actual.includes(String(validation.expected))) {
        return { passed: false, error: `Expected string to NOT contain "${validation.expected}"` };
      }
      return { passed: true };
    
    case "regex":
      if (!validation.match || !new RegExp(validation.match).test(String(actual))) {
        return { passed: false, error: `Value did not match regex: ${validation.match}` };
      }
      return { passed: true };
    
    case "throws":
      if (!(actual instanceof Error)) {
        return { passed: false, error: `Expected function to throw, but it returned: ${actual}` };
      }
      return { passed: true };
    
    case "greaterThan":
      if (typeof actual !== "number" || typeof validation.expected !== "number" || actual <= validation.expected) {
        return { passed: false, error: `Expected ${actual} > ${validation.expected}` };
      }
      return { passed: true };
    
    case "lessThan":
      if (typeof actual !== "number" || typeof validation.expected !== "number" || actual >= validation.expected) {
        return { passed: false, error: `Expected ${actual} < ${validation.expected}` };
      }
      return { passed: true };
    
    case "custom":
      if (typeof validation.expected === "function") {
        try {
          const result = (validation.expected as (val: unknown) => boolean)(actual);
          return result ? { passed: true } : { passed: false, error: "Custom validation failed" };
        } catch (e) {
          return { passed: false, error: `Custom validation error: ${e}` };
        }
      }
      return { passed: true };
    
    default:
      return { passed: true };
  }
}

/**
 * Run all tests and return results
 */
export async function runAllTests(
  config: TestConfig,
  options: {
    tags?: string[];
    ids?: string[];
    type?: string;
    search?: string;
    verbose?: boolean;
  } = {}
): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const filtered = filterTests(config.testCases, options);
  const results: TestResult[] = [];
  
  for (const testCase of filtered) {
    const startTime = Date.now();
    
    try {
      let actual: unknown;
      
      switch (testCase.type) {
        case "unit":
          actual = await runUnitTest(testCase);
          break;
        case "ai":
          actual = await runAITest(testCase);
          break;
        case "integration":
          actual = await runIntegrationTest(testCase);
          break;
        default:
          actual = null;
      }
      
      const validation = testCase.validation || (
        testCase.validate ? { type: testCase.validate, expected: testCase.expected?.result } : undefined
      );
      
      const { passed, error } = validateResult(actual, validation, testCase.expected?.result);
      
      results.push({
        id: testCase.id,
        name: testCase.name,
        passed,
        duration: Date.now() - startTime,
        actual: typeof actual === "string" ? actual.slice(0, 200) : actual,
        expected: testCase.expected?.result,
        error
      });
      
    } catch (error) {
      results.push({
        id: testCase.id,
        name: testCase.name,
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  if (options.verbose) {
    console.log("\n📋 Test Results:\n");
    results.forEach(r => {
      const status = r.passed ? "✅" : "❌";
      console.log(`${status} ${r.name}`);
      if (!r.passed && r.error) {
        console.log(`   Error: ${r.error}`);
      }
    });
  }
  
  console.log(`\n📊 Summary: ${passed}/${results.length} tests passed\n`);
  
  return { total: results.length, passed, failed, results };
}

async function runUnitTest(testCase: TestCase): Promise<unknown> {
  if (!testCase.importPath || !testCase.function) {
    throw new Error("Unit test requires importPath and function");
  }
  
  const module = await import(testCase.importPath);
  const fn = module[testCase.function];
  
  if (typeof fn !== "function") {
    throw new Error(`Function "${testCase.function}" not found in module`);
  }
  
  // Pass the input object directly
  return fn(testCase.input);
}

async function runAITest(testCase: TestCase): Promise<unknown> {
  const { callGroqChat } = await import("@/app/api/groq/_utils");
  
  const response = await callGroqChat(
    {
      messages: [
        { role: "system", content: "You are a helpful AI tutor." },
        { role: "user", content: testCase.userMessage || "" }
      ],
      max_tokens: 1000,
      temperature: 0.5
    },
    "default",
    null
  );
  
  return response;
}

async function runIntegrationTest(testCase: TestCase): Promise<unknown> {
  if (!testCase.function) {
    throw new Error("Integration test requires function name");
  }
  
  const module = await import("@/lib/test/integration/" + testCase.function);
  return module.default(testCase.input);
}

export default {
  loadTestConfig,
  filterTests,
  validateResult,
  runAllTests
};