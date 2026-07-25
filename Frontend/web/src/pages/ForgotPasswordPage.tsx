import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineArrowLeft,
  HiOutlineShieldCheck,
} from "react-icons/hi";
import { forgotPassword, verifyResetOtp, resetPassword } from "../services/authService";

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // BƯỚC 1: Gửi Email nhận OTP
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setErrorMsg("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }

    try {
      setLoading(true);
      await forgotPassword(trimmedEmail);
      setSuccessMsg("Mã OTP 6 chữ số đã được gửi tới email của bạn.");
      setStep(2);
    } catch (err: any) {
      const serverErr =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Email không tồn tại trong hệ thống hoặc đã xảy ra lỗi.";
      setErrorMsg(serverErr);
    } finally {
      setLoading(false);
    }
  };

  // BƯỚC 2: Xác thực mã OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setErrorMsg("Vui lòng nhập đủ 6 chữ số mã OTP.");
      return;
    }

    try {
      setLoading(true);
      await verifyResetOtp(email.trim().toLowerCase(), trimmedOtp);
      setSuccessMsg("Xác thực OTP thành công! Vui lòng nhập mật khẩu mới.");
      setStep(3);
    } catch (err: any) {
      const serverErr =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Mã OTP không hợp lệ hoặc đã hết hạn.";
      setErrorMsg(serverErr);
    } finally {
      setLoading(false);
    }
  };

  // BƯỚC 3: Đặt mật khẩu mới
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setLoading(true);
      await resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
        confirmedNewPassword: confirmPassword,
      });
      setStep(4);
    } catch (err: any) {
      const serverErr =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Không thể đặt lại mật khẩu. Vui lòng thử lại.";
      setErrorMsg(serverErr);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      setLoading(true);
      await forgotPassword(email.trim().toLowerCase());
      setSuccessMsg("Đã gửi lại mã OTP mới tới email của bạn.");
    } catch (err: any) {
      setErrorMsg("Không thể gửi lại OTP. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <HiOutlineShieldCheck className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Khôi phục mật khẩu
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          Hệ thống Quản lý & Theo dõi Bệnh nhân từ xa
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          {/* Step Indicator */}
          {step < 4 && (
            <div className="flex items-center justify-center space-x-2 mb-6">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= 1 ? "w-8 bg-blue-600" : "w-4 bg-slate-200"
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= 2 ? "w-8 bg-blue-600" : "w-4 bg-slate-200"
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= 3 ? "w-8 bg-blue-600" : "w-4 bg-slate-200"
                }`}
              />
            </div>
          )}

          {/* Alert Messages */}
          {errorMsg && (
            <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <HiOutlineExclamationCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium text-red-700">{errorMsg}</p>
            </div>
          )}

          {successMsg && step !== 4 && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium text-emerald-700">{successMsg}</p>
            </div>
          )}

          {/* STEP 1: NHẬP EMAIL */}
          {step === 1 && (
            <form onSubmit={handleSendEmail} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                  Địa chỉ Email tài khoản
                </label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <HiOutlineMail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@hospital.vn"
                    className="block w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Mã xác thực OTP 6 chữ số sẽ được gửi tới Email này.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm"
              >
                {loading ? "Đang gửi mã OTP..." : "Gửi mã xác thực OTP"}
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <HiOutlineArrowLeft className="w-4 h-4" /> Quay lại Đăng nhập
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: XÁC THỰC OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="block text-xs font-semibold text-slate-500">
                  Email nhận mã OTP:
                </span>
                <span className="block text-sm font-bold text-slate-900 mt-0.5 truncate">
                  {email}
                </span>
              </div>

              <div>
                <label htmlFor="otp" className="block text-sm font-semibold text-slate-700">
                  Mã xác thực OTP (6 chữ số)
                </label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <input
                    type="text"
                    id="otp"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="block w-full text-center tracking-widest font-mono text-xl py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm"
              >
                {loading ? "Đang kiểm tra..." : "Xác nhận mã OTP"}
              </button>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  ← Đổi Email khác
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Gửi lại OTP
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: ĐẶT MẬT KHẨU MỚI */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-semibold text-slate-700">
                  Mật khẩu mới
                </label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <HiOutlineLockClosed className="w-5 h-5" />
                  </div>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    id="newPassword"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ít nhất 6 ký tự"
                    className="block w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? (
                      <HiOutlineEyeOff className="w-5 h-5" />
                    ) : (
                      <HiOutlineEye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700">
                  Xác nhận mật khẩu mới
                </label>
                <div className="mt-2 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <HiOutlineLockClosed className="w-5 h-5" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="block w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <HiOutlineEyeOff className="w-5 h-5" />
                    ) : (
                      <HiOutlineEye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md shadow-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm"
              >
                {loading ? "Đang cập nhật..." : "Đổi mật khẩu & Hoàn tất"}
              </button>
            </form>
          )}

          {/* STEP 4: THÀNH CÔNG */}
          {step === 4 && (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <HiOutlineCheckCircle className="w-10 h-10 text-emerald-600" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Đặt lại mật khẩu thành công!
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Mật khẩu cho tài khoản <span className="font-semibold text-slate-800">{email}</span> đã được cập nhật. Bạn có thể sử dụng mật khẩu mới để đăng nhập.
                </p>
              </div>

              <button
                onClick={() => navigate("/login")}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-sm"
              >
                Đăng nhập ngay
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
