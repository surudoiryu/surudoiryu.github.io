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
                {
                    id: 1, 
                    title: "Northern Lights", 
                    brand: "CanAdelaar",
                    cbd: 0, 
                    thc: 0, 
                    description:"",
                    ean:"8721098000728",
                    images: { main:'https://jonko.john-en-co.nl/assets/no-product-image.jpg',close:'',mood:''}, 
                    rating:4.3, 
                    terpenes:[{
                        id: 1,
                        name: 'Caryophyllene',
                        energic: 20,
                        relaxing: 80,
                        medical: 'Bloed sneller pompen',
                        effect: 'Opgewonden'
                    }], 
                    effects: [{
                        id: 2,
                        name: 'Opgewonden'
                    }],
                    thumbnailUrl:'https://john-en-co-bucket.ams3.cdn.digitaloceanspaces.com/uploads/products/zoap.jpg',
                    type:'weed'
                },
                {
                    id: 2,
                    title: "Zwirlz",
                    brand: "Fyta",
                    cbd: 0,
                    thc: 0,
                    description: "",
                    ean: "9000000000483",
                    images: { main: 'https://jonko.john-en-co.nl/assets/no-product-image.jpg', close: '', mood: '' },
                    rating: 2.6,
                    terpenes: [{
                        id: 2,
                        name: 'Limonene',
                        energic: 40,
                        relaxing: 60,
                        medical: 'Meer energie',
                        effect: 'Energiek'
                    }],
                    effects: [{
                        id: 2,
                        name: 'Opgewonden'
                    }],
                    thumbnailUrl: 'https://john-en-co-bucket.ams3.cdn.digitaloceanspaces.com/uploads/products/applesandbananas.jpeg',
                    type: 'weed'
                },
                {
                    id: 3,
                    title: "Wappa",
                    brand: "CanAdelaar",
                    cbd: 0,
                    thc: 0,
                    description: "",
                    ean: "8721098000483",
                    images: { main: 'https://jonko.john-en-co.nl/assets/no-product-image.jpg', close: '', mood: '' },
                    rating: 2.6,
                    terpenes: [{
                        id: 2,
                        name: 'Limonene',
                        energic: 40,
                        relaxing: 60,
                        medical: 'Meer energie',
                        effect: 'Energiek'
                    }],
                    effects: [{
                        id: 1,
                        name: 'Melig'
                    }],
                    thumbnailUrl: 'https://john-en-co-bucket.ams3.cdn.digitaloceanspaces.com/uploads/products/cheese.png',
                    type: 'weed'
                },
                {
                    id: 4,
                    title: "Gmoski",
                    brand: "Aardachtig",
                    cbd: 0,
                    thc: 0,
                    description: "",
                    ean: "8721122340141",
                    images: { main: 'https://jonko.john-en-co.nl/assets/no-product-image.jpg', close: '', mood: '' },
                    rating: 2.6,
                    terpenes: [{
                        id: 1,
                        name: 'Caryophyllene',
                        energic: 20,
                        relaxing: 80,
                        medical: 'Bloed sneller pompen',
                        effect: 'Opgewonden'
                    }],
                    effects: [{
                        id: 1,
                        name: 'Melig'
                    }],
                    thumbnailUrl: 'https://john-en-co-bucket.ams3.cdn.digitaloceanspaces.com/uploads/products/KushCake.png',
                    type: 'weed'
                }
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
            } as ListType;

            console.log(response)
            self.postMessage(JSON.stringify(response))
        })
    }
}

export { };