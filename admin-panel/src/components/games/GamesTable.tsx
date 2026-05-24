import { useState, type UIEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { useGamesList, usePrefetchGame } from "@/hooks/useGames";

interface Props {
  selectedGameId: number | null;
  onSelectGame: (id: number, name: string) => void;
  onEditGame: (id: number) => void;
  onDeleteGame: (id: number, name: string) => void;
}

export function GamesTable({
  selectedGameId,
  onSelectGame,
  onEditGame,
  onDeleteGame,
}: Props) {
  const prefetchGame = usePrefetchGame();
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("desc");

  const [view, setView] = useState(
    () => localStorage.getItem("gamesView") || "table",
  );
  const [gridCols, setGridCols] = useState(() =>
    parseInt(localStorage.getItem("gamesGridCols") || "6"),
  );

  const perPage = 30;
  const { data, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useGamesList(search, status, perPage, sortBy, sortDir);

  const games = data?.pages.flatMap((p) => p.rows) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const isInitialLoad = isFetching && !isFetchingNextPage;

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop <= clientHeight * 1.5 &&
      hasNextPage &&
      !isFetchingNextPage
    )
      fetchNextPage();
  };

  const executeSearch = () => setSearch(inputValue);

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  };
  const sortIcon = (col: string) =>
    sortBy === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div
      className={`flex flex-col border rounded-md overflow-hidden bg-card ${selectedGameId ? "h-[55%]" : "flex-1 min-h-0"}`}
    >
      <div className="p-2 border-b shrink-0 space-y-2 bg-muted/30">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search games..."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (e.target.value === "") {
                setSearch("");
              }
            }}
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
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[
              { key: "all", label: "All" },
              { key: "no_repacks", label: "No Repacks" },
              { key: "no_metadata", label: "No Metadata" },
            ].map((f) => (
              <Button
                key={f.key}
                variant={status === f.key ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setStatus(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground tabular-nums mr-2">
              {total.toLocaleString()} games
            </span>
            <div className="flex border rounded-md overflow-hidden">
              <button
                className={`text-[10px] px-2 py-1 ${view === "table" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                onClick={() => {
                  setView("table");
                  localStorage.setItem("gamesView", "table");
                }}
              >
                Table
              </button>
              <button
                className={`text-[10px] px-2 py-1 ${view === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                onClick={() => {
                  setView("grid");
                  localStorage.setItem("gamesView", "grid");
                }}
              >
                Grid
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto min-h-0 relative"
        onScroll={handleScroll}
      >
        {view === "table" ? (
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-xs">
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead
                  className="w-14 cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("id")}
                >
                  ID{sortIcon("id")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("name")}
                >
                  Name{sortIcon("name")}
                </TableHead>
                <TableHead
                  className="w-16 text-right cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("repack_count")}
                >
                  Repacks{sortIcon("repack_count")}
                </TableHead>
                <TableHead className="w-24 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isInitialLoad ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-48 align-top p-0 border-0"
                  >
                    <div className="h-0.5 w-full bg-foreground animate-indeterminate" />
                  </TableCell>
                </TableRow>
              ) : games.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground text-sm"
                  >
                    No games found
                  </TableCell>
                </TableRow>
              ) : (
                games.map((g) => (
                  <TableRow
                    key={g.id}
                    className={`${selectedGameId === g.id ? "bg-primary/10" : ""}`}
                  >
                    <TableCell className="w-10 py-1">
                      {g.poster_url ? (
                        <img
                          src={g.poster_url}
                          alt="poster"
                          className="w-8 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-8 h-10 bg-muted rounded flex items-center justify-center text-[8px] text-muted-foreground">
                          No
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">
                      {g.id}
                    </TableCell>
                    <TableCell
                      className="max-w-0 truncate text-sm font-medium"
                      title={g.name}
                    >
                      {g.name}
                    </TableCell>
                    <TableCell className="text-right font-mono text-[11px] tabular-nums">
                      {g.repack_count}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* 
                         Only prefetch when hovering this specific div containing the buttons,
                         and only select the game when clicking the "View Repacks" button
                      */}
                      <div
                        className="flex items-center justify-end gap-1"
                        onMouseEnter={() => prefetchGame(g.id)}
                      >
                        <button
                          title="View Linked Repacks"
                          onClick={() => onSelectGame(g.id, g.name)}
                          className={`text-[11px] px-2 py-0.5 rounded transition-colors ${selectedGameId === g.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-primary/20"}`}
                        >
                          👁
                        </button>
                        <button
                          title="Edit Game"
                          onClick={() => onEditGame(g.id)}
                          className="text-muted-foreground hover:text-foreground text-[11px] px-2 py-0.5 rounded hover:bg-accent bg-muted/50"
                        >
                          ✎
                        </button>
                        <button
                          title="Delete Game"
                          onClick={() => onDeleteGame(g.id, g.name)}
                          className="text-muted-foreground hover:text-destructive text-[11px] px-2 py-0.5 rounded hover:bg-destructive/10 bg-muted/50"
                        >
                          🗑
                        </button>
                      </div>
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
        ) : (
          <div className="p-2 relative min-h-full">
            {isInitialLoad ? (
              <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden z-10">
                <div className="h-full bg-foreground animate-indeterminate" />
              </div>
            ) : games.length === 0 ? (
              <div className="flex items-center justify-center text-sm text-muted-foreground mt-8">
                No games found
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1 justify-end pb-2">
                  <button
                    className="px-1.5 py-0.5 border rounded text-xs hover:bg-accent disabled:opacity-30"
                    disabled={gridCols <= 2}
                    onClick={() => setGridCols((c) => c - 1)}
                  >
                    −
                  </button>
                  <span className="tabular-nums text-xs min-w-8 text-center">
                    {gridCols} cols
                  </span>
                  <button
                    className="px-1.5 py-0.5 border rounded text-xs hover:bg-accent disabled:opacity-30"
                    disabled={gridCols >= 12}
                    onClick={() => setGridCols((c) => c + 1)}
                  >
                    +
                  </button>
                </div>
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
                >
                  {games.map((g) => (
                    <div
                      key={g.id}
                      className={`relative group rounded-lg border overflow-hidden bg-card hover:shadow-md ${selectedGameId === g.id ? "ring-2 ring-primary" : ""}`}
                    >
                      <div className="aspect-3/4 bg-muted flex items-center justify-center overflow-hidden">
                        {g.poster_url ? (
                          <img
                            src={g.poster_url?.replace("t_thumb", "t_1080p")}
                            alt="poster"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-[10px] text-muted-foreground">
                            No poster
                          </div>
                        )}
                      </div>
                      <div className="p-1.5">
                        <div className="text-[10px] font-medium truncate">
                          {g.name}
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          #{g.id} · {g.repack_count} repacks
                        </div>
                      </div>

                      {/* Same Logic for Grid Mode Hover & Click targets */}
                      <div
                        className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onMouseEnter={() => prefetchGame(g.id)}
                      >
                        <button
                          title="View Repacks"
                          onClick={() => onSelectGame(g.id, g.name)}
                          className={`h-6 w-6 flex items-center justify-center rounded shadow-sm text-[11px] ${selectedGameId === g.id ? "bg-primary text-primary-foreground" : "bg-background/90 hover:bg-background"}`}
                        >
                          👁
                        </button>
                        <button
                          title="Edit"
                          onClick={() => onEditGame(g.id)}
                          className="h-6 w-6 flex items-center justify-center rounded bg-background/90 hover:bg-background text-[11px] shadow-sm"
                        >
                          ✎
                        </button>
                        <button
                          title="Delete"
                          onClick={() => onDeleteGame(g.id, g.name)}
                          className="h-6 w-6 flex items-center justify-center rounded bg-background/90 hover:bg-background text-[11px] shadow-sm text-destructive"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {isFetchingNextPage && (
              <div className="text-center py-4 text-xs text-muted-foreground">
                Loading more...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
