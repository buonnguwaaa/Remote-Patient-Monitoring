import { FaAngleLeft, FaAngleRight } from "react-icons/fa";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    className = "",
}: PaginationProps) => {
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 7; // Maximum number of page buttons to show

        if (totalPages <= maxVisible) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage > 3) {
                pages.push("...");
            }

            // Show pages around current page
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push("...");
            }

            // Always show last page
            pages.push(totalPages);
        }

        return pages;
    };

    return (
        <div className={`flex items-center justify-end gap-1 ${className}`}>
            {/* Previous Button */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                aria-label="Previous page"
            >
                <FaAngleLeft size={14} />
            </button>

            {/* Page Numbers */}
            {getPageNumbers().map((page, index) => {
                if (page === "...") {
                    return (
                        <span
                            key={`ellipsis-${index}`}
                            className="flex h-8 w-8 items-center justify-center text-gray-500"
                        >
                            ...
                        </span>
                    );
                }

                const pageNum = page as number;
                const isActive = pageNum === currentPage;

                return (
                    <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={`flex h-8 min-w-[2rem] items-center justify-center rounded-md border px-2 transition-colors ${isActive
                                ? "border-blue-500 bg-blue-500 text-white hover:bg-blue-600"
                                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                        aria-label={`Page ${pageNum}`}
                        aria-current={isActive ? "page" : undefined}
                    >
                        {pageNum}
                    </button>
                );
            })}

            {/* Next Button */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                aria-label="Next page"
            >
                <FaAngleRight size={14} />
            </button>
        </div>
    );
};

export default Pagination;
