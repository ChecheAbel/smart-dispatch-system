"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";

export type WebPushPermissionStatus = "default" | "granted" | "denied" | "unsupported";

export function useWebPush(accessToken?: string | null) {
  const [permission, setPermission] = useState<WebPushPermissionStatus>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);

    if (!supported) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission as WebPushPermissionStatus);

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        setSwRegistration(registration);
      })
      .catch((err) => {
        console.warn("[WebPush] Service Worker registration failed:", err);
      });
  }, []);

  const registerTokenWithBackend = useCallback(
    async (tokenString: string) => {
      if (!accessToken) {
        return;
      }

      try {
        await axios.post(
          "/api/devices/tokens",
          {
            token: tokenString,
            platform: "web",
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
      } catch (error) {
        // Non-critical: token registration might fail if backend push service isn't active
        console.warn("[WebPush] Could not register token with backend:", error);
      }
    },
    [accessToken],
  );

  const requestPermission = useCallback(async () => {
    if (!isSupported || typeof window === "undefined") {
      return "unsupported";
    }

    try {
      const result = await Notification.requestPermission();
      const status = result as WebPushPermissionStatus;
      setPermission(status);

      if (status === "granted") {
        // Generate or retrieve a persistent web client ID for this browser
        let webToken = localStorage.getItem("smart_dispatch_web_push_token");
        if (!webToken) {
          webToken = `web_${crypto.randomUUID()}`;
          localStorage.setItem("smart_dispatch_web_push_token", webToken);
        }

        await registerTokenWithBackend(webToken);
      }

      return status;
    } catch (err) {
      console.warn("[WebPush] Notification permission request error:", err);
      return "denied";
    }
  }, [isSupported, registerTokenWithBackend]);

  const showDesktopNotification = useCallback(
    (title: string, options?: { body?: string; actionUrl?: string }) => {
      if (typeof window === "undefined" || permission !== "granted") {
        return;
      }

      const body = options?.body || "";
      const actionUrl = options?.actionUrl || "/admin";

      if (swRegistration && "showNotification" in swRegistration) {
        swRegistration.showNotification(title, {
          body,
          icon: "/logo.webp",
          badge: "/logo.webp",
          data: { action_url: actionUrl },
        });
      } else if ("Notification" in window) {
        const notif = new Notification(title, {
          body,
          icon: "/logo.webp",
        });
        notif.onclick = () => {
          window.focus();
          if (actionUrl) {
            window.location.href = actionUrl;
          }
        };
      }
    },
    [permission, swRegistration],
  );

  return {
    permission,
    isSupported,
    requestPermission,
    showDesktopNotification,
  };
}
