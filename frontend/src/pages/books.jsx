import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/authcontext";

function Books() {
    const { user } = useAuth();

    const [books, setBooks] = useState([]);
    const [authors, setAuthors] = useState([]);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    // Pagination
    const [nextPage, setNextPage] = useState(null);
    const [previousPage, setPreviousPage] = useState(null);

    // Search & Ordering
    const [search, setSearch] = useState("");
    const [ordering, setOrdering] = useState("");

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingBook, setEditingBook] = useState(null);

    // Form
    const [formData, setFormData] = useState({
        title: "",
        author: "",
        isbn: "",
        quantity: "",
    });

    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    // =========================
    // ROLE CHECK
    // =========================

    const canManageBooks =
        user?.role === "admin" ||
        user?.role === "librarian";

    // =========================
    // FETCH BOOKS
    // =========================

    const fetchBooks = async (url = "books/") => {
        try {
            setLoading(true);
            setError("");

            let requestUrl = url;

            /*
             * Search and ordering are added only
             * when fetching the first page.
             *
             * Pagination URLs already contain
             * their own query parameters.
             */

            if (url === "books/") {
                const params = new URLSearchParams();

                if (search.trim()) {
                    params.append(
                        "search",
                        search.trim()
                    );
                }

                if (ordering) {
                    params.append(
                        "ordering",
                        ordering
                    );
                }

                const queryString = params.toString();

                if (queryString) {
                    requestUrl = `books/?${queryString}`;
                }
            }

            const response = await api.get(requestUrl);

            console.log(
                "BOOK API RESPONSE:",
                response.data
            );

            // Paginated response
            if (
                response.data &&
                Array.isArray(response.data.results)
            ) {
                setBooks(response.data.results);

                setNextPage(
                    response.data.next
                );

                setPreviousPage(
                    response.data.previous
                );
            }

            // Non-paginated response
            else if (
                Array.isArray(response.data)
            ) {
                setBooks(response.data);

                setNextPage(null);
                setPreviousPage(null);
            }

            // Invalid response
            else {
                setBooks([]);

                setNextPage(null);
                setPreviousPage(null);
            }

        } catch (error) {
            console.error(
                "BOOK API ERROR:",
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

            setBooks([]);

        } finally {
            setLoading(false);
        }
    };

    // =========================
    // FETCH AUTHORS
    // =========================

    const fetchAuthors = async () => {
        try {
            const response = await api.get(
                "authors/"
            );

            if (
                response.data &&
                Array.isArray(
                    response.data.results
                )
            ) {
                setAuthors(
                    response.data.results
                );
            }

            else if (
                Array.isArray(response.data)
            ) {
                setAuthors(response.data);
            }

            else {
                setAuthors([]);
            }

        } catch (error) {
            console.error(
                "AUTHOR API ERROR:",
                error.response?.data ||
                error.message
            );
        }
    };

    // =========================
    // INITIAL LOAD
    // =========================

    useEffect(() => {
        fetchBooks();

        if (canManageBooks) {
            fetchAuthors();
        }
    }, [canManageBooks]);

    // =========================
    // SEARCH
    // =========================

    const handleSearch = (event) => {
        event.preventDefault();

        fetchBooks();
    };

    // =========================
    // CLEAR SEARCH
    // =========================

    const handleClearSearch = () => {
        setSearch("");
        setOrdering("");

        /*
         * Directly fetch the default books list.
         */
        fetchBooks("books/");
    };

    // =========================
    // FORM HANDLING
    // =========================

    const handleChange = (event) => {
        const {
            name,
            value
        } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    // =========================
    // OPEN ADD MODAL
    // =========================

    const handleAddBook = () => {
        setEditingBook(null);

        setFormData({
            title: "",
            author: "",
            isbn: "",
            quantity: "",
        });

        setFormError("");
        setShowModal(true);
    };

    // =========================
    // OPEN EDIT MODAL
    // =========================

    const handleEditBook = (book) => {
        setEditingBook(book);

        setFormData({
            title: book.title || "",
            author: book.author || "",
            isbn: book.isbn || "",
            quantity: book.quantity ?? "",
        });

        setFormError("");
        setShowModal(true);
    };

    // =========================
    // CLOSE MODAL
    // =========================

    const closeModal = () => {
        if (saving) {
            return;
        }

        setShowModal(false);
        setEditingBook(null);
        setFormError("");
    };

    // =========================
    // ADD / EDIT BOOK
    // =========================

    const handleSubmit = async (event) => {
        event.preventDefault();

        setFormError("");

        // Frontend validation
        if (
            !formData.title.trim() ||
            !formData.author ||
            !formData.isbn.trim() ||
            formData.quantity === ""
        ) {
            setFormError(
                "Please fill in all fields."
            );

            return;
        }

        if (
            Number(formData.quantity) < 0
        ) {
            setFormError(
                "Quantity cannot be negative."
            );

            return;
        }

        const bookData = {
            title: formData.title.trim(),

            author: Number(
                formData.author
            ),

            isbn: formData.isbn.trim(),

            quantity: Number(
                formData.quantity
            ),
        };

        try {
            setSaving(true);

            if (editingBook) {
                await api.put(
                    `books/${editingBook.id}/`,
                    bookData
                );
            }

            else {
                await api.post(
                    "books/",
                    bookData
                );
            }

            setShowModal(false);
            setEditingBook(null);

            /*
             * Reload current search results
             * from the first page.
             */
            await fetchBooks();

        } catch (error) {
            console.error(
                "SAVE BOOK ERROR:",
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

    // =========================
    // DELETE BOOK
    // =========================

    const handleDeleteBook = async (book) => {
        const confirmed =
            window.confirm(
                `Are you sure you want to delete "${book.title}"?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setError("");

            await api.delete(
                `books/${book.id}/`
            );

            await fetchBooks();

        } catch (error) {
            console.error(
                "DELETE BOOK ERROR:",
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

    // =========================
    // PAGINATION
    // =========================

    const handleNextPage = () => {
        if (nextPage) {
            fetchBooks(nextPage);
        }
    };

    const handlePreviousPage = () => {
        if (previousPage) {
            fetchBooks(previousPage);
        }
    };

    // =========================
    // UI
    // =========================

    return (
        <div className="container py-4">

            {/* =========================
                PAGE HEADER
            ========================== */}

            <div className="d-flex justify-content-between align-items-center mb-4">

                <div>
                    <h1 className="fw-bold mb-1">
                        📚 Books
                    </h1>

                    <p className="text-muted mb-0">
                        Browse and manage the books
                        available in the library.
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">

                    <span className="badge bg-primary fs-6">
                        {books.length} Books
                    </span>

                    {canManageBooks && (
                        <button
                            className="btn btn-primary"
                            onClick={handleAddBook}
                        >
                            + Add Book
                        </button>
                    )}

                </div>

            </div>

            {/* =========================
                SEARCH + SORT
            ========================== */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body">

                    <form
                        onSubmit={handleSearch}
                        className="row g-3"
                    >

                        {/* Search */}

                        <div className="col-md-6">

                            <label className="form-label fw-semibold">
                                🔍 Search Books
                            </label>

                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by title, ISBN or author..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                            />

                        </div>

                        {/* Ordering */}

                        <div className="col-md-3">

                            <label className="form-label fw-semibold">
                                ↕️ Sort By
                            </label>

                            <select
                                className="form-select"
                                value={ordering}
                                onChange={(event) =>
                                    setOrdering(
                                        event.target.value
                                    )
                                }
                            >

                                <option value="">
                                    Default
                                </option>

                                <option value="title">
                                    Title A → Z
                                </option>

                                <option value="-title">
                                    Title Z → A
                                </option>

                                <option value="available">
                                    Available: Low → High
                                </option>

                                <option value="-available">
                                    Available: High → Low
                                </option>

                                <option value="created_at">
                                    Oldest Added
                                </option>

                                <option value="-created_at">
                                    Newest Added
                                </option>

                            </select>

                        </div>

                        {/* Buttons */}

                        <div className="col-md-3 d-flex align-items-end gap-2">

                            <button
                                type="submit"
                                className="btn btn-primary flex-grow-1"
                            >
                                🔍 Search
                            </button>

                            {(search || ordering) && (
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={
                                        handleClearSearch
                                    }
                                >
                                    Clear
                                </button>
                            )}

                        </div>

                    </form>

                </div>

            </div>

            {/* =========================
                ERROR
            ========================== */}

            {error && (
                <div
                    className="alert alert-danger"
                    role="alert"
                >

                    <h6 className="fw-bold">
                        Unable to complete request
                    </h6>

                    <pre className="mb-0 text-danger">
                        {error}
                    </pre>

                    <button
                        className="btn btn-outline-danger btn-sm mt-3"
                        onClick={() =>
                            fetchBooks()
                        }
                    >
                        🔄 Try Again
                    </button>

                </div>
            )}

            {/* =========================
                LOADING
            ========================== */}

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
                        Loading books...
                    </p>

                </div>
            )}

            {/* =========================
                NO BOOKS
            ========================== */}

            {!loading &&
                !error &&
                books.length === 0 && (

                    <div className="card border-0 shadow-sm">

                        <div className="card-body text-center py-5">

                            <div className="fs-1 mb-3">
                                📚
                            </div>

                            <h5 className="fw-bold">
                                No books found
                            </h5>

                            <p className="text-muted mb-3">
                                No books match your
                                current search.
                            </p>

                            {canManageBooks && (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAddBook}
                                >
                                    + Add First Book
                                </button>
                            )}

                        </div>

                    </div>
                )}

            {/* =========================
                BOOK TABLE
            ========================== */}

            {!loading &&
                books.length > 0 && (

                    <>

                        <div className="card border-0 shadow-sm">

                            <div className="card-body p-0">

                                <div className="table-responsive">

                                    <table className="table table-hover align-middle mb-0">

                                        <thead className="table-dark">

                                            <tr>

                                                <th>
                                                    #
                                                </th>

                                                <th>
                                                    Title
                                                </th>

                                                <th>
                                                    Author
                                                </th>

                                                <th>
                                                    ISBN
                                                </th>

                                                <th>
                                                    Quantity
                                                </th>

                                                <th>
                                                    Available
                                                </th>

                                                {canManageBooks && (
                                                    <th>
                                                        Actions
                                                    </th>
                                                )}

                                            </tr>

                                        </thead>

                                        <tbody>

                                            {books.map(
                                                (
                                                    book,
                                                    index
                                                ) => (

                                                    <tr
                                                        key={
                                                            book.id
                                                        }
                                                    >

                                                        {/* Number */}

                                                        <td className="text-muted">
                                                            {index + 1}
                                                        </td>

                                                        {/* Title */}

                                                        <td>

                                                            <span className="fw-semibold">
                                                                {
                                                                    book.title
                                                                }
                                                            </span>

                                                        </td>

                                                        {/* Author */}

                                                        <td>
                                                            {
                                                                book.author_name
                                                            }
                                                        </td>

                                                        {/* ISBN */}

                                                        <td>

                                                            <span className="font-monospace">
                                                                {
                                                                    book.isbn
                                                                }
                                                            </span>

                                                        </td>

                                                        {/* Quantity */}

                                                        <td>

                                                            <span className="badge bg-secondary">
                                                                {
                                                                    book.quantity
                                                                }
                                                            </span>

                                                        </td>

                                                        {/* Available */}

                                                        <td>

                                                            {book.available >
                                                            0 ? (

                                                                <span className="badge bg-success">
                                                                    {
                                                                        book.available
                                                                    }
                                                                </span>

                                                            ) : (

                                                                <span className="badge bg-danger">
                                                                    0
                                                                </span>

                                                            )}

                                                        </td>

                                                        {/* Actions */}

                                                        {canManageBooks && (

                                                            <td>

                                                                <div className="d-flex gap-2">

                                                                    <button
                                                                        className="btn btn-sm btn-outline-primary"
                                                                        onClick={() =>
                                                                            handleEditBook(
                                                                                book
                                                                            )
                                                                        }
                                                                    >
                                                                        ✏️ Edit
                                                                    </button>

                                                                    <button
                                                                        className="btn btn-sm btn-outline-danger"
                                                                        onClick={() =>
                                                                            handleDeleteBook(
                                                                                book
                                                                            )
                                                                        }
                                                                    >
                                                                        🗑️ Delete
                                                                    </button>

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

                        {/* =========================
                            PAGINATION
                        ========================== */}

                        {(previousPage ||
                            nextPage) && (

                            <div className="d-flex justify-content-between align-items-center mt-4">

                                <button
                                    className="btn btn-outline-primary"
                                    disabled={
                                        !previousPage ||
                                        loading
                                    }
                                    onClick={
                                        handlePreviousPage
                                    }
                                >
                                    ← Previous
                                </button>

                                <span className="text-muted">
                                    Page navigation
                                </span>

                                <button
                                    className="btn btn-outline-primary"
                                    disabled={
                                        !nextPage ||
                                        loading
                                    }
                                    onClick={
                                        handleNextPage
                                    }
                                >
                                    Next →
                                </button>

                            </div>

                        )}

                    </>
                )}

            {/* =========================
                ADD / EDIT MODAL
            ========================== */}

            {showModal && (

                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    role="dialog"
                >

                    <div className="modal-dialog modal-dialog-centered">

                        <div className="modal-content">

                            {/* Modal Header */}

                            <div className="modal-header">

                                <h5 className="modal-title fw-bold">

                                    {editingBook
                                        ? "✏️ Edit Book"
                                        : "📚 Add Book"}

                                </h5>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={
                                        closeModal
                                    }
                                ></button>

                            </div>

                            {/* Form */}

                            <form
                                onSubmit={
                                    handleSubmit
                                }
                            >

                                <div className="modal-body">

                                    {/* Form Error */}

                                    {formError && (

                                        <div className="alert alert-danger">

                                            <pre className="mb-0">
                                                {
                                                    formError
                                                }
                                            </pre>

                                        </div>

                                    )}

                                    {/* Title */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Book Title
                                        </label>

                                        <input
                                            type="text"
                                            name="title"
                                            className="form-control"
                                            value={
                                                formData.title
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Enter book title"
                                        />

                                    </div>

                                    {/* Author */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Author
                                        </label>

                                        <select
                                            name="author"
                                            className="form-select"
                                            value={
                                                formData.author
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        >

                                            <option value="">
                                                Select an author
                                            </option>

                                            {authors.map(
                                                (
                                                    author
                                                ) => (

                                                    <option
                                                        key={
                                                            author.id
                                                        }
                                                        value={
                                                            author.id
                                                        }
                                                    >
                                                        {
                                                            author.name
                                                        }
                                                    </option>

                                                )
                                            )}

                                        </select>

                                    </div>

                                    {/* ISBN */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            ISBN
                                        </label>

                                        <input
                                            type="text"
                                            name="isbn"
                                            className="form-control"
                                            value={
                                                formData.isbn
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Enter ISBN"
                                        />

                                    </div>

                                    {/* Quantity */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Quantity
                                        </label>

                                        <input
                                            type="number"
                                            name="quantity"
                                            className="form-control"
                                            min="0"
                                            value={
                                                formData.quantity
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Enter quantity"
                                        />

                                    </div>

                                </div>

                                {/* Modal Footer */}

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
                                                ></span>

                                                Saving...
                                            </>

                                        ) : editingBook ? (

                                            "Update Book"

                                        ) : (

                                            "Add Book"

                                        )}

                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>

                </div>

            )}

            {/* =========================
                MODAL BACKDROP
            ========================== */}

            {showModal && (
                <div className="modal-backdrop fade show"></div>
            )}

        </div>
    );
}

export default Books;