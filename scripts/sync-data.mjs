import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SOURCE = join(ROOT, "data");
const TARGET = join(ROOT, "web", "public", "data");

function copyDir(source, target) {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(target, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else copyFileSync(from, to);
  }
}

if (!existsSync(SOURCE)) {
  console.error("✗ 找不到 data 目录");
  process.exit(1);
}

rmSync(TARGET, { recursive: true, force: true });
copyDir(SOURCE, TARGET);

const matchDir = join(TARGET, "matches");
const count = existsSync(matchDir)
  ? readdirSync(matchDir).filter((name) => name.endsWith(".json")).length
  : 0;
console.log(`✓ 已同步 ${count} 个预测文件到 web/public/data`);
