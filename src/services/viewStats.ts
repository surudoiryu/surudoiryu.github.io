import { doc, increment, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

type EntityType = "product" | "grower" | "shop";

export async function incrementEntityView(type: EntityType, shortcode: string): Promise<void> {
    const normalized = String(shortcode || "").trim().toLowerCase();
    if (!normalized || !navigator.onLine) {
        return;
    }

    const key = `${type}_${normalized}`;
    const sessionKey = `viewTracked:${key}`;
    if (sessionStorage.getItem(sessionKey) === "1") {
        return;
    }

    await setDoc(
        doc(db, "ViewStats", key),
        {
            type,
            shortcode: normalized,
            views: increment(1),
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );

    sessionStorage.setItem(sessionKey, "1");
}
