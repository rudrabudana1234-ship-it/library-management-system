import { useEffect, useState } from "react";

const DEFAULT_STAGES = [
    "Starting request",
    "Fetching data",
    "Preparing results",
];

export default function LoadingStages({
    title = "Loading",
    stages = DEFAULT_STAGES,
    compact = false,
}) {
    const [activeStage, setActiveStage] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveStage((current) =>
                current < stages.length - 1
                    ? current + 1
                    : current
            );
        }, 650);

        return () => clearInterval(timer);
    }, [stages.length]);

    return (
        <div
            className={`card border-0 shadow-sm ${
                compact ? "p-3" : ""
            }`}
        >
            <div
                className={`card-body text-center ${
                    compact ? "py-3" : "py-5"
                }`}
            >
                <div
                    className="spinner-border text-primary mb-3"
                    role="status"
                    aria-label={title}
                >
                    <span className="visually-hidden">
                        {title}
                    </span>
                </div>

                <h6 className="fw-semibold mb-3">
                    {title}...
                </h6>

                <div
                    className="mx-auto text-start"
                    style={{ maxWidth: "330px" }}
                    aria-live="polite"
                >
                    {stages.map((stage, index) => {
                        const completed = index < activeStage;
                        const current = index === activeStage;

                        return (
                            <div
                                key={stage}
                                className={`d-flex align-items-center gap-2 small mb-2 ${
                                    completed || current
                                        ? "text-dark"
                                        : "text-muted"
                                }`}
                            >
                                <span
                                    className={`d-inline-flex align-items-center justify-content-center rounded-circle ${
                                        completed
                                            ? "bg-success text-white"
                                            : current
                                                ? "bg-primary text-white"
                                                : "bg-light text-muted border"
                                    }`}
                                    style={{
                                        width: 22,
                                        height: 22,
                                        minWidth: 22,
                                        fontSize: 12,
                                    }}
                                >
                                    {completed
                                        ? "✓"
                                        : current
                                            ? "•"
                                            : index + 1}
                                </span>

                                <span
                                    className={
                                        current
                                            ? "fw-semibold"
                                            : ""
                                    }
                                >
                                    {stage}
                                </span>

                                {current && (
                                    <span
                                        className="spinner-grow spinner-grow-sm text-primary ms-auto"
                                        aria-hidden="true"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}