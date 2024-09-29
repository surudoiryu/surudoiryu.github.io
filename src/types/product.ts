export type ProductType = {
    id: number;
    ean: number | string;
    title: string;
    brand: string;
    type: string;
    thumbnailUrl: string;
    description: string;
    thc: number;
    cbd: number;
    rating: number;
    images: ProductImages;
    terpenes: ProductTerpenes[];
    effects: ProductEffects[];
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
}

export type ProductEffects = {
    id: number;
    name: string;
}