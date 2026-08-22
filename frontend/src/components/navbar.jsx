import { Link, useNavigate } from "react-router-dom";

function Navbar() {
    const navigate = useNavigate();

    const isLoggedIn = localStorage.getItem("access_token");

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");

        navigate("/login");
    };

    return (
        <nav>
            <div>
                <Link to={isLoggedIn ? "/dashboard" : "/login"}>
                    📚 Library Management System
                </Link>
            </div>

            <div>
                {isLoggedIn ? (
                    <>
                        <Link to="/dashboard">Dashboard</Link>
                        <Link to="/books">Books</Link>
                        <Link to="/authors">Authors</Link>
                        <Link to="/members">Members</Link>
                        <Link to="/loans">Loans</Link>

                        <button onClick={handleLogout}>
                            Logout
                        </button>
                    </>
                ) : (
                    <Link to="/login">Login</Link>
                )}
            </div>
        </nav>
    );
}

export default Navbar;