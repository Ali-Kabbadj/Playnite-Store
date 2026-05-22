import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  updateGame,
  manageJunctions,
  fetchPlatforms,
  fetchGenresList,
  fetchSeries,
  fetchTagsList,
  updateExternalLinks,
} from "@/api";
import { GameEditExternalLinks } from "./GameEditExternalLinks";
import { apiClient } from "@/lib/api-client";
import {
  SYSTEM,
  JUNCTION,
  LIST,
  TEXTAREA,
  POSTER_COVER,
  NUMERIC,
  fmt,
  label,
} from "./utils";
import { JunctionSection } from "./JunctionSection";
import { GameEditMedia } from "./GameEditMedia";
import { GameEditHeader } from "./GameEditHeader";
import type { GameMedia } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { useGameDetail } from "@/hooks/useGames";

interface Props {
  editId: number | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function GameEditDialog({ editId, onOpenChange, onSaved }: Props) {
  const { data: gameData, isLoading } = useGameDetail(editId);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [platforms, setPlatforms] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [developers, setDevelopers] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [publishers, setPublishers] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [series, setSeries] = useState<{ id: number; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: number; name: string }[]>([]);
  const [externalLinks, setExternalLinks] = useState<Record<string, string>>(
    {},
  );
  const [mediaList, setMediaList] = useState<GameMedia[]>([]);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!gameData) return;
    const f: Record<string, string> = {};
    for (const [k, v] of Object.entries(gameData)) {
      if (!SYSTEM.has(k) && !JUNCTION.has(k) && !LIST.has(k)) f[k] = fmt(v);
    }

    const t = setTimeout(() => {
      setForm(f);
      setPlatforms(gameData.platforms ?? []);
      setGenres(gameData.genres ?? []);
      setDevelopers(gameData.developers ?? []);
      setPublishers(gameData.publishers ?? []);
      setSeries(gameData.series ?? []);
      setTags(gameData.tags ?? []);
      setExternalLinks(gameData.external_links ?? {});
      setMediaList(gameData.media ?? []);
      setMsg("");
    }, 0);

    return () => clearTimeout(t);
  }, [gameData]);

  useEffect(() => {
    if (!editId) {
      const t = setTimeout(() => setMsg(""), 0);
      return () => clearTimeout(t);
    }
  }, [editId]);

  const loadPageFn =
    (
      fetcher: (
        search: string | undefined,
        page: number,
        perPage: number,
      ) => Promise<{ rows: { id: number; name: string }[]; total: number }>,
    ) =>
    async (page: number, perPage: number, query: string) =>
      fetcher(query || undefined, page, perPage);

  const loadDevsPage = async (page: number, perPage: number, query: string) =>
    apiClient.get(
      `/companies?search=${encodeURIComponent(query || "")}&page=${page}&per_page=${perPage}&sort_by=name&sort_dir=asc`,
    ) as Promise<{ rows: { id: number; name: string }[]; total: number }>;

  const handleFieldChange = (k: string, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!gameData) return;
    setSaving(true);
    setMsg("");
    try {
      const updates: Record<string, unknown> = {};
      Object.entries(form)
        .filter(
          ([k]) =>
            !SYSTEM.has(k) &&
            !JUNCTION.has(k) &&
            !LIST.has(k) &&
            !POSTER_COVER.has(k),
        )
        .forEach(([k, v]) => {
          const orig = fmt(gameData[k]);
          if (v !== orig)
            updates[k] = NUMERIC.has(k) ? (v === "" ? null : Number(v)) : v;
        });

      if (form.cover_url !== fmt(gameData.cover_url))
        updates.cover_url = form.cover_url;

      if (Object.keys(updates).length > 0)
        await updateGame(gameData.id, updates);

      const linkDiff: Record<string, string> = {};
      for (const [k, v] of Object.entries(externalLinks))
        if (v) linkDiff[k] = v;
      for (const k of Object.keys(gameData?.external_links ?? {}))
        if (!linkDiff[k]) linkDiff[k] = "";

      if (Object.keys(linkDiff).length > 0)
        await updateExternalLinks(gameData.id, linkDiff);

      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });

      setMsg("Saved!");
      onSaved();
    } catch (e: unknown) {
      setMsg(`Error: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleJunction = async (
    relation: string,
    addId?: number,
    removeId?: number,
  ) => {
    if (!gameData) return;
    try {
      await manageJunctions(
        gameData.id,
        relation,
        addId ? [addId] : [],
        removeId ? [removeId] : [],
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog
      open={!!editId}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setMsg("");
      }}
    >
      <DialogContent
        className="sm:max-w-none max-w-[95vw] p-0 gap-0"
        style={{ width: "95vw", maxHeight: "85vh", overflow: "hidden" }}
      >
        <div className="flex flex-col relative" style={{ height: "85vh" }}>
          {isLoading || !gameData ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground animate-pulse">
              Loading game data...
            </div>
          ) : (
            <>
              <GameEditHeader
                name={gameData.name}
                id={gameData.id}
                cover={form.cover_url || gameData.cover_url || ""}
                poster={form.cover_url || gameData.cover_url || ""}
                onUpdateImage={handleFieldChange}
              />

              <ScrollArea className="flex-1 min-h-0">
                <div className="p-3 pt-7 space-y-4">
                  <div className="grid grid-cols-3 gap-x-5 gap-y-2">
                    {Object.entries(form)
                      .filter(
                        ([k]) =>
                          !SYSTEM.has(k) &&
                          !JUNCTION.has(k) &&
                          !LIST.has(k) &&
                          !POSTER_COVER.has(k),
                      )
                      .map(([k, v]) => (
                        <div key={k}>
                          <label className="text-xs text-muted-foreground block mb-0.5">
                            {label(k)}
                          </label>
                          {TEXTAREA.has(k) ? (
                            <textarea
                              title={label(k)}
                              className="flex h-10 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-xs"
                              value={v}
                              onChange={(e) =>
                                handleFieldChange(k, e.target.value)
                              }
                            />
                          ) : (
                            <Input
                              className="h-6 text-xs"
                              value={v}
                              onChange={(e) =>
                                handleFieldChange(k, e.target.value)
                              }
                            />
                          )}
                        </div>
                      ))}
                  </div>

                  <GameEditExternalLinks
                    externalLinks={externalLinks}
                    setExternalLinks={setExternalLinks}
                  />

                  <div className="grid grid-cols-4 gap-4">
                    <JunctionSection
                      label="Platforms"
                      placeholder="Search platforms..."
                      items={platforms}
                      loadPage={loadPageFn(fetchPlatforms)}
                      onAdd={(id, name) => {
                        setPlatforms((p) => [...p, { id, name }]);
                        handleJunction("platforms", id);
                      }}
                      onRemove={(id) => {
                        setPlatforms((p) => p.filter((x) => x.id !== id));
                        handleJunction("platforms", undefined, id);
                      }}
                    />
                    <JunctionSection
                      label="Genres"
                      placeholder="Search genres..."
                      items={genres}
                      loadPage={loadPageFn(fetchGenresList)}
                      onAdd={(id, name) => {
                        setGenres((g) => [...g, { id, name }]);
                        handleJunction("genres", id);
                      }}
                      onRemove={(id) => {
                        setGenres((g) => g.filter((x) => x.id !== id));
                        handleJunction("genres", undefined, id);
                      }}
                    />
                    <JunctionSection
                      label="Developers"
                      placeholder="Search developers..."
                      items={developers}
                      loadPage={loadDevsPage}
                      onAdd={(id, name) => {
                        setDevelopers((d) => [...d, { id, name }]);
                        handleJunction("developers", id);
                      }}
                      onRemove={(id) => {
                        setDevelopers((d) => d.filter((x) => x.id !== id));
                        handleJunction("developers", undefined, id);
                      }}
                    />
                    <JunctionSection
                      label="Publishers"
                      placeholder="Search publishers..."
                      items={publishers}
                      loadPage={loadDevsPage}
                      onAdd={(id, name) => {
                        setPublishers((p) => [...p, { id, name }]);
                        handleJunction("publishers", id);
                      }}
                      onRemove={(id) => {
                        setPublishers((p) => p.filter((x) => x.id !== id));
                        handleJunction("publishers", undefined, id);
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <JunctionSection
                      label="Collections"
                      placeholder="Search collections..."
                      items={series}
                      loadPage={loadPageFn(fetchSeries)}
                      onAdd={(id, name) => {
                        setSeries((s) => [...s, { id, name }]);
                        handleJunction("series", id);
                      }}
                      onRemove={(id) => {
                        setSeries((s) => s.filter((x) => x.id !== id));
                        handleJunction("series", undefined, id);
                      }}
                    />
                    <JunctionSection
                      label="Themes"
                      placeholder="Search themes..."
                      items={tags}
                      loadPage={loadPageFn(fetchTagsList)}
                      onAdd={(id, name) => {
                        setTags((t) => [...t, { id, name }]);
                        handleJunction("tags", id);
                      }}
                      onRemove={(id) => {
                        setTags((t) => t.filter((x) => x.id !== id));
                        handleJunction("tags", undefined, id);
                      }}
                    />
                  </div>

                  <GameEditMedia
                    gameId={gameData.id}
                    mediaList={mediaList}
                    setMediaList={setMediaList}
                  />
                </div>
              </ScrollArea>

              <div className="shrink-0 border-t px-4 py-2.5 flex items-center gap-2 bg-background">
                {msg && (
                  <span
                    className={`text-xs ${msg.startsWith("Error") ? "text-destructive" : "text-green-600"}`}
                  >
                    {msg}
                  </span>
                )}
                <div className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
