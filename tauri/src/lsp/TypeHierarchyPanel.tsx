import { useEffect, useMemo, useState } from "react";
import * as monaco from "monaco-editor";
import { GitFork, Layers, RefreshCw, Search, X } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { IconButton } from "../ui/IconButton";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { getTypeHierarchy, type TypeHierarchyResult } from "./typeHierarchy";
import { kindShort } from "./OutlinePanel";
import "./TypeHierarchyPanel.css";

export function TypeHierarchyPanel() {
  const { document, openFileAt } = useWorkspace();
  const [data, setData] = useState<TypeHierarchyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<"supertypes" | "subtypes">("supertypes");
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
    void getTypeHierarchy(model, { lineNumber: line, column: col })
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
    return direction === "supertypes" ? data.supertypes : data.subtypes;
  }, [data, direction]);

  const filteredItems = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.detail && item.detail.toLowerCase().includes(q)) ||
        item.preview.toLowerCase().includes(q),
    );
  }, [items, filterQuery]);

  if (!document) {
    return (
      <div className="type-hierarchy-panel type-hierarchy-panel--empty">
        <EmptyState
          compact
          icon={Layers}
          title="No Type Hierarchy"
          description="Open a JavaScript or TypeScript file to view type hierarchy."
        />
      </div>
    );
  }

  return (
    <div className="type-hierarchy-panel">
      <div className="type-hierarchy-panel__toolbar">
        <div className="type-hierarchy-panel__tabs">
          <button
            type="button"
            className={`type-hierarchy-panel__tab${direction === "supertypes" ? " type-hierarchy-panel__tab--active" : ""}`}
            onClick={() => setDirection("supertypes")}
          >
            <Layers size={12} style={{ marginRight: 4 }} />
            Supertypes ({data?.supertypes.length ?? 0})
          </button>
          <button
            type="button"
            className={`type-hierarchy-panel__tab${direction === "subtypes" ? " type-hierarchy-panel__tab--active" : ""}`}
            onClick={() => setDirection("subtypes")}
          >
            <GitFork size={12} style={{ marginRight: 4 }} />
            Subtypes ({data?.subtypes.length ?? 0})
          </button>
        </div>
        <IconButton
          icon={RefreshCw}
          label="Refresh type hierarchy"
          size={13}
          onClick={refresh}
        />
      </div>

      {data?.root ? (
        <div className="type-hierarchy-panel__root">
          <span className={`outline-panel__kind outline-panel__kind--${data.root.kind}`}>
            {kindShort(data.root.kind)}
          </span>
          <span className="type-hierarchy-panel__root-name">{data.root.name}</span>
          <span className="type-hierarchy-panel__loc">:{data.root.line}</span>
        </div>
      ) : null}

      <div className="type-hierarchy-panel__search-wrap">
        <Search size={13} className="type-hierarchy-panel__search-icon" aria-hidden />
        <input
          className="type-hierarchy-panel__search-input"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder={`Filter ${direction}…`}
          aria-label="Filter types"
        />
        {filterQuery && (
          <button
            type="button"
            className="type-hierarchy-panel__search-clear"
            onClick={() => setFilterQuery("")}
            title="Clear filter"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="type-hierarchy-panel__body">
        {loading ? (
          <div className="type-hierarchy-panel__loading">Analyzing type hierarchy…</div>
        ) : !data || items.length === 0 ? (
          <EmptyState
            compact
            icon={direction === "supertypes" ? Layers : GitFork}
            title={`No ${direction}`}
            description={
              direction === "supertypes"
                ? "This type does not extend or implement any supertypes."
                : "No subtypes or implementers found."
            }
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            compact
            icon={Search}
            title="No matches"
            description={<>No types match &ldquo;{filterQuery}&rdquo;.</>}
          />
        ) : (
          <ul className="type-hierarchy-panel__list">
            {filteredItems.map((item, index) => (
              <li key={`${item.path}-${item.line}-${item.name}-${index}`}>
                <button
                  type="button"
                  className="type-hierarchy-panel__row"
                  onClick={() => void openFileAt(item.path, item.line, item.column)}
                >
                  <span className={`outline-panel__kind outline-panel__kind--${item.kind}`}>
                    {kindShort(item.kind)}
                  </span>
                  <div className="type-hierarchy-panel__info">
                    <div className="type-hierarchy-panel__top">
                      <span className="type-hierarchy-panel__name">{item.name}</span>
                      {item.detail && (
                        <span className="type-hierarchy-panel__detail">{item.detail}</span>
                      )}
                      <span className="type-hierarchy-panel__loc">:{item.line}</span>
                    </div>
                    {item.preview && (
                      <div className="type-hierarchy-panel__preview">{item.preview}</div>
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
