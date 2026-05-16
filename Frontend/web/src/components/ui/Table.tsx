import { useState } from "react";
import { useTranslation } from "react-i18next";
import Pagination from "./Pagination";

export type Column<T> = {
  header: React.ReactNode;
  accessor?: keyof T;
  render?: (item: T) => React.ReactNode;
  className?: string;
};

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  className?: string;
  itemsPerPage?: number;
  emptyText?: string;
}

const Table = <T,>({
  data,
  columns,
  onRowClick,
  className = "",
  itemsPerPage = 10,
  emptyText,
}: TableProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const { t } = useTranslation();

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <>
      <div
        className={`overflow-x-auto sm:rounded-lg min-h-[450px] ${className}`}
      >
        <table className="w-full text-sm text-left text-gray-500 dark:text-slate-400">
          <thead className="text-xs text-gray-700 dark:text-slate-300 uppercase bg-gray-50 dark:bg-slate-800">
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

          <tbody>
            {currentData.length > 0 ? (
              currentData.map((item, rowIndex) => (
                <tr
                  key={rowIndex}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`bg-white dark:bg-slate-900 border-t border-black/10 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-6 py-4 ${col.className || ""}`}
                    >
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
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-8 text-center text-gray-400 dark:text-slate-500"
                >
                  {emptyText ?? t("common.noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
