import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PublicRoute() {
  const { initializing, isAuthenticated, isAdmin } = useAuth();

  if (initializing) return <div style={{ minHeight: "60vh" }} />;

  if (isAuthenticated) {
    return (
      <Navigate
        to={isAdmin ? "/admin/dashboard" : "/user-dashboard"}
        replace
      />
    );
  }

  return <Outlet />
}