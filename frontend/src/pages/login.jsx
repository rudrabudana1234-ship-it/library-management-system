import { useState } from "react";
import api from "../services/api";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();

        console.log("Login button clicked");

        try {
            const response = await api.post("auth/login/", {
                username,
                password,
            });

            console.log("Login response:", response.data);

            localStorage.setItem("access_token", response.data.access);
            localStorage.setItem("refresh_token", response.data.refresh);

            alert("Login successful!");
        } catch (error) {
            console.error(
                "Login error:",
                error.response?.data || error.message
            );

            setError(
                JSON.stringify(
                    error.response?.data?.detail || "Login failed.",
                    null,
                    2
                )   
            );
        }
    };

    return (
        <div>
            <h1>🔐 Login</h1>

            <form onSubmit={handleLogin}>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button type="submit">Login</button>
            </form>

            {error && <p>{error}</p>}
        </div>
    );
}

export default Login;