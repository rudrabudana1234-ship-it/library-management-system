import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function ForgotPassword() {

    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {

        e.preventDefault();

        setMessage("");
        setError("");
        setLoading(true);

        try {

            const response = await api.post(
                "auth/forgot-password/",
                {
                    email,
                }
            );

            setMessage(
                response.data.message
            );

            setEmail("");

        } catch (error) {

            console.log(
                "Forgot password error:",
                error
            );

            const responseData =
                error.response?.data;

            if (
                responseData?.email &&
                Array.isArray(responseData.email)
            ) {

                setError(
                    responseData.email[0]
                );

            } else if (
                responseData?.detail
            ) {

                setError(
                    responseData.detail
                );

            } else if (
                typeof responseData === "string"
            ) {

                setError(responseData);

            } else {

                setError(
                    "Unable to process your request. Please try again."
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

                            {/* Heading */}

                            <div className="text-center mb-4">

                                <div className="fs-1 mb-2">
                                    🔐
                                </div>

                                <h2 className="fw-bold mb-1">
                                    Forgot Password?
                                </h2>

                                <p className="text-muted mb-0">
                                    Enter your email to receive
                                    a password reset link
                                </p>

                            </div>


                            {/* Success Message */}

                            {message && (

                                <div
                                    className="alert alert-success"
                                    role="alert"
                                >
                                    {message}
                                </div>

                            )}


                            {/* Error */}

                            {error && (

                                <div
                                    className="alert alert-danger"
                                    role="alert"
                                >
                                    {error}
                                </div>

                            )}


                            {/* Form */}

                            <form
                                onSubmit={handleSubmit}
                            >

                                <div className="mb-4">

                                    <label
                                        htmlFor="email"
                                        className="form-label fw-semibold"
                                    >
                                        Email Address
                                    </label>

                                    <input
                                        id="email"
                                        type="email"
                                        className="form-control"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter your email"
                                        required
                                    />

                                </div>


                                {/* Submit */}

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

                                            Sending...
                                        </>
                                    ) : (
                                        "Send Reset Link"
                                    )}

                                </button>

                            </form>


                            {/* Back to Login */}

                            <div className="text-center mt-4">

                                <Link
                                    to="/login"
                                    className="text-decoration-none"
                                >
                                    ← Back to Login
                                </Link>

                            </div>

                        </div>

                    </div>


                    {/* Footer */}

                    <p className="text-center text-muted small mt-3">
                        Library Management System
                    </p>

                </div>

            </div>

        </div>
    );
}

export default ForgotPassword;