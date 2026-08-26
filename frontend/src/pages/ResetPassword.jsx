import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function ResetPassword() {

    const { uidb64, token } = useParams();

    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState("");
    const [newPassword2, setNewPassword2] = useState("");

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setMessage("");

        // Frontend password match validation
        if (newPassword !== newPassword2) {

            setError(
                "Passwords do not match."
            );

            return;
        }

        setLoading(true);

        try {

            const response = await api.post(
                `auth/reset-password/${uidb64}/${token}/`,
                {
                    new_password: newPassword,
                    new_password2: newPassword2,
                }
            );

            setMessage(
                response.data.message
            );

            setNewPassword("");
            setNewPassword2("");

            // Redirect to login after a short delay
            setTimeout(() => {

                navigate("/login");

            }, 2000);

        } catch (error) {

            console.log(
                "Reset password error:",
                error
            );

            const responseData =
                error.response?.data;

            if (
                responseData?.new_password &&
                Array.isArray(
                    responseData.new_password
                )
            ) {

                setError(
                    responseData.new_password[0]
                );

            } else if (
                responseData?.non_field_errors &&
                Array.isArray(
                    responseData.non_field_errors
                )
            ) {

                setError(
                    responseData.non_field_errors[0]
                );

            } else if (
                responseData?.error
            ) {

                setError(
                    responseData.error
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
                    "Unable to reset your password. Please try again."
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
                                    🔑
                                </div>

                                <h2 className="fw-bold mb-1">
                                    Reset Password
                                </h2>

                                <p className="text-muted mb-0">
                                    Create a new password
                                    for your account
                                </p>

                            </div>


                            {/* Success Message */}

                            {message && (

                                <div
                                    className="alert alert-success"
                                    role="alert"
                                >
                                    {message}

                                    <div className="small mt-2">
                                        Redirecting to login...
                                    </div>

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


                            {/* Reset Form */}

                            {!message && (

                                <form
                                    onSubmit={handleSubmit}
                                >

                                    {/* New Password */}

                                    <div className="mb-3">

                                        <label
                                            htmlFor="newPassword"
                                            className="form-label fw-semibold"
                                        >
                                            New Password
                                        </label>

                                        <input
                                            id="newPassword"
                                            type="password"
                                            className="form-control"
                                            value={newPassword}
                                            onChange={(e) =>
                                                setNewPassword(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Enter new password"
                                            minLength="8"
                                            required
                                        />

                                        <div className="form-text">
                                            Password must be at least
                                            8 characters.
                                        </div>

                                    </div>


                                    {/* Confirm Password */}

                                    <div className="mb-4">

                                        <label
                                            htmlFor="newPassword2"
                                            className="form-label fw-semibold"
                                        >
                                            Confirm New Password
                                        </label>

                                        <input
                                            id="newPassword2"
                                            type="password"
                                            className="form-control"
                                            value={newPassword2}
                                            onChange={(e) =>
                                                setNewPassword2(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Confirm new password"
                                            minLength="8"
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

                                                Resetting...
                                            </>
                                        ) : (
                                            "Reset Password"
                                        )}

                                    </button>

                                </form>

                            )}


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

export default ResetPassword;