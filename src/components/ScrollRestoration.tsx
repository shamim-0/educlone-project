import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Remember each page's scroll position so that going back (or forward)
// returns you to the exact spot you left, instead of jumping to the top.
//
// Positions are keyed by pathname (location.key is not unique across routes
// in this app) and mirrored to sessionStorage so they survive full page
// reloads — which is what a back/forward navigation can trigger here.
const scrollPositions = new Map<string, number>();

const storageKey = (pathname: string) => `sr-pos:${pathname}`;

const readSaved = (pathname: string): number | undefined => {
  if (scrollPositions.has(pathname)) return scrollPositions.get(pathname);
  try {
    const raw = sessionStorage.getItem(storageKey(pathname));
    if (raw !== null) return Number(raw) || 0;
  } catch {
    /* storage unavailable */
  }
  return undefined;
};

const writeSaved = (pathname: string, y: number) => {
  scrollPositions.set(pathname, y);
  try {
    sessionStorage.setItem(storageKey(pathname), String(y));
  } catch {
    /* storage unavailable */
  }
};

// True while a restore is in progress; during that window scroll events
// (including the browser's own native restoration) are ignored so they
// cannot overwrite the position we are restoring.
let restoring = false;

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

export default function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();

  // On back/forward navigation, return to the exact spot the user left.
  // The page may still be loading its content (which can grow and shrink),
  // and the browser may apply its own native scroll, so keep re-applying
  // until the document is tall enough to hold the saved position.
  useLayoutEffect(() => {
    if (navigationType !== "POP") return;
    const saved = readSaved(location.pathname);
    if (saved === undefined) return;

const apply = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (saved > maxScroll) return; // page not tall enough yet — keep waiting
      if (window.scrollY === saved) return; // already there — never fight the user
      window.scrollTo(0, saved);
      writeSaved(location.pathname, saved);
    };

apply();
    // A fresh visit with nothing saved (or a restored position of "top of
    // page") needs no restore window — starting one would only fight the
    // user's scrolling. For any real saved position we keep the window
    // alive even if we are already at the target, so a late native
    // browser restore cannot knock us off it.
    if (saved === 0 && window.scrollY === 0) return;

    restoring = true;
    const timer = setInterval(apply, 100);
const stop = setTimeout(() => {
      clearInterval(timer);
      restoring = false;
    }, 8000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
      restoring = false;
    };
  }, [location.pathname, navigationType]);

  // Track the current page's scroll position continuously so it can be
  // restored later. Runs after the restore effect so it never overwrites
  // a saved position before it is read.
  useLayoutEffect(() => {
    const onScroll = () => {
      if (restoring) return;
      writeSaved(location.pathname, window.scrollY);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  return null;
}