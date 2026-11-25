import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Cpu, RefreshCw, Search, Trash2, X } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { IconButton } from "../ui/IconButton";
import "./ProcessExplorer.css";

export type PtyProcessInfo = {
  id: string;
  pid: number | null;
  command: string;
};

export function ProcessExplorer() {
  const [processes, setProcesses] = useState<PtyProcessInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [killingId, setKillingId] = useState<string | null>(null);

  const fetchProcesses = async () => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) return;
    try {
      setLoading(true);
      const list = await invoke<PtyProcessInfo[]>("list_pty_processes");
      setProcesses(Array.isArray(list) ? list : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProcesses();
    const interval = setInterval(() => {
      void fetchProcesses();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleKill = async (item: PtyProcessInfo) => {
    setKillingId(item.id);
    try {
      await invoke("kill_pty_process", { idOrPid: item.pid ? String(item.pid) : item.id });
      await fetchProcesses();
    } catch {
      /* ignore */
    } finally {
      setKillingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return processes;
    return processes.filter(
      (p) =>
        p.command.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.pid != null && String(p.pid).includes(q)),
    );
  }, [processes, filter]);

  return (
    <div className="process-explorer">
      <div className="process-explorer__bar">
        <div className="process-explorer__search-wrap">
          <Search size={12} className="process-explorer__search-icon" aria-hidden />
          <input
            className="process-explorer__search-input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter processes…"
            aria-label="Filter processes"
          />
          {filter && (
            <button
              type="button"
              className="process-explorer__search-clear"
              onClick={() => setFilter("")}
              title="Clear filter"
            >
              <X size={11} />
            </button>
          )}
        </div>

        <div className="process-explorer__actions">
          <IconButton
            icon={RefreshCw}
            label={loading ? "Refreshing…" : "Refresh process list"}
            size={13}
            onClick={() => void fetchProcesses()}
          />
        </div>
      </div>

      <div className="process-explorer__body">
        {processes.length === 0 ? (
          <div className="process-explorer__empty">
            <EmptyState
              compact
              icon={Cpu}
              title="No active processes"
              description="Child processes spawned by integrated terminals will appear here."
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="process-explorer__empty">
            <EmptyState
              compact
              icon={Cpu}
              title="No matching processes"
              description={`No processes matched "${filter}".`}
            />
          </div>
        ) : (
          <table className="process-explorer__table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>PID</th>
                <th>Command</th>
                <th style={{ width: 220 }}>Terminal Session</th>
                <th style={{ width: 70 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="process-explorer__pid">
                    {item.pid != null ? item.pid : "—"}
                  </td>
                  <td className="process-explorer__cmd" title={item.command}>
                    <code>{item.command}</code>
                  </td>
                  <td className="process-explorer__session" title={item.id}>
                    {item.id.slice(0, 8)}…
                  </td>
                  <td>
                    <button
                      type="button"
                      className="process-explorer__kill-btn"
                      title="Kill process"
                      disabled={killingId === item.id}
                      onClick={() => void handleKill(item)}
                    >
                      <Trash2 size={12} /> Kill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
