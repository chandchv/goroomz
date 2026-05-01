import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Smart Pagination Component
 * Shows a limited number of page buttons with ellipsis for large page counts
 * 
 * @param {number} currentPage - Current active page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Callback when page changes
 * @param {number} maxVisible - Maximum number of page buttons to show (default: 7)
 */
const Pagination = ({ currentPage, totalPages, onPageChange, maxVisible = 7 }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    
    // If total pages is less than max visible, show all
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    const leftSiblingIndex = Math.max(currentPage - 1, 2);
    const rightSiblingIndex = Math.min(currentPage + 1, totalPages - 1);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      // Show more pages on the left
      const leftItemCount = maxVisible - 2; // -2 for first and last page
      for (let i = 2; i <= leftItemCount; i++) {
        pages.push(i);
      }
      pages.push('...');
    } else if (shouldShowLeftDots && !shouldShowRightDots) {
      // Show more pages on the right
      pages.push('...');
      const rightItemCount = maxVisible - 2;
      for (let i = totalPages - rightItemCount + 1; i < totalPages; i++) {
        pages.push(i);
      }
    } else if (shouldShowLeftDots && shouldShowRightDots) {
      // Show dots on both sides
      pages.push('...');
      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        pages.push(i);
      }
      pages.push('...');
    } else {
      // Show all middle pages
      for (let i = 2; i < totalPages; i++) {
        pages.push(i);
      }
    }

    // Always show last page
    pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
      {/* First Page Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="hidden sm:flex"
        title="First page"
      >
        <ChevronsLeft className="w-4 h-4" />
      </Button>

      {/* Previous Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        title="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline ml-1">Previous</span>
      </Button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-2 text-muted-foreground"
              >
                ...
              </span>
            );
          }

          return (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className={`min-w-[40px] ${
                currentPage === page 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : ''
              }`}
            >
              {page}
            </Button>
          );
        })}
      </div>

      {/* Next Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        title="Next page"
      >
        <span className="hidden sm:inline mr-1">Next</span>
        <ChevronRight className="w-4 h-4" />
      </Button>

      {/* Last Page Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="hidden sm:flex"
        title="Last page"
      >
        <ChevronsRight className="w-4 h-4" />
      </Button>

      {/* Page Info */}
      <div className="text-sm text-muted-foreground ml-2 hidden md:block">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );
};

export default Pagination;
