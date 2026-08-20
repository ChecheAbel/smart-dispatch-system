import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  REALTIME_NAMESPACE,
  RealtimeEvents,
  type RealtimeEntityRef,
  type RealtimeSessionReady,
  type VehicleGeofenceStatus,
  type VehicleGeofenceStatusPayload,
  type VehicleLocationSnapshot,
} from "@smart-dispatch/types";
import { getAccessToken } from "@/lib/auth-session";
import { fetchVehicleLocation } from "@/lib/vehicle-location-api";
import { getRealtimeServerUrl } from "@/lib/realtime-url";

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
  const [geofenceStatuses, setGeofenceStatuses] = useState<VehicleGeofenceStatus[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !vehicleId) {
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

        socket = io(`${getRealtimeServerUrl()}${REALTIME_NAMESPACE}`, {
          auth: { token },
          transports: ["websocket"],
        });

        socket.on("connect", () => {
          if (active) {
            setConnected(true);
            setError(null);
          }
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

        socket.on(RealtimeEvents.GeofenceStatus, (data: VehicleGeofenceStatusPayload) => {
          if (!active || data.vehicle_id !== vehicleId) return;
          setGeofenceStatuses(data.statuses);
        });

        socket.on(RealtimeEvents.SessionError, (message: string) => {
          if (process.env.NODE_ENV !== "production") {
            console.error("Live tracking session error:", message);
          }
          if (active) setError("Live tracking session unavailable.");
        });

        socket.on("connect_error", (connectError) => {
          if (process.env.NODE_ENV !== "production") {
            console.error("Live tracking connection error:", connectError);
          }
          if (active) {
            setError("Unable to connect to live tracking.");
          }
        });
      } catch (connectError) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load vehicle tracking:", connectError);
        }
        if (active) {
          setError("Unable to load live vehicle tracking.");
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
    geofenceStatuses,
    connected,
    loading: enabled && Boolean(vehicleId) ? loading : false,
    error,
    isLive: isVehicleLocationLive(location?.recorded_at),
  };
}
