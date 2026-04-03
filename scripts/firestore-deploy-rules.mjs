import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function parseEnvFile(content) {
    const result = {};
    const lines = content.split(/\r?\n/g);

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;

        const separatorIndex = line.indexOf("=");
        if (separatorIndex < 1) continue;

        const key = line.slice(0, separatorIndex).trim();
        let value = line.slice(separatorIndex + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        result[key] = value;
    }

    return result;
}

function loadEnvFile(relativePath) {
    const fullPath = path.resolve(repoRoot, relativePath);
    if (!fs.existsSync(fullPath)) return;

    const content = fs.readFileSync(fullPath, "utf8");
    const envValues = parseEnvFile(content);

    Object.entries(envValues).forEach(([key, value]) => {
        if (!process.env[key]) {
            process.env[key] = value;
        }
    });
}

function resolveProjectId() {
    return (
        process.env.FIREBASE_PROJECT_ID ||
        process.env.REACT_APP_FIREBASE_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT ||
        ""
    ).trim();
}

function resolveServiceAccountPath() {
    const configuredPath = (process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim();
    if (configuredPath && fs.existsSync(configuredPath)) {
        return configuredPath;
    }

    const defaultPath = path.resolve(repoRoot, "scripts", "service-account.json");
    if (fs.existsSync(defaultPath)) {
        return defaultPath;
    }

    return "";
}

function ensureFirebaseJson() {
    const firebaseConfigPath = path.resolve(repoRoot, "firebase.json");
    if (fs.existsSync(firebaseConfigPath)) {
        return;
    }

    fs.writeFileSync(
        firebaseConfigPath,
        JSON.stringify(
            {
                firestore: {
                    rules: "firestore.rules",
                },
            },
            null,
            2
        )
    );

    console.log("[firestore-rules] firebase.json ontbrak en is aangemaakt.");
}

function run() {
    loadEnvFile(".env.worker");
    loadEnvFile(".env");

    const projectId = resolveProjectId();
    if (!projectId) {
        throw new Error("Geen project id gevonden. Zet FIREBASE_PROJECT_ID of REACT_APP_FIREBASE_PROJECT_ID.");
    }

    ensureFirebaseJson();
    const serviceAccountPath = resolveServiceAccountPath();

    const args = ["firebase-tools", "deploy", "--only", "firestore:rules", "--project", projectId];
    const result = spawnSync("npx", args, {
        cwd: repoRoot,
        stdio: "inherit",
        shell: process.platform === "win32",
        env: {
            ...process.env,
            ...(serviceAccountPath ? { GOOGLE_APPLICATION_CREDENTIALS: serviceAccountPath } : {}),
        },
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(
            `Rules deploy mislukt met exit code ${result.status ?? "unknown"}. ` +
            "Controleer IAM-rechten (o.a. serviceusage.services.use en Firestore Rules deploy rechten) voor de actieve user/service-account."
        );
    }

    if (serviceAccountPath) {
        console.log(`[firestore-rules] service account gebruikt: ${serviceAccountPath}`);
    }
    console.log(`[firestore-rules] deployed voor project ${projectId}`);
}

try {
    run();
} catch (error) {
    console.error("[firestore-rules] failed:", error);
    process.exit(1);
}
