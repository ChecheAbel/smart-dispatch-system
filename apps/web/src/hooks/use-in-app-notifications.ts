"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  RealtimeEvents,
  REALTIME_NAMESPACE,
  type InAppNotification,
} from "@smart-dispatch/types";
import { apiClient } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-session";
import { getRealtimeServerUrl } from "@/lib/realtime-url";
import { showNotificationToast } from "@/lib/toast";
import { useWebPush } from "./use-web-push";

function playNotificationChime() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: 880Hz (A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tone 2: 1174.66Hz (D6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1174.66, now + 0.12);
    gain2.gain.setValueAtTime(0.09, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.35);
  } catch {
    // Audio autoplay restrictions or unsupported
  }
}

export function useInAppNotifications() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const socketRef = useRef<Socket | null>(null);

  const token = typeof window !== "undefined" ? getAccessToken() : null;
  const webPush = useWebPush(token);

  const fetchNotifications = useCallback(async () => {
    const currentToken = getAccessToken();
    if (!currentToken) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { notifications: InAppNotification[]; unreadCount: number };
      }>("/api/user-notifications?limit=30");

      if (response.data.success && response.data.data) {
        setNotifications(response.data.data.notifications.slice(0, 30));
        setUnreadCount(response.data.data.unreadCount);
      }
    } catch (err) {
      console.warn("[Notifications] Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch initial notifications
  useEffect(() => {
    let cancelled = false;
    void fetchNotifications().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [fetchNotifications]);

  // Connect to Socket.IO for real-time updates
  useEffect(() => {
    const currentToken = getAccessToken();
    if (!currentToken) {
      return;
    }

    const socketUrl = `${getRealtimeServerUrl()}${REALTIME_NAMESPACE}`;
    const socket = io(socketUrl, {
      auth: { token: currentToken },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on(RealtimeEvents.NotificationReceived, (incoming: InAppNotification) => {
      // Play soft notification sound
      playNotificationChime();

      // Show in-tab toast banner
      showNotificationToast({
        title: incoming.title,
        description: incoming.message,
        actionUrl: incoming.action_url,
      });

      // Show native OS desktop notification overlay (pops up over open applications)
      webPush.showDesktopNotification(incoming.title, {
        body: incoming.message,
        actionUrl: incoming.action_url || undefined,
      });

      // Update state: prepend and increment unread count (capped to 30 items)
      setNotifications((prev) => {
        if (prev.some((n) => n.id === incoming.id)) {
          return prev;
        }
        return [incoming, ...prev].slice(0, 30);
      });
      setUnreadCount((count) => count + 1);
    });

    socket.on(RealtimeEvents.NotificationRead, (data: { id: string }) => {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === data.id
            ? { ...item, read_at: item.read_at || new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    });

    socket.on(RealtimeEvents.NotificationReadAll, () => {
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })),
      );
      setUnreadCount(0);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [webPush]);

  const markAsRead = useCallback(async (id: string) => {
    const currentToken = getAccessToken();
    if (!currentToken) return;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, read_at: new Date().toISOString() } : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      await apiClient.patch(`/api/user-notifications/${id}/read`, {});
    } catch (err) {
      console.warn("[Notifications] Failed to mark as read:", err);
      // Revert if needed
      void fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    const currentToken = getAccessToken();
    if (!currentToken) return;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })),
    );
    setUnreadCount(0);

    try {
      await apiClient.post("/api/user-notifications/read-all", {});
    } catch (err) {
      console.warn("[Notifications] Failed to mark all as read:", err);
      void fetchNotifications();
    }
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
    webPush,
  };
}
