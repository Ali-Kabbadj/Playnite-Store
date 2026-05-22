import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { GameMedia } from "@/types";

interface Props {
  item: GameMedia;
  onRemove: (id: number) => void;
  onEdit: (id: number, url: string) => void;
}

export function MediaCard({ item, onRemove, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(item.url);
  const isImage = [
    "screenshot",
    "cover",
    "poster",
    "logo",
    "background",
  ].includes(item.type);

  return (
    <div className="relative group border rounded-md overflow-hidden bg-muted">
      {isImage ? (
        <img
          src={item.url}
          alt=""
          className="w-full h-20 object-cover"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ) : (
        <div className="h-20 flex items-center justify-center text-[10px] text-muted-foreground px-1 text-center break-all">
          {item.type}: {item.url}
        </div>
      )}
      <div className="flex flex-col gap-1 px-1.5 py-1 bg-background/80">
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[9px] px-1 py-0">
            {item.type}
          </Badge>
          <button
            onClick={() => onRemove(item.id)}
            className="text-[10px] text-muted-foreground hover:text-destructive ml-auto"
          >
            ×
          </button>
        </div>
        {editing ? (
          <div className="flex gap-1 items-center">
            <Input
              className="h-5 text-[10px] font-mono flex-1 min-w-0"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
            />
            <button
              onClick={() => {
                onEdit(item.id, editUrl);
                setEditing(false);
              }}
              className="text-[10px] text-green-600 hover:text-green-700 shrink-0"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditUrl(item.url);
                setEditing(false);
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground shrink-0"
            >
              ↩
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span
              className="text-[9px] font-mono text-muted-foreground truncate flex-1"
              title={item.url}
            >
              {item.url}
            </span>
            <button
              onClick={() => {
                setEditUrl(item.url);
                setEditing(true);
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground shrink-0"
            >
              ✎
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
