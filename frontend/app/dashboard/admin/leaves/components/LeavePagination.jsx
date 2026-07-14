'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function LeavePagination({ currentPage, setCurrentPage, totalPages, itemsPerPage, filteredCount }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredCount)} of {filteredCount}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
          className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition">
          <ChevronLeft size={15} />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(page => (
          <button key={page} onClick={() => setCurrentPage(page)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition ${currentPage === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
            {page}
          </button>
        ))}
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
