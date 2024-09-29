/* eslint-disable no-restricted-globals */
import { processList } from "../longProcesses/enums";
import { getProductData } from "../api/product.api";
import { getShopData } from "../api/shop.api";

self.onmessage = (e: MessageEvent<string>) => {
    if (e.data === processList.count) {
        const findLength = Object.values(getProductData()).length;

        self.postMessage(findLength);
    }

    if (e.data === processList.count) {
        const findLength = Object.values(getShopData()).length;

        self.postMessage(findLength);
    }
};

export { };