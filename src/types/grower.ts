export type GrowerType = {
    id: number;
    title: string;
    thumbnailUrl: string;
    description: string;
    shortDescription: string;
    images: GrowerImages
    shortcode?: string;
    isApproved?: boolean;
};

export type GrowerImages = {
    logo: string;
    overview: string;
    close: string;
    mood: string;
}
