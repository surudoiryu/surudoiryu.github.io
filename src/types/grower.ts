export type GrowerType = {
    id: number;
    title: string;
    thumbnailUrl: string;
    description: string;
    shortDescription: string;
    images: GrowerImages
};

export type GrowerImages = {
    logo: string;
    overview: string;
    close: string;
    mood: string;
}