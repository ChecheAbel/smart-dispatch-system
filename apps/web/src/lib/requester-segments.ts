import type { RequesterSegment } from "@smart-dispatch/types";

export const REQUESTER_SEGMENT_OPTIONS: Array<{
  value: RequesterSegment;
  title: string;
  description: string;
}> = [
  {
    value: "individual",
    title: "Individual",
    description: "Personal trips and individual bookings (B2P).",
  },
  {
    value: "business",
    title: "Business",
    description: "Company, NGO, or fleet account (B2B).",
  },
  {
    value: "government",
    title: "Government",
    description: "Ministry, agency, or public body (B2G).",
  },
];

export const GOVERNMENT_ENTITY_TYPES = [
  "Ministry",
  "Agency",
  "Public enterprise",
  "Municipality",
  "Regional office",
  "Other",
] as const;
