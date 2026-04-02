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

export const graphQlAuthToken = (env.REACT_APP_GRAPHQL_AUTH_TOKEN ?? "").trim();
export const graphQlApiKey = (env.REACT_APP_GRAPHQL_API_KEY ?? "").trim();
