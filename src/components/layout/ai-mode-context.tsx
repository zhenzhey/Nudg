"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AIModeContextValue {
  aiOn: boolean;
  setAiOn: (v: boolean) => void;
  toggle: () => void;
}

const Ctx = createContext<AIModeContextValue | null>(null);
const STORAGE_KEY = "nudg.ai_on";

export function AIModeProvider({ children }: { children: ReactNode }) {
  const [aiOn, setAiOnState] = useState<boolean>(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "false") setAiOnState(false);
    } catch {}
  }, []);

  const setAiOn = useCallback((v: boolean) => {
    setAiOnState(v);
    try {
      localStorage.setItem(STORAGE_KEY, String(v));
    } catch {}
  }, []);

  const toggle = useCallback(() => setAiOn(!aiOn), [aiOn, setAiOn]);

  const value = useMemo(() => ({ aiOn, setAiOn, toggle }), [aiOn, setAiOn, toggle]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAIMode(): AIModeContextValue {
  const v = useContext(Ctx);
  if (!v) return { aiOn: true, setAiOn: () => {}, toggle: () => {} };
  return v;
}
