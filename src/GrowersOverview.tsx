import { Typography } from "@mui/material";
import Leveranciers from "./components/Growers";

export default function PageGrowersOverview() {
    return (
        <section style={{ paddingBottom: 90 }}>
            <section style={{ textAlign: "left", margin: "0 16px" }}>
                <Typography variant="h5" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                    Telers
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                    Alle aangesloten telers uit de actuele dataset.
                </Typography>
            </section>
            <section style={{ width: "100%", overflow: "auto", display: "flex", flexWrap: "wrap" }}>
                <Leveranciers />
            </section>
        </section>
    );
}
