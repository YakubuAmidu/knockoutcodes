import dotenv from "dotenv";
import mongoose from "mongoose";
import Membership from "../models/MembershipModel.js";

dotenv.config({ path: ".env.server" });

// eslint-disable-next-line no-undef
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is missing in .env.server");
  // eslint-disable-next-line no-undef
  process.exit(1);
}

const memberships = [
  {
    membershipId: "beginner",
    accessLevel: "beginner",
    title: "Beginner Foundation Membership",
    instructor: "KnockoutCodes Academy",
    // eslint-disable-next-line no-undef
    priceLabel: process.env.MEMBERSHIP_BEGINNER_MONTHLY_PRICE_LABEL || "$29/month",
    // eslint-disable-next-line no-undef
    monthlyPriceLabel: process.env.MEMBERSHIP_BEGINNER_MONTHLY_PRICE_LABEL || "$29/month",
    // eslint-disable-next-line no-undef
    yearlyPriceLabel: process.env.MEMBERSHIP_BEGINNER_YEARLY_PRICE_LABEL || "$290/year",
    // eslint-disable-next-line no-undef
    stripePriceId: process.env.STRIPE_BEGINNER_MONTHLY_PRICE_ID || "",
    // eslint-disable-next-line no-undef
    stripePriceIdMonthly: process.env.STRIPE_BEGINNER_MONTHLY_PRICE_ID || "",
    // eslint-disable-next-line no-undef
    stripePriceIdYearly: process.env.STRIPE_BEGINNER_YEARLY_PRICE_ID || "",
    rating: 4.8,
    enrolled: 127,
    short:
      "Built for new fighters who want clean fundamentals, guard discipline, stance, footwork, beginner combinations, and confidence without confusion.",
    meta: [
      "Unlocks beginner courses only",
      "Perfect for new students",
      "Foundation boxing skills",
      "Monthly or yearly access",
      "Protected Stripe checkout",
    ],
    glyph: "B",
    badgeLeft: "Foundation",
    badgeRight: "Beginner",
    highlight: false,
    isPublished: true,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    membershipId: "intermediate",
    accessLevel: "intermediate",
    title: "Intermediate Skill Builder Membership",
    instructor: "KnockoutCodes Academy",
    // eslint-disable-next-line no-undef
    priceLabel: process.env.MEMBERSHIP_INTERMEDIATE_MONTHLY_PRICE_LABEL || "$49/month",
    // eslint-disable-next-line no-undef
    monthlyPriceLabel: process.env.MEMBERSHIP_INTERMEDIATE_MONTHLY_PRICE_LABEL || "$49/month",
    // eslint-disable-next-line no-undef
    yearlyPriceLabel: process.env.MEMBERSHIP_INTERMEDIATE_YEARLY_PRICE_LABEL || "$490/year",
    // eslint-disable-next-line no-undef
    stripePriceId: process.env.STRIPE_INTERMEDIATE_MONTHLY_PRICE_ID || "",
    // eslint-disable-next-line no-undef
    stripePriceIdMonthly: process.env.STRIPE_INTERMEDIATE_MONTHLY_PRICE_ID || "",
    // eslint-disable-next-line no-undef
    stripePriceIdYearly: process.env.STRIPE_INTERMEDIATE_YEARLY_PRICE_ID || "",
    rating: 4.9,
    enrolled: 214,
    short:
      "For students ready to sharpen combinations, defense, counters, timing, conditioning, and ring IQ beyond the beginner level.",
    meta: [
      "Unlocks intermediate courses only",
      "Combinations and counters",
      "Defense and timing",
      "Better ring control",
      "Premium student path",
    ],
    glyph: "I",
    badgeLeft: "Skill Builder",
    badgeRight: "Intermediate",
    highlight: true,
    isPublished: true,
    isFeatured: true,
    sortOrder: 2,
  },
  {
    membershipId: "advance",
    accessLevel: "advance",
    title: "Advanced Fighter Membership",
    instructor: "KnockoutCodes Academy",
    // eslint-disable-next-line no-undef
    priceLabel: process.env.MEMBERSHIP_ADVANCE_MONTHLY_PRICE_LABEL || "$79/month",
    // eslint-disable-next-line no-undef
    monthlyPriceLabel: process.env.MEMBERSHIP_ADVANCE_MONTHLY_PRICE_LABEL || "$79/month",
    // eslint-disable-next-line no-undef
    yearlyPriceLabel: process.env.MEMBERSHIP_ADVANCE_YEARLY_PRICE_LABEL || "$790/year",
    // eslint-disable-next-line no-undef
    stripePriceId: process.env.STRIPE_ADVANCE_MONTHLY_PRICE_ID || "",
    // eslint-disable-next-line no-undef
    stripePriceIdMonthly: process.env.STRIPE_ADVANCE_MONTHLY_PRICE_ID || "",
    // eslint-disable-next-line no-undef
    stripePriceIdYearly: process.env.STRIPE_ADVANCE_YEARLY_PRICE_ID || "",
    rating: 4.9,
    enrolled: 168,
    short:
      "For serious fighters who want advanced pressure, elite defense, body attack systems, feints, traps, angles, and fight strategy.",
    meta: [
      "Unlocks advanced courses only",
      "Elite defensive systems",
      "Angles, traps, and feints",
      "Advanced fight IQ",
      "High-level training structure",
    ],
    glyph: "A",
    badgeLeft: "Elite Fighter",
    badgeRight: "Advanced",
    highlight: false,
    isPublished: true,
    isFeatured: true,
    sortOrder: 3,
  },
  {
    membershipId: "complete",
    accessLevel: "complete",
    title: "Complete Champion Membership",
    instructor: "KnockoutCodes Academy",
    // eslint-disable-next-line no-undef
    priceLabel: process.env.MEMBERSHIP_COMPLETE_MONTHLY_PRICE_LABEL || "$99/month",
    // eslint-disable-next-line no-undef
    monthlyPriceLabel: process.env.MEMBERSHIP_COMPLETE_MONTHLY_PRICE_LABEL || "$99/month",
    // eslint-disable-next-line no-undef
    yearlyPriceLabel: process.env.MEMBERSHIP_COMPLETE_YEARLY_PRICE_LABEL || "$990/year",
    // eslint-disable-next-line no-undef
    stripePriceId: process.env.STRIPE_COMPLETE_MONTHLY_PRICE_ID || "",
    // eslint-disable-next-line no-undef
    stripePriceIdMonthly: process.env.STRIPE_COMPLETE_MONTHLY_PRICE_ID || "",
    // eslint-disable-next-line no-undef
    stripePriceIdYearly: process.env.STRIPE_COMPLETE_YEARLY_PRICE_ID || "",
    rating: 5.0,
    enrolled: 301,
    short:
      "The full KnockoutCodes experience for students who want the complete training library, premium structure, and the highest-level development path.",
    meta: [
      "Unlocks complete courses only",
      "Highest-level training path",
      "Premium full-system experience",
      "Best for serious students",
      "Champion-level structure",
    ],
    glyph: "KC",
    badgeLeft: "Champion Access",
    badgeRight: "Complete",
    highlight: true,
    isPublished: true,
    isFeatured: true,
    sortOrder: 4,
  },
];

async function seedMemberships() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");

    for (const membership of memberships) {
      await Membership.findOneAndUpdate(
        { membershipId: membership.membershipId },
        { $set: membership },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      console.log(`Seeded: ${membership.title}`);
    }

    console.log("All memberships seeded successfully");
    // eslint-disable-next-line no-undef
    process.exit(0);
  } catch (error) {
    console.error("Seed memberships error:", error);
    // eslint-disable-next-line no-undef
    process.exit(1);
  }
}

seedMemberships();

