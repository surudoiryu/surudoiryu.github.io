import http from "node:http";
import admin from "firebase-admin";
import { createCatalogHandler } from "./catalog-app.mjs";
import { createFirestorePublicRepository } from "./firestore-public-repository.mjs";
import { observed, validateRuntimeConfig } from "./runtime.mjs";

validateRuntimeConfig();
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const repository = createFirestorePublicRepository(db);
const port = Number(process.env.PORT || 8080);
http.createServer(observed(createCatalogHandler(repository), repository)).listen(port, () => console.log(JSON.stringify({ event: "startup", service: "wietinfo-catalog-ssr", port })));
