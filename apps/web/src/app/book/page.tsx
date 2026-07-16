"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Search,
  SlidersHorizontal,
  User,
  Check,
  ShoppingBag,
  Languages,
  LogOut,
  LayoutDashboard,
  ChevronRight,
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
    title: "Public Vehicle Catalog",
    subtitle: "Explore available corporate vehicles and submit your request",
    searchPlaceholder: "Search by make, model, or plate number...",
    allTypes: "All Types",
    allClasses: "All Classes",
    allAvailability: "All Availability",
    availableNow: "Available Now",
    inService: "In Service",
    requestBooking: "Request Vehicle",
    signIn: "Sign In",
    statusAvailable: "Available Now",
    statusBusy: "In Service - Available:",
    loadingCatalog: "Loading premium fleet catalog...",
    noVehiclesTitle: "No vehicles found",
    noVehiclesSearch: "No vehicles match “{query}”. Try a different make, model, or plate number.",
    noVehiclesFiltered: "No vehicles match your current filters. Adjust type, class, or availability and try again.",
    noVehiclesEmpty: "There are no vehicles in the catalog right now. Please check back later.",
    clearFilters: "Clear search & filters",
  },
  am: {
    title: "የሕዝብ ተሽከርካሪዎች ካታሎግ",
    subtitle: "ያሉትን የድርጅት ተሽከርካሪዎች ይመልከቱ እና የጉዞ ጥያቄዎን ያስገቡ",
    searchPlaceholder: "በብራንድ፣ በሞዴል ወይም በሰሌዳ ቁጥር ይፈልጉ...",
    allTypes: "ሁሉም ዓይነቶች",
    allClasses: "ሁሉም ክፍሎች",
    allAvailability: "ሁሉም ዝግጁነት",
    availableNow: "አሁን የሚገኙ",
    inService: "በሥራ ላይ ያሉ",
    requestBooking: "ተሽከርካሪ ይጠይቁ",
    signIn: "ግባ",
    statusAvailable: "አሁን ይገኛል",
    statusBusy: "ስራ ላይ - የሚገኝበት ጊዜ፡",
    loadingCatalog: "የተሽከርካሪ ካታሎግ በመጫን ላይ...",
    noVehiclesTitle: "ምንም ተሽከርካሪ አልተገኘም",
    noVehiclesSearch: "“{query}” ጋር የሚዛመድ ተሽከርካሪ የለም። ሌላ ብራንድ፣ ሞዴል ወይም ሰሌዳ ቁጥር ይሞክሩ።",
    noVehiclesFiltered: "ከአሁኑ ማጣሪያዎች ጋር የሚዛመድ ተሽከርካሪ የለም። ዓይነት፣ ክፍል ወይም ዝግጁነትን ቀይረው እንደገና ይሞክሩ።",
    noVehiclesEmpty: "በአሁኑ ሰዓት በካታሎጉ ውስጥ ምንም ተሽከርካሪ የለም። እባክዎ ቆይተው እንደገና ይመልከቱ።",
    clearFilters: "ፍለጋን እና ማጣሪያዎችን ያጽዱ",
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
  const router = useRouter();
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
        (availabilityFilter === "available" && isVehicleAvailableNow(v.status)) ||
        (availabilityFilter === "busy" && !isVehicleAvailableNow(v.status));

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

      {/* Overlapping Search and Filters */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/40 shadow-2xl p-5 sm:p-6 lg:p-8 flex flex-col gap-6"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <SlidersHorizontal className="h-4 w-4 text-[#C9B87A]" strokeWidth={2.5} />
            <h2 className="text-[11px] sm:text-xs font-bold text-[#1C3A34] uppercase tracking-wider">
              {locale === "am" ? "ማጣሪያዎች" : "Refine Search"}
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#1C3A34] transition-colors" />
              <input
                type="text"
                placeholder={copy.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 h-12 sm:h-14 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-[#1C3A34]/10 focus:border-[#1C3A34] text-sm font-medium transition-all shadow-sm"
              />
            </div>
            
            {/* Filtering options */}
            <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
              <Select key={`type-select-${types.length}`} value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full sm:w-auto h-12 sm:h-14 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-5 text-left font-medium focus-visible:ring-4 focus-visible:ring-[#1C3A34]/10 transition-all focus-visible:border-[#1C3A34] shadow-sm">
                  <span className="flex-1 truncate">
                    {selectedType === "all-types-placeholder" ? copy.allTypes : types.find((t) => t.id === selectedType)?.name || copy.allTypes}
                  </span>
                </SelectTrigger>
                <SelectContent className="bg-white border border-slate-200 shadow-xl rounded-xl z-[10000] p-1.5">
                  <SelectItem value="all-types-placeholder" className="rounded-md">{copy.allTypes}</SelectItem>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="rounded-md">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select key={`class-select-${classes.length}`} value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full sm:w-auto h-12 sm:h-14 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-5 text-left font-medium focus-visible:ring-4 focus-visible:ring-[#1C3A34]/10 transition-all focus-visible:border-[#1C3A34] shadow-sm">
                  <span className="flex-1 truncate">
                    {selectedClass === "all-classes-placeholder" ? copy.allClasses : classes.find((c) => c.id === selectedClass)?.name || copy.allClasses}
                  </span>
                </SelectTrigger>
                <SelectContent className="bg-white border border-slate-200 shadow-xl rounded-xl z-[10000] p-1.5">
                  <SelectItem value="all-classes-placeholder" className="rounded-md">{copy.allClasses}</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="rounded-md">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={availabilityFilter} onValueChange={(val) => setAvailabilityFilter(val as any)}>
                <SelectTrigger className="w-full sm:w-auto h-12 sm:h-14 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-5 text-left font-medium focus-visible:ring-4 focus-visible:ring-[#1C3A34]/10 transition-all focus-visible:border-[#1C3A34] shadow-sm">
                  <span className="flex-1 truncate">
                    {availabilityFilter === "all" ? copy.allAvailability : availabilityFilter === "available" ? copy.availableNow : copy.inService}
                  </span>
                </SelectTrigger>
                <SelectContent className="bg-white border border-slate-200 shadow-xl rounded-xl z-[10000] p-1.5">
                  <SelectItem value="all" className="rounded-md">{copy.allAvailability}</SelectItem>
                  <SelectItem value="available" className="rounded-md">{copy.availableNow}</SelectItem>
                  <SelectItem value="busy" className="rounded-md">{copy.inService}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Catalog Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex-1 w-full relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1C3A34]/10 border-t-[#C9B87A]" />
            <p className="text-slate-400 text-sm font-medium tracking-wide">{copy.loadingCatalog}</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {filteredVehicles.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 sm:p-16 text-center w-full mt-8"
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100">
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
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {filteredVehicles.map((vehicle) => {
                  const isAvailable = isVehicleAvailableNow(vehicle.status);
                  const availableFromLabel = formatVehicleAvailableFrom(getVehicleAvailableFrom(vehicle.status), locale);
                  const isSelected = selectedIds.includes(vehicle.id);
                  return (
                    <motion.div
                      variants={cardVariant}
                      key={vehicle.id}
                      className={cn(
                         "group bg-white rounded-3xl border shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden h-full transform hover:-translate-y-1 relative",
                         isSelected ? "border-[#C9B87A] ring-2 ring-[#C9B87A]/30 bg-[#1C3A34]/[0.02]" : "border-slate-200 hover:border-[#C9B87A]/40"
                      )}
                    >
                      {/* Top Visual Area */}
                      <div className="relative h-56 bg-slate-100 overflow-hidden border-b border-slate-100">
                        {/* Selected Indicator Pill */}
                        <div className={cn(
                          "absolute top-4 left-4 z-10 transition-all duration-300",
                          isSelected 
                            ? "translate-y-0 opacity-100 scale-100" 
                            : "sm:-translate-y-2 sm:opacity-0 sm:scale-95 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-hover:scale-100"
                        )}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleSelect(vehicle.id);
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[10px] font-extrabold tracking-wider uppercase shadow-lg transition-all duration-300 cursor-pointer active:scale-95 focus:outline-none backdrop-blur-md",
                              isSelected
                                ? "bg-[#C9B87A] border border-[#C9B87A] text-[#1C3A34]"
                                : "bg-white/90 border border-slate-200 text-slate-700 hover:border-[#1C3A34] hover:text-[#1C3A34]"
                            )}
                          >
                            {isSelected ? (
                              <>
                                <Check className="h-3.5 w-3.5 stroke-[3px]" />
                                <span>Selected</span>
                              </>
                            ) : (
                              <>
                                <span className="text-[12px] font-bold leading-none -mt-0.5">+</span>
                                <span>Select</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Badges Float */}
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                          <span className="text-[10px] font-extrabold border border-white/20 text-white bg-[#1C3A34]/90 backdrop-blur-md px-3 py-1.5 rounded-full tracking-wider uppercase shadow-lg">
                            {vehicle.vehicle_class?.name}
                          </span>
                          <span className="text-[10px] font-extrabold bg-[#C9B87A] text-[#1C3A34] px-3 py-1.5 rounded-full tracking-wider uppercase shadow-lg shadow-[#C9B87A]/20">
                            {vehicle.vehicle_type?.name}
                          </span>
                        </div>

                        <VehiclePhotoMedia
                          imageUrl={vehicle.images?.[0] ? getVehiclePhotoUrl(vehicle.images[0]) : undefined}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          imgClassName="group-hover:scale-110 transition-transform duration-700 ease-out"
                        />
                      </div>

                      {/* Content Area */}
                      <div className="p-6 sm:p-8 flex-1 flex flex-col gap-5">
                        <div className="text-left">
                          <Link href={`/book/${vehicle.id}`} className="block group/title">
                            <h3 className="font-extrabold text-lg sm:text-xl text-[#1C3A34] group-hover/title:text-[#C9B87A] transition-colors leading-tight">
                              {vehicle.make} {vehicle.model}
                            </h3>
                          </Link>
                          
                          {/* Metadata row */}
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            <span className="font-mono text-[11px] font-extrabold bg-slate-100 text-slate-600 px-3 py-1 rounded-md border border-slate-200 uppercase tracking-widest">
                              {vehicle.plate_number}
                            </span>
                            <span className="text-slate-300 text-xs">•</span>
                            <span className="text-xs text-slate-500 font-semibold">
                              {vehicle.year}
                            </span>
                            {vehicle.vehicle_type?.passenger_capacity && (
                              <>
                                <span className="text-slate-300 text-xs">•</span>
                                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                                  <User className="h-4 w-4 text-slate-400" />
                                  {vehicle.vehicle_type.passenger_capacity} seats
                                </span>
                              </>
                            )}
                          </div>

                          {vehicle.notes && (
                            <p className="text-sm text-slate-500 mt-4 leading-relaxed line-clamp-2">
                              {vehicle.notes}
                            </p>
                          )}
                        </div>

                        {/* Availability indicators */}
                        <div className="mt-auto border-t border-slate-100 pt-5 flex flex-col gap-4">
                          <div className="flex items-center gap-2.5">
                            <span className="relative flex h-3 w-3">
                              {isAvailable && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                              <span className={`relative inline-flex rounded-full h-3 w-3 ${isAvailable ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                            </span>
                            <p className="text-xs sm:text-sm font-semibold text-slate-600">
                              {isAvailable ? (
                                <span className="text-emerald-700 font-bold">{copy.statusAvailable}</span>
                              ) : (
                                <span className="text-amber-700 font-bold">
                                  {copy.statusBusy} {availableFromLabel}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Single Action Button Layout */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              toggleSelect(vehicle.id);
                            }}
                            className={cn(
                              "w-full font-bold text-[14px] py-3.5 px-6 rounded-xl tracking-wide transition-all duration-300 shadow-md flex items-center justify-center gap-2 text-center cursor-pointer active:scale-95 focus:outline-none",
                              isSelected
                                ? "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-red-500 hover:border-red-200"
                                : "bg-gradient-to-b from-[#1C3A34] to-[#122622] text-white hover:shadow-xl hover:shadow-[#1C3A34]/20 hover:-translate-y-0.5 border border-[#1C3A34]"
                            )}
                          >
                            <span>{isSelected ? "Remove Selection" : copy.requestBooking}</span>
                            {isSelected ? (
                              <Check className="h-4 w-4 stroke-[3px]" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Premium Floating Request Cart */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-xl bg-[#1C3A34]/80 backdrop-blur-2xl text-white px-5 py-3.5 rounded-2xl sm:rounded-full border border-white/20 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="h-9 w-9 bg-gradient-to-br from-[#C9B87A] to-[#A4945A] rounded-full flex items-center justify-center text-[#1C3A34] shrink-0 shadow-inner">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[13px] text-white">
                  {selectedIds.length === 1 ? "1 Vehicle Selected" : `${selectedIds.length} Vehicles Selected`}
                </p>
                <p className="text-[10px] text-[#C9B87A] font-semibold tracking-wide uppercase mt-0.5">Ready to dispatch</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-white/60 hover:text-white font-bold transition-colors cursor-pointer px-2 py-1"
              >
                Clear
              </button>
              <Link
                href={`/book/request?ids=${selectedIds.join(",")}`}
                className="bg-gradient-to-b from-[#C9B87A] to-[#A4945A] hover:from-[#d9ca8e] hover:to-[#B6A46A] text-[#1C3A34] font-extrabold text-[13px] px-5 py-2.5 rounded-xl sm:rounded-full tracking-wide transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_-5px_rgba(201,184,122,0.6)] flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
              >
                <span>Request Cart</span>
                <ChevronRight className="h-4 w-4" />
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
