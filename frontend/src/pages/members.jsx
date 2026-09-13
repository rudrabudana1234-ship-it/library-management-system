import {
    useEffect,
    useRef,
    useState,
} from "react";

import api from "../services/api";
import { useAuth } from "../context/authcontext";


function Members() {

    const { user } = useAuth();

    // =========================================================
    // MEMBERS
    // =========================================================

    const [members, setMembers] = useState([]);

    const [totalMembers, setTotalMembers] = useState(0);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    // =========================================================
    // PAGINATION
    // =========================================================

    const [nextPage, setNextPage] = useState(null);

    const [previousPage, setPreviousPage] = useState(null);

    // =========================================================
    // SEARCH / FILTER / ORDER
    // =========================================================

    const [search, setSearch] = useState("");

    const [searchInput, setSearchInput] = useState("");

    const [activeFilter, setActiveFilter] = useState("");

    const [ordering, setOrdering] = useState("");

    const [filtersApplied, setFiltersApplied] =
        useState(false);

    // =========================================================
    // SEARCH UI
    // =========================================================

    const [showSuggestions, setShowSuggestions] =
        useState(false);

    const [recentSearches, setRecentSearches] =
        useState([]);

    const [suggestions, setSuggestions] =
        useState([]);

    const searchContainerRef = useRef(null);

    // =========================================================
    // MODAL
    // =========================================================

    const [showModal, setShowModal] = useState(false);

    const [editingMember, setEditingMember] =
        useState(null);

    // =========================================================
    // FORM
    // =========================================================

    const [userId, setUserId] = useState("");

    const [name, setName] = useState("");

    const [email, setEmail] = useState("");

    const [phone, setPhone] = useState("");

    const [address, setAddress] = useState("");

    const [isActive, setIsActive] = useState(true);

    const [formError, setFormError] = useState("");

    const [saving, setSaving] = useState(false);

    // =========================================================
    // REQUEST CONTROL
    // =========================================================

    const requestIdRef = useRef(0);

    const searchTimeoutRef = useRef(null);

    // =========================================================
    // ROLE PERMISSIONS
    // =========================================================

    const isAdmin =
        user?.role === "admin";

    const isLibrarian =
        user?.role === "librarian";

    const canCreateMembers =
        isAdmin || isLibrarian;

    const canManageMembers =
        isAdmin || isLibrarian;

    // =========================================================
    // RECENT SEARCH STORAGE KEY
    // =========================================================

    const RECENT_SEARCH_KEY =
        "lms_recent_member_searches";

    // =========================================================
    // LOAD RECENT SEARCHES
    // =========================================================

    useEffect(() => {

        try {

            const stored =
                localStorage.getItem(
                    RECENT_SEARCH_KEY
                );

            if (stored) {

                const parsed =
                    JSON.parse(stored);

                if (Array.isArray(parsed)) {

                    setRecentSearches(
                        parsed.slice(0, 6)
                    );
                }
            }

        } catch (storageError) {

            console.error(
                "RECENT SEARCH LOAD ERROR:",
                storageError
            );
        }

    }, []);

    // =========================================================
    // SAVE RECENT SEARCH
    // =========================================================

    const saveRecentSearch = (
        value
    ) => {

        const trimmed =
            value.trim();

        if (!trimmed) {
            return;
        }

        try {

            const existing =
                JSON.parse(
                    localStorage.getItem(
                        RECENT_SEARCH_KEY
                    ) || "[]"
                );

            const safeExisting =
                Array.isArray(existing)
                    ? existing
                    : [];

            const updated = [
                trimmed,
                ...safeExisting.filter(
                    item =>
                        item.toLowerCase() !==
                        trimmed.toLowerCase()
                ),
            ].slice(0, 6);

            localStorage.setItem(
                RECENT_SEARCH_KEY,
                JSON.stringify(updated)
            );

            setRecentSearches(updated);

        } catch (storageError) {

            console.error(
                "RECENT SEARCH SAVE ERROR:",
                storageError
            );
        }
    };

    // =========================================================
    // REMOVE RECENT SEARCH
    // =========================================================

    const removeRecentSearch = (
        value
    ) => {

        try {

            const updated =
                recentSearches.filter(
                    item => item !== value
                );

            setRecentSearches(updated);

            localStorage.setItem(
                RECENT_SEARCH_KEY,
                JSON.stringify(updated)
            );

        } catch (storageError) {

            console.error(
                "RECENT SEARCH REMOVE ERROR:",
                storageError
            );
        }
    };

    // =========================================================
    // CLEAR ALL RECENT SEARCHES
    // =========================================================

    const clearRecentSearches = () => {

        try {

            localStorage.removeItem(
                RECENT_SEARCH_KEY
            );

        } catch (storageError) {

            console.error(
                "RECENT SEARCH CLEAR ERROR:",
                storageError
            );
        }

        setRecentSearches([]);
    };

    // =========================================================
    // BUILD QUERY
    // =========================================================

    const buildQuery = (
        customSearch = search,
        customActiveFilter = activeFilter,
        customOrdering = ordering
    ) => {

        const params =
            new URLSearchParams();

        const trimmedSearch =
            customSearch?.trim() || "";

        if (trimmedSearch) {

            params.append(
                "search",
                trimmedSearch
            );
        }

        if (
            customActiveFilter !== ""
        ) {

            params.append(
                "is_active",
                customActiveFilter
            );
        }

        if (
            customOrdering !== ""
        ) {

            params.append(
                "ordering",
                customOrdering
            );
        }

        const query =
            params.toString();

        return query
            ? `members/?${query}`
            : "members/";
    };

    // =========================================================
    // FETCH MEMBERS
    // =========================================================

    const fetchMembers = async (
        url = null
    ) => {

        const currentRequestId =
            ++requestIdRef.current;

        try {

            setLoading(true);

            setError("");

            const requestUrl =
                url || buildQuery();

            const response =
                await api.get(
                    requestUrl
                );

            if (
                currentRequestId !==
                requestIdRef.current
            ) {
                return;
            }

            const data =
                response.data;

            // =================================================
            // PAGINATED
            // =================================================

            if (
                data &&
                Array.isArray(
                    data.results
                )
            ) {

                setMembers(
                    data.results
                );

                setTotalMembers(
                    Number(
                        data.count || 0
                    )
                );

                setNextPage(
                    data.next || null
                );

                setPreviousPage(
                    data.previous || null
                );

                return;
            }

            // =================================================
            // NON-PAGINATED
            // =================================================

            if (
                Array.isArray(data)
            ) {

                setMembers(data);

                setTotalMembers(
                    data.length
                );

                setNextPage(null);

                setPreviousPage(null);

                return;
            }

            // =================================================
            // INVALID RESPONSE
            // =================================================

            setMembers([]);

            setTotalMembers(0);

            setNextPage(null);

            setPreviousPage(null);

        } catch (requestError) {

            if (
                currentRequestId !==
                requestIdRef.current
            ) {
                return;
            }

            console.error(
                "MEMBER API ERROR:",
                requestError.response?.data ||
                requestError.message
            );

            const apiError =
                requestError.response?.data;

            if (
                typeof apiError ===
                "object"
            ) {

                setError(
                    JSON.stringify(
                        apiError,
                        null,
                        2
                    )
                );

            } else {

                setError(
                    apiError ||
                    requestError.message ||
                    "Unable to load members."
                );
            }

            setMembers([]);

            setTotalMembers(0);

            setNextPage(null);

            setPreviousPage(null);

        } finally {

            if (
                currentRequestId ===
                requestIdRef.current
            ) {

                setLoading(false);
            }
        }
    };

    // =========================================================
    // INITIAL LOAD
    // =========================================================

    useEffect(() => {

        fetchMembers();

        return () => {

            if (
                searchTimeoutRef.current
            ) {

                clearTimeout(
                    searchTimeoutRef.current
                );
            }
        };

    }, []);

    // =========================================================
    // CLOSE SEARCH DROPDOWN WHEN CLICKING OUTSIDE
    // =========================================================

    useEffect(() => {

        const handleOutsideClick = (
            event
        ) => {

            if (
                searchContainerRef.current &&
                !searchContainerRef.current.contains(
                    event.target
                )
            ) {

                setShowSuggestions(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleOutsideClick
        );

        return () => {

            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };

    }, []);

    // =========================================================
    // GENERATE SEARCH SUGGESTIONS
    // =========================================================

    useEffect(() => {

        const value =
            searchInput.trim().toLowerCase();

        if (!value) {

            setSuggestions([]);

            return;
        }

        const generatedSuggestions = [];

        members.forEach(member => {

            const memberName =
                member.name || "";

            const memberEmail =
                member.email || "";

            const memberPhone =
                member.phone || "";

            if (
                memberName
                    .toLowerCase()
                    .startsWith(value) ||
                memberEmail
                    .toLowerCase()
                    .startsWith(value) ||
                memberPhone
                    .toLowerCase()
                    .startsWith(value)
            ) {

                generatedSuggestions.push({
                    id: member.id,
                    type: "member",
                    label: memberName,
                    email: memberEmail,
                    phone: memberPhone,
                });
            }
        });

        setSuggestions(
            generatedSuggestions.slice(0, 6)
        );

    }, [
        searchInput,
        members,
    ]);

    // =========================================================
    // SEARCH INPUT
    // =========================================================

    const handleSearchChange = (
        event
    ) => {

        const value =
            event.target.value;

        setSearchInput(value);

        setShowSuggestions(
            value.trim().length > 0
        );

        if (
            searchTimeoutRef.current
        ) {

            clearTimeout(
                searchTimeoutRef.current
            );
        }

        // =====================================================
        // PREFIX / DEBOUNCED SEARCH
        // =====================================================

        searchTimeoutRef.current =
            setTimeout(() => {

                const trimmedValue =
                    value.trim();

                setSearch(
                    trimmedValue
                );

            }, 450);
    };

    // =========================================================
    // SEARCH EFFECT
    // =========================================================

    useEffect(() => {

        if (!filtersApplied) {
            return;
        }

        fetchMembers(
            buildQuery(
                search,
                activeFilter,
                ordering
            )
        );

    }, [
        search,
        activeFilter,
        ordering,
        filtersApplied,
    ]);

    // =========================================================
    // SELECT SEARCH SUGGESTION
    // =========================================================

    const handleSuggestionSelect = (
        suggestion
    ) => {

        const value =
            suggestion.label ||
            suggestion.email ||
            "";

        setSearchInput(value);

        setSearch(value);

        setFiltersApplied(true);

        saveRecentSearch(value);

        setShowSuggestions(false);
    };

    // =========================================================
    // SELECT RECENT SEARCH
    // =========================================================

    const handleRecentSearchSelect = (
        value
    ) => {

        setSearchInput(value);

        setSearch(value);

        setFiltersApplied(true);

        saveRecentSearch(value);

        setShowSuggestions(false);
    };

    // =========================================================
    // APPLY FILTERS
    // =========================================================

    const handleApplyFilters = (
        event
    ) => {

        event.preventDefault();

        if (
            searchTimeoutRef.current
        ) {

            clearTimeout(
                searchTimeoutRef.current
            );
        }

        const trimmedSearch =
            searchInput.trim();

        setSearch(
            trimmedSearch
        );

        setFiltersApplied(true);

        if (trimmedSearch) {

            saveRecentSearch(
                trimmedSearch
            );
        }

        setShowSuggestions(false);
    };

    // =========================================================
    // CLEAR FILTERS
    // =========================================================

    const handleClearFilters = () => {

        if (
            searchTimeoutRef.current
        ) {

            clearTimeout(
                searchTimeoutRef.current
            );
        }

        setSearchInput("");

        setSearch("");

        setActiveFilter("");

        setOrdering("");

        setFiltersApplied(false);

        setShowSuggestions(false);

        fetchMembers(
            "members/"
        );
    };

    // =========================================================
    // ADD MEMBER
    // =========================================================

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

    // =========================================================
    // EDIT MEMBER
    // =========================================================

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

    // =========================================================
    // RESET FORM
    // =========================================================

    const resetForm = () => {

        setEditingMember(null);

        setUserId("");

        setName("");

        setEmail("");

        setPhone("");

        setAddress("");

        setIsActive(true);

        setFormError("");
    };

    // =========================================================
    // CLOSE MODAL
    // =========================================================

    const closeModal = () => {

        if (saving) {
            return;
        }

        setShowModal(false);

        resetForm();
    };

    // =========================================================
    // SUBMIT MEMBER
    // =========================================================

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

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            !emailPattern.test(
                email.trim()
            )
        ) {

            setFormError(
                "Please enter a valid email address."
            );

            return;
        }

        if (!editingMember) {

            const numericUserId =
                Number(userId);

            if (
                !Number.isInteger(
                    numericUserId
                ) ||
                numericUserId <= 0
            ) {

                setFormError(
                    "User ID must be a valid positive number."
                );

                return;
            }
        }

        try {

            setSaving(true);

            const memberData = {

                name:
                    name.trim(),

                email:
                    email.trim(),

                phone:
                    phone.trim(),

                address:
                    address.trim(),

                is_active:
                    isActive,
            };

            // =================================================
            // CREATE
            // =================================================

            if (!editingMember) {

                memberData.user_id =
                    Number(userId);

                await api.post(
                    "members/",
                    memberData
                );

            }

            // =================================================
            // UPDATE
            // =================================================

            else {

                await api.patch(
                    `members/${editingMember.id}/`,
                    memberData
                );
            }

            // =================================================
            // SUCCESS
            // =================================================

            setShowModal(false);

            resetForm();

            await fetchMembers(
                buildQuery()
            );

        } catch (requestError) {

            console.error(
                "SAVE MEMBER ERROR:",
                requestError.response?.data ||
                requestError.message
            );

            const apiError =
                requestError.response?.data;

            if (
                typeof apiError ===
                "object"
            ) {

                setFormError(
                    JSON.stringify(
                        apiError,
                        null,
                        2
                    )
                );

            } else {

                setFormError(
                    apiError ||
                    requestError.message ||
                    "Unable to save member."
                );
            }

        } finally {

            setSaving(false);
        }
    };

    // =========================================================
    // DELETE MEMBER
    // =========================================================

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

            setLoading(true);

            await api.delete(
                `members/${member.id}/`
            );

            await fetchMembers(
                buildQuery()
            );

        } catch (requestError) {

            console.error(
                "DELETE MEMBER ERROR:",
                requestError.response?.data ||
                requestError.message
            );

            const apiError =
                requestError.response?.data;

            if (
                typeof apiError ===
                "object"
            ) {

                setError(
                    JSON.stringify(
                        apiError,
                        null,
                        2
                    )
                );

            } else {

                setError(
                    apiError ||
                    requestError.message ||
                    "Unable to delete member."
                );
            }

            setLoading(false);
        }
    };

    // =========================================================
    // PAGE NAVIGATION
    // =========================================================

    const handleNextPage = () => {

        if (
            nextPage &&
            !loading
        ) {

            fetchMembers(
                nextPage
            );
        }
    };

    const handlePreviousPage = () => {

        if (
            previousPage &&
            !loading
        ) {

            fetchMembers(
                previousPage
            );
        }
    };

    // =========================================================
    // STATUS LABEL
    // =========================================================

    const getStatusLabel = () => {

        if (
            activeFilter === "true"
        ) {
            return "Active";
        }

        if (
            activeFilter === "false"
        ) {
            return "Inactive";
        }

        return "All";
    };

    // =========================================================
    // ORDERING LABEL
    // =========================================================

    const getOrderingLabel = () => {

        const labels = {

            name: "Name A-Z",

            "-name": "Name Z-A",

            email: "Email A-Z",

            "-email": "Email Z-A",

            joined_date: "Oldest Joined",

            "-joined_date": "Newest Joined",

        };

        return (
            labels[ordering] ||
            ordering
        );
    };

    // =========================================================
    // SEARCH RESULT DESCRIPTION
    // =========================================================

    const getMemberInitial = (
        memberName
    ) => {

        return (
            memberName
                ?.charAt(0)
                ?.toUpperCase() ||
            "?"
        );
    };

    // =========================================================
    // UI
    // =========================================================

    return (

        <div className="container-fluid py-4">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">

                <div>

                    <div className="d-flex align-items-center gap-2 mb-1">

                        <h1 className="fw-bold mb-0">
                            👥 Members
                        </h1>

                        <span className="badge bg-primary">
                            {totalMembers}
                        </span>

                    </div>

                    <p className="text-muted mb-0">
                        Search, discover, filter and manage library members.
                    </p>

                </div>

                {canCreateMembers && (

                    <button
                        className="btn btn-primary px-4"
                        onClick={
                            handleAddMember
                        }
                    >
                        <span className="me-1">
                            +
                        </span>

                        Add Member
                    </button>

                )}

            </div>

            {/* =================================================
                SEARCH / FILTER CARD
            ================================================= */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body">

                    <form
                        onSubmit={
                            handleApplyFilters
                        }
                    >

                        <div className="row g-3 align-items-end">

                            {/* =================================================
                                ADVANCED SEARCH
                            ================================================= */}

                            <div
                                className="col-12 col-xl-5 position-relative"
                                ref={
                                    searchContainerRef
                                }
                            >

                                <label className="form-label fw-semibold">
                                    Search Members
                                </label>

                                <div className="input-group">

                                    <span className="input-group-text">
                                        🔍
                                    </span>

                                    <input
                                        type="text"
                                        className="form-control"
                                        value={
                                            searchInput
                                        }
                                        onFocus={() =>
                                            setShowSuggestions(
                                                searchInput.trim().length >
                                                0
                                            )
                                        }
                                        onChange={
                                            handleSearchChange
                                        }
                                        placeholder="Search by name, email or phone..."
                                        autoComplete="off"
                                    />

                                    {searchInput && (

                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => {

                                                setSearchInput("");

                                                setSearch("");

                                                setShowSuggestions(
                                                    false
                                                );
                                            }}
                                        >
                                            ✕
                                        </button>

                                    )}

                                </div>

                                <small className="text-muted">
                                    Start typing a few characters to find members quickly.
                                </small>

                                {/* =================================================
                                    SEARCH DROPDOWN
                                ================================================= */}

                                {showSuggestions && (

                                    <div
                                        className="position-absolute bg-white border rounded shadow-lg mt-1 w-100"
                                        style={{
                                            zIndex: 1050,
                                            maxHeight: "360px",
                                            overflowY: "auto",
                                        }}
                                    >

                                        {/* =================================================
                                            LIVE SUGGESTIONS
                                        ================================================= */}

                                        {suggestions.length > 0 && (

                                            <>

                                                <div className="px-3 py-2 border-bottom bg-light">

                                                    <small className="text-muted fw-semibold">
                                                        Suggested Members
                                                    </small>

                                                </div>

                                                {suggestions.map(
                                                    suggestion => (

                                                        <button
                                                            type="button"
                                                            key={
                                                                suggestion.id
                                                            }
                                                            className="dropdown-item px-3 py-3"
                                                            onClick={() =>
                                                                handleSuggestionSelect(
                                                                    suggestion
                                                                )
                                                            }
                                                        >

                                                            <div className="d-flex align-items-center gap-3">

                                                                <div
                                                                    className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                                                                    style={{
                                                                        width:
                                                                            "38px",
                                                                        height:
                                                                            "38px",
                                                                    }}
                                                                >
                                                                    {getMemberInitial(
                                                                        suggestion.label
                                                                    )}
                                                                </div>

                                                                <div className="text-start">

                                                                    <div className="fw-semibold">
                                                                        {
                                                                            suggestion.label
                                                                        }
                                                                    </div>

                                                                    {suggestion.email && (

                                                                        <small className="text-muted">
                                                                            {
                                                                                suggestion.email
                                                                            }
                                                                        </small>

                                                                    )}

                                                                    {suggestion.phone && (

                                                                        <small className="text-muted d-block">
                                                                            📞{" "}
                                                                            {
                                                                                suggestion.phone
                                                                            }
                                                                        </small>

                                                                    )}

                                                                </div>

                                                            </div>

                                                        </button>

                                                    )
                                                )}

                                            </>

                                        )}

                                        {/* =================================================
                                            RECENT SEARCHES
                                        ================================================= */}

                                        {recentSearches.length > 0 && (

                                            <>

                                                <div className="px-3 py-2 border-top border-bottom bg-light d-flex justify-content-between align-items-center">

                                                    <small className="text-muted fw-semibold">
                                                        🕘 Recent Searches
                                                    </small>

                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-link text-danger p-0"
                                                        onClick={
                                                            clearRecentSearches
                                                        }
                                                    >
                                                        Clear
                                                    </button>

                                                </div>

                                                {recentSearches.map(
                                                    recent => (

                                                        <div
                                                            key={
                                                                recent
                                                            }
                                                            className="d-flex align-items-center"
                                                        >

                                                            <button
                                                                type="button"
                                                                className="dropdown-item px-3 py-2 flex-grow-1"
                                                                onClick={() =>
                                                                    handleRecentSearchSelect(
                                                                        recent
                                                                    )
                                                                }
                                                            >
                                                                🕘{" "}
                                                                {recent}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="btn btn-sm text-muted me-2"
                                                                onClick={() =>
                                                                    removeRecentSearch(
                                                                        recent
                                                                    )
                                                                }
                                                                title="Remove recent search"
                                                            >
                                                                ✕
                                                            </button>

                                                        </div>

                                                    )
                                                )}

                                            </>

                                        )}

                                        {/* =================================================
                                            NO SUGGESTIONS
                                        ================================================= */}

                                        {suggestions.length === 0 &&
                                            recentSearches.length === 0 && (

                                                <div className="px-3 py-4 text-center">

                                                    <div className="fs-3 mb-2">
                                                        🔎
                                                    </div>

                                                    <div className="fw-semibold">
                                                        Search members
                                                    </div>

                                                    <small className="text-muted">
                                                        Try a name, email or phone number.
                                                    </small>

                                                </div>

                                            )}

                                    </div>

                                )}

                            </div>

                            {/* =================================================
                                STATUS
                            ================================================= */}

                            <div className="col-12 col-md-4 col-xl-2">

                                <label className="form-label fw-semibold">
                                    Status
                                </label>

                                <select
                                    className="form-select"
                                    value={
                                        activeFilter
                                    }
                                    onChange={(event) =>
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

                            {/* =================================================
                                SORT
                            ================================================= */}

                            <div className="col-12 col-md-4 col-xl-2">

                                <label className="form-label fw-semibold">
                                    Sort By
                                </label>

                                <select
                                    className="form-select"
                                    value={
                                        ordering
                                    }
                                    onChange={(event) =>
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

                            {/* =================================================
                                BUTTONS
                            ================================================= */}

                            <div className="col-12 col-md-4 col-xl-3">

                                <div className="d-flex gap-2">

                                    <button
                                        type="submit"
                                        className="btn btn-primary flex-grow-1"
                                        disabled={
                                            loading
                                        }
                                    >
                                        🔍 Search
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={
                                            handleClearFilters
                                        }
                                        disabled={
                                            loading
                                        }
                                    >
                                        Clear
                                    </button>

                                </div>

                            </div>

                        </div>

                    </form>

                </div>

            </div>

            {/* =================================================
                ACTIVE FILTER SUMMARY
            ================================================= */}

            {(search ||
                activeFilter ||
                ordering) && (

                <div className="card border-0 bg-light mb-4">

                    <div className="card-body py-3">

                        <div className="d-flex flex-wrap align-items-center gap-2">

                            <span className="text-muted small fw-semibold">
                                Active:
                            </span>

                            {search && (

                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                    🔍 {search}
                                </span>

                            )}

                            {activeFilter && (

                                <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">
                                    Status:{" "}
                                    {getStatusLabel()}
                                </span>

                            )}

                            {ordering && (

                                <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">
                                    Sort:{" "}
                                    {getOrderingLabel()}
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

                </div>

            )}

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (

                <div
                    className="alert alert-danger border-0 shadow-sm"
                    role="alert"
                >

                    <div className="d-flex justify-content-between align-items-start gap-3">

                        <div>

                            <h6 className="fw-bold mb-2">
                                ⚠️ Unable to complete request
                            </h6>

                            <pre
                                className="mb-0 text-danger"
                                style={{
                                    whiteSpace:
                                        "pre-wrap",
                                    wordBreak:
                                        "break-word",
                                }}
                            >
                                {error}
                            </pre>

                        </div>

                        <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() =>
                                fetchMembers(
                                    buildQuery()
                                )
                            }
                        >
                            🔄 Retry
                        </button>

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

                </div>

            )}

            {/* =================================================
                EMPTY
            ================================================= */}

            {!loading &&
                !error &&
                members.length === 0 && (

                    <div className="card border-0 shadow-sm">

                        <div className="card-body text-center py-5">

                            <div className="display-4 mb-3">
                                👥
                            </div>

                            <h4 className="fw-bold">
                                No members found
                            </h4>

                            <p className="text-muted mb-4">
                                No members match your current search or filters.
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
                MEMBERS TABLE
            ================================================= */}

            {!loading &&
                !error &&
                members.length > 0 && (

                    <div className="card border-0 shadow-sm">

                        {/* =================================================
                            TABLE HEADER
                        ================================================= */}

                        <div className="card-header bg-white border-0 py-3">

                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">

                                <div>

                                    <h5 className="fw-bold mb-1">
                                        Members List
                                    </h5>

                                    <small className="text-muted">

                                        Showing{" "}

                                        <strong>
                                            {members.length}
                                        </strong>{" "}

                                        member
                                        {members.length !== 1
                                            ? "s"
                                            : ""}

                                        {totalMembers >
                                            members.length && (
                                                <>
                                                    {" "}of{" "}
                                                    <strong>
                                                        {
                                                            totalMembers
                                                        }
                                                    </strong>
                                                </>
                                            )}

                                    </small>

                                </div>

                                <span className="badge bg-primary align-self-start align-self-md-center">
                                    {totalMembers} Total
                                </span>

                            </div>

                        </div>

                        {/* =================================================
                            TABLE
                        ================================================= */}

                        <div className="card-body p-0">

                            <div className="table-responsive">

                                <table className="table table-hover align-middle mb-0">

                                    <thead className="table-dark">

                                        <tr>

                                            <th
                                                className="px-3"
                                                style={{
                                                    width:
                                                        "70px",
                                                }}
                                            >
                                                #
                                            </th>

                                            <th>
                                                Member
                                            </th>

                                            <th>
                                                Email
                                            </th>

                                            <th>
                                                Phone
                                            </th>

                                            <th>
                                                Address
                                            </th>

                                            <th>
                                                Joined
                                            </th>

                                            <th>
                                                Status
                                            </th>

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

                                                    {/* NUMBER */}

                                                    <td className="px-3 text-muted fw-semibold">
                                                        {index + 1}
                                                    </td>

                                                    {/* MEMBER */}

                                                    <td>

                                                        <div className="d-flex align-items-center gap-3">

                                                            <div
                                                                className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                                                                style={{
                                                                    width:
                                                                        "42px",
                                                                    height:
                                                                        "42px",
                                                                }}
                                                            >
                                                                {getMemberInitial(
                                                                    member.name
                                                                )}
                                                            </div>

                                                            <div>

                                                                <div className="fw-semibold">
                                                                    {
                                                                        member.name
                                                                    }
                                                                </div>

                                                                {member.user_id && (

                                                                    <small className="text-muted">
                                                                        User ID:{" "}
                                                                        {
                                                                            member.user_id
                                                                        }
                                                                    </small>

                                                                )}

                                                            </div>

                                                        </div>

                                                    </td>

                                                    {/* EMAIL */}

                                                    <td>
                                                        {member.email || (
                                                            <span className="text-muted">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* PHONE */}

                                                    <td>

                                                        {member.phone ? (

                                                            member.phone

                                                        ) : (

                                                            <span className="text-muted">
                                                                —
                                                            </span>

                                                        )}

                                                    </td>

                                                    {/* ADDRESS */}

                                                    <td
                                                        style={{
                                                            minWidth:
                                                                "180px",
                                                            maxWidth:
                                                                "280px",
                                                        }}
                                                    >

                                                        {member.address ? (

                                                            <span
                                                                title={
                                                                    member.address
                                                                }
                                                            >

                                                                {member.address.length >
                                                                70
                                                                    ? `${member.address.slice(
                                                                        0,
                                                                        70
                                                                    )}...`
                                                                    : member.address}

                                                            </span>

                                                        ) : (

                                                            <span className="text-muted">
                                                                —
                                                            </span>

                                                        )}

                                                    </td>

                                                    {/* JOINED */}

                                                    <td>

                                                        {member.joined_date ? (

                                                            new Date(
                                                                member.joined_date
                                                            ).toLocaleDateString()

                                                        ) : (

                                                            <span className="text-muted">
                                                                —
                                                            </span>

                                                        )}

                                                    </td>

                                                    {/* STATUS */}

                                                    <td>

                                                        {member.is_active ? (

                                                            <span className="badge bg-success-subtle text-success border border-success-subtle">
                                                                ● Active
                                                            </span>

                                                        ) : (

                                                            <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">
                                                                ● Inactive
                                                            </span>

                                                        )}

                                                    </td>

                                                    {/* ACTIONS */}

                                                    {canManageMembers && (

                                                        <td>

                                                            <div className="d-flex flex-wrap gap-2">

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

                        {/* =================================================
                            PAGINATION
                        ================================================= */}

                        {(previousPage ||
                            nextPage) && (

                            <div className="card-footer bg-white border-0 py-3">

                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">

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

                                    <div className="text-center">

                                        <div className="fw-semibold">
                                            Members
                                        </div>

                                        <small className="text-muted">
                                            Showing {members.length} of{" "}
                                            {totalMembers}
                                        </small>

                                    </div>

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

                            </div>

                        )}

                    </div>

                )}

            {/* =================================================
                ADD / EDIT MODAL
            ================================================= */}

            {showModal && (

                <>

                    <div
                        className="modal fade show d-block"
                        tabIndex="-1"
                        role="dialog"
                        aria-modal="true"
                    >

                        <div className="modal-dialog modal-lg modal-dialog-centered">

                            <div className="modal-content border-0 shadow-lg">

                                {/* HEADER */}

                                <div className="modal-header">

                                    <div>

                                        <h5 className="modal-title fw-bold mb-1">

                                            {editingMember
                                                ? "✏️ Edit Member"
                                                : "👤 Add Member"}

                                        </h5>

                                        <small className="text-muted">

                                            {editingMember
                                                ? "Update member information."
                                                : "Create a member profile for an existing member-role user."}

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

                                {/* FORM */}

                                <form
                                    onSubmit={
                                        handleSubmit
                                    }
                                >

                                    <div className="modal-body">

                                        {formError && (

                                            <div className="alert alert-danger">

                                                <div className="fw-semibold mb-1">
                                                    Please fix the following:
                                                </div>

                                                <pre
                                                    className="mb-0"
                                                    style={{
                                                        whiteSpace:
                                                            "pre-wrap",
                                                        wordBreak:
                                                            "break-word",
                                                    }}
                                                >
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
                                                        value={
                                                            userId
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            setUserId(
                                                                event.target.value
                                                            )
                                                        }
                                                        placeholder="Enter existing user ID"
                                                        min="1"
                                                        disabled={
                                                            saving
                                                        }
                                                    />

                                                    <div className="form-text">
                                                        The user must already exist with the member role.
                                                    </div>

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
                                                    value={
                                                        name
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setName(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Enter member name"
                                                    disabled={
                                                        saving
                                                    }
                                                    required
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
                                                    value={
                                                        email
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setEmail(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Enter email address"
                                                    disabled={
                                                        saving
                                                    }
                                                    required
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
                                                    value={
                                                        phone
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setPhone(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Enter phone number"
                                                    disabled={
                                                        saving
                                                    }
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
                                                    value={
                                                        address
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setAddress(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Enter member address"
                                                    disabled={
                                                        saving
                                                    }
                                                />

                                            </div>

                                            {/* ACTIVE */}

                                            <div className="col-12">

                                                <div className="form-check form-switch">

                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        role="switch"
                                                        id="memberActive"
                                                        checked={
                                                            isActive
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            setIsActive(
                                                                event.target.checked
                                                            )
                                                        }
                                                        disabled={
                                                            saving
                                                        }
                                                    />

                                                    <label
                                                        className="form-check-label fw-semibold"
                                                        htmlFor="memberActive"
                                                    >
                                                        Active Member
                                                    </label>

                                                </div>

                                                <small className="text-muted">
                                                    Inactive members can remain in the system without being considered active library members.
                                                </small>

                                            </div>

                                        </div>

                                    </div>

                                    {/* FOOTER */}

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

                    {/* BACKDROP */}

                    <div
                        className="modal-backdrop fade show"
                        onClick={
                            saving
                                ? undefined
                                : closeModal
                        }
                    />

                </>

            )}

        </div>
    );
}

export default Members;