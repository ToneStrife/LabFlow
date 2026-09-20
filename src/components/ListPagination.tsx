"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "@/hooks/use-client-pagination";
import { cn } from "@/lib/utils";

interface ListPaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  from: number;
  to: number;
  total: number;
  noun: string;
  pageSizeOptions?: readonly number[];
  className?: string;
}

function visiblePages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const set = new Set<number>([1, total, current, current - 1, current + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);

  const result: (number | "ellipsis")[] = [];
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i] - nums[i - 1] > 1) result.push("ellipsis");
    result.push(nums[i]);
  }
  return result;
}

const ListPagination: React.FC<ListPaginationProps> = ({
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  from,
  to,
  total,
  noun,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
}) => {
  const barRef = React.useRef<HTMLDivElement>(null);

  if (total === 0) return null;

  const goTo = (next: number) => {
    const clamped = Math.min(Math.max(1, next), pageCount);
    if (clamped === page) return;
    onPageChange(clamped);
    barRef.current?.parentElement?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      ref={barRef}
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-3 py-2",
        className
      )}
    >
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground tabular-nums">
          {from}–{to}
        </span>{" "}
        de{" "}
        <span className="font-medium text-foreground tabular-nums">{total}</span> {noun}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">Por página</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[4.5rem] text-xs" aria-label="Resultados por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {pageCount > 1 && (
          <nav aria-label="Paginación" className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => goTo(page - 1)}
              disabled={page <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {visiblePages(page, pageCount).map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`e-${index}`}
                  className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant={item === page ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8 text-xs tabular-nums"
                  onClick={() => goTo(item)}
                  aria-label={`Página ${item}`}
                  aria-current={item === page ? "page" : undefined}
                >
                  {item}
                </Button>
              )
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => goTo(page + 1)}
              disabled={page >= pageCount}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </nav>
        )}
      </div>
    </div>
  );
};

export default ListPagination;
