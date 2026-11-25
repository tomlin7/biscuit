import { describe, expect, test } from "bun:test";
import { isPdfFile, isProbablyTextFile, languageFromPath } from "../workspace/path";
import { languageLabel } from "./languages";

describe("pdf viewer file detection and metadata", () => {
  test("correctly identifies PDF files by extension", () => {
    expect(isPdfFile("document.pdf")).toBe(true);
    expect(isPdfFile("/path/to/my-report.PDF")).toBe(true);
    expect(isPdfFile("C:\\Users\\User\\Documents\\sample.pdf")).toBe(true);
    expect(isPdfFile("not-pdf.txt")).toBe(false);
    expect(isPdfFile("pdf-file.png")).toBe(false);
    expect(isPdfFile("pdf")).toBe(false);
  });

  test("treats PDF files as binary files in isProbablyTextFile", () => {
    expect(isProbablyTextFile("document.pdf")).toBe(false);
    expect(isProbablyTextFile("/workspace/report.pdf")).toBe(false);
    expect(isProbablyTextFile("script.ts")).toBe(true);
  });

  test("returns correct language label for pdf", () => {
    expect(languageLabel("pdf")).toBe("PDF");
  });
});
