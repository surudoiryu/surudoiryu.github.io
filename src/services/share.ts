type ShareInput = {
    title?: string;
    text?: string;
    url: string;
};

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export async function shareLink(input: ShareInput): Promise<ShareResult> {
    if (navigator.share) {
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
