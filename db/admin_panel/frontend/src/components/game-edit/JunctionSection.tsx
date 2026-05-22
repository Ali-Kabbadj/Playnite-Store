import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SearchableAdd } from "./SearchableAdd";

interface Props {
  label: string;
  items: { id: number; name: string }[];
  onAdd: (id: number, name: string) => void;
  onRemove: (id: number) => void;
  placeholder: string;
  loadPage: (
    page: number,
    perPage: number,
    query: string,
  ) => Promise<{ rows: { id: number; name: string }[]; total: number }>;
}

export function JunctionSection({
  label,
  items,
  onAdd,
  onRemove,
  placeholder,
  loadPage,
}: Props) {
  const [search, setSearch] = useState("");
  const excludeIds = new Set(items.map((i) => i.id));

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex flex-wrap gap-1">
        {items.length === 0 && (
          <span className="text-xs text-muted-foreground italic">None</span>
        )}
        {items.map((item) => (
          <Badge
            key={item.id}
            variant="secondary"
            className="text-[10px] gap-1 px-1.5 py-0"
          >
            {item.name}
            <button
              onClick={() => onRemove(item.id)}
              className="hover:text-destructive leading-none text-muted-foreground"
            >
              ×
            </button>
          </Badge>
        ))}
      </div>
      <SearchableAdd
        search={search}
        onSearch={setSearch}
        onAdd={onAdd}
        placeholder={placeholder}
        loadPage={loadPage}
        excludeIds={excludeIds}
      />
    </div>
  );
}
