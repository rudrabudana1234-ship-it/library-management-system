import { Link } from "react-router-dom";
import { useAuth } from "../context/authcontext";

function Navbar() {
    const {
        user,
        isAuthenticated,
        logout,
    } = useAuth();

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">

            <div className="container">

                {/* Brand */}
                <Link
                    to="/"
                    className="navbar-brand fw-bold"
                >
                    📚 Library Management
                </Link>


                {/* Mobile Toggle */}
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarContent"
                    aria-controls="navbarContent"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>


                {/* Navbar Content */}
                <div
                    className="collapse navbar-collapse"
                    id="navbarContent"
                >

                    {isAuthenticated ? (
                        <>

                            {/* ========================= */}
                            {/* Navigation Links */}
                            {/* ========================= */}

                            <ul className="navbar-nav me-auto mb-2 mb-lg-0">

                                {/* Dashboard - All authenticated users */}
                                <li className="nav-item">
                                    <Link
                                        to="/dashboard"
                                        className="nav-link"
                                    >
                                        Dashboard
                                    </Link>
                                </li>


                                {/* Books - All authenticated users */}
                                <li className="nav-item">
                                    <Link
                                        to="/books"
                                        className="nav-link"
                                    >
                                        Books
                                    </Link>
                                </li>

                                {/* Member Only */}
                                {user?.role === "member" && (
                                    <li className="nav-item">
                                        <Link
                                            to="/my-loans"
                                            className="nav-link"
                                        >
                                            My Loans
                                        </Link>
                                    </li>
                                )}


                                {/* Librarian + Admin */}
                                {(user?.role === "librarian" ||
                                    user?.role === "admin") && (
                                    <>

                                        <li className="nav-item">
                                            <Link
                                                to="/members"
                                                className="nav-link"
                                            >
                                                Members
                                            </Link>
                                        </li>

                                        <li className="nav-item">
                                            <Link
                                                to="/loans"
                                                className="nav-link"
                                            >
                                                Loans
                                            </Link>
                                        </li>

                                    </>
                                )}


                                {/* Admin Only */}
                                {user?.role === "admin" && (
                                    <li className="nav-item">
                                        <Link
                                            to="/admin"
                                            className="nav-link"
                                        >
                                            👑 Admin
                                        </Link>
                                    </li>
                                )}

                            </ul>


                            {/* ========================= */}
                            {/* User Profile Dropdown */}
                            {/* ========================= */}

                            <div className="dropdown">

                                <button
                                    className="btn btn-dark dropdown-toggle d-flex align-items-center gap-2"
                                    type="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >

                                    <span>
                                        Welcome,{" "}
                                        <strong>
                                            {user?.username}
                                        </strong>
                                    </span>

                                    <span className="badge bg-primary text-uppercase">
                                        {user?.role}
                                    </span>

                                </button>


                                {/* Dropdown Menu */}
                                <ul className="dropdown-menu dropdown-menu-end shadow">

                                    {/* Change Password */}
                                    <li>
                                        <Link
                                            to="/change-password"
                                            className="dropdown-item"
                                        >
                                            🔑 Change Password
                                        </Link>
                                    </li>


                                    {/* Divider */}
                                    <li>
                                        <hr className="dropdown-divider" />
                                    </li>


                                    {/* Logout */}
                                    <li>
                                        <button
                                            onClick={logout}
                                            className="dropdown-item text-danger"
                                        >
                                            🚪 Logout
                                        </button>
                                    </li>

                                </ul>

                            </div>

                        </>
                    ) : (

                        /* ========================= */
                        /* Logged Out Buttons */
                        /* ========================= */

                        <div className="ms-auto d-flex gap-2">

                            {/* Login */}
                            <Link
                                to="/login"
                                className="btn btn-outline-light btn-sm"
                            >
                                Login
                            </Link>


                            {/* Signup */}
                            <Link
                                to="/signup"
                                className="btn btn-primary btn-sm"
                            >
                                Sign Up
                            </Link>

                        </div>

                    )}

                </div>

            </div>

        </nav>
    );
}

export default Navbar;