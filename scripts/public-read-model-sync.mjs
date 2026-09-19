/** Materialize the SSR read model from the existing VerdiQ-backed collections. */
import admin from "firebase-admin";
import { buildGrowerReadModel, buildProductReadModel, encodeRoute, publicId } from "../server/public-model.mjs";

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

const db = admin.firestore();

async function commit(operations) {
    for (let offset = 0; offset < operations.length; offset += 400) {
        const batch = db.batch();
        operations.slice(offset, offset + 400).forEach(({ ref, data }) => batch.set(ref, data));
        await batch.commit();
    }
}

async function run() {
    const [productsSnapshot, growersSnapshot, overridesSnapshot] = await Promise.all([
        db.collection("Producten").get(), db.collection("Brands").get(), db.collection("EditorialEntityOverrides").get(),
    ]);
    const overrides = new Map(overridesSnapshot.docs.map((doc) => [doc.id, doc.data()]));
    const productsByGrower = new Map();
    const operations = [];

    productsSnapshot.docs.forEach((doc) => {
        const product = doc.data();
        const sourceId = doc.id;
        const growerSourceId = String(product.brand?.sourceId || product.tenantId || product.growerSourceId || product.grower || "");
        const override = overrides.get(encodeURIComponent(publicId("product", sourceId))) || {};
        const model = { ...buildProductReadModel(sourceId, product, override), growerSourceId, syncedAt: admin.firestore.FieldValue.serverTimestamp() };
        operations.push({ ref: db.collection("PublicProducts").doc(sourceId), data: model });
        const linked = productsByGrower.get(growerSourceId) || [];
        linked.push(model.publicId);
        productsByGrower.set(growerSourceId, linked);
        operations.push({ ref: db.collection("PublicRoutes").doc(encodeRoute(model.effective.canonicalPath)), data: { kind: "entity", entityType: "product", sourceId } });
        operations.push({ ref: db.collection("PublicRoutes").doc(encodeRoute(model.qrPath)), data: { kind: "redirect", destination: model.effective.canonicalPath, permanent: false, qr: true } });
        [...model.legacyPaths, ...(model.canonicalPath !== model.effective.canonicalPath ? [model.canonicalPath] : [])].forEach((legacyPath) => operations.push({ ref: db.collection("PublicRoutes").doc(encodeRoute(legacyPath)), data: { kind: "redirect", destination: model.effective.canonicalPath, permanent: true } }));
    });

    growersSnapshot.docs.forEach((doc) => {
        const grower = doc.data();
        const sourceId = doc.id;
        const override = overrides.get(encodeURIComponent(publicId("grower", sourceId))) || {};
        const model = { ...buildGrowerReadModel(sourceId, grower, productsByGrower.get(sourceId) || [], override), syncedAt: admin.firestore.FieldValue.serverTimestamp() };
        operations.push({ ref: db.collection("PublicGrowers").doc(sourceId), data: model });
        operations.push({ ref: db.collection("PublicRoutes").doc(encodeRoute(model.effective.canonicalPath)), data: { kind: "entity", entityType: "grower", sourceId } });
    });

    await commit(operations);
    console.log(`[public-read-model] products=${productsSnapshot.size}, growers=${growersSnapshot.size}, writes=${operations.length}`);
}

run().catch((error) => { console.error("[public-read-model] failed", error); process.exitCode = 1; });

