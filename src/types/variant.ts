export type VariantType = {
    id: number;
    title: string;
    ean: string;
    grower: number;
    stock: VariantStock[];
};

export type VariantStock = {
    id: number;
    shop: number;
    name: string;
    price: number;
    stock: number;
}