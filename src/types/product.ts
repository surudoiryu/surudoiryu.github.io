import { DocumentReference } from "firebase/firestore";
import { EffectType } from "./effect";
import { GrowerType } from "./grower";
import { TasteType } from "./taste";
import { TerpeneType } from "./terpene";

export type ProductType = {
    id: number;
    shortcode: string;
    legacyShortcodes?: string[];
    categoryId?: string;
    subCategoryId?: string;
    categoryName?: string;
    subCategoryName?: string;
    leafletId?: string;
    mainImageId?: string;
    promoImageId?: string;
    promoVideoId?: string;
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
    dominantTerpene: ProductTerpenes | TerpeneType;
    terpenes?: Array<DocumentReference | ProductTerpenes | TerpeneType>;
    tastes?: Array<DocumentReference | ProductTastes | TasteType>;
    dominantPositiveEffect: ProductEffects | EffectType;
    positiveEffects?: Array<DocumentReference | ProductEffects | EffectType>;
    dominantNegativeEffect: ProductEffects | EffectType;
    negativeEffects?: Array<DocumentReference | ProductEffects | EffectType>;
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
