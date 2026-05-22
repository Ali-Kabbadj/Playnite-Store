import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchLinkSourceNames } from "@/api";

interface Props {
  externalLinks: Record<string, string>;
  setExternalLinks: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
}

export function GameEditExternalLinks({
  externalLinks,
  setExternalLinks,
}: Props) {
  const [newSourceName, setNewSourceName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [allSourceNames, setAllSourceNames] = useState<string[]>([]);
  const [sourceNameResults, setSourceNameResults] = useState<string[]>([]);

  useEffect(() => {
    fetchLinkSourceNames()
      .then(setAllSourceNames)
      .catch(() => {});
  }, []);

  const handleAddLink = () => {
    const name = newSourceName.trim();
    if (!name || !newUrl.trim()) return;
    setExternalLinks((s) => ({ ...s, [name]: newUrl.trim() }));
    setNewSourceName("");
    setNewUrl("");
  };

  const handleRemoveLink = (key: string) => {
    setExternalLinks((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">
        External Links
      </label>
      <div className="space-y-1">
        {Object.keys(externalLinks).length === 0 && (
          <span className="text-xs text-muted-foreground italic">None</span>
        )}
        {Object.entries(externalLinks).map(([sourceName, url]) => (
          <div key={sourceName} className="flex items-center gap-2">
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded min-w-20 text-right">
              {sourceName}
            </span>
            <Input
              className="h-6 text-xs font-mono flex-1"
              value={url ?? ""}
              onChange={(e) =>
                setExternalLinks((s) => ({
                  ...s,
                  [sourceName]: e.target.value,
                }))
              }
            />
            <button
              onClick={() => handleRemoveLink(sourceName)}
              className="text-xs text-muted-foreground hover:text-destructive shrink-0"
            >
              ×
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <div className="relative w-32">
            <Input
              className="h-7 text-xs"
              placeholder="Source (e.g. Steam)"
              value={newSourceName}
              onChange={(e) => {
                setNewSourceName(e.target.value);
                if (!e.target.value.trim()) setSourceNameResults([]);
              }}
              onFocus={() => {
                setSourceNameResults(
                  newSourceName.trim()
                    ? allSourceNames.filter((n) =>
                        n.toLowerCase().includes(newSourceName.toLowerCase()),
                      )
                    : allSourceNames,
                );
              }}
              onBlur={() => setTimeout(() => setSourceNameResults([]), 200)}
            />
            {sourceNameResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 bg-popover border rounded-md mt-0.5 shadow-md max-h-36 overflow-auto">
                {sourceNameResults.map((n) => (
                  <div
                    key={n}
                    className="px-2 py-1 text-xs cursor-pointer hover:bg-accent truncate"
                    onClick={() => {
                      setNewSourceName(n);
                      setSourceNameResults([]);
                    }}
                  >
                    {n}
                  </div>
                ))}
              </div>
            )}
          </div>
          <Input
            className="h-7 text-xs font-mono flex-1"
            placeholder="URL"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleAddLink}
            disabled={!newSourceName.trim() || !newUrl.trim()}
          >
            + Add
          </Button>
        </div>
      </div>
    </div>
  );
}
