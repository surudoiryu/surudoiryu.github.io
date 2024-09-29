/* eslint-disable no-restricted-globals */
import { GetDataType, listPageSize, ListType } from "../types/data";
import { processList } from "../longProcesses/enums";
import { ShopType } from "../types/shop";

export const getShopData = (): Promise<Array<ShopType>> => {
    console.log("start shop fetching")
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("done fetching")
            resolve([
                {
                    id: 1,
                    lat: 51.83917,
                    lng: 4.17000,
                    name: 'John & Co. HVS',
                    rating: 5,
                },
                {
                    id: 2,
                    lat: 51.82278,
                    lng: 4.13025,
                    name: 'Barbershop',
                    rating: 4,
                },
                {
                    id: 3,
                    lat: 51.92155,
                    lng: 4.24691,
                    name: 'Quasi',
                    rating: 4.3,
                },
            ]);
        }, 1000);
    });
};


self.onmessage = (e: MessageEvent<string>) => {
    const data = JSON.parse(e.data) as GetDataType;

    if (data.action !== processList.getData) {
        return;
    }
    if (data.period === "initial") {
        getShopData().then((list) => {
            return list.filter((item, index) => index < listPageSize)
        }).then((shops) => {
            const response = {
                loading: false,
                list: shops,
                page: data.thePageNumber,
            } as ListType;

            console.log(response)
            self.postMessage(JSON.stringify(response))
        })
    }
}

export { };