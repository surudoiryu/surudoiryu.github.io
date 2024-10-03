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
    growers?: Array<number>;
    products?: Array<number>;
};

export type LocationObject = {
    latitude: number,
    longitude: number,
}
