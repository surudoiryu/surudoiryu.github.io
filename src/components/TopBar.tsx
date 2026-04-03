import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppBar, Autocomplete, Box, Chip, TextField, Toolbar } from "@mui/material";
import { onSnapshot } from "firebase/firestore";
import { useLocation, useNavigate } from "react-router-dom";
import { brandCollectionRef, productCollectionRef } from "../firebaseCollections";
import logo from "../logo.svg";
import { GrowerType } from "../types/grower";
import { ProductType } from "../types/product";

type SearchOption = {
    key: string;
    label: string;
    target: string;
    kind: "product" | "grower" | "type";
};

function normalize(value: string): string {
    return value.trim().toLowerCase();
}

export default function TopBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [visible, setVisible] = useState(true);
    const [products, setProducts] = useState<ProductType[]>([]);
    const [growers, setGrowers] = useState<GrowerType[]>([]);
    const [searchValue, setSearchValue] = useState<SearchOption | null>(null);
    const lastScrollYRef = useRef(0);

    useEffect(() => {
        const unsubscribeProducts = onSnapshot(productCollectionRef, (snapshot) => {
            const docs =
                snapshot.docs.some((item) => item.data()?.source === "graphql")
                    ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                    : snapshot.docs;
            setProducts(docs.map((item) => item.data() as ProductType));
        });

        const unsubscribeGrowers = onSnapshot(brandCollectionRef, (snapshot) => {
            const docs =
                snapshot.docs.some((item) => item.data()?.source === "graphql")
                    ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                    : snapshot.docs;
            setGrowers(docs.map((item) => item.data() as GrowerType));
        });

        return () => {
            unsubscribeProducts();
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
        const productOptions: SearchOption[] = products
            .filter((item) => item.shortcode && item.title)
            .map((item) => ({
                key: `p-${item.shortcode}`,
                label: item.title,
                target: `/cannabis/${item.shortcode}`,
                kind: "product",
            }));

        const growerOptions: SearchOption[] = growers
            .filter((item) => item.shortcode && item.title)
            .map((item) => ({
                key: `g-${item.shortcode}`,
                label: item.title,
                target: `/telers/${item.shortcode}`,
                kind: "grower",
            }));

        const typeOptions: SearchOption[] = Array.from(
            new Set(products.map((item) => item.type).filter((item): item is string => Boolean(item)))
        ).map((typeName) => ({
            key: `t-${normalize(typeName)}`,
            label: typeName,
            target: `/cannabis?type=${encodeURIComponent(typeName)}`,
            kind: "type",
        }));

        return [...typeOptions, ...growerOptions, ...productOptions];
    }, [growers, products]);

    useEffect(() => {
        setSearchValue(null);
    }, [location.pathname]);

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
            <Toolbar sx={{ gap: 1.5, minHeight: "64px !important" }}>
                <Box
                    component="img"
                    src={logo}
                    alt="WeedInfo"
                    sx={{ width: 44, height: 44, cursor: "pointer" }}
                    onClick={() => navigate("/")}
                />

                <Autocomplete
                    fullWidth
                    size="small"
                    options={options}
                    value={searchValue}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.key === value.key}
                    onChange={(_, option) => {
                        setSearchValue(option);
                        if (option?.target) {
                            navigate(option.target);
                        }
                    }}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Zoek soort, type of teler..." />
                    )}
                    renderOption={(props, option) => (
                        <li {...props} key={option.key}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                                <span>{option.label}</span>
                                <Chip
                                    size="small"
                                    label={option.kind === "type" ? "Type" : option.kind === "grower" ? "Teler" : "Soort"}
                                />
                            </Box>
                        </li>
                    )}
                />
            </Toolbar>
        </AppBar>
    );
}
