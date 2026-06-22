// backend/scripts/migrateMembershipLevels.js
import mongoose from "mongoose";
import dotenv from "dotenv";

import Membership from "../models/MembershipModel.js";
import Course from "../models/CourseModel.js";
import UserSubscription from "../models/UserSubscriptionModel.js";
import User from "../models/UserModel.js";

// Load your backend env file
dotenv.config({ path: ".env.server" });

const MONGO_URI =
  // eslint-disable-next-line no-undef
  process.env.MONGO_URI ||
  // eslint-disable-next-line no-undef
  process.env.MONGODB_URI ||
  // eslint-disable-next-line no-undef
  process.env.DB_URI ||
  // eslint-disable-next-line no-undef
  process.env.DATABASE_URL;

const mapLevel = (value = "") => {
  const clean = String(value || "")
    .trim()
    .toLowerCase();

  if (!clean) return "";

  if (clean === "beginner" || clean.includes("foundation")) {
    return "foundations";
  }

  if (clean === "intermediate" || clean.includes("development")) {
    return "development";
  }

  if (
    clean === "advance" ||
    clean === "advanced" ||
    clean.includes("performance")
  ) {
    return "performance";
  }

  if (
    clean === "complete" ||
    clean.includes("elite") ||
    clean.includes("fight-camp") ||
    clean.includes("fight camp")
  ) {
    return "elite-fight-camp";
  }

  if (clean === "none" || clean === "free") return "none";

  return clean;
};

async function migrateMemberships() {
  const memberships = await Membership.find({});

  let changed = 0;

  for (const membership of memberships) {
    const nextMembershipId = mapLevel(membership.membershipId);
    const nextAccessLevel = mapLevel(
      membership.accessLevel || membership.membershipId,
    );

    const updates = {};

    if (membership.membershipId !== nextMembershipId) {
      updates.membershipId = nextMembershipId;
    }

    if (membership.accessLevel !== nextAccessLevel) {
      updates.accessLevel = nextAccessLevel;
    }

    if (Object.keys(updates).length) {
      await Membership.updateOne({ _id: membership._id }, { $set: updates });
      changed += 1;
      console.log("Membership updated:", membership.title, updates);
    }
  }

  return changed;
}

async function migrateCourses() {
  const courses = await Course.find({});

  let changed = 0;

  for (const course of courses) {
    const nextLevel = mapLevel(course.level) || "foundations";
    const nextRequiredMembershipLevel = course.isFree
      ? "none"
      : mapLevel(course.requiredMembershipLevel || course.level) ||
        "foundations";

    const updates = {};

    if (course.level !== nextLevel) {
      updates.level = nextLevel;
    }

    if (course.requiredMembershipLevel !== nextRequiredMembershipLevel) {
      updates.requiredMembershipLevel = nextRequiredMembershipLevel;
    }

    if (course.isFree) {
      updates.price = 0;
      updates.salePrice = null;
      updates.allowSinglePurchase = false;
      updates.stripePriceId = "";
    }

    if (Object.keys(updates).length) {
      await Course.updateOne({ _id: course._id }, { $set: updates });
      changed += 1;
      console.log("Course updated:", course.title, updates);
    }
  }

  return changed;
}

async function migrateSubscriptions() {
  const subscriptions = await UserSubscription.find({});

  let changed = 0;

  for (const sub of subscriptions) {
    const nextMembershipId = mapLevel(sub.membershipId || sub.accessLevel);
    const nextAccessLevel = mapLevel(sub.accessLevel || sub.membershipId);

    const updates = {};

    if (sub.membershipId !== nextMembershipId) {
      updates.membershipId = nextMembershipId;
    }

    if (sub.accessLevel !== nextAccessLevel) {
      updates.accessLevel = nextAccessLevel;
    }

    if (Object.keys(updates).length) {
      await UserSubscription.updateOne({ _id: sub._id }, { $set: updates });
      changed += 1;
      console.log("Subscription updated:", sub._id.toString(), updates);
    }
  }

  return changed;
}

async function migrateUsers() {
  const users = await User.find({
    membershipPlan: { $exists: true, $ne: null },
  });

  let changed = 0;

  for (const user of users) {
    const nextMembershipPlan = mapLevel(user.membershipPlan);

    if (user.membershipPlan !== nextMembershipPlan) {
      await User.updateOne(
        { _id: user._id },
        { $set: { membershipPlan: nextMembershipPlan || null } },
      );

      changed += 1;
      console.log("User updated:", user.email, {
        membershipPlan: nextMembershipPlan,
      });
    }
  }

  return changed;
}

async function run() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI or MONGODB_URI is required.");
  }

  await mongoose.connect(MONGO_URI);

  console.log("Connected to MongoDB.");
  console.log("Starting membership level migration...");

  const membershipCount = await migrateMemberships();
  const courseCount = await migrateCourses();
  const subscriptionCount = await migrateSubscriptions();
  const userCount = await migrateUsers();

  console.log("Migration complete.");
  console.log({
    membershipsUpdated: membershipCount,
    coursesUpdated: courseCount,
    subscriptionsUpdated: subscriptionCount,
    usersUpdated: userCount,
  });

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Migration failed:", error);
  await mongoose.disconnect();
  // eslint-disable-next-line no-undef
  process.exit(1);
});
