import React from "react";
import { useNavigate } from "react-router-dom";
import { GrowerType } from "../types/grower";
import { useSignedMediaUrl } from "../hooks/useSignedMediaUrl";
import { useAuth } from "../context/AuthContext";
import { shareLink } from "../services/share";
import ProductRating from "./Rating";
import IconButton from "@mui/material/IconButton";
import ShareIcon from "@mui/icons-material/Share";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import VerifiedIcon from "@mui/icons-material/Verified";
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';

type Props = {
    grower: GrowerType | undefined;
    rating?: number;
    reviewCount?: number;
};

const GrowerCard = ({ grower, rating = 0, reviewCount = 0 }: Props) => {
    const navigate = useNavigate();
    const { user, isGrowerLiked, toggleGrowerLike } = useAuth();
    const thumbnailUrl = useSignedMediaUrl(grower?.thumbnailUrl);
    if(grower === undefined) return (<></>)

    const openGrowerPage = (grower: GrowerType) => {
        if (grower) {
            navigate(`/telers/${grower.shortcode}`);
        } else {
            console.log('Something went wrong with selecting a Cannabis Grower')
        }
    }

    const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        const shareUrl = `${window.location.origin}/telers/${grower.shortcode}`;
        const result = await shareLink({
            title: grower.title,
            text: `Bekijk ${grower.title}`,
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
            await toggleGrowerLike(grower.shortcode || "");
        } catch (error) {
            console.warn("Like voor teler kon niet opgeslagen worden.", error);
        }
    };

    return (
        <Card sx={{ height: '100%' }} onClick={() => openGrowerPage(grower)}>
            <CardHeader
                action={
                    <>
                        <IconButton aria-label="share" onClick={handleShare}>
                            <ShareIcon />
                        </IconButton>
                        <IconButton aria-label="add to favorites" onClick={handleLike}>
                            {isGrowerLiked(grower.shortcode || "") ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
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
                image={thumbnailUrl || grower.thumbnailUrl}
                alt={grower.title}
                sx={{ objectFit: "scale-down"}}
            />
            <CardContent sx={{ textAlign: 'left' }}>
                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600, display: "flex", alignItems: "center", gap: 0.75 }}>
                    {grower.title}
                    {grower.isApproved && <VerifiedIcon fontSize="small" htmlColor="#2e7d32" />}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {grower.shortDescription}
                </Typography>
            </CardContent>
        </Card>
    );
};

export default GrowerCard;
