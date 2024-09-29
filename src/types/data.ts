import { ProductType } from "./product";
import { ShopType } from "./shop";

export type ListType = {
    loading: boolean;
    list: unknown & Array<ProductType> & Array<ShopType>;
    page: number;
};

export type GetDataType = {
    action: string;
    period: "initial" | "next" | "prev" | "pageNumber";
    thePageNumber: number;
};

export type LengthCountType = {
    loading: boolean;
    value: number;
};

export const listPageSize = 50;