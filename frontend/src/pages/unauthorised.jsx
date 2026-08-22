function Unauthorized() {
    return (
        <div className="container min-vh-100 d-flex align-items-center justify-content-center">
            <div className="text-center">
                <div className="display-1 fw-bold text-danger">
                    403
                </div>

                <h1 className="fw-bold mt-3">
                    Access Denied 🚫
                </h1>

                <p className="lead text-muted mt-3">
                    You don't have permission to access this page.
                </p>

                <button
                    className="btn btn-primary btn-lg mt-3"
                    onClick={() => window.history.back()}
                >
                    ← Go Back
                </button>
            </div>
        </div>
    );
}

export default Unauthorized;