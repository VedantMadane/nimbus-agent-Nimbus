import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  const rootDir = process.cwd();
  const srcDir = join(rootDir, "docs", "assets");
  const destDir = join(rootDir, "packages", "docs", "src", "assets");

  await mkdir(destDir, { recursive: true });

  const files = [
    "architecture-light.svg",
    "architecture-dark.svg",
    "nimbus-wordmark-light.svg",
    "nimbus-wordmark-dark.svg"
  ];

  for (const file of files) {
    try {
      await copyFile(join(srcDir, file), join(destDir, file));
      console.log(`Copied ${file}`);
    } catch (err) {
      console.warn(`Warning: Could not copy ${file}: ${(err as Error).message}`);
    }
  }
}

main().catch(console.error);
