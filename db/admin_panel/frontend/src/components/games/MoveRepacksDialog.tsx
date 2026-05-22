import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGamesList } from "@/hooks/useGames";
import { apiClient } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repackIds: number[];
  onMoved: () => void;
}

export function MoveRepacksDialog({
  open,
  onOpenChange,
  repackIds,
  onMoved,
}: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [msg, setMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const { data } = useGamesList(debouncedSearch, "all", 20, "name", "asc");
  const games = debouncedSearch
    ? (data?.pages.flatMap((p) => p.rows) ?? [])
    : [];
  const handleMove = async () => {
    if (!selectedId) return;
    setMoving(true);
    setMsg("");
    try {
      await apiClient.post("/junction/move", {
        repack_ids: repackIds,
        target_game_id: selectedId,
      });
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setMsg("Moved!");
      setTimeout(() => {
        onOpenChange(false);
        onMoved();
      }, 400);
    } catch (e: unknown) {
      setMsg(`Error: ${(e as Error).message}`);
    } finally {
      setMoving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onOpenChange(false);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Move {repackIds.length} Repack{repackIds.length !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            aria-label="Search game"
            ref={inputRef}
            placeholder="Search target game..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
          <ScrollArea className="border rounded-md max-h-60">
            {games.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6">
                {search ? "No matching games" : "Type to search games"}
              </div>
            ) : (
              <div className="divide-y">
                {games.map((g) => (
                  <div
                    key={g.id}
                    className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm hover:bg-accent ${selectedId === g.id ? "bg-primary/10 font-medium" : ""}`}
                    onClick={() => setSelectedId(g.id)}
                  >
                    <span className="font-mono text-[11px] text-muted-foreground">
                      #{g.id}
                    </span>
                    <span className="truncate">{g.name}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                      {g.repack_count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          {msg && (
            <span
              className={`text-xs ${msg.startsWith("Error") ? "text-destructive" : "text-green-600"}`}
            >
              {msg}
            </span>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleMove}
            disabled={!selectedId || moving}
          >
            {moving ? "Moving..." : `Move to Game #${selectedId ?? ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
