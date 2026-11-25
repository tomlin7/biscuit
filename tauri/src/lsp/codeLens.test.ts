import { describe, expect, it } from "bun:test";
import { findSymbolColumn } from "./codeLens";

describe("codeLens", () => {
  it("locates symbol column for standard functions", () => {
    const col = findSymbolColumn("function calculateTotal(a, b) {", "calculateTotal");
    expect(col).toBe(10);
  });

  it("locates symbol column for exported functions", () => {
    const col = findSymbolColumn("export function handleEvent(e) {", "handleEvent");
    expect(col).toBe(17);
  });

  it("locates symbol column for async exported functions", () => {
    const col = findSymbolColumn("export async function loadUserData() {", "loadUserData");
    expect(col).toBe(23);
  });

  it("locates symbol column for exported classes", () => {
    const col = findSymbolColumn("export class OrderManager extends Base {", "OrderManager");
    expect(col).toBe(14);
  });

  it("locates symbol column for exported interfaces", () => {
    const col = findSymbolColumn("export interface UserProfile {", "UserProfile");
    expect(col).toBe(18);
  });

  it("locates symbol column for indented class methods", () => {
    const col = findSymbolColumn("  public async refreshState(): Promise<void> {", "refreshState");
    expect(col).toBe(16);
  });

  it("returns 1 for empty or missing symbol name", () => {
    expect(findSymbolColumn("function foo()", "")).toBe(1);
    expect(findSymbolColumn("function foo()", "nonexistent")).toBe(1);
  });
});
