import {
    Alert,
    Button,
    Card,
    CardContent,
    Input,
    Typography,
} from "@mui/material";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "./logo.svg";
import { useAuth } from "./context/AuthContext";

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
            navigate("/profiel", { replace: true });
        } catch (loginError) {
            const message =
                loginError instanceof Error ? loginError.message : "Inloggen is mislukt.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section style={{ textAlign: "left", margin: 30, paddingBottom: 90 }}>
            <header className="App-header" style={{ minHeight: 180 }}>
                <img src={logo} className="App-logo" alt="logo" />
            </header>

            <Card sx={{ maxWidth: 560, mx: "auto" }}>
                <CardContent>
                    <Typography variant="h5" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                        Inloggen
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
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
                        <Button
                            type="submit"
                            variant="contained"
                            sx={{ mt: 3 }}
                            disabled={loading || !navigator.onLine}
                        >
                            {loading ? "Bezig..." : "Inloggen"}
                        </Button>
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
