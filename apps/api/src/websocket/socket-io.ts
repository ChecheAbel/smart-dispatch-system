import type { Server as HttpServer } from "http";
import { Server } from "socket.io";

let io: Server | null = null;

export function initSocketIo(server: HttpServer) {
  if (io) {
    return io;
  }

  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  return io;
}

export function getSocketIo() {
  if (!io) {
    throw new Error("Socket.IO has not been initialized.");
  }

  return io;
}
