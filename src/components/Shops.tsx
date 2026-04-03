import React, { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { productCollectionRef, reviewsCollectionRef, shopCollectionRef, viewStatsCollectionRef } from "../firebaseCollections";
import { ShopType } from "../types/shop";
import ShopCard from "./ShopCard";
import { ProductType } from "../types/product";
import { ProductReview } from "../types/user";

type ShopItem = {
    id: string;
    data: ShopType;
    views: number;
    rating: number;
    reviewCount: number;
};

export default function Shops() {
    const [shops, setShops] = useState<ShopItem[]>([]);
    const [rawShops, setRawShops] = useState<ShopItem[]>([]);
    const [products, setProducts] = useState<ProductType[]>([]);
    const [reviews, setReviews] = useState<ProductReview[]>([]);
    const [viewStats, setViewStats] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(shopCollectionRef, (snapshot) => {
            const docs =
                snapshot.docs.some((item) => item.data()?.source === "graphql")
                    ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                    : snapshot.docs;

            const parsed = docs
                .map((docItem) => ({
                    id: docItem.id,
                    data: docItem.data() as ShopType,
                    views: 0,
                    rating: 0,
                    reviewCount: 0,
                }))
                .filter((item) => Boolean(item.data.shortcode));
            setRawShops(parsed);
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
                if (data.type === "shop" && data.shortcode) {
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
        };
    }, []);

    useEffect(() => {
        const shortcodesByProductId = new Map<number, string>();
        products.forEach((product) => {
            shortcodesByProductId.set(product.id, product.shortcode);
        });

        const reviewByProduct: Record<string, { sum: number; count: number }> = {};
        reviews.forEach((review) => {
            if (!reviewByProduct[review.productShortcode]) {
                reviewByProduct[review.productShortcode] = { sum: 0, count: 0 };
            }
            reviewByProduct[review.productShortcode].sum += Number(review.rating || 0);
            reviewByProduct[review.productShortcode].count += 1;
        });

        const nextShops = rawShops
            .map((item) => {
                const productCodes = (item.data.products || [])
                    .map((productId) => shortcodesByProductId.get(productId))
                    .filter((code): code is string => Boolean(code));

                const totals = productCodes.reduce(
                    (acc, code) => {
                        const stats = reviewByProduct[code];
                        if (!stats) {
                            return acc;
                        }
                        acc.sum += stats.sum;
                        acc.count += stats.count;
                        return acc;
                    },
                    { sum: 0, count: 0 }
                );

                const rating = totals.count ? Math.min(5, Math.max(0, Math.ceil(totals.sum / totals.count))) : 0;

                return {
                    ...item,
                    views: viewStats[item.data.shortcode] ?? 0,
                    rating,
                    reviewCount: totals.count,
                };
            })
            .sort((a, b) => b.views - a.views)
            .slice(0, 12);

        setShops(nextShops);
    }, [products, rawShops, reviews, viewStats]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <>
            {shops.map((shop) => (
                <div key={`shopcontainer-${shop.id}`} style={{ minWidth: 250, height: 280, margin: 16 }}>
                    <ShopCard shop={shop.data} rating={shop.rating} reviewCount={shop.reviewCount} />
                </div>
            ))}
        </>
    );
}
