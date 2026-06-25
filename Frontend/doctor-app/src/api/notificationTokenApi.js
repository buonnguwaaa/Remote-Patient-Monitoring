import request from "./httpClient";

export async function registerNotificationToken(payload) {
  return request("/notification-tokens/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deactivateNotificationToken(payload) {
  return request("/notification-tokens/deactivate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
