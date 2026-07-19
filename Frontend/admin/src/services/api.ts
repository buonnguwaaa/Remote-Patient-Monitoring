import axios from "axios";

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}`,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

api.interceptors.request.use(
    (config) => {
        const lat = sessionStorage.getItem("user_lat");
        const lng = sessionStorage.getItem("user_lng");
        if (lat) {
            config.headers["X-Location-Lat"] = lat;
        }
        if (lng) {
            config.headers["X-Location-Lng"] = lng;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                await api.post("/auth/refresh");

                return api(originalRequest);
            } catch (refreshError) {
                if (!window.location.pathname.endsWith("/login")) {
                    window.location.href = "/login";
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
