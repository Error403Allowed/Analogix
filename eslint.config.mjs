import js from "@eslint/js";
import tseslint from "typescript-eslint";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = __dirname;

const nonProjectPatterns = [
  "e2e/**",
  "scripts/**",
  "*.config.*",
  "vitest.*",
  "playwright.*",
];

export default [
  { ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/assets/**", "*.min.*", "**/generated/**", "**/__generated__/**"] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    plugins: { "react-hooks": reactHooks },
    rules: { "react-hooks/exhaustive-deps": "warn" },
  },

  // This codebase uses `any` pervasively for pragmatic reasons (navigation,
  // third-party libs, dynamic data). Turn off the rule entirely.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // The codebase has extensive dead imports/variables accumulated over time.
  // Warn but don't block - treat as an aspirational cleanup list.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "no-unused-vars": "off",
    },
  },

  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        tsconfigRootDir: repoRoot,
        project: [path.join(repoRoot, "tsconfig.json")],
      },
    },
  },

  {
    files: nonProjectPatterns,
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: false },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // Node.js config files - set globals so `require`, `module`, `process` etc. are recognized
  {
    files: ["*.config.*", "scripts/**", "e2e/**"],
    languageOptions: {
      globals: {
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        localStorage: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
    },
  },

  // next.config.mjs uses process.env
  {
    files: ["next.config.mjs"],
    languageOptions: {
      globals: { process: "readonly" },
    },
  },
];
