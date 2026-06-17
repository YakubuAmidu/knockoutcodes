import UserSubscription from "../models/SubscriptionModel.js";

const isActive = (s) => s === "active" || s === "trialing";

export const subscriptionRequired = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Auth required" });

    const sub = await UserSubscription.findOne({ user: userId }).lean();
    if (!sub || !isActive(sub.status)) {
      return res
        .status(403)
        .json({ success: false, message: "Active subscription required" });
    }

    req.subscription = sub;
    next();
  } catch (e) {
    console.error("subscriptionRequired error:", e);
    return res
      .status(500)
      .json({ success: false, message: "Subscription check failed" });
  }
};
