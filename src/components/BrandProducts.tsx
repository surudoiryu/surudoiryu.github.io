import React, { useEffect, useState } from 'react';
import { DocumentReference, collection, getDocs, doc, query, where, onSnapshot, getDoc } from "firebase/firestore";
import { ProductType } from '../types/product';
import { productCollectionRef } from '../firebaseCollections';
import { GrowerType } from '../types/grower';
import { EffectType } from '../types/effect';
import { TerpeneType } from '../types/terpene';
import ProductCard from './ProductCard';

interface brandProp {
    brandId?: string;
    limit?: number;
}

interface Product {
    id: string,
    data: ProductType,
    brand?: GrowerType
}

const ProductenPerMerk = ({brandId, limit}: brandProp) => {
    const [producten, setProducten] = useState<any>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(productCollectionRef, async (snapshot) => {
            const Products = await Promise.all(snapshot.docs.map(async (doc) => {
                const productData = doc.data() as ProductType
                let brandData: GrowerType | undefined
                let negativeEffectData: EffectType | undefined
                let positiveEffectData: EffectType | undefined
                let terpeneData: TerpeneType | undefined

                // Get the brand for this product
                if(productData.brand && productData.brand instanceof DocumentReference) {
                    const brandSnapshot = await getDoc(productData.brand)
                    if(brandSnapshot.exists()) {
                        brandData = brandSnapshot.data() as GrowerType
                    }
                }

                // Get the dominant terpene for this product
                if (productData.dominantTerpene && productData.dominantTerpene instanceof DocumentReference) {
                    const terpeneSnapshot = await getDoc(productData.dominantTerpene)
                    if (terpeneSnapshot.exists()) {
                        terpeneData = terpeneSnapshot.data() as TerpeneType
                    }
                }

                // Get the dominant negative effect for this product
                if (productData.dominantNegativeEffect && productData.dominantNegativeEffect instanceof DocumentReference) {
                    const negativeEffectSnapshot = await getDoc(productData.dominantNegativeEffect)
                    if (negativeEffectSnapshot.exists()) {
                        negativeEffectData = negativeEffectSnapshot.data() as EffectType
                    }
                }

                // Get the dominant negative effect for this product
                if (productData.dominantPositiveEffect && productData.dominantPositiveEffect instanceof DocumentReference) {
                    const positiveEffectSnapshot = await getDoc(productData.dominantPositiveEffect)
                    if (positiveEffectSnapshot.exists()) {
                        positiveEffectData = positiveEffectSnapshot.data() as EffectType
                    }
                }

                
                console.log("Fetch all products by brand")
                console.log(brandId)
                console.log(brandData?.title)
                if(!brandId || brandData?.title === brandId) {
                    return {
                        id: doc.id,
                        data: { ...productData, 
                            brand: brandData,
                            dominantTerpene: terpeneData, 
                            dominantNegativeEffect: negativeEffectData,
                            dominantPositiveEffect: positiveEffectData
                        }
                    }
                }

                return null
            }))
            setLoading(false)
            if (limit !== undefined && limit > 0) {
                setProducten(Products.slice(0, limit))
            } else {
                setProducten(Products)
            }
        })

        return () => {
            unsubscribe()
        }
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error loading shop data: {error}</div>;
    }

    return (
        <>
            {producten.map((product: Product) => { if (product && product.data) return (
                <div key={`productcontainer-${product.id}`} style={{ minWidth: 350, height: 500, margin: 16 }}>
                    <ProductCard key={`productcard-${product.id}`} product={product.data} />
                </div>
                )
            return ""}
            )}
        </>
    );
}

export default ProductenPerMerk;