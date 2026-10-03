export default function ButtonLoading({
    loading = false,
    loadingText = "Please wait...",
    children,
    disabled = false,
    className = "btn btn-primary",
    type = "button",
    onClick,
    ...props
}) {
    return (
        <button
            type={type}
            className={className}
            disabled={loading || disabled}
            onClick={onClick}
            aria-busy={loading}
            {...props}
        >
            {loading ? (
                <span className="d-inline-flex align-items-center gap-2">
                    <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                    />
                    <span>{loadingText}</span>
                </span>
            ) : (
                children
            )}
        </button>
    );
}
