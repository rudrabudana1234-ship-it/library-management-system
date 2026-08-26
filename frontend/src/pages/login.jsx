import { useState } from "react";
import { useAuth } from "../context/authcontext";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

function Login() {

    const { login } = useAuth();

    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);


    const handleLogin = async (e) => {

        e.preventDefault();

        setError("");
        setLoading(true);

        try {

            const response = await api.post(
                "auth/login/",
                {
                    username,
                    password,
                }
            );


            login(
                response.data.access,
                response.data.refresh
            );


            navigate("/dashboard");


        } catch (error) {

            console.log(
                "Login error:",
                error
            );

            const responseData =
                error.response?.data;


            // DRF validation errors
            if (
                responseData?.non_field_errors &&
                Array.isArray(
                    responseData.non_field_errors
                )
            ) {

                setError(
                    responseData.non_field_errors[0]
                );

            }


            // Detail-based errors
            else if (
                responseData?.detail
            ) {

                setError(
                    responseData.detail
                );

            }


            // Other possible error formats
            else if (
                typeof responseData === "string"
            ) {

                setError(
                    responseData
                );

            }


            // Default error
            else {

                setError(
                    "Invalid username or password."
                );

            }

        } finally {

            setLoading(false);

        }
    };


    return (

        <div className="container min-vh-100 d-flex align-items-center justify-content-center">

            <div className="row w-100 justify-content-center">

                <div className="col-12 col-sm-10 col-md-7 col-lg-5 col-xl-4">

                    <div className="card shadow-lg border-0">

                        <div className="card-body p-4 p-md-5">


                            {/* ================================= */}
                            {/* HEADING */}
                            {/* ================================= */}

                            <div className="text-center mb-4">

                                <div className="fs-1 mb-2">
                                    📚
                                </div>

                                <h2 className="fw-bold mb-1">
                                    Welcome Back
                                </h2>

                                <p className="text-muted mb-0">
                                    Login to your library account
                                </p>

                            </div>


                            {/* ================================= */}
                            {/* ERROR */}
                            {/* ================================= */}

                            {error && (

                                <div
                                    className="alert alert-danger"
                                    role="alert"
                                >
                                    {error}
                                </div>

                            )}


                            {/* ================================= */}
                            {/* LOGIN FORM */}
                            {/* ================================= */}

                            <form onSubmit={handleLogin}>


                                {/* ================================= */}
                                {/* USERNAME */}
                                {/* ================================= */}

                                <div className="mb-3">

                                    <label
                                        htmlFor="username"
                                        className="form-label fw-semibold"
                                    >
                                        Username
                                    </label>

                                    <input
                                        id="username"
                                        type="text"
                                        className="form-control"
                                        value={username}
                                        onChange={(e) =>
                                            setUsername(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter username"
                                        required
                                    />

                                </div>


                                {/* ================================= */}
                                {/* PASSWORD */}
                                {/* ================================= */}

                                <div className="mb-2">

                                    <label
                                        htmlFor="password"
                                        className="form-label fw-semibold"
                                    >
                                        Password
                                    </label>

                                    <input
                                        id="password"
                                        type="password"
                                        className="form-control"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter password"
                                        required
                                    />

                                </div>


                                {/* ================================= */}
                                {/* FORGOT PASSWORD */}
                                {/* ================================= */}

                                <div className="text-end mb-4">

                                    <Link
                                        to="/forgot-password"
                                        className="text-decoration-none small"
                                    >
                                        Forgot Password?
                                    </Link>

                                </div>


                                {/* ================================= */}
                                {/* LOGIN BUTTON */}
                                {/* ================================= */}

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100 py-2"
                                    disabled={loading}
                                >

                                    {loading ? (

                                        <>

                                            <span
                                                className="spinner-border spinner-border-sm me-2"
                                                role="status"
                                                aria-hidden="true"
                                            ></span>

                                            Logging in...

                                        </>

                                    ) : (

                                        "Login"

                                    )}

                                </button>

                            </form>

                        </div>

                    </div>


                    {/* ================================= */}
                    {/* FOOTER */}
                    {/* ================================= */}

                    <p className="text-center text-muted small mt-3">

                        Library Management System

                    </p>

                </div>

            </div>

        </div>
    );
}


export default Login;