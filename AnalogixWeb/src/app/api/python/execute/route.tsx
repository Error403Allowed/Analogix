import { NextResponse } from "next/server";
import { create, all, type MathJsInstance } from "mathjs";

const math: MathJsInstance = create(all);

const safeFunctions: Record<string, (...args: unknown[]) => unknown> = {
  sin: (x) => math.sin(x as number),
  cos: (x) => math.cos(x as number),
  tan: (x) => math.tan(x as number),
  asin: (x) => math.asin(x as number),
  acos: (x) => math.acos(x as number),
  atan: (x) => math.atan(x as number),
  sqrt: (x) => math.sqrt(x as number),
  log: (x) => math.log(x as number),
  log10: (x) => math.log10(x as number),
  exp: (x) => math.exp(x as number),
  abs: (x) => math.abs(x as number),
  floor: (x) => math.floor(x as number),
  ceil: (x) => math.ceil(x as number),
  round: (x) => math.round(x as number),
  pow: (x, y) => math.pow(x as number, y as number),
  min: (...args) => math.min(...(args as number[])),
  max: (...args) => math.max(...(args as number[])),
  sum: (...args) => math.sum(...(args as number[])),
  mean: (...args) => math.mean(...(args as number[])),
  linspace: (start: number, end: number, num: number = 50) => (math.range(start, end, (end - start) / (num - 1))).toArray(),
  arange: (start: number, end: number, step: number = 1) => Array.from({ length: Math.max(0, Math.ceil((end - start) / step)) }, (_, i) => start + i * step),
  len: (arr) => (arr as unknown[]).length,
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    if (code.length > 5000) {
      return NextResponse.json({ error: "Code too long" }, { status: 400 });
    }

    const restrictedCode = code.replace(/[^a-zA-Z0-9_+\-*/().,%\s\[\],:]/g, "");
    if (restrictedCode !== code) {
      return NextResponse.json({ error: "Code contains unsafe characters" }, { status: 400 });
    }

    const scope: Record<string, unknown> = { ...safeFunctions };
    const result = math.evaluate(code, scope);

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
    } else if (result instanceof math.Matrix) {
      const arr = result.toArray();
      formattedResult = { type: "array", value: arr, display: JSON.stringify(arr) };
    } else if (Array.isArray(result)) {
      formattedResult = { type: "array", value: result, display: `[${result.join(", ")}]` };
    } else if (typeof result === "object" && result !== null) {
      formattedResult = { type: "object", value: result, display: JSON.stringify(result) };
    } else {
      formattedResult = { type: "other", value: result, display: String(result) };
    }

    return NextResponse.json({ success: true, result: formattedResult, code });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Execution failed: ${message}`, code: "EXECUTION_ERROR" }, { status: 400 });
  }
}
