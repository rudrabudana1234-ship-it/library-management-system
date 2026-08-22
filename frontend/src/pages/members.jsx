import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/authcontext";

function Members() {
    const { user } = useAuth();

    // =========================
    // MEMBERS STATE
    // =========================

    const [members, setMembers] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    // =========================
    // PAGINATION
    // =========================

    const [nextPage, setNextPage] = useState(null);
    const [previousPage, setPreviousPage] = useState(null);

    // =========================
    // SEARCH + FILTERS
    // =========================

    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState("");
    const [ordering, setOrdering] = useState("");

    // =========================
    // MODAL
    // =========================

    const [showModal, setShowModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);

    // =========================
    // FORM
    // =========================

    const [userId, setUserId] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [isActive, setIsActive] = useState(true);

    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    // =========================
    // ROLE PERMISSIONS
    // =========================

    const isAdmin = user?.role === "admin";
    const isLibrarian = user?.role === "librarian";
    const isMember = user?.role === "member";

    const canCreateMembers =
        isAdmin || isLibrarian;

    const canManageMembers =
        isAdmin || isLibrarian;

    // =========================
    // BUILD QUERY
    // =========================

    const buildQuery = () => {
        const params = new URLSearchParams();

        if (search.trim()) {
            params.append(
                "search",
                search.trim()
            );
        }

        if (activeFilter !== "") {
            params.append(
                "is_active",
                activeFilter
            );
        }

        if (ordering !== "") {
            params.append(
                "ordering",
                ordering
            );
        }

        const query = params.toString();

        return query
            ? `members/?${query}`
            : "members/";
    };

    // =========================
    // FETCH MEMBERS
    // =========================

    const fetchMembers = async (
        url = null
    ) => {
        try {
            setLoading(true);
            setError("");

            const requestUrl =
                url || buildQuery();

            const response =
                await api.get(requestUrl);

            console.log(
                "MEMBER API RESPONSE:",
                response.data
            );

            // Paginated response
            if (
                Array.isArray(
                    response.data.results
                )
            ) {
                setMembers(
                    response.data.results
                );

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
                setMembers(
                    response.data
                );

                setNextPage(null);
                setPreviousPage(null);
            }

            // Unexpected response
            else {
                setMembers([]);
                setNextPage(null);
                setPreviousPage(null);
            }

        } catch (error) {
            console.error(
                "MEMBER API ERROR:",
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

            setMembers([]);

        } finally {
            setLoading(false);
        }
    };

    // =========================
    // INITIAL LOAD
    // =========================

    useEffect(() => {
        fetchMembers();
    }, []);

    // =========================
    // APPLY FILTERS
    // =========================

    const handleApplyFilters = (
        event
    ) => {
        event.preventDefault();

        fetchMembers(
            buildQuery()
        );
    };

    // =========================
    // CLEAR FILTERS
    // =========================

    const handleClearFilters = () => {
        setSearch("");
        setActiveFilter("");
        setOrdering("");

        fetchMembers("members/");
    };

    // =========================
    // OPEN ADD MODAL
    // =========================

    const handleAddMember = () => {
        setEditingMember(null);

        setUserId("");
        setName("");
        setEmail("");
        setPhone("");
        setAddress("");
        setIsActive(true);

        setFormError("");
        setShowModal(true);
    };

    // =========================
    // OPEN EDIT MODAL
    // =========================

    const handleEditMember = (
        member
    ) => {
        setEditingMember(member);

        setUserId(
            member.user_id || ""
        );

        setName(
            member.name || ""
        );

        setEmail(
            member.email || ""
        );

        setPhone(
            member.phone || ""
        );

        setAddress(
            member.address || ""
        );

        setIsActive(
            member.is_active ?? true
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
        setEditingMember(null);

        setUserId("");
        setName("");
        setEmail("");
        setPhone("");
        setAddress("");
        setIsActive(true);

        setFormError("");
    };

    // =========================
    // SUBMIT MEMBER
    // =========================

    const handleSubmit = async (
        event
    ) => {
        event.preventDefault();

        setFormError("");

        if (!name.trim()) {
            setFormError(
                "Member name is required."
            );
            return;
        }

        if (!email.trim()) {
            setFormError(
                "Email is required."
            );
            return;
        }

        if (
            !editingMember &&
            !userId
        ) {
            setFormError(
                "User ID is required when creating a member."
            );
            return;
        }

        try {
            setSaving(true);

            const memberData = {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                address: address.trim(),
                is_active: isActive,
            };

            // User ID only during creation
            if (!editingMember) {
                memberData.user_id =
                    Number(userId);
            }

            // UPDATE
            if (editingMember) {
                await api.put(
                    `members/${editingMember.id}/`,
                    memberData
                );
            }

            // CREATE
            else {
                await api.post(
                    "members/",
                    memberData
                );
            }

            setShowModal(false);
            setEditingMember(null);

            setUserId("");
            setName("");
            setEmail("");
            setPhone("");
            setAddress("");
            setIsActive(true);

            await fetchMembers();

        } catch (error) {
            console.error(
                "SAVE MEMBER ERROR:",
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
    // DELETE MEMBER
    // =========================

    const handleDeleteMember = async (
        member
    ) => {
        const confirmed =
            window.confirm(
                `Are you sure you want to delete "${member.name}"?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setError("");

            await api.delete(
                `members/${member.id}/`
            );

            await fetchMembers();

        } catch (error) {
            console.error(
                "DELETE MEMBER ERROR:",
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
                        👥 Members
                    </h1>

                    <p className="text-muted mb-0">
                        Search, filter and manage library members.
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2">

                    <span className="badge bg-primary fs-6">
                        {members.length} Members
                    </span>

                    {canCreateMembers && (
                        <button
                            className="btn btn-primary"
                            onClick={
                                handleAddMember
                            }
                        >
                            + Add Member
                        </button>
                    )}

                </div>

            </div>

            {/* =========================
                SEARCH + FILTERS
            ========================== */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body">

                    <form
                        onSubmit={
                            handleApplyFilters
                        }
                    >

                        <div className="row g-3">

                            {/* SEARCH */}

                            <div className="col-lg-5">

                                <label className="form-label fw-semibold">
                                    Search
                                </label>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Name, email or phone..."
                                    value={search}
                                    onChange={(
                                        event
                                    ) =>
                                        setSearch(
                                            event.target.value
                                        )
                                    }
                                />

                            </div>

                            {/* STATUS */}

                            <div className="col-md-4 col-lg-3">

                                <label className="form-label fw-semibold">
                                    Status
                                </label>

                                <select
                                    className="form-select"
                                    value={activeFilter}
                                    onChange={(
                                        event
                                    ) =>
                                        setActiveFilter(
                                            event.target.value
                                        )
                                    }
                                >

                                    <option value="">
                                        All Members
                                    </option>

                                    <option value="true">
                                        Active
                                    </option>

                                    <option value="false">
                                        Inactive
                                    </option>

                                </select>

                            </div>

                            {/* ORDERING */}

                            <div className="col-md-4 col-lg-2">

                                <label className="form-label fw-semibold">
                                    Sort By
                                </label>

                                <select
                                    className="form-select"
                                    value={ordering}
                                    onChange={(
                                        event
                                    ) =>
                                        setOrdering(
                                            event.target.value
                                        )
                                    }
                                >

                                    <option value="">
                                        Default
                                    </option>

                                    <option value="name">
                                        Name A-Z
                                    </option>

                                    <option value="-name">
                                        Name Z-A
                                    </option>

                                    <option value="email">
                                        Email A-Z
                                    </option>

                                    <option value="-email">
                                        Email Z-A
                                    </option>

                                    <option value="joined_date">
                                        Oldest Joined
                                    </option>

                                    <option value="-joined_date">
                                        Newest Joined
                                    </option>

                                </select>

                            </div>

                            {/* BUTTONS */}

                            <div className="col-md-4 col-lg-2 d-flex align-items-end gap-2">

                                <button
                                    type="submit"
                                    className="btn btn-primary flex-grow-1"
                                    disabled={loading}
                                >
                                    🔍 Apply
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
                            fetchMembers()
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
                        Loading members...
                    </p>

                </div>
            )}

            {/* =========================
                EMPTY STATE
            ========================== */}

            {!loading &&
                !error &&
                members.length === 0 && (

                    <div className="card border-0 shadow-sm">

                        <div className="card-body text-center py-5">

                            <div className="fs-1 mb-3">
                                👥
                            </div>

                            <h5 className="fw-bold">
                                No members found
                            </h5>

                            <p className="text-muted mb-3">
                                Try changing your search
                                or filters.
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

            {/* =========================
                MEMBERS TABLE
            ========================== */}

            {!loading &&
                !error &&
                members.length > 0 && (

                    <>

                        <div className="card border-0 shadow-sm">

                            <div className="card-header bg-white py-3">

                                <div className="d-flex justify-content-between align-items-center">

                                    <h5 className="fw-bold mb-0">
                                        Members List
                                    </h5>

                                    <span className="badge bg-primary">
                                        {members.length} Members
                                    </span>

                                </div>

                            </div>

                            <div className="card-body p-0">

                                <div className="table-responsive">

                                    <table className="table table-hover align-middle mb-0">

                                        <thead className="table-dark">

                                            <tr>

                                                <th>#</th>

                                                <th>Name</th>

                                                <th>Email</th>

                                                <th>Phone</th>

                                                <th>Address</th>

                                                <th>Status</th>

                                                {canManageMembers && (
                                                    <th>
                                                        Actions
                                                    </th>
                                                )}

                                            </tr>

                                        </thead>

                                        <tbody>

                                            {members.map(
                                                (
                                                    member,
                                                    index
                                                ) => (

                                                    <tr
                                                        key={
                                                            member.id
                                                        }
                                                    >

                                                        <td className="text-muted">
                                                            {index + 1}
                                                        </td>

                                                        <td>
                                                            <span className="fw-semibold">
                                                                {
                                                                    member.name
                                                                }
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {
                                                                member.email
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                member.phone ||
                                                                "—"
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                member.address ||
                                                                "—"
                                                            }
                                                        </td>

                                                        <td>

                                                            {member.is_active ? (
                                                                <span className="badge bg-success">
                                                                    Active
                                                                </span>
                                                            ) : (
                                                                <span className="badge bg-secondary">
                                                                    Inactive
                                                                </span>
                                                            )}

                                                        </td>

                                                        {canManageMembers && (
                                                            <td>

                                                                <div className="d-flex gap-2">

                                                                    <button
                                                                        className="btn btn-sm btn-outline-primary"
                                                                        onClick={() =>
                                                                            handleEditMember(
                                                                                member
                                                                            )
                                                                        }
                                                                    >
                                                                        ✏️ Edit
                                                                    </button>

                                                                    {isAdmin && (
                                                                        <button
                                                                            className="btn btn-sm btn-outline-danger"
                                                                            onClick={() =>
                                                                                handleDeleteMember(
                                                                                    member
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
                                        fetchMembers(
                                            previousPage
                                        )
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
                                    onClick={() =>
                                        fetchMembers(
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
                >

                    <div className="modal-dialog modal-lg modal-dialog-centered">

                        <div className="modal-content">

                            <div className="modal-header">

                                <h5 className="modal-title fw-bold">
                                    {editingMember
                                        ? "✏️ Edit Member"
                                        : "👤 Add Member"}
                                </h5>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={
                                        closeModal
                                    }
                                    disabled={saving}
                                ></button>

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
                                                {
                                                    formError
                                                }
                                            </pre>

                                        </div>
                                    )}

                                    <div className="row g-3">

                                        {/* USER ID */}

                                        {!editingMember && (
                                            <div className="col-md-6">

                                                <label className="form-label fw-semibold">
                                                    User ID
                                                </label>

                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={userId}
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setUserId(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Enter user ID"
                                                    disabled={saving}
                                                />

                                                <small className="text-muted">
                                                    Enter the ID of an existing member-role user.
                                                </small>

                                            </div>
                                        )}

                                        {/* NAME */}

                                        <div className="col-md-6">

                                            <label className="form-label fw-semibold">
                                                Member Name
                                            </label>

                                            <input
                                                type="text"
                                                className="form-control"
                                                value={name}
                                                onChange={(
                                                    event
                                                ) =>
                                                    setName(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Enter member name"
                                                disabled={saving}
                                            />

                                        </div>

                                        {/* EMAIL */}

                                        <div className="col-md-6">

                                            <label className="form-label fw-semibold">
                                                Email
                                            </label>

                                            <input
                                                type="email"
                                                className="form-control"
                                                value={email}
                                                onChange={(
                                                    event
                                                ) =>
                                                    setEmail(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Enter email"
                                                disabled={saving}
                                            />

                                        </div>

                                        {/* PHONE */}

                                        <div className="col-md-6">

                                            <label className="form-label fw-semibold">
                                                Phone
                                            </label>

                                            <input
                                                type="text"
                                                className="form-control"
                                                value={phone}
                                                onChange={(
                                                    event
                                                ) =>
                                                    setPhone(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Enter phone number"
                                                disabled={saving}
                                            />

                                        </div>

                                        {/* ADDRESS */}

                                        <div className="col-12">

                                            <label className="form-label fw-semibold">
                                                Address
                                            </label>

                                            <textarea
                                                className="form-control"
                                                rows="3"
                                                value={address}
                                                onChange={(
                                                    event
                                                ) =>
                                                    setAddress(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Enter address"
                                                disabled={saving}
                                            ></textarea>

                                        </div>

                                        {/* ACTIVE */}

                                        <div className="col-12">

                                            <div className="form-check">

                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="memberActive"
                                                    checked={isActive}
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setIsActive(
                                                            event.target.checked
                                                        )
                                                    }
                                                    disabled={saving}
                                                />

                                                <label
                                                    className="form-check-label fw-semibold"
                                                    htmlFor="memberActive"
                                                >
                                                    Active Member
                                                </label>

                                            </div>

                                        </div>

                                    </div>

                                </div>

                                <div className="modal-footer">

                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={
                                            closeModal
                                        }
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
                                        ) : editingMember ? (
                                            "Update Member"
                                        ) : (
                                            "Add Member"
                                        )}

                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>

                </div>
            )}

            {/* BACKDROP */}

            {showModal && (
                <div
                    className="modal-backdrop fade show"
                    onClick={closeModal}
                ></div>
            )}

        </div>
    );
}

export default Members;