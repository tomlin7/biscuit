import { describe, expect, test } from "bun:test";
import { isBinaryFile, isImageFile, isPdfFile, isProbablyTextFile, languageFromPath } from "../workspace/path";
import { languageLabel } from "./languages";
import {
  formatFileSize,
  formatHexByte,
  formatHexOffset,
  isPrintableAscii,
  parseOffsetInput,
  readIntegerValues,
  searchBuffer,
  toAsciiChar,
} from "./hexUtils";

describe("hex viewer file detection and metadata", () => {
  test("correctly identifies binary files for hex editor", () => {
    expect(isBinaryFile("program.exe")).toBe(true);
    expect(isBinaryFile("library.dll")).toBe(true);
    expect(isBinaryFile("module.wasm")).toBe(true);
    expect(isBinaryFile("firmware.bin")).toBe(true);
    expect(isBinaryFile("archive.zip")).toBe(true);
    expect(isBinaryFile("data.dat")).toBe(true);
    expect(isBinaryFile("disk.iso")).toBe(true);
    expect(isBinaryFile("compiled.o")).toBe(true);
    expect(isBinaryFile("lib.so")).toBe(true);
  });

  test("excludes text files from binary classification", () => {
    expect(isProbablyTextFile("index.ts")).toBe(true);
    expect(isProbablyTextFile("program.exe")).toBe(false);
    expect(isBinaryFile("index.ts")).toBe(false);
    expect(isBinaryFile("main.rs")).toBe(false);
    expect(isBinaryFile("script.py")).toBe(false);
    expect(isBinaryFile("README.md")).toBe(false);
    expect(isBinaryFile("package.json")).toBe(false);
    expect(isBinaryFile("styles.css")).toBe(false);
    expect(isBinaryFile("index.html")).toBe(false);
  });

  test("excludes dedicated image and PDF viewers from hex binary classification", () => {
    expect(isImageFile("photo.png")).toBe(true);
    expect(isBinaryFile("photo.png")).toBe(false);

    expect(isPdfFile("document.pdf")).toBe(true);
    expect(isBinaryFile("document.pdf")).toBe(false);
  });

  test("returns hex language for binary files and correct label", () => {
    expect(languageFromPath("program.exe")).toBe("hex");
    expect(languageFromPath("firmware.bin")).toBe("hex");
    expect(languageFromPath("module.wasm")).toBe("hex");
    expect(languageLabel("hex")).toBe("Hex");
  });
});

describe("hex utility formatting and conversions", () => {
  test("formats single byte to two uppercase hex digits", () => {
    expect(formatHexByte(0)).toBe("00");
    expect(formatHexByte(10)).toBe("0A");
    expect(formatHexByte(15)).toBe("0F");
    expect(formatHexByte(16)).toBe("10");
    expect(formatHexByte(255)).toBe("FF");
  });

  test("formats offsets with 8-character zero-padded hex", () => {
    expect(formatHexOffset(0)).toBe("00000000");
    expect(formatHexOffset(16)).toBe("00000010");
    expect(formatHexOffset(256)).toBe("00000100");
    expect(formatHexOffset(65535)).toBe("0000FFFF");
  });

  test("formats file sizes nicely", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(2048)).toContain("2.0 KB");
    expect(formatFileSize(1048576)).toContain("1.00 MB");
  });

  test("identifies printable ASCII characters and dots for non-printable", () => {
    expect(isPrintableAscii(65)).toBe(true); // 'A'
    expect(toAsciiChar(65)).toBe("A");
    expect(isPrintableAscii(32)).toBe(true); // space
    expect(isPrintableAscii(0)).toBe(false); // NULL
    expect(toAsciiChar(0)).toBe("·");
    expect(isPrintableAscii(10)).toBe(false); // LF
    expect(toAsciiChar(10)).toBe("·");
    expect(isPrintableAscii(127)).toBe(false); // DEL
    expect(toAsciiChar(127)).toBe("·");
    expect(isPrintableAscii(200)).toBe(false);
  });

  test("parses hex and decimal offset inputs", () => {
    expect(parseOffsetInput("0x10", 100)).toBe(16);
    expect(parseOffsetInput("0X20", 100)).toBe(32);
    expect(parseOffsetInput("100", 200)).toBe(100);
    expect(parseOffsetInput("0x500", 50)).toBe(50); // clamped to max
    expect(parseOffsetInput("   ", 100)).toBeNull();
    expect(parseOffsetInput("not-a-number", 100)).toBeNull();
  });

  test("reads multi-byte integer values correctly", () => {
    // 4 bytes: 0x4D, 0x5A, 0x01, 0x02
    const data = new Uint8Array([0x4d, 0x5a, 0x01, 0x02]);
    const info = readIntegerValues(data, 0);
    expect(info).not.toBeNull();
    if (!info) return;

    expect(info.uint8).toBe(0x4d);
    expect(info.int8).toBe(0x4d);
    expect(info.ascii).toBe("'M'");
    expect(info.binary).toBe("01001101");

    // 16-bit LE: 0x5A4D = 23117
    expect(info.uint16Le).toBe(23117);
    // 16-bit BE: 0x4D5A = 19802
    expect(info.uint16Be).toBe(19802);

    // 32-bit LE: 0x02015A4D
    expect(info.uint32Le).toBe((0x02 << 24) | (0x01 << 16) | (0x5a << 8) | 0x4d);
  });

  test("searches text and hex byte patterns in buffer", () => {
    // "Hello World" in bytes
    const text = new TextEncoder().encode("Hello World Hello");
    const textMatches = searchBuffer(text, "Hello", "text");
    expect(textMatches).toEqual([0, 12]);

    const hexMatches = searchBuffer(text, "48 65 6c", "hex"); // "Hel"
    expect(hexMatches).toEqual([0, 12]);

    const noMatches = searchBuffer(text, "xyz", "text");
    expect(noMatches).toEqual([]);
  });
});
