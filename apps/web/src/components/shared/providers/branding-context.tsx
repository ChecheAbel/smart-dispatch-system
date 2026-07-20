"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { BrandingSettings } from "@smart-dispatch/types";
import {
  applyBrandingCssVariables,
  DEFAULT_BRANDING_SETTINGS,
  fetchPublicBrandingSettings,
  getBrandLogoUrl,
} from "@/lib/branding";

type BrandingContextValue = {
  branding: BrandingSettings;
  logoSrc: string;
  loading: boolean;
  refreshBranding: () => Promise<void>;
  setBranding: (next: BrandingSettings) => void;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<BrandingSettings>(DEFAULT_BRANDING_SETTINGS);
  const [loading, setLoading] = useState(true);

  const applyBranding = useCallback((next: BrandingSettings) => {
    setBrandingState(next);
    applyBrandingCssVariables(next);
  }, []);

  const refreshBranding = useCallback(async () => {
    const next = await fetchPublicBrandingSettings();
    applyBranding(next);
  }, [applyBranding]);

  useEffect(() => {
    applyBrandingCssVariables(DEFAULT_BRANDING_SETTINGS);

    let active = true;
    setLoading(true);

    void fetchPublicBrandingSettings()
      .then((next) => {
        if (!active) return;
        applyBranding(next);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applyBranding]);

  const logoSrc = getBrandLogoUrl(branding.logo_url);

  return (
    <BrandingContext.Provider
      value={{
        branding,
        logoSrc,
        loading,
        refreshBranding,
        setBranding: applyBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const value = useContext(BrandingContext);
  if (!value) {
    return {
      branding: DEFAULT_BRANDING_SETTINGS,
      logoSrc: getBrandLogoUrl(DEFAULT_BRANDING_SETTINGS.logo_url),
      loading: false,
      refreshBranding: async () => undefined,
      setBranding: () => undefined,
    } satisfies BrandingContextValue;
  }
  return value;
}
