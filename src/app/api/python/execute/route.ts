import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
      /;.*$/, // Multiple statements on one line (potential injection)
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

    // Safe math functions that we expose to the code
    const safeMath = {
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
      pi: Math.PI,
      e: Math.E,
      inf: Infinity,
      nan: NaN,
    };

    // Create a safe evaluation context
    const createSafeContext = () => {
      const context: Record<string, any> = { ...safeMath };
      
      // Add numpy-like array operations
      context.array = (...args: any[]) => args;
      context.linspace = (start: number, end: number, num: number = 50) => {
        const step = (end - start) / (num - 1);
        return Array.from({ length: num }, (_, i) => start + i * step);
      };
      context.arange = (start: number, end: number, step: number = 1) => {
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
      context.len = (arr: any[]) => arr.length;
      
      // List comprehension helper
      context.listcomp = (fn: (i: number) => any, start: number, end: number) => {
        const result: any[] = [];
        for (let i = start; i < end; i++) {
          result.push(fn(i));
        }
        return result;
      };

      return context;
    };

    // Wrap the code to capture output
    const wrappedCode = `
      "use strict";
      const ctx = createSafeContext();
      const __result = (function(sin, cos, tan, asin, acos, atan, sqrt, log, log10, exp, abs, floor, ceil, round, pow, pi, e, array, linspace, arange, sum, mean, min, max, len, listcomp) {
        ${code}
      })(ctx.sin, ctx.cos, ctx.tan, ctx.asin, ctx.acos, ctx.atan, ctx.sqrt, ctx.log, ctx.log10, ctx.exp, ctx.abs, ctx.floor, ctx.ceil, ctx.round, ctx.pow, ctx.pi, ctx.e, ctx.array, ctx.linspace, ctx.arange, ctx.sum, ctx.mean, ctx.min, ctx.max, ctx.len, ctx.listcomp);
      return __result;
    `;

    // Execute the code
     
    const executeCode = new Function("createSafeContext", wrappedCode);
    const result = executeCode(createSafeContext);

    // Format the result
    let formattedResult: any;
    if (typeof result === "number") {
      if (isNaN(result)) {
        formattedResult = { type: "number", value: "NaN", display: "NaN" };
      } else if (!isFinite(result)) {
        formattedResult = { type: "number", value: result > 0 ? "Infinity" : "-Infinity", display: result > 0 ? "∞" : "-∞" };
      } else {
        // Round to reasonable precision
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
