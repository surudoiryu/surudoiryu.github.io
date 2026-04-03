import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "./components/Loader";
import GoogleMap, { MapContextProps } from "google-maps-react-markers";
import { LengthCountType, ListType } from "./types/data";
import { getMapOptions } from "./api/map.api";
import { LocationObject, ShopType } from "./types/shop";
import "./Map.css";
import Marker from "./components/MapMarker";
import { onSnapshot } from "firebase/firestore";
import { shopCollectionRef } from "./firebaseCollections";

type Props = {
    shopList: ListType;
    lengthCount: LengthCountType;
    location: LocationObject | null;
    setLocation: (location: LocationObject) => void;
};

export default function PageMap({ shopList, location, setLocation }: Props) {
    const mapRef = useRef<any>([]);
    const navigate = useNavigate();

    const [mapReady, setMapReady] = useState<boolean>(false);
    const [highlighted, setHighlighted] = useState<string | null>(null);
    const [selectedShop, setSelectedShop] = useState<ShopType>();
    const [shops, setShops] = useState<ShopType[]>(shopList.list as ShopType[]);
    const [loadingShops, setLoadingShops] = useState<boolean>(true);
    
    const getShopMarkerId = (shop: ShopType, index: number): string => {
        if (shop.shortcode) {
            return `shop-${shop.shortcode}`;
        }
        if (shop.id !== undefined && shop.id !== null) {
            return `shop-id-${shop.id}`;
        }
        return `shop-index-${index}`;
    };

    useEffect(() => {
        const unsubscribe = onSnapshot(shopCollectionRef, (snapshot) => {
            const docs =
                snapshot.docs.some((item) => item.data()?.source === "graphql")
                    ? snapshot.docs.filter((item) => item.data()?.source === "graphql")
                    : snapshot.docs;

            const firestoreShops = docs
                .map((item) => item.data() as ShopType)
                .filter(
                    (item) =>
                        Number.isFinite(item.lat) &&
                        Number.isFinite(item.lng) &&
                        Math.abs(item.lat) > 0 &&
                        Math.abs(item.lng) > 0
                );

            if (firestoreShops.length > 0) {
                setShops(firestoreShops);
            } else {
                setShops((shopList.list as ShopType[]) ?? []);
            }

            setLoadingShops(false);
        });

        return () => unsubscribe();
    }, [shopList.list]);

    const handleRetrieveUserLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 0,
            });
        } else {
            console.log("Geolocation not supported");
        }
    };

    const handleOpenCannabisStore = () => {
        if (selectedShop) {
            const targetCode = selectedShop.shortcode ?? "";
            if (!targetCode) {
                setHighlighted(null);
                return;
            }
            navigate(`/cannabis-winkel/${targetCode}`);
        } else {
            console.log("Something went wrong with selecting a Cannabis Store");
        }
    };

    const handleSuccess = (position: any) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
    };

    const handleError = (error: any): void => {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                console.error("User denied the request for Geolocation.");
                break;
            case error.POSITION_UNAVAILABLE:
                console.error("Location information is unavailable.");
                break;
            case error.TIMEOUT:
                console.error("The request to get user location timed out.");
                break;
            case error.UNKNOWN_ERROR:
                console.error("An unknown error occurred.");
                break;
        }
    };

    const onGoogleApiLoaded = ({
        map,
    }: {
        map: MapContextProps["map"];
        maps: MapContextProps["maps"];
    }) => {
        mapRef.current = map;
        setMapReady(true);
    };

    const onMarkerClick = (
        _event: any,
        { markerId, lat, lng }: { lat: number; lng: number; markerId: string }
    ) => {
        setHighlighted(markerId);
        if (mapReady && mapRef.current) {
            mapRef.current.setCenter({ lat, lng });
            setSelectedShop(
                shops.find((shop, index) => getShopMarkerId(shop, index) === markerId)
            );
        }
    };

    const markerDistance = (mk1: LocationObject, mk2: LocationObject) => {
        const radius = 6371.071;
        const rlat1 = mk1.latitude * (Math.PI / 180);
        const rlat2 = mk2.latitude * (Math.PI / 180);
        const difflat = rlat2 - rlat1;
        const difflon = (mk2.longitude - mk1.longitude) * (Math.PI / 180);

        return (
            2 *
            radius *
            Math.asin(
                Math.sqrt(
                    Math.sin(difflat / 2) * Math.sin(difflat / 2) +
                        Math.cos(rlat1) *
                            Math.cos(rlat2) *
                            Math.sin(difflon / 2) *
                            Math.sin(difflon / 2)
                )
            )
        );
    };

    return (
        <section className="map-container">
            {loadingShops && <Loader size={40} display="block" />}

            {shops.length > 0 && (
                <GoogleMap
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
                    defaultCenter={{ lat: 52.08766, lng: 5.22577 }}
                    defaultZoom={10}
                    options={getMapOptions}
                    mapMinHeight="calc(100vh - 60px)"
                    onGoogleApiLoaded={onGoogleApiLoaded}
                    onChange={(map) => console.log("Map moved", map)}
                >
                    {location && (
                        <Marker
                            key="user-location"
                            image="marker-pin.png"
                            lat={location.latitude}
                            lng={location.longitude}
                            markerId="userloc"
                            onClick={undefined}
                            draggable={false}
                        />
                    )}

                    {shops.map((shop: ShopType, index) => (
                        <Marker
                            key={getShopMarkerId(shop, index)}
                            image={shop.logo}
                            lat={shop.lat}
                            lng={shop.lng}
                            markerId={getShopMarkerId(shop, index)}
                            onClick={onMarkerClick}
                            draggable={false}
                            background
                        />
                    ))}
                </GoogleMap>
            )}

            {highlighted && selectedShop && (
                <div className="highlighted">
                    <button
                        style={{ position: "absolute", top: 0, right: 0 }}
                        type="button"
                        onClick={() => setHighlighted(null)}
                    >
                        X
                    </button>
                    {location && (
                        <>
                            <img
                                src={selectedShop.logo}
                                alt={selectedShop.name}
                                style={{ maxHeight: 100, maxWidth: 100 }}
                            />
                            <br />
                            <strong>{selectedShop.name}</strong> ({selectedShop.rating}/5)
                            <br />
                            Open van: {selectedShop.openFrom} tot {selectedShop.openTill}
                            <br />
                            <button onClick={handleOpenCannabisStore}>Bekijk Cannabiswinkel</button>
                            <br />
                            <br />
                            {selectedShop.allowForeigns && <>Buitenlanders toegestaan<br /></>}
                            {selectedShop.drive && <>Heeft Drive-Through<br /></>}
                            {selectedShop.easyParking && <>Parkeren is mogelijk<br /></>}
                            {selectedShop.payByCard && <>Pinnen kan<br /></>}
                            {selectedShop.pickup && <>Heeft pickup-point<br /></>}
                            {selectedShop.disabled && <>Rolstoel toegankelijk<br /></>}
                            Afstand tot winkel:{" "}
                            <strong>
                                {markerDistance(location, {
                                    latitude: selectedShop.lat,
                                    longitude: selectedShop.lng,
                                }).toFixed(2)}
                                km
                            </strong>
                            <br />
                            <button onClick={handleRetrieveUserLocation}>Update locatie</button>
                        </>
                    )}
                </div>
            )}
        </section>
    );
}


