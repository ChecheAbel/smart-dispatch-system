import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  REALTIME_NAMESPACE,
  RealtimeEvents,
  type RealtimeEntityRef,
  type RealtimeSessionReady,
  type VehicleLocationSnapshot,
} from "@smart-dispatch/types";
import { getAccessToken } from "@/lib/auth-session";
import { getRealtimeServerUrl } from "@/lib/realtime-url";
import { isVehicleLocationLive } from "@/hooks/use-vehicle-location";

function vehicleEntity(vehicleId: string): RealtimeEntityRef {
  return { entity_type: "vehicle", entity_id: vehicleId };
}

export function useDispatchVehicleLocations(vehicleIds: string[], enabled = true) {
  const [locations, setLocations] = useState<Record<string, VehicleLocationSnapshot>>({});
  const [connected, setConnected] = useState(false);
  const idsKey = useMemo(() => [...new Set(vehicleIds)].sort().join(","), [vehicleIds]);
  const subscribedRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      return;
    }

    const ids = idsKey ? idsKey.split(",") : [];
    let active = true;

    const socket = io(`${getRealtimeServerUrl()}${REALTIME_NAMESPACE}`, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    function syncSubscriptions() {
      const next = new Set(ids);
      for (const id of subscribedRef.current) {
        if (!next.has(id)) {
          socket.emit(RealtimeEvents.LocationUnsubscribe, vehicleEntity(id));
        }
      }
      for (const id of next) {
        if (!subscribedRef.current.has(id)) {
          socket.emit(RealtimeEvents.LocationSubscribe, vehicleEntity(id));
        }
      }
      subscribedRef.current = next;
    }

    socket.on("connect", () => {
      if (active) {
        setConnected(true);
      }
    });

    socket.on("disconnect", () => {
      if (active) {
        setConnected(false);
      }
      subscribedRef.current = new Set();
    });

    socket.on(RealtimeEvents.SessionReady, (data: RealtimeSessionReady) => {
      if (!active || !data.capabilities.location_subscribe) {
        return;
      }
      subscribedRef.current = new Set();
      syncSubscriptions();
    });

    socket.on(RealtimeEvents.LocationSnapshot, (data: VehicleLocationSnapshot | null) => {
      if (!active || !data?.vehicle_id) {
        return;
      }
      setLocations((current) => ({ ...current, [data.vehicle_id]: data }));
    });

    socket.on(RealtimeEvents.LocationChanged, (data: VehicleLocationSnapshot) => {
      if (!active || !data?.vehicle_id) {
        return;
      }
      setLocations((current) => ({ ...current, [data.vehicle_id]: data }));
    });

    return () => {
      active = false;
      for (const id of subscribedRef.current) {
        socket.emit(RealtimeEvents.LocationUnsubscribe, vehicleEntity(id));
      }
      subscribedRef.current = new Set();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, idsKey]);

  const liveByVehicle = useMemo(() => {
    const live: Record<string, boolean> = {};
    for (const [id, snapshot] of Object.entries(locations)) {
      live[id] = isVehicleLocationLive(snapshot.recorded_at);
    }
    return live;
  }, [locations]);

  return { locations, liveByVehicle, connected };
}
