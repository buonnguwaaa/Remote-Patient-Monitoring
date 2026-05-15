import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineEnvelope, HiLockClosed, HiOutlineEye, HiOutlineEyeSlash } from "react-icons/hi2";
import { useAuth } from "../../../context/AuthContext";
import { useTranslation } from "react-i18next";

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const role = await login(username, password);
    setIsLoading(false);

    if (role) {
      navigate("/");
    } else {
      setError("Email hoặc mật khẩu không đúng.");
    }
  };

  return (
    <div className="flex w-full max-w-md min-h-100 flex-col items-center bg-gray-50 p-8 rounded">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-gray-900 text-2xl font-bold text-white">
        RPM
      </div>
      <p className="mb-6 text-lg font-medium text-gray-600 text-center">
        Xin chào bạn đến với hệ thống RPM
      </p>

      <h2 className="mb-8 text-2xl font-semibold text-gray-800">
        Đăng nhập tài khoản
      </h2>
      <form className="w-full" onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="mb-5">
          <label
            htmlFor="username"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <HiOutlineEnvelope className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              id="username"
              className="block w-full rounded-md border border-gray-300 bg-white p-3 pl-10 text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="user@example.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="mb-5">
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            {t("auth.password")}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <HiLockClosed className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              className="block w-full rounded-md border border-gray-300 bg-white p-3 pl-10 pr-10 text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="**********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <HiOutlineEyeSlash className="h-5 w-5" />
              ) : (
                <HiOutlineEye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="mb-6 text-right">
          <a href="#" className="text-sm text-gray-700 hover:underline">
            Quên mật khẩu ?
          </a>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-gray-900 px-4 py-3 text-base font-semibold text-white shadow-sm transition duration-200 ease-in-out hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? t("dashboard.generating") : t("auth.login")}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
