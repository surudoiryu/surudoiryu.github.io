import { Timestamp } from "firebase/firestore";

export type UserProfile = {
    uid: string;
    email: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    headerImageUrl?: string;
    bio?: string;
    pushEnabled: boolean;
    likedProducts: string[];
    likedGrowers?: string[];
    likedShops?: string[];
    updatedAt?: Timestamp;
    createdAt?: Timestamp;
};

export type ProductReview = {
    id: string;
    userId: string;
    userName: string;
    productShortcode: string;
    productTitle: string;
    rating: number;
    review: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
};
