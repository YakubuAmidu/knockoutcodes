import dotenv from "dotenv";
import http from "http";
import connectDB from "./config/db.js";
import { startEmailCampaignScheduler } from "./services/emailCampaignScheduler.js";

dotenv.config({ path: ".env.server" });

// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 5000;

let server;

async function startServer() {
  try {
    const { default: app } = await import("./app.js");

    await connectDB();

    server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`KnockoutCodes API running on http://localhost:${PORT}`);
      startEmailCampaignScheduler();
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    // eslint-disable-next-line no-undef
    process.exit(1);
  }
}

function shutdown(reason, err) {
  console.error(`[SERVER] ${reason}`, err);

  if (server) {
    server.close(() => {
      // eslint-disable-next-line no-undef
      process.exit(1);
    });

    // eslint-disable-next-line no-undef
    setTimeout(() => process.exit(1), 10000).unref();
  } else {
    // eslint-disable-next-line no-undef
    process.exit(1);
  }
}

// eslint-disable-next-line no-undef
process.on("unhandledRejection", (err) => shutdown("Unhandled rejection", err));
// eslint-disable-next-line no-undef
process.on("uncaughtException", (err) => shutdown("Uncaught exception", err));

startServer();