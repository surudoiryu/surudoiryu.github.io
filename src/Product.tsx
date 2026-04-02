import React, { useEffect, useMemo, useState } from "react";
import { DocumentReference, getDoc, onSnapshot } from "firebase/firestore";
import { productCollectionRef } from "./firebaseCollections";
import "./Product.css";
import {
    Alert,
    Button,
    IconButton,
    LinearProgress,
    Rating,
    TextField,
    Typography,
} from "@mui/material";
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
import { useAuth } from "./context/AuthContext";

type ProductState = {
    id: string;
    data: ProductType;
    brand?: GrowerType;
} | null;

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

export default function PageProduct() {
    const navigate = useNavigate();
    const location = useLocation();
    const productcode = location.pathname.split("/")[2];
    const { user, isProductLiked, toggleLike, saveReview, reviews } = useAuth();

    const [product, setProduct] = useState<ProductState>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [reviewText, setReviewText] = useState("");
    const [reviewRating, setReviewRating] = useState<number>(3);
    const [savingReview, setSavingReview] = useState(false);

    const myReview = useMemo(
        () => reviews.find((item) => item.productShortcode === productcode),
        [reviews, productcode]
    );
    const resolvedEnergic = product?.data?.dominantTerpene?.energic ?? 0;
    const resolvedRelaxing = product?.data?.dominantTerpene?.relaxing ?? 0;
    const strainLabel =
        resolvedEnergic > 50
            ? "Sativa Dominant"
            : resolvedEnergic === resolvedRelaxing
                ? "Hybrid"
                : "Indica Dominant";
    const tasteNames = asArray<TasteType | undefined>(product?.data?.tastes)
        .map((taste) => taste?.name)
        .filter((name): name is string => Boolean(name))
        .join(", ");

    useEffect(() => {
        if (myReview) {
            setReviewText(myReview.review);
            setReviewRating(myReview.rating);
        }
    }, [myReview]);

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

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error loading product data: {error}</div>;
    }

    const openProductOverviewPage = () => {
        navigate("/cannabis", { replace: true });
    };

    const handleLike = async () => {
        setFormError(null);
        try {
            await toggleLike(productcode);
        } catch (likeError) {
            const message =
                likeError instanceof Error ? likeError.message : "Like kon niet opgeslagen worden.";
            setFormError(message);
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
                <ProductRating rating={product?.data.rating ?? 0} />

                <Chip
                    size="small"
                    icon={<BoltIcon />}
                    label={strainLabel}
                    variant="outlined"
                />
                <IconButton aria-label="share">
                    <ShareIcon />
                </IconButton>
                {user && (
                    <IconButton aria-label="add to favorites" onClick={handleLike}>
                        {isProductLiked(productcode) ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                    </IconButton>
                )}

                <Typography variant="body1" sx={{ color: "text.secondary" }}>
                    <img src={product?.data.images.main} alt={product?.data.title} style={{ maxWidth: "100%" }} />
                </Typography>
            </section>

            <section>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    THC {product?.data.thcMin}% - {product?.data.thcMax}%<br />
                    CBD{" "}
                    {product?.data.cbdMin === 0
                        ? `< ${product?.data.cbdMax}%`
                        : `${product?.data.cbdMin}% - ${product?.data.cbdMax}%`}
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

            {user ? (
                <section style={{ margin: 30, textAlign: "left" }}>
                    <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 600 }}>
                        Jouw review
                    </Typography>
                    {!navigator.onLine && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Reviews opslaan kan alleen wanneer je online bent.
                        </Alert>
                    )}
                    <form onSubmit={handleReviewSubmit}>
                        <Rating
                            value={reviewRating}
                            onChange={(_, value) => setReviewRating(value ?? 1)}
                            max={5}
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
                </section>
            ) : (
                <Typography variant="body2" sx={{ color: "text.secondary", margin: 3 }}>
                    Log in om soortjes te liken en reviews te plaatsen.
                </Typography>
            )}
        </section>
    );
}
