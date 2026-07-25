import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  HiLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiShieldCheck,
  HiCheckCircle,
  HiExclamationTriangle,
  HiHeart,
  HiUser,
  HiArrowRight,
  HiSparkles,
  HiCheck
} from "react-icons/hi2";
import api from "../services/api";

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [userName, setUserName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmedPassword, setConfirmedPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmedPassword, setShowConfirmedPassword] = useState<boolean>(false);

  const [checkingToken, setCheckingToken] = useState<boolean>(true);
  const [tokenExpired, setTokenExpired] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setTokenExpired(true);
        setCheckingToken(false);
        return;
      }

      try {
        setCheckingToken(true);
        const res = await api.get(`/auth/accept-invite/preview?token=${encodeURIComponent(token)}`);
        if (res.data?.valid) {
          setUserName(res.data.name || "");
          setTokenExpired(false);
        } else {
          setTokenExpired(true);
        }
      } catch (err: any) {
        setTokenExpired(true);
      } finally {
        setCheckingToken(false);
      }
    }

    verifyToken();
  }, [token]);

  // Password validation stats
  const hasMinLength = password.length >= 6;
  const passwordsMatch = password.length > 0 && password === confirmedPassword;
  const isFormValid = hasMinLength && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!hasMinLength) {
      setErrorMessage("Mật khẩu phải chứa ít nhất 6 ký tự.");
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/accept-invite/api", {
        token,
        password,
        confirmedPassword,
      });

      if (res.status === 200) {
        setIsSuccess(true);
      }
    } catch (err: any) {
      const errorText =
        err.response?.data?.error || err.message || "Không thể khởi tạo mật khẩu.";
      if (errorText.toLowerCase().includes("hết hạn") || errorText.toLowerCase().includes("không hợp lệ")) {
        setTokenExpired(true);
      } else {
        setErrorMessage(errorText);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-900 font-sans text-slate-800 antialiased selection:bg-blue-500 selection:text-white">
      {/* LEFT PANEL - Hero Branding & Visual Highlights */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-12 flex-col justify-between border-r border-slate-800/60">
        {/* Ambient Glow Orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center space-x-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/30 flex items-center justify-center">
            <img src="/doctor-logo.png" alt="RPM" className="h-full w-full rounded-[14px] object-cover" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-white">RPM</span>
            <span className="block text-xs font-medium text-blue-400 tracking-wider uppercase">Remote Patient Monitoring</span>
          </div>
        </div>

        {/* Hero Central Content */}
        <div className="relative z-10 my-auto max-w-lg">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold backdrop-blur-md mb-6">
            <HiSparkles className="h-4 w-4 text-blue-400" />
            <span>Kích hoạt Tài khoản Cán bộ Y tế</span>
          </div>

          <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Theo dõi & Giám sát Sức khỏe Bệnh nhân <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-300 bg-clip-text text-transparent">Từ xa</span>
          </h2>

          <p className="text-slate-300 text-base leading-relaxed mb-8">
            Chào mừng Bác sĩ đến với nền tảng RPM. Hãy khởi tạo mật khẩu cá nhân để bảo mật thông tin và bắt đầu tiếp nhận hồ sơ bệnh án theo dõi trực tuyến.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <div className="h-9 w-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                <HiHeart className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Giám sát Chỉ số</h4>
              <p className="text-xs text-slate-400 leading-normal">Cảnh báo ngưỡng Huyết áp & Đường huyết tự động 24/7</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                <HiShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Bảo mật Y tế</h4>
              <p className="text-xs text-slate-400 leading-normal">Mã hóa dữ liệu bệnh nhân đạt tiêu chuẩn y khoa</p>
            </div>
          </div>
        </div>

        {/* Footer Quote */}
        <div className="relative z-10 pt-6 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} Remote Patient Monitoring System</span>
          <span className="flex items-center gap-1 text-slate-400">
            <HiShieldCheck className="h-4 w-4 text-emerald-400" /> Hệ thống bảo mật
          </span>
        </div>
      </div>

      {/* RIGHT PANEL - Form Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-slate-50 dark:bg-slate-950 relative overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          {checkingToken ? (
            /* LOADING STATE */
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 shadow-2xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="relative inline-flex items-center justify-center mb-6">
                <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-solid border-blue-600 border-r-transparent" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Đang xác thực liên kết...</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Vui lòng đợi trong giây lát</p>
            </div>
          ) : tokenExpired ? (
            /* EXPIRED TOKEN STATE */
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 shadow-2xl border border-red-100 dark:border-red-950/30 text-center relative overflow-hidden">
              <div className="w-20 h-20 bg-red-50 dark:bg-red-950/40 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/30 shadow-inner">
                <HiExclamationTriangle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3">
                Liên kết không hợp lệ hoặc đã hết hạn
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Liên kết kích hoạt tài khoản chỉ có hiệu lực trong <strong className="text-slate-800 dark:text-slate-200">15 phút</strong> và chỉ sử dụng được 1 lần. Vui lòng liên hệ Quản trị viên hệ thống để cấp lại liên kết mới.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="w-full py-3.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
              >
                <span>Về trang Đăng nhập</span>
                <HiArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : isSuccess ? (
            /* SUCCESS STATE */
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 shadow-2xl border border-emerald-100 dark:border-emerald-950/30 text-center relative overflow-hidden">
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-500 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 shadow-inner">
                <HiCheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3">
                Đặt mật khẩu thành công! 🎉
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Tài khoản của bạn đã sẵn sàng. Hãy đăng nhập vào hệ thống bằng mật khẩu vừa khởi tạo.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                <span>Đăng nhập Cổng Bác sĩ</span>
                <HiArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* FORM STATE */
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-100 dark:border-slate-800">
              {/* Header Title inside Card */}
              <div className="mb-8">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-3">
                  <HiShieldCheck className="h-4 w-4" />
                  <span>Khởi tạo Mật khẩu</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Thiết lập Mật khẩu
                </h1>
                {userName && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center flex-shrink-0 font-bold">
                      <HiUser className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs text-slate-400 font-medium">Bác sĩ tiếp nhận</span>
                      <span className="block text-sm font-bold text-slate-800 dark:text-white truncate">{userName}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs font-medium text-red-600 dark:text-red-400 flex items-start gap-3">
                  <HiExclamationTriangle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <HiLockClosed className="h-5 w-5" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      required
                      minLength={6}
                      className="w-full pl-11 pr-11 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <HiOutlineEyeSlash className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <HiLockClosed className="h-5 w-5" />
                    </div>
                    <input
                      type={showConfirmedPassword ? "text" : "password"}
                      value={confirmedPassword}
                      onChange={(e) => setConfirmedPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      required
                      minLength={6}
                      className="w-full pl-11 pr-11 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmedPassword(!showConfirmedPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showConfirmedPassword ? <HiOutlineEyeSlash className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Live Password Validation Checklist */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${hasMinLength ? "bg-emerald-500 text-white" : "bg-slate-300 dark:bg-slate-700 text-slate-500"}`}>
                      <HiCheck className="h-3 w-3 stroke-[3]" />
                    </div>
                    <span className={hasMinLength ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}>Tối thiểu 6 ký tự</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${passwordsMatch ? "bg-emerald-500 text-white" : "bg-slate-300 dark:bg-slate-700 text-slate-500"}`}>
                      <HiCheck className="h-3 w-3 stroke-[3]" />
                    </div>
                    <span className={passwordsMatch ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}>Mật khẩu xác nhận phải trùng khớp</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-indigo-600 flex items-center justify-center gap-2 mt-6"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
                      <span>Đang lưu mật khẩu...</span>
                    </>
                  ) : (
                    <>
                      <span>Lưu mật khẩu & Đăng nhập</span>
                      <HiArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
