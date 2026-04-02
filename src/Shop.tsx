import React, { useEffect, useMemo, useState } from "react";
import { Alert, Card, CardContent, Chip, Divider, Typography } from "@mui/material";
import { useLocation } from "react-router-dom";
import { onSnapshot } from "firebase/firestore";
import GrowerCard from "./components/GrowerCard";
import ProductCard from "./components/ProductCard";
import { brandCollectionRef, productCollectionRef, reviewsCollectionRef, shopCollectionRef } from "./firebaseCollections";
import { GrowerType } from "./types/grower";
import { ProductType } from "./types/product";
import { ShopType } from "./types/shop";
import { ProductReview } from "./types/user";
import "./Shop.css";

export default function PageShop() {
    const location = useLocation();
    const shopcode = location.pathname.split("/")[2];

    const [shops, setShops] = useState<ShopType[]>([]);
    const [products, setProducts] = useState<ProductType[]>([]);
    const [growers, setGrowers] = useState<GrowerType[]>([]);
    const [reviews, setReviews] = useState<ProductReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubs: Array<() => void> = [];

        unsubs.push(
            onSnapshot(shopCollectionRef, (snapshot) => {
                const docs =
                    snapshot.docs.some((item) => item.data()?.source === "graphql")
                        ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                        : snapshot.docs;
                setShops(docs.map((item) => item.data() as ShopType));
                setLoading(false);
            })
        );

        unsubs.push(
            onSnapshot(productCollectionRef, (snapshot) => {
                const docs =
                    snapshot.docs.some((item) => item.data()?.source === "graphql")
                        ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                        : snapshot.docs;
                setProducts(docs.map((item) => item.data() as ProductType));
            })
        );

        unsubs.push(
            onSnapshot(brandCollectionRef, (snapshot) => {
                const docs =
                    snapshot.docs.some((item) => item.data()?.source === "graphql")
                        ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                        : snapshot.docs;
                setGrowers(docs.map((item) => item.data() as GrowerType));
            })
        );

        unsubs.push(
            onSnapshot(reviewsCollectionRef, (snapshot) => {
                setReviews(
                    snapshot.docs.map((item) => ({
                        id: item.id,
                        ...(item.data() as Omit<ProductReview, "id">),
                    }))
                );
            })
        );

        return () => {
            unsubs.forEach((unsubscribe) => unsubscribe());
        };
    }, []);

    const selectedShop = useMemo(
        () => shops.find((shop) => shop.shortcode === shopcode),
        [shops, shopcode]
    );

    const shopProducts = useMemo(() => {
        if (!selectedShop) {
            return [];
        }
        const productIds = new Set(selectedShop.products ?? []);
        return products.filter((product) => productIds.has(product.id));
    }, [products, selectedShop]);

    const shopGrowers = useMemo(() => {
        if (!selectedShop) {
            return [];
        }

        const growerIds = new Set<number>(selectedShop.growers ?? []);
        if (growerIds.size === 0) {
            shopProducts.forEach((product) => growerIds.add(product.grower));
        }

        return growers.filter((grower) => growerIds.has(grower.id));
    }, [growers, selectedShop, shopProducts]);

    const shopReviews = useMemo(() => {
        const productCodes = new Set(shopProducts.map((product) => product.shortcode));
        return reviews.filter((review) => productCodes.has(review.productShortcode));
    }, [reviews, shopProducts]);

    const averageReview = useMemo(() => {
        if (!shopReviews.length) {
            return 0;
        }
        const total = shopReviews.reduce((sum, item) => sum + item.rating, 0);
        return total / shopReviews.length;
    }, [shopReviews]);

    if (loading) {
        return <section className="shop-container">Loading...</section>;
    }

    if (error) {
        return <section className="shop-container"><Alert severity="error">{error}</Alert></section>;
    }

    if (!selectedShop) {
        return (
            <section className="shop-container" style={{ textAlign: "left", margin: 30 }}>
                <Alert severity="warning">
                    Deze cannabis-winkel is nog niet beschikbaar in de actuele dataset.
                </Alert>
            </section>
        );
    }

    return (
        <section className="shop-container" style={{ textAlign: "left", margin: 20, paddingBottom: 90 }}>
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Typography variant="h5" sx={{ color: "text.secondary", fontWeight: 700 }}>
                        {selectedShop.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                        {selectedShop.description || "Geen omschrijving beschikbaar."}
                    </Typography>
                    <img
                        src={selectedShop.logo}
                        alt={selectedShop.name}
                        style={{ maxWidth: "100%", maxHeight: 160, objectFit: "contain" }}
                    />
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Rating winkel: <strong>{selectedShop.rating}/5</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Reviews op producten in deze winkel:{" "}
                        <strong>
                            {shopReviews.length
                                ? `${averageReview.toFixed(1)}/5 (${shopReviews.length})`
                                : "Nog geen reviews"}
                        </strong>
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Open van: <strong>{selectedShop.openFrom || "-"}</strong> tot{" "}
                        <strong>{selectedShop.openTill || "-"}</strong>
                    </Typography>
                    <div style={{ marginTop: 8 }}>
                        {selectedShop.allowForeigns && <Chip label="Buitenlanders toegestaan" size="small" sx={{ mr: 1, mb: 1 }} />}
                        {selectedShop.drive && <Chip label="Drive-through" size="small" sx={{ mr: 1, mb: 1 }} />}
                        {selectedShop.easyParking && <Chip label="Parkeren mogelijk" size="small" sx={{ mr: 1, mb: 1 }} />}
                        {selectedShop.payByCard && <Chip label="Pinnen mogelijk" size="small" sx={{ mr: 1, mb: 1 }} />}
                        {selectedShop.pickup && <Chip label="Pickup-point" size="small" sx={{ mr: 1, mb: 1 }} />}
                        {selectedShop.disabled && <Chip label="Rolstoeltoegankelijk" size="small" sx={{ mr: 1, mb: 1 }} />}
                    </div>
                </CardContent>
            </Card>

            <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 700, ml: 1 }}>
                Telers in deze winkel
            </Typography>
            <div style={{ width: "100%", overflow: "auto", display: "flex", marginBottom: 20 }}>
                {shopGrowers.length > 0 ? (
                    shopGrowers.map((grower) => (
                        <div key={`grower-${grower.id}`} style={{ minWidth: 250, height: 280, margin: 12 }}>
                            <GrowerCard grower={grower} />
                        </div>
                    ))
                ) : (
                    <Typography sx={{ m: 2, color: "text.secondary" }}>Nog geen telerinformatie beschikbaar.</Typography>
                )}
            </div>

            <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 700, ml: 1 }}>
                Producten in deze winkel
            </Typography>
            <div style={{ width: "100%", overflow: "auto", display: "flex", marginBottom: 20 }}>
                {shopProducts.length > 0 ? (
                    shopProducts.map((product) => (
                        <div key={`product-${product.id}`} style={{ minWidth: 350, height: 500, margin: 12 }}>
                            <ProductCard product={product} />
                        </div>
                    ))
                ) : (
                    <Typography sx={{ m: 2, color: "text.secondary" }}>Nog geen producten gekoppeld aan deze winkel.</Typography>
                )}
            </div>

            <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 700, ml: 1 }}>
                Laatste reviews
            </Typography>
            {shopReviews.length === 0 ? (
                <Typography sx={{ m: 1, color: "text.secondary" }}>Nog geen reviews beschikbaar.</Typography>
            ) : (
                shopReviews.slice(0, 6).map((review) => (
                    <Card key={review.id} sx={{ mb: 1 }}>
                        <CardContent>
                            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                {review.productTitle} - {review.rating}/5
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                                {review.userName}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                {review.review}
                            </Typography>
                        </CardContent>
                    </Card>
                ))
            )}
        </section>
    );
}
