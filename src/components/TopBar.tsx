import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppBar, Autocomplete, Box, Button, Chip, IconButton, Stack, TextField, Toolbar, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import { getDocs, onSnapshot } from "firebase/firestore";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { brandCollectionRef, productCollectionRef } from "../firebaseCollections";
import logo from "../logo.svg";
import { GrowerType } from "../types/grower";
import { ProductType } from "../types/product";
import { useAuth } from "../context/AuthContext";
import { growerLogoUrl, productMainImageUrl, MEDIA_PLACEHOLDER, mediaFallback } from "../utils/mediaSource";

type SearchOption = {
    key: string;
    label: string;
    target: string;
    kind: "grower" | "category" | "product";
    image?: string;
    category?: string;
    grower?: string;
};

export default function TopBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const [visible, setVisible] = useState(true);
    const [growers, setGrowers] = useState<GrowerType[]>([]);
    const [searchValue, setSearchValue] = useState<SearchOption | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [productOptions, setProductOptions] = useState<SearchOption[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const lastScrollYRef = useRef(0);
    const fallbackProductsRef = useRef<Array<{ id: string; data: ProductType }> | null>(null);

    useEffect(() => {
        const unsubscribeGrowers = onSnapshot(brandCollectionRef, (snapshot) => {
            const docs =
                snapshot.docs.some((item) => item.data()?.source === "graphql")
                    ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                    : snapshot.docs;
            setGrowers(docs.map((item) => item.data() as GrowerType));
        });

        return () => {
            unsubscribeGrowers();
        };
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const nextY = window.scrollY;
            const previousY = lastScrollYRef.current;
            const delta = nextY - previousY;

            if (delta > 8 && nextY > 90) {
                setVisible(false);
            } else if (delta < -8) {
                setVisible(true);
            }

            lastScrollYRef.current = nextY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const options = useMemo(() => {
        const growerOptions: SearchOption[] = growers
            .filter((item) => item.shortcode && item.title)
            .map((item) => ({
                key: `g-${item.shortcode}`,
                label: item.title,
                target: `/telers/${item.shortcode}`,
                kind: "grower",
                image: growerLogoUrl(item) || MEDIA_PLACEHOLDER,
            }));

        const categoryOptions: SearchOption[] = [
            { key: "category-wiet", label: "Wiet", target: "/cannabis/wiet", kind: "category", image: "/images/pexels-alesiakozik-8336403.jpg" },
            { key: "category-hasj", label: "Hasj", target: "/cannabis/hasj", kind: "category", image: "/images/pexels-elsa-olofsson-3357043-6321769.jpg" },
            { key: "category-joints", label: "Joints", target: "/cannabis/joints", kind: "category", image: "/images/pexels-bxxxty-5564076.jpg" },
            { key: "category-edibles", label: "Edibles", target: "/cannabis/edibles", kind: "category", image: "/images/pexels-kindelmedia-7667903.jpg" },
        ];

        return [...categoryOptions, ...growerOptions, ...productOptions];
    }, [growers, productOptions]);

    useEffect(() => {
        const query = searchInput.trim();
        if (query.length < 2) { setProductOptions([]); setSearchLoading(false); return; }
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setSearchLoading(true);
            try {
                const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`, { signal: controller.signal, headers: { Accept: "application/json" } });
                if (!response.ok) throw new Error("search");
                const payload = await response.json() as { suggestions?: Array<Omit<SearchOption, "key">> };
                setProductOptions((payload.suggestions || []).map((item, index) => ({ ...item, key: `p-${item.target}-${index}` })));
            } catch (error) {
                if ((error as Error).name !== "AbortError") {
                    if (!fallbackProductsRef.current) {
                        const snapshot = await getDocs(productCollectionRef);
                        fallbackProductsRef.current = snapshot.docs.map(item => ({ id: item.id, data: item.data() as ProductType }));
                    }
                    const folded = query.toLocaleLowerCase("nl");
                    setProductOptions(fallbackProductsRef.current.filter(item => item.data.title?.toLocaleLowerCase("nl").includes(folded)).slice(0, 8).map(item => ({ key: `p-${item.id}`, label: item.data.title, target: `/cannabis/${item.data.shortcode}`, kind: "product", image: productMainImageUrl(item.data) || MEDIA_PLACEHOLDER, category: item.data.categoryName || item.data.type || "Product", grower: item.data.brand?.title || "" })));
                }
            } finally { if (!controller.signal.aborted) setSearchLoading(false); }
        }, 220);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [searchInput]);

    useEffect(() => {
        setSearchValue(null);
        setSearchInput("");
        setProductOptions([]);
    }, [location.pathname]);

    const navItems = useMemo(
        () => [
            { label: "Home", to: "/" },
            { label: "Cannabis", to: "/cannabis" },
            { label: "Telers", to: "/telers" },
            { label: "Informatie", to: "/info" },
        ],
        []
    );

    const isSelected = (target: string) => {
        if (target === "/") {
            return location.pathname === "/";
        }
        return location.pathname.startsWith(target);
    };

    return (
        <AppBar
            position="fixed"
            color="inherit"
            elevation={1}
            sx={{
                borderBottom: "1px solid #e0e0e0",
                transform: visible ? "translateY(0)" : "translateY(-110%)",
                transition: "transform 220ms ease",
                zIndex: 1200,
            }}
        >
            <Toolbar
                sx={{
                    gap: 1.5,
                    minHeight: { xs: "68px !important", md: "96px !important" },
                    px: { xs: 1, md: 2.5 },
                    maxWidth: 1130,
                    width: "100%",
                    boxSizing: "border-box",
                    mx: "auto",
                }}
            >
                <RouterLink to="/" aria-label="WeedInfo home">
                    <Box
                        component="img"
                        src={logo}
                        alt="WeedInfo"
                        width={68}
                        height={68}
                        sx={{ width: { xs: 44, md: 68 }, height: { xs: 44, md: 68 }, display: "block" }}
                    />
                </RouterLink>
                {isDesktop && (
                    <Stack direction="row" spacing={0.5} sx={{ mr: 1 }}>
                        {navItems.map((item) => (
                            <Button
                                key={item.to}
                                color={isSelected(item.to) ? "success" : "inherit"}
                                variant={isSelected(item.to) ? "contained" : "text"}
                                component={RouterLink}
                                to={item.to}
                                sx={{ textTransform: "none", fontWeight: 700 }}
                            >
                                {item.label}
                            </Button>
                        ))}
                    </Stack>
                )}

                <Autocomplete
                    sx={{ flex: 1, minWidth: 0, width: isDesktop ? 360 : "auto", maxWidth: "100%" }}
                    size="small"
                    options={options}
                    value={searchValue}
                    inputValue={searchInput}
                    loading={searchLoading}
                    onInputChange={(_, value, reason) => { if (reason !== "reset") setSearchInput(value); }}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.key === value.key}
                    onChange={(_, option) => {
                        setSearchValue(option);
                        if (option?.target) {
                            navigate(option.target);
                        }
                    }}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Zoek product, teler of categorie..." />
                    )}
                    renderOption={(props, option) => (
                        <li {...props} key={option.key}>
                            <Box sx={{ display: "grid", gridTemplateColumns: "52px minmax(0,1fr) auto", gap: 1.5, alignItems: "center", width: "100%", py: .5 }}>
                                <Box component="img" src={option.image || MEDIA_PLACEHOLDER} alt="" loading="lazy" width={52} height={52} onError={mediaFallback()} sx={{ width: 52, height: 52, objectFit: "cover", borderRadius: option.kind === "grower" ? "50%" : 1.5, bgcolor: "#eef5ef" }} />
                                <Box sx={{ minWidth: 0 }}><Typography component="span" fontWeight={750} display="block" noWrap>{option.label}</Typography>{option.kind === "product" && <Typography component="span" variant="caption" color="text.secondary" display="block" noWrap>{[option.category, option.grower].filter(Boolean).join(" · ")}</Typography>}</Box>
                                <Chip
                                    size="small"
                                    label={option.kind === "grower" ? "Teler" : option.kind === "product" ? "Product" : "Categorie"}
                                />
                            </Box>
                        </li>
                    )}
                />
                {isDesktop && (
                    <Tooltip title={user ? "Profiel" : "Inloggen"}><IconButton
                        aria-label={user ? "Open profiel" : "Inloggen"}
                        color={isSelected("/profiel") || isSelected("/login") ? "success" : "inherit"}
                        onClick={() => navigate(user ? "/profiel" : "/login")}
                        sx={{ width: 48, height: 48 }}
                    >
                        <AccountCircleOutlinedIcon />
                    </IconButton></Tooltip>
                )}
            </Toolbar>
        </AppBar>
    );
}
