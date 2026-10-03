import LoadingStages from "../components/loadingstage";
import { useState, useEffect, useCallback } from "react";
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

function Notifications() {
    const [notifications, setNotifs]    = useState([]);
    const [unread, setUnread]           = useState(0);
    const [loading, setLoading]         = useState(true);
    const [filter, setFilter]           = useState("all"); // all | unread

    const fetchNotifs = useCallback(async () => {
        setLoading(true);
        try {
            const [nRes, cRes] = await Promise.all([
                notificationsApi.list(),
                notificationsApi.unreadCount(),
            ]);
            const results = nRes.data.results ?? nRes.data;
            setNotifs(results);
            setUnread(cRes.data.unread_count);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

    const handleMarkRead = async (id) => {
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

    const visible = filter === "unread"
        ? notifications.filter(n => !n.is_read)
        : notifications;

    return (
        <div className="container py-4" style={{ maxWidth: 720 }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="mb-0 fw-bold">
                    🔔 Notifications
                    {unread > 0 && (
                        <span className="badge bg-danger ms-2" style={{ fontSize: "0.7rem" }}>
                            {unread} unread
                        </span>
                    )}
                </h4>
                {unread > 0 && (
                    <button className="btn btn-sm btn-outline-secondary" onClick={handleMarkAll}>
                        ✓ Mark all as read
                    </button>
                )}
            </div>

            {/* Filter tabs */}
            <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                    <button
                        className={`nav-link ${filter === "all" ? "active" : ""}`}
                        onClick={() => setFilter("all")}
                    >
                        All ({notifications.length})
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${filter === "unread" ? "active" : ""}`}
                        onClick={() => setFilter("unread")}
                    >
                        Unread ({unread})
                    </button>
                </li>
            </ul>

            {/* List */}
            {loading ? (
                <LoadingStages
                            title="Loading notifications"
                            stages={[
                                "Connecting to notifications",
                                "Fetching recent activity",
                                "Preparing your inbox",
                            ]}
                        />
            ) : visible.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    {filter === "unread" ? "No unread notifications." : "No notifications yet."}
                </div>
            ) : (
                <div className="list-group shadow-sm">
                    {visible.map(n => (
                        <div
                            key={n.id}
                            className={`list-group-item list-group-item-action d-flex gap-3 align-items-start py-3 ${!n.is_read ? "list-group-item-light" : ""}`}
                        >
                            {/* Icon */}
                            <span style={{ fontSize: "1.4rem", marginTop: 2 }}>
                                {TYPE_ICON[n.notif_type] ?? "🔔"}
                            </span>

                            {/* Content */}
                            <div className="flex-grow-1">
                                <div className="d-flex justify-content-between align-items-start">
                                    <span className={`fw-semibold ${!n.is_read ? "text-dark" : "text-secondary"}`}>
                                        {n.title}
                                    </span>
                                    <small className="text-muted ms-2 flex-shrink-0">
                                        {new Date(n.created_at).toLocaleString()}
                                    </small>
                                </div>
                                <p className="mb-0 mt-1 text-muted" style={{ fontSize: "0.875rem" }}>
                                    {n.message}
                                </p>
                                <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                                    {n.notif_type_display}
                                </small>
                            </div>

                            {/* Mark read button */}
                            {!n.is_read && (
                                <button
                                    className="btn btn-sm btn-outline-success flex-shrink-0 align-self-center"
                                    onClick={() => handleMarkRead(n.id)}
                                    title="Mark as read"
                                    style={{ fontSize: "0.75rem" }}
                                >
                                    ✓ Read
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Notifications;
