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
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Mutex để tránh nhiều request 401 cùng lúc đều tự gọi refresh riêng
let isRefreshing = false;
let refreshSubscribers: Array<(success: boolean) => void> = [];

function onRefreshComplete(success: boolean) {
    refreshSubscribers.forEach((cb) => cb(success));
    refreshSubscribers = [];
}

api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            if (isRefreshing) {
                // Có refresh đang chạy → chờ kết quả rồi retry
                return new Promise((resolve, reject) => {
                    refreshSubscribers.push((success) => {
                        if (success) {
                            if (originalRequest.headers) {
                                delete originalRequest.headers["Authorization"];
                            }
                            resolve(api({ ...originalRequest, withCredentials: true }));
                        } else {
                            reject(error);
                        }
                    });
                });
            }

            isRefreshing = true;

            try {
                await api.post("/auth/refresh", {}, { withCredentials: true });

                isRefreshing = false;
                onRefreshComplete(true);

                if (originalRequest.headers) {
                    delete originalRequest.headers["Authorization"];
                }
                return api({ ...originalRequest, withCredentials: true });
            } catch (refreshError) {
                isRefreshing = false;
                onRefreshComplete(false);

                // Refresh token hết hạn hoặc không hợp lệ → đẩy user về trang đăng nhập
                if (window.location.pathname !== "/login") {
                    window.location.href = "/login";
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;

