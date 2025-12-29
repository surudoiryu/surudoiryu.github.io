// Define the Grower interface
export interface Grower {
    id: string;
    title?: string;
    description?: string;
    shortDescription?: string;
    images?: {
        overview?: string;
        close?: string;
        mood?: string;
        logo?: string;
    };
    thumbnailUrl?: string;
    shortcode?: string;
}