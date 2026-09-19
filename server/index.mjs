import http from "node:http";
import admin from "firebase-admin";
import { createRequestHandler } from "./app.mjs";
import { createFirestorePublicRepository } from "./firestore-public-repository.mjs";
import { observed, validateRuntimeConfig } from "./runtime.mjs";

validateRuntimeConfig();
if (!admin.apps.length) {
    admin.initializeApp({
        credential: process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
            ? admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            })
            : admin.credential.applicationDefault(),
        ...(process.env.FIREBASE_PROJECT_ID ? { projectId: process.env.FIREBASE_PROJECT_ID } : {}),
    });
}

const db = admin.firestore();
const repository = createFirestorePublicRepository(db);

const port = Number(process.env.PORT || 8080);
http.createServer(observed(createRequestHandler(repository), repository)).listen(port, () => {
    console.log(`[wietinfo-ssr] listening on ${port}`);
});
