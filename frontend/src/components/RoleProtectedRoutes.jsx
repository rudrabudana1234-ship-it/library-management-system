import { Navigate } from "react-router-dom";
import { useAuth } from "../context/authcontext";

function RoleProtectedRoute({ children, allowedRoles }) {
    const { user, isAuthenticated } = useAuth();

    // Not logged in
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Logged in but role is not allowed
    if (!allowedRoles.includes(user?.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}

export default RoleProtectedRoute;