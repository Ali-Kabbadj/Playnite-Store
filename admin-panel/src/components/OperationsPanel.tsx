import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  CloudDownload,
  GitMerge,
  ShieldCheck,
  FileSearch,
  DatabaseBackup,
  TerminalSquare,
} from "lucide-react";

// The script file name is hidden from the UI, we only show friendly names and icons.
const OPERATIONS = [
  {
    file: "fetch_hydra_sources.py",
    name: "Update Hydra Sources",
    desc: "Fetch latest JSON from source URLs and insert new repacks into the database.",
    actionName: "Run Fetcher",
    icon: CloudDownload,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  {
    file: "db_sync.py",
    name: "Auto-Match Repacks",
    desc: "Runs the Trigram matching engine to link new orphan repacks to official games.",
    actionName: "Start Sync",
    icon: GitMerge,
    color: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  {
    file: "smart_audit.py",
    name: "Smart Title Audit",
    desc: "Cross-references orphan titles to discover missed patterns and false positives.",
    actionName: "Run Audit",
    icon: ShieldCheck,
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  {
    file: "analyze_titles.py",
    name: "Deep Title Analysis",
    desc: "Extracts top brackets, parentheses, and release groups into a frequency report.",
    actionName: "Analyze",
    icon: FileSearch,
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  {
    file: "db_full_report.py",
    name: "Database Report",
    desc: "Dumps complete database schema, indexes, and row counts to a text file.",
    actionName: "Generate",
    icon: DatabaseBackup,
    color: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  },
  {
    file: "db_backup.py",
    name: "Backup Database",
    desc: "Creates a safe snapshot of the entire database in the backups folder.",
    actionName: "Backup DB",
    icon: DatabaseBackup,
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
];

export function OperationsPanel() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Auto-scroll terminal to bottom
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const runScript = (scriptFile: string, friendlyName: string) => {
    if (isRunning) return;

    setLogs([
      `> Initiating Task: ${friendlyName}...`,
      `> Executing pipeline script: ${scriptFile}`,
      "",
    ]);
    setIsRunning(true);

    const token = localStorage.getItem("admin_token");
    const url = `http://localhost:3456/api/v1/admin/operations/run/${scriptFile}?token=${token}`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "stdout" || data.type === "stderr") {
        setLogs((prev) => [...prev, data.text.trim()]);
      } else if (data.type === "close") {
        setLogs((prev) => [
          ...prev,
          "",
          `> Task completed with exit code ${data.code}`,
        ]);
        setIsRunning(false);
        es.close();
      }
    };

    es.onerror = () => {
      setLogs((prev) => [
        ...prev,
        "",
        `> ❌ Connection lost or process terminated unexpectedly.`,
      ]);
      setIsRunning(false);
      es.close();
    };
  };

  const stopScript = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setLogs((prev) => [...prev, "", `> ⚠️ Forcefully aborted by user.`]);
      setIsRunning(false);
    }
  };

  return (
    <div className="flex w-full h-full gap-6">
      {/* LEFT PANEL: OPERATIONS GRID */}
      <div className="w-[45%] flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-4 shrink-0">
          <TerminalSquare className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-base font-bold">Data Pipelines & Tasks</h2>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-4">
          {OPERATIONS.map((op) => {
            const Icon = op.icon;
            return (
              <div
                key={op.file}
                className="p-4 border rounded-xl bg-card shadow-sm flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg border ${op.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{op.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {op.desc}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={() => runScript(op.file, op.name)}
                    disabled={isRunning}
                    className="w-32 h-8 text-xs font-medium"
                    variant={isRunning ? "outline" : "default"}
                  >
                    {op.actionName}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL: TERMINAL */}
      <div className="flex-1 flex flex-col rounded-xl bg-[#0c0c0c] border border-[#333] shadow-inner overflow-hidden relative">
        <div className="h-10 bg-[#1a1a1a] flex items-center justify-between px-4 border-b border-[#333] shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
            </div>
            <span className="text-xs font-mono text-muted-foreground ml-2 tracking-wider">
              OUTPUT_CONSOLE
            </span>
          </div>

          {isRunning && (
            <button
              onClick={stopScript}
              className="text-[10px] uppercase font-bold tracking-wider text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-400/10 border border-red-400/20 transition-colors"
            >
              Abort Process
            </button>
          )}
        </div>

        <div
          ref={terminalRef}
          className="flex-1 p-5 overflow-y-auto font-mono text-[12px] text-[#00ff00] leading-relaxed"
        >
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#444] select-none">
              <TerminalSquare className="w-12 h-12 mb-2 opacity-50" />
              <span>System Ready. Select a task to execute.</span>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap break-words">
                {log}
              </div>
            ))
          )}
          {isRunning && <div className="animate-pulse mt-1">_</div>}
        </div>
      </div>
    </div>
  );
}
