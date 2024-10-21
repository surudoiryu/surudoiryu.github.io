import { DocumentReference } from "firebase/firestore";
import { GrowerType } from "./grower";

export type ProductType = {
    id: number;
    shortcode: string;
    title: string;
    brand: GrowerType;
    grower: number;
    type: string;
    thumbnailUrl: string;
    shortDescription?: string;
    description: string;
    thcMin: number;
    thcMax: number;
    cbdMin: number;
    cbdMax: number;
    rating: number;
    images: ProductImages;
    dominantTerpene: ProductTerpenes;
    terpenes?: DocumentReference[];
    tastes?: DocumentReference[];
    dominantPositiveEffect: ProductEffects;
    positiveEffects?: DocumentReference[];
    dominantNegativeEffect: ProductEffects;
    negativeEffects?: DocumentReference[];
    variants: ProductVariants[];
};

export type ProductImages = {
    main: string;
    close: string;
    mood: string;
}

export type ProductTerpenes = {
    id: number;
    name: string;
    energic: number;
    relaxing: number;
    medical: string;
    effect: string;
    color: string;
}

export type ProductEffects = {
    id: number;
    name: string;
}

export type ProductTastes = {
    id: number;
    name: string;
}

export type ProductVariants = {
    id: number;
    name: string;
    ean: string;
}