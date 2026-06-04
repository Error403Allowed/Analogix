// Learn more https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..", "..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the entire monorepo so file changes in `packages/analogix-shared`
//    or sibling workspaces are picked up by Metro without restarts.
config.watchFolders = [monorepoRoot, projectRoot];

// 2. Force Metro to resolve modules from BOTH the project root and the
//    monorepo root. The symlink at node_modules/@analogix/mobile would
//    otherwise lead Metro to resolve `../../App` against the workspace
//    root and fail.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. Don't follow symlinks — keep paths rooted at AnalogixMobile so
//    node_modules/expo/AppEntry.js's `import "../../App"` resolves
//    to AnalogixMobile/App.tsx (one level up from node_modules/expo),
//    not the monorepo root.
config.resolver.unstable_enableSymlinks = false;
config.resolver.unstable_enablePackageExports = true;

// 4. Make sure Babel resolves `@/*` aliases to src/* (mobile project only).
config.resolver.extraNodeModules = {
  "@": path.resolve(projectRoot, "src"),
};

// 5. Tell Metro to start from our own index.js so the `main` field
//    (currently "App.tsx") isn't ambiguous across platforms.
const entryFile = path.resolve(projectRoot, "index.js");
if (require("fs").existsSync(entryFile)) {
  config.resolver.platforms = ["ios", "android", "web", "native"];
}

module.exports = config;
