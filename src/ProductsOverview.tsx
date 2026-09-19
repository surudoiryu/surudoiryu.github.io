import { Typography } from "@mui/material";
import ProductenPerMerk from "./components/BrandProducts";
import { useLocation } from "react-router-dom";
import CategoryCards from "./components/CategoryCards";

export default function PageProductsOverview() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const categoryMap: Record<string, { label: string; forms: string[] }> = {
        "/cannabis/wiet": { label: "Wiet", forms: ["Wiet"] },
        "/cannabis/hasj": { label: "Hasj", forms: ["Hasj"] },
        "/cannabis/joints": { label: "Joints", forms: ["Joints Wiet", "Joints Hasj"] },
        "/cannabis/edibles": { label: "Edibles", forms: ["Edibles"] },
    };
    const activeCategory = categoryMap[location.pathname];
    const parseNumber = (value: string | null, fallback: number) => {
        if (!value) return fallback;
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };
    const parseList = (value: string | null) =>
        value ? value.split(",").map((item) => item.trim()).filter(Boolean) : undefined;

    const initialType = params.get("type") ?? undefined;
    const initialSearch = params.get("q") ?? undefined;
    const initialThcRange: [number, number] = [
        parseNumber(params.get("thcMin"), 0),
        parseNumber(params.get("thcMax"), 35),
    ];
    const initialCbdRange: [number, number] = [
        parseNumber(params.get("cbdMin"), 0),
        parseNumber(params.get("cbdMax"), 30),
    ];
    const initialTastes = parseList(params.get("tastes"));
    const initialPositiveEffects = parseList(params.get("effects"));
    const initialMinimumRating = parseNumber(params.get("minRating"), 0);
    const initialOnlyWithReviews = params.get("withReviews") === "1";

    return (
        <section style={{ paddingBottom: 90 }}>
            <section style={{ textAlign: "left", margin: "0 16px" }}>
                <Typography component="h1" variant="h5" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                    {activeCategory?.label ?? "Cannabisproducten"}
                </Typography>
                <Typography component="h2" variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                    Bekijk feitelijke productinformatie en gebruik filters om producten te vergelijken.
                </Typography>
            </section>
            <CategoryCards />
            <ProductenPerMerk
                showFilters
                initialSearchTerm={initialSearch}
                initialType={initialType}
                initialProductForms={activeCategory?.forms}
                initialThcRange={initialThcRange}
                initialCbdRange={initialCbdRange}
                initialTastes={initialTastes}
                initialPositiveEffects={initialPositiveEffects}
                initialMinimumRating={initialMinimumRating}
                initialOnlyWithReviews={initialOnlyWithReviews}
            />
        </section>
    );
}


