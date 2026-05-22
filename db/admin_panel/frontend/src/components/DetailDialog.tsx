import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: Record<string, unknown> | null;
  type: "repack" | "game";
  onDelete?: () => void;
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

const HIDE_KEYS = new Set(["description_html", "cover"]);

export function DetailDialog({
  open,
  onOpenChange,
  title,
  data,
  type,
  onDelete,
}: Props) {
  const [raw, setRaw] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!data) return null;

  const entries = Object.entries(data).filter(([k]) => !HIDE_KEYS.has(k));

  const handleDelete = () => {
    if (!confirmDelete) return setConfirmDelete(true);
    onDelete?.();
    setConfirmDelete(false);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setRaw(false);
          setConfirmDelete(false);
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="truncate pr-4">{title}</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              className="text-xs shrink-0"
              onClick={() => setRaw((r) => !r)}
            >
              {raw ? "Formatted" : "Raw"}
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="overflow-auto" style={{ maxHeight: "55vh" }}>
          {raw ? (
            <pre className="text-xs font-mono p-3 bg-muted rounded whitespace-pre-wrap break-all">
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : (
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm p-1">
              {entries.map(([key, val]) => {
                const label = key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase());
                const display =
                  key === "description" &&
                  typeof val === "string" &&
                  val.length > 200
                    ? val.slice(0, 200) + "…"
                    : fmt(val);
                return (
                  <div key={key} className="contents">
                    <span className="text-muted-foreground text-xs pt-0.5 whitespace-nowrap">
                      {label}
                    </span>
                    <span className="wrap-break-word min-w-0">{display}</span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {type === "game" && onDelete && (
          <DialogFooter className="border-t pt-3 mt-2">
            {confirmDelete ? (
              <div className="flex items-center gap-2 w-full justify-end">
                <span className="text-xs text-destructive font-medium">
                  Delete this game? Repacks will become orphans.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  Confirm Delete
                </Button>
              </div>
            ) : (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Delete Game
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
