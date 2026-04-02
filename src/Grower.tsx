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

export default function PageGrower() {
    const navigate = useNavigate();
    const location = useLocation();
    const growercode = location.pathname.split("/")[2];

    const [grower, setGrower] = useState<{ id: string; data: GrowerType } | null>(null)
    const [loading, setLoading] = useState(true)

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
        navigate(`/telers`, { replace: true });
    }

    return (
        <section className="product-container">
            <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600 }} onClick={() => openGrowerOverviewPage()}>
                &lt;- Telers Overzicht
            </Typography>

            <section id="headerInfo" style={{ textAlign: 'left', margin: 30 }}>
                <IconButton aria-label="share">
                    <ShareIcon />
                </IconButton>
                <IconButton aria-label="add to favorites">
                    <FavoriteBorderIcon />
                </IconButton>

                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {grower?.data.title}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    <img src={grower?.data.images.logo} alt={grower?.data.title} style={{ maxWidth: "100%" }} />
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
