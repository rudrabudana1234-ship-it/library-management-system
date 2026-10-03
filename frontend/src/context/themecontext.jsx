import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "library_lms_theme";

function getInitialTheme() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved === "dark" || saved === "light") {
            return saved;
        }

        if (
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
        ) {
            return "dark";
        }
    } catch {
        // Fall back to light mode when storage/media queries are unavailable.
    }

    return "light";
}

function applyTheme(theme) {
    const isDark = theme === "dark";

    document.documentElement.setAttribute(
        "data-bs-theme",
        theme
    );

    document.body.classList.toggle(
        "lms-dark-mode",
        isDark
    );

    document.body.classList.toggle(
        "lms-light-mode",
        !isDark
    );
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        applyTheme(theme);

        try {
            localStorage.setItem(
                STORAGE_KEY,
                theme
            );
        } catch {
            // Ignore storage failures. The theme still works for the current session.
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme((current) =>
            current === "dark" ? "light" : "dark"
        );
    };

    const value = useMemo(
        () => ({
            theme,
            isDarkMode: theme === "dark",
            toggleTheme,
            setTheme,
        }),
        [theme]
    );

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error(
            "useTheme must be used inside ThemeProvider"
        );
    }

    return context;
}
