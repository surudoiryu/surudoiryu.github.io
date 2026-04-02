import React, { useEffect, useMemo, useState } from 'react';
import { processList } from "./longProcesses/enums";
import './App.css';
import '@fontsource/roboto/300.css';
import { ListType, GetDataType, LengthCountType } from './types/data';
import BottomNav from './components/MobileMenu';
import PageHome from './Home';
import PageMap from './Map';
import PageBlog from './Blog';
import PageProduct from './Product';
import PageProductsOverview from './ProductsOverview';
import { LocationObject } from './types/shop';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import PageShop from './Shop';
import Login from './Login';
import Signup from './Signup';
import PageGrower from './Grower';
import { AuthProvider } from './context/AuthContext';
import Profile from './Profile';
import ProtectedRoute from './components/ProtectedRoute';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { db } from './firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';


function App() {
  const [location, setLocation] = useState<LocationObject>({latitude: 0, longitude: 0});
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isAgeConfirmed, setIsAgeConfirmed] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return localStorage.getItem("ageVerified18") === "true";
  });
  const [lastSyncSummary, setLastSyncSummary] = useState<string>("");


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
    if (location.latitude !== 0 && location.longitude !== 0 ) {
      localStorage.setItem('myLocationLat', location.latitude.toString())
      localStorage.setItem('myLocationLng', location.longitude.toString())
    }
  }, [location])

  useEffect(() => {
    if (window.Worker) {
      counter.postMessage(processList.count);

      counter.onmessage = (e: MessageEvent<string>) => {
        setLengthCount((prev) => ({
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
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const syncRef = doc(db, "SyncStatus", "graphql");
    const unsubscribe = onSnapshot(syncRef, (snapshot) => {
      if (!snapshot.exists()) {
        setLastSyncSummary("");
        return;
      }

      const data = snapshot.data() as {
        status?: string;
        syncedProducts?: number;
        syncedShops?: number;
        syncedGrowers?: number;
      };

      setLastSyncSummary(
        `Status: ${data.status ?? "-"} | Producten: ${data.syncedProducts ?? 0} | Winkels: ${data.syncedShops ?? 0} | Telers: ${data.syncedGrowers ?? 0}`
      );
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let lat = localStorage.getItem('myLocationLat') ?? "0"
    let lng = localStorage.getItem('myLocationLng') ?? "0"
    setLocation({ latitude: parseFloat(lat), longitude: parseFloat(lng) })
    
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
      <AuthProvider>
        <Dialog open={!isAgeConfirmed}>
          <DialogTitle>18+ Confirmatie</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              Deze app bevat informatie over cannabis en is alleen bedoeld voor 18 jaar en ouder.
              Bevestig dat je 18+ bent om door te gaan.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              color="inherit"
              onClick={() => {
                window.location.href = "https://www.google.com";
              }}
            >
              Nee
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                localStorage.setItem("ageVerified18", "true");
                setIsAgeConfirmed(true);
              }}
            >
              Ja, ik ben 18+
            </Button>
          </DialogActions>
        </Dialog>
        <BrowserRouter>
          {!isOnline && (
            <Alert severity="info">
              Je bent offline. De app toont lokaal beschikbare data en synchroniseert weer zodra je online bent.
            </Alert>
          )}
          {isOnline && (
            <Alert severity="success">
              {lastSyncSummary || "Catalogus sync draait via background worker."}
            </Alert>
          )}
          <Routes>
            <Route
              path='/'
              element={<PageHome productList={productList} growerList={growerList} />}
            />

            <Route
              path='/kaart'
              element={<PageMap shopList={shopList} lengthCount={lengthCount} location={location} setLocation={setLocation} />}
            />

            <Route
              path='/blog'
              element={<PageBlog />}
            />

            <Route
              path='/zoeken'
              element={<PageBlog />}
            />

            <Route
              path='/cannabis'
              element={<PageProductsOverview />}
            />

            <Route
              path='/cannabis-winkel/*'
              element={<PageShop />}
            />

            <Route
              path='/cannabis/*'
              element={<PageProduct />}
            />

            <Route
              path='/telers'
              element={<Navigate to='/' replace />}
            />

            <Route
              path='/telers/*'
              element={<PageGrower />}
            />

            <Route
              path='/login'
              element={<Login />}
            />

            <Route
              path='/aanmelden'
              element={<Signup />}
            />

            <Route
              path='/profiel'
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route
              path='/profiel/:uid'
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Routes>
          <BottomNav />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
