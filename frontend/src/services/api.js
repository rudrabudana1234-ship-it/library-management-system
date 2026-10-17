import axios from "axios";

// Backend origin, configured through Vite environment variables.
// Local development falls back to your current Django server.
export const API_ORIGIN = (
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8002"
).replace(/\/+$/, "");

// Keep all regular API calls under the /api/ prefix.
export const API_BASE_URL = `${API_ORIGIN}/api/`;

// Create the Axios instance used throughout the frontend.
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Attach the saved access token to authenticated requests.
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access_token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Refresh expired access tokens and retry the original request.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only attempt refresh for a 401 response, once per request.
        if (
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            localStorage.getItem("refresh_token")
        ) {
            originalRequest._retry = true;

            try {
                const refreshToken =
                    localStorage.getItem("refresh_token");

                // Use the same configured backend in every environment.
                const response = await axios.post(
                    `${API_BASE_URL}auth/token/refresh/`,
                    { refresh: refreshToken },
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );

                const newAccessToken = response.data.access;

                localStorage.setItem(
                    "access_token",
                    newAccessToken
                );

                // Ensure the retried request uses the new token.
                originalRequest.headers =
                    originalRequest.headers || {};

                originalRequest.headers.Authorization =
                    `Bearer ${newAccessToken}`;

                return api(originalRequest);
            } catch (refreshError) {
                console.error(
                    "Refresh token failed:",
                    refreshError
                );

                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");

                window.location.href = "/login";

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;

// Notification API helpers.
export const notificationsApi = {
    list: (params = {}) =>
        api.get("notifications/", { params }),

    unreadCount: () =>
        api.get("notifications/unread-count/"),

    markRead: (id) =>
        api.post(`notifications/${id}/mark-read/`),

    markAllRead: () =>
        api.post("notifications/mark-all-read/"),
};