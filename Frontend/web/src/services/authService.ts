import api from "./api";

export async function forgotPassword(email: string) {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
}

export async function verifyResetOtp(email: string, otp: string) {
  const response = await api.post("/auth/verify-reset-otp", { email, otp });
  return response.data;
}

export async function resetPassword(data: {
  email: string;
  otp: string;
  newPassword: string;
  confirmedNewPassword: string;
}) {
  const response = await api.post("/auth/reset-password", data);
  return response.data;
}
