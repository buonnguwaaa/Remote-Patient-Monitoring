import request from "./httpClient";

export async function getMyPatientProfile() {
  return request("/users/patients/me", { method: "GET" });
}

export async function getMyNurseProfile() {
  return request("/users/nurses/me", { method: "GET" });
}

export async function updateMyPatientProfile(payload) {
  return request("/users/patients/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadMyPatientAvatar(formData) {
  return request("/users/patients/me/avatar", {
    method: "POST",
    body: formData,
  });
}

export async function updateMyNurseProfile(payload) {
  return request("/users/nurses/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadMyNurseAvatar(formData) {
  return request("/users/nurses/me/avatar", {
    method: "POST",
    body: formData,
  });
}

export default {
  getMyPatientProfile,
  getMyNurseProfile,
  updateMyPatientProfile,
  uploadMyPatientAvatar,
  updateMyNurseProfile,
  uploadMyNurseAvatar,
};

