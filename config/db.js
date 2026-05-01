import mongoose from "mongoose";

async function connectDB() {
  // eslint-disable-next-line no-undef
  const uri = process.env.MONGO_URI;

  if (!uri) {
    const msg = "[DB] MONGO_URI is missing.";
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg);
    }
    console.warn(`${msg} Skipping DB connection in non-production.`);
    return;
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    // eslint-disable-next-line no-undef
    autoIndex: process.env.NODE_ENV !== "production",
    serverSelectionTimeoutMS: 10000,
  });

  console.log(`[DB] MongoDB connected: ${mongoose.connection.host}`);
}

export default connectDB;