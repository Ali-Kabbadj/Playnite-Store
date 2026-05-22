import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { List } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGameRepacks } from "@/hooks/useGames";

interface Props {
  gameId: number | null;
  gameName: string;
  checkedIds: Set<number>;
  setCheckedIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  onDeselectGame: () => void;
  onEditGame: (id: number) => void;
  onRemoveRepacks: (ids: number[]) => void;
  onMoveRepacks: (ids: number[]) => void;
  isBusy: boolean;
}

export function GameRepackList({
  gameId,
  gameName,
  checkedIds,
  setCheckedIds,
  onDeselectGame,
  onEditGame,
  onRemoveRepacks,
  onMoveRepacks,
  isBusy,
}: Props) {
  const { data: gameRepacks = [] } = useGameRepacks(gameId);
  const [sort, setSort] = useState({ by: "id", dir: "asc" as "asc" | "desc" });

  if (!gameId) return null;

  const sorted = [...gameRepacks].sort((a, b) => {
    const cmp =
      sort.by === "title" ? a.title.localeCompare(b.title) : a.id - b.id;
    return sort.dir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (col: string) =>
    setSort((p) => ({
      by: col,
      dir: p.by === col && p.dir === "asc" ? "desc" : "asc",
    }));
  const icon = (col: string) =>
    sort.by === col ? (sort.dir === "asc" ? " ▲" : " ▼") : "";

  const handleSelectAll = () => {
    if (sorted.length > 0 && sorted.every((r) => checkedIds.has(r.id)))
      setCheckedIds(new Set());
    else setCheckedIds(new Set(sorted.map((r) => r.id)));
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col border rounded-md mt-4 overflow-hidden bg-card">
      <div className="flex items-center justify-between p-2 border-b bg-muted/30 shrink-0">
        <span className="text-xs font-medium truncate" title={gameName}>
          {gameName}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => onEditGame(gameId)}
          >
            ✎ Edit Game
          </Button>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {gameRepacks.length}
          </Badge>
          <button
            onClick={onDeselectGame}
            className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:bg-accent ml-1"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 shadow-xs">
            <TableRow>
              <TableHead className="w-10">
                <div className="flex items-center gap-0.5">
                  <List className="h-3 w-3 text-muted-foreground" />
                  <Checkbox
                    checked={
                      (sorted.length > 0 &&
                      sorted.every((r) => checkedIds.has(r.id))
                        ? true
                        : sorted.some((r) => checkedIds.has(r.id))
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
                ID{icon("id")}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort("title")}
              >
                Title{icon("title")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gameRepacks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-4 text-muted-foreground text-[11px]"
                >
                  No repacks assigned
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((r) => (
                <TableRow
                  key={r.id}
                  className={checkedIds.has(r.id) ? "bg-destructive/10" : ""}
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
                    className="max-w-0 truncate text-xs"
                    title={r.title}
                  >
                    {r.title}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Fixed Action Bar */}
      <div className="h-10 border-t px-2 flex items-center bg-muted/30 shrink-0 gap-2">
        {checkedIds.size > 0 ? (
          <>
            <Button
              variant="destructive"
              size="sm"
              className="h-6 text-[10px] px-2"
              disabled={isBusy}
              onClick={() => onRemoveRepacks([...checkedIds])}
            >
              ⇜ Remove from Game
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              disabled={isBusy}
              onClick={() => onMoveRepacks([...checkedIds])}
            >
              Move to...
            </Button>
          </>
        ) : (
          <span className="text-[10px] text-muted-foreground italic">
            Check assigned repacks to modify
          </span>
        )}
      </div>
    </div>
  );
}
