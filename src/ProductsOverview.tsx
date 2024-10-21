import ProductenPerMerk from './components/BrandProducts';
import logo from './logo.svg';

export default function PageProductsOverview() {
    return (
        <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            Filter / Zoek - functie
            <div style={{ width: "100%", overflow: "auto", display: "block" }}>
                <ProductenPerMerk />
            </div>
        </header>
    )
}