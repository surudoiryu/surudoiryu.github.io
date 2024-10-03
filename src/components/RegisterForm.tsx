import { Button } from "@mui/material";
import { Input } from "@mui/material";
import { useState } from "react";
import { registerUser } from "../Authentication/EmailAuth";

const RegisterForm  = () => {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [name, setName] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    
    const handleSubmitForm = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        registerUser(name, email, password, setIsLoading)
    }

    if(isLoading) {
        return <p>Aan het laden...</p>
    }

    return (
        <form className="flex flex-col gap-4 mt-10" onSubmit={(e) => handleSubmitForm(e)}>
            Gebruikersnaam:<br /><Input required aria-label="Name" type="text" name="name" value={name} onChange={(e) => setName(e.currentTarget.value)} /><br />
            <br />
            E-mailadres:<br /><Input required aria-label="E-mailadres" type="email" name="email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} /><br />
            <br />
            Wachtwoord:<br /><Input required aria-label="Wachtwoord" type="password" name="password" value={password} onChange={(e) => setPassword(e.currentTarget.value)} /><br />
            <Button type="submit">Aanmelden</Button>
        </form>
    )
}

export default RegisterForm