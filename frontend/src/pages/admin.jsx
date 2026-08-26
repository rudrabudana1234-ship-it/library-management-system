import { useEffect, useState } from "react";
import api from "../services/api";

function Admin() {

    const [stats, setStats] = useState({});
    const [requests, setRequests] = useState([]);
    const [librarians, setLibrarians] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    // ==========================================
    // FETCH ADMIN DATA
    // ==========================================

    const fetchAdminData = async () => {

        try {

            setLoading(true);
            setError("");

            const [
                dashboardResponse,
                requestsResponse,
                librariansResponse
            ] = await Promise.all([

                api.get(
                    "auth/admin/dashboard/"
                ),

                api.get(
                    "auth/admin/librarian-requests/"
                ),

                api.get(
                    "auth/admin/librarians/"
                )

            ]);

            setStats(
                dashboardResponse.data.stats
            );

            setRequests(
                Array.isArray(
                    requestsResponse.data
                )
                    ? requestsResponse.data
                    : []
            );

            setLibrarians(
                Array.isArray(
                    librariansResponse.data
                )
                    ? librariansResponse.data
                    : []
            );

        } catch (err) {

            console.error(err);

            setError(
                "Unable to load admin dashboard."
            );

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {

        fetchAdminData();

    }, []);


    // ==========================================
    // APPROVE / REJECT REQUEST
    // ==========================================

    const handleRequest = async (
        userId,
        action
    ) => {

        try {

            await api.patch(
                `auth/admin/librarian-requests/${userId}/`,
                {
                    action: action
                }
            );

            fetchAdminData();

        } catch (err) {

            console.error(err);

            alert(
                "Unable to process the request."
            );
        }
    };


    // ==========================================
    // ACTIVATE / DEACTIVATE LIBRARIAN
    // ==========================================

    const handleLibrarianStatus = async (
        userId,
        currentStatus
    ) => {

        try {

            await api.patch(
                `auth/admin/librarians/${userId}/status/`,
                {
                    is_active: !currentStatus
                }
            );

            fetchAdminData();

        } catch (err) {

            console.error(err);

            alert(
                "Unable to update librarian status."
            );
        }
    };


    // ==========================================
    // LOADING
    // ==========================================

    if (loading) {

        return (
            <div className="container py-5">

                <div className="text-center">

                    <div
                        className="spinner-border"
                        role="status"
                    />

                    <p className="mt-3 text-muted">
                        Loading admin dashboard...
                    </p>

                </div>

            </div>
        );
    }


    return (
        <div className="container py-4">

            {/* ==================================
                HEADER
            ================================== */}

            <div className="mb-4">

                <h1 className="fw-bold mb-1">
                    👑 Admin Panel
                </h1>

                <p className="text-muted mb-0">
                    Manage users and library activity.
                </p>

            </div>


            {/* ==================================
                ERROR
            ================================== */}

            {error && (

                <div className="alert alert-danger">
                    {error}
                </div>

            )}


            {/* ==================================
                STATISTICS
            ================================== */}

            <div className="row g-3 mb-4">

                {/* Total Users */}
                <div className="col-md-6 col-lg-3">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body">

                            <p className="text-muted mb-1">
                                Total Users
                            </p>

                            <h2 className="fw-bold mb-0">
                                {stats.total_users || 0}
                            </h2>

                        </div>

                    </div>

                </div>


                {/* Members */}
                <div className="col-md-6 col-lg-3">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body">

                            <p className="text-muted mb-1">
                                Members
                            </p>

                            <h2 className="fw-bold mb-0">
                                {stats.total_members || 0}
                            </h2>

                        </div>

                    </div>

                </div>


                {/* Librarians */}
                <div className="col-md-6 col-lg-3">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body">

                            <p className="text-muted mb-1">
                                Librarians
                            </p>

                            <h2 className="fw-bold mb-0">
                                {stats.total_librarians || 0}
                            </h2>

                        </div>

                    </div>

                </div>


                {/* Pending */}
                <div className="col-md-6 col-lg-3">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body">

                            <p className="text-muted mb-1">
                                Pending Requests
                            </p>

                            <h2 className="fw-bold mb-0 text-warning">
                                {stats.pending_librarian_requests || 0}
                            </h2>

                        </div>

                    </div>

                </div>

            </div>


            {/* ==================================
                LIBRARY OVERVIEW
            ================================== */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body">

                    <h5 className="fw-bold mb-3">
                        📊 Library Overview
                    </h5>

                    <div className="row text-center">

                        <div className="col-6 col-md-3">

                            <h4 className="fw-bold">
                                {stats.total_books || 0}
                            </h4>

                            <small className="text-muted">
                                Books
                            </small>

                        </div>


                        <div className="col-6 col-md-3">

                            <h4 className="fw-bold">
                                {stats.total_authors || 0}
                            </h4>

                            <small className="text-muted">
                                Authors
                            </small>

                        </div>


                        <div className="col-6 col-md-3">

                            <h4 className="fw-bold">
                                {stats.total_loans || 0}
                            </h4>

                            <small className="text-muted">
                                Loans
                            </small>

                        </div>


                        <div className="col-6 col-md-3">

                            <h4 className="fw-bold">
                                {stats.total_librarians || 0}
                            </h4>

                            <small className="text-muted">
                                Librarians
                            </small>

                        </div>

                    </div>

                </div>

            </div>


            {/* ==================================
                LIBRARIAN REQUESTS
            ================================== */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body">

                    <div className="d-flex justify-content-between align-items-center mb-3">

                        <div>

                            <h5 className="fw-bold mb-1">
                                🔔 Librarian Requests
                            </h5>

                            <p className="text-muted small mb-0">
                                Review applications from users
                                who want librarian access.
                            </p>

                        </div>

                        <span className="badge bg-warning text-dark">
                            {requests.length} Pending
                        </span>

                    </div>


                    {requests.length === 0 ? (

                        <div className="text-center py-4">

                            <div className="fs-1">
                                ✅
                            </div>

                            <p className="text-muted mb-0">
                                No pending librarian requests.
                            </p>

                        </div>

                    ) : (

                        <div className="table-responsive">

                            <table className="table align-middle mb-0">

                                <thead>

                                    <tr>

                                        <th>
                                            User
                                        </th>

                                        <th>
                                            Email
                                        </th>

                                        <th>
                                            Phone
                                        </th>

                                        <th className="text-end">
                                            Action
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {requests.map(
                                        (request) => (

                                            <tr
                                                key={
                                                    request.id
                                                }
                                            >

                                                <td>

                                                    <strong>
                                                        {
                                                            request.username
                                                        }
                                                    </strong>

                                                    <br />

                                                    <small className="text-muted">
                                                        {
                                                            request.first_name
                                                        }{" "}
                                                        {
                                                            request.last_name
                                                        }
                                                    </small>

                                                </td>

                                                <td>
                                                    {
                                                        request.email
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        request.phone ||
                                                        "Not provided"
                                                    }
                                                </td>

                                                <td className="text-end">

                                                    <div className="d-flex justify-content-end gap-2">

                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            onClick={() =>
                                                                handleRequest(
                                                                    request.id,
                                                                    "approve"
                                                                )
                                                            }
                                                        >
                                                            ✅ Approve
                                                        </button>

                                                        <button
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() =>
                                                                handleRequest(
                                                                    request.id,
                                                                    "reject"
                                                                )
                                                            }
                                                        >
                                                            ❌ Reject
                                                        </button>

                                                    </div>

                                                </td>

                                            </tr>

                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </div>


            {/* ==================================
                MANAGE LIBRARIANS
            ================================== */}

            <div className="card border-0 shadow-sm">

                <div className="card-body">

                    <div className="d-flex justify-content-between align-items-center mb-3">

                        <div>

                            <h5 className="fw-bold mb-1">
                                👨‍💼 Manage Librarians
                            </h5>

                            <p className="text-muted small mb-0">
                                View and manage approved librarians.
                            </p>

                        </div>

                        <span className="badge bg-primary">
                            {librarians.length} Librarians
                        </span>

                    </div>


                    {librarians.length === 0 ? (

                        <div className="text-center py-4">

                            <div className="fs-1">
                                👨‍💼
                            </div>

                            <p className="text-muted mb-0">
                                No librarians found.
                            </p>

                        </div>

                    ) : (

                        <div className="table-responsive">

                            <table className="table align-middle mb-0">

                                <thead>

                                    <tr>

                                        <th>
                                            Librarian
                                        </th>

                                        <th>
                                            Email
                                        </th>

                                        <th>
                                            Phone
                                        </th>

                                        <th>
                                            Status
                                        </th>

                                        <th className="text-end">
                                            Action
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {librarians.map(
                                        (librarian) => (

                                            <tr
                                                key={
                                                    librarian.id
                                                }
                                            >

                                                <td>

                                                    <strong>
                                                        {
                                                            librarian.username
                                                        }
                                                    </strong>

                                                    <br />

                                                    <small className="text-muted">

                                                        {
                                                            librarian.first_name
                                                        }{" "}

                                                        {
                                                            librarian.last_name
                                                        }

                                                    </small>

                                                </td>


                                                <td>
                                                    {
                                                        librarian.email
                                                    }
                                                </td>


                                                <td>
                                                    {
                                                        librarian.phone ||
                                                        "Not provided"
                                                    }
                                                </td>


                                                <td>

                                                    {librarian.is_active ? (

                                                        <span className="badge bg-success">
                                                            Active
                                                        </span>

                                                    ) : (

                                                        <span className="badge bg-secondary">
                                                            Inactive
                                                        </span>

                                                    )}

                                                </td>


                                                <td className="text-end">

                                                    <button
                                                        className={
                                                            librarian.is_active
                                                                ? "btn btn-outline-danger btn-sm"
                                                                : "btn btn-outline-success btn-sm"
                                                        }
                                                        onClick={() =>
                                                            handleLibrarianStatus(
                                                                librarian.id,
                                                                librarian.is_active
                                                            )
                                                        }
                                                    >

                                                        {librarian.is_active
                                                            ? "Deactivate"
                                                            : "Activate"}

                                                    </button>

                                                </td>

                                            </tr>

                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </div>

        </div>
    );
}

export default Admin;