import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Repack } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repacks: Repack[];
  onConfirm: (name: string) => void;
}

export function CreateGameDialog({ open, onOpenChange, repacks, onConfirm }: Props) {
  const [name, setName] = useState('');

  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) setName('') }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Game from Repacks</DialogTitle>
          <DialogDescription>
            A new game entry will be created and the selected repacks will be linked to it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">Game Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter game name..."
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">
              Repacks to link ({repacks.length})
            </label>
            <ScrollArea className="border rounded-md h-48">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-left px-2 py-1 font-medium w-16">ID</th>
                    <th className="text-left px-2 py-1 font-medium">Title</th>
                  </tr>
                </thead>
                <tbody>
                  {repacks.map(r => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-2 py-1 font-mono">{r.id}</td>
                      <td className="px-2 py-1 truncate max-w-sm" title={r.title}>{r.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { if (name.trim()) onConfirm(name.trim()) }} disabled={!name.trim()}>
            Create Game & Link {repacks.length} Repacks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
