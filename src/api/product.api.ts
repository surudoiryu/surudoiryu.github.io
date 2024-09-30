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
                    title: "Amnesia Core cut", 
                    brand: "Fyta",
                    cbdMin: 0,
                    cbdMax: 1,
                    thcMin: 18,
                    thcMax: 23,
                    description: "Amnesia is een bekende cannabisvariant met een rijke geschiedenis in Nederland. Het is een resultaat van het kruisen van een Super Silver Haze met een Haze/Skunk/Northern Lights 5 (NL5) en staat bekend om haar opvallende citrusgeur. Wat de Amnesia Core Cut onderscheidt, is haar dennenboomvormige top en de zeer herkenbare citrussmaak.Belangrijke nadrukkelijke terpenen hierbij zijn onder meer terpinoleen, β- Caryofylleen en β - Pineen.",
                    ean:"8721098000728",
                    images: { main:'https://jonko.john-en-co.nl/assets/no-product-image.jpg',close:'',mood:''}, 
                    rating: 4.3, 
                    dominantTerpene: 
                        {
                            id: 2,
                            name: 'Caryophyllene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        }
                    ,
                    terpenes:[
                        {
                            id: 1,
                            name: 'Terpinolene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 2,
                            name: 'Caryophyllene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 3,
                            name: 'Pinene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 4,
                            name: 'Humulene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 5,
                            name: 'Mycrene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                    ], 
                    dominantPositiveEffect: 
                        {
                            id: 1,
                            name: 'Melig',

                        }
                    ,
                    positiveEffects: [{
                        id: 1,
                        name: 'Melig'
                    }],
                    dominantNegativeEffect: {
                            id: 1,
                            name: 'Melig',

                        }
                    ,
                    negativeEffects: [{
                        id: 1,
                        name: 'Melig'
                    }],
                    tastes: [
                        {
                            id: 1,
                            name: 'Citrus'
                        },
                        {
                            id: 1,
                            name: 'Perzik'
                        },
                    ],
                    thumbnailUrl:'https://fyta.group/assets/components/phpthumbof/cache/f48-1024x1024-amnesia-2.9d3f60e6cb2744deb922f8634e005503.webP',
                    type:'weed'
                },
                {
                    id: 2,
                    title: "Fritter Licker",
                    brand: "Fyta",
                    cbdMin: 0,
                    cbdMax: 1,
                    thcMin: 16,
                    thcMax: 17,
                    description: "Fritter Licker is een hybride cannabisvariant, ontwikkeld door het kruisen van Apple Fritter met Faceoff OG en staat bekend om haar verfrissende limonadegeur. Wat de Fritter Licker onderscheidt, is haar citrusachtige sinaasappelsmaak met een vleugje zoete romigheid. Belangrijke nadrukkelijke terpenen hierbij zijn limoneen, β-pineen en linalool.",
                    ean: "9000000000483",
                    images: { main: 'https://jonko.john-en-co.nl/assets/no-product-image.jpg', close: '', mood: '' },
                    rating: 2.6,
                    dominantTerpene: {
                        id: 2,
                        name: 'Caryophyllene',
                        energic: 20,
                        relaxing: 80,
                        medical: 'Bloed sneller pompen',
                        effect: 'Opgewonden',
                        color: "#ff0000",
                    },
                    terpenes: [
                        {
                            id: 6,
                            name: 'Limonene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 7,
                            name: 'Linalool',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 2,
                            name: 'Caryophyllene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 4,
                            name: 'Humulene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 5,
                            name: 'Mycrene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                    ],
                    dominantPositiveEffect: {
                        id: 1,
                        name: 'Melig',
                    },
                    positiveEffects: [{
                        id: 1,
                        name: 'Melig'
                    }],
                    dominantNegativeEffect: {
                        id: 1,
                        name: 'Melig',
                    },
                    negativeEffects: [{
                        id: 1,
                        name: 'Melig'
                    }],
                    tastes: [
                        {
                            id: 1,
                            name: 'Aards'
                        },
                        {
                            id: 1,
                            name: 'Appel'
                        },
                    ],
                    thumbnailUrl: 'https://fyta.group/assets/components/phpthumbof/cache/f76-1024-1024-fritter-licker-bud.9d3f60e6cb2744deb922f8634e005503.webP',
                    type: 'weed'
                },
                {
                    id: 3,
                    title: "3Chem",
                    brand: "Fyta",
                    cbdMin: 0,
                    cbdMax: 1,
                    thcMin: 19,
                    thcMax: 20,
                    description: "3Chems brengt je een diepe lichamelijke rustig en is perfect voor de behandeling van mensen die lijden aan aandoeningen zoals stress, angst, depressie, chronische pijn en slapeloosheid.",
                    ean: "8721098000483",
                    images: { main: 'https://jonko.john-en-co.nl/assets/no-product-image.jpg', close: '', mood: '' },
                    rating: 2.6,
                    dominantTerpene: 
                        {
                            id: 2,
                            name: 'Caryophyllene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                        color: "#ff0000",
                        }
                    ,
                    terpenes: [
                        {
                            id: 2,
                            name: 'Caryophyllene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 3,
                            name: 'Pinene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 2,
                            name: 'Limonene',
                            energic: 40,
                            relaxing: 60,
                            medical: 'Meer energie',
                            effect: 'Energiek',
                            color: "#ff0000",
                        },
                        {
                            id: 8,
                            name: 'Bisabolol',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 7,
                            name: 'Linalool',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                    ],
                    dominantPositiveEffect: 
                        {
                            id: 1,
                            name: 'Melig',

                        }
                    ,
                    positiveEffects: [{
                        id: 1,
                        name: 'Melig'
                    }],
                    dominantNegativeEffect: 
                        {
                            id: 1,
                            name: 'Melig',

                        }
                    ,
                    negativeEffects: [{
                        id: 1,
                        name: 'Melig'
                    }],
                    tastes: [
                        {
                            id: 1,
                            name: 'Citrus'
                        },
                        {
                            id: 1,
                            name: 'Skittles'
                        },
                    ],
                    thumbnailUrl: 'https://fyta.group/assets/components/phpthumbof/cache/f50-1024x1024-3chems-top-goed.9d3f60e6cb2744deb922f8634e005503.webP',
                    type: 'weed'
                },
                {
                    id: 4,
                    title: "Ice Cream Cake",
                    brand: "Fyta",
                    cbdMin: 0,
                    cbdMax: 1,
                    thcMin: 17,
                    thcMax: 18,
                    description: "Ice Cream Cake is een cannabisvariant die ontstaan is door het kruisen van een Weddingcake met een Gelato 33 en staat bekend om haar romige en gasachtige geur. Wat de Ice Cream Cake onderscheidt, is haar aardse gassmaak met een romige ondertoon. Belangrijke nadrukkelijke terpenen zijn ondermeer β-caryofylleen, limoneen, linalool en α-humuleen.",
                    ean: "8721122340141",
                    images: { main: 'https://jonko.john-en-co.nl/assets/no-product-image.jpg', close: '', mood: '' },
                    rating: 2.6,
                    dominantTerpene: 
                        {
                            id: 2,
                            name: 'Caryophyllene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        }
                    ,
                    terpenes: [
                        {
                            id: 2,
                            name: 'Caryophyllene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 3,
                            name: 'Limonene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 4,
                            name: 'Humulene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 7,
                            name: 'Linalool',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 5,
                            name: 'Mycrene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                    ],
                    dominantPositiveEffect: 
                        {
                            id: 1,
                            name: 'Melig',

                        }
                    ,
                    positiveEffects: [{
                        id: 1,
                        name: 'Melig'
                    }],
                    dominantNegativeEffect: 
                        {
                            id: 1,
                            name: 'Melig',

                        }
                    ,
                    negativeEffects: [{
                        id: 1,
                        name: 'Melig'
                    }],
                    tastes: [
                        {
                            id: 1,
                            name: 'Diesel'
                        },
                        {
                            id: 2,
                            name: 'Deeg'
                        },
                        {
                            id: 3,
                            name: 'Room'
                        },
                    ],
                    thumbnailUrl: 'https://fyta.group/assets/components/phpthumbof/cache/f85-1024x1024-icecreamcake-top-kopie.9d3f60e6cb2744deb922f8634e005503.webP',
                    type: 'weed'
                },
                {
                    id: 5,
                    title: "Mimosa",
                    brand: "Fyta",
                    cbdMin: 0,
                    cbdMax: 1,
                    thcMin: 13,
                    thcMax: 15,
                    description: "Als je op zoek bent naar een opkikkertje in de vroege ochtend (zonder de alcohol), dan is deze wiet helemaal iets voor jou. Mimosa bevat heldere en vrolijke effecten voor overdag die perfect zijn om de slaap te verjagen en u een positief humeur te geven tijdens uw dag.",
                    ean: "8721122340141",
                    images: { main: 'https://jonko.john-en-co.nl/assets/no-product-image.jpg', close: '', mood: '' },
                    rating: 2.6,
                    dominantTerpene: 
                        {
                            id: 2,
                            name: 'Caryophyllene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                        effect: 'Opgewonden',
                        color: "#ff0000",
                        }
                    ,
                    terpenes: [
                        {
                            id: 2,
                            name: 'Caryophyllene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 3,
                            name: 'Limonene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 4,
                            name: 'Pinene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                        {
                            id: 5,
                            name: 'Mycrene',
                            energic: 20,
                            relaxing: 80,
                            medical: 'Bloed sneller pompen',
                            effect: 'Opgewonden',
                            color: "#ff0000",
                        },
                    ],
                    dominantPositiveEffect: 
                        {
                            id: 1,
                            name: 'Melig',
                            
                        }
                    ,
                    positiveEffects: [{
                        id: 1,
                        name: 'Melig'
                    }],
                    dominantNegativeEffect: 
                        {
                            id: 1,
                            name: 'Melig',

                        }
                    ,
                    negativeEffects: [{
                        id: 1,
                        name: 'Melig'
                    }],
                    tastes: [
                        {
                            id: 1,
                            name: 'Pittig'
                        },
                        {
                            id: 2,
                            name: 'Sinasappel'
                        },
                    ],
                    thumbnailUrl: 'https://fyta.group/assets/components/phpthumbof/cache/f49-mimosa-1024x1024-2-min.9d3f60e6cb2744deb922f8634e005503.webP',
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