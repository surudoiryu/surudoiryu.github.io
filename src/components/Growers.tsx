import React, { useEffect, useState } from 'react';
import { DocumentReference, collection, getDocs, doc, query, where, onSnapshot, getDoc } from "firebase/firestore";
import { brandCollectionRef } from '../firebaseCollections';
import { GrowerType } from '../types/grower';
import GrowerCard from './GrowerCard';

interface brandProp {
    brandId?: string;
}

interface Grower {
    id: string,
    data: GrowerType
}

const Leveranciers = ({ brandId }: brandProp) => {
    const [leveranciers, setLeveranciers] = useState<any>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(brandCollectionRef, async (snapshot) => {
            const Growers = await Promise.all(snapshot.docs.map(async (doc) => {
                const growerData = doc.data() as GrowerType

                if (!brandId || growerData?.title === brandId) {
                    return {
                        id: doc.id,
                        data: {
                            ...growerData
                        }
                    }
                }

                return null
            }))
            setLoading(false)
            setLeveranciers(Growers)
        })

        return () => {
            unsubscribe()
        }
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error loading grower data: {error}</div>;
    }

    return (
        <>
            {leveranciers.map((leverancier: Grower) => {
                if (leverancier && leverancier.data) return (
                    <div key={`growercontainer-${leverancier.id}`} style={{ minWidth: 250, height: 280, margin: 16 }}>
                        <GrowerCard key={`growercard-${leverancier.id}`} grower={leverancier.data} />
                    </div>
                )
                return ""
            }
            )}
        </>
    );
}

export default Leveranciers;