import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: { id: number; name: string; repackCount: number } | null;
  onConfirm: () => void;
  deleting: boolean;
}

export function DeleteGameDialog({ open, onOpenChange, target, onConfirm, deleting }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Game?</DialogTitle>
          <DialogDescription>
            This game has <strong>{target?.repackCount ?? 0} repacks</strong> linked.
            They will become orphans in the repacks pool.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm py-2">
          <span className="font-medium">{target?.name}</span>
          <span className="text-muted-foreground"> (ID #{target?.id})</span>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
