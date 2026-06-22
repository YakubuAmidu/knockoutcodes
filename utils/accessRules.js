// utils/accessRules.js

export const MEMBERSHIP_LEVELS = [
  "foundations",
  "development",
  "performance",
  "elite-fight-camp",
];

export const PUBLIC_LEVEL = "none";

export const MEMBERSHIP_LABELS = {
  foundations: "Foundations Membership",
  development: "Development Membership",
  performance: "Performance Membership",
  "elite-fight-camp": "Elite Fight Camp Membership",
};

export function normalizeAccessLevel(value = "") {
  const clean = String(value || "")
    .trim()
    .toLowerCase();

  if (!clean) return "";

  // Old names mapped to new professional names
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

  // Old "complete" becomes elite, but NOT all-access
  if (
    clean === "complete" ||
    clean.includes("elite") ||
    clean.includes("fight-camp") ||
    clean.includes("fight camp")
  ) {
    return "elite-fight-camp";
  }

  if (clean === "none" || clean === "free") return PUBLIC_LEVEL;

  return clean;
}

export function isValidMembershipLevel(value = "") {
  return MEMBERSHIP_LEVELS.includes(normalizeAccessLevel(value));
}

export function getCourseRequiredLevel(course = {}) {
  if (course?.isFree) return PUBLIC_LEVEL;

  const level = normalizeAccessLevel(
    course.requiredMembershipLevel || course.level || "foundations",
  );

  if (!level) return "foundations";
  if (level === PUBLIC_LEVEL) return PUBLIC_LEVEL;

  return level;
}

export function membershipCoversCourse(userLevel, courseRequiredLevel) {
  const memberLevel = normalizeAccessLevel(userLevel);
  const requiredLevel = normalizeAccessLevel(courseRequiredLevel);

  if (!requiredLevel || requiredLevel === PUBLIC_LEVEL) return true;
  if (!memberLevel) return false;

  // Critical business rule:
  // Each membership only unlocks its own level.
  // Elite Fight Camp does NOT unlock Foundations, Development, or Performance.
  return memberLevel === requiredLevel;
}

export function getMembershipLabel(level = "") {
  const safeLevel = normalizeAccessLevel(level);
  return MEMBERSHIP_LABELS[safeLevel] || "Membership";
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
