import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import MuiRating from "@mui/material/Rating";
import LocalParkingIcon from "@mui/icons-material/LocalParking";
import BadgeIcon from "@mui/icons-material/Badge";
import AccessibleIcon from "@mui/icons-material/Accessible";
import DriveEtaIcon from "@mui/icons-material/DriveEta";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import StorefrontIcon from "@mui/icons-material/Storefront";
import VerifiedIcon from "@mui/icons-material/Verified";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import RouteIcon from "@mui/icons-material/Route";
import ShareIcon from "@mui/icons-material/Share";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useNavigate, useParams } from "react-router-dom";
import { onSnapshot, doc, setDoc, serverTimestamp, deleteDoc, runTransaction } from "firebase/firestore";
import GrowerCard from "./components/GrowerCard";
import ProductCard from "./components/ProductCard";
import ShopCard from "./components/ShopCard";
import {
    brandCollectionRef,
    gebruikersCollectionRef,
    productCollectionRef,
    reviewsCollectionRef,
    shopCollectionRef,
} from "./firebaseCollections";
import { GrowerType } from "./types/grower";
import { ProductType } from "./types/product";
import { ShopType } from "./types/shop";
import { ProductReview, UserProfile } from "./types/user";
import "./Shop.css";
import { incrementEntityView } from "./services/viewStats";
import ReviewCard from "./components/ReviewCard";
import { ReviewReactionValue, setReviewReaction } from "./services/reviewReactions";
import { useAuth } from "./context/AuthContext";
import { aggregateProductReviewStats, buildProductAliasMap } from "./utils/reviewStats";
import { db } from "./firebaseConfig";
import { buildShopPath, slugifySegment } from "./utils/shopRouting";
import { getShopOpenState } from "./utils/shopOpenStatus";
import { shareLink } from "./services/share";

type ShopReviewDoc = ProductReview & {
    targetType?: string;
    shopShortcode?: string;
    targetTenantId?: string;
    source?: string;
    externalRef?: string;
    graphqlSync?: {
        status?: string;
        sentAt?: unknown;
    };
};

function toFiniteNumber(value: unknown): number | null {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const parsed = Number.parseFloat(value.replace(",", "."));
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function hasValidCoordinates(lat: unknown, lng: unknown): boolean {
    const latNumber = toFiniteNumber(lat);
    const lngNumber = toFiniteNumber(lng);
    return latNumber !== null && lngNumber !== null && Math.abs(latNumber) > 0 && Math.abs(lngNumber) > 0;
}

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item || "").trim()).filter(Boolean);
}

type OpeningDay = {
    day: string;
    open?: string;
    close?: string;
    closed?: boolean;
};

function normalizeDayLabel(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function distanceInKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const radius = 6371.071;
    const rlat1 = aLat * (Math.PI / 180);
    const rlat2 = bLat * (Math.PI / 180);
    const difflat = rlat2 - rlat1;
    const difflon = (bLng - aLng) * (Math.PI / 180);

    return (
        2 *
        radius *
        Math.asin(
            Math.sqrt(
                Math.sin(difflat / 2) * Math.sin(difflat / 2) +
                    Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)
            )
        )
    );
}

export default function PageShop() {
    const params = useParams<{ "*": string }>();
    const navigate = useNavigate();
    const wildcard = String(params["*"] || "").replace(/^\/+|\/+$/g, "");
    const pathSegments = wildcard ? wildcard.split("/") : [];
    const firstSegment = pathSegments[0] || "";
    const secondSegment = pathSegments[1] || "";
    const requestedProvinceSlug = slugifySegment(firstSegment);
    const requestedShopcode = slugifySegment(secondSegment || firstSegment);
    const hasExplicitProvinceAndShop = Boolean(firstSegment && secondSegment);
    const { user, profile, isShopLiked, toggleShopLike } = useAuth();

    const [shops, setShops] = useState<ShopType[]>([]);
    const [products, setProducts] = useState<ProductType[]>([]);
    const [growers, setGrowers] = useState<GrowerType[]>([]);
    const [reviews, setReviews] = useState<ShopReviewDoc[]>([]);
    const [users, setUsers] = useState<Record<string, UserProfile>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [shopReviewRating, setShopReviewRating] = useState<number>(4);
    const [shopReviewText, setShopReviewText] = useState("");
    const [savingReview, setSavingReview] = useState(false);
    const [removingReview, setRemovingReview] = useState(false);
    const [headerImages, setHeaderImages] = useState<string[]>([]);
    const [activeHeaderImageIndex, setActiveHeaderImageIndex] = useState(0);
    const [routeMenuAnchorEl, setRouteMenuAnchorEl] = useState<HTMLElement | null>(null);
    const [claimModalOpen, setClaimModalOpen] = useState(false);
    const [claimName, setClaimName] = useState("");
    const [claimEmail, setClaimEmail] = useState("");
    const [claimNote, setClaimNote] = useState("");
    const [claimSubmitting, setClaimSubmitting] = useState(false);
    const [claimError, setClaimError] = useState<string | null>(null);
    const [hasExistingClaim, setHasExistingClaim] = useState(false);

    useEffect(() => {
        if (!requestedShopcode) return;
        void incrementEntityView("shop", requestedShopcode).catch((viewError) => {
            console.warn("Winkel view kon niet opgeslagen worden.", viewError);
        });
    }, [requestedShopcode]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [requestedShopcode]);

    useEffect(() => {
        const unsubs: Array<() => void> = [];

        unsubs.push(
            onSnapshot(shopCollectionRef, (snapshot) => {
                const docs =
                    snapshot.docs.some((item) => item.data()?.source === "graphql")
                        ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                        : snapshot.docs;
                setShops(docs.map((item) => item.data() as ShopType));
                setLoading(false);
            })
        );

        unsubs.push(
            onSnapshot(productCollectionRef, (snapshot) => {
                const docs =
                    snapshot.docs.some((item) => item.data()?.source === "graphql")
                        ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                        : snapshot.docs;
                setProducts(docs.map((item) => item.data() as ProductType));
            })
        );

        unsubs.push(
            onSnapshot(brandCollectionRef, (snapshot) => {
                const docs =
                    snapshot.docs.some((item) => item.data()?.source === "graphql")
                        ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                        : snapshot.docs;
                setGrowers(docs.map((item) => item.data() as GrowerType));
            })
        );

        unsubs.push(
            onSnapshot(reviewsCollectionRef, (snapshot) => {
                setReviews(
                    snapshot.docs.map((item) => ({
                        id: item.id,
                        ...(item.data() as Omit<ShopReviewDoc, "id">),
                    }))
                );
            })
        );

        unsubs.push(
            onSnapshot(gebruikersCollectionRef, (snapshot) => {
                const map: Record<string, UserProfile> = {};
                snapshot.docs.forEach((item) => {
                    const data = item.data() as UserProfile;
                    const uid = data.uid || item.id;
                    map[uid] = { ...data, uid };
                });
                setUsers(map);
            })
        );

        return () => {
            unsubs.forEach((unsubscribe) => unsubscribe());
        };
    }, []);

    const selectedShop = useMemo(() => {
        if (!requestedShopcode) return undefined;
        if (hasExplicitProvinceAndShop) {
            return shops.find(
                (shop) =>
                    slugifySegment(shop.shortcode || "") === requestedShopcode &&
                    slugifySegment(shop.province || "") === requestedProvinceSlug
            );
        }

        const asLegacy = shops.find((shop) => slugifySegment(shop.shortcode || "") === requestedShopcode);
        if (asLegacy) return asLegacy;

        return shops.find(
            (shop) =>
                slugifySegment(shop.shortcode || "") === requestedShopcode &&
                slugifySegment(shop.province || "") === requestedProvinceSlug
        );
    }, [hasExplicitProvinceAndShop, requestedProvinceSlug, requestedShopcode, shops]);

    const provinceShops = useMemo(() => {
        if (hasExplicitProvinceAndShop || !requestedProvinceSlug) return [];
        return shops
            .filter((shop) => slugifySegment(shop.province || "") === requestedProvinceSlug)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [hasExplicitProvinceAndShop, requestedProvinceSlug, shops]);
    const selectedShopCoords = useMemo(() => {
        if (!selectedShop) {
            return { lat: null as number | null, lng: null as number | null };
        }
        const source = selectedShop as unknown as Record<string, unknown>;
        return {
            lat: toFiniteNumber(source.lat ?? source.latitude),
            lng: toFiniteNumber(source.lng ?? source.longitude),
        };
    }, [selectedShop]);
    const openState = useMemo(() => (selectedShop ? getShopOpenState(selectedShop) : { isOpen: null, label: "Onbekend" }), [selectedShop]);

    const nearbyShops = useMemo(() => {
        if (!selectedShop) return [];
        if (!hasValidCoordinates(selectedShopCoords.lat, selectedShopCoords.lng)) return [];
        const currentProvince = String(selectedShop.province || "").trim().toLowerCase();
        if (!currentProvince) return [];

        return shops
            .filter((shop) => {
                if (!shop.shortcode || shop.shortcode === selectedShop.shortcode) return false;
                const province = String(shop.province || "").trim().toLowerCase();
                if (!province || province !== currentProvince) return false;
                return hasValidCoordinates(shop.lat, shop.lng);
            })
            .map((shop) => ({
                shop,
                distance: distanceInKm(
                    selectedShopCoords.lat as number,
                    selectedShopCoords.lng as number,
                    Number(shop.lat),
                    Number(shop.lng)
                ),
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 10)
            .map((item) => item.shop);
    }, [selectedShop, selectedShopCoords.lat, selectedShopCoords.lng, shops]);

    useEffect(() => {
        if (!selectedShop) return;
        if (hasExplicitProvinceAndShop) return;
        const canonical = buildShopPath(selectedShop);
        const current = `/cannabis-winkel/${wildcard}`.replace(/\/+$/g, "");
        if (canonical && canonical !== current) {
            navigate(canonical, { replace: true });
        }
    }, [hasExplicitProvinceAndShop, navigate, selectedShop, wildcard]);

    useEffect(() => {
        if (!selectedShop?.shortcode) {
            setHasExistingClaim(false);
            return;
        }

        const claimRef = doc(db, "ShopClaims", selectedShop.shortcode);
        const unsubscribe = onSnapshot(claimRef, (snapshot) => {
            setHasExistingClaim(snapshot.exists());
        });

        return () => unsubscribe();
    }, [selectedShop?.shortcode]);

    const headerImageCandidates = useMemo(() => {
        if (!selectedShop) return [];
        const source = selectedShop as Record<string, unknown>;
        const nestedImages = source.images && typeof source.images === "object" ? (source.images as Record<string, unknown>) : {};

        const list = [
            selectedShop.logo,
            String(source.heroImage ?? ""),
            String(source.coverImage ?? ""),
            String(source.image ?? ""),
            ...asStringArray(source.gallery),
            String(nestedImages.logo ?? ""),
            String(nestedImages.overview ?? ""),
            String(nestedImages.close ?? ""),
            String(nestedImages.mood ?? ""),
        ];

        return Array.from(new Set(list.map((item) => item.trim()).filter(Boolean)));
    }, [selectedShop]);

    useEffect(() => {
        let cancelled = false;
        const resolveImages = async () => {
            if (!headerImageCandidates.length) {
                setHeaderImages([]);
                setActiveHeaderImageIndex(0);
                return;
            }

            // Shop media has no public VerdiQ relationship in the current contract.
            const next: string[] = [];
            if (!cancelled) {
                setHeaderImages(next);
                setActiveHeaderImageIndex(0);
            }
        };

        void resolveImages();
        return () => {
            cancelled = true;
        };
    }, [headerImageCandidates]);

    const openingDays = useMemo<OpeningDay[]>(() => {
        if (!selectedShop) return [];
        const source = selectedShop as unknown as Record<string, unknown>;
        const openingHours = source.openingHours && typeof source.openingHours === "object" ? source.openingHours as Record<string, unknown> : {};
        const daysRaw = Array.isArray(openingHours.days) ? openingHours.days : [];
        if (daysRaw.length > 0) {
            return daysRaw
                .map((entry) => {
                    const item = entry as Record<string, unknown>;
                    return {
                        day: String(item.day || "").trim(),
                        open: String(item.open || "").trim(),
                        close: String(item.close || "").trim(),
                        closed: Boolean(item.closed),
                    };
                })
                .filter((item) => item.day);
        }

        const fallbackOpen = String(selectedShop.openFrom || "").trim();
        const fallbackClose = String(selectedShop.openTill || "").trim();
        if (!fallbackOpen && !fallbackClose) return [];

        const weekdays = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
        return weekdays.map((day) => ({
            day,
            open: fallbackOpen,
            close: fallbackClose,
            closed: false,
        }));
    }, [selectedShop]);
    const currentWeekdayKey = useMemo(() => normalizeDayLabel(new Intl.DateTimeFormat("nl-NL", { weekday: "long" }).format(new Date())), []);

    const shopProducts = useMemo(() => {
        if (!selectedShop) return [];
        const productIds = new Set(selectedShop.products ?? []);
        return products.filter((product) => productIds.has(product.id));
    }, [products, selectedShop]);

    const shopGrowers = useMemo(() => {
        if (!selectedShop) return [];

        const growerIds = new Set<number>(selectedShop.growers ?? []);
        if (growerIds.size === 0) {
            shopProducts.forEach((product) => growerIds.add(product.grower));
        }
        return growers.filter((grower) => growerIds.has(grower.id));
    }, [growers, selectedShop, shopProducts]);

    const productAliasMap = useMemo(() => buildProductAliasMap(products), [products]);

    const shopProductReviews = useMemo(() => {
        const aliasMap = buildProductAliasMap(shopProducts);
        const productCodes = new Set(shopProducts.map((product) => product.shortcode));
        return reviews.filter((review) => {
            const canonicalCode = aliasMap.get(review.productShortcode) || review.productShortcode;
            return productCodes.has(canonicalCode);
        });
    }, [reviews, shopProducts]);

    const shopDirectReviews = useMemo(() => {
        if (!selectedShop) return [];
        return reviews.filter(
            (review) =>
                (review.targetType || "").toLowerCase() === "company" &&
                (review.shopShortcode || "").toLowerCase() === selectedShop.shortcode.toLowerCase()
        );
    }, [reviews, selectedShop]);

    const allShopReviews = useMemo(() => {
        const map = new Map<string, ShopReviewDoc>();
        shopDirectReviews.forEach((review) => map.set(review.id, review));
        shopProductReviews.forEach((review) => map.set(review.id, review));
        return Array.from(map.values());
    }, [shopDirectReviews, shopProductReviews]);

    const myShopReview = useMemo(() => {
        if (!user || !selectedShop) return null;
        return (
            shopDirectReviews.find((review) => review.userId === user.uid) ||
            null
        );
    }, [shopDirectReviews, selectedShop, user]);

    useEffect(() => {
        if (myShopReview) {
            setShopReviewRating(myShopReview.rating || 4);
            setShopReviewText(myShopReview.review || "");
            return;
        }
        setShopReviewRating(4);
        setShopReviewText("");
    }, [myShopReview]);

    const productsByShortcode = useMemo(() => new Map(products.map((product) => [product.shortcode, product])), [products]);
    const reviewStatsByProduct = useMemo(() => aggregateProductReviewStats(reviews, products), [products, reviews]);

    const averageReview = useMemo(() => {
        if (!allShopReviews.length) return 0;
        const total = allShopReviews.reduce((sum, item) => sum + item.rating, 0);
        return Math.round((total / allShopReviews.length) * 10) / 10;
    }, [allShopReviews]);

    const statusColor = (value: boolean) => (value ? "success.main" : "error.main");

    const featureIcons = (shop: ShopType, size = 22) => (
        <Stack direction="row" spacing={1.2} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
            <Tooltip title={shop.allowForeigns ? "Iedereen welkom" : "Alleen NL ID"}>
                <BadgeIcon sx={{ color: statusColor(shop.allowForeigns), fontSize: size }} />
            </Tooltip>
            <Tooltip title={shop.disabled ? "Toegankelijk voor minder validen" : "Niet toegankelijk"}>
                <AccessibleIcon sx={{ color: statusColor(shop.disabled), fontSize: size }} />
            </Tooltip>
            <Tooltip title={shop.drive ? "Drive-thru" : "Geen drive-thru"}>
                <DriveEtaIcon sx={{ color: statusColor(shop.drive), fontSize: size }} />
            </Tooltip>
            <Tooltip title={shop.easyParking ? "Makkelijk parkeren" : "Parkeren beperkt"}>
                <LocalParkingIcon sx={{ color: statusColor(shop.easyParking), fontSize: size }} />
            </Tooltip>
            <Tooltip title={shop.payByCard ? "Pinnen mogelijk" : "Alleen cash"}>
                <CreditCardIcon sx={{ color: statusColor(shop.payByCard), fontSize: size }} />
            </Tooltip>
            <Tooltip title={shop.pickup ? "Afhalen" : "Binnen verblijven"}>
                <StorefrontIcon sx={{ color: statusColor(shop.pickup), fontSize: size }} />
            </Tooltip>
        </Stack>
    );

    const handleReviewReaction = async (reviewId: string, reaction: ReviewReactionValue) => {
        if (!user || !navigator.onLine) return;
        try {
            await setReviewReaction(reviewId, user.uid, reaction);
        } catch (reactionError) {
            console.warn("Review-reactie kon niet opgeslagen worden.", reactionError);
        }
    };

    const handleShareShop = async () => {
        if (!selectedShop) return;
        const result = await shareLink({
            title: selectedShop.name,
            text: `Bekijk ${selectedShop.name}`,
            url: `${window.location.origin}${buildShopPath(selectedShop)}`,
        });
        if (result === "copied") {
            window.alert("Link gekopieerd.");
        }
    };

    const handleToggleShopLike = async () => {
        if (!selectedShop?.shortcode) return;
        if (!user) {
            navigate("/login");
            return;
        }
        try {
            await toggleShopLike(selectedShop.shortcode);
        } catch (toggleError) {
            const message = toggleError instanceof Error ? toggleError.message : "Winkel liken mislukt.";
            setError(message);
        }
    };

    const handleRouteSelect = (provider: "google" | "waze") => {
        if (!selectedShop || !hasValidCoordinates(selectedShopCoords.lat, selectedShopCoords.lng)) {
            setRouteMenuAnchorEl(null);
            return;
        }

        const destination = `${selectedShopCoords.lat},${selectedShopCoords.lng}`;
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
        const wazeWebUrl = `https://waze.com/ul?ll=${encodeURIComponent(destination)}&navigate=yes`;

        if (provider === "google") {
            window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
        } else {
            const isMobile = /android|iphone|ipad|ipod/i.test(window.navigator.userAgent);
            if (isMobile) {
                window.location.href = `waze://?ll=${destination}&navigate=yes`;
            } else {
                window.open(wazeWebUrl, "_blank", "noopener,noreferrer");
            }
        }
        setRouteMenuAnchorEl(null);
    };

    const handleOpenReviewModal = () => {
        if (!user) {
            setError("Log in om een review te plaatsen.");
            return;
        }
        setReviewModalOpen(true);
    };

    const handleOpenClaimModal = () => {
        setClaimError(null);
        setClaimModalOpen(true);
    };

    const handleSubmitClaim = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedShop?.shortcode) return;
        if (hasExistingClaim) {
            setClaimError("Er bestaat al een claim voor deze winkel.");
            return;
        }

        const name = claimName.trim();
        const email = claimEmail.trim();
        const note = claimNote.trim();
        if (!name || !email) {
            setClaimError("Naam en e-mail zijn verplicht.");
            return;
        }

        setClaimSubmitting(true);
        setClaimError(null);
        const claimRef = doc(db, "ShopClaims", selectedShop.shortcode);
        try {
            await runTransaction(db, async (transaction) => {
                const snapshot = await transaction.get(claimRef);
                if (snapshot.exists()) {
                    throw new Error("Er bestaat al een claim voor deze winkel.");
                }
                transaction.set(claimRef, {
                    shopShortcode: selectedShop.shortcode,
                    shopName: selectedShop.name,
                    shopProvince: selectedShop.province || "",
                    contactName: name,
                    contactEmail: email,
                    note,
                    status: "pending",
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            });
            setClaimModalOpen(false);
            setClaimName("");
            setClaimEmail("");
            setClaimNote("");
            setHasExistingClaim(true);
        } catch (submitError) {
            const message = submitError instanceof Error ? submitError.message : "Claim versturen mislukt.";
            setClaimError(message);
        } finally {
            setClaimSubmitting(false);
        }
    };

    const handleSaveShopReview = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedShop || !user || !profile) return;
        if (!navigator.onLine) {
            setError("Reviews plaatsen kan alleen wanneer je online bent.");
            return;
        }
        if (!shopReviewText.trim()) {
            setError("Schrijf eerst een korte review.");
            return;
        }

        setSavingReview(true);
        setError(null);
        try {
            const reviewId = `${user.uid}_shop_${selectedShop.shortcode}`;
            const reviewRef = doc(db, "reviews", reviewId);
            await setDoc(
                reviewRef,
                {
                    userId: user.uid,
                    userName: profile.displayName,
                    productShortcode: `shop-${selectedShop.shortcode}`,
                    productTitle: selectedShop.name,
                    rating: shopReviewRating,
                    review: shopReviewText.trim(),
                    shopShortcode: selectedShop.shortcode,
                    targetType: "company",
                    source: "frontend",
                    externalRef: `shop-review-${reviewId}`,
                    graphqlSync: {
                        status: "pending",
                        lastAttemptAt: null,
                    },
                    reactions: {},
                    upVotes: 0,
                    downVotes: 0,
                    updatedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                },
                { merge: true }
            );
            setReviewModalOpen(false);
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Review opslaan mislukt.";
            setError(message);
        } finally {
            setSavingReview(false);
        }
    };

    const handleDeleteShopReview = async () => {
        if (!selectedShop || !user) return;
        if (!navigator.onLine) {
            setError("Reviews verwijderen kan alleen wanneer je online bent.");
            return;
        }

        setRemovingReview(true);
        try {
            await deleteDoc(doc(db, "reviews", `${user.uid}_shop_${selectedShop.shortcode}`));
            setReviewModalOpen(false);
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : "Review verwijderen mislukt.";
            setError(message);
        } finally {
            setRemovingReview(false);
        }
    };

    if (loading) {
        return <section className="shop-container">Loading...</section>;
    }

    if (error && !selectedShop) {
        return (
            <section className="shop-container">
                <Alert severity="error">{error}</Alert>
            </section>
        );
    }

    if (!selectedShop) {
        if (!hasExplicitProvinceAndShop && requestedProvinceSlug) {
            const provinceTitle = provinceShops[0]?.province || requestedProvinceSlug;
            return (
                <section className="shop-container" style={{ textAlign: "left", margin: 20, paddingBottom: 90 }}>
                    <Typography component="h1" variant="h5" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                        Winkels in {provinceTitle}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                        Overzicht van alle cannabis-winkels in deze provincie.
                    </Typography>
                    {provinceShops.length === 0 ? (
                        <Alert severity="warning">Geen winkels gevonden voor deze provincie.</Alert>
                    ) : (
                        <Box
                            sx={{
                                display: "grid",
                                gap: 2,
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    sm: "repeat(2, minmax(0, 1fr))",
                                    md: "repeat(3, minmax(0, 1fr))",
                                },
                            }}
                        >
                            {provinceShops.map((shop) => (
                                <ShopCard key={shop.shortcode || shop.id} shop={shop} />
                            ))}
                        </Box>
                    )}
                </section>
            );
        }

        return (
            <section className="shop-container" style={{ textAlign: "left", margin: 30 }}>
                <Alert severity="warning">Deze cannabis-winkel is nog niet beschikbaar in de actuele dataset.</Alert>
            </section>
        );
    }

    const activeHeaderImage = headerImages[activeHeaderImageIndex] || headerImages[0] || "";
    const mapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    const staticMapUrl =
        hasValidCoordinates(selectedShopCoords.lat, selectedShopCoords.lng) && mapsApiKey
            ? `https://maps.googleapis.com/maps/api/staticmap?center=${selectedShopCoords.lat},${selectedShopCoords.lng}&zoom=14&size=1200x500&scale=2&maptype=roadmap&markers=color:green%7C${selectedShopCoords.lat},${selectedShopCoords.lng}&key=${mapsApiKey}`
            : "";

    return (
        <section className="shop-container" style={{ textAlign: "left", margin: 20, paddingBottom: 90 }}>
            {error && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Card sx={{ mb: 2 }}>
                {activeHeaderImage && (
                    <Box
                        component="img"
                        src={activeHeaderImage}
                        alt={selectedShop.name}
                        sx={{ width: "100%", maxHeight: { xs: 220, md: 360 }, objectFit: "cover" }}
                    />
                )}
                {!!headerImages.length && (
                    <Box sx={{ display: "flex", gap: 1, px: 1.5, py: 1, overflowX: "auto", borderBottom: "1px solid #eceff0" }}>
                        {headerImages.map((image, index) => (
                            <Box
                                key={`${image}-${index}`}
                                component="img"
                                src={image}
                                alt={`${selectedShop.name} ${index + 1}`}
                                onClick={() => setActiveHeaderImageIndex(index)}
                                sx={{
                                    width: 72,
                                    height: 52,
                                    borderRadius: 1,
                                    objectFit: "cover",
                                    cursor: "pointer",
                                    border: index === activeHeaderImageIndex ? "2px solid #2e7d32" : "1px solid #d6d9dc",
                                }}
                            />
                        ))}
                    </Box>
                )}
                <CardContent>
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
                        <Box>
                            <Typography component="h1" variant="h5" sx={{ color: "text.secondary", fontWeight: 700, display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap" }}>
                                {selectedShop.name}
                                {selectedShop.isApproved && <VerifiedIcon fontSize="small" color="success" />}
                                <Chip
                                    size="small"
                                    label={openState.label}
                                    color={openState.isOpen === null ? "default" : (openState.isOpen ? "success" : "error")}
                                    sx={{ fontWeight: 700, display: { xs: "none", sm: "inline-flex" } }}
                                />
                            </Typography>
                            <Chip
                                size="small"
                                label={openState.label}
                                color={openState.isOpen === null ? "default" : (openState.isOpen ? "success" : "error")}
                                sx={{ fontWeight: 700, mt: 0.6, display: { xs: "inline-flex", sm: "none" } }}
                            />
                            {!selectedShop.isApproved && (
                                <Typography
                                    variant="caption"
                                    sx={{ color: hasExistingClaim ? "text.disabled" : "success.main", cursor: hasExistingClaim ? "default" : "pointer", display: "inline-block", mt: 0.4 }}
                                    onClick={() => {
                                        if (!hasExistingClaim) {
                                            handleOpenClaimModal();
                                        }
                                    }}
                                >
                                    {hasExistingClaim ? "Claim al ingediend" : "Ik ben de coffeeshop eigenaar"}
                                </Typography>
                            )}
                            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.6, mb: 1 }}>
                                {selectedShop.description || "Geen omschrijving beschikbaar."}
                            </Typography>
                            {openingDays.length > 0 ? (
                                <Box sx={{ mb: 1 }}>
                                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700, mb: 0.5 }}>
                                        Openingstijden
                                    </Typography>
                                    <Stack spacing={0.3}>
                                        {openingDays.map((item) => (
                                            <Box
                                                key={item.day}
                                                sx={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    gap: 2,
                                                    px: 0.8,
                                                    py: 0.35,
                                                    borderRadius: 1,
                                                    bgcolor:
                                                        normalizeDayLabel(item.day) === currentWeekdayKey
                                                            ? item.closed
                                                                ? "rgba(211, 47, 47, 0.12)"
                                                                : "rgba(46, 125, 50, 0.12)"
                                                            : "transparent",
                                                }}
                                            >
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color:
                                                            normalizeDayLabel(item.day) === currentWeekdayKey
                                                                ? (item.closed ? "error.main" : "success.main")
                                                                : "text.secondary",
                                                        fontWeight: normalizeDayLabel(item.day) === currentWeekdayKey ? 700 : 500,
                                                    }}
                                                >
                                                    {item.day}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color:
                                                            normalizeDayLabel(item.day) === currentWeekdayKey
                                                                ? (item.closed ? "error.main" : "success.main")
                                                                : "text.secondary",
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    {item.closed ? "Gesloten" : `${item.open || "-"} - ${item.close || "-"}`}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            ) : (
                                <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                                    Openingstijden niet beschikbaar.
                                </Typography>
                            )}
                            {featureIcons(selectedShop, 22)}
                        </Box>
                        <Stack
                            direction="column"
                            alignItems="flex-end"
                            justifyContent={{ xs: "flex-start", md: "space-between" }}
                            sx={{
                                width: { xs: "100%", md: "auto" },
                                minWidth: { md: 210 },
                                mt: { xs: 0.5, md: 0 },
                                alignSelf: { xs: "auto", md: "stretch" },
                            }}
                        >
                            <Stack direction="row" spacing={0.4}>
                                <IconButton aria-label="share-shop" onClick={() => void handleShareShop()}>
                                    <ShareIcon />
                                </IconButton>
                                <IconButton aria-label="like-shop" onClick={() => void handleToggleShopLike()}>
                                    {isShopLiked(selectedShop.shortcode || "") ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                                </IconButton>
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: { xs: 1, md: 0 } }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<RouteIcon />}
                                    onClick={(event) => setRouteMenuAnchorEl(event.currentTarget)}
                                    disabled={!hasValidCoordinates(selectedShopCoords.lat, selectedShopCoords.lng)}
                                >
                                    Route
                                </Button>
                                <Button variant="contained" startIcon={<RateReviewOutlinedIcon />} onClick={handleOpenReviewModal}>
                                    Jouw review
                                </Button>
                            </Stack>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Typography component="h2" variant="h6" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                        Locatie
                    </Typography>
                    {staticMapUrl ? (
                        <Box component="img" src={staticMapUrl} alt={`Locatie ${selectedShop.name}`} sx={{ width: "100%", borderRadius: 1.5 }} />
                    ) : (
                        <Alert severity="info">Locatiekaart is nog niet beschikbaar voor deze winkel.</Alert>
                    )}
                    {headerImages.length > 0 && (
                        <Box sx={{ mt: 1.5 }}>
                            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700, mb: 0.8 }}>
                                Foto's van deze winkel
                            </Typography>
                            <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 0.5 }}>
                                {headerImages.map((image, index) => (
                                    <Box
                                        key={`map-gallery-${image}-${index}`}
                                        component="img"
                                        src={image}
                                        alt={`${selectedShop.name} foto ${index + 1}`}
                                        onClick={() => setActiveHeaderImageIndex(index)}
                                        sx={{
                                            width: 96,
                                            height: 72,
                                            borderRadius: 1.2,
                                            objectFit: "cover",
                                            cursor: "pointer",
                                            border: index === activeHeaderImageIndex ? "2px solid #2e7d32" : "1px solid #d6d9dc",
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}
                </CardContent>
            </Card>

            <Typography component="h2" variant="h6" sx={{ color: "text.secondary", fontWeight: 700, ml: 1 }}>
                Telers in deze winkel
            </Typography>
            <div style={{ width: "100%", overflow: "auto", display: "flex", marginBottom: 20 }}>
                {shopGrowers.length > 0 ? (
                    shopGrowers.map((grower) => (
                        <div key={`grower-${grower.id}`} style={{ minWidth: 250, height: 280, margin: 12 }}>
                            <GrowerCard grower={grower} />
                        </div>
                    ))
                ) : (
                    <Typography sx={{ m: 2, color: "text.secondary" }}>Nog geen telerinformatie beschikbaar.</Typography>
                )}
            </div>

            <Typography component="h2" variant="h6" sx={{ color: "text.secondary", fontWeight: 700, ml: 1 }}>
                Producten in deze winkel
            </Typography>
            <div style={{ width: "100%", overflow: "auto", display: "flex", marginBottom: 20 }}>
                {shopProducts.length > 0 ? (
                    shopProducts.map((product) => (
                        <div key={`product-${product.id}`} style={{ minWidth: 350, height: 500, margin: 12 }}>
                            <ProductCard
                                product={{
                                    ...product,
                                    rating: reviewStatsByProduct[product.shortcode]?.rating ?? product.rating,
                                }}
                                reviewCount={reviewStatsByProduct[product.shortcode]?.count ?? 0}
                            />
                        </div>
                    ))
                ) : (
                    <Typography sx={{ m: 2, color: "text.secondary" }}>Nog geen producten gekoppeld aan deze winkel.</Typography>
                )}
            </div>

            <Typography component="h2" variant="h6" sx={{ color: "text.secondary", fontWeight: 700, ml: 1 }}>
                Reviews ({allShopReviews.length}){allShopReviews.length > 0 ? ` • Gemiddeld ${averageReview}/5` : ""}
            </Typography>
            {allShopReviews.length === 0 ? (
                <Box sx={{ ml: 1, mt: 0.8, mb: 1.8 }}>
                    <Typography sx={{ color: "text.secondary", mb: 0.8 }}>
                        Nog geen reviews beschikbaar.
                    </Typography>
                    <Typography sx={{ color: "text.secondary", mb: 1.1 }}>
                        Help de community en plaats jouw eerlijke review.
                    </Typography>
                    <Button variant="contained" startIcon={<RateReviewOutlinedIcon />} onClick={handleOpenReviewModal}>
                        Jouw review
                    </Button>
                </Box>
            ) : (
                allShopReviews.slice(0, 10).map((review) => (
                    <Card key={review.id} sx={{ mb: 1 }}>
                        <CardContent>
                            {(() => {
                                const linkedProduct = productsByShortcode.get(review.productShortcode);
                                const growerTitle = linkedProduct?.brand?.title || "";
                                const growerLink = linkedProduct?.brand?.shortcode ? `/telers/${linkedProduct.brand.shortcode}` : undefined;
                                const isDirectShopReview = (review.targetType || "").toLowerCase() === "company";
                                return (
                                    <ReviewCard
                                        review={review}
                                        reviewerProfile={users[review.userId]}
                                        productLink={isDirectShopReview ? buildShopPath(selectedShop) : `/cannabis/${productAliasMap.get(review.productShortcode) || review.productShortcode}`}
                                        growerTitle={isDirectShopReview ? selectedShop.name : growerTitle}
                                        growerLink={isDirectShopReview ? buildShopPath(selectedShop) : growerLink}
                                        currentUserId={user?.uid}
                                        onReact={handleReviewReaction}
                                    />
                                );
                            })()}
                        </CardContent>
                    </Card>
                ))
            )}

            <Typography component="h2" variant="h6" sx={{ color: "text.secondary", fontWeight: 700, ml: 1, mt: 2 }}>
                In de buurt
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", ml: 1, mb: 1 }}>
                Winkels in dezelfde provincie, gesorteerd op afstand vanaf {selectedShop.name}.
            </Typography>
            <div style={{ width: "100%", overflow: "auto", display: "flex", marginBottom: 20 }}>
                {nearbyShops.length > 0 ? (
                    nearbyShops.map((shop) => (
                        <div key={`nearby-${shop.shortcode || shop.id}`} style={{ minWidth: 280, margin: 12 }}>
                            <ShopCard shop={shop} />
                        </div>
                    ))
                ) : (
                    <Typography sx={{ m: 2, color: "text.secondary" }}>
                        Geen nabijgelegen winkels gevonden in dezelfde provincie.
                    </Typography>
                )}
            </div>

            <Menu anchorEl={routeMenuAnchorEl} open={Boolean(routeMenuAnchorEl)} onClose={() => setRouteMenuAnchorEl(null)}>
                <MenuItem onClick={() => handleRouteSelect("google")}>Google Maps</MenuItem>
                <MenuItem onClick={() => handleRouteSelect("waze")}>Waze</MenuItem>
            </Menu>

            <Dialog open={claimModalOpen} onClose={() => setClaimModalOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Claim deze winkel</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
                        Laat je gegevens achter. We nemen contact op om eigenaarschap van {selectedShop.name} te verifiëren.
                    </Typography>
                    {claimError && (
                        <Alert severity="warning" sx={{ mb: 1.5 }}>
                            {claimError}
                        </Alert>
                    )}
                    <form id="shop-claim-form" onSubmit={handleSubmitClaim}>
                        <Stack spacing={1.2}>
                            <TextField
                                label="Naam"
                                value={claimName}
                                onChange={(event) => setClaimName(event.target.value)}
                                fullWidth
                                required
                            />
                            <TextField
                                label="E-mail"
                                type="email"
                                value={claimEmail}
                                onChange={(event) => setClaimEmail(event.target.value)}
                                fullWidth
                                required
                            />
                            <TextField
                                label="Opmerking"
                                value={claimNote}
                                onChange={(event) => setClaimNote(event.target.value)}
                                multiline
                                minRows={3}
                                fullWidth
                            />
                        </Stack>
                    </form>
                </DialogContent>
                <DialogActions>
                    <Button color="inherit" onClick={() => setClaimModalOpen(false)}>
                        Sluiten
                    </Button>
                    <Button type="submit" form="shop-claim-form" variant="contained" disabled={claimSubmitting || hasExistingClaim}>
                        {claimSubmitting ? "Versturen..." : "Claim versturen"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={reviewModalOpen} onClose={() => setReviewModalOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Jouw winkelreview</DialogTitle>
                <DialogContent>
                    {!navigator.onLine && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Reviews aanpassen kan alleen wanneer je online bent.
                        </Alert>
                    )}
                    {myShopReview ? (
                        <Box sx={{ border: "1px solid #eceff0", borderRadius: 2, p: 1.5 }}>
                            <MuiRating value={myShopReview.rating} readOnly />
                            <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                                {myShopReview.review}
                            </Typography>
                            <Button variant="outlined" color="error" disabled={!navigator.onLine || removingReview} onClick={() => void handleDeleteShopReview()}>
                                {removingReview ? "Verwijderen..." : "Review verwijderen"}
                            </Button>
                        </Box>
                    ) : (
                        <form onSubmit={handleSaveShopReview}>
                            <MuiRating value={shopReviewRating} onChange={(_, value) => setShopReviewRating(value ?? 1)} max={5} />
                            <TextField
                                fullWidth
                                multiline
                                minRows={3}
                                label="Jouw ervaring met deze winkel"
                                value={shopReviewText}
                                onChange={(event) => setShopReviewText(event.target.value)}
                                sx={{ mt: 1, mb: 1 }}
                            />
                            <DialogActions sx={{ px: 0 }}>
                                <Button onClick={() => setReviewModalOpen(false)} color="inherit">
                                    Sluiten
                                </Button>
                                <Button type="submit" variant="contained" disabled={savingReview || !navigator.onLine}>
                                    {savingReview ? "Opslaan..." : "Review opslaan"}
                                </Button>
                            </DialogActions>
                        </form>
                    )}
                </DialogContent>
                {myShopReview && (
                    <DialogActions>
                        <Button onClick={() => setReviewModalOpen(false)} color="inherit">
                            Sluiten
                        </Button>
                    </DialogActions>
                )}
            </Dialog>
        </section>
    );
}
