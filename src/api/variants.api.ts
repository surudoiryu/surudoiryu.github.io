/* eslint-disable no-restricted-globals */
import { GetDataType, listPageSize, ListType } from "../types/data";
import { processList } from "../longProcesses/enums";
import { VariantType } from "../types/variant";

export const getVariantData = (): Promise<Array<VariantType>> => {
    console.log("start grower fetching")
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("done fetching")
            resolve([
                {
                    id: 1,
                    grower: 2,
                    title: "1 Gram",
                    ean: "9000000000483",
                    stock: [
                        {
                            id: 1,
                            shop: 1,
                            name: "John & Co. Hellevoetsluis",
                            price: 12.50,
                            stock: 30,
                        },
                        {
                            id: 2,
                            shop: 2,
                            name: "Barbershop",
                            price: 11.50,
                            stock: 10,
                        },
                        {
                            id: 3,
                            shop: 3,
                            name: "Quasi",
                            price: 12.00,
                            stock: 13,
                        },
                    ]
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
        getVariantData().then((list) => {
            return list.filter((item, index) => index < listPageSize)
        }).then((variants) => {
            const response = {
                loading: false,
                list: variants,
                page: data.thePageNumber,
            } as ListType;

            console.log(response)
            self.postMessage(JSON.stringify(response))
        })
    }
}

export { };