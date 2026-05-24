import { useState, type UIEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { useResourceList, useResourceMutations } from "@/hooks/useManagement";

export function ResourcePanel({ resource }: { resource: string }) {
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState("");

  const perPage = 50;
  const { data, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useResourceList(resource, search, perPage);

  const items = data?.pages.flatMap((p) => p.rows) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const isInitialLoad = isFetching && !isFetchingNextPage;

  const { create, update, remove } = useResourceMutations(resource);

  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop <= clientHeight * 1.5 &&
      hasNextPage &&
      !isFetchingNextPage
    )
      fetchNextPage();
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    create.mutate(newName.trim(), {
      onSuccess: () => {
        setNewName("");
        setErrorMsg("");
      },
      onError: (e) => setErrorMsg(e.message),
    });
  };

  const handleSave = (id: number) => {
    if (!editName.trim()) return;
    update.mutate(
      { id, name: editName.trim() },
      {
        onSuccess: () => {
          setEditId(null);
          setErrorMsg("");
        },
        onError: (e) => setErrorMsg(e.message),
      },
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-card">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <div className="flex items-center gap-1">
          <Input
            placeholder={`Search ${resource}...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(inputValue)}
            className="h-8 text-sm w-64"
          />
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 shrink-0"
            onClick={() => setSearch(inputValue)}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1 border-l pl-2 ml-1">
          <Input
            placeholder="Add new..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-8 text-sm w-48"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={handleCreate}
            disabled={!newName.trim() || create.isPending}
          >
            + Create
          </Button>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums ml-auto">
          {total.toLocaleString()} total
        </span>
      </div>

      {errorMsg && (
        <div className="text-xs text-destructive bg-destructive/10 px-2 py-1 mb-2 rounded shrink-0">
          {errorMsg}
        </div>
      )}

      <div
        className="flex-1 border rounded-md min-h-0 overflow-auto relative"
        onScroll={handleScroll}
      >
        <Table>
          <TableHeader className="sticky top-0 bg-muted/50 z-10 backdrop-blur-xs">
            <TableRow>
              <TableHead className="w-14">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-32 text-right">Context Info</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isInitialLoad ? (
              <TableRow>
                <TableCell colSpan={4} className="h-48 align-top p-0 border-0">
                  <div className="h-0.5 w-full bg-foreground animate-indeterminate" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-8 text-muted-foreground text-sm"
                >
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="group">
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {item.id}
                  </TableCell>
                  <TableCell>
                    {editId === item.id ? (
                      <Input
                        autoFocus
                        className="h-6 text-xs max-w-sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSave(item.id)
                        }
                      />
                    ) : (
                      <span className="text-sm font-medium">{item.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.game_count !== undefined && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-mono"
                      >
                        {item.game_count} Games
                      </Badge>
                    )}
                    {item.repack_count !== undefined && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-mono"
                      >
                        {item.repack_count} Repacks
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right p-1">
                    {editId === item.id ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => setEditId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => handleSave(item.id)}
                          disabled={update.isPending}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditId(item.id);
                            setEditName(item.name);
                          }}
                          className="px-1.5 py-0.5 rounded text-[11px] bg-muted hover:bg-primary"
                        >
                          ✎ Rename
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Are you sure?"))
                              remove.mutate(item.id);
                          }}
                          className="px-1.5 py-0.5 rounded text-[11px] bg-muted hover:bg-destructive hover:text-destructive-foreground"
                        >
                          🗑 Delete
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
            {isFetchingNextPage && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-4 text-xs text-muted-foreground"
                >
                  Loading more...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
