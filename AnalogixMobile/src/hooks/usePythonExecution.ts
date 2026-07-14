import { useState, useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import { EXECUTE_PYTHON } from "../graphql/queries/ai";

interface PythonResult {
  stdout: string;
  stderr: string;
  error: string | null;
  durationMs: number;
}

interface UsePythonExecutionReturn {
  loading: boolean;
  result: PythonResult | null;
  error: string | null;
  executeCode: (code: string) => Promise<PythonResult | null>;
  reset: () => void;
}

export function usePythonExecution(): UsePythonExecutionReturn {
  const [executeMutation] = useMutation(EXECUTE_PYTHON);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PythonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeCode = useCallback(async (code: string): Promise<PythonResult | null> => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data } = await executeMutation({
        variables: { input: { code } },
      });

      if (!data?.executePython) {
        throw new Error("Execution failed");
      }

      const execResult: PythonResult = {
        stdout: data.executePython.stdout ?? "",
        stderr: data.executePython.stderr ?? "",
        error: data.executePython.error ?? null,
        durationMs: data.executePython.durationMs ?? 0,
      };

      setResult(execResult);
      return execResult;
    } catch (err: any) {
      const msg = err.message || "Failed to execute Python code";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [executeMutation]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setResult(null);
  }, []);

  return { loading, result, error, executeCode, reset };
}
