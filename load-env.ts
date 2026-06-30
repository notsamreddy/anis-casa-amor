import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config } from "dotenv";

const root = process.cwd();

for (const file of [".env.local", ".env"]) {
  const path = resolve(root, file);
  if (existsSync(path)) {
    config({ path });
  }
}
