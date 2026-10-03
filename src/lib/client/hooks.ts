"use client";

import { useCallback, useEffect, useState } from "react";
import { apiOrOffline, ApiClientError } from "@/lib/client/api";

export function useApiData<T>(
  path: string,
  cacheKey: string,
  deps: unknown[] = [],
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  offline: boolean;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiOrOffline<T>(path, cacheKey)
      .then((result) => {
        if (active) {
          setData(result);
          setOffline(typeof navigator !== "undefined" && !navigator.onLine);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof ApiClientError ? err.message : "تعذّر تحميل البيانات.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, cacheKey, tick, ...deps]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  return { data, loading, error, offline, reload };
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
