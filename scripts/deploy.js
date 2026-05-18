const { execSync } = require("child_process");
const { existsSync, cpSync, mkdirSync, rmSync, readFileSync, renameSync } = require("fs");
const { resolve, join } = require("path");

const ROOT = resolve(__dirname, "..");
const BP_SRC = join(ROOT, "Tau_Builder_BP");
const RP_SRC = join(ROOT, "Tau_Builder_RP");
const BP_DEST_NAME = "Tau_Builder_BP";
const RP_DEST_NAME = "Tau_Builder_RP";
const ADDON_NAME = "Tau Builder";

function readEnv(key) {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return "";
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq > 0 && trimmed.slice(0, eq).trim() === key) {
        return trimmed.slice(eq + 1).trim();
      }
    }
  }
  return "";
}

function build() {
  // TypeScript: build handled by esbuild via package.json
}

function dev() {
  build();
  const mcDev = readEnv("DEPLOY_PATH");
  if (!mcDev) {
    console.error("DEPLOY_PATH not set in .env");
    process.exit(1);
  }
  const bDest = join(mcDev, "development_behavior_packs", BP_DEST_NAME);
  rmSync(bDest, { recursive: true, force: true });
  mkdirSync(bDest, { recursive: true });
  cpSync(BP_SRC, bDest, { recursive: true, force: true });
  console.log("Deployed BP: " + bDest);
  const rDest = join(mcDev, "development_resource_packs", RP_DEST_NAME);
  rmSync(rDest, { recursive: true, force: true });
  mkdirSync(rDest, { recursive: true });
  cpSync(RP_SRC, rDest, { recursive: true, force: true });
  console.log("Deployed RP: " + rDest);
}

function prod() {
  build();
  const outPath = readEnv("DOWNLOAD_PATH");
  if (!outPath) {
    console.error("DOWNLOAD_PATH not set in .env");
    process.exit(1);
  }
  const tempDir = join(ROOT, "temp_release");
  if (existsSync(tempDir)) rmSync(tempDir, { recursive: true });
  mkdirSync(tempDir, { recursive: true });

  console.log("Zipping behavior pack...");
  const bpMcpack = join(tempDir, ADDON_NAME + "_BP.mcpack");
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${BP_SRC}\\*' -DestinationPath '${bpMcpack}' -Force"`, { stdio: "pipe" });
  const packs = ["'" + bpMcpack + "'"];
  console.log("Zipping resource pack...");
  const rpMcpack = join(tempDir, ADDON_NAME + "_RP.mcpack");
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${RP_SRC}\\*' -DestinationPath '${rpMcpack}' -Force"`, { stdio: "pipe" });
  packs.push("'" + rpMcpack + "'");
  console.log("Creating .mcaddon...");
  const addonZip = join(tempDir, ADDON_NAME + ".zip");
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path ${packs.join(',')} -DestinationPath '${addonZip}' -Force"`, { stdio: "pipe" });

  const outputPath = join(outPath, ADDON_NAME + ".mcaddon");
  renameSync(addonZip, outputPath);
  rmSync(tempDir, { recursive: true });
  console.log("Created " + outputPath);
}

const cmd = process.argv[2];
if (cmd === "dev") dev();
else if (cmd === "prod") prod();
else {
  console.log("Usage: node scripts/deploy.js <dev|prod>");
  console.log("  dev   - Build and deploy to Minecraft development folders");
  console.log("  prod  - Build and create .mcaddon for distribution");
  process.exit(1);
}
