function Home() {
    return (
        <div className="container py-5">
            {/* Hero Section */}
            <div className="row align-items-center min-vh-75">
                <div className="col-lg-7">
                    <h1 className="display-4 fw-bold text-primary">
                        📚 Welcome to Library Management System
                    </h1>

                    <p className="lead text-secondary mt-3">
                        Manage books, authors, members, and loans easily
                        with a simple and powerful library management system.
                    </p>

                    <div className="mt-4">
                        <button className="btn btn-primary btn-lg me-2">
                            Explore Library
                        </button>

                        <button className="btn btn-outline-primary btn-lg">
                            Learn More
                        </button>
                    </div>
                </div>

                {/* Illustration / Info Card */}
                <div className="col-lg-5 mt-5 mt-lg-0">
                    <div className="card border-0 shadow-lg">
                        <div className="card-body text-center p-5">
                            <div className="display-1 mb-4">📖</div>

                            <h3 className="fw-bold">
                                Your Digital Library
                            </h3>

                            <p className="text-muted mb-0">
                                Keep track of your entire library from one
                                convenient place.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="row g-4 mt-5">
                <div className="col-md-4">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body text-center p-4">
                            <div className="fs-1">📚</div>
                            <h5 className="fw-bold mt-3">Books</h5>
                            <p className="text-muted">
                                Manage and organize your library books.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body text-center p-4">
                            <div className="fs-1">👥</div>
                            <h5 className="fw-bold mt-3">Members</h5>
                            <p className="text-muted">
                                Keep track of library members easily.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card h-100 border-0 shadow-sm">
                        <div className="card-body text-center p-4">
                            <div className="fs-1">📋</div>
                            <h5 className="fw-bold mt-3">Loans</h5>
                            <p className="text-muted">
                                Manage borrowed and returned books.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;