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

const clearPosition = (pathname: string) => {
  try {
    window.sessionStorage.removeItem(storageKey(pathname));
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
    const observer = new ResizeObserver(apply);
    observer.observe(document.documentElement);

    const finish = () => {
      window.clearInterval(timer);
      window.clearTimeout(stop);
      observer.disconnect();
      restoringRef.current = false;
      window.removeEventListener("wheel", finish);
      window.removeEventListener("touchmove", finish);
      window.removeEventListener("keydown", onKey);
      // Once restored (or the user takes over), drop the saved position so
      // normal scrolling works and a later POP re-reads a fresh value.
      clearPosition(location.pathname);
      writePosition(location.pathname, window.scrollY);
    };

    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) finish();
    };

    // Stop restoring as soon as the user tries to scroll.
    window.addEventListener("wheel", finish, { passive: true });
    window.addEventListener("touchmove", finish, { passive: true });
    window.addEventListener("keydown", onKey);

    const stop = window.setTimeout(finish, 30000);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(stop);
      observer.disconnect();
      restoringRef.current = false;
      window.removeEventListener("wheel", finish);
      window.removeEventListener("touchmove", finish);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navigationType]);

  useLayoutEffect(() => {
    const onScroll = () => {
      if (!restoringRef.current) writePosition(location.pathname, window.scrollY);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  return null;
}
