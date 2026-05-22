import { useState, type UIEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { List, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DetailDialog } from "./DetailDialog";
import { apiClient } from "@/lib/api-client";
import { useRepacksList } from "@/hooks/useRepacks";
import type { RepackDetail } from "@/types";

interface Props {
  selectedGameId: number | null;
  isBusy: boolean;
  onAssign: (ids: number[], clear: () => void) => void;
  onCreateOpen: (ids: number[]) => void;
}

export function RepacksPanel({
  selectedGameId,
  isBusy,
  onAssign,
  onCreateOpen,
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("orphan");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("asc");

  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

  const perPage = 50;
  const { data, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useRepacksList(search, status, perPage, sortBy, sortDir);

  const repacks = data?.pages.flatMap((p) => p.rows) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const isInitialLoad = isFetching && !isFetchingNextPage;

  const [detailData, setDetailData] = useState<RepackDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop <= clientHeight * 1.5 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  };

  const executeSearch = () => {
    setSearch(inputValue);
    setCheckedIds(new Set());
  };

  const handleSelectAll = () => {
    if (repacks.every((r) => checkedIds.has(r.id))) setCheckedIds(new Set());
    else setCheckedIds(new Set(repacks.map((r) => r.id)));
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  };
  const sortIcon = (col: string) =>
    sortBy === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="flex flex-col h-full min-h-0 border rounded-md overflow-hidden bg-card">
      <div className="p-2 border-b shrink-0 space-y-2 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex items-center flex-1 gap-1">
            <Input
              placeholder="Search repacks..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && executeSearch()}
              className="h-8 text-sm"
            />
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 shrink-0"
              onClick={executeSearch}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-1 items-center">
          {["all", "matched", "orphan"].map((f) => (
            <Button
              key={f}
              variant={status === f ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => {
                setStatus(f);
                setCheckedIds(new Set());
              }}
            >
              {f}
            </Button>
          ))}
          <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
            {total.toLocaleString()} results
          </span>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto min-h-0 relative"
        onScroll={handleScroll}
      >
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 shadow-xs">
            <TableRow>
              <TableHead className="w-10">
                <div className="flex items-center gap-0.5">
                  <List className="h-3 w-3 text-muted-foreground" />
                  <Checkbox
                    checked={
                      (repacks.length > 0 &&
                      repacks.every((r) => checkedIds.has(r.id))
                        ? true
                        : repacks.some((r) => checkedIds.has(r.id))
                          ? "indeterminate"
                          : false) as boolean | undefined
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </div>
              </TableHead>
              <TableHead
                className="w-14 cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("id")}
              >
                ID{sortIcon("id")}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("title")}
              >
                Title{sortIcon("title")}
              </TableHead>
              <TableHead
                className="w-18 cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("status")}
              >
                Status{sortIcon("status")}
              </TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isInitialLoad ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 align-top p-0 border-0">
                  <div className="h-0.5 w-full bg-foreground animate-indeterminate" />
                </TableCell>
              </TableRow>
            ) : repacks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground text-sm"
                >
                  No repacks found
                </TableCell>
              </TableRow>
            ) : (
              repacks.map((r) => (
                <TableRow
                  key={r.id}
                  className={checkedIds.has(r.id) ? "bg-primary/10" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={checkedIds.has(r.id)}
                      onCheckedChange={() =>
                        setCheckedIds((p) => {
                          const n = new Set(p);
                          if (n.has(r.id)) n.delete(r.id);
                          else n.add(r.id);
                          return n;
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="font-mono text-[11px]">
                    {r.id}
                  </TableCell>
                  <TableCell
                    className="max-w-0 truncate text-sm"
                    title={r.title}
                  >
                    {r.title}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={r.status === "matched" ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={async () => {
                        const d = (await apiClient.get(
                          `/repacks/${r.id}`,
                        )) as RepackDetail;
                        setDetailData(d);
                        setDetailOpen(true);
                      }}
                      className="text-muted-foreground hover:text-foreground text-[11px] px-1 py-0.5 rounded hover:bg-accent"
                    >
                      ⓘ
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
            {isFetchingNextPage && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-4 text-xs text-muted-foreground"
                >
                  Loading more...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Fixed UI Action Bar (Never Shifts) */}
      <div className="h-12 border-t px-3 flex items-center bg-muted/30 shrink-0 gap-3">
        {checkedIds.size > 0 ? (
          <>
            <span className="text-xs font-medium">
              {checkedIds.size} selected
            </span>
            {selectedGameId ? (
              <Button
                onClick={() =>
                  onAssign([...checkedIds], () => setCheckedIds(new Set()))
                }
                disabled={isBusy}
                size="sm"
              >
                Assign to Game ⇝
              </Button>
            ) : (
              <Button
                onClick={() => onCreateOpen([...checkedIds])}
                disabled={isBusy}
                variant="secondary"
                size="sm"
              >
                Create New Game from Checked
              </Button>
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            Check repacks to perform bulk actions
          </span>
        )}
      </div>

      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={`Repack #${detailData?.id || ""}`}
        data={detailData as unknown as Record<string, unknown>}
        type="repack"
      />
    </div>
  );
}
