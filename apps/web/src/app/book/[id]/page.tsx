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
    statusBusy: "In Service - Available:",
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
    statusBusy: "ስራ ላይ - የሚገኝበት ጊዜ፡",
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
      <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col font-sans">
        <header className="relative z-40 bg-[#1C3A34] text-white border-b border-[#C9B87A]/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
            <Link href="/" className="flex items-center shrink-0">
              <BrandLogo priority className="group-hover:opacity-90 transition-opacity" />
            </Link>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1C3A34]/10 border-t-[#C9B87A]" />
          <p className="text-slate-400 text-sm font-semibold mt-4">Loading vehicle specifications...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col font-sans">
        <header className="relative z-40 bg-[#1C3A34] text-white border-b border-[#C9B87A]/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
            <Link href="/" className="flex items-center shrink-0">
              <BrandLogo priority className="group-hover:opacity-90 transition-opacity" />
            </Link>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Car className="h-16 w-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-[#1C3A34]">Vehicle Not Found</h2>
          <p className="text-slate-500 text-sm mt-2">The requested vehicle record could not be located in the catalog.</p>
          <Link href="/book" className="mt-5 bg-[#1C3A34] hover:bg-[#254b43] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all">
            Return to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const isAvailable = isVehicleAvailableNow(vehicle.status);
  const availableFromLabel = formatVehicleAvailableFrom(
    getVehicleAvailableFrom(vehicle.status),
    locale,
  );
  const vehiclePhotos = vehicle.images ?? [];
  const activePhoto = vehiclePhotos[activeImageIndex];

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
                href={`/sign-in?redirect=/book/${id}`}
                className="bg-[#C9B87A] hover:bg-[#d9ca8e] text-[#1C3A34] font-bold text-xs sm:text-sm px-4 sm:px-5 py-2 rounded-full tracking-wide transition-all shadow-md hover:shadow-lg"
              >
                {locale === "am" ? "ግባ" : "Sign In"}
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
      <section className="bg-[#1C3A34] text-white pt-16 pb-10 sm:pb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#C9B87A_0%,_transparent_65%)] opacity-[0.05]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-left">
          <Link href="/book" className="inline-flex items-center gap-1 text-white/60 hover:text-white text-xs font-semibold transition-all mb-4">
            <ArrowLeft className="h-4 w-4" />
            {copy.backToCatalog}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                {vehicle.make} {vehicle.model}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-mono text-xs bg-white/10 border border-white/15 px-2.5 py-0.5 rounded text-white/80 uppercase tracking-widest">
                  {vehicle.plate_number}
                </span>
                <span className="text-white/30">•</span>
                <span className="text-xs text-white/60 font-medium">
                  {copy.year}: {vehicle.year}
                </span>
              </div>
            </div>
            
            {/* Availability status badge */}
            <div className="self-start sm:self-center">
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-xs font-semibold text-xs",
                isAvailable
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              )}>
                <span className={cn("h-2 w-2 rounded-full", isAvailable ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
                {isAvailable ? (
                  <span>{copy.statusAvailable}</span>
                ) : (
                  <span>{copy.statusBusy} {availableFromLabel}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Specifications and CTA (width: 4/12) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-[88px]">
            {/* Specifications Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
              <h2 className="text-sm font-extrabold text-[#1C3A34] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#8f7d45]" />
                {copy.specs}
              </h2>
              
              <div className="divide-y divide-slate-100">
                <div className="flex justify-between items-center py-3 text-sm">
                  <span className="text-slate-400 font-semibold">{copy.make}</span>
                  <span className="text-[#1C3A34] font-extrabold">{vehicle.make}</span>
                </div>
                <div className="flex justify-between items-center py-3 text-sm">
                  <span className="text-slate-400 font-semibold">{copy.model}</span>
                  <span className="text-[#1C3A34] font-extrabold">{vehicle.model}</span>
                </div>
                <div className="flex justify-between items-center py-3 text-sm">
                  <span className="text-slate-400 font-semibold">{copy.year}</span>
                  <span className="text-[#1C3A34] font-extrabold">{vehicle.year}</span>
                </div>
                <div className="flex justify-between items-center py-3 text-sm">
                  <span className="text-slate-400 font-semibold">{copy.plate}</span>
                  <span className="text-[#1C3A34] font-mono font-bold text-xs">{vehicle.plate_number}</span>
                </div>
                <div className="flex justify-between items-center py-3 text-sm">
                  <span className="text-slate-400 font-semibold">{copy.class}</span>
                  <span className="text-[#8f7d45] font-extrabold">{vehicle.vehicle_class?.name}</span>
                </div>
                <div className="flex justify-between items-center py-3 text-sm">
                  <span className="text-slate-400 font-semibold">{copy.type}</span>
                  <span className="text-[#1C3A34] font-extrabold">{vehicle.vehicle_type?.name}</span>
                </div>
              </div>

              {/* ACTION CTA BUTTON */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <Link
                  href={user ? `/book/request?ids=${id}` : `/sign-in?redirect=/book/request?ids=${id}`}
                  className="w-full bg-[#1C3A34] hover:bg-[#254b43] text-white font-extrabold text-sm py-4 px-6 rounded-xl tracking-wide transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 hover:-translate-y-0.5 cursor-pointer text-center"
                >
                  <span>{user ? copy.requestThisVehicle : copy.signInToRequest}</span>
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
            </div>

            {/* Live Location Map Card */}
            {(() => {
              const mockLoc = getVehicleMockLocation(vehicle.id);
              return (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 text-left">
                  <h3 className="text-sm font-extrabold text-[#1C3A34] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#8f7d45] animate-bounce" />
                    {copy.liveLocation}
                  </h3>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
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

            {/* Guaranteed Corporate Service Badge */}
            <div className="bg-[#1C3A34]/5 border border-[#1C3A34]/10 rounded-2xl p-5 flex gap-4 items-start">
              <div className="p-2.5 bg-[#1C3A34] text-white rounded-xl shrink-0">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-[#1C3A34] text-sm">{copy.guaranteedService}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{copy.guaranteedServiceDesc}</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Media Gallery & Overview (width: 8/12) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Photo Gallery Card (Large) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-6">
              <h2 className="text-sm font-extrabold text-[#1C3A34] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                {copy.gallery}
              </h2>
              
              {/* Primary Image Preview (Stretched & Larger aspect ratio) */}
              <div
                className="aspect-[16/10] sm:aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-150 border border-slate-200 relative shadow-inner cursor-zoom-in"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsZoomed(true)}
                onMouseLeave={() => setIsZoomed(false)}
              >
                {activePhoto ? (
                  <img
                    src={getVehiclePhotoUrl(activePhoto) || ""}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover transition-transform duration-150 ease-out"
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

                {/* Floating specifications tags */}
                <div className="absolute bottom-4 left-4 flex gap-1.5 z-10">
                  <span className="text-[10px] font-extrabold bg-[#1C3A34] text-white px-2.5 py-1 rounded-full uppercase shadow-md">
                    {vehicle.vehicle_class?.name}
                  </span>
                  <span className="text-[10px] font-extrabold bg-[#C9B87A] text-[#1C3A34] px-2.5 py-1 rounded-full uppercase shadow-md">
                    {vehicle.vehicle_type?.name}
                  </span>
                </div>
              </div>

              {/* Thumbnails Row */}
              {vehiclePhotos.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto mt-4 pb-2">
                  {vehiclePhotos.map((image, index) => {
                    const thumbUrl = getVehiclePhotoUrl(image);
                    const isActive = index === activeImageIndex;
                    return (
                      <button
                        key={index}
                        onClick={() => setActiveImageIndex(index)}
                        className={cn(
                          "relative h-16 w-24 rounded-lg overflow-hidden border transition-all shrink-0 cursor-pointer",
                          isActive
                            ? "border-[#C9B87A] ring-2 ring-[#C9B87A]/25"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <img src={thumbUrl || ""} alt="Thumbnail" className="w-full h-full object-cover" />
                        {isActive && <div className="absolute inset-0 bg-[#1C3A34]/5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Overview / Notes Card */}
            {vehicle.notes && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 text-left">
                <h3 className="text-sm font-extrabold text-[#1C3A34] uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">{copy.overview}</h3>
                <p className="text-sm text-slate-650 leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-xl border border-slate-150">{vehicle.notes}</p>
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
