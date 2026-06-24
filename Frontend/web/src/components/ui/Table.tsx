import { useState } from "react";
import { useTranslation } from "react-i18next";
import Pagination from "./Pagination";

export type Column<T> = {
  header: React.ReactNode;
  accessor?: keyof T;
  render?: (item: T) => React.ReactNode;
  /** Extra classes applied to both <th> and <td> of this column */
  className?: string;
  /** Classes applied only to <th> */
  headerClassName?: string;
  /** Classes applied only to <td> */
  cellClassName?: string;
};

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  /** Unique key extractor for rows. Falls back to row index when omitted. */
  rowKey?: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  className?: string;
  /** Enable built-in pagination. Default: true */
  paginated?: boolean;
  itemsPerPage?: number;
  emptyText?: string;
  /** Show skeleton loading rows */
  loading?: boolean;
  /** Number of skeleton rows to show while loading */
  loadingRows?: number;
}

const Table = <T,>({
  data,
  columns,
  rowKey,
  onRowClick,
  className = "",
  paginated = true,
  itemsPerPage = 10,
  emptyText,
  loading = false,
  loadingRows = 5,
}: TableProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const { t } = useTranslation();

  const totalPages = paginated ? Math.ceil(data.length / itemsPerPage) : 1;
  const startIndex = paginated ? (currentPage - 1) * itemsPerPage : 0;
  const endIndex = paginated ? startIndex + itemsPerPage : data.length;
  const currentData = data.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className={`flex flex-col gap-0 ${className}`}>
      {/* Table wrapper */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                {columns.map((col, index) => (
                  <th
                    key={index}
                    scope="col"
                    className={`whitespace-nowrap py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-300 ${col.className ?? "px-3"} ${col.headerClassName ?? ""}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {loading ? (
                /* Skeleton rows */
                Array.from({ length: loadingRows }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`}>
                    {columns.map((_, colIndex) => (
                      <td key={colIndex} className="px-3 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : currentData.length > 0 ? (
                currentData.map((item, rowIndex) => (
                  <tr
                    key={rowKey ? rowKey(item) : rowIndex}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/70 ${
                      onRowClick ? "cursor-pointer" : ""
                    }`}
                  >
                    {columns.map((col, colIndex) => (
                      <td
                        key={colIndex}
                        className={`py-3 ${col.className ?? "px-3"} ${col.cellClassName ?? ""}`}
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
                    className="px-6 py-10 text-center text-sm text-gray-400 dark:text-slate-500"
                  >
                    {emptyText ?? t("common.noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {paginated && !loading && totalPages > 1 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("common.showing")}{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {startIndex + 1}–{Math.min(endIndex, data.length)}
            </span>{" "}
            {t("common.of")}{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {data.length}
            </span>
          </p>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default Table;
