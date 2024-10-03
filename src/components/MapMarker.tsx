import { LatLngLiteral } from 'google-maps-react-markers'
import React from 'react'

interface MarkerProps {
    className?: string
    image?: string
    draggable: boolean
    background?: boolean
    lat: number
    lng: number
    markerId: string
    onClick?: (
        e: React.MouseEvent<HTMLImageElement, MouseEvent>,
        props: { lat: number; lng: number; markerId: string },
    ) => void
    onDrag?: (e: React.MouseEvent<HTMLImageElement, MouseEvent>, props: { latLng: LatLngLiteral }) => void
    onDragEnd?: (e: React.MouseEvent<HTMLImageElement, MouseEvent>, props: { latLng: LatLngLiteral }) => void
    onDragStart?: (e: React.MouseEvent<HTMLImageElement, MouseEvent>, props: { latLng: LatLngLiteral }) => void
}

const Marker = ({
    className,
    image,
    lat,
    lng,
    markerId,
    onClick,
    draggable,
    background,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onDrag,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onDragEnd,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onDragStart,
    ...props
}: MarkerProps) =>
    lat && lng && image ? (
        <img
            className={className}
            src={`${image}`}
            // lat={lat}
            // lng={lng}
            onClick={(e) => (onClick ? onClick(e, { markerId, lat, lng }) : null)}
            style={{ fontSize: 40, cursor: (background) ? "pointer" : "grab", backgroundColor: (background) ? "#ffffff" : "transparent", borderRadius: (background) ? "50px" : "0px", padding: (background) ? "10px" : "0px", objectFit: "scale-down" }}
            alt={markerId}
            width={50}
            height={50}
            {...props}
        />
    ) : null

export default Marker