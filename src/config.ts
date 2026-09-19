const env = process.env as Record<string, string | undefined>;

const rawEndpoint =
    env.REACT_APP_GRAPHQL_ENDPOINT?.trim() ??
    env.NEXT_PUBLIC_GRAPHQL_ENDPOINT?.trim() ??
    "";

const graphQlHost = (env.REACT_APP_GRAPHQL_HOST ?? "").trim();
const graphQlPath = (env.REACT_APP_GRAPHQL_PATH ?? "/graphql").trim();

export const graphQlEndpoint = rawEndpoint
    ? rawEndpoint
    : graphQlHost
        ? `${graphQlHost.replace(/\/$/, "")}${graphQlPath.startsWith("/") ? graphQlPath : `/${graphQlPath}`}`
        : "";

// Authentication for VerdiQ is server-only. Browser builds must never receive
// bearer tokens or API keys; authenticated operations require an SSR/API proxy.
export const graphQlAuthToken = "";
export const graphQlApiKey = "";
