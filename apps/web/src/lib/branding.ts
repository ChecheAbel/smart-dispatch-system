import type { BrandingSettings } from "@smart-dispatch/types";

export const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  company_name: "Ethiopian Investment Holdings",
  product_name: "Smart Dispatch",
  logo_url: null,
  primary_color: "#1C3A34",
  accent_color: "#C9B87A",
  support_email: null,
  support_phone: null,
  website_url: null,
};

export const DEFAULT_BRAND_LOGO_SRC = "/logo.webp";

export function getBrandLogoUrl(
  logoUrl: string | null | undefined,
  apiBaseUrl?: string,
) {
  if (!logoUrl) {
    return DEFAULT_BRAND_LOGO_SRC;
  }

  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    return logoUrl;
  }

  if (logoUrl.startsWith("/") && !logoUrl.startsWith("/uploads/")) {
    return logoUrl;
  }

  const base = (apiBaseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    "",
  );
  return `${base}${logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`}`;
}

export function applyBrandingCssVariables(branding: Pick<BrandingSettings, "primary_color" | "accent_color">) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.style.setProperty("--brand-primary", branding.primary_color);
  root.style.setProperty("--brand-accent", branding.accent_color);
}

export function formatWebsiteLabel(url: string) {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

export function normalizeWebsiteHref(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

export async function fetchPublicBrandingSettings(): Promise<BrandingSettings> {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

  try {
    const response = await fetch(`${base}/api/public/branding`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return { ...DEFAULT_BRANDING_SETTINGS };
    }

    const body = (await response.json()) as {
      success?: boolean;
      data?: { branding?: BrandingSettings };
    };

    if (body.success !== true || !body.data?.branding) {
      return { ...DEFAULT_BRANDING_SETTINGS };
    }

    return {
      ...DEFAULT_BRANDING_SETTINGS,
      ...body.data.branding,
    };
  } catch {
    return { ...DEFAULT_BRANDING_SETTINGS };
  }
}
