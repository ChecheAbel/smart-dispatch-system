"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Check,
  ShoppingBag,
  Languages,
  LogOut,
  LayoutDashboard,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredUser, clearAuthSession } from "@/lib/auth-session";
import { fetchPublicVehicles } from "@/lib/vehicle-api";
import type { Vehicle, VehicleType, VehicleClass, User as AuthUser } from "@smart-dispatch/types";
import BrandLogo from "@/components/landing/BrandLogo";
import { VehiclePhotoMedia } from "@/components/book/vehicle-photo-media";
import { getVehiclePhotoUrl } from "@/lib/vehicle-photo";
import {
  formatVehicleAvailableFrom,
  getVehicleAvailableFrom,
  isVehicleAvailableNow,
} from "@/lib/vehicle-availability";
import { LocaleProvider, useLocale } from "@/components/shared/providers";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { LOCALE_OPTIONS, type SupportedLocale } from "@/lib/locale";

const COPY = {
  en: {
    title: "Book a Vehicle",
    subtitle: "Browse available vehicles and submit your request",
    searchPlaceholder: "Search by make, model, or plate number...",
    allTypes: "All Types",
    allClasses: "All Classes",
    allAvailability: "All Availability",
    availableNow: "Available Now",
    inService: "In Service",
    requestBooking: "Request Vehicle",
    selectVehicle: "Select",
    selectedVehicle: "Selected",
    removeSelection: "Remove",
    viewDetails: "Details",
    seats: "{count} seats",
    selectedCountOne: "1 vehicle selected",
    selectedCountMany: "{count} vehicles selected",
    readyToDispatch: "Ready to dispatch",
    clearSelection: "Clear",
    requestCart: "Continue",
    signIn: "Sign In",
    statusAvailable: "Available Now",
    statusBusy: "In Service — Available:",
    loadingCatalog: "Loading available vehicles...",
    noVehiclesTitle: "No vehicles found",
    noVehiclesSearch: "No vehicles match “{query}”. Try a different make, model, or plate number.",
    noVehiclesFiltered: "No vehicles match your current filters. Adjust type, class, or availability and try again.",
    noVehiclesEmpty: "There are no vehicles available right now. Please check back later.",
    clearFilters: "Clear",
    showingCount: "{count} vehicles",
    showingCountOne: "1 vehicle",
  },
  am: {
    title: "ተሽከርካሪ ይዘዙ",
    subtitle: "ያሉትን ተሽከርካሪዎች ይመልከቱ እና የጉዞ ጥያቄዎን ያስገቡ",
    searchPlaceholder: "በብራንድ፣ በሞዴል ወይም በሰሌዳ ቁጥር ይፈልጉ...",
    allTypes: "ሁሉም ዓይነቶች",
    allClasses: "ሁሉም ክፍሎች",
    allAvailability: "ሁሉም ዝግጁነት",
    availableNow: "አሁን የሚገኙ",
    inService: "በሥራ ላይ ያሉ",
    requestBooking: "ተሽከርካሪ ይጠይቁ",
    selectVehicle: "ይምረጡ",
    selectedVehicle: "ተመርጧል",
    removeSelection: "አስወግድ",
    viewDetails: "ዝርዝር",
    seats: "{count} መቀመጫ",
    selectedCountOne: "1 ተሽከርካሪ ተመርጧል",
    selectedCountMany: "{count} ተሽከርካሪዎች ተመርጠዋል",
    readyToDispatch: "ለመላኪያ ዝግጁ",
    clearSelection: "አጽዳ",
    requestCart: "ቀጥል",
    signIn: "ግባ",
    statusAvailable: "አሁን ይገኛል",
    statusBusy: "ስራ ላይ — የሚገኝበት ጊዜ፡",
    loadingCatalog: "የተሽከርካሪ ካታሎግ በመጫን ላይ...",
    noVehiclesTitle: "ምንም ተሽከርካሪ አልተገኘም",
    noVehiclesSearch: "“{query}” ጋር የሚዛመድ ተሽከርካሪ የለም። ሌላ ብራንድ፣ ሞዴል ወይም ሰሌዳ ቁጥር ይሞክሩ።",
    noVehiclesFiltered: "ከአሁኑ ማጣሪያዎች ጋር የሚዛመድ ተሽከርካሪ የለም። ዓይነት፣ ክፍል ወይም ዝግጁነትን ቀይረው እንደገና ይሞክሩ።",
    noVehiclesEmpty: "በአሁኑ ሰዓት በካታሎጉ ውስጥ ምንም ተሽከርካሪ የለም። እባክዎ ቆይተው እንደገና ይመልከቱ።",
    clearFilters: "አጽዳ",
    showingCount: "{count} ተሽከርካሪዎች",
    showingCountOne: "1 ተሽከርካሪ",
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

function PublicVehiclesPageContent() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const getUserInitials = (u: AuthUser) => {
    const first = u.first_name?.trim().charAt(0) ?? "";
    const last = u.last_name?.trim().charAt(0) ?? "";
    return `${first}${last}`.toUpperCase() || "AD";
  };

  const handleSignOut = () => {
    clearAuthSession();
    window.location.reload();
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { locale, setLocale } = useLocale();
  const copy = COPY[locale === "am" ? "am" : "en"];

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [types, setTypes] = useState<VehicleType[]>([]);
  const [classes, setClasses] = useState<VehicleClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all-types-placeholder");
  const [selectedClass, setSelectedClass] = useState("all-classes-placeholder");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "busy">("all");

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchPublicVehicles();
        setVehicles(data.vehicles);
        setTypes(data.types);
        setClasses(data.classes);
      } catch (err) {
        console.error("Failed to load catalog data", err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        search === "" ||
        `${v.make} ${v.model}`.toLowerCase().includes(search.toLowerCase()) ||
        v.plate_number.toLowerCase().includes(search.toLowerCase());
      
      const matchType = selectedType === "all-types-placeholder" || v.vehicle_type_id === selectedType;
      const matchClass = selectedClass === "all-classes-placeholder" || v.vehicle_class_id === selectedClass;
      const matchAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && isVehicleAvailableNow(v)) ||
        (availabilityFilter === "busy" && !isVehicleAvailableNow(v));

      return matchSearch && matchType && matchClass && matchAvailability;
    });
  }, [vehicles, search, selectedType, selectedClass, availabilityFilter]);

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedType !== "all-types-placeholder" ||
    selectedClass !== "all-classes-placeholder" ||
    availabilityFilter !== "all";

  const emptyStateMessage = (() => {
    if (vehicles.length === 0) return copy.noVehiclesEmpty;
    if (search.trim()) return copy.noVehiclesSearch.replace("{query}", search.trim());
    return copy.noVehiclesFiltered;
  })();

  const clearAllFilters = () => {
    setSearch("");
    setSelectedType("all-types-placeholder");
    setSelectedClass("all-classes-placeholder");
    setAvailabilityFilter("all");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col font-sans">
      
      {/* Premium Glass Header */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500",
          scrolled ? "bg-[#1C3A34]/90 backdrop-blur-xl shadow-lg h-16" : "bg-transparent h-20"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center group shrink-0">
            <BrandLogo priority className="group-hover:opacity-90 transition-opacity drop-shadow-md" />
          </Link>
          
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full border bg-white/5 border-white/10 hover:bg-white/10 text-white shadow-none transition-all hover:scale-105"
                    aria-label="Select language"
                  />
                }
              >
                <Languages className="h-[18px] w-[18px] text-[#C9B87A]" strokeWidth={1.75} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40 p-1.5 bg-white border border-slate-200 shadow-xl rounded-xl z-[10000]">
                <DropdownMenuGroup>
                  <DropdownMenuRadioGroup value={locale} onValueChange={(value) => setLocale(value as SupportedLocale)}>
                    {LOCALE_OPTIONS.map((option) => (
                      <DropdownMenuRadioItem key={option.value} value={option.value} className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
                        {option.nativeLabel}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {!user ? (
              <Link
                href="/sign-in"
                className="bg-gradient-to-b from-[#C9B87A] to-[#A4945A] hover:from-[#d9ca8e] hover:to-[#B6A46A] text-[#1C3A34] font-bold text-xs sm:text-sm px-6 py-2.5 rounded-full tracking-wide transition-all duration-300 shadow-md hover:shadow-[0_0_15px_-3px_rgba(201,184,122,0.4)] hover:-translate-y-0.5"
              >
                {copy.signIn}
              </Link>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#C9B87A] transition-all hover:scale-105 shadow-md" aria-label="Account menu" />}
                >
                  <Avatar size="sm" className="size-9 ring-2 ring-[#C9B87A]/50 cursor-pointer">
                    <AvatarFallback className="text-[11px] font-bold text-white bg-gradient-to-br from-[#1C3A34] to-[#122622]">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 bg-white border border-slate-200 shadow-xl rounded-xl z-[10000]">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="px-2 py-2 font-normal">
                      <p className="truncate text-sm font-semibold text-[#1C3A34]">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors" render={<Link href={user.roles.includes("admin") || user.roles.includes("super_admin") ? "/admin" : "/dashboard"} />}>
                      <LayoutDashboard className="h-4 w-4 mr-2 text-[#C9B87A]" />
                      Console Dashboard
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleSignOut} className="rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Animated Hero Section */}
      <section className="relative w-full flex items-center justify-center overflow-hidden bg-[#1C3A34] pt-32 pb-32 sm:pb-40 -mt-px">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1], rotate: [0, 90, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-[radial-gradient(ellipse_at_center,_#C9B87A_0%,_transparent_50%)] rounded-full blur-[120px]"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.1, 0.05], rotate: [0, -90, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] bg-[radial-gradient(ellipse_at_center,_#1C3A34_0%,_transparent_50%)] rounded-full blur-[100px]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_40%,transparent_100%)] opacity-50" />
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white max-w-3xl drop-shadow-2xl"
          >
            {copy.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="mt-6 text-white/70 text-base sm:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed font-light"
          >
            {copy.subtitle}
          </motion.p>
        </div>
      </section>

      {/* Search & filters — single toolbar */}
      <div className="relative z-20 mx-auto w-full max-w-7xl px-4 sm:px-6 -mt-10 sm:-mt-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_12px_40px_-16px_rgba(28,58,52,0.35)]"
        >
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.85fr))]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={copy.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-xl border-0 bg-transparent pl-10 pr-10 text-sm font-medium text-[#1C3A34] outline-none placeholder:text-slate-400 focus:bg-slate-50/80 lg:h-12"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#1C3A34]"
                  aria-label={copy.clearFilters}
                >
                  <X className="size-3.5" strokeWidth={2.5} />
                </button>
              ) : null}
            </div>

            <Select key={`type-select-${types.length}`} value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-11 w-full rounded-xl border-0 bg-slate-50 px-3.5 text-sm font-medium text-[#1C3A34] shadow-none hover:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-[#1C3A34]/15 lg:h-12">
                <span className="truncate">
                  {selectedType === "all-types-placeholder"
                    ? copy.allTypes
                    : types.find((t) => t.id === selectedType)?.name || copy.allTypes}
                </span>
              </SelectTrigger>
              <SelectContent className="z-[10000] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <SelectItem value="all-types-placeholder" className="rounded-md">
                  {copy.allTypes}
                </SelectItem>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="rounded-md">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select key={`class-select-${classes.length}`} value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-11 w-full rounded-xl border-0 bg-slate-50 px-3.5 text-sm font-medium text-[#1C3A34] shadow-none hover:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-[#1C3A34]/15 lg:h-12">
                <span className="truncate">
                  {selectedClass === "all-classes-placeholder"
                    ? copy.allClasses
                    : classes.find((c) => c.id === selectedClass)?.name || copy.allClasses}
                </span>
              </SelectTrigger>
              <SelectContent className="z-[10000] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <SelectItem value="all-classes-placeholder" className="rounded-md">
                  {copy.allClasses}
                </SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="rounded-md">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={availabilityFilter}
              onValueChange={(val) => setAvailabilityFilter(val as "all" | "available" | "busy")}
            >
              <SelectTrigger className="h-11 w-full rounded-xl border-0 bg-slate-50 px-3.5 text-sm font-medium text-[#1C3A34] shadow-none hover:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-[#1C3A34]/15 lg:h-12">
                <span className="truncate">
                  {availabilityFilter === "all"
                    ? copy.allAvailability
                    : availabilityFilter === "available"
                      ? copy.availableNow
                      : copy.inService}
                </span>
              </SelectTrigger>
              <SelectContent className="z-[10000] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <SelectItem value="all" className="rounded-md">
                  {copy.allAvailability}
                </SelectItem>
                <SelectItem value="available" className="rounded-md">
                  {copy.availableNow}
                </SelectItem>
                <SelectItem value="busy" className="rounded-md">
                  {copy.inService}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      </div>

      {/* Main Catalog Section */}
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
        {!loading ? (
          <div className="mb-6 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">
              {filteredVehicles.length === 1
                ? copy.showingCountOne
                : copy.showingCount.replace("{count}", String(filteredVehicles.length))}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1C3A34] transition-colors hover:text-[#254b43]"
              >
                <X className="size-3.5" strokeWidth={2.5} />
                {copy.clearFilters}
              </button>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-5 py-32">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1C3A34]/10 border-t-[#C9B87A]" />
            <p className="text-sm font-medium tracking-wide text-slate-400">{copy.loadingCatalog}</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {filteredVehicles.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm sm:p-16"
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50">
                  <Search className="h-7 w-7 text-[#1C3A34]/35" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-extrabold tracking-tight text-[#1C3A34]">
                  {copy.noVehiclesTitle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {emptyStateMessage}
                </p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#1C3A34] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#254b43]"
                  >
                    {copy.clearFilters}
                  </button>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3"
              >
                {filteredVehicles.map((vehicle) => {
                  const isAvailable = isVehicleAvailableNow(vehicle);
                  const availableFromLabel = formatVehicleAvailableFrom(
                    getVehicleAvailableFrom(vehicle),
                    locale,
                  );
                  const isSelected = selectedIds.includes(vehicle.id);
                  const metaBits = [
                    vehicle.vehicle_type?.name,
                    vehicle.vehicle_class?.name,
                    vehicle.year ? String(vehicle.year) : null,
                    vehicle.vehicle_type?.passenger_capacity
                      ? copy.seats.replace(
                          "{count}",
                          String(vehicle.vehicle_type.passenger_capacity),
                        )
                      : null,
                  ].filter(Boolean);

                  return (
                    <motion.article
                      variants={cardVariant}
                      key={vehicle.id}
                      className={cn(
                        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white transition-colors",
                        isSelected
                          ? "border-[#C9B87A] bg-[#1C3A34]/[0.02]"
                          : "border-slate-200 hover:border-[#1C3A34]/25",
                      )}
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                        <VehiclePhotoMedia
                          imageUrl={
                            vehicle.images?.[0]
                              ? getVehiclePhotoUrl(vehicle.images[0])
                              : undefined
                          }
                          alt={`${vehicle.make} ${vehicle.model}`}
                          imgClassName="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1C3A34]/55 via-transparent to-transparent" />

                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide",
                                isAvailable ? "text-emerald-200" : "text-amber-200",
                              )}
                            >
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  isAvailable ? "bg-emerald-300" : "bg-amber-300",
                                )}
                              />
                              {isAvailable
                                ? copy.statusAvailable
                                : `${copy.statusBusy} ${availableFromLabel}`}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-md bg-black/35 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                            {vehicle.plate_number}
                          </span>
                        </div>

                        {isSelected ? (
                          <div className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-[#C9B87A] text-[#1C3A34]">
                            <Check className="size-4" strokeWidth={3} />
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-1 flex-col gap-4 p-5">
                        <div className="min-w-0 space-y-1.5">
                          <Link
                            href={`/book/${vehicle.id}`}
                            className="block truncate text-lg font-extrabold tracking-tight text-[#1C3A34] transition-colors hover:text-[#254b43]"
                          >
                            {vehicle.make} {vehicle.model}
                          </Link>
                          {metaBits.length > 0 ? (
                            <p className="truncate text-xs font-medium text-slate-500">
                              {metaBits.join(" · ")}
                            </p>
                          ) : null}
                          {vehicle.notes ? (
                            <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
                              {vehicle.notes}
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-4">
                          <button
                            type="button"
                            onClick={() => toggleSelect(vehicle.id)}
                            className={cn(
                              "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors",
                              isSelected
                                ? "border border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:text-red-600"
                                : "bg-[#1C3A34] text-white hover:bg-[#254b43]",
                            )}
                          >
                            {isSelected ? (
                              <>
                                <Check className="size-4" strokeWidth={2.5} />
                                {copy.selectedVehicle}
                              </>
                            ) : (
                              copy.selectVehicle
                            )}
                          </button>
                          <Link
                            href={`/book/${vehicle.id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-bold text-[#1C3A34] transition-colors hover:border-[#1C3A34]/30 hover:bg-slate-50"
                            aria-label={copy.viewDetails}
                          >
                            <ChevronRight className="size-4" />
                          </Link>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Floating selection bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-5 left-1/2 z-[100] w-[min(92%,36rem)] -translate-x-1/2 sm:bottom-8"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#1C3A34] px-4 py-3 text-white shadow-xl sm:px-5">
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
                onClick={() => setSelectedIds([])}
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
