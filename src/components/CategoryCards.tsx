import { Box, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const items = [
  { label: "Wiet", path: "/cannabis/wiet", image: "/images/pexels-alesiakozik-8336403.jpg", text: "Gedroogde cannabisbloemen" },
  { label: "Hasj", path: "/cannabis/hasj", image: "/images/pexels-elsa-olofsson-3357043-6321769.jpg", text: "Geperste of verwerkte hars" },
  { label: "Joints", path: "/cannabis/joints", image: "/images/pexels-bxxxty-5564076.jpg", text: "Voorgerolde cannabisproducten" },
  { label: "Edibles", path: "/cannabis/edibles", image: "/images/pexels-kindelmedia-7667903.jpg", text: "Eetbare cannabisproducten" },
];

export default function CategoryCards({ heading = "Eerst kiezen wat je zoekt" }: { heading?: string }) {
  return <Box component="section" sx={{ my: 4 }}>
    <Typography component="h2" variant="h5" fontWeight={800} mb={2}>{heading}</Typography>
    <Box component="nav" aria-label="Cannabiscategorieën" sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, gap: 2 }}>
      {items.map(item => <Box key={item.path} component={RouterLink} to={item.path} sx={{ position: "relative", display: "block", minHeight: { xs: 170, md: 220 }, color: "white", textDecoration: "none", overflow: "hidden", borderRadius: 3, boxShadow: "0 10px 28px rgba(20,45,27,.16)", transition: "transform .2s,box-shadow .2s", "&:hover": { transform: "translateY(-4px)", boxShadow: "0 16px 36px rgba(20,45,27,.23)" }, "&:hover img": { transform: "scale(1.035)" }, "&:focus-visible": { outline: "3px solid #ef9b0f", outlineOffset: 3 } }}>
        <Box component="img" src={item.image} alt="" loading="lazy" decoding="async" width={420} height={260} sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform .3s" }} />
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", p: { xs: 2, md: 2.5 }, background: "linear-gradient(180deg,rgba(7,18,10,.02) 20%,rgba(7,18,10,.84) 100%)" }}>
          <Typography component="span" variant="h6" fontWeight={800} display="block">{item.label}</Typography>
          <Typography component="span" variant="body2" sx={{ color: "rgba(255,255,255,.9)" }}>{item.text}</Typography>
        </Box>
      </Box>)}
    </Box>
  </Box>;
}
