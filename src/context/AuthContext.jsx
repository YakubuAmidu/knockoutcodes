// src/context/AuthContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axiosInstance from "../../utils/axiosInstance";
import { useToast } from "../components/Toast";

import { useDispatch } from "react-redux";
import { AUTH_ACTIONS } from "../reducers/auth/authActionTypes";

const AuthContext = createContext(null);

const USER_KEY = "kc_user";
const PERSIST_KEY = "kc_persist";

const PUBLIC_AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/home",
  "/",
]);

function safeGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeRemove(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}

function getPersistMode() {
  return (
    safeGet(localStorage, PERSIST_KEY) ||
    safeGet(sessionStorage, PERSIST_KEY) ||
    "local"
  );
}

function getStorage(mode) {
  return mode === "session" ? sessionStorage : localStorage;
}

function sanitizeUser(user) {
  if (!user || typeof user !== "object" || !user._id) return null;

  return {
    _id: user._id,
    name: user.name || "",
    email: user.email || "",
    role: user.role || "user",
    avatar: user.avatar || "",
    isActive: user.isActive !== false,
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
}

function extractUser(data) {
  return sanitizeUser(data?.user || data?.data?.user || data?.data || null);
}

function readStoredUser() {
  const mode = getPersistMode();

  const raw =
    safeGet(getStorage(mode), USER_KEY) ||
    safeGet(localStorage, USER_KEY) ||
    safeGet(sessionStorage, USER_KEY);

  if (!raw) return null;

  try {
    return sanitizeUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

function hasStoredAuthUser() {
  return !!(
    safeGet(localStorage, USER_KEY) || safeGet(sessionStorage, USER_KEY)
  );
}

function clearClientAuth() {
  safeRemove(localStorage, USER_KEY);
  safeRemove(sessionStorage, USER_KEY);
  safeRemove(localStorage, PERSIST_KEY);
  safeRemove(sessionStorage, PERSIST_KEY);

  safeRemove(localStorage, "user");
  safeRemove(sessionStorage, "user");
  safeRemove(localStorage, "token");
  safeRemove(sessionStorage, "token");
}

function persistUser(user, mode = "local") {
  const cleanUser = sanitizeUser(user);

  if (!cleanUser) {
    clearClientAuth();
    return;
  }

  const storage = getStorage(mode);
  const otherStorage = mode === "session" ? localStorage : sessionStorage;

  safeSet(storage, USER_KEY, JSON.stringify(cleanUser));
  safeRemove(otherStorage, USER_KEY);

  safeSet(localStorage, PERSIST_KEY, mode);
  safeSet(sessionStorage, PERSIST_KEY, mode);
}

function shouldRedirectToLogin() {
  const path = window.location.pathname;
  if (PUBLIC_AUTH_PATHS.has(path)) return false;
  return path.startsWith("/admin") || path.startsWith("/user") || path.includes("dashboard");
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser());
  const [initializing, setInitializing] = useState(true);

  const toast = useToast();
  const dispatch = useDispatch();

  const mountedRef = useRef(true);
  const bootedRef = useRef(false);
  const refreshPromiseRef = useRef(null);
  const loggingOutRef = useRef(false);

  const showToast = useCallback(
    (message, type = "info") => {
      if (!message) return;

      if (typeof toast?.push === "function") {
        toast.push({
          title:
            type === "success"
              ? "Success"
              : type === "error"
              ? "Error"
              : type === "warning"
              ? "Warning"
              : "Notice",
          description: message,
          variant: type,
        });
      }
    },
    [toast]
  );

  const ensureCsrf = useCallback(async () => {
    try {
      await axiosInstance.get("/auth/csrf");
    } catch {
      // do not break app boot
    }
  }, []);

  const clearAuthState = useCallback(() => {
  setUser(null);
  clearClientAuth();

  dispatch({
    type: AUTH_ACTIONS.AUTH_LOGOUT,
  });
}, [dispatch]);

  const forceLogout = useCallback(
    (message = "") => {
      if (loggingOutRef.current) return;

      loggingOutRef.current = true;

      clearAuthState();
      setInitializing(false);

      if (message) {
        showToast(message, "warning");
      }

      if (shouldRedirectToLogin()) {
        window.location.replace("/login");
      }

      setTimeout(() => {
        loggingOutRef.current = false;
      }, 500);
    },
    [clearAuthState, showToast]
  );

  const bootstrapSession = useCallback(async () => {
    if (loggingOutRef.current) return null;

    const storedUserExists = hasStoredAuthUser();

    if (!storedUserExists) {
      await ensureCsrf();
      return null;
    }

    try {
      await ensureCsrf();

      try {
        const { data } = await axiosInstance.get("/auth/me");
        const user = extractUser(data);

if (user?.isActive === false) {
  forceLogout("Account inactive.");
  return null;
}

return user;
      } catch (error) {
        if (error?.response?.status !== 401) {
          return null;
        }

        if (!refreshPromiseRef.current) {
          refreshPromiseRef.current = axiosInstance
            .post("/auth/refresh", {})
            .finally(() => {
              refreshPromiseRef.current = null;
            });
        }

        await refreshPromiseRef.current;

        const { data } = await axiosInstance.get("/auth/me");
const refreshedUser = extractUser(data);

if (refreshedUser?.isActive === false) {
  forceLogout("Account inactive.");
  return null;
}

return refreshedUser;
      }
    } catch {
      return null;
    }
  }, [ensureCsrf, forceLogout]);

  const refresh = useCallback(async () => {
    const freshUser = await bootstrapSession();

    if (!mountedRef.current) return null;

    if (!freshUser) {
  clearAuthState();
  return null;
}

if (freshUser.isActive === false) {
  forceLogout("Account inactive.");
  return null;
}

    setUser(freshUser);
    persistUser(freshUser, getPersistMode());

    dispatch({
  type: AUTH_ACTIONS.AUTH_SUCCESS,
  payload: freshUser,
});

    return freshUser;
  }, [bootstrapSession, clearAuthState, dispatch, forceLogout]);

  useEffect(() => {
    mountedRef.current = true;

    if (bootedRef.current) return;
    bootedRef.current = true;

    async function initAuth() {
      try {
        const freshUser = await bootstrapSession();

        if (!mountedRef.current) return;

        if (freshUser && freshUser.isActive !== false) {
          setUser(freshUser);
          persistUser(freshUser, getPersistMode());

          dispatch({
  type: AUTH_ACTIONS.AUTH_SUCCESS,
  payload: freshUser,
});
        } else {
          clearAuthState();
        }
      } finally {
        if (mountedRef.current) {
          setInitializing(false);
        }
      }
    }

    initAuth();

    return () => {
      mountedRef.current = false;
    };
  }, [bootstrapSession, clearAuthState, dispatch]);

  useEffect(() => {
    function handleAuthExpired(event) {
      if (loggingOutRef.current) return;

      const message =
        event?.detail?.message || "Session expired. Please login again.";

      forceLogout(message);
    }

    window.addEventListener("kc:auth-expired", handleAuthExpired);

    return () => {
      window.removeEventListener("kc:auth-expired", handleAuthExpired);
    };
  }, [forceLogout]);

  useEffect(() => {
  if (!user) return;

  const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

  let inactivityTimer;

  const resetTimer = () => {
    clearTimeout(inactivityTimer);

    inactivityTimer = setTimeout(() => {
      forceLogout("You were logged out due to inactivity.");
    }, INACTIVITY_LIMIT);
  };

  const events = [
    "mousemove",
    "mousedown",
    "keydown",
    "scroll",
    "touchstart",
    "click",
  ];

  events.forEach((event) => {
    window.addEventListener(event, resetTimer);
  });

  resetTimer();

  return () => {
    clearTimeout(inactivityTimer);

    events.forEach((event) => {
      window.removeEventListener(event, resetTimer);
    });
  };
}, [user, forceLogout]);

  const login = useCallback(
    async (credentials, options = {}) => {
      const mode = options.remember === false ? "session" : "local";

      try {
        setInitializing(true);
        await ensureCsrf();

        const { data } = await axiosInstance.post("/auth/login", credentials);

        let loggedInUser = extractUser(data);

        if (!loggedInUser) {
          loggedInUser = await bootstrapSession();
        }

        if (!loggedInUser) {
          clearAuthState();
          return {
            ok: false,
            error: "Login worked, but session verification failed.",
          };
        }

        if (loggedInUser.isActive === false) {
          clearAuthState();
          return {
            ok: false,
            error: "Your account is inactive. Please contact support.",
          };
        }

        setUser(loggedInUser);
persistUser(loggedInUser, mode);

dispatch({
  type: AUTH_ACTIONS.AUTH_SUCCESS,
  payload: loggedInUser,
});

        return {
          ok: true,
          user: loggedInUser,
          role: loggedInUser.role || "user",
        };
      } catch (error) {
        clearAuthState();

        return {
          ok: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            "Invalid email or password.",
        };
      } finally {
        if (mountedRef.current) {
          setInitializing(false);
        }
      }
    },
    [bootstrapSession, clearAuthState, dispatch, ensureCsrf]
  );

  const register = useCallback(
    async (payload, options = {}) => {
      const mode = options.remember === false ? "session" : "local";

      try {
        setInitializing(true);
        await ensureCsrf();

        await axiosInstance.post("/auth/register", payload);

        safeSet(localStorage, PERSIST_KEY, mode);
        safeSet(sessionStorage, PERSIST_KEY, mode);

        return {
          ok: true,
          requiresLogin: true,
        };
      } catch (error) {
        clearAuthState();

        return {
          ok: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            "Registration failed.",
        };
      } finally {
        if (mountedRef.current) {
          setInitializing(false);
        }
      }
    },
    [clearAuthState, ensureCsrf]
  );

  const logout = useCallback(
    async (options = {}) => {
      const { message = "" } = options || {};

      if (loggingOutRef.current) return;

      loggingOutRef.current = true;

      try {
        await ensureCsrf();
        await axiosInstance.post("/auth/logout", {});
      } catch {
        // still clear frontend
      } finally {
        clearAuthState();
        setInitializing(false);

        if (message) {
          showToast(message, "warning");
        }

        if (window.location.pathname !== "/login") {
          window.location.replace("/login");
        }

        setTimeout(() => {
          loggingOutRef.current = false;
        }, 500);
      }
    },
    [clearAuthState, ensureCsrf, showToast]
  );

  const value = useMemo(
    () => ({
      user,
      loading: initializing,
      initializing,
      isAuthenticated: !!user,
      isAdmin: user?.role === "admin",
      login,
      register,
      logout,
      forceLogout,
      refresh,
      setUser,
    }),
    [user, initializing, login, register, logout, forceLogout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}