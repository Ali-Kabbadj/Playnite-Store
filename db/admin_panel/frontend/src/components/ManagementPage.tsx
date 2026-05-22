import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResourcePanel } from "./management/ResourcePanel";

const TABS = [
  { key: "tags", label: "Themes" },
  { key: "genres", label: "Genres" },
  { key: "series", label: "Collections" },
  { key: "platforms", label: "Platforms" },
  { key: "companies", label: "Companies" },
  { key: "providers", label: "Providers" },
  { key: "sources", label: "Repack Sources" },
  { key: "link_sources", label: "External Link Sources" },
];

export function ManagementPage() {
  const [tab, setTab] = useState(TABS[0].key);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <div className="flex gap-1 mb-2 shrink-0 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs px-3 whitespace-nowrap"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <div className="flex-1 min-h-0 border rounded-lg p-3 bg-muted/20">
        <ResourcePanel resource={tab} />
      </div>
    </div>
  );
}
