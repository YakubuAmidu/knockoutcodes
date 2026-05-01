import mongoose from "mongoose";

const AbuseBlockSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "ip:1.2.3.4" or "email:test@x.com"
    reason: { type: String, default: "abuse" },
    expiresAt: { type: Date, required: true },
    hits: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// TTL index: Mongo will auto-delete expired blocks
AbuseBlockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("AbuseBlock", AbuseBlockSchema);
