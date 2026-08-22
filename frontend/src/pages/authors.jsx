import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/authcontext";

function Authors() {
    const { user } = useAuth();

    // =========================
    // AUTHORS STATE
    // =========================

    const [authors, setAuthors] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    // =========================
    // PAGINATION
    // =========================

    const [nextPage, setNextPage] = useState(null);
    const [previousPage, setPreviousPage] = useState(null);

    // =========================
    // SEARCH
    // =========================

    const [search, setSearch] = useState("");
    const [activeSearch, setActiveSearch] = useState("");

    // =========================
    // MODAL
    // =========================

    const [showModal, setShowModal] = useState(false);
    const [editingAuthor, setEditingAuthor] = useState(null);

    // =========================
    // FORM
    // =========================

    const [name, setName] = useState("");
    const [bio, setBio] = useState("");

    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    // =========================
    // ROLE PERMISSIONS
    // =========================

    const canManageAuthors =
        user?.role === "admin" ||
        user?.role === "librarian";

    const canDeleteAuthors =
        user?.role === "admin";

    // =========================
    // FETCH AUTHORS
    // =========================

    const fetchAuthors = async (url = null) => {
        try {
            setLoading(true);
            setError("");

            let requestUrl = url;

            // If no URL is supplied, build URL
            // using current search
            if (!requestUrl) {
                requestUrl = activeSearch
                    ? `authors/?search=${encodeURIComponent(
                          activeSearch
                      )}`
                    : "authors/";
            }

            const response = await api.get(requestUrl);

            console.log(
                "AUTHOR API RESPONSE:",
                response.data
            );

            // =========================
            // PAGINATED RESPONSE
            // =========================

            if (Array.isArray(response.data.results)) {
                setAuthors(response.data.results);

                setNextPage(
                    response.data.next || null
                );

                setPreviousPage(
                    response.data.previous || null
                );
            }

            // =========================
            // NON-PAGINATED RESPONSE
            // =========================

            else if (Array.isArray(response.data)) {
                setAuthors(response.data);

                setNextPage(null);
                setPreviousPage(null);
            }

            // =========================
            // INVALID RESPONSE
            // =========================

            else {
                setAuthors([]);

                setNextPage(null);
                setPreviousPage(null);
            }

        } catch (error) {
            console.error(
                "AUTHOR API ERROR:",
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

            setAuthors([]);

            setNextPage(null);
            setPreviousPage(null);
        } finally {
            setLoading(false);
        }
    };

    // =========================
    // INITIAL LOAD
    // =========================

    useEffect(() => {
        fetchAuthors();
    }, []);

    // =========================
    // SEARCH
    // =========================

    const handleSearch = (event) => {
        event.preventDefault();

        const trimmedSearch =
            search.trim();

        setActiveSearch(trimmedSearch);

        // Search URL
        const searchUrl = trimmedSearch
            ? `authors/?search=${encodeURIComponent(
                  trimmedSearch
              )}`
            : "authors/";

        fetchAuthors(searchUrl);
    };

    // =========================
    // CLEAR SEARCH
    // =========================

    const handleClearSearch = () => {
        setSearch("");
        setActiveSearch("");

        fetchAuthors("authors/");
    };

    // =========================
    // OPEN ADD MODAL
    // =========================

    const handleAddAuthor = () => {
        setEditingAuthor(null);

        setName("");
        setBio("");

        setFormError("");

        setShowModal(true);
    };

    // =========================
    // OPEN EDIT MODAL
    // =========================

    const handleEditAuthor = (author) => {
        setEditingAuthor(author);

        setName(
            author.name || ""
        );

        setBio(
            author.bio || ""
        );

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
        setEditingAuthor(null);

        setName("");
        setBio("");

        setFormError("");
    };

    // =========================
    // ADD / EDIT AUTHOR
    // =========================

    const handleSubmit = async (event) => {
        event.preventDefault();

        setFormError("");

        // =========================
        // VALIDATION
        // =========================

        if (!name.trim()) {
            setFormError(
                "Author name is required."
            );
            return;
        }

        try {
            setSaving(true);

            const authorData = {
                name: name.trim(),
                bio: bio.trim(),
            };

            // =========================
            // UPDATE AUTHOR
            // =========================

            if (editingAuthor) {
                await api.put(
                    `authors/${editingAuthor.id}/`,
                    authorData
                );
            }

            // =========================
            // CREATE AUTHOR
            // =========================

            else {
                await api.post(
                    "authors/",
                    authorData
                );
            }

            // =========================
            // RESET FORM
            // =========================

            setShowModal(false);
            setEditingAuthor(null);

            setName("");
            setBio("");

            setFormError("");

            // Refresh current search
            await fetchAuthors();

        } catch (error) {
            console.error(
                "SAVE AUTHOR ERROR:",
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
    // DELETE AUTHOR
    // =========================

    const handleDeleteAuthor = async (author) => {
        const confirmed =
            window.confirm(
                `Are you sure you want to delete "${author.name}"?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setError("");

            await api.delete(
                `authors/${author.id}/`
            );

            // Refresh current search
            await fetchAuthors();

        } catch (error) {
            console.error(
                "DELETE AUTHOR ERROR:",
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
    // UI
    // =========================

    return (
        <div className="container py-4">

            {/* =========================
                PAGE HEADER
            ========================== */}

            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">

                <div>
                    <h1 className="fw-bold mb-1">
                        ✍️ Authors
                    </h1>

                    <p className="text-muted mb-0">
                        Browse and manage library authors.
                    </p>
                </div>

                {canManageAuthors && (
                    <button
                        className="btn btn-primary"
                        onClick={handleAddAuthor}
                    >
                        + Add Author
                    </button>
                )}

            </div>

            {/* =========================
                SEARCH
            ========================== */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body">

                    <form
                        onSubmit={handleSearch}
                        className="row g-2"
                    >

                        <div className="col-md-9">

                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search authors by name..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                            />

                        </div>

                        <div className="col-md-3 d-flex gap-2">

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
                                onClick={handleClearSearch}
                                disabled={
                                    loading &&
                                    !activeSearch
                                }
                            >
                                Clear
                            </button>

                        </div>

                    </form>

                    {/* ACTIVE SEARCH */}

                    {activeSearch && (
                        <div className="mt-3">

                            <span className="text-muted">
                                Searching for:
                            </span>

                            <span className="badge bg-primary ms-2">
                                {activeSearch}
                            </span>

                        </div>
                    )}

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
                            fetchAuthors()
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
                        Loading authors...
                    </p>

                </div>
            )}

            {/* =========================
                EMPTY STATE
            ========================== */}

            {!loading &&
                !error &&
                authors.length === 0 && (

                    <div className="card border-0 shadow-sm">

                        <div className="card-body text-center py-5">

                            <div className="fs-1 mb-3">
                                ✍️
                            </div>

                            <h5 className="fw-bold">
                                No authors found
                            </h5>

                            <p className="text-muted mb-3">

                                {activeSearch
                                    ? `No authors match "${activeSearch}".`
                                    : "Authors will appear here once they are added to the library."
                                }

                            </p>

                            {activeSearch ? (

                                <button
                                    className="btn btn-outline-primary"
                                    onClick={
                                        handleClearSearch
                                    }
                                >
                                    Clear Search
                                </button>

                            ) : (

                                canManageAuthors && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={
                                            handleAddAuthor
                                        }
                                    >
                                        + Add First Author
                                    </button>
                                )

                            )}

                        </div>

                    </div>
                )}

            {/* =========================
                AUTHORS TABLE
            ========================== */}

            {!loading &&
                !error &&
                authors.length > 0 && (

                    <>

                        <div className="card border-0 shadow-sm">

                            {/* TABLE HEADER */}

                            <div className="card-header bg-white py-3">

                                <div className="d-flex justify-content-between align-items-center">

                                    <h5 className="fw-bold mb-0">
                                        Authors List
                                    </h5>

                                    <span className="badge bg-primary">
                                        {authors.length} Authors
                                    </span>

                                </div>

                            </div>

                            {/* TABLE */}

                            <div className="card-body p-0">

                                <div className="table-responsive">

                                    <table className="table table-hover align-middle mb-0">

                                        <thead className="table-dark">

                                            <tr>

                                                <th>
                                                    #
                                                </th>

                                                <th>
                                                    Name
                                                </th>

                                                <th>
                                                    Biography
                                                </th>

                                                {canManageAuthors && (
                                                    <th>
                                                        Actions
                                                    </th>
                                                )}

                                            </tr>

                                        </thead>

                                        <tbody>

                                            {authors.map(
                                                (
                                                    author,
                                                    index
                                                ) => (

                                                    <tr
                                                        key={
                                                            author.id
                                                        }
                                                    >

                                                        <td className="text-muted">
                                                            {index + 1}
                                                        </td>

                                                        <td>
                                                            <span className="fw-semibold">
                                                                {
                                                                    author.name
                                                                }
                                                            </span>
                                                        </td>

                                                        <td>

                                                            {author.bio ? (

                                                                <span className="text-muted">
                                                                    {
                                                                        author.bio
                                                                    }
                                                                </span>

                                                            ) : (

                                                                <span className="text-muted fst-italic">
                                                                    No biography
                                                                </span>

                                                            )}

                                                        </td>

                                                        {canManageAuthors && (

                                                            <td>

                                                                <div className="d-flex gap-2">

                                                                    {/* EDIT */}

                                                                    <button
                                                                        className="btn btn-sm btn-outline-primary"
                                                                        onClick={() =>
                                                                            handleEditAuthor(
                                                                                author
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            saving
                                                                        }
                                                                    >
                                                                        ✏️ Edit
                                                                    </button>

                                                                    {/* DELETE */}

                                                                    {canDeleteAuthors && (

                                                                        <button
                                                                            className="btn btn-sm btn-outline-danger"
                                                                            onClick={() =>
                                                                                handleDeleteAuthor(
                                                                                    author
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                saving
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
                                    onClick={() =>
                                        fetchAuthors(
                                            previousPage
                                        )
                                    }
                                >
                                    ← Previous
                                </button>

                                <div className="text-center">

                                    <span className="text-muted">
                                        Page navigation
                                    </span>

                                    {activeSearch && (
                                        <div>
                                            <small className="text-muted">
                                                Search:
                                                {" "}
                                                <strong>
                                                    {activeSearch}
                                                </strong>
                                            </small>
                                        </div>
                                    )}

                                </div>

                                <button
                                    className="btn btn-outline-primary"
                                    disabled={
                                        !nextPage ||
                                        loading
                                    }
                                    onClick={() =>
                                        fetchAuthors(
                                            nextPage
                                        )
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
                    aria-modal="true"
                >

                    <div className="modal-dialog modal-dialog-centered">

                        <div className="modal-content">

                            {/* MODAL HEADER */}

                            <div className="modal-header">

                                <h5 className="modal-title fw-bold">

                                    {editingAuthor
                                        ? "✏️ Edit Author"
                                        : "✍️ Add Author"}

                                </h5>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={closeModal}
                                    disabled={saving}
                                ></button>

                            </div>

                            {/* FORM */}

                            <form
                                onSubmit={
                                    handleSubmit
                                }
                            >

                                <div className="modal-body">

                                    {/* FORM ERROR */}

                                    {formError && (

                                        <div className="alert alert-danger">

                                            <pre className="mb-0">
                                                {formError}
                                            </pre>

                                        </div>

                                    )}

                                    {/* NAME */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Author Name
                                        </label>

                                        <input
                                            type="text"
                                            className="form-control"
                                            value={name}
                                            onChange={(event) =>
                                                setName(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Enter author name"
                                            disabled={saving}
                                        />

                                    </div>

                                    {/* BIO */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Biography
                                        </label>

                                        <textarea
                                            className="form-control"
                                            rows="4"
                                            value={bio}
                                            onChange={(event) =>
                                                setBio(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Enter author biography (optional)"
                                            disabled={saving}
                                        ></textarea>

                                    </div>

                                </div>

                                {/* MODAL FOOTER */}

                                <div className="modal-footer">

                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={closeModal}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={saving}
                                    >

                                        {saving ? (

                                            <>
                                                <span
                                                    className="spinner-border spinner-border-sm me-2"
                                                    role="status"
                                                ></span>

                                                Saving...
                                            </>

                                        ) : editingAuthor ? (

                                            "Update Author"

                                        ) : (

                                            "Add Author"

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
                <div
                    className="modal-backdrop fade show"
                    onClick={closeModal}
                ></div>
            )}

        </div>
    );
}

export default Authors;