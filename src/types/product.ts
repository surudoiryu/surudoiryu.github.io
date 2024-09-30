export type ProductType = {
    id: number;
    ean: number | string;
    title: string;
    brand: string;
    type: string;
    thumbnailUrl: string;
    description: string;
    thcMin: number;
    thcMax: number;
    cbdMin: number;
    cbdMax: number;
    rating: number;
    images: ProductImages;
    dominantTerpene: ProductTerpenes;
    terpenes: ProductTerpenes[];
    tastes: ProductTastes[];
    dominantPositiveEffect: ProductEffects;
    positiveEffects: ProductEffects[];
    dominantNegativeEffect: ProductEffects;
    negativeEffects: ProductEffects[];
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