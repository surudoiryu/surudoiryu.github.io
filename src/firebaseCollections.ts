import { collection } from "firebase/firestore";
import { db } from "./firebaseConfig";

export const productCollectionRef = collection(db, 'Producten')
export const brandCollectionRef = collection(db, 'Brands')
export const effectCollectionRef = collection(db, 'Effects')
export const shopCollectionRef = collection(db, 'Shops')
export const tasteCollectionRef = collection(db, 'Tastes')
export const terpeneCollectionRef = collection(db, 'Terpenes')
export const categoryCollectionRef = collection(db, 'Categories')
export const subCategoryCollectionRef = collection(db, 'SubCategories')
export const viewStatsCollectionRef = collection(db, 'ViewStats')
export const gebruikersCollectionRef = collection(db, 'Gebruikers')
export const reviewsCollectionRef = collection(db, 'reviews')
