import React from "react";
import Loader from './components/Loader';
import { LengthCountType, ListType } from "./types/data";
import ProductCard from "./components/ProductCard";
import logo from './logo.svg';

type Props = {
    productList: ListType;
    lengthCount: LengthCountType;
};

export default function PageHome({ productList, lengthCount }: Props) {

    return (
        <section className="table-container">
            <header className="App-header">
                <img src={logo} className="App-logo" alt="logo" />
                <p>
                    Binnenkort beschikbaar!
                </p>
            </header>
            Producten: <b>{lengthCount.loading ? <Loader size={14} /> : productList.list.length}</b>

            {!productList.loading ?? (
                <Loader size={40} display="block" />
            )}

            {productList.list.length > 0 && ( 
                <div style={{ width: "100%", overflow: "auto", display: "flex" }}>
                    {productList.list.map( (prod) => (
                        <div style={{ minWidth: 350, height: 500, margin: 16 }}>
                            <ProductCard product={prod} />
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}