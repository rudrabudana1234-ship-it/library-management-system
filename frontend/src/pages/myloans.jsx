import { useEffect, useState } from "react";
import api from "../services/api";

function MyLoans() {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchMyLoans = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("loans/");

            console.log("My Loans API response:", response.data);

            const data = response.data;

            if (Array.isArray(data)) {
                setLoans(data);
            } else if (Array.isArray(data.results)) {
                setLoans(data.results);
            } else {
                setLoans([]);
            }

        } catch (err) {
            console.error("Error fetching my loans:", err);

            if (err.response) {
                setError(
                    `Server error: ${err.response.status} ${err.response.statusText}`
                );
            } else if (err.request) {
                setError(
                    "Network error. Unable to connect to the backend."
                );
            } else {
                setError("Unable to load your loans.");
            }

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyLoans();
    }, []);

    /* Loading */
    if (loading) {
        return (
            <div className="container py-5">
                <div className="text-center">

                    <div
                        className="spinner-border text-primary mb-3"
                        role="status"
                    >
                        <span className="visually-hidden">
                            Loading...
                        </span>
                    </div>

                    <h5 className="text-muted">
                        Loading your loans...
                    </h5>

                </div>
            </div>
        );
    }

    /* Error */
    if (error) {
        return (
            <div className="container py-4">

                <div
                    className="alert alert-danger"
                    role="alert"
                >
                    <strong>⚠️ Error:</strong> {error}

                    <div className="mt-3">
                        <button
                            className="btn btn-danger btn-sm"
                            onClick={fetchMyLoans}
                        >
                            🔄 Try Again
                        </button>
                    </div>
                </div>

            </div>
        );
    }

    return (
        <div className="container py-4">

            {/* Page Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">

                <div>
                    <h1 className="fw-bold mb-1">
                        📖 My Loans
                    </h1>

                    <p className="text-muted mb-0">
                        View the books you have borrowed.
                    </p>
                </div>

                <span className="badge bg-primary fs-6">
                    {loans.length}{" "}
                    {loans.length === 1 ? "Loan" : "Loans"}
                </span>

            </div>

            {/* No Loans */}
            {loans.length === 0 ? (

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div className="fs-1 mb-3">
                            📚
                        </div>

                        <h5 className="fw-bold">
                            No loans yet
                        </h5>

                        <p className="text-muted mb-0">
                            You currently have no borrowed books.
                        </p>

                    </div>

                </div>

            ) : (

                /* Loans Table */
                <div className="card border-0 shadow-sm">

                    <div className="card-header bg-white py-3">

                        <h5 className="fw-bold mb-0">
                            Your Loan History
                        </h5>

                    </div>

                    <div className="card-body p-0">

                        <div className="table-responsive">

                            <table className="table table-hover align-middle mb-0">

                                <thead className="table-dark">

                                    <tr>
                                        <th>#</th>
                                        <th>Book</th>
                                        <th>Status</th>
                                        <th>Borrowed</th>
                                        <th>Due Date</th>
                                        <th>Returned</th>
                                    </tr>

                                </thead>

                                <tbody>

                                    {loans.map((loan, index) => (

                                        <tr key={loan.id}>

                                            <td className="text-muted">
                                                {index + 1}
                                            </td>

                                            <td className="fw-semibold">
                                                {loan.book_title || "Unknown Book"}
                                            </td>

                                            <td>

                                                {loan.status === "returned" ? (

                                                    <span className="badge bg-success">
                                                        Returned
                                                    </span>

                                                ) : loan.status === "overdue" ? (

                                                    <span className="badge bg-danger">
                                                        Overdue
                                                    </span>

                                                ) : (

                                                    <span className="badge bg-warning text-dark">
                                                        Borrowed
                                                    </span>

                                                )}

                                            </td>

                                            <td>
                                                {loan.borrow_date || "N/A"}
                                            </td>

                                            <td>
                                                {loan.due_date || "N/A"}
                                            </td>

                                            <td>

                                                {loan.return_date ? (

                                                    loan.return_date

                                                ) : (

                                                    <span className="text-muted">
                                                        Not returned
                                                    </span>

                                                )}

                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}

export default MyLoans;