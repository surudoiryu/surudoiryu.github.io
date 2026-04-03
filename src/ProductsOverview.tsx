import { Typography } from "@mui/material";
import ProductenPerMerk from "./components/BrandProducts";
import { useLocation } from "react-router-dom";

export default function PageProductsOverview() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const initialType = params.get("type") ?? undefined;
    const initialSearch = params.get("q") ?? undefined;

    return (
        <section style={{ paddingBottom: 90 }}>
            <section style={{ textAlign: "left", margin: "0 16px" }}>
                <Typography variant="h5" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                    Cannabis
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                    Zoek en filter op type, THC/CBD, smaken, telers, effecten, likes en reviews.
                </Typography>
            </section>
            <ProductenPerMerk showFilters initialSearchTerm={initialSearch} initialType={initialType} />
        </section>
    );
}


