import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";

for (const line of fs.readFileSync(".env.worker", "utf8").split(/\r?\n/)) { const match=line.match(/^\s*([A-Za-z_][\w]*)\s*=\s*(.*)$/); if(match&&!process.env[match[1]]) process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,""); }
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db=admin.firestore();
const collections=["Brands","Producten","Shops","PublicGrowers","PublicProducts","PublicShops","PublicPages","PublicRoutes","PublicOverviews"];
function encode(value){
    if(value===null||value===undefined||typeof value!=="object") return value;
    if(value instanceof admin.firestore.Timestamp) return {$type:"timestamp",seconds:value.seconds,nanoseconds:value.nanoseconds};
    if(value instanceof admin.firestore.GeoPoint) return {$type:"geopoint",latitude:value.latitude,longitude:value.longitude};
    if(value instanceof admin.firestore.DocumentReference) return {$type:"reference",path:value.path};
    if(Buffer.isBuffer(value)||value instanceof Uint8Array) return {$type:"bytes",base64:Buffer.from(value).toString("base64")};
    if(Array.isArray(value)) return value.map(encode);
    return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encode(item)]));
}
const backup={format:"wietinfo-firestore-derived-v1",createdAt:new Date().toISOString(),projectId:admin.app().options.projectId||null,collections:{}};
for(const name of collections){const snapshot=await db.collection(name).get();backup.collections[name]=snapshot.docs.map(doc=>({id:doc.id,data:encode(doc.data())}));}
const target=process.argv[2];if(!target)throw new Error("Backup target path is required");fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(backup));
console.log(JSON.stringify({target,counts:Object.fromEntries(Object.entries(backup.collections).map(([name,docs])=>[name,docs.length]))}));
