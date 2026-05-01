// models/Plan.js
import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // "Basic", "Standard", "Premium"
    slug: { type: String, required: true, unique: true }, // "basic", "standard", "premium"
    stripePriceId: { type: String, required: true },      // price_xxx from Stripe
    price: { type: Number, required: true },              // 19, 49, 99 (for reference)
    currency: { type: String, default: 'usd' },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Plan', planSchema);
