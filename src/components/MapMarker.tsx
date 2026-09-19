import { LatLngLiteral } from 'google-maps-react-markers'
import React from 'react'

interface MarkerProps {
    className?: string
    image?: string
    label?: string
    pinColor?: string
    draggable: boolean
    background?: boolean
    lat: number
    lng: number
    markerId: string
    onClick?: (
        e: React.MouseEvent<HTMLElement, MouseEvent>,
        props: { lat: number; lng: number; markerId: string },
    ) => void
    onDrag?: (e: React.MouseEvent<HTMLElement, MouseEvent>, props: { latLng: LatLngLiteral }) => void
    onDragEnd?: (e: React.MouseEvent<HTMLElement, MouseEvent>, props: { latLng: LatLngLiteral }) => void
    onDragStart?: (e: React.MouseEvent<HTMLElement, MouseEvent>, props: { latLng: LatLngLiteral }) => void
    children?: React.ReactNode
}

const Marker = ({
    className,
    image,
    label,
    pinColor = "#2e7d32",
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
    children,
    ...props
}: MarkerProps) =>
    lat && lng && children ? (
        <div
            className={className}
            onClick={(e) => (onClick ? onClick(e, { markerId, lat, lng }) : null)}
            style={{ cursor: background ? "pointer" : "grab" }}
            {...props}
        >
            {children}
        </div>
    ) : lat && lng && image ? (
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
    ) : lat && lng && label ? (
        <div
            className={className}
            onClick={(e) => (onClick ? onClick(e, { markerId, lat, lng }) : null)}
            style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                backgroundColor: pinColor,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: (background) ? "pointer" : "grab",
                border: "2px solid #fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
                userSelect: "none",
            }}
            {...props}
        >
            {label}
        </div>
    ) : null

export default Marker
