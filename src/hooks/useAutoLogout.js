import { useEffect, useRef } from "react";

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

export default function useAutoLogout({
  isAuthenticated,
  logout,
  timeout = DEFAULT_TIMEOUT,
}) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    function clearTimer() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }

    function startTimer() {
      clearTimer();

      timerRef.current = setTimeout(async () => {
        try {
          await logout?.({
            reason: "inactive",
            message: "You were logged out after 30 minutes of inactivity.",
          });
        } catch {
          logout?.();
        }
      }, timeout);
    }

    function resetTimer() {
      startTimer();
    }

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    startTimer();

    return () => {
      clearTimer();

      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, logout, timeout]);
}
