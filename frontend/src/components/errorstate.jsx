export default function ErrorState({
    icon = "⚠️",
    title = "Something went wrong",
    message = "We couldn't load the requested data. Please try again.",
    action = null,
    className = "",
}) {
    return (
        <div
            className={`card border-0 shadow-sm ${className}`.trim()}
        >
            <div className="card-body text-center py-5 px-4">
                <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle bg-light mb-3"
                    style={{
                        width: 64,
                        height: 64,
                        fontSize: 28,
                    }}
                    aria-hidden="true"
                >
                    {icon}
                </div>

                <h5 className="fw-semibold mb-2">{title}</h5>

                <p
                    className="text-muted mb-3 mx-auto"
                    style={{ maxWidth: 520 }}
                >
                    {message}
                </p>

                {action && <div>{action}</div>}
            </div>
        </div>
    );
}