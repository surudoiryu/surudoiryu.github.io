/** Idempotent creation of a keyless, read-only SSR service identity. */
import fs from "node:fs";
import { setTimeout as wait } from "node:timers/promises";
import { GoogleAuth } from "google-auth-library";

for (const file of [".env.worker", ".env"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][\w]*)\s*=\s*(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^[''"]|[''"]$/g, "");
    }
  }
}

const apply = process.argv.includes("--apply");
const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.REACT_APP_FIREBASE_PROJECT_ID ||
  (await auth.getProjectId());
const client = await auth.getClient();
const accountId = "weedinfo-ssr-runtime";
const email = `${accountId}@${projectId}.iam.gserviceaccount.com`;
const member = `serviceAccount:${email}`;

const serviceDisabled = (error) =>
  error?.response?.data?.error?.details?.some((item) => item.reason === "SERVICE_DISABLED");

async function lookup() {
  try {
    await client.request({
      url: `https://iam.googleapis.com/v1/projects/${projectId}/serviceAccounts/${encodeURIComponent(email)}`,
    });
    return true;
  } catch (error) {
    if (error?.response?.status === 404) return false;
    if (serviceDisabled(error)) return "service_disabled";
    throw error;
  }
}

let exists = await lookup();
if (!apply) {
  console.log(JSON.stringify({
    mode: "dry-run",
    projectId,
    accountId,
    email,
    exists: exists === true,
    iamApiEnabled: exists !== "service_disabled",
    create: exists !== true,
    role: "roles/datastore.viewer",
    keyCreation: false,
  }, null, 2));
  process.exit(0);
}

if (exists === "service_disabled") {
  const operation = (await client.request({
    method: "POST",
    url: `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/iam.googleapis.com:enable`,
  })).data;
  for (let attempt = 0; attempt < 30 && !operation.done; attempt += 1) {
    await wait(2000);
    Object.assign(operation, (await client.request({
      url: `https://serviceusage.googleapis.com/v1/${operation.name}`,
    })).data);
  }
  if (!operation.done || operation.error) {
    throw new Error("IAM API activation did not complete safely");
  }
  exists = await lookup();
}

if (!exists) {
  let created = false;
  for (let attempt = 0; attempt < 30 && !created; attempt += 1) {
    try {
      await client.request({
        method: "POST",
        url: `https://iam.googleapis.com/v1/projects/${projectId}/serviceAccounts`,
        data: {
          accountId,
          serviceAccount: { displayName: "WeedInfo SSR runtime (read-only)" },
        },
      });
      created = true;
    } catch (error) {
      if (!serviceDisabled(error) || attempt === 29) throw error;
      await wait(2000);
    }
  }
}

const policyResponse = await client.request({
  method: "POST",
  url: `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:getIamPolicy`,
  data: { options: { requestedPolicyVersion: 3 } },
});
const policy = policyResponse.data;
const bindings = policy.bindings || [];
let binding = bindings.find((item) => item.role === "roles/datastore.viewer");
if (!binding) {
  binding = { role: "roles/datastore.viewer", members: [] };
  bindings.push(binding);
}
if (!binding.members.includes(member)) binding.members.push(member);

await client.request({
  method: "POST",
  url: `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}:setIamPolicy`,
  data: { policy: { ...policy, bindings } },
});

console.log(JSON.stringify({
  mode: "apply",
  projectId,
  email,
  created: !exists,
  role: "roles/datastore.viewer",
  keyCreated: false,
  broadRolesAssigned: [],
  syncIdentityShared: false,
}, null, 2));

