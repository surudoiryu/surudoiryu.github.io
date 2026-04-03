import { Alert, Card, CardContent, Typography } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import RegisterForm from "./components/RegisterForm";

const Signup = () => {
    const navigate = useNavigate();

    return (
        <section style={{ textAlign: "left", margin: 30, paddingBottom: 90 }}>

            <Card sx={{ maxWidth: 560, mx: "auto" }}>
                <CardContent>
                    <Typography variant="h5" sx={{ color: "text.secondary", fontWeight: 700, mb: 1 }}>
                        Maak een account
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                        Registreer om likes, reviews en je profiel op te bouwen.
                    </Typography>

                    {!navigator.onLine && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Registreren is alleen mogelijk wanneer je online bent.
                        </Alert>
                    )}

                    <RegisterForm onSuccess={() => navigate("/profiel")} />

                    <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
                        Heb je al een account? <Link to="/login">Log dan in...</Link>
                    </Typography>
                </CardContent>
            </Card>
        </section>
    );
};

export default Signup;


