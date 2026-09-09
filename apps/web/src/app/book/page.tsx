"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { getStoredUser, clearAuthSession } from "@/lib/auth-session";
import type { User as AuthUser } from "@smart-dispatch/types";
import { LocaleProvider, useLocale } from "@/components/shared/providers";
import { BOOK_COPY, staggerContainer } from "./_components/book-types";
import { BookHeader } from "./_components/book-header";
import { BookFilters } from "./_components/book-filters";
import { VehicleCard } from "./_components/vehicle-card";
import { BookFloatingBar } from "./_components/book-floating-bar";
import { VehicleSkeletonGrid } from "./_components/vehicle-card-skeleton";
import { usePublicVehicles, BATCH_SIZE } from "./_components/use-public-vehicles";

function PublicVehiclesPageContent() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const { locale, setLocale } = useLocale();
  const copy = BOOK_COPY[locale === "am" ? "am" : "en"];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const {
    vehicles,
    types,
    classes,
    loading,
    isLoadingMore,
    totalVehicles,
    hasNextPage,
    loadMore,
    search,
    setSearch,
    selectedType,
    setSelectedType,
    selectedClass,
    setSelectedClass,
    availabilityFilter,
    setAvailabilityFilter,
    hasActiveFilters,
    clearAllFilters,
  } = usePublicVehicles(locale);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // IntersectionObserver for infinite scrolling
  useEffect(() => {
    if (!hasNextPage || isLoadingMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "300px" },
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasNextPage, isLoadingMore, loading, loadMore]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSignOut = async () => {
    clearAuthSession();
    setUser(null);
  };

  const emptyStateMessage = (() => {
    if (totalVehicles === 0 && !hasActiveFilters) return copy.noVehiclesEmpty;
    if (search.trim()) return copy.noVehiclesSearch.replace("{query}", search.trim());
    return copy.noVehiclesFiltered;
  })();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 antialiased dark:bg-[#0d1117] dark:text-[#e8ecf1]">
      <BookHeader
        scrolled={scrolled}
        user={user}
        locale={locale}
        setLocale={setLocale}
        copy={copy}
        onSignOut={handleSignOut}
      />

      <BookFilters
        copy={copy}
        search={search}
        onSearchChange={setSearch}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedClass={selectedClass}
        onClassChange={setSelectedClass}
        availabilityFilter={availabilityFilter}
        onAvailabilityChange={setAvailabilityFilter}
        types={types}
        classes={classes}
      />

      {/* Main Catalog Section */}
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
        {!loading ? (
          <div className="mb-6 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {vehicles.length >= totalVehicles
                ? totalVehicles === 1
                  ? copy.showingCountOne
                  : copy.showingCount.replace("{count}", String(totalVehicles))
                : copy.showingProgress
                    .replace("{visible}", String(vehicles.length))
                    .replace("{total}", String(totalVehicles))}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1C3A34] transition-colors hover:text-[#254b43] dark:text-[#d8c77f] dark:hover:text-[#efe2a9]"
              >
                <X className="size-3.5" strokeWidth={2.5} />
                {copy.clearFilters}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="h-5 w-40 animate-pulse rounded-md bg-slate-200/80 dark:bg-white/10" />
          </div>
        )}

        {loading ? (
          <VehicleSkeletonGrid count={6} />
        ) : (
          <AnimatePresence mode="wait">
            {vehicles.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-[#171c24] dark:shadow-black/25 sm:p-16"
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 dark:border-white/10 dark:bg-[#11161d]">
                  <Search className="h-7 w-7 text-[#1C3A34]/35 dark:text-[#C9B87A]/55" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-extrabold tracking-tight text-[#1C3A34] dark:text-foreground">
                  {copy.noVehiclesTitle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {emptyStateMessage}
                </p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#1C3A34] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#254b43] dark:bg-[#C9B87A] dark:text-[#171a1f] dark:hover:bg-[#d8c98e]"
                  >
                    {copy.clearFilters}
                  </button>
                ) : null}
              </motion.div>
            ) : (
              <div>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3"
                >
                  {vehicles.map((vehicle) => (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      isSelected={selectedIds.includes(vehicle.id)}
                      onToggleSelect={toggleSelect}
                      locale={locale}
                      copy={copy}
                    />
                  ))}
                </motion.div>

                {/* Infinite Scroll Sentinel */}
                <div ref={sentinelRef} className="h-10 w-full pointer-events-none" />

                {/* Loading More Skeleton Row */}
                {hasNextPage && (
                  <div className="mt-6 space-y-4">
                    {isLoadingMore ? (
                      <VehicleSkeletonGrid
                        count={Math.min(3, totalVehicles - vehicles.length)}
                      />
                    ) : null}
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => loadMore()}
                        disabled={isLoadingMore}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-[#171c24] dark:text-slate-200 dark:hover:bg-[#202731]"
                      >
                        {copy.loadMore.replace(
                          "{count}",
                          String(Math.min(BATCH_SIZE, totalVehicles - vehicles.length)),
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* End of Catalog Indicator */}
                {!hasNextPage && totalVehicles > BATCH_SIZE && (
                  <div className="mt-10 mb-6 flex items-center justify-center gap-3 text-xs font-semibold text-slate-400 dark:text-slate-500">
                    <span className="h-px w-12 bg-slate-200 dark:bg-white/10" />
                    {copy.allLoaded.replace("{total}", String(totalVehicles))}
                    <span className="h-px w-12 bg-slate-200 dark:bg-white/10" />
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        )}
      </main>

      <BookFloatingBar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        copy={copy}
      />
    </div>
  );
}

export default function PublicVehiclesPage() {
  return (
    <LocaleProvider>
      <PublicVehiclesPageContent />
    </LocaleProvider>
  );
}
