// middleware/preventAdminUserAction.js

export const preventAdminUserAction = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please login first.",
    });
  }

  const role = String(user.role || "").toLowerCase();

  if (["admin", "superadmin", "owner"].includes(role)) {
    return res.status(403).json({
      success: false,
      message:
        "Admin accounts cannot perform user actions like newsletter subscription, purchases, likes, reviews, or checkout testing. Please use a regular user account.",
    });
  }

  next();
};