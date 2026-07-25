const isProd = typeof __DEV__ === "undefined" || !__DEV__;

export function logError(context: string, error: unknown, extra?: Record<string, unknown>) {
  if (isProd) {
    console.warn(`[${context}]`, error);
    return;
  }
  console.error(`[${context}]`, error, extra ?? "");
}

export function logWarn(context: string, message: string, extra?: Record<string, unknown>) {
  if (isProd) return;
  console.warn(`[${context}]`, message, extra ?? "");
}
