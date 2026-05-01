// src/pages/UserProfile.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import styled, { useTheme } from "styled-components";
// src/pages/UserProfile.jsx
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

// ✅ Redux
import { useDispatch, useSelector } from "react-redux";
import {
  userMeRequest,
  userMeSuccess,
  userMeFail,
  setUserEditMode,
  updateUserForm,
  resetUserForm,
  userSaveRequest,
  userSaveSuccess,
  userSaveFail,
  setAvatarFile as setAvatarFileAction,
  clearAvatar,
  togglePasswordPanel,
  updatePasswordField,
  resetPassword,
  userLogout,
} from "../reducers/user/userActions"; // ✅ your current path

// -----------------------------
const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://api.knockoutcodes.com";

const ME_ENDPOINT = "/api/v1/users/me";
const LOGOUT_ENDPOINT = "/api/v1/auth/logout";
const CSRF_ENDPOINT = "/api/v1/auth/csrf";

// ✅ avatar + password endpoints
const AVATAR_ENDPOINT = "/api/v1/users/me/avatar";
const PASSWORD_ENDPOINT = "/api/v1/users/me/password";

// ✅ user support inbox endpoint (private)
const MY_CONTACTS_ENDPOINT = "/api/v1/contacts/my";

// ✅ NEW: device/session management endpoints (best-effort; backend can implement these)
const SESSIONS_ENDPOINT = "/api/v1/auth/sessions"; // GET list, DELETE /:id revoke, DELETE /others revoke others

// ✅ local cache key for fast reloads
const ME_CACHE_KEY = "kc_me";

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function isLocalhost() {
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

/**
 * Read cookie value by name (CSRF cookie is httpOnly:false by design)
 */
function getCookie(name) {
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${name.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&")}=([^;]*)`)
    );
    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

/**
 * Create a local “initials avatar” data URL (no email leakage, no external calls).
 */
function initialsAvatarDataUrl(nameOrEmail) {
  const text = String(nameOrEmail || "U").trim();
  const initials =
    text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "U";

  const size = 240;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#2a1a12";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(214,182,159,0.55)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#f5efe8";
  ctx.font = "bold 92px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials, size / 2, size / 2 + 2);

  return canvas.toDataURL("image/png");
}

/**
 * Centralized secure fetch:
 * - Uses httpOnly cookie auth by default (credentials: include)
 * - Adds CSRF header for unsafe methods
 * - Sends Bearer ONLY on localhost/dev (keeps Postman/dev compatibility)
 * - Normalizes error handling
 */
async function apiFetch(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const unsafe = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  // ✅ Never set Content-Type manually for FormData
  if (!isFormData && unsafe && !headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  // ✅ CSRF for unsafe methods
  if (unsafe) {
    const csrfToken = getCookie("csrfToken");
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
  }

  // ✅ Only allow Bearer token in localhost/dev
  if (isLocalhost()) {
    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      "";

    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(API_BASE_URL + path, {
    credentials: "include",
    ...options,
    method,
    headers,
  });

  const body = await safeJson(res);
  return { res, body };
}

export default function UserProfile() {
  const t = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const actionLockRef = useRef(false);

  // ✅ prevents logout + 401 loop / shaking
  const loggingOutRef = useRef(false);
  const meFetchAbortRef = useRef(null);
  // ✅ keep real File out of Redux (prevents mutation errors)
  const avatarFileRef = useRef(null);

  const saveLockRef = useRef();

  // ✅ Redux state (DO NOT duplicate these with local useState)
  const {
    loading,
    me,
    error,
    editMode,
    saving,
    saveError,
    form,
    avatarFile,
    avatarPreview,
    showPassword,
    pwSaving,
    pwError,
    pw,
  } = useSelector((state) => state.users);

  // ✅ avatar input ref (allow re-select same file)
  const avatarInputRef = useRef(null);

  // ✅ support inbox summary (local UI state)
  const [support, setSupport] = useState({
    loading: false,
    count: 0,
    hasAdminReply: false,
    lastUpdatedAt: "",
    lastSubject: "",
  });

  // ✅ devices/sessions state (local UI state)
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState("");
  const [revokingId, setRevokingId] = useState("");
  const [revokingOthers, setRevokingOthers] = useState(false);

  // ✅ Simple local toast system (local UI state)
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info", // "success" | "error" | "info"
  });

  const toastTimerRef = useRef(null);

  const { logout: authLogout, loading: authLoading, isAuthenticated } = useAuth();

  // ✅ forces avatar refresh when server returns same url (browser cache)
  const [avatarBust, setAvatarBust] = useState(0);

  function showToast(message, type = "info") {
    setToast({ visible: true, message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3500);
  }

  function fmtTime(ts) {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return "";
    }
  }

  // ✅ Persist to localStorage so refresh keeps the profile + avatar
  function persistMe(user) {
  try {
    if (!user) return;

    // ✅ store ONLY safe fields
    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
    };

    localStorage.setItem(ME_CACHE_KEY, JSON.stringify(safeUser));
  } catch { /* empty */ }
}

  function readCachedMe() {
    try {
      const raw = localStorage.getItem(ME_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed._id) return parsed;
      return null;
    } catch {
      return null;
    }
  }

  /**
   * ✅ Ensure CSRF cookie exists (best effort)
   */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!getCookie("csrfToken")) {
          await apiFetch(CSRF_ENDPOINT, { method: "GET" });
        }
      } catch {
        // ignore
      }
      if (!alive) return;
    })();

    return () => {
      alive = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ✅ Hydrate Redux from localStorage first (fast reload), then fetch real profile
  useEffect(() => {
    const cached = readCachedMe();
    if (cached && cached._id && !me) {
      dispatch(userMeSuccess(cached));
      dispatch(
        resetUserForm({
          name: cached.name || "",
          email: cached.email || "",
          phone: cached.phone || "",
          location: cached.location || "",
          website: cached.website || "",
          instagram: cached.instagram || "",
          tiktok: cached.tiktok || "",
          youtube: cached.youtube || "",
          xhandle: cached.xhandle || "",
          headline: cached.headline || "",
          bio: cached.bio || "",
          notifications: cached.notifications !== false,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Fetch profile (cookie-first; bearer only on localhost)
  useEffect(() => {
  if (loggingOutRef.current) return;

  // ✅ Wait for AuthContext to finish restoring session on browser refresh
  if (authLoading) return;

  // ✅ If AuthContext already knows user is not authenticated, then stop here
  if (!isAuthenticated) {
    dispatch(userMeFail("Authentication required."));
    return;
  }

  const controller = new AbortController();
  meFetchAbortRef.current = controller;

  (async () => {
    dispatch(userMeRequest());

    try {
      const { res, body } = await apiFetch(ME_ENDPOINT, {
        method: "GET",
        signal: controller.signal,
      });

      if (!res.ok) {
        const msg = body?.message || "Failed to load profile.";
        dispatch(userMeFail(msg));

        // ✅ Do NOT force logout/navigation here.
        // AuthContext is the single source of truth for session handling.
        return;
      }

      const user = body?.data || body || null;

      dispatch(userMeSuccess(user));
      persistMe(user);

      dispatch(
        resetUserForm({
          name: user?.name || "",
          email: user?.email || "",
          phone: user?.phone || "",
          location: user?.location || "",
          website: user?.website || "",
          instagram: user?.instagram || "",
          tiktok: user?.tiktok || "",
          youtube: user?.youtube || "",
          xhandle: user?.xhandle || "",
          headline: user?.headline || "",
          bio: user?.bio || "",
          notifications: user?.notifications !== false,
        })
      );

      setAvatarBust(Date.now());
    } catch (e) {
      if (e?.name === "AbortError") return;
      console.error("Profile fetch failed:", e);
      dispatch(userMeFail("Network error. Please try again."));
    }
  })();

  return () => controller.abort();
}, [dispatch, authLoading, isAuthenticated]);

  // ✅ Revoke object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(avatarPreview);
        } catch {
          // ignore
        }
      }
    };
  }, [avatarPreview]);

  // ✅ Fetch support inbox summary (only for normal users)
  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!me?._id) return;
      if (me?.role && me.role !== "user") return;

      setSupport((p) => ({ ...p, loading: true }));

      try {
        const { res, body } = await apiFetch(MY_CONTACTS_ENDPOINT, { method: "GET" });
        if (!alive) return;

        if (!res.ok) {
          setSupport((p) => ({ ...p, loading: false }));
          return;
        }

        const items = Array.isArray(body?.items) ? body.items : [];
        const newest = items[0] || null;

        setSupport({
          loading: false,
          count: items.length,
          hasAdminReply: items.some((x) => x?.replied === true),
          lastUpdatedAt: newest?.updatedAt || newest?.createdAt || "",
          lastSubject: newest?.subject || "",
        });

        const hasAdminReply = items.some((x) => x?.replied === true);
        const stampKey = "kc_support_toast_seen";
        const lastStamp = Number(localStorage.getItem(stampKey) || "0");
        const now = Date.now();

        if (hasAdminReply && now - lastStamp > 60_000) {
          localStorage.setItem(stampKey, String(now));
          showToast("Support replied — open My Messages to view and respond.", "info");
        }
      } catch (e) {
        if (!alive) return;
        console.warn("Support summary fetch failed:", e);
        setSupport((p) => ({ ...p, loading: false }));
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [me]);

  useEffect(() => {
  const handleAuthExpired = (e) => {
    showToast(e.detail?.message || "Session expired", "error");
    navigate("/login");
  };

  window.addEventListener("kc:auth-expired", handleAuthExpired);

  return () => {
    window.removeEventListener("kc:auth-expired", handleAuthExpired);
  };
}, [navigate]);

  const joinedDate = useMemo(() => {
    if (!me?.createdAt) return "";
    try {
      return new Date(me.createdAt).toLocaleDateString();
    } catch {
      return "";
    }
  }, [me]);

  const updatedDateTime = useMemo(() => {
    if (!me?.updatedAt) return "";
    try {
      return new Date(me.updatedAt).toLocaleString();
    } catch {
      return "";
    }
  }, [me]);

  // ✅ Avatar handling: preview > backend url > initials avatar (no email leakage)
  const avatarUrl = useMemo(() => {
    if (avatarPreview) return avatarPreview;

    const avatarField = me?.avatar || me?.avatarUrl || me?.profileImage || me?.image || "";
    if (avatarField) {
      const bust = avatarBust || (me?.updatedAt ? new Date(me.updatedAt).getTime() : 0) || 0;
      const qs = bust ? `?v=${encodeURIComponent(String(bust))}` : "";

      if (String(avatarField).startsWith("http")) return `${avatarField}${qs}`;
      const normalized = String(avatarField).startsWith("/") ? avatarField : `/${avatarField}`;
      return `${API_BASE_URL}${normalized}${qs}`;
    }

    return initialsAvatarDataUrl(me?.name || me?.email || "User");
  }, [me, avatarPreview, avatarBust]);

  const socialLinks = useMemo(() => {
    if (!me) return [];
    const list = [
      { label: "Website", value: me.website },
      { label: "Instagram", value: me.instagram },
      { label: "TikTok", value: me.tiktok },
      { label: "YouTube", value: me.youtube },
      { label: "X (Twitter)", value: me.xhandle },
    ];
    return list.filter((item) => item.value);
  }, [me]);

    async function handleLogout() {
    // ✅ stop any in-flight /me request + prevent 401 redirect loops
    loggingOutRef.current = true;

    try {
      if (meFetchAbortRef.current) meFetchAbortRef.current.abort();
    } catch {
      // ignore
    }

    // ✅ best effort: hit backend logout endpoint (keep your current behavior)
    try {
      await apiFetch(LOGOUT_ENDPOINT, { method: "POST" });
    } catch (e) {
      console.warn("Logout request failed:", e);
    }

    // ✅ clear your profile cache (keep your current behavior)
    localStorage.removeItem(ME_CACHE_KEY);

    // ✅ reset Redux user slice (keep your current behavior)
    dispatch(userLogout());

    // ✅ CRITICAL FIX: update AuthContext exactly like Navbar
    // This is what flips `isAuthenticated` to false immediately (no refresh needed)
    authLogout();

    // ✅ optional but safe: keep the redirect (won’t hurt even if authLogout already handles it)
    navigate("/login", { replace: true });
  };

  // ✅ Redux form change (single source of truth)
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    dispatch(updateUserForm({ [name]: type === "checkbox" ? checked : value }));
  }

  // ✅ Avatar selection -> store file + preview in Redux
 function handleAvatarChange(e) {
  const file = e.target.files && e.target.files[0];

  if (!file) {
    // ✅ cleanup old preview if it exists
    if (avatarPreview && String(avatarPreview).startsWith("blob:")) {
      try {
        URL.revokeObjectURL(avatarPreview);
      } catch {
        // ignore
      }
    }

    avatarFileRef.current = null;
    dispatch(clearAvatar());
    return;
  }

  // ✅ validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    showToast("Only JPG, PNG, and WEBP images are allowed.", "error");

    if (avatarInputRef.current) avatarInputRef.current.value = "";
    avatarFileRef.current = null;
    dispatch(clearAvatar());
    return;
  }

  // ✅ validate file size
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    showToast("Image must be under 2MB.", "error");

    if (avatarInputRef.current) avatarInputRef.current.value = "";
    avatarFileRef.current = null;
    dispatch(clearAvatar());
    return;
  }

  // ✅ cleanup previous blob preview before creating a new one
  if (avatarPreview && String(avatarPreview).startsWith("blob:")) {
    try {
      URL.revokeObjectURL(avatarPreview);
    } catch {
      // ignore
    }
  }

  // ✅ store real file in ref (NOT redux)
  avatarFileRef.current = file;

  // ✅ create safe local preview
  const url = URL.createObjectURL(file);

  // ✅ only store serializable file metadata in redux
  dispatch(
    setAvatarFileAction({
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      },
      preview: url,
    })
  );
  };

  // ✅ reset the Redux form from current me (and clear avatar selection)
  function resetFormFromMe() {
    if (!me) return;

    dispatch(
      resetUserForm({
        name: me.name || "",
        email: me.email || "",
        phone: me.phone || "",
        location: me.location || "",
        website: me.website || "",
        instagram: me.instagram || "",
        tiktok: me.tiktok || "",
        youtube: me.youtube || "",
        xhandle: me.xhandle || "",
        headline: me.headline || "",
        bio: me.bio || "",
        notifications: me.notifications !== false,
      })
    );

    dispatch(clearAvatar());
    avatarFileRef.current = null;
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  function handleToggleEdit() {
    if (!me) return;

    // ✅ turning ON edit mode: ensure form is initialized (fixes "Save" doing nothing)
    if (!editMode) {
      if (!form) resetFormFromMe();
      dispatch(setUserEditMode(true));
      return;
    }

    // ✅ turning OFF edit mode: cancel edits
    resetFormFromMe();
    dispatch(setUserEditMode(false));
  }

  /**
   * ✅ Build a SAFE PATCH payload:
   * - only send fields that changed vs `me` (prevents backend rejecting empty PATCH)
   * - trims strings
   * - keeps boolean for notifications
   */
  function buildProfilePatch() {
    const current = me || {};
    const f = form || {};

    const fields = [
      "name",
      "email",
      "phone",
      "location",
      "website",
      "instagram",
      "tiktok",
      "youtube",
      "xhandle",
      "headline",
      "bio",
    ];

    const patch = {};

    for (const key of fields) {
      const nextRaw = f?.[key];
      if (typeof nextRaw === "undefined") continue;

      const next = typeof nextRaw === "string" ? nextRaw.trim() : nextRaw;

      const prevRaw = current?.[key];
      const prev = typeof prevRaw === "string" ? prevRaw.trim() : prevRaw;

      if (next !== prev) patch[key] = next;
    }

    // notifications (boolean)
    if (typeof f.notifications !== "undefined") {
      const nextN = !!f.notifications;
      const prevN = current?.notifications !== false;
      if (nextN !== prevN) patch.notifications = nextN;
    }

    return patch;
  }

  // ✅ Upload avatar if needed (returns updated user); does NOT end edit mode early
  async function uploadAvatarIfNeeded() {
  const file = avatarFileRef.current;
  if (!file) return null;

  const fd = new FormData();
  fd.append("avatar", file);

  const { res, body } = await apiFetch(AVATAR_ENDPOINT, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    throw new Error(body?.message || "Avatar upload failed.");
  }

  const updatedUser = body?.data || body || null;

  // ✅ cleanup
  avatarFileRef.current = null;
  dispatch(clearAvatar());
  if (avatarInputRef.current) avatarInputRef.current.value = "";

  setAvatarBust(Date.now());
  return updatedUser;
  };

  // ✅ Patch profile fields (returns updated user)
  async function patchProfile(payload) {
    const { res, body } = await apiFetch(ME_ENDPOINT, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });

    if (!res.ok) {
      throw new Error(body?.message || "Failed to save profile.");
    }

    return body?.data || body || null;
  }

  async function handleSave(event) {
  event.preventDefault();
  if (!me) return;

  // ✅ prevent double submit
  if (saveLockRef.current || saving) return;
  saveLockRef.current = true;

  const patch = buildProfilePatch();
  const hasPatch = patch && Object.keys(patch).length > 0;
  const hasAvatarFile = !!avatarFileRef.current;

  if (!hasAvatarFile && !hasPatch) {
    showToast("Nothing to save.", "info");
    saveLockRef.current = false;
    return;
  }

  dispatch(userSaveRequest());

  try {
    let updatedUser = me;

    // ✅ 1) upload avatar first if selected
    const avatarUpdated = await uploadAvatarIfNeeded();
    if (avatarUpdated && avatarUpdated._id) {
      updatedUser = { ...updatedUser, ...avatarUpdated };
      dispatch(userMeSuccess(updatedUser));
    }

    // ✅ 2) patch profile fields only if changed
    if (hasPatch) {
      const profileUpdated = await patchProfile(patch);
      if (profileUpdated && profileUpdated._id) {
        updatedUser = { ...updatedUser, ...profileUpdated };
      }
    }

    // ✅ 3) commit final fresh user
    dispatch(userMeSuccess(updatedUser));
    dispatch(userSaveSuccess(updatedUser));
    persistMe(updatedUser);

    // ✅ 4) reset form to fresh values
    dispatch(
      resetUserForm({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
        location: updatedUser.location || "",
        website: updatedUser.website || "",
        instagram: updatedUser.instagram || "",
        tiktok: updatedUser.tiktok || "",
        youtube: updatedUser.youtube || "",
        xhandle: updatedUser.xhandle || "",
        headline: updatedUser.headline || "",
        bio: updatedUser.bio || "",
        notifications: updatedUser.notifications !== false,
      })
    );

    setAvatarBust(Date.now());
    dispatch(setUserEditMode(false));
    showToast("Profile updated successfully.", "success");
  } catch (e) {
    console.error("Profile update failed:", e);
    const msg = e?.message || "Failed to save changes.";
    dispatch(userSaveFail(msg));
    showToast(msg, "error");
  } finally {
    saveLockRef.current = false;
  }
}

  // ✅ Password fields are Redux-controlled now
  function handlePwChange(e) {
    const { name, value } = e.target;
    dispatch(updatePasswordField({ [name]: value }));
  }

  async function handleChangePassword() {
  const currentPassword = String(pw?.currentPassword || "").trim();
  const newPassword = String(pw?.newPassword || "");
  const confirmNewPassword = String(pw?.confirmNewPassword || "");

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    showToast("Please fill all password fields.", "error");
    return;
  }

  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword)) {
    showToast(
      "Password must be at least 8 characters, include letters and numbers.",
      "error"
    );
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showToast("New passwords do not match.", "error");
    return;
  }

  if (currentPassword === newPassword) {
    showToast("New password must be different from your current password.", "error");
    return;
  }

  if (actionLockRef.current) return;
  actionLockRef.current = true;

  try {
    const { res, body } = await apiFetch(PASSWORD_ENDPOINT, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      throw new Error(body?.message || "Password change failed.");
    }

    dispatch(resetPassword());
    dispatch(togglePasswordPanel());
    showToast("Password changed successfully ✅", "success");
  } catch (e) {
    const msg = e?.message || "Password change failed.";
    showToast(msg, "error");
  } finally {
    actionLockRef.current = false;
  }
}

  // ✅ NEW: sessions/devices helpers (best-effort normalization)
  function normalizeSessions(body) {
    const raw = Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body)
      ? body
      : [];
    return raw
      .filter(Boolean)
      .map((s) => ({
        id: s._id || s.id || s.sessionId || s.sid || "",
        device: s.device || s.deviceName || s.uaDevice || s.client || "",
        browser: s.browser || s.uaBrowser || "",
        os: s.os || s.uaOS || "",
        ip: s.ip || s.ipAddress || "",
        location: s.location || s.geo || "",
        lastActiveAt: s.lastActiveAt || s.lastSeenAt || s.updatedAt || s.lastActive || "",
        createdAt: s.createdAt || s.issuedAt || "",
        isCurrent: !!(s.isCurrent || s.current || s.thisDevice),
      }))
      .map((s) => ({
        ...s,
        deviceLabel: s.device || [s.browser, s.os].filter(Boolean).join(" • ") || "Unknown device",
      }));
  }

  async function openManageDevices() {
    setDevicesOpen(true);
    setDevicesError("");
    setDevicesLoading(true);

    try {
      const { res, body } = await apiFetch(SESSIONS_ENDPOINT, { method: "GET" });

      if (!res.ok) {
        const msg =
          body?.message ||
          (res.status === 404
            ? "Device management is not available yet. (Backend endpoint missing)"
            : "Failed to load devices/sessions.");
        setDevices([]);
        setDevicesError(msg);
        showToast(msg, res.status === 404 ? "info" : "error");
      } else {
        const list = normalizeSessions(body);
        setDevices(list);
        if (list.length === 0) setDevicesError("No sessions found.");
      }
    } catch (e) {
      console.warn("Sessions fetch failed:", e);
      setDevices([]);
      setDevicesError("Network error loading devices. Please try again.");
      showToast("Network error loading devices. Please try again.", "error");
    } finally {
      setDevicesLoading(false);
    }
  }

  async function refreshDevices() {
    setDevicesError("");
    setDevicesLoading(true);
    try {
      const { res, body } = await apiFetch(SESSIONS_ENDPOINT, { method: "GET" });
      if (!res.ok) {
        const msg = body?.message || "Failed to refresh devices/sessions.";
        setDevicesError(msg);
        showToast(msg, "error");
        return;
      }
      const list = normalizeSessions(body);
      setDevices(list);
      if (list.length === 0) setDevicesError("No sessions found.");
      showToast("Devices refreshed ✅", "success");
    } catch {
      setDevicesError("Network error refreshing devices.");
      showToast("Network error refreshing devices.", "error");
    } finally {
      setDevicesLoading(false);
    }
  }

  async function revokeSession(sessionId) {
  if (!sessionId) {
    showToast("Missing session id.", "error");
    return;
  }

  if (actionLockRef.current) return;
  actionLockRef.current = true;

  setRevokingId(sessionId);

  try {
    const { res, body } = await apiFetch(
      `${SESSIONS_ENDPOINT}/${encodeURIComponent(sessionId)}`,
      { method: "DELETE" }
    );

    if (!res.ok) {
      const msg = body?.message || "Failed to sign out device.";
      showToast(msg, "error");
    } else {
      setDevices((prev) => prev.filter((x) => x.id !== sessionId));
      showToast("Device signed out ✅", "success");
    }
  } catch {
    showToast("Network error signing out device.", "error");
  } finally {
    setRevokingId("");
    actionLockRef.current = false;
  }
  };

  async function revokeOtherSessions() {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    
    setRevokingOthers(true);
    try {
      const { res, body } = await apiFetch(`${SESSIONS_ENDPOINT}/others`, { method: "DELETE" });

      if (!res.ok) {
        const msg =
          body?.message ||
          (res.status === 404
            ? "This feature needs the backend route: DELETE /api/v1/auth/sessions/others"
            : "Failed to sign out other devices.");
        showToast(msg, res.status === 404 ? "info" : "error");
      } else {
        const keep = devices.filter((d) => d.isCurrent);
        setDevices(keep.length ? keep : []);
        showToast("Signed out from other devices ✅", "success");
        if (!keep.length) await refreshDevices();
      }
    } catch {
      showToast("Network error signing out other devices.", "error");
    } finally {
      setRevokingOthers(false);
      actionLockRef.current = false;
    }
  }

  const isActive = me?.isActive !== false;
  const notificationsEnabled = me?.notifications !== false;
  const isUser = (me?.role || "user") === "user";

  return (
    <Page $t={t}>
      <Hero $t={t}>
  <HeroGlow />
  <HeroInner>
    <Badge $t={t}>Private Member Command Center</Badge>
    <Title $t={t}>
      {me?.name ? `${me.name.split(" ")[0]}, this is your power profile.` : "Your power profile starts here."}
    </Title>
    <Subtitle $t={t}>
      Control your identity, security, avatar, socials, support messages, and account settings from one premium dashboard.
    </Subtitle>
  </HeroInner>
</Hero>

      <Content as="form" $t={t} onSubmit={handleSave}>
        <MainGrid>
          {/* PRIMARY OVERVIEW CARD */}
          <Card $t={t}>
            <CardHeader>
              <AvatarColumn>
                <AvatarWrap $t={t}>
                  <Avatar src={avatarUrl} alt={me?.name || "User"} />
                  <StatusDot title={isActive ? "Active account" : "Inactive account"} $active={isActive} />
                </AvatarWrap>

                {editMode && (
                  <AvatarUploadLabel>
                    <AvatarInput
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                    <AvatarUploadText>{avatarFile ? "Photo selected ✅" : "Change photo"}</AvatarUploadText>
                  </AvatarUploadLabel>
                )}
              </AvatarColumn>

              <CardHeadings>
                <Name $t={t}>{me?.name || (loading ? "Loading…" : "No name set")}</Name>
                <Small $t={t}>
                  {(editMode ? form?.headline : me?.headline) || "Add a headline to describe who you are."}
                </Small>
                <Small $t={t}>{me?.name || "Add your full name"}</Small>
              </CardHeadings>

              <HeaderButtons>
                <GhostButton
                  $t={t}
                  type="button"
                  onClick={handleToggleEdit}
                  aria-label={editMode ? "Cancel editing" : "Edit profile"}
                >
                  {editMode ? "Cancel" : "Edit Profile"}
                </GhostButton>

                <LogoutButton $t={t} type="button" onClick={handleLogout} aria-label="Logout">
                  Logout
                  <LogoutShine />
                </LogoutButton>
              </HeaderButtons>
            </CardHeader>

            <Divider />

            <InfoGrid>
              <InfoItem>
                <InfoLabel $t={t}>Role</InfoLabel>
                <InfoValue $t={t}>{me?.role || "user"}</InfoValue>
              </InfoItem>

              <InfoItem>
                <InfoLabel $t={t}>Joined</InfoLabel>
                <InfoValue $t={t}>{joinedDate || "—"}</InfoValue>
              </InfoItem>

              <InfoItem>
                <InfoLabel $t={t}>User ID</InfoLabel>
                <InfoMono $t={t}>{me?._id || "—"}</InfoMono>
              </InfoItem>

              <InfoItem>
                <InfoLabel $t={t}>Notifications</InfoLabel>
                <Pill $t={t}>
                  {editMode
                    ? (form?.notifications ?? me?.notifications !== false)
                      ? "On · Important & updates"
                      : "Off"
                    : notificationsEnabled
                    ? "On · Important & updates"
                    : "Off"}
                </Pill>
              </InfoItem>
            </InfoGrid>
          </Card>

          {/* MY MESSAGES (only show for normal users) */}
          {isUser && (
            <Card $t={t}>
              <SectionTitleRow>
                <SectionTitle $t={t}>Support Inbox</SectionTitle>
                <SupportPill $t={t} $hot={support.hasAdminReply}>
                  {support.loading ? "Checking…" : `${support.count} thread(s)`}
                </SupportPill>
              </SectionTitleRow>

              <SupportBody>
                <SupportLine $t={t}>
                  <SupportLabel $t={t}>Status</SupportLabel>
                  <SupportValue $t={t}>
                    {support.loading
                      ? "Loading your messages…"
                      : support.count === 0
                      ? "No tickets yet"
                      : support.hasAdminReply
                      ? "Support replied ✅"
                      : "No new replies yet"}
                  </SupportValue>
                </SupportLine>

                <SupportLine $t={t}>
                  <SupportLabel $t={t}>Latest</SupportLabel>
                  <SupportValue $t={t}>
                    {support.count === 0
                      ? "—"
                      : `${support.lastSubject || "Support Ticket"} • ${fmtTime(support.lastUpdatedAt) || "—"}`}
                  </SupportValue>
                </SupportLine>

                <SupportActions>
                  <PrimaryButton $t={t} type="button" onClick={() => navigate("/my-messages")}>
                    Open My Messages
                  </PrimaryButton>

                  <GhostButton
                    $t={t}
                    type="button"
                    onClick={async () => {
                      setSupport((p) => ({ ...p, loading: true }));
                      try {
                        const { res, body } = await apiFetch(MY_CONTACTS_ENDPOINT, { method: "GET" });
                        if (res.ok) {
                          const items = Array.isArray(body?.items) ? body.items : [];
                          const newest = items[0] || null;
                          setSupport({
                            loading: false,
                            count: items.length,
                            hasAdminReply: items.some((x) => x?.replied === true),
                            lastUpdatedAt: newest?.updatedAt || newest?.createdAt || "",
                            lastSubject: newest?.subject || "",
                          });
                          showToast("Inbox refreshed ✅", "success");
                        } else {
                          setSupport((p) => ({ ...p, loading: false }));
                        }
                      } catch {
                        setSupport((p) => ({ ...p, loading: false }));
                      }
                    }}
                  >
                    Refresh
                  </GhostButton>
                </SupportActions>

                <SupportHint $t={t}>
                  For privacy, your support replies are inside your account. Use <b>My Messages</b> to view and respond.
                </SupportHint>
              </SupportBody>
            </Card>
          )}

          {/* CONTACT CARD */}
          <Card $t={t}>
            <SectionTitle $t={t}>Contact & Location</SectionTitle>
            <Rows>
              <Row>
                <RowLabel $t={t}>Email</RowLabel>
                <RowValue $t={t}>
                  {editMode ? (
                    <FieldInput
                      $t={t}
                      type="email"
                      name="email"
                      value={form?.email ?? me?.email ?? ""}
                      onChange={handleChange}
                    />
                  ) : (
                    me?.email || "—"
                  )}
                </RowValue>
              </Row>

              <Row>
                <RowLabel $t={t}>Phone</RowLabel>
                <RowValue $t={t}>
                  {editMode ? (
                    <FieldInput
                      $t={t}
                      type="tel"
                      name="phone"
                      value={form?.phone ?? me?.phone ?? ""}
                      onChange={handleChange}
                    />
                  ) : (
                    me?.phone || "Add your phone number"
                  )}
                </RowValue>
              </Row>

              <Row>
                <RowLabel $t={t}>Location</RowLabel>
                <RowValue $t={t}>
                  {editMode ? (
                    <FieldInput
                      $t={t}
                      type="text"
                      name="location"
                      value={form?.location ?? me?.location ?? ""}
                      onChange={handleChange}
                    />
                  ) : (
                    me?.location || "Add your city and country"
                  )}
                </RowValue>
              </Row>

              <Row>
                <RowLabel $t={t}>Website</RowLabel>
                <RowValue $t={t}>
                  {editMode ? (
                    <FieldInput
                      $t={t}
                      type="url"
                      name="website"
                      value={form?.website ?? me?.website ?? ""}
                      onChange={handleChange}
                    />
                  ) : me?.website ? (
                    <a
                      href={me.website}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "inherit", textDecoration: "underline" }}
                    >
                      {me.website}
                    </a>
                  ) : (
                    "Add your personal or business website"
                  )}
                </RowValue>
              </Row>
            </Rows>
          </Card>

          {/* SECURITY / ACCOUNT CARD */}
          <Card $t={t}>
            <SectionTitle $t={t}>Account</SectionTitle>
            <Rows>
              <Row>
                <RowLabel $t={t}>Account Status</RowLabel>
                <RowValue $t={t}>{isActive ? "Active" : "Inactive"}</RowValue>
              </Row>
              <Row>
                <RowLabel $t={t}>Last Updated</RowLabel>
                <RowValue $t={t}>{updatedDateTime || "—"}</RowValue>
              </Row>
            </Rows>

            <Actions>
              <GhostButton $t={t} type="button" onClick={() => dispatch(togglePasswordPanel())}>
                {showPassword ? "Close Password" : "Change Password"}
              </GhostButton>

              <GhostButton $t={t} type="button" onClick={openManageDevices}>
                Manage Devices
              </GhostButton>
            </Actions>

            {showPassword && (
              <PasswordPanel $t={t}>
                <PasswordTitle $t={t}>Change Password</PasswordTitle>

                <PasswordGrid>
                  <div>
                    <PasswordLabel $t={t}>Current Password</PasswordLabel>
                    <FieldInput
                      $t={t}
                      type="password"
                      name="currentPassword"
                      value={pw?.currentPassword || ""}
                      onChange={handlePwChange}
                      autoComplete="current-password"
                    />
                  </div>

                  <div>
                    <PasswordLabel $t={t}>New Password</PasswordLabel>
                    <FieldInput
                      $t={t}
                      type="password"
                      name="newPassword"
                      value={pw?.newPassword || ""}
                      onChange={handlePwChange}
                      autoComplete="new-password"
                    />
                  </div>

                  <div>
                    <PasswordLabel $t={t}>Confirm New Password</PasswordLabel>
                    <FieldInput
                      $t={t}
                      type="password"
                      name="confirmNewPassword"
                      value={pw?.confirmNewPassword || ""}
                      onChange={handlePwChange}
                      autoComplete="new-password"
                    />
                  </div>
                </PasswordGrid>

                <PasswordActions>
                  {pwError ? <PasswordError>{pwError}</PasswordError> : null}

                  <GhostButton
                    $t={t}
                    type="button"
                    onClick={() => {
                      dispatch(resetPassword());
                      dispatch(togglePasswordPanel());
                    }}
                  >
                    Cancel
                  </GhostButton>

                  <SaveButton $t={t} type="button" disabled={pwSaving} onClick={handleChangePassword}>
                    {pwSaving ? "Updating…" : "Update Password"}
                  </SaveButton>
                </PasswordActions>
              </PasswordPanel>
            )}
          </Card>

          {/* PROFILE + SOCIAL + PREFERENCES */}
          <WideCard $t={t}>
            <SectionTitle $t={t}>Profile & Preferences</SectionTitle>

            <BioBlock $t={t}>
              {editMode ? (
                <>
                  <FieldInput
                    $t={t}
                    type="text"
                    name="headline"
                    placeholder="Headline"
                    value={form?.headline ?? me?.headline ?? ""}
                    onChange={handleChange}
                    style={{ marginBottom: 8 }}
                  />
                  <BioTextArea
                    $t={t}
                    name="bio"
                    placeholder="Tell people who you are, what you do, and what they get when they work with you."
                    value={form?.bio ?? me?.bio ?? ""}
                    onChange={handleChange}
                    rows={4}
                  />
                </>
              ) : (
                <>
                  <HeadlineText $t={t}>{me?.headline || "Craft a strong headline to introduce yourself."}</HeadlineText>
                  <BioText $t={t}>
                    {me?.bio ||
                      "Tell people who you are, what you do, and what they get when they work with you. This is your mini elevator pitch."}
                  </BioText>
                </>
              )}
            </BioBlock>

            {editMode ? (
              <SocialEditGrid>
                <SocialEditRow>
                  <SocialEditLabel>Instagram</SocialEditLabel>
                  <FieldInput
                    $t={t}
                    type="url"
                    name="instagram"
                    value={form?.instagram ?? me?.instagram ?? ""}
                    onChange={handleChange}
                    placeholder="https://instagram.com/your-handle"
                  />
                </SocialEditRow>

                <SocialEditRow>
                  <SocialEditLabel>TikTok</SocialEditLabel>
                  <FieldInput
                    $t={t}
                    type="url"
                    name="tiktok"
                    value={form?.tiktok ?? me?.tiktok ?? ""}
                    onChange={handleChange}
                    placeholder="https://www.tiktok.com/@your-handle"
                  />
                </SocialEditRow>

                <SocialEditRow>
                  <SocialEditLabel>YouTube</SocialEditLabel>
                  <FieldInput
                    $t={t}
                    type="url"
                    name="youtube"
                    value={form?.youtube ?? me?.youtube ?? ""}
                    onChange={handleChange}
                    placeholder="https://youtube.com/@your-channel"
                  />
                </SocialEditRow>

                <SocialEditRow>
                  <SocialEditLabel>X (Twitter)</SocialEditLabel>
                  <FieldInput
                    $t={t}
                    type="url"
                    name="xhandle"
                    value={form?.xhandle ?? me?.xhandle ?? ""}
                    onChange={handleChange}
                    placeholder="https://x.com/your-handle"
                  />
                </SocialEditRow>
              </SocialEditGrid>
            ) : socialLinks.length > 0 ? (
              <SocialGrid>
                {socialLinks.map((link) => (
                  <SocialLink key={link.label} href={link.value} target="_blank" rel="noreferrer" $t={t}>
                    <SocialLabel>{link.label}</SocialLabel>
                    <SocialValue>{link.value}</SocialValue>
                  </SocialLink>
                ))}
              </SocialGrid>
            ) : (
              <SocialPlaceholder $t={t}>
                Add your website and social links so clients and followers can find you instantly.
              </SocialPlaceholder>
            )}

            <PrefGrid>
              <PrefItem $t={t}>
                <PrefLabel $t={t}>Theme</PrefLabel>
                <PrefValue $t={t}>System</PrefValue>
              </PrefItem>

              <PrefItem $t={t}>
                <PrefLabel $t={t}>Notifications</PrefLabel>
                <PrefValue $t={t}>
                  {editMode ? (
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        name="notifications"
                        checked={!!(form?.notifications ?? me?.notifications !== false)}
                        onChange={handleChange}
                      />
                      <span>Enable important updates</span>
                    </label>
                  ) : notificationsEnabled ? (
                    "Enabled"
                  ) : (
                    "Disabled"
                  )}
                </PrefValue>
              </PrefItem>

              <PrefItem $t={t}>
                <PrefLabel $t={t}>Language</PrefLabel>
                <PrefValue $t={t}>English</PrefValue>
              </PrefItem>
            </PrefGrid>

            {editMode && (
              <SaveActions>
                {saveError ? <SaveError>{saveError}</SaveError> : null}

                <GhostButton
                  $t={t}
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    resetFormFromMe();
                    dispatch(setUserEditMode(false));
                    showToast("Edits discarded.", "info");
                  }}
                >
                  Cancel
                </GhostButton>

                <SaveButton $t={t} type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </SaveButton>
              </SaveActions>
            )}
          </WideCard>
        </MainGrid>

        {error ? <ErrorNote $t={t}>{error}</ErrorNote> : null}
        {loading ? <Loading $t={t}>Loading your profile…</Loading> : null}
      </Content>

      {/* ✅ Manage Devices Modal */}
      {devicesOpen && (
        <ModalOverlay
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDevicesOpen(false);
          }}
        >
          <ModalCard $t={t}>
            <ModalHeader>
              <ModalTitle $t={t}>Manage Devices</ModalTitle>
              <ModalClose
                $t={t}
                type="button"
                onClick={() => setDevicesOpen(false)}
                aria-label="Close device manager"
              >
                ✕
              </ModalClose>
            </ModalHeader>

            <ModalSub $t={t}>Review active sessions and sign out devices you don’t recognize.</ModalSub>

            <ModalActions>
              <GhostButton $t={t} type="button" onClick={refreshDevices} disabled={devicesLoading}>
                {devicesLoading ? "Refreshing…" : "Refresh"}
              </GhostButton>

              <DangerButton
                $t={t}
                type="button"
                onClick={revokeOtherSessions}
                disabled={devicesLoading || revokingOthers}
                title="Signs out from all other devices (keeps this session)"
              >
                {revokingOthers ? "Signing out…" : "Sign Out Other Devices"}
              </DangerButton>
            </ModalActions>

            {devicesLoading ? <ModalNote $t={t}>Loading devices/sessions…</ModalNote> : null}
            {!devicesLoading && devicesError ? <ModalError>{devicesError}</ModalError> : null}

            {!devicesLoading && !devicesError ? (
              <DeviceList>
                {devices.length === 0 ? (
                  <DeviceEmpty $t={t}>No devices to show right now.</DeviceEmpty>
                ) : (
                  devices.map((d) => (
                    <DeviceRow key={d.id || `${d.deviceLabel}-${d.createdAt}`}>
                      <DeviceLeft>
                        <DeviceTop>
                          <DeviceName $t={t}>
                            {d.deviceLabel}
                            {d.isCurrent ? <CurrentPill>Current</CurrentPill> : null}
                          </DeviceName>
                          <DeviceMeta $t={t}>
                            {d.ip ? `IP: ${d.ip}` : "IP: —"}
                            {d.location ? ` • ${d.location}` : ""}
                          </DeviceMeta>
                        </DeviceTop>

                        <DeviceMeta $t={t}>
                          Last active: {fmtTime(d.lastActiveAt) || "—"} {"  "}•{"  "}
                          Signed in: {fmtTime(d.createdAt) || "—"}
                        </DeviceMeta>
                      </DeviceLeft>

                      <DeviceRight>
                        <MiniButton
                          $t={t}
                          type="button"
                          onClick={() => {
                            if (d.isCurrent) {
                              showToast("That’s your current device/session.", "info");
                              return;
                            }
                            revokeSession(d.id);
                          }}
                          disabled={revokingId === d.id || d.isCurrent}
                          title={d.isCurrent ? "Cannot sign out current session here" : "Sign out this device"}
                        >
                          {d.isCurrent ? "Current" : revokingId === d.id ? "Signing out…" : "Sign Out"}
                        </MiniButton>
                      </DeviceRight>
                    </DeviceRow>
                  ))
                )}
              </DeviceList>
            ) : null}

            <ModalHint $t={t}>
              If you see a device you don’t recognize, sign it out immediately and change your password.
            </ModalHint>
          </ModalCard>
        </ModalOverlay>
      )}

      {/* ✅ Toast (TOP RIGHT) */}
      {toast.visible && (
        <ToastContainer $type={toast.type}>
          <ToastMessage>{toast.message}</ToastMessage>
        </ToastContainer>
      )}
    </Page>
  );
}

/* ====== LUXURY PREMIUM STYLES ====== */

const Page = styled.div`
  min-height: 100svh;
  background:
    radial-gradient(900px 460px at 8% -8%, rgba(214, 182, 159, 0.2), transparent 62%),
    radial-gradient(780px 420px at 105% 8%, rgba(255, 249, 242, 0.1), transparent 60%),
    linear-gradient(145deg, #000 0%, ${({ $t }) => $t.colors.darkBrown} 42%, ${({ $t }) => $t.colors.cocoa} 100%);
  color: ${({ $t }) => $t.colors.ivory};
`;

const Hero = styled.header`
  position: relative;
  padding: 92px 24px 56px;
  overflow: hidden;

  @media (max-width: 640px) {
    padding: 64px 16px 36px;
  }
`;

const HeroGlow = styled.div`
  position: absolute;
  inset: -30%;
  background:
    radial-gradient(circle at 20% 20%, rgba(214, 182, 159, 0.26), transparent 34%),
    radial-gradient(circle at 80% 10%, rgba(255, 249, 242, 0.12), transparent 30%);
  filter: blur(44px);
  pointer-events: none;
`;

const HeroInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 15px;
  border-radius: 999px;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 900;
  color: ${({ $t }) => $t.colors.lightBrown};
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(214, 182, 159, 0.28);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
`;

const Title = styled.h1`
  margin: 16px 0 12px;
  max-width: 950px;
  font-size: clamp(2.45rem, 6vw, 5.4rem);
  line-height: 0.92;
  letter-spacing: -0.075em;
  font-weight: 950;
  text-transform: uppercase;
  color: ${({ $t }) => $t.colors.ivory};
  text-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
`;

const Subtitle = styled.p`
  color: rgba(255, 249, 242, 0.78);
  max-width: 760px;
  font-size: clamp(0.98rem, 1.6vw, 1.14rem);
  line-height: 1.75;
`;

const Content = styled.main`
  max-width: ${({ $t }) => $t.layout?.max || "1200px"};
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 640px) {
    padding: 16px;
  }
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 22px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const CardBase = styled.section`
  position: relative;
  border-radius: ${({ $t }) => $t.radius.xl};
  background:
    linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035)),
    linear-gradient(145deg, rgba(90, 56, 37, 0.92), rgba(0, 0, 0, 0.72));
  box-shadow: ${({ $t }) => $t.shadow.glow};
  border: 1px solid rgba(214, 182, 159, 0.16);
  overflow: hidden;
  backdrop-filter: blur(14px);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(135deg, rgba(255,255,255,0.12), transparent 28%),
      radial-gradient(circle at 15% 0%, rgba(214,182,159,0.16), transparent 34%);
    opacity: 0.75;
  }

  &:hover {
    transform: translateY(-3px);
    border-color: rgba(214, 182, 159, 0.34);
    box-shadow: ${({ $t }) => $t.shadow.hard};
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

const Card = styled(CardBase)`
  padding: 24px;
`;

const WideCard = styled(CardBase)`
  grid-column: 1 / -1;
  padding: 24px;
`;

const CardHeader = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 18px;
  align-items: center;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const AvatarColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const AvatarWrap = styled.div`
  position: relative;
  width: 94px;
  height: 94px;
  border-radius: 28px;
  background: ${({ $t }) => $t.colors.black};
  box-shadow:
    0 18px 46px rgba(0,0,0,0.38),
    inset 0 0 0 1px rgba(214,182,159,0.22);
  overflow: hidden;
`;

const Avatar = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const StatusDot = styled.span`
  position: absolute;
  right: 9px;
  bottom: 9px;
  width: 15px;
  height: 15px;
  border-radius: 999px;
  background: ${({ $active }) => ($active ? "#2ecc71" : "#e74c3c")};
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.45), 0 0 20px ${({ $active }) => ($active ? "rgba(46,204,113,.7)" : "rgba(231,76,60,.7)")};
`;

const AvatarUploadLabel = styled.label`
  font-size: 12px;
  cursor: pointer;
  opacity: 0.9;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.lightBrown};
  font-weight: 800;
`;

const AvatarInput = styled.input`
  display: none;
`;

const AvatarUploadText = styled.span`
  text-decoration: underline;
`;

const CardHeadings = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
`;

const Name = styled.h2`
  font-size: clamp(1.35rem, 2.6vw, 2rem);
  font-weight: 950;
  color: ${({ $t }) => $t.colors.ivory};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.04em;
`;

const Small = styled.span`
  color: rgba(255, 249, 242, 0.74);
  font-size: 14px;
  line-height: 1.45;
`;

const HeaderButtons = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;

  @media (max-width: 720px) {
    justify-content: flex-start;
  }
`;

const LogoutButton = styled.button`
  position: relative;
  border: 0;
  outline: 0;
  cursor: pointer;
  padding: 12px 17px;
  border-radius: ${({ $t }) => $t.radius.pill};
  color: ${({ $t }) => $t.colors.black};
  background:
    radial-gradient(120% 160% at 10% 0%, ${({ $t }) => $t.colors.ivory}, ${({ $t }) => $t.colors.lightBrown} 45%, ${({ $t }) => $t.colors.brown});
  font-weight: 950;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: transform 0.18s ease, box-shadow 0.25s ease;
  box-shadow: 0 14px 34px rgba(214, 182, 159, 0.23);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 46px rgba(214, 182, 159, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const LogoutShine = styled.span`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0) 42%);
  mix-blend-mode: screen;
  opacity: 0.35;
`;

const Divider = styled.hr`
  border: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(214, 182, 159, 0.28), transparent);
  margin: 18px 0 14px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(214, 182, 159, 0.12);
  padding: 15px;
  border-radius: 18px;
`;

const InfoLabel = styled.div`
  font-size: 11px;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  opacity: 0.72;
  margin-bottom: 7px;
  color: ${({ $t }) => $t.colors.lightBrown};
  font-weight: 900;
`;

const InfoValue = styled.div`
  font-size: 15px;
  font-weight: 850;
  color: ${({ $t }) => $t.colors.white};
`;

const InfoMono = styled.code`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: ${({ $t }) => $t.colors.ivory};
  opacity: 0.95;
  word-break: break-all;
`;

const Pill = styled.span`
  display: inline-block;
  padding: 7px 11px;
  border-radius: 999px;
  background: rgba(214, 182, 159, 0.14);
  border: 1px solid rgba(214, 182, 159, 0.34);
  color: ${({ $t }) => $t.colors.lightBrown};
  font-weight: 900;
  font-size: 12px;
`;

const SectionTitle = styled.h3`
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  opacity: 0.95;
  color: ${({ $t }) => $t.colors.lightBrown};
  margin-bottom: 12px;
  font-weight: 950;
`;

const SectionTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const SupportPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 11px;
  border-radius: 999px;
  font-weight: 900;
  font-size: 12px;
  color: ${({ $t }) => $t.colors.ivory};
  background: ${({ $hot }) => ($hot ? "rgba(46, 204, 113, 0.16)" : "rgba(255,255,255,0.06)")};
  border: 1px solid ${({ $hot }) => ($hot ? "rgba(46, 204, 113, 0.38)" : "rgba(255,255,255,0.10)")};
`;

const SupportBody = styled.div`
  margin-top: 6px;
  display: grid;
  gap: 10px;
`;

const SupportLine = styled.div`
  padding: 13px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.26);
  border: 1px solid rgba(214, 182, 159, 0.1);
  display: grid;
  gap: 6px;
`;

const SupportLabel = styled.div`
  opacity: 0.75;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ $t }) => $t.colors.lightBrown};
  font-weight: 900;
`;

const SupportValue = styled.div`
  color: ${({ $t }) => $t.colors.white};
  font-weight: 750;
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
`;

const SupportActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 2px;
`;

const PrimaryButton = styled.button`
  border: 0;
  outline: 0;
  cursor: pointer;
  padding: 11px 15px;
  border-radius: ${({ $t }) => $t.radius.pill};
  color: ${({ $t }) => $t.colors.black};
  background: ${({ $t }) => $t.colors.lightBrown};
  font-weight: 950;
  box-shadow: 0 12px 28px rgba(214, 182, 159, 0.22);
  transition: transform 0.2s ease, filter 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    filter: brightness(1.05);
  }
`;

const SupportHint = styled.p`
  margin: 2px 0 0;
  font-size: 13px;
  opacity: 0.82;
  color: ${({ $t }) => $t.colors.ivory};
  line-height: 1.55;
`;

const Rows = styled.div`
  display: grid;
  gap: 10px;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 12px;
  padding: 13px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.26);
  border: 1px solid rgba(214, 182, 159, 0.1);

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const RowLabel = styled.div`
  opacity: 0.78;
  color: ${({ $t }) => $t.colors.lightBrown};
  font-weight: 900;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const RowValue = styled.div`
  color: ${({ $t }) => $t.colors.white};
  word-break: break-word;
  font-weight: 650;
`;

const FieldInput = styled.input`
  width: 100%;
  padding: 11px 12px;
  border-radius: 13px;
  border: 1px solid rgba(214, 182, 159, 0.2);
  background: rgba(0, 0, 0, 0.35);
  color: ${({ $t }) => $t.colors.ivory};
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.12s ease;

  &:focus {
    border-color: rgba(214, 182, 159, 0.95);
    box-shadow: 0 0 0 4px rgba(214, 182, 159, 0.13);
    transform: translateY(-1px);
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
`;

const GhostButton = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.2);
  background: rgba(255,255,255,0.035);
  color: ${({ $t }) => $t.colors.ivory};
  padding: 11px 15px;
  border-radius: ${({ $t }) => $t.radius.pill};
  cursor: pointer;
  font-weight: 850;
  transition: background 0.22s ease, transform 0.18s ease, border-color 0.22s ease;

  &:hover:enabled {
    background: rgba(214, 182, 159, 0.11);
    border-color: rgba(214, 182, 159, 0.42);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.65;
    cursor: default;
  }
`;

const BioBlock = styled.div`
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.26);
  border: 1px solid rgba(214, 182, 159, 0.1);
`;

const HeadlineText = styled.h4`
  font-size: 18px;
  font-weight: 950;
  color: ${({ $t }) => $t.colors.ivory};
  margin-bottom: 7px;
  letter-spacing: -0.02em;
`;

const BioText = styled.p`
  font-size: 14px;
  color: rgba(255, 249, 242, 0.82);
  line-height: 1.65;
`;

const BioTextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(214, 182, 159, 0.2);
  background: rgba(0, 0, 0, 0.35);
  color: ${({ $t }) => $t.colors.ivory};
  font-size: 14px;
  outline: none;
  resize: vertical;

  &:focus {
    border-color: rgba(214, 182, 159, 0.95);
    box-shadow: 0 0 0 4px rgba(214, 182, 159, 0.13);
  }
`;

const SocialGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const SocialLink = styled.a`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 13px;
  border-radius: 999px;
  border: 1px solid rgba(214, 182, 159, 0.14);
  background: rgba(0, 0, 0, 0.28);
  color: ${({ $t }) => $t.colors.ivory};
  font-size: 13px;
  text-decoration: none;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  transition: background 0.22s ease, transform 0.18s ease, border-color 0.22s ease;

  &:hover {
    background: rgba(214, 182, 159, 0.1);
    border-color: rgba(214, 182, 159, 0.34);
    transform: translateY(-1px);
  }
`;

const SocialLabel = styled.span`
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 11px;
  opacity: 0.8;
  font-weight: 900;
`;

const SocialValue = styled.span`
  font-weight: 650;
  opacity: 0.95;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SocialPlaceholder = styled.p`
  margin-bottom: 18px;
  font-size: 13px;
  color: rgba(255, 249, 242, 0.75);
  line-height: 1.55;
`;

const SocialEditGrid = styled.div`
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
`;

const SocialEditRow = styled.div`
  display: grid;
  gap: 6px;
`;

const SocialEditLabel = styled.div`
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.82;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const PrefGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const PrefItem = styled.div`
  background: rgba(0, 0, 0, 0.26);
  border: 1px solid rgba(214, 182, 159, 0.1);
  border-radius: 18px;
  padding: 15px;
`;

const PrefLabel = styled.div`
  opacity: 0.78;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ $t }) => $t.colors.lightBrown};
  margin-bottom: 7px;
  font-weight: 900;
`;

const PrefValue = styled.div`
  color: ${({ $t }) => $t.colors.white};
  font-weight: 750;
`;

const SaveActions = styled.div`
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
`;

const SaveButton = styled.button`
  border: 0;
  outline: 0;
  cursor: pointer;
  padding: 11px 19px;
  border-radius: ${({ $t }) => $t.radius.pill};
  color: ${({ $t }) => $t.colors.black};
  background:
    radial-gradient(120% 160% at 10% 0%, ${({ $t }) => $t.colors.ivory}, ${({ $t }) => $t.colors.lightBrown} 48%, ${({ $t }) => $t.colors.brown});
  font-weight: 950;
  box-shadow: 0 14px 32px rgba(214, 182, 159, 0.24);
  transition: transform 0.2s ease, box-shadow 0.25s ease;
  min-width: 145px;

  &:hover:enabled {
    transform: translateY(-2px);
    box-shadow: 0 20px 46px rgba(214, 182, 159, 0.31);
  }

  &:disabled {
    opacity: 0.68;
    cursor: default;
  }
`;

const SaveError = styled.div`
  font-size: 13px;
  color: #ffb4b4;
  font-weight: 750;
`;

const ErrorNote = styled.div`
  margin-top: 16px;
  padding: 13px 15px;
  border-radius: 16px;
  border: 1px solid rgba(255, 0, 0, 0.22);
  background: rgba(255, 0, 0, 0.07);
  color: #ffb4b4;
  font-weight: 750;
`;

const Loading = styled.div`
  margin-top: 12px;
  opacity: 0.82;
  color: ${({ $t }) => $t.colors.ivory};
`;

const PasswordPanel = styled.div`
  margin-top: 14px;
  padding: 15px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.26);
  border: 1px solid rgba(214, 182, 159, 0.1);
`;

const PasswordTitle = styled.h4`
  margin: 0 0 10px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  opacity: 0.95;
  color: ${({ $t }) => $t.colors.lightBrown};
  font-weight: 950;
`;

const PasswordGrid = styled.div`
  display: grid;
  gap: 10px;
`;

const PasswordLabel = styled.div`
  opacity: 0.78;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ $t }) => $t.colors.lightBrown};
  font-weight: 900;
  margin-bottom: 6px;
`;

const PasswordActions = styled.div`
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
`;

const PasswordError = styled.div`
  margin-right: auto;
  font-size: 13px;
  color: #ffb4b4;
  font-weight: 800;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9990;
  background: rgba(0, 0, 0, 0.68);
  backdrop-filter: blur(10px);
  display: grid;
  place-items: center;
  padding: 18px;
`;

const ModalCard = styled.div`
  width: min(860px, 100%);
  border-radius: 28px;
  overflow: hidden;
  border: 1px solid rgba(214, 182, 159, 0.18);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.035)),
    linear-gradient(145deg, ${({ $t }) => $t.colors.brown} 0%, ${({ $t }) => $t.colors.cocoa} 100%);
  box-shadow: ${({ $t }) => $t.shadow.hard};
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 10px;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${({ $t }) => $t.colors.lightBrown};
  font-weight: 950;
`;

const ModalClose = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.18);
  background: rgba(0, 0, 0, 0.28);
  color: ${({ $t }) => $t.colors.ivory};
  border-radius: 999px;
  width: 38px;
  height: 38px;
  cursor: pointer;

  &:hover {
    background: rgba(214, 182, 159, 0.11);
  }
`;

const ModalSub = styled.p`
  margin: 0;
  padding: 0 20px 14px;
  color: rgba(255, 249, 242, 0.76);
  font-size: 13px;
`;

const ModalActions = styled.div`
  padding: 0 20px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
`;

const DangerButton = styled.button`
  border: 1px solid rgba(231, 76, 60, 0.36);
  background: rgba(231, 76, 60, 0.18);
  color: #ffd1d1;
  padding: 11px 15px;
  border-radius: ${({ $t }) => $t.radius.pill};
  cursor: pointer;
  font-weight: 850;

  &:hover:enabled {
    background: rgba(231, 76, 60, 0.25);
  }

  &:disabled {
    opacity: 0.65;
    cursor: default;
  }
`;

const DeviceList = styled.div`
  padding: 0 20px 14px;
  display: grid;
  gap: 10px;
`;

const DeviceRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 13px;
  border-radius: 18px;
  background: rgba(0, 0, 0, 0.26);
  border: 1px solid rgba(214, 182, 159, 0.1);

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const DeviceLeft = styled.div`
  display: grid;
  gap: 6px;
  min-width: 0;
`;

const DeviceRight = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;

  @media (max-width: 620px) {
    justify-content: flex-start;
  }
`;

const DeviceTop = styled.div`
  display: grid;
  gap: 4px;
`;

const DeviceName = styled.div`
  color: ${({ $t }) => $t.colors.white};
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  word-break: break-word;
`;

const CurrentPill = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 950;
  color: rgba(46, 204, 113, 1);
  background: rgba(46, 204, 113, 0.15);
  border: 1px solid rgba(46, 204, 113, 0.35);
`;

const DeviceMeta = styled.div`
  color: rgba(255, 249, 242, 0.74);
  font-size: 12px;
  line-height: 1.4;
  word-break: break-word;
`;

const MiniButton = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.18);
  background: rgba(0, 0, 0, 0.28);
  color: ${({ $t }) => $t.colors.ivory};
  padding: 10px 13px;
  border-radius: ${({ $t }) => $t.radius.pill};
  cursor: pointer;
  font-weight: 850;

  &:hover:enabled {
    background: rgba(214, 182, 159, 0.1);
  }

  &:disabled {
    opacity: 0.65;
    cursor: default;
  }
`;

const DeviceEmpty = styled.div`
  padding: 14px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.26);
  border: 1px solid rgba(214, 182, 159, 0.1);
  color: ${({ $t }) => $t.colors.ivory};
  opacity: 0.85;
`;

const ModalNote = styled.div`
  padding: 0 20px 12px;
  color: ${({ $t }) => $t.colors.ivory};
  opacity: 0.85;
`;

const ModalError = styled.div`
  margin: 0 20px 12px;
  padding: 13px 15px;
  border-radius: 16px;
  border: 1px solid rgba(255, 0, 0, 0.22);
  background: rgba(255, 0, 0, 0.07);
  color: #ffb4b4;
  font-weight: 750;
  font-size: 13px;
`;

const ModalHint = styled.p`
  margin: 0;
  padding: 0 20px 20px;
  font-size: 12.5px;
  color: rgba(255, 249, 242, 0.74);
  line-height: 1.5;
`;

const ToastContainer = styled.div`
  position: fixed;
  right: 16px;
  top: 16px;
  bottom: auto;
  padding-top: env(safe-area-inset-top);
  z-index: 9999;
  padding: 13px 17px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${({ $type }) =>
    $type === "success"
      ? "rgba(46, 204, 113, 0.95)"
      : $type === "error"
      ? "rgba(231, 76, 60, 0.95)"
      : "rgba(47, 27, 18, 0.96)"};
  color: #ffffff;
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(10px);
  font-size: 14px;
`;

const ToastMessage = styled.span`
  font-weight: 800;
`;