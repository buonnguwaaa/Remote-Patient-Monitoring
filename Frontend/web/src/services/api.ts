import axios from "axios";

// Create an Axios instance with default configuration
const api = axios.create({
    baseURL: "/api", // Use proxy to avoid Cross-Site cookie issues
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // This allows cookies to be sent with requests if needed
});

// Request interceptor (We don't need to manually attach token anymore since it's in Cookie)
api.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token expiration or errors
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Call refresh endpoint. The backend should read the refreshToken cookie
                // and set a new accessToken cookie.
                await api.post("/auth/refresh");

                // Retry the original request
                return api(originalRequest);
            } catch (refreshError) {
                // If refresh fails, redirect to login or handle logout
                // For now, we just reject so AuthContext can handle it (state cleanup)
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
