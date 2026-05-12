// Almost Done mode state — shared between the toolbar toggle and workspace
"use client";

import { useState, useCallback } from "react";

export interface AlmostDoneState {
  active: boolean;
  toggle: () => void;
  activate: () => void;
  deactivate: () => void;
}

export function useAlmostDone(): AlmostDoneState {
  const [active, setActive] = useState(false);

  const toggle = useCallback(() => setActive((v) => !v), []);
  const activate = useCallback(() => setActive(true), []);
  const deactivate = useCallback(() => setActive(false), []);

  return { active, toggle, activate, deactivate };
}
