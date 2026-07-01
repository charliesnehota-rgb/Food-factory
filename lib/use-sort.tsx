import { useState, useMemo } from "react";

type Direction = "asc" | "desc";

export function useSort<T>(data: T[], defaultKey: keyof T, defaultDir: Direction = "asc") {
  const [key, setKey]  = useState<keyof T>(defaultKey);
  const [dir, setDir]  = useState<Direction>(defaultDir);

  function toggle(newKey: keyof T) {
    if (newKey === key) {
      setDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setKey(newKey);
      setDir("asc");
    }
  }

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[key]; const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "cs");
      return dir === "asc" ? cmp : -cmp;
    });
  }, [data, key, dir]);

  function SortIcon({ col }: { col: keyof T }) {
    if (col !== key) return <span className="opacity-20 ml-1 text-[10px]">⇅</span>;
    return <span className="opacity-70 ml-1 text-[10px]">{dir === "asc" ? "↑" : "↓"}</span>;
  }

  return { sorted, toggle, key, dir, SortIcon };
}
