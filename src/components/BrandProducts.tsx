import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Drawer,
    FormControlLabel,
    Slider,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import { DocumentReference, collection, getDoc, onSnapshot } from "firebase/firestore";
import { productCollectionRef } from "../firebaseCollections";
import { ProductType } from "../types/product";
import { GrowerType } from "../types/grower";
import { EffectType } from "../types/effect";
import { TerpeneType } from "../types/terpene";
import { TasteType } from "../types/taste";
import ProductCard from "./ProductCard";
import { db } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";

interface BrandProps {
    brandId?: string;
    limit?: number;
    showFilters?: boolean;
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

const ProductenPerMerk = ({ brandId, limit, showFilters = false }: BrandProps) => {
    const { profile } = useAuth();
    const [producten, setProducten] = useState<ProductItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterOpen, setFilterOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [thcRange, setThcRange] = useState<[number, number]>([0, 35]);
    const [cbdRange, setCbdRange] = useState<[number, number]>([0, 30]);
    const [selectedTastes, setSelectedTastes] = useState<string[]>([]);
    const [selectedGrowers, setSelectedGrowers] = useState<string[]>([]);
    const [selectedPositiveEffects, setSelectedPositiveEffects] = useState<string[]>([]);
    const [onlyLiked, setOnlyLiked] = useState(false);
    const [onlyWithReviews, setOnlyWithReviews] = useState(false);
    const [minimumRating, setMinimumRating] = useState(0);

    const [reviewedProductCodes, setReviewedProductCodes] = useState<Set<string>>(new Set());

    useEffect(() => {
        const unsubscribeReviews = onSnapshot(collection(db, "reviews"), (snapshot) => {
            const codes = snapshot.docs
                .map((docItem) => docItem.data().productShortcode as string | undefined)
                .filter((code): code is string => Boolean(code));
            setReviewedProductCodes(new Set(codes));
        });

        return () => unsubscribeReviews();
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
                if (limit !== undefined && limit > 0) {
                    setProducten(validProducts.slice(0, limit));
                } else {
                    setProducten(validProducts);
                }
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
    }, [brandId, limit]);

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

        return producten.filter(({ data }) => {
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

            if (minimumRating > 0 && data.rating < minimumRating) {
                return false;
            }

            return true;
        });
    }, [
        cbdRange,
        minimumRating,
        onlyLiked,
        onlyWithReviews,
        producten,
        profile?.likedProducts,
        reviewedProductCodes,
        searchTerm,
        selectedGrowers,
        selectedPositiveEffects,
        selectedTastes,
        selectedTypes,
        thcRange,
    ]);

    const resetFilters = () => {
        setSelectedTypes([]);
        setThcRange([0, 35]);
        setCbdRange([0, 30]);
        setSelectedTastes([]);
        setSelectedGrowers([]);
        setSelectedPositiveEffects([]);
        setOnlyLiked(false);
        setOnlyWithReviews(false);
        setMinimumRating(0);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

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
                        <Button variant="outlined" startIcon={<TuneIcon />} onClick={() => setFilterOpen(true)}>
                            Filters
                        </Button>
                    </Stack>
                    {(onlyLiked || onlyWithReviews || minimumRating > 0 || selectedTypes.length > 0) && (
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {filteredProducts.length} resultaten met actieve filters
                        </Typography>
                    )}
                </Box>
            )}

            <div style={{ width: "100%", overflow: "auto", display: "flex", flexWrap: showFilters ? "wrap" : "nowrap" }}>
                {filteredProducts.map((product) => (
                    <div key={`productcontainer-${product.id}`} style={{ minWidth: 350, height: 500, margin: 16 }}>
                        <ProductCard key={`productcard-${product.id}`} product={product.data} />
                    </div>
                ))}
                {filteredProducts.length === 0 && (
                    <Typography sx={{ m: 2, color: "text.secondary" }}>
                        Geen resultaten met deze filters.
                    </Typography>
                )}
            </div>

            <Drawer anchor="bottom" open={filterOpen} onClose={() => setFilterOpen(false)}>
                <Box sx={{ p: 2, pb: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                        Filters
                    </Typography>

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
                        <Button variant="contained" onClick={() => setFilterOpen(false)}>
                            Toepassen ({filteredProducts.length})
                        </Button>
                    </Stack>
                </Box>
            </Drawer>
        </>
    );
};

export default ProductenPerMerk;
