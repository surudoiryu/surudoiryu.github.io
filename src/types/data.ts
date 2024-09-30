import { ProductType } from "./product";
import { ShopType } from "./shop";
import { GrowerType } from "./grower";

export type ListType = {
    loading: boolean;
    list: unknown & Array<ProductType & ShopType & GrowerType>;
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