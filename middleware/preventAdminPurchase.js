// middleware/preventAdminPurchase.js

export const preventAdminPurchase = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please login first.",
    });
  }

  const role = String(user.role || "").toLowerCase();

  if (role === "admin" || role === "superadmin" || role === "owner") {
    return res.status(403).json({
      success: false,
      message:
        "Admin accounts cannot purchase courses or subscribe to memberships. Please use a regular user account for checkout testing.",
    });
  }

  next();
};
