/**
 * API-based Test Runner
 * 
 * Tests via HTTP calls to the actual chat API.
 * Use this for integration testing with proper context handling.
 */

export interface TestContext {
  grade?: string;
  state?: string;
  hobbies?: string[];
  analogyIntensity?: number;
  analogyAnchor?: string;
  subjects?: string[];
  detail_level?: number;
  use_analogies?: boolean;
  analogy_frequency?: number;
  [key: string]: unknown;
}

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  userMessage: string;
  context: TestContext;
  expected: {
    contains?: string[];
    notContains?: string[];
    minLength?: number;
    maxLength?: number;
    startsWith?: string[];
  };
  tags?: string[];
  category?: "hook" | "tone" | "analogy" | "explanation" | "brevity";
}

/**
 * Run a single test via the chat API
 */
export async function runApiTest(
  testCase: TestCase,
  apiUrl?: string
): Promise<{
  passed: boolean;
  response: string;
  errors: string[];
}> {
  const errors: string[] = [];
  const url = apiUrl || process.env.TEST_API_URL || "http://localhost:3000/api/groq/chat";
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "user", content: testCase.userMessage }
        ],
        userContext: testCase.context,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json() as { content?: string };
    const content = data.content || "";
    
    // Check expectations
    if (testCase.expected.notContains) {
      for (const notExpected of testCase.expected.notContains) {
        if (content.toLowerCase().includes(notExpected.toLowerCase())) {
          errors.push(`Should NOT contain: "${notExpected}"`);
        }
      }
    }
    
    if (testCase.expected.startsWith) {
      const firstSentence = content.split(/[.!?]/)[0].toLowerCase();
      let startsWithMatch = false;
      for (const expected of testCase.expected.startsWith) {
        if (firstSentence.includes(expected.toLowerCase())) {
          startsWithMatch = true;
          break;
        }
      }
      if (!startsWithMatch) {
        errors.push(`Should start with one of: ${testCase.expected.startsWith.join(", ")}`);
      }
    }
    
    if (testCase.expected.minLength !== undefined) {
      if (content.length < testCase.expected.minLength) {
        errors.push(`Response too short: ${content.length} < ${testCase.expected.minLength}`);
      }
    }
    
    if (testCase.expected.maxLength !== undefined) {
      if (content.length > testCase.expected.maxLength) {
        errors.push(`Response too long: ${content.length} > ${testCase.expected.maxLength}`);
      }
    }
    
    return {
      passed: errors.length === 0,
      response: content,
      errors,
    };
    
  } catch (error) {
    return {
      passed: false,
      response: "",
      errors: [`Error: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Run test suite via API
 */
export async function runApiTestSuite(
  testCases: Array<TestCase>,
  options?: {
    filter?: string;
    category?: string;
    tag?: string;
    apiUrl?: string;
  }
): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: Array<{
    testCase: TestCase;
    result: Awaited<ReturnType<typeof runApiTest>>;
  }>;
}> {
  let filtered = testCases;
  
  if (options?.category) {
    filtered = filtered.filter(t => t.category === options.category);
  }
  
  if (options?.tag) {
    filtered = filtered.filter(t => t.tags?.includes(options.tag!));
  }
  
  if (options?.filter) {
    const filter = options.filter.toLowerCase();
    filtered = filtered.filter(t => 
      t.name.toLowerCase().includes(filter) ||
      t.id.toLowerCase().includes(filter)
    );
  }
  
  const results = await Promise.all(
    filtered.map(async testCase => ({
      testCase,
      result: await runApiTest(testCase, options?.apiUrl)
    }))
  );
  
  const passed = results.filter(r => r.result.passed).length;
  const failed = results.filter(r => !r.result.passed).length;
  
  return {
    total: filtered.length,
    passed,
    failed,
    results,
  };
}

/**
 * Default API test cases
 */
export const DEFAULT_API_TESTS: Array<TestCase> = [
  {
    id: "api-hook-f1",
    name: "API: Hook uses F1 analogy",
    category: "hook",
    tags: ["api", "f1"],
    userMessage: "What is slope?",
    context: {
      grade: "10",
      hobbies: ["F1 racing"],
      analogyIntensity: 4,
    },
    expected: {
      notContains: ["A slope is", "The definition"],
      minLength: 30,
    }
  },
  {
    id: "api-brevity",
    name: "API: Brief response",
    category: "brevity",
    tags: ["api", "brevity"],
    userMessage: "What is x?",
    context: {
      grade: "7",
      detail_level: 30,
    },
    expected: {
      maxLength: 800,
    }
  },
  {
    id: "api-no-analogies",
    name: "API: No analogies when disabled",
    category: "analogy",
    tags: ["api", "settings"],
    userMessage: "What is a function?",
    context: {
      grade: "10",
      use_analogies: false,
      analogyIntensity: 5,
    },
    expected: {
      notContains: ["think of", "like", "analogy"],
    }
  }
];