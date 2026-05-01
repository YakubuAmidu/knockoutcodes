// AdminProfile.jsx
import { useMemo, useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import { useToast } from "../components/Toast.jsx"; // ✅ global toast

// ✅ Redux hooks
import { useDispatch, useSelector } from "react-redux";

// ✅ Your existing actions (DO NOT rewrite)
import {
  userMeRequest,
  userMeSuccess,
  userMeFail,
  resetUserForm,
  updateUserForm,
  userSaveRequest,
  userSaveSuccess,
  userSaveFail,
  setAvatarFile,
  clearAvatar,
} from "../reducers/user/userActions.js";
import axiosInstance from "../../utils/axiosInstance.js";

/**
 * KnockoutCodes — Admin Profile (Redux + Persistence)
 * - Fetches real admin info from backend (/api/v1/users/me)
 * - Saves profile via PATCH /api/v1/users/me
 * - Uploads avatar via POST /api/v1/users/me/avatar
 * - Persists to localStorage so refresh keeps user + image
 */

// ===== Base URLs (used) =====
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://api.knockoutcodes.com";

const ME_ENDPOINT = "/api/v1/users/me";

// ✅ Same avatar endpoint pattern as your UserProfile
const AVATAR_ENDPOINT = "/api/v1/users/me/avatar";

// ✅ Cache key (same idea as UserProfile)
const ME_CACHE_KEY = "kc_me";

// ===== Brand Theme Fallback =====
const FallbackTheme = {
  colors: {
    darkBrown: "#2F1B12",
    brown: "#5A3825",
    lightBrown: "#D6B69F",
    black: "#000000",
    white: "#FFFFFF",
    ivory: "#FFF9F2",
    cocoa: "#3D261A",
    glass: "rgba(255,255,255,0.06)",
  },
  radius: { sm: "10px", md: "16px", lg: "22px", xl: "28px", pill: "999px" },
  shadow: {
    soft: "0 10px 30px rgba(0,0,0,0.18)",
    hard: "0 18px 44px rgba(0,0,0,0.28)",
    glow: "0 0 0 1px rgba(255,255,255,0.08), 0 16px 40px rgba(45, 18, 8, 0.35)",
  },
  layout: { max: "1200px", gutter: "92vw" },
};

// ===== Helpers =====
const useBrand = (theme) =>
  useMemo(
    () => ({
      ...FallbackTheme,
      ...(theme || {}),
      colors: { ...FallbackTheme.colors, ...(theme?.colors || {}) },
      radius: { ...FallbackTheme.radius, ...(theme?.radius || {}) },
      shadow: { ...FallbackTheme.shadow, ...(theme?.shadow || {}) },
      layout: { ...FallbackTheme.layout, ...(theme?.layout || {}) },
    }),
    [theme]
  );

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function persistMe(user) {
  try {
    if (!user) return;
    localStorage.setItem(ME_CACHE_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
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

// ===== Keyframes =====
const rise = keyframes`
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
`;
const pulseGlow = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(214,182,159,0.45); }
  70%  { box-shadow: 0 0 0 14px rgba(214,182,159,0); }
  100% { box-shadow: 0 0 0 0 rgba(214,182,159,0); }
`;

// ===== Styled =====
const Wrap = styled.div`
  --darkBrown: ${({ theme }) => theme?.colors?.darkBrown || FallbackTheme.colors.darkBrown};
  --brown: ${({ theme }) => theme?.colors?.brown || FallbackTheme.colors.brown};
  --light: ${({ theme }) => theme?.colors?.lightBrown || FallbackTheme.colors.lightBrown};
  --black: ${({ theme }) => theme?.colors?.black || FallbackTheme.colors.black};
  --white: ${({ theme }) => theme?.colors?.white || FallbackTheme.colors.white};
  --ivory: ${({ theme }) => theme?.colors?.ivory || FallbackTheme.colors.ivory};
  --cocoa: ${({ theme }) => theme?.colors?.cocoa || FallbackTheme.colors.cocoa};
  --glass: ${({ theme }) => theme?.colors?.glass || FallbackTheme.colors.glass};

  --r-sm: ${({ theme }) => theme?.radius?.sm || FallbackTheme.radius.sm};
  --r-md: ${({ theme }) => theme?.radius?.md || FallbackTheme.radius.md};
  --r-lg: ${({ theme }) => theme?.radius?.lg || FallbackTheme.radius.lg};
  --r-xl: ${({ theme }) => theme?.radius?.xl || FallbackTheme.radius.xl};
  --r-pill: ${({ theme }) => theme?.radius?.pill || FallbackTheme.radius.pill};

  --shadow-soft: ${({ theme }) => theme?.shadow?.soft || FallbackTheme.shadow.soft};
  --shadow-hard: ${({ theme }) => theme?.shadow?.hard || FallbackTheme.shadow.hard};
  --shadow-glow: ${({ theme }) => theme?.shadow?.glow || FallbackTheme.shadow.glow};

  box-sizing: border-box;
  min-height: 100dvh;
  width: 100%;
  color: var(--ivory);
  background:
    radial-gradient(1200px 600px at 10% 0%, rgba(214,182,159,0.12), transparent 60%),
    radial-gradient(900px 500px at 100% 0%, rgba(61,38,26,0.25), transparent 60%),
    linear-gradient(180deg, var(--black), var(--darkBrown));
  display: flex;
  justify-content: center;
  padding: 48px 20px 72px;
  overflow-x: hidden;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme?.layout?.max || FallbackTheme.layout.max};
  animation: ${rise} 0.6s ease-out both;
`;

const Hook = styled.div`
  display: grid;
  gap: 14px;
  margin-bottom: 28px;

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    border-radius: var(--r-pill);
    background: rgba(214,182,159,0.12);
    border: 1px solid rgba(214,182,159,0.25);
    color: var(--light);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    width: fit-content;
    animation: ${pulseGlow} 2.6s ease-out infinite;
  }
  h1 {
    margin: 0;
    font-size: clamp(28px, 5vw, 44px);
    line-height: 1.1;
    letter-spacing: 0.02em;
    color: var(--ivory);
    text-shadow: 0 6px 30px rgba(0,0,0,0.35);
  }
  p {
    margin: 0;
    color: rgba(255,255,255,0.78);
    max-width: 70ch;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 22px;
  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.section`
  background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-glow);
  backdrop-filter: blur(8px);
  padding: 18px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  will-change: transform;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 60px rgba(0,0,0,0.35);
    border-color: rgba(214,182,159,0.28);
  }
`;

const ProfileTop = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 8px 6px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);

  .avatarWrap {
    position: relative;
    width: 120px;
    height: 120px;
    border-radius: var(--r-pill);
    background: linear-gradient(145deg, rgba(214,182,159,0.24), rgba(61,38,26,0.4));
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 1px solid rgba(214,182,159,0.28);
    transition: transform 0.25s ease;
  }
  .avatarWrap:hover {
    transform: rotate(-1deg) scale(1.01);
  }
  .avatar {
    width: 112px;
    height: 112px;
    border-radius: var(--r-pill);
    object-fit: cover;
    border: 2px solid rgba(214,182,159,0.55);
  }
  .meta h3 {
    margin: 0 0 6px;
    font-size: clamp(20px, 3.2vw, 28px);
    color: var(--ivory);
  }
  .meta .role {
    display: inline-block;
    font-size: 14px;
    padding: 4px 10px;
    border-radius: var(--r-pill);
    color: var(--black);
    background: var(--light);
    font-weight: 700;
    letter-spacing: 0.06em;
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    text-align: center;

    .avatarWrap {
      margin: 0 auto;
    }
    .meta {
      text-align: center;
    }
    > div:last-child {
      justify-self: center;
    }
  }
`;

const Row = styled.div`
  display: grid;
  gap: 14px;
  margin-top: 16px;
  @media (min-width: 780px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Field = styled.label`
  display: grid;
  gap: 8px;
  font-size: 14px;
  color: rgba(255,255,255,0.85);

  input,
  textarea,
  select {
    width: 100%;
    color: var(--ivory);
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: var(--r-lg);
    padding: 12px 14px;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.06s ease;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
  }
  input::placeholder,
  textarea::placeholder {
    color: rgba(255,255,255,0.55);
  }
  input:focus,
  textarea:focus,
  select:focus {
    border-color: rgba(214,182,159,0.52);
    box-shadow: 0 0 0 3px rgba(214,182,159,0.18);
  }
  textarea {
    min-height: 110px;
    resize: vertical;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
`;

const ButtonsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(140px, 1fr));
  gap: 10px;
  margin-top: 14px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const Btn = styled.button`
  appearance: none;
  border: 0;
  padding: 12px 16px;
  border-radius: var(--r-pill);
  font-weight: 800;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: transform 0.06s ease, filter 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-shadow: var(--shadow-soft);
  color: ${({ $variant }) => ($variant === "ghost" ? "var(--light)" : "var(--black)")};
  background: ${({ $variant }) =>
    $variant === "ghost"
      ? "transparent"
      : "linear-gradient(180deg, #D6B69F, #C7A487)"};
  border: ${({ $variant }) =>
    $variant === "ghost"
      ? "1px solid rgba(214,182,159,0.45)"
      : "1px solid rgba(214,182,159,0.8)"};
  &:hover {
    filter: brightness(1.06);
    box-shadow: var(--shadow-hard);
  }
  &:active {
    transform: translateY(1px);
  }
`;

const Split = styled.div`
  display: grid;
  gap: 22px;
  @media (min-width: 980px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const StatGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
  @media (min-width: 620px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatCard = styled.div`
  background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--r-lg);
  padding: 14px;
  text-align: center;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  will-change: transform;
  &:hover {
    transform: translateY(-4px) scale(1.01);
    border-color: rgba(214,182,159,0.28);
    box-shadow: 0 14px 40px rgba(0,0,0,0.24);
  }
  .label {
    font-size: 12px;
    color: rgba(255,255,255,0.68);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .value {
    font-size: 24px;
    font-weight: 900;
    color: var(--ivory);
  }
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
  li {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: var(--r-lg);
    padding: 12px 14px;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
    transition: border-color 0.2s ease, transform 0.2s ease;
  }
  li:hover {
    border-color: rgba(214,182,159,0.28);
    transform: translateY(-2px);
  }
  .when {
    font-size: 12px;
    color: rgba(255,255,255,0.6);
  }
`;

const Toggle = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  input {
    display: none;
  }
  .track {
    width: 48px;
    height: 28px;
    border-radius: 40px;
    background: ${({ $on }) =>
      $on ? "rgba(214,182,159,0.5)" : "rgba(255,255,255,0.18)"};
    border: 1px solid rgba(255,255,255,0.2);
    position: relative;
    transition: background 0.2s ease;
  }
  .knob {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: ${({ $on }) => ($on ? "22px" : "4px")};
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background: var(--ivory);
    box-shadow: 0 6px 18px rgba(0,0,0,0.25);
    transition: left 0.2s ease;
  }
  .label {
    color: rgba(255,255,255,0.8);
    font-size: 14px;
  }
`;

// ===== Component =====
export default function AdminProfile({ theme }) {
  const brand = useBrand(theme);

  const navigate = useNavigate();

  // ✅ Keep File out of Redux to prevent RTK mutation errors
  const avatarFileRef = useRef(null);
  
  // ✅ CSRF token cache (like UserProfile)
const csrfRef = useRef(null);

function readCookie(name) {
  try {
    const parts = String(document.cookie || "")
      .split("; ")
      .map((p) => p.trim());
    const hit = parts.find((p) => p.startsWith(`${name}=`));
    if (!hit) return null;
    return decodeURIComponent(hit.split("=").slice(1).join("="));
  } catch {
    return null;
  }
}

async function ensureCsrf() {
  // 1) already cached in memory?
  if (csrfRef.current) return csrfRef.current;

  // 2) cookie already exists?
  const fromCookie = readCookie("csrfToken");
  if (fromCookie) {
    csrfRef.current = fromCookie;
    return fromCookie;
  }

  // 3) request CSRF cookie from backend
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/csrf`, {
    method: "GET",
    credentials: "include",
  });

  const body = await safeJson(res);
  if (!res.ok) {
    throw new Error(body?.message || "Unable to issue CSRF token.");
  }

  // backend returns { csrfToken }, and also sets cookie
  const token = body?.csrfToken || readCookie("csrfToken");
  if (!token) {
    throw new Error("CSRF token missing after issuance.");
  }

  csrfRef.current = token;
  return token;
}


  // ✅ Use toast EXACTLY like Cart.jsx
  const toast = useToast();
  function pushToast(payload) {
    toast?.push?.(payload);
  }

  // ✅ Redux
  const dispatch = useDispatch();
  const usersState = useSelector((state) => state.users);

  const { me, loading, error, form, saving, saveError, avatarPreview } =
    usersState || {};

  // ----- SECURITY GUARD: verify via backend to prevent bounce -----
  useEffect(() => {
    let alive = true;

    const verify = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}${ME_ENDPOINT}`, {
          method: "GET",
          credentials: "include",
        });

        if (!alive) return;

        if (!r.ok) {
          window.location.replace("/login");
          return;
        }

        const j = await r.json().catch(() => ({}));
        const raw = j?.data;
        const user = raw?.user || raw || {};
        const role = user.role || "user";

        if (role !== "admin") {
          window.location.replace("/user-profile");
          return;
        }

        const currentUrl = window.location.href;
        window.history.replaceState({ protected: true }, document.title, currentUrl);
      } catch {
        window.location.replace("/login");
      }
    };

    verify();

    const onPageShow = (e) => {
      const navEntries = performance.getEntriesByType("navigation");
      const navType = navEntries[0]?.type;

      if (e.persisted || navType === "back_forward") {
        verify();
      }
    };
    const onPopState = () => verify();

    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPopState);

    return () => {
      alive = false;
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  // ✅ 1) Hydrate from localStorage (fast reload + keeps avatar on refresh)
  useEffect(() => {
    const cached = readCachedMe();
    if (cached && !me) {
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
          headline: cached.headline || "HIT HARD. MOVE SMART. STAY DISCIPLINED.",
          bio: cached.bio || "",
          notifications: cached.notifications !== false,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 2) Fetch real /me → put into Redux + localStorage
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      dispatch(userMeRequest());
      try {
        const res = await fetch(`${API_BASE_URL}${ME_ENDPOINT}`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        const body = await safeJson(res);

        if (!res.ok) {
          const msg = body?.message || "Failed to load admin profile.";
          dispatch(userMeFail(msg));
          return;
        }

        const raw = body?.data || body || {};
        const user = raw?.user || raw || null;

        dispatch(userMeSuccess(user));
        persistMe(user);

        // ✅ keep a clean form snapshot in Redux
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
            headline: user?.headline || "HIT HARD. MOVE SMART. STAY DISCIPLINED.",
            bio: user?.bio || "",
            notifications: user?.notifications !== false,
          })
        );
      } catch (e) {
        if (e?.name === "AbortError") return;
        dispatch(userMeFail("Network error. Please try again."));
      }
    })();

    return () => controller.abort();
  }, [dispatch]);

  // ✅ Revoke blob preview when it changes (prevents memory leaks)
  useEffect(() => {
    return () => {
      if (avatarPreview && String(avatarPreview).startsWith("blob:")) {
        try {
          URL.revokeObjectURL(avatarPreview);
        } catch {
          // ignore
        }
      }
    };
  }, [avatarPreview]);

  // ✅ UI: Stats / Activity (unchanged)
  const stats = useMemo(
    () => [
      { label: "Users", value: "2,184" },
      { label: "Courses", value: "14" },
      { label: "Sales", value: "$38,920" },
      { label: "Messages", value: "126" },
    ],
    []
  );

  const activity = useMemo(
    () => [
      { text: "Updated pricing for 'KO Fundamentals'", when: "2h ago" },
      { text: "Responded to 3 live chat messages", when: "5h ago" },
      { text: "Added 'Body Shot Mastery' lesson", when: "Yesterday" },
      { text: "New affiliate joined (ID: AFF-7721)", when: "2 days ago" },
    ],
    []
  );

  // ✅ Passwords keep local (no need to mix with your user slice)
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  // ✅ A profile object used ONLY for display where you previously had static data
  const profile = useMemo(() => {
    const roleLabel = (me?.role || "admin") === "admin" ? "Admin · KnockoutCodes" : me?.role || "Admin";
    return {
      name: form?.name ?? me?.name ?? "Admin",
      role: roleLabel,
      email: form?.email ?? me?.email ?? "",
      phone: form?.phone ?? me?.phone ?? "",
      location: form?.location ?? me?.location ?? "",
      website: form?.website ?? me?.website ?? "",
      instagram: form?.instagram ?? me?.instagram ?? "",
      tiktok: form?.tiktok ?? me?.tiktok ?? "",
      youtube: form?.youtube ?? me?.youtube ?? "",
      xhandle: form?.xhandle ?? me?.xhandle ?? "",
      bio: form?.bio ?? me?.bio ?? "",
      headline: form?.headline ?? me?.headline ?? "HIT HARD. MOVE SMART. STAY DISCIPLINED.",
      notifications:
        typeof (form?.notifications ?? me?.notifications) === "boolean"
          ? (form?.notifications ?? me?.notifications)
          : true,
      avatarField: me?.avatarUrl || me?.avatar || me?.image || me?.profileImage || "",
    };
  }, [me, form]);

  // ✅ Preview URL priority: redux preview > backend image > fallback image
  const previewUrl = useMemo(() => {
    if (avatarPreview) return avatarPreview;

    const a = String(profile.avatarField || "");
    if (!a) {
      return "https://images.unsplash.com/photo-1532768641073-503a250f9754?q=80&w=512&auto=format&fit=crop";
    }

    if (a.startsWith("http")) return a;
    const normalized = a.startsWith("/") ? a : `/${a}`;
    return `${API_BASE_URL}${normalized}`;
  }, [avatarPreview, profile.avatarField]);

  // ✅ Update Redux form on input change
  function handleChange(e) {
    const { name, value } = e.target;
    dispatch(updateUserForm({ [name]: value || "" }));
  }

  function handleToggleNotifications() {
    dispatch(updateUserForm({ notifications: !(form?.notifications ?? true) }));
  }

  // ✅ Avatar file select (redux stores file + preview)
  function handleAvatar(e) {
  const file = e.target.files?.[0];

  if (!file) return;

  // ✅ Store the real file in a ref (NOT redux);
  avatarFileRef.current = file;

  const url = URL.createObjectURL(file);

  dispatch(setAvatarFile({ file: null, preview: url }));
}

  // ✅ Upload avatar to DB if user selected a file
  async function uploadAvatarIfNeeded() {
  const fileToUpload = avatarFileRef.current || null;
  if (!fileToUpload) return null;

  const fd = new FormData();
  fd.append("avatar", fileToUpload);

  const csrf = await ensureCsrf();

const res = await fetch(`${API_BASE_URL}${AVATAR_ENDPOINT}`, {
  method: "POST",
  credentials: "include",
  headers: { "x-csrf-token": csrf },
  body: fd,
});

  const body = await safeJson(res);
  if (!res.ok) {
    throw new Error(body?.message || "Avatar upload failed.");
  }

  const raw = body?.data || body || {};
  const updatedUser = raw?.user || raw || null;

  if (updatedUser) {
    dispatch(userMeSuccess(updatedUser));
    dispatch(userSaveSuccess(updatedUser));
    persistMe(updatedUser);
  }

  // ✅ clear ref + redux preview
  avatarFileRef.current = null;
  dispatch(clearAvatar());

  return updatedUser;
}

  // ✅ Patch profile fields to DB
  async function patchProfile() {
    const payload = {
      name: form?.name ?? "",
      email: form?.email ?? "",
      phone: form?.phone ?? "",
      location: form?.location ?? "",
      website: form?.website ?? "",
      instagram: form?.instagram ?? "",
      tiktok: form?.tiktok ?? "",
      youtube: form?.youtube ?? "",
      xhandle: form?.xhandle ?? "",
      headline: form?.headline ?? "",
      bio: form?.bio ?? "",
      notifications: !!(form?.notifications ?? true),
    };

    const csrf = await ensureCsrf();

    const res = await fetch(`${API_BASE_URL}${ME_ENDPOINT}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
      body: JSON.stringify(payload),
    });

    const body = await safeJson(res);
    if (!res.ok) {
      throw new Error(body?.message || "Failed to update profile.");
    }

    const raw = body?.data || body || {};
    const updatedUser = raw?.user || raw || null;

    if (updatedUser) {
      dispatch(userMeSuccess(updatedUser));
      dispatch(userSaveSuccess(updatedUser));
      persistMe(updatedUser);

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
          headline: updatedUser.headline || "HIT HARD. MOVE SMART. STAY DISCIPLINED.",
          bio: updatedUser.bio || "",
          notifications: updatedUser.notifications !== false,
        })
      );
    }

    // ✅ IMPORTANT: return it so handleSave can use the latest value
    return updatedUser;
  }

  // ----- SAVE PROFILE (Redux + DB + localStorage) -----
  async function handleSave(e) {
  e.preventDefault();

  dispatch(userSaveRequest());

  try {
    const avatarUpdatedUser = await uploadAvatarIfNeeded();
    const profileUpdatedUser = await patchProfile();

    const finalUser = profileUpdatedUser || avatarUpdatedUser || me || null;

    if (finalUser) {
      dispatch(userSaveSuccess(finalUser));
      persistMe(finalUser);
    }

    pushToast({
      title: "Profile updated",
      description: "Your admin details were successfully saved to the database.",
      variant: "success",
    });
  } catch (err) {
    const msg = err?.message || "Unable to update profile.";
    dispatch(userSaveFail(msg));
    pushToast({
      title: "Update failed",
      description: msg,
      variant: "error",
    });
  }
}

  // ----- UPDATE PASSWORD (kept your original behavior) -----
  async function handlePasswordUpdate(e) {
    e.preventDefault();

    // Basic client validation
    if (passwords.next != passwords.confirm) {
      pushToast({
        title: "Password do not match",
        description: "Confirm new password must match the new password",
        variant: "error",
      });
      return;
    };

    try {
      // IMPORTANT: use me/password (not /:id)
      const res = await axiosInstance.patch(
        "/users/me/password",
        {
          currentPassword: passwords.current,
          newPassword: passwords.next,
          confirmPassword: passwords.confirm,
        },
        {
          withCredentials: true,
        }
      );

      pushToast({
        title: "Password updated successfully",
        description: res.data.message || "Your admin password was updated successfully!",
        variant: "success",
      });

      setPasswords({ current: "", next: "", confirm: "" });
    } catch (err) {
      const msg = err.response.data.message ||
        err.response.data.error ||
        err.message || "Password update failed";
      
      pushToast({
        title: "Password update failed",
        description: msg,
        variant: "error",
      });

      console.error("Password update error", err);
    }
  }

  // ----- SECURE LOGOUT -----
  // ----- SECURE LOGOUT -----
async function handleLogout() {
  try {
    let csrf = null;
    try {
      csrf = await ensureCsrf();
    } catch {
      csrf = null;
    }

    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "x-csrf-token": csrf } : {}),
      },
      body: JSON.stringify({}),
    }).catch(() => {});
  } finally {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      localStorage.removeItem(ME_CACHE_KEY);
      sessionStorage.clear();

      const past = "Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = `token=; expires=${past}; path=/;`;
      document.cookie = `refreshToken=; expires=${past}; path=/;`;
      document.cookie = `csrfToken=; expires=${past}; path=/;`;
    } finally {
      window.location.replace("/login");
    }
  }
  };

  return (
    <>
      <Wrap theme={brand}>
        <Inner>
          <Hook>
            <div className="badge">KnockoutCodes • Admin Profile</div>
            <h1>{profile.headline}</h1>
            <p>
              Luxury admin control for a combat-sport brand: clean UI, hard-hitting first
              impression, and everything you need to manage users, content, and sales — fast.
            </p>
          </Hook>

          <Grid>
            {/* ===== Left: Profile & Details ===== */}
            <Card>
              <ProfileTop>
                <div className="avatarWrap">
                  <img className="avatar" src={previewUrl} alt="Admin avatar" />
                </div>

                <div className="meta">
                  <h3>{profile.name}</h3>
                  <span className="role">{profile.role}</span>
                  {loading ? (
                    <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
                      Loading…
                    </div>
                  ) : error ? (
                    <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12, color: "#ffb4b4" }}>
                      {error}
                    </div>
                  ) : null}
                </div>

                <div>
                  <input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAvatar}
                  />
                  <Btn as="label" htmlFor="avatar">
                    Upload Avatar
                  </Btn>
                </div>
              </ProfileTop>

              <form onSubmit={handleSave}>
                <Row>
                  <Field>
                    Name
                    <input
                      name="name"
                      value={form?.name ?? ""}
                      onChange={handleChange}
                      placeholder="Full name"
                      required
                    />
                  </Field>
                  <Field>
                    Email
                    <input
                      id="admin-email"
                      type="email"
                      name="email"
                      value={form?.email ?? ""}
                      onChange={handleChange}
                      placeholder="Email address"
                      required
                      autoComplete="email"
                    />
                  </Field>
                </Row>

                <Row>
                  <Field>
                    Phone
                    <input
                      name="phone"
                      value={form?.phone ?? ""}
                      onChange={handleChange}
                      placeholder="Phone"
                    />
                  </Field>
                  <Field>
                    Location
                    <input
                      name="location"
                      value={form?.location ?? ""}
                      onChange={handleChange}
                      placeholder="City, Country"
                    />
                  </Field>
                </Row>

                <Row>
                  <Field>
                    Website
                    <input
                      name="website"
                      value={form?.website ?? ""}
                      onChange={handleChange}
                      placeholder="https://knockoutcodes.com"
                    />
                  </Field>
                  <Field>
                    Instagram
                    <input
                      name="instagram"
                      value={form?.instagram ?? ""}
                      onChange={handleChange}
                      placeholder="https://instagram.com/knockoutcodes"
                    />
                  </Field>
                </Row>

                <Row>
                  <Field>
                    TikTok
                    <input
                      name="tiktok"
                      value={form?.tiktok ?? ""}
                      onChange={handleChange}
                      placeholder="https://tiktok.com/@knockoutcodes"
                    />
                  </Field>
                  <Field>
                    YouTube
                    <input
                      name="youtube"
                      value={form?.youtube ?? ""}
                      onChange={handleChange}
                      placeholder="https://youtube.com/@knockoutcodes"
                    />
                  </Field>
                </Row>

                <Row>
                  <Field>
                    X (Twitter)
                    <input
                      name="xhandle"
                      value={form?.xhandle ?? ""}
                      onChange={handleChange}
                      placeholder="https://x.com/knockoutcodes"
                    />
                  </Field>

                  <Field>
                    Short Bio
                    <textarea
                      name="bio"
                      value={form?.bio ?? ""}
                      onChange={handleChange}
                      placeholder="Tell your story and brand promise…"
                    />
                  </Field>
                </Row>

                <Row>
                  <Field>
                    Headline
                    <input
                      name="headline"
                      value={form?.headline ?? ""}
                      onChange={handleChange}
                      placeholder="Your profile headline…"
                    />
                  </Field>

                  <Field>
                    (Auto)
                    <input readOnly value={saveError ? `Error: ${saveError}` : saving ? "Saving…" : "Ready"} />
                  </Field>
                </Row>

                <Actions>
                  <Toggle $on={!!(form?.notifications ?? true)}>
                    <input
                      type="checkbox"
                      checked={!!(form?.notifications ?? true)}
                      onChange={handleToggleNotifications}
                    />
                    <div className="track">
                      <span className="knob" />
                    </div>
                    <span className="label">Email & push notifications</span>
                  </Toggle>
                </Actions>

                <ButtonsRow>
                  <Btn type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save Profile"}
                  </Btn>
                  <Btn
                    type="button"
                    $variant="ghost"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  >
                    Back to Top
                  </Btn>
                  <Btn type="button" $variant="ghost" onClick={handleLogout}>
                    Logout
                  </Btn>
                </ButtonsRow>
              </form>
            </Card>

            {/* ===== Right: Stats & Activity ===== */}
            <Card>
              <h3 style={{ margin: "4px 6px 10px" }}>Brand Pulse</h3>
              <StatGrid>
                {stats.map((s, i) => (
                  <StatCard key={i}>
                    <div className="label">{s.label}</div>
                    <div className="value">{s.value}</div>
                  </StatCard>
                ))}
              </StatGrid>

              <div style={{ height: 12 }} />

              <h3 style={{ margin: "6px" }}>Recent Activity</h3>
              <List>
                {activity.map((a, i) => (
                  <li key={i}>
                    <span>{a.text}</span>
                    <span className="when">{a.when}</span>
                  </li>
                ))}
              </List>
            </Card>
          </Grid>

          <div style={{ height: 22 }} />

          <Split>
            {/* ===== Security / Password ===== */}
            <Card>
              <h3 style={{ margin: "6px" }}>Security</h3>
              <form onSubmit={handlePasswordUpdate}>
                <Row>
                  <Field>
                    Current Password
                    <input
                      type="password"
                      value={passwords.current}
                      onChange={(e) =>
                        setPasswords((p) => ({ ...p, current: e.target.value || "" }))
                      }
                      required
                      autoComplete="current-password"
                    />
                  </Field>
                  <Field>
                    New Password
                    <input
                      type="password"
                      value={passwords.next}
                      onChange={(e) =>
                        setPasswords((p) => ({ ...p, next: e.target.value || "" }))
                      }
                      required
                      autoComplete="new-password"
                    />
                  </Field>
                </Row>
                <Row>
                  <Field>
                    Confirm New Password
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) =>
                        setPasswords((p) => ({ ...p, confirm: e.target.value || "" }))
                      }
                      required
                      autoComplete="new-password"
                    />
                  </Field>
                  <Field>
                    Two-Factor (coming soon)
                    <input readOnly value="Authenticator App · SMS Backup" />
                  </Field>
                </Row>
                <Actions>
  <Btn type="submit">Update Password</Btn>

  {/* 
    MANAGE SESSIONS / DEVICES BUTTON
    Big-tech style security feature:
    - Lets admin see all active logged-in devices
    - Lets admin revoke old sessions
    - Opens the existing ManageDevices page
  */}
  <Btn
    type="button"
    $variant="ghost"
    onClick={() => navigate("/manage-devices")}
  >
    Manage Active Sessions
  </Btn>

  {/* 
    FUTURE 2FA BUTTON
    Keep this for later when authenticator/SMS security is ready
  */}
  <Btn
    type="button"
    $variant="ghost"
    onClick={() =>
      pushToast({
        title: "2FA setup coming soon",
        description:
          "Once backend is wired, you can enable authenticator + SMS backup here.",
        variant: "info",
      })
    }
  >
    Manage 2FA
  </Btn>
</Actions>
              </form>
            </Card>

            {/* ===== Quick Links / CTA ===== */}
            <Card>
              <h3 style={{ margin: "6px" }}>Quick Actions</h3>
              <Row>
                <Field>
                  Courses Manager
                  <input readOnly value="Create, edit, publish courses" />
                </Field>
                <Field>
                  Messages Center
                  <input readOnly value="Live chat + replies" />
                </Field>
              </Row>
              <Row>
                <Field>
                  Sales Dashboard
                  <input readOnly value="Revenue, refunds, payouts" />
                </Field>
                <Field>
                  Users & Roles
                  <input readOnly value="Admins, creators, students" />
                </Field>
              </Row>
              <Actions>
                <Btn
                  type="button"
                  onClick={() =>
                    navigate("/admin-courses")
                  }
                >
                  Open Courses
                </Btn>
                <Btn
                  type="button"
                  $variant="ghost"
                  onClick={() => navigate("/admin-contacts")}
                >
                  Open Messages
                </Btn>
              </Actions>
            </Card>
          </Split>
        </Inner>
      </Wrap>

      <Footer />
    </>
  );
};

