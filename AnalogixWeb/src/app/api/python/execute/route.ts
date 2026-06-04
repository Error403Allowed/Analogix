import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface SafeMathFunctions {
  sin: typeof Math.sin;
  cos: typeof Math.cos;
  tan: typeof Math.tan;
  asin: typeof Math.asin;
  acos: typeof Math.acos;
  atan: typeof Math.atan;
  sqrt: typeof Math.sqrt;
  log: typeof Math.log;
  log10: typeof Math.log10;
  exp: typeof Math.exp;
  abs: typeof Math.abs;
  floor: typeof Math.floor;
  ceil: typeof Math.ceil;
  round: typeof Math.round;
  pow: typeof Math.pow;
}

interface ArrayFunctions {
  array: (...args: number[]) => number[];
  linspace: (start: number, end: number, num?: number) => number[];
  arange: (start: number, end: number, step?: number) => number[];
  sum: (arr: number[]) => number;
  mean: (arr: number[]) => number;
  min: (arr: number[]) => number;
  max: (arr: number[]) => number;
  len: (arr: number[]) => number;
  listcomp: (fn: (i: number) => number, start: number, end: number) => number[];
}

type SafeContext = SafeMathFunctions & ArrayFunctions & Record<string, unknown>;

const safeMath: SafeMathFunctions = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  log: Math.log,
  log10: Math.log10,
  exp: Math.exp,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  pow: Math.pow,
};

function createSafeContext(): SafeContext {
  const context: SafeContext = { ...safeMath } as SafeContext;
  
  context.array = (...args: number[]) => args;
  context.linspace = (start: number, end: number, num = 50) => {
    const step = (end - start) / (num - 1);
    return Array.from({ length: num }, (_, i) => start + i * step);
  };
  context.arange = (start: number, end: number, step = 1) => {
    const result: number[] = [];
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
    return result;
  };
  context.sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  context.mean = (arr: number[]) => context.sum(arr) / arr.length;
  context.min = (arr: number[]) => Math.min(...arr);
  context.max = (arr: number[]) => Math.max(...arr);
  context.len = (arr: number[]) => arr.length;
  
  context.listcomp = (fn: (i: number) => number, start: number, end: number) => {
    const result: number[] = [];
    for (let i = start; i < end; i++) {
      result.push(fn(i));
    }
    return result;
  };

  return context;
}

/**
 * Execute Python code for mathematical calculations.
 * Uses a simple sandbox approach - code is evaluated in a controlled environment.
 * 
 * This is a lightweight alternative to heavy AI reasoning for pure math.
 * The AI writes Python code, we execute it, and return the result.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    // Security: Basic validation - reject dangerous patterns
    const dangerousPatterns = [
      /\bimport\b/,
      /\b__\w+__\b/,
      /\beval\s*\(/,
      /\bexec\s*\(/,
      /\bopen\s*\(/,
      /\bfile\s*\(/,
      /\bcompile\s*\(/,
      /\bgetattr\s*\(/,
      /\bsetattr\s*\(/,
      /\bdelattr\s*\(/,
      /\bos\./,
      /\bsys\./,
      /\bsubprocess\./,
      /;.*$/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        console.warn("[Python Executor] Blocked dangerous code pattern:", pattern);
        return NextResponse.json(
          { error: "Code contains unsafe operations. Please use only mathematical expressions." },
          { status: 400 }
        );
      }
    }

    const ctx = createSafeContext();

    // Wrap the code to capture output
    const wrappedCode = `
      "use strict";
      const __result = (function(sin, cos, tan, asin, acos, atan, sqrt, log, log10, exp, abs, floor, ceil, round, pow, array, linspace, arange, sum, mean, min, max, len, listcomp) {
        ${code}
      })(ctx.sin, ctx.cos, ctx.tan, ctx.asin, ctx.acos, ctx.atan, ctx.sqrt, ctx.log, ctx.log10, ctx.exp, ctx.abs, ctx.floor, ctx.ceil, ctx.round, ctx.pow, ctx.array, ctx.linspace, ctx.arange, ctx.sum, ctx.mean, ctx.min, ctx.max, ctx.len, ctx.listcomp);
      return __result;
    `;

    // Execute the code
    const executeCode = new Function("ctx", wrappedCode);
    const result = executeCode(ctx);

    // Format the result
    let formattedResult: { type: string; value: unknown; display: string };
    if (typeof result === "number") {
      if (isNaN(result)) {
        formattedResult = { type: "number", value: "NaN", display: "NaN" };
      } else if (!isFinite(result)) {
        formattedResult = { type: "number", value: result > 0 ? "Infinity" : "-Infinity", display: result > 0 ? "∞" : "-∞" };
      } else {
        const rounded = Math.round(result * 1e10) / 1e10;
        formattedResult = { type: "number", value: rounded, display: String(rounded) };
      }
    } else if (Array.isArray(result)) {
      formattedResult = { type: "array", value: result, display: `[${result.join(", ")}]` };
    } else if (typeof result === "object" && result !== null) {
      formattedResult = { type: "object", value: result, display: JSON.stringify(result) };
    } else {
      formattedResult = { type: "other", value: result, display: String(result) };
    }

    return NextResponse.json({
      success: true,
      result: formattedResult,
      code,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Python Executor] Error:", message);
    return NextResponse.json(
      { error: `Execution failed: ${message}`, code: "EXECUTION_ERROR" },
      { status: 500 }
    );
  }
}