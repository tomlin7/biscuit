import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  FileCode,
  FileText,
  Loader2,
  RotateCcw,
  Save,
  Search,
  X,
} from "lucide-react";
import { basename } from "../workspace/path";
import { IconButton } from "../ui/IconButton";
import { useWorkspace } from "../workspace/WorkspaceContext";
import {
  formatFileSize,
  formatHexByte,
  formatHexOffset,
  parseOffsetInput,
  readIntegerValues,
  searchBuffer,
  toAsciiChar,
  type ByteInspectorData,
} from "./hexUtils";
import "./HexView.css";

const BYTES_PER_ROW = 16;
const ROWS_PER_PAGE = 256;
const BYTES_PER_PAGE = BYTES_PER_ROW * ROWS_PER_PAGE; // 4096 bytes

interface Props {
  path: string;
}

export function HexView({ path }: Props) {
  const { setLanguageAt } = useWorkspace();
  const [data, setData] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [edits, setEdits] = useState<Map<number, number>>(new Map());
  const [page, setPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>("1");
  const [gotoInput, setGotoInput] = useState<string>("");
  const [selectedOffset, setSelectedOffset] = useState<number | null>(null);
  const [hoverOffset, setHoverOffset] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Search state
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchMode, setSearchMode] = useState<"text" | "hex">("text");
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [matchIndex, setMatchIndex] = useState<number>(0);

  // Partial nibble input tracking for typing hex
  const hexNibbleRef = useRef<{ offset: number; highNibble: number } | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEdits(new Map());
    setSelectedOffset(null);
    setPage(1);
    setPageInput("1");
    hexNibbleRef.current = null;

    try {
      let bytes: Uint8Array;
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        bytes = await readFile(path);
      } else {
        const res = await fetch(convertFileSrc(path));
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to read binary file`);
        const buf = await res.arrayBuffer();
        bytes = new Uint8Array(buf);
      }
      setData(bytes);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totalBytes = data?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalBytes / BYTES_PER_PAGE));

  const pageStartOffset = (page - 1) * BYTES_PER_PAGE;
  const pageEndOffset = Math.min(totalBytes, page * BYTES_PER_PAGE);

  const getByte = useCallback(
    (offset: number): number => {
      if (edits.has(offset)) return edits.get(offset)!;
      return data?.[offset] ?? 0;
    },
    [data, edits],
  );

  const changeByte = useCallback((offset: number, value: number) => {
    setEdits((prev) => {
      const next = new Map(prev);
      next.set(offset, value & 0xff);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!data || edits.size === 0) return;
    try {
      const nextData = new Uint8Array(data.length);
      nextData.set(data);
      for (const [offset, value] of edits.entries()) {
        nextData[offset] = value;
      }
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        await writeFile(path, nextData);
      }
      setData(nextData);
      setEdits(new Map());
    } catch (err) {
      alert(`Failed to save binary file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [data, edits, path]);

  const handleDiscard = useCallback(() => {
    setEdits(new Map());
    hexNibbleRef.current = null;
  }, []);

  const goToPage = useCallback(
    (targetPage: number) => {
      const clamped = Math.max(1, Math.min(totalPages, targetPage));
      setPage(clamped);
      setPageInput(String(clamped));
    },
    [totalPages],
  );

  const goToOffset = useCallback(
    (offset: number) => {
      const targetPage = Math.floor(offset / BYTES_PER_PAGE) + 1;
      goToPage(targetPage);
      setSelectedOffset(offset);
      hexNibbleRef.current = null;
    },
    [goToPage],
  );

  const handleGotoSubmit = useCallback(() => {
    if (!data) return;
    const offset = parseOffsetInput(gotoInput, data.length - 1);
    if (offset !== null) {
      goToOffset(offset);
      setGotoInput("");
    }
  }, [data, gotoInput, goToOffset]);

  // Search logic
  useEffect(() => {
    if (!data || !searchOpen || !searchQuery.trim()) {
      setSearchMatches([]);
      setMatchIndex(0);
      return;
    }
    const matches = searchBuffer(data, searchQuery, searchMode);
    setSearchMatches(matches);
    setMatchIndex(0);
    if (matches.length > 0) {
      goToOffset(matches[0]);
    }
  }, [data, searchOpen, searchQuery, searchMode, goToOffset]);

  const nextMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const nextIdx = (matchIndex + 1) % searchMatches.length;
    setMatchIndex(nextIdx);
    goToOffset(searchMatches[nextIdx]);
  }, [searchMatches, matchIndex, goToOffset]);

  const prevMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const prevIdx = (matchIndex - 1 + searchMatches.length) % searchMatches.length;
    setMatchIndex(prevIdx);
    goToOffset(searchMatches[prevIdx]);
  }, [searchMatches, matchIndex, goToOffset]);

  const matchSet = useMemo(() => new Set(searchMatches), [searchMatches]);

  // Copy helper
  const copyValue = useCallback((text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  }, []);

  // Keyboard navigation & hex typing
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSave();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }
      if (e.key === "Escape") {
        if (searchOpen) setSearchOpen(false);
        else setSelectedOffset(null);
        hexNibbleRef.current = null;
        return;
      }
      if (selectedOffset === null || !data) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const next = Math.max(0, selectedOffset - 1);
        goToOffset(next);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = Math.min(data.length - 1, selectedOffset + 1);
        goToOffset(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.max(0, selectedOffset - BYTES_PER_ROW);
        goToOffset(next);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(data.length - 1, selectedOffset + BYTES_PER_ROW);
        goToOffset(next);
      } else if (e.key === "PageDown") {
        e.preventDefault();
        goToPage(page + 1);
      } else if (e.key === "PageUp") {
        e.preventDefault();
        goToPage(page - 1);
      } else if (/^[0-9a-fA-F]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Hex digit input
        e.preventDefault();
        const nibble = parseInt(e.key, 16);
        const currentNibble = hexNibbleRef.current;
        if (currentNibble && currentNibble.offset === selectedOffset) {
          // Second nibble: combine and write full byte
          const fullByte = (currentNibble.highNibble << 4) | nibble;
          changeByte(selectedOffset, fullByte);
          hexNibbleRef.current = null;
          // Advance to next byte
          if (selectedOffset < data.length - 1) {
            goToOffset(selectedOffset + 1);
          }
        } else {
          // First nibble: store high nibble
          hexNibbleRef.current = { offset: selectedOffset, highNibble: nibble };
          const partialByte = (nibble << 4) | (getByte(selectedOffset) & 0x0f);
          changeByte(selectedOffset, partialByte);
        }
      }
    },
    [selectedOffset, data, handleSave, searchOpen, goToOffset, goToPage, page, changeByte, getByte],
  );

  // Inspector data for active byte
  const activeOffset = selectedOffset ?? hoverOffset;
  const inspector: ByteInspectorData | null = useMemo(() => {
    if (activeOffset === null || !data) return null;
    return readIntegerValues(data, activeOffset);
  }, [activeOffset, data]);

  if (loading) {
    return (
      <div className="hex-view">
        <div className="hex-view__loading">
          <Loader2 size={24} className="animate-spin" />
          <span>Reading binary file…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hex-view">
        <div className="hex-view__error">
          <AlertCircle size={24} className="text-danger" />
          <span>Failed to open binary file</span>
          <p className="hex-view__error-msg">{error}</p>
          <button type="button" className="hex-view__btn-text" onClick={() => void loadData()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="hex-view">
        <div className="hex-view__toolbar">
          <div className="hex-view__file-meta">
            <span className="hex-view__file-name">{basename(path)}</span>
            <span className="hex-view__file-size">0 B</span>
          </div>
          <div className="hex-view__spacer" />
          <button
            type="button"
            className="hex-view__btn-text"
            onClick={() => setLanguageAt(path, "plaintext")}
          >
            <FileText size={12} />
            <span>Open as Text</span>
          </button>
        </div>
        <div className="hex-view__empty">
          <span>Empty binary file (0 bytes)</span>
        </div>
      </div>
    );
  }

  // Calculate rows for current page
  const rows: { offset: number; bytes: number[] }[] = [];
  for (let offset = pageStartOffset; offset < pageEndOffset; offset += BYTES_PER_ROW) {
    const rowBytes: number[] = [];
    for (let i = 0; i < BYTES_PER_ROW && offset + i < totalBytes; i++) {
      rowBytes.push(getByte(offset + i));
    }
    rows.push({ offset, bytes: rowBytes });
  }

  return (
    <div className="hex-view" tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Header Toolbar */}
      <div className="hex-view__toolbar">
        <div className="hex-view__file-meta">
          <FileCode size={14} className="text-accent" />
          <span className="hex-view__file-name">{basename(path)}</span>
          {edits.size > 0 && <span className="hex-view__dirty-dot" title="Unsaved changes" />}
          <span className="hex-view__file-size">{formatFileSize(totalBytes)}</span>
          <span className="hex-view__file-size">
            0x{formatHexOffset(pageStartOffset)} - 0x{formatHexOffset(Math.max(0, pageEndOffset - 1))}
          </span>
        </div>

        <div className="hex-view__separator" />

        {/* Paging controls */}
        <div className="hex-view__toolbar-section">
          <IconButton
            icon={ChevronsLeft}
            label="First page"
            size={13}
            disabled={page <= 1}
            onClick={() => goToPage(1)}
          />
          <IconButton
            icon={ChevronLeft}
            label="Previous page"
            size={13}
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          />
          <div className="hex-view__page-indicator">
            <input
              type="text"
              aria-label="Page number"
              className="hex-view__page-input"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const num = parseInt(pageInput, 10);
                  if (!isNaN(num)) goToPage(num);
                }
              }}
            />
            <span className="hex-view__page-total">/ {totalPages}</span>
          </div>
          <IconButton
            icon={ChevronRight}
            label="Next page"
            size={13}
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          />
          <IconButton
            icon={ChevronsRight}
            label="Last page"
            size={13}
            disabled={page >= totalPages}
            onClick={() => goToPage(totalPages)}
          />
        </div>

        <div className="hex-view__separator" />

        {/* Go to offset */}
        <div className="hex-view__goto-box">
          <input
            type="text"
            className="hex-view__goto-input"
            placeholder="Go to offset (0x…)"
            value={gotoInput}
            onChange={(e) => setGotoInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleGotoSubmit();
            }}
          />
        </div>

        <div className="hex-view__spacer" />

        {/* Actions */}
        <div className="hex-view__toolbar-section">
          <IconButton
            icon={Search}
            label="Search bytes"
            size={13}
            onClick={() => setSearchOpen((prev) => !prev)}
          />

          {edits.size > 0 && (
            <>
              <button
                type="button"
                className="hex-view__btn-text hex-view__btn-text--save"
                onClick={() => void handleSave()}
                title="Save changes (Ctrl+S)"
              >
                <Save size={12} />
                <span>Save ({edits.size})</span>
              </button>
              <IconButton
                icon={RotateCcw}
                label="Discard edits"
                size={13}
                onClick={handleDiscard}
              />
            </>
          )}

          <button
            type="button"
            className="hex-view__btn-text"
            onClick={() => setLanguageAt(path, "plaintext")}
            title="Switch to Monaco text editor"
          >
            <FileText size={12} />
            <span>Open as Text</span>
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      {searchOpen && (
        <div className="hex-view__search-bar">
          <button
            type="button"
            className={`hex-view__search-mode-btn ${
              searchMode === "text" ? "hex-view__search-mode-btn--active" : ""
            }`}
            onClick={() => setSearchMode("text")}
          >
            Text
          </button>
          <button
            type="button"
            className={`hex-view__search-mode-btn ${
              searchMode === "hex" ? "hex-view__search-mode-btn--active" : ""
            }`}
            onClick={() => setSearchMode("hex")}
          >
            Hex
          </button>
          <input
            type="text"
            className="hex-view__search-input"
            placeholder={searchMode === "text" ? "Find text string…" : "Find hex bytes (e.g. 4D 5A)…"}
            value={searchQuery}
            autoFocus
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.shiftKey) prevMatch();
                else nextMatch();
              }
            }}
          />
          {searchMatches.length > 0 ? (
            <span className="hex-view__search-count">
              {matchIndex + 1} of {searchMatches.length}
            </span>
          ) : searchQuery.trim() ? (
            <span className="hex-view__search-count">No matches</span>
          ) : null}
          <IconButton
            icon={ChevronLeft}
            label="Previous match (Shift+Enter)"
            size={13}
            disabled={searchMatches.length === 0}
            onClick={prevMatch}
          />
          <IconButton
            icon={ChevronRight}
            label="Next match (Enter)"
            size={13}
            disabled={searchMatches.length === 0}
            onClick={nextMatch}
          />
          <IconButton
            icon={X}
            label="Close search (Esc)"
            size={13}
            onClick={() => setSearchOpen(false)}
          />
        </div>
      )}

      {/* Hex Grid Content */}
      <div className="hex-view__content" ref={contentRef}>
        <div className="hex-view__grid">
          {/* Header row */}
          <div className="hex-view__row hex-view__header-row">
            <span className="hex-view__col-offset">Offset (h)</span>
            <div className="hex-view__bytes-group">
              <div className="hex-view__bytes-subgroup">
                {Array.from({ length: 8 }, (_, i) => (
                  <span key={i} className="hex-view__byte-cell">
                    {formatHexByte(i)}
                  </span>
                ))}
              </div>
              <div className="hex-view__bytes-subgroup">
                {Array.from({ length: 8 }, (_, i) => (
                  <span key={i + 8} className="hex-view__byte-cell">
                    {formatHexByte(i + 8)}
                  </span>
                ))}
              </div>
            </div>
            <div className="hex-view__text-group">
              <span>Decoded Text</span>
            </div>
          </div>

          {/* Data rows */}
          {rows.map(({ offset: rowOffset, bytes }) => (
            <div key={rowOffset} className="hex-view__row">
              <span className="hex-view__col-offset">{formatHexOffset(rowOffset)}</span>

              <div className="hex-view__bytes-group">
                {/* First 8 bytes */}
                <div className="hex-view__bytes-subgroup">
                  {Array.from({ length: 8 }, (_, i) => {
                    const byteOffset = rowOffset + i;
                    if (i >= bytes.length) {
                      return <span key={i} className="hex-view__byte-cell" />;
                    }
                    const b = bytes[i];
                    const isSelected = selectedOffset === byteOffset;
                    const isHovered = hoverOffset === byteOffset;
                    const isEdited = edits.has(byteOffset);
                    const isMatch = matchSet.has(byteOffset);
                    const isZero = b === 0;

                    let cls = "hex-view__byte-cell";
                    if (isZero) cls += " hex-view__byte-cell--zero";
                    if (isSelected) cls += " hex-view__byte-cell--selected";
                    else if (isHovered) cls += " hex-view__byte-cell--hover";
                    if (isEdited) cls += " hex-view__byte-cell--edited";
                    if (isMatch) cls += " hex-view__byte-cell--match";

                    return (
                      <span
                        key={i}
                        className={cls}
                        onMouseEnter={() => setHoverOffset(byteOffset)}
                        onMouseLeave={() => setHoverOffset(null)}
                        onClick={() => {
                          setSelectedOffset(byteOffset);
                          hexNibbleRef.current = null;
                        }}
                      >
                        {formatHexByte(b)}
                      </span>
                    );
                  })}
                </div>

                {/* Second 8 bytes */}
                <div className="hex-view__bytes-subgroup">
                  {Array.from({ length: 8 }, (_, i) => {
                    const byteIndex = i + 8;
                    const byteOffset = rowOffset + byteIndex;
                    if (byteIndex >= bytes.length) {
                      return <span key={byteIndex} className="hex-view__byte-cell" />;
                    }
                    const b = bytes[byteIndex];
                    const isSelected = selectedOffset === byteOffset;
                    const isHovered = hoverOffset === byteOffset;
                    const isEdited = edits.has(byteOffset);
                    const isMatch = matchSet.has(byteOffset);
                    const isZero = b === 0;

                    let cls = "hex-view__byte-cell";
                    if (isZero) cls += " hex-view__byte-cell--zero";
                    if (isSelected) cls += " hex-view__byte-cell--selected";
                    else if (isHovered) cls += " hex-view__byte-cell--hover";
                    if (isEdited) cls += " hex-view__byte-cell--edited";
                    if (isMatch) cls += " hex-view__byte-cell--match";

                    return (
                      <span
                        key={byteIndex}
                        className={cls}
                        onMouseEnter={() => setHoverOffset(byteOffset)}
                        onMouseLeave={() => setHoverOffset(null)}
                        onClick={() => {
                          setSelectedOffset(byteOffset);
                          hexNibbleRef.current = null;
                        }}
                      >
                        {formatHexByte(b)}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Decoded Text (ASCII) */}
              <div className="hex-view__text-group">
                {bytes.map((b, i) => {
                  const byteOffset = rowOffset + i;
                  const isSelected = selectedOffset === byteOffset;
                  const isHovered = hoverOffset === byteOffset;
                  const isEdited = edits.has(byteOffset);
                  const isMatch = matchSet.has(byteOffset);
                  const isPrintable = b >= 32 && b <= 126;

                  let cls = "hex-view__char-cell";
                  if (!isPrintable) cls += " hex-view__char-cell--nonprintable";
                  if (isSelected) cls += " hex-view__char-cell--selected";
                  else if (isHovered) cls += " hex-view__char-cell--hover";
                  if (isEdited) cls += " hex-view__char-cell--edited";
                  if (isMatch) cls += " hex-view__char-cell--match";

                  return (
                    <span
                      key={i}
                      className={cls}
                      onMouseEnter={() => setHoverOffset(byteOffset)}
                      onMouseLeave={() => setHoverOffset(null)}
                      onClick={() => {
                        setSelectedOffset(byteOffset);
                        hexNibbleRef.current = null;
                      }}
                    >
                      {toAsciiChar(b)}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inspector Bar */}
      {inspector && (
        <div className="hex-view__inspector">
          <div className="hex-view__inspector-item">
            <span className="hex-view__inspector-label">Offset:</span>
            <span className="hex-view__inspector-val">
              0x{formatHexOffset(inspector.offset)} ({inspector.offset})
            </span>
            <IconButton
              icon={copiedField === "offset" ? Check : Copy}
              label="Copy offset"
              size={11}
              onClick={() => copyValue(`0x${formatHexOffset(inspector.offset)}`, "offset")}
            />
          </div>

          <div className="hex-view__separator" />

          <div className="hex-view__inspector-item">
            <span className="hex-view__inspector-label">Hex:</span>
            <span className="hex-view__inspector-val">0x{formatHexByte(inspector.uint8)}</span>
            <IconButton
              icon={copiedField === "hex" ? Check : Copy}
              label="Copy hex byte"
              size={11}
              onClick={() => copyValue(formatHexByte(inspector.uint8), "hex")}
            />
          </div>

          <div className="hex-view__inspector-item">
            <span className="hex-view__inspector-label">Dec:</span>
            <span className="hex-view__inspector-val">{inspector.uint8}</span>
          </div>

          <div className="hex-view__inspector-item">
            <span className="hex-view__inspector-label">Bin:</span>
            <span className="hex-view__inspector-val">{inspector.binary}</span>
          </div>

          <div className="hex-view__inspector-item">
            <span className="hex-view__inspector-label">ASCII:</span>
            <span className="hex-view__inspector-val">{inspector.ascii}</span>
          </div>

          {inspector.uint16Le !== null && (
            <div className="hex-view__inspector-item">
              <span className="hex-view__inspector-label">Int16 (LE):</span>
              <span className="hex-view__inspector-val">{inspector.int16Le}</span>
            </div>
          )}

          {inspector.uint32Le !== null && (
            <div className="hex-view__inspector-item">
              <span className="hex-view__inspector-label">Int32 (LE):</span>
              <span className="hex-view__inspector-val">{inspector.int32Le}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
