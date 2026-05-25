import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RepacksPanel } from "@/components/RepacksPanel";
import { GamesPanel } from "@/components/GamesPanel";
import { ManagementPage } from "@/components/ManagementPage";
import { CreateGameDialog } from "@/components/CreateGameDialog";
import { useStats } from "@/hooks/useStats";
import { useGameMutations } from "@/hooks/useGames";
import { apiClient } from "@/lib/api-client";
import { Sun, Moon } from "lucide-react";
import type { Repack } from "@/types";
import { useTheme } from "./hooks/useTheme";
import { Login } from "@/components/Login";
import { OperationsPanel } from "@/components/OperationsPanel";

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("admin_token"),
  );
  const [view, setView] = useState<"explorer" | "management" | "operations">(
    "explorer",
  );
  const { data: stats } = useStats();
  const { assignRepacks, createGame } = useGameMutations();

  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedGameName, setSelectedGameName] = useState("");

  const [statusMsg, setStatusMsg] = useState("");
  const [statusOk, setStatusOk] = useState(true);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createCandidateRepacks, setCreateCandidateRepacks] = useState<
    Repack[]
  >([]);
  const [pendingCreateIds, setPendingCreateIds] = useState<number[]>([]);

  useEffect(() => {
    const handleLogout = () => setToken(null);
    window.addEventListener("auth_unauthorized", handleLogout);
    return () => window.removeEventListener("auth_unauthorized", handleLogout);
  }, []);

  const showStatus = useCallback((msg: string, ok = true) => {
    setStatusMsg(msg);
    setStatusOk(ok);
    setTimeout(() => setStatusMsg(""), 5000);
  }, []);

  const handleAssign = (ids: number[], onSuccessClear: () => void) => {
    if (!selectedGameId) return showStatus("No game selected!", false);
    assignRepacks.mutate(
      { repackIds: ids, gameId: selectedGameId },
      {
        onSuccess: (res) => {
          onSuccessClear();
          showStatus(
            `Assigned ${res.count}/${ids.length} repacks to "${selectedGameName}"`,
          );
        },
        onError: (e) => showStatus(`Error: ${e.message}`, false),
      },
    );
  };

  const handleCreateOpen = async (ids: number[]) => {
    try {
      const candidates = (await apiClient.post("/repacks/by-ids", {
        ids,
      })) as Repack[];
      setCreateCandidateRepacks(candidates);
      setPendingCreateIds(ids);
      setShowCreateDialog(true);
    } catch (e: unknown) {
      showStatus(`Error: ${(e as Error).message}`, false);
    }
  };

  const handleCreateConfirm = (name: string, onSuccessClear: () => void) => {
    setShowCreateDialog(false);
    createGame.mutate(
      { name, repackIds: pendingCreateIds },
      {
        onSuccess: (res) => {
          onSuccessClear();
          showStatus(
            `Created "${res.name}" and linked ${res.linked_repacks} repacks`,
          );
        },
        onError: (e) => showStatus(`Error: ${e.message}`, false),
      },
    );
  };

  if (!token) {
    return <Login onLogin={setToken} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <header className="border-b px-4 py-2 shrink-0 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">DB Explorer</h1>
          <button
            onClick={toggleTheme}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs ml-2 text-muted-foreground hover:text-destructive"
            onClick={() => {
              localStorage.removeItem("admin_token");
              setToken(null);
            }}
          >
            Logout
          </Button>
          <div className="flex gap-0.5 border rounded-md p-0.5 bg-muted/50 ml-2">
            <Button
              variant={view === "explorer" ? "default" : "ghost"}
              size="sm"
              className="h-6 text-xs px-2.5"
              onClick={() => setView("explorer")}
            >
              Explorer
            </Button>
            <Button
              variant={view === "management" ? "default" : "ghost"}
              size="sm"
              className="h-6 text-xs px-2.5"
              onClick={() => setView("management")}
            >
              Management
            </Button>
            {/* ADD THIS BUTTON */}
            <Button
              variant={view === "operations" ? "default" : "ghost"}
              size="sm"
              className="h-6 text-xs px-2.5"
              onClick={() => setView("operations")}
            >
              Operations
            </Button>
          </div>
        </div>
        {view === "explorer" && stats && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{stats.total_repacks.toLocaleString()} total repacks</span>
            <span className="text-green-600 dark:text-green-400">
              {stats.matched_repacks.toLocaleString()} matched repacks
            </span>
            <span className="text-amber-600 dark:text-amber-400">
              {stats.orphan_repacks.toLocaleString()} orphan repacks
            </span>
            <span>{stats.total_games.toLocaleString()} games (GameDB)</span>
          </div>
        )}
      </header>

      {view === "explorer" ? (
        <div className="flex-1 flex min-h-0 px-4 py-2 gap-4 overflow-hidden">
          <div className="w-[55%] flex flex-col min-h-0 min-w-0">
            <h2 className="text-sm font-semibold mb-1 shrink-0">Repacks</h2>
            <RepacksPanel
              selectedGameId={selectedGameId}
              isBusy={assignRepacks.isPending || createGame.isPending}
              onAssign={handleAssign}
              onCreateOpen={handleCreateOpen}
            />
          </div>

          <Separator orientation="vertical" className="shrink-0" />

          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <h2 className="text-sm font-semibold mb-1 shrink-0">Games</h2>
            <GamesPanel
              selectedGameId={selectedGameId}
              selectedGameName={selectedGameName}
              onSelectGame={(id, name) => {
                setSelectedGameId(id);
                setSelectedGameName(name);
              }}
              onDeselectGame={() => {
                setSelectedGameId(null);
                setSelectedGameName("");
              }}
              onShowStatus={showStatus}
            />
          </div>
        </div>
      ) : view === "management" ? (
        <div className="flex-1 flex min-h-0 px-4 py-2 overflow-hidden">
          <ManagementPage />
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 px-4 py-2 overflow-hidden">
          <OperationsPanel />
        </div>
      )}

      {statusMsg && (
        <div
          className={`px-4 py-1 text-xs text-center shrink-0 ${statusOk ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {statusMsg}
        </div>
      )}

      <CreateGameDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        repacks={createCandidateRepacks}
        onConfirm={(name) =>
          handleCreateConfirm(name, () => setPendingCreateIds([]))
        }
      />
    </div>
  );
}
