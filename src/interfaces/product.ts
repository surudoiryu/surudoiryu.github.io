// Define the Product interface
import { DocumentReference } from 'firebase/firestore';
import { Grower } from './grower';

export interface Product {
    id: string; // Gebruik 'string' als ID consistent is met Firestore-documenten
    shortcode: string;
    title: string;
    brand: Grower; // Verwijzing naar een Grower
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
}

export interface ProductImages {
    overview: string;
    close: string;
    mood: string;
    logo: string;
}

export interface ProductTerpenes {
    name: string;
    description: string;
}

export interface ProductEffects {
    name: string;
    description: string;
}

export interface ProductVariants {
    id: string;
    name: string;
    price: number;
    stock: number;
}