import React from "react";
import { FaUserMd, FaRegUser, FaUserNurse } from "react-icons/fa";
import { MdAdminPanelSettings } from "react-icons/md";
import { Link } from "react-router-dom";

const AdminDashboard: React.FC = () => {
  const stats = [
    {
      icon: <FaUserMd className="text-4xl text-blue-600" />,
      label: "Bác sĩ",
      count: 25,
      link: "/doctors",
      color: "bg-blue-50",
    },
    {
      icon: <FaRegUser className="text-4xl text-green-600" />,
      label: "Bệnh nhân",
      count: 150,
      link: "/patients",
      color: "bg-green-50",
    },
    {
      icon: <FaUserNurse className="text-4xl text-purple-600" />,
      label: "Y tá",
      count: 40,
      link: "/nurses",
      color: "bg-purple-50",
    },
    {
      icon: <MdAdminPanelSettings className="text-4xl text-orange-600" />,
      label: "Hệ thống",
      count: "Online",
      link: "/system-settings",
      color: "bg-orange-50",
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Bảng điều khiển quản trị
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Quản lý hệ thống giám sát bệnh nhân từ xa
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="block bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
          >
            <div className={`${stat.color} rounded-full w-16 h-16 flex items-center justify-center mb-4`}>
              {stat.icon}
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
              {stat.label}
            </h3>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{stat.count}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Hoạt động gần đây
          </h2>
          <Link
            to="/activity-history"
            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center"
          >
            Xem tất cả
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b dark:border-gray-700">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-gray-700 dark:text-gray-300">Bác sĩ Nguyễn Văn A đã đăng nhập</span>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">5 phút trước</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b dark:border-gray-700">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-gray-700 dark:text-gray-300">Thêm bệnh nhân mới: Trần Thị B</span>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">15 phút trước</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b dark:border-gray-700">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
              <span className="text-gray-700 dark:text-gray-300">Cập nhật thông tin y tá</span>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">1 giờ trước</span>
          </div>
        </div>
      </div>
    </div >
  );
};

export default AdminDashboard;
