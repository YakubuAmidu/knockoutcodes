// src/components/MaintenanceGate.jsx
import { lazy, Suspense, useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import axiosInstance from "../../utils/axiosInstance";
import { useAuth } from "../context/AuthContext";

const Maintenance = lazy(() => import("../pages/Maintenance"));

let cachedStatus = null;
let cachedAt = 0;
let statusPromise = null;

const CACHE_TIME = 60 * 1000;

async function getMaintenanceStatus() {
  const now = Date.now();

  if (cachedStatus && now - cachedAt < CACHE_TIME) {
    return cachedStatus;
  }

  if (!statusPromise) {
    statusPromise = axiosInstance
      .get("/system/status", {
  timeout: 5000,
  headers: {
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  },
})
      .then((res) => {
        cachedStatus = res.data;
        cachedAt = Date.now();
        return cachedStatus;
      })
      .finally(() => {
        statusPromise = null;
      });
  }

  return statusPromise;
}

const MaintenanceGate = ({ children }) => {
  const { user, isAdmin } = useAuth();

  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let alive = true;

    async function checkStatus() {
      try {
        const data = await getMaintenanceStatus();

        if (!alive) return;

        setStatus(data);
      } catch (error) {
        if (import.meta.env.DEV) {
  console.error("Maintenance status check failed:", error?.message);
}

        if (!alive) return;

        // Fail open so your app does not get trapped in maintenance check.
        setStatus({
          maintenanceMode: false,
          allowAdminAccess: true,
        });
      } finally {
        if (alive) setChecking(false);
      }
    }

    checkStatus();

    return () => {
      alive = false;
    };
  }, []);

  if (checking) {
    return (
      <GateLoading>
        <div>
          <Spinner />
          <LoadingTitle>Checking KnockoutCodes system status...</LoadingTitle>
        </div>
      </GateLoading>
    );
  }

  const maintenanceMode = Boolean(status?.maintenanceMode);
  const allowAdminAccess = status?.allowAdminAccess !== false;

  const adminCanPass = maintenanceMode && allowAdminAccess && user && isAdmin;

  if (maintenanceMode && !adminCanPass) {
  return (
    <Suspense
      fallback={
        <GateLoading>
          <div>
            <Spinner />
            <LoadingTitle>Loading maintenance page...</LoadingTitle>
          </div>
        </GateLoading>
      }
    >
      <Maintenance
        title={status?.maintenanceTitle}
        message={status?.maintenanceMessage}
        updatedAt={status?.updatedAt}
      />
    </Suspense>
  );
}

  return children;
};

export default MaintenanceGate;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const GateLoading = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 24px;
  color: ${({ theme }) => theme.colors.ivory};
  background:
    radial-gradient(circle at 12% 8%, rgba(214, 182, 159, 0.18), transparent 34%),
    linear-gradient(180deg, ${({ theme }) => theme.colors.black}, ${({ theme }) => theme.colors.darkBrown});
`;

const Spinner = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 3px solid rgba(255, 249, 242, 0.16);
  border-top-color: ${({ theme }) => theme.colors.lightBrown};
  animation: ${spin} 0.8s linear infinite;
  margin: 0 auto 14px;
`;

const LoadingTitle = styled.p`
  margin: 0;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.ivory};
`;