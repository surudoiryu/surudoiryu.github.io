import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { ProductReview } from "../types/user";

export type ReviewReactionValue = "up" | "down";

export function normalizeReviewReactions(value: unknown): Record<string, ReviewReactionValue> {
    if (!value || typeof value !== "object") {
        return {};
    }

    const input = value as Record<string, unknown>;
    const output: Record<string, ReviewReactionValue> = {};
    Object.entries(input).forEach(([userId, reaction]) => {
        if (reaction === "up" || reaction === "down") {
            output[userId] = reaction;
        }
    });
    return output;
}

export function getReviewReactionStats(review: Pick<ProductReview, "reactions" | "upVotes" | "downVotes">, userId?: string | null) {
    const reactions = normalizeReviewReactions(review.reactions);
    const values = Object.values(reactions);

    const up = values.filter((value) => value === "up").length;
    const down = values.filter((value) => value === "down").length;
    const selected = userId ? reactions[userId] : undefined;

    return {
        selected,
        up: Number.isFinite(review.upVotes) ? Number(review.upVotes) : up,
        down: Number.isFinite(review.downVotes) ? Number(review.downVotes) : down,
    };
}

export async function setReviewReaction(reviewId: string, userId: string, reaction: ReviewReactionValue) {
    const reviewRef = doc(db, "reviews", reviewId);

    await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(reviewRef);
        if (!snapshot.exists()) {
            throw new Error("Review niet gevonden.");
        }

        const review = snapshot.data() as ProductReview;
        const reactions = normalizeReviewReactions(review.reactions);
        const current = reactions[userId];

        if (current === reaction) {
            delete reactions[userId];
        } else {
            reactions[userId] = reaction;
        }

        const values = Object.values(reactions);
        const upVotes = values.filter((value) => value === "up").length;
        const downVotes = values.filter((value) => value === "down").length;

        transaction.update(reviewRef, {
            reactions,
            upVotes,
            downVotes,
            updatedAt: serverTimestamp(),
        });
    });
}
