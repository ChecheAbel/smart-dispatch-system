"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { Vehicle, VehicleType, VehicleClass } from "@smart-dispatch/types";
import { fetchPublicVehicles } from "@/lib/vehicle-api";

export const BATCH_SIZE = 12;

export function usePublicVehicles(locale: string) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [types, setTypes] = useState<VehicleType[]>([]);
  const [classes, setClasses] = useState<VehicleClass[]>([]);
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all-types-placeholder");
  const [selectedClass, setSelectedClass] = useState("all-classes-placeholder");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "busy">("all");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Request counter to avoid race conditions
  const requestIdRef = useRef(0);

  // Re-fetch on filter or debounced search change (resets to page 1)
  useEffect(() => {
    let cancelled = false;
    const currentRequestId = ++requestIdRef.current;

    async function loadCatalog() {
      setLoading(true);
      try {
        const data = await fetchPublicVehicles({
          page: 1,
          limit: BATCH_SIZE,
          search: debouncedSearch.trim() || undefined,
          vehicle_type_id: selectedType !== "all-types-placeholder" ? selectedType : undefined,
          vehicle_class_id: selectedClass !== "all-classes-placeholder" ? selectedClass : undefined,
          availability: availabilityFilter !== "all" ? availabilityFilter : undefined,
          locale,
        });

        if (cancelled || currentRequestId !== requestIdRef.current) return;

        setVehicles(data.vehicles);
        if (data.types?.length) setTypes(data.types);
        if (data.classes?.length) setClasses(data.classes);
        setTotalVehicles(data.pagination.total);
        setHasNextPage(data.pagination.hasNextPage);
        setPage(1);
      } catch (err) {
        if (!cancelled && currentRequestId === requestIdRef.current) {
          console.error("Failed to load vehicle catalog:", err);
        }
      } finally {
        if (!cancelled && currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, selectedType, selectedClass, availabilityFilter, locale]);

  // Load more vehicles for infinite scroll
  const loadMore = useCallback(async () => {
    if (!hasNextPage || isLoadingMore || loading) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const data = await fetchPublicVehicles({
        page: nextPage,
        limit: BATCH_SIZE,
        search: debouncedSearch.trim() || undefined,
        vehicle_type_id: selectedType !== "all-types-placeholder" ? selectedType : undefined,
        vehicle_class_id: selectedClass !== "all-classes-placeholder" ? selectedClass : undefined,
        availability: availabilityFilter !== "all" ? availabilityFilter : undefined,
        locale,
      });

      setVehicles((prev) => [...prev, ...data.vehicles]);
      setPage(nextPage);
      setHasNextPage(data.pagination.hasNextPage);
      setTotalVehicles(data.pagination.total);
    } catch (err) {
      console.error("Failed to load more vehicles:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    hasNextPage,
    isLoadingMore,
    loading,
    page,
    debouncedSearch,
    selectedType,
    selectedClass,
    availabilityFilter,
    locale,
  ]);

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedType !== "all-types-placeholder" ||
    selectedClass !== "all-classes-placeholder" ||
    availabilityFilter !== "all";

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setSelectedType("all-types-placeholder");
    setSelectedClass("all-classes-placeholder");
    setAvailabilityFilter("all");
  }, []);

  return {
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
  };
}
