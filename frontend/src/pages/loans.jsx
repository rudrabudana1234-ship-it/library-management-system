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
    // MODAL
    // =====================================================

    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        book: "",
        member: "",
        due_date: "",
    });

    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    // =====================================================
    // ROLE
    // =====================================================

    const canManageLoans =
        user?.role === "admin" ||
        user?.role === "librarian";

    const canEditLoans =
        user?.role === "admin";

    // =====================================================
    // FETCH LOANS
    // =====================================================

    const fetchLoans = async (url = "loans/") => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get(url);

            console.log(
                "LOAN API RESPONSE:",
                response.data
            );

            if (Array.isArray(response.data.results)) {
                setLoans(response.data.results);

                setNextPage(response.data.next);
                setPreviousPage(response.data.previous);

                setTotalCount(
                    response.data.count || 0
                );
            } else if (Array.isArray(response.data)) {
                setLoans(response.data);

                setNextPage(null);
                setPreviousPage(null);

                setTotalCount(
                    response.data.length
                );
            } else {
                setLoans([]);
                setNextPage(null);
                setPreviousPage(null);
                setTotalCount(0);
            }

        } catch (error) {
            console.error(
                "LOAN API ERROR:",
                error.response?.data ||
                error.message
            );

            setError(
                JSON.stringify(
                    error.response?.data ||
                    error.message,
                    null,
                    2
                )
            );

            setLoans([]);

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

            if (Array.isArray(response.data.results)) {
                setBooks(response.data.results);
            } else if (Array.isArray(response.data)) {
                setBooks(response.data);
            } else {
                setBooks([]);
            }

        } catch (error) {
            console.error(
                "BOOK API ERROR:",
                error.response?.data ||
                error.message
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

            if (Array.isArray(response.data.results)) {
                setMembers(response.data.results);
            } else if (Array.isArray(response.data)) {
                setMembers(response.data);
            } else {
                setMembers([]);
            }

        } catch (error) {
            console.error(
                "MEMBER API ERROR:",
                error.response?.data ||
                error.message
            );
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
        }
    }, [canManageLoans]);

    // =====================================================
    // BUILD FILTER URL
    // =====================================================

    const buildFilterUrl = () => {
        const params = new URLSearchParams();

        if (search.trim()) {
            params.append(
                "search",
                search.trim()
            );
        }

        if (statusFilter) {
            params.append(
                "status",
                statusFilter
            );
        }

        if (bookFilter) {
            params.append(
                "book",
                bookFilter
            );
        }

        if (memberFilter) {
            params.append(
                "member",
                memberFilter
            );
        }

        if (ordering) {
            params.append(
                "ordering",
                ordering
            );
        }

        const queryString =
            params.toString();

        return queryString
            ? `loans/?${queryString}`
            : "loans/";
    };

    // =====================================================
    // APPLY SEARCH
    // =====================================================

    const handleSearch = (event) => {
        event.preventDefault();

        fetchLoans(
            buildFilterUrl()
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
            buildUrlWithChanges({
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
            buildUrlWithChanges({
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
            buildUrlWithChanges({
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
            buildUrlWithChanges({
                ordering: value,
            })
        );
    };

    // =====================================================
    // BUILD URL WITH ONE CHANGED FILTER
    // =====================================================

    const buildUrlWithChanges = (changes = {}) => {
        const params = new URLSearchParams();

        const currentSearch =
            changes.search !== undefined
                ? changes.search
                : search;

        const currentStatus =
            changes.status !== undefined
                ? changes.status
                : statusFilter;

        const currentBook =
            changes.book !== undefined
                ? changes.book
                : bookFilter;

        const currentMember =
            changes.member !== undefined
                ? changes.member
                : memberFilter;

        const currentOrdering =
            changes.ordering !== undefined
                ? changes.ordering
                : ordering;

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
    // OPEN ISSUE MODAL
    // =====================================================

    const handleAddLoan = () => {
        setFormData({
            book: "",
            member: "",
            due_date: "",
        });

        setFormError("");
        setShowModal(true);
    };

    // =====================================================
    // CLOSE MODAL
    // =====================================================

    const closeModal = () => {
        if (saving) {
            return;
        }

        setShowModal(false);

        setFormData({
            book: "",
            member: "",
            due_date: "",
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
            previous => ({
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

        if (!formData.due_date) {
            setFormError(
                "Please select a due date."
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
                    due_date:
                        formData.due_date,
                }
            );

            setShowModal(false);

            setFormData({
                book: "",
                member: "",
                due_date: "",
            });

            setFormError("");

            await fetchLoans(
                buildFilterUrl()
            );

        } catch (error) {
            console.error(
                "CREATE LOAN ERROR:",
                error.response?.data ||
                error.message
            );

            setFormError(
                JSON.stringify(
                    error.response?.data ||
                    error.message,
                    null,
                    2
                )
            );

        } finally {
            setSaving(false);
        }
    };

    // =====================================================
    // RETURN BOOK
    // =====================================================

    const handleReturnBook = async (loan) => {
        const confirmed =
            window.confirm(
                `Return "${loan.book_title || loan.book}"?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setError("");

            await api.post(
                `loans/${loan.id}/return_book/`
            );

            await fetchLoans(
                buildFilterUrl()
            );

        } catch (error) {
            console.error(
                "RETURN BOOK ERROR:",
                error.response?.data ||
                error.message
            );

            setError(
                JSON.stringify(
                    error.response?.data ||
                    error.message,
                    null,
                    2
                )
            );
        }
    };

    // =====================================================
    // DELETE LOAN
    // =====================================================

    const handleDeleteLoan = async (loan) => {
        const confirmed =
            window.confirm(
                "Are you sure you want to delete this loan?"
            );

        if (!confirmed) {
            return;
        }

        try {
            setError("");

            await api.delete(
                `loans/${loan.id}/`
            );

            await fetchLoans(
                buildFilterUrl()
            );

        } catch (error) {
            console.error(
                "DELETE LOAN ERROR:",
                error.response?.data ||
                error.message
            );

            setError(
                JSON.stringify(
                    error.response?.data ||
                    error.message,
                    null,
                    2
                )
            );
        }
    };

    // =====================================================
    // STATUS BADGE
    // =====================================================

    const getStatusBadge = (status) => {
        if (status === "returned") {
            return (
                <span className="badge bg-success">
                    Returned
                </span>
            );
        }

        if (status === "overdue") {
            return (
                <span className="badge bg-danger">
                    Overdue
                </span>
            );
        }

        return (
            <span className="badge bg-warning text-dark">
                Borrowed
            </span>
        );
    };

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
                        Search, filter and manage library loans.
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2">

                    <span className="badge bg-primary fs-6">
                        {totalCount} Loans
                    </span>

                    {canManageLoans && (
                        <button
                            className="btn btn-primary"
                            onClick={handleAddLoan}
                        >
                            + Issue Book
                        </button>
                    )}

                </div>

            </div>

            {/* =================================================
                SEARCH / FILTER CARD
            ================================================= */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body">

                    <form
                        onSubmit={handleSearch}
                        className="row g-3"
                    >

                        {/* SEARCH */}

                        <div className="col-lg-6">

                            <label className="form-label fw-semibold">
                                Search Loans
                            </label>

                            <div className="input-group">

                                <span className="input-group-text">
                                    🔍
                                </span>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Book, ISBN, member, email, phone or status..."
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(
                                            event.target.value
                                        )
                                    }
                                />

                            </div>

                            <small className="text-muted">
                                Search using the first few characters or a complete value.
                            </small>

                        </div>

                        {/* STATUS */}

                        <div className="col-lg-3">

                            <label className="form-label fw-semibold">
                                Status
                            </label>

                            <select
                                className="form-select"
                                value={statusFilter}
                                onChange={
                                    handleStatusChange
                                }
                            >

                                <option value="">
                                    All Statuses
                                </option>

                                <option value="borrowed">
                                    Borrowed
                                </option>

                                <option value="returned">
                                    Returned
                                </option>

                                <option value="overdue">
                                    Overdue
                                </option>

                            </select>

                        </div>

                        {/* ORDERING */}

                        <div className="col-lg-3">

                            <label className="form-label fw-semibold">
                                Sort By
                            </label>

                            <select
                                className="form-select"
                                value={ordering}
                                onChange={
                                    handleOrderingChange
                                }
                            >

                                <option value="-borrow_date">
                                    Newest Borrowed
                                </option>

                                <option value="borrow_date">
                                    Oldest Borrowed
                                </option>

                                <option value="-due_date">
                                    Latest Due Date
                                </option>

                                <option value="due_date">
                                    Earliest Due Date
                                </option>

                                <option value="-return_date">
                                    Recently Returned
                                </option>

                                <option value="return_date">
                                    Oldest Returned
                                </option>

                                <option value="book__title">
                                    Book A-Z
                                </option>

                                <option value="-book__title">
                                    Book Z-A
                                </option>

                                <option value="member__name">
                                    Member A-Z
                                </option>

                                <option value="-member__name">
                                    Member Z-A
                                </option>

                                <option value="status">
                                    Status
                                </option>

                            </select>

                        </div>

                        {/* BOOK FILTER */}

                        <div className="col-lg-5">

                            <label className="form-label fw-semibold">
                                Book
                            </label>

                            <select
                                className="form-select"
                                value={bookFilter}
                                onChange={
                                    handleBookChange
                                }
                            >

                                <option value="">
                                    All Books
                                </option>

                                {books.map(
                                    book => (
                                        <option
                                            key={book.id}
                                            value={book.id}
                                        >
                                            {book.title}
                                            {book.isbn
                                                ? ` (${book.isbn})`
                                                : ""}
                                        </option>
                                    )
                                )}

                            </select>

                        </div>

                        {/* MEMBER FILTER */}

                        <div className="col-lg-4">

                            <label className="form-label fw-semibold">
                                Member
                            </label>

                            <select
                                className="form-select"
                                value={memberFilter}
                                onChange={
                                    handleMemberChange
                                }
                            >

                                <option value="">
                                    All Members
                                </option>

                                {members.map(
                                    member => (
                                        <option
                                            key={member.id}
                                            value={member.id}
                                        >
                                            {member.name}
                                            {member.email
                                                ? ` - ${member.email}`
                                                : ""}
                                        </option>
                                    )
                                )}

                            </select>

                        </div>

                        {/* BUTTONS */}

                        <div className="col-lg-3 d-flex align-items-end gap-2">

                            <button
                                type="submit"
                                className="btn btn-primary flex-grow-1"
                                disabled={loading}
                            >
                                🔍 Search
                            </button>

                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={
                                    handleClearFilters
                                }
                                disabled={loading}
                            >
                                Clear
                            </button>

                        </div>

                    </form>

                </div>

            </div>

            {/* =================================================
                ACTIVE FILTER SUMMARY
            ================================================= */}

            {(search.trim() ||
                statusFilter ||
                bookFilter ||
                memberFilter) && (

                <div className="alert alert-light border d-flex flex-wrap align-items-center gap-2 mb-4">

                    <strong>
                        Active filters:
                    </strong>

                    {search.trim() && (
                        <span className="badge bg-primary">
                            Search: {search.trim()}
                        </span>
                    )}

                    {statusFilter && (
                        <span className="badge bg-secondary">
                            Status: {statusFilter}
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

                </div>
            )}

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
                <div
                    className="alert alert-danger"
                    role="alert"
                >

                    <h6 className="fw-bold">
                        Unable to complete request
                    </h6>

                    <pre className="mb-0">
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
            )}

            {/* =================================================
                LOADING
            ================================================= */}

            {loading && (
                <div className="text-center py-5">

                    <div
                        className="spinner-border text-primary"
                        role="status"
                    >
                        <span className="visually-hidden">
                            Loading...
                        </span>
                    </div>

                    <p className="text-muted mt-3 mb-0">
                        Loading loans...
                    </p>

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

                            <div className="fs-1 mb-3">
                                📚
                            </div>

                            <h5 className="fw-bold">
                                No loans found
                            </h5>

                            <p className="text-muted mb-3">
                                No loans match your current search or filters.
                            </p>

                            <button
                                className="btn btn-outline-primary"
                                onClick={
                                    handleClearFilters
                                }
                            >
                                Clear Filters
                            </button>

                        </div>

                    </div>
                )}

            {/* =================================================
                LOANS TABLE
            ================================================= */}

            {!loading &&
                loans.length > 0 && (

                    <div className="card border-0 shadow-sm">

                        <div className="card-header bg-white py-3">

                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">

                                <h5 className="fw-bold mb-0">
                                    Loans List
                                </h5>

                                <span className="text-muted">
                                    Showing {loans.length} of {totalCount} loans
                                </span>

                            </div>

                        </div>

                        <div className="card-body p-0">

                            <div className="table-responsive">

                                <table className="table table-hover align-middle mb-0">

                                    <thead className="table-dark">

                                        <tr>

                                            <th>#</th>
                                            <th>Book</th>
                                            <th>Member</th>
                                            <th>Status</th>
                                            <th>Borrowed</th>
                                            <th>Due Date</th>
                                            <th>Returned</th>

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
                                            ) => (

                                                <tr
                                                    key={
                                                        loan.id
                                                    }
                                                >

                                                    <td className="text-muted">
                                                        {index + 1}
                                                    </td>

                                                    <td>
                                                        <div className="fw-semibold">
                                                            {loan.book_title ||
                                                                loan.book}
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
                                                        <div>
                                                            {loan.member_name ||
                                                                loan.member}
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
                                                        {getStatusBadge(
                                                            loan.status
                                                        )}
                                                    </td>

                                                    <td>
                                                        {loan.borrow_date}
                                                    </td>

                                                    <td>
                                                        {loan.due_date}
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

                                                    {canManageLoans && (
                                                        <td>

                                                            <div className="d-flex flex-wrap gap-2">

                                                                {loan.status !==
                                                                    "returned" && (
                                                                    <button
                                                                        className="btn btn-sm btn-outline-success"
                                                                        onClick={() =>
                                                                            handleReturnBook(
                                                                                loan
                                                                            )
                                                                        }
                                                                    >
                                                                        ↩️ Return
                                                                    </button>
                                                                )}

                                                                {canEditLoans && (
                                                                    <button
                                                                        className="btn btn-sm btn-outline-danger"
                                                                        onClick={() =>
                                                                            handleDeleteLoan(
                                                                                loan
                                                                            )
                                                                        }
                                                                    >
                                                                        🗑️ Delete
                                                                    </button>
                                                                )}

                                                            </div>

                                                        </td>
                                                    )}

                                                </tr>

                                            )
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
                            Showing {loans.length} results
                        </span>

                        <button
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

                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    role="dialog"
                >

                    <div className="modal-dialog modal-dialog-centered">

                        <div className="modal-content">

                            <div className="modal-header">

                                <h5 className="modal-title fw-bold">
                                    📚 Issue Book
                                </h5>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={closeModal}
                                    disabled={saving}
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

                                            <pre className="mb-0">
                                                {formError}
                                            </pre>

                                        </div>
                                    )}

                                    {/* BOOK */}

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
                                        >

                                            <option value="">
                                                Select a book
                                            </option>

                                            {books.map(
                                                book => (

                                                    <option
                                                        key={
                                                            book.id
                                                        }
                                                        value={
                                                            book.id
                                                        }
                                                        disabled={
                                                            book.available <=
                                                            0
                                                        }
                                                    >
                                                        {book.title}
                                                        {" "}
                                                        (
                                                        {
                                                            book.available
                                                        }
                                                        {" "}
                                                        available)
                                                    </option>

                                                )
                                            )}

                                        </select>

                                    </div>

                                    {/* MEMBER */}

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
                                        >

                                            <option value="">
                                                Select a member
                                            </option>

                                            {members.map(
                                                member => (

                                                    <option
                                                        key={
                                                            member.id
                                                        }
                                                        value={
                                                            member.id
                                                        }
                                                    >
                                                        {member.name}
                                                        {" - "}
                                                        {member.email}
                                                    </option>

                                                )
                                            )}

                                        </select>

                                    </div>

                                    {/* DUE DATE */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Due Date
                                        </label>

                                        <input
                                            type="date"
                                            name="due_date"
                                            className="form-control"
                                            value={
                                                formData.due_date
                                            }
                                            onChange={
                                                handleFormChange
                                            }
                                            disabled={
                                                saving
                                            }
                                        />

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
                                                <span
                                                    className="spinner-border spinner-border-sm me-2"
                                                    role="status"
                                                />

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
            )}

            {/* =================================================
                BACKDROP
            ================================================= */}

            {showModal && (
                <div
                    className="modal-backdrop fade show"
                    onClick={closeModal}
                />
            )}

        </div>
    );
}

export default Loans;