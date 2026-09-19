# Phase 6.1 execution record — 2026-09-18

## Security boundary

The intended keyless runtime identity is weedinfo-ssr-runtime@bugged-out-73939.iam.gserviceaccount.com. It may receive only project-level roles/datastore.viewer. It receives no Editor, Owner, Datastore User, Secret Manager, GraphQL, sync, or materialization rights. Project-wide Firestore reads are the explicitly accepted residual risk; the sync identity remains separate.

The account and role are not yet created. IAM API activation completed, but the only locally available deploy credential is a broad Firebase Admin service-account key. Activating that key in gcloud was blocked pending explicit approval for that exact management action. No Cloud Run, Artifact Registry, Hosting, alerting, DNS, or production change was made.

## Local gates

- Docker Engine is running (29.3.1).
- Google Cloud CLI 585.0.0 is installed; no active account/project is configured.
- Latest Firebase CLI reports this machine's Node 26 as unsupported (supported: 20/22/24); preview was not executed.
- Container build succeeded as weedinfo-ssr:staging-validation.
- Runtime was reduced from 1,736 packages / 89 findings (4 critical) to 167 packages / 8 moderate findings by installing only firebase-admin.
- Container bundle audit: 70 files; zero GraphQL credential values or identifiers and zero ADC/private-key leakage.
- Host build/ is stale and still contains previously exposed values; it is not an approved deploy artifact.
- SSR/materialization tests: 42/42 passed.
- Legacy CRA Jest is blocked by its existing import.meta.url transform incompatibility.
- Active generation: 9 growers, 458 products, 0 shops, 946 routes; zero duplicate canonicals, stale entities, orphans, availability leaks, or provenance failures.
- Local container read generation public-20260918085618009 and rendered real product/grower HTML, sitemaps, manifest, worker, 404, and QR redirect.
- CSP, nosniff, referrer, frame, and permissions headers are present.
- Local cold profile: 756.93 ms; warm repository render: 0.11 ms. These are not Cloud Run measurements.

## Decision

Cloud Run staging, Hosting preview, browser/PWA upgrade tests, cloud performance, alerts, and rollback remain unexecuted because deploy authentication is blocked. Production cutover is NO-GO. Old VerdiQ credentials also remain a hard production blocker until VerdiQ issues replacements and revokes the old values. SSR staging itself needs no GraphQL credentials.

## Exact staging sequence after authorization

Before each mutation, verify active account and project. Use Node 22 or 24 for Firebase CLI.

    gcloud auth activate-service-account DEPLOY_ACCOUNT --key-file=EXISTING_APPROVED_DEPLOY_KEY
    gcloud config set project bugged-out-73939
    gcloud auth list --filter=status:ACTIVE
    gcloud config get-value project
    gcloud services enable iam.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com monitoring.googleapis.com
    gcloud iam service-accounts create weedinfo-ssr-runtime --display-name="WeedInfo SSR runtime (read-only)"
    gcloud projects add-iam-policy-binding bugged-out-73939 --member="serviceAccount:weedinfo-ssr-runtime@bugged-out-73939.iam.gserviceaccount.com" --role="roles/datastore.viewer"
    gcloud projects get-iam-policy bugged-out-73939 --flatten="bindings[].members" --filter="bindings.members:weedinfo-ssr-runtime@bugged-out-73939.iam.gserviceaccount.com" --format="table(bindings.role)"
    gcloud iam service-accounts keys list --iam-account=weedinfo-ssr-runtime@bugged-out-73939.iam.gserviceaccount.com
    gcloud artifacts repositories create weedinfo --repository-format=docker --location=europe-west3
    gcloud builds submit --config=cloudbuild.staging.yaml --substitutions=_IMAGE=europe-west3-docker.pkg.dev/bugged-out-73939/weedinfo/ssr:STAGING_REVISION .
    gcloud run deploy weedinfo-ssr --image=europe-west3-docker.pkg.dev/bugged-out-73939/weedinfo/ssr:STAGING_REVISION --region=europe-west3 --service-account=weedinfo-ssr-runtime@bugged-out-73939.iam.gserviceaccount.com --no-traffic --tag=staging --set-env-vars=NODE_ENV=production,FIREBASE_PROJECT_ID=bugged-out-73939,PUBLIC_SITE_ORIGIN=https://weedinfo.nl
    firebase hosting:channel:deploy staging --config firebase.staging.json --project bugged-out-73939

The last safe point before a publicly visible production change is after the Hosting preview and rollback test, immediately before any production Hosting release, custom-domain, or DNS action. Production cutover remains separately authorized.
