// src/components/Toast.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled, { css } from "styled-components";
import { AnimatePresence, motion } from "framer-motion";

const ToastContext = createContext(null);
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ---- hardening helpers (prevents UI abuse) ----
const MAX_TITLE_LEN = 140;
const MAX_DESC_LEN = 420;

// Remove control chars + angle brackets (React already escapes text, but this prevents weird UI payloads)
function cleanText(input, maxLen) {
  const s = String(input ?? "");
  // eslint-disable-next-line no-control-regex
  const noCtl = s.replace(/[\u0000-\u001F\u007F]/g, ""); // control chars
  const noAngles = noCtl.replace(/[<>]/g, "");
  const trimmed = noAngles.trim();
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

function normalizeVariant(variant) {
  const v = String(variant || "").toLowerCase();
  return ["success", "error", "info", "warning", "neutral"].includes(v)
    ? v
    : null;
}

// ---- infer variant based on message text when not provided
function inferVariant(title = "", description = "") {
  const text = `${title} ${description}`.toLowerCase();
  const has = (words) => words.some((w) => text.includes(w));
  if (has(["error", "failed", "fail", "oops", "invalid", "network", "denied"]))
    return "error";
  if (has(["success", "saved", "subscribed", "complete", "completed", "done"]))
    return "success";
  if (has(["warn", "warning", "caution", "risky", "expire", "expiring"]))
    return "warning";
  if (has(["info", "heads up", "note", "tip", "fyi", "already"])) return "info";
  return "neutral";
}

// Build a stable key for deduping (variant + title + description)
function makeKey(variant, title = "", description = "") {
  const v = (variant || "neutral").toLowerCase();
  const t = String(title).trim().toLowerCase();
  const d = String(description).trim().toLowerCase();
  return `${v}|${t}|${d}`;
}

export function ToastProvider({
  children,
  placement = "top-right",
  max = 6,
  defaultDuration = 3200, // brisk by default
}) {
  const [toasts, setToasts] = useState([]);
  const timeouts = useRef(new Map()); // id -> timeout
  const keyIndex = useRef(new Map()); // dedupeKey -> id

  // ✅ anti-spam burst limiter: limits how many toasts can be created quickly
  const burst = useRef({ ts: 0, count: 0 });
  const BURST_WINDOW_MS = 1200;
  const BURST_MAX = 4;

  const clearTimer = useCallback((id) => {
    const t = timeouts.current.get(id);
    if (t) {
      clearTimeout(t);
      timeouts.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id) => {
      setToasts((curr) => curr.filter((t) => t.id !== id));
      clearTimer(id);

      // also remove any dedupe mapping pointing to this id
      for (const [k, mappedId] of keyIndex.current.entries()) {
        if (mappedId === id) keyIndex.current.delete(k);
      }
    },
    [clearTimer]
  );

  const dismissAll = useCallback(() => {
    setToasts([]);
    timeouts.current.forEach((t) => clearTimeout(t));
    timeouts.current.clear();
    keyIndex.current.clear();
  }, []);

  // ✅ cleanup on unmount (prevents memory leaks)
  useEffect(() => {
    return () => {
      timeouts.current.forEach((t) => clearTimeout(t));
      // eslint-disable-next-line react-hooks/exhaustive-deps
      timeouts.current.clear();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      keyIndex.current.clear();
    };
  }, []);

  const push = useCallback(
    ({ title, description, variant, duration } = {}) => {
      // ✅ burst limiter (prevents spam/abuse)
      const now = Date.now();
      if (now - burst.current.ts > BURST_WINDOW_MS) {
        burst.current.ts = now;
        burst.current.count = 0;
      }
      burst.current.count += 1;

      if (burst.current.count > BURST_MAX) {
        // silently ignore extra spam toasts
        return null;
      }

      // ✅ sanitize/clamp user-visible strings
      const safeTitle = cleanText(title, MAX_TITLE_LEN);
      const safeDesc = cleanText(description, MAX_DESC_LEN);

      const normalizedVariant = normalizeVariant(variant);
      const effectiveVariant = normalizedVariant || inferVariant(safeTitle, safeDesc);

      const ms =
        typeof duration === "number" && Number.isFinite(duration)
          ? duration
          : defaultDuration;

      const safeDuration = Math.max(0, Math.min(ms, 15000)); // cap to 15s

      const dedupeKey = makeKey(effectiveVariant, safeTitle, safeDesc);

      // If a toast with the same key exists, refresh and move it to the top
      const existingId = keyIndex.current.get(dedupeKey);
      if (existingId) {
        setToasts((curr) => {
          const found = curr.find((t) => t.id === existingId);
          if (!found) {
            keyIndex.current.delete(dedupeKey);
            return curr;
          }

          const updated = {
            ...found,
            title: safeTitle,
            description: safeDesc,
            variant: effectiveVariant,
            duration: safeDuration,
          };

          const rest = curr.filter((t) => t.id !== existingId);
          return [updated, ...rest].slice(0, max);
        });

        // reset timer
        clearTimer(existingId);
        if (safeDuration > 0) {
          const t = setTimeout(() => dismiss(existingId), safeDuration);
          timeouts.current.set(existingId, t);
        }
        return existingId;
      }

      // Otherwise create a new toast
      const id = uid();
      const item = {
        id,
        title: safeTitle,
        description: safeDesc,
        variant: effectiveVariant,
        duration: safeDuration,
      };

      setToasts((curr) => {
        const next = [item, ...curr];
        return next.slice(0, max);
      });

      keyIndex.current.set(dedupeKey, id);

      if (safeDuration > 0) {
        const t = setTimeout(() => dismiss(id), safeDuration);
        timeouts.current.set(id, t);
      }
      return id;
    },
    [defaultDuration, max, dismiss, clearTimer]
  );

  /**
   * ✅ Backward compatible helper:
   * Many of your pages use: showToast("message", "success")
   * This guarantees it exists and never breaks.
   */
  const showToast = useCallback(
    (message, variant = "neutral", duration) => {
      const v = normalizeVariant(variant) || inferVariant(message, "");
      return push({
        title: cleanText(message, MAX_TITLE_LEN),
        description: "",
        variant: v,
        duration,
      });
    },
    [push]
  );

  const value = useMemo(
    () => ({ push, dismiss, dismissAll, showToast }),
    [push, dismiss, dismissAll, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Stack
        role="region"
        aria-label="Notifications"
        aria-live="assertive"
        aria-atomic="true"
        $placement={placement}
      >
        <AnimatePresence initial={true}>
          {toasts.map((t) => (
            <ToastCard
              key={t.id}
              layout
              initial={{
                y: placement.startsWith("top") ? -10 : 10,
                opacity: 0,
                scale: 0.995,
              }}
              animate={{
                y: 0,
                opacity: 1,
                scale: 1,
                transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
              }}
              exit={{
                y: placement.startsWith("top") ? -12 : 12,
                opacity: 0,
                scale: 0.98,
                transition: { duration: 0.12, ease: "easeInOut" },
              }}
              $variant={t.variant}
            >
              <Accent $variant={t.variant} />
              <Content>
                {t.title ? <Title>{t.title}</Title> : null}
                {t.description ? <Desc>{t.description}</Desc> : null}
              </Content>
              <CloseButton
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                title="Dismiss"
              >
                <CloseIcon viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6.8 6.8a1 1 0 0 1 1.4 0L12 10.6l3.8-3.8a1 1 0 1 1 1.4 1.4L13.4 12l3.8 3.8a1 1 0 1 1-1.4 1.4L12 13.4l-3.8 3.8a1 1 0 0 1-1.4-1.4L10.6 12 6.8 8.2a1 1 0 0 1 0-1.4Z" />
                </CloseIcon>
              </CloseButton>
            </ToastCard>
          ))}
        </AnimatePresence>
      </Stack>
    </ToastContext.Provider>
  );
}

/* -------------------- styled -------------------- */

const Stack = styled.div`
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  ${(p) =>
    ({
      "top-right": css`
        top: 20px;
        right: 20px;
        align-items: flex-end;
      `,
      "top-left": css`
        top: 20px;
        left: 20px;
        align-items: flex-start;
      `,
      "bottom-right": css`
        bottom: 20px;
        right: 20px;
        align-items: flex-end;
      `,
      "bottom-left": css`
        bottom: 20px;
        left: 20px;
        align-items: flex-start;
      `,
    }[p.$placement || "top-right"])};
`;

const ToastCard = styled(motion.div)`
  pointer-events: auto;
  display: grid;
  grid-template-columns: 8px 1fr auto;
  align-items: stretch;
  min-width: 320px;
  max-width: 460px;
  border-radius: ${(p) => p.theme.radius.lg};
  background: ${(p) => p.theme.colors.glass};
  backdrop-filter: blur(16px) saturate(1.25);
  -webkit-backdrop-filter: blur(16px) saturate(1.25);
  box-shadow: ${(p) => p.theme.shadow.glow};
  position: relative;
  overflow: hidden;

  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: ${(p) => gradientFor(p.$variant, p.theme)};
    -webkit-mask: linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }
`;

const Accent = styled.div`
  width: 8px;
  background: ${(p) => stripeFor(p.$variant, p.theme)};
`;

const Content = styled.div`
  padding: 14px 16px;
  display: grid;
  gap: 6px;
`;

const Title = styled.div`
  color: ${(p) => p.theme.colors.ivory};
  font-weight: 700;
  letter-spacing: 0.2px;
  line-height: 1.2;
`;

const Desc = styled.div`
  color: ${(p) => p.theme.colors.lightBrown};
  font-size: 0.95rem;
  line-height: 1.35;
`;

const CloseButton = styled.button`
  align-self: start;
  margin: 10px 10px 0 0;
  border: 0;
  outline: 0;
  background: transparent;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: ${(p) => p.theme.radius.pill};
  display: grid;
  place-items: center;
  color: ${(p) => p.theme.colors.ivory};
  opacity: 0.9;

  &:hover {
    transform: scale(1.05);
    opacity: 1;
  }
  &:active {
    transform: scale(0.98);
  }
`;

const CloseIcon = styled.svg`
  width: 18px;
  height: 18px;
  fill: currentColor;
`;

/* ------------------- helpers (colors) ------------------- */

function gradientFor(variant, theme) {
  const { darkBrown, brown, lightBrown, ivory, cocoa } = theme.colors;
  switch (variant) {
    case "success":
      return `linear-gradient(135deg, ${lightBrown}, ${ivory})`;
    case "error":
      return `linear-gradient(135deg, ${brown}, ${darkBrown})`;
    case "info":
      return `linear-gradient(135deg, ${ivory}, ${cocoa})`;
    case "warning":
      return `linear-gradient(135deg, ${lightBrown}, ${brown})`;
    default:
      return `linear-gradient(135deg, ${ivory}, ${lightBrown})`;
  }
}

function stripeFor(variant, theme) {
  const { darkBrown, brown, lightBrown, cocoa } = theme.colors;
  switch (variant) {
    case "success":
      return `linear-gradient(180deg, ${lightBrown}, ${theme.colors.ivory})`;
    case "error":
      return `linear-gradient(180deg, ${brown}, ${darkBrown})`;
    case "info":
      return `linear-gradient(180deg, ${theme.colors.ivory}, ${cocoa})`;
    case "warning":
      return `linear-gradient(180deg, ${lightBrown}, ${brown})`;
    default:
      return `linear-gradient(180deg, ${cocoa}, ${brown})`;
  }
}
