import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const dir = fileURLToPath(new URL(".", import.meta.url));
const scripts = readdirSync(dir)
  .filter((name) => name.endsWith(".mjs"))
  .sort();

test("every script parses (node --check) before any workflow can execute it", () => {
  assert.ok(scripts.length >= 6, "expected the bunker script suite to be present");
  for (const name of scripts) {
    const result = spawnSync(process.execPath, ["--check", join(dir, name)], { encoding: "utf8" });
    assert.equal(
      result.status,
      0,
      `${name} failed syntax check:\n${result.stderr || result.stdout}`,
    );
  }
});
