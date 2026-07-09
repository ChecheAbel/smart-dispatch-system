import type { Server as HttpServer } from "http";
import { Server, type Namespace, type Socket } from "socket.io";
import { toPublicRideRequest } from "../mappers/ride-request.mapper";
import { listRideRequestsForDriver } from "../models/ride-request.model";
import { userHasPermission } from "../models/permission.model";
import { getUserFromAccessToken } from "../services/auth.service";

export const DRIVER_UPCOMING_TRIPS_SOCKET_NAMESPACE = "/api/ride-requests/driver/upcoming";

const MAX_UPCOMING_TRIPS = 100;
const MAP_OPTIONS = { includeAllTranslations: true as const };

type RideRequestEntity = Parameters<typeof toPublicRideRequest>[0];

type DriverSocket = Socket<
  DriverClientEvents,
  DriverServerEvents,
  Record<string, never>,
  { userId: string }
>;

type DriverClientEvents = {
  ping: () => void;
  refresh: () => void;
};

type DriverServerEvents = {
  snapshot: (data: ReturnType<typeof toPublicRideRequest>[]) => void;
  trip_added: (data: ReturnType<typeof toPublicRideRequest>) => void;
  trip_updated: (data: ReturnType<typeof toPublicRideRequest>) => void;
  trip_removed: (data: { id: string }) => void;
  pong: () => void;
  error: (error: string) => void;
};

let driverUpcomingNamespace: Namespace<
  DriverClientEvents,
  DriverServerEvents,
  Record<string, never>,
  { userId: string }
> | null = null;

function getAccessToken(socket: Socket) {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.trim();
  }

  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    return token || null;
  }

  return null;
}

async function sendSnapshot(socket: DriverSocket, userId: string) {
  const trips = await listRideRequestsForDriver(
    { driverUserId: userId, upcoming: true },
    0,
    MAX_UPCOMING_TRIPS,
  );

  socket.emit(
    "snapshot",
    trips.map((trip) => toPublicRideRequest(trip, MAP_OPTIONS)),
  );
}

function registerNamespace(io: Server) {
  const namespace = io.of(DRIVER_UPCOMING_TRIPS_SOCKET_NAMESPACE);
  driverUpcomingNamespace = namespace;

  namespace.use(async (socket, next) => {
    try {
      const token = getAccessToken(socket);
      if (!token) {
        next(new Error("Missing or invalid authorization."));
        return;
      }

      const user = await getUserFromAccessToken(token);
      const allowed = await userHasPermission(user.id, "driver.upcoming");
      if (!allowed) {
        next(new Error("Forbidden."));
        return;
      }

      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error("Unauthorized."));
    }
  });

  namespace.on("connection", (socket: DriverSocket) => {
    const userId = socket.data.userId;
    void socket.join(userId);

    console.log(`→ Socket.IO ${DRIVER_UPCOMING_TRIPS_SOCKET_NAMESPACE} (${userId})`);

    socket.on("ping", () => {
      socket.emit("pong");
    });

    socket.on("refresh", () => {
      void sendSnapshot(socket, userId);
    });

    void sendSnapshot(socket, userId);
  });
}

export function broadcastDriverUpcomingTripEvent(
  driverUserId: string,
  event:
    | { type: "trip_added" | "trip_updated"; data: RideRequestEntity }
    | { type: "trip_removed"; data: { id: string } },
) {
  if (!driverUpcomingNamespace) {
    return;
  }

  if (event.type === "trip_removed") {
    driverUpcomingNamespace.to(driverUserId).emit("trip_removed", event.data);
    return;
  }

  driverUpcomingNamespace.to(driverUserId).emit(event.type, toPublicRideRequest(event.data, MAP_OPTIONS));
}

export function registerDriverUpcomingTripsSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  registerNamespace(io);
}
