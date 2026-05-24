const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxDisplayed = 10; // Maximum number of page buttons to show

    let startPage = Math.max(1, currentPage - 4);
    let endPage = Math.min(totalPages, startPage + maxDisplayed - 1);

    // Adjust startPage if we're near the end
    if (endPage - startPage < maxDisplayed - 1) {
      startPage = Math.max(1, endPage - maxDisplayed + 1);
    }

    if (startPage > 1) {
      pages.push(
        <button key={1} onClick={() => handlePageChange(1)} className="mx-1 px-3 py-1 rounded bg-gray-200">
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(<span key="start-ellipsis">...</span>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`mx-1 px-3 py-1 rounded transition-all duration-200 ${
            currentPage === i
              ? "bg-purple-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="end-ellipsis">...</span>);
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="mx-1 px-3 py-1 rounded bg-gray-200"
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  return (
    <div className="flex flex-wrap justify-center mt-4 gap-2 px-2">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        className="px-3 py-1 text-sm sm:text-base bg-gray-300 rounded disabled:opacity-50"
        disabled={currentPage === 1}
      >
        Prev
      </button>

      {renderPageNumbers()}

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        className="px-3 py-1 text-sm sm:text-base bg-gray-300 rounded disabled:opacity-50"
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
