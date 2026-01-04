import { useState } from "react";
import Pagination from "./Pagination";

// 1. Định nghĩa cấu trúc của một Cột

export type Column<T> = {
  header: string; // Tiêu đề cột (VD: "Tên", "Email")
  accessor?: keyof T; // Key truy cập dữ liệu trong object (VD: "name", "email")
  render?: (item: T) => React.ReactNode; // Hàm render tùy chỉnh (cho nút bấm, ảnh, badge...)
  className?: string; // Class CSS tùy chỉnh cho cột này
};

// 2. Định nghĩa Props của Table
interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void; // Sự kiện click vào hàng (tùy chọn)
  className?: string;
  itemsPerPage?: number; // Number of items per page
}

// 3. Component chính
// Sử dụng Generics <T,> để component hiểu kiểu dữ liệu động
const Table = <T,>({
  data,
  columns,
  onRowClick,
  className = "",
  itemsPerPage = 10,
}: TableProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <>
      {/* Table container with min-height to prevent pagination jumping */}
      <div className={`overflow-x-auto sm:rounded-lg min-h-[450px] ${className}`}>
        <table className="w-full text-sm text-left text-gray-500">
          {/* --- HEADER --- */}
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              {columns.map((col, index) => (
                <th
                  key={index}
                  scope="col"
                  className={`px-6 py-3 ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* --- BODY --- */}
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((item, rowIndex) => (
                <tr
                  key={rowIndex}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`bg-white border-t border-black/10 hover:bg-gray-50 transition-colors ${onRowClick ? "cursor-pointer" : ""
                    }`}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-6 py-4 ${col.className || ""}`}
                    >
                      {/* Logic hiển thị: Nếu có hàm render thì dùng hàm đó, không thì lấy text từ accessor */}
                      {col.render
                        ? col.render(item)
                        : col.accessor
                          ? (item[col.accessor] as React.ReactNode)
                          : null}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              // --- EMPTY STATE ---
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-gray-400"
                >
                  Không có dữ liệu hiển thị.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination - Always at bottom right */}
      {totalPages > 1 && (
        <div className="flex justify-end">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            className="my-8"
          />
        </div>
      )}
    </>
  );
};

export default Table;
