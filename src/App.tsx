import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { processList } from "./longProcesses/enums";
import './App.css';
import { ListType, GetDataType, LengthCountType } from './types/data';
import BottomNav from './components/MobileMenu';
import TopBar from './components/TopBar';
import SiteFooter from './components/SiteFooter';
import { LocationObject } from './types/shop';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { db } from './firebaseConfig';
import { doc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import GtmManager from './components/GtmManager';
import SeoManager from './components/SeoManager';
import Loader from './components/Loader';
import AgeGate, { AgeState, readAgeState } from './components/AgeGate';
import ScrollToTopButton from './components/ScrollToTopButton';
import InstallMobileOutlinedIcon from '@mui/icons-material/InstallMobileOutlined';
import logo from './logo.svg';

const PageHome = lazy(() => import('./Home'));
const PageMap = lazy(() => import('./Map'));
const PageBlog = lazy(() => import('./Blog'));
const PageProduct = lazy(() => import('./Product'));
const PageProductsOverview = lazy(() => import('./ProductsOverview'));
const PageGrowersOverview = lazy(() => import('./GrowersOverview'));
const LegalPage = lazy(() => import('./LegalPage'));
const HealthInfoPage = lazy(() => import('./HealthInfoPage'));
const PageShop = lazy(() => import('./Shop'));
const PageKeuzehulp = lazy(() => import('./Keuzehulp'));
const Login = lazy(() => import('./Login'));
const Signup = lazy(() => import('./Signup'));
const PageGrower = lazy(() => import('./Grower'));
const Profile = lazy(() => import('./Profile'));

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const PWA_PROMPT_LAST_SHOWN_KEY = "pwaInstallPromptLastShown";
const PWA_INSTALLED_KEY = "pwaInstalled";
const PWA_OPEN_HINT_LAST_SHOWN_KEY = "pwaOpenHintLastShown";

function dateKeyToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const mediaStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return mediaStandalone || iosStandalone;
}

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function toRouteStatKey(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/kaart")) return "map";
  if (pathname.startsWith("/info") || pathname.startsWith("/blog")) return "info";
  if (pathname.startsWith("/cannabis-winkel")) return "shopDetail";
  if (pathname.startsWith("/cannabis")) return "cannabis";
  if (pathname.startsWith("/telers")) return "growers";
  if (pathname.startsWith("/login")) return "login";
  if (pathname.startsWith("/aanmelden")) return "signup";
  if (pathname.startsWith("/profiel")) return "profile";
  return "other";
}

function RouteStatsTracker() {
  const location = useLocation();
  const [lastTrackedPath, setLastTrackedPath] = useState<string>("");

  useEffect(() => {
    if (!navigator.onLine) {
      return;
    }
    if (location.pathname === lastTrackedPath) {
      return;
    }

    setLastTrackedPath(location.pathname);
    const key = toRouteStatKey(location.pathname);

    void setDoc(
      doc(db, "Stats", "pageViews"),
      {
        [key]: increment(1),
        total: increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch((error) => {
      console.warn("Route statistiek kon niet opgeslagen worden.", error);
    });
  }, [lastTrackedPath, location.pathname]);

  return null;
}


function App() {
  const [location, setLocation] = useState<LocationObject>({latitude: 0, longitude: 0});
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [ageState, setAgeState] = useState<AgeState>(() => typeof window === "undefined" ? "unknown" : readAgeState());
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPwaInstallPrompt, setShowPwaInstallPrompt] = useState<boolean>(false);
  const [showPwaOpenHint, setShowPwaOpenHint] = useState<boolean>(false);
  const [pwaInstalled, setPwaInstalled] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return isStandaloneMode() || localStorage.getItem(PWA_INSTALLED_KEY) === "true";
  });

  useEffect(() => {
    const handleAgeChange = (event: Event) => setAgeState((event as CustomEvent<AgeState>).detail);
    window.addEventListener("weedinfo-age-change", handleAgeChange);
    return () => window.removeEventListener("weedinfo-age-change", handleAgeChange);
  }, []);


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
    if (!isMobileDevice()) {
      return;
    }

    if (isStandaloneMode()) {
      localStorage.setItem(PWA_INSTALLED_KEY, "true");
      setPwaInstalled(true);
    }

    const onInstalled = () => {
      localStorage.setItem(PWA_INSTALLED_KEY, "true");
      localStorage.setItem(PWA_PROMPT_LAST_SHOWN_KEY, dateKeyToday());
      setPwaInstalled(true);
      setShowPwaInstallPrompt(false);
      setDeferredInstallPrompt(null);
    };

    const onBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredInstallPrompt(installEvent);
    };

    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);

    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
    };
  }, [pwaInstalled]);

  useEffect(() => {
    if (ageState !== "age_verified" || !isMobileDevice() || pwaInstalled || isStandaloneMode()) return;
    if (!deferredInstallPrompt && !isIosDevice()) return;
    if (localStorage.getItem(PWA_PROMPT_LAST_SHOWN_KEY) === dateKeyToday()) return;

    // Let the age dialog finish closing before presenting a second dialog.
    const timer = window.setTimeout(() => setShowPwaInstallPrompt(true), 500);
    return () => window.clearTimeout(timer);
  }, [ageState, deferredInstallPrompt, pwaInstalled]);

  useEffect(() => {
    if (ageState !== "age_verified") {
      return;
    }
    if (!isMobileDevice()) {
      return;
    }
    if (!pwaInstalled || isStandaloneMode()) {
      return;
    }
    if (localStorage.getItem(PWA_OPEN_HINT_LAST_SHOWN_KEY) === dateKeyToday()) {
      return;
    }
    setShowPwaOpenHint(true);
  }, [ageState, pwaInstalled]);

  const closePwaInstallPromptForToday = () => {
    localStorage.setItem(PWA_PROMPT_LAST_SHOWN_KEY, dateKeyToday());
    setShowPwaInstallPrompt(false);
  };

  const handleInstallPwa = async () => {
    if (!deferredInstallPrompt) {
      closePwaInstallPromptForToday();
      return;
    }

    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    localStorage.setItem(PWA_PROMPT_LAST_SHOWN_KEY, dateKeyToday());
    if (choice.outcome === "accepted") {
      localStorage.setItem(PWA_INSTALLED_KEY, "true");
      setPwaInstalled(true);
    }
    setShowPwaInstallPrompt(false);
    setDeferredInstallPrompt(null);
  };

  const closePwaOpenHintForToday = () => {
    localStorage.setItem(PWA_OPEN_HINT_LAST_SHOWN_KEY, dateKeyToday());
    setShowPwaOpenHint(false);
  };

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
        <GtmManager />
        <AgeGate state={ageState} onChange={setAgeState} />
        <Dialog
          open={ageState === "age_verified" && showPwaInstallPrompt}
          fullWidth
          maxWidth="xs"
          aria-labelledby="pwa-install-title"
          slotProps={{ backdrop: { sx: { bgcolor: "rgba(9,18,11,.58)", backdropFilter: "blur(5px)" } } }}
          PaperProps={{ sx: { width: "calc(100% - 32px)", maxWidth: 480, m: 2, borderRadius: 4, overflow: "hidden", textAlign: "center", boxShadow: "0 28px 80px rgba(0,0,0,.32)" } }}
        >
          <DialogContent sx={{ px: { xs: 3, sm: 6 }, pt: { xs: 4, sm: 5 }, pb: 2 }}>
            <Box component="img" src={logo} alt="WeedInfo" width={132} height={72} sx={{ display: "block", width: 132, height: 72, objectFit: "contain", mx: "auto", mb: 1.5 }} />
            <Box aria-hidden="true" sx={{ width: 42, height: 42, mx: "auto", mb: 1.5, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "#e8f4ea", color: "#237a3b" }}>
              <InstallMobileOutlinedIcon fontSize="small" />
            </Box>
            <Typography id="pwa-install-title" component="h2" variant="h5" fontWeight={800}>WeedInfo als app</Typography>
            <Typography mt={2} color="text.secondary" lineHeight={1.6}>
              Voeg WeedInfo toe aan je beginscherm voor sneller openen en toegang tot eerder geladen informatie wanneer je offline bent.
            </Typography>
            {!deferredInstallPrompt && isIosDevice() && (
              <Typography color="text.secondary" lineHeight={1.6} sx={{ mt: 1.5 }}>
                Op iPhone/iPad: tik op delen in Safari en kies daarna &quot;Zet op beginscherm&quot;.
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 1, px: { xs: 3, sm: 6 }, pt: 1.5, pb: { xs: 4, sm: 5 }, "& > :not(style) ~ :not(style)": { ml: 0 } }}>
            <Button
              fullWidth
              variant="contained"
              color="success"
              size="large"
              onClick={() => {
                void handleInstallPwa();
              }}
              sx={{ minHeight: 48, borderRadius: 2, fontWeight: 800, textTransform: "none" }}
            >
              {deferredInstallPrompt ? "Installeren" : "Begrepen"}
            </Button>
            <Button fullWidth color="inherit" size="large" onClick={closePwaInstallPromptForToday} sx={{ minHeight: 44, borderRadius: 2, textTransform: "none" }}>
              Later
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog open={ageState === "age_verified" && showPwaOpenHint}>
          <DialogTitle>App is al geïnstalleerd</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              Open WeedInfo via het icoon op je beginscherm voor de echte PWA-ervaring. Browsers laten niet toe om automatisch vanuit een webtab de geïnstalleerde PWA te starten.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button color="inherit" onClick={closePwaOpenHintForToday}>
              Sluiten
            </Button>
          </DialogActions>
        </Dialog>
        <Box id="weedinfo-app-content" aria-hidden={ageState !== "age_verified"} sx={{ filter: ageState !== "age_verified" ? "blur(18px)" : "none", pointerEvents: ageState !== "age_verified" ? "none" : "auto", userSelect: ageState !== "age_verified" ? "none" : "auto" }}>
        <BrowserRouter>
          <TopBar />
          <SeoManager />
          <RouteStatsTracker />
          <Box sx={{ pt: { xs: 8, md: 12 } }}>
            <Box sx={{ maxWidth: 1130, mx: "auto", px: { xs: 1, sm: 1.5, md: 2 } }}>
            {!isOnline && (
              <Alert severity="info">
                Je bent offline. De app toont lokaal beschikbare data en synchroniseert weer zodra je online bent.
              </Alert>
            )}
            <Suspense fallback={<Loader size={40} display="block" />}>
            <Routes>
            <Route
              path='/'
              element={<PageHome productList={productList} />}
            />

            <Route
              path='/kaart'
              element={<PageMap shopList={shopList} lengthCount={lengthCount} location={location} setLocation={setLocation} />}
            />

            <Route path='/blog' element={<Navigate to='/info' replace />} />
            <Route path='/zoeken' element={<Navigate to='/info' replace />} />
            <Route path='/info/*' element={<PageBlog />} />

            <Route
              path='/cannabis'
              element={<PageProductsOverview />}
            />
            <Route path='/cannabis/wiet' element={<PageProductsOverview />} />
            <Route path='/cannabis/hasj' element={<PageProductsOverview />} />
            <Route path='/cannabis/joints' element={<PageProductsOverview />} />
            <Route path='/cannabis/edibles' element={<PageProductsOverview />} />

            <Route
              path='/keuzehulp'
              element={<PageKeuzehulp />}
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
              element={<PageGrowersOverview />}
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
            <Route path='/voorwaarden' element={<Navigate to='/gebruiksvoorwaarden' replace />} />
            <Route path='/over-weedinfo' element={<LegalPage title='Over WeedInfo' intro='WeedInfo is een onafhankelijk informatieplatform over gereguleerde cannabisproducten en telers.' sections={[{ title: "Wat WeedInfo doet", body: "WeedInfo helpt consumenten feitelijke productinformatie te vinden en vergelijken." }, { title: "Geen verkoop", body: "Je kunt via WeedInfo geen cannabis kopen, bestellen of reserveren. WeedInfo bemiddelt niet bij verkoop." }]} />} />
            <Route path='/informatie/gezondheid-en-risicos' element={<HealthInfoPage />} />
            <Route path='/gebruiksvoorwaarden' element={<LegalPage title='Gebruiksvoorwaarden' intro='Gebruik WeedInfo uitsluitend als informatiebron.' sections={[{ title: "Geen verkoop of advies", body: "De informatie is geen verkoopaanbod, medisch advies of uitnodiging om cannabis te gebruiken." }, { title: "Gebruikersbijdragen", body: "Gebruikersbijdragen mogen niet misleidend, commercieel, beledigend of in strijd met de wet zijn." }, { title: "Beschikbaarheid", body: "We streven naar goede beschikbaarheid, maar kunnen geen ononderbroken werking garanderen." }]} />} />
            <Route
              path='/privacy'
              element={
                <LegalPage
                  title='Privacyverklaring'
                  intro='WeedInfo verwerkt persoonsgegevens om accountfunctionaliteit, likes en reviews mogelijk te maken.'
                  sections={[
                    {
                      title: "Welke gegevens",
                      body: "Accountgegevens zoals e-mail, gebruikersnaam, profielafbeelding, likes, reviews en technische gegevens die nodig zijn voor beveiliging en werking.",
                    },
                    {
                      title: "Doel van verwerking",
                      body: "We gebruiken gegevens voor authenticatie, profielopbouw, reviews en het verbeteren van de website. Niet-noodzakelijke analytics worden alleen na toestemming geactiveerd.",
                    },
                    {
                      title: "Bewaartermijn en rechten",
                      body: "Gegevens worden niet langer bewaard dan nodig. Je kunt verzoeken om inzage, correctie of verwijdering van je persoonsgegevens.",
                    },
                  ]}
                />
              }
            />
            <Route
              path='/cookies'
              element={
                <LegalPage
                  title='Cookiebeleid'
                  intro='WeedInfo gebruikt functionele opslag en optionele analytics voor een betere gebruikerservaring.'
                  sections={[
                    {
                      title: "Functionele opslag",
                      body: "Voorbeelden zijn leeftijdsbevestiging, sessiestatus en lokale cache voor offline gebruik.",
                    },
                    {
                      title: "Analytics",
                      body: "Wanneer Google Tag Manager is geconfigureerd via de omgeving, kunnen metingen geactiveerd worden voor verkeersinzichten.",
                    },
                    {
                      title: "Beheer",
                      body: "Je kunt browseropslag en cookies beheren via je browserinstellingen.",
                    },
                  ]}
                />
              }
            />
            <Route
              path='/disclaimer'
              element={
                <LegalPage
                  title='Disclaimer'
                  intro='De informatie op WeedInfo is bedoeld als algemene informatie en niet als medisch of juridisch advies.'
                  sections={[
                    {
                      title: "Geen medisch advies",
                      body: "Gebruik informatie op dit platform niet als vervanging voor professioneel medisch advies.",
                    },
                    {
                      title: "Aansprakelijkheid",
                      body: "WeedInfo is niet aansprakelijk voor schade voortvloeiend uit gebruik van het platform of vertrouwen op informatie van derden.",
                    },
                    {
                      title: "Wet- en regelgeving",
                      body: "Je blijft zelf verantwoordelijk voor naleving van lokale wet- en regelgeving.",
                    },
                  ]}
                />
              }
            />
            <Route path='*' element={<Navigate to='/' replace />} />
            </Routes>
            </Suspense>
            <SiteFooter />
            </Box>
          </Box>
          <BottomNav />
        </BrowserRouter>
        <ScrollToTopButton />
        </Box>
      </AuthProvider>
    </div>
  );
}

export default App;
