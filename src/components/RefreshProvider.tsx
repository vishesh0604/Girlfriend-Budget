"use client";

import {
  createContext,
  useCallback,
  useContext,
  useTransition,
  type ReactNode,
} from "react";

type RefreshValue = {
  /** True while a shared refresh transition is in flight. */
  refreshing: boolean;
  /** Run work (usually router.refresh()) inside the shared transition. */
  runRefresh: (work: () => void) => void;
};

const RefreshContext =
  createContext<RefreshValue | null>(null);

/*
 * Mounted once in the root layout. Any client component can call
 * useRefresh().runRefresh(() => router.refresh()) after a mutation and
 * the thin top strip shows for the whole action + data refresh.
 */
export function RefreshProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [refreshing, startTransition] =
    useTransition();

  const runRefresh = useCallback(
    (work: () => void) => {
      startTransition(work);
    },
    []
  );

  return (
    <RefreshContext.Provider
      value={{ refreshing, runRefresh }}
    >
      <TopLoadingBar show={refreshing} />
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const value = useContext(RefreshContext);

  if (!value) {
    throw new Error(
      "useRefresh must be used within RefreshProvider"
    );
  }

  return value;
}

function TopLoadingBar({
  show,
}: {
  show: boolean;
}) {
  return (
    <div
      className={`fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden transition-opacity duration-200 ${
        show ? "opacity-100" : "opacity-0"
      }`}
      role="status"
      aria-hidden={!show}
    >
      <div className="h-full w-1/3 rounded-full bg-[#c4567d] [animation:loading-bar-slide_1.1s_ease-in-out_infinite]" />
    </div>
  );
}
