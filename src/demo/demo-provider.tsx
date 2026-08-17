"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import type { DemoAction, DemoState } from "./model";
import { createDemoState, demoReducer, readDemoState } from "./state";

const STORAGE_KEY = "more-sore-demo-v1";
const DemoContext = createContext<{
  state: DemoState;
  dispatch: React.Dispatch<DemoAction>;
  reset: () => void;
} | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, dispatch] = useReducer(demoReducer, createDemoState());
  useEffect(() => {
    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
    dispatch({
      type: "RESET",
      state:
        readDemoState(sessionStorage.getItem(STORAGE_KEY)) ??
        createDemoState(new Date(), timezone),
    });
    const readyTimer = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(readyTimer);
  }, []);
  useEffect(() => {
    if (ready) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);
  const reset = () =>
    dispatch({
      type: "RESET",
      state: createDemoState(new Date(), state.timezone),
    });
  if (!ready)
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-50 text-sm text-zinc-500">
        Preparing your demo workspace…
      </div>
    );
  return (
    <DemoContext.Provider value={{ state, dispatch, reset }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemo must be used inside DemoProvider");
  return value;
}
