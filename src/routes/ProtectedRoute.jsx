// src/routes/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AUTH_BLOCKLIST = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

function getReturnTo(location) {
  const target = `${location.pathname || ""}${location.search || ""}${
    location.hash || ""
  }`;

  if (!target.startsWith("/") || target.startsWith("//")) return "/";
  if (AUTH_BLOCKLIST.has(location.pathname)) return "/";

  return target || "/";
}

export default function ProtectedRoute() {
  const { initializing, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (initializing) {
  return <div style={{ minHeight: "60vh" }} />; // no flicker
}

  if (!isAuthenticated) {
  return (
    <Navigate
      to="/login"
      replace
      state={{ from: getReturnTo(location) }}
    />
  );
}

if (
  user?.isDeleted === true ||
  user?.isActive === false ||
  user?.accountStatus !== "active"
) {
  return (
    <Navigate
      to="/account-access-notice"
      replace
      state={{
        accountStatus: user?.accountStatus || "restricted",
        message:
          user?.statusReason ||
          "Your account access has been restricted.",
      }}
    />
  );
}

  return <Outlet />;
}