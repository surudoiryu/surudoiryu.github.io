# Credential rotation and Git-history cleanup plan

Status: do not execute automatically. Credential invalidation in VerdiQ comes first.

The historical .env and an earlier CRA bundle contained a VerdiQ GraphQL bearer token and API key. Treat both as compromised. Never copy their values into chat, logs, commits, build arguments, container layers, or new environment files.

Rotation by a VerdiQ administrator:

1. Issue new server-only credentials for the sync/materialization identity.
2. Store them in the approved server-side secret store, never in REACT_APP variables.
3. Validate a read-only GraphQL request and revoke the old credentials.
4. Re-run bundle and image audits against old credential fingerprints.
5. Confirm browser, SSR runtime, Hosting, and Cloud Run receive no GraphQL secret.

Known commits containing the tracked env file: ab9e087, 5d4cfb7, 6343017, 50878da, 64c4409.

After revocation, create a protected mirror backup, coordinate fresh clones with all collaborators, use git filter-repo with an exact .env path rule, inspect all rewritten refs, run a fingerprint-only scan, and force-push only during a maintenance window. History rewriting is never a substitute for credential revocation.

