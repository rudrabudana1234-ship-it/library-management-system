import { createContext, useContext, useState } from "react";

export const AuthContext = createContext();

function getUserFromToken() {
    const token = localStorage.getItem("access_token");

    if (!token) {
        return null;
    }

    try {
        const payload = JSON.parse(atob(token.split(".")[1]));

        return {
            username: payload.username,
            role: payload.role,
        };
    } catch (error) {
        return null;
    }
}

function AuthProvider({ children }) {
    const [user, setUser] = useState(getUserFromToken());

    const [isAuthenticated, setIsAuthenticated] = useState(
        !!localStorage.getItem("access_token")
    );

    const login = (access, refresh) => {
        localStorage.setItem("access_token", access);
        localStorage.setItem("refresh_token", refresh);

        const payload = JSON.parse(atob(access.split(".")[1]));

        const userData = {
            username: payload.username,
            role: payload.role,
        };

        setUser(userData);

        console.log("Logged in user:", userData);

        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");

        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

export default AuthProvider;