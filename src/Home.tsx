import { ListType } from "./types/data";
import "./Home.css";
import { Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ProductenPerMerk from "./components/BrandProducts";
import Leveranciers from "./components/Growers";
import CategoryCards from "./components/CategoryCards";

type Props = {
    productList: ListType;
};

export default function PageHome({ productList: _productList }: Props) {
    const heroImage = process.env.REACT_APP_HOME_HERO_IMAGE || "/images/pexels-perfect-lens-6619578.jpg";

    return (
        <section className="home-container">
            <section
                className="home-hero"
                style={{ backgroundImage: `linear-gradient(rgba(8,22,10,.68),rgba(8,22,10,.68)),url(${heroImage})` }}
            >
                <div className="home-hero-content">
                    <Typography component="h1" variant="h3" sx={{ fontWeight: 800, lineHeight: 1.1, color: "#fff", mb: 1 }}>
                        Informatie over cannabisproducten en telers
                    </Typography>
                    <Typography variant="h6" sx={{ color: "rgba(255,255,255,.95)", mb: 2 }}>
                        Bekijk feitelijke productinformatie en vergelijk productsoorten.
                    </Typography>
                    <Button component={RouterLink} to="/cannabis" variant="contained" color="success">
                        Bekijk cannabisproducten
                    </Button>
                </div>
            </section>

            <CategoryCards heading="Ontdek per productsoort" />

            <Box component="section" sx={{ textAlign: "left", my: 5, p: { xs: 3, md: 5 }, borderRadius: 4, bgcolor: "#edf6ef" }}>
                <Typography component="h2" variant="h5" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    Onafhankelijk informatieplatform
                </Typography>
                <Typography variant="body1" sx={{ color: "text.secondary", mt: 1 }}>
                    WeedInfo helpt consumenten informatie over gereguleerde cannabisproducten en telers te vinden.
                    Je kunt via WeedInfo geen cannabis kopen, bestellen of reserveren.
                </Typography>
            </Box>

            <section>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, px: 1 }}>
                    <Typography component="h2" variant="h5" sx={{ color: "text.secondary", fontWeight: 700 }}>
                        Cannabisproducten
                    </Typography>
                    <Button component={RouterLink} to="/cannabis" size="small" color="success">Bekijk alles</Button>
                </Stack>
                <ProductenPerMerk limit={8} carouselOnMobile />
            </section>

            <section className="home-knowledge-band">
                <div className="home-knowledge-image"><img src="/images/pexels-myseeds-35643776.jpg" alt="Cannabisplant van dichtbij" loading="lazy" decoding="async" width="560" height="360" /></div>
                <div className="home-knowledge-copy">
                    <Typography component="p" className="home-eyebrow">Productinformatie begrijpen</Typography>
                    <Typography component="h2" variant="h5" fontWeight={800}>Kijk verder dan alleen een productnaam</Typography>
                    <Typography mt={1}>Productvorm, teler en feitelijke kenmerken geven samen context. WeedInfo brengt die gegevens bij elkaar zonder een product aan te prijzen.</Typography>
                    <Stack component="ul" spacing={1} sx={{ pl: 2.5, my: 2 }}><li>Vergelijk producten binnen dezelfde vorm</li><li>Bekijk wie het product teelt</li><li>Lees gezondheidsinformatie los van reviews</li></Stack>
                    <Button component={RouterLink} to="/informatie/gezondheid-en-risicos" color="success">Lees over gezondheid en risico's</Button>
                </div>
            </section>

            <section>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 4, mb: 1.5, px: 1 }}>
                    <Typography component="h2" variant="h5" sx={{ color: "text.secondary", fontWeight: 700 }}>
                        Telers
                    </Typography>
                    <Button component={RouterLink} to="/telers" size="small" color="success">Bekijk alle telers</Button>
                </Stack>
                <Leveranciers limit={8} carouselOnMobile />
            </section>

            <section className="home-editorial">
                <div className="home-editorial-heading"><div><Typography component="p" className="home-eyebrow">Uit de kennisbank</Typography><Typography component="h2" variant="h5" fontWeight={800}>Lees verder over cannabis</Typography></div><Button component={RouterLink} to="/info" color="success">Alle informatie</Button></div>
                <div className="home-editorial-grid">
                    {[
                        { title: "Gezondheid en risico's", text: "Nuchtere informatie over werking, risico's en betrouwbare hulp.", image: "/images/pexels-rdne-8139067.jpg", to: "/informatie/gezondheid-en-risicos" },
                        { title: "THC en CBD uitgelegd", text: "Wat deze stoffen zijn en waarom één percentage niet het hele verhaal vertelt.", image: "/images/pexels-rdne-8139100.jpg", to: "/info/thc-cbd-uitgelegd" },
                        { title: "Wetgeving en context", text: "Een overzicht van regels, verantwoordelijkheden en actuele context.", image: "/images/pexels-haley-bee-347725846-28862111.jpg", to: "/info/wetgeving-en-gezond-verstand" },
                    ].map(article => <RouterLink className="home-editorial-card" to={article.to} key={article.to}><img src={article.image} alt="" loading="lazy" decoding="async" width="520" height="340" /><span className="home-editorial-overlay"><strong>{article.title}</strong><small>{article.text}</small><em>Lees meer →</em></span></RouterLink>)}
                </div>
            </section>
        </section>
    );
}
