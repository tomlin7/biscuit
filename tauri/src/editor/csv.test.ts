import { describe, expect, test } from "bun:test";
import { languageFromPath } from "../workspace/path";
import { languageLabel } from "./languages";
import {
  calculateColumnStats,
  detectDelimiter,
  filterRows,
  parseCsv,
  sortRows,
  tableToJson,
  tableToMarkdown,
} from "./csvUtils";

describe("csv and tsv language identification", () => {
  test("identifies CSV and TSV files by extension", () => {
    expect(languageFromPath("data.csv")).toBe("csv");
    expect(languageFromPath("/path/to/spreadsheet.CSV")).toBe("csv");
    expect(languageFromPath("records.tsv")).toBe("tsv");
    expect(languageFromPath("export.TSV")).toBe("tsv");
  });

  test("returns correct language labels", () => {
    expect(languageLabel("csv")).toBe("CSV");
    expect(languageLabel("tsv")).toBe("TSV");
  });
});

describe("csv and tsv parsing", () => {
  test("parses standard comma-separated values", () => {
    const csv = "name,age,city\nAlice,30,Seattle\nBob,25,Austin";
    const { data, delimiter } = parseCsv(csv);
    expect(delimiter).toBe(",");
    expect(data.length).toBe(3);
    expect(data[0]).toEqual(["name", "age", "city"]);
    expect(data[1]).toEqual(["Alice", "30", "Seattle"]);
    expect(data[2]).toEqual(["Bob", "25", "Austin"]);
  });

  test("parses quoted fields with embedded commas and escaped quotes", () => {
    const csv = 'id,title,notes\n1,"Hello, World","He said ""yes"""';
    const { data } = parseCsv(csv);
    expect(data.length).toBe(2);
    expect(data[1][1]).toBe("Hello, World");
    expect(data[1][2]).toBe('He said "yes"');
  });

  test("parses fields containing newlines inside quotes", () => {
    const csv = 'id,description\n1,"line one\nline two"\n2,simple';
    const { data } = parseCsv(csv);
    expect(data.length).toBe(3);
    expect(data[1][1]).toBe("line one\nline two");
    expect(data[2][1]).toBe("simple");
  });

  test("detects and parses tab-separated values", () => {
    const tsv = "colA\tcolB\tcolC\n10\t20\t30";
    expect(detectDelimiter(tsv)).toBe("\t");
    const { data, delimiter } = parseCsv(tsv);
    expect(delimiter).toBe("\t");
    expect(data.length).toBe(2);
    expect(data[0]).toEqual(["colA", "colB", "colC"]);
    expect(data[1]).toEqual(["10", "20", "30"]);
  });

  test("handles empty inputs gracefully", () => {
    const { data } = parseCsv("");
    expect(data).toEqual([]);
  });
});

describe("csv table sorting and filtering", () => {
  const rows = [
    ["Alice", "30", "Seattle"],
    ["Bob", "5", "Austin"],
    ["Charlie", "100", "New York"],
    ["David", "", "Denver"],
  ];

  test("sorts numeric columns numerically rather than alphabetically", () => {
    const sortedAsc = sortRows(rows, 1, "asc");
    // "5" < "30" < "100", empty at bottom
    expect(sortedAsc.map((r) => r[0])).toEqual(["Bob", "Alice", "Charlie", "David"]);

    const sortedDesc = sortRows(rows, 1, "desc");
    expect(sortedDesc.map((r) => r[0])).toEqual(["Charlie", "Alice", "Bob", "David"]);
  });

  test("sorts text columns alphabetically", () => {
    const sortedAsc = sortRows(rows, 0, "asc");
    expect(sortedAsc.map((r) => r[0])).toEqual(["Alice", "Bob", "Charlie", "David"]);

    const sortedDesc = sortRows(rows, 0, "desc");
    expect(sortedDesc.map((r) => r[0])).toEqual(["David", "Charlie", "Bob", "Alice"]);
  });

  test("filters rows case-insensitively across all columns", () => {
    const filtered = filterRows(rows, "seattle");
    expect(filtered.length).toBe(1);
    expect(filtered[0][0]).toBe("Alice");

    const matchMultiple = filterRows(rows, "e"); // Alice, Seattle, Charlie, Denver
    expect(matchMultiple.length).toBe(3);
  });
});

describe("csv column statistics and export", () => {
  const rows = [
    ["Alice", "10"],
    ["Bob", "20"],
    ["Charlie", "30"],
  ];

  test("calculates statistics for numeric columns", () => {
    const stats = calculateColumnStats(rows, 1);
    expect(stats.totalCount).toBe(3);
    expect(stats.numericCount).toBe(3);
    expect(stats.sum).toBe(60);
    expect(stats.avg).toBe(20);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(30);
  });

  test("formats table to Markdown", () => {
    const headers = ["Name", "Score"];
    const md = tableToMarkdown(headers, rows);
    expect(md).toContain("| Name | Score |");
    expect(md).toContain("| --- | --- |");
    expect(md).toContain("| Alice | 10 |");
  });

  test("formats table to JSON", () => {
    const headers = ["name", "score"];
    const jsonStr = tableToJson(headers, rows);
    const parsed = JSON.parse(jsonStr);
    expect(parsed).toEqual([
      { name: "Alice", score: "10" },
      { name: "Bob", score: "20" },
      { name: "Charlie", score: "30" },
    ]);
  });
});
