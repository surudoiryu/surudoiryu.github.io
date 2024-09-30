import React, { useEffect, useMemo, useRef, useState } from 'react';
import { processList } from "./longProcesses/enums";
import { useStatus } from "./registrationStatus";
import './App.css';
import '@fontsource/roboto/300.css';
import { ListType, GetDataType, LengthCountType } from './types/data';
import BottomNav from './components/MobileMenu';
import PageHome from './Home';
import PageMap from './Map';
import PageSearch from './Search';
import PageProducts from './Products';
import { ShopType } from './types/shop';
import { GrowerType } from './types/grower';
import { ProductType } from './types/product';

function App() {
  const status = useStatus()
  const [currentPage, setCurrentPage] = useState("home")
  const [location, setLocation] = useState<Object>({});


  const counter: Worker = useMemo(
    () => new Worker(new URL("./longProcesses/count.ts", import.meta.url)),
    []
  );

  const getData: Worker = useMemo(
    () => new Worker(new URL("./api/product.api.ts", import.meta.url)),
    []
  );

  const getGrower: Worker = useMemo(
    () => new Worker(new URL("./api/grower.api.ts", import.meta.url)),
    []
  );

  const getShop: Worker = useMemo(
    () => new Worker(new URL("./api/shop.api.ts", import.meta.url)),
    []
  );

  const [lengthCount, setLengthCount] = useState<LengthCountType>({
    loading: true,
    value: 0,
  });

  const [productList, setProductList] = useState<ListType>({
    loading: true,
    list: [],
    page: 1,
  });

  const [growerList, setGrowerList] = useState<ListType>({
    loading: true,
    list: [],
    page: 1,
  });

  const [shopList, setShopList] = useState<ListType>({
    loading: true,
    list: [],
    page: 1,
  });

  useEffect(() => {
    if (window.Worker) {
      counter.postMessage(processList.count);

      counter.onmessage = (e: MessageEvent<string>) => {
        setLengthCount((prev: any) => ({
          ...prev,
          loading: false,
          value: Number(e.data) && Number(e.data),
        }));
      };
    }
  }, [counter]);

  useEffect(() => {
    if (window.Worker) {
      getData.onmessage = (e: MessageEvent<string>) => {
        const response = JSON.parse(e.data) as unknown as ListType;
        console.log(response)
        setProductList((prev) => ({
          ...prev,
          loading: response.loading,
          list: response.list,
          page: response.page,
        }));
      };
    }
  }, [getData]);

  useEffect(() => {
    if (window.Worker) {
      getGrower.onmessage = (e: MessageEvent<string>) => {
        const response = JSON.parse(e.data) as unknown as ListType;
        console.log(response)
        setGrowerList((prev) => ({
          ...prev,
          loading: response.loading,
          list: response.list,
          page: response.page,
        }));
      };
    }
  }, [getGrower]);

  useEffect(() => {
    if (window.Worker) {
      getShop.onmessage = (e: MessageEvent<string>) => {
        const response = JSON.parse(e.data) as unknown as ListType;
        console.log(response)
        setShopList((prev) => ({
          ...prev,
          loading: response.loading,
          list: response.list,
          page: response.page,
        }));
      };
    }
  }, [getShop]);

  useEffect(() => {
    if (window.Worker) {
      const request = {
        action: processList.getData,
        period: "initial",
        thePageNumber: productList.page,
      } as GetDataType;

      getData.postMessage(JSON.stringify(request));
    }

    if (window.Worker) {
      const request = {
        action: processList.getData,
        period: "initial",
        thePageNumber: shopList.page,
      } as GetDataType;

      getShop.postMessage(JSON.stringify(request));
    }

    if (window.Worker) {
      const request = {
        action: processList.getData,
        period: "initial",
        thePageNumber: growerList.page,
      } as GetDataType;

      getGrower.postMessage(JSON.stringify(request));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="App">
      {currentPage === "home" && (
        <PageHome productList={productList} growerList={growerList} setCurrentPage={setCurrentPage} />
      )}

      {currentPage === "shops" && (
        <PageMap shopList={shopList} lengthCount={lengthCount} location={location} setLocation={setLocation} />
      )}

      {currentPage === "search" && (
        <PageSearch />
      )}

      {currentPage === "cannabis" && (
        <PageProducts />
      )}

      <br /><br /><br /><br />
      <BottomNav currentPage={currentPage} setCurrentPage={setCurrentPage} />
    </div>
  );
}

export default App;
