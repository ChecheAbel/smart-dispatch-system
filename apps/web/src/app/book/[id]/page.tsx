"use client";

import { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Car,
  Calendar,
  MapPin,
  User,
  ArrowLeft,
  ChevronRight,
  Languages,
  Clock,
  Settings,
  ShieldCheck,
  FileText,
  LogOut,
  UserRound,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredUser, clearAuthSession } from "@/lib/auth-session";
import { fetchPublicVehicles } from "@/lib/vehicle-api";
import type { Vehicle, User as AuthUser } from "@smart-dispatch/types";
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
import { ThemeToggle } from "@/components/shared/theme-toggle";
import dynamic from "next/dynamic";

const LazyVehicleLiveMap = dynamic(
  () =>
    import("@/components/book/vehicle-live-map").then(
      (mod) => mod.VehicleLiveMap,
    ),
  { ssr: false },
);

// Localized translations for the detail page
const COPY = {
  en: {
    backToCatalog: "Back to Catalog",
    requestThisVehicle: "Request this Vehicle",
    signInToRequest: "Sign In to Request",
    statusAvailable: "Available Now",
    statusBusy: "Booked — Available:",
    specs: "Specifications",
    year: "Year",
    make: "Brand",
    model: "Model",
    plate: "Plate Number",
    class: "Vehicle Class",
    type: "Vehicle Type",
    gallery: "Vehicle Photo Gallery",
    noPhotos: "Photo coming soon",
    primaryInfo: "Primary Details",
    overview: "Vehicle Overview / Notes",
    guaranteedService: "Corporate Managed Fleet",
    guaranteedServiceDesc: "This vehicle is corporate-insured, maintained regularly, and operated by professional smart dispatchers.",
    liveLocation: "Live Location Tracking",
    liveLocationDesc: "Current simulated GPS position of this VIP vehicle.",
  },
  am: {
    backToCatalog: "ወደ ካታሎግ ይመለሱ",
    requestThisVehicle: "ተሽከርካሪውን ይጠይቁ",
    signInToRequest: "ለመጠየቅ ይግቡ",
    statusAvailable: "አሁን ይገኛል",
    statusBusy: "ተይዟል — የሚገኝበት ጊዜ፡",
    specs: "ዝርዝር መግለጫዎች",
    year: "ዓመተ ምህረት",
    make: "ብራንድ",
    model: "ሞዴል",
    plate: "ሰሌዳ ቁጥር",
    class: "የተሽከርካሪ ክፍል",
    type: "የተሽከርካሪ ዓይነት",
    gallery: "የተሽከርካሪ ፎቶዎች",
    noPhotos: "ፎቶ በቅርቡ ይጨመራል",
    primaryInfo: "ዋና መረጃ",
    overview: "የተሽከርካሪ አጠቃላይ መግለጫ / ማስታወሻዎች",
    guaranteedService: "በድርጅት የሚተዳደር መርከቦች",
    guaranteedServiceDesc: "ይህ ተሽከርካሪ በድርጅት የተመዘገበ፣ በየጊዜው የሚጠገን እና በባለሙያ መላኪያዎች የሚሰራ ነው።",
    liveLocation: "የቀጥታ መገኛ መከታተያ",
    liveLocationDesc: "የዚህ ቪአይፒ ተሽከርካሪ ወቅታዊ የጂፒኤስ አቀማመጥ።",
  },
};

function getVehicleMockLocation(vehicleId: string) {
  // deterministic mock locations around Addis Ababa center for VIP fleets
  const locations = [
    { latitude: 9.0234, longitude: 38.7504, name: "Bole Airport VIP Terminal" },
    { latitude: 9.0105, longitude: 38.7612, name: "Kazanchis Diplomatic Quarter" },
    { latitude: 9.0302, longitude: 38.7421, name: "Piazza Government Offices" },
    { latitude: 8.9942, longitude: 38.7305, name: "Sarbet Corporate Hub" },
    { latitude: 9.0187, longitude: 38.7523, name: "Meskel Square Fleet Depot" },
    { latitude: 9.0289, longitude: 38.7891, name: "CMC Executive Residence Block" },
    { latitude: 9.0112, longitude: 38.7812, name: "Megenagna Transit Gateway" },
  ];

  let hash = 0;
  for (let i = 0; i < vehicleId.length; i++) {
    hash = vehicleId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % locations.length;
  return locations[index];
}

function VehicleDetailPageContent({ id }: { id: string }) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
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

  // Mouse Hover Zoom States
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZoomed, setIsZoomed] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
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

  // Fetch target vehicle
  useEffect(() => {
    async function loadVehicle() {
      try {
        const data = await fetchPublicVehicles();
        const found = data.vehicles.find((v) => v.id === id);
        if (found) {
          setVehicle(found);
        }
      } catch (err) {
        console.error("Failed to load vehicle details", err);
      } finally {
        setLoading(false);
      }
    }
    void loadVehicle();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 antialiased dark:bg-[#0d1117] dark:text-[#e8ecf1]">
        <header className="relative z-40 border-b border-[#C9B87A]/10 bg-[#1C3A34] text-white dark:border-white/10 dark:bg-[#0d1117]">
          <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" className="flex shrink-0 items-center">
              <BrandLogo priority className="transition-opacity group-hover:opacity-90" />
            </Link>
            <ThemeToggle
              placement="inline"
              className="auth-theme-toggle-inline h-9 w-9 border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-[#C9B87A] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-[#C9B87A]"
            />
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1C3A34]/10 border-t-[#C9B87A] dark:border-white/10 dark:border-t-[#C9B87A]" />
          <p className="mt-4 text-sm font-semibold text-slate-400 dark:text-[#8f99a6]">
            Loading vehicle specifications...
          </p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 antialiased dark:bg-[#0d1117] dark:text-[#e8ecf1]">
        <header className="relative z-40 border-b border-[#C9B87A]/10 bg-[#1C3A34] text-white dark:border-white/10 dark:bg-[#0d1117]">
          <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" className="flex shrink-0 items-center">
              <BrandLogo priority className="transition-opacity group-hover:opacity-90" />
            </Link>
            <ThemeToggle
              placement="inline"
              className="auth-theme-toggle-inline h-9 w-9 border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-[#C9B87A] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-[#C9B87A]"
            />
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <Car className="mb-4 h-16 w-16 text-slate-300 dark:text-[#7f8996]" />
          <h2 className="text-xl font-bold text-[#1C3A34] dark:text-[#eef1f5]">Vehicle Not Found</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-[#8f99a6]">
            The requested vehicle record could not be located in the catalog.
          </p>
          <Link
            href="/book"
            className="mt-5 rounded-xl bg-[#1C3A34] px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#254b43] dark:bg-[#C9B87A] dark:text-[#171a1f] dark:hover:bg-[#d8c98e]"
          >
            Return to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const isAvailable = isVehicleAvailableNow(vehicle);
  const availableFromLabel = formatVehicleAvailableFrom(
    getVehicleAvailableFrom(vehicle),
    locale,
  );
  const vehiclePhotos = vehicle.images ?? [];
  const activePhoto = vehiclePhotos[activeImageIndex];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 antialiased dark:bg-[#0d1117] dark:text-[#e8ecf1]">
      {/* Header */}
      <header className="relative z-40 border-b border-[#C9B87A]/10 bg-[#1C3A34] text-white dark:border-white/10 dark:bg-[#0d1117]">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="group flex shrink-0 items-center">
            <BrandLogo priority className="transition-opacity group-hover:opacity-90" />
          </Link>

          <div className="flex items-center gap-4">
            <ThemeToggle
              placement="inline"
              className="auth-theme-toggle-inline h-9 w-9 border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-[#C9B87A] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-[#C9B87A]"
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-white shadow-none transition-all hover:bg-white/10 hover:text-white dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label="Select language"
                  />
                }
              >
                <Languages className="h-[18px] w-[18px] text-[#C9B87A]" strokeWidth={1.75} />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="z-[10000] min-w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#171c24] dark:text-[#e8ecf1] dark:shadow-black/35"
              >
                <DropdownMenuGroup>
                  <DropdownMenuRadioGroup
                    value={locale}
                    onValueChange={(value) => setLocale(value as SupportedLocale)}
                  >
                    {LOCALE_OPTIONS.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                        className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-[#dfe5eb] dark:hover:bg-white/[0.06]"
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
                href={`/sign-in?redirect=/book/${id}`}
                className="rounded-full bg-[#C9B87A] px-4 py-2 text-xs font-bold tracking-wide text-[#1C3A34] shadow-md transition-all hover:bg-[#d9ca8e] hover:shadow-lg sm:px-5 sm:text-sm"
              >
                {locale === "am" ? "ግባ" : "Sign In"}
              </Link>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      className="rounded-full outline-none transition-all hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#C9B87A]"
                      aria-label="Account menu"
                    />
                  }
                >
                  <Avatar size="sm" className="size-9 cursor-pointer ring-2 ring-[#C9B87A]/50">
                    <AvatarFallback className="bg-[#1C3A34] text-[11px] font-bold text-white hover:bg-[#254b43]">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="z-[10000] w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#171c24] dark:text-[#e8ecf1] dark:shadow-black/35"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="px-2 py-2 font-normal">
                      <p className="truncate text-sm font-semibold text-[#1C3A34] dark:text-[#eef1f5]">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-[#8f99a6]">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="dark:bg-white/10" />
                    <DropdownMenuItem
                      className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-[#dfe5eb] dark:hover:bg-white/[0.06]"
                      render={
                        <Link
                          href={
                            user.roles.includes("admin") || user.roles.includes("dispatcher")
                              ? "/admin"
                              : "/dashboard"
                          }
                        />
                      }
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Console Dashboard
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="dark:bg-white/10" />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
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
      <section className="relative overflow-hidden bg-[#1C3A34] pt-16 pb-10 text-white dark:bg-[#0d1117] sm:pb-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#C9B87A_0%,_transparent_65%)] opacity-[0.05]" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-left sm:px-6">
          <Link
            href="/book"
            className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-white/60 transition-all hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.backToCatalog}
          </Link>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                {vehicle.make} {vehicle.model}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded border border-white/15 bg-white/10 px-2.5 py-0.5 font-mono text-xs tracking-widest text-white/80 uppercase">
                  {vehicle.plate_number}
                </span>
                <span className="text-white/30">•</span>
                <span className="text-xs font-medium text-white/60">
                  {copy.year}: {vehicle.year}
                </span>
              </div>
            </div>

            <div className="self-start sm:self-center">
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-xs",
                  isAvailable
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isAvailable ? "animate-pulse bg-emerald-400" : "bg-amber-400",
                  )}
                />
                {isAvailable ? (
                  <span>{copy.statusAvailable}</span>
                ) : (
                  <span>
                    {copy.statusBusy} {availableFromLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:sticky lg:top-[88px] lg:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171c24] dark:shadow-black/25 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-extrabold tracking-wider text-[#1C3A34] uppercase dark:border-white/10 dark:text-[#eef1f5]">
                <FileText className="h-4 w-4 text-[#8f7d45] dark:text-[#C9B87A]" />
                {copy.specs}
              </h2>

              <div className="divide-y divide-slate-100 dark:divide-white/10">
                <div className="flex items-center justify-between py-3 text-sm">
                  <span className="font-semibold text-slate-400 dark:text-[#8f99a6]">{copy.make}</span>
                  <span className="font-extrabold text-[#1C3A34] dark:text-[#eef1f5]">{vehicle.make}</span>
                </div>
                <div className="flex items-center justify-between py-3 text-sm">
                  <span className="font-semibold text-slate-400 dark:text-[#8f99a6]">{copy.model}</span>
                  <span className="font-extrabold text-[#1C3A34] dark:text-[#eef1f5]">{vehicle.model}</span>
                </div>
                <div className="flex items-center justify-between py-3 text-sm">
                  <span className="font-semibold text-slate-400 dark:text-[#8f99a6]">{copy.year}</span>
                  <span className="font-extrabold text-[#1C3A34] dark:text-[#eef1f5]">{vehicle.year}</span>
                </div>
                <div className="flex items-center justify-between py-3 text-sm">
                  <span className="font-semibold text-slate-400 dark:text-[#8f99a6]">{copy.plate}</span>
                  <span className="font-mono text-xs font-bold text-[#1C3A34] dark:text-[#eef1f5]">
                    {vehicle.plate_number}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 text-sm">
                  <span className="font-semibold text-slate-400 dark:text-[#8f99a6]">{copy.class}</span>
                  <span className="font-extrabold text-[#8f7d45] dark:text-[#d8c77f]">
                    {vehicle.vehicle_class?.name}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 text-sm">
                  <span className="font-semibold text-slate-400 dark:text-[#8f99a6]">{copy.type}</span>
                  <span className="font-extrabold text-[#1C3A34] dark:text-[#eef1f5]">
                    {vehicle.vehicle_type?.name}
                  </span>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/10">
                <Link
                  href={
                    user ? `/book/request?ids=${id}` : `/sign-in?redirect=/book/request?ids=${id}`
                  }
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1C3A34] px-6 py-4 text-center text-sm font-extrabold tracking-wide text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#254b43] hover:shadow-lg dark:bg-[#C9B87A] dark:text-[#171a1f] dark:hover:bg-[#d8c98e]"
                >
                  <span>{user ? copy.requestThisVehicle : copy.signInToRequest}</span>
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
            </div>

            {(() => {
              const mockLoc = getVehicleMockLocation(vehicle.id);
              return (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm dark:border-white/10 dark:bg-[#171c24] dark:shadow-black/25 sm:p-6">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold tracking-wider text-[#1C3A34] uppercase dark:text-[#eef1f5]">
                    <MapPin className="h-4 w-4 animate-bounce text-[#8f7d45] dark:text-[#C9B87A]" />
                    {copy.liveLocation}
                  </h3>
                  <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-[#8f99a6]">
                    {copy.liveLocationDesc} ({mockLoc.name})
                  </p>
                  <LazyVehicleLiveMap
                    latitude={mockLoc.latitude}
                    longitude={mockLoc.longitude}
                    popupText={`${vehicle.make} ${vehicle.model} (${vehicle.plate_number})`}
                    height={200}
                  />
                </div>
              );
            })()}

            <div className="flex items-start gap-4 rounded-2xl border border-[#1C3A34]/10 bg-[#1C3A34]/5 p-5 dark:border-[#C9B87A]/20 dark:bg-[#C9B87A]/[0.06]">
              <div className="shrink-0 rounded-xl bg-[#1C3A34] p-2.5 text-white dark:bg-[#C9B87A] dark:text-[#151a21]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#1C3A34] dark:text-[#eef1f5]">
                  {copy.guaranteedService}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-[#8f99a6]">
                  {copy.guaranteedServiceDesc}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-8">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171c24] dark:shadow-black/25 sm:p-6">
              <h2 className="mb-4 border-b border-slate-100 pb-2 text-sm font-extrabold tracking-wider text-[#1C3A34] uppercase dark:border-white/10 dark:text-[#eef1f5]">
                {copy.gallery}
              </h2>

              <div
                className="relative aspect-[16/10] w-full cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-inner dark:border-white/10 dark:bg-[#11161d] sm:aspect-[16/9]"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
              >
                {activePhoto ? (
                  <img
                    src={getVehiclePhotoUrl(activePhoto) || ""}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="h-full w-full object-cover transition-transform duration-150 ease-out"
                    style={{
                      transform: isZoomed ? "scale(2.2)" : "scale(1)",
                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    }}
                  />
                ) : (
                  <VehiclePhotoMedia
                    imageUrl={null}
                    alt={`${vehicle.make} ${vehicle.model}`}
                  />
                )}

                <div className="absolute bottom-4 left-4 z-10 flex gap-1.5">
                  <span className="rounded-full bg-[#1C3A34] px-2.5 py-1 text-[10px] font-extrabold text-white uppercase shadow-md dark:bg-[#C9B87A] dark:text-[#171a1f]">
                    {vehicle.vehicle_class?.name}
                  </span>
                  <span className="rounded-full bg-[#C9B87A] px-2.5 py-1 text-[10px] font-extrabold text-[#1C3A34] uppercase shadow-md">
                    {vehicle.vehicle_type?.name}
                  </span>
                </div>
              </div>

              {vehiclePhotos.length > 1 && (
                <div className="mt-4 flex gap-2.5 overflow-x-auto pb-2">
                  {vehiclePhotos.map((image, index) => {
                    const thumbUrl = getVehiclePhotoUrl(image);
                    const isActive = index === activeImageIndex;
                    return (
                      <button
                        key={index}
                        onClick={() => setActiveImageIndex(index)}
                        className={cn(
                          "relative h-16 w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg border transition-all",
                          isActive
                            ? "border-[#C9B87A] ring-2 ring-[#C9B87A]/25"
                            : "border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-[#C9B87A]/35",
                        )}
                      >
                        <img
                          src={thumbUrl || ""}
                          alt="Thumbnail"
                          className="h-full w-full object-cover"
                        />
                        {isActive && <div className="absolute inset-0 bg-[#1C3A34]/5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {vehicle.notes && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm dark:border-white/10 dark:bg-[#171c24] dark:shadow-black/25 sm:p-6">
                <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-extrabold tracking-wider text-[#1C3A34] uppercase dark:border-white/10 dark:text-[#eef1f5]">
                  {copy.overview}
                </h3>
                <p className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm leading-relaxed whitespace-pre-line text-slate-650 dark:border-white/10 dark:bg-[#11161d] dark:text-[#dfe5eb]">
                  {vehicle.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <LocaleProvider>
      <VehicleDetailPageContent id={id} />
    </LocaleProvider>
  );
}
