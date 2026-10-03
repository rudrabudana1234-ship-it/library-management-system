import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { notificationsApi } from "../services/api";

const TYPE_ICON = {
    book_request_approved: "📖",
    book_request_rejected: "❌",
    borrow_approved:       "📖",
    return_requested:      "🔄",
    return_approved:       "✅",
    loan_due_soon:         "⏰",
    loan_overdue:          "🚨",
    reservation_available: "📌",
    reservation_expired:   "⌛",
    fee_generated:         "💰",
    payment_successful:    "💳",
    waitlist_updated:      "📋",
};

function NotificationBell() {
    const [unread, setUnread]           = useState(0);
    const [notifications, setNotifs]    = useState([]);
    const [open, setOpen]               = useState(false);
    const [loading, setLoading]         = useState(false);
    const dropdownRef                   = useRef(null);
    const navigate                      = useNavigate();

    // Poll unread count every 30 s
    const fetchCount = useCallback(async () => {
        try {
            const { data } = await notificationsApi.unreadCount();
            setUnread(data.unread_count);
        } catch {
            // silently ignore
        }
    }, []);

    useEffect(() => {
        fetchCount();
        const id = setInterval(fetchCount, 30000);
        return () => clearInterval(id);
    }, [fetchCount]);

    // Load recent notifications when dropdown opens
    useEffect(() => {
        if (!open) return;
        setLoading(true);
        notificationsApi.list({ page_size: 8 })
            .then(({ data }) => {
                const results = data.results ?? data;
                setNotifs(results);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [open]);

    // Close on outside click
    useEffect(() => {
        function onClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const handleMarkRead = async (id, e) => {
        e.stopPropagation();
        try {
            await notificationsApi.markRead(id);
            setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnread(prev => Math.max(0, prev - 1));
        } catch {}
    };

    const handleMarkAll = async () => {
        try {
            await notificationsApi.markAllRead();
            setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnread(0);
        } catch {}
    };

    return (
        <div className="position-relative me-3" ref={dropdownRef}>
            {/* Bell button */}
            <button
                className="btn btn-dark position-relative"
                onClick={() => setOpen(o => !o)}
                aria-label="Notifications"
                style={{ padding: "6px 10px" }}
            >
                🔔
                {unread > 0 && (
                    <span
                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                        style={{ fontSize: "0.65rem" }}
                    >
                        {unread > 99 ? "99+" : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="shadow rounded bg-white"
                    style={{
                        position:   "absolute",
                        right:      0,
                        top:        "110%",
                        width:      360,
                        maxHeight:  420,
                        overflowY:  "auto",
                        zIndex:     9999,
                        border:     "1px solid #dee2e6",
                    }}
                >
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-light">
                        <span className="fw-semibold">🔔 Notifications</span>
                        <div className="d-flex gap-2">
                            {unread > 0 && (
                                <button
                                    className="btn btn-link btn-sm p-0 text-secondary"
                                    onClick={handleMarkAll}
                                    style={{ fontSize: "0.78rem" }}
                                >
                                    Mark all read
                                </button>
                            )}
                            <button
                                className="btn btn-link btn-sm p-0 text-primary"
                                onClick={() => { setOpen(false); navigate("/notifications"); }}
                                style={{ fontSize: "0.78rem" }}
                            >
                                See all
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    {loading ? (
                        <div className="text-center py-4 text-muted" style={{ fontSize: "0.85rem" }}>
                            Loading…
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-4 text-muted" style={{ fontSize: "0.85rem" }}>
                            No notifications yet
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div
                                key={n.id}
                                className={`px-3 py-2 border-bottom d-flex align-items-start gap-2 ${!n.is_read ? "bg-light" : ""}`}
                                style={{ cursor: "default" }}
                            >
                                <span style={{ fontSize: "1.1rem", marginTop: 2 }}>
                                    {TYPE_ICON[n.notif_type] ?? "🔔"}
                                </span>
                                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                    <div className="fw-semibold" style={{ fontSize: "0.82rem" }}>
                                        {n.title}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: "0.78rem" }}>
                                        {n.message}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: "0.72rem", marginTop: 2 }}>
                                        {new Date(n.created_at).toLocaleString()}
                                    </div>
                                </div>
                                {!n.is_read && (
                                    <button
                                        className="btn btn-link btn-sm p-0 text-secondary flex-shrink-0"
                                        onClick={(e) => handleMarkRead(n.id, e)}
                                        title="Mark as read"
                                        style={{ fontSize: "0.7rem" }}
                                    >
                                        ✓
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
