/**
 * Firestore bootstrap migration
 *
 * Run:
 *   npm run migrate:firestore
 *
 * Creates minimal bootstrap docs so required collections exist:
 * - Gebruikers
 * - reviews
 * - AppConfig
 */

import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";
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

loadEnvFile(".env.worker");
loadEnvFile(".env");

function initFirebaseAdmin() {
    if (admin.apps.length) return admin.app();

    const projectId = (
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT ||
        process.env.REACT_APP_FIREBASE_PROJECT_ID ||
        ""
    ).trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined;

    if (!projectId) {
        throw new Error("FIREBASE_PROJECT_ID ontbreekt voor firestore bootstrap.");
    }

    if (projectId && clientEmail && privateKey) {
        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    }

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error(
            "Firebase Admin credentials ontbreken. Zet GOOGLE_APPLICATION_CREDENTIALS of FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."
        );
    }

    return admin.initializeApp({
        projectId,
        credential: admin.credential.applicationDefault(),
    });
}

async function run() {
    initFirebaseAdmin();
    const firestore = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const writes = [
        {
            ref: firestore.collection("Gebruikers").doc("bootstrap"),
            data: {
                system: true,
                note: "Bootstrap marker for Gebruikers collection",
                createdAt: now,
                updatedAt: now,
            },
        },
        {
            ref: firestore.collection("reviews").doc("bootstrap"),
            data: {
                system: true,
                note: "Bootstrap marker for reviews collection",
                createdAt: now,
                updatedAt: now,
            },
        },
        {
            ref: firestore.collection("AppConfig").doc("firestoreSchema"),
            data: {
                version: 1,
                requiredCollections: ["Gebruikers", "reviews", "Producten", "Brands", "Shops", "SyncStatus", "Effects", "Tastes", "Terpenes", "Categories", "SubCategories", "Stats", "ViewStats"],
                lastBootstrapAt: now,
                tool: "firestore-bootstrap",
            },
        },
    ];

    const batch = firestore.batch();
    writes.forEach((item) => batch.set(item.ref, item.data, { merge: true }));
    await batch.commit();

    console.log("[firestore-bootstrap] done - Gebruikers/reviews/AppConfig gecontroleerd.");
}

run().catch((error) => {
    console.error("[firestore-bootstrap] failed:", error);
    process.exit(1);
});





