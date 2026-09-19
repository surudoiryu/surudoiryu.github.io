import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Drawer,
    FormControlLabel,
    Slider,
    Stack,
    Switch,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import { DocumentReference, collection, getDoc, onSnapshot } from "firebase/firestore";
import { categoryCollectionRef, productCollectionRef } from "../firebaseCollections";
import { ProductType } from "../types/product";
import { GrowerType } from "../types/grower";
import { EffectType } from "../types/effect";
import { TerpeneType } from "../types/terpene";
import { TasteType } from "../types/taste";
import ProductCard from "./ProductCard";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { viewStatsCollectionRef } from "../firebaseCollections";
import { aggregateProductReviewStats } from "../utils/reviewStats";
import { ProductReview } from "../types/user";

interface BrandProps {
    brandId?: string;
    limit?: number;
    showFilters?: boolean;
    initialSearchTerm?: string;
    initialType?: string;
    initialProductForms?: string[];
    initialThcRange?: [number, number];
    initialCbdRange?: [number, number];
    initialTastes?: string[];
    initialPositiveEffects?: string[];
    initialMinimumRating?: number;
    initialOnlyWithReviews?: boolean;
    sortByViews?: boolean;
    carouselOnMobile?: boolean;
}

interface ProductItem {
    id: string;
    data: ProductType;
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

function toTasteNames(product: ProductType): string[] {
    return ((product.tastes as unknown as Array<TasteType | undefined>) ?? [])
        .map((taste) => taste?.name?.trim())
        .filter((name): name is string => Boolean(name));
}

function toPositiveEffectNames(product: ProductType): string[] {
    const dominant = product.dominantPositiveEffect?.name
        ? [product.dominantPositiveEffect.name]
        : [];
    const extra = ((product.positiveEffects as unknown as Array<EffectType | undefined>) ?? [])
        .map((effect) => effect?.name?.trim())
        .filter((name): name is string => Boolean(name));
    return Array.from(new Set([...dominant, ...extra]));
}

const ProductenPerMerk = ({
    brandId,
    limit,
    showFilters = false,
    initialSearchTerm,
    initialType,
    initialProductForms,
    initialThcRange,
    initialCbdRange,
    initialTastes,
    initialPositiveEffects,
    initialMinimumRating,
    initialOnlyWithReviews,
    sortByViews = false,
    carouselOnMobile = false,
}: BrandProps) => {
    const { profile } = useAuth();
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const [producten, setProducten] = useState<ProductItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterOpen, setFilterOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState(initialSearchTerm ?? "");
    const [selectedTypes, setSelectedTypes] = useState<string[]>(initialType ? [initialType] : []);
    const [selectedProductForms, setSelectedProductForms] = useState<string[]>(initialProductForms ?? []);
    const [thcRange, setThcRange] = useState<[number, number]>(initialThcRange ?? [0, 35]);
    const [cbdRange, setCbdRange] = useState<[number, number]>(initialCbdRange ?? [0, 30]);
    const [selectedTastes, setSelectedTastes] = useState<string[]>(initialTastes ?? []);
    const [selectedGrowers, setSelectedGrowers] = useState<string[]>([]);
    const [selectedPositiveEffects, setSelectedPositiveEffects] = useState<string[]>(initialPositiveEffects ?? []);
    const [onlyLiked, setOnlyLiked] = useState(false);
    const [onlyWithReviews, setOnlyWithReviews] = useState(initialOnlyWithReviews ?? false);
    const [minimumRating, setMinimumRating] = useState(initialMinimumRating ?? 0);

    const [reviewedProductCodes, setReviewedProductCodes] = useState<Set<string>>(new Set());
    const [reviewStatsByProduct, setReviewStatsByProduct] = useState<
        Record<string, { count: number; rating: number }>
    >({});
    const [viewStatsByProduct, setViewStatsByProduct] = useState<Record<string, number>>({});
    const [categoryNamesById, setCategoryNamesById] = useState<Record<string, string>>({});
    const [desktopFiltersVisible, setDesktopFiltersVisible] = useState(true);
    const [visibleCount, setVisibleCount] = useState(24);
    const loadMoreRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        setSearchTerm(initialSearchTerm ?? "");
    }, [initialSearchTerm]);

    useEffect(() => {
        setSelectedTypes(initialType ? [initialType] : []);
    }, [initialType]);

    useEffect(() => {
        setSelectedProductForms(initialProductForms ?? []);
    }, [initialProductForms]);

    useEffect(() => {
        setThcRange(initialThcRange ?? [0, 35]);
    }, [initialThcRange]);

    useEffect(() => {
        setCbdRange(initialCbdRange ?? [0, 30]);
    }, [initialCbdRange]);

    useEffect(() => {
        setSelectedTastes(initialTastes ?? []);
    }, [initialTastes]);

    useEffect(() => {
        setSelectedPositiveEffects(initialPositiveEffects ?? []);
    }, [initialPositiveEffects]);

    useEffect(() => {
        setMinimumRating(initialMinimumRating ?? 0);
    }, [initialMinimumRating]);

    useEffect(() => {
        setOnlyWithReviews(initialOnlyWithReviews ?? false);
    }, [initialOnlyWithReviews]);

    useEffect(() => {
        const unsubscribeReviews = onSnapshot(collection(db, "reviews"), (snapshot) => {
            const reviewItems = snapshot.docs.map((docItem) => ({
                id: docItem.id,
                ...(docItem.data() as Omit<ProductReview, "id">),
            })) as ProductReview[];

            const productList = producten.map((item) => item.data);
            const normalized = aggregateProductReviewStats(reviewItems, productList);
            setReviewStatsByProduct(normalized);
            setReviewedProductCodes(new Set(Object.keys(normalized)));
        });

        return () => unsubscribeReviews();
    }, [producten]);

    useEffect(() => {
        const unsubscribe = onSnapshot(viewStatsCollectionRef, (snapshot) => {
            const nextStats: Record<string, number> = {};
            snapshot.docs.forEach((item) => {
                const data = item.data() as { type?: string; shortcode?: string; views?: number };
                if (data.type === "product" && data.shortcode) {
                    nextStats[data.shortcode] = Number(data.views ?? 0);
                }
            });
            setViewStatsByProduct(nextStats);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(categoryCollectionRef, (snapshot) => {
            const nextMap: Record<string, string> = {};
            snapshot.docs.forEach((item) => {
                const data = item.data() as { id?: string; name?: string };
                const key = (data.id ?? item.id ?? "").toString();
                const name = (data.name ?? "").toString();
                if (key && name) {
                    nextMap[key] = name;
                }
            });
            setCategoryNamesById(nextMap);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(productCollectionRef, async (snapshot) => {
            try {
                const docs =
                    snapshot.docs.some((docItem) => docItem.data()?.source === "graphql")
                        ? snapshot.docs.filter((docItem) => docItem.data()?.source === "graphql")
                        : snapshot.docs;

                const products = await Promise.all(
                    docs.map(async (docItem) => {
                        const productData = docItem.data() as ProductType;
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
                            const negativeEffectSnapshot = await getDoc(
                                productData.dominantNegativeEffect
                            );
                            if (negativeEffectSnapshot.exists()) {
                                negativeEffectData = negativeEffectSnapshot.data() as EffectType;
                            }
                        } else {
                            negativeEffectData = toEffectType(productData.dominantNegativeEffect);
                        }

                        if (isDocumentReference(productData.dominantPositiveEffect)) {
                            const positiveEffectSnapshot = await getDoc(
                                productData.dominantPositiveEffect
                            );
                            if (positiveEffectSnapshot.exists()) {
                                positiveEffectData = positiveEffectSnapshot.data() as EffectType;
                            }
                        } else {
                            positiveEffectData = toEffectType(productData.dominantPositiveEffect);
                        }

                        const tastesInput = asArray<unknown>(productData.tastes);
                        const positiveEffectsInput = asArray<unknown>(productData.positiveEffects);

                        const tastes = tastesInput.length
                            ? await Promise.all(
                                  tastesInput.map(async (ref) => {
                                      if (isDocumentReference(ref)) {
                                          const tasteSnapshot = await getDoc(ref);
                                          if (tasteSnapshot.exists()) {
                                              return tasteSnapshot.data() as TasteType;
                                          }
                                      }
                                      return ref as TasteType | undefined;
                                  })
                              )
                            : [];

                        const positiveEffects = positiveEffectsInput.length
                            ? await Promise.all(
                                  positiveEffectsInput.map(async (ref) => {
                                      if (isDocumentReference(ref)) {
                                          const effectSnapshot = await getDoc(ref);
                                          if (effectSnapshot.exists()) {
                                              return effectSnapshot.data() as EffectType;
                                          }
                                      }
                                      return ref as EffectType | undefined;
                                  })
                              )
                            : [];

                        const enrichedProduct = {
                            ...productData,
                            categoryName:
                                productData.categoryName ||
                                (productData.categoryId ? categoryNamesById[productData.categoryId] : undefined) ||
                                "Cannabis",
                            brand: (brandData ?? productData.brand) as ProductType["brand"],
                            dominantTerpene: (terpeneData ??
                                productData.dominantTerpene) as ProductType["dominantTerpene"],
                            dominantNegativeEffect: (negativeEffectData ??
                                productData.dominantNegativeEffect) as ProductType["dominantNegativeEffect"],
                            dominantPositiveEffect: (positiveEffectData ??
                                productData.dominantPositiveEffect) as ProductType["dominantPositiveEffect"],
                            tastes: tastes as unknown as ProductType["tastes"],
                            positiveEffects: positiveEffects as unknown as ProductType["positiveEffects"],
                        } as ProductType;

                        if (!brandId || (enrichedProduct.brand as GrowerType)?.title === brandId) {
                            return {
                                id: docItem.id,
                                data: enrichedProduct,
                            };
                        }

                        return null;
                    })
                );

                const validProducts = products.filter(
                    (item): item is ProductItem => Boolean(item)
                );
                setProducten(validProducts);
                setLoading(false);
            } catch (fetchError) {
                const message =
                    fetchError instanceof Error
                        ? fetchError.message
                        : "Producten konden niet geladen worden.";
                setError(message);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [brandId, categoryNamesById, limit]);

    const allTypes = useMemo(
        () =>
            Array.from(
                new Set(
                    producten
                        .map((item) => item.data.type?.trim())
                        .filter((item): item is string => Boolean(item))
                )
            ),
        [producten]
    );

    const allGrowers = useMemo(
        () =>
            Array.from(
                new Set(
                    producten
                        .map((item) => (item.data.brand as GrowerType | undefined)?.title?.trim())
                        .filter((name): name is string => Boolean(name))
                )
            ),
        [producten]
    );

    const allTastes = useMemo(
        () =>
            Array.from(
                new Set(
                    producten.flatMap((item) => toTasteNames(item.data))
                )
            ),
        [producten]
    );

    const allPositiveEffects = useMemo(
        () =>
            Array.from(
                new Set(
                    producten.flatMap((item) => toPositiveEffectNames(item.data))
                )
            ),
        [producten]
    );

    const filteredProducts = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        const filtered = producten.filter(({ data }) => {
            const growerName = ((data.brand as GrowerType | undefined)?.title ?? "").toLowerCase();
            const title = (data.title ?? "").toLowerCase();
            const description = (data.shortDescription ?? data.description ?? "").toLowerCase();

            if (
                normalizedSearch &&
                !title.includes(normalizedSearch) &&
                !description.includes(normalizedSearch) &&
                !growerName.includes(normalizedSearch)
            ) {
                return false;
            }

            if (selectedTypes.length && !selectedTypes.includes(data.type)) {
                return false;
            }

            if (selectedProductForms.length && !selectedProductForms.includes(data.categoryName || "")) {
                return false;
            }

            if (data.thcMax < thcRange[0] || data.thcMin > thcRange[1]) {
                return false;
            }

            if (data.cbdMax < cbdRange[0] || data.cbdMin > cbdRange[1]) {
                return false;
            }

            if (selectedGrowers.length) {
                const currentGrower = (data.brand as GrowerType | undefined)?.title ?? "";
                if (!selectedGrowers.includes(currentGrower)) {
                    return false;
                }
            }

            if (selectedTastes.length) {
                const productTastes = toTasteNames(data);
                if (!selectedTastes.some((taste) => productTastes.includes(taste))) {
                    return false;
                }
            }

            if (selectedPositiveEffects.length) {
                const effects = toPositiveEffectNames(data);
                if (!selectedPositiveEffects.some((effect) => effects.includes(effect))) {
                    return false;
                }
            }

            if (onlyLiked && !profile?.likedProducts?.includes(data.shortcode)) {
                return false;
            }

            if (onlyWithReviews && !reviewedProductCodes.has(data.shortcode)) {
                return false;
            }

            if (minimumRating > 0 && (reviewStatsByProduct[data.shortcode]?.rating ?? data.rating ?? 0) < minimumRating) {
                return false;
            }

            return true;
        });
        const sorted = !sortByViews
            ? filtered
            : [...filtered].sort((a, b) => {
                const viewsA = viewStatsByProduct[a.data.shortcode] ?? 0;
                const viewsB = viewStatsByProduct[b.data.shortcode] ?? 0;
                return viewsB - viewsA;
            });

        if (limit !== undefined && limit > 0) {
            return sorted.slice(0, limit);
        }

        return sorted;
    }, [
        cbdRange,
        limit,
        minimumRating,
        onlyLiked,
        onlyWithReviews,
        producten,
        profile?.likedProducts,
        reviewedProductCodes,
        searchTerm,
        selectedGrowers,
        selectedPositiveEffects,
        selectedProductForms,
        selectedTastes,
        selectedTypes,
        thcRange,
        reviewStatsByProduct,
        sortByViews,
        viewStatsByProduct,
    ]);

    const resetFilters = () => {
        setSelectedTypes([]);
        setSelectedProductForms([]);
        setThcRange([0, 35]);
        setCbdRange([0, 30]);
        setSelectedTastes([]);
        setSelectedGrowers([]);
        setSelectedPositiveEffects([]);
        setOnlyLiked(false);
        setOnlyWithReviews(false);
        setMinimumRating(0);
    };

    useEffect(() => {
        setVisibleCount(24);
    }, [searchTerm, selectedTypes, selectedProductForms, thcRange, cbdRange, selectedTastes, selectedGrowers, selectedPositiveEffects, onlyLiked, onlyWithReviews, minimumRating]);

    const displayedProducts = showFilters && limit === undefined
        ? filteredProducts.slice(0, visibleCount)
        : filteredProducts;

    useEffect(() => {
        const button = loadMoreRef.current;
        if (!button || !("IntersectionObserver" in window)) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setVisibleCount((current) => Math.min(current + 24, filteredProducts.length));
                }
            },
            { rootMargin: "240px" }
        );
        observer.observe(button);
        return () => observer.disconnect();
    }, [filteredProducts.length, visibleCount]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    const filterControls = (
        <>
            <Typography variant="subtitle2">Soort product</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
                {[
                    ["Wiet", ["Wiet"]],
                    ["Hasj", ["Hasj"]],
                    ["Joints", ["Joints Wiet", "Joints Hasj"]],
                    ["Edibles", ["Edibles"]],
                ].map(([label, forms]) => {
                    const values = forms as string[];
                    const selected = values.every((value) => selectedProductForms.includes(value));
                    return (
                        <Chip
                            key={label as string}
                            label={label as string}
                            color={selected ? "success" : "default"}
                            onClick={() => setSelectedProductForms((current) => selected
                                ? current.filter((value) => !values.includes(value))
                                : Array.from(new Set([...current, ...values])))}
                        />
                    );
                })}
            </Stack>

            <Typography variant="subtitle2">Type</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
                {allTypes.map((type) => (
                    <Chip
                        key={type}
                        label={type}
                        color={selectedTypes.includes(type) ? "success" : "default"}
                        onClick={() =>
                            setSelectedTypes((prev) =>
                                prev.includes(type)
                                    ? prev.filter((item) => item !== type)
                                    : [...prev, type]
                            )
                        }
                    />
                ))}
            </Stack>

            <Typography variant="subtitle2">THC range</Typography>
            <Slider
                value={thcRange}
                onChange={(_, value) => setThcRange(value as [number, number])}
                valueLabelDisplay="auto"
                min={0}
                max={35}
                sx={{ mb: 2 }}
            />

            <Typography variant="subtitle2">CBD range</Typography>
            <Slider
                value={cbdRange}
                onChange={(_, value) => setCbdRange(value as [number, number])}
                valueLabelDisplay="auto"
                min={0}
                max={30}
                sx={{ mb: 2 }}
            />

            <Typography variant="subtitle2">Smaken</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
                {allTastes.map((taste) => (
                    <Chip
                        key={taste}
                        label={taste}
                        color={selectedTastes.includes(taste) ? "success" : "default"}
                        onClick={() =>
                            setSelectedTastes((prev) =>
                                prev.includes(taste)
                                    ? prev.filter((item) => item !== taste)
                                    : [...prev, taste]
                            )
                        }
                    />
                ))}
            </Stack>

            <Typography variant="subtitle2">Telers</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
                {allGrowers.map((grower) => (
                    <Chip
                        key={grower}
                        label={grower}
                        color={selectedGrowers.includes(grower) ? "success" : "default"}
                        onClick={() =>
                            setSelectedGrowers((prev) =>
                                prev.includes(grower)
                                    ? prev.filter((item) => item !== grower)
                                    : [...prev, grower]
                            )
                        }
                    />
                ))}
            </Stack>

            <Typography variant="subtitle2">Positieve effecten</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
                {allPositiveEffects.map((effect) => (
                    <Chip
                        key={effect}
                        label={effect}
                        color={selectedPositiveEffects.includes(effect) ? "success" : "default"}
                        onClick={() =>
                            setSelectedPositiveEffects((prev) =>
                                prev.includes(effect)
                                    ? prev.filter((item) => item !== effect)
                                    : [...prev, effect]
                            )
                        }
                    />
                ))}
            </Stack>

            <Typography variant="subtitle2">Minimale beoordeling</Typography>
            <Slider
                value={minimumRating}
                onChange={(_, value) => setMinimumRating(value as number)}
                valueLabelDisplay="auto"
                min={0}
                max={5}
                step={0.5}
                sx={{ mb: 1 }}
            />

            <FormControlLabel
                control={
                    <Switch
                        checked={onlyWithReviews}
                        onChange={(event) => setOnlyWithReviews(event.target.checked)}
                    />
                }
                label="Alleen soortjes met reviews"
            />
            <FormControlLabel
                control={
                    <Switch
                        checked={onlyLiked}
                        onChange={(event) => setOnlyLiked(event.target.checked)}
                    />
                }
                label="Alleen mijn likes"
            />
            {onlyLiked && !profile && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Log in om op likes te filteren.
                </Alert>
            )}

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button variant="outlined" onClick={resetFilters}>
                    Reset
                </Button>
                {!isDesktop && (
                    <Button variant="contained" onClick={() => setFilterOpen(false)}>
                        Toepassen ({filteredProducts.length})
                    </Button>
                )}
            </Stack>
        </>
    );

    return (
        <>
            {showFilters && (
                <Box sx={{ px: 1, mb: 1, position: "sticky", top: 0, zIndex: 2, background: "#fff" }}>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Zoek op soortje, teler of omschrijving"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                        {!isDesktop && (
                            <Button variant="outlined" startIcon={<TuneIcon />} onClick={() => setFilterOpen(true)}>
                                Filters
                            </Button>
                        )}
                        {isDesktop && (
                            <Button variant="outlined" startIcon={<TuneIcon />} onClick={() => setDesktopFiltersVisible((prev) => !prev)}>
                                {desktopFiltersVisible ? "Filters verbergen" : "Filters tonen"}
                            </Button>
                        )}
                    </Stack>
                    {(onlyLiked || onlyWithReviews || minimumRating > 0 || selectedTypes.length > 0 || selectedProductForms.length > 0) && (
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {filteredProducts.length} resultaten met actieve filters
                        </Typography>
                    )}
                </Box>
            )}

            {showFilters && isDesktop ? (
                <Box sx={{ width: "100%", display: "grid", gridTemplateColumns: desktopFiltersVisible ? "1fr 3fr" : "1fr", gap: 2 }}>
                    {desktopFiltersVisible && (
                        <Card sx={{ alignSelf: "start", position: "sticky", top: 96, maxHeight: "calc(100vh - 112px)", overflowY: "auto", overscrollBehavior: "contain" }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                                    Filters
                                </Typography>
                                {filterControls}
                            </CardContent>
                        </Card>
                    )}
                    <Box
                        sx={{
                            width: "100%",
                            display: "grid",
                            gap: 2,
                            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        }}
                    >
                        {displayedProducts.map((product) => (
                            <div key={`productcontainer-${product.id}`} style={{ minWidth: 0 }}>
                                <ProductCard
                                    key={`productcard-${product.id}`}
                                    product={{
                                        ...product.data,
                                        rating: reviewStatsByProduct[product.data.shortcode]?.rating ?? product.data.rating,
                                    }}
                                    reviewCount={reviewStatsByProduct[product.data.shortcode]?.count ?? 0}
                                />
                            </div>
                        ))}
                        {filteredProducts.length === 0 && (
                            <Typography sx={{ m: 2, color: "text.secondary" }}>
                                Geen resultaten met deze filters.
                            </Typography>
                        )}
                    </Box>
                </Box>
            ) : (
                <Box
                    sx={
                        carouselOnMobile
                            ? {
                                width: "100%",
                                display: { xs: "flex", md: "grid" },
                                overflowX: { xs: "auto", md: "visible" },
                                gap: { xs: 1.25, md: 2 },
                                gridTemplateColumns: { md: "repeat(4, minmax(0, 1fr))" },
                                pb: { xs: 1, md: 0 },
                            }
                            : {
                                width: "100%",
                                display: "grid",
                                gap: { xs: 1, sm: 1.5, md: 2 },
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    sm: "repeat(2, minmax(0, 1fr))",
                                    md: "repeat(3, minmax(0, 1fr))",
                                    lg: "repeat(4, minmax(0, 1fr))",
                                },
                            }
                    }
                >
                    {displayedProducts.map((product) => (
                        <div
                            key={`productcontainer-${product.id}`}
                            style={{ minWidth: carouselOnMobile ? 280 : 0, flex: carouselOnMobile ? "0 0 280px" : undefined }}
                        >
                            <ProductCard
                                key={`productcard-${product.id}`}
                                product={{
                                    ...product.data,
                                    rating: reviewStatsByProduct[product.data.shortcode]?.rating ?? product.data.rating,
                                }}
                                reviewCount={reviewStatsByProduct[product.data.shortcode]?.count ?? 0}
                            />
                        </div>
                    ))}
                    {filteredProducts.length === 0 && (
                        <Typography sx={{ m: 2, color: "text.secondary" }}>
                            Geen resultaten met deze filters.
                        </Typography>
                    )}
                </Box>
            )}

            {displayedProducts.length < filteredProducts.length && (
                <Button
                    ref={loadMoreRef}
                    variant="outlined"
                    onClick={() => setVisibleCount((current) => Math.min(current + 24, filteredProducts.length))}
                    sx={{ display: "flex", mx: "auto", mt: 2, minHeight: 44 }}
                >
                    Meer producten laden
                </Button>
            )}

            <Drawer
                anchor="bottom"
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                PaperProps={{ sx: { maxHeight: "92dvh", borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}
            >
                <Box sx={{ p: 2, pb: 4, overflowY: "auto", overscrollBehavior: "contain" }} role="dialog" aria-label="Productfilters">
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                        Filters
                    </Typography>
                    {filterControls}
                </Box>
            </Drawer>
        </>
    );
};

export default ProductenPerMerk;
