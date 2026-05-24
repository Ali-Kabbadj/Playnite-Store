import { useState } from "react";
import { GameEditDialog } from "./game-edit/GameEditDialog";
import { GamesTable } from "./games/GamesTable";
import { GameRepackList } from "./games/GameRepackList";
import { DeleteGameDialog } from "./games/DeleteGameDialog";
import { MoveRepacksDialog } from "./games/MoveRepacksDialog";
import { apiClient } from "@/lib/api-client";
import { useGameMutations } from "@/hooks/useGames";
import type { Repack } from "@/types";

interface Props {
  selectedGameId: number | null;
  selectedGameName: string;
  onSelectGame: (id: number, name: string) => void;
  onDeselectGame: () => void;
  onShowStatus: (msg: string, ok?: boolean) => void;
}

export function GamesPanel({
  selectedGameId,
  selectedGameName,
  onSelectGame,
  onDeselectGame,
  onShowStatus,
}: Props) {
  const { deleteGame, unassignRepacks } = useGameMutations();

  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
    repackCount: number;
  } | null>(null);

  const [checkedRepackIds, setCheckedRepackIds] = useState<Set<number>>(
    new Set(),
  );
  const [moveRepackIds, setMoveRepackIds] = useState<number[]>([]);

  const handleDeletePrompt = async (id: number, name: string) => {
    try {
      const repacks = (await apiClient.get(`/games/${id}/repacks`)) as Repack[];
      setDeleteTarget({ id, name, repackCount: repacks.length });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveRepacks = (ids: number[]) => {
    unassignRepacks.mutate(ids, {
      onSuccess: (res) => {
        setCheckedRepackIds(new Set());
        onShowStatus(`Removed ${res.count} repacks from game`);
      },
      onError: (e) => onShowStatus(`Error: ${e.message}`, false),
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <GamesTable
        selectedGameId={selectedGameId}
        onSelectGame={(id, name) => {
          onSelectGame(id, name);
          setCheckedRepackIds(new Set());
        }}
        onEditGame={(id) => setEditId(id)}
        onDeleteGame={handleDeletePrompt}
      />

      <GameRepackList
        gameId={selectedGameId}
        gameName={selectedGameName}
        checkedIds={checkedRepackIds}
        setCheckedIds={setCheckedRepackIds}
        onDeselectGame={() => {
          onDeselectGame();
          setCheckedRepackIds(new Set());
        }}
        onEditGame={(id) => setEditId(id)}
        onRemoveRepacks={handleRemoveRepacks}
        onMoveRepacks={(ids) => setMoveRepackIds(ids)}
        isBusy={unassignRepacks.isPending}
      />

      <GameEditDialog
        editId={editId}
        onOpenChange={(o) => {
          if (!o) setEditId(null);
        }}
        onSaved={() => setEditId(null)}
      />
      <DeleteGameDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        target={deleteTarget}
        onConfirm={() =>
          deleteGame.mutate(deleteTarget!.id, {
            onSuccess: () => {
              if (selectedGameId === deleteTarget!.id) onDeselectGame();
              setDeleteTarget(null);
            },
          })
        }
        deleting={deleteGame.isPending}
      />
      <MoveRepacksDialog
        open={moveRepackIds.length > 0}
        onOpenChange={(o) => {
          if (!o) setMoveRepackIds([]);
        }}
        repackIds={moveRepackIds}
        onMoved={() => {
          setMoveRepackIds([]);
          setCheckedRepackIds(new Set());
        }}
      />
    </div>
  );
}
