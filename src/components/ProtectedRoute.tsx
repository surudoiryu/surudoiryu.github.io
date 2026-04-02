import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <p>Laden...</p>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
