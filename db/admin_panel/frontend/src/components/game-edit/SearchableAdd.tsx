import { useState, useEffect, useRef, type UIEvent } from "react";
import { Input } from "@/components/ui/input";

interface PageResult {
  rows: { id: number; name: string }[];
  total: number;
}

interface Props {
  search: string;
  onSearch: (v: string) => void;
  onAdd: (id: number, name: string) => void;
  placeholder: string;
  loadPage: (
    page: number,
    perPage: number,
    query: string,
  ) => Promise<PageResult>;
  excludeIds?: Set<number>;
}

export function SearchableAdd({
  search,
  onSearch,
  onAdd,
  placeholder,
  loadPage,
  excludeIds,
}: Props) {
  const [items, setItems] = useState<{ id: number; name: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  const perPage = 10;
  const wasFocused = useRef(false);

  useEffect(() => {
    if (focused !== wasFocused.current && focused) setLoadKey((k) => k + 1);
    wasFocused.current = focused;
  }, [focused]);

  useEffect(() => {
    if (!focused) return;
    const t = setTimeout(() => setLoadKey((k) => k + 1), 150);
    return () => clearTimeout(t);
  }, [search, focused]);

  useEffect(() => {
    if (!focused) return;
    let ignore = false;

    setTimeout(() => {
      if (!ignore) setLoading(true);
    }, 0);

    loadPage(1, perPage, search)
      .then((res) => {
        if (!ignore) {
          setItems(res.rows);
          setTotal(res.total);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [loadKey, focused, search, loadPage]);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (loading || items.length >= total) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 20) {
      const nextPage = Math.ceil(items.length / perPage) + 1;
      setLoading(true);
      loadPage(nextPage, perPage, search)
        .then((res) => {
          setItems((prev) => {
            const existing = new Set(prev.map((i) => i.id));
            return [...prev, ...res.rows.filter((i) => !existing.has(i.id))];
          });
          setTotal(res.total);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  };

  const display = (
    search
      ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
      : items
  ).filter((i) => !excludeIds?.has(i.id));

  const show =
    (focused || search.length > 0) &&
    (display.length > 0 ||
      loading ||
      (search.length > 0 && items.length === 0 && !loading));

  return (
    <div className="relative">
      <Input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        placeholder={placeholder}
        className="h-7 text-xs"
      />
      {show && (
        <div
          className="absolute top-full left-0 right-0 z-20 bg-popover border rounded-md mt-0.5 shadow-md max-h-40 overflow-auto"
          onScroll={handleScroll}
        >
          {display.map((r) => (
            <div
              key={r.id}
              className="px-2.5 py-1 text-xs cursor-pointer hover:bg-accent truncate"
              onClick={() => {
                onAdd(r.id, r.name);
                onSearch("");
              }}
            >
              {r.name}
            </div>
          ))}
          {loading && (
            <div className="px-2.5 py-1 text-[10px] text-muted-foreground">
              Loading...
            </div>
          )}
          {!loading && display.length === 0 && search.length > 0 && (
            <div className="px-2.5 py-1 text-[10px] text-muted-foreground">
              No results
            </div>
          )}
          {!loading && items.length >= total && total > 0 && (
            <div className="px-2.5 py-1 text-[10px] text-muted-foreground">
              All {total} loaded
            </div>
          )}
        </div>
      )}
    </div>
  );
}
