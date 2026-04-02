import { ListType } from "./types/data";
import logo from './logo.svg';
import './Home.css';
import { Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ProductenPerMerk from "./components/BrandProducts";
import Leveranciers from "./components/Growers";
import Loader from "./components/Loader";

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
                {productList.loading && (
                    <Loader size={40} display="block" />
                )}

                <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600, textAlign: "left", marginLeft: "30px" }}>
                    Veel gezochte soortjes
                </Typography>
                <div style={{ width: "100%", overflow: "auto", display: "flex" }}>
                    <ProductenPerMerk limit={10} />
                </div>
                <br />
                <Button style={{ width: "90%" }} color="success" variant="contained" onClick={handleOpenAllProducts}>Bekijk alles</Button>

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
                <div style={{ width: "100%", overflow: "auto", display: "flex" }}>
                    <Leveranciers />
                </div>
            </section>
            
        </section>
    )
}
