export type ShopType = {
    id: number;
    name: string;
    lat: number;
    lng: number;
    rating: number;
    logo: string;
    promo: boolean;
    pickup: boolean;
    drive: boolean;
    payByCard: boolean;
    easyParking: boolean;
    allowForeigns: boolean;
    disabled: boolean;
    openFrom: string;
    openTill: string;
    distance: number;
    shortcode: string;
    description?: string;
    province?: string;
    country?: string;
    openingHours?: {
        version?: number;
        days?: Array<{
            day: string;
            open?: string;
            close?: string;
            closed?: boolean;
        }>;
    };
    gallery?: string[];
    images?: {
        logo?: string;
        overview?: string;
        close?: string;
        mood?: string;
    };
    growers?: Array<number>;
    products?: Array<number>;
    isApproved?: boolean;
};

export type LocationObject = {
    latitude: number,
    longitude: number,
}
