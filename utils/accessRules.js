// utils/accessRules.js

const LEVEL_ORDER = {
  none: 0,
  beginner: 1,
  intermediate: 2,
  advance: 3,
  complete: 4,
};

export function normalizeAccessLevel(value = "") {
  const clean = String(value || "")
    .trim()
    .toLowerCase();

  if (!clean) return "";
  if (clean === "advanced") return "advance";
  if (clean === "all") return "all-levels";

  if (clean.includes("beginner")) return "beginner";
  if (clean.includes("intermediate")) return "intermediate";
  if (clean.includes("advance") || clean.includes("advanced")) return "advance";
  if (clean.includes("complete") || clean.includes("elite")) return "complete";
  if (clean === "none" || clean === "free") return "none";

  return clean;
}

export function getCourseRequiredLevel(course = {}) {
  if (course?.isFree) return "none";

  const level = normalizeAccessLevel(
    course.requiredMembershipLevel || course.level || "beginner",
  );

  if (!level || level === "all-levels") return "beginner";
  if (level === "none") return "none";

  return level;
}

export function membershipCoversCourse(userLevel, courseRequiredLevel) {
  const memberLevel = normalizeAccessLevel(userLevel);
  const requiredLevel = normalizeAccessLevel(courseRequiredLevel);

  if (!memberLevel || !requiredLevel || requiredLevel === "none") return false;

  // Complete unlocks everything.
  if (memberLevel === "complete") return true;

  // Beginner/intermediate/advance only unlock exact matching course level.
  return memberLevel === requiredLevel;
}

export function membershipLevelValue(level) {
  return LEVEL_ORDER[normalizeAccessLevel(level)] || 0;
}

export function isSubscriptionActive(sub) {
  if (!sub) return false;

  const status = String(sub.status || "")
    .trim()
    .toLowerCase();

  if (!["active", "trialing"].includes(status)) return false;

  if (
    sub.currentPeriodEnd &&
    new Date(sub.currentPeriodEnd).getTime() < Date.now()
  ) {
    return false;
  }

  return true;
}
