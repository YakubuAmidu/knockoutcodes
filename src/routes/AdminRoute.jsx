// src/routes/AdminRoute.jsx
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

  if (!target.startsWith("/") || target.startsWith("//")) {
    return "/admin/dashboard";
  }

  if (AUTH_BLOCKLIST.has(location.pathname)) {
    return "/admin/dashboard";
  }

  return target || "/admin/dashboard";
}

export default function AdminRoute() {
  const { initializing, isAuthenticated, isAdmin, user } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <div style={{ minHeight: "60vh" }} />;
  }

  if (!isAuthenticated || user?.isActive === false) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: getReturnTo(location) }}
      />
    );
  }

  if (!isAdmin) {
    return <Navigate to="/user-profile" replace />;
  }

  return <Outlet />;
}