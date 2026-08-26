import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Signup() {

    const navigate = useNavigate();

    const [role, setRole] = useState("member");

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        password2: "",
        first_name: "",
        last_name: "",
        phone: "",
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);


    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });

    };


    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setSuccess("");
        setLoading(true);

        try {

            const endpoint =
                role === "member"
                    ? "auth/register/"
                    : "auth/librarian-register/";

            const response = await api.post(
                endpoint,
                formData
            );

            setSuccess(
                response.data.message ||
                "Account created successfully."
            );

            setFormData({
                username: "",
                email: "",
                password: "",
                password2: "",
                first_name: "",
                last_name: "",
                phone: "",
            });

            setTimeout(() => {
                navigate("/login");
            }, 2000);

        } catch (err) {

            const data = err.response?.data;

            if (data) {

                if (typeof data === "string") {
                    setError(data);
                } else {

                    const messages = Object.values(data)
                        .flat()
                        .join(" ");

                    setError(
                        messages ||
                        "Signup failed. Please try again."
                    );
                }

            } else {

                setError(
                    "Unable to connect to the server."
                );
            }

        } finally {

            setLoading(false);
        }
    };


    return (
        <div className="container py-5">

            <div className="row justify-content-center">

                <div className="col-md-7 col-lg-6">

                    <div className="card shadow-sm border-0">

                        <div className="card-body p-4">

                            {/* Header */}

                            <div className="text-center mb-4">

                                <h2 className="fw-bold">
                                    📚 Create Account
                                </h2>

                                <p className="text-muted mb-0">
                                    Join our library today
                                </p>

                            </div>


                            {/* Role Selection */}

                            <div className="mb-4">

                                <label className="form-label fw-semibold">
                                    Account Type
                                </label>

                                <div className="row g-2">

                                    <div className="col-6">

                                        <button
                                            type="button"
                                            className={`btn w-100 ${
                                                role === "member"
                                                    ? "btn-primary"
                                                    : "btn-outline-primary"
                                            }`}
                                            onClick={() =>
                                                setRole("member")
                                            }
                                        >
                                            👤 Member
                                        </button>

                                    </div>

                                    <div className="col-6">

                                        <button
                                            type="button"
                                            className={`btn w-100 ${
                                                role === "librarian"
                                                    ? "btn-primary"
                                                    : "btn-outline-primary"
                                            }`}
                                            onClick={() =>
                                                setRole("librarian")
                                            }
                                        >
                                            🧑‍💼 Librarian
                                        </button>

                                    </div>

                                </div>

                            </div>


                            {/* Info */}

                            {role === "librarian" && (

                                <div className="alert alert-info">

                                    <strong>
                                        Librarian Application
                                    </strong>

                                    <br />

                                    Your account will require
                                    admin approval before you
                                    can log in.

                                </div>

                            )}


                            {/* Error */}

                            {error && (

                                <div className="alert alert-danger">
                                    {error}
                                </div>

                            )}


                            {/* Success */}

                            {success && (

                                <div className="alert alert-success">
                                    {success}
                                </div>

                            )}


                            {/* Form */}

                            <form onSubmit={handleSubmit}>

                                {/* First + Last Name */}

                                <div className="row">

                                    <div className="col-md-6 mb-3">

                                        <label className="form-label">
                                            First Name
                                        </label>

                                        <input
                                            type="text"
                                            name="first_name"
                                            className="form-control"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                        />

                                    </div>


                                    <div className="col-md-6 mb-3">

                                        <label className="form-label">
                                            Last Name
                                        </label>

                                        <input
                                            type="text"
                                            name="last_name"
                                            className="form-control"
                                            value={formData.last_name}
                                            onChange={handleChange}
                                        />

                                    </div>

                                </div>


                                {/* Username */}

                                <div className="mb-3">

                                    <label className="form-label">
                                        Username
                                    </label>

                                    <input
                                        type="text"
                                        name="username"
                                        className="form-control"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                    />

                                </div>


                                {/* Email */}

                                <div className="mb-3">

                                    <label className="form-label">
                                        Email
                                    </label>

                                    <input
                                        type="email"
                                        name="email"
                                        className="form-control"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />

                                </div>


                                {/* Phone */}

                                <div className="mb-3">

                                    <label className="form-label">
                                        Phone
                                    </label>

                                    <input
                                        type="text"
                                        name="phone"
                                        className="form-control"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />

                                </div>


                                {/* Password */}

                                <div className="mb-3">

                                    <label className="form-label">
                                        Password
                                    </label>

                                    <input
                                        type="password"
                                        name="password"
                                        className="form-control"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />

                                </div>


                                {/* Confirm Password */}

                                <div className="mb-4">

                                    <label className="form-label">
                                        Confirm Password
                                    </label>

                                    <input
                                        type="password"
                                        name="password2"
                                        className="form-control"
                                        value={formData.password2}
                                        onChange={handleChange}
                                        required
                                    />

                                </div>


                                {/* Submit */}

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100"
                                    disabled={loading}
                                >

                                    {loading
                                        ? "Creating account..."
                                        : role === "member"
                                            ? "Create Member Account"
                                            : "Submit Librarian Application"
                                    }

                                </button>

                            </form>


                            {/* Login */}

                            <div className="text-center mt-4">

                                <span className="text-muted">
                                    Already have an account?
                                </span>{" "}

                                <button
                                    type="button"
                                    className="btn btn-link p-0"
                                    onClick={() =>
                                        navigate("/login")
                                    }
                                >
                                    Login
                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Signup;