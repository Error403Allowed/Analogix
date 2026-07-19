const fs = require("node:fs");
const path = require("node:path");

// In a monorepo with npm workspaces, packages are hoisted to the root node_modules
const root = path.resolve(__dirname, "..", "..");

const GRADLE_8_14_3 =
  "distributionUrl=https\\://services.gradle.org/distributions/gradle-8.14.3-bin.zip";

const targets = [
  { pkg: "react-native-math-view", old: "gradle-4.10.1" },
  { pkg: "react-native-svg", old: "gradle-7.5.1" },
];

let fixed = 0;
for (const { pkg, old } of targets) {
  const file = path.join(
    root,
    "node_modules",
    pkg,
    "android",
    "gradle",
    "wrapper",
    "gradle-wrapper.properties"
  );
  try {
    let content = fs.readFileSync(file, "utf8");
    if (content.includes(old)) {
      content = content.replace(/^distributionUrl=.*$/m, GRADLE_8_14_3);
      fs.writeFileSync(file, content, "utf8");
      console.log(`[fix-gradle] ${pkg}: ${old} → 8.14.3`);
      fixed++;
    } else if (content.includes("gradle-8")) {
      console.log(`[fix-gradle] ${pkg}: already >=8.x, skipping`);
    } else {
      console.log(`[fix-gradle] ${pkg}: unexpected version, skipping`);
    }
  } catch {
    console.log(`[fix-gradle] ${pkg}: file not found (might not be installed)`);
  }
}

if (fixed > 0) {
  console.log(`[fix-gradle] Fixed ${fixed} wrapper(s)`);
} else {
  console.log("[fix-gradle] No wrappers needed updating");
}
