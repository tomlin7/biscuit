import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Copy,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { basename } from "../workspace/path";
import { IconButton } from "../ui/IconButton";
import {
  calculateColumnStats,
  filterRows,
  parseCsv,
  sortRows,
  tableToJson,
  tableToMarkdown,
} from "./csvUtils";
import "./CsvTableView.css";

interface Props {
  source: string;
  filePath: string;
  delimiter?: string;
}

export function CsvTableView({ source, filePath, delimiter }: Props) {
  const [hasHeader, setHasHeader] = useState<boolean>(true);
  const [selectedDelim, setSelectedDelim] = useState<string>(delimiter ?? "");
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  // Parse CSV
  const { data: rawRows, delimiter: effectiveDelim } = useMemo(() => {
    return parseCsv(source, selectedDelim || delimiter);
  }, [source, selectedDelim, delimiter]);

  // Headers and body rows
  const { headers, bodyRows } = useMemo(() => {
    if (rawRows.length === 0) {
      return { headers: [], bodyRows: [] };
    }
    const maxCols = Math.max(...rawRows.map((r) => r.length), 1);

    if (hasHeader && rawRows.length > 0) {
      const headerRow = rawRows[0];
      const filledHeaders = Array.from(
        { length: maxCols },
        (_, i) => headerRow[i]?.trim() || `Col ${i + 1}`,
      );
      return { headers: filledHeaders, bodyRows: rawRows.slice(1) };
    } else {
      const colLabels = Array.from({ length: maxCols }, (_, i) => {
        let label = "";
        let num = i;
        while (num >= 0) {
          label = String.fromCharCode(65 + (num % 26)) + label;
          num = Math.floor(num / 26) - 1;
        }
        return label;
      });
      return { headers: colLabels, bodyRows: rawRows };
    }
  }, [rawRows, hasHeader]);

  // Filter
  const filteredRows = useMemo(() => {
    return filterRows(bodyRows, searchQuery);
  }, [bodyRows, searchQuery]);

  // Sort
  const sortedRows = useMemo(() => {
    if (sortCol === null) return filteredRows;
    return sortRows(filteredRows, sortCol, sortDir);
  }, [filteredRows, sortCol, sortDir]);

  const handleHeaderClick = useCallback(
    (colIdx: number) => {
      if (sortCol !== colIdx) {
        setSortCol(colIdx);
        setSortDir("asc");
      } else if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortCol(null);
        setSortDir("asc");
      }
    },
    [sortCol, sortDir],
  );

  const copyAs = useCallback(
    (type: "markdown" | "json" | "tsv") => {
      let text = "";
      if (type === "markdown") {
        text = tableToMarkdown(headers, sortedRows);
      } else if (type === "json") {
        text = tableToJson(headers, sortedRows);
      } else {
        const lines = [
          headers.join("\t"),
          ...sortedRows.map((r) => r.join("\t")),
        ];
        text = lines.join("\n");
      }
      void navigator.clipboard.writeText(text);
      setCopiedLabel(type);
      setTimeout(() => setCopiedLabel(null), 1500);
    },
    [headers, sortedRows],
  );

  // Column stats for selected column
  const stats = useMemo(() => {
    if (selectedCell === null) return null;
    return calculateColumnStats(bodyRows, selectedCell.col);
  }, [selectedCell, bodyRows]);

  if (rawRows.length === 0) {
    return (
      <div className="csv-table-view">
        <div className="csv-table-view__empty">
          <FileSpreadsheet size={24} />
          <span>Empty CSV / TSV file</span>
        </div>
      </div>
    );
  }

  return (
    <div className="csv-table-view">
      {/* Toolbar */}
      <div className="csv-table-view__toolbar">
        <div className="csv-table-view__meta">
          <FileSpreadsheet size={14} className="text-accent" />
          <span className="csv-table-view__name">{basename(filePath)}</span>
          <span className="csv-table-view__chip">
            {bodyRows.length.toLocaleString()} rows × {headers.length} cols
          </span>
        </div>

        <div className="csv-table-view__separator" />

        {/* Search */}
        <div className="csv-table-view__search">
          <input
            type="text"
            className="csv-table-view__search-input"
            placeholder="Search rows…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <IconButton
              icon={X}
              label="Clear search"
              size={12}
              onClick={() => setSearchQuery("")}
            />
          )}
        </div>

        <button
          type="button"
          className={`csv-table-view__toggle-btn ${
            hasHeader ? "csv-table-view__toggle-btn--active" : ""
          }`}
          onClick={() => setHasHeader((prev) => !prev)}
          title="Toggle whether first line is used as column headers"
        >
          <span>Header Row</span>
        </button>

        <select
          aria-label="Delimiter"
          className="csv-table-view__select"
          value={selectedDelim}
          onChange={(e) => setSelectedDelim(e.target.value)}
        >
          <option value="">Auto ({effectiveDelim === "\t" ? "Tab" : effectiveDelim})</option>
          <option value=",">Comma (,)</option>
          <option value="&#9;">Tab (\t)</option>
          <option value=";">Semicolon (;)</option>
          <option value="|">Pipe (|)</option>
        </select>

        <div className="csv-table-view__spacer" />

        {/* Export / Copy options */}
        <button
          type="button"
          className="csv-table-view__toggle-btn"
          onClick={() => copyAs("markdown")}
          title="Copy formatted Markdown table to clipboard"
        >
          {copiedLabel === "markdown" ? <Check size={12} /> : <Copy size={12} />}
          <span>Markdown</span>
        </button>

        <button
          type="button"
          className="csv-table-view__toggle-btn"
          onClick={() => copyAs("json")}
          title="Copy JSON array of objects to clipboard"
        >
          {copiedLabel === "json" ? <Check size={12} /> : <Copy size={12} />}
          <span>JSON</span>
        </button>
      </div>

      {/* Spreadsheet Content */}
      <div className="csv-table-view__content">
        <table className="csv-table-view__table">
          <thead>
            <tr>
              <th className="csv-table-view__row-num-th">#</th>
              {headers.map((h, colIdx) => (
                <th
                  key={colIdx}
                  className="csv-table-view__th"
                  onClick={() => handleHeaderClick(colIdx)}
                >
                  <div className="csv-table-view__th-content">
                    <span>{h}</span>
                    <span className="csv-table-view__sort-icon">
                      {sortCol === colIdx ? (
                        sortDir === "asc" ? (
                          <ArrowUp size={12} />
                        ) : (
                          <ArrowDown size={12} />
                        )
                      ) : (
                        <ArrowUpDown size={11} className="opacity-30" />
                      )}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="csv-table-view__tr">
                <td className="csv-table-view__row-num-td">{rowIdx + 1}</td>
                {headers.map((_, colIdx) => {
                  const val = row[colIdx] ?? "";
                  const isSelected =
                    selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                  const isNumeric = val.trim() !== "" && !isNaN(Number(val));

                  return (
                    <td
                      key={colIdx}
                      className={`csv-table-view__td ${
                        isNumeric ? "csv-table-view__td--numeric" : ""
                      } ${isSelected ? "csv-table-view__td--selected" : ""}`}
                      onClick={() => setSelectedCell({ row: rowIdx, col: colIdx })}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / Stats bar */}
      <div className="csv-table-view__footer">
        <div className="csv-table-view__stat">
          <span>Rows:</span>
          <span className="csv-table-view__stat-val">
            {searchQuery
              ? `${sortedRows.length.toLocaleString()} of ${bodyRows.length.toLocaleString()}`
              : sortedRows.length.toLocaleString()}
          </span>
        </div>

        {selectedCell !== null && (
          <>
            <div className="csv-table-view__separator" />
            <div className="csv-table-view__stat">
              <span>Cell:</span>
              <span className="csv-table-view__stat-val">
                Row {selectedCell.row + 1}, Col &quot;{headers[selectedCell.col]}&quot;
              </span>
            </div>
          </>
        )}

        {stats && stats.sum !== undefined && (
          <>
            <div className="csv-table-view__separator" />
            <div className="csv-table-view__stat">
              <span>Sum:</span>
              <span className="csv-table-view__stat-val">
                {stats.sum.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </div>
            <div className="csv-table-view__stat">
              <span>Avg:</span>
              <span className="csv-table-view__stat-val">
                {(stats.avg ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
            </div>
            <div className="csv-table-view__stat">
              <span>Min:</span>
              <span className="csv-table-view__stat-val">{stats.min}</span>
            </div>
            <div className="csv-table-view__stat">
              <span>Max:</span>
              <span className="csv-table-view__stat-val">{stats.max}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
