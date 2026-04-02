import React, { useEffect, useState } from 'react';
import { onSnapshot } from "firebase/firestore";
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
    const [leveranciers, setLeveranciers] = useState<Grower[]>([])
    const [loading, setLoading] = useState(true)

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
            setLeveranciers(Growers.filter((item): item is Grower => Boolean(item)))
        })

        return () => {
            unsubscribe()
        }
    }, [brandId]);

    if (loading) {
        return <div>Loading...</div>;
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
