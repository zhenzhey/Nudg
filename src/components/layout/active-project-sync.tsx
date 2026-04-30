"use client";

import { useEffect } from "react";
import { useActiveProject } from "./active-project-context";

// Tiny helper for server pages: pass the project id/title and the context
// will reflect it in the navbar breadcrumb. Renders nothing.
export function ActiveProjectSync({ id, title }: { id: string; title: string }) {
  const { setActive } = useActiveProject();
  useEffect(() => {
    setActive({ id, title });
    return () => setActive(null);
  }, [id, title, setActive]);
  return null;
}
