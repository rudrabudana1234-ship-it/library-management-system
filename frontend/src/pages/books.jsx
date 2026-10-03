import LoadingStages from "../components/loadingstage";
import ButtonLoading from "../components/buttonloading";
import EmptyState from "../components/emptystate";
import ErrorState from "../components/errorstate";
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
    // MEMBER BORROWING / REQUEST
    // =========================

    const [memberRequests, setMemberRequests] = useState([]);
    const [memberRequestLoading, setMemberRequestLoading] = useState(false);

    const [bookActionLoading, setBookActionLoading] = useState(null);
    const [actionMessage, setActionMessage] = useState("");
    const [actionError, setActionError] = useState("");

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
    // AI / SEMANTIC SEARCH
    // =========================

    // The normal search box now uses a local TF-IDF + cosine-similarity
    // ranking over the complete book catalogue. No separate AI button is
    // needed, and the existing search suggestions continue to work.
    const [aiMode, setAiMode] = useState(false);
    const [aiResults, setAiResults] = useState([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");
    const [aiResultPage, setAiResultPage] = useState(1);

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

    // Full book description modal
    const [descriptionBook, setDescriptionBook] = useState(null);

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

    const isMember =
        user?.role === "member";

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
            return `http://127.0.0.1:8002${cover}`;
        }

        return `http://127.0.0.1:8002/media/${cover}`;
    };

    // =========================================================
    // FORMAT BOOK DATE
    // =========================================================

    const formatBookDate = (dateValue) => {
        if (!dateValue) {
            return "Not available";
        }

        const parsedDate = new Date(dateValue);

        if (Number.isNaN(parsedDate.getTime())) {
            return String(dateValue);
        }

        return parsedDate.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    // =========================================================
    // AI / SEMANTIC SEARCH HELPERS
    // =========================================================

    const AI_STOP_WORDS = new Set([
        "a",
        "an",
        "and",
        "are",
        "about",
        "best",
        "book",
        "books",
        "for",
        "from",
        "find",
        "give",
        "i",
        "in",
        "into",
        "is",
        "me",
        "of",
        "on",
        "please",
        "recommend",
        "recommendation",
        "show",
        "some",
        "that",
        "the",
        "to",
        "with",
        "you",
    ]);

    const AI_QUERY_EXPANSIONS = {
        ai: ["artificial", "intelligence"],
        ml: ["machine", "learning"],
        db: ["database", "databases"],
        ds: ["data", "science", "data", "structures"],
        dsa: ["data", "structures", "algorithms"],
        js: ["javascript"],
        py: ["python"],
        cpp: ["c++", "cpp"],
    };

    const stemAiToken = (token) => {
        if (token.length > 6 && token.endsWith("ies")) {
            return `${token.slice(0, -3)}y`;
        }

        if (token.length > 5 && token.endsWith("ing")) {
            return token.slice(0, -3);
        }

        if (token.length > 4 && token.endsWith("ed")) {
            return token.slice(0, -2);
        }

        if (token.length > 4 && token.endsWith("s")) {
            return token.slice(0, -1);
        }

        return token;
    };

    const tokenizeAiText = (value, isQuery = false) => {
        const normalized = String(value || "")
            .toLowerCase()
            .replace(/[^a-z0-9+#]+/g, " ")
            .trim();

        if (!normalized) {
            return [];
        }

        const baseTokens = normalized
            .split(/\s+/)
            .map((token) => token.trim())
            .filter(Boolean)
            .filter((token) => !AI_STOP_WORDS.has(token))
            .map(stemAiToken);

        if (!isQuery) {
            return baseTokens;
        }

        const expanded = [...baseTokens];

        baseTokens.forEach((token) => {
            const aliases = AI_QUERY_EXPANSIONS[token] || [];
            aliases.forEach((alias) => {
                expanded.push(stemAiToken(alias));
            });
        });

        return expanded;
    };

    const getAiDocumentFields = (book) => ({
        title: String(book.title || ""),
        author: getBookAuthor(book),
        category: getBookCategory(book),
        edition: String(book.edition || ""),
        isbn: String(book.isbn || ""),
        description: String(book.description || ""),
    });

    const buildAiDocumentVector = (book) => {
        const fields = getAiDocumentFields(book);
        const weightedText = [
            fields.title,
            fields.title,
            fields.title,
            fields.author,
            fields.author,
            fields.category,
            fields.category,
            fields.edition,
            fields.description,
            fields.isbn,
        ].join(" ");

        const tokens = tokenizeAiText(weightedText);
        const termFrequency = new Map();

        tokens.forEach((token) => {
            termFrequency.set(
                token,
                (termFrequency.get(token) || 0) + 1
            );
        });

        return {
            fields,
            termFrequency,
            tokens,
        };
    };

    const cosineSimilarity = (queryVector, documentVector, idf) => {
        let dot = 0;
        let queryMagnitude = 0;
        let documentMagnitude = 0;

        queryVector.forEach((value, token) => {
            const weight = value * (idf.get(token) || 1);
            queryMagnitude += weight * weight;
        });

        documentVector.forEach((value, token) => {
            const weight = value * (idf.get(token) || 1);
            documentMagnitude += weight * weight;
        });

        queryVector.forEach((queryValue, token) => {
            const documentValue =
                documentVector.get(token) || 0;

            if (documentValue === 0) {
                return;
            }

            const termIdf = idf.get(token) || 1;

            dot +=
                (queryValue * termIdf) *
                (documentValue * termIdf);
        });

        if (
            queryMagnitude === 0 ||
            documentMagnitude === 0
        ) {
            return 0;
        }

        return (
            dot /
            (Math.sqrt(queryMagnitude) *
                Math.sqrt(documentMagnitude))
        );
    };

    const rankBooksWithAiSearch = (query, catalog) => {
        const cleanQuery = String(query || "").trim();

        if (!cleanQuery || catalog.length === 0) {
            return [];
        }

        const queryTokens = tokenizeAiText(
            cleanQuery,
            true
        );

        if (queryTokens.length === 0) {
            return [];
        }

        const queryFrequency = new Map();
        queryTokens.forEach((token) => {
            queryFrequency.set(
                token,
                (queryFrequency.get(token) || 0) + 1
            );
        });

        const documents = catalog.map((book) => ({
            book,
            vector: buildAiDocumentVector(book),
        }));

        const documentFrequency = new Map();

        documents.forEach(({ vector }) => {
            const uniqueTokens = new Set(
                vector.termFrequency.keys()
            );

            uniqueTokens.forEach((token) => {
                documentFrequency.set(
                    token,
                    (documentFrequency.get(token) || 0) + 1
                );
            });
        });

        const totalDocuments = documents.length;
        const idf = new Map();

        documentFrequency.forEach((frequency, token) => {
            idf.set(
                token,
                Math.log(
                    (totalDocuments + 1) /
                        (frequency + 1)
                ) + 1
            );
        });

        const ranked = documents
            .map(({ book, vector }) => {
                const score = cosineSimilarity(
                    queryFrequency,
                    vector.termFrequency,
                    idf
                );

                const fields = vector.fields;
                const normalizedQuery = tokenizeAiText(
                    cleanQuery
                );
                const phrase = normalizedQuery.join(" " );

                const titleText = tokenizeAiText(
                    fields.title
                ).join(" " );

                const searchableText = [
                    fields.title,
                    fields.author,
                    fields.category,
                    fields.edition,
                    fields.description,
                    fields.isbn,
                ]
                    .map((item) =>
                        tokenizeAiText(item).join(" " )
                    )
                    .join(" " );

                let adjustedScore = score;

                if (phrase && titleText.includes(phrase)) {
                    adjustedScore += 0.35;
                } else if (
                    phrase &&
                    searchableText.includes(phrase)
                ) {
                    adjustedScore += 0.15;
                }

                return {
                    ...book,
                    _aiScore: adjustedScore,
                };
            })
            .filter((book) => book._aiScore > 0)
            .sort((a, b) => {
                if (b._aiScore !== a._aiScore) {
                    return b._aiScore - a._aiScore;
                }

                return String(a.title || "").localeCompare(
                    String(b.title || "")
                );
            });

        return ranked;
    };

    // =========================
    // BUILD BOOK URL
    // =========================

    const BOOKS_PER_PAGE = 24;


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

        // Request 24 books from the Django pagination API.
        params.append(
            "page_size",
            String(BOOKS_PER_PAGE)
        );

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
            setAiError("");
            setAiMode(false);
            setAiResults([]);
            setAiResultPage(1);

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

    // =====================================================
    // FETCH MEMBER BOOK REQUESTS
    // =====================================================

    const fetchMemberRequests = async () => {
        if (!isMember) {
            setMemberRequests([]);
            return;
        }

        try {
            setMemberRequestLoading(true);

            const response =
                await api.get(
                    "book-requests/"
                );

            const results =
                extractResults(
                    response.data
                );

            setMemberRequests(results);

        } catch (error) {
            console.error(
                "MEMBER REQUEST API ERROR:",
                error.response?.data ||
                error.message
            );

            setMemberRequests([]);

        } finally {
            setMemberRequestLoading(false);
        }
    };

    // =====================================================
    // CHECK WHETHER BOOK HAS PENDING REQUEST
    // =====================================================

    const hasPendingRequest = (bookId) => {
        return memberRequests.some(
            (bookRequest) =>
                Number(bookRequest.book) ===
                    Number(bookId) &&
                bookRequest.status ===
                    "pending"
        );
    };

    // Get the latest request for a book.
    const getBookRequestStatus = (bookId) => {
        const request = memberRequests.find(
            (bookRequest) =>
                Number(bookRequest.book) ===
                Number(bookId)
        );

        return request?.status || null;
    };

    // =====================================================
    // MEMBER BORROW BOOK
    // =====================================================

    // Members do NOT receive a Loan immediately.
    // Clicking "Borrow Book" creates a pending BookRequest.
    // The librarian approves/rejects that request later.
    const handleBorrowBook = async (book) => {
        if (!isMember) {
            return;
        }

        if (hasPendingRequest(book.id)) {
            setActionError(
                "You already have a pending request for this book."
            );
            return;
        }

        setActionMessage("");
        setActionError("");
        setBookActionLoading(
            `borrow-${book.id}`
        );

        try {
            const response =
                await api.post(
                    "book-requests/",
                    {
                        book: book.id,
                    }
                );

            console.log(
                "BOOK BORROW REQUEST RESPONSE:",
                response.data
            );

            setActionMessage(
                response.data?.message ||
                "Borrowing request submitted successfully. Please wait for librarian approval."
            );

            // The request does not consume a copy.
            // Refresh only the request state.
            await fetchMemberRequests();

        } catch (error) {
            console.error(
                "BOOK BORROW REQUEST ERROR:",
                error.response?.data ||
                error.message
            );

            const backendError =
                error.response?.data;

            if (backendError?.error) {
                setActionError(backendError.error);
            } else if (backendError?.detail) {
                setActionError(backendError.detail);
            } else {
                setActionError(
                    "Unable to submit the borrowing request. Please try again."
                );
            }

        } finally {
            setBookActionLoading(null);
        }
    };

    // =====================================================
    // MEMBER REQUEST BOOK
    // =====================================================

    // Kept as a separate handler for compatibility with the existing
    // UI structure. All member borrowing requests now use the same
    // librarian-approval workflow, regardless of availability.
    const handleRequestBook = async (book) => {
        await handleBorrowBook(book);
    };

    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {
        fetchBooks();
        fetchAuthors();
        fetchCategories();
    }, []);

    // =====================================================
    // LOAD MEMBER REQUESTS
    // =====================================================

    useEffect(() => {
        if (isMember) {
            fetchMemberRequests();
        } else {
            setMemberRequests([]);
        }
    }, [
        user?.username,
        user?.role,
    ]);

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

    // =========================================================
    // AI SEARCH / LOCAL PAGINATION
    // =========================================================

    const showAiResultsPage = (results, pageNumber) => {
        const safePage = Math.max(
            1,
            Math.min(
                pageNumber,
                Math.max(
                    1,
                    Math.ceil(
                        results.length /
                            BOOKS_PER_PAGE
                    )
                )
            )
        );

        const start =
            (safePage - 1) *
            BOOKS_PER_PAGE;

        const pageResults = results.slice(
            start,
            start + BOOKS_PER_PAGE
        );

        setBooks(pageResults);
        setAiResultPage(safePage);

        const totalPages = Math.max(
            1,
            Math.ceil(
                results.length /
                    BOOKS_PER_PAGE
            )
        );

        setPreviousPage(
            safePage > 1
                ? "ai-previous"
                : null
        );

        setNextPage(
            safePage < totalPages
                ? "ai-next"
                : null
        );
    };

    const runAiSearch = async (
        query,
        nextOrdering = ordering,
        nextAuthor = selectedAuthor,
        nextCategory = selectedCategory
    ) => {
        const trimmedQuery = String(
            query || ""
        ).trim();

        if (!trimmedQuery) {
            setAiMode(false);
            setAiResults([]);
            setAiResultPage(1);
            fetchBooks(
                buildBookUrl(
                    "",
                    nextOrdering,
                    nextAuthor,
                    nextCategory
                )
            );
            return;
        }

        try {
            setAiLoading(true);
            setAiError("");
            setError("");
            setAiMode(true);
            setShowSuggestions(false);

            // Load the complete filtered catalogue so the AI ranking
            // can discover books that are not on the current 24-book page.
            const catalogUrl = buildBookUrl(
                "",
                nextOrdering,
                nextAuthor,
                nextCategory
            );

            const catalog = await fetchAllPages(
                catalogUrl
            );

            const rankedResults =
                rankBooksWithAiSearch(
                    trimmedQuery,
                    catalog
                );

            setAiResults(rankedResults);

            if (rankedResults.length === 0) {
                setBooks([]);
                setNextPage(null);
                setPreviousPage(null);
                setAiResultPage(1);
                setAiError(
                    "No strong matches were found. Try a broader search such as 'Python programming', 'machine learning', or 'database'."
                );
                return;
            }

            showAiResultsPage(
                rankedResults,
                1
            );

        } catch (error) {
            console.error(
                "AI BOOK SEARCH ERROR:",
                error.response?.data ||
                    error.message
            );

            setBooks([]);
            setNextPage(null);
            setPreviousPage(null);
            setAiResults([]);
            setAiResultPage(1);
            setAiError(
                "AI search could not be completed. Please try again."
            );

        } finally {
            setAiLoading(false);
        }
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

        runAiSearch(
            search,
            ordering,
            selectedAuthor,
            selectedCategory
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

        runAiSearch(
            title,
            ordering,
            selectedAuthor,
            selectedCategory
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

        runAiSearch(
            term,
            ordering,
            selectedAuthor,
            selectedCategory
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
        setAiMode(false);
        setAiResults([]);
        setAiResultPage(1);
        setAiError("");

        fetchBooks(
            buildBookUrl("", "", "", "")
        );
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

        if (
            aiMode &&
            nextSearch.trim()
        ) {
            runAiSearch(
                nextSearch,
                nextOrdering,
                nextAuthor,
                nextCategory
            );
            return;
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
            aiMode &&
            nextPage &&
            !loading &&
            !aiLoading
        ) {
            showAiResultsPage(
                aiResults,
                aiResultPage + 1
            );
            return;
        }

        if (
            nextPage &&
            !loading
        ) {
            fetchBooks(nextPage);
        }
    };

    const handlePreviousPage = () => {
        if (
            aiMode &&
            previousPage &&
            !loading &&
            !aiLoading
        ) {
            showAiResultsPage(
                aiResults,
                aiResultPage - 1
            );
            return;
        }

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
    // FULL DESCRIPTION
    // =========================

    const handleOpenDescription = (book) => {
        setDescriptionBook(book);
    };

    const handleCloseDescription = () => {
        setDescriptionBook(null);
    };

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
                        {aiMode
                            ? `${aiResults.length} Matches`
                            : `${books.length} Books`}
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
                MEMBER ACTION FEEDBACK
            ========================== */}

            {isMember &&
                actionMessage && (
                    <div
                        className="alert alert-success border-0 shadow-sm d-flex justify-content-between align-items-start"
                        role="alert"
                    >

                        <div>
                            <strong>
                                ✅ Success
                            </strong>

                            <div className="small mt-1">
                                {actionMessage}
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={() =>
                                setActionMessage("")
                            }
                        />

                    </div>
                )}

            {isMember &&
                actionError && (
                    <div
                        className="alert alert-danger border-0 shadow-sm d-flex justify-content-between align-items-start"
                        role="alert"
                    >

                        <div>
                            <strong>
                                ⚠️ Unable to complete action
                            </strong>

                            <div className="small mt-1">
                                {actionError}
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn-close"
                            aria-label="Close"
                            onClick={() =>
                                setActionError("")
                            }
                        />

                    </div>
                )}

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
                            Describe what you want naturally. AI ranking uses
                            book titles, authors, categories, editions and descriptions.
                        </p>

                        <div className="mt-2">
                            <span className="badge bg-primary-subtle text-primary rounded-pill">
                                🤖 AI-powered search
                            </span>
                            <span className="small text-muted ms-2">
                                Try: “beginner Python programming”
                            </span>
                        </div>

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
                                    placeholder="Try “machine learning for beginners” or “books about databases”..."
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
                                            setSearch("");
                                            setSuggestions([]);
                                            setShowSuggestions(false);
                                            setAiMode(false);
                                            setAiResults([]);
                                            setAiResultPage(1);
                                            setAiError("");
                                            fetchBooks(
                                                buildBookUrl(
                                                    "",
                                                    ordering,
                                                    selectedAuthor,
                                                    selectedCategory
                                                )
                                            );
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}

                                <ButtonLoading
                                    type="submit"
                                    className="btn btn-primary px-4"
                                    loading={aiLoading}
                                    loadingText="Ranking..."
                                >
                                    Search
                                </ButtonLoading>

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

            {aiError && (
                <div className="alert alert-info border-0 shadow-sm mb-4" role="status">
                    <div className="d-flex gap-2">
                        <span>🤖</span>
                        <div>
                            <div className="fw-semibold">AI search</div>
                            <div className="small">{aiError}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================
                ERROR
            ========================== */}

            {error && (
                <ErrorState
                    title="Unable to load books"
                    message="The library books could not be loaded. Please try again."
                    action={
                        <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => fetchBooks()}
                        >
                            🔄 Try Again
                        </button>
                    }
                />
            )}

            {/* =========================
                LOADING
            ========================== */}

            {(loading || aiLoading) && (
                <LoadingStages
                    title={
                        aiLoading
                            ? "Understanding your search"
                            : "Finding books"
                    }
                    stages={
                        aiLoading
                            ? [
                                  "Reading your natural-language query",
                                  "Searching the complete book catalogue",
                                  "Ranking the closest matches",
                              ]
                            : [
                                  "Connecting to the library",
                                  "Searching books and metadata",
                                  "Applying filters and sorting",
                              ]
                    }
                />
            )}

            {/* =========================
                NO BOOKS
            ========================== */}

            {!loading &&
                !aiLoading &&
                !error &&
                books.length === 0 && (
                    <EmptyState
                        icon="📚"
                        title={
                            aiMode
                                ? "No close AI matches"
                                : "No books found"
                        }
                        message={
                            aiMode
                                ? "Try different words or a broader description of the kind of book you want."
                                : "Try changing your search or filters to find books in the library."
                        }
                        action={
                            <>
                                {(search ||
                                    ordering ||
                                    selectedAuthor ||
                                    selectedCategory) && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary me-2"
                                        onClick={handleClearFilters}
                                    >
                                        Clear Filters
                                    </button>
                                )}

                                {canManageBooks && (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={handleAddBook}
                                    >
                                        + Add First Book
                                    </button>
                                )}
                            </>
                        }
                    />
                )}

            {/* =========================
                BOOK CARDS
            ========================== */}

            {!loading &&
                !aiLoading &&
                !error &&
                books.length > 0 && (

                    <>

                        <div className="d-flex justify-content-between align-items-center mb-3">

                            <div>

                                <h5 className="fw-bold mb-1">
                                    {aiMode
                                        ? "AI-ranked matches"
                                        : "Library Collection"}
                                </h5>

                                <small className="text-muted">
                                    {aiMode
                                        ? `Closest matches for “${search}”`
                                        : "Explore the library collection"}
                                </small>

                            </div>

                            <span className="text-muted small">
                                {aiMode ? (
                                    <>
                                        Showing{" "}
                                        <strong>
                                            {books.length}
                                        </strong>{" "}
                                        of{" "}
                                        <strong>
                                            {aiResults.length}
                                        </strong>{" "}
                                        matches
                                    </>
                                ) : (
                                    <>
                                        Showing{" "}
                                        <strong>
                                            {books.length}
                                        </strong>{" "}
                                        books
                                    </>
                                )}
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

                                    const pendingRequest =
                                        isMember &&
                                        hasPendingRequest(
                                            book.id
                                        );

                                    const borrowing =
                                        bookActionLoading ===
                                        `borrow-${book.id}`;

                                    const requesting =
                                        bookActionLoading ===
                                        `request-${book.id}`;

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

                                                    {/* BOOK DESCRIPTION */}

                                                    <div className="mb-3">

                                                        <div className="small fw-semibold text-dark mb-1">
                                                            📝 Description
                                                        </div>

                                                        <p
                                                            className="small text-muted mb-1"
                                                            style={{
                                                                display: "-webkit-box",
                                                                WebkitLineClamp: 3,
                                                                WebkitBoxOrient: "vertical",
                                                                overflow: "hidden",
                                                                minHeight: "4.5em",
                                                            }}
                                                        >
                                                            {
                                                                book.description ||
                                                                "No description available for this book."
                                                            }
                                                        </p>

                                                        {book.description && String(book.description).trim() && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-link btn-sm p-0 text-decoration-none"
                                                                onClick={() =>
                                                                    handleOpenDescription(book)
                                                                }
                                                            >
                                                                More ↗
                                                            </button>
                                                        )}

                                                    </div>

                                                    {/* ISSUE / PUBLISHED DATE */}

                                                    <div className="small text-muted mb-3">

                                                        <div className="d-flex justify-content-between align-items-center gap-2">

                                                            <span className="fw-semibold text-dark">
                                                                📅 Issued / Published Date
                                                            </span>

                                                            <span className="text-end">
                                                                {formatBookDate(
                                                                    book.published_date
                                                                )}
                                                            </span>

                                                        </div>

                                                        <div className="mt-1">
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

                                                        {/* TOTAL COPIES */}

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

                                                        {/* AVAILABILITY */}

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

                                                        {/* =================================================
                                                            MEMBER BORROWING CONTROLS
                                                        ================================================= */}

                                                        {isMember && (

                                                            <div className="mb-3">

                                                                {(() => {
                                                                    const requestStatus =
                                                                        getBookRequestStatus(
                                                                            book.id
                                                                        );

                                                                    const borrowing =
                                                                        bookActionLoading ===
                                                                        `borrow-${book.id}`;

                                                                    if (requestStatus === "pending") {
                                                                        return (
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-outline-secondary w-100"
                                                                                disabled
                                                                            >
                                                                                ⏳ Request Pending
                                                                            </button>
                                                                        );
                                                                    }

                                                                    if (requestStatus === "approved") {
                                                                        return (
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-outline-success w-100"
                                                                                disabled
                                                                            >
                                                                                ✅ Request Approved / Book Issued
                                                                            </button>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <ButtonLoading
                                                                            type="button"
                                                                            className="btn btn-success w-100"
                                                                            onClick={() =>
                                                                                handleBorrowBook(book)
                                                                            }
                                                                            loading={borrowing}
                                                                            loadingText="Submitting Request..."
                                                                            disabled={
                                                                                bookActionLoading !== null ||
                                                                                memberRequestLoading
                                                                            }
                                                                        >
                                                                            📚 Borrow Book
                                                                        </ButtonLoading>
                                                                    );
                                                                })()}

                                                                <small className="d-block text-muted text-center mt-2">
                                                                    Librarian approval is required before the book is issued.
                                                                </small>

                                                            </div>

                                                        )}

                                                        {/* =================================================
                                                            ADMIN / LIBRARIAN CONTROLS
                                                        ================================================= */}

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

                                    <ButtonLoading
                                        type="submit"
                                        className="btn btn-primary px-4"
                                        loading={saving}
                                        loadingText="Saving..."
                                    >
                                        {editingBook ? "Update Book" : "Add Book"}
                                    </ButtonLoading>

                                </div>

                            </form>

                        </div>

                    </div>

                </div>

            )}

            {/* FULL DESCRIPTION MODAL */}

            {descriptionBook && (
                <>
                    <div
                        className="modal fade show d-block"
                        tabIndex="-1"
                        role="dialog"
                        aria-modal="true"
                        style={{
                            zIndex: 1065,
                        }}
                    >

                        <div
                            className="modal-dialog modal-dialog-centered modal-lg"
                            role="document"
                        >

                            <div className="modal-content border-0 shadow">

                                <div className="modal-header">

                                    <div>
                                        <h5 className="modal-title fw-bold mb-1">
                                            📖 {descriptionBook.title}
                                        </h5>
                                        <small className="text-muted">
                                            Full Book Description
                                        </small>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-close"
                                        aria-label="Close"
                                        onClick={handleCloseDescription}
                                    />

                                </div>

                                <div className="modal-body">

                                    <div className="d-flex flex-wrap gap-2 mb-3">

                                        {getBookAuthor(descriptionBook) && (
                                            <span className="badge bg-primary-subtle text-primary">
                                                ✍️ {getBookAuthor(descriptionBook)}
                                            </span>
                                        )}

                                        {getBookCategory(descriptionBook) && (
                                            <span className="badge bg-secondary-subtle text-secondary">
                                                🏷️ {getBookCategory(descriptionBook)}
                                            </span>
                                        )}

                                    </div>

                                    <p
                                        className="mb-0"
                                        style={{
                                            whiteSpace: "pre-line",
                                            lineHeight: 1.8,
                                        }}
                                    >
                                        {
                                            descriptionBook.description ||
                                            "No description available for this book."
                                        }
                                    </p>

                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={handleCloseDescription}
                                    >
                                        Close
                                    </button>
                                </div>

                            </div>

                        </div>

                    </div>

                    <div
                        className="modal-backdrop fade show"
                        style={{
                            zIndex: 1060,
                        }}
                        onClick={handleCloseDescription}
                    />
                </>
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