import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

type ScrollEntryState = {
  __scrollPath?: string;
  __scrollY?: number;
};

let restoring = false;

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

const savePosition = (pathname: string, y: number) => {
  try {
    const state = (window.history.state ?? {}) as ScrollEntryState;
    window.history.replaceState(
      { ...state, __scrollPath: pathname, __scrollY: y },
      "",
      window.location.href,
    );
  } catch {
    /* history unavailable */
  }
};

export default function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    const state = (window.history.state ?? {}) as ScrollEntryState;
    const saved = state.__scrollPath === location.pathname
      ? state.__scrollY
      : undefined;

    // A newly opened page always starts at the top. Back/Forward returns to
    // the position stored on that specific browser history entry.
    if (navigationType !== "POP" || saved === undefined) {
      window.scrollTo(0, 0);
      savePosition(location.pathname, 0);
      return;
    }

    const apply = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (saved > maxScroll || window.scrollY === saved) return;
      window.scrollTo(0, saved);
    };

    restoring = true;
    apply();
    const timer = window.setInterval(apply, 100);
    const stop = window.setTimeout(() => {
      window.clearInterval(timer);
      restoring = false;
    }, 8000);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(stop);
      restoring = false;
    };
  }, [location.pathname, navigationType]);

  useLayoutEffect(() => {
    const onScroll = () => {
      if (!restoring) savePosition(location.pathname, window.scrollY);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  return null;
}