/* eslint-disable no-restricted-globals */
import { GetDataType, listPageSize, ListType } from "../types/data";
import { processList } from "../longProcesses/enums";
import { ProductType } from "../types/product";

export const getProductData = ():Promise<Array<ProductType>> => {
    console.log("start product fetching")
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("done fetching")
            resolve([
                
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
        getProductData().then((list) => {
            return list.filter((item, index) => index < listPageSize)
        }).then((products) => {
            const response = {
                loading: false,
                list: products,
                page: data.thePageNumber,
            };

            console.log(response)
            self.postMessage(JSON.stringify(response))
        })
    }
}

export { };