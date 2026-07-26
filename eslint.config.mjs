import js from "@eslint/js";
import tseslint from "typescript-eslint";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = __dirname;

const workspaces = [
  {
    name: "AnalogixWeb",
    root: path.join(repoRoot, "AnalogixWeb"),
    tsconfig: path.join(repoRoot, "AnalogixWeb", "tsconfig.json"),
    files: ["AnalogixWeb/src/**/*.{ts,tsx,js,jsx}"],
  },
  {
    name: "AnalogixMobile",
    root: path.join(repoRoot, "AnalogixMobile"),
    tsconfig: path.join(repoRoot, "AnalogixMobile", "tsconfig.json"),
    files: ["AnalogixMobile/src/**/*.{ts,tsx,js,jsx}"],
  },
  {
    name: "AnalogixGraphQL",
    root: path.join(repoRoot, "AnalogixGraphQL"),
    tsconfig: path.join(repoRoot, "AnalogixGraphQL", "tsconfig.json"),
    files: ["AnalogixGraphQL/src/**/*.{ts,tsx,js,jsx}"],
  },
  {
    name: "analogix-shared",
    root: path.join(repoRoot, "packages", "analogix-shared"),
    tsconfig: path.join(repoRoot, "packages", "analogix-shared", "tsconfig.json"),
    files: ["packages/analogix-shared/src/**/*.{ts,tsx,js,jsx}"],
  },
  {
    name: "repo-root",
    root: repoRoot,
    tsconfig: path.join(repoRoot, "tsconfig.eslint.json"),
    files: ["*.config.{ts,js,mjs}", "scripts/**/*.{ts,js}"],
  },
];

const typeAwareConfigs = workspaces.map((w) => ({
  files: w.files,
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      tsconfigRootDir: w.root,
      project: [w.tsconfig],
    },
  },
}));

const nonProjectPatterns = [
  "AnalogixWeb/e2e/**",
  "AnalogixWeb/scripts/**",
  "AnalogixWeb/*.config.*",
  "AnalogixWeb/vitest.*",
  "AnalogixMobile/*.config.*",
  "AnalogixMobile/scripts/**",
  "AnalogixMobile/e2e/**",
  "AnalogixMobile/playwright.*",
];

export default [
  { ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/assets/**", "**/android/**", "**/ios/**", "*.min.*", "**/generated/**", "**/__generated__/**"] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    plugins: { "react-hooks": reactHooks },
    rules: { "react-hooks/exhaustive-deps": "warn" },
  },

  // This codebase uses `any` pervasively for pragmatic reasons (navigation,
  // GraphQL data, third-party libs). Turn off the rule entirely.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // The codebase has extensive dead imports/variables accumulated over time.
  // Warn but don't block — treat as an aspirational cleanup list.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "no-unused-vars": "off",
    },
  },

  ...typeAwareConfigs,

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

  // Mobile uses require() in runtime code (dynamic imports for icon fonts, etc.)
  {
    files: ["AnalogixMobile/src/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // Node.js config files — set globals so `require`, `module`, `process` etc. are recognized
  {
    files: ["AnalogixWeb/*.config.*", "AnalogixMobile/*.config.*", "AnalogixWeb/scripts/**", "AnalogixMobile/scripts/**", "AnalogixMobile/e2e/**"],
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
    files: ["AnalogixWeb/next.config.mjs"],
    languageOptions: {
      globals: { process: "readonly" },
    },
  },
];
