import { describe, expect, it } from "bun:test";
import { getActiveSymbolPath, getSiblingSymbols } from "./symbolBreadcrumb";
import type { OutlineSymbol } from "./outlineScan";

describe("symbolBreadcrumb", () => {
  const testSymbols: OutlineSymbol[] = [
    { name: "MyClass", kind: "class", line: 10, depth: 0 },
    { name: "constructor", kind: "method", line: 15, depth: 1 },
    { name: "render", kind: "method", line: 25, depth: 1 },
    { name: "handleClick", kind: "function", line: 30, depth: 2 },
    { name: "cleanup", kind: "method", line: 45, depth: 1 },
    { name: "standaloneFn", kind: "function", line: 60, depth: 0 },
  ];

  it("returns empty array when cursor is before any symbol", () => {
    expect(getActiveSymbolPath(testSymbols, 5)).toEqual([]);
    expect(getActiveSymbolPath(testSymbols, 0)).toEqual([]);
    expect(getActiveSymbolPath([], 10)).toEqual([]);
  });

  it("resolves top-level class scope", () => {
    const path = getActiveSymbolPath(testSymbols, 12);
    expect(path.map((s) => s.name)).toEqual(["MyClass"]);
  });

  it("resolves nested method scope inside class", () => {
    const path = getActiveSymbolPath(testSymbols, 18);
    expect(path.map((s) => s.name)).toEqual(["MyClass", "constructor"]);
  });

  it("switches to subsequent method at same depth", () => {
    const path = getActiveSymbolPath(testSymbols, 27);
    expect(path.map((s) => s.name)).toEqual(["MyClass", "render"]);
  });

  it("resolves doubly-nested function scope", () => {
    const path = getActiveSymbolPath(testSymbols, 35);
    expect(path.map((s) => s.name)).toEqual(["MyClass", "render", "handleClick"]);
  });

  it("pops nested scopes when reaching a method at depth 1", () => {
    const path = getActiveSymbolPath(testSymbols, 48);
    expect(path.map((s) => s.name)).toEqual(["MyClass", "cleanup"]);
  });

  it("pops entire class when reaching a new top-level symbol", () => {
    const path = getActiveSymbolPath(testSymbols, 65);
    expect(path.map((s) => s.name)).toEqual(["standaloneFn"]);
  });

  it("finds sibling symbols correctly", () => {
    const renderSym = testSymbols[2];
    const siblings = getSiblingSymbols(testSymbols, renderSym);
    expect(siblings.map((s) => s.name)).toEqual(["constructor", "render", "cleanup"]);
  });
});
