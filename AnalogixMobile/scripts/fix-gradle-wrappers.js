const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

let fixed = 0;

// ── Fix Gradle wrapper distribution URLs (sub-project wrappers) ──────────

const GRADLE_8_14_3 =
  "distributionUrl=https\\://services.gradle.org/distributions/gradle-8.14.3-bin.zip";

const wrapperTargets = [
  { pkg: "react-native-math-view", old: "gradle-4.10.1" },
  { pkg: "react-native-svg", old: "gradle-7.5.1" },
];

for (const { pkg, old } of wrapperTargets) {
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
    } else if (content.includes("gradle-8") || content.includes("gradle-9")) {
      console.log(`[fix-gradle] ${pkg}: already >=8.x, skipping`);
    } else {
      console.log(`[fix-gradle] ${pkg}: unexpected version, skipping`);
    }
  } catch {
    console.log(`[fix-gradle] ${pkg}: file not found (might not be installed)`);
  }
}

// ── Fix react-native-math-view build.gradle for Gradle 9.x ──────────────
// jcenter() was removed in Gradle 9, so replace it with mavenCentral().
// The pinned AGP classpath (3.3.2) is also incompatible — the root project
// provides a compatible AGP version.

const mathViewBuildGradle = path.join(
  root,
  "node_modules",
  "react-native-math-view",
  "android",
  "build.gradle"
);

try {
  let content = fs.readFileSync(mathViewBuildGradle, "utf8");
  let changed = false;

  const jcenterMatches = content.match(/^[ \t]*jcenter\(\)/gm);
  if (jcenterMatches && jcenterMatches.length > 0) {
    // Remove jcenter() lines (already have google() + mavenCentral())
    content = content.replace(/^[ \t]*jcenter\(\)\s*$/gm, "");
    console.log(`[fix-gradle] react-native-math-view: removed ${jcenterMatches.length} jcenter() call(s)`);
    changed = true;
  }

  // The pinned AGP 3.3.2 is incompatible with Gradle 8+/AGP 8+ — let root provide it
  if (content.includes("com.android.tools.build:gradle:3.3.2")) {
    content = content.replace(
      /classpath\s+'com\.android\.tools\.build:gradle:3\.3\.2'/,
      "// classpath provided by root project"
    );
    console.log(`[fix-gradle] react-native-math-view: removed pinned AGP version`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(mathViewBuildGradle, content, "utf8");
    fixed++;
  } else {
    console.log(`[fix-gradle] react-native-math-view: no changes needed`);
  }
} catch (err) {
  console.log(`[fix-gradle] react-native-math-view: build.gradle not found (${err.message})`);
}

// ── Fix react-native-math-view SVGShadowNode.java for RN 0.86 ────────────
// UIManagerModuleListener was removed in RN 0.86 — the import is unused.

const svgShadowNode = path.join(
  root,
  "node_modules",
  "react-native-math-view",
  "android",
  "src",
  "main",
  "java",
  "io",
  "autodidact",
  "rnmathview",
  "SVGShadowNode.java"
);

try {
  let content = fs.readFileSync(svgShadowNode, "utf8");
  if (content.includes("UIManagerModuleListener")) {
    content = content.replace(
      /import com\.facebook\.react\.uimanager\.UIManagerModuleListener;\r?\n/g,
      ""
    );
    fs.writeFileSync(svgShadowNode, content, "utf8");
    console.log(`[fix-gradle] react-native-math-view: removed unused UIManagerModuleListener import`);
    fixed++;
  } else {
    console.log(`[fix-gradle] react-native-math-view: SVGShadowNode.java already patched`);
  }
} catch (err) {
  console.log(`[fix-gradle] react-native-math-view: SVGShadowNode.java not found (${err.message})`);
}

if (fixed > 0) {
  console.log(`[fix-gradle] Fixed ${fixed} package(s)`);
} else {
  console.log("[fix-gradle] No packages needed updating");
}
