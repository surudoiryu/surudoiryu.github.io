import React from "react";
import Loader from './components/Loader';
import { LengthCountType, ListType } from "./types/data";
import ProductCard from "./components/ProductCard";
import GrowerCard from "./components/GrowerCard";
import logo from './logo.svg';
import './Home.css';
import { Button, Typography } from "@mui/material";
import { GrowerType } from "./types/grower";
import { ProductType } from "./types/product";
import { useNavigate } from "react-router-dom";

type Props = {
    productList: ListType;
    growerList: ListType;
};

export default function PageHome({ productList, growerList }: Props) {
    const navigate = useNavigate();
    
    const handleOpenAllProducts = () => {
        navigate('/cannabis', { replace: true }); 
    }

    return (
        <section className="home-container">
            <header className="App-header">
                <img src={logo} className="App-logo" alt="logo" />
                <p>
                    Binnenkort beschikbaar!
                </p>
            </header>
            
            <section id="headerInfo" style={{ textAlign: 'left', margin: 30 }}>
                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Waarom deze applicatie ?
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    Sinds het Experiment "gesloten cannabis keten" van de overheid, is legale teelt en verkoop mogelijk van cannabis dat niet langer meer via het gedoogdbeleid gaat.
                    De geselecteerde telers verkopen dus aan de Cannabis winkels maar geven geen duidelijke informatie over de verkochte soortjes anders dan het THC gehalte, de naam en een eventuele bijsluiter over het gebruik in het algemeen.
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Wij willen iedereen de juiste informatie verschaffen gemaakt door de telers en aangevuld door de gebruikers, daadwerkelijk weten wat en waar je het koopt.
                </Typography>
            </section>

            <section id="cannabisStrains">
                {!productList.loading ?? (
                    <Loader size={40} display="block" />
                )}

                {productList.list.length > 0 && ( 
                    <>
                        <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600, textAlign: "left", marginLeft: "30px" }}>
                            Veel gezochte soortjes
                        </Typography>
                        <div style={{ width: "100%", overflow: "auto", display: "flex" }}>
                            {productList.list.map((prod: ProductType) => (
                                <div style={{ minWidth: 350, height: 500, margin: 16 }}>
                                    <ProductCard product={prod} />
                                </div>
                            ))}
                        </div>
                        <br />
                        <Button style={{ width: "90%" }} color="success" variant="contained" onClick={handleOpenAllProducts}>Bekijk alles</Button>
                    </>
                )}
            </section>

            <br /><br /><br />
            <section id="growerInfo" style={{ textAlign: 'left', margin: 30 }}>
                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Geselecteerde Telers
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    Er is aan handjevol telers aangewezen voor dit experiment, deze telers mogen legaal hun activiteiten uitvoeren onder het gecontrolleerde en gereguleerde systeem.
                </Typography>
            </section>

            <section id="cannabisGrowers">
                {!growerList.loading ?? (
                    <Loader size={40} display="block" />
                )}

                {growerList.list && growerList.list.length > 0 && (
                    <>
                        <div style={{ width: "100%", overflow: "auto", display: "flex" }}>
                            {growerList.list.slice(0,10).map((grow: GrowerType) => (
                                <div style={{ minWidth: 250, height: 280, margin: 16 }}>
                                    <GrowerCard grower={grow} />
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </section>
            
        </section>
    )
}