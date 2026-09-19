import React, { useEffect, useState } from 'react';
import { onSnapshot } from "firebase/firestore";
import { brandCollectionRef, productCollectionRef, reviewsCollectionRef, viewStatsCollectionRef } from '../firebaseCollections';
import { GrowerType } from '../types/grower';
import GrowerCard from './GrowerCard';
import { ProductType } from '../types/product';
import { ProductReview } from '../types/user';
import { Box } from '@mui/material';
import { aggregateProductReviewStats } from '../utils/reviewStats';

interface brandProp {
    brandId?: string;
    limit?: number;
    carouselOnMobile?: boolean;
}

interface Grower {
    id: string,
    data: GrowerType
    views: number;
    rating: number;
    reviewCount: number;
}

const Leveranciers = ({ brandId, limit, carouselOnMobile = false }: brandProp) => {
    const [leveranciers, setLeveranciers] = useState<Grower[]>([])
    const [rawGrowers, setRawGrowers] = useState<Grower[]>([]);
    const [products, setProducts] = useState<ProductType[]>([]);
    const [reviews, setReviews] = useState<ProductReview[]>([]);
    const [viewStats, setViewStats] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onSnapshot(brandCollectionRef, (snapshot) => {
            const docs =
                snapshot.docs.some((item) => item.data()?.source === "graphql")
                    ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                    : snapshot.docs;

            const growers = docs
                .map((docItem) => ({
                    id: docItem.id,
                    data: docItem.data() as GrowerType,
                    views: 0,
                    rating: 0,
                    reviewCount: 0,
                }))
                .filter((item) => (!brandId || item.data?.title === brandId));

            setRawGrowers(growers);
            setLoading(false);
        });

        const unsubscribeProducts = onSnapshot(productCollectionRef, (snapshot) => {
            const docs =
                snapshot.docs.some((item) => item.data()?.source === "graphql")
                    ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                    : snapshot.docs;
            setProducts(docs.map((item) => item.data() as ProductType));
        });

        const unsubscribeReviews = onSnapshot(reviewsCollectionRef, (snapshot) => {
            setReviews(
                snapshot.docs.map((item) => ({
                    id: item.id,
                    ...(item.data() as Omit<ProductReview, "id">),
                }))
            );
        });

        const unsubscribeViews = onSnapshot(viewStatsCollectionRef, (snapshot) => {
            const nextStats: Record<string, number> = {};
            snapshot.docs.forEach((item) => {
                const data = item.data() as { type?: string; shortcode?: string; views?: number };
                if (data.type === "grower" && data.shortcode) {
                    nextStats[data.shortcode] = Number(data.views ?? 0);
                }
            });
            setViewStats(nextStats);
        });

        return () => {
            unsubscribe();
            unsubscribeProducts();
            unsubscribeReviews();
            unsubscribeViews();
        }
    }, [brandId]);

    useEffect(() => {
        const productStats = aggregateProductReviewStats(reviews, products);

        const reviewAggByGrower: Record<string, { sum: number; count: number }> = {};
        products.forEach((product) => {
            const canonicalCode = product.shortcode;
            const stats = productStats[canonicalCode];
            if (!stats) {
                return;
            }
            const growerShortcode = product?.brand?.shortcode;
            if (!growerShortcode) {
                return;
            }
            if (!reviewAggByGrower[growerShortcode]) {
                reviewAggByGrower[growerShortcode] = { sum: 0, count: 0 };
            }
            reviewAggByGrower[growerShortcode].sum += stats.rating * stats.count;
            reviewAggByGrower[growerShortcode].count += stats.count;
        });

        let enriched = rawGrowers
            .map((grower) => {
                const code = grower.data.shortcode || "";
                const stats = reviewAggByGrower[code];
                const reviewCount = stats?.count ?? 0;
                const rating = reviewCount ? Math.min(5, Math.max(0, Math.ceil(stats.sum / reviewCount))) : 0;
                return {
                    ...grower,
                    views: viewStats[code] ?? 0,
                    rating,
                    reviewCount,
                };
            })
            .sort((a, b) => b.views - a.views);

        if (typeof limit === "number" && limit > 0) {
            enriched = enriched.slice(0, limit);
        }

        setLeveranciers(enriched);
    }, [products, rawGrowers, reviews, viewStats]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Box
            sx={
                carouselOnMobile
                    ? {
                        width: "100%",
                        display: { xs: "flex", md: "grid" },
                        overflowX: { xs: "auto", md: "visible" },
                        gap: { xs: 1.25, md: 2 },
                        gridTemplateColumns: { md: "repeat(4, minmax(0, 1fr))" },
                        pb: { xs: 1, md: 0 },
                    }
                    : {
                        width: "100%",
                        display: "grid",
                        gap: { xs: 1, sm: 1.5, md: 2 },
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "repeat(2, minmax(0, 1fr))",
                            md: "repeat(3, minmax(0, 1fr))",
                            lg: "repeat(4, minmax(0, 1fr))",
                        },
                    }
            }
        >
            {leveranciers.map((leverancier: Grower) => {
                if (leverancier && leverancier.data) return (
                    <div
                        key={`growercontainer-${leverancier.id}`}
                        style={{ minWidth: carouselOnMobile ? 260 : 0, flex: carouselOnMobile ? "0 0 260px" : undefined }}
                    >
                        <GrowerCard
                            key={`growercard-${leverancier.id}`}
                            grower={leverancier.data}
                            rating={leverancier.rating}
                            reviewCount={leverancier.reviewCount}
                        />
                    </div>
                )
                return null
            }
            )}
        </Box>
    );
}

export default Leveranciers;
