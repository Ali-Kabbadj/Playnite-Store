import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MediaCard } from "./MediaCard";
import { addGameMedia, updateGameMedia, removeGameMedia } from "@/api";
import type { GameMedia } from "@/types";

interface Props {
  gameId: number;
  mediaList: GameMedia[];
  setMediaList: React.Dispatch<React.SetStateAction<GameMedia[]>>;
}

export function GameEditMedia({ gameId, mediaList, setMediaList }: Props) {
  const [newMediaType, setNewMediaType] = useState("screenshot");
  const [newMediaUrl, setNewMediaUrl] = useState("");

  const handleAddMedia = async () => {
    if (!newMediaUrl.trim()) return;
    try {
      const result = await addGameMedia(
        gameId,
        newMediaType,
        newMediaUrl.trim(),
      );
      setMediaList((prev) => [...prev, result]);
      setNewMediaUrl("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditMedia = async (mid: number, url: string) => {
    try {
      await updateGameMedia(gameId, mid, url);
      setMediaList((prev) =>
        prev.map((m) => (m.id === mid ? { ...m, url } : m)),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMedia = async (mid: number) => {
    try {
      await removeGameMedia(gameId, mid);
      setMediaList((prev) => prev.filter((m) => m.id !== mid));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">
        Media
      </label>
      {mediaList.length === 0 && (
        <span className="text-xs text-muted-foreground italic">None</span>
      )}
      <div className="grid grid-cols-4 gap-2 mb-2">
        {mediaList.map((m) => (
          <MediaCard
            key={m.id}
            item={m}
            onRemove={handleRemoveMedia}
            onEdit={handleEditMedia}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <select
          title="Media Type"
          className="h-7 text-xs border rounded px-1.5 bg-background"
          value={newMediaType}
          onChange={(e) => setNewMediaType(e.target.value)}
        >
          {["screenshot", "logo", "video", "background", "other"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <Input
          className="h-7 text-xs flex-1 font-mono"
          placeholder="URL"
          value={newMediaUrl}
          onChange={(e) => setNewMediaUrl(e.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={handleAddMedia}
          disabled={!newMediaUrl.trim()}
        >
          +
        </Button>
      </div>
    </div>
  );
}
