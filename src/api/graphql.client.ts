import { graphQlApiKey, graphQlAuthToken, graphQlEndpoint } from "../config";

type GraphQlError = {
    message: string;
};

type GraphQlResponse<TData> = {
    data?: TData;
    errors?: GraphQlError[];
};

function buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (graphQlAuthToken) {
        headers.Authorization = `Bearer ${graphQlAuthToken}`;
    }

    if (graphQlApiKey) {
        headers["x-api-key"] = graphQlApiKey;
    }

    return headers;
}

export async function executeGraphQl<TData, TVariables = Record<string, unknown>>(
    query: string,
    variables?: TVariables
): Promise<TData> {
    if (!graphQlEndpoint) {
        throw new Error(
            "GraphQL endpoint ontbreekt. Stel REACT_APP_GRAPHQL_ENDPOINT of REACT_APP_GRAPHQL_HOST in."
        );
    }

    const response = await fetch(graphQlEndpoint, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
        throw new Error(`GraphQL request mislukt (${response.status})`);
    }

    const payload = (await response.json()) as GraphQlResponse<TData>;

    if (payload.errors?.length) {
        throw new Error(payload.errors.map((error) => error.message).join(", "));
    }

    if (!payload.data) {
        throw new Error("GraphQL response bevat geen data.");
    }

    return payload.data;
}
