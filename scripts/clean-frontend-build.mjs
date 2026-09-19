import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const project = process.cwd();
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "weedinfo-frontend-"));
const output = path.join(project, "build-clean");
for (const entry of ["src", "public"]) fs.cpSync(path.join(project, entry), path.join(temporary, entry), { recursive: true });
for (const entry of ["package.json", "tsconfig.json"]) if (fs.existsSync(path.join(project, entry))) fs.copyFileSync(path.join(project, entry), path.join(temporary, entry));
fs.symlinkSync(path.join(project, "node_modules"), path.join(temporary, "node_modules"), "junction");

const env = { ...process.env, BUILD_PATH: output };
for (const key of ["REACT_APP_GRAPHQL_AUTH_TOKEN", "REACT_APP_GRAPHQL_API_KEY", "GRAPHQL_AUTH_TOKEN", "GRAPHQL_API_KEY", "FIREBASE_PRIVATE_KEY", "GOOGLE_APPLICATION_CREDENTIALS"]) delete env[key];

const buildScript = path.join(project, "node_modules", "react-scripts", "scripts", "build.js");
let status = 1;
try {
  status = spawnSync(process.execPath, [buildScript], { cwd: temporary, env, stdio: "inherit" }).status ?? 1;
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
process.exit(status);
