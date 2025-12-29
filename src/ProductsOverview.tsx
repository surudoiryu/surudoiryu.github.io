import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import ProductCard from './components/ProductCard';
import { Grower } from './interfaces/grower';
import { Product } from './interfaces/product';
import './ProductsOverview.css';
import logo from './logo.svg';

export default function PageProductsOverview() {
    const [products, setProducts] = useState<Product[]>([]);
    const [newProduct, setNewProduct] = useState({
        id: '',
        shortcode: '',
        title: '',
        brand: {} as Grower, // Placeholder voor een Grower
        grower: 0,
        type: '',
        thumbnailUrl: '',
        description: '',
        thcMin: 0,
        thcMax: 0,
        cbdMin: 0,
        cbdMax: 0,
        rating: 0,
        images: { overview: '', close: '', mood: '', logo: '' },
        dominantTerpene: { name: '', description: '' },
        dominantPositiveEffect: { name: '', description: '' },
        dominantNegativeEffect: { name: '', description: '' },
        variants: [],
    });

    useEffect(() => {
        const productsCollection = collection(db, 'Producten');

        // Real-time updates with onSnapshot
        const unsubscribe = onSnapshot(productsCollection, (snapshot) => {
            const productsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
            console.log('Fetched products:', productsData);
            setProducts(productsData);
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
    
        if (name.includes('.')) {
            // Voor geneste velden zoals images.overview
            const keys = name.split('.');
            setNewProduct((prev) => {
                let updatedField = { ...prev };
                let current = updatedField;
    
                for (let i = 0; i < keys.length - 1; i++) {
                    current = current[keys[i]];
                }
    
                current[keys[keys.length - 1]] = value;
                return updatedField;
            });
        } else {
            setNewProduct((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const productsCollection = collection(db, 'Producten');
            await addDoc(productsCollection, newProduct);
            console.log('Product added successfully');
        } catch (error) {
            console.error('Error adding product:', error);
        }
    };

    return (
        <>
            <header className="App-header">
                <img src={logo} className="App-logo" alt="logo" />
                Filter / Zoek - functie
            </header>

            <div className="products-overview">
                <h1>Available Products</h1>
                <div className="products-list">
                    {products.length > 0 ? (
                        products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))
                    ) : (
                        <p>No products available at the moment.</p>
                    )}
                </div>

                {/* Form to add new products */}
                <div className="add-product-form">
                    <h2>Add a New Product</h2>
                    <form onSubmit={handleAddProduct}>
                        <input
                            type="text"
                            name="title"
                            placeholder="Title"
                            value={newProduct.title}
                            onChange={handleInputChange}
                            required
                        />
                        <input
                            type="text"
                            name="shortcode"
                            placeholder="Shortcode"
                            value={newProduct.shortcode}
                            onChange={handleInputChange}
                        />
                        <input
                            type="text"
                            name="description"
                            placeholder="Description"
                            value={newProduct.description}
                            onChange={handleInputChange}
                        />
                        <input
                            type="number"
                            name="thcMin"
                            placeholder="THC Min"
                            value={newProduct.thcMin}
                            onChange={handleInputChange}
                        />
                        <input
                            type="number"
                            name="thcMax"
                            placeholder="THC Max"
                            value={newProduct.thcMax}
                            onChange={handleInputChange}
                        />
                        <input
                            type="number"
                            name="cbdMin"
                            placeholder="CBD Min"
                            value={newProduct.cbdMin}
                            onChange={handleInputChange}
                        />
                        <input
                            type="number"
                            name="cbdMax"
                            placeholder="CBD Max"
                            value={newProduct.cbdMax}
                            onChange={handleInputChange}
                        />
                        <input
                            type="number"
                            name="rating"
                            placeholder="Rating"
                            value={newProduct.rating}
                            onChange={handleInputChange}
                        />
                        <input
                            type="text"
                            name="thumbnailUrl"
                            placeholder="Thumbnail URL"
                            value={newProduct.thumbnailUrl}
                            onChange={handleInputChange}
                        />
                        <h3>Images</h3>
                        <input
                            type="text"
                            name="images.overview"
                            placeholder="Overview Image URL"
                            value={newProduct.images.overview}
                            onChange={handleInputChange}
                        />
                        <input
                            type="text"
                            name="images.close"
                            placeholder="Close Image URL"
                            value={newProduct.images.close}
                            onChange={handleInputChange}
                        />
                        <input
                            type="text"
                            name="images.mood"
                            placeholder="Mood Image URL"
                            value={newProduct.images.mood}
                            onChange={handleInputChange}
                        />
                        <input
                            type="text"
                            name="images.logo"
                            placeholder="Logo Image URL"
                            value={newProduct.images.logo}
                            onChange={handleInputChange}
                        />
                        <h3>Dominant Terpene</h3>
                        <input
                            type="text"
                            name="dominantTerpene.name"
                            placeholder="Terpene Name"
                            value={newProduct.dominantTerpene.name}
                            onChange={handleInputChange}
                        />
                        <input
                            type="text"
                            name="dominantTerpene.description"
                            placeholder="Terpene Description"
                            value={newProduct.dominantTerpene.description}
                            onChange={handleInputChange}
                        />
                        <h3>Dominant Positive Effect</h3>
                        <input
                            type="text"
                            name="dominantPositiveEffect.name"
                            placeholder="Positive Effect Name"
                            value={newProduct.dominantPositiveEffect.name}
                            onChange={handleInputChange}
                        />
                        <input
                            type="text"
                            name="dominantPositiveEffect.description"
                            placeholder="Positive Effect Description"
                            value={newProduct.dominantPositiveEffect.description}
                            onChange={handleInputChange}
                        />
                        <h3>Dominant Negative Effect</h3>
                        <input
                            type="text"
                            name="dominantNegativeEffect.name"
                            placeholder="Negative Effect Name"
                            value={newProduct.dominantNegativeEffect.name}
                            onChange={handleInputChange}
                        />
                        <input
                            type="text"
                            name="dominantNegativeEffect.description"
                            placeholder="Negative Effect Description"
                            value={newProduct.dominantNegativeEffect.description}
                            onChange={handleInputChange}
                        />
                        <button type="submit">Add Product</button>
                    </form>
                </div>
            </div>
        </>
    )
}