// src/pages/ManageNewsletters.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../components/Toast";
import { socket } from "../../utils/socket";

// ✅ Redux
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAdminNewsletters,
  updateAdminNewsletter,
  deleteAdminNewsletter,
  bulkUpdateAdminNewsletters,
  setSelectedNewsletterId,
  setManageNewsletterSearch,
  setManageNewsletterSystemMessage,
} from "../reducers/manageNewsletter/manageNewsletterActions";

// ---------- localStorage keys ----------
const LS_CACHE_KEY = "admin_newsletters_cache_v1";
const LS_SELECTED_KEY = "admin_newsletters_selected_v1";
const LS_CACHE_TTL_MS = 60_000; // 1 min

// ---------- Styled Components ----------
const Page = styled.main`
  min-height: 100vh;
  padding: 34px 18px 46px;
  background: radial-gradient(
      circle at top left,
      rgba(214, 182, 159, 0.14),
      transparent 55%
    ),
    radial-gradient(
      circle at bottom right,
      rgba(90, 56, 37, 0.22),
      transparent 55%
    ),
    ${({ theme }) => theme.colors.black};
  display: flex;
  justify-content: center;
  color: ${({ theme }) => theme.colors.white};
`;

const Shell = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.max};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
`;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Kicker = styled.div`
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const Title = styled.h1`
  font-size: clamp(28px, 3vw, 36px);
  line-height: 1.05;
  font-weight: 900;
  background: linear-gradient(
    120deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const Subtitle = styled.p`
  font-size: 14px;
  max-width: 560px;
  color: rgba(255, 249, 242, 0.86);
`;

const Badge = styled.div`
  padding: 10px 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.glass};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  backdrop-filter: blur(16px);
`;

const StarRow = styled.div`
  display: flex;
  gap: 2px;
  font-size: 16px;
`;

const Star = styled.span`
  color: ${({ theme }) => theme.colors.lightBrown};
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 22px;
  align-items: flex-start;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Panel = styled(motion.section)`
  background: linear-gradient(
      145deg,
      rgba(214, 182, 159, 0.07),
      rgba(0, 0, 0, 0.7)
    ),
    ${({ theme }) => theme.colors.cocoa};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.glow};
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 18px 18px 20px;
  backdrop-filter: blur(18px);
  min-height: 260px;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
`;

const PanelTitle = styled.h2`
  font-size: 16px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.ivory};
`;

const Chip = styled.span`
  font-size: 11px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  text-transform: uppercase;
  letter-spacing: 0.12em;
  background: rgba(0, 0, 0, 0.44);
  color: ${({ theme }) => theme.colors.lightBrown};
  border: 1px solid rgba(214, 182, 159, 0.35);
`;

const SearchBar = styled.div`
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
`;

const SearchInput = styled.input`
  flex: 1;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 9px 13px;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.66);
  color: ${({ theme }) => theme.colors.ivory};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.lightBrown};
    box-shadow: 0 0 0 1px rgba(214, 182, 159, 0.55);
  }

  &::placeholder {
    color: rgba(255, 249, 242, 0.5);
  }
`;

const CountPill = styled.div`
  font-size: 12px;
  color: rgba(255, 249, 242, 0.8);
  padding: 7px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.55);
  border: 1px dashed rgba(214, 182, 159, 0.4);
`;

const List = styled.div`
  max-height: 420px;
  overflow: auto;
  padding-right: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(214, 182, 159, 0.4);
    border-radius: 999px;
  }
`;

const ListItem = styled(motion.div)`
  width: 100%;
  text-align: left;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.lightBrown : "rgba(255,255,255,0.06)"};
  padding: 10px 11px;
  background: ${({ $active }) =>
    $active ? "rgba(214, 182, 159, 0.14)" : "rgba(0, 0, 0, 0.7)"};
  color: ${({ theme }) => theme.colors.ivory};
  cursor: pointer;
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) auto;
  gap: 6px 10px;
  align-items: center;
  transition: transform 0.16s ease, box-shadow 0.16s ease,
    border-color 0.16s ease, background 0.16s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadow.soft};
    border-color: ${({ theme }) => theme.colors.lightBrown};
  }
`;

const Email = styled.div`
  font-size: 13px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Meta = styled.div`
  font-size: 11px;
  color: rgba(255, 249, 242, 0.7);
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const Tag = styled.span`
  padding: 1px 7px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(214, 182, 159, 0.35);
`;

const SelectTagButton = styled.button`
  padding: 1px 7px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(214, 182, 159, 0.35);
  color: inherit;
  font-size: inherit;
  cursor: pointer;

  &:hover {
    background: rgba(214, 182, 159, 0.18);
    border-color: rgba(214, 182, 159, 0.7);
  }
`;

const DateText = styled.div`
  font-size: 11px;
  color: rgba(255, 249, 242, 0.72);
  text-align: right;
`;

const EmptyState = styled.div`
  font-size: 13px;
  color: rgba(255, 249, 242, 0.72);
  padding: 16px 0 6px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;

  @media (max-width: 700px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Label = styled.label`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(255, 249, 242, 0.74);
  margin-bottom: 4px;
  display: block;
`;

const Input = styled.input`
  width: 100%;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 8px 10px;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.7);
  color: ${({ theme }) => theme.colors.ivory};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.lightBrown};
    box-shadow: 0 0 0 1px rgba(214, 182, 159, 0.55);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 90px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 8px 10px;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.7);
  color: ${({ theme }) => theme.colors.ivory};
  resize: vertical;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.lightBrown};
    box-shadow: 0 0 0 1px rgba(214, 182, 159, 0.55);
  }
`;

const SwitchRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
`;

const SwitchLabel = styled.span`
  font-size: 12px;
  color: rgba(255, 249, 242, 0.82);
`;

const Switch = styled.button`
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.lightBrown : "rgba(255,255,255,0.26)"};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.lightBrown : "rgba(0, 0, 0, 0.8)"};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: ${({ $active }) => ($active ? "flex-end" : "flex-start")};
  padding: 0 2px;
  transition: all 0.18s ease;
`;

const SwitchThumb = styled.div`
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.black};
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.14s ease;
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.lightBrown},
    ${({ theme }) => theme.colors.ivory}
  );
  color: ${({ theme }) => theme.colors.black};
  box-shadow: ${({ theme }) => theme.shadow.hard};

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.55);
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
    box-shadow: none;
    transform: none;
  }
`;

const GhostButton = styled(Button)`
  background: transparent;
  border: 1px solid rgba(214, 182, 159, 0.55);
  color: ${({ theme }) => theme.colors.ivory};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadow.soft};
  }
`;

const HelperText = styled.div`
  font-size: 11px;
  color: rgba(255, 249, 242, 0.7);
  margin-top: 4px;
`;

const SystemBar = styled.div`
  font-size: 12px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $tone }) =>
    $tone === "error"
      ? "rgba(220, 38, 38, 0.14)"
      : $tone === "success"
      ? "rgba(34, 197, 94, 0.16)"
      : "rgba(0, 0, 0, 0.7)"};
  border: 1px solid
    ${({ $tone }) =>
      $tone === "error"
        ? "rgba(248, 113, 113, 0.6)"
        : $tone === "success"
        ? "rgba(74, 222, 128, 0.6)"
        : "rgba(148, 163, 184, 0.5)"};
  color: ${({ $tone }) =>
    $tone === "error"
      ? "#fecaca"
      : $tone === "success"
      ? "#bbf7d0"
      : "#e5e7eb"};
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StatCard = styled.div`
  padding: 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: ${({ theme }) => theme.shadow.soft};
`;

const StatLabel = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(255, 249, 242, 0.68);
  margin-bottom: 8px;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 850;
  color: ${({ theme }) => theme.colors.ivory};
`;

const BulkBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(214, 182, 159, 0.2);
`;

const BulkActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const MiniButton = styled.button`
  border: 1px solid rgba(214, 182, 159, 0.45);
  background: rgba(0, 0, 0, 0.72);
  color: ${({ theme }) => theme.colors.ivory};
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 12px;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadow.soft};
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
    transform: none;
    box-shadow: none;
  }
`;

// ---------- Component ----------
export default function ManageNewsletters() {
  const dispatch = useDispatch();
  const { push } = useToast();

  // ✅ Redux state (admin manageNewsletter slice)
  const manageState = useSelector((s) => s.manageNewsletter || {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const newsletters = Array.isArray(manageState.newsletters)
    ? manageState.newsletters
    : [];
  const selectedId = manageState.selectedId || null;
  const search = manageState.search || "";
  const loadingList = Boolean(manageState.loadingList);
const saving = Boolean(manageState.saving);
const deleting = Boolean(manageState.deleting);
const systemMessage = manageState.systemMessage || null;
const reduxError = manageState.error || "";

const backendTotal = Number(manageState.total) || newsletters.length;
const backendActive = Number(manageState.active) || 0;
const backendInactive = Number(manageState.inactive) || 0;

  // ✅ matches DB schema now (local form stays local for perfect UX)
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "",
    source: "footer",
    notes: "",
    isActive: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [localSearch, setLocalSearch] = useState(search);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  
  const lastLocalActionRef = useRef({
  type: null,
  id: null,
  time: 0,
});

  const getId = (n) =>
    (n && (n._id || n.id || n.newsletterId || n.newsletterID)) || "";

  const loadCache = () => {
    try {
      const raw = localStorage.getItem(LS_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.ts || !Array.isArray(parsed?.data)) return null;
      if (Date.now() - parsed.ts > LS_CACHE_TTL_MS) return null;
      return parsed.data;
    } catch {
      return null;
    }
  };

  const saveCache = (list) => {
  try {
    const safeList = Array.isArray(list)
  ? list.slice(0, 500)
  : []; // prevent huge storage abuse
    localStorage.setItem(
      LS_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data: safeList })
    );
  } catch { /* empty */ }
};

  useEffect(() => {
  const t = setTimeout(() => {
    dispatch(setManageNewsletterSearch(localSearch));
  }, 300);

  return () => clearTimeout(t);
}, [localSearch, dispatch]);

  // Hydrate selectedId from localStorage (keep your behavior)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_SELECTED_KEY);
      if (saved) dispatch(setSelectedNewsletterId(saved));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch newsletters (admin) + keep localStorage cache behavior
  useEffect(() => {
    let ignore = false;

    async function run() {
      const cached = loadCache();
      if (cached && !ignore) {
        // directly hydrate Redux list from cache via system message + list update pattern:
        // simplest: dispatch list success by calling fetch, but to avoid API call delay,
        // we set cache into localStorage list by using system message and selection logic.
        // We'll just set system hint and proceed with fetch for freshness.
      }

      const savedId = (() => {
        try {
          return localStorage.getItem(LS_SELECTED_KEY);
        } catch {
          return null;
        }
      })();

      const res = await dispatch(
  fetchAdminNewsletters({
    preferredId: savedId,
    fallbackToFirst: true,
    search,
    limit: 100,
  })
);

      if (!ignore) {
        if (res?.ok) {
          saveCache(res.list || []);

          const nextId = res.selectedId || savedId || null;
          if (nextId) {
            dispatch(setSelectedNewsletterId(nextId));
            try {
              localStorage.setItem(LS_SELECTED_KEY, nextId);
            } catch {
              // ignore
            }
          }
        } else {
          const message =
            res?.message ||
            "Unable to load newsletters. Please check your admin access.";

          dispatch(setManageNewsletterSystemMessage("error", message));

          push({
            title: "Newsletter fetch failed",
            description: message,
            variant: "error",
          });
        }
      }
    }

    run();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, search]);

  useEffect(() => {
  if (!socket.connected) {
    socket.connect();
  }

  const shouldSilenceToast = (type, payload) => {
    const local = lastLocalActionRef.current;
    const payloadId = payload?._id || "";

    return (
      local?.type === type &&
      local?.id === payloadId &&
      Date.now() - local.time < 4000
    );
  };

  const refreshNewsletters = async (payload, type = "new") => {
  try {
    const savedId = (() => {
      try {
        return localStorage.getItem(LS_SELECTED_KEY);
      } catch {
        return null;
      }
    })();

    const res = await dispatch(
      fetchAdminNewsletters({
        preferredId: savedId || payload?._id,
        fallbackToFirst: true,
      })
    );

    if (!res?.ok) return;

    saveCache(res.list || []);

    if (!shouldSilenceToast(type, payload)) {
      push({
        title:
          type === "reactivated"
            ? "Subscriber reactivated live"
            : type === "updated"
            ? "Subscriber updated live"
            : type === "deleted"
            ? "Subscriber deleted live"
            : "New subscriber joined live",

        description:
          type === "deleted" && payload?.email
            ? `${payload.email} was removed from the list.`
            : payload?.email
            ? `${payload.email} updated in real time.`
            : "Your newsletter database updated in real time.",

        variant: "success",
        duration: 3200,
      });
    }
  } catch {
    // silent fail to prevent socket crash loops
  }
};

  socket.on("newsletter:new-subscriber", (payload) => {
    refreshNewsletters(payload, "new");
  });

  socket.on("newsletter:subscriber-reactivated", (payload) => {
    refreshNewsletters(payload, "reactivated");
  });

  socket.on("newsletter:subscriber-updated", (payload) => {
    refreshNewsletters(payload, "updated");
  });

  socket.on("newsletter:subscriber-deleted", (payload) => {
    refreshNewsletters(payload, "deleted");
  });

  return () => {
    socket.off("newsletter:new-subscriber");
    socket.off("newsletter:subscriber-reactivated");
    socket.off("newsletter:subscriber-updated");
    socket.off("newsletter:subscriber-deleted");
  };
}, [dispatch, push]);

  const selectedNewsletter = useMemo(() => {
  if (!selectedId) return null;

  return (
    newsletters.find((n) => getId(n) === selectedId) || null
  );
}, [newsletters, selectedId]);

  useEffect(() => {
    if (!selectedNewsletter) return;

    setForm({
      name: selectedNewsletter.name || "",
      email: selectedNewsletter.email || "",
      topic: selectedNewsletter.topic || "",
      source: selectedNewsletter.source || "footer",
      notes: selectedNewsletter.notes || "",
      isActive:
        typeof selectedNewsletter.isActive === "boolean"
          ? selectedNewsletter.isActive
          : true,
    });

    // clear local visible error message when switching records
    if (reduxError) {
      dispatch(setManageNewsletterSystemMessage(null, null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNewsletter]);

  const analytics = useMemo(() => {
  const total = backendTotal || newsletters.length;
  const active =
    backendActive || newsletters.filter((n) => n.isActive === true).length;
  const inactive =
    backendInactive || newsletters.filter((n) => n.isActive === false).length;

  const bySourceMap = newsletters.reduce((acc, n) => {
    const source = String(n.source || "unknown").trim().toLowerCase();
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const topSources = Object.entries(bySourceMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return {
    total,
    active,
    inactive,
    topSources,
  };
}, [newsletters, backendTotal, backendActive, backendInactive]);

  const filteredNewsletters = useMemo(() => {
    if (!search.trim()) return newsletters;
    const q = search.toLowerCase();
    return newsletters.filter((n) => {
      const email = (n.email || "").toLowerCase();
      const name = (n.name || "").toLowerCase();
      const topic = (n.topic || "").toLowerCase();
      const source = (n.source || "").toLowerCase();
      return (
        email.includes(q) ||
        name.includes(q) ||
        topic.includes(q) ||
        source.includes(q)
      );
    });
  }, [newsletters, search]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({
  ...p,
  [name]: typeof value === "string" ? value.replace(/\s{2,}/g, " ") : value,
}));
  }

 async function handleDeleteSelected() {
  if (!selectedIds.length || deleting) return;

  const confirmed = window.confirm(
    `Delete ${selectedIds.length} subscriber${
      selectedIds.length > 1 ? "s" : ""
    }? This cannot be undone.`
  );

  if (!confirmed) return;

  selectedIds.forEach((id) => {
    lastLocalActionRef.current = {
      type: "deleted",
      id,
      time: Date.now(),
    };
  });

  const results = await Promise.all(
    selectedIds.filter(Boolean).map((id) => dispatch(deleteAdminNewsletter(id)))
  );

  const failed = results.filter((r) => !r?.ok);
  const succeeded = results.filter((r) => r?.ok);

  if (succeeded.length) {
    push({
      title: "Subscribers deleted",
      description: `${succeeded.length} subscriber${
        succeeded.length > 1 ? "s" : ""
      } removed successfully.`,
      variant: "success",
    });
  }

  if (failed.length) {
    push({
      title: "Some deletions failed",
      description: `${failed.length} item${
        failed.length > 1 ? "s" : ""
      } could not be deleted.`,
      variant: "error",
    });
  }

  clearBulkSelection();

  const refresh = await dispatch(
    fetchAdminNewsletters({
      preferredId: selectedId,
      fallbackToFirst: true,
      search,
    })
  );

  if (refresh?.ok) {
    saveCache(refresh.list || []);
  }
  };
  
  async function handleBulkStatus(nextActive) {
  if (!selectedIds.length || bulkUpdating) return;

  setBulkUpdating(true);

  try {
    const results = await Promise.all(
      selectedIds.filter(Boolean).map((id) =>
        dispatch(
          bulkUpdateAdminNewsletters(id, {
            isActive: !!nextActive,
          })
        )
      )
    );

    const failed = results.filter((r) => !r?.ok);
    const succeeded = results.filter((r) => r?.ok);

    if (succeeded.length) {
      push({
        title: nextActive ? "Subscribers activated" : "Subscribers paused",
        description: `${succeeded.length} subscriber${succeeded.length > 1 ? "s" : ""} updated successfully.`,
        variant: "success",
      });
    }

    if (failed.length) {
      push({
        title: "Some updates failed",
        description: `${failed.length} item${failed.length > 1 ? "s" : ""} could not be updated.`,
        variant: "error",
      });
    }

    const savedId = (() => {
      try {
        return localStorage.getItem(LS_SELECTED_KEY);
      } catch {
        return null;
      }
    })();

    const refresh = await dispatch(
      fetchAdminNewsletters({
        preferredId: savedId,
        fallbackToFirst: true,
      })
    );

    if (refresh?.ok) {
      saveCache(refresh.list || []);
    }
  } finally {
    setBulkUpdating(false);
  }
}

  function toggleSelected(id) {
  setSelectedIds((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  );
}

function clearBulkSelection() {
  setSelectedIds([]);
}

function selectAllFiltered() {
  setSelectedIds(filteredNewsletters.map((n) => getId(n)).filter(Boolean));
}

function exportNewslettersToCsv(rows) {
  const headers = [
    "name",
    "email",
    "topic",
    "source",
    "notes",
    "isActive",
    "createdAt",
    "updatedAt",
  ];

  const escapeCell = (value) => {
    const str = String(value ?? "");
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => {
          if (key === "isActive") return escapeCell(row?.isActive ? "true" : "false");
          return escapeCell(row?.[key] ?? "");
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([`\uFEFF${csv}`], {
  type: "text/csv;charset=utf-8;",
});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `newsletters-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

  function toggleActive() {
    setForm((p) => ({ ...p, isActive: !p.isActive }));
  }

  async function handleSave(e) {
  e.preventDefault();
  if (!selectedNewsletter || submitting) return;

  setSubmitting(true);

  try {
    const id = getId(selectedNewsletter);

    const clean = {
      name: String(form.name || "").trim().slice(0, 80),
      email: String(form.email || "").trim().toLowerCase(),
      topic: String(form.topic || "").trim().slice(0, 60),
      source: String(form.source || "").trim().slice(0, 40),
      notes: String(form.notes || "").trim().slice(0, 1000),
      isActive: !!form.isActive,
    };

    // ✅ email validation
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean.email);
    if (!validEmail) {
      const msg = "Please enter a valid email address.";

      dispatch(setManageNewsletterSystemMessage("error", msg));

      push({
        title: "Invalid email",
        description: msg,
        variant: "error",
      });

      return;
    }

    // ✅ change detection (prevents useless API calls)
    const noChange =
      clean.name === (selectedNewsletter.name || "") &&
      clean.email === (selectedNewsletter.email || "") &&
      clean.topic === (selectedNewsletter.topic || "") &&
      clean.source === (selectedNewsletter.source || "") &&
      clean.notes === (selectedNewsletter.notes || "") &&
      clean.isActive ===
        (typeof selectedNewsletter.isActive === "boolean"
          ? selectedNewsletter.isActive
          : true);

    if (noChange) {
      const msg = "No changes detected.";

      dispatch(setManageNewsletterSystemMessage("info", msg));

      return;
    }

    lastLocalActionRef.current = {
  type: "updated",
  id,
  time: Date.now(),
};

    const res = await dispatch(updateAdminNewsletter(id, clean));

    if (res?.ok) {
      const updatedList = newsletters.map((n) =>
        getId(n) === getId(res.updated) ? res.updated : n
      );

      saveCache(updatedList);

      try {
        localStorage.setItem(LS_SELECTED_KEY, getId(res.updated));
      } catch { /* empty */ }

      push({
        title: "Newsletter updated",
        description: "Changes saved successfully.",
        variant: "success",
      });

      return;
    }

    const message =
      res?.message ||
      "Update failed. Please try again or check your admin access.";

    dispatch(setManageNewsletterSystemMessage("error", message));

    push({
      title: "Update failed",
      description: message,
      variant: "error",
    });
  } finally {
    setSubmitting(false);
  }
  };

  function handleReset() {
    if (!selectedNewsletter) return;

    setForm({
      name: selectedNewsletter.name || "",
      email: selectedNewsletter.email || "",
      topic: selectedNewsletter.topic || "",
      source: selectedNewsletter.source || "footer",
      notes: selectedNewsletter.notes || "",
      isActive:
        typeof selectedNewsletter.isActive === "boolean"
          ? selectedNewsletter.isActive
          : true,
    });

    dispatch(setManageNewsletterSystemMessage(null, null));
  }

  return (
    <>
      <Page>
        <Shell>
          <HeaderRow>
            <TitleBlock>
              <Kicker>First 1–3 seconds hook</Kicker>
              <Title>Luxury Newsletter Command Center</Title>
              <Subtitle>
  Every subscriber. Every source. Every move — tracked live in a premium
  command center built for serious growth.
</Subtitle>
            </TitleBlock>

            <Badge>
              <StarRow>
                <Star>★</Star>
                <Star>★</Star>
                <Star>★</Star>
                <Star>★</Star>
                <Star>★</Star>
              </StarRow>
              <span>Admin-grade clarity. Zero mess.</span>
            </Badge>
          </HeaderRow>

          <StatsRow>
  <StatCard>
    <StatLabel>Total Subscribers</StatLabel>
    <StatValue>{analytics.total}</StatValue>
  </StatCard>

  <StatCard>
    <StatLabel>Active</StatLabel>
    <StatValue>{analytics.active}</StatValue>
  </StatCard>

  <StatCard>
    <StatLabel>Paused</StatLabel>
    <StatValue>{analytics.inactive}</StatValue>
  </StatCard>

  <StatCard>
    <StatLabel>Top Source</StatLabel>
    <StatValue>{analytics.topSources[0]?.[0] || "—"}</StatValue>
  </StatCard>
</StatsRow>

          {(systemMessage || reduxError) && (
            <SystemBar $tone={systemMessage?.tone || "error"}>
              {(systemMessage?.tone || "error") === "error" ? "⚠️" : "✅"}
              <span>{systemMessage?.text || reduxError}</span>
            </SystemBar>
          )}

          <BulkBar>
  <div>
    {selectedIds.length} selected
  </div>

  <BulkActions>
    <MiniButton
      type="button"
      onClick={selectAllFiltered}
      disabled={!filteredNewsletters.length}
    >
      Select All
    </MiniButton>

    <MiniButton
      type="button"
      onClick={clearBulkSelection}
      disabled={!selectedIds.length}
    >
      Clear
    </MiniButton>

    <MiniButton
      type="button"
      onClick={() => handleBulkStatus(true)}
      disabled={!selectedIds.length || bulkUpdating}
    >
      Activate
    </MiniButton>

    <MiniButton
      type="button"
      onClick={() => handleBulkStatus(false)}
      disabled={!selectedIds.length || bulkUpdating}
    >
      Pause
    </MiniButton>

    <MiniButton
      type="button"
      onClick={() => exportNewslettersToCsv(filteredNewsletters)}
      disabled={!filteredNewsletters.length}
    >
      Export CSV
    </MiniButton>

    <MiniButton
      type="button"
      onClick={handleDeleteSelected}
      disabled={!selectedIds.length || deleting}
    >
      {deleting ? "Deleting..." : "Delete"}
    </MiniButton>
  </BulkActions>
</BulkBar>

          <Layout>
            {/* LEFT */}
            <Panel
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              <PanelHeader>
                <PanelTitle>Subscribers</PanelTitle>
                <Chip>Real-Time Live Database</Chip>
              </PanelHeader>

              <SearchBar>
                <SearchInput
                  placeholder="Search by email, name, topic, or source…"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
                <CountPill>
                  {loadingList
                    ? "Loading…"
                    : `${filteredNewsletters.length} of ${newsletters.length}`}
                </CountPill>
              </SearchBar>

              {filteredNewsletters.length === 0 && !loadingList ? (
                <EmptyState>No results. Clear search to see all.</EmptyState>
              ) : (
                <List>
                  <AnimatePresence initial={false}>
                    {filteredNewsletters.map((n) => {
                      const id = getId(n);
                      return (
                        <ListItem
  key={id}
  role="button"
  tabIndex={0}
  $active={id === selectedId}
  onClick={() => {
    const nextId = getId(n);
    dispatch(setSelectedNewsletterId(nextId));

    try {
      localStorage.setItem(LS_SELECTED_KEY, nextId);
    } catch {
      // ignore
    }

    dispatch(setManageNewsletterSystemMessage(null, null));
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();

      const nextId = getId(n);
      dispatch(setSelectedNewsletterId(nextId));

      try {
        localStorage.setItem(LS_SELECTED_KEY, nextId);
      } catch {
        // ignore
      }

      dispatch(setManageNewsletterSystemMessage(null, null));
    }
  }}
  layout
  initial={{ opacity: 0, y: 4 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -4 }}
  transition={{ duration: 0.16 }}
>
  <div>
    <Meta>
      <SelectTagButton
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleSelected(id);
        }}
      >
        {selectedIds.includes(id) ? "Selected" : "Select"}
      </SelectTagButton>

      {n.name ? <Tag>{n.name}</Tag> : null}
      {n.topic ? <Tag>{n.topic}</Tag> : null}
      {n.source ? <Tag>{n.source}</Tag> : null}
      {typeof n.isActive === "boolean" ? (
        <Tag>{n.isActive ? "Active" : "Inactive"}</Tag>
      ) : null}
    </Meta>

    <Email>{n.email || "Unknown email"}</Email>
  </div>

  <DateText>
    {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}
  </DateText>
</ListItem>
                      );
                    })}
                  </AnimatePresence>
                </List>
              )}
            </Panel>

            {/* RIGHT */}
            <Panel
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.04 }}
            >
              <PanelHeader>
                <PanelTitle>Edit & Save</PanelTitle>
                <Chip>Live Sync</Chip>
              </PanelHeader>

              {!selectedNewsletter ? (
                <EmptyState>Select a subscriber to edit.</EmptyState>
              ) : (
                <Form onSubmit={handleSave}>
                  <FieldRow>
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Subscriber name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                          placeholder="name@example.com"
                          onBlur={() => {
    if (
      form.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(form.email)
    ) {
      dispatch(
        setManageNewsletterSystemMessage(
          "error",
          "Invalid email format."
        )
      );
    }
  }}
                      />
                    </div>
                  </FieldRow>

                  <FieldRow>
                    <div>
                      <Label htmlFor="topic">Topic</Label>
                      <Input
                        id="topic"
                        name="topic"
                        value={form.topic}
                        onChange={handleChange}
                        placeholder="e.g. Boxing, Style, Coding"
                      />
                    </div>
                    <div>
                      <Label htmlFor="source">Source</Label>
                      <Input
                        id="source"
                        name="source"
                        value={form.source}
                        onChange={handleChange}
                        placeholder="footer, landing, popup..."
                      />
                    </div>
                  </FieldRow>

                  <div>
                    <Label>Active Status</Label>
                    <SwitchRow>
                      <SwitchLabel>
                        {form.isActive
                          ? "Active (receives campaigns)"
                          : "Inactive (paused)"}
                      </SwitchLabel>
                      <Switch
                        type="button"
                        $active={form.isActive}
                        onClick={toggleActive}
                      >
                        <SwitchThumb />
                      </Switch>
                    </SwitchRow>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <TextArea
                      id="notes"
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      placeholder="Internal notes/tags. (Optional)"
                    />
                  </div>

                  <HelperText>
                    Saving updates the database immediately. We also cache the last
                    viewed selection safely in localStorage for admin convenience.
                  </HelperText>

                  <ButtonRow>
                    <PrimaryButton type="submit" disabled={saving || submitting}>
                      {saving ? "Saving…" : "Save Changes"}
                    </PrimaryButton>
                    <GhostButton
  type="button"
  onClick={handleReset}
  disabled={saving || submitting}
>
                      Reset
                    </GhostButton>
                  </ButtonRow>
                </Form>
              )}
            </Panel>
          </Layout>
        </Shell>
      </Page>
    </>
  );
}

