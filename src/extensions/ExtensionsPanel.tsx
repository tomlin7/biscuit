import { useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowUpCircle,
  Blocks,
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

function activationLabel(ext: ExtensionManifest, record: ActivationRecord | undefined) {
  if (!ext.enabled || !ext.main) return null;
  if (!record) return { text: "Not activated", title: "Starts on its first activation event", tone: "idle" };
  if (record.status === "activating") return { text: "Activating…", title: record.reason, tone: "idle" };
  if (record.status === "failed") return { text: "Failed", title: record.error ?? "", tone: "error" };
  return { text: `Active · ${record.ms ?? 0} ms`, title: `Activated by ${record.reason}`, tone: "ok" };
}

function isNewer(remote: string, local: string): boolean {
  const parse = (v: string) => v.split(".").map((n) => parseInt(n, 10) || 0);
  const [r1, r2, r3] = parse(remote);
  const [l1, l2, l3] = parse(local);
  if (r1 !== l1) return r1 > l1;
  if (r2 !== l2) return r2 > l2;
  return (r3 ?? 0) > (l3 ?? 0);
}

export function ExtensionsPanel() {
  const activations = useSyncExternalStore(extensionHost.subscribe, extensionHost.getRecords);
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
    installSample,
    installFromFolder,
    installFromRegistry,
    scaffoldInFolder,
    uninstall,
  } = useExtensions();

  const [tab, setTab] = useState<"installed" | "marketplace">("installed");
  const [query, setQuery] = useState("");
  const [enabledOnly, setEnabledOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const enabledCount = useMemo(
    () => extensions.filter((e) => e.enabled).length,
    [extensions],
  );

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
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ext-panel">
      <div className="ext-panel__toolbar">
        <div className="ext-panel__tabs">
          <button
            type="button"
            className={`ext-panel__tab ${tab === "installed" ? "ext-panel__tab--active" : ""}`}
            onClick={() => setTab("installed")}
          >
            Installed <span className="ext-panel__tab-badge">{extensions.length}</span>
          </button>
          <button
            type="button"
            className={`ext-panel__tab ${tab === "marketplace" ? "ext-panel__tab--active" : ""}`}
            onClick={() => {
              setTab("marketplace");
              if (registry.length === 0) void fetchRegistry();
            }}
          >
            Marketplace <span className="ext-panel__tab-badge">{registry.length}</span>
          </button>
        </div>
        <div className="ext-panel__actions">
          <IconButton
            icon={RefreshCw}
            label={tab === "installed" ? "Refresh extensions" : "Refresh marketplace"}
            size={13}
            onClick={() => {
              if (tab === "installed") void refresh();
              else void fetchRegistry();
            }}
          />
          {tab === "installed" && (
            <>
              <IconButton
                icon={FolderDown}
                label="Install from folder"
                size={13}
                onClick={() => void installFromFolder()}
              />
              <IconButton
                icon={Plus}
                label="Create new extension"
                size={13}
                onClick={() => void scaffoldInFolder()}
              />
              <IconButton
                icon={Sparkles}
                label="Install sample extension"
                size={13}
                onClick={() => void installSample()}
              />
            </>
          )}
        </div>
      </div>

      <div className="ext-panel__search-bar">
        <div className="ext-panel__search-wrap">
          <Search size={13} className="ext-panel__search-icon" aria-hidden />
          <input
            className="ext-panel__search"
            value={query}
            placeholder={tab === "installed" ? "Search installed extensions…" : "Search marketplace…"}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search extensions"
          />
          {query && (
            <button
              type="button"
              className="ext-panel__search-clear"
              onClick={() => setQuery("")}
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {tab === "installed" && (
          <button
            type="button"
            className={`ext-panel__chip ${enabledOnly ? "ext-panel__chip--active" : ""}`}
            aria-pressed={enabledOnly}
            onClick={() => setEnabledOnly((value) => !value)}
          >
            Enabled ({enabledCount})
          </button>
        )}
      </div>

      <div className="ext-panel__body">
        {tab === "installed" ? (
          <>
            {loading && <p className="ext-panel__hint">Loading extensions…</p>}
            {error && <p className="ext-panel__error">{error}</p>}
            {extensions.length === 0 && !loading ? (
              <EmptyState
                compact
                icon={Blocks}
                title="No extensions installed"
                description="Browse the marketplace or install one from a folder."
                actions={[
                  { label: "Browse Marketplace", onClick: () => setTab("marketplace"), primary: true },
                  { label: "From Folder…", onClick: () => void installFromFolder() },
                ]}
              />
            ) : shownInstalled.length === 0 ? (
              <EmptyState
                compact
                icon={SearchX}
                title="No matches"
                description={<>No installed extensions match &ldquo;{query}&rdquo;.</>}
              />
            ) : (
              <ul className="ext-panel__list">
                {shownInstalled.map((ext) => {
                  const status = activationLabel(ext, activations.get(ext.id));
                  const registryMatch = registry.find((r) => r.id === ext.id);
                  const hasUpdate = registryMatch && isNewer(registryMatch.version, ext.version);

                  return (
                    <li key={ext.id} className="ext-panel__card">
                      <div className="ext-panel__card-top">
                        <div className="ext-panel__icon-box">
                          <Blocks size={16} className="ext-panel__icon" />
                        </div>
                        <div className="ext-panel__meta">
                          <div className="ext-panel__name-row">
                            <strong className="ext-panel__name">{ext.name}</strong>
                            <span className="ext-panel__version">v{ext.version}</span>
                            {hasUpdate && (
                              <button
                                type="button"
                                className="ext-panel__btn ext-panel__btn--update"
                                disabled={busyId === ext.id}
                                onClick={() => void handleInstallRemote(registryMatch)}
                                title={`Update to v${registryMatch.version}`}
                              >
                                <ArrowUpCircle size={11} /> Update v{registryMatch.version}
                              </button>
                            )}
                          </div>
                          <span className="ext-panel__id">{ext.id}</span>
                        </div>
                      </div>

                      <p className="ext-panel__desc">
                        {ext.description || "No description provided."}
                      </p>

                      <div className="ext-panel__card-footer">
                        {status && (
                          <span
                            className={`ext-panel__status ext-panel__status--${status.tone}`}
                            title={status.title}
                          >
                            {status.text}
                          </span>
                        )}
                        <div className="ext-panel__card-actions">
                          <button
                            type="button"
                            className="ext-panel__btn ext-panel__btn--danger"
                            title="Uninstall extension"
                            disabled={busyId === ext.id}
                            onClick={() => void handleUninstall(ext.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                          <label className="ext-panel__toggle">
                            <input
                              type="checkbox"
                              checked={ext.enabled}
                              onChange={(e) => void setEnabled(ext.id, e.target.checked)}
                            />
                            <span className="ext-panel__toggle-label">
                              {ext.enabled ? "Enabled" : "Disabled"}
                            </span>
                          </label>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <>
            {registryLoading && <p className="ext-panel__hint">Fetching marketplace index…</p>}
            {registryError && (
              <div className="ext-panel__error-wrap">
                <p className="ext-panel__error">{registryError}</p>
                <button
                  type="button"
                  className="ext-panel__btn"
                  onClick={() => void fetchRegistry()}
                >
                  Retry
                </button>
              </div>
            )}
            {registry.length === 0 && !registryLoading && !registryError ? (
              <EmptyState
                compact
                icon={Globe}
                title="Marketplace empty"
                description="No remote extensions found at the registry URL."
                actions={[
                  { label: "Retry", onClick: () => void fetchRegistry(), primary: true },
                ]}
              />
            ) : shownMarketplace.length === 0 && !registryLoading ? (
              <EmptyState
                compact
                icon={SearchX}
                title="No matches"
                description={<>No marketplace extensions match &ldquo;{query}&rdquo;.</>}
              />
            ) : (
              <ul className="ext-panel__list">
                {shownMarketplace.map((item) => {
                  const installed = extensions.find((e) => e.id === item.id);
                  const hasUpdate = installed && isNewer(item.version, installed.version);

                  return (
                    <li key={item.id} className="ext-panel__card">
                      <div className="ext-panel__card-top">
                        <div className="ext-panel__icon-box">
                          <Globe size={16} className="ext-panel__icon" />
                        </div>
                        <div className="ext-panel__meta">
                          <div className="ext-panel__name-row">
                            <strong className="ext-panel__name">{item.name}</strong>
                            <span className="ext-panel__version">v{item.version}</span>
                          </div>
                          <span className="ext-panel__id">{item.id}</span>
                        </div>
                      </div>

                      <p className="ext-panel__desc">
                        {item.description || "No description provided."}
                      </p>

                      <div className="ext-panel__card-footer">
                        {installed && (
                          <span className="ext-panel__installed-badge">
                            Installed (v{installed.version})
                          </span>
                        )}
                        <div className="ext-panel__card-actions">
                          {installed ? (
                            <>
                              {hasUpdate ? (
                                <button
                                  type="button"
                                  className="ext-panel__btn ext-panel__btn--update"
                                  disabled={busyId === item.id}
                                  onClick={() => void handleInstallRemote(item)}
                                >
                                  <ArrowUpCircle size={12} /> Update
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="ext-panel__btn ext-panel__btn--danger"
                                title="Uninstall extension"
                                disabled={busyId === item.id}
                                onClick={() => void handleUninstall(item.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="ext-panel__btn ext-panel__btn--primary"
                              disabled={busyId === item.id}
                              onClick={() => void handleInstallRemote(item)}
                            >
                              <Download size={12} /> Install
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
