import React, { useEffect, useMemo, useState } from "react";
import { DocumentReference, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import {
    categoryCollectionRef,
    productCollectionRef,
    reviewsCollectionRef,
    shopCollectionRef,
    subCategoryCollectionRef,
    gebruikersCollectionRef,
} from "./firebaseCollections";
import "./Product.css";
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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
import BoltIcon from "@mui/icons-material/Bolt";
import ProductRating from "./components/Rating";
import { TasteType } from "./types/taste";
import { ProductReview, UserProfile } from "./types/user";
import { useAuth } from "./context/AuthContext";
import { productMainImageUrl, MEDIA_PLACEHOLDER, mediaFallback } from "./utils/mediaSource";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import SentimentSatisfiedIcon from "@mui/icons-material/SentimentSatisfied";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAltOutlined";
import SentimentVerySatisfiedIcon from "@mui/icons-material/SentimentVerySatisfied";
import SentimentNeutralIcon from "@mui/icons-material/SentimentNeutral";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import StorefrontIcon from "@mui/icons-material/Storefront";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { shareLink } from "./services/share";
import { incrementEntityView } from "./services/viewStats";
import { getAllProductShortcodes, getPreferredProductShortcode } from "./utils/productSlug";
import { ShopType } from "./types/shop";
import ShopCard from "./components/ShopCard";
import ReviewCard from "./components/ReviewCard";
import { ReviewReactionValue, setReviewReaction } from "./services/reviewReactions";

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
    if (!value || typeof value !== "object") return 0;
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
    if (!value || typeof value !== "object") return undefined;
    const item = value as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name : "";
    if (!name) return undefined;
    return { name, icon: typeof item.icon === "string" ? item.icon : "" };
}

function toTerpeneType(value: unknown): TerpeneType | undefined {
    if (!value || typeof value !== "object") return undefined;
    const item = value as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name : "";
    if (!name) return undefined;
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

function toTasteType(value: unknown): TasteType | undefined {
    if (!value || typeof value !== "object") return undefined;
    const item = value as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name : "";
    if (!name) return undefined;
    return { name, icon: typeof item.icon === "string" ? item.icon : "" };
}

function isDefined<T>(value: T | undefined): value is T {
    return value !== undefined;
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
    if (normalized.includes("sativa")) return "Sativa Dominant";
    if (normalized.includes("indica")) return "Indica Dominant";
    return "Hybrid";
}

function getStrainChipSx(type: string | undefined) {
    const normalized = String(type || "").toLowerCase();
    if (normalized.includes("sativa")) return { backgroundColor: "rgba(46, 125, 50, 0.92)", color: "#fff" };
    if (normalized.includes("indica")) return { backgroundColor: "rgba(21, 101, 192, 0.92)", color: "#fff" };
    return { backgroundColor: "rgba(109, 76, 65, 0.92)", color: "#fff" };
}

function getCbdLabel(cbdValue: number): string {
    return cbdValue < 1 ? "< 1%" : `${cbdValue}%`;
}

function isVideoUrl(url: string): boolean {
    return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
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
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string>("");
    const [shopsSellingProduct, setShopsSellingProduct] = useState<ShopType[]>([]);
    const [profilesByUid, setProfilesByUid] = useState<Record<string, UserProfile>>({});
    const [categoryNameById, setCategoryNameById] = useState<Record<string, string>>({});
    const [subCategoryNameById, setSubCategoryNameById] = useState<Record<string, string>>({});

    const activeProductCode = getPreferredProductShortcode(product?.data) || product?.data.shortcode || productcode;
    const productCodes = useMemo(() => {
        const codes = getAllProductShortcodes(product?.data);
        if (productcode) {
            codes.push(productcode);
        }
        if (activeProductCode) {
            codes.push(activeProductCode);
        }
        return Array.from(new Set(codes.filter(Boolean)));
    }, [activeProductCode, product?.data, productcode]);
    const myReview = useMemo(
        () => reviews.find((item) => productCodes.includes(item.productShortcode)),
        [productCodes, reviews]
    );
    const mainImage = productMainImageUrl(product?.data);
    const onImageError = mediaFallback();
    const galleryImages = useMemo(() => mainImage ? [mainImage] : [], [mainImage]);

    useEffect(() => {
        if (galleryImages.length > 0) {
            setSelectedImage((prev) => (prev && galleryImages.includes(prev) ? prev : galleryImages[0]));
        } else {
            setSelectedImage("");
        }
    }, [galleryImages]);

    const categoryName = product?.data?.categoryName || (product?.data?.categoryId ? categoryNameById[product.data.categoryId] : "") || "Cannabis";
    const subCategoryName = product?.data?.subCategoryName || (product?.data?.subCategoryId ? subCategoryNameById[product.data.subCategoryId] : "") || "-";

    const strainLabel = getStrainLabel(product?.data?.type);
    const strainChipSx = getStrainChipSx(product?.data?.type);
    const cbdLabel = getCbdLabel(Number(product?.data?.cbdMax ?? 0));
    const tastes = asArray<TasteType | undefined>(product?.data?.tastes).map((taste) => taste?.name).filter((name): name is string => Boolean(name));
    const positiveEffects = asArray<EffectType | undefined>(product?.data?.positiveEffects)
        .map((effect) => effect?.name)
        .filter((name): name is string => Boolean(name));
    const negativeEffects = asArray<EffectType | undefined>(product?.data?.negativeEffects)
        .map((effect) => effect?.name)
        .filter((name): name is string => Boolean(name));
    const variants = useMemo(() => {
        const variantNames = asArray<{ name?: string }>(product?.data?.variants)
            .map((variant) => (variant?.name || "").trim())
            .filter((name): name is string => Boolean(name));
        return Array.from(new Set(variantNames));
    }, [product?.data?.variants]);

    const displayedReviews = useMemo(() => (showAllReviews ? productReviews : productReviews.slice(0, 5)), [productReviews, showAllReviews]);
    const reviewCards = useMemo(() => {
        return displayedReviews.map((item) => {
            return {
                ...item,
                growerTitle: product?.brand?.title || product?.data?.brand?.title || "-",
                growerShortcode: product?.brand?.shortcode || product?.data?.brand?.shortcode || "",
                productLinkCode: item.productShortcode || activeProductCode,
            };
        });
    }, [activeProductCode, displayedReviews, product?.brand?.shortcode, product?.brand?.title, product?.data?.brand?.shortcode, product?.data?.brand?.title, profilesByUid]);

    const averageRating = useMemo(() => {
        if (!productReviews.length) return product?.data.rating ?? 0;
        const total = productReviews.reduce((sum, item) => sum + item.rating, 0);
        return Math.min(5, Math.max(0, Math.ceil(total / productReviews.length)));
    }, [product?.data.rating, productReviews]);

    const ratingDistribution = useMemo(() => {
        const total = productReviews.length;
        return [5, 4, 3, 2, 1].map((score) => {
            const count = productReviews.filter((item) => item.rating === score).length;
            const percentage = total ? Math.round((count / total) * 100) : 0;
            return { score, count, percentage };
        });
    }, [productReviews]);

    const terpeneStats = useMemo(() => {
        const terpenes = asArray<TerpeneType | undefined>(product?.data?.terpenes)
            .map((item) => ({ name: item?.name ?? "", mgPerKg: Number((item as unknown as { mgPerKg?: number })?.mgPerKg ?? 0) }))
            .filter((item) => Boolean(item.name));

        const totalMg = terpenes.reduce((sum, item) => sum + item.mgPerKg, 0);
        if (!terpenes.length || totalMg <= 0) {
            return terpenes.map((item) => ({ ...item, percentage: 0 }));
        }
        return terpenes.map((item) => ({ ...item, percentage: Math.round((item.mgPerKg / totalMg) * 100) }));
    }, [product?.data?.terpenes]);

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
        const unsubscribeCategories = onSnapshot(categoryCollectionRef, (snapshot) => {
            const map: Record<string, string> = {};
            snapshot.docs.forEach((docItem) => {
                const data = docItem.data() as { id?: string; name?: string };
                const id = (data.id || docItem.id || "").toString();
                const name = (data.name || "").toString();
                if (id && name) map[id] = name;
            });
            setCategoryNameById(map);
        });

        const unsubscribeSubCategories = onSnapshot(subCategoryCollectionRef, (snapshot) => {
            const map: Record<string, string> = {};
            snapshot.docs.forEach((docItem) => {
                const data = docItem.data() as { id?: string; name?: string };
                const id = (data.id || docItem.id || "").toString();
                const name = (data.name || "").toString();
                if (id && name) map[id] = name;
            });
            setSubCategoryNameById(map);
        });

        return () => {
            unsubscribeCategories();
            unsubscribeSubCategories();
        };
    }, []);

    useEffect(() => {
        const unsubscribeUsers = onSnapshot(gebruikersCollectionRef, (snapshot) => {
            const nextProfiles: Record<string, UserProfile> = {};
            snapshot.docs.forEach((docItem) => {
                const data = docItem.data() as UserProfile;
                const uid = data?.uid || docItem.id;
                if (!uid) return;
                nextProfiles[uid] = { ...data, uid };
            });
            setProfilesByUid(nextProfiles);
        });
        return () => unsubscribeUsers();
    }, []);

    useEffect(() => {
        if (!product?.data?.id) {
            setShopsSellingProduct([]);
            return;
        }

        const productId = String(product.data.id);
        const productCodeSet = new Set(productCodes);

        const unsubscribeShops = onSnapshot(shopCollectionRef, (snapshot) => {
            const docs =
                snapshot.docs.some((item) => item.data()?.source === "graphql")
                    ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                    : snapshot.docs;

            const matched = docs
                .map((item) => item.data() as ShopType)
                .filter((shop) => {
                    const linkedProducts = asArray<unknown>(shop.products).map((value) => String(value));
                    return (
                        linkedProducts.includes(productId) ||
                        linkedProducts.some((value) => productCodeSet.has(value))
                    );
                });
            setShopsSellingProduct(matched);
        });

        return () => unsubscribeShops();
    }, [product?.data?.id, productCodes]);

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
        void incrementEntityView("product", productcode).catch((viewError) => {
            console.warn("Product view kon niet opgeslagen worden.", viewError);
        });
    }, [productcode]);
    useEffect(() => {
        let cancelled = false;

        const resolveProduct = async () => {
            try {
                setLoading(true);
                setError(null);

                const queryCandidates = [
                    query(productCollectionRef, where("shortcode", "==", productcode)),
                    query(productCollectionRef, where("legacyShortcodes", "array-contains", productcode)),
                ];

                let selectedDoc: { id: string; data: ProductType } | null = null;
                for (const queryRef of queryCandidates) {
                    const snapshot = await getDocs(queryRef);
                    if (snapshot.empty) continue;

                    const docs =
                        snapshot.docs.some((item) => item.data()?.source === "graphql")
                            ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                            : snapshot.docs;

                    const candidate = docs[0];
                    if (candidate) {
                        selectedDoc = { id: candidate.id, data: candidate.data() as ProductType };
                        break;
                    }
                }

                if (!selectedDoc) {
                    const fullSnapshot = await getDocs(productCollectionRef);
                    const docs =
                        fullSnapshot.docs.some((item) => item.data()?.source === "graphql")
                            ? fullSnapshot.docs.filter((item) => item.data()?.source === "graphql")
                            : fullSnapshot.docs;

                    const matched = docs.find((item) => {
                        const data = item.data() as ProductType;
                        const allCodes = getAllProductShortcodes(data);
                        return allCodes.includes(productcode);
                    });

                    if (matched) selectedDoc = { id: matched.id, data: matched.data() as ProductType };
                }

                if (!selectedDoc) {
                    if (!cancelled) {
                        setProduct(null);
                        setError("Product niet gevonden.");
                    }
                    return;
                }

                const productData = selectedDoc.data;
                let brandData: GrowerType | undefined;
                let negativeEffectData: EffectType | undefined;
                let positiveEffectData: EffectType | undefined;
                let terpeneData: TerpeneType | undefined;

                if (isDocumentReference(productData.brand)) {
                    const brandSnapshot = await getDoc(productData.brand);
                    if (brandSnapshot.exists()) brandData = brandSnapshot.data() as GrowerType;
                } else {
                    brandData = productData.brand as GrowerType | undefined;
                }

                if (isDocumentReference(productData.dominantTerpene)) {
                    const terpeneSnapshot = await getDoc(productData.dominantTerpene);
                    if (terpeneSnapshot.exists()) terpeneData = terpeneSnapshot.data() as TerpeneType;
                } else {
                    terpeneData = toTerpeneType(productData.dominantTerpene);
                }

                if (isDocumentReference(productData.dominantNegativeEffect)) {
                    const negativeEffectSnapshot = await getDoc(productData.dominantNegativeEffect);
                    if (negativeEffectSnapshot.exists()) negativeEffectData = negativeEffectSnapshot.data() as EffectType;
                } else {
                    negativeEffectData = toEffectType(productData.dominantNegativeEffect);
                }

                if (isDocumentReference(productData.dominantPositiveEffect)) {
                    const positiveEffectSnapshot = await getDoc(productData.dominantPositiveEffect);
                    if (positiveEffectSnapshot.exists()) positiveEffectData = positiveEffectSnapshot.data() as EffectType;
                } else {
                    positiveEffectData = toEffectType(productData.dominantPositiveEffect);
                }

                const tastesInput = asArray<unknown>(productData.tastes);
                const terpenesInput = asArray<unknown>(productData.terpenes);
                const negativeEffectsInput = asArray<unknown>(productData.negativeEffects);
                const positiveEffectsInput = asArray<unknown>(productData.positiveEffects);

                const tasteData = tastesInput.length
                    ? (await resolveArrayData<TasteType>(tastesInput)).map(toTasteType).filter(isDefined)
                    : [];
                const terpenesData = terpenesInput.length
                    ? (await resolveArrayData<TerpeneType>(terpenesInput)).filter(isDefined)
                    : [];
                const negativesEffectData = negativeEffectsInput.length
                    ? (await resolveArrayData<EffectType>(negativeEffectsInput)).filter(isDefined)
                    : [];
                const positivesEffectData = positiveEffectsInput.length
                    ? (await resolveArrayData<EffectType>(positiveEffectsInput)).filter(isDefined)
                    : [];

                const dominantTerpene =
                    terpeneData ??
                    toTerpeneType(productData.dominantTerpene) ?? {
                        id: 0,
                        name: "Onbekend",
                        energic: 50,
                        relaxing: 50,
                        medical: "",
                        effect: "Hybrid",
                        color: "#6d4c41",
                    };
                const dominantNegativeEffect =
                    negativeEffectData ??
                    toEffectType(productData.dominantNegativeEffect) ?? {
                        id: 0,
                        name: "Negatief",
                    };
                const dominantPositiveEffect =
                    positiveEffectData ??
                    toEffectType(productData.dominantPositiveEffect) ?? {
                        id: 0,
                        name: "Positief",
                    };

                if (!cancelled) {
                    const canonicalCode =
                        getPreferredProductShortcode({
                            ...productData,
                            brand: (brandData as ProductType["brand"]) || productData.brand,
                        }) ||
                        productData.shortcode ||
                        productcode;

                    if (canonicalCode && canonicalCode !== productcode) {
                        navigate(`/cannabis/${canonicalCode}`, { replace: true });
                    }

                    setProduct({
                        id: selectedDoc.id,
                        data: {
                            ...productData,
                            dominantTerpene,
                            dominantNegativeEffect,
                            dominantPositiveEffect,
                            tastes: tasteData,
                            terpenes: terpenesData,
                            negativeEffects: negativesEffectData,
                            positiveEffects: positivesEffectData,
                        },
                        brand: brandData,
                    });
                }
            } catch (fetchError) {
                const message = fetchError instanceof Error ? fetchError.message : "Er ging iets mis bij het laden van het product.";
                if (!cancelled) setError(message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void resolveProduct();
        return () => {
            cancelled = true;
        };
    }, [navigate, productcode]);

    useEffect(() => {
        const unsubscribe = onSnapshot(reviewsCollectionRef, (snapshot) => {
            const items = snapshot.docs
                .map((item) => ({ id: item.id, ...(item.data() as Omit<ProductReview, "id">) }))
                .filter((item) => productCodes.includes(item.productShortcode))
                .sort((a, b) => {
                    const aTs = Math.max(toMillis(a.updatedAt), toMillis(a.createdAt));
                    const bTs = Math.max(toMillis(b.updatedAt), toMillis(b.createdAt));
                    return bTs - aTs;
                });
            setProductReviews(items);
        });

        return () => unsubscribe();
    }, [productCodes]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error loading product data: {error}</div>;

    const openWhereToBuy = () => navigate("/kaart");

    const handleLike = async () => {
        setFormError(null);
        if (!user) {
            navigate("/login");
            return;
        }

        try {
            await toggleLike(activeProductCode);
        } catch (likeError) {
            const message = likeError instanceof Error ? likeError.message : "Like kon niet opgeslagen worden.";
            setFormError(message);
        }
    };

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/cannabis/${activeProductCode}`;
        const result = await shareLink({
            title: product?.data.title ?? "Cannabis product",
            text: `Bekijk ${product?.data.title ?? "dit product"}`,
            url: shareUrl,
        });
        if (result === "copied") window.alert("Link gekopieerd.");
    };

    const handleOpenReviewModal = () => {
        if (!user) {
            navigate("/login");
            return;
        }
        setReviewModalOpen(true);
    };

    const handleReviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!product) return;

        setFormError(null);
        setSavingReview(true);
        try {
            await saveReview({
                productShortcode: activeProductCode,
                productTitle: product.data.title,
                rating: reviewRating,
                review: reviewText,
            });
            setReviewModalOpen(false);
        } catch (reviewError) {
            const message = reviewError instanceof Error ? reviewError.message : "Review kon niet opgeslagen worden.";
            setFormError(message);
        } finally {
            setSavingReview(false);
        }
    };

    const handleReviewDelete = async () => {
        setFormError(null);
        setRemovingReview(true);
        try {
            await deleteReview(activeProductCode);
            setReviewModalOpen(false);
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : "Review kon niet verwijderd worden.";
            setFormError(message);
        } finally {
            setRemovingReview(false);
        }
    };

    const handleReviewReaction = async (reviewId: string, reaction: ReviewReactionValue) => {
        if (!user) {
            navigate("/login");
            return;
        }
        if (!navigator.onLine) {
            setFormError("Reageren op reviews kan alleen wanneer je online bent.");
            return;
        }

        setFormError(null);
        try {
            await setReviewReaction(reviewId, user.uid, reaction);
        } catch (reactionError) {
            const message = reactionError instanceof Error ? reactionError.message : "Review-reactie kon niet opgeslagen worden.";
            setFormError(message);
        }
    };

    const largeImage = selectedImage || MEDIA_PLACEHOLDER;
    const isSelectedMediaVideo = isVideoUrl(largeImage);
    return (
        <section className="product-container" style={{ paddingBottom: 90 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

            <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "3fr 2fr" }, mb: 4 }}>
                <Box>
                    {isSelectedMediaVideo ? (
                        <Box
                            component="video"
                            src={largeImage}
                            controls
                            sx={{ width: "100%", maxHeight: 560, borderRadius: 2, backgroundColor: "#0c0c0c" }}
                        />
                    ) : (
                        <Box
                            component="img"
                            src={largeImage}
                            alt={product?.data?.title}
                            width="640"
                            height="420"
                            loading="lazy"
                            onError={onImageError}
                            sx={{ width: "100%", maxHeight: 560, objectFit: "contain", borderRadius: 2, backgroundColor: "#f6f7f7" }}
                        />
                    )}

                    {galleryImages.length > 1 && (
                        <Stack direction="row" spacing={1} sx={{ mt: 1.5, overflowX: "auto", pb: 0.5 }}>
                            {galleryImages.map((mediaUrl) => {
                                const video = isVideoUrl(mediaUrl);
                                return (
                                    <Box
                                        key={mediaUrl}
                                        component="button"
                                        type="button"
                                        onClick={() => setSelectedImage(mediaUrl)}
                                        sx={{
                                            border: selectedImage === mediaUrl ? "2px solid #2e7d32" : "1px solid #d0d7d8",
                                            borderRadius: 1.5,
                                            background: "#fff",
                                            p: 0,
                                            minWidth: 84,
                                            width: 84,
                                            height: 64,
                                            cursor: "pointer",
                                            position: "relative",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {video ? (
                                            <Box sx={{ width: "100%", height: "100%", bgcolor: "#121212", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <PlayArrowIcon sx={{ color: "#fff" }} />
                                            </Box>
                                        ) : (
                                            <Box component="img" src={mediaUrl} alt="Preview" sx={{ width: 84, height: 64, objectFit: "cover" }} />
                                        )}
                                    </Box>
                                );
                            })}
                        </Stack>
                    )}
                </Box>

                <Box sx={{ textAlign: "left" }}>
                    <Typography component="h1" variant="h4" sx={{ color: "text.secondary", fontWeight: 700, mb: 0.5 }}>
                        {product?.data?.title}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
                        <ProductRating rating={averageRating} />
                        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>{productReviews.length} reviews</Typography>
                    </Stack>

                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>Categorie: {categoryName}</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600, mb: 1.25 }}>Subcategorie: {subCategoryName}</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
                        {product?.data?.shortDescription || "Geen korte omschrijving beschikbaar."}
                    </Typography>

                    <Chip size="small" icon={<BoltIcon />} label={strainLabel} variant="filled" sx={{ ...strainChipSx, "& .MuiChip-icon": { color: "inherit" }, mb: 2 }} />


                    <Stack direction="row" spacing={1}>
                        <Button variant="contained" color="success" startIcon={<StorefrontIcon />} onClick={openWhereToBuy}>Waar te koop</Button>
                        <IconButton aria-label="delen" onClick={() => { void handleShare(); }}>
                            <ShareIcon />
                        </IconButton>
                        <IconButton aria-label="like" onClick={() => { void handleLike(); }}>
                            {isProductLiked(activeProductCode) ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                        </IconButton>
                    </Stack>

                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700, mb: 0.5 }}>
                            Te verkrijgen in:
                        </Typography>
                        {variants.length ? (
                            <Stack spacing={0.25}>
                                {variants.map((variant) => (
                                    <Typography key={variant} variant="body2" sx={{ color: "text.secondary" }}>
                                        {variant}
                                    </Typography>
                                ))}
                            </Stack>
                        ) : (
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                Geen varianten bekend.
                            </Typography>
                        )}
                    </Box>
                </Box>
            </Box>

            <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" }, mb: 4 }}>
                <Box sx={{ textAlign: "left" }}>
                    <Typography component="h2" variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Omschrijving</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "pre-line" }}>
                        {product?.data?.description || "Geen uitgebreide omschrijving beschikbaar."}
                    </Typography>
                </Box>

                <Box sx={{ textAlign: "left" }}>
                    <Typography component="h2" variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Specificaties</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>THC: {product?.data?.thcMin}% - {product?.data?.thcMax}%</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>CBD: {cbdLabel}</Typography>

                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Terpenen</Typography>
                    {terpeneStats.length > 0 ? (
                        <Stack spacing={1} sx={{ mb: 1.5 }}>
                            {terpeneStats.slice(0, 6).map((item) => (
                                <Box key={`${item.name}-${item.mgPerKg}`}>
                                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                                        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                            {item.name}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                            {item.percentage > 0 ? `${item.percentage}%` : `${item.mgPerKg} mg/kg`}
                                        </Typography>
                                    </Stack>
                                    <LinearProgress variant="determinate" value={Math.max(2, item.percentage || 0)} />
                                </Box>
                            ))}
                        </Stack>
                    ) : (
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>Geen terpeneverdeling beschikbaar.</Typography>
                    )}

                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Smaken</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                        {tastes.length ? tastes.join(", ") : "Geen smaken beschikbaar."}
                    </Typography>

                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.4 }}>Positieve effecten</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                        {positiveEffects.length ? positiveEffects.join(", ") : "Geen positieve effecten beschikbaar."}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.4 }}>Negatieve effecten</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {negativeEffects.length ? negativeEffects.join(", ") : "Geen negatieve effecten beschikbaar."}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ mb: 4, textAlign: "left" }}>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    Verkrijgbaar bij coffeeshops
                </Typography>
                {!shopsSellingProduct.length ? (
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Nog geen winkels gekoppeld aan dit product.
                    </Typography>
                ) : (
                    <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", pb: 1 }}>
                        {shopsSellingProduct.map((shop) => (
                            <Box key={`shop-${shop.shortcode || shop.id}`} sx={{ minWidth: 280, maxWidth: 320 }}>
                                <ShopCard shop={shop} />
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "2fr 3fr" } }}>
                <Box sx={{ textAlign: "left" }}>
                    <Typography component="h2" variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Reviews</Typography>
                    <Stack spacing={1} sx={{ mb: 2 }}>
                        {ratingDistribution.map((item) => {
                            const iconConfig = reviewIcons[item.score] ?? fallbackReviewIcon;
                            const Icon = iconConfig.Icon;
                            return (
                                <Box key={`dist-${item.score}`} sx={{ display: "grid", gridTemplateColumns: "32px 1fr 66px", alignItems: "center", gap: 1 }}>
                                    <Icon htmlColor={iconConfig.color} />
                                    <LinearProgress variant="determinate" value={item.percentage} />
                                    <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "right" }}>
                                        {item.count} ({item.percentage}%)
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                        {(() => {
                            const avgRounded = Math.min(5, Math.max(1, Math.ceil(averageRating || 1)));
                            return [1, 2, 3, 4, 5].map((score) => {
                                const iconConfig = reviewIcons[score] ?? fallbackReviewIcon;
                                const Icon = iconConfig.Icon;
                                return <Icon key={`avg-icon-${score}`} htmlColor={score === avgRounded ? iconConfig.color : "#bdbdbd"} />;
                            });
                        })()}
                        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                            Gemiddeld {averageRating}/5 op basis van {productReviews.length} reviews
                        </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                        Help de community met jouw ervaring over dit product.
                    </Typography>
                    <Button variant="contained" startIcon={<RateReviewOutlinedIcon />} onClick={handleOpenReviewModal}>
                        Schrijf review
                    </Button>
                    {!user && (
                        <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
                            Inloggen is nodig om een review te plaatsen.
                        </Typography>
                    )}
                </Box>

                <Box sx={{ textAlign: "left" }}>
                    {!productReviews.length ? (
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                            Nog geen reviews geplaatst.
                        </Typography>
                    ) : (
                        <Stack spacing={1.2} sx={{ mb: 1.5 }}>
                            {reviewCards.map((item) => (
                                <ReviewCard
                                    key={item.id}
                                    review={item}
                                    reviewerProfile={profilesByUid[item.userId]}
                                    productLink={`/cannabis/${item.productLinkCode}`}
                                    growerLink={item.growerShortcode ? `/telers/${item.growerShortcode}` : undefined}
                                    growerTitle={item.growerTitle}
                                    currentUserId={user?.uid}
                                    onReact={handleReviewReaction}
                                />
                            ))}
                        </Stack>
                    )}
                    {productReviews.length > 5 && (
                        <Button variant="text" onClick={() => setShowAllReviews((prev) => !prev)}>
                            {showAllReviews ? "Minder tonen" : `Meer tonen (${productReviews.length - 5})`}
                        </Button>
                    )}
                </Box>
            </Box>

            <Dialog open={reviewModalOpen} onClose={() => setReviewModalOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Jouw review</DialogTitle>
                <DialogContent>
                    {!navigator.onLine && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Reviews aanpassen kan alleen wanneer je online bent.
                        </Alert>
                    )}
                    {myReview ? (
                        <Box sx={{ border: "1px solid #eceff0", borderRadius: 2, p: 1.5 }}>
                            <ProductRating rating={myReview.rating} />
                            <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                                {myReview.review}
                            </Typography>
                            <Button variant="outlined" color="error" disabled={!navigator.onLine || removingReview} onClick={() => { void handleReviewDelete(); }}>
                                {removingReview ? "Verwijderen..." : "Review verwijderen"}
                            </Button>
                        </Box>
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
                            <TextField fullWidth multiline minRows={3} label="Jouw ervaring" value={reviewText} onChange={(event) => setReviewText(event.target.value)} sx={{ mt: 1, mb: 1 }} />
                            <DialogActions sx={{ px: 0 }}>
                                <Button onClick={() => setReviewModalOpen(false)} color="inherit">Sluiten</Button>
                                <Button type="submit" variant="contained" disabled={savingReview || !navigator.onLine}>
                                    {savingReview ? "Opslaan..." : "Review opslaan"}
                                </Button>
                            </DialogActions>
                        </form>
                    )}
                </DialogContent>
                {myReview && (
                    <DialogActions>
                        <Button onClick={() => setReviewModalOpen(false)} color="inherit">Sluiten</Button>
                    </DialogActions>
                )}
            </Dialog>
        </section>
    );
}
