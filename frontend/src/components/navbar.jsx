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
                            {/* Navigation Links */}
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

                                {/* Authors - All authenticated users */}
                                <li className="nav-item">
                                    <Link
                                        to="/authors"
                                        className="nav-link"
                                    >
                                        Authors
                                    </Link>
                                </li>

                                {/* Member only */}
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

                                {/* Librarian and Admin */}
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

                                {/* Admin only */}
                                {user?.role === "admin" && (
                                    <li className="nav-item">
                                        <Link
                                            to="/admin"
                                            className="nav-link"
                                        >
                                            Admin
                                        </Link>
                                    </li>
                                )}

                            </ul>

                            {/* User Info + Logout */}
                            <div className="d-flex align-items-center gap-3">

                                <span className="text-light small">
                                    Welcome,{" "}
                                    <strong>
                                        {user?.username}
                                    </strong>{" "}

                                    <span className="badge bg-primary text-uppercase">
                                        {user?.role}
                                    </span>
                                </span>

                                <button
                                    onClick={logout}
                                    className="btn btn-outline-light btn-sm"
                                >
                                    Logout
                                </button>

                            </div>
                        </>
                    ) : (
                        /* Login */
                        <div className="ms-auto">
                            <Link
                                to="/login"
                                className="btn btn-primary btn-sm"
                            >
                                Login
                            </Link>
                        </div>
                    )}

                </div>
            </div>
        </nav>
    );
}

export default Navbar;