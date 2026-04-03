import React from "react";
import { useNavigate } from "react-router-dom";
import { ProductType } from "../types/product";
import { useSignedMediaUrl } from "../hooks/useSignedMediaUrl";
import { useAuth } from "../context/AuthContext";
import { shareLink } from "../services/share";
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import ShareIcon from '@mui/icons-material/Share';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import Chip from '@mui/material/Chip';
import BoltIcon from '@mui/icons-material/Bolt';
import ProductRating from "./Rating";

import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt';
import CircleIcon from '@mui/icons-material/Circle';

type Props = {
    product: ProductType;
    reviewCount?: number;
};

function getStrainLabel(type: string | undefined): string {
    const normalized = String(type || "").toLowerCase();
    if (normalized.includes("sativa")) return "Sativa Dominant";
    if (normalized.includes("indica")) return "Indica Dominant";
    return "Hybrid";
}

function getCbdLabel(cbdValue: number): string {
    return cbdValue < 1 ? "< 1%" : `${cbdValue}%`;
}

const ProductCard = ({ product, reviewCount }: Props) => {
    const navigate = useNavigate();
    const rawImageSource =
        product?.thumbnailUrl ||
        product?.images?.main ||
        product?.images?.close ||
        product?.images?.mood ||
        "";
    const thumbnailUrl = useSignedMediaUrl(rawImageSource);
    const imageToShow = thumbnailUrl || rawImageSource || "/android-chrome-192x192.png";
    const { user, isProductLiked, toggleLike } = useAuth();
    const strainLabel = getStrainLabel(product?.type);
    const cbdLabel = getCbdLabel(Number(product?.cbdMax ?? 0));

    if (product === undefined) return (<></>);

    const openProductPage = (selectedProduct: ProductType) => {
        if (selectedProduct) {
            navigate(`/cannabis/${selectedProduct.shortcode}`);
        } else {
            console.log('Something went wrong with selecting a Cannabis Store');
        }
    };

    const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        const shareUrl = `${window.location.origin}/cannabis/${product.shortcode}`;
        const result = await shareLink({
            title: product.title,
            text: `Bekijk ${product.title}`,
            url: shareUrl,
        });
        if (result === "copied") {
            window.alert("Link gekopieerd.");
        }
    };

    const handleLike = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();

        if (!user) {
            navigate("/login");
            return;
        }

        try {
            await toggleLike(product.shortcode);
        } catch (error) {
            console.warn("Like kon niet opgeslagen worden.", error);
        }
    };

    return (
        <Card sx={{ height: '100%' }}>
            <CardHeader
                sx={{ textAlign: 'left' }}
                action={
                    <>
                        <IconButton aria-label="share" onClick={handleShare}>
                            <ShareIcon />
                        </IconButton>
                        <IconButton aria-label="add to favorites" onClick={handleLike}>
                            {isProductLiked(product.shortcode) ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                        </IconButton>
                    </>
                }
                title={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <ProductRating key={`productrating-${product.id}`} rating={product.rating} />
                        {typeof reviewCount === "number" && (
                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                ({reviewCount})
                            </Typography>
                        )}
                    </span>
                }
            />
            <CardMedia
                component="img"
                height="230"
                image={imageToShow}
                alt={product.title}
                sx={{ objectFit: "scale-down" }}
                onClick={() => openProductPage(product)}
            />
            <CardContent sx={{ textAlign: 'left' }} onClick={() => openProductPage(product)}>
                <Chip size="small" icon={<BoltIcon />} label={strainLabel} variant="outlined" />
                <span style={{ float: "right", display: "inline-block" }} ><CircleIcon sx={{ position: "relative", top: "5px" }} fontSize="small" htmlColor={product.dominantTerpene.color} /> {product.dominantTerpene.name}</span>

                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {product.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {product.brand?.title}
                </Typography>

                <br />
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    THC {product.thcMin}% - {product.thcMax}%<br />
                    CBD {cbdLabel}<br />
                    <br />
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    <span style={{ float: "left", display: "inline-block" }}><VolunteerActivismOutlinedIcon sx={{ position: "relative", top: "5px" }} fontSize="small" /> {product.dominantPositiveEffect.name}</span>
                    <span style={{ float: "right", display: "inline-block" }}><ThumbDownOffAltIcon sx={{ position: "relative", top: "5px" }} fontSize="small" /> {product.dominantNegativeEffect.name}</span>
                </Typography>
            </CardContent>
        </Card>
    );
};

export default ProductCard;
