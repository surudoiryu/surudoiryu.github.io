import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("phase 3.5 audit runner passes Node syntax validation", () => {
    const result = spawnSync(process.execPath, ["--check", "scripts/phase35-audit-dry-run.mjs"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
});

test("phase 3.6 resolution runner passes Node syntax validation", () => {
    const result = spawnSync(process.execPath, ["--check", "scripts/phase36-resolution-audit.mjs"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
});
