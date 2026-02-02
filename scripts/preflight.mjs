import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];

// Load .env.local if present (Vite does this at dev/build time, but we check early)
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("\n❌ Missing required environment variables:\n");
  for (const key of missing) {
    console.error(`   - ${key}`);
  }
  console.error(
    "\nCopy .env.example to .env.local and fill in the values.\n"
  );
  process.exit(1);
}

console.log("✅ Preflight check passed — all required env vars are set.");
