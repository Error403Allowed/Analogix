import js from "@eslint/js";
import tseslint from "typescript-eslint";
import tsParser from "@typescript-eslint/parser";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = __dirname;

// Explicit per-workspace overrides — keeps the TypeScript parser unambiguous.
// Update this list if you add new workspaces.
const workspaceConfigs = [
  {
    name: 'AnalogixWeb',
    root: path.join(repoRoot, 'AnalogixWeb'),
    tsconfig: path.join(repoRoot, 'AnalogixWeb', 'tsconfig.json'),
    files: ['AnalogixWeb/**/*.{ts,tsx,js,jsx}'],
  },
  {
    name: 'AnalogixMobile',
    root: path.join(repoRoot, 'AnalogixMobile'),
    tsconfig: path.join(repoRoot, 'AnalogixMobile', 'tsconfig.json'),
    files: ['AnalogixMobile/**/*.{ts,tsx,js,jsx}'],
  },
  {
    name: 'AnalogixGraphQL',
    root: path.join(repoRoot, 'AnalogixGraphQL'),
    tsconfig: path.join(repoRoot, 'AnalogixGraphQL', 'tsconfig.json'),
    files: ['AnalogixGraphQL/**/*.{ts,tsx,js,jsx}'],
  },
  {
    name: 'analogix-shared',
    root: path.join(repoRoot, 'packages', 'analogix-shared'),
    tsconfig: path.join(repoRoot, 'packages', 'analogix-shared', 'tsconfig.json'),
    files: ['packages/analogix-shared/**/*.{ts,tsx,js,jsx}'],
  },
  // Fall back to repo root tsconfig if present
  {
    name: 'repo-root',
    root: repoRoot,
    // Use an explicit eslint-only tsconfig for root-level TS files
    tsconfig: path.join(repoRoot, 'tsconfig.eslint.json'),
    files: ['app.ts', 'app.*.ts', '*.ts'],
  },
];

const exts = ['ts', 'tsx', 'js', 'jsx'];
const projectOverrides = workspaceConfigs.map((w) => {
  // Get relative path from repoRoot to w.root
  const relPath = path.relative(repoRoot, w.root);
  // If it's repo-root itself, relPath is '', so we just use the extension pattern
  const prefix = relPath ? `${relPath}/**/` : '';
  
  return {
    files: exts.map((ext) => `${prefix}*.${ext}`.replaceAll('\\', '/')),
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        tsconfigRootDir: w.root,
        project: [w.tsconfig],
      },
    },
  };
});

// Hand-crafted flat-config array: place workspace overrides first so they
// match before any broader configs that might set a parser.
const baseIgnore = { ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**'] };

// Diagnostic: explicit per-file override to test matching behavior
const diagnosticOverride = {
  files: ['AnalogixWeb/src/lib/retrieval/metadata.ts'],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      tsconfigRootDir: path.join(repoRoot, 'AnalogixWeb'),
      project: [path.join(repoRoot, 'AnalogixWeb', 'tsconfig.json')],
    },
  },
};

export default [
  baseIgnore,
  ...projectOverrides
];
