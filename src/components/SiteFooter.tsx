import { Box, Divider, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function SiteFooter() {
    return (
        <Box component="footer" sx={{ mt: 5, pb: { xs: 10, md: 3 } }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
                WeedInfo is een onafhankelijk informatieplatform. Je kunt via WeedInfo geen cannabis kopen, bestellen of reserveren.
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
                <Link component={RouterLink} underline="hover" to="/over-weedinfo">Over WeedInfo</Link>
                <Link component={RouterLink} underline="hover" to="/informatie/gezondheid-en-risicos">Gezondheid en risico's</Link>
                <Link component={RouterLink} underline="hover" to="/privacy">Privacy</Link>
                <Link component={RouterLink} underline="hover" to="/cookies">Cookies</Link>
                <Link component={RouterLink} underline="hover" to="/gebruiksvoorwaarden">Gebruiksvoorwaarden</Link>
                <Link component={RouterLink} underline="hover" to="/disclaimer">Disclaimer</Link>
            </Stack>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1.5 }}>
                Informatie voor volwassenen. Cannabisgebruik brengt risico's met zich mee.
            </Typography>
        </Box>
    );
}

