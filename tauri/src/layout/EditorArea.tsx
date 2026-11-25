import { useEffect, useMemo, useRef, useState } from "react";
import {
  Columns2,
  Columns3,
  ExternalLink,
  Eye,
  FileCode2,
  Grid2x2,
  Rows2,
  Rows3,
  Search,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { DiffView, useDiffTab } from "../scm/DiffView";
import { CompareView } from "../scm/CompareView";
import { closeCompareTab, subscribeCompare, type CompareState } from "../scm/compareBus";
import { EditorTabs } from "../workspace/EditorTabs";
import { Welcome } from "../workspace/Welcome";
import { useWorkspace } from "../workspace/WorkspaceContext";
import {
  isVirtualPath,
  relativeToRoot,
  workspaceCrumbs,
  parentPath,
} from "../workspace/path";
import { rootForPath } from "../ai/roots";
import { listDirectory } from "../workspace/fsTree";
import { patchSession, readSession } from "../workspace/session";
import { useEditorActions } from "../editor/EditorActions";
import { useLayout } from "./LayoutContext";
import { FileIcon } from "../ui/FileIcon";
import { IconButton } from "../ui/IconButton";
import { EmptyState } from "../ui/EmptyState";
import { ResizeHandle } from "./ResizeHandle";
import { setSplitEditorListener } from "./splitBus";
import { symbolsForFile, kindShort } from "../lsp/OutlinePanel";
import { getActiveSymbolPath, getSiblingSymbols } from "../lsp/symbolBreadcrumb";
import type { OutlineSymbol } from "../lsp/outlineScan";
import {
  createInitialPaneLayout,
  closeAllSplits,
  closePane,
  focusNextPane,
  restorePaneLayoutFromSession,
  setLayoutType,
  splitPane,
  syncPanesWithTabs,
  type PaneDropEdge,
  type PaneLayoutState,
} from "./paneLayout";
import { EditorPaneView } from "./EditorPaneView";

type CrumbMenuState = {
  x: number;
  y: number;
  kind: "file" | "directory" | "symbol";
  path: string;
  siblings?: { name: string; path: string; kind: "file" | "directory" }[];
  symbol?: OutlineSymbol;
  symbolSiblings?: OutlineSymbol[];
};

export function EditorArea() {
  const {
    document,
    rootPath,
    roots,
    tabs,
    activePath,
    openFile,
    openFileAt,
    openUntitled,
    revealInExplorer,
    activateTab,
  } = useWorkspace();
  const { findInFile, peek, clearPeek, references, clearReferences, findMatchLabel } =
    useEditorActions();
  const { toggleAi, aiOpen } = useLayout();
  const diffTab = useDiffTab();
  const [compareState, setCompareState] = useState<CompareState | null>(null);
  useEffect(() => subscribeCompare(setCompareState), []);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewScroll, setPreviewScroll] = useState(0);
  const [layoutReady, setLayoutReady] = useState(false);
  const [crumbMenu, setCrumbMenu] = useState<CrumbMenuState | null>(null);
  const crumbMenuRef = useRef<HTMLDivElement>(null);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const layoutMenuRef = useRef<HTMLDivElement>(null);

  const [paneLayoutState, setPaneLayoutState] = useState<PaneLayoutState>(() =>
    createInitialPaneLayout(activePath),
  );

  const hasFile = document !== null;
  const [fileSymbols, setFileSymbols] = useState<OutlineSymbol[]>([]);

  useEffect(() => {
    if (!document) {
      setFileSymbols([]);
      return;
    }
    let cancelled = false;
    void symbolsForFile(document.path, document.value, document.language)
      .then((symbols) => {
        if (!cancelled) setFileSymbols(symbols);
      })
      .catch(() => {
        if (!cancelled) setFileSymbols([]);
      });
    return () => {
      cancelled = true;
    };
  }, [document?.path, document?.value, document?.language]);

  const activeSymbols = useMemo(() => {
    return getActiveSymbolPath(fileSymbols, document?.cursorLine ?? 1);
  }, [fileSymbols, document?.cursorLine]);

  useEffect(() => {
    if (!crumbMenu) return;
    const close = (event: MouseEvent) => {
      if (crumbMenuRef.current?.contains(event.target as Node)) return;
      setCrumbMenu(null);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [crumbMenu]);

  useEffect(() => {
    if (!layoutMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (layoutMenuRef.current?.contains(event.target as Node)) return;
      setLayoutMenuOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [layoutMenuOpen]);

  // Restore session
  useEffect(() => {
    const session = readSession();
    if (session?.preview) setPreviewOpen(true);
    const restored = restorePaneLayoutFromSession(session, activePath);
    setPaneLayoutState(restored);
    setLayoutReady(true);
  }, []);

  // Persist session
  useEffect(() => {
    if (!layoutReady) return;
    patchSession({
      preview: previewOpen,
      split: paneLayoutState.layout !== "single",
      splitOrientation:
        paneLayoutState.layout === "rows-2" || paneLayoutState.layout === "rows-3"
          ? "down"
          : "right",
      splitRatio: paneLayoutState.splitRatio,
      secondary: paneLayoutState.panes[1]?.path ?? null,
      paneLayout: paneLayoutState.layout,
      panePaths: paneLayoutState.panes.map((p) => p.path ?? ""),
      activePaneIndex: paneLayoutState.panes.findIndex(
        (p) => p.id === paneLayoutState.activePaneId,
      ),
      secondarySplitRatio: paneLayoutState.secondarySplitRatio,
    });
  }, [layoutReady, previewOpen, paneLayoutState]);

  // Sync panes with open tabs
  useEffect(() => {
    const tabPaths = tabs.map((t) => t.path);
    setPaneLayoutState((s) => syncPanesWithTabs(s, tabPaths));
  }, [tabs]);

  // Sync external activePath into active pane
  useEffect(() => {
    if (!activePath) return;
    setPaneLayoutState((current) => {
      const activePane = current.panes.find((p) => p.id === current.activePaneId);
      if (activePane && activePane.path === activePath) return current;

      // If activePath is already displayed in another pane, focus that pane
      const existingPane = current.panes.find((p) => p.path === activePath);
      if (existingPane) {
        return {
          ...current,
          activePaneId: existingPane.id,
        };
      }

      // Otherwise, open in the currently active pane
      return {
        ...current,
        panes: current.panes.map((p) =>
          p.id === current.activePaneId ? { ...p, path: activePath } : p,
        ),
      };
    });
  }, [activePath]);

  // Split bus listener
  useEffect(() => {
    setSplitEditorListener((mode, path) => {
      const tabPaths = tabs.map((t) => t.path);
      if (mode === "close") {
        setPaneLayoutState((s) => {
          const next = closePane(s, s.activePaneId);
          const nextActive = next.panes.find((p) => p.id === next.activePaneId);
          if (nextActive?.path) activateTab(nextActive.path);
          return next;
        });
        return;
      }
      if (mode === "close-all" || mode === "single") {
        setPaneLayoutState((s) => {
          const next = closeAllSplits(s);
          const nextActive = next.panes.find((p) => p.id === next.activePaneId);
          if (nextActive?.path) activateTab(nextActive.path);
          return next;
        });
        return;
      }
      if (mode === "grid") {
        setPaneLayoutState((s) => setLayoutType(s, "grid-2x2", tabPaths));
        return;
      }
      if (mode === "three-columns") {
        setPaneLayoutState((s) => setLayoutType(s, "columns-3", tabPaths));
        return;
      }
      if (mode === "two-columns") {
        setPaneLayoutState((s) => setLayoutType(s, "columns-2", tabPaths));
        return;
      }
      if (mode === "two-rows") {
        setPaneLayoutState((s) => setLayoutType(s, "rows-2", tabPaths));
        return;
      }
      if (mode === "next-pane") {
        setPaneLayoutState((s) => {
          const next = focusNextPane(s);
          const nextPane = next.panes.find((p) => p.id === next.activePaneId);
          if (nextPane?.path) activateTab(nextPane.path);
          return next;
        });
        return;
      }
      if (mode === "open" && path) {
        void openFile(path).then(() => {
          setPaneLayoutState((s) => {
            if (s.layout === "single") {
              return splitPane(s, s.activePaneId, "right", path);
            }
            return {
              ...s,
              panes: s.panes.map((p) =>
                p.id === s.activePaneId ? { ...p, path } : p,
              ),
            };
          });
        });
        return;
      }
      if (!activePath) return;
      if (mode === "right") {
        setPaneLayoutState((s) => splitPane(s, s.activePaneId, "right", activePath));
        return;
      }
      if (mode === "down") {
        setPaneLayoutState((s) => splitPane(s, s.activePaneId, "bottom", activePath));
        return;
      }
      if (mode === "left") {
        setPaneLayoutState((s) => splitPane(s, s.activePaneId, "left", activePath));
        return;
      }
      if (mode === "up") {
        setPaneLayoutState((s) => splitPane(s, s.activePaneId, "top", activePath));
        return;
      }
      if (mode === "toggle") {
        setPaneLayoutState((s) => {
          if (s.layout === "single") {
            return splitPane(s, s.activePaneId, "right", activePath);
          }
          const next = closeAllSplits(s);
          const nextActive = next.panes.find((p) => p.id === next.activePaneId);
          if (nextActive?.path) activateTab(nextActive.path);
          return next;
        });
        return;
      }
    });
    return () => setSplitEditorListener(null);
  }, [activePath, openFile, tabs, activateTab]);

  const previewKind =
    document?.language === "markdown" ||
    document?.language === "html" ||
    document?.language === "csv" ||
    document?.language === "tsv"
      ? document.language
      : null;
  const showPreview = previewOpen && previewKind !== null;

  const crumbRoot = useMemo(() => {
    if (!document) return rootPath;
    const list = roots.length > 0 ? roots : rootPath ? [rootPath] : [];
    return rootForPath(list, document.path) ?? rootPath;
  }, [document, rootPath, roots]);

  const crumbs = useMemo(
    () =>
      !document
        ? []
        : isVirtualPath(document.path)
          ? [{ name: document.title, path: document.path, kind: "file" as const }]
          : workspaceCrumbs(crumbRoot, document.path),
    [document, crumbRoot],
  );

  const openDirectoryCrumb = async (event: React.MouseEvent, path: string) => {
    event.preventDefault();
    const parent = parentPath(path) ?? path;
    let siblings: CrumbMenuState["siblings"] = [];
    try {
      const nodes = await listDirectory(parent);
      siblings = nodes.map((node) => ({
        name: node.name,
        path: node.path,
        kind: node.kind,
      }));
    } catch {
      siblings = [];
    }
    setCrumbMenu({
      x: event.clientX,
      y: event.clientY + 4,
      kind: "directory",
      path,
      siblings,
    });
  };

  const handlePaneFocus = (paneId: string, path: string | null) => {
    setPaneLayoutState((s) => ({ ...s, activePaneId: paneId }));
    if (path && path !== activePath) {
      activateTab(path);
    }
  };

  const handlePaneSelectPath = (paneId: string, path: string) => {
    setPaneLayoutState((s) => ({
      ...s,
      activePaneId: paneId,
      panes: s.panes.map((p) => (p.id === paneId ? { ...p, path } : p)),
    }));
    activateTab(path);
  };

  const handleDropOnPane = (
    targetPaneId: string,
    edge: PaneDropEdge,
    droppedPath: string,
  ) => {
    setPaneLayoutState((s) => splitPane(s, targetPaneId, edge, droppedPath));
    activateTab(droppedPath);
  };

  const handleClosePane = (paneId: string) => {
    setPaneLayoutState((s) => {
      const next = closePane(s, paneId);
      if (s.activePaneId === paneId) {
        const nextActive = next.panes.find((p) => p.id === next.activePaneId);
        if (nextActive?.path) {
          activateTab(nextActive.path);
        }
      }
      return next;
    });
  };

  const surfaceStyle = useMemo(() => {
    const { layout, splitRatio, secondarySplitRatio } = paneLayoutState;
    if (layout === "columns-2") {
      return {
        gridTemplateColumns: `${splitRatio}fr 6px ${1 - splitRatio}fr`,
        gridTemplateRows: "1fr",
      };
    }
    if (layout === "rows-2") {
      return {
        gridTemplateColumns: "1fr",
        gridTemplateRows: `${splitRatio}fr 6px ${1 - splitRatio}fr`,
      };
    }
    if (layout === "columns-3") {
      const r1 = Math.min(0.45, Math.max(0.15, splitRatio));
      const r2 = Math.min(0.85, Math.max(r1 + 0.1, secondarySplitRatio));
      return {
        gridTemplateColumns: `${r1}fr 6px ${r2 - r1}fr 6px ${1 - r2}fr`,
        gridTemplateRows: "1fr",
      };
    }
    if (layout === "rows-3") {
      const r1 = Math.min(0.45, Math.max(0.15, splitRatio));
      const r2 = Math.min(0.85, Math.max(r1 + 0.1, secondarySplitRatio));
      return {
        gridTemplateColumns: "1fr",
        gridTemplateRows: `${r1}fr 6px ${r2 - r1}fr 6px ${1 - r2}fr`,
      };
    }
    if (layout === "grid-2x2") {
      return {
        gridTemplateColumns: `${splitRatio}fr 6px ${1 - splitRatio}fr`,
        gridTemplateRows: `${secondarySplitRatio}fr 6px ${1 - secondarySplitRatio}fr`,
      };
    }
    if (layout === "split-left-stacked-right") {
      return {
        gridTemplateColumns: `${splitRatio}fr 6px ${1 - splitRatio}fr`,
        gridTemplateRows: `${secondarySplitRatio}fr 6px ${1 - secondarySplitRatio}fr`,
      };
    }
    if (layout === "split-top-two-bottom") {
      return {
        gridTemplateColumns: `${splitRatio}fr 6px ${1 - splitRatio}fr`,
        gridTemplateRows: `${secondarySplitRatio}fr 6px ${1 - secondarySplitRatio}fr`,
      };
    }
    return { gridTemplateColumns: "1fr", gridTemplateRows: "1fr" };
  }, [paneLayoutState]);

  const renderPanes = () => {
    const { layout, panes, activePaneId } = paneLayoutState;

    if (layout === "single" || panes.length <= 1) {
      const pane = panes[0] ?? { id: "pane-primary", path: activePath };
      return (
        <EditorPaneView
          pane={pane}
          isActive={true}
          totalPanes={1}
          availableTabs={tabs}
          showPreview={showPreview}
          previewKind={previewKind}
          previewScroll={previewScroll}
          previewValue={document?.value ?? ""}
          onScrollRatio={setPreviewScroll}
          onFocus={() => handlePaneFocus(pane.id, pane.path)}
          onSelectPath={(p) => handlePaneSelectPath(pane.id, p)}
          onClosePane={() => handleClosePane(pane.id)}
          onSplitRight={() =>
            setPaneLayoutState((s) => splitPane(s, pane.id, "right", pane.path))
          }
          onSplitDown={() =>
            setPaneLayoutState((s) => splitPane(s, pane.id, "bottom", pane.path))
          }
          onDropOnEdge={(edge, dropped) => handleDropOnPane(pane.id, edge, dropped)}
        />
      );
    }

    if (layout === "columns-2") {
      return (
        <>
          <EditorPaneView
            pane={panes[0]}
            isActive={activePaneId === panes[0].id}
            totalPanes={panes.length}
            availableTabs={tabs}
            showPreview={showPreview && activePaneId === panes[0].id}
            previewKind={previewKind}
            previewScroll={previewScroll}
            previewValue={document?.value ?? ""}
            onScrollRatio={setPreviewScroll}
            onFocus={() => handlePaneFocus(panes[0].id, panes[0].path)}
            onSelectPath={(p) => handlePaneSelectPath(panes[0].id, p)}
            onClosePane={() => handleClosePane(panes[0].id)}
            onSplitRight={() =>
              setPaneLayoutState((s) =>
                splitPane(s, panes[0].id, "right", panes[0].path),
              )
            }
            onSplitDown={() =>
              setPaneLayoutState((s) =>
                splitPane(s, panes[0].id, "bottom", panes[0].path),
              )
            }
            onDropOnEdge={(edge, dropped) =>
              handleDropOnPane(panes[0].id, edge, dropped)
            }
          />
          <ResizeHandle
            axis="x"
            label="Resize split"
            onResize={(d) => {
              setPaneLayoutState((s) => ({
                ...s,
                splitRatio: Math.min(0.8, Math.max(0.2, s.splitRatio + d / 900)),
              }));
            }}
          />
          <EditorPaneView
            pane={panes[1]}
            isActive={activePaneId === panes[1].id}
            totalPanes={panes.length}
            availableTabs={tabs}
            showPreview={showPreview && activePaneId === panes[1].id}
            previewKind={previewKind}
            previewScroll={previewScroll}
            previewValue={document?.value ?? ""}
            onScrollRatio={setPreviewScroll}
            onFocus={() => handlePaneFocus(panes[1].id, panes[1].path)}
            onSelectPath={(p) => handlePaneSelectPath(panes[1].id, p)}
            onClosePane={() => handleClosePane(panes[1].id)}
            onSplitRight={() =>
              setPaneLayoutState((s) =>
                splitPane(s, panes[1].id, "right", panes[1].path),
              )
            }
            onSplitDown={() =>
              setPaneLayoutState((s) =>
                splitPane(s, panes[1].id, "bottom", panes[1].path),
              )
            }
            onDropOnEdge={(edge, dropped) =>
              handleDropOnPane(panes[1].id, edge, dropped)
            }
          />
        </>
      );
    }

    if (layout === "rows-2") {
      return (
        <>
          <EditorPaneView
            pane={panes[0]}
            isActive={activePaneId === panes[0].id}
            totalPanes={panes.length}
            availableTabs={tabs}
            showPreview={showPreview && activePaneId === panes[0].id}
            previewKind={previewKind}
            previewScroll={previewScroll}
            previewValue={document?.value ?? ""}
            onScrollRatio={setPreviewScroll}
            onFocus={() => handlePaneFocus(panes[0].id, panes[0].path)}
            onSelectPath={(p) => handlePaneSelectPath(panes[0].id, p)}
            onClosePane={() => handleClosePane(panes[0].id)}
            onSplitRight={() =>
              setPaneLayoutState((s) =>
                splitPane(s, panes[0].id, "right", panes[0].path),
              )
            }
            onSplitDown={() =>
              setPaneLayoutState((s) =>
                splitPane(s, panes[0].id, "bottom", panes[0].path),
              )
            }
            onDropOnEdge={(edge, dropped) =>
              handleDropOnPane(panes[0].id, edge, dropped)
            }
          />
          <ResizeHandle
            axis="y"
            label="Resize split"
            onResize={(d) => {
              setPaneLayoutState((s) => ({
                ...s,
                splitRatio: Math.min(0.8, Math.max(0.2, s.splitRatio + d / 900)),
              }));
            }}
          />
          <EditorPaneView
            pane={panes[1]}
            isActive={activePaneId === panes[1].id}
            totalPanes={panes.length}
            availableTabs={tabs}
            showPreview={showPreview && activePaneId === panes[1].id}
            previewKind={previewKind}
            previewScroll={previewScroll}
            previewValue={document?.value ?? ""}
            onScrollRatio={setPreviewScroll}
            onFocus={() => handlePaneFocus(panes[1].id, panes[1].path)}
            onSelectPath={(p) => handlePaneSelectPath(panes[1].id, p)}
            onClosePane={() => handleClosePane(panes[1].id)}
            onSplitRight={() =>
              setPaneLayoutState((s) =>
                splitPane(s, panes[1].id, "right", panes[1].path),
              )
            }
            onSplitDown={() =>
              setPaneLayoutState((s) =>
                splitPane(s, panes[1].id, "bottom", panes[1].path),
              )
            }
            onDropOnEdge={(edge, dropped) =>
              handleDropOnPane(panes[1].id, edge, dropped)
            }
          />
        </>
      );
    }

    if (layout === "columns-3") {
      return (
        <>
          {panes.slice(0, 3).map((p, idx) => (
            <div key={p.id} style={{ display: "contents" }}>
              {idx > 0 && (
                <ResizeHandle
                  axis="x"
                  label={`Resize column ${idx}`}
                  onResize={(d) => {
                    setPaneLayoutState((s) => {
                      if (idx === 1) {
                        return {
                          ...s,
                          splitRatio: Math.min(
                            s.secondarySplitRatio - 0.1,
                            Math.max(0.15, s.splitRatio + d / 900),
                          ),
                        };
                      }
                      return {
                        ...s,
                        secondarySplitRatio: Math.min(
                          0.85,
                          Math.max(s.splitRatio + 0.1, s.secondarySplitRatio + d / 900),
                        ),
                      };
                    });
                  }}
                />
              )}
              <EditorPaneView
                pane={p}
                isActive={activePaneId === p.id}
                totalPanes={panes.length}
                availableTabs={tabs}
                showPreview={showPreview && activePaneId === p.id}
                previewKind={previewKind}
                previewScroll={previewScroll}
                previewValue={document?.value ?? ""}
                onScrollRatio={setPreviewScroll}
                onFocus={() => handlePaneFocus(p.id, p.path)}
                onSelectPath={(path) => handlePaneSelectPath(p.id, path)}
                onClosePane={() => handleClosePane(p.id)}
                onSplitRight={() =>
                  setPaneLayoutState((s) => splitPane(s, p.id, "right", p.path))
                }
                onSplitDown={() =>
                  setPaneLayoutState((s) => splitPane(s, p.id, "bottom", p.path))
                }
                onDropOnEdge={(edge, dropped) =>
                  handleDropOnPane(p.id, edge, dropped)
                }
              />
            </div>
          ))}
        </>
      );
    }

    if (layout === "rows-3") {
      return (
        <>
          {panes.slice(0, 3).map((p, idx) => (
            <div key={p.id} style={{ display: "contents" }}>
              {idx > 0 && (
                <ResizeHandle
                  axis="y"
                  label={`Resize row ${idx}`}
                  onResize={(d) => {
                    setPaneLayoutState((s) => {
                      if (idx === 1) {
                        return {
                          ...s,
                          splitRatio: Math.min(
                            s.secondarySplitRatio - 0.1,
                            Math.max(0.15, s.splitRatio + d / 900),
                          ),
                        };
                      }
                      return {
                        ...s,
                        secondarySplitRatio: Math.min(
                          0.85,
                          Math.max(s.splitRatio + 0.1, s.secondarySplitRatio + d / 900),
                        ),
                      };
                    });
                  }}
                />
              )}
              <EditorPaneView
                pane={p}
                isActive={activePaneId === p.id}
                totalPanes={panes.length}
                availableTabs={tabs}
                showPreview={showPreview && activePaneId === p.id}
                previewKind={previewKind}
                previewScroll={previewScroll}
                previewValue={document?.value ?? ""}
                onScrollRatio={setPreviewScroll}
                onFocus={() => handlePaneFocus(p.id, p.path)}
                onSelectPath={(path) => handlePaneSelectPath(p.id, path)}
                onClosePane={() => handleClosePane(p.id)}
                onSplitRight={() =>
                  setPaneLayoutState((s) => splitPane(s, p.id, "right", p.path))
                }
                onSplitDown={() =>
                  setPaneLayoutState((s) => splitPane(s, p.id, "bottom", p.path))
                }
                onDropOnEdge={(edge, dropped) =>
                  handleDropOnPane(p.id, edge, dropped)
                }
              />
            </div>
          ))}
        </>
      );
    }

    if (layout === "grid-2x2") {
      const p0 = panes[0];
      const p1 = panes[1] ?? panes[0];
      const p2 = panes[2] ?? panes[0];
      const p3 = panes[3] ?? panes[0];

      return (
        <>
          {/* Top-left */}
          <EditorPaneView
            style={{ gridArea: "1 / 1 / 2 / 2" }}
            pane={p0}
            isActive={activePaneId === p0.id}
            totalPanes={panes.length}
            availableTabs={tabs}
            showPreview={showPreview && activePaneId === p0.id}
            previewKind={previewKind}
            previewScroll={previewScroll}
            previewValue={document?.value ?? ""}
            onScrollRatio={setPreviewScroll}
            onFocus={() => handlePaneFocus(p0.id, p0.path)}
            onSelectPath={(p) => handlePaneSelectPath(p0.id, p)}
            onClosePane={() => handleClosePane(p0.id)}
            onSplitRight={() =>
              setPaneLayoutState((s) => splitPane(s, p0.id, "right", p0.path))
            }
            onSplitDown={() =>
              setPaneLayoutState((s) => splitPane(s, p0.id, "bottom", p0.path))
            }
            onDropOnEdge={(edge, dropped) =>
              handleDropOnPane(p0.id, edge, dropped)
            }
          />
          {/* Top vertical handle */}
          <div style={{ gridArea: "1 / 2 / 2 / 3" }}>
            <ResizeHandle
              axis="x"
              label="Resize top columns"
              onResize={(d) => {
                setPaneLayoutState((s) => ({
                  ...s,
                  splitRatio: Math.min(0.8, Math.max(0.2, s.splitRatio + d / 900)),
                }));
              }}
            />
          </div>
          {/* Top-right */}
          <EditorPaneView
            style={{ gridArea: "1 / 3 / 2 / 4" }}
            pane={p1}
            isActive={activePaneId === p1.id}
            totalPanes={panes.length}
            availableTabs={tabs}
            showPreview={showPreview && activePaneId === p1.id}
            previewKind={previewKind}
            previewScroll={previewScroll}
            previewValue={document?.value ?? ""}
            onScrollRatio={setPreviewScroll}
            onFocus={() => handlePaneFocus(p1.id, p1.path)}
            onSelectPath={(p) => handlePaneSelectPath(p1.id, p)}
            onClosePane={() => handleClosePane(p1.id)}
            onSplitRight={() =>
              setPaneLayoutState((s) => splitPane(s, p1.id, "right", p1.path))
            }
            onSplitDown={() =>
              setPaneLayoutState((s) => splitPane(s, p1.id, "bottom", p1.path))
            }
            onDropOnEdge={(edge, dropped) =>
              handleDropOnPane(p1.id, edge, dropped)
            }
          />
          {/* Horizontal row handle */}
          <div style={{ gridArea: "2 / 1 / 3 / 4" }}>
            <ResizeHandle
              axis="y"
              label="Resize rows"
              onResize={(d) => {
                setPaneLayoutState((s) => ({
                  ...s,
                  secondarySplitRatio: Math.min(
                    0.8,
                    Math.max(0.2, s.secondarySplitRatio + d / 900),
                  ),
                }));
              }}
            />
          </div>
          {/* Bottom-left */}
          <EditorPaneView
            style={{ gridArea: "3 / 1 / 4 / 2" }}
            pane={p2}
            isActive={activePaneId === p2.id}
            totalPanes={panes.length}
            availableTabs={tabs}
            showPreview={showPreview && activePaneId === p2.id}
            previewKind={previewKind}
            previewScroll={previewScroll}
            previewValue={document?.value ?? ""}
            onScrollRatio={setPreviewScroll}
            onFocus={() => handlePaneFocus(p2.id, p2.path)}
            onSelectPath={(p) => handlePaneSelectPath(p2.id, p)}
            onClosePane={() => handleClosePane(p2.id)}
            onSplitRight={() =>
              setPaneLayoutState((s) => splitPane(s, p2.id, "right", p2.path))
            }
            onSplitDown={() =>
              setPaneLayoutState((s) => splitPane(s, p2.id, "bottom", p2.path))
            }
            onDropOnEdge={(edge, dropped) =>
              handleDropOnPane(p2.id, edge, dropped)
            }
          />
          {/* Bottom vertical handle */}
          <div style={{ gridArea: "3 / 2 / 4 / 3" }}>
            <ResizeHandle
              axis="x"
              label="Resize bottom columns"
              onResize={(d) => {
                setPaneLayoutState((s) => ({
                  ...s,
                  splitRatio: Math.min(0.8, Math.max(0.2, s.splitRatio + d / 900)),
                }));
              }}
            />
          </div>
          {/* Bottom-right */}
          <EditorPaneView
            style={{ gridArea: "3 / 3 / 4 / 4" }}
            pane={p3}
            isActive={activePaneId === p3.id}
            totalPanes={panes.length}
            availableTabs={tabs}
            showPreview={showPreview && activePaneId === p3.id}
            previewKind={previewKind}
            previewScroll={previewScroll}
            previewValue={document?.value ?? ""}
            onScrollRatio={setPreviewScroll}
            onFocus={() => handlePaneFocus(p3.id, p3.path)}
            onSelectPath={(p) => handlePaneSelectPath(p3.id, p)}
            onClosePane={() => handleClosePane(p3.id)}
            onSplitRight={() =>
              setPaneLayoutState((s) => splitPane(s, p3.id, "right", p3.path))
            }
            onSplitDown={() =>
              setPaneLayoutState((s) => splitPane(s, p3.id, "bottom", p3.path))
            }
            onDropOnEdge={(edge, dropped) =>
              handleDropOnPane(p3.id, edge, dropped)
            }
          />
        </>
      );
    }

    if (layout === "split-left-stacked-right") {
      const p0 = panes[0];
      const p1 = panes[1] ?? panes[0];
      const p2 = panes[2] ?? panes[0];
      return (
        <>
          <EditorPaneView
            style={{ gridArea: "1 / 1 / 4 / 2" }}
            pane={p0}
            isActive={activePaneId === p0.id}
            totalPanes={panes.length}
            availableTabs={tabs}
            showPreview={showPreview && activePaneId === p0.id}
            previewKind={previewKind}
            previewScroll={previewScroll}
            previewValue={document?.value ?? ""}
            onScrollRatio={setPreviewScroll}
            onFocus={() => handlePaneFocus(p0.id, p0.path)}
            onSelectPath={(p) => handlePaneSelectPath(p0.id, p)}
            onClosePane={() => handleClosePane(p0.id)}
            onSplitRight={() =>
              setPaneLayoutState((s) => splitPane(s, p0.id, "right", p0.path))
            }
            onSplitDown={() =>
              setPaneLayoutState((s) => splitPane(s, p0.id, "bottom", p0.path))
            }
            onDropOnEdge={(edge, dropped) =>
              handleDropOnPane(p0.id, edge, dropped)
            }
          />
          <div style={{ gridArea: "1 / 2 / 4 / 3" }}>
            <ResizeHandle
              axis="x"
              label="Resize split"
              onResize={(d) => {
                setPaneLayoutState((s) => ({
                  ...s,
                  splitRatio: Math.min(0.8, Math.max(0.2, s.splitRatio + d / 900)),
                }));
              }}
            />
          </div>
          <EditorPaneView
            style={{ gridArea: "1 / 3 / 2 / 4" }}
            pane={p1}
            isActive={activePaneId === p1.id}
            totalPanes={panes.length}
            availableTabs={tabs}
            showPreview={showPreview && activePaneId === p1.id}
            previewKind={previewKind}
            previewScroll={previewScroll}
            previewValue={document?.value ?? ""}
            onScrollRatio={setPreviewScroll}
            onFocus={() => handlePaneFocus(p1.id, p1.path)}
            onSelectPath={(p) => handlePaneSelectPath(p1.id, p)}
            onClosePane={() => handleClosePane(p1.id)}
            onSplitRight={() =>
              setPaneLayoutState((s) => splitPane(s, p1.id, "right", p1.path))
            }
            onSplitDown={() =>
              setPaneLayoutState((s) => splitPane(s, p1.id, "bottom", p1.path))
            }
            onDropOnEdge={(edge, dropped) =>
              handleDropOnPane(p1.id, edge, dropped)
            }
          />
          <div style={{ gridArea: "2 / 3 / 3 / 4" }}>
            <ResizeHandle
              axis="y"
              label="Resize stacked rows"
              onResize={(d) => {
                setPaneLayoutState((s) => ({
                  ...s,
                  secondarySplitRatio: Math.min(
                    0.8,
                    Math.max(0.2, s.secondarySplitRatio + d / 900),
                  ),
                }));
              }}
            />
          </div>
          <EditorPaneView
            style={{ gridArea: "3 / 3 / 4 / 4" }}
            pane={p2}
            isActive={activePaneId === p2.id}
            totalPanes={panes.length}
            availableTabs={tabs}
            showPreview={showPreview && activePaneId === p2.id}
            previewKind={previewKind}
            previewScroll={previewScroll}
            previewValue={document?.value ?? ""}
            onScrollRatio={setPreviewScroll}
            onFocus={() => handlePaneFocus(p2.id, p2.path)}
            onSelectPath={(p) => handlePaneSelectPath(p2.id, p)}
            onClosePane={() => handleClosePane(p2.id)}
            onSplitRight={() =>
              setPaneLayoutState((s) => splitPane(s, p2.id, "right", p2.path))
            }
            onSplitDown={() =>
              setPaneLayoutState((s) => splitPane(s, p2.id, "bottom", p2.path))
            }
            onDropOnEdge={(edge, dropped) =>
              handleDropOnPane(p2.id, edge, dropped)
            }
          />
        </>
      );
    }

    if (layout === "split-top-two-bottom") {
      const p0 = panes[0];
      const p1 = panes[1] ?? panes[0];
      const p2 = panes[2] ?? panes[0];
      return (
        <>
          <EditorPaneView
            style={{ gridArea: "1 / 1 / 2 / 4" }}
            pane={p0}
            isActive={activePaneId === p0.id}
            totalPanes={panes.length}
            availableTabs={tabs}
            showPreview={showPreview && activePaneId === p0.id}
            previewKind={previewKind}
            previewScroll={previewScroll}
            previewValue={document?.value ?? ""}
            onScrollRatio={setPreviewScroll}
            onFocus={() => handlePaneFocus(p0.id, p0.path)}
            onSelectPath={(p) => handlePaneSelectPath(p0.id, p)}
            onClosePane={() => handleClosePane(p0.id)}
            onSplitRight={() =>
              setPaneLayoutState((s) => splitPane(s, p0.id, "right", p0.path))
            }
            onSplitDown={() =>
              setPaneLayoutState((s) => splitPane(s, p0.id, "bottom", p0.path))
            }
            onDropOnEdge={(edge, dropped) =>
              handleDropOnPane(p0.id, edge, dropped)
            }
          />
          <div style={{ gridArea: "2 / 1 / 3 / 4" }}>
            <ResizeHandle
              axis="y"
              label="Resize top/bottom split"
              onResize={(d) => {
                setPaneLayoutState((s) => ({
                  ...s,
                  splitRatio: Math.min(0.8, Math.max(0.2, s.splitRatio + d / 900)),
                }));
              }}
            />
          </div>
          <EditorPaneView
            style={{ gridArea: "3 / 1 / 4 / 2" }}
            pane={p1}
            isActive={activePaneId === p1.id}
            totalPanes={panes.length}
            availableTabs={tabs}
            showPreview={showPreview && activePaneId === p1.id}
            previewKind={previewKind}
            previewScroll={previewScroll}
            previewValue={document?.value ?? ""}
            onScrollRatio={setPreviewScroll}
            onFocus={() => handlePaneFocus(p1.id, p1.path)}
            onSelectPath={(p) => handlePaneSelectPath(p1.id, p)}
            onClosePane={() => handleClosePane(p1.id)}
            onSplitRight={() =>
              setPaneLayoutState((s) => splitPane(s, p1.id, "right", p1.path))
            }
            onSplitDown={() =>
              setPaneLayoutState((s) => splitPane(s, p1.id, "bottom", p1.path))
            }
            onDropOnEdge={(edge, dropped) =>
              handleDropOnPane(p1.id, edge, dropped)
            }
          />
          <div style={{ gridArea: "3 / 2 / 4 / 3" }}>
            <ResizeHandle
              axis="x"
              label="Resize bottom columns"
              onResize={(d) => {
                setPaneLayoutState((s) => ({
                  ...s,
                  secondarySplitRatio: Math.min(
                    0.8,
                    Math.max(0.2, s.secondarySplitRatio + d / 900),
                  ),
                }));
              }}
            />
          </div>
          <EditorPaneView
            style={{ gridArea: "3 / 3 / 4 / 4" }}
            pane={p2}
            isActive={activePaneId === p2.id}
            totalPanes={panes.length}
            availableTabs={tabs}
            showPreview={showPreview && activePaneId === p2.id}
            previewKind={previewKind}
            previewScroll={previewScroll}
            previewValue={document?.value ?? ""}
            onScrollRatio={setPreviewScroll}
            onFocus={() => handlePaneFocus(p2.id, p2.path)}
            onSelectPath={(p) => handlePaneSelectPath(p2.id, p)}
            onClosePane={() => handleClosePane(p2.id)}
            onSplitRight={() =>
              setPaneLayoutState((s) => splitPane(s, p2.id, "right", p2.path))
            }
            onSplitDown={() =>
              setPaneLayoutState((s) => splitPane(s, p2.id, "bottom", p2.path))
            }
            onDropOnEdge={(edge, dropped) =>
              handleDropOnPane(p2.id, edge, dropped)
            }
          />
        </>
      );
    }

    return null;
  };

  const currentLayoutIcon =
    paneLayoutState.layout === "grid-2x2"
      ? Grid2x2
      : paneLayoutState.layout === "rows-3"
        ? Rows3
        : paneLayoutState.layout === "rows-2"
          ? Rows2
          : paneLayoutState.layout === "columns-3"
            ? Columns3
            : paneLayoutState.layout === "columns-2"
              ? Columns2
              : Square;

  return (
    <section className="editor-area island" aria-label="Editors">
      <EditorTabs />
      <div className="editor-area__meta">
        <div className="editor-area__crumbs">
          {hasFile ? (
            crumbs.map((crumb, i) => (
              <span key={`${crumb.path}-${i}`} className="editor-area__crumb">
                {crumb.kind === "directory" ? (
                  <button
                    type="button"
                    className="editor-area__crumb-btn"
                    onClick={(event) => void openDirectoryCrumb(event, crumb.path)}
                  >
                    <FileIcon name={crumb.name} kind="directory" size={14} />
                    <span>{crumb.name}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="editor-area__crumb-btn"
                    onClick={(event) =>
                      setCrumbMenu({
                        x: event.clientX,
                        y: event.clientY + 4,
                        kind: "file",
                        path: document!.path,
                      })
                    }
                  >
                    <FileIcon name={crumb.name} kind="file" size={14} />
                    <span>{crumb.name}</span>
                  </button>
                )}
                {i < crumbs.length - 1 ? (
                  <span className="editor-area__crumb-sep">/</span>
                ) : null}
              </span>
            ))
          ) : (
            <span className="editor-area__crumb-muted">No file</span>
          )}
          {hasFile &&
            activeSymbols.map((sym, idx) => (
              <span key={`sym-${sym.line}-${sym.name}-${idx}`} className="editor-area__crumb">
                <span className="editor-area__crumb-sep">&gt;</span>
                <button
                  type="button"
                  className="editor-area__crumb-btn editor-area__crumb-btn--symbol"
                  title={`${sym.kind}: ${sym.name} (line ${sym.line})`}
                  onClick={(e) => {
                    const siblings = getSiblingSymbols(fileSymbols, sym);
                    setCrumbMenu({
                      x: e.clientX,
                      y: e.clientY + 4,
                      kind: "symbol",
                      path: document!.path,
                      symbol: sym,
                      symbolSiblings: siblings,
                    });
                  }}
                >
                  <span
                    className={`outline-panel__kind outline-panel__kind--${sym.kind.toLowerCase()}`}
                  >
                    {kindShort(sym.kind)}
                  </span>
                  <span>{sym.name}</span>
                </button>
              </span>
            ))}
        </div>
        {crumbMenu ? (
          <div
            ref={crumbMenuRef}
            className="editor-area__crumb-menu"
            style={{ left: crumbMenu.x, top: crumbMenu.y }}
            role="menu"
          >
            {crumbMenu.kind === "symbol" && crumbMenu.symbol ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void openFileAt(crumbMenu.path, crumbMenu.symbol!.line, 1);
                    setCrumbMenu(null);
                  }}
                >
                  Go to {crumbMenu.symbol.name} (Line {crumbMenu.symbol.line})
                </button>
                {(crumbMenu.symbolSiblings ?? [])
                  .filter(
                    (s) =>
                      s.name !== crumbMenu.symbol!.name ||
                      s.line !== crumbMenu.symbol!.line,
                  )
                  .slice(0, 24)
                  .map((sibling) => (
                    <button
                      key={`${sibling.name}-${sibling.line}`}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setCrumbMenu(null);
                        void openFileAt(crumbMenu.path, sibling.line, 1);
                      }}
                    >
                      <span
                        className={`outline-panel__kind outline-panel__kind--${sibling.kind.toLowerCase()}`}
                        style={{ marginRight: 6 }}
                      >
                        {kindShort(sibling.kind)}
                      </span>
                      {sibling.name}
                    </button>
                  ))}
              </>
            ) : crumbMenu.kind === "file" && document ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void revealInExplorer(document.path);
                    setCrumbMenu(null);
                  }}
                >
                  Reveal in Explorer
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void navigator.clipboard.writeText(document.path);
                    setCrumbMenu(null);
                  }}
                >
                  Copy Path
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      relativeToRoot(crumbRoot, document.path),
                    );
                    setCrumbMenu(null);
                  }}
                >
                  Copy Relative Path
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void revealInExplorer(crumbMenu.path);
                    setCrumbMenu(null);
                  }}
                >
                  Reveal in Explorer
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void navigator.clipboard.writeText(crumbMenu.path);
                    setCrumbMenu(null);
                  }}
                >
                  Copy Path
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      relativeToRoot(crumbRoot, crumbMenu.path),
                    );
                    setCrumbMenu(null);
                  }}
                >
                  Copy Relative Path
                </button>
                {(crumbMenu.siblings ?? []).slice(0, 24).map((sibling) => (
                  <button
                    key={sibling.path}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCrumbMenu(null);
                      if (sibling.kind === "file") {
                        void openFile(sibling.path);
                      } else {
                        void revealInExplorer(sibling.path);
                      }
                    }}
                  >
                    {sibling.name}
                  </button>
                ))}
              </>
            )}
          </div>
        ) : null}
        <div className="editor-area__tools">
          <IconButton
            icon={Search}
            label="Find in file"
            size={15}
            onClick={findInFile}
          />
          {findMatchLabel ? (
            <span className="editor-area__chip" title="Find matches">
              {findMatchLabel}
            </span>
          ) : null}
          {previewKind ? (
            <IconButton
              icon={Eye}
              label={
                previewKind === "html"
                  ? "Preview HTML"
                  : previewKind === "csv" || previewKind === "tsv"
                    ? "Preview spreadsheet"
                    : "Preview markdown"
              }
              size={15}
              active={showPreview}
              onClick={() => setPreviewOpen((value) => !value)}
            />
          ) : null}

          <div style={{ position: "relative" }}>
            <IconButton
              icon={currentLayoutIcon}
              label="Editor layout"
              size={15}
              active={paneLayoutState.layout !== "single"}
              disabled={!hasFile}
              onClick={() => setLayoutMenuOpen((v) => !v)}
            />
            {layoutMenuOpen && (
              <div
                ref={layoutMenuRef}
                className="editor-area__layout-menu"
                role="menu"
              >
                <button
                  type="button"
                  className={paneLayoutState.layout === "single" ? "active" : ""}
                  onClick={() => {
                    setPaneLayoutState((s) => {
                      const next = setLayoutType(
                        s,
                        "single",
                        tabs.map((t) => t.path),
                      );
                      const active = next.panes.find((p) => p.id === next.activePaneId);
                      if (active?.path) activateTab(active.path);
                      return next;
                    });
                    setLayoutMenuOpen(false);
                  }}
                >
                  <Square size={13} />
                  Single Pane
                </button>
                <button
                  type="button"
                  className={paneLayoutState.layout === "columns-2" ? "active" : ""}
                  onClick={() => {
                    setPaneLayoutState((s) =>
                      setLayoutType(
                        s,
                        "columns-2",
                        tabs.map((t) => t.path),
                      ),
                    );
                    setLayoutMenuOpen(false);
                  }}
                >
                  <Columns2 size={13} />
                  Two Columns (1x2)
                </button>
                <button
                  type="button"
                  className={paneLayoutState.layout === "rows-2" ? "active" : ""}
                  onClick={() => {
                    setPaneLayoutState((s) =>
                      setLayoutType(
                        s,
                        "rows-2",
                        tabs.map((t) => t.path),
                      ),
                    );
                    setLayoutMenuOpen(false);
                  }}
                >
                  <Rows2 size={13} />
                  Two Rows (2x1)
                </button>
                <button
                  type="button"
                  className={paneLayoutState.layout === "columns-3" ? "active" : ""}
                  onClick={() => {
                    setPaneLayoutState((s) =>
                      setLayoutType(
                        s,
                        "columns-3",
                        tabs.map((t) => t.path),
                      ),
                    );
                    setLayoutMenuOpen(false);
                  }}
                >
                  <Columns3 size={13} />
                  Three Columns (1x3)
                </button>
                <button
                  type="button"
                  className={paneLayoutState.layout === "rows-3" ? "active" : ""}
                  onClick={() => {
                    setPaneLayoutState((s) =>
                      setLayoutType(
                        s,
                        "rows-3",
                        tabs.map((t) => t.path),
                      ),
                    );
                    setLayoutMenuOpen(false);
                  }}
                >
                  <Rows3 size={13} />
                  Three Rows (3x1)
                </button>
                <button
                  type="button"
                  className={paneLayoutState.layout === "grid-2x2" ? "active" : ""}
                  onClick={() => {
                    setPaneLayoutState((s) =>
                      setLayoutType(
                        s,
                        "grid-2x2",
                        tabs.map((t) => t.path),
                      ),
                    );
                    setLayoutMenuOpen(false);
                  }}
                >
                  <Grid2x2 size={13} />
                  Grid / Quad (2x2)
                </button>
              </div>
            )}
          </div>

          <IconButton
            icon={Sparkles}
            label={aiOpen ? "Hide AI" : "Ask AI"}
            size={15}
            onClick={toggleAi}
            active={aiOpen}
          />
        </div>
      </div>
      {peek && (
        <div className="editor-area__peek">
          <div className="editor-area__peek-bar">
            <span className="editor-area__peek-title">{peek.title}</span>
            <div className="editor-area__peek-actions">
              {peek.path && (
                <IconButton
                  icon={ExternalLink}
                  label="Jump to definition"
                  size={13}
                  onClick={() => void openFileAt(peek.path, peek.line, peek.column)}
                />
              )}
              <IconButton
                icon={X}
                label="Close peek"
                size={13}
                onClick={clearPeek}
              />
            </div>
          </div>
          <pre className="editor-area__peek-code">{peek.preview}</pre>
        </div>
      )}
      {references && (
        <div className="editor-area__peek">
          <div className="editor-area__peek-bar">
            <span className="editor-area__peek-title">
              {references.length} reference{references.length === 1 ? "" : "s"}
            </span>
            <div className="editor-area__peek-actions">
              <IconButton
                icon={X}
                label="Close references"
                size={13}
                onClick={clearReferences}
              />
            </div>
          </div>
          <ul className="editor-area__refs">
            {references.map((hit) => (
              <li key={`${hit.path}:${hit.line}:${hit.column}:${hit.preview}`}>
                <button
                  type="button"
                  className="editor-area__ref-row"
                  onClick={() => void openFileAt(hit.path, hit.line, hit.column)}
                >
                  <span className="editor-area__ref-loc">
                    {hit.path.split(/[/\\]/).pop()}:{hit.line}
                  </span>
                  <span className="editor-area__ref-preview">{hit.preview}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div
        className={
          paneLayoutState.layout !== "single"
            ? "editor-area__surface editor-area__surface--multi"
            : "editor-area__surface"
        }
        style={paneLayoutState.layout !== "single" ? surfaceStyle : undefined}
      >
        {compareState ? (
          <CompareView
            base={compareState.base}
            head={compareState.head}
            cwd={rootPath ?? ""}
            onClose={closeCompareTab}
          />
        ) : diffTab ? (
          <DiffView
            path={diffTab.path}
            text={diffTab.text}
            head={diffTab.head}
            working={diffTab.working}
            cwd={diffTab.cwd}
            staged={diffTab.staged}
            ignoreSpace={diffTab.ignoreSpace}
          />
        ) : hasFile && activePath ? (
          renderPanes()
        ) : !rootPath ? (
          <Welcome />
        ) : (
          <EmptyState
            icon={FileCode2}
            title="No editor open"
            description="Pick a file from the explorer, or jump straight to one."
            actions={[{ label: "New File", onClick: openUntitled }]}
            hints={[
              { label: "Go to file", keys: "Ctrl+P" },
              { label: "Command palette", keys: "Ctrl+Shift+P" },
              { label: "Search workspace", keys: "Ctrl+Shift+F" },
              { label: "Toggle terminal", keys: "Ctrl+`" },
            ]}
          />
        )}
      </div>
    </section>
  );
}
