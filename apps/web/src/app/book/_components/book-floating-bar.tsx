"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ChevronRight } from "lucide-react";
import type { BookCopy } from "./book-types";

interface BookFloatingBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  copy: BookCopy;
}

export function BookFloatingBar({
  selectedIds,
  onClearSelection,
  copy,
}: BookFloatingBarProps) {
  return (
    <AnimatePresence>
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-5 left-1/2 z-[100] w-[min(92%,36rem)] -translate-x-1/2 sm:bottom-8"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#1C3A34] px-4 py-3 text-white shadow-xl dark:border-[#C9B87A]/25 dark:bg-[#171c24] dark:shadow-black/45 sm:px-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#C9B87A] text-[#1C3A34]">
              <ShoppingBag className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {selectedIds.length === 1
                  ? copy.selectedCountOne
                  : copy.selectedCountMany.replace("{count}", String(selectedIds.length))}
              </p>
              <p className="text-[11px] font-medium text-[#C9B87A]">{copy.readyToDispatch}</p>
            </div>
            <button
              type="button"
              onClick={onClearSelection}
              className="hidden text-xs font-bold text-white/55 transition-colors hover:text-white sm:inline"
            >
              {copy.clearSelection}
            </button>
            <Link
              href={`/book/request?ids=${selectedIds.join(",")}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#C9B87A] px-4 py-2.5 text-sm font-extrabold text-[#1C3A34] transition-colors hover:bg-[#d4c48a]"
            >
              {copy.requestCart}
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
