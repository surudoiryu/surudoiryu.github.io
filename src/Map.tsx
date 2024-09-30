import React, { useEffect, useRef, useState } from "react";
import Loader from './components/Loader';
import GoogleMap, { LatLngBounds, MapContextProps } from 'google-maps-react-markers'
import { LengthCountType, ListType } from "./types/data";
import { getMapOptions } from "./api/map.api";
import { ShopType } from "./types/shop";
import './Map.css';
import Marker from "./components/MapMarker";

type Props = {
    shopList: ListType;
    lengthCount: LengthCountType;
    location: Object | null;
    setLocation: (location: Object) => void;
};

type LocationObject = {
    coords: {
        latitude: number,
        longitude: number,
    }
}

export default function PageMap({ shopList, lengthCount, location, setLocation }: Props) {
    const mapRef = useRef(null)
    const [mapReady, setMapReady] = useState<boolean>(false)
    const [mapBounds, setMapBounds] = useState<{ bounds: number[]; zoom: number }>({ bounds: [], zoom: 0 })
    const [usedCoordinates, setUsedCoordinates] = useState<number>(0)
    const [currCoordinates, setCurrCoordinates] = useState(shopList.list[usedCoordinates])
    const [highlighted, setHighlighted] = useState<string | null>(null)

    const handleRetrieveUserLocation = () => {
        console.log(navigator.geolocation.getCurrentPosition)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(success, error);
        } else {
            console.log("Geolocation not supported");
        }
    }

    const success = (position: LocationObject) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLocation({ latitude, longitude });
        console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
    }

    const error = (): void => {
        console.log("Unable to retrieve your location");
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

    const onMarkerClick = (e: any, { markerId /* , lat, lng */ }: { lat: number; lng: number; markerId: string }) => {
        setHighlighted(markerId)
    }

    const onMapChange = ({ bounds, zoom }: { bounds: LatLngBounds; zoom: number }) => {
        const ne = bounds.getNorthEast()
        const sw = bounds.getSouthWest()
        /**
         * useSupercluster accepts bounds in the form of [westLng, southLat, eastLng, northLat]
         * const { clusters, supercluster } = useSupercluster({
         *	points: points,
         *	bounds: mapBounds.bounds,
         *	zoom: mapBounds.zoom,
         * })
         */
        setMapBounds({ ...mapBounds, bounds: [sw.lng(), sw.lat(), ne.lng(), ne.lat()], zoom })
        setHighlighted(null)
    }

    useEffect(() => {
        setCurrCoordinates(shopList.list[usedCoordinates])
    }, [usedCoordinates])

    return (
        <section className="map-container">
            {location ? <button onClick={handleRetrieveUserLocation}>Stel locatie in</button> : null}

            {!shopList.loading ?? (
                <Loader size={40} display="block" />
            )}

            {shopList.list.length > 0 && (
                <GoogleMap
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}
                    defaultCenter={{ lat: 52.08766, lng: 5.22577 }}
                    defaultZoom={10}
                    options={getMapOptions}
                    mapMinHeight="100vh"
                    onGoogleApiLoaded={onGoogleApiLoaded}
                    onChange={(map) => console.log('Map moved', map)}
                >
                    {shopList.list.map(({ lat, lng, name, logo }: ShopType, index) => (
                        <Marker
                            key={index}
                            image={logo}
                            lat={lat}
                            lng={lng}
                            markerId={name}
                            onClick={onMarkerClick} // you need to manage this prop on your Marker component!
                            draggable={false}
                        // onDragStart={(e, { latLng }) => {}}
                        // onDrag={(e, { latLng }) => {}}
                        // onDragEnd={(e, { latLng }) => {}}
                        />
                    ))}
                </GoogleMap>
            )}

            {highlighted && (
                <div className={'highlighted'}>
                    {highlighted}
                    <button type="button" onClick={() => setHighlighted(null)}>
                        X
                    </button>
                </div>
            )}
        </section>
    )
}