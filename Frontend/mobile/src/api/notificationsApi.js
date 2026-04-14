import request from "./httpClient";

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.append(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function getMyNotifications(params = {}) {
  return request(`/notifications${buildQuery(params)}`, {
    method: "GET",
  });
}

export function getUnreadNotificationCount() {
  return request("/notifications/unread-count", {
    method: "GET",
  });
}

export function markNotificationRead(notificationId) {
  return request(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export default {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
};
