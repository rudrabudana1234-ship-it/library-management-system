import axios from "axios";

const api = axios.create({
    baseURL: "http://127.0.0.1:8001/api/",
    headers: {
        "Content-Type": "application/json",
    },
});


/* =========================================
   REQUEST INTERCEPTOR
   Attach access token automatically
========================================= */

api.interceptors.request.use(
    (config) => {

        const token = localStorage.getItem("access_token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);


/* =========================================
   RESPONSE INTERCEPTOR
   Handle expired access token
========================================= */

api.interceptors.response.use(

    (response) => {
        return response;
    },

    async (error) => {

        const originalRequest = error.config;

        /* -------------------------------------
           If access token expired
        ------------------------------------- */

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            localStorage.getItem("refresh_token")
        ) {

            originalRequest._retry = true;

            try {

                const refreshToken =
                    localStorage.getItem("refresh_token");

                const response = await axios.post(
                    "http://127.0.0.1:8001/api/auth/token/refresh/",
                    {
                        refresh: refreshToken,
                    }
                );

                const newAccessToken =
                    response.data.access;

                /* Save new access token */

                localStorage.setItem(
                    "access_token",
                    newAccessToken
                );

                /* Update original request */

                originalRequest.headers.Authorization =
                    `Bearer ${newAccessToken}`;

                /* Retry original request */

                return api(originalRequest);

            } catch (refreshError) {

                console.error(
                    "Refresh token expired:",
                    refreshError
                );

                /* Remove invalid tokens */

                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");

                /* Send user to login */

                window.location.href = "/login";

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);


export default api;