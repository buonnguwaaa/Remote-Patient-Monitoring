import request from "./httpClient";

export async function previewInvite(token) {
  return request(`/auth/accept-invite/preview?token=${encodeURIComponent(token)}`, {
    method: "GET",
  });
}

export async function submitInvitePassword({ token, password, confirmedPassword }) {
  return request("/auth/accept-invite/api", {
    method: "POST",
    body: JSON.stringify({ token, password, confirmedPassword }),
  });
}

export default { previewInvite, submitInvitePassword };
