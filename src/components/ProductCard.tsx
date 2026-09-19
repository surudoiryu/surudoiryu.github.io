import React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { ProductType } from "../types/product";
import { productMainImageUrl, MEDIA_PLACEHOLDER, mediaFallback } from "../utils/mediaSource";
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
import { getProductPath } from "../utils/productSlug";

import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt';

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

function getStrainChipSx(type: string | undefined) {
    const normalized = String(type || "").toLowerCase();
    if (normalized.includes("sativa")) {
        return { backgroundColor: "rgba(46, 125, 50, 0.92)", color: "#fff" };
    }
    if (normalized.includes("indica")) {
        return { backgroundColor: "rgba(21, 101, 192, 0.92)", color: "#fff" };
    }
    return { backgroundColor: "rgba(109, 76, 65, 0.92)", color: "#fff" };
}

const ProductCard = ({ product, reviewCount }: Props) => {
    const navigate = useNavigate();
    const imageToShow = productMainImageUrl(product) || MEDIA_PLACEHOLDER;
    const onImageError = mediaFallback();
    const { user, isProductLiked, toggleLike } = useAuth();
    const strainLabel = getStrainLabel(product?.type);
    const strainChipSx = getStrainChipSx(product?.type);
    const categoryLabel = product?.categoryName || "Cannabis";

    if (product === undefined) return (<></>);

    const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        const shareUrl = `${window.location.origin}${getProductPath(product)}`;
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
            <div style={{ position: "relative" }}>
                <RouterLink to={getProductPath(product)} aria-label={`Bekijk ${product.title}`}>
                <CardMedia
                    component="img"
                    height="230"
                    width="400"
                    image={imageToShow}
                    alt={product.title}
                    loading="lazy"
                    onError={onImageError}
                    decoding="async"
                    sx={{ objectFit: "scale-down", aspectRatio: "40 / 23" }}
                />
                </RouterLink>
                <Chip
                    size="small"
                    icon={<BoltIcon />}
                    label={strainLabel}
                    variant="filled"
                    sx={{
                        position: "absolute",
                        right: 8,
                        bottom: 8,
                        ...strainChipSx,
                        "& .MuiChip-icon": { color: "inherit" },
                    }}
                />
            </div>
            <CardContent sx={{ textAlign: 'left' }}>
                <Typography component={RouterLink} to={getProductPath(product)} variant="h5" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {product.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {categoryLabel}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {product.brand?.title}
                </Typography>

                <Typography
                    variant="body2"
                    sx={{
                        color: 'text.secondary',
                        mt: 1.75,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 1,
                    }}
                >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><VolunteerActivismOutlinedIcon fontSize="small" /> {product.dominantPositiveEffect.name}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><ThumbDownOffAltIcon fontSize="small" /> {product.dominantNegativeEffect.name}</span>
                </Typography>
            </CardContent>
        </Card>
    );
};

export default ProductCard;
