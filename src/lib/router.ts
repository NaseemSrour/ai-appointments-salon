// Minimal path-based routing — no dependency. Enough for three top-level
// views (booking `/`, admin `/admin`, TV board `/display`). Vite serves
// index.html for all paths in dev (SPA fallback); in production add the same
// rewrite at the host (e.g. Firebase Hosting `"rewrites": [{ "source": "**",
// "destination": "/index.html" }]`).

import { useEffect, useState } from 'react';

export type Route = '/' | '/admin' | '/display';

function normalize(pathname: string): Route {
  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname.startsWith('/display')) return '/display';
  return '/';
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => normalize(window.location.pathname));
  useEffect(() => {
    const onPop = () => setRoute(normalize(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return route;
}

export function navigate(to: Route): void {
  if (normalize(window.location.pathname) === to) return;
  window.history.pushState({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
