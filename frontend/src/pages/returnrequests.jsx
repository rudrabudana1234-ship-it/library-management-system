import { useEffect, useState } from "react";
import api from "../services/api";

function ReturnRequests() {
    const [returnRequests, setReturnRequests] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [processingId, setProcessingId] = useState(null);

    const [condition, setCondition] = useState({});
    const [damageFee, setDamageFee] = useState({});
    const [lostFee, setLostFee] = useState({});
    const [damageDescription, setDamageDescription] =
        useState({});

    // =========================
    // FETCH RETURN REQUESTS
    // =========================

    const fetchReturnRequests = async (
        showInitialLoader = true
    ) => {
        try {
            if (showInitialLoader) {
                setLoading(true);
            } else {
                setRefreshing(true);
            }

            setError("");

            const response =
                await api.get(
                    "return-requests/"
                );

            const data = response.data;

            if (Array.isArray(data)) {
                setReturnRequests(data);
            } else if (
                data &&
                Array.isArray(data.results)
            ) {
                setReturnRequests(
                    data.results
                );
            } else {
                setReturnRequests([]);
            }

        } catch (err) {
            console.error(
                "Error fetching return requests:",
                err
            );

            if (err.response) {
                const backendError =
                    err.response.data;

                if (
                    backendError?.error
                ) {
                    setError(
                        backendError.error
                    );
                } else if (
                    backendError?.detail
                ) {
                    setError(
                        backendError.detail
                    );
                } else {
                    setError(
                        `Server error: ${err.response.status}`
                    );
                }
            } else if (err.request) {
                setError(
                    "Network error. Unable to connect to the backend."
                );
            } else {
                setError(
                    "Unable to load return requests."
                );
            }

        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // =========================
    // INITIAL LOAD
    // =========================

    useEffect(() => {
        fetchReturnRequests();
    }, []);

    // =========================
    // CONDITION
    // =========================

    const getCondition = (requestId) => {
        return (
            condition[requestId] ||
            "normal"
        );
    };

    // =========================
    // UPDATE CONDITION
    // =========================

    const updateCondition = (
        requestId,
        value
    ) => {
        setCondition((current) => ({
            ...current,
            [requestId]: value,
        }));
    };

    // =========================
    // PROCESS RETURN
    // =========================

    const processReturn = async (
        returnRequest
    ) => {
        const requestId =
            returnRequest.id;

        const selectedCondition =
            getCondition(requestId);

        const selectedDamageFee =
            damageFee[requestId] || "0";

        const selectedLostFee =
            lostFee[requestId] || "0";

        const selectedDescription =
            damageDescription[requestId] || "";

        if (
            selectedCondition ===
            "damaged"
        ) {
            if (
                selectedDamageFee === "" ||
                Number(selectedDamageFee) < 0
            ) {
                setError(
                    "Please enter a valid damage fee."
                );
                return;
            }
        }

        if (
            selectedCondition ===
            "lost"
        ) {
            if (
                selectedLostFee === "" ||
                Number(selectedLostFee) < 0
            ) {
                setError(
                    "Please enter a valid lost fee."
                );
                return;
            }
        }

        try {
            setProcessingId(requestId);
            setError("");
            setSuccessMessage("");

            const response =
                await api.patch(
                    `return-requests/${requestId}/`,
                    {
                        condition:
                            selectedCondition,

                        damage_fee:
                            selectedCondition ===
                            "damaged"
                                ? Number(
                                      selectedDamageFee
                                  )
                                : 0,

                        lost_fee:
                            selectedCondition ===
                            "lost"
                                ? Number(
                                      selectedLostFee
                                  )
                                : 0,

                        damage_description:
                            selectedDescription,
                    }
                );

            const data =
                response.data;

            const totalFee =
                Number(
                    data?.total_fee || 0
                );

            setSuccessMessage(
                `Return processed successfully. ${formatCurrency(
                    totalFee
                )} total fee recorded.`
            );

            // Remove/update the processed request
            setReturnRequests(
                (current) =>
                    current.map(
                        (item) => {
                            if (
                                item.id ===
                                requestId
                            ) {
                                return {
                                    ...item,
                                    status:
                                        "approved",
                                    condition:
                                        selectedCondition,
                                    damage_description:
                                        selectedDescription,
                                    loan_status:
                                        data?.loan
                                            ?.status ||
                                        item.loan_status,
                                    processed_at:
                                        new Date().toISOString(),
                                };
                            }

                            return item;
                        }
                    )
            );

        } catch (err) {
            console.error(
                "Error processing return:",
                err
            );

            if (err.response) {
                const backendError =
                    err.response.data;

                if (
                    backendError?.error
                ) {
                    setError(
                        backendError.error
                    );
                } else if (
                    backendError?.detail
                ) {
                    setError(
                        backendError.detail
                    );
                } else {
                    setError(
                        "Unable to process the return request."
                    );
                }
            } else if (err.request) {
                setError(
                    "Network error. Unable to connect to the backend."
                );
            } else {
                setError(
                    "Unable to process the return request."
                );
            }

        } finally {
            setProcessingId(null);
        }
    };

    // =========================
    // FORMAT DATE
    // =========================

    const formatDate = (dateValue) => {
        if (!dateValue) {
            return "N/A";
        }

        const date =
            new Date(dateValue);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return dateValue;
        }

        return date.toLocaleDateString(
            undefined,
            {
                year: "numeric",
                month: "short",
                day: "numeric",
            }
        );
    };

    // =========================
    // FORMAT CURRENCY
    // =========================

    const formatCurrency = (amount) => {
        return `₹${Number(
            amount || 0
        ).toFixed(2)}`;
    };

    // =========================
    // PENDING COUNT
    // =========================

    const pendingCount =
        returnRequests.filter(
            (request) =>
                String(
                    request.status || ""
                ).toLowerCase() ===
                "pending"
        ).length;

    // =========================
    // LOADING
    // =========================

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
                        Loading return requests...
                    </h5>

                    <small className="text-muted">
                        Please wait while we fetch
                        the requests.
                    </small>

                </div>
            </div>
        );
    }

    return (
        <div className="container py-4">

            {/* =========================
                HEADER
            ========================== */}

            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">

                <div>

                    <div className="d-flex align-items-center gap-2 mb-2">

                        <span className="fs-2">
                            ↩️
                        </span>

                        <h1 className="fw-bold mb-0">
                            Return Requests
                        </h1>

                    </div>

                    <p className="text-muted mb-0">
                        Review member return requests
                        and process returned books.
                    </p>

                </div>

                <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() =>
                        fetchReturnRequests(
                            false
                        )
                    }
                    disabled={refreshing}
                >
                    {refreshing ? (
                        <>
                            <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                            />
                            Refreshing...
                        </>
                    ) : (
                        <>
                            🔄 Refresh
                        </>
                    )}
                </button>

            </div>

            {/* =========================
                SUCCESS
            ========================== */}

            {successMessage && (
                <div
                    className="alert alert-success border-0 shadow-sm alert-dismissible fade show"
                    role="alert"
                >
                    <strong>
                        ✓ Return processed
                    </strong>

                    <div className="small mt-1">
                        {successMessage}
                    </div>

                    <button
                        type="button"
                        className="btn-close"
                        onClick={() =>
                            setSuccessMessage("")
                        }
                        aria-label="Close"
                    />
                </div>
            )}

            {/* =========================
                ERROR
            ========================== */}

            {error && (
                <div
                    className="alert alert-danger border-0 shadow-sm alert-dismissible fade show"
                    role="alert"
                >
                    <strong>
                        ⚠️ Error
                    </strong>

                    <div className="small mt-1">
                        {error}
                    </div>

                    <button
                        type="button"
                        className="btn-close"
                        onClick={() =>
                            setError("")
                        }
                        aria-label="Close"
                    />
                </div>
            )}

            {/* =========================
                SUMMARY
            ========================== */}

            <div className="row g-3 mb-4">

                <div className="col-12 col-md-4">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body">

                            <div className="d-flex justify-content-between align-items-center">

                                <div>
                                    <small className="text-muted d-block">
                                        Total Requests
                                    </small>

                                    <h3 className="fw-bold mb-0">
                                        {
                                            returnRequests.length
                                        }
                                    </h3>
                                </div>

                                <span className="fs-2">
                                    ↩️
                                </span>

                            </div>

                        </div>

                    </div>

                </div>

                <div className="col-12 col-md-4">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body">

                            <div className="d-flex justify-content-between align-items-center">

                                <div>
                                    <small className="text-muted d-block">
                                        Pending
                                    </small>

                                    <h3 className="fw-bold text-warning mb-0">
                                        {pendingCount}
                                    </h3>
                                </div>

                                <span className="fs-2">
                                    ⏳
                                </span>

                            </div>

                        </div>

                    </div>

                </div>

                <div className="col-12 col-md-4">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body">

                            <div className="d-flex justify-content-between align-items-center">

                                <div>
                                    <small className="text-muted d-block">
                                        Processed
                                    </small>

                                    <h3 className="fw-bold text-success mb-0">
                                        {
                                            returnRequests.length -
                                            pendingCount
                                        }
                                    </h3>
                                </div>

                                <span className="fs-2">
                                    ✓
                                </span>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

            {/* =========================
                NO REQUESTS
            ========================== */}

            {returnRequests.length === 0 ? (

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div className="display-4 mb-3">
                            📭
                        </div>

                        <h4 className="fw-bold">
                            No return requests
                        </h4>

                        <p className="text-muted mb-0">
                            There are currently no
                            return requests to review.
                        </p>

                    </div>

                </div>

            ) : (

                <div className="row g-4">

                    {returnRequests.map(
                        (request) => {

                            const requestStatus =
                                String(
                                    request.status ||
                                        ""
                                ).toLowerCase();

                            const isPending =
                                requestStatus ===
                                "pending";

                            const selectedCondition =
                                getCondition(
                                    request.id
                                );

                            const isProcessing =
                                processingId ===
                                request.id;

                            return (
                                <div
                                    className="col-12"
                                    key={
                                        request.id
                                    }
                                >

                                    <div className="card border-0 shadow-sm">

                                        {/* =========================
                                            CARD HEADER
                                        ========================== */}

                                        <div className="card-header bg-white py-3">

                                            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-2">

                                                <div>

                                                    <h5 className="fw-bold mb-1">
                                                        {request.book_title ||
                                                            "Unknown Book"}
                                                    </h5>

                                                    <small className="text-muted">
                                                        Return Request #
                                                        {
                                                            request.id
                                                        }
                                                    </small>

                                                </div>

                                                {isPending ? (

                                                    <span className="badge bg-warning text-dark rounded-pill px-3 py-2">
                                                        ⏳ Pending
                                                    </span>

                                                ) : (

                                                    <span className="badge bg-success rounded-pill px-3 py-2">
                                                        ✓ Processed
                                                    </span>

                                                )}

                                            </div>

                                        </div>

                                        <div className="card-body">

                                            {/* =========================
                                                DETAILS
                                            ========================== */}

                                            <div className="row g-4">

                                                <div className="col-12 col-lg-6">

                                                    <div className="bg-body-tertiary rounded-3 p-3">

                                                        <h6 className="fw-bold mb-3">
                                                            📚 Loan Details
                                                        </h6>

                                                        <div className="row g-2 small">

                                                            <div className="col-5 text-muted">
                                                                Book
                                                            </div>

                                                            <div className="col-7 fw-semibold">
                                                                {
                                                                    request.book_title ||
                                                                    "N/A"
                                                                }
                                                            </div>

                                                            <div className="col-5 text-muted">
                                                                ISBN
                                                            </div>

                                                            <div className="col-7">
                                                                {
                                                                    request.book_isbn ||
                                                                    "N/A"
                                                                }
                                                            </div>

                                                            <div className="col-5 text-muted">
                                                                Member
                                                            </div>

                                                            <div className="col-7 fw-semibold">
                                                                {
                                                                    request.member_name ||
                                                                    "N/A"
                                                                }
                                                            </div>

                                                            <div className="col-5 text-muted">
                                                                Email
                                                            </div>

                                                            <div className="col-7 text-break">
                                                                {
                                                                    request.member_email ||
                                                                    "N/A"
                                                                }
                                                            </div>

                                                            <div className="col-5 text-muted">
                                                                Borrowed
                                                            </div>

                                                            <div className="col-7">
                                                                {
                                                                    formatDate(
                                                                        request.borrow_date
                                                                    )
                                                                }
                                                            </div>

                                                            <div className="col-5 text-muted">
                                                                Due Date
                                                            </div>

                                                            <div className="col-7">
                                                                {
                                                                    formatDate(
                                                                        request.due_date
                                                                    )
                                                                }
                                                            </div>

                                                            <div className="col-5 text-muted">
                                                                Loan Status
                                                            </div>

                                                            <div className="col-7">
                                                                {
                                                                    request.loan_status ||
                                                                    "N/A"
                                                                }
                                                            </div>

                                                        </div>

                                                    </div>

                                                </div>

                                                {/* =========================
                                                    PROCESS RETURN
                                                ========================== */}

                                                <div className="col-12 col-lg-6">

                                                    <div className="border rounded-3 p-3">

                                                        <h6 className="fw-bold mb-3">
                                                            🔎 Process Return
                                                        </h6>

                                                        {isPending ? (

                                                            <>

                                                                {/* CONDITION */}

                                                                <div className="mb-3">

                                                                    <label className="form-label fw-semibold">
                                                                        Book Condition
                                                                    </label>

                                                                    <select
                                                                        className="form-select"
                                                                        value={
                                                                            selectedCondition
                                                                        }
                                                                        onChange={(
                                                                            event
                                                                        ) =>
                                                                            updateCondition(
                                                                                request.id,
                                                                                event.target.value
                                                                            )
                                                                        }
                                                                    >

                                                                        <option value="normal">
                                                                            ✓ Normal
                                                                        </option>

                                                                        <option value="damaged">
                                                                            ⚠ Damaged
                                                                        </option>

                                                                        <option value="lost">
                                                                            ✕ Lost
                                                                        </option>

                                                                    </select>

                                                                </div>

                                                                {/* DAMAGE FEE */}

                                                                {selectedCondition ===
                                                                    "damaged" && (
                                                                    <>

                                                                        <div className="mb-3">

                                                                            <label className="form-label fw-semibold">
                                                                                Damage Fee
                                                                            </label>

                                                                            <div className="input-group">

                                                                                <span className="input-group-text">
                                                                                    ₹
                                                                                </span>

                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    step="0.01"
                                                                                    className="form-control"
                                                                                    placeholder="Enter damage fee"
                                                                                    value={
                                                                                        damageFee[
                                                                                            request.id
                                                                                        ] ||
                                                                                        ""
                                                                                    }
                                                                                    onChange={(
                                                                                        event
                                                                                    ) =>
                                                                                        setDamageFee(
                                                                                            (
                                                                                                current
                                                                                            ) => ({
                                                                                                ...current,
                                                                                                [request.id]:
                                                                                                    event.target.value,
                                                                                            })
                                                                                        )
                                                                                    }
                                                                                />

                                                                            </div>

                                                                        </div>

                                                                        <div className="mb-3">

                                                                            <label className="form-label fw-semibold">
                                                                                Damage Description
                                                                            </label>

                                                                            <textarea
                                                                                className="form-control"
                                                                                rows="3"
                                                                                placeholder="Describe the damage..."
                                                                                value={
                                                                                    damageDescription[
                                                                                        request.id
                                                                                    ] ||
                                                                                    ""
                                                                                }
                                                                                onChange={(
                                                                                    event
                                                                                ) =>
                                                                                    setDamageDescription(
                                                                                        (
                                                                                            current
                                                                                        ) => ({
                                                                                            ...current,
                                                                                            [request.id]:
                                                                                                event.target.value,
                                                                                        })
                                                                                    )
                                                                                }
                                                                            />

                                                                        </div>

                                                                    </>
                                                                )}

                                                                {/* LOST FEE */}

                                                                {selectedCondition ===
                                                                    "lost" && (
                                                                    <div className="mb-3">

                                                                        <label className="form-label fw-semibold">
                                                                            Lost Book Fee
                                                                        </label>

                                                                        <div className="input-group">

                                                                            <span className="input-group-text">
                                                                                ₹
                                                                            </span>

                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                step="0.01"
                                                                                className="form-control"
                                                                                placeholder="Enter lost book fee"
                                                                                value={
                                                                                    lostFee[
                                                                                        request.id
                                                                                    ] ||
                                                                                    ""
                                                                                }
                                                                                onChange={(
                                                                                    event
                                                                                ) =>
                                                                                    setLostFee(
                                                                                        (
                                                                                            current
                                                                                        ) => ({
                                                                                            ...current,
                                                                                            [request.id]:
                                                                                                event.target.value,
                                                                                        })
                                                                                    )
                                                                                }
                                                                            />

                                                                        </div>

                                                                    </div>
                                                                )}

                                                                {/* NORMAL INFO */}

                                                                {selectedCondition ===
                                                                    "normal" && (
                                                                    <div className="alert alert-success small">

                                                                        <strong>
                                                                            ✓ Normal return
                                                                        </strong>

                                                                        <div className="mt-1">
                                                                            The book will be added
                                                                            back to available copies.
                                                                        </div>

                                                                    </div>
                                                                )}

                                                                {/* DAMAGE INFO */}

                                                                {selectedCondition ===
                                                                    "damaged" && (
                                                                    <div className="alert alert-warning small">

                                                                        <strong>
                                                                            ⚠ Damaged return
                                                                        </strong>

                                                                        <div className="mt-1">
                                                                            The damaged copy will
                                                                            not be added back to
                                                                            available copies.
                                                                        </div>

                                                                    </div>
                                                                )}

                                                                {/* LOST INFO */}

                                                                {selectedCondition ===
                                                                    "lost" && (
                                                                    <div className="alert alert-danger small">

                                                                        <strong>
                                                                            ✕ Lost book
                                                                        </strong>

                                                                        <div className="mt-1">
                                                                            The lost copy will not
                                                                            be added back to
                                                                            available copies.
                                                                        </div>

                                                                    </div>
                                                                )}

                                                                {/* PROCESS BUTTON */}

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-success w-100"
                                                                    onClick={() =>
                                                                        processReturn(
                                                                            request
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        isProcessing
                                                                    }
                                                                >

                                                                    {isProcessing ? (
                                                                        <>
                                                                            <span
                                                                                className="spinner-border spinner-border-sm me-2"
                                                                                role="status"
                                                                            />

                                                                            Processing...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            ✓ Process Return
                                                                        </>
                                                                    )}

                                                                </button>

                                                            </>

                                                        ) : (

                                                            <div className="alert alert-success mb-0">

                                                                <div className="fw-semibold">
                                                                    ✓ Return already processed
                                                                </div>

                                                                <div className="small mt-1">
                                                                    Condition:{" "}
                                                                    <strong>
                                                                        {
                                                                            request.condition ||
                                                                            "N/A"
                                                                        }
                                                                    </strong>
                                                                </div>

                                                                {request.processed_at && (
                                                                    <div className="small mt-1">
                                                                        Processed on:{" "}
                                                                        {
                                                                            formatDate(
                                                                                request.processed_at
                                                                            )
                                                                        }
                                                                    </div>
                                                                )}

                                                            </div>

                                                        )}

                                                    </div>

                                                </div>

                                            </div>

                                        </div>

                                    </div>

                                </div>
                            );
                        }
                    )}

                </div>

            )}

        </div>
    );
}

export default ReturnRequests;