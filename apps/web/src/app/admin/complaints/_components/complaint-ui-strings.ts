import type { ComplaintCategory, ComplaintPriority, ComplaintStatus } from "@smart-dispatch/types";

export const STATUSES: ComplaintStatus[] = [
  "submitted",
  "under_review",
  "in_progress",
  "resolved",
  "closed",
  "rejected",
];

export const PRIORITIES: ComplaintPriority[] = ["low", "medium", "high", "urgent"];

export const CATEGORIES: ComplaintCategory[] = [
  "trip",
  "driver",
  "vehicle",
  "billing",
  "service",
  "other",
];

export function getComplaintUiStrings(isAm: boolean) {
  return {
    title: isAm ? "የቅሬታ አስተዳደር" : "Complaint Management",
    description: isAm
      ? "የደንበኞችን ቅሬታ ይከታተሉ፣ ቅድሚያ ይስጡ እና መፍትሄዎችን ይመዝግቡ።"
      : "Review, prioritize, respond to, and resolve customer complaints.",
    empty: isAm ? "ምንም ቅሬታ አልተገኘም" : "No complaints found",
    emptyDescription: isAm
      ? "በተመረጡት ማጣሪያዎች ምንም ቅሬታዎች አልተገኙም።"
      : "No complaints match your selected search or filter criteria.",
    filterTitle: isAm ? "ማጣሪያዎች እና የስራ ሂደት" : "Filters & Workflow",
    filterDescription: isAm
      ? "ቅሬታዎችን በሁኔታ፣ በቅድሚያ እና በምድብ ለይተው ያጣሩ።"
      : "Filter complaints by lifecycle status, urgency priority, and service category.",
    allStatuses: isAm ? "ሁሉም ሁኔታዎች" : "All statuses",
    allPriorities: isAm ? "ሁሉም ቅድሚያዎች" : "All priorities",
    allCategories: isAm ? "ሁሉም ምድቦች" : "All categories",
    clearFilters: isAm ? "ማጣሪያዎችን አጽዳ" : "Clear filters",
    statusFilterTabAll: isAm ? "ሁሉም ቅሬታዎች" : "All Complaints",
    status: isAm ? "ሁኔታ" : "Status",
    priority: isAm ? "ቅድሚያ" : "Priority",
    category: isAm ? "ምድብ" : "Category",
    requester: isAm ? "ደንበኛ" : "Requester",
    complaint: isAm ? "ቅሬታ" : "Complaint",
    submitted: isAm ? "የቀረበበት ቀን" : "Submitted Date",
    manage: isAm ? "አስተዳድር" : "Manage",
    reference: isAm ? "መለያ ቁጥር" : "Reference",
    workflow: isAm ? "የሥራ ሂደት እና ደረጃ" : "Workflow & Assignment",
    workflowDescription: isAm
      ? "የቅሬታውን ወቅታዊ ሁኔታ እና የክብደት ቅድሚያ ያስተካክሉ።"
      : "Update the complaint resolution lifecycle and priority level.",
    customerDetails: isAm ? "የደንበኛ መረጃ" : "Customer Details",
    complaintDetails: isAm ? "የቅሬታ ዝርዝር መረጃ" : "Complaint Description",
    resolution: isAm ? "ይፋዊ ምላሽ እና መፍትሄ" : "Official Response & Resolution",
    resolutionHint: isAm
      ? "ይህ ማስታወሻ ለደንበኛው በመተግበሪያው ላይ በቀጥታ ይታያል።"
      : "This response will be visible to the customer in their mobile app and portal.",
    responsePlaceholder: isAm
      ? "የተወሰደውን እርምጃ፣ ማካካሻ ወይም የተሰጠውን መፍትሄ በግልጽ ያብራሩ..."
      : "Explain the investigation findings, corrective actions taken, and provided resolution...",
    response: isAm ? "የአስተዳዳሪ ምላሽ" : "Administrator Response",
    lastUpdated: isAm ? "መጨረሻ የተዘመነው" : "Last updated",
    readOnly: isAm ? "የማንበብ ፈቃድ ብቻ አለዎት" : "Read-only access",
    cancel: isAm ? "ሰርዝ" : "Cancel",
    save: isAm ? "ለውጦችን አስቀምጥ" : "Save Changes",
    saving: isAm ? "በማስቀመጥ ላይ..." : "Saving...",
    saved: isAm ? "ቅሬታው በተሳካ ሁኔታ ተዘምኗል።" : "Complaint updated successfully.",
    updateFailed: isAm ? "ቅሬታውን ማዘመን አልተሳካም።" : "Failed to update complaint.",
    relatedRide: isAm ? "ተዛማጅ ጉዞ" : "Linked Ride Request",
    noRide: isAm ? "ከተለየ ጉዞ ጋር አልተያያዘም" : "Not linked to a specific ride request",
    stats: {
      total: isAm ? "ጠቅላላ ቅሬታዎች" : "Total Complaints",
      totalDesc: isAm ? "የቀረቡ ሁሉም ቅሬታዎች" : "All customer submissions",
      open: isAm ? "ክፍት ቅሬታዎች" : "Open Complaints",
      openDesc: isAm ? "ትኩረት የሚሹ አዳዲስ ቅሬታዎች" : "Awaiting review or in progress",
      urgent: isAm ? "አስቸኳይ ጉዳዮች" : "Urgent Priority",
      urgentDesc: isAm ? "ፈጣን እርምጃ የሚሹ" : "High-urgency escalations",
      resolved: isAm ? "የተፈቱ ቅሬታዎች" : "Resolved",
      resolvedDesc: isAm ? "መፍትሄ የተሰጣቸው እና የተዘጉ" : "Closed with resolution",
    },
    statuses: {
      submitted: isAm ? "የቀረበ" : "Submitted",
      under_review: isAm ? "በግምገማ ላይ" : "Under Review",
      in_progress: isAm ? "በሂደት ላይ" : "In Progress",
      resolved: isAm ? "የተፈታ" : "Resolved",
      closed: isAm ? "የተዘጋ" : "Closed",
      rejected: isAm ? "ውድቅ የተደረገ" : "Rejected",
    },
    priorities: {
      low: isAm ? "ዝቅተኛ" : "Low",
      medium: isAm ? "መካከለኛ" : "Medium",
      high: isAm ? "ከፍተኛ" : "High",
      urgent: isAm ? "አስቸኳይ" : "Urgent",
    },
    categories: {
      trip: isAm ? "የጉዞ አገልግሎት" : "Trip Service",
      driver: isAm ? "የአሽከርካሪ ባህሪ" : "Driver Behavior",
      vehicle: isAm ? "የተሽከርካሪ ሁኔታ" : "Vehicle Condition",
      billing: isAm ? "የክፍያ ወይም ታሪፍ" : "Billing & Fare",
      service: isAm ? "አጠቃላይ አገልግሎት" : "Customer Service",
      other: isAm ? "ሌላ" : "Other",
    },
    accessDenied: {
      eyebrow: isAm ? "መዳረሻ ተከልክሏል" : "Access Denied",
      title: isAm ? "ይህን ገጽ ለማየት ፈቃድ የለዎትም" : "Permission Required",
      description: isAm
        ? "የቅሬታዎችን ዝርዝር ለማየት ወይም ለማስተዳደር የ complaints.read ፈቃድ ያስፈልግዎታል።"
        : "You do not have permission to view or manage customer complaints.",
      permissionNote: isAm ? "የቅሬታ ፈቃድ ያስፈልጋል" : "Complaints permission required",
      sessionHint: isAm
        ? "እባክዎ መዳረሻ እንዲሰጥዎ የስርዓት አስተዳዳሪውን ያነጋግሩ።"
        : "Ask an administrator to grant complaints.read permission.",
      goToDashboard: isAm ? "ወደ ዳሽቦርድ ተመለስ" : "Go to dashboard",
    },
  };
}

export type ComplaintUiStrings = ReturnType<typeof getComplaintUiStrings>;
