import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/authcontext";

function Loans() {
    const { user } = useAuth();

    // =====================================================
    // LOANS
    // =====================================================

    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // =====================================================
    // PAGINATION
    // =====================================================

    const [nextPage, setNextPage] = useState(null);
    const [previousPage, setPreviousPage] = useState(null);
    const [totalCount, setTotalCount] = useState(0);

    // =====================================================
    // SEARCH / FILTERS
    // =====================================================

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [bookFilter, setBookFilter] = useState("");
    const [memberFilter, setMemberFilter] = useState("");
    const [ordering, setOrdering] = useState("-borrow_date");

    // =====================================================
    // BOOKS / MEMBERS
    // =====================================================

    const [books, setBooks] = useState([]);
    const [members, setMembers] = useState([]);

    // =====================================================
    // BORROWING REQUESTS
    // =====================================================

    const [bookRequests, setBookRequests] = useState([]);
    const [requestLoading, setRequestLoading] = useState(false);
    const [requestActionLoading, setRequestActionLoading] =
        useState(null);
    const [requestError, setRequestError] = useState("");
    const [requestMessage, setRequestMessage] = useState("");

    // =====================================================
    // ISSUE BOOK MODAL
    // =====================================================

    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        book: "",
        member: "",
    });

    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    // =====================================================
    // RETURN MODAL
    // =====================================================

    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState(null);

    const [returnCondition, setReturnCondition] =
        useState("normal");

    const [damageFee, setDamageFee] = useState("");
    const [lostFee, setLostFee] = useState("");
    const [returnDescription, setReturnDescription] =
        useState("");

    const [returnSaving, setReturnSaving] = useState(false);
    const [returnError, setReturnError] = useState("");
    const [returnMessage, setReturnMessage] = useState("");

    // =====================================================
    // ROLE
    // =====================================================

    const canManageLoans =
        user?.role === "librarian";

    // =====================================================
    // EXTRACT RESULTS
    // =====================================================

    const extractResults = (data) => {
        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data?.results)) {
            return data.results;
        }

        return [];
    };

    // =====================================================
    // FETCH LOANS
    // =====================================================

    const fetchLoans = async (
        url = "loans/?ordering=-borrow_date"
    ) => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get(url);

            const data = response.data;

            if (Array.isArray(data?.results)) {
                setLoans(data.results);
                setNextPage(data.next || null);
                setPreviousPage(data.previous || null);
                setTotalCount(data.count || 0);
            } else if (Array.isArray(data)) {
                setLoans(data);
                setNextPage(null);
                setPreviousPage(null);
                setTotalCount(data.length);
            } else {
                setLoans([]);
                setNextPage(null);
                setPreviousPage(null);
                setTotalCount(0);
            }
        } catch (err) {
            console.error(
                "LOAN API ERROR:",
                err.response?.data || err.message
            );

            setLoans([]);

            if (err.response) {
                const responseData = err.response.data;

                if (typeof responseData === "string") {
                    setError(responseData);
                } else if (responseData?.detail) {
                    setError(responseData.detail);
                } else {
                    setError(
                        JSON.stringify(
                            responseData ||
                                "Unable to load loans.",
                            null,
                            2
                        )
                    );
                }
            } else if (err.request) {
                setError(
                    "Network error. Unable to connect to the backend."
                );
            } else {
                setError("Unable to load loans.");
            }
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // FETCH BOOKS
    // =====================================================

    const fetchBooks = async () => {
        try {
            const response = await api.get(
                "books/?ordering=title"
            );

            setBooks(
                extractResults(response.data)
            );
        } catch (err) {
            console.error(
                "BOOK API ERROR:",
                err.response?.data || err.message
            );
        }
    };

    // =====================================================
    // FETCH MEMBERS
    // =====================================================

    const fetchMembers = async () => {
        try {
            const response = await api.get(
                "members/?ordering=name"
            );

            setMembers(
                extractResults(response.data)
            );
        } catch (err) {
            console.error(
                "MEMBER API ERROR:",
                err.response?.data || err.message
            );
        }
    };

    // =====================================================
    // FETCH BORROWING REQUESTS
    // =====================================================

    const fetchBookRequests = async () => {
        if (!canManageLoans) {
            setBookRequests([]);
            return;
        }

        try {
            setRequestLoading(true);
            setRequestError("");

            const response = await api.get(
                "book-requests/"
            );

            setBookRequests(
                extractResults(response.data)
            );
        } catch (err) {
            console.error(
                "BOOK REQUEST API ERROR:",
                err.response?.data || err.message
            );

            setBookRequests([]);

            setRequestError(
                err.response?.data?.error ||
                    err.response?.data?.detail ||
                    "Unable to load borrowing requests."
            );
        } finally {
            setRequestLoading(false);
        }
    };

    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {
        fetchLoans(
            "loans/?ordering=-borrow_date"
        );

        if (canManageLoans) {
            fetchBooks();
            fetchMembers();
            fetchBookRequests();
        }
    }, [canManageLoans]);

    // =====================================================
    // BUILD FILTER URL
    // =====================================================

    const buildFilterUrl = (overrides = {}) => {
        const currentSearch =
            overrides.search !== undefined
                ? overrides.search
                : search;

        const currentStatus =
            overrides.status !== undefined
                ? overrides.status
                : statusFilter;

        const currentBook =
            overrides.book !== undefined
                ? overrides.book
                : bookFilter;

        const currentMember =
            overrides.member !== undefined
                ? overrides.member
                : memberFilter;

        const currentOrdering =
            overrides.ordering !== undefined
                ? overrides.ordering
                : ordering;

        const params = new URLSearchParams();

        if (currentSearch?.trim()) {
            params.append(
                "search",
                currentSearch.trim()
            );
        }

        if (currentStatus) {
            params.append(
                "status",
                currentStatus
            );
        }

        if (currentBook) {
            params.append(
                "book",
                currentBook
            );
        }

        if (currentMember) {
            params.append(
                "member",
                currentMember
            );
        }

        if (currentOrdering) {
            params.append(
                "ordering",
                currentOrdering
            );
        }

        const queryString =
            params.toString();

        return queryString
            ? `loans/?${queryString}`
            : "loans/";
    };

    // =====================================================
    // SEARCH
    // =====================================================

    const handleSearch = (event) => {
        event.preventDefault();

        fetchLoans(
            buildFilterUrl({
                search,
            })
        );
    };

    // =====================================================
    // STATUS FILTER
    // =====================================================

    const handleStatusChange = (event) => {
        const value =
            event.target.value;

        setStatusFilter(value);

        fetchLoans(
            buildFilterUrl({
                status: value,
            })
        );
    };

    // =====================================================
    // BOOK FILTER
    // =====================================================

    const handleBookChange = (event) => {
        const value =
            event.target.value;

        setBookFilter(value);

        fetchLoans(
            buildFilterUrl({
                book: value,
            })
        );
    };

    // =====================================================
    // MEMBER FILTER
    // =====================================================

    const handleMemberChange = (event) => {
        const value =
            event.target.value;

        setMemberFilter(value);

        fetchLoans(
            buildFilterUrl({
                member: value,
            })
        );
    };

    // =====================================================
    // ORDERING
    // =====================================================

    const handleOrderingChange = (event) => {
        const value =
            event.target.value;

        setOrdering(value);

        fetchLoans(
            buildFilterUrl({
                ordering: value,
            })
        );
    };

    // =====================================================
    // CLEAR FILTERS
    // =====================================================

    const handleClearFilters = () => {
        setSearch("");
        setStatusFilter("");
        setBookFilter("");
        setMemberFilter("");
        setOrdering("-borrow_date");

        fetchLoans(
            "loans/?ordering=-borrow_date"
        );
    };

    // =====================================================
    // APPROVE / REJECT BORROW REQUEST
    // =====================================================

    const handleRequestAction = async (
        bookRequest,
        action
    ) => {
        const actionLabel =
            action === "approve"
                ? "approve"
                : "reject";

        const confirmed =
            window.confirm(
                `Are you sure you want to ${actionLabel} this borrowing request?`
            );

        if (!confirmed) {
            return;
        }

        setRequestActionLoading(
            `${action}-${bookRequest.id}`
        );

        setRequestError("");
        setRequestMessage("");

        try {
            const response =
                await api.patch(
                    `book-requests/${bookRequest.id}/action/`,
                    {
                        action,
                    }
                );

            setRequestMessage(
                response.data?.message ||
                    (action === "approve"
                        ? "Request approved and book issued successfully."
                        : "Borrowing request rejected successfully.")
            );

            await Promise.all([
                fetchBookRequests(),
                fetchLoans(
                    buildFilterUrl()
                ),
                fetchBooks(),
            ]);
        } catch (err) {
            console.error(
                "BOOK REQUEST ACTION ERROR:",
                err.response?.data ||
                    err.message
            );

            setRequestError(
                err.response?.data?.error ||
                    err.response?.data?.detail ||
                    `Unable to ${actionLabel} this borrowing request.`
            );
        } finally {
            setRequestActionLoading(null);
        }
    };

    // =====================================================
    // OPEN ISSUE MODAL
    // =====================================================

    const handleAddLoan = () => {
        setFormData({
            book: "",
            member: "",
        });

        setFormError("");
        setShowModal(true);
    };

    // =====================================================
    // CLOSE ISSUE MODAL
    // =====================================================

    const closeModal = () => {
        if (saving) {
            return;
        }

        setShowModal(false);

        setFormData({
            book: "",
            member: "",
        });

        setFormError("");
    };

    // =====================================================
    // FORM CHANGE
    // =====================================================

    const handleFormChange = (event) => {
        const {
            name,
            value,
        } = event.target;

        setFormData(
            (previous) => ({
                ...previous,
                [name]: value,
            })
        );
    };

    // =====================================================
    // ISSUE BOOK
    // =====================================================

    const handleSubmit = async (event) => {
        event.preventDefault();

        setFormError("");

        if (!formData.book) {
            setFormError(
                "Please select a book."
            );
            return;
        }

        if (!formData.member) {
            setFormError(
                "Please select a member."
            );
            return;
        }

        const selectedBook =
            books.find(
                (book) =>
                    String(book.id) ===
                    String(formData.book)
            );

        if (
            selectedBook &&
            Number(selectedBook.available) <= 0
        ) {
            setFormError(
                "This book is currently unavailable."
            );
            return;
        }

        try {
            setSaving(true);

            await api.post(
                "loans/",
                {
                    book: Number(
                        formData.book
                    ),
                    member: Number(
                        formData.member
                    ),
                }
            );

            setShowModal(false);

            setFormData({
                book: "",
                member: "",
            });

            await Promise.all([
                fetchLoans(
                    buildFilterUrl()
                ),
                fetchBooks(),
            ]);
        } catch (err) {
            console.error(
                "CREATE LOAN ERROR:",
                err.response?.data ||
                    err.message
            );

            const responseData =
                err.response?.data;

            if (
                responseData?.detail
            ) {
                setFormError(
                    responseData.detail
                );
            } else if (
                responseData?.error
            ) {
                setFormError(
                    responseData.error
                );
            } else if (
                typeof responseData ===
                "string"
            ) {
                setFormError(
                    responseData
                );
            } else {
                setFormError(
                    "Unable to issue the book."
                );
            }
        } finally {
            setSaving(false);
        }
    };

    // =====================================================
    // OPEN RETURN MODAL
    // =====================================================

    const openReturnModal = (loan) => {
        setSelectedLoan(loan);

        setReturnCondition("normal");
        setDamageFee("");
        setLostFee("");
        setReturnDescription("");

        setReturnError("");
        setReturnMessage("");

        setShowReturnModal(true);
    };

    // =====================================================
    // CLOSE RETURN MODAL
    // =====================================================

    const closeReturnModal = () => {
        if (returnSaving) {
            return;
        }

        setShowReturnModal(false);
        setSelectedLoan(null);

        setReturnCondition("normal");
        setDamageFee("");
        setLostFee("");
        setReturnDescription("");

        setReturnError("");
        setReturnMessage("");
    };

    // =====================================================
    // PROCESS RETURN
    // =====================================================

    const handleProcessReturn = async (
        event
    ) => {
        event.preventDefault();

        if (!selectedLoan) {
            return;
        }

        setReturnError("");
        setReturnMessage("");

        if (
            returnCondition ===
                "damaged" &&
            Number(damageFee) <= 0
        ) {
            setReturnError(
                "Please enter a valid damage fee."
            );
            return;
        }

        if (
            returnCondition ===
                "lost" &&
            Number(lostFee) <= 0
        ) {
            setReturnError(
                "Please enter a valid lost-book fee."
            );
            return;
        }

        try {
            setReturnSaving(true);

            const response =
                await api.patch(
                    `loans/${selectedLoan.id}/process-return/`,
                    {
                        condition:
                            returnCondition,

                        damage_fee:
                            returnCondition ===
                            "damaged"
                                ? Number(
                                      damageFee ||
                                          0
                                  )
                                : 0,

                        lost_fee:
                            returnCondition ===
                            "lost"
                                ? Number(
                                      lostFee ||
                                          0
                                  )
                                : 0,

                        description:
                            returnDescription.trim(),
                    }
                );

            setReturnMessage(
                response.data?.detail ||
                    "Book returned successfully."
            );

            await Promise.all([
                fetchLoans(
                    buildFilterUrl()
                ),
                fetchBooks(),
            ]);

            setTimeout(() => {
                closeReturnModal();
            }, 1000);
        } catch (err) {
            console.error(
                "PROCESS RETURN ERROR:",
                err.response?.data ||
                    err.message
            );

            const responseData =
                err.response?.data;

            setReturnError(
                responseData?.detail ||
                    responseData?.error ||
                    "Unable to process the return."
            );
        } finally {
            setReturnSaving(false);
        }
    };

    // =====================================================
    // STATUS BADGE
    // =====================================================

    const getStatusBadge = (
        loanStatus
    ) => {
        switch (loanStatus) {
            case "returned":
                return (
                    <span className="badge bg-success">
                        ✓ Returned
                    </span>
                );

            case "lost":
                return (
                    <span className="badge bg-dark">
                        ✕ Lost
                    </span>
                );

            case "return_requested":
                return (
                    <span className="badge bg-info text-dark">
                        ↩ Return Requested
                    </span>
                );

            case "overdue":
                return (
                    <span className="badge bg-danger">
                        ⚠ Overdue
                    </span>
                );

            case "borrowed":
            default:
                return (
                    <span className="badge bg-warning text-dark">
                        📖 Borrowed
                    </span>
                );
        }
    };

    // =====================================================
    // DATE FORMATTER
    // =====================================================

    const formatDate = (date) => {
        if (!date) {
            return "N/A";
        }

        const parsedDate =
            new Date(date);

        if (
            Number.isNaN(
                parsedDate.getTime()
            )
        ) {
            return date;
        }

        return parsedDate.toLocaleDateString(
            undefined,
            {
                year: "numeric",
                month: "short",
                day: "numeric",
            }
        );
    };

    // =====================================================
    // HELPERS
    // =====================================================

    const getBookTitle = (loan) => {
        if (loan.book_title) {
            return loan.book_title;
        }

        if (
            typeof loan.book ===
                "object" &&
            loan.book !== null
        ) {
            return (
                loan.book.title ||
                loan.book.name ||
                "Unknown Book"
            );
        }

        return loan.book ||
            "Unknown Book";
    };

    const getMemberName = (loan) => {
        if (loan.member_name) {
            return loan.member_name;
        }

        if (
            typeof loan.member ===
                "object" &&
            loan.member !== null
        ) {
            return (
                loan.member.name ||
                loan.member.email ||
                "Unknown Member"
            );
        }

        return loan.member ||
            "Unknown Member";
    };

    const pendingRequests =
        bookRequests.filter(
            (item) =>
                item.status ===
                "pending"
        );

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
                        📖 Loans
                    </h1>

                    <p className="text-muted mb-0">
                        Search, filter and manage
                        library loans.
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2">

                    <span className="badge bg-primary fs-6 px-3 py-2">
                        {totalCount}{" "}
                        {totalCount === 1
                            ? "Loan"
                            : "Loans"}
                    </span>

                    {canManageLoans && (
                        <button
                            className="btn btn-primary"
                            onClick={
                                handleAddLoan
                            }
                        >
                            + Issue Book
                        </button>
                    )}

                </div>

            </div>

            {/* =================================================
                BORROWING REQUESTS
            ================================================= */}

            {canManageLoans && (
                <div className="card border-0 shadow-sm mb-4">

                    <div className="card-header bg-white py-3">

                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">

                            <div>
                                <h5 className="fw-bold mb-1">
                                    🔔 Borrowing Requests
                                </h5>

                                <small className="text-muted">
                                    Review member requests.
                                    Approving a request creates
                                    the loan and issues the book.
                                </small>
                            </div>

                            <span className="badge bg-warning text-dark fs-6 px-3 py-2">
                                {
                                    pendingRequests.length
                                }{" "}
                                Pending
                            </span>

                        </div>

                    </div>

                    {requestMessage && (
                        <div className="alert alert-success rounded-0 border-0 mb-0">
                            ✅ {requestMessage}
                        </div>
                    )}

                    {requestError && (
                        <div className="alert alert-danger rounded-0 border-0 mb-0">
                            ⚠️ {requestError}
                        </div>
                    )}

                    <div className="card-body p-0">

                        {requestLoading ? (
                            <div className="text-center py-4">

                                <div
                                    className="spinner-border spinner-border-sm text-primary me-2"
                                    role="status"
                                />

                                Loading borrowing
                                requests...

                            </div>
                        ) : pendingRequests.length === 0 ? (

                            <div className="text-center py-4">

                                <div className="fs-2 mb-2">
                                    ✓
                                </div>

                                <p className="text-muted mb-0">
                                    No pending borrowing
                                    requests.
                                </p>

                            </div>

                        ) : (

                            <div className="table-responsive">

                                <table className="table table-hover align-middle mb-0">

                                    <thead className="table-light">

                                        <tr>
                                            <th className="ps-3">
                                                #
                                            </th>

                                            <th>
                                                Member
                                            </th>

                                            <th>
                                                Book
                                            </th>

                                            <th>
                                                Availability
                                            </th>

                                            <th>
                                                Requested
                                            </th>

                                            <th>
                                                Actions
                                            </th>
                                        </tr>

                                    </thead>

                                    <tbody>

                                        {pendingRequests.map(
                                            (
                                                item,
                                                index
                                            ) => {

                                                const memberName =
                                                    item.member_name ||
                                                    item.member?.name ||
                                                    item.member ||
                                                    "Unknown Member";

                                                const memberEmail =
                                                    item.member_email ||
                                                    item.member?.email ||
                                                    "";

                                                const bookTitle =
                                                    item.book_title ||
                                                    item.book?.title ||
                                                    item.book ||
                                                    "Unknown Book";

                                                const available =
                                                    item.book_available ??
                                                    item.available ??
                                                    item.book?.available;

                                                const requestedAt =
                                                    item.requested_at
                                                        ? formatDate(
                                                              item.requested_at
                                                          )
                                                        : "N/A";

                                                const approving =
                                                    requestActionLoading ===
                                                    `approve-${item.id}`;

                                                const rejecting =
                                                    requestActionLoading ===
                                                    `reject-${item.id}`;

                                                return (
                                                    <tr
                                                        key={
                                                            item.id
                                                        }
                                                    >

                                                        <td className="ps-3">
                                                            {index +
                                                                1}
                                                        </td>

                                                        <td>
                                                            <div className="fw-semibold">
                                                                {
                                                                    memberName
                                                                }
                                                            </div>

                                                            {memberEmail && (
                                                                <small className="text-muted">
                                                                    {
                                                                        memberEmail
                                                                    }
                                                                </small>
                                                            )}
                                                        </td>

                                                        <td>
                                                            {
                                                                bookTitle
                                                            }
                                                        </td>

                                                        <td>
                                                            {Number(
                                                                available
                                                            ) >
                                                            0 ? (
                                                                <span className="badge bg-success">
                                                                    {
                                                                        available
                                                                    }{" "}
                                                                    available
                                                                </span>
                                                            ) : (
                                                                <span className="badge bg-danger">
                                                                    Unavailable
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td>
                                                            {
                                                                requestedAt
                                                            }
                                                        </td>

                                                        <td>

                                                            <div className="d-flex flex-wrap gap-2">

                                                                <button
                                                                    className="btn btn-sm btn-success"
                                                                    disabled={
                                                                        approving ||
                                                                        rejecting ||
                                                                        Number(
                                                                            available
                                                                        ) <=
                                                                            0
                                                                    }
                                                                    onClick={() =>
                                                                        handleRequestAction(
                                                                            item,
                                                                            "approve"
                                                                        )
                                                                    }
                                                                >
                                                                    {approving
                                                                        ? "Approving..."
                                                                        : "✓ Approve"}
                                                                </button>

                                                                <button
                                                                    className="btn btn-sm btn-outline-danger"
                                                                    disabled={
                                                                        approving ||
                                                                        rejecting
                                                                    }
                                                                    onClick={() =>
                                                                        handleRequestAction(
                                                                            item,
                                                                            "reject"
                                                                        )
                                                                    }
                                                                >
                                                                    {rejecting
                                                                        ? "Rejecting..."
                                                                        : "✕ Reject"}
                                                                </button>

                                                            </div>

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
            )}

            {/* =================================================
                FILTERS
            ================================================= */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body">

                    <form
                        onSubmit={
                            handleSearch
                        }
                    >

                        <div className="row g-3">

                            <div className="col-lg-4">

                                <label className="form-label fw-semibold">
                                    Search
                                </label>

                                <div className="input-group">

                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Book, ISBN, member, email..."
                                        value={
                                            search
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setSearch(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />

                                    <button
                                        className="btn btn-primary"
                                        type="submit"
                                    >
                                        🔍 Search
                                    </button>

                                </div>

                            </div>

                            <div className="col-md-4 col-lg-2">

                                <label className="form-label fw-semibold">
                                    Status
                                </label>

                                <select
                                    className="form-select"
                                    value={
                                        statusFilter
                                    }
                                    onChange={
                                        handleStatusChange
                                    }
                                >
                                    <option value="">
                                        All statuses
                                    </option>

                                    <option value="borrowed">
                                        Borrowed
                                    </option>

                                    <option value="overdue">
                                        Overdue
                                    </option>

                                    <option value="return_requested">
                                        Return Requested
                                    </option>

                                    <option value="returned">
                                        Returned
                                    </option>

                                    <option value="lost">
                                        Lost
                                    </option>
                                </select>

                            </div>

                            <div className="col-md-4 col-lg-3">

                                <label className="form-label fw-semibold">
                                    Book
                                </label>

                                <select
                                    className="form-select"
                                    value={
                                        bookFilter
                                    }
                                    onChange={
                                        handleBookChange
                                    }
                                >

                                    <option value="">
                                        All books
                                    </option>

                                    {books.map(
                                        (book) => (
                                            <option
                                                key={
                                                    book.id
                                                }
                                                value={
                                                    book.id
                                                }
                                            >
                                                {
                                                    book.title
                                                }
                                            </option>
                                        )
                                    )}

                                </select>

                            </div>

                            <div className="col-md-4 col-lg-3">

                                <label className="form-label fw-semibold">
                                    Member
                                </label>

                                <select
                                    className="form-select"
                                    value={
                                        memberFilter
                                    }
                                    onChange={
                                        handleMemberChange
                                    }
                                >

                                    <option value="">
                                        All members
                                    </option>

                                    {members.map(
                                        (member) => (
                                            <option
                                                key={
                                                    member.id
                                                }
                                                value={
                                                    member.id
                                                }
                                            >
                                                {
                                                    member.name
                                                }
                                            </option>
                                        )
                                    )}

                                </select>

                            </div>

                        </div>

                        <div className="row mt-3">

                            <div className="col-md-4">

                                <label className="form-label fw-semibold">
                                    Order By
                                </label>

                                <select
                                    className="form-select"
                                    value={
                                        ordering
                                    }
                                    onChange={
                                        handleOrderingChange
                                    }
                                >
                                    <option value="-borrow_date">
                                        Newest borrowed
                                    </option>

                                    <option value="borrow_date">
                                        Oldest borrowed
                                    </option>

                                    <option value="due_date">
                                        Due date
                                    </option>

                                    <option value="-due_date">
                                        Latest due date
                                    </option>

                                    <option value="status">
                                        Status
                                    </option>

                                    <option value="book__title">
                                        Book title
                                    </option>

                                    <option value="member__name">
                                        Member name
                                    </option>
                                </select>

                            </div>

                        </div>

                    </form>

                </div>

            </div>

            {/* =================================================
                ACTIVE FILTERS
            ================================================= */}

            {(search.trim() ||
                statusFilter ||
                bookFilter ||
                memberFilter) && (

                <div className="alert alert-light border mb-4">

                    <div className="d-flex flex-wrap align-items-center gap-2">

                        <strong>
                            Active filters:
                        </strong>

                        {search.trim() && (
                            <span className="badge bg-primary">
                                Search:{" "}
                                {search.trim()}
                            </span>
                        )}

                        {statusFilter && (
                            <span className="badge bg-secondary">
                                Status:{" "}
                                {statusFilter}
                            </span>
                        )}

                        {bookFilter && (
                            <span className="badge bg-secondary">
                                Book filter active
                            </span>
                        )}

                        {memberFilter && (
                            <span className="badge bg-secondary">
                                Member filter active
                            </span>
                        )}

                        <button
                            type="button"
                            className="btn btn-sm btn-link text-decoration-none ms-auto"
                            onClick={
                                handleClearFilters
                            }
                        >
                            Clear all
                        </button>

                    </div>

                </div>
            )}

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (

                <div className="alert alert-danger">

                    <div className="d-flex gap-3">

                        <div className="fs-4">
                            ⚠️
                        </div>

                        <div className="flex-grow-1">

                            <h6 className="fw-bold">
                                Unable to load loans
                            </h6>

                            <pre
                                className="mb-0"
                                style={{
                                    whiteSpace:
                                        "pre-wrap",
                                    wordBreak:
                                        "break-word",
                                }}
                            >
                                {error}
                            </pre>

                            <button
                                className="btn btn-outline-danger btn-sm mt-3"
                                onClick={() =>
                                    fetchLoans(
                                        buildFilterUrl()
                                    )
                                }
                            >
                                🔄 Try Again
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {/* =================================================
                LOADING
            ================================================= */}

            {loading && (

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div
                            className="spinner-border text-primary mb-3"
                            role="status"
                        />

                        <h6 className="fw-semibold">
                            Loading loans...
                        </h6>

                        <p className="text-muted mb-0">
                            Please wait while we fetch
                            the latest loan information.
                        </p>

                    </div>

                </div>
            )}

            {/* =================================================
                EMPTY
            ================================================= */}

            {!loading &&
                !error &&
                loans.length === 0 && (

                    <div className="card border-0 shadow-sm">

                        <div className="card-body text-center py-5">

                            <div className="display-4 mb-3">
                                📚
                            </div>

                            <h5 className="fw-bold">
                                No loans found
                            </h5>

                            <p className="text-muted mb-3">
                                No loans match your current
                                search or filters.
                            </p>

                            {(search.trim() ||
                                statusFilter ||
                                bookFilter ||
                                memberFilter) && (

                                <button
                                    className="btn btn-outline-primary"
                                    onClick={
                                        handleClearFilters
                                    }
                                >
                                    Clear Filters
                                </button>
                            )}

                        </div>

                    </div>
                )}

            {/* =================================================
                LOANS TABLE
            ================================================= */}

            {!loading &&
                !error &&
                loans.length > 0 && (

                    <div className="card border-0 shadow-sm">

                        <div className="card-header bg-white py-3">

                            <div className="d-flex justify-content-between align-items-center">

                                <div>
                                    <h5 className="fw-bold mb-1">
                                        Loan Records
                                    </h5>

                                    <small className="text-muted">
                                        Manage borrowing,
                                        returns and loan status.
                                    </small>
                                </div>

                                <span className="badge bg-primary-subtle text-primary px-3 py-2">
                                    {loans.length} shown
                                </span>

                            </div>

                        </div>

                        <div className="card-body p-0">

                            <div className="table-responsive">

                                <table className="table table-hover align-middle mb-0">

                                    <thead className="table-light">

                                        <tr>

                                            <th className="ps-3">
                                                #
                                            </th>

                                            <th>
                                                Book
                                            </th>

                                            <th>
                                                Member
                                            </th>

                                            <th>
                                                Status
                                            </th>

                                            <th>
                                                Borrowed
                                            </th>

                                            <th>
                                                Due
                                            </th>

                                            <th>
                                                Returned
                                            </th>

                                            {canManageLoans && (
                                                <th>
                                                    Actions
                                                </th>
                                            )}

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

                                                const member =
                                                    getMemberName(
                                                        loan
                                                    );

                                                const canReturn =
                                                    [
                                                        "borrowed",
                                                        "overdue",
                                                        "return_requested",
                                                    ].includes(
                                                        loan.status
                                                    );

                                                return (
                                                    <tr
                                                        key={
                                                            loan.id
                                                        }
                                                    >

                                                        <td className="ps-3 text-muted">
                                                            {
                                                                index +
                                                                1
                                                            }
                                                        </td>

                                                        <td>

                                                            <div className="fw-semibold">
                                                                {
                                                                    title
                                                                }
                                                            </div>

                                                            {loan.book_isbn && (
                                                                <small className="text-muted">
                                                                    ISBN:{" "}
                                                                    {
                                                                        loan.book_isbn
                                                                    }
                                                                </small>
                                                            )}

                                                        </td>

                                                        <td>

                                                            <div className="fw-semibold">
                                                                {
                                                                    member
                                                                }
                                                            </div>

                                                            {loan.member_email && (
                                                                <small className="text-muted">
                                                                    {
                                                                        loan.member_email
                                                                    }
                                                                </small>
                                                            )}

                                                        </td>

                                                        <td>
                                                            {
                                                                getStatusBadge(
                                                                    loan.status
                                                                )
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                formatDate(
                                                                    loan.borrow_date
                                                                )
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                formatDate(
                                                                    loan.due_date
                                                                )
                                                            }
                                                        </td>

                                                        <td>

                                                            {loan.return_date ? (
                                                                <span className="text-success">
                                                                    {
                                                                        formatDate(
                                                                            loan.return_date
                                                                        )
                                                                    }
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted">
                                                                    Not returned
                                                                </span>
                                                            )}

                                                        </td>

                                                        {canManageLoans && (
                                                            <td>

                                                                {canReturn ? (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-success"
                                                                        onClick={() =>
                                                                            openReturnModal(
                                                                                loan
                                                                            )
                                                                        }
                                                                    >
                                                                        ↩ Process Return
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-muted small">
                                                                        No action
                                                                    </span>
                                                                )}

                                                            </td>
                                                        )}

                                                    </tr>
                                                );
                                            }
                                        )}

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    </div>
                )}

            {/* =================================================
                PAGINATION
            ================================================= */}

            {!loading &&
                !error &&
                (previousPage ||
                    nextPage) && (

                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 mt-4">

                        <button
                            type="button"
                            className="btn btn-outline-primary"
                            disabled={
                                !previousPage ||
                                loading
                            }
                            onClick={() =>
                                fetchLoans(
                                    previousPage
                                )
                            }
                        >
                            ← Previous
                        </button>

                        <span className="text-muted">
                            Showing{" "}
                            <strong>
                                {loans.length}
                            </strong>{" "}
                            of{" "}
                            <strong>
                                {totalCount}
                            </strong>
                        </span>

                        <button
                            type="button"
                            className="btn btn-outline-primary"
                            disabled={
                                !nextPage ||
                                loading
                            }
                            onClick={() =>
                                fetchLoans(
                                    nextPage
                                )
                            }
                        >
                            Next →
                        </button>

                    </div>
                )}

            {/* =================================================
                ISSUE BOOK MODAL
            ================================================= */}

            {showModal && (

                <>

                    <div
                        className="modal fade show d-block"
                        tabIndex="-1"
                        role="dialog"
                        aria-modal="true"
                    >

                        <div className="modal-dialog modal-dialog-centered">

                            <div className="modal-content">

                                <div className="modal-header">

                                    <div>

                                        <h5 className="modal-title fw-bold mb-1">
                                            📚 Issue Book
                                        </h5>

                                        <small className="text-muted">
                                            Issue an available book
                                            to a member.
                                        </small>

                                    </div>

                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={
                                            closeModal
                                        }
                                        disabled={
                                            saving
                                        }
                                    />

                                </div>

                                <form
                                    onSubmit={
                                        handleSubmit
                                    }
                                >

                                    <div className="modal-body">

                                        {formError && (

                                            <div className="alert alert-danger">

                                                ⚠️{" "}
                                                {formError}

                                            </div>
                                        )}

                                        <div className="mb-3">

                                            <label className="form-label fw-semibold">
                                                Book
                                            </label>

                                            <select
                                                name="book"
                                                className="form-select"
                                                value={
                                                    formData.book
                                                }
                                                onChange={
                                                    handleFormChange
                                                }
                                                disabled={
                                                    saving
                                                }
                                                required
                                            >

                                                <option value="">
                                                    Select an available book
                                                </option>

                                                {books
                                                    .filter(
                                                        (
                                                            book
                                                        ) =>
                                                            Number(
                                                                book.available
                                                            ) >
                                                            0
                                                    )
                                                    .map(
                                                        (
                                                            book
                                                        ) => (
                                                            <option
                                                                key={
                                                                    book.id
                                                                }
                                                                value={
                                                                    book.id
                                                                }
                                                            >
                                                                {
                                                                    book.title
                                                                }{" "}
                                                                (
                                                                {
                                                                    book.available
                                                                }{" "}
                                                                available)
                                                            </option>
                                                        )
                                                    )}

                                            </select>

                                        </div>

                                        <div className="mb-3">

                                            <label className="form-label fw-semibold">
                                                Member
                                            </label>

                                            <select
                                                name="member"
                                                className="form-select"
                                                value={
                                                    formData.member
                                                }
                                                onChange={
                                                    handleFormChange
                                                }
                                                disabled={
                                                    saving
                                                }
                                                required
                                            >

                                                <option value="">
                                                    Select member
                                                </option>

                                                {members.map(
                                                    (
                                                        member
                                                    ) => (
                                                        <option
                                                            key={
                                                                member.id
                                                            }
                                                            value={
                                                                member.id
                                                            }
                                                        >
                                                            {
                                                                member.name
                                                            }
                                                        </option>
                                                    )
                                                )}

                                            </select>

                                        </div>

                                        <div className="alert alert-info mb-0">

                                            <strong>
                                                Borrowing fee:
                                            </strong>{" "}
                                            ₹0. Issuing a book
                                            is free.

                                        </div>

                                    </div>

                                    <div className="modal-footer">

                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={
                                                closeModal
                                            }
                                            disabled={
                                                saving
                                            }
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={
                                                saving
                                            }
                                        >
                                            {saving ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" />
                                                    Issuing...
                                                </>
                                            ) : (
                                                "Issue Book"
                                            )}
                                        </button>

                                    </div>

                                </form>

                            </div>

                        </div>

                    </div>

                    <div className="modal-backdrop fade show" />

                </>
            )}

            {/* =================================================
                PROCESS RETURN MODAL
            ================================================= */}

            {showReturnModal &&
                selectedLoan && (

                    <>

                        <div
                            className="modal fade show d-block"
                            tabIndex="-1"
                            role="dialog"
                            aria-modal="true"
                        >

                            <div className="modal-dialog modal-dialog-centered">

                                <div className="modal-content">

                                    <div className="modal-header">

                                        <div>

                                            <h5 className="modal-title fw-bold mb-1">
                                                ↩ Process Book Return
                                            </h5>

                                            <small className="text-muted">
                                                {
                                                    getBookTitle(
                                                        selectedLoan
                                                    )
                                                }
                                            </small>

                                        </div>

                                        <button
                                            type="button"
                                            className="btn-close"
                                            onClick={
                                                closeReturnModal
                                            }
                                            disabled={
                                                returnSaving
                                            }
                                        />

                                    </div>

                                    <form
                                        onSubmit={
                                            handleProcessReturn
                                        }
                                    >

                                        <div className="modal-body">

                                            {returnError && (
                                                <div className="alert alert-danger">
                                                    ⚠️{" "}
                                                    {
                                                        returnError
                                                    }
                                                </div>
                                            )}

                                            {returnMessage && (
                                                <div className="alert alert-success">
                                                    ✅{" "}
                                                    {
                                                        returnMessage
                                                    }
                                                </div>
                                            )}

                                            <div className="mb-3">

                                                <label className="form-label fw-semibold">
                                                    Book Condition
                                                </label>

                                                <select
                                                    className="form-select"
                                                    value={
                                                        returnCondition
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setReturnCondition(
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    disabled={
                                                        returnSaving
                                                    }
                                                >

                                                    <option value="normal">
                                                        Normal
                                                    </option>

                                                    <option value="damaged">
                                                        Damaged
                                                    </option>

                                                    <option value="lost">
                                                        Lost
                                                    </option>

                                                </select>

                                            </div>

                                            {returnCondition ===
                                                "damaged" && (

                                                <div className="mb-3">

                                                    <label className="form-label fw-semibold">
                                                        Damage Fee (₹)
                                                    </label>

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="form-control"
                                                        value={
                                                            damageFee
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            setDamageFee(
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        placeholder="Enter damage fee"
                                                        disabled={
                                                            returnSaving
                                                        }
                                                    />

                                                </div>
                                            )}

                                            {returnCondition ===
                                                "lost" && (

                                                <div className="mb-3">

                                                    <label className="form-label fw-semibold">
                                                        Lost Book Fee (₹)
                                                    </label>

                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="form-control"
                                                        value={
                                                            lostFee
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            setLostFee(
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        placeholder="Enter lost-book fee"
                                                        disabled={
                                                            returnSaving
                                                        }
                                                    />

                                                </div>
                                            )}

                                            <div className="mb-3">

                                                <label className="form-label fw-semibold">
                                                    Description
                                                </label>

                                                <textarea
                                                    className="form-control"
                                                    rows="3"
                                                    value={
                                                        returnDescription
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setReturnDescription(
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    placeholder="Optional notes about the return..."
                                                    disabled={
                                                        returnSaving
                                                    }
                                                />

                                            </div>

                                            <div className="alert alert-info mb-0">

                                                <strong>
                                                    Late fee:
                                                </strong>{" "}
                                                Automatically
                                                calculated at
                                                ₹10 per overdue
                                                day.

                                            </div>

                                        </div>

                                        <div className="modal-footer">

                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={
                                                    closeReturnModal
                                                }
                                                disabled={
                                                    returnSaving
                                                }
                                            >
                                                Cancel
                                            </button>

                                            <button
                                                type="submit"
                                                className="btn btn-success"
                                                disabled={
                                                    returnSaving
                                                }
                                            >
                                                {returnSaving ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    "✓ Process Return"
                                                )}
                                            </button>

                                        </div>

                                    </form>

                                </div>

                            </div>

                        </div>

                        <div className="modal-backdrop fade show" />

                    </>
                )}

        </div>
    );
}

export default Loans;