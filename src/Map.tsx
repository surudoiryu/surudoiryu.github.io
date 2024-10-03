import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loader from './components/Loader';
import GoogleMap, { LatLngBounds, MapContextProps } from 'google-maps-react-markers'
import { LengthCountType, ListType } from "./types/data";
import { getMapOptions } from "./api/map.api";
import { LocationObject, ShopType } from "./types/shop";
import './Map.css';
import Marker from "./components/MapMarker";

type Props = {
    shopList: ListType;
    lengthCount: LengthCountType;
    location: LocationObject | null;
    setLocation: (location: LocationObject) => void;
};

export default function PageMap({ shopList, lengthCount, location, setLocation }: Props) {
    const mapRef = useRef<any>([])
    const navigate = useNavigate();
    
    const [mapReady, setMapReady] = useState<boolean>(false)
    const [mapBounds, setMapBounds] = useState<{ bounds: number[]; zoom: number }>({ bounds: [], zoom: 0 })
    const [usedCoordinates, setUsedCoordinates] = useState<number>(0)
    const [currCoordinates, setCurrCoordinates] = useState(shopList.list[usedCoordinates])
    const [highlighted, setHighlighted] = useState<string | null>(null)
    const [selectedShop, setSelectedShop] = useState<ShopType>()

    const handleRetrieveUserLocation = () => {
        console.log(navigator.geolocation.getCurrentPosition(handleSuccess))
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 0 
            });
        } else {
            console.log("Geolocation not supported");
        }
    }

    const handleOpenCannabisStore = () => {
        if(selectedShop) {
            navigate(`/cannabis-winkel/${selectedShop?.shortcode}`, { replace: true }); 
        } else {
            console.log('Something went wrong with selecting a Cannabis Store')
        }
    }

    const handleSuccess = (position: any) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude: latitude, longitude: longitude });
        console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
    }

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
    }

    /**
       * @description This function is called when the map is ready
       * @param {Object} map - reference to the map instance
       * @param {Object} maps - reference to the maps library
       */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const onGoogleApiLoaded = ({ map, maps }: { map: MapContextProps['map']; maps: MapContextProps['maps'] }) => {
        mapRef.current = map
        setMapReady(true)
    }

    const onMarkerClick = (e: any, { markerId, lat, lng }: { lat: number; lng: number; markerId: string }) => {
        console.log(e)
        setHighlighted(markerId)
        if(mapReady && mapRef.current) {
            mapRef.current.setCenter({ lat, lng })
            if(location) {
                setSelectedShop(shopList.list.find(shop => shop.id === parseInt(markerId)))
            }
        }
    }

    const markerDistance = (mk1: LocationObject, mk2: LocationObject) => {
        //var R = 3958.8; // Radius of the Earth in miles
        var R = 6371.0710 // Radius of the Earth in kilometers
        var rlat1 = mk1.latitude * (Math.PI / 180); // Convert degrees to radians
        var rlat2 = mk2.latitude * (Math.PI / 180); // Convert degrees to radians
        var difflat = rlat2 - rlat1; // Radian difference (latitudes)
        var difflon = (mk2.longitude - mk1.longitude) * (Math.PI / 180); // Radian difference (longitudes)

        var d = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat / 2) * Math.sin(difflat / 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)));
        return d;
    }

    useEffect(() => {
        setCurrCoordinates(shopList.list[usedCoordinates])
    }, [location])

    return (
        <section className="map-container">
            {!shopList.loading ?? (
                <Loader size={40} display="block" />
            )}
            
            {shopList.list.length > 0 && (
                <GoogleMap
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}
                    defaultCenter={{ lat: 52.08766, lng: 5.22577 }}
                    defaultZoom={10}
                    options={getMapOptions}
                    mapMinHeight="calc(100vh - 60px)"
                    onGoogleApiLoaded={onGoogleApiLoaded}
                    onChange={(map) => console.log('Map moved', map)}
                >
                    {location && (
                        <Marker
                            key={`-1`}
                            image={'marker-pin.png'}
                            lat={location.latitude}
                            lng={location.longitude}
                            markerId={`userloc`}
                            onClick={undefined} // you need to manage this prop on your Marker component!
                            draggable={false}
                        // onDragStart={(e, { latLng }) => {}}
                        // onDrag={(e, { latLng }) => {}}
                        // onDragEnd={(e, { latLng }) => {}}
                        />
                    )}

                    {shopList.list.map(({ lat, lng, name, logo, id }: ShopType, index) => (
                        <Marker
                            key={index}
                            image={logo}
                            lat={lat}
                            lng={lng}
                            markerId={id.toString()}
                            onClick={onMarkerClick} // you need to manage this prop on your Marker component!
                            draggable={false}
                            background={true}
                        // onDragStart={(e, { latLng }) => {}}
                        // onDrag={(e, { latLng }) => {}}
                        // onDragEnd={(e, { latLng }) => {}}
                        />
                    ))}
                </GoogleMap>
            )}

            {highlighted && parseInt(highlighted) > 0 && (
                <div className={'highlighted'}>
                    <button style={{position: "absolute", top:0, right: 0}} type="button" onClick={() => setHighlighted(null)}>
                        X
                    </button>
                    {location && selectedShop && (
                        <>
                            <img src={selectedShop.logo} alt={selectedShop.name} style={{maxHeight: 100, maxWidth: 100}}/><br />
                            <strong>{selectedShop.name}</strong> ({selectedShop.rating}/5)<br />
                            Open van: {selectedShop.openFrom} tot {selectedShop.openTill}<br />
                            <button onClick={handleOpenCannabisStore}>Bekijk Cannabiswinkel</button><br />
                            <br />
                            {selectedShop.allowForeigns && (<>Buitenlanders toegestaan<br /></>)} 
                            {selectedShop.drive && (<>Heeft Drive-Through<br /></>)} 
                            {selectedShop.easyParking && (<>Parkeren is mogelijk<br /></>)} 
                            {selectedShop.payByCard && (<>Pinnen kan<br /></>)} 
                            {selectedShop.pickup && (<>Heeft pickup-point<br /></>)}
                            {selectedShop.disabled && (<>Rolstoel toegankelijk<br /></>)}
                            Afstand tot winkel: <strong>{markerDistance(location, { latitude: selectedShop?.lat, longitude: selectedShop.lng }).toFixed(2) + "km"}</strong><br/>
                            <button onClick={handleRetrieveUserLocation}>Update locatie</button>
                        </>
                    )}
                </div>
            )}
        </section>
    )
}