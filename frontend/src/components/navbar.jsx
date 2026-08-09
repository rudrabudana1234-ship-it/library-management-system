import { Link } from "react-router-dom";

function Navbar() {
    return (
        <nav>
            <div>
                <Link to="/dashboard">
                    📚 Library Management System
                </Link>
            </div>

            <div>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/books">Books</Link>
                <Link to="/authors">Authors</Link>
                <Link to="/members">Members</Link>
                <Link to="/loans">Loans</Link>
            </div>
        </nav>
    );
}

export default Navbar;