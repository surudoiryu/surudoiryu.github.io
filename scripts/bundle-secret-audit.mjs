import fs from "node:fs";
import path from "node:path";

const parse = (file) => Object.fromEntries(
  fs.existsSync(file)
    ? fs.readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Za-z_][\w]*)\s*=\s*(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].replace(/^[''"]|[''"]$/g, "")])
    : [],
);
const env = { ...parse(".env"), ...parse(".env.worker") };
const buildDirectory = process.env.BUNDLE_BUILD_DIR || "build";
const files = [];

function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, item.name);
    if (item.isDirectory()) walk(target);
    else if (/\.(js|html|json|css|map)$/.test(item.name)) files.push(target);
  }
}

walk(buildDirectory);
const texts = files.map((file) => fs.readFileSync(file, "utf8"));
const keys = [
  "REACT_APP_GRAPHQL_AUTH_TOKEN",
  "REACT_APP_GRAPHQL_API_KEY",
  "GRAPHQL_AUTH_TOKEN",
  "GRAPHQL_API_KEY",
  "FIREBASE_PRIVATE_KEY",
  "GOOGLE_APPLICATION_CREDENTIALS",
];
const results = keys.map((key) => {
  const value = String(env[key] || "");
  return {
    key,
    configured: Boolean(value),
    valueFoundInBundle: Boolean(
      value && value.length >= 8 && texts.some((text) => text.includes(value)),
    ),
    identifierFoundInBundle: texts.some((text) => text.includes(key)),
  };
});
const serverOnlyLeak = results.some(
  (row) => row.valueFoundInBundle && !["REACT_APP_FIREBASE_API_KEY"].includes(row.key),
);

console.log(JSON.stringify({
  buildDirectory,
  buildFilesScanned: files.length,
  results,
  serverOnlyLeak,
}, null, 2));
if (results.some((row) => row.valueFoundInBundle)) process.exitCode = 2;

