import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  REALTIME_NAMESPACE,
  RealtimeEvents,
  type RealtimeEntityRef,
  type RealtimeSessionReady,
  type VehicleLocationSnapshot,
} from "@smart-dispatch/types";
import { getAccessToken } from "@/lib/auth-session";
import { fetchVehicleLocation } from "@/lib/vehicle-location-api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const LIVE_THRESHOLD_MS = 2 * 60 * 1000;

export function isVehicleLocationLive(recordedAt: string | null | undefined) {
  if (!recordedAt) return false;
  const recordedMs = new Date(recordedAt).getTime();
  if (Number.isNaN(recordedMs)) return false;
  return Date.now() - recordedMs <= LIVE_THRESHOLD_MS;
}

function vehicleEntity(vehicleId: string): RealtimeEntityRef {
  return { entity_type: "vehicle", entity_id: vehicleId };
}

export function useVehicleLocation(vehicleId: string, enabled = true) {
  const [location, setLocation] = useState<VehicleLocationSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !vehicleId) {
      setLoading(false);
      return;
    }

    let active = true;
    let socket: Socket | null = null;

    async function connect() {
      setLoading(true);
      setError(null);

      try {
        const initial = await fetchVehicleLocation(vehicleId);
        if (active) {
          setLocation(initial);
        }

        const token = getAccessToken();
        if (!token) {
          if (active) {
            setError("Sign in to view live vehicle tracking.");
          }
          return;
        }

        socket = io(`${API_URL}${REALTIME_NAMESPACE}`, {
          auth: { token },
          transports: ["websocket"],
        });

        socket.on("connect", () => {
          if (active) setConnected(true);
        });

        socket.on(RealtimeEvents.SessionReady, (data: RealtimeSessionReady) => {
          if (!active || !data.capabilities.location_subscribe) return;
          socket?.emit(RealtimeEvents.LocationSubscribe, vehicleEntity(vehicleId));
        });

        socket.on("disconnect", () => {
          if (active) setConnected(false);
        });

        socket.on(RealtimeEvents.LocationSnapshot, (data: VehicleLocationSnapshot | null) => {
          if (active) setLocation(data);
        });

        socket.on(RealtimeEvents.LocationChanged, (data: VehicleLocationSnapshot) => {
          if (active) setLocation(data);
        });

        socket.on(RealtimeEvents.SessionError, (message: string) => {
          if (active) setError(message);
        });

        socket.on("connect_error", (connectError) => {
          if (active) {
            setError(connectError.message || "Unable to connect to live tracking.");
          }
        });
      } catch (connectError) {
        if (active) {
          setError(
            connectError instanceof Error
              ? connectError.message
              : "Failed to load vehicle location.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void connect();

    return () => {
      active = false;
      socket?.disconnect();
    };
  }, [vehicleId, enabled]);

  return {
    location,
    connected,
    loading,
    error,
    isLive: isVehicleLocationLive(location?.recorded_at),
  };
}
