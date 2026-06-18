// src/utils/socket.js

import { io } from "socket.io-client";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "https://knockoutcodes.onrender.com/api/v1";

const SOCKET_URL =
  import.meta.env.VITE_API_ORIGIN ||
  import.meta.env.VITE_SERVER_URL ||
  API_BASE.replace(/\/api\/v1\/?$/, "");

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

let joinedUserId = null;
let joinedSystemRoom = false;

export function connectSocket() {
  if (!socket.connected) {
    socket.connect();
  }
}

export function connectUserSocket(userId) {
  if (!userId) return;

  const normalizedUserId = String(userId).trim();
  if (!normalizedUserId) return;

  socket.auth = {
    userId: normalizedUserId,
  };

  connectSocket();

  const join = () => {
    if (joinedUserId !== normalizedUserId) {
      socket.emit("user:join", normalizedUserId);
      joinedUserId = normalizedUserId;
    }
  };

  if (socket.connected) {
    join();
  } else {
    socket.once("connect", join);
  }
}

export function joinSystemSocketRoom() {
  connectSocket();

  const join = () => {
    if (!joinedSystemRoom) {
      socket.emit("system:join");
      joinedSystemRoom = true;
    }
  };

  if (socket.connected) {
    join();
  } else {
    socket.once("connect", join);
  }
}

export function leaveSystemSocketRoom() {
  if (socket.connected && joinedSystemRoom) {
    socket.emit("system:leave");
  }

  joinedSystemRoom = false;
}

export function disconnectUserSocket() {
  if (socket.connected && joinedUserId) {
    socket.emit("user:leave", joinedUserId);
  }

  joinedUserId = null;
}

export function disconnectSocket() {
  if (socket.connected && joinedSystemRoom) {
    socket.emit("system:leave");
  }

  if (socket.connected && joinedUserId) {
    socket.emit("user:leave", joinedUserId);
  }

  joinedUserId = null;
  joinedSystemRoom = false;

  socket.off("connect");

  if (socket.connected) {
    socket.disconnect();
  }
}
