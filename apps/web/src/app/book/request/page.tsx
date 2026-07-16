"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { CoordinateMapPickerProps } from "@/components/shared/coordinate-map-picker/coordinate-map-picker";
import {
  DEFAULT_MAP_CENTER,
  isValidCoordinatePair,
} from "@/lib/map/coordinates";
import {
  Car,
  Calendar,
  MapPin,
  User,
  Phone,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Lock,
  Languages,
  ShieldCheck,
  Check,
  ChevronRight,
  Info,
  LogOut,
  UserRound,
  LayoutDashboard,
  X,
  ShoppingBag,
  FileText,
  Repeat2,
  Zap,
  ArrowRight,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredUser, clearAuthSession } from "@/lib/auth-session";
import { fetchPublicVehicles } from "@/lib/vehicle-api";
import { fetchActiveRegions } from "@/lib/region-api";
import { createRideRequest, fetchRideRequestFormOptions } from "@/lib/ride-request-api";
import {
  buildLocationAddress,
  combineScheduledDateTime,
  filterLocationsByRegion,
} from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import type {
  Vehicle,
  User as AuthUser,
  Region,
  RideRequestLocationOption,
} from "@smart-dispatch/types";
import BrandLogo from "@/components/landing/BrandLogo";
import { VehiclePhotoMedia } from "@/components/book/vehicle-photo-media";
import { getVehiclePhotoUrl } from "@/lib/vehicle-photo";
import {
  formatVehicleAvailableFrom,
  getEarliestBookableAt,
  getVehicleAvailableFrom,
  isScheduleBeforeAvailableFrom,
  isVehicleAvailableNow,
  toScheduleTimeValue,
} from "@/lib/vehicle-availability";
import { LocaleProvider, useLocale } from "@/components/shared/providers";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  AdminTextField,
  AdminSelectField,
  AdminFormSection,
} from "@/components/shared/admin-form-field";
import { AdminDatePicker } from "@/components/shared/admin-date-picker";
import { AdminTimePicker, type TimeValue } from "@/components/shared/admin-time-picker";
import { startOfDay } from "date-fns";
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

const LazyCoordinateMapPicker = dynamic<CoordinateMapPickerProps>(
  () =>
    import("@/components/shared/coordinate-map-picker/coordinate-map-picker").then(
      (mod) => mod.CoordinateMapPicker,
    ),
  { ssr: false },
);


type CoordinateState = { latitude?: number; longitude?: number };

// Localized translations for the booking page
const COPY = {
  en: {
    backToCatalog: "Back to Catalog",
    requestBooking: "Confirm Your Ride Requests",
    requestSubTitle: "Fill out the dispatch coordinates below to schedule assignments for your selected vehicles.",
    signInPrompt: "Please sign in to make a request.",
    signInPromptDetail: "Create or sign in to your account to submit a ride request for the selected vehicles.",
    signInToBook: "Sign In to Continue",
    passengerDetails: "Passenger Details",
    passengerDetailsDesc: "Who will be traveling? Add their contact details for driver alerts.",
    tripDetails: "Trip Coordinates",
    tripDetailsDesc: "Specify where the driver will pick you up and drop you off.",
    scheduleDetails: "Schedule Plan",
    scheduleDetailsDesc: "Choose when you need the vehicles dispatched.",
    scheduleDetailsDescContract: "Set the contract service window with a start and end date & time.",
    passengerName: "Passenger Full Name",
    passengerNamePlaceholder: "e.g. John Doe",
    mobileNumber: "Contact Mobile Number",
    mobileNumberPlaceholder: "e.g. +251 911...",
    pickupLocation: "Pickup Location",
    pickupPlaceholder: "Select a saved pickup location",
    dropoffLocation: "Drop-off Destination",
    dropoffPlaceholder: "Select a saved drop-off location",
    selectRegionFirst: "Select a service region to load saved locations.",
    noSavedPickup: "No saved pickup locations for this region. Use a custom address.",
    noSavedDropoff: "No saved drop-off locations for this region. Use a custom address.",
    scheduledDate: "Scheduled Date",
    scheduledTime: "Scheduled Time",
    startDate: "Start Date",
    startTime: "Start Time",
    endDate: "End Date",
    endTime: "End Time",
    pickDate: "Pick date",
    pickTime: "Pick time",
    clearDate: "Clear date",
    clearTime: "Clear time",
    today: "Today",
    hour: "Hour",
    minute: "Minute",
    period: "Period",
    am: "AM",
    pm: "PM",
    applyTime: "Apply",
    submitRequest: "Submit Dispatch Request",
    submitting: "Submitting coordinates...",
    submitFailed: "Could not submit your ride request. Please try again.",
    viewMyRequests: "View My Requests",
    tryAgain: "Try again",
    successEyebrow: "Request received",
    successTitle: "Your dispatch request is in the queue",
    successText: "Our dispatch team will review your booking and assign a driver. You’ll hear from us at the mobile number you provided.",
    successStepReview: "Dispatch reviews your request",
    successStepAssign: "A driver is assigned to your vehicles",
    successStepContact: "You’re contacted with trip details",
    errorEyebrow: "Submission failed",
    errorTitle: "We couldn’t submit your dispatch request",
    errorStepCheck: "Check your connection and form details",
    errorStepRetry: "Try submitting the request again",
    errorStepSupport: "Contact support if the problem continues",
    vehiclesSubmitted: "{count} vehicle submitted",
    vehiclesSubmittedPlural: "{count} vehicles submitted",
    signIn: "Sign In",
    statusAvailable: "Available Now",
    statusBusy: "In Service - Available:",
    selectedVehicles: "Selected Vehicles",
    scheduleAvailableFromHint: "Earliest start based on selected vehicles:",
    scheduleTooEarly: "Choose a date and time on or after the vehicle available-from time.",
    scheduleEndBeforeStart: "End date and time must be on or after the start.",
    locationModeSaved: "Saved",
    locationModeCustom: "Custom",
    pickupAddressLabel: "Pickup Address",
    pickupAddressPlaceholder: "e.g. Bole Atlas, in front of...",
    dropoffAddressLabel: "Drop-off Address",
    dropoffAddressPlaceholder: "e.g. Kazanchis, ECA building...",
    pickupMapLabel: "Pin Pickup on Map",
    dropoffMapLabel: "Pin Drop-off on Map",
    mapHint: "Click or drag the pin to set the exact location.",
    mapLoading: "Loading map...",
    mapEmpty: "Click on the map to set a location",
    mapRecenter: "Recenter map",
    backupLocationHint: "Type your address below and optionally pin the exact location on the map.",
    requestTypeTitle: "How would you like to proceed?",
    requestTypeSubtitle: "Select the type of engagement for your selected vehicles before filling out the details.",
    singleTrip: "Single Trip Request",
    singleTripDesc: "A one-time dispatch for your selected vehicles. Ideal for immediate or scheduled one-off rides.",
    contract: "Form a Contract",
    contractDesc: "Establish a recurring dispatch agreement. Best for regular routes, recurring schedules, or corporate fleets.",
    selectType: "Select",
    changeType: "Change",
    selectedType: "Request Type",
  },
  am: {
    backToCatalog: "ወደ ካታሎግ ይመለሱ",
    requestBooking: "የጉዞ ጥያቄዎችዎን ያረጋግጡ",
    requestSubTitle: "ለመረጧቸው ተሽከርካሪዎች የጉዞ ምደባ ለማስያዝ ከታች ያለውን ቅጽ ይሙሉ::",
    signInPrompt: "ጥያቄ ለማድረግ እባክዎ ይግቡ።",
    signInPromptDetail: "ለተመረጡ ተሽከርካሪዎች የጉዞ ጥያቄ ለማስገባት መለያ ይፍጠሩ ወይም ይግቡ።",
    signInToBook: "ለመቀጠል ይግቡ",
    passengerDetails: "የተሳፋሪ ዝርዝሮች",
    passengerDetailsDesc: "ማን ነው የሚጓዘው? የአሽከርካሪ ማንቂያዎችን ለመቀበል የስልክ ቁጥራቸውን ያክሉ::",
    tripDetails: "የጉዞ መጋጠሚያዎች",
    tripDetailsDesc: "አሽከርካሪው የት እንደሚወስድዎት እና የት እንደሚያደርስዎት ይግለጹ::",
    scheduleDetails: "የጊዜ ሰሌዳ ዕቅድ",
    scheduleDetailsDesc: "ተሽከርካሪዎቹ መቼ እንዲላኩ እንደሚፈልጉ ይምረጡ::",
    scheduleDetailsDescContract: "የውሉን የአገልግሎት ጊዜ በመጀመሪያ እና መጨረሻ ቀንና ሰዓት ይግለጹ።",
    passengerName: "የተሳፋሪ ሙሉ ስም",
    passengerNamePlaceholder: "ምሳሌ፡ ዮሐንስ አበበ",
    mobileNumber: "የመገናኛ ስልክ ቁጥር",
    mobileNumberPlaceholder: "ምሳሌ፡ +251 911...",
    pickupLocation: "የመነሻ ቦታ",
    pickupPlaceholder: "የተቀመጠ የመነሻ ቦታ ይምረጡ",
    dropoffLocation: "የመድረሻ ቦታ",
    dropoffPlaceholder: "የተቀመጠ የመድረሻ ቦታ ይምረጡ",
    selectRegionFirst: "የተቀመጡ ቦታዎችን ለመጫን የአገልግሎት ክልል ይምረጡ።",
    noSavedPickup: "ለዚህ ክልል የተቀመጠ የመነሻ ቦታ የለም። ብጁ አድራሻ ይጠቀሙ።",
    noSavedDropoff: "ለዚህ ክልል የተቀመጠ የመድረሻ ቦታ የለም። ብጁ አድራሻ ይጠቀሙ።",
    scheduledDate: "የተያዘለት ቀን",
    scheduledTime: "የተያዘለት ሰዓት",
    startDate: "የመጀመሪያ ቀን",
    startTime: "የመጀመሪያ ሰዓት",
    endDate: "የመጨረሻ ቀን",
    endTime: "የመጨረሻ ሰዓት",
    pickDate: "ቀን ይምረጡ",
    pickTime: "ሰዓት ይምረጡ",
    clearDate: "ቀን ያጽዱ",
    clearTime: "ሰዓት ያጽዱ",
    today: "ዛሬ",
    hour: "ሰዓት",
    minute: "ደቂቃ",
    period: "አቆጣጠር",
    am: "ጡዋት",
    pm: "ከሰዓት",
    applyTime: "ተግብር",
    submitRequest: "የመላኪያ ጥያቄን አስገባ",
    submitting: "መጋጠሚያዎችን በማስገባት ላይ...",
    submitFailed: "የጉዞ ጥያቄዎን ማስገባት አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
    viewMyRequests: "የእኔን ጥያቄዎች ይመልከቱ",
    tryAgain: "እንደገና ይሞክሩ",
    successEyebrow: "ጥያቄ ተቀብሏል",
    successTitle: "የመላኪያ ጥያቄዎ በተራ ላይ ነው",
    successText: "የመላኪያ ቡድናችን ጥያቄዎን ይገመግማል እና አሽከርካሪ ይመድባል። በሰጡት ስልክ ቁጥር እናገኝዎታለን።",
    successStepReview: "መላኪያ ጥያቄዎን ይገመግማል",
    successStepAssign: "ለተሽከርካሪዎችዎ አሽከርካሪ ይመደባል",
    successStepContact: "የጉዞ ዝርዝሮችን በስልክ ያገኛሉ",
    errorEyebrow: "ማስገባት አልተሳካም",
    errorTitle: "የመላኪያ ጥያቄዎን ማስገባት አልተቻለም",
    errorStepCheck: "ግንኙነትዎን እና የቅጽ ዝርዝሮችን ያረጋግጡ",
    errorStepRetry: "ጥያቄውን እንደገና ለማስገባት ይሞክሩ",
    errorStepSupport: "ችግሩ ከቀጠለ ድጋፍን ያግኙ",
    vehiclesSubmitted: "{count} ተሽከርካሪ ተልኳል",
    vehiclesSubmittedPlural: "{count} ተሽከርካሪዎች ተልከዋል",
    signIn: "ግባ",
    statusAvailable: "አሁን ይገኛል",
    statusBusy: "ስራ ላይ - የሚገኝበት ጊዜ፡",
    selectedVehicles: "የተመረጡ ተሽከርካሪዎች",
    scheduleAvailableFromHint: "በተመረጡ ተሽከርካሪዎች መሠረት ቀድሞውኑ የሚያስችል ጊዜ፡",
    scheduleTooEarly: "ከተሽከርካሪው የሚገኝበት ጊዜ በኋላ ቀንና ሰዓት ይምረጡ።",
    scheduleEndBeforeStart: "የመጨረሻ ቀንና ሰዓት ከመጀመሪያው በኋላ መሆን አለበት።",
    locationModeSaved: "የተቀመጠ",
    locationModeCustom: "ብጁ",
    pickupAddressLabel: "የመነሻ አድራሻ",
    pickupAddressPlaceholder: "ምሳሌ፡ ቦሌ አትላስ...",
    dropoffAddressLabel: "የመድረሻ አድራሻ",
    dropoffAddressPlaceholder: "ምሳሌ፡ ካዛንቺስ...",
    pickupMapLabel: "መነሻን በ지도 ይሰኩ",
    dropoffMapLabel: "መድረሻን በ지도 ይሰኩ",
    mapHint: "ትክክለኛ ቦታ ለማስቀመጥ ፒን ይጫኑ ወይም ይጎትቱ።",
    mapLoading: "地図 በመጫን ላይ...",
    mapEmpty: "ቦታ ለማስቀመጥ地図 ን ጠቅ ያድርጉ",
    mapRecenter: "地図 ያዋሃዱ",
    backupLocationHint: "አድራሻ ያስገቡ እና ምርጫ ሆኖ ትክክለኛ ቦታ ያሰኩ።",
    requestTypeTitle: "እንዴት መቀጠል ይፈልጋሉ?",
    requestTypeSubtitle: "ዝርዝሮቹን ከመሙላትዎ በፊት ለተመረጡ ተሽከርካሪዎቹ የጥያቄ ዓይነቱን ይምረጡ።",
    singleTrip: "አንድ ጊዜ ጥያቄ",
    singleTripDesc: "ለተመረጡ ተሽከርካሪዎቹ አንድ ጊዜ መላኪያ። ለፈጣን ወይም ለታቀደ አንድ ጊዜ ጉዞ ተስማሚ።",
    contract: "ውል ያቋቁሙ",
    contractDesc: "ቀጣይ መላኪያ ስምምነት ያቋቁሙ። ለተደጋጋሚ መስመሮች ወይም ለድርጅት መስፈርቶች ተስማሚ።",
    selectType: "ይምረጡ",
    changeType: "ቀይር",
    selectedType: "የጥያቄ ዓይነት",
  },
};



// Inline mode-switch pill for saved vs custom location
function LocationModeSwitch({
  savedLabel,
  customLabel,
  useCustom,
  onSelectSaved,
  onSelectCustom,
}: {
  savedLabel: string;
  customLabel: string;
  useCustom: boolean;
  onSelectSaved: () => void;
  onSelectCustom: () => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50/90 p-0.5" role="group">
      <button
        type="button"
        onClick={onSelectSaved}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
          !useCustom
            ? "bg-white text-[#1C3A34] shadow-sm"
            : "text-slate-500 hover:text-slate-700",
        )}
      >
        {savedLabel}
      </button>
      <button
        type="button"
        onClick={onSelectCustom}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
          useCustom
            ? "bg-white text-[#1C3A34] shadow-sm"
            : "text-slate-500 hover:text-slate-700",
        )}
      >
        {customLabel}
      </button>
    </div>
  );
}

function VehicleRequestPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids") || "";
  const ids = useMemo(() => idsParam.split(",").filter(Boolean), [idsParam]);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [requestType, setRequestType] = useState<"single" | "contract" | null>(null);
  const [passengerName, setPassengerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [regionId, setRegionId] = useState<string>("");
  const [regions, setRegions] = useState<Region[]>([]);
  const [pickupLocations, setPickupLocations] = useState<RideRequestLocationOption[]>([]);
  const [dropoffLocations, setDropoffLocations] = useState<RideRequestLocationOption[]>([]);
  const [pickupLocationId, setPickupLocationId] = useState("");
  const [dropoffLocationId, setDropoffLocationId] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [useCustomPickup, setUseCustomPickup] = useState(false);
  const [useCustomDropoff, setUseCustomDropoff] = useState(false);
  const [pickupCoordinates, setPickupCoordinates] = useState<CoordinateState>({});
  const [dropoffCoordinates, setDropoffCoordinates] = useState<CoordinateState>({}); 
  const [loadingLocations, setLoadingLocations] = useState(false); 
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState<TimeValue | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [returnTime, setReturnTime] = useState<TimeValue | undefined>(undefined);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<"success" | "error" | null>(null);
  const [outcomeMessage, setOutcomeMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      const fullName = `${storedUser.first_name ?? ""} ${storedUser.last_name ?? ""}`.trim();
      setPassengerName(fullName);
      if (storedUser.mobile_number) {
        setMobileNumber(storedUser.mobile_number);
      }
    }
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

  const { locale, setLocale } = useLocale();
  const copy = COPY[locale] ?? COPY.en;

  useEffect(() => {
    let active = true;
    async function load() {
      if (ids.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const [data, regionsData] = await Promise.all([
          fetchPublicVehicles(),
          fetchActiveRegions(locale)
        ]);
        const found = data.vehicles.filter((v) => ids.includes(v.id));
        if (active) {
          setVehicles(found);
          setRegions(regionsData);
        }
      } catch (err) {
        console.error("Failed to load vehicles:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [idsParam]);

  useEffect(() => {
    if (!user || !regionId) {
      setPickupLocations([]);
      setDropoffLocations([]);
      return;
    }

    let active = true;
    async function loadLocations() {
      setLoadingLocations(true);
      try {
        const options = await fetchRideRequestFormOptions(locale, regionId);
        if (!active) return;
        setPickupLocations(options.pickup_locations);
        setDropoffLocations(options.dropoff_locations);
      } catch (err) {
        console.error("Failed to load booking locations:", err);
        if (active) {
          setPickupLocations([]);
          setDropoffLocations([]);
        }
      } finally {
        if (active) setLoadingLocations(false);
      }
    }

    void loadLocations();
    return () => {
      active = false;
    };
  }, [user, regionId, locale]);

  const removeVehicleId = (idToRemove: string) => {
    const nextIds = ids.filter((id) => id !== idToRemove);
    if (nextIds.length === 0) {
      router.push("/book");
    } else {
      router.push(`/book/request?ids=${nextIds.join(",")}`);
    }
  };



  const earliestBookableAt = useMemo(
    () => getEarliestBookableAt(vehicles),
    [vehicles],
  );
  const earliestBookableLabel = useMemo(
    () => formatVehicleAvailableFrom(earliestBookableAt, locale),
    [earliestBookableAt, locale],
  );
  const hasInServiceVehicle = useMemo(
    () => vehicles.some((vehicle) => !isVehicleAvailableNow(vehicle.status)),
    [vehicles],
  );
  const vehicleAvailabilityKey = useMemo(
    () => vehicles.map((vehicle) => `${vehicle.id}:${vehicle.status}`).join("|"),
    [vehicles],
  );

  useEffect(() => {
    if (vehicles.length === 0) return;

    const minAt = getEarliestBookableAt(vehicles);
    const minDay = startOfDay(minAt);

    if (hasInServiceVehicle) {
      setScheduledDate(minDay);
      setScheduledTime(toScheduleTimeValue(minAt));
      setScheduleError(null);
      return;
    }

    setScheduledDate((current) => {
      if (!current) return current;
      return startOfDay(current).getTime() < minDay.getTime() ? minDay : current;
    });
    setScheduledTime((current) => {
      if (!current) return current;
      const minMinutes = minAt.getHours() * 60 + minAt.getMinutes();
      const currentMinutes = current.hour * 60 + current.minute;
      return currentMinutes < minMinutes ? toScheduleTimeValue(minAt) : current;
    });
  }, [vehicleAvailabilityKey, hasInServiceVehicle, vehicles]);

  const regionPickupLocations = useMemo(
    () => filterLocationsByRegion(pickupLocations, regionId),
    [pickupLocations, regionId],
  );
  const regionDropoffLocations = useMemo(
    () => filterLocationsByRegion(dropoffLocations, regionId),
    [dropoffLocations, regionId],
  );

  const showCustomPickup = useCustomPickup || regionPickupLocations.length === 0;
  const showCustomDropoff = useCustomDropoff || regionDropoffLocations.length === 0;

  const pickupItems = useMemo(
    () => regionPickupLocations.map((location) => ({ label: location.name, value: location.id })),
    [regionPickupLocations],
  );

  const dropoffItems = useMemo(
    () =>
      regionDropoffLocations
        .filter((location) => location.id !== pickupLocationId)
        .map((location) => ({ label: location.name, value: location.id })),
    [regionDropoffLocations, pickupLocationId],
  );

  const clearTripLocations = () => {
    setPickupLocationId("");
    setDropoffLocationId("");
    setPickup("");
    setDropoff("");
    setPickupCoordinates({});
    setDropoffCoordinates({});
    setUseCustomPickup(false);
    setUseCustomDropoff(false);
  };

  const applyPickupLocation = (locationId: string) => {
    const location = regionPickupLocations.find((entry) => entry.id === locationId);
    if (!location) return;
    setPickupLocationId(locationId);
    setPickup(buildLocationAddress(location));
    setPickupCoordinates({ latitude: location.latitude, longitude: location.longitude });
    setUseCustomPickup(false);
    if (dropoffLocationId === locationId) {
      setDropoffLocationId("");
      setDropoff("");
      setDropoffCoordinates({});
    }
  };

  const applyDropoffLocation = (locationId: string) => {
    const location = regionDropoffLocations.find((entry) => entry.id === locationId);
    if (!location) return;
    setDropoffLocationId(locationId);
    setDropoff(buildLocationAddress(location));
    setDropoffCoordinates({ latitude: location.latitude, longitude: location.longitude });
    setUseCustomDropoff(false);
  };

  const scheduledMinTime = useMemo(() => {
    if (!scheduledDate) return undefined;
    if (startOfDay(scheduledDate).getTime() !== startOfDay(earliestBookableAt).getTime()) {
      return undefined;
    }
    return {
      hour: earliestBookableAt.getHours(),
      minute: earliestBookableAt.getMinutes(),
    };
  }, [scheduledDate, earliestBookableAt]);

  const returnMinTime = useMemo(() => {
    if (!returnDate || !scheduledDate || !scheduledTime) return undefined;
    if (startOfDay(returnDate).getTime() !== startOfDay(scheduledDate).getTime()) {
      return undefined;
    }
    return { hour: scheduledTime.hour, minute: scheduledTime.minute };
  }, [returnDate, scheduledDate, scheduledTime]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!requestType || !passengerName || !mobileNumber || !regionId || !pickup || !dropoff) return;
    if (!showCustomPickup && !pickupLocationId) return;
    if (!showCustomDropoff && !dropoffLocationId) return;

    if (
      !scheduledDate ||
      !scheduledTime ||
      isScheduleBeforeAvailableFrom(scheduledDate, scheduledTime, earliestBookableAt)
    ) {
      setScheduleError(copy.scheduleTooEarly);
      return;
    }

    const scheduledAt = combineScheduledDateTime(scheduledDate, scheduledTime);
    if (!scheduledAt) {
      setScheduleError(copy.scheduleTooEarly);
      return;
    }

    let scheduledReturnAt: Date | null = null;
    if (requestType === "contract") {
      if (!returnDate || !returnTime) {
        setScheduleError(copy.scheduleEndBeforeStart);
        return;
      }

      const startMinutes = scheduledTime.hour * 60 + scheduledTime.minute;
      const endMinutes = returnTime.hour * 60 + returnTime.minute;
      const startDay = startOfDay(scheduledDate).getTime();
      const endDay = startOfDay(returnDate).getTime();
      if (endDay < startDay || (endDay === startDay && endMinutes < startMinutes)) {
        setScheduleError(copy.scheduleEndBeforeStart);
        return;
      }

      scheduledReturnAt = combineScheduledDateTime(returnDate, returnTime);
      if (!scheduledReturnAt) {
        setScheduleError(copy.scheduleEndBeforeStart);
        return;
      }
    }

    const selectedVehicles = vehicles
      .filter((vehicle) => vehicle.vehicle_type_id && vehicle.vehicle_class_id)
      .map((vehicle) => ({
        vehicle_type_id: vehicle.vehicle_type_id,
        vehicle_class_id: vehicle.vehicle_class_id,
        quantity: 1,
      }));

    if (selectedVehicles.length === 0) {
      setOutcome("error");
      setOutcomeMessage(copy.submitFailed);
      return;
    }

    setScheduleError(null);
    setOutcomeMessage(null);
    setIsSubmitting(true);

    try {
      await createRideRequest({
        pickup_address: pickup.trim(),
        dropoff_address: dropoff.trim(),
        pickup_location_id: showCustomPickup ? null : pickupLocationId || null,
        dropoff_location_id: showCustomDropoff ? null : dropoffLocationId || null,
        pickup_latitude: pickupCoordinates.latitude ?? null,
        pickup_longitude: pickupCoordinates.longitude ?? null,
        dropoff_latitude: dropoffCoordinates.latitude ?? null,
        dropoff_longitude: dropoffCoordinates.longitude ?? null,
        region_id: regionId,
        passenger_count: 1,
        scheduled_at: scheduledAt.toISOString(),
        scheduled_return_at: scheduledReturnAt?.toISOString() ?? null,
        request_type: requestType,
        selected_vehicles: selectedVehicles,
        notes: `Passenger: ${passengerName.trim()} · Mobile: ${mobileNumber.trim()}`,
      });
      setOutcome("success");
      setOutcomeMessage(null);
    } catch (err) {
      console.error("Failed to submit ride request:", err);
      setOutcome("error");
      setOutcomeMessage(err instanceof Error ? err.message : copy.submitFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRequestType(null);
    setPassengerName("");
    setMobileNumber("");
    setRegionId("");
    setPickupLocationId("");
    setDropoffLocationId("");
    setPickup("");
    setDropoff("");
    setPickupCoordinates({});
    setDropoffCoordinates({});
    setUseCustomPickup(false);
    setUseCustomDropoff(false);
    setScheduledDate(undefined);
    setScheduledTime(undefined);
    setReturnDate(undefined);
    setReturnTime(undefined);
    setScheduleError(null);
    setOutcome(null);
    setOutcomeMessage(null);
    router.push("/book");
  };

  const dismissOutcomeError = () => {
    setOutcome(null);
    setOutcomeMessage(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col font-sans">
        <header className="relative z-40 bg-[#1C3A34] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
            <Link href="/" className="flex items-center shrink-0">
              <BrandLogo priority />
            </Link>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1C3A34]/10 border-t-[#C9B87A]" />
          <p className="text-slate-400 text-sm font-semibold mt-4">Preparing booking form...</p>
        </div>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col font-sans">
        <header className="relative z-40 bg-[#1C3A34] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
            <Link href="/" className="flex items-center shrink-0">
              <BrandLogo priority />
            </Link>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Car className="h-16 w-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-[#1C3A34]">No Vehicles Selected</h2>
          <p className="text-slate-500 text-sm mt-2">Select one or more vehicles in the catalog to submit a request.</p>
          <Link href="/book" className="mt-5 bg-[#1C3A34] hover:bg-[#254b43] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all">
            Return to Catalog
          </Link>
        </div>
      </div>
    );
  }

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
                      className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#C9B87A] transition-all hover:scale-105 cursor-pointer"
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

      {outcome ? (
        <div className="flex-1 bg-slate-50">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
              <div
                className={cn(
                  "relative px-6 py-10 text-center sm:px-8 sm:py-12",
                  outcome === "success" ? "bg-[#1C3A34]" : "bg-[#5c2a2a]",
                )}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      outcome === "success"
                        ? "radial-gradient(circle at 20% 20%, rgba(201,184,122,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(201,184,122,0.2), transparent 40%)"
                        : "radial-gradient(circle at 20% 20%, rgba(248,113,113,0.25), transparent 45%), radial-gradient(circle at 80% 80%, rgba(252,165,165,0.15), transparent 40%)",
                  }}
                  aria-hidden
                />
                <div
                  className={cn(
                    "relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg",
                    outcome === "success"
                      ? "bg-[#C9B87A] text-[#1C3A34]"
                      : "bg-red-100 text-red-700",
                  )}
                >
                  {outcome === "success" ? (
                    <CheckCircle2 className="h-8 w-8" strokeWidth={2.25} />
                  ) : (
                    <AlertCircle className="h-8 w-8" strokeWidth={2.25} />
                  )}
                </div>
                <p
                  className={cn(
                    "relative mt-5 text-[11px] font-bold uppercase tracking-[0.18em]",
                    outcome === "success" ? "text-[#C9B87A]" : "text-red-200",
                  )}
                >
                  {outcome === "success" ? copy.successEyebrow : copy.errorEyebrow}
                </p>
                <h3 className="relative mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {outcome === "success" ? copy.successTitle : copy.errorTitle}
                </h3>
                <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/70">
                  {outcome === "success"
                    ? copy.successText
                    : outcomeMessage || copy.submitFailed}
                </p>
              </div>

              <div className="space-y-6 px-6 py-7 sm:px-8">
                {vehicles.length > 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      {copy.selectedVehicles}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1C3A34]">
                      {(vehicles.length === 1
                        ? copy.vehiclesSubmitted
                        : copy.vehiclesSubmittedPlural
                      ).replace("{count}", String(vehicles.length))}
                      {" · "}
                      {vehicles.map((v) => `${v.make} ${v.model}`).join(", ")}
                    </p>
                  </div>
                ) : null}

                <ol className="space-y-3">
                  {(outcome === "success"
                    ? [copy.successStepReview, copy.successStepAssign, copy.successStepContact]
                    : [copy.errorStepCheck, copy.errorStepRetry, copy.errorStepSupport]
                  ).map((step, index) => (
                    <li
                      key={step}
                      className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3.5"
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold",
                          outcome === "success"
                            ? "bg-[#1C3A34] text-[#C9B87A]"
                            : "bg-red-700 text-red-100",
                        )}
                      >
                        {index + 1}
                      </span>
                      <span className="pt-1 text-sm font-medium leading-snug text-slate-700">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {outcome === "success" ? (
                    <>
                      <Link
                        href="/dashboard/my-requests"
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1C3A34] px-5 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-[#254b43]"
                      >
                        {copy.viewMyRequests}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={resetForm}
                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-[#1C3A34] transition-colors hover:border-[#1C3A34]/30 hover:bg-slate-50"
                      >
                        {copy.backToCatalog}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={dismissOutcomeError}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1C3A34] px-5 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-[#254b43]"
                      >
                        {copy.tryAgain}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={resetForm}
                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-[#1C3A34] transition-colors hover:border-[#1C3A34]/30 hover:bg-slate-50"
                      >
                        {copy.backToCatalog}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
      /* Main Split Layout Container */
      <div className="flex-1 flex flex-col lg:flex-row min-h-screen">
        
        {/* LEFT COLUMN PANEL: Vehicle Highlights (Dark green branding background) */}
        <div className="w-full lg:w-5/12 bg-[#1C3A34] text-white flex flex-col justify-between p-6 sm:p-8 lg:p-12">
          <div>
            {/* Back to Catalog Link */}
            <Link
              href="/book"
              className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-xs font-semibold transition-all mb-8 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              {copy.backToCatalog}
            </Link>

            {/* Title */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[#C9B87A]">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
                  {copy.selectedVehicles}
                </h1>
                <p className="text-xs text-white/40 font-medium mt-0.5">
                  {vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"} ready to request
                </p>
              </div>
            </div>

            {/* Scrollable list of vehicles */}
            <div className="space-y-4 max-h-[540px] overflow-y-auto pr-1 scrollbar-thin">
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="group relative flex flex-col gap-0 bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition hover:bg-white/[0.08]"
                >
                  {/* Photo Banner */}
                  <div className="h-36 w-full relative bg-white/5">
                    <VehiclePhotoMedia
                      imageUrl={v.images?.[0] ? getVehiclePhotoUrl(v.images[0]) : undefined}
                      alt={`${v.make} ${v.model}`}
                      tone="dark"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    {/* Status badge overlay */}
                    {(() => {
                      const available = isVehicleAvailableNow(v.status);
                      const availableFrom = getVehicleAvailableFrom(v.status);
                      return (
                        <span className={`absolute top-2 left-2 max-w-[85%] text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider border ${
                          available
                            ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                            : "bg-amber-500/20 border-amber-400/30 text-amber-300"
                        }`}>
                          {available
                            ? copy.statusAvailable
                            : `${copy.statusBusy} ${formatVehicleAvailableFrom(availableFrom, locale)}`}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Info panel */}
                  <div className="p-4 space-y-3">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-white leading-tight">{v.make} {v.model}</h4>
                        <p className="text-white/40 text-[10px] mt-0.5 font-medium">{v.year}</p>
                      </div>
                      {/* Plate */}
                      <span className="font-mono text-[9px] bg-white/10 border border-white/15 px-2 py-1 rounded text-white/80 uppercase tracking-wider shrink-0">
                        {v.plate_number}
                      </span>
                    </div>

                    {/* Detail chips row */}
                    <div className="flex flex-wrap gap-1.5">
                      {v.vehicle_type?.name && (
                        <span className="text-[9px] font-semibold bg-[#C9B87A]/15 border border-[#C9B87A]/25 text-[#C9B87A] px-2 py-0.5 rounded-full">
                          {v.vehicle_type.name}
                        </span>
                      )}
                      {v.vehicle_class?.name && (
                        <span className="text-[9px] font-semibold bg-white/10 border border-white/15 text-white/70 px-2 py-0.5 rounded-full">
                          {v.vehicle_class.name}
                        </span>
                      )}
                      {v.vehicle_type?.passenger_capacity && (
                        <span className="text-[9px] font-semibold bg-white/10 border border-white/15 text-white/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <User className="h-2.5 w-2.5" />
                          {v.vehicle_type.passenger_capacity} seats
                        </span>
                      )}
                      {v.color && (
                        <span className="text-[9px] font-semibold bg-white/10 border border-white/15 text-white/70 px-2 py-0.5 rounded-full capitalize">
                          {v.color}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => removeVehicleId(v.id)}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center bg-black/40 text-white/60 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                    aria-label="Remove vehicle"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Platform badging */}
            <div className="mt-12 pt-6 border-t border-white/10 flex items-center gap-3.5 text-white/50 text-xs">
              <ShieldCheck className="h-5 w-5 text-[#C9B87A] shrink-0" />
              <p className="leading-relaxed">Platform encrypted ride scheduling. Assignees receive automated mobile coordinates.</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN PANEL: Form Details (Spacious and creative full-page layout) */}
        <div className="w-full lg:w-7/12 p-6 sm:p-8 lg:p-12 xl:p-16 flex flex-col justify-between pt-8 sm:pt-12 lg:pt-16">
          
          <div className="max-w-2xl w-full mx-auto space-y-8">
            
            {/* Header Titles */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C3A34] tracking-tight">{copy.requestBooking}</h2>
              <p className="text-sm text-slate-500 font-medium">{copy.requestSubTitle}</p>
            </div>

            {!user ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1C3A34]/8">
                  <Lock className="h-5 w-5 text-[#1C3A34]" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-extrabold tracking-tight text-[#1C3A34]">
                  {copy.signInPrompt}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                  {copy.signInPromptDetail}
                </p>
                <Link
                  href={`/sign-in?redirect=${encodeURIComponent(`/book/request?ids=${ids.join(",")}`)}`}
                  className="mt-6 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[#1C3A34] px-5 py-3.5 text-sm font-bold tracking-wide text-white transition-colors hover:bg-[#254b43]"
                >
                  {copy.signInToBook}
                </Link>
              </div>
            ) : requestType === null ? (
              /* ── REQUEST TYPE SELECTOR ── */
              <div className="space-y-6">
                <div className="text-center space-y-1.5 py-4">
                  <h3 className="text-xl font-extrabold text-[#1C3A34] tracking-tight">{copy.requestTypeTitle}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-lg mx-auto">{copy.requestTypeSubtitle}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Single Trip Card */}
                  <button
                    type="button"
                    onClick={() => setRequestType("single")}
                    className="group relative text-left flex flex-col gap-4 rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:border-[#1C3A34] hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    {/* Icon circle */}
                    <div className="h-12 w-12 rounded-xl bg-[#1C3A34]/8 flex items-center justify-center group-hover:bg-[#1C3A34]/15 transition-colors">
                      <Zap className="h-6 w-6 text-[#1C3A34]" strokeWidth={1.75} />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h4 className="font-extrabold text-base text-[#1C3A34] group-hover:text-[#1C3A34]">
                        {copy.singleTrip}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {copy.singleTripDesc}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#1C3A34] font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      {copy.selectType} <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                    {/* Hover accent border glow */}
                    <span className="absolute inset-0 rounded-2xl ring-0 group-hover:ring-2 ring-[#1C3A34]/20 transition-all pointer-events-none" />
                  </button>

                  {/* Contract Card */}
                  <button
                    type="button"
                    onClick={() => setRequestType("contract")}
                    className="group relative text-left flex flex-col gap-4 rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:border-[#C9B87A] hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    {/* Icon circle */}
                    <div className="h-12 w-12 rounded-xl bg-[#C9B87A]/10 flex items-center justify-center group-hover:bg-[#C9B87A]/20 transition-colors">
                      <Repeat2 className="h-6 w-6 text-[#C9B87A]" strokeWidth={1.75} />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h4 className="font-extrabold text-base text-[#1C3A34] group-hover:text-[#1C3A34]">
                        {copy.contract}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {copy.contractDesc}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#C9B87A] font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      {copy.selectType} <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                    {/* Hover accent border glow */}
                    <span className="absolute inset-0 rounded-2xl ring-0 group-hover:ring-2 ring-[#C9B87A]/30 transition-all pointer-events-none" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-8">
                
                {/* Selected type badge + change button */}
                <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {requestType === "single" ? (
                      <Zap className="h-4 w-4 text-[#1C3A34]" strokeWidth={1.75} />
                    ) : (
                      <Repeat2 className="h-4 w-4 text-[#C9B87A]" strokeWidth={1.75} />
                    )}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{copy.selectedType}</p>
                      <p className={`text-sm font-extrabold ${requestType === "single" ? "text-[#1C3A34]" : "text-[#b89d59]"}`}>
                        {requestType === "single" ? copy.singleTrip : copy.contract}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequestType(null)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#1C3A34] transition-colors cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    {copy.changeType}
                  </button>
                </div>

                {/* Form Section 1: Passengers info */}
                <AdminFormSection title={copy.passengerDetails} description={copy.passengerDetailsDesc} icon={User}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AdminTextField
                      id="request-passenger-name"
                      label={copy.passengerName}
                      value={passengerName}
                      onChange={(e) => setPassengerName(e.target.value)}
                      placeholder={copy.passengerNamePlaceholder}
                      required
                    />

                    <div className="space-y-1.5">
                      <AdminTextField
                        id="request-mobile-number"
                        label={copy.mobileNumber}
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder={copy.mobileNumberPlaceholder}
                        type="tel"
                        required
                      />
                      <p className="text-[10px] text-slate-450 font-medium leading-normal flex items-start gap-1.5 mt-1 px-0.5 opacity-80">
                        <span className="h-1 w-1 rounded-full bg-[#C9B87A] shrink-0 mt-1.5 animate-pulse" />
                        <span>
                          {locale === "am"
                            ? "የጉዞ ጥያቄዎ ሁኔታን በተመለከተ በዚህ ስልክ ቁጥር ይገናኙዎታል።"
                            : "You will be contacted via this phone number regarding your ride request status."}
                        </span>
                      </p>
                    </div>
                  </div>
                </AdminFormSection>

                {/* Form Section 2: Trip locations */}
                <AdminFormSection title={copy.tripDetails} description={copy.tripDetailsDesc} icon={MapPin}>
                  <div className="space-y-6">

                    {/* Region Selection */}
                    <AdminSelectField
                      id="region-selection"
                      label={locale === "am" ? "የአገልግሎት ክልል" : "Service Region"}
                      value={regionId || null}
                      onValueChange={(value) => {
                        setRegionId(value);
                        clearTripLocations();
                      }}
                      items={regions.map(r => ({ label: r.name, value: r.id }))}
                      disabled={isSubmitting}
                      placeholder={locale === "am" ? "ክልል ይምረጡ" : "Select Region"}
                      required
                    />

                    {/* Pickup */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          {copy.pickupLocation}
                        </p>
                        {regionPickupLocations.length > 0 ? (
                          <LocationModeSwitch
                            savedLabel={copy.locationModeSaved}
                            customLabel={copy.locationModeCustom}
                            useCustom={useCustomPickup}
                            onSelectSaved={() => {
                              setUseCustomPickup(false);
                              setPickupLocationId("");
                              setPickup("");
                              setPickupCoordinates({});
                            }}
                            onSelectCustom={() => {
                              setUseCustomPickup(true);
                              setPickupLocationId("");
                              setPickup("");
                              setPickupCoordinates({});
                            }}
                          />
                        ) : null}
                      </div>
                      {!regionId ? (
                        <p className="text-xs text-slate-500">{copy.selectRegionFirst}</p>
                      ) : loadingLocations ? (
                        <p className="text-xs text-slate-400">{copy.mapLoading}</p>
                      ) : !showCustomPickup ? (
                        <div className="space-y-2">
                          <AdminSelectField
                            id="request-pickup-point"
                            label=""
                            value={pickupLocationId || null}
                            onValueChange={applyPickupLocation}
                            items={pickupItems}
                            placeholder={copy.pickupPlaceholder}
                            required
                            disabled={isSubmitting}
                          />
                          {isValidCoordinatePair(pickupCoordinates.latitude, pickupCoordinates.longitude) && (
                            <p className="text-[10px] text-[#1C3A34] font-semibold flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#1C3A34] inline-block" />
                              {pickupCoordinates.latitude?.toFixed(5)}, {pickupCoordinates.longitude?.toFixed(5)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {regionPickupLocations.length === 0 ? (
                            <p className="text-xs leading-relaxed text-slate-500">{copy.noSavedPickup}</p>
                          ) : (
                            <p className="text-xs leading-relaxed text-slate-500">{copy.backupLocationHint}</p>
                          )}
                          <AdminTextField
                            id="request-pickup-address"
                            label={copy.pickupAddressLabel}
                            value={pickup}
                            onChange={(e) => setPickup(e.target.value)}
                            placeholder={copy.pickupAddressPlaceholder}
                            required
                          />
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-[#1C3A34]">{copy.pickupMapLabel}</Label>
                            <LazyCoordinateMapPicker
                              latitude={pickupCoordinates.latitude}
                              longitude={pickupCoordinates.longitude}
                              onCoordinatesChange={(lat, lng) => setPickupCoordinates({ latitude: lat, longitude: lng })}
                              visible={!loading}
                              defaultCenter={DEFAULT_MAP_CENTER}
                              title={copy.pickupMapLabel}
                              hint={copy.mapHint}
                              loadingLabel={copy.mapLoading}
                              emptyLabel={copy.mapEmpty}
                              recenterLabel={copy.mapRecenter}
                            />
                            {isValidCoordinatePair(pickupCoordinates.latitude, pickupCoordinates.longitude) && (
                              <p className="text-[10px] text-[#1C3A34] font-semibold flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#1C3A34] inline-block" />
                                {pickupCoordinates.latitude?.toFixed(5)}, {pickupCoordinates.longitude?.toFixed(5)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Drop-off */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          {copy.dropoffLocation}
                        </p>
                        {regionDropoffLocations.length > 0 ? (
                          <LocationModeSwitch
                            savedLabel={copy.locationModeSaved}
                            customLabel={copy.locationModeCustom}
                            useCustom={useCustomDropoff}
                            onSelectSaved={() => {
                              setUseCustomDropoff(false);
                              setDropoffLocationId("");
                              setDropoff("");
                              setDropoffCoordinates({});
                            }}
                            onSelectCustom={() => {
                              setUseCustomDropoff(true);
                              setDropoffLocationId("");
                              setDropoff("");
                              setDropoffCoordinates({});
                            }}
                          />
                        ) : null}
                      </div>
                      {!regionId ? (
                        <p className="text-xs text-slate-500">{copy.selectRegionFirst}</p>
                      ) : loadingLocations ? (
                        <p className="text-xs text-slate-400">{copy.mapLoading}</p>
                      ) : !showCustomDropoff ? (
                        <div className="space-y-2">
                          <AdminSelectField
                            id="request-dropoff-point"
                            label=""
                            value={dropoffLocationId || null}
                            onValueChange={applyDropoffLocation}
                            items={dropoffItems}
                            placeholder={copy.dropoffPlaceholder}
                            required
                            disabled={isSubmitting}
                          />
                          {isValidCoordinatePair(dropoffCoordinates.latitude, dropoffCoordinates.longitude) && (
                            <p className="text-[10px] text-[#C9B87A] font-semibold flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#C9B87A] inline-block" />
                              {dropoffCoordinates.latitude?.toFixed(5)}, {dropoffCoordinates.longitude?.toFixed(5)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {regionDropoffLocations.length === 0 ? (
                            <p className="text-xs leading-relaxed text-slate-500">{copy.noSavedDropoff}</p>
                          ) : (
                            <p className="text-xs leading-relaxed text-slate-500">{copy.backupLocationHint}</p>
                          )}
                          <AdminTextField
                            id="request-dropoff-address"
                            label={copy.dropoffAddressLabel}
                            value={dropoff}
                            onChange={(e) => setDropoff(e.target.value)}
                            placeholder={copy.dropoffAddressPlaceholder}
                            required
                          />
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-[#1C3A34]">{copy.dropoffMapLabel}</Label>
                            <LazyCoordinateMapPicker
                              latitude={dropoffCoordinates.latitude}
                              longitude={dropoffCoordinates.longitude}
                              onCoordinatesChange={(lat, lng) => setDropoffCoordinates({ latitude: lat, longitude: lng })}
                              visible={!loading}
                              defaultCenter={DEFAULT_MAP_CENTER}
                              title={copy.dropoffMapLabel}
                              hint={copy.mapHint}
                              loadingLabel={copy.mapLoading}
                              emptyLabel={copy.mapEmpty}
                              recenterLabel={copy.mapRecenter}
                            />
                            {isValidCoordinatePair(dropoffCoordinates.latitude, dropoffCoordinates.longitude) && (
                              <p className="text-[10px] text-[#C9B87A] font-semibold flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#C9B87A] inline-block" />
                                {dropoffCoordinates.latitude?.toFixed(5)}, {dropoffCoordinates.longitude?.toFixed(5)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </AdminFormSection>

                {/* Form Section 3: Date & time details */}
                <AdminFormSection
                  title={copy.scheduleDetails}
                  description={
                    requestType === "contract"
                      ? copy.scheduleDetailsDescContract
                      : copy.scheduleDetailsDesc
                  }
                  icon={Calendar}
                >
                  {hasInServiceVehicle ? (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800">
                      {copy.scheduleAvailableFromHint}{" "}
                      <span className="font-bold">{earliestBookableLabel}</span>
                    </p>
                  ) : null}

                  {requestType === "contract" ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <AdminDatePicker
                          id="request-start-date"
                          label={copy.startDate}
                          placeholder={copy.pickDate}
                          clearLabel={copy.clearDate}
                          todayLabel={copy.today}
                          minDate={earliestBookableAt}
                          value={scheduledDate}
                          onChange={(date) => {
                            setScheduledDate(date);
                            setScheduledTime(undefined);
                            setScheduleError(null);
                            if (
                              date &&
                              returnDate &&
                              startOfDay(returnDate).getTime() < startOfDay(date).getTime()
                            ) {
                              setReturnDate(undefined);
                              setReturnTime(undefined);
                            }
                          }}
                        />
                        <AdminTimePicker
                          id="request-start-time"
                          label={copy.startTime}
                          placeholder={copy.pickTime}
                          clearLabel={copy.clearTime}
                          applyLabel={copy.applyTime}
                          value={scheduledTime}
                          minTime={scheduledMinTime}
                          locale={locale}
                          hour12
                          disabled={!scheduledDate}
                          onChange={(time) => {
                            setScheduledTime(time);
                            setScheduleError(null);
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <AdminDatePicker
                          id="request-end-date"
                          label={copy.endDate}
                          placeholder={copy.pickDate}
                          clearLabel={copy.clearDate}
                          todayLabel={copy.today}
                          minDate={scheduledDate ?? earliestBookableAt}
                          value={returnDate}
                          disabled={!scheduledDate}
                          onChange={(date) => {
                            setReturnDate(date);
                            setReturnTime(undefined);
                            setScheduleError(null);
                          }}
                        />
                        <AdminTimePicker
                          id="request-end-time"
                          label={copy.endTime}
                          placeholder={copy.pickTime}
                          clearLabel={copy.clearTime}
                          applyLabel={copy.applyTime}
                          value={returnTime}
                          minTime={returnMinTime}
                          locale={locale}
                          hour12
                          disabled={!returnDate}
                          onChange={(time) => {
                            setReturnTime(time);
                            setScheduleError(null);
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <AdminDatePicker
                        id="request-scheduled-date"
                        label={copy.scheduledDate}
                        placeholder={copy.pickDate}
                        clearLabel={copy.clearDate}
                        todayLabel={copy.today}
                        minDate={earliestBookableAt}
                        value={scheduledDate}
                        onChange={(date) => {
                          setScheduledDate(date);
                          setScheduledTime(undefined);
                          setScheduleError(null);
                        }}
                      />

                      <AdminTimePicker
                        id="request-scheduled-time"
                        label={copy.scheduledTime}
                        placeholder={copy.pickTime}
                        clearLabel={copy.clearTime}
                        applyLabel={copy.applyTime}
                        value={scheduledTime}
                        minTime={scheduledMinTime}
                        locale={locale}
                        hour12
                        disabled={!scheduledDate}
                        onChange={(time) => {
                          setScheduledTime(time);
                          setScheduleError(null);
                        }}
                      />
                    </div>
                  )}
                  {scheduleError ? (
                    <p className="text-xs text-red-600">{scheduleError}</p>
                  ) : null}
                </AdminFormSection>

                {/* Submit Action */}
                <div className="pt-6 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#1C3A34] hover:bg-[#254b43] disabled:bg-slate-350 text-white font-extrabold text-sm py-4 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer text-center"
                  >
                    {isSubmitting ? copy.submitting : copy.submitRequest}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
      )}
    </div>
  );
}

export default function VehicleRequestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1C3A34]/10 border-t-[#C9B87A]" />
      </div>
    }>
      <LocaleProvider>
        <VehicleRequestPageContent />
      </LocaleProvider>
    </Suspense>
  );
}
