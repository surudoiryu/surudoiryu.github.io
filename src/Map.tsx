import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildProvincePath, buildShopPath, slugifySegment } from "./utils/shopRouting";
import Loader from "./components/Loader";
import GoogleMap, { MapContextProps } from "google-maps-react-markers";
import { LengthCountType, ListType } from "./types/data";
import { getMapOptions } from "./api/map.api";
import { LocationObject, ShopType } from "./types/shop";
import "./Map.css";
import Marker from "./components/MapMarker";
import { onSnapshot } from "firebase/firestore";
import { brandCollectionRef, shopCollectionRef } from "./firebaseCollections";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Drawer,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import LocalParkingIcon from "@mui/icons-material/LocalParking";
import BadgeIcon from "@mui/icons-material/Badge";
import AccessibleIcon from "@mui/icons-material/Accessible";
import DriveEtaIcon from "@mui/icons-material/DriveEta";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import StorefrontIcon from "@mui/icons-material/Storefront";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import VerifiedIcon from "@mui/icons-material/Verified";
import CloseIcon from "@mui/icons-material/Close";

type Props = {
    shopList: ListType;
    lengthCount: LengthCountType;
    location: LocationObject | null;
    setLocation: (location: LocationObject) => void;
};

type ShopWithDistance = ShopType & {
    distanceKm: number | null;
    isOpenNow: boolean | null;
};

type ClusterMarker = {
    kind: "cluster" | "shop";
    markerId: string;
    lat: number;
    lng: number;
    count: number;
    shops: ShopWithDistance[];
    shop?: ShopWithDistance;
};
const UTRECHT_CENTER: LocationObject = { latitude: 52.08766, longitude: 5.22577 };

function hasValidCoordinates(lat: number, lng: number): boolean {
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) > 0 && Math.abs(lng) > 0;
}

function toNumber(value: unknown): number {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === "string") {
        const parsed = Number.parseFloat(value.replace(",", "."));
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}

function normalizeShopCoordinates(shop: ShopType): ShopType {
    const candidate = shop as ShopType & { latitude?: unknown; longitude?: unknown };
    const lat = toNumber(shop.lat ?? candidate.latitude);
    const lng = toNumber(shop.lng ?? candidate.longitude);
    return {
        ...shop,
        lat,
        lng,
    };
}

function parseTimeToMinutes(value: string | undefined): number | null {
    if (!value) return null;
    const raw = value.trim().toLowerCase().replace(/\s+/g, "");
    if (!raw) return null;

    const ampmMatch = raw.match(/^(\d{1,2}):(\d{2})(am|pm)$/);
    if (ampmMatch) {
        let hours = Number.parseInt(ampmMatch[1], 10);
        const minutes = Number.parseInt(ampmMatch[2], 10);
        const marker = ampmMatch[3];
        if (marker === "pm" && hours < 12) hours += 12;
        if (marker === "am" && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }

    const hhmmMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmmMatch) {
        const hours = Number.parseInt(hhmmMatch[1], 10);
        const minutes = Number.parseInt(hhmmMatch[2], 10);
        if (hours > 23 || minutes > 59) return null;
        return hours * 60 + minutes;
    }

    return null;
}

function isShopOpenNow(shop: ShopType, now: Date): boolean | null {
    const openMinutes = parseTimeToMinutes(shop.openFrom);
    const closeMinutes = parseTimeToMinutes(shop.openTill);
    if (openMinutes === null || closeMinutes === null) {
        return null;
    }

    const current = now.getHours() * 60 + now.getMinutes();
    if (openMinutes <= closeMinutes) {
        return current >= openMinutes && current <= closeMinutes;
    }
    return current >= openMinutes || current <= closeMinutes;
}

function markerDistance(a: LocationObject, b: LocationObject) {
    const radius = 6371.071;
    const rlat1 = a.latitude * (Math.PI / 180);
    const rlat2 = b.latitude * (Math.PI / 180);
    const difflat = rlat2 - rlat1;
    const difflon = (b.longitude - a.longitude) * (Math.PI / 180);

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

function getShopInitials(name: string): string {
    const words = name.split(/\s+/g).filter(Boolean);
    if (!words.length) return "WS";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

function truncateDescription(value: string | undefined, maxLength = 80): string {
    const text = (value || "").trim();
    if (!text) return "Geen omschrijving beschikbaar.";
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trimEnd()}...`;
}

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

export default function PageMap({ shopList, lengthCount: _lengthCount, location, setLocation }: Props) {
    const mapRef = useRef<MapContextProps["map"] | null>(null);
    const navigate = useNavigate();
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

    const [mapReady, setMapReady] = useState(false);
    const [selectedShop, setSelectedShop] = useState<ShopWithDistance | null>(null);
    const [shops, setShops] = useState<ShopType[]>(shopList.list as ShopType[]);
    const [loadingShops, setLoadingShops] = useState(true);
    const [postcode, setPostcode] = useState("");
    const [postcodeLocation, setPostcodeLocation] = useState<LocationObject | null>(null);
    const [postcodeError, setPostcodeError] = useState<string | null>(null);
    const [resolvingPostcode, setResolvingPostcode] = useState(false);
    const [routeMenuAnchorEl, setRouteMenuAnchorEl] = useState<HTMLElement | null>(null);
    const [routeMenuShop, setRouteMenuShop] = useState<ShopWithDistance | null>(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [brandsByKey, setBrandsByKey] = useState<Record<string, string>>({});

    const [filterAllowForeigns, setFilterAllowForeigns] = useState(false);
    const [filterAccessible, setFilterAccessible] = useState(false);
    const [filterDrive, setFilterDrive] = useState(false);
    const [filterParking, setFilterParking] = useState(false);
    const [filterCard, setFilterCard] = useState(false);
    const [filterPickup, setFilterPickup] = useState(false);
    const [selectedGrowers, setSelectedGrowers] = useState<string[]>([]);
    const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
    const [mapZoom, setMapZoom] = useState(7);
    const [focusReferenceLocation, setFocusReferenceLocation] = useState(false);

    const referenceLocationCandidate = postcodeLocation ?? location ?? null;
    const referenceLocation =
        referenceLocationCandidate &&
        hasValidCoordinates(referenceLocationCandidate.latitude, referenceLocationCandidate.longitude)
            ? referenceLocationCandidate
            : null;
    const distanceReferenceLocation = referenceLocation ?? UTRECHT_CENTER;

    const getShopMarkerId = (shop: ShopType, index: number): string => {
        if (shop.shortcode) return `shop-${shop.shortcode}`;
        if (shop.id !== undefined && shop.id !== null) return `shop-id-${shop.id}`;
        return `shop-index-${index}`;
    };

    useEffect(() => {
        const unsubscribe = onSnapshot(shopCollectionRef, (snapshot) => {
            const firestoreShops = snapshot.docs
                .map((item) => normalizeShopCoordinates(item.data() as ShopType));

            if (firestoreShops.length > 0) {
                setShops(firestoreShops);
            } else {
                setShops(((shopList.list as ShopType[]) ?? []).map((shop) => normalizeShopCoordinates(shop)));
            }
            setLoadingShops(false);
        });

        return () => unsubscribe();
    }, [shopList.list]);

    useEffect(() => {
        const unsubscribe = onSnapshot(brandCollectionRef, (snapshot) => {
            const next: Record<string, string> = {};
            snapshot.docs.forEach((item) => {
                const data = item.data() as Record<string, unknown>;
                const title = String(data.title ?? data.name ?? data.businessName ?? "").trim();
                if (!title) return;

                const docId = String(item.id ?? "").trim().toLowerCase();
                const sourceId = String(data.sourceId ?? data.tenantId ?? "").trim().toLowerCase();
                const numericId = Number(data.id);
                const normalizedTitle = title.toLowerCase();

                if (docId) next[docId] = title;
                if (sourceId) next[sourceId] = title;
                if (Number.isFinite(numericId)) next[String(numericId)] = title;
                next[normalizedTitle] = title;
            });
            setBrandsByKey(next);
        });

        return () => unsubscribe();
    }, []);

    const handleRetrieveUserLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const nextLocation = { latitude, longitude };
                setLocation(nextLocation);
                setPostcodeLocation(null);
                setPostcodeError(null);
                setFocusReferenceLocation(true);
            },
            () => {
                setPostcodeError("Locatie delen is geweigerd of niet beschikbaar.");
            },
            {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    };

    const handleResolvePostcode = async () => {
        const query = postcode.trim();
        if (!query) {
            setPostcodeError("Vul een postcode in.");
            return;
        }

        setResolvingPostcode(true);
        setPostcodeError(null);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&countrycodes=nl&limit=1&q=${encodeURIComponent(
                    `${query}, Nederland`
                )}`
            );
            if (!response.ok) {
                throw new Error("Postcode kon niet opgehaald worden.");
            }
            const data = (await response.json()) as Array<{ lat?: string; lon?: string }>;
            const first = data[0];
            if (!first?.lat || !first?.lon) {
                throw new Error("Geen locatie gevonden voor deze postcode.");
            }

            const nextLocation = {
                latitude: Number.parseFloat(first.lat),
                longitude: Number.parseFloat(first.lon),
            };
            if (!Number.isFinite(nextLocation.latitude) || !Number.isFinite(nextLocation.longitude)) {
                throw new Error("Postcode gaf geen geldige coördinaten terug.");
            }

            setPostcodeLocation(nextLocation);
            setFocusReferenceLocation(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Postcode kon niet verwerkt worden.";
            setPostcodeError(message);
        } finally {
            setResolvingPostcode(false);
        }
    };

    const shopsWithDistance = useMemo<ShopWithDistance[]>(() => {
        const now = new Date();

        return shops
            .map((shop) => {
                const openNow = isShopOpenNow(shop, now);
                const province = String(shop.province || "").trim();
                const distance =
                    Number.isFinite(shop.lat) && Number.isFinite(shop.lng) && hasValidCoordinates(shop.lat, shop.lng)
                        ? markerDistance(distanceReferenceLocation, { latitude: shop.lat, longitude: shop.lng })
                        : null;
                return {
                    ...shop,
                    province,
                    distanceKm: distance,
                    isOpenNow: openNow,
                };
            })
            .filter((shop) => Boolean(shop.province) && hasValidCoordinates(shop.lat, shop.lng));
    }, [distanceReferenceLocation, shops]);

    const getShopGrowerNames = useCallback((shop: ShopType): string[] => {
        const source = shop as Record<string, unknown>;
        const candidates = [
            ...asArray<unknown>(source.growers),
            ...asArray<unknown>(source.growerIds),
            ...asArray<unknown>(source.brands),
            ...asArray<unknown>(source.brandIds),
        ];

        const names = new Set<string>();
        candidates.forEach((item) => {
            if (typeof item === "number" && Number.isFinite(item)) {
                const resolved = brandsByKey[String(item)];
                if (resolved) names.add(resolved);
                return;
            }

            if (typeof item === "string") {
                const key = item.trim().toLowerCase();
                if (!key) return;
                names.add(brandsByKey[key] ?? item.trim());
                return;
            }

            if (item && typeof item === "object") {
                const objectItem = item as Record<string, unknown>;
                const keyId = String(objectItem.id ?? objectItem.sourceId ?? objectItem.tenantId ?? "").trim().toLowerCase();
                const label = String(objectItem.title ?? objectItem.name ?? "").trim();
                if (keyId && brandsByKey[keyId]) {
                    names.add(brandsByKey[keyId]);
                    return;
                }
                if (label) {
                    names.add(brandsByKey[label.toLowerCase()] ?? label);
                }
            }
        });

        return Array.from(names);
    }, [brandsByKey]);

    const allGrowerOptions = useMemo(() => {
        const unique = new Set<string>();
        shopsWithDistance.forEach((shop) => {
            getShopGrowerNames(shop).forEach((name) => unique.add(name));
        });
        return Array.from(unique).sort((a, b) => a.localeCompare(b));
    }, [getShopGrowerNames, shopsWithDistance]);

    const provinceOptions = useMemo(() => {
        const unique = new Set<string>();
        shopsWithDistance.forEach((shop) => {
            if (shop.province) unique.add(shop.province);
        });
        return Array.from(unique).sort((a, b) => a.localeCompare(b));
    }, [shopsWithDistance]);

    const provinceOverview = useMemo(() => {
        const grouped = new Map<string, ShopWithDistance[]>();
        shopsWithDistance.forEach((shop) => {
            const province = (shop.province || "").trim();
            if (!province) return;
            const existing = grouped.get(province);
            if (existing) {
                existing.push(shop);
            } else {
                grouped.set(province, [shop]);
            }
        });

        return Array.from(grouped.entries())
            .map(([province, provinceShops]) => ({
                province,
                shops: provinceShops.sort((a, b) => a.name.localeCompare(b.name)),
            }))
            .sort((a, b) => a.province.localeCompare(b.province));
    }, [shopsWithDistance]);

    const filteredShops = useMemo<ShopWithDistance[]>(() => {
        return shopsWithDistance.filter((shop) => {
            if (filterAllowForeigns && !shop.allowForeigns) return false;
            if (filterAccessible && !shop.disabled) return false;
            if (filterDrive && !shop.drive) return false;
            if (filterParking && !shop.easyParking) return false;
            if (filterCard && !shop.payByCard) return false;
            if (filterPickup && !shop.pickup) return false;
            if (selectedGrowers.length > 0) {
                const shopGrowers = getShopGrowerNames(shop);
                if (!selectedGrowers.some((name) => shopGrowers.includes(name))) {
                    return false;
                }
            }
            if (selectedProvinces.length > 0 && !selectedProvinces.includes(shop.province || "")) {
                return false;
            }
            return true;
        });
    }, [filterAccessible, filterAllowForeigns, filterCard, filterDrive, filterParking, filterPickup, getShopGrowerNames, selectedGrowers, selectedProvinces, shopsWithDistance]);

    const sliderShops = useMemo<ShopWithDistance[]>(() => {
        return filteredShops
            .sort((a, b) => {
                if (a.distanceKm === null && b.distanceKm === null) return a.name.localeCompare(b.name);
                if (a.distanceKm === null) return 1;
                if (b.distanceKm === null) return -1;
                return a.distanceKm - b.distanceKm;
            })
            .slice(0, 10);
    }, [filteredShops]);

    const mapShops = filteredShops;

    const clusteredMapMarkers = useMemo<ClusterMarker[]>(() => {
        const markers = mapShops.map((shop, index) => ({ shop, lat: shop.lat, lng: shop.lng, index }));

        if (mapZoom < 8) {
            const byProvince = new Map<string, { shops: ShopWithDistance[]; sumLat: number; sumLng: number }>();
            markers.forEach((item) => {
                const provinceKey = slugifySegment(item.shop.province || "");
                if (!provinceKey) return;
                const existing = byProvince.get(provinceKey);
                if (existing) {
                    existing.shops.push(item.shop);
                    existing.sumLat += item.lat;
                    existing.sumLng += item.lng;
                } else {
                    byProvince.set(provinceKey, { shops: [item.shop], sumLat: item.lat, sumLng: item.lng });
                }
            });

            return Array.from(byProvince.entries()).map(([provinceKey, group], index) => {
                const count = group.shops.length;
                return {
                    kind: "cluster" as const,
                    markerId: `province-${provinceKey}-${index}`,
                    lat: group.sumLat / count,
                    lng: group.sumLng / count,
                    count,
                    shops: group.shops,
                };
            });
        }

        if (mapZoom >= 13) {
            return markers.map((item) => ({
                kind: "shop" as const,
                markerId: getShopMarkerId(item.shop, item.index),
                lat: item.lat,
                lng: item.lng,
                count: 1,
                shops: [item.shop],
                shop: item.shop,
            }));
        }

        const zoomFactor = Math.max(1, Math.pow(2, Math.max(0, mapZoom - 5)));
        const cellSize = Math.max(0.005, 0.35 / zoomFactor);
        const grouped = new Map<string, { sumLat: number; sumLng: number; shops: ShopWithDistance[] }>();

        markers.forEach((item) => {
            const key = `${Math.floor(item.lat / cellSize)}:${Math.floor(item.lng / cellSize)}`;
            const existing = grouped.get(key);
            if (existing) {
                existing.sumLat += item.lat;
                existing.sumLng += item.lng;
                existing.shops.push(item.shop);
            } else {
                grouped.set(key, { sumLat: item.lat, sumLng: item.lng, shops: [item.shop] });
            }
        });

        return Array.from(grouped.values()).map((group, index) => {
            const count = group.shops.length;
            const lat = group.sumLat / count;
            const lng = group.sumLng / count;
            if (count === 1) {
                const single = group.shops[0];
                return {
                    kind: "shop" as const,
                    markerId: getShopMarkerId(single, index),
                    lat,
                    lng,
                    count,
                    shops: [single],
                    shop: single,
                };
            }
            return {
                kind: "cluster" as const,
                markerId: `cluster-${index}-${count}`,
                lat,
                lng,
                count,
                shops: group.shops,
            };
        });
    }, [mapShops, mapZoom]);

    const statusColor = (value: boolean): string => (value ? "#2e7d32" : "#c62828");

    const featureIcons = (shop: ShopWithDistance, size = 18) => {
        return (
            <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
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
                <Tooltip title={shop.pickup ? "Afhaal" : "Binnen verblijven"}>
                    <StorefrontIcon sx={{ color: statusColor(shop.pickup), fontSize: size }} />
                </Tooltip>
            </Stack>
        );
    };

    const iconFilterButtonSx = (active: boolean) => ({
        border: "1px solid",
        borderColor: active ? "success.main" : "divider",
        backgroundColor: active ? "rgba(46,125,50,0.10)" : "transparent",
        color: active ? "success.main" : "text.secondary",
    });

    useEffect(() => {
        if (!mapReady || !mapRef.current || !referenceLocation) return;
        mapRef.current.setCenter({ lat: referenceLocation.latitude, lng: referenceLocation.longitude });
    }, [mapReady, referenceLocation]);

    useEffect(() => {
        if (!focusReferenceLocation || !mapReady || !mapRef.current || !referenceLocation) return;
        mapRef.current.setCenter({ lat: referenceLocation.latitude, lng: referenceLocation.longitude });
        mapRef.current.setZoom?.(15);
        setFocusReferenceLocation(false);
    }, [focusReferenceLocation, mapReady, referenceLocation]);

    const onGoogleApiLoaded = ({ map }: { map: MapContextProps["map"]; maps: MapContextProps["maps"] }) => {
        mapRef.current = map;
        const initialZoom = map.getZoom?.();
        if (typeof initialZoom === "number" && Number.isFinite(initialZoom)) {
            setMapZoom(initialZoom);
        }
        map.addListener?.("zoom_changed", () => {
            const zoom = map.getZoom?.();
            if (typeof zoom === "number" && Number.isFinite(zoom)) {
                setMapZoom(zoom);
            }
        });
        setMapReady(true);
    };

    useEffect(() => {
        if (!selectedShop) return;

        const handlePointerDownOutsidePopup = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest(".map-shop-popup-card") || target?.closest(".map-shop-mobile-sheet")) return;
            setSelectedShop(null);
        };

        document.addEventListener("pointerdown", handlePointerDownOutsidePopup);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDownOutsidePopup);
        };
    }, [selectedShop]);

    const onMarkerClick = (_event: unknown, { markerId, lat, lng }: { lat: number; lng: number; markerId: string }) => {
        if (mapReady && mapRef.current) {
            mapRef.current.setCenter({ lat, lng });
            const matchedMarker = clusteredMapMarkers.find((marker) => marker.markerId === markerId) || null;
            if (!matchedMarker) {
                setSelectedShop(null);
                return;
            }

            if (matchedMarker.kind === "cluster") {
                const currentZoom = mapRef.current.getZoom?.() ?? mapZoom;
                mapRef.current.setZoom?.(Math.min(18, currentZoom + (mapZoom < 8 ? 3 : 2)));
                setSelectedShop(null);
                return;
            }

            setSelectedShop(matchedMarker.shop || null);
        }
    };

    const openRoute = (shop: ShopWithDistance, provider: "google" | "waze") => {
        if (!Number.isFinite(shop.lat) || !Number.isFinite(shop.lng)) return;
        const destination = `${shop.lat},${shop.lng}`;
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
        const wazeWebUrl = `https://waze.com/ul?ll=${encodeURIComponent(destination)}&navigate=yes`;

        if (provider === "google") {
            window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
            return;
        }

        const isMobile = /android|iphone|ipad|ipod/i.test(window.navigator.userAgent);
        if (isMobile) {
            const wazeAppUrl = `waze://?ll=${destination}&navigate=yes`;
            window.location.href = wazeAppUrl;
            return;
        }

        window.open(wazeWebUrl, "_blank", "noopener,noreferrer");
    };

    const handleOpenRouteMenu = (event: React.MouseEvent<HTMLElement>, shop: ShopWithDistance) => {
        event.stopPropagation();
        setRouteMenuAnchorEl(event.currentTarget);
        setRouteMenuShop(shop);
    };

    const handleCloseRouteMenu = () => {
        setRouteMenuAnchorEl(null);
        setRouteMenuShop(null);
    };

    const handleRouteSelect = (provider: "google" | "waze") => {
        if (routeMenuShop) {
            openRoute(routeMenuShop, provider);
        }
        handleCloseRouteMenu();
    };

    const renderSelectedShopPopupContent = (shop: ShopWithDistance) => (
        <CardContent sx={{ p: 1.2, "&:last-child": { pb: 1.2 } }}>
            <IconButton
                size="small"
                className="map-shop-popup-close"
                onClick={() => setSelectedShop(null)}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.7, pr: 3 }}>
                {shop.logo ? (
                    <Box
                        component="img"
                        src={shop.logo}
                        alt={shop.name}
                        sx={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                    />
                ) : (
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            backgroundColor: "#e8f5e9",
                            color: "#1b5e20",
                            fontWeight: 800,
                            fontSize: 14,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {getShopInitials(shop.name)}
                    </Box>
                )}
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.secondary", display: "flex", alignItems: "center", gap: 0.5 }}>
                        {shop.name}
                        {shop.isApproved && <VerifiedIcon sx={{ fontSize: 16, color: "success.main" }} />}
                    </Typography>
                    <Chip
                        size="small"
                        label={shop.isOpenNow === null ? "Onbekend" : (shop.isOpenNow ? "Geopend" : "Gesloten")}
                        color={shop.isOpenNow === null ? "default" : (shop.isOpenNow ? "success" : "error")}
                        sx={{ mt: 0.45, mb: 0.2, fontWeight: 700 }}
                    />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {shop.distanceKm !== null ? `${shop.distanceKm.toFixed(2)} km` : "Afstand onbekend"}
                    </Typography>
                </Box>
            </Stack>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.8 }}>
                {shop.description || "Geen omschrijving beschikbaar."}
            </Typography>
            <Box sx={{ mb: 1 }}>{featureIcons(shop, 18)}</Box>
            <Stack direction="row" spacing={0.8}>
                <Button size="small" variant="outlined" onClick={(event) => handleOpenRouteMenu(event, shop)}>
                    Route
                </Button>
                <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                        if (shop.shortcode) {
                            navigate(buildShopPath(shop));
                        }
                    }}
                >
                    Bekijk
                </Button>
            </Stack>
        </CardContent>
    );

    return (
        <section className="map-container">
            <section style={{ textAlign: "left", margin: "0 16px 12px" }}>
                <Typography component="h1" variant="h5" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                    Alle Winkels
                </Typography>
                <Typography component="h2" variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
                    Zoek op postcode of gebruik je huidige locatie, filter direct op winkelopties en bekijk eerst winkels in de buurt op afstand.
                </Typography>
            </section>

            <Card sx={{ mx: 2, mb: 2 }}>
                <CardContent>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Postcode"
                            placeholder="Bijv. 3011AA"
                            value={postcode}
                            onChange={(event) => setPostcode(event.target.value)}
                        />
                        <Tooltip title={resolvingPostcode ? "Zoeken..." : "Zoek in de buurt"}>
                            <span>
                                <IconButton
                                    color="primary"
                                    onClick={() => void handleResolvePostcode()}
                                    disabled={resolvingPostcode}
                                    sx={{ border: "1px solid", borderColor: "divider" }}
                                >
                                    <SearchIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Gebruik mijn locatie">
                            <IconButton onClick={handleRetrieveUserLocation} sx={{ border: "1px solid", borderColor: "divider" }}>
                                <MyLocationIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Filters">
                            <IconButton onClick={() => setFilterOpen(true)} sx={{ border: "1px solid", borderColor: "divider" }}>
                                <TuneIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    {postcodeError && (
                        <Alert severity="warning" sx={{ mt: 1.5 }}>
                            {postcodeError}
                        </Alert>
                    )}
                    {(filterAllowForeigns || filterAccessible || filterDrive || filterParking || filterCard || filterPickup || selectedGrowers.length > 0 || selectedProvinces.length > 0) && (
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
                            {sliderShops.length} winkels met actieve filters
                        </Typography>
                    )}
                </CardContent>
            </Card>

            {loadingShops && <Loader size={40} display="block" />}

            <section style={{ textAlign: "left", margin: "0 16px 10px" }}>
                <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    Dichtstbijzijnde winkels ({sliderShops.length})
                </Typography>
            </section>

            {sliderShops.length === 0 ? (
                <Alert severity="info" sx={{ mx: 2, mb: 2 }}>
                    Geen winkels gevonden met deze filters.
                </Alert>
            ) : (
                <Box sx={{ display: "flex", overflowX: "auto", gap: 1.5, px: 2, pb: 1.5, mb: 1.5 }}>
                    {sliderShops.map((shop) => (
                        <Card
                            key={shop.shortcode || shop.id}
                            sx={{ minWidth: 260, maxWidth: 280, cursor: "pointer" }}
                            onClick={() => {
                                setSelectedShop(shop);
                                if (mapReady && mapRef.current) {
                                    mapRef.current.setCenter({ lat: shop.lat, lng: shop.lng });
                                }
                            }}
                        >
                            <CardContent sx={{ textAlign: "left" }}>
                                {shop.logo ? (
                                    <Box
                                        component="img"
                                        src={shop.logo}
                                        alt={shop.name}
                                        sx={{ width: "100%", maxHeight: 120, objectFit: "contain", mb: 1 }}
                                    />
                                ) : (
                                    <Box
                                        sx={{
                                            width: "100%",
                                            height: 92,
                                            borderRadius: 1.5,
                                            backgroundColor: "#e8f5e9",
                                            color: "#1b5e20",
                                            fontWeight: 800,
                                            fontSize: 28,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            mb: 1,
                                        }}
                                    >
                                        {getShopInitials(shop.name)}
                                    </Box>
                                )}
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.secondary" }}>
                                    {shop.name}
                                </Typography>
                                <Chip
                                    size="small"
                                    label={shop.isOpenNow === null ? "Onbekend" : (shop.isOpenNow ? "Geopend" : "Gesloten")}
                                    color={shop.isOpenNow === null ? "default" : (shop.isOpenNow ? "success" : "error")}
                                    sx={{ mt: 0.5, mb: 0.7, fontWeight: 700 }}
                                />
                                <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.5 }}>
                                    {truncateDescription(shop.description, 80)}
                                </Typography>
                                <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.75 }}>
                                    {shop.distanceKm !== null ? `${shop.distanceKm.toFixed(2)} km` : "Afstand onbekend"}
                                </Typography>
                                <Box sx={{ mb: 1 }}>{featureIcons(shop, 18)}</Box>
                                <Stack direction="row" spacing={0.8} sx={{ mt: 0.5 }}>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={(event) => {
                                            handleOpenRouteMenu(event, shop);
                                        }}
                                    >
                                        Route
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            if (shop.shortcode) {
                                                navigate(buildShopPath(shop));
                                            }
                                        }}
                                    >
                                        Bekijk winkel
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}

            <section style={{ textAlign: "left", margin: "0 16px 8px" }}>
                <Typography component="h2" variant="h6" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    Kaartweergave van alle winkels
                </Typography>
            </section>

            <GoogleMap
                apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
                defaultCenter={{ lat: 52.08766, lng: 5.22577 }}
                defaultZoom={10}
                options={getMapOptions}
                mapMinHeight="calc(100vh - 60px)"
                onGoogleApiLoaded={onGoogleApiLoaded}
            >
                {referenceLocation && (
                    <Marker
                        key="reference-location"
                        image="marker-pin.png"
                        lat={referenceLocation.latitude}
                        lng={referenceLocation.longitude}
                        markerId="reference-location"
                        onClick={undefined}
                        draggable={false}
                    />
                )}

                {clusteredMapMarkers.map((marker) => {
                    const firstShop = marker.shops[0];
                    const showCluster = marker.kind === "cluster";
                    return (
                        <Marker
                            key={marker.markerId}
                            image={!showCluster ? firstShop?.logo || undefined : undefined}
                            label={showCluster ? String(marker.count) : (firstShop?.logo ? undefined : getShopInitials(firstShop?.name || "WS"))}
                            pinColor={showCluster ? "#1e88e5" : (firstShop?.isOpenNow ? "#2e7d32" : "#6d4c41")}
                            lat={marker.lat}
                            lng={marker.lng}
                            markerId={marker.markerId}
                            onClick={onMarkerClick}
                            draggable={false}
                            background
                        />
                    );
                })}
                {selectedShop && isDesktop && (
                    <Marker
                        key={`selected-shop-popup-${selectedShop.shortcode || selectedShop.id}`}
                        lat={selectedShop.lat}
                        lng={selectedShop.lng}
                        markerId={`selected-shop-popup-${selectedShop.shortcode || selectedShop.id}`}
                        draggable={false}
                        onClick={undefined}
                    >
                        <Card className="map-shop-popup-card">{renderSelectedShopPopupContent(selectedShop)}</Card>
                    </Marker>
                )}
            </GoogleMap>
            {selectedShop && !isDesktop && (
                <Card className="map-shop-mobile-sheet">{renderSelectedShopPopupContent(selectedShop)}</Card>
            )}
            <section style={{ textAlign: "left", margin: "16px 16px 0" }}>
                <Typography component="h2" variant="h6" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                    Winkels per provincie
                </Typography>
                {provinceOverview.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Nog geen provinciegegevens beschikbaar.
                    </Typography>
                ) : (
                    <Stack spacing={1.5}>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            {provinceOverview.map((item) => (
                                <Chip
                                    key={item.province}
                                    label={`${item.province} (${item.shops.length})`}
                                    color="success"
                                    variant="outlined"
                                    onClick={() => navigate(buildProvincePath(item.province))}
                                />
                            ))}
                        </Box>
                        {isDesktop && (
                            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 1.5 }}>
                                {provinceOverview.map((item) => (
                                    <Box key={`province-${item.province}`} sx={{ p: 1.2 }}>
                                            <Typography variant="subtitle2" sx={{ color: "text.secondary", fontWeight: 700, mb: 0.75 }}>
                                                {item.province}
                                            </Typography>
                                            <Stack spacing={0.35}>
                                                {item.shops.map((shop) => (
                                                    <Typography
                                                        key={`${item.province}-${shop.shortcode}`}
                                                        variant="caption"
                                                        onClick={() => navigate(buildShopPath(shop))}
                                                        sx={{ color: "text.secondary", cursor: "pointer" }}
                                                    >
                                                        {shop.name}
                                                    </Typography>
                                                ))}
                                            </Stack>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Stack>
                )}
            </section>
            <Menu
                anchorEl={routeMenuAnchorEl}
                open={Boolean(routeMenuAnchorEl)}
                onClose={handleCloseRouteMenu}
            >
                <MenuItem onClick={() => handleRouteSelect("google")}>Google Maps</MenuItem>
                <MenuItem onClick={() => handleRouteSelect("waze")}>Waze</MenuItem>
            </Menu>
            <Drawer anchor="bottom" open={filterOpen} onClose={() => setFilterOpen(false)}>
                <Box sx={{ p: 2, pb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                        Filters
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                        Winkelopties
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1, mb: 2 }}>
                        <Tooltip title="Iedereen welkom">
                            <IconButton onClick={() => setFilterAllowForeigns((prev) => !prev)} sx={iconFilterButtonSx(filterAllowForeigns)}>
                                <BadgeIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Toegankelijk voor minder validen">
                            <IconButton onClick={() => setFilterAccessible((prev) => !prev)} sx={iconFilterButtonSx(filterAccessible)}>
                                <AccessibleIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Drive-thru">
                            <IconButton onClick={() => setFilterDrive((prev) => !prev)} sx={iconFilterButtonSx(filterDrive)}>
                                <DriveEtaIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Makkelijk parkeren">
                            <IconButton onClick={() => setFilterParking((prev) => !prev)} sx={iconFilterButtonSx(filterParking)}>
                                <LocalParkingIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Pinnen mogelijk">
                            <IconButton onClick={() => setFilterCard((prev) => !prev)} sx={iconFilterButtonSx(filterCard)}>
                                <CreditCardIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Afhalen">
                            <IconButton onClick={() => setFilterPickup((prev) => !prev)} sx={iconFilterButtonSx(filterPickup)}>
                                <StorefrontIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    <Divider sx={{ mb: 1.5 }} />

                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                        Telers in assortiment
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1, mb: 2 }}>
                        {allGrowerOptions.length === 0 ? (
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                Geen telers beschikbaar voor filter.
                            </Typography>
                        ) : (
                            allGrowerOptions.map((grower) => (
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
                            ))
                        )}
                    </Stack>

                    <Divider sx={{ mb: 1.5 }} />

                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                        Provincie
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1, mb: 2 }}>
                        {provinceOptions.length === 0 ? (
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                Geen provincies beschikbaar.
                            </Typography>
                        ) : (
                            provinceOptions.map((province) => (
                                <Chip
                                    key={province}
                                    label={province}
                                    color={selectedProvinces.includes(province) ? "success" : "default"}
                                    onClick={() =>
                                        setSelectedProvinces((prev) =>
                                            prev.includes(province)
                                                ? prev.filter((item) => item !== province)
                                                : [...prev, province]
                                        )
                                    }
                                />
                            ))
                        )}
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined"
                            onClick={() => {
                                setFilterAllowForeigns(false);
                                setFilterAccessible(false);
                                setFilterDrive(false);
                                setFilterParking(false);
                                setFilterCard(false);
                                setFilterPickup(false);
                                setSelectedGrowers([]);
                                setSelectedProvinces([]);
                            }}
                        >
                            Reset
                        </Button>
                        <Button variant="contained" onClick={() => setFilterOpen(false)}>
                            Toepassen ({sliderShops.length})
                        </Button>
                    </Stack>
                </Box>
            </Drawer>
        </section>
    );
}
