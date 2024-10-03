import { Link } from "react-router-dom";
import RegisterForm from "./components/RegisterForm";

const Signup = () => {
    return (
        <div className="">
            <div className="mx-auto md:w-1/2">
                <h2 className="text-3xl mb-8">Maak een account</h2>
                <RegisterForm />
                <p>
                    Heb je al een account? <Link to="/login">Log dan in...</Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;