import { Link } from "react-router-dom";

const Login = () => {
    return (
        <div>
            {/* Login form */}
            <div className="hero min-h-screen bg-base-200">
                <div className="hero-content flex-col lg:flex-row-reverse">
                    <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
                        <div className="card-body">
                           
                            {/* Link to Sign-Up */}
                            <p>
                                Nieuw op WeedInfo? <Link to="/aanmelden">Registreer</Link> een account!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;