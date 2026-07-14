"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Car,
  Search,
  SlidersHorizontal,
  Calendar,
  MapPin,
  User,
  Phone,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Lock,
  ChevronRight,
  Languages,
  LogOut,
  UserRound,
  LayoutDashboard,
  Check,
  ShoppingBag,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredUser, clearAuthSession } from "@/lib/auth-session";
import { fetchPublicVehicles } from "@/lib/vehicle-api";
import type { Vehicle, VehicleType, VehicleClass, User as AuthUser } from "@smart-dispatch/types";
import BrandLogo from "@/components/landing/BrandLogo";
import { getVehiclePhotoUrl } from "@/lib/vehicle-photo";
import { LocaleProvider, useLocale } from "@/components/shared/providers";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

// Localized translations for the public vehicles page
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
    noVehicles: "No vehicles match your search criteria.",
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
    noVehicles: "በፍለጋዎ መሰረት ምንም ተሽከርካሪ አልተገኘም።",
  },
};

function CatalogVehicleImage({ imageUrl, alt }: { imageUrl?: string; alt: string }) {
  const [hasError, setHasError] = useState(!imageUrl);

  if (hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/50 p-6">
        <Car className="h-16 w-16 text-[#1C3A34]/15 group-hover:scale-110 transition-transform duration-500 ease-out" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
      onError={() => setHasError(true)}
    />
  );
}

function PublicVehiclesPageContent() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

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

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { locale, setLocale } = useLocale();
  const copy = COPY[locale === "am" ? "am" : "en"];

  // API states
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

  // Filters
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all-types-placeholder");
  const [selectedClass, setSelectedClass] = useState("all-classes-placeholder");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "busy">("all");

  // Load Initial Vehicles Catalog
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

  // Compute availability dates dynamically for busy vehicles (e.g. tomorrow at 8:30 AM)
  const getAvailabilityDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 30, 0, 0);
    
    if (locale === "am") {
      return `ነገ ጠዋት 2:30 ሰዓት`;
    }
    return tomorrow.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filtered vehicles list
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        search === "" ||
        `${v.make} ${v.model}`.toLowerCase().includes(search.toLowerCase()) ||
        v.plate_number.toLowerCase().includes(search.toLowerCase());
      
      const matchType =
        selectedType === "all-types-placeholder" ||
        v.vehicle_type_id === selectedType;
      const matchClass =
        selectedClass === "all-classes-placeholder" ||
        v.vehicle_class_id === selectedClass;
      
      const matchAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && v.status === "active") ||
        (availabilityFilter === "busy" && v.status !== "active");

      return matchSearch && matchType && matchClass && matchAvailability;
    });
  }, [vehicles, search, selectedType, selectedClass, availabilityFilter]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col font-sans">
      {/* Header */}
      <header className="relative z-40 bg-[#1C3A34] text-white border-b border-[#C9B87A]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center group shrink-0">
            <BrandLogo priority className="group-hover:opacity-90 transition-opacity" />
          </Link>
          
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl border bg-white/5 border-white/10 hover:bg-white/10 text-white shadow-none transition-all"
                    aria-label="Select language"
                  />
                }
              >
                <Languages className="h-[18px] w-[18px] text-[#C9B87A]" strokeWidth={1.75} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40 p-1.5 bg-white border border-slate-200 shadow-xl rounded-xl z-[10000]">
                <DropdownMenuGroup>
                  <DropdownMenuRadioGroup
                    value={locale}
                    onValueChange={(value) => setLocale(value as SupportedLocale)}
                  >
                    {LOCALE_OPTIONS.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                        className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                      >
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
                className="bg-[#C9B87A] hover:bg-[#d9ca8e] text-[#1C3A34] font-bold text-xs sm:text-sm px-4 sm:px-5 py-2 rounded-full tracking-wide transition-all shadow-md hover:shadow-lg"
              >
                {copy.signIn}
              </Link>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#C9B87A] transition-all hover:scale-105"
                      aria-label="Account menu"
                    />
                  }
                >
                  <Avatar size="sm" className="size-9 ring-2 ring-[#C9B87A]/50 cursor-pointer">
                    <AvatarFallback className="text-[11px] font-bold text-white bg-[#1C3A34] hover:bg-[#254b43]">
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
                    <DropdownMenuItem
                      className="rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                      render={
                        <Link href={user.roles.includes("admin") || user.roles.includes("super_admin") ? "/admin" : "/dashboard"} />
                      }
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Console Dashboard
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-55 cursor-pointer transition-colors"
                    >
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

      {/* Hero Section */}
      <section className="bg-[#1C3A34] text-white pt-16 pb-14 sm:pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#C9B87A_0%,_transparent_65%)] opacity-[0.05]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight">
            {copy.title}
          </h1>
          <p className="mt-4 text-white/60 text-sm sm:text-base lg:text-lg max-w-xl mx-auto leading-relaxed">
            {copy.subtitle}
          </p>
        </div>
      </section>

      {/* Main Catalog Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-8 flex flex-col gap-5">
          {/* Header row for filters */}
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <SlidersHorizontal className="h-4 w-4 text-[#8f7d45]" />
            <h2 className="text-xs font-bold text-[#1C3A34] uppercase tracking-wider">
              {locale === "am" ? "ማጣሪያዎች" : "Filter Catalog"}
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={copy.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 h-11 rounded-xl border border-slate-200 bg-slate-50/30 focus:outline-none focus:ring-3 focus:ring-[#1C3A34]/8 focus:border-[#1C3A34] text-sm font-medium transition-all"
              />
            </div>
            
            {/* Action Bar / Filtering options */}
            <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
              {/* Type Filter */}
              <div className="flex-1 sm:flex-none min-w-[150px]">
                <Select key={types.length} value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full h-11 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-4 text-left font-medium focus-visible:ring-3 focus-visible:ring-[#1C3A34]/10 transition-all focus-visible:border-[#1C3A34]">
                    <span className="flex-1 truncate">
                      {selectedType === "all-types-placeholder"
                        ? copy.allTypes
                        : types.find((t) => t.id === selectedType)?.name || copy.allTypes}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-xl rounded-xl z-[10000] p-1.5 min-w-[150px]">
                    <SelectItem value="all-types-placeholder">{copy.allTypes}</SelectItem>
                    {types.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Class Filter */}
              <div className="flex-1 sm:flex-none min-w-[150px]">
                <Select key={classes.length} value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full h-11 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-4 text-left font-medium focus-visible:ring-3 focus-visible:ring-[#1C3A34]/10 transition-all focus-visible:border-[#1C3A34]">
                    <span className="flex-1 truncate">
                      {selectedClass === "all-classes-placeholder"
                        ? copy.allClasses
                        : classes.find((c) => c.id === selectedClass)?.name || copy.allClasses}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-xl rounded-xl z-[10000] p-1.5 min-w-[150px]">
                    <SelectItem value="all-classes-placeholder">{copy.allClasses}</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Availability Filter */}
              <div className="flex-1 sm:flex-none min-w-[150px]">
                <Select value={availabilityFilter} onValueChange={(val) => setAvailabilityFilter(val as any)}>
                  <SelectTrigger className="w-full h-11 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-4 text-left font-medium focus-visible:ring-3 focus-visible:ring-[#1C3A34]/10 transition-all focus-visible:border-[#1C3A34]">
                    <span className="flex-1 truncate">
                      {availabilityFilter === "all"
                        ? copy.allAvailability
                        : availabilityFilter === "available"
                        ? copy.availableNow
                        : copy.inService}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-xl rounded-xl z-[10000] p-1.5 min-w-[150px]">
                    <SelectItem value="all">{copy.allAvailability}</SelectItem>
                    <SelectItem value="available">{copy.availableNow}</SelectItem>
                    <SelectItem value="busy">{copy.inService}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1C3A34]/10 border-t-[#C9B87A]" />
            <p className="text-slate-400 text-sm font-medium">Loading vehicles catalog...</p>
          </div>
        ) : (
          <>
            {filteredVehicles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center max-w-md mx-auto mt-12">
                <Car className="h-12 w-12 text-[#1C3A34]/20 mx-auto mb-4" />
                <p className="text-slate-500 text-base font-semibold">{copy.noVehicles}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {filteredVehicles.map((vehicle) => {
                  const isAvailable = vehicle.status === "active";
                  const isSelected = selectedIds.includes(vehicle.id);
                  return (
                    <div
                      key={vehicle.id}
                      className={cn(
                        "group bg-white rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-350 flex flex-col overflow-hidden h-full",
                        isSelected ? "border-[#C9B87A] ring-2 ring-[#C9B87A]/25 bg-slate-50/10" : "border-slate-200/80 hover:border-[#C9B87A]/30"
                      )}
                    >
                      {/* Top Visual Area */}
                      <div className="relative h-48 bg-slate-100 overflow-hidden border-b border-slate-100">
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
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase shadow-md transition-all duration-200 border cursor-pointer active:scale-95 focus:outline-none",
                              isSelected
                                ? "bg-[#C9B87A] border-[#C9B87A] text-[#1C3A34]"
                                : "bg-white/90 backdrop-blur-xs border-slate-200 text-slate-700 hover:border-[#1C3A34] hover:text-[#1C3A34]"
                            )}
                          >
                            {isSelected ? (
                              <>
                                <Check className="h-3 w-3 stroke-[3px]" />
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
                        <div className="absolute top-4 right-4 z-10 flex gap-1.5">
                          <span className="text-[10px] font-extrabold border border-[#C9B87A]/30 text-[#C9B87A] bg-[#1C3A34]/95 backdrop-blur-xs px-2.5 py-1 rounded-full tracking-wider uppercase shadow-xs">
                            {vehicle.vehicle_class?.name}
                          </span>
                          <span className="text-[10px] font-extrabold bg-[#C9B87A] text-[#1C3A34] px-2.5 py-1 rounded-full tracking-wider uppercase shadow-xs">
                            {vehicle.vehicle_type?.name}
                          </span>
                        </div>

                        {/* Image or Fallback */}
                        <CatalogVehicleImage
                          imageUrl={vehicle.images?.[0] ? getVehiclePhotoUrl(vehicle.images[0]) : undefined}
                          alt={`${vehicle.make} ${vehicle.model}`}
                        />
                      </div>

                      {/* Content Area */}
                      <div className="p-6 flex-1 flex flex-col gap-4">
                        <div className="text-left">
                          <Link href={`/book/${vehicle.id}`} className="block group/title">
                            <h3 className="font-extrabold text-lg text-[#1C3A34] group-hover/title:text-[#C9B87A] transition-colors leading-tight">
                              {vehicle.make} {vehicle.model}
                            </h3>
                          </Link>
                          
                          {/* Metadata row */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-xs text-slate-400 font-semibold">
                              Year: {vehicle.year}
                            </span>
                            <span className="text-slate-300 text-xs">•</span>
                            <span className="font-mono text-[10px] font-extrabold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded border border-slate-200/80 uppercase tracking-widest">
                              {vehicle.plate_number}
                            </span>
                            {vehicle.vehicle_type?.passenger_capacity && (
                              <>
                                <span className="text-slate-300 text-xs">•</span>
                                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                                  <User className="h-3.5 w-3.5 text-slate-400" />
                                  {vehicle.vehicle_type.passenger_capacity} seats
                                </span>
                              </>
                            )}
                          </div>

                          {vehicle.notes && (
                            <p className="text-xs text-slate-500 mt-3 leading-relaxed line-clamp-2">
                              {vehicle.notes}
                            </p>
                          )}
                        </div>

                        {/* Availability indicators */}
                        <div className="mt-auto border-t border-slate-100 pt-4 flex flex-col gap-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                isAvailable ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                              }`}
                            />
                            <p className="text-xs font-semibold text-slate-600">
                              {isAvailable ? (
                                <span className="text-emerald-700 font-bold">{copy.statusAvailable}</span>
                              ) : (
                                <span className="text-amber-700 font-bold">
                                  {copy.statusBusy} {getAvailabilityDateString()}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Single Action Button Layout */}
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                toggleSelect(vehicle.id);
                              }}
                              className={cn(
                                "w-full font-bold text-[13px] py-3 px-4 rounded-xl tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5 text-center cursor-pointer active:scale-95 focus:outline-none",
                                isSelected
                                  ? "bg-white border border-[#1C3A34] text-[#1C3A34] hover:bg-slate-50"
                                  : "bg-[#1C3A34] hover:bg-[#254b43] text-white hover:shadow-lg"
                              )}
                            >
                              <span>{isSelected ? "Remove" : copy.requestBooking}</span>
                              {isSelected ? (
                                <Check className="h-4 w-4 stroke-[3px]" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Request Cart */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-xl bg-[#1C3A34]/95 text-white backdrop-blur-md px-6 py-4 rounded-2xl border border-[#C9B87A]/30 shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#C9B87A]/10 rounded-xl flex items-center justify-center border border-[#C9B87A]/20 text-[#C9B87A] shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-sm text-[#C9B87A]">
                {selectedIds.length === 1
                  ? "1 Vehicle Selected"
                  : `${selectedIds.length} Vehicles Selected`}
              </p>
              <p className="text-[11px] text-white/50 font-medium truncate">Ready to submit booking request</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-white/60 hover:text-white font-bold transition-colors cursor-pointer px-2 py-1"
            >
              Clear
            </button>
            <Link
              href={`/book/request?ids=${selectedIds.join(",")}`}
              className="bg-[#C9B87A] hover:bg-[#d9ca8e] text-[#1C3A34] font-extrabold text-xs px-5 py-3 rounded-xl tracking-wide transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>Request Cart</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
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
