import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const storageKey = (pathname: string) => `scroll-position:${pathname}`;

const readPosition = (pathname: string) => {
  try {
    const value = window.sessionStorage.getItem(storageKey(pathname));
    if (value === null) return undefined;
    const position = Number(value);
    return Number.isFinite(position) ? position : undefined;
  } catch {
    return undefined;
  }
};

const writePosition = (pathname: string, position: number) => {
  try {
    window.sessionStorage.setItem(storageKey(pathname), String(position));
  } catch {
    /* storage unavailable */
  }
};

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

export default function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const restoringRef = useRef(false);

  useLayoutEffect(() => {
    const saved = readPosition(location.pathname);

    if (navigationType !== "POP" || saved === undefined) {
      restoringRef.current = false;
      window.scrollTo(0, 0);
      writePosition(location.pathname, 0);
      return;
    }

    const apply = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (saved > maxScroll) return;
      window.scrollTo(0, saved);
    };

    if (saved === 0) {
      apply();
      return;
    }

    restoringRef.current = true;
    apply();
    const timer = window.setInterval(apply, 100);
    const stop = window.setTimeout(() => {
      window.clearInterval(timer);
      restoringRef.current = false;
    }, 8000);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(stop);
      restoringRef.current = false;
    };
  }, [location.pathname, navigationType]);

  useLayoutEffect(() => {
    const onScroll = () => {
      if (!restoringRef.current) writePosition(location.pathname, window.scrollY);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (!restoringRef.current) writePosition(location.pathname, window.scrollY);
    };
  }, [location.pathname]);

  return null;
}