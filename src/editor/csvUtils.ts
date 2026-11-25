export type ColumnStats = {
  totalCount: number;
  nonEmptyCount: number;
  numericCount: number;
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
};

export function detectDelimiter(text: string, fallback = ","): string {
  const lines = text.split(/\r?\n/).slice(0, 10).filter(Boolean);
  if (lines.length === 0) return fallback;

  const counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0, "|": 0 };
  for (const line of lines) {
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (!inQuotes && ch in counts) {
        counts[ch]++;
      }
    }
  }

  let best = fallback;
  let max = 0;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      best = delim;
    }
  }
  return best;
}

export function parseCsv(text: string, delimiter?: string): { data: string[][]; delimiter: string } {
  const delim = delimiter || detectDelimiter(text);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    const nextCh = text[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (nextCh === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (ch === delim) {
        currentRow.push(currentField);
        currentField = "";
        i++;
        continue;
      } else if (ch === "\r" || ch === "\n") {
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        if (ch === "\r" && nextCh === "\n") i += 2;
        else i++;
        continue;
      } else {
        currentField += ch;
        i++;
        continue;
      }
    }
  }

  // Push last field and row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Remove trailing completely empty row if file ends with newline
  if (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (last.length === 1 && last[0] === "") {
      rows.pop();
    }
  }

  return { data: rows, delimiter: delim };
}

export function sortRows(
  rows: string[][],
  colIndex: number,
  direction: "asc" | "desc",
): string[][] {
  const result = [...rows];

  // Determine if column is predominantly numeric
  let numCount = 0;
  let nonEmptyCount = 0;
  for (const row of result) {
    const val = (row[colIndex] ?? "").trim();
    if (val !== "") {
      nonEmptyCount++;
      if (!isNaN(Number(val))) numCount++;
    }
  }
  const isNumeric = nonEmptyCount > 0 && numCount / nonEmptyCount >= 0.7;

  result.sort((a, b) => {
    const valA = (a[colIndex] ?? "").trim();
    const valB = (b[colIndex] ?? "").trim();

    // Empty cells sort to the bottom
    if (valA === "" && valB === "") return 0;
    if (valA === "") return 1;
    if (valB === "") return -1;

    if (isNumeric) {
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return direction === "asc" ? numA - numB : numB - numA;
      }
    }

    const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: "base" });
    return direction === "asc" ? cmp : -cmp;
  });

  return result;
}

export function filterRows(rows: string[][], query: string): string[][] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    row.some((cell) => cell.toLowerCase().includes(q)),
  );
}

export function calculateColumnStats(rows: string[][], colIndex: number): ColumnStats {
  let nonEmptyCount = 0;
  let numericCount = 0;
  let sum = 0;
  let min: number | undefined;
  let max: number | undefined;

  for (const row of rows) {
    const val = (row[colIndex] ?? "").trim();
    if (val !== "") {
      nonEmptyCount++;
      const num = Number(val);
      if (!isNaN(num)) {
        numericCount++;
        sum += num;
        if (min === undefined || num < min) min = num;
        if (max === undefined || num > max) max = num;
      }
    }
  }

  const isMostlyNumeric = nonEmptyCount > 0 && numericCount / nonEmptyCount >= 0.7;

  return {
    totalCount: rows.length,
    nonEmptyCount,
    numericCount,
    sum: isMostlyNumeric ? sum : undefined,
    avg: isMostlyNumeric && numericCount > 0 ? sum / numericCount : undefined,
    min: isMostlyNumeric ? min : undefined,
    max: isMostlyNumeric ? max : undefined,
  };
}

export function tableToMarkdown(headers: string[], rows: string[][]): string {
  if (headers.length === 0 && rows.length === 0) return "";
  const cols = Math.max(headers.length, ...rows.map((r) => r.length));
  const pad = (arr: string[]) => Array.from({ length: cols }, (_, i) => arr[i] ?? "");

  const headerRow = `| ${pad(headers).join(" | ")} |`;
  const sepRow = `| ${Array(cols).fill("---").join(" | ")} |`;
  const dataRows = rows.map((r) => `| ${pad(r).join(" | ")} |`);

  return [headerRow, sepRow, ...dataRows].join("\n");
}

export function tableToJson(headers: string[], rows: string[][]): string {
  const result = rows.map((row) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i] || `col_${i + 1}`;
      obj[key] = row[i] ?? "";
    }
    return obj;
  });
  return JSON.stringify(result, null, 2);
}
