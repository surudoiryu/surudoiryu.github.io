import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import GrowerCard from './components/GrowerCard';
import { Grower } from './interfaces/grower';
import './GrowersOverview.css';

export default function PageGrowersOverview() {
    const [growers, setGrowers] = useState<Grower[]>([]);
    const [newGrower, setNewGrower] = useState({ 
        title: '',
        description: '',
        shortDescription: '',
        images: { overview: '', close: '', mood: '', logo: '' },
        thumbnailUrl: '', 
    });

    useEffect(() => {
        const growersCollection = collection(db, 'Brands');

        // Real-time updates with onSnapshot
        const unsubscribe = onSnapshot(growersCollection, (snapshot) => {
            const growersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grower));
            console.log('Fetched growers:', growersData);
            setGrowers(growersData);
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name.startsWith('images.')) {
            const imageField = name.split('.')[1]; // Haal het veld op (bijv. 'overview')
            setNewGrower((prev) => ({
                ...prev,
                images: {
                    ...prev.images,
                    [imageField]: value,
                },
            }));
        } else {
            setNewGrower((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleAddGrower = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const growersCollection = collection(db, 'Brands');
            await addDoc(growersCollection, newGrower);
            console.log('Grower added successfully');
        } catch (error) {
            console.error('Error adding grower:', error);
        }
    };

    return (
        <div className="growers-overview">
            <h1>Available Growers</h1>
            <div className="growers-list">
                {growers.length > 0 ? (
                    growers.map((grower) => (
                        <GrowerCard key={grower.id} grower={grower} />
                    ))
                ) : (
                    <p>No growers available at the moment.</p>
                )}
            </div>

            {/* Form to add new growers */}
            <div className="add-grower-form">
                <h2>Add a New Grower</h2>
                <form onSubmit={handleAddGrower}>
                    <input
                        type="text"
                        name="title"
                        placeholder="Title"
                        value={newGrower.title}
                        onChange={handleInputChange}
                        required
                    />
                    <input
                        type="text"
                        name="description"
                        placeholder="Description"
                        value={newGrower.description}
                        onChange={handleInputChange}
                    />
                    <input
                        type="text"
                        name="shortDescription"
                        placeholder="Short Description"
                        value={newGrower.shortDescription}
                        onChange={handleInputChange}
                    />
                    <input
                        type="text"
                        name="thumbnailUrl"
                        placeholder="Thumbnail URL"
                        value={newGrower.thumbnailUrl}
                        onChange={handleInputChange}
                    />
                    <h3>Images</h3>
                    <input
                        type="text"
                        name="images.overview"
                        placeholder="Overview Image URL"
                        value={newGrower.images.overview}
                        onChange={handleInputChange}
                    />
                    <input
                        type="text"
                        name="images.close"
                        placeholder="Close Image URL"
                        value={newGrower.images.close}
                        onChange={handleInputChange}
                    />
                    <input
                        type="text"
                        name="images.mood"
                        placeholder="Mood Image URL"
                        value={newGrower.images.mood}
                        onChange={handleInputChange}
                    />
                    <input
                        type="text"
                        name="images.logo"
                        placeholder="Logo Image URL"
                        value={newGrower.images.logo}
                        onChange={handleInputChange}
                    />
                    <button type="submit">Add Grower</button>
                </form>
            </div>
        </div>
    );
}