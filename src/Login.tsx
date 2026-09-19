import {
    Alert,
    Button,
    Card,
    CardContent,
    Typography,
    TextField,
} from "@mui/material";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebaseConfig";

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await login(email, password);
            navigate("/profiel");
        } catch (loginError) {
            setError("Inloggen is niet gelukt. Controleer je gegevens of stel je wachtwoord opnieuw in.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section style={{ textAlign: "left", padding: "48px 16px 100px", minHeight: "70vh", background: "linear-gradient(145deg,#edf6ef,#fff)" }}>

            <Card sx={{ maxWidth: 520, mx: "auto", borderRadius: 4, boxShadow: "0 18px 50px rgba(20,70,35,.12)" }}>
                <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                    <Typography component="h1" variant="h5" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                        Inloggen
                    </Typography>
                    <Typography component="h2" variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                        Log in om likes, reviews en je profiel te beheren.
                    </Typography>

                    {!navigator.onLine && (
                        <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                            Inloggen is alleen mogelijk wanneer je online bent.
                        </Alert>
                    )}
                    {error && (
                        <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <form onSubmit={handleLogin}>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            E-mailadres
                        </Typography>
                        <TextField
                            fullWidth
                            required
                            label="E-mailadres"
                            autoComplete="email"
                            type="email"
                            name="email"
                            value={email}
                            onChange={(event) => setEmail(event.currentTarget.value)}
                        />
                        <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
                            Wachtwoord
                        </Typography>
                        <TextField
                            fullWidth
                            required
                            label="Wachtwoord"
                            autoComplete="current-password"
                            type="password"
                            name="password"
                            value={password}
                            onChange={(event) => setPassword(event.currentTarget.value)}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            sx={{ mt: 3 }}
                            disabled={loading || !navigator.onLine}
                        >
                            {loading ? "Bezig..." : "Inloggen"}
                        </Button>
                        <Button type="button" color="inherit" sx={{ mt: 2, ml: 1 }} onClick={async () => {
                            if (!email) { setError("Vul eerst je e-mailadres in."); return; }
                            try { await sendPasswordResetEmail(auth, email); setError("Als dit adres bij ons bekend is, ontvang je een e-mail om je wachtwoord te herstellen."); }
                            catch { setError("Als dit adres bij ons bekend is, ontvang je een e-mail om je wachtwoord te herstellen."); }
                        }}>Wachtwoord vergeten</Button>
                    </form>

                    <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
                        Nieuw op WeedInfo? <Link to="/aanmelden">Registreer</Link> een account.
                    </Typography>
                </CardContent>
            </Card>
        </section>
    );
};

export default Login;


