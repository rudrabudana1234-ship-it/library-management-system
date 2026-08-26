import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

function ChangePassword() {

    const navigate = useNavigate();

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newPassword2, setNewPassword2] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setSuccess("");
        setLoading(true);

        try {

            const response = await api.post(
                "auth/change-password/",
                {
                    current_password: currentPassword,
                    new_password: newPassword,
                    new_password2: newPassword2,
                }
            );

            setSuccess(
                response.data.message
            );

            setCurrentPassword("");
            setNewPassword("");
            setNewPassword2("");

            setTimeout(() => {
                navigate("/dashboard");
            }, 2000);

        } catch (error) {

            console.log(
                "Change password error:",
                error
            );

            const responseData =
                error.response?.data;

            if (
                responseData?.current_password
            ) {

                setError(
                    responseData.current_password[0]
                );

            } else if (
                responseData?.new_password
            ) {

                setError(
                    responseData.new_password[0]
                );

            } else if (
                responseData?.detail
            ) {

                setError(
                    responseData.detail
                );

            } else {

                setError(
                    "Unable to change password. Please try again."
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
                                    Change Password
                                </h2>

                                <p className="text-muted mb-0">
                                    Update your account password
                                </p>

                            </div>


                            {/* Error */}

                            {error && (

                                <div
                                    className="alert alert-danger"
                                    role="alert"
                                >
                                    {error}
                                </div>

                            )}


                            {/* Success */}

                            {success && (

                                <div
                                    className="alert alert-success"
                                    role="alert"
                                >
                                    {success}
                                </div>

                            )}


                            {/* Form */}

                            <form onSubmit={handleSubmit}>

                                {/* Current Password */}

                                <div className="mb-3">

                                    <label
                                        htmlFor="currentPassword"
                                        className="form-label fw-semibold"
                                    >
                                        Current Password
                                    </label>

                                    <input
                                        id="currentPassword"
                                        type="password"
                                        className="form-control"
                                        value={currentPassword}
                                        onChange={(e) =>
                                            setCurrentPassword(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter current password"
                                        required
                                    />

                                </div>


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
                                        minLength={8}
                                        required
                                    />

                                    <div className="form-text">
                                        Password must contain at least 8 characters.
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
                                        minLength={8}
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

                                            Changing Password...
                                        </>

                                    ) : (

                                        "Change Password"

                                    )}

                                </button>

                            </form>


                            {/* Back */}

                            <div className="text-center mt-3">

                                <Link
                                    to="/dashboard"
                                    className="text-decoration-none small"
                                >
                                    ← Back to Dashboard
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

export default ChangePassword;