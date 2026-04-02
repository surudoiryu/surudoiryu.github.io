import React, { createContext, useContext, useEffect, useState } from "react";
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    User,
} from "firebase/auth";
import {
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    where,
    getDoc,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { ProductReview, UserProfile } from "../types/user";

type RegisterInput = {
    name: string;
    username: string;
    avatarUrl?: string;
    headerImageUrl?: string;
    email: string;
    password: string;
};

type ReviewInput = {
    productShortcode: string;
    productTitle: string;
    rating: number;
    review: string;
};

type AuthContextValue = {
    user: User | null;
    profile: UserProfile | null;
    reviews: ProductReview[];
    loading: boolean;
    register: (input: RegisterInput) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    toggleLike: (productShortcode: string) => Promise<void>;
    saveReview: (input: ReviewInput) => Promise<void>;
    setPushEnabled: (enabled: boolean) => Promise<void>;
    updateProfileDetails: (input: {
        displayName?: string;
        username?: string;
        avatarUrl?: string;
        headerImageUrl?: string;
        bio?: string;
    }) => Promise<void>;
    isProductLiked: (productShortcode: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const buildDefaultProfile = (currentUser: User): UserProfile => {
    const displayName = currentUser.displayName ?? currentUser.email?.split("@")[0] ?? "Gebruiker";
    return {
        uid: currentUser.uid,
        email: currentUser.email ?? "",
        displayName,
        username: displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        avatarUrl: currentUser.photoURL ?? "",
        headerImageUrl: "",
        bio: "",
        pushEnabled: false,
        likedProducts: [],
    };
};

const ensureProfileDoc = async (currentUser: User) => {
    const profileRef = doc(db, "users", currentUser.uid);
    const existingProfile = await getDoc(profileRef);
    if (!existingProfile.exists()) {
        const defaultProfile = buildDefaultProfile(currentUser);
        await setDoc(
            profileRef,
            {
                ...defaultProfile,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [reviews, setReviews] = useState<ProductReview[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) {
            setProfile(null);
            setReviews([]);
            return;
        }

        const profileRef = doc(db, "users", user.uid);
        ensureProfileDoc(user).catch((error) => {
            console.warn("Profieldocument kon niet automatisch worden aangemaakt.", error);
        });

        const unsubscribeProfile = onSnapshot(profileRef, (snapshot) => {
            if (!snapshot.exists()) {
                return;
            }

            const data = snapshot.data() as UserProfile;
            setProfile({
                ...buildDefaultProfile(user),
                ...data,
                uid: user.uid,
            });
        });

        const reviewQuery = query(
            collection(db, "reviews"),
            where("userId", "==", user.uid)
        );
        const unsubscribeReviews = onSnapshot(reviewQuery, (snapshot) => {
            setReviews(
                snapshot.docs.map((item) => ({
                    id: item.id,
                    ...(item.data() as Omit<ProductReview, "id">),
                }))
            );
        });

        return () => {
            unsubscribeProfile();
            unsubscribeReviews();
        };
    }, [user]);

    const register = async ({ name, username, avatarUrl, headerImageUrl, email, password }: RegisterInput) => {
        if (!navigator.onLine) {
            throw new Error("Registreren kan alleen wanneer je online bent.");
        }

        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
        try {
            await setDoc(doc(db, "users", credential.user.uid), {
                uid: credential.user.uid,
                email,
                displayName: name,
                username: username.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
                avatarUrl: avatarUrl ?? "",
                headerImageUrl: headerImageUrl ?? "",
                bio: "",
                pushEnabled: false,
                likedProducts: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.warn("Gebruiker is aangemaakt, maar profile write mislukte tijdens registratie.", error);
        }
    };

    const login = async (email: string, password: string) => {
        if (!navigator.onLine) {
            throw new Error("Inloggen kan alleen wanneer je online bent.");
        }
        await signInWithEmailAndPassword(auth, email, password);
    };

    const logout = async () => {
        await signOut(auth);
    };

    const toggleLike = async (productShortcode: string) => {
        if (!user || !profile) {
            throw new Error("Log in om soortjes te liken.");
        }

        if (!navigator.onLine) {
            throw new Error("Likes bijwerken kan alleen wanneer je online bent.");
        }

        const isLiked = profile.likedProducts.includes(productShortcode);
        await setDoc(
            doc(db, "users", user.uid),
            {
                likedProducts: isLiked
                    ? arrayRemove(productShortcode)
                    : arrayUnion(productShortcode),
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    };

    const saveReview = async (input: ReviewInput) => {
        if (!user || !profile) {
            throw new Error("Log in om reviews te plaatsen.");
        }

        if (!navigator.onLine) {
            throw new Error("Reviews plaatsen kan alleen wanneer je online bent.");
        }

        const reviewId = `${user.uid}_${input.productShortcode}`;
        await setDoc(
            doc(db, "reviews", reviewId),
            {
                userId: user.uid,
                userName: profile.displayName,
                productShortcode: input.productShortcode,
                productTitle: input.productTitle,
                rating: input.rating,
                review: input.review,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
            },
            { merge: true }
        );
    };

    const setPushEnabled = async (enabled: boolean) => {
        if (!user) {
            throw new Error("Log in om pushmeldingen te beheren.");
        }

        if (!navigator.onLine) {
            throw new Error("Push-instellingen aanpassen kan alleen wanneer je online bent.");
        }

        if (enabled) {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                throw new Error("Pushmeldingen zijn niet toegestaan in deze browser.");
            }
        }

        await setDoc(
            doc(db, "users", user.uid),
            {
                pushEnabled: enabled,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    };

    const updateProfileDetails = async (input: {
        displayName?: string;
        username?: string;
        avatarUrl?: string;
        headerImageUrl?: string;
        bio?: string;
    }) => {
        if (!user) {
            throw new Error("Log in om profielgegevens bij te werken.");
        }

        if (!navigator.onLine) {
            throw new Error("Profiel aanpassen kan alleen wanneer je online bent.");
        }

        const payload: Record<string, unknown> = {
            updatedAt: serverTimestamp(),
        };

        if (input.displayName !== undefined) payload.displayName = input.displayName;
        if (input.username !== undefined) {
            payload.username = input.username.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        }
        if (input.avatarUrl !== undefined) payload.avatarUrl = input.avatarUrl;
        if (input.headerImageUrl !== undefined) payload.headerImageUrl = input.headerImageUrl;
        if (input.bio !== undefined) payload.bio = input.bio;

        await setDoc(doc(db, "users", user.uid), payload, { merge: true });
    };

    const isProductLiked = (productShortcode: string) =>
        Boolean(profile?.likedProducts?.includes(productShortcode));

    const value = {
        user,
        profile,
        reviews,
        loading,
        register,
        login,
        logout,
        toggleLike,
        saveReview,
        setPushEnabled,
        updateProfileDetails,
        isProductLiked,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth moet binnen AuthProvider gebruikt worden.");
    }
    return context;
}
