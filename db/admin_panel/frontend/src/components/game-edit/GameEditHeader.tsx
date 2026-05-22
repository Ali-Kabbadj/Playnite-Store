import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  name: string;
  id: number;
  cover: string;
  poster: string;
  onUpdateImage: (field: "cover" | "poster_url", url: string) => void;
}

export function GameEditHeader({
  name,
  id,
  cover,
  poster,
  onUpdateImage,
}: Props) {
  const [editTarget, setEditTarget] = useState<"poster" | "cover" | null>(null);
  const [editUrl, setEditUrl] = useState("");

  return (
    <div className="relative h-44 shrink-0 bg-linear-to-b from-muted to-background group">
      {cover ? (
        <>
          <img
            src={cover?.replace("t_thumb", "t_1080p")}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />

          <button
            onClick={() => {
              setEditTarget("cover");
              setEditUrl(cover);
            }}
            className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 text-white text-[10px] font-medium transition-opacity"
          >
            Edit
          </button>
        </>
      ) : (
        <button
          onClick={() => {
            setEditTarget("cover");
            setEditUrl("");
          }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 text-white/60 text-[10px] hover:bg-black/30 transition-colors"
        >
          + Cover
        </button>
      )}
      <div className="absolute inset-0 bg-linear-to-t from-background via-background/30 to-transparent" />
      {poster ? (
        <div className="absolute -bottom-6 left-6 w-20 h-28 z-10 group">
          <img
            src={poster?.replace("t_thumb", "t_1080p")}
            alt=""
            className="w-full h-full object-cover rounded-lg shadow-xl border-[3px] border-background"
          />

          <button
            onClick={() => {
              setEditTarget("poster");
              setEditUrl(poster);
            }}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 text-white text-[10px] font-medium rounded-lg transition-opacity"
          >
            Edit
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setEditTarget("poster");
            setEditUrl("");
          }}
          className="absolute -bottom-6 left-6 z-10 w-20 h-28 flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground text-[10px] hover:bg-muted/50 transition-colors"
        >
          + Poster
        </button>
      )}
      <div
        className={`absolute bottom-4 left-32 text-lg font-bold drop-shadow-lg`}
      >
        {name}
        <span className="text-xs font-normal text-muted-foreground ml-2">
          #{id}
        </span>
      </div>

      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditTarget(null);
          }}
        >
          <div
            className="bg-background rounded-lg p-4 w-96 space-y-3 shadow-xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xs font-medium capitalize">
              Edit {editTarget}
            </h3>
            <Input
              className="h-7 text-xs font-mono"
              placeholder="Image URL"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditTarget(null)}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onUpdateImage(
                    editTarget === "poster" ? "poster_url" : "cover",
                    editUrl,
                  );
                  setEditTarget(null);
                }}
                className="h-7 text-xs"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
