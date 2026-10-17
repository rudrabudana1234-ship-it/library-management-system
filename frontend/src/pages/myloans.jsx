import LoadingStages from "../components/loadingstage";
import ButtonLoading from "../components/buttonloading";
import EmptyState from "../components/emptystate";
import ErrorState from "../components/errorstate";
import {
    useEffect,
    useMemo,
    useState,
} from "react";
import api, { API_ORIGIN } from "../services/api";

function MyLoans() {
    const [loans, setLoans] = useState([]);

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [error, setError] =
        useState("");

    const [returnLoadingId, setReturnLoadingId] =
        useState(null);

    // =====================================================
    // FEES
    // =====================================================

    const [fees, setFees] =
        useState([]);

    const [feesLoading, setFeesLoading] =
        useState(false);

    const [feesError, setFeesError] =
        useState("");

    // =====================================================
    // PAYMENTS
    // =====================================================

    const [payments, setPayments] =
        useState([]);

    const [paymentsLoading, setPaymentsLoading] =
        useState(false);

    const [paymentLoadingId, setPaymentLoadingId] =
        useState(null);

    const [paymentError, setPaymentError] =
        useState("");

    const [paymentSuccess, setPaymentSuccess] =
        useState("");

    const [paymentMethod, setPaymentMethod] =
        useState("upi");

    const [selectedFee, setSelectedFee] =
        useState(null);

    const [showPaymentModal, setShowPaymentModal] =
        useState(false);

    // =====================================================
    // EXTRACT API RESULTS
    // =====================================================

    const extractResults = (data) => {
        if (Array.isArray(data)) {
            return data;
        }

        if (
            data &&
            Array.isArray(data.results)
        ) {
            return data.results;
        }

        return [];
    };

    // =====================================================
    // GET BOOK TITLE
    // =====================================================

    const getBookTitle = (loan) => {
        if (loan.book_title) {
            return loan.book_title;
        }

        if (
            typeof loan.book === "object" &&
            loan.book !== null
        ) {
            return (
                loan.book.title ||
                loan.book.name ||
                "Unknown Book"
            );
        }

        return (
            loan.book ||
            "Unknown Book"
        );
    };

    // =====================================================
    // GET BOOK AUTHOR
    // =====================================================

    const getBookAuthor = (loan) => {
        if (loan.book_author) {
            return loan.book_author;
        }

        if (loan.author_name) {
            return loan.author_name;
        }

        if (
            typeof loan.book === "object" &&
            loan.book !== null
        ) {
            if (loan.book.author_name) {
                return loan.book.author_name;
            }

            if (
                typeof loan.book.author === "object" &&
                loan.book.author !== null
            ) {
                return (
                    loan.book.author.name ||
                    "Unknown Author"
                );
            }
        }

        return "";
    };

    // =====================================================
    // GET BOOK COVER
    // =====================================================

    const getBookCover = (loan) => {
    if (!cover) {
        return "";
    }

    if (
        cover.startsWith("http://") ||
        cover.startsWith("https://")
    ) {
        return cover;
    }

    if (cover.startsWith("/")) {
        return `${API_ORIGIN}${cover}`;
    }

    return `${API_ORIGIN}/media/${cover}`;
    };

    // =====================================================
    // GET STATUS
    // =====================================================

    const getLoanStatus = (loan) => {
        const status =
            String(loan.status || "")
                .trim()
                .toLowerCase();

        if (
            status === "return_requested"
        ) {
            return "return_requested";
        }

        if (status === "returned") {
            return "returned";
        }

        if (status === "overdue") {
            return "overdue";
        }

        if (status === "lost") {
            return "lost";
        }

        return "borrowed";
    };

    // =====================================================
    // FETCH MY LOANS
    // =====================================================

    const fetchMyLoans = async (
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
                await api.get("loans/");

            setLoans(
                extractResults(
                    response.data
                )
            );
        } catch (err) {
            console.error(
                "ERROR FETCHING MY LOANS:",
                err.response?.data ||
                    err.message
            );

            if (err.response) {
                const backendError =
                    err.response.data;

                if (
                    backendError?.detail
                ) {
                    setError(
                        backendError.detail
                    );
                } else if (
                    backendError?.error
                ) {
                    setError(
                        backendError.error
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
                    "Unable to load your loans."
                );
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // =====================================================
    // FETCH MEMBER FEES
    // =====================================================

    const fetchFees = async () => {
        try {
            setFeesLoading(true);
            setFeesError("");

            const response =
                await api.get(
                    "member-fees/"
                );

            setFees(
                extractResults(
                    response.data
                )
            );
        } catch (err) {
            console.error(
                "FETCH FEES ERROR:",
                err.response?.data ||
                    err.message
            );

            setFees([]);

            setFeesError(
                err.response?.data?.detail ||
                    err.response?.data?.error ||
                    "Unable to load your fees."
            );
        } finally {
            setFeesLoading(false);
        }
    };

    // =====================================================
    // FETCH PAYMENT HISTORY
    // =====================================================

    const fetchPayments = async () => {
        try {
            setPaymentsLoading(true);

            const response =
                await api.get(
                    "payments/"
                );

            setPayments(
                extractResults(
                    response.data
                )
            );
        } catch (err) {
            console.error(
                "FETCH PAYMENTS ERROR:",
                err.response?.data ||
                    err.message
            );

            setPayments([]);

            if (err.response) {
                setPaymentError(
                    err.response.data?.detail ||
                        err.response.data?.error ||
                        `Unable to load payment history. Server error: ${err.response.status}`
                );
            }
        } finally {
            setPaymentsLoading(false);
        }
    };

    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {
        fetchMyLoans();
        fetchFees();
        fetchPayments();
    }, []);

    // =====================================================
    // LOAN STATISTICS
    // =====================================================

    const loanStats = useMemo(() => {
        const stats = {
            total: loans.length,
            borrowed: 0,
            overdue: 0,
            returned: 0,
            returnRequested: 0,
            lost: 0,
        };

        loans.forEach((loan) => {
            const status =
                getLoanStatus(loan);

            if (status === "borrowed") {
                stats.borrowed += 1;
            }

            if (status === "overdue") {
                stats.overdue += 1;
            }

            if (status === "returned") {
                stats.returned += 1;
            }

            if (
                status ===
                "return_requested"
            ) {
                stats.returnRequested += 1;
            }

            if (status === "lost") {
                stats.lost += 1;
            }
        });

        return stats;
    }, [loans]);

    // =====================================================
    // FEES STATISTICS
    // =====================================================

    const pendingFees = useMemo(
        () =>
            fees.filter(
                (fee) =>
                    fee.status ===
                    "pending"
            ),
        [fees]
    );

    const outstandingAmount =
        pendingFees.reduce(
            (total, fee) =>
                total +
                Number(
                    fee.amount || 0
                ),
            0
        );

    // =====================================================
    // FORMAT DATE
    // =====================================================

    const formatDate = (
        dateValue
    ) => {
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

    // =====================================================
    // CHECK DUE DATE
    // =====================================================

    const isDueSoon = (loan) => {
        const status =
            getLoanStatus(loan);

        if (
            status === "returned" ||
            status === "overdue" ||
            status === "lost" ||
            status ===
                "return_requested" ||
            !loan.due_date
        ) {
            return false;
        }

        const dueDate =
            new Date(
                loan.due_date
            );

        if (
            Number.isNaN(
                dueDate.getTime()
            )
        ) {
            return false;
        }

        const today = new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );

        dueDate.setHours(
            0,
            0,
            0,
            0
        );

        const difference =
            dueDate.getTime() -
            today.getTime();

        const days =
            difference /
            (1000 * 60 * 60 * 24);

        return (
            days >= 0 &&
            days <= 3
        );
    };

    // =====================================================
    // STATUS BADGE
    // =====================================================

    const renderStatus = (loan) => {
        const status =
            getLoanStatus(loan);

        if (
            status ===
            "return_requested"
        ) {
            return (
                <span className="badge bg-info text-dark rounded-pill px-3 py-2">
                    ↩ Return Requested
                </span>
            );
        }

        if (status === "returned") {
            return (
                <span className="badge bg-success rounded-pill px-3 py-2">
                    ✓ Returned
                </span>
            );
        }

        if (status === "lost") {
            return (
                <span className="badge bg-dark rounded-pill px-3 py-2">
                    ✕ Lost
                </span>
            );
        }

        if (status === "overdue") {
            return (
                <span className="badge bg-danger rounded-pill px-3 py-2">
                    ⚠ Overdue
                </span>
            );
        }

        return (
            <span className="badge bg-warning text-dark rounded-pill px-3 py-2">
                📖 Borrowed
            </span>
        );
    };

    // =====================================================
    // REQUEST RETURN
    // =====================================================

    const handleRequestReturn =
        async (loan) => {
            const confirmed =
                window.confirm(
                    `Request return for "${getBookTitle(
                        loan
                    )}"?`
                );

            if (!confirmed) {
                return;
            }

            try {
                setError("");
                setReturnLoadingId(loan.id);

                await api.post(
                    `loans/${loan.id}/request-return/`
                );

                await fetchMyLoans(
                    false
                );
            } catch (err) {
                console.error(
                    "REQUEST RETURN ERROR:",
                    err.response?.data ||
                        err.message
                );

                setError(
                    err.response?.data
                        ?.detail ||
                        err.response?.data
                            ?.error ||
                        "Unable to request book return."
                );
            } finally {
                setReturnLoadingId(null);
            }
        };

    // =====================================================
    // OPEN SIMPLE PAYMENT MODAL
    // =====================================================

    const handlePayFee = (fee) => {
        setPaymentError("");
        setPaymentSuccess("");
        setSelectedFee(fee);
        setPaymentMethod("upi");
        setShowPaymentModal(true);
    };

    // =====================================================
    // CONFIRM SIMPLE PROJECT PAYMENT
    // =====================================================

    const handleConfirmPayment = async () => {
        if (!selectedFee) {
            return;
        }

        try {
            setPaymentError("");
            setPaymentSuccess("");
            setPaymentLoadingId(selectedFee.id);

            const response = await api.post(
                `payments/create/${selectedFee.id}/`,
                {
                    payment_method: paymentMethod,
                }
            );

            setPaymentSuccess(
                response.data?.detail ||
                    "Payment completed successfully! 🎉"
            );

            setShowPaymentModal(false);
            setSelectedFee(null);

            await Promise.all([
                fetchFees(),
                fetchPayments(),
            ]);
        } catch (err) {
            console.error(
                "SIMPLE PAYMENT ERROR:",
                err.response?.data || err.message
            );

            setPaymentError(
                err.response?.data?.detail ||
                    err.response?.data?.error ||
                    "Unable to complete payment."
            );

            setPaymentSuccess("");
        } finally {
            setPaymentLoadingId(null);
        }
    };

    // =====================================================
    // LOADING
    // =====================================================

    if (loading) {
        return (
            <div className="container py-5">
                <LoadingStages
                    title="Loading your loans"
                    stages={[
                        "Connecting to your account",
                        "Fetching loans and fees",
                        "Preparing your borrowing history",
                    ]}
                />
            </div>
        );
    }

    // =====================================================
    // UI
    // =====================================================

    return (
        <div className="container py-4">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">

                <div>
                    <h1 className="fw-bold mb-1">
                        📚 My Loans
                    </h1>

                    <p className="text-muted mb-0">
                        Manage your current loans,
                        borrowing history and fees.
                    </p>
                </div>

                <ButtonLoading
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() =>
                        Promise.all([
                            fetchMyLoans(false),
                            fetchFees(),
                            fetchPayments(),
                        ])
                    }
                    loading={
                        refreshing ||
                        feesLoading ||
                        paymentsLoading
                    }
                    loadingText="Refreshing..."
                >
                    🔄 Refresh
                </ButtonLoading>

            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
                <ErrorState
                    className="mb-4"
                    title="Unable to load your loans"
                    message={error}
                    action={
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => fetchMyLoans(false)}
                            disabled={refreshing}
                        >
                            Try Again
                        </button>
                    }
                />
            )}

            {/* =================================================
                STATISTICS
            ================================================= */}

            <div className="row g-3 mb-4">

                <div className="col-6 col-md-3">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body">

                            <small className="text-muted">
                                Total Loans
                            </small>

                            <h3 className="fw-bold mb-0 mt-1">
                                {
                                    loanStats.total
                                }
                            </h3>

                        </div>

                    </div>

                </div>

                <div className="col-6 col-md-3">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body">

                            <small className="text-muted">
                                Active
                            </small>

                            <h3 className="fw-bold text-primary mb-0 mt-1">
                                {
                                    loanStats.borrowed
                                }
                            </h3>

                        </div>

                    </div>

                </div>

                <div className="col-6 col-md-3">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body">

                            <small className="text-muted">
                                Overdue
                            </small>

                            <h3 className="fw-bold text-danger mb-0 mt-1">
                                {
                                    loanStats.overdue
                                }
                            </h3>

                        </div>

                    </div>

                </div>

                <div className="col-6 col-md-3">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body">

                            <small className="text-muted">
                                Outstanding Fees
                            </small>

                            <h3 className="fw-bold text-warning mb-0 mt-1">
                                ₹
                                {outstandingAmount.toFixed(
                                    2
                                )}
                            </h3>

                        </div>

                    </div>

                </div>

            </div>

            {/* =================================================
                CURRENT LOANS
            ================================================= */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-header bg-white py-3">

                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">

                        <div>

                            <h5 className="fw-bold mb-1">
                                📖 Current & Loan History
                            </h5>

                            <small className="text-muted">
                                All your borrowing records
                                are shown below.
                            </small>

                        </div>

                        <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">
                            {loans.length}{" "}
                            {loans.length === 1
                                ? "Loan"
                                : "Loans"}
                        </span>

                    </div>

                </div>

                <div className="card-body p-0">

                    {loans.length === 0 ? (

                        <EmptyState
                            icon="📚"
                            title="No loans yet"
                            message="Your borrowing history will appear here when you borrow a book."
                            className="shadow-none rounded-0"
                        />

                    ) : (

                        <div className="table-responsive">

                            <table className="table table-hover align-middle mb-0">

                                <thead className="table-light">

                                    <tr>

                                        <th className="px-3">
                                            #
                                        </th>

                                        <th>
                                            Book
                                        </th>

                                        <th>
                                            Status
                                        </th>

                                        <th>
                                            Borrowed
                                        </th>

                                        <th>
                                            Due Date
                                        </th>

                                        <th>
                                            Returned
                                        </th>

                                        <th>
                                            Action
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {loans.map(
                                        (
                                            loan,
                                            index
                                        ) => {

                                            const title =
                                                getBookTitle(
                                                    loan
                                                );

                                            const author =
                                                getBookAuthor(
                                                    loan
                                                );

                                            const cover =
                                                getBookCover(
                                                    loan
                                                );

                                            const status =
                                                getLoanStatus(
                                                    loan
                                                );

                                            const dueSoon =
                                                isDueSoon(
                                                    loan
                                                );

                                            const canRequestReturn =
                                                [
                                                    "borrowed",
                                                    "overdue",
                                                ].includes(
                                                    status
                                                );

                                            return (
                                                <tr
                                                    key={
                                                        loan.id ||
                                                        index
                                                    }
                                                >

                                                    <td className="px-3 text-muted">
                                                        {
                                                            index +
                                                            1
                                                        }
                                                    </td>

                                                    {/* BOOK */}

                                                    <td>

                                                        <div className="d-flex align-items-center gap-3">

                                                            <div
                                                                className="rounded-3 overflow-hidden bg-body-secondary d-flex align-items-center justify-content-center flex-shrink-0"
                                                                style={{
                                                                    width:
                                                                        "52px",
                                                                    height:
                                                                        "68px",
                                                                }}
                                                            >

                                                                {cover ? (
                                                                    <img
                                                                        src={
                                                                            cover
                                                                        }
                                                                        alt={
                                                                            title
                                                                        }
                                                                        className="w-100 h-100"
                                                                        style={{
                                                                            objectFit:
                                                                                "cover",
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <span className="fs-4">
                                                                        📖
                                                                    </span>
                                                                )}

                                                            </div>

                                                            <div>

                                                                <div className="fw-semibold">
                                                                    {
                                                                        title
                                                                    }
                                                                </div>

                                                                {author && (
                                                                    <small className="text-muted">
                                                                        ✍️{" "}
                                                                        {
                                                                            author
                                                                        }
                                                                    </small>
                                                                )}

                                                            </div>

                                                        </div>

                                                    </td>

                                                    {/* STATUS */}

                                                    <td>
                                                        {
                                                            renderStatus(
                                                                loan
                                                            )
                                                        }
                                                    </td>

                                                    {/* BORROW DATE */}

                                                    <td>
                                                        <span className="small">
                                                            {
                                                                formatDate(
                                                                    loan.borrow_date
                                                                )
                                                            }
                                                        </span>
                                                    </td>

                                                    {/* DUE DATE */}

                                                    <td>

                                                        <div className="d-flex flex-column align-items-start gap-1">

                                                            <span
                                                                className={
                                                                    dueSoon
                                                                        ? "fw-semibold text-danger"
                                                                        : ""
                                                                }
                                                            >
                                                                {
                                                                    formatDate(
                                                                        loan.due_date
                                                                    )
                                                                }
                                                            </span>

                                                            {dueSoon && (
                                                                <span className="badge bg-danger-subtle text-danger">
                                                                    ⏰ Due soon
                                                                </span>
                                                            )}

                                                        </div>

                                                    </td>

                                                    {/* RETURN DATE */}

                                                    <td>

                                                        {loan.return_date ? (
                                                            <span className="small text-success">
                                                                {
                                                                    formatDate(
                                                                        loan.return_date
                                                                    )
                                                                }
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted small">
                                                                Not returned
                                                            </span>
                                                        )}

                                                    </td>

                                                    {/* ACTION */}

                                                    <td>

                                                        {canRequestReturn ? (

                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-success"
                                                                onClick={() =>
                                                                    handleRequestReturn(
                                                                        loan
                                                                    )
                                                                }
                                                            >
                                                                ↩ Request Return
                                                            </button>

                                                        ) : status ===
                                                          "return_requested" ? (

                                                            <span className="badge bg-info-subtle text-info">
                                                                Waiting for librarian
                                                            </span>

                                                        ) : status ===
                                                          "returned" ? (

                                                            <span className="text-muted small">
                                                                Completed
                                                            </span>

                                                        ) : status ===
                                                          "lost" ? (

                                                            <span className="text-muted small">
                                                                Book lost
                                                            </span>

                                                        ) : (

                                                            <span className="text-muted small">
                                                                —
                                                            </span>

                                                        )}

                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </div>

            {/* =================================================
                FEES & PAYMENTS
            ================================================= */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-header bg-white py-3">

                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">

                        <div>

                            <h5 className="fw-bold mb-1">
                                💳 Fees & Payments
                            </h5>

                            <small className="text-muted">
                                Pay late, damage and
                                lost-book fees securely.
                            </small>

                        </div>

                        <div className="text-md-end">

                            <small className="text-muted d-block">
                                Outstanding
                            </small>

                            <span className="fw-bold text-danger fs-5">
                                ₹
                                {outstandingAmount.toFixed(
                                    2
                                )}
                            </span>

                        </div>

                    </div>

                </div>

                <div className="card-body">

                    {paymentError && (
                        <div className="alert alert-danger">
                            ⚠️{" "}
                            {paymentError}
                        </div>
                    )}

                    {paymentSuccess && (
                        <div className="alert alert-success">
                            ✅{" "}
                            {paymentSuccess}
                        </div>
                    )}

                    {feesError && (
                        <ErrorState
                            className="mb-3"
                            title="Unable to load fees"
                            message={feesError}
                            action={
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={fetchFees}
                                    disabled={feesLoading}
                                >
                                    Try Again
                                </button>
                            }
                        />
                    )}

                    {feesLoading ? (

                        <LoadingStages
                            compact
                            title="Loading fees"
                            stages={[
                                "Fetching your fees",
                                "Checking pending balances",
                                "Preparing payment options",
                            ]}
                        />

                    ) : pendingFees.length === 0 ? (

                        <EmptyState
                            icon="🎉"
                            title="No outstanding fees"
                            message="You don't have any pending library fees."
                            className="shadow-none"
                        />

                    ) : (

                        <div className="table-responsive">

                            <table className="table table-hover align-middle">

                                <thead className="table-light">

                                    <tr>

                                        <th>
                                            Book
                                        </th>

                                        <th>
                                            Fee Type
                                        </th>

                                        <th>
                                            Description
                                        </th>

                                        <th>
                                            Amount
                                        </th>

                                        <th>
                                            Created
                                        </th>

                                        <th>
                                            Action
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {pendingFees.map(
                                        (fee) => (

                                            <tr
                                                key={
                                                    fee.id
                                                }
                                            >

                                                <td className="fw-semibold">
                                                    {
                                                        fee.book_title ||
                                                        "Book"
                                                    }
                                                </td>

                                                <td>

                                                    <span className="badge bg-warning text-dark text-capitalize">
                                                        {
                                                            fee.fee_type
                                                        }
                                                    </span>

                                                </td>

                                                <td>

                                                    <small className="text-muted">
                                                        {
                                                            fee.description ||
                                                            "—"
                                                        }
                                                    </small>

                                                </td>

                                                <td className="fw-bold">

                                                    ₹
                                                    {Number(
                                                        fee.amount ||
                                                            0
                                                    ).toFixed(
                                                        2
                                                    )}

                                                </td>

                                                <td>

                                                    {
                                                        formatDate(
                                                            fee.created_at
                                                        )
                                                    }

                                                </td>

                                                <td>

                                                    <ButtonLoading
                                                        type="button"
                                                        className="btn btn-sm btn-primary"
                                                        onClick={() =>
                                                            handlePayFee(
                                                                fee
                                                            )
                                                        }
                                                        loading={
                                                            paymentLoadingId ===
                                                            fee.id
                                                        }
                                                        loadingText="Processing..."
                                                    >
                                                        💳 Pay Now
                                                    </ButtonLoading>

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

            {/* =================================================
                PAYMENT HISTORY
            ================================================= */}

            <div className="card border-0 shadow-sm">

                <div className="card-header bg-white py-3">

                    <div className="d-flex justify-content-between align-items-center">

                        <div>

                            <h5 className="fw-bold mb-1">
                                🧾 Payment History
                            </h5>

                            <small className="text-muted">
                                Your completed and previous
                                payment transactions.
                            </small>

                        </div>

                        <span className="badge bg-success-subtle text-success rounded-pill px-3 py-2">
                            {
                                payments.filter(
                                    (payment) =>
                                        payment.status ===
                                        "successful"
                                ).length
                            }{" "}
                            Successful
                        </span>

                    </div>

                </div>

                <div className="card-body p-0">

                    {paymentError && !showPaymentModal && (
                        <ErrorState
                            className="mb-3"
                            title="Unable to load payment history"
                            message={paymentError}
                            action={
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={fetchPayments}
                                    disabled={paymentsLoading}
                                >
                                    Try Again
                                </button>
                            }
                        />
                    )}

                    {paymentsLoading ? (

                        <LoadingStages
                            compact
                            title="Loading payment history"
                            stages={[
                                "Fetching transactions",
                                "Checking payment status",
                                "Preparing payment history",
                            ]}
                        />

                    ) : payments.length === 0 ? (

                        <EmptyState
                            icon="🧾"
                            title="No payment history"
                            message="Your payments will appear here after a successful payment."
                            className="shadow-none"
                        />

                    ) : (

                        <div className="table-responsive">

                            <table className="table table-hover align-middle mb-0">

                                <thead className="table-light">

                                    <tr>

                                        <th className="px-3">
                                            #
                                        </th>

                                        <th>
                                            Book
                                        </th>

                                        <th>
                                            Fee Type
                                        </th>

                                        <th>
                                            Amount
                                        </th>

                                        <th>
                                            Status
                                        </th>

                                        <th>
                                            Transaction
                                        </th>

                                        <th>
                                            Date
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {payments.map(
                                        (
                                            payment,
                                            index
                                        ) => (

                                            <tr
                                                key={
                                                    payment.id ||
                                                    index
                                                }
                                            >

                                                <td className="px-3 text-muted">
                                                    {
                                                        index +
                                                        1
                                                    }
                                                </td>

                                                <td className="fw-semibold">
                                                    {
                                                        payment.book_title ||
                                                        "Book"
                                                    }
                                                </td>

                                                <td>

                                                    <span className="text-capitalize">
                                                        {
                                                            payment.fee_type ||
                                                            "Fee"
                                                        }
                                                    </span>

                                                </td>

                                                <td className="fw-bold">

                                                    ₹
                                                    {Number(
                                                        payment.amount ||
                                                            0
                                                    ).toFixed(
                                                        2
                                                    )}

                                                </td>

                                                <td>

                                                    {payment.status ===
                                                    "successful" ? (

                                                        <span className="badge bg-success">
                                                            ✓ Successful
                                                        </span>

                                                    ) : payment.status ===
                                                      "failed" ? (

                                                        <span className="badge bg-danger">
                                                            ✕ Failed
                                                        </span>

                                                    ) : (

                                                        <span className="badge bg-warning text-dark">
                                                            Pending
                                                        </span>

                                                    )}

                                                </td>

                                                <td>

                                                    <small className="text-muted">

                                                        {
                                                            payment.transaction_id ||
                                                            payment.gateway_payment_id ||
                                                            "—"
                                                        }

                                                    </small>

                                                </td>

                                                <td>

                                                    {
                                                        formatDate(
                                                            payment.paid_at ||
                                                                payment.created_at
                                                        )
                                                    }

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

            {/* =================================================
                SIMPLE PAYMENT MODAL
            ================================================= */}

            {showPaymentModal && selectedFee && (

                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    role="dialog"
                    aria-modal="true"
                    style={{
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                    }}
                >

                    <div
                        className="modal-dialog modal-dialog-centered"
                        role="document"
                    >

                        <div className="modal-content border-0 shadow">

                            <div className="modal-header">

                                <div>
                                    <h5 className="modal-title fw-bold mb-1">
                                        💳 Pay Library Fee
                                    </h5>

                                    <small className="text-muted">
                                        Simple project payment
                                    </small>
                                </div>

                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Close"
                                    onClick={() => {
                                        setShowPaymentModal(false);
                                        setSelectedFee(null);
                                        setPaymentError("");
                                    }}
                                    disabled={
                                        paymentLoadingId === selectedFee.id
                                    }
                                />

                            </div>

                            <div className="modal-body">

                                <div className="bg-light rounded-3 p-3 mb-4">

                                    <div className="d-flex justify-content-between gap-3 mb-2">
                                        <span className="text-muted">
                                            Book
                                        </span>
                                        <strong className="text-end">
                                            {selectedFee.book_title || "Book"}
                                        </strong>
                                    </div>

                                    <div className="d-flex justify-content-between gap-3 mb-2">
                                        <span className="text-muted">
                                            Fee Type
                                        </span>
                                        <span className="text-capitalize">
                                            {selectedFee.fee_type || "Fee"}
                                        </span>
                                    </div>

                                    <div className="d-flex justify-content-between gap-3">
                                        <span className="text-muted">
                                            Amount
                                        </span>
                                        <strong className="text-primary fs-5">
                                            ₹{Number(selectedFee.amount || 0).toFixed(2)}
                                        </strong>
                                    </div>

                                </div>

                                <label
                                    className="form-label fw-semibold"
                                    htmlFor="payment-method"
                                >
                                    Select Payment Method
                                </label>

                                <select
                                    id="payment-method"
                                    className="form-select"
                                    value={paymentMethod}
                                    onChange={(event) =>
                                        setPaymentMethod(event.target.value)
                                    }
                                    disabled={
                                        paymentLoadingId === selectedFee.id
                                    }
                                >
                                    <option value="upi">
                                        📱 UPI
                                    </option>
                                    <option value="card">
                                        💳 Card
                                    </option>
                                    <option value="netbanking">
                                        🏦 Net Banking
                                    </option>
                                </select>

                                <div className="alert alert-info mt-3 mb-0">
                                    <small>
                                        This is a simulated payment system for the
                                        LMS project. No real money will be charged.
                                    </small>
                                </div>

                                {paymentError && (
                                    <div className="alert alert-danger mt-3 mb-0">
                                        ⚠️ {paymentError}
                                    </div>
                                )}

                            </div>

                            <div className="modal-footer">

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => {
                                        setShowPaymentModal(false);
                                        setSelectedFee(null);
                                        setPaymentError("");
                                    }}
                                    disabled={
                                        paymentLoadingId === selectedFee.id
                                    }
                                >
                                    Cancel
                                </button>

                                <ButtonLoading
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleConfirmPayment}
                                    loading={
                                        paymentLoadingId === selectedFee.id
                                    }
                                    loadingText="Processing..."
                                >
                                    💳 Confirm Payment
                                </ButtonLoading>

                            </div>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}

export default MyLoans;