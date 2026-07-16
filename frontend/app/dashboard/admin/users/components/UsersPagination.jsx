'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function UsersPagination({ currentPage, setCurrentPage, totalPages, itemsPerPage, filteredCount }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border px-6 py-4">
      <p className="text-sm text-muted-foreground">
        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCount)} of {filteredCount} users
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous users page"
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          disabled={currentPage === 1}
          className="rounded-lg border border-border p-2 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
          <button
            type="button"
            aria-label={`Go to users page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`h-8 w-8 rounded-lg text-sm font-medium transition ${
              currentPage === page
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          aria-label="Next users page"
          onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-border p-2 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
