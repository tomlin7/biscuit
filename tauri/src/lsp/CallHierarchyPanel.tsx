import { useEffect, useMemo, useState } from "react";
import * as monaco from "monaco-editor";
import { PhoneIncoming, PhoneOutgoing, RefreshCw, Search, X } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { IconButton } from "../ui/IconButton";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { getCallHierarchy, type CallHierarchyResult } from "./callHierarchy";
import { kindShort } from "./OutlinePanel";
import "./CallHierarchyPanel.css";

export function CallHierarchyPanel() {
  const { document, openFileAt } = useWorkspace();
  const [data, setData] = useState<CallHierarchyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<"incoming" | "outgoing">("incoming");
  const [filterQuery, setFilterQuery] = useState("");

  const refresh = () => {
    if (!document) {
      setData(null);
      return;
    }
    const model = monaco.editor.getModels().find((m) => {
      const p = m.uri.fsPath || m.uri.path;
      return p === document.path || p.endsWith(document.path) || document.path.endsWith(p);
    });
    if (!model) {
      setData(null);
      return;
    }
    setLoading(true);
    const line = document.cursorLine || 1;
    const col = document.cursorColumn || 1;
    void getCallHierarchy(model, { lineNumber: line, column: col })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setData(null);
        setLoading(false);
      });
  };

  useEffect(() => {
    refresh();
  }, [document?.path, document?.cursorLine]);

  const items = useMemo(() => {
    if (!data) return [];
    return direction === "incoming" ? data.incoming : data.outgoing;
  }, [data, direction]);

  const filteredItems = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.callerName && item.callerName.toLowerCase().includes(q)) ||
        item.preview.toLowerCase().includes(q),
    );
  }, [items, filterQuery]);

  if (!document) {
    return (
      <div className="call-hierarchy-panel call-hierarchy-panel--empty">
        <EmptyState
          compact
          icon={PhoneIncoming}
          title="No Call Hierarchy"
          description="Open a JavaScript or TypeScript file to view calls."
        />
      </div>
    );
  }

  return (
    <div className="call-hierarchy-panel">
      <div className="call-hierarchy-panel__toolbar">
        <div className="call-hierarchy-panel__tabs">
          <button
            type="button"
            className={`call-hierarchy-panel__tab${direction === "incoming" ? " call-hierarchy-panel__tab--active" : ""}`}
            onClick={() => setDirection("incoming")}
          >
            <PhoneIncoming size={12} style={{ marginRight: 4 }} />
            Incoming ({data?.incoming.length ?? 0})
          </button>
          <button
            type="button"
            className={`call-hierarchy-panel__tab${direction === "outgoing" ? " call-hierarchy-panel__tab--active" : ""}`}
            onClick={() => setDirection("outgoing")}
          >
            <PhoneOutgoing size={12} style={{ marginRight: 4 }} />
            Outgoing ({data?.outgoing.length ?? 0})
          </button>
        </div>
        <IconButton
          icon={RefreshCw}
          label="Refresh calls"
          size={13}
          onClick={refresh}
        />
      </div>

      {data?.root ? (
        <div className="call-hierarchy-panel__root">
          <span className={`outline-panel__kind outline-panel__kind--${data.root.kind.toLowerCase()}`}>
            {kindShort(data.root.kind)}
          </span>
          <span className="call-hierarchy-panel__root-name">{data.root.name}</span>
          <span className="call-hierarchy-panel__loc">:{data.root.line}</span>
        </div>
      ) : null}

      <div className="call-hierarchy-panel__search-wrap">
        <Search size={13} className="call-hierarchy-panel__search-icon" aria-hidden />
        <input
          className="call-hierarchy-panel__search-input"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder={`Filter ${direction} calls…`}
          aria-label="Filter calls"
        />
        {filterQuery && (
          <button
            type="button"
            className="call-hierarchy-panel__search-clear"
            onClick={() => setFilterQuery("")}
            title="Clear filter"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="call-hierarchy-panel__body">
        {loading ? (
          <div className="call-hierarchy-panel__loading">Analyzing call hierarchy…</div>
        ) : !data || items.length === 0 ? (
          <EmptyState
            compact
            icon={direction === "incoming" ? PhoneIncoming : PhoneOutgoing}
            title={`No ${direction} calls`}
            description={
              direction === "incoming"
                ? "No callers found for this function."
                : "This function does not make any outgoing calls."
            }
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            compact
            icon={Search}
            title="No matches"
            description={<>No calls match &ldquo;{filterQuery}&rdquo;.</>}
          />
        ) : (
          <ul className="call-hierarchy-panel__list">
            {filteredItems.map((item, index) => (
              <li key={`${item.path}-${item.line}-${item.column}-${index}`}>
                <button
                  type="button"
                  className="call-hierarchy-panel__row"
                  onClick={() => void openFileAt(item.path, item.line, item.column)}
                >
                  <span className={`outline-panel__kind outline-panel__kind--${item.kind.toLowerCase()}`}>
                    {kindShort(item.kind)}
                  </span>
                  <div className="call-hierarchy-panel__info">
                    <div className="call-hierarchy-panel__top">
                      <span className="call-hierarchy-panel__name">{item.name}</span>
                      <span className="call-hierarchy-panel__loc">:{item.line}</span>
                    </div>
                    {item.preview && (
                      <div className="call-hierarchy-panel__preview">{item.preview}</div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
