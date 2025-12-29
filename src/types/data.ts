export type ListType<T> = {
    loading: boolean;
    list: T[];
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