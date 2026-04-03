import React, { useEffect, useState } from 'react';
import { onSnapshot } from "firebase/firestore";
import { brandCollectionRef, productCollectionRef, reviewsCollectionRef, viewStatsCollectionRef } from '../firebaseCollections';
import { GrowerType } from '../types/grower';
import GrowerCard from './GrowerCard';
import { ProductType } from '../types/product';
import { ProductReview } from '../types/user';

interface brandProp {
    brandId?: string;
}

interface Grower {
    id: string,
    data: GrowerType
    views: number;
    rating: number;
    reviewCount: number;
}

const Leveranciers = ({ brandId }: brandProp) => {
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
        const productsByCode = new Map<string, ProductType>();
        products.forEach((product) => {
            productsByCode.set(product.shortcode, product);
        });

        const reviewAggByGrower: Record<string, { sum: number; count: number }> = {};
        reviews.forEach((review) => {
            const product = productsByCode.get(review.productShortcode);
            const growerShortcode = product?.brand?.shortcode;
            if (!growerShortcode) {
                return;
            }
            if (!reviewAggByGrower[growerShortcode]) {
                reviewAggByGrower[growerShortcode] = { sum: 0, count: 0 };
            }
            reviewAggByGrower[growerShortcode].sum += Number(review.rating || 0);
            reviewAggByGrower[growerShortcode].count += 1;
        });

        const enriched = rawGrowers
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

        setLeveranciers(enriched);
    }, [products, rawGrowers, reviews, viewStats]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <>
            {leveranciers.map((leverancier: Grower) => {
                if (leverancier && leverancier.data) return (
                    <div key={`growercontainer-${leverancier.id}`} style={{ minWidth: 250, height: 280, margin: 16 }}>
                        <GrowerCard
                            key={`growercard-${leverancier.id}`}
                            grower={leverancier.data}
                            rating={leverancier.rating}
                            reviewCount={leverancier.reviewCount}
                        />
                    </div>
                )
                return ""
            }
            )}
        </>
    );
}

export default Leveranciers;
