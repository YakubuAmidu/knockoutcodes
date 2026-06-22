// middleware/subscriptionRequired.js

import UserSubscription from "../models/UserSubscriptionModel.js";
import { isSubscriptionActive } from "../utils/accessRules.js";

export const subscriptionRequired = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const sub = await UserSubscription.findOne({ user: userId }).lean();

    if (!isSubscriptionActive(sub)) {
      return res.status(403).json({
        success: false,
        message: "Active membership required.",
      });
    }

    req.subscription = sub;
    return next();
  } catch {
    return res.status(500).json({
      success: false,
      message: "Subscription check failed.",
    });
  }
};
