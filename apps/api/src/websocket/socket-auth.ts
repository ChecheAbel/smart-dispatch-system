import type { Socket } from "socket.io";
import { getUserFromAccessToken } from "../services/auth.service";

export function normalizeBearerToken(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("Bearer ")) {
    return trimmed.slice("Bearer ".length).trim();
  }
  return trimmed;
}

export function getAccessTokenFromSocket(socket: Socket) {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) {
    return normalizeBearerToken(authToken) || null;
  }

  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.trim()) {
    return normalizeBearerToken(header) || null;
  }

  return null;
}

export async function authenticateSocketUser(socket: Socket) {
  const token = getAccessTokenFromSocket(socket);
  if (!token) {
    throw new Error("Missing or invalid authorization.");
  }

  const user = await getUserFromAccessToken(token);
  socket.data.userId = user.id;
  return user;
}
