import { useEffect, useState } from "react";
import api from "../services/api";

function Dashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("dashboard/");

            console.log("Dashboard API response:", response.data);

            setDashboard(response.data);
        } catch (err) {
            console.error("Dashboard error:", err);

            if (err.response) {
                setError(
                    `Server error: ${err.response.status} ${err.response.statusText}`
                );
            } else if (err.request) {
                setError(
                    "Network error. Unable to connect to the backend."
                );
            } else {
                setError(
                    "Something went wrong while loading dashboard."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    return (
        <div className="container py-4">

            {/* Header */}
            <div className="mb-4">
                <h1 className="fw-bold mb-1">
                    📊 Dashboard
                </h1>

                <p className="text-muted mb-0">
                    Overview of your library management system.
                </p>
            </div>

            {/* Loading */}
            {loading && (
                <div className="text-center py-5">

                    <div
                        className="spinner-border text-primary mb-3"
                        role="status"
                    >
                        <span className="visually-hidden">
                            Loading...
                        </span>
                    </div>

                    <p className="text-muted">
                        Loading dashboard...
                    </p>

                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="alert alert-danger">

                    <strong>
                        ⚠️ Unable to load dashboard
                    </strong>

                    <p className="mb-2 mt-2">
                        {error}
                    </p>

                    <button
                        className="btn btn-danger btn-sm"
                        onClick={fetchDashboard}
                    >
                        🔄 Try Again
                    </button>

                </div>
            )}

            {/* Dashboard */}
            {!loading && !error && dashboard && (

                <>
                    {/* Statistics */}
                    <div className="row g-4 mb-4">

                        {/* Total Books */}
                        <div className="col-md-6 col-lg-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body">

                                    <div className="d-flex justify-content-between align-items-center">

                                        <div>
                                            <p className="text-muted mb-1">
                                                Total Books
                                            </p>

                                            <h2 className="fw-bold mb-0">
                                                {dashboard.total_books ?? 0}
                                            </h2>
                                        </div>

                                        <div className="fs-1">
                                            📚
                                        </div>

                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Available Books */}
                        <div className="col-md-6 col-lg-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body">

                                    <div className="d-flex justify-content-between align-items-center">

                                        <div>
                                            <p className="text-muted mb-1">
                                                Available Books
                                            </p>

                                            <h2 className="fw-bold mb-0">
                                                {dashboard.available_books ?? 0}
                                            </h2>
                                        </div>

                                        <div className="fs-1">
                                            ✅
                                        </div>

                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Members */}
                        <div className="col-md-6 col-lg-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body">

                                    <div className="d-flex justify-content-between align-items-center">

                                        <div>
                                            <p className="text-muted mb-1">
                                                Total Members
                                            </p>

                                            <h2 className="fw-bold mb-0">
                                                {dashboard.total_members ?? 0}
                                            </h2>
                                        </div>

                                        <div className="fs-1">
                                            👥
                                        </div>

                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Active Loans */}
                        <div className="col-md-6 col-lg-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body">

                                    <div className="d-flex justify-content-between align-items-center">

                                        <div>
                                            <p className="text-muted mb-1">
                                                Active Loans
                                            </p>

                                            <h2 className="fw-bold mb-0">
                                                {dashboard.active_loans ?? 0}
                                            </h2>
                                        </div>

                                        <div className="fs-1">
                                            📖
                                        </div>

                                    </div>

                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Overdue */}
                    <div className="card border-0 shadow-sm">

                        <div className="card-header bg-white py-3">
                            <h5 className="fw-bold mb-0">
                                ⚠️ Overdue Loans
                            </h5>
                        </div>

                        <div className="card-body">

                            <div className="d-flex align-items-center">

                                <div className="display-6 fw-bold text-danger me-3">
                                    {dashboard.overdue_loans ?? 0}
                                </div>

                                <div>
                                    <p className="mb-0">
                                        Currently overdue loans
                                    </p>

                                    <small className="text-muted">
                                        Books that have passed their due date.
                                    </small>
                                </div>

                            </div>

                        </div>

                    </div>
                </>
            )}

        </div>
    );
}

export default Dashboard;