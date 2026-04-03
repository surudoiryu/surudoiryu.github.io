import React from "react";
import { useNavigate } from "react-router-dom";
import { IconButton } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import VerifiedIcon from "@mui/icons-material/Verified";
import { Card, CardContent, CardHeader, CardMedia, Typography } from "@mui/material";
import { ShopType } from "../types/shop";
import { useSignedMediaUrl } from "../hooks/useSignedMediaUrl";
import { shareLink } from "../services/share";
import { useAuth } from "../context/AuthContext";
import ProductRating from "./Rating";

type Props = {
    shop: ShopType;
    rating?: number;
    reviewCount?: number;
};

export default function ShopCard({ shop, rating = 0, reviewCount = 0 }: Props) {
    const navigate = useNavigate();
    const { user, isShopLiked, toggleShopLike } = useAuth();
    const logo = useSignedMediaUrl(shop.logo);

    const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        const shareUrl = `${window.location.origin}/cannabis-winkel/${shop.shortcode}`;
        const result = await shareLink({
            title: shop.name,
            text: `Bekijk ${shop.name}`,
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
            await toggleShopLike(shop.shortcode || "");
        } catch (error) {
            console.warn("Like voor winkel kon niet opgeslagen worden.", error);
        }
    };

    return (
        <Card sx={{ height: "100%" }} onClick={() => navigate(`/cannabis-winkel/${shop.shortcode}`)}>
            <CardHeader
                action={
                    <>
                        <IconButton aria-label="share" onClick={handleShare}>
                            <ShareIcon />
                        </IconButton>
                        <IconButton aria-label="add to favorites" onClick={handleLike}>
                            {isShopLiked(shop.shortcode || "") ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                        </IconButton>
                    </>
                }
                title={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <ProductRating rating={rating} />
                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                            ({reviewCount})
                        </Typography>
                    </span>
                }
            />
            <CardMedia
                component="img"
                height="120"
                image={logo || shop.logo || "/android-chrome-192x192.png"}
                alt={shop.name}
                sx={{ objectFit: "scale-down" }}
            />
            <CardContent sx={{ textAlign: "left" }}>
                <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 700, display: "flex", alignItems: "center", gap: 0.75 }}>
                    {shop.name}
                    {shop.isApproved && <VerifiedIcon fontSize="small" htmlColor="#2e7d32" />}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {shop.description || "Geen omschrijving beschikbaar."}
                </Typography>
            </CardContent>
        </Card>
    );
}
