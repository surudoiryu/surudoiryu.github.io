import React, { useEffect, useState } from "react";
import Loader from './components/Loader';
import { LengthCountType, ListType } from "./types/data";
import ProductCard from "./components/ProductCard";
import GrowerCard from "./components/GrowerCard";
import logo from './logo.svg';
import './Shop.css';
import { Button, Typography } from "@mui/material";
import { GrowerType } from "./types/grower";
import { ProductType } from "./types/product";
import { ShopType } from "./types/shop";
import { useLocation, useNavigate } from "react-router-dom";

type Props = {
    shopList: ListType;
    growerList: ListType;
    productList: ListType;
};

export default function PageShop({ shopList, growerList, productList }: Props) {
    const navigate = useNavigate();
    const location = useLocation();
    const shopcode = location.pathname.split("/")[2];

    const [selectedShop, setSelectedShop] = useState<ShopType>()
    const [filteredGrowers, setFilteredGrowers] = useState<Array<number>>()

    
    useEffect(() => {
        if(!selectedShop) {
            setSelectedShop(shopList.list.find(shop => shop.shortcode === shopcode))
        }
    }, [shopList])

    useEffect(() => {
        const growers = productList.list.map((e) => e.grower).filter((val, id, array) => array.indexOf(val) === id)
        console.log(growers)
        setFilteredGrowers(growers)
    }, [productList])

    return (
        <section className="shop-container">
            <section id="headerInfo" style={{ textAlign: 'left', margin: 30 }}>
                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {selectedShop?.name}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    <img src={selectedShop?.logo} alt={selectedShop?.name} style={{maxWidth: "100%"}} />
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>

                    {selectedShop?.description}
                </Typography>
            </section>

            <section id="shopDetails" style={{ textAlign: 'left', marginBottom: '30px' }}>
                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600, marginLeft: "30px" }}>
                    Winkel informatie:
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', marginLeft: "30px" }}>
                    Nederlandse Nationaliteit: <strong>{!selectedShop?.allowForeigns ? "Ja": "Nee"}</strong>
                    </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', marginLeft: "30px" }}>
                    Rolstoel toegankelijk: <strong>{!selectedShop?.disabled ? "Ja" : "Nee"}</strong>
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', marginLeft: "30px" }}>
                    Parkeren in de buurt: <strong>{!selectedShop?.easyParking ? "Ja" : "Nee"}</strong>
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', marginLeft: "30px" }}>
                    Pinnen mogelijk: <strong>{!selectedShop?.payByCard ? "Ja" : "Nee"}</strong>
                    </Typography >
                <Typography variant="body1" sx={{ color: 'text.secondary', marginLeft: "30px" }}>
                    Drive-Through aanwezig: <strong>{!selectedShop?.drive ? "Ja" : "Nee"}</strong>
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', marginLeft: "30px" }}>
                    Heeft click&collect: <strong>{!selectedShop?.pickup ? "Ja" : "Nee"}</strong>
                </Typography>
            </section>

            <section id="cannabisGrowers" style={{ textAlign: 'left' }}>
                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600, marginLeft: "30px" }}>
                    Verkoopt cannabis van:
                </Typography>
                {!growerList.loading ?? (
                    <Loader size={40} display="block" />
                )}

                {growerList.list && growerList.list.length > 0 && (
                    <>
                        <div style={{ width: "100%", overflow: "auto", display: "flex" }}>
                            {growerList.list.map((grow: GrowerType) => filteredGrowers && filteredGrowers.includes(grow.id) ? (
                                <div style={{ minWidth: 250, height: 280, margin: 16 }}>
                                    <GrowerCard grower={grow} />
                                </div>
                            ):(<></>))}
                        </div>
                    </>
                )}
            </section>

            <section id="cannabisSelling" style={{ textAlign: 'left' }}>
                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600, marginLeft: "30px" }}>
                    Producten:
                </Typography>
                {!productList.loading ?? (
                    <Loader size={40} display="block" />
                )}

                {productList.list && productList.list.length > 0 && (
                    <>
                        <div style={{ width: "100%", overflow: "auto", display: "flex" }}>
                            {productList.list.map((product: ProductType) => selectedShop && selectedShop.products && selectedShop.products.includes(product.id) ? (
                                <div style={{ minWidth: 350, height: 500, margin: 16 }}>
                                    <ProductCard product={product} />
                                </div>
                            ):(<></>))}
                        </div>
                    </>
                )}
            </section>

        </section>
    )
}