import React, { useEffect, useMemo, useState } from "react";
import { DocumentReference, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { productCollectionRef, reviewsCollectionRef } from "./firebaseCollections";
import "./Product.css";
import {
    Alert,
    Button,
    Card,
    CardContent,
    IconButton,
    LinearProgress,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import MuiRating, { IconContainerProps } from "@mui/material/Rating";
import { GrowerType } from "./types/grower";
import { EffectType } from "./types/effect";
import { TerpeneType } from "./types/terpene";
import { ProductType } from "./types/product";
import { useLocation, useNavigate } from "react-router-dom";
import ShareIcon from "@mui/icons-material/Share";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import Chip from "@mui/material/Chip";
import BoltIcon from "@mui/icons-material/Bolt";
import ProductRating from "./components/Rating";
import CircleIcon from "@mui/icons-material/Circle";
import VolunteerActivismOutlinedIcon from "@mui/icons-material/VolunteerActivismOutlined";
import { TasteType } from "./types/taste";
import { ProductReview } from "./types/user";
import { useAuth } from "./context/AuthContext";
import { useSignedMediaUrl } from "./hooks/useSignedMediaUrl";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import SentimentSatisfiedIcon from "@mui/icons-material/SentimentSatisfied";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAltOutlined";
import SentimentVerySatisfiedIcon from "@mui/icons-material/SentimentVerySatisfied";
import SentimentNeutralIcon from "@mui/icons-material/SentimentNeutral";
import { shareLink } from "./services/share";
import { incrementEntityView } from "./services/viewStats";

type ProductState = {
    id: string;
    data: ProductType;
    brand?: GrowerType;
} | null;

type RatingOption = {
    Icon: typeof SentimentVeryDissatisfiedIcon;
    color: string;
    label: string;
};

const reviewIcons: Record<number, RatingOption> = {
    1: { Icon: SentimentVeryDissatisfiedIcon, color: "#d32f2f", label: "Zeer ontevreden" },
    2: { Icon: SentimentDissatisfiedIcon, color: "#e53935", label: "Ontevreden" },
    3: { Icon: SentimentSatisfiedIcon, color: "#f57c00", label: "Neutraal" },
    4: { Icon: SentimentSatisfiedAltIcon, color: "#43a047", label: "Tevreden" },
    5: { Icon: SentimentVerySatisfiedIcon, color: "#2e7d32", label: "Zeer tevreden" },
};

const fallbackReviewIcon: RatingOption = {
    Icon: SentimentNeutralIcon,
    color: "#9e9e9e",
    label: "Geen score",
};

function toMillis(value: unknown): number {
    if (!value || typeof value !== "object") {
        return 0;
    }

    const candidate = value as { toMillis?: () => number };
    return typeof candidate.toMillis === "function" ? candidate.toMillis() : 0;
}

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

function isDocumentReference(value: unknown): value is DocumentReference {
    return Boolean(value && typeof value === "object" && "path" in (value as Record<string, unknown>));
}

function toEffectType(value: unknown): EffectType | undefined {
    if (!value || typeof value !== "object") {
        return undefined;
    }

    const item = value as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name : "";
    if (!name) {
        return undefined;
    }

    return {
        name,
        icon: typeof item.icon === "string" ? item.icon : "",
    };
}

function toTerpeneType(value: unknown): TerpeneType | undefined {
    if (!value || typeof value !== "object") {
        return undefined;
    }

    const item = value as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name : "";
    if (!name) {
        return undefined;
    }

    return {
        name,
        color: typeof item.color === "string" ? item.color : "#6d4c41",
        effect: typeof item.effect === "string" ? item.effect : "",
        icon: typeof item.icon === "string" ? item.icon : "",
        medical: typeof item.medical === "string" ? item.medical : "",
        energic: Number(item.energic ?? 0),
        relaxing: Number(item.relaxing ?? 0),
    };
}

async function resolveArrayData<T>(items: unknown[]): Promise<Array<T | undefined>> {
    return Promise.all(
        items.map(async (item) => {
            if (isDocumentReference(item)) {
                const snapshot = await getDoc(item);
                return snapshot.exists() ? (snapshot.data() as T) : undefined;
            }
            return item as T;
        })
    );
}


function getStrainLabel(type: string | undefined): string {
    const normalized = String(type || "").toLowerCase();
    if (normalized.includes("sativa")) {
        return "Sativa Dominant";
    }
    if (normalized.includes("indica")) {
        return "Indica Dominant";
    }
    return "Hybrid";
}

function getCbdLabel(cbdValue: number): string {
    return cbdValue < 1 ? "< 1%" : `${cbdValue}%`;
}
export default function PageProduct() {
    const navigate = useNavigate();
    const location = useLocation();
    const productcode = location.pathname.split("/")[2];
    const { user, isProductLiked, toggleLike, saveReview, deleteReview, reviews } = useAuth();

    const [product, setProduct] = useState<ProductState>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [reviewText, setReviewText] = useState("");
    const [reviewRating, setReviewRating] = useState<number>(3);
    const [reviewHover, setReviewHover] = useState<number>(-1);
    const [savingReview, setSavingReview] = useState(false);
    const [removingReview, setRemovingReview] = useState(false);
    const [productReviews, setProductReviews] = useState<ProductReview[]>([]);
    const [showAllReviews, setShowAllReviews] = useState(false);

    const myReview = useMemo(
        () => reviews.find((item) => item.productShortcode === productcode),
        [reviews, productcode]
    );
    const rawProductImageSource =
        product?.data?.images?.main ||
        product?.data?.thumbnailUrl ||
        product?.data?.images?.close ||
        product?.data?.images?.mood ||
        "";
    const productImageUrl = useSignedMediaUrl(rawProductImageSource);
    const productImageToShow = productImageUrl || rawProductImageSource || "/android-chrome-192x192.png";
    const strainLabel = getStrainLabel(product?.data?.type);
    const cbdLabel = getCbdLabel(Number(product?.data?.cbdMax ?? 0));
    const tasteNames = asArray<TasteType | undefined>(product?.data?.tastes)
        .map((taste) => taste?.name)
        .filter((name): name is string => Boolean(name))
        .join(", ");
    const displayedReviews = useMemo(
        () => (showAllReviews ? productReviews : productReviews.slice(0, 5)),
        [productReviews, showAllReviews]
    );
    const averageRating = useMemo(() => {
        if (!productReviews.length) {
            return product?.data.rating ?? 0;
        }
        const total = productReviews.reduce((sum, item) => sum + item.rating, 0);
        return Math.min(5, Math.max(0, Math.ceil(total / productReviews.length)));
    }, [product?.data.rating, productReviews]);
    const activeReviewIcon = reviewHover !== -1 ? reviewHover : reviewRating;
    const ReviewIconContainer = (props: IconContainerProps) => {
        const { value, ...other } = props;
        const iconConfig = reviewIcons[value] ?? fallbackReviewIcon;
        const IconComponent = iconConfig.Icon;
        const isActive = value === activeReviewIcon;

        return (
            <span {...other}>
                <IconComponent htmlColor={isActive ? iconConfig.color : "#bdbdbd"} />
            </span>
        );
    };

    useEffect(() => {
        if (myReview) {
            setReviewText(myReview.review);
            setReviewRating(myReview.rating);
        } else {
            setReviewText("");
            setReviewRating(3);
        }
    }, [myReview]);

    useEffect(() => {
        void incrementEntityView("product", productcode).catch((error) => {
            console.warn("Product view kon niet opgeslagen worden.", error);
        });
    }, [productcode]);

    useEffect(() => {
        const unsubscribe = onSnapshot(productCollectionRef, async (snapshot) => {
            try {
                const docs =
                    snapshot.docs.some((item) => item.data()?.source === "graphql")
                        ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                        : snapshot.docs;

                const products = await Promise.all(
                    docs.map(async (item) => {
                        const productData = item.data() as ProductType;
                        let brandData: GrowerType | undefined;
                        let negativeEffectData: EffectType | undefined;
                        let positiveEffectData: EffectType | undefined;
                        let terpeneData: TerpeneType | undefined;

                        if (isDocumentReference(productData.brand)) {
                            const brandSnapshot = await getDoc(productData.brand);
                            if (brandSnapshot.exists()) {
                                brandData = brandSnapshot.data() as GrowerType;
                            }
                        } else {
                            brandData = productData.brand as GrowerType | undefined;
                        }

                        if (isDocumentReference(productData.dominantTerpene)) {
                            const terpeneSnapshot = await getDoc(productData.dominantTerpene);
                            if (terpeneSnapshot.exists()) {
                                terpeneData = terpeneSnapshot.data() as TerpeneType;
                            }
                        } else {
                            terpeneData = toTerpeneType(productData.dominantTerpene);
                        }

                        if (isDocumentReference(productData.dominantNegativeEffect)) {
                            const negativeEffectSnapshot = await getDoc(productData.dominantNegativeEffect);
                            if (negativeEffectSnapshot.exists()) {
                                negativeEffectData = negativeEffectSnapshot.data() as EffectType;
                            }
                        } else {
                            negativeEffectData = toEffectType(productData.dominantNegativeEffect);
                        }

                        if (isDocumentReference(productData.dominantPositiveEffect)) {
                            const positiveEffectSnapshot = await getDoc(productData.dominantPositiveEffect);
                            if (positiveEffectSnapshot.exists()) {
                                positiveEffectData = positiveEffectSnapshot.data() as EffectType;
                            }
                        } else {
                            positiveEffectData = toEffectType(productData.dominantPositiveEffect);
                        }

                        const tastes = asArray<unknown>(productData.tastes);
                        const terpenes = asArray<unknown>(productData.terpenes);
                        const negativeEffects = asArray<unknown>(productData.negativeEffects);
                        const positiveEffects = asArray<unknown>(productData.positiveEffects);

                        const tasteData = tastes.length ? await resolveArrayData<TasteType>(tastes) : [];
                        const terpenesData = terpenes.length ? await resolveArrayData<TerpeneType>(terpenes) : [];
                        const negativesEffectData = negativeEffects.length
                            ? await resolveArrayData<EffectType>(negativeEffects)
                            : [];
                        const positivesEffectData = positiveEffects.length
                            ? await resolveArrayData<EffectType>(positiveEffects)
                            : [];

                        if (productData?.shortcode === productcode) {
                            return {
                                id: item.id,
                                data: {
                                    ...productData,
                                    dominantTerpene: terpeneData,
                                    dominantNegativeEffect: negativeEffectData,
                                    dominantPositiveEffect: positiveEffectData,
                                    tastes: tasteData,
                                    terpenes: terpenesData,
                                    negativeEffects: negativesEffectData,
                                    positiveEffects: positivesEffectData,
                                },
                                brand: brandData,
                            };
                        }

                        return null;
                    })
                );

                const foundProduct = products.find((item) => item !== null) ?? null;
                setProduct(foundProduct as ProductState);
                setLoading(false);
            } catch (fetchError) {
                const message =
                    fetchError instanceof Error
                        ? fetchError.message
                        : "Er ging iets mis bij het laden van het product.";
                setError(message);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [productcode]);

    useEffect(() => {
        const reviewQuery = query(reviewsCollectionRef, where("productShortcode", "==", productcode));
        const unsubscribe = onSnapshot(reviewQuery, (snapshot) => {
            const items = snapshot.docs
                .map((item) => ({
                    id: item.id,
                    ...(item.data() as Omit<ProductReview, "id">),
                }))
                .sort((a, b) => {
                    const aTs = Math.max(toMillis(a.updatedAt), toMillis(a.createdAt));
                    const bTs = Math.max(toMillis(b.updatedAt), toMillis(b.createdAt));
                    return bTs - aTs;
                });

            setProductReviews(items);
        });

        return () => unsubscribe();
    }, [productcode]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error loading product data: {error}</div>;
    }

    const openProductOverviewPage = () => {
        navigate("/cannabis");
    };

    const handleLike = async () => {
        setFormError(null);
        if (!user) {
            navigate("/login");
            return;
        }

        try {
            await toggleLike(productcode);
        } catch (likeError) {
            const message =
                likeError instanceof Error ? likeError.message : "Like kon niet opgeslagen worden.";
            setFormError(message);
        }
    };

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/cannabis/${productcode}`;
        const result = await shareLink({
            title: product?.data.title ?? "Cannabis product",
            text: `Bekijk ${product?.data.title ?? "dit product"}`,
            url: shareUrl,
        });
        if (result === "copied") {
            window.alert("Link gekopieerd.");
        }
    };

    const handleReviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!product) {
            return;
        }

        setFormError(null);
        setSavingReview(true);

        try {
            await saveReview({
                productShortcode: productcode,
                productTitle: product.data.title,
                rating: reviewRating,
                review: reviewText,
            });
        } catch (reviewError) {
            const message =
                reviewError instanceof Error
                    ? reviewError.message
                    : "Review kon niet opgeslagen worden.";
            setFormError(message);
        } finally {
            setSavingReview(false);
        }
    };

    const handleReviewDelete = async () => {
        setFormError(null);
        setRemovingReview(true);
        try {
            await deleteReview(productcode);
        } catch (deleteError) {
            const message =
                deleteError instanceof Error
                    ? deleteError.message
                    : "Review kon niet verwijderd worden.";
            setFormError(message);
        } finally {
            setRemovingReview(false);
        }
    };

    return (
        <section className="product-container" style={{ paddingBottom: 90 }}>
            <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 600 }} onClick={openProductOverviewPage}>
                &lt;- Producten Overzicht
            </Typography>

            {formError && <Alert severity="error">{formError}</Alert>}

            <section id="headerInfo" style={{ textAlign: "left", margin: 30 }}>
                <Typography variant="h5" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    {product?.data.title}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {product?.data.shortDescription}
                </Typography>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <ProductRating rating={averageRating} />
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                        ({productReviews.length})
                    </Typography>
                </span>

                <Chip
                    size="small"
                    icon={<BoltIcon />}
                    label={strainLabel}
                    variant="outlined"
                />
                <IconButton aria-label="share" onClick={() => { void handleShare(); }}>
                    <ShareIcon />
                </IconButton>
                <IconButton aria-label="add to favorites" onClick={() => { void handleLike(); }}>
                    {isProductLiked(productcode) ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                </IconButton>

                <Typography variant="body1" sx={{ color: "text.secondary" }}>
                    <img src={productImageToShow} alt={product?.data.title} style={{ maxWidth: "100%" }} />
                </Typography>
            </section>

            <section>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    THC {product?.data.thcMin}% - {product?.data.thcMax}%<br />
                    CBD {cbdLabel}
                    <br />
                    <br />
                </Typography>
                <CircleIcon fontSize="small" htmlColor={product?.data.dominantTerpene.color} />{" "}
                {product?.data.dominantTerpene.name}
                <br />
                kalmerend, energiek
                <LinearProgress variant="determinate" value={product?.data.dominantTerpene.energic} />
                <br />
                THC gehalte, energiek
                <LinearProgress variant="determinate" value={((product?.data.thcMax ?? 0) / 35) * 100} />
                <br />
                Effect
                <VolunteerActivismOutlinedIcon fontSize="small" />{" "}
                {product?.data.dominantPositiveEffect.name}
            </section>

            <section id="shopDetails" style={{ textAlign: "left", marginBottom: "30px" }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {product?.data.description}
                </Typography>
                {tasteNames}
            </section>

            <section style={{ margin: 16, textAlign: "left" }}>
                <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 600, mb: 1 }}>
                    Reviews
                </Typography>
                {!productReviews.length ? (
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                        Nog geen reviews geplaatst.
                    </Typography>
                ) : (
                    <Stack spacing={1.2} sx={{ mb: 1.5 }}>
                        {displayedReviews.map((item) => (
                            <Card key={item.id} sx={{ borderRadius: 2 }}>
                                <CardContent sx={{ pt: 1.2, pb: "12px !important" }}>
                                    <ProductRating rating={item.rating} />
                                    <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                        {item.userName}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                        {item.review}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                )}
                {productReviews.length > 5 && (
                    <Button
                        variant="text"
                        onClick={() => setShowAllReviews((prev) => !prev)}
                        sx={{ mb: 1.5 }}
                    >
                        {showAllReviews ? "Minder tonen" : `Meer tonen (${productReviews.length - 5})`}
                    </Button>
                )}

                {user ? (
                    <>
                        <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 600 }}>
                            Jouw review
                        </Typography>
                        {!navigator.onLine && (
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Reviews aanpassen kan alleen wanneer je online bent.
                            </Alert>
                        )}
                        {myReview ? (
                            <Card sx={{ borderRadius: 2 }}>
                                <CardContent>
                                    <ProductRating rating={myReview.rating} />
                                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                                        {myReview.review}
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        disabled={!navigator.onLine || removingReview}
                                        onClick={() => { void handleReviewDelete(); }}
                                    >
                                        {removingReview ? "Verwijderen..." : "Review verwijderen"}
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <form onSubmit={handleReviewSubmit}>
                                <MuiRating
                                    value={reviewRating}
                                    onChange={(_, value) => setReviewRating(value ?? 1)}
                                    onChangeActive={(_, value) => setReviewHover(value)}
                                    max={5}
                                    IconContainerComponent={ReviewIconContainer}
                                    getLabelText={(value: number) => (reviewIcons[value] ?? fallbackReviewIcon).label}
                                    highlightSelectedOnly
                                />
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={3}
                                    label="Jouw ervaring"
                                    value={reviewText}
                                    onChange={(event) => setReviewText(event.target.value)}
                                    sx={{ mt: 1, mb: 1 }}
                                />
                                <Button type="submit" variant="contained" disabled={savingReview || !navigator.onLine}>
                                    {savingReview ? "Opslaan..." : "Review opslaan"}
                                </Button>
                            </form>
                        )}
                    </>
                ) : (
                    <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                        Log in om je eigen review toe te voegen.
                    </Typography>
                )}
            </section>
        </section>
    );
}






