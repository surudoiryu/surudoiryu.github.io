/* eslint-disable no-restricted-globals */
import { GetDataType, listPageSize, ListType } from "../types/data";
import { processList } from "../longProcesses/enums";
import { GrowerType } from "../types/grower";

export const getGrowerData = (): Promise<Array<GrowerType>> => {
    console.log("start grower fetching")
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("done fetching")
            resolve([
                {
                    id: 1,
                    title: "CanAdelaar",
                    description: "",
                    shortDescription: "Sinds 2018 bezig met het vormgeven van de cannabisindustrie, van zaadje tot verkoop.",
                    images: { overview: '', close: '', mood: '', logo: 'https://static.wixstatic.com/media/c31414_bca938ac9b474cba9677a65330c4a6d8~mv2.png/v1/fill/w_224,h_48,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/Canadelaar_logo-02.png' },
                    thumbnailUrl: 'https://static.wixstatic.com/media/c31414_bca938ac9b474cba9677a65330c4a6d8~mv2.png/v1/fill/w_224,h_48,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/Canadelaar_logo-02.png',
                },
                {
                    id: 2,
                    title: "Fyta",
                    description: "Al sinds 2017 is FYTA een van de Nederlandse pioniers in de legale cannabisteelt. Cannabis is niet eng en schimmig. Wel is zij een van de oudste geneeskrachtige planten ter wereld. Haar geneeskrachtige en psychoactieve eigenschappen zorgen ervoor dat zij inzetbaar is voor behandelen van een breed scala aan de meest uiteenlopende aandoeningen, maar is daarnaast ook uitermate geschikt om op een verantwoorde en vooral ontspannende manier gewoon te genieten.",
                    shortDescription: "Nederlandse pionier in de legale cannabisteelt",
                    images: { overview: '', close: '', mood: '', logo: 'https://fyta.group/uploads/home/logo-fyta.png' },
                    thumbnailUrl: 'https://fyta.group/uploads/home/logo-fyta.png',
                },
                {
                    id: 3,
                    title: "Aardachtig",
                    description: "",
                    shortDescription: "Bij Aardachtig begint de reis met een zorgvuldig gekozen zaadje. Een reis met veel zorg, toewijding en expertise.",
                    images: { overview: '', close: '', mood: '', logo: 'https://www.aardachtig.nl/wp-content/uploads/2022/02/Aardachtig-Logokopie11.png' },
                    thumbnailUrl: 'https://www.aardachtig.nl/wp-content/uploads/2022/02/Aardachtig-Logokopie11.png',
                },
                {
                    id: 4,
                    title: "Hollandse Hoogtes",
                    description: "Met ruim 40 jaar ervaring in de Vaderlandse coffeeshopcultuur zijn we geen groentje. Onze producten zijn stuk voor stuk van de hoogste kwaliteit. Ze worden uit de beste genetica gekweekt onder absoluut perfecte omstandigheden. Beter dan wat ooit in Nederland is gedaan. Daarmee leveren we een grote positieve bijdrage aan de hele industrie.",
                    shortDescription: "Onze producten zijn stuk voor stuk van de hoogste kwaliteit.",
                    images: { overview: '', close: '', mood: '', logo: 'https://www.hollandsehoogtes.nl/wp-content/uploads/2023/07/HollandseHoogtes-225x54.png' },
                    thumbnailUrl: 'https://www.hollandsehoogtes.nl/wp-content/uploads/2023/07/HollandseHoogtes-225x54.png',
                },
                {
                    id: 5,
                    title: "Linsboer B.V.",
                    description: "",
                    shortDescription: "linds",
                    images: { overview: '', close: '', mood: '', logo: 'https://linsboer.nl/images/linsboer-logo.svg' },
                    thumbnailUrl: 'https://linsboer.nl/images/linsboer-logo.svg',
                },
                {
                    id: 8,
                    title: "Holigram",
                    description: "",
                    shortDescription: "Het Holigram team gaat voor ‘clean cultivation, wild flavors’.",
                    images: { overview: '', close: '', mood: '', logo: 'https://i0.wp.com/holigram.nl/wp-content/uploads/2023/03/holigram-logo-rgb-website-1.png' },
                    thumbnailUrl: 'https://i0.wp.com/holigram.nl/wp-content/uploads/2023/03/holigram-logo-rgb-website-1.png',
                },
                {
                    id: 9,
                    title: "Leli Holland",
                    description: "",
                    shortDescription: "We streven ernaar om onze klanten met volle teugen te genieten van onze kwaliteits producten.",
                    images: { overview: '', close: '', mood: '', logo: 'https://leliholland.nl/wp-content/themes/leliholland/build/img/logo-animated.svg' },
                    thumbnailUrl: 'https://leliholland.nl/wp-content/themes/leliholland/build/img/logo-animated.svg',
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
        getGrowerData().then((list) => {
            return list.filter((item, index) => index < listPageSize)
        }).then((growers) => {
            const response = {
                loading: false,
                list: growers,
                page: data.thePageNumber,
            } as ListType;

            console.log(response)
            self.postMessage(JSON.stringify(response))
        })
    }
}

export { };