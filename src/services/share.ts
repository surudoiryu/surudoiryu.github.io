type ShareInput = {
    title?: string;
    text?: string;
    url: string;
};

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

const nativeShareConsentKey = "nativeShareConsent";

function isNativeShareAllowedByUser(): boolean {
    if (typeof window === "undefined") {
        return false;
    }

    const decision = localStorage.getItem(nativeShareConsentKey);
    if (decision === "granted") {
        return true;
    }
    if (decision === "denied") {
        return false;
    }

    const confirmed = window.confirm(
        "Wil je delen via apps op je toestel inschakelen? Zo niet, dan kopieert WeedInfo alleen de link."
    );
    localStorage.setItem(nativeShareConsentKey, confirmed ? "granted" : "denied");
    return confirmed;
}

export async function shareLink(input: ShareInput): Promise<ShareResult> {
    const nativeShareEnabled = process.env.REACT_APP_ENABLE_NATIVE_SHARE === "true";
    const nativeShareAllowed = nativeShareEnabled && isNativeShareAllowedByUser();

    if (nativeShareAllowed && navigator.share) {
        try {
            await navigator.share({
                title: input.title,
                text: input.text,
                url: input.url,
            });
            return "shared";
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                return "cancelled";
            }
        }
    }

    try {
        await navigator.clipboard.writeText(input.url);
        return "copied";
    } catch {
        window.prompt("Kopieer deze link", input.url);
        return "copied";
    }
}
