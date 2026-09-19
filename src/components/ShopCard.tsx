import React from "react";
import { useNavigate } from "react-router-dom";
import { IconButton } from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import VerifiedIcon from "@mui/icons-material/Verified";
import LocalParkingIcon from "@mui/icons-material/LocalParking";
import BadgeIcon from "@mui/icons-material/Badge";
import AccessibleIcon from "@mui/icons-material/Accessible";
import DriveEtaIcon from "@mui/icons-material/DriveEta";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { Card, CardContent, CardHeader, CardMedia, Chip, Typography } from "@mui/material";
import { ShopType } from "../types/shop";
import { MEDIA_PLACEHOLDER, mediaFallback } from "../utils/mediaSource";
import { shareLink } from "../services/share";
import { useAuth } from "../context/AuthContext";
import ProductRating from "./Rating";
import { buildShopPath } from "../utils/shopRouting";
import { getShopOpenState } from "../utils/shopOpenStatus";

type Props = {
    shop: ShopType;
    rating?: number;
    reviewCount?: number;
};

function truncateDescription(value: string | undefined, maxLength = 80): string {
    const text = (value || "").trim();
    if (!text) return "Geen omschrijving beschikbaar.";
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trimEnd()}...`;
}

export default function ShopCard({ shop, rating = 0, reviewCount = 0 }: Props) {
    const navigate = useNavigate();
    const { user, isShopLiked, toggleShopLike } = useAuth();
    const logo = MEDIA_PLACEHOLDER;
    const onImageError = mediaFallback();
    const openState = getShopOpenState(shop);

    const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        const shareUrl = `${window.location.origin}${buildShopPath(shop)}`;
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

    const statusColor = (value: boolean) => (value ? "success.main" : "error.main");

    return (
        <Card sx={{ height: "100%" }} onClick={() => navigate(buildShopPath(shop))}>
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
                image={logo}
                alt={shop.name}
                loading="lazy"
                onError={onImageError}
                sx={{ objectFit: "scale-down" }}
            />
            <CardContent sx={{ textAlign: "left" }}>
                <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 700, display: "flex", alignItems: "center", gap: 0.75 }}>
                    {shop.name}
                    {shop.isApproved && <VerifiedIcon fontSize="small" htmlColor="#2e7d32" />}
                </Typography>
                <Chip
                    size="small"
                    label={openState.label}
                    color={openState.isOpen === null ? "default" : (openState.isOpen ? "success" : "error")}
                    sx={{ mt: 0.5, mb: 0.75, fontWeight: 700 }}
                />
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {truncateDescription(shop.description, 80)}
                </Typography>
                <div style={{ display: "flex", flexWrap: "nowrap", gap: 8, marginTop: 8, alignItems: "center" }}>
                    <span title={shop.allowForeigns ? "Iedereen welkom" : "Alleen NL ID"}>
                        <BadgeIcon fontSize="small" sx={{ color: statusColor(shop.allowForeigns) }} />
                    </span>
                    <span title={shop.disabled ? "Toegankelijk voor minder validen" : "Niet toegankelijk"}>
                        <AccessibleIcon fontSize="small" sx={{ color: statusColor(shop.disabled) }} />
                    </span>
                    <span title={shop.drive ? "Heeft drive-thru" : "Geen drive-thru"}>
                        <DriveEtaIcon fontSize="small" sx={{ color: statusColor(shop.drive) }} />
                    </span>
                    <span title={shop.easyParking ? "Makkelijk parkeren" : "Parkeren beperkt"}>
                        <LocalParkingIcon fontSize="small" sx={{ color: statusColor(shop.easyParking) }} />
                    </span>
                    <span title={shop.payByCard ? "Pinnen mogelijk" : "Alleen cash"}>
                        <CreditCardIcon fontSize="small" sx={{ color: statusColor(shop.payByCard) }} />
                    </span>
                    <span title={shop.pickup ? "Afhalen" : "Binnen verblijven"}>
                        <StorefrontIcon fontSize="small" sx={{ color: statusColor(shop.pickup) }} />
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

