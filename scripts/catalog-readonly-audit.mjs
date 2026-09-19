/** Read-only catalog audit; never writes Firestore documents. */
import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(".env.worker");
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/); if (!match || process.env[match[1]]) return;
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    });
}
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const names = ["Brands", "Producten", "Shops", "PublicGrowers", "PublicProducts", "PublicShops", "PublicPages", "PublicAvailability"];
const snapshots = new Map(await Promise.all(names.map(async (name) => [name, await db.collection(name).get()])));
const countPublished = (name) => snapshots.get(name).docs.filter((doc) => doc.data().publicationStatus === "published").length;
const missingProductSlug = snapshots.get("Producten").docs.filter((doc) => !doc.data().shortcode).length;
const missingGrowerSlug = snapshots.get("Brands").docs.filter((doc) => !doc.data().shortcode).length;
const shopsWithoutImmutableSourceId = snapshots.get("Shops").docs.filter((doc) => { const row = doc.data(); return !(row.verdiqTenantId || row.tenantId || row.sourceId); }).length;
const unsafeAvailability = snapshots.get("PublicAvailability").docs.filter((doc) => !["public", "hidden", "pending_review"].includes(doc.data().status)).length;
console.log(JSON.stringify({
    source: { growers: snapshots.get("Brands").size, products: snapshots.get("Producten").size, shops: snapshots.get("Shops").size },
    renderable: { growers: countPublished("PublicGrowers"), products: countPublished("PublicProducts"), shops: countPublished("PublicShops"), pages: countPublished("PublicPages") },
    issues: { missingProductSlug, missingGrowerSlug, shopsWithoutImmutableSourceId, invalidAvailabilityStatus: unsafeAvailability },
}, null, 2));

