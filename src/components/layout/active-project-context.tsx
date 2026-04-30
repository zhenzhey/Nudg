"use client";

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

interface ActiveProject {
  id: string;
  title: string;
}

interface ActiveProjectContextValue {
  active: ActiveProject | null;
  setActive: (p: ActiveProject | null) => void;
}

const Ctx = createContext<ActiveProjectContextValue | null>(null);

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const [active, setActiveState] = useState<ActiveProject | null>(null);
  const setActive = useCallback((p: ActiveProject | null) => setActiveState(p), []);
  const value = useMemo(() => ({ active, setActive }), [active, setActive]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActiveProject(): ActiveProjectContextValue {
  const v = useContext(Ctx);
  // Outside the provider (e.g. unauthenticated routes) we just return a no-op
  // so consumers don't have to null-check.
  if (!v) return { active: null, setActive: () => {} };
  return v;
}
