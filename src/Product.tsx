import React, { useEffect, useState } from "react";
import { DocumentReference, collection, getDocs, doc, query, where, onSnapshot, getDoc } from "firebase/firestore";
import { productCollectionRef } from './firebaseCollections';
import Loader from './components/Loader';
import logo from './logo.svg';
import './Product.css';
import { Button, IconButton, LinearProgress, Typography } from "@mui/material";
import { GrowerType } from './types/grower';
import { EffectType } from './types/effect';
import { TerpeneType } from './types/terpene';
import { ProductType } from "./types/product";
import { useLocation, useNavigate } from "react-router-dom";
import ShareIcon from '@mui/icons-material/Share';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import Chip from '@mui/material/Chip';
import FaceIcon from '@mui/icons-material/Face';
import BoltIcon from '@mui/icons-material/Bolt';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import WeekendIcon from '@mui/icons-material/Weekend';
import ProductRating from "./components/Rating";
import CircleIcon from '@mui/icons-material/Circle';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import { TasteType } from "./types/taste";

export default function PageProduct() {
    const navigate = useNavigate();
    const location = useLocation();
    const productcode = location.pathname.split("/")[2];

    const [product, setProduct] = useState<any>()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null);

    async function fetchTastes(tasteRefs: DocumentReference[]) {
        const tastePromises = Object.values(tasteRefs).map(ref => getDoc(ref) );
        const tasteSnapshots = await Promise.all(tastePromises);
        return tasteSnapshots.map(snap => snap.exists() ? snap.data() as TasteType : undefined);
    }

    async function fetchTerpenes(terpeneRefs: DocumentReference[]) {
        const terpenesPromises = Object.values(terpeneRefs).map(ref => getDoc(ref));
        const terpenesSnapshots = await Promise.all(terpenesPromises);
        return terpenesSnapshots.map(snap => snap.exists() ? snap.data() as TerpeneType : undefined);
    }

    async function fetchPositiveEffects(positiveRefs: DocumentReference[]) {
        const positivePromises = Object.values(positiveRefs).map(ref => getDoc(ref));
        const positiveSnapshots = await Promise.all(positivePromises);
        return positiveSnapshots.map(snap => snap.exists() ? snap.data() as EffectType : undefined);
    }
    
    async function fetchNegativeEffects(negativeRefs: DocumentReference[]) {
        const negativePromises = Object.values(negativeRefs).map(ref => getDoc(ref));
        const negativeSnapshots = await Promise.all(negativePromises);
        return negativeSnapshots.map(snap => snap.exists() ? snap.data() as EffectType : undefined);
    }
    
    useEffect(() => {
        const unsubscribe = onSnapshot(productCollectionRef, async (snapshot) => {
            const Products = await Promise.all(snapshot.docs.map(async (doc) => {
                const productData = doc.data() as ProductType
                let brandData: GrowerType | undefined
                let negativeEffectData: EffectType | undefined
                let positiveEffectData: EffectType | undefined
                let terpeneData: TerpeneType | undefined
                //let tasteData: TasteType[] = []

                // Get the brand for this product
                if (productData.brand && productData.brand instanceof DocumentReference) {
                    const brandSnapshot = await getDoc(productData.brand)
                    if (brandSnapshot.exists()) {
                        brandData = brandSnapshot.data() as GrowerType
                    }
                }

                // Get the dominant terpene for this product
                if (productData.dominantTerpene && productData.dominantTerpene instanceof DocumentReference) {
                    const terpeneSnapshot = await getDoc(productData.dominantTerpene)
                    if (terpeneSnapshot.exists()) {
                        terpeneData = terpeneSnapshot.data() as TerpeneType
                    }
                }

                // Get the dominant negative effect for this product
                if (productData.dominantNegativeEffect && productData.dominantNegativeEffect instanceof DocumentReference) {
                    const negativeEffectSnapshot = await getDoc(productData.dominantNegativeEffect)
                    if (negativeEffectSnapshot.exists()) {
                        negativeEffectData = negativeEffectSnapshot.data() as EffectType
                    }
                }

                // Get the dominant negative effect for this product
                if (productData.dominantPositiveEffect && productData.dominantPositiveEffect instanceof DocumentReference) {
                    const positiveEffectSnapshot = await getDoc(productData.dominantPositiveEffect)
                    if (positiveEffectSnapshot.exists()) {
                        positiveEffectData = positiveEffectSnapshot.data() as EffectType
                    }
                }

                // Fetch tastes
                const tasteData = productData.tastes ? await fetchTastes(productData.tastes) : [];
                const terpenesData = productData.terpenes ? await fetchTerpenes(productData.terpenes) : [];
                const negativesEffectData = productData.negativeEffects ? await fetchNegativeEffects(productData.negativeEffects) : [];
                const positivesEffectData = productData.positiveEffects ? await fetchPositiveEffects(productData.positiveEffects) : [];

                if (productData?.shortcode === productcode) {
                    return {
                        id: doc.id,
                        data: {
                            ...productData,
                            dominantTerpene: terpeneData,
                            dominantNegativeEffect: negativeEffectData,
                            dominantPositiveEffect: positiveEffectData,
                            tastes: tasteData,
                            terpenes: terpenesData,
                            negativeEffects: negativesEffectData,
                            positiveEffects: positivesEffectData,
                        },
                        brand: brandData
                    }
                }

                return null
            }))

            setLoading(false)
            setProduct(Products[0])
        })

        return () => {
            unsubscribe()
        }
    }, [])

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error loading shop data: {error}</div>;
    }

    const openProductOverviewPage = () => {
        navigate(`/cannabis`, { replace: true });
    }

    return (
        <section className="product-container">
            <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600 }} onClick={() => openProductOverviewPage()}>
                &lt;- Producten Overzicht
            </Typography>

            <section id="headerInfo" style={{ textAlign: 'left', margin: 30 }}>
                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {product?.data.title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {product?.data.shortDescription}
                </Typography>
                <ProductRating rating={product?.data.rating} />

                <Chip size="small" icon={<BoltIcon />} label={product?.data.dominantTerpene.energic > 50 ? "Sativa Dominant" : (product?.data.dominantTerpene.energic === product?.data.dominantTerpene.relaxing) ? "Hybrid" : "Indica Dominant"} variant="outlined" />
                <IconButton aria-label="share">
                    <ShareIcon />
                </IconButton>
                <IconButton aria-label="add to favorites">
                    <FavoriteBorderIcon />
                </IconButton>
                
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    <img src={product?.data.images.main} alt={product?.data.title} style={{ maxWidth: "100%" }} />
                </Typography>
            </section>

            <section>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    THC {product?.data.thcMin}% - {product?.data.thcMax}%<br />
                    CBD {product?.data.cbdMin === 0 ? `< ${product?.data.cbdMax}%` : `${product?.data.cbdMin}% - ${product?.data.cbdMax}%`}<br />
                    <br />
                </Typography>
                <CircleIcon fontSize="small" htmlColor={product?.data.dominantTerpene.color} /> {product?.data.dominantTerpene.name}
<br />
                kalmerend, energiek
                <LinearProgress variant="determinate" value={product?.data.dominantTerpene.energic} />
                <br />
                THC gehalte, energiek
                <LinearProgress variant="determinate" value={product?.data.thcMax / 35 * 100} />
<br />          
                Smaak
                <VolunteerActivismOutlinedIcon fontSize="small" /> {product?.data.dominantPositiveEffect.name}
                <br />
                Effect
                <VolunteerActivismOutlinedIcon fontSize="small" /> {product?.data.dominantPositiveEffect.name}
            </section>

            <section id="shopDetails" style={{ textAlign: 'left', marginBottom: '30px' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {product?.data.description}
                </Typography>
                {product?.data.tastes.map((taste: TasteType) => taste.name)}
            </section>
        </section>
    )
}