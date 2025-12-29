import React, { useEffect, useState } from 'react';
import { Grower } from "../interfaces/grower";
import { onSnapshot } from "firebase/firestore";
import { brandCollectionRef } from '../firebaseCollections';
import GrowerCard from './GrowerCard';

interface brandProp {
    brandId?: string;
}

const Leveranciers = ({ brandId }: brandProp) => {
    const [leveranciers, setLeveranciers] = useState<Grower[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(brandCollectionRef, async (snapshot) => {
            const growers = snapshot.docs.map(doc => {
                const growerData = doc.data() as Grower;
                if (!brandId || growerData?.title === brandId) {
                    return { ...growerData, id: doc.id };
                }
                return null;
            }).filter(Boolean) as Grower[];
            setLoading(false);
            setLeveranciers(growers);
        })

        return () => {
            unsubscribe()
        }
    }, [brandId]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error loading grower data: {error}</div>;
    }

    return (
        <>
            {leveranciers.map((leverancier) => (
                <div key={`growercontainer-${leverancier.id}`} style={{ minWidth: 250, height: 280, margin: 16 }}>
                    <GrowerCard key={`growercard-${leverancier.id}`} grower={leverancier} />
                </div>
            ))}
        </>
    );
}

export default Leveranciers;