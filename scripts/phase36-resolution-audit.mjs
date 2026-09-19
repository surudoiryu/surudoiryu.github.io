import admin from "firebase-admin";
import fs from "node:fs";
import { publicationReadiness } from "../server/publication-readiness.mjs";

function loadEnv(file) { if (!fs.existsSync(file)) return; for (const line of fs.readFileSync(file,"utf8").split(/\r?\n/)) { const m=line.match(/^\s*([A-Za-z_][\w]*)\s*=\s*(.*)$/); if(m&&!process.env[m[1]]) process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,""); } }
loadEnv(".env.worker"); loadEnv(".env");
if (!admin.apps.length) admin.initializeApp({credential:admin.credential.applicationDefault()}); const db=admin.firestore();
const norm=v=>String(v||"").trim().toLocaleLowerCase("nl"), slug=v=>norm(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const endpoint=process.env.PHASE36_GRAPHQL_ENDPOINT||process.env.REACT_APP_GRAPHQL_ENDPOINT||process.env.GRAPHQL_ENDPOINT; if(!endpoint) throw new Error("No explicitly configured GraphQL endpoint");
const headers={"content-type":"application/json",...(process.env.GRAPHQL_AUTH_TOKEN?{authorization:`Bearer ${process.env.GRAPHQL_AUTH_TOKEN}`}:{}) ,...(process.env.GRAPHQL_API_KEY?{"x-api-key":process.env.GRAPHQL_API_KEY}:{})};
async function gql(query){const r=await fetch(endpoint,{method:"POST",headers,body:JSON.stringify({query})});const p=await r.json();if(!r.ok||p.errors)throw new Error(JSON.stringify(p.errors||r.status));return p.data;}
async function fm(name){const s=await db.collection(name).get();return new Map(s.docs.map(d=>[d.id,d.data()]));}
const query=`query Phase36 { tenants { id businessName type shortDescription companyAddress updatedAt } products { id name tenantId categoryId subCategoryId description mainImageId cannabisInfo { thc cbd terpenes flavorProfile positiveEffects negativeEffects sativaIndicaRatio } variations { id name weight packSize mgPerUnit skus { id code ean } } } }`;
const [live,brands,products,shops,availability]=await Promise.all([gql(query),fm("Brands"),fm("Producten"),fm("Shops"),fm("PublicAvailability")]);
const tenants=live.tenants||[], liveProducts=live.products||[], tenantById=new Map(tenants.map(t=>[String(t.id),t])), productById=new Map(liveProducts.map(p=>[String(p.id),p]));
const liveGrowers=tenants.filter(t=>["teler","grower","kweker"].includes(norm(t.type))), liveShops=tenants.filter(t=>["winkel","shop","store","retailer"].includes(norm(t.type)));
const liveProductsByTenant=new Map(); for(const p of liveProducts)liveProductsByTenant.set(String(p.tenantId),[...(liveProductsByTenant.get(String(p.tenantId))||[]),p]);
const growerRows=[...brands].map(([id,b])=>({id,name:b.title||"",slug:b.shortcode||slug(b.title),source:b.source||"firestore",existsInVerdiq:tenantById.has(id),tenant:tenantById.get(id)||null,products:[...products].filter(([,p])=>String(p.brand?.sourceId||p.tenantId||p.growerSourceId||"")===id||norm(p.brand?.title)===norm(b.title)).map(([pid,p])=>({id:pid,name:p.title})),liveProductCount:(liveProductsByTenant.get(id)||[]).length}));
const groups=new Map();for(const r of growerRows)groups.set(r.slug,[...(groups.get(r.slug)||[]),r]);const conflicts=[...groups].filter(([,v])=>v.length>1).map(([route,records])=>({route:`/telers/${route}`,classification:records.every(r=>r.existsInVerdiq)?"multiple_current_entities_same_route":records.some(r=>r.existsInVerdiq)?"stale_derived_plus_current":"stale_derived_records",records:records.map(r=>({immutableId:r.id,name:r.name,slug:r.slug,source:r.source,linkedProducts:r.products,relevantTenant:r.tenant?{id:r.tenant.id,name:r.tenant.businessName,type:r.tenant.type}:null,existsInCurrentVerdiq:r.existsInVerdiq,likelyHistoricalOrDerived:!r.existsInVerdiq}))}));
const orphanIds=["My74wU5qp1nsdhtKA6D2","QnuSbyfmE1XcPF5QOyF5","f8QSoYDVXARc71bqJjYl"];const orphanProducts=orphanIds.map(id=>{const liveP=productById.get(id),cache=products.get(id),tenant=liveP?tenantById.get(String(liveP.tenantId)):null;return{id,existsInVerdiq:Boolean(liveP),name:liveP?.name||cache?.title||null,verdiqTenantId:liveP?.tenantId||null,tenantExists:Boolean(tenant),tenant:tenant?{id:tenant.id,name:tenant.businessName,type:tenant.type}:null,firestoreGrowerFields:cache?{growerSourceId:cache.growerSourceId||null,brandSourceId:cache.brand?.sourceId||null,brandName:cache.brand?.title||null}:null,diagnosis:liveP&&!tenant?"source_product_references_missing_tenant":liveP&&tenant?"sync_mapping_loss":!liveP?"stale_derived_product":"unknown"};});
const fsBySlug = new Map([...shops].map(([documentId, shop]) => [shop.shortcode || documentId, { ...shop, documentId }]));
const fsByName = new Map();
for (const [documentId, shop] of shops) fsByName.set(norm(shop.name), [...(fsByName.get(norm(shop.name)) || []), { ...shop, documentId }]);
const shopComparison = liveShops.map((tenant) => {
    const expectedSlug = slug(tenant.businessName), bySlug = fsBySlug.get(expectedSlug), byName = fsByName.get(norm(tenant.businessName)) || [];
    return { tenantId: tenant.id, name: tenant.businessName, diagnosticSlug: expectedSlug, matchType: bySlug ? "mutable_slug_candidate" : byName.length === 1 ? "mutable_name_candidate" : "new_or_ambiguous", candidateFirestoreIds: bySlug ? [bySlug.documentId] : byName.map((item) => item.documentId) };
});
const candidateFsIds = new Set(shopComparison.flatMap((item) => item.candidateFirestoreIds));
const staleShopCandidates = [...shops].filter(([documentId]) => !candidateFsIds.has(documentId)).map(([documentId, shop]) => ({ firestoreId: documentId, name: shop.name, slug: shop.shortcode }));
const shopSlugConflicts = [...new Map(shopComparison.map((item) => [item.diagnosticSlug, shopComparison.filter((candidate) => candidate.diagnosticSlug === item.diagnosticSlug)]))].filter(([, values]) => values.length > 1).map(([value, values]) => ({ slug: value, tenantIds: values.map((item) => item.tenantId), names: values.map((item) => item.name) }));
function facts(p){return {description:Boolean(String(p.description||p.shortDescription||"").trim()),grower:Boolean(p.brand?.title||p.tenantId||p.growerSourceId),category:Boolean(p.categoryId||p.categoryName),subcategory:Boolean(p.subCategoryId||p.subCategoryName),type:Boolean(p.type),cannabinoids:[p.thcMin,p.thcMax,p.cbdMin,p.cbdMax].some(v=>v!==null&&v!==undefined&&Number(v)!==0),effects:Boolean(p.dominantPositiveEffect?.name||p.positiveEffects?.length||p.dominantNegativeEffect?.name),terpenes:Boolean(p.dominantTerpene?.name||p.terpenes?.length),tastes:Boolean(p.tastes?.length),variants:Boolean(p.variants?.length),image:Boolean(p.thumbnailUrl||p.images?.main)};}
const thin={grower:[],product:[],shop:[],page:[]};for(const r of growerRows)if(String(brands.get(r.id)?.description||brands.get(r.id)?.shortDescription||"").length<80)thin.grower.push({id:r.id,name:r.name,facts:{products:r.products.length,approved:Boolean(brands.get(r.id)?.isApproved),image:Boolean(brands.get(r.id)?.thumbnailUrl||brands.get(r.id)?.images?.logo)}});for(const[id,p]of products)if(String(p.description||p.shortDescription||"").length<80){const f=facts(p),score=Object.values(f).filter(Boolean).length;thin.product.push({id,name:p.title,length:String(p.description||p.shortDescription||"").length,informationScore:score,facts:f});}for(const[id,s]of shops)if(String(s.description||"").length<80)thin.shop.push({id,name:s.name,facts:{province:Boolean(s.province),coordinates:Boolean(s.lat&&s.lng),openingHours:Boolean(s.openingHours||s.openFrom),facilities:[s.pickup,s.drive,s.payByCard,s.easyParking,s.allowForeigns].filter(Boolean).length,immutableIdentity:Boolean(s.verdiqTenantId)}});
const routeConflictIds = new Set(conflicts.flatMap((conflict) => conflict.records.map((record) => `grower:${record.immutableId}`)));
const readiness = [];
for (const row of growerRows) {
    const info = (row.products.length > 0 ? 2 : 0)
        + (String(brands.get(row.id)?.description || brands.get(row.id)?.shortDescription || "").length >= 80 ? 2 : 0)
        + (brands.get(row.id)?.images?.logo ? 1 : 0);
    readiness.push({ type: "grower", id: row.id, ...publicationReadiness({ sourcePublished: row.existsInVerdiq, canonicalConflict: routeConflictIds.has(`grower:${row.id}`), informationScore: info }) });
}
for (const [productId, product] of products) {
    const productFacts = facts(product);
    const score = Object.values(productFacts).filter(Boolean).length;
    const liveProduct = productById.get(productId);
    const hasGrower = Boolean(liveProduct && tenantById.has(String(liveProduct.tenantId)));
    readiness.push({ type: "product", id: productId, ...publicationReadiness({ sourcePublished: Boolean(liveProduct), hasGrower, informationScore: score, minimumInformationScore: 4 }) });
}
const metadataRows = [
    ...growerRows.map((row) => ({ type: "grower", id: row.id, title: `${row.name} | Wietinfo`, description: String(brands.get(row.id)?.description || brands.get(row.id)?.shortDescription || "").slice(0, 160), stale: !row.existsInVerdiq, canonicalConflict: routeConflictIds.has(`grower:${row.id}`) })),
    ...[...products].map(([id, product]) => ({ type: "product", id, title: `${product.title} van ${product.brand?.title || "Onbekende teler"} | Wietinfo`, description: String(product.description || product.shortDescription || "").slice(0, 160), stale: !productById.has(id), canonicalConflict: false })),
];
const dup = (key) => {
    const grouped = new Map();
    for (const row of metadataRows) { const value = norm(row[key]); if (value) grouped.set(value, [...(grouped.get(value) || []), row]); }
    return [...grouped].filter(([, rows]) => rows.length > 1).map(([value, rows]) => ({
        value,
        causes: [...new Set(rows.map((row) => row.canonicalConflict ? "canonical_conflict" : row.stale ? "stale_derived_record" : key === "title" ? "identical_names_or_generic_template" : "generic_or_identical_source_description"))],
        entities: rows.map((row) => ({ type: row.type, id: row.id })),
    }));
};
const availabilityRows=[...availability.values()];const report={generatedAt:new Date().toISOString(),writesPerformed:0,endpointSource:process.env.PHASE36_GRAPHQL_ENDPOINT?"PHASE36_GRAPHQL_ENDPOINT":"existing_project_configuration",canonicalConflicts:conflicts,orphanProducts,shopIdentityComparison:{graphqlShops:liveShops.length,firestoreShops:shops.size,exactImmutableMatches:[...shops].filter(([,s])=>s.verdiqTenantId&&tenantById.has(String(s.verdiqTenantId))).length,mutableDiagnosticCandidates:shopComparison.filter(x=>x.matchType!=="new_or_ambiguous"),newOrAmbiguousTenants:shopComparison.filter(x=>x.matchType==="new_or_ambiguous"),staleFirestoreCandidates:staleShopCandidates,tenantSlugConflicts:shopSlugConflicts,note:"Mutable matches are diagnostic only and are not identity proof."},thinContent:{counts:{grower:thin.grower.length,product:thin.product.length,shop:thin.shop.length,page:thin.page.length,total:Object.values(thin).reduce((n,a)=>n+a.length,0)},distribution:thin,scorecard:{product:"description, grower, category, subcategory, type, cannabinoids, effects, terpenes, tastes, variants and image; at least 4 independent factual dimensions",grower:"current VerdiQ presence, products, substantive description and image",shop:"immutable identity plus location/opening/facility facts; legal status remains separate"}},duplicateMetadata:{titles:dup("title"),descriptions:dup("description")},publicationReadiness:{indexFollow:readiness.filter(r=>r.indexStatus==="index,follow"),noindexFollow:readiness.filter(r=>r.indexStatus==="noindex,follow")},sourceCounts:{tenants:tenants.length,growers:liveGrowers.length,shops:liveShops.length,products:liveProducts.length,firestoreGrowers:brands.size,firestoreProducts:products.size,firestoreShops:shops.size,availability:availabilityRows.length}};
console.log(JSON.stringify(report,null,2));
