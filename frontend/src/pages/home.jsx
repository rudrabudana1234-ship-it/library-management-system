import { Link } from "react-router-dom";

function Home() {
    return (
        <div>

            {/* =========================
                HERO SECTION
            ========================== */}

            <section className="bg-light py-5">
                <div className="container py-4">

                    <div className="row align-items-center">

                        {/* Hero Text */}
                        <div className="col-lg-7">

                            <span className="badge bg-primary mb-3 px-3 py-2">
                                📚 Library Management System
                            </span>

                            <h1 className="display-4 fw-bold mb-3">
                                Your Library,
                                <br />
                                <span className="text-primary">
                                    Smarter & Simpler
                                </span>
                            </h1>

                            <p className="lead text-muted mb-4">
                                Discover books, explore authors, manage
                                loans, and keep your library experience
                                organized in one place.
                            </p>

                            <div className="d-flex flex-wrap gap-2">

                                <Link
                                    to="/books"
                                    className="btn btn-primary btn-lg px-4"
                                >
                                    📚 Explore Library
                                </Link>

                                <a
                                    href="#features"
                                    className="btn btn-outline-secondary btn-lg px-4"
                                >
                                    Learn More
                                </a>

                            </div>

                        </div>

                        {/* Hero Illustration */}
                        <div className="col-lg-5 text-center mt-4 mt-lg-0">

                            <div
                                className="bg-white rounded-4 shadow-sm p-5"
                            >

                                <div className="display-1 mb-3">
                                    📖
                                </div>

                                <h4 className="fw-bold">
                                    Knowledge Starts Here
                                </h4>

                                <p className="text-muted mb-0">
                                    Browse. Borrow. Learn.
                                </p>

                            </div>

                        </div>

                    </div>

                </div>
            </section>


            {/* =========================
                LIBRARY STATS
            ========================== */}

            <section className="py-5">

                <div className="container">

                    <div className="text-center mb-4">

                        <h2 className="fw-bold">
                            Our Library at a Glance
                        </h2>

                        <p className="text-muted">
                            Everything you need, all in one place.
                        </p>

                    </div>


                    <div className="row g-4">

                        {/* Books */}
                        <div className="col-6 col-lg-3">

                            <div className="card border-0 shadow-sm h-100 text-center">

                                <div className="card-body py-4">

                                    <div className="fs-1 mb-2">
                                        📚
                                    </div>

                                    <h3 className="fw-bold mb-1">
                                        Books
                                    </h3>

                                    <p className="text-muted mb-0">
                                        Explore our collection
                                    </p>

                                </div>

                            </div>

                        </div>


                        {/* Authors */}
                        <div className="col-6 col-lg-3">

                            <div className="card border-0 shadow-sm h-100 text-center">

                                <div className="card-body py-4">

                                    <div className="fs-1 mb-2">
                                        ✍️
                                    </div>

                                    <h3 className="fw-bold mb-1">
                                        Authors
                                    </h3>

                                    <p className="text-muted mb-0">
                                        Discover great writers
                                    </p>

                                </div>

                            </div>

                        </div>


                        {/* Members */}
                        <div className="col-6 col-lg-3">

                            <div className="card border-0 shadow-sm h-100 text-center">

                                <div className="card-body py-4">

                                    <div className="fs-1 mb-2">
                                        👥
                                    </div>

                                    <h3 className="fw-bold mb-1">
                                        Members
                                    </h3>

                                    <p className="text-muted mb-0">
                                        A growing community
                                    </p>

                                </div>

                            </div>

                        </div>


                        {/* Loans */}
                        <div className="col-6 col-lg-3">

                            <div className="card border-0 shadow-sm h-100 text-center">

                                <div className="card-body py-4">

                                    <div className="fs-1 mb-2">
                                        📖
                                    </div>

                                    <h3 className="fw-bold mb-1">
                                        Loans
                                    </h3>

                                    <p className="text-muted mb-0">
                                        Simple book borrowing
                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </section>


            {/* =========================
                FEATURES
            ========================== */}

            <section
                id="features"
                className="bg-light py-5"
            >

                <div className="container">

                    <div className="text-center mb-5">

                        <h2 className="fw-bold">
                            Everything You Need
                        </h2>

                        <p className="text-muted">
                            Designed to make managing and using the
                            library straightforward.
                        </p>

                    </div>


                    <div className="row g-4">

                        {/* Feature 1 */}
                        <div className="col-md-6 col-lg-3">

                            <div className="card border-0 h-100 shadow-sm">

                                <div className="card-body">

                                    <div className="fs-2 mb-3">
                                        🔎
                                    </div>

                                    <h5 className="fw-bold">
                                        Easy Book Discovery
                                    </h5>

                                    <p className="text-muted mb-0">
                                        Quickly browse and find books
                                        available in the library.
                                    </p>

                                </div>

                            </div>

                        </div>


                        {/* Feature 2 */}
                        <div className="col-md-6 col-lg-3">

                            <div className="card border-0 h-100 shadow-sm">

                                <div className="card-body">

                                    <div className="fs-2 mb-3">
                                        📖
                                    </div>

                                    <h5 className="fw-bold">
                                        Simple Borrowing
                                    </h5>

                                    <p className="text-muted mb-0">
                                        Keep track of borrowed books,
                                        due dates, and returns.
                                    </p>

                                </div>

                            </div>

                        </div>


                        {/* Feature 3 */}
                        <div className="col-md-6 col-lg-3">

                            <div className="card border-0 h-100 shadow-sm">

                                <div className="card-body">

                                    <div className="fs-2 mb-3">
                                        👤
                                    </div>

                                    <h5 className="fw-bold">
                                        Member Accounts
                                    </h5>

                                    <p className="text-muted mb-0">
                                        Access your account and view
                                        your personal loan history.
                                    </p>

                                </div>

                            </div>

                        </div>


                        {/* Feature 4 */}
                        <div className="col-md-6 col-lg-3">

                            <div className="card border-0 h-100 shadow-sm">

                                <div className="card-body">

                                    <div className="fs-2 mb-3">
                                        🔐
                                    </div>

                                    <h5 className="fw-bold">
                                        Secure Access
                                    </h5>

                                    <p className="text-muted mb-0">
                                        Role-based access keeps library
                                        management secure and organized.
                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </section>


            {/* =========================
                CALL TO ACTION
            ========================== */}

            <section className="py-5">

                <div className="container">

                    <div className="bg-primary text-white rounded-4 p-4 p-md-5 text-center">

                        <h2 className="fw-bold mb-2">
                            Ready to Explore?
                        </h2>

                        <p className="mb-4 opacity-75">
                            Find your next book and start exploring
                            the library today.
                        </p>

                        <Link
                            to="/books"
                            className="btn btn-light btn-lg px-4"
                        >
                            📚 Browse Books
                        </Link>

                    </div>

                </div>

            </section>


            {/* =========================
                FOOTER NOTE
            ========================== */}

            <div className="text-center text-muted small pb-4">

                📚 Library Management System

            </div>

        </div>
    );
}

export default Home;