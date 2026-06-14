// config/socket.js

let ioInstance = null;

// eslint-disable-next-line no-undef
const isProd = process.env.NODE_ENV === "production";
const logSocket = (...args) => {
  if (!isProd) console.log(...args);
};

export const SYSTEM_ROOM = "system";

export const initSocket = (io) => {
  if (!io) throw new Error("Socket.io instance is required.");
  ioInstance = io;
};

export const getIO = () => {
  if (!ioInstance) throw new Error("Socket.io not initialized.");
  return ioInstance;
};

const normalizeUserId = (payload) => {
  if (!payload) return null;
  if (typeof payload === "string") return payload.trim() || null;
  if (typeof payload === "object") return payload.userId || payload.id || payload._id || null;
  return null;
};

export const emitToUser = (userId, eventName, payload = {}) => {
  if (!ioInstance || !userId || !eventName) return;
  ioInstance.to(`user:${String(userId)}`).emit(eventName, {
    ...payload,
    emittedAt: new Date().toISOString(),
  });
};

export const emitSystemEvent = (eventName, payload = {}) => {
  if (!ioInstance || !eventName) return;

  const data = { ...payload, emittedAt: new Date().toISOString() };

  ioInstance.to(SYSTEM_ROOM).emit(eventName, data);
  ioInstance.emit(eventName, data);
};

export const emitMaintenanceUpdate = (payload = {}) => {
  emitSystemEvent("system:maintenance-updated", payload);
};

export const registerSocketHandlers = (io) => {
  if (!io) throw new Error("Socket.io instance is required for handlers.");

  io.on("connection", (socket) => {
    logSocket("Socket connected:", socket.id);

    const joinUserRoom = (payload) => {
      const userId = normalizeUserId(payload);
      if (!userId) return;

      const room = `user:${String(userId)}`;
      socket.join(room);
      logSocket(`Socket ${socket.id} joined ${room}`);
    };

    const leaveUserRoom = (payload) => {
      const userId = normalizeUserId(payload);
      if (!userId) return;

      const room = `user:${String(userId)}`;
      socket.leave(room);
      logSocket(`Socket ${socket.id} left ${room}`);
    };

    const joinSystemRoom = () => {
      socket.join(SYSTEM_ROOM);
      logSocket(`Socket ${socket.id} joined ${SYSTEM_ROOM}`);
    };

    const leaveSystemRoom = () => {
      socket.leave(SYSTEM_ROOM);
      logSocket(`Socket ${socket.id} left ${SYSTEM_ROOM}`);
    };

    socket.on("user:join", joinUserRoom);
    socket.on("join:user", joinUserRoom);
    socket.on("messages:join", joinUserRoom);
    socket.on("ticket:join-user", joinUserRoom);

    socket.on("user:leave", leaveUserRoom);
    socket.on("leave:user", leaveUserRoom);

    socket.on("system:join", joinSystemRoom);
    socket.on("join:system", joinSystemRoom);

    socket.on("system:leave", leaveSystemRoom);
    socket.on("leave:system", leaveSystemRoom);

    socket.on("disconnect", (reason) => {
      logSocket("Socket disconnected:", socket.id, reason);
    });
  });
};
