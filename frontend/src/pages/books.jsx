import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/authcontext";

function Books() {
    const { user } = useAuth();

    const [books, setBooks] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [categories, setCategories] = useState([]);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    // =========================
    // PAGINATION
    // =========================

    const [nextPage, setNextPage] = useState(null);
    const [previousPage, setPreviousPage] = useState(null);

    // =========================
    // SEARCH / FILTER / ORDERING
    // =========================

    const [search, setSearch] = useState("");
    const [ordering, setOrdering] = useState("");
    const [selectedAuthor, setSelectedAuthor] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");

    // =========================
    // SEARCH SUGGESTIONS
    // =========================

    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);

    const searchContainerRef = useRef(null);
    const searchTimerRef = useRef(null);

    // =========================
    // USER RECENT SEARCH KEY
    // =========================

    const getRecentSearchStorageKey = () => {
        if (!user) {
            return null;
        }

        const username = String(
            user.username || "unknown"
        )
            .trim()
            .toLowerCase();

        const role = String(
            user.role || "unknown"
        )
            .trim()
            .toLowerCase();

        return `library_recent_book_searches_${role}_${username}`;
    };

    // =========================
    // MODAL
    // =========================

    const [showModal, setShowModal] = useState(false);
    const [editingBook, setEditingBook] = useState(null);

    // =========================
    // FORM
    // =========================

    const [formData, setFormData] = useState({
        title: "",
        author: "",
        isbn: "",
        quantity: "",
        category: "",
        cover: null,
    });

    const [coverPreview, setCoverPreview] = useState("");

    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    // =========================
    // ROLE CHECK
    // =========================

    const canManageBooks =
        user?.role === "admin" ||
        user?.role === "librarian";

    // =========================
    // EXTRACT RESULTS
    // =========================

    const extractResults = (data) => {
        if (
            data &&
            Array.isArray(data.results)
        ) {
            return data.results;
        }

        if (Array.isArray(data)) {
            return data;
        }

        return [];
    };

    // =========================
    // FETCH ALL PAGINATED DATA
    // =========================
    //
    // Important:
    // Categories and authors are paginated
    // by Django REST Framework.
    //
    // This function keeps requesting every
    // page until "next" becomes null.
    // =========================

    const fetchAllPages = async (initialUrl) => {
        let allResults = [];
        let nextUrl = initialUrl;

        while (nextUrl) {
            const response = await api.get(nextUrl);

            const pageResults =
                extractResults(response.data);

            allResults = [
                ...allResults,
                ...pageResults,
            ];

            if (
                response.data &&
                response.data.next
            ) {
                nextUrl = response.data.next;
            } else {
                nextUrl = null;
            }
        }

        return allResults;
    };

    // =========================
    // GET BOOK CATEGORY
    // =========================

    const getBookCategory = (book) => {
        if (
            typeof book.category === "object" &&
            book.category !== null
        ) {
            return (
                book.category.name ||
                book.category.title ||
                ""
            );
        }

        return (
            book.category_name ||
            book.category ||
            ""
        );
    };

    // =========================
    // GET BOOK AUTHOR
    // =========================

    const getBookAuthor = (book) => {
        return (
            book.author_name ||
            book.author?.name ||
            book.author ||
            "Unknown Author"
        );
    };

    // =========================
    // GET BOOK AVAILABLE
    // =========================

    const getBookAvailable = (book) => {
        if (
            book.available !== undefined &&
            book.available !== null
        ) {
            return Number(book.available);
        }

        if (
            book.available_quantity !== undefined &&
            book.available_quantity !== null
        ) {
            return Number(
                book.available_quantity
            );
        }

        return Number(book.quantity || 0);
    };

    // =========================
    // GET CATEGORY ID
    // =========================

    const getBookCategoryId = (book) => {
        if (
            typeof book.category === "number" ||
            typeof book.category === "string"
        ) {
            return book.category;
        }

        if (
            typeof book.category === "object" &&
            book.category !== null
        ) {
            return book.category.id || "";
        }

        return book.category_id || "";
    };

    // =========================
    // GET AUTHOR ID
    // =========================

    const getBookAuthorId = (book) => {
        if (
            typeof book.author === "number" ||
            typeof book.author === "string"
        ) {
            return book.author;
        }

        if (
            typeof book.author === "object" &&
            book.author !== null
        ) {
            return book.author.id || "";
        }

        return book.author_id || "";
    };

    // =========================
    // GET COVER URL
    // =========================

    const getCoverUrl = (book) => {
        const cover =
            book.cover ||
            book.cover_image ||
            "";

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
            return `http://127.0.0.1:8001${cover}`;
        }

        return `http://127.0.0.1:8001/media/${cover}`;
    };

    // =========================
    // BUILD BOOK URL
    // =========================

    const buildBookUrl = (
        nextSearch = search,
        nextOrdering = ordering,
        nextAuthor = selectedAuthor,
        nextCategory = selectedCategory
    ) => {
        const params = new URLSearchParams();

        if (nextSearch.trim()) {
            params.append(
                "search",
                nextSearch.trim()
            );
        }

        if (nextOrdering) {
            params.append(
                "ordering",
                nextOrdering
            );
        }

        if (nextAuthor) {
            params.append(
                "author",
                nextAuthor
            );
        }

        if (nextCategory) {
            params.append(
                "category",
                nextCategory
            );
        }

        const queryString =
            params.toString();

        return queryString
            ? `books/?${queryString}`
            : "books/";
    };

    // =========================
    // FETCH BOOKS
    // =========================

    const fetchBooks = async (url = null) => {
        try {
            setLoading(true);
            setError("");

            const requestUrl =
                url || buildBookUrl();

            const response =
                await api.get(requestUrl);

            console.log(
                "BOOK API RESPONSE:",
                response.data
            );

            const results =
                extractResults(
                    response.data
                );

            setBooks(results);

            if (
                response.data &&
                Array.isArray(
                    response.data.results
                )
            ) {
                setNextPage(
                    response.data.next || null
                );

                setPreviousPage(
                    response.data.previous ||
                    null
                );
            } else {
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
            setNextPage(null);
            setPreviousPage(null);

        } finally {
            setLoading(false);
        }
    };

    // =========================
    // FETCH ALL AUTHORS
    // =========================

    const fetchAuthors = async () => {
        try {
            const results =
                await fetchAllPages(
                    "authors/"
                );

            console.log(
                "ALL AUTHORS:",
                results
            );

            setAuthors(results);

        } catch (error) {
            console.error(
                "AUTHOR API ERROR:",
                error.response?.data ||
                error.message
            );

            setAuthors([]);
        }
    };

    // =========================
    // FETCH ALL CATEGORIES
    // =========================

    const fetchCategories = async () => {
        try {
            const results =
                await fetchAllPages(
                    "categories/"
                );

            console.log(
                "ALL CATEGORIES:",
                results
            );

            setCategories(results);

        } catch (error) {
            console.error(
                "CATEGORY API ERROR:",
                error.response?.data ||
                error.message
            );

            setCategories([]);
        }
    };

    // =========================
    // LOAD RECENT SEARCHES
    // =========================

    useEffect(() => {
        setRecentSearches([]);

        const storageKey =
            getRecentSearchStorageKey();

        if (!storageKey) {
            return;
        }

        try {
            const stored =
                localStorage.getItem(
                    storageKey
                );

            if (stored) {
                const parsed =
                    JSON.parse(stored);

                if (Array.isArray(parsed)) {
                    setRecentSearches(
                        parsed
                    );
                }
            }

        } catch (error) {
            console.error(
                "RECENT SEARCH ERROR:",
                error
            );
        }
    }, [
        user?.username,
        user?.role,
    ]);

    // =========================
    // INITIAL LOAD
    // =========================

    useEffect(() => {
        fetchBooks();
        fetchAuthors();
        fetchCategories();
    }, []);

    // =========================
    // CLEAN SEARCH TIMER
    // =========================

    useEffect(() => {
        return () => {
            if (searchTimerRef.current) {
                clearTimeout(
                    searchTimerRef.current
                );
            }
        };
    }, []);

    // =========================
    // CLOSE SEARCH SUGGESTIONS
    // =========================

    useEffect(() => {
        const handleClickOutside = (
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
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    // =========================
    // SEARCH SUGGESTIONS
    // =========================

    const fetchSearchSuggestions = async (
        value
    ) => {
        const trimmedValue =
            value.trim();

        if (
            trimmedValue.length < 2
        ) {
            setSuggestions([]);
            return;
        }

        try {
            const params =
                new URLSearchParams();

            params.append(
                "search",
                trimmedValue
            );

            const response =
                await api.get(
                    `books/?${params.toString()}`
                );

            const results =
                extractResults(
                    response.data
                );

            setSuggestions(
                results.slice(0, 6)
            );

        } catch (error) {
            console.error(
                "SEARCH SUGGESTION ERROR:",
                error.response?.data ||
                error.message
            );

            const lower =
                trimmedValue.toLowerCase();

            const fallback =
                books.filter((book) => {
                    const title =
                        String(
                            book.title || ""
                        ).toLowerCase();

                    const author =
                        String(
                            getBookAuthor(book)
                        ).toLowerCase();

                    const isbn =
                        String(
                            book.isbn || ""
                        ).toLowerCase();

                    return (
                        title.startsWith(
                            lower
                        ) ||
                        author.startsWith(
                            lower
                        ) ||
                        isbn.startsWith(
                            lower
                        )
                    );
                });

            setSuggestions(
                fallback.slice(0, 6)
            );
        }
    };

    // =========================
    // SEARCH CHANGE
    // =========================

    const handleSearchChange = (
        event
    ) => {
        const value =
            event.target.value;

        setSearch(value);
        setShowSuggestions(true);

        if (searchTimerRef.current) {
            clearTimeout(
                searchTimerRef.current
            );
        }

        if (
            value.trim().length < 2
        ) {
            setSuggestions([]);
            return;
        }

        searchTimerRef.current =
            setTimeout(() => {
                fetchSearchSuggestions(
                    value
                );
            }, 300);
    };

    // =========================
    // SAVE RECENT SEARCH
    // =========================

    const saveRecentSearch = (
        value
    ) => {
        const trimmed =
            value.trim();

        if (!trimmed) {
            return;
        }

        const storageKey =
            getRecentSearchStorageKey();

        if (!storageKey) {
            return;
        }

        const updated = [
            trimmed,
            ...recentSearches.filter(
                (item) =>
                    item.toLowerCase() !==
                    trimmed.toLowerCase()
            ),
        ].slice(0, 5);

        setRecentSearches(updated);

        localStorage.setItem(
            storageKey,
            JSON.stringify(updated)
        );
    };

    // =========================
    // SEARCH SUBMIT
    // =========================

    const handleSearch = (
        event
    ) => {
        event.preventDefault();

        saveRecentSearch(search);

        setShowSuggestions(false);

        fetchBooks(
            buildBookUrl(
                search,
                ordering,
                selectedAuthor,
                selectedCategory
            )
        );
    };

    // =========================
    // SELECT SUGGESTION
    // =========================

    const handleSuggestionClick = (
        book
    ) => {
        const title =
            book.title || "";

        setSearch(title);

        saveRecentSearch(title);

        setShowSuggestions(false);

        fetchBooks(
            buildBookUrl(
                title,
                ordering,
                selectedAuthor,
                selectedCategory
            )
        );
    };

    // =========================
    // SELECT RECENT SEARCH
    // =========================

    const handleRecentSearchClick = (
        term
    ) => {
        setSearch(term);

        setShowSuggestions(false);

        saveRecentSearch(term);

        fetchBooks(
            buildBookUrl(
                term,
                ordering,
                selectedAuthor,
                selectedCategory
            )
        );
    };

    // =========================
    // CLEAR RECENT SEARCHES
    // =========================

    const clearRecentSearches = () => {
        setRecentSearches([]);

        const storageKey =
            getRecentSearchStorageKey();

        if (!storageKey) {
            return;
        }

        localStorage.removeItem(
            storageKey
        );
    };

    // =========================
    // CLEAR FILTERS
    // =========================

    const handleClearFilters = () => {
        setSearch("");
        setOrdering("");
        setSelectedAuthor("");
        setSelectedCategory("");

        setSuggestions([]);
        setShowSuggestions(false);

        fetchBooks("books/");
    };

    // =========================
    // FILTER CHANGE
    // =========================

    const handleFilterChange = (
        filterName,
        value
    ) => {
        let nextSearch = search;
        let nextOrdering = ordering;
        let nextAuthor = selectedAuthor;
        let nextCategory =
            selectedCategory;

        if (filterName === "author") {
            nextAuthor = value;
            setSelectedAuthor(value);
        }

        if (filterName === "category") {
            nextCategory = value;
            setSelectedCategory(value);
        }

        if (filterName === "ordering") {
            nextOrdering = value;
            setOrdering(value);
        }

        const url = buildBookUrl(
            nextSearch,
            nextOrdering,
            nextAuthor,
            nextCategory
        );

        fetchBooks(url);
    };

    // =========================
    // FORM CHANGE
    // =========================

    const handleChange = (
        event
    ) => {
        const {
            name,
            value,
            files,
        } = event.target;

        if (name === "cover") {
            const file =
                files?.[0] || null;

            setFormData((previous) => ({
                ...previous,
                cover: file,
            }));

            if (file) {
                const previewUrl =
                    URL.createObjectURL(
                        file
                    );

                setCoverPreview(
                    previewUrl
                );
            } else {
                setCoverPreview("");
            }

            return;
        }

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
            category: "",
            cover: null,
        });

        setCoverPreview("");
        setFormError("");
        setShowModal(true);
    };

    // =========================
    // OPEN EDIT MODAL
    // =========================

    const handleEditBook = (
        book
    ) => {
        setEditingBook(book);

        setFormData({
            title:
                book.title || "",

            author:
                getBookAuthorId(book),

            isbn:
                book.isbn || "",

            quantity:
                book.quantity ?? "",

            category:
                getBookCategoryId(book),

            cover: null,
        });

        setCoverPreview(
            getCoverUrl(book)
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
        setEditingBook(null);
        setFormError("");
        setCoverPreview("");

        setFormData({
            title: "",
            author: "",
            isbn: "",
            quantity: "",
            category: "",
            cover: null,
        });
    };

    // =========================
    // ADD / EDIT BOOK
    // =========================

    const handleSubmit = async (
        event
    ) => {
        event.preventDefault();

        setFormError("");

        if (
            !formData.title.trim() ||
            !formData.author ||
            !formData.isbn.trim() ||
            formData.quantity === ""
        ) {
            setFormError(
                "Please fill in all required fields."
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

        // =========================
        // FORM DATA FOR MULTIPART
        // =========================

        const bookData =
            new FormData();

        bookData.append(
            "title",
            formData.title.trim()
        );

        bookData.append(
            "author",
            String(
                formData.author
            )
        );

        bookData.append(
            "isbn",
            formData.isbn.trim()
        );

        bookData.append(
            "quantity",
            String(
                Number(formData.quantity)
            )
        );

        if (formData.category) {
            bookData.append(
                "category",
                String(
                    formData.category
                )
            );
        }

        if (formData.cover) {
            bookData.append(
                "cover",
                formData.cover
            );
        }

        try {
            setSaving(true);

            if (editingBook) {
                await api.put(
                    `books/${editingBook.id}/`,
                    bookData,
                    {
                        headers: {
                            "Content-Type":
                                "multipart/form-data",
                        },
                    }
                );
            } else {
                await api.post(
                    "books/",
                    bookData,
                    {
                        headers: {
                            "Content-Type":
                                "multipart/form-data",
                        },
                    }
                );
            }

            closeModal();

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

    const handleDeleteBook = async (
        book
    ) => {
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
        if (
            nextPage &&
            !loading
        ) {
            fetchBooks(nextPage);
        }
    };

    const handlePreviousPage = () => {
        if (
            previousPage &&
            !loading
        ) {
            fetchBooks(previousPage);
        }
    };

    // =========================
    // LOCAL SUGGESTIONS
    // =========================

    const localSuggestions =
        useMemo(() => {
            if (
                search.trim().length < 2
            ) {
                return [];
            }

            const lower =
                search.trim().toLowerCase();

            return books
                .filter((book) => {
                    const title =
                        String(
                            book.title || ""
                        ).toLowerCase();

                    const author =
                        String(
                            getBookAuthor(book)
                        ).toLowerCase();

                    const isbn =
                        String(
                            book.isbn || ""
                        ).toLowerCase();

                    return (
                        title.startsWith(
                            lower
                        ) ||
                        author.startsWith(
                            lower
                        ) ||
                        isbn.startsWith(
                            lower
                        )
                    );
                })
                .slice(0, 6);
        }, [books, search]);

    const displayedSuggestions =
        suggestions.length > 0
            ? suggestions
            : localSuggestions;

    const showRecent =
        showSuggestions &&
        search.trim().length === 0 &&
        recentSearches.length > 0;

    // =========================
    // UI
    // =========================

    return (
        <div className="container py-4">

            {/* =========================
                HEADER
            ========================== */}

            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">

                <div>

                    <div className="d-flex align-items-center gap-2 mb-2">

                        <span
                            className="fs-2"
                            aria-hidden="true"
                        >
                            📚
                        </span>

                        <h1 className="fw-bold mb-0">
                            Library Books
                        </h1>

                    </div>

                    <p className="text-muted mb-0">
                        Discover, search and explore
                        the books available in your
                        library.
                    </p>

                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">

                    <span className="badge bg-primary rounded-pill px-3 py-2">
                        {books.length} Books
                    </span>

                    {canManageBooks && (
                        <button
                            className="btn btn-primary px-3"
                            onClick={
                                handleAddBook
                            }
                        >
                            + Add Book
                        </button>
                    )}

                </div>

            </div>

            {/* =========================
                SEARCH HERO
            ========================== */}

            <div className="card border-0 shadow-sm mb-4 overflow-visible">

                <div className="card-body p-4">

                    <div className="mb-3">

                        <h5 className="fw-bold mb-1">
                            Find your next book 🔎
                        </h5>

                        <p className="text-muted small mb-0">
                            Search by title, author or
                            ISBN. Start typing to see
                            suggestions.
                        </p>

                    </div>

                    <form
                        onSubmit={
                            handleSearch
                        }
                    >

                        <div
                            className="position-relative"
                            ref={
                                searchContainerRef
                            }
                        >

                            <div className="input-group input-group-lg">

                                <span className="input-group-text bg-white">
                                    🔍
                                </span>

                                <input
                                    type="text"
                                    className="form-control border-start-0"
                                    placeholder="Search books, authors or ISBN..."
                                    value={
                                        search
                                    }
                                    onChange={
                                        handleSearchChange
                                    }
                                    onFocus={() =>
                                        setShowSuggestions(
                                            true
                                        )
                                    }
                                />

                                {search && (
                                    <button
                                        type="button"
                                        className="btn btn-light border"
                                        onClick={() => {
                                            setSearch(
                                                ""
                                            );
                                            setSuggestions(
                                                []
                                            );
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    className="btn btn-primary px-4"
                                >
                                    Search
                                </button>

                            </div>

                            {/* SEARCH DROPDOWN */}

                            {showSuggestions &&
                                (
                                    displayedSuggestions.length >
                                        0 ||
                                    showRecent
                                ) && (

                                    <div
                                        className="position-absolute bg-white border rounded-3 shadow w-100 mt-2"
                                        style={{
                                            zIndex: 1050,
                                            maxHeight:
                                                "420px",
                                            overflowY:
                                                "auto",
                                        }}
                                    >

                                        {showRecent ? (

                                            <>

                                                <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">

                                                    <small className="fw-bold text-muted">
                                                        🕘 Recent searches
                                                    </small>

                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-link text-danger text-decoration-none"
                                                        onClick={
                                                            clearRecentSearches
                                                        }
                                                    >
                                                        Clear
                                                    </button>

                                                </div>

                                                {recentSearches.map(
                                                    (
                                                        term,
                                                        index
                                                    ) => (

                                                        <button
                                                            key={`${term}-${index}`}
                                                            type="button"
                                                            className="dropdown-item py-3 px-3"
                                                            onClick={() =>
                                                                handleRecentSearchClick(
                                                                    term
                                                                )
                                                            }
                                                        >

                                                            <div className="d-flex align-items-center gap-2">

                                                                <span>
                                                                    🕘
                                                                </span>

                                                                <span>
                                                                    {
                                                                        term
                                                                    }
                                                                </span>

                                                            </div>

                                                        </button>

                                                    )
                                                )}

                                            </>

                                        ) : (

                                            <>

                                                <div className="px-3 py-2 border-bottom">

                                                    <small className="fw-bold text-muted">
                                                        📚 Book suggestions
                                                    </small>

                                                </div>

                                                {displayedSuggestions.map(
                                                    (
                                                        book
                                                    ) => {

                                                        const available =
                                                            getBookAvailable(
                                                                book
                                                            );

                                                        return (
                                                            <button
                                                                type="button"
                                                                key={
                                                                    book.id
                                                                }
                                                                className="dropdown-item px-3 py-3"
                                                                onClick={() =>
                                                                    handleSuggestionClick(
                                                                        book
                                                                    )
                                                                }
                                                            >

                                                                <div className="d-flex gap-3">

                                                                    <div
                                                                        className="d-flex align-items-center justify-content-center bg-primary-subtle rounded-3 flex-shrink-0 overflow-hidden"
                                                                        style={{
                                                                            width: "48px",
                                                                            height: "64px",
                                                                        }}
                                                                    >

                                                                        {getCoverUrl(
                                                                            book
                                                                        ) ? (

                                                                            <img
                                                                                src={getCoverUrl(
                                                                                    book
                                                                                )}
                                                                                alt={
                                                                                    book.title
                                                                                }
                                                                                className="w-100 h-100"
                                                                                style={{
                                                                                    objectFit:
                                                                                        "cover",
                                                                                }}
                                                                            />

                                                                        ) : (

                                                                            <span>
                                                                                📖
                                                                            </span>

                                                                        )}

                                                                    </div>

                                                                    <div className="flex-grow-1 text-start">

                                                                        <div className="fw-bold text-dark">
                                                                            {
                                                                                book.title
                                                                            }
                                                                        </div>

                                                                        <div className="small text-muted">
                                                                            ✍️{" "}
                                                                            {
                                                                                getBookAuthor(
                                                                                    book
                                                                                )
                                                                            }
                                                                        </div>

                                                                        <div className="small text-muted mt-1">
                                                                            ISBN:{" "}
                                                                            {
                                                                                book.isbn ||
                                                                                "N/A"
                                                                            }
                                                                        </div>

                                                                        <div className="mt-1">

                                                                            <span
                                                                                className={`badge ${
                                                                                    available >
                                                                                    0
                                                                                        ? "bg-success"
                                                                                        : "bg-danger"
                                                                                }`}
                                                                            >
                                                                                {available >
                                                                                0
                                                                                    ? `${available} available`
                                                                                    : "Currently unavailable"}
                                                                            </span>

                                                                        </div>

                                                                    </div>

                                                                </div>

                                                            </button>
                                                        );
                                                    }
                                                )}

                                            </>

                                        )}

                                    </div>

                                )}

                        </div>

                    </form>

                </div>

            </div>

            {/* =========================
                FILTERS
            ========================== */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body">

                    <div className="row g-3">

                        {/* CATEGORY */}

                        <div className="col-md-4">

                            <label className="form-label fw-semibold">
                                🏷️ Category
                            </label>

                            <select
                                className="form-select"
                                value={
                                    selectedCategory
                                }
                                onChange={(event) =>
                                    handleFilterChange(
                                        "category",
                                        event.target.value
                                    )
                                }
                            >

                                <option value="">
                                    All Categories
                                </option>

                                {categories.map(
                                    (category) => (

                                        <option
                                            key={
                                                category.id
                                            }
                                            value={
                                                category.id
                                            }
                                        >
                                            {
                                                category.name
                                            }
                                        </option>

                                    )
                                )}

                            </select>

                            {categories.length >
                                0 && (
                                <small className="text-muted">
                                    {categories.length} categories loaded
                                </small>
                            )}

                            {categories.length ===
                                0 && (
                                <small className="text-danger">
                                    No categories available.
                                </small>
                            )}

                        </div>

                        {/* AUTHOR */}

                        <div className="col-md-4">

                            <label className="form-label fw-semibold">
                                ✍️ Author
                            </label>

                            <select
                                className="form-select"
                                value={
                                    selectedAuthor
                                }
                                onChange={(event) =>
                                    handleFilterChange(
                                        "author",
                                        event.target.value
                                    )
                                }
                            >

                                <option value="">
                                    All Authors
                                </option>

                                {authors.map(
                                    (author) => (

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

                            {authors.length >
                                0 && (
                                <small className="text-muted">
                                    {authors.length} authors loaded
                                </small>
                            )}

                        </div>

                        {/* ORDERING */}

                        <div className="col-md-4">

                            <label className="form-label fw-semibold">
                                ↕️ Sort Books
                            </label>

                            <select
                                className="form-select"
                                value={
                                    ordering
                                }
                                onChange={(event) =>
                                    handleFilterChange(
                                        "ordering",
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

                    </div>

                    {(search ||
                        ordering ||
                        selectedAuthor ||
                        selectedCategory) && (

                        <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">

                            <small className="text-muted">
                                Filters are active
                            </small>

                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={
                                    handleClearFilters
                                }
                            >
                                Clear all filters
                            </button>

                        </div>

                    )}

                </div>

            </div>

            {/* =========================
                ERROR
            ========================== */}

            {error && (
                <div
                    className="alert alert-danger border-0 shadow-sm"
                    role="alert"
                >

                    <h6 className="fw-bold">
                        Unable to complete request
                    </h6>

                    <pre className="mb-0 text-danger small">
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
                        Finding books...
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

                            <div className="display-4 mb-3">
                                📚
                            </div>

                            <h4 className="fw-bold">
                                No books found
                            </h4>

                            <p className="text-muted mb-4">
                                Try changing your search
                                or filters.
                            </p>

                            {(search ||
                                ordering ||
                                selectedAuthor ||
                                selectedCategory) && (

                                <button
                                    className="btn btn-outline-primary me-2"
                                    onClick={
                                        handleClearFilters
                                    }
                                >
                                    Clear Filters
                                </button>
                            )}

                            {canManageBooks && (
                                <button
                                    className="btn btn-primary"
                                    onClick={
                                        handleAddBook
                                    }
                                >
                                    + Add First Book
                                </button>
                            )}

                        </div>

                    </div>
                )}

            {/* =========================
                BOOK CARDS
            ========================== */}

            {!loading &&
                !error &&
                books.length > 0 && (

                    <>

                        <div className="d-flex justify-content-between align-items-center mb-3">

                            <div>

                                <h5 className="fw-bold mb-1">
                                    Available Books
                                </h5>

                                <small className="text-muted">
                                    Explore the library
                                    collection
                                </small>

                            </div>

                            <span className="text-muted small">
                                Showing{" "}
                                <strong>
                                    {books.length}
                                </strong>{" "}
                                books
                            </span>

                        </div>

                        <div className="row g-4">

                            {books.map(
                                (book) => {

                                    const available =
                                        getBookAvailable(
                                            book
                                        );

                                    const category =
                                        getBookCategory(
                                            book
                                        );

                                    const coverUrl =
                                        getCoverUrl(
                                            book
                                        );

                                    return (
                                        <div
                                            className="col-sm-6 col-lg-4 col-xl-3"
                                            key={
                                                book.id
                                            }
                                        >

                                            <div className="card h-100 border-0 shadow-sm overflow-hidden">

                                                {/* BOOK COVER */}

                                                <div
                                                    className="d-flex align-items-center justify-content-center bg-body-secondary"
                                                    style={{
                                                        height: "240px",
                                                    }}
                                                >

                                                    {coverUrl ? (

                                                        <img
                                                            src={
                                                                coverUrl
                                                            }
                                                            alt={
                                                                book.title
                                                            }
                                                            className="w-100 h-100"
                                                            style={{
                                                                objectFit:
                                                                    "cover",
                                                            }}
                                                        />

                                                    ) : (

                                                        <div className="text-center">

                                                            <div className="display-4">
                                                                📖
                                                            </div>

                                                            <small className="text-muted">
                                                                No cover available
                                                            </small>

                                                        </div>

                                                    )}

                                                </div>

                                                {/* BOOK CONTENT */}

                                                <div className="card-body d-flex flex-column">

                                                    {category && (
                                                        <div className="mb-2">

                                                            <span className="badge bg-primary-subtle text-primary">
                                                                🏷️{" "}
                                                                {
                                                                    category
                                                                }
                                                            </span>

                                                        </div>
                                                    )}

                                                    <h5 className="fw-bold mb-2">
                                                        {
                                                            book.title
                                                        }
                                                    </h5>

                                                    <p className="text-muted mb-2">
                                                        ✍️{" "}
                                                        {
                                                            getBookAuthor(
                                                                book
                                                            )
                                                        }
                                                    </p>

                                                    <div className="small text-muted mb-3">

                                                        <div>
                                                            ISBN:{" "}
                                                            <span className="font-monospace">
                                                                {
                                                                    book.isbn ||
                                                                    "N/A"
                                                                }
                                                            </span>
                                                        </div>

                                                    </div>

                                                    <div className="mt-auto">

                                                        <div className="d-flex justify-content-between align-items-center mb-3">

                                                            <span className="small text-muted">
                                                                Total copies
                                                            </span>

                                                            <span className="badge bg-secondary">
                                                                {
                                                                    book.quantity
                                                                }
                                                            </span>

                                                        </div>

                                                        <div className="d-flex justify-content-between align-items-center mb-3">

                                                            <span className="small text-muted">
                                                                Availability
                                                            </span>

                                                            <span
                                                                className={`badge rounded-pill ${
                                                                    available >
                                                                    0
                                                                        ? "bg-success"
                                                                        : "bg-danger"
                                                                }`}
                                                            >
                                                                {available >
                                                                0
                                                                    ? `${available} available`
                                                                    : "Unavailable"}
                                                            </span>

                                                        </div>

                                                        {canManageBooks && (
                                                            <div className="d-flex gap-2">

                                                                <button
                                                                    className="btn btn-sm btn-outline-primary flex-grow-1"
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
                                                                    🗑️
                                                                </button>

                                                            </div>
                                                        )}

                                                    </div>

                                                </div>

                                            </div>

                                        </div>
                                    );
                                }
                            )}

                        </div>

                        {/* PAGINATION */}

                        {(previousPage ||
                            nextPage) && (

                            <div className="d-flex justify-content-between align-items-center mt-5">

                                <button
                                    className="btn btn-outline-primary px-4"
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
                                        Browse more books
                                    </div>

                                    <small className="text-muted">
                                        Use the buttons to
                                        navigate pages
                                    </small>

                                </div>

                                <button
                                    className="btn btn-outline-primary px-4"
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
                    style={{
                        zIndex: 1060,
                    }}
                >

                    <div className="modal-dialog modal-dialog-centered modal-lg">

                        <div className="modal-content border-0 shadow">

                            <div className="modal-header">

                                <div>

                                    <h5 className="modal-title fw-bold mb-1">

                                        {editingBook
                                            ? "✏️ Edit Book"
                                            : "📚 Add New Book"}

                                    </h5>

                                    <small className="text-muted">
                                        Enter the book information
                                        below.
                                    </small>

                                </div>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={
                                        closeModal
                                    }
                                />

                            </div>

                            <form
                                onSubmit={
                                    handleSubmit
                                }
                            >

                                <div
                                    className="modal-body"
                                    style={{
                                        maxHeight:
                                            "75vh",
                                        overflowY:
                                            "auto",
                                    }}
                                >

                                    {formError && (
                                        <div className="alert alert-danger">

                                            <pre className="mb-0 small">
                                                {
                                                    formError
                                                }
                                            </pre>

                                        </div>
                                    )}

                                    <div className="row g-3">

                                        {/* TITLE */}

                                        <div className="col-12">

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

                                        {/* AUTHOR */}

                                        <div className="col-md-6">

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
                                                style={{
                                                    maxHeight:
                                                        "180px",
                                                }}
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

                                            <small className="text-muted">
                                                {authors.length} authors available
                                            </small>

                                        </div>

                                        {/* CATEGORY */}

                                        <div className="col-md-6">

                                            <label className="form-label fw-semibold">
                                                Category
                                            </label>

                                            <select
                                                name="category"
                                                className="form-select"
                                                value={
                                                    formData.category
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                style={{
                                                    maxHeight:
                                                        "180px",
                                                }}
                                            >

                                                <option value="">
                                                    Select a category
                                                </option>

                                                {categories.map(
                                                    (
                                                        category
                                                    ) => (

                                                        <option
                                                            key={
                                                                category.id
                                                            }
                                                            value={
                                                                category.id
                                                            }
                                                        >
                                                            {
                                                                category.name
                                                            }
                                                        </option>

                                                    )
                                                )}

                                            </select>

                                            {categories.length >
                                                0 && (
                                                <small className="text-muted">
                                                    {categories.length} categories available
                                                </small>
                                            )}

                                            {categories.length ===
                                                0 && (
                                                <small className="text-danger">
                                                    No categories available.
                                                </small>
                                            )}

                                        </div>

                                        {/* ISBN */}

                                        <div className="col-md-8">

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

                                        {/* QUANTITY */}

                                        <div className="col-md-4">

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
                                                placeholder="0"
                                            />

                                        </div>

                                        {/* COVER UPLOAD */}

                                        <div className="col-12">

                                            <label className="form-label fw-semibold">
                                                📕 Book Cover
                                            </label>

                                            <input
                                                type="file"
                                                name="cover"
                                                className="form-control"
                                                accept="image/*"
                                                onChange={
                                                    handleChange
                                                }
                                            />

                                            <small className="text-muted">
                                                Upload a JPG, PNG, WEBP or other image file.
                                            </small>

                                            {/* COVER PREVIEW */}

                                            {coverPreview && (
                                                <div className="mt-3">

                                                    <div className="small fw-semibold mb-2">
                                                        Cover Preview
                                                    </div>

                                                    <div
                                                        className="border rounded-3 overflow-hidden bg-light d-flex align-items-center justify-content-center"
                                                        style={{
                                                            width: "150px",
                                                            height: "210px",
                                                        }}
                                                    >

                                                        <img
                                                            src={
                                                                coverPreview
                                                            }
                                                            alt="Book cover preview"
                                                            className="w-100 h-100"
                                                            style={{
                                                                objectFit:
                                                                    "cover",
                                                            }}
                                                        />

                                                    </div>

                                                </div>
                                            )}

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
                                        disabled={
                                            saving
                                        }
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="btn btn-primary px-4"
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

            {/* MODAL BACKDROP */}

            {showModal && (
                <div
                    className="modal-backdrop fade show"
                    style={{
                        zIndex: 1055,
                    }}
                />
            )}

        </div>
    );
}

export default Books;