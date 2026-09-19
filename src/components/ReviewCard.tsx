import React from "react";
import { Avatar, Box, IconButton, Stack, Typography } from "@mui/material";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ThumbDownAltOutlinedIcon from "@mui/icons-material/ThumbDownAltOutlined";
import ThumbDownAltIcon from "@mui/icons-material/ThumbDownAlt";
import { Link as RouterLink } from "react-router-dom";
import ProductRating from "./Rating";
import { ProductReview, UserProfile } from "../types/user";
import { getReviewReactionStats, ReviewReactionValue } from "../services/reviewReactions";

type Props = {
    review: ProductReview;
    reviewerProfile?: UserProfile;
    productLink?: string;
    growerLink?: string;
    growerTitle?: string;
    currentUserId?: string | null;
    onReact?: (reviewId: string, reaction: ReviewReactionValue) => Promise<void>;
};

export default function ReviewCard({
    review,
    reviewerProfile,
    productLink,
    growerLink,
    growerTitle,
    currentUserId,
    onReact,
}: Props) {
    const profilePath = `/profiel/${reviewerProfile?.username || review.userId}`;
    const stats = getReviewReactionStats(review, currentUserId);
    const canReact = Boolean(currentUserId && onReact);

    return (
        <Box sx={{ pb: 1, borderBottom: "1px solid #eceff0" }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
                <Avatar src={reviewerProfile?.avatarUrl}>
                    {(review.userName || "U").charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        component={RouterLink}
                        to={profilePath}
                        variant="subtitle2"
                        sx={{ color: "text.secondary", fontWeight: 700, lineHeight: 1.2, textDecoration: "none" }}
                    >
                        {review.userName}
                    </Typography>
                </Box>
            </Stack>

            {(productLink || growerTitle) && (
                <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, mb: 0.25, alignItems: "center", flexWrap: "wrap" }}>
                    {productLink ? (
                        <Typography
                            component={RouterLink}
                            to={productLink}
                            variant="body2"
                            sx={{ color: "text.secondary", textDecoration: "none", fontWeight: 600 }}
                        >
                            {review.productTitle || "Product"}
                        </Typography>
                    ) : (
                        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                            {review.productTitle || "Product"}
                        </Typography>
                    )}
                    {growerTitle && (
                        <>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                |
                            </Typography>
                            {growerLink ? (
                                <Typography
                                    component={RouterLink}
                                    to={growerLink}
                                    variant="body2"
                                    sx={{ color: "text.secondary", textDecoration: "none", fontWeight: 600 }}
                                >
                                    {growerTitle}
                                </Typography>
                            ) : (
                                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                    {growerTitle}
                                </Typography>
                            )}
                        </>
                    )}
                </Stack>
            )}

            <ProductRating rating={review.rating} />
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.35 }}>
                {review.review}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 0.6, alignItems: "center" }}>
                <IconButton
                    size="small"
                    disabled={!canReact}
                    onClick={() => {
                        if (onReact) void onReact(review.id, "up");
                    }}
                >
                    {stats.selected === "up" ? (
                        <ThumbUpAltIcon fontSize="small" color="success" />
                    ) : (
                        <ThumbUpAltOutlinedIcon fontSize="small" />
                    )}
                </IconButton>
                <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 10 }}>
                    {stats.up}
                </Typography>
                <IconButton
                    size="small"
                    disabled={!canReact}
                    onClick={() => {
                        if (onReact) void onReact(review.id, "down");
                    }}
                >
                    {stats.selected === "down" ? (
                        <ThumbDownAltIcon fontSize="small" color="error" />
                    ) : (
                        <ThumbDownAltOutlinedIcon fontSize="small" />
                    )}
                </IconButton>
                <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 10 }}>
                    {stats.down}
                </Typography>
            </Stack>
        </Box>
    );
}
