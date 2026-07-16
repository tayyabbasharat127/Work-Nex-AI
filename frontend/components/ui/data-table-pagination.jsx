'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

function getPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

export function DataTablePagination({ currentPage, setCurrentPage, totalPages, itemsPerPage, filteredCount, itemLabel = 'results' }) {
  if (totalPages <= 1) return null;
  const pages = getPageList(currentPage, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span>
        {'–'}
        <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, filteredCount)}</span> of{' '}
        <span className="font-medium text-foreground">{filteredCount}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
          <ChevronLeft size={15} />
        </Button>
        {pages.map((page, i) => (
          <span key={page} className="flex items-center">
            {i > 0 && pages[i - 1] !== page - 1 && <span className="px-1 text-sm text-muted-foreground">{'…'}</span>}
            <Button variant={currentPage === page ? 'default' : 'ghost'} size="icon-sm" onClick={() => setCurrentPage(page)}>
              {page}
            </Button>
          </span>
        ))}
        <Button variant="outline" size="icon-sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
          <ChevronRight size={15} />
        </Button>
      </div>
    </div>
  );
}
