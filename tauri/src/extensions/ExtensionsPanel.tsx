import { useMemo, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import {
  ArrowUpCircle,
  Blocks,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FolderDown,
  Globe,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  useExtensions,
  type ExtensionManifest,
  type RegistryExtension,
} from "./ExtensionsContext";
import { extensionHost, type ActivationRecord } from "./host/extensionHost";
import { IconButton } from "../ui/IconButton";
import { EmptyState } from "../ui/EmptyState";
import "./ExtensionsPanel.css";

export type PanelTab = "installed" | "marketplace" | "updates";

function activationLabel(ext: ExtensionManifest, record: ActivationRecord | undefined) {
  if (!ext.enabled || !ext.main) return null;
  if (!record) return { text: "Not activated", title: "Starts on its first activation event", tone: "idle" };
  if (record.status === "activating") return { text: "Activating…", title: record.reason, tone: "activating" };
  if (record.status === "failed") return { text: "Failed", title: record.error ?? "", tone: "error" };
  return { text: `Active (${record.ms ?? 0}ms)`, title: `Activated by ${record.reason}`, tone: "ok" };
}

export function isNewer(remote: string, local: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/i, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const [r1 = 0, r2 = 0, r3 = 0] = parse(remote);
  const [l1 = 0, l2 = 0, l3 = 0] = parse(local);
  if (r1 !== l1) return r1 > l1;
  if (r2 !== l2) return r2 > l2;
  return r3 > l3;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to document.execCommand fallback
    }
  }

  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      textarea.setAttribute("readonly", "");
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return Boolean(success);
    } catch {
      return false;
    }
  }

  return false;
}

export type ExtensionsPanelProps = {
  initialTab?: PanelTab;
  initialQuery?: string;
  initialInspectedId?: string | null;
  initialEnabledOnly?: boolean;
};

export function ExtensionsPanel({
  initialTab = "installed",
  initialQuery = "",
  initialInspectedId = null,
  initialEnabledOnly = false,
}: ExtensionsPanelProps = {}) {
  const activations = useSyncExternalStore(
    extensionHost.subscribe,
    extensionHost.getRecords,
    extensionHost.getRecords,
  );
  const {
    extensions,
    loading,
    error,
    registry,
    registryLoading,
    registryError,
    refresh,
    fetchRegistry,
    setEnabled,
    toggleWorkspaceEnablement,
    installSample,
    installFromFolder,
    installFromRegistry,
    scaffoldInFolder,
    uninstall,
  } = useExtensions();

  const [tab, setTab] = useState<PanelTab>(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [enabledOnly, setEnabledOnly] = useState(initialEnabledOnly);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [updatingAll, setUpdatingAll] = useState(false);
  const [inspectedId, setInspectedId] = useState<string | null>(initialInspectedId);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const enabledCount = useMemo(
    () => extensions.filter((e) => e.enabled).length,
    [extensions],
  );

  const installedWithUpdates = useMemo(() => {
    return extensions.filter((ext) => {
      const match = registry.find((r) => r.id === ext.id);
      return match && isNewer(match.version, ext.version);
    });
  }, [extensions, registry]);

  const shownInstalled = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return extensions.filter((ext) => {
      if (enabledOnly && !ext.enabled) return false;
      if (!needle) return true;
      return (
        ext.name.toLowerCase().includes(needle) ||
        ext.id.toLowerCase().includes(needle) ||
        (ext.description ?? "").toLowerCase().includes(needle)
      );
    });
  }, [extensions, query, enabledOnly]);

  const shownMarketplace = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return registry.filter((entry) => {
      if (!needle) return true;
      return (
        entry.name.toLowerCase().includes(needle) ||
        entry.id.toLowerCase().includes(needle) ||
        (entry.description ?? "").toLowerCase().includes(needle)
      );
    });
  }, [registry, query]);

  const shownUpdates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return installedWithUpdates.filter((ext) => {
      if (!needle) return true;
      return (
        ext.name.toLowerCase().includes(needle) ||
        ext.id.toLowerCase().includes(needle) ||
        (ext.description ?? "").toLowerCase().includes(needle)
      );
    });
  }, [installedWithUpdates, query]);

  const handleInstallRemote = async (entry: RegistryExtension) => {
    setBusyId(entry.id);
    try {
      await installFromRegistry(entry);
    } finally {
      setBusyId(null);
    }
  };

  const handleUninstall = async (id: string) => {
    setBusyId(id);
    try {
      await uninstall(id);
      if (inspectedId === id) setInspectedId(null);
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateAll = async () => {
    if (updatingAll) return;
    setUpdatingAll(true);
    try {
      for (const ext of installedWithUpdates) {
        const match = registry.find((r) => r.id === ext.id);
        if (match) {
          setBusyId(match.id);
          try {
            await installFromRegistry(match);
          } catch {
            // Proceed with next update even if one fails
          }
        }
      }
    } finally {
      setBusyId(null);
      setUpdatingAll(false);
    }
  };

  const handleCopyId = async (id: string) => {
    const ok = await copyToClipboard(id);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    }
  };

  const toggleInspect = (id: string) => {
    setInspectedId((cur) => (cur === id ? null : id));
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentTab: PanelTab) => {
    const tabs: PanelTab[] = ["installed", "marketplace", "updates"];
    const idx = tabs.indexOf(currentTab);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = tabs[(idx + 1) % tabs.length];
      setTab(next);
      if (next === "marketplace" && registry.length === 0) void fetchRegistry();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
      setTab(prev);
      if (prev === "marketplace" && registry.length === 0) void fetchRegistry();
    }
  };

  const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleInspect(id);
    } else if (e.key === "Escape" && inspectedId === id) {
      e.preventDefault();
      setInspectedId(null);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextRow = e.currentTarget.parentElement?.nextElementSibling?.querySelector<HTMLElement>(".ext-panel__row");
      nextRow?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevRow = e.currentTarget.parentElement?.previousElementSibling?.querySelector<HTMLElement>(".ext-panel__row");
      prevRow?.focus();
    }
  };

  return (
    <div className="ext-panel" role="region" aria-label="Extensions Manager">
      {/* Top compact header */}
      <div className="ext-panel__header">
        <div className="ext-panel__header-title">Extensions</div>
        <div className="ext-panel__header-actions">
          <IconButton
            icon={RefreshCw}
            label={tab === "marketplace" ? "Refresh marketplace" : "Refresh extensions"}
            size={13}
            onClick={() => {
              if (tab === "marketplace") void fetchRegistry();
              else void refresh();
            }}
          />
          <IconButton
            icon={FolderDown}
            label="Install from folder"
            size={13}
            onClick={() => void installFromFolder()}
          />
          <IconButton
            icon={Plus}
            label="Scaffold new extension"
            size={13}
            onClick={() => void scaffoldInFolder()}
          />
          <IconButton
            icon={Sparkles}
            label="Install sample extension"
            size={13}
            onClick={() => void installSample()}
          />
        </div>
      </div>

      {/* High-density search bar */}
      <div className="ext-panel__search-row">
        <div className="ext-panel__search-box">
          <Search size={13} className="ext-panel__search-icon" aria-hidden />
          <input
            className="ext-panel__search-input"
            value={query}
            placeholder={
              tab === "installed"
                ? "Search installed…"
                : tab === "updates"
                ? "Search updates…"
                : "Search marketplace…"
            }
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.stopPropagation();
                setQuery("");
              }
            }}
            aria-label="Search extensions"
          />
          {query && (
            <button
              type="button"
              className="ext-panel__search-clear-btn"
              onClick={() => setQuery("")}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Compact category filter pills */}
      <div className="ext-panel__pills-row">
        <div className="ext-panel__tabs-group" role="tablist" aria-label="Extension categories">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "installed"}
            className={`ext-panel__pill ${tab === "installed" ? "ext-panel__pill--active" : ""}`}
            onClick={() => setTab("installed")}
            onKeyDown={(e) => handleTabKeyDown(e, "installed")}
          >
            <span>Installed</span>
            <span className="ext-panel__pill-count">{extensions.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === "marketplace"}
            className={`ext-panel__pill ${tab === "marketplace" ? "ext-panel__pill--active" : ""}`}
            onClick={() => {
              setTab("marketplace");
              if (registry.length === 0) void fetchRegistry();
            }}
            onKeyDown={(e) => handleTabKeyDown(e, "marketplace")}
          >
            <span>Marketplace</span>
            <span className="ext-panel__pill-count">{registry.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === "updates"}
            className={`ext-panel__pill ${tab === "updates" ? "ext-panel__pill--active" : ""} ${
              installedWithUpdates.length > 0 ? "ext-panel__pill--has-updates" : ""
            }`}
            onClick={() => setTab("updates")}
            onKeyDown={(e) => handleTabKeyDown(e, "updates")}
          >
            <span>Updates</span>
            <span className="ext-panel__pill-count">{installedWithUpdates.length}</span>
          </button>
        </div>

        {tab === "installed" && (
          <button
            type="button"
            role="checkbox"
            aria-checked={enabledOnly}
            className={`ext-panel__filter-chip ${enabledOnly ? "ext-panel__filter-chip--active" : ""}`}
            onClick={() => setEnabledOnly((v) => !v)}
            title="Filter enabled only"
          >
            <span>Enabled</span>
            <span className="ext-panel__filter-count">{enabledCount}</span>
          </button>
        )}
      </div>

      {/* Main content body */}
      <div className="ext-panel__body">
        {/* INSTALLED TAB */}
        {tab === "installed" && (
          <>
            {loading && <div className="ext-panel__loading-hint">Loading extensions…</div>}
            {error && <div className="ext-panel__banner-error">{error}</div>}

            {extensions.length === 0 && !loading ? (
              <EmptyState
                compact
                icon={Blocks}
                title="No extensions installed"
                description="Browse marketplace or install from a local folder."
                actions={[
                  { label: "Marketplace", onClick: () => setTab("marketplace"), primary: true },
                  { label: "From Folder", onClick: () => void installFromFolder() },
                ]}
              />
            ) : shownInstalled.length === 0 ? (
              enabledOnly && !query.trim() ? (
                <EmptyState
                  compact
                  icon={Blocks}
                  title="No enabled extensions"
                  description="All installed extensions are currently disabled."
                  actions={[{ label: "Show All", onClick: () => setEnabledOnly(false), primary: true }]}
                />
              ) : (
                <EmptyState
                  compact
                  icon={SearchX}
                  title="No extensions match"
                  description={<>No extensions match &ldquo;{query}&rdquo;.</>}
                  actions={query ? [{ label: "Clear Search", onClick: () => setQuery(""), primary: true }] : undefined}
                />
              )
            ) : (
              <div className="ext-panel__rows" role="list">
                {shownInstalled.map((ext) => {
                  const status = activationLabel(ext, activations.get(ext.id));
                  const regMatch = registry.find((r) => r.id === ext.id);
                  const hasUpdate = regMatch && isNewer(regMatch.version, ext.version);
                  const isGloballyEnabled = ext.globallyEnabled ?? ext.enabled;
                  const isInspected = inspectedId === ext.id;
                  const commandsCount = ext.contributes?.commands?.length ?? 0;
                  const permsCount = ext.permissions?.length ?? 0;

                  return (
                    <div
                      key={ext.id}
                      className={`ext-panel__item ${isInspected ? "ext-panel__item--inspected" : ""} ${
                        !isGloballyEnabled ? "ext-panel__item--disabled" : ""
                      }`}
                      role="listitem"
                    >
                      <div
                        className="ext-panel__row"
                        tabIndex={0}
                        aria-expanded={isInspected}
                        aria-label={`${ext.name} (v${ext.version}) - Click or press Enter to inspect details`}
                        onClick={() => toggleInspect(ext.id)}
                        onKeyDown={(e) => handleRowKeyDown(e, ext.id)}
                      >
                        <div className="ext-panel__icon-box" aria-hidden>
                          <Blocks size={14} className="ext-panel__icon" />
                        </div>

                        <div className="ext-panel__row-main">
                          <div className="ext-panel__row-head">
                            <span className="ext-panel__name" title={ext.name}>
                              {ext.name}
                            </span>
                            <span className="ext-panel__version">{`v${ext.version}`}</span>

                            {/* Status indicator */}
                            {status && (
                              <span
                                className={`ext-panel__status-dot ext-panel__status-dot--${status.tone}`}
                                title={status.title}
                                aria-label={status.text}
                              />
                            )}

                            {ext.workspaceDisabled && (
                              <span className="ext-panel__badge ext-panel__badge--warn" title="Disabled in current workspace">
                                WS Off
                              </span>
                            )}
                          </div>

                          <div className="ext-panel__row-sub">
                            <span className="ext-panel__desc-text" title={ext.description || ext.id}>
                              {ext.description || ext.id}
                            </span>

                            <div className="ext-panel__row-tags">
                              {permsCount > 0 && (
                                <span className="ext-panel__mini-tag" title={ext.permissions?.join(", ")}>
                                  {`${permsCount}p`}
                                </span>
                              )}
                              {commandsCount > 0 && (
                                <span className="ext-panel__mini-tag" title={`${commandsCount} commands`}>
                                  {`${commandsCount}c`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Row Actions */}
                        <div
                          className="ext-panel__row-actions"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          {hasUpdate && (
                            <button
                              type="button"
                              className="ext-panel__btn ext-panel__btn--update"
                              disabled={busyId === ext.id}
                              onClick={() => void handleInstallRemote(regMatch)}
                              title={`Update to v${regMatch.version}`}
                            >
                              <ArrowUpCircle size={11} /> Update
                            </button>
                          )}

                          {/* Accessible Toggle Switch */}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isGloballyEnabled}
                            aria-label={`Toggle ${ext.name}`}
                            className={`ext-panel__switch ${isGloballyEnabled ? "ext-panel__switch--checked" : ""}`}
                            disabled={busyId === ext.id}
                            onClick={() => void setEnabled(ext.id, !isGloballyEnabled)}
                            title={isGloballyEnabled ? "Disable extension" : "Enable extension"}
                          >
                            <span className="ext-panel__switch-thumb" />
                          </button>

                          {/* Expand/Inspect Toggle */}
                          <IconButton
                            icon={isInspected ? ChevronDown : ChevronRight}
                            label={isInspected ? "Collapse details" : "Inspect details"}
                            size={12}
                            className="ext-panel__chevron-btn"
                            onClick={() => toggleInspect(ext.id)}
                          />
                        </div>
                      </div>

                      {/* Detail Inspector Drawer */}
                      {isInspected && (
                        <div className="ext-panel__inspector" role="region" aria-label={`Details for ${ext.name}`}>
                          <div className="ext-panel__inspector-meta">
                            <div className="ext-panel__inspector-row">
                              <span className="ext-panel__inspector-label">ID:</span>
                              <code className="ext-panel__inspector-val">{ext.id}</code>
                              <button
                                type="button"
                                className="ext-panel__copy-btn"
                                onClick={() => void handleCopyId(ext.id)}
                                title="Copy Extension ID"
                                aria-label="Copy Extension ID"
                              >
                                {copiedId === ext.id ? <Check size={11} /> : <Copy size={11} />}
                              </button>
                            </div>

                            <div className="ext-panel__inspector-row">
                              <span className="ext-panel__inspector-label">Status:</span>
                              <span
                                className={`ext-panel__inspector-status ${
                                  !isGloballyEnabled
                                    ? "ext-panel__inspector-status--idle"
                                    : ext.workspaceDisabled
                                    ? "ext-panel__inspector-status--warn"
                                    : status
                                    ? `ext-panel__inspector-status--${status.tone}`
                                    : "ext-panel__inspector-status--ok"
                                }`}
                              >
                                {!isGloballyEnabled
                                  ? "Disabled globally"
                                  : ext.workspaceDisabled
                                  ? "Disabled for workspace"
                                  : status
                                  ? status.text
                                  : "Enabled"}
                              </span>
                            </div>

                            {ext.path && (
                              <div className="ext-panel__inspector-row">
                                <span className="ext-panel__inspector-label">Path:</span>
                                <span className="ext-panel__inspector-val ext-panel__inspector-path" title={ext.path}>
                                  {ext.path}
                                </span>
                              </div>
                            )}

                            {ext.main && (
                              <div className="ext-panel__inspector-row">
                                <span className="ext-panel__inspector-label">Entry:</span>
                                <code className="ext-panel__inspector-val">{ext.main}</code>
                              </div>
                            )}
                          </div>

                          {ext.description && (
                            <p className="ext-panel__inspector-desc">{ext.description}</p>
                          )}

                          {ext.permissions && ext.permissions.length > 0 && (
                            <div className="ext-panel__inspector-chips">
                              <span className="ext-panel__chips-label">Permissions:</span>
                              {ext.permissions.map((p) => (
                                <span key={p} className="ext-panel__perm-chip">
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}

                          {commandsCount > 0 && (
                            <div className="ext-panel__inspector-contributes">
                              <span className="ext-panel__chips-label">{`Commands (${commandsCount}):`}</span>
                              <div className="ext-panel__commands-list">
                                {ext.contributes?.commands?.map((c) => (
                                  <div key={c.id} className="ext-panel__command-item">
                                    <span className="ext-panel__command-title">{c.title}</span>
                                    <code className="ext-panel__command-id">{c.id}</code>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Inspector Action Footer */}
                          <div className="ext-panel__inspector-actions">
                            <div className="ext-panel__inspector-btn-group">
                              <button
                                type="button"
                                className="ext-panel__btn"
                                disabled={busyId === ext.id}
                                onClick={() => void setEnabled(ext.id, !isGloballyEnabled)}
                              >
                                {isGloballyEnabled ? "Disable (Global)" : "Enable (Global)"}
                              </button>

                              <button
                                type="button"
                                className={`ext-panel__btn ${ext.workspaceDisabled ? "ext-panel__btn--warn" : ""}`}
                                onClick={() => toggleWorkspaceEnablement(ext.id)}
                              >
                                {ext.workspaceDisabled ? "Enable for Workspace" : "Disable for Workspace"}
                              </button>
                            </div>

                            <button
                              type="button"
                              className="ext-panel__btn ext-panel__btn--danger"
                              disabled={busyId === ext.id}
                              onClick={() => void handleUninstall(ext.id)}
                              title="Uninstall extension"
                            >
                              <Trash2 size={11} /> Uninstall
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* MARKETPLACE TAB */}
        {tab === "marketplace" && (
          <>
            {registryLoading && <div className="ext-panel__loading-hint">Fetching marketplace index…</div>}
            {registryError && (
              <div className="ext-panel__banner-error-wrap">
                <span className="ext-panel__banner-error">{registryError}</span>
                <button type="button" className="ext-panel__btn" onClick={() => void fetchRegistry()}>
                  Retry
                </button>
              </div>
            )}

            {registry.length === 0 && !registryLoading && !registryError ? (
              <EmptyState
                compact
                icon={Globe}
                title="Marketplace empty"
                description="No remote extensions found in registry."
                actions={[{ label: "Retry", onClick: () => void fetchRegistry(), primary: true }]}
              />
            ) : shownMarketplace.length === 0 && !registryLoading ? (
              <EmptyState
                compact
                icon={SearchX}
                title="No matches"
                description={<>No marketplace extensions match &ldquo;{query}&rdquo;.</>}
                actions={query ? [{ label: "Clear Search", onClick: () => setQuery(""), primary: true }] : undefined}
              />
            ) : (
              <div className="ext-panel__rows" role="list">
                {shownMarketplace.map((item) => {
                  const installed = extensions.find((e) => e.id === item.id);
                  const hasUpdate = installed && isNewer(item.version, installed.version);
                  const isInspected = inspectedId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`ext-panel__item ${isInspected ? "ext-panel__item--inspected" : ""}`}
                      role="listitem"
                    >
                      <div
                        className="ext-panel__row"
                        tabIndex={0}
                        aria-expanded={isInspected}
                        aria-label={`${item.name} (v${item.version}) - Click or press Enter to inspect details`}
                        onClick={() => toggleInspect(item.id)}
                        onKeyDown={(e) => handleRowKeyDown(e, item.id)}
                      >
                        <div className="ext-panel__icon-box" aria-hidden>
                          <Globe size={14} className="ext-panel__icon" />
                        </div>

                        <div className="ext-panel__row-main">
                          <div className="ext-panel__row-head">
                            <span className="ext-panel__name" title={item.name}>
                              {item.name}
                            </span>
                            <span className="ext-panel__version">{`v${item.version}`}</span>
                            {installed && (
                              <span className="ext-panel__badge ext-panel__badge--installed">
                                Installed
                              </span>
                            )}
                          </div>

                          <div className="ext-panel__row-sub">
                            <span className="ext-panel__desc-text" title={item.description || item.id}>
                              {item.description || item.id}
                            </span>
                          </div>
                        </div>

                        <div
                          className="ext-panel__row-actions"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          {installed ? (
                            <>
                              {hasUpdate ? (
                                <button
                                  type="button"
                                  className="ext-panel__btn ext-panel__btn--update"
                                  disabled={busyId === item.id}
                                  onClick={() => void handleInstallRemote(item)}
                                >
                                  <ArrowUpCircle size={11} /> Update
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="ext-panel__btn ext-panel__btn--danger"
                                title="Uninstall extension"
                                disabled={busyId === item.id}
                                onClick={() => void handleUninstall(item.id)}
                              >
                                <Trash2 size={11} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="ext-panel__btn ext-panel__btn--primary"
                              disabled={busyId === item.id}
                              onClick={() => void handleInstallRemote(item)}
                            >
                              <Download size={11} /> Install
                            </button>
                          )}

                          <IconButton
                            icon={isInspected ? ChevronDown : ChevronRight}
                            label={isInspected ? "Collapse details" : "Inspect details"}
                            size={12}
                            className="ext-panel__chevron-btn"
                            onClick={() => toggleInspect(item.id)}
                          />
                        </div>
                      </div>

                      {isInspected && (
                        <div className="ext-panel__inspector" role="region" aria-label={`Details for ${item.name}`}>
                          <div className="ext-panel__inspector-meta">
                            <div className="ext-panel__inspector-row">
                              <span className="ext-panel__inspector-label">ID:</span>
                              <code className="ext-panel__inspector-val">{item.id}</code>
                              <button
                                type="button"
                                className="ext-panel__copy-btn"
                                onClick={() => void handleCopyId(item.id)}
                                title="Copy Extension ID"
                                aria-label="Copy Extension ID"
                              >
                                {copiedId === item.id ? <Check size={11} /> : <Copy size={11} />}
                              </button>
                            </div>
                            <div className="ext-panel__inspector-row">
                              <span className="ext-panel__inspector-label">Version:</span>
                              <span className="ext-panel__inspector-val">{`v${item.version}`}</span>
                            </div>
                            {installed && (
                              <div className="ext-panel__inspector-row">
                                <span className="ext-panel__inspector-label">Installed:</span>
                                <span className="ext-panel__inspector-val">{`v${installed.version}`}</span>
                              </div>
                            )}
                          </div>

                          {item.description && (
                            <p className="ext-panel__inspector-desc">{item.description}</p>
                          )}

                          <div className="ext-panel__inspector-actions">
                            {installed ? (
                              <button
                                type="button"
                                className="ext-panel__btn ext-panel__btn--danger"
                                disabled={busyId === item.id}
                                onClick={() => void handleUninstall(item.id)}
                              >
                                <Trash2 size={11} /> Uninstall
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="ext-panel__btn ext-panel__btn--primary"
                                disabled={busyId === item.id}
                                onClick={() => void handleInstallRemote(item)}
                              >
                                <Download size={11} /> Install
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* UPDATES TAB */}
        {tab === "updates" && (
          <>
            {installedWithUpdates.length > 0 && (
              <div className="ext-panel__updates-banner">
                <span>{`${installedWithUpdates.length} update${installedWithUpdates.length > 1 ? "s" : ""} available`}</span>
                <button
                  type="button"
                  className="ext-panel__btn ext-panel__btn--update"
                  disabled={Boolean(busyId) || updatingAll}
                  onClick={() => void handleUpdateAll()}
                >
                  <ArrowUpCircle size={11} /> {updatingAll ? "Updating…" : "Update All"}
                </button>
              </div>
            )}

            {installedWithUpdates.length === 0 ? (
              <EmptyState
                compact
                icon={CheckCircle2}
                title="All extensions up to date"
                description="Installed extensions are running their latest versions."
              />
            ) : shownUpdates.length === 0 ? (
              <EmptyState
                compact
                icon={SearchX}
                title="No matches"
                description={<>No updates match &ldquo;{query}&rdquo;.</>}
                actions={query ? [{ label: "Clear Search", onClick: () => setQuery(""), primary: true }] : undefined}
              />
            ) : (
              <div className="ext-panel__rows" role="list">
                {shownUpdates.map((ext) => {
                  const regMatch = registry.find((r) => r.id === ext.id);
                  if (!regMatch) return null;
                  const isInspected = inspectedId === ext.id;

                  return (
                    <div
                      key={ext.id}
                      className={`ext-panel__item ${isInspected ? "ext-panel__item--inspected" : ""}`}
                      role="listitem"
                    >
                      <div
                        className="ext-panel__row"
                        tabIndex={0}
                        aria-expanded={isInspected}
                        aria-label={`${ext.name} (v${ext.version}) - Click or press Enter to inspect details`}
                        onClick={() => toggleInspect(ext.id)}
                        onKeyDown={(e) => handleRowKeyDown(e, ext.id)}
                      >
                        <div className="ext-panel__icon-box" aria-hidden>
                          <ArrowUpCircle size={14} className="ext-panel__icon ext-panel__icon--update" />
                        </div>

                        <div className="ext-panel__row-main">
                          <div className="ext-panel__row-head">
                            <span className="ext-panel__name" title={ext.name}>
                              {ext.name}
                            </span>
                            <span className="ext-panel__version">{`v${ext.version}`}</span>
                            <span className="ext-panel__badge ext-panel__badge--new">
                              {`→ v${regMatch.version}`}
                            </span>
                          </div>

                          <div className="ext-panel__row-sub">
                            <span className="ext-panel__desc-text" title={ext.description || ext.id}>
                              {ext.description || ext.id}
                            </span>
                          </div>
                        </div>

                        <div
                          className="ext-panel__row-actions"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="ext-panel__btn ext-panel__btn--update"
                            disabled={busyId === ext.id || updatingAll}
                            onClick={() => void handleInstallRemote(regMatch)}
                          >
                            <ArrowUpCircle size={11} /> Update
                          </button>
                          <IconButton
                            icon={isInspected ? ChevronDown : ChevronRight}
                            label={isInspected ? "Collapse details" : "Inspect details"}
                            size={12}
                            className="ext-panel__chevron-btn"
                            onClick={() => toggleInspect(ext.id)}
                          />
                        </div>
                      </div>

                      {isInspected && (
                        <div className="ext-panel__inspector" role="region" aria-label={`Details for ${ext.name}`}>
                          <div className="ext-panel__inspector-meta">
                            <div className="ext-panel__inspector-row">
                              <span className="ext-panel__inspector-label">Current:</span>
                              <span className="ext-panel__inspector-val">{`v${ext.version}`}</span>
                            </div>
                            <div className="ext-panel__inspector-row">
                              <span className="ext-panel__inspector-label">Available:</span>
                              <span className="ext-panel__inspector-val">{`v${regMatch.version}`}</span>
                            </div>
                            <div className="ext-panel__inspector-row">
                              <span className="ext-panel__inspector-label">ID:</span>
                              <code className="ext-panel__inspector-val">{ext.id}</code>
                              <button
                                type="button"
                                className="ext-panel__copy-btn"
                                onClick={() => void handleCopyId(ext.id)}
                                title="Copy Extension ID"
                                aria-label="Copy Extension ID"
                              >
                                {copiedId === ext.id ? <Check size={11} /> : <Copy size={11} />}
                              </button>
                            </div>
                          </div>

                          {regMatch.description && (
                            <p className="ext-panel__inspector-desc">{regMatch.description}</p>
                          )}

                          <div className="ext-panel__inspector-actions">
                            <button
                              type="button"
                              className="ext-panel__btn ext-panel__btn--update"
                              disabled={busyId === ext.id || updatingAll}
                              onClick={() => void handleInstallRemote(regMatch)}
                            >
                              <ArrowUpCircle size={11} /> {`Update to v${regMatch.version}`}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
