import { Typography } from "@mui/material";
import ProductenPerMerk from "./components/BrandProducts";
import logo from "./logo.svg";

export default function PageProductsOverview() {
    return (
        <section style={{ paddingBottom: 90 }}>
            <header className="App-header" style={{ minHeight: 180 }}>
                <img src={logo} className="App-logo" alt="logo" />
            </header>
            <section style={{ textAlign: "left", margin: "0 16px" }}>
                <Typography variant="h5" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                    Cannabis
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                    Zoek en filter op type, THC/CBD, smaken, telers, effecten, likes en reviews.
                </Typography>
            </section>
            <ProductenPerMerk showFilters />
        </section>
    );
}
