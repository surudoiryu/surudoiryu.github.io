export type VariantType = {
    id: number;
    title: string;
    ean: string;
    stock: VariantStock[];
};

export type VariantStock = {
    id: number;
    shop: number;
    name: string;
    price: number;
    stock: number;
}