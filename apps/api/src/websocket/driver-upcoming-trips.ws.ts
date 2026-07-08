import type { IncomingMessage, Server } from "http";
import { URL } from "url";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import { toPublicRideRequest } from "../mappers/ride-request.mapper";
import { listRideRequestsForDriver } from "../models/ride-request.model";
import { userHasPermission } from "../models/permission.model";
import { getUserFromAccessToken } from "../services/auth.service";

export const DRIVER_UPCOMING_TRIPS_WS_PATH = "/api/ride-requests/driver/upcoming";

const MAX_UPCOMING_TRIPS = 100;
const MAP_OPTIONS = { includeAllTranslations: true as const };

type RideRequestEntity = Parameters<typeof toPublicRideRequest>[0];

type DriverConnection = {
  ws: WebSocket;
  userId: string;
};

type DriverUpcomingTripEvent =
  | { type: "snapshot"; data: ReturnType<typeof toPublicRideRequest>[] }
  | { type: "trip_added"; data: ReturnType<typeof toPublicRideRequest> }
  | { type: "trip_updated"; data: ReturnType<typeof toPublicRideRequest> }
  | { type: "trip_removed"; data: { id: string } }
  | { type: "pong" }
  | { type: "error"; error: string };

const connectionsByDriver = new Map<string, Set<DriverConnection>>();

function sendJson(ws: WebSocket, payload: DriverUpcomingTripEvent) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function addConnection(connection: DriverConnection) {
  const existing = connectionsByDriver.get(connection.userId) ?? new Set<DriverConnection>();
  existing.add(connection);
  connectionsByDriver.set(connection.userId, existing);
}

function removeConnection(connection: DriverConnection) {
  const existing = connectionsByDriver.get(connection.userId);
  if (!existing) {
    return;
  }

  existing.delete(connection);
  if (!existing.size) {
    connectionsByDriver.delete(connection.userId);
  }
}

async function sendSnapshot(connection: DriverConnection) {
  const trips = await listRideRequestsForDriver(
    { driverUserId: connection.userId, upcoming: true },
    0,
    MAX_UPCOMING_TRIPS,
  );

  sendJson(connection.ws, {
    type: "snapshot",
    data: trips.map((trip) => toPublicRideRequest(trip, MAP_OPTIONS)),
  });
}

async function handleClientMessage(connection: DriverConnection, raw: RawData) {
  let message: { type?: string };

  try {
    message = JSON.parse(raw.toString()) as { type?: string };
  } catch {
    sendJson(connection.ws, { type: "error", error: "Invalid JSON message." });
    return;
  }

  if (message.type === "ping") {
    sendJson(connection.ws, { type: "pong" });
    return;
  }

  if (message.type === "refresh") {
    await sendSnapshot(connection);
  }
}

function getAccessTokenFromRequest(request: IncomingMessage) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

async function handleConnection(ws: WebSocket, request: IncomingMessage) {
  try {
    const token = getAccessTokenFromRequest(request);

    if (!token) {
      ws.close(4401, "Missing or invalid authorization header.");
      return;
    }

    const user = await getUserFromAccessToken(token);
    const allowed = await userHasPermission(user.id, "driver.upcoming");

    if (!allowed) {
      ws.close(4403, "Forbidden.");
      return;
    }

    const connection: DriverConnection = {
      ws,
      userId: user.id,
    };

    addConnection(connection);

    ws.on("close", () => {
      removeConnection(connection);
    });

    ws.on("error", () => {
      removeConnection(connection);
    });

    ws.on("message", (raw) => {
      void handleClientMessage(connection, raw);
    });

    await sendSnapshot(connection);
  } catch {
    ws.close(4401, "Unauthorized.");
  }
}

export function broadcastDriverUpcomingTripEvent(
  driverUserId: string,
  event:
    | { type: "trip_added" | "trip_updated"; data: RideRequestEntity }
    | { type: "trip_removed"; data: { id: string } },
) {
  const connections = connectionsByDriver.get(driverUserId);
  if (!connections?.size) {
    return;
  }

  for (const connection of connections) {
    if (event.type === "trip_removed") {
      sendJson(connection.ws, event);
      continue;
    }

    sendJson(connection.ws, {
      type: event.type,
      data: toPublicRideRequest(event.data, MAP_OPTIONS),
    });
  }
}

export function registerDriverUpcomingTripsWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    if (!request.url) {
      socket.destroy();
      return;
    }

    const { pathname } = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
    if (pathname !== DRIVER_UPCOMING_TRIPS_WS_PATH) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      console.log(`→ WS ${DRIVER_UPCOMING_TRIPS_WS_PATH}`);
      void handleConnection(ws, request);
    });
  });
}
