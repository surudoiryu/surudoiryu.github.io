import React, { useCallback, useMemo, useState } from "react";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { useAuth } from "./context/AuthContext";
import { ProductReview, UserProfile } from "./types/user";
import {
    brandCollectionRef,
    gebruikersCollectionRef,
    productCollectionRef,
    reviewsCollectionRef,
    shopCollectionRef,
} from "./firebaseCollections";
import { Link as RouterLink, useParams } from "react-router-dom";
import { ProductType } from "./types/product";
import ProductCard from "./components/ProductCard";
import { GrowerType } from "./types/grower";
import GrowerCard from "./components/GrowerCard";
import { ShopType } from "./types/shop";
import ShopCard from "./components/ShopCard";

type ProfileViewProps = {
    activeProfile: UserProfile;
    reviews: ProductReview[];
    isOwnProfile: boolean;
    onPushToggle: (checked: boolean) => void;
    onLogout: () => void;
    pushEnabled: boolean;
};

type UserScore = {
    uid: string;
    likes: number;
    reviews: number;
    score: number;
};

type AvgStats = {
    products: number;
    growers: number;
    shops: number;
    reviews: number;
};

function toProductReviewStats(reviews: ProductReview[]) {
    const grouped: Record<string, { sum: number; count: number }> = {};
    reviews.forEach((item) => {
        if (!grouped[item.productShortcode]) {
            grouped[item.productShortcode] = { sum: 0, count: 0 };
        }
        grouped[item.productShortcode].sum += Number(item.rating || 0);
        grouped[item.productShortcode].count += 1;
    });

    const normalized: Record<string, { count: number; rating: number }> = {};
    Object.entries(grouped).forEach(([shortcode, value]) => {
        normalized[shortcode] = {
            count: value.count,
            rating: value.count ? Math.min(5, Math.max(0, Math.ceil(value.sum / value.count))) : 0,
        };
    });
    return normalized;
}

function toTopPercent(uid: string, users: UserProfile[], userReviewCounts: Record<string, number>) {
    const scores: UserScore[] = users.map((item) => {
        const likes = (item.likedProducts?.length ?? 0) + (item.likedGrowers?.length ?? 0) + (item.likedShops?.length ?? 0);
        const reviews = userReviewCounts[item.uid] ?? 0;
        return {
            uid: item.uid,
            likes,
            reviews,
            score: likes + reviews,
        };
    });

    if (!scores.length) {
        return 100;
    }

    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const rank = sorted.findIndex((item) => item.uid === uid);
    if (rank < 0) {
        return 100;
    }
    return Math.max(1, Math.ceil(((rank + 1) / sorted.length) * 100));
}

function toAverageStats(users: UserProfile[], userReviewCounts: Record<string, number>): AvgStats {
    if (!users.length) {
        return { products: 0, growers: 0, shops: 0, reviews: 0 };
    }

    const total = users.length;
    const likesProducts = users.reduce((sum, item) => sum + (item.likedProducts?.length ?? 0), 0);
    const likesGrowers = users.reduce((sum, item) => sum + (item.likedGrowers?.length ?? 0), 0);
    const likesShops = users.reduce((sum, item) => sum + (item.likedShops?.length ?? 0), 0);
    const reviews = users.reduce((sum, item) => sum + (userReviewCounts[item.uid] ?? 0), 0);

    return {
        products: likesProducts / total,
        growers: likesGrowers / total,
        shops: likesShops / total,
        reviews: reviews / total,
    };
}

function inferPreferenceBadges(products: ProductType[]) {
    const typeCounter: Record<string, number> = { sativa: 0, indica: 0, hybrid: 0 };
    const categoryCounter: Record<string, number> = { wiet: 0, hasj: 0, edible: 0 };

    products.forEach((item) => {
        const type = String(item.type || "").toLowerCase();
        if (type.includes("sativa")) typeCounter.sativa += 1;
        if (type.includes("indica")) typeCounter.indica += 1;
        if (type.includes("hybrid")) typeCounter.hybrid += 1;

        const source = `${item.title} ${item.type} ${item.description || ""}`.toLowerCase();
        if (source.includes("wiet")) categoryCounter.wiet += 1;
        if (source.includes("hasj") || source.includes("hash")) categoryCounter.hasj += 1;
        if (source.includes("edible") || source.includes("eetbaar")) categoryCounter.edible += 1;
    });

    const strainBadge =
        Object.entries(typeCounter).sort((a, b) => b[1] - a[1])[0]?.[1] > 0
            ? Object.entries(typeCounter).sort((a, b) => b[1] - a[1])[0][0]
            : "hybrid";

    const categoryBadge =
        Object.entries(categoryCounter).sort((a, b) => b[1] - a[1])[0]?.[1] > 0
            ? Object.entries(categoryCounter).sort((a, b) => b[1] - a[1])[0][0]
            : "wiet";

    return {
        strain: strainBadge.charAt(0).toUpperCase() + strainBadge.slice(1),
        category: categoryBadge.charAt(0).toUpperCase() + categoryBadge.slice(1),
    };
}

function ProfileHeader({
    activeProfile,
    isOwnProfile,
    onEditProfile,
}: {
    activeProfile: UserProfile;
    isOwnProfile: boolean;
    onEditProfile: () => void;
}) {
    return (
        <Card sx={{ mb: 2 }}>
            <div
                style={{
                    height: 140,
                    backgroundImage: activeProfile.headerImageUrl
                        ? `url(${activeProfile.headerImageUrl})`
                        : "linear-gradient(120deg, #1b5e20 0%, #33691e 100%)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            />
            <CardContent sx={{ mt: -6 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Avatar
                        src={activeProfile.avatarUrl}
                        alt={activeProfile.displayName}
                        sx={{ width: 88, height: 88, border: "3px solid white", mb: 1 }}
                    />
                    {isOwnProfile && (
                        <Button variant="outlined" onClick={onEditProfile}>
                            Profiel bewerken
                        </Button>
                    )}
                </Stack>
                <Typography variant="h5" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    {activeProfile.displayName}
                </Typography>
                <Typography
                    component={RouterLink}
                    to={`/profiel/${activeProfile.username || activeProfile.uid}`}
                    variant="body2"
                    sx={{ color: "text.secondary", textDecoration: "none", fontWeight: 600 }}
                >
                    @{activeProfile.username}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
                    {activeProfile.bio || "Nog geen bio toegevoegd."}
                </Typography>
            </CardContent>
        </Card>
    );
}

function ProfileView({
    activeProfile,
    reviews,
    isOwnProfile,
    onPushToggle,
    onLogout,
    pushEnabled,
}: ProfileViewProps) {
    const [likedProducts, setLikedProducts] = useState<ProductType[]>([]);
    const [allProducts, setAllProducts] = useState<ProductType[]>([]);
    const [likedGrowers, setLikedGrowers] = useState<GrowerType[]>([]);
    const [likedShops, setLikedShops] = useState<ShopType[]>([]);
    const [allReviews, setAllReviews] = useState<ProductReview[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [displayName, setDisplayName] = useState(activeProfile.displayName || "");
    const [username, setUsername] = useState(activeProfile.username || "");
    const [avatarUrl, setAvatarUrl] = useState(activeProfile.avatarUrl || "");
    const [headerImageUrl, setHeaderImageUrl] = useState(activeProfile.headerImageUrl || "");
    const [bio, setBio] = useState(activeProfile.bio || "");
    const [savingProfile, setSavingProfile] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const { updateProfileDetails } = useAuth();

    React.useEffect(() => {
        setDisplayName(activeProfile.displayName || "");
        setUsername(activeProfile.username || "");
        setAvatarUrl(activeProfile.avatarUrl || "");
        setHeaderImageUrl(activeProfile.headerImageUrl || "");
        setBio(activeProfile.bio || "");
    }, [activeProfile]);

    React.useEffect(() => {
        const unsubs: Array<() => void> = [];

        unsubs.push(
            onSnapshot(productCollectionRef, (snapshot) => {
                const all = snapshot.docs.map((item) => item.data() as ProductType);
                setAllProducts(all);
                const likedCodes = new Set(activeProfile.likedProducts || []);
                const productsByCode = new Map(
                    all
                        .filter((item) => likedCodes.has(item.shortcode))
                        .map((item) => [item.shortcode as string, item])
                );

                const orderedProducts = (activeProfile.likedProducts || [])
                    .map((code) => productsByCode.get(code))
                    .filter((item): item is ProductType => Boolean(item));
                setLikedProducts(orderedProducts);
            })
        );

        unsubs.push(
            onSnapshot(brandCollectionRef, (snapshot) => {
                const likedCodes = new Set(activeProfile.likedGrowers || []);
                const growersByCode = new Map(
                    snapshot.docs
                        .map((item) => item.data() as GrowerType)
                        .filter((item) => likedCodes.has(item.shortcode || ""))
                        .map((item) => [item.shortcode as string, item])
                );

                const orderedGrowers = (activeProfile.likedGrowers || [])
                    .map((code) => growersByCode.get(code))
                    .filter((item): item is GrowerType => Boolean(item));
                setLikedGrowers(orderedGrowers);
            })
        );

        unsubs.push(
            onSnapshot(shopCollectionRef, (snapshot) => {
                const likedCodes = new Set(activeProfile.likedShops || []);
                const shopsByCode = new Map(
                    snapshot.docs
                        .map((item) => item.data() as ShopType)
                        .filter((item) => likedCodes.has(item.shortcode || ""))
                        .map((item) => [item.shortcode as string, item])
                );

                const orderedShops = (activeProfile.likedShops || [])
                    .map((code) => shopsByCode.get(code))
                    .filter((item): item is ShopType => Boolean(item));
                setLikedShops(orderedShops);
            })
        );

        unsubs.push(
            onSnapshot(reviewsCollectionRef, (snapshot) => {
                setAllReviews(
                    snapshot.docs.map((item) => ({
                        id: item.id,
                        ...(item.data() as Omit<ProductReview, "id">),
                    }))
                );
            })
        );

        unsubs.push(
            onSnapshot(gebruikersCollectionRef, (snapshot) => {
                setAllUsers(snapshot.docs.map((item) => item.data() as UserProfile));
            })
        );

        return () => {
            unsubs.forEach((unsubscribe) => unsubscribe());
        };
    }, [activeProfile.likedGrowers, activeProfile.likedProducts, activeProfile.likedShops]);

    const productReviewStats = useMemo(() => toProductReviewStats(allReviews), [allReviews]);

    const reviewCountsByUser = useMemo(() => {
        const grouped: Record<string, number> = {};
        allReviews.forEach((item) => {
            grouped[item.userId] = (grouped[item.userId] ?? 0) + 1;
        });
        return grouped;
    }, [allReviews]);

    const topPercent = useMemo(
        () => toTopPercent(activeProfile.uid, allUsers, reviewCountsByUser),
        [activeProfile.uid, allUsers, reviewCountsByUser]
    );
    const averageStats = useMemo(
        () => toAverageStats(allUsers, reviewCountsByUser),
        [allUsers, reviewCountsByUser]
    );

    const preferenceBadges = useMemo(() => inferPreferenceBadges(likedProducts), [likedProducts]);

    const reviewCards = useMemo(() => {
        const productsByCode = new Map(allProducts.map((item) => [item.shortcode, item]));
        const usersByUid = new Map(allUsers.map((item) => [item.uid, item]));
        return reviews.map((item) => {
            const product = productsByCode.get(item.productShortcode);
            const growerTitle = product?.brand?.title || "-";
            const growerShortcode = product?.brand?.shortcode || "";
            const reviewerProfile = usersByUid.get(item.userId);
            return {
                ...item,
                growerTitle,
                growerShortcode,
                reviewerAvatar: reviewerProfile?.avatarUrl || "",
                reviewerUsername: reviewerProfile?.username || item.userName,
            };
        });
    }, [allProducts, allUsers, reviews]);

    const handleSaveProfile = async () => {
        setSaveError(null);
        try {
            setSavingProfile(true);
            await updateProfileDetails({
                displayName,
                username,
                avatarUrl,
                headerImageUrl,
                bio,
            });
            setIsEditing(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Profiel opslaan mislukt.";
            setSaveError(message);
        } finally {
            setSavingProfile(false);
        }
    };

    const loadLocalImage = useCallback((file: File | undefined, setter: (value: string) => void) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") {
                setter(reader.result);
            }
        };
        reader.readAsDataURL(file);
    }, []);

    return (
        <>
            <ProfileHeader activeProfile={activeProfile} isOwnProfile={isOwnProfile} onEditProfile={() => setIsEditing(true)} />

            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Typography variant="subtitle1" sx={{ color: "text.secondary", fontWeight: 700 }}>
                        Top {topPercent}% van gebruikers
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Reviews: {reviews.length} (gem. {averageStats.reviews.toFixed(1)}) | Product-likes: {activeProfile.likedProducts?.length ?? 0} (gem. {averageStats.products.toFixed(1)})
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Teler-likes: {activeProfile.likedGrowers?.length ?? 0} (gem. {averageStats.growers.toFixed(1)}) | Winkel-likes: {activeProfile.likedShops?.length ?? 0} (gem. {averageStats.shops.toFixed(1)})
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Badge: {preferenceBadges.strain} gebruiker | {preferenceBadges.category} gebruiker
                    </Typography>
                </CardContent>
            </Card>

            <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Gelikete soortjes ({likedProducts.length})
            </Typography>
            {!likedProducts.length ? (
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                    Nog geen likes.
                </Typography>
            ) : (
                <Box
                    sx={{
                        width: "100%",
                        display: "grid",
                        gap: 1.5,
                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
                        mb: 2,
                    }}
                >
                    {likedProducts.map((product) => (
                        <div key={`liked-product-${product.shortcode}`} style={{ minWidth: 0 }}>
                            <ProductCard
                                product={{ ...product, rating: productReviewStats[product.shortcode]?.rating ?? product.rating }}
                                reviewCount={productReviewStats[product.shortcode]?.count ?? 0}
                            />
                        </div>
                    ))}
                </Box>
            )}

            <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Gelikete telers ({likedGrowers.length})
            </Typography>
            {!likedGrowers.length ? (
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                    Nog geen teler-likes.
                </Typography>
            ) : (
                <Box
                    sx={{
                        width: "100%",
                        display: "grid",
                        gap: 1.5,
                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
                        mb: 2,
                    }}
                >
                    {likedGrowers.map((grower) => (
                        <div key={`liked-grower-${grower.shortcode}`} style={{ minWidth: 0 }}>
                            <GrowerCard grower={grower} />
                        </div>
                    ))}
                </Box>
            )}

            <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Gelikete winkels ({likedShops.length})
            </Typography>
            {!likedShops.length ? (
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                    Nog geen winkel-likes.
                </Typography>
            ) : (
                <Box
                    sx={{
                        width: "100%",
                        display: "grid",
                        gap: 1.5,
                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
                        mb: 2,
                    }}
                >
                    {likedShops.map((shop) => (
                        <div key={`liked-shop-${shop.shortcode}`} style={{ minWidth: 0 }}>
                            <ShopCard shop={shop} />
                        </div>
                    ))}
                </Box>
            )}

            <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 600, mt: 2 }}>
                Mijn reviews ({reviews.length})
            </Typography>
            {!reviews.length ? (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Nog geen reviews geplaatst.
                </Typography>
            ) : (
                reviewCards.map((item) => (
                    <Card key={item.id} sx={{ mb: 1 }}>
                        <CardContent>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar src={item.reviewerAvatar}>
                                    {(item.userName || "U").charAt(0).toUpperCase()}
                                </Avatar>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 700 }}>
                                        {item.userName}
                                    </Typography>
                                    <Typography
                                        component={RouterLink}
                                        to={`/profiel/${item.reviewerUsername || item.userId}`}
                                        variant="caption"
                                        sx={{ color: "text.secondary", textDecoration: "none" }}
                                    >
                                        @{item.reviewerUsername}
                                    </Typography>
                                </Box>
                            </Stack>
                            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600, mt: 1 }}>
                                <RouterLink to={`/cannabis/${item.productShortcode}`}>{item.productTitle}</RouterLink>
                                {" | "}
                                {item.growerShortcode ? (
                                    <RouterLink to={`/telers/${item.growerShortcode}`}>{item.growerTitle}</RouterLink>
                                ) : (
                                    item.growerTitle
                                )}
                                {" | "}
                                {item.rating}/5
                            </Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                {item.review}
                            </Typography>
                        </CardContent>
                    </Card>
                ))
            )}

            <Dialog open={isEditing} onClose={() => setIsEditing(false)} fullWidth maxWidth="sm">
                <DialogTitle>Profiel bewerken</DialogTitle>
                <DialogContent>
                    {saveError && <Alert severity="error" sx={{ mb: 1.5 }}>{saveError}</Alert>}
                    <TextField fullWidth label="Naam" size="small" value={displayName} onChange={(e) => setDisplayName(e.target.value)} sx={{ mb: 1.5, mt: 0.5 }} />
                    <TextField fullWidth label="Gebruikersnaam" size="small" value={username} onChange={(e) => setUsername(e.target.value)} sx={{ mb: 1.5 }} />
                    <TextField fullWidth label="Thumbnail URL" size="small" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} sx={{ mb: 1 }} />
                    <Button component="label" variant="text" size="small" sx={{ mb: 1.5 }}>
                        Of kies thumbnail bestand
                        <input hidden accept="image/*" type="file" onChange={(event) => loadLocalImage(event.target.files?.[0], setAvatarUrl)} />
                    </Button>
                    <TextField fullWidth label="Header afbeelding URL" size="small" value={headerImageUrl} onChange={(e) => setHeaderImageUrl(e.target.value)} sx={{ mb: 1 }} />
                    <Button component="label" variant="text" size="small" sx={{ mb: 1.5 }}>
                        Of kies header bestand
                        <input hidden accept="image/*" type="file" onChange={(event) => loadLocalImage(event.target.files?.[0], setHeaderImageUrl)} />
                    </Button>
                    <TextField fullWidth multiline minRows={2} label="Korte bio" size="small" value={bio} onChange={(e) => setBio(e.target.value)} sx={{ mb: 1.5 }} />
                    <FormControlLabel
                        control={<Switch checked={pushEnabled} onChange={(event) => onPushToggle(event.target.checked)} />}
                        label="Pushmeldingen"
                    />
                    <Divider sx={{ my: 1.5 }} />
                    <Button variant="outlined" color="error" onClick={onLogout}>
                        Uitloggen
                    </Button>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsEditing(false)}>Sluiten</Button>
                    <Button variant="contained" onClick={() => { void handleSaveProfile(); }} disabled={savingProfile}>
                        {savingProfile ? "Opslaan..." : "Opslaan"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default function Profile() {
    const { user, profile, reviews, logout, setPushEnabled } = useAuth();
    const { uid } = useParams();
    const [error, setError] = useState<string | null>(null);
    const [sharedProfile, setSharedProfile] = useState<UserProfile | null>(null);
    const [sharedLookup, setSharedLookup] = useState("");
    const [sharedReviews, setSharedReviews] = useState<ProductReview[]>([]);

    const activeProfile = useMemo(() => sharedProfile ?? profile, [sharedProfile, profile]);
    const activeReviews = sharedProfile ? sharedReviews : reviews;
    const isPublicView = Boolean(sharedProfile);

    const handleShareLookup = useCallback(async (overrideLookup?: string) => {
        setError(null);
        setSharedProfile(null);
        setSharedReviews([]);

        const target = (overrideLookup ?? sharedLookup).trim();
        if (!target) return;

        try {
            let resolvedUid = target;
            let profileData: UserProfile | null = null;

            const byUid = await getDoc(doc(db, "Gebruikers", target));
            if (byUid.exists()) {
                profileData = byUid.data() as UserProfile;
            } else {
                const byUsername = await getDocs(query(collection(db, "Gebruikers"), where("username", "==", target.toLowerCase())));
                if (!byUsername.empty) {
                    resolvedUid = byUsername.docs[0].id;
                    profileData = byUsername.docs[0].data() as UserProfile;
                }
            }

            if (!profileData) {
                throw new Error("Profiel niet gevonden.");
            }

            setSharedProfile({
                ...profileData,
                uid: resolvedUid,
            });

            const reviewQuery = query(collection(db, "reviews"), where("userId", "==", resolvedUid));
            const snapshot = await getDocs(reviewQuery);
            setSharedReviews(
                snapshot.docs.map((item) => ({
                    id: item.id,
                    ...(item.data() as Omit<ProductReview, "id">),
                }))
            );
        } catch (lookupError) {
            const message =
                lookupError instanceof Error ? lookupError.message : "Profiel kon niet geladen worden.";
            setError(message);
        }
    }, [sharedLookup]);

    React.useEffect(() => {
        if (uid) {
            setSharedLookup(uid);
            handleShareLookup(uid);
        }
    }, [uid, handleShareLookup]);

    const handlePushToggle = async (checked: boolean) => {
        setError(null);
        try {
            await setPushEnabled(checked);
        } catch (toggleError) {
            const message =
                toggleError instanceof Error
                    ? toggleError.message
                    : "Push-instelling kon niet bijgewerkt worden.";
            setError(message);
        }
    };

    return (
        <section style={{ textAlign: "left", margin: 16, paddingBottom: 88 }}>
            <Typography variant="h5" sx={{ color: "text.secondary", fontWeight: 600, mb: 2 }}>
                Profiel
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!isPublicView && (
                <Card sx={{ borderRadius: 3, mb: 2 }}>
                    <CardContent>
                        <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 1 }}>
                            Publiek profiel openen
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <TextField
                                fullWidth
                                size="small"
                                label="UID of username"
                                value={sharedLookup}
                                onChange={(event) => setSharedLookup(event.target.value)}
                            />
                            <Button variant="outlined" onClick={() => { void handleShareLookup(); }}>
                                Open
                            </Button>
                        </Stack>
                        {sharedProfile && (
                            <Button sx={{ mt: 1 }} variant="text" onClick={() => {
                                setSharedProfile(null);
                                setSharedReviews([]);
                            }}>
                                Terug naar mijn profiel
                            </Button>
                        )}
                        {profile && (
                            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
                                Deelbaar profiel:
                                {" "}
                                <RouterLink to={`/profiel/${profile.username || profile.uid}`}>
                                    {window.location.origin}/profiel/{profile.username || profile.uid}
                                </RouterLink>
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                    {activeProfile ? (
                        <ProfileView
                            activeProfile={activeProfile}
                            reviews={activeReviews}
                            isOwnProfile={!isPublicView && Boolean(user)}
                            onPushToggle={(checked) => { void handlePushToggle(checked); }}
                            onLogout={() => { void logout(); }}
                            pushEnabled={Boolean(profile?.pushEnabled)}
                        />
                    ) : (
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            Geen profielgegevens beschikbaar.
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </section>
    );
}
