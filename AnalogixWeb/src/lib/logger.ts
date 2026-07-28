const isDev = typeof process !== "undefined" && process.env.NODE_ENV === "development";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = isDev ? "debug" : "warn";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
  const prefix = `[${level.toUpperCase()}]`;
  if (args.length > 0) {
    return `${prefix} ${message} ${args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 0) : String(a))).join(" ")}`;
  }
  return `${prefix} ${message}`;
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (shouldLog("debug")) console.debug(formatMessage("debug", message, ...args));
  },
  info: (message: string, ...args: unknown[]) => {
    if (shouldLog("info")) console.info(formatMessage("info", message, ...args));
  },
  warn: (message: string, ...args: unknown[]) => {
    if (shouldLog("warn")) console.warn(formatMessage("warn", message, ...args));
  },
  error: (message: string, ...args: unknown[]) => {
    if (shouldLog("error")) console.error(formatMessage("error", message, ...args));
  },
};
