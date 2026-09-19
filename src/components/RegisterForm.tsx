import { Alert, Button, Input, Typography } from "@mui/material";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { evaluateAdultBirthDate } from "../utils/age-rule.mjs";
import { writeAgeState } from "./AgeGate";

type RegisterFormProps = {
    onSuccess: () => void;
};

const RegisterForm = ({ onSuccess }: RegisterFormProps) => {
    const { register } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmitForm = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const decision = evaluateAdultBirthDate(birthDate);
            if (!decision.allowed) {
                if (decision.reason === "underage") {
                    writeAgeState("age_denied");
                    throw new Error("WeedInfo is alleen toegankelijk voor personen van 18 jaar en ouder.");
                }
                throw new Error("Vul een geldige geboortedatum in.");
            }
            await register({ name, username, birthDate, email, password });
            onSuccess();
        } catch (registerError) {
            const message =
                registerError instanceof Error
                    ? registerError.message
                    : "Registratie is mislukt.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <form onSubmit={handleSubmitForm}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Gebruikersnaam
                </Typography>
                <Input
                    fullWidth
                    required
                    aria-label="Name"
                    type="text"
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.currentTarget.value)}
                />
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
                    Profielnaam (publiek)
                </Typography>
                <Input
                    fullWidth
                    required
                    aria-label="Username"
                    type="text"
                    name="username"
                    value={username}
                    onChange={(event) => setUsername(event.currentTarget.value)}
                />
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
                    E-mailadres
                </Typography>
                <Input
                    fullWidth
                    required
                    aria-label="E-mailadres"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) => setEmail(event.currentTarget.value)}
                />
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
                    Wachtwoord
                </Typography>
                <Input
                    fullWidth
                    required
                    aria-label="Wachtwoord"
                    type="password"
                    name="password"
                    value={password}
                    onChange={(event) => setPassword(event.currentTarget.value)}
                />
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
                    Geboortedatum
                </Typography>
                <Input
                    fullWidth
                    required
                    aria-label="Geboortedatum"
                    type="date"
                    name="birthDate"
                    autoComplete="bday"
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.currentTarget.value)}
                />
                <Button
                    type="submit"
                    variant="contained"
                    sx={{ mt: 3 }}
                    disabled={isLoading || !navigator.onLine}
                >
                    {isLoading ? "Bezig..." : "Aanmelden"}
                </Button>
            </form>
        </>
    );
};

export default RegisterForm;
