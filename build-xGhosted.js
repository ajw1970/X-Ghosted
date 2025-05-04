import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { format } from "prettier";
import { execSync } from "child_process";

const SRC_DIR = path.resolve("src");
const OUTPUT_FILE = path.resolve(SRC_DIR, "xGhosted.user.js");
const TEMP_UTILS_ENTRY = path.resolve(SRC_DIR, ".temp-utils-entry.js");

// Read package.json to get version
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve("package.json"), "utf8")
);
const appVersion = packageJson.version;

// Detect current Git branch
let branchName;
try {
  branchName = execSync("git rev-parse --abbrev-ref HEAD", {
    encoding: "utf8",
  }).trim();
} catch (err) {
  console.warn("Failed to detect Git branch, defaulting to main:", err.message);
  branchName = "main";
}

// Compute suffix: empty for main, -BranchName for others
const suffix = branchName.toLowerCase() === "main" ? "" : `-${branchName}`;

// Read template and replace placeholders
let templateContent = fs.readFileSync(
  path.resolve(SRC_DIR, "xGhosted.template.js"),
  "utf8"
);
templateContent = templateContent
  .replace(/{{VERSION}}/g, appVersion)
  .replace(/{{Suffix}}/g, suffix);

// Dynamically import config.js and the compiled events.js
async function loadConfigAndEvents() {
  try {
    const configModule = await import(path.resolve(SRC_DIR, "config.js"));
    if (!configModule.CONFIG) {
      throw new Error("CONFIG export not found in config.js");
    }
    const eventsModule = await import(path.resolve(SRC_DIR, "events.js")); // Import compiled events.js
    if (!eventsModule.EVENTS || !eventsModule.EVENT_CONTRACTS) {
      throw new Error(
        "EVENTS or EVENT_CONTRACTS export not found in events.js"
      );
    }
    return {
      CONFIG: configModule.CONFIG,
      EVENTS: eventsModule.EVENTS,
      EVENT_CONTRACTS: eventsModule.EVENT_CONTRACTS,
    };
  } catch (err) {
    console.error("Failed to load config or events:", err.message);
    console.error("config.js path:", path.resolve(SRC_DIR, "config.js"));
    console.error("events.js path:", path.resolve(SRC_DIR, "events.js"));
    process.exit(1);
  }
}

// Inject CONFIG and EVENTS into template
(async () => {
  const { CONFIG, EVENTS, EVENT_CONTRACTS } = await loadConfigAndEvents();

  // Serialize objects to JSON with proper formatting
  const configJson = JSON.stringify(CONFIG, null, 2);
  const eventsJson = JSON.stringify(EVENTS, null, 2);
  const eventContractsJson = JSON.stringify(EVENT_CONTRACTS, null, 2);

  templateContent = templateContent.replace(
    "// INJECT: Config",
    `const CONFIG = ${configJson};`
  );
  templateContent = templateContent.replace(
    "// INJECT: Events",
    `const EVENTS = ${eventsJson};\nconst EVENT_CONTRACTS = ${eventContractsJson};`
  );

  // Read CSS files
  const modalCssContent = fs.readFileSync(
    path.resolve(SRC_DIR, "ui/Modal.css"),
    "utf8"
  );
  const panelCssContent = fs.readFileSync(
    path.resolve(SRC_DIR, "ui/Panel.css"),
    "utf8"
  );

  // Define modules to bundle separately
  const modules = [
    {
      entryPoint: path.resolve(SRC_DIR, "xGhosted.js"),
      placeholder: "// INJECT: xGhosted",
      globalName: "XGhosted",
      requiresPreact: false,
    },
    {
      entryPoint: path.resolve(SRC_DIR, "ui/SplashPanel.js"),
      placeholder: "// INJECT: SplashPanel",
      globalName: "SplashPanel",
      requiresPreact: false,
    },
    {
      entryPoint: path.resolve(SRC_DIR, "ui/PanelManager.js"),
      placeholder: "// INJECT: PanelManager",
      globalName: "PanelManager",
      requiresPreact: true,
    },
    {
      entryPoint: path.resolve(SRC_DIR, "utils/ProcessedPostsManager.js"),
      placeholder: "// INJECT: ProcessedPostsManager",
      globalName: "ProcessedPostsManager",
      requiresPreact: false,
    },
    {
      entryPoint: path.resolve(SRC_DIR, "utils/MetricsMonitor.js"),
      placeholder: "// INJECT: MetricsMonitor",
      globalName: "MetricsMonitor",
      requiresPreact: false,
    },
  ];

  try {
    let finalContent = templateContent;
    const sharedImports = new Set();
    const moduleEntryPoints = new Set(
      modules.map((mod) => path.resolve(mod.entryPoint))
    );

    // Dynamically scan src/utils/ and src/dom/ for .js and .ts files, excluding tests and detectTheme.js
    const utilityDirs = ["utils", "dom"].map((dir) =>
      path.resolve(SRC_DIR, dir)
    );
    for (const dir of utilityDirs) {
      const files = fs
        .readdirSync(dir)
        .filter(
          (file) =>
            (file.endsWith(".js") || file.endsWith(".ts")) &&
            !file.includes(".test.") &&
            file !== "detectTheme.js"
        );
      files.forEach((file) => {
        const filePath = path.resolve(dir, file);
        if (!moduleEntryPoints.has(filePath)) {
          sharedImports.add(filePath);
        }
      });
    }

    // Collect additional shared dependencies from module imports
    const importPaths = new Set();
    for (const mod of modules) {
      const result = await esbuild.build({
        entryPoints: [mod.entryPoint],
        bundle: true,
        write: false,
        format: "esm",
        metafile: true,
        loader: { ".js": "js", ".ts": "ts" },
      });
      const imports = result.metafile.inputs;
      for (const file in imports) {
        const filePath = path.resolve(process.cwd(), file);
        if (
          file !== path.relative(process.cwd(), mod.entryPoint) &&
          (file.endsWith(".js") || file.endsWith(".ts")) &&
          !file.includes(".test.") &&
          !moduleEntryPoints.has(filePath) &&
          !file.includes("detectTheme.js")
        ) {
          sharedImports.add(filePath);
          importPaths.add(filePath);
          importPaths.add(
            path.relative(process.cwd(), filePath).replace(/\\/g, "/")
          );
          importPaths.add(path.relative(SRC_DIR, filePath).replace(/\\/g, "/"));
          importPaths.add(
            "./" + path.relative(SRC_DIR, filePath).replace(/\\/g, "/")
          );
        }
      }
    }

    // Log shared imports and import paths
    console.log(
      "Bundling shared utilities:",
      Array.from(sharedImports).map((p) => path.relative(SRC_DIR, p))
    );
    console.log(
      "Resolved import paths for externalization:",
      Array.from(importPaths)
    );

    // Bundle shared utilities
    let utilsCode = "";
    let exportedNames = new Set();
    if (sharedImports.size > 0) {
      // Create temporary entry point for utilities
      const utilsEntryContent = Array.from(sharedImports)
        .map((file) => {
          const relativePath =
            "./" + path.relative(SRC_DIR, file).replace(/\\/g, "/");
          return `export * from '${relativePath}';`;
        })
        .join("\n");
      fs.writeFileSync(TEMP_UTILS_ENTRY, utilsEntryContent, "utf8");

      const utilsResult = await esbuild.build({
        entryPoints: [TEMP_UTILS_ENTRY],
        bundle: true,
        minify: false,
        sourcemap: false,
        target: ["es2020"],
        platform: "browser",
        write: false,
        format: "esm",
        loader: { ".js": "js", ".ts": "ts" },
        external: ["window.preact", "window.preactHooks"],
        metafile: true,
      });

      // Extract exported names from metafile
      exportedNames = new Set(
        utilsResult.metafile.outputs[
          Object.keys(utilsResult.metafile.outputs)[0]
        ].exports
      );
      console.log("Exported utility names:", Array.from(exportedNames));

      utilsCode = utilsResult.outputFiles[0].text.trim();
      utilsCode = utilsCode.replace(/export\s*{[^}]*}\s*;?/g, "");
      utilsCode = utilsCode.replace(/export\s+default\s+[^;]+;?\s*/g, "");
      utilsCode = utilsCode.replace(/export\s+const\s+\w+\s*=/g, "const ");
      utilsCode = utilsCode.replace(
        /export\s+function\s+\w+\s*\([^)]*\)\s*{[^}]*}/g,
        (match) => match.replace(/export\s+function/, "function")
      );
      utilsCode = utilsCode.replace(
        /export\s+class\s+\w+\s*{[^}]*}/g,
        (match) => match.replace(/export\s+class/, "class")
      );

      // Expose exports
      if (exportedNames.size > 0) {
        utilsCode = `window.XGhostedUtils = (function() { ${utilsCode}; return { ${Array.from(exportedNames).join(", ")} }; })();`;
      } else {
        utilsCode = `window.XGhostedUtils = (function() { ${utilsCode}; return {}; })();`;
      }
      finalContent = finalContent.replace("// INJECT: Utils", utilsCode);

      // Clean up temporary file
      fs.unlinkSync(TEMP_UTILS_ENTRY);
    } else {
      finalContent = finalContent.replace("// INJECT: Utils", "");
    }

    // Bundle each module, excluding shared dependencies
    const externalPaths = Array.from(importPaths);
    console.log("External paths for module bundling:", externalPaths);

    for (const mod of modules) {
      // Skip PanelManager if Preact is not required or file is missing
      if (
        mod.requiresPreact &&
        (!fs.existsSync(mod.entryPoint) ||
          !templateContent.includes("@require      https://unpkg.com/preact"))
      ) {
        console.log(
          `Skipping ${path.relative(
            SRC_DIR,
            mod.entryPoint
          )}: Preact not available or module missing`
        );
        finalContent = finalContent.replace(mod.placeholder, "");
        continue;
      }

      console.log(`Bundling ${path.relative(SRC_DIR, mod.entryPoint)}`);
      const result = await esbuild.build({
        entryPoints: [mod.entryPoint],
        bundle: true,
        minify: false,
        sourcemap: false,
        target: ["es2020"],
        platform: "browser",
        write: false,
        format: "esm",
        loader: { ".jsx": "jsx", ".js": "js", ".ts": "ts", ".css": "text" },
        jsxFactory: mod.requiresPreact ? "window.preact.h" : undefined,
        jsxFragment: mod.requiresPreact ? "window.preact.Fragment" : undefined,
        external: mod.requiresPreact
          ? ["window.preact", "window.preactHooks", ...externalPaths]
          : externalPaths,
      });

      let code = result.outputFiles[0].text.trim();
      code = code.replace(/export\s*{[^}]*}\s*;?/g, "");
      code = code.replace(/export\s+default\s+[^;]+;?\s*/g, "");
      code = code.replace(/export\s+class\s+\w+\s*{[^}]*}/g, (match) =>
        match.replace(/export\s+class/, "class")
      );
      code = code.replace(
        /export\s+function\s+\w+\s*\([^)]*\)\s*{[^}]*}/g,
        (match) => match.replace(/export\s+function/, "function")
      );

      // Collect all imports from shared utilities and consolidate into a single const statement
      const importMap = new Set();
      console.log(
        `Processing imports for ${path.relative(SRC_DIR, mod.entryPoint)}`
      );
      code = code.replace(
        /import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]/g,
        (match, imports, source) => {
          const normalizedSource = source
            .replace(/^\.\//, "")
            .replace(/^src\//, "");
          const sourcePath = path.resolve(
            SRC_DIR,
            normalizedSource.replace(/\\/g, "/")
          );
          if (sharedImports.has(sourcePath)) {
            imports.split(",").forEach((imp) => {
              const cleaned = imp.trim().replace(/\s+as\s+\w+/g, "");
              if (cleaned) {
                console.log(
                  `Adding import: ${cleaned} from ${path.relative(
                    SRC_DIR,
                    sourcePath
                  )}`
                );
                importMap.add(cleaned);
              }
            });
            return "";
          }
          console.log(`Keeping non-shared import: ${match}`);
          return match;
        }
      );

      // Prepend a single const statement for all shared imports
      if (importMap.size > 0) {
        const constStatement = `const { ${Array.from(importMap).join(
          ", "
        )} } = window.XGhostedUtils;`;
        console.log(
          `Generated const statement for ${path.relative(
            SRC_DIR,
            mod.entryPoint
          )}: ${constStatement}`
        );
        code = `${constStatement}\n${code}`;
      } else {
        console.log(
          `No shared imports found for ${path.relative(SRC_DIR, mod.entryPoint)}`
        );
      }

      // Fix getRelativeLinkToPost2 and postQuality2 references
      code = code.replace(/getRelativeLinkToPost2/g, "getRelativeLinkToPost");
      code = code.replace(/postQuality2/g, "postQuality");

      // Wrap in window assignment
      code = `window.${mod.globalName} = (function() { ${code}; return ${mod.globalName}; })();`;

      // Inject into template
      finalContent = finalContent.replace(mod.placeholder, code);
    }

    // Inject CSS inside IIFE
    const stylesCode = `
      window.xGhostedStyles = window.xGhostedStyles || {};
      window.xGhostedStyles.modal = \`${modalCssContent.replace(/`/g, "\\`")}\`;
      window.xGhostedStyles.panel = \`${panelCssContent.replace(/`/g, "\\`")}\`;
    `;
    finalContent = finalContent.replace("// INJECT: Styles", stylesCode);

    // Write unformatted output as fallback
    fs.writeFileSync(OUTPUT_FILE, finalContent, "utf8");

    // Attempt to format with Prettier
    try {
      finalContent = await format(finalContent, {
        parser: "babel",
        singleQuote: true,
        tabWidth: 2,
        trailingComma: "es5",
        printWidth: 80,
      });
      fs.writeFileSync(OUTPUT_FILE, finalContent, "utf8");
      console.log(`Build complete! Formatted output written to ${OUTPUT_FILE}`);
    } catch (formatErr) {
      console.warn(
        `Prettier formatting failed: ${formatErr.message}. Using unformatted output.`
      );
      console.log(
        `Build complete! Unformatted output written to ${OUTPUT_FILE}`
      );
    }

    // Post-build check for duplicate utility definitions
    const duplicateUtils = [];
    exportedNames.forEach((name) => {
      const regex = new RegExp(
        `(function\\s+${name}\\s*\\(|var\\s+${name}\\s*=\\s*Object\\.freeze)`,
        "g"
      );
      const matches = finalContent.match(regex);
      if (matches && matches.length > 1) {
        const locations = [];
        const utilsSection = finalContent.match(
          /window\.XGhostedUtils = \(function\(\) {[\s\S]*?}; \)\(\);/
        );
        if (utilsSection && utilsSection[0].includes(name)) {
          locations.push("window.XGhostedUtils");
        }
        modules.forEach((mod) => {
          const modSection = finalContent.match(
            new RegExp(
              `window\\.${mod.globalName} = \\(function\\(\\) {[\\s\\S]*?}; \\)\\(\\);`
            )
          );
          if (modSection && modSection[0].includes(name)) {
            locations.push(`window.${mod.globalName}`);
          }
        });
        duplicateUtils.push([name, matches.length, locations]);
      }
    });
    if (duplicateUtils.length > 0) {
      console.warn("Duplicate utility definitions found:", duplicateUtils);
    } else {
      console.log("No duplicate utility definitions detected.");
    }
  } catch (err) {
    console.error("Build failed:", err);
    process.exit(1);
  }
})();