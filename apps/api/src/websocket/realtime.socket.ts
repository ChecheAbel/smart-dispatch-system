import type { Namespace, Socket } from "socket.io";
import {
  RealtimeEvents,
  type RealtimeEntityRef,
  type RealtimeLocationPublishInput,
  type RealtimeSessionReady,
  type VehicleLocationSnapshot,
} from "@smart-dispatch/types";
import { toPublicRideRequest } from "../mappers/ride-request.mapper";
import { toPublicVehicleLocationSnapshot } from "../mappers/vehicle-location.mapper";
import { listRideRequestsForDriver } from "../models/ride-request.model";
import { userHasPermission } from "../models/permission.model";
import {
  findAssignedVehicleForDriver,
  findVehicleLocationByVehicleId,
  upsertVehicleLocation,
} from "../models/vehicle-location.model";
import { findVehicleById } from "../models/vehicle.model";
import { authenticateSocketUser } from "./socket-auth";
import { getSocketIo } from "./socket-io";

export { REALTIME_NAMESPACE } from "@smart-dispatch/types";

const MAX_UPCOMING_TRIPS = 100;
const TRIP_MAP_OPTIONS = { includeAllTranslations: true as const };

type RideRequestEntity = Parameters<typeof toPublicRideRequest>[0];

type RealtimeSocket = Socket<
  RealtimeClientEvents,
  RealtimeServerEvents,
  Record<string, never>,
  RealtimeSocketData
>;

type RealtimeSocketData = {
  userId: string;
  assignedVehicleId: string | null;
  canPublishLocation: boolean;
  canSubscribeLocation: boolean;
  canAccessTrips: boolean;
};

type RealtimeClientEvents = {
  [RealtimeEvents.SessionPing]: () => void;
  [RealtimeEvents.TripsRefresh]: () => void;
  [RealtimeEvents.LocationPublish]: (data: RealtimeLocationPublishInput) => void;
  [RealtimeEvents.LocationSubscribe]: (data: RealtimeEntityRef) => void;
  [RealtimeEvents.LocationUnsubscribe]: (data: RealtimeEntityRef) => void;
};

type RealtimeServerEvents = {
  [RealtimeEvents.SessionReady]: (data: RealtimeSessionReady) => void;
  [RealtimeEvents.SessionPong]: () => void;
  [RealtimeEvents.SessionError]: (message: string) => void;
  [RealtimeEvents.TripsSnapshot]: (data: ReturnType<typeof toPublicRideRequest>[]) => void;
  [RealtimeEvents.TripsAdded]: (data: ReturnType<typeof toPublicRideRequest>) => void;
  [RealtimeEvents.TripsUpdated]: (data: ReturnType<typeof toPublicRideRequest>) => void;
  [RealtimeEvents.TripsRemoved]: (data: { id: string }) => void;
  [RealtimeEvents.LocationSnapshot]: (data: VehicleLocationSnapshot | null) => void;
  [RealtimeEvents.LocationChanged]: (data: VehicleLocationSnapshot) => void;
  [RealtimeEvents.LocationSubscribed]: (data: RealtimeEntityRef) => void;
  [RealtimeEvents.LocationUnsubscribed]: (data: RealtimeEntityRef) => void;
};

let realtimeNamespace: Namespace<
  RealtimeClientEvents,
  RealtimeServerEvents,
  Record<string, never>,
  RealtimeSocketData
> | null = null;

const userRoom = (userId: string) => `user:${userId}`;
const entityRoom = (entity: RealtimeEntityRef) => `entity:${entity.entity_type}:${entity.entity_id}`;

function vehicleEntity(vehicleId: string): RealtimeEntityRef {
  return { entity_type: "vehicle", entity_id: vehicleId };
}

async function sendTripsSnapshot(socket: RealtimeSocket, userId: string) {
  const trips = await listRideRequestsForDriver(
    { driverUserId: userId, upcoming: true },
    0,
    MAX_UPCOMING_TRIPS,
  );

  socket.emit(
    RealtimeEvents.TripsSnapshot,
    trips.map((trip) => toPublicRideRequest(trip, TRIP_MAP_OPTIONS)),
  );
}

async function sendLocationSnapshot(socket: RealtimeSocket, entity: RealtimeEntityRef) {
  if (entity.entity_type !== "vehicle") {
    socket.emit(RealtimeEvents.LocationSnapshot, null);
    return;
  }

  const snapshot = await findVehicleLocationByVehicleId(entity.entity_id);
  socket.emit(
    RealtimeEvents.LocationSnapshot,
    snapshot ? toPublicVehicleLocationSnapshot(snapshot) : null,
  );
}

async function resolveSessionCapabilities(userId: string) {
  const [canPublishLocation, canSubscribeLocation, canAccessTrips, assignedVehicle] =
    await Promise.all([
      userHasPermission(userId, "driver.location"),
      userHasPermission(userId, "vehicles.read"),
      userHasPermission(userId, "driver.upcoming"),
      findAssignedVehicleForDriver(userId),
    ]);

  return {
    canPublishLocation,
    canSubscribeLocation,
    canAccessTrips,
    assignedVehicleId: assignedVehicle?.id ?? null,
  };
}

function registerNamespace(io: ReturnType<typeof getSocketIo>) {
  const namespace = io.of("/api/ws");
  realtimeNamespace = namespace;

  namespace.use(async (socket, next) => {
    try {
      await authenticateSocketUser(socket);
      next();
    } catch (error) {
      next(new Error(error instanceof Error ? error.message : "Unauthorized."));
    }
  });

  namespace.on("connection", (socket: RealtimeSocket) => {
    void (async () => {
      const userId = socket.data.userId;
      const capabilities = await resolveSessionCapabilities(userId);

      if (
        !capabilities.canPublishLocation &&
        !capabilities.canSubscribeLocation &&
        !capabilities.canAccessTrips
      ) {
        socket.emit(RealtimeEvents.SessionError, "Forbidden.");
        socket.disconnect(true);
        return;
      }

      socket.data.canPublishLocation = capabilities.canPublishLocation;
      socket.data.canSubscribeLocation = capabilities.canSubscribeLocation;
      socket.data.canAccessTrips = capabilities.canAccessTrips;
      socket.data.assignedVehicleId = capabilities.assignedVehicleId;

      if (capabilities.canAccessTrips) {
        await socket.join(userRoom(userId));
        await sendTripsSnapshot(socket, userId);
      }

      if (capabilities.canPublishLocation && capabilities.assignedVehicleId) {
        await socket.join(entityRoom(vehicleEntity(capabilities.assignedVehicleId)));
      }

      console.log(`→ Socket.IO /api/ws (${userId})`);

      socket.on(RealtimeEvents.SessionPing, () => {
        socket.emit(RealtimeEvents.SessionPong);
      });

      socket.on(RealtimeEvents.TripsRefresh, () => {
        if (!socket.data.canAccessTrips) {
          socket.emit(RealtimeEvents.SessionError, "Trips access denied.");
          return;
        }

        void sendTripsSnapshot(socket, userId);
      });

      socket.on(RealtimeEvents.LocationSubscribe, (data) => {
        void (async () => {
          try {
            if (!socket.data.canSubscribeLocation) {
              socket.emit(RealtimeEvents.SessionError, "Location subscribe access denied.");
              return;
            }

            const entity = normalizeEntityRef(data);
            if (!entity) {
              socket.emit(RealtimeEvents.SessionError, "entity_type and entity_id are required.");
              return;
            }

            if (!(await entityExists(entity))) {
              socket.emit(RealtimeEvents.SessionError, "Entity not found.");
              return;
            }

            await socket.join(entityRoom(entity));
            socket.emit(RealtimeEvents.LocationSubscribed, entity);
            await sendLocationSnapshot(socket, entity);
          } catch (error) {
            socket.emit(
              RealtimeEvents.SessionError,
              error instanceof Error ? error.message : "Failed to subscribe.",
            );
          }
        })();
      });

      socket.on(RealtimeEvents.LocationUnsubscribe, (data) => {
        const entity = normalizeEntityRef(data);
        if (!entity) {
          return;
        }

        void socket.leave(entityRoom(entity));
        socket.emit(RealtimeEvents.LocationUnsubscribed, entity);
      });

      socket.on(RealtimeEvents.LocationPublish, (data) => {
        void (async () => {
          try {
            if (!socket.data.canPublishLocation || !socket.data.assignedVehicleId) {
              socket.emit(RealtimeEvents.SessionError, "Location publish access denied.");
              return;
            }

            const vehicleId = socket.data.assignedVehicleId;
            const recordedAt = data.recorded_at ? new Date(data.recorded_at) : new Date();
            if (Number.isNaN(recordedAt.getTime())) {
              socket.emit(RealtimeEvents.SessionError, "Invalid recorded_at.");
              return;
            }

            const snapshot = await upsertVehicleLocation({
              vehicleId,
              driverUserId: userId,
              latitude: data.latitude,
              longitude: data.longitude,
              heading: data.heading ?? null,
              speedKmh: data.speed_kmh ?? null,
              accuracyM: data.accuracy_m ?? null,
              recordedAt,
            });

            const payload = toPublicVehicleLocationSnapshot(snapshot);
            namespace.to(entityRoom(vehicleEntity(vehicleId))).emit(RealtimeEvents.LocationChanged, payload);
          } catch (error) {
            socket.emit(
              RealtimeEvents.SessionError,
              error instanceof Error ? error.message : "Failed to publish location.",
            );
          }
        })();
      });

      const readyPayload: RealtimeSessionReady = {
        user_id: userId,
        assigned_entity: capabilities.assignedVehicleId
          ? vehicleEntity(capabilities.assignedVehicleId)
          : null,
        capabilities: {
          location_publish: Boolean(
            capabilities.canPublishLocation && capabilities.assignedVehicleId,
          ),
          location_subscribe: capabilities.canSubscribeLocation,
          trips: capabilities.canAccessTrips,
        },
      };

      socket.emit(RealtimeEvents.SessionReady, readyPayload);
    })();
  });
}

function normalizeEntityRef(data: Partial<RealtimeEntityRef> | undefined) {
  const entityType = data?.entity_type;
  const entityId = data?.entity_id?.trim();

  if (entityType !== "vehicle" || !entityId) {
    return null;
  }

  return { entity_type: entityType, entity_id: entityId } satisfies RealtimeEntityRef;
}

async function entityExists(entity: RealtimeEntityRef) {
  if (entity.entity_type === "vehicle") {
    const vehicle = await findVehicleById(entity.entity_id);
    return Boolean(vehicle);
  }

  return false;
}

export function broadcastRealtimeTripEvent(
  driverUserId: string,
  event:
    | { type: "added" | "updated"; data: RideRequestEntity }
    | { type: "removed"; data: { id: string } },
) {
  if (!realtimeNamespace) {
    return;
  }

  if (event.type === "removed") {
    realtimeNamespace.to(userRoom(driverUserId)).emit(RealtimeEvents.TripsRemoved, event.data);
    return;
  }

  const payload = toPublicRideRequest(event.data, TRIP_MAP_OPTIONS);
  realtimeNamespace
    .to(userRoom(driverUserId))
    .emit(event.type === "added" ? RealtimeEvents.TripsAdded : RealtimeEvents.TripsUpdated, payload);
}

export function registerRealtimeSocket() {
  registerNamespace(getSocketIo());
}
