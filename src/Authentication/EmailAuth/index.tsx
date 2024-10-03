import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "../../firebaseConfig";


export const registerUser = async (
    name: string, 
    email: string, 
    password: string, 
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
) => {
    
    try {
        setLoading(true)
        // create a new user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const results = userCredential.user
        console.log(results);
        // send email verification to the user
        await sendEmailVerification(results)
        alert(`Er is een verificatie e-mail verstuurd naar het opgegeven adres (${email})`)
    } catch (error) {
        console.log({name, email, password})
        console.log(error)
    } finally {
        setLoading(false)
    }

    
}