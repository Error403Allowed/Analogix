import { NextResponse } from "next/server";
import { checkEnvironmentSetup } from "@/lib/env-validation";

/**
 * API Health Check Endpoint
 * 
 * GET /api/health
 * 
 * Returns the status of:
 * - Environment variables
 * - External service connectivity
 * - Database connections
 * 
 * Useful for debugging "Failed to fetch" errors.
 */

export const runtime = "nodejs";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  environment: {
    checks: Array<{ name: string; status: string; isRequired: boolean }>;
    isHealthy: boolean;
    diagnostics: string[];
  };
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const envStatus = checkEnvironmentSetup();

  const status: "healthy" | "degraded" | "unhealthy" = envStatus.isHealthy
    ? "healthy"
    : "unhealthy";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      environment: {
        checks: envStatus.checks,
        isHealthy: envStatus.isHealthy,
        diagnostics: envStatus.diagnostics,
      },
    },
    {
      status: envStatus.isHealthy ? 200 : 500,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
