import { useEffect, useState } from "react";
import { resolveMediaUrl } from "../services/mediaSigner";

export function useSignedMediaUrl(source?: string | null): string {
    const [url, setUrl] = useState<string>("");

    useEffect(() => {
        let cancelled = false;

        void resolveMediaUrl(source).then((resolved) => {
            if (!cancelled) {
                setUrl(resolved);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [source]);

    return url;
}
