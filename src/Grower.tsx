import React, { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { brandCollectionRef } from './firebaseCollections';
import './Grower.css';
import { IconButton,  Typography } from "@mui/material";
import { GrowerType } from './types/grower';
import { useLocation, useNavigate } from "react-router-dom";
import ShareIcon from '@mui/icons-material/Share';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ProductenPerMerk from "./components/BrandProducts";
import { useSignedMediaUrl } from "./hooks/useSignedMediaUrl";
import { shareLink } from "./services/share";
import { incrementEntityView } from "./services/viewStats";

export default function PageGrower() {
    const navigate = useNavigate();
    const location = useLocation();
    const growercode = location.pathname.split("/")[2];

    const [grower, setGrower] = useState<{ id: string; data: GrowerType } | null>(null)
    const [loading, setLoading] = useState(true)
    const growerLogoUrl = useSignedMediaUrl(grower?.data?.images?.logo || grower?.data?.thumbnailUrl);

    useEffect(() => {
        void incrementEntityView("grower", growercode).catch((error) => {
            console.warn("Teler view kon niet opgeslagen worden.", error);
        });
    }, [growercode]);

    useEffect(() => {
        const unsubscribe = onSnapshot(brandCollectionRef, async (snapshot) => {
            await Promise.all(snapshot.docs.map(async (doc) => {
                const growerData = doc.data() as GrowerType

                if (growerData?.shortcode === growercode) {
                    setGrower({
                        id: doc.id,
                        data: growerData,
                    })
                }
            }))

            setLoading(false)
        })

        return () => {
            unsubscribe()
        }
    }, [growercode])

    if (loading) {
        return <div>Loading...</div>;
    }

    const openGrowerOverviewPage = () => {
        navigate(`/telers`);
    }

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/telers/${growercode}`;
        const result = await shareLink({
            title: grower?.data.title ?? "Teler",
            text: `Bekijk ${grower?.data.title ?? "deze teler"}`,
            url: shareUrl,
        });
        if (result === "copied") {
            window.alert("Link gekopieerd.");
        }
    };

    return (
        <section className="product-container">
            <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600 }} onClick={() => openGrowerOverviewPage()}>
                &lt;- Telers Overzicht
            </Typography>

            <section id="headerInfo" style={{ textAlign: 'left', margin: 30 }}>
                <IconButton aria-label="share" onClick={() => { void handleShare(); }}>
                    <ShareIcon />
                </IconButton>
                <IconButton aria-label="add to favorites">
                    <FavoriteBorderIcon />
                </IconButton>

                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {grower?.data.title}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    <img src={growerLogoUrl || grower?.data.images.logo} alt={grower?.data.title} style={{ maxWidth: "100%" }} />
                </Typography>
                
            </section>

            <section>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {grower?.data.description}
                    <br /><br /><br />
                </Typography>

                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Beschikbare producten
                </Typography>
                <div style={{ width: "100%", overflow: "auto", display: "block" }}>
                    <ProductenPerMerk brandId={grower?.data.title} />
                </div>
            </section>
        </section>
    )
}


