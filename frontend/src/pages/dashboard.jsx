import LoadingStages from "../components/loadingstage";
import ButtonLoading from "../components/buttonloading";
import EmptyState from "../components/emptystate";
import ErrorState from "../components/errorstate";
import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─── palette ──────────────────────────────────────────────────────────────────
const COLORS = ["#0d6efd", "#198754", "#ffc107", "#dc3545", "#0dcaf0", "#6f42c1", "#fd7e14", "#20c997"];

// ─── helpers ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accent }) {
    return (
        <div className="col-6 col-lg-3">
            <div className={`card border-0 shadow-sm h-100 border-start border-4 border-${accent}`}>
                <div className="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <p className="text-muted small mb-1">{label}</p>
                        <h3 className="fw-bold mb-0">{value ?? 0}</h3>
                    </div>
                    <div className="fs-1 opacity-75">{icon}</div>
                </div>
            </div>
        </div>
    );
}

function ActionCard({ icon, label, value, accent }) {
    return (
        <div className="col-6 col-md-4 col-lg-2">
            <div className="card border-0 shadow-sm h-100 text-center">
                <div className="card-body py-4">
                    <div className="fs-2 mb-2">{icon}</div>
                    <h4 className={`fw-bold mb-1 text-${accent}`}>{value ?? 0}</h4>
                    <p className="text-muted small mb-0">{label}</p>
                </div>
            </div>
        </div>
    );
}

const ACTIVITY_META = {
    borrowed:          { icon: "📖", badge: "bg-primary",              label: "Borrowed"          },
    returned:          { icon: "✅", badge: "bg-success",              label: "Returned"          },
    overdue:           { icon: "⏰", badge: "bg-danger",               label: "Overdue"           },
    return_requested:  { icon: "🔄", badge: "bg-info text-dark",       label: "Return Requested"  },
    request_approved:  { icon: "✅", badge: "bg-success",              label: "Request Approved"  },
    request_rejected:  { icon: "❌", badge: "bg-danger",               label: "Request Rejected"  },
};

function ActivityRow({ item }) {
    const meta = ACTIVITY_META[item.type] ?? { icon: "📌", badge: "bg-secondary", label: item.type };
    return (
        <div className="d-flex align-items-start gap-3 py-2 border-bottom">
            <span className="fs-5 mt-1">{meta.icon}</span>
            <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="fw-semibold">{item.title}</span>
                    <span className={`badge ${meta.badge}`}>{meta.label}</span>
                </div>
                {item.note && <small className="text-muted">{item.note}</small>}
            </div>
            <small className="text-muted flex-shrink-0">{item.date}</small>
        </div>
    );
}

function SectionCard({ title, icon, children, empty }) {
    return (
        <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white border-0 pt-3 pb-2">
                <h6 className="fw-bold mb-0">{icon} {title}</h6>
            </div>
            <div className="card-body pt-0">
                {children || <p className="text-muted mb-0">{empty ?? "Nothing here."}</p>}
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        borrowed:         "bg-primary",
        overdue:          "bg-danger",
        return_requested: "bg-warning text-dark",
        returned:         "bg-success",
        waiting:          "bg-secondary",
        available:        "bg-success",
        pending:          "bg-warning text-dark",
        approved:         "bg-success",
        rejected:         "bg-danger",
        successful:       "bg-success",
    };
    return (
        <span className={`badge ${map[status] ?? "bg-secondary"}`}>
            {status?.replace(/_/g, " ")}
        </span>
    );
}

// ─── chart helpers ────────────────────────────────────────────────────────────
function ChartCard({ title, icon, children }) {
    return (
        <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom-0 pt-3 pb-2">
                <h6 className="fw-bold mb-0">{icon} {title}</h6>
            </div>
            <div className="card-body pt-0">{children}</div>
        </div>
    );
}

function EmptyChart({ message = "No data available." }) {
    return (
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 180 }}>
            <p className="text-muted mb-0">{message}</p>
        </div>
    );
}

const fmt = (v) => `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

// ─── member dashboard ─────────────────────────────────────────────────────────
function MemberDashboard({ d, onRefresh }) {
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setRefreshing(false);
        }
    };
    const fees = parseFloat(d.outstanding_fees_amount || 0);

    return (
        <div className="container-fluid py-4 px-4">
            <div className="mb-4 d-flex justify-content-between align-items-center">
                <div>
                    <h1 className="fw-bold mb-1">📊 My Library</h1>
                    <p className="text-muted mb-0">Your personal library activity</p>
                </div>
                <ButtonLoading
                    loading={refreshing}
                    loadingText="Refreshing..."
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleRefresh}
                >
                    🔄 Refresh
                </ButtonLoading>
            </div>

            <div className="row g-3 mb-4">
                <StatCard icon="📚" label="Borrowed"     value={d.active_loans}          accent="primary" />
                <StatCard icon="⏰" label="Overdue"      value={d.overdue_loans}         accent="danger"  />
                <StatCard icon="📌" label="Reservations" value={d.reservations_count}    accent="info"    />
                <StatCard
                    icon="💰"
                    label="Fees Due"
                    value={`₹${fees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                    accent={fees > 0 ? "danger" : "success"}
                />
            </div>

            {d.overdue_loans > 0 && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
                    <span className="fs-5">⚠️</span>
                    <span>You have <strong>{d.overdue_loans}</strong> overdue book{d.overdue_loans > 1 ? "s" : ""}. Please return them as soon as possible to avoid additional fees.</span>
                </div>
            )}

            {d.upcoming_due?.length > 0 && (
                <div className="alert alert-warning d-flex align-items-center gap-2 mb-4">
                    <span className="fs-5">📅</span>
                    <span><strong>{d.upcoming_due.length}</strong> book{d.upcoming_due.length > 1 ? "s are" : " is"} due within 7 days.</span>
                </div>
            )}

            <div className="row g-4">
                <div className="col-12 col-lg-8">
                    <SectionCard title="Currently Borrowed" icon="📚" empty="No books currently borrowed.">
                        {d.currently_borrowed?.length > 0 && (
                            <div className="table-responsive">
                                <table className="table table-sm align-middle mb-0">
                                    <thead className="table-light">
                                        <tr><th>Book</th><th>Author</th><th>Due Date</th><th>Status</th></tr>
                                    </thead>
                                    <tbody>
                                        {d.currently_borrowed.map(b => (
                                            <tr key={b.loan_id}>
                                                <td className="fw-semibold">{b.title}</td>
                                                <td className="text-muted">{b.author}</td>
                                                <td>{b.due_date}</td>
                                                <td><StatusBadge status={b.status} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>

                    {d.overdue_books?.length > 0 && (
                        <SectionCard title="Overdue Books" icon="⏰">
                            <div className="table-responsive">
                                <table className="table table-sm align-middle mb-0">
                                    <thead className="table-light">
                                        <tr><th>Book</th><th>Due Date</th><th>Days Overdue</th></tr>
                                    </thead>
                                    <tbody>
                                        {d.overdue_books.map(b => (
                                            <tr key={b.loan_id} className="table-danger">
                                                <td className="fw-semibold">{b.title}</td>
                                                <td>{b.due_date}</td>
                                                <td><span className="badge bg-danger">{b.days_overdue}d</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </SectionCard>
                    )}

                    <SectionCard title="Reservation / Waitlist" icon="📌" empty="No active reservations.">
                        {d.reservations?.length > 0 && (
                            <div className="table-responsive">
                                <table className="table table-sm align-middle mb-0">
                                    <thead className="table-light">
                                        <tr><th>Book</th><th>Position</th><th>Status</th><th>Reserved</th></tr>
                                    </thead>
                                    <tbody>
                                        {d.reservations.map(r => (
                                            <tr key={r.reservation_id}>
                                                <td className="fw-semibold">{r.title}</td>
                                                <td>#{r.queue_position}</td>
                                                <td><StatusBadge status={r.status} /></td>
                                                <td className="text-muted">{r.reserved_at}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard title="Outstanding Fees" icon="💰" empty="No outstanding fees.">
                        {d.outstanding_fees?.length > 0 && (
                            <div className="table-responsive">
                                <table className="table table-sm align-middle mb-0">
                                    <thead className="table-light">
                                        <tr><th>Book</th><th>Type</th><th>Amount</th><th>Date</th></tr>
                                    </thead>
                                    <tbody>
                                        {d.outstanding_fees.map(f => (
                                            <tr key={f.fee_id} className="table-warning">
                                                <td className="fw-semibold">{f.book_title}</td>
                                                <td>{f.fee_type}</td>
                                                <td className="fw-bold">₹{parseFloat(f.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                                <td className="text-muted">{f.created_at}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard title="Payment History" icon="💳" empty="No payment history.">
                        {d.payment_history?.length > 0 && (
                            <div className="table-responsive">
                                <table className="table table-sm align-middle mb-0">
                                    <thead className="table-light">
                                        <tr><th>Book</th><th>Type</th><th>Amount</th><th>Method</th><th>Paid On</th></tr>
                                    </thead>
                                    <tbody>
                                        {d.payment_history.map(p => (
                                            <tr key={p.payment_id}>
                                                <td className="fw-semibold">{p.book_title}</td>
                                                <td>{p.fee_type}</td>
                                                <td>₹{parseFloat(p.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                                <td className="text-muted text-capitalize">{p.payment_method ?? "—"}</td>
                                                <td className="text-muted">{p.paid_at}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>
                </div>

                <div className="col-12 col-lg-4">
                    <SectionCard title="Upcoming Due Dates" icon="📅" empty="No books due soon.">
                        {d.upcoming_due?.length > 0 && (
                            <ul className="list-group list-group-flush">
                                {d.upcoming_due.map(u => (
                                    <li key={u.loan_id} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                                        <span className="fw-semibold text-truncate me-2">{u.title}</span>
                                        <span className={`badge ${u.days_left <= 2 ? "bg-danger" : "bg-warning text-dark"}`}>
                                            {u.days_left === 0 ? "Today" : `${u.days_left}d left`}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SectionCard>

                    <SectionCard title="Pending Book Requests" icon="�" empty="No pending requests.">
                        {d.pending_book_requests?.length > 0 && (
                            <ul className="list-group list-group-flush">
                                {d.pending_book_requests.map(r => (
                                    <li key={r.request_id} className="list-group-item px-0">
                                        <div className="fw-semibold">{r.title}</div>
                                        <small className="text-muted">{r.author} · {r.requested_at}</small>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SectionCard>

                    <SectionCard title="Recently Borrowed" icon="📖" empty="No reading history yet.">
                        {d.recently_borrowed?.length > 0 && (
                            <ul className="list-group list-group-flush">
                                {d.recently_borrowed.map(b => (
                                    <li key={b.loan_id} className="list-group-item px-0">
                                        <div className="fw-semibold">{b.title}</div>
                                        <small className="text-muted">{b.author}</small>
                                        {b.return_date && (
                                            <div><small className="text-muted">Returned {b.return_date}</small></div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SectionCard>

                    <SectionCard title="Account Activity" icon="�" empty="No recent activity.">
                        {d.recent_activity?.length > 0 && (
                            d.recent_activity.map((item, i) => (
                                <ActivityRow key={i} item={item} />
                            ))
                        )}
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}

// ─── analytics section ────────────────────────────────────────────────────────
const RANGE_OPTIONS = [
    { label: "7 Days",   value: 7   },
    { label: "30 Days",  value: 30  },
    { label: "6 Months", value: 180 },
    { label: "12 Months",value: 365 },
];

function AnalyticsSection() {
    const [range, setRange]         = useState(30);
    const [data, setData]           = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState("");
    const [refreshing, setRefreshing] = useState(false);

    const fetchAnalytics = useCallback(async (r) => {
        try {
            setLoading(true);
            setError("");
            const res = await api.get(`analytics/?range=${r}`);
            setData(res.data);
        } catch (err) {
            setError("Failed to load analytics data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAnalytics(range); }, [range, fetchAnalytics]);

    const handleRange = (r) => {
        setRange(r);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await fetchAnalytics(range);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div className="mt-2">
            {/* ── divider ── */}
            <div className="d-flex align-items-center gap-3 mb-4">
                <hr className="flex-grow-1" />
                <h5 className="fw-bold mb-0 text-nowrap">📈 Library Analytics</h5>
                <hr className="flex-grow-1" />
            </div>

            {/* ── range selector ── */}
            <div className="d-flex align-items-center gap-2 mb-4 flex-wrap">
                <span className="text-muted small fw-semibold">Borrowing Range:</span>
                {RANGE_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        className={`btn btn-sm ${range === opt.value ? "btn-primary" : "btn-outline-secondary"}`}
                        onClick={() => handleRange(opt.value)}
                    >
                        {opt.label}
                    </button>
                ))}
                <ButtonLoading
                    loading={refreshing}
                    loadingText="Refreshing..."
                    className="btn btn-sm btn-outline-secondary ms-auto"
                    onClick={handleRefresh}
                    title="Refresh analytics"
                >
                    🔄
                </ButtonLoading>
            </div>

            {/* ── loading ── */}
            {loading && (
                <LoadingStages
                    title="Loading analytics"
                    stages={[
                        "Connecting to analytics",
                        "Fetching borrowing data",
                        "Preparing charts and insights",
                    ]}
                />
            )}

            {/* ── error ── */}
            {!loading && error && (
                <ErrorState
                    title="Unable to load analytics"
                    message={error}
                    action={
                        <button
                            className="btn btn-warning btn-sm"
                            onClick={() => fetchAnalytics(range)}
                        >
                            Try Again
                        </button>
                    }
                />
            )}

            {/* ── charts ── */}
            {!loading && !error && data && (
                <>
                    {/* Row 1 – Borrowing Trends (full width) */}
                    <div className="row g-4 mb-4">
                        <div className="col-12">
                            <ChartCard title="Borrowing Trends" icon="📊">
                                {data.borrowing_trends?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={260}>
                                        <LineChart data={data.borrowing_trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                            <Tooltip formatter={(v) => [v, "Loans"]} />
                                            <Line type="monotone" dataKey="loans" stroke="#0d6efd" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <EmptyChart message="No borrowing activity in this period." />
                                )}
                            </ChartCard>
                        </div>
                    </div>

                    {/* Row 2 – Top Books | Popular Categories */}
                    <div className="row g-4 mb-4">
                        <div className="col-12 col-lg-6">
                            <ChartCard title="Most Borrowed Books" icon="📚">
                                {data.top_books?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart
                                            data={data.top_books.slice(0, 10)}
                                            layout="vertical"
                                            margin={{ top: 0, right: 20, left: 8, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                            <YAxis
                                                type="category"
                                                dataKey="title"
                                                width={130}
                                                tick={{ fontSize: 11 }}
                                                tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + "…" : v}
                                            />
                                            <Tooltip formatter={(v) => [v, "Loans"]} />
                                            <Bar dataKey="loans" fill="#0d6efd" radius={[0, 4, 4, 0]}>
                                                {data.top_books.slice(0, 10).map((_, i) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <EmptyChart message="No loan data available." />
                                )}
                            </ChartCard>
                        </div>

                        <div className="col-12 col-lg-6">
                            <ChartCard title="Popular Categories" icon="🏷️">
                                {data.popular_categories?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <PieChart>
                                            <Pie
                                                data={data.popular_categories}
                                                dataKey="loans"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                label={({ name, percent }) =>
                                                    `${name.length > 12 ? name.slice(0, 12) + "…" : name} (${(percent * 100).toFixed(0)}%)`
                                                }
                                                labelLine={false}
                                            >
                                                {data.popular_categories.map((_, i) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v, n) => [v + " loans", n]} />
                                            <Legend iconType="circle" iconSize={10} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <EmptyChart message="No category data available." />
                                )}
                            </ChartCard>
                        </div>
                    </div>

                    {/* Row 3 – Active Members | Overdue Stats */}
                    <div className="row g-4 mb-4">
                        <div className="col-12 col-lg-6">
                            <ChartCard title="Most Active Members" icon="👥">
                                {data.active_members?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <BarChart
                                            data={data.active_members.slice(0, 10)}
                                            layout="vertical"
                                            margin={{ top: 0, right: 20, left: 8, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                            <YAxis
                                                type="category"
                                                dataKey="name"
                                                width={130}
                                                tick={{ fontSize: 11 }}
                                                tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + "…" : v}
                                            />
                                            <Tooltip formatter={(v) => [v, "Loans"]} />
                                            <Bar dataKey="loans" fill="#198754" radius={[0, 4, 4, 0]}>
                                                {data.active_members.slice(0, 10).map((_, i) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <EmptyChart message="No member data available." />
                                )}
                            </ChartCard>
                        </div>

                        <div className="col-12 col-lg-6">
                            <ChartCard title="Overdue Statistics" icon="⏰">
                                {(() => {
                                    const od = data.overdue_stats;
                                    const chartData = [
                                        { name: "Currently Overdue", value: od.currently_overdue },
                                        { name: "Returned Late",     value: od.returned_late     },
                                        { name: "On Time",           value: od.on_time_returned  },
                                    ].filter(i => i.value > 0);

                                    return (
                                        <>
                                            {/* summary badges */}
                                            <div className="d-flex flex-wrap gap-2 mb-3">
                                                <span className="badge bg-danger fs-6 px-3 py-2">
                                                    Currently Overdue: {od.currently_overdue}
                                                </span>
                                                <span className="badge bg-warning text-dark fs-6 px-3 py-2">
                                                    Returned Late: {od.returned_late}
                                                </span>
                                                <span className="badge bg-success fs-6 px-3 py-2">
                                                    On Time: {od.on_time_returned}
                                                </span>
                                            </div>
                                            {chartData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height={210}>
                                                    <BarChart data={chartData} margin={{ top: 0, right: 20, left: 0, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                                        <Tooltip />
                                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                            <Cell fill="#dc3545" />
                                                            <Cell fill="#ffc107" />
                                                            <Cell fill="#198754" />
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <EmptyChart message="No overdue or return data yet." />
                                            )}
                                        </>
                                    );
                                })()}
                            </ChartCard>
                        </div>
                    </div>

                    {/* Row 4 – Book Availability | Fee Analytics */}
                    <div className="row g-4 mb-4">
                        <div className="col-12 col-lg-6">
                            <ChartCard title="Book Availability" icon="📗">
                                {(() => {
                                    const av = data.book_availability;
                                    const pieData = [
                                        { name: "Available", value: av.available_copies },
                                        { name: "Borrowed",  value: av.borrowed_copies  },
                                    ].filter(i => i.value > 0);

                                    return (
                                        <>
                                            <div className="d-flex flex-wrap gap-2 mb-3">
                                                <span className="badge bg-success fs-6 px-3 py-2">
                                                    Available: {av.available_copies}
                                                </span>
                                                <span className="badge bg-primary fs-6 px-3 py-2">
                                                    Borrowed: {av.borrowed_copies}
                                                </span>
                                                <span className="badge bg-secondary fs-6 px-3 py-2">
                                                    Total: {av.total_copies}
                                                </span>
                                            </div>
                                            {pieData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height={210}>
                                                    <PieChart>
                                                        <Pie
                                                            data={pieData}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            cx="50%"
                                                            cy="50%"
                                                            outerRadius={85}
                                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                        >
                                                            <Cell fill="#198754" />
                                                            <Cell fill="#0d6efd" />
                                                        </Pie>
                                                        <Tooltip formatter={(v, n) => [v + " copies", n]} />
                                                        <Legend iconType="circle" />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <EmptyChart message="No book copy data available." />
                                            )}
                                        </>
                                    );
                                })()}
                            </ChartCard>
                        </div>

                        <div className="col-12 col-lg-6">
                            <ChartCard title="Fee & Payment Analytics" icon="💰">
                                {(() => {
                                    const fa = data.fee_analytics;
                                    const totalsData = [
                                        { name: "Pending", value: fa.pending_total, fill: "#ffc107" },
                                        { name: "Paid",    value: fa.paid_total,    fill: "#198754" },
                                        { name: "Waived",  value: fa.waived_total,  fill: "#6f42c1" },
                                    ];
                                    const typeData = fa.by_type.map(t => ({
                                        name: t.fee_type.charAt(0).toUpperCase() + t.fee_type.slice(1),
                                        Pending: t.pending_amount || 0,
                                        Paid:    t.paid_amount    || 0,
                                        Waived:  t.waived_amount  || 0,
                                    }));

                                    const hasData = fa.pending_total > 0 || fa.paid_total > 0 || fa.waived_total > 0;

                                    return (
                                        <>
                                            <div className="d-flex flex-wrap gap-2 mb-3">
                                                <span className="badge bg-warning text-dark fs-6 px-3 py-2">
                                                    Pending: {fmt(fa.pending_total)}
                                                </span>
                                                <span className="badge bg-success fs-6 px-3 py-2">
                                                    Paid: {fmt(fa.paid_total)}
                                                </span>
                                                <span className="badge bg-secondary fs-6 px-3 py-2">
                                                    Waived: {fmt(fa.waived_total)}
                                                </span>
                                            </div>
                                            {hasData && typeData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height={210}>
                                                    <BarChart data={typeData} margin={{ top: 0, right: 10, left: 10, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                                        <YAxis tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 11 }} />
                                                        <Tooltip formatter={(v, n) => [fmt(v), n]} />
                                                        <Legend />
                                                        <Bar dataKey="Pending" fill="#ffc107" radius={[4, 4, 0, 0]} />
                                                        <Bar dataKey="Paid"    fill="#198754" radius={[4, 4, 0, 0]} />
                                                        <Bar dataKey="Waived"  fill="#6f42c1" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <EmptyChart message="No fee data available." />
                                            )}
                                        </>
                                    );
                                })()}
                            </ChartCard>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── staff dashboard ──────────────────────────────────────────────────────────
function StaffDashboard({ d, onRefresh }) {
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setRefreshing(false);
        }
    };
    const borrowedCopies = (d.total_copies ?? 0) - (d.available_books ?? 0);

    return (
        <div className="container-fluid py-4 px-4">
            <div className="mb-4 d-flex justify-content-between align-items-center">
                <div>
                    <h1 className="fw-bold mb-1">📊 Library Dashboard</h1>
                    <p className="text-muted mb-0">Live operational overview</p>
                </div>
                <ButtonLoading
                    loading={refreshing}
                    loadingText="Refreshing..."
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleRefresh}
                >
                    🔄 Refresh
                </ButtonLoading>
            </div>

            <div className="row g-3 mb-3">
                <StatCard icon="📚" label="Total Books (titles)"  value={d.total_books}      accent="primary" />
                <StatCard icon="📗" label="Available Copies"      value={d.available_books}  accent="success" />
                <StatCard icon="📕" label="Borrowed Copies"       value={borrowedCopies}     accent="warning" />
                <StatCard icon="⏰" label="Overdue Loans"         value={d.overdue_loans}    accent="danger"  />
            </div>

            <div className="row g-3 mb-4">
                <StatCard icon="👥" label="Total Members"  value={d.total_members} accent="info"      />
                <StatCard icon="📖" label="Active Loans"   value={d.active_loans}  accent="primary"   />
                <StatCard icon="📦" label="Total Copies"   value={d.total_copies}  accent="secondary" />
                <StatCard icon="📋" label="All-time Loans" value={d.total_loans}   accent="secondary" />
            </div>

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 pt-3 pb-0">
                    <h6 className="fw-bold text-uppercase text-muted small mb-0">Needs Attention</h6>
                </div>
                <div className="card-body">
                    <div className="row g-3">
                        <ActionCard icon="📝" label="Book Requests"      value={d.pending_book_requests}    accent="warning" />
                        <ActionCard icon="🔄" label="Return Requests"    value={d.pending_return_requests}  accent="info"    />
                        <ActionCard icon="💰" label="Pending Fees"       value={d.pending_fees}             accent="danger"  />
                        <ActionCard icon="📌" label="Reservations"       value={d.pending_reservations}     accent="primary" />
                        <ActionCard
                            icon="💵"
                            label="Outstanding (₹)"
                            value={Number(d.outstanding_fees_amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            accent="danger"
                        />
                    </div>
                </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 pt-3 d-flex justify-content-between align-items-center">
                    <h6 className="fw-bold text-uppercase text-muted small mb-0">Recent Borrowing Activity</h6>
                    <span className="badge bg-light text-muted">Last 10</span>
                </div>
                <div className="card-body">
                    {d.recent_activity?.length > 0 ? (
                        d.recent_activity.map((item, i) => (
                            <div key={i} className="d-flex align-items-center gap-3 py-2 border-bottom">
                                <span className="fs-5">📖</span>
                                <span className="fw-semibold flex-shrink-0" style={{ minWidth: 140 }}>{item.member}</span>
                                <span className="badge bg-primary flex-shrink-0">Borrowed</span>
                                <span className="text-muted text-truncate">{item.book}</span>
                                <span className="text-muted small ms-auto flex-shrink-0">{item.date}</span>
                            </div>
                        ))
                    ) : (
                        <EmptyState
                            icon="📭"
                            title="No recent activity"
                            message="There is no recent borrowing activity to display."
                            className="shadow-none border"
                        />
                    )}
                </div>
            </div>

            {/* ── analytics section ── */}
            <AnalyticsSection />
        </div>
    );
}

// ─── root ─────────────────────────────────────────────────────────────────────
function Dashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState("");

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            setError("");
            const res = await api.get("dashboard/");
            setDashboard(res.data);
        } catch (err) {
            if (err.response) {
                setError(`Server error ${err.response.status}: ${err.response.statusText}`);
            } else if (err.request) {
                setError("Network error. Unable to connect to the backend.");
            } else {
                setError("Something went wrong while loading the dashboard.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboard(); }, []);

    if (loading) {
        return (
            <div className="container py-5">
                <LoadingStages
                    title="Loading dashboard"
                    stages={[
                        "Connecting to your dashboard",
                        "Fetching library statistics",
                        "Preparing dashboard cards",
                    ]}
                />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container py-4">
                <ErrorState
                    title="Unable to load dashboard"
                    message={error}
                    action={
                        <button
                            className="btn btn-danger btn-sm"
                            onClick={fetchDashboard}
                        >
                            🔄 Try Again
                        </button>
                    }
                />
            </div>
        );
    }

    if (!dashboard) return null;

    const isStaff = dashboard.role === "admin" || dashboard.role === "librarian";

    return isStaff
        ? <StaffDashboard d={dashboard} onRefresh={fetchDashboard} />
        : <MemberDashboard d={dashboard} onRefresh={fetchDashboard} />;
}

export default Dashboard;
