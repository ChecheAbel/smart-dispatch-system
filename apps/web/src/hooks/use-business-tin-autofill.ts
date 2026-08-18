"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import type { BusinessTinLicense, BusinessTinRegistration } from "@smart-dispatch/types";
import {
  businessFieldsFromTinLookup,
  fetchBusinessTinLicense,
  fetchBusinessTinRegistration,
  type BusinessTinAutofillFields,
} from "@/lib/business-tin-api";
import { isValidEthiopianTin } from "@/lib/ethiopian-tin";

export type TinLookupStatus = "idle" | "loading" | "select" | "filled" | "empty" | "error";

function isAbortError(error: unknown) {
  return axios.isCancel(error) || (error instanceof Error && error.name === "CanceledError");
}

export function useBusinessTinAutofill({
  tin,
  enabled,
  onFill,
}: {
  tin: string;
  enabled: boolean;
  onFill: (fields: BusinessTinAutofillFields) => void;
}) {
  const [status, setStatus] = useState<TinLookupStatus>("idle");
  const [licenses, setLicenses] = useState<BusinessTinLicense[]>([]);
  const [ownerName, setOwnerName] = useState("");
  const [selectedLicenseNo, setSelectedLicenseNo] = useState<string | null>(null);
  const [isFilling, setIsFilling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onFillRef = useRef(onFill);
  onFillRef.current = onFill;

  const registrationRef = useRef<BusinessTinRegistration | null>(null);

  const applyLicense = useCallback(async (license: BusinessTinLicense, signal?: AbortSignal) => {
    const registration = registrationRef.current;
    if (!registration) return;

    setSelectedLicenseNo(license.license_no);
    setIsFilling(true);
    setErrorMessage(null);

    let detail = null;
    try {
      detail = await fetchBusinessTinLicense(registration.tin, license.license_no, signal);
    } catch (error) {
      if (isAbortError(error)) return;
      detail = null;
    }

    if (signal?.aborted) return;

    onFillRef.current(businessFieldsFromTinLookup(registration, license, detail));
    setIsFilling(false);
    setStatus("filled");
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      setLicenses([]);
      setOwnerName("");
      setSelectedLicenseNo(null);
      setIsFilling(false);
      setErrorMessage(null);
      registrationRef.current = null;
      return;
    }

    if (!isValidEthiopianTin(tin)) {
      setStatus("idle");
      setLicenses([]);
      setOwnerName("");
      setSelectedLicenseNo(null);
      setIsFilling(false);
      setErrorMessage(null);
      registrationRef.current = null;
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setStatus("loading");
      setErrorMessage(null);
      setSelectedLicenseNo(null);
      setIsFilling(false);
      setLicenses([]);
      setOwnerName("");

      try {
        const registration = await fetchBusinessTinRegistration(tin, controller.signal);
        if (controller.signal.aborted) return;

        registrationRef.current = registration;
        setOwnerName(registration.owner_name);
        setLicenses(registration.licenses);

        if (registration.licenses.length === 0) {
          if (registration.owner_name.trim()) {
            onFillRef.current({
              organizationName: registration.owner_name.trim(),
              registrationNumber: "",
              organizationAddress: "",
            });
          }
          setStatus("empty");
          return;
        }

        if (registration.licenses.length === 1) {
          await applyLicense(registration.licenses[0], controller.signal);
          return;
        }

        setStatus("select");
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;
        registrationRef.current = null;
        setLicenses([]);
        setOwnerName("");
        setSelectedLicenseNo(null);
        setIsFilling(false);
        setErrorMessage(error instanceof Error ? error.message : null);
        setStatus("error");
      }
    }, 400);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [applyLicense, enabled, tin]);

  const selectLicense = useCallback(
    (licenseNo: string) => {
      const license = licenses.find((item) => item.license_no === licenseNo);
      if (!license) return;
      if (license.license_no === selectedLicenseNo && !isFilling) return;
      void applyLicense(license);
    },
    [applyLicense, isFilling, licenses, selectedLicenseNo],
  );

  return {
    status,
    licenses,
    ownerName,
    selectedLicenseNo,
    isFilling,
    errorMessage,
    selectLicense,
  };
}
