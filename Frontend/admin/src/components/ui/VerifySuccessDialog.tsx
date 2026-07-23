import React from "react";
import { FaUserCheck, FaUserMd, FaTimes, FaUserPlus } from "react-icons/fa";

interface VerifySuccessDialogProps {
  isOpen: boolean;
  patientName?: string;
  mode?: "create" | "verify";
  onClose: () => void;
  onGoToAssignment: () => void;
}

export const VerifySuccessDialog: React.FC<VerifySuccessDialogProps> = ({
  isOpen,
  patientName,
  mode = "verify",
  onClose,
  onGoToAssignment,
}) => {
  if (!isOpen) return null;

  const isCreateMode = mode === "create";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 border border-gray-100 dark:border-gray-700 transform transition-all text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <FaTimes className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
          {isCreateMode ? <FaUserPlus className="h-8 w-8" /> : <FaUserCheck className="h-8 w-8" />}
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {isCreateMode ? "Tạo tài khoản thành công!" : "Xác minh bệnh nhân thành công!"}
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          Tài khoản bệnh nhân <strong className="text-gray-900 dark:text-white">{patientName || "này"}</strong> đã được {isCreateMode ? "tạo và kích hoạt" : "xác minh & kích hoạt"} thành công. Bạn có muốn thực hiện phân công bác sĩ & y tá theo dõi cho bệnh nhân ngay bây giờ không?
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition"
          >
            Để sau
          </button>
          <button
            type="button"
            onClick={onGoToAssignment}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-green-600/20 hover:bg-green-700 focus:outline-none transition"
          >
            <FaUserMd className="h-4 w-4" />
            Phân công ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifySuccessDialog;
