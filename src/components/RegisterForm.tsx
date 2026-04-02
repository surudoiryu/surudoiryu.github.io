import { Alert, Button, Input, Typography } from "@mui/material";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

type RegisterFormProps = {
    onSuccess: () => void;
};

const RegisterForm = ({ onSuccess }: RegisterFormProps) => {
    const { register } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [headerImageUrl, setHeaderImageUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmitForm = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await register({ name, username, avatarUrl, headerImageUrl, email, password });
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
                    Thumbnail URL (optioneel)
                </Typography>
                <Input
                    fullWidth
                    aria-label="Thumbnail URL"
                    type="url"
                    name="avatarUrl"
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.currentTarget.value)}
                />
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
                    Header afbeelding URL (optioneel)
                </Typography>
                <Input
                    fullWidth
                    aria-label="Header URL"
                    type="url"
                    name="headerImageUrl"
                    value={headerImageUrl}
                    onChange={(event) => setHeaderImageUrl(event.currentTarget.value)}
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
