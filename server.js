// server.js

import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import process from "node:process";
import { verifyMailTransport } from "./utils/mailer.js";

import connectDB from "./config/db.js";
import { startEmailCampaignScheduler } from "./services/emailCampaignScheduler.js";
import { initSocket, registerSocketHandlers } from "./config/socket.js";

dotenv.config({ path: ".env.server" });

const PORT = process.env.PORT || 5000;

let server;

function getAllowedOrigins() {
  return [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://silver-pasca-64a87c.netlify.app",
    "https://knockoutcodes.com",
    "https://www.knockoutcodes.com",
    ...(process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",")
          .map((origin) => origin.trim())
          .filter(Boolean)
      : []),
  ];
}

async function startServer() {
  try {
    const { default: app } = await import("./app.js");

    await connectDB();

    try {
      await verifyMailTransport();
      console.log("[MAIL] SMTP connection verified.");
    } catch (mailError) {
      console.error("[MAIL] SMTP verification failed:", mailError.message);
    }

    server = http.createServer(app);

    const allowedOrigins = getAllowedOrigins();

    const io = new Server(server, {
      cors: {
        origin(origin, callback) {
          if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
          }

          return callback(new Error(`Socket CORS blocked: ${origin}`));
        },
        credentials: true,
      },
      transports: ["websocket", "polling"],
      pingTimeout: 30000,
      pingInterval: 25000,
    });

    app.set("io", io);

    initSocket(io);
    registerSocketHandlers(io);

    server.listen(PORT, () => {
      if (process.env.NODE_ENV !== "production") {
        console.log(`KnockoutCodes API running on http://localhost:${PORT}`);
      }
      startEmailCampaignScheduler();
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

function shutdown(reason, err) {
  console.error(`[SERVER] ${reason}`, err);

  if (server) {
    server.close(() => {
      process.exit(1);
    });

    setTimeout(() => process.exit(1), 10000).unref();
  } else {
    process.exit(1);
  }
}

process.on("unhandledRejection", (err) => shutdown("Unhandled rejection", err));

process.on("uncaughtException", (err) => shutdown("Uncaught exception", err));

startServer();
